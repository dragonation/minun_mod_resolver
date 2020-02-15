const THREE = require("../../scripts/three.js");

const prepareMesh = function (dom) {

    if (!dom.m3dMesh) {

        let geometry = new THREE.BufferGeometry();
        geometry.m3dFromTagObject = dom;

        if (dom.m3dVertices) {
            let vertexUnitSize = parseInt($(dom).attr("vertex-unit-size"));
            if ((!vertexUnitSize) || (!isFinite(vertexUnitSize))) { vertexUnitSize = 3; }
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(dom.m3dVertices, vertexUnitSize));
        }

        if (dom.m3dIndices) {
            geometry.setIndex(dom.m3dIndices);
        }

        if (dom.m3dNormals) {
            let normalUnitSize = parseInt($(dom).attr("normal-unit-size"));
            if ((!normalUnitSize) || (!isFinite(normalUnitSize))) { normalUnitSize = 3; }
            geometry.setAttribute("normal", new THREE.Float32BufferAttribute(dom.m3dNormals, normalUnitSize));
        }
        if (dom.m3dTangents) {
            let tangentUnitSize = parseInt($(dom).attr("tangent-unit-size"));
            if ((!tangentUnitSize) || (!isFinite(tangentUnitSize))) { tangentUnitSize = 3; }
            geometry.setAttribute("tangent", new THREE.Float32BufferAttribute(dom.m3dTangents, tangentUnitSize));
        }

        if (dom.m3dColors) {
            let colorUnitSize = parseInt($(dom).attr("color-unit-size"));
            if ((!colorUnitSize) || (!isFinite(colorUnitSize))) { colorUnitSize = 3; }
            geometry.setAttribute("color", new THREE.Float32BufferAttribute(dom.m3dColors, colorUnitSize));
        }

        if (dom.m3dUVs) {
            let uvUnitSize = parseInt($(dom).attr("uv-unit-size"));
            if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 2; }
            geometry.setAttribute("uv", new THREE.Float32BufferAttribute(dom.m3dUVs, uvUnitSize));
        }
        if (dom.m3dUVs2) {
            let uvUnitSize = parseInt($(dom).attr("uv-2-unit-size"));
            if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 2; }
            geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(dom.m3dUVs2, uvUnitSize));
        }
        if (dom.m3dUVs3) {
            let uvUnitSize = parseInt($(dom).attr("uv-3-unit-size"));
            if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 2; }
            geometry.setAttribute("uv3", new THREE.Float32BufferAttribute(dom.m3dUVs3, uvUnitSize));
        }

        if (dom.m3dBoneIndices) {
            geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(dom.m3dBoneIndices, 4));
        }

        if (dom.m3dBoneWeights) {
            geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(dom.m3dBoneWeights, 4));
        }

        if ($(dom).attr("skeleton") && $(dom).attr("skeleton").trim()) {
            dom.m3dMesh = new THREE.SkinnedMesh(geometry);
        } else {
            dom.m3dMesh = new THREE.Mesh(geometry);
        }

        dom.m3dMesh.m3dFromTagObject = dom;
        dom.m3dMesh.m3dExtra = dom.m3dExtra;

        dom.m3dMesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {

            if (dom.m3dPatch) {

                let mesh = dom.m3dMesh;

                let lights = [];
                let getLights = (parent) => {
                    for (let child of parent.children) {
                        if (child.isLight) {
                            lights.push(child);
                        }
                    }
                    if (parent.parent) {
                        getLights(parent.parent);
                    }
                };
                getLights(mesh);

                let extra = {};
                if (mesh.m3dExtra) {
                    Object.assign(extra, mesh.m3dExtra);
                }
                if (material.m3dExtra) {
                    Object.assign(extra, material.m3dExtra);
                }

                dom.m3dPatch.call(dom, 
                                  renderer, scene, camera, lights,
                                  mesh, geometry, material, 
                                  material.uniforms, extra);

            }

            if (dom.m3dBeforeRender) {
                return dom.m3dBeforeRender.apply(dom, arguments);
            }
        };

        dom.m3dSyncPatch();

        syncName(dom, $(dom).attr("name"));
        syncMaterials(dom, $(dom).attr("materials"));
        syncSkeleton(dom, $(dom).attr("skeleton"));

    }

    return dom.m3dMesh;

};

const disposeMesh = function (dom) {

    if (dom.m3dMesh) {
        if (dom.m3dMesh.parent) {
            dom.m3dMesh.parent.remove(dom);
        }
        delete dom.m3dMesh;
    }

};

const syncMaterials = function (dom, value) {

    if (!dom.m3dMesh) { return; }

    // get the scene
    let scene = dom;
    while (scene && ((!scene.localName) || (scene.localName.toLowerCase() !== "m3d-scene"))) {
        scene = scene.parentNode;
    }

    if (!scene) {
        return;
    }

    if (!dom.m3dMaterials) {
        dom.m3dMaterials = Object.create(null);
    }

    let materials = value.trim().split(";").map((id) => id.trim()).filter((id) => id);
    materials.forEach((material) => {

        if (!dom.m3dMaterials[material]) {
            dom.m3dMaterials[material] = {
                "updater": () => {
                    if ($(dom).attr("materials").trim().split(",").map((id) => id.trim()).filter((id) => id === material).length === 0) {
                        dom.m3dMaterials[material].scene.m3dUninstallMaterialListener(material, dom.m3dMaterials[material].updater);
                        delete dom.m3dMaterials[material].scene;
                        return;
                    }
                    if (!dom.m3dMesh) {
                        return;
                    }
                    let m3dMaterial = undefined;
                    let lastScene = false;
                    let parent = dom;
                    while (parent && (!lastScene) && (!m3dMaterial)) {
                        lastScene = (parent.localName && (parent.localName.toLowerCase() === "m3d-scene")) ? true : false;
                        m3dMaterial = $(parent).find("#" + material)[0];
                        parent = parent.parentNode;
                    }
                    if (m3dMaterial) {
                        dom.m3dMesh.material = m3dMaterial.m3dGetMaterial();
                        // TODO: remove last material for dispose
                        // TODO: make material array
                    }
                }
            };
        }

        if (dom.m3dMaterials[material].scene) {
            if (dom.m3dMaterials[material].scene !== scene) {
                dom.m3dMaterials[material].scene.m3dUninstallMaterialListener(material, dom.m3dMaterials[material].updater);
                dom.m3dMaterials[material].scene = scene;
                dom.m3dMaterials[material].scene.m3dInstallMaterialListener(material, dom.m3dMaterials[material].updater);
                dom.m3dMaterials[material].updater();
            }
        } else {
            dom.m3dMaterials[material].scene = scene;
            dom.m3dMaterials[material].scene.m3dInstallMaterialListener(material, dom.m3dMaterials[material].updater);
            dom.m3dMaterials[material].updater();
        }

    });

};

const syncSkeleton = function (dom, value) {

    if (!value) {
        return;
    }

    let scene = dom;
    while (scene && ((!scene.localName) || (scene.localName.toLowerCase() !== "m3d-scene"))) {
        scene = scene.parentNode;
    }

    if (!scene) {
        return;
    }

    if (!dom.m3dSkeleton) {
        dom.m3dSkeleton = {
            "updater": () => {
                if ($(dom).attr("skeleton").trim() !== value) {
                    dom.m3dSkeleton.scene.m3dUninstallSkeletonListener(value, dom.m3dSkeleton.updater);
                    delete dom.m3dSkeleton.scene;
                    return;
                }
                if (!dom.m3dMesh) {
                    return;
                }
                let m3dSkeleton = undefined;
                let lastScene = false;
                let parent = dom;
                while (parent && (!lastScene) && (!m3dSkeleton)) {
                    lastScene = (parent.localName && (parent.localName.toLowerCase() === "m3d-scene")) ? true : false;
                    m3dSkeleton = $(parent).find("#" + value)[0];
                    parent = parent.parentNode;
                }
                if (m3dSkeleton) {
                    if (!dom.m3dMesh.isSkinnedMesh) {
                        disposeMesh(dom);
                        prepareMesh(dom);
                    }
                    if (dom.m3dMesh.bind) {
                        dom.m3dMesh.bind(m3dSkeleton.m3dGetSkeleton());
                    }
                    // TODO: remove last skeleton for dispose
                }
            }
        };
    }

    if (dom.m3dSkeleton.scene) {
        if (dom.m3dSkeleton.scene !== scene) {
            dom.m3dSkeleton.scene.m3dUninstallSkeletonListener(value, dom.m3dSkeleton.updater);
            dom.m3dSkeleton.scene = scene;
            dom.m3dSkeleton.scene.m3dInstallSkeletonListener(value, dom.m3dSkeleton.updater);
            dom.m3dSkeleton.updater();
        }
    } else {
        dom.m3dSkeleton.scene = scene;
        dom.m3dSkeleton.scene.m3dInstallSkeletonListener(value, dom.m3dSkeleton.updater);
        dom.m3dSkeleton.updater();
    }

};

const syncName = function (dom, value) {

    if (!dom.m3dMesh) { return; }

    dom.m3dMesh.name = value;

};

const syncExtra = function (dom, value) {

    if (/^{ \/\* Property\-([0-9]+) \*\/$/.test(dom)) {
        return;
    }

    if (value) {
        try {
            dom.m3dExtra = JSON.parse(value);
            if (dom.m3dMesh) {
                dom.m3dMesh.m3dExtra = dom.m3dExtra;
            }
        } catch (error) {
            console.error(error);
            if (dom.m3dMesh) {
                delete dom.m3dMesh.m3dExtra;
            }
        }
    } else {
        if (dom.m3dMesh) {
            delete dom.m3dMesh.m3dExtra;
        }
    }

};

const getBinLoader = function (dom) {

    while (dom && (typeof dom.m3dGetBin !== "function")) {
        dom = dom.parentNode;
    }

    return dom;

};

const getPatchLoader = function (dom) {

    while (dom && (typeof dom.m3dLoadPatch !== "function")) {
        dom = dom.parentNode;
    }

    return dom;

};

module.exports = {
    "attributes": [
        "skeleton",
        "materials",
        "indices",
        "vertices", "vertex-unit-size",
        "normals", "normal-unit-size",
        "tangents", "tangent-unit-size",
        "colors", "color-unit-size",
        "uvs", "uv-unit-size",
        "uvs-2", "uv-2-unit-size",
        "uvs-3", "uv-3-unit-size",
        "bone-indices", "bone-weights",
        "patch",
        "extra"
    ],
    "listeners": {
        "onconnected": function () {
            this.m3dSyncBin();
            this.m3dSyncPatch();
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "materials": { syncMaterials(this, value); break; };
                case "indices": 
                case "vertices": 
                case "normals": case "tangents":
                case "colors": 
                case "uvs": case "uvs-2": case "uvs-3":
                case "bone-indices": 
                case "bone-weights": {
                    if (value[0] !== "@") {
                        return;
                    }
                    let loader = getBinLoader(this);
                    if (loader) {
                        loader.m3dGetBin(value.slice(1), (error, result) => {
                            if (error) {
                                console.error(error); return;
                            }
                            this[name] = result;
                        });
                    } else {
                        this[name] = undefined;
                    }
                    break;
                }
                case "name": { syncName(this, value); break; };
                case "vertex-unit-size": {
                    if (this.m3dVertices && this.m3dMesh) {
                        let vertexUnitSize = parseInt(value);
                        if ((!vertexUnitSize) || (!isFinite(vertexUnitSize))) { vertexUnitSize = 3; }
                        this.m3dMesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.m3dVertices, vertexUnitSize));
                    }       
                    break;
                }
                case "normal-unit-size": {
                    if (this.m3dNormals && this.m3dMesh) {
                        let normalUnitSize = parseInt(value);
                        if ((!normalUnitSize) || (!isFinite(normalUnitSize))) { normalUnitSize = 3; }
                        this.m3dMesh.geometry.setAttribute("normal", new THREE.Float32BufferAttribute(this.m3dNormals, normalUnitSize));
                    }
                    break;
                }
                case "tangent-unit-size": {
                    if (this.m3dTangents && this.m3dMesh) {
                        let tangentUnitSize = parseInt(value);
                        if ((!tangentUnitSize) || (!isFinite(tangentUnitSize))) { tangentUnitSize = 3; }
                        this.m3dMesh.geometry.setAttribute("tangent", new THREE.Float32BufferAttribute(this.m3dTangents, tangentUnitSize));
                    }
                    break;
                }
                case "uv-unit-size": {
                    if (this.m3dUVs && this.m3dMesh) {
                        let uvUnitSize = parseInt(value);
                        if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 3; }
                        this.m3dMesh.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(this.m3dUVs, uvUnitSize));
                    }
                    break;
                }
                case "uv-2-unit-size": {
                    if (this.m3dUVs2 && this.m3dMesh) {
                        let uvUnitSize = parseInt(value);
                        if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 3; }
                        this.m3dMesh.geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(this.m3dUVs2, uvUnitSize));
                    }
                    break;
                }
                case "uv-3-unit-size": {
                    if (this.m3dUVs3 && this.m3dMesh) {
                        let uvUnitSize = parseInt(value);
                        if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 3; }
                        this.m3dMesh.geometry.setAttribute("uv3", new THREE.Float32BufferAttribute(this.m3dUVs3, uvUnitSize));
                    }
                    break;
                }
                case "patch": {
                    this.m3dSyncPatch();
                    break;
                }
                case "extra": {
                    syncExtra(this, value);
                    break;
                }
                default: { break; };
            }
        },
        "ondisconnected": function () {
            disposeMesh(this);
        }
    },
    "properties": {
        "extra": {
            "get": function () {
                return this.m3dExtra;
            },
            "set": function (value) {
                this.m3dExtra = value;
            }
        },
        "indices": {
            "get": function () {
                return this.m3dIndices;
            },
            "set": function (value) {
                if ((value instanceof Uint32Array) ||
                    (value instanceof Uint16Array) ||
                    (value instanceof Uint8Array)) {
                    value = Array.prototype.slice.call(value, 0);
                }
                this.m3dIndices = value;
                if (this.m3dMesh) {
                    this.m3dMesh.geometry.setIndex(this.m3dIndices);
                }
            }
        },
        "vertices": {
            "get": function () {
                return this.m3dVertices;
            },
            "set": function (value) {
                this.m3dVertices = value;
                if (this.m3dMesh) {
                    let vertexUnitSize = parseInt($(this).attr("vertex-unit-size"));
                    if ((!vertexUnitSize) || (!isFinite(vertexUnitSize))) { vertexUnitSize = 3; }
                    this.m3dMesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.m3dVertices, vertexUnitSize));
                }
            }
        },
        "normals": {
            "get": function () {
                return this.m3dNormals;
            },
            "set": function (value) {
                this.m3dNormals = value;
                if (this.m3dMesh) {
                    let normalUnitSize = parseInt($(this).attr("normal-unit-size"));
                    if ((!normalUnitSize) || (!isFinite(normalUnitSize))) { normalUnitSize = 3; }
                    this.m3dMesh.geometry.setAttribute("normal", new THREE.Float32BufferAttribute(this.m3dNormals, normalUnitSize));
                }
            }
        },
        "tangents": {
            "get": function () {
                return this.m3dTangents;
            },
            "set": function (value) {
                this.m3dTangents = value;
                if (this.m3dMesh) {
                    let tangentUnitSize = parseInt($(this).attr("tangent-unit-size"));
                    if ((!tangentUnitSize) || (!isFinite(tangentUnitSize))) { tangentUnitSize = 3; }
                    this.m3dMesh.geometry.setAttribute("tangent", new THREE.Float32BufferAttribute(this.m3dTangents, tangentUnitSize));
                }
            }
        },
        "colors": {
            "get": function () {
                return this.m3dColors;
            },
            "set": function (value) {
                this.m3dColors = value;
                if (this.m3dMesh) {
                    let colorUnitSize = parseInt($(this).attr("color-unit-size"));
                    if ((!colorUnitSize) || (!isFinite(colorUnitSize))) { colorUnitSize = 3; }
                    this.m3dMesh.geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.m3dColors, colorUnitSize));
                }
            }
        },
        "uvs": {
            "get": function () {
                return this.m3dUVs;
            },
            "set": function (value) {
                this.m3dUVs = value;
                if (this.m3dMesh) {
                    let uvUnitSize = parseInt($(this).attr("uv-unit-size"));
                    if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 2; }
                    this.m3dMesh.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(this.m3dUVs, uvUnitSize));
                }
            }
        },
        "uvs-2": {
            "get": function () {
                return this.m3dUVs2;
            },
            "set": function (value) {
                this.m3dUVs2 = value;
                if (this.m3dMesh) {
                    let uvUnitSize = parseInt($(this).attr("uv-2-unit-size"));
                    if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 2; }
                    this.m3dMesh.geometry.setAttribute("uv2", new THREE.Float32BufferAttribute(this.m3dUVs2, uvUnitSize));
                }
            }
        },
        "uvs-3": {
            "get": function () {
                return this.m3dUVs3;
            },
            "set": function (value) {
                this.m3dUVs3 = value;
                if (this.m3dMesh) {
                    let uvUnitSize = parseInt($(this).attr("uv-3-unit-size"));
                    if ((!uvUnitSize) || (!isFinite(uvUnitSize))) { uvUnitSize = 2; }
                    this.m3dMesh.geometry.setAttribute("uv3", new THREE.Float32BufferAttribute(this.m3dUVs3, uvUnitSize));
                }
            }
        },
        "bone-indices": {
            "get": function () {
                return this.m3dBoneIndices;
            },
            "set": function (value) {
                this.m3dBoneIndices = value;
                if (this.m3dMesh) {
                    this.m3dMesh.geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(this.m3dBoneIndices, 4));
                }
            }
        },
        "bone-weights": {
            "get": function () {
                return this.m3dBoneWeights;
            },
            "set": function (value) {
                this.m3dBoneWeights = value;
                if (this.m3dMesh) {
                    this.m3dMesh.geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(this.m3dBoneWeights, 4));
                }
            }
        }
    },
    "methods": {
        "m3dGetObject": function () {
            return prepareMesh(this);
        },
        "m3dSyncPatch": function () {

            let patch = $(this).attr("patch");
            if (!patch) { return; }
            if (patch[0] !== "@") { return; }

            let loader = getPatchLoader(this);
            if (!loader) { return; }

            loader.m3dLoadPatch(patch.slice(1), (error, module) => {

                if (error) { 
                    this.m3dPatch = undefined;
                    if (this.m3dMesh) {
                        this.m3dMesh.m3dPatch = undefined;
                    }
                    console.error(error); return; 
                }

                let newPatch = $(this).attr("patch");
                if (newPatch !== patch) { return; }

                this.m3dPatch = module;
                if (this.m3dMesh) {
                    this.m3dMesh.m3dPatch = module;
                }

            });

        },
        "m3dSyncBin": function () {

            let loader = getBinLoader(this);
            if (!loader) {
                return;
            }

            for (let key of ["indices", "vertices", 
                             "normals", "tangents", 
                             "colors", 
                             "uvs", "uvs-2", "uvs-3",
                             "bone-indices", "bone-weights"]) {
                let value = $(this).attr(key);
                if ((!this[key]) && value && (value[0] === "@")) {
                    loader.m3dGetBin(value.slice(1), (error, result) => {
                        if (error) {
                            console.error(error); return;
                        }
                        this[key] = result;
                    });
                }
            }

        }
    }
};

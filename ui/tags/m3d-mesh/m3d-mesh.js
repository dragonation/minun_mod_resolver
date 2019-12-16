const THREE = require("../../scripts/three.js");

const prepareMesh = function (dom) {

    if (!dom.m3dMesh) {

        let geometry = new THREE.BufferGeometry();

        if (dom.m3dIndices) {
            geometry.setIndex(dom.m3dIndices);
        }

        if (dom.m3dVertices) {
            geometry.setAttribute("position", new THREE.Float32BufferAttribute(dom.m3dVertices, 3));
        }
        if (dom.m3dNormals) {
            geometry.setAttribute("normal", new THREE.Float32BufferAttribute(dom.m3dNormals, 3));
        }

        if (dom.m3dUVs) {
            geometry.setAttribute("uv", new THREE.Float32BufferAttribute(dom.m3dUVs, 2));
        }

        dom.m3dMesh = new THREE.Mesh(geometry);

        syncMaterials(dom, $(dom).attr("materials"));

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

    let materials = value.trim().split(",").map((id) => id.trim()).filter((id) => id);
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

module.exports = {
    "attributes": [
        "materials",
        "indices",
        "vertices", "normals", "uvs"
    ],
    "listeners": {
        "onupdated": function (name, value) {
            switch (name) {
                case "materials": { syncMaterials(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            disposeMesh(this);
        }
    },
    "properties": {
        "indices": {
            "get": function () {
                return this.m3dIndices;
            },
            "set": function (value) {
                this.m3dIndices = value;
                if (this.m3dMesh) {
                    this.m3dMesh.geometry.setIndex(dom.m3dIndices);
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
                    this.m3dMesh.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.m3dVertices, 3));
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
                    this.m3dMesh.geometry.setAttribute("normal", new THREE.Float32BufferAttribute(this.m3dNormals, 3));
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
                    this.m3dMesh.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(this.m3dUVs, 2));
                }
            }
        },
    },
    "methods": {
        "m3dGetObject": function () {
            return prepareMesh(this);
        }
    }
};

const THREE = require("/scripts/three.js");

$.dom.registerTagTemplate("pkmsm", "~pkmsm/tags/${tag}/${tag}");
$.dom.registerTagTemplate("pkm", "~pkmsm/tags/${tag}/${tag}");

$.dom.autoregisterTag("m3d-object");
$.dom.autoregisterTag("m3d-skeleton");
$.dom.autoregisterTag("m3d-bone");
$.dom.autoregisterTag("m3d-mesh");
$.dom.autoregisterTag("m3d-texture");
$.dom.autoregisterTag("m3d-material");
$.dom.autoregisterTag("m3d-uniform");
$.dom.autoregisterTag("m3d-clip");
$.dom.autoregisterTag("m3d-track");

const App = function App(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

App.prototype.onKeyPressed = function (event) {
    switch (event.keyCode) {
        case 115: { // s
            this.filler.query("#search-field").select();
            break;
        };
        default: {
            // console.log(event.keyCode);
            break;
        };
    }
};

App.prototype.getNextFrameTopLeft = function (from, size) {

    let coast = $.dom.getDevicePixels(30);

    let diagram = this.filler.query("#diagram");

    let { scrollLeft, scrollTop, viewportLeft, viewportTop } = diagram[0];
    let { width, height } = diagram.css(["width", "height"]);
    width = parseFloat(width);
    height = parseFloat(height);

    let mins = [viewportLeft + scrollLeft, viewportTop + scrollTop];
    let maxes = [mins[0] + width, mins[1] + height];

    let children = diagram.children();
    if (children.length === 0) {
        return {
            "left": mins[0] + coast,
            "top": mins[1] + coast + $.dom.getDevicePixels(40)
        };
    }

    let frames = [];
    for (let looper = 0; looper < children.length; ++looper) {
        let node = children[looper];
        let zIndex = $(node).css("z-index");
        frames.push({
            "node": node,
            "index": looper,
            "z-index": zIndex
        });
    }
    frames.sort((a, b) => {
        if (a["z-index"] && b["z-index"]) {
            let result = parseInt(a["z-index"]) - parseInt(b["z-index"]);
            if (result) {
                return result;
            }
        }
        return a.index - b.index;
    });

    let topmost = $(frames[frames.length - 1].node);

    let frame = topmost.css(["left", "top", "width", "height"]);

    let suggested = {
        "left": parseFloat(frame.left) + parseFloat(frame.width) + $.dom.getDevicePixels(40),
        "top": parseFloat(frame.top),
    };

    return suggested;

};

App.prototype.openModel = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(240)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": filename,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/model-viewer/model-viewer");

    this.loadModel(id, (error, result) => {

        if (error) {
            console.error(error); return;
        }

        let dom = $(result.html);

        let mins = result.bounds.model.mins;
        let maxes = result.bounds.model.maxes;

        // we need adjust the model to make it render in the window correctly
        let size = Math.max((maxes[0] - mins[0]),
                            (maxes[1] - mins[1]),
                            (maxes[2] - mins[2]));

        // scale to fit
        let scale = 60 / size;

        dom.attr({
            "model-scale": scale
        });

        let decoded = undefined;
        let binaryCallbacks = Object.create(null);
        $.ajax("/~pkmsm/model/bin/" + result.id, {
            "success": (result) => {
                let decoded = Object.create(null);
                for (let key in result) {
                    let value = $.base64.decode(result[key]);
                    if (key.split(".").slice(-1)[0] === "bin") {
                        let type = key.split(".").slice(-2)[0];
                        switch (type) {
                            case "f32": { decoded[key] = new Float32Array(value); break; }
                            case "i8": { decoded[key] = new Int8Array(value); break; }
                            case "i16": { decoded[key] = new Int16Array(value); break; }
                            case "i32": { decoded[key] = new Int32Array(value); break; }
                            case "u8": { decoded[key] = new Uint8Array(value); break; }
                            case "u16": { decoded[key] = new Uint16Array(value); break; }
                            case "u32": { decoded[key] = new Uint32Array(value); break; }
                            default: { decoded[key] = value; break; }
                        }
                    } else {
                        decoded[key] = value;
                    }
                }
                if (binaryCallbacks) {
                    let callbacks = binaryCallbacks;
                    binaryCallbacks = null;
                    for (let key in callbacks) {
                        for (let callback of callbacks[key]) {
                            try {
                                if (decoded[key]) {
                                    callback(undefined, decoded[key]);
                                } else {
                                    callback(new Error(`Resource[${key}] not found`));
                                }
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }
                }
            },
            "error": () => {
                if (binaryCallbacks) {
                    let callbacks = binaryCallbacks;
                    binaryCallbacks = null;
                    for (let key in callbacks) {
                        for (let callback of callbacks[key]) {
                            try {
                                callback(new Error(`Resource[${key}] not found`));
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }
                }
                console.error("Failed to load model bin");
            }
        });

        dom[0].m3dGetBin = function (id, callback) {

            if (decoded) {
                try {
                    if (decoded[id]) {
                        callback(undefined, decoded[id]);
                    } else {
                        callback(new Error(`Resource[${id}] not found`));
                    }
                } catch (error) {
                    console.error(error);
                }
                return;
            }

            if (!binaryCallbacks[id]) {
                binaryCallbacks[id] = [];
            }

            binaryCallbacks[id].push(callback);

        };

        let skeleton = dom.find("m3d-skeleton").attr("helper", "yes");

        // filling uniforms for reverse engineering shaders

        let bonesCaches = Object.create(null);
        const m3dBeforeRender = function (renderer, scene, camera, geometry, material, group) {

            if (!material.uniforms) { return; }

            if (material.uniforms.renderingDepth) {
                material.uniforms.renderingDepth.value = false;
            }

            let projectionMatrix = camera.projectionMatrix;
            let viewMatrix = camera.matrixWorldInverse;

            if (material.uniforms.hasTangent) {
                material.uniforms.hasTangent.value = geometry.m3dFromTagObject.getAttribute("has-tangent") === "yes";
            }
            if (material.uniforms.hasBone) {
                material.uniforms.hasBone.value = geometry.m3dFromTagObject.getAttribute("has-bone") === "yes";
            }
            if (material.uniforms.hasBoneW) {
                material.uniforms.hasBoneW.value = geometry.m3dFromTagObject.getAttribute("has-bone-w") === "yes";
            }

            if (material.uniforms.vectors) {

                let vectors = material.uniforms.vectors.value;

                // texture 0
                if (material.uniforms.map) {
                    material.uniforms.map.value.matrix.setUvTransform(
                        material.uniforms.map.value.repeat.x * material.uniforms.map.value.offset.x,
                        material.uniforms.map.value.repeat.y * material.uniforms.map.value.offset.y,
                        material.uniforms.map.value.repeat.x, material.uniforms.map.value.repeat.y,
                        material.uniforms.map.value.rotation, 0, 0);
                    vectors[1].set(
                        material.uniforms.map.value.matrix.elements[0],
                        material.uniforms.map.value.matrix.elements[3], 0,
                        material.uniforms.map.value.matrix.elements[6]);
                    vectors[2].set(
                        material.uniforms.map.value.matrix.elements[1],
                        material.uniforms.map.value.matrix.elements[4], 0,
                        material.uniforms.map.value.matrix.elements[7]);
                    vectors[3].set(
                        material.uniforms.map.value.matrix.elements[2],
                        material.uniforms.map.value.matrix.elements[5],
                        material.uniforms.map.value.matrix.elements[8], 0);
                }

                // texture 1
                if (material.uniforms.map2) {
                    material.uniforms.map2.value.matrix.setUvTransform(
                        material.uniforms.map2.value.repeat.x * material.uniforms.map2.value.offset.x,
                        material.uniforms.map2.value.repeat.y * material.uniforms.map2.value.offset.y,
                        material.uniforms.map2.value.repeat.x, material.uniforms.map2.value.repeat.y,
                        material.uniforms.map2.value.rotation, 0, 0);
                    vectors[4].set(
                        material.uniforms.map2.value.matrix.elements[0],
                        material.uniforms.map2.value.matrix.elements[3], 0,
                        material.uniforms.map2.value.matrix.elements[6]);
                    vectors[5].set(
                        material.uniforms.map2.value.matrix.elements[1],
                        material.uniforms.map2.value.matrix.elements[4], 0,
                        material.uniforms.map2.value.matrix.elements[7]);
                    vectors[6].set(
                        material.uniforms.map2.value.matrix.elements[2],
                        material.uniforms.map2.value.matrix.elements[5],
                        material.uniforms.map2.value.matrix.elements[8], 0);
                }

                // texture 2
                if (material.uniforms.map3) {
                    material.uniforms.map3.value.matrix.setUvTransform(
                        material.uniforms.map3.value.repeat.x * material.uniforms.map3.value.offset.x,
                        material.uniforms.map3.value.repeat.y * material.uniforms.map3.value.offset.y,
                        material.uniforms.map3.value.repeat.x, material.uniforms.map3.value.repeat.y,
                        material.uniforms.map3.value.rotation, 0, 0);
                    vectors[7].set(
                        material.uniforms.map3.value.matrix.elements[0],
                        material.uniforms.map3.value.matrix.elements[3], 0,
                        material.uniforms.map3.value.matrix.elements[6]);
                    vectors[8].set(
                        material.uniforms.map3.value.matrix.elements[1],
                        material.uniforms.map3.value.matrix.elements[4], 0,
                        material.uniforms.map3.value.matrix.elements[7]);
                    vectors[9].set(
                        material.uniforms.map3.value.matrix.elements[2],
                        material.uniforms.map3.value.matrix.elements[5],
                        material.uniforms.map3.value.matrix.elements[8], 0);
                }

                // bone matrices
                if (skeleton[0]) {
                    let boneMatrices = skeleton[0].m3dSkeleton.boneMatrices;
                    let looper = 0;
                    let bones = this.m3dBones;
                    if (!bones) {
                        bones = $(this).attr("bones");
                        this.m3dBones = bones;
                    }
                    if (!bonesCaches[bones]) {
                        bonesCaches[bones] = bones.split(/[\s,]+/).map((index) => parseInt(index));
                    }
                    looper = 0;
                    while (looper < bonesCaches[bones].length) {
                        let index = bonesCaches[bones][looper] * 16;
                        vectors[10 + looper * 3].set(boneMatrices[index],
                                                     boneMatrices[index + 4],
                                                     boneMatrices[index + 8],
                                                     boneMatrices[index + 12]);
                        vectors[11 + looper * 3].set(boneMatrices[index + 1],
                                                     boneMatrices[index + 5],
                                                     boneMatrices[index + 9],
                                                     boneMatrices[index + 13]);
                        vectors[12 + looper * 3].set(boneMatrices[index + 2],
                                                     boneMatrices[index + 6],
                                                     boneMatrices[index + 10],
                                                     boneMatrices[index + 14]);
                        ++looper;
                    }
                }

                // directional light for vertex shader
                let directionalLight = scene.children.filter((child) => child.isDirectionalLight)[0];
                let targetPosition = new THREE.Vector4(0, 0, 0, 1);
                targetPosition.applyMatrix4(directionalLight.target.matrixWorld);
                let position = new THREE.Vector4(0, 0, 0, 1);
                position.applyMatrix4(directionalLight.matrixWorld);
                let lightDirection = new THREE.Vector4(
                    position.x - targetPosition.x,
                    position.y - targetPosition.y,
                    position.z - targetPosition.z, 0);
                vectors[83].set(lightDirection.x, lightDirection.y, lightDirection.z, 0);

                // bounding box or light color
                // if (jsonMaterial.shaders.vertex !== "Default") {
                //     vectors[84].set(
                //         (boundingBox.max[0] - boundingBox.min[0]) * worldScales[0] + threeMesh.parent.position.x,
                //         (boundingBox.max[2] - boundingBox.min[2]) * worldScales[2] + threeMesh.parent.position.z,
                //         boundingBox.min[1] * worldScales[1] + threeMesh.parent.position.y,
                //         boundingBox.max[1] * worldScales[1] + threeMesh.parent.position.y);
                // } else {
                    if (directionalLight) {
                        vectors[84].set(
                            directionalLight.color.r,
                            directionalLight.color.g,
                            directionalLight.color.b,
                            directionalLight.intensity);
                    } else {
                        vectors[84].set(1, 1, 1, 0);
                    }
                // }

                // projection matrices
                vectors[86].set(projectionMatrix.elements[0],
                                projectionMatrix.elements[4],
                                projectionMatrix.elements[8],
                                projectionMatrix.elements[12]);
                vectors[87].set(projectionMatrix.elements[1],
                                projectionMatrix.elements[5],
                                projectionMatrix.elements[9],
                                projectionMatrix.elements[13]);
                vectors[88].set(projectionMatrix.elements[2],
                                projectionMatrix.elements[6],
                                projectionMatrix.elements[10],
                                projectionMatrix.elements[14]);
                vectors[89].set(projectionMatrix.elements[3],
                                projectionMatrix.elements[7],
                                projectionMatrix.elements[11],
                                projectionMatrix.elements[15]);

                // view matrix
                vectors[90].set(viewMatrix.elements[0],
                                viewMatrix.elements[4],
                                viewMatrix.elements[8],
                                viewMatrix.elements[12]);
                vectors[91].set(viewMatrix.elements[1],
                                viewMatrix.elements[5],
                                viewMatrix.elements[9],
                                viewMatrix.elements[13]);
                vectors[92].set(viewMatrix.elements[2],
                                viewMatrix.elements[6],
                                viewMatrix.elements[10],
                                viewMatrix.elements[14]);

            }

            if (material.uniforms.vectors && material.uniforms.uvVectors) {
                for (let looper = 0; looper < 10; ++looper) {
                    material.uniforms.uvVectors.value[looper].copy(material.uniforms.vectors.value[looper]);
                }
            }

            // camera
            if (material.uniforms.cameraNear) {
                material.uniforms.cameraNear.value = camera.near;
            }
            if (material.uniforms.cameraScale) {
                material.uniforms.cameraScale.value = 1 / (camera.far - camera.near);
            }

            if (material.uniforms.environmentAmbient) {
                // lights for fragment shader
                let ambientLight = scene.children.filter((child) => child.isAmbientLight)[0];
                if (ambientLight) {
                    material.uniforms.environmentAmbient.value.set(
                        ambientLight.color.r, ambientLight.color.g, 
                        ambientLight.color.b, ambientLight.intensity);
                }
            }

            if (material.uniforms.lightDirectionals && 
                material.uniforms.lightPositions &&
                material.uniforms.lightDirections &&
                material.uniforms.lightAmbients &&
                material.uniforms.lightDiffuses &&
                material.uniforms.lightSpeculars &&
                material.uniforms.lightsCount) {
                let lights = scene.children.filter((child) => child.isLight && !child.isAmbientLight).slice(0, 3);
                let looper = 0;
                while (looper < lights.length) {
                    material.uniforms.lightDirectionals.value[looper] = lights[looper].isDirectionalLight;
                    if (material.uniforms.lightDirectionals.value[looper]) {
                        let targetPosition = new THREE.Vector4(0, 0, 0, 1);
                        targetPosition.applyMatrix4(lights[looper].target.matrixWorld);
                        let position = new THREE.Vector4(0, 0, 0, 1);
                        position.applyMatrix4(lights[looper].matrixWorld);
                        let lightDirection = new THREE.Vector4(
                            position.x - targetPosition.x,
                            position.y - targetPosition.y,
                            position.z - targetPosition.z, 0);
                        lightDirection.applyMatrix4(camera.matrixWorldInverse);
                        material.uniforms.lightPositions.value[looper].set(lightDirection.x, lightDirection.y, lightDirection.z, 0);
                        material.uniforms.lightDirections.value[looper].set(lightDirection.x, lightDirection.y, lightDirection.z, 0);
                    } else {
                        material.uniforms.lightPositions.value[looper].set(
                            lights[looper].position.x, lights[looper].position.y, lights[looper].position.z);
                        material.uniforms.lightDirections.value[looper].set(
                            lights[looper].position.x, lights[looper].position.y, lights[looper].position.z);
                    }
                    material.uniforms.lightAmbients.value[looper].set(lights[looper].color.r, lights[looper].color.g, lights[looper].color.b, lights[looper].intensity);
                    material.uniforms.lightDiffuses.value[looper].set(1, 1, 1, lights[looper].intensity);
                    material.uniforms.lightSpeculars.value[looper * 2].set(1, 1, 1, lights[looper].intensity);
                    material.uniforms.lightSpeculars.value[looper * 2 + 1].set(1, 1, 1, lights[looper].intensity);
                    ++looper;
                }
                material.uniforms.lightsCount.value = lights.length;
            } else {
                if (material.uniforms.lightsCount) {
                    material.uniforms.lightsCount.value = 0;
                }
            }

        };

        for (let mesh of dom.find("m3d-mesh")) {
            mesh.m3dBeforeRender = m3dBeforeRender;
        }

        let scene = frame[0].frame.filler.query("m3d-scene");

        scene.append(dom);

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.smartOpen = function (id, from) {

    this.openModel(id);

};

App.prototype.loadModel = function (id, callback) {

    $.ajax(`/~pkmsm/model/${id}`, {
        "success": (result) => {
            $.ajax(`/~pkmsm/model/res/${result.id}/model.xml`, {
                "dataType": "text",
                "success": (html) => {
                    callback(null, Object.assign(result, {
                        "html": html
                    }));
                },
                "error": () => {
                    callback(new Error("Failed to get model"));
                }
            });
        }
    });

};

App.prototype.title = "Pokemon Ultra Sun/Moon - 3DS";

App.functors = {
    "preventSystemShortcut": function (event) {
        if (event.altKey) {
            event.preventDefault();
        }
    },
    "advanceSearch": function (event) {

        switch (event.keyCode) {
            case 13: { // return
                if (this.searchOverlay) {
                    if (this.searchOverlay.filler.parameters.results) {
                        let item = this.searchOverlay.filler.parameters.results[0];
                        this.smartOpen(item.id);
                        event.target.blur();
                        this.searchOverlay.dom.hideOverlay();
                    }
                }
                break;
            };
            case 27: { // escape
                event.target.blur();
                if (this.searchOverlay) {
                    this.searchOverlay.dom.hideOverlay();
                }
                break;
            };
            default: {
                break;
            };
        }

    },
    "updateSearchResult": function () {

        let width = $.dom.getDevicePixels(340);
        let height = $.dom.getDevicePixels(400);

        let left = parseInt($("body").css("width")) - $.dom.getDevicePixels(60) - width - $.dom.getDevicePixels(6);
        let top = $.dom.getDevicePixels(40 + 6);

        if (!this.searchOverlay) {
            this.searchOverlay = this.createOverlay("~pkmsm/overlays/search/search", {
                "left": left, "top": top,
                "width": width, "height": height,
                "justHideWhenClose": true
            });
        } else {
            $(this.searchOverlay.dom).css({
                "left": `${left}px`, "top": `${top}px`
            });
        }

        let keyword = this.filler.query("ui-input-field").val();

        this.searchOverlay.searchWithKeyword(keyword);

        this.searchOverlay.dom.showOverlay();

    },
    "smartOpen": function (id) {

        this.smartOpen(id);
        
    }
};

module.exports.App = App;

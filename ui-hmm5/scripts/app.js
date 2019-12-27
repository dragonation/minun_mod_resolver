const THREE = require("/scripts/three.js");

$.dom.registerTagTemplate("hmm5", "~hmm5/tags/${tag}/${tag}");

let at = "@";

require("./serial.js");

const App = function App(dom, filler) {

    this.dom = dom;

    this.filler = filler;

    // TODO: make system autoupdate title
    document.title = this.title;

};

App.prototype.onKeyPressed = function (event) {
    switch (event.keyCode) {
        case 102: { // f
            this.showFileBrowser();
            break;
        };
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

App.prototype.smartOpen = function (id, from) {

    if (id[0] === "@") {
        this.openInlineObject(id, from);
        return;
    }

    if (!/[\.\/#]/.test(id)) {
        this.openGUID(id, from);
        return;
    }

    let extname = id.split("#")[0].split("/").slice(-1)[0].split(".").slice(-1)[0];

    if (extname === "txt") {
        this.openText(id, from);
        return;
    }

    if (extname === "dds") {
        this.openDDS(id, from);
        return;
    }

    if (extname === "xdb") {
        let path = id.split("#")[0];
        if (path[0] === "/") {
            path = path.slice(1);
        }
        $.ajax("/~hmm5/list/bindings/" + path, {
            "success": (data, status, request) => {
                if (data.length > 0) {
                    let link = undefined;
                    if (id.indexOf("#") === -1) {
                        link = data.split("\n").filter((link) => {
                            return (link.split("#xpointer(")[1][0] === "/");
                        })[0];
                    } else {
                        link = data.split("\n").filter((link) => {
                            return link.split(":").slice(0, -1).join(":") === id;
                        })[0];
                    }
                    if (link) {
                        let binding = link.split(":").slice(-1)[0];
                        switch (binding) {
                            case "f1019f05": {
                                this.openModel(link.split(":").slice(0, -1).join(":"));
                                return;
                            };
                            case "2805ff22": {
                                this.openCharacterView(link.split(":").slice(0, -1).join(":"));
                                return;
                            };
                            default: {
                                console.log(binding);
                                this.openPropertyList(link.split(":").slice(0, -1).join(":"), from);
                                return;
                            }
                        }
                    }
                } else {
                    this.openXDB(id, from);
                }
            }
        });
        return;
    }

    if (id.split("#").length > 1) {
        this.openPropertyList(id, from);
        return;
    }

    this.openXDB(id, from);

};

App.prototype.loadInlineObject = function (id, callback) {

    if (id[0] === "@") {
        id = id.slice(1);
    }

    $.ajax(`/~hmm5/inline/${id}`, {
        "success": (data) => {
            let parsed = $.serial.deserialize(data);
            callback(undefined, parsed);
        },
        "error": function (error) {
            callback(error);
        }
    });

};

App.prototype.loadText = function (id, callback) {

    $.ajax(`/~hmm5/pak/${id}`, {
        "success": (data) => {
            callback(undefined, data);
        },
        "error": function (error) {
            callback(error);
        }
    });

};

App.prototype.loadGeometryGUID = function (id, callback) {

    $.ajax(`/~hmm5/geom/${id}`, {
        "success": (data) => {

            let parsed = $.serial.deserialize(data);

            let geometry = {
                "meshes": []
            };

            let maxes = [-Infinity, -Infinity, -Infinity];
            let mins = [Infinity, Infinity, Infinity];

            for (let mesh of parsed.meshes) {

                let polygons = [];

                for (let polygon of mesh) {

                    let vertexCount = polygon.configs.vertices.length;
                    let faceCount = polygon.triangles.length;

                    let vertices = new Float32Array(vertexCount * 3);
                    let normals = new Float32Array(vertexCount * 3);
                    let uvs = new Float32Array(vertexCount * 2);

                    let boneWeights = new Float32Array(vertexCount * 4);
                    let boneIndices = new Uint16Array(vertexCount * 4);

                    for (let looper = 0; looper < vertexCount; ++looper) {
                        let index = polygon.configs.vertices[looper];
                        let vertex = polygon.vertices[index];
                        let bone = polygon.bones[index];
                        let data = polygon.configs.data[looper];
                        if (maxes[0] < vertex[0]) { maxes[0] = vertex[0]; }
                        if (maxes[1] < vertex[1]) { maxes[1] = vertex[1]; }
                        if (maxes[2] < vertex[2]) { maxes[2] = vertex[2]; }
                        if (mins[0] > vertex[0]) { mins[0] = vertex[0]; }
                        if (mins[1] > vertex[1]) { mins[1] = vertex[1]; }
                        if (mins[2] > vertex[2]) { mins[2] = vertex[2]; }
                        vertices[looper * 3] = vertex[0];
                        vertices[looper * 3 + 1] = vertex[1];
                        vertices[looper * 3 + 2] = vertex[2];
                        normals[looper * 3] = data.normal[0];
                        normals[looper * 3 + 1] = data.normal[1];
                        normals[looper * 3 + 2] = data.normal[2];
                        uvs[looper * 2] = data.uv[0];
                        uvs[looper * 2 + 1] = data.uv[1];
                        boneWeights[looper * 4] = bone.weights[0];
                        boneWeights[looper * 4 + 1] = bone.weights[1];
                        boneWeights[looper * 4 + 2] = bone.weights[2];
                        boneWeights[looper * 4 + 3] = bone.weights[3];
                        boneIndices[looper * 4] = bone.indices[0];
                        boneIndices[looper * 4 + 1] = bone.indices[1];
                        boneIndices[looper * 4 + 2] = bone.indices[2];
                        boneIndices[looper * 4 + 3] = bone.indices[3];
                    }

                    let indices = []; //new Int16Array(faceCount * 3);
                    for (let looper = 0; looper < faceCount; ++looper) {
                        let triangle = polygon.triangles[looper];
                        indices[looper * 3] = triangle[0];
                        indices[looper * 3 + 1] = triangle[1];
                        indices[looper * 3 + 2] = triangle[2];
                    }

                    polygons.push({
                        "indices": indices,
                        "vertices": vertices,
                        "normals": normals,
                        "uvs": uvs,
                        "bones": {
                            "weights": boneWeights,
                            "indices": boneIndices
                        }
                    });

                }

                geometry.meshes.push(polygons);
            }

            geometry.mins = mins;
            geometry.maxes = maxes;

            callback(undefined, geometry);

        },
        "error": function (error) {
            callback(error);
        }
    });

};

App.prototype.loadSkeletonGUID = function (id, callback) {

    $.ajax(`/~hmm5/skel/${id}`, {
        "success": (data) => {

            let parsed = $.serial.deserialize(data);

            let skeleton = {
                "root": parsed.root,
                "bones": []
            };

            let threeBones = [];

            for (let looper = 0; looper < parsed.bones.length; ++looper) {

                let record = parsed.bones[looper];

                skeleton.bones.push({
                    "index": looper,
                    "name": record.name,
                    "parent": record.parent >= 0 ? parsed.bones[record.parent].name : "",
                    "translation": record.translations,
                    "rotation": record.quaternion,
                    "scale": record.scales
                });

                let threeBone = new THREE.Bone();

                threeBone.name = record.name;
                threeBone.scale.set(record.scales[0], record.scales[1], record.scales[2]);
                threeBone.position.set(record.translations[0], record.translations[1], record.translations[2]);
                threeBone.quaternion.set(record.quaternion[0], record.quaternion[1], record.quaternion[2], record.quaternion[3]);
                if (record.parent !== -1) {
                    threeBones[record.parent].add(threeBone);
                }

                threeBone.updateMatrixWorld(true);

                threeBones.push(threeBone);

            }

            let threeSkeleton = new THREE.Skeleton(threeBones);

            threeSkeleton.update();
            threeSkeleton.calculateInverses();

            let maxes = [-Infinity, -Infinity, -Infinity];
            let mins = [Infinity, Infinity, Infinity];

            for (let bone of threeSkeleton.bones) {
                let vector = new THREE.Vector3(0, 0, 0);
                vector.applyMatrix4(bone.matrixWorld);
                if (maxes[0] < vector.x) { maxes[0] = vector.x; }
                if (maxes[1] < vector.y) { maxes[1] = vector.y; }
                if (maxes[2] < vector.z) { maxes[2] = vector.z; }
                if (mins[0] > vector.x) { mins[0] = vector.x; }
                if (mins[1] > vector.y) { mins[1] = vector.y; }
                if (mins[2] > vector.z) { mins[2] = vector.z; }
            }

            skeleton.mins = mins;
            skeleton.maxes = maxes;

            callback(undefined, skeleton);

        },
        "error": function (error) {
            callback(error);
        }
    });

};

App.prototype.loadAnimationGUID = function (id, callback) {

    $.ajax(`/~hmm5/anim/${id}`, {
        "success": (data) => {
            let parsed = $.serial.deserialize(data);
            callback(undefined, parsed);
        },
        "error": function (error) {
            callback(error);
        }
    });

};

App.prototype.loadXDB = function (id, callback) {

    $.ajax("/~hmm5/xml/" + id, {
        "success": (data, status, request) => {

            let parsed = null;
            try {
                parsed = $.serial.deserialize(data);
            } catch (error) {
                callback(error);
                return;
            }

            if (parsed[at + "@name"] === "#document") {
                parsed = parsed[Object.keys(parsed).filter(key => key[0] !== "@")[0]][0];
            }

            callback(undefined, parsed);
        },
        "error": (error) => {
            callback(error);
        }
    });

};

App.prototype.loadPropertyList = function (id, callback) {

    $.ajax(`/~hmm5/link${id.split("#")[0]}?hash=${encodeURIComponent(id.split("#").slice(1).join("#"))}`, {
        "success": (data, status, request) => {

            let parsed = null;
            try {
                parsed = $.serial.deserialize(data);
            } catch (error) {
                callback(error);
                return;
            }

            callback(undefined, parsed);

        },
        "error": function (error) {
            callback(error);
        }
    });

};

App.prototype.loadCharacterView = function (id, callback) {

    let loadLink = (link) => {
        return new Promise((resolve, reject) => {
            this.loadPropertyList(link, (error, result) => {
                if (error) {
                    reject(error); return;
                }
                resolve(result);
            });
        });
    };

    (async () => {

        let characterView = await loadLink(id);

        let model = await new Promise((resolve, reject) => {
            this.loadModel(characterView.Model.href, (error, result) => {
                if (error) {
                    reject(error); return;
                }
                resolve(result);
            });
        });

        let clips = {};
        let play = undefined;
        if (characterView.sequence) {
            let animSet = await loadLink(characterView.AnimSet.href);
            let animation = animSet.animations.filter((animation) => {
                return (animation.Kind === characterView.sequence[0].Kind);
            })[0];
            if (animation) {
                let anim = await loadLink(animation.Anim.href);
                let animationGUID = await new Promise((resolve, reject) => {
                    this.loadAnimationGUID(anim.uid.id, (error, result) => {
                        if (error) {
                            reject(error); return;
                        }
                        resolve(result);
                    });
                });
                animationGUID.name = characterView.sequence[0].Kind;
                clips = {
                    [characterView.sequence[0].Kind]: Object.assign({
                        "movementSpeed": anim.MovementSpeed,
                        "speedFactor": anim.SpeedFactor,
                        "speedLineFallTime": anim.SpeedLineFallTime
                    }, animationGUID)
                };
                play = {
                    "clip": characterView.sequence[0].Kind,
                    "counter": characterView.sequence[0].Counter,
                    "cutBegin": characterView.sequence[0].CutBegin,
                    "cutEnd": characterView.sequence[0].CutEnd
                };
            }
        }

        callback(undefined, {
            "model": model,
            "play": play,
            "clips": clips,
        });

    })().catch((error) => {
        console.error(error);
    });

};

App.prototype.loadModel = function (id, callback) {

    let loadLink = (link) => {
        return new Promise((resolve, reject) => {
            this.loadPropertyList(link, (error, result) => {
                if (error) {
                    reject(error); return;
                }
                resolve(result);
            });
        });
    };

    (async () => {

        let links = Object.create(null);

        let model = await loadLink(id);

        // geometry
        let geometry = undefined;
        links[model.Geometry.href] = true;
        geometry = await loadLink(model.Geometry.href);
        links[geometry.uid.id] = true;

        // skeleton
        let skeleton = undefined;
        if (model.Skeleton) {
            links[model.Skeleton.href] = true;
            let linked = await loadLink(model.Skeleton.href);
            links[linked.uid.id] = true;
            skeleton = await new Promise((resolve, reject) => {
                this.loadSkeletonGUID(linked.uid.id, (error, skeleton) => {
                    if (error) { reject(error); return; }
                    resolve(skeleton);
                });
            });
        }

        let materials = Object.create(null);
        let materialIDs = Object.create(null);
        let nextMaterialID = 1;

        let textures = Object.create(null);
        let textureIDs = Object.create(null);
        let nextTextureID = 1;

        let materialMap = [];
        for (let looper = 0; looper < model.Materials.length; ++looper) {
            let href = model.Materials[looper].href;
            let materialID = materialIDs[href];
            if (!materialID) {
                materialID = "material-" + nextMaterialID; ++nextMaterialID;
                let name = href.split("#")[0].split("/").slice(-1)[0].split(".")[0].split("-").slice(-1)[0];
                let material = {
                    "name": name,
                    "alphaTest": 1
                };
                materialIDs[href] = materialID;
                materials[materialID] = material;
                links[href] = true;
                let linked = await loadLink(href);
                let textureID = textureIDs[linked.Texture.href];
                if (!textureID) {
                    links[linked.Texture.href] = true;
                    textureID = "texture-" + nextTextureID; ++nextTextureID;
                    textureIDs[linked.Texture.href] = textureID;
                    let linked2 = await loadLink(linked.Texture.href);
                    links[linked2.DestName.href] = true;
                    let texture = {
                        "name": linked2.SrcName.href.split("/").slice(-1)[0].split(".").slice(0, -1).join("."),
                        "src": linked2.DestName.href,
                        "size": [linked2.Width, linked2.Height],
                        "type": linked2.Type.token.toLowerCase(),
                        // "mipCount": linked2.NMips,
                        "flipY": linked2.FlipY
                    };
                    switch (linked2.AddrType.token) {
                        case "CLAMP": { texture.wrapS = "clamp"; texture.wrapT = "clamp"; break; };
                        case "WRAP": { texture.wrapS = "repeat"; texture.wrapT = "repeat"; break; };
                        case "WRAP_X": { texture.wrapS = "repeat"; texture.wrapT = "clamp"; break; };
                        case "WRAP_Y": { texture.wrapS = "clamp"; texture.wrapT = "repeat"; break; };
                        default: { break; };
                    }
                    textures[textureID] = texture;
                }
                material.texture = textureID;
                material.side = linked.is2Sided ? "both-sides" : "front-face";
                material.depthTest = linked.IgnoreZBuffer ? false : true;
                material.fogAffected = linked.AffectedByFog;
                material.castingShadows = [linked.CastShadow, linked.BackFaceCastShadow];
                material.receivingShadows = linked.ReceiveShadow;
                // Effect
                // TranslucentColor
                // DielMirror
                // MetalMirror
                // Gloss texture
                // LightingMode
                // SpecFactor SpecColor
                switch (linked.AlphaMode.token) {
                    case "AM_OPAQUE": { material.transparent = false; material.depthWrite = true; break; };
                    case "AM_OVERLAY": { material.transparent = true; material.depthWrite = false; break; };
                    case "AM_OVERLAY_ZWRITE": { material.transparent = true; material.depthWrite = true; break; };
                    case "AM_TRANSPARENT": { material.transparent = true; material.depthWrite = false; break; };
                    case "AM_ALPHA_TEST": {
                        material.transparent = true;
                        material.alphaTest = 0.5;
                        material.depthWrite = true;
                        break;
                    };
                    case "AM_DECAL": { material.transparent = false; material.depthWrite = true; break; };
                    default: { break; };
                }
            }
            materialMap[looper] = materialID;
        }

        this.loadGeometryGUID(geometry.uid.id, (error, result) => {

            if (error) {
                callback(error); return;
            }

            let meshes = [];

            let offset = 0;
            for (let meshIndex = 0; meshIndex < result.meshes.length; ++meshIndex) {
                let mesh = {
                    "polygons": [],
                    "name": geometry.MeshNames[meshIndex]
                };
                meshes.push(mesh);
                for (let polygonIndex = 0; polygonIndex < result.meshes[meshIndex].length; ++polygonIndex) {
                    let polygon = Object.assign({
                        "material": materialMap[offset]
                    }, result.meshes[meshIndex][polygonIndex]);
                    mesh.polygons.push(polygon);
                    ++offset;
                }
            }

            let model = {
                "materials": materials,
                "textures": textures,
                "skeleton": skeleton,
                "geometry": {
                    "rootJoint": geometry.RootJoint,
                    "bestFit": [geometry.BestFitPoint.x, geometry.BestFitPoint.y, geometry.BestFitPoint.z],
                    "center": [geometry.Center.x, geometry.Center.y, geometry.Center.z],
                    "direction": [geometry.Dir.x, geometry.Dir.y, geometry.Dir.z, geometry.Dir.w],
                    "size": [geometry.Size.x, geometry.Size.y, geometry.Size.z],
                    "mins": result.mins,
                    "maxes": result.maxes,
                    "meshes": meshes
                }
            };

            callback(undefined, model);

        });

    })().catch((error) => {
        console.error(error);
    });

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

App.prototype.openInlineObject = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(300)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let frame = $("<ui-diagram-frame>").attr({
        "caption": id.slice(1),
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~hmm5/frames/property-list/property-list");

    this.loadInlineObject(id, (error, result) => {

        if (error) {
            console.error(error);
            return;
        }

        frame[0].frame.filler.fill({
            "target": result
        });

        this.filler.query("#diagram")[0].updateLayouts();

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openText = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(100)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let frame = $("<ui-diagram-frame>").attr({
        "caption": id.slice(1),
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~hmm5/frames/code-editor/code-editor");

    this.loadText(id, (error, result) => {

        if (error) {
            console.error(error);
            return;
        }

        frame[0].frame.filler.fill({
            "target": result.trim()
        });

        this.filler.query("#diagram")[0].updateLayouts();

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openGUID = function (guid, from) {

    $.ajax(`/~hmm5/uid/${guid}`, {
        "success": (path) => {
            switch (path.split("/")[1].toLowerCase()) {
                case "geometries": {
                    this.openGeometryGUID(path, from); break;
                };
                case "skeletons": {
                    this.openSkeletonGUID(path, from); break;
                };
                // case "animations": {
                //     this.openAnimationGUID(path, from); break;
                // };
                default: {
                    console.error(path); break;
                };
            }
        }
    });

};

// App.prototype.openAnimationGUID = function (id, from) {

//     this.loadAnimationGUID(id, (error, result) => {
//         console.log(error, result);
//     });

// };

App.prototype.openGeometryGUID = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(240)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": filename,
        "resizable": "yes",
        "wire-id": filename
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~hmm5/frames/geometry-viewer/geometry-viewer");

    this.loadGeometryGUID(id, (error, result) => {

        if (error) {
            console.error(error);
            return;
        }

        // we need adjust the model to make it render in the window correctly
        let size = Math.max((result.maxes[0] - result.mins[0]),
                            (result.maxes[1] - result.mins[1]),
                            (result.maxes[2] - result.mins[2]));

        // move to center
        let translation = [(result.mins[0] + result.maxes[0]) * (-0.5),
                           (result.mins[1] + result.maxes[1]) * (-0.5),
                           -result.mins[2]];
        // scale to fit
        let scale = 60 / size;
        // make z axis up
        let rotation = ["X", -Math.PI / 2];

        frame[0].frame.filler.fill({
            "translation": translation,
            "scale": scale,
            "rotation": rotation,
            "target": result
        });

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openSkeletonGUID = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(240)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": filename,
        "resizable": "yes",
        "wire-id": filename
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~hmm5/frames/skeleton-viewer/skeleton-viewer");

    this.loadSkeletonGUID(id, (error, result) => {

        if (error) {
            console.error(error);
            return;
        }

        // we need adjust the model to make it render in the window correctly
        let size = Math.max((result.maxes[0] - result.mins[0]),
                            (result.maxes[1] - result.mins[1]),
                            (result.maxes[2] - result.mins[2]));

        // move to center
        let translation = [(result.mins[0] + result.maxes[0]) * (-0.5),
                           (result.mins[1] + result.maxes[1]) * (-0.5),
                           -result.mins[2]];
        // scale to fit
        let scale = 60 / size;
        // make z axis up
        let rotation = ["X", -Math.PI / 2];

        frame[0].frame.filler.fill({
            "translation": translation,
            "scale": scale,
            "rotation": rotation,
            "target": result
        });

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openPropertyList = function (id, from) {

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let name = id.split("#").slice(-1)[0].split("/").slice(-1)[0].split("(").slice(-1)[0].split(")")[0];

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(300)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let frame = $("<ui-diagram-frame>").attr({
        "caption": `${filename}#${name}`,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~hmm5/frames/property-list/property-list");

    this.loadPropertyList(id, (error, result) => {

        if (error) {
            console.error(error);
            return;
        }

        frame[0].frame.filler.fill({
            "target": result
        });

        this.filler.query("#diagram")[0].updateLayouts();

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openXDB = function (id, from) {

    let name = id.split("/").slice(-1)[0];

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(300)
    };

    let position = this.getNextFrameTopLeft(from, size);

    let frame = $("<ui-diagram-frame>").attr({
        "caption": name,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~hmm5/frames/xdb-viewer/xdb-viewer");

    this.loadXDB(id, (error, result) => {

        if (error) {
            console.error(error);
            return;
        }

        frame[0].frame.filler.fill({
            "target": result
        });

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openDDS = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(240)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
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

    frame[0].loadUI("/~hmm5/frames/dds-viewer/dds-viewer");

    frame[0].frame.filler.fill({
        "target": id
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openCharacterView = function (id, from) {

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

    frame[0].loadUI("/~hmm5/frames/character-viewer/character-viewer");

    this.loadCharacterView(id, (error, result) => {

        if (error) {
            console.error(error); return;
        }

        console.log(result);

        let mins = result.model.geometry.mins;
        let maxes = result.model.geometry.maxes;

        // we need adjust the model to make it render in the window correctly
        let size = Math.max((maxes[0] - mins[0]), (maxes[1] - mins[1]), (maxes[2] - mins[2]));

        // move to center
        let translation = [(mins[0] + maxes[0]) * (-0.5), (mins[1] + maxes[1]) * (-0.5), -mins[2]];
        // scale to fit
        let scale = 60 / size;

        // make z axis up
        let rotation = ["X", -Math.PI / 2];

        frame[0].frame.filler.fill({
            "translation": translation,
            "scale": scale,
            "rotation": rotation,
            "model": result.model,
            "play": result.play,
            "clips": result.clips
        });

        if (result.play) {
            setTimeout(() => {
                frame[0].frame.filler.query("#model")[0].playM3DClip(result.play.clip);
            }, 100);
        }

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

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

    frame[0].loadUI("/~hmm5/frames/model-viewer/model-viewer");

    this.loadModel(id, (error, result) => {

        if (error) {
            console.error(error); return;
        }

        let mins = result.geometry.mins;
        let maxes = result.geometry.maxes;

        // we need adjust the model to make it render in the window correctly
        let size = Math.max((maxes[0] - mins[0]), (maxes[1] - mins[1]), (maxes[2] - mins[2]));

        // move to center
        let translation = [(mins[0] + maxes[0]) * (-0.5), (mins[1] + maxes[1]) * (-0.5), -mins[2]];
        // scale to fit
        let scale = 60 / size;

        // make z axis up
        let rotation = ["X", -Math.PI / 2];

        frame[0].frame.filler.fill({
            "translation": translation,
            "scale": scale,
            "rotation": rotation,
            "target": result
        });

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.showFileBrowser = function () {

    if (!this.fileBrowser) {
        this.fileBrowser = this.createWindow("~hmm5/windows/files/files", {
            "caption": "HMM5 File Browser",
            "left": 50, "top": 100,
            "width": 600, "height": 400,
            "resizable": true,
            "justHideWhenClose": true
        });
    }

    this.fileBrowser.dom.showWindow();
};

App.prototype.title = "Heroes of Might and Magic 5";

App.functors = {
    "preventSystemShortcut": function (event) {
        if (event.altKey) {
            event.preventDefault();
        }
    },
    "advanceSearch": function (event) {

        if (event.altKey) {
            let scope = undefined;
            switch (event.keyCode) {
                case 70: { scope = "file"; break; }; // f
                case 65: { scope = "arena"; break; }; // a
                case 77: { scope = "model"; break; }; // m
                case 84: { scope = "token"; break; }; // t
                default: { break; };
            }
            if (scope && this.searchOverlay) {
                this.searchOverlay.filler.fill({ "scope": scope });
                this.searchOverlay.updateSearches();
            }
            return;
        }

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
    "showFileBrowser": function () {

        this.showFileBrowser();

    },
    "updateSearchResult": function () {

        let width = $.dom.getDevicePixels(300);
        let height = $.dom.getDevicePixels(400);

        let left = parseInt($("body").css("width")) - $.dom.getDevicePixels(60) - width - $.dom.getDevicePixels(6);
        let top = $.dom.getDevicePixels(40 + 6);

        if (!this.searchOverlay) {
            this.searchOverlay = this.createOverlay("~hmm5/overlays/search/search", {
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

    }
};

module.exports.App = App;

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
        "caption": `Model “${filename}”`,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/model-viewer/model-viewer", {
        "id": id
    });

    this.loadModel(id, (error, result) => {

        if (error) {
            console.error(error); return;
        }

        let mins = result.bounds.pose.mins;
        let maxes = result.bounds.pose.maxes;

        // we need adjust the model to make it render in the window correctly
        let size = Math.max((maxes[0] - mins[0]),
                            Math.max(maxes[1], maxes[1] - mins[1]),
                            (maxes[2] - mins[2]));

        // scale to fit
        let scale = 60 / size;

        let m3dObject = $("<m3d-object>").attr({
            "id": "pokemon-model",
            "model-scale": scale,
            "frustom-culled": "no"
        });

        const prepareDOM = (html, prefix) => {

            let dom = $(html);

            let id = result.id;

            let decoded = undefined;
            let binaryCallbacks = Object.create(null);
            $.ajax("/~pkmsm/model/data/mesh/" + result.id + (prefix ? "/" + prefix : ""), {
                "success": (result) => {

                    decoded = Object.create(null);
                    dom[0].binDecoded = decoded;
                    if (!prefix) {
                        m3dObject[0].binDecoded = decoded;
                    }
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

                    if (!prefix) {
                        $.ajax(`/~pkmsm/model/res/${id}/animation.xml`, {
                            "dataType": "text",
                            "success": (html) => {
                                let animations = $(html);
                                frame[0].frame.animations = animations;
                                $.ajax(`/~pkmsm/model/data/animation/${id}`, {
                                    "success": (result) => {
                                        for (let key in result) {
                                            let value = $.base64.decode(result[key]);
                                            if (key.split(".").slice(-1)[0] === "bin") {
                                                let type = key.split(".").slice(-2)[0];
                                                switch (type) {
                                                    case "u8": { 
                                                        decoded[key] = [];
                                                        let array = new Uint8Array(value); 
                                                        for (let value of array) {
                                                            decoded[key].push(value ? true : false);
                                                        }
                                                        break; 
                                                    }
                                                    case "f32": 
                                                    default: { 
                                                        decoded[key] = [];
                                                        let array = new Float32Array(value); 
                                                        for (let value of array) {
                                                            decoded[key].push(value);
                                                        }
                                                        break; 
                                                    }
                                                }
                                            } else {
                                                decoded[key] = value;
                                            }
                                        }
                                        dom.append(animations);
                                        let animationSet = Object.create(null);
                                        for (let animation of animations) {
                                            if (animation.id) {
                                                animationSet[animation.id] = true;
                                            }
                                        }
                                        if (animationSet["FightingAction1"]) {
                                            m3dObject[0].playM3DClip("FightingAction1", {
                                                "channel": "action",
                                                "priority": 1,
                                                "fading": 0,
                                                "loop": Infinity,
                                                "onAnimationEnded": () => {
                                                    frame[0].frame.trigAnimationStatesChanges();
                                                }
                                            });
                                        }
                                        let paused = id.split("-")[1] === "327";
                                        for (let id of [26, 27, 28, 29]) {
                                            let action = `FightingAction${id}`;
                                            let pausedFrame = paused ? 128 : 0;
                                            if (animationSet[action]) {
                                                m3dObject[0].playM3DClip(action, {
                                                    "channel": `state-${id - 25}`,
                                                    "priority": (3 + id - 26),
                                                    "fading": 0,
                                                    "paused": paused,
                                                    "frame": pausedFrame,
                                                    "loop": Infinity,
                                                    "onAnimationEnded": () => {
                                                        frame[0].frame.trigAnimationStatesChanges();
                                                    }
                                                });
                                            }
                                        }
                                    },
                                    "error": () => {
                                        console.error("Failed to get animations data");
                                    }
                                });
                            },
                            "error": () => {
                                console.error("Failed to list animations");
                            }
                        });
                    }

                },
                "error": () => {
                    if (binaryCallbacks) {
                        let callbacks = binaryCallbacks;
                        binaryCallbacks = null;
                        for (let key in callbacks) {
                            for (let callback of callbacks[key]) {
                                try {
                                    callback(new Error(`Resource[${prefix ? prefix + "/" : ""}${key}] not found`));
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                        }
                    }
                    console.error("Failed to load model data");
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

            let patches = Object.create(null);

            dom[0].m3dLoadPatch = function (id, callback) {

                if (patches[id]) {
                    if (patches[id] instanceof Array) {
                        patches[id].push(callback);
                    } else {
                        callback(patches[id].error, patches[id].module); 
                    }
                    return;
                }

                patches[id] = [];

                let path = `/~pkmsm/model/res/${result.id}/${prefix ? prefix + "/" : ""}${id}`;
                $.res.load(path, (error, result) => {
                    let callbacks = patches[id];
                    if (callbacks && (!(callbacks instanceof Array))) {
                        return;
                    }
                    if (error) {
                        patches[id] = { "error": error };
                    } else {
                        let module = undefined;
                        try {
                            let functor = eval([
                                "(({ Vector2, Vector3, Vector4, Quaternion, Matrix3, Matrix4 }, module) => {" + result,
                                `}) //# sourceURL=${path}`,
                                ""
                            ].join("\n"));
                            let sandbox = { "exports": {} };
                            functor(require("/scripts/three.js"), sandbox);
                            module = sandbox.exports;
                            patches[id] = { "module": module };
                        } catch (error) {
                            patches[id] = { "error": error };
                        }
                    }
                    if (callbacks) {
                        for (let callback of callbacks) {
                            try {
                                callback(patches[id].error, patches[id].module);
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }
                });

            };

            return dom;

        };

        let modelDOM = prepareDOM(result.html.model, "");
        let shadowDOM = prepareDOM(result.html.shadow, "shadow");

        m3dObject.append(shadowDOM);
        m3dObject.append(modelDOM);

        m3dObject[0].m3dGetBin = function (id, callback) {
            return modelDOM[0].m3dGetBin(id, callback);
        };

        let scene = frame[0].frame.filler.query("m3d-scene");

        scene.append(m3dObject);

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openAnimationList = function (id, from) {

    if (!from.animations) {
        console.error("Animations not available"); return;
    }

    let animations = Object.create(null);
    for (let animation of from.animations) {
        if (animation.localName && 
            (animation.localName.toLowerCase() === "m3d-clip")) {
            let id = $(animation).attr("id");
            let group = id.split("Action")[0];
            let duration = parseFloat($(animation).attr("duration"));
            if (!animations[group]) {
                animations[group] = [];
            }
            animations[group].push({
                "id": id,
                "group": group,
                "duration": duration,
                "tracks": $(animation).children("m3d-track").length
            });
        }
    }

    let size = {
        "width": $.dom.getDevicePixels(200),
        "height": $.dom.getDevicePixels(340)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Animations of “${filename}”`,
        "resizable": "yes",
        "wire-id": id + "/animation-list"
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/animation-list/animation-list", {
        "id": id,
        "groups": Object.keys(animations).sort().map((group) => ({
            "name": group,
            "animations": animations[group]
        }))
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openResourceList = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(200),
        "height": $.dom.getDevicePixels(340)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Resources of “${filename}”`,
        "resizable": "yes",
        "wire-id": id + "/resource-list"
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/resource-list/resource-list", {
        "id": id
    });

    $.ajax(`/~pkmsm/model/files/${id}`, {
        "success": function (result) {

            let files = result.split("\n").map((file) => file.trim()).filter((file) => file);

            let groups = Object.create(null);

            for (let file of files) {
                let group = file.split("/").slice(0, -1).join("/");
                let filename = file.split("/").slice(-1)[0];
                let basename = filename.split(".").slice(0, -1).join(".");
                let extname = filename.split(".").slice(-1)[0];
                if (extname) {
                    extname = "." + extname;
                }
                if (!groups[group]) {
                    groups[group] = [];
                } 
                groups[group].push({
                    "group": group,
                    "id": file,
                    "filename": filename,
                    "basename": basename,
                    "extname": extname
                });
            }

            frame[0].frame.filler.fill({
                "groups": Object.keys(groups).map((name) => ({
                    "name": name,
                    "files": groups[name].sort((a, b) => a.id.localeCompare(b.id))
                }))
            });

        },
        "error": function () {
            console.error("Failed list reource files");
        }
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openImage = function (id, from) {

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

    frame[0].loadUI("/~pkmsm/frames/image-viewer/image-viewer");

    frame[0].frame.filler.fill({
        "target": id
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openLUT = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(80)
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

    frame[0].loadUI("/~pkmsm/frames/lut-viewer/lut-viewer");

    frame[0].frame.filler.fill({
        "target": id
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openShader = function (id, from) {

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

    frame[0].loadUI("/~pkmsm/frames/shader-editor/shader-editor");

    $.ajax(`/~pkmsm/model/res/${id}`, {
        "dataType": "text",
        "success": (result) => {
            frame[0].frame.filler.fill({
                "code": result
            });
        },
        "error": () => {
            console.error("Failed to load shader codes");
        }
    })

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();
};

App.prototype.smartOpen = function (id, from) {

    let frames = this.filler.query("#diagram").children("ui-diagram-frame");
    for (let frame of frames) {
        if ($(frame).attr("wire-id") === id) {
            frame.bringToFirst();
            return;
        }
    }

    let extname = id.split(".").slice(-1)[0];
    switch (extname) {
        case "png": { 
            if (id.split("/")[1] === "luts") {
                this.openLUT(id, from); 
            } else {
                this.openImage(id, from); 
            }
            break; 
        }
        case "vert": { this.openShader(id, from); break; }
        case "frag": { this.openShader(id, from); break; }
        default: { 
            if (/^pokemon-([0-9]+)-([0-9]+)$/.test(id)) {
                this.openModel(id, from);
            } else {
                console.log(`Unknown target[${id}]`);
            }
            break; 
        }
    }

};

App.prototype.loadModel = function (id, callback) {

    $.ajax(`/~pkmsm/model/${id}`, {
        "success": (result) => {
            $.ajax(`/~pkmsm/model/res/${result.id}/normal-model.xml`, {
                "dataType": "text",
                "success": (html) => {
                    $.ajax(`/~pkmsm/model/res/${result.id}/shadow/model.xml`, {
                        "dataType": "text",
                        "success": (html2) => {
                            callback(null, Object.assign(result, {
                                "html": {
                                    "model": html,
                                    "shadow": html2
                                }
                            }));
                        },
                        "error": () => {
                            callback(new Error("Failed to get model"));
                        }
                    });
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

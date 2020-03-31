const THREE = require("/scripts/three.js");
const APNGEncoder = require("/scripts/apng.js");

const M3D = require("/scripts/m3d.js");

const LAYERS = 3;

const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    this.resizeObserver = new ResizeObserver((entries) => {

        let { width, height } = $(dom).css([ "width", "height" ]);

        width = Math.floor($.dom.getDevicePixels(parseFloat(width)));
        height = Math.floor($.dom.getDevicePixels(parseFloat(height)));

        this.toastMessage(`${width} × ${height}`);

        let originSize = $.local["pkmsm.model-viewer.size"];
        if ((!originSize) || 
            (originSize[0] !== width) || (originSize[1] !== height)) {
            $.local["pkmsm.model-viewer.size"] = [width, height];
        }

    });
    this.resizeObserver.observe(this.dom);

    this.animationListeners = [];

    let m3dScene = this.filler.query("m3d-scene");

    let backgroundRGBA = { "r": 1, "g": 1, "b": 1, "a": 1 };
    let backgroundColor = $.local["pkmsm.model-viewer.background-color"];
    if (backgroundColor) {
        let r = ("0" + backgroundColor.r.toString(16)).slice(-2);
        let g = ("0" + backgroundColor.g.toString(16)).slice(-2);
        let b = ("0" + backgroundColor.b.toString(16)).slice(-2);
        let a = ("0" + backgroundColor.a.toString(16)).slice(-2);
        backgroundRGBA = { 
            "r": backgroundColor.r / 255, 
            "g": backgroundColor.g / 255, 
            "b": backgroundColor.b / 255, 
            "a": backgroundColor.a / 255 
        };
        backgroundColor = `#${r}${g}${b}${a}`;
    } else {
        backgroundColor = "#ffffffff";
    }

    this.filler.fill({
        "backgroundColor": backgroundColor
    });

    $.res.load("/~pkmsm/shaders/toon.vert", (error, vertexShader) => {

        if (error) {
            console.error(error); return;
        }

        $.res.load("/~pkmsm/shaders/toon.frag", (error, fragmentShader) => {

            if (error) {
                console.error(error); return;
            }

            let size = m3dScene.css(["width", "height"]);

            size.width = Math.floor($.dom.getDevicePixels(parseFloat(size.width)));
            size.height = Math.floor($.dom.getDevicePixels(parseFloat(size.height)));
            if (size.width === 0) { size.width = 1; }
            if (size.height === 0) { size.height = 1; }

            let layerTargets = [];

            let looper = 0;
            while (looper < LAYERS + 2) {
                let layerTarget = new THREE.WebGLRenderTarget(size.width * 2, size.height * 2);
                layerTarget.texture.format = THREE.RGBAFormat;
                layerTarget.texture.minFilter = THREE.NearestFilter;
                layerTarget.texture.magFilter = THREE.NearestFilter;
                layerTarget.texture.generateMipmaps = false;
                layerTarget.stencilBuffer = true;
                layerTarget.depthBuffer = true;
                layerTargets.push(layerTarget);
                ++looper;
            }

            this.layerTargets = layerTargets;

            let finalScene = new THREE.Scene();
            let finalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            let finalMaterial = new THREE.ShaderMaterial({
                "vertexShader": vertexShader,
                "fragmentShader": fragmentShader,
                "uniforms": {
                    "cameraNear": { "value": finalCamera.near },
                    "cameraFar": { "value": finalCamera.far },
                    "ux": { "value": 1 / size.width / 2 },
                    "uy": { "value": 1 / size.height / 2 },
                    "layer": { "value": layerTargets[0].texture },
                    "layer2": { "value": layerTargets[1].texture },
                    "layer3": { "value": layerTargets[2].texture },
                    "layer4": { "value": layerTargets[3].texture },
                    "layer5": { "value": layerTargets[4].texture },
                    "backgroundColor": { "value": new THREE.Vector4(0, 0, 0, 1.0) },
                    "noOutline": { "value": false }
                }
            });
            let finalPlane = new THREE.PlaneBufferGeometry(2, 2);
            let finalMesh = new THREE.Mesh(finalPlane, finalMaterial);
            finalScene.add(finalMesh);

            let frame = this;

            m3dScene[0].m3dCustomRender = function (renderer, scene, camera) {

                if (!renderer.modelBackgroundColor) {
                    renderer.modelBackgroundColor = backgroundRGBA;
                }

                if (!renderer.drawPokemonOutlineLoaded) {
                    renderer.drawPokemonOutlineLoaded = true;
                    if ($.local["pkmsm.model-viewer.outline"] !== undefined) {
                        renderer.drawPokemonOutline = $.local["pkmsm.model-viewer.outline"];
                    } else {
                        renderer.drawPokemonOutline = true;
                    }
                }

                let looper = 0;
                while (looper < LAYERS + 2) {
                    switch (looper) {
                        case 0: { 
                            renderer.setClearColor(0x000000);
                            renderer.setClearAlpha(0);
                            renderer.renderingSemidepth2 = false;
                            renderer.renderingLayer = 0.5; 
                            break; 
                        }
                        case 1: { 
                            renderer.setClearColor(0x000000);
                            renderer.setClearAlpha(0);
                            renderer.renderingSemidepth2 = true;
                            renderer.renderingLayer = 0.5; 
                            break; 
                        }
                        case 2: { 
                            renderer.setClearColor(0x000000);
                            renderer.setClearAlpha(0);
                            renderer.renderingSemidepth2 = false;
                            renderer.renderingLayer = 1; 
                            break; 
                        }
                        default: { 
                            renderer.setClearColor(looper === LAYERS ? 0xffffff : 0x000000);
                            renderer.setClearAlpha(1);
                            renderer.renderingLayer = 0;
                            renderer.renderingSemidepth2 = false;
                            break; 
                        }
                    }
                    renderer.setRenderTarget(layerTargets[looper]);
                    renderer.clear();
                    renderer.render(scene, camera);
                    ++looper;
                }

                let size = m3dScene.css(["width", "height"]);

                size.width = Math.floor($.dom.getDevicePixels(parseFloat(size.width)));
                size.height = Math.floor($.dom.getDevicePixels(parseFloat(size.height)));

                finalMaterial.uniforms.cameraNear.value = finalCamera.near;
                finalMaterial.uniforms.cameraFar.value = finalCamera.far;
                finalMaterial.uniforms.ux.value = 1 / size.width / 2;
                finalMaterial.uniforms.uy.value = 1 / size.height / 2;
                finalMaterial.uniforms.noOutline.value = renderer.drawPokemonOutline === false;
                finalMaterial.uniforms.backgroundColor.value.set(
                    renderer.modelBackgroundColor.r,
                    renderer.modelBackgroundColor.g,
                    renderer.modelBackgroundColor.b,
                    renderer.modelBackgroundColor.a);

                renderer.setRenderTarget(null);
                renderer.clear();
                renderer.render(finalScene, finalCamera);

            };

        });
    });

};

Frame.prototype.onClose = function () {
    this.resizeObserver.disconnect();
};

Frame.prototype.getTargetIDs = function () {

    let id = $(this.dom).attr("wire-id");

    let scene = this.filler.query("m3d-scene");
    let ids = {
        [`${id}/resource-list`]: [scene],
        [`${id}/animation-list`]: [scene],
        [`${id}/animation-controller`]: [scene],
        [`${id}/inspector`]: [scene],
    };

    return ids;

};

Frame.prototype.clearAnimations = function () {

    this.filler.query("#pokemon-model")[0].clearPlayingM3DClips();

    delete this.playingAnimationSeries;
    delete this.playVersion;

    this.playPausedAnimations();

};

Frame.prototype.updateAnimation = function () {

    this.filler.query("#pokemon-model")[0].updatePlayingM3DClipStates();

};

Frame.prototype.playAnimation = function (animationID, options) {

    this.filler.query("#pokemon-model")[0].playM3DClip(animationID, Object.assign({}, options, {
        "onAnimationStarted": () => {
            this.trigAnimationStatesChanges();
            if (options.onAnimationStarted) {
                options.onAnimationStarted();
            }
        },
        "onAnimationEnded": () => {
            this.trigAnimationStatesChanges();
            if (options.onAnimationEnded) {
                options.onAnimationEnded();
            }
        }
    }));

    for (let listener of this.animationListeners) {
        try {
            listener(animationID);
        } catch (error) {
            console.error(error);
        }
    }

};

Frame.prototype.playAnimationSeries = function (series, options) {

    let playVersion = $.uuid();
    this.playVersion = playVersion;

    this.playingAnimationSeries = {
        "clips": series.slice(0),
        "options": Object.assign({}, options)
    };

    let play = (index, frame) => {

        if (!frame) {
            frame = 0;
        }

        let newOptions = Object.assign({}, options, {
            "loop": null,
            "frame": frame,
            "onAnimationEnded": () => {
                if (playVersion !== this.playVersion) {
                    return;
                }
                play(index + 1);
            }
        });

        switch (options.loop) {
            case true: 
            case "repeat": { 
                if (index === series.length) {
                    index = 0;
                }
                break; 
            }
            case "last": { 
                if (index === series.length) {
                    --index;
                }
                break; 
            }
            case false: 
            case "no": { 
                if (index === series.length) {
                    if (options.onAnimationEnded) {
                        options.onAnimationEnded();
                    }
                    return;
                }
                break; 
            }
        }

        this.playAnimation(series[index], newOptions);

    };

    let allDuration = 0;
    let animations = Object.create(null);
    for (let clip of series) {
        let duration = parseFloat(this.filler.query(`m3d-clip#${clip}`).attr("duration"));
        animations[clip] = Math.round(duration * 24) / 24;
        allDuration += animations[clip];
    }

    this.playingAnimationSeries.duration = allDuration; 

    let lastClip = 0;
    let frame = 0;
    if (options.time) {
        let clipTime = 0;
        while ((lastClip < series.length) &&
               (clipTime + animations[series[lastClip]] <= options.time)) {
            clipTime += animations[series[lastClip]];
            ++lastClip;
        }
        let fps = 24;
        frame = Math.round((options.time - clipTime) * fps);
    }

    play(lastClip, frame);

};

Frame.prototype.pauseAnimations = function () {

    this.filler.query("#pokemon-model")[0].pauseM3DClips();

};

Frame.prototype.playPausedAnimations = function () {

    this.filler.query("#pokemon-model")[0].playPausedM3DClips();

};

Frame.prototype.getPlayingAnimationSeries = function () {

    return this.playingAnimationSeries;

};

Frame.prototype.getPlayingAnimations = function () {

    return this.filler.query("#pokemon-model")[0].getPlayingM3DClips();

};

Frame.prototype.trigAnimationStatesChanges = function () {

    let id = $(this.dom).attr("wire-id");

    let frames = $(this.dom).parent().children("ui-diagram-frame").filter((index, dom) => {
        let wireID = $(dom).attr("wire-id");
        return wireID.split("/")[0] === id;
    });

    let animations = this.getPlayingAnimations();

    for (let frame of frames) {
        if (frame.frame.updatePlayingAnimations) {
            frame.frame.updatePlayingAnimations(animations);
        }
    }

};

Frame.prototype.addAnimationListener = function (listener) {

    this.animationListeners.push(listener);

};

Frame.prototype.removeAnimationListener = function (listener) {

    let index = this.animationListeners.indexOf(listener);
    if (index !== -1) {
        this.animationListeners.splice(index, 1);
    }

};

Frame.prototype.toastMessage = function (message, duration) {

    if (!message) { return; }

    if (!duration) { duration = 1000; }

    if (this.toastJob) {
        this.toastJob.cancel();
    }

    this.filler.fill({
        "toast": message,
        "toastVisible": true
    });

    let version = $.uuid();
    this.toastVersion = version;

    let toastJob = null;
    let controller = {
        "cancel": () => {
            if (this.toastVersion !== version) {
                return;
            }
            this.toastVersion = $.uuid();
            this.filler.fill({
                "toastVisible": false
            });
            if (this.toastJob === toastJob) {
                delete this.toastJob;
            }
        }
    };

    if (isFinite(duration)) {
        toastJob = $.delay(duration, () => {
            controller.cancel();
        });
        this.toastJob = toastJob;
    }

    return controller;

};

Frame.prototype.savePNGSnapshot = function () {

    let m3dScene = this.filler.query("m3d-scene")[0];

    let dataURL = m3dScene.snapshotAsDataURL();

    let width = parseInt($(m3dScene).css("width"));
    let height = parseInt($(m3dScene).css("height"));

    let a = $("<a>").attr({
        "href": dataURL,
        "download": `${this.filler.parameters.id}.png`,
    }).css({
        "display": "none"
    });

    $("body").append(a);

    a[0].click();

    a.detach();

};

Frame.prototype.saveSTLFile = function (tessellation, asTextFile) {

    let model = this.filler.query("m3d-object#pokemon-model").children().filter("m3d-object").filter((index, element) => {
        return $(element).attr("base").split("/").slice(-1)[0] !== "shadow";
    })[0];

    let triangles = [];

    let threeModel = model.m3dObject;
    for (let mesh of threeModel.children.filter((child) => child.isMesh)) {

        let skeleton = mesh.skeleton;
        let bones = mesh.m3dExtra ? mesh.m3dExtra.bones : undefined;

        // TODO: ignore more materials
        if (mesh.visible && mesh.material.visible) {

            let matrixWorld = mesh.matrixWorld;

            let indices = mesh.geometry.index;
            let positions = mesh.geometry.attributes.position;
            let skinIndices = mesh.geometry.attributes.skinIndex;
            let skinWeights = mesh.geometry.attributes.skinWeight;

            const getData = (source, looper, itemSize) => {
                if (!source) { return null; }
                if ((itemSize === 3) || (source.itemSize < 4)) {
                    return [source.array[indices.array[looper] * source.itemSize],
                            source.array[indices.array[looper] * source.itemSize + 1],
                            source.array[indices.array[looper] * source.itemSize + 2]];
                } else {
                    return [source.array[indices.array[looper] * source.itemSize],
                            source.array[indices.array[looper] * source.itemSize + 1],
                            source.array[indices.array[looper] * source.itemSize + 2],
                            source.array[indices.array[looper] * source.itemSize + 3]];
                }
            };

            const getPoint = (looper) => {
                let position = getData(positions, looper, 3);
                let skinIndex = getData(skinIndices, looper, 4);
                let skinWeight = getData(skinWeights, looper, 4);
                const merge = (matrixWorld, data, extra) => {
                    let vector = new THREE.Vector4(data[0], data[1], data[2], extra);
                    vector.applyMatrix4(matrixWorld);
                    return [vector.x, vector.y, vector.z];
                };
                if (skeleton && bones && skinIndex && skinWeights) {
                    let matrix = new THREE.Matrix4();
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[0]] * 16);
                    let position1 = merge(matrix, position, 1);
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[1]] * 16);
                    let position2 = merge(matrix, position, 1);
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[2]] * 16);
                    let position3 = merge(matrix, position, 1);
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[3]] * 16);
                    let position4 = merge(matrix, position, 1);
                    let positions = [position1, position2, position3, position4];
                    let newPosition = [0, 0, 0];
                    for (let looper = 0; looper < 4; ++looper) {
                        if (skinWeight[looper] && isFinite(skinWeight[looper])) {
                            newPosition[0] += positions[looper][0] * skinWeight[looper] / 255;
                            newPosition[1] += positions[looper][1] * skinWeight[looper] / 255;
                            newPosition[2] += positions[looper][2] * skinWeight[looper] / 255;
                        }
                    }
                    position = newPosition;
                } else {
                    position = merge(matrixWorld, position);
                }
                return { "vertex": position };
            };

            for (let looper = 0; looper < indices.count; looper += 3) {
                let points = [getPoint(looper), getPoint(looper + 1), getPoint(looper + 2)];
                if ((mesh.material.side === THREE.FrontSide) || (mesh.material.side === THREE.DoubleSide)) {
                    triangles.push(points);
                }
                if ((mesh.material.side === THREE.BackSide) || (mesh.material.side === THREE.DoubleSide)) {
                    triangles.push([points[2], points[1], points[0]]);
                }
            }

        }

    }

    let record = M3D.abstractModel(M3D.convertTrianglesFromTessell(triangles));
    record = M3D.reduceBothSides(record);
    let groups = M3D.groupTriangles(record);
    groups = groups.map((group) => {
        return M3D.autocloseGroup(group);
    });

    let patcheds = [];
    for (let group of groups) {
        for (let triangle of M3D.convertTrianglesForTessell(group.triangles.concat(group.encloses))) {
            patcheds.push(triangle);
        }
    }

    let max = Math.max(record.bounds.maxes[0] - record.bounds.mins[0], 
                       record.bounds.maxes[1] - record.bounds.mins[1], 
                       record.bounds.maxes[2] - record.bounds.mins[2]);

    let name = $(model).attr("name").replace(/[^0-9a-z_]/ig, "_");

    let code = undefined;

    if (!asTextFile) {

        let arrayBuffer = new ArrayBuffer(80 + 4 + (4 * 4 * 3 + 2) * patcheds.length);
        let dataView = new DataView(arrayBuffer);
        Array.prototype.forEach.call(`binsolid ${name}`, (char, index) => {
            dataView.setUint8(index, char.codePointAt(0));
        });
        dataView.setUint32(80, patcheds.length, true);

        let index = 84;
        for (let triangle of patcheds) {
            let normal = M3D.getTriangleNormal(
                triangle[0].vertex, triangle[1].vertex, triangle[2].vertex);
            dataView.setFloat32(index, normal[0], true); index += 4;
            dataView.setFloat32(index, normal[1], true); index += 4;
            dataView.setFloat32(index, normal[2], true); index += 4;
            for (let looper = 0; looper < 3; ++looper) {
                dataView.setFloat32(index, triangle[looper].vertex[0], true); index += 4;
                dataView.setFloat32(index, triangle[looper].vertex[1], true); index += 4;
                dataView.setFloat32(index, triangle[looper].vertex[2], true); index += 4;
            }
            let flag = 0;
            if (triangle[3]) {
                flag = flag | 1;
            }
            dataView.setUint16(index, flag, true); index += 2;
        }

        code = $.base64.encode(arrayBuffer);

    } else {

        let lines = [];

        lines.push(`solid ${name}`);
        for (let triangle of patcheds) {
            let normal = M3D.getTriangleNormal(
                triangle[0].vertex, triangle[1].vertex, triangle[2].vertex);
            lines.push(`    facet normal ${normal[0]} ${normal[1]} ${normal[2]}`);
            lines.push("        outer loop");
            for (let looper = 0; looper < 3; ++looper) {
                lines.push(`             vertex ${triangle[looper].vertex.join(" ")}`);
            }
            lines.push("        endloop");
            lines.push("    endfacet");
        }
        lines.push(`endsolid ${name}`);

        code = btoa(lines.join("\n"));

    }

    let a = $("<a>").attr({
        "href": `data:application/octet-stream;base64,${code}`,
        "download": `${name}.stl`,
    }).css({
        "display": "none"
    });

    $("body").append(a);

    a[0].click();

    a.detach();

};

Frame.prototype.saveAPNGFile = function () {

    let toast = this.toastMessage("Recording...", Infinity);

    let m3dScene = this.filler.query("m3d-scene")[0];

    let canvas = m3dScene.filler.query("canvas")[0];

    let series = this.getPlayingAnimationSeries();
    let playings = this.getPlayingAnimations();

    let action = this.filler.query("#pokemon-model")[0].getM3DClip("FightingAction1");

    let frames = Math.round(action.duration * action.fps);

    let encoder = new APNGEncoder(canvas);
    encoder.start();

    let recordFrame = (frame) => {

        this.clearAnimations();
        this.playPausedAnimations();

        if (frame > frames) {

            toast.cancel();

            encoder.finish();

            let stream = encoder.stream();

            let dataURL = "data:image/png;base64," + stream.toStrBase64();

            let a = $("<a>").attr({
                "href": dataURL,
                "download": `${this.filler.parameters.id}.apng`,
            }).css({
                "display": "none"
            });

            $("body").append(a);

            a[0].click();

            a.detach();

            for (let playing of playings) {
                if (playing.channel !== "action") {
                    let frame = Math.round(playing.frame / playing.resample);
                    this.playAnimation(playing.name, {
                        "channel": playing.channel,
                        "priority": playing.priority,
                        "fading": 0,
                        "paused": playing.paused,
                        "frame": frame,
                        "loop": Infinity
                    });
                }
            }

            this.playAnimationSeries(series.clips, {
                "channel": series.options.channel,
                "priority": series.options.priority,
                "fading": 0,
                "loop": "last"
            });

            return;
        }

        for (let playing of playings) {
            if (playing.channel !== "action") {
                let finalFrame = Math.round(((frame / action.fps) % playing.duration) * action.fps);
                if ((playing.channel.split("-")[0] === "state") && 
                    ($(this.dom).attr("wire-id").split("-")[1] === "327")) {
                    finalFrame = 128;
                }
                this.playAnimation(playing.name, {
                    "channel": playing.channel,
                    "priority": playing.priority,
                    "fading": 0,
                    "paused": true,
                    "frame": finalFrame,
                    "loop": Infinity
                });
            }
        }

        this.playAnimation("FightingAction1", {
            "channel": series.options.channel,
            "priority": series.options.priority,
            "fading": 0,
            "paused": true,
            "frame": frame === frames ? 0 : frame,
            "loop": false,
        });
        this.updateAnimation();

        $.delay(1000 / action.fps, () => {
            encoder.setDelay(100 / action.fps);
            encoder.setDispose(1);
            encoder.setBlend(0);
            encoder.addFrame();
            recordFrame(frame + 1);
        });

    };

    recordFrame(0);

};

Frame.prototype.saveM3DFile = function () {

    window.open(`/~pkmsm/model/save/${this.filler.parameters.id}`);

};

Frame.prototype.saveWebMVideo = function (poseTimes) {

    let toast = this.toastMessage("Recording...", Infinity);

    let m3dScene = this.filler.query("m3d-scene")[0]; 
    m3dScene.recordVideo((start, end) => {

        let series = this.getPlayingAnimationSeries();
        let playings = this.getPlayingAnimations();

        this.clearAnimations();
        this.playPausedAnimations();

        for (let playing of playings) {
            if (playing.channel !== "action") {
                let paused = false;
                let frame = 0;
                if ((playing.channel.split("-")[0] === "state") && 
                    ($(this.dom).attr("wire-id").split("-")[1] === "327")) {
                    paused = true;
                    frame = 128;
                }
                this.playAnimation(playing.name, {
                    "channel": playing.channel,
                    "priority": playing.priority,
                    "fading": 0,
                    "paused": paused,
                    "frame": frame,
                    "loop": Infinity
                });
            }
        }

        let originClips = series.clips.slice(0);

        let clips = series.clips.slice(0);
        if (clips.length > 1) {
            clips = clips.slice(0, -1);
        }

        this.playAnimation(clips[0], {
            "channel": series.options.channel,
            "priority": series.options.priority,
            "fading": 0,
            "loop": false,
            "paused": true
        });
        this.updateAnimation();

        let restPoseTimes = poseTimes;

        for (let looper = 0; looper < poseTimes; ++looper) {
            clips.push(originClips[originClips.length - 1]);
        }

        start(() => {
            this.playAnimationSeries(clips, {
                "channel": series.options.channel,
                "priority": series.options.priority,
                "fading": 0,
                "loop": "no",
                "onAnimationEnded": () => {

                    let lastClip = clips[clips.length - 1];

                    let duration = parseFloat(this.filler.query(`m3d-clip#${lastClip}`).attr("duration"));
                    let frame = Math.round(duration * 24) - 1;

                    this.playAnimation(clips[clips.length - 1], {
                        "channel": series.options.channel,
                        "priority": series.options.priority,
                        "fading": 0,
                        "loop": false,
                        "frame": frame,
                        "paused": true
                    });
                    this.updateAnimation();

                    // 24fps, delay one frame to complete animation

                    $.delay(1000 / 24, () => {
                        end((error, blob) => {
                            toast.cancel();
                            let url = URL.createObjectURL(blob);
                            let a = $("<a>").attr({
                                "href": url,
                                "download": `${this.filler.parameters.id}.webm`,
                            }).css({
                                "display": "none"
                            });
                            $("body").append(a);
                            a[0].click();
                            a.detach();
                            URL.revokeObjectURL(url);
                            this.playAnimationSeries(originClips, {
                                "channel": series.options.channel,
                                "priority": series.options.priority,
                                "fading": 0,
                                "loop": "last"
                            });
                        });
                    });

                }
            });
        });

    });

};

Frame.functors = {

    "saveM3DFile": function () {
        this.saveM3DFile();
    },

    "saveWebMVideo": function (poseTimes) {
        this.saveWebMVideo(poseTimes);        
    },

    "savePNGSnapshot": function () {
        this.savePNGSnapshot();
    },
    "saveAPNGFile": function () {
        this.saveAPNGFile();
    },

    "saveSTLFile": function (tessellation) {
        this.saveSTLFile(tessellation);
    },

    "listResources": function () {
        $.app(this.dom).openResourceList(this.filler.parameters.id, this);
    },

    "listAnimations": function () {
        $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
    },

    "inspectModel": function () {
        $.app(this.dom).inspectModel(this.filler.parameters.id, this);
    },

    "showAnimationController": function () {
        $.app(this.dom).openAnimationController(this.filler.parameters.id, this);
    },

    "resizeRenderingTarget": function (event) {
        if (this.layerTargets) {
            for (let layer of this.layerTargets) {
                layer.setSize($.dom.getDevicePixels(event.width * 2), 
                              $.dom.getDevicePixels(event.height * 2));
            }
        }
    },

    "showShinyModel": function () {
        $.app(this.dom).smartOpen(this.filler.parameters.id + "-shiny", this);
    },
    "showNormalModel": function () {
        $.app(this.dom).smartOpen(this.filler.parameters.id.split("-").slice(0, -1).join("-"), this);
    }

};

module.exports.Frame = Frame;

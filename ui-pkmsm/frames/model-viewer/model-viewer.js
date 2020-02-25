const THREE = require("/scripts/three.js");

const LAYERS = 3;

const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

    this.animationListeners = [];

    let m3dScene = this.filler.query("m3d-scene");

    $.res.load("/~pkmsm/shaders/toon.vert", (error, vertexShader) => {

        if (error) {
            console.error(error); return;
        }

        $.res.load("/~pkmsm/shaders/toon.frag", (error, fragmentShader) => {

            if (error) {
                console.error(error); return;
            }

            let size = m3dScene.css(["width", "height"]);

            size.width = parseInt(size.width);
            size.height = parseInt(size.height);

            let layerTargets = [];

            let looper = 0;
            while (looper < LAYERS + 1) {
                let layerTarget = new THREE.WebGLRenderTarget(size.width * 2, size.height * 2);
                layerTarget.texture.format = THREE.RGBAFormat;
                layerTarget.texture.minFilter = THREE.LinearFilter;
                layerTarget.texture.magFilter = THREE.LinearFilter;
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
                }
            });
            let finalPlane = new THREE.PlaneBufferGeometry(2, 2);
            let finalMesh = new THREE.Mesh(finalPlane, finalMaterial);
            finalScene.add(finalMesh);

            m3dScene[0].m3dCustomRender = function (renderer, scene, camera) {

                let looper = 0;
                while (looper < LAYERS + 1) {
                    switch (looper) {
                        case 0: { 
                            renderer.renderingSemidepth2 = false;
                            renderer.renderingLayer = 0.5; 
                            break; 
                        }
                        case 1: { 
                            renderer.renderingSemidepth2 = true;
                            renderer.renderingLayer = 0.5; 
                            break; 
                        }
                        case 2: { 
                            renderer.renderingSemidepth2 = false;
                            renderer.renderingLayer = 1; 
                            break; 
                        }
                        default: { 
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

                finalMaterial.uniforms.cameraNear.value = finalCamera.near;
                finalMaterial.uniforms.cameraFar.value = finalCamera.far;
                finalMaterial.uniforms.ux.value = 1 / parseInt(size.width);
                finalMaterial.uniforms.uy.value = 1 / parseInt(size.height);

                renderer.setRenderTarget(null);
                renderer.clear();
                renderer.render(finalScene, finalCamera);

            };

        });
    });

};

Frame.prototype.getTargetIDs = function () {

    let id = $(this.dom).attr("wire-id");

    let scene = this.filler.query("m3d-scene");
    let ids = {
        [`${id}/resource-list`]: [scene],
        [`${id}/animation-list`]: [scene],
        [`${id}/animation-controller`]: [scene],
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

    let animations = Object.create(null);
    for (let clip of series) {
        let duration = parseFloat(this.filler.query(`m3d-clip#${clip}`).attr("duration"));
        animations[clip] = Math.round(duration * 24) / 24;
    }

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

Frame.functors = {

    "saveM3DFile": function () {
        window.open(`/~pkmsm/model/save/${this.filler.parameters.id}`);
    },

    "savePNGSnapshot": function () {

        let m3dScene = this.filler.query("m3d-scene")[0];

        let dataURL = m3dScene.snapshotAsDataURL();

        let width = parseInt($(m3dScene).css("width"));
        let height = parseInt($(m3dScene).css("height"));

        let canvas = $("<canvas>").attr({
            "width": width,
            "height": height,
        })[0];

        let context = canvas.getContext("2d");
        let image = new Image();
        image.onload = () => {
            context.drawImage(image, 0, 0, 2 * width, 2 * height, 0, 0, width, height);
            $.ajax(`/~pkmsm/model/export/${this.filler.parameters.id}.png`, {
                "data": canvas.toDataURL().split(",").slice(1).join(","),
                "contentType": "text/base64",
                "method": "POST",
                "success": (result) => {
                    window.open(result, "__blank");
                },
                "error": () => {
                    console.error("Failed to save snapshot image");
                }
            });
        };
        image.onerror = (error) => {
            console.error(error);
        };
        image.src = dataURL;

    },

    "listResources": function () {
        $.app(this.dom).openResourceList(this.filler.parameters.id, this);
    },

    "listAnimations": function () {
        $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
    },

    "showAnimationController": function () {
        $.app(this.dom).openAnimationController(this.filler.parameters.id, this);
    },

    "resizeRenderingTarget": function (event) {
        if (this.layerTargets) {
            for (let layer of this.layerTargets) {
                layer.setSize(event.width * 2, event.height * 2);
            }
        }
    }

};

module.exports.Frame = Frame;

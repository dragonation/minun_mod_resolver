const THREE = require("/scripts/three.js");

const LAYERS = 2;

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

            layerTargets = [];

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
                }
            });
            let finalPlane = new THREE.PlaneBufferGeometry(2, 2);
            let finalMesh = new THREE.Mesh(finalPlane, finalMaterial);
            finalScene.add(finalMesh);

            m3dScene[0].m3dCustomRender = function (renderer, scene, camera) {

                let finalTarget = renderer.getRenderTarget();

                let looper = 0;
                while (looper < LAYERS + 1) {
                    renderer.renderingLayer = 0;
                    if (looper < LAYERS) {
                        renderer.renderingLayer = 0.5 + looper / 2;
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

                renderer.setRenderTarget(finalTarget);
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
    };

    return ids;

};

Frame.prototype.playAnimation = function (animationID, options) {

    this.playingAnimation = animationID;

    this.filler.query("#pokemon-model")[0].playM3DClip(animationID, options);

    for (let listener of this.animationListeners) {
        try {
            listener(animationID);
        } catch (error) {
            console.error(error);
        }
    }

};

Frame.prototype.getPlayingAnimation = function () {

    return this.playingAnimation;

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

    "listResources": function () {
        $.app(this.dom).openResourceList(this.filler.parameters.id, this);
    },

    "listAnimations": function () {
        $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
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

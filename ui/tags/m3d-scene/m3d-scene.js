const THREE = require("../../scripts/three.js");

const prepareScene = function (dom) {

    if (dom.m3dRenderer) { return; }

    let { width, height } = $(dom).css(["width", "height"]);
    width = Math.round(parseFloat(width));
    if (width <= 0) { width = 1; }
    height = Math.round(parseFloat(height));
    if (height <= 0) { height = 1; }

    syncCamera(dom, $(dom).attr("camera"));

    let clock = new THREE.Clock();

    let canvas = $("<canvas>")[0];
    let context = canvas.getContext("webgl2", { 
        "antialias": $(dom).attr("antialias") !== "no",
        "alpha": true,
        "depth": true, "stencil": true,
        "preserveDrawingBuffer": true,
    });

    let renderer = new THREE.WebGLRenderer({
        "canvas": canvas,
        "context": context,
        // "antialias": $(dom).attr("antialias") !== "no",
        // "alpha": true,
        // "preserveDrawingBuffer": true,
        // "premultipliedAlpha": true,
    });
    let pixelRatio = $(dom).attr("pixel-ratio");
    if (pixelRatio) {
        pixelRatio = parseFloat(pixelRatio);
        if (isFinite(pixelRatio) && (pixelRatio > 0)) {
            renderer.setPixelRatio(pixelRatio);
        } else {
            renderer.setPixelRatio(1);
        }
    } else {
        renderer.setPixelRatio(1);
    }
    renderer.setSize(width, height);
    renderer.gammaInput = true;
    renderer.gammaOutput = true;

    const scene = new THREE.Scene();

    THREE.patchSceneAnimation(scene);

    dom.m3dClock = clock;
    dom.m3dRenderer = renderer;
    dom.m3dScene = scene;

    syncAutosort(dom, $(dom).attr("autosort"));

    syncAutoclear(dom, $(dom).attr("autoclear"));
    syncClearColor(dom, $(dom).attr("clear-color"));

    syncControls(dom, dom.getAttribute("controls"));

    syncGrids(dom, $(dom).attr("grids"));
    syncStats(dom, $(dom).attr("stats"));

    syncAutolights(dom, $(dom).attr("autolights"));

    syncChildren(dom);

    if (dom.m3dMaterialListeners) {
        for (let name in dom.m3dMaterialListeners) {
            for (let listener of dom.m3dMaterialListeners[name]) {
                try {
                    listener();
                } catch (error) {
                    console.error(error);
                }
            }
        }
    }

    dom.filler.query("#container").append($(renderer.domElement));

};

const disposeScene = function (dom) {

    stopSceneRendering(dom);

    for (let key in dom) {
        if (key.slice(0, 3) === "m3d") {
            if (dom[key] && (typeof dom[key].dispose === "function")) {
                dom[key].dispose();
            }
            delete dom[key];
        }
    }

};

const startSceneRendering = function (dom) {

    if (!dom.m3dRenderer) { return; }

    if (dom.m3dRendering) { return; }

    if (!dom.m3dNextRendering) { dom.m3dNextRendering = 1; }
    dom.m3dRendering = dom.m3dNextRendering;
    ++dom.m3dNextRendering;

    let record = dom.m3dRendering;

    let worldDirection = new THREE.Vector3();

    let animate = function () {
        if (dom.m3dRendering === record) {
            requestAnimationFrame(animate);
            let delta = dom.m3dClock.getDelta();
            if (dom.m3dMixers) {
                for (let mixer of dom.m3dMixers) {
                    mixer.update(delta);
                }
            }
            if (dom.m3dScene && dom.m3dScene.patchedAnimationTicker) {
                dom.m3dScene.patchedAnimationTicker(delta);
            }
            if (dom.m3dStats) {
                dom.m3dStats.update();
            }
            if (dom.m3dAutolights &&
                dom.m3dAutocameraLights) {
                dom.m3dCamera.getWorldDirection(worldDirection);
                let light = dom.m3dAutolights.filter((light) => light.isDirectionalLight)[0];
                light.position.set(-worldDirection.x, -worldDirection.y, -worldDirection.z);
                light.matrixWorldNeedsUpdate = true;
            }

            if (dom.m3dCustomRender) {
                dom.m3dCustomRender(dom.m3dRenderer, dom.m3dScene, dom.m3dCamera);
            } else {
                dom.m3dRenderer.render(dom.m3dScene, dom.m3dCamera);
            }
        }
    };

    animate();

};

const stopSceneRendering = function (dom) {

    dom.m3dRendering = 0;

    if (!dom.m3dNextRendering) { dom.m3dNextRendering = 1; }

    ++dom.m3dNextRendering;

};

const syncCamera = function (dom, value) {

    let changed = false;
    let camera = dom.m3dCamera;
    let { width, height } = $(dom).css(["width", "height"]);
    width = parseInt(width);
    if ((width <= 0) || (!isFinite(width))) { width = 1; }
    height = parseInt(height);
    if ((height <= 0) || (!isFinite(height))) { height = 1; }
    switch (value) {
        case "orthographic": {
            if ((!camera) || (!camera.isOrthographicCamera)) {
                changed = true;
                camera = new THREE.OrthographicCamera(-width / 2, width / 2, -height / 2, height / 2, 10, 2000);
            }
            break;
        }
        case "perspective": 
        default: {
            if ((!camera) || (!camera.isPerspectiveCamera)) {
                changed = true;
                camera = new THREE.PerspectiveCamera(50, width / height, 10, 2000);
            }
            break;
        }
    }

    if (changed) {

        dom.m3dCamera = camera;

        syncCameraPosition(dom, $(dom).attr("camera-position"));
        syncCameraDirection(dom, $(dom).attr("camera-direction"));
        syncCameraNear(dom, $(dom).attr("camera-near"));
        syncCameraFar(dom, $(dom).attr("camera-far"));

        if (dom.m3dControls) {
            dom.m3dControls.object = camera;
        }

    }

};

const syncCameraPosition = function (dom, value) {

    if (!dom.m3dCamera) {
        return;
    }

    if (!value) {
        value = "50, 50, 100";
    }

    value = value.trim().split(/[\s,]+/).map(value => parseFloat(value));

    dom.m3dCamera.position.set(value[0], value[1], value[2]);

};

const syncCameraDirection = function (dom, value) {

    if (!dom.m3dCamera) {
        return;
    }

    if (!value) {
        return;
    }
    
    value = value.trim().split(/[\s,]+/).map(value => parseFloat(value));

    dom.m3dCamera.lookAt(dom.m3dCamera.position.x + value[0], 
                         dom.m3dCamera.position.y + value[1], 
                         dom.m3dCamera.position.z + value[2]);

};

const syncCameraNear = function (dom, value) {

    if (!dom.m3dCamera) {
        return;
    }

    if (!value) {
        return;
    }
    
    value = parseFloat(value.trim());
    if (isFinite(value)) {
        dom.m3dCamera.near = value;
    }

};

const syncCameraFar = function (dom, value) {

    if (!dom.m3dCamera) {
        return;
    }

    if (!value) {
        return;
    }
    
    value = parseFloat(value.trim());
    if (isFinite(value)) {
        dom.m3dCamera.far = value;
    }

};

const syncControls = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    if (dom.m3dControls && (dom.m3dControls.m3dValue !== value)) {
        dom.m3dControls.dispose();
        delete dom.m3dControls;
    }

    if (value === "orbit") {
        if (!dom.m3dControls) {
            const orbitControls = new THREE.OrbitControls(dom.m3dCamera, dom.m3dRenderer.domElement);
            orbitControls.target.set(0, 30, 0);
            orbitControls.enablePan = false;
            orbitControls.maxDistance = 600;
            orbitControls.minDistance = 30;
            orbitControls.update();
            orbitControls.m3dValue = value;
            dom.m3dControls = orbitControls;
            syncOrbitTarget(dom, $(dom).attr("orbit-target"));
        }
    } else {
        if (dom.m3dControls) {
            dom.m3dControls.dispose();
            delete dom.m3dOrbitControls;
        }
    }

};

const syncOrbitTarget = function (dom, value) {

    if ((!dom.m3dControls) || (dom.m3dControls.m3dValue !== "orbit")) {
        return;
    }

    if (!value) {
        return;
    }

    let values = value.trim().split(/[\s,]+/).map((x) => parseFloat(x));

    dom.m3dControls.target.set(values[0], values[1], values[2]);

};

const syncGrids = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    if (value === "yes") {
        if (!dom.m3dGridHelper) {
            const gridHelper = new THREE.GridHelper(100, 10, 0x888888, 0x888888);
            gridHelper.position.set(0, - 0.04, 0);
            dom.m3dScene.add(gridHelper);
            dom.m3dGridHelper = gridHelper;
        }
    } else {
        if (dom.m3dGridHelper) {
            dom.m3dScene.remove(dom.m3dGridHelper);
            dom.m3dGridHelper.dispose();
            delete dom.m3dGridHelper;
        }
    }

};

const syncStats = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    if (value === "yes") {
        if (!dom.m3dStats) {
            stats = new THREE.Stats();
            dom.append($(stats.dom));
            dom.m3dStats = stats;
        }
    } else {
        if (dom.m3dStats) {
            $(dom.m3dStats.dom).detach();
            delete dom.m3dStats;
        }
    }

};

const syncAutolights = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    if (value === "yes") {
        if (!dom.m3dAutolights) {
            let ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            ambientLight.position.set(0, 0, 0);
            dom.m3dScene.add(ambientLight);
            let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
            directionalLight.position.set(-0.7, 1, 1);
            dom.m3dScene.add(directionalLight);
            dom.m3dAutolights = [ambientLight, directionalLight];
        }
    } else {
        if (dom.m3dAutolights) {
            for (let light of dom.m3dAutolights) {
                dom.m3dScene.remove(light);
                light.dispose();
            }
            delete dom.m3dAutolights;
        }
    }

};

const syncAutocameraLights = function (dom, value) {

    dom.m3dAutocameraLights = (value !== "no");

};

const syncClearColor = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    let clearColor = value;
    let clearAlpha = 1;
    if (clearColor && (clearColor[0] === "#")) {
        clearColor = parseInt(clearColor.slice(1, 7), 16);
        if (value.length > 7) {
            clearAlpha = parseInt(value.slice(7, 9), 16) / 255;
        }
    } else {
        clearColor = NaN;
    }
    if (!isFinite(clearColor)) {
        clearColor = 0xeeeeee;
    }

    dom.m3dRenderer.setClearColor(clearColor);
    dom.m3dRenderer.setClearAlpha(clearAlpha);

};

const syncAutosort = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    dom.m3dRenderer.sortObjects = (value !== "no");

};

const syncAntialias = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    dom.m3dRenderer.antialias = (value !== "no");

};

const syncPixelRatio = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    if (!value) { return; }

    value = parseFloat(value);
    if (isFinite(value) && (value > 0)) {
        dom.m3dRenderer.setPixelRatio(value);
    }

};

const syncAutoclear = function (dom, value) {

    if (!dom.m3dRenderer) { return; }

    dom.m3dRenderer.autoClear = (value !== "no");

};

const syncSceneSize = function (dom) {

    if (!dom.m3dRenderer) { return; }

    let width = $(dom).attr("width");
    let height = $(dom).attr("height");
    if (width) { width = parseInt(width); }
    if (height) { height = parseInt(height); }
    let css = $(dom).css(["width", "height"]);
    if ((!width) || (!isFinite(width))) {
        width = css.width;
    }
    if ((!height) || (!isFinite(height))) {
        height = css.height;
    }
    width = Math.round(parseFloat(width));
    if ((width <= 0) || (!isFinite(width))) { width = 1; }
    height = Math.round(parseFloat(height));
    if ((height <= 0) || (!isFinite(height))) { height = 1; }

    // TODO: fov
    if (dom.m3dCamera.isPerspectiveCamera) {
        dom.m3dCamera.aspect = width / height;
    } else if (dom.m3dCamera.isOrthographicCamera) {
        dom.m3dCamera.left = - width / 2;
        dom.m3dCamera.right = width / 2;
        dom.m3dCamera.bottom = - height / 2;
        dom.m3dCamera.top = height / 2;
    }
    dom.m3dCamera.updateProjectionMatrix();

    dom.m3dRenderer.setSize(width, height);

    $(dom.m3dRenderer.domElement).css({
        "width": css.width,
        "height": css.height
    });

};

const syncChildren = function (dom) {

    if (!dom.m3dScene) { return; }

    let children = new Set();
    for (let child of dom.m3dScene.children) {
        if (child.m3dFromTagObject) {
            children.add(child);
        }
    }

    for (let child of dom.children) {
        if (typeof child.m3dGetObject === "function") {
            let m3dObject = child.m3dGetObject();
            if (m3dObject) {
                m3dObject.m3dFromTagObject = true;
                dom.m3dScene.add(m3dObject);
                children.delete(m3dObject);
            }
        }
    }

    for (let child of children) {
        dom.m3dScene.remove(child);
    }

};

module.exports = {
    "attributes": [
        "width", "height",
        "autoclear", "clear-color",
        "autosort",
        "antialias", "pixel-ratio",
        "controls", "grids", "stats", 
        "orbit-target",
        "autolights", "autocamera-lights",
        "camera", "camera-position", "camera-direction", 
        "camera-near", "camera-far"
    ],
    "listeners": {
        "oncreated": function () {

            this.m3dAutocameraLights = true;

        },
        "onconnected": function () {

            prepareScene(this);
            startSceneRendering(this);

            let size = new THREE.Vector2();

            this.resizeObserver = new ResizeObserver((entries) => {
                syncSceneSize(this);
                this.m3dRenderer.getSize(size);
                $(this).trigger("resize", {
                    "width": size.x,
                    "height": size.y
                });
            });
            this.resizeObserver.observe(this);

            this.mutationObserver = new MutationObserver(() => {
                syncChildren(this);
            });

            this.mutationObserver.observe(this, { "childList": true });

        },
        "onupdated": function (name, value) {
            switch (name) {
                case "width": case "height": { syncSceneSize(this); break; };
                case "controls": { syncControls(this, value); break; };
                case "orbit-target": { syncOrbitTarget(this, value); break; };
                case "grids": { syncGrids(this, value); break; };
                case "stats": { syncStats(this, value); break; };
                case "lights": { syncAutolights(this, value); break; };
                case "clear-color": { syncClearColor(this, value); break; };
                case "autoclear": { syncAutoclear(this, value); break; };
                case "autosort": { syncAutosort(this, value); break; };
                case "autocamera-lights": { syncAutocameraLights(this, value); break; };
                case "antialias": { syncAntialias(this, value); break; };
                case "pixel-ratio": { syncPixelRatio(this, value); break; };
                case "camera": { syncCamera(this, value); break; };
                case "camera-direction": { syncCameraDirection(this, value); break; };
                case "camera-position": { syncCameraPosition(this, value); break; };
                case "camera-near": { syncCameraNear(this, value); break; };
                case "camera-far": { syncCameraFar(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            this.resizeObserver.disconnect(this);
            this.mutationObserver.disconnect(this);
            stopSceneRendering(this);
            disposeScene(this);
        }
    },
    "methods": {
        "stopRendering": function () {
            stopSceneRendering(this);
        },
        "startRendering": function () {
            startSceneRendering(this);
        },
        "m3dSyncChildren": function () {
            syncChildren(this);
        },
        "m3dTrigSkeletonUpdate": function (name) {
            if (!this.m3dSkeletonListeners) {
                return;
            }
            if (!this.m3dSkeletonListeners[name]) {
                return;
            }
            for (let listener of this.m3dSkeletonListeners[name]) {
                try {
                    listener();
                } catch (error) {
                    console.error(error);
                }
            }
        },
        "m3dInstallSkeletonListener": function (name, listener) {
            if (!this.m3dSkeletonListeners) {
                this.m3dSkeletonListeners = Object.create(null);
            }
            if (!this.m3dSkeletonListeners[name]) {
                this.m3dSkeletonListeners[name] = [];
            }
            this.m3dSkeletonListeners[name].push(listener);
        },
        "m3dUninstallSkeletonListener": function (name, listener) {
            if (!this.m3dSkeletonListeners) {
                return;
            }
            if (!this.m3dSkeletonListeners[name]) {
                return;
            }
            let index = this.m3dSkeletonListeners[name].indexOf(listener);
            if (index !== -1) {
                this.m3dSkeletonListeners[name].splice(index, 1);
            }
        },
        "m3dTrigMaterialUpdate": function (name) {
            if (!this.m3dMaterialListeners) {
                return;
            }
            if (!this.m3dMaterialListeners[name]) {
                return;
            }
            for (let listener of this.m3dMaterialListeners[name]) {
                try {
                    listener();
                } catch (error) {
                    console.error(error);
                }
            }
        },
        "m3dUninstallMaterialListener": function (name, listener) {
            if (!this.m3dMaterialListeners) {
                return;
            }
            if (!this.m3dMaterialListeners[name]) {
                return;
            }
            let index = this.m3dMaterialListeners[name].indexOf(listener);
            if (index !== -1) {
                this.m3dMaterialListeners[name].splice(index, 1);
            }
        },
        "m3dInstallMaterialListener": function (name, listener) {
            if (!this.m3dMaterialListeners) {
                this.m3dMaterialListeners = Object.create(null);
            }
            if (!this.m3dMaterialListeners[name]) {
                this.m3dMaterialListeners[name] = [];
            }
            this.m3dMaterialListeners[name].push(listener);
        },
        "m3dTrigTextureUpdate": function (name) {
            if (!this.m3dTextureListeners) {
                return;
            }
            if (!this.m3dTextureListeners[name]) {
                return;
            }
            for (let listener of this.m3dTextureListeners[name]) {
                try {
                    listener();
                } catch (error) {
                    console.error(error);
                }
            }
        },
        "m3dUninstallTextureListener": function (name, listener) {
            if (!this.m3dTextureListeners) {
                return;
            }
            if (!this.m3dTextureListeners[name]) {
                return;
            }
            let index = this.m3dTextureListeners[name].indexOf(listener);
            if (index !== -1) {
                this.m3dTextureListeners[name].splice(index, 1);
            }
        },
        "m3dInstallTextureListener": function (name, listener) {
            if (!this.m3dTextureListeners) {
                this.m3dTextureListeners = Object.create(null);
            }
            if (!this.m3dTextureListeners[name]) {
                this.m3dTextureListeners[name] = [];
            }
            this.m3dTextureListeners[name].push(listener);
        },
        "snapshotAsDataURL": function () {
            if (!this.m3dRenderer) {
                return;
            }
            return this.m3dRenderer.domElement.toDataURL();
        },
        "recordVideo": function (action) {

            if (!this.m3dRenderer) {
                return;
            }

            const chunks = [];

            const mediaStream = this.m3dRenderer.domElement.captureStream(60);

            const mediaRecorder = new MediaRecorder(mediaStream, {
                "videoBitsPerSecond": 20000000
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            let start = undefined;
            mediaRecorder.onstart = () => {
                start();
            };

            let callback = undefined;
            mediaRecorder.onstop = () => {
                $.delay(500, () => {
                    const blob = new Blob(chunks, { "type" : "video/webm" });
                    callback(undefined, blob);
                });
            };

            action((startCallback) => {

                start = startCallback;

                mediaRecorder.start();

            }, (dataCallback) => {

                callback = dataCallback;

                mediaRecorder.stop();

            });

        }
    }
};

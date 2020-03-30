const THREE = require("../../scripts/three.js");

const prepareCamera = function (dom) {

    let newCamera = false;
    switch ($(dom).attr("type")) {
        case "orthographic": {
            if ((!dom.m3dCamera) || (!dom.m3dCamera.isOrthographicCamera)) {

                newCamera = true;

                let left = 0; let top = 0; let right = 1; let bottom = 1;

                let viewport = $(dom).attr("viewport");
                if (viewport && viewport.trim()) {
                    viewport = viewport.trim().split(/[\s,]+/).map((x) => parseFloat(x));
                    left = viewport[0];
                    right = viewport[1];
                    bottom = viewport[2];
                    top = viewport[3];
                }

                let near = parseFloat($(dom).attr("near"));
                if (!isFinite(near)) { near = 10; }

                let far = parseFloat($(dom).attr("far"));
                if (!isFinite(far)) { far = 1000; }

                dom.m3dCamera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);

            }
            break;
        }
        case "perspective": {
            if ((!dom.m3dCamera) || (!dom.m3dCamera.isPerspectiveCamera)) {

                newCamera = true;

                let aspect = parseFloat($(dom).attr("aspect"));
                if (!isFinite(aspect)) { aspect = 1; }

                let fov = parseFloat($(dom).attr("fov"));
                if (!isFinite(fov)) { fov = 50; }

                let near = parseFloat($(dom).attr("near"));
                if (!isFinite(near)) { near = 10; }

                let far = parseFloat($(dom).attr("far"));
                if (!isFinite(far)) { far = 1000; }

                dom.m3dCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);

            }
            break;
        }
    }

    if (newCamera) {

        syncLayers(dom, $(dom).attr("layers"));

        syncPosition(dom, $(dom).attr("position"));
        syncTarget(dom, $(dom).attr("target"));

    }

    return dom.m3dCamera;

};

const disposeCamera = function (dom) {

    if (dom.m3dCamera) {
        delete dom.m3dCamera;
    }

};

const syncLayers = function (dom, value) {

    if (!dom.m3dCamera) { return; }

    if (!value) { return; }

    let layers = parseInt(value);

    dom.m3dCamera.layers.set(layers);

};

const syncNear = function (dom, value) {

    if (!dom.m3dCamera) { return; }

    if (!value) { return; }

    let near = parseFloat(value);
    if (isFinite(near)) {
        dom.m3dCamera.near = near;
    }

};

const syncFar = function (dom, value) {

    if (!dom.m3dCamera) { return; }

    if (!value) { return; }

    let far = parseFloat(value);
    if (isFinite(far)) {
        dom.m3dCamera.far = far;
    }

};

const syncFOV = function (dom, value) {

    if (!dom.m3dCamera) { return; }
    if (!dom.m3dCamera.isPerspectiveCamera) { return; }

    if (!value) { return; }

    let fov = parseFloat(value);
    if (isFinite(fov)) {
        dom.m3dCamera.fov = fov;
    }

    dom.m3dCamera.updateProjectionMatrix();

};

const syncAspect = function (dom, value) {

    if (!dom.m3dCamera) { return; }
    if (!dom.m3dCamera.isPerspectiveCamera) { return; }

    if (!value) { return; }

    let aspect = parseFloat(value);
    if (isFinite(aspect)) {
        dom.m3dCamera.aspect = aspect;
    }

    dom.m3dCamera.updateProjectionMatrix();

};

const syncViewport = function (dom, value) {

    if (!dom.m3dCamera) { return; }
    if (!dom.m3dCamera.isOrthographicCamera) { return; }

    if (!value) { return; }

    let viewport = value.trim().split(/[\s,]+/).map((x) => parseFloat(x));

    dom.m3dCamera.left = viewport[0];
    dom.m3dCamera.right = viewport[1];
    dom.m3dCamera.bottom = viewport[2];
    dom.m3dCamera.top = viewport[3];

    dom.m3dCamera.updateProjectionMatrix();

};

const syncPosition = function (dom, value) {

    if (!dom.m3dCamera) {
        return;
    }

    if (!value) {
        value = "50, 50, 100";
    }

    value = value.trim().split(/[\s,]+/).map(value => parseFloat(value));

    dom.m3dCamera.position.set(value[0], value[1], value[2]);

};

const syncTarget = function (dom, value) {

    if (!dom.m3dCamera) {
        return;
    }

    if (!value) {
        return;
    }

    value = value.trim().split(/[\s,]+/).map(value => parseFloat(value));

    dom.m3dCamera.lookAt(value[0], value[1], value[2]);

};

module.exports = {
    "attributes": [
        "type", "layers",
        "near", "far",
        "position", "target",
        "viewport", "aspect", "fov"
    ],
    "listeners": {
        "onconnected": function () {},
        "onupdated": function (name, value) {
            switch (name) {
                case "type": { prepareCamera(this); break; };
                case "layers": { syncLayers(this, value); break; };
                case "fov": { syncFOV(this, value); break; };
                case "aspect": { syncAspect(this, value); break; };
                case "viewport": { syncViewport(this, value); break; };
                case "position": { syncPosition(this, value); break; };
                case "target": { syncTarget(this, value); break; };
                case "near": { syncNear(this, value); break; };
                case "far": { syncFar(this, value); break; };
            }
        },
        "ondisconnected": function () {
            disposeCamera(this);
        }
    },
    "methods": {
        "m3dGetCamera": function () {
            return prepareCamera(this);
        }
    }
};

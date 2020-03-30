const THREE = require("../../scripts/three.js");

const prepareTarget = function (dom) {

    if (!dom.m3dTarget) {
        let width = parseInt($(dom).attr("width"));
        let height = parseInt($(dom).attr("height"));
        if ((!isFinite(width)) || (width < 0)) {
            width = 1;
        }
        if ((!isFinite(height)) || (height < 0)) {
            height = 1;
        }
        dom.m3dTarget = new THREE.WebGLRenderTarget(width, height);
        dom.m3dTarget.texture.format = THREE.RGBAFormat;
        syncID(dom, $(dom).attr("id"));
        syncStencil(dom, $(dom).attr("stencil"));
        syncDepth(dom, $(dom).attr("depth"));
        syncWidth(dom, $(dom).attr("width"));
        syncHeight(dom, $(dom).attr("height"));
        syncFlipY(dom, $(dom).attr("flip-y"));
        syncWrapS(dom, $(dom).attr("wrap-s"));
        syncWrapT(dom, $(dom).attr("wrap-t"));
        syncOffset(dom, $(dom).attr("offset"));
        syncRepeat(dom, $(dom).attr("repeat"));
        syncRotation(dom, $(dom).attr("rotation"));
        syncMinFilter(dom, $(dom).attr("min-filter"));
        syncMagFilter(dom, $(dom).attr("mag-filter"));
        syncMipmap(dom, $(dom).attr("mipmap"));
        trigTextureUpdate(dom);
    } 

    return dom.m3dTarget;

};

const disposeTarget = function (dom) {

    if (dom.m3dTarget) {
        dom.m3dTarget.dispose();
        delete dom.m3dTarget;
    }

};

const syncID = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (dom.m3dTarget.texture.name !== value) {
        dom.m3dTarget.texture.name = value;
        trigTextureUpdate(dom);
    }

};

const syncWidth = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    value = parseInt(value);
    if ((!isFinite(value)) || (value <= 0)) {
        value = 1;
    }

    dom.m3dTarget.setSize(value, dom.m3dTarget.height);

};

const syncHeight = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    value = parseInt(value);
    if ((!isFinite(value)) || (value <= 0)) {
        value = 1;
    }

    dom.m3dTarget.setSize(dom.m3dTarget.width, value);

};

const syncFlipY = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    dom.m3dTarget.texture.flipY = (value === "yes");

};

const syncStencil = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    dom.m3dTarget.stencilBuffer = (value === "yes");

};

const syncDepth = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    dom.m3dTarget.depthBuffer = (value === "yes");

};

const syncWrapS = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    switch (value) {
        case "clamp": { dom.m3dTarget.texture.wrapS = THREE.ClampToEdgeWrapping; break; };
        case "repeat": { dom.m3dTarget.texture.wrapS = THREE.RepeatWrapping; break; };
        case "mirror": { dom.m3dTarget.texture.wrapS = THREE.MirroredRepeatWrapping; break; };
        default: { console.error(`Unknown wrap-s settings: ${value}`); break; }
    }

};

const syncWrapT = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    switch (value) {
        case "clamp": { dom.m3dTarget.texture.wrapT = THREE.ClampToEdgeWrapping; break; };
        case "repeat": { dom.m3dTarget.texture.wrapT = THREE.RepeatWrapping; break; };
        case "mirror": { dom.m3dTarget.texture.wrapT = THREE.MirroredRepeatWrapping; break; };
        default: { console.error(`Unknown wrap-t settings: ${value}`); break; }
    }

};

const syncRotation = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    value = parseFloat(value);

    dom.m3dTarget.texture.rotation = value;

};

const syncOffset = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    value = value.trim().split(/[,\s]+/).map((value) => parseFloat(value));

    dom.m3dTarget.texture.offset.set(value[0], value[1]);

};

const syncRepeat = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    value = value.trim().split(/[,\s]+/).map((value) => parseFloat(value));

    dom.m3dTarget.texture.repeat.set(value[0], value[1]);

};

const syncMinFilter = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    switch (value) {
        case "linear": { dom.m3dTarget.texture.minFilter = THREE.LinearFilter; break; }
        case "nearest": { dom.m3dTarget.texture.minFilter = THREE.NearestFilter; break; }
    }

};

const syncMagFilter = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    switch (value) {
        case "linear": { dom.m3dTarget.texture.magFilter = THREE.LinearFilter; break; }
        case "nearest": { dom.m3dTarget.texture.magFilter = THREE.NearestFilter; break; }
    }

};

const syncMipmap = function (dom, value) {

    if (!dom.m3dTarget) { return; }

    if (!value) { return; }

    dom.m3dTarget.texture.generateMipmaps = (value !== "no");

};

const trigTextureUpdate = function (dom) {

    let parent = dom.parentNode;
    while (parent && ((!parent.localName) || (parent.localName.toLowerCase() !== "m3d-scene"))) {
        parent = parent.parentNode;
    }

    let id = $(dom).attr("id");

    if (parent && id) {
        parent.m3dTrigTextureUpdate(id);
    }

};

module.exports = {
    "attributes": [ 
        "id", "flip-y", 
        "stencil", "depth",
        "width", "height",
        "wrap-s", "wrap-t", 
        "offset", "repeat", "rotation",
        "min-filter", "mag-filter",
        "mipmap"
    ],
    "listeners": {
        "onconnected": function () {
            trigTextureUpdate(this);
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "id": { syncID(this, value); break; };
                case "width": { syncWidth(this, value); break; };
                case "height": { syncHeight(this, value); break; };
                case "stencil": { syncStencil(this, value); break; };
                case "depth": { syncDepth(this, value); break; };
                case "flip-y": { syncFlipY(this, value); break; };
                case "wrap-s": { syncWrapS(this, value); break; };
                case "wrap-t": { syncWrapT(this, value); break; };
                case "offset": { syncOffset(this, value); break; };
                case "repeat": { syncRepeat(this, value); break; };
                case "rotation": { syncRotation(this, value); break; };
                case "min-filter": { syncMinFilter(this, value); break; };
                case "mag-filter": { syncMagFilter(this, value); break; };
                case "mipmap": { syncMipmap(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            disposeTarget(this);
        }
    },
    "methods": {
        "m3dGetTarget": function () {
            return prepareTarget(this);
        },
        "m3dGetTexture": function () {
            return this.m3dGetTarget(this).texture;
        }
    }
};

const THREE = require("../../scripts/three.js");

const textureLoader = new THREE.TextureLoader();

const prepareTexture = function (dom) {

    let src = $(dom).attr("src");
    if (!dom.m3dTexture) {
        if (src) {
            dom.m3dTexture = textureLoader.load(src);
            syncID(dom, $(dom).attr("id"));
            syncFlipY(dom, $(dom).attr("flip-y"));
            syncWrapS(dom, $(dom).attr("wrap-s"));
            syncWrapT(dom, $(dom).attr("wrap-t"));
            syncOffset(dom, $(dom).attr("offset"));
            syncRepeat(dom, $(dom).attr("repeat"));
            syncRotation(dom, $(dom).attr("rotation"));
            trigTextureUpdate(dom);
        }
    } else {
        if (!src) {
            dom.m3dTexture.dispose();
            delete dom.m3dTexture;
        }
    }

    return dom.m3dTexture;

};

const disposeTexture = function (dom) {

    if (dom.m3dTexture) {
        dom.m3dTexture.dispose();
        delete dom.m3dTexture;
    }

};

const syncID = function (dom, value) {

    if (!dom.m3dTexture) { return; }

    if (dom.m3dTexture.name !== value) {
        dom.m3dTexture.name = value;
        trigTextureUpdate(dom);
    }

};

const syncFlipY = function (dom, value) {

    if (!dom.m3dTexture) { return; }

    if (!value) { return; }

    dom.m3dTexture.flipY = (value === "yes");

};

const syncWrapS = function (dom, value) {

    if (!dom.m3dTexture) { return; }

    if (!value) { return; }

    switch (value) {
        case "clamp": { dom.m3dTexture.wrapS = THREE.ClampToEdgeWrapping; break; };
        case "repeat": { dom.m3dTexture.wrapS = THREE.RepeatWrapping; break; };
        case "mirror": { dom.m3dTexture.wrapS = THREE.MirroredRepeatWrapping; break; };
        default: { console.error(`Unknown wrap-s settings: ${value}`); break; }
    }

};

const syncWrapT = function (dom, value) {

    if (!dom.m3dTexture) { return; }

    if (!value) { return; }

    switch (value) {
        case "clamp": { dom.m3dTexture.wrapT = THREE.ClampToEdgeWrapping; break; };
        case "repeat": { dom.m3dTexture.wrapT = THREE.RepeatWrapping; break; };
        case "mirror": { dom.m3dTexture.wrapT = THREE.MirroredRepeatWrapping; break; };
        default: { console.error(`Unknown wrap-t settings: ${value}`); break; }
    }

};

const syncRotation = function (dom, value) {

    if (!dom.m3dTexture) { return; }

    if (!value) { return; }

    value = parseFloat(value);

    dom.m3dTexture.rotation = value;

};

const syncOffset = function (dom, value) {

    if (!dom.m3dTexture) { return; }

    if (!value) { return; }

    value = value.trim().split(/[,\s]+/).map((value) => parseFloat(value));

    dom.m3dTexture.offset.set(value[0], value[1]);

};

const syncRepeat = function (dom, value) {

    if (!dom.m3dTexture) { return; }

    if (!value) { return; }

    value = value.trim().split(/[,\s]+/).map((value) => parseFloat(value));

    dom.m3dTexture.repeat.set(value[0], value[1]);

};

const syncSRC = function (dom, value) {

    if (value && value[0] === "@") {
        let base = dom;
        while (base && base.localName && 
               ((base.localName.toLowerCase() !== "m3d-object") || 
                (!$(base).attr("base")))) {
            base = base.parentNode;
        }
        if (base) {
            let url = $(base).attr("base");
            if (url[url.length - 1] !== "/") {
                url += "/";
            }
            value = url + value.slice(1);
        }
    }

    if (value[0] === "@") {
        return;
    }

    if (!dom.m3dTexture) {
        if (value) {
            dom.m3dTexture = textureLoader.load(value);
            syncID(dom, $(dom).attr("id"));
            trigTextureUpdate(dom);
        }
    } else {
        if (!value) {
            dom.m3dTexture.dispose();
            delete dom.m3dTexture;
        }
    }

}

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
    "attributes": [ "id", "src", "flip-y", "wrap-s", "wrap-t", "offset", "repeat", "rotation" ],
    "listeners": {
        "onconnected": function () {
            trigTextureUpdate(this);
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "id": { syncID(this, value); break; };
                case "src": { syncSRC(this, value); break; };
                case "flip-y": { syncFlipY(this, value); break; };
                case "wrap-s": { syncWrapS(this, value); break; };
                case "wrap-t": { syncWrapT(this, value); break; };
                case "offset": { syncOffset(this, value); break; };
                case "repeat": { syncRepeat(this, value); break; };
                case "rotation": { syncRotation(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            disposeTexture(this);
        }
    },
    "methods": {
        "m3dGetTexture": function () {
            return prepareTexture(this);
        }
    }
};

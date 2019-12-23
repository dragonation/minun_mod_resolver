const THREE = require("../../scripts/three.js");

const mapKeys = Object.create(null);

mapKeys["color"] = "map";

const prepareMaterial = function (dom) {

    let newMaterial = false;
    switch ($(dom).attr("preset")) {
        case "phong": {
            if ((!dom.m3dMaterial) || (!dom.m3dMaterial.isMeshPhongMaterial)) {
                if (dom.m3dMaterial) { dom.m3dMaterial.dispose(); }
                dom.m3dMaterial = new THREE.MeshPhongMaterial({});
                newMaterial = true;
                break;
            }
        };
        default: { break; };
    }

    if (newMaterial && dom.m3dMaterial) {
        syncID(dom, $(dom).attr("id"));
        syncColor(dom, $(dom).attr("color"));
        syncTextures(dom, $(dom).attr("textures"));
        syncSide(dom, $(dom).attr("side"));
        syncSkinning(dom, $(dom).attr("skinning"));
        syncAlphaTest(dom, $(dom).attr("alpha-test"));
        syncDepthTest(dom, $(dom).attr("depth-test"));
        syncDepthWrite(dom, $(dom).attr("depth-write"));
        trigMaterialUpdate(dom);
    }

    return dom.m3dMaterial;

};

const disposeMaterial = function (dom) {

    if (dom.m3dMaterial) {
        dom.m3dMaterial.dispose();
        delete dom.m3dMaterial;
    }

};

const syncColor = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.color.set(value);

};

const syncSide = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    switch (value) {
        case "both-sides": { dom.m3dMaterial.side = THREE.DoubleSide; break; };
        case "front-face": { dom.m3dMaterial.side = THREE.FrontFace; break; };
        case "back-face": { dom.m3dMaterial.side = THREE.BackFace; break; };
    }

};

const syncAlphaTest = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.alphaTest = parseFloat(value);

};

const syncSkinning = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.skinning = (value === "yes");

};

const syncDepthTest = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.depthTest = value === "yes";

};

const syncDepthWrite = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.depthWrite = value === "yes";

};

const syncID = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (dom.m3dMaterial.name !== value) {
        dom.m3dMaterial.name = value;
        trigMaterialUpdate(dom);
    }

};

const syncTextures = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    // get the scene
    let scene = dom;
    while (scene && ((!scene.localName) || (scene.localName.toLowerCase() !== "m3d-scene"))) {
        scene = scene.parentNode;
    }

    if (!scene) {
        return;
    }

    if (!dom.m3dTextures) {
        dom.m3dTextures = Object.create(null);
    }

    let textures = value.trim().split(",").map((id) => id.trim()).filter((id) => id);
    textures.forEach((texture) => {

        let usage = texture.split(":")[0];
        let target = texture.split(":").slice(1).join(":");
        if (!target) {
            target = usage; usage = "color";
        }

        if (!dom.m3dTextures[usage]) {
            dom.m3dTextures[usage] = {
                "updater": () => {
                    let changed = true;
                    let removed = true;
                    let textures = $(dom).attr("textures");
                    if (textures) {
                        textures.trim().split(",").map((id) => id.trim()).forEach((texture) => {
                            let newUsage = texture.split(":")[0];
                            let newTarget = texture.split(":").slice(1).join(":");
                            if (!newTarget) {
                                newTarget = newUsage; newUsage = "color";
                            }
                            if (newUsage === usage) {
                                removed = false;
                                if (target === newTarget) {
                                    changed = false;
                                }
                            }
                        });
                    }
                    if (changed) {
                        dom.m3dTextures[usage].scene.m3dUninstallTextureListener(target, dom.m3dTextures[usage].updater);
                        delete dom.m3dTextures[usage].scene;
                        if (removed) {
                            return;
                        }
                    }
                    if (!dom.m3dMaterial) {
                        return;
                    }
                    let m3dTexture = undefined;
                    let lastScene = false;
                    let parent = dom;
                    while (parent && (!lastScene) && (!m3dTexture)) {
                        lastScene = (parent.localName && (parent.localName.toLowerCase() === "m3d-scene")) ? true : false;
                        m3dTexture = $(parent).find("#" + target)[0];
                        parent = parent.parentNode;
                    }
                    if (m3dTexture) {
                        dom.m3dMaterial[mapKeys[usage]] = m3dTexture.m3dGetTexture();
                        // TODO: remove last texture for dispose
                    }
                }
            };
        }

        if (dom.m3dTextures[usage].scene) {
            if (dom.m3dTextures[usage].scene !== scene) {
                dom.m3dTextures[usage].scene.m3dUninstallTextureListener(target, dom.m3dTextures[usage].updater);
                dom.m3dTextures[usage].scene = scene;
                dom.m3dTextures[usage].scene.m3dInstallTextureListener(target, dom.m3dTextures[usage].updater);
                dom.m3dTextures[usage].updater();
            }
        } else {
            dom.m3dTextures[usage].scene = scene;
            dom.m3dTextures[usage].scene.m3dInstallTextureListener(target, dom.m3dTextures[usage].updater);
            dom.m3dTextures[usage].updater();
        }

    });

};

const trigMaterialUpdate = function (dom) {

    let parent = dom.parentNode;
    while (parent && ((!parent.localName) || (parent.localName.toLowerCase() !== "m3d-scene"))) {
        parent = parent.parentNode;
    }

    let id = $(dom).attr("id");

    if (parent && id) {
        parent.m3dTrigMaterialUpdate(id);
    }

};

module.exports = {
    "attributes": [
        "preset",
        "id", "color",
        "textures",
        "side", "alpha-test",
        "depth-test", "depth-write",
        "skinning"
    ],
    "listeners": {
        "onconnected": function () {
            trigMaterialUpdate(this);
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "preset": { prepareMaterial(this); break; };
                case "id": { syncID(this, value); break; };
                case "color": { syncColor(this, value); break; };
                case "textures": { syncTextures(this, value); break; };
                case "side": { syncSide(this, value); break; };
                case "skinning": { syncSkinning(this, value); break; };
                case "alpha-test": { syncAlphaTest(this, value); break; };
                case "depth-test": { syncDepthTest(this, value); break; };
                case "depth-write": { syncDepthWrite(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            disposeMaterial(this);
        }
    },
    "methods": {
        "m3dGetMaterial": function () {
            return prepareMaterial(this);
        }
    }
};

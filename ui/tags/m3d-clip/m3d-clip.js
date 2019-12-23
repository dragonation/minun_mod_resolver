const THREE = require("../../scripts/three.js");

const prepareClip = function (dom) {

    if (!dom.m3dClip) {
        dom.m3dClip = new THREE.AnimationClip($(dom).attr("id"), parseFloat($(dom).attr("duration")), []);
        syncChildren(dom);
    }

    return dom.m3dClip;

};

const disposeClip = function (dom) {

    if (dom.m3dClip) {
        delete dom.m3dClip;
    }

};

const syncDuration = function (dom, value) {

    if (!dom.m3dClip) { return; }

    if (dom.m3dClip.duration !== parseFloat(value)) {
        dom.m3dClip.duration = parseFloat(value);
    }

};

const syncID = function (dom, value) {

    if (!dom.m3dClip) { return; }

    if (dom.m3dClip.name !== value) {
        dom.m3dClip.name = value;
    }

};

const syncChildren = function (dom) {

    if (!dom.m3dClip) { return; }

    let tracks = [];

    for (let child of dom.children) {
        if (typeof child.m3dGetTrack === "function") {
            tracks.push(child.m3dGetTrack());
        }
    }

    dom.m3dClip.tracks = tracks;

};

module.exports = {
    "attributes": [ "id", "duration" ],
    "listeners": {
        "onconnected": function () {
            this.mutationObserver = new MutationObserver(() => {
                syncChildren(this);
            });
            this.mutationObserver.observe(this, { "childList": true });
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "id": { syncID(this, value); break; };
                case "duration": { syncDuration(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            this.mutationObserver.disconnect(this);
        }
    },
    "methods": {
        "m3dGetClip": function () {
            return prepareClip(this);
        }
    }
};

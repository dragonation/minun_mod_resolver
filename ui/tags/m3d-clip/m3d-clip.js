const THREE = require("../../scripts/three.js");

const prepareClip = function (dom) {

    if (!dom.m3dClip) {

        dom.m3dClip = new THREE.AnimationClip($(dom).attr("id"), parseFloat($(dom).attr("duration")), []);

        dom.m3dClip.getPatchedAnimation = function () {

            let fps = $(dom).attr("fps");
            if (fps) { 
                fps = parseInt(fps);
            }
            if ((!isFinite(fps)) || (!fps)) {
                fps = 60; 
            }

            return {
                "duration": dom.m3dClip.duration,
                "resample": 60 / fps,
                "fps": fps,
                "times": dom.m3dClip.times,
                "tracks": dom.m3dClip.tracks.map((track) => {
                    return track.getPatchedTrack();
                }),
            };

        };

        let loader = getBinLoader(dom);

        if (dom.m3dTimes) {
            dom.m3dTrack.times = dom.m3dTimes;
        } else {
            let timesAttribute = $(dom).attr("times");
            if (timesAttribute && (timesAttribute[0] === "@") && (timesAttribute !== dom.m3dTimesSource)) {
                if (loader) {
                    loader.m3dGetBin(timesAttribute.slice(1), (error, result) => {
                        dom.m3dTimesSource = timesAttribute;
                        if (error) {
                            console.error(error); return;
                        }
                        dom.times = result;
                    });
                }
            }
        }

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

const getBinLoader = function (dom) {

    let origin = dom;

    while (dom && (typeof dom.m3dGetBin !== "function")) {
        dom = dom.parentNode;
    }

    return dom;

};

module.exports = {
    "attributes": [ "id", "duration", "fps", "times" ],
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
                case "times": { 
                    if (value[0] !== "@") { return; }
                    delete this.m3dTimes;
                    delete this.m3dTimesSource;
                    let loader = getBinLoader(this);
                    if (loader) {
                        loader.m3dGetBin(value.slice(1), (error, result) => {
                            this.m3dTimesSource = value;
                            if (error) {
                                console.error(error); return;
                            }
                            this[name] = result;
                        });
                    } else {
                        this[name] = undefined;
                    }
                    break; 
                };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            this.mutationObserver.disconnect(this);
        }
    },
    "properties": {
        "times": {
            "get": function () {
                return this.m3dTimes;
            },
            "set": function (value) {
                this.m3dTimes = value;
                if (this.m3dClip) {
                    this.m3dClip.times = value;
                }
            }
        }
    },
    "methods": {
        "m3dGetClip": function () {
            return prepareClip(this);
        }
    }
};

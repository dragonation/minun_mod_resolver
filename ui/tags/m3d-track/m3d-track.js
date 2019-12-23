const THREE = require("../../scripts/three.js");

const prepareTrack = function (dom) {

    if (!dom.m3dTrack) {
        switch ($(dom).attr("type")) {
            case "boolean": {
                dom.m3dTrack = new THREE.BooleanKeyframeTrack($(dom).attr("target"), [0], [true]);
                break;
            };
            case "color": {
                dom.m3dTrack = new THREE.ColorKeyframeTrack($(dom).attr("target"), [0], [0]);
                break;
            };
            case "number": {
                dom.m3dTrack = new THREE.NumberKeyframeTrack($(dom).attr("target"), [0], [0]);
                break;
            };
            case "quaternion": {
                dom.m3dTrack = new THREE.QuaternionKeyframeTrack($(dom).attr("target"), [0], [0, 0, 0, 1]);
                break;
            };
            case "String": {
                dom.m3dTrack = new THREE.StringKeyframeTrack($(dom).attr("target"), [0], [""]);
                break;
            };
            case "vector": {
                dom.m3dTrack = new THREE.VectorKeyframeTrack($(dom).attr("target"), [0], [0, 0, 0]);
                break;
            };
        }
        if (dom.m3dTimes) {
            dom.m3dTrack.times = dom.m3dTimes;
        }
        if (dom.m3dValues) {
            dom.m3dTrack.values = dom.m3dValues;
        }
    }

    return dom.m3dTrack;

};

const disposeTrack = function (dom) {

    if (dom.m3dTrack) {
        delete dom.m3dTrack;
    }

};

const syncType = function (dom, value) {

    if (!dom.m3dTrack) {
        return;
    }

    let needReset = false;

    switch (value) {
        case "boolean": {
            if (dom.m3dTrack && (!dom.m3dTrack.isBooleanKeyframeTrack)) { needReset = true; }
            break;
        };
        case "color": {
            if (dom.m3dTrack && (!dom.m3dTrack.isColorKeyframeTrack)) { needReset = true; }
            break;
        };
        case "number": {
            if (dom.m3dTrack && (!dom.m3dTrack.isNumberKeyframeTrack)) { needReset = true; }
            break;
        };
        case "quaternion": {
            if (dom.m3dTrack && (!dom.m3dTrack.isQuaternionKeyframeTrack)) { needReset = true; }
            break;
        };
        case "text": {
            if (dom.m3dTrack && (!dom.m3dTrack.isStringKeyframeTrack)) { needReset = true; }
            break;
        };
        case "vector": {
            if (dom.m3dTrack && (!dom.m3dTrack.isVectorKeyframeTrack)) { needReset = true; }
            break;
        };
        default: {
            throw new Error(`Unknown keyframe track type[${value}]`);
        };
    }

    if (needReset) {
        disposeTrack(dom);
        prepareTrack(dom);
    }

};

const syncTarget = function (dom, value) {

    if (!dom.m3dTrack) {
        return;
    }

    dom.m3dTrack.name = value;

};

module.exports = {
    "attributes": [ "target", "times", "values", "type" ],
    "listeners": {
        "onconnected": function () {
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "target": { syncTarget(this, value); break; };
                case "type": { syncType(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {}
    },
    "properties": {
        "times": {
            "get": function () {
                return this.m3dTimes;
            },
            "set": function (value) {
                this.m3dTimes = value;
                if (this.m3dTrack) {
                    this.m3dTrack.times = value;
                }
            }
        },
        "values": {
            "get": function () {
                return this.m3dValues;
            },
            "set": function (value) {
                this.m3dValues = value;
                if (this.m3dTrack) {
                    this.m3dTrack.values = value;
                }
            }
        }
    },
    "methods": {
        "m3dGetTrack": function () {
            return prepareTrack(this);
        }
    }
};

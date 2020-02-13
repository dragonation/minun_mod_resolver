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
            case "text": {
                dom.m3dTrack = new THREE.StringKeyframeTrack($(dom).attr("target"), [0], [""]);
                break;
            };
            case "vector-3": {
                dom.m3dTrack = new THREE.VectorKeyframeTrack($(dom).attr("target"), [0], [0, 0, 0]);
                break;
            };
            case "vector-4": {
                dom.m3dTrack = new THREE.VectorKeyframeTrack($(dom).attr("target"), [0], [0, 0, 0, 0]);
                break;
            };
            default: {
                console.log($(dom).attr("type"));
            }
        }

        dom.m3dTrack.getPatchedTrack = function () {
            let values = [];
            let unitSize = dom.m3dTrack.values.length / dom.m3dTrack.times.length;
            for (let looper = 0; looper < dom.m3dTrack.values.length; looper += unitSize) {
                if (unitSize === 1) {
                    values.push(dom.m3dTrack.values[looper]);
                } else {
                    values.push(Array.prototype.slice.call(dom.m3dTrack.values, looper, looper + unitSize));
                }
            }
            return {
                "type": $(dom).attr("target-type"),
                "target": $(dom).attr("target"),
                "constant": $(dom).attr("constant") === "yes",
                "frames": values
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

        if (dom.m3dValues) {
            dom.m3dTrack.values = dom.m3dValues;
        } else {
            let valuesAttribute = $(dom).attr("values");
            if (valuesAttribute && (valuesAttribute[0] === "@") && (valuesAttribute !== dom.m3dValuesSource)) {
                if (loader) {
                    loader.m3dGetBin(valuesAttribute.slice(1), (error, result) => {
                        dom.m3dValuesSource = valuesAttribute;
                        if (error) {
                            console.error(error); return;
                        }
                        dom.values = result;
                    });
                }
            }
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

const getBinLoader = function (dom) {

    let origin = dom;

    while (dom && (typeof dom.m3dGetBin !== "function")) {
        dom = dom.parentNode;
    }

    return dom;

};

module.exports = {
    "attributes": [ "target", "target-type", "times", "values", "type" ],
    "listeners": {
        "onconnected": function () {
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "target": { syncTarget(this, value); break; };
                case "type": { syncType(this, value); break; };
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
                }
                case "values": { 
                    if (value[0] !== "@") { return; }
                    delete this.m3dValues;
                    delete this.m3dValuesSource;
                    let loader = getBinLoader(this);
                    if (loader) {
                        loader.m3dGetBin(value.slice(1), (error, result) => {
                            this.m3dValuesSource = value;
                            if (error) {
                                console.error(error); return;
                            }
                            console.log(result);
                            this[name] = result;
                        });
                    } else {
                        this[name] = undefined;
                    }
                    break; 
                }
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

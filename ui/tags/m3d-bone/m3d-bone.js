const THREE = require("../../scripts/three.js");

const sharedVector3 = new THREE.Vector3();
const sharedEuler = new THREE.Euler();
const sharedQuaternion = new THREE.Quaternion();

const parseVector3 = function (value, defaultValue, expanding) {

    if ((!value) || (!value.trim())) {
        return defaultValue;
    }

    let values = value.trim().split(/[\s,]+/);
    if ((values.length === 1) && expanding) {
        values = [values[0], values[0], values[0]];
    }
    if (values.length !== 3) {
        return;
    }

    floats = [];
    for (let text of values) {
        let float = parseFloat(text);
        if (!isFinite(float)) {
            return;
        }
        floats.push(float);
    }

    return floats;

};

const parseQuaternion = function (value) {

    if ((!value) || (!value.trim())) {
        return [0, 0, 0, 1];
    }

    let values = value.trim().toLowerCase().split(/[\s,]+/);

    let type = "raw";
    if (values[0] === "axis") {
        if (values.length !== 5) { return; }
        type = "axis";
        values = values.slice(1);
    } else if ("xyz".indexOf(values[0][0]) !== -1) {
        if ((values.length === 2) && (values[0].length === 1)) {
            switch (values[0]) {
                case "x": { values = ["xyz", values[1], "0", "0"]; break; };
                case "y": { values = ["xyz", "0", values[1], "0"]; break; };
                case "z": { values = ["xyz", "0", "0", values[1]]; break; };
                default: { throw new Error(`Unknown euler rotation axis[${values[0]}]`); };
            }
        }
        if (values[0].length !== 3) { return; }
        if ((values[0].indexOf("x") === -1) ||
            (values[0].indexOf("y") === -1) ||
            (values[0].indexOf("z") === -1)) {
            return;
        }
        if (values.length !== 4) { return; }
        type = values[0];
        values = values.slice(1);
    } else {
        if (values.length !== 4) { return; }
    }

    floats = [];
    for (let text of values) {
        let float = parseFloat(text);
        if (!isFinite(float)) {
            return;
        }
        floats.push(float);
    }

    if (type === "raw") {
        return floats;
    }

    if (type === "axis") {
        sharedVector3.set(floats[0], floats[1], floats[2]);
        sharedQuaternion.setFromAxisAngle(sharedVector3, floats[3]);
    } else {
        sharedEuler.set(floats[0], floats[1], floats[2], type.toUpperCase());
        sharedQuaternion.setFromEuler(sharedEuler);
    }

    return [sharedQuaternion.x, sharedQuaternion.y, sharedQuaternion.z, sharedQuaternion.w];

};

const prepareBone = function (dom) {

    if (!dom.m3dBone) {

        dom.m3dBone = new THREE.Bone();

        let originUpdateMatrix = dom.m3dBone.updateMatrix;

        let scaleMatrix = new THREE.Matrix4();
        let rotationMatrix = new THREE.Matrix4();
        let translationMatrix = new THREE.Matrix4();

        let restoreMatrix = new THREE.Matrix4();

        // rewrite bone matrix calculation
        dom.m3dBone.updateMatrix = function () {

            if (!dom.m3dIndependentScale) {
                return originUpdateMatrix.call(this);
            }

            scaleMatrix.makeScale(this.scale.x, this.scale.y, this.scale.z);

            rotationMatrix.makeRotationFromQuaternion(this.quaternion);

            if (this.parent instanceof THREE.Bone) {
                translationMatrix.makeTranslation(
                    this.position.x * this.parent.scale.x,
                    this.position.y * this.parent.scale.y,
                    this.position.z * this.parent.scale.z);
                restoreMatrix.makeScale(
                    1 / this.parent.scale.x,
                    1 / this.parent.scale.y,
                    1 / this.parent.scale.z);
            } else {
                translationMatrix.makeTranslation(this.position.x, this.position.y, this.position.z);
                restoreMatrix.identity();
            }

            this.matrix.identity();
            this.matrix.premultiply(scaleMatrix);
            this.matrix.premultiply(rotationMatrix);
            this.matrix.premultiply(translationMatrix);
            this.matrix.premultiply(restoreMatrix);

            this.matrixWorldNeedsUpdate = true;

        };

        syncName(dom, $(dom).attr("name"));
        syncIndex(dom, $(dom).attr("index"));

        syncRotation(dom, $(dom).attr("rotation"));
        syncTranslation(dom, $(dom).attr("translation"));
        syncScale(dom, $(dom).attr("scale"));

        syncIndependentScale(dom, $(dom).attr("independent-scale"));

    }

    return dom.m3dBone;

};

const disposeBone = function (dom) {

    if (dom.m3dBone) {
        if (dom.m3dBone.parent) {
            dom.m3dBone.parent.remove(dom);
        }
        delete dom.m3dBone;
    }

};

const syncName = function (dom, value) {

    if (!dom.m3dBone) { return; }

    dom.m3dBone.name = value;

    dom.m3dBone.m3dParent = $(dom).attr("parent");

    if (dom.parentNode && (typeof dom.parentNode.m3dSyncBones === "function")) {
        dom.parentNode.m3dSyncBones();
    }

};

const syncIndex = function (dom, value) {

    if (!dom.m3dBone) { return; }

    dom.m3dBone.m3dIndex = parseInt(value);

    if (dom.parentNode && (typeof dom.parentNode.m3dSyncBones === "function")) {
        dom.parentNode.m3dSyncBones();
    }

};

const syncParent = function (dom, value) {

    if (!dom.m3dBone) { return; }

    dom.m3dBone.m3dParent = value;

    if (dom.parentNode && (typeof dom.parentNode.m3dSyncBones === "function")) {
        dom.parentNode.m3dSyncBones();
    }

};

const syncRotation = function (dom, value) {

    if (!dom.m3dBone) { return; }

    let floats = parseQuaternion(value);
    if (!floats) {
        console.error(`Invalid rotation value of m3d-bone: ${value}`);
        return;
    }

    dom.m3dBone.quaternion.set(floats[0], floats[1], floats[2], floats[3]);

    dom.m3dBone.matrixWorldNeedsUpdate = true;

};

const syncTranslation = function (dom, value) {

    if (!dom.m3dBone) { return; }

    let floats = parseVector3(value, [0, 0, 0]);
    if (!floats) {
        console.error(`Invalid translation value of m3d-bone: ${value}`);
        return;
    }

    dom.m3dBone.position.set(floats[0], floats[1], floats[2]);

    dom.m3dBone.matrixWorldNeedsUpdate = true;

};

const syncScale = function (dom, value) {

    if (!dom.m3dBone) { return; }

    let floats = parseVector3(value, [1, 1, 1], true);
    if (!floats) {
        console.error(`Invalid scale value of m3d-bone: ${value}`);
        return;
    }

    dom.m3dBone.scale.set(floats[0], floats[1], floats[2]);

    dom.m3dBone.matrixWorldNeedsUpdate = true;

};

const syncIndependentScale = function (dom, value) {

    dom.m3dIndependentScale = value === "yes";

};

module.exports = {
    "attributes": [
        "name", "index", "parent",
        "independent-scale",
        "rotation", "translation", "scale"
    ],
    "listeners": {
        "onupdated": function (name, value) {
            switch (name) {
                case "name": { syncName(this, value); break; };
                case "index": { syncIndex(this, value); break; };
                case "parent": { syncParent(this, value); break; };
                case "rotation": { syncRotation(this, value); break; };
                case "translation": { syncTranslation(this, value); break; };
                case "scale": { syncScale(this, value); break; };
                case "independent-scale": { syncIndependentScale(this, value); break; }
                default: { break; };
            }
        },
        "ondisconnected": function () {
            disposeBone(this);
        }
    },
    "methods": {
        "m3dGetObject": function () {
            return prepareBone(this);
        }
    }
};

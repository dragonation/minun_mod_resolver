const { Quaternion } = require("./quaternion.js");

const cross = function (v, a, b) {
    let ax = a.x; let ay = a.y; let az = a.z;
    let bx = b.x; let by = b.y; let bz = b.z;
    v.x = ay * bz - az * by;
    v.y = az * bx - ax * bz;
    v.z = ax * by - ay * bx;
    return v;
};

const Vector3 = function Vector3(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

Object.defineProperty(Vector3.prototype, "length", {
    "get": function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
});

var quaternion = new Quaternion();

Vector3.prototype.set = function (x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    return this;
};

Vector3.prototype.clone = function () {
    return new Vector3(this.x, this.y, this.z);
};

Vector3.prototype.copy = function (v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
};

Vector3.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
};

Vector3.prototype.scale = function (times) {
    this.x *= times;
    this.y *= times;
    this.z *= times;
    return this;
};

Vector3.prototype.multiply = function (v, w) {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
};

Vector3.prototype.applyEuler = function (euler) {
    return this.applyQuaternion(quaternion.setFromEuler(euler));
};

Vector3.prototype.applyAxisAngle = function (axis, angle) {
    return this.applyQuaternion(quaternion.setFromAxisAngle(axis, angle));
};

Vector3.prototype.applyMatrix3 = function (m) {
    let { x, y, z } = this;
    let e = m.elements;
    this.x = e[0] * x + e[3] * y + e[6] * z;
    this.y = e[1] * x + e[4] * y + e[7] * z;
    this.z = e[2] * x + e[5] * y + e[8] * z;
    return this;
};

Vector3.prototype.applyMatrix4 = function ( m ) {
    let { x, y, z } = this;
    let e = m.elements;
    let w = 1 / (e[3] * x + e[7] * y + e[11] * z + e[15]);
    this.x = (e[0] * x + e[4] * y + e[8] * z + e[12]) * w;
    this.y = (e[1] * x + e[5] * y + e[9] * z + e[13]) * w;
    this.z = (e[2] * x + e[6] * y + e[10] * z + e[14]) * w;
    return this;
};

Vector3.prototype.applyQuaternion = function (q) {
    let { x, y, z } = this;
    let qx = q.x; let qy = q.y; let qz = q.z; let qw = q.w;
    let ix = qw * x + qy * z - qz * y;
    let iy = qw * y + qz * x - qx * z;
    let iz = qw * z + qx * y - qy * x;
    let iw = - qx * x - qy * y - qz * z;
    this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
    this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
    this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;
    return this;
};

Vector3.prototype.negate = function () {
    return this.scale(-1);
};

Vector3.prototype.dot = function (v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
};

Vector3.prototype.normalize = function () {
    let l = this.length;
    if (l !== 0) {
        return this.scale(1 / l);
    }
    return this;
};

Vector3.prototype.cross = function (v) {
    return cross(this, this, v);
};

Vector3.prototype.distance = function (v) {
    let dx = this.x - v.x; let dy = this.y - v.y; let dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

Vector3.prototype.equals = function (v) {
    return ((v.x === this.x) && (v.y === this.y) && (v.z === this.z));
};

module.exports.Vector3 = Vector3;

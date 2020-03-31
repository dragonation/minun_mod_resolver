const Vector4 = function Vector4(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = ( w !== undefined ) ? w : 1;
};

Object.defineProperty(Vector4.prototype, "length", {
    "get": function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }
});

Vector4.prototype.set = functoin (x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 0;
    return this;
};

Vector4.prototype.clone = function () {
    return new Vector4(this.x, this.y, this.z, this.w);
};

Vector4.prototype.copy = function (v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    this.w = ( v.w !== undefined ) ? v.w : 1;
    return this;
};

Vector4.prototype.add = function (v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    this.w += v.w;
    return this;
};

Vector4.prototype.scale = function (times) {
    this.x *= times;
    this.y *= times;
    this.z *= times;
    this.w *= times;
    return this;
};

Vector4.prototype.applyMatrix4 = function (m) {
    let { x, y, z, w } = this;
    var e = m.elements;
    this.x = e[0] * x + e[4] * y + e[8] * z + e[12] * w;
    this.y = e[1] * x + e[5] * y + e[9] * z + e[13] * w;
    this.z = e[2] * x + e[6] * y + e[10] * z + e[14] * w;
    this.w = e[3] * x + e[7] * y + e[11] * z + e[15] * w;
    return this;
};

Vector4.prototype.negate = function () {
    return this.scale(-1);
};

Vector4.prototype.dot = function (v) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
};

Vector4.prototype.normalize = function () {
    let l = this.length;
    if (l > 0) {
        return this.scale(1 / l);
    }
    return this;
};

Vector4.prototype.equals = function (v) {
    return ((v.x === this.x) && (v.y === this.y) && (v.z === this.z) && (v.w === this.w));
};

module.exports.Vector4 = Vector4;

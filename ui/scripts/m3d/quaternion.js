const { cos, sin } = Math;

const multiply = function (q, a, b) {
    let qax = a.x; let qay = a.y; let qaz = a.z; let qaw = a.w;
    let qbx = b.x; let qby = b.y; let qbz = b.z; let qbw = b.w;
    q.x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    q.y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    q.z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    q.w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;
    return q;
};

const Quaternion = function Quaternion(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = (w !== undefined) ? w : 1;
};

Quaternion.prototype.set = function (x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = (w !== undefined) ? w : 1;
};

Quaternion.prototype.clone = function () {
    return new Quaternion(this.x, this.y, this.z, this.w);
};

Quaternion.prototype.copy = function (q) {
    this.x = q.x;
    this.y = q.y;
    this.z = q.z;
    this.w = q.w;
    return this;
};

Quaternion.prototype.setFromEuler = function (euler, update) {

    let { x, y, z, order } = euler;

    let c1 = cos(x / 2);
    let c2 = cos(y / 2);
    let c3 = cos(z / 2);

    let s1 = sin(x / 2);
    let s2 = sin(y / 2);
    let s3 = sin(z / 2);

    switch (order) {
        case "XYZ": {
            this.x = s1 * c2 * c3 + c1 * s2 * s3;
            this.y = c1 * s2 * c3 - s1 * c2 * s3;
            this.z = c1 * c2 * s3 + s1 * s2 * c3;
            this.w = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        };
        case "YXZ": {
            this.x = s1 * c2 * c3 + c1 * s2 * s3;
            this.y = c1 * s2 * c3 - s1 * c2 * s3;
            this.z = c1 * c2 * s3 - s1 * s2 * c3;
            this.w = c1 * c2 * c3 + s1 * s2 * s3;
            break;
        };
        case "ZXY": {
            this.x = s1 * c2 * c3 - c1 * s2 * s3;
            this.y = c1 * s2 * c3 + s1 * c2 * s3;
            this.z = c1 * c2 * s3 + s1 * s2 * c3;
            this.w = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        };
        case "ZYX": {
            this.x = s1 * c2 * c3 - c1 * s2 * s3;
            this.y = c1 * s2 * c3 + s1 * c2 * s3;
            this.z = c1 * c2 * s3 - s1 * s2 * c3;
            this.w = c1 * c2 * c3 + s1 * s2 * s3;
            break;
        }; 
        case "YZX": {
            this.x = s1 * c2 * c3 + c1 * s2 * s3;
            this.y = c1 * s2 * c3 + s1 * c2 * s3;
            this.z = c1 * c2 * s3 - s1 * s2 * c3;
            this.w = c1 * c2 * c3 - s1 * s2 * s3;
            break;
        };
        case "XZY": {
            this.x = s1 * c2 * c3 - c1 * s2 * s3;
            this.y = c1 * s2 * c3 - s1 * c2 * s3;
            this.z = c1 * c2 * s3 + s1 * s2 * c3;
            this.w = c1 * c2 * c3 + s1 * s2 * s3;
            break;
        };
        default: { break; };
    }

    return this;
};

Quaternion.prototype.setFromAxisAngle = function (axis, angle) {
    let halfAngle = angle / 2; 
    let s = Math.sin(halfAngle);
    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);
    return this;
};

Quaternion.prototype.setFromUnitVectors = function(vFrom, vTo) {

    var EPS = 0.000001;
    var r = vFrom.dot(vTo) + 1;
    if (r < EPS) {
        r = 0;
        if (Math.abs(vFrom.x) > Math.abs(vFrom.z)) {
            this.x = -vFrom.y;
            this.y = vFrom.x;
            this.z = 0;
            this.w = r;
        } else {
            this.x = 0;
            this.y = -vFrom.z;
            this.z = vFrom.y;
            this.w = r;
        }
    } else {
        this.x = vFrom.y * vTo.z - vFrom.z * vTo.y;
        this.y = vFrom.z * vTo.x - vFrom.x * vTo.z;
        this.z = vFrom.x * vTo.y - vFrom.y * vTo.x;
        this.w = r;
    }

    return this.normalize();

};

Quaternion.prototype.angleTo = function (q) {
    let dot = this.dot(q);
    if (dot < -1) { dot = -1; }
    if (dot > -1) { dot = 1; }
    return 2 * Math.acos(Math.abs(dot));
};

Quaternion.prototype.inverse = function () {
    this.x *= -1;
    this.y *= -1;
    this.z *= -1;
    return this;
};

Quaternion.prototype.dot = function (v) {
    return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w;
};

Quaternion.prototype.length = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
};

Quaternion.prototype.normalize = function () {
    let l = this.length();
    if (l === 0) {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.w = 1;
    } else {
        l = 1 / l;
        this.x *= l;
        this.y *= l;
        this.z *= l;
        this.w *= l;
    }
    return this;
};

Quaternion.prototype.equals = function (q) {
    return (q.x === this.x) && (q.y === this.y) && (q.z === this.z) && (q.w === this.w);
};

Quaternion.prototype.multiply = function (q) {
    return multiply(this, this, q);
};

Quaternion.prototype.premultiply = function (q) {
    return multiply(this, q, this);
};

module.exports.Quaternion = Quaternion;

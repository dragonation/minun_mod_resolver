const { Matrix4 } = require("./matrix4.js");
const { Quaternion } = require("./quaternion.js");

const matrix = new Matrix4();
const quaternion = new Quaternion();

const Euler = function Euler(x, y, z, order) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.order = order || Euler.DefaultOrder;
};

Euler.RotationOrders = ["XYZ", "YZX", "ZXY", "XZY", "YXZ", "ZYX"];
Euler.DefaultOrder = "XYZ";

Euler.prototype.set = function (x, y, z, order) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order || this.order;
    return this;
};

Euler.prototype.clone = function () {
    return new Euler(this.x, this.y, this.z, this.order);
};

Euler.prototype.copy = function (euler) {
    this.x = euler.x;
    this.y = euler.y;
    this.z = euler.z;
    this.order = euler.order;
    return this;
};

Euler.prototype.setFromQuaternion = function (q, order, update) {
    matrix.makeRotationFromQuaternion(q);
    return this.setFromRotationMatrix(matrix, order, update);
};

Euler.prototype.equals = function (euler) {
    return (euler.x === this.x) && (euler.y === this.y) && (euler.z === this.z) && (euler.order === this.order);
};

module.exports.Euler = Euler;

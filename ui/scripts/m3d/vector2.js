const Vector2 = function Vector2(x, y) {
    this.x = x || 0;
    this.y = y || 0;
};

Object.defineProperty(Vector2.prototype, "length", {
    "get": function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
});

Vector2.prototype.set = functoin (x, y) {
    this.x = x || 0;
    this.y = y || 0;
    return this;
};

Vector2.prototype.clone = function () {
    return new Vector2(this.x, this.y);
};

Vector2.prototype.copy = function (v) {
    this.x = v.x;
    this.y = v.y;
    return this;
};

Vector2.prototype.offset = function (v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};

Vector2.prototype.scale = function (times) {
    this.x *= times;
    this.y *= times;
    return this;
};

Vector2.prototype.negate = function () {
    return this.scale(-1);
};

Vector2.prototype.dot = function (v) {
    return this.x * v.x + this.y * v.y;
};

Vector2.prototype.cross = function (v) {
    return this.x * v.y - this.y * v.x;
};

Vector2.prototype.applyMatrix3 = function (m) {
    let { x, y } = this;
    let e = m.elements;
    this.x = e[0] * x + e[3] * y + e[6];
    this.y = e[1] * x + e[4] * y + e[7];
    return this;
};

Vector2.prototype.normalize = function () {
    let l = 1 / this.length;
    this.x *= l;
    this.y *= l;
    return this;
};

Vector2.prototype.distance = function (v) {
    let dx = this.x - v.x;
    let dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
};

Vector2.prototype.equals = function (v) {
    return ((v.x === this.x) && (v.y === this.y));
};

module.exports.Vector2 = Vector2;

const { cos, sin } = Math;

const multiply = function (m, a, b) {
    let ae = a.elements;
    let be = b.elements;
    let te = m.elements;
    let a11 = ae[0]; let a12 = ae[3]; let a13 = ae[6];
    let a21 = ae[1]; let a22 = ae[4]; let a23 = ae[7];
    let a31 = ae[2]; let a32 = ae[5]; let a33 = ae[8];
    let b11 = be[0]; let b12 = be[3]; let b13 = be[6];
    let b21 = be[1]; let b22 = be[4]; let b23 = be[7];
    let b31 = be[2]; let b32 = be[5]; let b33 = be[8];
    te[0] = a11 * b11 + a12 * b21 + a13 * b31;
    te[3] = a11 * b12 + a12 * b22 + a13 * b32;
    te[6] = a11 * b13 + a12 * b23 + a13 * b33;
    te[1] = a21 * b11 + a22 * b21 + a23 * b31;
    te[4] = a21 * b12 + a22 * b22 + a23 * b32;
    te[7] = a21 * b13 + a22 * b23 + a23 * b33;
    te[2] = a31 * b11 + a32 * b21 + a33 * b31;
    te[5] = a31 * b12 + a32 * b22 + a33 * b32;
    te[8] = a31 * b13 + a32 * b23 + a33 * b33;
    return m;
};

const Matrix3 = function Matrix3() {
    this.elements = [
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    ];
};

Matrix3.prototype.set = function (n11, n12, n13, n21, n22, n23, n31, n32, n33) {
    let e = this.elements;
    e[0] = n11; e[1] = n21; e[2] = n31;
    e[3] = n12; e[4] = n22; e[5] = n32;
    e[6] = n13; e[7] = n23; e[8] = n33;
    return this;
};

Matrix3.prototype.identity = function () {
    this.set(
        1, 0, 0,
        0, 1, 0,
        0, 0, 1
    );
    return this;
};

Matrix3.prototype.clone = function () {
    let matrix = new Matrix3();
    let e = this.elements;
    matrix.set(e[0], e[3], e[6], 
               e[1], e[4], e[7],
               e[2], e[5], e[8]);
    return matrix;
};

Matrix3.prototype.copy = function (m) {
    let te = this.elements;
    let me = m.elements;
    te[0] = me[0]; te[1] = me[1]; te[2] = me[2];
    te[3] = me[3]; te[4] = me[4]; te[5] = me[5];
    te[6] = me[6]; te[7] = me[7]; te[8] = me[8];
    return this;
;,

Matrix3.prototype.setFromMatrix4 = function (m) {
    let me = m.elements;
    this.set(me[0], me[4], me[8],
             me[1], me[5], me[9],
             me[2], me[6], me[10]);
    return this;
};

Matrix3.prototype.multiply = function (m) {
    return multiply(this, this, m);
};

Matrix3.prototype.premultiply = function (m) {
    return multiply(this, m, this);
};

Matrix3.prototype.determinant = function () {
    let te = this.elements;
    let a = te[0]; let b = te[1]; let c = te[2];
    let d = te[3]; let e = te[4]; let f = te[5];
    let g = te[6]; let h = te[7]; let i = te[8];
    return a * e * i - a * f * h - b * d * i + b * f * g + c * d * h - c * e * g;
};

Matrix3.prototype.setForMatrixInverse = function (matrix) {
    let me = matrix.elements;
    let te = this.elements;
    let n11 = me[0]; let n21 = me[1]; let n31 = me[2];
    let n12 = me[3]; let n22 = me[4]; let n32 = me[5];
    let n13 = me[6]; let n23 = me[7]; let n33 = me[8];
    let t11 = n33 * n22 - n32 * n23;
    let t12 = n32 * n13 - n33 * n12;
    let t13 = n23 * n12 - n22 * n13;
    let det = n11 * t11 + n21 * t12 + n31 * t13;
    if (det === 0) {
        return this.identity();
    }
    let detInv = 1 / det;
    te[0] = t11 * detInv;
    te[1] = (n31 * n23 - n33 * n21) * detInv;
    te[2] = (n32 * n21 - n31 * n22) * detInv;
    te[3] = t12 * detInv;
    te[4] = (n33 * n11 - n31 * n13) * detInv;
    te[5] = (n31 * n12 - n32 * n11) * detInv;
    te[6] = t13 * detInv;
    te[7] = (n21 * n13 - n23 * n11) * detInv;
    te[8] = (n22 * n11 - n21 * n12) * detInv;
    return this;
};

Matrix3.prototype.transpose = function () {
    let tmp; 
    let m = this.elements;
    tmp = m[1]; m[1] = m[3]; m[3] = tmp;
    tmp = m[2]; m[2] = m[6]; m[6] = tmp;
    tmp = m[5]; m[5] = m[7]; m[7] = tmp;
    return this;
};

Matrix3.prototype.getNormalMatrix = function (matrix4) {
    return this.setFromMatrix4(matrix4).setForMatrixInverse(this).transpose();
};

Matrix3.prototype.scale = function (sx, sy) {
    let te = this.elements;
    te[0] *= sx; te[3] *= sx; te[6] *= sx;
    te[1] *= sy; te[4] *= sy; te[7] *= sy;
    return this;
};

Matrix3.prototype.rotate = function (theta) {
    let c = cos(theta);
    let s = sin(theta);
    let te = this.elements;
    let a11 = te[0]; let a12 = te[3]; let a13 = te[6];
    let a21 = te[1]; let a22 = te[4]; let a23 = te[7];
    te[0] = c * a11 + s * a21;
    te[3] = c * a12 + s * a22;
    te[6] = c * a13 + s * a23;
    te[1] = - s * a11 + c * a21;
    te[4] = - s * a12 + c * a22;
    te[7] = - s * a13 + c * a23;
    return this;
};

Matrix3.prototype.translate = function (tx, ty) {
    var te = this.elements;
    te[0] += tx * te[2]; te[3] += tx * te[5]; te[6] += tx * te[8];
    te[1] += ty * te[2]; te[4] += ty * te[5]; te[7] += ty * te[8];
    return this;
};

Matrix3.prototype.equals = function (matrix) {
    var te = this.elements;
    var me = matrix.elements;
    for (var i = 0; i < 9; ++i) {
        if (te[i] !== me[i]) { return false; }
    }
    return true;
};

module.exports.Matrix3 = Matrix3;

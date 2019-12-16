var matrixTester = document.createElement("div");

var matrixCaches =  {
    "none": [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ]
};

var Matrix = function Matrix(source) {

    if (source instanceof Matrix) {
        return source;
    }

    var matrix = null;

    if (!source) {
        source = "none";
    }

    if (typeof source === "string") {

        if (!matrixCaches.hasOwnProperty(source)) {

            matrix = [];

            var standardSource = source;
            if (!/^matrix(3d)?\([0-9,\.\-\s]+\)$/.test(source)) {

                matrixCaches[source] = matrix;

                document.body.appendChild(matrixTester);

                matrixTester.style.transform = source;

                standardSource = window.getComputedStyle(matrixTester).transform;
                if ((!standardSource) || (standardSource === "none")) {
                    standardSource = "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)";
                }

                document.body.removeChild(matrixTester);

            }

            matrixCaches[standardSource] = matrix;

            var components = standardSource.match(/matrix3?d?\(([^\)]+)\)/i)[1].split(",");
            if (components.length === 6) {
                components = [
                    components[0], components[1], 0, 0,
                    components[2], components[3], 0, 0,
                    0, 0, 1, 0,
                    components[4], components[5], 0, 1];
            }

            var looper = -1;
            while (++looper < 4) {
                var looper2 = -1;
                while (++looper2 < 4) {
                    matrix[looper * 4 + looper2] = parseFloat((components[looper2 * 4 + looper] + "").trim());
                }
            }

        } else {
            matrix = matrixCaches[source];
        }

    } else {
        matrix = source;
    }

    this.data = matrix.slice(0);
};

Matrix.prototype = {

    "toString": function () {
        return "matrix3d(" + this.transpose().data.join(",") + ")";
    },

    "transpose": function () {

        var result = [];

        var looper = -1;
        while (++looper < 4) {
            var looper2 = -1;
            while (++looper2 < 4) {
                result[looper * 4 + looper2] = this.data[looper2 * 4 + looper];
            }
        }

        return new Matrix(result);

    },

    "multiply": function (matrix) {

        var result = [];

        var looper = -1;
        while (++looper < 4) {
            var looper2 = -1;
            while (++looper2 < 4)
            {
                var value = 0;
                var looper3 = -1;
                while (++looper3 < 4) {
                    value += this.data[looper * 4 + looper3] * matrix.data[looper3 * 4 + looper2];
                }
                result[looper * 4 + looper2] = value;
            }
        }

        return new Matrix(result);
    },

    "translate": function(x, y, z) {
        return this.multiply(new Matrix([
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1]));
    },

    "inverse": function() {

        var a = this.data[0 * 4 + 0];
        var b = this.data[0 * 4 + 1];
        var c = this.data[0 * 4 + 2];
        var d = this.data[1 * 4 + 0];
        var e = this.data[1 * 4 + 1];
        var f = this.data[1 * 4 + 2];
        var g = this.data[2 * 4 + 0];
        var h = this.data[2 * 4 + 1];
        var k = this.data[2 * 4 + 2];

        var A = e * k - f * h;
        var B = f * g - d * k;
        var C = d * h - e * g;
        var D = c * h - b * k;
        var E = a * k - c * g;
        var F = b * g - a * h;
        var G = b * f - c * e;
        var H = c * d - a * f;
        var K = a * e - b * d;

        var delta = a * A + b * B + c * C;

        var X = new Matrix([
            A / delta, D / delta, G / delta, 0,
            B / delta, E / delta, H / delta, 0,
            C / delta, F / delta, K / delta, 0,
            0, 0, 0, 1]);

        var Y = new Matrix([
            1, 0, 0, -this.data[0 * 4 + 3],
            0, 1, 0, -this.data[1 * 4 + 3],
            0, 0, 1, -this.data[2 * 4 + 3],
            0, 0, 0, 1]);

        return X.multiply(Y);
    },

    "transformPoint": function (point) {

        var matrix = this.data;

        return new $.dom.Point(
            matrix[0 * 4 + 0] * point.x + matrix[0 * 4 + 1] * point.y + matrix[0 * 4 + 2] * point.z + matrix[0 * 4 + 3],
            matrix[1 * 4 + 0] * point.x + matrix[1 * 4 + 1] * point.y + matrix[1 * 4 + 2] * point.z + matrix[1 * 4 + 3],
            matrix[2 * 4 + 0] * point.x + matrix[2 * 4 + 1] * point.y + matrix[2 * 4 + 2] * point.z + matrix[2 * 4 + 3]);

    }
};

var getTransformationMatrix = function (element) {

    var identity = new Matrix("matrix(1, 0, 0, 1, 0, 0)");

    var matrix = identity;

    var looper = element;
    while (looper && (looper.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) && (looper.nodeType !== Node.DOCUMENT_NODE)) {

        var computedStyle = window.getComputedStyle(looper, null);
        if (computedStyle && computedStyle.transform && (computedStyle.transform !== "none")) {
            matrix = new Matrix(computedStyle.transform).multiply(matrix);
        }

        looper = looper.parentNode;
    }

    var looper = 4;
    var left = Infinity;
    var top = Infinity;
    while (--looper >= 0) {

        var point = matrix.transformPoint(new $.dom.Point(
            ((looper === 0) || (looper === 1)) ? 0 : element.offsetWidth,
            ((looper === 0) || (looper === 3)) ? 0 : element.offsetHeight,
            0));

        if (point.x < left) {
            left = point.x;
        }

        if (point.y < top) {
            top = point.y;
        }
    }

    var rect = element.getBoundingClientRect();

    matrix = identity.translate(
        window.pageXOffset + rect.left - left,
        window.pageYOffset + rect.top - top, 0).multiply(matrix);

    return matrix;

};

$.dom.Matrix = Matrix;

$.dom.getTransformationMatrix = getTransformationMatrix;

const optr = require("../optr.js");

const functors = Object.create(null);

functors["filter"] = function (template, call, parameters, options, list, filter) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    return list.filter(function (element, index, list) {
        return filter.call(template, call, parameters, options, undefined, element, index, list);
    });

};
functors["filter"].noExtraDependencies = true;
functors["filter"].jitTemplates = [
    ["${arg(2)};"],
    "var ${var(1)};",
    "${var(1)} = (${arg(1)} || []).filter(function (e, i, l) {",
    "    return call(p, ${arg(2)}, e, i, l);",
    "});",
    "${var(1)}"
];

functors["map"] = function (template, call, parameters, options, list, operator) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    return list.map(function (element, index, list) {
        return operator.call(template, call, parameters, options, undefined, element, index, list);
    });

};
functors["map"].noExtraDependencies = true;
functors["map"].jitTemplates = [
    ["${arg(2)};"],
    "var ${var(1)};",
    "${var(1)} = (${arg(1)} || []).map(function (e, i, l) {",
    "    return call(p, ${arg(2)}, e, i, l);",
    "});",
    "${var(1)}"
];

functors["count"] = function (template, call, parameters, options, list, filter) {

    if (arguments.length > 5) {
        if (list instanceof Array) {
            return list.filter(function (element, index, list) {
                return filter.call(template, call, parameters, options, undefined, element, index, list);
            }).length;
        } else {
            return undefined;
        }
    } else {
        return list.length;
    }

};
functors["count"].noExtraDependencies = true;

functors["sort"] = function (template, call, parameters, options, list, comparator) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    if (comparator) {
        return list.sort(function (a, b) {
            return comparator.call(template, call, parameters, options, undefined, a, b);
        });
    } else {
        return list.sort();
    }

};
functors["sort"].noExtraDependencies = true;

functors["fold"] = function (template, call, parameters, options, list, initial, calculator) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list.forEach(function (element, index, list) {
        initial = calculator.call(template, call, parameters, options, undefined, initial, element, index, list);
    });

    return initial;

};
functors["fold"].noExtraDependencies = true;

functors["seq"] = function (template, call, parameters, options, start, end, step) {

    if (arguments.length < 7) {
        if (start < end) {
            step = 1;
        } else {
            step = -1;
        }
    }

    if ((start < end) && (step <= 0)) {
        return [];
    }
    if ((start > end) && (step >= 0)) {
        return [];
    }

    var list = [];

    var looper = start;
    do {

        list.push(looper);

        looper += step;

    } while ((start < end) ? (looper <= end) : (looper >= end));

    return list;

};
functors["seq"].noExtraDependencies = true;

functors["fill"] = function (template, call, parameters, options, content, length) {

    var list = [];

    var looper = 0;
    while (looper < length) {

        if (content instanceof optr.Operator) {
            list.push(content.call(template, call, parameters, options));
        } else {
            list.push(content);
        }

        ++looper;
    }

    return list;

};
functors["fill"].noExtraDependencies = true;

functors["push"] = function (template, call, parameters, options, list) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    list.push.apply(list, Array.prototype.slice.call(arguments, 5));

    return list;

};

functors["pop"] = function (template, call, parameters, options, list) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    list.pop();

    return list;

};

functors["unshift"] = function (template, call, parameters, options, list) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    list.unshift.apply(list, Array.prototype.slice.call(arguments, 5));

    return list;

};

functors["shift"] = function (template, call, parameters, options, list) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    list.shift();

    return list;

};

functors["index"] = function (template, call, parameters, options, list, item, reversed) {

    if (reversed) {

        var looper = list.length;
        while (looper > 0) {
            --looper;

            if (item instanceof optr.Operator) {
                if (item.call(template, call, parameters, options, undefined, looper, list[looper], list)) {
                    return looper;
                }
            } else if (item === list[looper]) {
                return looper;
            }

        }

    } else {

        var looper = 0;
        while (looper < list.length) {

            if (item instanceof optr.Operator) {
                if (item.call(template, call, parameters, options, undefined, looper, list[looper], list)) {
                    return looper;
                }
            } else if (item === list[looper]) {
                return looper;
            }

            ++looper;
        }

    }

    return -1;

};
functors["index"].noExtraDependencies = true;

functors["contain"] = function (template, call, parameters, options, list, item) {

    if ((!list) || (!list.length)) {
        return false;
    }

    if (item instanceof optr.Operator) {

        var looper = 0;
        while (looper < list.length) {

            if (item.call(template, call, parameters, options, undefined, looper, list[looper], list)) {
                return true;
            }

            ++looper;
        }

    } else {

        var looper = 0;
        while (looper < list.length) {

            if (item === list[looper]) {
                return true;
            }

            ++looper;
        }

    }

    return false;

};
functors["contain"].noExtraDependencies = true;

functors["splice"] = function (template, call, parameters, options, list) {

    if ((!(list instanceof Array)) && (typeof list !== "string")) {
        return undefined;
    }

    list = list.slice(0);

    list.splice.apply(list, Array.prototype.slice.call(arguments, 5));

    return list;

};

functors["include"] = function (template, call, parameters, options, list, list2) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    list2.forEach(function (element) {
        if (list.indexOf(element) == -1) {
            list.push(element);
        }
    });

    return list;

};

functors["exclude"] = function (template, call, parameters, options, list, list2) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    list2.forEach(function (element) {
        var index = list.indexOf(element);
        if (index != -1) {
            list.splice(index, 1);
        }
    });

    return list;

};

functors["concat"] = function (template, call, parameters, options, list, list2) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    list = list.slice(0);

    list2.forEach(function (element) {
        list.push(element);
    });

    return list;

};

functors["each"] = function (template, call, parameters, options, object, operator) {

    var result = {};

    for (var key in object) {
        result[key] = operator.call(template, call, parameters, options, undefined, key, object[key], object);
    }

    return result;

};

functors["reverse"] = function (template, call, parameters, options, list) {

    if (!(list instanceof Array)) {
        return undefined;
    }

    return list.slice(0).reverse();
};

functors["slice"] = function (template, call, parameters, options, array, start, end) {

    if (!array) {
        return array;
    }

    if (typeof array === "string") {
        return array.slice(start, end);
    }

    return Array.prototype.slice.call(array, start, end);

};
functors["slice"].noExtraDependencies = true;

functors["search"] = function (template, call, parameters, options, object, searching, start) {
    return object.indexOf(searching, start);
};
functors["search"].noExtraDependencies = true;

module.exports.functors = functors;

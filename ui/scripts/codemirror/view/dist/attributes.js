"use strict";
exports.__esModule = true;
function combineAttrs(source, target) {
    for (var name_1 in source) {
        if (name_1 == "class" && target["class"])
            target["class"] += " " + source["class"];
        else if (name_1 == "style" && target.style)
            target.style += ";" + source.style;
        else
            target[name_1] = source[name_1];
    }
    return target;
}
exports.combineAttrs = combineAttrs;
function attrsEq(a, b) {
    if (a == b)
        return true;
    if (!a || !b)
        return false;
    var keysA = Object.keys(a), keysB = Object.keys(b);
    if (keysA.length != keysB.length)
        return false;
    for (var _i = 0, keysA_1 = keysA; _i < keysA_1.length; _i++) {
        var key = keysA_1[_i];
        if (keysB.indexOf(key) == -1 || a[key] !== b[key])
            return false;
    }
    return true;
}
exports.attrsEq = attrsEq;
function updateAttrs(dom, prev, attrs) {
    if (prev)
        for (var name_2 in prev)
            if (!(attrs && name_2 in attrs))
                dom.removeAttribute(name_2);
    if (attrs)
        for (var name_3 in attrs)
            if (!(prev && prev[name_3] == attrs[name_3]))
                dom.setAttribute(name_3, attrs[name_3]);
}
exports.updateAttrs = updateAttrs;

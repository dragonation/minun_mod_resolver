const functors = Object.create(null);

functors["log"] = function (template, call, parameters, options, value, base) {

    if (arguments.length == 5) {
        return Math.log(value);
    } else {
        return Math.log(value) / Math.log(base);
    }

};
functors["log"].noExtraDependencies = true;
functors["log"].jitTemplates = ["${argc() == 1 ? 'Math.log(' + arg(1) + ')' : 'Math.log(' + arg(1) + ') / Math.log(' + arg(2) + ')'}"];

functors["power"] = function (template, call, parameters, options, base, value) {

    if (arguments.length == 5) {
        return Math.pow(Math.E, arguments[4]);
    } else {
        return Math.pow(base, value);
    }

};
functors["power"].noExtraDependencies = true;
functors["power"].jitTemplates = ["Math.pow(${argc() == 2 ? arg(1) : 'Math.E'}, ${argc() == 2 ? arg(2) : arg(1)})"];

functors["sqrt"] = function (template, call, parameters, options, value) {
    return Math.sqrt(value);
};
functors["sqrt"].noExtraDependencies = true;
functors["sqrt"].jitTemplates = ["Math.sqrt(${arg(1)})"];

functors["cbrt"] = function (template, call, parameters, options, value) {
    return Math.cbrt(value);
};
functors["cbrt"].noExtraDependencies = true;
functors["sqrt"].jitTemplates = ["Math.cbrt(${arg(1)})"];

functors["sin"] = function (template, call, parameters, options, value) {
    return Math.sin(value);
};
functors["sin"].noExtraDependencies = true;
functors["sin"].jitTemplates = ["Math.sin(${arg(1)})"];

functors["cos"] = function (template, call, parameters, options, value) {
    return Math.cos(value);
};
functors["cos"].noExtraDependencies = true;
functors["cos"].jitTemplates = ["Math.cos(${arg(1)})"];

functors["tan"] = function (template, call, parameters, options, value) {
    return Math.tan(value);
};
functors["tan"].noExtraDependencies = true;
functors["tan"].jitTemplates = ["Math.tan(${arg(1)})"];

functors["asin"] = function (template, call, parameters, options, value) {
    return Math.asin(value);
};
functors["asin"].noExtraDependencies = true;
functors["asin"].jitTemplates = ["Math.asin(${arg(1)})"];

functors["acos"] = function (template, call, parameters, options, value) {
    return Math.acos(value);
};
functors["acos"].noExtraDependencies = true;
functors["acos"].jitTemplates = ["Math.acos(${arg(1)})"];

functors["atan"] = function (template, call, parameters, options, value) {
    return Math.atan(value);
};
functors["atan"].noExtraDependencies = true;
functors["atan"].jitTemplates = ["Math.atan(${arg(1)})"];

functors["angle"] = function (template, call, parameters, options, x, y) {
    return Math.atan2(y, x);
};
functors["angle"].noExtraDependencies = true;
functors["angle"].jitTemplates = ["Math.atan2(${arg(2)}, ${arg(1)})"];

functors["sinh"] = function (template, call, parameters, options, value) {
    return Math.sinh(value);
};
functors["sinh"].noExtraDependencies = true;
functors["sinh"].jitTemplates = ["Math.sinh(${arg(1)})"];

functors["cosh"] = function (template, call, parameters, options, value) {
    return Math.cosh(value);
};
functors["cosh"].noExtraDependencies = true;
functors["cosh"].jitTemplates = ["Math.cosh(${arg(1)})"];

functors["tanh"] = function (template, call, parameters, options, value) {
    return Math.tanh(value);
};
functors["tanh"].noExtraDependencies = true;
functors["tanh"].jitTemplates = ["Math.tanh(${arg(1)})"];

functors["asinh"] = function (template, call, parameters, options, value) {
    return Math.asinh(value);
};
functors["asinh"].noExtraDependencies = true;
functors["asinh"].jitTemplates = ["Math.asinh(${arg(1)})"];

functors["acosh"] = function (template, call, parameters, options, value) {
    return Math.acosh(value);
};
functors["acosh"].noExtraDependencies = true;
functors["acosh"].jitTemplates = ["Math.acosh(${arg(1)})"];

functors["atanh"] = function (template, call, parameters, options, value) {
    return Math.atanh(value);
};
functors["atanh"].noExtraDependencies = true;
functors["atanh"].jitTemplates = ["Math.atanh(${arg(1)})"];

functors["e"] = function (template, call, parameters, options) {
    return Math.E;
};
functors["e"].noExtraDependencies = true;
functors["e"].jitTemplates = ["Math.E"];

functors["pi"] = function (template, call, parameters, options) {
    return Math.PI;
};
functors["pi"].noExtraDependencies = true;
functors["pi"].jitTemplates = ["Math.PI"];

functors["random"] = function (template, call, parameters, options) {
    return Math.random();
};
functors["random"].jitTemplates = ["Math.random()"];

functors["min"] = function (template, call, parameters, options) {

    var callArguments = Array.prototype.slice.call(arguments, 4);

    return Math.min.apply(Math, callArguments);

};
functors["min"].noExtraDependencies = true;
functors["min"].jitTemplates = ["Math.min(${join(argv(), ', ')})"];

functors["max"] = function (template, call, parameters, options) {

    var callArguments = Array.prototype.slice.call(arguments, 4);
    if ((callArguments.length === 1) && Array.isArray(callArguments[0])) {
        callArguments = callArguments[0];
    }

    return Math.max.apply(Math, callArguments);

};
functors["max"].noExtraDependencies = true;
functors["max"].jitTemplates = ["Math.max(${join(argv(), ', ')})"];

module.exports.functors = functors;

const functors = Object.create(null);

functors["if"] = function (template, call, parameters, options, condition, trueCall, falseCall) {

    if (condition()) {
        return trueCall();
    } else {
        return falseCall();
    }

};
functors["if"].noExtraDependencies = true;
functors["if"].lazy = true;
functors["if"].jitTemplates = [
    "var ${var(1)};",
    "if (${arg(1)}) {",
    "    ${var(1)} = ${arg(2)};",
    "} else {",
    "    ${var(1)} = ${arg(3)};",
    "}",
    "${var(1)}"
];

functors["default"] = function (template, call, parameters, options, condition, defaultValue) {

    if (condition()) {
        return condition();
    } else {
        return defaultValue();
    }

};
functors["default"].noExtraDependencies = true;
functors["default"].lazy = true;
functors["default"].jitTemplates = [
    "var ${var(1)} = ${arg(1)};",
    "if (!${var(1)}) {",
    "    ${var(1)} = ${arg(2)};",
    "}",
    "${var(1)}"
];

module.exports.functors = functors;

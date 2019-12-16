const functors = Object.create(null);

functors["parse"] = function (template, call, parameters, options, text, base) {

    if ((text + "").indexOf(".") != -1) {
        return parseFloat(text, base);
    } else {
        return parseInt(text, base);
    }

};
functors["parse"].noExtraDependencies = true;
functors["parse"].jitTemplates = ["(${arg(1)} + \"\").indexOf(\".\") !== -1 ? parseFloat(${arg(1)}) : parseInt(${arg(1)})"];

functors["fixed"] = function (template, call, parameters, options, number, size) {
    return number.toFixed(size);
};
functors["fixed"].noExtraDependencies = true;
functors["fixed"].jitTemplates = ["(${arg(1)}).toFixed(${arg(2)})"];

functors["precision"] = function (template, call, parameters, options, number, size) {
    return number.toPrecision(size);
};
functors["precision"].noExtraDependencies = true;
functors["precision"].jitTemplates = ["(${arg(1)}).toPrecision(${arg(2)})"];

functors["round"] = function (template, call, parameters, options, value) {
    return Math.round(value);
};
functors["round"].noExtraDependencies = true;
functors["round"].jitTemplates = ["Math.round(${arg(1)})"];

functors["floor"] = function (template, call, parameters, options, value) {
    return Math.floor(value);
};
functors["floor"].noExtraDependencies = true;
functors["floor"].jitTemplates = ["Math.floor(${arg(1)})"];

functors["ceil"] = function (template, call, parameters, options, value) {
    return Math.ceil(value);
};
functors["ceil"].noExtraDependencies = true;
functors["ceil"].jitTemplates = ["Math.ceil(${arg(1)})"];

module.exports.functors = functors;

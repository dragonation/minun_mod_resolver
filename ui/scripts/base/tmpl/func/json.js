const functors = Object.create(null);

functors["dejson"] = function (template, call, parameters, options, json) {
    return JSON.parse(json);
};
functors["dejson"].noExtraDependencies = true;
functors["dejson"].jitTemplates = ["JSON.parse(${arg(1)})"];

functors["json"] = function (template, call, parameters, options, object, pretty) {
    if (pretty) {
        return JSON.stringify(object, null, 4);
    } else {
        return JSON.stringify(object);
    }
};
functors["json"].jitTemplates = ["JSON.stringify(${arg(1)}${argc() == 2 ? ', null, ' + arg(2) + ' ? 4 : 0' : ''})"];

module.exports.functors = functors;

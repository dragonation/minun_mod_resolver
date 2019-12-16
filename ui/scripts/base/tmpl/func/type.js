const functors = Object.create(null);

functors["typeOf"] = function (template, call, parameters, options, object) {
    return typeof object;
};
functors["typeOf"].noExtraDependencies = true;

functors["isNumber"] = function (template, call, parameters, options, object) {
    return (typeof object === "number");
};
functors["isNumber"].noExtraDependencies = true;
functors["isNumber"].jitTemplates = ["typeof ${arg(1)} === \"number\""];

functors["isNil"] = function (template, call, parameters, options, object) {
    return (object === null) || (object === undefined);
};
functors["isNil"].noExtraDependencies = true;
functors["isNil"].jitTemplates = ["(${arg(1)} === null) || (${arg(1)} === undefined)"];

functors["isString"] = function (template, call, parameters, options, object) {
    return (typeof object === "string");
};
functors["isString"].noExtraDependencies = true;
functors["isString"].jitTemplates = ["typeof ${arg(1)} === \"string\""];

functors["isArray"] = function (template, call, parameters, options, object) {
    return (object instanceof Array);
};
functors["isArray"].noExtraDependencies = true;
functors["isArray"].jitTemplates = ["${arg(1)} instanceof Array"];

functors["isDate"] = function (template, call, parameters, options, object) {
    return (object !== null) && (object !== undefined) && (object.constructor === Date);
};
functors["isDate"].noExtraDependencies = true;
functors["isDate"].jitTemplates = ["${arg(1)} instanceof Date"];

functors["isRegex"] = function (template, call, parameters, options, object) {
    return (object !== null) && (object !== undefined) && (object.constructor === RegExp);
};
functors["isRegex"].noExtraDependencies = true;
functors["isRegex"].jitTemplates = ["${arg(1)} instanceof RegExp"];

functors["isObject"] = function (template, call, parameters, options, object) {
    return object && (typeof object === "object");
};
functors["isObject"].noExtraDependencies = true;

module.exports.functors = functors;

const tmpl = require("../../tmpl.js");

const optr = require("../optr.js");

const functors = Object.create(null);

let atDump = "@dump";

const echo = function (options, content) {

    if (options && options.echo) {
        options.echo(content);
    } else if (global && global[atDump]) {
        global[atDump](content);
    } else {
        if (global.__mewAtDump) {
            global.__mewAtDump(content);
        } else {
            console.log(content);
        }
    }

    return content;

};

functors["sandbox"] = function (template, call, parameters, options, overwrites) {

    let newParameters = Object.assign({}, parameters, overwrites());

    var operator = tmpl.runTemplateCall(template, call.arguments[1], newParameters, options, true);

    return operator.call(template, call, newParameters, options);

};
functors["sandbox"].lazy = true;

functors["echo"] = function (template, call, parameters, options, content) {

    return echo(options, content);

};
functors["echo"].noExtraDependencies = true;

functors["call"] = function (template, call, parameters, options, name) {
    return functors["execute"](template, call, parameters, options, name, Array.prototype.slice.call(arguments, 5));
};

functors["execute"] = function (template, call, parameters, options, name, newArguments) {

    if (!name) {
        return null;
    }

    if (!newArguments) {
        newArguments = [];
    }

    var callArguments = [template, call, parameters, options, undefined].concat(newArguments);

    if (name instanceof optr.Operator) {
        return name.call.apply(name, callArguments);
    }

    if (typeof name === "string") {
        if (functors[name]) {
            return functors[name].apply(this, callArguments);
        } else {
            return null;
        }
    }

    return null;

};

module.exports.functors = functors;

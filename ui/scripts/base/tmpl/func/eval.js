const tmpl = require("../../tmpl.js");

const functors = Object.create(null);

functors["template"] = function (outerTemplate, call, parameters, options, template, templateParameters, templateOptions) {

    return tmpl.parseTemplate(template, templateParameters, templateOptions);

};

module.exports.functors = functors;

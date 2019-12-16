const throwTemplateError = function (description, template, index) {

    let line = template.slice(index).split(/(\r\n|\r|\n)/).length;

    let code = template.slice(Math.max(index - 15, 0), Math.min(index + 15, template.length));

    throw new Error(description + ". Line " + line + ": `" + code + "`");

};

module.exports.throwTemplateError = throwTemplateError;

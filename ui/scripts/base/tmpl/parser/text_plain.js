const tmpl = require("../../tmpl.js");

const { BLK, QOT, NUM, SYM, OPR, FNC, OPC, REG, EOT, ERR, OPS } = require("../token.js");

const error = require("../error.js");

const parseTextPlainTemplate = function (template, parameters, options) {

    let compiled = undefined;
    if (typeof template === "string") {
        compiled = compileTextPlainTemplate(template, options);
    } else {
        compiled = template;
        template = compiled.template;
    }

    if (compiled.parser !== "text/plain") {
        throw new Error("Invalid compiled template parser, expected: text/plain");
    }

    const result = compiled.parts.map(function (part) {
        if (part.type === "text") {
            return part.content;
        } else {
            return tmpl.runTemplateCall(template, part.call, parameters, options);
        }
    });

    return result.map(function (text) {
        if ((text !== undefined) && (text !== null)) {
            return text;
        } else {
            return "";
        }
    }).join("");

};

const compileTextPlainTemplate = function (template, options) {

    const result = {
        "template": template,
        "parser": "text/plain",
        "parts": []
    };

    const codes = Array.prototype.map.call(template, (char) => char.codePointAt(0));

    let looper = 0;
    while (looper < codes.length) {

        if ((codes[looper] === 36) && // $
            (codes[looper + 1] === 123)) { // {

            looper += 2;

            let symbols = [];

            let start = looper;

            let level = 1;

            while ((level > 0) && (looper < codes.length)) {
                let symbol = tmpl.getTemplateSymbol(codes, looper);
                if (symbol.type == OPR) {
                    if (symbol.content == "{") {
                        ++level;
                    } else if (symbol.content == "}") {
                        --level;
                    }
                }
                symbols.push(symbol);
                looper = symbol.next;
            }

            if (level > 0) {
                error.throwTemplateError("Bracket not terminated", template, looper);
                return;
            }

            // remove last "}"
            symbols.pop();

            if (symbols.length > 0) {

                symbols = tmpl.convertTemplateBracket(template, symbols);
                symbols = tmpl.convertTemplateSugar(template, symbols);
                symbols = tmpl.convertTemplateCall(template, symbols);
                symbols = tmpl.convertTemplateOperator(template, symbols);

                let queue = tmpl.convertTemplateQueue(template, symbols);

                result.parts.push({
                    "type": "call",
                    "call": queue,
                    "template": template,
                    "code": template.slice(start - 2, looper)
                });

            }

        } else {

            let start = looper;
            while ((looper < codes.length) &&
                   ((codes[looper] !== 36) || (codes[looper + 1] !== 123))) {
                ++looper;
            }

            if (start !== looper) {
                result.parts.push({
                    "type": "text",
                    "content": String.fromCodePoint.apply(String, codes.slice(start, looper))
                });
            }

        }

    }

    return result;

};

const containsTextPlainTemplate = function (template) {

    return (template.indexOf("${") !== -1);

};

module.exports.parseTemplate = parseTextPlainTemplate;
module.exports.compileTemplate = compileTextPlainTemplate;
module.exports.containsTemplate = containsTextPlainTemplate;

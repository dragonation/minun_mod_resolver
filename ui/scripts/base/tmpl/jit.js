const { BLK, QOT, NUM, SYM, OPR, FNC, OPC, REG, EOT, ERR, OPS } = require("./token.js");

const { mergeOptions } = require("./opt.js");

const { Operator } = require("./optr.js");

const functors = require("./func.js");

const tmpl = require("../tmpl.js");

const TemplateJITBuffer = function TemplateJITBuffer(parent, extraIndent) {

    this.variants = Object.create(null);
    this.expressions = Object.create(null);

    this.statements = [];

    this.indent = "";

    this.parent = parent;
    if (this.parent) {
        this.indent = this.parent.indent;
    }
    if (extraIndent) {
        this.indent = this.indent + extraIndent;
    }

    this.nextVariantID = 1;

};

TemplateJITBuffer.prototype.generateID = function () {

    if (this.parent) {
        return this.parent.generateID();
    }

    let id = this.nextVariantID; ++this.nextVariantID;

    return id;

};

TemplateJITBuffer.prototype.hasVariant = function (expression) {

    if (this.variants[expression]) {
        return true;
    } else if (this.parent) {
        return this.parent.hasVariant(expression);
    }

    return false;

};

TemplateJITBuffer.prototype.getVariant = function (expression, autostatement, template, parameters) {

    if (/^v([0-9]+)$/.test(expression)) {
        return expression;
    }

    let variant = undefined;

    variant = `v${this.generateID()}`;
    this.expressions[variant] = {
        "expression": expression,
        "used": 0
    };

    this.useVariant(variant);

    return variant;

};

TemplateJITBuffer.prototype.useVariant = function (variant) {

    if (this.expressions[variant]) {
        if (this.expressions[variant].used === 0) {
            this.statements.push({
                "type": "calculation",
                "variant": variant,
                "expression": this.expressions[variant].expression
            });
        }
        ++this.expressions[variant].used;
    } else if (this.parent) {
        this.parent.useVariant(variant);
    }

    return variant;

};

TemplateJITBuffer.prototype.addBuffer = function (buffer) {

    this.statements.push({
        "type": "buffer",
        "buffer": buffer
    });

};

TemplateJITBuffer.prototype.addStatement = function (jitTemplates, jitArguments, options) {

    const buffer = new TemplateJITBuffer(this);

    const statements = [];

    let statementArguments = jitArguments.map(function (argument) {
        let argumentBuffer = new TemplateJITBuffer(buffer, "    ");
        let called = false;
        let result = undefined;
        return function () {
            if (!called) {
                called = true;
                result = fillInJITBuffer(argument, options, argumentBuffer);
                buffer.addBuffer(argumentBuffer);
            }
            return result;
        };
    });

    const variantIDs = Object.create(null);

    let jitOptions = mergeOptions({
        "functors": {
            "sym": function (t, c, p, o, i) {
                if (jitArguments[i - 1] && (jitArguments[i - 1].type === SYM)) {
                    return JSON.stringify(jitArguments[i - 1].content);
                }
                throw new Error("Invalid argument type, expected SYM");
            },
            "var": function (t, c, p, o, i) {
                if (!variantIDs[i]) {
                    variantIDs[i] = `v${buffer.generateID()}`;
                }
                return variantIDs[i];
            },
            "arg": function (t, c, p, o, i) {
                return statementArguments[i - 1]();
            },
            "argv": function (t, c, p, o) {
                return statementArguments.map(f => f());
            },
            "argc": function (t, c, p, o) {
                return jitArguments.length;
            },
            "opt": function (t, c, p, o, k) {
                return options[k];
            }
        }
    });

    let result = jitTemplates.map((jitTemplate, index, list) => {
        if (jitTemplate instanceof Array) {
            tmpl.parseTemplate(jitTemplate[0], {}, jitOptions);
        } else {
            let parsed = tmpl.parseTemplate(jitTemplate, {}, jitOptions);
            if (index === list.length - 1) {
                parsed = buffer.getVariant(parsed, true);
            } else {
                buffer.statements.push({
                    "type": "statement",
                    "expression": parsed
                });
            }
            return parsed;
        }
    }).filter(line => line && line.trim()).slice(-1)[0];

    this.addBuffer(buffer);

    return result;

};

const isSafeTemplateCallSymbolStringToken = function (symbol) {

    if (symbol.type === SYM) {
        return true;
    }

    if (symbol.type !== QOT) {
        return false;
    }

    return /^[\$_a-z]([\$_a-z0-9]*)$/i.test(symbol.content);

};

const jitTemplateCallPropertyGetter = function (symbol) {

    if (isSafeTemplateCallSymbolStringToken(symbol)) {
        return `.${symbol.content}`;
    } else {
        return `["${symbol.content.replace(/\\/gim, "\\\\").replace(/\r/gim, "\\r").replace(/\n/gim, "\\n").replace(/"/gim, "\\\"")}"]`;
    }

};

const fillInJITBuffer = function (call, options, buffer) {

    switch (call.type) {

        case FNC: case OPC: {

            let action = undefined;
            try {
                action = tmpl.getTemplateCallAction("", call, options);
            } catch (error) {
                // Do nothing
            }

            let jitTemplates = undefined;
            if (action && action.jitTemplates) {
                jitTemplates = action.jitTemplates;
            } else {
                jitTemplates = ["call(p, " + JSON.stringify(call.content) + "${argc() > 0 ? ', ' : ''}${join(argv(), ', ')})"];
            }

            return buffer.addStatement(jitTemplates, call.arguments, options);

        };

        case SYM: {

            switch (call.content) {

                case "true": { return "true"; };
                case "false": { return "false"; };
                case "null": { return "null"; };
                case "undefined": { return "undefined"; };

                case "nan": { return "NaN"; };
                case "infinity": { return "Infinity"; };

                default: { return `p${jitTemplateCallPropertyGetter(call)}`; };

            }

        };

        case QOT: {
            return buffer.getVariant(JSON.stringify(call.content), true);
        };
        case NUM: {
            return call.content.toString();
        };
        case REG: {
            return buffer.getVariant(call.content.toString(), true);
        };

        case OPR: case OPS:
        default: {
            throw new Error("Invalid code to JIT");
            return;
        };

    }

};

const fillInJITCodes = function (buffer, statements) {

    let looper = 0;
    while (looper < buffer.statements.length) {
        let statement = buffer.statements[looper];
        switch (statement.type) {
            case "buffer": {
                fillInJITCodes(statement.buffer, statements);
                break;
            };
            case "calculation": {
                statements.push(`var ${statement.variant} = ${statement.expression};`);
                break;
            };
            case "statement": {
                statements.push(statement.expression);
                break;
            };
        }
        ++looper;
    }

};

const wrapJITTemplateCall = function (template, call, options) {

    options = mergeOptions(options);

    const buffer = new TemplateJITBuffer();

    const result = fillInJITBuffer(call, options, buffer);

    const statements = [];

    fillInJITCodes(buffer, statements);

    statements.push(`return ${result};`);

    return ([]
            .concat(["function (p) {",
                     "    p = merge(p);"
                    ])
            .concat(statements.map((line) => "    " + buffer.indent + line))
            .concat(["};"])
           );

};

/**
 * [API:Format] 将已经编译好了的template内核脚本，优化成JIT函数
 * @function <@.format.tmpl.jit>
 * @call {(compiled, options) -> jit}
 * @param <compiled> {String} `@.format.tmpl.compile()`编译产生的内核AST
 * @param <options> {{async, functors}} 执行内核脚本的选项
 *     @param <async> {Boolean} 是否支持异步支持
 *     @param <functors> {Object<name, (template, call, parameters, options, arg ...) -> result>} 内部函数支持
 * @result <jit> {(parameters) -> result} JIT函数
 */
const jitTemplateCall = function (call, options) {

    options = mergeOptions(options);

    const wrapee = wrapJITTemplateCall(call.template, call, options);

    wrapee[0] = "return " + wrapee[0];

    const presets = Object.keys(utilities).map((func) => `const ${func} = ${utilities[func].toString()}`);

    let wrapper = new Function("t", "c", "o", "Operator", "functors", presets.concat(wrapee).join("\n"));

    let result = wrapper(call.template, call, options, Operator, functors);

    return result;
};

const utilities = Object.create(null);

utilities["call"] = function (p, f) {

    let newArguments = Array.prototype.slice.call(arguments, 2);

    if (typeof f === "string") {
        if (typeof o.functors[f] === "function") {
            f = o.functors[f];
        } else if (typeof functors[f] === "function") {
            f = functors[f];
        }
    }

    if (!f) {
        throw new Error("Functor or operator not found");
    }

    if (f instanceof Operator) {
        return f.call.apply(f, [t, c, p, o, undefined].concat(newArguments));
    } else {
        return f.apply(null, [t, c, p, o].concat(newArguments));
    }

};

utilities["prop"] = function (o, k) {
    return ((o !== null) && (o !== undefined)) ? o[k] : undefined;
};

utilities["obj"] = function () {
    let result = {};
    let looper = 0;
    while (looper < arguments.length) {
        result[arguments[looper]] = arguments[looper + 1];
        looper += 2;
    }
    return result;
};

utilities["opr"] = function (p) {

    let names = Array.prototype.slice.call(arguments, 1, -1);

    return new Operator(t, p, o, names, arguments[arguments.length - 1]);

};

utilities["test"] = function (value) {

    let looper = 1;
    while (looper < arguments.length) {
        if (looper === arguments.length - 1) {
            return arguments[looper];
        } else if (value === arguments[looper]) {
            return arguments[looper + 1];
        }
        looper += 2;
    }

};

utilities["merge"] = function (value) {

    let result = {};
    for (let key in value) {
        result[key] = value[key];
    }

    return result;

};

module.exports.jitTemplateFunctors = functors;

module.exports.isSafeTemplateCallSymbolStringToken = isSafeTemplateCallSymbolStringToken;
module.exports.jitTemplateCallPropertyGetter = jitTemplateCallPropertyGetter;

module.exports.jitTemplateCall = jitTemplateCall;

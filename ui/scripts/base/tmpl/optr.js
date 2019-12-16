const error = require("./error.js");

const { BLK, QOT, NUM, SYM, OPR, FNC, OPC, REG, EOT, ERR, OPS } = require("./token.js");

const rawSlice = Array.prototype.slice;

const tmpl = require("../tmpl.js");

const functors = require("./func.js");

let at = "@";

const Operator = function Operator(template, parameters, options, names, definition) {

    this.template = template;
    this.parameters = parameters;
    this.options = options;
    this.names = names;
    this.definition = definition;

    return this;

};

Operator.prototype.call = function (template, call, parameters, options, overwrites) {

    let newParameters = tmpl.snapshotTemplateParameters(this.parameters,
                                                        [parameters, overwrites],
                                                        rawSlice.call(arguments, 5),
                                                        this.names)
    if (typeof this.definition === "function") {
        return this.definition(template, {}, newParameters, options);
    } else {
        return tmpl.runTemplateCall(template, this.definition, newParameters, options, true);
    }

};

const operators = Object.create(null);

operators["."] = function (template, call, parameters, options, object, key) {

    if ((object === null) || (object === undefined)) {
        return undefined;
    }

    let result = object[key];

    return result;

};
operators["."].resolveDependencies = function (arguments, options) {

    var simplify = function (argument) {

        switch (argument.type) {
            case QOT: { return [argument.content]; };
            case NUM: { return [argument.content + ""]; };
            case OPC: {
                if (argument.content === ".") {
                    let superobject = undefined;
                    if (argument.arguments[0].type === "qot") {
                        superobject = ["'" + argument.arguments[0].content + "'"];
                    } else {
                        superobject = simplify(argument.arguments[0]);
                    }
                    if (superobject.length > 1) {
                        return ["*"];
                    }
                    if (superobject[0] === "*") {
                        return ["*"];
                    }
                    let subobject = simplify(argument.arguments[1]);
                    if (subobject.length > 1) {
                        return ["*"];
                    }
                    if (subobject[0] === "*") {
                        return ["*"];
                    }
                    let isSimple = false;
                    if (argument.arguments[1].type === QOT) {
                        if (!/[`~!@#\$%\^&\*\(\)\-=\+_\[\]\\\|\}\{;'":\/\.,<>\?\}]/.test(argument.arguments[1].content)) {
                            isSimple = true;
                        } else {
                            subobject[0] = "'" + subobject[0].replace(/'/g, "\'") + "'";
                        }
                    }
                    if (isSimple) {
                        return [superobject[0] + "." + subobject[0]];
                    } else {
                        return [superobject[0] + "[" + subobject[0] + "]"];
                    }
                } else {
                    return ["*"];
                }
            };
            case SYM: { return [argument.content]; };
            default: { return ["*"]; }
        }

    };

    return simplify({
        "type": OPC,
        "content": ".",
        "arguments": arguments
    });

};
operators["."].jitTemplates = ["prop(${arg(1)}, ${arg(2)})"];

operators["*"] = function (template, call, parameters, options, a, b) {
    return a * b;
};
operators["*"].noExtraDependencies = true;
operators["*"].jitTemplates = ["${arg(1)} * ${arg(2)}"];

operators["/"] = function (template, call, parameters, options, a, b) {
    return a / b;
};
operators["/"].noExtraDependencies = true;
operators["/"].jitTemplates = ["${arg(1)} / ${arg(2)}"];

operators["%"] = function (template, call, parameters, options, a, b) {
    return a % b;
};
operators["%"].noExtraDependencies = true;
operators["%"].jitTemplates = ["${arg(1)} % ${arg(2)}"];

operators["+"] = function (template, call, parameters, options, a, b) {
    if ((typeof a === "string") || (typeof b === "string")) {
        if ((a === null) || (a === undefined)) {
            return b;
        } else if ((b === null) || (b === undefined)) {
            return a;
        }
    }
    return a + b;
};
operators["+"].noExtraDependencies = true;
operators["+"].jitTemplates = ["${arg(1)} + ${arg(2)}"];

operators["-"] = function (template, call, parameters, options, a, b) {
    if (arguments.length == 5) {
        return -a;
    } else {
        return a - b;
    }
};
operators["-"].noExtraDependencies = true;
operators["-"].jitTemplates = ["${argc() == 1 ? '-' + arg(1) : arg(1) + ' - ' + arg(2)}"];

operators["!"] = function (template, call, parameters, options, value) {
    return !value;
};
operators["!"].noExtraDependencies = true;
operators["!"].jitTemplates = ["!${arg(1)}"];

operators["~"] = function (template, call, parameters, options, value) {
    return ~value;
};
operators["~"].noExtraDependencies = true;
operators["~"].jitTemplates = ["~${arg(1)}"];

operators["?:"] = function (template, call, parameters, options, a, b, c) {
    if (arguments.length === 6) {
        let test = a();
        return test ? test : b();
    } else {
        return a() ? b() : c();
    }
};
operators["?:"].noExtraDependencies = true;
operators["?:"].lazy = true;
operators["?:"].jitTemplates = [
    "var ${var(1)};",
    "if (${arg(1)}) {",
    "    ${var(1)} = ${argc() == 2 ? arg(1) : arg(2)};",
    "} else {",
    "    ${var(1)} = ${argc() == 2 ? arg(2) : arg(3)};",
    "}",
    "${var(1)}"
];

operators["&"] = function (template, call, parameters, options, a, b) {
    return a & b;
};
operators["&"].noExtraDependencies = true;
operators["&"].jitTemplates = ["${arg(1)} & ${arg(2)}"];

operators["|"] = function (template, call, parameters, options, a, b) {
    return a | b;
};
operators["|"].noExtraDependencies = true;
operators["|"].jitTemplates = ["${arg(1)} | ${arg(2)}"];

operators["^"] = function (template, call, parameters, options, a, b) {
    return a ^ b;
};
operators["^"].noExtraDependencies = true;
operators["^"].jitTemplates = ["${arg(1)} ^ ${arg(2)}"];

operators["&&"] = function (template, call, parameters, options, a, b) {
    return a() && b();
};
operators["&&"].noExtraDependencies = true;
operators["&&"].lazy = true;
operators["&&"].jitTemplates = [
    "var ${var(1)};",
    "if (${arg(1)}) {",
    "    ${var(1)} = ${arg(2)};",
    "} else {",
    "    ${var(1)} = false;",
    "}",
    "${var(1)}",
];

operators["||"] = function (template, call, parameters, options, a, b) {
    return a() || b();
};
operators["||"].noExtraDependencies = true;
operators["||"].lazy = true;
operators["||"].jitTemplates = [
    "var ${var(1)};",
    "if (${arg(1)}) {",
    "    ${var(1)} = ${arg(1)};",
    "} else {",
    "    ${var(1)} = ${arg(2)};",
    "}",
    "${var(1)}",
];

operators[">"] = function (template, call, parameters, options, a, b) {
    return a > b;
};
operators[">"].noExtraDependencies = true;
operators[">"].jitTemplates = ["${arg(1)} > ${arg(2)}"];

operators["<"] = function (template, call, parameters, options, a, b) {
    return a < b;
};
operators["<"].noExtraDependencies = true;
operators["<"].jitTemplates = ["${arg(1)} < ${arg(2)}"];

operators[">="] = function (template, call, parameters, options, a, b) {
    return a >= b;
};
operators[">="].noExtraDependencies = true;
operators[">="].jitTemplates = ["${arg(1)} >= ${arg(2)}"];

operators["<="] = function (template, call, parameters, options, a, b) {
    return a <= b;
};
operators["<="].noExtraDependencies = true;
operators["<="].jitTemplates = ["${arg(1)} <= ${arg(2)}"];

operators[">>"] = function (template, call, parameters, options, a, b) {
    return a >> b;
};
operators[">>"].noExtraDependencies = true;
operators[">>"].jitTemplates = ["${arg(1)} >> ${arg(2)}"];

operators["<<"] = function (template, call, parameters, options, a, b) {
    return a << b;
};
operators["<<"].noExtraDependencies = true;
operators["<<"].jitTemplates = ["${arg(1)} << ${arg(2)}"];

operators["=="] = function (template, call, parameters, options, a, b) {
    return a === b;
};
operators["=="].noExtraDependencies = true;
operators["=="].jitTemplates = ["${arg(1)} === ${arg(2)}"];

operators["!="] = function (template, call, parameters, options, a, b) {
    return a !== b;
};
operators["!="].noExtraDependencies = true;
operators["!="].jitTemplates = ["${arg(1)} !== ${arg(2)}"];

operators["#"] = function (template, call, parameters, options) {
    return rawSlice.call(arguments, 4);
};
operators["#"].noExtraDependencies = true;
operators["#"].jitTemplates = ["[${join(argv(), ', ')}]"];

operators[at] = function (template, call, parameters, options) {

    var namesAndValues = rawSlice.call(arguments, 4);
    if (namesAndValues.length % 2 == 1) {
        throwTemplateError("Object construction with invalid arguments count, expected even arguments",
                           template, call.arguments[call.arguments.length - 1].index);
    }

    var object = {};

    var looper = 0;
    while (looper < namesAndValues.length) {
        object[namesAndValues[looper]] = namesAndValues[looper + 1];
        looper += 2;
    }

    return object;

};
operators[at].noExtraDependencies = true;
operators[at].jitTemplates = ["obj(${join(argv(), ', ')})"];

operators["$"] = function (template, call, parameters, options) {

    var names = call.arguments.slice(0, call.arguments.length - 1).map(function (argument) {
        if (argument.type != SYM) {
            throwTemplateError("Invalid argument definition", template, arguments.index);
        }
        return argument.content;
    });

    var definition = call.arguments[call.arguments.length - 1];

    return new Operator(template, parameters, options, names, definition);

};
operators["$"].lazy = true;
operators["$"].jitTemplates = [
    "var ${var(1)};",
    "${var(1)} = opr(p, ${argc() > 1 ? join(map(seq(1, argc() - 1), {sym($1)}), ', ') + ', ' : ''}function (t, c, p, o) {",
    "    return ${arg(argc())};",
    "});",
    "${var(1)}"];
operators["$"].jitLazy = true;

operators[";"] = function (template, call, parameters, options, a, b) {

    var result = a();
    parameters['$x'] = result;
    return b();

};
operators[";"].noExtraDependencies = true;
operators[";"].lazy = true;
operators[";"].jitTemplates = ["p.$x = ${arg(1)};", "${arg(2)}"];

operators["?"] = function (template, call, parameters, options) {

    var condition = parameters["$x"];

    var testsAndValues = rawSlice.call(arguments, 4);

    var looper = 0;
    while (looper < testsAndValues.length) {

        if (looper == testsAndValues.length - 1) {
            return testsAndValues[looper]();
        }

        var test = testsAndValues[looper]();
        if (test === condition) {
            return testsAndValues[looper + 1]();
        }

        looper += 2;
    }

    return null;

};
operators["?"].noExtraDependencies = true;
operators["?"].lazy = true;
operators["?"].jitTemplates = ["test(p.$x, ${join(argv(), ', ')})"];

operators[":"] = function (template, call, parameters, options, name, newArguments) {

    if (!name) {
        return null;
    }

    if (!newArguments) {
        newArguments = [];
    }

    if (name instanceof Operator) {
        return name.call.apply(name, [template, call, parameters, options, undefined].concat(newArguments));
    }

    if (typeof name === "string") {
        if (options.functors[name]) {
            return options.functors[name].apply(this, [template, call, parameters, options].concat(newArguments));
        } else if (functors[name]) {
            return functors[name].apply(this, [template, call, parameters, options].concat(newArguments));
        } else {
            return undefined;
        }
    }

};
operators[":"].noExtraDependencies = true;
operators[":"].jitTemplates = ["call(p, ${join(argv(), ', ')})"];

module.exports.Operator = Operator;

module.exports.operators = operators;

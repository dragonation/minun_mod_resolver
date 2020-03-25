const pathModule = require("path");

var tokenizeCSS = function (css) {

    let tokens = [];

    let token = "";

    let chars = Array.prototype.slice.call(css, 0);

    let looper = 0;
    while (looper < chars.length) {
        let char = chars[looper];
        switch (char) {
            case " ": case "\n": case "\t": case "\r": {
                if (token) {
                    tokens.push(token);
                }
                if (tokens[tokens.length - 1] !== " ") {
                    tokens.push(" ");
                }
                token = "";
                break;
            };
            case "/": {
                if (chars[looper + 1] === "*") {
                    if (token) {
                        tokens.push(token);
                    }
                    token = "/*";
                    let looper2 = 2;
                    while ((looper + looper2 < chars.length) &&
                           ((chars[looper + looper2] !== "*") || (chars[looper + looper2 + 1] !== "/"))) {
                        token += chars[looper + looper2];
                        ++looper2;
                    }
                    if (looper + looper2 < chars.length) {
                        looper = looper + looper2 + 1;
                        tokens.push(token + "*/");
                        token = "";
                    } else {
                        throw new Error("Comment not ended");
                    }
                } else {
                    token += char;
                }
                break;
            };
            case "\"": {
                if (token) {
                    tokens.push(token);
                }
                token = "\"";
                let looper2 = 1;
                while ((looper + looper2 < chars.length) && (chars[looper + looper2] !== "\"")) {
                    token += chars[looper + looper2];
                    ++looper2;
                }
                if (looper + looper2 < chars.length) {
                    looper = looper + looper2;
                    tokens.push(token + "\"");
                    token = "";
                } else {
                    throw new Error("String not ended");
                }
                break;
            };
            case "'": {
                if (token) {
                    tokens.push(token);
                }
                token = "'";
                let looper2 = 1;
                while ((looper + looper2 < chars.length) && (chars[looper + looper2] !== "'")) {
                    token += chars[looper + looper2];
                    ++looper2;
                }
                if (looper + looper2 < chars.length) {
                    looper = looper + looper2;
                    tokens.push(token + "'");
                    token = "";
                } else {
                    throw new Error("String not ended");
                }
                break;
            };
            case ":": case ";":
            case "{": case "}":
            case "[": case "]":
            case "(": case ")":
            case ">": case "+": case "~":
            case "$":
            case ",":
            case "#": case ".":
            case "&": {
                if (token) {
                    tokens.push(token);
                }
                tokens.push(char);
                token = "";
                break;
            };
            default: {
                token += char;
                break;
            };
        }
        ++looper;
    }

    if (token) {
        tokens.push(token);
    }

    return tokens;

};

var structCSS = function (tokens) {

    let root = [];

    let levels = [];

    let statements = root;

    let statement = [];

    let looper = 0;
    while (looper < tokens.length) {

        let token = tokens[looper];
        switch (token) {
            case ";": {
                if (statement.length > 0) {
                    statements.push(statement);
                }
                statement = [];
                break;
            };
            case "{": {
                let newStatements = [];
                statement.push(newStatements);
                statements.push(statement);
                levels.push(statements);
                statements = newStatements;
                statement = [];
                break;
            };
            case "}": {
                if (statement.length > 0) {
                    statements.push(statement);
                }
                if (levels.length === 0) {
                    throw new Error("Backets not match");
                }
                statements = levels.pop();
                statement = [];
                break;
            };
            default: {
                if ((token[0] !== "/") || (token[1] !== "*")) {
                    if ((statement.length > 0) || (token !== " ")) {
                        statement.push(token);
                    }
                }
                break;
            }
        }

        ++looper;
    }

    if (statement.length > 0) {
        statements.push(statement);
    }

    if (root !== statements) {
        throw new Error("Brackets not match");
    }

    return root;

};

var analyzeCall = function (tokens) {

    tokens = simplifyProperty(tokens);

    let cssArguments = [];
    let argument = [];

    let levels = [];

    let looper = 0;
    while (looper < tokens.length) {

        switch (tokens[looper]) {
            case "(": {
                if (argument.length > 0) {
                    cssArguments.push(argument);
                }
                levels.push(cssArguments);
                let newArguments = [];
                argument.push(newArguments);
                cssArguments = newArguments;
                argument = [];
                break;
            };
            case ")": {
                if (argument.length > 0) {
                    cssArguments.push(argument);
                }
                if (levels.length === 0) {
                    throw new Error("Invalid call");
                }
                cssArguments = levels.pop();
                argument = cssArguments.pop();
                break;
            };
            case ",": {
                if (argument.length > 0) {
                    cssArguments.push(argument);
                    argument = [];
                }
                break;
            };
            default: {
                argument.push(tokens[looper]);
                break;
            };
        }

        ++looper;
    }

    if (argument.length > 0) {
        cssArguments.push(argument);
    }

    if (levels.length !== 0) {
        throw new Error("Brackets not match");
    }

    return cssArguments;

};

var analyzeCSS = function (css) {

    let result = [];

    let looper = 0;
    while (looper < css.length) {
        if (css[looper][0] === "@") {
            result.push(["stmt", css[looper]]);
        } else if (css[looper][0] === "$") {
            if (css[looper].indexOf(":") !== -1) {
                let index = css[looper].indexOf(":");
                if (css[looper][0] === "$") {
                    result.push(["var", css[looper].slice(1, index), analyzeCall(css[looper].slice(index + 1))]);
                } else {
                    result.push(["prop", css[looper].slice(0, index), analyzeCall(css[looper].slice(index + 1))]);
                }
            } else {
                if (css[looper][css[looper].length - 1] instanceof Array) {
                    result.push(["pdef", analyzeCall(css[looper].slice(0, -1)), css[looper][css[looper].length - 1]]);
                } else {
                    result.push(["pdef", analyzeCall(css[looper])]);
                }
            }
        } else if (css[looper][css[looper].length - 1] instanceof Array) {
            result.push(["grp", css[looper].slice(0, -1), analyzeCSS(css[looper][css[looper].length - 1])]);
        } else if (css[looper].indexOf(":") !== -1) {
            let index = css[looper].indexOf(":");
            if (css[looper][0] === "$") {
                result.push(["var", css[looper].slice(1, index), analyzeCall(css[looper].slice(index + 1))]);
            } else {
                result.push(["prop", css[looper].slice(0, index), analyzeCall(css[looper].slice(index + 1))]);
            }
        }
        ++looper;
    }

    return result;

};

var flatCSS = function (css, statements, vars, prefixes) {

    if (!statements) {
        statements = [];
    }

    let looper = 0;
    while (looper < css.length) {

        switch (css[looper][0]) {
            case "grp": {

                let newVars = [];
                if (vars) {
                    newVars = vars.slice(0);
                }

                let pdefs = [];
                let props = [];
                let grps = [];

                let looper2 = 0;
                while (looper2 < css[looper][2].length) {
                    switch (css[looper][2][looper2][0]) {
                        case "pdef": {
                            pdefs.push(css[looper][2][looper2]);
                            break;
                        };
                        case "var": {
                            newVars.push(css[looper][2][looper2]);
                            break;
                        };
                        case "prop": {
                            props.push(css[looper][2][looper2]);
                            break;
                        };
                        case "grp": {
                            grps.push(css[looper][2][looper2]);
                            break;
                        };
                        default: {
                            throw new Error("Invalid statement");
                            break;
                        };
                    }
                    ++looper2;
                }

                let content = newVars.slice(0);
                pdefs.forEach((pdef) => {
                    content.push(pdef);
                });
                props.forEach((prop) => {
                    content.push(prop);
                });

                let newPrefixes = [];
                if (prefixes) {
                    newPrefixes = prefixes.slice(0);
                }

                let names = [];
                let name = [];
                css[looper][1].forEach((part) => {
                    if (part === ",") {
                        if (name.length > 0) {
                            names.push(name);
                        }
                        name = [];
                    } else {
                        name.push(part);
                    }
                });
                if (name.length > 0) {
                    names.push(name);
                }

                newPrefixes.push(names);

                let flatted = flatName(newPrefixes);

                statements.push(["grp", flatted, content]);

                flatCSS(grps, statements, newVars, newPrefixes);

                break;
            };
            case "pdef": { statements.push(css[looper]); break; };
            case "var": { statements.push(css[looper]); break; };
            case "prop": { statements.push(css[looper]); break; };
            default: { statements.push(css[looper]); break; };
        }

        ++looper;
    }

    return statements;

};

var simplifyProperty = function (property) {

    let result = [];
    let word = [];
    property.forEach((part) => {
        if (part === ".") {
            if ((word.length === 1) && /^(-?)[0-9]+$/.test(word[0])) {
                word.push(part);
            } else {
                if (word.length > 0) {
                    result.push(word.join(""));
                    word = [];
                }
                word.push(part);
            }
        } else if (/^[0-9]+/.test(part)) {
            if ((word[word.length - 1] === ".") || (word[word.length - 1] === "#")) {
                word.push(part);
            } else {
                if (word.length > 0) {
                    result.push(word.join(""));
                    word = [];
                }
                word.push(part);
            }
        } else if (/^[0-9a-f]+/i.test(part)) {
            if (word[word.length - 1] === "#") {
                word.push(part);
            } else {
                if (word.length > 0) {
                    result.push(word.join(""));
                    word = [];
                }
                word.push(part);
            }
        } else {
            if (word.length > 0) {
                result.push(word.join(""));
                word = [];
            }
            word.push(part);
        }
    });

    if (word.length > 0) {
        result.push(word.join(""));
    }

    while (result[0] === " ") {
        result.shift();
    }

    while (result[result.length - 1] === " ") {
        result.pop();
    }

    return result;

};

var evaluateProperty = function (property, parameters, options, mixins) {

    let result = [];

    let looper = 0;
    while (looper < property.length) {

        let part = property[looper];

        if (part instanceof Array) {
            result.push(part.map((part) => {
                return evaluateProperty(part, parameters, options, mixins);
            }));
        } else if (/^(-?)([0-9]+)dpx$/.test(part)) {
            result.push($.dom.getDesignPixels(parseFloat(part.slice(0, -3))) + "px");
        } else if ("$" === part) {
            if (property[looper + 2] instanceof Array) {

                let name = property[looper + 1];
                let arguments = property[looper + 2];

                if (mixins[name]) {
                    let newArguments = arguments.map((argument) => {
                        return evaluateProperty(argument, parameters, options, mixins);
                    });
                    let fragment = mixins[name](newArguments, parameters, options, mixins, top);
                    fragment.forEach((word) => {
                        result.push(word);
                    });
                } else {
                    throw new Error("Mixin " + name + " not found");
                }

                looper += 2;

            } else {
                ++looper;
                let value = parameters[property[looper]];
                if (!value) {
                    throw new Error("Variant " + property[looper] + " not found");
                }
                value.forEach((value) => {
                    result.push(value);
                });
            }
        } else if ((part === "url") && (property[looper + 1] instanceof Array)) {

            let newArguments = property[looper + 1].map((argument) => {
                return evaluateProperty(argument, parameters, options, mixins);
            });

            let url = $.tmpl.css.ensureSimpleArguments(newArguments, 1, true)[0];

            if ((url.indexOf(":/") === -1) && (url[0] !== "/")) {
                url = pathModule.resolve(pathModule.dirname(options.path), url);
            }

            result.push("url");
            result.push([["'" + url + "'"]]);

            ++looper;

        } else {
            result.push(part);
        }

        ++looper;
    }

    return result;

};

var evaluateVariant = function (variant, parameters, options, mixins) {

    return evaluateProperty(variant, parameters, options, mixins);

};

var flatName = function (name) {

    var evaluate = function (name, name2) {

        let names = [];

        let looper = 0;
        while (looper < name2.length) {

            let target = name2[looper];
            while (target[0] === " ") {
                target.shift();
            }
            while (target[target.length - 1] === " ") {
                target.pop();
            }

            let begin = null;
            let end = null;
            if (name2[looper].indexOf("&") !== -1) {
                let index = name2[looper].indexOf("&");
                begin = name2[looper].slice(0, index);
                end = name2[looper].slice(index + 1);
            } else {
                begin = [];
                end = name2[looper].slice(0);
                end.unshift(" ");
            }

            let looper2 = 0;
            while (looper2 < name.length) {

                let newName = begin.slice(0);
                while (newName[0] === " ") {
                    newName.shift();
                }

                name[looper2].forEach((part) => {
                    if (part === " ") {
                        if ((newName.length > 0) && (newName[newName.length - 1] !== " ")) {
                            newName.push(part);
                        }
                    } else {
                        newName.push(part);
                    }
                });

                end.forEach((part) => {
                    if (part === " ") {
                        if ((newName.length > 0) && (newName[newName.length - 1] !== " ")) {
                            newName.push(part);
                        }
                    } else {
                        newName.push(part);
                    }
                });

                names.push(newName);

                ++looper2;
            }

            ++looper;
        }

        return names;

    };

    let names = [[]];
    name.forEach((name) => {
        names = evaluate(names, name);
    });

    return names;

};

var evaluateCSS = function (css, parameters, options, mixins, top, merge) {

    let result = [];

    let properties = [];
    let evaluatedProperties = [];
    let groups = [];
    let evaluatedGroups = [];

    let newParameters = merge ? parameters : Object.assign({}, parameters);
    let newMixins = merge ? mixins : Object.assign({}, mixins);

    css.forEach((statement) => {
        switch (statement[0]) {
            case "pdef": {
                let name = statement[1][0][1];
                let arguments = statement[1][0][2];
                let bracket = statement[2];
                if (bracket && (bracket instanceof Array)) {
                    let parameterNames = arguments.map((name) => {
                        let dollarName = $.tmpl.css.ensureSimpleArgument(name);
                        if (dollarName[0] !== "$") {
                            throw new Error("No dollar in argument");
                        }
                        return dollarName.slice(1);
                    });
                    let definition = analyzeCSS(bracket);
                    newMixins[name] = function (arguments, outer_parameters, options, mixins, top) {

                        let newParameters = {};
                        parameterNames.forEach((name, index) => {
                            newParameters[name] = arguments[index];
                        });
                        newParameters = Object.assign({}, parameters, newParameters);

                        return evaluateCSS(definition, newParameters, options, mixins, top, false);

                    };
                } else {
                    if (newMixins[name]) {
                        let newArguments = arguments.map((argument) => {
                            return evaluateProperty(argument, newParameters, options, newMixins);
                        });
                        let fragment = newMixins[name](newArguments, newParameters, options, newMixins, top);
                        fragment.forEach((statement) => {
                            switch (statement[0]) {
                                case "stmt": { result.push(statement); break; };
                                case "prop": {
                                    if (top) { throw new Error("Invalid property"); }
                                    evaluatedProperties.push(statement); break;
                                };
                                case "grp": {
                                    evaluatedGroups.push(statement); break;
                                };
                                default: {
                                    throw new Error("Invalid statement");
                                };
                            }
                        });
                    } else {
                        throw new Error("Mixin " + name + " not found");
                    }
                }
                break;
            };
            case "var": {
                if (statement[2].length > 1) {
                    throw new Error("Variant with semicolon");
                }
                newParameters[statement[1].join("").trim()] = evaluateVariant(statement[2][0], newParameters, options, newMixins);
                break;
            };
            case "stmt": { result.push(statement); break; };
            case "prop": {
                if (top) { throw new Error("Invalid property"); }
                properties.push(statement); break;
            };
            case "grp": {
                groups.push(statement); break;
            };
            default: {
                throw new Error("Invalid statement");
            };
        }
    });

    evaluatedProperties.forEach((property) => {
        result.push(["prop", property[1], property[2]]);
    });

    properties.forEach((property) => {
        result.push(["prop", property[1], property[2].map((property) => evaluateProperty(property, newParameters, options, newMixins))]);
    });

    evaluatedGroups.forEach((group) => {
        result.push(["grp", group[1], group[2]]);
    });

    groups.forEach((group) => {
        // let newName = evaluateName(group[1]);
        let definition = evaluateCSS(group[2], newParameters, options, newMixins, false);
        result.push(["grp", group[1], definition]);
    });

    return result;

};

var compileCSS = function (css, parameters, options, merge) {

    if (!merge) {
        parameters = Object.assign({}, parameters);
    }
    let meta = $.meta("css.variant", true);
    Object.keys(meta).forEach((key) => {
        key = key.replace(/[A-Z]/g, (x) => "-" + x.toLowerCase());
        if (parameters[key] === undefined) {
            parameters[key] = [meta[key]];
        }
    });

    options = Object.assign({}, options);

    let tokens = tokenizeCSS(css);

    let struct = structCSS(tokens);
    let analyzed = analyzeCSS(struct);

    let importeds = Object.create(null);

    let mixins = Object.assign({}, $.tmpl.css.mixins, {
        "import": function (arguments, parameters, options, mixins, top) {

            let path = $.tmpl.css.ensureSimpleArguments(arguments, 1, true)[0];

            if (path.indexOf(":/") === -1) {
                if (path[0] === "/") {
                    path = pathModule.resolve(require.root, path);
                } else {
                    path = pathModule.resolve(pathModule.dirname(options.path), path);
                }
            }
            if (importeds[path]) {
                return [];
            }

            let content = $.res.load(path);

            let tokens = tokenizeCSS(content);

            let struct = structCSS(tokens);
            let analyzed = analyzeCSS(struct);

            let evaluated = evaluateCSS(analyzed, parameters, Object.assign({}, options, {
                "path": path
            }), mixins, true, true);

            importeds[path] = evaluated;

            return evaluated;

        }
    });

    let evaluated = evaluateCSS(analyzed, parameters, options, mixins, true, merge);

    let flat = flatCSS(evaluated);

    let code = formatCSS(flat);

    return [code, parameters, mixins];

};

var compileStyle = function (css, parameters, mixins, options) {

    options = Object.assign({}, options);

    let tokens = tokenizeCSS(css);
    let struct = structCSS(tokens);
    let analyzed = analyzeCSS(struct);

    let evaluated = evaluateCSS(analyzed, parameters, options, mixins, false);

    let properties = {};

    evaluated.forEach((statement) => {
        switch (statement[0]) {
            case "prop": {
                let name = statement[1].join("").trim();
                let value = null;
                if (statement[2]) {
                    value = formatValue(statement[2]).trim();
                }
                if (value) {
                    properties[name] = value;
                } else {
                    delete properties[name];
                }
                break;
            };
            default: {
                throw new Error("Invalid CSS");
            }
        }

    });

    return properties;

};

const formatValue = function (value) {

    let texts = [];

    let format = (value) => {
        value.forEach((part, index) => {
            if (index !== 0) {
                while (texts[texts.length - 1] === " ") {
                    texts.pop();
                }
                texts.push(",");
            }
            part.forEach((part) => {
                if (typeof part === "string") {
                    if (part !== " ") {
                        if (texts[texts.length - 1] === ",") {
                            texts.push(" ");
                        }
                    }
                    texts.push(part);
                } else {
                    texts.push("(");
                    format(part);
                    texts.push(")");
                }
            });
        });
        while (texts[texts.length - 1] === " ") {
            texts.pop();
        }
    };

    format(value);

    return texts.join("");

};

const formatSelector = function (selector) {

    let texts = [];

    selector.forEach((part) => {
        texts.push(part);
    });

    return texts.join("");

};

const formatCSS = function (css, prefix) {

    let texts = [];

    css.forEach((statement) => {
        switch (statement[0]) {
            case "stmt": {
                texts.push(statement[1].join(""));
                break;
            };
            case "prop": {
                if (prefix) {
                    texts.push(prefix);
                }
                texts.push(statement[1].join("").trim());
                texts.push(": ");
                if (statement[2]) {
                    texts.push(formatValue(statement[2]).trim());
                }
                texts.push(";\n");
                break;
            };
            case "grp": {
                texts.push(statement[1].map(selector => formatSelector(selector)).join(",\n"));
                texts.push(" {\n");
                texts.push(formatCSS(statement[2], "    "));
                texts.push("}\n\n");
                break;
            };
            default: {
                throw new Error("Invalid CSS");
            }
        }

    });

    return texts.join("");

};

$.tmpl.css = function (css, parameters, options) {

    let globals = $.metas("css.global", "path").map((path) => {
        return "$import('" + path + "');";
    }).join("\r");

    let newParameters = Object.assign({}, parameters);

    let [code, cssParameters, cssMixins] = compileCSS(globals + css, newParameters, options, true);

    let cssVariants = {};

    Object.keys(cssParameters).forEach((key) => {
        cssVariants[key] = formatValue([cssParameters[key]]);
    });

    return [code, cssParameters, cssMixins, cssVariants];

};

$.tmpl.css.style = compileStyle;

$.tmpl.css.mixins = Object.create(null);

$.tmpl.css.ensureSimpleArgument = function (argument, escapeQuotation) {

    argument = argument.slice(0);
    while (argument[0] === " ") {
        argument.shift();
    }

    while (argument[argument.length - 1] === " ") {
        argument.pop();
    }

    if (argument.indexOf(" ") !== -1) {
        throw new Error("Not simple argument ");
    }

    let result = formatValue([argument]);

    if (escapeQuotation && (argument.length === 1) && (result[0] === "'")) {
        result = result.slice(1, -1);
    }

    return result;

};

$.tmpl.css.ensureSimpleArguments = function (arguments, length, escapeQuotation) {

    if ((length !== null) && (length !== undefined) && (arguments.length !== length)) {
        throw new Error("Arguments not match");
    }

    return arguments.map((argument) => {
        return $.tmpl.css.ensureSimpleArgument(argument, escapeQuotation);
    });

};

$.tmpl.css.mixins["white"] = function (arguments, parameters, options, mixins) {

    let white = parseFloat($.tmpl.css.ensureSimpleArguments(arguments, 1)[0]);
    if (isNaN(white)) {
        return ["#", "fff"];
    }

    let value = ("0" + Math.round(white * 0xff).toString(16)).slice(-2);
    if (value[0] === value[1]) {
        return ["#", value + value[0]];
    } else {
        return ["#", value + value + value];
    }

};

$.tmpl.css.mixins["alpha"] = function (arguments, parameters, options, mixins) {

    let [color, alpha] = $.tmpl.css.ensureSimpleArguments(arguments, 2);

    color = new $.dom.Color(color);
    alpha = parseFloat(alpha);

    color.alpha *= alpha;

    return ["rgba", [
        ["" + Math.round(color.red * 0xff)],
        ["" + Math.round(color.green * 0xff)],
        ["" + Math.round(color.blue * 0xff)],
        ["" + color.alpha]]];

};

$.tmpl.css.mixins["bright"] = function (arguments, parameters, options, mixins) {

    let [color, bright] = $.tmpl.css.ensureSimpleArguments(arguments, 2);

    color = new $.dom.Color(color);
    bright = parseFloat(bright);
    if (bright > 0) {
        color.red = color.red * (1 - bright) + bright;
        color.green = color.green * (1 - bright) + bright;
        color.blue = color.blue * (1 - bright) + bright;
    } else {
        color.red = color.red * (1 + bright);
        color.green = color.green * (1 + bright);
        color.blue = color.blue * (1 + bright);
    }

    return ["rgba", [
        ["" + Math.round(color.red * 0xff)],
        ["" + Math.round(color.green * 0xff)],
        ["" + Math.round(color.blue * 0xff)],
        ["" + color.alpha]]];

};

$.tmpl.css.mixins["transition"] = function (arguments, parameters, options, mixins) {

    let properties = arguments.map((argument) => {
        return $.tmpl.css.ensureSimpleArgument(argument);
    });

    return [
        ["prop", ["transition-property"], properties.slice(0, -1).map((value) => [value])],
        ["prop", ["transition-duration"], properties.slice(0, -1).map((value) => [properties[properties.length - 1]])]
    ];

};

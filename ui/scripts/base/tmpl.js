const { throwTemplateError } = require("./tmpl/error.js");

const jit = require("./tmpl/jit.js");

const { Operator, operators } = require("./tmpl/optr.js");

const { functors } = require("./tmpl/func.js");

const { parsers } = require("./tmpl/parser.js");

const rawSlice = Array.prototype.slice;

const { BLK, QOT, NUM, SYM, OPR, FNC, OPC, REG, EOT, ERR, OPS } = require("./tmpl/token.js");

const operatorQueue = [
    ["unary",  "!", "~", "-"],
    ["left",   "*", "/", "%"],
    ["left",   "+", "-"],
    ["left",   "<<", ">>"],
    ["left",   "<", ">", "<=", ">="],
    ["left",   "==", "!="],
    ["left",   "&"],
    ["left",   "^"],
    ["left",   "|"],
    ["left",   "&&"],
    ["left",   "||"],
    ["tenary", "?:"],
    ["right",  ";"]
];

// internal operators
// $ operator: create operator
// @ operator: create object
// # operator: create array
// ? operator: switch values
// : operator: execute operator

const { mergeOptions } = require("./tmpl/opt.js");

const blockEnds = {
    "(": ")",
    "[": "]",
    "{": "}"
};

const combinedOperators = ["&&", "||", ">=", "<=", "!=", "==", ">>", "<<"];

const snapshotTemplateParameters = function (parameters, appends, arguments, names) {

    let result = {};
    for (let key in parameters) {
        if (key[0] !== "^") {
            result[key] = parameters[key];
        }
    }

    if (!(appends instanceof Array)) {
        appends = [appends];
    }

    if (appends) {
        let looper = 0;
        while (looper < appends.length) {
            let append = appends[looper];
            if (append) {
                Object.assign(result, append);
            }
            ++looper;
        }
    }

    if (arguments) {

        if (result["$n"]) {
            let looper = result["$n"];
            while (looper > 0) {
                --looper;
                result[`$${looper}`] = undefined;
            }
        }

        result["$n"] = arguments.length;
        let looper = result["$n"];
        while (looper > 0) {
            --looper;
            if (names && names[looper]) {
                result[names[looper]] = arguments[looper];
            }
            result[`$${looper + 1}`] = arguments[looper];
        }

        result["$a"] = rawSlice.call(arguments, 0);

    }

    result["^"] = parameters;

    return result;

};

const stringifyTemplateCall = function (queue) {

    if (queue.type != BLK) {
        queue = [queue];
        queue.type = BLK;
        queue.operator = "";
        queue.index = queue[0].index;
    }

    let end = blockEnds[queue.operator];
    if (!end) { end = queue.operator; }

    let code = [queue.operator];

    for (let symbol of queue) {
        if (symbol) {
            switch (symbol.type) {
                case QOT: {
                    code.push("\"" + symbol.content.replace(/\\/gim, "\\\\").replace(/\r/gim, "\\r").replace(/\n/gim, "\\n").replace(/"/gim, "\\\"") + "\"");
                    break;
                };
                case NUM: case SYM: case OPR: {
                    code.push(symbol.content); break;
                };
                case FNC: case OPC: {
                    code.push(symbol.content, "(", symbol.arguments.map(stringifyTemplateCall).join(","), ")");
                    break;
                };
                case REG: {
                    code.push("#" + symbol.content.source.replace(/#/gim, "\\#") + "#"); break;
                };
                case BLK: {
                    code.push(stringifyTemplateCall(symbol)); break;
                };
                default: { break; };
            }
        }
    }

    code.push(end);

    return code.join("");

};

const getTemplateSymbol = function (codes, index, options) {

    const length = codes.length;

    // skip whitespace
    while ((index < length) &&
           ((codes[index] === 9) ||         // tab
            (codes[index] === 10) ||        // line feed
            (codes[index] === 13) ||        // carriage return
            (codes[index] === 32)           // space
           )) {
        ++index;
    }

    if (index >= length) {
        return { "type": EOT, "index": length };
    }

    switch (codes[index]) {

        // quotation: "xxx", 'xxx'
        case 34: case 39: {

            const endCode = codes[index];

            const result = [];

            let index2 = index + 1;
            while ((index2 < length) && (codes[index2] !== endCode)) {
                if (codes[index2] == 92) {   // escape: \x
                    let next = codes[index2 + 1];
                    switch (next) {
                        case 110: { result.push("\n"); break; };
                        case 92: { result.push("\\"); break; };
                        case 34: { result.push("\""); break; };
                        case 39: { result.push("\'"); break; };
                        default: {
                            return {
                                "type": ERR,
                                "description": "Invalid escaped character \\" + String.fromCodePoint(next),
                                "index": index2 + 1
                            };
                        };
                    }
                    index2 += 2;
                } else {
                    result.push(String.fromCodePoint(codes[index2]));
                    ++index2;
                }
            }

            if (index2 < length) {
                return {
                    "type": QOT,
                    "content": result.join(""),
                    "index": index,
                    "next": index2 + 1
                };
            } else {
                return {
                    "type": ERR,
                    "description": "Quotation not be terminated",
                    "index": length
                };
            }

        };

        // regex: #xxx#
        case 35: {

            const result = [];

            let index2 = index + 1;
            while ((index2 < length) && (codes[index2] !== 35)) {
                if (codes[index2] === 92) { // escape: \x
                    let next = codes[index2 + 1];
                    if (next === 35) { // #
                        result.push("#");
                    } else {
                        result.push(String.fromCodePoint(92, next));
                    }
                    index2 += 2;
                } else {
                    result.push(String.fromCodePoint(codes[index2]));
                    ++index2;
                }
            }

            if (index2 < length) {
                return {
                    "type": REG,
                    "content": new RegExp(result.join(""), "m"),
                    "index": index,
                    "next": index2 + 1
                };
            } else {
                return {
                    "type": ERR,
                    "description": "Regular expression not be terminated",
                    "content": null,
                    "index": length
                };
            }

        };

        // number: 0 - 9
        case 48: case 49: case 50: case 51: case 52:
        case 53: case 54: case 55: case 56: case 57: {

            let hasDot = false;

            let index2 = index;
            while ((index2 < length) &&
                   (((codes[index2] >= 48) && (codes[index2] <= 57)) || (codes[index2] === 46))) { // 0 - 9 and dot
                if (codes[index2] == 46) { // is dot
                    if (hasDot) {
                        return {
                            "type": ERR,
                            "description": "Two dots have been found in number",
                            "index": index2
                        };
                    } else {
                        hasDot = true;
                    }
                }
                ++index2;
            }

            let symbol = String.fromCodePoint.apply(String, codes.slice(index, index2));
            return {
                "type": NUM,
                "content": hasDot ? parseFloat(symbol) : parseInt(symbol),
                "index": index,
                "next": index2
            };

        };

        // operators
        case 46:            // .
        case 43:            // +
        case 45:            // -
        case 61:            // =
        case 42:            // *
        case 47:            // /
        case 38:            // &
        case 33:            // !
        case 94:            // ^
        case 37:            // %
        case 126:           // ~
        case 60:            // <
        case 62:            // >
        case 44:            // ,
        case 63:            // ?
        case 58:            // :
        case 59:            // ;
        case 124:           // |
        case 40:            // (
        case 41:            // )
        case 91:            // [
        case 93:            // ]
        case 123:           // {
        case 125:           // }
        {
            if ((index + 1 < length) &&
                (combinedOperators.indexOf(String.fromCodePoint(codes[index], codes[index + 1])) !== -1)) {
                return {
                    "type": OPR,
                    "content": String.fromCodePoint(codes[index], codes[index + 1]),
                    "index": index,
                    "next": index + 2
                };
            } else {
                let type = OPR;
                if (options && options.variantPlaceholder && (codes[index] === 63)) {
                    // regard ? as symbol for SQL
                    type = SYM;
                }
                return {
                    "type": type,
                    "content": String.fromCodePoint(codes[index]),
                    "index": index,
                    "next": index + 1
                };
            }
        };

        default: {

            var index2 = index;
            while ((index2 < length) &&
                   ([
                    // whitespaces
                    9, 10, 13, 32,
                    // quotations and regex
                    34, 39, 35,
                    // operators
                    46, 43, 45, 61, 42, 47, 38, 33, 94, 37, 126, 60, 62, 44, 63, 58, 59, 124, 40, 41, 91, 93, 123, 125
                    ].indexOf(codes[index2]) === -1)) {
                ++index2;
            }

            var symbol = String.fromCodePoint.apply(String, codes.slice(index, index2));
            return {
                "type": SYM,
                "content": symbol,
                "index": index,
                "next": index2
            };
        }

    }

};

const convertTemplateCharacter = function (template, options) {

    const codes = Array.prototype.map.call(template, (char) => char.codePointAt(0));

    const length = codes.length;

    const symbols = [];

    let looper = 0;
    while (looper < length) {
        let symbol = getTemplateSymbol(codes, looper, options);
        switch (symbol.type) {
            case ERR: {
                throwTemplateError(symbol.description, template, symbol.index);
                break;
            };
            case EOT: {
                looper = template.length;
                break;
            };
            case NUM: case OPR: case SYM: case QOT: case REG:
            default: {
                symbols.push(symbol);
                looper = symbol.next;
                break;
            };
        }
    }

    return symbols;

};

const convertTemplateBracket = function (template, symbols) {

    const queue = [];
    queue.type = BLK;
    queue.operator = "";
    queue.symbol = symbols[0];

    let current = queue;

    for (symbol of symbols) {
        if (symbol.type == OPR) {
            switch (symbol.content) {

                case "(": case "[": case "{": {

                    let newQueue = [];

                    newQueue.superqueue = current;
                    newQueue.type = BLK;
                    newQueue.operator = symbol.content;
                    newQueue.symbol = symbol;
                    newQueue.index = symbol.index;

                    current.push(newQueue);

                    current = newQueue;

                    break;
                };

                case ")": case "]": case "}": {

                    if ((!current.superqueue) ||
                        ((current.operator === "") ||
                         ((current.operator !== "(") && (symbol.content === ")")) ||
                         ((current.operator !== "[") && (symbol.content === "]")) ||
                         ((current.operator !== "{") && (symbol.content === "}")))) {

                        let symbol2 = current.symbol;
                        if (current.length > 0) {
                            symbol2 = current[current.length - 1];
                            if (symbol2.type == BLK) {
                                symbol2 = symbol2.symbol;
                            }
                        }

                        if (!symbol2) {
                            symbol2 = symbols[symbols.length - 1];
                        }

                        if (!current.superqueue) {
                            throwTemplateError("No close brackets found", template, symbol2.index);
                        } else {
                            throwTemplateError("Brackets not matched", template, symbol2.index);
                        }

                        break;
                    }

                    current = current.superqueue;

                    break;
                };

                default: {
                    current.push(symbol);
                    break;
                };

            }
        } else {
            current.push(symbol);
        }
    };

    return queue;

};

const convertTemplateSugarDot = function (template, symbols, index, queue, symbol) {

    // property getter
    // from: a x b . c
    // to: . ( a x b, "c" )

    let block = [];
    block.symbol = symbol;
    block.type = BLK;
    block.operator = "(";

    while ((queue.length > 0) &&
           (queue[queue.length - 1].type != OPR)) {
        block.unshift(queue.pop());
    }

    queue.push({
        "type": OPS,
        "content": ".",
        "index": symbol.index,
        "next": symbol.next
    });

    block.push({
        "type": OPR,
        "content": ",",
        "index": symbol.index,
        "next": symbol.next
    });

    let nextSymbol = symbols[index + 1];
    if (nextSymbol.type != SYM) {
        throwTemplateError("Invalid usage of dot on syntax", template, nextSymbol.index);
        return;
    }

    block.push({
        "type": QOT,
        "content": nextSymbol.content,
        "index": nextSymbol.index,
        "next": nextSymbol.next
    });

    queue.push(block);

    return index + 2;

};

const convertTemplateSugarOperatorCall = function (template, symbols, index, queue, symbol) {

    // { a b c }

    var nextSymbol = convertTemplateSugar(template, symbol);

    queue.push({
        "type": OPS,
        "content": "$",
        "index": symbol.index,
        "next": symbol.next
    });

    var block = [];
    block.symbol = symbol;
    block.type = BLK;
    block.operator = "(";
    block.index = symbol.index;

    block.push.apply(block, nextSymbol);

    queue.push(block);

};

const convertTemplateSugarOperatorOperator = function (template, symbols, index, queue, symbol) {

    // operator operator
    // from: { x }
    // to: { $1 x $2 }
    // to: { x $1 }
    // to: { $n == 1 ? x $1 : $1 x $2 }

    queue.push({
        "type": OPS,
        "content": "$",
        "index": symbol.index,
        "next": symbol.next
    });

    const block = [];
    block.symbol = symbol;
    block.type = BLK;
    block.operator = "(";
    block.index = symbol.index;

    const newSymbol = function (type, content) {
        return {
            "type": type,
            "content": content,
            "index": symbol[0].index,
            "next": symbol[0].next
        };
    };

    switch (symbol[0].content) {

        case "-": {

            // from: { - }
            // to: { $n == 1 ? - $1 : $1 - $2 }

            block.push(newSymbol(SYM, "$n"));
            block.push(newSymbol(OPR, "=="));
            block.push(newSymbol(NUM, 1));


            block.push(newSymbol(OPR, "?"));
            block.push(newSymbol(OPR, symbol[0].content));
            block.push(newSymbol(SYM, "$1"));
            block.push(newSymbol(OPR, ":"));
            block.push(newSymbol(SYM, "$1"));
            block.push(newSymbol(OPR, symbol[0].content));
            block.push(newSymbol(SYM, "$2"));

            break;
        };

        case "~":
        case "!": {

            // from: { x }
            // to: { x $1 }

            block.push(newSymbol(OPR, symbol[0].content));
            block.push(newSymbol(SYM, "$1"));

            break;
        };

        default: {

            // from: { x }
            // to: { $1 x $2 }

            block.push(newSymbol(SYM, "$1"));
            block.push(newSymbol(OPR, symbol[0].content));
            block.push(newSymbol(SYM, "$2"));

            break;
        };

    }

    queue.push(block);

};

const convertTemplateSugarOperatorFunctor = function (template, symbols, index, queue, symbol) {

    // functor operator
    // from: { x ? }
    // to: $ ( : ( "x" , $a ) )

    const newSymbol = function (type, content) {
        return {
            "type": type,
            "content": content,
            "index": symbol[0].index,
            "next": symbol[0].next
        };
    };

    queue.push({
        "type": OPS,
        "content": "$",
        "index": symbol.index,
        "next": symbol.next
    });

    let block = [];
    block.symbol = symbol;
    block.type = BLK;
    block.operator = "(";
    block.index = symbol.index;

    block.push(newSymbol(OPS, ":"));

    let block2 = [];
    block2.symbol = symbol;
    block2.type = BLK;
    block2.operator = "(";
    block2.index = symbol.index;

    block2.push(newSymbol(QOT, symbol[0].content));
    block2.push(newSymbol(OPR, ","));
    block2.push(newSymbol(SYM, "$a"));

    block.push(block2);

    queue.push(block);

};

const convertTemplateSugarObjectOrSwitch = function (template, symbols, index, queue, symbol, operator, separator) {

    // object
    // from: { a : b c , d : e f }
    // to: @ ( a , b c , d , e f )

    // switch
    // from: { a ? b c , d ? e f }
    // to: ? ( a , b c , d , e f )

    queue.push({
        "type": OPS,
        "content": operator,
        "index": symbol.index,
        "next": symbol.next
    });

    let block = [];
    block.symbol = symbol;
    block.type = BLK;
    block.operator = "(";

    let sugared = convertTemplateSugar(template, symbol);

    let accumulated = 0;
    let stage = 0;

    let looper = 0;
    while (looper < sugared.length) {

        let symbol = sugared[looper];
        if (symbol.type === OPR) {
            switch (symbol.content) {

                case ",": {
                    if (stage === 0) {
                        throwTemplateError("Unexpected character: \",\"", template, symbol.index); return;
                    }
                    stage = 0;
                    block.push(symbol);
                    break;
                };

                case "?": {
                    if (accumulated === 0) {
                        if (separator === "?") {
                            // if block is switch, get next operator [ "," | ":" | "?" ]
                            let looper2 = looper + 1;
                            while ((looper2 < sugared.length) &&
                                   ((sugared[looper2].type !== OPR) ||
                                    ((sugared[looper2].content !== ",") &&
                                     (sugared[looper2].content !== ":") &&
                                     (sugared[looper2].content !== "?")))) {
                                ++looper2;
                            }
                            if ((looper2 >= sugared.length) ||
                                (sugared[looper2].content === ",")) {
                                // ended or next is ","
                                if (stage === 1) {
                                    throwTemplateError("Unexpected character: \"" + symbol.content + "\"", template, symbol.index);
                                    return;
                                }
                                stage = 1;
                                block.push({
                                    "type": OPR,
                                    "content": ",",
                                    "index": symbol.index,
                                    "next": symbol.next
                                });
                            } else {
                                // next is [ "?" | ":" ]
                                block.push(symbol);
                            }
                        } else {
                            block.push(symbol);
                        }
                    } else {
                        ++accumulated;
                        block.push(symbol);
                    }
                    break;
                };

                case ":": {
                    if (accumulated === 0) {
                        if ((separator === "?") || (stage === 1)) {
                            throwTemplateError("Unexpected character: \"" + symbol.content + "\"", template, symbol.index);
                            return;
                        }
                        stage = 1;
                        block.push({
                            "type": OPR,
                            "content": ",",
                            "index": symbol.index,
                            "next": symbol.next
                        });
                    } else {
                        if (stage === 1) {
                            throwTemplateError("Unexpected character: \"" + symbol.content + "\"", template, symbol.index);
                            return;
                        }
                        --accumulated;
                        block.push(symbol);
                    }
                    break;
                };

                default: {
                    block.push(symbol);
                    break;
                };

            }
        } else {
            block.push(symbol);
        }

        ++looper;
    }

    if ((block.length > 0) && (block[block.length - 1].type === OPR) && (block[block.length - 1].content === ",")) {
        throwTemplateError("Unexpected character: \",\"", template, block[block.length - 1].index); return;
    }

    queue.push(block);

};

const convertTemplateSugarBracketSquare = function (template, symbols, index, queue, symbol) {

    // property getter
    // from: a x b [ c d ]
    // to: . ( a x b, ( c d ) )

    // array
    // from: [ c d ]
    // to: # ( c d )

    const block = [];
    block.symbol = symbol;
    block.type = BLK;
    block.operator = "(";

    while ((queue.length > 0) &&
           (queue[queue.length - 1].type != OPR)) {
        block.unshift(queue.pop());
    }

    var nextSymbol = convertTemplateSugar(template, symbol);

    queue.push({
        "type": OPS,
        "content": ((block.length > 0) ? "." : "#"),
        "index": symbol.index,
        "next": symbol.next
    });

    if (block.length > 0) {
        block.push({
            "type": OPR,
            "content": ",",
            "index": symbol.index,
            "next": symbol.next
        });
    }

    block.push.apply(block, nextSymbol);

    queue.push(block);

    return index + 1;

};

const convertTemplateSugarDollarTemplate = function (template, symbols, index, queue, symbol) {

    // property getter
    // from: $ { a b }
    // to: @eval("a b")

    let dollar = queue.pop();

    queue.push({
        "type": SYM,
        "content": "@eval",
        "index": dollar.index,
        "next": dollar.next
    });

    let from = symbol[0].index;
    let to = symbol[symbol.length - 1].next;

    block = [];
    block.type = BLK;
    block.operator = "(";
    block.symbol = symbol;
    block.push({
        "type": QOT,
        "content": template.slice(from, to),
        "index": symbol[0].index,
        "next": symbol[symbol.length - 1].next
    });

    queue.push(block);

    return index + 1;

};

const convertTemplateSugarBracketBrace = function (template, symbols, index, queue, symbol) {

    let objectSignatures = 0;
    let switchSignatures = 0;

    let looper = 0;
    while (looper < symbol.length) {
        if (symbol[looper].type === OPR) {
            switch (symbol[looper].content) {
                case ":": { ++objectSignatures; break; };
                case "?": { ++switchSignatures; break; };
            }
        }
        ++looper;
    }

    if (queue[queue.length - 1] &&
        (queue[queue.length - 1].type === SYM) && (queue[queue.length - 1].content === "$")) {
        // template $ { a b c }
        convertTemplateSugarDollarTemplate(template, symbols, index, queue, symbol);
    } else if ((symbol.length === 0) || (objectSignatures > switchSignatures)) {
        // object { a : b , c : d }
        convertTemplateSugarObjectOrSwitch(template, symbols, index, queue, symbol, "@", ":");
    } else if (objectSignatures < switchSignatures)  {
        if ((symbol.length === 2) && (symbol[0].type === SYM)) {
            // operator { x ? }
            convertTemplateSugarOperatorFunctor(template, symbols, index, queue, symbol);
        } else {
            // switch { a ? b , c ? d }
            convertTemplateSugarObjectOrSwitch(template, symbols, index, queue, symbol, "?", "?");
        }
    } else {
        if ((symbol.length === 1) && (symbol[0].type === OPR)) {
            // operator { . }
            convertTemplateSugarOperatorOperator(template, symbols, index, queue, symbol);
        } else {
            // operator { a , b c }
            convertTemplateSugarOperatorCall(template, symbols, index, queue, symbol);
        }
    }

    return index + 1;

};

const convertTemplateSugar = function (template, symbols) {

    const queue = [];

    queue.symbol = symbols.symbol;
    queue.type = symbols.type;
    queue.operator = symbols.operator;

    let index = 0;
    while (index < symbols.length) {
        let symbol = symbols[index];
        switch (symbol.type) {
            case OPR: {
                if (symbol.content === ".") {
                    index = convertTemplateSugarDot(template, symbols, index, queue, symbol);
                } else {
                    queue.push(symbol);
                    ++index;
                }
                break;
            };
            case BLK: {
                if (symbol.operator === "[") {
                    index = convertTemplateSugarBracketSquare(template, symbols, index, queue, symbol);
                } else if (symbol.operator == "{") {
                    index = convertTemplateSugarBracketBrace(template, symbols, index, queue, symbol);
                } else {
                    queue.push(convertTemplateSugar(template, symbol));
                    ++index;
                }
                break;
            };
            case NUM: case SYM: case QOT: case REG:
            default: {
                queue.push(symbol);
                ++index;
                break;
            }
        }
    }

    return queue;

};

const convertTemplateCall = function (template, symbols) {

    let queue = [];
    queue.symbol = symbols.symbol;
    queue.type = symbols.type;
    queue.operator = symbols.operator;

    for (let symbol of symbols) {
        switch (symbol.type) {

            case BLK: {

                if (symbol.operator === "(") {

                    if ((queue.length > 0) &&
                        ((queue[queue.length - 1].type === SYM) ||
                         (queue[queue.length - 1].type === OPS))) {

                        // call
                        // from: x ( a , b c , d )
                        // to: Call.x{ {a}, {b c} , {d} }

                        let name = queue.pop();

                        let callArguments = [];

                        let block = [];
                        block.type = BLK;
                        block.operator = "";
                        block.symbol = symbol;

                        callArguments.push(block);

                        for (let subsymbol of symbol) {
                            if ((subsymbol.type === OPR) && (subsymbol.content === ",")) {

                                if (callArguments[callArguments.length - 1].length == 0) {
                                    throwTemplateError("Unexpected character \",\"", template, subsymbol.index);
                                    return;
                                }

                                let block = [];
                                block.type = BLK;
                                block.operator = "";
                                block.symbol = symbol;

                                callArguments.push(block);

                            } else {
                                callArguments[callArguments.length - 1].push(subsymbol);
                            }
                        }

                        var looper = 0;
                        while (looper < callArguments.length) {
                            callArguments[looper] = convertTemplateCall(template, callArguments[looper]);
                            ++looper;
                        }

                        if ((callArguments.length == 1) && (callArguments[0].length == 0)) {
                            callArguments.length = 0;
                        }

                        queue.push({
                            "type": ((name.type == SYM) ? FNC : OPC),
                            "content": name.content,
                            "arguments": callArguments,
                            "symbol": name,
                            "index": name.index,
                            "next": name.next
                        });

                    } else {
                        queue.push(convertTemplateCall(template, symbol));
                    }

                } else {
                    queue.push(convertTemplateCall(template, symbol));
                }

                break;
            };

            case OPR: case OPS: case NUM: case SYM: case QOT: case REG:
            default: {
                queue.push(symbol);
                break;
            };

        }
    }

    return queue;

};

const convertUnaryOperator = function (template, level, queue) {

    let looper = queue.length;
    while (looper > 0) {
        --looper;

        let maught = ((queue[looper].type == OPR) &&
                      (operatorQueue[level].indexOf(queue[looper].content) > 0));
        if (maught && (queue[looper].content === "-")) {
            if ((looper > 0) && (queue[looper - 1].type !== OPR)) {
                maught = false;
            }
        }

        if (maught) {

            if (looper + 1 >= queue.length) {
                throwTemplateError("No operatee found for operator \"" + queue[looper].content + "\"", template, queue[looper].index);
            }

            let callArguments = [];

            let block = [];
            block.type = BLK;
            block.operator = "";
            block.symbol = queue[looper];

            callArguments.push(block);

            block.push(queue[looper + 1]);

            queue.splice(looper, 2, {
                "type": OPC,
                "content": queue[looper].content,
                "arguments": callArguments,
                "symbol": queue[looper],
                "index": queue[looper].index,
                "next": queue[looper].next
            });

        }

    }

};

const convertBinaryOperator = function (template, level, queue) {

    const left = (operatorQueue[level][0] == "left");

    let looper = left ? 0 : queue.length - 1;
    while ((looper < queue.length) && (looper >= 0)) {
        let maught = ((queue[looper].type == OPR) &&
                      (operatorQueue[level].indexOf(queue[looper].content) > 0));
        if (maught) {

            let callArguments = [];

            if ((looper + 1 >= queue.length) || (looper < 1)) {
                throwTemplateError("No operatee found for operator \"" + queue[looper].content + "\"", template, queue[looper].index);
            }

            let block = [];
            block.type = BLK;
            block.operator = "";
            block.symbol = queue[looper];

            callArguments.push(block);

            block.push(queue[looper - 1]);

            block = [];
            block.type = BLK;
            block.operator = "";
            block.symbol = queue[looper];

            callArguments.push(block);

            block.push(queue[looper + 1]);

            queue.splice(looper - 1, 3, {
                "type": OPC,
                "content": queue[looper].content,
                "arguments": callArguments,
                "symbol": queue[looper],
                "index": queue[looper].index,
                "next": queue[looper].next
            });

            --looper;
        }

        if (left) { ++looper;
        } else { --looper;
        }
    }

};

const convertTenaryOperator = function (template, level, queue) {

    let looper = queue.length;
    while (looper > 0) {
        --looper;

        let maught = ((queue[looper].type == OPR) &&
                      (queue[looper].content === ":"));
        if (maught) {

            if ((looper + 1 >= queue.length) || (looper < 2)) {
                throwTemplateError("No operatee found for operator \"?:\"", template, queue[looper].index);
            }

            let callArguments = [];

            if ((queue[looper - 1].type === OPR) && (queue[looper - 1].content === "?")) {

                let block = [queue[looper - 2]];
                block.type = BLK;
                block.operator = "";
                block.symbol = queue[looper];

                callArguments.push(block);

                block = [queue[looper + 1]];
                block.type = BLK;
                block.operator = "";
                block.symbol = queue[looper];

                callArguments.push(block);

                queue.splice(looper - 2, 4, {
                    "type": OPC,
                    "content": "?:",
                    "arguments": callArguments,
                    "symbol": queue[looper],
                    "index": queue[looper].index,
                    "next": queue[looper].next
                });

                looper -= 2;

            } else if ((queue[looper - 2].type === OPR) && (queue[looper - 2].content === "?")) {

                let block = [queue[looper - 3]];
                block.type = BLK;
                block.operator = "";
                block.symbol = queue[looper];

                callArguments.push(block);

                block = [queue[looper - 1]];
                block.type = BLK;
                block.operator = "";
                block.symbol = queue[looper];

                callArguments.push(block);

                block = [queue[looper + 1]];
                block.type = BLK;
                block.operator = "";
                block.symbol = queue[looper];

                callArguments.push(block);

                queue.splice(looper - 3, 5, {
                    "type": OPC,
                    "content": "?:",
                    "arguments": callArguments,
                    "symbol": queue[looper],
                    "index": queue[looper].index,
                    "next": queue[looper].next
                });

                looper -= 3;

            } else {
                throwTemplateError("Operator \"?:\" missing \"?\"", template, queue[looper].index);
            }

        }

    }

};

const convertTemplateOperator = function (template, symbols) {

    // convert flat queue

    const queue = symbols.slice(0);
    queue.symbol = symbols.symbol;
    queue.type = symbols.type;
    queue.operator = symbols.operator;
    queue.operatorNo = true;

    let level = 0;
    while (level < operatorQueue.length) {

        if (operatorQueue[level][0] === "unary") {
            // [ "right", "!", "~", "-" ]
            convertUnaryOperator(template, level, queue);
        } else if (operatorQueue[level][0] === "tenary") {
            // [ "right", "?:" ]
            convertTenaryOperator(template, level, queue);
        } else {
            convertBinaryOperator(template, level, queue);
        }

        ++level;
    }

    // convert subblocks

    const result = [];
    result.symbol = queue.symbol;
    result.type = queue.type;
    result.operator = queue.operator;

    for (let symbol of queue) {
        switch (symbol.type) {

            case BLK: {
                result.push(convertTemplateOperator(template, symbol)); break;
            };

            case FNC: case OPC: {

                let newArguments = [];
                for (let argument of symbol.arguments) {
                    newArguments.push(convertTemplateOperator(template, argument));
                }

                result.push({
                    "type": symbol.type,
                    "content": symbol.content,
                    "arguments": newArguments,
                    "symbol": symbol.symbol,
                    "index": symbol.index,
                    "next": symbol.next
                });

                break;
            };

            case OPR: case OPS: case NUM: case SYM: case QOT: case REG:
            default: {
                result.push(symbol); break;
            }

        }

    }

    return result;

};

const convertTemplateQueue = function (template, queue) {

    if ((!queue) || (queue.length == 0)) {
        return;
    }

    if (queue.length > 1) {
        throwTemplateError("Queue could not be simplfied to pure function calls", template, queue[0].index);
        return;
    }

    switch (queue[0].type) {

        case FNC: case OPC: {

            let newArguments = [];
            for (let argument of queue[0].arguments) {
                newArguments.push(convertTemplateQueue(template, argument));
            }

            return {
                "type": queue[0].type,
                "content": queue[0].content,
                "arguments": newArguments,
                "index": queue[0].index
            };

        };

        case BLK: {
            return convertTemplateQueue(template, queue[0]);
        };

        case SYM: case QOT: case REG: case NUM: {
            return queue[0];
        };

        case OPR: case OPS:
        default: {
            throwTemplateError("Queue could not be simplfied to pure function calls", template, queue[0].index);
            return;
        }

    }

};

const getTemplateCallAction = function (template, call, options) {

    let action = null;
    if (call.type == FNC) {
        if (options.functors) {
            action = options.functors[call.content];
        }
        if (!action) {
            action = functors[call.content];
        }
    } else {
        action = operators[call.content];
    }

    if ((action === Function) || (action === eval)) {
        action = null;
    }

    if ((!action) || (typeof action !== "function")) {
        throwTemplateError("Function or operator " + call.content + " not found", template, call.index);
    }

    return action;
};

const runTemplateCallSync = function (template, call, parameters, options) {

    switch (call.type) {

        case FNC: case OPC: {

            let action = getTemplateCallAction(template, call, options);

            let lazyArguments = call.arguments.map(function (argument) {
                let result = undefined;
                let called = false;
                return function () {
                    if (!called) {
                        result = runTemplateCallSync(template, argument, parameters, options);
                        called = true;
                    }
                    return result;
                };
            });

            if (!action.lazy) {
                lazyArguments = lazyArguments.map((argument) => argument());
            }

            var callArguments = [template, call, parameters, options].concat(lazyArguments);

            let result = action.apply(null, callArguments);

            return result;

        };

        case SYM: {

            switch (call.content) {

                case "true": { return true; };
                case "false": { return false; };
                case "null": { return null; };
                case "undefined": { return undefined; };

                case "nan": { return NaN; };
                case "infinity": { return Infinity; };

                case "$d": { return parameters; };

                default: { return parameters[call.content]; };

            }

        };

        case NUM: case QOT: case REG: {
            return call.content;
        };

        case OPR: case OPS:
        default: {
            throwTemplateError("Invalid code", template, call.index);
            return;
        };

    }

};

const prepareTemplateOptions = function (options) {

    return mergeOptions(options);

};

const runTemplateCall = function (template, call, parameters, options, optionsAlreadyMerged) {

    if (!optionsAlreadyMerged) {
        options = mergeOptions(options);
    }

    parameters = Object.assign({}, parameters);

    return runTemplateCallSync(template, call, parameters, options);

};

const executeTemplateCall = function (template, parameters, options, optionsAlreadyMerged) {

    if (!optionsAlreadyMerged) {
        options = mergeOptions(options);
    }

    parameters = Object.assign({}, parameters);

    let call = undefined;
    if (typeof template === "string") {
        call = compileTemplateCall(template, options);
    } else {
        call = template;
        template = call.template;
    }

    return runTemplateCall(template, call, parameters, options, true);

};

const compileTemplateCall = function (template, options, optionsAlreadyMerged) {

    if (!optionsAlreadyMerged) {
        options = mergeOptions(options);
    }

    let symbols = convertTemplateCharacter(template, options);
    if (symbols.length == 0) {
        return null;
    }

    symbols = convertTemplateBracket(template, symbols);
    symbols = convertTemplateSugar(template, symbols);
    symbols = convertTemplateCall(template, symbols);
    symbols = convertTemplateOperator(template, symbols);

    const call = convertTemplateQueue(template, symbols);

    call.template = template;

    return call;

};

const compileTemplate = function (template, options, optionsAlreadyMerged) {

    if (!optionsAlreadyMerged) {
        options = mergeOptions(options);
    }

    if (!parsers[options.parser]) {
        throw new Error(`Parser ${options.parser} not found`);
    }

    return parsers[options.parser].compileTemplate(template, options);

};

const parseTemplate = function (template, parameters, options, optionsAlreadyMerged) {

    if (!optionsAlreadyMerged) {
        options = mergeOptions(options);
    }

    parameters = Object.assign({}, parameters);

    if (!parsers[options.parser]) {
        throw new Error(`Parser ${options.parser} not found`);
    }

    return parsers[options.parser].parseTemplate(template, parameters, options);

};

const resolveDirectDependencies = function (call, options) {

    switch (call.type) {

        case FNC: case OPC: {

            var action = getTemplateCallAction(call.template, call, options);

            if (action.resolveDependencies) {
                return action.resolveDependencies(call.arguments, options);
            } else if ((!action) || ((!action.noExtraDependencies) && (!action.resolveDependencies))) {
                return ["*"];
            }

            const result = {};
            let looper = 0;
            while (looper < call.arguments.length) {
                let argument = call.arguments[looper];
                let subresult = resolveDirectDependencies(argument, options);
                if (subresult.indexOf("*") !== -1) {
                    return ["*"];
                }
                let looper2 = 0;
                while (looper2 < subresult.length) {
                    result[subresult[looper2]] = true;
                    ++looper2;
                }
                ++looper;
            }

            return Object.keys(result);
        };

        case SYM: {
            switch (call.content) {
                case "true": case "false":
                case "null": case "undefined":
                case "nan": case "infinity": { return []; };
                default: { return [call.content]; };
            }
        };

        case NUM: case QOT: case REG: { return []; };

        case OPR: case OPS:
        default: {
            console.log(call);
            throwTemplateError("Invalid code", template, call.index);
        };

    }

};

const simplifyDependenciesCache = function (call) {

    switch (call.type) {

        case OPC: {
            if (call.content === ".") {
                let superobject = simplifyDependenciesCache(call.arguments[0]);
                if (!(superobject[0] instanceof Array)) {
                    superobject = [superobject];
                }
                let subobject = simplifyDependenciesCache(call.arguments[1]);
                superobject.push(subobject);
                return superobject;
            } else {
                throw new Error("Invalid dependencies");
            }
        };

        case SYM: { return ["^", call.content]; };
        case QOT: { return ["'", call.content]; };
        case NUM: { return ["#", call.content + ""]; };

        default: { throw new Error("Invalid dependencies"); };

    }

};

/**
 * [API:Format] 分析编译后的Template内核脚本，并提取出依赖关系
 * @function <@.format.tmpl.deps>
 * @call {(call, options) -> deps}
 */
const resolveTemplateDependencies = function (call, options, records) {

    let result = resolveDirectDependencies(call, options);
    if (!records) {
        return result;
    }

    let recordeds = Object.create(null);
    let looper = 0;
    while (looper < records.length) {
        recordeds[records[looper].expression] = true;
        ++looper;
    }

    if (result.indexOf("*") !== -1) {
        return ["*"];
    }

    looper = 0;
    while (looper < result.length) {
        if (!recordeds[result[looper]]) {
            recordeds[result[looper]] = true;
            let call = compileTemplateCall(result[looper], options);
            let cache = simplifyDependenciesCache(call);
            if ((!(cache[0] instanceof Array)) && (cache[0] !== "*")) {
                cache = [cache];
            }
            records.push({
                "expression": result[looper],
                "template": cache,
                "value": {}
            });
        }
        ++looper;
    }

    return records;

};

const getDependencyValue = function (template, parameters) {

    let value = null;

    let looper = 0;
    while (looper < template.length) {
        let key = template[looper];
        if (looper === 0) {
            if (key[0] === "^") {
                value = parameters[key[1]];
            } else {
                value = key[1];
            }
        } else {
            if (key[0] instanceof Array) {
                let newKey = getDependencyValue(key, parameters);
                value = value[newKey];
            } else if (key[0] === "^") {
                value = value[parameters[key[1]]];
            } else {
                value = value[key[1]];
            }
        }
        if ((value === null) || (value === undefined)) {
            return value;
        }
        ++looper;
    }

    return value;

};

/**
 * [API:Format] 根据内核脚本依赖关系，判断输出是否会发生变化
 * @function <@.format.tmpl.deps.changed>
 * @call {(deps, parameters, options) -> changed}
 */
const isTemplateDependenciesChanged = function (dependencies, parameters, options) {

    if (dependencies[0] === "*") {
        return true;
    }

    if (dependencies.length === 0) {
        let changed = !dependencies.notFirstTime;
        dependencies.notFirstTime = true;
        return changed;
    }

    let changed = false;

    let looper = 0;
    while (looper < dependencies.length) {
        let dependency = dependencies[looper];
        let value = getDependencyValue(dependency.template, parameters);
        if (dependency.value !== value) {
            changed = true;
            dependency.value = value;
        } else if (value && (typeof value === "object")) {
            changed = true;
        }
        ++looper;
    }

    return changed;

};

const createTemplateCallClosure = function (template, options) {

    options = mergeOptions(options);

    let compiled = compileTemplateCall(template, options, true);

    if (options && options.jit) {
        return jit.jitTemplateCall(compiled, options);
    }

    return function (parameters) {
        return executeTemplateCall(compiled, parameters, options, true);
    };

};

const createTemplateClosure = function (template, options) {

    options = mergeOptions(options);

    let compiled = compileTemplate(template, options, true);

    return function (parameters) {
        return parseTemplate(compiled, parameters, options, true);
    };

};

module.exports.compileTemplate = compileTemplate;
module.exports.parseTemplate = parseTemplate;

module.exports.compileTemplateCall = compileTemplateCall;
module.exports.jitTemplateCall = jit.jitTemplateCall;

module.exports.stringifyTemplateCall = stringifyTemplateCall;

module.exports.runTemplateCall = runTemplateCall;
module.exports.executeTemplateCall = executeTemplateCall;

module.exports.resolveTemplateDependencies = resolveTemplateDependencies;
module.exports.isTemplateDependenciesChanged = isTemplateDependenciesChanged;

module.exports.templateFunctors = functors;
module.exports.templateOperators = operators;
module.exports.templateParsers = parsers;

module.exports.getTemplateSymbol = getTemplateSymbol;

module.exports.convertTemplateQueue = convertTemplateQueue;
module.exports.convertTemplateOperator = convertTemplateOperator;
module.exports.convertTemplateCall = convertTemplateCall;
module.exports.convertTemplateSugar = convertTemplateSugar;
module.exports.convertTemplateBracket = convertTemplateBracket;

module.exports.snapshotTemplateParameters = snapshotTemplateParameters;

module.exports.getTemplateCallAction = getTemplateCallAction;

module.exports.prepareTemplateOptions = prepareTemplateOptions;

module.exports.createTemplateCallClosure = createTemplateCallClosure;
module.exports.createTemplateClosure = createTemplateClosure;

module.exports.templateTokens = { BLK, QOT, NUM, SYM, OPR, FNC, OPC, REG, EOT, ERR, OPS };

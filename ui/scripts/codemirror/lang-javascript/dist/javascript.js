"use strict";
exports.__esModule = true;
var lezer_javascript_1 = require("../../3rd-parties/lezer-javascript.js");
var syntax_1 = require("../../syntax/dist/index.js");
var state_1 = require("../../state/dist/index.js");
var highlight_1 = require("../../highlight/dist/highlight.js");
var statementIndent = syntax_1.continuedIndent({ except: /^{/ });
/// A syntax provider based on the [Lezer JavaScript
/// parser](https://github.com/lezer-parser/javascript), extended with
/// highlighting and indentation information.
exports.javascriptSyntax = new syntax_1.LezerSyntax(lezer_javascript_1.parser.withProps(syntax_1.indentNodeProp.add(function (type) {
    if (type.name == "IfStatement")
        return syntax_1.continuedIndent({ except: /^({|else\b)/ });
    if (type.name == "TryStatement")
        return syntax_1.continuedIndent({ except: /^({|catch|finally)\b/ });
    if (type.name == "LabeledStatement")
        return syntax_1.flatIndent;
    if (type.name == "SwitchBody")
        return function (context) {
            var after = context.textAfter, closed = after[0] == "}", isCase = /^(case|default)\b/.test(after);
            return context.baseIndent + (closed ? 0 : isCase ? 1 : 2) * context.unit;
        };
    if (type.name == "TemplateString" || type.name == "BlockComment")
        return function () { return -1; };
    if (/(Statement|Declaration)$/.test(type.name) || type.name == "Property")
        return statementIndent;
    return undefined;
}), syntax_1.foldNodeProp.add({
    Block: function (tree) { return { from: tree.start + 1, to: tree.end - 1 }; }
}), state_1.languageData.add({
    Script: { closeBrackets: ["(", "[", "{", "'", '"', "`"] }
}), highlight_1.styleTags({
    "get set async static": "modifier",
    "for while do if else switch try catch finally return throw break continue default case": "keyword control",
    "in of await yield void typeof delete instanceof": "operatorKeyword",
    "export import let var const function class extends": "keyword definition",
    "with debugger from as": "keyword",
    TemplateString: "string type2",
    "BooleanLiteral Super": "atom",
    This: "self",
    Null: "null",
    Star: "modifier",
    VariableName: "variableName",
    VariableDefinition: "variableName definition",
    Label: "labelName",
    PropertyName: "propertyName",
    PropertyNameDefinition: "propertyName definition",
    "PostfixOp UpdateOp": "updateOperator",
    LineComment: "lineComment",
    BlockComment: "blockComment",
    Number: "number",
    String: "string",
    ArithOp: "arithmeticOperator",
    LogicOp: "logicOperator",
    BitOp: "bitwiseOperator",
    CompareOp: "compareOperator",
    RegExp: "regexp",
    Equals: "operator definition",
    Spread: "punctuation",
    "Arrow :": "punctuation definition",
    "( )": "paren",
    "[ ]": "squareBracket",
    "{ }": "brace",
    ".": "derefOperator",
    ", ;": "separator"
})));
/// Returns an extension that installs the JavaScript syntax provider.
function javascript() { return exports.javascriptSyntax.extension; }
exports.javascript = javascript;

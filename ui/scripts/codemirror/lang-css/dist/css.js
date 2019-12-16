"use strict";
exports.__esModule = true;
var lezer_css_1 = require("../../3rd-parties/lezer-css.js");
var syntax_1 = require("../../syntax/dist/index.js");
var highlight_1 = require("../../highlight/dist/highlight.js");
/// A syntax provider based on the [Lezer CSS
/// parser](https://github.com/lezer-parser/css), extended with
/// highlighting and indentation information.
exports.cssSyntax = new syntax_1.LezerSyntax(lezer_css_1.parser.withProps(syntax_1.indentNodeProp.add({
    Declaration: syntax_1.continuedIndent()
}), syntax_1.foldNodeProp.add({
    Block: function (subtree) { return { from: subtree.start + 1, to: subtree.end - 1 }; }
}), highlight_1.styleTags({
    "import charset namespace keyframes": "keyword definition",
    "media supports": "keyword control",
    "from to": "keyword",
    NamespaceName: "namespace",
    KeyframeName: "labelName",
    TagName: "typeName",
    ClassName: "className",
    PseudoClassName: "className constant",
    not: "operatorKeyword",
    IdName: "labelName",
    AttributeName: "propertyName",
    NumberLiteral: "number",
    PropertyName: "propertyName",
    KeywordQuery: "keyword",
    FeatureName: "propertyName",
    UnaryQueryOp: "operatorKeyword",
    callee: "keyword",
    ValueName: "atom",
    CallTag: "atom",
    Callee: "variableName",
    Unit: "unit",
    "UniversalSelector NestingSelector": "operator definition",
    AtKeyword: "keyword",
    MatchOp: "compareOperator",
    "ChildOp SiblingOp, LogicOp": "logicOperator",
    BinOp: "arithmeticOperator",
    Important: "modifier",
    Comment: "blockComment",
    ParenthesizedContent: "name type2",
    ColorLiteral: "color",
    StringLiteral: "string",
    ":": "punctuation definition",
    "PseudoOp #": "derefOperator",
    "; ,": "separator",
    "( )": "paren",
    "[ ]": "squareBracket",
    "{ }": "brace"
})));
/// Returns an extension that installs the CSS syntax provider.
function css() { return exports.cssSyntax.extension; }
exports.css = css;

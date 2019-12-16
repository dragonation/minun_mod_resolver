"use strict";
exports.__esModule = true;
var lezer_html_1 = require("../../3rd-parties/lezer-html.js");
var lang_css_1 = require("../../lang-css/dist/css.js");
var lang_javascript_1 = require("../../lang-javascript/dist/index.js");
var syntax_1 = require("../../syntax/dist/index.js");
var highlight_1 = require("../../highlight/dist/highlight.js");
/// A syntax provider based on the [Lezer HTML
/// parser](https://github.com/lezer-parser/html), wired up with the
/// JavaScript and CSS parsers to parse the content of `<script>` and
/// `<style>` tags.
exports.htmlSyntax = new syntax_1.LezerSyntax(lezer_html_1.configureHTML([
    { tag: "script",
        attrs: function (attrs) {
            return !attrs.type || /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^module$|^$/i.test(attrs.type);
        },
        parser: lang_javascript_1.javascriptSyntax.parser },
    { tag: "style",
        attrs: function (attrs) {
            return (!attrs.lang || attrs.lang == "css") && (!attrs.type || /^(text\/)?(x-)?(stylesheet|css)$/i.test(attrs.type));
        },
        parser: lang_css_1.cssSyntax.parser }
]).withProps(syntax_1.indentNodeProp.add(function (type) {
    if (type.name == "Element")
        return syntax_1.delimitedIndent({ closing: "</", align: false });
    if (type.name == "OpenTag" || type.name == "CloseTag" || type.name == "SelfClosingTag")
        return syntax_1.continuedIndent();
    return undefined;
}), syntax_1.foldNodeProp.add({
    Element: function (subtree) {
        var first = subtree.firstChild, last = subtree.lastChild;
        if (!first || first.name != "OpenTag")
            return null;
        return { from: first.end, to: last.name == "CloseTag" ? last.start : subtree.end };
    }
}), syntax_1.openNodeProp.add({
    "StartTag StartCloseTag": ["EndTag", "SelfCloseEndTag"],
    "OpenTag": ["CloseTag"]
}), syntax_1.closeNodeProp.add({
    "EndTag SelfCloseEndTag": ["StartTag", "StartCloseTag"],
    "CloseTag": ["OpenTag"]
}), highlight_1.styleTags({
    AttributeValue: "string",
    "Text RawText": "content",
    "StartTag StartCloseTag SelfCloserEndTag EndTag SelfCloseEndTag": "angleBracket",
    TagName: "typeName",
    MismatchedTagName: "typeName invalid",
    AttributeName: "propertyName",
    UnquotedAttributeValue: "string",
    Is: "operator definition",
    "EntityReference CharacterReference": "character",
    Comment: "blockComment",
    ProcessingInst: "operator meta",
    DoctypeDecl: "labelName meta"
})));
/// Returns an extension that installs the HTML syntax provider.
function html() { return exports.htmlSyntax.extension; }
exports.html = html;

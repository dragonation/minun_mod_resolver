"use strict";
exports.__esModule = true;
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
var style_mod_1 = require("../../3rd-parties/style-mod.js");
var view_1 = require("../../view/dist/index.js");
var state_1 = require("../../state/dist/index.js");
var Inherit = 1;
/// A tag system defines a set of node (token) tags used for
/// highlighting. You'll usually want to use the
/// [default](#highlight.defaultTags) set, but it is possible to
/// define your own custom system when that doesn't fit your use case.
var TagSystem = /** @class */ (function () {
    /// Define a tag system. Each tag identifies a type of syntactic
    /// element, which can have a single type and any number of flags.
    /// The `flags` argument should be an array of flag names, and the
    /// `types` argument an array of type names. Type names may have a
    /// `"name=parentName"` format to specify that this type is an
    /// instance of some other type, which means that, if no styling for
    /// the type itself is provided, it'll fall back to the parent
    /// type's styling.
    function TagSystem(options) {
        var _this = this;
        /// @internal
        this.typeNames = [""];
        /// A [node
        /// prop](https://lezer.codemirror.net/docs/ref#tree.NodeProp) used
        /// to associate styling tag information with syntax tree nodes.
        this.prop = new lezer_tree_1.NodeProp();
        this.flags = options.flags;
        this.types = options.types;
        this.flagMask = Math.pow(2, this.flags.length) - 1;
        this.typeShift = this.flags.length + 1;
        var parentNames = [undefined];
        for (var _i = 0, _a = options.types; _i < _a.length; _i++) {
            var type = _a[_i];
            var match = /^([\w\-]+)(?:=([\w-]+))?$/.exec(type);
            if (!match)
                throw new RangeError("Invalid type name " + type);
            this.typeNames.push(match[1]);
            parentNames.push(match[2]);
        }
        this.parents = parentNames.map(function (name) {
            if (name == null)
                return 0;
            var id = _this.typeNames.indexOf(name);
            if (id < 0)
                throw new RangeError("Unknown parent type '" + name + "' specified");
            return id;
        });
        if (this.flags.length > 29 || this.typeNames.length > Math.pow(2, 29 - this.flags.length))
            throw new RangeError("Too many style tag flags to fit in a 30-bit integer");
    }
    /// Parse a tag name into a numeric ID. Only necessary if you are
    /// manually defining [node properties](#highlight.TagSystem.prop)
    /// for this system.
    TagSystem.prototype.get = function (name) {
        var value = name.charCodeAt(0) == 43 ? 1 : 0; // Check for leading '+'
        for (var _i = 0, _a = (value ? name.slice(1) : name).split(" "); _i < _a.length; _i++) {
            var part = _a[_i];
            if (part) {
                var flag = this.flags.indexOf(part);
                if (flag > -1) {
                    value += 1 << (flag + 1);
                }
                else {
                    var typeID = this.typeNames.indexOf(part);
                    if (typeID < 0)
                        throw new RangeError("Unknown tag type '" + part + "'");
                    if (value >> this.typeShift)
                        throw new RangeError("Multiple tag types specified in '" + name + "'");
                    value += typeID << this.typeShift;
                }
            }
        }
        return value;
    };
    /// Create a
    /// [`PropSource`](https://lezer.codemirror.net/docs/ref#tree.PropSource)
    /// that adds node properties for this system. `tags` should map
    /// node type
    /// [selectors](https://lezer.codemirror.net/docs/ref#tree.NodeType^match)
    /// to tag names.
    TagSystem.prototype.add = function (tags) {
        var _this = this;
        var match = lezer_tree_1.NodeType.match(tags);
        return this.prop.add(function (type) {
            var found = match(type);
            return found == null ? undefined : _this.get(found);
        });
    };
    /// Create a highlighter extension for this system, styling the
    /// given tags using the given CSS objects.
    TagSystem.prototype.highlighter = function (spec) {
        var _this = this;
        var styling = new Styling(this, spec);
        var plugin = view_1.ViewPlugin.create(function (view) { return new Highlighter(view, _this.prop, styling); })
            .decorations(function (h) { return h.decorations; });
        return [plugin.extension, view_1.EditorView.styleModule(styling.module)];
    };
    /// @internal
    TagSystem.prototype.specificity = function (tag) {
        var flags = tag & this.flagMask, spec = 0;
        for (var i = 1; i <= this.flags.length; i++)
            if (flags & (1 << i))
                spec++;
        for (var type = tag >> (this.flags.length + 1); type; type = this.parents[type])
            spec += 1000;
        return spec;
    };
    return TagSystem;
}());
exports.TagSystem = TagSystem;
/// The set of highlighting tags used by regular language packages and
/// themes.
exports.defaultTags = new TagSystem({
    flags: ["invalid", "meta", "type2", "type3", "type4",
        "link", "strong", "emphasis", "heading", "list", "quote",
        "changed", "inserted", "deleted",
        "definition", "constant", "control"],
    types: [
        "comment",
        "lineComment=comment",
        "blockComment=comment",
        "name",
        "variableName=name",
        "typeName=name",
        "propertyName=name",
        "className=name",
        "labelName=name",
        "namespace=name",
        "literal",
        "string=literal",
        "character=string",
        "number=literal",
        "integer=number",
        "float=number",
        "regexp=literal",
        "escape=literal",
        "color=literal",
        "content",
        "keyword",
        "self=keyword",
        "null=keyword",
        "atom=keyword",
        "unit=keyword",
        "modifier=keyword",
        "operatorKeyword=keyword",
        "operator",
        "derefOperator=operator",
        "arithmeticOperator=operator",
        "logicOperator=operator",
        "bitwiseOperator=operator",
        "compareOperator=operator",
        "updateOperator=operator",
        "typeOperator=operator",
        "punctuation",
        "separator=punctuation",
        "bracket=punctuation",
        "angleBracket=bracket",
        "squareBracket=bracket",
        "paren=bracket",
        "brace=bracket"
    ]
});
/// Used to add a set of tags to a language syntax via
/// [`Parser.withProps`](https://lezer.codemirror.net/docs/ref#lezer.Parser.withProps).
/// The argument object can use syntax node selectors (see
/// [`NodeType.match`](https://lezer.codemirror.net/docs/ref#tree.NodeType^match))
/// as property names, and tag names (in the [default tag
/// system](#highlight.defaultTags)) as values.
exports.styleTags = function (tags) { return exports.defaultTags.add(tags); };
/// Create a highlighter theme that adds the given styles to the given
/// tags. The spec's property names must be tag names, and the values
/// [`style-mod`](https://github.com/marijnh/style-mod#documentation)
/// style objects that define the CSS for that tag.
exports.highlighter = function (spec) { return exports.defaultTags.highlighter(spec); };
var StyleRule = /** @class */ (function () {
    function StyleRule(type, flags, specificity, cls) {
        this.type = type;
        this.flags = flags;
        this.specificity = specificity;
        this.cls = cls;
    }
    return StyleRule;
}());
var Styling = /** @class */ (function () {
    function Styling(tags, spec) {
        this.tags = tags;
        this.cache = Object.create(null);
        var modSpec = Object.create(null);
        var nextCls = 0;
        var rules = [];
        for (var prop in spec) {
            var tag = tags.get(prop);
            var cls = "c" + nextCls++;
            modSpec[cls] = spec[prop];
            rules.push(new StyleRule(tag >> tags.typeShift, tag & tags.flagMask, tags.specificity(tag), cls));
        }
        this.rules = rules.sort(function (a, b) { return b.specificity - a.specificity; });
        this.module = new style_mod_1.StyleModule(modSpec);
    }
    Styling.prototype.match = function (tag) {
        var known = this.cache[tag];
        if (known != null)
            return known;
        var result = "";
        var type = tag >> this.tags.typeShift, flags = tag & this.tags.flagMask;
        for (;;) {
            for (var _i = 0, _a = this.rules; _i < _a.length; _i++) {
                var rule = _a[_i];
                if (rule.type == type && (rule.flags & flags) == rule.flags) {
                    if (result)
                        result += " ";
                    result += this.module[rule.cls];
                    flags &= ~rule.flags;
                    if (type)
                        break;
                }
            }
            if (type)
                type = this.tags.parents[type];
            else
                break;
        }
        return this.cache[tag] = result;
    };
    return Styling;
}());
var Highlighter = /** @class */ (function () {
    function Highlighter(view, prop, styling) {
        this.prop = prop;
        this.styling = styling;
        this.partialDeco = false;
        this.syntax = null;
        this.decorations = view_1.Decoration.none;
        for (var _i = 0, _a = view.state.behavior(state_1.EditorState.syntax); _i < _a.length; _i++) {
            var s = _a[_i];
            this.syntax = s;
            break;
        }
        this.buildDeco(view);
    }
    Highlighter.prototype.update = function (update) {
        if (this.partialDeco || update.docChanged || update.viewportChanged)
            this.buildDeco(update.view);
    };
    Highlighter.prototype.buildDeco = function (view) {
        var _this = this;
        if (!this.syntax)
            return;
        var _a = view.viewport, from = _a.from, to = _a.to;
        var _b = this.syntax.getTree(view.state, from, to), tree = _b.tree, rest = _b.rest;
        this.partialDeco = !!rest;
        if (rest)
            view.waitFor(rest);
        var tokens = [];
        var start = from;
        function flush(pos, style) {
            if (pos > start && style)
                tokens.push(view_1.Decoration.mark(start, pos, { "class": style }));
            start = pos;
        }
        // The current node's own classes
        var curClass = "";
        var context = [];
        var inherited = [];
        tree.iterate({
            from: from, to: to,
            enter: function (type, start) {
                var inheritedClass = inherited.length ? inherited[inherited.length - 1] : "";
                var cls = inheritedClass;
                var style = type.prop(_this.prop);
                if (style != null) {
                    var val = _this.styling.match(style);
                    if (val) {
                        if (cls)
                            cls += " ";
                        cls += val;
                    }
                    if (style & Inherit)
                        inheritedClass = cls;
                }
                context.push(cls);
                if (inheritedClass)
                    inherited.push(inheritedClass);
                if (cls != curClass) {
                    flush(start, curClass);
                    curClass = cls;
                }
            },
            leave: function (_t, _s, end) {
                context.pop();
                inherited.pop();
                var backTo = context.length ? context[context.length - 1] : "";
                if (backTo != curClass) {
                    flush(Math.min(to, end), curClass);
                    curClass = backTo;
                }
            }
        });
        this.decorations = view_1.Decoration.set(tokens);
    };
    return Highlighter;
}());
/// A default highlighter (works well with light themes).
exports.defaultHighlighter = exports.highlighter({
    invalid: { color: "#f00" },
    keyword: { color: "#708" },
    atom: { color: "#219" },
    number: { color: "#164" },
    string: { color: "#a11" },
    character: { color: "#a11" },
    regexp: { color: "#e40" },
    escape: { color: "#e40" },
    "variableName definition": { color: "#00f" },
    typeName: { color: "#085" },
    "propertyName definition": { color: "#00c" },
    comment: { color: "#940" },
    meta: { color: "#555" }
});

"use strict";
exports.__esModule = true;
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
var state_1 = require("../../state/dist/index.js");
var indent_1 = require("./indent.js");
var fold_1 = require("./fold.js");
/// A [syntax provider](#state.Syntax) based on a
/// [Lezer](https://lezer.codemirror.net) parser.
var LezerSyntax = /** @class */ (function () {
    /// Create a syntax instance for the given parser. You'll usually
    /// want to use the
    /// [`withProps`](https://lezer.codemirror.net/docs/ref/#lezer.Parser.withProps)
    /// method to register CodeMirror-specific syntax node props in the
    /// parser, before passing it to this constructor.
    function LezerSyntax(parser) {
        this.parser = parser;
        this.field = new state_1.StateField({
            init: function () { return new SyntaxState(lezer_tree_1.Tree.empty); },
            apply: function (tr, value) { return value.apply(tr); }
        });
        this.extension = [state_1.EditorState.syntax(this), this.field.extension, indent_1.syntaxIndentation(this), fold_1.syntaxFolding(this)];
    }
    LezerSyntax.prototype.tryGetTree = function (state, from, to) {
        var field = state.field(this.field);
        return field.updateTree(this.parser, state.doc, from, to, false) ? field.tree : null;
    };
    LezerSyntax.prototype.getTree = function (state, from, to) {
        var field = state.field(this.field);
        var rest = field.updateTree(this.parser, state.doc, from, to, true);
        return { tree: field.tree, rest: rest === true ? null : rest };
    };
    LezerSyntax.prototype.getPartialTree = function (state, from, to) {
        var field = state.field(this.field);
        field.updateTree(this.parser, state.doc, from, to, false);
        return field.tree;
    };
    Object.defineProperty(LezerSyntax.prototype, "docNodeType", {
        get: function () { return this.parser.group.types[1]; },
        enumerable: true,
        configurable: true
    });
    LezerSyntax.prototype.languageDataAt = function (state, pos) {
        var type = this.parser.group.types[1];
        if (this.parser.hasNested) {
            var tree = this.getPartialTree(state, pos, pos);
            var target = tree.resolve(pos);
            while (target) {
                if (target.type.prop(lezer_tree_1.NodeProp.top)) {
                    type = target.type;
                    break;
                }
                target = target.parent;
            }
        }
        return (type.prop(state_1.languageData) || nothing);
    };
    return LezerSyntax;
}());
exports.LezerSyntax = LezerSyntax;
var nothing = {};
var DocStream = /** @class */ (function () {
    function DocStream(doc, length) {
        if (length === void 0) { length = doc.length; }
        this.doc = doc;
        this.length = length;
        this.cursorPos = 0;
        this.string = "";
        this.cursor = doc.iter();
    }
    DocStream.prototype.get = function (pos) {
        if (pos >= this.length)
            return -1;
        var stringStart = this.cursorPos - this.string.length;
        if (pos < stringStart || pos >= this.cursorPos) {
            if (pos < this.cursorPos) { // Reset the cursor if we have to go back
                this.cursor = this.doc.iter();
                this.cursorPos = 0;
            }
            this.string = this.cursor.next(pos - this.cursorPos).value;
            this.cursorPos = pos + this.string.length;
            stringStart = this.cursorPos - this.string.length;
        }
        return this.string.charCodeAt(pos - stringStart);
    };
    DocStream.prototype.read = function (from, to) {
        var stringStart = this.cursorPos - this.string.length;
        if (from < stringStart || to >= this.cursorPos)
            return this.doc.slice(from, to);
        else
            return this.string.slice(from - stringStart, to - stringStart);
    };
    DocStream.prototype.clip = function (at) {
        return new DocStream(this.doc, at);
    };
    return DocStream;
}());
var RequestInfo = /** @class */ (function () {
    function RequestInfo(upto) {
        var _this = this;
        this.upto = upto;
        this.promise = new Promise(function (r) { return _this.resolve = r; });
        this.promise.canceled = false;
    }
    return RequestInfo;
}());
var SyntaxState = /** @class */ (function () {
    function SyntaxState(tree) {
        this.tree = tree;
        this.parsedTo = 0;
        this.parse = null;
        this.working = -1;
        this.requests = [];
    }
    SyntaxState.prototype.apply = function (tr) {
        return tr.docChanged ? new SyntaxState(this.tree.applyChanges(tr.changes.changedRanges())) : this;
    };
    // FIXME implement clearing out parts of the tree when it is too big
    SyntaxState.prototype.updateTree = function (parser, doc, from, to, rest) {
        if (to <= this.parsedTo)
            return true;
        if (!this.parse) {
            this.parse = parser.startParse(new DocStream(doc), { cache: this.tree });
            this.continueParse(to);
        }
        if (this.parsedTo >= to)
            return true;
        if (!rest)
            return false;
        this.scheduleWork();
        var req = this.requests.find(function (r) { return r.upto == to && !r.promise.canceled; });
        if (!req)
            this.requests.push(req = new RequestInfo(to));
        return req.promise;
    };
    SyntaxState.prototype.continueParse = function (to) {
        var endTime = Date.now() + 100 /* Slice */;
        for (var i = 0;; i++) {
            var done = this.parse.advance();
            if (done) {
                this.parsedTo = 1e9;
                this.parse = null;
                this.tree = done;
                return;
            }
            if (i == 1000) {
                i = 0;
                if (Date.now() > endTime)
                    break;
            }
        }
        this.parsedTo = this.parse.pos;
        // FIXME somehow avoid rebuilding all the nodes that are already
        // in this.tree when this happens repeatedly
        this.tree = this.parse.forceFinish();
        if (this.parsedTo >= to)
            this.parse = null;
    };
    SyntaxState.prototype.scheduleWork = function () {
        var _this = this;
        if (this.working != -1)
            return;
        this.working = setTimeout(function () { return _this.work(); }, 200 /* Pause */);
    };
    SyntaxState.prototype.work = function () {
        var _this = this;
        this.working = -1;
        var to = this.requests.reduce(function (max, req) { return req.promise.canceled ? max : Math.max(max, req.upto); }, 0);
        if (to > this.parsedTo)
            this.continueParse(to);
        this.requests = this.requests.filter(function (req) {
            if (!req.promise.canceled && req.upto > _this.parsedTo)
                return true;
            if (!req.promise.canceled)
                req.resolve(_this.tree);
            return false;
        });
        if (this.requests.length)
            this.scheduleWork();
    };
    return SyntaxState;
}());

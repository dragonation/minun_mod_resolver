"use strict";
exports.__esModule = true;
var stringstream_1 = require("./stringstream.js");
exports.StringStream = stringstream_1.StringStream;
var state_1 = require("../../state/dist/index.js");
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
var highlight_1 = require("../../highlight/dist/highlight.js");
var StreamParserInstance = /** @class */ (function () {
    function StreamParserInstance(spec) {
        this.token = spec.token;
        this.blankLine = spec.blankLine || (function () { });
        this.startState = spec.startState || (function () { return true; });
        this.copyState = spec.copyState || defaultCopyState;
        this.indent = spec.indent || (function () { return -1; });
        this.docType = docID(spec.docProps || []);
    }
    StreamParserInstance.prototype.readToken = function (state, stream, editorState) {
        stream.start = stream.pos;
        for (var i = 0; i < 10; i++) {
            var result = this.token(stream, state, editorState);
            if (stream.pos > stream.start)
                return result;
        }
        throw new Error("Stream parser failed to advance stream.");
    };
    return StreamParserInstance;
}());
function defaultCopyState(state) {
    if (typeof state != "object")
        return state;
    var newState = {};
    for (var prop in state) {
        var val = state[prop];
        newState[prop] = (val instanceof Array ? val.slice() : val);
    }
    return newState;
}
var RequestInfo = /** @class */ (function () {
    function RequestInfo(upto) {
        var _this = this;
        this.upto = upto;
        this.promise = new Promise(function (r) { return _this.resolve = r; });
        this.promise.canceled = false;
    }
    return RequestInfo;
}());
/// A syntax provider that uses a stream parser.
var StreamSyntax = /** @class */ (function () {
    /// Create a stream syntax.
    function StreamSyntax(parser) {
        var _this = this;
        this.parser = new StreamParserInstance(parser);
        this.field = new state_1.StateField({
            init: function (state) { return new SyntaxState(lezer_tree_1.Tree.empty, [_this.parser.startState(state)], 1, 0, null); },
            apply: function (tr, value) { return value.apply(tr); }
        });
        this.extension = [
            state_1.EditorState.syntax(this),
            this.field.extension,
            state_1.EditorState.indentation(function (state, pos) {
                return state.field(_this.field).getIndent(_this.parser, state, pos);
            })
        ];
    }
    StreamSyntax.prototype.tryGetTree = function (state, from, to) {
        var field = state.field(this.field);
        return field.updateTree(this.parser, state, to, false) ? field.tree : null;
    };
    StreamSyntax.prototype.getTree = function (state, from, to) {
        var field = state.field(this.field);
        var rest = field.updateTree(this.parser, state, to, true);
        return { tree: field.tree, rest: rest === true ? null : rest };
    };
    StreamSyntax.prototype.getPartialTree = function (state, from, to) {
        var field = state.field(this.field);
        field.updateTree(this.parser, state, to, false);
        return field.tree;
    };
    Object.defineProperty(StreamSyntax.prototype, "docNodeType", {
        get: function () { return typeArray[this.parser.docType]; },
        enumerable: true,
        configurable: true
    });
    StreamSyntax.prototype.languageDataAt = function (state, pos) {
        return (typeArray[this.parser.docType].prop(state_1.languageData) || {});
    };
    return StreamSyntax;
}());
exports.StreamSyntax = StreamSyntax;
var CACHE_STEP_SHIFT = 6, CACHE_STEP = 1 << CACHE_STEP_SHIFT;
var MAX_RECOMPUTE_DISTANCE = 20e3;
var WORK_SLICE = 100, WORK_PAUSE = 200;
var SyntaxState = /** @class */ (function () {
    function SyntaxState(tree, 
    // Slot 0 stores the start state (line 1), slot 1 the
    // state at the start of line 65, etc, so lineNo ==
    // (index * CACHE_STEP) + 1
    cache, frontierLine, frontierPos, frontierState) {
        this.tree = tree;
        this.cache = cache;
        this.frontierLine = frontierLine;
        this.frontierPos = frontierPos;
        this.frontierState = frontierState;
        this.requests = [];
        this.working = -1;
    }
    SyntaxState.prototype.apply = function (tr) {
        if (!tr.docChanged)
            return this;
        var _a = tr.doc.lineAt(tr.changes.changedRanges()[0].fromA), start = _a.start, number = _a.number;
        if (number >= this.frontierLine)
            return new SyntaxState(this.tree, this.cache.slice(), this.frontierLine, this.frontierPos, this.frontierState);
        else {
            return new SyntaxState(this.tree.cut(start), this.cache.slice(0, (number >> CACHE_STEP_SHIFT) + 1), number, start, null);
        }
    };
    SyntaxState.prototype.maybeStoreState = function (parser, lineBefore, state) {
        if (lineBefore % CACHE_STEP == 0)
            this.cache[(lineBefore - 1) >> CACHE_STEP_SHIFT] = parser.copyState(state);
    };
    SyntaxState.prototype.findState = function (parser, editorState, line) {
        var cacheIndex = Math.min(this.cache.length - 1, (line - 1) >> CACHE_STEP_SHIFT);
        var cachedLine = (cacheIndex << CACHE_STEP_SHIFT) + 1;
        var startPos = editorState.doc.line(cachedLine).start;
        if (line - cachedLine > CACHE_STEP && editorState.doc.line(line).start - startPos > MAX_RECOMPUTE_DISTANCE)
            return null;
        var state = parser.copyState(this.cache[cacheIndex]);
        var cursor = new stringstream_1.StringStreamCursor(editorState.doc, startPos, editorState.tabSize);
        for (var l = cachedLine; l < line; l++) {
            var stream = cursor.next();
            if (stream.eol()) {
                parser.blankLine(state, editorState);
            }
            else {
                while (!stream.eol())
                    parser.readToken(state, stream, editorState);
            }
            this.maybeStoreState(parser, l, state);
        }
        return state;
    };
    SyntaxState.prototype.advanceFrontier = function (parser, editorState, upto) {
        var state = this.frontierState || this.findState(parser, editorState, this.frontierLine);
        var sliceEnd = Date.now() + WORK_SLICE;
        var cursor = new stringstream_1.StringStreamCursor(editorState.doc, this.frontierPos, editorState.tabSize);
        var buffer = [];
        var line = this.frontierLine, pos = this.frontierPos;
        while (pos < upto) {
            var stream = cursor.next(), offset = cursor.offset;
            if (stream.eol()) {
                parser.blankLine(state, editorState);
            }
            else {
                while (!stream.eol()) {
                    var type = parser.readToken(state, stream, editorState);
                    if (type)
                        buffer.push(tokenID(type), offset + stream.start, offset + stream.pos, 4);
                }
            }
            this.maybeStoreState(parser, line, state);
            line++;
            pos += stream.string.length + 1;
            if (Date.now() > sliceEnd)
                break;
        }
        var tree = lezer_tree_1.Tree.build(buffer, nodeGroup, parser.docType).balance();
        this.tree = this.tree.append(tree).balance();
        this.frontierLine = line;
        this.frontierPos = pos;
        this.frontierState = state;
    };
    SyntaxState.prototype.updateTree = function (parser, state, upto, rest) {
        upto = Math.min(upto + 100, state.doc.lineAt(upto).end);
        // FIXME make sure multiple calls in same frame don't keep doing work
        if (this.frontierPos >= upto)
            return true;
        if (this.working == -1)
            this.advanceFrontier(parser, state, upto);
        if (this.frontierPos >= upto)
            return true;
        if (!rest)
            return false;
        var req = this.requests.find(function (r) { return r.upto == upto && !r.promise.canceled; });
        if (!req) {
            req = new RequestInfo(upto);
            this.requests.push(req);
        }
        this.scheduleWork(parser, state);
        return req.promise;
    };
    SyntaxState.prototype.scheduleWork = function (parser, state) {
        var _this = this;
        if (this.working != -1)
            return;
        this.working = setTimeout(function () { return _this.work(parser, state); }, WORK_PAUSE);
    };
    SyntaxState.prototype.work = function (parser, state) {
        var _this = this;
        this.working = -1;
        var upto = this.requests.reduce(function (max, req) { return req.promise.canceled ? max : Math.max(max, req.upto); }, 0);
        if (upto > this.frontierPos)
            this.advanceFrontier(parser, state, upto);
        this.requests = this.requests.filter(function (req) {
            if (req.upto > _this.frontierPos && !req.promise.canceled)
                return true;
            if (!req.promise.canceled)
                req.resolve(_this.tree);
            return false;
        });
        if (this.requests.length)
            this.scheduleWork(parser, state);
    };
    SyntaxState.prototype.getIndent = function (parser, state, pos) {
        var line = state.doc.lineAt(pos);
        var parseState = this.findState(parser, state, line.number);
        if (parseState == null)
            return -1;
        var text = line.slice(pos - line.start, Math.min(line.end, pos + 100) - line.start);
        return parser.indent(parseState, /^\s*(.*)/.exec(text)[1], state);
    };
    return SyntaxState;
}());
var tokenTable = Object.create(null);
var typeArray = [lezer_tree_1.NodeType.none];
var nodeGroup = new lezer_tree_1.NodeGroup(typeArray);
var warned = [];
function tokenID(tag) {
    var id = tokenTable[tag];
    if (id == null) {
        var tagID = 0;
        try {
            tagID = highlight_1.defaultTags.get(tag);
        }
        catch (e) {
            if (!(e instanceof RangeError))
                throw e;
            if (warned.indexOf(tag) < 0) {
                warned.push(tag);
                console.warn("'" + tag + "' is not a valid style tag");
            }
            return tokenID("");
        }
        id = tokenTable[tag] = typeArray.length;
        typeArray.push(new lezer_tree_1.NodeType(tag ? tag.replace(/ /g, "_") : "_", highlight_1.defaultTags.prop.set({}, tagID), id));
    }
    return id;
}
function docID(props) {
    if (props.length == 0)
        return tokenID("");
    var obj = Object.create(null);
    for (var _i = 0, props_1 = props; _i < props_1.length; _i++) {
        var _a = props_1[_i], prop = _a[0], value = _a[1];
        prop.set(obj, value);
    }
    var id = typeArray.length;
    typeArray.push(new lezer_tree_1.NodeType("document", obj, id));
    return id;
}

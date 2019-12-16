"use strict";
exports.__esModule = true;
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
var state_1 = require("../../state/dist/index.js");
/// A syntax tree node prop used to associate indentation strategies
/// with node types. Such a strategy is a function from an indentation
/// context to a number. That number may be -1, to indicate that no
/// definitive indentation can be determined, or a column number to
/// which the given line should be indented.
exports.indentNodeProp = new lezer_tree_1.NodeProp();
function syntaxIndentation(syntax) {
    return state_1.EditorState.indentation(function (state, pos) {
        var tree = syntax.getPartialTree(state, pos, pos);
        return computeIndentation(state, tree, pos);
    });
}
exports.syntaxIndentation = syntaxIndentation;
// Compute the indentation for a given position from the syntax tree.
function computeIndentation(state, ast, pos) {
    var tree = ast.resolve(pos);
    // Enter previous nodes that end in empty error terms, which means
    // they were broken off by error recovery, so that indentation
    // works even if the constructs haven't been finished.
    for (var scan = tree, scanPos = pos;;) {
        var last = scan.childBefore(scanPos);
        if (!last)
            break;
        if (last.type.prop(lezer_tree_1.NodeProp.error) && last.start == last.end) {
            tree = scan;
            scanPos = last.start;
        }
        else {
            scan = last;
            scanPos = scan.end + 1;
        }
    }
    for (; tree; tree = tree.parent) {
        var strategy = indentStrategy(tree.type) || (tree.parent == null ? topIndent : null);
        if (strategy)
            return strategy(new IndentContext(state, pos, tree));
    }
    return -1;
}
function indentStrategy(type) {
    var strategy = type.prop(exports.indentNodeProp);
    if (!strategy) {
        var delim = type.prop(lezer_tree_1.NodeProp.delim);
        if (delim)
            return delimitedIndent({ closing: delim.split(" ")[1] });
    }
    return strategy;
}
function topIndent() { return 0; }
/// Objects of this type provide context information and helper
/// methods to indentation functions.
var IndentContext = /** @class */ (function () {
    /// @internal
    function IndentContext(
    /// The editor state.
    state, 
    /// The position at which indentation is being computed.
    pos, 
    /// The syntax tree node for which the indentation strategy is
    /// registered.
    node) {
        this.state = state;
        this.pos = pos;
        this.node = node;
    }
    Object.defineProperty(IndentContext.prototype, "unit", {
        /// The indent unit (number of spaces per indentation level).
        get: function () { return this.state.indentUnit; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(IndentContext.prototype, "textAfter", {
        /// Get the text directly after `this.pos`, either the entire line
        /// or the next 50 characters, whichever is shorter.
        get: function () {
            return this.state.doc.slice(this.pos, Math.min(this.pos + 50, this.state.doc.lineAt(this.pos).end)).match(/^\s*(.*)/)[1];
        },
        enumerable: true,
        configurable: true
    });
    /// find the column position (taking tabs into account) of the given
    /// position in the given string.
    IndentContext.prototype.countColumn = function (line, pos) {
        // FIXME use extending character information
        if (pos < 0)
            pos = line.length;
        var tab = this.state.tabSize;
        for (var i = 0, n = 0;;) {
            var nextTab = line.indexOf("\t", i);
            if (nextTab < 0 || nextTab >= pos)
                return n + (pos - i);
            n += nextTab - i;
            n += tab - (n % tab);
            i = nextTab + 1;
        }
    };
    /// Find the indentation column of the given document line.
    IndentContext.prototype.lineIndent = function (line) {
        var text = line.slice(0, Math.min(50, line.length, this.node.start > line.start ? this.node.start - line.start : 1e8));
        return this.countColumn(text, text.search(/\S/));
    };
    Object.defineProperty(IndentContext.prototype, "baseIndent", {
        /// Get the indentation at the reference line for `this.tree`, which
        /// is the line on which it starts, unless there is a node that is
        /// _not_ a parent of this node covering the start of that line. If
        /// so, the line at the start of that node is tried, again skipping
        /// on if it is covered by another such node.
        get: function () {
            var line = this.state.doc.lineAt(this.node.start);
            // Skip line starts that are covered by a sibling (or cousin, etc)
            for (;;) {
                var atBreak = this.node.resolve(line.start);
                while (atBreak.parent && atBreak.parent.start == atBreak.start)
                    atBreak = atBreak.parent;
                if (isParent(atBreak, this.node))
                    break;
                line = this.state.doc.lineAt(atBreak.start);
            }
            return this.lineIndent(line);
        },
        enumerable: true,
        configurable: true
    });
    /// Find the column for the given position.
    IndentContext.prototype.column = function (pos) {
        var line = this.state.doc.lineAt(pos);
        return this.countColumn(line.slice(0, pos - line.start), pos - line.start);
    };
    return IndentContext;
}());
exports.IndentContext = IndentContext;
function isParent(parent, of) {
    for (var cur = of; cur; cur = cur.parent)
        if (parent == cur)
            return true;
    return false;
}
// Check whether a delimited node is aligned (meaning there are
// non-skipped nodes on the same line as the opening delimiter). And
// if so, return the opening token.
function bracketedAligned(context) {
    var tree = context.node;
    var openToken = tree.childAfter(tree.start);
    if (!openToken)
        return null;
    var openLine = context.state.doc.lineAt(openToken.start);
    for (var pos = openToken.end;;) {
        var next = tree.childAfter(pos);
        if (!next)
            return null;
        if (!next.type.prop(lezer_tree_1.NodeProp.skipped))
            return next.start < openLine.end ? openToken : null;
        pos = next.end;
    }
}
/// An indentation strategy for delimited (usually bracketed) nodes.
/// Will, by default, indent one unit more than the parent's base
/// indent unless the line starts with a closing token. When `align`
/// is true and there are non-skipped nodes on the node's opening
/// line, the content of the node will be aligned with the end of the
/// opening node, like this:
///
///     foo(bar,
///         baz)
function delimitedIndent(_a) {
    var closing = _a.closing, _b = _a.align, align = _b === void 0 ? true : _b, _c = _a.units, units = _c === void 0 ? 1 : _c;
    return function (context) {
        var closed = context.textAfter.slice(0, closing.length) == closing;
        var aligned = align ? bracketedAligned(context) : null;
        if (aligned)
            return closed ? context.column(aligned.start) : context.column(aligned.end);
        return context.baseIndent + (closed ? 0 : context.unit * units);
    };
}
exports.delimitedIndent = delimitedIndent;
/// An indentation strategy that aligns a node content to its base
/// indentation.
exports.flatIndent = function (context) { return context.baseIndent; };
/// Creates an indentation strategy that, by default, indents
/// continued lines one unit more than the node's base indentation.
/// You can provide `except` to prevent indentation of lines that
/// match a pattern (for example `/^else\b/` in `if`/`else`
/// constructs), and you can change the amount of units used with the
/// `units` option.
function continuedIndent(_a) {
    var _b = _a === void 0 ? {} : _a, except = _b.except, _c = _b.units, units = _c === void 0 ? 1 : _c;
    return function (context) {
        var matchExcept = except && except.test(context.textAfter);
        return context.baseIndent + (matchExcept ? 0 : units * context.unit);
    };
}
exports.continuedIndent = continuedIndent;

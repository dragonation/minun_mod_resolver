"use strict";
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
function moveSelection(view, dir, granularity) {
    var transaction = view.state.t().forEachRange(function (range) {
        if (!range.empty && granularity != "lineboundary")
            return new state_1.SelectionRange(dir == "left" || dir == "backward" ? range.from : range.to);
        return new state_1.SelectionRange(view.movePos(range.head, dir, granularity, "move"));
    });
    if (transaction.selection.eq(view.state.selection))
        return false;
    if (granularity == "line")
        transaction.annotate(state_1.Transaction.preserveGoalColumn(true));
    view.dispatch(transaction.scrollIntoView());
    return true;
}
/// Move the selection one character to the left (which is backward in
/// left-to-right text, forward in right-to-left text).
exports.moveCharLeft = function (view) { return moveSelection(view, "left", "character"); };
/// Move the selection one character to the right.
exports.moveCharRight = function (view) { return moveSelection(view, "right", "character"); };
/// Move the selection one word to the left.
exports.moveWordLeft = function (view) { return moveSelection(view, "left", "word"); };
/// Move the selection one word to the right.
exports.moveWordRight = function (view) { return moveSelection(view, "right", "word"); };
/// Move the selection one line up.
exports.moveLineUp = function (view) { return moveSelection(view, "backward", "line"); };
/// Move the selection one line down.
exports.moveLineDown = function (view) { return moveSelection(view, "forward", "line"); };
/// Move the selection to the start of the line.
exports.moveLineStart = function (view) { return moveSelection(view, "backward", "lineboundary"); };
/// Move the selection to the end of the line.
exports.moveLineEnd = function (view) { return moveSelection(view, "forward", "lineboundary"); };
function extendSelection(view, dir, granularity) {
    var transaction = view.state.t().forEachRange(function (range) {
        return new state_1.SelectionRange(range.anchor, view.movePos(range.head, dir, granularity, "extend"));
    });
    if (transaction.selection.eq(view.state.selection))
        return false;
    if (granularity == "line")
        transaction.annotate(state_1.Transaction.preserveGoalColumn(true));
    view.dispatch(transaction.scrollIntoView());
    return true;
}
/// Move the selection head one character to the left, while leaving
/// the anchor in place.
exports.extendCharLeft = function (view) { return extendSelection(view, "left", "character"); };
/// Move the selection head one character to the right.
exports.extendCharRight = function (view) { return extendSelection(view, "right", "character"); };
/// Move the selection head one word to the left.
exports.extendWordLeft = function (view) { return extendSelection(view, "left", "word"); };
/// Move the selection head one word to the right.
exports.extendWordRight = function (view) { return extendSelection(view, "right", "word"); };
/// Move the selection head one line up.
exports.extendLineUp = function (view) { return extendSelection(view, "backward", "line"); };
/// Move the selection head one line down.
exports.extendLineDown = function (view) { return extendSelection(view, "forward", "line"); };
/// Move the selection head to the start of the line.
exports.extendLineStart = function (view) { return extendSelection(view, "backward", "lineboundary"); };
/// Move the selection head to the end of the line.
exports.extendLineEnd = function (view) { return extendSelection(view, "forward", "lineboundary"); };
/// Move the selection to the start of the document.
exports.selectDocStart = function (_a) {
    var state = _a.state, dispatch = _a.dispatch;
    dispatch(state.t().setSelection(state_1.EditorSelection.single(0)).scrollIntoView());
    return true;
};
/// Move the selection to the end of the document.
exports.selectDocEnd = function (_a) {
    var state = _a.state, dispatch = _a.dispatch;
    dispatch(state.t().setSelection(state_1.EditorSelection.single(state.doc.length)).scrollIntoView());
    return true;
};
/// Select the entire document.
exports.selectAll = function (_a) {
    var state = _a.state, dispatch = _a.dispatch;
    dispatch(state.t().setSelection(state_1.EditorSelection.single(0, state.doc.length)));
    return true;
};
function deleteText(view, dir) {
    var transaction = view.state.t().forEachRange(function (range, transaction) {
        var from = range.from, to = range.to;
        if (from == to) {
            var target = view.movePos(range.head, dir, "character", "move");
            from = Math.min(from, target);
            to = Math.max(to, target);
        }
        if (from == to)
            return range;
        transaction.replace(from, to, "");
        return new state_1.SelectionRange(from);
    });
    if (!transaction.docChanged)
        return false;
    view.dispatch(transaction.scrollIntoView());
    return true;
}
/// Delete the character before the cursor (which is the one to left
/// in left-to-right text, but the one to the right in right-to-left
/// text).
exports.deleteCharBackward = function (view) { return deleteText(view, "backward"); };
/// Delete the character after the cursor.
exports.deleteCharForward = function (view) { return deleteText(view, "forward"); };
// FIXME support indenting by tab, configurable indent units
function space(n) {
    var result = "";
    for (var i = 0; i < n; i++)
        result += " ";
    return result;
}
function getIndentation(state, pos) {
    for (var _i = 0, _a = state.behavior(state_1.EditorState.indentation); _i < _a.length; _i++) {
        var f = _a[_i];
        var result = f(state, pos);
        if (result > -1)
            return result;
    }
    return -1;
}
/// Replace the selection with a newline and indent the newly created
/// line(s).
exports.insertNewlineAndIndent = function (_a) {
    var state = _a.state, dispatch = _a.dispatch;
    var i = 0, indentation = state.selection.ranges.map(function (r) {
        var indent = getIndentation(state, r.from);
        return indent > -1 ? indent : /^\s*/.exec(state.doc.lineAt(r.from).slice(0, 50))[0].length;
    });
    dispatch(state.t().forEachRange(function (_a, tr) {
        var from = _a.from, to = _a.to;
        var indent = indentation[i++], line = tr.doc.lineAt(to);
        while (to < line.end && /s/.test(line.slice(to - line.start, to + 1 - line.start)))
            to++;
        tr.replace(from, to, ["", space(indent)]);
        return new state_1.SelectionRange(from + indent + 1);
    }).scrollIntoView());
    return true;
};
/// Auto-indent the selected lines. This uses the [indentation
/// behavor](#state.EditorState^indentation) as source.
exports.indentSelection = function (_a) {
    var _b;
    var state = _a.state, dispatch = _a.dispatch;
    // FIXME this will base all indentation on the same state, which is
    // wrong (indentation looks at the indent of previous lines, which may
    // be changed).
    var lastLine = -1, positions = [];
    for (var _i = 0, _c = state.selection.ranges; _i < _c.length; _i++) {
        var range = _c[_i];
        for (var _d = state.doc.lineAt(range.from), start = _d.start, end = _d.end;;) {
            if (start != lastLine) {
                lastLine = start;
                var indent = getIndentation(state, start), current = void 0;
                if (indent > -1 &&
                    indent != (current = /^\s*/.exec(state.doc.slice(start, Math.min(end, start + 100)))[0].length))
                    positions.push({ pos: start, current: current, indent: indent });
            }
            if (end + 1 > range.to)
                break;
            (_b = state.doc.lineAt(end + 1), start = _b.start, end = _b.end);
        }
    }
    if (positions.length > 0) {
        var tr = state.t();
        for (var _e = 0, positions_1 = positions; _e < positions_1.length; _e++) {
            var _f = positions_1[_e], pos = _f.pos, current = _f.current, indent = _f.indent;
            var start = tr.changes.mapPos(pos);
            tr.replace(start, start + current, space(indent));
        }
        dispatch(tr);
    }
    return true;
};
/// The default keymap for Linux/Windows/non-Mac platforms. Binds the
/// arrows for cursor motion, shift-arrow for selection extension,
/// ctrl-arrows for by-word motion, home/end for line start/end,
/// ctrl-home/end for document start/end, ctrl-a to select all,
/// backspace/delete for deletion, and enter for newline-and-indent.
exports.pcBaseKeymap = {
    "ArrowLeft": exports.moveCharLeft,
    "ArrowRight": exports.moveCharRight,
    "Shift-ArrowLeft": exports.extendCharLeft,
    "Shift-ArrowRight": exports.extendCharRight,
    "Mod-ArrowLeft": exports.moveWordLeft,
    "Mod-ArrowRight": exports.moveWordRight,
    "Shift-Mod-ArrowLeft": exports.extendWordLeft,
    "Shift-Mod-ArrowRight": exports.extendWordRight,
    "ArrowUp": exports.moveLineUp,
    "ArrowDown": exports.moveLineDown,
    "Shift-ArrowUp": exports.extendLineUp,
    "Shift-ArrowDown": exports.extendLineDown,
    "Home": exports.moveLineStart,
    "End": exports.moveLineEnd,
    "Shift-Home": exports.extendLineStart,
    "Shift-End": exports.extendLineEnd,
    "Mod-Home": exports.selectDocStart,
    "Mod-End": exports.selectDocEnd,
    "Mod-a": exports.selectAll,
    "Backspace": exports.deleteCharBackward,
    "Delete": exports.deleteCharForward,
    "Enter": exports.insertNewlineAndIndent
};
/// The default keymap for Mac platforms. Includes the bindings from
/// the [PC keymap](#commands.pcBaseKeymap) (using Cmd instead of
/// Ctrl), and adds Mac-specific default bindings.
exports.macBaseKeymap = {
    "Control-b": exports.moveCharLeft,
    "Control-f": exports.moveCharRight,
    "Shift-Control-b": exports.extendCharLeft,
    "Shift-Control-f": exports.extendCharRight,
    "Control-p": exports.moveLineUp,
    "Control-n": exports.moveLineDown,
    "Shift-Control-p": exports.extendLineUp,
    "Shift-Control-n": exports.extendLineDown,
    "Control-a": exports.moveLineStart,
    "Control-e": exports.moveLineEnd,
    "Shift-Control-a": exports.extendLineStart,
    "Shift-Control-e": exports.extendLineEnd,
    "Cmd-ArrowUp": exports.selectDocStart,
    "Cmd-ArrowDown": exports.selectDocEnd,
    "Control-d": exports.deleteCharForward,
    "Control-h": exports.deleteCharBackward
};
for (var key in exports.pcBaseKeymap)
    exports.macBaseKeymap[key] = exports.pcBaseKeymap[key];
var mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform)
    : typeof os != "undefined" ? os.platform() == "darwin" : false;
/// The default keymap for the current platform.
exports.baseKeymap = mac ? exports.macBaseKeymap : exports.pcBaseKeymap;

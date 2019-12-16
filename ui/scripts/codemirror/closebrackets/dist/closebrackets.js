"use strict";
exports.__esModule = true;
var view_1 = require("../../view/dist/index.js");
var state_1 = require("../../state/dist/index.js");
var text_1 = require("../../text/dist/index.js");
var text_2 = require("../../text/dist/index.js");
var w3c_keyname_1 = require("../../3rd-parties/w3c-keyname.js");
var defaults = {
    closeBrackets: ["(", "[", "{", "'", '"'],
    closeBracketsBefore: ")]}'\":;>"
};
/// Extension to enable bracket-closing behavior. When a closeable
/// bracket is typed, its closing bracket is immediately inserted
/// after the cursor. When closing a bracket directly in front of that
/// closing bracket, the cursor moves over the existing bracket. When
/// backspacing in between brackets, both are removed.
exports.closeBrackets = view_1.EditorView.handleDOMEvents({ keydown: keydown });
var definedClosing = "()[]{}<>";
function closing(ch) {
    for (var i = 0; i < definedClosing.length; i += 2)
        if (definedClosing.charCodeAt(i) == ch)
            return definedClosing.charAt(i + 1);
    return text_2.fromCodePoint(ch < 128 ? ch : ch + 1);
}
function config(state, pos) {
    var syntax = state.behavior(state_1.EditorState.syntax);
    if (syntax.length == 0)
        return defaults;
    return syntax[0].languageDataAt(state, pos);
}
function keydown(view, event) {
    if (event.ctrlKey || event.metaKey)
        return false;
    if (event.keyCode == 8) { // Backspace
        var tr_1 = handleBackspace(view.state);
        if (!tr_1)
            return false;
        view.dispatch(tr_1);
        return true;
    }
    var key = w3c_keyname_1.keyName(event);
    if (key.length > 2 || key.length == 2 && text_2.codePointAt(key, 0) < text_2.minPairCodePoint)
        return false;
    var tr = handleInsertion(view.state, key);
    if (!tr)
        return false;
    view.dispatch(tr);
    return true;
}
/// Function that implements the extension's backspace behavior.
/// Exported mostly for testing purposes.
function handleBackspace(state) {
    var conf = config(state, state.selection.primary.head);
    var tokens = conf.closeBrackets || defaults.closeBrackets;
    var tr = state.t(), dont = null;
    tr.forEachRange(function (range) {
        if (!range.empty)
            return dont = range;
        var before = prevChar(state.doc, range.head);
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            if (token == before && nextChar(state.doc, range.head) == closing(text_2.codePointAt(token, 0))) {
                tr.replace(range.head - token.length, range.head + token.length, "");
                return new state_1.SelectionRange(range.head - token.length);
            }
        }
        return dont = range;
    });
    return dont ? null : tr.scrollIntoView();
}
exports.handleBackspace = handleBackspace;
/// Implements the extension's behavior on text insertion. Again,
/// exported mostly for testing.
function handleInsertion(state, ch) {
    var conf = config(state, state.selection.primary.head);
    var tokens = conf.closeBrackets || defaults.closeBrackets;
    for (var _i = 0, tokens_2 = tokens; _i < tokens_2.length; _i++) {
        var tok = tokens_2[_i];
        var closed_1 = closing(text_2.codePointAt(tok, 0));
        if (ch == tok)
            return closed_1 == tok ? handleSame(state, tok, tokens.indexOf(tok + tok + tok) > -1)
                : handleOpen(state, tok, closed_1, conf.closeBracketsBefore || defaults.closeBracketsBefore);
        if (ch == closed_1)
            return handleClose(state, tok, closed_1);
    }
    return null;
}
exports.handleInsertion = handleInsertion;
function nextChar(doc, pos) {
    var next = doc.slice(pos, pos + 2);
    return next.length == 2 && text_2.codePointAt(next, 0) < text_2.minPairCodePoint ? next.slice(0, 1) : next;
}
function prevChar(doc, pos) {
    var prev = doc.slice(pos - 2, pos);
    return prev.length == 2 && text_2.codePointAt(prev, 0) < text_2.minPairCodePoint ? prev.slice(1) : prev;
}
function handleOpen(state, open, close, closeBefore) {
    var tr = state.t(), dont = null;
    tr.forEachRange(function (range) {
        if (!range.empty) {
            tr.replace(range.to, range.to, close);
            tr.replace(range.from, range.from, open);
            return new state_1.SelectionRange(range.anchor + open.length, range.head + open.length);
        }
        var next = nextChar(state.doc, range.head);
        if (!next || /\s/.test(next) || closeBefore.indexOf(next) > -1) {
            tr.replace(range.head, range.head, open + close);
            return new state_1.SelectionRange(range.head + open.length, range.head + open.length);
        }
        return dont = range;
    });
    return dont ? null : tr.scrollIntoView();
}
function handleClose(state, open, close) {
    var tr = state.t(), dont = null;
    tr.forEachRange(function (range) {
        if (range.empty && close == nextChar(state.doc, range.head))
            return new state_1.SelectionRange(range.head + close.length);
        return dont = range;
    });
    return dont ? null : tr.scrollIntoView();
}
// Handles cases where the open and close token are the same, and
// possibly triple quotes (as in `"""abc"""`-style quoting).
function handleSame(state, token, allowTriple) {
    var tr = state.t(), dont = null;
    tr.forEachRange(function (range) {
        if (!range.empty) {
            tr.replace(range.to, range.to, token);
            tr.replace(range.from, range.from, token);
            return new state_1.SelectionRange(range.anchor + token.length, range.head + token.length);
        }
        var pos = range.head, next = nextChar(state.doc, pos);
        if (next == token) {
            if (nodeStart(state, pos)) {
                tr.replace(pos, pos, token + token);
                return new state_1.SelectionRange(pos + token.length);
            }
            else {
                var isTriple = allowTriple && state.doc.slice(pos, pos + token.length * 3) == token + token + token;
                return new state_1.SelectionRange(pos + token.length * (isTriple ? 3 : 1));
            }
        }
        else if (allowTriple && state.doc.slice(pos - 2 * token.length, pos) == token + token &&
            nodeStart(state, pos - 2 * token.length)) {
            tr.replace(pos, pos, token + token + token + token);
            return new state_1.SelectionRange(pos + token.length);
        }
        else if (!text_1.isWordChar(next)) {
            var prev = state.doc.slice(pos - 1, pos);
            if (!text_1.isWordChar(prev) && prev != token) {
                tr.replace(pos, pos, token + token);
                return new state_1.SelectionRange(pos + token.length);
            }
        }
        return dont = range;
    });
    return dont ? null : tr.scrollIntoView();
}
function nodeStart(state, pos) {
    var syntax = state.behavior(state_1.EditorState.syntax);
    if (syntax.length == 0)
        return false;
    var tree = syntax[0].getPartialTree(state, pos, pos).resolve(pos + 1);
    return tree.parent && tree.start == pos;
}

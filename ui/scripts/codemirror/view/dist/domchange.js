"use strict";
exports.__esModule = true;
var dom_1 = require("./dom.js");
var browser_1 = require("./browser.js");
var state_1 = require("../../state/dist/index.js");
var LINE_SEP = "\ufdda"; // A Unicode 'non-character', used to denote newlines internally
function applyDOMChange(view, start, end, typeOver) {
    var change, newSel;
    var sel = view.state.selection.primary, bounds;
    if (start > -1 && (bounds = view.docView.domBoundsAround(start, end, 0))) {
        var from = bounds.from, to = bounds.to;
        var selPoints = view.docView.impreciseHead || view.docView.impreciseAnchor ? [] : selectionPoints(view.contentDOM, view.root);
        var reader = new DOMReader(selPoints);
        reader.readRange(bounds.startDOM, bounds.endDOM);
        newSel = selectionFromPoints(selPoints, from);
        var preferredPos = sel.from, preferredSide = null;
        // Prefer anchoring to end when Backspace is pressed
        if (view.inputState.lastKeyCode === 8 && view.inputState.lastKeyTime > Date.now() - 100) {
            preferredPos = sel.to;
            preferredSide = "end";
        }
        var diff = findDiff(view.state.doc.slice(from, to, LINE_SEP), reader.text, preferredPos - from, preferredSide);
        if (diff)
            change = new state_1.Change(from + diff.from, from + diff.toA, reader.text.slice(diff.from, diff.toB).split(LINE_SEP));
    }
    else if (view.hasFocus) {
        var domSel = view.root.getSelection();
        var _a = view.docView, iHead = _a.impreciseHead, iAnchor = _a.impreciseAnchor;
        var head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset ? view.state.selection.primary.head
            : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
        var anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset ? view.state.selection.primary.anchor
            : dom_1.selectionCollapsed(domSel) ? head : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
        if (head != sel.head || anchor != sel.anchor)
            newSel = state_1.EditorSelection.single(anchor, head);
    }
    if (!change && !newSel)
        return false;
    // Heuristic to notice typing over a selected character
    if (!change && typeOver && !sel.empty && newSel && newSel.primary.empty)
        change = new state_1.Change(sel.from, sel.to, view.state.doc.sliceLines(sel.from, sel.to));
    if (change) {
        var startState = view.state;
        // Android browsers don't fire reasonable key events for enter,
        // backspace, or delete. So this detects changes that look like
        // they're caused by those keys, and reinterprets them as key
        // events.
        if (browser_1["default"].android &&
            ((change.from == sel.from && change.to == sel.to &&
                change.length == 1 && change.text.length == 2 &&
                dispatchKey(view, "Enter", 10)) ||
                (change.from == sel.from - 1 && change.to == sel.to && change.length == 0 &&
                    dispatchKey(view, "Backspace", 8)) ||
                (change.from == sel.from && change.to == sel.to + 1 && change.length == 0 &&
                    dispatchKey(view, "Delete", 46))))
            return view.state != startState;
        var tr = startState.t();
        if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3) {
            var before = sel.from < change.from ? startState.doc.slice(sel.from, change.from, LINE_SEP) : "";
            var after = sel.to > change.to ? startState.doc.slice(change.to, sel.to, LINE_SEP) : "";
            tr.replaceSelection((before + change.text.join(LINE_SEP) + after).split(LINE_SEP));
        }
        else {
            tr.change(change);
            if (newSel && !tr.selection.primary.eq(newSel.primary))
                tr.setSelection(tr.selection.replaceRange(newSel.primary));
        }
        view.dispatch(tr.scrollIntoView());
        return true;
    }
    else if (newSel && !newSel.primary.eq(sel)) {
        var tr = view.state.t().setSelection(newSel);
        if (view.inputState.lastSelectionTime > Date.now() - 50) {
            if (view.inputState.lastSelectionOrigin == "keyboard")
                tr.scrollIntoView();
            else
                tr.annotate(state_1.Transaction.userEvent(view.inputState.lastSelectionOrigin));
        }
        view.dispatch(tr);
        return true;
    }
    return false;
}
exports.applyDOMChange = applyDOMChange;
function findDiff(a, b, preferredPos, preferredSide) {
    var minLen = Math.min(a.length, b.length);
    var from = 0;
    while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from))
        from++;
    if (from == minLen && a.length == b.length)
        return null;
    var toA = a.length, toB = b.length;
    while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
        toA--;
        toB--;
    }
    if (preferredSide == "end") {
        var adjust = Math.max(0, from - Math.min(toA, toB));
        preferredPos -= toA + adjust - from;
    }
    if (toA < from && a.length < b.length) {
        var move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
        from -= move;
        toB = from + (toB - toA);
        toA = from;
    }
    else if (toB < from) {
        var move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
        from -= move;
        toA = from + (toA - toB);
        toB = from;
    }
    return { from: from, toA: toA, toB: toB };
}
var DOMReader = /** @class */ (function () {
    function DOMReader(points) {
        this.points = points;
        this.text = "";
    }
    DOMReader.prototype.readRange = function (start, end) {
        if (!start)
            return;
        var parent = start.parentNode;
        for (var cur = start;;) {
            this.findPointBefore(parent, cur);
            this.readNode(cur);
            var next = cur.nextSibling;
            if (next == end)
                break;
            var view = cur.cmView, nextView = next.cmView;
            if ((view ? view.breakAfter : isBlockElement(cur)) ||
                ((nextView ? nextView.breakAfter : isBlockElement(next)) && !(cur.nodeName == "BR" && !cur.cmIgnore)))
                this.text += LINE_SEP;
            cur = next;
        }
        this.findPointBefore(parent, end);
    };
    DOMReader.prototype.readNode = function (node) {
        if (node.cmIgnore)
            return;
        var view = node.cmView;
        var fromView = view && view.overrideDOMText;
        var text;
        if (fromView != null)
            text = fromView.join(LINE_SEP);
        else if (node.nodeType == 3)
            text = node.nodeValue;
        else if (node.nodeName == "BR")
            text = node.nextSibling ? LINE_SEP : "";
        else if (node.nodeType == 1)
            this.readRange(node.firstChild, null);
        if (text != null) {
            this.findPointIn(node, text.length);
            this.text += text;
        }
    };
    DOMReader.prototype.findPointBefore = function (node, next) {
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            if (point.node == node && node.childNodes[point.offset] == next)
                point.pos = this.text.length;
        }
    };
    DOMReader.prototype.findPointIn = function (node, maxLen) {
        for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
            var point = _a[_i];
            if (point.node == node)
                point.pos = this.text.length + Math.min(point.offset, maxLen);
        }
    };
    return DOMReader;
}());
function isBlockElement(node) {
    return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
}
var DOMPoint = /** @class */ (function () {
    function DOMPoint(node, offset) {
        this.node = node;
        this.offset = offset;
        this.pos = -1;
    }
    return DOMPoint;
}());
function selectionPoints(dom, root) {
    var result = [];
    if (root.activeElement != dom)
        return result;
    var _a = root.getSelection(), anchorNode = _a.anchorNode, anchorOffset = _a.anchorOffset, focusNode = _a.focusNode, focusOffset = _a.focusOffset;
    if (anchorNode) {
        result.push(new DOMPoint(anchorNode, anchorOffset));
        if (focusNode != anchorNode || focusOffset != anchorOffset)
            result.push(new DOMPoint(focusNode, focusOffset));
    }
    return result;
}
function selectionFromPoints(points, base) {
    if (points.length == 0)
        return null;
    var anchor = points[0].pos, head = points.length == 2 ? points[1].pos : anchor;
    return anchor > -1 && head > -1 ? state_1.EditorSelection.single(anchor + base, head + base) : null;
}
function dispatchKey(view, name, code) {
    var options = { key: name, code: name, keyCode: code, which: code, cancelable: true };
    var down = new KeyboardEvent("keydown", options);
    view.contentDOM.dispatchEvent(down);
    var up = new KeyboardEvent("keyup", options);
    view.contentDOM.dispatchEvent(up);
    return down.defaultPrevented || up.defaultPrevented;
}

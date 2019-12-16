"use strict";
exports.__esModule = true;
var blockview_1 = require("./blockview.js");
var decoration_1 = require("./decoration.js");
var inlineview_1 = require("./inlineview.js");
var text_1 = require("../../text/dist/index.js");
var state_1 = require("../../state/dist/index.js");
var dom_1 = require("./dom.js");
var browser_1 = require("./browser.js");
// FIXME rename "word" to something more descriptive of what it actually does?
function movePos(view, start, direction, granularity, action) {
    if (granularity === void 0) { granularity = "character"; }
    var sel = view.root.getSelection();
    var context = LineContext.get(view, start);
    var dir = direction == "forward" || direction == "right" ? 1 : -1;
    // Can only query native behavior when Selection.modify is
    // supported, the cursor is well inside the rendered viewport, and
    // we're not doing by-line motion on Gecko (which will mess up goal
    // column motion)
    if (sel.modify && context && !context.nearViewportEnd(view) && view.hasFocus &&
        granularity != "word" &&
        !(granularity == "line" && (browser_1["default"].gecko || view.state.selection.ranges.length > 1))) {
        return view.docView.observer.ignore(function () {
            var prepared = context.prepareForQuery(view, start);
            var startDOM = view.docView.domAtPos(start);
            var equiv = (!browser_1["default"].chrome || prepared.lines.length == 0) &&
                dom_1.isEquivalentPosition(startDOM.node, startDOM.offset, sel.focusNode, sel.focusOffset) && false;
            // Firefox skips an extra character ahead when extending across
            // an uneditable element (but not when moving)
            if (prepared.atWidget && browser_1["default"].gecko && action == "extend")
                action = "move";
            if (action == "move" && !(equiv && sel.isCollapsed))
                sel.collapse(startDOM.node, startDOM.offset);
            else if (action == "extend" && !equiv)
                sel.extend(startDOM.node, startDOM.offset);
            sel.modify(action, direction, granularity);
            view.docView.setSelectionDirty();
            var result = view.docView.posFromDOM(sel.focusNode, sel.focusOffset);
            context.undoQueryPreparation(view, prepared);
            return result;
        });
    }
    else if (granularity == "character") {
        return moveCharacterSimple(start, dir, context, view.state.doc);
    }
    else if (granularity == "lineboundary") {
        if (context)
            return context.start + (dir < 0 ? 0 : context.line.length);
        var line = view.state.doc.lineAt(start);
        return dir < 0 ? line.start : line.end;
    }
    else if (granularity == "line") {
        if (context && !context.nearViewportEnd(view, dir)) {
            var startCoords = view.docView.coordsAt(start);
            var goal = getGoalColumn(view, start, startCoords.left);
            for (var startY = dir < 0 ? startCoords.top : startCoords.bottom, dist = 5; dist < 50; dist += 10) {
                var pos = posAtCoords(view, { x: goal.column, y: startY + dist * dir }, dir);
                if (pos < 0)
                    break;
                if (pos != start) {
                    goal.pos = pos;
                    return pos;
                }
            }
        }
        // Can't do a precise one based on DOM positions, fall back to per-column
        return moveLineByColumn(view.state.doc, view.state.tabSize, start, dir);
    }
    else if (granularity == "word") {
        return moveWord(view, start, direction);
    }
    else {
        throw new RangeError("Invalid move granularity: " + granularity);
    }
}
exports.movePos = movePos;
function moveLineByColumn(doc, tabSize, pos, dir) {
    var line = doc.lineAt(pos);
    // FIXME also needs goal column?
    var col = 0;
    for (var iter = doc.iterRange(line.start, pos); !iter.next().done;)
        col = text_1.countColumn(iter.value, col, tabSize);
    if (dir < 0 && line.start == 0)
        return 0;
    else if (dir > 0 && line.end == doc.length)
        return line.end;
    var otherLine = doc.line(line.number + dir);
    var result = otherLine.start;
    var seen = 0;
    for (var iter = doc.iterRange(otherLine.start, otherLine.end); seen >= col && !iter.next().done;) {
        var _a = text_1.findColumn(iter.value, seen, col, tabSize), offset = _a.offset, leftOver = _a.leftOver;
        seen = col - leftOver;
        result += offset;
    }
    return result;
}
function moveCharacterSimple(start, dir, context, doc) {
    if (context == null) {
        for (var pos = start;; pos += dir) {
            if (dir < 0 && pos == 0 || dir > 0 && pos == doc.length)
                return pos;
            if (!text_1.isExtendingChar((dir < 0 ? doc.slice(pos - 1, pos) : doc.slice(pos, pos + 1)).charCodeAt(0))) {
                if (dir < 0)
                    return pos - 1;
                else if (pos != start)
                    return pos;
            }
        }
    }
    for (var _a = context.line.childPos(start - context.start), i = _a.i, off = _a.off, children = context.line.children, pos = start;;) {
        if (off == (dir < 0 || i == children.length ? 0 : children[i].length)) {
            i += dir;
            if (i < 0 || i >= children.length) // End/start of line
                return Math.max(0, Math.min(doc.length, pos + (start == pos ? dir : 0)));
            off = dir < 0 ? children[i].length : 0;
        }
        var inline = children[i];
        if (inline instanceof inlineview_1.TextView) {
            if (!text_1.isExtendingChar(inline.text.charCodeAt(off - (dir < 0 ? 1 : 0)))) {
                if (dir < 0)
                    return pos - 1;
                else if (pos != start)
                    return pos;
            }
            off += dir;
            pos += dir;
        }
        else if (inline.length > 0) {
            return pos - off + (dir < 0 ? 0 : inline.length);
        }
    }
}
function moveWord(view, start, direction) {
    var doc = view.state.doc;
    for (var pos = start, i = 0;; i++) {
        var next = movePos(view, pos, direction, "character", "move");
        if (next == pos)
            return pos; // End of document
        if (doc.sliceLines(Math.min(next, pos), Math.max(next, pos)).length > 1)
            return next; // Crossed a line boundary
        var group = state_1.SelectionRange.groupAt(view.state, next, next > pos ? -1 : 1);
        var away = pos < group.from && pos > group.to;
        // If the group is away from its start position, we jumped over a
        // bidi boundary, and should take the side closest (in index
        // coordinates) to the start position
        var start_1 = away ? pos < group.head : group.from == pos ? false : group.to == pos ? true : next < pos;
        pos = start_1 ? group.from : group.to;
        if (i > 0 || /\S/.test(doc.slice(group.from, group.to)))
            return pos;
        next = Math.max(0, Math.min(doc.length, pos + (start_1 ? -1 : 1)));
    }
}
function getGoalColumn(view, pos, column) {
    for (var _i = 0, _a = view.inputState.goalColumns; _i < _a.length; _i++) {
        var goal_1 = _a[_i];
        if (goal_1.pos == pos)
            return goal_1;
    }
    var goal = { pos: 0, column: column };
    view.inputState.goalColumns.push(goal);
    return goal;
}
var LineContext = /** @class */ (function () {
    function LineContext(line, start, index) {
        this.line = line;
        this.start = start;
        this.index = index;
    }
    LineContext.get = function (view, pos) {
        for (var i = 0, off = 0;; i++) {
            var line = view.docView.children[i], end = off + line.length;
            if (end >= pos) {
                if (line instanceof blockview_1.LineView)
                    return new LineContext(line, off, i);
                if (line.length)
                    return null;
            }
            off = end + 1;
        }
    };
    LineContext.prototype.nearViewportEnd = function (view, side) {
        if (side === void 0) { side = 0; }
        for (var _i = 0, _a = view.docView.viewports; _i < _a.length; _i++) {
            var _b = _a[_i], from = _b.from, to = _b.to;
            if (from > 0 && from == this.start && side <= 0 ||
                to < view.state.doc.length && to == this.start + this.line.length && side >= 0)
                return true;
        }
        return false;
    };
    // FIXME limit the amount of work in character motion in non-bidi
    // context? or not worth it?
    LineContext.prototype.prepareForQuery = function (view, pos) {
        var linesToSync = [], atWidget = false;
        function maybeHide(view) {
            if (!(view instanceof inlineview_1.TextView))
                atWidget = true;
            if (view.length > 0)
                return false;
            view.dom.remove();
            if (linesToSync.indexOf(view.parent) < 0)
                linesToSync.push(view.parent);
            return true;
        }
        var _a = this.line.childPos(pos - this.start), i = _a.i, off = _a.off;
        if (off == 0) {
            for (var j = i; j < this.line.children.length; j++)
                if (!maybeHide(this.line.children[j]))
                    break;
            for (var j = i; j > 0; j--)
                if (!maybeHide(this.line.children[j - 1]))
                    break;
        }
        function addForLine(line, omit) {
            if (omit === void 0) { omit = -1; }
            if (line.children.length == 0)
                return;
            for (var i_1 = 0, off_1 = 0; i_1 <= line.children.length; i_1++) {
                var next = i_1 == line.children.length ? null : line.children[i_1];
                if ((!next || !(next instanceof inlineview_1.TextView)) && off_1 != omit &&
                    (i_1 == 0 || !(line.children[i_1 - 1] instanceof inlineview_1.TextView))) {
                    line.dom.insertBefore(document.createTextNode("\u200b"), next ? next.dom : null);
                    if (linesToSync.indexOf(line) < 0)
                        linesToSync.push(line);
                }
                if (next)
                    off_1 += next.length;
            }
        }
        if (this.index > 0)
            addForLine(this.line.parent.children[this.index - 1]);
        addForLine(this.line, pos - this.start);
        if (this.index < this.line.parent.children.length - 1)
            addForLine(this.line.parent.children[this.index + 1]);
        return { lines: linesToSync, atWidget: atWidget };
    };
    LineContext.prototype.undoQueryPreparation = function (view, toSync) {
        for (var _i = 0, _a = toSync.lines; _i < _a.length; _i++) {
            var line = _a[_i];
            line.dirty = 2 /* Node */;
            line.sync();
            line.dirty = 0 /* Not */;
        }
    };
    return LineContext;
}());
exports.LineContext = LineContext;
// Search the DOM for the {node, offset} position closest to the given
// coordinates. Very inefficient and crude, but can usually be avoided
// by calling caret(Position|Range)FromPoint instead.
// FIXME holding arrow-up/down at the end of the viewport is a rather
// common use case that will repeatedly trigger this code. Maybe
// introduce some element of binary search after all?
function getdx(x, rect) {
    return rect.left > x ? rect.left - x : Math.max(0, x - rect.right);
}
function getdy(y, rect) {
    return rect.top > y ? rect.top - y : Math.max(0, y - rect.bottom);
}
function yOverlap(a, b) {
    return a.top < b.bottom - 1 && a.bottom > b.top + 1;
}
function upTop(rect, top) {
    return top < rect.top ? { top: top, left: rect.left, right: rect.right, bottom: rect.bottom } : rect;
}
function upBot(rect, bottom) {
    return bottom > rect.bottom ? { top: rect.top, left: rect.left, right: rect.right, bottom: bottom } : rect;
}
function domPosAtCoords(parent, x, y) {
    var closest, closestRect, closestX, closestY;
    var above, below, aboveRect, belowRect;
    for (var child = parent.firstChild; child; child = child.nextSibling) {
        var rects = dom_1.clientRectsFor(child);
        for (var i = 0; i < rects.length; i++) {
            var rect = rects[i];
            if (closestRect && yOverlap(closestRect, rect))
                rect = upTop(upBot(rect, closestRect.bottom), closestRect.top);
            var dx = getdx(x, rect), dy = getdy(y, rect);
            if (dx == 0 && dy == 0)
                return child.nodeType == 3 ? domPosInText(child, x, y) : domPosAtCoords(child, x, y);
            if (!closest || closestY > dy || closestY == dy && closestX > dx) {
                closest = child;
                closestRect = rect;
                closestX = dx;
                closestY = dy;
            }
            if (dx == 0) {
                if (y > rect.bottom && (!aboveRect || aboveRect.bottom < rect.bottom)) {
                    above = child;
                    aboveRect = rect;
                }
                else if (y < rect.top && (!belowRect || belowRect.top > rect.top)) {
                    below = child;
                    belowRect = rect;
                }
            }
            else if (aboveRect && yOverlap(aboveRect, rect)) {
                aboveRect = upBot(aboveRect, rect.bottom);
            }
            else if (belowRect && yOverlap(belowRect, rect)) {
                belowRect = upTop(belowRect, rect.top);
            }
        }
    }
    if (aboveRect && aboveRect.bottom >= y) {
        closest = above;
        closestRect = aboveRect;
    }
    else if (belowRect && belowRect.top <= y) {
        closest = below;
        closestRect = belowRect;
    }
    if (!closest)
        return { node: parent, offset: 0 };
    var clipX = Math.max(closestRect.left, Math.min(closestRect.right, x));
    if (closest.nodeType == 3)
        return domPosInText(closest, clipX, y);
    if (!closestX && closest.contentEditable == "true")
        domPosAtCoords(closest, clipX, y);
    var offset = Array.prototype.indexOf.call(parent.childNodes, closest) +
        (x >= (closestRect.left + closestRect.right) / 2 ? 1 : 0);
    return { node: parent, offset: offset };
}
function domPosInText(node, x, y) {
    var len = node.nodeValue.length, range = document.createRange();
    for (var i = 0; i < len; i++) {
        range.setEnd(node, i + 1);
        range.setStart(node, i);
        var rects = range.getClientRects();
        for (var j = 0; j < rects.length; j++) {
            var rect = rects[j];
            if (rect.top == rect.bottom)
                continue;
            if (rect.left - 1 <= x && rect.right + 1 >= x &&
                rect.top - 1 <= y && rect.bottom + 1 >= y) {
                var right = x >= (rect.left + rect.right) / 2, after = right;
                if (browser_1["default"].chrome || browser_1["default"].gecko) {
                    // Check for RTL on browsers that support getting client
                    // rects for empty ranges.
                    range.setEnd(node, i);
                    var rectBefore = range.getBoundingClientRect();
                    if (rectBefore.left == rect.right)
                        after = !right;
                }
                return { node: node, offset: i + (after ? 1 : 0) };
            }
        }
    }
    return { node: node, offset: 0 };
}
function posAtCoords(view, _a, bias) {
    var _b;
    var x = _a.x, y = _a.y;
    if (bias === void 0) { bias = -1; }
    var content = view.contentDOM.getBoundingClientRect(), block;
    var halfLine = view.defaultLineHeight / 2;
    for (var bounced = false;;) {
        block = view.blockAtHeight(y, content.top);
        if (block.top > y || block.bottom < y) {
            bias = block.top > y ? -1 : 1;
            y = Math.min(block.bottom - halfLine, Math.max(block.top + halfLine, y));
            if (bounced)
                return -1;
            else
                bounced = true;
        }
        if (block.type == decoration_1.BlockType.Text)
            break;
        y = bias > 0 ? block.bottom + halfLine : block.top - halfLine;
    }
    var lineStart = block.from;
    // If this is outside of the rendered viewport, we can't determine a position
    if (lineStart < view._viewport.from)
        return view._viewport.from == 0 ? 0 : -1;
    if (lineStart > view._viewport.to)
        return view._viewport.to == view.state.doc.length ? view.state.doc.length : -1;
    // Clip x to the viewport sides
    x = Math.max(content.left + 1, Math.min(content.right - 1, x));
    var root = view.root, element = root.elementFromPoint(x, y);
    // There's visible editor content under the point, so we can try
    // using caret(Position|Range)FromPoint as a shortcut
    var node, offset = -1;
    if (element && view.contentDOM.contains(element) && !(view.docView.nearest(element) instanceof inlineview_1.WidgetView)) {
        if (root.caretPositionFromPoint) {
            var pos = root.caretPositionFromPoint(x, y);
            if (pos)
                (node = pos.offsetNode, offset = pos.offset);
        }
        else if (root.caretRangeFromPoint) {
            var range = root.caretRangeFromPoint(x, y);
            if (range)
                (node = range.startContainer, offset = range.startOffset);
        }
    }
    // No luck, do our own (potentially expensive) search
    if (!node) {
        var line = LineContext.get(view, lineStart).line;
        (_b = domPosAtCoords(line.dom, x, y), node = _b.node, offset = _b.offset);
    }
    return view.docView.posFromDOM(node, offset);
}
exports.posAtCoords = posAtCoords;

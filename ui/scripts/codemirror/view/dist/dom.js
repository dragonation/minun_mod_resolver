"use strict";
exports.__esModule = true;
var browser_1 = require("./browser.js");
// Work around Chrome issue https://bugs.chromium.org/p/chromium/issues/detail?id=447523
// (isCollapsed inappropriately returns true in shadow dom)
function selectionCollapsed(domSel) {
    var collapsed = domSel.isCollapsed;
    if (collapsed && browser_1["default"].chrome && domSel.rangeCount && !domSel.getRangeAt(0).collapsed)
        collapsed = false;
    return collapsed;
}
exports.selectionCollapsed = selectionCollapsed;
function hasSelection(dom, selection) {
    if (!selection.anchorNode)
        return false;
    try {
        // Firefox will raise 'permission denied' errors when accessing
        // properties of `sel.anchorNode` when it's in a generated CSS
        // element.
        return dom.contains(selection.anchorNode.nodeType == 3 ? selection.anchorNode.parentNode : selection.anchorNode);
    }
    catch (_) {
        return false;
    }
}
exports.hasSelection = hasSelection;
function clientRectsFor(dom) {
    if (dom.nodeType == 3) {
        var range = document.createRange();
        range.setEnd(dom, dom.nodeValue.length);
        range.setStart(dom, 0);
        return range.getClientRects();
    }
    else if (dom.nodeType == 1) {
        return dom.getClientRects();
    }
    else {
        return [];
    }
}
exports.clientRectsFor = clientRectsFor;
// Scans forward and backward through DOM positions equivalent to the
// given one to see if the two are in the same place (i.e. after a
// text node vs at the end of that text node)
function isEquivalentPosition(node, off, targetNode, targetOff) {
    return targetNode ? (scanFor(node, off, targetNode, targetOff, -1) ||
        scanFor(node, off, targetNode, targetOff, 1)) : false;
}
exports.isEquivalentPosition = isEquivalentPosition;
function domIndex(node) {
    for (var index = 0;; index++) {
        node = node.previousSibling;
        if (!node)
            return index;
    }
}
exports.domIndex = domIndex;
function scanFor(node, off, targetNode, targetOff, dir) {
    for (;;) {
        if (node == targetNode && off == targetOff)
            return true;
        if (off == (dir < 0 ? 0 : maxOffset(node))) {
            if (node.nodeName == "DIV")
                return false;
            var parent_1 = node.parentNode;
            if (!parent_1 || parent_1.nodeType != 1)
                return false;
            off = domIndex(node) + (dir < 0 ? 0 : 1);
            node = parent_1;
        }
        else if (node.nodeType == 1) {
            node = node.childNodes[off + (dir < 0 ? -1 : 0)];
            off = dir < 0 ? maxOffset(node) : 0;
        }
        else {
            return false;
        }
    }
}
function maxOffset(node) {
    return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
}
exports.maxOffset = maxOffset;
function windowRect(win) {
    return { left: 0, right: win.innerWidth,
        top: 0, bottom: win.innerHeight };
}
function scrollRectIntoView(dom, rect) {
    var scrollMargin = 5;
    var doc = dom.ownerDocument, win = doc.defaultView;
    for (var cur = dom.parentNode; cur;) {
        if (cur.nodeType == 1) { // Element
            var bounding = void 0, top_1 = cur == document.body;
            if (top_1) {
                bounding = windowRect(win);
            }
            else {
                if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
                    cur = cur.parentNode;
                    continue;
                }
                var rect_1 = cur.getBoundingClientRect();
                bounding = { left: rect_1.left, right: rect_1.left + cur.clientWidth,
                    top: rect_1.top, bottom: rect_1.top + cur.clientHeight };
            }
            var moveX = 0, moveY = 0;
            if (rect.top < bounding.top)
                moveY = -(bounding.top - rect.top + scrollMargin);
            else if (rect.bottom > bounding.bottom)
                moveY = rect.bottom - bounding.bottom + scrollMargin;
            if (rect.left < bounding.left)
                moveX = -(bounding.left - rect.left + scrollMargin);
            else if (rect.right > bounding.right)
                moveX = rect.right - bounding.right + scrollMargin;
            if (moveX || moveY) {
                if (top_1) {
                    win.scrollBy(moveX, moveY);
                }
                else {
                    if (moveY) {
                        var start = cur.scrollTop;
                        cur.scrollTop += moveY;
                        moveY = cur.scrollTop - start;
                    }
                    if (moveX) {
                        var start = cur.scrollLeft;
                        cur.scrollLeft += moveX;
                        moveX = cur.scrollLeft - start;
                    }
                    rect = { left: rect.left - moveX, top: rect.top - moveY,
                        right: rect.right - moveX, bottom: rect.bottom - moveY };
                }
            }
            if (top_1)
                break;
            cur = cur.parentNode;
        }
        else if (cur.nodeType == 11) { // A shadow root
            cur = cur.host;
        }
        else {
            break;
        }
    }
}
exports.scrollRectIntoView = scrollRectIntoView;
var DOMSelection = /** @class */ (function () {
    function DOMSelection() {
        this.anchorNode = null;
        this.anchorOffset = 0;
        this.focusNode = null;
        this.focusOffset = 0;
    }
    DOMSelection.prototype.eq = function (domSel) {
        return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset &&
            this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
    };
    DOMSelection.prototype.set = function (domSel) {
        this.anchorNode = domSel.anchorNode;
        this.anchorOffset = domSel.anchorOffset;
        this.focusNode = domSel.focusNode;
        this.focusOffset = domSel.focusOffset;
    };
    return DOMSelection;
}());
exports.DOMSelection = DOMSelection;

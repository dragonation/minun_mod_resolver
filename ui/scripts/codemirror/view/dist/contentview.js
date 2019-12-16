"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var dom_1 = require("./dom.js");
var DOMPos = /** @class */ (function () {
    function DOMPos(node, offset, precise) {
        if (precise === void 0) { precise = true; }
        this.node = node;
        this.offset = offset;
        this.precise = precise;
    }
    DOMPos.before = function (dom, precise) { return new DOMPos(dom.parentNode, dom_1.domIndex(dom), precise); };
    DOMPos.after = function (dom, precise) { return new DOMPos(dom.parentNode, dom_1.domIndex(dom) + 1, precise); };
    return DOMPos;
}());
exports.DOMPos = DOMPos;
var none = [];
var ContentView = /** @class */ (function () {
    function ContentView() {
        this.parent = null;
        this.dom = null;
        this.dirty = 2 /* Node */;
    }
    Object.defineProperty(ContentView.prototype, "editorView", {
        get: function () {
            if (!this.parent)
                throw new Error("Accessing view in orphan content view");
            return this.parent.editorView;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContentView.prototype, "overrideDOMText", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContentView.prototype, "posAtStart", {
        get: function () {
            return this.parent ? this.parent.posBefore(this) : 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ContentView.prototype, "posAtEnd", {
        get: function () {
            return this.posAtStart + this.length;
        },
        enumerable: true,
        configurable: true
    });
    ContentView.prototype.posBefore = function (view) {
        var pos = this.posAtStart;
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            if (child == view)
                return pos;
            pos += child.length + child.breakAfter;
        }
        throw new RangeError("Invalid child in posBefore");
    };
    ContentView.prototype.posAfter = function (view) {
        return this.posBefore(view) + view.length;
    };
    ContentView.prototype.coordsAt = function (pos) { return null; };
    ContentView.prototype.sync = function () {
        if (this.dirty & 2 /* Node */) {
            var parent_1 = this.dom, pos = parent_1.firstChild;
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var child = _a[_i];
                if (child.dirty) {
                    if (pos && !child.dom && !pos.cmView) {
                        var prev = pos.previousSibling;
                        if (child.reuseDOM(pos))
                            pos = prev ? prev.nextSibling : parent_1.firstChild;
                    }
                    child.sync();
                    child.dirty = 0 /* Not */;
                }
                pos = syncNodeInto(parent_1, pos, child.dom);
            }
            while (pos)
                pos = rm(pos);
        }
        else if (this.dirty & 1 /* Child */) {
            for (var _b = 0, _c = this.children; _b < _c.length; _b++) {
                var child = _c[_b];
                if (child.dirty) {
                    child.sync();
                    child.dirty = 0 /* Not */;
                }
            }
        }
    };
    ContentView.prototype.reuseDOM = function (dom) { return false; };
    ContentView.prototype.localPosFromDOM = function (node, offset) {
        var after;
        if (node == this.dom) {
            after = this.dom.childNodes[offset];
        }
        else {
            var bias = dom_1.maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
            for (;;) {
                var parent_2 = node.parentNode;
                if (parent_2 == this.dom)
                    break;
                if (bias == 0 && parent_2.firstChild != parent_2.lastChild) {
                    if (node == parent_2.firstChild)
                        bias = -1;
                    else
                        bias = 1;
                }
                node = parent_2;
            }
            if (bias < 0)
                after = node;
            else
                after = node.nextSibling;
        }
        if (after == this.dom.firstChild)
            return 0;
        while (after && !after.cmView)
            after = after.nextSibling;
        if (!after)
            return this.length;
        for (var i = 0, pos = 0;; i++) {
            var child = this.children[i];
            if (child.dom == after)
                return pos;
            pos += child.length + child.breakAfter;
        }
    };
    ContentView.prototype.domBoundsAround = function (from, to, offset) {
        if (offset === void 0) { offset = 0; }
        var fromI = -1, fromStart = -1, toI = -1, toEnd = -1;
        for (var i = 0, pos = offset; i < this.children.length; i++) {
            var child = this.children[i], end = pos + child.length;
            if (pos < from && end > to)
                return child.domBoundsAround(from, to, pos);
            if (end >= from && fromI == -1) {
                fromI = i;
                fromStart = pos;
            }
            if (end >= to && toI == -1) {
                toI = i;
                toEnd = end;
                break;
            }
            pos = end + child.breakAfter;
        }
        return { from: fromStart, to: toEnd,
            startDOM: (fromI ? this.children[fromI - 1].dom.nextSibling : null) || this.dom.firstChild,
            endDOM: toI < this.children.length - 1 ? this.children[toI + 1].dom : null };
    };
    // FIXME track precise dirty ranges, to avoid full DOM sync on every touched node?
    ContentView.prototype.markDirty = function (andParent) {
        if (andParent === void 0) { andParent = false; }
        if (this.dirty & 2 /* Node */)
            return;
        this.dirty |= 2 /* Node */;
        this.markParentsDirty(andParent);
    };
    ContentView.prototype.markParentsDirty = function (childList) {
        for (var parent_3 = this.parent; parent_3; parent_3 = parent_3.parent) {
            if (childList)
                parent_3.dirty |= 2 /* Node */;
            if (parent_3.dirty & 1 /* Child */)
                return;
            parent_3.dirty |= 1 /* Child */;
            childList = false;
        }
    };
    ContentView.prototype.setParent = function (parent) {
        if (this.parent != parent) {
            this.parent = parent;
            if (this.dirty)
                this.markParentsDirty(true);
        }
    };
    ContentView.prototype.setDOM = function (dom) {
        this.dom = dom;
        dom.cmView = this;
    };
    Object.defineProperty(ContentView.prototype, "rootView", {
        get: function () {
            for (var v = this;;) {
                var parent_4 = v.parent;
                if (!parent_4)
                    return v;
                v = parent_4;
            }
        },
        enumerable: true,
        configurable: true
    });
    ContentView.prototype.replaceChildren = function (from, to, children) {
        var _a;
        if (children === void 0) { children = none; }
        this.markDirty();
        for (var i = from; i < to; i++)
            this.children[i].parent = null;
        (_a = this.children).splice.apply(_a, __spreadArrays([from, to - from], children));
        for (var i = 0; i < children.length; i++)
            children[i].setParent(this);
    };
    ContentView.prototype.ignoreMutation = function (rec) { return false; };
    ContentView.prototype.ignoreEvent = function (event) { return false; };
    ContentView.prototype.childCursor = function (pos) {
        if (pos === void 0) { pos = this.length; }
        return new ChildCursor(this.children, pos, this.children.length);
    };
    ContentView.prototype.childPos = function (pos, bias) {
        if (bias === void 0) { bias = 1; }
        return this.childCursor().findPos(pos, bias);
    };
    ContentView.prototype.toString = function () {
        var name = this.constructor.name.replace("View", "");
        return name + (this.children.length ? "(" + this.children.join() + ")" :
            this.length ? "[" + (name == "Text" ? this.text : this.length) + "]" : "") +
            (this.breakAfter ? "#" : "");
    };
    return ContentView;
}());
exports.ContentView = ContentView;
ContentView.prototype.breakAfter = 0;
// Remove a DOM node and return its next sibling.
function rm(dom) {
    var next = dom.nextSibling;
    dom.parentNode.removeChild(dom);
    return next;
}
function syncNodeInto(parent, pos, dom) {
    if (dom.parentNode == parent) {
        while (pos != dom)
            pos = rm(pos);
        pos = dom.nextSibling;
    }
    else {
        parent.insertBefore(dom, pos);
    }
    return pos;
}
var ChildCursor = /** @class */ (function () {
    function ChildCursor(children, pos, i) {
        this.children = children;
        this.pos = pos;
        this.i = i;
        this.off = 0;
    }
    ChildCursor.prototype.findPos = function (pos, bias) {
        if (bias === void 0) { bias = 1; }
        for (;;) {
            if (pos > this.pos || pos == this.pos &&
                (bias > 0 || this.i == 0 || this.children[this.i - 1].breakAfter)) {
                this.off = pos - this.pos;
                return this;
            }
            var next = this.children[--this.i];
            this.pos -= next.length + next.breakAfter;
        }
    };
    return ChildCursor;
}());
exports.ChildCursor = ChildCursor;

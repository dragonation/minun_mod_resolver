"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var contentview_1 = require("./contentview.js");
var inlineview_1 = require("./inlineview.js");
var dom_1 = require("./dom.js");
var decoration_1 = require("./decoration.js");
var attributes_1 = require("./attributes.js");
var styles_1 = require("./styles.js");
var LineView = /** @class */ (function (_super) {
    __extends(LineView, _super);
    function LineView() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.children = [];
        _this.length = 0;
        _this.prevAttrs = undefined;
        _this.attrs = null;
        _this.breakAfter = 0;
        return _this;
    }
    // Consumes source
    LineView.prototype.merge = function (from, to, source, takeDeco) {
        if (source) {
            if (!(source instanceof LineView))
                return false;
            if (!this.dom)
                source.transferDOM(this); // Reuse source.dom when appropriate
        }
        if (takeDeco)
            this.setDeco(source ? source.attrs : null);
        var elts = source ? source.children : [];
        var cur = this.childCursor();
        var _a = cur.findPos(to, 1), toI = _a.i, toOff = _a.off;
        var _b = cur.findPos(from, -1), fromI = _b.i, fromOff = _b.off;
        var dLen = from - to;
        for (var _i = 0, elts_1 = elts; _i < elts_1.length; _i++) {
            var view = elts_1[_i];
            dLen += view.length;
        }
        this.length += dLen;
        // Both from and to point into the same text view
        if (fromI == toI && fromOff) {
            var start = this.children[fromI];
            // Maybe just update that view and be done
            if (elts.length == 1 && start.merge(fromOff, toOff, elts[0]))
                return true;
            if (elts.length == 0) {
                start.merge(fromOff, toOff, null);
                return true;
            }
            // Otherwise split it, so that we don't have to worry about aliasing front/end afterwards
            var after = start.slice(toOff);
            if (after.merge(0, 0, elts[elts.length - 1]))
                elts[elts.length - 1] = after;
            else
                elts.push(after);
            toI++;
            toOff = 0;
        }
        // Make sure start and end positions fall on node boundaries
        // (fromOff/toOff are no longer used after this), and that if the
        // start or end of the elts can be merged with adjacent nodes,
        // this is done
        if (toOff) {
            var end = this.children[toI];
            if (elts.length && end.merge(0, toOff, elts[elts.length - 1]))
                elts.pop();
            else
                end.merge(0, toOff, null);
        }
        else if (toI < this.children.length && elts.length &&
            this.children[toI].merge(0, 0, elts[elts.length - 1])) {
            elts.pop();
        }
        if (fromOff) {
            var start = this.children[fromI];
            if (elts.length && start.merge(fromOff, undefined, elts[0]))
                elts.shift();
            else
                start.merge(fromOff, undefined, null);
            fromI++;
        }
        else if (fromI && elts.length && this.children[fromI - 1].merge(this.children[fromI - 1].length, undefined, elts[0])) {
            elts.shift();
        }
        // Then try to merge any mergeable nodes at the start and end of
        // the changed range
        while (fromI < toI && elts.length && this.children[toI - 1].match(elts[elts.length - 1])) {
            elts.pop();
            toI--;
        }
        while (fromI < toI && elts.length && this.children[fromI].match(elts[0])) {
            elts.shift();
            fromI++;
        }
        // And if anything remains, splice the child array to insert the new elts
        if (elts.length || fromI != toI)
            this.replaceChildren(fromI, toI, elts);
        return true;
    };
    LineView.prototype.split = function (at) {
        var end = new LineView;
        end.breakAfter = this.breakAfter;
        if (this.length == 0)
            return end;
        var _a = this.childPos(at), i = _a.i, off = _a.off;
        if (off) {
            end.append(this.children[i].slice(off));
            this.children[i].merge(off, undefined, null);
            i++;
        }
        for (var j = i; j < this.children.length; j++)
            end.append(this.children[j]);
        while (i > 0 && this.children[i - 1].length == 0) {
            this.children[i - 1].parent = null;
            i--;
        }
        this.children.length = i;
        this.markDirty();
        this.length = at;
        return end;
    };
    LineView.prototype.transferDOM = function (other) {
        if (!this.dom)
            return;
        other.setDOM(this.dom);
        other.prevAttrs = this.prevAttrs === undefined ? this.attrs : this.prevAttrs;
        this.prevAttrs = undefined;
        this.dom = null;
    };
    LineView.prototype.setDeco = function (attrs) {
        if (!attributes_1.attrsEq(this.attrs, attrs)) {
            if (this.dom) {
                this.prevAttrs = this.attrs;
                this.markDirty();
            }
            this.attrs = attrs;
        }
    };
    // Only called when building a line view in ContentBuilder
    LineView.prototype.append = function (child) {
        this.children.push(child);
        child.setParent(this);
        this.length += child.length;
    };
    // Only called when building a line view in ContentBuilder
    LineView.prototype.addLineDeco = function (deco) {
        var attrs = deco.spec.attributes;
        if (attrs)
            this.attrs = attributes_1.combineAttrs(attrs, this.attrs || {});
    };
    LineView.prototype.domAtPos = function (pos) {
        var i = 0;
        for (var off = 0; i < this.children.length; i++) {
            var child = this.children[i], end = off + child.length;
            if (end == off && child.getSide() <= 0)
                continue;
            if (pos > off && pos < end && child.dom.parentNode == this.dom)
                return child.domAtPos(pos - off);
            if (pos <= off)
                break;
            off = end;
        }
        for (; i > 0; i--) {
            var before = this.children[i - 1].dom;
            if (before.parentNode == this.dom)
                return contentview_1.DOMPos.after(before);
        }
        return new contentview_1.DOMPos(this.dom, 0);
    };
    // FIXME might need another hack to work around Firefox's behavior
    // of not actually displaying the cursor even though it's there in
    // the DOM
    LineView.prototype.sync = function () {
        if (!this.dom) {
            this.setDOM(document.createElement("div"));
            this.dom.className = "codemirror-line " + styles_1.styles.line;
            this.prevAttrs = this.attrs ? null : undefined;
        }
        if (this.prevAttrs !== undefined) {
            attributes_1.updateAttrs(this.dom, this.prevAttrs, this.attrs);
            this.dom.classList.add("codemirror-line");
            this.dom.classList.add(styles_1.styles.line);
            this.prevAttrs = undefined;
        }
        _super.prototype.sync.call(this);
        var last = this.dom.lastChild;
        if (!last || (last.nodeName != "BR" && !(last.cmView instanceof inlineview_1.TextView))) {
            var hack = document.createElement("BR");
            hack.cmIgnore = true;
            this.dom.appendChild(hack);
        }
    };
    LineView.prototype.measureTextSize = function () {
        if (this.children.length == 0 || this.length > 20)
            return null;
        var totalWidth = 0;
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            if (!(child instanceof inlineview_1.TextView))
                return null;
            var rects = dom_1.clientRectsFor(child.dom);
            if (rects.length != 1)
                return null;
            totalWidth += rects[0].width;
        }
        return { lineHeight: this.dom.getBoundingClientRect().height,
            charWidth: totalWidth / this.length };
    };
    LineView.prototype.coordsAt = function (pos) {
        for (var off = 0, i = 0; i < this.children.length; i++) {
            var child = this.children[i], end = off + child.length;
            if (end >= pos)
                return child.coordsAt(pos - off);
            off = end;
        }
        return this.dom.lastChild.getBoundingClientRect();
    };
    LineView.prototype.match = function (other) { return false; };
    Object.defineProperty(LineView.prototype, "type", {
        get: function () { return decoration_1.BlockType.Text; },
        enumerable: true,
        configurable: true
    });
    return LineView;
}(contentview_1.ContentView));
exports.LineView = LineView;
var none = [];
var BlockWidgetView = /** @class */ (function (_super) {
    __extends(BlockWidgetView, _super);
    function BlockWidgetView(widget, length, type, 
    // This is set by the builder and used to distinguish between
    // adjacent widgets and parts of the same widget when calling
    // `merge`. It's kind of silly that it's an instance variable, but
    // it's hard to route there otherwise.
    open) {
        if (open === void 0) { open = 0; }
        var _this = _super.call(this) || this;
        _this.widget = widget;
        _this.length = length;
        _this.type = type;
        _this.open = open;
        _this.breakAfter = 0;
        return _this;
    }
    BlockWidgetView.prototype.merge = function (from, to, source) {
        if (!(source instanceof BlockWidgetView) || !source.open ||
            from > 0 && !(source.open & 1 /* Start */) ||
            to < this.length && !(source.open & 2 /* End */))
            return false;
        if (!this.widget.compare(source.widget))
            throw new Error("Trying to merge an open widget with an incompatible node");
        this.length = from + source.length + (this.length - to);
        return true;
    };
    BlockWidgetView.prototype.domAtPos = function (pos) {
        return pos == 0 ? contentview_1.DOMPos.before(this.dom) : contentview_1.DOMPos.after(this.dom, pos == this.length);
    };
    BlockWidgetView.prototype.split = function (at) {
        var len = this.length - at;
        this.length = at;
        return new BlockWidgetView(this.widget, len, this.type);
    };
    Object.defineProperty(BlockWidgetView.prototype, "children", {
        get: function () { return none; },
        enumerable: true,
        configurable: true
    });
    BlockWidgetView.prototype.sync = function () {
        if (!this.dom || !this.widget.updateDOM(this.dom)) {
            this.setDOM(this.widget.toDOM(this.editorView));
            this.dom.contentEditable = "false";
        }
    };
    Object.defineProperty(BlockWidgetView.prototype, "overrideDOMText", {
        get: function () {
            return this.parent ? this.parent.state.doc.sliceLines(this.posAtStart, this.posAtEnd) : [""];
        },
        enumerable: true,
        configurable: true
    });
    BlockWidgetView.prototype.domBoundsAround = function () { return null; };
    BlockWidgetView.prototype.match = function (other) {
        if (other instanceof BlockWidgetView && other.type == this.type &&
            other.widget.constructor == this.widget.constructor) {
            if (!other.widget.eq(this.widget.value))
                this.markDirty(true);
            this.widget = other.widget;
            this.length = other.length;
            this.breakAfter = other.breakAfter;
            return true;
        }
        return false;
    };
    return BlockWidgetView;
}(contentview_1.ContentView));
exports.BlockWidgetView = BlockWidgetView;

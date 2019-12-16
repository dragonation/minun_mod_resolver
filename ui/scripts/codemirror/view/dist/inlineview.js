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
var attributes_1 = require("./attributes.js");
var browser_1 = require("./browser.js");
var none = [];
var InlineView = /** @class */ (function (_super) {
    __extends(InlineView, _super);
    function InlineView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    InlineView.prototype.match = function (other) { return false; };
    Object.defineProperty(InlineView.prototype, "children", {
        get: function () { return none; },
        enumerable: true,
        configurable: true
    });
    InlineView.prototype.getSide = function () { return 0; };
    return InlineView;
}(contentview_1.ContentView));
exports.InlineView = InlineView;
var MAX_JOIN_LEN = 256;
var TextView = /** @class */ (function (_super) {
    __extends(TextView, _super);
    function TextView(text, tagName, clss, attrs) {
        var _this = _super.call(this) || this;
        _this.text = text;
        _this.tagName = tagName;
        _this.attrs = attrs;
        _this.textDOM = null;
        _this["class"] = clss;
        return _this;
    }
    Object.defineProperty(TextView.prototype, "length", {
        get: function () { return this.text.length; },
        enumerable: true,
        configurable: true
    });
    TextView.prototype.createDOM = function (textDOM) {
        var tagName = this.tagName || (this.attrs || this["class"] ? "span" : null);
        this.textDOM = textDOM || document.createTextNode(this.text);
        if (tagName) {
            var dom = document.createElement(tagName);
            dom.appendChild(this.textDOM);
            if (this["class"])
                dom.className = this["class"];
            if (this.attrs)
                for (var name_1 in this.attrs)
                    dom.setAttribute(name_1, this.attrs[name_1]);
            this.setDOM(dom);
        }
        else {
            this.setDOM(this.textDOM);
        }
    };
    TextView.prototype.sync = function () {
        if (!this.dom)
            this.createDOM();
        if (this.textDOM.nodeValue != this.text) {
            this.textDOM.nodeValue = this.text;
            var dom = this.dom;
            if (this.textDOM != dom && (this.dom.firstChild != this.textDOM || dom.lastChild != this.textDOM)) {
                while (dom.firstChild)
                    dom.removeChild(dom.firstChild);
                dom.appendChild(this.textDOM);
            }
        }
    };
    TextView.prototype.reuseDOM = function (dom) {
        if (dom.nodeType != 3)
            return false;
        this.createDOM(dom);
        return true;
    };
    TextView.prototype.merge = function (from, to, source) {
        if (to === void 0) { to = this.length; }
        if (source === void 0) { source = null; }
        if (source &&
            (!(source instanceof TextView) ||
                source.tagName != this.tagName || source["class"] != this["class"] ||
                !attributes_1.attrsEq(source.attrs, this.attrs) || this.length - (to - from) + source.length > MAX_JOIN_LEN))
            return false;
        this.text = this.text.slice(0, from) + (source ? source.text : "") + this.text.slice(to);
        this.markDirty();
        return true;
    };
    TextView.prototype.slice = function (from, to) {
        if (to === void 0) { to = this.length; }
        return new TextView(this.text.slice(from, to), this.tagName, this["class"], this.attrs);
    };
    TextView.prototype.localPosFromDOM = function (node, offset) {
        return node == this.textDOM ? offset : offset ? this.text.length : 0;
    };
    TextView.prototype.domAtPos = function (pos) { return new contentview_1.DOMPos(this.textDOM, pos); };
    TextView.prototype.domBoundsAround = function (from, to, offset) {
        return { from: offset, to: offset + this.length, startDOM: this.dom, endDOM: this.dom.nextSibling };
    };
    TextView.prototype.coordsAt = function (pos) {
        return textCoords(this.textDOM, pos);
    };
    return TextView;
}(InlineView));
exports.TextView = TextView;
function textCoords(text, pos) {
    var range = document.createRange();
    if (browser_1["default"].chrome || browser_1["default"].gecko) {
        // These browsers reliably return valid rectangles for empty ranges
        range.setEnd(text, pos);
        range.setStart(text, pos);
        return range.getBoundingClientRect();
    }
    else {
        // Otherwise, get the rectangle around a character and take one side
        var extend = pos == 0 ? 1 : -1;
        range.setEnd(text, pos + (extend > 0 ? 1 : 0));
        range.setStart(text, pos - (extend < 0 ? 1 : 0));
        var rect = range.getBoundingClientRect();
        var x = extend < 0 ? rect.right : rect.left;
        return { left: x, right: x, top: rect.top, bottom: rect.bottom };
    }
}
// Also used for collapsed ranges that don't have a placeholder widget!
var WidgetView = /** @class */ (function (_super) {
    __extends(WidgetView, _super);
    function WidgetView(widget, length, side, open) {
        var _this = _super.call(this) || this;
        _this.widget = widget;
        _this.length = length;
        _this.side = side;
        _this.open = open;
        return _this;
    }
    WidgetView.create = function (widget, length, side, open) {
        if (open === void 0) { open = 0; }
        return new (widget.customView || WidgetView)(widget, length, side, open);
    };
    WidgetView.prototype.slice = function (from, to) {
        if (to === void 0) { to = this.length; }
        return WidgetView.create(this.widget, to - from, this.side);
    };
    WidgetView.prototype.sync = function () {
        if (!this.dom || !this.widget.updateDOM(this.dom)) {
            this.setDOM(this.widget.toDOM(this.editorView));
            this.dom.contentEditable = "false";
        }
    };
    WidgetView.prototype.getSide = function () { return this.side; };
    WidgetView.prototype.merge = function (from, to, source) {
        if (to === void 0) { to = this.length; }
        if (source === void 0) { source = null; }
        if (source) {
            if (!(source instanceof WidgetView) || !source.open ||
                from > 0 && !(source.open & 1 /* Start */) ||
                to < this.length && !(source.open & 2 /* End */))
                return false;
            if (!this.widget.compare(source.widget))
                throw new Error("Trying to merge incompatible widgets");
        }
        this.length = from + (source ? source.length : 0) + (this.length - to);
        return true;
    };
    WidgetView.prototype.match = function (other) {
        if (other.length == this.length && other instanceof WidgetView && other.side == this.side) {
            if (this.widget.constructor == other.widget.constructor) {
                if (!this.widget.eq(other.widget.value))
                    this.markDirty(true);
                this.widget = other.widget;
                return true;
            }
        }
        return false;
    };
    WidgetView.prototype.ignoreMutation = function () { return true; };
    WidgetView.prototype.ignoreEvent = function (event) { return this.widget.ignoreEvent(event); };
    Object.defineProperty(WidgetView.prototype, "overrideDOMText", {
        get: function () {
            if (this.length == 0)
                return [""];
            var top = this;
            while (top.parent)
                top = top.parent;
            var state = top.state, text = state && state.doc, start = this.posAtStart;
            return text ? text.sliceLines(start, start + this.length) : [""];
        },
        enumerable: true,
        configurable: true
    });
    WidgetView.prototype.domAtPos = function (pos) {
        return pos == 0 ? contentview_1.DOMPos.before(this.dom) : contentview_1.DOMPos.after(this.dom, pos == this.length);
    };
    WidgetView.prototype.domBoundsAround = function () { return null; };
    WidgetView.prototype.coordsAt = function (pos) {
        var rects = this.dom.getClientRects();
        for (var i = pos > 0 ? rects.length - 1 : 0;; i += (pos > 0 ? -1 : 1)) {
            var rect = rects[i];
            if (pos > 0 ? i == 0 : i == rects.length - 1 || rect.top < rect.bottom)
                return rects[i];
        }
        return null;
    };
    return WidgetView;
}(InlineView));
exports.WidgetView = WidgetView;
var CompositionView = /** @class */ (function (_super) {
    __extends(CompositionView, _super);
    function CompositionView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CompositionView.prototype.domAtPos = function (pos) { return new contentview_1.DOMPos(this.widget.value.text, pos); };
    CompositionView.prototype.sync = function () { if (!this.dom)
        this.setDOM(this.widget.toDOM(this.editorView)); };
    CompositionView.prototype.ignoreMutation = function () { return false; };
    Object.defineProperty(CompositionView.prototype, "overrideDOMText", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    CompositionView.prototype.coordsAt = function (pos) { return textCoords(this.widget.value.text, pos); };
    return CompositionView;
}(WidgetView));
exports.CompositionView = CompositionView;

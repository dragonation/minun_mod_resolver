"use strict";
exports.__esModule = true;
var view_1 = require("../../view/dist/index.js");
var state_1 = require("../../state/dist/index.js");
var tooltipPlugin = view_1.ViewPlugin.create(function (view) { return new TooltipPlugin(view); });
/// Supporting extension for displaying tooltips. Allows
/// [`showTooltip`](#tooltip.showTooltip) to be used to define
/// tooltips.
function tooltips() {
    return view_1.EditorView.extend.fallback(tooltipExt);
}
exports.tooltips = tooltips;
var theme = view_1.EditorView.theme({
    tooltip: {
        position: "absolute",
        border: "1px solid silver",
        background: "#f5f5f5",
        zIndex: 100
    }
});
var tooltipExt = [
    tooltipPlugin.extension,
    theme
];
// Behavior by which an extension can provide a tooltip to be shown.
exports.showTooltip = view_1.EditorView.extend.behavior();
/// Enable a hover tooltip, which shows up when the pointer hovers
/// over ranges of text. The callback should, for each hoverable
/// range, call its `check` argument to see if that range is being
/// hovered over, and return a tooltip description when it is.
function hoverTooltip(source) {
    var plugin = view_1.ViewPlugin.create(function (view) { return new HoverPlugin(view, source); }).behavior(exports.showTooltip, function (p) { return p.active; });
    return [
        plugin.extension,
        tooltips()
    ];
}
exports.hoverTooltip = hoverTooltip;
var HoverPlugin = /** @class */ (function () {
    function HoverPlugin(view, source) {
        this.view = view;
        this.source = source;
        this.lastMouseMove = null;
        this.hoverTimeout = -1;
        this.mouseInside = false;
        this.active = null;
        this.setHover = state_1.Annotation.define();
        this.checkHover = this.checkHover.bind(this);
        view.dom.addEventListener("mouseenter", this.mouseenter = this.mouseenter.bind(this));
        view.dom.addEventListener("mouseleave", this.mouseleave = this.mouseleave.bind(this));
        view.dom.addEventListener("mousemove", this.mousemove = this.mousemove.bind(this));
        this.mouseleave = this.mouseleave.bind(this);
    }
    HoverPlugin.prototype.update = function (update) {
        if (this.active && this.active.hideOnChange && (update.docChanged || update.transactions.some(function (t) { return t.selectionSet; })))
            this.active = null;
        var set = update.annotation(this.setHover);
        if (set !== undefined)
            this.active = set;
    };
    HoverPlugin.prototype.checkHover = function () {
        var _this = this;
        this.hoverTimeout = -1;
        if (!this.mouseInside || this.active)
            return;
        var now = Date.now(), lastMove = this.lastMouseMove;
        if (now - lastMove.timeStamp < HoverTime) {
            this.hoverTimeout = setTimeout(this.checkHover, HoverTime - (now - lastMove.timeStamp));
            return;
        }
        var pos = this.view.contentDOM.contains(lastMove.target)
            ? this.view.posAtCoords({ x: lastMove.clientX, y: lastMove.clientY }) : -1;
        var open = pos < 0 ? null : this.source(this.view, function (from, to) {
            return from <= pos && to >= pos && (from == to || isOverRange(_this.view, from, to, lastMove.clientX, lastMove.clientY));
        });
        if (open)
            this.view.dispatch(this.view.state.t().annotate(this.setHover(open)));
    };
    HoverPlugin.prototype.mousemove = function (event) {
        this.lastMouseMove = event;
        if (this.hoverTimeout < 0)
            this.hoverTimeout = setTimeout(this.checkHover, HoverTime);
        if (this.active && !this.active.dom.contains(event.target) &&
            (this.active.pos == this.active.end
                ? this.view.posAtCoords({ x: event.clientX, y: event.clientY }) != this.active.pos
                : !isOverRange(this.view, this.active.pos, this.active.end, event.clientX, event.clientY, HoverMaxDist)))
            this.view.dispatch(this.view.state.t().annotate(this.setHover(null)));
    };
    HoverPlugin.prototype.mouseenter = function () {
        this.mouseInside = true;
    };
    HoverPlugin.prototype.mouseleave = function () {
        this.mouseInside = false;
        if (this.active)
            this.view.dispatch(this.view.state.t().annotate(this.setHover(null)));
    };
    HoverPlugin.prototype.destroy = function () {
        this.view.dom.removeEventListener("mouseenter", this.mouseenter.bind(this));
        this.view.dom.removeEventListener("mouseleave", this.mouseleave.bind(this));
        this.view.dom.removeEventListener("mousemove", this.mousemove.bind(this));
    };
    return HoverPlugin;
}());
var HoverTime = 750, HoverMaxDist = 10;
var TooltipPlugin = /** @class */ (function () {
    function TooltipPlugin(view) {
        this.view = view;
        this.tooltips = [];
        this.sourceArray = [];
        this.added = [];
        this.mustSync = false;
        this.themeChanged = false;
        this.mustMeasure = false;
        view.scrollDOM.addEventListener("scroll", this.onscroll = this.onscroll.bind(this));
    }
    TooltipPlugin.prototype.update = function (update) {
        var source = update.view.behavior(exports.showTooltip);
        if (source != this.sourceArray) {
            this.sourceArray = source;
            this.tooltips = source.filter(function (x) { return x; });
            this.mustSync = true;
        }
        if (update.docChanged)
            this.mustMeasure = true;
        if (update.themeChanged)
            this.themeChanged = true;
    };
    TooltipPlugin.prototype.destroy = function () {
        this.view.scrollDOM.removeEventListener("scroll", this.onscroll);
    };
    TooltipPlugin.prototype.draw = function () {
        if (this.themeChanged) {
            this.themeChanged = false;
            for (var _i = 0, _a = this.tooltips; _i < _a.length; _i++) {
                var tooltip = _a[_i];
                tooltip.dom.className = this.view.cssClass("tooltip" + (tooltip.style ? "." + tooltip.style : ""));
            }
        }
        if (!this.mustSync)
            return;
        this.mustSync = false;
        for (var _b = 0, _c = this.tooltips; _b < _c.length; _b++) {
            var tooltip = _c[_b];
            if (this.added.indexOf(tooltip.dom) < 0) {
                tooltip.dom.className = this.view.cssClass("tooltip" + (tooltip.style ? "." + tooltip.style : ""));
                this.view.dom.appendChild(tooltip.dom);
                this.added.push(tooltip.dom);
            }
        }
        var _loop_1 = function (i) {
            var element = this_1.added[i];
            if (!this_1.tooltips.some(function (t) { return t.dom == element; })) {
                element.remove();
                this_1.added.splice(i--, 1);
            }
            out_i_1 = i;
        };
        var this_1 = this, out_i_1;
        for (var i = 0; i < this.added.length; i++) {
            _loop_1(i);
            i = out_i_1;
        }
        this.mustMeasure = true;
    };
    TooltipPlugin.prototype.measure = function () {
        var _this = this;
        if (!this.mustMeasure || !this.tooltips.length)
            return null;
        return {
            editor: this.view.dom.getBoundingClientRect(),
            pos: this.tooltips.map(function (tooltip) { return _this.view.coordsAtPos(tooltip.pos); }),
            size: this.tooltips.map(function (tooltip) { return tooltip.dom.getBoundingClientRect(); }),
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
        };
    };
    TooltipPlugin.prototype.drawMeasured = function (measured) {
        if (!measured)
            return false;
        this.mustMeasure = false;
        var editor = measured.editor;
        for (var i = 0; i < this.tooltips.length; i++) {
            var tooltip = this.tooltips[i], pos = measured.pos[i], size = measured.size[i];
            // Hide tooltips that are outside of the editor.
            if (pos.bottom <= editor.top || pos.top >= editor.bottom || pos.right <= editor.left || pos.left >= editor.right) {
                tooltip.dom.style.top = "-10000px";
                continue;
            }
            var width = size.right - size.left, height = size.bottom - size.top;
            var align = pos.left + width < measured.innerWidth;
            var above = !!tooltip.above;
            if (!tooltip.strictSide &&
                (above ? pos.top - (size.bottom - size.top) < 0 : pos.bottom + (size.bottom - size.top) > measured.innerHeight))
                above = !above;
            tooltip.dom.style.left = ((align ? pos.left : measured.innerWidth - width) - editor.left) + "px";
            tooltip.dom.style.top = ((above ? pos.top - height : pos.bottom) - editor.top) + "px";
        }
        return false;
    };
    TooltipPlugin.prototype.onscroll = function () {
        if (this.tooltips.length) {
            this.mustMeasure = true;
            this.view.requireMeasure();
        }
    };
    return TooltipPlugin;
}());
function isOverRange(view, from, to, x, y, margin) {
    if (margin === void 0) { margin = 0; }
    var range = document.createRange();
    var fromDOM = view.domAtPos(from), toDOM = view.domAtPos(to);
    range.setEnd(toDOM.node, toDOM.offset);
    range.setStart(fromDOM.node, fromDOM.offset);
    var rects = range.getClientRects();
    for (var i = 0; i < rects.length; i++) {
        var rect = rects[i];
        var dist = Math.max(rect.top - y, y - rect.bottom, rect.left - x, x - rect.right);
        if (dist <= margin)
            return true;
    }
    return false;
}

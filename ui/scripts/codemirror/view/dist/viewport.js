"use strict";
exports.__esModule = true;
var heightmap_1 = require("./heightmap.js");
function visiblePixelRange(dom, paddingTop) {
    var rect = dom.getBoundingClientRect();
    var top = Math.max(0, Math.min(innerHeight, rect.top)), bottom = Math.max(0, Math.min(innerHeight, rect.bottom));
    for (var parent_1 = dom.parentNode; parent_1;) { // (Cast to any because TypeScript is useless with Node types)
        if (parent_1.nodeType == 1) {
            if (parent_1.scrollHeight > parent_1.clientHeight) {
                var parentRect = parent_1.getBoundingClientRect();
                top = Math.min(parentRect.bottom, Math.max(parentRect.top, top));
                bottom = Math.min(parentRect.bottom, Math.max(parentRect.top, bottom));
            }
            parent_1 = parent_1.parentNode;
        }
        else if (parent_1.nodeType == 11) { // Shadow root
            parent_1 = parent_1.host;
        }
        else {
            break;
        }
    }
    return { top: top - (rect.top + paddingTop), bottom: bottom - (rect.top + paddingTop) };
}
var VIEWPORT_MARGIN = 1000; // FIXME look into appropriate value of this through benchmarking etc
var MIN_COVER_MARGIN = 10; // coveredBy requires at least this many extra pixels to be covered
var MAX_COVER_MARGIN = VIEWPORT_MARGIN / 4;
var ViewportState = /** @class */ (function () {
    function ViewportState() {
        // These are contentDOM-local coordinates
        this.top = 0;
        this.bottom = 0;
    }
    ViewportState.prototype.updateFromDOM = function (dom, paddingTop) {
        var _a = visiblePixelRange(dom, paddingTop), top = _a.top, bottom = _a.bottom;
        var dTop = top - this.top, dBottom = bottom - this.bottom, bias = 0;
        if (dTop > 0 && dBottom > 0)
            bias = Math.max(dTop, dBottom);
        else if (dTop < 0 && dBottom < 0)
            bias = Math.min(dTop, dBottom);
        this.top = top;
        this.bottom = bottom;
        return bias;
    };
    ViewportState.prototype.coverEverything = function () {
        this.top = -1e9;
        this.bottom = 1e9;
    };
    ViewportState.prototype.getViewport = function (doc, heightMap, bias, scrollTo) {
        // This will divide VIEWPORT_MARGIN between the top and the
        // bottom, depending on the bias (the change in viewport position
        // since the last update). It'll hold a number between 0 and 1
        var marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / VIEWPORT_MARGIN / 2));
        var viewport = new Viewport(heightMap.lineAt(this.top - marginTop * VIEWPORT_MARGIN, heightmap_1.QueryType.ByHeight, doc, 0, 0).from, heightMap.lineAt(this.bottom + (1 - marginTop) * VIEWPORT_MARGIN, heightmap_1.QueryType.ByHeight, doc, 0, 0).to);
        // If scrollTo is > -1, make sure the viewport includes that position
        if (scrollTo > -1) {
            if (scrollTo < viewport.from) {
                var top_1 = heightMap.lineAt(scrollTo, heightmap_1.QueryType.ByPos, doc, 0, 0).top;
                viewport = new Viewport(heightMap.lineAt(top_1 - VIEWPORT_MARGIN / 2, heightmap_1.QueryType.ByHeight, doc, 0, 0).from, heightMap.lineAt(top_1 + (this.bottom - this.top) + VIEWPORT_MARGIN / 2, heightmap_1.QueryType.ByHeight, doc, 0, 0).to);
            }
            else if (scrollTo > viewport.to) {
                var bottom = heightMap.lineAt(scrollTo, heightmap_1.QueryType.ByPos, doc, 0, 0).bottom;
                viewport = new Viewport(heightMap.lineAt(bottom - (this.bottom - this.top) - VIEWPORT_MARGIN / 2, heightmap_1.QueryType.ByHeight, doc, 0, 0).from, heightMap.lineAt(bottom + VIEWPORT_MARGIN / 2, heightmap_1.QueryType.ByHeight, doc, 0, 0).to);
            }
        }
        return viewport;
    };
    ViewportState.prototype.coveredBy = function (doc, viewport, heightMap, bias) {
        if (bias === void 0) { bias = 0; }
        var top = heightMap.lineAt(viewport.from, heightmap_1.QueryType.ByPos, doc, 0, 0).top;
        var bottom = heightMap.lineAt(viewport.to, heightmap_1.QueryType.ByPos, doc, 0, 0).bottom;
        return (viewport.from == 0 || top <= this.top - Math.max(MIN_COVER_MARGIN, Math.min(-bias, MAX_COVER_MARGIN))) &&
            (viewport.to == doc.length || bottom >= this.bottom + Math.max(MIN_COVER_MARGIN, Math.min(bias, MAX_COVER_MARGIN)));
    };
    return ViewportState;
}());
exports.ViewportState = ViewportState;
/// Indicates the range of the document that is in the visible
/// viewport.
var Viewport = /** @class */ (function () {
    function Viewport(from, to) {
        this.from = from;
        this.to = to;
    }
    Viewport.prototype.clip = function (pos) { return Math.max(this.from, Math.min(this.to, pos)); };
    Viewport.prototype.eq = function (b) { return this.from == b.from && this.to == b.to; };
    return Viewport;
}());
exports.Viewport = Viewport;

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
var extension_1 = require("../../extension/dist/extension.js");
var view_1 = require("../../view/dist/index.js");
var rangeset_1 = require("../../rangeset/dist/rangeset.js");
var state_1 = require("../../state/dist/index.js");
/// A gutter marker represents a bit of information attached to a line
/// in a specific gutter. Your own custom markers have to extend this
/// class.
var GutterMarker = /** @class */ (function (_super) {
    __extends(GutterMarker, _super);
    function GutterMarker() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    /// @internal
    GutterMarker.prototype.compare = function (other) {
        return this == other || this.constructor == other.constructor && this.eq(other);
    };
    /// Map this marker through a position mapping.
    GutterMarker.prototype.map = function (mapping, pos) {
        pos = mapping.mapPos(pos, -1, state_1.MapMode.TrackBefore);
        return pos < 0 ? null : new rangeset_1.Range(pos, pos, this);
    };
    /// Render the DOM node for this marker, if any.
    GutterMarker.prototype.toDOM = function (view) { return null; };
    /// Create a range that places this marker at the given position.
    GutterMarker.prototype.at = function (pos) { return new rangeset_1.Range(pos, pos, this); };
    return GutterMarker;
}(rangeset_1.RangeValue));
exports.GutterMarker = GutterMarker;
GutterMarker.prototype.elementClass = "";
var defaults = {
    style: "",
    renderEmptyElements: false,
    elementStyle: "",
    initialMarkers: function () { return rangeset_1.RangeSet.empty; },
    updateMarkers: function (markers) { return markers; },
    lineMarker: function () { return null; },
    initialSpacer: null,
    updateSpacer: null,
    handleDOMEvents: {}
};
var gutterBehavior = view_1.EditorView.extend.behavior();
/// Defines an editor gutter.
var Gutter = /** @class */ (function () {
    function Gutter(config) {
        this.config = extension_1.fillConfig(config, defaults);
    }
    Object.defineProperty(Gutter.prototype, "extension", {
        /// The extension that installs this gutter.
        get: function () {
            return [
                gutters(),
                gutterBehavior(this)
            ];
        },
        enumerable: true,
        configurable: true
    });
    return Gutter;
}());
exports.Gutter = Gutter;
var unfixGutters = view_1.EditorView.extend.behavior();
var viewPlugin = view_1.ViewPlugin.create(function (view) { return new GutterView(view); })
    .behavior(view_1.EditorView.scrollMargins, function (gutterView) { return gutterView.scrollMargins(); });
/// The gutter-drawing plugin is automatically enabled when you add a
/// gutter, but you can use this function to explicitly configure it.
///
/// Unless `fixed` is explicitly set to `false`, the gutters are
/// fixed, meaning they don't scroll along with the content
/// horizontally.
function gutters(config) {
    var result = [
        viewPlugin.extension,
        baseTheme
    ];
    if (config && config.fixed === false)
        result.push(unfixGutters(true));
    return result;
}
exports.gutters = gutters;
var GutterView = /** @class */ (function () {
    function GutterView(view) {
        this.view = view;
        this.dom = document.createElement("div");
        this.dom.setAttribute("aria-hidden", "true");
        this.gutters = view.behavior(gutterBehavior).map(function (gutter) { return new SingleGutterView(view, gutter.config); });
        for (var _i = 0, _a = this.gutters; _i < _a.length; _i++) {
            var gutter = _a[_i];
            this.dom.appendChild(gutter.dom);
        }
        this.fixed = !view.behavior(unfixGutters); // FIXME dynamic?
        if (this.fixed) {
            // FIXME IE11 fallback, which doesn't support position: sticky,
            // by using position: relative + event handlers that realign the
            // gutter (or just force fixed=false on IE11?)
            this.dom.style.position = "sticky";
        }
        view.scrollDOM.insertBefore(this.dom, view.contentDOM);
        this.updateTheme();
    }
    GutterView.prototype.updateTheme = function () {
        this.dom.className = this.view.cssClass("gutters");
        for (var _i = 0, _a = this.gutters; _i < _a.length; _i++) {
            var gutter = _a[_i];
            gutter.updateTheme();
        }
    };
    GutterView.prototype.update = function (update) {
        if (update.themeChanged)
            this.updateTheme();
        for (var _i = 0, _a = this.gutters; _i < _a.length; _i++) {
            var gutter = _a[_i];
            gutter.update(update);
        }
    };
    GutterView.prototype.draw = function () {
        var _this = this;
        // FIXME would be nice to be able to recognize updates that didn't redraw
        var contexts = this.gutters.map(function (gutter) { return new UpdateContext(gutter, _this.view.viewport); });
        this.view.viewportLines(function (line) {
            var text;
            if (Array.isArray(line.type))
                text = line.type.find(function (b) { return b.type == view_1.BlockType.Text; });
            else
                text = line.type == view_1.BlockType.Text ? line : undefined;
            if (!text)
                return;
            for (var _i = 0, contexts_2 = contexts; _i < contexts_2.length; _i++) {
                var cx = contexts_2[_i];
                cx.line(_this.view, text);
            }
        }, 0);
        for (var _i = 0, contexts_1 = contexts; _i < contexts_1.length; _i++) {
            var cx = contexts_1[_i];
            cx.finish(this.view);
        }
        this.dom.style.minHeight = this.view.contentHeight + "px";
    };
    GutterView.prototype.scrollMargins = function () {
        if (this.gutters.length == 0 || !this.fixed)
            return {};
        return getComputedStyle(this.view.scrollDOM).direction == "ltr" ? { left: this.dom.offsetWidth } : { right: this.dom.offsetWidth };
    };
    return GutterView;
}());
var UpdateContext = /** @class */ (function () {
    function UpdateContext(gutter, viewport) {
        this.gutter = gutter;
        this.localMarkers = [];
        this.i = 0;
        this.height = 0;
        this.next = gutter.markers.iter(viewport.from, viewport.to).next;
        this.nextMarker = this.next();
    }
    UpdateContext.prototype.line = function (view, line) {
        if (this.localMarkers.length)
            this.localMarkers = [];
        while (this.nextMarker && this.nextMarker.from <= line.from) {
            if (this.nextMarker.from == line.from)
                this.localMarkers.push(this.nextMarker.value);
            this.nextMarker = this.next();
        }
        var forLine = this.gutter.config.lineMarker(view, line, this.localMarkers);
        if (forLine)
            this.localMarkers.unshift(forLine);
        var gutter = this.gutter;
        if (this.localMarkers.length == 0 && !gutter.config.renderEmptyElements)
            return;
        var above = line.top - this.height;
        if (this.i == gutter.elements.length) {
            var newElt = new GutterElement(view, line.height, above, this.localMarkers, gutter.elementClass);
            gutter.elements.push(newElt);
            gutter.dom.appendChild(newElt.dom);
        }
        else {
            var markers = this.localMarkers, elt = gutter.elements[this.i];
            if (sameMarkers(markers, elt.markers)) {
                markers = elt.markers;
                this.localMarkers.length = 0;
            }
            elt.update(view, line.height, above, markers, gutter.elementClass);
        }
        this.height = line.bottom;
        this.i++;
    };
    UpdateContext.prototype.finish = function (view) {
        var gutter = this.gutter;
        while (gutter.elements.length > this.i)
            gutter.dom.removeChild(gutter.elements.pop().dom);
    };
    return UpdateContext;
}());
var SingleGutterView = /** @class */ (function () {
    function SingleGutterView(view, config) {
        this.view = view;
        this.config = config;
        this.elements = [];
        this.spacer = null;
        this.dom = document.createElement("div");
        var _loop_1 = function (prop) {
            this_1.dom.addEventListener(prop, function (event) {
                var line = view.lineAtHeight(event.clientY);
                if (config.handleDOMEvents[prop](view, line, event))
                    event.preventDefault();
            });
        };
        var this_1 = this;
        for (var prop in config.handleDOMEvents) {
            _loop_1(prop);
        }
        this.markers = config.initialMarkers(view);
        if (config.initialSpacer) {
            this.spacer = new GutterElement(view, 0, 0, [config.initialSpacer(view)], this.elementClass);
            this.dom.appendChild(this.spacer.dom);
            this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
        }
        this.updateTheme();
    }
    SingleGutterView.prototype.updateTheme = function () {
        this.dom.className = this.view.cssClass("gutter" + (this.config.style ? "." + this.config.style : ""));
        this.elementClass = this.view.cssClass("gutterElement" + (this.config.style ? "." + this.config.style : ""));
        while (this.elements.length)
            this.dom.removeChild(this.elements.pop().dom);
    };
    SingleGutterView.prototype.update = function (update) {
        if (update.themeChanged)
            this.updateTheme();
        this.markers = this.config.updateMarkers(this.markers.map(update.changes), update);
        if (this.spacer && this.config.updateSpacer) {
            var updated = this.config.updateSpacer(this.spacer.markers[0], update);
            if (updated != this.spacer.markers[0])
                this.spacer.update(update.view, 0, 0, [updated], this.elementClass);
        }
    };
    SingleGutterView.prototype.destroy = function () {
        this.dom.remove();
    };
    return SingleGutterView;
}());
var GutterElement = /** @class */ (function () {
    function GutterElement(view, height, above, markers, eltClass) {
        this.height = -1;
        this.above = 0;
        this.dom = document.createElement("div");
        this.update(view, height, above, markers, eltClass);
    }
    GutterElement.prototype.update = function (view, height, above, markers, cssClass) {
        if (this.height != height)
            this.dom.style.height = (this.height = height) + "px";
        if (this.above != above)
            this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
        if (this.markers != markers) {
            this.markers = markers;
            for (var ch = void 0; ch = this.dom.lastChild;)
                ch.remove();
            var cls = cssClass;
            for (var _i = 0, markers_1 = markers; _i < markers_1.length; _i++) {
                var m = markers_1[_i];
                var dom = m.toDOM(view);
                if (dom)
                    this.dom.appendChild(dom);
                var c = m.elementClass;
                if (c)
                    cls += " " + c;
            }
            this.dom.className = cls;
        }
    };
    return GutterElement;
}());
function sameMarkers(a, b) {
    if (a.length != b.length)
        return false;
    for (var i = 0; i < a.length; i++)
        if (!a[i].compare(b[i]))
            return false;
    return true;
}
/// Used to insert markers into the line number gutter.
exports.lineNumberMarkers = state_1.Annotation.define();
var lineNumberConfig = view_1.EditorView.extend.behavior({
    combine: function (values) {
        return extension_1.combineConfig(values, { formatNumber: String, handleDOMEvents: {} }, {
            handleDOMEvents: function (a, b) {
                var result = {};
                for (var event_1 in a)
                    result[event_1] = a[event_1];
                var _loop_2 = function (event_2) {
                    var exists = result[event_2], add = b[event_2];
                    result[event_2] = exists ? function (view, line, event) { return exists(view, line, event) || add(view, line, event); } : add;
                };
                for (var event_2 in b) {
                    _loop_2(event_2);
                }
                return result;
            }
        });
    }
});
var NumberMarker = /** @class */ (function (_super) {
    __extends(NumberMarker, _super);
    function NumberMarker(number) {
        var _this = _super.call(this) || this;
        _this.number = number;
        return _this;
    }
    NumberMarker.prototype.eq = function (other) { return this.number == other.number; };
    NumberMarker.prototype.toDOM = function (view) {
        var config = view.behavior(lineNumberConfig);
        return document.createTextNode(config.formatNumber(this.number));
    };
    return NumberMarker;
}(GutterMarker));
var lineNumberGutter = new Gutter({
    style: "lineNumber",
    updateMarkers: function (markers, update) {
        var ann = update.annotation(exports.lineNumberMarkers);
        if (ann)
            markers = markers.update(ann.add || [], ann.filter || null);
        return markers;
    },
    lineMarker: function (view, line, others) {
        if (others.length)
            return null;
        // FIXME try to make the line number queries cheaper?
        return new NumberMarker(view.state.doc.lineAt(line.from).number);
    },
    initialSpacer: function (view) {
        return new NumberMarker(maxLineNumber(view.state.doc.lines));
    },
    updateSpacer: function (spacer, update) {
        var max = maxLineNumber(update.view.state.doc.lines);
        return max == spacer.number ? spacer : new NumberMarker(max);
    }
});
/// Create a line number gutter extension. The order in which the
/// gutters appear is determined by their extension priority.
function lineNumbers(config) {
    if (config === void 0) { config = {}; }
    return [
        lineNumberConfig(config),
        lineNumberGutter.extension
    ];
}
exports.lineNumbers = lineNumbers;
function maxLineNumber(lines) {
    var last = 9;
    while (last < lines)
        last = last * 10 + 9;
    return last;
}
var baseTheme = view_1.EditorView.theme({
    gutters: {
        background: "#f5f5f5",
        borderRight: "1px solid silver",
        color: "#999",
        display: "flex",
        height: "100%",
        boxSizing: "border-box",
        left: 0
    },
    gutter: {
        display: "flex !important",
        flexDirection: "column",
        flexShrink: 0,
        boxSizing: "border-box",
        height: "100%",
        overflow: "hidden"
    },
    gutterElement: {
        boxSizing: "border-box"
    },
    "gutterElement.lineNumber": {
        padding: "0 3px 0 5px",
        minWidth: "20px",
        textAlign: "right",
        whiteSpace: "nowrap"
    }
});

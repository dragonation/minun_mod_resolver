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
var state_1 = require("../../state/dist/index.js");
var view_1 = require("../../view/dist/index.js");
var extension_1 = require("../../extension/dist/extension.js");
var gutter_1 = require("../../gutter/dist/index.js");
var foldAnnotation = state_1.Annotation.define();
function selectedLines(view) {
    var lines = [];
    var _loop_1 = function (head) {
        if (lines.some(function (l) { return l.from <= head && l.to >= head; }))
            return "continue";
        lines.push(view.lineAt(head));
    };
    for (var _i = 0, _a = view.state.selection.ranges; _i < _a.length; _i++) {
        var head = _a[_i].head;
        _loop_1(head);
    }
    return lines;
}
exports.foldCode = function (view) {
    if (!view.plugin(foldPlugin))
        return false;
    var fold = [];
    var _loop_2 = function (line) {
        var range = view.state.behavior(state_1.EditorState.foldable)
            .reduce(function (value, f) { return value || f(view.state, line.from, line.to); }, null);
        if (range)
            fold.push(range);
    };
    for (var _i = 0, _a = selectedLines(view); _i < _a.length; _i++) {
        var line = _a[_i];
        _loop_2(line);
    }
    if (!fold.length)
        return false;
    view.dispatch(view.state.t().annotate(foldAnnotation({ fold: fold })));
    return true;
};
exports.unfoldCode = function (view) {
    var unfold = [], plugin = view.plugin(foldPlugin);
    if (!plugin)
        return false;
    for (var _i = 0, _a = selectedLines(view); _i < _a.length; _i++) {
        var line = _a[_i];
        var folded = plugin.foldInside(line.from, line.to);
        if (folded)
            unfold.push(folded);
    }
    if (!unfold.length)
        return false;
    view.dispatch(view.state.t().annotate(foldAnnotation({ unfold: unfold })));
    return true;
};
var defaultConfig = {
    placeholderDOM: null,
    placeholderText: "…"
};
var foldConfigBehavior = view_1.EditorView.extend.behavior({
    combine: function (values) { return extension_1.combineConfig(values, defaultConfig); }
});
var foldPlugin = view_1.ViewPlugin.create(function (view) { return new FoldPlugin(view); }).decorations(function (p) { return p.decorations; });
function codeFolding(config) {
    if (config === void 0) { config = {}; }
    return [
        foldConfigBehavior(config),
        foldPlugin.extension,
        view_1.EditorView.extend.fallback(defaultTheme)
    ];
}
exports.codeFolding = codeFolding;
var FoldPlugin = /** @class */ (function () {
    function FoldPlugin(view) {
        this.view = view;
        this.decorations = view_1.Decoration.none;
        var config = view.behavior(foldConfigBehavior);
        this.widgetConfig = { config: config, "class": this.placeholderClass };
    }
    Object.defineProperty(FoldPlugin.prototype, "placeholderClass", {
        get: function () {
            return this.view.cssClass("foldPlaceholder");
        },
        enumerable: true,
        configurable: true
    });
    FoldPlugin.prototype.update = function (update) {
        this.decorations = this.decorations.map(update.changes);
        for (var _i = 0, _a = update.transactions; _i < _a.length; _i++) {
            var tr = _a[_i];
            var ann = tr.annotation(foldAnnotation);
            if (ann)
                this.updateRanges(ann.fold || [], ann.unfold || []);
        }
        // Make sure widgets are redrawn with up-to-date classes
        if (update.themeChanged && this.placeholderClass != this.widgetConfig["class"]) {
            this.widgetConfig = { config: this.widgetConfig.config, "class": this.placeholderClass };
            var deco = [], iter = this.decorations.iter(), next = void 0;
            while (next = iter.next())
                deco.push(view_1.Decoration.replace(next.from, next.to, { widget: new FoldWidget(this.widgetConfig) }));
            this.decorations = view_1.Decoration.set(deco);
        }
    };
    FoldPlugin.prototype.updateRanges = function (add, remove) {
        var _this = this;
        this.decorations = this.decorations.update(add.map(function (_a) {
            var from = _a.from, to = _a.to;
            return view_1.Decoration.replace(from, to, { widget: new FoldWidget(_this.widgetConfig) });
        }), remove.length ? function (from, to) { return !remove.some(function (r) { return r.from == from && r.to == to; }); } : null, remove.reduce(function (m, r) { return Math.min(m, r.from); }, 1e8), remove.reduce(function (m, r) { return Math.max(m, r.to); }, 0));
    };
    FoldPlugin.prototype.foldInside = function (from, to) {
        var found = null;
        this.decorations.between(from, to, function (from, to) { return found = ({ from: from, to: to }); });
        return found;
    };
    return FoldPlugin;
}());
var FoldWidget = /** @class */ (function (_super) {
    __extends(FoldWidget, _super);
    function FoldWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FoldWidget.prototype.ignoreEvents = function () { return false; };
    FoldWidget.prototype.toDOM = function (view) {
        var conf = this.value.config;
        if (conf.placeholderDOM)
            return conf.placeholderDOM();
        var element = document.createElement("span");
        element.textContent = conf.placeholderText;
        // FIXME should this have a role? does it make sense to allow focusing by keyboard?
        element.setAttribute("aria-label", view.phrase("folded code"));
        element.title = view.phrase("unfold");
        element.className = this.value["class"];
        element.onclick = function (event) {
            var line = view.lineAt(view.posAtDOM(event.target));
            var folded = view.plugin(foldPlugin).foldInside(line.from, line.to);
            if (folded)
                view.dispatch(view.state.t().annotate(foldAnnotation({ unfold: [folded] })));
            event.preventDefault();
        };
        return element;
    };
    return FoldWidget;
}(view_1.WidgetType));
var foldGutterDefaults = {
    openText: "⌄",
    closedText: "›"
};
var FoldMarker = /** @class */ (function (_super) {
    __extends(FoldMarker, _super);
    function FoldMarker(config, open) {
        var _this = _super.call(this) || this;
        _this.config = config;
        _this.open = open;
        return _this;
    }
    FoldMarker.prototype.eq = function (other) { return this.config == other.config && this.open == other.open; };
    FoldMarker.prototype.toDOM = function (view) {
        var span = document.createElement("span");
        span.textContent = this.open ? this.config.openText : this.config.closedText;
        span.title = view.phrase(this.open ? "Fold line" : "Unfold line");
        return span;
    };
    return FoldMarker;
}(gutter_1.GutterMarker));
function foldGutter(config) {
    if (config === void 0) { config = {}; }
    var fullConfig = extension_1.fillConfig(config, foldGutterDefaults);
    return [
        new gutter_1.Gutter({
            style: "foldGutter",
            lineMarker: function (view, line) {
                // FIXME optimize this. At least don't run it for updates that
                // don't change anything relevant
                var plugin = view.plugin(foldPlugin);
                var folded = plugin.foldInside(line.from, line.to);
                if (folded)
                    return new FoldMarker(fullConfig, false);
                if (view.state.behavior(state_1.EditorState.foldable).some(function (f) { return f(view.state, line.from, line.to); }))
                    return new FoldMarker(fullConfig, true);
                return null;
            },
            initialSpacer: function () {
                return new FoldMarker(fullConfig, false);
            },
            handleDOMEvents: {
                click: function (view, line) {
                    var plugin = view.plugin(foldPlugin);
                    var folded = plugin.foldInside(line.from, line.to);
                    if (folded) {
                        view.dispatch(view.state.t().annotate(foldAnnotation({ unfold: [folded] })));
                        return true;
                    }
                    var range = view.state.behavior(state_1.EditorState.foldable)
                        .reduce(function (value, f) { return value || f(view.state, line.from, line.to); }, null);
                    if (range) {
                        view.dispatch(view.state.t().annotate(foldAnnotation({ fold: [range] })));
                        return true;
                    }
                    return false;
                }
            }
        }).extension,
        codeFolding()
    ];
}
exports.foldGutter = foldGutter;
var defaultTheme = view_1.EditorView.theme({
    foldPlaceholder: {
        background: "#eee",
        border: "1px solid silver",
        color: "#888",
        borderRadius: ".2em",
        margin: "0 1px",
        padding: "0 1px",
        cursor: "pointer"
    },
    "gutterElement.foldGutter": {
        padding: "0 1px",
        cursor: "pointer"
    }
});

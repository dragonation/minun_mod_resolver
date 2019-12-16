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
var view_1 = require("../../view/dist/index.js");
var extension_1 = require("../../extension/dist/extension.js");
var text_1 = require("../../text/dist/index.js");
var style_mod_1 = require("../../3rd-parties/style-mod.js");
var SPECIALS = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/gu;
var NAMES = {
    0: "null",
    7: "bell",
    8: "backspace",
    10: "newline",
    11: "vertical tab",
    13: "carriage return",
    27: "escape",
    8203: "zero width space",
    8204: "zero width non-joiner",
    8205: "zero width joiner",
    8206: "left-to-right mark",
    8207: "right-to-left mark",
    8232: "line separator",
    8233: "paragraph separator",
    65279: "zero width no-break space",
    65532: "object replacement"
};
var specialCharConfig = view_1.EditorView.extend.behavior({
    combine: function (configs) {
        // FIXME make configurations compose properly
        var config = extension_1.combineConfig(configs, {
            render: null,
            specialChars: SPECIALS,
            addSpecialChars: null
        });
        var styles = document.body.style;
        config.replaceTabs = (styles.tabSize || styles.MozTabSize) == null;
        if (config.replaceTabs)
            config.specialChars = new RegExp("\t|" + config.specialChars.source, "gu");
        if (config.addSpecialChars)
            config.specialChars = new RegExp(config.specialChars.source + "|" + config.addSpecialChars.source, "gu");
        return config;
    }
});
var specialCharPlugin = view_1.ViewPlugin.create(function (view) { return new SpecialCharPlugin(view); })
    .decorations(function (plugin) { return plugin.decorations; });
/// Returns an extension that installs highlighting of special
/// characters.
function specialChars(config) {
    if (config === void 0) { config = {}; }
    return [specialCharConfig(config), specialCharPlugin.extension, styleExt];
}
exports.specialChars = specialChars;
var JOIN_GAP = 10;
var SpecialCharPlugin = /** @class */ (function () {
    function SpecialCharPlugin(view) {
        this.view = view;
        this.from = 0;
        this.to = 0;
        this.decorations = view_1.Decoration.none;
        this.updateForViewport();
    }
    SpecialCharPlugin.prototype.update = function (update) {
        if (update.changes.length) {
            this.decorations = this.decorations.map(update.changes);
            this.from = update.changes.mapPos(this.from, 1);
            this.to = update.changes.mapPos(this.to, -1);
            this.closeHoles(update.changes.changedRanges());
        }
        this.updateForViewport();
    };
    SpecialCharPlugin.prototype.closeHoles = function (ranges) {
        var decorations = [], vp = this.view.viewport, replaced = [];
        var config = this.view.behavior(specialCharConfig);
        for (var i = 0; i < ranges.length; i++) {
            var _a = ranges[i], from = _a.fromB, to = _a.toB;
            // Must redraw all tabs further on the line
            if (config.replaceTabs)
                to = this.view.state.doc.lineAt(to).end;
            while (i < ranges.length - 1 && ranges[i + 1].fromB < to + JOIN_GAP)
                to = Math.max(to, ranges[++i].toB);
            // Clip to current viewport, to avoid doing work for invisible text
            from = Math.max(vp.from, from);
            to = Math.min(vp.to, to);
            if (from >= to)
                continue;
            this.getDecorationsFor(from, to, decorations);
            replaced.push(from, to);
        }
        if (decorations.length)
            this.decorations = this.decorations.update(decorations, function (pos) {
                for (var i = 0; i < replaced.length; i += 2)
                    if (pos >= replaced[i] && pos < replaced[i + 1])
                        return false;
                return true;
            }, replaced[0], replaced[replaced.length - 1]);
    };
    SpecialCharPlugin.prototype.updateForViewport = function () {
        var vp = this.view.viewport;
        // Viewports match, don't do anything
        if (this.from == vp.from && this.to == vp.to)
            return;
        var decorations = [];
        if (this.from >= vp.to || this.to <= vp.from) {
            this.getDecorationsFor(vp.from, vp.to, decorations);
            this.decorations = view_1.Decoration.set(decorations);
        }
        else {
            if (vp.from < this.from)
                this.getDecorationsFor(vp.from, this.from, decorations);
            if (this.to < vp.to)
                this.getDecorationsFor(this.to, vp.to, decorations);
            this.decorations = this.decorations.update(decorations, function (from, to) { return from >= vp.from && to <= vp.to; });
        }
        this.from = vp.from;
        this.to = vp.to;
    };
    SpecialCharPlugin.prototype.getDecorationsFor = function (from, to, target) {
        var config = this.view.behavior(specialCharConfig);
        var doc = this.view.state.doc;
        for (var pos = from, cursor = doc.iterRange(from, to), m = void 0; !cursor.next().done;) {
            if (!cursor.lineBreak) {
                while (m = config.specialChars.exec(cursor.value)) {
                    var code = m[0].codePointAt ? m[0].codePointAt(0) : m[0].charCodeAt(0), widget = void 0;
                    if (code == null)
                        continue;
                    if (code == 9) {
                        var line = doc.lineAt(pos + m.index);
                        var size = this.view.state.tabSize, col = text_1.countColumn(doc.slice(line.start, pos + m.index), 0, size);
                        widget = new TabWidget((size - (col % size)) * this.view.defaultCharacterWidth);
                    }
                    else {
                        widget = new SpecialCharWidget(config, code);
                    }
                    target.push(view_1.Decoration.replace(pos + m.index, pos + m.index + m[0].length, { widget: widget }));
                }
            }
            pos += cursor.value.length;
        }
    };
    return SpecialCharPlugin;
}());
// Assigns placeholder characters from the Control Pictures block to
// ASCII control characters
function placeHolder(code) {
    if (code >= 32)
        return null;
    if (code == 10)
        return "\u2424";
    return String.fromCharCode(9216 + code);
}
var DEFAULT_PLACEHOLDER = "\u2022";
var SpecialCharWidget = /** @class */ (function (_super) {
    __extends(SpecialCharWidget, _super);
    function SpecialCharWidget(options, code) {
        var _this = _super.call(this, code) || this;
        _this.options = options;
        return _this;
    }
    SpecialCharWidget.prototype.toDOM = function () {
        var ph = placeHolder(this.value) || DEFAULT_PLACEHOLDER;
        var desc = "Control character " + (NAMES[this.value] || this.value);
        var custom = this.options.render && this.options.render(this.value, desc, ph);
        if (custom)
            return custom;
        var span = document.createElement("span");
        span.textContent = ph;
        span.title = desc;
        span.setAttribute("aria-label", desc);
        span.style.color = "red";
        return span;
    };
    SpecialCharWidget.prototype.ignoreEvent = function () { return false; };
    return SpecialCharWidget;
}(view_1.WidgetType));
var TabWidget = /** @class */ (function (_super) {
    __extends(TabWidget, _super);
    function TabWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TabWidget.prototype.toDOM = function () {
        var span = document.createElement("span");
        span.textContent = "\t";
        span.className = style.tab;
        span.style.width = this.value + "px";
        return span;
    };
    TabWidget.prototype.ignoreEvent = function () { return false; };
    return TabWidget;
}(view_1.WidgetType));
var style = new style_mod_1.StyleModule({
    tab: {
        display: "inline-block",
        overflow: "hidden",
        verticalAlign: "bottom"
    }
});
var styleExt = view_1.EditorView.styleModule(style);

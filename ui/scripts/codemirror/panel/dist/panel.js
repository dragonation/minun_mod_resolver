"use strict";
exports.__esModule = true;
var view_1 = require("../../view/dist/index.js");
/// Enables the panel-managing extension.
function panels() {
    // FIXME indirection to work around plugin ordering issues
    return view_1.EditorView.extend.fallback(panelExt);
}
exports.panels = panels;
var defaultTheme = view_1.EditorView.theme({
    panels: {
        background: "#f5f5f5",
        boxSizing: "border-box",
        position: "sticky",
        left: 0,
        right: 0
    },
    "panels.top": {
        borderBottom: "1px solid silver"
    },
    "panels.bottom": {
        borderTop: "1px solid silver"
    }
});
/// Opening a panel is done by providing an object describing the
/// panel through this behavior.
exports.openPanel = view_1.EditorView.extend.behavior({
    combine: function (specs) {
        var top = [], bottom = [];
        for (var _i = 0, specs_1 = specs; _i < specs_1.length; _i++) {
            var spec = specs_1[_i];
            if (spec)
                (spec.top ? top : bottom).push(spec);
        }
        return { top: top.sort(function (a, b) { return (a.pos || 0) - (b.pos || 0); }),
            bottom: bottom.sort(function (a, b) { return (a.pos || 0) - (b.pos || 0); }) };
    }
});
var panelPlugin = view_1.ViewPlugin.create(function (view) { return new Panels(view); }).behavior(view_1.EditorView.scrollMargins, function (p) { return p.scrollMargins(); });
var panelExt = [panelPlugin.extension, view_1.EditorView.extend.fallback(defaultTheme)];
var Panels = /** @class */ (function () {
    function Panels(view) {
        this.themeChanged = false;
        var _a = view.behavior(exports.openPanel), top = _a.top, bottom = _a.bottom;
        this.top = new PanelGroup(view, true, top);
        this.bottom = new PanelGroup(view, false, bottom);
    }
    Panels.prototype.update = function (update) {
        var _a = update.view.behavior(exports.openPanel), top = _a.top, bottom = _a.bottom;
        this.top.update(top);
        this.bottom.update(bottom);
        if (update.themeChanged)
            this.themeChanged = true;
    };
    Panels.prototype.draw = function () {
        this.top.draw(this.themeChanged);
        this.bottom.draw(this.themeChanged);
        this.themeChanged = false;
    };
    Panels.prototype.scrollMargins = function () {
        return { top: this.top.scrollMargin(), bottom: this.bottom.scrollMargin() };
    };
    return Panels;
}());
var Panel = /** @class */ (function () {
    function Panel(view, spec) {
        this.dom = spec.dom;
        this.style = spec.style || "";
        this.baseClass = spec.dom.className;
        this.setTheme(view);
    }
    Panel.prototype.setTheme = function (view) {
        this.dom.className = this.baseClass + " " + view.cssClass("panel" + (this.style ? "." + this.style : ""));
    };
    return Panel;
}());
var PanelGroup = /** @class */ (function () {
    function PanelGroup(view, top, specs) {
        this.view = view;
        this.top = top;
        this.specs = specs;
        this.dom = null;
        this.floating = false;
        this.panels = specs.map(function (s) { return new Panel(view, s); });
        this.needsSync = this.panels.length > 0;
    }
    PanelGroup.prototype.update = function (specs) {
        var _this = this;
        if (specs != this.specs) {
            this.panels = specs.map(function (s) { return new Panel(_this.view, s); });
            this.specs = specs;
            this.needsSync = true;
        }
    };
    PanelGroup.prototype.syncDOM = function () {
        if (this.panels.length == 0) {
            if (this.dom) {
                this.dom.remove();
                this.dom = null;
            }
            return;
        }
        if (!this.dom) {
            this.dom = document.createElement("div");
            this.dom.className = this.view.cssClass(this.top ? "panels.top" : "panels.bottom");
            this.dom.style[this.top ? "top" : "bottom"] = "0";
            this.view.dom.insertBefore(this.dom, this.top ? this.view.dom.firstChild : null);
        }
        var curDOM = this.dom.firstChild;
        for (var _i = 0, _a = this.panels; _i < _a.length; _i++) {
            var panel = _a[_i];
            if (panel.dom.parentNode == this.dom) {
                while (curDOM != panel.dom)
                    curDOM = rm(curDOM);
                curDOM = curDOM.nextSibling;
            }
            else {
                this.dom.insertBefore(panel.dom, curDOM);
            }
        }
        while (curDOM)
            curDOM = rm(curDOM);
    };
    PanelGroup.prototype.draw = function (themeChanged) {
        if (this.needsSync) {
            this.syncDOM();
            this.needsSync = false;
        }
        if (themeChanged && this.dom) {
            this.dom.className = this.view.cssClass(this.top ? "panels.top" : "panels.bottom");
            for (var _i = 0, _a = this.panels; _i < _a.length; _i++) {
                var panel = _a[_i];
                panel.setTheme(this.view);
            }
        }
    };
    PanelGroup.prototype.scrollMargin = function () {
        return !this.dom ? 0 : Math.max(0, this.top
            ? this.dom.getBoundingClientRect().bottom - this.view.scrollDOM.getBoundingClientRect().top
            : this.view.scrollDOM.getBoundingClientRect().bottom - this.dom.getBoundingClientRect().top);
    };
    return PanelGroup;
}());
function rm(node) {
    var next = node.nextSibling;
    node.remove();
    return next;
}

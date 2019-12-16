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
var state_1 = require("../../state/dist/index.js");
var tooltip_1 = require("../../tooltip/dist/tooltip.js");
var panel_1 = require("../../panel/dist/panel.js");
/// Transaction annotation that is used to update the current set of
/// diagnostics.
exports.setDiagnostics = state_1.Annotation.define();
/// Returns an extension that enables the linting functionality.
/// Implicitly enabled by the [`linter`](#lint.linter) function.
function linting() {
    return lintExtension;
}
exports.linting = linting;
var lintPanel = state_1.Annotation.define();
/// Command to open and focus the lint panel.
exports.openLintPanel = function (view) {
    var plugin = view.plugin(lintPlugin);
    if (!plugin)
        return false;
    if (!plugin.panel)
        view.dispatch(view.state.t().annotate(lintPanel(true)));
    if (plugin.panel)
        plugin.panel.list.focus();
    return true;
};
/// Command to close the lint panel, when open.
exports.closeLintPanel = function (view) {
    var plugin = view.plugin(lintPlugin);
    if (!plugin || !plugin.panel)
        return false;
    view.dispatch(view.state.t().annotate(lintPanel(false)));
    return true;
};
var LintDelay = 500;
/// Given a diagnostic source, this function returns an extension that
/// enables linting with that source. It will be called whenever the
/// editor is idle (after its content changed).
function linter(source) {
    return [
        view_1.ViewPlugin.create(function (view) {
            var lintTime = Date.now() + LintDelay, set = true;
            function run() {
                var now = Date.now();
                if (now < lintTime - 10)
                    return setTimeout(run, lintTime - now);
                set = false;
                view.dispatch(view.state.t().annotate(exports.setDiagnostics(source(view))));
            }
            setTimeout(run, LintDelay);
            return {
                update: function (update) {
                    if (update.docChanged) {
                        lintTime = Date.now() + LintDelay;
                        if (!set) {
                            set = true;
                            setTimeout(run, LintDelay);
                        }
                    }
                }
            };
        }).extension,
        linting()
    ];
}
exports.linter = linter;
var LintPlugin = /** @class */ (function () {
    function LintPlugin(view) {
        this.view = view;
        this.diagnostics = view_1.Decoration.none;
        this.panel = null;
    }
    LintPlugin.prototype.update = function (update) {
        var _this = this;
        var diagnostics = update.annotation(exports.setDiagnostics);
        if (diagnostics) {
            this.diagnostics = view_1.Decoration.set(diagnostics.map(function (d) {
                return d.from < d.to
                    ? view_1.Decoration.mark(d.from, d.to, {
                        attributes: { "class": _this.view.cssClass("diagnosticRange." + d.severity) },
                        diagnostic: d
                    })
                    : view_1.Decoration.widget(d.from, {
                        widget: new DiagnosticWidget(d),
                        diagnostic: d
                    });
            }));
            if (this.panel)
                this.panel.update(this.diagnostics);
        }
        else if (update.docChanged) {
            this.diagnostics = this.diagnostics.map(update.changes);
            if (this.panel)
                this.panel.update(this.diagnostics);
        }
        var panel = update.annotation(lintPanel);
        if (panel != null)
            this.panel = panel ? new LintPanel(this, this.diagnostics) : null;
    };
    LintPlugin.prototype.draw = function () {
        if (this.panel)
            this.panel.draw();
    };
    Object.defineProperty(LintPlugin.prototype, "activeDiagnostic", {
        get: function () {
            return this.panel ? this.panel.activeDiagnostic : view_1.Decoration.none;
        },
        enumerable: true,
        configurable: true
    });
    LintPlugin.prototype.hoverTooltip = function (view, check) {
        var found = [], stackStart = 2e8, stackEnd = 0;
        this.diagnostics.between(0, view.state.doc.length, function (start, end, _a) {
            var spec = _a.spec;
            if (check(start, end)) {
                found.push(spec.diagnostic);
                stackStart = Math.min(start, stackStart);
                stackEnd = Math.max(end, stackEnd);
            }
        });
        return found.length ? {
            pos: stackStart, end: stackEnd,
            dom: this.renderTooltip(found),
            style: "lint",
            hideOnChange: true
        } : null;
    };
    LintPlugin.prototype.renderTooltip = function (diagnostics) {
        var dom = document.createElement("ul");
        for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
            var d = diagnostics_1[_i];
            dom.appendChild(renderDiagnostic(this.view, d));
        }
        return dom;
    };
    LintPlugin.prototype.findDiagnostic = function (diagnostic) {
        var found = null;
        this.diagnostics.between(0, this.view.state.doc.length, function (from, to, _a) {
            var spec = _a.spec;
            if (spec.diagnostic == diagnostic)
                found = { from: from, to: to };
        });
        return found;
    };
    return LintPlugin;
}());
function renderDiagnostic(view, diagnostic) {
    var dom = document.createElement("li");
    dom.textContent = diagnostic.message;
    dom.className = view.cssClass("diagnostic." + diagnostic.severity);
    if (diagnostic.actions) {
        var _loop_1 = function (action) {
            var button = dom.appendChild(document.createElement("button"));
            button.className = view.cssClass("diagnosticAction");
            button.textContent = action.name;
            button.onclick = button.onmousedown = function (e) {
                e.preventDefault();
                var plugin = view.plugin(lintPlugin);
                var found = plugin && plugin.findDiagnostic(diagnostic);
                if (found)
                    action.apply(view, found.from, found.to);
            };
        };
        for (var _i = 0, _a = diagnostic.actions; _i < _a.length; _i++) {
            var action = _a[_i];
            _loop_1(action);
        }
    }
    // FIXME render source?
    return dom;
}
var DiagnosticWidget = /** @class */ (function (_super) {
    __extends(DiagnosticWidget, _super);
    function DiagnosticWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DiagnosticWidget.prototype.toDOM = function (view) {
        var elt = document.createElement("span");
        elt.className = view.cssClass("lintPoint." + this.value.severity);
        return elt;
    };
    return DiagnosticWidget;
}(view_1.WidgetType));
var PanelItem = /** @class */ (function () {
    function PanelItem(view, diagnostic) {
        this.diagnostic = diagnostic;
        this.id = "item_" + Math.floor(Math.random() * 0xffffffff).toString(16);
        this.dom = renderDiagnostic(view, diagnostic);
        this.dom.setAttribute("role", "option");
    }
    return PanelItem;
}());
var LintPanel = /** @class */ (function () {
    function LintPanel(parent, diagnostics) {
        var _this = this;
        this.parent = parent;
        this.diagnostics = diagnostics;
        this.style = "lint";
        this.needsSync = true;
        this.items = [];
        this.selectedItem = -1;
        this.dom = document.createElement("div");
        this.list = this.dom.appendChild(document.createElement("ul"));
        this.list.tabIndex = 0;
        this.list.setAttribute("role", "listbox");
        this.list.setAttribute("aria-label", this.view.phrase("Diagnostics"));
        this.list.addEventListener("keydown", function (event) {
            if (event.keyCode == 27) { // Escape
                event.preventDefault();
                exports.closeLintPanel(_this.view);
                _this.view.focus();
            }
            else if (event.keyCode == 38) { // ArrowUp
                event.preventDefault();
                _this.moveSelection((_this.selectedItem - 1 + _this.items.length) % _this.items.length);
            }
            else if (event.keyCode == 40) { // ArrowDown
                event.preventDefault();
                _this.moveSelection((_this.selectedItem + 1) % _this.items.length);
            }
            else if (event.keyCode == 36) { // Home
                event.preventDefault();
                _this.moveSelection(0);
            }
            else if (event.keyCode == 35) { // End
                event.preventDefault();
                _this.moveSelection(_this.items.length - 1);
            }
            else if (event.keyCode == 13) {
                event.preventDefault();
                _this.view.focus();
            } // FIXME PageDown/PageUp
        });
        this.list.addEventListener("click", function (event) {
            for (var i = 0; i < _this.items.length; i++) {
                if (_this.items[i].dom.contains(event.target))
                    _this.moveSelection(i);
            }
        });
        var close = this.dom.appendChild(document.createElement("button"));
        close.setAttribute("name", "close");
        close.setAttribute("aria-label", this.view.phrase("close"));
        close.textContent = "×";
        close.addEventListener("click", function () { return exports.closeLintPanel(_this.view); });
        this.update(diagnostics);
    }
    Object.defineProperty(LintPanel.prototype, "view", {
        get: function () { return this.parent.view; },
        enumerable: true,
        configurable: true
    });
    LintPanel.prototype.update = function (diagnostics) {
        var _this = this;
        var i = 0;
        this.diagnostics.between(0, this.view.state.doc.length, function (start, end, _a) {
            var spec = _a.spec;
            var found = -1;
            for (var j = i; j < _this.items.length; j++)
                if (_this.items[j].diagnostic == spec.diagnostic) {
                    found = j;
                    break;
                }
            if (found < 0) {
                _this.items.splice(i, 0, new PanelItem(_this.view, spec.diagnostic));
            }
            else {
                if (_this.selectedItem >= i && _this.selectedItem < found)
                    _this.selectedItem = i;
                if (found > i)
                    _this.items.splice(i, found - i);
                _this.needsSync = true;
            }
            i++;
        });
        while (i < this.items.length)
            this.items.pop();
        if (this.selectedItem >= i || this.selectedItem < 0)
            this.selectedItem = i ? 0 : -1;
    };
    LintPanel.prototype.draw = function () {
        if (!this.needsSync)
            return;
        this.needsSync = false;
        this.sync();
    };
    LintPanel.prototype.sync = function () {
        var domPos = this.list.firstChild;
        function rm() {
            var prev = domPos;
            domPos = prev.nextSibling;
            prev.remove();
        }
        for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
            var item = _a[_i];
            if (item.dom.parentNode == this.list) {
                while (domPos != item.dom)
                    rm();
                domPos = item.dom.nextSibling;
            }
            else {
                this.list.insertBefore(item.dom, domPos);
            }
        }
        while (domPos)
            rm();
        if (!this.list.firstChild)
            this.list.appendChild(renderDiagnostic(this.view, {
                severity: "info",
                message: this.view.phrase("No diagnostics")
            }));
        this.syncSelection();
    };
    LintPanel.prototype.moveSelection = function (selectedItem) {
        // FIXME make actions accessible
        if (this.items.length == 0)
            return;
        this.selectedItem = selectedItem;
        this.syncSelection();
        var selected = this.items[this.selectedItem];
        var selRect = selected.dom.getBoundingClientRect(), panelRect = this.list.getBoundingClientRect();
        if (selRect.top < panelRect.top)
            this.list.scrollTop -= panelRect.top - selRect.top;
        else if (selRect.bottom > panelRect.bottom)
            this.list.scrollTop += selRect.bottom - panelRect.bottom;
        var found = this.parent.findDiagnostic(selected.diagnostic);
        if (found)
            this.view.dispatch(this.view.state.t().setSelection(state_1.EditorSelection.single(found.from, found.to)).scrollIntoView());
    };
    LintPanel.prototype.syncSelection = function () {
        var current = this.list.querySelector("[aria-selected]");
        var selected = this.items[this.selectedItem];
        if (current == (selected && selected.dom))
            return;
        if (current)
            current.removeAttribute("aria-selected");
        if (selected)
            selected.dom.setAttribute("aria-selected", "true");
        this.list.setAttribute("aria-activedescendant", selected ? selected.id : "");
    };
    Object.defineProperty(LintPanel.prototype, "activeDiagnostic", {
        get: function () {
            var found = this.selectedItem < 0 ? null : this.parent.findDiagnostic(this.items[this.selectedItem].diagnostic);
            return found && found.to > found.from
                ? view_1.Decoration.set(view_1.Decoration.mark(found.from, found.to, { "class": this.view.cssClass("lintRange.active") }))
                : view_1.Decoration.none;
        },
        enumerable: true,
        configurable: true
    });
    return LintPanel;
}());
function underline(color) {
    var svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"6\" height=\"3\">\n    <path d=\"m0 3 l2 -2 l1 0 l2 2 l1 0\" stroke=\"" + color + "\" fill=\"none\" stroke-width=\".7\"/>\n  </svg>";
    return "url('data:image/svg+xml;base64," + btoa(svg) + "')";
}
var defaultTheme = view_1.EditorView.theme({
    diagnostic: {
        padding: "3px 6px 3px 8px",
        marginLeft: "-1px",
        display: "block"
    },
    "diagnostic.error": { borderLeft: "5px solid #d11" },
    "diagnostic.warning": { borderLeft: "5px solid orange" },
    "diagnostic.info": { borderLeft: "5px solid #999" },
    diagnosticAction: {
        font: "inherit",
        border: "none",
        padding: "2px 4px",
        background: "#444",
        color: "white",
        borderRadius: "3px",
        marginLeft: "8px"
    },
    lintRange: {
        backgroundPosition: "left bottom",
        backgroundRepeat: "repeat-x"
    },
    "lintRange.error": { backgroundImage: underline("#d11") },
    "lintRange.warning": { backgroundImage: underline("orange") },
    "lintRange.info": { backgroundImage: underline("#999") },
    "lintRange.active": { backgroundColor: "#fec" },
    lintPoint: {
        position: "relative",
        "&:after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: "-2px",
            borderLeft: "3px solid transparent",
            borderRight: "3px solid transparent",
            borderBottom: "4px solid #d11"
        }
    },
    "lintPoint.warning": {
        "&:after": { borderBottomColor: "orange" }
    },
    "lintPoint.info": {
        "&:after": { borderBottomColor: "#999" }
    },
    "panel.lint": {
        position: "relative",
        "& ul": {
            maxHeight: "100px",
            overflowY: "auto",
            "& [aria-selected]": {
                background: "#ddd"
            },
            "&:focus [aria-selected]": {
                background_fallback: "#bdf",
                background: "Highlight",
                color_fallback: "white",
                color: "HighlightText"
            },
            padding: 0,
            margin: 0
        },
        "& [name=close]": {
            position: "absolute",
            top: "0",
            right: "2px",
            background: "inherit",
            border: "none",
            font: "inherit",
            padding: 0,
            margin: 0
        }
    },
    "tooltip.lint": {
        padding: 0,
        margin: 0
    }
});
var lintPlugin = view_1.ViewPlugin.create(function (view) { return new LintPlugin(view); })
    .decorations(function (p) { return p.diagnostics; })
    .decorations(function (p) { return p.activeDiagnostic; })
    .behavior(panel_1.openPanel, function (p) { return p.panel; });
var lintExtension = [
    lintPlugin.extension,
    tooltip_1.hoverTooltip(function (view, check) { return view.plugin(lintPlugin).hoverTooltip(view, check); }),
    panel_1.panels(),
    defaultTheme
];

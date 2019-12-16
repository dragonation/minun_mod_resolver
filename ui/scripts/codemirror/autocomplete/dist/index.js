"use strict";
exports.__esModule = true;
var view_1 = require("../../view/dist/index.js");
var state_1 = require("../../state/dist/index.js");
var extension_1 = require("../../extension/dist/extension.js");
var keymap_1 = require("../../keymap/dist/keymap.js");
var tooltip_1 = require("../../tooltip/dist/tooltip.js");
function completeFromSyntax(state, pos) {
    var syntax = state.behavior(state_1.EditorState.syntax);
    if (syntax.length == 0)
        return null;
    var completeAt = syntax[0].languageDataAt(state, pos).completeAt;
    return completeAt ? completeAt(state, pos) : null;
}
exports.completeFromSyntax = completeFromSyntax;
function sortAndFilterCompletion(substr, items) {
    var startMatch = [], inMatch = [];
    for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
        var item = items_1[_i];
        if (item.label == substr)
            continue;
        // FIXME: separate key
        else if (item.label.startsWith(substr))
            startMatch.push(item);
        else if (item.label.includes(substr))
            inMatch.push(item);
    }
    return startMatch.concat(inMatch);
}
exports.sortAndFilterCompletion = sortAndFilterCompletion;
var autocompleteConfig = view_1.EditorView.extend.behavior({
    combine: function (configs) {
        return extension_1.combineConfig(configs, {
            completeAt: function (state, pos) {
                return completeFromSyntax(state, pos) || { start: pos, items: [] };
            }
        });
    }
});
function autocomplete(config) {
    if (config === void 0) { config = {}; }
    var autocompletePlugin = view_1.ViewPlugin.create(function (view) { return new Autocomplete(view); })
        .behavior(tooltip_1.showTooltip, function (p) { return p.tooltip; });
    return [
        autocompleteConfig(config),
        autocompletePlugin.extension,
        view_1.EditorView.extend.fallback(style),
        tooltip_1.tooltips(),
        keymap_1.keymap({
            ArrowDown: function (view) {
                var autocomplete = view.plugin(autocompletePlugin);
                return autocomplete ? autocomplete.moveSelection(1) : false;
            },
            ArrowUp: function (view) {
                var autocomplete = view.plugin(autocompletePlugin);
                return autocomplete ? autocomplete.moveSelection(-1) : false;
            },
            Enter: function (view) {
                var autocomplete = view.plugin(autocompletePlugin);
                return autocomplete ? autocomplete.accept() : false;
            }
        }),
    ];
}
exports.autocomplete = autocomplete;
var moveSelection = state_1.Annotation.define();
var AutocompletionState = /** @class */ (function () {
    function AutocompletionState(start, end, items, tooltip, _selected) {
        if (_selected === void 0) { _selected = null; }
        this.start = start;
        this.end = end;
        this.items = items;
        this.tooltip = tooltip;
        this._selected = _selected;
    }
    Object.defineProperty(AutocompletionState.prototype, "selected", {
        get: function () { return this._selected !== null ? this._selected : 0; },
        enumerable: true,
        configurable: true
    });
    AutocompletionState.prototype.accept = function (view, i) {
        if (i === void 0) { i = this.selected; }
        var item = this.items[i];
        var text = item.insertText || item.label;
        view.dispatch(view.state.t().replace(this.start, this.end, text).setSelection(state_1.EditorSelection.single(this.start + text.length)));
        view.focus();
    };
    AutocompletionState.prototype.update = function (newStart, newEnd, newItems, newTooltip) {
        var selected = null;
        if (this._selected !== null) {
            var target = this.items[this._selected].label;
            var i = 0;
            for (; i < newItems.length; ++i) {
                if (newItems[i].label == target)
                    break;
            }
            if (i < newItems.length)
                selected = i;
        }
        return new AutocompletionState(newStart, newEnd, newItems, newTooltip, selected);
    };
    AutocompletionState.prototype.moveSelection = function (dir) {
        var next = this.selected + dir;
        if (dir == 1 && next > this.items.length - 1)
            next = 0;
        else if (dir == -1 && next < 0)
            next = this.items.length - 1;
        return new AutocompletionState(this.start, this.end, this.items, this.tooltip, next);
    };
    AutocompletionState.fromOrNew = function (oldState, start, end, items, tooltip) {
        return oldState ? oldState.update(start, end, items, tooltip) : new AutocompletionState(start, end, items, tooltip);
    };
    return AutocompletionState;
}());
var Autocomplete = /** @class */ (function () {
    function Autocomplete(view) {
        this.view = view;
        this._state = null;
        this.config = view.behavior(autocompleteConfig);
        this.dom = document.createElement("div");
        var ul = document.createElement("ul");
        ul.setAttribute("role", "listbox");
        this.dom.appendChild(ul);
    }
    Object.defineProperty(Autocomplete.prototype, "tooltip", {
        get: function () { return this._state && this._state.tooltip; },
        enumerable: true,
        configurable: true
    });
    Autocomplete.prototype.update = function (update) {
        var _this = this;
        var selectionMoved = update.annotation(moveSelection);
        if (selectionMoved) {
            if (!this._state)
                return;
            var ul = this.dom.firstChild;
            ul.children[this._state.selected].className = "";
            this._state = this._state.moveSelection(selectionMoved);
            var li = ul.children[this._state.selected];
            li.className = "selected";
            scrollIntoView(this.dom, li);
            return;
        }
        if (!update.docChanged) {
            if (update.transactions.some(function (tr) { return tr.selectionSet; }))
                this._state = null;
            return;
        }
        var source = update.annotation(state_1.Transaction.userEvent);
        if (source != "keyboard" && typeof source != "undefined") {
            this._state = null;
            return;
        }
        var end = update.state.selection.primary.anchor;
        var result = this.config.completeAt(this.view.state, end);
        if ("then" in result) {
            result.then(function (res) {
                if (!result.canceled)
                    _this.handleResult(res, end);
            });
            this.view.waitFor(result);
        }
        else
            this.handleResult(result, end);
    };
    Autocomplete.prototype.handleResult = function (_a, end) {
        var items = _a.items, start = _a.start;
        if (items.length == 0) {
            this._state = null;
            return;
        }
        var tooltip = { dom: this.dom, pos: start, style: "autocomplete" };
        this._state = AutocompletionState.fromOrNew(this._state, start, end, items, tooltip);
        this.updateList();
    };
    Autocomplete.prototype.moveSelection = function (dir) {
        if (!this._state)
            return false;
        this.view.dispatch(this.view.state.t().annotate(moveSelection(dir)));
        return true;
    };
    Autocomplete.prototype.accept = function () {
        if (!this._state)
            return false;
        this._state.accept(this.view);
        return true;
    };
    Autocomplete.prototype.updateList = function () {
        var _this = this;
        var ul = this.dom.firstChild;
        while (ul.lastChild)
            ul.lastChild.remove();
        var _loop_1 = function (i, v) {
            var li = document.createElement("li");
            li.innerText = v.label;
            li.setAttribute("role", "option");
            if (i === this_1._state.selected)
                li.className = "selected";
            li.addEventListener("click", function (e) { return _this._state.accept(_this.view, i); });
            ul.appendChild(li);
        };
        var this_1 = this;
        for (var _i = 0, _a = this._state.items.entries(); _i < _a.length; _i++) {
            var _b = _a[_i], i = _b[0], v = _b[1];
            _loop_1(i, v);
        }
    };
    Autocomplete.prototype.destroy = function () {
        this.dom = null;
        this._state = null;
    };
    return Autocomplete;
}());
function scrollIntoView(container, element) {
    var parent = container.getBoundingClientRect();
    var self = element.getBoundingClientRect();
    if (self.top < parent.top)
        container.scrollTop -= parent.top - self.top;
    else if (self.bottom > parent.bottom)
        container.scrollTop += self.bottom - parent.bottom;
}
var style = view_1.EditorView.theme({
    "tooltip.autocomplete": {
        fontFamily: "monospace",
        margin: "-2px 0px 0px -2px",
        maxHeight: "10em",
        overflowY: "auto",
        "& > ul": {
            listStyle: "none",
            margin: 0,
            padding: 0,
            "& > li": {
                paddingRight: "1em",
                cursor: "pointer"
            },
            "& > li.selected": {
                backgroundColor: "lightblue"
            }
        }
    }
});

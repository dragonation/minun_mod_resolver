"use strict";
exports.__esModule = true;
var view_1 = require("../../view/dist/index.js");
var state_1 = require("../../state/dist/index.js");
var panel_1 = require("../../panel/dist/panel.js");
var keymap_1 = require("../../keymap/dist/keymap.js");
var text_1 = require("../../text/dist/index.js");
var cursor_1 = require("./cursor.js");
exports.SearchCursor = cursor_1.SearchCursor;
var Query = /** @class */ (function () {
    function Query(search, replace, caseInsensitive) {
        this.search = search;
        this.replace = replace;
        this.caseInsensitive = caseInsensitive;
    }
    Query.prototype.eq = function (other) {
        return this.search == other.search && this.replace == other.replace && this.caseInsensitive == other.caseInsensitive;
    };
    Query.prototype.cursor = function (doc, from, to) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = doc.length; }
        return new cursor_1.SearchCursor(doc, this.search, from, to, this.caseInsensitive ? function (x) { return x.toLowerCase(); } : undefined);
    };
    Object.defineProperty(Query.prototype, "valid", {
        get: function () { return !!this.search; },
        enumerable: true,
        configurable: true
    });
    return Query;
}());
var searchPlugin = view_1.ViewPlugin.create(function (view) { return new SearchPlugin(view); })
    .decorations(function (p) { return p.decorations; })
    .behavior(panel_1.openPanel, function (p) { return p.panel; });
var searchAnnotation = state_1.Annotation.define();
var SearchPlugin = /** @class */ (function () {
    function SearchPlugin(view) {
        this.view = view;
        this.panel = null;
        this.query = new Query("", "", false);
        this.decorations = view_1.Decoration.none;
    }
    SearchPlugin.prototype.update = function (update) {
        var ann = update.annotation(searchAnnotation);
        if (ann) {
            if (ann.query)
                this.query = ann.query;
            if (ann.panel !== undefined)
                this.panel = ann.panel;
        }
        if (!this.query.search || !this.panel)
            this.decorations = view_1.Decoration.none;
        else if (ann || update.docChanged || update.transactions.some(function (tr) { return tr.selectionSet; }))
            this.decorations = this.highlight(this.query, update.state, update.viewport);
    };
    SearchPlugin.prototype.highlight = function (query, state, viewport) {
        var deco = [], cursor = query.cursor(state.doc, Math.max(0, viewport.from - query.search.length), Math.min(viewport.to + query.search.length, state.doc.length));
        var _loop_1 = function () {
            var _a = cursor.value, from = _a.from, to = _a.to;
            var selected = state.selection.ranges.some(function (r) { return r.from == from && r.to == to; });
            deco.push(view_1.Decoration.mark(from, to, { "class": this_1.view.cssClass(selected ? "searchMatch.selected" : "searchMatch") }));
        };
        var this_1 = this;
        while (!cursor.next().done) {
            _loop_1();
        }
        return view_1.Decoration.set(deco);
    };
    return SearchPlugin;
}());
var panelKeymap = view_1.EditorView.extend.behavior({
    combine: function (keymaps) {
        var result = Object.create(null);
        for (var _i = 0, keymaps_1 = keymaps; _i < keymaps_1.length; _i++) {
            var map = keymaps_1[_i];
            for (var _a = 0, _b = Object.keys(map); _a < _b.length; _a++) {
                var prop = _b[_a];
                result[prop] = map[prop];
            }
        }
        return new keymap_1.NormalizedKeymap(result);
    }
});
/// Create an extension that enables search/replace functionality.
/// This needs to be enabled for any of the search-related commands to
/// work.
exports.search = function (config) {
    // FIXME make multiple instances of this combine, somehow
    var keys = Object.create(null), panelKeys = Object.create(null);
    if (config.keymap)
        for (var _i = 0, _a = Object.keys(config.keymap); _i < _a.length; _i++) {
            var key = _a[_i];
            panelKeys[key] = keys[key] = config.keymap[key];
        }
    if (config.panelKeymap)
        for (var _b = 0, _c = Object.keys(config.panelKeymap); _b < _c.length; _b++) {
            var key = _c[_b];
            panelKeys[key] = config.panelKeymap[key];
        }
    return [
        keymap_1.keymap(keys),
        panelKeymap(panelKeys),
        searchExtension
    ];
};
function beforeCommand(view) {
    var plugin = view.plugin(searchPlugin);
    if (!plugin)
        return false;
    if (!plugin.query.valid) {
        exports.openSearchPanel(view);
        return true;
    }
    return plugin;
}
function findNextMatch(doc, from, query) {
    var cursor = query.cursor(doc, from).next();
    if (cursor.done) {
        cursor = query.cursor(doc, 0, from + query.search.length - 1).next();
        if (cursor.done)
            return null;
    }
    return cursor.value;
}
/// Open the search panel if it isn't already open, and move the
/// selection to the first match after the current primary selection.
/// Will wrap around to the start of the document when it reaches the
/// end.
exports.findNext = function (view) {
    var plugin = beforeCommand(view);
    if (typeof plugin == "boolean")
        return plugin;
    var _a = view.state.selection.primary, from = _a.from, to = _a.to;
    var next = findNextMatch(view.state.doc, view.state.selection.primary.from + 1, plugin.query);
    if (!next || next.from == from && next.to == to)
        return false;
    view.dispatch(view.state.t().setSelection(state_1.EditorSelection.single(next.from, next.to)).scrollIntoView());
    maybeAnnounceMatch(view);
    return true;
};
var FindPrevChunkSize = 10000;
// Searching in reverse is, rather than implementing inverted search
// cursor, done by scanning chunk after chunk forward.
function findPrevInRange(query, doc, from, to) {
    for (var pos = to;;) {
        var start = Math.max(from, pos - FindPrevChunkSize - query.search.length);
        var cursor = query.cursor(doc, start, pos), range = null;
        while (!cursor.next().done)
            range = cursor.value;
        if (range)
            return range;
        if (start == from)
            return null;
        pos -= FindPrevChunkSize;
    }
}
/// Move the selection to the previous instance of the search query,
/// before the current primary selection. Will wrap past the start
/// of the document to start searching at the end again.
exports.findPrevious = function (view) {
    var plugin = beforeCommand(view);
    if (typeof plugin == "boolean")
        return plugin;
    var state = view.state, query = plugin.query;
    var range = findPrevInRange(query, state.doc, 0, state.selection.primary.to - 1) ||
        findPrevInRange(query, state.doc, state.selection.primary.from + 1, state.doc.length);
    if (!range)
        return false;
    view.dispatch(state.t().setSelection(state_1.EditorSelection.single(range.from, range.to)).scrollIntoView());
    maybeAnnounceMatch(view);
    return true;
};
/// Select all instances of the search query.
exports.selectMatches = function (view) {
    var plugin = beforeCommand(view);
    if (typeof plugin == "boolean")
        return plugin;
    var cursor = plugin.query.cursor(view.state.doc), ranges = [];
    while (!cursor.next().done)
        ranges.push(new state_1.SelectionRange(cursor.value.from, cursor.value.to));
    if (!ranges.length)
        return false;
    view.dispatch(view.state.t().setSelection(state_1.EditorSelection.create(ranges)));
    return true;
};
/// Replace the current match of the search query.
exports.replaceNext = function (view) {
    var plugin = beforeCommand(view);
    if (typeof plugin == "boolean")
        return plugin;
    var next = findNextMatch(view.state.doc, view.state.selection.primary.from, plugin.query);
    if (!next)
        return false;
    var _a = view.state.selection.primary, from = _a.from, to = _a.to, tr = view.state.t();
    if (next.from == from && next.to == to) {
        tr.replace(next.from, next.to, plugin.query.replace);
        next = findNextMatch(tr.doc, tr.changes.mapPos(next.to), plugin.query);
    }
    if (next)
        tr.setSelection(state_1.EditorSelection.single(next.from, next.to)).scrollIntoView();
    view.dispatch(tr);
    if (next)
        maybeAnnounceMatch(view);
    return true;
};
/// Replace all instances of the search query with the given
/// replacement.
exports.replaceAll = function (view) {
    var plugin = beforeCommand(view);
    if (typeof plugin == "boolean")
        return plugin;
    var cursor = plugin.query.cursor(view.state.doc), tr = view.state.t();
    while (!cursor.next().done) {
        var _a = cursor.value, from = _a.from, to = _a.to;
        tr.replace(tr.changes.mapPos(from, 1), tr.changes.mapPos(to, -1), plugin.query.replace);
    }
    if (!tr.docChanged)
        return false;
    view.dispatch(tr);
    return true;
};
/// Make sure the search panel is open and focused.
exports.openSearchPanel = function (view) {
    var plugin = view.plugin(searchPlugin);
    if (!plugin)
        return false;
    if (!plugin.panel) {
        var panel = buildPanel({
            view: view,
            keymap: view.behavior(panelKeymap),
            query: plugin.query,
            updateQuery: function (query) {
                if (!query.eq(plugin.query))
                    view.dispatch(view.state.t().annotate(searchAnnotation({ query: query })));
            }
        });
        view.dispatch(view.state.t().annotate(searchAnnotation({ panel: { dom: panel, pos: 80, style: "search" } })));
    }
    if (plugin.panel)
        plugin.panel.dom.querySelector("[name=search]").select();
    return true;
};
/// Default search-related bindings.
///
///  * Mod-f: [`openSearchPanel`](#search.openSearchPanel)
///  * F3: [`findNext`](#search.findNext)
///  * Shift-F3: [`findPrevious`](#search.findPrevious)
exports.defaultSearchKeymap = {
    "Mod-f": exports.openSearchPanel,
    "F3": exports.findNext,
    "Shift-F3": exports.findPrevious
};
/// Close the search panel.
exports.closeSearchPanel = function (view) {
    var plugin = view.plugin(searchPlugin);
    if (!plugin || !plugin.panel)
        return false;
    if (plugin.panel.dom.contains(view.root.activeElement))
        view.focus();
    view.dispatch(view.state.t().annotate(searchAnnotation({ panel: null })));
    return true;
};
function elt(name, props, children) {
    if (props === void 0) { props = null; }
    if (children === void 0) { children = []; }
    var e = document.createElement(name);
    if (props)
        for (var prop in props) {
            var value = props[prop];
            if (typeof value == "string")
                e.setAttribute(prop, value);
            else
                e[prop] = value;
        }
    for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
        var child = children_1[_i];
        e.appendChild(typeof child == "string" ? document.createTextNode(child) : child);
    }
    return e;
}
function buildPanel(conf) {
    function p(phrase) { return conf.view.phrase(phrase); }
    var searchField = elt("input", {
        value: conf.query.search,
        placeholder: p("Find"),
        "aria-label": p("Find"),
        name: "search",
        onchange: update,
        onkeyup: update
    });
    var replaceField = elt("input", {
        value: conf.query.replace,
        placeholder: p("Replace"),
        "aria-label": p("Replace"),
        name: "replace",
        onchange: update,
        onkeyup: update
    });
    var caseField = elt("input", {
        type: "checkbox",
        name: "case",
        checked: !conf.query.caseInsensitive,
        onchange: update
    });
    function update() {
        conf.updateQuery(new Query(searchField.value, replaceField.value, !caseField.checked));
    }
    function keydown(e) {
        var mapped = conf.keymap.get(e);
        if (mapped && mapped(conf.view)) {
            e.preventDefault();
        }
        else if (e.keyCode == 27) {
            e.preventDefault();
            exports.closeSearchPanel(conf.view);
        }
        else if (e.keyCode == 13 && e.target == searchField) {
            e.preventDefault();
            (e.shiftKey ? exports.findPrevious : exports.findNext)(conf.view);
        }
        else if (e.keyCode == 13 && e.target == replaceField) {
            e.preventDefault();
            exports.replaceNext(conf.view);
        }
    }
    var panel = elt("div", { onkeydown: keydown }, [
        searchField,
        elt("button", { name: "next", onclick: function () { return exports.findNext(conf.view); } }, [p("next")]),
        elt("button", { name: "prev", onclick: function () { return exports.findPrevious(conf.view); } }, [p("previous")]),
        elt("button", { name: "select", onclick: function () { return exports.selectMatches(conf.view); } }, [p("all")]),
        elt("label", null, [caseField, "match case"]),
        elt("br"),
        replaceField,
        elt("button", { name: "replace", onclick: function () { return exports.replaceNext(conf.view); } }, [p("replace")]),
        elt("button", { name: "replaceAll", onclick: function () { return exports.replaceAll(conf.view); } }, [p("replace all")]),
        elt("button", { name: "close", onclick: function () { return exports.closeSearchPanel(conf.view); }, "aria-label": p("close") }, ["×"]),
        elt("div", { style: "position: absolute; top: -10000px", "aria-live": "polite" })
    ]);
    return panel;
}
var AnnounceMargin = 30;
// FIXME this is a kludge
function maybeAnnounceMatch(view) {
    var doc = view.state.doc, _a = view.state.selection.primary, from = _a.from, to = _a.to;
    var lineStart = doc.lineAt(from).start, lineEnd = doc.lineAt(to).end;
    var start = Math.max(lineStart, from - AnnounceMargin), end = Math.min(lineEnd, to + AnnounceMargin);
    var text = doc.slice(start, end);
    if (start != lineStart) {
        for (var i = 0; i < AnnounceMargin; i++)
            if (text_1.isWordChar(text[i + 1]) && !text_1.isWordChar(text[i])) {
                text = text.slice(i);
                break;
            }
    }
    if (end != lineEnd) {
        for (var i = text.length - 1; i > text.length - AnnounceMargin; i--)
            if (text_1.isWordChar(text[i - 1]) && !text_1.isWordChar(text[i])) {
                text = text.slice(0, i);
                break;
            }
    }
    var plugin = view.plugin(searchPlugin);
    if (!plugin.panel || !plugin.panel.dom.contains(document.activeElement))
        return;
    var live = plugin.panel.dom.querySelector("div[aria-live]");
    live.textContent = view.phrase("current match") + ". " + text;
}
var theme = view_1.EditorView.theme({
    "panel.search": {
        padding: "2px 6px 4px",
        position: "relative",
        "& [name=close]": {
            position: "absolute",
            top: "0",
            right: "4px",
            background: "inherit",
            border: "none",
            font: "inherit",
            padding: 0,
            margin: 0
        },
        "& input, & button": {
            verticalAlign: "middle",
            marginRight: ".5em"
        },
        "& label": {
            fontSize: "80%"
        }
    },
    searchMatch: {
        background: "#ffa"
    },
    "searchMatch.selected": {
        background: "#fca"
    }
});
var searchExtension = [
    searchPlugin.extension,
    panel_1.panels(),
    view_1.EditorView.extend.fallback(theme)
];

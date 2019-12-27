"use strict";
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
var style_mod_1 = require("../../3rd-parties/style-mod.js");
var docview_1 = require("./docview.js");
var input_1 = require("./input.js");
var domchange_1 = require("./domchange.js");
var cursor_1 = require("./cursor.js");
var extension_1 = require("./extension.js");
var attributes_1 = require("./attributes.js");
var styles_1 = require("./styles.js");
var browser_1 = require("./browser.js");
// The editor's update state machine looks something like this:
//
//     Idle → Updating ⇆ Idle (unchecked) → Measuring → Idle
//                                         ↑      ↓
//                                         Updating (measure)
//
// The difference between 'Idle' and 'Idle (unchecked)' lies in
// whether a layout check has been scheduled. A regular update through
// the `update` method updates the DOM in a write-only fashion, and
// relies on a check (scheduled with `requestAnimationFrame`) to make
// sure everything is where it should be and the viewport covers the
// visible code. That check continues to measure and then optionally
// update until it reaches a coherent state.
/// An editor view represents the editor's user interface. It holds
/// the editable DOM surface, and possibly other elements such as the
/// line number gutter. It handles events and dispatches state
/// transactions for editing actions.
var EditorView = /** @class */ (function () {
    /// Construct a new view. You'll usually want to put `view.dom` into
    /// your document after creating a view, so that the user can see
    /// it.
    function EditorView(config) {
        var _this = this;
        if (config === void 0) { config = {}; }
        /// @internal
        this.plugins = Object.create(null);
        this.editorAttrs = {};
        this.contentAttrs = {};
        this.themeCache = Object.create(null);
        this.themeCacheFor = [];
        /// @internal
        this.updateState = 2 /* Updating */;
        /// @internal
        this.waiting = [];
        this.contentDOM = document.createElement("div");
        this.scrollDOM = document.createElement("div");
        this.scrollDOM.appendChild(this.contentDOM);
        this.dom = document.createElement("div");
        this.dom.appendChild(this.scrollDOM);
        this.dispatch = config.dispatch || (function (tr) { return _this.update([tr]); });
        this.root = (config.root || document);
        this.docView = new docview_1.DocView(this, function (start, end, typeOver) { return domchange_1.applyDOMChange(_this, start, end, typeOver); });
        var state = config.state || state_1.EditorState.create();
        this.extensions = config.extensions || [];
        this.configure(state.configuration.foreign);
        this.inputState = new input_1.InputState(this);
        this.docView.init(state, function (viewport) {
            _this._viewport = viewport;
            _this._state = state;
            for (var _i = 0, _a = _this.behavior(extension_1.viewPlugin); _i < _a.length; _i++) {
                var plugin = _a[_i];
                var exists = _this.plugins[plugin.id];
                if (exists)
                    throw new Error("Duplicated view plugin" + ((exists.constructor || Object) != Object && exists.constructor.name ? " (" + exists.constructor.name + ")" : ''));
                _this.plugins[plugin.id] = plugin.create(_this);
            }
        });
        this.mountStyles();
        this.updateAttrs();
        this.updateState = 0 /* Idle */;
        ensureGlobalHandler();
    }
    Object.defineProperty(EditorView.prototype, "state", {
        /// The current editor state.
        get: function () { return this._state; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EditorView.prototype, "viewport", {
        /// To be able to display large documents without consuming too much
        /// memory or overloading the browser, CodeMirror only draws the
        /// code that is visible, plus a margin around it, to the DOM. This
        /// property tells you the extent of the current drawn viewport, in
        /// document positions.
        get: function () { return this._viewport; },
        enumerable: true,
        configurable: true
    });
    /// Update the view for the given array of transactions. This will
    /// update the visible document and selection to match the state
    /// produced by the transactions, and notify view plugins of the
    /// change.
    EditorView.prototype.update = function (transactions, annotations) {
        if (transactions === void 0) { transactions = []; }
        if (annotations === void 0) { annotations = []; }
        if (this.updateState != 0 /* Idle */)
            throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
        this.updateState = 2 /* Updating */;
        this.clearWaiting();
        var state = this.state, prevForeign = state.configuration.foreign;
        for (var _i = 0, transactions_1 = transactions; _i < transactions_1.length; _i++) {
            var tr = transactions_1[_i];
            if (tr.startState != state)
                throw new RangeError("Trying to update state with a transaction that doesn't start from the current state.");
            state = tr.apply();
        }
        var curForeign = state.configuration.foreign;
        if (curForeign != prevForeign) {
            this.configure(curForeign);
            this.updatePlugins();
        }
        var update = transactions.length > 0 || annotations.length > 0 ? new extension_1.ViewUpdate(this, transactions, annotations) : null;
        if (state.doc != this.state.doc || transactions.some(function (tr) { return tr.selectionSet && !tr.annotation(state_1.Transaction.preserveGoalColumn); }))
            this.inputState.goalColumns.length = 0;
        this.docView.update(update, transactions.some(function (tr) { return tr.scrolledIntoView; }) ? state.selection.primary.head : -1);
        if (update) {
            this.inputState.ensureHandlers(this);
            this.drawPlugins();
            if (this.behavior(extension_1.styleModule) != this.styleModules)
                this.mountStyles();
        }
        this.updateAttrs();
        this.updateState = 0 /* Idle */;
    };
    /// Wait for the given promise to resolve, and then run an update.
    /// Or, if an update happens before that, set the promise's
    /// `canceled` property to true and ignore it.
    EditorView.prototype.waitFor = function (promise) {
        var _this = this;
        promise.then(function () {
            if (!promise.canceled)
                _this.update([], [extension_1.notified(true)]);
        });
        this.waiting.push(promise);
    };
    EditorView.prototype.clearWaiting = function () {
        for (var _i = 0, _a = this.waiting; _i < _a.length; _i++) {
            var promise = _a[_i];
            promise.canceled = true;
        }
        this.waiting.length = 0;
    };
    /// @internal
    EditorView.prototype.updateAttrs = function () {
        var editorAttrs = this.behavior(extension_1.editorAttributes), contentAttrs = this.behavior(extension_1.contentAttributes);
        attributes_1.updateAttrs(this.dom, this.editorAttrs, editorAttrs);
        this.editorAttrs = editorAttrs;
        attributes_1.updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
        this.contentAttrs = contentAttrs;
        this.scrollDOM.className = this.cssClass("scroller") + " " + styles_1.styles.scroller;
    };
    EditorView.prototype.configure = function (fromState) {
        this.configuration = extension_1.extendView.resolve([defaultAttrs].concat(this.extensions).concat(fromState));
        if (this.configuration.foreign.length)
            throw new Error("Non-view extensions found in view");
    };
    EditorView.prototype.updatePlugins = function () {
        var old = this.plugins;
        this.plugins = Object.create(null);
        for (var _i = 0, _a = this.behavior(extension_1.viewPlugin); _i < _a.length; _i++) {
            var plugin = _a[_i];
            this.plugins[plugin.id] = Object.prototype.hasOwnProperty.call(old, plugin.id) ? old[plugin.id] : plugin.create(this);
        }
    };
    EditorView.prototype.mountStyles = function () {
        this.styleModules = this.behavior(extension_1.styleModule);
        style_mod_1.StyleModule.mount(this.root, this.styleModules.concat(styles_1.styles).reverse());
    };
    /// @internal
    EditorView.prototype.drawPlugins = function () {
        for (var _i = 0, _a = this.behavior(extension_1.viewPlugin); _i < _a.length; _i++) {
            var plugin = _a[_i];
            var value = this.plugins[plugin.id];
            if (value.draw) {
                try {
                    value.draw();
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        this.updateAttrs();
    };
    /// Get an instance of the given plugin class, or `undefined` if
    /// none exists in this view.
    EditorView.prototype.plugin = function (plugin) {
        var result = this.plugins[plugin.id];
        if (result === undefined && this.behavior(extension_1.viewPlugin).indexOf(plugin) > -1)
            throw new Error("Accessing a plugin from another plugin with higher precedence");
        return result;
    };
    /// Get the value of a view behavior.
    EditorView.prototype.behavior = function (behavior) {
        return this.configuration.getBehavior(behavior, this);
    };
    /// @internal
    EditorView.prototype.updateInner = function (update, viewport) {
        this._viewport = viewport;
        this._state = update.state;
        // FIXME separate plugins from behavior cache?
        var oldPlugins = this.plugins;
        this.plugins = Object.create(null);
        for (var _i = 0, _a = this.behavior(extension_1.viewPlugin); _i < _a.length; _i++) {
            var plugin = _a[_i];
            var value = this.plugins[plugin.id] = oldPlugins[plugin.id];
            if (value.update) {
                try {
                    value.update(update);
                }
                catch (e) {
                    console.error(e);
                    this.plugins[plugin.id] = { update: function () { } };
                }
            }
        }
    };
    /// Query the active themes for the CSS class names associated with
    /// the given name. Names can be single words or words separated by
    /// dot characters. In the latter case, the returned classes combine
    /// those that match the full name and those that match some
    /// prefix—for example `cssClass("panel.search")` will match both
    /// the theme styles specified as `"panel.search"` and those with
    /// just `"panel"`. More specific theme styles (with more dots) take
    /// precedence.
    EditorView.prototype.cssClass = function (selector) {
        var themes = this.behavior(extension_1.theme);
        if (themes != this.themeCacheFor) {
            this.themeCache = Object.create(null);
            this.themeCacheFor = themes;
        }
        else {
            var known = this.themeCache[selector];
            if (known != null)
                return known;
        }
        var result = "";
        for (var pos = 0;;) {
            var dot = selector.indexOf(".", pos);
            var cls = dot < 0 ? selector : selector.slice(0, dot);
            result += (result ? " " : "") + "codemirror-" + (pos ? cls.replace(/\./g, "-") : cls);
            for (var _i = 0, themes_1 = themes; _i < themes_1.length; _i++) {
                var theme_1 = themes_1[_i];
                var has = theme_1[cls];
                if (has)
                    result += " " + has;
            }
            if (dot < 0)
                break;
            pos = dot + 1;
        }
        return this.themeCache[selector] = result;
    };
    /// Look up a translation for the given phrase (via the
    /// [`phrases`](#view.EditorView^phrases) behavior), or return the
    /// original string if no translation is found.
    EditorView.prototype.phrase = function (phrase) {
        for (var _i = 0, _a = this.behavior(extension_1.phrases); _i < _a.length; _i++) {
            var map = _a[_i];
            if (Object.prototype.hasOwnProperty.call(map, phrase))
                return map[phrase];
        }
        return phrase;
    };
    /// Find the DOM parent node and offset (child offset if `node` is
    /// an element, character offset when it is a text node) at the
    /// given document position.
    EditorView.prototype.domAtPos = function (pos) {
        return this.docView.domAtPos(pos);
    };
    /// Find the document position at the given DOM node. Can be useful
    /// for associating positions with DOM events. Will raise an error
    /// when `node` isn't part of the editor content.
    EditorView.prototype.posAtDOM = function (node, offset) {
        if (offset === void 0) { offset = 0; }
        return this.docView.posFromDOM(node, offset);
    };
    EditorView.prototype.readingLayout = function () {
        if (this.updateState == 2 /* Updating */)
            throw new Error("Reading the editor layout isn't allowed during an update");
        if (this.updateState == 0 /* Idle */ && this.docView.layoutCheckScheduled > -1)
            this.docView.checkLayout();
    };
    /// Make sure plugins get a chance to measure the DOM before the
    /// next frame. Calling this is preferable to messing with the DOM
    /// directly from, for example, an even handler, because it'll make
    /// sure measuring and drawing done by other components is
    /// synchronized, avoiding unnecessary DOM layout computations.
    EditorView.prototype.requireMeasure = function () {
        this.docView.scheduleLayoutCheck();
    };
    /// Find the line or block widget at the given vertical position.
    /// `editorTop`, if given, provides the vertical position of the top
    /// of the editor. It defaults to the editor's screen position
    /// (which will force a DOM layout).
    EditorView.prototype.blockAtHeight = function (height, editorTop) {
        this.readingLayout();
        return this.docView.blockAtHeight(height, editorTop);
    };
    /// Find information for the line at the given vertical position.
    /// The resulting block info might hold another array of block info
    /// structs in its `type` field if this line consists of more than
    /// one block.
    EditorView.prototype.lineAtHeight = function (height, editorTop) {
        this.readingLayout();
        return this.docView.lineAtHeight(height, editorTop);
    };
    /// Find the height information for the given line.
    EditorView.prototype.lineAt = function (pos, editorTop) {
        this.readingLayout();
        return this.docView.lineAt(pos, editorTop);
    };
    /// Iterate over the height information of the lines in the
    /// viewport.
    EditorView.prototype.viewportLines = function (f, editorTop) {
        var _a = this._viewport, from = _a.from, to = _a.to;
        this.docView.forEachLine(from, to, f, editorTop);
    };
    Object.defineProperty(EditorView.prototype, "contentHeight", {
        /// The editor's total content height.
        get: function () {
            return this.docView.heightMap.height + this.docView.paddingTop + this.docView.paddingBottom;
        },
        enumerable: true,
        configurable: true
    });
    /// Compute cursor motion from the given position, in the given
    /// direction, by the given unit. Since this might involve
    /// temporarily mutating the DOM selection, you can pass the action
    /// type this will be used for to, in case the editor selection is
    /// set to the new position right away, avoid an extra DOM selection
    /// change.
    EditorView.prototype.movePos = function (start, direction, granularity, action) {
        if (granularity === void 0) { granularity = "character"; }
        if (action === void 0) { action = "move"; }
        return cursor_1.movePos(this, start, direction, granularity, action);
    };
    /// Get the document position at the given screen coordinates.
    /// Returns -1 if no valid position could be found.
    EditorView.prototype.posAtCoords = function (coords) {
        this.readingLayout();
        return cursor_1.posAtCoords(this, coords);
    };
    /// Get the screen coordinates at the given document position.
    EditorView.prototype.coordsAtPos = function (pos) {
        this.readingLayout();
        return this.docView.coordsAt(pos);
    };
    Object.defineProperty(EditorView.prototype, "defaultCharacterWidth", {
        /// The default width of a character in the editor. May not
        /// accurately reflect the width of all characters.
        get: function () { return this.docView.heightOracle.charWidth; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EditorView.prototype, "defaultLineHeight", {
        /// The default height of a line in the editor.
        get: function () { return this.docView.heightOracle.lineHeight; },
        enumerable: true,
        configurable: true
    });
    /// Start a custom mouse selection event.
    EditorView.prototype.startMouseSelection = function (event, update) {
        this.focus();
        this.inputState.startMouseSelection(this, event, update);
    };
    Object.defineProperty(EditorView.prototype, "hasFocus", {
        /// Check whether the editor has focus.
        get: function () {
            return this.root.activeElement == this.contentDOM;
        },
        enumerable: true,
        configurable: true
    });
    /// Put focus on the editor.
    EditorView.prototype.focus = function () {
        this.docView.focus();
    };
    /// Clean up this editor view, removing its element from the
    /// document, unregistering event handlers, and notifying
    /// extensions. The view instance can no longer be used after
    /// calling this.
    EditorView.prototype.destroy = function () {
        for (var _i = 0, _a = this.behavior(extension_1.viewPlugin); _i < _a.length; _i++) {
            var plugin = _a[_i];
            var value = this.plugins[plugin.id];
            if (value.destroy) {
                try {
                    value.destroy();
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        this.inputState.destroy();
        this.dom.remove();
        this.docView.destroy();
    };
    /// Behavior that provides CSS classes to add to elements identified
    /// by the given string.
    EditorView.theme = function (spec) {
        for (var prop in spec) {
            var specificity = prop.split(".").length - 1;
            if (specificity > 0)
                spec[prop].specificity = specificity;
        }
        var module = new style_mod_1.StyleModule(spec);
        return [extension_1.theme(module), extension_1.styleModule(module)];
    };
    /// The view extension group, used to define new view extensions.
    EditorView.extend = extension_1.extendView;
    /// Behavior to add a [style
    /// module](https://github.com/marijnh/style-mod#readme) to an editor
    /// view. The view will ensure that the module is registered in its
    /// [document root](#view.EditorConfig.root).
    EditorView.styleModule = extension_1.styleModule;
    /// Behavior that can be used to add DOM event handlers. The value
    /// should be an object mapping event names to handler functions. The
    /// first such function to return true will be assumed to have handled
    /// that event, and no other handlers or built-in behavior will be
    /// activated for it.
    EditorView.handleDOMEvents = extension_1.handleDOMEvents;
    /// Behavior used to configure whether a given selection drag event
    /// should move or copy the selection. The given predicate will be
    /// called with the `mousedown` event, and can return `true` when
    /// the drag should move the content.
    EditorView.dragMovesSelection = extension_1.dragMovesSelection;
    /// Behavior used to configure whether a given selecting click adds
    /// a new range to the existing selection or replaces it entirely.
    EditorView.clickAddsSelectionRange = extension_1.clickAddsSelectionRange;
    /// A behavior that determines which [decorations](#view.Decoration)
    /// are shown in the view.
    EditorView.decorations = extension_1.decorations;
    /// Registers translation phrases. The
    /// [`phrase`](#view.EditorView.phrase) method will look through all
    /// objects registered with this behavior to find translations for
    /// its argument.
    EditorView.phrases = extension_1.phrases;
    /// This behavior can be used to indicate that, when scrolling
    /// something into view, certain parts at the side of the editor
    /// should be scrolled past (for example because there is a gutter
    /// or panel blocking them from view).
    EditorView.scrollMargins = extension_1.scrollMargins;
    /// Behavior that provides attributes for the editor's editable DOM
    /// element.
    EditorView.contentAttributes = extension_1.contentAttributes;
    /// Behavior that provides editor DOM attributes for the editor's
    /// outer element.
    EditorView.editorAttributes = extension_1.editorAttributes;
    /// An annotation that is used as a flag in view updates caused by
    /// changes to the view's focus state. Its value will be `true` when
    /// the view is being focused, `false` when it's losing focus.
    EditorView.focusChange = extension_1.focusChange;
    return EditorView;
}());
exports.EditorView = EditorView;
var defaultAttrs = [
    extension_1.extendView.dynamic(extension_1.editorAttributes, function (view) { return ({
        "class": "codemirror " + styles_1.styles.wrapper + (view.hasFocus ? " codemirror-focused " : " ") + view.cssClass("wrap")
    }); }),
    extension_1.extendView.dynamic(extension_1.contentAttributes, function (view) { return ({
        spellcheck: "false",
        contenteditable: "true",
        "class": styles_1.styles.content + " " + view.cssClass("content"),
        style: browser_1["default"].tabSize + ": " + view.state.tabSize
    }); })
];
var registeredGlobalHandler = false, resizeDebounce = -1;
function ensureGlobalHandler() {
    if (registeredGlobalHandler)
        return;
    window.addEventListener("resize", function () {
        if (resizeDebounce == -1)
            resizeDebounce = setTimeout(handleResize, 50);
    });
}
function handleResize() {
    resizeDebounce = -1;
    var found = document.querySelectorAll(".codemirror-content");
    for (var i = 0; i < found.length; i++) {
        var docView = found[i].cmView;
        if (docView)
            docView.editorView.update([], [extension_1.notified(true)]); // FIXME remove need to pass an annotation?
    }
}

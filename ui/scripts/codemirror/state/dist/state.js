"use strict";
exports.__esModule = true;
var text_1 = require("../../text/dist/index.js");
var selection_1 = require("./selection.js");
var transaction_1 = require("./transaction.js");
var extension_1 = require("./extension.js");
var DEFAULT_INDENT_UNIT = 2, DEFAULT_TABSIZE = 4, DEFAULT_SPLIT = /\r\n?|\n/;
/// The editor state class is a persistent (immutable) data structure.
/// To update a state, you [create](#state.EditorState.t) and
/// [apply](#state.Transaction.apply) a
/// [transaction](#state.Transaction), which produces a _new_ state
/// instance, without modifying the original object.
///
/// As such, _never_ mutate properties of a state directly. That'll
/// just break things.
var EditorState = /** @class */ (function () {
    /// @internal
    function EditorState(
    /// @internal
    configuration,
    /// @internal
    values,
    /// The current document.
    doc,
    /// The current selection.
    selection) {
        this.configuration = configuration;
        this.values = values;
        this.doc = doc;
        this.selection = selection;
        for (var _i = 0, _a = selection.ranges; _i < _a.length; _i++) {
            var range = _a[_i];
            if (range.to > doc.length)
                throw new RangeError("Selection points outside of document");
        }
    }
    EditorState.prototype.field = function (field, require) {
        if (require === void 0) { require = true; }
        var value = this.values[field.id];
        if (value === undefined && !Object.prototype.hasOwnProperty.call(this.values, field.id)) {
            // FIXME document or avoid this
            if (this.behavior(extension_1.stateField).indexOf(field) > -1)
                throw new RangeError("Field hasn't been initialized yet");
            if (require)
                throw new RangeError("Field is not present in this state");
            return undefined;
        }
        return value;
    };
    /// @internal
    EditorState.prototype.applyTransaction = function (tr) {
        var values = Object.create(null), configuration = tr.configuration;
        var newState = new EditorState(configuration, values, tr.doc, tr.selection);
        for (var _i = 0, _a = configuration.getBehavior(extension_1.stateField); _i < _a.length; _i++) {
            var field = _a[_i];
            var exists = configuration == this.configuration || Object.prototype.hasOwnProperty.call(this.values, field.id);
            values[field.id] = exists ? field.apply(tr, this.values[field.id], newState) : field.init(newState);
        }
        return newState;
    };
    /// Start a new transaction from this state. When not given, the
    /// timestamp defaults to
    /// [`Date.now()`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/now).
    EditorState.prototype.t = function (timestamp) {
        return new transaction_1.Transaction(this, timestamp);
    };
    /// Join an array of lines using the state's [line
    /// separator](#state.EditorState^lineSeparator).
    EditorState.prototype.joinLines = function (text) { return text.join(this.behavior(EditorState.lineSeparator) || "\n"); };
    /// Split a string into lines using the state's [line
    /// separator](#state.EditorState^lineSeparator).
    EditorState.prototype.splitLines = function (text) { return text.split(this.behavior(EditorState.lineSeparator) || DEFAULT_SPLIT); };
    /// Get the value of a state [behavior](#extension.Behavior).
    EditorState.prototype.behavior = function (behavior) {
        return this.configuration.getBehavior(behavior, this);
    };
    /// Convert this state to a JSON-serializable object.
    EditorState.prototype.toJSON = function () {
        // FIXME plugin state serialization
        return {
            doc: this.joinLines(this.doc.sliceLines(0, this.doc.length)),
            selection: this.selection.toJSON()
        };
    };
    /// Deserialize a state from its JSON representation.
    EditorState.fromJSON = function (json, config) {
        if (config === void 0) { config = {}; }
        if (!json || typeof json.doc != "string")
            throw new RangeError("Invalid JSON representation for EditorState");
        return EditorState.create({
            doc: json.doc,
            selection: selection_1.EditorSelection.fromJSON(json.selection),
            extensions: config.extensions
        });
    };
    /// Create a new state. You'll usually only need this when
    /// initializing an editor—updated states are created by applying
    /// transactions.
    EditorState.create = function (config) {
        if (config === void 0) { config = {}; }
        var configuration = extension_1.extendState.resolve(config.extensions || []);
        var values = Object.create(null);
        var doc = config.doc instanceof text_1.Text ? config.doc
            : text_1.Text.of((config.doc || "").split(configuration.getBehavior(EditorState.lineSeparator) || DEFAULT_SPLIT));
        var selection = config.selection || selection_1.EditorSelection.single(0);
        if (!configuration.getBehavior(EditorState.allowMultipleSelections))
            selection = selection.asSingle();
        var state = new EditorState(configuration, values, doc, selection);
        for (var _i = 0, _a = state.behavior(extension_1.stateField); _i < _a.length; _i++) {
            var field = _a[_i];
            var exists = values[field.id];
            if (exists)
                throw new Error("Duplicate use of state field" + ((exists.constructor || Object) != Object && exists.constructor.name ? " (" + exists.constructor.name + ")" : ''));
            values[field.id] = field.init(state);
        }
        return state;
    };
    Object.defineProperty(EditorState.prototype, "tabSize", {
        /// The size (in columns) of a tab in the document, determined by
        /// the [`tabSize`](#state.EditorState^tabSize) behavior.
        get: function () { return this.behavior(EditorState.tabSize); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(EditorState.prototype, "indentUnit", {
        /// The size of an indent unit in the document. Determined by the
        /// [`indentUnit`](#state.EditorState^indentUnit) behavior.
        get: function () { return this.behavior(EditorState.indentUnit); },
        enumerable: true,
        configurable: true
    });
    /// The [extension group](#extension.ExtensionGroup) for editor
    /// states, mostly used to define state extensions and
    /// [set](#extension.ExtensionGroup.fallback) their precedence.
    EditorState.extend = extension_1.extendState;
    /// A behavior that, when enabled, causes the editor to allow
    /// multiple ranges to be selected. You should probably not use this
    /// directly, but let a plugin like
    /// [multiple-selections](#multiple-selections) handle it (which
    /// also makes sure the selections are visible in the view).
    EditorState.allowMultipleSelections = extension_1.allowMultipleSelections;
    /// Behavior that defines a way to query for automatic indentation
    /// depth at the start of a given line.
    EditorState.indentation = extension_1.extendState.behavior();
    /// Configures the tab size to use in this state. The first
    /// (highest-precedence) value of the behavior is used.
    EditorState.tabSize = extension_1.extendState.behavior({
        combine: function (values) { return values.length ? values[0] : DEFAULT_TABSIZE; }
    });
    /// The line separator to use. By default, any of `"\n"`, `"\r\n"`
    /// and `"\r"` is treated as a separator when splitting lines, and
    /// lines are joined with `"\n"`.
    ///
    /// When you configure a value here, only that precise separator
    /// will be used, allowing you to round-trip documents through the
    /// editor without normalizing line separators.
    EditorState.lineSeparator = extension_1.extendState.behavior({
        combine: function (values) { return values.length ? values[0] : undefined; },
        static: true
    });
    /// Behavior for overriding the unit (in columns) by which
    /// indentation happens. When not set, this defaults to 2.
    EditorState.indentUnit = extension_1.extendState.behavior({
        combine: function (values) { return values.length ? values[0] : DEFAULT_INDENT_UNIT; }
    });
    /// Behavior that registers a parsing service for the state.
    EditorState.syntax = extension_1.extendState.behavior();
    /// A behavior that registers a code folding service. When called
    /// with the extent of a line, it'll return a range object when a
    /// foldable that starts on that line (but continues beyond it) can
    /// be found.
    EditorState.foldable = extension_1.extendState.behavior();
    return EditorState;
}());
exports.EditorState = EditorState;

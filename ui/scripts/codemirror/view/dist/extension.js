"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
var extension_1 = require("../../extension/dist/extension.js");
var attributes_1 = require("./attributes.js");
var none = [];
exports.extendView = new extension_1.ExtensionGroup(function (view) { return view.plugins; });
exports.handleDOMEvents = exports.extendView.behavior();
exports.clickAddsSelectionRange = exports.extendView.behavior();
exports.dragMovesSelection = exports.extendView.behavior();
/// View plugins associate stateful values with a view. They can
/// influence the way the content is drawn, and are notified of things
/// that happen in the view. They can be combined with [dynamic
/// behavior](#extension.ExtensionGroup.dynamic) to
/// [add](#view.EditorView^decorations)
/// [decorations](#view.Decoration) to the view. Objects of this type
/// serve as keys to [access](#view.EditorView.plugin) the value of
/// the plugin.
var ViewPlugin = /** @class */ (function () {
    function ViewPlugin(
    /// @internal
    create, 
    /// @internal
    id, 
    /// @internal
    behaviorExtensions) {
        this.create = create;
        this.id = id;
        this.behaviorExtensions = behaviorExtensions;
        this.extension = __spreadArrays([exports.viewPlugin(this)], this.behaviorExtensions);
    }
    /// Declare a plugin. The `create` function will be called while
    /// initializing or reconfiguring an editor view to create the
    /// actual plugin instance.
    ViewPlugin.create = function (create) {
        return new ViewPlugin(create, exports.extendView.storageID(), []);
    };
    /// Declare a behavior as a function of this plugin. `read` maps
    /// from the plugin value to the behavior's input type.
    ViewPlugin.prototype.behavior = function (behavior, read) {
        var _this = this;
        return new ViewPlugin(this.create, this.id, this.behaviorExtensions.concat(exports.extendView.dynamic(behavior, function (view) { return read(view.plugin(_this)); })));
    };
    /// Declare that this plugin provides [decorations](#view.EditorView^decorations).
    ViewPlugin.prototype.decorations = function (read) {
        return this.behavior(exports.decorations, read);
    };
    /// Create a view plugin extension that only computes decorations.
    ViewPlugin.decoration = function (spec) {
        return ViewPlugin.create(function (view) { return new DecorationPlugin(view, spec); }).decorations(function (p) { return p.decorations; }).extension;
    };
    return ViewPlugin;
}());
exports.ViewPlugin = ViewPlugin;
exports.editorAttributes = exports.extendView.behavior({
    combine: function (values) { return values.reduce(function (a, b) { return attributes_1.combineAttrs(b, a); }, {}); }
});
exports.contentAttributes = exports.extendView.behavior({
    combine: function (values) { return values.reduce(function (a, b) { return attributes_1.combineAttrs(b, a); }, {}); }
});
// Registers view plugins.
exports.viewPlugin = exports.extendView.behavior({ static: true });
// Provide decorations
exports.decorations = exports.extendView.behavior();
var DecorationPlugin = /** @class */ (function () {
    function DecorationPlugin(view, spec) {
        this.spec = spec;
        this.decorations = spec.create(view);
    }
    DecorationPlugin.prototype.update = function (update) {
        this.decorations = this.spec.update(this.spec.map ? this.decorations.map(update.changes) : this.decorations, update);
    };
    return DecorationPlugin;
}());
exports.styleModule = exports.extendView.behavior();
exports.theme = exports.extendView.behavior();
exports.phrases = exports.extendView.behavior();
exports.scrollMargins = exports.extendView.behavior({
    combine: function (rects) {
        var result = { left: 0, top: 0, right: 0, bottom: 0 };
        for (var _i = 0, rects_1 = rects; _i < rects_1.length; _i++) {
            var r = rects_1[_i];
            result.left = Math.max(result.left, r.left || 0);
            result.top = Math.max(result.top, r.top || 0);
            result.right = Math.max(result.right, r.right || 0);
            result.bottom = Math.max(result.bottom, r.bottom || 0);
        }
        return result;
    }
});
exports.focusChange = state_1.Annotation.define();
exports.notified = state_1.Annotation.define();
/// View [plugins](#view.ViewPlugin) are given instances of this
/// class, which describe what happened, whenever the view is updated.
var ViewUpdate = /** @class */ (function () {
    /// @internal
    function ViewUpdate(
    /// The editor view that the update is associated with.
    view, 
    /// The transactions involved in the update. May be empty.
    transactions, 
    /// @internal
    _annotations) {
        if (transactions === void 0) { transactions = none; }
        if (_annotations === void 0) { _annotations = none; }
        this.view = view;
        this.transactions = transactions;
        this._annotations = _annotations;
        this.state = transactions.length ? transactions[transactions.length - 1].apply() : view.state;
        this.changes = transactions.reduce(function (chs, tr) { return chs.appendSet(tr.changes); }, state_1.ChangeSet.empty);
        this.prevState = view.state;
        this.prevViewport = view._viewport;
        this.prevThemes = view.behavior(exports.theme);
    }
    Object.defineProperty(ViewUpdate.prototype, "viewport", {
        /// The new viewport range.
        get: function () { return this.view._viewport; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ViewUpdate.prototype, "viewportChanged", {
        /// Tells you whether the viewport changed in this update.
        get: function () {
            return !this.prevViewport.eq(this.view._viewport);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ViewUpdate.prototype, "docChanged", {
        /// Whether the document changed in this update.
        get: function () {
            return this.transactions.some(function (tr) { return tr.docChanged; });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ViewUpdate.prototype, "themeChanged", {
        /// Tells you whether the set of active [theme
        /// extensions](#view.EditorView^theme) changed, which may require
        /// plugins to update [CSS class names](#view.EditorView.cssClass)
        /// on their DOM elements.
        get: function () {
            return this.prevThemes != this.view.behavior(exports.theme);
        },
        enumerable: true,
        configurable: true
    });
    /// Get the value of the given annotation, if it was passed directly
    /// for the update or present in any of the transactions involved in
    /// the update.
    ViewUpdate.prototype.annotation = function (type) {
        for (var _i = 0, _a = this._annotations; _i < _a.length; _i++) {
            var ann = _a[_i];
            if (ann.type == type)
                return ann.value;
        }
        for (var i = this.transactions.length - 1; i >= 0; i--) {
            var value = this.transactions[i].annotation(type);
            if (value !== undefined)
                return value;
        }
        return undefined;
    };
    /// Get the values of all instances of the given annotation type
    /// present in the transactions or passed directly to
    /// [`update`](#view.EditorView.update).
    ViewUpdate.prototype.annotations = function (type) {
        var result = none;
        for (var _i = 0, _a = this.transactions; _i < _a.length; _i++) {
            var tr = _a[_i];
            var ann = tr.annotations(type);
            if (ann.length)
                result = result.concat(ann);
        }
        for (var _b = 0, _c = this._annotations; _b < _c.length; _b++) {
            var ann = _c[_b];
            if (ann.type == type)
                result = result.concat([ann.value]);
        }
        return result;
    };
    return ViewUpdate;
}());
exports.ViewUpdate = ViewUpdate;

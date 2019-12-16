"use strict";
exports.__esModule = true;
var extension_1 = require("../../extension/dist/extension.js");
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
exports.extendState = new extension_1.ExtensionGroup(function (state) { return state.values; });
exports.stateField = exports.extendState.behavior({ static: true });
exports.allowMultipleSelections = exports.extendState.behavior({
    combine: function (values) { return values.some(function (v) { return v; }); },
    static: true
});
/// Fields can store additional information in an editor state, and
/// keep it in sync with the rest of the state.
var StateField = /** @class */ (function () {
    /// Declare a field. The field instance is used as the
    /// [key](#state.EditorState.field) when retrieving the field's
    /// value from a state.
    function StateField(spec) {
        /// @internal
        this.id = exports.extendState.storageID();
        this.init = spec.init;
        this.apply = spec.apply;
        this.extension = exports.stateField(this);
    }
    return StateField;
}());
exports.StateField = StateField;
/// Annotations are tagged values that are used to add metadata to
/// transactions in an extensible way.
var Annotation = /** @class */ (function () {
    /// @internal
    function Annotation(/** @internal */ type, 
    /** @internal */ value) {
        this.type = type;
        this.value = value;
    }
    /// Define a new type of annotation. Returns a function that you can
    /// call with a content value to create an instance of this type.
    Annotation.define = function () {
        return function type(value) { return new Annotation(type, value); };
    };
    return Annotation;
}());
exports.Annotation = Annotation;
/// A node prop that can be stored on a grammar's top node to
/// associate information with the language. Different extension might
/// use different properties from this object (which they typically
/// export as an interface).
exports.languageData = new lezer_tree_1.NodeProp();

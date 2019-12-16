"use strict";
exports.__esModule = true;
var BehaviorData = /** @class */ (function () {
    function BehaviorData(combine, isStatic, id) {
        this.combine = combine;
        this.id = id;
        this.static = isStatic;
        this.empty = combine(none);
    }
    BehaviorData.get = function (behavior) {
        var value = behavior._data;
        if (!value)
            throw new RangeError("Not a behavior");
        return value;
    };
    return BehaviorData;
}());
/// All extensions are associated with an extension group. This is
/// used to distinguish extensions meant for different types of hosts
/// (such as the editor view and state).
var ExtensionGroup = /** @class */ (function () {
    /// Create a new group. Client code probably doesn't need to do
    /// this. `getStore` retrieves the id-to-value map from a context
    /// object.
    function ExtensionGroup(getStore) {
        this.getStore = getStore;
        this.nextStorageID = 0;
        /// Mark an extension with a precedence below the default
        /// precedence, which will cause default-precedence extensions to
        /// override it even if they are specified later in the extension
        /// ordering.
        this.fallback = setPrec(-1 /* Fallback */);
        /// Mark an extension with normal precedence.
        this.normal = setPrec(0 /* Default */);
        /// Mark an extension with a precedence above the default precedence.
        this.extend = setPrec(1 /* Extend */);
        /// Mark an extension with a precedence above the default and
        /// `extend` precedences.
        this.override = setPrec(2 /* Override */);
    }
    ExtensionGroup.prototype.behavior = function (options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var behavior = function (value) { return new ExtensionValue(0 /* Behavior */, behavior, { static: value }, _this); };
        behavior._data = new BehaviorData(options.combine || (function (array) { return array; }), !!options.static, this.storageID());
        return behavior;
    };
    /// Create an extension that adds a dynamically computed value for a
    /// given behavior. Dynamic behavior should usually just read and
    /// possibly transform a field from the context.
    ExtensionGroup.prototype.dynamic = function (behavior, read) {
        if (BehaviorData.get(behavior).static)
            throw new Error("Can't create a dynamic source for a static behavior");
        return new ExtensionValue(0 /* Behavior */, behavior, { dynamic: read }, this);
    };
    /// Resolve an array of extensions by expanding all extensions until
    /// only behaviors are left, and then collecting the behaviors into
    /// arrays of values, preserving precedence ordering throughout.
    ExtensionGroup.prototype.resolve = function (extensions) {
        var _this = this;
        var flat = [];
        flatten(extensions, 0 /* Default */, new Set(), flat);
        // Collect the behavior values.
        var foreign = [];
        var readBehavior = Object.create(null);
        var _loop_1 = function (ext) {
            if (ext.type != this_1) {
                // Collect extensions of the wrong type into configuration.foreign
                foreign.push(ext);
                return "continue";
            }
            var behavior = BehaviorData.get(ext.id);
            if (Object.prototype.hasOwnProperty.call(readBehavior, behavior.id))
                return "continue"; // Already collected
            var values = [];
            for (var _i = 0, flat_2 = flat; _i < flat_2.length; _i++) {
                var e = flat_2[_i];
                if (e.id == ext.id)
                    e.collect(values);
            }
            var dynamic = [], parts = [];
            values.forEach(function (ext) {
                if (ext.value.dynamic) {
                    dynamic.push({ read: ext.value.dynamic, index: parts.length });
                    parts.push(null);
                }
                else {
                    parts.push(ext.value.static);
                }
            });
            if (dynamic.length == 0) {
                var value_1 = behavior.combine(parts);
                readBehavior[behavior.id] = function () { return value_1; };
            }
            else {
                var cached_1, cachedValue_1;
                readBehavior[behavior.id] = function (context) {
                    var values = _this.getStore(context), found = values[behavior.id];
                    if (found !== undefined || Object.prototype.hasOwnProperty.call(values, behavior.id))
                        return found;
                    var array = parts.slice(), changed = false;
                    for (var _i = 0, dynamic_1 = dynamic; _i < dynamic_1.length; _i++) {
                        var _a = dynamic_1[_i], read = _a.read, index = _a.index;
                        var newValue = array[index] = read(context);
                        if (!cached_1 || cached_1[index] != newValue)
                            changed = true;
                    }
                    cached_1 = array;
                    return values[behavior.id] = changed ? cachedValue_1 = behavior.combine(array) : cachedValue_1;
                };
            }
        };
        var this_1 = this;
        for (var _i = 0, flat_1 = flat; _i < flat_1.length; _i++) {
            var ext = flat_1[_i];
            _loop_1(ext);
        }
        return new Configuration(this, extensions, readBehavior, foreign);
    };
    /// Allocate a unique storage number for use in field storage. Not
    /// something client code is likely to need.
    ExtensionGroup.prototype.storageID = function () { return ++this.nextStorageID; };
    return ExtensionGroup;
}());
exports.ExtensionGroup = ExtensionGroup;
function setPrec(prec) {
    return function (extension) { return extension instanceof ExtensionValue
        ? new ExtensionValue(extension.kind, extension.id, extension.value, extension.type, prec)
        : new ExtensionValue(1 /* Array */, null, extension, null, prec); };
}
/// And extension is a value that describes a way in which something
/// is to be extended. FIXME simplify or split
var ExtensionValue = /** @class */ (function () {
    /// @internal
    function ExtensionValue(
    /// @internal
    kind, 
    /// @internal
    id, 
    /// Holds the field for behaviors, and the array of extensions for
    /// multi extensions. @internal
    value, 
    /// @internal
    type, 
    /// @internal
    prec) {
        if (prec === void 0) { prec = -2 /* None */; }
        this.kind = kind;
        this.id = id;
        this.value = value;
        this.type = type;
        this.prec = prec;
    }
    // Insert this extension in an array of extensions so that it
    // appears after any already-present extensions with the same or
    // lower precedence, but before any extensions with higher
    // precedence.
    ExtensionValue.prototype.collect = function (array) {
        var i = 0;
        while (i < array.length && array[i].prec >= this.prec)
            i++;
        array.splice(i, 0, this);
    };
    return ExtensionValue;
}());
function flatten(extension, prec, seen, target) {
    if (target === void 0) { target = []; }
    if (seen.has(extension))
        return;
    seen.add(extension);
    if (Array.isArray(extension)) {
        for (var _i = 0, extension_1 = extension; _i < extension_1.length; _i++) {
            var ext = extension_1[_i];
            flatten(ext, prec, seen, target);
        }
    }
    else {
        var value = extension;
        if (value.kind == 1 /* Array */) {
            for (var _a = 0, _b = value.value; _a < _b.length; _a++) {
                var ext = _b[_a];
                flatten(ext, value.prec == -2 /* None */ ? prec : value.prec, seen, target);
            }
        }
        else {
            target.push(value.prec != -2 /* None */ ? value : new ExtensionValue(value.kind, value.id, value.value, value.type, prec));
        }
    }
}
var none = [];
/// A configuration describes the fields and behaviors that exist in a
/// given set of extensions. It is created with
/// [`ExtensionGroup.resolve`](#extension.ExtensionGroup.resolve).
var Configuration = /** @class */ (function () {
    /// @internal
    function Configuration(type, extensions, readBehavior, 
    /// Any extensions that weren't an instance of the target
    /// extension group when resolving.
    foreign) {
        if (foreign === void 0) { foreign = []; }
        this.type = type;
        this.extensions = extensions;
        this.readBehavior = readBehavior;
        this.foreign = foreign;
    }
    /// Retrieve the value of a given behavior. When the behavior is
    /// [static](#extension.ExtensionGroup.behavior), the `context`
    /// argument can be omitted.
    Configuration.prototype.getBehavior = function (behavior, context) {
        var data = BehaviorData.get(behavior);
        if (!context && !data.static)
            throw new RangeError("Need a context to retrieve non-static behavior");
        var f = this.readBehavior[data.id];
        return f ? f(context) : data.empty;
    };
    /// Replace one or more extensions with new ones, producing a new
    /// configuration.
    Configuration.prototype.replaceExtensions = function (replace) {
        // FIXME this isn't great yet—have to track the current value to
        // be able to replace it Do we need it at all anymore? Or can we
        // just expect client code to store instantiated extensions and
        // reshuffle them as needed?
        var extensions = this.extensions.map(function (e) {
            for (var _i = 0, replace_1 = replace; _i < replace_1.length; _i++) {
                var _a = replace_1[_i], from = _a[0], to = _a[1];
                if (e == from)
                    return to;
            }
            return e;
        });
        return this.type.resolve(extensions);
    };
    return Configuration;
}());
exports.Configuration = Configuration;
/// Utility function for combining behaviors to fill in a config
/// object from an array of provided configs. Will, by default, error
/// when a field gets two values that aren't ===-equal, but you can
/// provide combine functions per field to do something else.
function combineConfig(configs, defaults, // Should hold only the optional properties of Config, but I haven't managed to express that
combine) {
    if (combine === void 0) { combine = {}; }
    var result = {};
    for (var _i = 0, configs_1 = configs; _i < configs_1.length; _i++) {
        var config = configs_1[_i];
        for (var _a = 0, _b = Object.keys(config); _a < _b.length; _a++) {
            var key = _b[_a];
            var value = config[key], current = result[key];
            if (current === undefined)
                result[key] = value;
            else if (current === value || value === undefined) { } // No conflict
            else if (Object.hasOwnProperty.call(combine, key))
                result[key] = combine[key](current, value);
            else
                throw new Error("Config merge conflict for field " + key);
        }
    }
    for (var key in defaults)
        if (result[key] === undefined)
            result[key] = defaults[key];
    return result;
}
exports.combineConfig = combineConfig;
/// Defaults the fields in a configuration object to values given in
/// `defaults` if they are not already present.
function fillConfig(config, defaults) {
    var result = {};
    for (var key in config)
        result[key] = config[key];
    for (var key in defaults)
        if (result[key] === undefined)
            result[key] = defaults[key];
    return result;
}
exports.fillConfig = fillConfig;

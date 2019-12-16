"use strict";
exports.__esModule = true;
var w3c_keyname_1 = require("../../3rd-parties/w3c-keyname.js");
var view_1 = require("../../view/dist/index.js");
var mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
function normalizeKeyName(name) {
    var parts = name.split(/-(?!$)/);
    var result = parts[parts.length - 1];
    if (result == "Space")
        result = " ";
    var alt, ctrl, shift, meta;
    for (var i = 0; i < parts.length - 1; ++i) {
        var mod = parts[i];
        if (/^(cmd|meta|m)$/i.test(mod))
            meta = true;
        else if (/^a(lt)?$/i.test(mod))
            alt = true;
        else if (/^(c|ctrl|control)$/i.test(mod))
            ctrl = true;
        else if (/^s(hift)?$/i.test(mod))
            shift = true;
        else if (/^mod$/i.test(mod)) {
            if (mac)
                meta = true;
            else
                ctrl = true;
        }
        else
            throw new Error("Unrecognized modifier name: " + mod);
    }
    if (alt)
        result = "Alt-" + result;
    if (ctrl)
        result = "Ctrl-" + result;
    if (meta)
        result = "Meta-" + result;
    if (shift)
        result = "Shift-" + result;
    return result;
}
function modifiers(name, event, shift) {
    if (event.altKey)
        name = "Alt-" + name;
    if (event.ctrlKey)
        name = "Ctrl-" + name;
    if (event.metaKey)
        name = "Meta-" + name;
    if (shift !== false && event.shiftKey)
        name = "Shift-" + name;
    return name;
}
/// Create a view extension that registers a keymap.
///
/// You can add multiple keymap behaviors to an editor. Their
/// priorities determine their precedence (the ones specified early or
/// with high priority get to dispatch first). When a handler has
/// returned `true` for a given key, no further handlers are called.
exports.keymap = function (map) {
    var set = new NormalizedKeymap(map);
    return view_1.EditorView.handleDOMEvents({
        keydown: function (view, event) {
            var handler = set.get(event);
            return handler ? handler(view) : false;
        }
    });
};
/// Stores a set of keybindings in normalized form, and helps looking
/// up the binding for a keyboard event. Only needed when binding keys
/// in some custom way.
var NormalizedKeymap = /** @class */ (function () {
    /// Create a normalized map.
    function NormalizedKeymap(map) {
        this.map = Object.create(null);
        for (var prop in map)
            this.map[normalizeKeyName(prop)] = map[prop];
    }
    /// Look up the binding for the given keyboard event, or `undefined`
    /// if none is found.
    NormalizedKeymap.prototype.get = function (event) {
        var name = w3c_keyname_1.keyName(event), isChar = name.length == 1 && name != " ";
        var direct = this.map[modifiers(name, event, !isChar)];
        if (direct)
            return direct;
        var baseName;
        if (isChar && (event.shiftKey || event.altKey || event.metaKey) &&
            (baseName = w3c_keyname_1.base[event.keyCode]) && baseName != name) {
            var fromCode = this.map[modifiers(baseName, event, true)];
            if (fromCode)
                return fromCode;
        }
        return undefined;
    };
    return NormalizedKeymap;
}());
exports.NormalizedKeymap = NormalizedKeymap;

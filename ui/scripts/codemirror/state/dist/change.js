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
var empty = [];
/// Distinguishes different ways in which positions can be mapped.
var MapMode;
(function (MapMode) {
    /// Map a position to a valid new position, even when its context
    /// was deleted.
    MapMode[MapMode["Simple"] = 0] = "Simple";
    /// Return a negative number if a deletion happens across the
    /// position. This number will be `-(newPos + 1)`, where `newPos` is
    /// the result you'd get with `MapMode.Simple`.
    MapMode[MapMode["TrackDel"] = 1] = "TrackDel";
    /// Return a negative number if the character _before_ the position
    /// is deleted. The result is encoded the same way as with
    /// `MapMode.TrackDel`.
    MapMode[MapMode["TrackBefore"] = 2] = "TrackBefore";
    /// Return a negative number if the character _after_ the position is
    /// deleted.
    MapMode[MapMode["TrackAfter"] = 3] = "TrackAfter";
})(MapMode = exports.MapMode || (exports.MapMode = {}));
/// A change description describes a document change. This is usually
/// used as a superclass of [`Change`](#state.Change), but can be used
/// to store change data without storing the replacement string
/// content.
var ChangeDesc = /** @class */ (function () {
    /// Create a description that replaces the text between positions
    /// `from` and `to` with a new string of length `length`.
    function ChangeDesc(
    /// The start position of the change.
    from, 
    /// The end of the change (as a pre-change document position).
    to, 
    /// The length of the replacing content.
    length) {
        this.from = from;
        this.to = to;
        this.length = length;
    }
    Object.defineProperty(ChangeDesc.prototype, "invertedDesc", {
        /// Get the change description of the inverse of this change.
        get: function () { return new ChangeDesc(this.from, this.from + this.length, this.to - this.from); },
        enumerable: true,
        configurable: true
    });
    /// @internal
    ChangeDesc.prototype.mapPos = function (pos, bias, mode) {
        if (bias === void 0) { bias = -1; }
        if (mode === void 0) { mode = MapMode.Simple; }
        var _a = this, from = _a.from, to = _a.to, length = _a.length;
        if (pos < from)
            return pos;
        if (pos > to)
            return pos + (length - (to - from));
        if (pos == to || pos == from) {
            if (from < pos && mode == MapMode.TrackBefore || to > pos && mode == MapMode.TrackAfter)
                return -pos - 1;
            return (from == to ? bias <= 0 : pos == from) ? from : from + length;
        }
        pos = from + (bias <= 0 ? 0 : length);
        return mode != MapMode.Simple ? -pos - 1 : pos;
    };
    /// Return a JSON-serializeable object representing this value.
    ChangeDesc.prototype.toJSON = function () { return this; };
    /// Create a change description from its JSON representation.
    ChangeDesc.fromJSON = function (json) {
        if (!json || typeof json.from != "number" || typeof json.to != "number" || typeof json.length != "number")
            throw new RangeError("Invalid JSON representation for ChangeDesc");
        return new ChangeDesc(json.from, json.to, json.length);
    };
    return ChangeDesc;
}());
exports.ChangeDesc = ChangeDesc;
/// Change objects describe changes to the document.
var Change = /** @class */ (function (_super) {
    __extends(Change, _super);
    /// Create a change that replaces `from` to `to` with `text`. The
    /// text is given as an array of lines. When it doesn't span lines,
    /// the array has a single element. When it does, a new element is
    /// added for every line. It should never have zero elements.
    function Change(from, to, 
    /// The replacement content.
    text) {
        var _this = _super.call(this, from, to, textLength(text)) || this;
        _this.from = from;
        _this.to = to;
        _this.text = text;
        return _this;
    }
    /// Create the inverse of this change when applied to the given
    /// document. `change.invert(doc).apply(change.apply(doc))` gets you
    /// the same document as the original `doc`.
    Change.prototype.invert = function (doc) {
        return new Change(this.from, this.from + this.length, doc.sliceLines(this.from, this.to));
    };
    /// Apply this change to the given content, returning an updated
    /// version of the document.
    Change.prototype.apply = function (doc) {
        return doc.replace(this.from, this.to, this.text);
    };
    /// Map this change through a mapping, producing a new change that
    /// can be applied to a post-mapping document. May return null if
    /// the mapping completely replaces the region this change would
    /// apply to.
    Change.prototype.map = function (mapping) {
        var from = mapping.mapPos(this.from, 1), to = mapping.mapPos(this.to, -1);
        return from > to ? null : new Change(from, to, this.text);
    };
    Object.defineProperty(Change.prototype, "desc", {
        /// A change description for this change.
        get: function () { return new ChangeDesc(this.from, this.to, this.length); },
        enumerable: true,
        configurable: true
    });
    /// Produce a JSON-serializable object representing this change.
    Change.prototype.toJSON = function () {
        return { from: this.from, to: this.to, text: this.text };
    };
    /// Read a change instance from its JSON representation.
    Change.fromJSON = function (json) {
        if (!json || typeof json.from != "number" || typeof json.to != "number" ||
            !Array.isArray(json.text) || json.text.length == 0 || json.text.some(function (val) { return typeof val != "string"; }))
            throw new RangeError("Invalid JSON representation for Change");
        return new Change(json.from, json.to, json.text);
    };
    return Change;
}(ChangeDesc));
exports.Change = Change;
function textLength(text) {
    var length = -1;
    for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
        var line = text_1[_i];
        length += line.length + 1;
    }
    return length;
}
/// A change set holds a sequence of changes or change descriptions.
var ChangeSet = /** @class */ (function () {
    /// @internal
    function ChangeSet(
    /// The changes in this set.
    changes, 
    /// @internal
    mirror) {
        if (mirror === void 0) { mirror = empty; }
        this.changes = changes;
        this.mirror = mirror;
    }
    Object.defineProperty(ChangeSet.prototype, "length", {
        /// The number of changes in the set.
        get: function () {
            return this.changes.length;
        },
        enumerable: true,
        configurable: true
    });
    /// Change sets can track which changes are inverses of each other,
    /// to allow robust position mapping in situations where changes are
    /// undone and then redone again. This queries which change is the
    /// mirror image of a given change (by index).
    ChangeSet.prototype.getMirror = function (n) {
        for (var i = 0; i < this.mirror.length; i++)
            if (this.mirror[i] == n)
                return this.mirror[i + (i % 2 ? -1 : 1)];
        return null;
    };
    /// Append a change to this set, returning an extended set. `mirror`
    /// may be the index of a change already in the set, which
    /// [mirrors](#state.ChangeSet.getMirror) the new change.
    ChangeSet.prototype.append = function (change, mirror) {
        return new ChangeSet(this.changes.concat(change), mirror != null ? this.mirror.concat(this.length, mirror) : this.mirror);
    };
    /// Append another change set to this one.
    ChangeSet.prototype.appendSet = function (changes) {
        var _this = this;
        return changes.length == 0 ? this :
            this.length == 0 ? changes :
                new ChangeSet(this.changes.concat(changes.changes), this.mirror.concat(changes.mirror.map(function (i) { return i + _this.length; })));
    };
    /// @internal
    ChangeSet.prototype.mapPos = function (pos, bias, mode) {
        if (bias === void 0) { bias = -1; }
        if (mode === void 0) { mode = MapMode.Simple; }
        return this.mapInner(pos, bias, mode, 0, this.length);
    };
    /// @internal
    ChangeSet.prototype.mapInner = function (pos, bias, mode, fromI, toI) {
        var dir = toI < fromI ? -1 : 1;
        var recoverables = null;
        var hasMirrors = this.mirror.length > 0, rec, mirror, deleted = false;
        for (var i = fromI - (dir < 0 ? 1 : 0), endI = toI - (dir < 0 ? 1 : 0); i != endI; i += dir) {
            var _a = this.changes[i], from = _a.from, to = _a.to, length_1 = _a.length;
            if (dir < 0) {
                var len = to - from;
                to = from + length_1;
                length_1 = len;
            }
            if (pos < from)
                continue;
            if (pos > to) {
                pos += length_1 - (to - from);
                continue;
            }
            // Change touches this position
            if (recoverables && (rec = recoverables[i]) != null) { // There's a recovery for this change, and it applies
                pos = from + rec;
                continue;
            }
            if (hasMirrors && (mirror = this.getMirror(i)) != null &&
                (dir > 0 ? mirror > i && mirror < toI : mirror < i && mirror >= toI)) { // A mirror exists
                if (pos > from && pos < to) { // If this change deletes the position, skip forward to the mirror
                    i = mirror;
                    pos = this.changes[i].from + (pos - from);
                    continue;
                }
                // Else store a recoverable
                ;
                (recoverables || (recoverables = {}))[mirror] = pos - from;
            }
            if (pos > from && pos < to) {
                if (mode != MapMode.Simple)
                    deleted = true;
                pos = bias <= 0 ? from : from + length_1;
            }
            else {
                if (from < pos && mode == MapMode.TrackBefore || to > pos && mode == MapMode.TrackAfter)
                    deleted = true;
                pos = (from == to ? bias <= 0 : pos == from) ? from : from + length_1;
            }
        }
        return deleted ? -pos - 1 : pos;
    };
    /// Get a partial [mapping](#state.Mapping) covering part of this
    /// change set.
    ChangeSet.prototype.partialMapping = function (from, to) {
        if (to === void 0) { to = this.length; }
        if (from == 0 && to == this.length)
            return this;
        return new PartialMapping(this, from, to);
    };
    /// Summarize this set of changes as a minimal sequence of changed
    /// ranges, sored by position. For example, if you have changes
    /// deleting between 1 and 4 and inserting a character at 1, the
    /// result would be a single range saying 1 to 4 in the old doc was
    /// replaced with range 1 to 2 in the new doc.
    ChangeSet.prototype.changedRanges = function () {
        // FIXME cache this?
        var set = [];
        for (var i = 0; i < this.length; i++) {
            var change = this.changes[i];
            var fromA = change.from, toA = change.to, fromB = change.from, toB = change.from + change.length;
            if (i < this.length - 1) {
                var mapping = this.partialMapping(i + 1);
                fromB = mapping.mapPos(fromB, 1);
                toB = mapping.mapPos(toB, -1);
            }
            if (i > 0) {
                var mapping = this.partialMapping(i, 0);
                fromA = mapping.mapPos(fromA, 1);
                toA = mapping.mapPos(toA, -1);
            }
            new ChangedRange(fromA, toA, fromB, toB).addToSet(set);
        }
        return set;
    };
    Object.defineProperty(ChangeSet.prototype, "desc", {
        /// Convert a set of changes to a set of change descriptions.
        get: function () {
            if (this.changes.length == 0 || this.changes[0] instanceof ChangeDesc)
                return this;
            return new ChangeSet(this.changes.map(function (ch) { return ch.desc; }), this.mirror);
        },
        enumerable: true,
        configurable: true
    });
    /// Create a JSON-serializable representation of this change set.
    ChangeSet.prototype.toJSON = function () {
        var changes = this.changes.map(function (change) { return change.toJSON(); });
        return this.mirror.length == 0 ? changes : { mirror: this.mirror, changes: changes };
    };
    /// Read a change set from its JSON representation.
    ChangeSet.fromJSON = function (ChangeType, json) {
        var mirror, changes;
        if (Array.isArray(json)) {
            mirror = empty;
            changes = json;
        }
        else if (!json || !Array.isArray(json.mirror) || !Array.isArray(json.changes)) {
            throw new RangeError("Invalid JSON representation for ChangeSet");
        }
        else {
            ;
            (mirror = json.mirror, changes = json.changes);
        }
        return new ChangeSet(changes.map(function (ch) { return ChangeType.fromJSON(ch); }), mirror);
    };
    /// The empty change set.
    ChangeSet.empty = new ChangeSet(empty);
    return ChangeSet;
}());
exports.ChangeSet = ChangeSet;
var PartialMapping = /** @class */ (function () {
    function PartialMapping(changes, from, to) {
        this.changes = changes;
        this.from = from;
        this.to = to;
    }
    PartialMapping.prototype.mapPos = function (pos, bias, mode) {
        if (bias === void 0) { bias = -1; }
        if (mode === void 0) { mode = MapMode.Simple; }
        return this.changes.mapInner(pos, bias, mode, this.from, this.to);
    };
    return PartialMapping;
}());
/// A changed range represents a replacement as two absolute ranges,
/// one pointing into the old document (the replaced content) and one
/// pointing into the new document (the content that replaces it).
var ChangedRange = /** @class */ (function () {
    // FIXME store unchanged ranges instead?
    function ChangedRange(
    /// The start of the replaced range in the old document.
    fromA, 
    /// The end of the replaced range in the old document.
    toA, 
    /// The start of the replacing range in the new document.
    fromB, 
    /// The end of the replacing range in the new document.
    toB) {
        this.fromA = fromA;
        this.toA = toA;
        this.fromB = fromB;
        this.toB = toB;
    }
    /// @internal
    ChangedRange.prototype.join = function (other) {
        return new ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
    };
    /// @internal
    // FIXME used by view. Document?
    ChangedRange.prototype.addToSet = function (set) {
        var i = set.length, me = this;
        for (; i > 0; i--) {
            var range = set[i - 1];
            if (range.fromA > me.toA)
                continue;
            if (range.toA < me.fromA)
                break;
            me = me.join(range);
            set.splice(i - 1, 1);
        }
        set.splice(i, 0, me);
        return set;
    };
    Object.defineProperty(ChangedRange.prototype, "lenDiff", {
        /// The difference in document length created by this change
        /// (positive when the document grew).
        get: function () { return (this.toB - this.fromB) - (this.toA - this.fromA); },
        enumerable: true,
        configurable: true
    });
    /// @internal
    ChangedRange.mapPos = function (pos, bias, changes) {
        var off = 0;
        for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
            var range = changes_1[_i];
            if (pos < range.fromA)
                break;
            if (pos <= range.toA) {
                var side = range.toA == range.fromA ? bias : pos == range.fromA ? -1 : pos == range.toA ? 1 : bias;
                return side < 0 ? range.fromB : range.toB;
            }
            off = range.toB - range.toA;
        }
        return pos + off;
    };
    return ChangedRange;
}());
exports.ChangedRange = ChangedRange;

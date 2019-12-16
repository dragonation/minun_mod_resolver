"use strict";
exports.__esModule = true;
var text_1 = require("../../text/dist/index.js");
/// A single selection range. When
/// [`allowMultipleSelections`](#state.EditorState^allowMultipleSelections)
/// is enabled, a [selection](#state.EditorSelection) may hold
/// multiple ranges. By default, selections hold exactly one range.
var SelectionRange = /** @class */ (function () {
    /// Create a range. `head` defaults to `anchor` when not given.
    function SelectionRange(
    /// The anchor of the range—the side that doesn't move when you
    /// extend it.
    anchor, 
    /// The head of the range, which is moved when the range is
    /// [extended](#state.SelectionRange.extend).
    head) {
        if (head === void 0) { head = anchor; }
        this.anchor = anchor;
        this.head = head;
    }
    Object.defineProperty(SelectionRange.prototype, "from", {
        /// The lower side of the range.
        get: function () { return Math.min(this.anchor, this.head); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SelectionRange.prototype, "to", {
        /// The upper side of the range.
        get: function () { return Math.max(this.anchor, this.head); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(SelectionRange.prototype, "empty", {
        /// True when `anchor` and `head` are at the same position.
        get: function () { return this.anchor == this.head; },
        enumerable: true,
        configurable: true
    });
    /// Map this range through a mapping.
    SelectionRange.prototype.map = function (mapping) {
        var anchor = mapping.mapPos(this.anchor), head = mapping.mapPos(this.head);
        if (anchor == this.anchor && head == this.head)
            return this;
        else
            return new SelectionRange(anchor, head);
    };
    /// Extend this range to cover at least `from` to `to`.
    SelectionRange.prototype.extend = function (from, to) {
        if (to === void 0) { to = from; }
        if (from <= this.anchor && to >= this.anchor)
            return new SelectionRange(from, to);
        var head = Math.abs(from - this.anchor) > Math.abs(to - this.anchor) ? from : to;
        return new SelectionRange(this.anchor, head);
    };
    /// Compare this range to another range.
    SelectionRange.prototype.eq = function (other) {
        return this.anchor == other.anchor && this.head == other.head;
    };
    /// Return a JSON-serializable object representing the range.
    SelectionRange.prototype.toJSON = function () { return this; };
    /// Convert a JSON representation of a range to a `SelectionRange`
    /// instance.
    SelectionRange.fromJSON = function (json) {
        if (!json || typeof json.anchor != "number" || typeof json.head != "number")
            throw new RangeError("Invalid JSON representation for SelectionRange");
        return new SelectionRange(json.anchor, json.head);
    };
    /// @internal FIXME export?
    SelectionRange.groupAt = function (state, pos, bias) {
        if (bias === void 0) { bias = 1; }
        // FIXME at some point, take language-specific identifier characters into account
        var line = state.doc.lineAt(pos), linePos = pos - line.start;
        if (line.length == 0)
            return new SelectionRange(pos);
        if (linePos == 0)
            bias = 1;
        else if (linePos == line.length)
            bias = -1;
        var read = linePos + (bias < 0 ? -1 : 0), type = text_1.charType(line.slice(read, read + 1));
        var from = pos, to = pos;
        for (var lineFrom = linePos; lineFrom > 0 && text_1.charType(line.slice(lineFrom - 1, lineFrom)) == type; lineFrom--)
            from--;
        for (var lineTo = linePos; lineTo < line.length && text_1.charType(line.slice(lineTo, lineTo + 1)) == type; lineTo++)
            to++;
        return new SelectionRange(to, from);
    };
    return SelectionRange;
}());
exports.SelectionRange = SelectionRange;
/// An editor selection holds one or more selection ranges.
var EditorSelection = /** @class */ (function () {
    /// @internal
    function EditorSelection(
    /// The ranges in the selection, sorted by position. Ranges cannot
    /// overlap (but they may touch, if they aren't empty).
    ranges, 
    /// The index of the _primary_ range in the selection (which is
    /// usually the range that was added last).
    primaryIndex) {
        if (primaryIndex === void 0) { primaryIndex = 0; }
        this.ranges = ranges;
        this.primaryIndex = primaryIndex;
    }
    /// Map a selection through a mapping. Mostly used to adjust the
    /// selection position for changes.
    EditorSelection.prototype.map = function (mapping) {
        return EditorSelection.create(this.ranges.map(function (r) { return r.map(mapping); }), this.primaryIndex);
    };
    /// Compare this selection to another selection.
    EditorSelection.prototype.eq = function (other) {
        if (this.ranges.length != other.ranges.length ||
            this.primaryIndex != other.primaryIndex)
            return false;
        for (var i = 0; i < this.ranges.length; i++)
            if (!this.ranges[i].eq(other.ranges[i]))
                return false;
        return true;
    };
    Object.defineProperty(EditorSelection.prototype, "primary", {
        /// Get the primary selection range. Usually, you should make sure
        /// your code applies to _all_ ranges, by using transaction methods
        /// like [`forEachRange`](#state.transaction.forEachRange).
        get: function () { return this.ranges[this.primaryIndex]; },
        enumerable: true,
        configurable: true
    });
    /// Make sure the selection only has one range. Returns a selection
    /// holding only the primary range from this selection.
    EditorSelection.prototype.asSingle = function () {
        return this.ranges.length == 1 ? this : new EditorSelection([this.primary]);
    };
    /// Extend this selection with an extra range.
    EditorSelection.prototype.addRange = function (range, primary) {
        if (primary === void 0) { primary = true; }
        return EditorSelection.create([range].concat(this.ranges), primary ? 0 : this.primaryIndex + 1);
    };
    /// Replace a given range with another range, and then normalize the
    /// selection to merge and sort ranges if necessary.
    EditorSelection.prototype.replaceRange = function (range, which) {
        if (which === void 0) { which = this.primaryIndex; }
        var ranges = this.ranges.slice();
        ranges[which] = range;
        return EditorSelection.create(ranges, this.primaryIndex);
    };
    /// Convert this selection to an object that can be serialized to
    /// JSON.
    EditorSelection.prototype.toJSON = function () {
        return this.ranges.length == 1 ? this.ranges[0].toJSON() :
            { ranges: this.ranges.map(function (r) { return r.toJSON(); }), primaryIndex: this.primaryIndex };
    };
    /// Create a selection from a JSON representation.
    EditorSelection.fromJSON = function (json) {
        if (json && Array.isArray(json.ranges)) {
            if (typeof json.primaryIndex != "number" || json.primaryIndex >= json.ranges.length)
                throw new RangeError("Invalid JSON representation for EditorSelection");
            return new EditorSelection(json.ranges.map(function (r) { return SelectionRange.fromJSON(r); }), json.primaryIndex);
        }
        return new EditorSelection([SelectionRange.fromJSON(json)]);
    };
    /// Create a selection holding a single range.
    EditorSelection.single = function (anchor, head) {
        if (head === void 0) { head = anchor; }
        return new EditorSelection([new SelectionRange(anchor, head)], 0);
    };
    /// Sort and merge the given set of ranges, creating a valid
    /// selection.
    EditorSelection.create = function (ranges, primaryIndex) {
        if (primaryIndex === void 0) { primaryIndex = 0; }
        for (var pos = 0, i = 0; i < ranges.length; i++) {
            var range = ranges[i];
            if (range.empty ? range.from <= pos : range.from < pos)
                return normalized(ranges.slice(), primaryIndex);
            pos = range.to;
        }
        return new EditorSelection(ranges, primaryIndex);
    };
    return EditorSelection;
}());
exports.EditorSelection = EditorSelection;
function normalized(ranges, primaryIndex) {
    if (primaryIndex === void 0) { primaryIndex = 0; }
    var primary = ranges[primaryIndex];
    ranges.sort(function (a, b) { return a.from - b.from; });
    primaryIndex = ranges.indexOf(primary);
    for (var i = 1; i < ranges.length; i++) {
        var range = ranges[i], prev = ranges[i - 1];
        if (range.empty ? range.from <= prev.to : range.from < prev.to) {
            var from = prev.from, to = Math.max(range.to, prev.to);
            if (i <= primaryIndex)
                primaryIndex--;
            ranges.splice(--i, 2, range.anchor > range.head ? new SelectionRange(to, from) : new SelectionRange(from, to));
        }
    }
    return new EditorSelection(ranges, primaryIndex);
}

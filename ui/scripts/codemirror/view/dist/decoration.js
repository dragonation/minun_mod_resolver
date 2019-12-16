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
var state_1 = require("../../state/dist/index.js");
var rangeset_1 = require("../../rangeset/dist/rangeset.js");
var attributes_1 = require("./attributes.js");
/// Widgets added to the content are described by subclasses of this
/// class. This makes it possible to delay creating of the DOM
/// structure for a widget until it is needed, and to avoid redrawing
/// widgets even when the decorations that define them are recreated.
/// `T` can be a type of value passed to instances of the widget type.
var WidgetType = /** @class */ (function () {
    /// Create an instance of this widget type.
    function WidgetType(
    /// @internal
    value) {
        this.value = value;
    }
    /// Compare this instance to another instance of the same class. By
    /// default, it'll compare the instances' parameters with `===`.
    WidgetType.prototype.eq = function (value) { return this.value === value; };
    /// Update a DOM element created by a widget of the same type but
    /// with a different value to reflect this widget. May return true
    /// to indicate that it could update, false to indicate it couldn't
    /// (in which case the widget will be redrawn). The default
    /// implementation just returns false.
    WidgetType.prototype.updateDOM = function (dom) { return false; };
    /// @internal
    WidgetType.prototype.compare = function (other) {
        return this == other || this.constructor == other.constructor && this.eq(other.value);
    };
    Object.defineProperty(WidgetType.prototype, "estimatedHeight", {
        /// The estimated height this widget will have, to be used when
        /// estimating the height of content that hasn't been drawn. May
        /// return -1 to indicate you don't know. The default implementation
        /// returns -1.
        get: function () { return -1; },
        enumerable: true,
        configurable: true
    });
    /// Can be used to configure which kinds of events inside the widget
    /// should be ignored by the editor. The default is to ignore all
    /// events.
    WidgetType.prototype.ignoreEvent = function (event) { return true; };
    Object.defineProperty(WidgetType.prototype, "customView", {
        //// @internal
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    return WidgetType;
}());
exports.WidgetType = WidgetType;
var INLINE_BIG_SIDE = 1e8, BLOCK_BIG_SIDE = 2e8;
/// The different types of blocks that can occur in an editor view.
var BlockType;
(function (BlockType) {
    /// A line of text.
    BlockType[BlockType["Text"] = 0] = "Text";
    /// A block widget associated with the position after it.
    BlockType[BlockType["WidgetBefore"] = 1] = "WidgetBefore";
    /// A block widget associated with the position before it.
    BlockType[BlockType["WidgetAfter"] = 2] = "WidgetAfter";
    /// A block widget [replacing](#view.Decoration^replace) a range of content.
    BlockType[BlockType["WidgetRange"] = 3] = "WidgetRange";
})(BlockType = exports.BlockType || (exports.BlockType = {}));
/// A decoration provides information on how to draw or style a piece
/// of content. You'll usually use it wrapped in a
/// [`Range`](#rangeset.Range), which adds a start and
/// end position.
var Decoration = /** @class */ (function (_super) {
    __extends(Decoration, _super);
    /// @internal
    function Decoration(
    /// @internal
    startSide, 
    /// @internal
    endSide, 
    /// @internal
    widget, 
    /// The config object used to create this decoration.
    spec) {
        var _this = _super.call(this) || this;
        _this.startSide = startSide;
        _this.endSide = endSide;
        _this.widget = widget;
        _this.spec = spec;
        return _this;
    }
    Object.defineProperty(Decoration.prototype, "point", {
        /// @internal
        get: function () { return false; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Decoration.prototype, "heightRelevant", {
        /// @internal
        get: function () { return false; },
        enumerable: true,
        configurable: true
    });
    /// Create a mark decoration, which influences the styling of the
    /// text in its range.
    Decoration.mark = function (from, to, spec) {
        if (from >= to)
            throw new RangeError("Mark decorations may not be empty");
        return new rangeset_1.Range(from, to, new MarkDecoration(spec));
    };
    /// Create a widget decoration, which adds an element at the given
    /// position.
    Decoration.widget = function (pos, spec) {
        var side = spec.side || 0;
        if (spec.block)
            side += (BLOCK_BIG_SIDE + 1) * (side > 0 ? 1 : -1);
        return new rangeset_1.Range(pos, pos, new PointDecoration(spec, side, side, !!spec.block, spec.widget));
    };
    /// Create a replace decoration which replaces the given range with
    /// a widget, or simply hides it.
    Decoration.replace = function (from, to, spec) {
        var block = !!spec.block;
        var _a = getInclusive(spec), start = _a.start, end = _a.end;
        var startSide = block ? -BLOCK_BIG_SIDE * (start ? 2 : 1) : INLINE_BIG_SIDE * (start ? -1 : 1);
        var endSide = block ? BLOCK_BIG_SIDE * (end ? 2 : 1) : INLINE_BIG_SIDE * (end ? 1 : -1);
        if (from > to || (from == to && startSide > 0 && endSide < 0))
            throw new RangeError("Invalid range for replacement decoration");
        return new rangeset_1.Range(from, Math.max(from, to), new PointDecoration(spec, startSide, endSide, block, spec.widget || null));
    };
    /// Create a line decoration, which can add DOM attributes to the
    /// line starting at the given position.
    Decoration.line = function (start, spec) {
        return new rangeset_1.Range(start, start, new LineDecoration(spec));
    };
    /// Build a [`DecorationSet`](#view.DecorationSet) from the given
    /// decorated range or ranges.
    Decoration.set = function (of) {
        return rangeset_1.RangeSet.of(of);
    };
    /// @internal
    Decoration.prototype.hasHeight = function () { return this.widget ? this.widget.estimatedHeight > -1 : false; };
    /// @internal
    Decoration.prototype.mapSimple = function (mapping, from, to) {
        var newFrom = mapping.mapPos(from, this.startSide, state_1.MapMode.TrackDel);
        if (from == to && this.startSide == this.endSide)
            return newFrom < 0 ? null : new rangeset_1.Range(newFrom, newFrom, this);
        var newTo = mapping.mapPos(to, this.endSide, state_1.MapMode.TrackDel);
        if (newFrom < 0) {
            if (newTo < 0)
                return null;
            newFrom = this.startSide >= 0 ? -(newFrom + 1) : mapping.mapPos(from, 1);
        }
        else if (newTo < 0) {
            newTo = this.endSide < 0 ? -(newTo + 1) : mapping.mapPos(to, -1);
        }
        return newFrom < newTo ? new rangeset_1.Range(newFrom, newTo, this) : null;
    };
    /// The empty set of decorations.
    Decoration.none = rangeset_1.RangeSet.empty;
    return Decoration;
}(rangeset_1.RangeValue));
exports.Decoration = Decoration;
var MarkDecoration = /** @class */ (function (_super) {
    __extends(MarkDecoration, _super);
    function MarkDecoration(spec) {
        var _this = this;
        var _a = getInclusive(spec), start = _a.start, end = _a.end;
        _this = _super.call(this, INLINE_BIG_SIDE * (start ? -1 : 1), INLINE_BIG_SIDE * (end ? 1 : -1), null, spec) || this;
        return _this;
    }
    MarkDecoration.prototype.map = function (mapping, from, to) {
        return this.mapSimple(mapping, from, to);
    };
    MarkDecoration.prototype.eq = function (other) {
        return this == other ||
            other instanceof MarkDecoration &&
                this.spec.tagName == other.spec.tagName &&
                this.spec["class"] == other.spec["class"] &&
                attributes_1.attrsEq(this.spec.attributes || null, other.spec.attributes || null);
    };
    return MarkDecoration;
}(Decoration));
exports.MarkDecoration = MarkDecoration;
var LineDecoration = /** @class */ (function (_super) {
    __extends(LineDecoration, _super);
    function LineDecoration(spec) {
        return _super.call(this, -INLINE_BIG_SIDE, -INLINE_BIG_SIDE, null, spec) || this;
    }
    Object.defineProperty(LineDecoration.prototype, "point", {
        get: function () { return true; },
        enumerable: true,
        configurable: true
    });
    LineDecoration.prototype.map = function (mapping, pos) {
        pos = mapping.mapPos(pos, -1, state_1.MapMode.TrackBefore);
        return pos < 0 ? null : new rangeset_1.Range(pos, pos, this);
    };
    LineDecoration.prototype.eq = function (other) {
        return other instanceof LineDecoration && attributes_1.attrsEq(this.spec.attributes, other.spec.attributes);
    };
    return LineDecoration;
}(Decoration));
exports.LineDecoration = LineDecoration;
var PointDecoration = /** @class */ (function (_super) {
    __extends(PointDecoration, _super);
    function PointDecoration(spec, startSide, endSide, block, widget) {
        var _this = _super.call(this, startSide, endSide, widget, spec) || this;
        _this.block = block;
        return _this;
    }
    Object.defineProperty(PointDecoration.prototype, "point", {
        get: function () { return true; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PointDecoration.prototype, "type", {
        // Only relevant when this.block == true
        get: function () {
            return this.startSide < this.endSide ? BlockType.WidgetRange : this.startSide < 0 ? BlockType.WidgetBefore : BlockType.WidgetAfter;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PointDecoration.prototype, "heightRelevant", {
        get: function () { return this.block || !!this.widget && this.widget.estimatedHeight >= 5; },
        enumerable: true,
        configurable: true
    });
    PointDecoration.prototype.map = function (mapping, from, to) {
        // FIXME make mapping behavior configurable?
        if (this.block) {
            var type = this.type;
            var newFrom = type == BlockType.WidgetAfter ? mapping.mapPos(from, 1, state_1.MapMode.TrackAfter) : mapping.mapPos(from, -1, state_1.MapMode.TrackBefore);
            var newTo = type == BlockType.WidgetRange ? mapping.mapPos(to, 1, state_1.MapMode.TrackAfter) : newFrom;
            return newFrom < 0 || newTo < 0 ? null : new rangeset_1.Range(newFrom, newTo, this);
        }
        else {
            return this.mapSimple(mapping, from, to);
        }
    };
    PointDecoration.prototype.eq = function (other) {
        return other instanceof PointDecoration &&
            widgetsEq(this.widget, other.widget) &&
            this.block == other.block &&
            this.startSide == other.startSide && this.endSide == other.endSide;
    };
    return PointDecoration;
}(Decoration));
exports.PointDecoration = PointDecoration;
function getInclusive(spec) {
    var start = spec.inclusiveStart, end = spec.inclusiveEnd;
    if (start == null)
        start = spec.inclusive;
    if (end == null)
        end = spec.inclusive;
    return { start: start || false, end: end || false };
}
function widgetsEq(a, b) {
    return a == b || !!(a && b && a.compare(b));
}
var MIN_RANGE_GAP = 4;
function addRange(from, to, ranges) {
    if (ranges[ranges.length - 1] + MIN_RANGE_GAP > from)
        ranges[ranges.length - 1] = to;
    else
        ranges.push(from, to);
}
function joinRanges(a, b) {
    if (a.length == 0)
        return b;
    if (b.length == 0)
        return a;
    var result = [];
    for (var iA = 0, iB = 0;;) {
        if (iA < a.length && (iB == b.length || a[iA] < b[iB]))
            addRange(a[iA++], a[iA++], result);
        else if (iB < b.length)
            addRange(b[iB++], b[iB++], result);
        else
            break;
    }
    return result;
}
exports.joinRanges = joinRanges;
var Changes = /** @class */ (function () {
    function Changes() {
        this.content = [];
        this.height = [];
    }
    return Changes;
}());
var DecorationComparator = /** @class */ (function () {
    function DecorationComparator() {
        this.changes = new Changes;
    }
    DecorationComparator.prototype.compareRange = function (from, to, activeA, activeB) {
        addRange(from, to, this.changes.content);
    };
    DecorationComparator.prototype.comparePoint = function (from, to, byA, byB) {
        addRange(from, to, this.changes.content);
        if (from < to || byA.heightRelevant || byB && byB.heightRelevant)
            addRange(from, to, this.changes.height);
    };
    return DecorationComparator;
}());
function findChangedRanges(a, b, diff, lengthA) {
    var comp = new DecorationComparator();
    a.compare(b, diff, comp, lengthA);
    return comp.changes;
}
exports.findChangedRanges = findChangedRanges;

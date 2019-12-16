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
var text_1 = require("../../text/dist/index.js");
var rangeset_1 = require("../../rangeset/dist/rangeset.js");
var decoration_1 = require("./decoration.js");
var wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line"];
var HeightOracle = /** @class */ (function () {
    function HeightOracle() {
        this.doc = text_1.Text.empty;
        this.lineWrapping = false;
        this.heightSamples = {};
        this.lineHeight = 14;
        this.charWidth = 7;
        this.lineLength = 30;
        // Used to track, during updateHeight, if any actual heights changed
        this.heightChanged = false;
    }
    HeightOracle.prototype.heightForGap = function (from, to) {
        var lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
        if (this.lineWrapping)
            lines += Math.ceil(((to - from) - (lines * this.lineLength * 0.5)) / this.lineLength);
        return this.lineHeight * lines;
    };
    HeightOracle.prototype.heightForLine = function (length) {
        if (!this.lineWrapping)
            return this.lineHeight;
        var lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / (this.lineLength - 5)));
        return lines * this.lineHeight;
    };
    HeightOracle.prototype.setDoc = function (doc) { this.doc = doc; return this; };
    HeightOracle.prototype.mustRefresh = function (lineHeights) {
        var newHeight = false;
        for (var i = 0; i < lineHeights.length; i++) {
            var h = lineHeights[i];
            if (h < 0) {
                i++;
            }
            else if (!this.heightSamples[Math.floor(h * 10)]) { // Round to .1 pixels
                newHeight = true;
                this.heightSamples[Math.floor(h * 10)] = true;
            }
        }
        return newHeight;
    };
    HeightOracle.prototype.refresh = function (whiteSpace, lineHeight, charWidth, lineLength, knownHeights) {
        var lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
        var changed = Math.round(lineHeight) != Math.round(this.lineHeight) || this.lineWrapping != lineWrapping;
        this.lineWrapping = lineWrapping;
        this.lineHeight = lineHeight;
        this.charWidth = charWidth;
        this.lineLength = lineLength;
        if (changed) {
            this.heightSamples = {};
            for (var i = 0; i < knownHeights.length; i++) {
                var h = knownHeights[i];
                if (h < 0)
                    i++;
                else
                    this.heightSamples[Math.floor(h * 10)] = true;
            }
        }
        return changed;
    };
    return HeightOracle;
}());
exports.HeightOracle = HeightOracle;
// This object is used by `updateHeight` to make DOM measurements
// arrive at the right nides. The `heights` array is a sequence of
// block heights, starting from position `from`.
var MeasuredHeights = /** @class */ (function () {
    function MeasuredHeights(from, heights) {
        this.from = from;
        this.heights = heights;
        this.index = 0;
    }
    Object.defineProperty(MeasuredHeights.prototype, "more", {
        get: function () { return this.index < this.heights.length; },
        enumerable: true,
        configurable: true
    });
    return MeasuredHeights;
}());
exports.MeasuredHeights = MeasuredHeights;
/// Record used to represent information about a block-level element
/// in the editor view.
var BlockInfo = /** @class */ (function () {
    /// @internal
    function BlockInfo(
    /// The start of the element in the document.
    from, 
    /// The length of the element.
    length, 
    /// The top position of the element.
    top, 
    /// Its height.
    height, 
    /// The type of element this is. When querying lines, this may be
    /// an array of all the blocks that make up the line.
    type) {
        this.from = from;
        this.length = length;
        this.top = top;
        this.height = height;
        this.type = type;
    }
    Object.defineProperty(BlockInfo.prototype, "to", {
        /// The end of the element as a document position.
        get: function () { return this.from + this.length; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BlockInfo.prototype, "bottom", {
        /// The bottom position of the element.
        get: function () { return this.top + this.height; },
        enumerable: true,
        configurable: true
    });
    /// @internal
    BlockInfo.prototype.join = function (other) {
        var detail = (Array.isArray(this.type) ? this.type : [this])
            .concat(Array.isArray(other.type) ? other.type : [other]);
        return new BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, detail);
    };
    return BlockInfo;
}());
exports.BlockInfo = BlockInfo;
var QueryType;
(function (QueryType) {
    QueryType[QueryType["ByPos"] = 0] = "ByPos";
    QueryType[QueryType["ByHeight"] = 1] = "ByHeight";
    QueryType[QueryType["ByPosNoHeight"] = 2] = "ByPosNoHeight";
})(QueryType = exports.QueryType || (exports.QueryType = {}));
var HeightMap = /** @class */ (function () {
    function HeightMap(length, // The number of characters covered
    height, // Height of this part of the document
    flags) {
        if (flags === void 0) { flags = 2 /* Outdated */; }
        this.length = length;
        this.height = height;
        this.flags = flags;
    }
    Object.defineProperty(HeightMap.prototype, "outdated", {
        get: function () { return (this.flags & 2 /* Outdated */) > 0; },
        set: function (value) { this.flags = (value ? 2 /* Outdated */ : 0) | (this.flags & ~2 /* Outdated */); },
        enumerable: true,
        configurable: true
    });
    HeightMap.prototype.setHeight = function (oracle, height) {
        if (this.height != height) {
            this.height = height;
            oracle.heightChanged = true;
        }
    };
    // Base case is to replace a leaf node, which simply builds a tree
    // from the new nodes and returns that (HeightMapBranch and
    // HeightMapGap override this to actually use from/to)
    HeightMap.prototype.replace = function (from, to, nodes) {
        return HeightMap.of(nodes);
    };
    // Again, these are base cases, and are overridden for branch and gap nodes.
    HeightMap.prototype.decomposeLeft = function (to, result) { result.push(this); };
    HeightMap.prototype.decomposeRight = function (from, result) { result.push(this); };
    HeightMap.prototype.applyChanges = function (decorations, oldDoc, oracle, changes) {
        var me = this;
        for (var i = changes.length - 1; i >= 0; i--) {
            var _a = changes[i], fromA = _a.fromA, toA = _a.toA, fromB = _a.fromB, toB = _a.toB;
            var start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
            var end = start.to >= toA ? start : me.lineAt(toA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
            toB += end.to - toA;
            toA = end.to;
            while (i > 0 && start.from <= changes[i - 1].toA) {
                fromA = changes[i - 1].fromA;
                fromB = changes[i - 1].fromB;
                i--;
                if (fromA < start.from)
                    start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
            }
            fromB += start.from - fromA;
            fromA = start.from;
            var nodes = NodeBuilder.build(oracle, decorations, fromB, toB);
            me = me.replace(fromA, toA, nodes);
        }
        return me.updateHeight(oracle, 0);
    };
    HeightMap.empty = function () { return new HeightMapText(0, 0); };
    // nodes uses null values to indicate the position of line breaks.
    // There are never line breaks at the start or end of the array, or
    // two line breaks next to each other, and the array isn't allowed
    // to be empty (same restrictions as return value from the builder).
    HeightMap.of = function (nodes) {
        if (nodes.length == 1)
            return nodes[0];
        var i = 0, j = nodes.length, before = 0, after = 0;
        for (;;) {
            if (i == j) {
                if (before > after * 2) {
                    var split = nodes[i - 1];
                    if (split["break"])
                        nodes.splice(--i, 1, split.left, null, split.right);
                    else
                        nodes.splice(--i, 1, split.left, split.right);
                    j += 1 + split["break"];
                    before -= split.size;
                }
                else if (after > before * 2) {
                    var split = nodes[j];
                    if (split["break"])
                        nodes.splice(j, 1, split.left, null, split.right);
                    else
                        nodes.splice(j, 1, split.left, split.right);
                    j += 2 + split["break"];
                    after -= split.size;
                }
                else {
                    break;
                }
            }
            else if (before < after) {
                var next = nodes[i++];
                if (next)
                    before += next.size;
            }
            else {
                var next = nodes[--j];
                if (next)
                    after += next.size;
            }
        }
        var brk = 0;
        if (nodes[i - 1] == null) {
            brk = 1;
            i--;
        }
        else if (nodes[i] == null) {
            brk = 1;
            j++;
        }
        return new HeightMapBranch(HeightMap.of(nodes.slice(0, i)), brk, HeightMap.of(nodes.slice(j)));
    };
    return HeightMap;
}());
exports.HeightMap = HeightMap;
HeightMap.prototype.size = 1;
var HeightMapBlock = /** @class */ (function (_super) {
    __extends(HeightMapBlock, _super);
    function HeightMapBlock(length, height, type) {
        var _this = _super.call(this, length, height) || this;
        _this.type = type;
        return _this;
    }
    HeightMapBlock.prototype.blockAt = function (height, doc, top, offset) {
        return new BlockInfo(offset, this.length, top, this.height, this.type);
    };
    HeightMapBlock.prototype.lineAt = function (value, type, doc, top, offset) {
        return this.blockAt(0, doc, top, offset);
    };
    HeightMapBlock.prototype.forEachLine = function (from, to, doc, top, offset, f) {
        f(this.blockAt(0, doc, top, offset));
    };
    HeightMapBlock.prototype.updateHeight = function (oracle, offset, force, measured) {
        if (offset === void 0) { offset = 0; }
        if (force === void 0) { force = false; }
        if (measured && measured.from <= offset && measured.more)
            this.setHeight(oracle, measured.heights[measured.index++]);
        this.outdated = false;
        return this;
    };
    HeightMapBlock.prototype.toString = function () { return "block(" + this.length + ")"; };
    return HeightMapBlock;
}(HeightMap));
var HeightMapText = /** @class */ (function (_super) {
    __extends(HeightMapText, _super);
    function HeightMapText(length, height) {
        var _this = _super.call(this, length, height, decoration_1.BlockType.Text) || this;
        _this.collapsed = 0; // Amount of collapsed content in the line
        _this.widgetHeight = 0; // Maximum inline widget height
        return _this;
    }
    HeightMapText.prototype.replace = function (from, to, nodes) {
        if (nodes.length == 1 && nodes[0] instanceof HeightMapText && Math.abs(this.length - nodes[0].length) < 10) {
            nodes[0].height = this.height;
            return nodes[0];
        }
        else {
            return HeightMap.of(nodes);
        }
    };
    HeightMapText.prototype.updateHeight = function (oracle, offset, force, measured) {
        if (offset === void 0) { offset = 0; }
        if (force === void 0) { force = false; }
        if (measured && measured.from <= offset && measured.more)
            this.setHeight(oracle, measured.heights[measured.index++]);
        else if (force || this.outdated)
            this.setHeight(oracle, Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)));
        this.outdated = false;
        return this;
    };
    HeightMapText.prototype.toString = function () {
        return "line(" + this.length + (this.collapsed ? -this.collapsed : "") + (this.widgetHeight ? ":" + this.widgetHeight : "") + ")";
    };
    return HeightMapText;
}(HeightMapBlock));
var HeightMapGap = /** @class */ (function (_super) {
    __extends(HeightMapGap, _super);
    function HeightMapGap(length) {
        return _super.call(this, length, 0) || this;
    }
    HeightMapGap.prototype.lines = function (doc, offset) {
        var firstLine = doc.lineAt(offset).number, lastLine = doc.lineAt(offset + this.length).number;
        return { firstLine: firstLine, lastLine: lastLine, lineHeight: this.height / (lastLine - firstLine + 1) };
    };
    HeightMapGap.prototype.blockAt = function (height, doc, top, offset) {
        var _a = this.lines(doc, offset), firstLine = _a.firstLine, lastLine = _a.lastLine, lineHeight = _a.lineHeight;
        var line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top) / lineHeight)));
        var _b = doc.line(firstLine + line), start = _b.start, length = _b.length;
        return new BlockInfo(start, length, top + lineHeight * line, lineHeight, decoration_1.BlockType.Text);
    };
    HeightMapGap.prototype.lineAt = function (value, type, doc, top, offset) {
        if (type == QueryType.ByHeight)
            return this.blockAt(value, doc, top, offset);
        if (type == QueryType.ByPosNoHeight) {
            var _a = doc.lineAt(value), start_1 = _a.start, end = _a.end;
            return new BlockInfo(start_1, end - start_1, 0, 0, decoration_1.BlockType.Text);
        }
        var _b = this.lines(doc, offset), firstLine = _b.firstLine, lineHeight = _b.lineHeight;
        var _c = doc.lineAt(value), start = _c.start, length = _c.length, number = _c.number;
        return new BlockInfo(start, length, top + lineHeight * (number - firstLine), lineHeight, decoration_1.BlockType.Text);
    };
    HeightMapGap.prototype.forEachLine = function (from, to, doc, top, offset, f) {
        var _a = this.lines(doc, offset), firstLine = _a.firstLine, lastLine = _a.lastLine, lineHeight = _a.lineHeight;
        for (var line = firstLine; line <= lastLine; line++) {
            var _b = doc.line(line), start = _b.start, end = _b.end;
            if (start > to)
                break;
            if (end >= from)
                f(new BlockInfo(start, end - start, top, top += lineHeight, decoration_1.BlockType.Text));
        }
    };
    HeightMapGap.prototype.replace = function (from, to, nodes) {
        var after = this.length - to;
        if (after > 0) {
            var last = nodes[nodes.length - 1];
            if (last instanceof HeightMapGap)
                nodes[nodes.length - 1] = new HeightMapGap(last.length + after);
            else
                nodes.push(null, new HeightMapGap(after - 1));
        }
        if (from > 0) {
            var first = nodes[0];
            if (first instanceof HeightMapGap)
                nodes[0] = new HeightMapGap(from + first.length);
            else
                nodes.unshift(new HeightMapGap(from - 1), null);
        }
        return HeightMap.of(nodes);
    };
    HeightMapGap.prototype.decomposeLeft = function (to, result) {
        result.push(to == this.length ? this : new HeightMapGap(to));
    };
    HeightMapGap.prototype.decomposeRight = function (from, result) {
        result.push(from == 0 ? this : new HeightMapGap(this.length - from));
    };
    HeightMapGap.prototype.updateHeight = function (oracle, offset, force, measured) {
        if (offset === void 0) { offset = 0; }
        if (force === void 0) { force = false; }
        var end = offset + this.length;
        if (measured && measured.from <= offset + this.length && measured.more) {
            // Fill in part of this gap with measured lines. We know there
            // can't be widgets or collapsed ranges in those lines, because
            // they would already have been added to the heightmap (gaps
            // only contain plain text).
            var nodes = [], pos = Math.max(offset, measured.from);
            if (measured.from > offset)
                nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
            while (pos <= end && measured.more) {
                var len = oracle.doc.lineAt(pos).length;
                if (nodes.length)
                    nodes.push(null);
                var line = new HeightMapText(len, measured.heights[measured.index++]);
                line.outdated = false;
                nodes.push(line);
                pos += len + 1;
            }
            if (pos <= end)
                nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
            oracle.heightChanged = true;
            return HeightMap.of(nodes);
        }
        else if (force || this.outdated) {
            this.setHeight(oracle, oracle.heightForGap(offset, offset + this.length));
            this.outdated = false;
        }
        return this;
    };
    HeightMapGap.prototype.toString = function () { return "gap(" + this.length + ")"; };
    return HeightMapGap;
}(HeightMap));
var HeightMapBranch = /** @class */ (function (_super) {
    __extends(HeightMapBranch, _super);
    function HeightMapBranch(left, brk, right) {
        var _this = _super.call(this, left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 /* Outdated */ : 0)) || this;
        _this.left = left;
        _this.right = right;
        _this.size = left.size + right.size;
        return _this;
    }
    Object.defineProperty(HeightMapBranch.prototype, "break", {
        get: function () { return this.flags & 1 /* Break */; },
        enumerable: true,
        configurable: true
    });
    HeightMapBranch.prototype.blockAt = function (height, doc, top, offset) {
        var mid = top + this.left.height;
        return height < mid || this.right.height == 0 ? this.left.blockAt(height, doc, top, offset)
            : this.right.blockAt(height, doc, mid, offset + this.left.length + this["break"]);
    };
    HeightMapBranch.prototype.lineAt = function (value, type, doc, top, offset) {
        var rightTop = top + this.left.height, rightOffset = offset + this.left.length + this["break"];
        var left = type == QueryType.ByHeight ? value < rightTop || this.right.height == 0 : value < rightOffset;
        var base = left ? this.left.lineAt(value, type, doc, top, offset)
            : this.right.lineAt(value, type, doc, rightTop, rightOffset);
        if (this["break"] || (left ? base.to < rightOffset : base.from > rightOffset))
            return base;
        var subQuery = type == QueryType.ByPosNoHeight ? QueryType.ByPosNoHeight : QueryType.ByPos;
        if (left)
            return base.join(this.right.lineAt(rightOffset, subQuery, doc, rightTop, rightOffset));
        else
            return this.left.lineAt(rightOffset, subQuery, doc, top, offset).join(base);
    };
    HeightMapBranch.prototype.forEachLine = function (from, to, doc, top, offset, f) {
        var rightTop = top + this.left.height, rightOffset = offset + this.left.length + this["break"];
        if (this["break"]) {
            if (from < rightOffset)
                this.left.forEachLine(from, to, doc, top, offset, f);
            if (to >= rightOffset)
                this.right.forEachLine(from, to, doc, rightTop, rightOffset, f);
        }
        else {
            var mid = this.lineAt(rightOffset, QueryType.ByPos, doc, top, offset);
            if (from < mid.from)
                this.left.forEachLine(from, mid.from - 1, doc, top, offset, f);
            if (mid.to >= from && mid.from <= to)
                f(mid);
            if (to > mid.to)
                this.right.forEachLine(mid.to + 1, to, doc, rightTop, rightOffset, f);
        }
    };
    HeightMapBranch.prototype.replace = function (from, to, nodes) {
        var rightStart = this.left.length + this["break"];
        if (to < rightStart)
            return this.balanced(this.left.replace(from, to, nodes), this.right);
        if (from > this.left.length)
            return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
        var result = [];
        if (from > 0)
            this.decomposeLeft(from, result);
        var left = result.length;
        for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
            var node = nodes_1[_i];
            result.push(node);
        }
        if (from > 0)
            mergeGaps(result, left - 1);
        if (to < this.length) {
            var right = result.length;
            this.decomposeRight(to, result);
            mergeGaps(result, right);
        }
        return HeightMap.of(result);
    };
    HeightMapBranch.prototype.decomposeLeft = function (to, result) {
        var left = this.left.length;
        if (to <= left)
            return this.left.decomposeLeft(to, result);
        result.push(this.left);
        if (this["break"]) {
            left++;
            if (to >= left)
                result.push(null);
        }
        if (to > left)
            this.right.decomposeLeft(to - left, result);
    };
    HeightMapBranch.prototype.decomposeRight = function (from, result) {
        var left = this.left.length, right = left + this["break"];
        if (from >= right)
            return this.right.decomposeRight(from - right, result);
        if (from < left)
            this.left.decomposeRight(from, result);
        if (this["break"] && from < right)
            result.push(null);
        result.push(this.right);
    };
    HeightMapBranch.prototype.balanced = function (left, right) {
        if (left.size > 2 * right.size || right.size > 2 * left.size)
            return HeightMap.of(this["break"] ? [left, null, right] : [left, right]);
        this.left = left;
        this.right = right;
        this.height = left.height + right.height;
        this.outdated = left.outdated || right.outdated;
        this.size = left.size + right.size;
        this.length = left.length + this["break"] + right.length;
        return this;
    };
    HeightMapBranch.prototype.updateHeight = function (oracle, offset, force, measured) {
        if (offset === void 0) { offset = 0; }
        if (force === void 0) { force = false; }
        var _a = this, left = _a.left, right = _a.right, rightStart = offset + left.length + this["break"], rebalance = null;
        if (measured && measured.from <= offset + left.length && measured.more)
            rebalance = left = left.updateHeight(oracle, offset, force, measured);
        else
            left.updateHeight(oracle, offset, force);
        if (measured && measured.from <= rightStart + right.length && measured.more)
            rebalance = right = right.updateHeight(oracle, rightStart, force, measured);
        else
            right.updateHeight(oracle, rightStart, force);
        if (rebalance)
            return this.balanced(left, right);
        this.height = this.left.height + this.right.height;
        this.outdated = false;
        return this;
    };
    HeightMapBranch.prototype.toString = function () { return this.left + (this["break"] ? " " : "-") + this.right; };
    return HeightMapBranch;
}(HeightMap));
function mergeGaps(nodes, around) {
    var before, after;
    if (nodes[around] == null &&
        (before = nodes[around - 1]) instanceof HeightMapGap &&
        (after = nodes[around + 1]) instanceof HeightMapGap)
        nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
}
var relevantWidgetHeight = 5;
var NodeBuilder = /** @class */ (function () {
    function NodeBuilder(pos, oracle) {
        this.pos = pos;
        this.oracle = oracle;
        this.nodes = [];
        this.lineStart = -1;
        this.lineEnd = -1;
        this.covering = null;
        this.writtenTo = pos;
    }
    Object.defineProperty(NodeBuilder.prototype, "isCovered", {
        get: function () {
            return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
        },
        enumerable: true,
        configurable: true
    });
    NodeBuilder.prototype.span = function (from, to) {
        if (this.lineStart > -1) {
            var end = Math.min(to, this.lineEnd), last = this.nodes[this.nodes.length - 1];
            if (last instanceof HeightMapText)
                last.length += end - this.pos;
            else if (end > this.pos || !this.isCovered)
                this.nodes.push(new HeightMapText(end - this.pos, -1));
            this.writtenTo = end;
            if (to > end) {
                this.nodes.push(null);
                this.writtenTo++;
                this.lineStart = -1;
            }
        }
        this.pos = to;
    };
    NodeBuilder.prototype.point = function (from, to, deco) {
        var height = deco.widget ? Math.max(0, deco.widget.estimatedHeight) : 0;
        var len = to - from;
        if (deco.block) {
            this.addBlock(new HeightMapBlock(len, height, deco.type));
        }
        else if (len || height >= relevantWidgetHeight) {
            this.addLineDeco(height, len);
        }
        if (this.lineEnd > -1 && this.lineEnd < this.pos)
            this.lineEnd = this.oracle.doc.lineAt(this.pos).end;
    };
    NodeBuilder.prototype.enterLine = function () {
        if (this.lineStart > -1)
            return;
        var _a = this.oracle.doc.lineAt(this.pos), start = _a.start, end = _a.end;
        this.lineStart = start;
        this.lineEnd = end;
        if (this.writtenTo < start) {
            if (this.writtenTo < start - 1 || this.nodes[this.nodes.length - 1] == null)
                this.nodes.push(new HeightMapGap(start - this.writtenTo - 1));
            this.nodes.push(null);
        }
        if (this.pos > start)
            this.nodes.push(new HeightMapText(this.pos - start, -1));
        this.writtenTo = this.pos;
    };
    NodeBuilder.prototype.ensureLine = function () {
        this.enterLine();
        var last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
        if (last instanceof HeightMapText)
            return last;
        var line = new HeightMapText(0, -1);
        this.nodes.push(line);
        return line;
    };
    NodeBuilder.prototype.addBlock = function (block) {
        this.enterLine();
        if (block.type == decoration_1.BlockType.WidgetAfter && !this.isCovered)
            this.ensureLine();
        this.nodes.push(block);
        this.writtenTo = this.pos = this.pos + block.length;
        if (block.type != decoration_1.BlockType.WidgetBefore)
            this.covering = block;
    };
    NodeBuilder.prototype.addLineDeco = function (height, length) {
        var line = this.ensureLine();
        line.length += length;
        line.collapsed += length;
        line.widgetHeight = Math.max(line.widgetHeight, height);
        this.writtenTo = this.pos = this.pos + length;
    };
    NodeBuilder.prototype.finish = function (from) {
        var last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
        if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered)
            this.nodes.push(new HeightMapText(0, -1));
        else if (this.writtenTo < this.pos || last == null)
            this.nodes.push(new HeightMapGap(this.pos - this.writtenTo));
        var pos = from;
        for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
            var node = _a[_i];
            if (node instanceof HeightMapText)
                node.updateHeight(this.oracle, pos);
            pos += node ? node.length : 1;
        }
        return this.nodes;
    };
    NodeBuilder.prototype.ignore = function (from, to, value) { return from == to && !value.heightRelevant; };
    // Always called with a region that on both sides either stretches
    // to a line break or the end of the document.
    // The returned array uses null to indicate line breaks, but never
    // starts or ends in a line break, or has multiple line breaks next
    // to each other.
    NodeBuilder.build = function (oracle, decorations, from, to) {
        var builder = new NodeBuilder(from, oracle);
        rangeset_1.RangeSet.iterateSpans(decorations, from, to, builder);
        return builder.finish(from);
    };
    return NodeBuilder;
}());

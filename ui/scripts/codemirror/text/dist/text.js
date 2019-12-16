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
/// The document tree type.
var Text = /** @class */ (function () {
    /// @internal
    function Text() {
    }
    /// Get the line description around the given position.
    Text.prototype.lineAt = function (pos) {
        if (pos < 0 || pos > this.length)
            throw new RangeError("Invalid position " + pos + " in document of length " + this.length);
        for (var i = 0; i < lineCache.length; i += 2) {
            if (lineCache[i] != this)
                continue;
            var line = lineCache[i + 1];
            if (line.start <= pos && line.end >= pos)
                return line;
        }
        return cacheLine(this, this.lineInner(pos, false, 1, 0).finish(this));
    };
    /// Get the description for the given (1-based) line number.
    Text.prototype.line = function (n) {
        if (n < 1 || n > this.lines)
            throw new RangeError("Invalid line number " + n + " in " + this.lines + "-line document");
        for (var i = 0; i < lineCache.length; i += 2) {
            if (lineCache[i] != this)
                continue;
            var line = lineCache[i + 1];
            if (line.number == n)
                return line;
        }
        return cacheLine(this, this.lineInner(n, true, 1, 0).finish(this));
    };
    /// Replace a range of the text with the given lines. `text` should
    /// have a length of at least one.
    Text.prototype.replace = function (from, to, text) {
        if (text.length == 0)
            throw new RangeError("An inserted range must have at least one line");
        return this.replaceInner(from, to, text, textLength(text));
    };
    /// Retrieve the lines between the given points.
    Text.prototype.sliceLines = function (from, to) {
        if (to === void 0) { to = this.length; }
        return this.sliceTo(from, to, [""]);
    };
    /// Retrieve the text between the given points.
    Text.prototype.slice = function (from, to, lineSeparator) {
        if (lineSeparator === void 0) { lineSeparator = "\n"; }
        return this.sliceLines(from, to).join(lineSeparator);
    };
    /// Test whether this text is equal to another instance.
    Text.prototype.eq = function (other) { return this == other || eqContent(this, other); };
    /// Iterate over the text. When `dir` is `-1`, iteration happens
    /// from end to start. This will return lines and the breaks between
    /// them as separate strings, and for long lines, might split lines
    /// themselves into multiple chunks as well.
    Text.prototype.iter = function (dir) {
        if (dir === void 0) { dir = 1; }
        return new RawTextCursor(this, dir);
    };
    /// Iterate over a range of the text. When `from` > `to`, the
    /// iterator will run in reverse.
    Text.prototype.iterRange = function (from, to) {
        if (to === void 0) { to = this.length; }
        return new PartialTextCursor(this, from, to);
    };
    /// Iterate over lines in the text, starting at position (_not_ line
    /// number) `from`. An iterator returned by this combines all text
    /// on a line into a single string (which may be expensive for very
    /// long lines), and skips line breaks (its
    /// [`lineBreak`](#text.TextIterator.lineBreak) property is always
    /// false).
    Text.prototype.iterLines = function (from) {
        if (from === void 0) { from = 0; }
        return new LineCursor(this, from);
    };
    /// Flattens the document into a single string, using `"\n"` as line
    /// separator.
    Text.prototype.toString = function () { return this.slice(0, this.length); };
    /// Create a `Text` instance for the given array of lines.
    Text.of = function (text) {
        if (text.length == 0)
            throw new RangeError("A document must have at least one line");
        var length = textLength(text);
        return length < 1024 /* MaxLeaf */ ? new TextLeaf(text, length) : TextNode.from(TextLeaf.split(text, []), length);
    };
    return Text;
}());
exports.Text = Text;
var lineCache = [], lineCachePos = -2, lineCacheSize = 12;
function cacheLine(text, line) {
    lineCachePos = (lineCachePos + 2) % lineCacheSize;
    lineCache[lineCachePos] = text;
    lineCache[lineCachePos + 1] = line;
    return line;
}
// Leaves store an array of strings. There are always line breaks
// between these strings (though not between adjacent leaves). These
// are limited in length, so that bigger documents are constructed as
// a tree structure. Long lines will be broken into a number of
// single-line leaves.
var TextLeaf = /** @class */ (function (_super) {
    __extends(TextLeaf, _super);
    function TextLeaf(text, length) {
        if (length === void 0) { length = textLength(text); }
        var _this = _super.call(this) || this;
        _this.text = text;
        _this.length = length;
        return _this;
    }
    Object.defineProperty(TextLeaf.prototype, "lines", {
        get: function () { return this.text.length; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TextLeaf.prototype, "children", {
        get: function () { return null; },
        enumerable: true,
        configurable: true
    });
    TextLeaf.prototype.replaceInner = function (from, to, text, length) {
        return Text.of(appendText(this.text, appendText(text, sliceText(this.text, 0, from)), to));
    };
    TextLeaf.prototype.sliceTo = function (from, to, target) {
        if (to === void 0) { to = this.length; }
        return appendText(this.text, target, from, to);
    };
    TextLeaf.prototype.lineInner = function (target, isLine, line, offset) {
        for (var i = 0;; i++) {
            var string = this.text[i], end = offset + string.length;
            if ((isLine ? line : end) >= target)
                return new Line(offset, end, line, string);
            offset = end + 1;
            line++;
        }
    };
    TextLeaf.prototype.decomposeStart = function (to, target) {
        target.push(new TextLeaf(sliceText(this.text, 0, to), to));
    };
    TextLeaf.prototype.decomposeEnd = function (from, target) {
        target.push(new TextLeaf(sliceText(this.text, from), this.length - from));
    };
    TextLeaf.prototype.lastLineLength = function () { return this.text[this.text.length - 1].length; };
    TextLeaf.prototype.firstLineLength = function () { return this.text[0].length; };
    TextLeaf.split = function (text, target) {
        var part = [], length = -1;
        for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
            var line = text_1[_i];
            for (;;) {
                var newLength = length + line.length + 1;
                if (newLength < 512 /* BaseLeaf */) {
                    length = newLength;
                    part.push(line);
                    break;
                }
                var cut = 512 /* BaseLeaf */ - length - 1, after = line.charCodeAt(cut);
                if (after >= 0xdc00 && after < 0xe000)
                    cut++;
                part.push(line.slice(0, cut));
                target.push(new TextLeaf(part, 512 /* BaseLeaf */));
                line = line.slice(cut);
                length = -1;
                part = [];
            }
        }
        if (length != -1)
            target.push(new TextLeaf(part, length));
        return target;
    };
    return TextLeaf;
}(Text));
// Nodes provide the tree structure of the `Text` type. They store a
// number of other nodes or leaves, taking care to balance itself on
// changes.
var TextNode = /** @class */ (function (_super) {
    __extends(TextNode, _super);
    function TextNode(children, length) {
        var _this = _super.call(this) || this;
        _this.children = children;
        _this.length = length;
        _this.lines = 1;
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            _this.lines += child.lines - 1;
        }
        return _this;
    }
    TextNode.prototype.replaceInner = function (from, to, text, length) {
        var lengthDiff = length - (to - from), newLength = this.length + lengthDiff;
        if (newLength <= 512 /* BaseLeaf */)
            return new TextLeaf(appendText(this.sliceLines(to), appendText(text, this.sliceTo(0, from, [""]))), newLength);
        var children;
        for (var i = 0, pos = 0; i < this.children.length; i++) {
            var child = this.children[i], end = pos + child.length;
            if (from >= pos && to <= end &&
                (lengthDiff > 0
                    ? child.length + lengthDiff < Math.max(newLength >> (3 /* BranchShift */ - 1), 1024 /* MaxLeaf */)
                    : child.length + lengthDiff > newLength >> (3 /* BranchShift */ + 1))) {
                // Fast path: if the change only affects one child and the
                // child's size remains in the acceptable range, only update
                // that child
                children = this.children.slice();
                children[i] = child.replace(from - pos, to - pos, text);
                return new TextNode(children, newLength);
            }
            else if (end >= from) {
                // Otherwise, we must build up a new array of children
                if (children == null)
                    children = this.children.slice(0, i);
                if (pos < from) {
                    if (end == from)
                        children.push(child);
                    else
                        child.decomposeStart(from - pos, children);
                }
                if (pos <= from && end >= from)
                    TextLeaf.split(text, children);
                if (pos >= to)
                    children.push(child);
                else if (end > to)
                    child.decomposeEnd(to - pos, children);
            }
            pos = end;
        }
        return children ? TextNode.from(children, newLength) : this;
    };
    TextNode.prototype.sliceTo = function (from, to, target) {
        var pos = 0;
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            var end = pos + child.length;
            if (to > pos && from < end)
                child.sliceTo(Math.max(0, from - pos), Math.min(child.length, to - pos), target);
            pos = end;
        }
        return target;
    };
    TextNode.prototype.lineInner = function (target, isLine, line, offset) {
        for (var i = 0;; i++) {
            var child = this.children[i], end = offset + child.length, endLine = line + child.lines - 1;
            if ((isLine ? endLine : end) >= target) {
                var inner = child.lineInner(target, isLine, line, offset), add = void 0;
                if (inner.start == offset && (add = this.lineLengthTo(i))) {
                    ;
                    inner.start -= add;
                    inner.content = null;
                }
                if (inner.end == end && (add = this.lineLengthFrom(i + 1))) {
                    ;
                    inner.end += add;
                    inner.content = null;
                }
                return inner;
            }
            offset = end;
            line = endLine;
        }
    };
    TextNode.prototype.decomposeStart = function (to, target) {
        for (var i = 0, pos = 0;; i++) {
            var child = this.children[i], end = pos + child.length;
            if (end <= to) {
                target.push(child);
            }
            else {
                if (pos < to)
                    child.decomposeStart(to - pos, target);
                break;
            }
            pos = end;
        }
    };
    TextNode.prototype.decomposeEnd = function (from, target) {
        var pos = 0;
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            var end = pos + child.length;
            if (pos >= from)
                target.push(child);
            else if (end > from && pos < from)
                child.decomposeEnd(from - pos, target);
            pos = end;
        }
    };
    TextNode.prototype.lineLengthTo = function (to) {
        var length = 0;
        for (var i = to - 1; i >= 0; i--) {
            var child = this.children[i];
            if (child.lines > 1)
                return length + child.lastLineLength();
            length += child.length;
        }
        return length;
    };
    TextNode.prototype.lastLineLength = function () { return this.lineLengthTo(this.children.length); };
    TextNode.prototype.lineLengthFrom = function (from) {
        var length = 0;
        for (var i = from; i < this.children.length; i++) {
            var child = this.children[i];
            if (child.lines > 1)
                return length + child.firstLineLength();
            length += child.length;
        }
        return length;
    };
    TextNode.prototype.firstLineLength = function () { return this.lineLengthFrom(0); };
    TextNode.from = function (children, length) {
        if (length < 1024 /* MaxLeaf */) {
            var text = [""];
            for (var _i = 0, children_2 = children; _i < children_2.length; _i++) {
                var child = children_2[_i];
                child.sliceTo(0, child.length, text);
            }
            return new TextLeaf(text, length);
        }
        var chunkLength = Math.max(512 /* BaseLeaf */, length >> 3 /* BranchShift */), maxLength = chunkLength << 1, minLength = chunkLength >> 1;
        var chunked = [], currentLength = 0, currentChunk = [];
        function add(child) {
            var childLength = child.length, last;
            if (childLength > maxLength && child instanceof TextNode) {
                for (var _i = 0, _a = child.children; _i < _a.length; _i++) {
                    var node = _a[_i];
                    add(node);
                }
            }
            else if (childLength > minLength && (currentLength > minLength || currentLength == 0)) {
                flush();
                chunked.push(child);
            }
            else if (child instanceof TextLeaf && currentLength > 0 &&
                (last = currentChunk[currentChunk.length - 1]) instanceof TextLeaf &&
                child.length + last.length <= 512 /* BaseLeaf */) {
                currentLength += childLength;
                currentChunk[currentChunk.length - 1] = new TextLeaf(appendText(child.text, last.text.slice()), child.length + last.length);
            }
            else {
                if (currentLength + childLength > chunkLength)
                    flush();
                currentLength += childLength;
                currentChunk.push(child);
            }
        }
        function flush() {
            if (currentLength == 0)
                return;
            chunked.push(currentChunk.length == 1 ? currentChunk[0] : TextNode.from(currentChunk, currentLength));
            currentLength = 0;
            currentChunk.length = 0;
        }
        for (var _a = 0, children_3 = children; _a < children_3.length; _a++) {
            var child = children_3[_a];
            add(child);
        }
        flush();
        return chunked.length == 1 ? chunked[0] : new TextNode(chunked, length);
    };
    return TextNode;
}(Text));
Text.empty = Text.of([""]);
function textLength(text) {
    var length = -1;
    for (var _i = 0, text_2 = text; _i < text_2.length; _i++) {
        var line = text_2[_i];
        length += line.length + 1;
    }
    return length;
}
function appendText(text, target, from, to) {
    if (from === void 0) { from = 0; }
    if (to === void 0) { to = 1e9; }
    for (var pos = 0, i = 0, first = true; i < text.length && pos <= to; i++) {
        var line = text[i], end = pos + line.length;
        if (end >= from) {
            if (end > to)
                line = line.slice(0, to - pos);
            if (pos < from)
                line = line.slice(from - pos);
            if (first) {
                target[target.length - 1] += line;
                first = false;
            }
            else
                target.push(line);
        }
        pos = end + 1;
    }
    return target;
}
function sliceText(text, from, to) {
    return appendText(text, [""], from, to);
}
function eqContent(a, b) {
    if (a.length != b.length || a.lines != b.lines)
        return false;
    var iterA = new RawTextCursor(a), iterB = new RawTextCursor(b);
    for (var offA = 0, offB = 0;;) {
        if (iterA.lineBreak != iterB.lineBreak || iterA.done != iterB.done) {
            return false;
        }
        else if (iterA.done) {
            return true;
        }
        else if (iterA.lineBreak) {
            iterA.next();
            iterB.next();
            offA = offB = 0;
        }
        else {
            var strA = iterA.value.slice(offA), strB = iterB.value.slice(offB);
            if (strA.length == strB.length) {
                if (strA != strB)
                    return false;
                iterA.next();
                iterB.next();
                offA = offB = 0;
            }
            else if (strA.length > strB.length) {
                if (strA.slice(0, strB.length) != strB)
                    return false;
                offA += strB.length;
                iterB.next();
                offB = 0;
            }
            else {
                if (strB.slice(0, strA.length) != strA)
                    return false;
                offB += strA.length;
                iterA.next();
                offA = 0;
            }
        }
    }
}
var RawTextCursor = /** @class */ (function () {
    // @internal
    function RawTextCursor(text, dir) {
        if (dir === void 0) { dir = 1; }
        this.dir = dir;
        this.done = false;
        this.lineBreak = false;
        this.value = "";
        this.nodes = [text];
        this.offsets = [dir > 0 ? 0 : text instanceof TextLeaf ? text.text.length : text.children.length];
    }
    RawTextCursor.prototype.next = function (skip) {
        if (skip === void 0) { skip = 0; }
        for (;;) {
            var last = this.nodes.length - 1;
            if (last < 0) {
                this.done = true;
                this.value = "";
                this.lineBreak = false;
                return this;
            }
            var top_1 = this.nodes[last];
            var offset = this.offsets[last];
            if (top_1 instanceof TextLeaf) {
                // Internal offset with lineBreak == false means we have to
                // count the line break at this position
                if (offset != (this.dir > 0 ? 0 : top_1.text.length) && !this.lineBreak) {
                    this.lineBreak = true;
                    if (skip == 0) {
                        this.value = "\n";
                        return this;
                    }
                    skip--;
                    continue;
                }
                // Otherwise, move to the next string
                var next = top_1.text[offset - (this.dir < 0 ? 1 : 0)];
                this.offsets[last] = (offset += this.dir);
                if (offset == (this.dir > 0 ? top_1.text.length : 0)) {
                    this.nodes.pop();
                    this.offsets.pop();
                }
                this.lineBreak = false;
                if (next.length > skip) {
                    this.value = skip == 0 ? next : this.dir > 0 ? next.slice(skip) : next.slice(0, next.length - skip);
                    return this;
                }
                skip -= next.length;
            }
            else if (offset == (this.dir > 0 ? top_1.children.length : 0)) {
                this.nodes.pop();
                this.offsets.pop();
            }
            else {
                var next = top_1.children[this.dir > 0 ? offset : offset - 1], len = next.length;
                this.offsets[last] = offset + this.dir;
                if (skip > len) {
                    skip -= len;
                }
                else {
                    this.nodes.push(next);
                    this.offsets.push(this.dir > 0 ? 0 : next instanceof TextLeaf ? next.text.length : next.children.length);
                }
            }
        }
    };
    return RawTextCursor;
}());
var PartialTextCursor = /** @class */ (function () {
    function PartialTextCursor(text, start, end) {
        this.value = "";
        this.cursor = new RawTextCursor(text, start > end ? -1 : 1);
        if (start > end) {
            this.skip = text.length - start;
            this.limit = start - end;
        }
        else {
            this.skip = start;
            this.limit = end - start;
        }
    }
    PartialTextCursor.prototype.next = function () {
        if (this.limit <= 0) {
            this.limit = -1;
        }
        else {
            var _a = this.cursor.next(this.skip), value = _a.value, lineBreak = _a.lineBreak;
            this.skip = 0;
            this.value = value;
            var len = lineBreak ? 1 : value.length;
            if (len > this.limit)
                this.value = this.cursor.dir > 0 ? value.slice(0, this.limit) : value.slice(len - this.limit);
            this.limit -= this.value.length;
        }
        return this;
    };
    Object.defineProperty(PartialTextCursor.prototype, "lineBreak", {
        get: function () { return this.cursor.lineBreak; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(PartialTextCursor.prototype, "done", {
        get: function () { return this.limit < 0; },
        enumerable: true,
        configurable: true
    });
    return PartialTextCursor;
}());
var LineCursor = /** @class */ (function () {
    function LineCursor(text, from) {
        if (from === void 0) { from = 0; }
        this.value = "";
        this.done = false;
        this.cursor = text.iter();
        this.skip = from;
    }
    LineCursor.prototype.next = function () {
        if (this.cursor.done) {
            this.done = true;
            this.value = "";
            return this;
        }
        for (this.value = "";;) {
            var _a = this.cursor.next(this.skip), value = _a.value, lineBreak = _a.lineBreak, done = _a.done;
            this.skip = 0;
            if (done || lineBreak)
                return this;
            this.value += value;
        }
    };
    Object.defineProperty(LineCursor.prototype, "lineBreak", {
        get: function () { return false; },
        enumerable: true,
        configurable: true
    });
    return LineCursor;
}());
// FIXME rename start/end to from/to for consistency with other types?
/// This type describes a line in the document. It is created
/// on-demand when lines are [queried](#text.Text.lineAt).
var Line = /** @class */ (function () {
    /// @internal
    function Line(
    /// The position of the start of the line.
    start, 
    /// The position at the end of the line (_before_ the line break,
    /// if this isn't the last line).
    end, 
    /// This line's line number (1-based).
    number, 
    /// @internal
    content) {
        this.start = start;
        this.end = end;
        this.number = number;
        this.content = content;
    }
    Object.defineProperty(Line.prototype, "length", {
        /// The length of the line (not including any line break after it).
        get: function () { return this.end - this.start; },
        enumerable: true,
        configurable: true
    });
    /// Retrieve a part of the content of this line. This is a method,
    /// rather than, say, a string property, to avoid concatenating long
    /// lines whenever they are accessed. Try to write your code, if it
    /// is going to be doing a lot of line-reading, to read only the
    /// parts it needs.
    Line.prototype.slice = function (from, to) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = this.length; }
        if (typeof this.content == "string")
            return to == from + 1 ? this.content.charAt(from) : this.content.slice(from, to);
        if (from == to)
            return "";
        var result = this.content.slice(from, to);
        if (from == 0 && to == this.length)
            this.content = result;
        return result;
    };
    /// @internal
    Line.prototype.finish = function (text) {
        if (this.content == null)
            this.content = new LineContent(text, this.start);
        return this;
    };
    return Line;
}());
exports.Line = Line;
var LineContent = /** @class */ (function () {
    function LineContent(doc, start) {
        this.doc = doc;
        this.start = start;
        this.cursor = null;
        this.strings = null;
    }
    // FIXME quadratic complexity (somewhat) when iterating long lines in small pieces
    LineContent.prototype.slice = function (from, to) {
        if (!this.cursor) {
            this.cursor = this.doc.iter();
            this.strings = [this.cursor.next(this.start).value];
        }
        for (var result = "", pos = 0, i = 0;; i++) {
            if (i == this.strings.length)
                this.strings.push(this.cursor.next().value);
            var string = this.strings[i], end = pos + string.length;
            if (end <= from)
                continue;
            result += string.slice(Math.max(0, from - pos), Math.min(string.length, to - pos));
            if (end >= to)
                return result;
            pos += string.length;
        }
    };
    return LineContent;
}());

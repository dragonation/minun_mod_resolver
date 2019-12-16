"use strict";
exports.__esModule = true;
var text_1 = require("../../text/dist/index.js");
var basicNormalize = String.prototype.normalize ? function (x) { return x.normalize("NFKD"); } : function (x) { return x; };
/// A search cursor provides an iterator over text matches in a
/// document.
var SearchCursor = /** @class */ (function () {
    /// Create a text cursor. The query is the search string, `from` to
    /// `to` provides the region to search.
    ///
    /// When `normalize` is given, it will be called, on both the query
    /// string and the content it is matched against, before comparing.
    /// You can, for example, create a case-insensitive search by
    /// passing `s => s.toLowerCase()`.
    ///
    /// Text is always normalized with
    /// [`.normalize("NFKD")`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
    /// (when supported).
    function SearchCursor(text, query, from, to, normalize) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = text.length; }
        this.text = text;
        /// The current match (only holds a meaningful value after
        /// [`next`](#search.SearchCursor.next) has been called and when
        /// `done` is true).
        this.value = { from: 0, to: 0 };
        /// Whether the end of the iterated region has been reached.
        this.done = false;
        this.matches = [];
        this.buffer = "";
        this.bufferPos = 0;
        this.iter = text.iterRange(from, to);
        this.bufferStart = from;
        this.normalize = normalize ? function (x) { return normalize(basicNormalize(x)); } : basicNormalize;
        this.query = this.normalize(query);
    }
    SearchCursor.prototype.peek = function () {
        if (this.bufferPos == this.buffer.length) {
            this.bufferStart += this.buffer.length;
            this.iter.next();
            if (this.iter.done)
                return -1;
            this.bufferPos = 0;
            this.buffer = this.iter.value;
        }
        return this.buffer.charCodeAt(this.bufferPos);
    };
    /// Look for the next match. Updates the iterator's
    /// [`value`](#search.SearchCursor.value) and
    /// [`done`](#search.SearchCursor.done) properties. Should be called
    /// at least once before using the cursor.
    SearchCursor.prototype.next = function () {
        for (;;) {
            var next = this.peek();
            if (next < 0) {
                this.done = true;
                return this;
            }
            var str = String.fromCharCode(next), start = this.bufferStart + this.bufferPos;
            this.bufferPos++;
            for (;;) {
                var peek = this.peek();
                if (peek < 0 || !text_1.isExtendingChar(peek))
                    break;
                this.bufferPos++;
                str += String.fromCharCode(peek);
            }
            var norm = this.normalize(str);
            for (var i = 0, pos = start;; i++) {
                var code = norm.charCodeAt(i);
                var match = this.match(code, pos);
                if (match) {
                    this.value = match;
                    return this;
                }
                if (i == norm.length - 1)
                    break;
                if (pos == start && i < str.length && str.charCodeAt(i) == code)
                    pos++;
            }
        }
    };
    SearchCursor.prototype.match = function (code, pos) {
        var match = null;
        for (var i = 0; i < this.matches.length; i += 2) {
            var index = this.matches[i], keep = false;
            if (this.query.charCodeAt(index) == code) {
                if (index == this.query.length - 1) {
                    match = { from: this.matches[i + 1], to: pos + 1 };
                }
                else {
                    this.matches[i]++;
                    keep = true;
                }
            }
            if (!keep) {
                this.matches.splice(i, 2);
                i -= 2;
            }
        }
        if (this.query.charCodeAt(0) == code) {
            if (this.query.length == 1)
                match = { from: pos, to: pos + 1 };
            else
                this.matches.push(1, pos);
        }
        return match;
    };
    return SearchCursor;
}());
exports.SearchCursor = SearchCursor;

"use strict";
exports.__esModule = true;
// Counts the column offset in a string, taking tabs into account.
// Used mostly to find indentation.
// FIXME more or less duplicated in indent/src/indent.ts
function countColumn(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
        end = string.search(/[^\s\u00a0]/);
        if (end == -1)
            end = string.length;
    }
    for (var i = startIndex || 0, n = startValue || 0;;) {
        var nextTab = string.indexOf("\t", i);
        if (nextTab < 0 || nextTab >= end)
            return n + (end - i);
        n += nextTab - i;
        n += tabSize - (n % tabSize);
        i = nextTab + 1;
    }
}
// STRING STREAM
/// Encapsulates a single line of input. Given to stream syntax code,
/// which uses it to tokenize the content.
var StringStream = /** @class */ (function () {
    /// @internal
    function StringStream(
    /// The line.
    string, 
    /// Current tab size.
    tabSize) {
        this.string = string;
        this.tabSize = tabSize;
        /// The current position on the line.
        this.pos = 0;
        /// The start position of the current token.
        this.start = 0;
        this.lineStart = 0;
        this.lastColumnPos = 0;
        this.lastColumnValue = 0;
    }
    /// True if we are at the end of the line.
    StringStream.prototype.eol = function () { return this.pos >= this.string.length; };
    /// True if we are at the start of the line.
    StringStream.prototype.sol = function () { return this.pos == this.lineStart; };
    /// Get the next code unit after the current position, or undefined
    /// if we're at the end of the line.
    StringStream.prototype.peek = function () { return this.string.charAt(this.pos) || undefined; };
    /// Read the next code unit and advance `this.pos`.
    StringStream.prototype.next = function () {
        if (this.pos < this.string.length)
            return this.string.charAt(this.pos++);
    };
    /// Match the next character against the given string, regular
    /// expression, or predicate. Consume and return it if it matches.
    StringStream.prototype.eat = function (match) {
        var ch = this.string.charAt(this.pos);
        var ok;
        if (typeof match == "string")
            ok = ch == match;
        else
            ok = ch && (match instanceof RegExp ? match.test(ch) : match(ch));
        if (ok) {
            ++this.pos;
            return ch;
        }
    };
    /// Continue matching characters that match the given string,
    /// regular expression, or predicate function. Return true if any
    /// characters were consumed.
    StringStream.prototype.eatWhile = function (match) {
        var start = this.pos;
        while (this.eat(match)) { }
        return this.pos > start;
    };
    /// Consume whitespace ahead of `this.pos`. Return true if any was
    /// found.
    StringStream.prototype.eatSpace = function () {
        var start = this.pos;
        while (/[\s\u00a0]/.test(this.string.charAt(this.pos)))
            ++this.pos;
        return this.pos > start;
    };
    /// Move to the end of the line.
    StringStream.prototype.skipToEnd = function () { this.pos = this.string.length; };
    /// Move to directly before the given character, if found on the
    /// current line.
    StringStream.prototype.skipTo = function (ch) {
        var found = this.string.indexOf(ch, this.pos);
        if (found > -1) {
            this.pos = found;
            return true;
        }
    };
    /// Move back `n` characters.
    StringStream.prototype.backUp = function (n) { this.pos -= n; };
    /// Get the column position at `this.pos`.
    StringStream.prototype.column = function () {
        if (this.lastColumnPos < this.start) {
            this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
            this.lastColumnPos = this.start;
        }
        return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    };
    /// Get the indentation column of the current line.
    StringStream.prototype.indentation = function () {
        return countColumn(this.string, null, this.tabSize) -
            (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0);
    };
    /// Match the input against the given string or regular expression
    /// (which should start with a `^`). Return true or the regexp match
    /// if it matches.
    ///
    /// Unless `consume` is set to `false`, this will move `this.pos`
    /// past the matched text.
    ///
    /// When matching a string `caseInsensitive` can be set to true to
    /// make the match case-insensitive.
    StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
        if (typeof pattern == "string") {
            var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; };
            var substr = this.string.substr(this.pos, pattern.length);
            if (cased(substr) == cased(pattern)) {
                if (consume !== false)
                    this.pos += pattern.length;
                return true;
            }
            else
                return null;
        }
        else {
            var match = this.string.slice(this.pos).match(pattern);
            if (match && match.index > 0)
                return null;
            if (match && consume !== false)
                this.pos += match[0].length;
            return match;
        }
    };
    /// Get the current token.
    StringStream.prototype.current = function () { return this.string.slice(this.start, this.pos); };
    /// Hide the first `n` characters of the stream while running
    /// `inner`. This can be useful for nesting modes.
    StringStream.prototype.hideFirstChars = function (n, inner) {
        this.lineStart += n;
        try {
            return inner();
        }
        finally {
            this.lineStart -= n;
        }
    };
    return StringStream;
}());
exports.StringStream = StringStream;
var StringStreamCursor = /** @class */ (function () {
    function StringStreamCursor(text, offset, tabSize) {
        if (tabSize === void 0) { tabSize = 4; }
        this.offset = offset;
        this.tabSize = tabSize;
        this.iter = text.iterLines(offset);
        this.curLineEnd = this.offset - 1;
    }
    StringStreamCursor.prototype.next = function () {
        var _a = this.iter.next(), value = _a.value, done = _a.done;
        if (done)
            throw new RangeError("Reached end of document");
        var res = new StringStream(value, this.tabSize);
        this.offset = this.curLineEnd + 1;
        this.curLineEnd += value.length + 1;
        return res;
    };
    return StringStreamCursor;
}());
exports.StringStreamCursor = StringStreamCursor;

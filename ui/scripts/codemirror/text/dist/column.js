"use strict";
exports.__esModule = true;
var char_1 = require("./char.js");
/// Count the column position at the given offset into the string,
/// taking extending characters and tab size into account.
function countColumn(string, n, tabSize) {
    for (var i = 0; i < string.length; i++) {
        var code = string.charCodeAt(i);
        if (code == 9)
            n += tabSize - (n % tabSize);
        else if (code < 768 || !char_1.isExtendingChar(code))
            n++;
    }
    return n;
}
exports.countColumn = countColumn;
/// Find the offset that corresponds to the given column position in a
/// string, taking extending characters and tab size into account.
function findColumn(string, n, col, tabSize) {
    for (var i = 0; i < string.length; i++) {
        var code = string.charCodeAt(i);
        if (char_1.isExtendingChar(code))
            continue;
        if (n >= col)
            return { offset: i, leftOver: 0 };
        n += code == 9 ? tabSize - (n % tabSize) : 1;
    }
    return { offset: string.length, leftOver: col - n };
}
exports.findColumn = findColumn;

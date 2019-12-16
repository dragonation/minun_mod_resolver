"use strict";
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
var extension_1 = require("../../extension/dist/extension.js");
var view_1 = require("../../view/dist/index.js");
var view_2 = require("../../view/dist/index.js");
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
var syntax_1 = require("../../syntax/dist/index.js");
var style_mod_1 = require("../../3rd-parties/style-mod.js");
var defaultStyles = new style_mod_1.StyleModule({
    matchingBracket: { color: "#0b0" },
    nonmatchingBracket: { color: "#a22" }
});
var DEFAULT_SCAN_DIST = 10000, DEFAULT_BRACKETS = "()[]{}";
var bracketMatchingConfig = view_1.EditorView.extend.behavior({
    combine: function (configs) {
        return extension_1.combineConfig(configs, {
            afterCursor: true,
            brackets: DEFAULT_BRACKETS,
            maxScanDistance: DEFAULT_SCAN_DIST
        });
    }
});
var bracketMatchingUnique = [
    view_1.EditorView.extend.fallback(view_1.EditorView.styleModule(defaultStyles)),
    view_1.ViewPlugin.decoration({
        create: function () { return view_2.Decoration.none; },
        update: function (deco, update) {
            if (!update.transactions.length)
                return deco;
            var state = update.state, decorations = [];
            var config = update.view.behavior(bracketMatchingConfig);
            for (var _i = 0, _a = state.selection.ranges; _i < _a.length; _i++) {
                var range = _a[_i];
                if (!range.empty)
                    continue;
                var match = matchBrackets(state, range.head, -1, config)
                    || (range.head > 0 && matchBrackets(state, range.head - 1, 1, config))
                    || (config.afterCursor &&
                        (matchBrackets(state, range.head, 1, config) ||
                            (range.head < state.doc.length && matchBrackets(state, range.head + 1, -1, config))));
                if (!match)
                    continue;
                var styleName = match.matched ? "matchingBracket" : "nonmatchingBracket";
                var style = update.view.cssClass(styleName) + " " + defaultStyles[styleName];
                decorations.push(view_2.Decoration.mark(match.start.from, match.start.to, { "class": style }));
                if (match.end)
                    decorations.push(view_2.Decoration.mark(match.end.from, match.end.to, { "class": style }));
            }
            return view_2.Decoration.set(decorations);
        }
    })
];
/// Create an extension that enables bracket matching. Whenever the
/// cursor is next to a bracket, that bracket and the one it matches
/// are highlighted. Or, when no matching bracket is found, another
/// highlighting style is used to indicate this.
function bracketMatching(config) {
    if (config === void 0) { config = {}; }
    return [bracketMatchingConfig(config), bracketMatchingUnique];
}
exports.bracketMatching = bracketMatching;
function getTree(state, pos, dir, maxScanDistance) {
    for (var _i = 0, _a = state.behavior(state_1.EditorState.syntax); _i < _a.length; _i++) {
        var syntax = _a[_i];
        return syntax.getPartialTree(state, dir < 0 ? Math.max(0, pos - maxScanDistance) : pos, dir < 0 ? pos : Math.min(state.doc.length, pos + maxScanDistance));
    }
    return lezer_tree_1.Tree.empty;
}
function matchingNodes(node, dir, brackets) {
    var byProp = node.prop(dir < 0 ? syntax_1.closeNodeProp : syntax_1.openNodeProp);
    if (byProp)
        return byProp;
    if (node.name.length == 1) {
        var index = brackets.indexOf(node.name);
        if (index > -1 && index % 2 == (dir < 0 ? 1 : 0))
            return [brackets[index + dir]];
    }
    return null;
}
/// Find the matching bracket for the token at `pos`, scanning
/// direction `dir`. Only the `brackets` and `maxScanDistance`
/// properties are used from `config`, if given. Returns null if no
/// bracket was found at `pos`, or a match result otherwise.
function matchBrackets(state, pos, dir, config) {
    if (config === void 0) { config = {}; }
    var maxScanDistance = config.maxScanDistance || DEFAULT_SCAN_DIST, brackets = config.brackets || DEFAULT_BRACKETS;
    var tree = getTree(state, pos, dir, maxScanDistance);
    var sub = tree.resolve(pos, dir), matches;
    if (matches = matchingNodes(sub.type, dir, brackets))
        return matchMarkedBrackets(state, pos, dir, sub, matches, brackets);
    else
        return matchPlainBrackets(state, pos, dir, tree, sub.type, maxScanDistance, brackets);
}
exports.matchBrackets = matchBrackets;
function matchMarkedBrackets(state, pos, dir, token, matching, brackets) {
    var parent = token.parent, firstToken = { from: token.start, to: token.end };
    var depth = 0;
    return (parent && parent.iterate({
        from: dir < 0 ? token.start : token.end,
        to: dir < 0 ? parent.start : parent.end,
        enter: function (type, from, to) {
            if (dir < 0 ? to > token.start : from < token.end)
                return undefined;
            if (depth == 0 && matching.indexOf(type.name) > -1) {
                return { start: firstToken, end: { from: from, to: to }, matched: true };
            }
            else if (matchingNodes(type, dir, brackets)) {
                depth++;
            }
            else if (matchingNodes(type, -dir, brackets)) {
                depth--;
                if (depth == 0)
                    return { start: firstToken, end: { from: from, to: to }, matched: false };
            }
            return false;
        }
    })) || { start: firstToken, matched: false };
}
function matchPlainBrackets(state, pos, dir, tree, tokenType, maxScanDistance, brackets) {
    var startCh = dir < 0 ? state.doc.slice(pos - 1, pos) : state.doc.slice(pos, pos + 1);
    var bracket = brackets.indexOf(startCh);
    if (bracket < 0 || (bracket % 2 == 0) != (dir > 0))
        return null;
    var startToken = { from: dir < 0 ? pos - 1 : pos, to: dir > 0 ? pos + 1 : pos };
    var iter = state.doc.iterRange(pos, dir > 0 ? state.doc.length : 0), depth = 0;
    for (var distance = 0; !(iter.next()).done && distance <= maxScanDistance;) {
        var text = iter.value;
        if (dir < 0)
            distance += text.length;
        var basePos = pos + distance * dir;
        for (var pos_1 = dir > 0 ? 0 : text.length - 1, end = dir > 0 ? text.length : -1; pos_1 != end; pos_1 += dir) {
            var found = brackets.indexOf(text[pos_1]);
            if (found < 0 || tree.resolve(basePos + pos_1, 1).type != tokenType)
                continue;
            if ((found % 2 == 0) == (dir > 0)) {
                depth++;
            }
            else if (depth == 1) { // Closing
                return { start: startToken, end: { from: basePos + pos_1, to: basePos + pos_1 + 1 }, matched: (found >> 1) == (bracket >> 1) };
            }
            else {
                depth--;
            }
        }
        if (dir > 0)
            distance += text.length;
    }
    return iter.done ? { start: startToken, matched: false } : null;
}

"use strict";
exports.__esModule = true;
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
var state_1 = require("../../state/dist/index.js");
/// This node prop is used to associate folding information with node
/// types. Given a subtree, it should check whether that tree is
/// foldable and return the range that can be collapsed when it is.
exports.foldNodeProp = new lezer_tree_1.NodeProp();
function syntaxFolding(syntax) {
    return state_1.EditorState.foldable(function (state, start, end) {
        var tree = syntax.getPartialTree(state, start, Math.min(state.doc.length, end + 100));
        var inner = tree.resolve(end);
        var found = null;
        for (var cur = inner; cur; cur = cur.parent) {
            if (cur.start < start || cur.end <= end)
                continue;
            var prop = cur.type.prop(exports.foldNodeProp);
            if (prop) {
                var value = prop(cur);
                if (value && value.to > end)
                    found = value;
            }
        }
        return found;
    });
}
exports.syntaxFolding = syntaxFolding;

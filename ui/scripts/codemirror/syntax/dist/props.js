"use strict";
exports.__esModule = true;
var lezer_tree_1 = require("../../3rd-parties/lezer-tree.js");
function mkMatchProp() { return new lezer_tree_1.NodeProp({ deserialize: function (str) { return str.split(" "); } }); }
/// A node prop that encodes information about which other nodes match
/// this node as delimiters. Should hold a space-separated list of
/// node names of the closing nodes that match this node.
exports.openNodeProp = mkMatchProp();
/// Like `openNodeProp`, but for closing nodes. Should hold a
/// space-separated list of opening node names that match this closing
/// delimiter.
exports.closeNodeProp = mkMatchProp();

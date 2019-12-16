"use strict";
exports.__esModule = true;
var editorview_1 = require("./editorview.js");
exports.EditorView = editorview_1.EditorView;
var extension_1 = require("./extension.js");
exports.ViewPlugin = extension_1.ViewPlugin;
exports.ViewUpdate = extension_1.ViewUpdate;
var decoration_1 = require("./decoration.js");
exports.Decoration = decoration_1.Decoration;
exports.WidgetType = decoration_1.WidgetType;
exports.BlockType = decoration_1.BlockType;
var heightmap_1 = require("./heightmap.js");
exports.BlockInfo = heightmap_1.BlockInfo;
var rangeset_1 = require("../../rangeset/dist/rangeset.js");
exports.Range = rangeset_1.Range;
var heightmap_2 = require("./heightmap.js");
/// @internal
exports.__test = { HeightMap: heightmap_2.HeightMap, HeightOracle: heightmap_2.HeightOracle, MeasuredHeights: heightmap_2.MeasuredHeights, QueryType: heightmap_2.QueryType };

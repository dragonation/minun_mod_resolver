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
var view_1 = require("../../view/dist/index.js");
var style_mod_1 = require("../../3rd-parties/style-mod.js");
var styles = new style_mod_1.StyleModule({
    secondarySelection: {
        backgroundColor_fallback: "#3297FD",
        color_fallback: "white !important",
        backgroundColor: "Highlight",
        color: "HighlightText !important"
    },
    secondaryCursor: {
        display: "inline-block",
        verticalAlign: "text-top",
        borderLeft: "1px solid #555",
        width: 0,
        height: "1.15em",
        margin: "0 -0.5px -.5em"
    }
});
var rangeConfig = { "class": styles.secondarySelection };
var multipleSelectionExtension = [
    state_1.EditorState.allowMultipleSelections(true),
    view_1.ViewPlugin.decoration({
        create: function (view) { return decorateSelections(view.state, rangeConfig); },
        update: function (deco, _a) {
            var prevState = _a.prevState, state = _a.state;
            return prevState.doc == state.doc && prevState.selection.eq(state.selection)
                ? deco : decorateSelections(state, rangeConfig);
        }
    }),
    view_1.EditorView.styleModule(styles)
];
/// Returns an extension that enables multiple selections for the
/// editor. Secondary cursors and selected ranges are drawn with
/// simple decorations, and might look the same as the primary native
/// selection.
function multipleSelections() {
    return multipleSelectionExtension;
}
exports.multipleSelections = multipleSelections;
var CursorWidget = /** @class */ (function (_super) {
    __extends(CursorWidget, _super);
    function CursorWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CursorWidget.prototype.toDOM = function () {
        var span = document.createElement("span");
        span.className = styles.secondaryCursor;
        return span;
    };
    return CursorWidget;
}(view_1.WidgetType));
function decorateSelections(state, rangeConfig) {
    var _a = state.selection, ranges = _a.ranges, primaryIndex = _a.primaryIndex;
    if (ranges.length == 1)
        return view_1.Decoration.none;
    var deco = [];
    for (var i = 0; i < ranges.length; i++)
        if (i != primaryIndex) {
            var range = ranges[i];
            deco.push(range.empty ? view_1.Decoration.widget(range.from, { widget: new CursorWidget(null) })
                : view_1.Decoration.mark(ranges[i].from, ranges[i].to, rangeConfig));
        }
    return view_1.Decoration.set(deco);
}

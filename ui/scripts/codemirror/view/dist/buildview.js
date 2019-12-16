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
var rangeset_1 = require("../../rangeset/dist/rangeset.js");
var decoration_1 = require("./decoration.js");
var blockview_1 = require("./blockview.js");
var inlineview_1 = require("./inlineview.js");
var ContentBuilder = /** @class */ (function () {
    function ContentBuilder(doc, pos, end) {
        this.doc = doc;
        this.pos = pos;
        this.end = end;
        this.content = [];
        this.curLine = null;
        this.breakAtStart = 0;
        this.text = "";
        this.textOff = 0;
        this.cursor = doc.iter();
        this.skip = pos;
    }
    ContentBuilder.prototype.posCovered = function () {
        if (this.content.length == 0)
            return !this.breakAtStart && this.doc.lineAt(this.pos).start != this.pos;
        var last = this.content[this.content.length - 1];
        return !last.breakAfter && !(last instanceof blockview_1.BlockWidgetView && last.type == decoration_1.BlockType.WidgetBefore);
    };
    ContentBuilder.prototype.getLine = function () {
        if (!this.curLine)
            this.content.push(this.curLine = new blockview_1.LineView);
        return this.curLine;
    };
    ContentBuilder.prototype.addWidget = function (view) {
        this.curLine = null;
        this.content.push(view);
    };
    ContentBuilder.prototype.finish = function () {
        if (!this.posCovered())
            this.getLine();
    };
    ContentBuilder.prototype.buildText = function (length, tagName, clss, attrs, ranges) {
        while (length > 0) {
            if (this.textOff == this.text.length) {
                var _a = this.cursor.next(this.skip), value = _a.value, lineBreak = _a.lineBreak, done = _a.done;
                this.skip = 0;
                if (done)
                    throw new Error("Ran out of text content when drawing inline views");
                if (lineBreak) {
                    if (!this.posCovered())
                        this.getLine();
                    if (this.content.length)
                        this.content[this.content.length - 1].breakAfter = 1;
                    else
                        this.breakAtStart = 1;
                    this.curLine = null;
                    length--;
                    continue;
                }
                else {
                    this.text = value;
                    this.textOff = 0;
                }
            }
            var take = Math.min(this.text.length - this.textOff, length);
            this.getLine().append(new inlineview_1.TextView(this.text.slice(this.textOff, this.textOff + take), tagName, clss, attrs));
            length -= take;
            this.textOff += take;
        }
    };
    ContentBuilder.prototype.span = function (from, to, active) {
        var tagName = null, clss = null;
        var attrs = null;
        for (var _i = 0, _a = active; _i < _a.length; _i++) {
            var spec = _a[_i].spec;
            if (spec.tagName)
                tagName = spec.tagName;
            if (spec["class"])
                clss = clss ? clss + " " + spec["class"] : spec["class"];
            if (spec.attributes)
                for (var name_1 in spec.attributes) {
                    var value = spec.attributes[name_1];
                    if (value == null)
                        continue;
                    if (name_1 == "class") {
                        clss = clss ? clss + " " + value : value;
                    }
                    else {
                        if (!attrs)
                            attrs = {};
                        if (name_1 == "style" && attrs.style)
                            value = attrs.style + ";" + value;
                        attrs[name_1] = value;
                    }
                }
        }
        this.buildText(to - from, tagName, clss, attrs, active);
        this.pos = to;
    };
    ContentBuilder.prototype.point = function (from, to, deco, openStart, openEnd) {
        var open = (openStart ? 1 /* Start */ : 0) | (openEnd ? 2 /* End */ : 0);
        var len = to - from;
        if (deco instanceof decoration_1.PointDecoration) {
            if (deco.block) {
                var type = deco.type;
                if (type == decoration_1.BlockType.WidgetAfter && !this.posCovered())
                    this.getLine();
                this.addWidget(new blockview_1.BlockWidgetView(deco.widget || new NullWidget("div"), len, type, open));
            }
            else {
                this.getLine().append(inlineview_1.WidgetView.create(deco.widget || new NullWidget("span"), len, deco.startSide, open));
            }
        }
        else if (this.doc.lineAt(this.pos).start == this.pos) { // Line decoration
            this.getLine().addLineDeco(deco);
        }
        if (len) {
            // Advance the iterator past the replaced content
            if (this.textOff + len <= this.text.length) {
                this.textOff += len;
            }
            else {
                this.skip += len - (this.text.length - this.textOff);
                this.text = "";
                this.textOff = 0;
            }
            this.pos = to;
        }
    };
    ContentBuilder.prototype.ignore = function () { return false; };
    ContentBuilder.build = function (text, from, to, decorations) {
        var builder = new ContentBuilder(text, from, to);
        rangeset_1.RangeSet.iterateSpans(decorations, from, to, builder);
        builder.finish();
        return builder;
    };
    return ContentBuilder;
}());
exports.ContentBuilder = ContentBuilder;
var NullWidget = /** @class */ (function (_super) {
    __extends(NullWidget, _super);
    function NullWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NullWidget.prototype.toDOM = function () { return document.createElement(this.value); };
    NullWidget.prototype.updateDOM = function (elt) { return elt.nodeName.toLowerCase() == this.value; };
    return NullWidget;
}(decoration_1.WidgetType));

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
var contentview_1 = require("./contentview.js");
var blockview_1 = require("./blockview.js");
var inlineview_1 = require("./inlineview.js");
var buildview_1 = require("./buildview.js");
var viewport_1 = require("./viewport.js");
var browser_1 = require("./browser.js");
var domobserver_1 = require("./domobserver.js");
var heightmap_1 = require("./heightmap.js");
var decoration_1 = require("./decoration.js");
var dom_1 = require("./dom.js");
var extension_1 = require("./extension.js");
var state_1 = require("../../state/dist/index.js");
var text_1 = require("../../text/dist/index.js");
var none = [];
var DocView = /** @class */ (function (_super) {
    __extends(DocView, _super);
    function DocView(view, onDOMChange) {
        var _this = _super.call(this) || this;
        _this.view = view;
        _this.viewports = none;
        _this.compositionDeco = decoration_1.Decoration.none;
        _this.gapDeco = decoration_1.Decoration.none;
        _this.selectionDirty = null;
        _this.forceSelectionUpdate = false;
        _this.heightMap = heightmap_1.HeightMap.empty();
        _this.heightOracle = new heightmap_1.HeightOracle;
        _this.layoutCheckScheduled = -1;
        // A document position that has to be scrolled into view at the next layout check
        _this.scrollIntoView = -1;
        _this.paddingTop = 0;
        _this.paddingBottom = 0;
        // Track a minimum width for the editor. When measuring sizes in
        // checkLayout, this is updated to point at the width of a given
        // element and its extent in the document. When a change happens in
        // that range, these are reset. That way, once we've seen a
        // line/element of a given length, we keep the editor wide enough to
        // fit at least that element, until it is changed, at which point we
        // forget it again.
        _this.minWidth = 0;
        _this.minWidthFrom = 0;
        _this.minWidthTo = 0;
        // Track whether the DOM selection was set in a lossy way, so that
        // we don't mess it up when reading it back it
        _this.impreciseAnchor = null;
        _this.impreciseHead = null;
        _this.setDOM(view.contentDOM);
        _this.viewportState = new viewport_1.ViewportState;
        _this.observer = new domobserver_1.DOMObserver(_this, onDOMChange, function () { return _this.checkLayout(); });
        return _this;
    }
    Object.defineProperty(DocView.prototype, "length", {
        get: function () { return this.state.doc.length; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocView.prototype, "state", {
        get: function () { return this.view.state; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocView.prototype, "viewport", {
        get: function () { return this.view._viewport; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocView.prototype, "root", {
        get: function () { return this.view.root; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DocView.prototype, "editorView", {
        get: function () { return this.view; },
        enumerable: true,
        configurable: true
    });
    DocView.prototype.init = function (state, initialize) {
        this.children = [new blockview_1.LineView];
        this.children[0].setParent(this);
        this.viewports = this.decorations = none;
        this.minWidth = 0;
        this.compositionDeco = decoration_1.Decoration.none;
        var changedRanges = [new state_1.ChangedRange(0, 0, 0, state.doc.length)];
        this.heightMap = this.heightMap.applyChanges(none, text_1.Text.empty, this.heightOracle.setDoc(state.doc), changedRanges);
        this.computeUpdate(state, state.doc, null, initialize, none, 0, -1);
        this.updateInner(changedRanges, 0);
        this.scheduleLayoutCheck();
    };
    // Update the document view to a given state. scrollIntoView can be
    // used as a hint to compute a new viewport that includes that
    // position, if we know the editor is going to scroll that position
    // into view.
    DocView.prototype.update = function (update, scrollIntoView) {
        var _this = this;
        if (scrollIntoView === void 0) { scrollIntoView = -1; }
        var prevDoc = this.state.doc;
        var state = update ? update.state : this.state;
        var changedRanges = update ? update.changes.changedRanges() : none;
        if (this.minWidth > 0 && changedRanges.length) {
            if (!changedRanges.every(function (_a) {
                var fromA = _a.fromA, toA = _a.toA;
                return toA < _this.minWidthFrom || fromA > _this.minWidthTo;
            })) {
                this.minWidth = 0;
            }
            else {
                this.minWidthFrom = state_1.ChangedRange.mapPos(this.minWidthFrom, 1, changedRanges);
                this.minWidthTo = state_1.ChangedRange.mapPos(this.minWidthTo, 1, changedRanges);
            }
        }
        var contentChanges = this.computeUpdate(state, prevDoc, update, null, changedRanges, 0, scrollIntoView);
        // When the DOM nodes around the selection are moved to another
        // parent, Chrome sometimes reports a different selection through
        // getSelection than the one that it actually shows to the user.
        // This forces a selection update when lines are joined to work
        // around that. Issue #54
        if (browser_1["default"].chrome && !this.compositionDeco.size && update && update.changes.changes.some(function (ch) { return ch.text.length > 1; }))
            this.forceSelectionUpdate = true;
        if (this.dirty == 0 /* Not */ && contentChanges.length == 0 &&
            this.state.selection.primary.from >= this.viewport.from &&
            this.state.selection.primary.to <= this.viewport.to &&
            (!update || update._annotations.length == 0)) {
            this.updateSelection();
            if (scrollIntoView > -1)
                this.scrollPosIntoView(scrollIntoView);
            if (update)
                this.scheduleLayoutCheck();
        }
        else {
            this.updateInner(contentChanges, prevDoc.length);
            this.cancelLayoutCheck();
            if (scrollIntoView > -1)
                this.scrollIntoView = scrollIntoView;
            this.scheduleLayoutCheck();
        }
    };
    DocView.prototype.scheduleLayoutCheck = function () {
        var _this = this;
        this.layoutCheckScheduled = requestAnimationFrame(function () { return _this.checkLayout(); });
    };
    // Used both by update and checkLayout do perform the actual DOM
    // update
    DocView.prototype.updateInner = function (changes, oldLength) {
        var _this = this;
        var visible = this.viewport, viewports = [visible];
        var _a = this.state.selection.primary, head = _a.head, anchor = _a.anchor;
        if (head < visible.from || head > visible.to) {
            var _b = this.lineAt(head, 0), from = _b.from, to = _b.to;
            viewports.push(new viewport_1.Viewport(from, to));
        }
        if (!viewports.some(function (_a) {
            var from = _a.from, to = _a.to;
            return anchor >= from && anchor <= to;
        })) {
            var _c = this.lineAt(anchor, 0), from = _c.from, to = _c.to;
            viewports.push(new viewport_1.Viewport(from, to));
        }
        viewports.sort(function (a, b) { return a.from - b.from; });
        this.updateChildren(changes, viewports, oldLength);
        this.viewports = viewports;
        this.observer.ignore(function () {
            // Lock the height during redrawing, since Chrome sometimes
            // messes with the scroll position during DOM mutation (though
            // no relayout is triggered and I cannot imagine how it can
            // recompute the scroll position without a layout)
            _this.dom.style.height = _this.heightMap.height + "px";
            _this.dom.style.minWidth = _this.minWidth + "px";
            _this.sync();
            _this.dirty = 0 /* Not */;
            _this.updateSelection();
            _this.dom.style.height = "";
        });
    };
    DocView.prototype.updateChildren = function (changes, viewports, oldLength) {
        var gapDeco = this.computeGapDeco(viewports, this.length);
        var gapChanges = decoration_1.findChangedRanges(this.gapDeco, gapDeco, changes, oldLength);
        this.gapDeco = gapDeco;
        changes = extendWithRanges(changes, gapChanges.content);
        var allDeco = [gapDeco].concat(this.decorations);
        var cursor = this.childCursor(oldLength);
        for (var i = changes.length - 1;; i--) {
            var next = i >= 0 ? changes[i] : null;
            if (!next)
                break;
            var fromA = next.fromA, toA = next.toA, fromB = next.fromB, toB = next.toB;
            var _a = buildview_1.ContentBuilder.build(this.state.doc, fromB, toB, allDeco), content = _a.content, breakAtStart = _a.breakAtStart;
            var _b = cursor.findPos(toA, 1), toI = _b.i, toOff = _b.off;
            var _c = cursor.findPos(fromA, -1), fromI = _c.i, fromOff = _c.off;
            this.replaceRange(fromI, fromOff, toI, toOff, content, breakAtStart);
        }
    };
    DocView.prototype.replaceRange = function (fromI, fromOff, toI, toOff, content, breakAtStart) {
        var before = this.children[fromI], last = content.length ? content[content.length - 1] : null;
        var breakAtEnd = last ? last.breakAfter : breakAtStart;
        // Change within a single line
        if (fromI == toI && !breakAtStart && !breakAtEnd && content.length < 2 &&
            before.merge(fromOff, toOff, content.length ? last : null, fromOff == 0))
            return;
        var after = this.children[toI];
        // Make sure the end of the line after the update is preserved in `after`
        if (toOff < after.length || after.children.length && after.children[after.children.length - 1].length == 0) {
            // If we're splitting a line, separate part of the start line to
            // avoid that being mangled when updating the start line.
            if (fromI == toI) {
                after = after.split(toOff);
                toOff = 0;
            }
            // If the element after the replacement should be merged with
            // the last replacing element, update `content`
            if (!breakAtEnd && last && after.merge(0, toOff, last, true)) {
                content[content.length - 1] = after;
            }
            else {
                // Remove the start of the after element, if necessary, and
                // add it to `content`.
                if (toOff || after.children.length && after.children[0].length == 0)
                    after.merge(0, toOff, null, false);
                content.push(after);
            }
        }
        else if (after.breakAfter) {
            // The element at `toI` is entirely covered by this range.
            // Preserve its line break, if any.
            if (last)
                last.breakAfter = 1;
            else
                breakAtStart = 1;
        }
        // Since we've handled the next element from the current elements
        // now, make sure `toI` points after that.
        toI++;
        before.breakAfter = breakAtStart;
        if (fromOff > 0) {
            if (!breakAtStart && content.length && before.merge(fromOff, before.length, content[0], false)) {
                before.breakAfter = content.shift().breakAfter;
            }
            else if (fromOff < before.length || before.children.length && before.children[before.children.length - 1].length == 0) {
                before.merge(fromOff, before.length, null, false);
            }
            fromI++;
        }
        // Try to merge widgets on the boundaries of the replacement
        while (fromI < toI && content.length) {
            if (this.children[toI - 1].match(content[content.length - 1]))
                toI--, content.pop();
            else if (this.children[fromI].match(content[0]))
                fromI++, content.shift();
            else
                break;
        }
        if (fromI < toI || content.length)
            this.replaceChildren(fromI, toI, content);
    };
    // Sync the DOM selection to this.state.selection
    DocView.prototype.updateSelection = function (takeFocus) {
        if (takeFocus === void 0) { takeFocus = false; }
        this.clearSelectionDirty();
        if (this.root.activeElement != this.dom) {
            if (!takeFocus)
                return;
            if (browser_1["default"].gecko)
                this.dom.focus(); // Avoids strange exceptions when setting the selection
        }
        var primary = this.state.selection.primary;
        // FIXME need to handle the case where the selection falls inside a block range
        var anchor = this.domAtPos(primary.anchor);
        var head = this.domAtPos(primary.head);
        var domSel = this.root.getSelection();
        // If the selection is already here, or in an equivalent position, don't touch it
        if (this.forceSelectionUpdate ||
            !dom_1.isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) ||
            !dom_1.isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) {
            this.forceSelectionUpdate = false;
            this.observer.ignore(function () {
                var _a;
                // Selection.extend can be used to create an 'inverted' selection
                // (one where the focus is before the anchor), but not all
                // browsers support it yet.
                if (domSel.extend) {
                    domSel.collapse(anchor.node, anchor.offset);
                    if (!primary.empty)
                        domSel.extend(head.node, head.offset);
                }
                else {
                    var range = document.createRange();
                    if (primary.anchor > primary.head)
                        _a = [head, anchor], anchor = _a[0], head = _a[1];
                    range.setEnd(head.node, head.offset);
                    range.setStart(anchor.node, anchor.offset);
                    domSel.removeAllRanges();
                    domSel.addRange(range);
                }
            });
        }
        this.impreciseAnchor = anchor.precise ? null : new contentview_1.DOMPos(domSel.anchorNode, domSel.anchorOffset);
        this.impreciseHead = head.precise ? null : new contentview_1.DOMPos(domSel.focusNode, domSel.focusOffset);
    };
    DocView.prototype.lineAt = function (pos, editorTop) {
        if (editorTop == null)
            editorTop = this.dom.getBoundingClientRect().top;
        return this.heightMap.lineAt(pos, heightmap_1.QueryType.ByPos, this.state.doc, editorTop + this.paddingTop, 0);
    };
    DocView.prototype.lineAtHeight = function (height, editorTop) {
        if (editorTop == null)
            editorTop = this.dom.getBoundingClientRect().top;
        return this.heightMap.lineAt(height, heightmap_1.QueryType.ByHeight, this.state.doc, editorTop + this.paddingTop, 0);
    };
    DocView.prototype.blockAtHeight = function (height, editorTop) {
        if (editorTop == null)
            editorTop = this.dom.getBoundingClientRect().top;
        return this.heightMap.blockAt(height, this.state.doc, editorTop + this.paddingTop, 0);
    };
    DocView.prototype.forEachLine = function (from, to, f, editorTop) {
        if (editorTop == null)
            editorTop = this.dom.getBoundingClientRect().top;
        return this.heightMap.forEachLine(from, to, this.state.doc, editorTop + this.paddingTop, 0, f);
    };
    // Compute the new viewport and set of decorations, while giving
    // plugin views the opportunity to respond to state and viewport
    // changes. Might require more than one iteration to become stable.
    DocView.prototype.computeUpdate = function (state, oldDoc, update, initializing, contentChanges, viewportBias, scrollIntoView) {
        var invalidHeightMap = contentChanges.length ? contentChanges : null, prevViewport = this.viewport || new viewport_1.Viewport(0, 0);
        for (var i = 0;; i++) {
            var viewport = void 0;
            if (invalidHeightMap) {
                // FIXME this is a terrible kludge (see #128) to get around
                // the fact that plugins need a viewport to update, but the
                // heightmap update needs the current decorations, which are
                // produced by the plugins
                var from = state_1.ChangedRange.mapPos(prevViewport.from, -1, contentChanges);
                viewport = new viewport_1.Viewport(from, Math.min(from + (prevViewport.to - prevViewport.from) + 1000, state_1.ChangedRange.mapPos(prevViewport.to, 1, contentChanges)));
            }
            else {
                viewport = this.viewportState.getViewport(state.doc, this.heightMap, viewportBias, scrollIntoView);
            }
            var viewportChange = prevViewport ? !viewport.eq(prevViewport) : true;
            // When the viewport is stable and no more iterations are needed, return
            if (!viewportChange && !invalidHeightMap && !update && !initializing)
                return contentChanges;
            // After 5 tries, give up
            if (i == 5) {
                console.warn("Viewport and decorations failed to converge");
                return contentChanges;
            }
            var prevState = this.state || state;
            if (initializing)
                initializing(viewport);
            else
                this.view.updateInner(update || new extension_1.ViewUpdate(this.view), viewport);
            prevViewport = viewport;
            // For the composition decoration, use none on init, recompute
            // when handling transactions, and use the previous value
            // otherwise.
            if (!this.view.inputState.composing)
                this.compositionDeco = decoration_1.Decoration.none;
            else if (update && update.transactions.length)
                this.compositionDeco = computeCompositionDeco(this.view, contentChanges);
            var decorations = this.view.behavior(extension_1.decorations).concat(this.compositionDeco);
            // If the decorations are stable, stop.
            if (!update && !initializing && sameArray(decorations, this.decorations))
                return contentChanges;
            // Compare the decorations (between document changes)
            var _a = decoChanges(update ? contentChanges : none, decorations, this.decorations, prevState.doc.length), content = _a.content, height = _a.height;
            this.decorations = decorations;
            // Update the heightmap with these changes. If this is the first
            // iteration and the document changed, also include decorations
            // for inserted ranges.
            var heightChanges = extendWithRanges(invalidHeightMap || none, height);
            this.heightMap = this.heightMap.applyChanges(decorations, oldDoc, this.heightOracle.setDoc(state.doc), heightChanges);
            invalidHeightMap = null;
            oldDoc = state.doc;
            // Accumulate content changes so that they can be redrawn
            contentChanges = extendWithRanges(contentChanges, content);
            // Make sure only one iteration is marked as required / state changing
            update = null;
            initializing = null;
        }
    };
    DocView.prototype.focus = function () {
        this.updateSelection(true);
    };
    DocView.prototype.cancelLayoutCheck = function () {
        if (this.layoutCheckScheduled > -1) {
            cancelAnimationFrame(this.layoutCheckScheduled);
            this.layoutCheckScheduled = -1;
        }
    };
    DocView.prototype.checkLayout = function (forceFull) {
        if (forceFull === void 0) { forceFull = false; }
        this.cancelLayoutCheck();
        this.measureVerticalPadding();
        var scrollIntoView = Math.min(this.scrollIntoView, this.state.doc.length);
        this.scrollIntoView = -1;
        var scrollBias = 0;
        if (forceFull)
            this.viewportState.coverEverything();
        else
            scrollBias = this.viewportState.updateFromDOM(this.dom, this.paddingTop);
        if (this.viewportState.top >= this.viewportState.bottom)
            return; // We're invisible!
        this.view.updateState = 1 /* Measuring */;
        var lineHeights = this.measureVisibleLineHeights(), refresh = false;
        if (this.heightOracle.mustRefresh(lineHeights)) {
            var _a = this.measureTextSize(), lineHeight = _a.lineHeight, charWidth = _a.charWidth;
            refresh = this.heightOracle.refresh(getComputedStyle(this.dom).whiteSpace, lineHeight, charWidth, (this.dom).clientWidth / charWidth, lineHeights);
            if (refresh)
                this.minWidth = 0;
        }
        if (scrollIntoView > -1)
            this.scrollPosIntoView(scrollIntoView);
        var toMeasure = [];
        for (var _i = 0, _b = this.view.behavior(extension_1.viewPlugin); _i < _b.length; _i++) {
            var plugin = _b[_i];
            var value = this.view.plugin(plugin);
            if (value.measure && value.drawMeasured)
                toMeasure.push(value);
        }
        var update = false, measure = toMeasure.map(function (plugin) { return plugin.measure(); });
        for (var i = 0;; i++) {
            this.heightOracle.heightChanged = false;
            this.heightMap = this.heightMap.updateHeight(this.heightOracle, 0, refresh, new heightmap_1.MeasuredHeights(this.viewport.from, lineHeights || this.measureVisibleLineHeights()));
            var covered = this.viewportState.coveredBy(this.state.doc, this.viewport, this.heightMap, scrollBias);
            if (covered && !this.heightOracle.heightChanged)
                break;
            if (i > 10) {
                console.warn("Layout failed to converge");
                break;
            }
            this.view.updateState = 2 /* Updating */;
            update = true;
            var contentChanges = covered ? none : this.computeUpdate(this.state, this.state.doc, null, null, none, scrollBias, -1);
            this.updateInner(contentChanges, this.length);
            lineHeights = null;
            refresh = false;
            scrollBias = 0;
            this.view.updateState = 1 /* Measuring */;
            this.viewportState.updateFromDOM(this.dom, this.paddingTop);
            measure = toMeasure.map(function (plugin) { return plugin.measure(); });
        }
        this.view.updateState = 2 /* Updating */;
        while (toMeasure.length) {
            toMeasure = toMeasure.filter(function (plugin, i) { return plugin.drawMeasured(measure[i]); });
            measure = toMeasure.map(function (plugin) { return plugin.measure(); });
        }
        if (update) {
            this.observer.listenForScroll();
            this.view.drawPlugins();
        }
        this.view.updateState = 0 /* Idle */;
    };
    DocView.prototype.scrollPosIntoView = function (pos) {
        var rect = this.coordsAt(pos);
        if (!rect)
            return;
        var margin = this.view.behavior(extension_1.scrollMargins);
        dom_1.scrollRectIntoView(this.dom, { left: rect.left - margin.left, top: rect.top - margin.top,
            right: rect.right + margin.right, bottom: rect.bottom + margin.bottom });
    };
    DocView.prototype.nearest = function (dom) {
        for (var cur = dom; cur;) {
            var domView = cur.cmView;
            if (domView && domView.rootView == this)
                return domView;
            cur = cur.parentNode;
        }
        return null;
    };
    DocView.prototype.posFromDOM = function (node, offset) {
        var view = this.nearest(node);
        if (!view)
            throw new RangeError("Trying to find position for a DOM position outside of the document");
        return view.localPosFromDOM(node, offset) + view.posAtStart;
    };
    DocView.prototype.domAtPos = function (pos) {
        var _a = this.childCursor().findPos(pos, -1), i = _a.i, off = _a.off;
        for (; i < this.children.length - 1;) {
            var child = this.children[i];
            if (off < child.length || child instanceof blockview_1.LineView)
                break;
            i++;
            off = 0;
        }
        return this.children[i].domAtPos(off);
    };
    DocView.prototype.coordsAt = function (pos) {
        for (var off = this.length, i = this.children.length - 1;; i--) {
            var child = this.children[i], start = off - child.breakAfter - child.length;
            if (pos >= start && child.type != decoration_1.BlockType.WidgetAfter)
                return child.coordsAt(pos - start);
            off = start;
        }
    };
    DocView.prototype.measureVisibleLineHeights = function () {
        var result = [], _a = this.viewport, from = _a.from, to = _a.to;
        var minWidth = Math.max(this.dom.clientWidth, this.minWidth) + 1;
        for (var pos = 0, i = 0; i < this.children.length; i++) {
            var child = this.children[i], end = pos + child.length;
            if (end > to)
                break;
            if (pos >= from) {
                result.push(child.dom.getBoundingClientRect().height);
                var width = child.dom.scrollWidth;
                if (width > minWidth) {
                    this.minWidth = minWidth = width;
                    this.minWidthFrom = pos;
                    this.minWidthTo = end;
                }
            }
            pos = end + child.breakAfter;
        }
        return result;
    };
    DocView.prototype.measureVerticalPadding = function () {
        var style = window.getComputedStyle(this.dom);
        this.paddingTop = parseInt(style.paddingTop) || 0;
        this.paddingBottom = parseInt(style.paddingBottom) || 0;
    };
    DocView.prototype.measureTextSize = function () {
        var _this = this;
        for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
            var child = _a[_i];
            if (child instanceof blockview_1.LineView) {
                var measure = child.measureTextSize();
                if (measure)
                    return measure;
            }
        }
        // If no workable line exists, force a layout of a measurable element
        var dummy = document.createElement("div"), lineHeight, charWidth;
        dummy.className = "codemirror-line";
        dummy.textContent = "abc def ghi jkl mno pqr stu";
        this.observer.ignore(function () {
            _this.dom.appendChild(dummy);
            var rect = dom_1.clientRectsFor(dummy.firstChild)[0];
            lineHeight = dummy.getBoundingClientRect().height;
            charWidth = rect ? rect.width / 27 : 7;
            dummy.remove();
        });
        return { lineHeight: lineHeight, charWidth: charWidth };
    };
    DocView.prototype.destroy = function () {
        cancelAnimationFrame(this.layoutCheckScheduled);
        this.observer.destroy();
    };
    DocView.prototype.clearSelectionDirty = function () {
        if (this.selectionDirty != null) {
            cancelAnimationFrame(this.selectionDirty);
            this.selectionDirty = null;
        }
    };
    DocView.prototype.setSelectionDirty = function () {
        var _this = this;
        this.observer.clearSelection();
        if (this.selectionDirty == null)
            this.selectionDirty = requestAnimationFrame(function () { return _this.updateSelection(); });
    };
    DocView.prototype.childCursor = function (pos) {
        if (pos === void 0) { pos = this.length; }
        // Move back to start of last element when possible, so that
        // `ChildCursor.findPos` doesn't have to deal with the edge case
        // of being after the last element.
        var i = this.children.length;
        if (i)
            pos -= this.children[--i].length;
        return new contentview_1.ChildCursor(this.children, pos, i);
    };
    DocView.prototype.computeGapDeco = function (viewports, docLength) {
        var deco = [];
        for (var pos = 0, i = 0;; i++) {
            var next = i == viewports.length ? null : viewports[i];
            var end = next ? next.from - 1 : docLength;
            if (end > pos) {
                var height = this.lineAt(end, 0).bottom - this.lineAt(pos, 0).top;
                deco.push(decoration_1.Decoration.replace(pos, end, { widget: new GapWidget(height), block: true, inclusive: true }));
            }
            if (!next)
                break;
            pos = next.to + 1;
        }
        return decoration_1.Decoration.set(deco);
    };
    return DocView;
}(contentview_1.ContentView));
exports.DocView = DocView;
// Browsers appear to reserve a fixed amount of bits for height
// styles, and ignore or clip heights above that. For Chrome and
// Firefox, this is in the 20 million range, so we try to stay below
// that.
var MAX_NODE_HEIGHT = 1e7;
var GapWidget = /** @class */ (function (_super) {
    __extends(GapWidget, _super);
    function GapWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    GapWidget.prototype.toDOM = function () {
        var elt = document.createElement("div");
        this.updateDOM(elt);
        return elt;
    };
    GapWidget.prototype.updateDOM = function (elt) {
        if (this.value < MAX_NODE_HEIGHT) {
            while (elt.lastChild)
                elt.lastChild.remove();
            elt.style.height = this.value + "px";
        }
        else {
            elt.style.height = "";
            for (var remaining = this.value; remaining > 0; remaining -= MAX_NODE_HEIGHT) {
                var fill = elt.appendChild(document.createElement("div"));
                fill.style.height = Math.min(remaining, MAX_NODE_HEIGHT) + "px";
            }
        }
        return true;
    };
    Object.defineProperty(GapWidget.prototype, "estimatedHeight", {
        get: function () { return this.value; },
        enumerable: true,
        configurable: true
    });
    return GapWidget;
}(decoration_1.WidgetType));
function decoChanges(diff, decorations, oldDecorations, oldLength) {
    var contentRanges = [], heightRanges = [];
    for (var i = decorations.length - 1; i >= 0; i--) {
        var deco = decorations[i], oldDeco = i < oldDecorations.length ? oldDecorations[i] : decoration_1.Decoration.none;
        if (deco.size == 0 && oldDeco.size == 0)
            continue;
        var newRanges = decoration_1.findChangedRanges(oldDeco, deco, diff, oldLength);
        contentRanges = decoration_1.joinRanges(contentRanges, newRanges.content);
        heightRanges = decoration_1.joinRanges(heightRanges, newRanges.height);
    }
    return { content: contentRanges, height: heightRanges };
}
function extendWithRanges(diff, ranges) {
    if (ranges.length == 0)
        return diff;
    var result = [];
    for (var dI = 0, rI = 0, posA = 0, posB = 0;; dI++) {
        var next = dI == diff.length ? null : diff[dI], off = posA - posB;
        var end = next ? next.fromB : 1e9;
        while (rI < ranges.length && ranges[rI] < end) {
            var from = ranges[rI], to = ranges[rI + 1];
            var fromB = Math.max(posB, from), toB = Math.min(end, to);
            if (fromB <= toB)
                new state_1.ChangedRange(fromB + off, toB + off, fromB, toB).addToSet(result);
            if (to > end)
                break;
            else
                rI += 2;
        }
        if (!next)
            return result;
        new state_1.ChangedRange(next.fromA, next.toA, next.fromB, next.toB).addToSet(result);
        posA = next.toA;
        posB = next.toB;
    }
}
function sameArray(a, b) {
    if (a.length != b.length)
        return false;
    for (var i = 0; i < a.length; i++)
        if (a[i] !== b[i])
            return false;
    return true;
}
function computeCompositionDeco(view, changes) {
    var sel = view.root.getSelection();
    var textNode = sel.focusNode && nearbyTextNode(sel.focusNode, sel.focusOffset);
    if (!textNode)
        return decoration_1.Decoration.none;
    var cView = view.docView.nearest(textNode);
    var from, to, topNode = textNode;
    if (cView instanceof inlineview_1.InlineView) {
        from = cView.posAtStart;
        to = from + cView.length;
        topNode = cView.dom;
    }
    else if (cView instanceof blockview_1.LineView) {
        while (topNode.parentNode != cView.dom)
            topNode = topNode.parentNode;
        var prev = topNode.previousSibling;
        while (prev && !prev.cmView)
            prev = prev.previousSibling;
        from = to = prev ? prev.cmView.posAtEnd : cView.posAtStart;
    }
    else {
        return decoration_1.Decoration.none;
    }
    var newFrom = state_1.ChangedRange.mapPos(from, 1, changes), newTo = Math.max(newFrom, state_1.ChangedRange.mapPos(to, -1, changes));
    var text = textNode.nodeValue, doc = view.state.doc;
    if (newTo - newFrom < text.length) {
        if (doc.slice(newFrom, Math.min(doc.length, newFrom + text.length)) == text)
            newTo = newFrom + text.length;
        else if (doc.slice(Math.max(0, newTo - text.length), newTo) == text)
            newFrom = newTo - text.length;
        else
            return decoration_1.Decoration.none;
    }
    else if (doc.slice(newFrom, newTo) != text) {
        return decoration_1.Decoration.none;
    }
    return decoration_1.Decoration.set(decoration_1.Decoration.replace(newFrom, newTo, {
        widget: new CompositionWidget({ top: topNode, text: textNode })
    }));
}
exports.computeCompositionDeco = computeCompositionDeco;
var CompositionWidget = /** @class */ (function (_super) {
    __extends(CompositionWidget, _super);
    function CompositionWidget() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    CompositionWidget.prototype.eq = function (value) { return this.value.top == value.top && this.value.text == value.text; };
    CompositionWidget.prototype.toDOM = function () { return this.value.top; };
    CompositionWidget.prototype.ignoreEvent = function () { return false; };
    Object.defineProperty(CompositionWidget.prototype, "customView", {
        get: function () { return inlineview_1.CompositionView; },
        enumerable: true,
        configurable: true
    });
    return CompositionWidget;
}(decoration_1.WidgetType));
function nearbyTextNode(node, offset) {
    for (;;) {
        if (node.nodeType == 3)
            return node;
        if (node.nodeType == 1 && offset > 0) {
            node = node.childNodes[offset - 1];
            offset = dom_1.maxOffset(node);
        }
        else if (node.nodeType == 1 && offset < node.childNodes.length) {
            node = node.childNodes[offset];
            offset = 0;
        }
        else {
            return null;
        }
    }
}

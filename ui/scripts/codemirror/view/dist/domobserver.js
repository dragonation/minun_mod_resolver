"use strict";
exports.__esModule = true;
var browser_1 = require("./browser.js");
var dom_1 = require("./dom.js");
var observeOptions = {
    childList: true,
    characterData: true,
    subtree: true,
    characterDataOldValue: true
};
// IE11 has very broken mutation observers, so we also listen to
// DOMCharacterDataModified there
var useCharData = browser_1["default"].ie && browser_1["default"].ie_version <= 11;
var DOMObserver = /** @class */ (function () {
    function DOMObserver(docView, onChange, onScrollChanged) {
        var _this = this;
        this.docView = docView;
        this.onChange = onChange;
        this.onScrollChanged = onScrollChanged;
        this.active = false;
        this.ignoreSelection = new dom_1.DOMSelection;
        this.charDataQueue = [];
        this.charDataTimeout = null;
        this.scrollTargets = [];
        this.intersection = null;
        this.intersecting = false;
        this.dom = docView.dom;
        this.observer = new MutationObserver(function (mutations) { return _this.flush(mutations); });
        if (useCharData)
            this.onCharData = function (event) {
                _this.charDataQueue.push({ target: event.target,
                    type: "characterData",
                    oldValue: event.prevValue });
                if (_this.charDataTimeout == null)
                    _this.charDataTimeout = setTimeout(function () { return _this.flush(); }, 20);
            };
        this.onSelectionChange = function () {
            if (_this.docView.root.activeElement == _this.dom)
                _this.flush();
        };
        this.start();
        this.onScroll = this.onScroll.bind(this);
        window.addEventListener("scroll", this.onScroll);
        if (typeof IntersectionObserver == "function") {
            this.intersection = new IntersectionObserver(function (entries) {
                if (entries[entries.length - 1].intersectionRatio > 0 != _this.intersecting) {
                    _this.intersecting = !_this.intersecting;
                    _this.onScroll();
                }
            }, {});
            this.intersection.observe(this.dom);
        }
        this.listenForScroll();
    }
    DOMObserver.prototype.onScroll = function () {
        if (this.intersecting) {
            this.flush();
            this.onScrollChanged();
        }
    };
    DOMObserver.prototype.listenForScroll = function () {
        var i = 0, changed = null;
        for (var dom = this.dom; dom;) {
            if (dom.nodeType == 1) {
                if (!changed && i < this.scrollTargets.length && this.scrollTargets[i] == dom)
                    i++;
                else if (!changed)
                    changed = this.scrollTargets.slice(0, i);
                if (changed)
                    changed.push(dom);
                dom = dom.parentNode;
            }
            else if (dom.nodeType == 11) { // Shadow root
                dom = dom.host;
            }
            else {
                break;
            }
        }
        if (i < this.scrollTargets.length && !changed)
            changed = this.scrollTargets.slice(0, i);
        if (changed) {
            for (var _i = 0, _a = this.scrollTargets; _i < _a.length; _i++) {
                var dom = _a[_i];
                dom.removeEventListener("scroll", this.onScroll);
            }
            for (var _b = 0, _c = this.scrollTargets = changed; _b < _c.length; _b++) {
                var dom = _c[_b];
                dom.addEventListener("scroll", this.onScroll);
            }
        }
    };
    DOMObserver.prototype.ignore = function (f) {
        if (!this.active)
            return f();
        try {
            this.stop();
            return f();
        }
        finally {
            this.start();
            this.clear();
        }
    };
    DOMObserver.prototype.start = function () {
        if (this.active)
            return;
        this.observer.observe(this.dom, observeOptions);
        // FIXME is this shadow-root safe?
        this.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
        if (useCharData)
            this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
        this.active = true;
    };
    DOMObserver.prototype.stop = function () {
        if (!this.active)
            return;
        this.active = false;
        this.observer.disconnect();
        this.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
        if (useCharData)
            this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    };
    DOMObserver.prototype.takeCharRecords = function () {
        var result = this.charDataQueue;
        if (result.length) {
            this.charDataQueue = [];
            clearTimeout(this.charDataTimeout);
            this.charDataTimeout = null;
        }
        return result;
    };
    DOMObserver.prototype.clearSelection = function () {
        this.ignoreSelection.set(this.docView.root.getSelection());
    };
    // Throw away any pending changes
    DOMObserver.prototype.clear = function () {
        this.observer.takeRecords();
        this.takeCharRecords();
        this.clearSelection();
    };
    // Apply pending changes, if any
    DOMObserver.prototype.flush = function (records) {
        var _this = this;
        if (records === void 0) { records = this.observer.takeRecords(); }
        if (this.charDataQueue.length)
            records = records.concat(this.takeCharRecords());
        var selection = this.docView.root.getSelection();
        var newSel = !this.ignoreSelection.eq(selection) && dom_1.hasSelection(this.dom, selection);
        if (records.length == 0 && !newSel)
            return;
        var from = -1, to = -1, typeOver = false;
        for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
            var record = records_1[_i];
            var range = this.readMutation(record);
            if (!range)
                continue;
            if (range.typeOver)
                typeOver = true;
            if (from == -1) {
                ;
                (from = range.from, to = range.to);
            }
            else {
                from = Math.min(range.from, from);
                to = Math.max(range.to, to);
            }
        }
        var apply = from > -1 || newSel;
        if (!apply || !this.onChange(from, to, typeOver)) {
            if (this.docView.dirty) {
                this.ignore(function () { return _this.docView.sync(); });
                this.docView.dirty = 0 /* Not */;
            }
            this.docView.updateSelection();
        }
        this.clearSelection();
    };
    DOMObserver.prototype.readMutation = function (rec) {
        var cView = this.docView.nearest(rec.target);
        if (!cView || cView.ignoreMutation(rec))
            return null;
        cView.markDirty();
        if (rec.type == "childList") {
            var childBefore = findChild(cView, rec.previousSibling || rec.target.previousSibling, -1);
            var childAfter = findChild(cView, rec.nextSibling || rec.target.nextSibling, 1);
            return { from: childBefore ? cView.posAfter(childBefore) : cView.posAtStart,
                to: childAfter ? cView.posBefore(childAfter) : cView.posAtEnd, typeOver: false };
        }
        else { // "characterData"
            return { from: cView.posAtStart, to: cView.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue };
        }
    };
    DOMObserver.prototype.destroy = function () {
        this.stop();
        if (this.intersection)
            this.intersection.disconnect();
        for (var _i = 0, _a = this.scrollTargets; _i < _a.length; _i++) {
            var dom = _a[_i];
            dom.removeEventListener("scroll", this.onScroll);
        }
        window.removeEventListener("scroll", this.onScroll);
    };
    return DOMObserver;
}());
exports.DOMObserver = DOMObserver;
function findChild(cView, dom, dir) {
    while (dom) {
        var curView = dom.cmView;
        if (curView && curView.parent == cView)
            return curView;
        var parent_1 = dom.parentNode;
        dom = parent_1 != cView.dom ? parent_1 : dir > 0 ? dom.nextSibling : dom.previousSibling;
    }
    return null;
}

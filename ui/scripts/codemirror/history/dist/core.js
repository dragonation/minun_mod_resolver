"use strict";
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
var Item = /** @class */ (function () {
    function Item(map, inverted, selection) {
        if (inverted === void 0) { inverted = null; }
        if (selection === void 0) { selection = null; }
        this.map = map;
        this.inverted = inverted;
        this.selection = selection;
    }
    Object.defineProperty(Item.prototype, "isChange", {
        get: function () { return this.inverted != null; },
        enumerable: true,
        configurable: true
    });
    return Item;
}());
function updateBranch(branch, to, maxLen, newItem) {
    var start = to + 1 > maxLen + 20 ? to - maxLen - 1 : 0;
    var newBranch = branch.slice(start, to);
    newBranch.push(newItem);
    return newBranch;
}
function isAdjacent(prev, cur) {
    return !!prev && cur.from <= prev.mapPos(prev.to, 1) && cur.to >= prev.mapPos(prev.from);
}
function addChanges(branch, changes, inverted, selectionBefore, maxLen, mayMerge) {
    if (branch.length) {
        var lastItem = branch[branch.length - 1];
        if (lastItem.selection && lastItem.isChange == Boolean(inverted) && mayMerge(lastItem))
            return inverted ? updateBranch(branch, branch.length - 1, maxLen, new Item(lastItem.map.appendSet(changes.desc), inverted.appendSet(lastItem.inverted), lastItem.selection)) : branch;
    }
    return updateBranch(branch, branch.length, maxLen, new Item(changes.desc, inverted, selectionBefore));
}
function popChanges(branch, only) {
    var map = null;
    var idx = branch.length - 1;
    for (;; idx--) {
        if (idx < 0)
            throw new RangeError("popChanges called on empty branch");
        var entry = branch[idx];
        if (entry.isChange || (only == 1 /* Any */ && entry.selection))
            break;
        map = map ? entry.map.appendSet(map) : entry.map;
    }
    var changeItem = branch[idx];
    var newBranch = branch.slice(0, idx), changes = changeItem.inverted || state_1.ChangeSet.empty, selection = changeItem.selection;
    if (map) {
        var startIndex = changeItem.map.length;
        map = changeItem.map.appendSet(map);
        var mappedChanges = [];
        for (var i = 0; i < changes.length; i++) {
            var mapped = changes.changes[i].map(map.partialMapping(startIndex - i));
            if (mapped) {
                map = map.append(mapped.desc);
                mappedChanges.push(mapped);
            }
        }
        newBranch.push(new Item(map));
        changes = new state_1.ChangeSet(mappedChanges); // FIXME preserve mirror data?
        selection = selection.map(map);
    }
    return { changes: changes, branch: newBranch, selection: selection };
}
function nope() { return false; }
function eqSelectionShape(a, b) {
    return a.ranges.length == b.ranges.length &&
        a.ranges.filter(function (r, i) { return r.empty != b.ranges[i].empty; }).length === 0;
}
var HistoryState = /** @class */ (function () {
    function HistoryState(done, undone, prevTime, prevUserEvent) {
        if (prevTime === void 0) { prevTime = null; }
        if (prevUserEvent === void 0) { prevUserEvent = undefined; }
        this.done = done;
        this.undone = undone;
        this.prevTime = prevTime;
        this.prevUserEvent = prevUserEvent;
    }
    HistoryState.prototype.resetTime = function () {
        return new HistoryState(this.done, this.undone);
    };
    HistoryState.prototype.addChanges = function (changes, inverted, selection, time, userEvent, newGroupDelay, maxLen) {
        var mayMerge = nope;
        if (this.prevTime !== null && time - this.prevTime < newGroupDelay &&
            (inverted || (this.prevUserEvent == userEvent && userEvent == "keyboard")))
            mayMerge = inverted
                ? function (prev) { return isAdjacent(prev.map.changes[prev.map.length - 1], changes.changes[0]); }
                : function (prev) { return eqSelectionShape(prev.selection, selection); };
        return new HistoryState(addChanges(this.done, changes, inverted, selection, maxLen, mayMerge), this.undone, time, userEvent);
    };
    HistoryState.prototype.addMapping = function (map, maxLen) {
        if (this.done.length == 0)
            return this;
        return new HistoryState(updateBranch(this.done, this.done.length, maxLen, new Item(map)), this.undone);
    };
    HistoryState.prototype.canPop = function (done, only) {
        var target = done == 0 /* Done */ ? this.done : this.undone;
        for (var _i = 0, target_1 = target; _i < target_1.length; _i++) {
            var _a = target_1[_i], isChange = _a.isChange, selection = _a.selection;
            if (isChange || (only == 1 /* Any */ && selection))
                return true;
        }
        return false;
    };
    HistoryState.prototype.pop = function (done, only, transaction, maxLen) {
        var _a = popChanges(done == 0 /* Done */ ? this.done : this.undone, only), changes = _a.changes, branch = _a.branch, selection = _a.selection;
        var oldSelection = transaction.selection;
        for (var _i = 0, _b = changes.changes; _i < _b.length; _i++) {
            var change = _b[_i];
            transaction.change(change);
        }
        transaction.setSelection(selection);
        var otherBranch = (done == 0 /* Done */ ? this.undone : this.done);
        otherBranch = addChanges(otherBranch, transaction.changes, transaction.changes.length > 0 ? transaction.invertedChanges() : null, oldSelection, maxLen, nope);
        return { transaction: transaction, state: new HistoryState(done == 0 /* Done */ ? branch : otherBranch, done == 0 /* Done */ ? otherBranch : branch) };
    };
    HistoryState.prototype.eventCount = function (done, only) {
        var count = 0, branch = done == 0 /* Done */ ? this.done : this.undone;
        for (var _i = 0, branch_1 = branch; _i < branch_1.length; _i++) {
            var _a = branch_1[_i], isChange = _a.isChange, selection = _a.selection;
            if (isChange || (only == 1 /* Any */ && selection))
                ++count;
        }
        return count;
    };
    HistoryState.empty = new HistoryState([], []);
    return HistoryState;
}());
exports.HistoryState = HistoryState;

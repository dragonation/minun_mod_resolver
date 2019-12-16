"use strict";
exports.__esModule = true;
var extension_1 = require("./extension.js");
var selection_1 = require("./selection.js");
var change_1 = require("./change.js");
/// Changes to the editor state are grouped into transactions.
/// Usually, a user action creates a single transaction, which may
/// contain zero or more document changes. Create a transaction by
/// calling [`EditorState.t`](#state.EditorState.t).
///
/// Transactions are mutable, and usually built up piece by piece with
/// updating methods and method chaining (most methods return the
/// transaction itself). Once they are
/// [applied](#state.Transaction.apply), they can't be updated
/// anymore.
var Transaction = /** @class */ (function () {
    /// @internal
    function Transaction(
    /// The state from which the transaction starts.
    startState, time) {
        if (time === void 0) { time = Date.now(); }
        this.startState = startState;
        /// The document changes made by this transaction.
        this.changes = change_1.ChangeSet.empty;
        /// The document versions after each of the changes.
        this.docs = [];
        this.flags = 0;
        this.state = null;
        this.selection = startState.selection;
        this._annotations = [Transaction.time(time)];
        this.configuration = startState.configuration;
    }
    Object.defineProperty(Transaction.prototype, "doc", {
        /// The document at the end of the transaction.
        get: function () {
            var last = this.docs.length - 1;
            return last < 0 ? this.startState.doc : this.docs[last];
        },
        enumerable: true,
        configurable: true
    });
    /// Add annotations to this transaction. Annotations can provide
    /// additional information about the transaction.
    Transaction.prototype.annotate = function () {
        var annotations = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            annotations[_i] = arguments[_i];
        }
        this.ensureOpen();
        for (var _a = 0, annotations_1 = annotations; _a < annotations_1.length; _a++) {
            var ann = annotations_1[_a];
            this._annotations.push(ann);
        }
        return this;
    };
    /// Get the value of the given annotation type, if any.
    Transaction.prototype.annotation = function (type) {
        for (var i = this._annotations.length - 1; i >= 0; i--)
            if (this._annotations[i].type == type)
                return this._annotations[i].value;
        return undefined;
    };
    /// Get all values associated with the given annotation in this
    /// transaction.
    Transaction.prototype.annotations = function (type) {
        var found = none;
        for (var _i = 0, _a = this._annotations; _i < _a.length; _i++) {
            var ann = _a[_i];
            if (ann.type == type) {
                if (found == none)
                    found = [];
                found.push(ann.value);
            }
        }
        return found;
    };
    /// Add a change to this transaction. If `mirror` is given, it
    /// should be the index (in `this.changes.changes`) at which the
    /// mirror image of this change sits.
    Transaction.prototype.change = function (change, mirror) {
        this.ensureOpen();
        if (change.from == change.to && change.length == 0)
            return this;
        if (change.from < 0 || change.to < change.from || change.to > this.doc.length)
            throw new RangeError("Invalid change " + change.from + " to " + change.to);
        this.changes = this.changes.append(change, mirror);
        this.docs.push(change.apply(this.doc));
        this.selection = this.selection.map(change);
        return this;
    };
    Object.defineProperty(Transaction.prototype, "docChanged", {
        /// Indicates whether the transaction changed the document.
        get: function () {
            return this.changes.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    /// Add a change replacing the given document range with the given
    /// content.
    Transaction.prototype.replace = function (from, to, text) {
        return this.change(new change_1.Change(from, to, typeof text == "string" ? this.startState.splitLines(text) : text));
    };
    /// Replace all selection ranges with the given content.
    Transaction.prototype.replaceSelection = function (text) {
        var _this = this;
        var content = typeof text == "string" ? this.startState.splitLines(text) : text;
        return this.forEachRange(function (range) {
            var change = new change_1.Change(range.from, range.to, content);
            _this.change(change);
            return new selection_1.SelectionRange(range.from + change.length);
        });
    };
    /// Run the given function for each selection range. The method will
    /// map the ranges to reflect deletions/insertions that happen
    /// before them. At the end, set the new selection to the ranges
    /// returned by the function (again, automatically mapped to for
    /// changes that happened after them).
    Transaction.prototype.forEachRange = function (f) {
        var sel = this.selection, start = this.changes.length, newRanges = [];
        for (var _i = 0, _a = sel.ranges; _i < _a.length; _i++) {
            var range = _a[_i];
            var before = this.changes.length;
            var result = f(range.map(this.changes.partialMapping(start)), this);
            if (this.changes.length > before) {
                var mapping = this.changes.partialMapping(before);
                for (var i = 0; i < newRanges.length; i++)
                    newRanges[i] = newRanges[i].map(mapping);
            }
            newRanges.push(result);
        }
        return this.setSelection(selection_1.EditorSelection.create(newRanges, sel.primaryIndex));
    };
    /// Update the selection.
    Transaction.prototype.setSelection = function (selection) {
        this.ensureOpen();
        this.selection = this.startState.behavior(extension_1.allowMultipleSelections) ? selection : selection.asSingle();
        this.flags |= 1 /* SelectionSet */;
        return this;
    };
    Object.defineProperty(Transaction.prototype, "selectionSet", {
        /// Tells you whether this transaction explicitly sets a new
        /// selection (as opposed to just mapping the selection through
        /// changes).
        get: function () {
            return (this.flags & 1 /* SelectionSet */) > 0;
        },
        enumerable: true,
        configurable: true
    });
    /// Set a flag on this transaction that indicates that the editor
    /// should scroll the selection into view after applying it.
    Transaction.prototype.scrollIntoView = function () {
        this.ensureOpen();
        this.flags |= 2 /* ScrollIntoView */;
        return this;
    };
    Object.defineProperty(Transaction.prototype, "scrolledIntoView", {
        /// Query whether the selection should be scrolled into view after
        /// applying this transaction.
        get: function () {
            return (this.flags & 2 /* ScrollIntoView */) > 0;
        },
        enumerable: true,
        configurable: true
    });
    /// Replace one or more [named
    /// extensions](#extension.ExtensionGroup.defineName) with new
    /// instances, creating a new configuration for the new state.
    Transaction.prototype.replaceExtensions = function (replace) {
        this.ensureOpen();
        this.configuration = this.configuration.replaceExtensions(replace);
        this.flags |= 4 /* Reconfigure */;
        return this;
    };
    /// Move to an entirely new state configuration.
    Transaction.prototype.reconfigure = function (extensions) {
        this.ensureOpen();
        this.configuration = extension_1.extendState.resolve(extensions);
        this.flags |= 4 /* Reconfigure */;
        return this;
    };
    Object.defineProperty(Transaction.prototype, "reconfigured", {
        /// Indicates whether the transaction reconfigures the state.
        get: function () {
            return (this.flags & 4 /* Reconfigure */) > 0;
        },
        enumerable: true,
        configurable: true
    });
    Transaction.prototype.ensureOpen = function () {
        if (this.state)
            throw new Error("Transactions may not be modified after being applied");
    };
    /// Apply this transaction, computing a new editor state. May be
    /// called multiple times (the result is cached). The transaction
    /// cannot be further modified after this has been called.
    Transaction.prototype.apply = function () {
        return this.state || (this.state = this.startState.applyTransaction(this));
    };
    /// Create a set of changes that undo the changes made by this
    /// transaction.
    Transaction.prototype.invertedChanges = function () {
        if (!this.changes.length)
            return change_1.ChangeSet.empty;
        var changes = [], set = this.changes;
        for (var i = set.length - 1; i >= 0; i--)
            changes.push(set.changes[i].invert(i == 0 ? this.startState.doc : this.docs[i - 1]));
        return new change_1.ChangeSet(changes, set.mirror.length ? set.mirror.map(function (i) { return set.length - i - 1; }) : set.mirror);
    };
    /// Annotation used to store transaction timestamps.
    Transaction.time = extension_1.Annotation.define();
    /// Annotation used to indicate that this transaction shouldn't
    /// clear the goal column, which is used during vertical cursor
    /// motion (so that moving over short lines doesn't reset the
    /// horizontal position to the end of the shortest line). Should
    /// generally only be set by commands that perform vertical motion.
    Transaction.preserveGoalColumn = extension_1.Annotation.define();
    /// Annotation used to associate a transaction with a user interface
    /// event. The view will set this to...
    ///
    ///  - `"paste"` when pasting content
    ///  - `"cut"` when cutting
    ///  - `"drop"` when content is inserted via drag-and-drop
    ///  - `"keyboard"` when moving the selection via the keyboard
    ///  - `"pointer"` when moving the selection through the pointing device
    Transaction.userEvent = extension_1.Annotation.define();
    /// Annotation indicating whether a transaction should be added to
    /// the undo history or not.
    Transaction.addToHistory = extension_1.Annotation.define();
    return Transaction;
}());
exports.Transaction = Transaction;
var none = [];

"use strict";
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
var extension_1 = require("../../extension/dist/extension.js");
var core_1 = require("./core.js");
var historyStateAnnotation = state_1.Annotation.define();
var closeHistoryAnnotation = state_1.Annotation.define();
var historyField = new state_1.StateField({
    init: function (editorState) {
        return core_1.HistoryState.empty;
    },
    apply: function (tr, state, editorState) {
        var fromMeta = tr.annotation(historyStateAnnotation);
        if (fromMeta)
            return fromMeta;
        if (tr.annotation(closeHistoryAnnotation))
            state = state.resetTime();
        if (!tr.changes.length && !tr.selectionSet)
            return state;
        var config = editorState.behavior(historyConfig);
        if (tr.annotation(state_1.Transaction.addToHistory) !== false)
            return state.addChanges(tr.changes, tr.changes.length ? tr.invertedChanges() : null, tr.startState.selection, tr.annotation(state_1.Transaction.time), tr.annotation(state_1.Transaction.userEvent), config.newGroupDelay, config.minDepth);
        return state.addMapping(tr.changes.desc, config.minDepth);
    }
});
var historyConfig = state_1.EditorState.extend.behavior({
    combine: function (configs) {
        return extension_1.combineConfig(configs, {
            minDepth: 100,
            newGroupDelay: 500
        }, { minDepth: Math.max, newGroupDelay: Math.min });
    }
});
/// Create a history extension with the given configuration.
function history(config) {
    if (config === void 0) { config = {}; }
    return [
        historyField.extension,
        historyConfig(config)
    ];
}
exports.history = history;
function cmd(target, only) {
    return function (_a) {
        var state = _a.state, dispatch = _a.dispatch;
        var config = state.behavior(historyConfig);
        var historyState = state.field(historyField, false);
        if (!historyState || !historyState.canPop(target, only))
            return false;
        var _b = historyState.pop(target, only, state.t(), config.minDepth), transaction = _b.transaction, newState = _b.state;
        dispatch(transaction.annotate(historyStateAnnotation(newState)));
        return true;
    };
}
/// Undo a single group of history events. Returns false if no group
/// was available.
exports.undo = cmd(0 /* Done */, 0 /* OnlyChanges */);
/// Redo a group of history events. Returns false if no group was
/// available.
exports.redo = cmd(1 /* Undone */, 0 /* OnlyChanges */);
/// Undo a selection change.
exports.undoSelection = cmd(0 /* Done */, 1 /* Any */);
/// Redo a selection change.
exports.redoSelection = cmd(1 /* Undone */, 1 /* Any */);
/// Set a flag on the given transaction that will prevent further steps
/// from being appended to an existing history event (so that they
/// require a separate undo command to undo).
function closeHistory(tr) {
    return tr.annotate(closeHistoryAnnotation(true));
}
exports.closeHistory = closeHistory;
function depth(target, only) {
    return function (state) {
        var histState = state.field(historyField, false);
        return histState ? histState.eventCount(target, only) : 0;
    };
}
/// The amount of undoable change events available in a given state.
exports.undoDepth = depth(0 /* Done */, 0 /* OnlyChanges */);
/// The amount of redoable change events available in a given state.
exports.redoDepth = depth(1 /* Undone */, 0 /* OnlyChanges */);
/// The amount of undoable events available in a given state.
exports.redoSelectionDepth = depth(0 /* Done */, 1 /* Any */);
/// The amount of redoable events available in a given state.
exports.undoSelectionDepth = depth(1 /* Undone */, 1 /* Any */);

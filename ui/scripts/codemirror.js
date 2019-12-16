const view = require("./codemirror/view/dist/index.js");
const state = require("./codemirror/state/dist/index.js");

module.exports.EditorView = view.EditorView;
module.exports.EditorState = state.EditorState;

// extensions

// lang-css
// lang-html
// lang-javascript
// panel
// rangeset
// stream-syntax
// syntax
// text
// tooltip

const { html } = require("./codemirror/lang-html/dist/html.js");
module.exports.html = html;

const { autocomplete, sortAndFilterCompletion } = require("./codemirror/autocomplete/dist/index.js");
module.exports.autocomplete = autocomplete;
module.exports.sortAndFilterCompletion = sortAndFilterCompletion;

const { closeBrackets } = require("./codemirror/closebrackets/dist/closebrackets.js");
module.exports.closeBrackets = closeBrackets;

const { baseKeymap, indentSelection } = require("./codemirror/commands/dist/commands.js");
module.exports.baseKeymap = baseKeymap;
module.exports.indentSelection = indentSelection;

const { foldCode, unfoldCode, codeFolding, foldGutter } = require("./codemirror/fold/dist/fold.js");
module.exports.foldCode = foldCode;
module.exports.unfoldCode = unfoldCode;
module.exports.codeFolding = codeFolding;
module.exports.foldGutter = foldGutter;

const { lineNumbers } = require("./codemirror/gutter/dist/index.js");
module.exports.lineNumbers = lineNumbers;

const { defaultHighlighter } = require("./codemirror/highlight/dist/highlight.js");
module.exports.defaultHighlighter = defaultHighlighter;

const { history, redo, redoSelection, undo, undoSelection } = require("./codemirror/history/dist/history.js");
module.exports.history = history;
module.exports.redo = redo;
module.exports.redoSelection = redoSelection;
module.exports.undo = undo;
module.exports.undoSelection = undoSelection;

const { keymap } = require("./codemirror/keymap/dist/keymap.js");
module.exports.keymap = keymap;

const { linter } = require("./codemirror/lint/dist/lint.js");
module.exports.linter = linter;

const { bracketMatching } = require("./codemirror/matchbrackets/dist/matchbrackets.js");
module.exports.bracketMatching = bracketMatching;

const { multipleSelections } = require("./codemirror/multiple-selections/dist/multiple-selections.js");
module.exports.multipleSelections = multipleSelections;

const { search, defaultSearchKeymap } = require("./codemirror/search/dist/search.js");
module.exports.search = search;
module.exports.multipleSelections = multipleSelections;

const { specialChars } = require("./codemirror/special-chars/dist/special-chars.js");
module.exports.specialChars = specialChars;

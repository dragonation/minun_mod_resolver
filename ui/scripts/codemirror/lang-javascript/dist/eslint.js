"use strict";
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
var javascript_1 = require("./javascript.js");
var syntax_1 = require("../../syntax/dist/index.js");
/// Connects an [ESLint](https://eslint.org/) linter to CodeMirror's
/// [lint](#lint) integration. `eslint` should be an instance of the
/// [`Linter`](https://eslint.org/docs/developer-guide/nodejs-api#linter)
/// class, and `config` an optional ESLint configuration. The return
/// value of this function can be passed to [`linter`](#lint.linter)
/// to create a JavaScript linting extension.
///
/// Note that ESLint targets node, and is tricky to run in the
/// browser. The [eslint4b](https://github.com/mysticatea/eslint4b)
/// and
/// [eslint4b-prebuilt](https://github.com/marijnh/eslint4b-prebuilt/)
/// packages may help with that.
function esLint(eslint, config) {
    if (!config) {
        config = {
            parserOptions: { ecmaVersion: 2019, sourceType: "module" },
            env: { browser: true, node: true, es6: true, es2015: true, es2017: true, es2020: true },
            rules: {}
        };
        eslint.getRules().forEach(function (desc, name) {
            if (desc.meta.docs.recommended)
                config.rules[name] = 2;
        });
    }
    function range(state, from, to) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = state.doc.length; }
        var fromLine = state.doc.lineAt(from), offset = { line: fromLine.number - 1, col: from - fromLine.start, pos: from };
        return eslint.verify(state.doc.slice(from, to), config)
            .map(function (val) { return translateDiagnostic(val, state.doc, offset); });
    }
    return function (view) {
        var syntax = view.state.behavior(state_1.EditorState.syntax)[0];
        if (syntax == javascript_1.javascriptSyntax)
            return range(view.state);
        if (!syntax || !(syntax instanceof syntax_1.LezerSyntax && syntax.parser.hasNested))
            return [];
        var found = [];
        syntax.getPartialTree(view.state, 0, view.state.doc.length).iterate({
            enter: function (type, start, end) {
                if (type == javascript_1.javascriptSyntax.docNodeType) {
                    for (var _i = 0, _a = range(view.state, start, end); _i < _a.length; _i++) {
                        var d = _a[_i];
                        found.push(d);
                    }
                    return false;
                }
                return undefined;
            }
        });
        return found;
    };
}
exports.esLint = esLint;
function mapPos(line, col, doc, offset) {
    return doc.line(line + offset.line).start + col + (line == 1 ? offset.col - 1 : -1);
}
function translateDiagnostic(input, doc, offset) {
    var start = mapPos(input.line, input.column, doc, offset);
    var result = {
        from: start,
        to: input.endLine != null && input.endColumn != 1 ? mapPos(input.endLine, input.endColumn, doc, offset) : start,
        message: input.message,
        source: input.ruleId ? "jshint:" + input.ruleId : "jshint",
        severity: input.severity == 1 ? "warning" : "error"
    };
    if (input.fix) {
        var _a = input.fix, range = _a.range, text_1 = _a.text, from_1 = range[0] + offset.pos - start, to_1 = range[1] + offset.pos - start;
        result.actions = [{
                name: "fix",
                apply: function (view, start, end) {
                    view.dispatch(view.state.t().replace(Math.min(start + from_1, end), Math.min(start + to_1, end), text_1).scrollIntoView());
                }
            }];
    }
    return result;
}

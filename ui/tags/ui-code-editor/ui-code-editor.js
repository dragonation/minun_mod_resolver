const {

    EditorView,
    EditorState,

    lineNumbers,
    history,
    html,
    specialChars,
    foldGutter,
    multipleSelections,
    defaultHighlighter,
    bracketMatching,
    closeBrackets,
    keymap,
    baseKeymap,

    undo,
    redo,
    indentSelection,
    foldCode,
    unfoldCode

} = require("./codemirror.js");

let myView = new EditorView({
    "state": EditorState.create({
        "doc": "<html>&nbsp;Haha</html>",
        "extensions": [
            history(),
            html(),
            multipleSelections(),
        ]
    }),
    "extensions": [
        lineNumbers(),
        specialChars(),
        foldGutter(),
        // linter(esLint(new Linter)),
        // search({ "keymap": defaultSearchKeymap }),
        defaultHighlighter,
        bracketMatching(),
        closeBrackets,
        // autocomplete({
        //     "completeAt": function (state, position) {
        //         return new Promise((resolve) => {
        //             let syntax = state.behavior(EditorState.syntax)[0];
        //             let tree = syntax.getPartialTree(state, pos, pos).resolve(pos, -1);
        //             let start = position;
        //             let items = [
        //                 "a", "abbr", "address", "alu", "area", "article", "aside", "audio", "b",
        //                 "base", "bdi", "bdo", "blockquote", "body", "br", "button", "canvas",
        //                 "caption", "cite", "code", "col", "colgroup", "command", "data", "datalist",
        //                 "dd", "del", "details", "dfn", "div", "dl", "dt", "em", "embed", "fieldset",
        //                 "figcaption", "figure", "footer", "form", "fram", "h1", "h2", "h3", "h4",
        //                 "h5", "h6", "head", "header", "hr", "html", "i", "iframe", "img", "input",
        //                 "ins", "kbd", "keygen", "label", "las", "legend", "li", "link", "main",
        //                 "map", "mark", "math", "menu", "meta", "meter", "nav", "noscript", "object",
        //                 "ol", "optgroup", "option", "output", "p", "param", "pre", "progress", "q",
        //                 "re", "rp", "rt", "ruby", "s", "samp", "script", "section", "select",
        //                 "small", "source", "span", "strong", "style", "sub", "summary", "sup",
        //                 "svg", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time",
        //                 "title", "tr", "track", "u", "ul", "var", "video", "wbr", "yp"
        //             ].map(s => ({label: s, insertText: s + ">"}))
        //             if (tree.name == "StartTag" || tree.name == "StartCloseTag") return resolve({start, items})
        //             if (tree.name != "TagName" && tree.name != "MismatchedTagName") return resolve({start, items: []})
        //             start = tree.start
        //             setTimeout(() => resolve({
        //                 start,
        //                 items: sortAndFilterCompletion(state.doc.slice(start, pos), items)
        //             }), 100)
        //         })
        //     }
        // }),
        keymap({
            "Mod-z": undo,
            "Mod-Shift-z": redo,
            // "Mod-u": view => undoSelection(view) || true,
            // [isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
            // "Ctrl-y": isMac ? undefined : redo,
            "Shift-Tab": indentSelection,
            "Mod-Alt-[": foldCode,
            "Mod-Alt-]": unfoldCode
        }),
        keymap(baseKeymap)
    ]
});

document.body.appendChild(myView.dom);

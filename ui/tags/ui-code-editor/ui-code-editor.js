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

} = require("../../scripts/codemirror.js");

module.exports = {
    "attributes": [ "code", "syntax", "theme" ],
    "listeners": {
        "onconnected": function () {

            let editorView = new EditorView({
                "state": EditorState.create({
                    "doc": "hello, world",
                    "extensions": [ history(), multipleSelections() ]
                }),
                "root": this.shadowRoot,
                "extensions": [
                    lineNumbers(),
                    specialChars(),
                    foldGutter(),
                    defaultHighlighter,
                    bracketMatching(),
                    closeBrackets,
                    keymap({
                        "Mod-z": undo,
                        "Mod-Shift-z": redo,
                        "Shift-Tab": indentSelection,
                        "Mod-Alt-[": foldCode,
                        "Mod-Alt-]": unfoldCode
                    }),
                    keymap(baseKeymap)
                ]
            });

            console.log(editorView);

            this.filler.query("#container").append($(editorView.dom).css({
                "width": "100%",
                "height": "100%"
            }));

        }
    },
    "properties": {
        "code": {
            "get": function () {

            },
            "set": function () {

            }
        }
    }
};

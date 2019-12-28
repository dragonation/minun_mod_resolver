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
                    "doc": this.code,
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

            this.editorView = editorView;

            this.filler.query("#container").append($(editorView.dom));

        }
    },
    "properties": {
        "code": {
            "get": function () {
                if (!this.editorView) {
                    return this.cmCode ? this.cmCode : "";
                }
                return this.editorView.state.toString();
            },
            "set": function (value) {

                this.cmCode = value + "";

                if (!this.editorView) {
                    return;
                }

                let state = this.editorView.state;

                let transaction = state.t().replace(0, state.doc.toString().length, value);

                this.editorView.update([transaction]);

            }
        }
    }
};

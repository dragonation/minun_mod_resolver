"use strict";
exports.__esModule = true;
var state_1 = require("../../state/dist/index.js");
var extension_1 = require("./extension.js");
var browser_1 = require("./browser.js");
var cursor_1 = require("./cursor.js");
// This will also be where dragging info and such goes
var InputState = /** @class */ (function () {
    function InputState(view) {
        var _this = this;
        this.lastKeyCode = 0;
        this.lastKeyTime = 0;
        this.lastSelectionOrigin = null;
        this.lastSelectionTime = 0;
        this.registeredEvents = [];
        this.customHandlers = [];
        this.composing = false;
        this.goalColumns = [];
        this.mouseSelection = null;
        var _loop_1 = function (type) {
            var handler = handlers[type];
            view.contentDOM.addEventListener(type, function (event) {
                if (!eventBelongsToEditor(view, event))
                    return;
                if (_this.runCustomHandlers(type, view, event))
                    event.preventDefault();
                else
                    handler(view, event);
            });
            this_1.registeredEvents.push(type);
        };
        var this_1 = this;
        for (var type in handlers) {
            _loop_1(type);
        }
        // Must always run, even if a custom handler handled the event
        view.contentDOM.addEventListener("keydown", function (event) {
            view.inputState.lastKeyCode = event.keyCode;
            view.inputState.lastKeyTime = Date.now();
        });
        if (view.root.activeElement == view.contentDOM)
            view.dom.classList.add("codemirror-focused");
        this.ensureHandlers(view);
    }
    InputState.prototype.setSelectionOrigin = function (origin) {
        this.lastSelectionOrigin = origin;
        this.lastSelectionTime = Date.now();
    };
    InputState.prototype.ensureHandlers = function (view) {
        var _this = this;
        var handlers = view.behavior(extension_1.handleDOMEvents);
        if (handlers == this.customHandlers ||
            (handlers.length == this.customHandlers.length && handlers.every(function (h, i) { return h == _this.customHandlers[i]; })))
            return;
        this.customHandlers = handlers;
        for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
            var set = handlers_1[_i];
            var _loop_2 = function (type) {
                if (this_2.registeredEvents.indexOf(type) < 0) {
                    this_2.registeredEvents.push(type);
                    view.contentDOM.addEventListener(type, function (event) {
                        if (!eventBelongsToEditor(view, event))
                            return;
                        if (_this.runCustomHandlers(type, view, event))
                            event.preventDefault();
                    });
                }
            };
            var this_2 = this;
            for (var type in set) {
                _loop_2(type);
            }
        }
    };
    InputState.prototype.runCustomHandlers = function (type, view, event) {
        for (var _i = 0, _a = this.customHandlers; _i < _a.length; _i++) {
            var handlers_2 = _a[_i];
            var handler = handlers_2[type];
            if (handler) {
                try {
                    if (handler(view, event) || event.defaultPrevented)
                        return true;
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        return false;
    };
    InputState.prototype.startMouseSelection = function (view, event, update) {
        if (this.mouseSelection)
            this.mouseSelection.destroy();
        this.mouseSelection = new MouseSelection(this, view, event, update);
    };
    InputState.prototype.update = function (update) {
        if (this.mouseSelection)
            this.mouseSelection.map(update.changes);
        this.lastKeyCode = this.lastSelectionTime = 0;
    };
    InputState.prototype.destroy = function () {
        if (this.mouseSelection)
            this.mouseSelection.destroy();
    };
    return InputState;
}());
exports.InputState = InputState;
var MouseSelection = /** @class */ (function () {
    function MouseSelection(inputState, view, event, update) {
        this.inputState = inputState;
        this.view = view;
        this.update = update;
        var doc = view.contentDOM.ownerDocument;
        doc.addEventListener("mousemove", this.move = this.move.bind(this));
        doc.addEventListener("mouseup", this.up = this.up.bind(this));
        this.extend = event.shiftKey;
        this.multiple = view.state.behavior(state_1.EditorState.allowMultipleSelections) && addsSelectionRange(view, event);
        this.dragMove = dragMovesSelection(view, event);
        this.startSelection = view.state.selection;
        var _a = this.queryPos(event), pos = _a.pos, bias = _a.bias;
        this.startPos = this.curPos = pos;
        this.startBias = this.curBias = bias;
        this.dragging = isInPrimarySelection(view, this.startPos, event) ? null : false;
        // When clicking outside of the selection, immediately apply the
        // effect of starting the selection
        if (this.dragging === false) {
            event.preventDefault();
            this.select();
        }
    }
    MouseSelection.prototype.queryPos = function (event) {
        var pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
        var coords = this.view.coordsAtPos(pos);
        var bias = !coords ? 1 :
            coords.top > event.clientY ? -1 :
                coords.bottom < event.clientY ? 1 :
                    coords.left > event.clientX ? -1 : 1;
        return { pos: pos, bias: bias };
    };
    MouseSelection.prototype.move = function (event) {
        if (event.buttons == 0)
            return this.destroy();
        if (this.dragging !== false)
            return;
        var _a = this.queryPos(event), pos = _a.pos, bias = _a.bias;
        if (pos == this.curPos && bias == this.curBias)
            return;
        this.curPos = pos;
        this.curBias = bias;
        this.select();
    };
    MouseSelection.prototype.up = function (event) {
        if (this.dragging == null)
            this.select();
        this.destroy();
    };
    MouseSelection.prototype.destroy = function () {
        var doc = this.view.contentDOM.ownerDocument;
        doc.removeEventListener("mousemove", this.move);
        doc.removeEventListener("mouseup", this.up);
        this.inputState.mouseSelection = null;
    };
    MouseSelection.prototype.select = function () {
        var selection = this.update(this.view, this.startSelection, this.startPos, this.startBias, this.curPos, this.curBias, this.extend, this.multiple);
        if (!selection.eq(this.view.state.selection))
            this.view.dispatch(this.view.state.t().setSelection(selection)
                .annotate(state_1.Transaction.userEvent("pointer")));
    };
    MouseSelection.prototype.map = function (changes) {
        if (changes.length) {
            this.startSelection = this.startSelection.map(changes);
            this.startPos = changes.mapPos(this.startPos);
            this.curPos = changes.mapPos(this.curPos);
        }
        if (this.dragging)
            this.dragging = this.dragging.map(changes);
    };
    return MouseSelection;
}());
function addsSelectionRange(view, event) {
    var behavior = view.behavior(extension_1.clickAddsSelectionRange);
    return behavior.length ? behavior[0](event) : browser_1["default"].mac ? event.metaKey : event.ctrlKey;
}
function dragMovesSelection(view, event) {
    var behavior = view.behavior(extension_1.dragMovesSelection);
    return behavior.length ? behavior[0](event) : browser_1["default"].mac ? !event.altKey : !event.ctrlKey;
}
function isInPrimarySelection(view, pos, event) {
    var primary = view.state.selection.primary;
    if (primary.empty)
        return false;
    if (pos < primary.from || pos > primary.to)
        return false;
    if (pos > primary.from && pos < primary.to)
        return true;
    // On boundary clicks, check whether the coordinates are inside the
    // selection's client rectangles
    var sel = view.root.getSelection();
    if (sel.rangeCount == 0)
        return true;
    var rects = sel.getRangeAt(0).getClientRects();
    for (var i = 0; i < rects.length; i++) {
        var rect = rects[i];
        if (rect.left <= event.clientX && rect.right >= event.clientX &&
            rect.top <= event.clientY && rect.bottom >= event.clientY)
            return true;
    }
    return false;
}
function eventBelongsToEditor(view, event) {
    if (!event.bubbles)
        return true;
    if (event.defaultPrevented)
        return false;
    for (var node = event.target; node != view.contentDOM; node = node.parentNode)
        if (!node || node.nodeType == 11 || (node.cmView && node.cmView.ignoreEvent(event)))
            return false;
    return true;
}
var handlers = Object.create(null);
// This is very crude, but unfortunately both these browsers _pretend_
// that they have a clipboard API—all the objects and methods are
// there, they just don't work, and they are hard to test.
var brokenClipboardAPI = (browser_1["default"].ie && browser_1["default"].ie_version < 15) ||
    (browser_1["default"].ios && browser_1["default"].webkit_version < 604);
function capturePaste(view) {
    var doc = view.dom.ownerDocument;
    var target = doc.body.appendChild(doc.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.focus();
    setTimeout(function () {
        view.focus();
        doc.body.removeChild(target);
        doPaste(view, target.value);
    }, 50);
}
function doPaste(view, text) {
    view.dispatch(view.state.t().replaceSelection(text)
        .annotate(state_1.Transaction.userEvent("paste")).scrollIntoView());
}
function mustCapture(event) {
    var mods = (event.ctrlKey ? 1 /* Ctrl */ : 0) | (event.metaKey ? 8 /* Meta */ : 0) |
        (event.altKey ? 2 /* Alt */ : 0) | (event.shiftKey ? 4 /* Shift */ : 0);
    var code = event.keyCode, macCtrl = browser_1["default"].mac && mods == 1 /* Ctrl */;
    return code == 8 || (macCtrl && code == 72) || // Backspace, Ctrl-h on Mac
        code == 46 || (macCtrl && code == 68) || // Delete, Ctrl-d on Mac
        code == 27 || // Esc
        (mods == (browser_1["default"].mac ? 8 /* Meta */ : 1 /* Ctrl */) && // Ctrl/Cmd-[biyz]
            (code == 66 || code == 73 || code == 89 || code == 90));
}
handlers.keydown = function (view, event) {
    if (mustCapture(event))
        event.preventDefault();
    view.inputState.setSelectionOrigin("keyboard");
};
handlers.touchdown = handlers.touchmove = function (view, event) {
    view.inputState.setSelectionOrigin("pointer");
};
handlers.mousedown = function (view, event) {
    if (event.button == 0)
        view.startMouseSelection(event, updateMouseSelection(event.detail));
};
function rangeForClick(view, pos, bias, type) {
    if (type == 1) { // Single click
        return new state_1.SelectionRange(pos);
    }
    else if (type == 2) { // Double click
        return state_1.SelectionRange.groupAt(view.state, pos, bias);
    }
    else { // Triple click
        var context = cursor_1.LineContext.get(view, pos);
        if (context)
            return new state_1.SelectionRange(context.start + context.line.length, context.start);
        var _a = view.state.doc.lineAt(pos), start = _a.start, end = _a.end;
        return new state_1.SelectionRange(start, end);
    }
}
function updateMouseSelection(type) {
    return function (view, startSelection, startPos, startBias, curPos, curBias, extend, multiple) {
        var range = rangeForClick(view, curPos, curBias, type);
        if (startPos != curPos && !extend) {
            var startRange = rangeForClick(view, startPos, startBias, type);
            range = range.extend(Math.min(startRange.from, range.from), Math.max(startRange.to, range.to));
        }
        if (extend)
            return startSelection.replaceRange(startSelection.primary.extend(range.from, range.to));
        else if (multiple)
            return startSelection.addRange(range);
        else
            return state_1.EditorSelection.create([range]);
    };
}
handlers.dragstart = function (view, event) {
    var _a = view.state, doc = _a.doc, primary = _a.selection.primary;
    var mouseSelection = view.inputState.mouseSelection;
    if (mouseSelection)
        mouseSelection.dragging = primary;
    if (event.dataTransfer) {
        event.dataTransfer.setData("Text", doc.slice(primary.from, primary.to));
        event.dataTransfer.effectAllowed = "copyMove";
    }
};
handlers.drop = function (view, event) {
    if (!event.dataTransfer)
        return;
    var dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    var text = event.dataTransfer.getData("Text");
    if (dropPos < 0 || !text)
        return;
    event.preventDefault();
    var tr = view.state.t();
    var mouseSelection = view.inputState.mouseSelection;
    if (mouseSelection && mouseSelection.dragging && mouseSelection.dragMove) {
        tr.replace(mouseSelection.dragging.from, mouseSelection.dragging.to, "");
        dropPos = tr.changes.mapPos(dropPos);
    }
    var change = new state_1.Change(dropPos, dropPos, view.state.splitLines(text));
    tr.change(change)
        .setSelection(state_1.EditorSelection.single(dropPos, dropPos + change.length))
        .annotate(state_1.Transaction.userEvent("drop"));
    view.focus();
    view.dispatch(tr);
};
handlers.paste = function (view, event) {
    view.docView.observer.flush();
    var data = brokenClipboardAPI ? null : event.clipboardData;
    var text = data && data.getData("text/plain");
    if (text) {
        doPaste(view, text);
        event.preventDefault();
    }
    else {
        capturePaste(view);
    }
};
function captureCopy(view, text) {
    // The extra wrapper is somehow necessary on IE/Edge to prevent the
    // content from being mangled when it is put onto the clipboard
    var doc = view.dom.ownerDocument;
    var target = doc.body.appendChild(doc.createElement("textarea"));
    target.style.cssText = "position: fixed; left: -10000px; top: 10px";
    target.value = text;
    target.focus();
    target.selectionEnd = text.length;
    target.selectionStart = 0;
    setTimeout(function () {
        doc.body.removeChild(target);
        view.focus();
    }, 50);
}
handlers.copy = handlers.cut = function (view, event) {
    var range = view.state.selection.primary;
    if (range.empty)
        return;
    var data = brokenClipboardAPI ? null : event.clipboardData;
    var text = view.state.joinLines(view.state.doc.sliceLines(range.from, range.to));
    if (data) {
        event.preventDefault();
        data.clearData();
        data.setData("text/plain", text);
    }
    else {
        captureCopy(view, text);
    }
    if (event.type == "cut") {
        view.dispatch(view.state.t().replaceSelection([""]).scrollIntoView().annotate(state_1.Transaction.userEvent("cut")));
    }
};
handlers.focus = function (view) {
    view.update([], [extension_1.focusChange(true)]);
};
handlers.blur = function (view) {
    view.update([], [extension_1.focusChange(false)]);
};
handlers.beforeprint = function (view) {
    view.docView.checkLayout(true);
};
// Dummy annotation to force a display update in the absence of other triggers
var compositionEndAnnotation = state_1.Annotation.define();
function forceClearComposition(view) {
    if (view.docView.compositionDeco.size)
        view.update([], [compositionEndAnnotation(null)]);
}
handlers.compositionstart = handlers.compositionupdate = function (view) {
    if (!view.inputState.composing) {
        if (view.docView.compositionDeco.size) {
            view.docView.observer.flush();
            forceClearComposition(view);
        }
        // FIXME possibly set a timeout to clear it again on Android
        view.inputState.composing = true;
    }
};
handlers.compositionend = function (view) {
    view.inputState.composing = false;
    setTimeout(function () {
        if (!view.inputState.composing)
            forceClearComposition(view);
    }, 50);
};

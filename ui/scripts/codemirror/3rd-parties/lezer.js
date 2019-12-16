'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var lezerTree = require('./lezer-tree.js');

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var Badness;
(function (Badness) {
    // Amount to add for a single recover action
    Badness[Badness["Unit"] = 100] = "Unit";
    // Badness at which we disallow adding a stack if another stack
    // shares its top state and position.
    Badness[Badness["Deduplicate"] = 200] = "Deduplicate";
    // The maximum amount of active stacks at which recovery actions are
    // applied
    Badness[Badness["MaxRecoverStacks"] = 25] = "MaxRecoverStacks";
    // If badness reaches this level (and there are sibling stacks),
    // don't recover.
    Badness[Badness["TooBadToRecover"] = 500] = "TooBadToRecover";
    // If the best sibling is this amount better than the current stack,
    // don't apply recovery.
    Badness[Badness["RecoverSiblingFactor"] = 3] = "RecoverSiblingFactor";
    // Constant used to prune stacks that run error-free alongside each
    // other for too long
    Badness[Badness["MaxParallelBufferLength"] = 800] = "MaxParallelBufferLength";
})(Badness || (Badness = {}));
// Badness is a measure of how off-the-rails a given parse is. It is
// bumped when a recovery strategy is applied, and then reduced (by
// multiplication with a constant < 1) for every successful (real)
// token shifted.
//
// Stacks with a low badness are relatively credible parses that have
// shifts matching the input in their recent history. Stacks with a
// high badness are deeply in the weeds and likely wrong. In either of
// these situations, we prune agressively by dropping stacks when
// another stack at the same position is looking better.
//
// For those in the `Badness.Stabilizing` to `Badness.Wild` range, we
// assume that they are in the process of trying to recover and allow
// a bunch of them to continue alongside each other to see which one
// works out better.
//
// Stacks with the same low badness score are likely to be valid GLR
// parsing branches, so in that case it's often a good idea to let
// both continue.
//
// When a stack fails to find an advancing action, recovery is only
// applied when its badness is < `Badness.Wild`, or no better parse
// exists at that point.
/// A parse stack. These are used internally by the parser to track
/// parsing progress. They also provide some properties and methods
/// that external code such as a tokenizer can use to get information
/// about the parse state.
var Stack = /** @class */ (function () {
    /// @internal
    function Stack(
    // A group of values that the stack will share with all
    // split instances
    ///@internal
    cx,
    // Holds state, pos, value stack pos (15 bits array index, 15 bits
    // buffer index) triplets for all but the top state
    /// @internal
    stack,
    // The current parse state
    /// @internal
    state,
    // The position at which the next reduce should take place. This
    // can be less than `this.pos` when skipped expressions have been
    // added to the stack (which should be moved outside of the next
    // reduction)
    /// @internal
    reducePos,
    // The input position up to which this stack has parsed.
    pos,
    // A measure of the amount of error-recovery that recently
    // happened on this stack
    /// @internal
    badness,
    // The output buffer. Holds (type, start, end, size) quads
    // representing nodes created by the parser, where `size` is
    // amount of buffer array entries covered by this node.
    /// @internal
    buffer,
    // The base offset of the buffer. When stacks are split, the split
    // instance shared the buffer history with its parent up to
    // `bufferBase`, which is the absolute offset (including the
    // offset of previous splits) into the buffer at which this stack
    // starts writing.
    /// @internal
    bufferBase,
    // A parent stack from which this was split off, if any. This is
    // set up so that it always points to a stack that has some
    // additional buffer content, never to a stack with an equal
    // `bufferBase`.
    /// @internal
    parent) {
        this.cx = cx;
        this.stack = stack;
        this.state = state;
        this.reducePos = reducePos;
        this.pos = pos;
        this.badness = badness;
        this.buffer = buffer;
        this.bufferBase = bufferBase;
        this.parent = parent;
    }
    /// @internal
    Stack.prototype.toString = function () {
        return "[" + this.stack.filter(function (_, i) { return i % 3 == 0; }).concat(this.state).join(",") + "]";
    };
    // Start an empty stack
    /// @internal
    Stack.start = function (cx, pos) {
        if (pos === void 0) { pos = 0; }
        return new Stack(cx, [], cx.parser.states[0], pos, pos, 0, [], 0, null);
    };
    // Push a state onto the stack, tracking its start position as well
    // as the buffer base at that point.
    /// @internal
    Stack.prototype.pushState = function (state, start) {
        this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
        this.state = state;
    };
    // Apply a reduce action
    /// @internal
    Stack.prototype.reduce = function (action) {
        var depth = action >> 19 /* ReduceDepthShift */, type = action & 65535 /* ValueMask */;
        var parser = this.cx.parser;
        if (depth == 0) {
            // Zero-depth reductions are a special case—they add stuff to
            // the stack without popping anything off.
            if (type <= parser.maxNode)
                this.storeNode(type, this.reducePos, this.reducePos, 4, true);
            this.pushState(parser.getGoto(this.state, type, true), this.reducePos);
            return;
        }
        // Find the base index into `this.stack`, content after which will
        // be dropped. Note that with `StayFlag` reductions we need to
        // consume two extra frames (the dummy parent node for the skipped
        // expression and the state that we'll be staying in, which should
        // be moved to `this.state`).
        var base = this.stack.length - ((depth - 1) * 3) - (action & 262144 /* StayFlag */ ? 6 : 0);
        var start = this.stack[base - 2];
        var bufferBase = this.stack[base - 1], count = this.bufferBase + this.buffer.length - bufferBase;
        if (type <= parser.maxNode && ((action & 131072 /* RepeatFlag */) || !parser.group.types[type].prop(lezerTree.NodeProp.repeated))) {
            var pos = parser.stateFlag(this.state, 1 /* Skipped */) ? this.pos : this.reducePos;
            this.storeNode(type, start, pos, count + 4, true);
        }
        if (action & 262144 /* StayFlag */) {
            this.state = this.stack[base];
        }
        else {
            var baseStateID = this.stack[base - 3];
            this.state = parser.getGoto(baseStateID, type, true);
        }
        while (this.stack.length > base)
            this.stack.pop();
    };
    // Shift a value into the buffer
    /// @internal
    Stack.prototype.storeNode = function (term, start, end, size, isReduce) {
        if (size === void 0) { size = 4; }
        if (isReduce === void 0) { isReduce = false; }
        if (term == 0 /* Err */) { // Try to omit/merge adjacent error nodes
            var cur = this, top = this.buffer.length;
            if (top == 0 && cur.parent) {
                top = cur.bufferBase - cur.parent.bufferBase;
                cur = cur.parent;
            }
            if (top > 0 && cur.buffer[top - 4] == 0 /* Err */ && cur.buffer[top - 1] > -1) {
                if (start == end)
                    return;
                if (cur.buffer[top - 2] >= start) {
                    cur.buffer[top - 2] = end;
                    return;
                }
            }
        }
        if (!isReduce || this.pos == end) { // Simple case, just append
            this.buffer.push(term, start, end, size);
        }
        else { // There may be skipped nodes that have to be moved forward
            var index = this.buffer.length;
            if (index > 0 && this.buffer[index - 4] != 0 /* Err */)
                while (index > 0 && this.buffer[index - 2] > end) {
                    // Move this record forward
                    this.buffer[index] = this.buffer[index - 4];
                    this.buffer[index + 1] = this.buffer[index - 3];
                    this.buffer[index + 2] = this.buffer[index - 2];
                    this.buffer[index + 3] = this.buffer[index - 1];
                    index -= 4;
                    if (size > 4)
                        size -= 4;
                }
            this.buffer[index] = term;
            this.buffer[index + 1] = start;
            this.buffer[index + 2] = end;
            this.buffer[index + 3] = size;
        }
    };
    // Apply a shift action
    /// @internal
    Stack.prototype.shift = function (action, next, nextEnd) {
        if (action & 131072 /* GotoFlag */) {
            this.pushState(action & 65535 /* ValueMask */, this.pos);
        }
        else if ((action & 262144 /* StayFlag */) == 0) { // Regular shift
            var start = this.pos, nextState = action, parser = this.cx.parser;
            if (nextEnd > this.pos)
                this.badness = (this.badness >> 1) + (this.badness >> 2); // (* 0.75)
            if (nextEnd > this.pos || next <= parser.maxNode) {
                this.pos = nextEnd;
                if (!parser.stateFlag(nextState, 1 /* Skipped */))
                    this.reducePos = nextEnd;
            }
            this.pushState(nextState, start);
            if (next <= parser.maxNode)
                this.buffer.push(next, start, nextEnd, 4);
        }
        else { // Shift-and-stay, which means this is a skipped token
            if (next <= this.cx.parser.maxNode)
                this.buffer.push(next, this.pos, nextEnd, 4);
            this.pos = nextEnd;
        }
    };
    // Apply an action
    /// @internal
    Stack.prototype.apply = function (action, next, nextEnd) {
        if (action & 65536 /* ReduceFlag */)
            this.reduce(action);
        else
            this.shift(action, next, nextEnd);
    };
    // Add a prebuilt node into the buffer. This may be a reused node or
    // the result of running a nested parser.
    /// @internal
    Stack.prototype.useNode = function (value, next) {
        var index = this.cx.reused.length - 1;
        if (index < 0 || this.cx.reused[index] != value) {
            this.cx.reused.push(value);
            index++;
        }
        var start = this.pos;
        this.reducePos = this.pos = start + value.length;
        this.pushState(next, start);
        this.badness >>= 2; // (* 0.25)
        this.buffer.push(index, start, this.reducePos, -1 /* size < 0 means this is a reused value */);
    };
    // Split the stack. Due to the buffer sharing and the fact
    // that `this.stack` tends to stay quite shallow, this isn't very
    // expensive.
    /// @internal
    Stack.prototype.split = function () {
        var parent = this;
        var off = parent.buffer.length;
        // Because the top of the buffer (after this.pos) may be mutated
        // to reorder reductions and skipped tokens, and shared buffers
        // should be immutable, this copies any outstanding skipped tokens
        // to the new buffer, and puts the base pointer before them.
        while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
            off -= 4;
        var buffer = parent.buffer.slice(off), base = parent.bufferBase + off;
        // Make sure parent points to an actual parent with content, if there is such a parent.
        while (parent && base == parent.bufferBase)
            parent = parent.parent;
        return new Stack(this.cx, this.stack.slice(), this.state, this.reducePos, this.pos, this.badness, buffer, base, parent);
    };
    // Try to recover from an error by 'deleting' (ignoring) one token.
    /// @internal
    Stack.prototype.recoverByDelete = function (next, nextEnd) {
        var isNode = next <= this.cx.parser.maxNode;
        if (isNode)
            this.storeNode(next, this.pos, nextEnd);
        this.storeNode(0 /* Err */, this.pos, nextEnd, isNode ? 8 : 4);
        this.pos = this.reducePos = nextEnd;
        this.badness += 100 /* Unit */;
    };
    /// Check if the given term would be able to be shifted (optionally
    /// after some reductions) on this stack. This can be useful for
    /// external tokenizers that want to make sure they only provide a
    /// given token when it applies.
    Stack.prototype.canShift = function (term) {
        for (var sim = new SimulatedStack(this);;) {
            var action = this.cx.parser.stateSlot(sim.top, 4 /* DefaultReduce */) || this.cx.parser.hasAction(sim.top, term);
            if ((action & 65536 /* ReduceFlag */) == 0)
                return true;
            if (action == 0)
                return false;
            sim.reduce(action);
        }
    };
    Object.defineProperty(Stack.prototype, "ruleStart", {
        /// Find the start position of the rule that is currently being parsed.
        get: function () {
            var force = this.cx.parser.stateSlot(this.state, 5 /* ForcedReduce */);
            if (!(force & 65536 /* ReduceFlag */))
                return 0;
            var base = this.stack.length - (3 * (force >> 19 /* ReduceDepthShift */));
            return this.stack[base + 1];
        },
        enumerable: true,
        configurable: true
    });
    /// Find the start position of the innermost instance of any of the
    /// given term types, or return `-1` when none of them are found.
    ///
    /// **Note:** this is only reliable when there is at least some
    /// state that unambiguously matches the given rule on the stack.
    /// I.e. if you have a grammar like this, where the difference
    /// between `a` and `b` is only apparent at the third token:
    ///
    ///     a { b | c }
    ///     b { "x" "y" "x" }
    ///     c { "x" "y" "z" }
    ///
    /// Then a parse state after `"x"` will not reliably tell you that
    /// `b` is on the stack. You _can_ pass `[b, c]` to reliably check
    /// for either of those two rules (assuming that `a` isn't part of
    /// some rule that includes other things starting with `"x"`).
    Stack.prototype.startOf = function (types) {
        for (var frame = this.stack.length - 3; frame >= 0; frame -= 3) {
            var force = this.cx.parser.stateSlot(this.stack[frame], 5 /* ForcedReduce */);
            if (types.includes(force & 65535 /* ValueMask */)) {
                var base = frame - (3 * (force >> 19 /* ReduceDepthShift */));
                return this.stack[base + 1];
            }
        }
        return -1;
    };
    // Apply up to Recover.MaxNext recovery actions that conceptually
    // inserts some missing token or rule.
    /// @internal
    Stack.prototype.recoverByInsert = function (next) {
        var _this = this;
        var nextStates = this.cx.parser.nextStates(this.state);
        if (nextStates.length > 4 /* MaxNext */) {
            var best = nextStates.filter(function (s) { return s != _this.state && _this.cx.parser.hasAction(s, next); });
            for (var i = 0; best.length < 4 /* MaxNext */ && i < nextStates.length; i++)
                if (!best.includes(nextStates[i]))
                    best.push(nextStates[i]);
            nextStates = best;
        }
        var result = [];
        for (var i = 0; i < nextStates.length && result.length < 4 /* MaxNext */; i++) {
            if (nextStates[i] == this.state)
                continue;
            var stack = this.split();
            stack.storeNode(0 /* Err */, stack.pos, stack.pos, 4, true);
            stack.pushState(nextStates[i], this.pos);
            stack.badness += 100 /* Unit */;
            result.push(stack);
        }
        return result;
    };
    // Force a reduce, if possible. Return false if that can't
    // be done.
    /// @internal
    Stack.prototype.forceReduce = function () {
        var reduce = this.cx.parser.anyReduce(this.state);
        if ((reduce >> 19 /* ReduceDepthShift */) == 0) { // Don't use 0 or a zero-depth reduction
            reduce = this.cx.parser.stateSlot(this.state, 5 /* ForcedReduce */);
            if ((reduce & 65536 /* ReduceFlag */) == 0)
                return false;
            this.storeNode(0 /* Err */, this.reducePos, this.reducePos, 4, true);
            this.badness += 100 /* Unit */;
        }
        this.reduce(reduce);
        return true;
    };
    // Compare two stacks to get a number that indicates which one is
    // behind or, if they are at the same position, which one has less
    // badness.
    /// @internal
    Stack.prototype.compare = function (other) {
        return this.pos - other.pos || this.badness - other.badness;
    };
    // Convert the stack's buffer to a syntax tree.
    /// @internal
    Stack.prototype.toTree = function () {
        return lezerTree.Tree.build(StackBufferCursor.create(this), this.cx.parser.group, 1 /* Top */, this.cx.maxBufferLength, this.cx.reused);
    };
    return Stack;
}());
var Recover;
(function (Recover) {
    Recover[Recover["MaxNext"] = 4] = "MaxNext";
})(Recover || (Recover = {}));
// Used to cheaply run some reductions to scan ahead without mutating
// an entire stack
var SimulatedStack = /** @class */ (function () {
    function SimulatedStack(stack) {
        this.stack = stack;
        this.top = stack.state;
        this.rest = stack.stack;
        this.offset = this.rest.length;
    }
    SimulatedStack.prototype.reduce = function (action) {
        var term = action & 65535 /* ValueMask */, depth = action >> 19 /* ReduceDepthShift */;
        if (depth == 0) {
            if (this.rest == this.stack.stack)
                this.rest = this.rest.slice();
            this.rest.push(this.top, 0, 0);
            this.offset += 3;
        }
        else {
            this.offset -= (depth - 1) * 3;
        }
        var goto = this.stack.cx.parser.getGoto(this.rest[this.offset - 3], term, true);
        this.top = goto;
    };
    return SimulatedStack;
}());
// This is given to `Tree.build` to build a buffer, and encapsulates
// the parent-stack-walking necessary to read the nodes.
var StackBufferCursor = /** @class */ (function () {
    function StackBufferCursor(stack, pos, index) {
        this.stack = stack;
        this.pos = pos;
        this.index = index;
        this.buffer = stack.buffer;
        if (this.index == 0)
            this.maybeNext();
    }
    StackBufferCursor.create = function (stack) {
        return new StackBufferCursor(stack, stack.bufferBase + stack.buffer.length, stack.buffer.length);
    };
    StackBufferCursor.prototype.maybeNext = function () {
        var next = this.stack.parent;
        if (next != null) {
            this.index = this.stack.bufferBase - next.bufferBase;
            this.stack = next;
            this.buffer = next.buffer;
        }
    };
    Object.defineProperty(StackBufferCursor.prototype, "id", {
        get: function () { return this.buffer[this.index - 4]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackBufferCursor.prototype, "start", {
        get: function () { return this.buffer[this.index - 3]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackBufferCursor.prototype, "end", {
        get: function () { return this.buffer[this.index - 2]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(StackBufferCursor.prototype, "size", {
        get: function () { return this.buffer[this.index - 1]; },
        enumerable: true,
        configurable: true
    });
    StackBufferCursor.prototype.next = function () {
        this.index -= 4;
        this.pos -= 4;
        if (this.index == 0)
            this.maybeNext();
    };
    StackBufferCursor.prototype.fork = function () {
        return new StackBufferCursor(this.stack, this.pos, this.index);
    };
    return StackBufferCursor;
}());

/// Tokenizers write the tokens they read into instances of this class.
var Token = /** @class */ (function () {
    function Token() {
        /// The start of the token. This is set by the parser, and should not
        /// be mutated by the tokenizer.
        this.start = -1;
        /// This starts at -1, and should be updated to a term id when a
        /// matching token is found.
        this.value = -1;
        /// When setting `.value`, you should also set `.end` to the end
        /// position of the token. (You'll usually want to use the `accept`
        /// method.)
        this.end = -1;
    }
    /// Accept a token, setting `value` and `end` to the given values.
    Token.prototype.accept = function (value, end) {
        this.value = value;
        this.end = end;
    };
    return Token;
}());
/// An `InputStream` that is backed by a single, flat string.
var StringStream = /** @class */ (function () {
    function StringStream(string, length) {
        if (length === void 0) { length = string.length; }
        this.string = string;
        this.length = length;
    }
    StringStream.prototype.get = function (pos) {
        return pos < 0 || pos >= this.length ? -1 : this.string.charCodeAt(pos);
    };
    StringStream.prototype.read = function (from, to) { return this.string.slice(from, Math.min(this.length, to)); };
    StringStream.prototype.clip = function (at) { return new StringStream(this.string, at); };
    return StringStream;
}());
/// @internal
var TokenGroup = /** @class */ (function () {
    function TokenGroup(data, id) {
        this.data = data;
        this.id = id;
    }
    TokenGroup.prototype.token = function (input, token, stack) { readToken(this.data, input, token, stack, this.id); };
    return TokenGroup;
}());
TokenGroup.prototype.contextual = false;
var ExternalTokenizer = /** @class */ (function () {
    function ExternalTokenizer(token, options) {
        if (options === void 0) { options = {}; }
        this.token = token;
        this.contextual = options && options.contextual || false;
    }
    return ExternalTokenizer;
}());
// Tokenizer data is stored a big uint16 array containing, for each
// state:
//
//  - A group bitmask, indicating what token groups are reachable from
//    this state, so that paths that can only lead to tokens not in
//    any of the current groups can be cut off early.
//
//  - The position of the end of the state's sequence of accepting
//    tokens
//
//  - The number of outgoing edges for the state
//
//  - The accepting tokens, as (token id, group mask) pairs
//
//  - The outgoing edges, as (start character, end character, state
//    index) triples, with end character being exclusive
//
// This function interprets that data, running through a stream as
// long as new states with the a matching group mask can be reached,
// and updating `token` when it matches a token.
function readToken(data, input, token, stack, group) {
    var state = 0, groupMask = 1 << group;
    scan: for (var pos = token.start;;) {
        if ((groupMask & data[state]) == 0)
            break;
        var accEnd = data[state + 1];
        // Check whether this state can lead to a token in the current group
        // Accept tokens in this state, possibly overwriting
        // lower-precedence / shorter tokens
        for (var i = state + 3; i < accEnd; i += 2)
            if ((data[i + 1] & groupMask) > 0) {
                var term = data[i];
                if (token.value == -1 || token.value == term || stack.cx.parser.overrides(term, token.value)) {
                    token.accept(term, pos);
                    break;
                }
            }
        var next = input.get(pos++);
        // Do a binary search on the state's edges
        for (var low = 0, high = data[state + 2]; low < high;) {
            var mid = (low + high) >> 1;
            var index = accEnd + mid + (mid << 1);
            var from = data[index], to = data[index + 1];
            if (next < from)
                high = mid;
            else if (next >= to)
                low = mid + 1;
            else {
                state = data[index + 2];
                continue scan;
            }
        }
        break;
    }
}

// See lezer-generator/src/encode.ts for comments about the encoding
// used here
function decodeArray(input, Type) {
    if (Type === void 0) { Type = Uint16Array; }
    var array = null;
    for (var pos = 0, out = 0; pos < input.length;) {
        var value = 0;
        for (;;) {
            var next = input.charCodeAt(pos++), stop = false;
            if (next == 126 /* BigValCode */) {
                value = 65535 /* BigVal */;
                break;
            }
            if (next >= 92 /* Gap2 */)
                next--;
            if (next >= 34 /* Gap1 */)
                next--;
            var digit = next - 32 /* Start */;
            if (digit >= 46 /* Base */) {
                digit -= 46 /* Base */;
                stop = true;
            }
            value += digit;
            if (stop)
                break;
            value *= 46 /* Base */;
        }
        if (array)
            array[out++] = value;
        else
            array = new Type(value);
    }
    return array;
}

// Environment variable used to control console output
var verbose = typeof process != "undefined" && /\bparse\b/.test(process.env.LOG);
var CacheCursor = /** @class */ (function () {
    function CacheCursor(tree) {
        this.start = [0];
        this.index = [0];
        this.nextStart = 0;
        this.trees = [tree];
    }
    // `pos` must be >= any previously given `pos` for this cursor
    CacheCursor.prototype.nodeAt = function (pos) {
        if (pos < this.nextStart)
            return null;
        for (;;) {
            var last = this.trees.length - 1;
            if (last < 0) { // End of tree
                this.nextStart = 1e9;
                return null;
            }
            var top = this.trees[last], index = this.index[last];
            if (index == top.children.length) {
                this.trees.pop();
                this.start.pop();
                this.index.pop();
                continue;
            }
            var next = top.children[index];
            var start = this.start[last] + top.positions[index];
            if (next instanceof lezerTree.TreeBuffer) {
                this.index[last]++;
                this.nextStart = start + next.length;
            }
            else if (start >= pos) {
                return start == pos ? next : null;
            }
            else {
                this.index[last]++;
                if (start + next.length >= pos) { // Enter this node
                    this.trees.push(next);
                    this.start.push(start);
                    this.index.push(0);
                }
            }
        }
    };
    return CacheCursor;
}());
var CachedToken = /** @class */ (function (_super) {
    __extends(CachedToken, _super);
    function CachedToken(tokenizer) {
        var _this = _super.call(this) || this;
        _this.tokenizer = tokenizer;
        _this.extended = -1;
        _this.mask = 0;
        return _this;
    }
    CachedToken.prototype.clear = function (start) {
        this.start = start;
        this.value = this.extended = -1;
    };
    return CachedToken;
}(Token));
var dummyToken = new Token;
var TokenCache = /** @class */ (function () {
    function TokenCache() {
        this.tokens = [];
        this.mainToken = dummyToken;
        this.actions = [];
    }
    TokenCache.prototype.getActions = function (stack, input) {
        var actionIndex = 0;
        var main = null;
        var parser = stack.cx.parser, tokenizers = parser.tokenizers;
        for (var i = 0; i < tokenizers.length; i++) {
            if (((1 << i) & parser.stateSlot(stack.state, 3 /* TokenizerMask */)) == 0)
                continue;
            var tokenizer = tokenizers[i], token = void 0;
            for (var _i = 0, _a = this.tokens; _i < _a.length; _i++) {
                var t = _a[_i];
                if (t.tokenizer == tokenizer) {
                    token = t;
                    break;
                }
            }
            if (!token)
                this.tokens.push(token = new CachedToken(tokenizer));
            var mask = parser.stateSlot(stack.state, 3 /* TokenizerMask */);
            if (tokenizer.contextual || token.start != stack.pos || token.mask != mask) {
                this.updateCachedToken(token, stack, input);
                token.mask = mask;
            }
            var startIndex = actionIndex;
            if (token.extended > -1)
                actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
            actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
            if (actionIndex > startIndex) {
                main = token;
                break;
            }
            if (!main || token.value != 0 /* Err */)
                main = token;
        }
        while (this.actions.length > actionIndex)
            this.actions.pop();
        if (!main) {
            main = dummyToken;
            main.start = stack.pos;
            if (stack.pos == input.length)
                main.accept(stack.cx.parser.eofTerm, stack.pos);
            else
                main.accept(0 /* Err */, stack.pos + 1);
        }
        this.mainToken = main;
        return this.actions;
    };
    TokenCache.prototype.updateCachedToken = function (token, stack, input) {
        token.clear(stack.pos);
        token.tokenizer.token(input, token, stack);
        if (token.value > -1) {
            var parser = stack.cx.parser;
            var specIndex = findOffset(parser.data, parser.specializeTable, token.value);
            if (specIndex >= 0) {
                var found = parser.specializations[specIndex][input.read(token.start, token.end)];
                if (found != null) {
                    if ((found & 1) == 0 /* Specialize */)
                        token.value = found >> 1;
                    else
                        token.extended = found >> 1;
                }
            }
        }
        else if (stack.pos == input.length) {
            token.accept(stack.cx.parser.eofTerm, stack.pos);
        }
        else {
            token.accept(0 /* Err */, stack.pos + 1);
        }
    };
    TokenCache.prototype.putAction = function (action, token, end, index) {
        // Don't add duplicate actions
        for (var i = 0; i < index; i += 3)
            if (this.actions[i] == action)
                return index;
        this.actions[index++] = action;
        this.actions[index++] = token;
        this.actions[index++] = end;
        return index;
    };
    TokenCache.prototype.addActions = function (stack, token, end, index) {
        var state = stack.state, parser = stack.cx.parser, data = parser.data;
        for (var set = 0; set < 2; set++) {
            for (var i = parser.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */), next = void 0; (next = data[i]) != 65535 /* End */; i += 3) {
                if (next == token || (next == 0 /* Err */ && index == 0))
                    index = this.putAction(data[i + 1] | (data[i + 2] << 16), token, end, index);
            }
        }
        return index;
    };
    return TokenCache;
}());
var StackContext = /** @class */ (function () {
    function StackContext(parser, maxBufferLength, input, parent, wrapType) {
        if (parent === void 0) { parent = null; }
        if (wrapType === void 0) { wrapType = -1; }
        this.parser = parser;
        this.maxBufferLength = maxBufferLength;
        this.input = input;
        this.parent = parent;
        this.wrapType = wrapType;
        this.reused = [];
        this.tokens = new TokenCache;
    }
    return StackContext;
}());
/// A parse context can be used for step-by-step parsing. After
/// creating it, you repeatedly call `.advance()` until it returns a
/// tree to indicate it has reached the end of the parse.
var ParseContext = /** @class */ (function () {
    /// @internal
    function ParseContext(parser, input, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.cache, cache = _c === void 0 ? undefined : _c, _d = _b.strict, strict = _d === void 0 ? false : _d, _e = _b.bufferLength, bufferLength = _e === void 0 ? lezerTree.DefaultBufferLength : _e;
        this.stacks = [Stack.start(new StackContext(parser, bufferLength, input))];
        this.strict = strict;
        this.cache = cache ? new CacheCursor(cache) : null;
    }
    ParseContext.prototype.takeStack = function (at) {
        if (at === void 0) { at = 0; }
        // Binary heap pop
        var stacks = this.stacks, elt = stacks[at], replacement = stacks.pop();
        if (stacks.length == 0)
            return elt;
        stacks[at] = replacement;
        for (var index = at;;) {
            var childIndex = (index << 1) + 1;
            if (childIndex >= stacks.length)
                break;
            var child = stacks[childIndex];
            if (childIndex + 1 < stacks.length && child.compare(stacks[childIndex + 1]) >= 0) {
                child = stacks[childIndex + 1];
                childIndex++;
            }
            if (replacement.compare(child) < 0)
                break;
            stacks[childIndex] = replacement;
            stacks[index] = child;
            index = childIndex;
        }
        return elt;
    };
    ParseContext.prototype.putStack = function (stack) {
        if (stack.badness >= 200 /* Deduplicate */) {
            for (var i = 0; i < this.stacks.length; i++) {
                var other = this.stacks[i];
                if (other.state == stack.state && other.pos == stack.pos) {
                    var diff = stack.badness - other.badness || stack.stack.length - other.stack.length;
                    if (diff < 0) {
                        this.stacks[i] = stack;
                        return true;
                    }
                    else if (diff >= 0)
                        return false;
                }
            }
        }
        else if (stack.badness == 0 && this.stacks.length && stack.buffer.length > 800 /* MaxParallelBufferLength */) {
            // If a stack looks error-free, but isn't the only active one
            // _and_ has a buffer that is long but not the longest, prune
            // it, since this might be a situation where two stacks can
            // continue indefinitely.
            var maxOther = this.stacks.reduce(function (m, s) { return Math.max(m, s.buffer.length); }, 0);
            if (maxOther > stack.buffer.length)
                return false;
        }
        // Binary heap add
        var index = this.stacks.push(stack) - 1;
        while (index > 0) {
            var parentIndex = index >> 1, parent = this.stacks[parentIndex];
            if (stack.compare(parent) >= 0)
                break;
            this.stacks[index] = parent;
            this.stacks[parentIndex] = stack;
            index = parentIndex;
        }
        return true;
    };
    /// Execute one parse step. This picks the parse stack that's
    /// currently the least far along, and does the next thing that can
    /// be done with it. This may be:
    ///
    /// - Add a cached node, if a matching one is found.
    /// - Enter a nested grammar.
    /// - Perform all shift or reduce actions that match the current
    ///   token (if there are more than one, this will split the stack)
    /// - Finish the parse
    ///
    /// When the parse is finished, this will return a syntax tree. When
    /// not, it returns `null`.
    ParseContext.prototype.advance = function () {
        var stack = this.takeStack(), start = stack.pos, _a = stack.cx, input = _a.input, parser = _a.parser;
        var base = verbose ? stack + " -> " : "";
        if (this.cache) {
            for (var cached = this.cache.nodeAt(start); cached;) {
                var match = parser.group.types[cached.type.id] == cached.type ? parser.getGoto(stack.state, cached.type.id) : -1;
                if (match > -1 && !isFragile(cached)) {
                    stack.useNode(cached, match);
                    if (verbose)
                        console.log(base + stack + (" (via reuse of " + parser.getName(cached.type.id) + ")"));
                    this.putStack(stack);
                    return null;
                }
                if (cached.children.length == 0 || cached.positions[0] > 0)
                    break;
                var inner = cached.children[0];
                if (inner instanceof lezerTree.Tree)
                    cached = inner;
                else
                    break;
            }
        }
        var nest = parser.startNested(stack.state);
        maybeNest: if (nest > -1) {
            var _b = parser.nested[nest], grammar = _b.grammar, endToken = _b.end, placeholder = _b.placeholder;
            var filterEnd = undefined, parseNode = null, nested = void 0, wrapType = undefined;
            if (typeof grammar == "function") {
                var query = grammar(input, stack);
                if (query.stay)
                    break maybeNest;
                (parseNode = query.parseNode, nested = query.parser, filterEnd = query.filterEnd, wrapType = query.wrapType);
            }
            else {
                nested = grammar;
            }
            var end_1 = this.scanForNestEnd(stack, endToken, filterEnd);
            var clippedInput = stack.cx.input.clip(end_1);
            if (parseNode || !nested) {
                var node = parseNode ? parseNode(clippedInput, stack.pos) : lezerTree.Tree.empty;
                if (node.length != end_1 - stack.pos)
                    node = new lezerTree.Tree(node.type, node.children, node.positions, end_1 - stack.pos);
                if (wrapType != null)
                    node = new lezerTree.Tree(parser.group.types[wrapType], [node], [0], node.length);
                stack.useNode(node, parser.getGoto(stack.state, placeholder, true));
                this.putStack(stack);
            }
            else {
                var newStack = Stack.start(new StackContext(nested, stack.cx.maxBufferLength, clippedInput, stack, wrapType), stack.pos);
                if (verbose)
                    console.log(base + newStack + " (nested)");
                this.putStack(newStack);
            }
            return null;
        }
        var defaultReduce = parser.stateSlot(stack.state, 4 /* DefaultReduce */);
        if (defaultReduce > 0) {
            stack.reduce(defaultReduce);
            this.putStack(stack);
            if (verbose)
                console.log(base + stack + (" (via always-reduce " + parser.getName(defaultReduce & 65535 /* ValueMask */) + ")"));
            return null;
        }
        var actions = stack.cx.tokens.getActions(stack, input);
        for (var i = 0; i < actions.length;) {
            var action = actions[i++], term_1 = actions[i++], end_2 = actions[i++];
            var localStack = i == actions.length ? stack : stack.split();
            localStack.apply(action, term_1, end_2);
            if (verbose)
                console.log(base + localStack + (" (via " + ((action & 65536 /* ReduceFlag */) == 0 ? "shift"
                    : "reduce of " + parser.getName(action & 65535 /* ValueMask */)) + " for " + parser.getName(term_1) + " @ " + start + (localStack == stack ? "" : ", split") + ")"));
            this.putStack(localStack);
        }
        if (actions.length > 0)
            return null;
        // If we're here, the stack failed to advance normally
        if (start == input.length) { // End of file
            if (!parser.stateFlag(stack.state, 2 /* Accepting */) && stack.forceReduce()) {
                if (verbose)
                    console.log(base + stack + " (via forced reduction at eof)");
                this.putStack(stack);
                return null;
            }
            if (stack.cx.parent) {
                // This is a nested parse—add its result to the parent stack and
                // continue with that one.
                this.putStack(this.finishNested(stack));
                return null;
            }
            else {
                // Actual end of parse
                return stack.toTree();
            }
        }
        // Not end of file. See if we should recover.
        var minBad = this.stacks.reduce(function (m, s) { return Math.min(m, s.badness); }, 1e9);
        // If this is not the best stack and its badness is above the
        // TooBadToRecover ceiling or RecoverToSibling times the best
        // stack, don't continue it.
        if (minBad <= stack.badness &&
            (this.stacks.length >= 25 /* MaxRecoverStacks */ ||
                stack.badness > Math.min(500 /* TooBadToRecover */, minBad * 3 /* RecoverSiblingFactor */)))
            return null;
        var _c = stack.cx.tokens.mainToken, end = _c.end, term = _c.value;
        if (this.strict) {
            if (this.stacks.length)
                return null;
            throw new SyntaxError("No parse at " + start + " with " + parser.getName(term) + " (stack is " + stack + ")");
        }
        for (var _i = 0, _d = stack.recoverByInsert(term); _i < _d.length; _i++) {
            var insert = _d[_i];
            if (verbose)
                console.log(base + insert + " (via recover-insert)");
            this.putStack(insert);
        }
        var reduce = stack.split();
        if (reduce.forceReduce()) {
            if (verbose)
                console.log(base + reduce + " (via force-reduce)");
            this.putStack(reduce);
        }
        if (end == start) {
            if (start == input.length)
                return null;
            end++;
            term = 0 /* Err */;
        }
        stack.recoverByDelete(term, end);
        if (verbose)
            console.log(base + stack + (" (via recover-delete " + parser.getName(term) + ")"));
        this.putStack(stack);
        return null;
    };
    Object.defineProperty(ParseContext.prototype, "pos", {
        /// The position to which the parse has advanced.
        get: function () { return this.stacks[0].pos; },
        enumerable: true,
        configurable: true
    });
    /// Force the parse to finish, generating a tree containing the nodes
    /// parsed so far.
    ParseContext.prototype.forceFinish = function () {
        var stack = this.stacks[0].split();
        while (!stack.cx.parser.stateFlag(stack.state, 2 /* Accepting */) && stack.forceReduce()) { }
        return stack.toTree();
    };
    ParseContext.prototype.scanForNestEnd = function (stack, endToken, filter) {
        var input = stack.cx.input;
        for (var pos = stack.pos; pos < input.length; pos++) {
            dummyToken.start = pos;
            dummyToken.value = -1;
            endToken.token(input, dummyToken, stack);
            if (dummyToken.value > -1 && (!filter || filter(input.read(pos, dummyToken.end))))
                return pos;
        }
        return input.length;
    };
    ParseContext.prototype.finishNested = function (stack) {
        var parent = stack.cx.parent, tree = stack.toTree();
        var parentParser = parent.cx.parser, info = parentParser.nested[parentParser.startNested(parent.state)];
        tree = new lezerTree.Tree(tree.type, tree.children, tree.positions.map(function (p) { return p - parent.pos; }), stack.pos - parent.pos);
        if (stack.cx.wrapType > -1)
            tree = new lezerTree.Tree(parentParser.group.types[stack.cx.wrapType], [tree], [0], tree.length);
        parent.useNode(tree, parentParser.getGoto(parent.state, info.placeholder, true));
        if (verbose)
            console.log(parent + (" (via unnest " + (stack.cx.wrapType > -1 ? parentParser.getName(stack.cx.wrapType) : tree.type.name) + ")"));
        // Drop any other stack that has the same parent
        for (var i = 0; i < this.stacks.length;) {
            if (this.stacks[i].cx.parent == parent)
                this.takeStack(i);
            else
                i++;
        }
        return parent;
    };
    return ParseContext;
}());
/// A parser holds the parse tables for a given grammar, as generated
/// by `lezer-generator`.
var Parser = /** @class */ (function () {
    /// @internal
    function Parser(
    /// The parse states for this grammar @internal
    states,
    /// A blob of data that the parse states, as well as some
    /// of `Parser`'s fields, point into @internal
    data,
    /// The goto table. See `computeGotoTable` in
    /// lezer-generator for details on the format @internal
    goto,
    /// A node group with the node types used by this parser.
    group,
    /// The tokenizer objects used by the grammar @internal
    tokenizers,
    /// Metadata about nested grammars used in this grammar @internal
    nested,
    /// Points into this.data at an array of token types that
    /// are specialized @internal
    specializeTable,
    /// For each specialized token type, this holds an object mapping
    /// names to numbers, with the first bit indicating whether the
    /// specialization extends or replaces the original token, and the
    /// rest of the bits holding the specialized token type. @internal
    specializations,
    /// Points into this.data at an array that holds the
    /// precedence order (higher precedence first) for ambiguous
    /// tokens @internal
    tokenPrecTable,
    /// An optional object mapping term ids to name strings @internal
    termNames) {
        if (termNames === void 0) { termNames = null; }
        this.states = states;
        this.data = data;
        this.goto = goto;
        this.group = group;
        this.tokenizers = tokenizers;
        this.nested = nested;
        this.specializeTable = specializeTable;
        this.specializations = specializations;
        this.tokenPrecTable = tokenPrecTable;
        this.termNames = termNames;
        this.nextStateCache = [];
        this.maxNode = this.group.types.length - 1;
        for (var i = 0, l = this.states.length / 6 /* Size */; i < l; i++)
            this.nextStateCache[i] = null;
    }
    /// Parse a given string or stream.
    Parser.prototype.parse = function (input, options) {
        if (typeof input == "string")
            input = new StringStream(input);
        var cx = new ParseContext(this, input, options);
        for (;;) {
            var done = cx.advance();
            if (done)
                return done;
        }
    };
    /// Create a `ParseContext`.
    Parser.prototype.startParse = function (input, options) {
        return new ParseContext(this, input, options);
    };
    /// Get a goto table entry @internal
    Parser.prototype.getGoto = function (state, term, loose) {
        if (loose === void 0) { loose = false; }
        var table = this.goto;
        if (term >= table[0])
            return -1;
        for (var pos = table[term + 1];;) {
            var groupTag = table[pos++], last = groupTag & 1;
            var target = table[pos++];
            if (last && loose)
                return target;
            for (var end = pos + (groupTag >> 1); pos < end; pos++)
                if (table[pos] == state)
                    return target;
            if (last)
                return -1;
        }
    };
    /// Check if this state has an action for a given terminal @internal
    Parser.prototype.hasAction = function (state, terminal) {
        var data = this.data;
        for (var set = 0; set < 2; set++) {
            for (var i = this.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */), next = void 0; (next = data[i]) != 65535 /* End */; i += 3) {
                if (next == terminal || next == 0 /* Err */)
                    return data[i + 1] | (data[i + 2] << 16);
            }
        }
        return 0;
    };
    /// @internal
    Parser.prototype.stateSlot = function (state, slot) {
        return this.states[(state * 6 /* Size */) + slot];
    };
    /// @internal
    Parser.prototype.stateFlag = function (state, flag) {
        return (this.stateSlot(state, 0 /* Flags */) & flag) > 0;
    };
    /// @internal
    Parser.prototype.startNested = function (state) {
        var flags = this.stateSlot(state, 0 /* Flags */);
        return flags & 4 /* StartNest */ ? flags >> 10 /* NestShift */ : -1;
    };
    /// @internal
    Parser.prototype.anyReduce = function (state) {
        var defaultReduce = this.stateSlot(state, 4 /* DefaultReduce */);
        if (defaultReduce > 0)
            return defaultReduce;
        for (var i = this.stateSlot(state, 1 /* Actions */);; i += 3) {
            if (this.data[i] == 65535 /* End */)
                return 0;
            var top = this.data[i + 2];
            if (top & (65536 /* ReduceFlag */ >> 16))
                return this.data[i + 1] | (top << 16);
        }
    };
    /// Get the states that can follow this one through shift actions or
    /// goto jumps. @internal
    Parser.prototype.nextStates = function (state) {
        var cached = this.nextStateCache[state];
        if (cached)
            return cached;
        var result = [];
        for (var i = this.stateSlot(state, 1 /* Actions */); this.data[i] != 65535 /* End */; i += 3) {
            if ((this.data[i + 2] & (65536 /* ReduceFlag */ >> 16)) == 0 && !result.includes(this.data[i + 1]))
                result.push(this.data[i + 1]);
        }
        var table = this.goto, max = table[0];
        for (var term = 0; term < max; term++) {
            for (var pos = table[term + 1];;) {
                var groupTag = table[pos++], target = table[pos++];
                for (var end = pos + (groupTag >> 1); pos < end; pos++)
                    if (table[pos] == state && !result.includes(target))
                        result.push(target);
                if (groupTag & 1)
                    break;
            }
        }
        return this.nextStateCache[state] = result;
    };
    /// @internal
    Parser.prototype.overrides = function (token, prev) {
        var iPrev = findOffset(this.data, this.tokenPrecTable, prev);
        return iPrev < 0 || findOffset(this.data, this.tokenPrecTable, token) < iPrev;
    };
    /// Create a new `Parser` instance with different values for (some
    /// of) the nested grammars. This can be used to, for example, swap
    /// in a different language for a nested grammar or fill in a nested
    /// grammar that was left blank by the original grammar.
    Parser.prototype.withNested = function (spec) {
        return new Parser(this.states, this.data, this.goto, this.group, this.tokenizers, this.nested.map(function (obj) {
            if (!Object.prototype.hasOwnProperty.call(spec, obj.name))
                return obj;
            return { name: obj.name, grammar: spec[obj.name], end: obj.end, placeholder: obj.placeholder };
        }), this.specializeTable, this.specializations, this.tokenPrecTable, this.termNames);
    };
    /// Create a new `Parser` instance whose node types have the given
    /// props added. You should use [`NodeProp.add`](#tree.NodeProp.add)
    /// to create the arguments to this method.
    Parser.prototype.withProps = function () {
        var _a;
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        return new Parser(this.states, this.data, this.goto, (_a = this.group).extend.apply(_a, props), this.tokenizers, this.nested, this.specializeTable, this.specializations, this.tokenPrecTable, this.termNames);
    };
    /// Returns the name associated with a given term. This will only
    /// work for all terms when the parser was generated with the
    /// `--names` option. By default, only the names of tagged terms are
    /// stored.
    Parser.prototype.getName = function (term) {
        return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.group.types[term].name || term);
    };
    Object.defineProperty(Parser.prototype, "eofTerm", {
        /// The eof term id is always allocated directly after the node
        /// types. @internal
        get: function () { return this.maxNode + 1; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Parser.prototype, "hasNested", {
        /// Tells you whether this grammar has any nested grammars.
        get: function () { return this.nested.length > 0; },
        enumerable: true,
        configurable: true
    });
    /// (Used by the output of the parser generator) @internal
    Parser.deserialize = function (spec) {
        var tokenArray = decodeArray(spec.tokenData);
        var nodeNames = spec.nodeNames.split(" ");
        for (var i = 0; i < spec.repeatNodeCount; i++)
            nodeNames.push("");
        var nodeProps = [];
        for (var i = 0; i < nodeNames.length; i++)
            nodeProps.push(noProps);
        function setProp(nodeID, prop, value) {
            if (nodeProps[nodeID] == noProps)
                nodeProps[nodeID] = Object.create(null);
            prop.set(nodeProps[nodeID], prop.deserialize(value));
        }
        setProp(0, lezerTree.NodeProp.error, "");
        for (var i = nodeProps.length - spec.repeatNodeCount; i < nodeProps.length; i++)
            setProp(i, lezerTree.NodeProp.repeated, "");
        if (spec.nodeProps)
            for (var _i = 0, _a = spec.nodeProps; _i < _a.length; _i++) {
                var propSpec = _a[_i];
                var prop = propSpec[0];
                for (var i = 1; i < propSpec.length; i += 2)
                    setProp(propSpec[i], prop, propSpec[i + 1]);
            }
        var group = new lezerTree.NodeGroup(nodeNames.map(function (name, i) { return new lezerTree.NodeType(name, nodeProps[i], i); }));
        return new Parser(decodeArray(spec.states, Uint32Array), decodeArray(spec.stateData), decodeArray(spec.goto), group, spec.tokenizers.map(function (value) { return typeof value == "number" ? new TokenGroup(tokenArray, value) : value; }), (spec.nested || []).map(function (_a) {
            var name = _a[0], grammar = _a[1], endToken = _a[2], placeholder = _a[3];
            return ({ name: name, grammar: grammar, end: new TokenGroup(decodeArray(endToken), 0), placeholder: placeholder });
        }), spec.specializeTable, (spec.specializations || []).map(withoutPrototype), spec.tokenPrec, spec.termNames);
    };
    return Parser;
}());
var noProps = Object.create(null);
function findOffset(data, start, term) {
    for (var i = start, next = void 0; (next = data[i]) != 65535 /* End */; i++)
        if (next == term)
            return i - start;
    return -1;
}
// Strip the prototypes from objects, so that they can safely be
// accessed as maps.
function withoutPrototype(obj) {
    if (!(obj instanceof Object))
        return obj;
    var result = Object.create(null);
    for (var prop in obj)
        if (Object.prototype.hasOwnProperty.call(obj, prop))
            result[prop] = obj[prop];
    return result;
}
// Checks whether a node starts or ends with an error node, in which
// case we shouldn't reuse it.
function isFragile(node) {
    var doneStart = false, doneEnd = false, fragile = node.type.id == 0 /* Err */;
    if (!fragile)
        node.iterate({
            enter: function (type) {
                return doneStart || (type.id == 0 /* Err */ ? fragile = doneStart = true : undefined);
            },
            leave: function (type) { doneStart = true; }
        });
    if (!fragile)
        node.iterate({
            from: node.length,
            to: 0,
            enter: function (type) {
                return doneEnd || (type.id == 0 /* Err */ ? fragile = doneEnd = true : undefined);
            },
            leave: function (type) { doneEnd = true; }
        });
    return fragile;
}

exports.NodeGroup = lezerTree.NodeGroup;
exports.NodeProp = lezerTree.NodeProp;
exports.NodeType = lezerTree.NodeType;
exports.Subtree = lezerTree.Subtree;
exports.Tree = lezerTree.Tree;
exports.ExternalTokenizer = ExternalTokenizer;
exports.ParseContext = ParseContext;
exports.Parser = Parser;
exports.Stack = Stack;
exports.Token = Token;
exports.TokenGroup = TokenGroup;
//# sourceMappingURL=index.js.map

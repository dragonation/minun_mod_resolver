"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/// The default maximum length of a `TreeBuffer` node.
exports.DefaultBufferLength = 1024;
var Iteration = /** @class */ (function () {
    function Iteration(enter, leave) {
        this.enter = enter;
        this.leave = leave;
        this.result = undefined;
    }
    Object.defineProperty(Iteration.prototype, "done", {
        get: function () { return this.result !== undefined; },
        enumerable: true,
        configurable: true
    });
    Iteration.prototype.doEnter = function (type, start, end) {
        var value = this.enter(type, start, end);
        if (value === undefined)
            return true;
        if (value !== false)
            this.result = value;
        return false;
    };
    return Iteration;
}());
var nextPropID = 0;
/// Each [node type](#tree.NodeType) can have metadata associated with
/// it in props. Instances of this class represent prop names.
var NodeProp = /** @class */ (function () {
    /// Create a new node prop type. You can optionally pass a
    /// `deserialize` function.
    function NodeProp(_a) {
        var deserialize = (_a === void 0 ? {} : _a).deserialize;
        this.id = nextPropID++;
        this.deserialize = deserialize || (function () {
            throw new Error("This node type doesn't define a deserialize function");
        });
    }
    /// Create a string-valued node prop whose deserialize function is
    /// the identity function.
    NodeProp.string = function () { return new NodeProp({ deserialize: function (str) { return str; } }); };
    /// Creates a boolean-valued node prop whose deserialize function
    /// returns true for any input.
    NodeProp.flag = function () { return new NodeProp({ deserialize: function () { return true; } }); };
    /// Store a value for this prop in the given object. This can be
    /// useful when building up a prop object to pass to the
    /// [`NodeType`](#tree.NodeType) constructor. Returns its first
    /// argument.
    NodeProp.prototype.set = function (propObj, value) {
        propObj[this.id] = value;
        return propObj;
    };
    /// This is meant to be used with
    /// [`NodeGroup.extend`](#tree.NodeGroup.extend) or
    /// [`Parser.withProps`](#lezer.Parser.withProps) to compute prop
    /// values for each node type in the group. Takes a [match
    /// object](#tree.NodeType.match) or function that returns undefined
    /// if the node type doesn't get this prop, and the prop's value if
    /// it does.
    NodeProp.prototype.add = function (match) {
        return new NodePropSource(this, typeof match == "function" ? match : NodeType.match(match));
    };
    /// The special node type that the parser uses to represent parse
    /// errors has this flag set. (You shouldn't use it for custom nodes
    /// that represent erroneous content.)
    NodeProp.error = NodeProp.flag();
    /// Nodes that were produced by skipped expressions (such as
    /// comments) have this prop set to true.
    NodeProp.skipped = NodeProp.flag();
    /// Prop that is used to describe a rule's delimiters. For example,
    /// a parenthesized expression node would set this to the string `"(
    /// )"` (the open and close strings separated by a space). This is
    /// added by the parser generator's `@detectDelim` feature, but you
    /// can also manually add them.
    NodeProp.delim = NodeProp.string();
    /// Indicates that this node indicates a top level document.
    NodeProp.top = NodeProp.flag();
    /// A prop that indicates whether a node represents a repeated
    /// expression. Abstractions like [`Subtree`](#tree.Subtree) hide
    /// such nodes, so you usually won't see them, but if you directly
    /// rummage through a tree's children, you'll find repeat nodes that
    /// wrap repeated content into balanced trees.
    NodeProp.repeated = NodeProp.flag();
    return NodeProp;
}());
exports.NodeProp = NodeProp;
/// Type returned by [`NodeProp.add`](#tree.NodeProp.add). Describes
/// the way a prop should be added to each node type in a node group.
var NodePropSource = /** @class */ (function () {
    /// @internal
    function NodePropSource(
    /// @internal
    prop, 
    /// @internal
    f) {
        this.prop = prop;
        this.f = f;
    }
    return NodePropSource;
}());
exports.NodePropSource = NodePropSource;
/// Each node in a syntax tree has a node type associated with it.
var NodeType = /** @class */ (function () {
    /// @internal
    function NodeType(
    /// The name of the node type. Not necessarily unique, but if the
    /// grammar was written properly, different node types with the
    /// same name within a node group should play the same semantic
    /// role.
    name, 
    /// @internal
    props, 
    /// The id of this node in its group. Corresponds to the term ids
    /// used in the parser.
    id) {
        this.name = name;
        this.props = props;
        this.id = id;
    }
    /// Retrieves a node prop for this type. Will return `undefined` if
    /// the prop isn't present on this node.
    NodeType.prototype.prop = function (prop) { return this.props[prop.id]; };
    /// Create a function from node types to arbitrary values by
    /// specifying an object whose property names are node names. Often
    /// useful with [`NodeProp.add`](#tree.NodeProp.add). You can put
    /// multiple node names, separated by spaces, in a single property
    /// name to map multiple node names to a single value.
    NodeType.match = function (map) {
        var direct = Object.create(null);
        for (var prop in map)
            for (var _i = 0, _a = prop.split(" "); _i < _a.length; _i++) {
                var name = _a[_i];
                direct[name] = map[prop];
            }
        return function (node) { return direct[node.name]; };
    };
    /// An empty dummy node type to use when no actual type is available.
    NodeType.none = new NodeType("", Object.create(null), 0);
    return NodeType;
}());
exports.NodeType = NodeType;
/// A node group holds a collection of node types. It is used to
/// compactly represent trees by storing their type ids, rather than a
/// full pointer to the type object, in a number array. Each parser
/// [has](#lezer.Parser.group) a node group, and [tree
/// buffers](#tree.TreeBuffer) can only store collections of nodes
/// from the same group. A group can have a maximum of 2**16 (65536)
/// node types in it, so that the ids fit into 16-bit typed array
/// slots.
var NodeGroup = /** @class */ (function () {
    /// Create a group with the given types. The `id` property of each
    /// type should correspond to its position within the array.
    function NodeGroup(
    /// The node types in this group, by id.
    types) {
        this.types = types;
        for (var i = 0; i < types.length; i++)
            if (types[i].id != i)
                throw new RangeError("Node type ids should correspond to array positions when creating a node group");
    }
    /// Create a copy of this group with some node properties added. The
    /// arguments to this method should be created with
    /// [`NodeProp.add`](#tree.NodeProp.add).
    NodeGroup.prototype.extend = function () {
        var props = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            props[_i] = arguments[_i];
        }
        var newTypes = [];
        for (var _a = 0, _b = this.types; _a < _b.length; _a++) {
            var type = _b[_a];
            var newProps = null;
            for (var _c = 0, props_1 = props; _c < props_1.length; _c++) {
                var source = props_1[_c];
                var value = source.f(type);
                if (value !== undefined) {
                    if (!newProps) {
                        newProps = Object.create(null);
                        for (var prop in type.props)
                            newProps[prop] = type.props[prop];
                    }
                    newProps[source.prop.id] = value;
                }
            }
            newTypes.push(newProps ? new NodeType(type.name, newProps, type.id) : type);
        }
        return new NodeGroup(newTypes);
    };
    return NodeGroup;
}());
exports.NodeGroup = NodeGroup;
/// A subtree is a representation of part of the syntax tree. It may
/// either be the tree root, or a tagged node.
var Subtree = /** @class */ (function () {
    function Subtree() {
    }
    Object.defineProperty(Subtree.prototype, "name", {
        // Shorthand for `.type.name`.
        get: function () { return this.type.name; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Subtree.prototype, "depth", {
        /// The depth (number of parent nodes) of this subtree
        get: function () {
            var d = 0;
            for (var p = this.parent; p; p = p.parent)
                d++;
            return d;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Subtree.prototype, "root", {
        /// The root of the tree that this subtree is part of
        get: function () {
            var cx = this;
            while (cx.parent)
                cx = cx.parent;
            return cx;
        },
        enumerable: true,
        configurable: true
    });
    /// Find the node at a given position. By default, this will return
    /// the lowest-depth subtree that covers the position from both
    /// sides, meaning that nodes starting or ending at the position
    /// aren't entered. You can pass a `side` of `-1` to enter nodes
    /// that end at the position, or `1` to enter nodes that start
    /// there.
    Subtree.prototype.resolve = function (pos, side) {
        if (side === void 0) { side = 0; }
        var result = this.resolveAt(pos);
        // FIXME this is slightly inefficient in that it scans the result
        // of resolveAt twice (but further complicating child-finding
        // logic seems unattractive as well)
        if (side != 0)
            for (;;) {
                var child = (side < 0 ? result.childBefore(pos) : result.childAfter(pos));
                if (!child || (side < 0 ? child.end : child.start) != pos)
                    break;
                result = child;
            }
        return result;
    };
    Object.defineProperty(Subtree.prototype, "firstChild", {
        /// Get the first child of this subtree.
        get: function () { return this.childAfter(this.start - 1); },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Subtree.prototype, "lastChild", {
        /// Find the last child of this subtree.
        get: function () { return this.childBefore(this.end + 1); },
        enumerable: true,
        configurable: true
    });
    return Subtree;
}());
exports.Subtree = Subtree;
/// A piece of syntax tree. There are two ways to approach these
/// trees: the way they are actually stored in memory, and the
/// convenient way.
///
/// Syntax trees are stored as a tree of `Tree` and `TreeBuffer`
/// objects. By packing detail information into `TreeBuffer` leaf
/// nodes, the representation is made a lot more memory-efficient.
///
/// However, when you want to actually work with tree nodes, this
/// representation is very awkward, so most client code will want to
/// use the `Subtree` interface instead, which provides a view on some
/// part of this data structure, and can be used (through `resolve`,
/// for example) to zoom in on any single node.
var Tree = /** @class */ (function (_super) {
    __extends(Tree, _super);
    /// @internal
    function Tree(
    /// @internal
    type, 
    /// The tree's child nodes. Children small enough to fit in a
    /// `TreeBuffer` will be represented as such, other children can be
    /// further `Tree` instances with their own internal structure.
    children, 
    /// The positions (offsets relative to the start of this tree) of
    /// the children.
    positions, 
    /// The total length of this tree @internal
    length) {
        var _this = _super.call(this) || this;
        _this.type = type;
        _this.children = children;
        _this.positions = positions;
        _this.length = length;
        return _this;
    }
    Object.defineProperty(Tree.prototype, "start", {
        /// @internal
        get: function () { return 0; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Tree.prototype, "end", {
        /// @internal
        get: function () { return this.length; },
        enumerable: true,
        configurable: true
    });
    /// @internal
    Tree.prototype.toString = function () {
        var children = this.children.map(function (c) { return c.toString(); }).join();
        return !this.name ? children :
            (/\W/.test(this.name) && !this.type.prop(NodeProp.error) ? JSON.stringify(this.name) : this.name) +
                (children.length ? "(" + children + ")" : "");
    };
    Tree.prototype.partial = function (start, end, offset, children, positions) {
        for (var i = 0; i < this.children.length; i++) {
            var from = this.positions[i];
            if (from > end)
                break;
            var child = this.children[i], to = from + child.length;
            if (to < start)
                continue;
            if (start <= from && end >= to) {
                children.push(child);
                positions.push(from + offset);
            }
            else if (child instanceof Tree) {
                child.partial(start - from, end - from, offset + from, children, positions);
            }
        }
    };
    /// Apply a set of edits to a tree, removing all nodes that were
    /// touched by the edits, and moving remaining nodes so that their
    /// positions are updated for insertions/deletions before them. This
    /// is likely to destroy a lot of the structure of the tree, and
    /// mostly useful for extracting the nodes that can be reused in a
    /// subsequent incremental re-parse.
    Tree.prototype.applyChanges = function (changes) {
        if (changes.length == 0)
            return this;
        var children = [], positions = [];
        function cutAt(tree, pos, side) {
            var sub = tree.resolve(pos);
            for (var cur = pos;;) {
                var sibling = side < 0 ? sub.childBefore(cur) : sub.childAfter(cur);
                if (sibling)
                    return side < 0 ? sibling.end - 1 : sibling.start + 1;
                if (!sub.parent)
                    return side < 0 ? 0 : 1e9;
                cur = side < 0 ? sub.start : sub.end;
                sub = sub.parent;
            }
        }
        var off = 0;
        for (var i = 0, pos = 0;; i++) {
            var next = i == changes.length ? null : changes[i];
            var nextPos = next ? cutAt(this, next.fromA, -1) : this.length;
            if (nextPos > pos)
                this.partial(pos, nextPos, off, children, positions);
            if (!next)
                break;
            pos = cutAt(this, next.toA, 1);
            off += (next.toB - next.fromB) - (next.toA - next.fromA);
        }
        return new Tree(NodeType.none, children, positions, this.length + off);
    };
    /// Take the part of the tree up to the given position.
    Tree.prototype.cut = function (at) {
        if (at >= this.length)
            return this;
        var children = [], positions = [];
        for (var i = 0; i < this.children.length; i++) {
            var from = this.positions[i];
            if (from >= at)
                break;
            var child = this.children[i], to = from + child.length;
            children.push(to <= at ? child : child.cut(at - from));
            positions.push(from);
        }
        return new Tree(this.type, children, positions, at);
    };
    /// @internal
    Tree.prototype.iterate = function (_a) {
        var _b = _a.from, from = _b === void 0 ? this.start : _b, _c = _a.to, to = _c === void 0 ? this.end : _c, enter = _a.enter, leave = _a.leave;
        var iter = new Iteration(enter, leave);
        this.iterInner(from, to, 0, iter);
        return iter.result;
    };
    /// @internal
    Tree.prototype.iterInner = function (from, to, offset, iter) {
        if (this.type.name && !iter.doEnter(this.type, offset, offset + this.length))
            return;
        if (from <= to) {
            for (var i = 0; i < this.children.length && !iter.done; i++) {
                var child = this.children[i], start = this.positions[i] + offset, end = start + child.length;
                if (start > to)
                    break;
                if (end < from)
                    continue;
                child.iterInner(from, to, start, iter);
            }
        }
        else {
            for (var i = this.children.length - 1; i >= 0 && !iter.done; i--) {
                var child = this.children[i], start = this.positions[i] + offset, end = start + child.length;
                if (end < to)
                    break;
                if (start > from)
                    continue;
                child.iterInner(from, to, start, iter);
            }
        }
        if (iter.leave && this.type.name)
            iter.leave(this.type, offset, offset + this.length);
        return;
    };
    /// @internal
    Tree.prototype.resolveAt = function (pos) {
        if (cacheRoot == this) {
            for (var tree = cached;;) {
                var next = tree.parent;
                if (!next)
                    break;
                if (tree.start < pos && tree.end > pos)
                    return tree.resolve(pos);
                tree = next;
            }
        }
        cacheRoot = this;
        return cached = this.resolveInner(pos, 0, this);
    };
    /// @internal
    Tree.prototype.childBefore = function (pos) {
        return this.findChild(pos, -1, 0, this);
    };
    /// @internal
    Tree.prototype.childAfter = function (pos) {
        return this.findChild(pos, 1, 0, this);
    };
    /// @internal
    Tree.prototype.findChild = function (pos, side, start, parent) {
        for (var i = 0; i < this.children.length; i++) {
            var childStart = this.positions[i] + start, select = -1;
            if (childStart >= pos) {
                if (side < 0 && i > 0)
                    select = i - 1;
                else if (side > 0)
                    select = i;
                else
                    break;
            }
            if (select < 0 && (childStart + this.children[i].length > pos || side < 0 && i == this.children.length - 1))
                select = i;
            if (select >= 0) {
                var child = this.children[select], childStart_1 = this.positions[select] + start;
                if (child.length == 0 && childStart_1 == pos)
                    continue;
                if (child instanceof Tree) {
                    if (child.type.name)
                        return new NodeSubtree(child, childStart_1, parent);
                    return child.findChild(pos, side, childStart_1, parent);
                }
                else {
                    var found = child.findIndex(pos, side, childStart_1, 0, child.buffer.length);
                    if (found > -1)
                        return new BufferSubtree(child, childStart_1, found, parent);
                }
            }
        }
        return null;
    };
    /// @internal
    Tree.prototype.resolveInner = function (pos, start, parent) {
        var found = this.findChild(pos, 0, start, parent);
        return found ? found.resolveAt(pos) : parent;
    };
    /// Append another tree to this tree. `other` must have empty space
    /// big enough to fit this tree at its start.
    Tree.prototype.append = function (other) {
        if (other.children.length && other.positions[0] < this.length)
            throw new Error("Can't append overlapping trees");
        return new Tree(this.type, this.children.concat(other.children), this.positions.concat(other.positions), other.length);
    };
    /// Balance the direct children of this tree. Should only be used on
    /// non-tagged trees.
    Tree.prototype.balance = function (maxBufferLength) {
        if (maxBufferLength === void 0) { maxBufferLength = exports.DefaultBufferLength; }
        return this.children.length <= BalanceBranchFactor ? this :
            balanceRange(this.type, this.children, this.positions, 0, this.children.length, 0, maxBufferLength);
    };
    /// Build a tree from a postfix-ordered buffer of node information,
    /// or a cursor over such a buffer.
    Tree.build = function (buffer, group, topID, maxBufferLength, reused) {
        if (topID === void 0) { topID = 0; }
        if (maxBufferLength === void 0) { maxBufferLength = exports.DefaultBufferLength; }
        if (reused === void 0) { reused = []; }
        return buildTree(Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer, group, topID, maxBufferLength, reused);
    };
    /// The empty tree
    Tree.empty = new Tree(NodeType.none, [], [], 0);
    return Tree;
}(Subtree));
exports.Tree = Tree;
Tree.prototype.parent = null;
// Top-level `resolveAt` calls store their last result here, so that
// if the next call is near the last, parent trees can be cheaply
// reused.
var cacheRoot = Tree.empty;
var cached = Tree.empty;
/// Tree buffers contain (type, start, end, endIndex) quads for each
/// node. In such a buffer, nodes are stored in prefix order (parents
/// before children, with the endIndex of the parent indicating which
/// children belong to it)
var TreeBuffer = /** @class */ (function () {
    /// Create a tree buffer @internal
    function TreeBuffer(buffer, length, group) {
        this.buffer = buffer;
        this.length = length;
        this.group = group;
    }
    /// @internal
    TreeBuffer.prototype.toString = function () {
        var parts = [];
        for (var index = 0; index < this.buffer.length;)
            index = this.childToString(index, parts);
        return parts.join(",");
    };
    /// @internal
    TreeBuffer.prototype.childToString = function (index, parts) {
        var id = this.buffer[index], endIndex = this.buffer[index + 3];
        var type = this.group.types[id], result = type.name;
        if (/\W/.test(result) && !type.prop(NodeProp.error))
            result = JSON.stringify(result);
        index += 4;
        if (endIndex > index) {
            var children = [];
            while (index < endIndex)
                index = this.childToString(index, children);
            result += "(" + children.join(",") + ")";
        }
        parts.push(result);
        return index;
    };
    /// @internal
    TreeBuffer.prototype.cut = function (at) {
        var cutPoint = 0;
        while (cutPoint < this.buffer.length && this.buffer[cutPoint + 1] < at)
            cutPoint += 4;
        var newBuffer = new Uint16Array(cutPoint);
        for (var i = 0; i < cutPoint; i += 4) {
            newBuffer[i] = this.buffer[i];
            newBuffer[i + 1] = this.buffer[i + 1];
            newBuffer[i + 2] = Math.min(at, this.buffer[i + 2]);
            newBuffer[i + 3] = Math.min(this.buffer[i + 3], cutPoint);
        }
        return new TreeBuffer(newBuffer, Math.min(at, this.length), this.group);
    };
    /// @internal
    TreeBuffer.prototype.iterInner = function (from, to, offset, iter) {
        if (from <= to) {
            for (var index = 0; index < this.buffer.length;)
                index = this.iterChild(from, to, offset, index, iter);
        }
        else {
            this.iterRev(from, to, offset, 0, this.buffer.length, iter);
        }
    };
    /// @internal
    TreeBuffer.prototype.iterChild = function (from, to, offset, index, iter) {
        var type = this.group.types[this.buffer[index++]], start = this.buffer[index++] + offset, end = this.buffer[index++] + offset, endIndex = this.buffer[index++];
        if (start > to)
            return this.buffer.length;
        if (end >= from && iter.doEnter(type, start, end)) {
            while (index < endIndex && !iter.done)
                index = this.iterChild(from, to, offset, index, iter);
            if (iter.leave)
                iter.leave(type, start, end);
        }
        return endIndex;
    };
    TreeBuffer.prototype.parentNodesByEnd = function (startIndex, endIndex) {
        var _this = this;
        // Build up an array of node indices reflecting the order in which
        // non-empty nodes end, to avoid having to scan for parent nodes
        // at every position during reverse iteration.
        var order = [];
        var scan = function (index) {
            var end = _this.buffer[index + 3];
            if (end == index + 4)
                return end;
            for (var i = index + 4; i < end;)
                i = scan(i);
            order.push(index);
            return end;
        };
        for (var index = startIndex; index < endIndex;)
            index = scan(index);
        return order;
    };
    /// @internal
    TreeBuffer.prototype.iterRev = function (from, to, offset, startIndex, endIndex, iter) {
        var _this = this;
        var endOrder = this.parentNodesByEnd(startIndex, endIndex);
        // Index range for the next non-empty node
        var nextStart = -1, nextEnd = -1;
        var takeNext = function () {
            if (endOrder.length > 0) {
                nextStart = endOrder.pop();
                nextEnd = _this.buffer[nextStart + 3];
            }
            else {
                nextEnd = -1;
            }
        };
        takeNext();
        run: for (var index = endIndex; index > startIndex && !iter.done;) {
            while (nextEnd == index) {
                var base = nextStart;
                var id_1 = this.buffer[base], start_1 = this.buffer[base + 1] + offset, end_1 = this.buffer[base + 2] + offset;
                takeNext();
                if (start_1 <= from && end_1 >= to) {
                    if (!iter.doEnter(this.group.types[id_1], start_1, end_1)) {
                        // Skip the entire node
                        index = base;
                        while (nextEnd > base)
                            takeNext();
                        continue run;
                    }
                }
            }
            var endIndex_1 = this.buffer[--index], end = this.buffer[--index] + offset, start = this.buffer[--index] + offset, id = this.buffer[--index];
            if (start > from || end < to)
                continue;
            if ((endIndex_1 != index + 4 || iter.doEnter(this.group.types[id], start, end)) && iter.leave)
                iter.leave(this.group.types[id], start, end);
        }
    };
    /// @internal
    TreeBuffer.prototype.findIndex = function (pos, side, start, from, to) {
        var lastI = -1;
        for (var i = from, buf = this.buffer; i < to;) {
            var start1 = buf[i + 1] + start, end1 = buf[i + 2] + start;
            var ignore = start1 == end1 && start1 == pos;
            if (start1 >= pos) {
                if (side > 0 && !ignore)
                    return i;
                break;
            }
            if (end1 > pos)
                return i;
            if (!ignore)
                lastI = i;
            i = buf[i + 3];
        }
        return side < 0 ? lastI : -1;
    };
    return TreeBuffer;
}());
exports.TreeBuffer = TreeBuffer;
var NodeSubtree = /** @class */ (function (_super) {
    __extends(NodeSubtree, _super);
    function NodeSubtree(node, start, parent) {
        var _this = _super.call(this) || this;
        _this.node = node;
        _this.start = start;
        _this.parent = parent;
        return _this;
    }
    Object.defineProperty(NodeSubtree.prototype, "type", {
        get: function () { return this.node.type; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NodeSubtree.prototype, "end", {
        get: function () { return this.start + this.node.length; },
        enumerable: true,
        configurable: true
    });
    NodeSubtree.prototype.resolveAt = function (pos) {
        if (pos <= this.start || pos >= this.end)
            return this.parent.resolveAt(pos);
        return this.node.resolveInner(pos, this.start, this);
    };
    NodeSubtree.prototype.childBefore = function (pos) {
        return this.node.findChild(pos, -1, this.start, this);
    };
    NodeSubtree.prototype.childAfter = function (pos) {
        return this.node.findChild(pos, 1, this.start, this);
    };
    NodeSubtree.prototype.toString = function () { return this.node.toString(); };
    NodeSubtree.prototype.iterate = function (_a) {
        var _b = _a.from, from = _b === void 0 ? this.start : _b, _c = _a.to, to = _c === void 0 ? this.end : _c, enter = _a.enter, leave = _a.leave;
        var iter = new Iteration(enter, leave);
        this.node.iterInner(from, to, this.start, iter);
        return iter.result;
    };
    return NodeSubtree;
}(Subtree));
var BufferSubtree = /** @class */ (function (_super) {
    __extends(BufferSubtree, _super);
    function BufferSubtree(buffer, bufferStart, index, parent) {
        var _this = _super.call(this) || this;
        _this.buffer = buffer;
        _this.bufferStart = bufferStart;
        _this.index = index;
        _this.parent = parent;
        return _this;
    }
    Object.defineProperty(BufferSubtree.prototype, "type", {
        get: function () { return this.buffer.group.types[this.buffer.buffer[this.index]]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferSubtree.prototype, "start", {
        get: function () { return this.buffer.buffer[this.index + 1] + this.bufferStart; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferSubtree.prototype, "end", {
        get: function () { return this.buffer.buffer[this.index + 2] + this.bufferStart; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BufferSubtree.prototype, "endIndex", {
        get: function () { return this.buffer.buffer[this.index + 3]; },
        enumerable: true,
        configurable: true
    });
    BufferSubtree.prototype.childBefore = function (pos) {
        var index = this.buffer.findIndex(pos, -1, this.bufferStart, this.index + 4, this.endIndex);
        return index < 0 ? null : new BufferSubtree(this.buffer, this.bufferStart, index, this);
    };
    BufferSubtree.prototype.childAfter = function (pos) {
        var index = this.buffer.findIndex(pos, 1, this.bufferStart, this.index + 4, this.endIndex);
        return index < 0 ? null : new BufferSubtree(this.buffer, this.bufferStart, index, this);
    };
    BufferSubtree.prototype.iterate = function (_a) {
        var _b = _a.from, from = _b === void 0 ? this.start : _b, _c = _a.to, to = _c === void 0 ? this.end : _c, enter = _a.enter, leave = _a.leave;
        var iter = new Iteration(enter, leave);
        if (from <= to)
            this.buffer.iterChild(from, to, this.bufferStart, this.index, iter);
        else
            this.buffer.iterRev(from, to, this.bufferStart, this.index, this.endIndex, iter);
        return iter.result;
    };
    BufferSubtree.prototype.resolveAt = function (pos) {
        if (pos <= this.start || pos >= this.end)
            return this.parent.resolveAt(pos);
        var found = this.buffer.findIndex(pos, 0, this.bufferStart, this.index + 4, this.endIndex);
        return found < 0 ? this : new BufferSubtree(this.buffer, this.bufferStart, found, this).resolveAt(pos);
    };
    BufferSubtree.prototype.toString = function () {
        var result = [];
        this.buffer.childToString(this.index, result);
        return result.join("");
    };
    return BufferSubtree;
}(Subtree));
var FlatBufferCursor = /** @class */ (function () {
    function FlatBufferCursor(buffer, index) {
        this.buffer = buffer;
        this.index = index;
    }
    Object.defineProperty(FlatBufferCursor.prototype, "id", {
        get: function () { return this.buffer[this.index - 4]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "start", {
        get: function () { return this.buffer[this.index - 3]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "end", {
        get: function () { return this.buffer[this.index - 2]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "size", {
        get: function () { return this.buffer[this.index - 1]; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FlatBufferCursor.prototype, "pos", {
        get: function () { return this.index; },
        enumerable: true,
        configurable: true
    });
    FlatBufferCursor.prototype.next = function () { this.index -= 4; };
    FlatBufferCursor.prototype.fork = function () { return new FlatBufferCursor(this.buffer, this.index); };
    return FlatBufferCursor;
}());
var BalanceBranchFactor = 8;
var repeat = NodeProp.repeated; // Need this one a lot later on
function buildTree(cursor, group, topID, maxBufferLength, reused) {
    var types = group.types;
    function takeNode(parentStart, minPos, children, positions) {
        var id = cursor.id, start = cursor.start, end = cursor.end, size = cursor.size, buffer;
        var startPos = start - parentStart;
        if (size < 0) { // Reused node
            children.push(reused[id]);
            positions.push(startPos);
            cursor.next();
            return;
        }
        var type = types[id], node;
        if (end - start <= maxBufferLength &&
            (buffer = findBufferSize(cursor.pos - minPos, type.prop(repeat) ? id : -1))) {
            // Small enough for a buffer, and no reused nodes inside
            var data = new Uint16Array(buffer.size - buffer.skip);
            var endPos = cursor.pos - buffer.size, index = data.length;
            while (cursor.pos > endPos)
                index = copyToBuffer(buffer.start, data, index);
            node = new TreeBuffer(data, end - buffer.start, group);
            // Wrap if this is a repeat node
            if (type.prop(repeat))
                node = new Tree(type, [node], [0], end - buffer.start);
            startPos = buffer.start - parentStart;
        }
        else { // Make it a node
            var endPos = cursor.pos - size;
            cursor.next();
            var localChildren = [], localPositions = [];
            while (cursor.pos > endPos)
                takeNode(start, endPos, localChildren, localPositions);
            localChildren.reverse();
            localPositions.reverse();
            node = new Tree(type, localChildren, localPositions, end - start);
        }
        children.push(node);
        positions.push(startPos);
        // End of a (possible) sequence of repeating nodes—might need to balance
        if (type.prop(repeat) && (cursor.pos == 0 || cursor.id != id))
            maybeBalanceSiblings(children, positions, type);
    }
    function maybeBalanceSiblings(children, positions, type) {
        var to = children.length, from = to - 1;
        for (; from > 0; from--) {
            var prev = children[from - 1];
            if (!(prev instanceof Tree) || prev.type != type)
                break;
        }
        if (to - from < BalanceBranchFactor)
            return;
        var start = positions[to - 1];
        var wrapped = balanceRange(type, children.slice(from, to).reverse(), positions.slice(from, to).reverse(), 0, to - from, start, maxBufferLength);
        children.length = positions.length = from + 1;
        children[from] = wrapped;
        positions[from] = start;
    }
    function findBufferSize(maxSize, id) {
        // Scan through the buffer to find previous siblings that fit
        // together in a TreeBuffer, and don't contain any reused nodes
        // (which can't be stored in a buffer)
        // If `type` is > -1, only include siblings with that same type
        // (used to group repeat content into a buffer)
        var fork = cursor.fork();
        var size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
        scan: for (var minPos = fork.pos - maxSize; fork.pos > minPos;) {
            var nodeSize = fork.size, startPos = fork.pos - nodeSize;
            if (nodeSize < 0 || startPos < minPos || fork.start < minStart || id > -1 && fork.id != id)
                break;
            var localSkipped = types[fork.id].prop(repeat) ? 4 : 0;
            var nodeStart = fork.start;
            fork.next();
            while (fork.pos > startPos) {
                if (fork.size < 0)
                    break scan;
                if (types[fork.id].prop(repeat))
                    localSkipped += 4;
                fork.next();
            }
            start = nodeStart;
            size += nodeSize;
            skip += localSkipped;
        }
        return size > 4 ? { size: size, start: start, skip: skip } : null;
    }
    function copyToBuffer(bufferStart, buffer, index) {
        var id = cursor.id, start = cursor.start, end = cursor.end, size = cursor.size;
        cursor.next();
        var startIndex = index;
        if (size > 4) {
            var endPos = cursor.pos - (size - 4);
            while (cursor.pos > endPos)
                index = copyToBuffer(bufferStart, buffer, index);
        }
        if (!types[id].prop(repeat)) { // Don't copy repeat nodes into buffers
            buffer[--index] = startIndex;
            buffer[--index] = end - bufferStart;
            buffer[--index] = start - bufferStart;
            buffer[--index] = id;
        }
        return index;
    }
    var children = [], positions = [];
    while (cursor.pos > 0)
        takeNode(0, 0, children, positions);
    var length = children.length ? positions[0] + children[0].length : 0;
    return new Tree(group.types[topID], children.reverse(), positions.reverse(), length);
}
function balanceRange(type, children, positions, from, to, start, maxBufferLength) {
    var length = (positions[to - 1] + children[to - 1].length) - start;
    if (from == to - 1 && start == 0) {
        var first = children[from];
        if (first instanceof Tree)
            return first;
    }
    var localChildren = [], localPositions = [];
    if (length <= maxBufferLength) {
        for (var i = from; i < to; i++) {
            localChildren.push(children[i]);
            localPositions.push(positions[i] - start);
        }
    }
    else {
        var maxChild = Math.max(maxBufferLength, Math.ceil(length * 1.5 / BalanceBranchFactor));
        for (var i = from; i < to;) {
            var groupFrom = i, groupStart = positions[i];
            i++;
            for (; i < to; i++) {
                var nextEnd = positions[i] + children[i].length;
                if (nextEnd - groupStart > maxChild)
                    break;
            }
            if (i == groupFrom + 1) {
                var only = children[groupFrom];
                if (only instanceof Tree && only.type == type) {
                    // Already wrapped
                    if (only.length > maxChild << 1) { // Too big, collapse
                        for (var j = 0; j < only.children.length; j++) {
                            localChildren.push(only.children[j]);
                            localPositions.push(only.positions[j] + groupStart - start);
                        }
                        continue;
                    }
                }
                else {
                    // Wrap with our type to make reuse possible
                    only = new Tree(type, [only], [0], only.length);
                }
                localChildren.push(only);
            }
            else {
                localChildren.push(balanceRange(type, children, positions, groupFrom, i, groupStart, maxBufferLength));
            }
            localPositions.push(groupStart - start);
        }
    }
    return new Tree(type, localChildren, localPositions, length);
}
//# sourceMappingURL=tree.js.map
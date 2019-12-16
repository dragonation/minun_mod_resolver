"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
/// Each range is associated with a value, which must inherit from
/// this class.
var RangeValue = /** @class */ (function () {
    function RangeValue() {
    }
    /// Compare this value with another value. The default
    /// implementation compares by identity.
    RangeValue.prototype.eq = function (other) { return this == other; };
    return RangeValue;
}());
exports.RangeValue = RangeValue;
RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
RangeValue.prototype.point = false;
/// A range associates a value with a range of positions.
var Range = /** @class */ (function () {
    function Range(from, to, value) {
        this.from = from;
        this.to = to;
        this.value = value;
    }
    /// @internal
    Range.prototype.map = function (changes, oldOffset, newOffset) {
        var mapped = this.value.map(changes, this.from + oldOffset, this.to + oldOffset);
        if (mapped) {
            ;
            mapped.from -= newOffset;
            mapped.to -= newOffset;
        }
        return mapped;
    };
    /// @internal
    Range.prototype.move = function (offset) {
        return offset ? new Range(this.from + offset, this.to + offset, this.value) : this;
    };
    Object.defineProperty(Range.prototype, "heapPos", {
        /// @internal Here so that we can put active ranges on a heap and
        /// take them off at their end
        get: function () { return this.to; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Range.prototype, "heapSide", {
        /// @internal
        get: function () { return this.value.endSide; },
        enumerable: true,
        configurable: true
    });
    return Range;
}());
exports.Range = Range;
var none = [];
function maybeNone(array) { return array.length ? array : none; }
var BASE_NODE_SIZE_SHIFT = 5, BASE_NODE_SIZE = 1 << BASE_NODE_SIZE_SHIFT;
/// A range set stores a collection of [ranges](#rangeset.Range) in a
/// way that makes them efficient to [map](#rangeset.RangeSet.map) and
/// [update](#rangeset.RangeSet.update). This is an immutable data
/// structure.
var RangeSet = /** @class */ (function () {
    /// @internal
    function RangeSet(
    /// @internal The text length covered by this set
    length, 
    /// The number of ranges in this set
    size, 
    /// @internal The locally stored ranges—which are all of them for
    /// leaf nodes, and the ones that don't fit in child sets for
    /// non-leaves. Sorted by start position, then side.
    local, 
    /// @internal The child sets, in position order. Their total
    /// length may be smaller than .length if the end is empty (never
    /// greater)
    children) {
        this.length = length;
        this.size = size;
        this.local = local;
        this.children = children;
    }
    /// Update this set, returning the modified set. The range that gets
    /// filtered can be limited with the `filterFrom` and `filterTo`
    /// arguments (specifying a smaller range makes the operation
    /// cheaper).
    RangeSet.prototype.update = function (added, filter, filterFrom, filterTo) {
        if (added === void 0) { added = none; }
        if (filter === void 0) { filter = null; }
        if (filterFrom === void 0) { filterFrom = 0; }
        if (filterTo === void 0) { filterTo = this.length; }
        var maxLen = added.reduce(function (l, d) { return Math.max(l, d.to); }, this.length);
        // Make sure `added` is sorted
        if (added.length)
            for (var i = 1, prev = added[0]; i < added.length; i++) {
                var next = added[i];
                if (byPos(prev, next) > 0) {
                    added = added.slice().sort(byPos);
                    break;
                }
                prev = next;
            }
        return this.updateInner(added, filter, filterFrom, filterTo, 0, maxLen);
    };
    /// @internal
    RangeSet.prototype.updateInner = function (added, filter, filterFrom, filterTo, offset, length) {
        // The new local ranges. Null means no changes were made yet
        var local = filterRanges(this.local, filter, filterFrom, filterTo, offset);
        // The new array of child sets, if changed
        var children = null;
        var size = 0;
        var decI = 0, pos = offset;
        // Iterate over the child sets, applying filters and pushing added
        // ranges into them
        for (var i = 0; i < this.children.length; i++) {
            var child = this.children[i];
            var endPos = pos + child.length, localRanges = null;
            while (decI < added.length) {
                var next = added[decI];
                if (next.from >= endPos)
                    break;
                decI++;
                if (next.to > endPos) {
                    if (!local)
                        local = this.local.slice();
                    insertSorted(local, next.move(-offset));
                }
                else {
                    (localRanges || (localRanges = [])).push(next);
                }
            }
            var newChild = child;
            if (localRanges || filter && filterFrom <= endPos && filterTo >= pos)
                newChild = newChild.updateInner(localRanges || none, filter, filterFrom, filterTo, pos, newChild.length);
            if (newChild != child)
                (children || (children = this.children.slice(0, i))).push(newChild);
            else if (children)
                children.push(newChild);
            size += newChild.size;
            pos = endPos;
        }
        // If nothing was actually updated, return the existing object
        if (!local && !children && decI == added.length)
            return this;
        // Compute final size
        size += (local || this.local).length + added.length - decI;
        // This is a small node—turn it into a flat leaf
        if (size <= BASE_NODE_SIZE)
            return collapseSet(children || this.children, local || this.local.slice(), added, decI, offset, length);
        var childSize = Math.max(BASE_NODE_SIZE, size >> BASE_NODE_SIZE_SHIFT);
        if (decI < added.length) {
            if (!children)
                children = this.children.slice();
            if (!local)
                local = this.local.slice();
            appendRanges(local, children, added, decI, offset, length, pos, childSize);
        }
        if (children) {
            if (!local)
                local = this.local.slice();
            rebalanceChildren(local, children, childSize);
        }
        return new RangeSet(length, size, maybeNone(local || this.local), maybeNone(children || this.children));
    };
    /// Add empty size to the end of the set @internal
    RangeSet.prototype.grow = function (length) {
        return new RangeSet(this.length + length, this.size, this.local, this.children);
    };
    /// Collect all ranges in this set into the target array, offsetting
    /// them by `offset` @internal
    RangeSet.prototype.collect = function (target, offset) {
        for (var _i = 0, _a = this.local; _i < _a.length; _i++) {
            var range = _a[_i];
            target.push(range.move(offset));
        }
        for (var _b = 0, _c = this.children; _b < _c.length; _b++) {
            var child = _c[_b];
            child.collect(target, offset);
            offset += child.length;
        }
    };
    /// Map this range set through a set of changes, return the new set.
    RangeSet.prototype.map = function (changes) {
        if (changes.length == 0 || this == RangeSet.empty)
            return this;
        return this.mapInner(changes, 0, 0, changes.mapPos(this.length, 1)).set;
    };
    // Child boundaries are always mapped forward. This may cause ranges
    // at the start of a set to end up sticking out before its new
    // start, if they map backward. Such ranges are returned in
    // `escaped`.
    RangeSet.prototype.mapInner = function (changes, oldStart, newStart, newEnd) {
        var newLocal = null;
        var escaped = null;
        var newLength = newEnd - newStart, newSize = 0;
        for (var i = 0; i < this.local.length; i++) {
            var range = this.local[i], mapped = range.map(changes, oldStart, newStart);
            var escape_1 = mapped != null && (mapped.from < 0 || mapped.to > newLength);
            if (newLocal == null && (range != mapped || escape_1))
                newLocal = this.local.slice(0, i);
            if (escape_1)
                (escaped || (escaped = [])).push(mapped);
            else if (newLocal && mapped)
                newLocal.push(mapped);
        }
        var newChildren = null;
        for (var i = 0, oldPos = oldStart, newPos = newStart; i < this.children.length; i++) {
            var child = this.children[i], newChild = child;
            var oldChildEnd = oldPos + child.length;
            var newChildEnd = changes.mapPos(oldPos + child.length, 1);
            var touch = touchesChanges(oldPos, oldChildEnd, changes.changes);
            if (touch == 0 /* Yes */) {
                var inner = child.mapInner(changes, oldPos, newPos, newChildEnd);
                newChild = inner.set;
                if (inner.escaped)
                    for (var _i = 0, _a = inner.escaped; _i < _a.length; _i++) {
                        var range = _a[_i];
                        range = range.move(newPos - newStart);
                        if (range.from < 0 || range.to > newLength)
                            insertSorted(escaped || (escaped = []), range);
                        else
                            insertSorted(newLocal || (newLocal = this.local.slice()), range);
                    }
            }
            else if (touch == 2 /* Covered */) {
                newChild = RangeSet.empty.grow(newChildEnd - newPos);
            }
            if (newChild != child) {
                if (newChildren == null)
                    newChildren = this.children.slice(0, i);
                // If the node's content was completely deleted by mapping,
                // drop the node—which is complicated by the need to
                // distribute its length to another child when it's not the
                // last child
                if (newChild.size == 0 && (newChild.length == 0 || newChildren.length || i == this.children.length)) {
                    if (newChild.length > 0 && i > 0) {
                        var last = newChildren.length - 1, lastChild = newChildren[last];
                        newChildren[last] = new RangeSet(lastChild.length + newChild.length, lastChild.size, lastChild.local, lastChild.children);
                    }
                }
                else {
                    newChildren.push(newChild);
                }
            }
            else if (newChildren) {
                newChildren.push(newChild);
            }
            newSize += newChild.size;
            oldPos = oldChildEnd;
            newPos = newChildEnd;
        }
        var set = newLength == this.length && newChildren == null && newLocal == null
            ? this
            : new RangeSet(newLength, newSize + (newLocal || this.local).length, newLocal || this.local, newChildren || this.children);
        return { set: set, escaped: escaped };
    };
    /// Iterate over the ranges that touch the region `from` to `to`,
    /// calling `f` for each. There is no guarantee that the ranges will
    /// be reported in any order.
    RangeSet.prototype.between = function (from, to, f) {
        this.betweenInner(from, to, f, 0);
    };
    /// @internal
    RangeSet.prototype.betweenInner = function (from, to, f, offset) {
        for (var _i = 0, _a = this.local; _i < _a.length; _i++) {
            var loc = _a[_i];
            if (loc.from + offset <= to && loc.to + offset >= from)
                f(loc.from + offset, loc.to + offset, loc.value);
        }
        for (var _b = 0, _c = this.children; _b < _c.length; _b++) {
            var child = _c[_b];
            var end = offset + child.length;
            if (offset <= to && end >= from)
                child.betweenInner(from, to, f, offset);
            offset = end;
        }
    };
    /// Iterate over the ranges in the set that touch the area between
    /// from and to, ordered by their start position and side.
    RangeSet.prototype.iter = function (from, to) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = this.length; }
        var heap = [];
        addIterToHeap(heap, [new IteratedSet(0, this)], from);
        if (this.local.length)
            addToHeap(heap, new LocalSet(0, this.local));
        return {
            next: function () {
                for (;;) {
                    if (heap.length == 0)
                        return;
                    var next = takeFromHeap(heap);
                    var range = next.ranges[next.index++].move(next.offset);
                    if (range.from > to)
                        return;
                    // Put the rest of the set back onto the heap
                    if (next.index < next.ranges.length)
                        addToHeap(heap, next);
                    else if (next.next)
                        addIterToHeap(heap, next.next, 0);
                    if (range.to >= from)
                        return range;
                }
            }
        };
    };
    /// Iterate over two range sets at the same time, calling methods on
    /// `comparator` to notify it of possible differences. `textDiff`
    /// indicates how the underlying data changed between these ranges,
    /// and is needed to synchronize the iteration.
    RangeSet.prototype.compare = function (other, textDiff, comparator, oldLen) {
        var oldPos = 0, newPos = 0;
        for (var _i = 0, textDiff_1 = textDiff; _i < textDiff_1.length; _i++) {
            var range = textDiff_1[_i];
            if (range.fromB > newPos && (this != other || oldPos != newPos))
                new RangeSetComparison(this, oldPos, other, newPos, range.fromB, comparator).run();
            oldPos = range.toA;
            newPos = range.toB;
        }
        if (oldPos < this.length || newPos < other.length || textDiff.length == 0)
            new RangeSetComparison(this, oldPos, other, newPos, newPos + (oldLen - oldPos), comparator).run();
    };
    /// Iterate over a group of range sets at the same time, notifying
    /// the iterator about the ranges covering every given piece of
    /// content.
    RangeSet.iterateSpans = function (sets, from, to, iterator) {
        var heap = [];
        var pos = from, posSide = -FAR;
        for (var _i = 0, sets_1 = sets; _i < sets_1.length; _i++) {
            var set = sets_1[_i];
            if (set.size > 0) {
                addIterToHeap(heap, [new IteratedSet(0, set)], pos);
                if (set.local.length)
                    addToHeap(heap, new LocalSet(0, set.local));
            }
        }
        var active = [];
        while (heap.length > 0) {
            var next = takeFromHeap(heap);
            if (next instanceof LocalSet) {
                var range = next.ranges[next.index], rFrom = range.from + next.offset, rTo = range.to + next.offset;
                if (rFrom > to)
                    break;
                // Put the rest of the set back onto the heap
                if (++next.index < next.ranges.length)
                    addToHeap(heap, next);
                else if (next.next)
                    addIterToHeap(heap, next.next, pos);
                if ((rTo - pos || range.value.endSide - posSide) >= 0 && !iterator.ignore(rFrom, rTo, range.value)) {
                    if (rFrom > pos) {
                        iterator.span(pos, rFrom, active);
                        pos = rFrom;
                        posSide = range.value.startSide;
                    }
                    if (range.value.point) {
                        iterator.point(pos, Math.min(rTo, to), range.value, rFrom < pos, rTo > to);
                        pos = rTo;
                        if (rTo > to)
                            break;
                        posSide = range.value.endSide;
                    }
                    else if (rTo > pos) {
                        active.push(range.value);
                        addToHeap(heap, new Range(rFrom, rTo, range.value));
                    }
                }
            }
            else { // A range that ends here
                var range = next;
                if (range.to > to)
                    break;
                if (range.to > pos) {
                    iterator.span(pos, range.to, active);
                    pos = range.to;
                    posSide = range.value.endSide;
                }
                active.splice(active.indexOf(range.value), 1);
            }
        }
        if (pos < to)
            iterator.span(pos, to, active);
    };
    /// Create a range set for the given range or array of ranges.
    RangeSet.of = function (ranges) {
        return RangeSet.empty.update(ranges instanceof Range ? [ranges] : ranges);
    };
    /// The empty set of ranges.
    RangeSet.empty = new RangeSet(0, 0, none, none);
    return RangeSet;
}());
exports.RangeSet = RangeSet;
// Stack element for iterating over a range set
var IteratedSet = /** @class */ (function () {
    function IteratedSet(offset, set) {
        this.offset = offset;
        this.set = set;
        // Index == -1 means the set's locals have not been yielded yet.
        // Otherwise this is an index in the set's child array.
        this.index = 0;
    }
    return IteratedSet;
}());
// Cursor into a node-local set of ranges
var LocalSet = /** @class */ (function () {
    function LocalSet(offset, ranges, next) {
        if (next === void 0) { next = null; }
        this.offset = offset;
        this.ranges = ranges;
        this.next = next;
        this.index = 0;
    }
    Object.defineProperty(LocalSet.prototype, "heapPos", {
        // Used to make this conform to Heapable
        get: function () { return this.ranges[this.index].from + this.offset; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(LocalSet.prototype, "heapSide", {
        get: function () { return this.ranges[this.index].value.startSide; },
        enumerable: true,
        configurable: true
    });
    return LocalSet;
}());
// Iterating over a range set is done using a stack that represents a
// position into the range set's tree. There's an IteratedSet for each
// active level, and iteration happens by calling this function to
// move the next node onto the stack (which may involve popping off
// nodes before it).
//
// Such a stack represenst the _structural_ part of the tree,
// iterating over tree nodes. The individual ranges of each top node
// must be accessed separately, after it has been moved onto the stack
// (the new node is always at the top, or, if the end of the set has
// been reached, the stack is empty).
//
// Nodes that fall entirely before `skipTo` are never added to the
// stack, allowing efficient skipping of parts of the tree.
function iterRangeSet(stack, skipTo) {
    if (skipTo === void 0) { skipTo = 0; }
    for (;;) {
        if (stack.length == 0)
            break;
        var top_1 = stack[stack.length - 1];
        if (top_1.index == top_1.set.children.length) {
            stack.pop();
        }
        else {
            var next = top_1.set.children[top_1.index], start = top_1.offset;
            top_1.index++;
            top_1.offset += next.length;
            if (top_1.offset >= skipTo) {
                stack.push(new IteratedSet(start, next));
                break;
            }
        }
    }
}
// Iterating over the actual ranges in a set (or multiple sets) is
// done using a binary heap to efficiently get the ordering right. The
// heap may contain both LocalSet instances (iterating over the ranges
// in a set tree node) and actual Range objects. At any point, the one
// with the lowest position (and side) is taken off next.
function compareHeapable(a, b) {
    return a.heapPos - b.heapPos || a.heapSide - b.heapSide;
}
// Advance the iteration over a range set (in `stack`) and add the
// next node that has any local ranges to the heap as a `LocalSet`.
// Links the stack to the `LocalSet` (in `.next`) if this node also
// has child nodes, which will be used to schedule the next call to
// `addIterToHeap` when the end of that `LocalSet` is reached.
function addIterToHeap(heap, stack, skipTo) {
    if (skipTo === void 0) { skipTo = 0; }
    for (;;) {
        iterRangeSet(stack, skipTo);
        if (stack.length == 0)
            break;
        var next = stack[stack.length - 1], local = next.set.local;
        var leaf = next.set.children.length ? null : stack;
        if (local.length)
            addToHeap(heap, new LocalSet(next.offset, local, leaf));
        if (leaf)
            break;
    }
}
// Classic binary heap implementation, using the conformance to
// `Heapable` of the elements to compare them with `compareHeapable`,
// keeping the element with the lowest position at its top.
function addToHeap(heap, elt) {
    var index = heap.push(elt) - 1;
    while (index > 0) {
        var parentIndex = index >> 1, parent_1 = heap[parentIndex];
        if (compareHeapable(elt, parent_1) >= 0)
            break;
        heap[index] = parent_1;
        heap[parentIndex] = elt;
        index = parentIndex;
    }
}
function takeFromHeap(heap) {
    var elt = heap[0], replacement = heap.pop();
    if (heap.length == 0)
        return elt;
    heap[0] = replacement;
    for (var index = 0;;) {
        var childIndex = (index << 1) + 1;
        if (childIndex >= heap.length)
            break;
        var child = heap[childIndex];
        if (childIndex + 1 < heap.length && compareHeapable(child, heap[childIndex + 1]) >= 0) {
            child = heap[childIndex + 1];
            childIndex++;
        }
        if (compareHeapable(replacement, child) < 0)
            break;
        heap[childIndex] = replacement;
        heap[index] = child;
        index = childIndex;
    }
    return elt;
}
function byPos(a, b) {
    return a.from - b.from || a.value.startSide - b.value.startSide;
}
function insertSorted(target, range) {
    var i = target.length;
    while (i > 0 && byPos(target[i - 1], range) >= 0)
        i--;
    target.splice(i, 0, range);
}
function filterRanges(ranges, filter, filterFrom, filterTo, offset) {
    if (!filter)
        return null;
    var copy = null;
    for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i], from = range.from + offset, to = range.to + offset;
        if (filterFrom > to || filterTo < from || filter(from, to, range.value)) {
            if (copy != null)
                copy.push(range);
        }
        else {
            if (copy == null)
                copy = ranges.slice(0, i);
        }
    }
    return copy;
}
function collapseSet(children, local, add, start, offset, length) {
    var mustSort = local.length > 0 && add.length > 0, off = 0;
    for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
        var child = children_1[_i];
        child.collect(local, -off);
        off += child.length;
    }
    for (var _a = 0, add_1 = add; _a < add_1.length; _a++) {
        var added = add_1[_a];
        local.push(added.move(-offset));
    }
    if (mustSort)
        local.sort(byPos);
    return new RangeSet(length, local.length, local, none);
}
function appendRanges(local, children, ranges, start, offset, length, pos, childSize) {
    // Group added ranges after the current children into new
    // children (will usually only happen when initially creating a
    // node or adding stuff to the top-level node)
    for (var i = start; i < ranges.length;) {
        var add = [];
        var end = Math.min(i + childSize, ranges.length);
        var endPos = end == ranges.length ? offset + length : ranges[end].from;
        for (; i < end; i++) {
            var range = ranges[i];
            if (range.to > endPos)
                insertSorted(local, range.move(-offset));
            else
                add.push(range);
        }
        // Move locals that fit in this new child from `local` to `add`
        for (var i_1 = 0; i_1 < local.length; i_1++) {
            var range = local[i_1];
            if (range.from >= pos && range.to <= endPos) {
                local.splice(i_1--, 1);
                insertSorted(add, range.move(offset));
            }
        }
        if (add.length) {
            if (add.length == ranges.length)
                children.push(new RangeSet(endPos - pos, add.length, add.map(function (r) { return r.move(-pos); }), none));
            else
                children.push(RangeSet.empty.updateInner(add, null, 0, 0, pos, endPos - pos));
            pos = endPos;
        }
    }
}
// FIXME try to clean this up
function rebalanceChildren(local, children, childSize) {
    var _loop_1 = function (i, off) {
        var child = children[i], next = void 0;
        if (child.size == 0 && (i > 0 || children.length == 1)) {
            // Drop empty node
            children.splice(i--, 1);
            if (i >= 0)
                children[i] = children[i].grow(child.length);
        }
        else if (child.size > (childSize << 1) && child.local.length < (child.length >> 1)) {
            // Unwrap an overly big node
            for (var _i = 0, _a = child.local; _i < _a.length; _i++) {
                var range = _a[_i];
                insertSorted(local, range.move(off));
            }
            children.splice.apply(children, __spreadArrays([i, 1], child.children));
        }
        else if (child.children.length == 0 && i < children.length - 1 &&
            (next = children[i + 1]).size + child.size <= BASE_NODE_SIZE &&
            next.children.length == 0) {
            // Join two small leaf nodes
            children.splice(i, 2, new RangeSet(child.length + next.length, child.size + next.size, child.local.concat(next.local.map(function (d) { return d.move(child.length); })), none));
        }
        else {
            // Join a number of nodes into a wrapper node
            var joinTo = i + 1, size = child.size, length_1 = child.length;
            if (child.size < (childSize >> 1)) {
                for (; joinTo < children.length; joinTo++) {
                    var next_1 = children[joinTo], totalSize = size + next_1.size;
                    if (totalSize > childSize)
                        break;
                    size = totalSize;
                    length_1 += next_1.length;
                }
            }
            if (joinTo > i + 1) {
                var joined = new RangeSet(length_1, size, none, children.slice(i, joinTo));
                var joinedLocals = [];
                for (var j = 0; j < local.length; j++) {
                    var range = local[j];
                    if (range.from >= off && range.to <= off + length_1) {
                        local.splice(j--, 1);
                        joinedLocals.push(range.move(-off));
                    }
                }
                if (joinedLocals.length)
                    joined = joined.update(joinedLocals.sort(byPos));
                children.splice(i, joinTo - i, joined);
                i++;
                off += length_1;
            }
            else {
                i++;
                off += child.length;
            }
        }
        out_i_1 = i;
        out_off_1 = off;
    };
    var out_i_1, out_off_1;
    for (var i = 0, off = 0; i < children.length;) {
        _loop_1(i, off);
        i = out_i_1;
        off = out_off_1;
    }
}
var SIDE_A = 1, SIDE_B = 2, FAR = 1e9;
var ComparisonSide = /** @class */ (function () {
    function ComparisonSide(stack) {
        this.stack = stack;
        this.heap = [];
        this.active = [];
        this.activeTo = [];
        this.tip = null;
        // A currently active point range, if any
        this.point = null;
        // The end of the current point range
        this.pointTo = -FAR;
    }
    ComparisonSide.prototype.forward = function (start, next) {
        var newTip = false;
        if (next.set.local.length) {
            var local = new LocalSet(next.offset, next.set.local);
            addToHeap(this.heap, local);
            if (!next.set.children.length) {
                this.tip = local;
                newTip = true;
            }
        }
        iterRangeSet(this.stack, start);
        return newTip;
    };
    ComparisonSide.prototype.findActive = function (to, value) {
        for (var i = 0; i < this.active.length; i++)
            if (this.activeTo[i] == to && (this.active[i] == value || this.active[i].eq(value)))
                return i;
        return -1;
    };
    ComparisonSide.prototype.clearPoint = function () {
        this.pointTo = -FAR;
        this.point = null;
    };
    Object.defineProperty(ComparisonSide.prototype, "nextPos", {
        get: function () {
            return this.pointTo > -FAR ? this.pointTo : this.heap.length ? this.heap[0].heapPos : FAR;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ComparisonSide.prototype, "nextSide", {
        get: function () {
            return this.pointTo > -FAR ? this.point.endSide : this.heap.length ? this.heap[0].heapSide : FAR;
        },
        enumerable: true,
        configurable: true
    });
    return ComparisonSide;
}());
// Manage the synchronous iteration over a part of two range sets,
// skipping identical nodes and ranges and calling callbacks on a
// comparator object when differences are found.
var RangeSetComparison = /** @class */ (function () {
    function RangeSetComparison(a, startA, b, startB, endB, comparator) {
        this.comparator = comparator;
        this.a = new ComparisonSide([new IteratedSet(startB - startA, a)]);
        this.b = new ComparisonSide([new IteratedSet(0, b)]);
        this.pos = startB;
        this.end = endB;
        this.forwardIter(SIDE_A | SIDE_B);
    }
    // Move the iteration over the tree structure forward until all of
    // the sides included in `side` (bitmask of `SIDE_A` and/or
    // `SIDE_B`) have added new nodes to their heap, or there is nothing
    // further to iterate over. This is basically used to ensure the
    // heaps are stocked with nodes from the stacks that track the
    // iteration.
    RangeSetComparison.prototype.forwardIter = function (side) {
        for (; side > 0;) {
            var nextA = this.a.stack.length ? this.a.stack[this.a.stack.length - 1] : null;
            var nextB = this.b.stack.length ? this.b.stack[this.b.stack.length - 1] : null;
            if (!nextA && (side & SIDE_A)) {
                // If there's no next node for A, we're done there
                side &= ~SIDE_A;
            }
            else if (!nextB && (side & SIDE_B)) {
                // No next node for B
                side &= ~SIDE_B;
            }
            else if (nextA && nextB && nextA.offset == nextB.offset && nextA.set == nextB.set) {
                // Both next nodes are the same—skip them
                iterRangeSet(this.a.stack, this.pos);
                iterRangeSet(this.b.stack, this.pos);
            }
            else if (nextA && (!nextB || (nextA.offset < nextB.offset ||
                nextA.offset == nextB.offset && (this.a.stack.length == 1 ||
                    nextA.set.length >= nextB.set.length)))) {
                // If there no next B, or it comes after the next A, or it
                // sits at the same position and is smaller, move A forward.
                if (this.a.forward(this.pos, nextA))
                    side &= ~SIDE_A;
            }
            else {
                // Otherwise move B forward
                if (this.b.forward(this.pos, nextB))
                    side &= ~SIDE_B;
            }
        }
    };
    // Driver of the comparison process. On each iteration, call
    // `advance` with the side whose next event (start of end of a
    // range) comes first, until we run out of events.
    RangeSetComparison.prototype.run = function () {
        for (;;) {
            var nextA = this.a.nextPos, nextB = this.b.nextPos;
            if (nextA == FAR && nextB == FAR)
                break;
            var diff = nextA - nextB || this.a.nextSide - this.a.nextSide;
            if (diff < 0)
                this.advance(this.a, this.b);
            else
                this.advance(this.b, this.a);
        }
    };
    RangeSetComparison.prototype.advance = function (side, other) {
        if (side.pointTo > -1) {
            // The next thing that's happening is the end of this.point
            var end = Math.min(this.end, side.pointTo);
            if (!other.point || !side.point.eq(other.point))
                this.comparator.comparePoint(this.pos, end, side.point, other.point);
            this.pos = end;
            if (end == this.end ||
                other.pointTo == end && other.point.endSide == side.point.endSide)
                other.clearPoint();
            side.clearPoint();
            return;
        }
        var next = takeFromHeap(side.heap);
        if (next instanceof LocalSet) {
            // If this is a local set, we're seeing a new range being
            // opened.
            var range = next.ranges[next.index++];
            // The actual positions are offset relative to the node
            var from = range.from + next.offset, to = range.to + next.offset;
            if (from > this.end) {
                // If we found a range past the end, we're done
                side.heap.length = 0;
                return;
            }
            else if (next.index < next.ranges.length) {
                // If there's more ranges in this node, re-add it to the heap
                addToHeap(side.heap, next);
            }
            else {
                // Otherwise, move the iterator forward (making sure this side is advanced)
                this.forwardIter(side == this.a ? SIDE_A : SIDE_B);
            }
            // Ignore ranges that fall entirely in a point on the other side
            // or were skipped by a point on this side
            // FIXME should maybe also drop ranges when to == this.pos but their side < the point's side?
            if (to < this.pos || to < other.pointTo || to == other.pointTo && range.value.startSide < other.point.endSide)
                return;
            // Otherwise, if the other side isn't a point, advance
            if (other.pointTo < 0)
                this.advancePos(from);
            if (range.value.point) {
                side.point = range.value;
                side.pointTo = to;
            }
            else {
                to = Math.min(to, this.end);
                // Add this to the set of active ranges
                var found = other.findActive(to, range.value);
                if (found > -1) {
                    remove(other.active, found);
                    remove(other.activeTo, found);
                }
                else {
                    side.active.push(range.value);
                    side.activeTo.push(to);
                    addToHeap(side.heap, new Range(this.pos, to, range.value));
                }
            }
        }
        else {
            // This is the end of a range, remove it from the active set if it's in there.
            var range = next;
            if (other.pointTo < 0)
                this.advancePos(range.to);
            var found = side.findActive(range.to, range.value);
            if (found > -1) {
                remove(side.active, found);
                remove(side.activeTo, found);
            }
        }
    };
    RangeSetComparison.prototype.advancePos = function (pos) {
        if (pos > this.end)
            pos = this.end;
        if (pos <= this.pos)
            return;
        if (!sameSet(this.a.active, this.b.active))
            this.comparator.compareRange(this.pos, pos, this.a.active, this.b.active);
        this.pos = pos;
    };
    return RangeSetComparison;
}());
function sameSet(a, b) {
    if (a.length != b.length)
        return false;
    outer: for (var i = 0; i < a.length; i++) {
        for (var j = 0; j < b.length; j++)
            if (a[i].eq(b[j]))
                continue outer;
        return false;
    }
    return true;
}
function remove(array, index) {
    var last = array.pop();
    if (index != array.length)
        array[index] = last;
}
function touchesChanges(from, to, changes) {
    var result = 1 /* No */;
    for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
        var change = changes_1[_i];
        if (change.to >= from && change.from <= to) {
            if (change.from < from && change.to > to)
                result = 2 /* Covered */;
            else if (result == 1 /* No */)
                result = 0 /* Yes */;
        }
        var diff = change.length - (change.to - change.from);
        if (from > change.from)
            from += diff;
        if (to > change.to)
            to += diff;
    }
    return result;
}

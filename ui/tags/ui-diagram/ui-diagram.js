const testHit = function (x, y, frame, radius) {

    if (!radius) { radius = 0; }

    return ((x >= frame.left - radius) &&
            (x <= frame.left + frame.width + radius) &&
            (y >= frame.top - radius) &&
            (y <= frame.top + frame.height + radius));

};

const hasInset = function (from, to, radius) {

    if (!radius) { radius = 0; }

    let hit = false;

    if (!hit) { hit = testHit(from.left, from.top, to, radius); }
    if (!hit) { hit = testHit(from.left, from.top + from.height, to, radius); }
    if (!hit) { hit = testHit(from.left + from.width, from.top + from.height, to, radius); }
    if (!hit) { hit = testHit(from.left + from.width, from.top, to, radius); }

    if (!hit) { hit = testHit(to.left, to.top, from, radius); }
    if (!hit) { hit = testHit(to.left, to.top + to.height, from, radius); }
    if (!hit) { hit = testHit(to.left + to.width, to.top + to.height, from, radius); }
    if (!hit) { hit = testHit(to.left + to.width, to.top, from, radius); }

    return hit;

};

const hasSpaces = function (from, to, hit, radius) {

    let spaces = { "x": false, "y": false };
    if (!hit) {
        spaces.x = true;
        spaces.y = true;
        if (((to.top >= from.top - radius) &&
             (to.top <= from.top + from.height + radius)) ||
            ((from.top >= to.top - radius) &&
             (from.top <= to.top + to.height + radius))) {
            spaces.y = false;
        }
        if (((to.left >= from.left - radius) &&
             (to.left <= from.left + from.width + radius)) ||
            ((from.left >= to.left - radius) &&
             (from.left <= to.left + to.width + radius))) {
            spaces.x = false;
        }
    }

    return spaces;

};

const getPathLength = function (path) {

    let length = 0;

    let last = undefined;
    for (let point of path) {
        if (last) {
            length += Math.abs(point[0] - last[0]) + Math.abs(point[1] - last[1]);
        }
        last = point;
    }

    return length;

};

const findPath = function (fromX, fromY, fromDirection, toX, toY, toDirection,
                           from, to, hit, spaces,
                           radius, arrowSize) {

    const top = Math.min(from.top, to.top) - radius;
    const left = Math.min(from.left, to.left) - radius;
    const bottom = Math.max(from.top + from.height, to.top + to.height) + radius;
    const right = Math.max(from.left + from.width, to.left + to.width) + radius;

    let path = [[fromX, fromY]];

    switch (fromDirection) {
        case "top": { fromY -= arrowSize; path.push([fromX, fromY]); break; };
        case "bottom": { fromY += arrowSize; path.push([fromX, fromY]); break; };
        case "left": { fromX -= arrowSize; path.push([fromX, fromY]); break; };
        case "right": { fromX += arrowSize; path.push([fromX, fromY]); break; };
        default: { throw new Error(`Unknown direction ${direction}`); };
    }

    let direction = fromDirection;

    let returns = 0;

    let getPath = function (direction, toDirection, fromX, fromY, toX, toY, from, to) {

        let path = [];

        switch (direction) {
            case "top": {
                if (fromY < toY) {
                    switch (toDirection) {
                        case "left": {
                            ++returns;
                            if (spaces.x && (fromX < toX)) {
                                let x = (from.left + from.width + to.left) / 2;
                                path.push([(fromX + x) / 2, fromY - radius, "X"]);
                                path.push([x, (toY - radius + fromY) / 2, "Y"]);
                            } else if ((fromX < toX) && (toY - arrowSize * 2 < fromY) && (fromY < toY)) {
                                let x = (fromX + toX) / 2;
                                path.push([(fromX + x) / 2, fromY - radius, "X"]);
                                path.push([x, (toY - radius + fromY) / 2, "Y"]);
                            } else {
                                let radius2 = fromX < toX ? radius : Math.max((fromX - left) / 4, (fromY - top));
                                path.push([(left + fromX) / 2, fromY - radius2, "X"]);
                                path.push([left, (toY - radius2 + fromY) / 2, "Y"]);
                            }
                            direction = "bottom";
                            break;
                        };
                        case "right": {
                            ++returns;
                            if (spaces.x && (fromX > toX)) {
                                let x = (from.left + to.width + to.left) / 2;
                                path.push([(fromX + x) / 2, fromY - radius, "X"]);
                                path.push([x, (toY - radius + fromY) / 2, "Y"]);
                            } else if ((fromX > toX) && (toY - arrowSize * 2 < fromY) && (fromY < toY)) {
                                let x = (fromX + toX) / 2;
                                path.push([(fromX + x) / 2, fromY - radius, "X"]);
                                path.push([x, (toY - radius + fromY) / 2, "Y"]);
                            } else {
                                let radius2 = fromX > toX ? radius : Math.max((right - fromX) / 4, (fromY - top));
                                path.push([(right + fromX) / 2, fromY - radius2, "X"]);
                                path.push([right, (toY + fromY - radius2) / 2, "Y"]);
                            }
                            direction = "bottom";
                            break;
                        };
                        case "bottom": {
                            ++returns;
                            let x = 0;
                            if (spaces.x) {
                                x = (Math.min(from.width + from.left, to.width + to.left) + Math.max(from.left, to.left)) / 2;
                                path.push([(fromX + x) / 2, fromY - radius, "X"]);
                                path.push([x, (toY + fromY) / 2, "Y"]);
                            } else {
                                let y = fromY - radius;
                                if ((fromX - left) + (toX - left) < (right - fromX) + (right - toX)) {
                                    x = left;
                                    if (to.left <= fromX) {
                                        y = fromY - Math.max((fromX - left) / 4, (fromY - top));
                                    }
                                } else {
                                    x = right;
                                    if (to.left + to.width >= fromX) {
                                        y = fromY - Math.max((right - fromX) / 4, (fromY - top));
                                    }
                                }
                                path.push([(fromX + x) / 2, y, "X"]);
                                path.push([x, (toY + fromY) / 2, "Y"]);
                            }
                            direction = "bottom";
                            break;
                        };
                        case "top": { break; }
                        default: {
                            throw new Error(`Unknown direction ${toDirection}`);
                        }
                    }
                }
                break;
            };
            case "bottom": {
                if (fromY > toY) {
                    switch (toDirection) {
                        case "left": {
                            ++returns;
                            if (spaces.x && (fromX < toX)) {
                                let x = (from.left + from.width + to.left) / 2;
                                path.push([(fromX + x) / 2, fromY + radius, "X"]);
                                path.push([x, (toY + radius + fromY) / 2, "Y"]);
                            } else if ((fromX < toX) && (fromY - arrowSize * 2 < toY) && (fromY > toY)) {
                                let x = (fromX + toX) / 2;
                                path.push([(fromX + x) / 2, fromY + radius, "X"]);
                                path.push([x, (toY + radius + fromY) / 2, "Y"]);
                            } else {
                                let radius2 = fromX < toX ? radius : Math.max((fromX - left) / 4, (bottom - fromY));
                                path.push([(left + fromX) / 2, fromY + radius2, "X"]);
                                path.push([left, (toY + radius2 + fromY) / 2, "Y"]);
                            }
                            direction = "top";
                            break;
                        };
                        case "right": {
                            ++returns;
                            if (spaces.x && (fromX > toX)) {
                                let x = (from.left + to.width + to.left) / 2;
                                path.push([(fromX + x) / 2, fromY + radius, "X"]);
                                path.push([x, (toY + radius + fromY) / 2, "Y"]);
                            } else if ((fromX > toX) && (fromY - arrowSize * 2 < toY) && (fromY > toY)) {
                                let x = (fromX + toX) / 2;
                                path.push([(fromX + x) / 2, fromY + radius, "X"]);
                                path.push([x, (toY + radius + fromY) / 2, "Y"]);
                            } else {
                                let radius2 = fromX > toX ? radius : Math.max((right - fromX) / 4, (bottom - fromY));
                                path.push([(right + fromX) / 2, fromY + radius2, "X"]);
                                path.push([right, (toY + fromY + radius2) / 2, "Y"]);
                            }
                            direction = "top";
                            break;
                        };
                        case "top": {
                            ++returns;
                            let x = 0;
                            if (spaces.x) {
                                x = (Math.min(from.width + from.left, to.width + to.left) + Math.max(from.left, to.left)) / 2;
                                path.push([(fromX + x) / 2, fromY + radius, "X"]);
                                path.push([x, (toY + fromY) / 2, "Y"]);
                            } else {
                                let y = fromY + radius;
                                if ((fromX - left) + (toX - left) < (right - fromX) + (right - toX)) {
                                    x = left;
                                    if (to.left <= fromX) {
                                        y = fromY + Math.max((fromX - left) / 4, (bottom - fromY));
                                    }
                                } else {
                                    x = right;
                                    if (to.left + to.width >= fromX) {
                                        y = fromY + Math.max((right - fromX) / 4, (bottom - fromY));
                                    }
                                }
                                path.push([(fromX + x) / 2, y, "X"]);
                                path.push([x, (toY + fromY) / 2, "Y"]);
                            }
                            direction = "top";
                            break;
                        };
                        case "bottom": { break; }
                        default: {
                            throw new Error(`Unknown direction ${toDirection}`);
                        }
                    }
                }
                break;
            };
            case "left": {
                if (fromX < toX) {
                    switch (toDirection) {
                        case "top": {
                            ++returns;
                            if (spaces.y && (fromY < toY)) {
                                let y = (from.top + from.height + to.top) / 2;
                                path.push([fromX - radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX - radius + fromX) / 2, y, "X"]);
                            } else if ((fromY < toY) && (toX - arrowSize * 2 < fromX) && (fromX < toX)) {
                                let y = (fromY + toY) / 2;
                                path.push([fromX - radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX - radius + fromX) / 2, y, "X"]);
                            } else {
                                let radius2 = fromY < toY ? radius : Math.max((fromY - top) / 4, (fromX - left));
                                path.push([fromX - radius2, (top + fromY) / 2, "Y"]);
                                path.push([(toX - radius2 + fromX) / 2, top, "X"]);
                            }
                            direction = "right";
                            break;
                        }
                        case "bottom": {
                            ++returns;
                            if (spaces.y && (fromY > toY)) {
                                let y = (from.top + to.top + to.height) / 2;
                                path.push([fromX - radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX - radius + fromX) / 2, y, "X"]);
                            } else if ((fromY > toY) && (toX - arrowSize * 2 < fromX) && (fromX < toX)) {
                                let y = (fromY + toY) / 2;
                                path.push([fromX - radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX - radius + fromX) / 2, y, "X"]);
                            } else {
                                let radius2 = fromY > toY ? radius : Math.max((bottom - fromY) / 4, (fromX - left));
                                path.push([fromX - radius2, (bottom + fromY) / 2, "Y"]);
                                path.push([(toX + fromX - radius2) / 2, bottom, "X"]);
                            }
                            direction = "right";
                            break;
                        };
                        case "right": {
                            ++returns;
                            let y = 0;
                            if (spaces.y) {
                                y = (Math.min(from.height + from.top, to.height + to.top) + Math.max(from.top, to.top)) / 2;
                                path.push([fromX - radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX + fromX) / 2, y, "X"]);
                            } else {
                                let x = fromX - radius;
                                if ((fromY - top) + (toY - top) < (bottom - fromY) + (bottom - toY)) {
                                    y = top;
                                    if (to.top <= fromY) {
                                        x = fromX - Math.max((fromY - top) / 4, (fromX - left));
                                    }
                                } else {
                                    y = bottom;
                                    if (to.top + to.height >= fromY) {
                                        x = fromX - Math.max((bottom - fromY) / 4, (fromX - left));
                                    }
                                }
                                path.push([x, (fromY + y) / 2, "Y"]);
                                path.push([(toX + fromX) / 2, y, "X"]);
                            }
                            direction = "right";
                            break;
                        };
                        case "left": { break; }
                        default: {
                            throw new Error(`Unknown direction ${toDirection}`);
                        }

                    }
                }
                break;
            };
            case "right": {
                if (fromX > toX) {
                    switch (toDirection) {
                        case "top": {
                            ++returns;
                            if (spaces.y && (fromY < toY)) {
                                let y = (from.top + from.height + to.top) / 2;
                                path.push([fromX + radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX + radius + fromX) / 2, y, "X"]);
                            } else if ((fromY < toY) && (fromX - arrowSize * 2 < toX) && (fromX > toX)) {
                                let y = (fromY + toY) / 2;
                                path.push([fromX + radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX + radius + fromX) / 2, y, "X"]);
                            } else {
                                let radius2 = fromY < toY ? radius : Math.max((fromY - top) / 4, (right - fromX));
                                path.push([fromX + radius2, (top + fromY) / 2, "Y"]);
                                path.push([(toX + radius2 + fromX) / 2, top, "X"]);
                            }
                            direction = "left";
                            break;
                        };
                        case "bottom": {
                            ++returns;
                            if (spaces.y && (fromY > toY)) {
                                let y = (from.top + to.top + to.height) / 2;
                                path.push([fromX + radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX + radius + fromX) / 2, y, "X"]);
                            } else if ((fromY > toY) && (toX - arrowSize * 2 < fromX) && (fromX < toX)) {
                                let y = (fromY + toY) / 2;
                                path.push([fromX - radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX - radius + fromX) / 2, y, "X"]);
                            } else {
                                let radius2 = fromY > toY ? radius : Math.max((bottom - fromY) / 4, (right - fromX));
                                path.push([fromX + radius2, (bottom + fromY) / 2, "Y"]);
                                path.push([(toX + fromX + radius2) / 2, bottom, "X"]);
                            }
                            direction = "left";
                            break;
                        };
                        case "left": {
                            ++returns;
                            let y = 0;
                            if (spaces.y) {
                                y = (Math.min(from.height + from.top, to.height + to.top) + Math.max(from.top, to.top)) / 2;
                                path.push([fromX + radius, (fromY + y) / 2, "Y"]);
                                path.push([(toX + fromX) / 2, y, "X"]);
                            } else {
                                let x = fromX + radius;
                                if ((fromY - top) + (toY - top) < (bottom - fromY) + (bottom - toY)) {
                                    y = top;
                                    if (to.top <= fromY) {
                                        x = fromX + Math.max((fromY - top) / 4, (right - fromX));
                                    }
                                } else {
                                    y = bottom;
                                    if (to.top + to.height >= fromY) {
                                        x = fromX + Math.max((bottom - fromY) / 4, (right - fromX));
                                    }
                                }
                                path.push([x, (fromY + y) / 2, "Y"]);
                                path.push([(toX + fromX) / 2, y, "X"]);
                            }
                            direction = "left";
                            break;
                        };
                        case "right": { break; }
                        default: {
                            throw new Error(`Unknown direction ${toDirection}`);
                        }
                    }
                }
                break;
            };
        }

        return {
            "direction": direction,
            "path": path
        };

    };

    let partA = getPath(direction, toDirection, fromX, fromY, toX, toY, from, to);

    path = path.concat(partA.path);

    direction = partA.direction;
    fromX = path[path.length - 1][0];
    fromY = path[path.length - 1][1];

    let toX2 = toX; let toY2 = toY;

    switch (toDirection) {
        case "left": { toX -= arrowSize; break; };
        case "right": { toX += arrowSize; break; };
        case "top": { toY -= arrowSize; break; };
        case "bottom": { toY += arrowSize; break; };
        default: { throw new Error(`Unknown to direction[${toDirection}]`); }
    }

    let partB = getPath(toDirection, direction, toX, toY, fromX, fromY, to, from);
    if (partB.path.length > 0) {
        partB.path.reverse();
        toDirection = partB.direction;
        toX = partB.path[0][0];
        toY = partB.path[0][1];
    }

    switch (direction) {
        case "top": {
            switch (toDirection) {
                case "left": {
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "bottom": {
                    let x = (toX + fromX) / 2;
                    let y = (fromY + toY) / 2;
                    path.push([x, y, "X"]);
                    path.push([toX, toY, "Y"]);
                    break;
                };
                case "right": {
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "top": {
                    let x = (toX + fromX) / 2;
                    let y = Math.min(fromY, toY) - radius;
                    path.push([x, y, "X"]);
                    path.push([toX, toY, "Y"]);
                    break;
                };
                default: {
                    throw new Error(`Unknown to direction[${toDirection}]`);
                }
            }
            break;
        };
        case "bottom": {
            switch (toDirection) {
                case "left": {
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "bottom": {
                    let x = (toX + fromX) / 2;
                    let y = Math.max(fromY, toY) + radius;
                    path.push([x, y, "X"]);
                    path.push([toX, toY, "Y"]);
                    break;
                };
                case "right": {
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "top": {
                    let x = (toX + fromX) / 2;
                    let y = (fromY + toY) / 2;
                    path.push([x, y, "X"]);
                    path.push([toX, toY, "Y"]);
                    break;
                };
                default: {
                    throw new Error(`Unknown to direction[${toDirection}]`);
                }
            }
            break;
        };
        case "left": {
            switch (toDirection) {
                case "left": {
                    let x = Math.min(fromX, toX) - radius;
                    let y = (fromY + toY) / 2;
                    path.push([x, y, "Y"]);
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "bottom": {
                    path.push([toX, toY, "Y"]);
                    break;
                };
                case "right": {
                    let x = (toX + fromX) / 2;
                    let y = (fromY + toY) / 2;
                    path.push([x, y, "Y"]);
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "top": {
                    path.push([toX, toY, "Y"]);
                    break;
                };
                default: {
                    throw new Error(`Unknown to direction[${toDirection}]`);
                }
            }
            break;
        };
        case "right": {
            switch (toDirection) {
                case "right": {
                    let x = Math.max(fromX, toX) + radius;
                    let y = (fromY + toY) / 2;
                    path.push([x, y, "Y"]);
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "bottom": {
                    path.push([toX, toY, "Y"]);
                    break;
                };
                case "left": {
                    let x = (toX + fromX) / 2;
                    let y = (fromY + toY) / 2;
                    path.push([x, y, "Y"]);
                    path.push([toX, toY, "X"]);
                    break;
                };
                case "top": {
                    path.push([toX, toY, "Y"]);
                    break;
                };
                default: {
                    throw new Error(`Unknown to direction[${toDirection}]`);
                }
            }
            break;
        };
        default: {
            throw new Error(`Unknown from direction[${direction}]`);
        }
    }

    path = path.concat(partB.path);

    path.push([toX2, toY2]);

    return {
        "path": path,
        "returns": returns,
        "length": getPathLength(path)
    };

};

module.exports = {
    "attributes": [],
    "listeners": {
        "onconnected": function () {

            this.updateLayouts();

            this.resizeObserver = new ResizeObserver((entries) => {
                this.updateLayouts();
            });
            this.resizeObserver.observe(this);

            this.mutationObserver = new MutationObserver(() => {
                this.updateLayouts();
            });

            this.mutationObserver.observe(this, { "childList": true });

        },
        "ondisconnected": function () {

            this.resizeObserver.disconnect(this);
            this.mutationObserver.disconnect(this);

        }
    },
    "properties": {
        "viewportLeft": {
            "get": function () {
                if (!this.viewportRanges) {
                    return 0;
                }
                return this.viewportRanges.mins[0];
            }
        },
        "viewportTop": {
            "get": function () {
                if (!this.viewportRanges) {
                    return 0;
                }
                return this.viewportRanges.mins[1];
            }
        },
        "scrollLeft": {
            "get": function () {
                return this.filler.query("ui-scroll-view")[0].scrollLeft;
            },
            "set": function (value) {
                this.filler.query("ui-scroll-view")[0].scrollLeft = value;
            }
        },
        "scrollTop": {
            "get": function () {
                return this.filler.query("ui-scroll-view")[0].scrollTop;
            },
            "set": function (value) {
                this.filler.query("ui-scroll-view")[0].scrollTop = value;
            }
        },
        "scrollWidth": {
            "get": function () {
                return this.filler.query("ui-scroll-view")[0].scrollWidth;
            }
        },
        "scrollHeight": {
            "get": function () {
                return this.filler.query("ui-scroll-view")[0].scrollHeight;
            }
        }
    },
    "methods": {
        "bringToFirst": function (object) {

            let frames = [];
            for (let looper = 0; looper < this.children.length; ++looper) {
                let node = this.children[looper];
                if (node !== object) {
                    let zIndex = $(node).css("z-index");
                    frames.push({
                        "node": node,
                        "index": looper,
                        "z-index": zIndex
                    });
                }
            }
            frames.sort((a, b) => {
                if (a["z-index"] && b["z-index"]) {
                    let result = parseInt(a["z-index"]) - parseInt(b["z-index"]);
                    if (result) {
                        return result;
                    }
                }
                return a.index - b.index;
            });

            frames.push({
                "node": object,
            });

            let nextZIndex = 1;
            for (let frame of frames) {
                $(frame.node).css("z-index", nextZIndex);
                ++nextZIndex;
            }

        },
        "analyzeLayouts": function () {

            let frames = [];
            let mins = [Infinity, Infinity]; let maxes = [-Infinity, -Infinity];
            for (let looper = 0; looper < this.children.length; ++looper) {
                let node = this.children[looper];
                if (!$(node).hasClass("closing")) {
                    let wireID = $(node).attr("wire-id");
                    if (!wireID) { wireID = null; }
                    let targetIDs = null;
                    if (node.getTargetIDs) {
                        targetIDs = node.getTargetIDs();
                    }
                    let css = $(node).css(["width", "height", "left", "top", "z-index"]);
                    let {left, top, width, height} = css;
                    left = parseFloat(left);
                    top = parseFloat(top);
                    width = parseFloat(width);
                    height = parseFloat(height);
                    if (!node.wireCode) {
                        node.wireCode = $.uuid();
                    }
                    frames.push({
                        "dom": node,
                        "wire-id": wireID,
                        "wire-code": node.wireCode,
                        "target-ids": targetIDs,
                        "index": looper,
                        "left": left, "top": top,
                        "width": width, "height": height,
                        "right": left + width, "bottom": top + height,
                        "z-index": css["z-index"]
                    });
                    if (left < mins[0]) { mins[0] = left; }
                    if (top < mins[1]) { mins[1] = top; }
                    if (left + width > maxes[0]) { maxes[0] = left + width; }
                    if (top + height > maxes[1]) { maxes[1] = top + height; }
                }
            }
            frames.sort((a, b) => {
                if (a["z-index"] && b["z-index"]) {
                    let result = parseInt(a["z-index"]) - parseInt(b["z-index"]);
                    if (result) {
                        return result;
                    }
                }
                return a.index - b.index;
            });

            if (!isFinite(mins[0])) { mins[0] = 0; }
            if (!isFinite(mins[1])) { mins[1] = 0; }
            if (!isFinite(maxes[0])) { maxes[0] = 0; }
            if (!isFinite(maxes[1])) { maxes[1] = 0; }
            let coach = $.dom.getDevicePixels(200);
            mins[0] -= coach; maxes[0] += coach;
            mins[1] -= coach; maxes[1] += coach;

            let { width, height } = $(this).css(["width", "height"]);
            width = parseFloat(width);
            if (width > maxes[0] - mins[0]) {
                let offset = (width - (maxes[0] - mins[0])) / 2;
                mins[0] = mins[0] - offset;
                maxes[0] = mins[0] + width;
            }
            height = parseFloat(height);
            if (height > maxes[1] - mins[1]) {
                let offset = (height - (maxes[1] - mins[1])) / 2;
                mins[1] = mins[1] - offset;
                maxes[1] = mins[1] + height;
            }

            let gridSize = $.dom.getDevicePixels(40);
            mins[0] = Math.floor(mins[0] / gridSize) * gridSize;
            mins[1] = Math.floor(mins[1] / gridSize) * gridSize;
            maxes[0] = Math.ceil(maxes[0] / gridSize) * gridSize;
            maxes[1] = Math.ceil(maxes[1] / gridSize) * gridSize;

            let realMins = mins.slice(0);
            let realMaxes = maxes.slice(0);

            let scrollView = this.filler.query("ui-scroll-view")[0];
            let offsets = { "x": 0, "y": 0 };
            if (this.viewportRanges) {
                offsets.x = this.viewportRanges.mins[0] - mins[0];
                offsets.y = this.viewportRanges.mins[1] - mins[1];
            }
            let scrollLeft = scrollView.scrollLeft + offsets.x;
            if (scrollLeft < 0) {
                let offset = Math.floor(scrollLeft / gridSize) * gridSize;
                mins[0] += offset;
                offsets.x -= offset;
            }
            let scrollTop = scrollView.scrollTop + offsets.y;
            if (scrollTop < 0) {
                let offset = Math.floor(scrollTop / gridSize) * gridSize;
                mins[1] += offset;
                offsets.y -= offset;
            }
            if (mins[0] + scrollView.scrollLeft + offsets.x + width > maxes[0]) {
                maxes[0] = mins[0] + scrollView.scrollLeft + offsets.x + width;
            }
            if (mins[1] + scrollView.scrollTop + offsets.y + height > maxes[1]) {
                maxes[1] = mins[1] + scrollView.scrollTop + offsets.y + height;
            }
            maxes[0] = Math.ceil(maxes[0] / gridSize) * gridSize;
            maxes[1] = Math.ceil(maxes[1] / gridSize) * gridSize;

            return {
                "frames": frames,
                "mins": mins,
                "maxes": maxes,
                "offsets": offsets
            };

        },
        "updateLayouts": function (dirties) {

            let layouts = this.analyzeLayouts();
            let { frames, mins, maxes } = layouts;
            let scrollOffsets = layouts.offsets;

            this.viewportRanges = { "mins": mins, "maxes": maxes };

            let scrollView = this.filler.query("ui-scroll-view")[0];
            let { scrollLeft, scrollTop } = scrollView;

            this.filler.query("#diagram-grids").css({
                "left": 0,
                "top": 0,
                "width": `${(maxes[0] - mins[0])}px`,
                "height": `${(maxes[1] - mins[1])}px`
            });
            this.filler.query("#diagram-arrows").css({
                "left": 0,
                "top": 0,
                "width": `${(maxes[0] - mins[0])}px`,
                "height": `${(maxes[1] - mins[1])}px`
            });

            this.filler.query("#diagram-paper").css({
                "--offset-x": `${-mins[0]}px`,
                "--offset-y": `${-mins[1]}px`
            });

            scrollView.scrollLeft = scrollLeft + scrollOffsets.x;
            scrollView.scrollTop = scrollTop + scrollOffsets.y;

            this.updateConnections(dirties);

            let canvasSize = $.dom.getDevicePixels(200);
            let viewportSize = $.dom.getDevicePixels(200) - 5; // 2 for edge, 1 for canvas

            let ratio = 1;
            let offsets = [mins[0], mins[1]];
            if (maxes[0] - mins[0] > maxes[1] - mins[1]) {
                ratio = viewportSize / (maxes[0] - mins[0]);
                offsets[1] -= ((maxes[0] - mins[0]) - (maxes[1] - mins[1])) / 2;
            } else {
                ratio = viewportSize / (maxes[1] - mins[1]);
                offsets[0] -= ((maxes[1] - mins[1]) - (maxes[0] - mins[0])) / 2;
            }
            this.birdViewRatio = ratio;

            let canvas = this.filler.query("#diagram-bird-view")[0];
            let context = canvas.getContext("2d");
            const drawRect = (x, y, x2, y2, radius) => {
                let min = Math.floor(Math.min(x2 - x, y2 - y) / 2);
                if (min < 0) { min = 0; }
                if (min < radius) {
                    radius = min;
                }
                radius = Math.round($.dom.getDevicePixels(radius));
                x += 2.5; y += 2.5; x2 += 2.5; y2 += 2.5;
                context.moveTo(x, y + radius);
                context.lineTo(x, y2 - radius);
                if (radius) {
                    context.arc(x + radius, y2 - radius, radius, Math.PI, Math.PI / 2, true);
                }
                context.lineTo(x2 - radius, y2);
                if (radius) {
                    context.arc(x2 - radius, y2 - radius, radius, Math.PI / 2, 0, true);
                }
                context.lineTo(x2, y + radius);
                if (radius) {
                    context.arc(x2 - radius, y + radius, radius, 0, - Math.PI / 2, true);
                }
                context.lineTo(x + radius, y);
                if (radius) {
                    context.arc(x + radius, y + radius, radius, - Math.PI / 2, - Math.PI, true);
                }
                context.closePath();
            }
            context.clearRect(0, 0, canvasSize, canvasSize);

            let frameRadius = $.dom.getDevicePixels(2);
            context.lineWidth = 1;
            for (let frame of frames) {
                let x = Math.round(ratio * (frame.left - offsets[0]));
                let y = Math.round(ratio * (frame.top - offsets[1]));
                let x2 = Math.round(ratio * (frame.left - offsets[0] + frame.width));
                let y2 = Math.round(ratio * (frame.top - offsets[1] + frame.height));
                context.fillStyle = "rgba(0, 0, 0, 0.1)";
                context.strokeStyle = "rgba(0, 0, 0, 0.3)";
                context.beginPath();
                drawRect(x, y, x2, y2, frameRadius);
                context.stroke();
                context.fill();
                context.fillStyle = "transparent";
                context.strokeStyle = "rgba(255, 255, 255, 0.4)";
                context.beginPath();
                drawRect(x + 1, y + 1, x2 - 1, y2 - 1, frameRadius + 1);
                context.stroke();
            }

            let x = Math.round(ratio * (scrollView.scrollLeft - offsets[0] + mins[0]));
            let y = Math.round(ratio * (scrollView.scrollTop - offsets[1] + mins[1]));
            let x2 = Math.round(ratio * (scrollView.scrollLeft + parseFloat($(scrollView).css("width")) - offsets[0] + mins[0]));
            let y2 = Math.round(ratio * (scrollView.scrollTop + parseFloat($(scrollView).css("height")) - offsets[1] + mins[1]));

            context.strokeStyle = "rgba(255, 255, 255, 0.6)";
            context.lineWidth = 5;
            context.beginPath();
            drawRect(x, y, x2, y2, $.dom.getDevicePixels(5));
            context.stroke();

            context.strokeStyle = "rgba(13, 142, 241, 0.8)";
            context.lineWidth = 3;
            context.beginPath();
            drawRect(x, y, x2, y2, $.dom.getDevicePixels(5));
            context.stroke();

            for (let arrow of this.filler.query("#diagram-arrows .arrow")) {
                context.strokeStyle = $(arrow).css("stroke");
                context.lineWidth = 1;
                context.beginPath();
                arrow.arrowPath.forEach((point, index, list) => {
                    let x = Math.round(ratio * (point[0] - offsets[0] + mins[0])) + 2.5;
                    let y = Math.round(ratio * (point[1] - offsets[1] + mins[1])) + 2.5;
                    if (index === 0) {
                        context.moveTo(x, y);
                    } else {
                        let last = list[index - 1];
                        last = [Math.round(ratio * (last[0] - offsets[0] + mins[0])) + 2.5,
                                Math.round(ratio * (last[1] - offsets[1] + mins[1])) + 2.5];
                        let rate = 0.7;
                        if (point[2] === "X") {
                            context.bezierCurveTo(last[0], last[1] * rate + y * (1 - rate),
                                                  last[0] * rate + x * (1 - rate), y,
                                                  x, y);
                        } else if (point[2] === "Y") {
                            context.bezierCurveTo(last[0] * rate + x * (1 - rate), last[1],
                                                  x, last[1] * rate + y * (1 - rate),
                                                  x, y);
                        } else {
                            context.lineTo(x, y);
                        }
                    }
                });
                context.stroke();
            }

        },
        "updateConnections": function (dirties) {

            let svg = this.filler.query("#diagram-arrows");

            let arrows = new Set();
            let arrowMap = Object.create(null);
            for (let arrow of svg.find(".arrow")) {
                arrows.add(arrow);
                let id = $(arrow).attr("connection-id");
                if (id) {
                    arrowMap[id] = arrow;
                }
            }

            let { frames } = this.analyzeLayouts();

            let targets = Object.create(null);

            for (let frame of frames) {
                let wireID = frame["wire-id"];
                if (wireID) {
                    if (!targets[wireID]) {
                        targets[wireID] = [];
                    }
                    targets[wireID].push(frame);
                }
            }

            let offset = {
                "x": -this.viewportLeft,
                "y": -this.viewportTop
            };

            let arrowSize = $.dom.getDevicePixels(4);

            let candidates = [];

            for (let wireID in targets) {
                let add = (index, list) => {
                    if (index + 1 >= list.length) {
                        return;
                    }
                    for (let looper = index + 1; looper < list.length; ++looper) {
                        candidates.push({
                            "id": `equivalent-[${wireID}]-[${[list[index]["wire-code"], list[looper]["wire-code"]].sort().join("]-[")}]`,
                            "from": {
                                "points": list[index].dom.getMagneticPoints("from", offset, "equivalent", undefined, arrowSize),
                                "frame": list[index],
                            },
                            "to": {
                                "points": list[looper].dom.getMagneticPoints("from", offset, "equivalent", undefined, arrowSize),
                                "frame": list[looper]
                            },
                            "type": "equivalent"
                        });
                    }
                    add(index + 1, list);
                };
                add(0, targets[wireID]);
            }

            for (let frame of frames) {
                let targetIDs = frame["target-ids"];
                if (targetIDs) {
                    for (let targetID in targetIDs) {
                        if (targets[targetID]) {
                            for (let target of targets[targetID]) {
                                if (frame.dom !== target.dom) {
                                    for (let dom of targetIDs[targetID]) {
                                        if (!dom.wireCode) {
                                            dom.wireCode = $.uuid();
                                        }
                                        candidates.push({
                                            "id": `related-[${frame["wire-id"]}]-[${target["wire-id"]}]-[${frame["wire-code"]}]-[${dom.wireCode}]`,
                                            "from": {
                                                "points": frame.dom.getMagneticPoints("from", offset, "related", dom, arrowSize),
                                                "frame": frame
                                            },
                                            "to": {
                                                "points": target.dom.getMagneticPoints("to", offset, "related", undefined, arrowSize),
                                                "frame": target
                                            },
                                            "type": "related"
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }

            let reuse = false;
            for (let candidate of candidates) {

                let fromIDs = Object.create(null);
                let toIDs = Object.create(null);

                let arrow = arrowMap[candidate.id];
                if (arrow) {
                    arrows.delete(arrow);
                    let fixeds = {
                        "fixed-from": $(arrow).attr("fixed-from"),
                        "fixed-to": $(arrow).attr("fixed-to")
                    };
                    if (fixeds["fixed-from"]) {
                        let from = candidate.from.points.filter((from) => from.id === fixeds["fixed-from"])[0];
                        if (from) {
                            candidate.from.points = [from];
                        }
                    }
                    if (fixeds["fixed-to"]) {
                        let to = candidate.to.points.filter((to) => to.id === fixeds["fixed-to"])[0];
                        if (to) {
                            candidate.to.points = [to];
                        }
                    }
                    for (let point of candidate.from.points) {
                        fromIDs[point.id] = true;
                    }
                    for (let point of candidate.to.points) {
                        toIDs[point.id] = true;
                    }
                }

                if ((dirties &&
                     ((dirties.indexOf(candidate.from.frame.dom) !== -1) ||
                      (dirties.indexOf(candidate.to.frame.dom) !== -1))) ||
                    (!arrow) ||
                    (arrow.lastFrames.from.left !== candidate.from.frame.left) ||
                    (arrow.lastFrames.from.top !== candidate.from.frame.top) ||
                    (arrow.lastFrames.from.width !== candidate.from.frame.width) ||
                    (arrow.lastFrames.from.height !== candidate.from.frame.height) ||
                    (arrow.lastFrames.to.left !== candidate.to.frame.left) ||
                    (arrow.lastFrames.to.top !== candidate.to.frame.top) ||
                    (arrow.lastFrames.to.width !== candidate.to.frame.width) ||
                    (arrow.lastFrames.to.height !== candidate.to.frame.height) ||
                    (!fromIDs[arrow.lastFrames.from.id]) ||
                    (!toIDs[arrow.lastFrames.to.id])) {

                    let radius = $.dom.getDevicePixels(30);

                    let hit = hasInset(candidate.from.frame, candidate.to.frame, radius);
                    let spaces = hasSpaces(candidate.from.frame, candidate.to.frame, hit, radius);

                    let fromFrame = Object.assign({}, candidate.from.frame);
                    fromFrame.left += offset.x;
                    fromFrame.top += offset.y;

                    let toFrame = Object.assign({}, candidate.to.frame);
                    toFrame.left += offset.x;
                    toFrame.top += offset.y;

                    let bests = [];
                    for (let from of candidate.from.points) {
                        for (let to of candidate.to.points) {
                            let resolved = findPath(from.x, from.y, from.direction,
                                                    to.x, to.y, to.direction,
                                                    fromFrame, toFrame,
                                                    hit, spaces,
                                                    radius, arrowSize);
                            let fromIn = ((candidate.to.frame.left - arrowSize * 2.5 <= from.x - offset.x) &&
                                          (from.x - offset.x <= candidate.to.frame.left + candidate.to.frame.width + arrowSize * 2.5) &&
                                          (candidate.to.frame.top - arrowSize * 2.5 <= from.y - offset.y) &&
                                          (from.y - offset.y <= candidate.to.frame.top + candidate.to.frame.height + arrowSize * 2.5)) ? 1 : 0;
                            let toIn = ((candidate.from.frame.left - arrowSize * 2.5 <= to.x - offset.x) &&
                                        (to.x - offset.x <= candidate.from.frame.left + candidate.from.frame.width + arrowSize * 2.5) &&
                                        (candidate.from.frame.top - arrowSize * 2.5 <= to.y - offset.y) &&
                                        (to.y - offset.y <= candidate.from.frame.top + candidate.from.frame.height + arrowSize * 2.5)) ? 1 : 0;
                            bests.push({
                                "returns": resolved.returns,
                                "length": resolved.length,
                                "from": from,
                                "to": to,
                                "ins": fromIn + toIn,
                                "path": resolved.path });
                        }
                    }
                    bests.sort((a, b) => {
                        let diff = a.ins - b.ins;
                        if (diff !== 0) { return diff; }
                        diff = a.returns - b.returns;
                        if (diff !== 0) { return diff; }
                        return a.length - b.length;
                    });

                    let best = bests[0];

                    let midPoints = best.path;
                    if (arrow && arrow.fixedPoints) {
                        midPoints = arrow.fixedPoints;
                    }

                    let line = [];

                    let fromX = best.from.x;
                    let fromY = best.from.y;

                    let toX = best.to.x;
                    let toY = best.to.y;

                    for (let looper = 0; looper < midPoints.length; ++looper) {
                        let point = midPoints[looper];
                        if (looper === 0) {
                            switch (best.from.direction) {
                                case "top": {
                                    line.push(`M ${point[0] - arrowSize} ${point[1]}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${point[0]} ${point[1] - arrowSize}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${point[0] + arrowSize} ${point[1]}`);
                                    line.push(`M ${point[0]} ${point[1] - arrowSize}`); break;
                                };
                                case "bottom": {
                                    line.push(`M ${point[0] - arrowSize} ${point[1]}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${point[0]} ${point[1] + arrowSize}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${point[0] + arrowSize} ${point[1]}`);
                                    line.push(`M ${point[0]} ${point[1] + arrowSize}`); break;
                                };
                                case "left": {
                                    line.push(`M ${point[0]} ${point[1] - arrowSize}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${point[0] - arrowSize} ${point[1]}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${point[0]} ${point[1] + arrowSize}`);
                                    line.push(`M ${point[0] - arrowSize} ${point[1]}`); break;
                                };
                                case "right": {
                                    line.push(`M ${point[0]} ${point[1] - arrowSize}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${point[0] + arrowSize} ${point[1]}`);
                                    line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${point[0]} ${point[1] + arrowSize}`);
                                    line.push(`M ${point[0] + arrowSize} ${point[1]}`); break;
                                };
                            }
                            ++looper;
                        } else {
                            if ((candidate.type !== "equivalent") || (looper + 1 < midPoints.length)) {
                                let last = midPoints[looper - 1];
                                let c1 = undefined; let c2 = undefined;
                                let rate = 0.7;
                                if (point[2] === "X") {
                                    c1 = [last[0], last[1] * (1 - rate) + point[1] * rate];
                                    c2 = [last[0] * rate + point[0] * (1 - rate), point[1]];
                                } else {
                                    c1 = [last[0] * (1 - rate) + point[0] * rate, last[1]];
                                    c2 = [point[0], last[1] * rate + point[1] * (1 - rate)];
                                }
                                line.push(`C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${point[0]} ${point[1]}`);
                            }
                        }
                    }

                    switch (best.to.direction) {
                        case "top": {
                            if (candidate.type === "equivalent") {
                                line.push(`M ${toX - arrowSize} ${toY}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${toX} ${toY - arrowSize}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${toX + arrowSize} ${toY}`);
                            } else {
                                line.push(`L ${toX - arrowSize * 0.8} ${toY - arrowSize}`);
                                line.push(`M ${toX} ${toY}`);
                                line.push(`L ${toX + arrowSize * 0.8} ${toY - arrowSize}`);
                            }
                            break;
                        };
                        case "bottom": {
                            if (candidate.type === "equivalent") {
                                line.push(`M ${toX - arrowSize} ${toY}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${toX} ${toY + arrowSize}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${toX + arrowSize} ${toY}`);
                            } else {
                                line.push(`L ${toX - arrowSize * 0.8} ${toY + arrowSize}`);
                                line.push(`M ${toX} ${toY}`);
                                line.push(`L ${toX + arrowSize * 0.8} ${toY + arrowSize}`);
                            }
                            break;
                        };
                        case "left": {
                            if (candidate.type === "equivalent") {
                                line.push(`M ${toX} ${toY - arrowSize}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${toX - arrowSize} ${toY}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 0 ${toX} ${toY + arrowSize}`);
                            } else {
                                line.push(`L ${toX - arrowSize} ${toY - arrowSize * 0.8}`);
                                line.push(`M ${toX} ${toY}`);
                                line.push(`L ${toX - arrowSize} ${toY + arrowSize * 0.8}`);
                            }
                            break;
                        };
                        case "right": {
                            if (candidate.type === "equivalent") {
                                line.push(`M ${toX} ${toY - arrowSize}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${toX + arrowSize} ${toY}`);
                                line.push(`A ${arrowSize} ${arrowSize} 0 0 1 ${toX} ${toY + arrowSize}`);
                            } else {
                                line.push(`L ${toX + arrowSize} ${toY - arrowSize * 0.8}`);
                                line.push(`M ${toX} ${toY}`);
                                line.push(`L ${toX + arrowSize} ${toY + arrowSize * 0.8}`);
                            }
                            break;
                        };
                        default: {
                            break;
                        };
                    }

                    if (!arrow) {
                        arrow = $(document.createElementNS("http://www.w3.org/2000/svg", "svg:path")).addClass(`arrow arrow-type-${candidate.type}`)[0];
                        svg.append($(arrow).attr("connection-id", candidate.id));
                    }

                    $(arrow).attr({
                        "d": line.join(" ")
                    });
                    arrow.arrowPath = midPoints;
                    arrow.lastFrames = {
                        "from": {
                            "left": candidate.from.frame.left, "top": candidate.from.frame.top,
                            "width": candidate.from.frame.width, "height": candidate.from.frame.height,
                            "id": best.from.id
                        },
                        "to": {
                            "left": candidate.to.frame.left, "top": candidate.to.frame.top,
                            "width": candidate.to.frame.width, "height": candidate.to.frame.height,
                            "id": best.to.id
                        }
                    };

                }

            }

            for (let arrow of arrows) {
                $(arrow).detach();
            }

        }
    },
    "functors": {
        "updateLayouts": function () {
            this.updateLayouts();
        },
        "devicePixels": function (size) {
            return $.dom.getDevicePixels(size);
        },
        "startDraggingViewport": function (event) {

            if (event.buttons !== 1) {
                return;
            }

            let scrollView = this.filler.query("ui-scroll-view")[0];

            let from = {
                "ratio": this.birdViewRatio,
                "left": scrollView.scrollLeft,
                "top": scrollView.scrollTop,
                "x": event.pageX,
                "y": event.pageY,
            };

            let onmousemove = (event) => {

                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                }

                let offsets = {
                    "x": from.left + $.dom.getDevicePixels(event.pageX - from.x) / from.ratio,
                    "y": from.top + $.dom.getDevicePixels(event.pageY - from.y) / from.ratio
                };
                if (offsets.x + parseFloat($(scrollView).css("width")) >= scrollView.scrollWidth) {
                    offsets.x = scrollView.scrollWidth - parseFloat($(scrollView).css("width"));
                }
                if (offsets.y + parseFloat($(scrollView).css("height")) >= scrollView.scrollHeight) {
                    offsets.y = scrollView.scrollHeight - parseFloat($(scrollView).css("height"));
                }
                if (offsets.x < 0) { offsets.x = 0; }
                if (offsets.y < 0) { offsets.y = 0; }

                scrollView.scrollLeft = offsets.x;
                scrollView.scrollTop = offsets.y;

            };

            let onmouseup = (event) => {

                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                }

            };

            document.body.addEventListener("mousemove", onmousemove);
            document.body.addEventListener("mouseup", onmouseup);

        }
    }
};

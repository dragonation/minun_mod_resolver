module.exports = {
    "attributes": ["caption", "resizable", "wire-id", "actions"],
    "listeners": {
        "onconnected": function () {
            if (this.frame.onFrameConnected) {
                this.frame.onFrameConnected();
            }
        },
        "ondisconnected": function () {
            if (this.frame.onFrameDisconnected) {
                this.frame.onFrameDisconnected();
            }
        }
    },
    "methods": {
        "bringToFirst": function () {
            let parent = $(this).parent()[0];
            if (parent && parent.bringToFirst) {
                parent.bringToFirst(this);
            }
        },
        "loadUI": function (path, extra) {

            let { Frame } = require(`${path}.js`);

            let [css, cssParameters, cssMixins, cssVariants] = $.tmpl.css($.res.load(`${path}.css`), {}, {
                "path": `${path}.css`
            });

            let xhtml = $.res.load(`${path}.xhtml`);
            if (css.trim()) {
                if (typeof xhtml === "string") {
                    xhtml = `<style>${css}</style>${xhtml}`;
                } else {
                    xhtml = xhtml.slice(0);
                    xhtml.unshift({
                        "prefix": "",
                        "name": ["style"],
                        "type": "element",
                        "namespace": $.tmpl.xhtmlNamespaceURI,
                        "attributes": {},
                        "children": [{
                            "type": "text",
                            "content": css
                        }]
                    });
                }
            }

            let parameters = { "tag": this, "name": name };
            if (Frame.parameters) {
                Object.assign(parameters, Frame.parameters);
            }
            if (extra) {
                Object.assign(parameters, extra);
            }

            let functors = {};
            if (Frame.functors) {
                for (let key in Frame.functors) {
                    functors[key] = (function (template, call, parameters, options) {
                        return Frame.functors[key].apply(this.frame, Array.prototype.slice.call(arguments, 4));
                    }).bind(this);
                }
            }

            let filler = $.tmpl(xhtml, parameters, {
                "functors": functors
            });

            filler.render(this.filler.query("#ui-diagram-frame-clients"));

            this.frame = new Frame(this, filler);

        },
        "getTargetIDs": function () {
            if ((!this.frame) || (typeof this.frame.getTargetIDs !== "function")) {
                return null;
            }
            return this.frame.getTargetIDs();
        },
        "getMagneticPoints": function (direction, offset, type, target, arrowSize) {

            if (!arrowSize) {
                arrowSize = 0;
            }
            arrowSize += $.dom.getDevicePixels(2);

            if (this.frame && (typeof this.frame.getMagneticPoints === "function")) {
                return this.frame.getMagneticPoints(direction, offset, type, target);
            }

            let findTarget = (target) => {

                if ((!target) || (!target[0])) {
                    return $(this);
                }

                target = $(target)[0];

                let path = [];
                while ((target !== this) && target && path.length < 20) {
                    path.push(target);
                    if (target.parentNode) {
                        target = target.parentNode;
                    }
                    if (target.host) {
                        target = target.host;
                    }
                }
                path.push(this);
                path.reverse();

                let last = $(this);
                for (let element of path) {
                    let { opacity, display } = $(element).css(["opacity", "display"]);
                    if ((display === "none") || (opacity + "" === "0")) {
                        return last;
                    }
                    last = $(element);
                }

                return last;

            };

            target = findTarget(target)[0];

            let framePosition = $(this).css(["left", "top"]);
            framePosition.left = parseFloat(framePosition.left);
            framePosition.top = parseFloat(framePosition.top);
            let frameRect = this.getClientRects()[0];

            let rect = target.getClientRects()[0];

            const titleBarSize = $.dom.getDevicePixels(20);

            let points = [];
            if (direction === "from") {
                points.push({
                    "size": { "width": frameRect.width, "height": frameRect.height },
                    "x": offset.x + framePosition.left,
                    "y": offset.y + (rect.top + rect.bottom) / 2 - frameRect.top + framePosition.top,
                    "id": "left",
                    "direction": "left"
                });
                points.push({
                    "size": { "width": frameRect.width, "height": frameRect.height },
                    "x": offset.x + framePosition.left + frameRect.width,
                    "y": offset.y + (rect.top + rect.bottom) / 2 - frameRect.top + framePosition.top,
                    "id": "right",
                    "direction": "right"
                });
            } else {
                points.push({
                    "size": { "width": frameRect.width, "height": frameRect.height },
                    "x": offset.x + framePosition.left,
                    "y": offset.y + rect.top + titleBarSize / 2 - frameRect.top + framePosition.top,
                    "id": "left",
                    "direction": "left"
                });
                points.push({
                    "size": { "width": frameRect.width, "height": frameRect.height },
                    "x": offset.x + framePosition.left + frameRect.width,
                    "y": offset.y + rect.top + titleBarSize / 2 - frameRect.top + framePosition.top,
                    "id": "right",
                    "direction": "right"
                });
                points.push({
                    "size": { "width": frameRect.width, "height": frameRect.height },
                    "x": offset.x + (frameRect.left + frameRect.right) / 2 - frameRect.left + framePosition.left,
                    "y": offset.y + rect.top - frameRect.top + framePosition.top,
                    "id": "top",
                    "direction": "top"
                });
                points.push({
                    "size": { "width": frameRect.width, "height": frameRect.height },
                    "x": offset.x + (frameRect.left + frameRect.right) / 2 - frameRect.left + framePosition.left,
                    "y": offset.y + rect.bottom - frameRect.top + framePosition.top,
                    "id": "bottom",
                    "direction": "bottom"
                });
            }

            for (let point of points) {
                if ((point.direction === "top") || (point.direction === "bottom")) {
                    if (point.x > offset.x + framePosition.left + frameRect.width - arrowSize) {
                        point.x = offset.x + framePosition.left + frameRect.width - arrowSize;
                    }
                    if (point.x < offset.x + framePosition.left + arrowSize) {
                        point.x = offset.x + framePosition.left + arrowSize;
                    }
                } else {
                    if (point.x > offset.x + framePosition.left + frameRect.width) {
                        point.x = offset.x + framePosition.left + frameRect.width;
                    }
                    if (point.x < offset.x + framePosition.left) {
                        point.x = offset.x + framePosition.left;
                    }
                }
                if ((point.direction === "left") || (point.direction === "right")) {
                    if (point.y > offset.y + frameRect.bottom - frameRect.top + framePosition.top - arrowSize) {
                        point.y = offset.y + frameRect.bottom - frameRect.top + framePosition.top - arrowSize;
                    }
                    if (direction === "from") {
                        if (point.y < offset.y + titleBarSize + framePosition.top + arrowSize) {
                            point.y = offset.y + titleBarSize + framePosition.top + arrowSize;
                        }
                    } else {
                        if (point.y < offset.y + framePosition.top + arrowSize) {
                            point.y = offset.y + framePosition.top + arrowSize;
                        }
                    }
                } else {
                    if (point.y > offset.y + frameRect.bottom - frameRect.top + framePosition.top) {
                        point.y = offset.y + frameRect.bottom - frameRect.top + framePosition.top;
                    }
                    if (direction === "from") {
                        if (point.y < offset.y + titleBarSize + framePosition.top) {
                            point.y = offset.y + titleBarSize + framePosition.top;
                        }
                    } else {
                        if (point.y < offset.y + framePosition.top) {
                            point.y = offset.y + framePosition.top;
                        }
                    }
                }
            }

            return points;

        }
    },
    "functors": {
        "bringToFirst": function () {
            this.bringToFirst();
        },
        "startDraggingTitleBar": function (event) {

            if (!(event.buttons & 1)) {
                return;
            }

            let offsets = {
                "x": parseFloat($(this).css("left")) - $.dom.getDevicePixels(event.pageX),
                "y": parseFloat($(this).css("top")) - $.dom.getDevicePixels(event.pageY)
            };

            $(this).addClass("acting");

            const onmousemove = (event) => {

                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                    let parent = $(this).parent()[0];
                    if (parent && parent.updateLayouts) {
                        parent.updateLayouts();
                    }
                    $(this).removeClass("acting");
                    return;
                }

                $(this).css({
                    "left": Math.round(offsets.x + $.dom.getDevicePixels(event.pageX)),
                    "top": Math.round(offsets.y + $.dom.getDevicePixels(event.pageY))
                });

                let parent = $(this).parent()[0];
                if (parent && parent.updateLayouts) {
                    parent.updateLayouts();
                }

            };

            const onmouseup = (event) => {
                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                    let parent = $(this).parent()[0];
                    if (parent && parent.updateLayouts) {
                        parent.updateLayouts();
                    }
                    $(this).removeClass("acting");
                }
            };

            document.body.addEventListener("mousemove", onmousemove);
            document.body.addEventListener("mouseup", onmouseup);

        },
        "startResizing": function (event) {

            if (!(event.buttons & 1)) {
                return;
            }

            $(this).addClass("acting");
            let offsets = {
                "x": parseFloat($(this).css("width")) - $.dom.getDevicePixels(event.pageX),
                "y": parseFloat($(this).css("height")) - $.dom.getDevicePixels(event.pageY)
            };

            const onmousemove = (event) => {

                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                    let parent = $(this).parent()[0];
                    if (parent && parent.updateLayouts) {
                        parent.updateLayouts();
                    }
                    $(this).removeClass("acting");
                    return;
                }

                $(this).css({
                    "width": Math.round(offsets.x + $.dom.getDevicePixels(event.pageX)),
                    "height": Math.round(offsets.y + $.dom.getDevicePixels(event.pageY))
                });

                let parent = $(this).parent()[0];
                if (parent && parent.updateLayouts) {
                    parent.updateLayouts();
                }

            };

            const onmouseup = (event) => {
                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                    let parent = $(this).parent()[0];
                    if (parent && parent.updateLayouts) {
                        parent.updateLayouts();
                    }
                    $(this).removeClass("acting");
                }
            };

            document.body.addEventListener("mousemove", onmousemove);
            document.body.addEventListener("mouseup", onmouseup);

        },
        "closeFrame": function () {

            let that = $(this);

            that.addClass("closing");

            let parent = that.parent()[0];
            if (parent && parent.updateLayouts) {
                parent.updateLayouts();
            }

            if (this.frame.onClose) {
                try {
                    this.frame.onClose();
                } catch (error) {
                    console.error(error);
                }
            }

            $.delay(500, () => {
                that.detach();
            });

        },
        "listActions": function () {

            $(this).addClass("acting");

            let actions = [];

            this.filler.query("#ui-diagram-frame-clients").children("ui-diagram-action").each((index, action) => {
                let text = $(action).text();
                if (text) {
                    actions.push({
                        "text": text,
                        "action": () => {
                            $(action).trigger("action");
                        }
                    });
                }
            });

            if (this.frame.listActions) {
                actions = this.frame.listActions(actions);
            }

            let app = $.app(this);

            app.showActionList(actions, this.filler.query("#ui-diagram-frame-action-button")[0], undefined, () => {
                $(this).removeClass("acting");
            });

        }
    }
};

module.exports = {
    "attributes": ["path", "caption", "resizable"],
    "listeners": {
        "onupdated": function (name, value) {

            if (name !== "path") {
                return;
            }

            let path = value;

            let { Dialog } = require(`${path}.js`);

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
            if (Dialog.parameters) {
                Object.assign(parameters, Dialog.parameters);
            }

            let functors = {};
            if (Dialog.functors) {
                for (let key in Dialog.functors) {
                    functors[key] = (function (template, call, parameters, options) {
                        return Dialog.functors[key].apply(this.dialog, Array.prototype.slice.call(arguments, 4));
                    }).bind(this);
                }
            }

            let filler = $.tmpl(xhtml, parameters, {
                "functors": functors
            });

            filler.render(this.filler.query("#ui-dialog-clients"));

            this.dialog = new Dialog(this, filler);

        }
    },
    "methods": {
        "bringToFirst": function () {

            $.app(this).dom.bringViewToFirst(this);

        },
        "activateDialog": function () {

            $.app(this).dom.activateView(this);

        },
        "showDialog": function (noActivate) {

            $.app(this).dom.filler.query("shadow-root").append($(this));

            if (noActivate) {
                this.bringToFirst();
            } else {
                this.activateDialog();
            }

            requestAnimationFrame(() => {
                $(this).removeClass("hidden");
                $.app(this).dom.updateWindows();
            });

        },
        "hideDialog": function () {

            $(this).addClass("hidden");

            $.app(this).dom.activateTopView();

        },
        "closeDialog": function () {

            $(this).addClass("hidden");

            $.app(this).dom.activateTopView();

            if ($(this).attr("just-hide-when-close") !== "yes") {
                $.delay(500, () => {
                    $(this).detach();
                });
            }

        }
    },
    "functors": {
        "activateDialog": function () {
            this.activateDialog();
        },
        "hideOtherOverlays": function () {
            $.app(this).dom.hideOtherOverlays();
        },
        "startDraggingTitleBar": function (event) {

            if (!(event.buttons & 1)) {
                return;
            }

            let offsets = {
                "x": parseFloat($(this).css("left")) - $.dom.getDevicePixels(event.pageX),
                "y": parseFloat($(this).css("top")) - $.dom.getDevicePixels(event.pageY)
            };

            const onmousemove = (event) => {

                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                    return;
                }

                $(this).css({
                    "left": Math.round(offsets.x + $.dom.getDevicePixels(event.pageX)),
                    "top": Math.round(offsets.y + $.dom.getDevicePixels(event.pageY))
                });

            };

            const onmouseup = (event) => {
                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                }
            };

            document.body.addEventListener("mousemove", onmousemove);
            document.body.addEventListener("mouseup", onmouseup);

        },
        "startResizing": function (event) {

            if (!(event.buttons & 1)) {
                return;
            }

            let offsets = {
                "x": parseFloat($(this).css("width")) - $.dom.getDevicePixels(event.pageX),
                "y": parseFloat($(this).css("height")) - $.dom.getDevicePixels(event.pageY)
            };

            const onmousemove = (event) => {

                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                    return;
                }

                $(this).css({
                    "width": Math.round(offsets.x + $.dom.getDevicePixels(event.pageX)),
                    "height": Math.round(offsets.y + $.dom.getDevicePixels(event.pageY))
                });

            };

            const onmouseup = (event) => {
                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                }
            };

            document.body.addEventListener("mousemove", onmousemove);
            document.body.addEventListener("mouseup", onmouseup);

        },
        "closeDialog": function () {

            this.closeDialog();

        }
    }
};


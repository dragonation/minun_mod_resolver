module.exports = {
    "attributes": ["path", "resizable"],
    "listeners": {
        "onconnected": function () {
            $(this).attr("overlay-id", $.uuid());
        },
        "onupdated": function (name, value) {

            if (name !== "path") {
                return;
            }

            let path = value;

            let { Overlay } = require(`${path}.js`);

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
            if (Overlay.parameters) {
                Object.assign(parameters, Overlay.parameters);
            }

            let functors = {};
            if (Overlay.functors) {
                for (let key in Overlay.functors) {
                    functors[key] = (function (template, call, parameters, options) {
                        return Overlay.functors[key].apply(this.overlay, Array.prototype.slice.call(arguments, 4));
                    }).bind(this);
                }
            }

            let filler = $.tmpl(xhtml, parameters, {
                "functors": functors
            });

            filler.render(this.filler.query("#ui-overlay-clients"));

            this.overlay = new Overlay(this, filler);

        }
    },
    "methods": {
        "bringToFirst": function () {

            $.app(this).dom.bringViewToFirst(this);

        },
        "activateOverlay": function () {

            $.app(this).dom.activateView(this);

        },
        "showOverlay": function (noActivate) {

            $.app(this).dom.filler.query("shadow-root").append($(this));

            if (noActivate) {
                this.bringToFirst();
            } else {
                this.activateOverlay();
            }

            requestAnimationFrame(() => {
                $(this).removeClass("hidden");
                $.app(this).dom.updateWindows();
            });

        },
        "hideOverlay": function () {

            $(this).addClass("hidden");

            $.app(this).dom.activateTopView();

        },
        "closeOverlay": function () {

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
        "activateOverlay": function () {

            this.activateOverlay();

        },
        "hideOtherOverlays": function () {

            $.app(this).dom.hideOtherOverlays(this);

        },
        "startResizing": function (event) {

            if (!(event.buttons & 1)) {
                return;
            }

            let offsets = {
                "x": parseFloat($(this).css("width")) - event.pageX,
                "y": parseFloat($(this).css("height")) - event.pageY
            };

            const onmousemove = (event) => {

                if (!(event.buttons & 1)) {
                    document.body.removeEventListener("mousemove", onmousemove);
                    document.body.removeEventListener("mouseup", onmouseup);
                    return;
                }

                $(this).css({
                    "width": Math.round(offsets.x + event.pageX),
                    "height": Math.round(offsets.y + event.pageY)
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
        "closeOverlay": function () {

            this.closeOverlay();

        }
    }
};

module.exports = {
    "attributes": ["path", "resizable"],
    "listeners": {
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
            let parent = $(this).parent()[0];
            if (parent && parent.bringToFirst) {
                parent.bringToFirst(this);
            }
        },
        "showOverlay": function () {

            $("ui-workshop").append($(this));

            requestAnimationFrame(() => {
                $(this).removeClass("hidden");
            });

        },
        "hideOverlay": function () {

            $(this).addClass("hidden");

        },
        "closeOverlay": function () {

            $(this).addClass("hidden");

            if ($(this).attr("just-hide-when-close") !== "yes") {
                $.delay(500, () => {
                    $(this).detach();
                });
            }

        }
    },
    "functors": {
        "bringToFirst": function () {

            this.bringToFirst();

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
        "closeOverlay": function () {

            this.closeOverlay();

        }
    }
};

$.ui.overlay = function (path, options) {

    if (!options) { options = {}; }

    let getNumber = (key, defaultValue) => {
        let value = parseInt(options[key]);
        if (isFinite(value)) {
            value = Math.max(0, value);
        } else {
            value = defaultValue;
        }
        return value;
    };

    let width = getNumber("width", 600);
    let height = getNumber("height", 400);
    let left = getNumber("left");
    if (typeof left !== "number") {
        left = Math.round((parseInt($("body").css("width")) - width) / 2);
    }
    let top = getNumber("top");
    if (typeof top !== "number") {
        top = Math.round((parseInt($("body").css("height")) - height) / 2.5);
    }

    let dom = $("<ui-overlay>").css({
        "left": `${left}px`,
        "top": `${top}px`,
        "width": `${width}px`,
        "height": `${height}px`
    }).attr({
        "path": path,
        "resizable": options.resizable ? "yes" : "no",
        "just-hide-when-close": options.justHideWhenClose ? "yes" : "no"
    }).addClass("hidden");

    return dom[0].overlay;

};

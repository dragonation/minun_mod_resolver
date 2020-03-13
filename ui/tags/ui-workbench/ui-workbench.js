module.exports = {
    "attributes": [ "path" ],
    "listeners": {
        "onupdated": function (name, value) {

            if (name !== "path") {
                return;
            }

            let path = value;

            let { Workbench } = require(`${path}.js`);

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
            if (Workbench.parameters) {
                Object.assign(parameters, Workbench.parameters);
            }
            let functors = {};
            if (Workbench.functors) {
                for (let key in Workbench.functors) {
                    functors[key] = (function (template, call, parameters, options) {
                        return Workbench.functors[key].apply(this.workbench, Array.prototype.slice.call(arguments, 4));
                    }).bind(this);
                }
            }

            let filler = $.tmpl(xhtml, parameters, {
                "functors": functors
            });

            filler.render(this.filler.query("#ui-workbench-container"));

            this.workbench = new Workbench(this, filler);

        }
    },
    "methods": {
        "bringToFirst": function () {

            $.app(this).dom.bringViewToFirst(this);

        },
        "activateWorkbench": function () {

            $.app(this).dom.activateView(this);

        },
        "showWorkbench": function (noActivate) {

            $.app(this).dom.filler.query("shadow-root").append($(this));

            if (noActivate) {
                this.bringToFirst();
            } else {
                this.activateWorkbench();
            }

            requestAnimationFrame(() => {
                $(this).removeClass("hidden");
                $.app(this).dom.updateWindows();
            });

        },
        "hideWorkbench": function () {

            $(this).addClass("hidden");

            $.app(this).dom.activateTopView();

        },
        "closeWorkbench": function () {

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
        "activateWorkbench": function () {
            this.activateWorkbench();
        },
        "hideOtherOverlays": function () {
            $.app(this).dom.hideOtherOverlays();
        },
        "closeWorkbench": function () {
            this.closeWorkbench();
        }
    }
};

$.ui.workbench = function (path, options) {

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

    let dom = $("<ui-workbench>").attr({
        "path": path,
        "just-hide-when-close": options.justHideWhenClose ? "yes" : "no"
    }).addClass("hidden");

    return dom[0].workbench;

};

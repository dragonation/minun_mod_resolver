let apps = Object.create(null);

module.exports = {
    "attributes": [],
    "listeners": {
        "onconnected": function () {

            let name = $(this).attr("name");

            if (apps[name]) {
                throw new Error(`App[${name}] already opened`);
            }

            let { App } = require(`/~${name}/scripts/app.js`);

            let [css, cssParameters, cssMixins, cssVariants] = $.tmpl.css($.res.load(`/~${name}/styles/app.css`), {}, {
                "path": `/~${name}/styles/app.css`
            });

            let xhtml = $.res.load(`/~${name}/app.xhtml`);
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
            if (App.functors) {
                for (let key in App.functors) {
                    functors[key] = (function (template, call, parameters, options) {
                        return App.functors[key].apply(this.app, Array.prototype.slice.call(arguments, 4));
                    }).bind(this);
                }
            }

            let filler = $.tmpl(xhtml, parameters, {
                "functors": functors
            });

            filler.render(this.filler.query("shadow-root"));

            this.app = new App(this, filler);

            apps[name] = this.app;

        }
    },
    "methods": {},
    "functors": {}
};

$.app = function (name) {

    return apps[name];

};

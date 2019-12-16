let registeredTags = Object.create(null);
registeredTags["shadow-root"] = true;

let tagTemplates = Object.create(null);

$.dom.registerTag = function (names, attributes, listeners, methods, properties, template, options) {

    let className = null;
    let name = names;
    if (Array.isArray(names)) {
        name = names[0];
        className = names[1];
    } else {
        className = "Custom" + name.split("-").map((name) => name[0].toUpperCase() + name.slice(1)).join("") + "Element";
    }

    if (registeredTags[name]) {
        throw new Error(`Tag[${name}] already registered`);
    }

    if (!attributes) { attributes = []; }
    if (!listeners) { listeners = {}; }
    if (!methods) { methods = {}; }
    if (!properties) { properties = {}; }

    registeredTags[name] = true;

    let shadowed = null;
    if (typeof template === "string") {
        if (template.trim()) {
            shadowed = `<shadow-root id="${name}">${template}</shadow-root>`;
        }
    } else {
        if (template.length > 0) {
            shadowed = [{
                "prefix": "",
                "name": ["shadow-root"],
                "type": "element",
                "namespace": $.tmpl.xhtmlNamespaceURI,
                "attributes": {
                    "": {
                        "id": {
                            "content": name,
                            "name": ["id"],
                            "namespace": "",
                            "prefix": "",
                            "template": null
                        }
                    }
                },
                "children": template
            }];
        }
    }

    let factory = null;
    if (shadowed) {
        factory = $.tmpl.factory(shadowed, options);
    }

    const elementClass = class QueryCustomElement extends HTMLElement {

        static get observedAttributes() {
            return attributes;
        }

        constructor() {

            super();

            this.parameters = {
                "tag": this,
                "attributes": {}
            };

            if (factory) {
                let shadow = $(this.attachShadow({ "mode": "open" }));
                let filler = factory.produce(this.parameters);
                this.filler = filler;
                filler.render(shadow);
            }

            if (listeners.oncreated) {
                listeners.oncreated.call(this);
            }

        }

        connectedCallback() {
            if (listeners.onconnected) {
                listeners.onconnected.call(this);
            }
        }

        disconnectedCallback() {
            if (listeners.ondisconnected) {
                listeners.ondisconnected.call(this);
            }
        }

        adoptedCallback() {
            if (listeners.onadopted) {
                listeners.onadopted.call(this);
            }
        }

        attributeChangedCallback(name, last, value) {

            this.parameters.attributes[name] = value;
            if (listeners.onupdated) {
                listeners.onupdated.call(this, name, value, this.parameters);
            }

            this.filler.fill(this.parameters);

        }

    };

    if (methods) {
        Object.keys(methods).forEach((key) => {
            elementClass.prototype[key] = methods[key];
        });
    }

    if (properties) {
        Object.keys(properties).forEach((key) => {
            Object.defineProperty(elementClass.prototype, key, {
                "enumerable": true,
                "get": properties[key].get,
                "set": properties[key].set
            });
        });
    }

    global.customElements.define(name, elementClass);

    Object.defineProperty(elementClass, "name", {
        "value": className
    });

    return elementClass;

};

$.dom.registerTagTemplate = function (prefix, template) {
    tagTemplates[prefix] = template;
};

$.dom.autoregisterTag = function (name) {

    if (registeredTags[name]) {
        return;
    }

    if (name.indexOf("-") === -1) {
        return;
    }

    let template = tagTemplates[name.split("-")[0]];
    if (!template) {
        template = tagTemplates[""];
    }

    if (!template) {
        return;
    }

    let base = $.format(template, { "tag": name });
    if (base[0] === "/") {
        base = require.root + base;
    } else {
        base = require.root + "/" + base;
    }

    let [css, cssParameters, cssMixins, cssVariants] = $.tmpl.css($.res.load(base + ".css"), {}, {
        "path": base + ".css"
    });

    let xhtml = $.res.load(base + ".xhtml");
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

    let codes = require(base + ".js");

    let functors = {};
    if (codes.functors) {
        for (let key in codes.functors) {
            functors[key] = function (template, call, parameters, options) {
                let calls = Array.prototype.slice.call(arguments, 4);
                return codes.functors[key].apply(parameters.tag, calls);
            };
        }
    }

    $.dom.registerTag(name,
        codes.attributes, codes.listeners, codes.methods, codes.properties,
        xhtml, {
            "path": base + ".xhtml",
            "functors": functors,
            "cssParameters": cssParameters,
            "cssMixins": cssMixins,
            "cssVariants": cssVariants,
        });

};

(() => {

    const defaultFunctors = {};

    const compileFormatTemplate = function (template, options, caches) {
        if ($.format.parsers[options.textParser].containsTemplate(template)) {
            if (!caches[template]) {
                caches[template] = $.format.parsers[options.textParser].compileTemplate(template, options);
            }
            return caches[template];
        } else {
            return null;
        }
    };

    const createPlaceholderNode = function () {
        return $(document.createTextNode(""));
    };

    const createDocumentFragment = function () {
        return $(document.createDocumentFragment());
    };

    const escapeTemplateXML = function (content, options) {

        let template = $.format.parsers[options.textParser].compileTemplate(content, options);

        let escaped = template.map((unit) => {
            if (unit.type === "text") {
                // TODO: support cdata and comment
                return $.dom.replaceHTMLEntityForXML(unit.text).replace(/>([\s]+)</g, "><");
            } else if (unit.type === "call") {
                return unit.code.replace(/[&<>"]/g, (character) => {
                    switch (character) {
                        case "<": return "&lt;";
                        case ">": return "&gt;";
                        case "\"": return "&quot;";
                        case "&": return "&amp;";
                    }
                });
            }
        }).join("");

        return escaped;

    };

    const generateAttributesGetter = function (keys, node, defaults, parameters, options, caches) {

        let getters = [];

        for (let key of keys) {

            let namespace = "";
            let name = key;
            let target = key;
            if (key instanceof Array) {
                namespace = key[0];
                name = key[1];
                target = (key.length > 2) ? key[1] : key[2];
            }

            if ((name[0] === "+") || (name[0] === "-")) {
                name = name.slice(1);
            }

            if ((target[0] === "+") || (target[0] === "-")) {
                target = target.slice(1);
            }

            if (node.attributes[namespace] && node.attributes[namespace][name]) {
                let attribute = node.attributes[namespace][name];
                if (key[0] === "-") {

                    // only text attribute, no template
                    if (attribute.template) {
                        let text = attribute.content.slice(2, -1);
                        if (text.indexOf("}") !== -1) {
                            throw new Error("Invalid text attribute: " + attribute.content);
                        }
                        getters.push((result, parameters) => {
                            result[target] = text;
                        });
                    } else {
                        getters.push((result, parameters) => {
                            result[target] = attribute.content;
                        });
                    }

                } else if (key[0] === "+") {

                    // strict template, which does not generate only text, but any value
                    if (!attribute.template) {
                        let content = "${" + attribute.content + "}";
                        attribute.content = content;
                        if (!caches[content]) {
                            caches[content] = $.format.parsers[options.textParser].compileTemplate(content, options);
                        }
                        attribute.template = caches[content];
                    }

                    if (attribute.template.parts.length !== 1) {
                        throw new Error("Invalid strict attribute template: " + attribute.content);
                    }

                    getters.push((result, parameters) => {
                        result[target] = $.format.tmpl(attribute.template.parts[0].call, parameters, options);
                    });

                } else {

                    // non-strict template, which only generate text

                    if (attribute.template) {
                        getters.push((result, parameters) => {
                            result[target] = $.format.parsers[options.textParser].parseTemplate(attribute.template, parameters, options);
                        });
                    } else {
                        getters.push((result, paramaters) => {
                            result[target] = attribute.content;
                        });
                    }

                }

            } else {
                getters.push((result, parameters) => {
                    result[target] = defaults[target];
                });
            }

        }

        return function (parameters) {

            let result = Object.create(null);

            for (let getter of getters) {
                getter(result, parameters);
            }

            return result;

        };

    };

    const combineUpdaters = function (query, updaters) {

        return function (parameters, animations, actions) {
            for (let updater of updaters) {
                updater(parameters, animations, actions);
            }
        };

    };

    const XHTMLFiller = function XHTMLFiller(factory, parameters) {

        const filler = this;

        this.factory = factory;

        this.beginning = createPlaceholderNode();
        this.ending = createPlaceholderNode();

        this.fragment = createDocumentFragment();

        this.fragment.append(this.beginning, this.ending);

        this.parameters = Object.assign({}, parameters, {
            "css": this.factory.options.cssVariants
        });
        parameters = this.parameters;

        this.updaters = [];

        let actions = [];

        for (let template of this.factory.template) {
            let nodes = filler.convertNode(
                template, parameters, filler.factory.options,
                null, filler.updaters, actions, filler.factory.caches);
            if (nodes) {
                $.tmpl.insert(nodes, filler.ending);
            }
        }

        for (let action of actions) {
            action();
        }

    };

    XHTMLFiller.prototype.update = function () {

        let filler = this;

        let parameters = this.parameters;

        let actions = [];
        let animations = [];

        for (let updater of filler.updaters) {
            updater(parameters, animations, actions);
        }

        for (let action of actions) {
            action();
        }

    };

    XHTMLFiller.prototype.fill = function (parameters) {

        let newParameters = Object.assign({}, this.parameters, parameters);

        this.parameters = newParameters;

        return this.update();

    };

    XHTMLFiller.prototype.render = function (container) {

        let filler = this;

        this.container = container;

        if (container) {
            if (container[0] !== filler.beginning.parent()[0]) {
                for (let node of filler.getAllNodes()) {
                    container[0].appendChild(node);
                }
            }
        } else {
            if (this.fragment[0] !== filler.beginning.parent()[0]) {
                for (let node of filler.getAllNodes()) {
                    this.fragment[0].appendChild(node);
                }
            }
        }

    };

    XHTMLFiller.prototype.query = function (selector) {

        let result = [];

        for (let node of this.getAllNodes()) {
            node = $(node);
            if (node[0].nodeType === Node.ELEMENT_NODE) {
                if (node[0].matches(selector)) {
                    result.push(node[0]);
                }
                for (let child of node.find(selector)) {
                    if (result.indexOf(child) === -1) {
                        result.push(child);
                    }
                }
            }
        }

        return $(result);

    };

    XHTMLFiller.prototype.getAllNodes = function () {
        return $.between(this.beginning, this.ending, true);
    };

    XHTMLFiller.prototype.convertNode = function (template, parameters, options, animations, updaters, actions, caches) {

        if ($.tmpl.node[template.type]) {
            return $.tmpl.node[template.type](this, template, parameters, options, animations, updaters, actions, caches);
        } else {
            throw new Error("Convertor not found");
        }

    };

    const XHTMLTemplate = function XHTMLTemplate(xhtml, options) {

        let start = Date.now();

        if (!options) {
            options = {};
        }

        if (options.path && (options.path[0] === "/")) {
            options.path = require.root + options.path;
        }

        if (!options.textParser) {
            options.textParser = "text/plain";
        }

        if (options.functors) {
            options.functors = Object.assign({}, defaultFunctors, options.functors);
        } else {
            options.functors = Object.assign({}, defaultFunctors);
        }

        this.options = options;

        this.caches = Object.create(null);

        this.template = [];

        if (typeof xhtml === "string") {
            let predefinedNamespaces = {};
            if (options.predefinedNamespaces) {
                Object.assign(predefinedNamespaces, options.predefinedNamespaces);
            }
            $.dom.parseXHTML(xhtml, {
                "functors": options.functors,
                "templateEscaping": true,
                "textParser": options.textParser,
                "predefinedNamespaces": predefinedNamespaces
            }).forEach((node) => {
                this.template.push(node);
            });
        } else {
            xhtml.forEach((node) => {
                this.template.push(node);
            });
        }

        var recordParent = (node) => {
            if (node.name && (node.name.indexOf("-") !== -1)) {
                $.dom.autoregisterTag(node.name);
            }
            if (node.children) {
                let looper = 0;
                while (looper < node.children.length) {
                    node.children[looper].parent = node;
                    recordParent(node.children[looper]);
                    ++looper;
                }
            }
        };

        this.template.forEach(recordParent);

    };

    XHTMLTemplate.prototype.produce = function (parameters) {

        return new XHTMLFiller(this, parameters);

    };

    XHTMLTemplate.create = function (xhtml, options) {

        return new XHTMLTemplate(xhtml, options);
    };

    $.tmpl = function (xhtml, parameters, options) {

        return $.tmpl.factory(xhtml, options).produce(parameters);

    };

    $.tmpl.factory = XHTMLTemplate.create;

    $.tmpl.escapeXML = escapeTemplateXML;

    $.tmpl.placeholder = createPlaceholderNode;
    $.tmpl.fragment = createDocumentFragment;

    $.tmpl.getter = generateAttributesGetter;
    $.tmpl.combine = combineUpdaters;

    $.tmpl.namespaceURI = "http://mewchan.com/proj/query/ui/template";
    $.tmpl.eventNamespaceURI = "http://mewchan.com/proj/query/ui/template-event";
    $.tmpl.propertyNamespaceURI = "http://mewchan.com/proj/query/ui/template-property";
    $.tmpl.styleNamespaceURI = "http://mewchan.com/proj/query/ui/template-style";
    $.tmpl.classNamespaceURI = "http://mewchan.com/proj/query/ui/template-class";

    $.tmpl.xhtmlNamespaceURI = "http://www.w3.org/1999/xhtml";

    $.tmpl.node = Object.create(null);

    $.tmpl.insert = function (nodes, before) {
        let parent = before[0].parentNode;
        for (let node of nodes) {
            parent.insertBefore(node, before[0]);
        }
    };

    $.tmpl.node.element = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        let namespace = node.namespace;
        if (!namespace) {
            namespace = "";
        }

        if ($.tmpl.tag[namespace] &&
            $.tmpl.tag[namespace][node.name]) {
            return $.tmpl.tag[node.namespace][node.name](
                instance, node, parameters, options, animations, updaters, actions, caches);
        }

        if ($.tmpl.tag[namespace] &&
            $.tmpl.tag[namespace]["*"]) {
            return $.tmpl.tag[node.namespace]["*"](
                instance, node, parameters, options, animations, updaters, actions, caches);
        }

        if ($.tmpl.tag["*"][node.name]) {
            return $.tmpl.tag["*"][node.name](
                instance, node, parameters, options, animations, updaters, actions, caches);
        }

        return $.tmpl.tag["*"]["*"](
                instance, node, parameters, options, animations, updaters, actions, caches);

    };

    $.tmpl.node.element.attribute = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        let elementNamespace = element.namespaceURI;
        if (!elementNamespace) {
            elementNamespace = "";
        }

        let namespace = attribute.namespace;
        if (!namespace) {
            namespace = "";
        }

        if ($.tmpl.attribute[elementNamespace]) {

            if ($.tmpl.attribute[elementNamespace][namespace] &&
                $.tmpl.attribute[elementNamespace][namespace][attribute.name]) {
                return $.tmpl.attribute[elementNamespace][namespace][attribute.name](
                    element, attribute, parameters, options, animations, updaters, actions, caches);
            }

            if ($.tmpl.attribute[elementNamespace][namespace] &&
                $.tmpl.attribute[elementNamespace][namespace]["*"]) {
                return $.tmpl.attribute[elementNamespace][namespace]["*"](
                    element, attribute, parameters, options, animations, updaters, actions, caches);
            }

        }

        if ($.tmpl.attribute["*"][namespace] &&
            $.tmpl.attribute["*"][namespace][attribute.name]) {
            return $.tmpl.attribute["*"][namespace][attribute.name](
                element, attribute, parameters, options, animations, updaters, actions, caches);
        }
        if ($.tmpl.attribute["*"][namespace] &&
            $.tmpl.attribute["*"][namespace]["*"]) {
            return $.tmpl.attribute["*"][namespace]["*"](
                element, attribute, parameters, options, animations, updaters, actions, caches);
        }

        if ($.tmpl.attribute[elementNamespace] &&
            $.tmpl.attribute[elementNamespace]["*"] &&
            $.tmpl.attribute[elementNamespace]["*"][attribute.name]) {
            return $.tmpl.attribute[elementNamespace]["*"][attribute.name](
                element, attribute, parameters, options, animations, updaters, actions, caches);
        }

        if ($.tmpl.attribute[elementNamespace] &&
            $.tmpl.attribute[elementNamespace]["*"] &&
            $.tmpl.attribute[elementNamespace]["*"]["*"]) {
            return $.tmpl.attribute[elementNamespace]["*"]["*"](
                element, attribute, parameters, options, animations, updaters, actions, caches);
        }

        if ($.tmpl.attribute["*"]["*"][attribute.name]) {
            return $.tmpl.attribute["*"]["*"][attribute.name](
                element, attribute, parameters, options, animations, updaters, actions, caches);
        }

        return $.tmpl.attribute["*"]["*"]["*"](
                element, attribute, parameters, options, animations, updaters, actions, caches);

    };

    $.tmpl.node.text = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        if (!node.template) {
            return $(document.createTextNode(node.content));
        }

        let textNode = document.createTextNode("");
        let lastValue = null;
        let dependencies = $.format.tmpl.deps(node.template.call, options, []);
        let updater = function (parameters, animations, actions) {
            if (!$.format.tmpl.deps.changed(dependencies, parameters, options)) {
                return;
            }
            let value = $.format.parsers[options.textParser].parseTemplate({
                "template": node.content,
                "parser": options.textParser,
                "parts": [node.template]
            }, parameters, options);
            if (lastValue !== value) {
                actions.push(function () {
                    lastValue = value;
                    textNode.nodeValue = value;
                });
            }
        };

        updaters.push(updater);

        updater(parameters, animations, actions);

        return $(textNode);

    };

    $.tmpl.node.comment = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        if (!node.template) {
            return $(document.createComment(node.content));
        }

        let textNode = document.createComment("");
        let lastValue = null;
        let dependencies = $.format.tmpl.deps(node.template.call, options, []);
        let updater = function (parameters, animations, actions) {
            if (!$.format.tmpl.deps.changed(dependencies, parameters, options)) {
                return;
            }
            let value = $.format.parsers[options.textParser].parseTemplate(node.template, parameters, options);
            if (lastValue !== value) {
                lastValue = value;
                textNode.nodeValue = value;
            }
        };
        updaters.push(updater);

        updater(parameters, animations, actions);

        return $(textNode);

    };

    $.tmpl.deps = function (attribute, options, dependencies) {
        if (!dependencies) {
            dependencies = [];
            let looper = 0;
            while (looper < attribute.template.parts.length) {
                if (attribute.template.parts[looper].type === "call") {
                    dependencies = $.format.tmpl.deps(attribute.template.parts[looper].call, options, dependencies);
                }
                ++looper;
            }
        }
        return dependencies
    };

    $.tmpl.attribute = Object.create(null);

    $.tmpl.attribute["*"] = Object.create(null);

    $.tmpl.attribute["*"][""] = Object.create(null);

    $.tmpl.attribute["*"]["*"] = Object.create(null);

    $.tmpl.attribute["*"]["*"]["*"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        let name = attribute.name;
        if (attribute.prefix) {
            name = attribute.prefix + ":" + attribute.name;
        }

        if (attribute.template) {
            let lastValue = null;
            var dependencies = null;
            let updater = function (parameters, animations, actions) {
                dependencies = $.tmpl.deps(attribute, options, dependencies);
                if (!$.format.tmpl.deps.changed(dependencies, parameters, options)) {
                    return;
                }
                let value = $.format.parsers[options.textParser].parseTemplate(attribute.template, parameters, options);
                if (lastValue !== value) {
                    var lastValue2 = lastValue;
                    lastValue = value;
                    actions.push(function () {
                        if (attribute.namespace) {
                            let lastNodeValue = element.getAttributeNS(attribute.namespace, name);
                            if (lastNodeValue !== value) {
                                element.setAttributeNS(attribute.namespace, name, value);
                            }
                        } else {
                            let lastNodeValue = element.getAttribute(name);
                            if (lastNodeValue !== value) {
                                element.setAttribute(name, value);
                            }
                        }
                    });
                }
            };
            updaters.push(updater);
            return updater(parameters, animations, actions);
        } else {
            if (attribute.namespace) {
                element.setAttributeNS(attribute.namespace, name, attribute.content);
            } else {
                element.setAttribute(name, attribute.content);
            }
        }

    };

    $.tmpl.tag = Object.create(null);

    $.tmpl.tag[""] = Object.create(null);

    $.tmpl.tag["*"] = Object.create(null);

    $.tmpl.tag["*"]["*"] = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        let fragment = $.tmpl.fragment();

        let beginning = $.tmpl.placeholder();
        let ending = $.tmpl.placeholder();

        fragment.append(beginning, ending);

        let elementUpdaters = [];

        let element = null;
        if ((node.namespace === $.tmpl.xhtmlNamespaceURI) && (!node.prefix)) {
            element = document.createElement(node.name);
        } else {
            if (node.prefix) {
                element = document.createElementNS(node.namespace, node.prefix + ":" + node.name);
            } else {
                element = document.createElementNS(node.namespace, node.name);
            }
        }

        let query = $(element);

        for (let namespace in node.attributes) {
            for (let name in node.attributes[namespace]) {
                $.tmpl.node.element.attribute(element, node.attributes[namespace][name], parameters, options, animations, elementUpdaters, actions, caches);
            }
        }

        for (let child of node.children) {
            let nodes = instance.convertNode(child, parameters, options, animations, elementUpdaters, actions, caches);
            if (nodes) {
                let looper = 0;
                while (looper < nodes.length) {
                    element.appendChild(nodes[looper]);
                    ++looper;
                }
            }
        }

        if (elementUpdaters.length > 0) {
            updaters.push(combineUpdaters(query, elementUpdaters));
        }

        actions.push(() => {
            $.tmpl.insert($(element), ending);
        });

        return $([beginning[0], ending[0]]);

    };

    $.tmpl.tag[$.tmpl.namespaceURI] = Object.create(null);

    $.tmpl.tag[$.tmpl.namespaceURI]["about"] = function (instance, node, parameters, options, animations, updaters, actions, caches) {
        return $(document.createTextNode("Template 3.0, Copyright 2011 - 2018, Powered by mewchan.com"));
    };

})();

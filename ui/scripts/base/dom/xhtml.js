const compile = function (template, options, caches) {
    if (template.indexOf("${") !== -1) {
        if (caches[template]) {
            return caches[template];
        } else {
            let result = null;
            try {
                caches[template] = $.format.parsers[options.textParser].compileTemplate(template, {}, options);
                result = caches[template];
            } catch (error) {
                if (!result) {
                    throw error;
                }
            }
            return result;
        }
    } else {
        return null;
    }
};

const xhtml = function (node, options, caches, namespaces) {

    if (typeof node === "string") {

        let content = node;

        let template = compile(content, options, caches);
        if (template) {
            return template.parts.map((unit) => {
                if (unit.type === "text") {
                    return {
                        "type": "text",
                        "content": unit.content
                    };
                } else {
                    return {
                        "type": "text",
                        "content": unit.code,
                        "template": unit
                    }
                }
            });
        } else {
            return {
                "type": "text",
                "content": content
            };
        }
    } else {

        let looper = 0;

        // attributes
        let attributes = Object.create(null);
        let attributeNodes = node.attributes;
        Object.keys(node.attributes).forEach((keys) => {

            let namespace = "";

            let key = [];
            if (keys[0] === "@") {

                namespace = "http://mewchan.com/proj/query/ui/template-event";
                key = ["event", keys.slice(1)];

            } else {
                key = keys.split(":");
                if (key.length === 1) {
                    key = ["", key];
                }
                if (key[0]) {
                    namespace = namespaces[key[0]];
                    if (key[0] === "xmlns") {
                        namespace = "http://www.w3.org/2000/xmlns/";
                    }
                }
                if (!namespace) {
                    namespace = "";
                }
            }

            if (namespace === "http://www.w3.org/2000/xmlns/") {
                namespaces[key[1]] = node.attributes[keys];
            } else {
                if (!attributes[namespace]) {
                    attributes[namespace] = {};
                }
                let value = node.attributes[keys];
                attributes[namespace][key[1]] = {
                    "namespace": namespace,
                    "name": key[1],
                    "prefix": key[0],
                    "content": value,
                    "template": compile(value, options, caches)
                };
            }

        });

        // children
        let children = [];
        looper = 0;
        while (looper < node.children.length) {
            let node2 = node.children[looper];
            let child = xhtml(node2, options, caches, namespaces);
            if (Array.isArray(child)) {
                child.forEach(child => children.push(child));
            } else if (child) {
                children.push(child);
            }
            ++looper;
        }

        var name = node.name.split(":");
        if (name.length === 1) {
            name = ["", name[0]];
        }

        var namespace = namespaces[name[0]];
        if (!namespace) {
            namespace = undefined;
        }

        let result = {
            "prefix": name[0],
            "name": name[1],
            "type": "element",
            "namespace": namespace,
            "attributes": attributes,
            "children": children
        };

        return result;

    }

};

$.dom.parseXHTML = function (content, options) {

    let nodes = [];

    if (!options) { options = {}; }
    options = Object.assign({}, options);
    if (!options.textParser) {
        options.textParser = "text/plain";
    }

    let prefinedNamespaces = {
        "": $.tmpl.xhtmlNamespaceURI,
        "tmpl": $.tmpl.namespaceURI,
        "event": $.tmpl.eventNamespaceURI,
        "prop": $.tmpl.propertyNamespaceURI,
        "style": $.tmpl.styleNamespaceURI,
        "class": $.tmpl.classNamespaceURI,
    };
    if (options.prefinedNamespaces) {
        Object.assign(prefinedNamespaces, options.prefinedNamespaces);
    }

    $.dom.parseXML(content).forEach((node) => {
        let child = xhtml(node, options, Object.create(null), prefinedNamespaces);
        if (Array.isArray(child)) {
            child.forEach(child => nodes.push(child));
        } else if (child) {
            nodes.push(child);
        }

    });

    return nodes;

};

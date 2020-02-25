(() => {

    const path = require("path");

    const titleNamespaceURI = "http://mewchan.com/proj/query/ui/title";

    $.tmpl.attribute[$.tmpl.xhtmlNamespaceURI] = Object.create(null);

    $.tmpl.attribute[$.tmpl.xhtmlNamespaceURI][""] = Object.create(null);

    $.tmpl.attribute[$.tmpl.xhtmlNamespaceURI][""]["style"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        if (attribute.template) {
            let lastValue = null;
            let lastProperties = {};
            var dependencies = null;
            let updater = function (parameters, animations, actions) {
                dependencies = $.tmpl.deps(attribute, options, dependencies);
                if (!$.format.tmpl.deps.changed(dependencies, parameters, options)) {
                    return;
                }
                let value = $.format.parsers[options.textParser].parseTemplate(attribute.template, parameters, options);
                if (lastValue !== value) {
                    let lastValue2 = lastValue;
                    lastValue = value;
                    let properties = $.tmpl.css.style(value, options.cssParameters, options.cssMixins, {});
                    lastProperties = properties;
                    actions.push(function () {

                        let currentValues = Object.create(null);
                        let looper = 0;
                        while (looper < element.style.length) {
                            currentValues[element.style[looper]] = element.style[element.style[looper]];
                            ++looper;
                        }

                        let deletedKeys = Object.keys(lastProperties);
                        let keys = Object.keys(properties);
                        looper = 0;
                        while (looper < keys.length) {
                            let key = keys[looper];
                            let index = deletedKeys.indexOf(key);
                            if (index !== -1) {
                                deletedKeys.splice(index, 1);
                            }
                            currentValues[key] = properties[key];
                            ++looper;
                        }

                        looper = 0;
                        while (looper < deletedKeys.length) {
                            delete currentValues[deletedKeys[looper]];
                        }

                        let style = Object.keys(currentValues).map((key) => key + ": " + currentValues[key]).join("; ");

                        element.setAttribute("style", style);

                    });
                }
            };
            updaters.push(updater);
            updater(parameters, animations, actions);
        } else {
            let value = attribute.content;
            let properties = $.tmpl.css.style(value, options.cssParameters, options.cssMixins, {});
            let style = Object.keys(properties).map((key) => key + ": " + properties[key]).join("; ");
            element.setAttribute("style", style);
        }

    };

    $.tmpl.attribute[$.tmpl.xhtmlNamespaceURI][""]["class"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        if (attribute.template) {
            let lastValue = null;
            var dependencies = null;
            let updater = function (parameters, animations, actions) {
                dependencies = $.tmpl.deps(attribute, options, dependencies);
                if (!$.format.tmpl.deps.changed(dependencies, parameters, options)) {
                    return;
                }
                let value = $.format.parsers[options.textParser].parseTemplate(attribute.template, parameters, options);
                if (parser) {
                    value = parser(value, options);
                }
                if (lastValue !== value) {
                    let lastValue2 = lastValue;
                    lastValue = value;
                    actions.push(function () {

                        var makeSet = (value) => {

                            let result = Object.create(null);

                            let values = value.split(/\s+/);

                            let looper = 0;
                            while (looper < values.length) {
                                result[values[looper]] = true;
                                ++looper;
                            }

                            return result;

                        };
                        let currentValues = makeSet(element.className);
                        let lastValues = makeSet(lastValue2);
                        let values = makeSet(value);

                        let keys = Object.keys(values);
                        let looper = 0;
                        while (looper < keys.length) {
                            delete lastValues[keys[looper]];
                            currentValues[keys[looper]] = true;
                            ++looper;
                        }

                        keys = Object.keys(lastValues);
                        looper = 0;
                        while (looper < keys.length) {
                            delete currentValues[keys[looper]];
                            ++looper;
                        }

                        let finalValue = currentValues.join(" ");
                        element.setAttribute("class", finalValue);
                        element.className = finalValue;
                    });
                }
            };
            updaters.push(updater);
            updater(parameters, animations, actions);
        } else {
            let value = attribute.content;
            if (parser) {
                value = parser(value, options);
            }
            element.setAttribute("class", value);
            element.className = value;
        }

    };

    $.tmpl.attribute[$.tmpl.xhtmlNamespaceURI][""]["title"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        if (attribute.template) {
            let lastValue = null;
            let lastTriggerValue = null;
            let dependencies = null;
            let triggerDependencies = null;
            let updater = function (parameters, animations, actions) {
                dependencies = $.tmpl.deps(attribute, options, dependencies);
                let triggerChanged = false;
                if (attribute.trigger) {
                    triggerDependencies = $.tmpl.deps(attribute.trigger, options, triggerDependencies);
                    triggerChanged = $.format.tmpl.deps.changed(triggerDependencies, parameters, options);
                }
                let changed = $.format.tmpl.deps.changed(dependencies, parameters, options);
                if ((!changed) && (!triggerChanged)) {
                    return;
                }
                
                let value = $.format.parsers[options.textParser].parseTemplate(attribute.template, parameters, options);
                let triggerValue = null;
                if (attribute.trigger) {
                    triggerValue = $.format.tmpl(attribute.trigger.template.parts[0].call, parameters, options);
                }
                if ((lastValue !== value) || (lastTriggerValue !== triggerValue)) {
                    lastValue = value;
                    lastTriggerValue = triggerValue;
                    actions.push(function () {
                        if (element.getAttributeNS(titleNamespaceURI, "content") !== value) {
                            element.setAttributeNS(titleNamespaceURI, "content", value);
                        }
                    });
                }
            };
            updaters.push(updater);
            updater(parameters, animations, actions);
        } else {
            let value = attribute.content;
            element.setAttributeNS(titleNamespaceURI, "content", value);
        }

    };
 
    if (!$.tmpl.attribute["*"][$.tmpl.classNamespaceURI]) {
        $.tmpl.attribute["*"][$.tmpl.classNamespaceURI] = {};
    }

    $.tmpl.attribute["*"][$.tmpl.classNamespaceURI]["*"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        if (!attribute.template) {
            let content = "${" + attribute.content + "}";
            attribute.content = content;
            if (!caches[content]) {
                caches[content] = $.format.parsers[options.textParser].compileTemplate(content, parameters, options);
            }
            attribute.template = caches[content];
        }

        if (attribute.template.parts.length !== 1) {
            throw new Error("Invalid attribute template: " + attribute.content);
        }

        let lastValue = null;
        var dependencies = null;
        let updater = function (parameters, animations, actions) {
            dependencies = $.tmpl.deps(attribute, options, dependencies);
            if (!$.format.tmpl.deps.changed(dependencies, parameters, options)) {
                return;
            }
            let value = $.format.tmpl(attribute.template.parts[0].call, parameters, options);
            if (lastValue !== value) {
                var lastValue2 = lastValue;
                lastValue = value;
                actions.push(function () {
                    if (value) {
                        element.classList.add(attribute.name);
                    } else {
                        element.classList.remove(attribute.name);
                    }
                });
            }
        };
        updaters.push(updater);
        updater(parameters, animations, actions);
    };

    if (!$.tmpl.attribute["*"][$.tmpl.styleNamespaceURI]) {
        $.tmpl.attribute["*"][$.tmpl.styleNamespaceURI] = {};
    }

    $.tmpl.attribute["*"][$.tmpl.styleNamespaceURI]["*"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

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
                    lastValue = value;
                    actions.push(function () {
                        if (value.trim()) {
                            let properties = $.tmpl.css.style("--value: " + value, options.cssParameters, options.cssMixins, {
                                "path": options.path
                            });
                            element.style.setProperty(attribute.name, properties["--value"]);
                        } else {
                            element.style.removeProperty(attribute.name);
                        }
                    });
                }
            };
            updaters.push(updater);
            updater(parameters, animations, actions);
        } else {
            let properties = $.tmpl.css.style("--value: " + attribute.content, options.cssParameters, options.cssMixins, {});
            if (attribute.content.trim()) {
                element.style.setProperty(attribute.name, properties["--value"]);
            } else {
                element.style.removeProperty(attribute.name);
            }
        }

    };

    if (!$.tmpl.attribute["*"][$.tmpl.eventNamespaceURI]) {
        $.tmpl.attribute["*"][$.tmpl.eventNamespaceURI] = {};
    }

    $.tmpl.attribute["*"][$.tmpl.eventNamespaceURI]["*"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        var updatedParameters = parameters;

        updaters.push(function (parameters, animations, actions) {
            actions.push(() => {
                updatedParameters = parameters;
            });
        });

        $(element).on(attribute.name, function (event, parameter) {

            var eventParameters = Object.assign({}, updatedParameters, {
                "event": event,
                "parameter": parameter,
                "element": element
            });

            if (!attribute.template) {
                let template = "${" + attribute.content + "}";
                attribute.content = template;
                if (!caches[template]) {
                    caches[template] = $.format.parsers[options.textParser].compileTemplate(template, {}, options);
                }
                attribute.template = caches[template];
            }

            if (attribute.template.parts.length !== 1) {
                throw new Error("Invalid event listener template: " + attribute.content);
            }

            $.format.tmpl(attribute.template.parts[0].call, eventParameters, options);

        });

    };

    if (!$.tmpl.attribute["*"][$.tmpl.triggerNamespaceURI]) {
        $.tmpl.attribute["*"][$.tmpl.triggerNamespaceURI] = {};
    }

    $.tmpl.attribute["*"][$.tmpl.triggerNamespaceURI]["*"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        // Do nothing

    };

    if (!$.tmpl.attribute["*"][$.tmpl.propertyNamespaceURI]) {
        $.tmpl.attribute["*"][$.tmpl.propertyNamespaceURI] = {};
    }

    let propertyTimes = 0;

    $.tmpl.attribute["*"][$.tmpl.propertyNamespaceURI]["*"] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

        if (!attribute.template) {
            let content = "${" + attribute.content + "}";
            attribute.content = content;
            if (!caches[content]) {
                caches[content] = $.format.parsers[options.textParser].compileTemplate(content, parameters, options);
            }
            attribute.template = caches[content];
        }

        if (attribute.template.parts.length !== 1) {
            throw new Error("Invalid attribute template: " + attribute.content);
        }

        let times = 0;

        let lastValue = null;
        var dependencies = null;

        let updater = function (parameters, animations, actions) {
            dependencies = $.tmpl.deps(attribute, options, dependencies);
            if (!$.format.tmpl.deps.changed(dependencies, parameters, options)) {
                return;
            }
            let value = $.format.tmpl(attribute.template.parts[0].call, parameters, options);
            if (lastValue !== value) {
                var lastValue2 = lastValue;
                lastValue = value;
                actions.push(function () {
                    ++propertyTimes;
                    let attributeValue = "{ /* Property-" + propertyTimes + " */ }";
                    element[attribute.name] = value;
                    element.setAttribute(attribute.name, attributeValue);
                });
            }
        };

        updaters.push(updater);

        updater(parameters, animations, actions);

    };

    const generateHTMLPropertyConvertor = function (attribute, property, parser) {

        const attributeName = attribute;

        if (!property) {
            property = attribute;
        }

        $.tmpl.attribute[$.tmpl.xhtmlNamespaceURI][""][attribute] = function (element, attribute, parameters, options, animations, updaters, actions, caches) {

            if (attribute.template) {
                let lastValue = null;
                let lastTriggerValue = null;
                let dependencies = null;
                let triggerDependencies = null;
                let updater = function (parameters, animations, actions) {
                    dependencies = $.tmpl.deps(attribute, options, dependencies);
                    let triggerChanged = false;
                    if (attribute.trigger) {
                        triggerDependencies = $.tmpl.deps(attribute.trigger, options, triggerDependencies);
                        triggerChanged = $.format.tmpl.deps.changed(triggerDependencies, parameters, options);
                    }
                    let changed = $.format.tmpl.deps.changed(dependencies, parameters, options);
                    if ((!changed) && (!triggerChanged)) {
                        return;
                    }
                    
                    let value = $.format.parsers[options.textParser].parseTemplate(attribute.template, parameters, options);
                    if (parser) {
                        value = parser(value, options, element);
                    }
                    let triggerValue = null;
                    if (attribute.trigger) {
                        triggerValue = $.format.tmpl(attribute.trigger.template.parts[0].call, parameters, options);
                    }
                    if ((lastValue !== value) || (lastTriggerValue !== triggerValue)) {
                        lastValue = value;
                        lastTriggerValue = triggerValue;
                        actions.push(function () {
                            if (element[property] !== value) {
                                element[property] = value;
                            }
                            if (element.getAttribute(attributeName) !== value) {
                                element.setAttribute(attributeName, value);
                            }
                        });
                    }
                };
                updaters.push(updater);
                updater(parameters, animations, actions);
            } else {
                let value = attribute.content;
                if (parser) {
                    value = parser(value, options, element);
                }
                element.setAttribute(attributeName, value);
                element[property] = value;
            }

        };

    };

    const autoresolvePathPropertyConvertor = function (value, options) {

        let file = value;
        if (file[0] === "/") {
            return path.normalize(path.resolve(require.root, file));
        }
        if (options.path) {
            file = path.normalize(path.resolve(path.dirname(options.path), file));
        }
        if (options.inclusionResolver) {
            file = options.inclusionResolver(file);
        }

        return file;

    };

    generateHTMLPropertyConvertor("value");
    generateHTMLPropertyConvertor("class", "className");

    generateHTMLPropertyConvertor("checked", "checked", (value, options, element) => {
        if (element.localName.toLowerCase().split("-").length === 1) {
            return (value === true) || (value === "true") || (value === "yes") || (value === "checked");
        } else {
            return value;
        }
    });

    generateHTMLPropertyConvertor("selected", "selected", (value, options, element) => {
        if (element.localName.toLowerCase().split("-").length === 1) {
            return (value === true) || (value === "true") || (value === "yes") || (value === "selected");
        } else {
            return value;
        }
    });

    generateHTMLPropertyConvertor("readonly", "readOnly", (value, options, element) => {
        if (element.localName.toLowerCase().split("-").length === 1) {
            return (value === true) || (value === "true") || (value === "yes") || (value === "readonly");
        } else {
            return value;
        }
    });

    generateHTMLPropertyConvertor("src", "src", autoresolvePathPropertyConvertor);

    generateHTMLPropertyConvertor("href", "href", autoresolvePathPropertyConvertor);

})();

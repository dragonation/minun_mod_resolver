(() => {

    const path = require("path");

    $.tmpl.tag[$.tmpl.namespaceURI]["if"] = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        let getter = $.tmpl.getter(["+test"], node, { "test": true }, parameters, options, caches);

        let beginning = $.tmpl.placeholder();
        let ending = $.tmpl.placeholder();

        let fragment = $.tmpl.fragment();

        fragment.append(beginning, ending);

        let childUpdaters = [];

        let lastTest = false;

        let updater = function (parameters, animations, actions) {
            let attributes = getter(parameters);
            let test = attributes.test ? true : false;
            if (lastTest !== test) {
                lastTest = test;
                if (test) {
                    actions.push(() => {
                        let newActions = [];
                        for (let child of node.children) {
                            let nodes = instance.convertNode(child, parameters, options, animations, childUpdaters, newActions, caches);
                            if (nodes) {
                                $.tmpl.insert(nodes, ending);
                            }
                        }
                        for (let action of newActions) {
                            action();
                        }
                    });
                } else {
                    childUpdaters = [];
                    actions.push(() => {
                        $.between(beginning, ending).detach();
                    });
                }
            } else {
                for (let updater of childUpdaters) {
                    updater(parameters, animations, actions);
                }
            }
        };

        updaters.push(updater);

        updater(parameters, animations, actions);

        return $([beginning[0], ending[0]]);

    };

    $.tmpl.tag[$.tmpl.namespaceURI]["map"] = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        let getter = $.tmpl.getter(
            ["+list", "+filter", "+sorter", "+id-getter", "-index-name", "-item-name", "-list-name"], node, {
                "index-name": "index",
                "item-name": "item"
            }, parameters, options, caches);

        let beginning = $.tmpl.placeholder();
        let ending = $.tmpl.placeholder();

        let fragment = $.tmpl.fragment();

        fragment.append(beginning, ending);

        let lastIDs = new Map();
        var lastHasNoID = false;

        let updater = function (parameters, animations, actions) {

            var hasNoID = false;

            let attributes = getter(parameters);
            let list = attributes.list;
            if (!list) {
                list = [];
            } else {
                list = list.slice(0);
            }

            if (attributes.filter) {
                let newParameters = Object.assign({}, parameters);
                if (attributes["list-name"]) {
                    newParameters[attributes["list-name"]] = list;
                }
                list = list.filter((item, index) => {
                    newParameters[attributes["item-name"]] = item;
                    return attributes.filter.call("", null, newParameters, options);
                });
            }

            let removedIDs = [];
            for (let key of lastIDs.keys()) { removedIDs.push(key); }
            let addedIDs = [];
            let indexChanged = false;
            let ids = new Map();

            list = list.map((item, index) => {

                let newParameters = Object.assign({}, parameters);
                if (attributes["list-name"]) {
                    newParameters[attributes["list-name"]] = list;
                }
                newParameters[attributes["item-name"]] = item;
                newParameters[attributes["index-name"]] = index;

                let id = null;
                if (attributes["id-getter"]) {
                    id = attributes["id-getter"].call("", null, newParameters, options);
                }

                let record = {
                    "index": index,
                    "id": id,
                    "parameters": newParameters,
                    "item": list[index],
                    "updaters": []
                };

                if ((id !== null) && (id !== undefined)) {
                    let lastRecord = lastIDs.get(id);
                    if (lastRecord) {
                        let lastIndex = removedIDs.indexOf(id);
                        if (lastIndex !== -1) {
                            removedIDs.splice(lastIndex, 1);
                        }
                        if (index !== lastRecord.index) {
                            indexChanged = true;
                        }
                        record = Object.assign({}, lastRecord, {
                            "index": index,
                            "parameters": newParameters,
                            "item": list[index]
                        });
                    } else {
                        addedIDs.push(id);
                    }
                    if (ids.has(id)) {
                        throw new Error("Duplicated ID found in the list");
                    }
                    ids.set(id, record);
                } else {
                    hasNoID = true;
                    indexChanged = true;
                }

                return record;

            });

            let rearranging = (removedIDs.length > 0) || (addedIDs.length > 0) || indexChanged || hasNoID || lastHasNoID;

            lastIDs = ids;
            lastHasNoID = hasNoID;

            for (let record of list) {

                if (record.beginning) {
                    for (let updater of record.updaters) {
                        updater(record.parameters, animations, actions);
                    }
                } else {

                    record.beginning = $.tmpl.placeholder();
                    record.ending = $.tmpl.placeholder();

                    $.tmpl.insert(record.beginning, ending);
                    $.tmpl.insert(record.ending, ending);

                    actions.push(() => {

                        let newActions = [];

                        for (let child of node.children) {
                            let nodes = instance.convertNode(child, record.parameters, options, animations, record.updaters, newActions, caches);
                            if (nodes) {
                                $.tmpl.insert(nodes, record.ending);
                            }
                        }

                        for (let action of newActions) {
                            action();
                        };

                    });

                }

            }

            if (rearranging) {
                actions.push(() => {

                    let parent = beginning.parent();

                    let nodes = new Map();
                    list.map((record) => {
                        nodes.set(record, $.between(record.beginning, record.ending, true));
                    });

                    let betweens = $.between(beginning, ending);

                    let sets = new Set();
                    list.forEach((record) => {
                        let children = nodes.get(record);
                        for (let child of children) {
                            sets.add(child);
                        }
                        $.tmpl.insert(children, ending);
                    });

                    for (let node of betweens) {
                        if (!sets.has(node)) {
                            $(node).detach();
                        }
                    }

                });
            }

        };

        updaters.push(updater);

        updater(parameters, animations, actions);

        return $([beginning[0], ending[0]]);

    };

    $.tmpl.tag[$.tmpl.namespaceURI]["switch"] = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        node.children.forEach((child) => {
            if ((child.type === "text") && (!child.content.trim())) {
                return;
            }
            if ((child.namespace !== $.tmpl.namespaceURI) || (child.name !== "case")) {
                throw new Error("Only case tag could be placed under switch tag");
            }
        });

        let getter = $.tmpl.getter(["+condition"], node, { "condition": true }, parameters, options, caches);

        let beginning = $.tmpl.placeholder();
        let ending = $.tmpl.placeholder();

        let fragment = $.tmpl.fragment();

        fragment.append(beginning, ending);

        let childUpdaters = [];

        let lastCondition = null;

        let updater = function (parameters, animations, actions) {

            let attributes = getter(parameters);

            let condition = null;
            let looper = 0;
            while ((looper < node.children.length) && (!condition)) {
                if (node.children[looper].type !== "text") {
                    if (!node.children[looper].caseGetter) {
                        let defaultValue = {};
                        node.children[looper].caseGetter = $.tmpl.getter(["+value"], node.children[looper], { "value": defaultValue }, parameters, options, caches);
                        node.children[looper].caseGetter.defaultValue = defaultValue;
                    }
                    let value = node.children[looper].caseGetter(parameters).value;
                    if ((value === node.children[looper].caseGetter.defaultValue) || (value === attributes.condition)) {
                        condition = node.children[looper];
                    } else {
                        ++looper;
                    }
                } else {
                    ++looper;
                }
            }

            if (condition !== lastCondition) {

                lastCondition = condition;

                childUpdaters = [];
                actions.push(() => {
                    $.between(beginning, ending).detach();
                });

                if (condition) {
                    actions.push(() => {
                        let newActions = [];
                        for (let child of condition.children) {
                            let nodes = instance.convertNode(child, parameters, options, animations, childUpdaters, newActions, caches);
                            if (nodes) {
                                $.tmpl.insert(nodes, ending);
                            }
                        }
                        for (let action of newActions) {
                            action();
                        }
                    });
                } else {
                    for (let updater of childUpdaters) {
                        updater(parameters, animations, actions);
                    }
                }

            }

        };

        updaters.push(updater);

        updater(parameters, animations, actions);

        return $([beginning[0], ending[0]]);

    };

    $.tmpl.tag[$.tmpl.namespaceURI]["html"] = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        if (node.children.length > 0) {
            throw new Error("No child nodes is allowed in the html template tag");
        }

        let getter = $.tmpl.getter(["+content"], node, { "content": "" }, parameters, options, caches);

        let beginning = $.tmpl.placeholder();
        let ending = $.tmpl.placeholder();

        let fragment = $.tmpl.fragment();

        fragment.append(beginning, ending);

        let lastContent = "";

        let updater = function (parameters, animations, actions) {

            let attributes = getter(parameters);

            let content = attributes.content;

            if (lastContent !== content) {
                lastContent = content;
                actions.push(() => {
                    $.between(beginning, ending).detach();
                });
                if (content) {
                    actions.push(() => {
                        $.tmpl.insert($(content), ending);
                    });
                }
            }

        };

        updaters.push(updater);

        updater(parameters, animations, actions);

        return $([beginning[0], ending[0]]);

    };


    $.tmpl.tag[$.tmpl.namespaceURI]["slot"] = function (instance, node, parameters, options, animations, updaters, actions, caches) {

        let slot = $(document.createTextNode(""));

        let name = "slot";
        if (node.attributes[""] && node.attributes[""]["name"] && node.attributes[""]["name"].content) {
            name = node.attributes[""]["name"].content;
        }

        slot[0].template = {
            "name": name,
            "nodes": node.children,
            "factory": $.tmpl.factory(node.children, options),
            "options": options
        };

        return slot;

    };

    $.tmpl.slot = function (node, name) {

        let slot = $(node).subnodes().filter((index, child) => {
            return (child.nodeType === Node.TEXT_NODE) && child.template && (child.template.name === name);
        })[0];

        if (slot) {
            return slot.template;
        } else {
            return null;
        }

    };


})();

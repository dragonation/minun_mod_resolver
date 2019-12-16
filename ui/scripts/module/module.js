(() => {

    const workerLoaded = this.$bios ? this.$bios.loaded : [];

    const mainFile = (location + "").split("#")[0].split("?")[0];

    let prefixURL = mainFile.split("/").slice(0, -1).join("/");
    if (!this.document) {
        prefixURL = prefixURL.split("/").slice(0, -2).join("/");
    }

    const eval = (() => "eval")();

    const isWorker = (!this["window"]);

    Object.defineProperty(this.constructor.prototype, "global", {
        "enumerable": false,
        "get": function () {
            return this;
        }
    });

    Object.defineProperty(global, "Global", {
        "enumerable": true,
        "value": global.constructor
    });

    const getFileLine = function (offset) {

        offset = parseInt(offset);
        if (!isFinite(offset)) {
            offset = 0;
        }

        try {

            var stack = new Error("937b84bb-7953-4443-be30-34ba130b98e7").stack.split("\n");
            var line = null;
            if (stack[0].indexOf("937b84bb-7953-4443-be30-34ba130b98e7") !== -1) {
                line = stack[2 + offset];
            } else {
                line = stack[1 + offset];
            }

            if (line.substring(0, 7) === "    at ") {
                line = line.split("at").slice(1).join("at");
            } else {
                line = line.split("@");
                if (line.length > 1) {
                    line = line.slice(1).join("@");
                } else {
                    line = line[0];
                }
            }

            if (line[line.length - 1] === ")") {
                line = line.split("(").slice(1).join("(").slice(0, -1);
            }

            return line.trim();

        } catch (error) {

            let path = document.URL + ":0:0";

            if (document.readyState !== "complete") {

                const collection = document.getElementsByTagName("script");
                var scriptTag = collection[collection.length - 1];
                if (scriptTag.src) {
                    path = scriptTag.src + ":0:0";
                }

            }

            return path;
        }

    };

    Object.defineProperty(Global.prototype, "__dirname", {
        "enumerable": false,
        "configurable": true,
        "get": function () {
            return getFileLine(1).split(":").slice(0, -2).join(":").split("/").slice(0, -1).join("/");
        }
    });

    Object.defineProperty(Global.prototype, "__filename", {
        "enumerable": false,
        "configurable": true,
        "get": function () {
            return getFileLine(1).split(":").slice(0, -2).join(":");
        }
    });

    Object.defineProperty(Global.prototype, "__line", {
        "enumerable": false,
        "configurable": true,
        "get": function () {
            return parseInt(getFileLine(1).split(":").slice(-2, -1)[0]);
        }
    });

    Object.defineProperty(Global.prototype, "__column", {
        "enumerable": false,
        "configurable": true,
        "get": function () {
            return parseInt(getFileLine(1).split(":").slice(-1)[0]);
        }
    });

    const modules = Object.create(null);

    const loadedModules = Object.create(null);

    const Module = function (parent, id, autoregister, callback) {

        const module = this;

        if (autoregister) {
            modules[id] = this;
        }

        this.parent = parent;

        this.id = id;

        this.filename = id;

        this.loaded = false;

        this.children = [];

        this.exports = {};

        Object.defineProperty(this, "_compile", {
            "value": (code, filename) => {

                const names = Object.keys(getters);

                const parameters = names.map((name) => getters[name](this, code));

                if (filename[0] === "/") {
                    filename = require.root + filename;
                }

                let script = `(function () { return function (${names.join(", ")}) { ${code}\n }; })() //# sourceURL=${filename}`;

                let evaluation = null;
                try {
                    evaluation = global[eval](script);
                } catch (error) {
                    // TODO: add eslint
                    console.error("Invalid JS file: " + filename);
                    console.log(script);
                    throw error;
                }

                evaluation.apply(global, parameters);
            }
        });

        this.require = (id, callback) => {

            if (!loadedModules[id]) {

                if (/^[a-z0-9\-_]+$/i.test(id)) {
                    id = `/library/node.${id}/index.js`;
                }

                id = this.require.normalize(id, this.id.split("/").slice(0, -1).join("/"));
                if (id[0] === "/") {
                    id = prefixURL + id;
                }

            }

            return Module.get(this, id, callback).exports;

        };

        this.require.normalize = function (id, base) {

            if ((id[0] === ".") && base) {
                id = base + "/" + id;
            }


            while (id.indexOf("/./") !== -1) {
                id = id.replace(/\/\.\//g, "/");
            }

            while (id.indexOf("/../") !== -1) {
                let newID = id.replace(/\/([^\/]+)([\/]+)\.\.\//g, "/");
                if (id === newID) {
                    break;
                }
                id = newID;
            }

            id = id.replace(/\/+/g, "/");

            id = id.replace(/^[a-z\-]+:\//, function (scheme) {
                if (scheme === "file:/") {
                    return scheme + "//";
                } else {
                    return scheme + "/";
                }
            });

            return id;

        };

        this.require.root = prefixURL;

        let preloaded = [];
        if (isWorker) {
            preloaded = workerLoaded;
        } else {
            preloaded = Array.prototype.map.call(document.querySelectorAll("script"), (element) => element.src);
        }

        if ((id !== mainFile) &&
            (!loadedModules[id]) &&
            (preloaded.filter((src) => (src === id)).length === 0)) {

            loadedModules[id] = true;

            const extnames = id.split(".");
            let extname = "";
            if (extnames.length > 0) {
                extname = "." + extnames[extnames.length - 1];
            }
            if ((!extname) || (!Module._extensions[extname])) {
                extname = ".js";
            }

            Module._extensions[extname](module, id, parent, callback);

        } else {
            loadedModules[id] = true;
        }

    };

    Module.revision = 3;

    Module.get = function (parent, id, callback) {

        if (!modules[id]) {
            if ((parent === null) && (id !== mainFile)) {
                parent = modules[mainFile];
            }
            new Module(parent, id, true, callback);
        } else {
            if (callback) {
                callback(null, modules[id].exports);
            }
        }

        return modules[id];

    };

    Object.defineProperty(Module, "_extensions", {
        "value": Object.create(null)
    });

    const getters = {};
    Module.getter = function (name, getter) {
        getters[name] = getter;
    };

    Module.getter("module", (module) => module);
    Module.getter("require", (module) => module.require);
    Module.getter("exports", (module) => module.exports);
    Module.getter("__filename", (module) => module.id);
    Module.getter("__dirname", (module) => module.id.split("/").slice(0, -1).join("/"));

    const getModule = function (parent, offset) {

        const id = getFileLine(1 + offset).split(":").slice(0, -2).join(":");
        if (id) {
            return Module.get(parent, id);
        } else {
            return Module.main;
        }

    };

    Object.defineProperty(Global.prototype, "module", {
        "enumerable": false,
        "configurable": true,
        "get": function () {
            return getModule(null, 1);
        }
    });

    Object.defineProperty(Global.prototype, "require", {
        "enumerable": false,
        "configurable": true,
        "get": function () {
            return getModule(null, 1).require;
        }
    });

    Object.defineProperty(Global.prototype, "exports", {
        "enumerable": false,
        "configurable": true,
        "get": function () {
            return getModule(null, 1).exports;
        },
        "set": function (exports) {
            getModule(null, 1).exports = exports;
        }
    });

    Module.register = function (name, apis) {

        if (loadedModules[name]) {
            throw new Error(`Duplicated module ${name} definitions`);
        }

        loadedModules[name] = true;

        new Module(module, name, true).exports = apis;

    };

    Module.register.stub = function () {
        if (typeof arguments[arguments.length - 1] === "function") {
            arguments[arguments.length - 1](new Error("Not implemented"));
        } else {
            throw new Error("Not implemented");
        }
    };

    Module.register.stub.sync = function () {
        throw new Error("Not implemented");
    };

    Module.main = Module.get(null, mainFile);

    Module._extensions[".js"] = function (module, filename, parent, callback) {

        var load = function (code) {

        };

        var $ = global.$;

        if ($ && $.res && $.res.load) {

            let callback2 = function (error, content) {

                if (error) {
                    if (callback) {
                        callback(error);
                    } else {
                        throw error;
                    }
                    return;
                }

                try {
                    module._compile(content, filename);
                } catch (error) {
                    if (callback) {
                        callback(error);
                    } else {
                        throw error;
                    }
                }

                if (callback) {
                    callback(null, module.exports);
                }

            };

            let result = $.res.load(filename, callback ? callback2 : undefined);
            if (!callback) {
                callback2(undefined, result);
            }

        } else {

            let request = new XMLHttpRequest();

            if (callback) {

                var listener = function () {
                    if (request.readyState === 4) {
                        switch (request.status % 100) {

                            case 0:
                            case 2: {

                                try {
                                    module._compile(code, request.responseText);
                                } catch (error) {
                                    if (callback) {
                                        callback(error);
                                    } else {
                                        throw error;
                                    }
                                    return;
                                }

                                callback(null, module.exports);

                                break;
                            }

                            default: {
                                callback(new Error("Failed to module " + path));
                            }

                        }
                    }
                };

                if (request.addEventListener) {
                    request.addEventListener("readystatechange", listener);
                } else {
                    request.onreadystatechange = listener;
                }

            }

            if (/^[0-9a-z\-]+:/i.test(filename)) {
                request.open("GET", filename, (callback ? true : false));
            } else if (filename[0] !== "/") {
                request.open("GET", prefixURL + "/" + filename, (callback ? true : false));
            } else {
                request.open("GET", prefixURL + filename, (callback ? true : false));
            }

            request.send();

            if (!callback) {
                switch (request.status % 100) {
                    case 0: case 2: {
                        module._compile(request.responseText, filename); break;
                    }
                    default: {
                        throw new Error("Module not found " + filename);
                    }
                }
            }

        }

    };

    Object.defineProperty(Module, "builtinModules", {
        "get": function () {
            return ["module", "fs", "os", "path", "process", "punycode", "querystring", "url", "util"].filter((id) => modules[id]).sort();
        }
    });

    Module.register("module", Module);

    Module.register("<anonymous>", {});

})();

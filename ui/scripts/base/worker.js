(() => {

    var createUUID = function () {

        var date = new Date().getTime();

        var factors = ((date * date) >> 8) & 0xffff;
        factors = (factors * factors).toString(16);
        factors = factors + factors + factors + factors;

        var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (character) {

            var random = ((parseInt(factors[factors.length - 1], 16) + Math.random() * 16) % 0xF) | 0;

            --factors.length;

            return ((character === "x") ? random : (random & 0x3 | 0x8)).toString(16);

        });

        return uuid;
    };

    const $ = global.$;

    const workerListeners = Object.create(null);
    const workerCallbacks = Object.create(null);

    const calls = Object.create(null);

    let nextCallID = 1;
    const workerID = createUUID();

    const QueryWorker = function QueryWorker(worker, script, listeners, callbacks) {

        this.id = createUUID();

        this.script = script;

        this.post = function (usage, content) {
            worker.postMessage({
                "usage": usage,
                "content": content
            });
        };

        this.calls = Object.create(null);

        this.listeners = listeners;
        if (!this.listeners) {
            this.listeners = {};
        }
        this.callbacks = callbacks;
        if (!this.callbacks) {
            this.callbacks = {};
        }

    };

    QueryWorker.prototype.on = function (usage, listener) {

        if (!this.listeners[usage]) {
            this.listeners[usage] = [];
        }

        this.listeners[usage].push(listener);

        return listener;
    };

    QueryWorker.prototype.off = function (usage, listener) {

        if (!listener) {
            delete this.listeners[usage];
            return;
        }

        if (this.listeners[usage]) {
            let index = this.listeners[usage].idnexOf(listener);
            if (index !== -1) {
                this.listeners[usage].splice(index, 1);
            }
        }

        return listener;
    };

    QueryWorker.prototype.call = function (usage, content, callback) {

        let callID = this.id + "-" + nextCallID;
        ++nextCallID;
        this.calls[callID] = callback;

        this.post("query.call", {
            "id": callID,
            "usage": usage,
            "parameters": content
        });

    };

    QueryWorker.prototype.callback = function (usage, callback) {

        this.callbacks[usage] = callback;

    };

    $.worker = function (script, listeners, callbacks) {

        if (!listeners) { listeners = {}; }
        if (!callbacks) { callbacks = {}; }

        let worker = new Worker(require.root + "/library/query.worker/boot.js");

        let queryWorker = new QueryWorker(worker, script, listeners, callbacks);

        worker.addEventListener("message", function (event) {

            let data = event.data;

            if (data && data.usage) {
                if (listeners && listeners[data.usage]) {
                    listeners[data.usage].forEach((listener) => {
                        try {
                            listener.call(queryWorker, data.usage, data.content);
                        } catch (error) {
                            if (global.$ && global.$.error) {
                                $.error(error);
                            } else {
                                console.error(error);
                            }
                        }
                    });
                } else if (workerListeners[data.usage]) {
                    workerListeners[data.usage].forEach((listener) => {
                        try {
                            listener.call(queryWorker, data.usage, data.content);
                        } catch (error) {
                            if (global.$ && global.$.error) {
                                $.error(error);
                            } else {
                                console.error(error);
                            }
                        }
                    })
                } else {
                    if ($.warn) {
                        $.warn(`Unknown message received: ${data.usage}`);
                    } else {
                        console.warn(`Unknown message received: ${data.usage}`);
                    }
                }
            } else {
                if ($.warn) {
                    $.warn(`Invalid message received: ${$.jsonize(data)}`);
                } else {
                    console.warn(`Invalid message received`, data);
                }
            }

        });

        return $.async(function () {
            queryWorker.step = this;
        });

    };

    $.worker.on = function (usage, listener) {

        if (!workerListeners[usage]) {
            workerListeners[usage] = [];
        }

        workerListeners[usage].push(listener);

        return listener;
    };

    $.worker.off = function (usage, listener) {

        if (!listener) {
            delete workerListeners[usage];
            return;
        }

        if (workerListeners[usage]) {
            let index = workerListeners[usage].idnexOf(listener);
            if (index !== -1) {
                workerListeners[usage].splice(index, 1);
            }
        }

        return listener;
    };

    $.worker.callback = function (usage, callback) {

        workerCallbacks[usage] = callback;

    };

    $.worker.on("worker.ready", function (usage, content) {

        let step = this.step;

        delete this.step;

        step.next(this);

    });

    $.worker.on("worker.failed", function (usage, content) {

        let step = this.step;

        delete this.step;

        let error = new Error();
        error.message = content.error.message;
        error.stack = content.error.stack;

        step.reject(error);

    });

    $.worker.on("query.callback", function (usage, content) {

        if (content.id) {

            if (!this.calls[content.id]) {
                $.warn(`Callback not found with ID: ${content.id}`);
                return;
            }

            try {

                if (content.error) {

                    let error = new Error(content.error.message);
                    error.stack = content.error.stack;

                    this.calls[content.id].call(this, error);
                } else {
                    this.calls[content.id].call(this, null, content.result);
                }

            } catch (error) {
                $.error(error);
            }

            delete this.calls[content.id];

        } else {
            $.warn(`Invalid callback received: ${$.jsonize(data)}`);
        }

    });

    $.worker.on("query.call", function (usage, content) {

        if (this.callbacks && this.callbacks[content.usage]) {
            let callbacked = false;
            try {
                this.callbacks[content.usage].call(this, content.usage, content.parameters, (error, result) => {
                    if (callbacked) {
                        return;
                    }
                    callbacked = true;
                    if (error) {
                        this.post("query.callback", {
                            "id": content.id,
                            "error": {
                                "message": error.message,
                                "stack": error.stack
                            }
                        });
                    } else {
                        this.post("query.callback", {
                            "id": content.id,
                            "result": result
                        });
                    }
                });
            } catch (error) {
                if (!callbacked) {
                    this.post("query.callback", {
                        "id": content.id,
                        "error": {
                            "message": error.message,
                            "stack": error.stack
                        }
                    });
                } else {
                    $.error(error);
                }
            }
            return;
        }

        if (!workerCallbacks[content.usage]) {
            this.post("query.callback", {
                "id": content.id,
                "error": {
                    "message": `Callback for usage ${content.usage} not found`,
                    "stack": new Error().stack
                }
            });
            return;
        }

        let callbacked = false;
        try {
            workerCallbacks[content.usage].call(this, usage, content.parameters, (error, result) => {
                if (callbacked) {
                    return;
                }
                callbacked = true;
                if (error) {
                    this.post("query.callback", {
                        "id": content.id,
                        "error": {
                            "message": error.message,
                            "stack": error.stack
                        }
                    });
                } else {
                    this.post("query.callback", {
                        "id": content.id,
                        "result": result
                    });
                }
            });
        } catch (error) {
            if (!callbacked) {
                callbacked = true;
                this.post("query.callback", {
                    "id": content.id,
                    "error": {
                        "message": error.message,
                        "stack": error.stack
                    }
                });
            } else {
                $.error(error);
            }
        }

    });

    $.worker.callback("query.metas", function (usage, content, callback) {

        let metas = {
            "app": $.metas("app", true),
            "description": $.metas("description", true),
            "author": $.metas("author", true),
            "query": [$.merge.simple($.meta("query", true), {
                "starter": this.script
            })]
        };

        callback(null, metas);

    });

    $.worker.callback("query.resource", function (usage, content, callback) {

        if ($.resources.hasCache(content.path)) {
            callback(null, $.resources.getCachedContent(content.path));
        } else {
            callback(new Error("Resource not cached"));
        }

    });

})();

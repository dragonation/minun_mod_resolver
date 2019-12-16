(() => {
    
    const $bios = global.$bios;

    const Module = require("module");

    const path = require("path");
    const os = require("os");

    var workingDirectory = Module.main.filename.split("/").slice(0, -1).join("/");
    if (os.type() === "Worker") {
        workingDirectory = path.normalize(path.resolve(workingDirectory, "../.."));
    }

    var lastHRTime = 0;

    var nextTick = function (job) {
        setTimeout(job, 0);
    };

    if (global.document) {

        var tickSignature = "nextTick-${deb93a6f-d613-44f5-b82c-c58e8b0a3e2f}";
        var ticks = [];

        global.addEventListener("message", function (event) {

            if ((event.source === global) &&
                event.data && (event.data.signature === tickSignature)) {
                event.stopPropagation();
            }

            var oldTicks = ticks;
            ticks = [];

            oldTicks.forEach(function (tick) {
                try {
                    tick.job.apply(global, tick.arguments);
                } catch (error) {
                    setTimeout(function () {
                        throw error;
                    });
                }
            });

        });

        nextTick = function (job) {

            ticks.push({
                "job": job,
                "arguments": [].slice.call(arguments, 1)
            });

            global.postMessage({
                "signature": tickSignature
            }, "*");

        };

    } 

    const notImplSync = Module.register.stub.sync;

    Module.register("process", {

        "cwd": function () {
            return workingDirectory;
        },
        "chdir": notImplSync,

        "exit": notImplSync,
        "kill": notImplSync,
        "abort": notImplSync,

        "umask": 0777,

        "getgid": function () { return 0; },
        "getuid": function () { return 0; },
        "setgid": notImplSync,
        "setuid": notImplSync,

        "hrtime": function () {

            var hrTime = new Date().getTime();

            var difference = (hrTime - lastHRTime) / 1000;

            lastHRTime = hrTime;

            return [Math.floor(difference), difference - Math.floor(difference)];

        },

        "uptime": os.uptime,

        "nextTick": nextTick,

        "getgroups": notImplSync,
        "setgroups": notImplSync,
        "initgroups": notImplSync,

        "memoryUsage": function () {
            if (os.type() === "Worker") {
                return {
                    "rss": 0,
                    "heapTotal": Infinity,
                    "heapUsed": 0,
                    "external": 0
                };
            } else {
                return {
                    "rss": global.performance.memory.usedJSHeapSize,
                    "heapTotal": global.performance.memory.totalJSHeapSize,
                    "heapUsed": global.performance.memory.usedJSHeapSize,
                    "external": 0
                };
            }
        },

        "env": {
            "HOME": workingDirectory
        },
        "pid": 0,

        "arch": os.arch(),
        "platform": os.platform(),
        "title": (os.type() === "Worker") ? "worker" : "browser",
        "version": "1.0.0",

        "argv": [(os.type() === "Worker") ? "worker" : "browser", Module.main.filename],
        "execArgv": [],
        "execPath": (os.type() === "Worker") ? "worker" : "browser",

        "stdin": null,
        "stderr": null,
        "stdout": null,
        "exitCode": 0,

        "config": {},
        
        "version": "v1.0.0",
        "versions": {
            "node": "1.0.0",
            "modules": "" + Module.revision
        },

        "mainModule": Module.main

    });

    global.process = require("process");

})();
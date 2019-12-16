(() => {
    
    let start = Date.now();

    const Module = require("module");

    const isWorker = (!this["window"]);

    Module.register("os", {
        "EOL": "\n",
        "tmpdir": function () { return null; },
        "homedir": function () { return null; },
        "endianness": function () { return "BE"; },
        "type": function () { return isWorker ? "Worker" : "Browser"; },
        "hostname": function () { return "localhost"; },
        "platform": function () { return "browser"; },
        "arch": function () { return "es6"; },
        "release": function () { return "1.0.0"; },
        "uptime": function () { return (Date.now() - start) / 1000; },
        "loadavg": function () { return [0, 0, 0]; },
        "totalmem": function () { 

            if (isWorker) {
                return Infinity;
            }

            return global.performance.memory.jsHeapSizeLimit; 
        },
        "freemem": function () { 

            if (isWorker) {
                return Infinity;
            }

            return global.performance.memory.jsHeapSizeLimit - global.performance.memory.usedJSHeapSize; 
        },
        "cpus": function () {
            return [{
                "model": "Browser Javascript CPU",
                "speed": Infinity,
                "times": { "user": 0, "nice": 0, "sys": 0, "idle": 0, "irq": 0 }
            }];
        }
    });

})();

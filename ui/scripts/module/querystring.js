(() => {

    const Module = require("module");

    let exports = {

        "escape": function (string) {
            return encodeURIComponent(string);
        },

        "unescape": function (string) {
            return decodeURIComponent(string);
        },

        "parse": function (string, sep, eq, options) {

            let unescape = options && options.decodeURIComponent ? options.decodeURIComponent : exports.unescape;

            let result = Object.create(null);

            if (!eq) {
                eq = "=";
            }

            string.split(sep ? sep : "&").forEach((pair) => {
                if (!pair) {
                    return;
                }
                let values = pair.split(eq);
                let key = unescape(values[0]);
                let value = unescape(values.slice(1).join(eq));
                if (result[key] !== undefined) {
                    if (!Array.isArray(result[key])) {
                        result[key] = [result[key]];
                    }
                    result[key].push(value);
                } else {
                    result[key] = value;
                }
            });

            return result;

        },

        "stringify": function (object, sep, eq, options) {

            let escape = options && options.encodeURIComponent ? options.encodeURIComponent : exports.escape;

            if (!eq) {
                eq = "=";
            }

            let result = [];

            Object.keys(object).forEach((key) => {
                if (!key) {
                    return;
                }
                if (Array.isArray(object[key])) {
                    object[key].forEach((value) => {
                        result.push(escape(key) + eq + escape(value));
                    });
                } else {
                    if ((object[key] !== null) && (object[key] !== undefined)) {
                        result.push(escape(key) + eq + escape(object[key]));
                    }
                }
            });

            return result.join(sep ? sep : "&");

        }

    };

    Module.register("querystring", exports);

})();
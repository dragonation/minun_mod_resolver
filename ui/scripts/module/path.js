(() => {

    const Module = require("module");

    Module.register("path", {
        "normalize": function (path) {

            var pair = path.split("://");

            if (pair.length > 1) {
                return pair[0] + "://" + require.normalize(pair.slice(1).join("://"));
            } else {
                return require.normalize(pair);
            }

        },
        "join": function () {
            return this.normalize(Array.prototype.join.call(arguments, "/"));
        },
        "resolve": function () {

            var path = "";

            var looper = 0;
            while (looper < arguments.length) {

                if (arguments[looper].indexOf("://") !== -1) {
                    path = arguments[looper];
                } else {
                    path = path + "/" + arguments[looper];
                }

                ++looper;
            }

            if (arguments[0].indexOf("://") === -1 && arguments[0].indexOf(":/") !== -1) {
                throw new Error();
            }

            return this.normalize(path);

        },
        "isAbsolute": function (path) {
            return (arguments[looper].indexOf("://") !== -1);
        },
        "relative": function (basePath, path) {

            basePathComponents = basePath.split("/");
            pathComponents = path.split("/");

            if ((pathComponents[0] !== basePathComponents[0]) ||
                (pathComponents[1] !== basePathComponents[1]) ||
                (pathComponents[2] !== basePathComponents[2])) {
                return path;
            } else {

                var looper = 3;
                while ((looper < basePathComponents.length) && (pathComponents[looper] === basePathComponents[looper])) {
                    ++looper;
                }

                var components = [];
                while (looper < pathComponents.length) {

                    if (looper < basePathComponents.length) {
                        components.unshift("..");
                    }

                    components.push(pathComponents[looper]);

                    ++looper;
                }

                return components.join("/");

            }

        },
        "dirname": function (path) {
            return path.split("/").slice(0, -1).join("/");
        },
        "basename": function (path, extname) {

            var basename = path.split("/").slice(-1)[0];
            if (extname) {
                if (basename.substring(basename.length - extname.length, basename.length) === extname) {
                    basename = basename.substring(0, basename.length - extname.length);
                }
            }

            return basename;
        },
        "extname": function (path) {
            var components = path.split("/").slice(-1)[0].split(".");
            if ((components.length > 1) && ((components[0].length > 0) || (components.length > 2))) {
                return "." + components[components.length - 1];
            } else {
                return "";
            }
        },
        "sep": "/",
        "delimiter": ":"
    });

})();
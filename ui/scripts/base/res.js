let caches = Object.create(null);

let bundles = Object.create(null);

$.res = {};

$.res.has = function (path) {

    return caches[path] !== undefined;

};

$.res.load = function (path, callback) {

    if (!/^[0-9a-z\-]+:/i.test(path)) {
        if (path[0] !== "/") {
            path = require.root + "/" + path;
        } else {
            path = require.root + path;
        }
    }

    if (caches[path] !== undefined) {
        if (callback) {
            callback(undefined, caches[path]);
            return;
        } else {
            return caches[path];
        }
    }

    if (bundles[path]) {

        let callback2 = (error) => {
            return $.res.load(path, callback);
        };

        $.res.bundle(bundles[path], callback ? callback2 : undefined);

        if (!callback) {
            return callback2();
        }

    } else {

        let request = new XMLHttpRequest();
        if (callback) {
            request.onreadystatechange = () => {
                if (request.readyState === 4) {
                    switch (request.status % 100) {
                        case 0: case 2: {
                            caches[path] = request.responseText;
                            callback(undefined, request.responseText);
                            break;
                        }
                        default: {
                            callback(new Error(`Resource[${path}] not found`));
                            break;
                        }
                    }
                }
            };
        }

        request.open("GET", path, callback ? true : false);
        request.send();

        if (!callback) {
            switch (request.status % 100) {
                case 0: case 2: {
                    caches[path] = request.responseText;
                    return request.responseText;
                }
                default: { throw new Error("Resource file not found " + filename); }
            }
        }

    }

};

$.res.bundle = function (path, callback) {

    if (!/^[0-9a-z\-]+:/i.test(path)) {
        if (path[0] !== "/") {
            path = require.root + "/" + path;
        } else {
            path = require.root + path;
        }
    }

    let callback2 = (error, content) => {

        if (error) {
            if (callback) {
                callback(error);
            } else {
                throw error;
            }
            return;
        }

        let resources = undefined;
        try {
            resources = JSON.parse(content);
        } catch (error) {
            if (callback) {
                callback(error);
            } else {
                throw error;
            }
            return;
        }

        for (let key in resources) {
            let path = require.root;
            if (key[0] !== "/") {
                path = path + "/" + key;
            } else {
                path = path + key;
            }
            if (key !== "/ui/~package.json") {
                if (caches[path] && (caches[path] !== resources[key])) {
                    console.warn(`Resource[${path}] has been overwritten`);
                }
                caches[path] = resources[key];
            }
        }

        for (let file of Object.keys(bundles)) {
            if (bundles[file] === path) {
                delete bundles[file];
            }
        }

        if (callback) {
            callback();
        }

    };

    let content = $.res.load(path, callback ? callback2 : undefined);

    if (!callback) {
        callback2(undefined, content);
    }

};

$.res.package = function (path, autobundles, callback) {

    $.res.load(path, (error, content) => {

        if (error) {
            callback(error); return;
        }

        let json = undefined;
        try {
            json = JSON.parse(content);
        } catch (error) {
            callback(error); return;
        }

        let loadings = Object.create(null);
        for (let file in json) {
            bundles[file] = json[file];
            loadings[json[file]] = true;
        }

        if (!autobundles) {
            callback(); return;
        }

        loadings = Object.keys(loadings);

        let load = (index) => {

            if (index >= loadings.length) {
                callback(); return;
            }

            $.res.bundle(loadings[index], () => {
                load(index + 1);
            });

        };

        load(0);

    });

};

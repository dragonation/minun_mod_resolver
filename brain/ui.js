const zlib = require("zlib");

const apps = Object.assign({
    "ui": @options("ui")
}, @options("apps"));

const pages = @options("pages");

const shrinkingCodes = @options("shrinkingCodes");

const bundledExtnames = Object.create(null);
bundledExtnames[".js"] = true;
bundledExtnames[".xhtml"] = true;
bundledExtnames[".css"] = true;
bundledExtnames[".json"] = true;
bundledExtnames[".frag"] = true;
bundledExtnames[".vert"] = true;

let packageJSON = {};
let bundleJSONs = Object.create(null);

let caches = Object.create(null);

const shrinkCode = function (path, extname, code) {

    if (!shrinkingCodes) {
        return code;
    }

    if (caches[path] && (caches[path].code === code)) {
        return caches[path].shrinked;
    }

    switch (extname) {
        case ".js": {
            caches[path] = {
                "shrinked": @.js.minify(code),
                "code": code
            };
            break;
        };
        case ".json": {
            caches[path] = {
                "shrinked": JSON.stringify(JSON.parse(code)),
                "code": code
            };
            break;
        };
        case ".css":
        case ".xhtml": {
            caches[path] = {
                "shrinked": code.replace(/>(\s+)</g, (code) => {
                    let whitespaces = code.slice(1, -1).split(/\n/g).map((space) => "").join("\n");
                    if (!whitespaces) { whitespaces = " "; }
                    return ">" + whitespaces + "<";
                }).trim(),
                "code": code
            };
            break;
        };
    }

    if (caches[path] && (caches[path].code === code)) {
        return caches[path].shrinked;
    }

    return code;

};

const compileHTML = function (path) {

    let basePath = @.fs.relativePath(@mewchan().workingPath, path);
    let libraryPath = @path(@mewchan().libraryPath, "ui", basePath);

    let nodes = @.fs.readFile.sync(path, "utf8").split("<");

    let result = [];

    let lastCodes = null;

    let scriptIndex = 1;
    let styleIndex = 1;

    const pushLastCodes = () => {

        if (!lastCodes) { return; }

        switch (lastCodes.type) {

            case "script": {libraryPath

                let srcs = [];
                let lasts = [];
                let rests = [];
                let suffix = [];

                let found = false;
                let looper = lastCodes.codes.length;
                while ((looper > 0) && (!found)) {
                    --looper;
                    if (lastCodes.codes[looper].slice(0, 3) === "!--") {
                        suffix.unshift("<" + lastCodes.codes.pop());
                    } else {
                        found = true;
                    }
                }

                let codes = lastCodes.codes.slice(0, looper + 1);
                for (let code of codes) {
                    if (code.slice(0, 6) === "script") {
                        for (let last of lasts) {
                            rests.push(last);
                        }
                        lasts = [];
                        srcs.push(code.split("src=\"")[1].split("\"")[0]);
                    } else if (code.slice(0, 3) === "!--") {
                        lasts.push(code.split("-->").slice(1).join("-->"));
                    } else if (code.slice(0, 7) === "/script") {
                        lasts.push(code.split(">").slice(1).join(">"));
                    } else {
                        lasts.push("<" + code);
                    }
                }

                let code = shrinkCode(`ui/pages/${basePath}/script.${scriptIndex}.js`, ".js", srcs.map((src) => {
                    return @.fs.readFile.sync(@path(path, "..", src), "utf8");
                }).join("\n"));

                @.fs.makeDirs(libraryPath);
                @.fs.writeFile.sync(@path(libraryPath, `script.${scriptIndex}.js`), code)

                result.push(`script src=\"/ui/pages/${basePath}/script.${scriptIndex}.js\"></script>` + 
                            rests.join("").trim() + lasts.join("") + suffix.join(""));

                ++scriptIndex;

                break;
            }

            case "link-style": {

                let srcs = [];
                let rests = [];
                let lasts = [];
                let suffix = [];

                let found = false;
                let looper = lastCodes.codes.length;
                while ((looper > 0) && (!found)) {
                    --looper;
                    if (lastCodes.codes[looper].slice(0, 3) === "!--") {
                        suffix.unshift("<" + lastCodes.codes.pop());
                    } else {
                        found = true;
                    }
                }

                let codes = lastCodes.codes.slice(0, looper + 1);
                for (let code of codes) {
                    if (code.slice(0, 4) === "link") {
                        for (let last of lasts) {
                            rests.push(last);
                        }
                        lasts = [];
                        srcs.push(code.split("href=\"")[1].split("\"")[0]);
                        lasts.push(code.split(">").slice(1).join(">"));
                    } else if (code.slice(0, 3) === "!--") {
                        lasts.push(code.split("-->").slice(1).join("-->"));
                    } else {
                        lasts.push("<" + code);
                    }
                }

                let code = shrinkCode(`ui/pages/${basePath}/style.${styleIndex}.css`, ".css", srcs.map((src) => {
                    return @.fs.readFile.sync(@path(path, "..", src), "utf8");
                }).join("\n"));

                @.fs.makeDirs(libraryPath);
                @.fs.writeFile.sync(@path(libraryPath, `style.${styleIndex}.css`), code)

                result.push(`link rel=\"stylesheet\" href=\"/ui/pages/${basePath}/style.${styleIndex}.css\"/>` + 
                            rests.join("").trim() + lasts.join("") + suffix.join(""));

                ++styleIndex;

                break;
            }

        }

        lastCodes = null;

    };

    let content = "";
    for (let node of nodes) {
        if (content) {
            content += "<" + node;
            if (content.indexOf("-->") !== -1) {
                if (lastCodes) {
                    lastCodes.codes.push(content);
                } else {
                    result.push(content);
                }
                content = "";
            }
        } else if (node.slice(0, 3) === "!--") {
            content += node;
            if (content.indexOf("-->") !== -1) {
                if (lastCodes) {
                    lastCodes.codes.push(content);
                } else {
                    result.push(content);
                }
                content = "";
            }
        } else if (/^script[\s>]/.test(node)) {
            if (lastCodes && (lastCodes.type !== "script")) {
                pushLastCodes();
            }
            if (!lastCodes) {
                lastCodes = { "type": "script", "codes": [] };
            }
            lastCodes.codes.push(node);
        } else if (/^\/script[\s>]/.test(node)) {
            if ((!lastCodes) || (lastCodes.type !== "script")) {
                throw new Error("Script tag not correct");
            }
            lastCodes.codes.push(node);
        } else if (/^link[\s]/.test(node) && 
                   (node.indexOf("rel=\"stylesheet\"") !== -1)) {
            if (lastCodes && (lastCodes.type !== "link-style")) {
                pushLastCodes();
            }
            if (!lastCodes) {
                lastCodes = { "type": "link-style", "codes": [] };
            }
            lastCodes.codes.push(node);
        } else {
            if (lastCodes) {
                pushLastCodes();
            }
            result.push(node);
        } 
    }

    if (lastCodes) {
        pushLastCodes();
    }

    let shrinked = shrinkCode(`ui/pages/${basePath}/page.html`, ".html", result.join("<"));

    @.fs.makeDirs(libraryPath);
    @.fs.writeFile.sync(@path(libraryPath, `page.html`), shrinked);

    return shrinked;

};

const generateBundle = function (app) {

    let bundle = @.fs.relativePath(@mewchan().workingPath, @path(@mewchan().workingPath, apps[app]));

    let files = @.fs.scanFiles.sync(@path(@mewchan().workingPath, bundle), -1, (record) => {
        return true;
    });

    let jsonPath = `/ui/${app}.json`;

    let caches = {};

    for (let record of files.filter((record) => record.type === "file")) {
        let extname = @.fs.extname(record.path);
        if (bundledExtnames[extname]) {
            let path = @.fs.relativePath(@path(@mewchan().workingPath, apps[app]), record.path);
            let content = @.fs.readFile.sync(record.path).toString("utf8");
            try {
                content = shrinkCode(path, extname, content)
            } catch (error) {
                @error(`Failed to shrink code file[${path}]`);
                @error(error);
            }
            if (app === "ui") {
                caches[path] = content;
                packageJSON[path] = jsonPath;
            } else {
                caches[@.fs.resolvePath("~" + app, path)] = content;
                packageJSON[@.fs.resolvePath("~" + app, path)] = jsonPath;
            }
        }
    }

    for (let file of Object.keys(packageJSON).slice(0)) {
        if ((caches[file] === undefined) && (jsonPath === packageJSON[file])) {
            delete packageJSON[file];
        }
    }

    bundleJSONs[app] = zlib.gzipSync(JSON.stringify(caches));

    @info(`Generating UI bundle[${jsonPath}]`);

};

let schedules = Object.create(null);

const scheduleGenerateBundle = function (app) {

    if (schedules[app]) {
        return;
    }

    @info(`Schedule updating UI bundle[/ui/${app}.json]`);

    schedules[app] = true;
    @.delay(() => {
        delete schedules[app];
        generateBundle(app);
    });

};

@servlet.get("/ui/~package.json", function (request, response) {

    this.break();

    response.headers["Content-Type"] = "application/json";
    response.headers["Content-Encoding"] = "gzip";

    return @.async(function () {
        response.writer.end(zlib.gzipSync(JSON.stringify(packageJSON)), this.test);
    });

});

@servlet.get("/ui//*.json", function (request, response) {

    if (request.path === "/ui/~package.json") {
        return;
    }

    let bundle = request.path.slice(4, -5);
    if (!bundleJSONs[bundle]) {
        return;
    }

    this.break();

    response.headers["Content-Type"] = "application/json";
    response.headers["Content-Encoding"] = "gzip";

    return @.async(function () {
        response.writer.end(bundleJSONs[bundle], this.test);
    });

});

@servlet.get("/ui/pages//*", function (request, response) {

    this.break();

    let path = request.path.slice("/ui/pages/".length);

    response.headers["Content-Type"] = @.fs.mime(path);
    response.headers["Content-Encoding"] = "gzip";

    return @.async(function () {
        let content = @.fs.readFile.sync(@path(@mewchan().libraryPath, "ui", path));
        response.writer.end(zlib.gzipSync(content), this.test);
    });

});

pages.forEach((page) => {

    let innerPath = page;
    if (page[0] === "~") {
        innerPath = @.fs.resolvePath(apps[page.split("/")[0].slice(1)], "..", page);
    } else {
        innerPath = @.fs.resolvePath(apps["ui"], page);
    }

    compileHTML(@path(@mewchan().workingPath, innerPath));

    if (page === "index.html") {
        @servlet.get("/", function (request, response) {

            this.break();

            response.headers["Content-Type"] = "text/html";
            response.headers["Content-Encoding"] = "gzip";

            return @.async(function () {
                let content = @.fs.readFile.sync(@path(@mewchan().libraryPath, "ui", innerPath, "page.html"));
                response.writer.end(zlib.gzipSync(content), this.test);
            });

        });
    }

    @servlet.get("/" + page, function (request, response) {

        this.break();

        response.headers["Content-Type"] = "text/html";
        response.headers["Content-Encoding"] = "gzip";

        return @.async(function () {
            let content = @.fs.readFile.sync(@path(@mewchan().libraryPath, "ui", innerPath, "page.html"));
            response.writer.end(zlib.gzipSync(content), this.test);
        });

    });

});

let watchers = Object.create(null);

if (@.fs.exists.dir(@mewchan().entryPath)) {
    Object.keys(apps).forEach((app) => {
        watchers[app] = @.fs.watchFile(@path(@mewchan().entryPath, apps[app]), (action, type, file) => {
            if (action !== "found") {
                @info(`${type[0].toUpperCase()}${type.slice(1)}[${@.fs.relativePath(@mewchan().entryPath, file)}] ${action}`);
            }
            scheduleGenerateBundle(app);
        });
    });
}

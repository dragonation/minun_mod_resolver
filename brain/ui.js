const zlib = require("zlib");

const uiFolders = @options("uiFolders");

const shrinkingCodes = @options("shrinkingUICodes");

const bundledExtnames = Object.create(null);
bundledExtnames[".js"] = true;
bundledExtnames[".xhtml"] = true;
bundledExtnames[".css"] = true;
bundledExtnames[".json"] = true;

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
                "shrinked": code.split(/(\r|\n|\r\n)/).map(line => line.trim()).join("\n"),
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

const generateBundle = function (uiFolder) {

    let bundle = @.fs.relativePath(@mewchan().workingPath, @path(@mewchan().workingPath, uiFolder));

    let files = @.fs.scanFiles.sync(@path(@mewchan().workingPath, bundle), -1, (record) => {
        return true;
    });

    let jsonPath = `/ui/${uiFolder}.json`;

    let caches = {};

    for (let record of files.filter((record) => record.type === "file")) {
        let extname = @.fs.extname(record.path);
        if (bundledExtnames[extname]) {
            let path = @.fs.relativePath(@path(@mewchan().workingPath, uiFolder), record.path);
            let content = @.fs.readFile.sync(record.path).toString("utf8");
            try {
                content = shrinkCode(path, extname, content)
            } catch (error) {
                @error(`Failed to shrink code file[${path}]`);
                @error(error);
            }
            caches[@.fs.resolvePath(uiFolders[uiFolder], path)] = content;
            packageJSON[@.fs.resolvePath(uiFolders[uiFolder], path)] = jsonPath;
        }
    }

    for (let file of Object.keys(packageJSON).slice(0)) {
        if ((caches[file] === undefined) && (jsonPath === packageJSON[file])) {
            delete packageJSON[file];
        }
    }

    bundleJSONs[bundle] = zlib.gzipSync(JSON.stringify(caches));

    @info(`Generating UI bundle[${jsonPath}]`);

};

let schedules = Object.create(null);

const scheduleGenerateBundle = function (uiFolder) {

    if (schedules[uiFolder]) {
        return;
    }

    @info(`Schedule updating UI bundle[/ui/${uiFolder}.json]`);

    schedules[uiFolder] = true;
    @.delay(100, () => {
        delete schedules[uiFolder];
        generateBundle(uiFolder);
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

let watchers = Object.create(null);

if (@.fs.exists.dir(@mewchan().entryPath)) {
    Object.keys(uiFolders).forEach((uiFolder) => {
        watchers[uiFolder] = @.fs.watchFile(@path(@mewchan().entryPath, uiFolder), (action, type, file) => {
            if (action !== "found") {
                @info(`${type[0].toUpperCase()}${type.slice(1)}[${@.fs.relativePath(@mewchan().entryPath, file)}] ${action}`);
            }
            scheduleGenerateBundle(uiFolder);
        });
    });
}

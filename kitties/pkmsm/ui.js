const zlib = require("zlib");

@servlet.get("/~pkmsm/search/model//*", function (request, response) {

    this.break();

    let keywords = [];

    response.headers["Content-Type"] = "text/plain";

    request.path.slice("/~pkmsm/search/model/".length).split(/[\s,;\+]/).forEach((word) => {
        word = word.trim().toLowerCase();
        if (word && keywords.indexOf(word) === -1) {
            keywords.push(word);
        }
    });

    return @mew.rpc("pkmsm.searchModels", {
        "keywords": keywords
    }).then(function (models) {
        response.writer.end(@.serialize(models), this.test);
    });

});

@servlet.get("/~pkmsm/search/pokemon//*", function (request, response) {

    this.break();

    let keywords = [];

    response.headers["Content-Type"] = "text/plain";

    request.path.slice("/~pkmsm/search/pokemon/".length).split(/[\s,;\+]/).forEach((word) => {
        word = word.trim().toLowerCase();
        if (word && keywords.indexOf(word) === -1) {
            keywords.push(word);
        }
    });

    return @mew.rpc("pkmsm.searchPokemons", {
        "keywords": keywords
    }).then(function (models) {
        response.writer.end(@.serialize(models), this.test);
    });

});

@servlet.get("/~pkmsm/model/pokemon-*", function (request, response) {

    this.break();

    let path = request.path.slice("/~pkmsm/model/".length).split("/");
    if (!/^pokemon-([0-9]+)-([0-9]+)$/.test(path[0])) {
        throw new Error("Invalid pokemon model");
    }

    let pokemon = parseInt(path[0].split("-")[1]);
    let model = parseInt(path[0].split("-")[2]);

    let shiny = path.slice(1).filter(x => x === "shiny").length > 0;

    return @mew.rpc("pkmsm.loadModel", {
        "pokemon": pokemon,
        "model": model,
        "shiny": shiny,
        "shadow": true
    }).then(function (model) {
        response.headers["Content-Type"] = "application/json";
        response.writer.end(JSON.stringify(model), this.test);
    });

});

@servlet.get("/~pkmsm/model/res//*", function (request, response) {

    this.break();

    let path = @path(@mewchan().libraryPath, "pkmsm/models", request.path.slice("/~pkmsm/model/res/".length));

    let mime = @.fs.mime(path);

    return @.async(function () {

        if (!@.fs.exists.file(path)) {
            throw @.error.http(404);
        }

        @.fs.readFile(path).then(function (content) {

            response.headers["Content-Type"] = mime;
            response.headers["Content-Encoding"] = "gzip";

            response.writer.end(zlib.gzipSync(content), this.test);

        }).pipe(this);

    });

});

@servlet.get("/~pkmsm/model/bin//*", function (request, response) {

    this.break();

    let path = @path(@mewchan().libraryPath, "pkmsm/models", request.path.slice("/~pkmsm/model/bin/".length));

    let data = {};

    return @.async(function () {

        @.fs.scanFiles(path, -1, (record) => {
            return (record.type === "dir") || (@.fs.extname(record.path) === ".bin");
        }).then(function (records) {
            this.next(records.filter((record) => record.type === "file").map((record) => {
                return @.fs.relativePath(path, record.path);
            }));
        }).pipe(this);

    }).all(function (file) {

        @.fs.readFile(@path(path, file)).then(function (binary) {

            data[file] = binary.toString("base64");

            this.next();

        }).pipe(this);

    }).then(function () {

        response.headers["Content-Type"] = "application/json";
        response.headers["Content-Encoding"] = "gzip";

        response.writer.end(zlib.gzipSync(JSON.stringify(data)), this.test);

    });

});

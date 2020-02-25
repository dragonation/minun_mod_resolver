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

    return @mew.rpc("pkmsm.loadModel", {
        "pokemon": pokemon,
        "model": model,
    }, {
        "timeout": 20000
    }).then(function (model) {
        response.headers["Content-Type"] = "application/json";
        response.writer.end(JSON.stringify(model), this.test);
    });

});

@servlet.get("/~pkmsm/model/res//*", function (request, response) {

    this.break();

    let originPath = request.path.slice("/~pkmsm/model/res/".length);

    let path = @path(@mewchan().libraryPath, "pkmsm/models", originPath);

    let mime = @.fs.mime(path);

    return @.async(function () {

        if (!@.fs.exists.file(path)) {
            if ((originPath.split("/")[1] === "shadow") && 
                (originPath.split("/")[2] === "textures")) {
                // TODO: make it supports shiny shadow
                path = @path(@mewchan().libraryPath, "pkmsm/models", 
                    originPath.split("/")[0], "normal-" + originPath.split("/").slice(2).join("/"));
                if (!@.fs.exists.file(path)) {
                    throw @.error.http(404);
                }
            } else {
                throw @.error.http(404);
            }
        }

        @.fs.readFile(path).then(function (content) {

            response.headers["Content-Type"] = mime;
            response.headers["Content-Encoding"] = "gzip";

            response.writer.end(zlib.gzipSync(content), this.test);

        }).pipe(this);

    });

});

@servlet.get("/~pkmsm/model/data/mesh//*", function (request, response) {

    this.break();

    let path = @path(@mewchan().libraryPath, "pkmsm/models", request.path.slice("/~pkmsm/model/data/mesh/".length));

    let data = {};

    return @.async(function () {

        @.fs.readFile(@path(path, "mesh.data.json")).pipe(this);
        
    }).then(function (data) {

        response.headers["Content-Type"] = "application/json";
        response.headers["Content-Encoding"] = "gzip";

        response.writer.end(zlib.gzipSync(data), this.test);

    });

});

@servlet.get("/~pkmsm/model/data/animation//*", function (request, response) {

    this.break();

    let path = @path(@mewchan().libraryPath, "pkmsm/models", request.path.slice("/~pkmsm/model/data/animation/".length));

    let data = {};

    return @.async(function () {

        @.fs.readFile(@path(path, "animation.data.json")).pipe(this);
        
    }).then(function (data) {

        response.headers["Content-Type"] = "application/json";
        response.headers["Content-Encoding"] = "gzip";

        response.writer.end(zlib.gzipSync(data), this.test);

    });

});

@servlet.get("/~pkmsm/model/files//*", function (request, response) {

    let id = request.path.slice("/~pkmsm/model/files/".length);

    let pokemon = parseInt(id.split("-")[1]);
    let model = parseInt(id.split("-")[2]);

    let basePath = @path(@mewchan().libraryPath, "pkmsm/models", `pokemon-${("00" + pokemon).slice(-3)}-${model}`);

    return @mew.rpc("pkmsm.loadModel", {
        "pokemon": pokemon,
        "model": model
    }, {
        "timeout": 30000
    }).then(function () {

        @.fs.scanFiles(basePath, -1, (record) => {
            return ((record.type === "dir") || 
                    ([".png", ".vert", ".frag"].indexOf(@.fs.extname(record.path)) !== -1));
        }).pipe(this);

    }).then(function (records) {

        let files = records.filter((record) => record.type === "file").map((record) => {
            return @.fs.relativePath(basePath, record.path);
        });

        response.headers["Content-Type"] = "text/plain";

        response.writer.end(files.join("\n"), this.test);

    });

});

@servlet.get("/~pkmsm/model/save//*", function (request, response) {

    this.break();

    let id = request.path.slice("/~pkmsm/model/save/".length);

    let pokemon = parseInt(id.split("-")[1]);
    let model = parseInt(id.split("-")[2]);

    return @mew.rpc("pkmsm.exportModel", {
        "pokemon": pokemon,
        "model": model
    }, {
        "timeout": 30000
    }).then(function (file) {

        response.headers["Content-Type"] = "application/octet-stream";
        response.headers["Content-Disposition"] = `attachment; filename="${id}.m3d"`;

        response.writer.end(@.fs.readFile.sync(file), this.test);

    });

});

@servlet.get("/~pkmsm/model/download//*", function (request, response) {

    this.break();

    let id = request.path.slice("/~pkmsm/model/download/".length);

    return @.async(function () {

        let path = @path(@mewchan().documentPath, "pkmsm", id);

        @.fs.readFile(path).then(function (content) {

            response.headers["Content-Type"] = @.fs.mime(path);
            response.headers["Content-Encoding"] = "gzip";

            response.writer.end(zlib.gzipSync(content), this.test);

        }).pipe(this);

    });

});

@servlet.post("/~pkmsm/model/export//*.png", function (request, response) {

    this.break();

    let id = request.path.slice("/~pkmsm/model/export/".length);

    let fileID = @.format.date(new Date(), "MM.DD.hh.mm.ss");

    let dirname = @.fs.dirname(id);
    if (dirname === ".") {
        dirname = "/";
    } else {
        dirname = "/" + dirname;
    }
    let filePath = "snapshots" + dirname + "/" + @.fs.basename(id) + "_" + fileID + ".png";

    let path = @path(@mewchan().documentPath, "pkmsm", filePath);

    return @.stream.string(request.reader).then(function (base64) {

        @.fs.makeDirs(@.fs.dirname(path));

        @.fs.writeFile(path, Buffer.from(base64, "base64")).pipe(this);

    }).then(function () {

        response.headers["Content-Type"] = "text/plain";

        response.writer.end("/~pkmsm/model/download/" + filePath, this.test);

    }).resolve();

});
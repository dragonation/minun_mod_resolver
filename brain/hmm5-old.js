@servlet.get("/pak//*", function (request, response) {

    this.break();

    if (request.get.download === "yes") {
        response.headers["Content-Type"] = "application/x-download";
    } else {
        let extname = @.fs.extname(request.path.toLowerCase());
        switch (extname) {
            case ".xdb": {
                response.headers["Content-Type"] = "application/xml";
                break;
            };
            case ".dds": {
                response.headers["Content-Type"] = "image/vnd.ms-dds";
                break;
            };
            default: {
                response.headers["Content-Type"] = @.fs.mime(extname);
                break;
            };
        }
    }

    return @mew.rpc("hmm5.loadContent", {
        "path": request.path.slice(5)
    }).then(function (binary) {
        response.writer.end(binary, this.test);
    });

});

@servlet.get("/list/models//*", function (request, response) {

    this.break();

    let keywords = [];

    response.headers["Content-Type"] = "text/plain";

    request.path.slice("/list/models/".length).split(/[\s,;\+]/).forEach((word) => {
        word = word.trim().toLowerCase();
        if (word && keywords.indexOf(word) === -1) {
            keywords.push(word);
        }
    });

    return @mew.rpc("hmm5.listModels", {
        "keywords": keywords
    }).then(function (models) {
        response.writer.end(models.join("\n"), this.test);
    });

});

@servlet.get("/list/tokens//*", function (request, response) {

    this.break();

    let keywords = [];

    response.headers["Content-Type"] = "text/plain";

    request.path.slice("/list/tokens/".length).split(/[\s,;\+]/).forEach((word) => {
        word = word.trim().toLowerCase();
        if (word && keywords.indexOf(word) === -1) {
            keywords.push(word);
        }
    });

    return @mew.rpc("hmm5.listTokens", {
        "keywords": keywords
    }).then(function (tokens) {
        response.writer.end(tokens.join("\n"), this.test);
    });

});

@servlet.get("/list/deps//*", function (request, response) {

    this.break();

    response.headers["Content-Type"] = "text/plain";

    let path = request.path.slice("/list/deps".length);

    let hash = request.get.hash;

    let link = path;
    if (hash) {
        link += "#" + hash;
    }

    return @mew.rpc("hmm5.analyzeDependencies", {
        "link": link
    }).then(function (files) {
        response.writer.end(files.join("\n"), this.test);
    });

});

// @servlet.get("/zip//*", function (request, response) {

// });

// @servlet.get("/m3d//*", function (request, response) {

// });

@servlet.get("/wav//*", function (request, response) {

    this.break();

    response.headers["Content-Type"] = "audio/x-wav";

    return @mew.rpc("hmm5.loadContent", {
        "path": request.path.slice(5)
    }).then(function (binary) {
        response.writer.end(binary, this.test);
    });

});

@servlet.get("/skel//*", function (request, response) {

    this.break();

    response.headers["Content-Type"] = "application/json";

    let uid = request.path.slice(6).split("/").slice(-1)[0];

    return @mew.rpc("hmm5.loadSkeleton", {
        "uid": uid
    }).then(function (instance) {
        response.writer.end(@.serialize(instance), this.test);
    });

});

@servlet.get("/anim//*", function (request, response) {

    this.break();

    response.headers["Content-Type"] = "application/json";

    let uid = request.path.slice(6).split("/").slice(-1)[0];

    return @mew.rpc("hmm5.loadAnimation", {
        "uid": uid
    }).then(function (instance) {
        response.writer.end(@.serialize(instance), this.test);
    });

});

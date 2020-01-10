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

@servlet.get("/~pkmsm/model//*", function (request, response) {

    this.break();

    let path = request.path.slice("/~pkmsm/model/".length).split("/");
    if (!/^pokemon-([0-9]+)-([0-9]+)$/.test(path[0])) {
        throw new Error("Invalid pokemon model");
    }

    let pokemon = parseInt(path[0].split("-")[1]);
    let model = parseInt(path[0].split("-")[2]);

    let shiny = path.slice(1).filter(x => x === "shiny").length > 1;
    let shadow = path.slice(1).filter(x => x === "shadow").length > 1;

    response.headers["Content-Type"] = "text/plain";

    return @mew.rpc("pkmsm.loadModel", {
        "pokemon": pokemon,
        "model": model,
        "shiny": shiny,
        "shadow": shadow
    }).then(function (model) {
        response.writer.end("hhhh", this.test);
    });

});

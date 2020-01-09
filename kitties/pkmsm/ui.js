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
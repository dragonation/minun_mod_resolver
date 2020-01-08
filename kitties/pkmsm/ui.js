@servlet.get("/~pkmsm/search//*", function (request, response) {

    this.break();

    let keywords = [];

    response.headers["Content-Type"] = "application/json";

    request.path.slice("/~pkmsm/search/".length).split(/[\s,;\+]/).forEach((word) => {
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
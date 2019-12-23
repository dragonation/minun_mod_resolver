@import("js.zip");

const Index = require("./index.js");

const options = @.merge.advanced({
    "path": {
        "!valueType": "string"
    }
}, @options());

if (!options.path) {
    @warn("No paths configured for Pokemon Ultra Sun/Moon a.0.9.4 folder");
}

@info(`Loading Index from ${options.path}`);

const index = new Index(options.path);

@heard.rpc("pkmsm.searchModels").then(function (request) {

    return index.then(function () {

        for (let model of index.pokemons) {

        }

    });

});

@heard.rpc("pkmsm.loadModel").then(function (request) {

});

@import("js.zip");

const { Index } = require("./index.js");

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

@heard.rpc("pkmsm.searchPokemons").then(function (request) {

    const pokemonBaseScore = 100;

    let keywords = request.keywords.map((keyword) => keyword.trim().toLowerCase());

    let pokemons = Object.create(null);

    for (let pokemon of Index.list) {
        let score = 0;
        for (let keyword of keywords) {
            if ((pokemon.id + "").indexOf(keyword) !== -1) {
                score += pokemonBaseScore;
            } 
            if (pokemon.name.indexOf(keyword) !== -1) {
                score += pokemonBaseScore;
            }
        }
        if (score) {
            pokemons[pokemon.id] = {
                "id": pokemon.id,
                "score": score,
                "pokemon": pokemon
            };
        }
    }

    let result = Object.keys(pokemons).map((id) => pokemons[id]).sort((a, b) => b.score - a.score);

    return @.async.resolve(result);

});

@heard.rpc("pkmsm.searchModels").then(function (request) {

    const modelBaseScore = 50;

    return @mew.rpc("pkmsm.searchPokemons", {
        "keywords": request.keywords
    }).then(function (list) {

        let keywords = request.keywords.map((keyword) => keyword.trim().toLowerCase());

        let pokemons = Object.create(null);
        for (let pokemon of list) {
            pokemons[pokemon.id] = pokemon;
        }

        index.then(function () {

            let models = [];

            for (let pokemon of index.pokemons) {
                if (pokemons[pokemon.id] || (list.length === 0)) {
                    for (let looper = 0; looper < pokemon.models.length; ++looper) {
                        let model = pokemon.models[looper];
                        let score = 0;
                        if (pokemons[pokemon.id]) {
                            score = pokemons[pokemon.id].score;
                        }
                        for (let feature of model.features) {
                            for (let keyword of keywords) {
                                if (feature.indexOf(keyword) !== -1) {
                                    score += modelBaseScore;
                                }
                            }
                        }
                        models.push({
                            "id": `pokemon-${("00" + pokemon.id).slice(-3)}-${looper}`,
                            "file": model.file,
                            "score": score,
                            "pokemon": Index.list[parseInt(pokemon.id) - 1],
                            "features": model.features,
                        });
                    }
                }
            }

            @dump(models.length);

            this.next(models.sort((a, b) => b.score - a.score));

        }).pipe(this);

    });

});

@heard.rpc("pkmsm.listModels").then(function (request) {

});

@heard.rpc("pkmsm.loadModel").then(function (request) {

});

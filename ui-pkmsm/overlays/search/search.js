const Overlay = function Overlay(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

Overlay.parameters = {
    "scope": "pokemon"
};

Overlay.prototype.searchPokemonsWithKeyword = function (keyword, version) {

    $.ajax("/~pkmsm/search/pokemon/" + keyword, {
        "success": (data, status, request) => {

            if (version !== this.searchVersion) {
                return;
            }

            let parsed = $.serial.deserialize(data);
            let items = parsed.map((pokemon) => ({

                // "id": pokemon.id,
                "id": `pokemon-${("00" + pokemon.id).slice(-3)}-0`,

                "snapshot": `pokemon-${("00" + pokemon.id).slice(-3)}-0`,

                "pokemon": {
                    "id": pokemon.id,
                    "name": pokemon.name,
                    "color": pokemon.color,
                    "types": pokemon.types,
                },

                "type": "pokemon",

                "features": []

            }));

            this.filler.fill({
                "results": items
            });

        }
    });

};

Overlay.prototype.searchModelsWithKeyword = function (keyword, version) {

    $.ajax("/~pkmsm/search/model/" + keyword, {
        "success": (data, status, request) => {

            if (version !== this.searchVersion) {
                return;
            }

            let parsed = $.serial.deserialize(data);

            let items = parsed.map((model) => ({

                "id": model.id,

                "snapshot": model.id,

                "pokemon": {
                    "id": model.pokemon.id,
                    "name": model.pokemon.name,
                    "color": model.pokemon.color,
                    "types": model.pokemon.types,
                },

                "type": "model",

                "features": model.features

            }));

            this.filler.fill({
                "results": items
            });

        }
    });

};

Overlay.prototype.searchWithKeyword = function (keyword) {

    let version = $.uuid();
    this.searchVersion = version;
    if (!keyword) {
        this.filler.fill({
            "results": []
        });
        return;
    }

    this.searchKeyword = keyword;

    switch (this.filler.parameters.scope) {
        case "pokemon": {
            this.searchPokemonsWithKeyword(keyword, version); break;
        };
        case "model": {
            this.searchModelsWithKeyword(keyword, version); break;
        };
        default: {
            this.searchPokemonsWithKeyword(keyword, version); break;
        };
    }

};

Overlay.prototype.updateSearches = function () {

    this.searchWithKeyword(this.searchKeyword);

};

Overlay.functors = {
    "smartOpen": function (item) {

        $.app("pkmsm").smartOpen(item.id);

        this.dom.hideOverlay();

    },
    "searchForPokemons": function () {
        this.filler.fill({
            "scope": "pokemon"
        });
        this.updateSearches();
    },
    "searchForModels": function () {
        this.filler.fill({
            "scope": "model"
        });
        this.updateSearches();
    }
};

module.exports.Overlay = Overlay;

const Overlay = function Overlay(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

Overlay.parameters = {
    "scope": "pokemon"
};

Overlay.prototype.searchPokemonsWithKeyword = function (keyword) {

    $.ajax("/~pkmsm/search/pokemon/" + keyword, {
        "success": (data, status, request) => {

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

Overlay.prototype.searchModelsWithKeyword = function (keyword) {

    $.ajax("/~pkmsm/search/model/" + keyword, {
        "success": (data, status, request) => {

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

    if (!keyword) {
        this.filler.fill({
            "results": []
        });
        return;
    }

    this.searchKeyword = keyword;

    switch (this.filler.parameters.scope) {
        case "pokemon": {
            this.searchPokemonsWithKeyword(keyword); break;
        };
        case "model": {
            this.searchModelsWithKeyword(keyword); break;
        };
        default: {
            this.searchPokemonsWithKeyword(keyword); break;
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

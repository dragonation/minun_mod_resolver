@import("js.zip");

const makeF16 = function (value) {
    if (value === 0) { return 0; }
    let raw = value;
    let log = Math.floor(Math.log10(Math.abs(value)));
    let base = parseFloat((Math.pow(10, -log) * value).toPrecision(6));
    value = parseFloat(`${base}e${log}`);
    if (Math.abs(value) < 0.000001) {
        value = 0;
    }
    return value;
};

const makeUniform = function (value) {
    if (typeof value === "boolean") {
        return value ? "0" : "1"
    }
    if (value instanceof Array) {
        return value.map(makeUniform).join(",");
    }
    return makeF16(value) + "";
};

const mxmlOptions = {
    "parser": "text/mxml",
    "functors": {
        "f16": function (templates, call, parameters, options, value) {
            return makeF16(value);
        },
        "uniform": function (templates, call, parameters, options, value) {
            return makeUniform(value);
        }
    }
};


const modelSkeletonTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                                       "data/pkm/templates/model/skeleton.mxml"), 
                                                 "utf8");
const modelMaterialTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                                       "data/pkm/templates/model/material.mxml"), 
                                                 "utf8");
const modelMeshTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                                   "data/pkm/templates/model/mesh.mxml"), 
                                             "utf8");

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
            pokemons[pokemon.id] = @.merge.simple({
                "score": score,
            }, pokemon);
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

            this.next(models.sort((a, b) => b.score - a.score));

        }).pipe(this);

    });

});

@heard.rpc("pkmsm.listModels").then(function (request) {

});

@heard.rpc("pkmsm.loadModel").then(function (request) {

    let options = {
        "motions": [ "fighting", "pet", "map", "acting"],
        "shiny": request.shiny,
        "shadow": request.shadow
    };

    return index.then(function (index) {

        index.loadPokemon(request.pokemon, request.model, options, (pc, loaded, total) => {
            @debug(`Loading pokemon-${request.pokemon}-${request.model} package[${pc.usage}]`);
        }).pipe(this);

    }).then(function (pcs) {

        let model = pcs.model.files[0];

        let shadow = pcs.model.files[1];

        model.toJSON(pcs, options).then(function (json) {

            if (!options.shadow) {
                this.next(json);
                return;
            }

            shadow.toJSON(pcs, Object.assign(options, {
                "isShadow": true
            })).then(function (shadowJSON) {

                json.shadow = shadowJSON;

                this.next(json);

            }).pipe(this);

        }).pipe(this);

    }).then(function (json) {

        let id = `pokemon-${request.pokemon}-${request.model}/${options.shiny ? "shiny" : "normal"}`;

        const saveModel = (id, json, extra) => {

            let animations = {};
            for (let action in json.animations) {
                animations[action] = `@animations/${action}.json`;
                let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "animations", action + ".json");
                @.fs.makeDirs(@.fs.dirname(path));
                @.fs.writeFile.sync(path, @.serialize(json.animations[action]));
            }

            let shaders = {};
            for (let shader in json.shaders.fragments) {
                shaders[shader] = `@shaders/${shader}.frag`;
                let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "shaders", shader + ".frag");
                @.fs.makeDirs(@.fs.dirname(path));
                @.fs.writeFile.sync(path, json.shaders.fragments[shader]);
            }

            for (let shader in json.shaders.vertices) {
                shaders[shader] = `@shaders/${shader}.vert`;
                let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "shaders", shader + ".vert");
                @.fs.makeDirs(@.fs.dirname(path));
                @.fs.writeFile.sync(path, json.shaders.vertices[shader]);
            }

            let makeU8TextureBuffer = (array) => {
                let buffer = Buffer.alloc(array.length);
                for (let looper = 0; looper < array.length; ++looper) {
                    buffer.writeUInt8(array[looper], looper);
                }
                return buffer;
            };

            let textures = {};
            for (let texture in json.textures) {
                textures[texture] = `@textures/${texture}.png`;
                let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "textures", texture + ".png");
                @.fs.makeDirs(@.fs.dirname(path));
                let data = json.textures[texture].data;
                @.fs.writeFile.sync(path, @.img(data.width, data.height, makeU8TextureBuffer(data.pixels)).encodeAsPNG());
            }

            let makeU8LUTBuffer = (array) => {
                let size = array.length / 3;
                let buffer = Buffer.alloc(size * 4);
                for (let looper = 0; looper < size; ++looper) {
                    buffer.writeUInt8(array[looper * 3], looper * 4);
                    buffer.writeUInt8(array[looper * 3 + 1], looper * 4 + 1);
                    buffer.writeUInt8(array[looper * 3 + 2], looper * 4 + 2);
                    buffer.writeUInt8(255, looper * 4 + 3);
                }
                return buffer;
            };

            let luts = {};
            for (let lut in json.luts) {
                luts[lut] = `@luts/${json.luts[lut].name}.png`;
                let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "luts", json.luts[lut].name + ".png");
                @.fs.makeDirs(@.fs.dirname(path));
                let data = json.luts[lut].data;
                @.fs.writeFile.sync(path, @.img(data.width, data.height, makeU8LUTBuffer(data.pixels)).encodeAsPNG());
            }

            let materials = {};
            for (let material in json.materials) {
                materials[material] = `@materials/${material}.json`;
                let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "materials", material + ".json");
                @.fs.makeDirs(@.fs.dirname(path));
                @.fs.writeFile.sync(path, JSON.stringify(json.materials[material], null, 4));
                @.fs.writeFile.sync(@.fs.changeExtname(path, ".xml"), 
                                @.format(modelMaterialTemplate, { "material": json.materials[material] }, mxmlOptions));
            }

            let saveF32Buffer = (array, path) => {
                @.fs.makeDirs(@.fs.dirname(path));
                let buffer = Buffer.alloc(array.length * 4);
                for (let looper = 0; looper < array.length; ++looper) {
                    buffer.writeFloatLE(array[looper], looper * 4);
                }
                @.fs.writeFile.sync(path, buffer);
            };
            let saveUI16Buffer = (array, path) => {
                @.fs.makeDirs(@.fs.dirname(path));
                let buffer = Buffer.alloc(array.length * 2);
                for (let looper = 0; looper < array.length; ++looper) {
                    buffer.writeUInt16LE(array[looper], looper * 2);
                }
                @.fs.writeFile.sync(path, buffer);
            };
            let saveU8Buffer = (array, path) => {
                @.fs.makeDirs(@.fs.dirname(path));
                let buffer = Buffer.alloc(array.length);
                for (let looper = 0; looper < array.length; ++looper) {
                    buffer.writeUInt8(array[looper], looper);
                }
                @.fs.writeFile.sync(path, buffer);
            };

            let meshes = [];
            for (let looper = 0; looper < json.meshes.length; ++looper) {
                let mesh = json.meshes[looper];
                let record = {
                    "name": mesh.name,
                    "bones": mesh.bones,
                    "material": mesh.material,
                    "attributes": {
                        "bones": {},
                        "indices": {},
                        "uvs": []
                    }
                };
                meshes.push(`@meshes/${looper}-${mesh.name}.json`);
                let attributes = mesh.attributes;
                if (attributes.bones.indices) {
                    record.attributes.bones.indices = `@meshes/${looper}-${mesh.name}/bone.indices.f32.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "bone.indices.f32.bin");
                    saveF32Buffer(attributes.bones.indices, path);
                }
                if (attributes.bones.weights) {
                    record.attributes.bones.weights = `@meshes/${looper}-${mesh.name}/bone.weights.f32.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "bone.weights.f32.bin");
                    saveF32Buffer(attributes.bones.weights, path);
                }
                if (attributes.positions) {
                    record.attributes.positions = `@meshes/${looper}-${mesh.name}/positions.f32.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "positions.f32.bin");
                    saveF32Buffer(attributes.positions, path);
                }
                if (attributes.normals) {
                    record.attributes.normals = `@meshes/${looper}-${mesh.name}/normals.f32.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "normals.f32.bin");
                    saveF32Buffer(attributes.normals, path);
                }
                if (attributes.tangents) {
                    record.attributes.tangents = `@meshes/${looper}-${mesh.name}/tangents.f32.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "tangents.f32.bin");
                    saveF32Buffer(attributes.tangents, path);
                }
                for (let looper2 = 0; looper2 < attributes.uvs.length; ++looper2) {
                    if (attributes.uvs[looper2]) {
                        record.attributes.uvs[looper2] = `@meshes/${looper}-${mesh.name}/uvs[${looper2}].f32.bin`;
                        let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, `uvs[${looper2}].f32.bin`);
                        saveF32Buffer(attributes.uvs[looper2], path);
                    }   
                }
                if (attributes.indices.vertices) {
                    record.attributes.indices.vertices = `@meshes/${looper}-${mesh.name}/indices.vertices.ui16.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "indices.vertices.ui16.bin");
                    saveUI16Buffer(attributes.indices.vertices, path);
                }
                if (attributes.indices.geometry) {
                    record.attributes.indices.vertices = `@meshes/${looper}-${mesh.name}/indices.geometry.f32.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "indices.geometry.f32.bin");
                    saveF32Buffer(attributes.indices.geometry, path);
                }
                if (attributes.colors) {
                    record.attributes.colors = `@meshes/${looper}-${mesh.name}/colors.u8.bin`;
                    let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}`, "colors.u8.bin");
                    saveU8Buffer(attributes.colors, path);
                }
                let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "meshes", `${looper}-${mesh.name}.json`);
                @.fs.makeDirs(@.fs.dirname(path));
                @.fs.writeFile.sync(path, JSON.stringify(record, null, 4));
                @.fs.writeFile.sync(@.fs.changeExtname(path, ".xml"), 
                                    @.format(modelMeshTemplate, { 
                                        "index": looper,
                                        "mesh": mesh
                                    }, mxmlOptions));
            }

            let path = @path(@mewchan().libraryPath, "pkmsm/models", id, "skeleton.json");
            @.fs.makeDirs(@.fs.dirname(path));
            @.fs.writeFile.sync(path, JSON.stringify(json.bones, null, 4));
            @.fs.writeFile.sync(@.fs.changeExtname(path, ".xml"), 
                                @.format(modelSkeletonTemplate, { "bones": json.bones }, mxmlOptions));

            let model = {
                "skeleton": "@skeleton.json",
                "materials": materials,
                "meshes": meshes,
                "animations": animations,
                "shaders": shaders,
                "textures": textures,
                "luts": luts,
                "name": json.name
            };
            if (extra) {
                Object.assign(model, extra);
            }

            path = @path(@mewchan().libraryPath, "pkmsm/models", id, "model.json");
            @.fs.makeDirs(@.fs.dirname(path));
            @.fs.writeFile.sync(path, JSON.stringify(model, null, 4));

            return model;

        };

        let extra = {};
        if (options.shadow && json.shadow) {
            saveModel(`${id}/shadow`, json.shadow);
            extra.shadow = "@shadow/model.json";
        }
        let model = saveModel(id, json, extra);

        // this.next(Object.assign({}, model));
        this.next({});

    });

});

@import("js.zip");

const { Index } = require("./index.js");
const { Model } = require("./model.js");

let f16s = Object.create(null);
const makeF16 = function (value) {
    if (value === 0) { return 0; }
    if (f16s[value]) {
        return f16s[value][0];
    }
    let raw = value;
    let log = Math.floor(Math.log10(Math.abs(value)));
    let base = parseFloat((Math.pow(10, -log) * value).toPrecision(6));
    value = parseFloat(`${base}e${log}`);
    if (Math.abs(value) < 0.000001) {
        value = 0;
    }
    f16s[raw] = [value];
    return value;
};

const makeUniform = function (value) {
    if (typeof value === "boolean") {
        return value;
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


const modelAnimationTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                                        "data/pkm/templates/model/animation.mxml"), 
                                                  "utf8");
const modelSkeletonTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                                       "data/pkm/templates/model/skeleton.mxml"), 
                                                 "utf8");
const modelMaterialTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                                       "data/pkm/templates/model/material.mxml"), 
                                                 "utf8");
const modelMeshTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                                   "data/pkm/templates/model/mesh.mxml"), 
                                             "utf8");

const modelTemplate = @.fs.readFile.sync(@path(@mewchan().entryPath, 
                                               "data/pkm/templates/model/model.mxml"), 
                                         "utf8");


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


let saveF32Buffer = (array, path, dict) => {
    let array2 = [];
    for (let element of array) {
        if (element instanceof Array) {
            for (let value of element) {
                array2.push(value);
            }
        } else {
            array2.push(element);
        }
    }
    if (!dict) {
        @.fs.makeDirs(@.fs.dirname(path));
    }
    let buffer = Buffer.alloc(array2.length * 4);
    for (let looper = 0; looper < array2.length; ++looper) {
        buffer.writeFloatLE(array2[looper], looper * 4);
    }
    if (dict) {
        dict[path] = buffer.toString("base64");
    } else {
        @.fs.writeFile.sync(path, buffer);
    }
};
let saveU16Buffer = (array, path, dict) => {
    if (!dict) {
        @.fs.makeDirs(@.fs.dirname(path));
    }
    let buffer = Buffer.alloc(array.length * 2);
    for (let looper = 0; looper < array.length; ++looper) {
        buffer.writeUInt16LE(array[looper], looper * 2);
    }
    if (dict) {
        dict[path] = buffer.toString("base64");
    } else {
        @.fs.writeFile.sync(path, buffer);
    }
};
let saveU8Buffer = (array, path, dict) => {
    if (!dict) {
        @.fs.makeDirs(@.fs.dirname(path));
    }
    let buffer = Buffer.alloc(array.length);
    for (let looper = 0; looper < array.length; ++looper) {
        buffer.writeUInt8(array[looper], looper);
    }
    if (dict) {
        dict[path] = buffer.toString("base64");
    } else {
        @.fs.writeFile.sync(path, buffer);
    }
};


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
            if (pokemon.name.toLowerCase().indexOf(keyword) !== -1) {
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

    let id = `pokemon-${request.pokemon}-${request.model}`;

    let basePath = @path(@mewchan().libraryPath, "pkmsm/models", id);

    if (@.fs.exists(@path(basePath, "model.ready"))) {
        return @.fs.readFile(@path(basePath, "model.json"), "utf8").then(function (data) {
            this.next(JSON.parse(data));
        });
    }

    let options = {
        "motions": [ "fighting", "pet", "map", "acting"],
        "shiny": true,
        "shadow": true
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

        const saveModel = (id, json, extra) => {

            let basePath = @path(@mewchan().libraryPath, "pkmsm/models", id);

            let dict = {};

            let mxmls = {};
            for (let animation in json.animations) {

                let record = json.animations[animation];

                let interpolated = Model.interpolateJSONAnimation(json.animations[animation]);

                let animationPath = @path(basePath, "animations", animation);

                saveF32Buffer(interpolated.times, @.fs.resolvePath("animations", animation, "times.f32.bin"), dict);
                for (let material in interpolated.tracks.materials) {
                    for (let path in interpolated.tracks.materials[material]) {
                        saveF32Buffer(interpolated.tracks.materials[material][path].frames, 
                                      @.fs.resolvePath("animations", animation, "materials", material, path + ".f32.bin"),
                                      dict);
                    }
                }
                for (let bone in interpolated.tracks.bones) {
                    for (let path in interpolated.tracks.bones[bone]) {
                        saveF32Buffer(interpolated.tracks.bones[bone][path].frames, 
                                      @.fs.resolvePath("animations", animation, "bones", bone, path + ".f32.bin"), 
                                      dict);
                    }
                }

                let xml = @.format(modelAnimationTemplate, { 
                    "animation": interpolated 
                }, mxmlOptions);

                mxmls[`animations/${animation}.xml`] = xml;

            }

            let path = @path(basePath, "animation.data.json");
            @.fs.makeDirs(@.fs.dirname(path));
            @.fs.writeFile.sync(path, JSON.stringify(dict));
            @.fs.writeFile.sync(@path(basePath, "animation.xml"), 
                                Object.keys(mxmls).map((key) => mxmls[key]).join("\n\n"));

            dict = {};
            mxmls = {};

            for (let shader in json.shaders.fragments) {
                let path = @path(basePath, "shaders", shader + ".frag");
                @.fs.makeDirs(@.fs.dirname(path));
                @.fs.writeFile.sync(path, json.shaders.fragments[shader]);
            }

            for (let shader in json.shaders.vertices) {
                let path = @path(basePath, "shaders", shader + ".vert");
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

            if (id.split("/").slice(-1)[0] === "shadow") {
                for (let texture in json.textures.shadow) {
                    let path = @path(basePath, "textures", texture + ".png");
                    @.fs.makeDirs(@.fs.dirname(path));
                    let data = json.textures.shadow[texture].data;
                    @.fs.writeFile.sync(path, @.img(data.width, data.height, makeU8TextureBuffer(data.pixels)).encodeAsPNG());
                }
            } else {
                for (let texture in json.textures.normal) {
                    let path = @path(basePath, "normal-textures", texture + ".png");
                    @.fs.makeDirs(@.fs.dirname(path));
                    let data = json.textures.normal[texture].data;
                    @.fs.writeFile.sync(path, @.img(data.width, data.height, makeU8TextureBuffer(data.pixels)).encodeAsPNG());
                }
                for (let texture in json.textures.shiny) {
                    let path = @path(basePath, "shiny-textures", texture + ".png");
                    @.fs.makeDirs(@.fs.dirname(path));
                    let data = json.textures.shiny[texture].data;
                    @.fs.writeFile.sync(path, @.img(data.width, data.height, makeU8TextureBuffer(data.pixels)).encodeAsPNG());
                }
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

            for (let lut in json.luts) {
                let path = @path(basePath, "luts", json.luts[lut].name + ".png");
                @.fs.makeDirs(@.fs.dirname(path));
                let data = json.luts[lut].data;
                @.fs.writeFile.sync(path, @.img(data.width, data.height, makeU8LUTBuffer(data.pixels)).encodeAsPNG());
            }

            for (let material in json.materials) {
                mxmls[`materials/${material}.xml`] = @.format(modelMaterialTemplate, { "material": json.materials[material] }, mxmlOptions);
            }

            let mins = [Infinity, Infinity, Infinity];
            let maxes = [-Infinity, -Infinity, -Infinity];

            for (let looper = 0; looper < json.meshes.length; ++looper) {
                let mesh = json.meshes[looper];
                let attributes = mesh.attributes;
                if (attributes.bones.indices) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "bone.indices.f32.bin");
                    saveF32Buffer(attributes.bones.indices, path, dict);
                }
                if (attributes.bones.weights) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "bone.weights.f32.bin");
                    saveF32Buffer(attributes.bones.weights, path, dict);
                }
                if (attributes.positions) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "positions.f32.bin");
                    for (let looper = 0; looper < attributes.positions.length; looper += 3) {
                        if (mins[looper] > attributes.positions[looper]) { mins[looper] = attributes.positions[looper]; }
                        if (mins[looper + 1] > attributes.positions[looper + 1]) { mins[looper + 1] = attributes.positions[looper + 1]; }
                        if (mins[looper + 2] > attributes.positions[looper + 2]) { mins[looper + 2] = attributes.positions[looper + 2]; }
                        if (maxes[looper] < attributes.positions[looper]) { maxes[looper] = attributes.positions[looper]; }
                        if (maxes[looper + 1] < attributes.positions[looper + 1]) { maxes[looper + 1] = attributes.positions[looper + 1]; }
                        if (maxes[looper + 2] < attributes.positions[looper + 2]) { maxes[looper + 2] = attributes.positions[looper + 2]; }
                    }
                    saveF32Buffer(attributes.positions, path, dict);
                }
                if (attributes.normals) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "normals.f32.bin");
                    saveF32Buffer(attributes.normals, path, dict);
                }
                if (attributes.tangents) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "tangents.f32.bin");
                    saveF32Buffer(attributes.tangents, path, dict);
                }
                for (let looper2 = 0; looper2 < attributes.uvs.length; ++looper2) {
                    if (attributes.uvs[looper2]) {
                        let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, `uvs[${looper2}].f32.bin`);
                        saveF32Buffer(attributes.uvs[looper2], path, dict);
                    }   
                }
                if (attributes.indices.vertices) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "indices.vertices.u16.bin");
                    saveU16Buffer(attributes.indices.vertices, path, dict);
                }
                if (attributes.indices.geometry) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "indices.geometry.f32.bin");
                    saveF32Buffer(attributes.indices.geometry, path, dict);
                }
                if (attributes.colors) {
                    let path = @.fs.resolvePath("meshes", `${looper}-${mesh.name}`, "colors.u8.bin");
                    saveU8Buffer(attributes.colors, path, dict);
                }
                mxmls[`meshes/${looper}-${mesh.name}.xml`] = @.format(modelMeshTemplate, { 
                    "index": looper,
                    "mesh": mesh
                }, mxmlOptions);
            }

            mxmls["skeleton.xml"] = @.format(modelSkeletonTemplate, { "bones": json.bones }, mxmlOptions);

            path = @path(basePath, "mesh.data.json");
            @.fs.makeDirs(@.fs.dirname(path));
            @.fs.writeFile.sync(path, JSON.stringify(dict));

            @debug(`Writing model[${id}]`);
            let model = {
                "id": id,
                "bounds": {
                    "model": { "mins": mins, "maxes": maxes }
                },
                "name": json.name
            };
            if (extra) {
                Object.assign(model, extra);
            }

            path = @path(basePath, "model.json");
            @.fs.makeDirs(@.fs.dirname(path));
            @.fs.writeFile.sync(path, JSON.stringify(model));

            let modelMXML = @.format(modelTemplate, { 
                "id": id,
                "base": basePath,
                "model": json 
            }, Object.assign({}, mxmlOptions, {
                "functors": Object.assign({
                    "include": function (templates, call, parameters, options, path) {
                        return mxmls[path].split("\n").map((line) => {
                            return "    " + line;
                        }).join("\n");
                    }
                }, mxmlOptions.functors)
            }));

            if (id.split("/").slice(-1)[0] === "shadow") {
                @.fs.writeFile.sync(@path(basePath, "model.xml"), @.format(modelMXML, {}));
            } else {
                @.fs.writeFile.sync(@path(basePath, "normal-model.xml"), 
                                    @.format(modelMXML, { "prefix": "normal-" }));
                @.fs.writeFile.sync(@path(basePath, "shiny-model.xml"), 
                                    @.format(modelMXML, { "prefix": "shiny-" }));
            }
           
            return model;

        };

        let extra = {};
        if (options.shadow && json.shadow) {
            saveModel(`${id}/shadow`, json.shadow);
            extra.shadow = "@shadow/model.json";
        }
        let model = saveModel(id, json, extra);

        @.fs.writeFile.sync(@path(basePath, "model.ready"), "");

        this.next(model);

    });

});

@heard.rpc("pkmsm.exportModel").then(function (request) {

    let id = `pokemon-${request.pokemon}-${request.model}`;

    let basePath = @path(@mewchan().libraryPath, "pkmsm/models", id);

    let zipPath = @path(basePath, "model.zip");

    if (@.fs.exists(zipPath + ".ready")) {
        return @.async.resolve(zipPath);
    }

    return @mew.rpc("pkmsm.loadModel", {
        "pokemon": request.pokemon,
        "model": request.model,
        "shadow": request.shadow
    }).then(function (model) {

        let builder = @zip.build(basePath);

        if (@.fs.exists(@path(basePath, "luts"))) {
            builder.addEntry(@path(basePath, "luts"));
        }
        if (@.fs.exists(@path(basePath, "normal-textures"))) {
            builder.addEntry(@path(basePath, "normal-textures"));
        }
        if (@.fs.exists(@path(basePath, "shiny-textures"))) {
            builder.addEntry(@path(basePath, "shiny-textures"));
        }
        if (@.fs.exists(@path(basePath, "shaders"))) {
            builder.addEntry(@path(basePath, "shaders"));
        }
        builder.addEntry(@path(basePath, "normal-model.xml"));
        builder.addEntry(@path(basePath, "shiny-model.xml"));
        builder.addEntry(@path(basePath, "animation.xml"));

        if (@.fs.exists(@path(basePath, "shadow/luts"))) {
            builder.addEntry(@path(basePath, "shadow/luts"));
        }
        if (@.fs.exists(@path(basePath, "shadow/textures"))) {
            builder.addEntry(@path(basePath, "shadow/textures"));
        }
        if (@.fs.exists(@path(basePath, "shadow/shaders"))) {
            builder.addEntry(@path(basePath, "shadow/shaders"));
        }

        builder.addEntry(@path(basePath, "shadow/model.xml"));

        let meshData = JSON.parse(@.fs.readFile.sync(@path(basePath, "mesh.data.json"), "utf8"));
        for (let key in meshData) {
            builder.addEntry(key, { "data": Buffer.from(meshData[key], "base64") });
        }

        let animationData = JSON.parse(@.fs.readFile.sync(@path(basePath, "animation.data.json"), "utf8"));
        for (let key in animationData) {
            builder.addEntry(key, { "data": Buffer.from(animationData[key], "base64") });
        }

        let shadowMeshData = JSON.parse(@.fs.readFile.sync(@path(basePath, "shadow/mesh.data.json"), "utf8"));
        for (let key in shadowMeshData) {
            builder.addEntry(`shadow/${key}`, { "data": Buffer.from(shadowMeshData[key], "base64") });
        }

        builder.addEntry("package.json", {
            "data": JSON.stringify({
                "date": (@.format.date(new Date(), "YYYY-MM-DD hh:mm:ss.SSS")),
                "models": [ "normal-model.xml", "shiny-model.xml", "shadow/model.xml" ],
                "default": [ "normal-model.xml", "shadow/model.xml" ]
            }, null, 4)
        });

        builder.save(zipPath).then(function () {

            @.fs.writeFile(zipPath + ".ready", "").pipe(this);

        }).resolve(zipPath).pipe(this);

    });

});

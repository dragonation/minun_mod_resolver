const entryPath = @mewchan().entryPath;

const { Loader } = require("./loader.js");

const { PC } = require("./pc.js");

const Index = function Index(path) {

    let index = this;

    this.path = path;

    let async = @.fs.readFile(@path(path, "file_00000.bin")).then(function (result) {

        let reader = new Loader.Reader(result);

        index.pokemons = [];

        let id = 0;
        while (id < 808) {
            let file = reader.readUint16();
            let count = reader.readUint8();
            let flags = reader.readUint8();
            index.pokemons[id] = {
                "id": id + 1,
                "file": file,
                "hasGenderDifference": (flags & 0x2) !== 0,
                "hasExtraModels": (flags & 0x4) !== 0,
                "modelCount": count,
                "models": []
            };
            ++id;
        }

        id = 0;
        let file = 0;
        let offset = 0;
        while (reader.index < reader.end) {
            let pokemon = index.pokemons[id];
            let flags = [reader.readUint8(), reader.readUint8()];
            pokemon.models.push({
                "file": pokemon.file + pokemon.models.length,
                "features": Index.features[id + 1] && Index.features[id + 1][pokemon.models.length] ? Index.features[id + 1][pokemon.models.length] : [],
                "natural": flags[0],
                "decoration": flags[1]
            });
            ++file;
            ++offset;
            if (pokemon.file + pokemon.modelCount <= file) {
                delete pokemon.modelCount;
                ++id;
                offset = 0;
            }
        }

        this.next(index);

    });

    this.then = async.then.bind(async);
    this.rejected = async.rejected.bind(async);
    this.finished = async.finished.bind(async);
    this.pipe = async.pipe.bind(async);

};

Index.prototype.loadPokemon = function (id, offset, options, progress) {

    let index = this;

    if (!options) {
        options = {
            "motions": ["fighting"]
        };
    }

    let getFileName = (id) => {
        return @path(index.path, "file_" + ("00000" + id).slice(-5) + ".pc");
    };

    let pokemon = index.pokemons[id - 1];

    // natural =>
    //     0: all is correct
    //     1: motions needs fill
    //     2: textures needs fill
    //     4: models needs fill
    //     7: no content except extras, (no model, no motion, no textures)
    //     8: extras needs fill
    let loadPackage = (file, flag, usage) => {

        let finalPC = new PC();

        let ids = [file];
        let newOffset = 0;
        while ((offset + newOffset >= 0) && ((pokemon.models[offset + newOffset].natural & flag) !== 0)) {
            --newOffset;
        }
        if ((offset + newOffset >= 0) && (newOffset !== 0)) {
            ids.unshift(file + 9 * newOffset);
        }

        return @.async.all(ids, function (id) {

            new Loader(getFileName(id)).load(null, usage).then(function (pc) {

                pc.files.forEach((file, index) => {
                    if (file) {
                        finalPC.files[index] = file;
                    } else if (!finalPC.files.hasOwnProperty(index)) {
                        finalPC.files[index] = null;
                    }
                });

                this.next();

            }).pipe(this);

        }).resolve(finalPC);

    };

    return this.then(function () {

        let origin = (pokemon.file + offset) * 9 + 1;

        let pcs = {
            "files": []
        };

        let files = [
            ["model", 4, 0],
            ["extra", 8, 8]
        ];

        if (options.shiny) {
            files.push(["textures.shiny", 4, 2]);
        } else {
            files.push(["textures.normal", 4, 1]);
        }

        if (options.shadow) {
            files.push(["textures.shadow", 4, 3]);
        }

        if (!options.motions) {
            files.push(["motions.fighting", 1, 4]);
        } else {
            if (options.motions.indexOf("fighting") !== -1) {
                files.push(["motions.fighting", 1, 4]);
            }
            if (options.motions.indexOf("pet") !== -1) {
                files.push(["motions.pet", 1, 5]);
            }
            if (options.motions.indexOf("map") !== -1) {
                files.push(["motions.map", 1, 6]);
            }
            if (options.motions.indexOf("acting") !== -1) {
                files.push(["motions.acting", 1, 7]);
            }
        }

        let loaded = 0;

        @.async.all(files, -1, function ([usage, flag, index]) {

            loadPackage(origin + index, flag, usage).then(function (pc) {

                pc.usage = usage;

                ++loaded;
                if (progress) {
                    try {
                        progress(pc, loaded, files.length);
                    } catch (error) {
                        @error(error);
                    }
                }

                pcs.files[index] = pc;

                let root = pcs;
                usage.split(".").forEach((key, index, list) => {
                    if (index < list.length - 1) {
                        if (!root.hasOwnProperty(key)) {
                            root[key] = {};
                        }
                        root = root[key];
                    } else {
                        root[key] = pc;
                    }
                });

                this.next();

            }).pipe(this);

        }).resolve(pcs).pipe(this);

    });

};

Index.features = {
    "3": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "6": { "1": ["mega-x"], "2": ["mega-y"] },
    "9": { "1": ["mega"] },
    "12": { "0": ["male"], "1": ["female"] },
    "15": { "1": ["mega"] },
    "18": { "1": ["mega"] },
    "19": { "0": ["male"], "1": ["female"], "2": ["alola"] },
    "20": { "0": ["male"], "1": ["female"], "2": ["alola"], "3": ["alola", "tatem"] },
    "25": { "0": ["male"], "1": ["female"] },
    "26": { "0": ["male"], "1": ["female"], "2": ["alola"] },
    "27": { "1": ["alola"] },
    "28": { "1": ["alola"] },
    "37": { "1": ["alola"] },
    "38": { "1": ["alola"] },
    "41": { "0": ["male"], "1": ["female"] },
    "42": { "0": ["male"], "1": ["female"] },
    "44": { "0": ["male"], "1": ["female"] },
    "45": { "0": ["male"], "1": ["female"] },
    "50": { "1": ["alola"] },
    "51": { "1": ["alola"] },
    "52": { "1": ["alola"] },
    "53": { "1": ["alola"] },
    "64": { "0": ["male"], "1": ["female"] },
    "65": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "74": { "1": ["alola"] },
    "75": { "1": ["alola"] },
    "76": { "1": ["alola"] },
    "80": { "1": ["mega"] },
    "84": { "0": ["male"], "1": ["female"] },
    "85": { "0": ["male"], "1": ["female"] },
    "88": { "1": ["alola"] },
    "89": { "1": ["alola"] },
    "94": { "1": ["mega"] },
    "97": { "0": ["male"], "1": ["female"] },
    "103": { "1": ["alola"] },
    "105": { "1": ["alola"], "2": ["alolan", "tatem"] },
    "111": { "0": ["male"], "1": ["female"] },
    "112": { "0": ["male"], "1": ["female"] },
    "115": { "1": ["mega"] },
    "118": { "0": ["male"], "1": ["female"] },
    "119": { "0": ["male"], "1": ["female"] },
    "123": { "0": ["male"], "1": ["female"] },
    "127": { "1": ["mega"] },
    "129": { "0": ["male"], "1": ["female"] },
    "130": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "142": { "1": ["mega"] },
    "150": { "1": ["mega-x"], "2": ["mega-y"] },
    "154": { "0": ["male"], "1": ["female"] },
    "165": { "0": ["male"], "1": ["female"] },
    "166": { "0": ["male"], "1": ["female"] },
    "178": { "0": ["male"], "1": ["female"] },
    "181": { "1": ["mega"] },
    "185": { "0": ["male"], "1": ["female"] },
    "186": { "0": ["male"], "1": ["female"] },
    "190": { "0": ["male"], "1": ["female"] },
    "194": { "0": ["male"], "1": ["female"] },
    "195": { "0": ["male"], "1": ["female"] },
    "198": { "0": ["male"], "1": ["female"] },
    "201": {
        "0": ["a"], "1": ["b"], "2": ["c"], "3": ["d"], "4": ["e"],
        "5": ["f"], "6": ["g"], "7": ["h"], "8": ["i"], "9": ["j"],
        "10": ["k"], "11": ["l"], "12": ["m"], "13": ["n"], "14": ["o"],
        "15": ["p"], "16": ["q"], "17": ["r"], "18": ["s"], "19": ["t"],
        "20": ["u"], "21": ["v"], "22": ["w"], "23": ["x"], "24": ["y"],
        "25": ["z"], "26": ["!"], "27": ["?"]
    },
    "202": { "0": ["male"], "1": ["female"] },
    "203": { "0": ["male"], "1": ["female"] },
    "207": { "0": ["male"], "1": ["female"] },
    "208": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "212": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "214": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "215": { "0": ["male"], "1": ["female"] },
    "217": { "0": ["male"], "1": ["female"] },
    "221": { "0": ["male"], "1": ["female"] },
    "224": { "0": ["male"], "1": ["female"] },
    "229": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "232": { "0": ["male"], "1": ["female"] },
    "248": { "1": ["mega"] },
    "254": { "1": ["mega"] },
    "255": { "0": ["male"], "1": ["female"] },
    "256": { "0": ["male"], "1": ["female"] },
    "257": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "260": { "1": ["mega"] },
    "267": { "0": ["male"], "1": ["female"] },
    "269": { "0": ["male"], "1": ["female"] },
    "272": { "0": ["male"], "1": ["female"] },
    "274": { "0": ["male"], "1": ["female"] },
    "275": { "0": ["male"], "1": ["female"] },
    "282": { "1": ["mega"] },
    "302": { "1": ["mega"] },
    "303": { "1": ["mega"] },
    "306": { "1": ["mega"] },
    "307": { "0": ["male"], "1": ["female"] },
    "308": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "310": { "1": ["mega"] },
    "315": { "0": ["male"], "1": ["female"] },
    "316": { "0": ["male"], "1": ["female"] },
    "317": { "0": ["male"], "1": ["female"] },
    "319": { "1": ["mega"] },
    "322": { "0": ["male"], "1": ["female"] },
    "323": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "332": { "0": ["male"], "1": ["female"] },
    "334": { "1": ["mega"] },
    "350": { "0": ["male"], "1": ["female"] },
    "351": { "1": ["sunny"], "2": ["rainy"], "3": ["snowy"] },
    "354": { "1": ["mega"] },
    "359": { "1": ["mega"] },
    "362": { "1": ["mega"] },
    "369": { "0": ["male"], "1": ["female"] },
    "373": { "1": ["mega"] },
    "376": { "1": ["mega"] },
    "380": { "1": ["mega"] },
    "381": { "1": ["mega"] },
    "382": { "1": ["primal"] },
    "383": { "1": ["primal"] },
    "384": { "1": ["mega"] },
    "386": { "1": ["attack"], "2": ["defense"], "3": ["speed"] },
    "396": { "0": ["male"], "1": ["female"] },
    "397": { "0": ["male"], "1": ["female"] },
    "398": { "0": ["male"], "1": ["female"] },
    "399": { "0": ["male"], "1": ["female"] },
    "400": { "0": ["male"], "1": ["female"] },
    "401": { "0": ["male"], "1": ["female"] },
    "402": { "0": ["male"], "1": ["female"] },
    "403": { "0": ["male"], "1": ["female"] },
    "404": { "0": ["male"], "1": ["female"] },
    "405": { "0": ["male"], "1": ["female"] },
    "407": { "1": ["mega"] },
    "412": { "0": ["plant"], "1": ["sandy"], "2": ["trash"] },
    "413": { "0": ["plant"], "1": ["sandy"], "2": ["trash"] },
    "415": { "0": ["male"], "1": ["female"] },
    "417": { "0": ["male"], "1": ["female"] },
    "418": { "0": ["male"], "1": ["female"] },
    "419": { "0": ["male"], "1": ["female"] },
    "421": { "0": ["overcast"], "1": ["sunshine"] },
    "422": { "0": ["west"], "1": ["east"] },
    "423": { "0": ["west"], "1": ["east"] },
    "424": { "0": ["male"], "1": ["female"] },
    "428": { "1": ["mega"] },
    "443": { "0": ["male"], "1": ["female"] },
    "444": { "0": ["male"], "1": ["female"] },
    "445": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "448": { "1": ["mega"] },
    "449": { "0": ["male"], "1": ["female"] },
    "450": { "0": ["male"], "1": ["female"] },
    "453": { "0": ["male"], "1": ["female"] },
    "454": { "0": ["male"], "1": ["female"] },
    "456": { "0": ["male"], "1": ["female"] },
    "457": { "0": ["male"], "1": ["female"] },
    "459": { "0": ["male"], "1": ["female"] },
    "460": { "0": ["male"], "1": ["female"], "2": ["mega"] },
    "461": { "0": ["male"], "1": ["female"] },
    "464": { "0": ["male"], "1": ["female"] },
    "465": { "0": ["male"], "1": ["female"] },
    "473": { "0": ["male"], "1": ["female"] },
    "475": { "1": ["mega"] },
    "479": { "1": ["heat"], "2": ["wash"], "3": ["frost"], "4": ["fan"], "5": ["mow"] },
    "487": { "0": ["altered"], "1": ["origin"] },
    "492": { "0": ["land"], "1": ["sky"] },
    "493": { }, // TODO: check
    "521": { "0": ["male"], "1": ["female"] },
    "531": { "1": ["mega"] },
    "550": { "0": ["red-stripped"], "1": ["blue-stripped"] },
    "555": { "0": ["standard"], "1": ["zen"] },
    "585": { "0": ["spring"], "1": ["summer"], "2": ["autumn"], "3": ["winter"] },
    "586": { "0": ["spring"], "1": ["summer"], "2": ["autumn"], "3": ["winter"] },
    "592": { "0": ["male"], "1": ["female"] },
    "593": { "0": ["male"], "1": ["female"] },
    "641": { "0": ["incarnate"], "1": ["therian"] },
    "642": { "0": ["incarnate"], "1": ["therian"] },
    "645": { "0": ["incarnate"], "1": ["therian"] },
    "646": { "1": ["white"], "2": ["black"] },
    "647": { "0": ["ordinary"], "1": ["resolute"] },
    "648": { "1": ["aria"], "0": ["pirouette"] },
    "649": { },
    "658": { "1": ["battle-bond"], "2": ["ash"] },
    "666": {
        "0": ["icy-snow"], "1": ["polar"], "2": ["tunda"],
        "3": ["continental"], "4": ["garden"], "5": ["elegant"],
        "6": ["meadow"], "7": ["modern"], "8": ["marine"],
        "9": ["archipelago"], "10": ["high-plains"], "11": ["sandstorm"],
        "12": ["river"], "13": ["monsoon"], "14": ["savanna"],
        "15": ["sun"], "16": ["ocean"], "17": ["jungle"],
        "18": ["fancy"], "19": ["poke-ball"]
    },
    "668": { "0": ["male"], "1": ["female"] },
    "669": { "0": ["red"], "1": ["yellow"], "2": ["orange"], "3": ["blue"], "4": ["white"] },
    "670": { "0": ["red"], "1": ["yellow"], "2": ["orange"], "3": ["blue"], "4": ["white"], "5": ["eternal"] },
    "671": { "0": ["red"], "1": ["yellow"], "2": ["orange"], "3": ["blue"], "4": ["white"] },
    "676": {
        "0": ["wild"],
        "1": ["heart"], "2": ["star"], "3": ["diamond"],
        "4": ["debutante"], "5": ["matron"],
        "6": ["dandy"],
        "7": ["la-reine"], "8": ["kabuki"], "9": ["pharaoh"] },
    "678": { "0": ["male"], "1": ["female"] },
    "681": { "0": ["shield"], "1": ["blade"] },
    "710": { },
    "711": { },
    "718": { "0": ["50"], "1": ["10"], "2": [], "3": [], "4": ["complete"] },
    "719": { "1": ["mega"] },
    "720": { "0": ["confined"], "1": ["unbound"] },
    "735": { "1": ["tatem"] },
    "738": { "1": ["tatem"] },
    "741": { "0": ["baile"], "1": ["pom-pom"], "2": ["pau"], "3": ["sensu"] },
    "743": { "0": ["male"], "1": ["female"] },
    "745": { "0": ["midday"], "1": ["midnight"], "2": ["dusk"] },
    "746": { "0": ["solo"], "1": ["school"] },
    "752": { "1": ["tatem"] },
    "754": { "1": ["tatem"] },
    "758": { "1": ["tatem"] },
    "773": { }, // TODO: check
    "774": {
        "0": ["red meteor"],
        "1": ["orange meteor"],
        "2": ["yellow meteor"],
        "3": ["green meteor"],
        "4": ["aqua meteor"],
        "5": ["blue meteor"],
        "6": ["purple meteor"],
        "7": ["red core"],
        "8": ["orange core"],
        "9": ["yellow core"],
        "10": ["green core"],
        "11": ["aqua core"],
        "12": ["blue core"],
        "13": ["purple core"]
    },
    "777": { "1": ["tatem"] },
    "778": { "0": ["disguised"], "1": ["busted"], "2": ["disguised", "tatem"], "3": ["busted", "tatem"] },
    "784": { "1": ["tatem"] },
    "800": { "1": ["dusk-mane"], "2": ["dawn-wings"], "3": ["ultra"] },
    "801": { "1": ["original"] }
};

Index.list = require(@path(entryPath, "data/pkm/list.json"));

module.exports.Index = Index;

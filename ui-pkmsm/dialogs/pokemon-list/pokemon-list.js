const Dialog = function Dialog(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    this.filler.fill({
        "groupType": "no"
    });

    $.ajax("/~pkmsm/model/list", {
        "success": (result) => {

            let list = $.serial.deserialize(result);

            this.rawList = list;

            this.updateList();

        }
    });


};

Dialog.prototype.updateList = function (groupType) {

    if (groupType) {
        this.filler.fill({
            "groupType": groupType
        });
    }

    groupType = this.filler.parameters.groupType;

    let groups = [];

    switch (groupType) {
        case "shape": {
            let shapes = Object.create(null); 
            for (let info of this.rawList) {
                let shape = info.pokemon.forms[info.form].shape;
                if (!shapes[shape]) {
                    shapes[shape] = {
                        "icon": `/~pkmsm/res/shapes/${shape}.svg`,
                        "label": shape,
                        "models": []
                    };
                }
                shapes[shape].models.push(info);
            }
            groups = Object.keys(shapes).sort().map((key) => {
                return shapes[key];
            });
            break;
        }
        case "type": {
            let types = Object.create(null); 
            for (let info of this.rawList) {
                for (let type of info.pokemon.forms[info.form].types) {
                    if (!types[type]) {
                        types[type] = {
                            "label": type,
                            "models": []
                        };
                    }
                    types[type].models.push(info);
                }
            }
            groups = Object.keys(types).sort().map((key) => {
                return types[key];
            });
            break;
        }
        case "classification": {
            let classifications = Object.create(null); 
            for (let info of this.rawList) {
                let classification = info.pokemon.classification;
                if (!classifications[classification]) {
                    classifications[classification] = {
                        "label": classification,
                        "models": []
                    };
                }
                classifications[classification].models.push(info);
            }
            groups = Object.keys(classifications).sort().map((key) => {
                return classifications[key];
            });
            break;
        }
        case "base-summary": {
            let summaries = Object.create(null);
            for (let info of this.rawList) {
                let summary = info.pokemon.forms[info.form]["base-summary"];
                let level = Math.floor(summary / 50);
                if (!summaries[level]) {
                    summaries[level] = {
                        "label": `${level * 50} - ${level * 50 + 49}`,
                        "models": []
                    };
                }
                summaries[level].models.push(info);
            }
            groups = Object.keys(summaries).sort((a, b) => a - b).map((key) => {
                return summaries[key];
            });
            break;
        }
        case "color": {
            let colors = Object.create(null); 
            for (let info of this.rawList) {
                let color = info.pokemon.forms[info.form].color;
                if (!colors[color]) {
                    colors[color] = {
                        "label": color,
                        "models": []
                    };
                }
                colors[color].models.push(info);
            }
            groups = Object.keys(colors).sort().map((key) => {
                return colors[key];
            });
            break;
        }
        case "weight": {
            let weights = Object.create(null);
            for (let info of this.rawList) {
                let weight = info.pokemon.forms[info.form].weight;
                let level = Math.floor(weight / 10);
                if (!weights[level]) {
                    weights[level] = {
                        "level": level,
                        "label": `${(level * 10).toFixed(1)} - ${(level * 10 + 9.9).toFixed(1)} kg`,
                        "models": []
                    };
                }
                weights[level].models.push(info);
            }
            groups = Object.keys(weights).sort((a, b) => a - b).map((key) => {
                return weights[key];
            });
            break;
        }
        case "height": {
            let heights = Object.create(null);
            for (let info of this.rawList) {
                let height = info.pokemon.forms[info.form].height;
                let level = Math.floor(height * 10);
                if (!heights[level]) {
                    heights[level] = {
                        "level": level,
                        "label": `${(level / 10).toFixed(2)} - ${(level / 10 + 0.09).toFixed(2)} m`,
                        "models": []
                    };
                }
                heights[level].models.push(info);
            }
            groups = Object.keys(heights).sort((a, b) => a - b).map((key) => {
                return heights[key];
            });
            break;
        }
        case "species": {
            let all = Object.create(null); 
            for (let info of this.rawList) {
                for (let species of info.pokemon.species) {
                    if (!all[species]) {
                        all[species] = {
                            "label": species,
                            "models": []
                        };
                    }
                    all[species].models.push(info);
                }
            }
            groups = Object.keys(all).sort().map((key) => {
                return all[key];
            });
            break;   
        }
        case "evolution": {
            let evolutions = Object.create(null);
            for (let info of this.rawList) {
                if (!evolutions[info.pokemon.evolution]) {
                    evolutions[info.pokemon.evolution] = [];
                }
                evolutions[info.pokemon.evolution].push(info);
            }
            let keys = Object.keys(evolutions).sort((a, b) => a - b);
            for (let key of keys) {
                evolutions[key].sort((a, b) => {
                    return a.chains.indexOf(a.pokemon.id) - b.chains.indexOf(b.pokemon.id);
                });
                let names = {};
                for (let info of evolutions[key]) {
                    names[info.pokemon.id] = info.pokemon.name;
                }
                groups.push({
                    "label": evolutions[key][0].chains.map(id => names[id]).join(", "),
                    "models": evolutions[key]
                });
            }
            break;
        }
        case "no": 
        default: {
            for (let info of this.rawList) {
                let form = info.pokemon.forms[info.form];
                if ((groups.length === 0) || 
                    (Math.floor((groups[groups.length - 1].models[0].pokemon.id - 1) / 100) !== 
                     Math.floor((info.pokemon.id - 1) / 100))) {
                    groups.push({
                        "label": `No.${("00" + info.pokemon.id).slice(-3)} - No.${("00" + Math.min(info.pokemon.id + 100, 807)).slice(-3)}`,
                        "models": []
                    });
                }
                groups[groups.length - 1].models.push(info);
            }
            break;
        }
    }

    this.filler.fill({
        "groups": groups
    });

};

Dialog.functors = {
    "updateGroupType": function (event) {
        this.updateList(event.value);
    },
    "openModel": function (model) {

        $.app(this.dom).smartOpen(model.id);

        this.dom.hideDialog();

    }
};

module.exports.Dialog = Dialog;

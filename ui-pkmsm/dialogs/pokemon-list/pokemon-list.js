const Dialog = function Dialog(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    this.filler.fill({
        "groupType": "id"
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

    console.log(this.rawList);

    switch (groupType) {
        case "shape": {}
        case "type": 
        case "classification":
        case "speed":
        case "base-summary":
        case "color":
        case "weight": 
        case "height":
        case "gender":
        case "species":
        case "evolution":
        case "id": 
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
    "openModel": function (model) {

        $.app(this.dom).smartOpen(model.id);

        this.dom.hideDialog();

    }
};

module.exports.Dialog = Dialog;

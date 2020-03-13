const Dialog = function Dialog(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    let size = $.local["pkmsm.model-viewer.size"];
    if (!size) {
        size = [$.getDevicePixels(240), $.dom.getDevicePixels(240)];
    }

    let range = $.local["pkmsm.batch-captures.range"];
    if (!range) {
        range = [1, 807];
    }

    this.filler.fill({
        "size": size,
        "range": range
    });

};

Dialog.functors = {
    "cancelBatch": function () {

        this.filler.fill({
            "state": null
        });

    },
    "batchSnapshots": function () {

        let width = this.filler.query(".width-input").val();
        if (!isFinite(width)) { width = 256; }
        
        let height = this.filler.query(".height-input").val();
        if (!isFinite(height)) { height = 256; }

        let from = this.filler.query(".from-input").val();
        let to = this.filler.query(".to-input").val();

        if (!isFinite(from)) { from = 1; }
        if (!isFinite(to)) { to = 807; }
        from = Math.max(1, from);
        to = Math.min(to, 807);
        if (from > to) { to = from; }

        $.local["pkmsm.batch-captures.range"] = [from, to];

        this.filler.fill({
            "state": "initializing"
        });

        $.ajax("/~pkmsm/model/list", {
            "success": (result) => {

                if (!this.filler.parameters.state) {
                    return;
                }

                let list = $.serial.deserialize(result).filter((model) => {
                    return (model.pokemon.id >= from) && (model.pokemon.id <= to)
                });

                let snapshot = (index) => {

                    if (index >= list.length) {
                        this.filler.fill({
                            "state": null
                        });
                        return;
                    }

                    if (!this.filler.parameters.state) {
                        return;
                    }

                    this.filler.fill({
                        "finished": index,
                        "total": list.length,
                        "pokemon": list[index].pokemon.id, 
                        "model": list[index].model, 
                        "name": list[index].pokemon.name, 
                        "state": "saving"
                    });

                    $.app(this.dom).captureSnapshot(list[index].id, {
                        "width": width, 
                        "height": height
                    }, (error) => {
                        if (error) {
                            console.error(error); return;
                        }
                        snapshot(index + 1);
                    });
                };

                snapshot(0);

            },
            "error": (request) => {
                console.error("Failed to list all models");
            }
        });

    }
};

module.exports.Dialog = Dialog;

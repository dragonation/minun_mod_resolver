const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

};

Frame.prototype.getTargetIDs = function () {

    let id = $(this.dom).attr("wire-id");

    let scene = this.filler.query("m3d-scene");
    let ids = {
        [`${id}/resource-list`]: [scene]
    };

    return ids;

};

Frame.functors = {

    "saveM3DFile": function () {
        window.open(`/~pkmsm/model/save/${this.filler.parameters.id}`);
    },

    "listResources": function () {
        $.app(this.dom).openResourceList(this.filler.parameters.id, this);
    }

};

module.exports.Frame = Frame;

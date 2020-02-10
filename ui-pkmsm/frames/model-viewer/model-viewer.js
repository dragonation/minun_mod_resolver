const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

};

Frame.prototype.getTargetIDs = function () {

    let id = $(this.dom).attr("wire-id");

    let scene = this.filler.query("m3d-scene");
    let ids = {
        [`${id}/resource-list`]: [scene],
        [`${id}/animation-list`]: [scene],
    };

    return ids;

};

Frame.functors = {

    "saveM3DFile": function () {
        window.open(`/~pkmsm/model/save/${this.filler.parameters.id}`);
    },

    "listResources": function () {
        $.app(this.dom).openResourceList(this.filler.parameters.id, this);
    },

    "listAnimations": function () {

        if (!this.animations) {
            $.ajax(`/~pkmsm/model/res/${this.filler.parameters.id}/animation.xml`, {
                "dataType": "text",
                "success": (result) => {
                    this.animations = $(result);
                    $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
                },
                "error": () => {
                    console.error("Failed to list animations");
                }
            });
        } else {
            $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
        }

    }

};

module.exports.Frame = Frame;

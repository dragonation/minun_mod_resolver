const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

    this.animationListeners = [];

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

Frame.prototype.playAnimation = function (animationID, options) {

    this.playingAnimation = animationID;

    this.filler.query("#pokemon-model")[0].playM3DClip(animationID, options);

    for (let listener of this.animationListeners) {
        try {
            listener(animationID);
        } catch (error) {
            console.error(error);
        }
    }

};

Frame.prototype.getPlayingAnimation = function () {

    return this.playingAnimation;

};

Frame.prototype.addAnimationListener = function (listener) {

    this.animationListeners.push(listener);

};

Frame.prototype.removeAnimationListener = function (listener) {

    let index = this.animationListeners.indexOf(listener);
    if (index !== -1) {
        this.animationListeners.splice(index, 1);
    }

};

Frame.functors = {

    "saveM3DFile": function () {
        window.open(`/~pkmsm/model/save/${this.filler.parameters.id}`);
    },

    "listResources": function () {
        $.app(this.dom).openResourceList(this.filler.parameters.id, this);
    },

    "listAnimations": function () {
        $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
    }

};

module.exports.Frame = Frame;

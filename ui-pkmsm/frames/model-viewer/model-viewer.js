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

Frame.prototype.playAnimation = function (animationID) {

    this.playingAnimation = animationID;

    this.filler.query("m3d-object")[0].playM3DClip(animationID);

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

        if (!this.animations) {
            $.ajax(`/~pkmsm/model/res/${this.filler.parameters.id}/animation.xml`, {
                "dataType": "text",
                "success": (result) => {
                    this.animations = $(result);
                    $.ajax(`/~pkmsm/model/data/animation/${this.filler.parameters.id}`, {
                        "success": (result) => {
                            let dom = this.filler.query("m3d-object")[0];
                            let decoded = dom.binDecoded;
                            for (let key in result) {
                                let value = $.base64.decode(result[key]);
                                if (key.split(".").slice(-1)[0] === "bin") {
                                    let type = key.split(".").slice(-2)[0];
                                    switch (type) {
                                        case "u8": { 
                                            decoded[key] = [];
                                            let array = new Uint8Array(value); 
                                            for (let value of array) {
                                                decoded[key].push(value ? true : false);
                                            }
                                            break; 
                                        }
                                        case "f32": 
                                        default: { 
                                            decoded[key] = [];
                                            let array = new Float32Array(value); 
                                            for (let value of array) {
                                                decoded[key].push(value);
                                            }
                                            break; 
                                        }
                                    }
                                } else {
                                    decoded[key] = value;
                                }
                            }
                            this.filler.query("m3d-object").append(this.animations);
                            $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
                        },
                        "error": () => {
                            console.error("Failed to get animations data");
                        }
                    });
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

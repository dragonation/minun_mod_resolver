const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

    this.animationListener = (animation) => {
        this.filler.fill({
            "selected": animation
        });
    };

    this.filler.parameters.from.addAnimationListener(this.animationListener);

    this.filler.fill({
        "selected": this.filler.parameters.from.getPlayingAnimation()
    });

};

Frame.prototype.onClose = function () {

    this.filler.parameters.from.removeAnimationListener(this.animationListener);

};

Frame.functors = {

    "selectAnimation": function (cell) {

        this.filler.fill({
            "selected": cell.id
        });

        this.filler.parameters.from.playAnimation(cell.id);

    }

};

module.exports.Frame = Frame;

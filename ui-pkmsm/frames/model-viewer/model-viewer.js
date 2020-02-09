const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

};

Frame.functors = {
    "saveM3DFile": function () {
        window.open(`/~pkmsm/model/save/${this.filler.parameters.id}`);
    }
};

module.exports.Frame = Frame;

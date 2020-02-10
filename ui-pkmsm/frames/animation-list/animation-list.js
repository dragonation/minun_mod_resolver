const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

};

Frame.functors = {
    "selectAnimation": function (cell) {
        this.filler.fill({
            "selected": cell
        });
    },
    "playAnimation": function (cell) {
        // $.app(this.dom).smartOpen(this.filler.parameters.id + "/" + cell.id, this);
    }
};

module.exports.Frame = Frame;

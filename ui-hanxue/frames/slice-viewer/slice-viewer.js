const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    // $.timer(20, () => {
    //     this.filler.fill({
    //         "sliceLayer": sliceLayer
    //     });
    //     ++sliceLayer;
    //     if (sliceLayer > 1500) {
    //         sliceLayer = 0;
    //     }
    // });

};

module.exports.Frame = Frame;

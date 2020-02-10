const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.doms = Object.create(null);

    this.filler = filler;

};

Frame.prototype.getTargetIDs = function () {

    let id = this.filler.parameters.id;

    let collectionView = this.filler.query("ui-collection-view");
    let ids = {};

    let sectionHeaderSize = parseFloat(collectionView.css("--section-header-size"));
    let cellHeight = parseFloat(collectionView.css("--cell-height"));

    if (!this.filler.parameters.groups) {
        return;
    }

    let top = 0;
    for (let group of this.filler.parameters.groups) {
        top += sectionHeaderSize;
        for (let file of group.files) {
            let fileID = `${id}/${file.id}`;
            if (!this.doms[fileID]) {
                this.doms[fileID] = $("<div>").addClass("placeholder");
                collectionView.append(this.doms[fileID]);
            }
            ids[fileID] = [$(this.doms[fileID][0])];
            this.doms[fileID].css({
                "top": `${top}px`,
                "height": `${cellHeight}px`
            });
            top += cellHeight;
        }
    }

    return ids;

};

Frame.functors = {
    "selectResource": function (cell) {
        this.filler.fill({
            "selected": cell
        });
    },
    "openResource": function (cell) {
        $.app(this.dom).smartOpen(this.filler.parameters.id + "/" + cell.id, this);
    },
    "updateConnections": function () {
        let parent = $(this.dom).parent()[0];
        if (parent && parent.updateLayouts) {
            parent.updateLayouts([this.dom]);
        }
    }
};

module.exports.Frame = Frame;

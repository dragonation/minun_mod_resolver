const Overlay = function Overlay(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

Overlay.prototype.searchWithKeyword = function (keyword) {

    if (!keyword) {
        this.filler.fill({
            "results": []
        });
        return;
    }

    $.ajax("/~hmm5/search/" + keyword, {
        "success": (data, status, request) => {

            let items = data.trim().split("\n").filter((line) => line).map((line) => {
                let filename = line.split("/").slice(-1)[0];
                let dir = "/" + line.slice(0, - filename.length - 1);
                let extname = "";
                if ((filename[0] !== ".") && (filename.indexOf(".") !== -1)) {
                    extname = "." + filename.split(".").slice(-1)[0];
                }
                let basename = filename.slice(0, -extname.length);
                let type = "file";
                return {
                    "id": line,
                    "type": type,
                    "basename": basename,
                    "extname": extname,
                    "description": dir
                };
            });

            this.filler.fill({
                "results": items
            });

        }
    });

};

Overlay.functors = {
    "smartOpen": function (item) {

        $.app("hmm5").smartOpen(item.id);

        this.dom.hideOverlay();

    }
};

module.exports.Overlay = Overlay;

const Overlay = function Overlay(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

Overlay.parameters = {
    "scope": "file"
};

Overlay.prototype.searchFilesWithKeyword = function (keyword) {

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

Overlay.prototype.searchModelsWithKeyword = function (keyword) {

    $.ajax("/~hmm5/list/models/" + keyword, {
        "success": (data, status, request) => {

            let items = data.trim().split("\n").filter((line) => line).map((line) => {
                let filename = line.split("#")[0].split("/").slice(-1)[0];
                let dir = line.split("#")[0].slice(0, - filename.length - 1);
                let extname = "";
                if ((filename[0] !== ".") && (filename.indexOf(".") !== -1)) {
                    extname = "." + filename.split(".").slice(-1)[0];
                }
                let basename = filename.slice(0, -extname.length);
                let type = "model";
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

Overlay.prototype.searchTokensWithKeyword = function (keyword) {

    $.ajax("/~hmm5/list/tokens/" + keyword, {
        "success": (data, status, request) => {

            let items = data.trim().split("\n").filter((line) => line).map((line) => {
                let name = line.split(":")[0];
                line = line.split(":").slice(1).join(":");
                if (line[0] === "@") {
                    return {
                        "id": line,
                        "type": "inline",
                        "basename": name,
                        "extname": "",
                        "description": "Inline object"
                    };
                } else {
                    let filename = line.split("#")[0].split("/").slice(-1)[0];
                    let dir = line.split("#")[0].slice(0, - filename.length - 1);
                    let extname = "";
                    if ((filename[0] !== ".") && (filename.indexOf(".") !== -1)) {
                        extname = "." + filename.split(".").slice(-1)[0];
                    }
                    let basename = filename.slice(0, -extname.length);
                    let type = line.split("#").slice(-1)[0].split("/").slice(-1)[0].split(")")[0];
                    return {
                        "id": line,
                        "type": type,
                        "basename": name,
                        "extname": extname,
                        "description": dir
                    };
                }
            });

            this.filler.fill({
                "results": items
            });

        }
    });

};

Overlay.prototype.searchWithKeyword = function (keyword) {

    if (!keyword) {
        this.filler.fill({
            "results": []
        });
        return;
    }

    this.searchKeyword = keyword;

    switch (this.filler.parameters.scope) {
        case "file": {
            this.searchFilesWithKeyword(keyword); break;
        };
        case "model": {
            this.searchModelsWithKeyword(keyword); break;
        };
        case "token": {
            this.searchTokensWithKeyword(keyword); break;
        };
        default: {
            this.searchFilesWithKeyword(keyword); break;
        };
    }

};

Overlay.prototype.updateSearches = function () {

    this.searchWithKeyword(this.searchKeyword);

};

Overlay.functors = {
    "smartOpen": function (item) {

        $.app("hmm5").smartOpen(item.id);

        this.dom.hideOverlay();

    },
    "searchInFiles": function () {
        this.filler.fill({
            "scope": "file"
        });
        this.updateSearches();
    },
    "searchInArenas": function () {
        this.filler.fill({
            "scope": "arena"
        });
        this.updateSearches();
    },
    "searchInTokens": function () {
        this.filler.fill({
            "scope": "token"
        });
        this.updateSearches();
    },
    "searchInModels": function () {
        this.filler.fill({
            "scope": "model"
        });
        this.updateSearches();
    }
};

module.exports.Overlay = Overlay;

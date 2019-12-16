module.exports = {
    "attributes": [ "target", "resolver" ],
    "methods": {
        "getCompleteHeight": function () {

            return parseInt(this.filler.query("#records").css("height")) + 1;

        },
        "getTargetIDs": function () {

            let ids = Object.create(null);

            for (let dom of this.filler.query("ui-property")) {
                let subids = dom.getTargetIDs();
                if (subids) {
                    for (let id in subids) {
                        if (!ids[id]) {
                            ids[id] = [];
                        }
                        for (let dom of subids[id]) {
                            ids[id].push(dom);
                        }
                    }
                }
            }

            return ids;

        }
    },
    "functors": {
        "trigFoldingChanges": function () {
            $(this).trigger("foldingchange", {});
        },
        "getPropertyKeys": function (value) {

            if (!value) {
                return [];
            }

            return Object.keys(value).filter((key) => {
                return (typeof key === "string") && (key.slice(0, 2) !== "@@");
            });

        }
    }
};

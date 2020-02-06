let workshop = $("<ui-workshop>");

let appList = undefined;

let search = document.location.search;
if (search && (search[0] === "?")) {
    let query = Object.create(null);
    for (pair of search.slice(1).split("&")) {
        let key = decodeURIComponent(pair.split("=")[0]);
        let value = decodeURIComponent(pair.split("=").slice(1).join("="));
        query[key] = value;
    }
    if (query.title) {
        document.title = query.title;
    }
    if (query.mode) {
        workshop.attr("mode", query.mode);
    }
    if (query.apps) {
        appList = [];
        for (let app of query.apps.trim().split(/[\s,]+/)) {
            if (app && (appList.indexOf(app) === -1)) {
                appList.push(app);
            }
        }
    }
}

$("body").append(workshop);

if (appList) {
    for (let app of appList) {
        workshop[0].launchApp(app);
    }
} else {
    $.res.load("/app-list", (error, result) => {

        if (error) { console.error(error); return; }

        result.split("\n").filter((line) => line.trim()).forEach((app) => {
            workshop[0].launchApp(app.trim());
        });

    });
}

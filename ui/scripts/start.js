let workshop = $("<ui-workshop>");

$("body").append(workshop);

$.res.load("/app-list", (error, result) => {

    if (error) { console.error(error); return; }

    result.split("\n").filter((line) => line.trim()).forEach((app) => {
        workshop[0].launchApp(app.trim());
    });

});

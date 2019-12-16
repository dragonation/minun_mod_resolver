module.exports = {
    "attributes": [],
    "listeners": {},
    "methods": {
        "launchApp": function (app) {
            if ($(this).find("ui-app").filter((_, element) => $(element).attr("name") === app).length) {
                return;
            }
            $(this).append($("<ui-app>").attr({
                "name": app
            }));
        }
    },
    "functors": {}
};

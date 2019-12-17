$("body").on("keypress", function (event) {

    if (event.target !== this) { return; }

    let app = undefined;
    for (let view of $("ui-workshop")[0].views) {
        if ($(view).hasClass("active") && (!$(view).hasClass("hidden"))) {
            app = $.app(view);
        }
    }

    if (typeof app.onKeyPressed === "function") {
        try {
            app.onKeyPressed(event);
        } catch (error) {
            console.error(error);
        }
    }

    event.preventDefault();

});

module.exports = {
    "attributes": [],
    "listeners": {},
    "properties": {
        "views": {
            "get": function () {
                let views = [];
                for (let app of $(this).children("ui-app")) {
                    for (let view of app.filler.query("ui-overlay, ui-window, ui-dialog, ui-workbench")) {
                        views.push(view);
                    }
                }
                return $(views);
            }
        }
    },
    "methods": {
        "activateView": function (view) {

            if ($(view).hasClass("active") && (!$(this).hasClass("browsing"))) {
                return;
            }

            let allViews = this.views;

            allViews.removeClass("not-browsing browsing x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 active").css("transform", "");

            $(this).removeClass("browsing");

            this.bringViewToFirst(view, true);

        },
        "bringViewToFirst": function (view, activate) {

            let views = [];
            for (let app of $(this).find("ui-app")) {
                for (let uiView of app.filler.query("ui-overlay, ui-dialog, ui-window, ui-workbench")) {
                    if ((!$(uiView).hasClass("hidden")) && (view !== uiView)) {
                        let zIndex = parseInt($(uiView).css("z-index"));
                        if ((!zIndex) || (!isFinite(zIndex))) {
                            zIndex = 0;
                        }
                        views.push({
                            "view": uiView,
                            "name": uiView.localName.toLowerCase(),
                            "index": views.length,
                            "z-index": zIndex
                        });
                    }
                }
            }

            views.sort((a, b) => {
                let diff = a["z-index"] - b["z-index"];
                if (diff === 0) {
                    diff = a.index - b.index;
                }
                return diff;
            });
            views.push({
                "view": view,
                "name": view.localName.toLowerCase()
            });

            views = [].concat(views.filter((view) => (view.name === "ui-workbench")))
                      .concat(views.filter((view) => (view.name === "ui-window")))
                      .concat(views.filter((view) => (view.name === "ui-dialog")))
                      .concat(views.filter((view) => (view.name === "ui-overlay")));

            for (let looper = 0; looper < views.length; ++looper) {
                $(views[looper].view).css("z-index", looper + 1);
            }

            if (activate) {
                for (let looper = 0; looper < views.length; ++looper) {
                    $(views[looper].view).removeClass("active");
                }
                $(view).addClass("active");
            }

        },
        "browseViews": function (views) {

            let allViews = this.views.filter((index, element) => {
                return !$(element).hasClass("hidden");
            }).filter((index, element) => {
                if (element.localName.toLowerCase() === "ui-overlay") {
                    element.closeOverlay();
                    return false;
                }
                return true;
            });

            if (!views) {
                views = allViews.filter((index, element) => {
                    return (element.localName.toLowerCase() !== "ui-overlay");
                });
            }

            if ($(this).hasClass("browsing")) {
                $(this).removeClass("browsing");
                allViews.removeClass("not-browsing browsing x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30").css("transform", "none");
                return;
            }

            let clientSize = this.filler.query("#apps").css(["width", "height"]);
            clientSize.width = parseFloat(clientSize.width);
            clientSize.height = parseFloat(clientSize.height);

            let counts = Math.round(Math.sqrt(views.length) / Math.sqrt(clientSize.width / clientSize.height));
            counts = { "width": Math.ceil(views.length / counts), "height": counts };

            let cellSize = { "width": clientSize.width / counts.width, "height": clientSize.height / counts.height };

            $(this).addClass("browsing");
            allViews.addClass("not-browsing").removeClass("browsing x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30");
            views.removeClass("not-browsing").addClass("browsing").each((index, view) => {

                let size = $(view).css(["width", "height"]);
                size.width = parseFloat(size.width);
                size.height = parseFloat(size.height);

                let scale = Math.min(cellSize.width * 0.7 / size.width, cellSize.height * 0.7 / size.height, 0.8);

                let className = "x" + Math.min(Math.max(4, Math.round(4 / scale)), 30);

                $(view).addClass(className);

                let [x, y] = [index % counts.width, Math.floor(index / counts.width)];
                if ((y >= counts.height - 1) && ((views.length % counts.width) !== 0)) {
                    x = x * clientSize.width / counts.width + (clientSize.width / counts.width * (counts.width - (views.length % counts.width) - 1) / 2);
                } else {
                    x = x * clientSize.width / counts.width;
                }
                x *= 0.8;
                x += clientSize.width * 0.1 + cellSize.width / 2 * 0.8;

                y = y * clientSize.height / counts.height * 0.8;
                y += clientSize.height * 0.1 + cellSize.height / 2 * 0.8;

                let position = $(view).css(["left", "top"]);
                position = {
                    "x": parseFloat(position.left) + size.width / 2,
                    "y": parseFloat(position.top) + size.height / 2
                };

                $(view).css("transform", `translate(${x - position.x}px, ${y - position.y}px) scale(${scale})`);

            });

        },
        "launchApp": function (app) {

            if ($(this).find("ui-app").filter((_, element) => $(element).attr("name") === app).length) {
                $.app(app).activateApp();
                return;
            }

            $(this).append($("<ui-app>").attr({
                "name": app
            }));

            $.app(app).activateApp();

        },
        "installDockIcon": function (icon) {

            this.filler.query("#dock").append(icon);

        },
        "installTrayIcon": function (icon) {

            this.filler.query("#nav-bar").prepend(icon);

        }
    },
    "functors": {
        "browseViews": function () {
            this.browseViews();
        },
        "showDebugInfo": function () {
            console.log("debug");
        }
    }
};

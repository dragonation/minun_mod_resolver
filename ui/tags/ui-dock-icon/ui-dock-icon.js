const prepareDockIcon = function (dom) {

    if (!dom.uiIcon) {
        dom.uiIcon = $("<div>").addClass("dock-icon").append($("<ui-icon>").attr(dom.filler.parameters.attributes));
        dom.uiIcon.dockIcon = dom;
        dom.uiIcon.on("click", (event) => {

            let that = $(dom);

            let app = $.app(dom);

            let selector = that.attr("view-selector");
            if (!selector) {
                selector = "ui-dialog, ui-window, ui-workbench";
            }

            let allViews = app.dom.filler.query(selector);
            let views = allViews.filter((index, element) => {
                return !$(element).hasClass("hidden");
            });

            if (views.length === 1) {
                if (views.hasClass("active")) {
                    // children.call("minimize");
                } else {
                    if (views[0].activateWindow) {
                        views[0].activateWindow();
                    } else if (views[0].activateDialog) {
                        views[0].activateDialog();
                    } else if (views[0].activateWorkbench) {
                        views[0].activateWorkbench();
                    } else {
                        throw new Error("Invalid view");
                    }
                }
            } else if (views.length > 0) {
                app.dom.browseViews(views);
            } else if (views.length === 0) {
                // let autolaunches = allChildren.$filter((child) => child.attribute("autolaunch") === "yes");
                // if (autolaunches.length > 0) {
                //     autolaunches.call("show");
                //     autolaunches[0].focus();
                // } else {
                //     $.command.dispatch(this, "dock-icon:launched", [{
                //         "id": this.id,
                //         "origin": this.uiIcon.positionToPage({ "x": 0, "y": 0 }),
                //         "size": this.uiIcon.size()
                //     }]);
                // }
            }

        });
    }

    $("ui-workshop")[0].installDockIcon(dom.uiIcon);

    dom.updateWindows();

};

const disposeDockIcon = function (dom) {

    $(dom).detach();

};

module.exports = {
    "attributes": [ "id", "icon", "label", "symbol", "class", "badge", "style", "title", "windows" ],
    "listeners": {
        "onconnected": function () {
            prepareDockIcon(this);
        },
        "ondisconnected": function () {
            disposeDockIcon(this);
        },
        "onupdated": function (name, value) {
            if (this.uiIcon) {
                this.uiIcon.find("ui-icon").attr(name, value);
            }
        }
    },
    "methods": {
        "updateWindows": function () {
            if (!this.uiIcon) {
                return;
            }
            let that = $(this);
            let selector = that.attr("windows-selector");
            if (!selector) {
                selector = "ui-dialog, ui-window, ui-workbench, ui-overlay";
            }
            let children = that.parent().children(selector).filter((index, element) => {
                return !$(element).hasClass("hidden");
            });
            this.uiIcon.keepClass({
                "live": children.length > 0,
                "active": children.filter(".active").length > 0
            });
        }
    }
};

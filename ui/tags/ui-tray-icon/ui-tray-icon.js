const prepareTrayIcon = function (dom) {

    if (!dom.uiIcon) {
        dom.uiIcon = $("<ui-button>").addClass("tray-icon").append($("<ui-icon>").attr(dom.filler.parameters.attributes));
        dom.uiIcon.trayIcon = dom;
        dom.uiIcon.on("click", (event) => {
            dom.trigAction(event);
        });
    }

    $("ui-workshop")[0].installTrayIcon(dom.uiIcon);

};

const disposeTrayIcon = function (dom) {

    $(dom).detach();

};

module.exports = {
    "attributes": [ "id", "icon", "label", "class", "badge", "style", "title" ],
    "listeners": {
        "onconnected": function () {
            prepareTrayIcon(this);
        },
        "ondisconnected": function () {
            disposeTrayIcon(this);
        },
        "onupdated": function (name, value) {
            if (this.uiIcon) {
                this.uiIcon.find("ui-icon").attr(name, value);
            }
        }
    },
    "methods": {
        "trigAction": function (event) {
            $(this).trigger("trayiconaction", {});
        }
    }
};

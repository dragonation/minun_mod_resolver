const uiActionList = require("../ui-action-list/ui-action-list.js");

let apps = Object.create(null);

const showActionList = function (actions, from, direction) {

    return uiActionList.globals.showActionList(actions, from, direction);

};

const createWindow = function (path, options) {

    if (!options) { options = {}; }

    let getNumber = (key, defaultValue) => {
        let value = parseInt(options[key]);
        if (isFinite(value)) {
            value = Math.max(0, value);
        } else {
            value = defaultValue;
        }
        return value;
    };

    let width = getNumber("width", 600);
    let height = getNumber("height", 400);
    let left = getNumber("left");
    if (typeof left !== "number") {
        left = Math.round((parseInt($("body").css("width")) - width) / 2);
    }
    let top = getNumber("top");
    if (typeof top !== "number") {
        top = Math.round((parseInt($("body").css("height")) - height) / 2.5);
    }

    let dom = $("<ui-window>").css({
        "left": `${left}px`,
        "top": `${top}px`,
        "width": `${width}px`,
        "height": `${height}px`
    }).attr({
        "app": this.name,
        "path": path,
        "caption": options.caption ? options.caption : "untitled",
        "resizable": options.resizable ? "yes" : "no",
        "just-hide-when-close": options.justHideWhenClose ? "yes" : "no"
    }).addClass("hidden");

    return dom[0].window;

};

const createOverlay = function (path, options) {

    if (!options) { options = {}; }

    let getNumber = (key, defaultValue) => {
        let value = parseInt(options[key]);
        if (isFinite(value)) {
            value = Math.max(0, value);
        } else {
            value = defaultValue;
        }
        return value;
    };

    let width = getNumber("width", 600);
    let height = getNumber("height", 400);
    let left = getNumber("left");
    if (typeof left !== "number") {
        left = Math.round((parseInt($("body").css("width")) - width) / 2);
    }
    let top = getNumber("top");
    if (typeof top !== "number") {
        top = Math.round((parseInt($("body").css("height")) - height) / 2.5);
    }

    let dom = $("<ui-overlay>").css({
        "left": `${left}px`,
        "top": `${top}px`,
        "width": `${width}px`,
        "height": `${height}px`
    }).attr({
        "app": this.name,
        "path": path,
        "resizable": options.resizable ? "yes" : "no",
        "just-hide-when-close": options.justHideWhenClose ? "yes" : "no"
    }).addClass("hidden");

    return dom[0].overlay;

};

const activateApp = function () {

    let view = this.filler.query("ui-window, ui-dialog, ui-workbench, ui-overlay")[0];
    if (view) {
        this.dom.activateView(view);
    }

};

const completeApp = function (App) {

    if (!App.prototype.createWindow) {
        App.prototype.createWindow = createWindow;
    }

    if (!App.prototype.createOverlay) {
        App.prototype.createOverlay = createOverlay;
    }

    if (!App.prototype.activateApp) {
        App.prototype.activateApp = activateApp;
    }

    if (!App.prototype.showActionList) {
        App.prototype.showActionList = showActionList;
    }

};

module.exports = {
    "attributes": [],
    "listeners": {
        "onconnected": function () {

            let name = $(this).attr("name");

            if (apps[name]) {
                throw new Error(`App[${name}] already opened`);
            }

            let { App } = require(`/~${name}/scripts/app.js`);

            completeApp(App);

            let [css, cssParameters, cssMixins, cssVariants] = $.tmpl.css($.res.load(`/~${name}/styles/app.css`), {}, {
                "path": `/~${name}/styles/app.css`
            });

            let xhtml = $.res.load(`/~${name}/app.xhtml`);
            if (css.trim()) {
                if (typeof xhtml === "string") {
                    xhtml = `<style>${css}</style>${xhtml}`;
                } else {
                    xhtml = xhtml.slice(0);
                    xhtml.unshift({
                        "prefix": "",
                        "name": ["style"],
                        "type": "element",
                        "namespace": $.tmpl.xhtmlNamespaceURI,
                        "attributes": {},
                        "children": [{
                            "type": "text",
                            "content": css
                        }]
                    });
                }
            }

            let parameters = { "tag": this, "name": name };

            let functors = {};
            if (App.functors) {
                for (let key in App.functors) {
                    functors[key] = (function (template, call, parameters, options) {
                        return App.functors[key].apply(this.app, Array.prototype.slice.call(arguments, 4));
                    }).bind(this);
                }
            }

            let filler = $.tmpl(xhtml, parameters, {
                "functors": functors
            });

            filler.render(this.filler.query("shadow-root"));

            this.app = new App(this, filler);
            if (!this.app.dom) { this.app.dom = this; }
            if (!this.app.filler) { this.app.filler = filler; }
            if (!this.app.name) { this.app.name = name; }

            apps[name] = this.app;

            this.updateWindows();

        }
    },
    "methods": {
        "browseViews": function (views) {

            let parent = $(this).parent()[0];
            if (parent && parent.browseViews) {
                parent.browseViews(views);
            }

        },
        "activateView": function (view) {

            let parent = $(this).parent()[0];
            if (parent && parent.activateView) {
                parent.activateView(view);
            }

            this.updateWindows();

        },
        "activateTopView": function () {

            let allViews = this.filler.query("ui-overlay, ui-window, ui-dialog, ui-workbench");

            let views = [];
            for (let looper = 0; looper < allViews.length; ++looper) {
                let view = allViews[looper];
                if (!$(view).hasClass("hidden")) {
                    views.push({
                        "view": view,
                        "name": view.localName.toLowerCase(),
                        "index": looper,
                        "z-index": $(view).css("z-index")
                    });
                }
            }

            views.sort((a, b) => {
                let diff = a["z-index"] - b["z-index"];
                if (diff === 0) {
                    diff = a.index - b.index;
                }
                return diff;
            });

            views = [].concat(views.filter((view) => (view.name === "ui-workbench")))
                      .concat(views.filter((view) => (view.name === "ui-window")))
                      .concat(views.filter((view) => (view.name === "ui-dialog")))
                      .concat(views.filter((view) => (view.name === "ui-overlay")));

            let view = views[views.length - 1];
            if (view) {
                this.activateView(view.view);
            } else {
                this.updateWindows();
            }

        },
        "bringViewToFirst": function (view) {

            let parent = $(this).parent()[0];
            if (parent && parent.bringViewToFirst) {
                parent.bringViewToFirst(view);
            }

            this.updateWindows();

        },
        "updateWindows": function () {

            for (let dockIcon of this.filler.query("ui-dock-icon")) {
                dockIcon.updateWindows();
            }

        },
        "hideOtherOverlays": function (overlay) {

            let parent = $(this).parent()[0];
            if (parent && parent.hideOtherOverlays) {
                parent.hideOtherOverlays(overlay);
            }

        }
    },
    "functors": {}
};

$.app = function (name) {

    if (typeof name === "string") {
        return apps[name];
    }

    let app = $(name).attr("app");
    if (app) {
        return apps[app];
    }

    let parent = name;
    while (parent.parentNode) {
        parent = parent.parentNode;
    }

    if (!parent) {
        return undefined;
    }

    let host = parent.host;
    if (!host) {
        return undefined;
    }

    return host.app;

};

$.app.updateWindows = function () {

    for (let name in apps) {
        apps[name].dom.updateWindows();
    }

};

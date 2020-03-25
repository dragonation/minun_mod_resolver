const extraPadding = 4;
const pickerButtonWidth = 23;
const pickerButtonOffset = 0;
const minDistanceToScreenEdge = 10;

$.dom.autoregisterTag("ui-picker-field-menu");

const showPickerFieldMenu = function () {

    let value = $(this).attr("value");

    let index = -1;

    let items = [];
    for (let item of $(this).children("ui-picker-field-item")) {
        item = $(item);
        let itemValue = item.attr("value");
        if (itemValue === value) {
            index = items.length;
        }
        items.push({
            "value": itemValue,
            "disabled": item.attr("disabled") === "yes",
            "text": item.text()
        });
    }

    let rect = this.getClientRects()[0];

    let sizes = $(this).css(["width", "height", 
                             "font-family", "font-size", "line-height", 
                             "border-top-width", "border-bottom-width",
                             "padding-left", "padding-right", 
                             "padding-top", "padding-bottom",
                             "margin-top", "margin-left"]);

    let totalHeight = parseFloat(sizes.height) * Math.max(1, items.length) + extraPadding * 2 + parseFloat(sizes["border-top-width"]) + parseFloat(sizes["border-bottom-width"]);

    let top = rect.top - extraPadding;
    if (index !== -1) {
        top -= parseFloat(sizes.height) * index;
    }

    let displayTop = Math.max(top, minDistanceToScreenEdge - parseFloat(sizes["border-top-width"]));
    let displayBottom = Math.min(displayTop + totalHeight, 
                                 (parseFloat($("body").css("height")) - minDistanceToScreenEdge) +
                                  parseFloat(sizes["border-top-width"]) + 
                                  parseFloat(sizes["border-bottom-width"]));

    let scrollOffset = displayTop - top + parseFloat(sizes["border-top-width"]);
    let scrollPaddingTop = 0;
    let scrollPaddingBottom = 0;

    if (displayBottom - displayTop < totalHeight) {
        let newTop = Math.max(minDistanceToScreenEdge - parseFloat(sizes["border-top-width"]), 
                              displayBottom - totalHeight);
        scrollOffset -= displayTop - newTop;
        if (scrollOffset < 0) {
            scrollPaddingTop = -scrollOffset;
            scrollOffset = 0;
        }
        displayTop = newTop;
    }
    if (displayBottom - displayTop < totalHeight) {
        let newBottom = Math.min(displayTop + totalHeight, 
                                 (parseFloat($("body").css("height")) - minDistanceToScreenEdge) +
                                  parseFloat(sizes["border-top-width"]) + 
                                  parseFloat(sizes["border-bottom-width"]));
        displayBottom = newBottom;
    }
    if (scrollOffset + (displayBottom - displayTop) >= totalHeight + parseFloat(sizes["border-top-width"]) + 
                                  parseFloat(sizes["border-bottom-width"])) {
        scrollPaddingBottom = scrollOffset + (displayBottom - displayTop) - 
                              totalHeight;
    }

    $(this).addClass("picking");

    let menu = $("<ui-picker-field-menu>").prop({
        "items": items
    }).attr({
        "value": value,
        "items": "{ /* Property */ }",
        "scroll-padding-top": scrollPaddingTop,
        "scroll-padding-bottom": scrollPaddingBottom,
    }).css({
        "margin-left": sizes["margin-left"],
        "margin-top": sizes["margin-top"],
        "left": `${rect.left + pickerButtonOffset}px`,
        "top": `${displayTop}px`,
        "height": `${displayBottom - displayTop}px`,
        "width": `${parseFloat(sizes["width"]) - (pickerButtonWidth + pickerButtonOffset)}px`,
        "font-family": sizes["font-family"],
        "font-size": sizes["font-size"],
        "line-height": `${parseFloat(sizes["line-height"]) + parseFloat(sizes["border-top-width"]) + parseFloat(sizes["border-bottom-width"])}px`,
        "--menu-edge-padding": `${extraPadding}px`,
        "--item-height": sizes["height"],
        "--item-padding-left": sizes["padding-left"],
        "--item-padding-top": sizes["padding-top"],
        "--item-padding-right": sizes["padding-right"],
        "--item-padding-bottom": sizes["padding-bottom"],
    }).addClass("hidden").on("activated", (event, { value }) => {
        $(this).attr("value", value);
        $(this).trigger("change", { "value": value });
        $("ui-workshop")[0].removeGlass(menu[0]);
    });

    $("ui-workshop")[0].addGlass(menu[0], () => {
        menu.addClass("hidden");
        $(this).focus();
        $(this).removeClass("picking");
        delete this.pickerFieldMenu;
        $.delay(300, () => {
            menu.detach();
        });
    });

    menu[0].filler.query("ui-scroll-view")[0].scrollTop = scrollOffset;

    $.delay(() => {
        menu.removeClass("hidden");
    });

    this.pickerFieldMenu = menu;

};

module.exports = {
    "focusable": true,
    "attributes": ["placeholder", "value"],
    "listeners": {
        "oncreated": function () {
            this.lastValue = "";
            $(this).on("focus", () => {
                $(this).addClass("focused");
            });
            $(this).on("blur", () => {
                $(this).removeClass("focused");
            });
            $(this).on("mousedown", () => {
                showPickerFieldMenu.call(this);
            });
        },
        "onupdated": function (name, value) {
            if (name === "value") {
                let lastValue = this.filler.query("input").val();
                if (lastValue !== value) {
                    this.filler.query("input").val(value);
                }
                this.lastValue = value;
            }
        }
    },
    "properties": {
        "value": {
            "get": function () {
                return this.filler.query("input").val();
            },
            "set": function (value) {
                this.filler.query("input").val(value);
            }
        }
    },
    "functors": {
        "ignoreInput": function (event) {
            event.preventDefault();
            event.stopPropagation();
        },
        "resolveText": function (value) {
            if (!value) { return; }
            let node = $(this).children("ui-picker-field-item").filter((index, element) => {
                return $(element).attr("value") === value;
            })[0];
            if (!node) { return value; }
            return $(node).text();
        },
        "processKeyboardEvent": function (event) {

            switch (event.keyCode) {
                case 27: {
                    if (this.pickerFieldMenu) {
                        let menu = this.pickerFieldMenu;
                        $("ui-workshop")[0].removeGlass(menu[0]);
                    }
                    break;
                }
                case 32: // space
                case 13: { // enter
                    if (!this.pickerFieldMenu) {
                        showPickerFieldMenu.call(this);
                    } else {
                        let menu = this.pickerFieldMenu;
                        let value = menu.attr("value");
                        $(this).attr("value", value);
                        $(this).trigger("change", { "value": value });
                        $("ui-workshop")[0].removeGlass(menu[0]);
                    }
                    break;
                }
                case 38: { // up
                    if (this.pickerFieldMenu) {
                        let items = this.pickerFieldMenu[0].items;
                        let value = this.pickerFieldMenu.attr("value");
                        let index = -1;
                        for (let looper = 0; looper < items.length; ++looper) {
                            if (items[looper].value === value) {
                                index = looper;
                            }
                        }
                        let newIndex = (index - 1 + items.length) % items.length;
                        let newValue = items[newIndex].value;
                        this.pickerFieldMenu[0].selectValue(newValue, extraPadding);
                    }
                    break;
                }
                case 40: { // down
                    if (this.pickerFieldMenu) {
                        let items = this.pickerFieldMenu[0].items;
                        let value = this.pickerFieldMenu.attr("value");
                        let index = -1;
                        for (let looper = 0; looper < items.length; ++looper) {
                            if (items[looper].value === value) {
                                index = looper;
                            }
                        }
                        let newIndex = (index + 1 + items.length) % items.length;
                        let newValue = items[newIndex].value;
                        this.pickerFieldMenu[0].selectValue(newValue, extraPadding);
                    }
                    break;
                }
            }

        }
    },
    "methods": {}
};

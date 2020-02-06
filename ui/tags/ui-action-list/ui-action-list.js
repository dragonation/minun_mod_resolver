const lineHeight = 30;
const extraPadding = 4;
const extraMargin = 5;
const extraIndent = 10;
const minDistanceToScreenEdge = 10;
const maxWidth = 200;

const showActionList = function (actions, from, direction) {

    let minLeft = $.dom.getDevicePixels(minDistanceToScreenEdge);
    let minTop = $.dom.getDevicePixels(minDistanceToScreenEdge);
    let maxRight = (parseFloat($("body").css("width")) - 
                    $.dom.getDevicePixels(minDistanceToScreenEdge));
    let maxBottom = (parseFloat($("body").css("height")) - 
                     $.dom.getDevicePixels(minDistanceToScreenEdge));

    let rect = from.getClientRects()[0];

    let totalHeight = ($.dom.getDevicePixels(lineHeight) * Math.max(1, actions.length) + 
                       $.dom.getDevicePixels(extraPadding) * 2 + 2);
    let totalWidth = $.dom.getDevicePixels(maxWidth);

    if (!direction) {
        direction = "down";
    }
    if ((direction === "down") && 
        (rect.bottom + totalHeight + $.dom.getDevicePixels(extraMargin) > maxBottom)) {
        direction = "up";
    }
    if ((direction === "up") && 
        (rect.top - totalHeight - $.dom.getDevicePixels(extraMargin) < minTop)) {
        direction = "right";
    }
    if ((direction === "right") && 
        (rect.left + rect.right) / 2 >= (maxRight + minLeft) / 2) {
        direction = "left";
    }

    let left = "auto"; let right = "auto"; 
    let top = "auto"; let bottom = "auto";
    let height = "auto"; let width = `${totalWidth}px`;
    let arrowX = rect.width / 2;
    let arrowY = rect.height / 2;
    switch (direction) {
        case "left": {
            let numberRight = rect.left - $.dom.getDevicePixels(extraMargin);
            right = `${parseFloat($("body").css("width")) - numberRight}px`;
            let numberTop = (rect.top + rect.height / 2) - totalHeight / 2;
            let numberBottom = numberTop + totalHeight;
            if (numberTop < minTop) {
                numberBottom = Math.min(maxBottom, minTop + totalHeight);
                numberTop = minTop;
            }
            if (numberBottom > maxBottom) {
                numberTop = Math.max(minTop, maxBottom - totalHeight);
                numberBottom = maxBottom;
            }
            top = `${numberTop}px`;
            arrowY = (rect.top + rect.height / 2) - numberTop;
            height = `${numberBottom - numberTop}px`;
            break;
        }
        case "right": {
            let numberLeft = rect.right + $.dom.getDevicePixels(extraMargin);
            left = `${numberLeft}px`;
            let numberTop = (rect.top + rect.height / 2) - totalHeight / 2;
            let numberBottom = numberTop + totalHeight;
            if (numberTop < minTop) {
                numberBottom = Math.min(maxBottom, minTop + totalHeight);
                numberTop = minTop;
            }
            if (numberBottom > maxBottom) {
                numberTop = Math.max(minTop, maxBottom - totalHeight);
                numberBottom = maxBottom;
            }
            top = `${numberTop}px`;
            arrowY = (rect.top + rect.height / 2) - numberTop;
            height = `${numberBottom - numberTop}px`;
            break;
        }
        case "up": {
            let numberBottom = rect.top - $.dom.getDevicePixels(extraMargin);
            bottom = `${parseFloat($("body").css("height")) - numberBottom}px`;
            let top = numberBottom - totalHeight;
            if (top < minTop) {
                height = `${numberBottom - top}px`;
            } else {
                height = `${totalHeight}px`;
            }
            if ((rect.left + rect.right) / 2 >= (maxRight + minLeft) / 2) {
                right = `${parseFloat($("body").css("width")) - rect.right - $.dom.getDevicePixels(extraIndent)}px`;
                arrowX = totalWidth - arrowX - $.dom.getDevicePixels(extraIndent);
            } else {
                left = `${rect.left - $.dom.getDevicePixels(extraIndent)}px`;
                arrowX += $.dom.getDevicePixels(extraIndent);
            }
            break;
        }
        case "down": {
            let numberTop = rect.bottom + $.dom.getDevicePixels(extraMargin);
            top = `${numberTop}px`;
            let bottom = numberTop + totalHeight;
            if (bottom > maxBottom) {
                height = `${maxBottom - top}px`;
            } else {
                height = `${totalHeight}px`;
            }
            if ((rect.left + rect.right) / 2 >= (maxRight + minLeft) / 2) {
                right = `${parseFloat($("body").css("width")) - rect.right - $.dom.getDevicePixels(extraIndent)}px`;
                arrowX = totalWidth - arrowX - $.dom.getDevicePixels(extraIndent);
            } else {
                left = `${rect.left - $.dom.getDevicePixels(extraIndent)}px`;
                arrowX += $.dom.getDevicePixels(extraIndent);
            }
            break;
        }
        default: { throw new Error("Invalid direction"); }
    }

    $(from).addClass("picking");

    let list = $("<ui-action-list>").prop({
        "actions": actions
    }).attr({
        "actions": "{ /* Property */ }",
    }).css({
        "left": left, "top": top,
        "right": right, "bottom": bottom,
        "width": width, "height": height,
        "--arrow-x": `${arrowX}px`,
        "--arrow-y": `${arrowY}px`,
        "--menu-edge-padding": `${$.dom.getDevicePixels(extraPadding)}px`,
    }).addClass(`hidden direction-${direction}`).on("action", (event, { action }) => {
        $("ui-workshop")[0].removeGlass(list[0]);
    });

    $("ui-workshop")[0].addGlass(list[0], () => {
        list.addClass("hidden");
        $(from).removeClass("picking");
        $.delay(300, () => {
            list.detach();
        });
    });

    $.delay(() => {
        list.removeClass("hidden");
    });

};

module.exports = {
    "attributes": [ "actions" ],
    "methods": {},
    "functors": {
        "takeAction": function (item) {
            if (item.action) {
                item.action();
            }
            $(this).trigger("action", {
                "action": item
            });
        }
    },
    "globals": {
        "showActionList": showActionList
    }
};
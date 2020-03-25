const lineHeight = 30;
const separatorHeight = 10;
const extraPadding = 4;
const extraMargin = 5;
const extraIndent = 10;
const minDistanceToScreenEdge = 10;
const maxWidth = 200;

const showActionList = function (actions, from, direction, callback) {

    let minLeft = minDistanceToScreenEdge;
    let minTop = minDistanceToScreenEdge;
    let maxRight = (parseFloat($("body").css("width")) - minDistanceToScreenEdge);
    let maxBottom = (parseFloat($("body").css("height")) - minDistanceToScreenEdge);

    let rect = from.getClientRects()[0];

    let separatorCount = 0;
    let finalActions = [];
    for (let action of actions) {
        if (action.text === "-") {
            if ((finalActions.length > 0) &&
                (finalActions[finalActions.length - 1].text !== "-")) {
                ++separatorCount;
                finalActions.push(action);
            }
        } else {
            finalActions.push(action);
        }
    }
    if ((finalActions.length > 0) && 
        (finalActions[finalActions.length - 1].text === "-")) {
        finalActions.pop();
    }
    actions = finalActions;

    let totalHeight = (lineHeight * Math.max(1, actions.length - separatorCount) + 
                       separatorHeight * separatorCount +
                       extraPadding * 2 + 2);
    let totalWidth = maxWidth;

    if (!direction) {
        direction = "down";
    }
    if ((direction === "down") && 
        (rect.bottom + totalHeight + extraMargin > maxBottom)) {
        direction = "up";
    }
    if ((direction === "up") && 
        (rect.top - totalHeight - extraMargin < minTop)) {
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
            let numberRight = rect.left - extraMargin;
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
            let numberLeft = rect.right + extraMargin;
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
            let numberBottom = rect.top - extraMargin;
            bottom = `${parseFloat($("body").css("height")) - numberBottom}px`;
            let top = numberBottom - totalHeight;
            if (top < minTop) {
                height = `${numberBottom - top}px`;
            } else {
                height = `${totalHeight}px`;
            }
            if ((rect.left + rect.right) / 2 >= (maxRight + minLeft) / 2) {
                right = `${parseFloat($("body").css("width")) - rect.right - extraIndent}px`;
                arrowX = totalWidth - arrowX - extraIndent;
            } else {
                left = `${rect.left - extraIndent}px`;
                arrowX += extraIndent;
            }
            break;
        }
        case "down": {
            let numberTop = rect.bottom + extraMargin;
            top = `${numberTop}px`;
            let bottom = numberTop + totalHeight;
            if (bottom > maxBottom) {
                height = `${maxBottom - top}px`;
            } else {
                height = `${totalHeight}px`;
            }
            if ((rect.left + rect.right) / 2 >= (maxRight + minLeft) / 2) {
                right = `${parseFloat($("body").css("width")) - rect.right - extraIndent}px`;
                arrowX = totalWidth - arrowX - extraIndent;
            } else {
                left = `${rect.left - extraIndent}px`;
                arrowX += extraIndent;
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
        "--menu-edge-padding": `${extraPadding}px`,
    }).addClass(`hidden direction-${direction}`).on("action", (event, { action }) => {
        $("ui-workshop")[0].removeGlass(list[0]);
    });

    $("ui-workshop")[0].addGlass(list[0], () => {
        list.addClass("hidden");
        $(from).removeClass("picking");
        if (callback) {
            try {
                callback();
            } catch (error) {
                console.error(error);
            }
        }
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
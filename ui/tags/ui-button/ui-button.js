const edgePadding = $.dom.getDevicePixels(5);

module.exports = {

    "attributes": [ "disabled" ],

    "listeners": {
        "oncreated": function () {

            $(this).on("mousedown", (event) => {

                if (!(event.buttons & 1)) {
                    return;
                }
                let disabled = this.getAttribute("disabled");
                if (disabled === "yes") {
                    return;
                }

                $(this).addClass("pressing");

                let rect = this.getClientRects()[0];
                rect = {
                    "left": rect.left, "top": rect.top,
                    "right": rect.right, "bottom": rect.bottom
                };

                const onmousemove = (event) => {

                    if (!(event.buttons & 1)) {
                        $("body").off("mousemove", onmousemove).off("mouseup", onmouseup);
                        $(this).removeClass("pressing");
                        return;
                    }

                    let x = $.dom.getDevicePixels(event.pageX);
                    let y = $.dom.getDevicePixels(event.pageY);
                    if ((x >= rect.left - edgePadding) && (x < rect.right + edgePadding) &&
                        (y >= rect.top - edgePadding) && (y < rect.bottom + edgePadding)) {
                        if (!$(this).hasClass("pressing")) {
                            $(this).addClass("pressing");
                        }
                    } else {
                        if ($(this).hasClass("pressing")) {
                            $(this).removeClass("pressing");
                        }
                    }

                };

                const onmouseup = (event) => {

                    if (event.buttons & 1) {
                        return;
                    }

                    let x = $.dom.getDevicePixels(event.pageX);
                    let y = $.dom.getDevicePixels(event.pageY);
                    if ((x >= rect.left - edgePadding) && (x < rect.right + edgePadding) &&
                        (y >= rect.top - edgePadding) && (y < rect.bottom + edgePadding)) {
                        $(this).trigger("action", {});
                    }

                    $("body").off("mousemove", onmousemove).off("mouseup", onmouseup);
                    $(this).removeClass("pressing");

                };

                $("body").on("mousemove", onmousemove).on("mouseup", onmouseup);

            });

        },
        "onupdated": function (name, value) {
            if (name === "disabled") {
                $(this).keepClass({
                    "disabled": (value == "yes")
                });
            }
        }
    }

};
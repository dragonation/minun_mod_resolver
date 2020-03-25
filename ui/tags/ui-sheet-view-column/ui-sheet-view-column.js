module.exports = {
    "attributes": [ "cell-slot", "cell-getter", "name" ],
    "listeners": {
        "onconnected": function () {
            if ($(this).attr("name") === "<ui-sheet-view-cell-empty>") {
                return;
            }
            this.updateSheetView();
        },
        "onupdated": function (name, value) {
            this.updateSheetView();
        }
    },
    "methods": {
        "updateSheetView": function () {
            let sheetView = $(this).parent()[0];
            if (sheetView && (sheetView.localName.toLowerCase() === "ui-sheet-view")) {
                sheetView.dataReloaded = true;
                sheetView.updateView();
            }
        }
    },
    "functors": {
        "startToResize": function (event) {

            if ((event.buttons & 1) === 0) {
                return;
            }

            let width = parseFloat($(this).css("width")) + 1;
            let initial = event.pageX;

            const onmousemove = (event) => {

                if ((event.buttons & 1) === 0) {
                    $("body").off("mousemove", onmousemove).off("mouseup", onmouseup);
                    return;
                }

                let transform = event.pageX - initial;

                let newWidth = Math.max(10, width + transform);

                $(this).css("--column-width", `${newWidth}px`);

                let sheetView = $(this).parent()[0];
                if (sheetView && (sheetView.localName.toLowerCase() === "ui-sheet-view")) {
                    this.updateSheetView();
                }

            };

            const onmouseup = (event) => {

                if ((event.buttons & 1) === 0) {
                    $("body").off("mousemove", onmousemove).off("mouseup", onmouseup);
                }

            };

            $("body").on("mousemove", onmousemove).on("mouseup", onmouseup);

        }
    }
};
module.exports = {
    "attributes": [ "columns", "data" ],
    "listeners": {
        "oncreated": function () {
            this.cellCaches = Object.create(null);
            this.environmentParameters = {};
        },
        "onconnected": function () {

            if (this.lastScrollingOffset) {
                let scrollView = this.filler.query("#sheet-body")[0];
                scrollView.scrollLeft = this.lastScrollingOffset.scrollLeft;
                scrollView.scrollTop = this.lastScrollingOffset.scrollTop;
            }

            this.resizeObserver = new ResizeObserver((entries) => {
                this.updateView();
            });
            this.resizeObserver.observe(this);

            this.updateView();

        },
        "ondisconnected": function () {
            this.resizeObserver.disconnect(this);
        },
        "onadopted": function () {
        },
        "onupdated": function (name, value, parameters) {
            if (name === "data") {
                this.dataReloaded = true;
                this.updateView();
            } else if (name === "columns") {
                this.dataReloaded = true;
                this.updateView();
            }
        }
    },
    "methods": {
        "updateTagInternalTemplates": function (parameters, animations, actions) {

            this.environmentParameters = parameters;

            let data = this.data;
            if (!data) { data = []; }

            Object.keys(this.cellCaches).forEach((key) => {

                if ((key === "cells") || (key === "columns") || (key === "sequence")) {
                    return;
                }

                let cell = this.cellCaches[key].cell;
                let column = this.cellCaches[key].column;
                if (cell) {
                    let cellData = null;
                    if (column !== "<ui-sheet-view-cell-empty>") {
                        cellData = $.format.tmpl(this.cellCaches.columns[column].getter, {
                            "rowIndex": cell.parameters.rowIndex,
                            "row": data[cell.parameters.rowIndex]
                        }, {});
                    }
                    let fillParameters = Object.assign({}, parameters, {
                        "rowIndex": cell.parameters.rowIndex,
                        "row": data[cell.parameters.rowIndex],
                        "cellIndex": cell.parameters.cellIndex,
                        "cell": cellData,
                    });
                    this.cellCaches.columns[column].slot.keepClasses(this.cellCaches[key].cellContainer[0], fillParameters);
                    cell.fill(fillParameters);
                }

            });

        },
        "scrollToCell": function (rowIndex, columnIndex, extraPadding) {

            let rowHeight = $(this).css("--row-height");
            rowHeight = parseFloat(rowHeight);
            if (!isFinite(rowHeight)) {
                rowHeight = parseFloat(this.filler.parameters.css["default-row-height"]);
            }

            let column = this.cellCaches.sequence[columnIndex];

            let left = this.cellCaches.columns[column].left;
            let width = this.cellCaches.columns[column].width;

            let top = rowIndex * rowHeight;
            let height = rowHeight;

            this.filler.query("#sheet-body")[0].scrollForRect({
                "left": left,
                "top": top,
                "width": width,
                "height": height,
            }, rowHeight);

        },
        "updateView": function () {

            let data = this.data;
            if (!data) { data = []; }

            let dataReloaded = this.dataReloaded;
            this.dataReloaded = false;

            const coast = $.dom.getDevicePixels(200);

            let scrollView = this.filler.query("#sheet-body");
            let placeholder = this.filler.query("#placeholder");
            let headPlaceholder = this.filler.query("#sheet-head-placeholder");

            let sizes = $(this).css(["--row-height", "--column-width", "--extra-padding-bottom", "width"]);
            sizes.rowHeight = parseFloat(sizes["--row-height"]);
            if (!isFinite(sizes.rowHeight)) {
                sizes.rowHeight = parseFloat(this.filler.parameters.css["default-row-height"]);
            }
            sizes.columnWidth = parseFloat(sizes["--column-width"]);
            if (!isFinite(sizes.columnWidth)) {
                sizes.columnWidth = parseFloat(this.filler.parameters.css["default-column-width"]);
            }
            sizes.extraPaddingBottom = parseFloat(sizes["--extra-padding-bottom"]);
            if (!isFinite(sizes.extraPaddingBottom)) {
                sizes.extraPaddingBottom= parseFloat(this.filler.parameters.css["default-extra-padding-bottom"]);
            }
            sizes.clientWidth = this.clientWidth;
            sizes.clientHeight = this.clientHeight;
            sizes.scrollLeft = scrollView[0].scrollLeft;
            sizes.scrollTop = scrollView[0].scrollTop;

            if (dataReloaded) {
                Object.keys(this.cellCaches).forEach((key) => {
                    if ((key === "cells") || (key === "sequence")) {
                        return;
                    }
                    if (key === "columns") {
                        this.cellCaches.columns = Object.create(null);
                        return;
                    }
                    if (this.cellCaches[key].cellContainer) {
                        this.cellCaches[key].cellContainer.addClass("not-used").css({
                            "left": (-sizes.columnWidth) + "px",
                            "top": (-sizes.rowHeight) + "px"
                        });
                        this.cellCaches.cells[this.cellCaches[key].type].push(this.cellCaches[key]);
                        delete this.cellCaches[key];
                    }
                });
            }

            let restColumns = Object.create(null);
            for (let node of $(this).children("ui-sheet-view-column")) {
                restColumns[$(node).attr("name")] = node;
            }

            let columns = $(this).attr("columns");
            if (!columns) {
                columns = [];
            } else {
                let columns2 = columns.trim().split(/[,\s]+/).filter((column) => column);
                columns = [];
                for (let column of columns2) {
                    if (columns.indexOf(column) === -1) {
                        columns.push(column);
                    }
                }
            }

            let fixedRightColumns = $(this).attr("fixed-right-columns");
            if (!fixedRightColumns) { 
                fixedRightColumns = []; 
            } else {
                let columns2 = fixedRightColumns.trim().split(/[,\s]+/).filter((column) => column);
                fixedRightColumns = [];
                for (let column of columns2) {
                    if (fixedRightColumns.indexOf(column) === -1) {
                        fixedRightColumns.push(column);
                    }
                    let index = columns.indexOf(column);
                    if (index !== -1) {
                        columns.splice(index, 1);
                    }
                }
            }

            let fixedLeftColumns = $(this).attr("fixed-left-columns");
            if (!fixedLeftColumns) { 
                fixedLeftColumns = []; 
            } else {
                let columns2 = fixedLeftColumns.trim().split(/[,\s]+/).filter((column) => column);
                fixedLeftColumns = [];
                for (let column of columns2) {
                    if (fixedLeftColumns.indexOf(column) === -1) {
                        fixedLeftColumns.push(column);
                    }
                    let index = columns.indexOf(column);
                    if (index !== -1) {
                        columns.splice(index, 1);
                    }
                    index = columns.indexOf(column);
                    if (index !== -1) {
                        columns.splice(index, 1);
                    }
                }
            }

            $(this).keepClass({
                "has-fixed-left": fixedLeftColumns.length > 0,
                "has-fixed-right": fixedRightColumns.length > 0
            });
            
            if (!this.cellCaches.columns) {
                this.cellCaches.columns = Object.create(null);
            }
            let columnInfo = [];
            let columnX = 0;
            for (let column of fixedLeftColumns.slice(0).concat(columns).concat(fixedRightColumns)) {
                
                if ((!this.cellCaches.columns[column]) || 
                    (!this.cellCaches.columns[column].node.length)) {
                    let node = restColumns[column];
                    let width = $(node).css("--column-width");
                    if (width) {
                        width = parseInt(width);
                        if (!isFinite(width)) {
                            width = sizes.columnWidth;
                        } else {
                            width = $.dom.getDevicePixels(width);
                        }
                    } else {
                        width = sizes.columnWidth;
                    }
                    let getter = $(node).attr("cell-getter");
                    if (getter) {
                        getter = getter.trim();
                    } else {
                        getter = "row";
                    }
                    if (getter[0] == "$") {
                        getter = getter.slice(2, -1);
                    }
                    this.cellCaches.columns[column] = {
                        "name": column,
                        "node": $(node),
                        "getter": $.format.tmpl.compile(getter, {}),
                        "slot": $.tmpl.slot(this, $(node).attr("cell-slot")),
                        "width": width
                    };
                }
                this.cellCaches.columns[column].left = columnX;
                columnX += this.cellCaches.columns[column].width;
                let slot = this.cellCaches.columns[column].node.attr("slot");
                let position = "not-fixed";
                if (fixedLeftColumns.indexOf(column) !== -1) {
                    position = "fixed-left";
                    if (slot !== "column-head-fixed-left") {
                        this.cellCaches.columns[column].node.attr("slot", "column-head-fixed-left");
                    }
                } else if (fixedRightColumns.indexOf(column) !== -1) {
                    position = "fixed-right";
                    if (slot !== "column-head-fixed-right") {
                        this.cellCaches.columns[column].node.attr("slot", "column-head-fixed-right");
                    }
                } else {
                    if (slot !== "column-head") {
                        this.cellCaches.columns[column].node.attr("slot", "column-head");
                    }
                }
                this.cellCaches.columns[column].position = position;
                columnInfo.push(this.cellCaches.columns[column]);
                delete restColumns[column];
            }

            let fixedLeftWidth = 0;
            for (let column of fixedLeftColumns) {
                fixedLeftWidth += this.cellCaches.columns[column].width;
            }

            let fixedRightLeft = fixedLeftWidth;
            for (let column of columns) {
                if (column !== "<ui-sheet-view-cell-empty>") {
                    fixedRightLeft += this.cellCaches.columns[column].width;
                }
            }

            if (!this.cellCaches.columns["<ui-sheet-view-cell-empty>"]) {
                let slot = $.tmpl.slot(this, "<ui-sheet-view-cell-empty>");
                if (!slot) {
                    slot = { 
                        "factory": $.tmpl.factory("", {}), 
                        "keepClasses": () => {} 
                    };
                }
                let node = $(restColumns["<ui-sheet-view-cell-empty>"]);
                if ((!node) || (node.length === 0)) {
                    node = $("<ui-sheet-view-column>").attr("name", "<ui-sheet-view-cell-empty>");
                    $(this).append(node);
                }
                this.cellCaches.columns["<ui-sheet-view-cell-empty>"] = {
                    "name": "<ui-sheet-view-cell-empty>",
                    "node": node,
                    "getter": $.format.tmpl.compile("null", {}),
                    "slot": slot
                };
            }
            let emptyColumn = this.cellCaches.columns["<ui-sheet-view-cell-empty>"];
            emptyColumn.left = fixedRightLeft;
            emptyColumn.width = Math.max(0, sizes.clientWidth - columnX);
            if (emptyColumn.width) {
                fixedRightLeft += emptyColumn.width;
                columnInfo.splice(fixedLeftColumns.length + columns.length, 0, emptyColumn);
                columns.push(emptyColumn.name);
                emptyColumn.node.attr("slot", "column-head");
                delete restColumns["<ui-sheet-view-cell-empty>"];
                for (column of fixedRightColumns) {
                    this.cellCaches.columns[column].left += emptyColumn.width;
                }
            }

            for (let key in restColumns) {
                $(restColumns[key]).attr("slot", "");
            }

            this.cellCaches.sequence = fixedLeftColumns.slice(0).concat(columns).concat(fixedRightColumns);

            let fromRow = Math.max(0, Math.floor((sizes.scrollTop - coast) / sizes.rowHeight));
            let toRow = Math.min(Math.ceil((sizes.scrollTop + sizes.clientHeight + coast) / sizes.rowHeight),
                                 data.length);

            let fromCell = 0;
            while ((fromCell < columnInfo.length) && 
                   (columnInfo[fromCell].left < sizes.scrollLeft - coast)) {
                ++fromCell;
            }
            fromCell = Math.max(fromCell, 0);
            let toCell = fromCell;
            while ((toCell < columnInfo.length) &&
                   (columnInfo[toCell].left < sizes.scrollLeft + sizes.clientWidth + coast)) {
                ++toCell;
            }
            toCell = Math.min(toCell, columnInfo.length);

            let cell = fromCell;
            while ((cell < columnInfo.length) && (cell < toCell)) {
                let top = 0;
                let left = columnInfo[cell].left;
                let width = columnInfo[cell].width;
                let height = sizes.rowHeight;
                columnInfo[cell].node.css({
                    "left": `${left}px`,
                    "top": `0px`,
                    "width": `${width - 1}px`,
                    "height": `${height - 1}px`,
                    "box-sizing": "content-box"
                }).keepClass({
                    "first": cell === 0,
                    "last": cell === columnInfo.length - 1
                });
                ++cell;
            }

            let row = fromRow;
            while ((row < data.length) && (row <= toRow)) {

                let cell = fromCell;
                while ((cell < columnInfo.length) && (cell < toCell)) {

                    let top = row * sizes.rowHeight;
                    let left = columnInfo[cell].left;
                    let width = columnInfo[cell].width;
                    let height = sizes.rowHeight;

                    let id = `${row}-${cell}`;

                    if (!this.cellCaches[id]) {
                        if (!this.cellCaches.cells) {
                            this.cellCaches.cells = Object.create(null);
                        }
                        if (!this.cellCaches.cells[columnInfo[cell].slot.name]) {
                            this.cellCaches.cells[columnInfo[cell].slot.name] = [];
                        }
                        let newCell = false;
                        if (!this.cellCaches[id]) {
                            newCell = true;
                            this.cellCaches[id] = this.cellCaches.cells[columnInfo[cell].slot.name].pop();
                        }
                        let newContainer = false;
                        if (!this.cellCaches[id]) {
                            newContainer = true;
                            this.cellCaches[id] = {
                                "column": columnInfo[cell].name,
                                "type": columnInfo[cell].slot.name
                            };
                            let that = this;
                            this.cellCaches[id].cellContainer = $("<ui-sheet-view-cell>").on("click", function (event) {
                                let id = $(this).attr("cell-id").split("-");
                                $(that).trigger("cellselected", {
                                    "rowIndex": parseInt(id[0]),
                                    "cellIndex": parseInt(id[1]),
                                });
                            });
                            let parameters = Object.assign({}, this.environmentParameters, {
                                "row": data[row],
                                "rowIndex": row,
                                "cell": $.format.tmpl(columnInfo[cell].getter, {
                                    "rowIndex": row,
                                    "row": data[row]
                                }, {}),
                                "cellIndex": cell,
                            });
                            columnInfo[cell].slot.keepClasses(this.cellCaches[id].cellContainer[0], parameters);
                            this.cellCaches[id].cell = columnInfo[cell].slot.factory.produce(parameters);
                            this.cellCaches[id].cell.render(this.cellCaches[id].cellContainer);
                        }
                        if (newCell) {
                            if (newContainer) {
                                $(this).append(this.cellCaches[id].cellContainer);
                            } else {
                                this.cellCaches[id].column = columnInfo[cell].name;
                                this.cellCaches[id].cellContainer.removeClass("not-used");
                            }
                            this.cellCaches[id].cellContainer.attr("cell-id", id);
                        }
                        if ((newCell || dataReloaded) && (!newContainer)) {
                            let parameters = Object.assign({}, this.environmentParameters, {
                                "row": data[row],
                                "rowIndex": row,
                                "cell": $.format.tmpl(columnInfo[cell].getter, {
                                    "rowIndex": row,
                                    "row": data[row]
                                }, {}),
                                "cellIndex": cell,
                            });
                            columnInfo[cell].slot.keepClasses(this.cellCaches[id].cellContainer[0], parameters);
                            this.cellCaches[id].cell.fill(parameters);
                        }
                        if (newCell || sizeChanged || dataReloaded) {
                            let slot = this.cellCaches[id].cellContainer.attr("slot");
                            switch (columnInfo[cell].position) {
                                case "fixed-left": {
                                    if (slot !== "cell-fixed-left") {
                                        this.cellCaches[id].cellContainer.attr("slot", "cell-fixed-left");
                                    }
                                    break;
                                }
                                case "fixed-right": {
                                    if (slot !== "cell-fixed-right") {
                                        this.cellCaches[id].cellContainer.attr("slot", "cell-fixed-right");
                                    }
                                    break;
                                }
                                case "not-fixed": 
                                default: {
                                    if (slot !== "cell") {
                                        this.cellCaches[id].cellContainer.attr("slot", "cell");
                                    }
                                    break;
                                }
                            }
                            this.cellCaches[id].cellContainer.css({
                                "left": `${left}px`,
                                "top": `${top - 1}px`,
                                "width": `${width - 1}px`,
                                "height": `${height - 1}px`,
                                "box-sizing": "content-box"
                            }).keepClass({
                                "first": cell === 0,
                                "last": cell === columnInfo.length - 1
                            });
                        }
                    }

                    ++cell;
                }

                ++row;

            }

            let width = 0;
            if (columnInfo.length > 0) {
                width = columnInfo[columnInfo.length - 1].left + columnInfo[columnInfo.length - 1].width;
            }
            let height = sizes.rowHeight * data.length;
            height += sizes.extraPaddingBottom;

            placeholder.css({
                "width": `${width}px`,
                "height": `${height - 1}px`
            });

            headPlaceholder.css({
                "width": `${width}px`,
                "height": `${sizes.rowHeight}px`
            });

            this.filler.query("#sheet-head-fixed-right").css("margin-left", `-${width}px`);
            this.filler.query("#sheet-body-fixed-right").css("margin-left", `-${width}px`);

            this.filler.query("#sheet-head-fixed-left-shadow").css("margin-left", `${fixedLeftWidth}px`);
            this.filler.query("#sheet-body-fixed-left-shadow").css({
                "margin-left": `${fixedLeftWidth}px`,
                "height": `${height - sizes.extraPaddingBottom}px`
            });

            this.filler.query("#sheet-head-fixed-right-shadow").css("margin-left", `${fixedRightLeft - width - $.dom.getDevicePixels(4) + 1}px`);
            this.filler.query("#sheet-body-fixed-right-shadow").css({
                "margin-left": `${fixedRightLeft - width - $.dom.getDevicePixels(4) + 1}px`,
                "height": `${height - sizes.extraPaddingBottom}px`
            });

            this.syncFixedPosition();

        },
        "syncFixedPosition": function () {

            let node = this.filler.query("#sheet-body")[0];
            let scrollLeft = node.scrollLeft;

            this.filler.query("#sheet-head")[0].scrollLeft = scrollLeft;

            this.filler.query("#sheet-head-fixed-left").css("left", `${scrollLeft}px`);
            this.filler.query("#sheet-body-fixed-left").css("left", `${scrollLeft}px`);
            this.filler.query("#sheet-head-fixed-left-shadow").css("left", `${scrollLeft}px`);
            this.filler.query("#sheet-body-fixed-left-shadow").css("left", `${scrollLeft}px`);

            this.filler.query("#sheet-head-fixed-right").css("left", `${scrollLeft + node.clientWidth}px`);
            this.filler.query("#sheet-body-fixed-right").css("left", `${scrollLeft + node.clientWidth}px`);
            this.filler.query("#sheet-head-fixed-right-shadow").css("left", `${scrollLeft + node.clientWidth}px`);
            this.filler.query("#sheet-body-fixed-right-shadow").css("left", `${scrollLeft + node.clientWidth}px`);

        }
    },
    "functors": {
        "updateView": function () {
            let scrollView = this.filler.query("ui-scroll-view")[0];
            this.lastScrollingOffset = {
                "scrollLeft": scrollView.scrollLeft,
                "scrollTop": scrollView.scrollTop,
            };
            this.updateView();
        },
        "syncScrollXToHead": function () {
            let node = this.filler.query("#sheet-body")[0];
            let scrollLeft = node.scrollLeft;
            this.filler.query("#sheet-head")[0].scrollLeft = scrollLeft;
            this.syncFixedPosition();
        },
        "syncScrollXToBody": function () {
            let scrollLeft = this.filler.query("#sheet-head")[0].scrollLeft;
            let node = this.filler.query("#sheet-body")[0];
            this.filler.query("#sheet-body")[0].scrollLeft = scrollLeft;
            this.syncFixedPosition();
        }
    }
};

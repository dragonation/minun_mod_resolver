module.exports = {
    "attributes": ["placeholder", "value"],
    "listeners": {
        "oncreated": function () {
            this.lastValue = "";
        },
        "onupdated": function (name, value) {
            if (name === "value") {
                let lastValue = this.filler.query("input").val();
                if (lastValue !== value) {
                    let floatValue = parseFloat(value);
                    if (isFinite(floatValue)) {
                        this.filler.query("input").val(value);
                        this.lastValue = value;
                    } else {
                        this.filler.query("input").val("");
                        this.lastValue = "";
                    }
                }
            }
        }
    },
    "properties": {
        "value": {
            "get": function () {
                return parseFloat(this.filler.query("input").val());
            },
            "set": function (value) {
                value = parseFloat(value);
                if (isFinite(value)) {
                    this.filler.query("input").val(value);
                } else {
                    this.filler.query("input").val("");
                }
            }
        }
    },
    "functors": {
        "showFocus": function () {
            $(this).addClass("focused").trigger("focus", {
                "value": this.value
            });
            if ($(this).attr("autoselect") === "yes") {
                this.select();
            }
        },
        "hideFocus": function () {
            $(this).removeClass("focused").trigger("blur", {
                "value": this.value
            });
        },
        "focusInput": function () {
            this.focus();
        },
        "triggerChanges": function () {
            let check = (couldDelay) => {
                let value = $(this).val();
                if (this.lastValue != value) {
                    this.lastValue = value;
                    $(this).trigger("change", { "value": parseFloat(value) });
                } else if (couldDelay) {
                    $.delay(() => {
                        check(false);
                    });
                }
            };
            check(true);
        },
        "onBeforeInput": function (event) {

            if (/^([0-9]*)$/.test(event.originalEvent.data)) {
                return;
            }

            if (!event.originalEvent.data) {
                return;
            }

            if (event.originalEvent.data === ".") {
                let value = this.filler.query("input").val();
                if (value.indexOf(".") === -1) {
                    return;
                }
            }

            if (event.originalEvent.data === "-") {
                let value = this.filler.query("input").val();
                if (value.indexOf("-") === -1) {
                    return;
                }
            }

            event.stopPropagation();
            event.preventDefault();

        },
        "onInput": function (event) {
            let value = this.filler.query("input").val();
            if (value === "-") { return true; }
            let floatValue = parseFloat(value);
            if (value + "" !== floatValue) {
                if (isFinite(floatValue)) {
                    this.filler.query("input").val(floatValue);
                } else {
                    this.filler.query("input").val("");
                }
            }
        },
        "onPasted": function (event) {
            let value = this.filler.query("input").val();
            if (value === "-") { return true; }
            let floatValue = parseFloat(value);
            if (value + "" !== floatValue) {
                if (isFinite(floatValue)) {
                    this.filler.query("input").val(floatValue);
                } else {
                    this.filler.query("input").val("");
                }
            }
        },
        "decreaseInput": function () {
            this.value = this.value - 1;
            $(this).trigger("change", { "value": this.value });
            this.focus();
        },
        "increaseInput": function () {
            this.value = this.value + 1;
            $(this).trigger("change", { "value": this.value });
            this.focus();
        }
    },
    "methods": {
        "focus": function () {
            this.filler.query("input").focus();
        },
        "blur": function () {
            this.filler.query("input").blur();
        },
        "select": function () {
            this.filler.query("input").select();
        }
    }
};

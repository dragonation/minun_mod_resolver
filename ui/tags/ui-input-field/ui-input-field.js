module.exports = {
    "attributes": ["placeholder", "icon", "value"],
    "listeners": {
        "oncreated": function () {
            this.lastValue = "";
        },
        "onupdated": function (name, value) {
            if (name === "value") {
                let lastValue = this.filler.query("input").val();
                if (lastValue !== value) {
                    this.filler.query("input").val(value);
                }
                this.lastValue = value;
                $(this).keepClass({ "filled": value ? true : false });
            }
        }
    },
    "properties": {
        "value": {
            "get": function () {
                return this.filler.query("input").val();
            },
            "set": function (value) {
                value = value + "";
                this.filler.query("input").val(value);
                $(this).keepClass({ "filled": value ? true : false });
                this.lastValue = value;
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
                    $(this).keepClass({ "filled": value ? true : false });
                    $(this).trigger("change", { "value": value });
                } else if (couldDelay) {
                    $.delay(() => {
                        check(false);
                    });
                }
            };
            check(true);
        },
        "clearInput": function () {
            if (this.value !== "") {
                this.value = "";
                this.lastValue = "";
                $(this).keepClass({ "filled": false });
                $(this).trigger("change", { "value": "" });
            }
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

module.exports = {
    "attributes": ["placeholder", "value", "reveal"],
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
        "showFocus": function () {
            $(this).addClass("focused").trigger("focus", {});
            if ($(this).attr("autoselect") === "yes") {
                this.select();
            }
        },
        "hideFocus": function () {
            $(this).removeClass("focused").trigger("blur", {});
        },
        "focusInput": function () {
            this.focus();
        },
        "triggerChanges": function () {
            let check = (couldDelay) => {
                let value = $(this).val();
                if (this.lastValue != value) {
                    this.lastValue = value;
                    $(this).trigger("change", { "value": value });
                } else if (couldDelay) {
                    $.delay(() => {
                        check(false);
                    });
                }
            };
            check(true);
        },
        "toggleReveal": function () {
            $(this).attr({
                "reveal": ($(this).attr("reveal") == "yes") ? "no" : "yes"
            });
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

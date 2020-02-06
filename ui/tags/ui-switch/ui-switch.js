module.exports = {
    "attributes": [ "checked", "disabled" ],
    "functors": {
        "toggleValue": function () {
            let value = this.getAttribute("checked") != "yes";
            this.setAttribute("checked", value ? "yes" : "no");
            $(this).trigger("change", {
                "value": value
            });
        }
    }
};

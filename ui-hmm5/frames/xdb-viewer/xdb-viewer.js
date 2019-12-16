const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    this.filler.fill({
        "resolver": (value, target) => {

            let complex = false;
            let textValue = "<unknown>";
            if (value instanceof Array) {
                if (value.length === 0) {
                    textValue = "<empty>";
                } else if (value.length === 1) {
                    if (typeof value[0] === "string") {
                        textValue = value[0];
                    } else {
                        textValue = "<obj>";
                        complex = true;
                    }
                } else {
                    textValue = "<array>";
                    complex = true;
                }
            } else if (typeof value === "string") {
                textValue = value;
            } else if (value && (typeof value === "object")) {
                complex = true;
            }

            switch (target) {
                case "text": { return textValue; };
                case "class": { return ""; };
                case "href": { return ""; };
                case "complex": { return complex ? value : null; };
                default: { return value; };
            }

        }
    });

};

Frame.functors = {
    "updateConnections": function () {
        let parent = $(this.dom).parent()[0];
        if (parent && parent.updateConnections) {
            parent.updateLayouts([this.dom]);
        }
    }
};

module.exports.Frame = Frame;

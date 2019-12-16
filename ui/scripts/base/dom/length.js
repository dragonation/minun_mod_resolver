var Length = function Length(reference, length) {

    if (!length) {
        this.unit = "px";
        this.number = 0;
    } else if (typeof length === "number") {

        this.unit = "px";
        this.number = length;

    } else if (length.hasOwnProperty && length.hasOwnProperty("unit")) {

        this.unit = length.unit;
        this.number = length.number;

    } else {

        var index = length.indexOf(/[^0-9]/);
        if (index != -1) {
            this.unit = length.substring(index);
        } else {
            this.unit = "px";
        }

        this.number = parseFloat(length);

    }

    this.reference = reference;

};

Length.prototype.getNumberInPixels = function () {
    switch (this.unit) {

        case "px": { return this.number; }
        case "pt": { return this.number * 72 / 96; }
        case "pc": { return this.number * 6 / 96; }
        case "in": { return this.number * 96; }
        case "cm": { return this.number * 96 * 2.54; }
        case "mm": { return this.number * 96 * 25.4; }

        case "em": { return new Length(this.reference.reference, this.reference.getValue()).getNumberInPixels() * this.number; }
        case "rem": { return new Length(null, $(document.body).style("font-size")).getNumberInPixels() * this.number; }
        case "ex": { return new Length(this.reference.reference, this.reference.getValue()).getNumberInPixels() * this.number * 0.65; }
        case "rex": { return new Length(null, $(document.body).style("font-size")).getNumberInPixels() * this.number * 0.65; }

        case "vh": { return document.body.clientHeight * this.number / 100; }
        case "vw": { return document.body.clientWidth * this.number / 100; }

        case "vmin": { return Math.min(document.body.clientWidth, document.body.clientHeight) * this.number / 100; }
        case "vmax": { return Math.max(document.body.clientWidth, document.body.clientHeight) * this.number / 100; }

        case "%": { return this.number * new Length(this.reference.reference, this.reference.getValue()).getNumberInPixels() / 100; }

        default: { return NaN; }
    }
};

Length.prototype.toString = function () {
    return this.number.toFixed(2) + this.unit;
};

$.dom.Length = Length;

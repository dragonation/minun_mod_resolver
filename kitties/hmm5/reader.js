var Reader = function Reader(buffer, offset) {

    this.buffer = buffer;
    this.offset = offset;
    if (!this.offset) {
        this.offset = 0;
    }

};

Reader.prototype.snapshot = function (offset) {

    return new Reader(this.buffer, arguments.length > 0 ? offset : this.offset);

};

Reader.prototype.guess = function () {

    if (this.offset + 4 >= this.buffer.length) { return { "info": "almost closed" }; }

    let result = {
        "i8": this.snapshot().readInt8(),
        "i16": this.snapshot().readInt16(),
        "i32": this.snapshot().readInt32(),
        "f32": this.snapshot().readFloat32(),
        "h32": this.snapshot().readHash32(),
        "h64": this.snapshot().readHash64(),
        "str": this.snapshot().readAutostring(20)
    };

    if (result.i32 === 0) { return { "i32": 0 }; }

    const guess = (key) => {

        if (!result[key]) { return; }
        if (result[key] + this.offset + 4 >= this.buffer.length) { return; }

        let newOffset = result[key] + this.offset;
        if (newOffset >= 0) {
            result["i8@" + key] = this.snapshot(newOffset).readInt8();
            result["i16@" + key] = this.snapshot(newOffset).readInt16();
            result["i32@" + key] = this.snapshot(newOffset).readInt32();
            result["f32@" + key] = this.snapshot(newOffset).readFloat32();

            result["h32@" + key] = this.snapshot(newOffset).readHash32();
            result["h64@" + key] = this.snapshot(newOffset).readHash64();

            result["str@" + key] = this.snapshot(newOffset).readAutostring(20);
        }

        if (result["i8@" + key] === result["i16@" + key]) { delete result["i8@" + key]; }
        if (result["i16@" + key] === result["i32@" + key]) { delete result["i16@" + key]; }

        if (result["i32@" + key] === 0) { delete result["f32@" + key]; }
        else if (!isFinite(result["f32@" + key])) { delete result["f32@" + key]; }
        else if (Math.abs(result["f32@" + key]) < 0.000001) { delete result["f32@" + key]; }
        else if (Math.abs(result["f32@" + key]) > 10000000) { delete result["f32@" + key]; }

        if (result["f32@" + key]) { delete result["h32@" + key]; delete result["h64@" + key]; }
        else if (result["h64@" + key] && (result["h64@" + key].split("0").length >= 4)) { delete result["h64@" + key]; }

        if (result["h32@" + key] && (result["h32@" + key].split("0").length >= 3)) { delete result["h32@" + key]; }

        ["i8", "i16", "i32"].forEach((key2, index) => {
            if (result[key2 + "@" + key] && (this.offset + result[key2 + "@" + key] + (1 << index) + 4 <= this.buffer.length)) {
                let string = this.snapshot(this.offset + result[key2 + "@" + key] + (1 << index)).readString(Math.min(32, result[key]));
                if (/^[0-9a-z`~!@#$%\^&\*\(\)\-=_\+\{\}\\\|\[\];':"\,\.\/<>\? \r\n]+$/.test(string)) {
                    if (string.length > 29) {
                        string = string.slice(0, 29) + "...";
                    }
                    result[key2 + "str@" + key] = string;
                }
            }
        });

        if ((result["str@" + key] && (result["str@" + key].length <= 3)) ||
            (!/^[0-9a-z`~!@#$%\^&\*\(\)\-=_\+\{\}\\\|\[\];':"\,\.\/<>\? \r\n]+$/.test(result["str@" + key]))) {
            delete result["str@" + key];
        }

    };

    if (result.i16 === result.i32) {
        delete result.i8;
        delete result.i16;
    } else {
        if (result.i8 === result.i16) {
            delete result.i8;
        } else {
            guess("i8");
        }
        guess("i16");
    }
    if (Math.abs(result.i32) >= 10000000) {
        delete result.i32;
    } else {
        guess("i32");
    }

    if (result.i32 === 0) { delete result.f32; }
    else if (!isFinite(result.f32)) { delete result.f32; }
    else if (Math.abs(result.f32) < 0.000001) { delete result.f32; }
    else if (Math.abs(result.f32) > 10000000) { delete result.f32; }

    if (result.f32) { delete result.h32; delete result.h64; }
    else if (result.h64.split("0").length >= 4) { delete result.h64; }

    if (result.h32 && (result.h32.split("0").length >= 3)) { delete result.h32; }

    if ((result.str.length <= 3) ||
        (!/^[0-9a-z`~!@#$%\^&\*\(\)\-=_\+\{\}\\\|\[\];':"\,\.\/<>\? \r\n]+$/.test(result.str))) {
        delete result.str;
    }

    ["i8", "i16", "i32"].forEach((key, index) => {
        if (result[key] && (this.offset + (1 << index) + 4 <= this.buffer.length)) {
            let string = this.snapshot(this.offset + (1 << index)).readString(Math.min(32, result[key]));
            if (/^[0-9a-z`~!@#$%\^&\*\(\)\-=_\+\{\}\\\|\[\];':"\,\.\/<>\? \r\n]+$/.test(string)) {
                if (string.length > 29) {
                    string = string.slice(0, 29) + "...";
                }
                result[key + "str"] = string;
            }
        }
    });

    return result;

};

Reader.prototype.readInt64 = function () {

    var result = this.buffer.readInt32LE(this.offset) | (this.buffer.readInt32LE(this.offset + 4) << 32);

    this.offset += 8;

    return result;

};

Reader.prototype.readUInt64 = function () {

    var result = this.readUInt64As32x2();

    return result[0] | (result[1] << 32);

};

Reader.prototype.readUInt64As32x2 = function () {

    var low = this.buffer.readUInt32LE(this.offset);
    var high = this.buffer.readUInt32LE(this.offset + 4);

    this.offset += 8;

    return [low, high];

};

Reader.prototype.readHash32 = function () {

    return ("00000000" + this.readUInt32().toString(16)).slice(-8);

};

Reader.prototype.readHash64 = function () {

    var result = this.readUInt64As32x2();

    return ("00000000" + result[1].toString(16)).slice(-8) + ("00000000" + result[0].toString(16)).slice(-8);

};

Reader.prototype.readInt8 = function () {

    var result = this.buffer.readInt8(this.offset);

    ++this.offset;

    return result;

};

Reader.prototype.readUInt8 = function () {

    var result = this.buffer.readUInt8(this.offset);

    ++this.offset;

    return result;

};

Reader.prototype.readInt16 = function () {

    var result = this.buffer.readInt16LE(this.offset);

    this.offset += 2;

    return result;

};

Reader.prototype.readUInt16 = function () {

    var result = this.buffer.readUInt16LE(this.offset);

    this.offset += 2;

    return result;

};

Reader.prototype.readUInt32 = function () {

    var result = this.buffer.readUInt32LE(this.offset);

    this.offset += 4;

    return result;

};

Reader.prototype.readInt32 = function () {

    var result = this.buffer.readInt32LE(this.offset);

    this.offset += 4;

    return result;

};

Reader.prototype.readFloat16 = function () {

    // IEEE 754
    //     1 bit sign
    //     5 bits exponent
    //     10 bits fraction

    // Reference
    //     https://en.wikipedia.org/wiki/Half-precision_floating-point_format

    let u16 = this.readUInt16();

    let sign = (u16 >> 15) ? -1 : 1; // -1 or 1
    let exponent = (u16 >> 10) & 0x1f; // 5 bits
    let fraction = u16 & 0x3ff; // 10 bits

    let result = 0;
    if (exponent === 0) {
        if (fraction === 0) { // +0 or -0
            result = sign * 0;
        } else { // subnormal
            result = sign * fraction * Math.pow(2, -24);
        }
    } else if ((exponent > 0) && (exponent < 31)) { // normal f16
        result = sign * Math.pow(2, exponent - 15) * (1 + fraction * Math.pow(2, -10));
    } else if (exponent === 31) {
        if (fraction === 0) { // Infinity or -Infinity
            result = (sign > 0) ? Infinity : -Infinity;
        } else { // qNaN or sNaN, but no care what it is
            result = NaN;
        }
    }

    if (isFinite(result)) {

        // simplify the float 16 from float 64, make it more accurate
        var exponential = result.toExponential(6).toLowerCase();
        result = parseFloat(parseFloat(exponential.split("e")[0]).toFixed(5)) * Math.pow(10, exponential.split("e")[1]);

        // make it human readable, remove epsilons
        if (Math.abs(result) <= 1000000) {
            result = parseFloat(result.toFixed(4));
        }

    }

    return result;

};

Reader.prototype.readFloat32 = function () {

    var result = this.buffer.readFloatLE(this.offset);

    // simplify the float 32 from float 64, make it more accurate
    var exponential = result.toExponential(7).toLowerCase();
    result = parseFloat(parseFloat(exponential.split("e")[0]).toFixed(7)) * Math.pow(10, exponential.split("e")[1]);

    // make it human readable, remove epsilons
    if (Math.abs(result) <= 1000000) {
        result = parseFloat(result.toFixed(5));
    }

    this.offset += 4;

    return result;

};

Reader.prototype.readBLOB = function (size) {

    if (arguments.length === 0) {
        size = this.readUInt32();
    }

    var result = this.buffer.slice(this.offset, this.offset + size);

    this.offset += size;

    return result;

};

Reader.prototype.isEnded = function () {

    return this.offset >= this.buffer.length;

};

Reader.prototype.readString = function () {

    var length = arguments[0];
    if (arguments.length === 0) {
        length = this.readUInt32();
    }

    var chars = [];
    var looper = 0;
    while ((looper < length) && (this.offset >= 0) && (this.offset < this.buffer.length)) {
        chars.push(this.readUInt8());
        ++looper;
    }

    while (chars[chars.length - 1] === 0) {
        chars.pop();
    }

    return String.fromCharCode.apply(String, chars);

};

Reader.prototype.readAutostring = function (length) {

    if (!length) {
        length = Infinity;
    }

    var chars = [];
    var looper = 0;
    while ((looper < length) && (this.offset >= 0) && (this.offset < this.buffer.length)) {
        let char = this.readUInt8();
        if (char === 0) { break; }
        chars.push(char);
        ++looper;
    }

    return String.fromCharCode.apply(String, chars);

};

Reader.prototype.skipPadding = function (base, value) {

    while (this.offset % base !== 0) {
        var byte = this.readUInt8();
        if ((arguments.length > 1) && (byte !== value)) {
            throw new Error("Invalid padding, get " + ("0" + byte.toString(16)).slice(-2) + ", expected " + ("0" + value.toString(16)).slice(-2));
        }
    }

    return this;
};

Reader.prototype.skip = function (count, value) {

    var looper = 0;
    while (looper < count) {
        let newValue = this.readUInt8();
        if ((arguments.length > 1) && (newValue !== value)) {
            throw new Error("Invalid skipping, expected 0x" + value.toString(16));
        }
        ++looper;
    }

    return this;
};

Reader.prototype.dump = function (count) {

    var reader = this.snapshot();

    var offset = reader.offset;

    if (!count) {
        count = Infinity;
    }

    var result = [];

    var line = null;

    var looper = 0;
    while ((looper < count) && (!reader.isEnded())) {

        if (!line) {
            line = [];
            result.push(line);
        }

        line.push(reader.readUInt8());
        if (line.length >= 32) {
            line = null;
        }

        ++looper;
    }

    result = result.map((line) => {

        var result = {
            "hex": line.map((x) => ("0" + x.toString(16)).slice(-2)).join("").replace(/[0-9a-f]{8}/g, (x) => " " + x + " "),
            "asc": line.map((x) => {
                if ((x >= 0x20) && (x <= 0x7e)) {
                    return String.fromCharCode(x) + " ";
                } else {
                    return "  ";
                }
            }).join("").replace(/.{8}/g, (x) => " " + x + " "),
        };

        result.guess = " " + result.hex.trim().split(/\s+/).map((v, i) => {
            if (v === "00000000") {
                return "       0";
            } else if (/^[0-9a-f]{2}000000$/.test(v)) {
                return ("       " + line[i * 4]).slice(-8);
            } else if (/^[0-9a-f]{4}0000$/.test(v)) {
                return ("       " + (line[i * 4] | (line[i * 4 + 1] << 8))).slice(-8);
            } else if (/^([0-9a-f]{2}00){2}$/.test(v)) {
                return ("       " + line[i * 4]).slice(-4) + ("       " + line[i * 4 + 2]).slice(-4);
            } else {
                var buffer = Buffer.from(line.slice(i * 4, i * 4 + 4));
                if (buffer.length >= 4) {
                    var float = buffer.readFloatLE(0);
                    if (isNaN(float)) {
                        var int = buffer.readInt32LE(0);
                        return ("       " + int).slice(-8);
                    } else if ((float + "").indexOf("e") === -1) {
                        return ("       " + float.toFixed(3)).slice(-8);
                    }
                }
                return "        ";
            }
        }).join("  ") + " ";

        return result;
    });

    var lines = [
        "         0x00      0x04      0x08      0x0c      0x10      0x14      0x18      0x1c      :" + offset
    ];

    result.forEach((line, index) => {
        lines.push("0x" + ("000" + (index * 32 + offset).toString(16)).slice(-4) + ": " + line.hex + " :" + (index * 32 + 32 + offset));
        if (line.asc.trim() && (line.asc.replace(/\s+/g, (s) => s.slice(0, -1)).split(/\s+/).filter((s) => s.length > 2).length > 0)) {
            lines.push("     a  " + line.asc);
        }
        if (line.guess.trim() && (line.guess.split(/\s+/).join("") !== "00000000")) {
            lines.push("     v  " + line.guess);
        }
    });

    var content = "Guess content: " + @.jsonize(this.snapshot().guess()) + "\n" + lines.join("\n") + "\n";

    @warn(content);

    return this;

};

module.exports.Reader = Reader;

const GFModelPackageMagic = 0x15122117;
const GFMaterialPackageMagic = 0x15041213;
const GFMotionPackageMagic = 0x00060000;
const GFResourcePackageMagic = 0x00010000;

const Model = require("./model.js");
const Shader = require("./shader.js");
const Texture = require("./texture.js");
const Motion = require("./motion.js");
const Meta = require("./meta.js");
const Info = require("./info.js");
const Resource = require("./resource.js");
const Package = require("./package.js");

const constructors = {
    "model": Model,
    "shader": Shader,
    "texture": Texture,
    "meta": Meta,
    "motion": Motion,
    "package": Package,
    "info": Info,
    "resource": Resource
};

const PC = function PC(usage) {

    this.files = [];
    this.usage = usage;

};

Object.defineProperty(PC.prototype, "allFiles", {
    "get": function () {

        let result = [];

        this.files.forEach((file) => {
            if (@.is(file, PC)) {
                file.allFiles.forEach((file) => {
                    result.push(file);
                });
            } else if (file) {
                result.push(file);
            }
        });

        return result;
    }
});

PC.prototype.load = function (reader) {

    const pc = this;

    return @.async(function () {

        let origin = reader.subreader();

        pc.magic = reader.readString(2);
        if (!/^[A-Z]{2}$/.test(pc.magic)) {
            throw new Error("Invalid magic for PC: " + pc.magic);
        }

        const count = reader.readUint16();

        let offsets = [];
        let looper = 0;
        while (looper <= count) {
            offsets.push(reader.readUint32());
            ++looper;
        }

        let files = [];

        let index = 0;
        while (index < count) {
            let offset = offsets[index];
            let length = offsets[index + 1] - offsets[index];
            files.push(origin.subreader(offset, length));
            ++index;
        }

        this.next(files);

    }).all(function (reader) {

        @.async(function () {

            @.async(function () {
                let type = pc.guessFileType(reader);
                if (type === "pc") {
                    let newPC = new PC();
                    newPC.load(reader).resolve(newPC).pipe(this);
                } else if (type === "empty") {
                    this.next(null);
                } else {
                    if (constructors[type]) {
                        this.next(new constructors[type](reader));
                    } else {
                        throw new Error("Unknown file format " + type);
                    }
                }
            }).catch(this);

        }).then(function (error, file) {

            if (error) {
                pc.files.push(error);
            } else {
                pc.files.push(file);
            }

            this.next(file);

        }).pipe(this);

    });

};

PC.prototype.guessFileType = function (reader) {

    if (reader.available === 0) {
        return "empty";
    } else if (reader.available >= 2) {
        let magic = reader.getUint32();
        let magicString = reader.getString(2);
        switch (magic) {
            case GFModelPackageMagic: { return "model"; }
            case GFMaterialPackageMagic: {
                // TODO: check shader or texture
                let sectionName = reader.subreader(0x8).readUint32();
                if (sectionName === 0) {
                    return "shader";
                }
                return "texture";
            }
            case GFMotionPackageMagic: { return "motion"; }
            case GFResourcePackageMagic: { return "package"; }
            default: { break; }
        }
        switch (magicString) {
            case "PC": { return "pc"; }
            case "PS": { return "pc"; }
            default: {
                // if (/[A-Z]{2}/.test(magicString)) {
                //     return magicString.toLowerCase();
                // }
                break;
            }
        }
    }

    if (this.usage !== "extra") {
        if (reader.end - reader.index > 0x20) {
            let boneName = reader.getString(0x20);
            if (/^[A-Z0-9]+$/i.test(boneName)) {
                return "meta";
            }
        }
    }

    if (reader.end - reader.index === 96) {
        return "info";
    }

    return "resource";
};

module.exports = PC;

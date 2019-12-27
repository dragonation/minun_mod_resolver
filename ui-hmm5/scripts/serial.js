
const Reference = function Reference(href) {
    this.href = href;
};

const File = function File(href) {
    this.href = href;
};

const Enum = function Enum(token, value) {
    this.token = token;
    this.value = value;
};

const GUID = function GUID(id) {
    this.id = id;
};

const OBJ = function OBJ() {

};

const Inline = function Inline() {

};

$.serial.register("hmm5.file", File, (content, serializer) => {
    throw new Error("No need to serialize in client");
}, (deserializer, preset) => {
    let href = deserializer("href");
    return new File(href);
});

$.serial.register("hmm5.enum", Enum, (content, serializer) => {
    throw new Error("No need to serialize in client");
}, (deserializer, preset) => {
    let token = deserializer("token");
    let value = deserializer("value");
    return new Enum(token, value);
});

$.serial.register("hmm5.ref", Reference, (content, serializer) => {
    throw new Error("No need to serialize in client");
}, (deserializer, preset) => {
    let href = deserializer("href");
    return new Reference(href);
});

$.serial.register("hmm5.guid", GUID, (content, serializer) => {
    throw new Error("No need to serialize in client");
}, (deserializer, preset) => {
    let id = deserializer("id");
    return new GUID(id);
});

$.serial.register("hmm5.inline", Inline, (content, serializer) => {
    throw new Error("No need to serialize in client");
}, (deserializer, preset, unit, root, caches) => {
    const result = new Inline();
    preset(result);
    for (let keyID in unit) {
        let key = $.serial.deserialize.content([parseInt(keyID)], root, caches);
        if (key[0] === "$") {
            result[key.slice(1)] = $.serial.deserialize.content(unit[keyID], root, caches);
        }
    }
    return result;
});

$.serial.register("hmm5.obj", OBJ, (content, serializer) => {
    throw new Error("No need to serialize in client");
}, (deserializer, preset, unit, root, caches) => {
    const result = new OBJ();
    preset(result);
    for (let keyID in unit) {
        let key = $.serial.deserialize.content([parseInt(keyID)], root, caches);
        if (key[0] === "$") {
            result[key.slice(1)] = $.serial.deserialize.content(unit[keyID], root, caches);
        }
    }
    return result;
});

module.exports.Reference = Reference;
module.exports.File = File;
module.exports.Enum = Enum;
module.exports.Inline = Inline;

module.exports.GUID = GUID;
module.exports.OBJ = OBJ;

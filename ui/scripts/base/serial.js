
const base64 = require("./base64.js");

let at = "@";

const presets = {};

presets[at + "type"] = 1;
presets["string"] = 2;
presets[at + "content"] = 3;

const serializers = new Map();
const deserializers = new Map();

const registerSerializer = function (name, prototype, serializer, deserializer, ider) {

    if (typeof prototype === "function") {
        prototype = prototype.prototype;
    }

    serializers.set(prototype, [serializer, name, ider]);
    deserializers.set(name, [deserializer, prototype]);

};

const serializeContent = function (content, root, caches) {

    if ((content === undefined) || (content === null) ||
        (typeof content === "boolean") || (typeof content === "number")) {
        return content;
    }

    if (caches.has(content)) {
        return caches.get(content);
    }

    let prototype = content;
    while ((prototype !== null) && (prototype !== undefined) && (!serializers.has(prototype))) {
        prototype = Object.getPrototypeOf(prototype);
    }

    let settings = prototype ? serializers.get(prototype) : serializers.get(Object.prototype);

    let cacheID = undefined;
    if (settings[2]) {
        cacheID = settings[2](content);
        if (!caches.ids[settings[1]]) {
            caches.ids[settings[1]] = Object.create(null);
        }
        if (caches.ids[settings[1]][cacheID]) {
            return caches.ids[settings[1]][cacheID];
        }
    }

    let unit = [root.nextID]; ++root.nextID;
    if (cacheID !== undefined) {
        caches.ids[settings[1]][cacheID] = unit;
    }
    caches.set(content, unit);
    root.objects[unit[0]] = {};

    const serializer = function (key, value) {
        let id = serializeContent("$" + key, root, caches)[0];
        root.objects[unit[0]][id] = serializeContent(value, root, caches);
    };

    let id = serializeContent("@type", root, caches)[0];
    root.objects[unit[0]][id] = serializeContent(settings[1], root, caches);

    if ((prototype === String.prototype) || (prototype === Array.prototype)) {
        settings[0](content, serializer, unit, root, caches);
    } else {
        settings[0](content, serializer);
    }

    return unit;

};

const serialize = function (content) {

    let caches = new Map();
    caches.ids = Object.create(null);

    let root = {
        "nextID": 4,
        "presets": presets,
        "objects": {}
    };

    for (let key in presets) {

        caches.set(key, [presets[key]]);

        let object = {};
        object[presets[at + "type"]] = [presets["string"]];
        object[presets[at + "content"]] = presets[key];
        root.objects[presets[key]] = object;

    }

    let unit = serializeContent(content, root, caches);

    root.entranceID = unit[0];

    return JSON.stringify(root, null, 0);

};

const deserializeContent = function (unit, root, caches) {

    if (!(unit instanceof Array)) {
        return unit;
    }

    if (caches.has(unit[0])) {
        return caches.get(unit[0]);
    }

    let node = root.objects[unit[0]];

    const deserializer = function (key) {

        if (!caches.has(key)) {
            for (let keyID in node) {
                let id = parseInt(keyID);
                if (!caches.has(id)) {
                    let key = deserializeContent([id], root, caches);
                    if (key[0] === "$") {
                        caches.set(key.slice(1), keyID);
                    }
                }
            }
        }

        if (caches.has(key)) {
            return deserializeContent(node[caches.get(key)], root, caches);
        }

    };

    const preset = function (object) {
        caches.set(unit[0], object);
    };

    const type = deserializeContent(node[caches.get("@type")], root, caches);

    let result = undefined;
    if ((type === "string") || (type === "array") || (type === "object") || (type === "hmm5.obj")) {
        result = deserializers.get(type)[0](deserializer, preset, node, root, caches);
    } else {
        result = deserializers.get(type)[0](deserializer, preset, node, root, caches);
    }

    caches.set(unit[0], result);

    return result;

};

var deserialize = function (data) {

    let root = data;
    if (typeof root === "string") {
        root = JSON.parse(data);
    }

    let caches = new Map();

    for (let key in root.presets) {
        caches.set(root.presets[key], key);
        caches.set(key, root.presets[key]);
    }

    return deserializeContent([root.entranceID], root, caches);

};

registerSerializer("string", String, function (content, serializer, unit, root, caches) {
    root.objects[unit[0]][3] = content;
}, function (deserializer, preset, unit, root, caches) {
    return unit[caches.get("@content")];
});

registerSerializer("array", Array, function (content, serializer, unit, root, caches) {
    let serialized = [];
    for (let item of content) {
        serialized[serialized.length] = serializeContent(item, root, caches);
    }
    root.objects[unit[0]][3] = serialized;
}, function (deserializer, preset, unit, root, caches) {
    let result = [];
    for (let id of unit[caches.get("@content")]) {
        result[result.length] = deserializeContent(id, root, caches)
    }
    return result;
});

registerSerializer("object", Object, function (content, serializer) {
    const keys = Object.keys(content).sort();
    for (let key of keys) {
        serializer(key, content[key]);
    }
}, function (deserializer, preset, unit, root, caches) {
    const result = {};
    preset(result);
    for (let keyID in unit) {
        let key = deserializeContent([parseInt(keyID)], root, caches);
        if (key[0] === "$") {
            result[key.slice(1)] = deserializeContent(unit[keyID], root, caches);
        }
    }
    return result;
});

registerSerializer("date", Date, function (content, serializer) {
    serializer("value", content.getTime() / 1000);
}, function (deserializer, preset) {
    let value = deserializer("value");
    return new Date(value * 1000);
}, function (content) {
    return content.getTime()
});

registerSerializer("regex", RegExp, function (content, serializer) {
    serializer("pattern", content.source);
    serializer("flags", content.flags);
}, function (deserializer, preset) {
    let source = deserializer("pattern");
    let flags = deserializer("flags");
    return new RegExp(source, flags)
}, function (content) {
    return content.toString();
});

registerSerializer("buffer", ArrayBuffer, function (content, serializer) {
    throw new Error("No support for serialization of ArrayBuffer");
}, function (deserializer, preset) {
    let code = deserializer("base64");
    return base64.toByteArray(code);
});

$.serial = {};

$.serial.serialize = serialize;
$.serial.deserialize = deserialize;
$.serial.deserialize.content = deserializeContent;
$.serial.register = registerSerializer;

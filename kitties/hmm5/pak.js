@import("js.engine");
@import("js.zip");

const { Reader } = require("./reader.js");

const bin = require("./bin.js");
const xml = require("./xml.js");

const { DDS } = require("./dds.js");
const { GR2 } = require("./gr2.js");

const Record = function Record() {};
Record.prototype = Object.create(null);

@.serialize.hndl("hmm5.inline", Record, function (content, serializer) {
    const keys = Object.keys(content).sort();
    for (let key of keys) {
        if (key[0] !== "@") {
            serializer(key, content[key]);
        }
    }
}, function (deserializer, preset, unit, root, caches) {
    throw new Error("No need to deserialize in server");
});

const Node = function Node(pak, path, name) {

    @.prop(this, "@@pak", pak);
    @.prop(this, "@@path", path);

    this["@@name"] = name;

};

Node.prototype = Object.create(null);

@.prop(Node.prototype, "@", function (query, ignoreNotFound) {

    return queryXPath(null, this, query, ignoreNotFound);

});

@.prop(Node.prototype, "@@", function (ignoreNotFound) {

    if (!this["@href"]) {
        return this;
    }

    let linked = this["@@pak"].resolveLink(this, this["@href"], ignoreNotFound);
    if (linked && linked.length) {
        if (linked.length > 1) {
            @warn(`Multiple node href target ${this["@href"]}`);
        }
        return linked[0];
    }

    return undefined;

});


const Instance = function Instance() {

};

@.serialize.hndl("hmm5.obj", Instance, function (content, serializer) {

    serializer("@@path", content["@@path"]);
    serializer("@@name", content["@@name"]);

    const keys = Object.keys(content).sort();
    for (let key of keys) {
        if (key[0] !== "@") {
            serializer(key, content[key]);
        }
    }

}, function (deserializer, preset, unit, root, caches) {
    throw new Error("No need to deserialize in server");
});

const GUID = function GUID(id) {

    if (GUID.instances[id]) {
        return GUID.instances[id];
    }

    GUID.instances[id] = this;

    this["@id"] = id;

};

GUID.instances = Object.create(null);

@.inherits(GUID, Instance);

@.serialize.hndl("hmm5.guid", GUID, (content, serializer) => {
    serializer("id", content["@id"]);
}, (deserializer, preset) => {
    throw new Error("No need to deserialize in server");
});

const Reference = function Reference() {

};

@.inherits(Reference, Instance);

@.serialize.hndl("hmm5.ref", Reference, (content, serializer) => {
    serializer("href", content["@href"]);
}, (deserializer, preset) => {
    throw new Error("No need to deserialize in server");
});

const File = function File(href) {
    this["@href"] = href;
};

@.inherits(File, Instance);

@.serialize.hndl("hmm5.file", File, (content, serializer) => {
    serializer("href", content["@href"]);
}, (deserializer, preset) => {
    throw new Error("No need to deserialize in server");
});

const Enum = function Enum(token, value) {
    this["@token"] = token;
    this["@value"] = value;
};

@.inherits(Enum, Instance);

@.serialize.hndl("hmm5.enum", Enum, (content, serializer) => {
    serializer("token", content["@token"]);
    serializer("value", content["@value"]);
    if (content["@href"]) {
        serializer("href", content["@href"]);
    }
}, (deserializer, preset) => {
    throw new Error("No need to deserialize in server");
});

const PAK = function PAK(path, records) {

    this.path = path;

    this.records = records;

    this.uids = Object.create(null);
    for (let file in records) {
        if (file.slice(0, 4).toLowerCase() === "bin/") {
            this.uids[@.fs.basename(file)] = file;
        }
    }

    this.xmls = Object.create(null);

    this.types = Object.create(null);
    this.types.ids = Object.create(null); // type id -> server id
    this.types.tags = Object.create(null); // tag -> server id
    this.types.tokens = Object.create(null); // token -> xlink

    // below is all server id
    this.types.all = Object.create(null);

    this.types.primitives = Object.create(null);
    for (let key in primitiveTypes) {
        this.types.primitives[key] = primitiveTypes[key];
        this.types.all[key] = primitiveTypes[key];
    }

    this.types.enums = Object.create(null);
    this.types.arrays = Object.create(null);
    this.types.binaries = Object.create(null);
    this.types.structs = Object.create(null);
    this.types.classes = Object.create(null);
    this.types.references = Object.create(null);

    this.types.bindings = Object.create(null);
    this.types.files = Object.create(null);

    this.types.inlines = Object.create(null);

    this.loadTypeDefinitions();
    this.loadTypeBindings();

    this.analyzeRoots();

};

PAK.prototype.loadTypeBindings = function () {

    @debug("Loading type bindings");

    let bindings = Object.create(null);

    for (let id in this.types.classes) {
        bindings[this.types.classes[id].binding] = id;
    }

    @debug("Loading Bin index.bin");
    let content = this.loadContent("index.bin");

    const parseName = function (record) {

        bin.digRecord(record);

        if (record.data.length !== 1) {
            throw new Error("No name provided");
        }

        return record.data[0].data.toString("utf8");

    };

    const parseNode = function (record) {

        bin.digRecord(record);

        let children = [];

        let count = null;
        for (let data of record.data) {
            switch (data.flag) {
                case 2: {
                    count = data.data.readInt32LE();
                    break;
                };
                case 1: {
                    let name = parseName(data);
                    children.push(name);
                    break;
                };
                default: { @dump(data); break; };
            }
        }

        if (count !== children.length) {
            @warn("Node children not match");
        }

        return children;

    };

    const parseGroups = function (record) {

        bin.digRecord(record);

        let count = null;
        let unknown = null;
        let groups = [];
        let flags = [];
        for (let data of record.data) {
            switch (data.flag) {
                case 4: { unknown = data.data.readInt32LE(); break; }; // 389?
                case 3: { count = data.data.readInt32LE(); break; };
                case 2: {
                    groups.push({
                        "links": parseNode(data)
                    });
                    break;
                };
                case 1: { flags.push(data.data); break; };
                default: { @dump(data); break; }
            }
        }

        for (let looper = 0; looper < count; ++looper) {
            groups[looper].type = flags[looper].readInt32LE();
        }

        return groups;

    };

    const parseTypes = function (record) {

        bin.digRecord(record);

        let types = Object.create(null);

        const groups = parseGroups(record.data[0]);
        for (let group of groups) {
            types[bindings[group.type]] = group;
        }

        return types;

    };

    let data = bin.readRecords(content);
    bin.digRecord(data[1]);
    bin.digRecord(data[3]);
    bin.digRecord(data[3].data[0]);

    let types = parseTypes(data[3].data[0].data[1]);

    for (let binding in types) {
        for (let link of types[binding].links) {
            this.types.bindings[link] = binding;
            let file = link.split("#")[0];
            if (file[0] === "/") {
                file = file.slice(1);
            }
            if (!this.types.files[file]) {
                this.types.files[file] = Object.create(null);
            }
            this.types.files[file][link] = binding;
        }
    }

    @celebr("Type bindings loaded");

};

PAK.prototype.loadTypeDefinitions = function () {

    @debug("Loading type definitions");

    let content = this.loadContent("types.xml", "utf8");

    let xml = this.loadXML("types.xml");

    let classIDs = Object.create(null);

    let types = Object.create(null);
    for (let item of (xml.@("Base/SharedClasses/Item"))) {

        let typeID = item.@("__ServerPtr")[0];
        if (types[typeID]) {
            @warn(`Conflicted type ${typeID}`);
        }

        let type = item.@("Type")[0];

        let classID = item.@("__ClassTypeID")[0];
        if (!classIDs[type]) {
            classIDs[type] = classID;
        } else if (classIDs[type] !== classID) {
            @warn(`Conflicted class ID ${classID}`);
        }

        this.types.ids[classID] = typeID;

        types[typeID] = item;

    }

    for (let type in types) {
        parseType(type, types, this.types);
    }

    for (let typeID of (xml.@("Base/Types/Item"))) {
        let type = this.types.all[typeID];
        this.types.tags[type.name] = typeID;
    }

    // TODO: make thre reading after the type binding will let it support structs
    for (let table of (xml.@("Base/Tables/Item"))) {

        let pointer = table.@("dbid/XPointer")[0];

        let items = Object.create(null);
        for (let item of (this.resolveLink(null, pointer)[0].@("objects/Item"))) {
            let record = item.@("Obj")[0];
            if (record) {
                if (record.@href) {
                    let href = record.@href;
                    if (href[0] === "#") {
                        if (!/^#n:inline\(/.test(href)) {
                            @warn(`Unknown inline link[${href}]`);
                        } else {
                            href = href.slice("#n:inline(".length, -1);
                            if (record["@id"]) {
                                href = `id(${record["@id"]})/${href}`;
                            }
                            href = `/${record["@@path"]}#xpointer(${href})`;
                        }
                    } else if (href[0] !== "/") {
                        href = `/${@.fs.resolvePath(record["@@path"], "..", href.split("#")[0])}#${href.split('#').slice(1).join("#")}`;
                    }
                    items[item.ID[0]] = href;
                } else {
                    const simplify = (record) => {
                        if (typeof record === "string") {
                            return record;
                        }
                        if (record["@href"]) {
                            if (Object.keys(record).filter((key) => key !== "@@name").length > 2) {
                                @dump(record);
                                throw new Error("Not reference object");
                            }
                            let reference = new Reference();
                            let href = record["@href"];
                            if (href[0] !== "/") {
                                href = @.fs.resolvePath(record["@@path"], "..") + "/" + href;
                            }
                            reference["@href"] = href;
                            return reference;
                        }
                        if (record["Item"]) {
                            if (Object.keys(record).filter((key) => key !== "@@name").length > 1) {
                                @dump(record);
                                throw new Error("Not array object");
                            }
                            return record["Item"].map(simplify);
                        }
                        let result = new Record();
                        for (let key in record) {
                            if ((key !== "@@name") && record[key]) {
                                if (record[key].length > 1) {
                                    @dump(record);
                                    throw new Error(`Invalid simplified record key[${key}]`);
                                } else if (record[key].length === 1) {
                                    result[key] = simplify(record[key][0]);
                                }
                            }
                        }
                        return result;
                    };
                    this.types.inlines[item.ID[0]] = simplify(record);
                    items[item.ID[0]] = "@" + item.ID[0];
                }
            } else {
                this.types.inlines[item.ID[0]] = null;
                items[item.ID[0]] = "@" + item.ID[0];
            }
        }

        for (let id of (table.@("EnumEntries/Item"))) {
            if (items[id] === undefined) {
                throw new Error(`Token[${id}] not found`);
            }
            this.types.tokens[id] = items[id];
        }

    }

    @celebr("Type definitions loaded");

};

PAK.prototype.analyzeRoots = function () {

    @debug("Analyzing root files and objects");

    let content = @.fs.readFile.sync(@path(this.path, "bin/H5_Game.exe"));

    let sig = Buffer.from(".xdb", "utf8");

    let roots = [];

    let index = content.indexOf(sig);
    while (index !== -1) {
        const radius = 200;
        let string = content.slice(index - radius, index + radius);
        let from = radius;
        while ((from > 0) && string[from]) {
            --from;
        }
        let to = radius;
        while ((to < radius * 2) && string[to]) {
            ++to;
        }
        let root = string.slice(from + 1, to).toString("utf8");
        if (root[0] === "/") {
            let file = root.slice(1).split("#")[0];
            if (this.records[file]) {
                roots.push(root);
            }
        }
        index = content.indexOf(sig, index + to - radius);
    }

    roots.sort();

    this.roots = {
        "objects": roots.filter((file) => file.indexOf("#") !== -1),
        "files": roots.filter((file) => file.indexOf("#") === -1)
    };

    @celebr("Root files and objects confirmed");

};

PAK.prototype.resolveLink = function (base, href, ignoreNotFound) {

    let file = undefined;
    if (href[0] !== "#") {
        file = href.split("#")[0];
        if (file[0] !== "/") {
            file = @.fs.resolvePath(base["@@path"], "..", file);
        }
        if (file[0] === "/") {
            file = file.slice(1);
        }
    } else {
        file = base["@@path"];
    }

    if (href.indexOf("#") === -1) {
        if (!this.records[file]) {
            if (ignoreNotFound) {
                @warn(`File not found ${file}`);
                return undefined;
            } else {
                throw new Error(`File not found ${file}`);
            }
        }
        return this.loadContent(file);
    }

    let path = undefined;
    let id = undefined;

    let mark = false;
    if (/^#n:inline\(([\/0-9a-z_\-\+]+)\)$/i.test(href)) {
        path = href.split("#n:inline").slice(1).join("#n:inline").slice(1, -1);
        mark = true;
    } else if (/^([\/0-9a-zé_\.\-\+\(\) `]+)#xpointer\(([\/0-9a-z_\-\+]+)\)$/i.test(href)) {
        path = href.split("#xpointer").slice(1).join("#xpointer").slice(1, -1);
        base = null;
    } else if (/^([\/0-9a-zé_\.\-\+\(\) `]+)#xpointer\(id\(([a-z0-9\-_]+)\)([\/0-9a-z_\-\+]+)\)$/i.test(href)) {
        //xpointer(id(idc6fee551-a01f-4477-bcb0-0e2efea6feee)/AdvMapStatic)
        let rest = href.split("#xpointer").slice(1).join("#xpointer").slice(1, -1);
        id = rest.split("id(").slice(1).join("id(").split(")")[0];
        path = rest.split(")").slice(1).join(")");
        base = null;
    } else {
        @error(new Error(`Invalid xlink ${href}`));
        return undefined;
    }

    let xml = this.xmls[file];
    if (!xml) {
        if (!this.records[file]) {
            if (ignoreNotFound) {
                @warn(`File not found ${file}`);
                return undefined;
            } else {
                throw new Error(`File not found ${file}`);
            }
        }
        xml = this.loadXML(file);
        this.xmls[file] = xml;
    }

    if (id) {
        let result = [];
        let find = function (nodes) {
            for (let node of nodes) {
                if (node && (typeof node !== "string")) {
                    if (node["@id"] === id) {
                        node["@@path"] = xml["@@path"];
                        result.push(node);
                    } else {
                        for (let key in node) {
                            if ((key[0] !== "@") && (node[key] instanceof Array)) {
                                find(node[key]);
                            }
                        }
                    }
                }
            }
        };
        find([xml]);
        xml = result[0];
    }

    let result = queryXPath(xml, base, path, ignoreNotFound);
    if (result && (result.length === 0)) {
        result = undefined;
    }

    return result;

};

PAK.prototype.getInlineObject = function (id) {

    return this.types.inlines[id];

};

PAK.prototype.parseNode = function (path, node) {

    if (typeof node === "string") {
        let trimmed = node.trim();
        if (trimmed) {
            return trimmed;
        } else {
            return undefined;
        }
    }

    if ((node.children.length === 1) && (typeof node.children[0] === "string")) {
        let result = node.children[0].trim();
        if (result) {
            return result;
        } else {
            return new Node(this, path, node.name);
        }
    }

    let result = new Node(this, path, node.name);

    for (let key in node.attributes) {
        result[`@${key}`] = node.attributes[key].trim();
    }

    for (let child of node.children) {
        if (typeof child === "string") {
            @warn("Complex children found");
        } else {
            let name = child.name;
            if (!result[name]) {
                result[name] = [];
            }
            let parsed = this.parseNode(path, child);
            if ((!@.is.nil(parsed)) &&
                ((typeof parsed === "string") ||
                 (Object.keys(parsed).length > 1))) {
                // @@name is a visible key
                result[name].push(parsed);
            }
        }
    }

    return result;

};

PAK.prototype.parseXML = function (path, content) {

    let nodes = xml.parseXML(content);

    let root = {
        "attributes": {},
        "children": xml.trimNodes(nodes),
        "closed": false,
        "name": "#document"
    };

    return this.parseNode(path, root);

};

PAK.prototype.loadContent = function (path, encoding) {

    const record = this.records[path];

    let content = record.zip.readFileSync(path);

    if (encoding === "utf8") {
        if ((content[0] === 0xff) && (content[1] === 0xfe)) {
            content = content.slice(2);
        }
        content = content.toString("utf8");
    }

    return content;

};

PAK.prototype.loadGeometry = function (path) {

    let content = this.loadContent(path);

    let records = bin.readRecords(content);

    const parseGroupArray = function (record, parser, unitSize) {

        bin.digRecord(record);

        if (record.data.length !== 2) {
            // it means there is no data in the array
            return null;
        }

        let count = record.data[0].data.readInt32LE(0);

        let groupSize = record.data[1].data.length / count;

        let reader = new Reader(record.data[1].data);

        let groups = [];

        if (typeof parser === "string") {
            parser = reader[parser];
        }

        if (groupSize === unitSize) {
            for (let looper = 0; looper < count; ++looper) {
                groups.push(parser.call(reader));
            }
        } else {
            for (let looper = 0; looper < count; ++looper) {
                let group = [];
                for (let looper2 = 0; looper2 < groupSize; looper2 += unitSize) {
                    group.push(parser.call(reader));
                }
                groups.push(group);
            }
        }

        return {
            "usage": record.flag,
            "data": groups
        };

    };

    const parsePolygon = function (record) {

        bin.digRecord(record);

        let vertices = parseGroupArray(record.data[0], "readFloat32", 4);

        let configs = parseGroupArray(record.data[1], function () {

            const readFloat8 = () => {
                return (this.readUInt8() - 127) / 128;
            };

            const readFloat8Normals = () => {
                let result = [readFloat8(), readFloat8(), readFloat8(), readFloat8()];
                if (result[3] !== 1) {
                    throw new Error("Invalid normal");
                }
                return result.slice(0, 3);
            };

            let result = {
                "uv": [this.readUInt16() / 2048, this.readUInt16() / 2048],
                "uv2": [this.readUInt16() / 2048, this.readUInt16() / 2048],
                "normal": readFloat8Normals(),
                "tangent": readFloat8Normals(),
                "bitangent": readFloat8Normals()
            };

            return result;

        }, 20);

        let bones = parseGroupArray(record.data[2], function () {

            let result = {
                "weights": [this.readFloat32(), this.readFloat32(), this.readFloat32(), this.readFloat32()],
                "weightsUint8": [this.readUInt8(), this.readUInt8(), this.readUInt8(), this.readUInt8()],
                "indices": [this.readUInt8(), this.readUInt8(), this.readUInt8(), this.readUInt8()],
            };

            return result;

        }, 24);

        let configVertices = parseGroupArray(record.data[3], "readUInt16", 2);
        let configIndices = parseGroupArray(record.data[4], "readUInt16", 2);

        let triangles = parseGroupArray(record.data[5], "readUInt16", 2); // indices

        // 6 is always 0
        bin.digRecord(record.data[6]);
        let triangleCount = record.data[7].data.readUInt32LE(0); // number of triangles
        let unknown = record.data[8].data;
        let flags = record.data[9].data.readUInt8(0); // flag
        // 10 is always -1

        if (triangleCount !== triangles.data.length) {
            throw new Error("Invalid triangle count");
        }

        let polygon = {
            "vertices": vertices.data,
            "triangles": triangles.data, // use the config index
            "configs": {
                "data": configs.data,
                "vertices": configVertices.data, // config index to vertex id
                "ids": configIndices.data, // config index to config id, useless
            },
            "bones": bones ? bones.data : null,
            "unknown": [unknown[0], unknown[1], unknown[2], unknown[3]],
            "flags": flags
        };

        return polygon;

    };

    const parseMesh = function (record) {

        bin.digRecord(record);

        let polygons = [];

        let count = 0;
        for (let data of record.data) {
            switch (data.flag) {
                case 2: {
                    count = data.data.readUInt32LE(); break;
                };
                case 1: {
                    polygons.push(parsePolygon(data)); break;
                };
                default: {
                    throw new Error("Unknown usage");
                };
            }
        }

        if (polygons.length !== count) {
            throw new Error("Incorrect submesh count");
        }

        return polygons;

    };

    const parseMeshes = function (record) {

        bin.digRecord(record);

        let meshes = [];

        let count = 0;

        for (let data of record.data) {
            switch (data.flag) {
                case 2: {
                    count = data.data.readUInt32LE(); break;
                };
                case 1: {
                    meshes.push(parseMesh(data)); break;
                };
                default: {
                    throw new Error("Unknown usage");
                };
            }
        }

        if (meshes.length !== count) {
            throw new Error("Incorrect mesh count");
        }

        return meshes;

    };

    bin.digRecord(records[1]);

    let geometry = {
        "meshes": parseMeshes(records[1].data[0])
    };

    return geometry;

};

PAK.prototype.loadSkeleton = function (path) {

    let content = this.loadContent(path);

    let gr2 = new GR2(content);

    let source = gr2.root.Skeletons[0];
    if (gr2.root.Skeletons.length > 1) {
        @warn("Multiple skeletons found");
    }

    let result = {
        "root": source.Name,
        "bones": source.Bones.map((bone) => {
            return {
                "name": bone.Name,
                "parent": bone.ParentIndex,
                "translations": bone.Transform.Translations,
                "quaternion": bone.Transform.Quaternion,
                "scales": [
                    bone.Transform.Scales[0][0],
                    bone.Transform.Scales[1][1],
                    bone.Transform.Scales[2][2]
                ]
            };
        })
    };

    return result;

};

PAK.prototype.loadAnimation = function (path) {

    let content = this.loadContent(path);

    let gr2 = new GR2(content);

    if (gr2.root.Animations.length > 1) {
        @warn("Multiple animation found");
    }

    let source = gr2.root.Animations[0];

    let result = {
        "duration": source.Duration,
        "oversampling": source.OverSampling,
        "fps": (1 / source.TimeStep),
        "tracks": source.TrackGroups.map((group) => {

            let result = {
                "name": group.Name,
                "texts": {},
                "vectors": {},
                "transforms": {}
            };

            for (let text of group.TextTracks) {
                let track = text.Entries.map((entry) => {
                    return {
                        "timestamp": entry.TimeStamp,
                        "text": entry.Text
                    };
                });
                result.texts[text.Name] = track;
            }

            for (let vector of group.VectorTracks) {
                let track = {
                    "dimension": vector.Dimension,
                    "values": {
                        "data": vector.ValueCurve.Controls.map((value) => value.Real32),
                        "degree": vector.ValueCurve.degree,
                        "times": vector.ValueCurve.Knots.map((value) => value.Real32),
                    }
                };
                result.vectors[vector.Name] = track;
            }

            for (let transform of group.TransformTracks) {
                let track = {};
                if (transform.PositionCurve.Controls) {
                    track.translations = {
                        "data": transform.PositionCurve.Controls.map((value) => value.Real32),
                        "degree": transform.PositionCurve.Degree,
                        "times": transform.PositionCurve.Knots.map((value) => value.Real32),
                    };
                }
                if (transform.OrientationCurve.Controls) {
                    track.orientations = {
                        "data": transform.OrientationCurve.Controls.map((value) => value.Real32),
                        "degree": transform.OrientationCurve.Degree,
                        "times": transform.OrientationCurve.Knots.map((value) => value.Real32),
                    }
                }
                if (transform.ScaleShearCurve.Controls) {
                    let data = [];
                    let dataMatrices = transform.ScaleShearCurve.Controls.map((value) => value.Real32);
                    for (let looper = 0; looper < dataMatrices.length; looper += 9) {
                        data.push(dataMatrices[looper],
                                  dataMatrices[looper + 4],
                                  dataMatrices[looper + 8]);
                    }
                    track.scales = {
                        "data": data,
                        "degree": transform.ScaleShearCurve.Degree,
                        "times": transform.ScaleShearCurve.Knots.map((value) => value.Real32),
                    }
                }
                result.transforms[transform.Name] = track;
            }

            return result;
        })
    };

    return result;

};

// PAK.prototype.loadEffect = function (path) {

//     let content = this.loadContent(path);

//     @dump(content.length);

//     let reader = new Reader(content);

//     let dataSize = reader.readUInt32();
//     let duration = reader.readFloat32();
//     let fps = reader.readFloat32();

//     let effect = {
//         "duration": duration,
//         "fps": fps
//     };

//     @dump(effect);

//     reader.dump();

//     // 1 3
//     // 1 2
//     // 1 3
//     // 1 5
//     // 1 3
//     // 1 5

// };

PAK.prototype.loadDDS = function (path) {

    let content = this.loadContent(path);

    return new DDS(content);

};

PAK.prototype.loadXML = function (path, noCache) {

    if (path[0] === "/") {
        path = path.slice(1);
    }

    let xml = this.xmls[path];
    if (!xml) {
        @debug(`Loading XML ${path}`);
        let content = this.loadContent(path, "utf8");
        xml = this.parseXML(path, content);
        if (!noCache) {
            this.xmls[path] = xml;
        }
    }

    return xml;

};

PAK.prototype.loadToken = function (token) {

    let xlink = this.types.tokens[token];
    if (!xlink) {
        throw new Error("Token not found");
    }

    let items = this.resolveLink(null, xlink)[0].@("objects/Item");
    for (let item of items) {
        if (item.@("ID")[0] === token) {
            return item.@("Obj")[0]["@@"]();
        }
    }

    throw new Error("Token not found");

};

PAK.prototype.extractResources = function (target, path) {

    const pak = this;

    return @.async.all(this.analyzeDependencies(target), function (file) {

        let record = pak.records[file];

        let output = @path(path, file);

        @.fs.makeDirs(@.fs.dirname(output));

        record.zip.extractFile(file, output).pipe(this);

    });

};

PAK.prototype.analyzeDependencies = function (target) {

    let dependencies = Object.create(null);

    let sets = new Set();

    const process = (node) => {

        if (typeof node === "string") {
            return;
        }

        if (sets.has(node)) {
            return;
        }

        sets.add(node);

        if (node["@href"]) {
            let file = node["@href"].split("#")[0];
            if (file) {
                file = @.fs.resolvePath(node["@@path"], "..", file);
                if (file[0] === "/") {
                    file = file.slice(1);
                }
                if (this.records[file]) {
                    if (file !== node["@@path"]) {
                        dependencies[file] = true;
                    }
                    if (@.fs.extname(file) === ".xdb") {
                        for (let child of this.resolveLink(node, node["@href"])) {
                            process(child);
                        }
                    }
                }
            }
        }

        if (node.@("XPointer")) {
            for (let link of (node.@("XPointer"))) {
                let file = link.split("#")[0];
                if (file) {
                    file = @.fs.resolvePath(node["@@path"], "..", file);
                    if (file[0] === "/") {
                        file = file.slice(1);
                    }
                    if (this.records[file]) {
                        if (file !== node["@@path"]) {
                            dependencies[file] = true;
                        }
                        if (@.fs.extname(file) === ".xdb") {
                            for (let child of this.resolveLink(node, link)) {
                                process(child);
                            }
                        }
                    }
                }
            }
        }

        if (node.@("uid")) {
            let uid = node.@("uid")[0];
            if (this.uids[uid]) {
                analyze(this.uids[uid]);
            }
        }

        for (let key in node) {
            if (key[0] !== "@") {
                for (let child of node[key]) {
                    process(child);
                }
            }
        }

    };

    const analyze = (link) => {

        let path = link.split("#")[0];
        if (path[0] === "/") {
            path = path.slice(1);
        }

        if (!this.records[path]) {
            return;
        }

        dependencies[path] = true;

        if (@.fs.extname(path) === ".xdb") {

            let xml = undefined;
            if (link.indexOf("#") === -1) {
                xml = [this.loadXML(path)];
            } else {
                xml = this.resolveLink(null, link);
            }

            for (let node of xml) {
                process(node);
            }

        }

    };

    if (typeof target === "string") {

        analyze(target);

    } else {

        if (!(target instanceof Array)) {
            target = [target];
        }

        for (let node of target) {
            process(node);
        }

    }

    return Object.keys(dependencies).sort();

};

PAK.prototype.restoreInstance = function (object, typeID, caches) {

    if (caches.has(object)) {
        return caches.get(object);
    }

    if (!typeID) {
        let link = `/${object["@@path"]}#xpointer(/${object["@@name"]})`;
        typeID = this.types.bindings[link];
        if (!typeID) {
            @dump(object);
            throw new Error("No type ID found");
        }
    }

    const getTypeName = (type) => {

        let name = type.name;
        let namespace = type.namespace;
        while (namespace && (namespace !== this.types.all["00000000"])) {
            name = namespace.name + "." + name;
            namespace = namespace.namespace;
        }

        return name;
    };

    let pak = this;

    let type = this.types.all[typeID];
    switch (type.type) {

        case "primitive": {
            switch (type.name) {
                case "Boolean": {
                    return (object.toLowerCase()[0] === "t");
                };
                case "Integer": {
                    return parseInt(object);
                };
                case "Float": {
                    return parseFloat(object);
                };
                case "String":
                case "WideString": {
                    if (typeof object !== "string") {
                        let file = object["@href"];
                        if (!file) {
                            return undefined;
                        }
                        if (file[0] !== "/") {
                            file = @.fs.resolvePath(object["@@path"], "..", file);
                        }
                        if (file[0] === "/") {
                            file = file.slice(1);
                        }
                        return new File(file);
                    }
                    return object;
                };
                case "GUID": {
                    return new GUID(object);
                };
                default: {
                    @dump(object);
                    @dump(type);
                    process.exit();
                };
            }
        };

        case "binary": {
            let buffer = Buffer.from(object, "hex");
            return buffer;
        };

        case "class":
        case "struct": {

            const prepareType = (type) => {

                if (type["class"]) {
                    return;
                }

                const pak = this;

                let createConstructor = () => {

                    return function (object, caches) {

                        caches.set(object, this);

                        let supertype = type.base;
                        if (supertype && (supertype !== pak.types.all["00000000"])) {
                            supertype["class"].call(this, object, caches);
                        }

                        let fields = [];
                        for (let key in type.fields) {
                            let field = type.fields[key];
                            let value = object[key];
                            let restored = undefined;
                            if (value && value.length) {
                                if (value.length !== 1) {
                                    @warn("Invalid value length");
                                }
                                restored = pak.restoreInstance(value[0], field.type.id, caches);
                            } else {
                                if (field.default) {
                                    restored = field.default;
                                } else if (field.initial) {
                                    @error(field, value);
                                    process.exit();
                                }
                            }
                            fields.push({
                                "order": field.order,
                                "key": key,
                                "value": restored
                            });
                        }

                        fields.sort((a, b) => a.order - b.order);

                        for (let field of fields) {
                            this[field.key] = field.value;
                        }

                    };

                };

                type["class"] = createConstructor();

                Object.defineProperty(type["class"], "name", {
                    "enumerable": true,
                    "value": getTypeName(type)
                });

                let supertype = type.base;
                if (supertype && (supertype !== this.types.all["00000000"])) {
                    prepareType(supertype);
                    @.inherits(type["class"], supertype["class"]);
                } else {
                    @.inherits(type["class"], Instance);
                }

            }

            prepareType(type);

            let constructor = type["class"];

            let instance = new constructor(object, caches);

            @.prop(instance, "@@name", type["class"].name);
            @.prop(instance, "@@path", object["@@path"]);

            return instance;
        };

        case "array": {

            let list = [];

            caches.set(object, list);

            for (let item of (object.@("Item"))) {
                let element = this.restoreInstance(item, type.element.type.id, caches);
                list.push(element);
            }

            return list;

        };

        case "enum": {

            if (!type["class"]) {

                type.instances = Object.create(null);

                let createConstructor = () => {

                    return function (object) {
                        this.@value = type.values[object];
                        this.@token = object;
                        if (pak.types.tokens[object]) {
                            this.@href = pak.types.tokens[object];
                        }
                    };

                };

                type["class"] = createConstructor();

                @.inherits(type["class"], Enum);

                Object.defineProperty(type["class"], "name", {
                    "enumerable": true,
                    "value": getTypeName(type)
                });

            }

            if (!type.instances[object]) {
                type.instances[object] = new (type["class"])(object);
            }

            return type.instances[object];
        };

        case "reference": {

            if (!type["class"]) {

                const pak = this;

                let createConstructor = () => {

                    return function (record) {

                        let href = record["@href"];
                        if (href[0] === "#") {
                            if (!/^#n:inline\(/.test(href)) {
                                @warn(`Unknown inline link[${href}]`);
                            } else {
                                href = href.slice("#n:inline(".length, -1);
                                if (record["@id"]) {
                                    href = `id(${record["@id"]})/${href}`;
                                }
                                href = `/${record["@@path"]}#xpointer(${href})`;
                            }
                        } else if (href[0] !== "/") {
                            href = `/${@.fs.resolvePath(record["@@path"], "..", href.split("#")[0])}#${href.split('#').slice(1).join("#")}`;
                        }

                        this.@href = href;

                        @.prop(this, "@target", function (newCaches) {

                            if (!newCaches) {
                                newCaches = caches;
                            }

                            let target = pak.resolveLink(record, record["@href"]);

                            if ((!target) || (target.length === 0)) {
                                return undefined;
                            }

                            if (target.length > 1) {
                                @warn("Multiple reference target found");
                            }

                            return pak.restoreInstance(target[0], type.target.id, newCaches);

                        });

                    };

                };

                type["class"] = createConstructor();
                @.inherits(type["class"], Reference);

                Object.defineProperty(type["class"], "name", {
                    "enumerable": true,
                    "value": getTypeName(type.target) + "Reference"
                });

            }

            let result = new (type["class"])(object);

            result["@@path"] = object["@@path"];

            return result;

        };

        default: {
            @dump(object);
            @dump(type);
            break;
        };

    }

};

PAK.prototype.listBindings = function (path) {

    if (path[0] === "/") {
        path = path.slice(1);
    }

    let bindings = this.types.files[path];
    if (bindings) {
        return Object.keys(bindings).map((link) => `${link}:${bindings[link]}`);
    }

    return [];

};

const primitiveTypes = Object.create(null);
primitiveTypes["00000000"] = {
    "type": "primitive",
    "name": "Null"
};

const classInitializers = Object.create(null);
classInitializers["270062592"] = function (value) {

    let min = parseFloat(value["Min"]);
    let max = parseFloat(value["Max"]);
    let type = parseFloat(value["Type"]);

    let result = {
        "@classID": value["@classID"],
        "@name": "RangeConstraint",
        "Type": type, // Unknown usage, maybe including edge or fixed point
        "Min": min,
        "Max": max
    };

    switch (type) {
        case 1: { break; };
        case 2: { break; };
        default: {
            @warn(`Unknown type of range constraint ${type}`);
            break;
        }
    }

    return result;
};

classInitializers["270062596"] = function (value) {

    return {
        "@classID": value["@classID"],
        "@name": "ElementCountConstraint",
        "MinElements": parseInt(value["MinElements"]),
        "MaxElements": parseInt(value["MaxElements"])
    };

};

classInitializers["270064327"] = function (value, records, caches) {

    let result = {
        "@classID": value["@classID"],
        "@name": "EditorAttributes"
    };

    for (let item of (value.Attributes.@("Item"))) {
        let key = item.@("Key")[0];
        let data = parseValue(item.@("Data")[0], records, caches);
        result[key] = data;
    }

    return result;
};

const parseValue = function (record, records, caches) {

    if (!record) {
        return undefined;
    }

    let type = record.@("Type")[0];
    switch (type) {
        case "00000000": { return null; };
        case "01000000": {
            let data = record.@("Data")[0];
            return parseInt(data);
        };
        case "02000000": {
            let data = record.@("Data")[0];
            return parseFloat(data);
        };
        case "03000000": {
            let data = record.@("Data")[0];
            if (!data) {
                data = "";
            }
            return data;
        };
        case "04000000": {
            let data = record.@("Data")[0].toLowerCase();
            switch (data) {
                case "false": { return false; };
                case "true": { return true; };
                default: {
                    @warn(`Unknown boolean value ${data}`);
                    return undefined;
                }
            }
        };
        default: {
            if (type === undefined) {
                let result = {
                    "@classID": record.@("__ClassTypeID")[0]
                };
                let values = record.@("__ObjectData")[0];
                for (let key in values) {
                    if (key[0] !== "@") {
                        if (values[key].length !== 1) {
                            @warn(`Invalid value key ${key}`);
                        } else {
                            result[key] = values[key][0];
                        }
                    }
                }
                if (!classInitializers[result["@classID"]]) {
                    @warn(`Unknown class ${result["@classID"]}`);
                    return undefined;
                }
                return classInitializers[result["@classID"]](result, records, caches);
            } else {
                @warn(`Unknown value type ${type}`);
            }
            break;
        }
    }

};

const parseField = function (field, records, caches) {

    let name = field.@("Name")[0];
    let typeID = field.@("Type")[0];
    parseType(typeID, records, caches);

    let result = {
        "name": name,
        "type": caches.all[typeID],
        "description": field.@("Description")[0],
        "default": parseValue(field.@("DefaultValue")[0], records, caches),
        "initial": parseValue(field.@("ComplexDefaultValue")[0], records, caches),
        "attributes": parseValue(field.@("Attributes")[0], records, caches),
        "constraints": (field.@("Constraints/Item", true).map((value) => {
            return parseValue(value, records, caches);
        })),
        "order": parseInt(field.@("ChunkID")[0])
    };

    return result;

};

const parseType = function (id, records, caches) {

    if (caches.all[id] !== undefined) {
        return;
    }

    let record = records[id];
    if (!record) {
        @warn(`Unknown type ${id}`);
        return;
    }

    let typeID = record.@("__ServerPtr")[0];
    if (id !== typeID) {
        @warn(`Conflicted type ${typeID}`);
    }

    let type = record.@("Type")[0];
    switch (type) {

        case "TYPE_TYPE_STRUCT":
        case "TYPE_TYPE_CLASS": {

            let target = {
                "id": typeID,
                "name": record.@("TypeName")[0],
                "attributes": parseValue(record.@("Attributes")[0], records, caches),
                "type": type === "TYPE_TYPE_STRUCT" ? "struct" : "class",
            };

            caches.all[typeID] = target;
            switch (target.type) {
                case "struct": { caches.structs[typeID] = target; break; };
                case "class": {
                    target.binding = record.@("TypeID")[0];
                    caches.classes[typeID] = target;
                    break;
                };
                default: { @warn(`Unknown type ${target.type}`); break; };
            }

            let baseID = record.@("BaseType")[0];
            parseType(baseID, records, caches);
            target.base = caches.all[baseID];

            let namespaceID = record.@("EnclosingNamespace")[0];
            parseType(namespaceID, records, caches);
            target.namespace = caches.all[namespaceID];

            target.fields = Object.create(null);
            for (let field of (record.@("Fields/Item", true))) {
                let parsed = parseField(field, records, caches);
                target.fields[parsed.name] = parsed;
            }

            target.nesteds = record.@("NestedTypes/Item", true).map((typeID) => {
                parseType(typeID, records, caches);
                return caches.all[typeID];
            });

            break;
        };

        case "TYPE_TYPE_STRING": {

            let target = {
                "id": typeID,
                "name": "String",
                "type": "primitive"
            };

            caches.all[typeID] = target;
            caches.primitives[typeID] = target;

            break;
        };

        case "TYPE_TYPE_WSTRING": {

            let target = {
                "id": typeID,
                "name": "WideString",
                "type": "primitive"
            };

            caches.all[typeID] = target;
            caches.primitives[typeID] = target;

            break;
        };

        case "TYPE_TYPE_BOOL": {

            let target = {
                "id": typeID,
                "name": "Boolean",
                "type": "primitive"
            };

            caches.all[typeID] = target;
            caches.primitives[typeID] = target;

            break;

        };

        case "TYPE_TYPE_INT": {

            let target = {
                "id": typeID,
                "name": "Integer",
                "type": "primitive"
            };

            caches.all[typeID] = target;
            caches.primitives[typeID] = target;

            break;

        };

        case "TYPE_TYPE_FLOAT": {

            let target = {
                "id": typeID,
                "name": "Float",
                "type": "primitive"
            };

            caches.all[typeID] = target;
            caches.primitives[typeID] = target;

            break;

        };

        case "TYPE_TYPE_GUID": {

            let target = {
                "id": typeID,
                "name": "GUID",
                "type": "primitive"
            };

            caches.all[typeID] = target;
            caches.primitives[typeID] = target;

            break;
        };

        case "TYPE_TYPE_ENUM": {

            let target = {
                "id": typeID,
                "name": record.@("TypeName")[0],
                "attributes": parseValue(record.@("Attributes")[0], records, caches),
                "type": "enum",
                "values": Object.create(null),
                "tokens": Object.create(null)
            };

            caches.all[typeID] = target;
            caches.enums[typeID] = target;

            let namespaceID = record.@("EnclosingNamespace")[0];
            parseType(namespaceID, records, caches);
            target.namespace = caches.all[namespaceID];

            for (let item of (record.@("Entries/Item"))) {
                let value = parseInt(item.@("Value")[0]);
                let name = item.@("Name")[0];
                target.values[name] = value;
                target.tokens[value] = name;
            }

            break;
        };

        case "TYPE_TYPE_ARRAY": {

            let target = {
                "id": typeID,
                "name": record.@("TypeName")[0],
                "type": "array",
                "field": record.@("BoundTo")[0],
                "element": parseField(record.@("Field")[0], records, caches)
            };

            caches.all[typeID] = target;
            caches.arrays[typeID] = target;

            let namespaceID = record.@("EnclosingNamespace")[0];
            parseType(namespaceID, records, caches);
            target.namespace = caches.all[namespaceID];

            break;
        };

        case "TYPE_TYPE_BINARY": {

            let target = {
                "id": typeID,
                "name": record.@("TypeName")[0],
                "attributes": parseValue(record.@("Attributes")[0], records, caches),
                "type": "binary",
                "size": parseInt(record.@("BinaryObjectSize")[0])
            };

            caches.all[typeID] = target;
            caches.binaries[typeID] = target;

            break;
        };

        case "TYPE_TYPE_REF": {

            let target = {
                "id": typeID,
                "type": "reference"
            };

            caches.all[typeID] = target;
            caches.references[typeID] = target;

            let targetID = record.@("RefType")[0];
            parseType(targetID, records, caches);
            target.target = caches.all[targetID];

            break;
        };

        default: {
            @dump(type);
            break;
        };

    }

};

const queryXPath = function (root, base, path, ignoreNotFound) {

    let current = undefined;
    if (path[0] === "/") {
        current = [root];
        path = path.slice(1);
    } else {
        current = [base];
    }

    let compontents = path.split("/");
    for (let compontent of compontents) {

        if ((!current) || (current.length === 0)) {
            if (!ignoreNotFound) {
                @warn("Node not found: " + path);
                return undefined;
            } else {
                return [];
            }
        }

        if (!compontent) {
            if (!ignoreNotFound) {
                @warn("Node not found: " + path);
                return undefined;
            } else {
                return [];
            }
        }

        let lowerCased = compontent.toLowerCase();

        let nexts = [];
        for (let node of current) {
            for (let key in node) {
                if ((lowerCased === "*") || (key.toLowerCase() === lowerCased)) {
                    for (let next of node[key]) {
                        nexts.push(next);
                    }
                }
            }
        }

        current = nexts;

    }

    return current;

};

const loadPAKs = function (... paks) {

	let files = [];

	for (let path of paks) {
		if (@.fs.exists.dir(path)) {
			let isProgramDir = @.fs.exists.file(@path(path, "data/data.pak"));
			@.fs.scanFiles.sync(path, -1, (record) => {

                let rootBasedPath = @.fs.rootBasedPath(path, record.path).toLowerCase();
				if (isProgramDir) {
					if ((rootBasedPath === "maps") ||
						(rootBasedPath === "duelpresets") ||
                        (rootBasedPath === "dataa1") ||
						(rootBasedPath === "support")) {
						return false;
					}
				}

				if (record.type === "dir") {
					return true;
				}

				let filename = @.fs.filename(record.path);
				if (filename[0] === ".") {
					return false;
				}

				let file = @.fs.openFile(record.path);
				let buffer = Buffer.alloc(4);
				if (file.readSync(0, buffer, 4) !== 4) {
					file.close();
					return false;
				}

				file.close();
				if ((buffer[0] === 0x50) &&
					(buffer[1] === 0x4b) &&
					(buffer[2] === 0x03) &&
					(buffer[3] === 0x04)) {
					// ZIP header
					@debug(`Found PAK file ${rootBasedPath}`);
					return true;
				}

			}).forEach((record) => {
				if (record.type === "file") {
					files.push(record.path);
				}
			});
		} else if (@.fs.exsts.file(path)) {
			@debug(`Found PAK file ${@.fs.filename(path)}`);
			files.push(path);
		} else {
			@error(`Unknown path ${path}`);
		}
	}

    let records = Object.create(null);
    let overwritten = 0;

	return @.async.all(files, function (pak) {

        @debug(`Analyzing PAK file ${@.fs.filename(pak)}`);

        @zip.load(pak).then(function (zip) {

            let roots = Object.create(null);

            let files = zip.files;
            for (let file of files) {
                if (file.type === "file") {
                    let path = file.path;
                    let time = file.modifyTime;
                    if ((!records[path]) ||
                        (records[path].time.getTime() <= time.getTime())) {
                        if (records[path] && (!roots[path.split("/")[0]])) {
                            roots[path.split("/")[0]] = true;
                            @debug(`Found overwritten resource ${path}`)
                            ++overwritten;
                        }
                        records[path] = {
                            "path": path,
                            "time": time,
                            "zip": zip,
                            "pak": pak
                        };
                    }
                }
            }

            this.next();

        }).pipe(this);

	}).then(function () {

        @celebr(`Total unique resources: ${Object.keys(records).length}, overwritten: ${overwritten}`);

        this.next(new PAK(paks[0], records));

    });

};

module.exports.loadPAKs = loadPAKs;



const { Reader } = require("./reader.js");

const entryPath = @mewchan().entryPath;

const getFieldType = function (typeID) {

    switch (typeID) {
        case 0: { return "none"; };
        case 1: { return "inline"; };
        case 2: { return "reference"; };
        case 3: { return "reference_to_array"; };
        case 4: { return "array_of_references"; };
        case 5: { return "variant_reference"; };
        case 7: { return "reference_to_variant_array"; };
        case 8: { return "string"; };
        case 9: { return "transform"; };
        case 10: { return "float_32"; };
        case 11: { return "int_8"; };
        case 12: { return "uint_8"; };
        case 13: { return "binormal_int_8"; };
        case 14: { return "normal_int_8"; };
        case 15: { return "int_16"; };
        case 16: { return "uint_16"; };
        case 17: { return "binormal_int_16"; };
        case 18: { return "normal_int_16"; };
        case 19: { return "int_32"; };
        case 20: { return "uint_32"; };
        case 21: { return "float16"; };
        case 22: { return "empty"; };
        case 0xffffffff: { return "invalid"; };
        default: { 
            throw new Error(`Invalid field type ID[${typeID}]`); 
        }
    };

};

const getElementSize = function (definition) {

    switch (definition.type) {

        case "inline": { return definition.definition.elementSize; };

        case "int_8":
        case "uint_8":
        case "binormal_int_8":
        case "normal_int_8": { return 1; };

        case "int_16":
        case "uint_16":
        case "binormal_int_16":
        case "normal_int_16": 
        case "float16": { return 2; };
        
        case "reference": 
        case "string":
        case "int_32":
        case "uint_32":
        case "float_32": { return 4; };

        case "reference_to_array":
        case "array_of_references":
        case "variant_reference": { return 8; };

        case "reference_to_variant_array": { return 12; };

        case "transform": { return 17 * 4; };

        case "none": 
        case "empty":
        case "invalid": 
        default: { throw new Error("Invalid type"); };

    };

};

const decompress = function (compression, compressedData, stop0, stop1, decompressedSize) {

    if (compression === 0) {
        return compressedData.slice(0);
    }

    const granny2Path = @path(entryPath, "data/gr2/granny2.exe");

    let inputFile = @.fs.tempFile();
    @.fs.writeFile.sync(inputFile, compressedData);

    let outputFile = @.fs.tempFile();

    let switches = [
        compression + "",
        stop0 + "",
        stop1 + "",
        decompressedSize + "",
        compressedData.length + "",
        inputFile,
        outputFile
    ];

    try {

        let spawned = @.task.execute.sync(granny2Path, switches, true);

        return @.fs.readFile.sync(outputFile);

    } finally {
        @.fs.deleteFile(inputFile).finished(() => {});
        @.fs.deleteFile(outputFile).finished(() => {});
    }


};

const resolveRelocation = function (sections, index, offset) {

    let section = sections[index];
    if (section.relocations[offset]) {
        let reference = section.relocations[offset];
        index = reference.section;
        offset = reference.offset;
        section = sections[index];
    } else {
        offset = section.data.readUInt32LE(offset);
        if (offset === 0) {
            return;
        }
    }

    return {
        "section": index, 
        "offset": offset
    };

};

const readMagic = function (reader) {

    let magic = {
        "signature": reader.readBLOB(16),
        "headerSize": reader.readUInt32(),
        "headerFormat": reader.readUInt32(),
        "reserved": reader.readUInt32(),
        "reserved2": reader.readUInt32(),
    };

    switch (magic.signature.toString("hex")) {
        case "b867b0caf86db10f84728c7e5e19001e": {
            magic.endian = "little";
            magic.unitSize = 32;
            magic.version = 6;
            break;
        };
        default: {
            throw new Error("GR2 file signature not supported");
        }
    }

    if (magic.headerFormat !== 0) {
        throw new Error("GR2 compressed file is not supported");
    }

    return magic;

};

const readHeader = function (reader, magic) {

    let header = {
        "version": reader.readUInt32(),
        "fileSize": reader.readUInt32(),
        "crc": reader.readUInt32(),
        "sectionOffset": reader.readUInt32(),
        "sectionCount": reader.readUInt32(),
        "rootType": {
            "section": reader.readUInt32(),
            "offset": reader.readUInt32()
        },
        "rootData": {
            "section": reader.readUInt32(),
            "offset": reader.readUInt32()
        },
        "tag": reader.readUInt32(),
        "extraTags": [
            reader.readUInt32(), reader.readUInt32(),
            reader.readUInt32(), reader.readUInt32()
        ]
    };

    if (header.version !== magic.version) {
        throw new Error("Incorrect version of file");
    }
    if (header.fileSize !== reader.buffer.length) {
        throw new Error("Incorrect file size");
    }
    // check CRC

    return header;

};

const readSectionHeader = function (reader) {

    let header = {
        "compression": reader.readUInt32(),
        "offsetInFile": reader.readUInt32(),
        "compressedSize": reader.readUInt32(),
        "uncompressedSize": reader.readUInt32(),
        "alignment": reader.readUInt32(),
        "first16Bit": reader.readUInt32(),
        "first8Bit": reader.readUInt32(),
        "relocationsOffset": reader.readUInt32(),
        "relocationsCount": reader.readUInt32(),
        "mixedMarshallingDataOffset": reader.readUInt32(),
        "mixedMarshallingDataCount": reader.readUInt32(),
    }

    return header;

};

const readReference = function (sections, index, offset, parser, caches) {

    let resolved = resolveRelocation(sections, index, offset);
    if (!resolved) {
        return;
    }

    let cacheID = `${resolved.section}-${resolved.offset}`;
    if (caches[cacheID]) {
        return caches[cacheID][0];    
    }

    let section = sections[resolved.section];

    let target = parser(sections, resolved.section, resolved.offset, caches);

    caches[cacheID] = [target];

    return target;

};

const readDefinition = function (sections, index, offset, caches) {

    let cacheID = `${index}-${offset}`;
    if (caches[cacheID]) {
        return caches[cacheID][0];    
    }

    let section = sections[index];

    let reader = new Reader(section.data).snapshot(offset);

    const definition = { 
        "fields": []
    };

    caches[cacheID] = [definition];

    let size = 0;

    let finished = false;
    while (!finished) {
        let type = getFieldType(reader.readUInt32());
        if (type !== "none") {

            let name = readStringReference(sections, index, reader.offset, caches);
            reader.readUInt32(); // increase the offset
            let fieldDefinition = undefined;

            switch (type) {
                case "inline":
                case "reference":
                case "reference_to_array":
                case "array_of_references": {
                    fieldDefinition = readDefinitionReference(sections, index, reader.offset, caches);
                    break;
                };
                case "none": 
                case "string":
                case "transform": 
                case "variant_reference":
                case "reference_to_variant_array": 
                case "float_32":
                case "int_8":
                case "uint_8":
                case "binormal_int_8":
                case "normal_int_8":
                case "int_16":
                case "uint_16":
                case "binormal_int_16":
                case "normal_int_16":
                case "int_32":
                case "uint_32":
                case "float16":
                case "empty":
                case "invalid": {
                    // just ignore the definition
                    break;
                };
                default: { 
                    throw new Error(`Invalid field type ID[${typeID}]`); 
                }
            };
            reader.readUInt32(); // increase the offset

            let field = {
                "type": type,
                "name": name,
                "definition": fieldDefinition,
                "elementsCount": reader.readUInt32(),
                "extra": [ reader.readUInt32(),reader.readUInt32(), reader.readUInt32() ],
                "unknown": reader.readUInt32()
            };

            if (field.elementsCount > 0) {
                size += field.elementsCount * getElementSize(field);
            } else {
                size += getElementSize(field);
            }

            definition.fields.push(field);

        } else {
            finished = true;
        }
    }

    definition.elementSize = size;

    return definition;

};

const readDefinitionReference = function (sections, index, offset, caches) {

    return readReference(sections, index, offset, (sections, index, offset, caches) => {

        return readDefinition(sections, index, offset, caches);

    }, caches);

};

const readStructure = function (sections, index, offset, caches, definition, inline) {

    let cacheID = `${index}-${offset}`;
    if ((!inline) && caches[cacheID]) {
        return caches[cacheID][0];
    }

    let structure = {};

    if (!inline) {
        caches[cacheID] = [structure];
    }

    let fieldOffset = offset;

    for (let field of definition.fields) {
        structure[field.name] = readData(sections, index, fieldOffset, caches, field);
        if (field.elementsCount > 0) {
            fieldOffset += getElementSize(field) * field.elementsCount;
        } else {
            fieldOffset += getElementSize(field);
        }
    }

    return structure;

};

const readStringReference = function (sections, index, offset, caches) {

    return readReference(sections, index, offset, (sections, index, offset, caches) => {

        return new Reader(sections[index].data).snapshot(offset).readAutostring();

    }, caches);

};

const readStructureReference = function (sections, index, offset, caches, definition) {

    return readReference(sections, index, offset, (sections, index, offset, caches) => {

        return readStructure(sections, index, offset, caches, definition, false);

    }, caches);

};

const readArrayReference = function (sections, index, offset, caches, definition) {

    let reader = new Reader(sections[index].data).snapshot(offset);

    let size = reader.readUInt32();

    return readReference(sections, index, reader.offset, (sections, index, offset, caches) => {

        let result = [];

        let elementOffset = offset;

        for (let looper = 0; looper < size; ++looper) {
            let structure = readStructure(sections, index, elementOffset, caches, definition.definition, false);
            result.push(structure);
            // Here is the structure size, not the reference
            elementOffset += definition.definition.elementSize;
        }

        return result;

    }, caches);
    
};

const readArrayOfReferences = function (sections, index, offset, caches, definition) {

    let reader = new Reader(sections[index].data).snapshot(offset);

    let size = reader.readUInt32();

    return readReference(sections, index, reader.offset, (sections, index, offset, caches) => {

        let result = [];

        let elementOffset = offset;

        for (let looper = 0; looper < size; ++looper) {
            result.push(readStructureReference(sections, index, elementOffset, caches, definition.definition, false));
            elementOffset += 4;//getElementSize(definition); 
        }

        return result;

    }, caches);
    
};

const readTransform = function (sections, index, offset, caches) {

    let cacheID = `${index}-${offset}`;
    if (caches[cacheID]) {
        return caches[cacheID][0];
    }

    let result = {};

    caches[cacheID] = [result];

    let reader = new Reader(sections[index].data).snapshot(offset);

    result.Flags = reader.readUInt32();
    result.Translations = [
        reader.readFloat32(), reader.readFloat32(), reader.readFloat32()
    ];

    result.Quantinum = [
        reader.readFloat32(), reader.readFloat32(), 
        reader.readFloat32(), reader.readFloat32()
    ];

    result.Scales = [
        [reader.readFloat32(), reader.readFloat32(), reader.readFloat32()],
        [reader.readFloat32(), reader.readFloat32(), reader.readFloat32()],
        [reader.readFloat32(), reader.readFloat32(), reader.readFloat32()]
    ];

    return result;

};

const readData = function (sections, index, offset, caches, definition) {

    if (definition.elementsCount === 0) {
        return readDatum(sections, index, offset, caches, definition);
    }

    let elementOffset = offset;

    let result = [];
    for (let looper = 0; looper < definition.elementsCount; ++looper) {
        result.push(readDatum(sections, index, elementOffset, caches, definition));
        elementOffset += getElementSize(definition);
    }

    return result;

};

const readDatum = function (sections, index, offset, caches, definition) {

    switch (definition.type) {

        case "inline": {
            return readStructure(sections, index, offset, caches, definition.definition, true);
        };

        case "reference": {
            return readStructureReference(sections, index, offset, caches, definition.definition);
        };

        case "variant_reference": {
            let variantDefinition = readDefinitionReference(sections, index, offset, caches);
            return readStructureReference(sections, index, offset + 4, caches, variantDefinition);
        };

        case "array_of_references": {
            return readArrayOfReferences(sections, index, offset, caches, definition);
        };

        case "reference_to_array": 
        case "reference_to_variant_array": {

            let newOffset = offset;

            let elementDefinition = definition;
            if (definition.type === "reference_to_variant_array") {
                elementDefinition = readDefinitionReference(sections, index, newOffset, caches); 
                newOffset += 4;
            }

            return readArrayReference(sections, index, newOffset, caches, elementDefinition);

        };

        case "string": {
            return readStringReference(sections, index, offset, caches);
        };

        case "transform": {
            return readTransform(sections, index, offset, caches);
        };

        case "float_16": {
            return new Reader(sections[index].data).snapshot(offset).readFloat16();
        };

        case "float_32": {
            return new Reader(sections[index].data).snapshot(offset).readFloat32();
        };

        case "int_8": 
        case "binormal_int_8": {
            return new Reader(sections[index].data).snapshot(offset).readInt8();
        };

        case "uint_8": 
        case "normal_int_8": {
            return new Reader(sections[index].data).snapshot(offset).readUInt8();
        };

        case "int_16": 
        case "binormal_int_16": {
            return new Reader(sections[index].data).snapshot(offset).readInt16();
        };

        case "uint_16": 
        case "normal_int_16": {
            return new Reader(sections[index].data).snapshot(offset).readUInt16();
        };

        case "int_32": {
            return new Reader(sections[index].data).snapshot(offset).readInt32();
        };

        case "uint_32": {
            return new Reader(sections[index].data).snapshot(offset).readUInt32();
        };

        default: {
            throw new Error(`Unhandled type ${definition.type}`);
        };

    }

};

const GR2 = function GR2(content) {

    let reader = new Reader(content);

    this.magic = readMagic(reader);
    this.header = readHeader(reader, this.magic);

    this.caches = Object.create(null);

    this.sections = [];
    for (let looper = 0; looper < this.header.sectionCount; ++looper) {

        let header = readSectionHeader(reader);

        let input = undefined;
        if (header.compressedSize > 0) {
            input = content.slice(header.offsetInFile, 
                                  header.offsetInFile + header.compressedSize);
        }

        let output = undefined;
        if (input) {
            output = decompress(header.compression, input,
                header.first16Bit, header.first8Bit, 
                header.uncompressedSize);
        }

        let relocations = Object.create(null);
        if (header.relocationsCount > 0) {
            let relocationsReader = reader.snapshot(header.relocationsOffset);
            for (let looper2 = 0; looper2 < header.relocationsCount; ++looper2) {
                let offsetInSection = relocationsReader.readUInt32();
                relocations[offsetInSection] = {
                    "section": relocationsReader.readUInt32(),
                    "offset": relocationsReader.readUInt32(),
                };
            }
        }

        this.sections.push({
            "header": header,
            "data": output,
            "relocations": relocations
        });

    }

    let rootDefinition = readDefinition(this.sections, this.header.rootType.section, this.header.rootType.offset, this.caches);

    this.root = readStructure(
        this.sections, 
        this.header.rootData.section, 
        this.header.rootData.offset, 
        this.caches,
        rootDefinition, 
        true
    );

};

module.exports.GR2 = GR2;

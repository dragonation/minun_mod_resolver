const Info = function Info(reader) {

    this.length = reader.end - reader.index;

    this.camera = [
        reader.readUint32(),
        reader.readUint32(),
        reader.readUint32()];

    this.sizeBase = reader.readUint32();

    this.boundingBox = {
        "min": [reader.readFloat32(), reader.readFloat32(), reader.readFloat32()],
        "max": [reader.readFloat32(), reader.readFloat32(), reader.readFloat32()],
    };

    this.extraScale = reader.readFloat32();

    this.imageOffset = [reader.readFloat32(), reader.readFloat32()];

    this.unknown = [reader.readFloat32(), reader.readFloat32()];

    this.imageSize = [reader.readUint16(), reader.readUint16()];

    this.extras = [

        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),

        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),

        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),

        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),
        reader.readUint16(),

    ];

};

module.exports = Info;

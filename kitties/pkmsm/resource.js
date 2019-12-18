const Resource = function Resource(reader) {

    this.data = [];

    while (reader.index < reader.end) {
        this.data.push(reader.readUint8());
    }

};

module.exports = Resource;

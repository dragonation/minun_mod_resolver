const { Reader } = require("./reader.js");

const readSize = function (reader) {
    if (reader.snapshot().readUInt8() % 2 === 0) {
        return reader.readUInt8() >> 1;
    } else {
        return reader.readUInt32() >> 1;
    }
};

const readRecord = function (reader) {

    let record = {
        "flag": reader.readUInt8(),
        "size": readSize(reader)
    };

    if (record.size > 0) {
        if (record.size + reader.offset > reader.buffer.length) {
            throw new Error("Data overflow");
        }
        record.data = reader.readBLOB(record.size);
    }

    return record;

};

const readRecords = function (data) {

    let records = [];

    let reader = new Reader(data);
    while (reader.offset < data.length) {
        records.push(readRecord(reader));
    }

    return records;

};

const digRecord = function (record) {

    record.data = readRecords(record.data);

};

module.exports.digRecord = digRecord;
module.exports.readRecords = readRecords;

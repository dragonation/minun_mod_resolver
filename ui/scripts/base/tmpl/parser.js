const parsers = Object.create(null);

parsers["text/plain"] = require("./parser/text_plain.js");

module.exports.parsers = parsers;

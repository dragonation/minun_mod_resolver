if (__filename.split("/").slice(-1)[0] === "jquery.js") {
    global.$ = require("./jquery/jquery-3.4.1.js");
} else {
    global.$ = module.exports;
    module.exports = {};
}

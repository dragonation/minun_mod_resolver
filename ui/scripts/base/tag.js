require("./tag/foundation.js");
require("./tag/css.js");
require("./tag/html.js");
require("./tag/logical.js");
require("./tag/tag.js");

$.ui = {};

for (let meta of $.metas("tag", true)) {
    let prefix = meta.prefix;
    if (!prefix) { prefix = ""; }
    $.dom.registerTagTemplate(prefix, meta.template);
}

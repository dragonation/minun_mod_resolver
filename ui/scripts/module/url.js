(() => {

    const Module = require("module");

    const punycode = require("punycode");

    Module.register("url", {
        "URL": global.URL,
        "URLSearchParams": global.URLSearchParams,
        "domainToASCII": function (domain) {
            return punycode.toASCII(domain);
        },
        "domainToUnicode": function (domain) {
            return punycode.toUnicode(domain);
        },
        "format": function (url, options) {
            return url.toString();
        }
    });

})();
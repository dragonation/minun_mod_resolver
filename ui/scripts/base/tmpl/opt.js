const mergeOptions = function (options) {

    if (typeof options === "string") {
        options = { "parser": options };
    }

    if (!options) {
        options = {};
    }

    options = Object.assign({}, options);

    if (!options.parser) {
        options.parser = "text/plain";
    }

    if (!options.functors) {
        options.functors = {};
    }

    for (let looper = 1; looper < arguments.length; ++looper) {
        if (arguments[looper].parser) {
            options.parser = arguments[looper].parser;
        }
        if (arguments[looper].functors) {
            for (let key in arguments[looper].functors) {
                options.functors[key] = arguments[looper].functors[key];
            }
        }

    }

    return options;

};

module.exports.mergeOptions = mergeOptions;

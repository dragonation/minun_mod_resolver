const functors = Object.create(null);

functors["mix"] = function (template, call, parameters, options, object, object2) {
    if (!object) { object = {}; }
    if (!object2) { object2 = {}; }
    return Object.assign({}, object, object2);
};
functors["mix"].jitTemplates = ["Object.assign({}, ${arg(1)}, ${arg(2)})"];

functors["via"] = function (template, call, parameters, options, object, path) {

    var value = object;

    path.split(".").filter(function (key) {
        return (key.length > 0)
    }).forEach(function (key) {
        if ((value !== null) && (value != undefined)) {
            value = value[key];
        }
    });

    return value;
};
functors["via"].noExtraDependencies = true;

functors["keys"] = function (template, call, parameters, options, object) {

    if (!object) {
        return [];
    }

    return Object.keys(object);

};
functors["keys"].jitTemplates = ["Object.keys(${arg(1)})"];

functors["values"] = function (template, call, parameters, options, object) {

    if (!object) {
        return [];
    }

    var list = [];

    for (var key of Object.keys(object)) {
        if (list.indexOf(object[key]) === -1) {
            list.push(object[key]);
        }
    }

    return list;

};

module.exports.functors = functors;

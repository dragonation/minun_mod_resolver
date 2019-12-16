const functors = Object.create(null);

[
    "./func/array.js",
    "./func/date.js",
    "./func/engine.js",
    "./func/eval.js",
    "./func/json.js",
    "./func/logic.js",
    "./func/math.js",
    "./func/num.js",
    "./func/obj.js",
    "./func/str.js",
    "./func/type.js",
].forEach((path) => {
    Object.assign(functors, require(path).functors);
});

module.exports.functors = functors;

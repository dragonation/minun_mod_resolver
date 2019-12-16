const functors = Object.create(null);

functors["string"] = function (template, call, parameters, options) {

    var callArguments = Array.prototype.slice.call(arguments, 4);

    return String.fromCodePoint.apply(String, callArguments);

};
functors["string"].noExtraDependencies = true;
functors["string"].jitTemplates = ["String.fromCodePoint(${join(argv(), ',')})"];

functors["text"] = function (template, call, parameters, options, number, base) {

    return number.toString(base);

};
functors["text"].noExtraDependencies = true;
functors["text"].jitTemplates = ["(${arg(1)}).toString(${arg(2)})"];

functors["code"] = function (template, call, parameters, options, string) {

    var result = [];

    var looper = 0;
    while (looper < string.length) {

        result.push(string.codePointAt(looper));

        ++looper;
    }

    return result;

};
functors["code"].noExtraDependencies = true;

functors["lowerCase"] = function (template, call, parameters, options, text) {
    return text.toLocaleLowerCase();
};
functors["lowerCase"].noExtraDependencies = true;
functors["lowerCase"].jitTemplates = ["(${arg(1)}).toLocaleLowerCase()"];

functors["upperCase"] = function (template, call, parameters, options, text) {
    return text.toLocaleUpperCase();
};
functors["upperCase"].noExtraDependencies = true;
functors["upperCase"].jitTemplates = ["(${arg(1)}).toLocaleUpperCase()"];

functors["capitalCase"] = function (template, call, parameters, options, text, startWithLowerCase) {

    if (!text.length) {
        return "";
    }

    text = text.replace(/[\-_\s\.]./g, function (text) {
        if (/[\-_\s\.]/g.test(text[1])) {
            return "";
        } else {
            return text[1].toLocaleUpperCase();
        }
    });

    if (startWithLowerCase) {
        return text;
    } else {
        return text[0].toLocaleUpperCase() + text.slice(1);
    }

};
functors["capitalCase"].noExtraDependencies = true;

functors["leftPad"] = function (template, call, parameters, options, value, count, char) {

    if (!char) {
        char = "0";
    }

    let group = char + char + char + char + char + char + char + char;

    value = value + "";
    while (value.length < count) {
        value = group + value;
    }

    return value.slice(-count);

};
functors["leftPad"].noExtraDependencies = true;

functors["rightPad"] = function (template, call, parameters, options, value, count, char) {

    if (!char) {
        char = "0";
    }

    let group = char + char + char + char + char + char + char + char;

    value = value + "";
    while (value.length < count) {
        value = value + group;
    }

    return value.slice(-count);

};

functors["rightPad"].noExtraDependencies = true;

functors["replace"] = function (template, call, parameters, options, text, searching, replacement, start) {
    return text.replace(searching, replacement, start);
};
functors["replace"].noExtraDependencies = true;
functors["replace"].jitTemplates = ["(${arg(1)}).replace(${arg(2)}, ${arg(3)})"];

functors["match"] = function (template, call, parameters, options, text, expression) {
    return expression.test(text);
};
functors["match"].noExtraDependencies = true;
functors["match"].jitTemplates = ["(${arg(2)}).test(${arg(1)})"];

functors["trim"] = function (template, call, parameters, options, text) {
    return text.trim();
};
functors["trim"].noExtraDependencies = true;
functors["trim"].jitTemplates = ["(${arg(1)}).trim()"];

functors["split"] = function (template, call, parameters, options, text, delimiter) {
    return text.split(delimiter);
};
functors["split"].noExtraDependencies = true;
functors["split"].jitTemplates = ["(${arg(1)}).split(${arg(2)})"];

functors["join"] = function (template, call, parameters, options, array, delimiter) {

    if (arguments.length === 6) {
        return array.join(delimiter);
    } else {
        return array.join();
    }

};
functors["join"].noExtraDependencies = true;
functors["join"].jitTemplates = ["(${arg(1)}).join(${argc() > 1 ? arg(2) : ''})"];

module.exports.functors = functors;

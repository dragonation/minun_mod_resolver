const functors = Object.create(null);

const formatDate = function (date, format, utc) {

    var toString = function (number, length) {

        number = number + "";
        while (number.length < length) {
            number = "0" + number;
        }

        return number;
    };

    if (!date) {
        date = new Date();
    }

    if (!format) {
        format = "YYYY-MM-DD hh:mm:ss.SSS";
    }

    var result = [];

    var looper = 0;
    while (looper < format.length) {
        switch (format[looper]) {

            case "Y": {
                if (format[looper + 1] == "Y") {
                    if ((format[looper + 2] == "Y") && (format[looper + 3] == "Y")) {
                        result.push(("000" + (utc ? date.getUTCFullYear() : date.getFullYear())).slice(-4));
                        looper += 4;
                    } else {
                        result.push(("0" + ((utc ? date.getUTCFullYear() : date.getFullYear()) % 100)).slice(-2));
                        looper += 2;
                    }
                } else {
                    result.push((utc ? date.getUTCFullYear() : date.getFullYear()) + "");
                    ++looper;
                }
                break;
            };

            case "M": {
                if (format[looper + 1] == "M") {
                    result.push(("0" + ((utc ? date.getUTCMonth() : date.getMonth()) + 1)).slice(-2));
                    looper += 2;
                } else {
                    result.push(((utc ? date.getUTCMonth() : date.getMonth()) + 1) + "");
                    ++looper;
                }
                break;
            };

            case "D": {
                if (format[looper + 1] == "D") {
                    result.push(("0" + (utc ? date.getUTCDate() : date.getDate())).slice(-2));
                    looper += 2;
                } else {
                    result.push((utc ? date.getUTCDate() : date.getDate()) + "");
                    ++looper;
                }
                break;
            };

            case "h": {
                if (format[looper + 1] == "h") {
                    result.push(("0" + (utc ? date.getUTCHours() : date.getHours())).slice(-2));
                    looper += 2;
                } else {
                    result.push((utc ? date.getUTCHours() : date.getHours()) + "");
                    ++looper;
                }
                break;
            };

            case "m": {
                if (format[looper + 1] == "m") {
                    result.push(("0" + (utc ? date.getUTCMinutes() : date.getMinutes())).slice(-2));
                    looper += 2;
                } else {
                    result.push((utc ? date.getUTCMinutes() : date.getMinutes()) + "");
                    ++looper;
                }
                break;
            };

            case "s": {
                if (format[looper + 1] == "s") {
                    result.push(("0" + (utc ? date.getUTCSeconds() : date.getSeconds())).slice(-2));
                    looper += 2;
                } else {
                    result.push((utc ? date.getUTCSeconds() : date.getSeconds()) + "");
                    ++looper;
                }
                break;
            };

            case "S": {
                if ((format[looper + 1] == "S") && (format[looper + 2] == "S")) {
                    result.push(("00" + (utc ? date.getUTCMilliseconds() : date.getMilliseconds())).slice(-3));
                    looper += 3;
                } else {
                    result.push((utc ? date.getUTCMilliseconds() : date.getMilliseconds()) + "");
                    ++looper;
                }
                break;
            };

            case "\"":
            case "'": {
                var offset = 1;
                while ((format[looper + offset] != format[looper]) &&
                    (looper + offset < format.length)) {
                    if (format[looper + offset] == "\\") {
                        result.push(format[looper + offset + 1]);
                        offset += 2;
                    } else {
                        result.push(format[looper + offset]);
                        ++offset;
                    }
                }
                looper += offset + 1;
                break;
            };

            default: {
                result.push(format[looper]);
                ++looper;
                break;
            }

        }
    }

    return result.join("");

};

const convertorDate = function (value, options) {

    if ((value instanceof Date) && (!isNaN(value.getTime()))) {
        return value;
    }

    if (typeof value === "string") {
        value = value.trim();
        if (/^(\-?)[0-9]+\.[0-9]+$/.test(value)) {
            return convertorDate(parseFloat(value), options);
        } else if (/^(\-?)[0-9]+$/.test(value)) {
            return convertorDate(parseInt(value), options);
        } else {
            let date = new Date(value);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
    }

    if (typeof value === "number") {
        if (Math.abs(value) <= 10000000000) { // unix epoch
            return new Date(value * 1000);
        } else { // js epoch
            return new Date(value);
        }
    }

    if (options && options.defaultValue) {
        return convertors["date"](options.defaultValue);
    }

};

functors["format"] = function (outerTemplate, call, parameters, options, template, date) {

    return formatDate(date, template);

};
functors["format"].noExtraDependencies = true;

functors["formatDate"] = function (outerTemplate, call, parameters, options, date, template, utc) {

    return formatDate(date, template, utc);

};
functors["formatDate"].noExtraDependencies = true;

functors["date"] = function (template, call, parameters, options, year, month, date, hours, minutes, seconds, milliseconds) {

    if (arguments.length == 4) {

        return new Date();

    } else if (arguments.length == 5) {

        let result = convertorDate(year);
        if (!result) {
            result = new Date(NaN);
        }

        return result;

    } else if (arguments.length == 7) {

        var result = new Date(year, month - 1, date);

        result.setFullYear(year);

        return result;

    } else if (arguments.length == 10) {

        var result = new Date(year, month - 1, date, hours, minutes, seconds);

        result.setFullYear(year);

        return result;

    } else if (arguments.length == 11) {

        var result = new Date(year, month - 1, date, hours, minutes, seconds, milliseconds);

        result.setFullYear(year);

        return result;

    } else {
        return null;
    }

};

functors["date"].resolveDependencies = function (arguments, options) {

    if (arguments.length === 0) {
        return ["*"];
    } else {
        let looper = 0;
        let result = {};
        while (looper < arguments.length) {
            let subresult = resolveDependencies(arguments[looper], options);
            if (subresult.indexOf("*") !== -1) {
                return ["*"];
            }
            let looper2 = 0;
            while (looper2 < subresult.length) {
                result[subresult[looper2]] = true;
            }
            ++looper;
        }
        return Object.keys(result);
    }

};

functors["timeUnit"] = function (template, call, parameters, options, date, unit) {

    switch (unit) {

        case "year": { return date.getFullYear(); };
        case "month": { return date.getMonth() + 1; };
        case "date": { return date.getDate(); };

        case "day": { return date.getDay(); };

        case "hour": { return date.getHours(); };
        case "minute": { return date.getMinutes(); };
        case "second": { return date.getSeconds(); };

        case "millisecond": {return date.getMilliseconds(); };

        case "timestamp": { return date.getTime() / 1000; };

        default: { return null; }

    }

};
functors["timeUnit"].noExtraDependencies = true;

module.exports.functors = functors;

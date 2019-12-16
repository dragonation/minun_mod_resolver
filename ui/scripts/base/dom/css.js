const path = require("path");

$.dom.wrapCSS = function (css, targetSelector, containerSelector, relatedPath) {

    let style = $("<style>").html(css);
    $("head").append(style);

    let rules = [];

    let looper = 0;
    while (looper < style[0].sheet.cssRules.length) {
        let rule = style[0].sheet.cssRules[looper];
        let selectorText = rule.selectorText;
        selectorText = selectorText.split(",").map((text) => {
            if (text.indexOf(targetSelector) !== -1) {
                text = text.replace(targetSelector, containerSelector);
            } else {
                text = containerSelector + " " + text;
            }
            return text;
        }).join(",");
        selectorText = selectorText.replace(/\s+/g, " ");
        rule.selectorText = selectorText;
        if (relatedPath) {
            let looper2 = 0;
            while (looper2 < rule.style.length) {
                let key = rule.style[looper2];
                let value = rule.style[key].trim();
                if (/^url\((.+)\)/.test(value)) {
                    let url = value.slice(4, -1);
                    if ((url[0] === "\"") || (url[0] === "'")) {
                        url = url.slice(1, -1);
                    }
                    if (url[0] !== '/') {
                        rule.style[key] = `url("${path.resolve(relatedPath, url)}")`;
                    }
                }
                ++looper2;
            }
        }
        rules.push(rule.cssText);
        ++looper;
    }

    style.html(rules.join("\n"));

    return style;

};

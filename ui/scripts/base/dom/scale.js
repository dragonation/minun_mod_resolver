var scale = 0;

if (window.matchMedia) {
    var looper = 0.01;
    while (looper < 8) {

        if (window.matchMedia("(min-resolution: " + looper + "dppx)").matches) {
            scale = looper;
        }

        if (window.matchMedia("(-webkit-min-resolution: " + looper + "dppx)").matches) {
            scale = looper;
        }

        if (window.matchMedia("(min-device-pixel-ratio: " + looper + ")").matches) {
            scale = looper;
        }

        if (window.matchMedia("(-webkit-min-device-pixel-ratio: " + looper + ")").matches) {
            scale = looper;
        }

        looper += 0.01;
    }
} else {
    scale = 1;
}

scale = parseFloat(scale.toFixed(5));

$.dom.getDevicePixels = function (pixel) {
    return pixel * scale;
};

$.dom.getDesignPixels = function (pixel) {
    return pixel / scale;
};

document.documentElement.style.setProperty("--ui-scale", scale);
document.documentElement.classList.add("ui-scaled");

const convert = (css) => {
    return css.replace(/([0-9\.]+)(px|pt|pc)/g, (value) => {
        return $.dom.getDesignPixels(parseFloat(value.slice(0, -2))) + value.slice(-2);
    });
};

Array.prototype.slice.call(document.querySelectorAll("style"), 0).forEach((style) => {
    style.innerText = convert(style.innerText);
});

Array.prototype.slice.call(document.querySelectorAll("link[rel='stylesheet']"), 0).forEach((link) => {
    let check = function () {
        if (link.sheet) {
            Array.prototype.slice.call(link.sheet.rules, 0).forEach((rule) => {
                let looper = 0;
                while (looper < rule.style.length) {
                    let name = rule.style[looper];
                    if ((name.indexOf("border") !== -1) && (name.indexOf("radius") === -1)) {
                        let from = rule.style.getPropertyValue(name);
                        let to = convert(from);
                        if (from !== to) {
                            rule.style.setProperty(name, to);
                        }
                    }
                    ++looper;
                }
            });
        } else {
            $.delay(10, check);
        }
    };
    check();
});

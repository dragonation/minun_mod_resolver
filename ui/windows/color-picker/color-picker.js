const convertHSV2HSL = function (h, s, v) {

    h /= 360;
    s /= 100;
    v /= 100;

    return [
        (h * 360) % 360, 
        100 * s * v / ((h = (2 - s) * v) < 1 ? h : 2 - h), 
        100 * h * 0.5
    ];

};

const convertHSL2HSV = function (h, s, l) {

    h /= 360;
    s /= 100;
    l /= 100;

    let t = s * (l < 0.5 ? l : 1 - l);

    return [
        (h * 360) % 360, 
        (l > 0 ? 2 * t / (l + t) : 0) * 100,
        (l + t) * 100
    ];

};

const convertHSL2RGB = function (h, s, l) {

    h /= 360;
    s /= 100;
    l /= 100;

    let r = l;
    let g = l; 
    let b = l;

    let v = (l <= 0.5) ? (l * (1.0 + s)) : (l + s - l * s);

    if (v > 0) {
        let m = l + l - v; 
        let sv = (v - m ) / v; 
        h *= 6.0; 
        let sextant = Math.floor(h); 
        let fract = h - sextant; 
        let vsf = v * sv * fract; 
        let mid1 = m + vsf; 
        let mid2 = v - vsf; 
        switch (sextant % 6) {
            case 0: { r = v; g = mid1; b = m; break; } 
            case 1: { r = mid2; g = v; b = m; break; } 
            case 2: { r = m; g = v; b = mid1; break; } 
            case 3: { r = m; g = mid2; b = v; break; } 
            case 4: { r = mid1; g = m; b = v; break; } 
            case 5: { r = v; g = m; b = mid2; break; }
        }
    }

    return [
        Math.round(r * 255), 
        Math.round(g * 255), 
        Math.round(b * 255)
    ];

};

const convertRGB2HSL = function (r, g, b) {

    r /= 255;
    g /= 255;
    b /= 255;

    let h = 0; 
    let s = 0; 
    let l = 0;

    let v = Math.max(r, g, b); 
    let m = Math.min(r, g, b); 

    l = (m + v) / 2.0; 
    if (l <= 0.0) {
        return [h * 360, s * 100, l * 100]; 
    }

    let vm = v - m; 
    s = vm; 
    if (s > 0.0) {
        s /= (l <= 0.5) ? (v + m ) : (2.0 - v - m) ; 
    } else {
        return [h * 360, s * 100, l * 100]; 
    } 

    let r2 = (v - r) / vm; 
    let g2 = (v - g) / vm; 
    let b2 = (v - b) / vm;

    if (r === v) {
        h = (g === m ? 5.0 + b2 : 1.0 - g2); 
    } else if (g === v) {
        h = (b === m ? 1.0 + r2 : 3.0 - b2); 
    } else {
        h = (r === m ? 3.0 + g2 : 5.0 - r2); 
    }

    h /= 6.0;

    return [h * 360, s * 100, l * 100];

};

const prepareHueCanvas = function (hueCanvas) {

    let hueContext = hueCanvas.getContext("2d");
    let width = parseInt($(hueCanvas).attr("width"));
    let height = parseInt($(hueCanvas).attr("height"));
    let radius = height / 2;
    for (let looper = 0; looper < 360; ++looper) {
        let hsl = convertHSV2HSL(looper, 100, 100);
        hueContext.fillStyle = `hsl(${hsl[0].toFixed(2)}, ${hsl[1].toFixed(2)}%, ${hsl[2].toFixed(2)}%)`;
        let from = Math.round(looper * (width - height) / 360 + radius);
        if (looper === 0) {
            from = 0;
        }
        let to = Math.round((looper + 1) * (width - height) / 360 + radius);
        if (looper === 359) {
            to = width;
        }
        hueContext.fillRect(from, 0, to - from, height);
    }

};

const updateAlphaCanvas = function (alphaCanvas, [h, s, v]) {

    let hsl = convertHSV2HSL(h, s, v);
    let rgb = convertHSL2RGB(hsl[0], hsl[1], hsl[2]);

    let alphaContext = alphaCanvas.getContext("2d");
    let width = parseInt($(alphaCanvas).attr("width"));
    let height = parseInt($(alphaCanvas).attr("height"));
    alphaContext.clearRect(0, 0, width, height);
    let radius = height / 2;
    for (let looper = 0; looper < 256; ++looper) {
        alphaContext.fillStyle = `rgba(${rgb[0].toFixed(2)}, ${rgb[1].toFixed(2)}, ${rgb[2].toFixed(2)}, ${looper / 255})`;
        let from = Math.round(looper * (width - height) / 255 + radius);
        if (looper === 0) {
            from = 0;
        }
        let to = Math.round((looper + 1) * (width - height) / 255 + radius);
        if (looper === 255) {
            to = width;
        }
        alphaContext.fillRect(from, 0, to - from, height);
    }

};

const updateHSVMap = function (hsvMapCanvas, hue) {

    let hsvMapContext = hsvMapCanvas.getContext("2d");
    let width = parseInt($(hsvMapCanvas).attr("width"));
    let height = parseInt($(hsvMapCanvas).attr("height"));

    let unit = 1 / 100;
    for (let s = 0; s <= 100; ++s) {
        for (let v = 100; v >= 0; --v) {
            let hsl = convertHSV2HSL(hue, s, v);
            hsvMapContext.fillStyle = `hsl(${hsl[0].toFixed(2)}, ${hsl[1].toFixed(2)}%, ${hsl[2].toFixed(2)}%)`;
            let from = [
                Math.round(s * width * unit), 
                Math.round((99 - v) * height * unit)
            ];
            let to = [
                Math.round((s + 1) * width * unit), 
                Math.round((100 - v) * height * unit)
            ];
            hsvMapContext.fillRect(
                from[0], from[1],
                to[0] - from[0], to[1] - from[1]);
        }
    }

};

const Window = function Window(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    this.filler.fill({
        "hue": 0,
        "saturate": 100,
        "value": 100,
        "alpha": 255
    });

    prepareHueCanvas(this.filler.query("#hue-bar")[0]);
    updateHSVMap(this.filler.query("#hsv-map")[0], this.filler.parameters.hue);
    updateAlphaCanvas(this.filler.query("#alpha-bar")[0], [
        this.filler.parameters.hue, 
        this.filler.parameters.saturate, 
        this.filler.parameters.value
    ]);

};

Window.prototype.setColor = function (color) {

    let hsl = convertRGB2HSL(color.r, color.g, color.b);
    let hsv = convertHSL2HSV(hsl[0], hsl[1], hsl[2]);

    this.filler.fill({
        "hue": hsv[0],
        "saturate": hsv[1],
        "value": hsv[2],
        "alpha": color.a
    });

    prepareHueCanvas(this.filler.query("#hue-bar")[0]);
    updateHSVMap(this.filler.query("#hsv-map")[0], this.filler.parameters.hue);
    updateAlphaCanvas(this.filler.query("#alpha-bar")[0], [
        this.filler.parameters.hue, 
        this.filler.parameters.saturate, 
        this.filler.parameters.value
    ]);

};

Window.prototype.callbackColor = function () {

    if (this.colorCallback) {

        let hsl = convertHSV2HSL(this.filler.parameters.hue, 
                                 this.filler.parameters.saturate, 
                                 this.filler.parameters.value);

        let rgb = convertHSL2RGB(hsl[0], hsl[1], hsl[2]);

        this.colorCallback({
            "r": rgb[0], 
            "g": rgb[1], 
            "b": rgb[2], 
            "a": this.filler.parameters.alpha
        });

    }

};

Window.functors = {
    "pickAlpha": function (event) {

        let updateAlpha = (event) => {

            let alphaBar = this.filler.query("#alpha-bar")[0];
            let { left, width, height } = alphaBar.getClientRects()[0];

            let alpha = ($.dom.getDevicePixels(event.pageX) - left - height / 2) / (width - height) * 255;
            if (alpha < 0) { alpha = 0; }
            if (alpha > 255) { alpha = 255; }

            alpha = Math.round(alpha);

            this.filler.fill({
                "alpha": alpha
            });

            this.callbackColor();

        };

        let onmousemove = (event) => {

            if (!(event.buttons & 1)) {
                $("body").off("mousemove", onmousemove);
                return;
            }

            updateAlpha(event);

        };

        $("body").on("mousemove", onmousemove);

        updateAlpha(event);

    },
    "pickHue": function (event) {

        let updateHue = (event) => {

            let hueBar = this.filler.query("#hue-bar")[0];
            let { left, width, height } = hueBar.getClientRects()[0];

            let hue = ($.dom.getDevicePixels(event.pageX) - left - height / 2) / (width - height) * 360;
            if (hue < 0) { hue = 0; }
            if (hue > 359) { hue = 359; }

            hue = Math.round(hue);

            this.filler.fill({
                "hue": hue
            });

            if (!this.hsvMapTimer) {
                this.hsvMapTimer = $.delay(100, () => {
                    updateHSVMap(this.filler.query("#hsv-map")[0], this.filler.parameters.hue);
                    updateAlphaCanvas(this.filler.query("#alpha-bar")[0], [
                        this.filler.parameters.hue, 
                        this.filler.parameters.saturate, 
                        this.filler.parameters.value
                    ]);
                    delete this.hsvMapTimer;
                });
            }

            this.callbackColor();

        };

        let onmousemove = (event) => {

            if (!(event.buttons & 1)) {
                $("body").off("mousemove", onmousemove);
                return;
            }

            updateHue(event);

        };

        $("body").on("mousemove", onmousemove);

        updateHue(event);

    },
    "pickSV": function (event) {

        let updateSV = (event) => {

            let hsvMap = this.filler.query("#hsv-map")[0];
            let { left, top, width, height } = hsvMap.getClientRects()[0];

            let s = ($.dom.getDevicePixels(event.pageX) - left) / width * 100;
            let v = ($.dom.getDevicePixels(event.pageY) - top) / height * 100;
            v = 100 - v;
            if (s < 0) { s = 0; }
            if (s >= 100) { s = 100; }
            if (v < 0) { v = 0; }
            if (v >= 100) { v = 100; }

            s = Math.round(s);
            v = Math.round(v);

            this.filler.fill({
                "saturate": s,
                "value": v,
            });

            if (!this.alphaTimer) {
                this.alphaTimer = $.delay(100, () => {
                    updateAlphaCanvas(this.filler.query("#alpha-bar")[0], [
                        this.filler.parameters.hue, 
                        this.filler.parameters.saturate, 
                        this.filler.parameters.value
                    ]);
                    delete this.alphaTimer;
                });
            }

            this.callbackColor();

        };

        let onmousemove = (event) => {

            if (!(event.buttons & 1)) {
                $("body").off("mousemove", onmousemove);
                return;
            }

            updateSV(event);

        };

        $("body").on("mousemove", onmousemove);

        updateSV(event);

    },
    "hsv2rgba": function (h, s, v, a) {
        let hsl = convertHSV2HSL(h, s, v);
        let rgb = convertHSL2RGB(hsl[0], hsl[1], hsl[2]);
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${a / 255})`;
    },
    "hsv2rgbaHash": function (h, s, v, a) {
        if (a === undefined) {
            a = 255;
        }
        let hsl = convertHSV2HSL(h, s, v);
        let rgb = convertHSL2RGB(hsl[0], hsl[1], hsl[2]);
        return `#${("0" + rgb[0].toString(16)).slice(-2)}${("0" + rgb[1].toString(16)).slice(-2)}${("0" + rgb[2].toString(16)).slice(-2)}${("0" + a.toString(16)).slice(-2)}`;
    }
};

module.exports.Window = Window;

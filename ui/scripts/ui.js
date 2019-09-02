$(function () {

	var scale = 0;

    if (window.matchMedia) {
        var looper = 0.01;
        while (looper < 8) {
        	if (window.matchMedia("(min-resolution: " + looper + "dppx)").matches) {
                scale = looper;
            }
            if (window.matchMedia("(min-device-pixel-ratio: " + looper + ")").matches) {
                scale = looper;
            }
            looper += 0.01;
        }
    } else {
        scale = 1;
    }

    scale = parseFloat(scale.toFixed(5));

    $("html").css({
    	"zoom": (1 / scale),
    	"--ui-scale": scale
    }).addClass("scale-" + Math.round(scale * 100));

});

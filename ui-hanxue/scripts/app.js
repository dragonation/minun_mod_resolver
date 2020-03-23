const App = function App(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

App.prototype.getNextFrameTopLeft = function (from, size) {

    let coast = $.dom.getDevicePixels(30);

    let diagram = this.filler.query("#diagram");

    let { scrollLeft, scrollTop, viewportLeft, viewportTop } = diagram[0];
    let { width, height } = diagram.css(["width", "height"]);
    width = parseFloat(width);
    height = parseFloat(height);

    let mins = [viewportLeft + scrollLeft, viewportTop + scrollTop];
    let maxes = [mins[0] + width, mins[1] + height];

    let children = diagram.children();
    if (children.length === 0) {
        return {
            "left": mins[0] + coast,
            "top": mins[1] + coast + $.dom.getDevicePixels(40)
        };
    }

    let frames = [];
    for (let looper = 0; looper < children.length; ++looper) {
        let node = children[looper];
        let zIndex = $(node).css("z-index");
        frames.push({
            "node": node,
            "index": looper,
            "z-index": zIndex
        });
    }
    frames.sort((a, b) => {
        if (a["z-index"] && b["z-index"]) {
            let result = parseInt(a["z-index"]) - parseInt(b["z-index"]);
            if (result) {
                return result;
            }
        }
        return a.index - b.index;
    });

    let topmost = $(frames[frames.length - 1].node);

    let frame = topmost.css(["left", "top", "width", "height"]);

    let suggested = {
        "left": parseFloat(frame.left) + parseFloat(frame.width) + $.dom.getDevicePixels(40),
        "top": parseFloat(frame.top),
    };

    return suggested;

};

App.prototype.loadModel = function (from) {

    let that = this;

    let input = $("<input>").attr({
        "type": "file"
    }).css({
        "display": "none"
    }).on("change", function (event) {

        let size = {
            "width": $.dom.getDevicePixels(240),
            "height": $.dom.getDevicePixels(240)
        };
        let position = that.getNextFrameTopLeft(from, size);

        let id = $.uuid(); 
        let frame = $("<ui-diagram-frame>").attr({
            "caption": id,
            "resizable": "yes",
            "wire-id": id
        }).css({
            "left": position.left + "px",
            "top": position.top + "px",
            "width": size.width + "px",
            "height": size.height + "px",
        });

        const width = 110.016;
        const depth = 61.885;
        const height = 125;

        frame[0].loadUI("/~hanxue/frames/print-preview/print-preview", {
            "device": {
                "width": width,
                "depth": depth,
                "height": height
            }
        });

        let file = this.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            let arrayBuffer = event.target.result;
            let dataView = new DataView(arrayBuffer);
            let count = dataView.getUint32(80, true);
            let offset = 84;
            let positions = new Float32Array(count * 3 * 3);
            let normals = new Float32Array(count * 3 * 3);
            let indices = new Uint32Array(count * 3);
            let mins = [Infinity, Infinity, Infinity];
            let maxes = [-Infinity, -Infinity, -Infinity];
            for (let looper = 0; looper < count; ++looper) {
                let normal = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                let v1 = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                let v2 = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                let v3 = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                offset += 2;
                let triangleNormal = new THREE.Vector3(v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]);
                triangleNormal.cross(new THREE.Vector3(v1[0] - v3[0], v1[1] - v3[1], v1[2] - v3[2]));
                if (normal[0] * triangleNormal[0] + normal[1] * triangleNormal[1] + normal[2] * triangleNormal[2] < 0) {
                    let v = v1; v1 = v3; v3 = v;
                }
                positions[looper * 9 + 0] = v1[0];
                positions[looper * 9 + 1] = v1[1];
                positions[looper * 9 + 2] = v1[2];
                positions[looper * 9 + 3] = v2[0];
                positions[looper * 9 + 4] = v2[1];
                positions[looper * 9 + 5] = v2[2];
                positions[looper * 9 + 6] = v3[0];
                positions[looper * 9 + 7] = v3[1];
                positions[looper * 9 + 8] = v3[2];
                normals[looper * 9 + 0] = normal[0];
                normals[looper * 9 + 1] = normal[1];
                normals[looper * 9 + 2] = normal[2];
                normals[looper * 9 + 3] = normal[0];
                normals[looper * 9 + 4] = normal[1];
                normals[looper * 9 + 5] = normal[2];
                normals[looper * 9 + 6] = normal[0];
                normals[looper * 9 + 7] = normal[1];
                normals[looper * 9 + 8] = normal[2];
                indices[looper * 3 + 0] = looper * 3 + 0;
                indices[looper * 3 + 1] = looper * 3 + 1;
                indices[looper * 3 + 2] = looper * 3 + 2;
                for (let looper2 = 0; looper2 < 3; ++looper2) {
                    let min = Math.min(v1[looper2], v2[looper2], v3[looper2]);
                    let max = Math.max(v1[looper2], v2[looper2], v3[looper2]);
                    if (mins[looper2] > min) { mins[looper2] = min; }
                    if (maxes[looper2] < max) { maxes[looper2] = max; }
                }
            }

            // we need adjust the model to make it render in the window correctly
            let size = Math.max((maxes[0] - mins[0]), 
                                (maxes[1] - mins[1]), 
                                (maxes[2] - mins[2]));

            // move to center
            // let translation = [(mins[0] + maxes[0]) * (-0.5), (mins[1] + maxes[1]) * (-0.5), -mins[2]];
            // scale to fit
            let scale = Math.min(
                width / (maxes[0] - mins[0]),
                height / (maxes[1] - mins[1]),
                depth / (maxes[2] - mins[2]),
            ) * 0.8;

            let translation =  [-mins[0], -mins[1], -mins[2]];
            let placement = [(width - scale * (maxes[0] - mins[0])) * 0.5, 0, (depth - scale * (maxes[2] - mins[2])) * 0.5];

            frame[0].frame.filler.fill({
                "camera": {
                    "position": [width / 2, height / 2, depth * 4],
                    "direction": [0, 0, -1]
                },
                "model": {
                    "translation": translation,
                    "scale": scale,
                    "rotation": ["X", 0],
                    "placement": {
                        "translation": placement
                    },
                    "vertices": positions,
                    "normals": normals,
                    "indices": indices 
                }
            });

        };

        reader.readAsArrayBuffer(file);

        that.filler.query("#diagram").append(frame);

        frame[0].bringToFirst();

    });

    $("body").append(input);

    input.click();

    input.detach();

};

App.prototype.title = "Hanxue - 3D Printer Helper";

App.functors = {
    "loadModel": function (from) {
        this.loadModel(from);
    }
};

module.exports.App = App;

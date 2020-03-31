const M3D = require("/scripts/m3d.js");

const App = function App(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

App.prototype.openModel = function (callback) {

    let that = this;

    let input = $("<input>").attr({
        "type": "file"
    }).css({
        "display": "none"
    }).on("change", function (event) {

        let file = this.files[0];
        if (!file) {
            callback(); return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {

            let arrayBuffer = event.target.result;
            let dataView = new DataView(arrayBuffer);

            let count = dataView.getUint32(80, true);
            let offset = 84;

            let triangles = [];

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
                let flag = dataView.getUint16(offset, true);
                let isBothSides = flag & 1 ? true : false;
                offset += 2;
                let triangleNormal = M3D.getTriangleNormal(v1, v2, v3);
                if (normal[0] * triangleNormal[0] + normal[1] * triangleNormal[1] + normal[2] * triangleNormal[2] < 0) {
                    let v = v1; v1 = v3; v3 = v;
                }
                triangles.push({
                    "bothSides": isBothSides,
                    "normal": normal,
                    "vertices": [v1, v2, v3],
                });
            }

            callback(M3D.abstractModel(triangles));

        };

        reader.readAsArrayBuffer(file);

    });

    $("body").append(input);

    input.click();

    input.detach();

};

App.prototype.getNextFrameTopLeft = function (from, size) {

    let coast = 30;

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
            "top": mins[1] + coast + 40
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
        "left": parseFloat(frame.left) + parseFloat(frame.width) + 40,
        "top": parseFloat(frame.top),
    };

    return suggested;

};

App.prototype.convertModelData = function (triangles) {

    let positions = new Float32Array(triangles.length * 3 * 3);
    let normals = new Float32Array(triangles.length * 3 * 3);
    let offsets = new Float32Array(triangles.length * 3 * 3);
    let indices = new Uint32Array(triangles.length * 3);

    for (let looper = 0; looper < triangles.length; ++looper) {
        positions[looper * 3 * 3 + 0] = triangles[looper].vertices[0][0];
        positions[looper * 3 * 3 + 1] = triangles[looper].vertices[0][1];
        positions[looper * 3 * 3 + 2] = triangles[looper].vertices[0][2];
        positions[looper * 3 * 3 + 3] = triangles[looper].vertices[1][0];
        positions[looper * 3 * 3 + 4] = triangles[looper].vertices[1][1];
        positions[looper * 3 * 3 + 5] = triangles[looper].vertices[1][2];
        positions[looper * 3 * 3 + 6] = triangles[looper].vertices[2][0];
        positions[looper * 3 * 3 + 7] = triangles[looper].vertices[2][1];
        positions[looper * 3 * 3 + 8] = triangles[looper].vertices[2][2];
        normals[looper * 3 * 3 + 0] = triangles[looper].normal[0];
        normals[looper * 3 * 3 + 1] = triangles[looper].normal[1];
        normals[looper * 3 * 3 + 2] = triangles[looper].normal[2];
        normals[looper * 3 * 3 + 3] = triangles[looper].normal[0];
        normals[looper * 3 * 3 + 4] = triangles[looper].normal[1];
        normals[looper * 3 * 3 + 5] = triangles[looper].normal[2];
        normals[looper * 3 * 3 + 6] = triangles[looper].normal[0];
        normals[looper * 3 * 3 + 7] = triangles[looper].normal[1];
        normals[looper * 3 * 3 + 8] = triangles[looper].normal[2];
        if (triangles[looper].offsets) {
            offsets[looper * 3 * 3 + 0] = triangles[looper].offsets[0][0];
            offsets[looper * 3 * 3 + 1] = triangles[looper].offsets[0][1];
            offsets[looper * 3 * 3 + 2] = triangles[looper].offsets[0][2];
            offsets[looper * 3 * 3 + 3] = triangles[looper].offsets[1][0];
            offsets[looper * 3 * 3 + 4] = triangles[looper].offsets[1][1];
            offsets[looper * 3 * 3 + 5] = triangles[looper].offsets[1][2];
            offsets[looper * 3 * 3 + 6] = triangles[looper].offsets[2][0];
            offsets[looper * 3 * 3 + 7] = triangles[looper].offsets[2][1];
            offsets[looper * 3 * 3 + 8] = triangles[looper].offsets[2][2];
        }
    }

    for (let looper = 0; looper < triangles.length * 3; ++looper) {
        indices[looper] = looper;
    }

    return {
        "positions": positions,
        "normals": normals,
        "offsets": offsets,
        "indices": indices
    };

};

App.prototype.loadModel = function (from) {

    this.openModel((model) => {

        if (!model) { return; }

        let maxSize = Math.max(model.bounds.maxes[0] - model.bounds.mins[0], 
                               model.bounds.maxes[1] - model.bounds.mins[1],
                               model.bounds.maxes[2] - model.bounds.mins[2]);
        let maxArea = maxSize * maxSize / 256;

        model = M3D.reduceBothSides(model);

        let groups = M3D.groupTriangles(model).map((group) => {
            group = M3D.autocloseGroup(group);
            let triangles = group.triangles;
            if (group.encloses) {
                triangles = triangles.concat(group.encloses);
            }
            group.tesselled = {};
            group.tesselled[0] = M3D.convertTrianglesForTessell(triangles);
            group.tesselled[1] = M3D.tessellTriangles(group.tesselled[0], 1, maxArea);
            group.tesselled[2] = M3D.tessellTriangles(group.tesselled[1], 1, maxArea);
            group.tesselled[3] = M3D.tessellTriangles(group.tesselled[2], 1, maxArea);
            let source = M3D.convertTrianglesFromTessell(group.tesselled[3]);
            group.printable = M3D.makeTrianglesPrintable(source, group["bothSides"]);
            // group.printable = M3D.makeTrianglesPrintable(source, true);
            return group;
        });

        let size = {
            "width": 240,
            "height": 240
        };
        let position = this.getNextFrameTopLeft(from, size);

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

        let scale = Math.min(
            width / (model.bounds.maxes[0] - model.bounds.mins[0]),
            height / (model.bounds.maxes[1] - model.bounds.mins[1]),
            depth / (model.bounds.maxes[2] - model.bounds.mins[2]),
        ) * 0.8;

        let translation =  [-model.bounds.mins[0], -model.bounds.mins[1], -model.bounds.mins[2]];

        let placement = [(width - scale * (model.bounds.maxes[0] - model.bounds.mins[0])) * 0.5, 
                         0, 
                         (depth - scale * (model.bounds.maxes[2] - model.bounds.mins[2])) * 0.5];

        frame[0].frame.filler.fill({
            "camera": {
                "position": [width / 2, (model.bounds.maxes[1] - model.bounds.mins[1]) / 2, depth * 4],
                "target": [width / 2, (model.bounds.maxes[1] - model.bounds.mins[1]) / 2, depth / 2],
            },
            "model": {
                "bounds": model.bounds,
                "translation": translation,
                "scale": scale,
                "rotation": ["X", 0],
                "placement": {
                    "scale": 1,
                    "rotation": ["X", 0],
                    "translation": placement
                },
                "groups": groups.map((group) => {
                    let triangles = group.printable;
                    return this.convertModelData(group.printable);
                })
            }
        });

        this.filler.query("#diagram").append(frame);

        frame[0].bringToFirst();

    });

};

App.prototype.title = "Hanxue - 3D Printer Helper";

App.functors = {
    "loadModel": function (from) {
        this.loadModel(from);
    }
};

module.exports.App = App;

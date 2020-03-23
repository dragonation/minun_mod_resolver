const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    let gridsVertices = new Float32Array(4 * 3);
    gridsVertices[0] = -5; gridsVertices[1] = 0; gridsVertices[2] = -5;
    gridsVertices[3] = -5; gridsVertices[4] = 0; gridsVertices[5] = 512;
    gridsVertices[6] = 512; gridsVertices[7] = 0; gridsVertices[8] = 512;
    gridsVertices[9] = 512; gridsVertices[10] = 0; gridsVertices[11] = -5;

    this.filler.fill({
        "hints": {
            "grids": {
                "vertices": gridsVertices,
                "indices": [0, 1, 2, 2, 3, 0]
            }
        }
    });

};

Frame.functors = {
    "sliceModels": function () {

        let size = {
            "width": $.dom.getDevicePixels(240),
            "height": $.dom.getDevicePixels(240)
        };
        let position = $.app(this.dom).getNextFrameTopLeft(this, size);

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

        frame[0].loadUI("/~hanxue/frames/slice-viewer/slice-viewer");

        frame[0].frame.filler.fill({
            "model": {
                "translation": this.filler.parameters.model.translation,
                "scale": this.filler.parameters.model.scale,
                "rotation": this.filler.parameters.model.rotation,
                "vertices": this.filler.parameters.model.vertices,
                "normals": this.filler.parameters.model.normals,
                "indices": this.filler.parameters.model.indices,
                "placement": {
                    "translation": this.filler.parameters.model.placement.translation
                }
            },
            "device": {
                "width": this.filler.parameters.device.width,
                "height": this.filler.parameters.device.height,
                "depth": this.filler.parameters.device.depth,
            }
        });

        $.app(this.dom).filler.query("#diagram").append(frame);

    }

};

module.exports.Frame = Frame;

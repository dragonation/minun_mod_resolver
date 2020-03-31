const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    let gridsVertices = new Float32Array(4 * 3);
    gridsVertices[0] = -5; gridsVertices[1] = 0; gridsVertices[2] = -5;
    gridsVertices[3] = -5; gridsVertices[4] = 0; gridsVertices[5] = 517;
    gridsVertices[6] = 517; gridsVertices[7] = 0; gridsVertices[8] = 517;
    gridsVertices[9] = 517; gridsVertices[10] = 0; gridsVertices[11] = -5;

    let columnsVertices = new Float32Array(8 * 3);
    columnsVertices[0] = 0.707; columnsVertices[1] = 0; columnsVertices[2] = -0.707;
    columnsVertices[3] = 0.707; columnsVertices[4] = 512; columnsVertices[5] = -0.707;
    columnsVertices[6] = -0.707; columnsVertices[7] = 512; columnsVertices[8] = 0.707;
    columnsVertices[9] = -0.707; columnsVertices[10] = 0; columnsVertices[11] = 0.707;
    columnsVertices[12] = 0.707; columnsVertices[13] = 0; columnsVertices[14] = 0.707;
    columnsVertices[15] = 0.707; columnsVertices[16] = 512; columnsVertices[17] = 0.707;
    columnsVertices[18] = -0.707; columnsVertices[19] = 512; columnsVertices[20] = -0.707;
    columnsVertices[21] = -0.707; columnsVertices[22] = 0; columnsVertices[23] = -0.707;

    let resolution = { "width": 1920, "height": 1080 };

    this.filler.fill({
        "slicing": 20,
        "hideAboveSlice": 1,
        "expand": 0.2,
        "resolution": resolution,
        "hints": {
            "grids": {
                "vertices": gridsVertices,
                "indices": [0, 1, 2, 2, 3, 0]
            },
            "columns": {
                "vertices": columnsVertices,
                "indices": [0, 1, 2, 2, 3, 0, 4, 5, 6, 6, 7, 4]
            }
        }
    });


    let m3dScene = this.filler.query("m3d-scene");
    m3dScene[0].m3dCustomRender = function (renderer, scene, camera) {

        if (!renderer.sliceTarget) {
            let target = $(renderer.m3dFromTagObject).find("#slicing-target")[0];
            if (target) {
                renderer.sliceTarget = target.m3dGetTarget();
            }
        }

        if (!renderer.sliceCamera) {
            let camera = $(renderer.m3dFromTagObject).find("#slicing-camera")[0];
            if (camera) {
                renderer.sliceCamera = camera.m3dGetCamera();
            }
        }

        renderer.setRenderTarget(renderer.sliceTarget);
        renderer.setClearColor(0x000000);
        renderer.setClearAlpha(1);
        renderer.clear();
        renderer.render(scene, renderer.sliceCamera);

        renderer.setRenderTarget(null);
        renderer.setClearColor(0xcccccc);
        renderer.setClearAlpha(1);
        renderer.clear();
        renderer.render(scene, camera); 

    };

    this.timer = $.timer(20, () => {

        let scale = this.filler.parameters.model.scale * this.filler.parameters.model.placement.scale;

        let slicing = this.filler.parameters.slicing + 0.03;
        let bounds = this.filler.parameters.model.bounds;
        if (slicing > (bounds.maxes[1] - bounds.mins[1]) * scale + 10) {
            slicing = 0;
        }

        this.filler.fill({
            "slicing": slicing
        });

    });

};

Frame.prototype.onClose = function () {

    this.timer.cancel();

};

Frame.functors = {
    "updateMeshForMouse": function (event) {

        if (!this.raycaster) {
            this.raycaster = new THREE.Raycaster();
        }
        if (!this.raycasterMouse) {
            this.raycasterMouse = new THREE.Vector2();
        }

        let size = $(this.dom).css(["width", "height"]);
        size.width = parseFloat(size.width);
        size.height = parseFloat(size.height);

        let rect = this.dom.getClientRects()[0];

        this.raycasterMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.raycasterMouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;

        let meshes = [];
        for (let dom of this.filler.query("m3d-mesh.mesh")) {
            let mesh = dom.m3dGetObject();
            if (mesh) {
                meshes.push(mesh);
            }
        }

        this.raycaster.setFromCamera(this.raycasterMouse, this.filler.query("m3d-scene")[0].m3dCamera);

        let intersects = this.raycaster.intersectObjects(meshes).sort((a, b) => a.distance - b.distance);

        for (let mesh of meshes) {
            mesh.material.uniforms.selected.value = (intersects[0] && (intersects[0].object === mesh)) ? 1 : 0;
        }

    },
    "sliceModels": function () {

        // let resolution = {
        //     "width": 1920,
        //     "height": 1080
        // };

        // let size = {
        //     "width": resolution.width / 4,
        //     "height": resolution.height / 4
        // };
        // let position = $.app(this.dom).getNextFrameTopLeft(this, size);

        // let id = $.uuid(); 
        // let frame = $("<ui-diagram-frame>").attr({
        //     "caption": id,
        //     "resizable": "yes",
        //     "wire-id": id
        // }).css({
        //     "left": position.left + "px",
        //     "top": position.top + "px",
        //     "width": size.width + "px",
        //     "height": size.height + "px",
        // });

        // frame[0].loadUI("/~hanxue/frames/slice-viewer/slice-viewer");

        // let scale = resolution.width / this.filler.parameters.device.width;

        // frame[0].frame.filler.fill({
        //     "model": {
        //         "translation": this.filler.parameters.model.translation,
        //         "scale": this.filler.parameters.model.scale * scale,
        //         "rotation": this.filler.parameters.model.rotation,
        //         "vertices": this.filler.parameters.model.vertices,
        //         "normals": this.filler.parameters.model.normals,
        //         "offsets": this.filler.parameters.model.offsets,
        //         "indices": this.filler.parameters.model.indices,
        //         "placement": {
        //             "scale": 1,
        //             "translation": this.filler.parameters.model.placement.translation.map((x) => x * scale)
        //         }
        //     },
        //     "device": {
        //         "resolution": resolution,
        //         "width": this.filler.parameters.device.width,
        //         "height": this.filler.parameters.device.height,
        //         "depth": this.filler.parameters.device.depth,
        //     }
        // });

        // $.app(this.dom).filler.query("#diagram").append(frame);

    }

};

module.exports.Frame = Frame;

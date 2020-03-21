const THREE = require("/scripts/three.js");
const APNGEncoder = require("/scripts/apng.js");

const LAYERS = 3;

const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    this.resizeObserver = new ResizeObserver((entries) => {

        let { width, height } = $(dom).css([ "width", "height" ]);

        width = parseInt(width);
        height = parseInt(height);

        this.toastMessage(`${width} × ${height}`);

        let originSize = $.local["pkmsm.model-viewer.size"];
        if ((!originSize) || 
            (originSize[0] !== width) || (originSize[1] !== height)) {
            $.local["pkmsm.model-viewer.size"] = [width, height];
        }

    });
    this.resizeObserver.observe(this.dom);

    this.animationListeners = [];

    let m3dScene = this.filler.query("m3d-scene");

    let backgroundRGBA = { "r": 1, "g": 1, "b": 1, "a": 1 };
    let backgroundColor = $.local["pkmsm.model-viewer.background-color"];
    if (backgroundColor) {
        let r = ("0" + backgroundColor.r.toString(16)).slice(-2);
        let g = ("0" + backgroundColor.g.toString(16)).slice(-2);
        let b = ("0" + backgroundColor.b.toString(16)).slice(-2);
        let a = ("0" + backgroundColor.a.toString(16)).slice(-2);
        backgroundRGBA = { 
            "r": backgroundColor.r / 255, 
            "g": backgroundColor.g / 255, 
            "b": backgroundColor.b / 255, 
            "a": backgroundColor.a / 255 
        };
        backgroundColor = `#${r}${g}${b}${a}`;
    } else {
        backgroundColor = "#ffffffff";
    }


    this.filler.fill({
        "backgroundColor": backgroundColor
    });

    $.res.load("/~pkmsm/shaders/toon.vert", (error, vertexShader) => {

        if (error) {
            console.error(error); return;
        }

        $.res.load("/~pkmsm/shaders/toon.frag", (error, fragmentShader) => {

            if (error) {
                console.error(error); return;
            }

            let size = m3dScene.css(["width", "height"]);

            size.width = parseInt(size.width);
            size.height = parseInt(size.height);

            let layerTargets = [];

            let looper = 0;
            while (looper < LAYERS + 2) {
                let layerTarget = new THREE.WebGLRenderTarget(size.width * 2, size.height * 2);
                layerTarget.texture.format = THREE.RGBAFormat;
                layerTarget.texture.minFilter = THREE.LinearFilter;
                layerTarget.texture.magFilter = THREE.LinearFilter;
                layerTarget.texture.generateMipmaps = false;
                layerTarget.stencilBuffer = true;
                layerTarget.depthBuffer = true;
                layerTargets.push(layerTarget);
                ++looper;
            }

            this.layerTargets = layerTargets;

            let finalScene = new THREE.Scene();
            let finalCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            let finalMaterial = new THREE.ShaderMaterial({
                "vertexShader": vertexShader,
                "fragmentShader": fragmentShader,
                "uniforms": {
                    "cameraNear": { "value": finalCamera.near },
                    "cameraFar": { "value": finalCamera.far },
                    "ux": { "value": 1 / size.width / 2 },
                    "uy": { "value": 1 / size.height / 2 },
                    "layer": { "value": layerTargets[0].texture },
                    "layer2": { "value": layerTargets[1].texture },
                    "layer3": { "value": layerTargets[2].texture },
                    "layer4": { "value": layerTargets[3].texture },
                    "layer5": { "value": layerTargets[4].texture },
                    "backgroundColor": { "value": new THREE.Vector4(0, 0, 0, 1.0) },
                    "noOutline": { "value": false }
                }
            });
            let finalPlane = new THREE.PlaneBufferGeometry(2, 2);
            let finalMesh = new THREE.Mesh(finalPlane, finalMaterial);
            finalScene.add(finalMesh);

            let frame = this;

            m3dScene[0].m3dCustomRender = function (renderer, scene, camera) {

                if (!renderer.modelBackgroundColor) {
                    renderer.modelBackgroundColor = backgroundRGBA;
                }

                if (!renderer.drawPokemonOutlineLoaded) {
                    renderer.drawPokemonOutlineLoaded = true;
                    if ($.local["pkmsm.model-viewer.outline"] !== undefined) {
                        renderer.drawPokemonOutline = $.local["pkmsm.model-viewer.outline"];
                    } else {
                        renderer.drawPokemonOutline = true;
                    }
                }

                let looper = 0;
                while (looper < LAYERS + 2) {
                    switch (looper) {
                        case 0: { 
                            renderer.setClearColor(0x000000);
                            renderer.setClearAlpha(0);
                            renderer.renderingSemidepth2 = false;
                            renderer.renderingLayer = 0.5; 
                            break; 
                        }
                        case 1: { 
                            renderer.setClearColor(0x000000);
                            renderer.setClearAlpha(0);
                            renderer.renderingSemidepth2 = true;
                            renderer.renderingLayer = 0.5; 
                            break; 
                        }
                        case 2: { 
                            renderer.setClearColor(0x000000);
                            renderer.setClearAlpha(0);
                            renderer.renderingSemidepth2 = false;
                            renderer.renderingLayer = 1; 
                            break; 
                        }
                        default: { 
                            renderer.setClearColor(looper === LAYERS ? 0xffffff : 0x000000);
                            renderer.setClearAlpha(1);
                            renderer.renderingLayer = 0;
                            renderer.renderingSemidepth2 = false;
                            break; 
                        }
                    }
                    renderer.setRenderTarget(layerTargets[looper]);
                    renderer.clear();
                    renderer.render(scene, camera);
                    ++looper;
                }

                let size = m3dScene.css(["width", "height"]);

                finalMaterial.uniforms.cameraNear.value = finalCamera.near;
                finalMaterial.uniforms.cameraFar.value = finalCamera.far;
                finalMaterial.uniforms.ux.value = 1 / parseInt(size.width) / 2;
                finalMaterial.uniforms.uy.value = 1 / parseInt(size.height) / 2;
                finalMaterial.uniforms.noOutline.value = renderer.drawPokemonOutline === false;
                finalMaterial.uniforms.backgroundColor.value.set(
                    renderer.modelBackgroundColor.r,
                    renderer.modelBackgroundColor.g,
                    renderer.modelBackgroundColor.b,
                    renderer.modelBackgroundColor.a);

                renderer.setRenderTarget(null);
                renderer.clear();
                renderer.render(finalScene, finalCamera);

            };

        });
    });

};

Frame.prototype.onClose = function () {
    this.resizeObserver.disconnect();
};

Frame.prototype.getTargetIDs = function () {

    let id = $(this.dom).attr("wire-id");

    let scene = this.filler.query("m3d-scene");
    let ids = {
        [`${id}/resource-list`]: [scene],
        [`${id}/animation-list`]: [scene],
        [`${id}/animation-controller`]: [scene],
        [`${id}/inspector`]: [scene],
    };

    return ids;

};

Frame.prototype.clearAnimations = function () {

    this.filler.query("#pokemon-model")[0].clearPlayingM3DClips();

    delete this.playingAnimationSeries;
    delete this.playVersion;

    this.playPausedAnimations();

};

Frame.prototype.updateAnimation = function () {

    this.filler.query("#pokemon-model")[0].updatePlayingM3DClipStates();

};

Frame.prototype.playAnimation = function (animationID, options) {

    this.filler.query("#pokemon-model")[0].playM3DClip(animationID, Object.assign({}, options, {
        "onAnimationStarted": () => {
            this.trigAnimationStatesChanges();
            if (options.onAnimationStarted) {
                options.onAnimationStarted();
            }
        },
        "onAnimationEnded": () => {
            this.trigAnimationStatesChanges();
            if (options.onAnimationEnded) {
                options.onAnimationEnded();
            }
        }
    }));

    for (let listener of this.animationListeners) {
        try {
            listener(animationID);
        } catch (error) {
            console.error(error);
        }
    }

};

Frame.prototype.playAnimationSeries = function (series, options) {

    let playVersion = $.uuid();
    this.playVersion = playVersion;

    this.playingAnimationSeries = {
        "clips": series.slice(0),
        "options": Object.assign({}, options)
    };

    let play = (index, frame) => {

        if (!frame) {
            frame = 0;
        }

        let newOptions = Object.assign({}, options, {
            "loop": null,
            "frame": frame,
            "onAnimationEnded": () => {
                if (playVersion !== this.playVersion) {
                    return;
                }
                play(index + 1);
            }
        });

        switch (options.loop) {
            case true: 
            case "repeat": { 
                if (index === series.length) {
                    index = 0;
                }
                break; 
            }
            case "last": { 
                if (index === series.length) {
                    --index;
                }
                break; 
            }
            case false: 
            case "no": { 
                if (index === series.length) {
                    if (options.onAnimationEnded) {
                        options.onAnimationEnded();
                    }
                    return;
                }
                break; 
            }
        }

        this.playAnimation(series[index], newOptions);

    };

    let allDuration = 0;
    let animations = Object.create(null);
    for (let clip of series) {
        let duration = parseFloat(this.filler.query(`m3d-clip#${clip}`).attr("duration"));
        animations[clip] = Math.round(duration * 24) / 24;
        allDuration += animations[clip];
    }

    this.playingAnimationSeries.duration = allDuration; 

    let lastClip = 0;
    let frame = 0;
    if (options.time) {
        let clipTime = 0;
        while ((lastClip < series.length) &&
               (clipTime + animations[series[lastClip]] <= options.time)) {
            clipTime += animations[series[lastClip]];
            ++lastClip;
        }
        let fps = 24;
        frame = Math.round((options.time - clipTime) * fps);
    }

    play(lastClip, frame);

};

Frame.prototype.pauseAnimations = function () {

    this.filler.query("#pokemon-model")[0].pauseM3DClips();

};

Frame.prototype.playPausedAnimations = function () {

    this.filler.query("#pokemon-model")[0].playPausedM3DClips();

};

Frame.prototype.getPlayingAnimationSeries = function () {

    return this.playingAnimationSeries;

};

Frame.prototype.getPlayingAnimations = function () {

    return this.filler.query("#pokemon-model")[0].getPlayingM3DClips();

};

Frame.prototype.trigAnimationStatesChanges = function () {

    let id = $(this.dom).attr("wire-id");

    let frames = $(this.dom).parent().children("ui-diagram-frame").filter((index, dom) => {
        let wireID = $(dom).attr("wire-id");
        return wireID.split("/")[0] === id;
    });

    let animations = this.getPlayingAnimations();

    for (let frame of frames) {
        if (frame.frame.updatePlayingAnimations) {
            frame.frame.updatePlayingAnimations(animations);
        }
    }

};

Frame.prototype.addAnimationListener = function (listener) {

    this.animationListeners.push(listener);

};

Frame.prototype.removeAnimationListener = function (listener) {

    let index = this.animationListeners.indexOf(listener);
    if (index !== -1) {
        this.animationListeners.splice(index, 1);
    }

};

Frame.prototype.toastMessage = function (message, duration) {

    if (!message) { return; }

    if (!duration) { duration = 1000; }

    if (this.toastJob) {
        this.toastJob.cancel();
    }

    this.filler.fill({
        "toast": message,
        "toastVisible": true
    });

    let version = $.uuid();
    this.toastVersion = version;

    let toastJob = null;
    let controller = {
        "cancel": () => {
            if (this.toastVersion !== version) {
                return;
            }
            this.toastVersion = $.uuid();
            this.filler.fill({
                "toastVisible": false
            });
            if (this.toastJob === toastJob) {
                delete this.toastJob;
            }
        }
    };

    if (isFinite(duration)) {
        toastJob = $.delay(duration, () => {
            controller.cancel();
        });
        this.toastJob = toastJob;
    }

    return controller;

};

Frame.prototype.savePNGSnapshot = function () {

    let m3dScene = this.filler.query("m3d-scene")[0];

    let dataURL = m3dScene.snapshotAsDataURL();

    let width = parseInt($(m3dScene).css("width"));
    let height = parseInt($(m3dScene).css("height"));

    let a = $("<a>").attr({
        "href": dataURL,
        "download": `${this.filler.parameters.id}.png`,
    }).css({
        "display": "none"
    });

    $("body").append(a);

    a[0].click();

    a.detach();

};

Frame.prototype.saveSTLFile = function (tessellation) {

    let model = this.filler.query("m3d-object#pokemon-model").children().filter("m3d-object").filter((index, element) => {
        return $(element).attr("base").split("/").slice(-1)[0] !== "shadow";
    })[0];

    let meshes = [];

    let maxes = [-Infinity, -Infinity, -Infinity];
    let mins = [Infinity, Infinity, Infinity];
    let threeModel = model.m3dObject;
    for (let mesh of threeModel.children.filter((child) => child.isMesh)) {

        let skeleton = mesh.skeleton;
        let bones = mesh.m3dExtra ? mesh.m3dExtra.bones : undefined;

        // TODO: ignore more materials
        if (mesh.material.visible) {

            let normalUVs = undefined;
            let normalTexture = undefined;
            switch (mesh.material.m3dExtra.bumpNormalTexture) {
                case 0: { 
                    normalTexture = mesh.material.uniforms.map.value; 
                    normalUVs = mesh.geometry.attributes.uv;
                    break; 
                }
                case 1: { 
                    normalTexture = mesh.material.uniforms.map2.value; 
                    normalUVs = mesh.geometry.attributes.uv;
                    break; 
                }
                case 2: { 
                    normalTexture = mesh.material.uniforms.map3.value; 
                    normalUVs = mesh.geometry.attributes.uv;
                    break; 
                }
            }
            if (normalTexture) {
                let canvas = $("<canvas>").attr({
                    "width": normalTexture.image.naturalWidth,
                    "height": normalTexture.image.naturalHeight
                })[0];
                let context = canvas.getContext("2d");
                context.globalCompositeOperation = "copy";
                context.drawImage(normalTexture.image, 0, 0, normalTexture.image.naturalWidth, normalTexture.image.naturalHeight);
                normalTexture = {
                    "data": context.getImageData(0, 0, normalTexture.image.naturalWidth, normalTexture.image.naturalHeight).data,
                    "flipY": normalTexture.flipY,
                    "wrapS": ({
                        [THREE.ClampToEdgeWrapping]: "clamp",
                        [THREE.RepeatWrapping]: "repeat",
                        [THREE.MirroredRepeatWrapping]: "mirror",
                    })[normalTexture.wrapS],
                    "wrapT": ({
                        [THREE.ClampToEdgeWrapping]: "clamp",
                        [THREE.RepeatWrapping]: "repeat",
                        [THREE.MirroredRepeatWrapping]: "mirror",
                    })[normalTexture.wrapT],
                    "offset": [normalTexture.offset.x, normalTexture.offset.y],
                    "repeat": [normalTexture.repeat.x, normalTexture.repeat.y],
                    "width": normalTexture.image.naturalWidth,
                    "height": normalTexture.image.naturalHeight
                };
            }

            let triangles = [];

            let matrixWorld = mesh.matrixWorld;

            let indices = mesh.geometry.index;
            let positions = mesh.geometry.attributes.position;
            let normals = mesh.geometry.attributes.normal;
            let skinIndices = mesh.geometry.attributes.skinIndex;
            let skinWeights = mesh.geometry.attributes.skinWeight;

            const getData = (source, looper, itemSize) => {
                if (!source) { return null; }
                if ((itemSize === 3) || (source.itemSize < 4)) {
                    return [source.array[indices.array[looper] * source.itemSize],
                            source.array[indices.array[looper] * source.itemSize + 1],
                            source.array[indices.array[looper] * source.itemSize + 2]];
                } else {
                    return [source.array[indices.array[looper] * source.itemSize],
                            source.array[indices.array[looper] * source.itemSize + 1],
                            source.array[indices.array[looper] * source.itemSize + 2],
                            source.array[indices.array[looper] * source.itemSize + 3]];
                }
            };

            const getPoint = (looper) => {
                let position = getData(positions, looper, 3);
                let normal = getData(normals, looper, 3);
                let normalUV = undefined;
                if (normalUVs && normalTexture) {
                    let uv = [normalUVs.array[indices.array[looper] * normalUVs.itemSize],
                              normalUVs.array[indices.array[looper] * normalUVs.itemSize + 1]];
                    uv[0] = (uv[0] + normalTexture.offset[0]) * normalTexture.repeat[0];
                    uv[1] = (uv[1] + normalTexture.offset[1]) * normalTexture.repeat[1];
                    switch (normalTexture.wrapS) {
                        case "mirror": {
                            while (uv[0] < 0) { uv[0] += 2; }
                            uv[0] = uv[0] % 2; 
                            if (uv[0] > 1) { uv[0] = 2 - uv[0]; }
                            break;
                        }
                        case "repeat": {
                            while (uv[0] < 0) { uv[0] += 1; }
                            uv[0] = uv[0] % 1; break;
                        }
                        case "clamp": 
                        default: { uv[0] = Math.max(0, Math.min(uv[0], 1)); break; }
                    }
                    switch (normalTexture.wrapT) {
                        case "mirror": {
                            while (uv[1] < 0) { uv[1] += 2; }
                            uv[1] = uv[1] % 2; 
                            if (uv[1] > 1) { uv[1] = 2 - uv[1]; }
                            break;
                        }
                        case "repeat": {
                            while (uv[1] < 0) { uv[1] += 1; }
                            uv[1] = uv[1] % 1; break;
                        }
                        case "clamp": 
                        default: { uv[1] = Math.max(0, Math.min(uv[1], 1)); break; }
                    }
                    uv[0] = uv[0] * (normalTexture.width - 1);
                    if (normalTexture.flipY) {
                        uv[1] = 1 - uv[1];
                    }
                    uv[1] = uv[1] * (normalTexture.height - 1);
                    normalUV = uv;
                    let uvNormal = [
                        normalTexture.data[(Math.round(uv[1]) * normalTexture.width + Math.round(uv[0])) * 4],
                        normalTexture.data[(Math.round(uv[1]) * normalTexture.width + Math.round(uv[0])) * 4 + 1],
                        normalTexture.data[(Math.round(uv[1]) * normalTexture.width + Math.round(uv[0])) * 4 + 2],
                    ];
                    let old = normal;
                    let oldLength = Math.sqrt(old[0] * old[0] + old[1] * old[1] + old[2] * old[2]);
                    if (uvNormal[0] + uvNormal[1] + uvNormal[2] > 0) {
                        uvNormal[0] = (uvNormal[0] - 127) / 128;
                        uvNormal[1] = (uvNormal[1] - 127) / 128;
                        uvNormal[2] = (uvNormal[2] - 127) / 128;
                        if (uvNormal[0] * uvNormal[0] + uvNormal[1] * uvNormal[1] + uvNormal[2] * uvNormal[2] > 0.2) {
                            let length = Math.sqrt(uvNormal[0] * uvNormal[0] + uvNormal[1] * uvNormal[1] + uvNormal[2] * uvNormal[2]);
                            uvNormal[0] /= length;
                            uvNormal[1] /= length;
                            uvNormal[2] /= length;
                            if (uvNormal[0] * old[0] + uvNormal[1] * old[1] + uvNormal[2] * old[2] < oldLength * 0.4) {
                                normal = uvNormal;
                            }
                        }
                    }
                }
                let skinIndex = getData(skinIndices, looper, 4);
                let skinWeight = getData(skinWeights, looper, 4);
                const merge = (matrixWorld, data, extra) => {
                    let vector = new THREE.Vector4(data[0], data[1], data[2], extra);
                    vector.applyMatrix4(matrixWorld);
                    return [vector.x, vector.y, vector.z];
                };
                if (skeleton && bones && skinIndex && skinWeights) {
                    let matrix = new THREE.Matrix4();
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[0]] * 16);
                    let position1 = merge(matrix, position, 1);
                    let normal1 = merge(matrix, normal, 0);
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[1]] * 16);
                    let position2 = merge(matrix, position, 1);
                    let normal2 = merge(matrix, normal, 0);
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[2]] * 16);
                    let position3 = merge(matrix, position, 1);
                    let normal3 = merge(matrix, normal, 0);
                    matrix.fromArray(skeleton.boneMatrices, bones[skinIndex[3]] * 16);
                    let position4 = merge(matrix, position, 1);
                    let normal4 = merge(matrix, normal, 0);
                    let positions = [position1, position2, position3, position4];
                    let normals = [normal1, normal2, normal3, normal4];
                    let newPosition = [0, 0, 0];
                    let newNormal = [0, 0, 0];
                    for (let looper = 0; looper < 4; ++looper) {
                        if (skinWeight[looper] && isFinite(skinWeight[looper])) {
                            newPosition[0] += positions[looper][0] * skinWeight[looper] / 255;
                            newPosition[1] += positions[looper][1] * skinWeight[looper] / 255;
                            newPosition[2] += positions[looper][2] * skinWeight[looper] / 255;
                            let newPartialNormal = [
                                normals[looper][0] * skinWeight[looper],
                                normals[looper][1] * skinWeight[looper],
                                normals[looper][2] * skinWeight[looper]
                            ];
                            let newPartialNormalLength = Math.sqrt(
                                newPartialNormal[0] * newPartialNormal[0] +
                                newPartialNormal[1] * newPartialNormal[1] +
                                newPartialNormal[2] * newPartialNormal[2]);
                            newNormal[0] += newPartialNormal[0] / newPartialNormalLength * skinWeight[looper] / 255;
                            newNormal[1] += newPartialNormal[1] / newPartialNormalLength * skinWeight[looper] / 255;
                            newNormal[2] += newPartialNormal[2] / newPartialNormalLength * skinWeight[looper] / 255;
                        }
                    }
                    normal = newNormal;
                    position = newPosition;
                } else {
                    position = merge(matrixWorld, position);
                    normal = merge(matrixWorld, normal);
                }
                let normalLength = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]);
                normal[0] /= normalLength;
                normal[1] /= normalLength;
                normal[2] /= normalLength;
                if (position[0] < mins[0]) { mins[0] = position[0]; }
                if (position[1] < mins[1]) { mins[1] = position[1]; }
                if (position[2] < mins[2]) { mins[2] = position[2]; }
                if (position[0] > maxes[0]) { maxes[0] = position[0]; }
                if (position[1] > maxes[1]) { maxes[1] = position[1]; }
                if (position[2] > maxes[2]) { maxes[2] = position[2]; }
                return { position, normal };
            };

            let side = ({
                [THREE.DoubleSide]: "both-sides",
                [THREE.FrontSide]: "front-face",
                [THREE.BackSide]: "back-face"
            })[mesh.material.side];

            for (let looper = 0; looper < indices.count; looper += 3) {
                let points = [getPoint(looper), getPoint(looper + 1), getPoint(looper + 2)];
                triangles.push(points);
            }

            meshes.push({
                "name": mesh.name,
                "material": mesh.material.name,
                "side": side,
                "triangles": triangles
            });

        }

    }

    let max = Math.max(maxes[0] - mins[0], maxes[1] - mins[1], maxes[2] - mins[2]);

    let newMeshes = [];
    for (let mesh of meshes) {
        if (mesh.side === "both-sides") {
            let offset = max / 1600;
            let triangles = [];
            for (triangle of mesh.triangles) {
                let v = new THREE.Vector3(
                    triangle[0].position[0] - triangle[1].position[0],
                    triangle[0].position[1] - triangle[1].position[1],
                    triangle[0].position[2] - triangle[1].position[2]);
                v.cross(new THREE.Vector3(
                    triangle[0].position[0] - triangle[2].position[0],
                    triangle[0].position[1] - triangle[2].position[1],
                    triangle[0].position[2] - triangle[2].position[2]));
                v.normalize();
                let n = [v.x, v.y, v.z];
                let convert = (point, direction) => {
                    let normal = point.normal.slice(0);
                    normal[0] *= direction;  
                    normal[1] *= direction;  
                    normal[2] *= direction;  
                    return {
                        "position": [
                            point.position[0] + n[0] * offset * direction,
                            point.position[1] + n[1] * offset * direction,
                            point.position[2] + n[2] * offset * direction,
                        ],
                        "normal": normal
                    };
                };
                let t1 = [convert(triangle[0], 1), convert(triangle[1], 1), convert(triangle[2], 1)];
                let t2 = [convert(triangle[0], -1), convert(triangle[1], -1), convert(triangle[2], -1)];
                triangles.push(t1);
                triangles.push(t2);
                triangles.push([t1[0], t1[1], t2[0]]);
                triangles.push([t2[0], t1[1], t2[1]]);
                triangles.push([t1[1], t1[2], t2[1]]);
                triangles.push([t2[1], t1[2], t2[2]]);
                triangles.push([t1[2], t1[0], t2[2]]);
                triangles.push([t2[2], t1[0], t2[0]]);
            }
            newMeshes.push(Object.assign({}, mesh, {
                "side": "front-face",
                "triangles": triangles
            }));
        } else {
            newMeshes.push(mesh);
        }
    }
    meshes = newMeshes;

    if (tessellation) {

        let newPoints = {};

        for (let mesh of meshes) {
            let newTriangles = [];
            for (let triangle of mesh.triangles) {
                let mid = (a, b) => {
                    return [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5];
                };
                let midVertex = (a, b) => {

                    let v = [a.position[0] - b.position[0], 
                             a.position[1] - b.position[1], 
                             a.position[2] - b.position[2]];
                    let l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

                    let calc = (p, n, factor) => {
                        let nv = new THREE.Vector3(n[0], n[1], n[2]);
                        let t = new THREE.Vector3(v[0], v[1], v[2]);
                        t.cross(nv);
                        t.cross(nv);
                        t.normalize();
                        return [p[0] + t.x * factor, p[1] + t.y * factor, p[2] + t.z * factor];
                    };

                    let c = 0.33;
                    if ((l > max / 16) || (l < max / 1000)) {
                        c = 0.01;
                    }
                    let edge = 0.6;
                    let n = a.normal.slice(0);
                    let nl = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
                    if (n[0] * v[0] + n[1] * v[1] + n[2] * v[2] > edge * l * nl) {
                        let nv = new THREE.Vector3(n[0], n[1], n[2]);
                        let t = new THREE.Vector3(v[0], v[1], v[2]);
                        nv.cross(t);
                        nv.cross(t);
                        n = [nv.x, nv.y, nv.z];
                    }
                    let c1 = calc(a.position, n, l * c);

                    n = b.normal.slice(0);
                    nl = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
                    if (n[0] * v[0] + n[1] * v[1] + n[2] * v[2] < -edge * l * nl) {
                        let nv = new THREE.Vector3(n[0], n[1], n[2]);
                        let t = new THREE.Vector3(v[0], v[1], v[2]);
                        nv.cross(t);
                        nv.cross(t);
                        n = [nv.x, nv.y, nv.z];
                    }
                    let c2 = calc(b.position, n, l * c * (-1));

                    let bezier = (t, p0, p1, p2, p3) => {
                        return (p0 * (1 - t) * (1 - t) * (1 - t) + 
                                3 * p1 * t * (1 - t) * (1 - t) + 
                                3 * p2 * t * t * (1 - t) + 
                                p3 * t * t * t);
                    };
                    let position = [
                        bezier(0.5, a.position[0], c1[0], c2[0], b.position[0]),
                        bezier(0.5, a.position[1], c1[1], c2[1], b.position[1]),
                        bezier(0.5, a.position[2], c1[2], c2[2], b.position[2])
                    ];

                    let id = [a.position, b.position].sort((a, b) => {
                        let diff = [a[0] - b[0], a[1] - b[1], a[2] - b[2]].filter((x) => x !== 0);
                        return diff[0] ? diff[0] : 0;
                    }).map(x => x.join(",")).join("-");
                    if (!newPoints[id]) {
                        newPoints[id] = {
                            "mids": []
                        };
                    }
                    newPoints[id].mids.push(position);

                    return { 
                        "id": id,
                        "position": position,
                        "normal": mid(a.normal, b.normal)
                    };

                };
                let m1 = midVertex(triangle[0], triangle[1]);
                let m2 = midVertex(triangle[1], triangle[2]);
                let m3 = midVertex(triangle[2], triangle[0]);
                newTriangles.push([triangle[0], m1, m3]);
                newTriangles.push([m1, triangle[1], m2]);
                newTriangles.push([m3, m2, triangle[2]]);
                newTriangles.push([m1, m2, m3]);
            }
            mesh.triangles = newTriangles;
        }

        for (let id in newPoints) {
            let sum = [0, 0, 0];
            let mids = newPoints[id].mids;
            for (let mid of mids) {
                sum[0] += mid[0];
                sum[1] += mid[1];
                sum[2] += mid[2];
            }
            newPoints[id].average = [sum[0] / mids.length, sum[1] / mids.length, sum[2] / mids.length];
        }

        for (let mesh of meshes) {
            for (let triangle of mesh.triangles) {
                for (let looper = 0; looper < 3; ++looper) {
                    let id = triangle[looper].id;
                    if (id && newPoints[id]) {
                        triangle[looper].position = newPoints[id].average;
                    }
                }
            }
        }

    }

    let name = $(model).attr("name").replace(/[^0-9a-z_]/ig, "_");

    let lines = [];

    lines.push(`solid ${name}`);
    for (let mesh of meshes) {
        for (let triangle of mesh.triangles) {
            let v1 = new THREE.Vector3(
                triangle[0].position[0] - triangle[1].position[0],
                triangle[0].position[1] - triangle[1].position[1],
                triangle[0].position[2] - triangle[1].position[2],
            );
            let v2 = new THREE.Vector3(
                triangle[0].position[0] - triangle[2].position[0],
                triangle[0].position[1] - triangle[2].position[1],
                triangle[0].position[2] - triangle[2].position[2],
            );
            v1.cross(v2);
            if ((mesh.side === "front-face") || (mesh.side === "both-sides")) {
                lines.push(`    facet normal ${v1.x} ${v1.y} ${v1.z}`);
                lines.push(`        outer loop`);
                for (let looper = 0; looper < 3; ++looper) {
                    lines.push(`             vertex ${triangle[looper].position.join(" ")}`);
                }
                lines.push(`        endloop`);
                lines.push(`    endfacet`);
            }
            if ((mesh.side === "back-face") || (mesh.side === "both-sides")) {
                lines.push(`    facet normal ${-v1.x} ${-v1.y} ${-v1.z}`);
                lines.push(`        outer loop`);
                for (let looper = 2; looper >= 0; --looper) {
                    lines.push(`             vertex ${triangle[looper].position.join(" ")}`);
                }
                lines.push(`        endloop`);
                lines.push(`    endfacet`);
            }
            
        }
    }

    lines.push(`endsolid ${name}`);

    let code = lines.join("\n");

    let a = $("<a>").attr({
        "href": `data:application/octet-stream;base64,${btoa(code)}`,
        "download": `${name}.stl`,
    }).css({
        "display": "none"
    });

    $("body").append(a);

    a[0].click();

    a.detach();

};

Frame.prototype.saveAPNGFile = function () {

    let toast = this.toastMessage("Recording...", Infinity);

    let m3dScene = this.filler.query("m3d-scene")[0];

    let canvas = m3dScene.filler.query("canvas")[0];

    let series = this.getPlayingAnimationSeries();
    let playings = this.getPlayingAnimations();

    let action = this.filler.query("#pokemon-model")[0].getM3DClip("FightingAction1");

    let frames = Math.round(action.duration * action.fps);

    let encoder = new APNGEncoder(canvas);
    encoder.start();

    let recordFrame = (frame) => {

        this.clearAnimations();
        this.playPausedAnimations();

        if (frame > frames) {

            toast.cancel();

            encoder.finish();

            let stream = encoder.stream();

            let dataURL = "data:image/png;base64," + stream.toStrBase64();

            let a = $("<a>").attr({
                "href": dataURL,
                "download": `${this.filler.parameters.id}.apng`,
            }).css({
                "display": "none"
            });

            $("body").append(a);

            a[0].click();

            a.detach();

            for (let playing of playings) {
                if (playing.channel !== "action") {
                    let frame = Math.round(playing.frame / playing.resample);
                    this.playAnimation(playing.name, {
                        "channel": playing.channel,
                        "priority": playing.priority,
                        "fading": 0,
                        "paused": playing.paused,
                        "frame": frame,
                        "loop": Infinity
                    });
                }
            }

            this.playAnimationSeries(series.clips, {
                "channel": series.options.channel,
                "priority": series.options.priority,
                "fading": 0,
                "loop": "last"
            });

            return;
        }

        for (let playing of playings) {
            if (playing.channel !== "action") {
                let finalFrame = Math.round(((frame / action.fps) % playing.duration) * action.fps);
                if ((playing.channel.split("-")[0] === "state") && 
                    ($(this.dom).attr("wire-id").split("-")[1] === "327")) {
                    finalFrame = 128;
                }
                this.playAnimation(playing.name, {
                    "channel": playing.channel,
                    "priority": playing.priority,
                    "fading": 0,
                    "paused": true,
                    "frame": finalFrame,
                    "loop": Infinity
                });
            }
        }

        this.playAnimation("FightingAction1", {
            "channel": series.options.channel,
            "priority": series.options.priority,
            "fading": 0,
            "paused": true,
            "frame": frame === frames ? 0 : frame,
            "loop": false,
        });
        this.updateAnimation();

        $.delay(1000 / action.fps, () => {
            encoder.setDelay(100 / action.fps);
            encoder.setDispose(1);
            encoder.setBlend(0);
            encoder.addFrame();
            recordFrame(frame + 1);
        });

    };

    recordFrame(0);

};

Frame.prototype.saveM3DFile = function () {

    window.open(`/~pkmsm/model/save/${this.filler.parameters.id}`);

};

Frame.prototype.saveWebMVideo = function (poseTimes) {

    let toast = this.toastMessage("Recording...", Infinity);

    let m3dScene = this.filler.query("m3d-scene")[0]; 
    m3dScene.recordVideo((start, end) => {

        let series = this.getPlayingAnimationSeries();
        let playings = this.getPlayingAnimations();

        this.clearAnimations();
        this.playPausedAnimations();

        for (let playing of playings) {
            if (playing.channel !== "action") {
                let paused = false;
                let frame = 0;
                if ((playing.channel.split("-")[0] === "state") && 
                    ($(this.dom).attr("wire-id").split("-")[1] === "327")) {
                    paused = true;
                    frame = 128;
                }
                this.playAnimation(playing.name, {
                    "channel": playing.channel,
                    "priority": playing.priority,
                    "fading": 0,
                    "paused": paused,
                    "frame": frame,
                    "loop": Infinity
                });
            }
        }

        let originClips = series.clips.slice(0);

        let clips = series.clips.slice(0);
        if (clips.length > 1) {
            clips = clips.slice(0, -1);
        }

        this.playAnimation(clips[0], {
            "channel": series.options.channel,
            "priority": series.options.priority,
            "fading": 0,
            "loop": false,
            "paused": true
        });
        this.updateAnimation();

        let restPoseTimes = poseTimes;

        for (let looper = 0; looper < poseTimes; ++looper) {
            clips.push(originClips[originClips.length - 1]);
        }

        start(() => {
            this.playAnimationSeries(clips, {
                "channel": series.options.channel,
                "priority": series.options.priority,
                "fading": 0,
                "loop": "no",
                "onAnimationEnded": () => {

                    let lastClip = clips[clips.length - 1];

                    let duration = parseFloat(this.filler.query(`m3d-clip#${lastClip}`).attr("duration"));
                    let frame = Math.round(duration * 24) - 1;

                    this.playAnimation(clips[clips.length - 1], {
                        "channel": series.options.channel,
                        "priority": series.options.priority,
                        "fading": 0,
                        "loop": false,
                        "frame": frame,
                        "paused": true
                    });
                    this.updateAnimation();

                    // 24fps, delay one frame to complete animation

                    $.delay(1000 / 24, () => {
                        end((error, blob) => {
                            toast.cancel();
                            let url = URL.createObjectURL(blob);
                            let a = $("<a>").attr({
                                "href": url,
                                "download": `${this.filler.parameters.id}.webm`,
                            }).css({
                                "display": "none"
                            });
                            $("body").append(a);
                            a[0].click();
                            a.detach();
                            URL.revokeObjectURL(url);
                            this.playAnimationSeries(originClips, {
                                "channel": series.options.channel,
                                "priority": series.options.priority,
                                "fading": 0,
                                "loop": "last"
                            });
                        });
                    });

                }
            });
        });

    });

};

Frame.functors = {

    "saveM3DFile": function () {
        this.saveM3DFile();
    },

    "saveWebMVideo": function (poseTimes) {
        this.saveWebMVideo(poseTimes);        
    },

    "savePNGSnapshot": function () {
        this.savePNGSnapshot();
    },
    "saveAPNGFile": function () {
        this.saveAPNGFile();
    },

    "saveSTLFile": function (tessellation) {
        this.saveSTLFile(tessellation);
    },

    "listResources": function () {
        $.app(this.dom).openResourceList(this.filler.parameters.id, this);
    },

    "listAnimations": function () {
        $.app(this.dom).openAnimationList(this.filler.parameters.id, this);
    },

    "inspectModel": function () {
        $.app(this.dom).inspectModel(this.filler.parameters.id, this);
    },

    "showAnimationController": function () {
        $.app(this.dom).openAnimationController(this.filler.parameters.id, this);
    },

    "resizeRenderingTarget": function (event) {
        if (this.layerTargets) {
            for (let layer of this.layerTargets) {
                layer.setSize(event.width * 2, event.height * 2);
            }
        }
    },

    "showShinyModel": function () {
        $.app(this.dom).smartOpen(this.filler.parameters.id + "-shiny", this);
    },
    "showNormalModel": function () {
        $.app(this.dom).smartOpen(this.filler.parameters.id.split("-").slice(0, -1).join("-"), this);
    }

};

module.exports.Frame = Frame;

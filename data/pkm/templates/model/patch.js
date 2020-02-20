let matrix = new Matrix3();

let targetPosition = new Vector4(0, 0, 0, 1);
let position = new Vector4(0, 0, 0, 1);
let lightDirection = new Vector4(0, 0, 0, 0);

const getDepthFunc = function (value) {
    switch (value) {
        case "never": { return THREE.NeverDepth; }
        case "always": { return THREE.AlwaysDepth; }
        // case "equal-to": { return THREE.EqualDepth; }
        case "not-equal-to": { return THREE.NotEqualDepth; }
        case "less-than": { return THREE.LessDepth; }
        case "less-than-or-equal-to": { return THREE.LessEqualDepth; }
        case "greater-than": { return THREE.GreaterDepth; }
        case "greater-than-or-equal-to": { return THREE.GreaterEqualDepth; }
        default: { break; }
    }
};

const getStencilFunc = function (value) {
    switch (value) {
        case "never": { return THREE.NeverStencilFunc; }
        case "always": { return THREE.AlwaysStencilFunc; }
        case "less-than": { return THREE.LessStencilFunc; }
        case "less-than-or-equal-to": { return THREE.LessEqualStencilFunc; }
        case "greater-than": { return THREE.GreaterStencilFunc; }
        case "greater-than-or-equal-to": { THREE.GreaterEqualStencilFunc; }
        case "equal-to": { return THREE.EqualStencilFunc; }
        case "not-equal-to": { return THREE.NotEqualStencilFunc; }
        default: { break; }
    }
};

const getStencilOperation = function (value) {
    switch (value) {
        case "keep": { return THREE.KeepStencilOp; }
        case "zero": { return THREE.ZeroStencilOp; }
        case "replace": { return THREE.ReplaceStencilOp; }
        case "increment": { return THREE.IncrementStencilOp; }
        case "decrement": { return THREE.DecrementStencilOp; }
        case "invert": { return THREE.InvertStencilOp; }
        case "incrementWrap": { return THREE.IncrementWrapStencilOp; }
        case "decrementWrap": { return THREE.DecrementWrapStencilOp; }
        default: { break; }
    }
};

const getBlendingEquation = function (value) {
    switch (value) {
        case "add": { return THREE.AddEquation; }
        case "subtract": { return THREE.SubtractEquation; }
        case "reverse-subtract": { return THREE.ReverseSubtractEquation; }
        case "min": { return THREE.MinEquation; }
        case "max": { return THREE.MaxEquation; }
        default: { break; }
    }
};

const getBlendingFactor = function (value) {
    switch (value) {
        case "zero": { return THREE.ZeroFactor; }
        case "one": { return THREE.OneFactor; }
        case "source-color": { return THREE.SrcColorFactor; }
        case "one-minus-source-color": { return THREE.OneMinusSrcColorFactor; }
        case "destination-color": { return THREE.DstColorFactor; }
        case "one-minus-destination-color": { return THREE.OneMinusDstColorFactor; }
        case "source-alpha": { return THREE.SrcAlphaFactor; }
        case "one-minus-source-alpha": { return THREE.OneMinusSrcAlphaFactor; }
        case "destination-alpha": { return THREE.DstAlphaFactor; }
        case "one-minus-destination-alpha": { return THREE.OneMinusDstAlphaFactor; }
        case "source-alpha-saturate": { return THREE.SrcAlphaSaturateFactor; }
        default: { break; }
    }
};

module.exports = function (renderer, scene, camera, lights, mesh, geometry, material, uniforms, extra) {

    const projectionMatrix = camera.projectionMatrix;
    const viewMatrix = camera.matrixWorldInverse;

    if (uniforms.renderingDepth) {
        uniforms.renderingDepth.value = renderer.renderingLayer;
    }

    if (uniforms.depthRendering) {
        if (renderer.renderingLayer > 0) {
            if (typeof extra.outlineDepthWrite === "boolean") {
                uniforms.depthRendering.value = extra.outlineDepthWrite;
            } else if (extra.outlineDepthWrite) {
                uniforms.depthRendering.value = extra.outlineDepthWrite[Math.round(renderer.renderingLayer * 2) - 1];
            } else {
                uniforms.depthRendering.value = true;
            }
        } else {
            uniforms.depthRendering.value = true;
        }
    }

    if (renderer.renderingLayer) {

        if (extra.outlineDepthWrite !== null) {
            if (typeof extra.outlineDepthWrite) {
                material.depthWrite = extra.outlineDepthWrite;
            } else {
                material.depthWrite = extra.outlineDepthWrite[renderer.renderingLayer === 0.5 ? 0 : 1];
            }
            material.depthTest = true;
            material.depthFunc = THREE.LessEqualDepth;
        }

        if (extra.outlineStencil && renderer.renderingSemidepth2) {
            material.stencilWrite = true;
            material.stencilRef = 63;
            material.stencilFuncMask = 255;
            material.stencilWriteMask = 255;
            material.stencilFunc = THREE.NotEqualStencilFunc;
            material.stencilFail = THREE.KeepStencilOp;
            material.stencilZFail = THREE.KeepStencilOp;
            material.stencilZPass = THREE.ReplaceStencilOp;
        } else {
            material.stencilWrite = extra.stencilTest.enabled;
            material.stencilRef = extra.stencilTest.reference;
            material.stencilFuncMask = extra.stencilTest.mask;
            material.stencilWriteMask = extra.stencilTest.writeMask;
            material.stencilFunc = getStencilFunc(extra.stencilTest.tester);
            material.stencilFail = getStencilOperation(extra.stencilTest.failed);
            material.stencilZFail = getStencilOperation(extra.stencilTest.zFailed);
            material.stencilZPass = getStencilOperation(extra.stencilTest.zPassed);
        }

        material.blendDst = THREE.ZeroFactor;
        material.blendDstAlpha = THREE.ZeroFactor;
        material.blendEquation = THREE.AddEquation;
        material.blendEquationAlpha = THREE.AddEquation;
        material.blendSrc = THREE.OneFactor;
        material.blendSrcAlpha = THREE.OneFactor;

    } else {

        material.depthTest = extra.depthTest.enabled;
        material.depthWrite = extra.depthTest.writable;
        material.depthFunc = getDepthFunc(extra.depthTest.tester);
        
        material.stencilWrite = extra.stencilTest.enabled;
        material.stencilRef = extra.stencilTest.reference;
        material.stencilFuncMask = extra.stencilTest.mask;
        material.stencilWriteMask = extra.stencilTest.writeMask;
        material.stencilFunc = getStencilFunc(extra.stencilTest.tester);
        material.stencilFail = getStencilOperation(extra.stencilTest.failed);
        material.stencilZFail = getStencilOperation(extra.stencilTest.zFailed);
        material.stencilZPass = getStencilOperation(extra.stencilTest.zPassed);

        material.blending = THREE.CustomBlending;
        material.blendEquation = getBlendingEquation(extra.blending.equation.color);
        material.blendEquationAlpha = getBlendingEquation(extra.blending.equation.alpha);
        material.blendSrc = getBlendingFactor(extra.blending.source.color);
        material.blendSrcAlpha = getBlendingFactor(extra.blending.source.alpha);
        material.blendDst = getBlendingFactor(extra.blending.destination.color);
        material.blendDstAlpha = getBlendingFactor(extra.blending.destination.alpha);

    }

    if (uniforms.cameraDirection) {
        camera.getWorldDirection(uniforms.cameraDirection.value);
    }

    if (uniforms.hasTangent) {
        uniforms.hasTangent.value = extra.hasTangent;
    }
    if (uniforms.hasBone) {
        uniforms.hasBone.value = extra.hasBone;
    }
    if (uniforms.hasBoneW) {
        uniforms.hasBoneW.value = extra.hasBoneW;
    }

    let worldScales = [1,1,1];
    let parent = mesh;
    while (parent) {
        worldScales[0] *= parent.scale.x;
        worldScales[1] *= parent.scale.y;
        worldScales[2] *= parent.scale.z;
        if (parent.modelScale) {
            worldScales[0] *= parent.modelScale.x;
            worldScales[1] *= parent.modelScale.y;
            worldScales[2] *= parent.modelScale.z;   
        }
        parent = parent.parent;
    }

    // gpu vectors
    if (uniforms.vectors) {

        const vectors = uniforms.vectors.value;

        // texture 0
        if (uniforms.map) {
            const map = uniforms.map.value;
            matrix.setUvTransform(
                map.repeat.x * map.offset.x, map.repeat.y * map.offset.y,
                map.repeat.x, map.repeat.y, map.rotation, 0, 0);
            vectors[1].set(matrix.elements[0], matrix.elements[3], 0, matrix.elements[6]);
            vectors[2].set(matrix.elements[1], matrix.elements[4], 0, matrix.elements[7]);
            vectors[3].set(matrix.elements[2], matrix.elements[5], matrix.elements[8], 0); 
        }

        // texture 1
        if (uniforms.map2) {
            const map2 = uniforms.map2.value;
            matrix.setUvTransform(
                map2.repeat.x * map2.offset.x, map2.repeat.y * map2.offset.y,
                map2.repeat.x, map2.repeat.y, map2.rotation, 0, 0);
            vectors[4].set(matrix.elements[0], matrix.elements[3], 0, matrix.elements[6]);
            vectors[5].set(matrix.elements[1], matrix.elements[4], 0, matrix.elements[7]);
            vectors[6].set(matrix.elements[2], matrix.elements[5], matrix.elements[8], 0);
        }

        // texture 2
        if (uniforms.map3) {
            const map3 = uniforms.map3.value;
            matrix.setUvTransform(
                map3.repeat.x * map3.offset.x, map3.repeat.y * map3.offset.y,
                map3.repeat.x, map3.repeat.y, map3.rotation, 0, 0);
            vectors[7].set(matrix.elements[0], matrix.elements[3], 0, matrix.elements[6]); 
            vectors[8].set(matrix.elements[1], matrix.elements[4], 0, matrix.elements[7]);
            vectors[9].set(matrix.elements[2], matrix.elements[5], matrix.elements[8], 0);
        }

        // bone matrices
        if (mesh.skeleton && extra.bones) {
            const boneMatrices = mesh.skeleton.boneMatrices;
            let looper = 0;
            while (looper < extra.bones.length) {
                let index = extra.bones[looper] * 16;
                vectors[10 + looper * 3].set(boneMatrices[index],
                                             boneMatrices[index + 4],
                                             boneMatrices[index + 8],
                                             boneMatrices[index + 12]);
                vectors[11 + looper * 3].set(boneMatrices[index + 1],
                                             boneMatrices[index + 5],
                                             boneMatrices[index + 9],
                                             boneMatrices[index + 13]);
                vectors[12 + looper * 3].set(boneMatrices[index + 2],
                                             boneMatrices[index + 6],
                                             boneMatrices[index + 10],
                                             boneMatrices[index + 14]);
                ++looper;
            }
        }

        // directional light for vertex shader
        const directionalLight = lights.filter((light) => light.isDirectionalLight)[0];

        targetPosition.set(0, 0, 0, 1);
        targetPosition.applyMatrix4(directionalLight.target.matrixWorld);

        position.set(0, 0, 0, 1);
        position.applyMatrix4(directionalLight.matrixWorld);

        vectors[83].set(position.x - targetPosition.x, 
                        position.y - targetPosition.y,
                        position.z - targetPosition.z, 0);

        // bounding box or light color
        // if (jsonMaterial.shaders.vertex !== "Default") {
            if (extra.mins && extra.maxes) {
                vectors[84].set(
                    (extra.maxes[0] - extra.mins[0]) * scale, // + threeMesh.parent.position.x,
                    (extra.maxes[2] - extra.mins[2]) * scale, // + threeMesh.parent.position.z,
                    extra.mins[1] * scale, // + threeMesh.parent.position.y,
                    extra.maxes[1] * scale // + threeMesh.parent.position.y
                );
            }
        // } else {
            // if (directionalLight) {
            //     vectors[84].set(
            //         directionalLight.color.r,
            //         directionalLight.color.g,
            //         directionalLight.color.b,
            //         directionalLight.intensity);
            // } else {
            //     vectors[84].set(1, 1, 1, 0);
            // }
        // }

        if (extra.isGeometryShader) {
            vectors[85].x = worldScales[0] * uniforms.vectors.origin[85].x;
        }

        // projection matrices
        vectors[86].set(projectionMatrix.elements[0],
                        projectionMatrix.elements[4],
                        projectionMatrix.elements[8],
                        projectionMatrix.elements[12]);
        vectors[87].set(projectionMatrix.elements[1],
                        projectionMatrix.elements[5],
                        projectionMatrix.elements[9],
                        projectionMatrix.elements[13]);
        vectors[88].set(projectionMatrix.elements[2],
                        projectionMatrix.elements[6],
                        projectionMatrix.elements[10],
                        projectionMatrix.elements[14]);
        vectors[89].set(projectionMatrix.elements[3],
                        projectionMatrix.elements[7],
                        projectionMatrix.elements[11],
                        projectionMatrix.elements[15]);

        // view matrix
        vectors[90].set(viewMatrix.elements[0],
                        viewMatrix.elements[4],
                        viewMatrix.elements[8],
                        viewMatrix.elements[12]);
        vectors[91].set(viewMatrix.elements[1],
                        viewMatrix.elements[5],
                        viewMatrix.elements[9],
                        viewMatrix.elements[13]);
        vectors[92].set(viewMatrix.elements[2],
                        viewMatrix.elements[6],
                        viewMatrix.elements[10],
                        viewMatrix.elements[14]);

    }

    // uv vectors
    if (uniforms.vectors && uniforms.uvVectors) {
        for (let looper = 0; looper < 40; ++looper) {
            uniforms.uvVectors.value[looper] = uniforms.vectors.value[looper];
        }
    }

    // constants
    if (extra.constantsIndices && 
        uniforms.constantSlots && uniforms.constants) {
        for (let looper = 0; looper < 6; ++looper) {
            let index = extra.constantsIndices[looper];
            uniforms.constants.value[looper].set(
                uniforms.constantSlots.value[index].x,
                uniforms.constantSlots.value[index].y,
                uniforms.constantSlots.value[index].z,
                uniforms.constantSlots.value[index].w);
        }
    }

    // camera
    if (uniforms.cameraNear) {
        uniforms.cameraNear.value = camera.near;
    }
    if (uniforms.cameraScale) {
        uniforms.cameraScale.value = 1 / (camera.far - camera.near);
    }

    // environment ambient light
    if (uniforms.environmentAmbient) {
        const ambientLight = lights.filter((light) => light.isAmbientLight)[0];
        if (ambientLight) {
            uniforms.environmentAmbient.value.set(
                ambientLight.color.r, ambientLight.color.g, 
                ambientLight.color.b, ambientLight.intensity);
        }
    }

    // lights for fragment shader
    lights = lights.filter((light) => !light.isAmbientLight).slice(0, 3);
    if (uniforms.lightDirectionals && uniforms.lightPositions &&
        uniforms.lightDirections && uniforms.lightAmbients &&
        uniforms.lightDiffuses && uniforms.lightSpeculars &&
        (uniforms.lightsCount !== undefined)) {
        let looper = 0;
        while (looper < lights.length) {
            uniforms.lightDirectionals.value[looper] = lights[looper].isDirectionalLight;
            if (uniforms.lightDirectionals.value[looper]) {
                targetPosition.set(0, 0, 0, 1);
                targetPosition.applyMatrix4(lights[looper].target.matrixWorld);
                position.set(0, 0, 0, 1);
                position.applyMatrix4(lights[looper].matrixWorld);
                lightDirection.set(
                    position.x - targetPosition.x, position.y - targetPosition.y,
                    position.z - targetPosition.z, 0);
                lightDirection.applyMatrix4(camera.matrixWorldInverse);
                uniforms.lightPositions.value[looper].set(lightDirection.x, lightDirection.y, lightDirection.z, 0);
                uniforms.lightDirections.value[looper].set(lightDirection.x, lightDirection.y, lightDirection.z, 0);
            } else {
                uniforms.lightPositions.value[looper].set(
                    lights[looper].position.x, lights[looper].position.y, lights[looper].position.z);
                uniforms.lightDirections.value[looper].set(
                    lights[looper].position.x, lights[looper].position.y, lights[looper].position.z);
            }
            uniforms.lightAmbients.value[looper].set(lights[looper].color.r, lights[looper].color.g, lights[looper].color.b, lights[looper].intensity);
            uniforms.lightDiffuses.value[looper].set(1, 1, 1, lights[looper].intensity);
            uniforms.lightSpeculars.value[looper * 2].set(1, 1, 1, lights[looper].intensity);
            uniforms.lightSpeculars.value[looper * 2 + 1].set(1, 1, 1, lights[looper].intensity);
            ++looper;
        }
        uniforms.lightsCount.value = lights.length;
    } else {
        if (uniforms.lightsCount) {
            uniforms.lightsCount.value = 0;
        }
    }

};

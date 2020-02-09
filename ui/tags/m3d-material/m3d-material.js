const THREE = require("../../scripts/three.js");

const mapKeys = Object.create(null);

mapKeys["color"] = "map";

const defaultVertexShader = $.res.load("/tags/m3d-material/default-shader.vert");
const defaultFragmentShader = $.res.load("/tags/m3d-material/default-shader.frag");

const prepareMaterial = function (dom) {

    let newMaterial = false;
    switch ($(dom).attr("preset")) {
        case "phong": {
            if ((!dom.m3dMaterial) || (!dom.m3dMaterial.isMeshPhongMaterial)) {
                if (dom.m3dMaterial) { dom.m3dMaterial.dispose(); }
                dom.m3dMaterial = new THREE.MeshPhongMaterial({});
                newMaterial = true;
            }
            break;
        };
        case "shader": {
            if ((!dom.m3dMaterial) || (!dom.m3dMaterial.isShaderMaterial)) {
                if (dom.m3dMaterial) { dom.m3dMaterial.dispose(); }

                let parameter = {};
                if (dom.m3dVertexShader && dom.m3dFragmentShader) {
                    parameter.vertexShader = dom.m3dVertexShader.code;
                    parameter.fragmentShader = dom.m3dFragmentShader.code;
                } else {
                    parameter.vertexShader = defaultVertexShader;
                    parameter.fragmentShader = defaultFragmentShader;
                }

                dom.m3dMaterial = new THREE.RawShaderMaterial(parameter);
                newMaterial = true;
            }
            break;
        }
        default: { break; };
    }

    if (newMaterial && dom.m3dMaterial) {
        dom.m3dMaterial.m3dFromTagObject = dom;
        delete dom.m3dTextures;
        syncID(dom, $(dom).attr("id"));
        syncColor(dom, $(dom).attr("color"));
        syncTextures(dom, $(dom).attr("textures"));
        syncSide(dom, $(dom).attr("side"));
        syncSkinning(dom, $(dom).attr("skinning"));
        syncTransparent(dom, $(dom).attr("transparent"));
        syncAlphaPremultiplied(dom, $(dom).attr("alpha-premultiplied"));
        syncAlphaTest(dom, $(dom).attr("alpha-test"));
        syncDepthTest(dom, $(dom).attr("depth-test"));
        syncDepthWrite(dom, $(dom).attr("depth-write"));
        syncDepthTestFunction(dom, $(dom).attr("depth-test-function"));
        syncBlendingSource(dom, $(dom).attr("blending-source"));
        syncBlendingDestination(dom, $(dom).attr("blending-destination"));
        syncBlendingEquation(dom, $(dom).attr("blending-equation"));
        syncStencilTest(dom, $(dom).attr("stencil-test"));
        syncStencilTestFunction(dom, $(dom).attr("stencil-test-function"));
        syncStencilTestReference(dom, $(dom).attr("stencil-test-reference"));
        syncStencilTestMask(dom, $(dom).attr("stencil-test-mask"));
        syncStencilWriteMask(dom, $(dom).attr("stencil-write-mask"));
        syncStencilFailed(dom, $(dom).attr("stencil-failed"));
        syncStencilZFailed(dom, $(dom).attr("stencil-z-failed"));
        syncStencilZPassed(dom, $(dom).attr("stencil-z-passed"));
        syncVertexShader(dom, $(dom).attr("vertex-shader"));
        syncFragmentShader(dom, $(dom).attr("fragment-shader"));
        syncUniforms(dom);
        trigMaterialUpdate(dom);
    }

    return dom.m3dMaterial;

};

const disposeMaterial = function (dom) {

    if (dom.m3dMaterial) {
        dom.m3dMaterial.dispose();
        delete dom.m3dMaterial;
    }

};

const syncColor = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.color.set(value);

};

const syncSide = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    switch (value) {
        case "both-sides": { dom.m3dMaterial.side = THREE.DoubleSide; break; };
        case "front-face": { dom.m3dMaterial.side = THREE.FrontSide; break; };
        case "back-face": { dom.m3dMaterial.side = THREE.BackSide; break; };
    }

};

const syncAlphaTest = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.alphaTest = parseFloat(value);

};

const syncSkinning = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.skinning = (value === "yes");

};

const syncDepthTest = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.depthTest = value === "yes";

};

const syncDepthWrite = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.depthWrite = value === "yes";

};

const syncDepthTestFunction = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    switch (value) {
        case "never": { dom.m3dMaterial.depthFunc = THREE.NeverDepth; break; }
        case "always": { dom.m3dMaterial.depthFunc = THREE.AlwaysDepth; break; }
        // case "equal-to": { dom.m3dMaterial.depthFunc = THREE.EqualDepth; break; }
        case "not-equal-to": { dom.m3dMaterial.depthFunc = THREE.NotEqualDepth; break; }
        case "less-than": { dom.m3dMaterial.depthFunc = THREE.LessDepth; break; }
        case "less-than-or-equal-to": { dom.m3dMaterial.depthFunc = THREE.LessEqualDepth; break; }
        case "greater-than": { dom.m3dMaterial.depthFunc = THREE.GreaterDepth; break; }
        case "greater-than-or-equal-to": { dom.m3dMaterial.depthFunc = THREE.GreaterDepth; break; }
    }

};

const syncBlendingEquation = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    let settings = value.trim().split(/[\s,]+/).filter(value => value.trim());
    if (settings.length === 1) {
        settings.push(settings[0]);
    }

    switch (settings[0]) {
        case "add": { dom.m3dMaterial.blendEquation = THREE.AddEquation; break; }
        case "subtract": { dom.m3dMaterial.blendEquation = THREE.SubtractEquation; break; }
        case "reverse-subtract": { dom.m3dMaterial.blendEquation = THREE.ReverseSubtractEquation; break; }
        case "min": { dom.m3dMaterial.blendEquation = THREE.MinEquation; break; }
        case "max": { dom.m3dMaterial.blendEquation = THREE.MaxEquation; break; }
    }

    switch (settings[1]) {
        case "add": { dom.m3dMaterial.blendEquationAlpha = THREE.AddEquation; break; }
        case "subtract": { dom.m3dMaterial.blendEquationAlpha = THREE.SubtractEquation; break; }
        case "reverse-subtract": { dom.m3dMaterial.blendEquationAlpha = THREE.ReverseSubtractEquation; break; }
        case "min": { dom.m3dMaterial.blendEquationAlpha = THREE.MinEquation; break; }
        case "max": { dom.m3dMaterial.blendEquationAlpha = THREE.MaxEquation; break; }
    }

};

const syncBlendingSource = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    let settings = value.trim().split(/[\s,]+/).filter(value => value.trim());
    if (settings.length === 1) {
        settings.push(settings[0]);
    }

    switch (settings[0]) {
        case "zero": { dom.m3dMaterial.blendSrc = THREE.ZeroFactor; break; }
        case "one": { dom.m3dMaterial.blendSrc = THREE.OneFactor; break; }
        case "source-color": { dom.m3dMaterial.blendSrc = THREE.SrcColorFactor; break; }
        case "one-minus-source-color": { dom.m3dMaterial.blendSrc = THREE.OneMinusSrcColorFactor; break; }
        case "destination-color": { dom.m3dMaterial.blendSrc = THREE.DstColorFactor; break; }
        case "one-minus-destination-color": { dom.m3dMaterial.blendSrc = THREE.OneMinusDstColorFactor; break; }
        case "source-alpha": { dom.m3dMaterial.blendSrc = THREE.SrcAlphaFactor; break; }
        case "one-minus-source-alpha": { dom.m3dMaterial.blendSrc = THREE.OneMinusSrcAlphaFactor; break; }
        case "destination-alpha": { dom.m3dMaterial.blendSrc = THREE.DstAlphaFactor; break; }
        case "one-minus-destination-alpha": { dom.m3dMaterial.blendSrc = THREE.OneMinusDstAlphaFactor; break; }
        case "source-alpha-saturate": { dom.m3dMaterial.blendSrc = THREE.SrcAlphaSaturateFactor; break; }
    }

    switch (settings[1]) {
        case "zero": { dom.m3dMaterial.blendSrcAlpha = THREE.ZeroFactor; break; }
        case "one": { dom.m3dMaterial.blendSrcAlpha = THREE.OneFactor; break; }
        case "source-color": { dom.m3dMaterial.blendSrcAlpha = THREE.SrcColorFactor; break; }
        case "one-minus-source-color": { dom.m3dMaterial.blendSrcAlpha = THREE.OneMinusSrcColorFactor; break; }
        case "destination-color": { dom.m3dMaterial.blendSrcAlpha = THREE.DstColorFactor; break; }
        case "one-minus-destination-color": { dom.m3dMaterial.blendSrcAlpha = THREE.OneMinusDstColorFactor; break; }
        case "source-alpha": { dom.m3dMaterial.blendSrcAlpha = THREE.SrcAlphaFactor; break; }
        case "one-minus-source-alpha": { dom.m3dMaterial.blendSrcAlpha = THREE.OneMinusSrcAlphaFactor; break; }
        case "destination-alpha": { dom.m3dMaterial.blendSrcAlpha = THREE.DstAlphaFactor; break; }
        case "one-minus-destination-alpha": { dom.m3dMaterial.blendSrcAlpha = THREE.OneMinusDstAlphaFactor; break; }
        case "source-alpha-saturate": { dom.m3dMaterial.blendSrcAlpha = THREE.SrcAlphaSaturateFactor; break; }
    }

};

const syncBlendingDestination = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    let settings = value.trim().split(/[\s,]+/).filter(value => value.trim());
    if (settings.length === 1) {
        settings.push(settings[0]);
    }

    switch (settings[0]) {
        case "zero": { dom.m3dMaterial.blendDst = THREE.ZeroFactor; break; }
        case "one": { dom.m3dMaterial.blendDst = THREE.OneFactor; break; }
        case "source-color": { dom.m3dMaterial.blendDst = THREE.SrcColorFactor; break; }
        case "one-minus-source-color": { dom.m3dMaterial.blendDst = THREE.OneMinusSrcColorFactor; break; }
        case "destination-color": { dom.m3dMaterial.blendDst = THREE.DstColorFactor; break; }
        case "one-minus-destination-color": { dom.m3dMaterial.blendDst = THREE.OneMinusDstColorFactor; break; }
        case "source-alpha": { dom.m3dMaterial.blendDst = THREE.SrcAlphaFactor; break; }
        case "one-minus-source-alpha": { dom.m3dMaterial.blendDst = THREE.OneMinusSrcAlphaFactor; break; }
        case "destination-alpha": { dom.m3dMaterial.blendDst = THREE.DstAlphaFactor; break; }
        case "one-minus-destination-alpha": { dom.m3dMaterial.blendDst = THREE.OneMinusDstAlphaFactor; break; }
        case "source-alpha-saturate": { dom.m3dMaterial.blendDst = THREE.SrcAlphaSaturateFactor; break; }
    }

    switch (settings[1]) {
        case "zero": { dom.m3dMaterial.blendDstAlpha = THREE.ZeroFactor; break; }
        case "one": { dom.m3dMaterial.blendDstAlpha = THREE.OneFactor; break; }
        case "source-color": { dom.m3dMaterial.blendDstAlpha = THREE.SrcColorFactor; break; }
        case "one-minus-source-color": { dom.m3dMaterial.blendDstAlpha = THREE.OneMinusSrcColorFactor; break; }
        case "destination-color": { dom.m3dMaterial.blendDstAlpha = THREE.DstColorFactor; break; }
        case "one-minus-destination-color": { dom.m3dMaterial.blendDstAlpha = THREE.OneMinusDstColorFactor; break; }
        case "source-alpha": { dom.m3dMaterial.blendDstAlpha = THREE.SrcAlphaFactor; break; }
        case "one-minus-source-alpha": { dom.m3dMaterial.blendDstAlpha = THREE.OneMinusSrcAlphaFactor; break; }
        case "destination-alpha": { dom.m3dMaterial.blendDstAlpha = THREE.DstAlphaFactor; break; }
        case "one-minus-destination-alpha": { dom.m3dMaterial.blendDstAlpha = THREE.OneMinusDstAlphaFactor; break; }
        case "source-alpha-saturate": { dom.m3dMaterial.blendDstAlpha = THREE.SrcAlphaSaturateFactor; break; }
    }

};

const syncStencilTest = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.stencilWrite = (value === "yes");

};

const syncStencilTestFunction = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    switch (value) {
        case "never": { dom.m3dMaterial.stencilFunc = THREE.NeverStencilFunc; break; }
        case "always": { dom.m3dMaterial.stencilFunc = THREE.AlwaysStencilFunc; break; }
        case "less-than": { dom.m3dMaterial.stencilFunc = THREE.LessStencilFunc; break; }
        case "less-than-or-equal-to": { dom.m3dMaterial.stencilFunc = THREE.LessEqualStencilFunc; break; }
        case "greater-than": { dom.m3dMaterial.stencilFunc = THREE.GreaterStencilFunc; break; }
        case "greater-than-or-equal-to": { dom.m3dMaterial.stencilFunc = THREE.GreaterEqualStencilFunc; break; }
        case "equal-to": { dom.m3dMaterial.stencilFunc = THREE.EqualStencilFunc; break; }
        case "not-equal-to": { dom.m3dMaterial.stencilFunc = THREE.NotEqualStencilFunc; break; }
    }

};

const syncStencilTestReference = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.stencilRef = parseInt(value);

};

const syncStencilTestMask = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.stencilFuncMask = parseInt(value);

};

const syncStencilWriteMask = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }

    dom.m3dMaterial.stencilWriteMask = parseInt(value);

};

const syncStencilFailed = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }
   
    switch (value) {
        case "keep": { dom.m3dMaterial.stencilFail = THREE.KeepStencilOp; break; }
        case "zero": { dom.m3dMaterial.stencilFail = THREE.ZeroStencilOp; break; }
        case "replace": { dom.m3dMaterial.stencilFail = THREE.ReplaceStencilOp; break; }
        case "increment": { dom.m3dMaterial.stencilFail = THREE.IncrementStencilOp; break; }
        case "decrement": { dom.m3dMaterial.stencilFail = THREE.DecrementStencilOp; break; }
        case "invert": { dom.m3dMaterial.stencilFail = THREE.InvertStencilOp; break; }
        case "incrementWrap": { dom.m3dMaterial.stencilFail = THREE.IncrementWrapStencilOp; break; }
        case "decrementWrap": { dom.m3dMaterial.stencilFail = THREE.DecrementWrapStencilOp; break; }
    }

};

const syncStencilZFailed = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }
   
    switch (value) {
        case "keep": { dom.m3dMaterial.stencilZFail = THREE.KeepStencilOp; break; }
        case "zero": { dom.m3dMaterial.stencilZFail = THREE.ZeroStencilOp; break; }
        case "replace": { dom.m3dMaterial.stencilZFail = THREE.ReplaceStencilOp; break; }
        case "increment": { dom.m3dMaterial.stencilZFail = THREE.IncrementStencilOp; break; }
        case "decrement": { dom.m3dMaterial.stencilZFail = THREE.DecrementStencilOp; break; }
        case "invert": { dom.m3dMaterial.stencilZFail = THREE.InvertStencilOp; break; }
        case "incrementWrap": { dom.m3dMaterial.stencilZFail = THREE.IncrementWrapStencilOp; break; }
        case "decrementWrap": { dom.m3dMaterial.stencilZFail = THREE.DecrementWrapStencilOp; break; }
    }

};

const syncStencilZPassed = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }
   
    switch (value) {
        case "keep": { dom.m3dMaterial.stencilZPass = THREE.KeepStencilOp; break; }
        case "zero": { dom.m3dMaterial.stencilZPass = THREE.ZeroStencilOp; break; }
        case "replace": { dom.m3dMaterial.stencilZPass = THREE.ReplaceStencilOp; break; }
        case "increment": { dom.m3dMaterial.stencilZPass = THREE.IncrementStencilOp; break; }
        case "decrement": { dom.m3dMaterial.stencilZPass = THREE.DecrementStencilOp; break; }
        case "invert": { dom.m3dMaterial.stencilZPass = THREE.InvertStencilOp; break; }
        case "incrementWrap": { dom.m3dMaterial.stencilZPass = THREE.IncrementWrapStencilOp; break; }
        case "decrementWrap": { dom.m3dMaterial.stencilZPass = THREE.DecrementWrapStencilOp; break; }
    }

};

const syncTransparent = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }
   
    dom.m3dMaterial.transparent = value === "yes";

};

const syncAlphaPremultiplied = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (!value) {
        return;
    }
    
    dom.m3dMaterial.premultipliedAlpha = value === "yes";

};

const syncID = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    if (dom.m3dMaterial.name !== value) {
        dom.m3dMaterial.name = value;
        trigMaterialUpdate(dom);
    }

};

let shaderCodes = Object.create(null);

const syncVertexShader = function (dom, value) {

    if (!value) { return; }

    if (!dom.m3dMaterial) { return; }

    if (!dom.m3dMaterial.isShaderMaterial) { return; }

    if (dom.m3dVertexShader && (dom.m3dVertexShader.value === value)) { return; }

    let origin = value;

    if (value && value[0] === "@") {
        let base = dom;
        while (base && base.localName && 
               ((base.localName.toLowerCase() !== "m3d-object") || 
                (!$(base).attr("base")))) {
            if (base.localName.toLowerCase() === "m3d-object") {
                console.log($(base).attr("base"));
            }
            base = base.parentNode;
        }
        if (base) {
            let url = $(base).attr("base");
            if (url[url.length - 1] !== "/") {
                url += "/";
            }
            value = url + value.slice(1);
        }
    }
    if (value && value[0] === "@") { return; }

    let resetShader = (error, shader) => {

        if (error) {
            console.error(error); return;
        }

        if ($(dom).attr("vertex-shader") !== origin) { return; }

        dom.m3dVertexShader = { "value": origin, "code": shader };

        if (!dom.m3dMaterial) { return; }

        if (!dom.m3dMaterial.isShaderMaterial) { return; }

        disposeMaterial(dom);
        prepareMaterial(dom);

    };

    if (shaderCodes[value]) {
        if (shaderCodes[value].code) {
            resetShader(undefined, shaderCodes[value].code);
        } else if (shaderCodes[value].error) {
            resetShader(shaderCodes[value].error);
        } else {
            shaderCodes[value].callbacks.push(resetShader);
        }
        return;
    }

    shaderCodes[value] = { "callbacks": [] };

    $.ajax(value, {
        "dataType": "text",
        "success": (result) => {

            shaderCodes[value].code = result;

            try {
                resetShader(undefined, result);
            } catch (error) {
                console.error(error);
            }

            let callbacks = shaderCodes[value].callbacks;
            delete shaderCodes[value].callbacks;
            for (let callback of callbacks) {
                try {
                    callback(undefined, result);
                } catch (error) {
                    console.error(error);
                }
            }

        },
        "error": () => {

            shaderCodes[value].error = new Error(`Failed to load vertex shader[${value}]`);

            try {
                resetShader(shaderCodes[value].error);
            } catch (error) {
                console.error(error);
            }

            let callbacks = shaderCodes[value].callbacks;
            delete shaderCodes[value].callbacks;
            for (let callback of callbacks) {
                try {
                    callback(shaderCodes[value].error);
                } catch (error) {
                    console.error(error);
                }
            }

        }
    });

};

const syncFragmentShader = function (dom, value) {

    if (!value) { return; }

    if (!dom.m3dMaterial) { return; }

    if (!dom.m3dMaterial.isShaderMaterial) { return; }

    if (dom.m3dFragmentShader && (dom.m3dFragmentShader.value === value)) { return; }

    let origin = value;

    if (value && value[0] === "@") {
        let base = dom;
        while (base && base.localName && 
               ((base.localName.toLowerCase() !== "m3d-object") || 
                (!$(base).attr("base")))) {
            base = base.parentNode;
        }
        if (base) {
            let url = $(base).attr("base");
            if (url[url.length - 1] !== "/") {
                url += "/";
            }
            value = url + value.slice(1);
        }
    }

    if (value && value[0] === "@") {
        return;
    }

    let resetShader = (error, shader) => {

        if (error) {
            console.error(error); return;
        }

        if ($(dom).attr("fragment-shader") !== origin) { return; }

        dom.m3dFragmentShader = { "value": origin, "code": shader };

        if (!dom.m3dMaterial) { return; }

        if (!dom.m3dMaterial.isShaderMaterial) { return; }

        disposeMaterial(dom);
        prepareMaterial(dom);

    };

    if (shaderCodes[value]) {
        if (shaderCodes[value].code) {
            resetShader(undefined, shaderCodes[value].code);
        } else if (shaderCodes[value].error) {
            resetShader(shaderCodes[value].error);
        } else {
            shaderCodes[value].callbacks.push(resetShader);
        }
        return;
    }

    shaderCodes[value] = { "callbacks": [] };

    $.ajax(value, {
        "dataType": "text",
        "success": (result) => {

            shaderCodes[value].code = result;

            try {
                resetShader(undefined, result);
            } catch (error) {
                console.error(error);
            }

            let callbacks = shaderCodes[value].callbacks;
            delete shaderCodes[value].callbacks;
            for (let callback of callbacks) {
                try {
                    callback(undefined, result);
                } catch (error) {
                    console.error(error);
                }
            }

        },
        "error": () => {

            shaderCodes[value].error = new Error(`Failed to load fragment shader[${value}]`);

            try {
                resetShader(shaderCodes[value].error);
            } catch (error) {
                console.error(error);
            }

            let callbacks = shaderCodes[value].callbacks;
            delete shaderCodes[value].callbacks;
            for (let callback of callbacks) {
                try {
                    callback(shaderCodes[value].error);
                } catch (error) {
                    console.error(error);
                }
            }

        }
    });

};

const syncTextures = function (dom, value) {

    if (!dom.m3dMaterial) { return; }

    // get the scene
    let scene = dom;
    while (scene && ((!scene.localName) || (scene.localName.toLowerCase() !== "m3d-scene"))) {
        scene = scene.parentNode;
    }

    if (!scene) {
        return;
    }

    if (!dom.m3dTextures) {
        dom.m3dTextures = Object.create(null);
    }

    let textures = value.trim().split(";").map((id) => id.trim()).filter((id) => id);
    textures.forEach((texture) => {

        let usage = texture.split(":")[0];
        let target = texture.split(":").slice(1).join(":");
        if (!target) {
            target = usage; usage = "color";
        }

        if (!dom.m3dTextures[usage]) {
            dom.m3dTextures[usage] = {
                "updater": () => {
                    let changed = true;
                    let removed = true;
                    let textures = $(dom).attr("textures");
                    if (textures) {
                        textures.trim().split(";").map((id) => id.trim()).forEach((texture) => {
                            let newUsage = texture.split(":")[0];
                            let newTarget = texture.split(":").slice(1).join(":");
                            if (!newTarget) {
                                newTarget = newUsage; newUsage = "color";
                            }
                            if (newUsage === usage) {
                                removed = false;
                                if (target === newTarget) {
                                    changed = false;
                                }
                            }
                        });
                    }
                    if (changed) {
                        dom.m3dTextures[usage].scene.m3dUninstallTextureListener(target, dom.m3dTextures[usage].updater);
                        delete dom.m3dTextures[usage].scene;
                        if (removed) {
                            return;
                        }
                    }
                    if (!dom.m3dMaterial) {
                        return;
                    }
                    let m3dTexture = undefined;
                    let lastScene = false;
                    let parent = dom;
                    while (parent && (!lastScene) && (!m3dTexture)) {
                        lastScene = (parent.localName && (parent.localName.toLowerCase() === "m3d-scene")) ? true : false;
                        m3dTexture = $(parent).find("#" + target)[0];
                        parent = parent.parentNode;
                    }
                    if (m3dTexture) {
                        if (mapKeys[usage]) {
                            dom.m3dMaterial[mapKeys[usage]] = m3dTexture.m3dGetTexture();
                        } else {
                            let name = usage;
                            if (name[0] === "@") { name = name.slice(1); }
                            if (dom.m3dMaterial.uniforms) {
                                dom.m3dMaterial.uniforms[name] = new THREE.Uniform(m3dTexture.m3dGetTexture());
                            }
                        }
                        // TODO: remove last texture for dispose
                    }
                }
            };
        }

        if (dom.m3dTextures[usage].scene) {
            if (dom.m3dTextures[usage].scene !== scene) {
                dom.m3dTextures[usage].scene.m3dUninstallTextureListener(target, dom.m3dTextures[usage].updater);
                dom.m3dTextures[usage].scene = scene;
                dom.m3dTextures[usage].scene.m3dInstallTextureListener(target, dom.m3dTextures[usage].updater);
                dom.m3dTextures[usage].updater();
            }
        } else {
            dom.m3dTextures[usage].scene = scene;
            dom.m3dTextures[usage].scene.m3dInstallTextureListener(target, dom.m3dTextures[usage].updater);
            dom.m3dTextures[usage].updater();
        }

    });

};

const syncUniforms = function (dom) {

    if (!dom.m3dMaterial) { return; }

    if (dom.syncingUniform) { return; }

    if (!dom.m3dMaterial.uniforms) { return; }

    let notPrepared = false;
    let uniforms = $(dom).children("m3d-uniform");
    for (let uniform of uniforms) {
        if (!uniform.m3dGetUniform) {
            notPrepared = true;
        }
    }

    if (notPrepared) {
        dom.syncingUniform = true;
        $.delay(() => {
            dom.syncingUniform = false;
            syncUniforms(dom);
        });
        return;
    }
    
    let oldNames = Object.create(null);
    for (let key in dom.m3dMaterial.uniforms) {
        if (!dom.m3dMaterial.uniforms[key].value.isTexture) {
            oldNames[key] = true;
        }
    }

    for (let uniform of uniforms) {
        let name = $(uniform).attr("name");
        delete oldNames[name];
        dom.m3dMaterial.uniforms[name] = uniform.m3dGetUniform();
    }

    for (let oldName in oldNames) {
        delete dom.m3dMaterial.uniforms[oldName];
    }

};

const trigMaterialUpdate = function (dom) {

    let parent = dom.parentNode;
    while (parent && ((!parent.localName) || (parent.localName.toLowerCase() !== "m3d-scene"))) {
        parent = parent.parentNode;
    }

    let id = $(dom).attr("id");

    if (parent && id) {
        parent.m3dTrigMaterialUpdate(id);
    }

};

module.exports = {
    "attributes": [
        "preset",
        "id", "color",
        "textures",
        "side", "alpha-test",
        "transparent", "alpha-premultiplied",
        "depth-test", "depth-write", "depth-test-function",
        "skinning",
        "vertex-shader", "fragment-shader",
        "stencil-test", "stencil-test-function", "stencil-test-reference", "stencil-test-mask",
        "stencil-failed", "stencil-z-failed", "stencil-z-passed",
        "stencil-write-mask", 
        "blending-destination", "blending-equation", "blending-source",
    ],
    "listeners": {
        "onconnected": function () {
            this.observer = new MutationObserver(() => {
                syncUniforms(this);
            });
            this.observer.observe(this, { "characterData": true, "subtree": true });
            syncTextures(this, $(this).attr("textures"));
            trigMaterialUpdate(this);
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "preset": { prepareMaterial(this); break; };
                case "id": { syncID(this, value); break; };
                case "color": { syncColor(this, value); break; };
                case "textures": { syncTextures(this, value); break; };
                case "side": { syncSide(this, value); break; };
                case "transparent": { syncTransparent(this, value); break; };
                case "alpha-premultiplied": { syncAlphaPremultiplied(this, value); break; };
                case "skinning": { syncSkinning(this, value); break; };
                case "alpha-test": { syncAlphaTest(this, value); break; };
                case "depth-test": { syncDepthTest(this, value); break; };
                case "depth-write": { syncDepthWrite(this, value); break; };
                case "depth-test-function": { syncDepthTestFunction(this, value); break; }
                case "vertex-shader": { syncVertexShader(this, value); break; }
                case "fragment-shader": { syncFragmentShader(this, value); break; }
                case "stencil-test": { syncStencilTest(this, value); break; }
                case "stencil-test-function": { syncStencilTestFunction(this, value); break; }
                case "stencil-test-reference": { syncStencilTestReference(this, value); break; }
                case "stencil-test-mask": { syncStencilTestMask(this, value); break; }
                case "stencil-write-mask": { syncStencilWriteMask(this, value); break; }
                case "stencil-failed": { syncStencilFailed(this, value); break; }
                case "stencil-z-failed": { syncStencilZFailed(this, value); break; }
                case "stencil-z-passed": { syncStencilZPassed(this, value); break; }
                case "blending-source": { syncBlendingSource(this, value); break; }
                case "blending-destination": { syncBlendingDestination(this, value); break; }
                case "blending-equation": { syncBlendingEquation(this, value); break; }
                default: { break; };
            }
        },
        "ondisconnected": function () {
            disposeMaterial(this);
        }
    },
    "methods": {
        "m3dGetMaterial": function () {
            return prepareMaterial(this);
        }
    }
};

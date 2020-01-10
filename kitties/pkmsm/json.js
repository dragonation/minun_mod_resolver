const { PICA } = require("./pica.js");


const { Texture } = require("./texture.js");
const { Shader } = require("./shader.js");
const { Motion } = require("./motion.js");

const { Model } = require("./model.js");


const outlineDepthWritePresets = {
    "pm0351_14-PDC_pm_uniran_CellGRE": true,
    "pm0442_00-PDC_BodyGRE": true,
    "pm0442_00-PDC_BodyGRE@pm0442_00_BodyASkin1": false,
    "pm0500_00-PDC_pm_enbuoh_FireALW": [false, true],
    "pm0577_00-PDC_pm_uniran_CellGRE": true,
    "pm0578_00-PDC_pm_uniran_CellGRE": true,
    "pm0579_00-PDC_pm_uniran_CellGRE": true,
    "pm0850_00-PDC_pm_uniran_CellGRE": true
};

const outlineDepthAlphaPresets = {
    // 004
    "pm0004_00-FireCore_FireWingGRE": 0.5,
    "pm0004_00-FireSten_lizardonGRE": 0.5,
    // 005
    "pm0005_00-FireCore_FireWingGRE": 0.5,
    "pm0005_00-FireSten_lizardonGRE": 0.5,
    // 006
    "pm0006_00-FireCore_FireWingGRE": 0.5,
    "pm0006_00-FireSten_lizardonGRE": 0.5,
    "pm0006_51-FireCore_FireWingGRE": 0.5,
    "pm0006_51-FireSten_lizardonGRE": 0.5,
    "pm0006_52-FireCore_FireWingGRE": 0.5,
    "pm0006_52-FireSten_lizardonGRE": 0.5,
    // 015
    "pm0015_00-PDC_pm_rediba_WingGRE": 0.5,
    "pm0015_51-PDC_pm_rediba_WingGRE": 0.5,
    // 077
    "pm0077_00-FireCore_FireWingGRE": 0.5,
    "pm0077_00-FireSten_lizardonGRE": 0.5,
    // 078
    "pm0078_00-FireCore_FireWingGRE": 0.5,
    "pm0078_00-FireSten_lizardonGRE": 0.5,
    // 092
    // "pm0092_00-FireGeom_ghosGRE": 0,
    // "pm0092_00-FireCore_ghosGRE": 0,
    // "pm0092_00-FireSten_ghosGRE": 0,
    // 094
    "pm0094_51-PDC_pm_megagangar_MaskALW": 0,
    // 105
    "pm0105_61-FireCore_FireWingGRE": 0.5,
    "pm0105_61-FireSten_lizardonGRE": 0.5,
    // 109
    "pm0109_00-FireSten_dogarsGRE": 0.5,
    "pm0109_00-FireGeom_lizardonGRE": 0.5,
    "pm0109_00-FireCore_FireWingGRE": 0.5,
    // 110
    "pm0110_00-FireSten_dogarsGRE": 0.5,
    "pm0110_00-FireGeom_lizardonGRE": 0.5,
    "pm0110_00-FireCore_FireWingGRE": 0.5,
    // 123
    "pm0123_00-PDC_pm_rediba_WingGRE": 0.5,
    // 126
    "pm0126_00-FireCore_FireWingGRE": 0.5,
    "pm0126_00-FireSten_lizardonGRE": 0.5,
    // 127
    "pm0127_51-PDC_pm_rediba_WingGRE": 0.5,
    // 146
    "pm0146_00-FireCore_FireWingGRE": 0.5,
    "pm0146_00-FireSten_lizardonGRE": 0.5,
    // 155
    "pm0155_00-PDC_pm_hinoarashi_FireGRE": 0.5,
    // 156
    "pm0156_00-PDC_pm_hinoarashi_FireGRE": 0.5,
    // 157
    "pm0157_00-PDC_pm_hinoarashi_FireGRE": 0.5,
    // 165
    "pm0165_00_rediba-PDC_pm_rediba_WingGRE": 0.5,
    // 166
    "pm0166_00_redian-PDC_pm_rediba_WingGRE": 0.5,
    // 170
    "pm0170_00-PDC_pm_chonchie_GlowGRE": 0,
    // 171
    "pm0171_00-PDC_pm_chonchie_GlowGRE": 0,
    // 179
    "pm0179_00-PDC_pm_pokabu_TailGRE": 0,
    // 180
    "pm0180_00-PDC_pm_pokabu_TailGRE": 0,
    // 181
    "pm0181_00-PDC_pm_pokabu_TailGRE": 0,
    "pm0181_51-PDC_pm_pokabu_TailGRE": 0,
    // 183
    "pm0183_00-PDC_pm_pokabu_TailGRE": 0,
    // 184
    "pm0184_00-PDC_pm_pokabu_TailGRE": 0,
    // 189
    "pm0189_00-PDC_BodyALW": 0,
    // 193
    "pm0193_00-PDC_pm_rediba_WingGRE": 0.5,
    // 212
    "pm0212_00_hassam-PDC_pm_rediba_WingGRE": 0.5,
    "pm0212_51-PDC_pm_rediba_WingGRE": 0.5,
    // 219
    "pm0219_00-FireCore_FireWingGRE": 0.5,
    "pm0219_00-FireSten_lizardonGRE": 0.5,
    // 239
    "pm0239_00-PDC_pm_zebraika_ThunderGRE": 0,
    // 251
    "pm0251_00-PDC_pm_rediba_WingGRE": 0.5,
    // 257
    "pm0257_00_bursyamo-FireCore_FireWingGRE": 0.5,
    "pm0257_00_bursyamo-FireSten_lizardonGRE": 0.5,
    "pm0257_51-FireCore_FireWingGRE": 0.5,
    "pm0257_51-FireSten_lizardonGRE": 0.5,
    // 290
    "pm0290_00-PDC_pm_rediba_WingGRE": 0.5,
    // 313
    "pm0313_00-PDC_pm_pokabu_TailGRE": 0,
    "pm0313_00-PDC_pm_rediba_WingGRE": 0.5,
    // 314
    "pm0314_00-PDC_pm_rediba_WingGRE": 0.5,
    // 324
    "pm0324_00-FireGeom_lizardonGRE": 0.5,
    "pm0324_00-FireCore_FireWingGRE": 0.5,
    "pm0324_00-FireSten_cotoiseGRE": 0.5,
    // 330
    "pm0330_00-PDC_pm_rediba_WingGRE": 0.5,
    // 355
    "pm0355_00-PDC_pm_pokabu_TailGRE": 0,
    // 382
    "pm0382_51-PDC_pm_kyogresp_Lay1_Core_YellowGRE": 0,
    "pm0382_51-PDC_pm_kyogresp_Lay1_Core_RedGRE": 0,
    // 390
    "pm0390_00-FireCore_FireWingGRE": 0.5,
    "pm0390_00-FireSten_lizardonGRE": 0.5,
    // 391
    "pm0391_00-FireCore_FireWingGRE": 0.5,
    "pm0391_00-FireSten_lizardonGRE": 0.5,
    // 392
    "pm0392_00-FireCore_FireWingGRE": 0.5,
    "pm0392_00-FireSten_lizardonGRE": 0.5,
    // 442
    "pm0442_00-PDC_BodyGRE": 0.5,
    // 469
    "pm0469_00-PDC_pm_rediba_WingGRE": 0.5,
    // 477
    "pm0477_00-PDC_pm_pokabu_TailGRE": 0,
    // 479
    "pm0479_11-PDC_pm_hinoarashi_FireGRE": 0,
    "pm0479_11-PDC_pm_hinoarashi_FireALW": 0,
    "pm0479_12-PDC_pm_hinoarashi_FireGRE": 0,
    "pm0479_12-PDC_pm_hinoarashi_FireALW": 0,
    "pm0479_13-PDC_pm_hinoarashi_FireGRE": 0,
    "pm0479_13-PDC_pm_hinoarashi_FireALW": 0,
    "pm0479_14-PDC_pm_hinoarashi_FireGRE": 0,
    "pm0479_14-PDC_pm_hinoarashi_FireALW": 0,
    "pm0479_15-PDC_pm_hinoarashi_FireGRE": 0,
    "pm0479_15-PDC_pm_hinoarashi_FireALW": 0,
    "pm0479_16-PDC_pm_hinoarashi_FireGRE": 0,
    "pm0479_16-PDC_pm_hinoarashi_FireALW": 0,
    // 488
    "pm0488_00-PDC_pm_pokabu_TailGRE": 0,
    "pm0488_00-PDC_pm_hinoarashi_FireGRE": 0.5,
    // 490
    "pm0490_00-PDC_pm_pokabu_TailGRE": 0,
    // 494
    "pm0494_00-PDC_pm0150_51_Neuron2GRE": 0,
    // 498
    "pm0498_00-PDC_pm_pokabu_TailGRE": 0,
    // 500
    "pm0500_00-PDC_pm_enbuoh_FireALW": 0.5,
    // 577
    "pm0577_00-PDC_pm_uniran_CellGRE": 0.5,
    // 578
    "pm0578_00-PDC_pm_uniran_CellGRE": 0.5,
    // 579
    "pm0579_00-PDC_pm_uniran_CellGRE": 0.5,
    // 607
    "pm0607_00-PDC_pm_chandela_FireGRE": 0.5,
    // 608
    "pm0608_00-PDC_pm_uniran_CellGRE": 0.5,
    // 609
    "pm0609_00-PDC_pm_chandela_FireGRE": 0.5,
    "pm0609_00-PDC_pm_chandela_FireALW": 0.5,
    // 646
    "pm0646_00-PDC_pm_uniran_CellGRE": 0.5,
    "pm0646_13-PDC_pm_zebraika_ThunderGRE": 0,
    // 649
    "pm0649_11_genesect-PDC_pm_genesect_EyeGRE": 0.5,
    // 654
    "pm0718_00-FireCore_FireWingGRE": 0.5,
    "pm0718_00-FireSten_lizardonGRE": 0.5,
    // 655
    "pm0719_00-FireCore_FireWingGRE": 0.5,
    "pm0719_00-FireSten_lizardonGRE": 0.5,
    // 686
    "pm0726_00-PDC_pm_uniran_CellGRE": 0.5,
    "pm0726_00-PDC_pm_kurumiru_LeafALW": 0.5,
    // 687
    "pm0727_00-PDC_pm_uniran_CellGRE": 0.5,
    // 719
    "pm0772_51-PDC_pm_megadiancie_veilGRE": 0.5,
    // 738
    "pm0838_00-PDC_pm_rediba_WingGRE": 0.5,
    // 742
    "pm0834_00-PDC_pm_rediba_WingGRE": 0.5,
    // 743
    "pm0835_00-PDC_pm_rediba_WingGRE": 0.5,
    // 751
    "pm0850_00-PDC_pm_uniran_CellGRE": 0.5,
    // 752
    "pm0851_00-PDC_pm_uniran_CellGRE": 0.5,
    // 755
    "pm0803_00-PDC_pm_chonchie_Glow_AttEffNoneGRE": 0,
    // 757
    "pm0805_00-FireSten_lizardonGRE": 0.5,
    "pm0805_00-FireCore_dokutokage1GRE": 0.5,
    // 758
    "pm0806_00-FireSten_lizardonGRE": 0.5,
    "pm0806_00-FireCore_dokutokage1GRE": 0.5,
    // 778
    "pm0819_11-PDC_pm0819_horror_EffectGRE": 0,
    "pm0819_12-PDC_pm0819_horror_EffectGRE": 0,
    "pm0819_13-PDC_pm0819_horror_EffectGRE": 0,
    "pm0819_14-PDC_pm0819_horror_EffectGRE": 0,
    // 789
    "pm0871_00-FireGeom_pm0872mayu_BillbordGRE": 0,
    // 790
    "pm0872_00-FireGeom_pm0872mayu_BillbordGRE": 0,
    // 794
    "pm0877_00-PDC_pm0877_yellow_bubbleGRE": 0,
    // 795
    "pm0879_00-PDC_Body_ShadowGRE": 0.5,
    // 796
    "pm0878_00-PDC_pm_chonchie_GlowGRE": 0,
    // 800
    "pm0865_00-PDC_Body_Shadow_HLtAddTexLinearGRE": 0,
    "pm0865_12-PDC_Body_Shadow_HLtAddTexLinearGRE": 0,
    "pm0865_13-PDC_Body_Shadow_HLtAddTexLinearGRE": 0,
};

const useDirectNormalPresets = {
    "pm0061_00-BodyNyorobon": true,
    "pm0062_00-BodyNyorobon": true,
    "pm0094_00-Body": true,
    "pm0582_00-BodyBaivanilla_IceVco": true,
    "pm0583_00-BodyBaivanilla_IceVco": true,
    "pm0584_00-BodyBaivanilla_IceVco": true
};


const Quaternion = function Quaternion(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = (w !== undefined) ? w : 1;
};

Quaternion.prototype.setFromEuler = function (x, y, z, order) {

    var cos = Math.cos;
    var sin = Math.sin;

    var c1 = cos(x / 2); var c2 = cos(y / 2); var c3 = cos(z / 2);
    var s1 = sin(x / 2); var s2 = sin(y / 2); var s3 = sin(z / 2);

    if (order === "XYZ") {
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
    } else if (order === "YXZ") {
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
    } else if (order === "ZXY") {
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
    } else if (order === "ZYX") {
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
    } else if (order === "YZX") {
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 + s1 * c2 * s3;
        this.z = c1 * c2 * s3 - s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
    } else if (order === "XZY") {
        this.x = s1 * c2 * c3 - c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 + s1 * s2 * s3;
    }
    return this;
};

Quaternion.prototype.setFromAxisAngle = function(axis, angle) {

    var halfAngle = angle / 2, s = Math.sin(halfAngle);

    this.x = axis.x * s;
    this.y = axis.y * s;
    this.z = axis.z * s;
    this.w = Math.cos(halfAngle);

    return this;

};


const Vector3 = function Vector3(x, y, z) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
};

Object.defineProperty(Vector3.prototype, "length", {
    "get": function () {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z)
    }
});

Vector3.prototype.normalize = function () {

    let length = this.length;
    if (length === 0) {
        length = 1;
    }

    this.x /= length;
    this.y /= length;
    this.z /= length;

};


const interpolationTimes = 2.5; // upgrade to 60 fps

const interpolateFrames = function (animation, track, keys, noTweenBetweenTwo24FPSFrames) {

    let frames = [];
    (keys ? keys : [""]).forEach((axis) => {

        const record = axis ? track[axis] : track;
        if (!record) {
            return;
        }

        let keyFrame = 0;

        let frame = 0;
        while (frame < animation.frames) {

            if (!frames[frame]) {
                frames[frame] = {};
            }

            if (record.frames.length > 0) {
                let value = null;
                if (typeof record.frames[keyFrame].value === "boolean") {
                    value = record.frames[keyFrame].value;
                } else {
                    if (noTweenBetweenTwo24FPSFrames) {
                        if (record.frames[keyFrame] && record.frames[keyFrame + 1] && (record.frames[keyFrame + 1].frame - record.frames[keyFrame].frame === 1)) {
                            value = record.frames[keyFrame].value;
                        } else if ((!record.frames[keyFrame]) && record.frames[keyFrame + 1]) {
                            value = record.frames[keyFrame + 1].value;
                        } else if ((!record.frames[keyFrame + 1]) && record.frames[keyFrame]) {
                            value = record.frames[keyFrame].value;
                        } else if (record.frames[keyFrame] && record.frames[keyFrame + 1] &&
                                   (record.frames[keyFrame + 1].value === record.frames[keyFrame].value)) {
                            value = record.frames[keyFrame].value;
                        } else {
                            value = Motion.interpolate(
                                record.frames[keyFrame], record.frames[keyFrame + 1],
                                frame / interpolationTimes);
                        }
                    } else {
                        value = Motion.interpolate(
                            record.frames[keyFrame], record.frames[keyFrame + 1],
                            frame / interpolationTimes);
                    }
                }
                if (axis) {
                    frames[frame][axis] = value;
                } else {
                    frames[frame] = value;
                }
                if ((keyFrame < record.frames.length - 1) &&
                    (frame / interpolationTimes >= record.frames[keyFrame + 1].frame)) {
                    ++keyFrame;
                }
            } else {
                throw new Error("No value provided");
                // if (threeKey === "quaternion") {
                //     frames[frame][axis] = 0;
                // } else {
                //     // TODO: ???
                //     frames[frame][axis] = bone[boneKey][index % 3];
                // }
            }

            ++frame;
        }

    });

    return frames;

};

const interpolateBoneTransform = function (animation, transform, property) {

    let track = transform[property];

    if (!track) { return; }

    if ((!track.x) && (!track.y) && (!track.z)) { return; }

    let frames = interpolateFrames(animation, track, ["x", "y", "z"]);

    if (property === "rotations") {

        let quaternion = new Quaternion();
        let axis = new Vector3();

        if (!animation.tracks.bones[transform.bone]) {
            animation.tracks.bones[transform.bone] = {};
        }

        animation.tracks.bones[transform.bone].quaternion = {
            "constant": track.x.constant && track.y.constant && track.z.constant,
            "frames": frames.map((frame) => {
                if (track.halfAxisAngle) {
                    axis.x = frame.x, axis.y = frame.y, axis.z = frame.z;
                    const angle = axis.length * 2; // 3DS optimized for half value
                    axis.normalize();
                    quaternion.setFromAxisAngle(axis, angle);
                } else {
                    quaternion.setFromEuler(frame.x, frame.y, frame.z, "ZYX");
                }
                return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
            })
        };

    } else {

        if (!animation.tracks.bones[transform.bone]) {
            animation.tracks.bones[transform.bone] = {};
        }

        let single = null;
        switch (property) {
            case "translations": { single = "position"; break; }
            case "scales": { single = "scale"; break; }
        }

        ["x", "y", "z"].forEach((axis) => {
            if (frames[0].hasOwnProperty(axis)) {
                animation.tracks.bones[transform.bone][`${single}.${axis}`] = {
                    "constant": track[axis].constant,
                    "frames": frames.map((frame) => frame[axis])
                };
            }
        });

    }

};

const interpolateTextureTransform = function (animation, transform, property) {

    let track = transform[property];

    if (!track) { return; }

    let keys = null;
    if (property === "rotations") {
        if (!track.z) { return; }
        keys = ["z"];
    } else {
        if ((!track.x) && (!track.y)) { return; }
        keys = ["x", "y"];
    }

    let frames = interpolateFrames(animation, track, keys, true);

    if (property === "rotations") {

        if (!animation.tracks.materials[transform.material]) {
            animation.tracks.materials[transform.material] = {};
        }

        animation.tracks.materials[transform.material][`textures.${transform.texture}.rotation`] = {
            "constant": track.z.constant,
            "frames": frames.map((frame) => frame.z)
        };

    } else {

        if (!animation.tracks.materials[transform.material]) {
            animation.tracks.materials[transform.material] = {};
        }

        let single = null;
        switch (property) {
            case "translations": { single = "offset"; break; }
            case "scale": { single = "repeat"; break; }
        }

        keys.forEach((axis) => {
            if (frames[0].hasOwnProperty(axis)) {
                let scale = 1;
                if (property === "translations") {
                    scale = -1;
                }
                animation.tracks.materials[transform.material][`textures.${transform.texture}.${single}.${axis}`] = {
                    "constant": track[axis].constant,
                    "frames": frames.map((frame) => scale * frame[axis])
                };
            }
        });

    }

};

const interpolateMeshVisibility = function (animation, transform) {

    let frames = interpolateFrames(animation, transform);

    if (!animation.tracks.meshes[transform.mesh]) {
        animation.tracks.meshes[transform.mesh] = {};
    }

    animation.tracks.meshes[transform.mesh].visible = {
        "constant": transform.constant,
        "frames": frames
    };

};

const interpolateConstantChanges = function (animation, transform) {

    let keys = ["0", "1", "2", "3"];
    let frames = interpolateFrames(animation, transform.vectors, keys);

    if (!animation.tracks.materials[transform.material]) {
        animation.tracks.materials[transform.material] = {};
    }

    ["x", "y", "z", "w"].forEach((axis, index) => {
        if (frames[0].hasOwnProperty(index)) {
            animation.tracks.materials[transform.material][`constants.${transform.constant}.${axis}`] = {
                "constant": transform.vectors[index].constant,
                "frames": frames.map((frame) => frame[index])
            };
        }
    });

};

const getOutlineDepthValue = function (model, mesh, material, preset, defaultValue) {
    if (preset.hasOwnProperty(model.bones[0].name + "-" + material.fragmentShader + "@" + mesh.name)) {
        return preset[model.bones[0].name + "-" + material.fragmentShader + "@" + mesh.name];
    } else if (preset.hasOwnProperty(model.bones[0].name + "-" + material.fragmentShader)) {
        return preset[model.bones[0].name + "-" + material.fragmentShader];
    } else {
        return defaultValue;
    }
};

const useDirectNormal = function (model, material) {
    return useDirectNormalPresets[model.bones[0].name + "-" + material.name] ? true : false;
};

const getBlendFunction = (code) => {
    switch (code) {
        case PICA.BlendFunctionOperation.ZERO: { return "zero"; }
        case PICA.BlendFunctionOperation.ONE: { return "one"; }
        case PICA.BlendFunctionOperation.SOURCE_COLOR: { return "sourceColor"; }
        case PICA.BlendFunctionOperation.ONE_MINUS_SOURCE_COLOR: { return "oneMinusSourceColor"; }
        case PICA.BlendFunctionOperation.DESTINATION_COLOR: { return "destinationColor"; }
        case PICA.BlendFunctionOperation.ONE_MINUS_DESTINATION_COLOR: { return "oneMinusDestinationColor"; }
        case PICA.BlendFunctionOperation.SOURCE_ALPHA: { return "sourceAlpha"; }
        case PICA.BlendFunctionOperation.ONE_MINUS_SOURCE_ALPHA: { return "oneMinusSourceAlpha"; }
        case PICA.BlendFunctionOperation.DESTINATION_ALPHA: { return "destinationAlpha"; }
        case PICA.BlendFunctionOperation.ONE_MINUS_DESTINATION_ALPHA: { return "oneMinusDestinationAlpha"; }
        case PICA.BlendFunctionOperation.SOURCE_ALPHA_SATURATE: { return "sourceAlphaSaturate"; }
    }
};

const getBlendEquation = function (code) {
    switch (code) {
        case PICA.BlendEquation.ADD: { return "add"; }
        case PICA.BlendEquation.SUBTRACT: { return "subtract"; }
        case PICA.BlendEquation.REVERSE_SUBTRACT: { return "reverseSubtract"; }
        case PICA.BlendEquation.MIN: { return "min"; }
        case PICA.BlendEquation.MAX: { return "max"; }
    }
};

const getStencilOperation = function (code) {
    switch (code) {
        case PICA.StencilOperationAction.KEEP: { return "keep"; }
        case PICA.StencilOperationAction.ZERO: { return "zero"; }
        case PICA.StencilOperationAction.REPLACE: { return "replace"; }
        case PICA.StencilOperationAction.INCREMENT: { return "increment"; }
        case PICA.StencilOperationAction.DECREMENT: { return "decrement"; }
        case PICA.StencilOperationAction.INVERT: { return "invert"; }
        case PICA.StencilOperationAction.INCREMENT_WRAP: { return "incrementWrap"; }
        case PICA.StencilOperationAction.DECREMENT_WRAP: { return "decrementWrap"; }
    }
};

const getTestFunction = function (code) {
    switch (code) {
        case PICA.TestFunction.NEVER: { return "never"; }
        case PICA.TestFunction.ALWAYS: { return "always"; }
        case PICA.TestFunction.EQUAL_TO: { return "equalTo"; }
        case PICA.TestFunction.NOT_EQUAL_TO: { return "notEqualTo"; }
        case PICA.TestFunction.LESS_THAN: { return "lessThan"; }
        case PICA.TestFunction.LESS_THAN_OR_EQUAL_TO: { return "lessThanOrEqualTo"; }
        case PICA.TestFunction.GREATER_THAN: { return "greaterThan"; }
        case PICA.TestFunction.GREATER_THAN_OR_EQUAL_TO: { return "greaterThanOrEqualTo"; }
    }
};

Model.prototype.extractShaderPrograms = function (pc, options) {

    const model = this;

    return @.async(function () {

        const json = {
            "shaders": {
                "vertices": {},
                "fragments": {}
            },
            "programs": []
        };

        const programs = {};

        const prepareMaterial = (material, mesh, features) => {

            const luts = {};
            material.lightingLUTs.filter((hashID) => hashID !== 0).forEach((hashID) => {
                let lightingLUT = model.lightingLUTs.filter((lightingLUT) => lightingLUT.hashID === hashID)[0];
                switch (lightingLUT.pica.lightingLUTs.type.code) {
                    case PICA.LUTType.DIST_0: { luts.dist0 = lightingLUT.hashID; break; }
                    case PICA.LUTType.DIST_1: { luts.dist1 = lightingLUT.hashID; break; }
                    case PICA.LUTType.FRESNEL: { luts.fresnel = lightingLUT.hashID; break; }
                    case PICA.LUTType.REFLECT_R: { luts.reflectR = lightingLUT.hashID; break; }
                    case PICA.LUTType.REFLECT_G: { luts.reflectG = lightingLUT.hashID; break; }
                    case PICA.LUTType.REFLECT_B: { luts.reflectB = lightingLUT.hashID; break; }
                }
            });

            var fragmentShaderSuffix = "[" + Object.keys(luts).sort().join(",") + "]";

            let vertexShader = pc.files[options.isShadow ? 3 : 2].files.filter((file) => {
                return @.is(file, Shader) && (file.name === material.vertexShader);
            })[0];
            let fragmentShader = pc.files[options.isShadow ? 3 : 2].files.filter((file) => {
                return @.is(file, Shader) && (file.name === material.fragmentShader);
            })[0];

            let vertexShaderCode = json.shaders.vertices[vertexShader.name];
            if (!vertexShaderCode) {
                vertexShaderCode = vertexShader.describe(true, material, luts);
                json.shaders.vertices[vertexShader.name] = vertexShaderCode;
            }

            let fragmentShaderCode = json.shaders.fragments[fragmentShader.name + fragmentShaderSuffix];
            if (!fragmentShaderCode) {
                fragmentShaderCode = fragmentShader.describe(true, material, luts);
                json.shaders.fragments[fragmentShader.name + fragmentShaderSuffix] = fragmentShaderCode;
            }

            const program = [material.vertexShader, fragmentShader.name + fragmentShaderSuffix].join(", ");
            if (!programs[program]) {
                programs[program] = true;
                json.programs.push([material.vertexShader, fragmentShader.name + fragmentShaderSuffix]);
            }

        };

        model.meshes.forEach((mesh) => {

            mesh.submeshes.forEach((submesh, index) => {

                const material = model.materials.filter((material) => {
                    return material.name === submesh.material;
                })[0];


                const features = {
                    "hasGeometryShader": !@.is.nil(pc.files[2].files.filter((shader) => {
                        return @.is(shader, Shader) && (shader.name === material.vertexShader);
                    })[0].pica.shader.geometry.entryPoint),
                    "hasBoneW": (mesh.boneIndicesPerVertex >= 4)
                };

                submesh.vertices.attributes.forEach((attribute) => {
                    switch (attribute.name.code) {
                        case PICA.AttributeName.POSITION: { features.hasPosition = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.NORMAL: { features.hasNormal = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TANGENT: { features.hasTangent = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.COLOR: { features.hasColor = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TEXTURE_COORDINATE_0: { features.hasTextureCoordinate0 = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TEXTURE_COORDINATE_1: { features.hasTextureCoordinate1 = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TEXTURE_COORDINATE_2: { features.hasTextureCoordinate2 = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.BONE_INDEX: { features.hasBoneIndex = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.BONE_WEIGHT: { features.hasBoneWeight = attribute.fixed ? attribute.value : true; break; }
                    }
                });

                prepareMaterial(material, mesh, features);

            });

        });

        this.next(json);

    });

};

Model.prototype.toJSON = function (pcs, options) {

    if (!options) {
        options = {};
    }

    const model = this;

    return @.async(function () {

        const json = {
            "name": model.bones[0].name,
            "boundingBox": {
                "static": {
                    "min": model.boundingBox.min.slice(0, 3),
                    "max": model.boundingBox.max.slice(0, 3)
                },
                "fighting": {
                    "min": pcs.extra.files[0].boundingBox.min.slice(0, 3),
                    "max": pcs.extra.files[0].boundingBox.max.slice(0, 3)
                }
            },
            "bones": model.bones.map((bone) => {
                return {
                    "name": bone.name,
                    "parent": bone.parent,
                    "scale": bone.scale,
                    "rotation": bone.rotation,
                    "translation": bone.translation
                };
            }),
            "shaders": {
                "vertices": {},
                "fragments": {}
            },
            "textures": {},
            "luts": {},
            "materials": {},
            "meshes": [],
            "animations": {}
        };

        const prepareTexture = (texture) => {

            if (json.textures[texture.name]) {
                return;
            }

            let data = new Uint8Array(texture.width * texture.height * 4);

            let pixels = texture.getPixels();

            let looper = 0;
            while (looper < pixels.length) {
                data[looper] = pixels[looper + 1];
                data[looper + 1] = pixels[looper + 2];
                data[looper + 2] = pixels[looper + 3];
                data[looper + 3] = pixels[looper];
                looper += 4;
            }

            json.textures[texture.name] = {
                "format": "rgba",
                "name": texture.name,
                "data": {
                    "width": texture.width,
                    "height": texture.height,
                    "flipY": true,
                    "pixels": data
                }
            };

        };

        const prepareLUT = (lut) => {

            if (json.luts[lut.hashID]) {
                return;
            }

            let dataSize = lut.pica.lightingLUTs.data.length;
            let data = new Uint8Array(dataSize * 3);
            let looper = 0;
            while (looper < dataSize) {
                let value = Math.round(lut.pica.lightingLUTs.data[(looper + (dataSize >> 1)) % dataSize] * 0xff);
                data[looper * 3] = value;
                data[looper * 3 + 1] = value;
                data[looper * 3 + 2] = value;
                ++looper;
            }

            json.luts[lut.hashID] = {
                "format": "rgb",
                "name": lut.name ? lut.name : `Lut_${lut.hashID}.tga`,
                "data": {
                    "width": dataSize,
                    "height": 1,
                    "flipY": true,
                    "pixels": data
                }
            };

        };

        const prepareMaterial = (material, mesh) => {

            const textures = material.textureCoordinates.map((coordinate, index) => {

                const texture = (options.shiny ? pcs.textures.shiny : pcs.textures.normal).files.filter((file) => @.is(file, Texture) && file.name === coordinate.name)[0];

                prepareTexture(texture);

                let record = {
                    "name": texture.name,
                    "magFilter": (coordinate.magFilter.code === Model.TextureMagnificationFilter.NEAREST ?
                        "nearest" : "linear"),
                    "minFilter": (coordinate.minFilter.code === Model.TextureMinificationFilter.NEAREST ?
                        "nearest" : "linear")
                };

                switch (coordinate.wrap[0].code) {
                    case PICA.TextureWrap.CLAMP_TO_EDGE: { record.wrapS = "clampToEdge"; break; }
                    case PICA.TextureWrap.CLAMP_TO_BORDER: { record.wrapS = "clampToEdge"; break; }
                    case PICA.TextureWrap.REPEAT: { record.wrapS = "repeat"; break; }
                    case PICA.TextureWrap.MIRROR: { record.wrapS = "mirroredRepeat"; break; }
                }

                switch (coordinate.wrap[1].code) {
                    case PICA.TextureWrap.CLAMP_TO_EDGE: { record.wrapT = "clampToEdge"; break; }
                    case PICA.TextureWrap.CLAMP_TO_BORDER: { record.wrapT = "clampToEdge"; break; }
                    case PICA.TextureWrap.REPEAT: { record.wrapT = "repeat"; break; }
                    case PICA.TextureWrap.MIRROR: { record.wrapT = "mirroredRepeat"; break; }
                }

                record.offset = [-coordinate.translation[0] * coordinate.scale[0],
                                 -coordinate.translation[1] * coordinate.scale[1]];
                record.repeat = [coordinate.scale[0], coordinate.scale[1]];
                record.rotation = coordinate.rotation;

                // 778
                if (pcs.model.files[0].bones[0].name !== "pm0722_00") {
                    record.repeat = [material.pica.shader.vertex.floats[1 + index * 3].x,
                                     material.pica.shader.vertex.floats[2 + index * 3].y];
                    record.offset = [
                        -material.pica.shader.vertex.floats[1 + index * 3].w / material.pica.shader.vertex.floats[1 + index * 3].x,
                        -material.pica.shader.vertex.floats[2 + index * 3].w / material.pica.shader.vertex.floats[2 + index * 3].y];
                }

                return record;

            });

            const luts = {};
            material.lightingLUTs.filter((hashID) => hashID !== 0).forEach((hashID) => {

                let lightingLUT = model.lightingLUTs.filter((lightingLUT) => lightingLUT.hashID === hashID)[0];
                if (!lightingLUT) {
                    throw new Error("Lighting LUT not found " + hashID);
                }

                prepareLUT(lightingLUT);

                switch (lightingLUT.pica.lightingLUTs.type.code) {
                    case PICA.LUTType.DIST_0: { luts.dist0 = lightingLUT.hashID; break; }
                    case PICA.LUTType.DIST_1: { luts.dist1 = lightingLUT.hashID; break; }
                    case PICA.LUTType.FRESNEL: { luts.fresnel = lightingLUT.hashID; break; }
                    case PICA.LUTType.REFLECT_R: { luts.reflectR = lightingLUT.hashID; break; }
                    case PICA.LUTType.REFLECT_G: { luts.reflectG = lightingLUT.hashID; break; }
                    case PICA.LUTType.REFLECT_B: { luts.reflectB = lightingLUT.hashID; break; }
                }

            });

            var fragmentShaderSuffix = "[" + Object.keys(luts).sort().join(",") + "]";

            let vertexShader = pcs.model.files[options.isShadow ? 3 : 2].files.filter((file) => {
                return @.is(file, Shader) && (file.name === material.vertexShader);
            })[0];
            let fragmentShader = pcs.model.files[options.isShadow ? 3 : 2].files.filter((file) => {
                return @.is(file, Shader) && (file.name === material.fragmentShader);
            })[0];

            let vertexShaderCode = null;
            if (vertexShader) {
                vertexShaderCode = json.shaders.vertices[vertexShader.name];
                if (!vertexShaderCode) {
                    vertexShaderCode = vertexShader.describe(true, material, luts);
                    json.shaders.vertices[vertexShader.name] = vertexShaderCode;
                }
            }

            let fragmentShaderCode = null;
            if (fragmentShader) {
                fragmentShaderCode = json.shaders.fragments[fragmentShader.name + fragmentShaderSuffix];
                if (!fragmentShaderCode) {
                    fragmentShaderCode = fragmentShader.describe(true, material, luts);
                    json.shaders.fragments[fragmentShader.name + fragmentShaderSuffix] = fragmentShaderCode;
                }
            }

            let vectors = [];
            while (vectors.length < 96) {
                let vector = [0, 0, 0, 0];
                let float = null;
                if (material.pica.shader &&
                    material.pica.shader.vertex &&
                    material.pica.shader.vertex.floats &&
                    material.pica.shader.vertex.floats[vectors.length]) {
                    float = material.pica.shader.vertex.floats[vectors.length];
                }
                if (vertexShader && 
                    vertexShader.pica.shader &&
                    vertexShader.pica.shader.vertex.floats &&
                    vertexShader.pica.shader.vertex.floats[vectors.length]) {
                    float = vertexShader.pica.shader.vertex.floats[vectors.length];
                }
                if (float) {
                    vector[0] = float.x;
                    vector[1] = float.y;
                    vector[2] = float.z;
                    vector[3] = float.w;
                }
                vectors.push(vector);
            }

            // specular and shinness
            vectors[82][0] = material.rimPower;
            vectors[82][1] = material.rimScale;
            vectors[82][2] = material.phongPower;
            vectors[82][3] = material.phongScale;

            if (material.shaderParameters) {
                let float = material.shaderParameters;
                vectors[85][0] = float[0];
                vectors[85][1] = float[1];
                vectors[85][2] = float[2];
                vectors[85][3] = float[3];
            }

            let hasUVMap = false;
            let hasUVMap2 = false;
            let hasUVMap3 = false;
            let needUVMap2SphereReflection = false;
            let needUVMap3SphereReflection = false;

            if (material.textureCoordinates[0]) {
                switch (material.textureCoordinates[0].mappingType.code) {
                    case Model.TextureMappingType.UV: { hasUVMap = true; break; }
                }
            }
            if (material.textureCoordinates[1]) {
                switch (material.textureCoordinates[1].mappingType.code) {
                    case Model.TextureMappingType.UV: { hasUVMap2 = true; break; }
                    case Model.TextureMappingType.CAMERA_SPHERE: { needUVMap2SphereReflection = true; break; }
                }
            }
            if (material.textureCoordinates[2]) {
                switch (material.textureCoordinates[2].mappingType.code) {
                    case Model.TextureMappingType.UV: { hasUVMap3 = true; break; }
                    case Model.TextureMappingType.CAMERA_SPHERE: { needUVMap3SphereReflection = true; break; }
                }
            }

            let record = {

                "name": material.name,

                // rendering orders
                "layer": material.renderLayer,
                "priority": material.renderPriority,

                // textures
                "textures": textures,
                "luts": luts,

                // material colors
                "colors": {
                    "emission": [material.emissionColor.r / 0xff, material.emissionColor.g / 0xff,
                                 material.emissionColor.b / 0xff, material.emissionColor.a / 0xff],
                    "ambient": [material.ambientColor.r / 0xff, material.ambientColor.g / 0xff,
                                material.ambientColor.b / 0xff, material.ambientColor.a / 0xff],
                    "diffuse": [material.diffuseColor.r / 0xff, material.diffuseColor.g / 0xff,
                                material.diffuseColor.b / 0xff, material.diffuseColor.a / 0xff],
                    "speculars": [
                        [material.specularColors[0].r / 0xff, material.specularColors[0].g / 0xff,
                         material.specularColors[0].b / 0xff, material.specularColors[0].a / 0xff],
                        [material.specularColors[1].r / 0xff, material.specularColors[1].g / 0xff,
                         material.specularColors[1].b / 0xff, material.specularColors[1].a / 0xff]],
                },

                // uniforms
                "uniforms": {

                    "needColor": true,

                    "hasUVMap": hasUVMap,
                    "hasUVMap2": hasUVMap2,
                    "hasUVMap3": hasUVMap3,

                    "needUVMap2SphereReflection": needUVMap2SphereReflection,
                    "needUVMap3SphereReflection": needUVMap3SphereReflection,

                    "needLightSpecular": true,
                    "needViewSpecular": true,
                    "needDiffuse": true,

                    "vectors": vectors,

                },

                // shaders
                "shaders": {
                    "vertex": material.vertexShader,
                    "fragment": material.fragmentShader + fragmentShaderSuffix
                },

                // material rendering
                "alphaTest": material.pica.rendering.alphaTest.enabled,

                "stencilTest": {
                    "enabled": material.pica.rendering.stencilTest.enabled,
                    "buffer": material.pica.rendering.stencilTest.bufferMask,
                    "reference": material.pica.rendering.stencilTest.reference,
                    "mask": material.pica.rendering.stencilTest.mask,
                    "tester": getTestFunction(material.pica.rendering.stencilTest.testFunction.code),
                    "failed": getStencilOperation(material.pica.rendering.stencilOperation.failOperation.code),
                    "zFailed": getStencilOperation(material.pica.rendering.stencilOperation.zFailOperation.code),
                    "zPassed": getStencilOperation(material.pica.rendering.stencilOperation.zPassOperation.code)

                },

                "depthTest": {
                    "enabled": material.pica.depth.enabled,
                    "writable": material.pica.depth.colorMask.depthWrite,
                    "tester": getTestFunction(material.pica.depth.colorMask.depthFunction.code)
                },

                "blending": {
                    "destination": {
                        "color": getBlendFunction(material.pica.rendering.blendFunction.colorDestinationFunction.code),
                        "alpha": getBlendFunction(material.pica.rendering.blendFunction.alphaDestinationFunction.code)
                    },
                    "equation": {
                        "color": getBlendEquation(material.pica.rendering.blendFunction.colorEquation.code),
                        "alpha": getBlendEquation(material.pica.rendering.blendFunction.alphaEquation.code)
                    },
                    "source": {
                        "color": getBlendFunction(material.pica.rendering.blendFunction.colorSourceFunction.code),
                        "alpha": getBlendFunction(material.pica.rendering.blendFunction.alphaSourceFunction.code)
                    }
                },

                "faceCulling": (() => {
                    switch (material.pica.faceCulling.code) {
                        case PICA.FaceCulling.BACK_FACE: { return "backFace"; }
                        case PICA.FaceCulling.FRONT_FACE: { return "frontFace"; }
                        case PICA.FaceCulling.NEVER: { return "never"; }
                    }
                })(),

                // other
                "constants": {
                    "slots": [
                        [material.constantColors[0].r / 0xff, material.constantColors[0].g / 0xff,
                         material.constantColors[0].b / 0xff, material.constantColors[0].a / 0xff],
                        [material.constantColors[1].r / 0xff, material.constantColors[1].g / 0xff,
                         material.constantColors[1].b / 0xff, material.constantColors[1].a / 0xff],
                        [material.constantColors[2].r / 0xff, material.constantColors[2].g / 0xff,
                         material.constantColors[2].b / 0xff, material.constantColors[2].a / 0xff],
                        [material.constantColors[3].r / 0xff, material.constantColors[3].g / 0xff,
                         material.constantColors[3].b / 0xff, material.constantColors[3].a / 0xff],
                        [material.constantColors[4].r / 0xff, material.constantColors[4].g / 0xff,
                         material.constantColors[4].b / 0xff, material.constantColors[4].a / 0xff],
                        [material.constantColors[5].r / 0xff, material.constantColors[5].g / 0xff,
                         material.constantColors[5].b / 0xff, material.constantColors[5].a / 0xff]],
                    "indices": material.constantAssignments
                },
                "useDirectNormal": useDirectNormal(model, material),
                "outlines": {
                    "depth": getOutlineDepthValue(model, mesh, material, outlineDepthWritePresets, null),
                    "alpha": getOutlineDepthValue(model, mesh, material, outlineDepthAlphaPresets, 1)
                }

            };

            json.materials[material.name] = record;

        };

        model.meshes.forEach((mesh) => {

            mesh.submeshes.forEach((submesh, index) => {

                const material = model.materials.filter((material) => {
                    return material.name === submesh.material;
                })[0];

                const record = {
                    "name": mesh.name,
                    "material": submesh.material,
                    "attributes": {
                        "uvs": [],
                        "bones": {},
                        "indices": {}
                    }
                };

                let hasGeometryShader = false;
                let vertexShaderFile = pcs.model.files[options.isShadow ? 3 : 2].files.filter((shader) => {
                    return @.is(shader, Shader) && (shader.name === material.vertexShader);
                })[0];
                if (vertexShaderFile) {
                    hasGeometryShader = !@.is.nil(vertexShaderFile.pica.shader.geometry.entryPoint);
                }
                const features = {
                    "hasGeometryShader": hasGeometryShader,
                    "hasBoneW": (mesh.boneIndicesPerVertex >= 4)
                };

                submesh.vertices.attributes.forEach((attribute) => {
                    switch (attribute.name.code) {
                        case PICA.AttributeName.POSITION: { features.hasPosition = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.NORMAL: { features.hasNormal = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TANGENT: { features.hasTangent = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.COLOR: { features.hasColor = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TEXTURE_COORDINATE_0: { features.hasTextureCoordinate0 = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TEXTURE_COORDINATE_1: { features.hasTextureCoordinate1 = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.TEXTURE_COORDINATE_2: { features.hasTextureCoordinate2 = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.BONE_INDEX: { features.hasBoneIndex = attribute.fixed ? attribute.value : true; break; }
                        case PICA.AttributeName.BONE_WEIGHT: { features.hasBoneWeight = attribute.fixed ? attribute.value : true; break; }
                    }
                });

                let data = submesh.vertices.data;

                if (features.hasPosition) {
                    let positions = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasPosition === true) ? data[index].position : features.hasPosition;
                        value.settled = true;
                        positions[index * 4] = value[0];
                        positions[index * 4 + 1] = value[1];
                        positions[index * 4 + 2] = value[2];
                        positions[index * 4 + 3] = 1;
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        positions.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        positions.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        positions.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.positions = positions;
                }

                if (features.hasNormal) {
                    let normals = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasNormal === true) ? data[index].normal : features.hasNormal;
                        normals[index * 4] = value[0];
                        normals[index * 4 + 1] = value[1];
                        normals[index * 4 + 2] = value[2];
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        normals.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        normals.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        normals.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.normals = normals;
                }

                if (features.hasTangent) {
                    let tangents = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasTangent === true) ? data[index].tangent : features.hasTangent;
                        value.settled = true;
                        tangents[index * 4] = value[0];
                        tangents[index * 4 + 1] = value[1];
                        tangents[index * 4 + 2] = value[2];
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        tangents.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        tangents.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        tangents.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.tangents = tangents;
                }

                if (features.hasColor) {
                    let colors = new Uint8Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasColor === true) ? data[index].color : features.hasColor;
                        value.settled = true;
                        colors[index * 4] = value[1];     // r
                        colors[index * 4 + 1] = value[2]; // g
                        colors[index * 4 + 2] = value[3]; // b
                        colors[index * 4 + 3] = value[0]; // a
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        colors.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        colors.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        colors.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.colors = colors;
                }

                if (features.hasTextureCoordinate0) {
                    let uvs = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasTextureCoordinate0 === true) ? data[index].textures[0] : features.hasTextureCoordinate0;
                        value.settled = true;
                        uvs[index * 4] = value[0];
                        uvs[index * 4 + 1] = value[1];
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        uvs.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        uvs.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        uvs.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.uvs[0] = uvs;
                }

                if (features.hasTextureCoordinate1) {
                    let uvs = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasTextureCoordinate1 === true) ? data[index].textures[1] : features.hasTextureCoordinate1;
                        value.settled = true;
                        uvs[index * 4] = value[0];
                        uvs[index * 4 + 1] = value[1];
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        uvs.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        uvs.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        uvs.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.uvs[1] = uvs;
                }

                if (features.hasTextureCoordinate2) {
                    let uvs = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasTextureCoordinate2 === true) ? data[index].textures[2] : features.hasTextureCoordinate2;
                        value.settled = true;
                        uvs[index * 4] = value[0];
                        uvs[index * 4 + 1] = value[1];
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        uvs.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        uvs.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        uvs.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.uvs[2] = uvs;
                }

                if (features.hasBoneIndex) {
                    const boneIndices = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasBoneIndex === true) ? data[index].boneIndices : features.hasBoneIndex;
                        value.settled = true;
                        if (isFinite(value[0])) {
                            boneIndices[index * 4] = value[0];
                        } else {
                            boneIndices[index * 4] = NaN;
                        }
                        if (isFinite(value[1])) {
                            boneIndices[index * 4 + 1] = value[1];
                        } else {
                            boneIndices[index * 4 + 1] = NaN;
                        }
                        if (isFinite(value[2])) {
                            boneIndices[index * 4 + 2] = value[2];
                        } else {
                            boneIndices[index * 4 + 2] = NaN;
                        }
                        if (isFinite(value[3])) {
                            boneIndices[index * 4 + 3] = value[3];
                        } else {
                            boneIndices[index * 4 + 3] = NaN;
                        }
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        boneIndices.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        boneIndices.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        boneIndices.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.bones.indices = boneIndices;
                    record.bones = submesh.boneIndices;
                }

                if (features.hasBoneWeight) {
                    const boneWeights = new Float32Array(submesh.vertices.count * 4 * (features.hasGeometryShader ? 4 : 1));
                    let index = 0;
                    while (index < data.length) {
                        let value = (features.hasBoneWeight === true) ? data[index].boneWeights : features.hasBoneWeight;
                        value.settled = true;
                        boneWeights[index * 4] = value[0];
                        boneWeights[index * 4 + 1] = value[1];
                        boneWeights[index * 4 + 2] = value[2];
                        boneWeights[index * 4 + 3] = value[3];
                        ++index;
                    }
                    if (features.hasGeometryShader) {
                        boneWeights.copyWithin(submesh.vertices.count * 4, 0, submesh.vertices.count * 4);
                        boneWeights.copyWithin(submesh.vertices.count * 4 * 2, 0, submesh.vertices.count * 4);
                        boneWeights.copyWithin(submesh.vertices.count * 4 * 3, 0, submesh.vertices.count * 4);
                    }
                    record.attributes.bones.weights = boneWeights;
                }

                if (features.hasGeometryShader) {
                    const geometryIndices = new Float32Array(submesh.vertices.count * 4 * 4);
                    geometryIndices.fill(0, 0, submesh.vertices.count * 4);
                    geometryIndices.fill(1, submesh.vertices.count * 4, submesh.vertices.count * 4 * 2);
                    geometryIndices.fill(2, submesh.vertices.count * 4 * 2, submesh.vertices.count * 4 * 3);
                    geometryIndices.fill(3, submesh.vertices.count * 4 * 3, submesh.vertices.count * 4 * 4);
                    record.attributes.indices.geometry = geometryIndices;
                }

                const indices = new Uint16Array(submesh.vertexIndices.count * (features.hasGeometryShader ? 6 : 1));
                submesh.vertexIndices.data.forEach((vertexIndex, index) => {
                    if (features.hasGeometryShader) {
                        let vertices = submesh.vertices.data.length;
                        indices[index * 6] = vertexIndex + vertices * 0;
                        indices[index * 6 + 1] = vertexIndex + vertices;
                        indices[index * 6 + 2] = vertexIndex + vertices * 2;
                        indices[index * 6 + 3] = vertexIndex + vertices;
                        indices[index * 6 + 4] = vertexIndex + vertices * 2;
                        indices[index * 6 + 5] = vertexIndex + vertices * 3;
                    } else {
                        indices[index] = vertexIndex;
                    }
                });
                record.attributes.indices.vertices = indices;

                prepareMaterial(material, mesh);

                record.uniforms = {
                    "hasTangent": (features.hasTangent === true),
                    "hasBone": (features.hasBoneIndex === true),
                    "hasBoneW": (features.hasBoneW === true),
                };

                json.meshes.push(record);

            });

        });

        json.meshes.reverse();
        json.meshes.sort((a, b) => {
            let result = json.materials[a.material].layer - json.materials[b.material].layer;
            if (result !== 0) {
                return result;
            }
            return json.materials[a.material].priority - json.materials[b.material].priority;
        });
        json.meshes.forEach((mesh, index) => {
            mesh.order = index + 1;
        });

        if (!options.isShadow) {
            Object.keys(pcs.motions).forEach((key) => {

                const files = pcs.motions[key].files;
                const prefix = key[0].toUpperCase() + key.slice(1);

                files.forEach((motion, index) => {

                    if (!@.is(motion, Motion)) {
                        return;
                    }

                    const name = prefix + "Action" + (index + 1);

                    const animation = {
                        "name": name,
                        "frames": motion.frames,
                        "fps": Motion.FPS,
                        "loop": motion.loop,
                        "region": motion.animationRegion,
                        "interpolated": false,
                        "tracks": {}
                    };

                    json.animations[name] = animation;

                    if (motion.skeletal) {
                        animation.tracks.skeletal = motion.skeletal.transforms.map((transform) => {
                            let result = {
                                "bone": transform.bone
                            };
                            ["scale", "rotation", "translation"].forEach((axis) => {
                                let axisKey = axis + "s";
                                ["x", "y", "z"].forEach((key) => {
                                    let record = axis + key.toUpperCase();
                                    if (transform[record].length > 0) {
                                        if (!result[axisKey]) {
                                            result[axisKey] = {};
                                        }
                                        result[axisKey][key] = {
                                            "frames": transform[record].slice(0),
                                            "constant": transform[record].isConstant
                                        };
                                    }
                                });
                                if ((axis === "rotation") && result[axisKey]) {
                                    result[axisKey].halfAxisAngle = transform.axisAngle;
                                }
                            });
                            return result;
                        });
                    }

                    if (motion.material) {
                        animation.tracks.material = motion.material.transforms.map((transform) => {
                            let result = {
                                "material": transform.material,
                                "texture": transform.textureIndex
                            };
                            ["scale", "rotation", "translation"].forEach((axis) => {
                                let axisKey = axis + "s";
                                ((axis === "rotation") ? ["z"] : ["x", "y"]).forEach((key) => {
                                    let record = axis + (key !== "z" ? key.toUpperCase() : "");
                                    if (transform[record].length > 0) {
                                        if (!result[axisKey]) {
                                            result[axisKey] = {};
                                        }
                                        result[axisKey][key] = {
                                            "frames": transform[record].slice(0),
                                            "constant": transform[record].isConstant
                                        };
                                    }
                                });
                            });
                            return result;
                        });
                    }

                    if (motion.visibility) {
                        animation.tracks.alphas = motion.visibility.transforms.map((transform) => {
                            let result = {
                                "mesh": transform.mesh
                            };
                            if (transform.visibility.length > 0) {
                                result.frames = transform.visibility.slice(0);
                                result.constant = transform.visibility.isConstant;
                            }
                            return result;
                        });
                    }

                    if (motion.constant) {
                        animation.tracks.constants = motion.constant.values.map((transform) => {
                            let result = {
                                "material": transform.material,
                                "constant": transform.constantIndex
                            };
                            ["r", "g", "b", "a"].forEach((key, index) => {
                                if (transform[key].length > 0) {
                                    if (!result.vectors) {
                                        result.vectors = {};
                                    }
                                    result.vectors[index] = {
                                        "frames": transform[key].slice(0),
                                        "constant": transform[key].isConstant
                                    };
                                }
                            });
                            return result;
                        });
                    }

                });

            });
        }

        this.next(json);

    });

};

Model.interpolateJSONAnimation = function (json) {

    if (json.interpolated) {
        return json;
    }

    const newFPS = Motion.FPS * interpolationTimes;
    const frames = Math.round(json.frames * interpolationTimes) - 1;

    let times = [];
    for (let looper = 0; looper < frames; ++looper) {
        times.push(looper / newFPS);
    }

    const animation = {
        "interpolated": true,
        "name": json.name,
        "fps": newFPS,
        "frames": frames,
        "duration": frames / newFPS,
        "resample": interpolationTimes,
        "loop": json.loop,
        "region": json.region,
        "times": times,
        "tracks": {
            "bones": {},
            "meshes": {},
            "materials": {}
        }
    };

    if (json.tracks.skeletal) {
        let looper = 0;
        while (looper < json.tracks.skeletal.length) {
            ["scales", "rotations", "translations"].forEach((property) => {
                interpolateBoneTransform(animation, json.tracks.skeletal[looper], property);
            });
            ++looper;
        }
    }

    if (json.tracks.material) {
        let looper = 0;
        while (looper < json.tracks.material.length) {
            ["scales", "rotations", "translations"].forEach((property) => {
                interpolateTextureTransform(animation, json.tracks.material[looper], property);
            });
            ++looper;
        }
    }

    if (json.tracks.alphas) {
        let looper = 0;
        while (looper < json.tracks.alphas.length) {
            interpolateMeshVisibility(animation, json.tracks.alphas[looper]);
            ++looper;
        }
    }

    if (json.tracks.constants) {
        let looper = 0;
        while (looper < json.tracks.constants.length) {
            interpolateConstantChanges(animation, json.tracks.constants[looper]);
            ++looper;
        }
    }

    return animation;
};

const { getClipUsage } = require("../../scripts/animation.js");

const needPreviousClip = function (name) {

    switch (name) {

        case "FightingAction5": { return true; }
        case "FightingAction6": { return true; }

        case "PetAction6": { return true; }
        case "PetAction7": { return true; }

        case "PetAction9": { return true; }

        case "PetAction24": { return true; }
        case "PetAction25": { return true; }

        default: { return false; }

    }

};

const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

    this.animationListener = (animation) => {
        this.filler.fill({
            "selected": animation
        });
    };

    $.delay(() => {

        let modelID = $(dom).attr("wire-id").split("/")[0];

        let from = $(dom).parent().children("ui-diagram-frame").filter((index, dom) => {
            return $(dom).attr("wire-id") === modelID;
        })[0];

        if (from) {
            this.updatePlayingAnimations(from.frame.getPlayingAnimations());
        }

    });

};

Frame.prototype.updatePlayingAnimations = function (animations) {

    let playings = {};
    for (let animation of animations) {
        playings[animation.name] = animation;
    }

    this.filler.fill({
        "playings": playings
    });

};

Frame.prototype.playAnimation = function (animation) {

    let playVersion = $.uuid();
    this.playVersion = playVersion;

    let modelID = $(this.dom).attr("wire-id").split("/")[0];

    let from = $(this.dom).parent().children("ui-diagram-frame").filter((index, dom) => {
        return $(dom).attr("wire-id") === modelID;
    })[0];

    if (!from) {
        return;
    }

    let group = undefined;
    for (let candidate of this.filler.parameters.groups) {
        if (candidate.name === animation.split("Action")[0]) {
            group = candidate;
        }
    }

    let stateClips = group.animations.filter((animation) => {
        return getClipUsage(animation.id).split(" ")[0] === "State";
    });

    let paused = modelID.split("-")[1] === "327";
    for (let looper = 0; looper < stateClips.length; ++looper) {
        if (!this.filler.parameters.playings[stateClips[looper].id]) {
            from.frame.playAnimation(stateClips[looper].id, {
                "channel": `state-${looper + 1}`,
                "priority": (3 + looper),
                "fading": 0,
                "paused": paused,
                "frame": 128,
                "loop": Infinity
            });
        }
    }

    let series = [animation];
    let groupAnimations = group.animations.map((animation) => animation.id);
    let index = groupAnimations.indexOf(animation);
    while ((index !== -1) && (index < groupAnimations.length) && 
           needPreviousClip(groupAnimations[index + 1])) {
        series.push(groupAnimations[index + 1]);
        ++index;
    }

    if (series[series.length - 1] !== `${group.name}Action1`) {
        series.push(`${group.name}Action1`);
    }

    from.frame.playAnimationSeries(series, {
        "channel": "action",
        "priority": 2,
        "fading": 0,
        "loop": "last"
    });

};

Frame.functors = {

    "selectAnimation": function (cell) {

        this.filler.fill({
            "selected": cell.id
        });

        if (this.filler.parameters.playings[cell.id]) {
            return;
        }

        this.playAnimation(cell.id);

    },
    "isSystemClip": function (name) {

        switch (name) {

            case "FightingAction20": { return true; }
            case "FightingAction21": { return true; }
            case "FightingAction22": { return true; }
            case "FightingAction23": { return true; }
            case "FightingAction24": { return true; }
            case "FightingAction25": { return true; }
            case "FightingAction26": { return true; }
            case "FightingAction27": { return true; }
            case "FightingAction28": { return true; }
            case "FightingAction29": { return true; }

            case "MapAction15": { return true; }
            case "MapAction16": { return true; }
            case "MapAction17": { return true; }
            case "MapAction18": { return true; }
            case "MapAction19": { return true; }
            case "MapAction20": { return true; }
            case "MapAction21": { return true; }
            case "MapAction22": { return true; }
            case "MapAction23": { return true; }
            case "MapAction24": { return true; }

            case "PetAction28": { return true; }
            case "PetAction29": { return true; }
            case "PetAction30": { return true; }
            case "PetAction31": { return true; }
            case "PetAction32": { return true; }
            case "PetAction33": { return true; }
            case "PetAction34": { return true; }
            case "PetAction35": { return true; }
            case "PetAction36": { return true; }
            case "PetAction37": { return true; }

            default: { return false; }

        }

    },
    "getClipUsage": function (name) {

        return getClipUsage(name);

    },
    "needPreviousClip": function (name) {

        return needPreviousClip(name);

    }

};

module.exports.Frame = Frame;

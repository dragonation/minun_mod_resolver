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

const getClipUsage = function (name) {

    switch (name) {

        case "FightingAction1": { return "Pose"; }
        case "FightingAction2": { return "Appear"; }
        case "FightingAction3": { return "Transform"; }
        case "FightingAction4": { return "Release"; }
        case "FightingAction5": { return "Dropping"; }
        case "FightingAction6": { return "Landing"; }
        case "FightingAction7": { return "Release without Landing"; }
        case "FightingAction8": { return "Mega Upgraded"; }
        case "FightingAction9": { return "Attack"; }
        case "FightingAction10": { return "Attack 2"; }
        case "FightingAction11": { return "Attack 3"; }
        case "FightingAction12": { return "Attack 4"; }
        case "FightingAction13": { return "No Touch Attack"; }
        case "FightingAction14": { return "No Touch Attack 2"; }
        case "FightingAction15": { return "No Touch Attack 3"; }
        case "FightingAction16": { return "No Touch Attack 4"; }
        case "FightingAction17": { return "Be Attacked"; }
        case "FightingAction18": { return "Lost"; }
        // 19
        case "FightingAction20": { return "Eye Emotion"; }
        case "FightingAction21": { return "Eye 2 Emotion"; }
        case "FightingAction22": { return "Eye 3 Emotion"; }
        case "FightingAction23": { return "Mouth Emotion"; }
        case "FightingAction24": { return "Mouth 2 Emotion"; }
        case "FightingAction25": { return "Mouth 3 Emotion"; }
        case "FightingAction26": { return "State"; }
        case "FightingAction27": { return "State 2"; }
        case "FightingAction28": { return "State 3"; }
        case "FightingAction29": { return "State 4"; }

        case "MapAction1": { return "Pose"; }
        case "MapAction3": { return "Walk"; }
        case "MapAction4": { return "Run"; }
        case "MapAction6": { return "Start Walk"; }
        case "MapAction7": { return "End Walk"; }
        case "MapAction9": { return "Start Run"; }
        case "MapAction10": { return "End Run"; }
        case "MapAction12": { return "Start Run 2"; }
        case "MapAction13": { return "End Run 2"; }
        // 14
        case "MapAction15": { return "Eye Emotion"; }
        case "MapAction16": { return "Eye 2 Emotion"; }
        case "MapAction17": { return "Eye 3 Emotion"; }
        case "MapAction18": { return "Mouth Emotion"; }
        case "MapAction19": { return "Mouth 2 Emotion"; }
        case "MapAction20": { return "Mouth 3 Emotion"; }
        case "MapAction21": { return "State"; }
        case "MapAction22": { return "State 2"; }
        case "MapAction23": { return "State 3"; }
        case "MapAction24": { return "State 4"; }

        case "PetAction1": { return "Pose"; }
        case "PetAction2": { return "Turn"; }
        case "PetAction3": { return "Look Back"; }
        case "PetAction4": { return "Look Back Happily"; }
        case "PetAction5": { return "Falling Asleep"; }
        case "PetAction6": { return "Sleepy"; }
        case "PetAction7": { return "Sleepy Awaken"; }
        case "PetAction8": { return "Sleeping"; }
        case "PetAction9": { return "Awaken"; }
        case "PetAction10": { return "Refuse"; }
        case "PetAction11": { return "Thinking"; }
        case "PetAction12": { return "Agree"; }
        case "PetAction13": { return "Happy"; }
        case "PetAction14": { return "Very Happy"; }
        case "PetAction15": { return "Look Around"; }
        case "PetAction16": { return "Rub Eyes"; }
        case "PetAction17": { return "Comfortable"; }
        case "PetAction18": { return "Relax"; } 
        case "PetAction19": { return "Sad"; }
        case "PetAction20": { return "Salutate"; }
        case "PetAction21": { return "Happy"; }
        case "PetAction22": { return "Angry"; }
        case "PetAction23": { return "Begin Eating"; }
        case "PetAction24": { return "Eating"; }
        case "PetAction25": { return "Eating Finished"; }
        case "PetAction26": { return "No Eating"; }
        // 27
        case "PetAction28": { return "Eye Emotion"; }
        case "PetAction29": { return "Eye 2 Emotion"; }
        case "PetAction30": { return "Eye 3 Emotion"; }
        case "PetAction31": { return "Mouth Emotion"; }
        case "PetAction32": { return "Mouth 2 Emotion"; }
        case "PetAction33": { return "Mouth 3 Emotion"; }
        case "PetAction34": { return "State"; }
        case "PetAction35": { return "State 2"; }
        case "PetAction36": { return "State 3"; }
        case "PetAction37": { return "State 4"; }

        default: { break; }

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

    if (from) {
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
        let play = (index) => {
            from.frame.playAnimation(series[index], {
                "channel": "action",
                "priority": 2,
                "fading": 0,
                "onAnimationEnded": () => {
                    if (playVersion !== this.playVersion) {
                        return;
                    }
                    if (index === series.length - 1) {
                        from.frame.playAnimation(`${group.name}Action1`, {
                            "channel": "action",
                            "priority": 1,
                            "loop": Infinity
                        });
                    } else {
                        play(index + 1);
                    }
                }
            });
        };
        play(0);
    }

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

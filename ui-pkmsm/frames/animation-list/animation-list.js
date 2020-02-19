const Frame = function Frame(dom, filler) {

    this.dom = dom;

    this.filler = filler;

    this.animationListener = (animation) => {
        this.filler.fill({
            "selected": animation
        });
    };

    this.filler.parameters.from.addAnimationListener(this.animationListener);

    this.filler.fill({
        "selected": this.filler.parameters.from.getPlayingAnimation()
    });

};

Frame.prototype.onClose = function () {

    this.filler.parameters.from.removeAnimationListener(this.animationListener);

};

Frame.functors = {

    "selectAnimation": function (cell) {

        this.filler.fill({
            "selected": cell.id
        });

        this.filler.parameters.from.playAnimation(cell.id, {
            "channel": "action",
            "priority": 2
        });

    },
    "getComment": function (name) {

        switch (name) {

            case "FightingAction1": { return "Pose"; }
            case "FightingAction2": { return "Appear"; }
            case "FightingAction3": { return "Transform"; }
            case "FightingAction4": { return "Release"; }
            case "FightingAction5": { return "Dropping"; }
            case "FightingAction6": { return "Landing"; }
            case "FightingAction7": { return "Release No Landing"; }
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
            case "FightingAction26": { return "State animation"; }

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
            case "MapAction21": { return "State Animation"; }

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
            case "PetAction34": { return "State Animation"; }

        }

    }

};

module.exports.Frame = Frame;

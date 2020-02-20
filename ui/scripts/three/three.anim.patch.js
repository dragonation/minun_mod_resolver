const THREE = require("./three-110.js");

const patchObjectAnimation = function (threeObject) {

    const animations = Object.create(null);

    const animationMixers = {
        "time": 0,
        "bindings": Object.create(null),
        "channels": Object.create(null),
        "origins": Object.create(null),
        "updaters": Object.create(null)
    };

    const resolveUpdater = function (subject, name, path) {

        let selector = `${subject}#${name}`;
        path.split(".").forEach((key) => {
            if (/^[0-9]+$/.test(key)) {
                selector += `:nth-child(${key})`;
            } else {
                selector += ` > .${key}`;
            }
        });

        if (animationMixers.updaters[selector]) {
            return animationMixers.updaters[selector];
        }

        let subjects = [];
        const resolveTargets = (container) => {
            switch (subject) {
                case "bone": {
                    if (container.isBone && (container.name === name)) {
                        subjects.push(container);
                    }
                    break;
                }
                case "material": {
                    if (container.isMesh) {
                        let materials = container.material;
                        if (!(materials instanceof Array)) {
                            materials = [materials];
                        }
                        for (let material of materials) {
                            if (material.name === name) {
                                subjects.push(material);
                            }
                        }
                    }
                    break;
                }
                case "mesh": {
                    if (container.isMesh && (container.name === name)) {
                        subjects.push(container);
                    }
                    break;
                }
            }
            if (container.children) {
                for (let child of container.children) {
                    resolveTargets(child);
                }
            }
        };

        resolveTargets(threeObject);

        let targets = subjects;
        let keys = path.split(".");
        let looper = 0;
        while (looper < keys.length - 1) {
            targets = targets.map((target) => target[keys[looper]]).filter((target) => target);
            ++looper;
        }

        if (!animationMixers.origins[selector]) {
            animationMixers.origins[selector] = new Map();
        }
        targets.forEach((target) => {
            let value = target[keys[keys.length - 1]];
            if (value.toArray) {
                value = value.toArray();
            }
            animationMixers.origins[selector].set(target, value);
        });

        let merge = null;

        switch (keys[keys.length - 1]) {
            case "x": case "y": case "z": case "w":
            case "rotation": {
                merge = function (a, b, target) {
                    if (b[1] instanceof Map) {
                        return [a[0] + b[0], a[1] + b[0] * b[1].get(target)];
                    } else {
                        return [a[0] + b[0], a[1] + b[0] * b[1]];
                    }
                }; break; 
            }
            case "quaternion": {
                merge = function (a, b, target) {
                    if (b[1] instanceof Map) {
                        const b1 = b[1].get(target);
                        return [a[0] + b[0], [
                            a[1][0] + b[0] * b1[0], a[1][1] + b[0] * b1[1],
                            a[1][2] + b[0] * b1[2], a[1][3] + b[0] * b1[3]]];
                    } else {
                        return [a[0] + b[0], [
                            a[1][0] + b[0] * b[1][0], a[1][1] + b[0] * b[1][1],
                            a[1][2] + b[0] * b[1][2], a[1][3] + b[0] * b[1][3]]];
                    }
                }; break; 
            }
            case "visible": 
            default: {
                merge = function (a, b, target) {
                    if (b[1] instanceof Map) {
                        return [a[0] + b[0], b[1].get(target)];
                    } else {
                        return [a[0] + b[0], b[1]];
                    }
                }; break; 
            }
        }

        animationMixers.updaters[selector] = {
            "selector": selector,
            "targets": targets,
            "property": keys[keys.length - 1],
            "merge": merge,
            "update": function (values) {

                let looper = 0;
                while (looper < this.targets.length) {

                    let mixed = null;
                    switch (this.property) {
                        case "x": case "y": case "z": case "w":
                        case "rotation": { mixed = [0, 0]; break; }
                        case "visible": { mixed = [0, false]; break; }
                        case "quaternion": { mixed = [0, [0, 0, 0, 0]]; break; }
                    }

                    let target = this.targets[looper];
                    values.forEach((value) => {
                        mixed = this.merge(mixed, value, target);
                    });

                    switch (this.property) {
                        case "x": case "y": case "z": case "w": 
                        case "rotation": {
                            if (mixed[0] === 0) {
                                target[this.property] = mixed[1];
                            } else {
                                target[this.property] = mixed[1] / mixed[0]; break;
                            }
                            break;
                        }
                        case "visible": {
                            target[this.property] = mixed[1];
                            break;
                        }
                        case "quaternion": {
                            if (mixed[0] === 0) {
                                target[this.property].set(
                                    mixed[1][0], mixed[1][1],
                                    mixed[1][2], mixed[1][3]);
                            } else {
                                target[this.property].set(
                                    mixed[1][0] / mixed[0], mixed[1][1] / mixed[0],
                                    mixed[1][2] / mixed[0], mixed[1][3] / mixed[0]);
                            }
                            break;
                        }
                    }

                    ++looper;
                }

            }
        };

        return animationMixers.updaters[selector];

    };

    threeObject.playPatchedAnimation = function (name, options) {

        if (!options) {
            options = {};
        }

        if (!options.channel) {
            options.channel = $.uuid();
        }

        if ((options.fadings === null) || (options.fadings === undefined)) {
            options.fadings = 0.2;
        }
        if (typeof options.fadings === "number") {
            options.fadings = [options.fadings];
        }
        if (options.fadings.length === 1) {
            options.fadings = [options.fadings[0], options.fadings[0], options.fadings[0]];
        } else if (options.fadings.length === 2) {
            options.fadings = [resolveUpdateroptions.fadings[0], options.fadings[1], options.fadings[0]];
        }

        if ((options.priority === null) || (options.priority === undefined)) {
            options.priority = 1;
        }

        if ((options.weight === null) || (options.weight === undefined)) {
            options.weight = 1;
        }

        if ((options.frame === null) || (options.frame === undefined)) {
            options.frame = 0;
        }

        if ((options.paused === null) || (options.paused === undefined)) {
            options.paused = false;
        }

        if ((options.loop === null) || (options.loop === undefined)) {
            options.loop = 1;
        }

        if (!threeObject.getPatchedAnimation) {
            if (options.callback) {
                options.callback(new Error(`Animation ${name} not found`));
                return;
            } else {
                throw new Error(`Animation ${name} not found`);
            }
        }
        let animation = threeObject.getPatchedAnimation(name);
        if (!animation) {
            if (options.callback) {
                options.callback(new Error(`Animation ${name} not found`));
                return;
            } else {
                throw new Error(`Animation ${name} not found`);
            }
        }

        if (!options.callback) {
            options.callback = function (error) {
                if (error) { console.error(error); }
            };
        }

        if (options.onAnimationStarted) {
            options.onAnimationStarted();
        }

        if (options.fadings[0] > animation.duration * options.loop * 0.1) {
            options.fadings[0] = animation.duration * options.loop * 0.1;
        }

        if (options.fadings[2] > animation.duration * options.loop * 0.1) {
            options.fadings[2] = animation.duration * options.loop * 0.1;
        }

        let starting = animationMixers.time;

        if (animationMixers.channels[options.channel]) {
            animationMixers.channels[options.channel].forEach((channel) => {
                channel.fadeOut(options.fadings[1]);
            });
        }

        let bindings = [];

        animation.tracks.forEach((track) => {

            let type = track.type;
            let target = track.target.split(".")[0];
            let path = track.target.split(".").slice(1).join(".");

            const updater = resolveUpdater(type, target, path);
            if (!updater) { return; }
            if (updater.targets.length === 0) {
                // console.warn(`Animation target[${updater.selector}] not found`);
            }

            const binding = {
                "id": updater.selector,
                "constant": track.constant,
                "priority": options.priority,
                "frame": Math.round(options.frame * animation.resample),
                "passed": options.frame * animation.resample / animation.fps,
                "paused": options.paused,
                "times": animation.times,
                "values": track.frames,
                "duration": animation.duration,
                "starting": starting,
                "action": name,
                "loop": options.loop,
                "weight": options.weight,
                "fadings": options.fadings.slice(0)
            };

            if (!animationMixers.bindings[updater.selector]) {
                animationMixers.bindings[updater.selector] = {
                    "origins": animationMixers.origins[updater.selector],
                    "updater": updater,
                    "id": updater.selector,
                    "mixable": (type === "bone"),
                    "tracks": []
                };
            }

            animationMixers.bindings[updater.selector].tracks.push(binding);

            bindings.push(binding);

        });

        if (!animationMixers.channels[options.channel]) {
            animationMixers.channels[options.channel] = [];
        }

        let timeOffset = starting - Date.now() / 1000;
        let actor = {
            "listeners": [options.callback],
            "time": options.frame * animation.resample / animation.fps,
            "paused": options.paused,
            "starting": starting,
            "duration": animation.duration,
            "loop": options.loop,
            "fadings": options.fadings.slice(0),
            "fadeOut": function (fading, time) {
                if ((actor.ending !== null) && (actor.ending !== undefined)) {
                    return;
                }
                if (!time) {
                    time = Date.now() / 1000 + timeOffset;
                }
                if ((actor.starting + actor.duration * actor.loop) - time < fading) {
                    fading = (actor.starting + actor.duration * actor.loop) - time;
                }
                if (fading > actor.duration * actor.loop * 0.1) {
                    fading = actor.duration * actor.loop * 0.1;
                }
                if (fading < 0) {
                    fading = 0;
                }
                actor.fadings[1] = fading;
                actor.ending = animationMixers.time;
                for (let binding of bindings) {
                    binding.ending = actor.ending;
                    binding.fadings.push(fading);
                }
            },
            "stop": function () {
                actor.fadeOut(0);
            },
            "remove": function () {

                if (actor.removed) { return; }
                actor.removed = true;

                if (animationMixers.channels[options.channel]) {
                    let index = animationMixers.channels[options.channel].indexOf(actor);
                    if (index !== -1) {
                        animationMixers.channels[options.channel].splice(index, 1);
                    }
                    if (animationMixers.channels[options.channel].length === 0) {
                        delete animationMixers.channels[options.channel];
                    }
                }

                for (let listener of actor.listeners) {
                    try {
                        listener(undefined, (actor.ending !== null) && (actor.ending !== undefined));
                    } catch (error) {
                        console.error(error);
                    }
                }

                for (let binding of bindings) {
                    let idBindings = animationMixers.bindings[binding.id];
                    if (idBindings) {
                        let index = idBindings.tracks.indexOf(binding);
                        if (index !== -1) {
                            idBindings.tracks.splice(index, 1);
                        }
                        
                        if (idBindings.tracks.length === 0) {
                            $.delay(() => {
                                if (!animationMixers.bindings[binding.path]) {
                                    idBindings.updater.update([[1, idBindings.origins]]);
                                }
                            });
                            delete animationMixers.bindings[binding.path];
                        }
                    }
                }

                if (options.onAnimationEnded) {
                    options.onAnimationEnded();
                }

            }
        }; 

        animationMixers.channels[options.channel].push(actor);

    };

    threeObject.patchedAnimationTicker = function (delta) {

        let newTime = animationMixers.time + delta;

        Object.keys(animationMixers.bindings).forEach((id) => {

            let idBindings = animationMixers.bindings[id];
            if (idBindings.tracks.length === 0) {
                return;
            }

            let priorities = [];
            let bindings = {}
            idBindings.tracks.forEach((binding) => {

                // update passed and frame
                if ((!binding.paused) && (!binding.ending)) {
                    let passed = (newTime - binding.starting);
                    passed -= Math.floor(passed / binding.duration) * binding.duration;
                    if (newTime - binding.starting > binding.duration * binding.loop) {
                        passed = binding.duration;
                    }
                    binding.passed = passed;
                    while ((binding.frame > 1) &&
                           (binding.times[binding.frame - 1] > passed)) {
                        --binding.frame;
                    }
                    while ((binding.frame < binding.times.length - 1) &&
                           (binding.times[binding.frame + 1] < passed)) {
                       ++binding.frame;
                    }
                }

                // update fading
                let fading = 1;
                if ((binding.ending === null) || (binding.ending === undefined)) {
                    if (newTime < binding.starting + binding.fadings[0]) {
                        if (binding.fadings[0] > 0) {
                            fading = (newTime - binding.starting) / binding.fadings[0];
                        }
                    } else if (binding.starting + binding.duration * binding.loop - binding.fadings[2] < newTime) {
                        if (binding.fadings[2] > 0) {
                            fading = (binding.starting + binding.duration * binding.loop - newTime) / binding.fadings[2];
                        }
                    }
                } else if (newTime < binding.ending + binding.fadings[1]) {
                    if (binding.starting + binding.fadings[0] < binding.ending) {
                        fading = 1 - (newTime - binding.ending) / binding.fadings[1];
                    } else {
                        let start = (binding.ending - binding.starting) / binding.fadings[0];
                        fading = start - (newTime - binding.ending) / binding.fadings[1];
                    }
                } else {
                    fading = 0;
                }
                if (fading < 0) {
                    fading = 0;
                } else if (fading > 1) {
                    fading = 1;
                }
                binding.fading = fading;

                // group bindings
                if (priorities.indexOf(binding.priority) === -1) {
                    bindings[binding.priority] = [];
                    priorities.push(binding.priority);
                }
                bindings[binding.priority].push(binding);

            });

            // sort priorities from high to low
            priorities.sort((a, b) => b - a);

            let restFadings = 1;
            let fadings = 0;
            let weights = 0;

            let values = [];
            let max = null;
            let xs = [];
            [false, true].forEach((constant) => {
                let looper = 0;
                while ((fadings < 1) && (looper < priorities.length)) {
                    bindings[priorities[looper]].forEach((binding) => {
                        if (binding.constant !== constant) {
                            return;
                        }
                        if (!binding.mixable) {
                            if ((!max) || ((max[0] === binding.priority) &&
                                           (max[1] < binding.weight * binding.fading) &&
                                           ((max[2] & constant) === constant))) {
                                values = [[1, binding.values[binding.frame]]];
                                max = [binding.priority, binding.weight * binding.fading, constant];
                                fadings = 1;
                                weights = 1;
                            }
                        } else {
                            values.push([restFadings * binding.weight * binding.fading, binding.values[binding.frame]]);
                            fadings += binding.fading;
                            weights += restFadings * binding.weight * binding.fading;
                        }
                    });
                    restFadings = 1 - fadings;
                    ++looper;
                }
            });

            // add origin if no enough content
            if (fadings < 1) {
                if (!idBindings.mixable) {
                    values = [[1, idBindings.origins]];
                    weights = 1;
                } else {
                    values.push([1 - fadings, idBindings.origins]);
                    weights += 1 - fadings;
                }
                fadings = 1;
            }
            // if (idBindings.id === "material#BPatch > .uniforms > .map2 > .value > .offset > .x") {
            //     console.log(bindings);
            // }
            
            idBindings.updater.update(values);

        });

        Object.keys(animationMixers.channels).forEach((key) => {

            let channels = animationMixers.channels[key];
            channels.slice(0).forEach((channel) => {

                if ((channel.ending === null) || (channel.ending === undefined)) {
                    if (channel.paused) {
                        return;
                    }
                    if (newTime - channel.starting <= channel.duration * channel.loop) {
                        return;
                    }
                } else {
                    if (newTime - channel.ending < channel.fadings[1]) {
                        return;
                    }
                }

                channel.remove();

            });

        });

        animationMixers.time = newTime;

    };

};

const patchSceneAnimation = function (threeScene) {

    let objects = new Map();

    threeScene.removePatchedAnimationObject = function (object) {

        let count = objects.get(object);
        if (count > 1) {
            objects.set(object, count - 1);
        } else {
            objects.delete(object);
        }

    };

    threeScene.addPatchedAnimationObject = function (object) {

        let count = objects.get(object);
        if (!count) {
            objects.set(object, 1);
        } else {
            objects.set(object, count + 1);
        }

    };

    threeScene.patchedAnimationTicker = function (delta) {

        let tickers = [];
        for (let object of objects.keys()) {
            tickers.push(object);
        }

        for (let object of tickers) {
            try {
                object.patchedAnimationTicker(delta);
            } catch (error) {
                console.error(error);
            }
        }

    };

};

THREE.patchObjectAnimation = patchObjectAnimation;
THREE.patchSceneAnimation = patchSceneAnimation;

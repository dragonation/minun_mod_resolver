const { getClipUsage } = require("../../scripts/animation.js");

const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

Frame.prototype.onFrameConnected = function () {

    if (!this.timer) {
        let from = null;
        this.timer = $.timer(1000 / 24, () => {

            if (!from) {
                let modelID = $(this.dom).attr("wire-id").split("/")[0];
                from = $(this.dom).parent().children("ui-diagram-frame").filter((index, dom) => {
                    return $(dom).attr("wire-id") === modelID;
                })[0];
                if ((!from) || (!this.animations)) {
                    return;
                }
            }

            this.updateAnimationState(
                from.frame.getPlayingAnimationSeries(),
                from.frame.getPlayingAnimations(),
                this.animations
            );

        });
    }

};

Frame.prototype.onFrameDisconnected = function () {

    if (this.timer) {
        this.timer.cancel();
        delete this.timer;
    }

};

Frame.prototype.updateAnimationState = function (series, playings, animations) {

    let channels = {};

    for (let playing of playings) {
        if (!channels[playing.channel]) {
            channels[playing.channel] = {
                "priority": playing.priority,
                "loop": "last",
                "clips": []
            };
        }
        channels[playing.channel].playing = playing;
        channels[playing.channel].clips.push(animations[playing.name]);
    }

    for (clip of series.clips) {
        if (channels[series.options.channel]) {
            channels[series.options.channel].clips = series.clips.map((clip) => {
                return animations[clip];
            });
            channels[series.options.channel].loop = series.options.loop;
            channels[series.options.channel].priority = series.options.priority;
        }
    }

    let maxDuration = 0;
    for (let channel in channels) {
        let duration = 0;
        for (let clip of channels[channel].clips) {
            duration += clip.duration;
        }
        if (duration > maxDuration) {
            maxDuration = duration;
        }
    }

    this.animations = animations;

    let seriesChannel = channels[series.options.channel];
    let time = 0;

    let looper = 0;
    while (seriesChannel.clips[looper].id !== seriesChannel.playing.name) {
        time += seriesChannel.clips[looper].duration;
        ++looper;
    }

    if (seriesChannel && seriesChannel.playing) {
        time += seriesChannel.playing.time;
    }

    this.filler.fill({
        "time": time,
        "channels": channels,
        "duration": maxDuration
    });

};

Frame.functors = {
    "getClipUsage": function (name) {
        return getClipUsage(name);
    },
    "showCursor": function (event) {
        let x = $.dom.getDevicePixels(event.pageX) - this.filler.query("ui-ruler")[0].getClientRects()[0].left;
        this.filler.fill({
            "cursorVisible": x > 0,
            "cursor": ($.dom.getDesignPixels(x) / 3 / 24)
        });
    },
    "hideCursor": function () {
        this.filler.fill({
            "cursorVisible": false 
        });
    },
    "replayAnimations": function () {

        let modelID = $(this.dom).attr("wire-id").split("/")[0];

        let from = $(this.dom).parent().children("ui-diagram-frame").filter((index, dom) => {
            return $(dom).attr("wire-id") === modelID;
        })[0];
        if ((!from) || (!this.animations)) {
            return;
        }

        from.frame.playPausedAnimations();

        let channels = this.filler.parameters.channels;
        for (let channel in channels) {
            if (channel === "action") {
                from.frame.playAnimationSeries(channels[channel].clips.map((clip) => clip.id), {
                    "channel": channel,
                    "priority": channels[channel].priority,
                    "fading": 0,
                    "loop": "last"
                });
            } else {
                let frame = 0;
                if ((channel.split("-")[0] === "state") && 
                    (modelID.split("-")[1] === "327")) {
                    frame = 128;
                }
                from.frame.playAnimation(channels[channel].clips[0].id, {
                    "channel": channel,
                    "priority": channels[channel].priority,
                    "fading": 0,
                    "paused": channels[channel].playing.paused,
                    "frame": frame,
                    "loop": Infinity
                });
            }
        }

    },
    "playPausedAnimations": function () {

        let modelID = $(this.dom).attr("wire-id").split("/")[0];
        
        let from = $(this.dom).parent().children("ui-diagram-frame").filter((index, dom) => {
            return $(dom).attr("wire-id") === modelID;
        })[0];
        if ((!from) || (!this.animations)) {
            return;
        }

        from.frame.playPausedAnimations();

    },
    "pauseAnimations": function () {

        let modelID = $(this.dom).attr("wire-id").split("/")[0];
        
        let from = $(this.dom).parent().children("ui-diagram-frame").filter((index, dom) => {
            return $(dom).attr("wire-id") === modelID;
        })[0];
        if ((!from) || (!this.animations)) {
            return;
        }

        from.frame.pauseAnimations();

    }

};


module.exports.Frame = Frame;

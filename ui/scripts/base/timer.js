var PENDING = "pending";
var SUSPENDED = "suspended";
var CALLING = "calling";
var HELD = "hold";
var FULFILLED = "fulfilled";
var REJECTED = "rejected";

var nextJobs = [];

var scheduledJobs = [];

var Job = function Job(type, time, name, action) {

    this.id = null;

    this.type = type;
    this.time = time;

    this.state = SUSPENDED;
    this.called = false;

    this.action = action;

    this.name = name;

    var job = this;

    this.act = function () {

        if ((job.type.split(".")[0] === "once") && job.called) {
            return;
        }

        if ((job.type === "repeated.schedule") && job.handle) {

            clearTimeout(job.handle);

            delete job.handle;
        }

        if ([REJECTED, SUSPENDED].indexOf(job.state) === -1) {

            job.called = true;

            job.action.apply(job, arguments);

            if (job.type.split(".")[0] === "once") {
                job.cancel();
            }

        }

        return job;

    };

    this.cancel = function () {

        if (job.state !== REJECTED) {

            var index = scheduledJobs.indexOf(job);
            if (index !== -1) {
                scheduledJobs.splice(index, 1);
            }

            job.state = REJECTED;

            switch (job.type) {

                case "once.next": {

                    var index = nextJobs.indexOf(job);
                    if (index !== -1) {
                        nextJobs.splice(index, 1);
                    }

                    break;
                }
                case "once.timeout":
                case "once.date":
                case "repeated.schedule": {

                    clearTimeout(job.handle);

                    delete job.handle;

                    break;
                }

                case "repeated.timer": {

                    clearInterval(job.handle);

                    break;
                }

                case "once.tick":
                default: {
                    break;
                }

            }

        }

        return job;

    };

    this.suspend = function () {

        if ((job.type.split(".") === "once") && job.called) {
            return;
        }

        if ((job.state !== SUSPENDED) && (job.state !== REJECTED)) {

            job.state = SUSPENDED;

            var index = scheduledJobs.indexOf(job);
            if (index !== -1) {
                scheduledJobs.splice(index, 1);
            }

            switch (job.type) {

                case "once.next": {

                    var index = nextJobs.indexOf(job);
                    if (index !== -1) {
                        nextJobs.splice(index, 1);
                    }

                    break;
                }

                case "once.timeout":
                case "repeated.schedule":
                case "once.date": {

                    clearTimeout(job.handle);

                    delete job.handle;

                    break;
                }

                case "repeated.timer": {

                    clearInterval(job.handle);

                    delete job.handle;

                    break;
                }

                case "once.tick":
                default: {
                    break;
                }

            }

        }

        return job;
    };

    this.resume = function () {

        if (job.state === SUSPENDED) {

            job.state = PENDING;

            scheduledJobs.push(job);

            switch (job.type) {

                case "once.next": {

                    if (nextJobs.length === 0) {
                        process.nextTick(function () {

                            var jobs = nextJobs;
                            nextJobs = [];

                            jobs.forEach(function (job) {
                                job.act();
                            });

                        });
                    }

                    nextJobs.push(job);

                    break;
                }

                case "once.timeout":
                case "once.date": {

                    job.handle = setTimeout(job.act, job.time - new Date().getTime());

                    break;
                }

                case "repeated.schedule": {

                    job.handle = setTimeout(job.act, job.time);

                    break;
                }

                case "repeated.timer": {

                    job.handle = setInterval(job.act, job.time);

                    break;
                }

                case "once.tick": {

                    process.nextTick(job.act);

                    break;
                }

                default: {
                    break;
                }

            }

        };

        return job;

    };

    this.schedule = function () {

        if ((job.state === PENDING) && (job.type === "repeated.schedule") && job.called) {

            job.called = false;

            if (job.handle) {
                clearTimeout(job.handle);
            }

            job.handle = setTimeout(job.act, job.time);

        }

        return job;

    };

    this.act.job = job;

};

// action, name
// time, action, name
//
var delay = function () {

    var time = null;
    var action = null;
    var name = null;

    if (typeof arguments[0] === "function") {
        time = -1;
        action = arguments[0];
        name = arguments[1];
    } else {
        time = arguments[0];
        action = arguments[1];
        name = arguments[2];
    }

    var job = null;
    if (time === -2) {
        job = new Job("once.tick", 0, name, action);
    } else if (time === -1) {
        job = new Job("once.next", 0, name, action);
    } else if (typeof time === "number") {
        job = new Job("once.timeout", new Date().getTime() + time, name, action);
    } else if (time instanceof Date) {
        job = new Job("once.date", time.getTime(), name, action);
    } else {
        throw new Error("Unknown type of time for job to delay");
    }

    job.resume();

    return job;

};

var plan = function (date, action, name) {

    if (typeof date === "number") {
        date = new Date(date);
    }

    return delay(date, action, name);

};

var schedule = function (interval, action, name) {
    return new Job("repeated.schedule", interval, name, action).resume();
};

var timer = function (interval, action, name) {
    return new Job("repeated.timer", interval, name, action).resume();
};

var getJobs = function () {
    return scheduledJobs.slice(0);
};

module.exports = {
    "delay": delay,
    "plan": plan,
    "schedule": schedule,
    "timer": timer,
    "getJobs": getJobs
};

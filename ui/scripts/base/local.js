let target = Object.create(null);

for (let looper = 0; looper < localStorage.length; ++looper) {
    let key = localStorage.key(looper);
    if (key.slice(0, 4) === "mew.") {
        let name = key.slice(4);
        let json = localStorage.getItem(key);
        let value = undefined;
        try {
            value = JSON.parse(json);
        } catch (error) {
            console.error("Failed to restore data");
            console.error(error);
        }
        target[name] = [value];
    }
}

$.local = new Proxy(target, {
    "get": function (target, key) {
        if (!target[key]) {
            return;
        }
        return target[key][0];
    },
    "has": function (target, key) {
        return target[key] ? true : false;
    },
    "ownKeys": function (target) {
        return Object.keys(target);
    },
    "set": function (target, key, value) {
        if (value === undefined) {
            delete target[key];
            localStorage.removeItem(`mew.${key}`);
        } else {
            let json = JSON.stringify(value);
            localStorage.setItem(`mew.${key}`, json);
            target[key] = [JSON.parse(json)];
        }
        return true;
    },
    "deleteProperty": function (target, key) {
        delete target[key];
        localStorage.removeItem(`mew.${key}`);
        return true;
    },
    "getOwnPropertyDescriptor": function (target, key) {
        if (!target[key]) {
            return;
        }
        return {
            "value": target[key][0],
            "writable": true,
            "configurable": true,
            "enumerable": true
        };
    }
});
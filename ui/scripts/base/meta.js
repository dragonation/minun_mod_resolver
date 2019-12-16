var metas = Object.create(null);

if (global.document) {
    Array.prototype.forEach.call(document.querySelectorAll("meta"), function (meta) {

        var name = meta.getAttribute("name");
        if (name) {

            if (!metas[name]) {
                metas[name] = [];
            }

            var properties = Object.create(null);

            Array.prototype.forEach.call(meta.attributes, function (node) {
                if ((!node.namespaceURI) && (node.nodeName !== "name")) {
                    var key = node.nodeName.replace(/\-[a-z]/g, function (character) {
                        return character.slice(1).toUpperCase();
                    });
                    properties[key] = node.nodeValue;
                }
            });

            metas[name].push(properties);

        }

    });
} else {
    Object.keys(global.$bios.metas).forEach((key) => {
        metas[key] = global.$bios.metas[key].map((item) => {
            let result = Object.create(null);
            Object.keys(item).forEach((key) => {
                result[key] = item[key];
            });
            return result;
        });
    });
}

$.meta = function (name, field) {

    if (field === true) {
        var result = Object.create(null);
        if (metas[name]) {
            metas[name].forEach(function (meta) {
                Object.keys(meta).forEach(function (key) {
                    result[key] = meta[key];
                });
            });
        }
        return result;
    } else {
        if (!field) {
            field = "content";
        }
        let meta = metas[name];
        if (meta) {
            let looper = 0;
            while (looper < meta.length) {
                if (meta[looper][field]) {
                    return meta[looper][field];
                }
                ++looper;
            }
        }
        return null;
    }

};

$.metas = function (name, field) {

    if (field === true) {
        if (metas[name]) {
            return metas[name];
        } else {
            return [];
        }
    } else {

        if (!field) {
            field = "content";
        }

        if (metas[name]) {
            let result = [];
            let meta = metas[name];
            let looper = 0;
            while (looper < meta.length) {
                if (meta[looper][field]) {
                    result.push(meta[looper][field]);
                }
                ++looper;
            }
            return result;
        } else {
            return [];
        }

    }

};

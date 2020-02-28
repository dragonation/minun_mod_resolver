const app = require("/~pkmsm/scripts/app.js");

const resolvers = new Map();

const registerResolver = function (prototype, resolver) {

    if (typeof prototype === "function") {
        prototype = prototype.prototype;
    }

    resolvers.set(prototype, resolver);

};

const resolveResolver = function (value) {

    let resolver = resolvers.get(value);
    while ((!resolver) && (value !== null) && (value !== undefined)) {
        value = Object.getPrototypeOf(value);
        if ((value !== null) && (value !== undefined)) {
            resolver = resolvers.get(value);
        }
    }

    return resolver;

};

const Frame = function Frame(dom, filler) {

    this.dom = dom;
    this.filler = filler;

    this.filler.fill({
        "resolver": (value, target) => {

            let resolver = undefined;
            if ((value === null) || (value === undefined)) {
                resolver = resolveResolver(null);
            }

            if (value instanceof Element) {
                resolver = resolveResolver(value.localName.toLowerCase());
            }

            if (!resolver) {
                resolver = resolveResolver(value);
            }

            if (resolver) {
                value = resolver.call(this, value, target);
            }

            return value;

        }
    });

};

Frame.prototype.getTargetIDs = function () {

    let dom = this.filler.query("ui-property-list")[0];
    if (!dom) {
        return null;
    }

    return dom.getTargetIDs();

};

Frame.functors = {
    "updateConnections": function () {
        let parent = $(this.dom).parent()[0];
        if (parent && parent.updateLayouts) {
            parent.updateLayouts([this.dom]);
        }
    }
};

const parseNumber = function (value) {
    if (Math.abs(value) < 0.00001) {
        return "0";
    }
    return "" + parseFloat(value.toPrecision(6));
};

const getM3DElements = function (dom, id, query) {

    let from = $(dom).parent().children("ui-diagram-frame").filter((index, dom) => {
        return $(dom).attr("wire-id") === id;
    })[0];
    if (!from) {
        return;
    }

    let object = from.frame.filler.query("m3d-object#pokemon-model").children().filter("m3d-object").filter((index, dom) => {
        return $(dom).attr("base").split("/").slice(-1)[0] !== "shadow";
    });

    if (!query) {
        return object;
    }

    return object.find(query);

};

registerResolver(app.LinkField, function (value, target) {
    switch (target) {
        case "text": { 
            if (value.text) { return value.text; }
            return value.query.split("-").slice(-1)[0]; 
        };
        case "class": { return "link"; };
        case "complex": { return; };
        case "link": { return value.id + "/inspector/" + value.query; };
        case "open": { 
            if (value.query.split("#")[0] === "m3d-mesh") {
                $.app(this.dom).inspectMesh(value.id, value.query, this);
            } else if (value.query.split("#")[0] === "m3d-material") {
                $.app(this.dom).inspectMaterial(value.id, value.query, this);
            } else if (value.query.split("#")[0] === "m3d-texture") {
                $.app(this.dom).inspectTexture(value.id, value.query, this);
            }
            return; 
        };
        default: { return value; }; 
    }
});

registerResolver(app.MeshField, function (value, target) {
    switch (target) {
        case "text": { 
            if (value.text) { return value.text; }
            return value.query.split("-").slice(-1)[0]; 
        };
        case "class": { return "link"; };
        case "complex": { return; };
        case "link": { return value.id + "/inspector/" + value.query; };
        case "open": { 
            $.app(this.dom).inspectMesh(value.id, value.query, this);
            return; 
        };
        default: { return value; }; 
    }
});

registerResolver(app.MaterialField, function (value, target) {
    switch (target) {
        case "text": { 
            if (value.text) { return value.text; }
            return value.query.split("-").slice(-1)[0]; 
        };
        case "class": { return "link"; };
        case "complex": { return; };
        case "link": { return value.id + "/inspector/" + value.query; };
        case "open": { 
            $.app(this.dom).inspectMaterial(value.id, value.query, this);
            return; 
        };
        default: { return value; }; 
    }
});

registerResolver(app.TokenField, function (value, target) {
    switch (target) {
        case "text": { return value.value; };
        case "class": { return "token"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { return; };
        default: { return value; }; 
    }
});

registerResolver(app.ResourceField, function (value, target) {
    switch (target) {
        case "text": { return value.target.split("/").slice(-1)[0]; };
        case "class": { return "link"; };
        case "complex": { return; };
        case "link": { return value.id + "/" + value.target; };
        case "open": { 
            $.app(this.dom).smartOpen(value.id + "/" + value.target, this);
            return; 
        };
        default: { return value; }; 
    }
});

registerResolver(app.VectorField, function (value, target) {
    switch (target) {
        case "text": { 
            let simplify = (value) => {
                let result = value.toPrecision(6); 
                let splitted = result.split(".");
                if (splitted.length > 1) {
                    let rest = splitted[1].replace(/0+$/, "");
                    if (rest) {
                        result = splitted[0] + "." + rest;
                    } else {
                        result = splitted[0];
                    }
                }
                return result;
            };
            return `Vec${value.value.length}<${value.value.map(simplify).join(", ")}>`;
        };
        case "class": { return "shrinked"; };
        case "complex": { return; };
        case "link": { return ; };
        case "open": { return; };
        default: { return value; }; 
    }
});

registerResolver(app.TokenListField, function (value, target) {
    switch (target) {
        case "text": { return value.value.join(", "); };
        case "class": { return "shrinked"; };
        case "complex": { return; };
        case "link": { return ; };
        case "open": { return; };
        default: { return value; }; 
    }
});

registerResolver(Boolean, function (value, target) {
    switch (target) {
        case "text": { return value ? "yes" : "no"; };
        case "class": { return "boolean"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { return; };
        default: { return value; }; 
    }
});

registerResolver(Number, function (value, target) {
    switch (target) {
        case "text": { 
            let result = value.toPrecision(6); 
            let splitted = result.split(".");
            if (splitted.length > 1) {
                let rest = splitted[1].replace(/0+$/, "");
                if (rest) {
                    result = splitted[0] + "." + rest;
                } else {
                    result = splitted[0];
                }
            }
            return result;
        };
        case "class": { return "number"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { return; };
        default: { return value; }; 
    }
});

registerResolver(String, function (value, target) {
    switch (target) {
        case "text": { return value; };
        case "class": { return "string"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { return; };
        default: { return value; }; 
    }
});

registerResolver(null, function (value, target) {
    switch (target) {
        case "text": { 
            return value === null ? "null" : "undefined";
        };
        case "class": { return "nil"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { return; };
        default: { return value; }; 
    }
});

// registerResolver(GUID, function (value, target) {
//     switch (target) {
//         case "text": { return value.id; };
//         case "class": { return "link"; };
//         case "complex": { return value.id; };
//         case "link": { return value.id; };
//         case "open": {
//             $.app("hmm5").smartOpen(value.id);
//             return;
//         };
//         default: { return value; };
//     }
// });

// registerResolver(Enum, function (value, target) {
//     switch (target) {
//         case "text": { return value.token; };
//         case "class": { return value.href ? "token link" : "token"; };
//         case "complex": { return value.value; };
//         case "link": { return value.href; };
//         case "open": {
//             if (value.href) {
//                 $.app("hmm5").smartOpen(value.href);
//             }
//             return;
//         };
//         default: { return value; };
//     }
// });

// registerResolver(File, function (value, target) {
//     switch (target) {
//         case "text": { return value.href; };
//         case "class": { return "link"; };
//         case "complex": { return value.href; };
//         case "link": { return value.href; };
//         case "open": {
//             $.app("hmm5").smartOpen(value.href);
//             return;
//         };
//         default: { return value; };
//     }
// });

// registerResolver(Reference, function (value, target) {
//     switch (target) {
//         case "text": { return value.href; };
//         case "class": { return "link"; };
//         case "complex": { return value.href; };
//         case "link": { return value.href; };
//         case "open": {
//             $.app("hmm5").smartOpen(value.href);
//             return;
//         };
//         default: { return value; };
//     }
// });

// registerResolver(Boolean, function (value, target) {
//     switch (target) {
//         case "text": { return value ? "true" : "false"; };
//         case "class": { return "boolean"; };
//         case "complex": { return value; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver(Number, function (value, target) {
//     switch (target) {
//         case "text": { return parseNumber(value); };
//         case "class": { return "number"; };
//         case "complex": { return value; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver(String, function (value, target) {
//     switch (target) {
//         case "text": { return value + ""; };
//         case "class": { return "string"; };
//         case "complex": { return value; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver(Array, function (value, target) {
//     switch (target) {
//         case "text": {
//             if (value.length === 0) {
//                 return "[]";
//             }
//             let first = value.filter((x) => (x !== null) && (x !== undefined))[0];
//             if (first !== undefined) {
//                 let first = value[0];
//                 let name = first[at + "@name"];
//                 if (!name) {
//                     if ((typeof first === "object") && first.constructor && (!Object.hasOwnProperty.call(first, "constructor"))) {
//                         name = first.constructor.name;
//                     } else {
//                         name = typeof first;
//                     }
//                 }
//                 return `[${name} x ${value.length}]`;
//             } else {
//                 return `[nil x${value.length}]`;
//             }
//         };
//         case "class": { return "array"; };
//         case "complex": { return value; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver(Object, function (value, target) {

//     if (value[at + "@name"]) {
//         let resolver = resolvers.get(value[at + "@name"]);
//         if (resolver) {
//             return resolver(value, target);
//         }
//     }

//     switch (target) {
//         case "text": {
//             if (value[at + "@name"]) {
//                 return `<${value[at + "@name"]}>`;
//             }
//             if ((typeof first === "object") && first.constructor && (!Object.hasOwnProperty.call(first, "constructor"))) {
//                 return `<${value.constructor.name}>`;
//             }
//             return `<${typeof value}>`;
//         };
//         case "class": { return "object"; };
//         case "complex": { return value; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver(Inline, function (value, target) {
//     switch (target) {
//         case "text": {
//             return `<inline>`;
//         };
//         case "class": { return "object"; };
//         case "complex": { return value; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver("Vec2", function (value, target) {
//     switch (target) {
//         case "text": { return `[Vec2: ${parseNumber(value.x)}, ${parseNumber(value.y)}]`; };
//         case "class": { return "shrinked"; };
//         case "complex": { return ""; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver("Vec3", function (value, target) {
//     switch (target) {
//         case "text": { return `[Vec3: ${parseNumber(value.x)}, ${parseNumber(value.y)}, ${parseNumber(value.z)}]`; };
//         case "class": { return "shrinked"; };
//         case "complex": { return ""; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver("Rect", function (value, target) {
//     switch (target) {
//         case "text": { return `[Rect: ${parseNumber(value.x1)}, ${parseNumber(value.y1)}, ${parseNumber(value.x2)}, ${parseNumber(value.y2)}]`; };
//         case "class": { return "shrinked"; };
//         case "complex": { return ""; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver("Vec4", function (value, target) {
//     switch (target) {
//         case "text": { return `[Vec4: ${parseNumber(value.x)}, ${parseNumber(value.y)}, ${parseNumber(value.z)}, ${parseNumber(value.w)}]`; };
//         case "class": { return "shrinked"; };
//         case "complex": { return ""; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

// registerResolver("Quat", function (value, target) {
//     switch (target) {
//         case "text": { return `[Quat: ${parseNumber(value.x)}, ${parseNumber(value.y)}, ${parseNumber(value.z)}, ${parseNumber(value.w)}]`; };
//         case "class": { return "shrinked"; };
//         case "complex": { return ""; };
//         case "link": { return ""; };
//         default: { return value; };
//     }
// });

module.exports.Frame = Frame;

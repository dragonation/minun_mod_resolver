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
        "resolver": (value, target, decorator) => {

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
                value = resolver.call(this, value, target, decorator);
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

registerResolver(app.ToggleField, function (value, target, decorator) {
    switch (target) {
        case "text": { return value.value ? "yes" : "no"; };
        case "class": { return "boolean editable"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { 
            value.setter(!value.value);
            return; 
        };
        case "decorate": {
            if (!decorator.checkDOM) {
                decorator.checkDOM = $("<img>").css({
                    "width": `${$.dom.getDevicePixels(16)}px`,
                    "height": `${$.dom.getDevicePixels(16)}px`,
                    "display": "inline-block",
                    "margin-left": `${$.dom.getDevicePixels(-3)}px`,
                    "margin-top": `${$.dom.getDevicePixels(1)}px`,
                    "margin-right": `${$.dom.getDevicePixels(1)}px`,
                    "margin-bottom": `${$.dom.getDevicePixels(1)}px`
                });
            }
            decorator.checkDOM.attr({
                "src": `/res/states/${value.value ? 'checked' : 'unchecked'}.svg`
            });
            if (decorator.checkDOM.parent()[0] !== decorator) {
                $(decorator).append(decorator.checkDOM);
            }
            return;
        };
        default: { return value; }; 
    }
});

registerResolver(app.NumberField, function (value, target, decorator) {
    switch (target) {
        case "text": { return value.value; };
        case "class": { return "number editable"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { 
            // value.setter(!value.value);
            return; 
        };
        case "decorate": { return; };
        default: { return value; }; 
    }
});

registerResolver(app.BackgroundColorField, function (value, target, decorator) {
    switch (target) {
        case "text": { 
            let r = ("0" + Math.floor(value.value.r).toString(16)).slice(-2);
            let g = ("0" + Math.floor(value.value.g).toString(16)).slice(-2);
            let b = ("0" + Math.floor(value.value.b).toString(16)).slice(-2);
            let a = ("0" + Math.floor(value.value.a).toString(16)).slice(-2);
            return `#${r}${g}${b}${a}`; 
        };
        case "class": { return "shrinked editable"; };
        case "complex": { return; };
        case "link": { return; };
        case "open": { 

            $.app(this.dom).pickColor(value.value, ({r, g, b, a}) => {

                let id = $(this.dom).attr("wire-id").split("/")[0];

                let modelFrame = $.app(this.dom).filler.query("#diagram ui-diagram-frame").filter((index, dom) => {
                    return $(dom).attr("wire-id") === id;
                })[0];

                let renderer = modelFrame.filler.query("m3d-scene")[0].m3dRenderer;

                renderer.setClearColor(new THREE.Color(r / 255, g / 255, b / 255), a / 255);

                $.local["pkmsm.model-viewer.background-color"] = { r, g, b, a };

                this.filler.parameters.target.background.value = { r, g, b, a };

                this.filler.fill({});

            });

            return; 
        };
        case "decorate": {
            if (!decorator.colorDOM) {
                decorator.colorDOM = $("<div>").css({
                    "border": `solid ${$.dom.getDevicePixels(1.5)}px #888`,
                    "background-image": "url('/res/transparent-background.svg')",
                    "background-size": "stretch",
                    "background-repeat": "no-repeat",
                    "background-position": "center",
                    "width": `${$.dom.getDevicePixels(10)}px`,
                    "height": `${$.dom.getDevicePixels(10)}px`,
                    "border-radius": `${$.dom.getDevicePixels(3)}px`,
                    "display": "inline-block",
                    "position": "relative",
                    "margin-top": `${$.dom.getDevicePixels(4)}px`,
                    "margin-right": `${$.dom.getDevicePixels(4)}px`,
                    "margin-bottom": `${$.dom.getDevicePixels(4)}px`
                });
                decorator.colorDOM.wellDOM = $("<div>").css({
                    "width": "100%",
                    "height": "100%",
                    "border-radius": `${$.dom.getDevicePixels(1.5)}px`
                });
                decorator.colorDOM.append(decorator.colorDOM.wellDOM);
            }
            decorator.colorDOM.wellDOM.css({
                "background-color": `rgba(${value.value.r}, ${value.value.g}, ${value.value.b}, ${value.value.a / 255})`
            });
            if (decorator.colorDOM.parent()[0] !== decorator) {
                $(decorator).append(decorator.colorDOM);
            }
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

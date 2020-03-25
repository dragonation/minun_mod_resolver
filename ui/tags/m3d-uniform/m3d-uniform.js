const THREE = require("../../scripts/three.js");

module.exports = {
    "attributes": [ "name", "type" ],
    "listeners": {
        "onconnected": function () {

            this.observer = new MutationObserver(() => {

                if (!this.m3dUniform) {
                    return;
                }

                this.m3dRefreshUniform();

            });
            this.observer.observe(this, { "characterData": true, "subtree": true });

            this.m3dRefreshUniform();

        },
        "onupdated": function () {

            if (!this.m3dUniform) { return; }

            this.m3dRefreshUniform();

        },
        "ondisconnected": function () {

            this.observer.disconnect();

            delete this.observer;

        }
    },
    "methods": {
        "m3dRefreshUniform": function () {

            let value = this.textContent.trim().split(/[\s,]+/);
            if (value.length === 0) {
                value = 0;
            } else if (value.length === 1) {
                if (value[0] === "true") {
                    value = 1;
                } else if (value[0] === "false") {
                    value = 0;
                } else {
                    value = parseFloat(value[0]);    
                }
            } else {
                let array = [];
                for (let looper = 0; looper < value.length; ++looper) {
                    if (value[looper] === "true") {
                        array[looper] = 1;
                    } else if (value[looper] === "false") {
                        array[looper] = 0;
                    } else {
                        array[looper] = parseFloat(value[looper]);    
                    }
                }
                value = array;
            }

            let type = this.getAttribute("type");
            switch (type) {
                case "bool": { 
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = value ? true : false;
                    } else {
                        this.m3dUniform = new THREE.Uniform(value ? true : false);
                    }
                    this.m3dUniform.origin = value ? true : false;
                    break; 
                }
                case "bool[]": { 
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = value.map((value) => value ? true : false);
                    } else {
                        this.m3dUniform = new THREE.Uniform(value.map((value) => value ? true : false));
                    }
                    this.m3dUniform.origin = value.map((value) => value ? true : false);
                    break; 
                }
                case "int": 
                case "float": { 
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = value;
                    } else {
                        this.m3dUniform = new THREE.Uniform(value);
                    }
                    this.m3dUniform.origin = value;
                    break; 
                }
                case "int[]":
                case "float[]": { 
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = value;
                    } else {
                        this.m3dUniform = new THREE.Uniform(value);
                    }
                    this.m3dUniform.origin = value.slice(0);
                    break; 
                }
                case "vec3": { 
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = new THREE.Vector3(value[0], value[1], value[2]);
                    } else {
                        this.m3dUniform = new THREE.Uniform(new THREE.Vector3(value[0], value[1], value[2]));
                    }
                    this.m3dUniform.origin = new THREE.Vector3(value[0], value[1], value[2]);
                    break; 
                }
                case "vec3[]": { 
                    let array = [];
                    let array2 = [];
                    for (let looper = 0; looper < value.length; looper += 3) {
                        array.push(new THREE.Vector3(value[looper], value[looper + 1], value[looper + 2]));
                        array2.push(new THREE.Vector3(value[looper], value[looper + 1], value[looper + 2]));
                    }
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = array;
                    } else {
                        this.m3dUniform = new THREE.Uniform(array);
                    }
                    this.m3dUniform.origin = array2;
                    break; 
                }
                case "vec4": { 
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = new THREE.Vector4(value[0], value[1], value[2], value[3]);
                    } else {
                        this.m3dUniform = new THREE.Uniform(new THREE.Vector4(value[0], value[1], value[2], value[3]));
                    }
                    this.m3dUniform.origin = new THREE.Vector4(value[0], value[1], value[2], value[3]);
                    break; 
                }
                case "vec4[]": { 
                    let array = [];
                    let array2 = [];
                    for (let looper = 0; looper < value.length; looper += 4) {
                        array.push(new THREE.Vector4(value[looper], value[looper + 1], 
                                                     value[looper + 2], value[looper + 3]));
                        array2.push(new THREE.Vector4(value[looper], value[looper + 1], 
                                                      value[looper + 2], value[looper + 3]));
                    }
                    if (this.m3dUniform) { 
                        this.m3dUniform.value = array;
                    } else {
                        this.m3dUniform = new THREE.Uniform(array);
                    }
                    this.m3dUniform.origin = array2;
                    break; 
                }
                default: { 
                    if (this.m3dUniform && (typeof value === "number") && (typeof this.m3dUniform.value === "number")) {
                        this.m3dUniform.value = value;
                        this.m3dUniform.origin = value;
                    } else if (this.m3dUniform && Array.isArray(value) && 
                               Array.isArray(this.m3dUniform.value) && 
                               (this.m3dUniform.value.length === value.length)) {
                        for (let looper = 0; looper < value.length; ++looper) {
                            this.m3dUniform.value[looper] = value[looper];
                            this.m3dUniform.origin[looper] = value[looper];
                        }
                    } else {
                        this.m3dUniform = new THREE.Uniform(value);
                        this.m3dUniform.origin = value;
                    }
                    break; 
                }
            }

        },
        "m3dGetUniform": function () {

            if (!this.m3dUniform) {
                this.m3dRefreshUniform();
            }

            return this.m3dUniform;
        }
    }
}
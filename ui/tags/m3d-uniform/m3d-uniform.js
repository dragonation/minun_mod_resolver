const THREE = require("../../scripts/three.js");

module.exports = {
    "attributes": [ "name" ],
    "listeners": {
        "onconnected": function () {

            this.observer = new MutationObserver(() => {

                if (!this.m3dUniform) {
                    return;
                }

                let value = this.textContent.trim().split(/[\s,]+/);
                if (value.length === 0) {
                    value = 0;
                } else if (value.length === 1) {
                    if (value === "true") {
                        value = 1;
                    } else if (value === "false") {
                        value = 0;
                    } else {
                        value = parseFloat(value);    
                    }
                } else {
                    let array = new Float32Array(value.length);
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

                if ((typeof value === "number") && (typeof this.m3dUniform.value === "number")) {
                    this.m3dUniform.value = value;
                } else if ((value instanceof Float32Array) && 
                           (this.m3dUniform.value instanceof Float32Array) && 
                           (this.m3dUniform.value.length === value.length)) {
                    for (let looper = 0; looper < value.length; ++looper) {
                        this.m3dUniform.value[looper] = value[looper];
                    }
                } else {
                    let name = $(this).attr("name");
                    this.m3dUniform = new THREE.Uniform(value);
                }

            });
            this.observer.observe(this, { "characterData": true });

        },
        "ondisconnected": function () {

            this.observer.disconnect();
            delete this.observer;

        }
    },
    "methods": {
        "m3dGetUniform": function () {

            if (!this.m3dUniform) {
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
                    let array = new Float32Array(value.length);
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
                this.m3dUniform = new THREE.Uniform(value);
            }

            return this.m3dUniform;
        }
    }
}
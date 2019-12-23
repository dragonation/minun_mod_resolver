const THREE = require("../../scripts/three.js");

const prepareSkeleton = function (dom) {

    if (!dom.m3dSkeleton) {

        dom.m3dSkeleton = new THREE.Skeleton([]);

        syncRoot(dom, $(dom).attr("root"));
        syncID(dom, $(dom).attr("id"));
        // syncHelper(dom, $(dom).attr("helper"));

        syncChildren(dom);

        trigSkeletonUpdate(dom);

    }

    return dom.m3dSkeleton;

};

const disposeSkeleton = function (dom) {

    if (dom.m3dSkeleton) {
        delete dom.m3dSkeleton;
    }

    if (dom.m3dSkeletonHelper) {
        if (dom.m3dSkeletonHelper.parent) {
            dom.m3dSkeletonHelper.parent.remove(dom.m3dSkeletonHelper);
        }
        delete dom.m3dSkeletonHelper;
    }

};

const syncHelper = function (dom, value) {

    if (!dom.m3dSkeleton) { return; }

    let root = dom.m3dSkeleton.m3dRoot;
    if (!root) {
        if (dom.m3dSkeletonHelper) {
            if (dom.m3dSkeletonHelper.parent) {
                dom.m3dSkeletonHelper.parent.remove(dom.m3dSkeletonHelper);
            }
            delete dom.m3dSkeletonHelper;
        }
        return;
    }

    root = dom.m3dSkeleton.bones.filter((bone) => bone.name === $(dom).attr("root"))[0];
    if (root && root.parent) {
        if (value === "yes") {
            if (!dom.m3dSkeletonHelper) {
                dom.m3dSkeletonHelper = new THREE.SkeletonHelper(root);
            }
            dom.m3dSkeletonHelper.bones = dom.m3dSkeleton.bones.slice(0);
            root.parent.add(dom.m3dSkeletonHelper);
        } else {
            if (dom.m3dSkeletonHelper) {
                if (dom.m3dSkeletonHelper.parent) {
                    dom.m3dSkeletonHelper.parent.remove(dom.m3dSkeletonHelper);
                }
                delete dom.m3dSkeletonHelper;
            }
        }
    } else {
        if (dom.m3dSkeletonHelper) {
            if (dom.m3dSkeletonHelper.parent) {
                dom.m3dSkeletonHelper.parent.remove(dom.m3dSkeletonHelper);
            }
            delete dom.m3dSkeletonHelper;
        }
    }

};

const syncID = function (dom, value) {

    if (!dom.m3dSkeleton) { return; }

    if (dom.m3dSkeleton.name !== value) {
        dom.m3dSkeleton.name = value;
        trigSkeletonUpdate(dom);
    }

};

const syncRoot = function (dom, value) {

    if (!dom.m3dSkeleton) { return; }

    let oldRoot = dom.m3dSkeleton.m3dRoot;

    let root = undefined;
    if (value) {
        root = dom.m3dSkeleton.bones.filter((bone) => bone.name === value)[0];
    }

    if (oldRoot !== root) {

        let parent = undefined;

        if (oldRoot) {
            parent = oldRoot;
            oldRoot.parent.remove(oldRoot);
        }

        if (parent) {
            parent.add(root);
        }

        dom.m3dSkeleton.m3dRoot = root;

    }

    syncHelper(dom, $(dom).attr("helper"));

};

const syncChildren = function (dom) {

    if (!dom.m3dSkeleton) { return; }

    // record all old bones
    let bones = new Set();
    for (let bone of dom.m3dSkeleton.bones) {
        if (bone.m3dFromTagObject) {
            bones.add(bone);
        }
    }

    // get all bones
    let newBonesMap = Object.create(null);
    let newBones = [];
    for (let child of dom.children) {
        if (typeof child.m3dGetObject === "function") {
            let m3dObject = child.m3dGetObject();
            m3dObject.m3dFromTagObject = true;
            if (m3dObject.isBone) {
                newBones[m3dObject.m3dIndex] = m3dObject;
                newBonesMap[m3dObject.name] = m3dObject;
            }
            bones.delete(m3dObject);
        }
    }

    // build structure
    for (let bone of newBones) {
        if (bone && bone.m3dParent && newBonesMap[bone.m3dParent]) {
            if (bone.parent !== newBonesMap[bone.m3dParent]) {
                newBonesMap[bone.m3dParent].add(bone);
                bone.updateMatrixWorld(true);
            }
        }
    }

    // assign bones
    for (let looper = 0; looper < newBones.length; ++looper) {
        let bone = newBones[looper];
        if (!bone) {
            bone = new THREE.Bone();
            bone.m3dFromTagObject = true;
            bone.updateMatrixWorld(true);
        }
        dom.m3dSkeleton.bones[looper] = bone;
    }
    dom.m3dSkeleton.bones.length = newBones.length;
    if (dom.m3dSkeleton.boneMatrices.length !== dom.m3dSkeleton.bones.length * 16) {
        dom.m3dSkeleton.boneMatrices = new Float32Array(dom.m3dSkeleton.bones.length * 16);
    }
    dom.m3dSkeleton.boneInverses = undefined;
    dom.m3dSkeleton.calculateInverses();

    // update bone matrix
    dom.m3dSkeleton.update();
    dom.m3dSkeleton.calculateInverses();

    // remove rest old bones
    for (let bone of bones) {
        // there is no need to remove bone from skeleton
    }

    syncRoot(dom, $(dom).attr("root"));

    if (dom.parentNode && (typeof dom.parentNode.m3dSyncChildren === "function")) {
        dom.parentNode.m3dSyncChildren();
    }

};

const trigSkeletonUpdate = function (dom) {

    let parent = dom.parentNode;
    while (parent && ((!parent.localName) || (parent.localName.toLowerCase() !== "m3d-scene"))) {
        parent = parent.parentNode;
    }

    let id = $(dom).attr("id");

    if (parent && id) {
        parent.m3dTrigSkeletonUpdate(id);
    }

};

module.exports = {
    "attributes": [ "id", "helper", "root" ],
    "listeners": {
        "onconnected": function () {
            this.mutationObserver = new MutationObserver(() => {
                syncChildren(this);
            });
            this.mutationObserver.observe(this, { "childList": true });
            trigSkeletonUpdate(this);
        },
        "onupdated": function (name, value) {
            switch (name) {
                case "id": { syncID(this, value); break; };
                case "helper": { syncHelper(this, value); break; };
                case "root": { syncRoot(this, value); break; };
                default: { break; };
            }
        },
        "ondisconnected": function () {
            this.mutationObserver.disconnect(this);
            disposeSkeleton(this);
        }
    },
    "methods": {
        "m3dGetSkeleton": function () {
            return prepareSkeleton(this);
        },
        "m3dGetObject": function () {
            return this.m3dGetSkeleton().m3dRoot;
        },
        "m3dSyncBones": function () {
            if (this.m3dSyncingBones) {
                return;
            }
            this.m3dsyncingbones = true;
            $.delay(() => {
                this.m3dSyncingBones = false;
                syncChildren(this);
                trigSkeletonUpdate(this);
            });
        }
    }
};

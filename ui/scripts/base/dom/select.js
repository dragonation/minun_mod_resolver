$.between = function (beginning, ending, including) {

    let result = [];

    let parent = $(beginning[0].parentNode);
    let found = false;
    for (let node of parent.subnodes()) {
        if (node === beginning[0]) {
            found = true;
            if (including) {
                result.push(node);
            }
        } else if (node === ending[0]) {
            found = false;
            if (including) {
                result.push(node);
            }
        } else if (found) {
            result.push(node);
        }
    }

    return $(result);

};

$.fn.subnodes = function () {

    let result = [];

    for (let node of this) {
        for (let child of node.childNodes) {
            result.push(child);
        }
    }

    return $(result);

};

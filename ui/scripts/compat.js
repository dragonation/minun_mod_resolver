(() => {

    if (!window.ResizeObserver) {

        let resizeObservers = new Set();

        window.ResizeObserver = function ResizeObserver(listener) {

            this.nodes = new Map();

            resizeObservers.add(this);

            this.listener = listener;

        };

        window.ResizeObserver.prototype.observe = function (node) {

            this.nodes.set(node, {});

            resizeObservers.add(this);

        };

        window.ResizeObserver.prototype.disconnect = function () {

            resizeObservers.delete(this);

        };

        setInterval(() => {
            for (let observer of resizeObservers) {
                let changes = [];
                for (let node of observer.nodes.keys()) {
                    let oldSize = observer.nodes.get(node);
                    let size = $(node).css(["width", "height"]);
                    if ((size.width !== oldSize.width) || (size.height !== oldSize.height)) {
                        changes.push(node);
                        oldSize.width = size.width;
                        oldSize.height = size.height;
                    }
                }
                if (changes.length > 0) {
                    observer.listener(changes);
                }
            }
        }, 500);

    }

})();
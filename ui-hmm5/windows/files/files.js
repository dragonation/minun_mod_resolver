const Window = function Window(dom, filler) {

    this.dom = dom;

    this.filler = filler;

    this.path = "/";
    this.files = Object.create(null);

    this.updateView().catch((error) => {
        console.error(error);
    });

};

Window.prototype.navigateFiles = function (path) {

    this.path = path;

    this.updateView().catch((error) => {
        console.error(error);
    });

};

Window.prototype.updateView = async function () {

    let dirs = [ { "path": "/" } ];
    if (this.path !== "/") {
        this.path.split("/").slice(1).forEach((part, index, list) => {
            let path = "/" + list.slice(0, index + 1).join("/");
            let dir = {
                "path": path
            };
            dirs.push(dir);
        });
    }

    if (this.selecteds) {
        for (let dir of dirs) {
            let selecteds = Object.create(null);
            let path = dir.path; if (path[path.length - 1] !== "/") { path += "/"; }
            this.selecteds.filter((file) => file.slice(0, path.length) === path).map((file) => file.slice(path.length)).forEach((file) => {
                selecteds[file.split("/")[0]] = true;
            });
            dir.selecteds = Object.keys(selecteds);
        }
    }

    let files = Object.create(null);

    for (let dir of dirs) {
        if (!this.files[dir.path]) {
            this.files[dir.path] = await this.listFiles(dir.path);
        }
        dir.files = this.files[dir.path]
        files[dir.path] = dir.files;
    }

    this.files = files;

    this.filler.fill({
        "path": this.path,
        "dirs": dirs
    });

};

Window.prototype.listFiles = function (path) {
    return new Promise(function (resolve, reject) {
        $.ajax("/~hmm5/list/files" + path, {
            "success": function (data) {
                let result = [];
                for (let filename of (data + "").trim().split("\n")) {
                    if (filename[filename.length - 1] === "/") {
                        result.push({ "type": "dir", "filename": filename.slice(0, -1) });
                    } else {
                        result.push({ "type": "file", "filename": filename });
                    }
                }
                resolve(result);
            },
            "error": function (error) {
                reject(error);
            }
        });
    });
};

Window.functors = {
    "selectFile": function (path, filename) {

        let file = path;
        if (file[file.length - 1] !== "/") {
            file += "/";
        }

        this.selecteds = [file + filename];

        let item = this.files[path].filter((file) => file.filename === filename)[0];
        // TODO: fix the bug from collection view for dblclick target changes
        if (item && (item.type === "dir")) {
            $.delay(300, () => {
                this.navigateFiles(file + filename);
            });
        } else {
            $.delay(300, () => {
                this.updateView();
            });
        }

    },
    "openFile": function (path, filename, event) {

        let item = this.files[path].filter((file) => file.filename === filename)[0];
        if ((!item) || (item.type === "dir")) {
            return;
        }

        let file = path;
        if (file[file.length - 1] !== "/") {
            file += "/";
        }
        file += filename;

        $.app("hmm5").smartOpen(file);

        this.dom.closeWindow();

    }
};

module.exports.Window = Window;

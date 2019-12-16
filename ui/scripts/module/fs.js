(() => {

    const Module = require("module");

    const notImpl = Module.register.stub;
    const notImplSync = Module.register.stub.sync;

    Module.register("fs", {

        "Stats": notImplSync,
        "FSWatcher": notImplSync,
        "ReadStream": notImplSync,
        "WriteStream": notImplSync,

        "exists": function (path, callback) {
            callback(false);
        },
        "existsSync": function (path) {
            return false;
        },

        "readFile": notImpl,
        "readFileSync": function (filePath) {

            var finalFilePath = require("path").resolve(process.cwd(), filePath);

            var $ = global.$;

            if ($ && $.resources && $.resources.load && $.resources.hasCache(finalFilePath)) {

                var content = null;

                $.resources.load(finalFilePath, function (error, contents) {
                    if (error) {
                        throw error;
                    } if (contents[finalFilePath].error) {
                        throw contents[finalFilePath].error;
                    } else {
                        content = contents[finalFilePath].content;
                    }
                });

                return content;

            } else {

                var request = null;
                if (global.XDomainRequest) {
                    request = new XDomainRequest();
                } else if (global.XMLHttpRequest) {
                    request = new XMLHttpRequest();
                } else {
                    request = new ActiveXObject("Microsoft.XMLHTTP");
                }
                request.timeout = 30000;

                request.open("GET", finalFilePath, false);

                request.send();

                return request.responseText;

            }

        },
        "writeFile": notImpl,
        "writeFileSync": notImplSync,
        "truncate": notImpl,
        "truncateSync": notImplSync,
        "unlink": notImpl,
        "unlinkSync": notImplSync,

        "stat": notImpl,
        "statSync": notImplSync,
        "lstat": notImpl,
        "lstatSync": notImplSync,

        "readdir": notImpl,
        "readdirSync": notImplSync,
        "mkdir": notImpl,
        "mkdirSync": notImplSync,
        "rmdir": notImpl,
        "rmdirSync": notImplSync,

        "rename": notImpl,
        "renameSync": notImplSync,
        "link": notImpl,
        "linkSync": notImplSync,
        "symlink": notImpl,
        "symlinkSync": notImplSync,
        "readlink": notImpl,
        "readlinkSync": notImplSync,
        "chmod": notImpl,
        "chmodSync": notImplSync,
        "lchmod": notImpl,
        "lchmodSync": notImplSync,
        "chown": notImpl,
        "chownSync": notImplSync,
        "lchown": notImpl,
        "lchownSync": notImplSync,
        "access": notImpl,
        "accessSync": notImplSync,
        "utimes": notImpl,
        "utimesSync": notImplSync,

        "realpath": notImpl,
        "realpathSync": notImplSync,

        "open": notImpl,
        "openSync": notImplSync,
        "read": notImpl,
        "readSync": notImplSync,
        "write": notImpl,
        "writeSync": notImplSync,
        "close": notImpl,
        "closeSync": notImplSync,

        "append": notImpl,
        "appendSync": notImplSync,

        "ftruncate": notImpl,
        "ftruncateSync": notImplSync,
        "fstat": notImpl,
        "fstatSync": notImplSync,
        "fsync": notImpl,
        "fsyncSync": notImplSync,
        "fchmod": notImpl,
        "fchmodSync": notImplSync,
        "fchown": notImpl,
        "fchownSync": notImplSync,
        "futimes": notImpl,
        "futimesSync": notImplSync,

        "createReadStream": notImplSync,
        "createWriteStream": notImplSync,

        "watch": notImplSync,
        "watchFile": notImplSync,
        "unwatchFile": notImplSync

    });

})();

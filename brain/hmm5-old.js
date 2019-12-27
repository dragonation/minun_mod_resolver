
@servlet.get("/list/deps//*", function (request, response) {

    this.break();

    response.headers["Content-Type"] = "text/plain";

    let path = request.path.slice("/list/deps".length);

    let hash = request.get.hash;

    let link = path;
    if (hash) {
        link += "#" + hash;
    }

    return @mew.rpc("hmm5.analyzeDependencies", {
        "link": link
    }).then(function (files) {
        response.writer.end(files.join("\n"), this.test);
    });

});

// @servlet.get("/zip//*", function (request, response) {

// });

// @servlet.get("/m3d//*", function (request, response) {

// });

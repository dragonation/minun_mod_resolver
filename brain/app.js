@servlet.get("/app-list", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "text/plain";

	return @.async(function () {

		response.writer.end(["hmm5"].join("\n"), this.test);

	});

});

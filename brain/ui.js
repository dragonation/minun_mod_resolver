@servlet.get("/pak//*", function (request, response) {

	this.break();

	if (request.get.download === "yes") {
		response.headers["Content-Type"] = "application/x-download";
	} else {
		let extname = @.fs.extname(request.path.toLowerCase());
		switch (extname) {
			case ".xdb": {
				response.headers["Content-Type"] = "application/xml";
				break;
			};
			case ".dds": {
				response.headers["Content-Type"] = "image/vnd.ms-dds";
				break;
			};
			default: {
				response.headers["Content-Type"] = @.fs.mime(extname);
				break;
			};
		}
	}

	return @mew.rpc("hmm5.loadContent", {
		"path": request.path.slice(5)
	}).then(function (binary) {
		response.writer.end(binary, this.test);
	});

});

@servlet.get("/uid/*", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "text/plain";

	return @mew.rpc("hmm5.resolveUID", {
		"uid": request.path.slice(5)
	}).then(function (path) {
		response.writer.end(path, this.test);
	});

});

@servlet.get("/search//*", function (request, response) {

	this.break();

	let keywords = [];

	response.headers["Content-Type"] = "text/plain";

	request.path.slice(8).split(/[\s,;\+]/).forEach((word) => {
		word = word.trim().toLowerCase();
		if (word && keywords.indexOf(word) === -1) {
			keywords.push(word);
		}
	});

	return @mew.rpc("hmm5.searchFiles", {
		"keywords": keywords
	}).then(function (files) {
		response.writer.end(files.map((file) => file.path).join("\n"), this.test);
	});

});

@servlet.get("/list/files//*", function (request, response) {

	this.break();

	let dirname = request.path.slice("/list/files/".length);
	while (dirname[dirname.length - 1] == "/") {
		dirname = dirname.slice(0, -1);
	}

	response.headers["Content-Type"] = "text/plain";

	return @mew.rpc("hmm5.listFiles", {
		"dirname": dirname 
	}).then(function (files) {
		response.writer.end(files.map((file) => {
			if (file.type === "dir") {
				return file.name + "/";
			} else {
				return file.name;
			}
		}).join("\n"), this.test);
	});

});

@servlet.get("/list/models//*", function (request, response) {

	this.break();

	let keywords = [];

	response.headers["Content-Type"] = "text/plain";

	request.path.slice("/list/models/".length).split(/[\s,;\+]/).forEach((word) => {
		word = word.trim().toLowerCase();
		if (word && keywords.indexOf(word) === -1) {
			keywords.push(word);
		}
	});

	return @mew.rpc("hmm5.listModels", {
		"keywords": keywords 
	}).then(function (models) {
		response.writer.end(models.join("\n"), this.test);
	});

});

@servlet.get("/list/tokens//*", function (request, response) {

	this.break();

	let keywords = [];

	response.headers["Content-Type"] = "text/plain";

	request.path.slice("/list/tokens/".length).split(/[\s,;\+]/).forEach((word) => {
		word = word.trim().toLowerCase();
		if (word && keywords.indexOf(word) === -1) {
			keywords.push(word);
		}
	});

	return @mew.rpc("hmm5.listTokens", {
		"keywords": keywords 
	}).then(function (tokens) {
		response.writer.end(tokens.join("\n"), this.test);
	});

});

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

@servlet.get("/list/bindings//*", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "text/plain";

	let path = request.path.slice("/list/bindings".length);

	return @mew.rpc("hmm5.listBindings", {
		"path": path 
	}).then(function (links) {
		response.writer.end(links.join("\n"), this.test);
	});

});

// @servlet.get("/zip//*", function (request, response) {

// });

// @servlet.get("/m3d//*", function (request, response) {

// });

@servlet.get("/png//*", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "image/png";

	let path = request.path.slice(5);
	if (path.slice(-4) === ".png") {
		path = path.slice(0, -4);
	}

	return @mew.rpc("hmm5.loadImage", {
		"path": path
	}).then(function (dds) {
		response.writer.end(dds.encodeAsPNG(), this.test);
	});

});

@servlet.get("/wav//*", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "audio/x-wav";

	return @mew.rpc("hmm5.loadContent", {
		"path": request.path.slice(5)
	}).then(function (binary) {
		response.writer.end(binary, this.test);
	});

});

@servlet.get("/xml//*", function (request, response) {

	this.break();

	let path = request.path.slice(5);

	response.headers["Content-Type"] = "application/json";

	return @mew.rpc("hmm5.loadXML", {
		"path": path 
	}).then(function (xml) {
		response.writer.end(@.serialize(xml), this.test);
	});

});

@servlet.get("/link//*", function (request, response) {

	this.break();

	let path = request.path.slice(5);

	let hash = request.get.hash;

	let link = path;
	if (hash) {
		link += "#" + hash;
	}

	response.headers["Content-Type"] = "application/json";

	return @mew.rpc("hmm5.restoreInstance", {
		"link": link
	}).then(function (instance) {
		response.writer.end(@.serialize(instance), this.test);
	});

});

@servlet.get("/geom//*", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "application/json";

	let uid = request.path.slice(6).split("/").slice(-1)[0];

	return @mew.rpc("hmm5.loadGeometry", {
		"uid": uid 
	}).then(function (instance) {
		response.writer.end(@.serialize(instance), this.test);
	});

});

@servlet.get("/skel//*", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "application/json";

	let uid = request.path.slice(6).split("/").slice(-1)[0];

	return @mew.rpc("hmm5.loadSkeleton", {
		"uid": uid 
	}).then(function (instance) {
		response.writer.end(@.serialize(instance), this.test);
	});

});

@servlet.get("/anim//*", function (request, response) {

	this.break();

	response.headers["Content-Type"] = "application/json";

	let uid = request.path.slice(6).split("/").slice(-1)[0];

	return @mew.rpc("hmm5.loadAnimation", {
		"uid": uid 
	}).then(function (instance) {
		response.writer.end(@.serialize(instance), this.test);
	});

});

@import("js.zip");

const pak = require("./pak.js");

const options = @.merge.advanced({
	"paths": {
		"!valueType": "array",
		"!autoresolveArray": true,
		"!operation": "union",
		"!arrayElement": {
			"!valueType": "string"
		}
	}
}, @options());

if (!options.paths) {
	@warn("No paths configured for HMM5");
}

@info(`Loading PAKs from ${options.paths.join("\n    ")}`);

const caches = new Map();

const hmm5 = pak.loadPAKs.apply(pak, options.paths);

hmm5.finished((error) => {

	if (error) {
		@error("Failed to load PAKs of HMM5");
		@error(error);
		return;
	}

	@celebr("HMM5 PAKs loaded");

});

@heard.rpc("hmm5.searchFiles").then(function (request) {

	if (!request.keywords) {
		throw new Error("No keywords provided");
	}

	let keywords = request.keywords;
	if (!(keywords instanceof Array)) {
		keywords = [keywords];
	}
	keywords = keywords.map((keyword) => {
		return keyword.toLowerCase();
	});

	return hmm5.then(function (pak) {

		let maughts = [];

		for (let path in pak.records) {

			let lowerCased = path.toLowerCase();

			let failed = false;
			for (let keyword of keywords) {
				if (lowerCased.indexOf(keyword) === -1) {
					failed = true;
					break;
				}
			}

			if (!failed) {
				let record = pak.records[path];
				maughts.push({
					"path": path,
					"time": record.time,
					"pak": record.zip.path
				});
			}

		}

		if (maughts.length > 100) {
			maughts = maughts.slice(0, 100);
		}

		this.next(maughts);

	});

});

@heard.rpc("hmm5.listFiles").then(function (request) {

	let dirname = request.dirname;
	if (dirname) {
		dirname = dirname + "/";
	} else {
		dirname = "";
	}
	dirname = dirname.toLowerCase();

	return hmm5.then(function (pak) {

		let maughts = {};

		for (let path in pak.records) {

			let lowerCased = path.toLowerCase();

			let hasPrefix = (lowerCased.slice(0, dirname.length) === dirname);

			let passed = false;
			if (hasPrefix) {
				
				let rest = lowerCased.slice(dirname.length).split("/");
				if (rest.length === 1) {
					let record = pak.records[path];
					maughts[rest[0]] = {
						"name": path.slice(dirname.length).split("/")[0],
						"type": "file",
						"time": record.time,
						"pak": record.zip.path
					};
				} else {
					if (!maughts[rest[0]]) {
						maughts[rest[0]] = {
							"name": path.slice(dirname.length).split("/")[0],
							"type": "dir"
						};
					}
				}				

			}

		}

		this.next(Object.keys(maughts).sort().map((key) => {
			return maughts[key];
		}));

	});

});

@heard.rpc("hmm5.listBindings").then(function (request) {

	return hmm5.then(function (pak) {

		this.next(pak.listBindings(request.path));

	});

});

@heard.rpc("hmm5.listTokens").then(function (request) {

	let keywords = request.keywords;
	if (keywords && (!(keywords instanceof Array))) {
		keywords = [keywords];
	}
	if (keywords) {
		keywords = keywords.map((keyword) => {
			return keyword.toLowerCase();
		});
	}

	return hmm5.then(function (pak) {

		if (!keywords) {
			this.next(Object.keys(pak.types.tokens));
			return;
		}

		let result = [];

		for (let token in pak.types.tokens) {

			let lowerCased = token.toLowerCase();
			let failed = false;
			for (let keyword of keywords) {
				if (lowerCased.indexOf(keyword) === -1) {
					failed = true;
					break;
				}
			}

			if (!failed) {
				result.push(token);
			}

		}

		this.next(result);

	});

});

@heard.rpc("hmm5.listModels").then(function (request) {

	let keywords = request.keywords;
	if (keywords && (!(keywords instanceof Array))) {
		keywords = [keywords];
	}
	if (keywords) {
		keywords = keywords.map((keyword) => {
			return keyword.toLowerCase();
		});
	}

	return hmm5.then(function (pak) {

		let models = [];

		let typeID = pak.types.tags["Model"];

		for (let link in pak.types.bindings) {
			let binding = pak.types.bindings[link];
			if (binding === typeID) {

				let lowerCased = link.toLowerCase();

				let failed = false;
				if (keywords) {
					for (let keyword of keywords) {
						if (lowerCased.indexOf(keyword) === -1) {
							failed = true;
							break;
						}
					}
				}

				if (!failed) {
					models.push(link);
				}

			}
		}

		this.next(models);

	});

});

// @heard.rpc("hmm5.listArenas").then(function (request) {
	
// });

// @heard.rpc("hmm5.listUIs").then(function (request) {

// });

@heard.rpc("hmm5.analyzeDependencies").then(function (request) {

	return hmm5.then(function (pak) {

		this.next(pak.analyzeDependencies(request.link));

	});

});

@heard.rpc("hmm5.resolveLink").then(function (request) {

	return hmm5.then(function (pak) {

		let result = pak.resolveLink(null, request.link);

		this.next(result[0]);

	});

});

@heard.rpc("hmm5.resolveUID").then(function (request) {

	return hmm5.then(function (pak) {

		let file = pak.uids[request.uid];

		this.next(file);

	});

});

@heard.rpc("hmm5.loadXML").then(function (request) {

	return hmm5.then(function (pak) {

		let result = pak.loadXML(request.path);

		this.next(result);

	});

});

@heard.rpc("hmm5.restoreInstance").then(function (request) {

	return hmm5.then(function (pak) {

		let result = pak.resolveLink(null, request.link);

		let typeID = pak.types.bindings[request.link];

		let instance = pak.restoreInstance(result[0], typeID, caches);

		this.next(instance);

	});

});

@heard.rpc("hmm5.extractResources").then(function (request) {

	return hmm5.then(function (pak) {

		let files = pak.analyzeDependencies(request.link);

		let zipBuilder = @zip.build(@mewchan().documentPath);

		for (let file of files) {
			zipBuilder.addEntry(file, pak.records[file].zip.getEntry(file));
		}

		let filename = @.fs.basename(request.link.split("#")[0]);

		let suffix = @.format.date(new Date(), "YY-MM-DD_hh-mm-ss");

		let path = @path(@mewchan().documentPath, `${filename}.${suffix}.zip`);

		zipBuilder.save(path).resolve(path).pipe(this);

	});

});

@heard.rpc("hmm5.loadContent").then(function (request) {

	return hmm5.then(function (pak) {

		this.next(pak.loadContent(request.path, request.encoding));

	});

});

@heard.rpc("hmm5.loadToken").then(function (request) {

	return hmm5.then(function (pak) {

		let token = pak.loadToken(request.token);

		let instance = pak.restoreInstance(token, undefined, caches);

		this.next(instance);

	});

});

@heard.rpc("hmm5.loadGeometry").then(function (request) {

	return hmm5.then(function (pak) {

		let file = pak.uids[request.uid];

		this.next(pak.loadGeometry(file));

	});

});

@heard.rpc("hmm5.loadSkeleton").then(function (request) {

	return hmm5.then(function (pak) {

		let file = pak.uids[request.uid];

		this.next(pak.loadSkeleton(file));

	});

});

@heard.rpc("hmm5.loadAnimation").then(function (request) {

	return hmm5.then(function (pak) {

		let file = pak.uids[request.uid];

		this.next(pak.loadAnimation(file));

	});

});

@heard.rpc("hmm5.loadImage").then(function (request) {

	return hmm5.then(function (pak) {

		this.next(pak.loadDDS(request.path));

	});

});

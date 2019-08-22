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

@heard.rpc("hmm5.restoreInstance").then(function (request) {

	return hmm5.then(function (pak) {

		let result = pak.resolveLink(null, request.link);

		let instance = pak.restoreInstance(result[0], undefined, caches);

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

// .then(function (pak) {

// 	// pak.loadGeometry("bin/Geometries/BB67CC4A-CF31-4EF4-AE49-3DA514D3E6E8");
// 	// pak.loadGeometry("bin/Geometries/35C5E41A-1248-401B-89DD-CA85831CCC16");
// 	// pak.loadGeometry("bin/Geometries/2CAA29B4-927F-4FF9-ACD0-C5F52CC5B37F");
// 	// pak.loadGeometry("bin/Geometries/6E45CA03-EF7C-44AA-8B4E-ABA5BCA7DD20");
// 	// pak.loadGeometry("bin/Geometries/B6D59A50-9094-4092-A13B-01EE2056B90A");
// 	// pak.loadGeometry("bin/Geometries/F2399B3D-7EBA-466D-8305-258F48B1D2B2");

// 	// pak.loadSkeleton("bin/Skeletons/26605E25-A1A0-45B1-93A4-A95BDBC2F53D");
// 	// pak.loadSkeleton("bin/Skeletons/3B95CA57-FED6-4F6A-8463-EBF71F1E21DF");
// 	// pak.loadSkeleton("bin/Skeletons/E47B8949-413F-4C71-B397-A19D91D44510");

// 	// pak.loadAnimation("bin/animations/0E2C5EB9-80F1-4772-9247-AC709B66A762");
// 	// pak.loadAnimation("bin/animations/149501C1-F819-49E5-9604-CE9DA2DD864D");

// 	// pak.loadEffect("bin/effects/DEC32C4A-E4C0-4843-A69C-19C12F93265E");
// 	// pak.loadEffect("bin/effects/6CED8108-2CFD-4B16-837B-02916919A403");

// 	this.next();

// 	// let object = pak.loadToken("CREATURE_ARCHANGEL");

// 	// pak.extractResources(object, @path("tmp2")).pipe(this);
	
// 	// @dump.all(dependencies);

// 	// let caches = new Map();

// 	// // let element = pak.restoreInstance(object, undefined, caches);
// 	// // @dump.all(element.MonsterShared.@target().Model.@target().Materials[0].@target().Texture.@target());
// 	// // // //MonsterShared

// 	// // let elementVisual = element.Visual.@target();
// 	// // @dump.all(elementVisual);

// 	// // @dump.all(elementVisual.Win3DView.@target());
// 	// // @dump.all(elementVisual.AnimCharacter.@target().Model.@target().Geometry.@target());

// 	// this.next();

// }).finished((error) => {

// 	if (error) {
// 		@error(error); return;
// 	}

// 	@celebr("HMM5 PAK files loaded");

// });

$(function () {

	$("head").append($("<link>").attr({
		"rel": "stylesheet",
		"href": "styles/dock.css"
	}));

	let resultVersion = 0;

	const createSearchResult = function () {

		const searchResult = $("<div>").attr({
			"id": "search-result"
		}).append(
			$("<div>").attr({
				"id": "search-close-button"
			}).on("click", function () {
				hideSearchResult();
			}),
			$("<ul>").attr({
				"id": "search-result-list"
			})
		);

		$("body").append(searchResult);

		return searchResult;

	};

	const updateSearchResult = function (result) {

		let list = searchResult.find("#search-result-list");

		list.html("");

		result.forEach((item) => {

			let filename = item.split("/").slice(-1)[0] 
			let basename = filename;
			let extname = "";
			if (filename.split(".").length > 1) {
				basename = filename.split(".").slice(0, -1).join(".");
				extname = filename.split(".").slice(-1)[0];
			}

			list.append($("<li>").addClass("search-result-item search-result-type-" + extname).append(
				$("<div>").attr({
					"id": "search-result-item-filename"
				}).append(
					$("<div>").attr({
						"id": "search-result-item-basename"
					}).text(basename),
					$("<div>").attr({
						"id": "search-result-item-extname"
					}).text(extname ? ("." + extname) : "")
				),
				$("<div>").attr({
					"id": "search-result-item-dirname"
				}).text(item.split("/").slice(0, -1).join("/")),
			).on("click", function () {
				$.hmm5.smartOpen(item);
				hideSearchResult();
			}));

		});

	};

	const hideSearchResult = function () {

		searchResult.removeClass("visible");

	};

	const showSearchResult = function () {

		searchResult.addClass("visible");

	};

	let searchResult = createSearchResult();

	const createDock = function () {

		let lastSearch = undefined;

		const search = function () {

			setTimeout(() => {

				let text = searchInput.val();
				if (lastSearch === text) {
					return;
				}

				lastSearch = text;

				showSearchResult();

				$.ajax("/search/" + text, {
					"success": (data, status, request) => {
						updateSearchResult(data.split("\n"));
					}
				});

			}, 0);

		};

		let searchInput = $("<input>").attr({
			"type": "text",
			"id": "search",
			"autocomplete": "off"
		}).on("keydown", search).on("paste", search).on("focus", () => {
			showSearchResult();
		});

		const dock = $("<div>").attr({
			"id": "dock"
		}).append(
			searchInput
		);

		$("body").append(dock);

		return dock;

	};

	$.hmm5.ui.dock = createDock();
	$.hmm5.ui.search = searchResult;

});

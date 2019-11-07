$(function () {

	$("body").on("mousedown", function (event) {

		for (let menu of $(".menu")) {
			if (!menu.contains(event.target)) {
				$(menu).detach();
			}
		}

	});

	$("head").append($("<link>").attr({
		"rel": "stylesheet",
		"href": "styles/hmm5.css"
	}));

	$.hmm5 = {
		"ui": {},
		"types": {}
	};

	$.hmm5.types.Reference = function Reference(href) {
		this.href = href;
	};

	$.hmm5.types.File = function File(href) {
		this.href = href;
	};

	$.hmm5.types.Enum = function Enum(token, value) {
		this.token = token;
		this.value = value;
	};

	$.hmm5.types.GUID = function GUID(id) {
		this.id = id;
	};


	$.hmm5.open3DView = function (width, height, grids) {

		let camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 3000);
		camera.position.set(50, 50, 100);

        let clock = new THREE.Clock();

		let renderer = new THREE.WebGLRenderer({
			"antialias": true,
			"alpha": true,
			"preserveDrawingBuffer": true,
			"premultipliedAlpha": true,
		});
		renderer.setPixelRatio(1);
		renderer.setSize(width, height);
        renderer.setClearColor(0xeeeeee, 1);
		renderer.autoClear = true;
        renderer.gammaInput = true;
        renderer.gammaOutput = true;

        const scene = new THREE.Scene();

        let ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        ambientLight.position.set(0, 0, 0);

        let directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(-0.7, 1, 1);

        lights = [ambientLight, directionalLight];

        lights.forEach((light) => {
            scene.add(light);
        });

        // if (stats) {
        //     stats = new THREE.Stats();
        //     // container.append($(stats.dom));
        //     world.addTicker(() => {
        //         stats.update();
        //     });
        // }

        if (grids) {
            const gridHelper = new THREE.GridHelper(100, 10, 0x888888, 0x888888);
            gridHelper.position.set(0, - 0.04, 0);
            scene.add(gridHelper);
            grids = gridHelper;
        }

        const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
        orbitControls.target.set(0, 30, 0);
        orbitControls.enablePan = false;
        orbitControls.maxDistance = 600;
        orbitControls.minDistance = 30;

        // orbitControls.minPolarAngle = Math.PI / 3;
        // orbitControls.maxPolarAngle = Math.PI / 2;
        orbitControls.update();

		let version = 1;

		let animating = 0;

		return {
			"scene": scene,
			"renderer": renderer,
			"camera": camera,
			"clock": clock,
			"lights": lights,
			"grids": grids,
			"controls": orbitControls,
			"start": function () {
				if (animating) {
					return;
				}
				++version;
				animating = version;
				let record = animating;
				let animate = () => {
					if (animating === record) {
						requestAnimationFrame(animate);
						renderer.render(scene, camera);
					}
				};
				animate();
			},
			"stop": function () {
				animating = 0;
				++version;
			}
		};

	};


	let svg = $(document.createElementNS("http://www.w3.org/2000/svg", "svg:svg")).addClass("arrows");
	$("body").append(svg);

	let topmost = undefined;

	const updateLinks = function () {

		let scale = 1 / parseFloat($("html").css('zoom'));

		let files = {};

		let windows = $("body > .window.visible");
		for (let dom of windows) {
			let query = $(dom);
			if (dom.hmm5File) {
				if (!files[dom.hmm5File]) {
					files[dom.hmm5File] = [];
				}
				files[dom.hmm5File].push(query);
			}
		}

		let arrows = new Set();
		for (let arrow of svg.find(".arrow")) {
			arrows.add(arrow);
		}

		let updateArrows = function (link, dom, windows, type) {

			let query = $(dom);

			if (!link.arrows) {
				link.arrows = new Map();
			}

			let clientRect = undefined;
			{
				let dom = link.dom[0];
				do {
					clientRect = dom.getClientRects()[0];
					dom = dom.parentNode;
				} while ((!clientRect) && dom);
			}

			let headRadius = 3 * scale;

			let fromLeft = parseFloat(query.css("left"));
			let fromRight = fromLeft + parseFloat(query.css("width"));
			let fromTop = clientRect.top;
			let fromBottom = clientRect.bottom;

			for (let query of windows) {
				if ((query[0] !== dom) &&
					((type !== "equals") || (dom.hmm5ID < query[0].hmm5ID))) {

					const radius = 40 * scale;

					let arrow = link.arrows.get(query[0]);
					if (!arrow) {
						arrow = $(document.createElementNS("http://www.w3.org/2000/svg", "svg:path")).addClass(`arrow arrow-type-${type}`);
						svg.append(arrow);
						link.arrows.set(query[0], arrow);
					} else {
						arrows.delete(arrow[0]);
					}

					let toLeft = parseFloat(query.css("left"));
					let toRight = toLeft + parseFloat(query.css("width"));
					let toTop = parseFloat(query.css("top"));
					let toBottom = toTop + parseFloat(query.css("height"));
					let fromDirection = "left";
					if ((toLeft + toRight)  > (fromLeft + fromRight)) {
						fromDirection = "right";
					}
					if (type === "equals") {
						if ((toRight > fromLeft) && (fromRight > toLeft)) {
							if (toTop > fromBottom + radius * 2) {
								fromDirection = "bottom";
							} else if (fromTop > toBottom + radius * 2) {
								fromDirection = "top";
							}
						}
					}

					let fromX = undefined;
					let fromY = undefined;
					switch (fromDirection) {
						case "left": { fromX = fromLeft; fromY = (fromTop + fromBottom) / 2; break; };
						case "right": { fromX = fromRight; fromY = (fromTop + fromBottom) / 2; break; };
						case "top": { fromY = fromTop; fromX = (fromLeft + fromRight) / 2; break; };
						case "bottom": { fromY = fromBottom; fromX = (fromLeft + fromRight) / 2; break; };
						default: { throw new Error("Unknown from direction"); }
					}
					if ((type === "equals") && ((fromDirection === "left") || (fromDirection === "right"))) {
						let titleBar = $(dom).find("#window-title-bar");
						let title = titleBar[0].getClientRects()[0];
						fromY = (title.top + title.bottom) / 2;
					}
					if (type !== "equals") {
						let query = $(dom);
						let minFromY = parseFloat(query.css("top"));
						let maxFromY = minFromY + parseFloat(query.css("height"));
						minFromY += parseFloat(query.find("#window-title-bar").css("height"));
						if (fromY > maxFromY) {
							fromY = maxFromY - headRadius;
						}
						if (fromY < minFromY) {
							fromY = minFromY + headRadius;
						}
					}

					let toDirection = undefined;

					if ((fromDirection === "top") || (fromDirection === "bottom")) {
						let midPoint = (fromLeft + fromRight) / 2;
						if (midPoint + radius < toLeft) {
							toDirection = "left";
						} else if (midPoint - radius > toRight) {
							toDirection = "right";
						} else {
							toDirection = (fromDirection === "top") ? "bottom" : "top";
						}
					} else {
						if (toTop - radius > fromY) {
							let midPoint = (toLeft + toRight) / 2;
							if ((midPoint > fromRight + radius) || (midPoint < fromLeft - radius)) {
								toDirection = "top";
							} else {
								toDirection = fromDirection;
							}
						} else if (toBottom + radius < fromY) {
							let midPoint = (toLeft + toRight) / 2;
							if ((midPoint > fromRight + radius) || (midPoint < fromLeft - radius)) {
								toDirection = "bottom";
							} else {
								toDirection = fromDirection;
							}
						} else {
							if ((fromRight > toLeft) && (toRight > fromLeft)) {
								toDirection = fromDirection;
							} else {
								if (fromDirection === "left") {
									toDirection = "right";
								} else {
									toDirection = "left";
								}
							}
						}
					}

					let titleHeight = parseFloat(query.find("#window-title-bar").css("height"));

					let toX = undefined;
					let toY = undefined;

					let midPoints = [[fromX, fromY]];

					switch (fromDirection) {
						case "top": {
							switch (toDirection) {
								case "left": {
									toX = toLeft;
									toY = toTop + titleHeight / 2;
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "bottom": {
									toX = (toLeft + toRight) / 2;
									toY = toBottom;
									let x = (toX + fromX) / 2;
									let y = (fromY + toY) / 2;
									midPoints.push([x, y, "X"]);
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								case "right": {
									toX = toRight;
									toY = toTop + titleHeight / 2;
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "top": {
									toX = (toLeft + toRight) / 2;
									toY = toTop;
									let x = (toX + fromX) / 2;
									let y = Math.min(fromY, toY) + radius;
									midPoints.push([x, y, "X"]);
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								default: {
									throw new Error(`Unknown to direction[${toDirection}]`);
								}
							}
							break;
						};
						case "bottom": {
							switch (toDirection) {
								case "left": {
									toX = toLeft;
									toY = toTop + titleHeight / 2;
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "bottom": {
									toX = (toLeft + toRight) / 2;
									toY = toBottom;
									let x = (toX + fromX) / 2;
									let y = Math.max(fromY, toY) + radius;
									midPoints.push([x, y, "X"]);
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								case "right": {
									toX = toRight;
									toY = toTop + titleHeight / 2;
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "top": {
									toX = (toLeft + toRight) / 2;
									toY = toTop;
									let x = (toX + fromX) / 2;
									let y = (fromY + toY) / 2;
									midPoints.push([x, y, "X"]);
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								default: {
									throw new Error(`Unknown to direction[${toDirection}]`);
								}
							}
							break;
						};
						case "left": {
							switch (toDirection) {
								case "left": {
									toX = toLeft;
									toY = toTop + titleHeight / 2;
									let x = Math.min(fromX, toX) - radius;
									let y = (fromY + toY) / 2;
									midPoints.push([x, y, "Y"]);
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "bottom": {
									toX = (toLeft + toRight) / 2;
									toY = toBottom;
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								case "right": {
									toX = toRight;
									toY = toTop + titleHeight / 2;
									let x = (toX + fromX) / 2;
									let y = (fromY + toY) / 2;
									midPoints.push([x, y, "Y"]);
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "top": {
									toX = (toLeft + toRight) / 2;
									toY = toTop;
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								default: {
									throw new Error(`Unknown to direction[${toDirection}]`);
								}
							}
							break;
						};
						case "right": {
							switch (toDirection) {
								case "right": {
									toX = toRight;
									toY = toTop + titleHeight / 2;
									let x = Math.max(fromX, toX) + radius;
									let y = (fromY + toY) / 2;
									midPoints.push([x, y, "Y"]);
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "bottom": {
									toX = (toLeft + toRight) / 2;
									toY = toBottom;
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								case "left": {
									toX = toLeft;
									toY = toTop + titleHeight / 2;
									let x = (toX + fromX) / 2;
									let y = (fromY + toY) / 2;
									midPoints.push([x, y, "Y"]);
									midPoints.push([toX, toY, "X"]);
									break;
								};
								case "top": {
									toX = (toLeft + toRight) / 2;
									toY = toTop;
									midPoints.push([toX, toY, "Y"]);
									break;
								};
								default: {
									throw new Error(`Unknown to direction[${toDirection}]`);
								}
							}
							break;
						};
						default: {
							throw new Error(`Unknown from direction[${fromDirection}]`);
						}
					}

					let line = [];

					for (let looper = 0; looper < midPoints.length; ++looper) {
						let point = midPoints[looper];
						if (looper === 0) {
							switch (fromDirection) {
								case "top": {
									line.push(`M ${point[0] - headRadius} ${point[1]}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 1 ${point[0]} ${point[1] - headRadius}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 1 ${point[0] + headRadius} ${point[1]}`);
									line.push(`M ${point[0]} ${point[1] - headRadius}`); break;
								};
								case "bottom": {
									line.push(`M ${point[0] - headRadius} ${point[1]}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 0 ${point[0]} ${point[1] + headRadius}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 0 ${point[0] + headRadius} ${point[1]}`);
									line.push(`M ${point[0]} ${point[1] + headRadius}`); break;
								};
								case "left": {
									line.push(`M ${point[0]} ${point[1] - headRadius}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 0 ${point[0] - headRadius} ${point[1]}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 0 ${point[0]} ${point[1] + headRadius}`);
									line.push(`M ${point[0] - headRadius} ${point[1]}`); break;
								};
								case "right": {
									line.push(`M ${point[0]} ${point[1] - headRadius}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 1 ${point[0] + headRadius} ${point[1]}`);
									line.push(`A ${headRadius} ${headRadius} 0 0 1 ${point[0]} ${point[1] + headRadius}`);
									line.push(`M ${point[0] + headRadius} ${point[1]}`); break;
								};
							}
						} else {
							if ((type === "equals") && (looper + 1 === midPoints.length)) {
								switch (toDirection) {
									case "top": { point = [point[0], point[1] - headRadius, point[2]]; break; };
									case "left": { point = [point[0] - headRadius, point[1], point[2]]; break; };
									case "bottom": { point = [point[0], point[1] + headRadius, point[2]]; break; };
									case "right": { point = [point[0] + headRadius, point[1], point[2]]; break; };
									default: { break; };
								}
							}
							let last = midPoints[looper - 1];
							let c1 = undefined; let c2 = undefined;
							let rate = 0.7;
							if (point[2] === "X") {
								c1 = [last[0], last[1] * (1 - rate) + point[1] * rate];
								c2 = [last[0] * rate + point[0] * (1 - rate), point[1]];
							} else {
								c1 = [last[0] * (1 - rate) + point[0] * rate, last[1]];
								c2 = [point[0], last[1] * rate + point[1] * (1 - rate)];
							}
							line.push(`C ${c1[0]} ${c1[1]}, ${c2[0]} ${c2[1]}, ${point[0]} ${point[1]}`);
						}
					}

					let arrowSize = 4 * scale;
					switch (toDirection) {
						case "top": {
							if (type === "equals") {
								line.push(`M ${toX - headRadius} ${toY}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 1 ${toX} ${toY - headRadius}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 1 ${toX + headRadius} ${toY}`);
							} else {
								line.push(`L ${toX - arrowSize * 0.8} ${toY - arrowSize}`);
								line.push(`M ${toX} ${toY}`);
								line.push(`L ${toX + arrowSize * 0.8} ${toY - arrowSize}`);
							}
							break;
						};
						case "bottom": {
							if (type === "equals") {
								line.push(`M ${toX - headRadius} ${toY}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 0 ${toX} ${toY + headRadius}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 0 ${toX + headRadius} ${toY}`);
							} else {
								line.push(`L ${toX - arrowSize * 0.8} ${toY + arrowSize}`);
								line.push(`M ${toX} ${toY}`);
								line.push(`L ${toX + arrowSize * 0.8} ${toY + arrowSize}`);
							}
							break;
						};
						case "left": {
							if (type === "equals") {
								line.push(`M ${toX} ${toY - headRadius}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 0 ${toX - headRadius} ${toY}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 0 ${toX} ${toY + headRadius}`);
							} else {
								line.push(`L ${toX - arrowSize} ${toY - arrowSize * 0.8}`);
								line.push(`M ${toX} ${toY}`);
								line.push(`L ${toX - arrowSize} ${toY + arrowSize * 0.8}`);
							}
							break;
						};
						case "right": {
							if (type === "equals") {
								line.push(`M ${toX} ${toY - headRadius}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 1 ${toX + headRadius} ${toY}`);
								line.push(`A ${headRadius} ${headRadius} 0 0 1 ${toX} ${toY + headRadius}`);
							} else {
								line.push(`L ${toX + arrowSize} ${toY - arrowSize * 0.8}`);
								line.push(`M ${toX} ${toY}`);
								line.push(`L ${toX + arrowSize} ${toY + arrowSize * 0.8}`);
							}
							break;
						};
						default: {
							throw new Error(`Unknown to direction[${toDirection}]`);
							break;
						};
					}

					arrow.attr({ "d": line.join(" ") });
				}
			}

		};

		for (let dom of windows) {
			let query = $(dom);
			if (dom.hmm5File) {
				for (let query2 of files[dom.hmm5File]) {
					if (query2[0] !== query[0]) {
						if (!dom.hmm5Equals) {
							dom.hmm5Equals = {
								"dom": query
							};
						}
						dom.hmm5Equals.target = dom.hmm5File;
						updateArrows(dom.hmm5Equals, dom, files[dom.hmm5File], "equals");
					}
				}
			}
			if (dom.hmm5Links) {
				for (let link of dom.hmm5Links) {
					let targetFile = link.target.split("#")[0];
					if (targetFile[0] === "/") {
						targetFile = targetFile.slice(1);
					}
					if (files[targetFile]) {
						updateArrows(link, dom, files[targetFile], "file");
					}
					if (files[link.target] && (link.target !== targetFile)) {
						updateArrows(link, dom, files[link.target], "link");
					}
				}
			}
		}

		for (let arrow of arrows) {
			$(arrow).detach();
		}

	};

	$.hmm5.openMenu = function (menu, position) {

		let dom = $("<div>").addClass("menu");

		menu.forEach((item, index) => {

			if (item === "-") {
				dom.append($("<div>").addClass("menu-separator"));
				return;
			}

			dom.append($("<div>").addClass("menu-item").text(item[0]).on("click", function (event) {

				dom.detach();

				if (!item[1]) {
					alert("Action not supported"); return;
				}

				item[1]();

			}));

		});

		dom.css({
			"left": position.x + "px",
			"top": position.y + "px",
		});

		$("body").append(dom);

		return dom;

	};

	$.hmm5.activateWindow = function (window) {

		if (topmost && (topmost[0] === window[0])) {
			return;
		}

		topmost = window;

		let indices = {};

		let windows = $("body > .window");
		for (let dom of windows) {
			let query = $(dom);
			query.removeClass("topmost");
			let zIndex = parseInt(query.css("z-index"));
			indices[zIndex] = query;
		}

		window.addClass("topmost");

		Object.keys(indices).sort((a, b) => parseInt(a) - parseInt(b)).forEach((key, index) => {
			indices[key].css("z-index", index + 100);
		});

		window.css("z-index", Object.keys(indices).length + 101);

		$.hmm5.ui.dock.find(".dock-icon").removeClass("topmost");
		window[0].hmm5Icon.addClass("topmost");

	};

	let nextWindowID = 1;

	$.hmm5.openWindow = function (title, classes) {

		let window = $("<div>").addClass("window window-class-" + classes).append(
			$("<div>").attr({
				"id": "window-title-bar",
				"title": title
			}).text(title).on("mousedown", function (event) {

				event.preventDefault();

				let scale = 1 / parseFloat($("html").css("zoom"));

				let offset = {
					"x": parseInt(window.css("left")) - event.clientX * scale,
					"y": parseInt(window.css("top")) - event.clientY * scale
				};

				const mousemove = function (event) {
					if (offset) {
						window.css({
							"left": (offset.x + event.clientX * scale) + "px",
							"top": (offset.y + event.clientY * scale) + "px",
						});
					}
					updateLinks();
				};

				const mouseup = function (event) {
					$("body").off("mousemove", mousemove).off("mouseup", mouseup);
				};

				$("body").on("mousemove", mousemove).on("mouseup", mouseup);

			}),
			$("<div>").attr({
				"id": "window-action-button",
			}).on("click", function () {
				let position = this.getClientRects()[0];
				let scale = 1 / parseFloat($("html").css("zoom"));
				$.hmm5.openMenu(window[0].hmm5Menu, {
					"x": position.left,
					"y": position.bottom + 3 * scale
				});
			}),
			$("<div>").attr({
				"id": "window-close-button",
			}).on("click", function () {
				if (topmost && (topmost[0] === window[0])) {
					topmost = undefined;
				}
				window.removeClass("visible");
				updateLinks();
				icon.detach();
				setTimeout(() => {
					window.detach();
				}, 500);
			}),
			$("<div>").attr({
				"id": "window-resizer"
			}).on("mousedown", function () {

				event.preventDefault();
				window.addClass("scaling");

				let scale = 1 / parseFloat($("html").css("zoom"));

				let offset = {
					"x": parseInt(window.css("width")) - event.clientX * scale,
					"y": parseInt(window.css("height")) - event.clientY * scale
				};

				const mousemove = function (event) {
					if (offset) {
						window.css({
							"width": Math.max(100 * scale, (offset.x + event.clientX * scale)) + "px",
							"height": Math.max(100 * scale, (offset.y + event.clientY * scale)) + "px",
						});
					}
					updateLinks();
				};

				const mouseup = function (event) {
					window.removeClass("scaling");
					$("body").off("mousemove", mousemove).off("mouseup", mouseup);
				};

				$("body").on("mousemove", mousemove).on("mouseup", mouseup);

			}),
			$("<div>").attr({
				"id": "window-client-area"
			}).on("scroll", function () {
				updateLinks();
			}),
		).on("mousedown", function () {
			$.hmm5.activateWindow(window);
		});

		window[0].hmm5ID = nextWindowID;
		++nextWindowID;

		let icon = $("<div>").addClass("dock-icon").attr("title", title).text(classes.split(" ")[0]).on("click", function () {
			$.hmm5.activateWindow(window);
		});

		window[0].hmm5Icon = icon;

		$.hmm5.ui.dock.append(icon);

		if (topmost) {

			let scale = 1 / parseFloat($("html").css("zoom"));

			window.css({
				"left": (parseInt(topmost.css("left")) + 30 * scale) + "px",
				"top": (parseInt(topmost.css("top")) + 30 * scale) + "px",
			});

		}

		$("body").append(window);

		$.hmm5.activateWindow(window);

		setTimeout(function () {
			window.addClass("visible");
			updateLinks();
		}, 0);

		window[0].hmm5Menu = [
			["Save raw file", () => {
				let file = window[0].hmm5File;
				if (!file) {
					alert("Target not downloadable"); return;
				}
				file = file.split("#")[0];
				if ((file.indexOf("/") === -1) && (file.indexOf(".") === -1)) {
					$.ajax(`/uid/${file}`, {
						"success": (path) => {
							open(`/pak/${path}?download=yes`, "_blank");
						}
					});
				} else {
					if (file[0] === "/") {
						file = file.slice(1);
					}
					open(`/pak/${file}?download=yes`, "_blank");
				}
			}],
			"-",
			["Export all related files"],
			["Resolve related files", () => {
				let file = window[0].hmm5File;
				if (!file) {
					alert("Target not support"); return;
				}
				let resolve = function (file) {
					if ((file[0] === "/") && (file.indexOf("#") === -1)) {
						file = file.slice(1);
					}
					let hash = file.split("#").slice(1).join("#");
					let path = file.split("#")[0];
					if (path[0] === "/") { path = path.slice(1); }
					let url = `/list/deps/${path}`;
					if (hash) {
						url = `${url}?hash=${hash}`;
					}
					$.ajax(url, {
						"success": function (files) {
							let scale = 1 / parseFloat($("html").css("zoom"));
							let window = $.hmm5.openWindow(`Related files of ${title}`, "related-files");
							let links = [];
							let client = window.find("#window-client-area");
							files.split("\n").forEach((file) => {
								let path = file;
								if (file.slice(0, 4).toLowerCase() === "bin/") {
									path = file.split("/").slice(-1)[0];
								}
								let dom = $("<div>").attr({
									"title": file
								}).addClass("file").text(file.split("/").slice(-1)[0]).on("click", function () {
									$.hmm5.smartOpen(file);
								});
								links.push({
									"target": path,
									"dom": dom
								});
								client.append(dom);
							});
							window[0].hmm5File = file;
							window[0].hmm5Links = links;
							$.hmm5.resizeWindow(window, 200 * scale, 260 * scale);
						}
					});
				};
				if ((file.indexOf("/") === -1) && (file.indexOf(".") === -1)) {
					$.ajax(`/uid/${file}`, {
						"success": (path) => {
							resolve(path);
						}
					});
				} else {
					resolve(file);
				}
			}],
		];

		return window;

	};

	$.hmm5.resizeWindow = function (window, width, height) {

		let titleSize = parseFloat(window.find("#window-title-bar").css("height"));

		window.css({
			"width": `${Math.max(100, width) + 2}px`,
			"height": `${Math.max(100, height) + titleSize + 2}px`
		});

		updateLinks();

	};

	$.hmm5.openDDSFile = function (file) {

		let window = $.hmm5.openWindow(file.split("/").slice(-1)[0], "dds");

		let image = new Image();
		image.onload = function () {
			let width = image.width;
			let height = image.height;
			if (width > 256) {
				height = height * 256 / width;
				width = 256;
			}
			if (height > 256) {
				width = width * 256 / height;
				height = 256;
			}
			window.find("#window-client-area").append(image);
			$.hmm5.resizeWindow(window, width, height);
			window[0].hmm5Icon.css({
				"background-image": `url('${image.src}')`
			});
		};
		image.src = "/png/" + file;

		return window;

	};

	$.hmm5.openXDBFile = function (file) {

		let window = $.hmm5.openWindow(file.split("/").slice(-1)[0], "xdb");

		$.hmm5.resizeWindow(window, 340, 300);

		let bindings = Object.create(null);

		let links = [];

		const createRecord = function (key, value, expanded, superrecord) {

			let href = undefined;
			if (superrecord["@id"]) {
				href = `id(${superrecord["@id"]})/${key}`;
			} else if (expanded) {
				href = `/${key}`;
			}
			if (href) {
				href = `/${file}#xpointer(${href})`;
			}

			let complex = false;
			let textValue = "<unknown>";
			if (value instanceof Array) {
				if (value.length === 0) {
					textValue = "<empty>";
				} else if (value.length === 1) {
					if (typeof value[0] === "string") {
						textValue = value[0];
					} else {
						textValue = "<obj>";
						complex = true;
					}
				} else {
					textValue = "<array>";
					complex = true;
				}
			} else if (typeof value === "string") {
				textValue = value;
			}

			let container = undefined;

			let record = $("<div>").addClass("xdb-record");
			if (complex) {
				let folder = $("<div>").attr({
					"id": "xdb-record-folder"
				}).on("click", function (event) {
					record.toggleClass("expanded");
					updateLinks();
				});
				record.addClass("complex").append(folder);
				if (expanded) {
					record.addClass("expanded");
				}
			}

			record.append(
				$("<div>").attr({
					"id": "xdb-record-line"
				}).append(
					$("<div>").attr({
						"id": "xdb-record-key",
						"title": key
					}).text(key),
					$("<div>").attr({
						"id": "xdb-record-value",
						"title": textValue
					}).text(textValue)
				).on("click", function () {
					if ((key === "@href") && (textValue[0] !== "#")) {
						if (textValue.indexOf("#") !== -1) {
							let newValue = textValue;
							if (newValue[0] !== "/") {
								newValue = "/" + file.split("/").slice(0, -1).join("/") + "/" + newValue;
							}
							$.hmm5.smartOpen(newValue);
						} else {
							let newValue = textValue;
							if (newValue[0] !== "/") {
								newValue = file.split("/").slice(0, -1).join("/") + "/" + newValue;
							} else {
								newValue = newValue.slice(1);
							}
							$.hmm5.smartOpen(newValue.split("#")[0]);
						}
					} else if (href && bindings[href]) {
						$.hmm5.smartOpen(href);
					}
				})
			);
			if ((key === "@href") && (textValue[0] !== "#")) {
				record.addClass("href");
				let target = value;
				if (target[0] !== "#") {
					if (target[0] !== "/") {
						target = file.split("/").slice(0, -1).join("/") + "/" + target;
					}
					if (target.indexOf("#") !== -1) {
						target = "/" + target;
					}
					links.push({
						"target": target,
						"dom": record
					});
				}
			}

			if (complex) {
				container = $("<div>").attr({
					"id": "xdb-record-container"
				});
				record.append(container);
				for (let key in value[0]) {
					if (key.slice(0, 2) !== "@@") {
						if (value[0][key] instanceof Array) {
							for (let item of value[0][key]) {
								let subrecord = createRecord(key, [item], false, value[0]);
								container.append(subrecord);
							}
						} else {
							let subrecord = createRecord(key, value[0][key], false, value[0]);
							container.append(subrecord);
						}
					}
				}
			}

			if (bindings[href]) {
				record.addClass("binding");
				links.push({
					"target": href,
					"dom": record
				});
			}

			return record;

		};

		$.ajax("/list/bindings/" + file, {
			"success": function (data, status, request) {

				if (data) {
					for (let link of data.split("\n")) {
						bindings[link.split(":").slice(0, -1).join(":")] = true;
					}
				}

				$.ajax("/xml/" + file, {
					"success": function (data, status, request) {
						let clientArea = window.find("#window-client-area");
						let parsed = $.hmm5.parse(data);
						for (let key in parsed) {
							if (key.slice(0, 2) !== "@@") {
								if (parsed[key] instanceof Array) {
									for (let item of parsed[key]) {
										let record = createRecord(key, [item], true, parsed);
										clientArea.append(record);
									}
								} else {
									let record = createRecord(key, parsed[key], true, parsed);
									clientArea.append(record);
								}
							}
						}
						updateLinks();
					}
				});

			}
		});

		window[0].hmm5Links = links;

		return window;

	};

	$.hmm5.openTXTFile = function (file) {

		let window = $.hmm5.openWindow(file.split("/").slice(-1)[0], "txt");

		$.hmm5.resizeWindow(window, 300, 100);

		$.ajax("/pak/" + file, {
			"success": function (data, status, request) {
				window.find("#window-client-area").text(data);
			}
		});

		return window;

	};

	$.hmm5.openFile = function (file) {

		if (file[0] === "/") {
			file = file.slice(1);
		}

		let extname = "";
		let filename = file.split("/").slice(-1)[0];
		if (filename.split(".").length > 1) {
			extname = "." + filename.split(".").slice(-1)[0];
		}

		let windows = $("body > .window");
		for (let dom of windows) {
			if ((dom.hmm5File === file) && $(dom).hasClass("file")) {
				$.hmm5.activateWindow($(dom));
				return $(dom);
			}
		}

		let window = undefined;
		switch (extname.toLowerCase()) {
			case ".dds": { window = $.hmm5.openDDSFile(file); break; };
			case ".xdb": { window = $.hmm5.openXDBFile(file); break; };
			case ".txt": { window = $.hmm5.openTXTFile(file); break; };
			default: {
				if (file.split("/")[0].toLowerCase() === "bin") {
					switch (file.split("/")[1].toLowerCase()) {
						case "geometries": { window = $.hmm5.openGeometry(file); break; };
						case "skeletons": { window = $.hmm5.openSkeleton(file); break; };
						default: {
							alert(`Unknown type of file ${file}`);
						};
					}
					window[0].hmm5File = file.split("/").slice(-1)[0];
				} else {
					alert(`Unknown type of file ${file}`);
				}
				break;
			}
		}

		if (!window[0].hmm5File) {
			window[0].hmm5File = file;
		}
		window.addClass("file");

		return window;

	};

	$.hmm5.openXDBLink = function (link) {

		let title = link.split("#")[0].split("/").slice(-1)[0] + "#" + link.split("#").slice(1).join("#");

		let window = $.hmm5.openWindow(title, "xdb-link");

		$.hmm5.resizeWindow(window, 340, 300);

		let links = [];

		const createRecord = function (key, value, expanded, superrecord) {

			let complex = false;
			let textValue = "<unknown>";
			let titleValue = undefined;
			if ((value === null) || (value === undefined)) {
				textValue = "<null>";
			} else if (typeof value === "string") {
				textValue = value;
			} else if (typeof value === "boolean") {
				textValue = value ? "true" : "false";
			} else if (typeof value === "number") {
				textValue = value + "";
			} else if (value instanceof $.hmm5.types.Reference) {
				textValue = `<ref:${value.href.split("#")[0].split("/").slice(-1)[0]}#${value.href.split("#").slice(1).join("#")}>`;
				titleValue = value.href;
			} else if (value instanceof $.hmm5.types.Enum) {
				textValue = value.token;
				titleValue = value.value;
			} else if (value instanceof $.hmm5.types.GUID) {
				textValue = `<guid:${value.id}>`;
				titleValue = value.id;
			} else if (value instanceof $.hmm5.types.File) {
				textValue = `<file:${value.href.split("/").slice(-1)[0]}>`;
				titleValue = value.href;
			} else if (value instanceof Array) {
				textValue = `<array:${value.length}>`;
				complex = true;
			} else {
				if (value["@@name"]) {
					switch (value["@@name"]) {
						case "Vec3": {
							textValue = `<obj:${value["@@name"]}[${value.x}, ${value.y}, ${value.z}]>`;
							break;
						};
						case "Vec4": {
							textValue = `<obj:${value["@@name"]}[${value.x}, ${value.y}, ${value.z}, ${value.w}]>`;
							break;
						};
						default: {
							textValue = `<obj:${value["@@name"]}>`;
							complex = true;
							break;
						};
					}
				} else {
					textValue = "<obj>";
					complex = true;
				}
			}
			if (!titleValue) {
				titleValue = textValue;
			}

			let container = undefined;

			let record = $("<div>").addClass("xdb-record");
			if (complex) {
				let folder = $("<div>").attr({
					"id": "xdb-record-folder"
				}).on("click", function (event) {
					record.toggleClass("expanded");
					updateLinks();
				});
				record.addClass("complex").append(folder);
				if (expanded) {
					record.addClass("expanded");
				}
			}

			record.append(
				$("<div>").attr({
					"id": "xdb-record-line"
				}).append(
					$("<div>").attr({
						"id": "xdb-record-key",
						"title": key
					}).text(key),
					$("<div>").attr({
						"id": "xdb-record-value",
						"title": titleValue
					}).text(textValue)
				).on("click", function () {
					if (value instanceof $.hmm5.types.Reference) {
						let href = value.href;
						$.hmm5.smartOpen(href);
					} else if (value instanceof $.hmm5.types.File) {
						let href = value.href;
						$.hmm5.smartOpen(href);
					} else if (value instanceof $.hmm5.types.GUID) {
						let id = value.id;
						$.hmm5.smartOpen(id);
					}
				})
			);
			if (value instanceof $.hmm5.types.Reference) {
				record.addClass("reference");
				links.push({
					"target": value.href,
					"dom": record
				});
			} else if (value instanceof $.hmm5.types.File) {
				record.addClass("file");
				links.push({
					"target": value.href,
					"dom": record
				});
			} else if (value instanceof $.hmm5.types.GUID) {
				record.addClass("guid");
				links.push({
					"target": value.id,
					"dom": record
				});
			}

			if (complex) {
				container = $("<div>").attr({
					"id": "xdb-record-container"
				});
				record.append(container);
				for (let key in value) {
					if (key.slice(0, 2) !== "@@") {
						let subrecord = createRecord(key, value[key], false, value);
						container.append(subrecord);
					}
				}
			}

			return record;

		};

		$.hmm5.loadLink(link, (parsed) => {

			let clientArea = window.find("#window-client-area");

			for (let key in parsed) {
				if (key.slice(0, 2) !== "@@") {
					let record = createRecord(key, parsed[key], true, parsed);
					clientArea.append(record);
				}
			}

			updateLinks();

		});

		window[0].hmm5Links = links;

		return window;

	};

	$.hmm5.openLink = function (link) {

		let windows = $("body > .window");
		for (let dom of windows) {
			if ((dom.hmm5File === link) && $(dom).hasClass("link")) {
				$.hmm5.activateWindow($(dom));
				return $(dom);
			}
		}

		let file = link.split("#")[0];
		let filename = file.split("/").slice(-1)[0];

		let extname = filename.split(".").slice(-1)[0];
		if (extname) {
			extname = "." + extname;
		}

		let window = undefined;

		switch (extname) {
			case ".xdb": {
				window = $.hmm5.openXDBLink(link); break;
			};
			default: {
				console.log([link, file, filename, extname]); break;
			};
		}

		window.addClass("link");

		window[0].hmm5File = link;

		return window;

	};

	$.hmm5.openGUID = function (guid) {

		let window = undefined;

		$.ajax(`/uid/${guid}`, {
			"async": false,
			"success": function (path) {
				window = $.hmm5.openFile(path);
			}
		});

		return window;

	};

	$.hmm5.openModel = function (link) {

		let windows = $("body > .window");
		for (let dom of windows) {
			if ((dom.hmm5File === link) && $(dom).hasClass("model")) {
				$.hmm5.activateWindow($(dom));
				return $(dom);
			}
		}

		let scale = 1 / parseFloat($("html").css("zoom"));

		let size = Math.round(200 * scale);

		let name = link.split("#")[0].split("/").slice(-1)[0] + "#" + link.split("#").slice(0, -1).join("#");

		let window = $.hmm5.openWindow(name, "model");

		window.addClass("model");

		$.hmm5.resizeWindow(window, size, size);

		let view = $.hmm5.open3DView(size, size, true);

		view.start();

		window[0].hmm5Close = function () {
			view.stop();
		};

		window.find("#window-client-area").append($(view.renderer.domElement));

		$.hmm5.loadModel(link, (object, mins, maxes, links) => {

			let radius = Math.max((maxes[0] - mins[0]), (maxes[1] - mins[1]), (maxes[2] - mins[2]));
			let scale = 60 / radius;

			object.position.set((mins[0] + maxes[0]) * (-0.5),
			                    (mins[1] + maxes[1]) * (-0.5),
			                    -mins[2]);

			let container = new THREE.Object3D();
			container.scale.set(scale, scale, scale);
			container.rotateX(-Math.PI / 2);

			container.add(object);

			view.controls.target0.set(0, (maxes[2] - mins[2]) * 0.5 * scale, 0);

			view.scene.add(container);

			window[0].hmm5Links = links.map((target) => {
				return {
					"target": target,
					"dom": $(view.renderer.domElement)
				};
			});

		});

		window[0].hmm5File = link;

		return window;

	};

	$.hmm5.openGeometry = function (file) {

		let scale = 1 / parseFloat($("html").css("zoom"));

		let size = Math.round(200 * scale);

		let window = $.hmm5.openWindow(file.split("/").slice(-1)[0], "geom");

		$.hmm5.resizeWindow(window, size, size);

		let view = $.hmm5.open3DView(size, size, true);

		view.start();

		window[0].hmm5Close = function () {
			view.stop();
		};

		window.find("#window-client-area").append($(view.renderer.domElement));

		let material = (meshIndex, polygonIndex) => {
			return new THREE.MeshPhongMaterial({
				"color": 0x0f4c84,
			});
		};

		$.hmm5.loadGeometry(file, material, null, (object, mins, maxes) => {

			let radius = Math.max((maxes[0] - mins[0]), (maxes[1] - mins[1]), (maxes[2] - mins[2]));
			let scale = 60 / radius;

			object.position.set((mins[0] + maxes[0]) * (-0.5),
			                    (mins[1] + maxes[1]) * (-0.5),
			                    -mins[2]);

			let container = new THREE.Object3D();
			container.scale.set(scale, scale, scale);
			container.rotateX(-Math.PI / 2);

			container.add(object);

			view.controls.target0.set(0, (maxes[2] - mins[2]) * 0.5 * scale, 0);

			view.scene.add(container);

		});

		return window;

	};

	$.hmm5.openSkeleton = function (file) {

		let scale = 1 / parseFloat($("html").css("zoom"));

		let size = Math.round(200 * scale);

		let window = $.hmm5.openWindow(file.split("/").slice(-1)[0], "skel");

		$.hmm5.resizeWindow(window, size, size);

		let view = $.hmm5.open3DView(size, size, true);

		view.start();

		window[0].hmm5Close = function () {
			view.stop();
		};

		window.find("#window-client-area").append($(view.renderer.domElement));

		$.hmm5.loadSkeleton(file, (skeleton) => {

			let object = new THREE.Object3D();
			object.add(skeleton.bones[0]);

			let maxes = [-Infinity, -Infinity, -Infinity];
			let mins = [Infinity, Infinity, Infinity];

			for (let bone of skeleton.bones) {
				let vector = new THREE.Vector3(0, 0, 0);
				vector.applyMatrix4(bone.matrixWorld);
				if (maxes[0] < vector.x) { maxes[0] = vector.x; }
	        	if (maxes[1] < vector.y) { maxes[1] = vector.y; }
	        	if (maxes[2] < vector.z) { maxes[2] = vector.z; }
	        	if (mins[0] > vector.x) { mins[0] = vector.x; }
	        	if (mins[1] > vector.y) { mins[1] = vector.y; }
	        	if (mins[2] > vector.z) { mins[2] = vector.z; }
			}

			let radius = Math.max((maxes[0] - mins[0]), (maxes[1] - mins[1]), (maxes[2] - mins[2]));
			let scale = 60 / radius;

			object.position.set((mins[0] + maxes[0]) * (-0.5),
			                    (mins[1] + maxes[1]) * (-0.5),
			                    -mins[2]);

			let container = new THREE.Object3D();
			container.scale.set(scale, scale, scale);
			container.rotateX(-Math.PI / 2);

			container.add(object);

			view.scene.add(container);

			var helper = new THREE.SkeletonHelper(container);
			helper.material.linewidth = 30;
			view.scene.add(helper);

			view.controls.target0.set(0, (maxes[2] - mins[2]) * 0.5 * scale, 0);

		});

		return window;

	};

	$.hmm5.smartOpen = function (id) {

		if ((id.indexOf(".") === -1) && (id.indexOf("/") === -1) && (id.indexOf("#") === -1)) {
			return $.hmm5.openGUID(id);
		}

		if (id.split("#")[0].split("/").slice(-1)[0].split(".").slice(-1)[0] === "xdb") {

			let parsed = undefined;

			let path = id.split("#")[0];
			if (path[0] === "/") {
				path = path.slice(1);
			}
			$.ajax("/list/bindings/" + path, {
				"async": false,
				"success": function (data, status, request) {
					if (data.length > 0) {
						let link = undefined;
						if (id.indexOf("#") === -1) {
							link = data.split("\n").filter((link) => {
								return (link.split("#xpointer(")[1][0] === "/");
							})[0];
						} else {
							link = data.split("\n").filter((link) => {
								return link.split(":").slice(0, -1).join(":") === id;
							})[0];
						}
						if (link) {
							let binding = link.split(":").slice(-1)[0];
							switch (binding) {
								case "f1019f05": {
									parsed = $.hmm5.openModel(link.split(":").slice(0, -1).join(":"));
									break;
								};
								default: {
									parsed = $.hmm5.openLink(link.split(":").slice(0, -1).join(":"));
									break;
								}
							}
						}
					}
				}
			});

			if (parsed) {
				return parsed;
			}

		}

		if (id.split("#").length > 1) {
			return $.hmm5.openLink(id);
		}

		return $.hmm5.openFile(id);

	};

	$.hmm5.loadGeometry = function (file, material, skeleton, callback) {

		$.ajax(`/geom/${file}`, {
			"success": function (data) {

				let parsed = $.hmm5.parse(data);

				let object = new THREE.Object3D();

				let maxes = [-Infinity, -Infinity, -Infinity];
				let mins = [Infinity, Infinity, Infinity];

				let meshIndex = 0;
				for (let mesh of parsed.meshes) {

					let polygonIndex = 0;
					for (let polygon of mesh) {

				        // let polygon = {
				        //     "vertices": vertices.data,
				        //     "triangles": triangles.data, // use the config index
				        //     "configs": {
				        //         "data": configs.data,
				        //         "vertices": configVertices.data, // config index to vertex id
				        //         "indices": configIndices.data, // config index to config id
				        //     },
				        //     "bones": bones.data,
				        //     "unknown": [unknown[0], unknown[1], unknown[2], unknown[3]],
				        //     "flags": flags
				        // };

						let vertexCount = polygon.configs.vertices.length;
						let faceCount = polygon.triangles.length;

						let vertices = new Float32Array(vertexCount * 3);
						let normals = new Float32Array(vertexCount * 3);
						let uvs = new Float32Array(vertexCount * 2);

						let indices = [];

						for (let looper = 0; looper < vertexCount; ++looper) {
							let index = polygon.configs.vertices[looper];
				        	let vertex = polygon.vertices[index];
				        	let data = polygon.configs.data[looper];
				        	if (maxes[0] < vertex[0]) { maxes[0] = vertex[0]; }
				        	if (maxes[1] < vertex[1]) { maxes[1] = vertex[1]; }
				        	if (maxes[2] < vertex[2]) { maxes[2] = vertex[2]; }
				        	if (mins[0] > vertex[0]) { mins[0] = vertex[0]; }
				        	if (mins[1] > vertex[1]) { mins[1] = vertex[1]; }
				        	if (mins[2] > vertex[2]) { mins[2] = vertex[2]; }
				        	vertices[looper * 3] = vertex[0];
				        	vertices[looper * 3 + 1] = vertex[1];
				        	vertices[looper * 3 + 2] = vertex[2];
				        	normals[looper * 3] = data.normal[0];
				        	normals[looper * 3 + 1] = data.normal[1];
				        	normals[looper * 3 + 2] = data.normal[2];
				        	uvs[looper * 2] = data.uv[0];
				        	uvs[looper * 2 + 1] = data.uv[1];
				        }

				        for (let looper = 0; looper < faceCount; ++looper) {
				        	let triangle = polygon.triangles[looper];
				        	indices[looper * 3] = triangle[0];
				        	indices[looper * 3 + 1] = triangle[1];
				        	indices[looper * 3 + 2] = triangle[2];
				        }

						let geometry = new THREE.BufferGeometry();

						geometry.setIndex(indices);

						geometry.addAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
						geometry.addAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
						geometry.addAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

						let mesh = new THREE.Mesh(geometry, material(meshIndex, polygonIndex));

						object.add(mesh);

						++polygonIndex;

					}

					++meshIndex;

				}

				callback(object, mins, maxes);

			}
		});

	};

	$.hmm5.loadSkeleton = function (file, callback) {

		$.ajax(`/skel/${file}`, {
			"success": function (data) {

				let parsed = $.hmm5.parse(data);

				let bones = Object.create(null);
				let boneList = [];

				let skeleton = new THREE.Skeleton(parsed.bones.map((record, index) => {

					let bone = new THREE.Bone();

					bone.name = record.name;

			        bone.scale.set(record.scales[0], record.scales[1], record.scales[2]);
			        bone.position.set(record.translations[0], record.translations[1], record.translations[2]);
			        bone.quaternion.set(record.quaternion[0], record.quaternion[1], record.quaternion[2], record.quaternion[3]);

			        if (record.parent !== -1) {
				        boneList[record.parent].add(bone);
				    }

			        bone.updateMatrixWorld(true);

			        boneList[index] = bone;
					bones[record.name] = bone;

					return bone;

				}));

				skeleton.update();
				skeleton.calculateInverses();

				callback(skeleton);

			}
		});

	};

	$.hmm5.loadLink = function (link, callback) {

		$.ajax(`/link${link.split("#")[0]}?hash=${encodeURIComponent(link.split("#").slice(1).join("#"))}`, {
			"success": function (data, status, request) {

				let parsed = $.hmm5.parse(data);

				callback(parsed);

			}
		});

	};

	$.hmm5.loadModel = function (link, callback) {

		(async () => {

			let links = Object.create(null);

			let records = {
				"model": await new Promise((next) => $.hmm5.loadLink(link, next)),
				"materials": [],
				"textures": Object.create(null)
			};

			links[records.model.Geometry.href] = true;
			if (records.model.Skeleton) {
				links[records.model.Skeleton.href] = true;
			}

			records.geometry = await new Promise((next) => $.hmm5.loadLink(records.model.Geometry.href, next));
			links[records.geometry.uid.id] = true;

			if (records.model.Skeleton) {
				records.skeleton = await new Promise((next) => $.hmm5.loadLink(records.model.Skeleton.href, next));
				links[records.skeleton.uid.id] = true;
			}

			for (let material of records.model.Materials) {
				links[material.href] = true;
				let linked = await new Promise((next) => $.hmm5.loadLink(material.href, next));
				records.materials.push(linked);
				if (!records[linked.Texture.href]) {
					links[linked.Texture.href] = true;
					records.textures[linked.Texture.href] = await new Promise((next) => $.hmm5.loadLink(linked.Texture.href, next));
				}
			}

			let skeleton = null;
			if (records.skeleton) {
				skeleton = await new Promise((next) => {
					$.ajax(`/uid/${records.skeleton.uid.id}`, {
						"success": (path) => {
							$.hmm5.loadSkeleton(path, next);
						}
					});
				});
			}

			let material = (meshIndex, polygonIndex) => {

				let offset = 0;
				for (let looper = 0; looper < meshIndex; ++looper) {
					offset += records.geometry.MaterialQuantities[looper];
				}

				let configs = {
					"material": records.materials[offset + polygonIndex]
				};
				configs.texture = records.textures[configs.material.Texture.href];

				links[configs.texture.DestName.href] = true;

				let texture = new THREE.TextureLoader().load("/png/" + configs.texture.DestName.href + ".png");
				texture.flipY = configs.texture.FlipY;
				switch (configs.texture.AddrType.token) {
					case "CLAMP": {
						texture.wrapS = THREE.ClampToEdgeWrapping;
						texture.wrapT = THREE.ClampToEdgeWrapping;
						break;
					};
					case "WRAP": {
						texture.wrapS = THREE.RepeatWrapping;
						texture.wrapT = THREE.RepeatWrapping;
						break;
					};
					case "WRAP_X": {
						texture.wrapS = THREE.RepeatWrapping;
						texture.wrapT = THREE.ClampToEdgeWrapping;
						break;
					};
					case "WRAP_Y": {
						texture.wrapS = THREE.ClampToEdgeWrapping;
						texture.wrapT = THREE.RepeatWrapping;
						break;
					};
					default: { break; };
				}

				let material = new THREE.MeshPhongMaterial({
					"map": texture
				});
				if (configs.material.is2Sided) {
					material.side = THREE.DoubleSide;
				}
				if (configs.material.IgnoreZBuffer) {
					material.depthTest = false;
				}
				// configs.material.DielMirror
				// configs.material.MetalMirror
				// configs.material.Gloss texture
				// configs.material.LightingMode
				// configs.material.ReceiveShadow
				// configs.material.SpecFactor
				// configs.material.CastShadow
				// configs.material.BackFaceCastShadow
				switch (configs.material.AlphaMode.token) {
					case "AM_OPAQUE": { break; };
					case "AM_OVERLAY": {
						material.transparent = true;
						material.depthWrite = false;
						break;
					};
					case "AM_OVERLAY_ZWRITE": {
						material.transparent = true;
						break;
					};
					case "AM_TRANSPARENT": {
						material.transparent = true;
						material.depthWrite = false;
						break;
					};
					case "AM_ALPHA_TEST": {
						material.alphaTest = 0.5;
						break;
					};
					case "AM_DECAL":
					default: { break; };
				}

				return material;
			};

			$.ajax(`/uid/${records.geometry.uid.id}`, {
				"success": (path) => {
					$.hmm5.loadGeometry(path, material, skeleton, (model, mins, maxes) => {
						callback(model, mins, maxes, Object.keys(links));
					});
				}
			});

		})();

	};

});

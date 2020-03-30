const App = function App(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

App.prototype.openModel = function (callback) {

    let that = this;

    let input = $("<input>").attr({
        "type": "file"
    }).css({
        "display": "none"
    }).on("change", function (event) {

        let file = this.files[0];
        if (!file) {
            callback(); return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {

            let arrayBuffer = event.target.result;
            let dataView = new DataView(arrayBuffer);

            let count = dataView.getUint32(80, true);
            let offset = 84;

            let triangles = [];

            let mins = [Infinity, Infinity, Infinity];
            let maxes = [-Infinity, -Infinity, -Infinity];

            for (let looper = 0; looper < count; ++looper) {
                let normal = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                let v1 = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                let v2 = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                let v3 = [
                    dataView.getFloat32(offset, true), 
                    dataView.getFloat32(offset + 4, true), 
                    dataView.getFloat32(offset + 8, true)
                ];
                offset += 12;
                let flag = dataView.getUint16(offset, true);
                let isBothSides = flag & 1 ? true : false;
                offset += 2;
                let triangleNormal = new THREE.Vector3(v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]);
                triangleNormal.cross(new THREE.Vector3(v1[0] - v3[0], v1[1] - v3[1], v1[2] - v3[2]));
                if (normal[0] * triangleNormal[0] + normal[1] * triangleNormal[1] + normal[2] * triangleNormal[2] < 0) {
                    let v = v1; v1 = v3; v3 = v;
                }
                let vertexIDs = [v1, v2, v3].map((x) => x.map((x) => x.toPrecision(5)).join(","));
                triangles.push({
                    "both-sides": isBothSides,
                    "normal": normal,
                    "vertices": [v1, v2, v3],
                    "vertexIDs": vertexIDs,
                    "id": vertexIDs.slice(0).sort().join(":")
                });
                for (let looper2 = 0; looper2 < 3; ++looper2) {
                    let min = Math.min(v1[looper2], v2[looper2], v3[looper2]);
                    let max = Math.max(v1[looper2], v2[looper2], v3[looper2]);
                    if (mins[looper2] > min) { mins[looper2] = min; }
                    if (maxes[looper2] < max) { maxes[looper2] = max; }
                }
            }

            callback({
                "triangles": triangles, 
                "bounds": {
                    "mins": mins,
                    "maxes": maxes
                }
            });

        };

        reader.readAsArrayBuffer(file);

    });

    $("body").append(input);

    input.click();

    input.detach();

};

App.prototype.groupTriangles = function (model) {

    let groups = [];

    const group = (triangles) => {

        let grouped = Object.create(null);

        let indices = Object.create(null);
        triangles.map((triangle, index) => {
            for (let looper = 0; looper < 3; ++looper) {
                if (!indices[triangle.vertexIDs[looper]]) {
                    indices[triangle.vertexIDs[looper]] = [];
                } 
                indices[triangle.vertexIDs[looper]].push(index);
            }
        });

        let parsed = Object.create(null);

        let queue = triangles[0].vertexIDs.slice(0);
        for (let vertexID of queue) {
            parsed[vertexID] = true;
        }

        while (queue.length > 0) {
            let id = queue.pop();
            parsed[id] = true;
            for (let index of indices[id]) {
                if (!grouped[index]) {
                    grouped[index] = true;
                    for (let vertexID of triangles[index].vertexIDs) {
                        if (!parsed[vertexID]) {
                            parsed[vertexID] = true;
                            queue.push(vertexID);
                        }
                    }
                }
            }
        }

        let groupTriangles = triangles.filter((triangle, index) => grouped[index]);
        let ids = Object.create(null);
        groupTriangles.forEach((triangle, index) => {
            if (!ids[triangle.id]) { ids[triangle.id] = []; }
            ids[triangle.id].push({"triangle": triangle, "index": index});
        });

        let angles = [];
        let finalTriangles = [];
        let bothSidesCounts = 0;
        for (let id in ids) {
            if (ids[id].length > 1) {
                let boths = ids[id].filter((record) => record["both-sides"]).length;
                let singleFaces = ids[id].filter((record) => !record["both-sides"]);
                let sames = 0;
                let inverts = 0;
                if (singleFaces.length > 1) {
                    sames = 1;
                    singleFaces.slice(1).forEach((record) => {
                        if (record.triangle.normal[0] * singleFaces[0].triangle.normal[0] + 
                            record.triangle.normal[1] * singleFaces[0].triangle.normal[1] +
                            record.triangle.normal[2] * singleFaces[0].triangle.normal[2] > 0) {
                            ++sames;
                        } else {
                            ++inverts;
                        }
                    });
                    let newBoths = Math.min(inverts, sames);
                    if (newBoths > 0) {
                        boths += newBoths;
                        sames -= newBoths;
                        inverts -= newBoths;
                        let newFaces = [];
                        for (let looper = 0; looper < boths; ++looper) {
                            let reverse = false;
                            if (ids[id][0].triangle.normal[0] < 0) {
                                reverse = true;
                            } else if (ids[id][0].triangle.normal[0] == 0) {
                                reverse = ids[id][0].triangle.normal[1] < 0;
                            }
                            if (reverse) {
                                newFaces.push(Object.assign({}, ids[id][0], {
                                    "triangle": Object.assign({}, ids[id][0].triangle, {
                                        "normal": [
                                            -ids[id][0].triangle.normal[0],
                                            -ids[id][0].triangle.normal[1],
                                            -ids[id][0].triangle.normal[2]
                                        ],
                                        "vertices": ids[id][0].triangle.vertices.slice(0).reverse(),
                                        "vertexIDs": ids[id][0].triangle.vertexIDs.slice(0).reverse(),
                                        "both-sides": true
                                    })
                                }));
                            } else {
                                newFaces.push(Object.assign({}, ids[id][0], {
                                    "triangle": Object.assign({}, ids[id][0].triangle, {
                                        "both-sides": true
                                    })
                                }));
                            }
                        }
                        for (let looper = 0; looper < sames; ++looper) {
                            newFaces.push(Object.assign(singleFaces[0], {
                                "triangle": Object.assign({}, singleFaces[0].triangle, {
                                    "both-sides": false
                                })
                            }));
                        }
                        for (let looper = 0; looper < inverts; ++looper) {
                            newFaces.push(Object.assign(singleFaces[0], {
                                "triangle": Object.assign({}, singleFaces[0].triangle, {
                                    "both-sides": false,
                                    "vertices": singleFaces[0].triangle.vertices.slice(0).reverse(),
                                    "vertexIDs": singleFaces[0].triangle.vertexIDs.slice(0).reverse(),
                                    "normal": [
                                        -singleFaces[0].triangle.normal[0],
                                        -singleFaces[0].triangle.normal[1],
                                        -singleFaces[0].triangle.normal[2]
                                    ]
                                })
                            }));
                        }
                        ids[id] = newFaces;
                    }
                }
                if ((sames === 0) && (inverts === 0)) {
                    ++bothSidesCounts;
                }
            } else {
                if (ids[id][0].triangle["both-sides"]) {
                    ++bothSidesCounts;
                    let reverse = false;
                    if (ids[id][0].triangle.normal[0] < 0) {
                        reverse = true;
                    } else if (ids[id][0].triangle.normal[0] == 0) {
                        reverse = ids[id][0].triangle.normal[1] < 0;
                    }
                    if (reverse) {
                        ids[id][0] = Object.assign({}, ids[id][0], {
                            "triangle": Object.assign({}, ids[id][0].triangle, {
                                "normal": [
                                    -ids[id][0].triangle.normal[0],
                                    -ids[id][0].triangle.normal[1],
                                    -ids[id][0].triangle.normal[2]
                                ],
                                "vertices": ids[id][0].triangle.vertices.slice(0).reverse(),
                                "vertexIDs": ids[id][0].triangle.vertexIDs.slice(0).reverse(),
                                "both-sides": true
                            })
                        });
                    }
                }
            }
            for (let triangle of ids[id]) {
                finalTriangles.push(triangle);
            }
        }

        groups.push({
            "both-sides": (bothSidesCounts / Object.keys(ids).length) > 0.5,
            "triangles": finalTriangles.sort((a, b) => a.index - b.index).map((record) => record.triangle) 
        });

        return triangles.filter((triangle, index) => !grouped[index]);

    };

    let rests = model.triangles;
    while (rests.length > 0) {
        rests = group(rests);
    }

    model.groups = groups.map((group) => {
        return this.autocloseGroup(group);
    }).map((group) => {
        return this.makeGroupPrintable(group);
    });

    return model;offsets

};

App.prototype.autocloseGroup = function (group) {

    let statistics = Object.create(null);
    let allPoints = Object.create(null);

    const recordEdge = (v1, v1ID, v2, v2ID) => {
        if (!allPoints[v1ID]) { allPoints[v1ID] = v1; }
        if (!allPoints[v2ID]) { allPoints[v2ID] = v2; }
        if (v1ID == v2ID) { return; }
        let vs = [v1ID, v2ID].sort();
        let id = "[" + vs.join("] > [") + "]";
        if (!statistics[id]) {
            statistics[id] = { 
                "from": vs[0] == v1ID ? v1 : v2,
                "fromID": vs[0],
                "to": vs[0] == v1ID ? v2 : v1,
                "toID": vs[1],
                "forwards": 0,
                "backwards": 0
            };
        }
        if (vs[0] === v1ID) {
            ++statistics[id].forwards;
        } else {
            ++statistics[id].backwards;
        }
    };

    for (let triangle of group.triangles) {
        if (!triangle["both-sides"]) {
            recordEdge(triangle.vertices[0], triangle.vertexIDs[0], 
                       triangle.vertices[1], triangle.vertexIDs[1]);
            recordEdge(triangle.vertices[1], triangle.vertexIDs[1],
                       triangle.vertices[2], triangle.vertexIDs[2]);
            recordEdge(triangle.vertices[2], triangle.vertexIDs[2],
                       triangle.vertices[0], triangle.vertexIDs[0]);
        }
    }

    let notCloseds = {
        "points": Object.create(null),
        "edges": Object.create(null)
    };
    for (let id in statistics) {
        if (statistics[id].forwards !== statistics[id].backwards) {
            notCloseds.edges[id] = Object.assign({}, statistics[id]);
            if (statistics[id].forwards < statistics[id].backwards) {
                if (!notCloseds.points[statistics[id].fromID]) {
                    notCloseds.points[statistics[id].fromID] = {
                        "point": statistics[id].from,
                        "edges": []
                    };
                }
                notCloseds.points[statistics[id].fromID].edges.push(id);
            } else {
                if (!notCloseds.points[statistics[id].toID]) {
                    notCloseds.points[statistics[id].toID] = {
                        "point": statistics[id].to,
                        "edges": []
                    };
                }
                notCloseds.points[statistics[id].toID].edges.push(id);
            }
        }
    }

    const getNextPoints = (point, covereds, start) => {
        let points = [];
        let hasStart = false;
        let edges = notCloseds.points[point].edges;
        for (let edge of edges) {
            let next = undefined;
            if (notCloseds.edges[edge].fromID === point) {
                next = notCloseds.edges[edge].toID;
            } else {
                next = notCloseds.edges[edge].fromID;
            }
            if (next === start) {
                hasStart = true;
            }
            if (!covereds[next]) {
                points.push(next);
                covereds[next] = true;
            }
        }
        if (hasStart) {
            return [start];
        }
        return points;
    };

    let points = Object.create(null);
    let routes = [];
    while (Object.keys(notCloseds.points).length > 0) (() => {

        let start = Object.keys(notCloseds.points)[0];

        let route = [Object.assign(Object.create(null), {
            "": [start]
        })];
        let covereds = Object.create(null);
        covereds[start] = true;

        let closed = false;
        let broken = false;
        while ((!closed) && (!broken)) {
            let last = route[route.length - 1];
            let queue = Object.create(null);
            let recoreds = Object.create(null);
            for (let from in last) {
                for (let to of last[from]) {
                    let newCovereds = Object.assign(Object.create(null), covereds);
                    let nexts = getNextPoints(to, newCovereds, start);
                    if (nexts[0] === start) {
                        closed = true;
                    }
                    if (nexts.length > 0) {
                        queue[to] = nexts;
                    }
                    Object.assign(recoreds, newCovereds);
                }
            }
            if (Object.keys(queue).length === 0) {
                broken = true;
            } else {
                route.push(queue);
            }
            Object.assign(covereds, recoreds);
        }

        if (closed) {
            let finalRoute = [start];
            let looper = route.length;
            while (looper > 0) {
                --looper;    
                let queue = route[looper];
                let found = false;
                for (let from in queue) {
                    if ((!found) && (queue[from].indexOf(finalRoute[finalRoute.length - 1]) !== -1)) {
                        finalRoute.push(from);
                        found = true;
                    }
                }
            }
            route = finalRoute.reverse().slice(1, -1);
            routes.push(route);
            route.forEach((from, index) => {
                let to = route[index + 1];
                if (!to) { to = route[0]; }
                let points = [from, to].sort();
                let edge = "[" + points.join("] > [") + "]";
                if (notCloseds.edges[edge].fromID === from) {
                    ++notCloseds.edges[edge].forwards;
                } else {
                    ++notCloseds.edges[edge].backwards;
                }
                if (notCloseds.edges[edge].forwards === notCloseds.edges[edge].backwards) {
                    delete notCloseds.edges[edge];
                    let index = notCloseds.points[from].edges.indexOf(edge);
                    if (index !== -1) {
                        notCloseds.points[from].edges.splice(index, 1);
                        if (notCloseds.points[from].edges.length === 0) {
                            delete notCloseds.points[from];
                        }
                    }
                }
            });
        } else {
            console.log("Not closed");
        }

    })();

    let triangles = [];
    for (let route of routes) {
        let distances = Object.create(null);
        for (let looper = 0; looper < route.length; ++looper) {
            for (let looper2 = looper + 1; looper2 < route.length; ++looper2) {
                let id = [route[looper], route[looper2]].sort().join(":");
                let p1 = allPoints[route[looper]];
                let p2 = allPoints[route[looper2]];
                distances[id] = Math.sqrt(
                    (p1[0] - p2[0]) * (p1[0] - p2[0]) + 
                    (p1[1] - p2[1]) * (p1[1] - p2[1]) + 
                    (p1[2] - p2[2]) * (p1[2] - p2[2]));
            }
        }
        const split = (route) => {
            let min = Infinity;
            let maught = undefined;
            if (route.length === 3) {
                triangles.push(route); return;
            }
            for (let looper = 0; looper < route.length; ++looper) {
                for (let looper2 = looper + 2; looper2 < route.length; ++looper2) {
                    if ((looper !== 0) || (looper2 < route.length - 1)) {
                        let id = [route[looper], route[looper2]].sort().join(":");
                        if (min > distances[id]) {
                            min = distances[id];
                            maught = [looper, looper2].sort((a, b) => a - b);
                        }
                    }
                }
            }
            split(route.slice(0, maught[0] + 1).concat(route.slice(maught[1])));
            split(route.slice(maught[0], maught[1] + 1));
        };
        split(route);
    }

    // let extraTriangles = [];

    // while (Object.keys(notCloseds.points).length > 0) (() => {

    //     let points = [Object.keys(notCloseds.points)[0]];

    //     let edge = notCloseds.points[points[0]].edges[0];
    //     if (notCloseds.edges[edge].fromID === points[0]) {
    //         points.push(notCloseds.edges[edge].toID);
    //     } else {
    //         points.push(notCloseds.edges[edge].fromID);
    //     }

    //     let edge2 = notCloseds.points[points[1]].edges[0];
    //     if (notCloseds.edges[edge2].fromID === points[1]) {
    //         points.push(notCloseds.edges[edge2].toID);
    //     } else {
    //         points.push(notCloseds.edges[edge2].fromID);
    //     }

    //     extraTriangles.push(points.map((x) => notCloseds.points[x].point));

    //     let backPoints = [points[0], points[2]].sort();
    //     let backEdge = "[" + backPoints.join("] > [") + "]";
        
    //     if (notCloseds.edges[edge].fromID === points[0]) {
    //         ++notCloseds.edges[edge].forwards;
    //     } else {
    //         ++notCloseds.edges[edge].backwards;
    //     }
    //     if (notCloseds.edges[edge].forwards === notCloseds.edges[edge].backwards) {
    //         delete notCloseds.edges[edge];
    //         notCloseds.points[points[0]].edges.splice(0, 1);
    //     }
    //     if (notCloseds.edges[edge2].fromID === points[1]) {
    //         ++notCloseds.edges[edge2].forwards;
    //     } else {
    //         ++notCloseds.edges[edge2].backwards;
    //     }
    //     if (notCloseds.edges[edge2].forwards === notCloseds.edges[edge2].backwards) {
    //         delete notCloseds.edges[edge2];
    //         notCloseds.points[points[1]].edges.splice(0, 1);
    //     }
    //     if (notCloseds.edges[backEdge]) {
    //         if (notCloseds.edges[backEdge].fromID === points[2]) {
    //             ++notCloseds.edges[backEdge].forwards;
    //         } else {
    //             ++notCloseds.edges[backEdge].backwards;
    //         }
    //         if (notCloseds.edges[backEdge].forwards === notCloseds.edges[backEdge].backwards) {
    //             delete notCloseds.edges[backEdge];
    //             let index = notCloseds.points[points[2]].edges.indexOf(backEdge);
    //             if (index !== -1) {
    //                 notCloseds.points[points[2]].edges.splice(index, 1);
    //             }
    //         }
    //     } else {
    //         notCloseds.edges[backEdge] = {
    //             "from": notCloseds.points[backPoints[0]],
    //             "fromID": backPoints[0],
    //             "to": notCloseds.points[backPoints[1]],
    //             "toID": backPoints[1],
    //             "forwards": 0,
    //             "backwards": 0
    //         };
    //         if (backPoints[0] === points[2]) {
    //             ++notCloseds.edges[backEdge].forwards;
    //         } else {
    //             ++notCloseds.edges[backEdge].backwards;
    //         }
    //         notCloseds.points[points[0]].edges.push(backEdge);
    //     }
    //     if (notCloseds.points[points[0]] && (notCloseds.points[points[0]].edges.length === 0)) {
    //         delete notCloseds.points[points[0]];
    //     }
    //     if (notCloseds.points[points[1]] && (notCloseds.points[points[1]].edges.length === 0)) {
    //         delete notCloseds.points[points[1]];
    //     }
    //     if (notCloseds.points[points[2]] && (notCloseds.points[points[2]].edges.length === 0)) {
    //         delete notCloseds.points[points[2]];
    //     }
    // })();

    if (triangles.length) {
        console.log(`Patched ${triangles.length} triangles`);
    }

    group.patcheds = triangles.map((ids) => {
        let points = ids.map((id) => allPoints[id]);
        let normal = new THREE.Vector3(points[0][0] - points[1][0], 
                                       points[0][1] - points[1][1], 
                                       points[0][2] - points[1][2]);
        normal.cross(new THREE.Vector3(points[0][0] - points[2][0], 
                                       points[0][1] - points[2][1], 
                                       points[0][2] - points[2][2]));
        normal.normalize();
        return {
            "vertexIDs": ids,
            "normal": [normal.x, normal.y, normal.z],
            "vertices": points
        };
    });

    return group;

};

App.prototype.makeGroupPrintable = function (group) {

    let triangles = [];

    let points = Object.create(null);
    let lines = Object.create(null);

    let convert = (triangle, point, id, offset) => {

        let n = Math.sqrt(triangle.normal[0] * triangle.normal[0] + 
                          triangle.normal[1] * triangle.normal[1] + 
                          triangle.normal[2] * triangle.normal[2]);

        let data = {
            "id": id,
            "point": point,
            "direction": offset,
            "normal": triangle.normal,
            "offset": [
                triangle.normal[0] * offset / n,
                triangle.normal[1] * offset / n,
                triangle.normal[2] * offset / n 
            ]
        };
        if (offset !== 0) {
            if (!points[id]) {
                points[id] = Object.create(null);
            }
            if (!points[id][offset]) {
                points[id][offset] = {
                    "data": []
                };
            }
            points[id][offset].data.push(data);
        }
        return data;
    };

    let record = (v1, v2, v3) => {
        let v = new THREE.Vector3(v1.point[0] + v1.offset[0] - v2.point[0] - v2.offset[0], 
                                  v1.point[1] + v1.offset[1] - v2.point[1] - v2.offset[1], 
                                  v1.point[2] + v1.offset[2] - v2.point[2] - v2.offset[2]);
        v.cross(new THREE.Vector3(v1.point[0] + v1.offset[0] - v3.point[0] - v3.offset[0], 
                                  v1.point[1] + v1.offset[1] - v3.point[1] - v3.offset[1], 
                                  v1.point[2] + v1.offset[2] - v3.point[2] - v3.offset[2])); 
        v.normalize();
        triangles.push({
            "vertexIDs": [v1.id, v2.id, v3.id],
            "vertices": [v1.point, v2.point, v3.point],
            "offsets": [v1.offset, v2.offset, v3.offset],
            "directions": [v1.direction, v2.direction, v3.direction],
            "normal": [v.x, v.y, v.z] 
        });
    };

    for (let triangle of group.triangles.slice(0).concat(group.patcheds)) {
        let suffix = null;
        if (triangle["both-sides"]) {
            suffix = "x";
        } else if (group["both-sides"]) {
            suffix = "y";
        }
        if (suffix) {
            let reverse = false;
            if (triangle.normal[0] < 0) { 
                reverse = true; 
            } else if (triangle.normal[0] === 0) {
                reverse = triangle.normal[1] < 0;
            }
            if (reverse) {
                lines[`${triangle.vertexIDs[1]}:${triangle.vertexIDs[0]}:${suffix}`] = true;
                lines[`${triangle.vertexIDs[2]}:${triangle.vertexIDs[1]}:${suffix}`] = true;
                lines[`${triangle.vertexIDs[0]}:${triangle.vertexIDs[2]}:${suffix}`] = true;
            } else {
                lines[`${triangle.vertexIDs[0]}:${triangle.vertexIDs[1]}:${suffix}`] = true;
                lines[`${triangle.vertexIDs[1]}:${triangle.vertexIDs[2]}:${suffix}`] = true;
                lines[`${triangle.vertexIDs[2]}:${triangle.vertexIDs[0]}:${suffix}`] = true;
            }
        }
    }

    for (let triangle of group.triangles.slice(0).concat(group.patcheds)) {
        let t1 = undefined; let t2 = undefined;
        let suffix = null;
        if (triangle["both-sides"]) {
            suffix = "x";
            t1 = [convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], 0.5), 
                  convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], 0.5), 
                  convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], 0.5)];
            t2 = [convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], -0.5), 
                  convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], -0.5), 
                  convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], -0.5)];
        } else if (group["both-sides"]) {
            suffix = "y";
            t1 = [convert(triangle, triangle.vertices[0], 0), 
                  convert(triangle, triangle.vertices[1], 0), 
                  convert(triangle, triangle.vertices[2], 0)];
            t2 = [convert(triangle, triangle.vertices[2], -1), 
                  convert(triangle, triangle.vertices[1], -1), 
                  convert(triangle, triangle.vertices[0], -1)];
        }
        if (!triangle["both-sides"]) {
        if (t1 && t2) {
            record(t1[0], t1[1], t1[2]);
            record(t2[0], t2[1], t2[2]);
            if ((!lines[`${triangle.vertexIDs[1]}:${triangle.vertexIDs[2]}:${suffix}`]) || 
                (!lines[`${triangle.vertexIDs[2]}:${triangle.vertexIDs[1]}:${suffix}`])) {
                record(t2[0], t1[2], t1[1]); // t2[2], t1[2], t1[1]
                record(t2[0], t1[1], t2[1]); // t2[2], t1[1], t2[1]
            }
            if ((!lines[`${triangle.vertexIDs[1]}:${triangle.vertexIDs[0]}:${suffix}`]) || 
                (!lines[`${triangle.vertexIDs[0]}:${triangle.vertexIDs[1]}:${suffix}`])) {
                record(t2[1], t1[1], t1[0]); // t2[1], t1[1], t1[0]
                record(t2[1], t1[0], t2[2]); // t2[1], t1[0], t2[0]
            }
            if ((!lines[`${triangle.vertexIDs[2]}:${triangle.vertexIDs[0]}:${suffix}`]) || 
                (!lines[`${triangle.vertexIDs[0]}:${triangle.vertexIDs[2]}:${suffix}`])) {
                record(t2[2], t1[0], t1[2]); // t2[0], t1[0], t1[2]
                record(t2[2], t1[2], t2[0]); // t2[0], t1[2], t2[2]
            }
        } else {
            record(convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], 0), 
                   convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], 0), 
                   convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], 0));
        }
    }
    }

    for (let id in points) {
        for (let offset in points[id]) {
            let forwardCount = 0; let forwards = [0, 0, 0];
            let backwardCount = 0; let backwards = [0, 0, 0];
            for (let data of points[id][offset].data) {
                if (data.offset[0] * points[id][offset].data[0].offset[0] +
                    data.offset[1] * points[id][offset].data[0].offset[1] +
                    data.offset[2] * points[id][offset].data[0].offset[2] > 0) {
                    ++forwardCount;
                    forwards[0] += data.offset[0]; forwards[1] += data.offset[1]; forwards[2] += data.offset[2];
                } else {
                    ++backwardCount;
                    backwards[0] += data.offset[0]; backwards[1] += data.offset[1]; backwards[2] += data.offset[2];
                }
            }
            if (forwardCount) {
                forwards[0] /= forwardCount; forwards[1] /= forwardCount; forwards[2] /= forwardCount;
            }
            if (backwardCount) {
                backwards[0] /= backwardCount; backwards[1] /= backwardCount; backwards[2] /= backwardCount;
            }
            points[id][offset].forwards = forwards;
            points[id][offset].backwards = backwards;
            points[id][offset].direction = points[id][offset].data[0].offset;
        }
    }

    let changes = [];
    for (let triangle of triangles) {
        if (triangle.directions && triangle.offsets) {
            for (let looper = 0; looper < 3; ++looper) {
                if (points[triangle.vertexIDs[looper]]) {
                    let data = points[triangle.vertexIDs[looper]][triangle.directions[looper]];
                    if (data) {
                        let offset = data.forwards;
                        if (data.direction[0] * triangle.offsets[looper][0] + 
                            data.direction[1] * triangle.offsets[looper][1] + 
                            data.direction[2] * triangle.offsets[looper][2] < 0) {
                            offset = data.backwards;
                        }
                        changes.push([data.direction, triangle.offsets[looper], offset]);
                        triangle.offsets[looper] = offset;
                    }
                }
            }
        }
    }

    group.printable = triangles;

    return group;

};

App.prototype.getNextFrameTopLeft = function (from, size) {

    let coast = 30;

    let diagram = this.filler.query("#diagram");

    let { scrollLeft, scrollTop, viewportLeft, viewportTop } = diagram[0];
    let { width, height } = diagram.css(["width", "height"]);
    width = parseFloat(width);
    height = parseFloat(height);

    let mins = [viewportLeft + scrollLeft, viewportTop + scrollTop];
    let maxes = [mins[0] + width, mins[1] + height];

    let children = diagram.children();
    if (children.length === 0) {
        return {
            "left": mins[0] + coast,
            "top": mins[1] + coast + 40
        };
    }

    let frames = [];
    for (let looper = 0; looper < children.length; ++looper) {
        let node = children[looper];
        let zIndex = $(node).css("z-index");
        frames.push({
            "node": node,
            "index": looper,
            "z-index": zIndex
        });
    }
    frames.sort((a, b) => {
        if (a["z-index"] && b["z-index"]) {
            let result = parseInt(a["z-index"]) - parseInt(b["z-index"]);
            if (result) {
                return result;
            }
        }
        return a.index - b.index;
    });

    let topmost = $(frames[frames.length - 1].node);

    let frame = topmost.css(["left", "top", "width", "height"]);

    let suggested = {
        "left": parseFloat(frame.left) + parseFloat(frame.width) + 40,
        "top": parseFloat(frame.top),
    };

    return suggested;

};

App.prototype.convertModelData = function (triangles) {

    let positions = new Float32Array(triangles.length * 3 * 3);
    let normals = new Float32Array(triangles.length * 3 * 3);
    let offsets = new Float32Array(triangles.length * 3 * 3);
    let indices = new Uint32Array(triangles.length * 3);

    for (let looper = 0; looper < triangles.length; ++looper) {
        positions[looper * 3 * 3 + 0] = triangles[looper].vertices[0][0];
        positions[looper * 3 * 3 + 1] = triangles[looper].vertices[0][1];
        positions[looper * 3 * 3 + 2] = triangles[looper].vertices[0][2];
        positions[looper * 3 * 3 + 3] = triangles[looper].vertices[1][0];
        positions[looper * 3 * 3 + 4] = triangles[looper].vertices[1][1];
        positions[looper * 3 * 3 + 5] = triangles[looper].vertices[1][2];
        positions[looper * 3 * 3 + 6] = triangles[looper].vertices[2][0];
        positions[looper * 3 * 3 + 7] = triangles[looper].vertices[2][1];
        positions[looper * 3 * 3 + 8] = triangles[looper].vertices[2][2];
        normals[looper * 3 * 3 + 0] = triangles[looper].normal[0];
        normals[looper * 3 * 3 + 1] = triangles[looper].normal[1];
        normals[looper * 3 * 3 + 2] = triangles[looper].normal[2];
        normals[looper * 3 * 3 + 3] = triangles[looper].normal[0];
        normals[looper * 3 * 3 + 4] = triangles[looper].normal[1];
        normals[looper * 3 * 3 + 5] = triangles[looper].normal[2];
        normals[looper * 3 * 3 + 6] = triangles[looper].normal[0];
        normals[looper * 3 * 3 + 7] = triangles[looper].normal[1];
        normals[looper * 3 * 3 + 8] = triangles[looper].normal[2];
        if (triangles[looper].offsets) {
            offsets[looper * 3 * 3 + 0] = triangles[looper].offsets[0][0];
            offsets[looper * 3 * 3 + 1] = triangles[looper].offsets[0][1];
            offsets[looper * 3 * 3 + 2] = triangles[looper].offsets[0][2];
            offsets[looper * 3 * 3 + 3] = triangles[looper].offsets[1][0];
            offsets[looper * 3 * 3 + 4] = triangles[looper].offsets[1][1];
            offsets[looper * 3 * 3 + 5] = triangles[looper].offsets[1][2];
            offsets[looper * 3 * 3 + 6] = triangles[looper].offsets[2][0];
            offsets[looper * 3 * 3 + 7] = triangles[looper].offsets[2][1];
            offsets[looper * 3 * 3 + 8] = triangles[looper].offsets[2][2];
        }
    }

    for (let looper = 0; looper < triangles.length * 3; ++looper) {
        indices[looper] = looper;
    }

    return {
        "positions": positions,
        "normals": normals,
        "offsets": offsets,
        "indices": indices
    };

};

App.prototype.loadModel = function (from) {

    this.openModel((model) => {

        if (!model) { return; }

        model = this.groupTriangles(model);

        let size = {
            "width": 240,
            "height": 240
        };
        let position = this.getNextFrameTopLeft(from, size);

        let id = $.uuid(); 
        let frame = $("<ui-diagram-frame>").attr({
            "caption": id,
            "resizable": "yes",
            "wire-id": id
        }).css({
            "left": position.left + "px",
            "top": position.top + "px",
            "width": size.width + "px",
            "height": size.height + "px",
        });

        const width = 110.016;
        const depth = 61.885;
        const height = 125;

        frame[0].loadUI("/~hanxue/frames/print-preview/print-preview", {
            "device": {
                "width": width,
                "depth": depth,
                "height": height
            }
        });

        let scale = Math.min(
            width / (model.bounds.maxes[0] - model.bounds.mins[0]),
            height / (model.bounds.maxes[1] - model.bounds.mins[1]),
            depth / (model.bounds.maxes[2] - model.bounds.mins[2]),
        ) * 0.8;

        let translation =  [-model.bounds.mins[0], -model.bounds.mins[1], -model.bounds.mins[2]];

        let placement = [(width - scale * (model.bounds.maxes[0] - model.bounds.mins[0])) * 0.5, 
                         0, 
                         (depth - scale * (model.bounds.maxes[2] - model.bounds.mins[2])) * 0.5];

        frame[0].frame.filler.fill({
            "camera": {
                "position": [width / 2, (model.bounds.maxes[1] - model.bounds.mins[1]) / 2, depth * 4],
                "target": [width / 2, (model.bounds.maxes[1] - model.bounds.mins[1]) / 2, depth / 2],
            },
            "model": {
                "bounds": model.bounds,
                "translation": translation,
                "scale": scale,
                "rotation": ["X", 0],
                "placement": {
                    "scale": 1,
                    "translation": placement
                },
                "groups": model.groups.map((group) => {
                    let triangles = group.printable;
                    if (!triangles) {
                        triangles = group.triangles.slice(0).concat(group.patcheds);
                    }
                    return this.convertModelData(triangles);
                })
            }
        });

        this.filler.query("#diagram").append(frame);

        frame[0].bringToFirst();

    });

};

App.prototype.title = "Hanxue - 3D Printer Helper";

App.functors = {
    "loadModel": function (from) {
        this.loadModel(from);
    }
};

module.exports.App = App;

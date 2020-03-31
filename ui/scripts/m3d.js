const { Vector3 } = require("./m3d/vector3.js");

let vector31 = new Vector3();
let vector32 = new Vector3();

const getTriangleNormal = function (v1, v2, v3) {

    vector31.set(v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]);
    vector32.set(v1[0] - v3[0], v1[1] - v3[1], v1[2] - v3[2]);
    vector31.cross(vector32);
    vector31.normalize();

    return [vector31.x, vector31.y, vector31.z];

};

const sortTriangleVertices = function (triangle) {

    if (!triangle.sortedVertices) {
        triangle.sortedVertices = triangle.vertices.slice(0).sort((a, b) => {
            if (a[0] < b[0]) { return -1;
            } else if (a[0] > b[0]) { return 1; }
            if (a[1] < b[1]) { return -1; 
            } else if (a[1] > b[1]) { return 1; }
            if (a[2] < b[2]) { return -1;
            } else if (a[2] > b[2]) { return 1; }
            return 0;
        });
    }

    return triangle.sortedVertices;

};

const distanceSquare = function (a, b) { 

    return (a[0] - b[0]) * (a[0] - b[0]) + 
           (a[1] - b[1]) * (a[1] - b[1]) + 
           (a[2] - b[2]) * (a[2] - b[2]);

};

const normalizeVector = function (v1, v2, v3) {

    let l = Math.sqrt(v1 * v1 + v2 * v2 + v3 * v3);

    return [v1 / l, v2 / l, v3 / l];

};

const getVertexIDs = function (vertices) {
    return vertices.map((vertex) => {
        return vertex.map((x) => {
            return x.toPrecision(5);
        }).join(",");
    });
};

const abstractModel = function (triangles) {

    let parseds = [];

    let mins = [Infinity, Infinity, Infinity];
    let maxes = [-Infinity, -Infinity, -Infinity];

    for (let triangle of triangles) {

        let vertexIDs = getVertexIDs(triangle.vertices);

        parseds.push({
            "bothSides": triangle["bothSides"] ? true : false,
            "normal": triangle.normal,
            "vertices": triangle.vertices.slice(0),
            "vertexIDs": vertexIDs,
            "id": vertexIDs.slice(0).sort().join(":")
        });

        for (let looper = 0; looper < 3; ++looper) {
            let min = Math.min(triangle.vertices[0][looper], 
                               triangle.vertices[1][looper], 
                               triangle.vertices[2][looper]);
            let max = Math.min(triangle.vertices[0][looper], 
                               triangle.vertices[1][looper], 
                               triangle.vertices[2][looper]);
            if (mins[looper] > min) { mins[looper] = min; }
            if (maxes[looper] < max) { maxes[looper] = max; }
        }

    };

    return {
        "triangles": parseds,
        "bounds": {
            "mins": mins,
            "maxes": maxes
        }
    };

};

const reduceBothSides = function (model) {

    let regionSize = Math.max(
        model.bounds.maxes[0] - model.bounds.mins[0],
        model.bounds.maxes[1] - model.bounds.mins[1],
        model.bounds.maxes[2] - model.bounds.mins[2]) / 1000;

    let regions = Object.create(null);

    const findTriangleID = (triangle) => {

        let vertices = sortTriangleVertices(triangle);

        let froms = [
            [ Math.floor(vertices[0][0] / regionSize),
              Math.floor(vertices[0][1] / regionSize), 
              Math.floor(vertices[0][2] / regionSize)],
            [ Math.floor(vertices[1][0] / regionSize),
              Math.floor(vertices[1][1] / regionSize), 
              Math.floor(vertices[1][2] / regionSize)],
            [ Math.floor(vertices[2][0] / regionSize),
              Math.floor(vertices[2][1] / regionSize), 
              Math.floor(vertices[2][2] / regionSize)]
        ];

        let matches = Object.create(null);
        for (let looper = 0; looper < 3; ++looper) {
            let id = `${froms[looper][0]},${froms[looper][1]},${froms[looper][2]}`;
            if (regions[id]) {
                Object.assign(matches, regions[id]);
            }
        }
        if (matches[triangle.id]) {
            return triangle.id;
        }

        for (let id in matches) {
            let targetVertices = sortTriangleVertices(matches[id]);
            let distance = (distanceSquare(vertices[0], targetVertices[0]) +
                            distanceSquare(vertices[1], targetVertices[1]) +
                            distanceSquare(vertices[2], targetVertices[2]));
            if (distance < 3 * regionSize * regionSize / 160000) {
                return id;
            }
        }

    };

    const recordTriangle = (x, y, z, triangle) => {
        let id = `${x},${y},${z}`;
        if (!regions[id]) {
            regions[id] = Object.create(null);
        }
        regions[id][triangle.id] = triangle;
    };

    const getTriangleID = (triangle) => {

        let found = findTriangleID(triangle);
        if (found) { return found; }

        let vertices = sortTriangleVertices(triangle);

        let froms = [
            [ Math.floor(vertices[0][0] / regionSize),
              Math.floor(vertices[0][1] / regionSize), 
              Math.floor(vertices[0][2] / regionSize)],
            [ Math.floor(vertices[1][0] / regionSize),
              Math.floor(vertices[1][1] / regionSize), 
              Math.floor(vertices[1][2] / regionSize)],
            [ Math.floor(vertices[2][0] / regionSize),
              Math.floor(vertices[2][1] / regionSize), 
              Math.floor(vertices[2][2] / regionSize)]
        ];

        for (let x = -1; x <= 1; ++x) {
            for (let y = -1; y <= 1; ++y) {
                for (let z = -1; z <= 1; ++z) {
                    recordTriangle(froms[0][0] + x, froms[0][1] + y, froms[0][2] + z, triangle);
                    recordTriangle(froms[1][0] + x, froms[1][1] + y, froms[1][2] + z, triangle);
                    recordTriangle(froms[2][0] + x, froms[2][1] + y, froms[2][2] + z, triangle);
                }
            }
        }

        return triangle.id;

    };

    let ids = Object.create(null);
    model.triangles.forEach((triangle, index) => {
        let id = getTriangleID(triangle);
        if (!ids[id]) { ids[id] = []; }
        ids[id].push({ "triangle": triangle, "index": index });
    });

    const flipBothSidesTriangleIfNeeded = (triangle) => {
        let reverse = false;
        if (triangle.normal[0] < 0) {
            reverse = true;
        } else if (triangle.normal[0] === 0) {
            if (triangle.normal[1] < 0) {
                reverse = true;
            } else if (triangle.normal[1] === 0) {
                reverse = triangle.normal[2] < 0;
            }
        }
        if (reverse) {
            return Object.assign({}, triangle, {
                "normal": [ -triangle.normal[0], -triangle.normal[1], -triangle.normal[2] ],
                "vertices": triangle.vertices.slice(0).reverse(),
                "vertexIDs": triangle.vertexIDs.slice(0).reverse(),
                "bothSides": true
            });
        } else {
            return Object.assign({}, triangle, {
                "bothSides": true
            });
        }
    };

    let triangles = [];
    for (let id in ids) {
        if (ids[id].length > 1) {
            let faces = ids[id].filter((record) => !record["bothSides"]);
            let boths = ids[id].length - faces.length;
            let sames = 0; let inverts = 0;
            if (faces.length > 1) {
                sames = 1;
                for (let looper = 1; looper < faces.length; ++looper) {
                    let record = faces[looper];
                    if (record.triangle.normal[0] * faces[0].triangle.normal[0] + 
                        record.triangle.normal[1] * faces[0].triangle.normal[1] +
                        record.triangle.normal[2] * faces[0].triangle.normal[2] > 0) {
                        ++sames;
                    } else {
                        ++inverts;
                    }
                }
                let newBoths = inverts < sames ? inverts : sames;
                if (newBoths > 0) {
                    boths += newBoths;
                    sames -= newBoths;
                    inverts -= newBoths;
                    let newFaces = [];
                    if (boths > 0) {
                        let triangle = flipBothSidesTriangleIfNeeded(faces[0].triangle);
                        for (let looper = 0; looper < boths; ++looper) {
                            newFaces.push({
                                "triangle": triangle,
                                "index": faces[0].index
                            });
                        }
                    }
                    for (let looper = 0; looper < sames; ++looper) {
                        newFaces.push({
                            "triangle": Object.assign({}, faces[0].triangle, {
                                "bothSides": false
                            }),
                            "index": faces[0].index
                        });
                    }
                    for (let looper = 0; looper < inverts; ++looper) {
                        newFaces.push({
                            "triangle": Object.assign({}, faces[0].triangle, {
                                "bothSides": false,
                                "vertices": faces[0].triangle.vertices.slice(0).reverse(),
                                "vertexIDs": faces[0].triangle.vertexIDs.slice(0).reverse(),
                                "normal": [
                                    -faces[0].triangle.normal[0],
                                    -faces[0].triangle.normal[1],
                                    -faces[0].triangle.normal[2]
                                ]
                            }),
                            "index": faces[0].index
                        });
                    }
                    ids[id] = newFaces;
                }
            }
        } else {
            if (ids[id][0].triangle["bothSides"]) {
                ids[id][0].triangle = flipBothSidesTriangleIfNeeded(ids[id][0].triangle);
            }
        }
        for (let triangle of ids[id]) {
            triangles.push(triangle);
        }
    }

    return {
        "triangles": triangles.sort((a, b) => a.index - b.index).map((record) => {
            return record.triangle
        }),
        "bounds": model.bounds
    };

};

const groupTriangles = function (model) {

    let groups = [];

    const makeGroup = (triangles) => {

        let indices = Object.create(null);
        for (let looper = 0; looper < triangles.length; ++looper) {
            let triangle = triangles[looper];
            for (let looper2 = 0; looper2 < 3; ++looper2) {
                if (!indices[triangle.vertexIDs[looper2]]) {
                    indices[triangle.vertexIDs[looper2]] = [];
                } 
                indices[triangle.vertexIDs[looper2]].push(looper);
            }
        }

        let grouped = Object.create(null);

        let parsed = Object.create(null);
        for (let vertexID of triangles[0].vertexIDs) {
            parsed[vertexID] = true;
        }

        let queue = triangles[0].vertexIDs.slice(0);

        while (queue.length > 0) {
            let id = queue.pop();
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

        let bothSidesCounts = 0;
        let groupedTriangles = [];
        for (let index in grouped) {
            groupedTriangles.push(triangles[index]);
            if (triangles[index]["bothSides"]) {
                ++bothSidesCounts;
            }
        }

        groups.push({
            "bothSides": (bothSidesCounts / groupedTriangles.length) > 0.5,
            "bothSidesRatio": (bothSidesCounts / groupedTriangles.length),
            "triangles": groupedTriangles
        });

        let rests = [];
        for (let looper = 0; looper < triangles.length; ++looper) {
            if (!grouped[looper]) {
                rests.push(triangles[looper]);
            }
        }

        return rests;

    };

    let rests = model.triangles;
    while (rests.length > 0) {
        rests = makeGroup(rests);
    }

    return groups;

};

const autocloseGroup = function (group) {

    let edges = Object.create(null);
    let points = Object.create(null);

    const recordEdge = (v1, v1ID, v2, v2ID) => {
        if (!points[v1ID]) { points[v1ID] = v1; }
        if (!points[v2ID]) { points[v2ID] = v2; }
        if (v1ID == v2ID) { return; }
        let vs = [v1ID, v2ID].sort();
        let id = "[" + vs.join("] > [") + "]";
        if (!edges[id]) {
            edges[id] = { 
                "from": vs[0] == v1ID ? v1 : v2,
                "fromID": vs[0],
                "to": vs[0] == v1ID ? v2 : v1,
                "toID": vs[1],
                "forwards": 0,
                "backwards": 0
            };
        }
        if (vs[0] === v1ID) {
            ++edges[id].forwards;
        } else {
            ++edges[id].backwards;
        }
    };

    for (let triangle of group.triangles) {
        if (!triangle["bothSides"]) {
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
    for (let id in edges) {
        if (edges[id].forwards !== edges[id].backwards) {
            notCloseds.edges[id] = Object.assign({}, edges[id]);
            if (edges[id].forwards < edges[id].backwards) {
                if (!notCloseds.points[edges[id].fromID]) {
                    notCloseds.points[edges[id].fromID] = {
                        "point": edges[id].from,
                        "edges": []
                    };
                }
                notCloseds.points[edges[id].fromID].edges.push(id);
            } else {
                if (!notCloseds.points[edges[id].toID]) {
                    notCloseds.points[edges[id].toID] = {
                        "point": edges[id].to,
                        "edges": []
                    };
                }
                notCloseds.points[edges[id].toID].edges.push(id);
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

    })();

    let triangles = [];
    for (let route of routes) {
        let distances = Object.create(null);
        for (let looper = 0; looper < route.length; ++looper) {
            for (let looper2 = looper + 1; looper2 < route.length; ++looper2) {
                let id = [route[looper], route[looper2]].sort().join(":");
                let p1 = points[route[looper]];
                let p2 = points[route[looper2]];
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

    let v1 = new Vector3();
    let v2 = new Vector3();

    return Object.assign({}, group, {
        "encloses": triangles.map((ids) => {
            let vertices = ids.map((id) => points[id]);
            return {
                "bothSides": false,
                "vertexIDs": ids,
                "normal": getTriangleNormal(vertices[0], vertices[1], vertices[2]),
                "vertices": vertices
            };
        })
    });

};

const makeTrianglesPrintable = function (source, all) {

    let triangles = [];

    let vertices = Object.create(null);
    let edges = Object.create(null);

    let convert = (triangle, vertex, id, factor) => {
        let normal = triangle.normal;
        normal = normalizeVector(normal[0], normal[1], normal[2]);
        let datum = {
            "id": id,
            "vertex": vertex,
            "factor": factor,
            "normal": normal,
            "offset": [ normal[0] * factor, normal[1] * factor, normal[2] * factor ]
        };
        if (factor !== 0) {
            if (!vertices[id]) {
                vertices[id] = Object.create(null);
            }
            if (!vertices[id][factor]) {
                vertices[id][factor] = {
                    "data": []
                };
            }
            vertices[id][factor].data.push(datum);
        }
        return datum;
    };

    let record = (v1, v2, v3) => {
        let nv1 = [ v1.vertex[0] + v1.offset[0], v1.vertex[1] + v1.offset[1], v1.vertex[2] + v1.offset[2] ];
        let nv2 = [ v2.vertex[0] + v2.offset[0], v2.vertex[1] + v2.offset[1], v2.vertex[2] + v2.offset[2] ];
        let nv3 = [ v3.vertex[0] + v3.offset[0], v3.vertex[1] + v3.offset[1], v3.vertex[2] + v3.offset[2] ];
        let normal = getTriangleNormal(nv1, nv2, nv3);
        triangles.push({
            "vertexIDs": [v1.id, v2.id, v3.id],
            "vertices": [v1.vertex, v2.vertex, v3.vertex],
            "offsets": [v1.offset, v2.offset, v3.offset],
            "factors": [v1.factor, v2.factor, v3.factor],
            "normal": normal
        });
    };

    for (let triangle of source) {
        let suffix = null;
        if (triangle["bothSides"]) {
            suffix = "x";
        } else if (all) {
            suffix = "y";
        }
        if (suffix) {
            edges[`${triangle.vertexIDs[0]}:${triangle.vertexIDs[1]}:${suffix}`] = true;
            edges[`${triangle.vertexIDs[1]}:${triangle.vertexIDs[2]}:${suffix}`] = true;
            edges[`${triangle.vertexIDs[2]}:${triangle.vertexIDs[0]}:${suffix}`] = true;
        }
    }

    for (let triangle of source) {
        let t1 = undefined; let t2 = undefined;
        let suffix = null;
        if (triangle["bothSides"]) {
            suffix = "x";
            t1 = [convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], 0.5), 
                  convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], 0.5), 
                  convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], 0.5)];
            t2 = [convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], -0.5), 
                  convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], -0.5), 
                  convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], -0.5)];
        } else if (all) {
            suffix = "y";
            t1 = [convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], 0), 
                  convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], 0), 
                  convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], 0)];
            t2 = [convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], -1), 
                  convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], -1), 
                  convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], -1)];
        }
        if (t1 && t2) {
            if (suffix === "y") {
                record(t1[0], t1[1], t1[2]);
            }
            record(t1[0], t1[1], t1[2]);
            record(t2[0], t2[1], t2[2]);
            if ((!edges[`${triangle.vertexIDs[1]}:${triangle.vertexIDs[2]}:${suffix}`]) || 
                (!edges[`${triangle.vertexIDs[2]}:${triangle.vertexIDs[1]}:${suffix}`])) {
                record(t2[0], t1[2], t1[1]); // t2[2], t1[2], t1[1]
                record(t2[0], t1[1], t2[1]); // t2[2], t1[1], t2[1]
            }
            if ((!edges[`${triangle.vertexIDs[1]}:${triangle.vertexIDs[0]}:${suffix}`]) || 
                (!edges[`${triangle.vertexIDs[0]}:${triangle.vertexIDs[1]}:${suffix}`])) {
                record(t2[1], t1[1], t1[0]); // t2[1], t1[1], t1[0]
                record(t2[1], t1[0], t2[2]); // t2[1], t1[0], t2[0]
            }
            if ((!edges[`${triangle.vertexIDs[2]}:${triangle.vertexIDs[0]}:${suffix}`]) || 
                (!edges[`${triangle.vertexIDs[0]}:${triangle.vertexIDs[2]}:${suffix}`])) {
                record(t2[2], t1[0], t1[2]); // t2[0], t1[0], t1[2]
                record(t2[2], t1[2], t2[0]); // t2[0], t1[2], t2[2]
            }
        } else {
            record(convert(triangle, triangle.vertices[0], triangle.vertexIDs[0], 0), 
                   convert(triangle, triangle.vertices[1], triangle.vertexIDs[1], 0), 
                   convert(triangle, triangle.vertices[2], triangle.vertexIDs[2], 0));
        }
    }

    for (let id in vertices) {
        for (let offset in vertices[id]) {
            let forwardCount = 0; let forwards = [0, 0, 0];
            let backwardCount = 0; let backwards = [0, 0, 0];
            for (let datum of vertices[id][offset].data) {
                if (datum.offset[0] * vertices[id][offset].data[0].offset[0] +
                    datum.offset[1] * vertices[id][offset].data[0].offset[1] +
                    datum.offset[2] * vertices[id][offset].data[0].offset[2] > 0) {
                    ++forwardCount;
                    forwards[0] += datum.offset[0]; 
                    forwards[1] += datum.offset[1]; 
                    forwards[2] += datum.offset[2];
                } else {
                    ++backwardCount;
                    backwards[0] += datum.offset[0]; 
                    backwards[1] += datum.offset[1]; 
                    backwards[2] += datum.offset[2];
                }
            }
            if (forwardCount) {
                forwards[0] /= forwardCount; 
                forwards[1] /= forwardCount; 
                forwards[2] /= forwardCount;
            }
            if (backwardCount) {
                backwards[0] /= backwardCount; 
                backwards[1] /= backwardCount; 
                backwards[2] /= backwardCount;
            }
            vertices[id][offset].forwards = forwards;
            vertices[id][offset].backwards = backwards;
            vertices[id][offset].offset = vertices[id][offset].data[0].offset;
        }
    }

    for (let triangle of triangles) {
        if (triangle.factors && triangle.offsets) {
            for (let looper = 0; looper < 3; ++looper) {
                if (vertices[triangle.vertexIDs[looper]]) {
                    let data = vertices[triangle.vertexIDs[looper]][triangle.factors[looper]];
                    if (data) {
                        let offset = data.forwards;
                        if (data.offset[0] * triangle.offsets[looper][0] + 
                            data.offset[1] * triangle.offsets[looper][1] + 
                            data.offset[2] * triangle.offsets[looper][2] < 0) {
                            offset = data.backwards;
                        }
                        triangle.offsets[looper] = offset;
                    }
                }
            }
        }
    }

    return triangles;

};

const convertTrianglesForTessell = function (triangles) {

    let result = [];

    for (let triangle of triangles) {
        result.push([
            { "vertex": triangle.vertices[0] },
            { "vertex": triangle.vertices[1] },
            { "vertex": triangle.vertices[2] },
            triangle["bothSides"] ? true : false
        ]);
    }

    return updateTessellNormals(result);

};

const updateTessellNormals = function (triangles) {

    let normals = Object.create(null);

    const recordNormal = (point, normal) => {
        let id = point.id;
        if (!id) {
            point.id = point.vertex.join(",");
            id = point.id;
        }
        if (!normals[id]) { normals[id] = { "records": [] }; }
        normals[id].records.push(normal);
    };

    for (let triangle of triangles) {
        let normal = getTriangleNormal(triangle[0].vertex, 
                                       triangle[1].vertex, 
                                       triangle[2].vertex);
        recordNormal(triangle[0], normal);
        recordNormal(triangle[1], normal);
        recordNormal(triangle[2], normal);
    }

    for (let id in normals) {
        let sum = [0, 0, 0];
        for (let normal of normals[id].records) {
            sum[0] += normal[0]; sum[1] += normal[1]; sum[2] += normal[2];
        }
        let length = normals[id].records.length;
        if (length > 0) {
            sum[0] /= length; sum[1] /= length; sum[2] /= length;
        }
        normals[id].normal = sum;
    }

    for (let triangle of triangles) {
        for (let looper = 0; looper < 3; ++looper) {
            triangle[looper].normal = normals[triangle[looper].id].normal;
        }
    }

    return triangles;

};

const convertTrianglesFromTessell = function (triangles) {

    let result = [];

    updateTessellNormals(triangles);

    for (let triangle of triangles) {
        let vertices = [
            triangle[0].vertex,
            triangle[1].vertex,
            triangle[2].vertex
        ];
        result.push({
            "vertexIDs": getVertexIDs(vertices),
            "bothSides": triangle[3] ? true : false,
            "vertices": vertices,
            "normals": [
                triangle[0].normal,
                triangle[1].normal,
                triangle[2].normal
            ],
            "normal": getTriangleNormal(triangle[0].vertex, 
                                        triangle[1].vertex, 
                                        triangle[2].vertex)
        });
    }

    return result;

};

const tessellTriangles = function (triangles, level, maxArea) {

    let vector31 = new Vector3();
    let vector32 = new Vector3();

    let side = (a, b) => {
        let v = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
        return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    };

    let calc = (p, n, v, factor) => {
        vector31.set(n[0], n[1], n[2]);
        vector32.set(v[0], v[1], v[2]);
        vector32.cross(vector31);
        vector32.cross(vector31);
        vector32.normalize();
        return [p[0] + vector32.x * factor, 
                p[1] + vector32.y * factor, 
                p[2] + vector32.z * factor];
    };

    let bezier = (t, p0, p1, p2, p3) => {
        return (p0 * (1 - t) * (1 - t) * (1 - t) + 
                3 * p1 * t * (1 - t) * (1 - t) + 
                3 * p2 * t * t * (1 - t) + 
                p3 * t * t * t);
    };

    let mid = (a, b, area, sideRatio, maxSide, mids) => {

        let v = [a.vertex[0] - b.vertex[0], 
                 a.vertex[1] - b.vertex[1], 
                 a.vertex[2] - b.vertex[2]];
        let l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

        let c = 0.33;
        let plain = (area > maxArea);
        if ((!plain) && (sideRatio < 0.3)) {
            plain = l * 2 > maxSide;
        }

        let edge = 0.6;
        let n = a.normal.slice(0);
        let nl = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
        if (plain || (n[0] * v[0] + n[1] * v[1] + n[2] * v[2] > edge * l * nl)) {
            vector31.set(n[0], n[1], n[2]);
            vector32.set(v[0], v[1], v[2]);
            vector31.cross(vector32);
            vector31.cross(vector32);
            n = [vector31.x, vector31.y, vector31.z];
        }
        let c1 = calc(a.vertex, n, v, l * c);

        n = b.normal.slice(0);
        nl = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
        if (plain || (n[0] * v[0] + n[1] * v[1] + n[2] * v[2] < -edge * l * nl)) {
            vector31.set(n[0], n[1], n[2]);
            vector32.set(v[0], v[1], v[2]);
            vector31.cross(vector32);
            vector31.cross(vector32);
            n = [vector31.x, vector31.y, vector31.z];
        }
        let c2 = calc(b.vertex, n, v, l * c * (-1));

        let vertex = [
            bezier(0.5, a.vertex[0], c1[0], c2[0], b.vertex[0]),
            bezier(0.5, a.vertex[1], c1[1], c2[1], b.vertex[1]),
            bezier(0.5, a.vertex[2], c1[2], c2[2], b.vertex[2])
        ];

        let id = [a.vertex, b.vertex].sort((a, b) => {
            let diff = [a[0] - b[0], a[1] - b[1], a[2] - b[2]].filter((x) => x !== 0);
            return diff[0] ? diff[0] : 0;
        }).map(x => x.join(",")).join("-");
        if (!mids[id]) {
            mids[id] = {
                "records": []
            };
        }

        mids[id].records.push({ vertex });

        return { 
            "id": id,
            "vertex": vertex
        };

    };

    let tessell = (triangles) => {

        let mids = {};

        let tesselled = [];
        for (let triangle of triangles) {
            let sideA = side(triangle[0].vertex, triangle[1].vertex);
            let sideB = side(triangle[1].vertex, triangle[2].vertex);
            let sideC = side(triangle[2].vertex, triangle[0].vertex);
            let maxSide = Math.max(sideA, sideB, sideC);
            let sideRatio = Math.min(sideA, sideB, sideC) / Math.max(sideA, sideB, sideC);
            let areaP = (sideA + sideB + sideC) / 2;
            let area = Math.sqrt(areaP * (areaP - sideA) * (areaP - sideB) * (areaP - sideC));
            let m1 = mid(triangle[0], triangle[1], area, sideRatio, maxSide, mids);
            let m2 = mid(triangle[1], triangle[2], area, sideRatio, maxSide, mids);
            let m3 = mid(triangle[2], triangle[0], area, sideRatio, maxSide, mids);
            tesselled.push([triangle[0], m1, m3, triangle[3] ? true : false]);
            tesselled.push([m1, triangle[1], m2, triangle[3] ? true : false]);
            tesselled.push([m3, m2, triangle[2], triangle[3] ? true : false]);
            tesselled.push([m1, m2, m3, triangle[3] ? true : false]);
        }

        for (let id in mids) {
            let sump = [0, 0, 0];
            let records = mids[id].records;
            for (let mid of records) {
                sump[0] += mid.vertex[0]; sump[1] += mid.vertex[1]; sump[2] += mid.vertex[2];
            }
            mids[id].vertex = [sump[0] / records.length, sump[1] / records.length, sump[2] / records.length];
        }

        for (let triangle of tesselled) {
            for (let looper = 0; looper < 3; ++looper) {
                let id = triangle[looper].id;
                if (id && mids[id]) {
                    triangle[looper].vertex = mids[id].vertex;
                    // triangle[looper].normal = mids[id].normal;
                }
            }
        }

        updateTessellNormals(tesselled);

        return tesselled;

    };

    while (level) {
        triangles = tessell(triangles);
        --level;
    }

    return triangles;

};

module.exports.abstractModel = abstractModel;
module.exports.reduceBothSides = reduceBothSides;
module.exports.groupTriangles = groupTriangles;
module.exports.autocloseGroup = autocloseGroup;
module.exports.makeTrianglesPrintable = makeTrianglesPrintable;
module.exports.tessellTriangles = tessellTriangles;

module.exports.convertTrianglesFromTessell = convertTrianglesFromTessell;
module.exports.convertTrianglesForTessell = convertTrianglesForTessell;

module.exports.getTriangleNormal = getTriangleNormal;
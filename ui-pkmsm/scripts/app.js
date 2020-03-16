const THREE = require("/scripts/three.js");

$.dom.registerTagTemplate("pkmsm", "~pkmsm/tags/${tag}/${tag}");
$.dom.registerTagTemplate("pkm", "~pkmsm/tags/${tag}/${tag}");

$.dom.autoregisterTag("m3d-object");
$.dom.autoregisterTag("m3d-skeleton");
$.dom.autoregisterTag("m3d-bone");
$.dom.autoregisterTag("m3d-mesh");
$.dom.autoregisterTag("m3d-texture");
$.dom.autoregisterTag("m3d-material");
$.dom.autoregisterTag("m3d-uniform");
$.dom.autoregisterTag("m3d-clip");
$.dom.autoregisterTag("m3d-track");

const adjustSceneForIcon = function (id, mins, maxes) {

    // we need adjust the model to make it render in the window correctly
    let scale = 1;
    let translation = [0, 0, 0];

    let minSize = Math.min(maxes[0] - mins[0],
                           maxes[1] - mins[1],
                           maxes[2] - mins[2]);
    let maxSize = Math.max(maxes[0] - mins[0],
                           maxes[1] - mins[1],
                           maxes[2] - mins[2]);
    scale = (0.6 + 0.4 * Math.min(Math.pow(maxSize / 300, 2.5), 1.0)) / (maxSize / 300) * 0.27;
    let pokemon = id.split("-")[1];
    let model = id.split("-")[2];
    translation = [
        (-(mins[0] + maxes[0]) / 2),
        0,
        (-(mins[2] + maxes[2]) * 0.3)
    ];

    scale *= 0.9;

    {

        if (pokemon === "001") {
            scale *= 0.9;
        } else if (pokemon === "002") {
            scale *= 1.2;
        } else if (pokemon === "003") {
            if (model === "2") {
                scale *= 1.2;
            } else {
                scale *= 0.95;
            }
        } else if (pokemon === "005") {
            scale *= 1.1;
        } else if ((pokemon === "006") && (model === "0")) {
            scale *= 1.1;
            translation[1] += -100 * scale;
        } else if ((pokemon === "006") && (model === "1")) {
            scale *= 1.2;
            translation[1] += -240 * scale;
            translation[0] += 100 * scale;
        } else if ((pokemon === "006") && (model === "2")) {
            scale *= 1.1;
            translation[1] += -240 * scale;
        } else if (pokemon === "007") {
            scale *= 0.85;
        } else if (pokemon === "009") {
            scale *= 1.1;
        } else if (pokemon === "010") {
            scale *= 0.9;
            translation[1] += -3 * scale;
        } else if (pokemon === "012") {
            scale *= 1.4;
            translation[1] += -40 * scale;
        } else if (pokemon === "013") {
            translation[1] += -3 * scale;
        } else if (pokemon === "014") {
            scale *= 0.8;
        } else if (pokemon === "015") {
            scale *= 1.4;
            translation[1] += -80 * scale;
        } else if (pokemon === "016") {
            scale *= 0.9;
        } else if (pokemon === "017") {
            scale *= 1.2;
        } else if (pokemon === "018") {
            scale *= 1.2;
            translation[1] += -180 * scale;
        } else if (pokemon === "020") {
            if (model === "2") {
                scale *= 1.2;
            } else {
                scale *= 1.4;
            }
        } else if (pokemon === "022") {
            scale *= 1.4;
            translation[1] += -120 * scale;
            translation[2] += 20 * scale;
        } else if (pokemon === "023") {
            scale *= 0.9;
        } else if (pokemon === "024") {
            scale *= 1.2;
        } else if (pokemon === "025") {
            scale *= 0.85;
        } else if (pokemon === "026") {
            scale *= 1.4;
            if (model === "2") {
                translation[1] += -30 * scale;
            }
        } else if (pokemon === "029") {
            scale *= 0.8;
        } else if (pokemon === "031") {
            scale *= 1.3;
        } else if (pokemon === "032") {
            scale *= 0.8;
        } else if (pokemon === "034") {
            scale *= 1.3;
        } else if (pokemon === "035") {
            scale *= 0.8;
        } else if (pokemon === "036") {
            scale *= 1.1;
        } else if (pokemon === "038") {
            if (model === "0") {
                scale *= 1.4;
            } else {
                scale *= 1.55;
                translation[2] += 20 * scale;
            }
        } else if (pokemon === "039") {
            scale *= 0.8;
        } else if (pokemon === "040") {
            scale *= 1.3;
        } else if (pokemon === "042") {
            translation[2] -= 40 * scale;
        } else if (pokemon === "043") {
            scale *= 0.8;
        } else if (pokemon === "044") {
            scale *= 0.7;
        } else if (pokemon === "045") {
            scale *= 1.1;
        } else if (pokemon === "046") {
            scale *= 0.8;
        } else if (pokemon === "047") {
            scale *= 1.2;
        } else if (pokemon === "048") {
            scale *= 0.8;
        } else if (pokemon === "049") {
            scale *= 1.1;
        } else if (pokemon === "050") {
            scale *= 0.7;
            translation[1] += 2 * scale;
        } else if (pokemon === "051") {
            if (model === "1") {
                scale *= 1.2;
            }
            translation[1] += 20 * scale;
        } else if (pokemon === "052") {
            scale *= 0.7;
        } else if (pokemon === "053") {
            scale *= 1.4;
        } else if (pokemon === "054") {
            scale *= 0.8;
        } else if (pokemon === "055") {
            scale *= 1.2;
        } else if (pokemon === "057") {
            scale *= 1.2;
        } else if (pokemon === "058") {
            scale *= 0.9;
        } else if (pokemon === "059") {
            scale *= 1.2;
        } else if (pokemon === "060") {
            scale *= 0.8;
        } else if (pokemon === "062") {
            scale *= 1.1;
        } else if (pokemon === "063") {
            scale *= 0.8;
        } else if (pokemon === "064") {
            scale *= 1.1;
        } else if (pokemon === "065") {
            if (model === "2") {
                scale *= 1.3;
                translation[1] -= 90 * scale;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "066") {
            scale *= 0.8;
        } else if (pokemon === "068") {
            scale *= 1.2;
        } else if (pokemon === "069") {
            scale *= 0.8;
        } else if (pokemon === "070") {
            scale *= 1.1;
        } else if (pokemon === "071") {
            scale *= 1.1;
        } else if (pokemon === "073") {
            scale *= 1.2;
        } else if ((pokemon === "074") && (model === "1")) {
            scale *= 0.9;
        } else if (pokemon === "075") {
            scale *= 1.1;
        } else if (pokemon === "076") {
            scale *= 1.2;
        } else if (pokemon === "078") {
            scale *= 1.3;
        } else if ((pokemon === "080") && (model === "1")) {
            scale *= 1.1;
        } else if (pokemon === "081") {
            scale *= 0.8;
        } else if (pokemon === "082") {
            scale *= 1.4;
            translation[1] -= 40 * scale;
        } else if (pokemon === "084") {
            scale *= 0.9;
        } else if (pokemon === "085") {
            scale *= 1.2;
        } else if (pokemon === "087") {
            scale *= 1.6;
        } else if (pokemon === "088") {
            scale *= 0.75;
        } else if (pokemon === "089") {
            scale *= 1.2;
            translation[1] += 40 * scale;
        } else if (pokemon === "091") {
            scale *= 1.3;
            translation[1] -= 60 * scale;
        } else if (pokemon === "092") {
            scale *= 0.9;
        } else if (pokemon === "093") {
            scale *= 0.8;
        } else if ((pokemon === "094") && (model === "1")) {
            scale *= 0.9;
        } else if (pokemon === "095") {
            translation[1] -= 380 * scale;
        } else if (pokemon === "096") {
            scale *= 0.9;
        } else if (pokemon === "097") {
            scale *= 1.2;
        } else if (pokemon === "099") {
            scale *= 1.2;
        } else if (pokemon === "100") {
            scale *= 0.7;
        } else if (pokemon === "103") {
            scale *= 1.1;
            if (model === "1") {
                translation[1] -= 1000 * scale;
            }
        } else if (pokemon === "104") {
            scale *= 0.7;
        } else if (pokemon === "105") {
            scale *= 1.1;
            if (model === "1") {
                scale *= 1.45;
            }
        } else if (pokemon === "106") {
            scale *= 1.05;
        } else if (pokemon === "107") {
            scale *= 1.2;
        } else if (pokemon === "108") {
            scale *= 1.4;
        } else if (pokemon === "109") {
            scale *= 1.4;
        } else if (pokemon === "110") {
            scale *= 1.7;
            translation[1] -= 30 * scale;
        } else if (pokemon === "113") {
            scale *= 1.2;
        } else if (pokemon === "114") {
            scale *= 0.9;
        } else if (pokemon === "115") {
            if (model === "0") {
                scale *= 0.9;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "116") {
            scale *= 0.9;
        } else if (pokemon === "118") {
            scale *= 1.3;
        } else if (pokemon === "119") {
            scale *= 1.4;
        } else if (pokemon === "123") {
            scale *= 1.2;
            translation[1] -= 160 * scale;
        } else if (pokemon === "126") {
            scale *= 1.3;
        } else if (pokemon === "127") {
            scale *= 1.3;
            if (model === "1") {
                translation[1] -= 80 * scale;
            }
        } else if (pokemon === "128") {
            scale *= 1.1;
        } else if (pokemon === "129") {
            scale *= 0.9;
        } else if (pokemon === "130") {
            if (model === "2") {
                scale *= 1.3;
                translation[1] -= 440 * scale;
            } else {
                scale *= 1.4;
                translation[1] -= 250 * scale;
            }
        } else if (pokemon === "131") {
            scale *= 1.1;
        } else if (pokemon === "132") {
            scale *= 0.8;
        } else if (pokemon === "133") {
            scale *= 1.1;
        } else if (pokemon === "134") {
            scale *= 1.7;
        } else if (pokemon === "135") {
            scale *= 1.2;
        } else if (pokemon === "136") {
            scale *= 1.4;
        } else if (pokemon === "138") {
            scale *= 0.8;
        } else if (pokemon === "139") {
            scale *= 1.3;
        } else if (pokemon === "140") {
            scale *= 0.65;
        } else if (pokemon === "141") {
            scale *= 1.2;
        } else if (pokemon === "142") {
            scale *= 1.3;
            translation[1] -= 400 * scale;
        } else if (pokemon === "143") {
            scale *= 1.3;
            translation[1] -= 70 * scale;
        } else if (pokemon === "144") {
            scale *= 1.2;
            translation[1] -= 240 * scale;
        } else if (pokemon === "145") {
            scale *= 1.2;
            translation[1] -= 240 * scale;
        } else if (pokemon === "146") {
            scale *= 1.3;
            translation[1] -= 240 * scale;
        } else if (pokemon === "147") {
            scale *= 0.8;
        } else if (pokemon === "149") {
            scale *= 1.24;
            translation[1] -= 180 * scale;
        } else if (pokemon === "150") {
            if (model === "2") {
                scale *= 1.7;
                translation[1] -= 80 * scale;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "152") {
            scale *= 0.9;
        } else if (pokemon === "153") {
            scale *= 1.3;
        } else if (pokemon === "154") {
            scale *= 1.2;
        } else if (pokemon === "155") {
            scale *= 0.9;
        } else if (pokemon === "156") {
            scale *= 1.4;
        } else if (pokemon === "157") {
            scale *= 1.2;
        } else if (pokemon === "158") {
            scale *= 0.9;
        } else if (pokemon === "159") {
            scale *= 1.2;
        } else if (pokemon === "160") {
            scale *= 1.2;
        } else if (pokemon === "161") {
            scale *= 0.9;
        } else if (pokemon === "162") {
            scale *= 1.4;
        } else if (pokemon === "163") {
            scale *= 0.9;
        } else if (pokemon === "164") {
            scale *= 1.3;
            translation[1] -= 80 * scale;
        } else if (pokemon === "165") {
            scale *= 0.9;
        } else if (pokemon === "166") {
            scale *= 1.3;
            translation[1] -= 80 * scale;
        } else if (pokemon === "167") {
            scale *= 0.9;
        } else if (pokemon === "168") {
            scale *= 1.3;
        } else if (pokemon === "169") {
            scale *= 1.3;
        } else if (pokemon === "171") {
            scale *= 1.8;
            translation[1] -= 60 * scale;
        } else if (pokemon === "172") {
            scale *= 0.6;
        } else if (pokemon === "173") {
            scale *= 0.6;
        } else if (pokemon === "174") {
            scale *= 0.7;
        } else if (pokemon === "175") {
            scale *= 0.6;
        } else if (pokemon === "176") {
            scale *= 1.1;
        } else if (pokemon === "177") {
            scale *= 0.8;
        } else if (pokemon === "178") {
            scale *= 1.2;
        } else if (pokemon === "181") {
            scale *= 1.4;
            translation[1] -= 30 * scale;
        } else if (pokemon === "184") {
            scale *= 1.5;
        } else if (pokemon === "185") {
            scale *= 1.3;
        } else if (pokemon === "186") {
            scale *= 1.1;
        } else if (pokemon === "188") {
            scale *= 0.9;
        } else if (pokemon === "189") {
            scale *= 1.5;
            translation[1] -= 30 * scale;
        } else if (pokemon === "191") {
            scale *= 0.7;
        } else if (pokemon === "192") {
            scale *= 1.4;
        } else if (pokemon === "193") {
            scale *= 1.1;
        } else if (pokemon === "194") {
            scale *= 0.9;
        } else if (pokemon === "195") {
            scale *= 1.3;
        } else if (pokemon === "196") {
            scale *= 1.4;
        } else if (pokemon === "197") {
            scale *= 1.4;
        } else if (pokemon === "199") {
            scale *= 1.1;
        } else if (pokemon === "200") {
            scale *= 0.9;
        } else if (pokemon === "201") {
            scale *= 1.4;
        } else if (pokemon === "202") {
            scale *= 1.2;
        } else if (pokemon === "203") {
            scale *= 1.2;
        } else if (pokemon === "204") {
            scale *= 0.9;
        } else if (pokemon === "205") {
            scale *= 1.1;
        } else if (pokemon === "206") {
            scale *= 0.9;
        } else if (pokemon === "207") {
            scale *= 1.1;
        } else if (pokemon === "208") {
            scale *= 1.1;
            translation[1] -= 380 * scale;
        } else if (pokemon === "210") {
            scale *= 1.1;
        } else if (pokemon === "212") {
            scale *= 1.3;
            translation[1] -= 60 * scale;
        } else if (pokemon === "214") {
            if (model === "2") {
                scale *= 1.4;
            } else {
                scale *= 1.2;
            }
        } else if (pokemon === "216") {
            scale *= 0.85;
        } else if (pokemon === "217") {
            scale *= 1.2;
        } else if (pokemon === "218") {
            scale *= 0.85;
        } else if (pokemon === "219") {
            scale *= 1.3;
        } else if (pokemon === "220") {
            scale *= 0.8;
        } else if (pokemon === "221") {
            scale *= 1.1;
        } else if (pokemon === "225") {
            scale *= 0.8;
        } else if (pokemon === "226") {
            scale *= 1.2;
        } else if (pokemon === "227") {
            scale *= 1.4;
            translation[1] -= 120 * scale;
        } else if (pokemon === "228") {
            scale *= 0.8;
        } else if (pokemon === "229") {
            if (model === "2") {
                scale *= 1.2;
            } else {
                scale *= 1.3;
            }
        } else if (pokemon === "230") {
            scale *= 1.3;
            translation[1] -= 110 * scale;
        } else if (pokemon === "231") {
            scale *= 0.9;
        } else if (pokemon === "232") {
            scale *= 1.3;
        } else if (pokemon === "233") {
            scale *= 1.3;
        } else if (pokemon === "236") {
            scale *= 0.9;
        } else if (pokemon === "237") {
            scale *= 1.3;
        } else if (pokemon === "238") {
            scale *= 0.7;
        } else if (pokemon === "239") {
            scale *= 0.7;
        } else if (pokemon === "240") {
            scale *= 0.7;
        } else if (pokemon === "241") {
            scale *= 1.2;
        } else if (pokemon === "242") {
            scale *= 1.2;
        } else if (pokemon === "243") {
            scale *= 1.2;
        } else if (pokemon === "244") {
            scale *= 1.2;
        } else if (pokemon === "245") {
            scale *= 1.3;
        } else if (pokemon === "246") {
            scale *= 0.8;
        } else if (pokemon === "248") {
            scale *= 1.1;
        } else if (pokemon === "249") {
            scale *= 1.1;
        } else if (pokemon === "250") {
            scale *= 1.1;
        } else if (pokemon === "251") {
            scale *= 0.9;
        } else if (pokemon === "252") {
            scale *= 0.8;
        } else if (pokemon === "253") {
            scale *= 1.1;
        } else if (pokemon === "254") {
            scale *= 1.3;
        } else if (pokemon === "255") {
            scale *= 0.8;
        } else if (pokemon === "256") {
            scale *= 1.1;
        } else if (pokemon === "257") {
            scale *= 1.3;
            translation[1] -= 40 * scale;
        } else if (pokemon === "258") {
            scale *= 0.8;
        } else if (pokemon === "259") {
            scale *= 1.1;
        } else if ((pokemon === "260") && (model === "0")) {
            scale *= 1.2;
        } else if (pokemon === "262") {
            scale *= 1.4;
        } else if (pokemon === "264") {
            scale *= 1.5;
        } else if (pokemon === "265") {
            scale *= 0.7;
        } else if (pokemon === "265") {
            scale *= 0.9;
        } else if (pokemon === "267") {
            scale *= 1.3;
            translation[1] -= 20 * scale;
        } else if (pokemon === "268") {
            scale *= 0.9;
        } else if (pokemon === "269") {
            scale *= 1.3;
        } else if (pokemon === "270") {
            scale *= 0.7;
        } else if (pokemon === "271") {
            scale *= 0.8;
        } else if (pokemon === "272") {
            scale *= 1.5;
        } else if (pokemon === "273") {
            scale *= 0.8;
        } else if (pokemon === "274") {
            scale *= 1.1;
        } else if (pokemon === "275") {
            scale *= 1.3;
        } else if (pokemon === "276") {
            scale *= 0.8;
        } else if (pokemon === "277") {
            scale *= 1.3;
        } else if (pokemon === "279") {
            scale *= 1.1;
        } else if (pokemon === "280") {
            scale *= 0.7;
        } else if (pokemon === "282") {
            if (model === "1") {
                scale *= 1.2;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "283") {
            scale *= 0.9;
        } else if (pokemon === "284") {
            scale *= 1.3;
        } else if (pokemon === "285") {
            scale *= 0.8;
        } else if (pokemon === "286") {
            scale *= 1.4;
        } else if (pokemon === "289") {
            scale *= 1.3;
        } else if (pokemon === "290") {
            scale *= 0.9;
        } else if (pokemon === "291") {
            scale *= 1.4;
        } else if (pokemon === "293") {
            scale *= 0.7;
        } else if (pokemon === "294") {
            scale *= 1.2;
        } else if (pokemon === "295") {
            scale *= 1.3;
        } else if (pokemon === "297") {
            scale *= 0.9;
        } else if (pokemon === "299") {
            scale *= 0.9;
        } else if (pokemon === "300") {
            scale *= 0.8;
        } else if (pokemon === "301") {
            scale *= 1.1;
        } else if ((pokemon === "302") && (model === "1")) {
            scale *= 1.2;
        } else if (pokemon === "303") {
            if (model === "1") {
                scale *= 0.9;
            } else {
                scale *= 0.7;
            }
        } else if (pokemon === "304") {
            scale *= 0.7;
        } else if (pokemon === "305") {
            scale *= 1.2;
        } else if (pokemon === "306") {
            scale *= 1.2;
        } else if (pokemon === "307") {
            scale *= 0.8;
        } else if (pokemon === "308") {
            if (model === "2") {
                scale *= 1.4;
            } else {
                scale *= 1.3;
            }
        } else if (pokemon === "310") {
            if (model === "1") {
                scale *= 1.3;
            } else {
                scale *= 1.2;
            }
        } else if (pokemon === "313") {
            scale *= 1.2;
        } else if (pokemon === "320") {
            scale *= 0.9;
        } else if (pokemon === "321") {
            scale *= 1.3;
            translation[1] += 1300 * scale;
        } else if (pokemon === "324") {
            scale *= 1.3;
        } else if (pokemon === "325") {
            scale *= 1.1;
        } else if (pokemon === "326") {
            scale *= 1.3;
        } else if (pokemon === "328") {
            scale *= 0.8;
        } else if (pokemon === "329") {
            scale *= 1.4;
        } else if (pokemon === "330") {
            scale *= 1.2;
        } else if (pokemon === "332") {
            scale *= 1.4;
        } else if (pokemon === "334") {
            translation[1] -= 140 * scale;
        } else if (pokemon === "335") {
            scale *= 1.2;
        } else if (pokemon === "336") {
            scale *= 1.5;
        } else if (pokemon === "338") {
            scale *= 1.4;
            translation[1] -= 70 * scale;
        } else if (pokemon === "339") {
            scale *= 0.9;
        } else if (pokemon === "340") {
            scale *= 1.3;
        } else if (pokemon === "341") {
            scale *= 0.8;
        } else if (pokemon === "342") {
            scale *= 1.2;
        } else if (pokemon === "344") {
            scale *= 1.2;
        } else if (pokemon === "345") {
            scale *= 0.8;
        } else if (pokemon === "346") {
            scale *= 1.2;
        } else if (pokemon === "348") {
            scale *= 1.2;
        } else if (pokemon === "349") {
            scale *= 0.8;
        } else if (pokemon === "351") {
            if (model === "0") {
                scale *= 0.9;
            }
        } else if (pokemon === "354") {
            if (model === "1") {
                scale *= 1.4;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "355") {
            scale *= 0.7;
        } else if (pokemon === "356") {
            scale *= 0.9;
        } else if (pokemon === "357") {
            scale *= 1.3;
            translation[1] -= 300 * scale;
        } else if (pokemon === "359") {
            scale *= 1.3;
        } else if (pokemon === "361") {
            scale *= 0.7;
        } else if (pokemon === "362") {
            scale *= 1.2;
            if (model === "1") {
                translation[1] -= 300 * scale;
            } else {
                translation[1] -= 80 * scale;
            }
        } else if (pokemon === "363") {
            scale *= 0.8;
        } else if (pokemon === "364") {
            scale *= 1.3;
        } else if (pokemon === "365") {
            scale *= 1.3;
        } else if (pokemon === "366") {
            scale *= 0.7;
        } else if (pokemon === "367") {
            scale *= 1.7;
            translation[1] -= 80 * scale;
        } else if (pokemon === "368") {
            scale *= 1.7;
            translation[1] -= 80 * scale;
        } else if (pokemon === "369") {
            scale *= 1.2;
        } else if (pokemon === "371") {
            scale *= 0.8;
        } else if (pokemon === "372") {
            scale *= 0.9;
        } else if (pokemon === "373") {
            if (model === "1") {
                scale *= 1.3;
            } else {
                scale *= 1.5;
            }
        } else if (pokemon === "374") {
            scale *= 0.9;
        } else if (pokemon === "375") {
            scale *= 0.9;
        } else if (pokemon === "376") {
            if (model === "1") {
                translation[1] -= 400 * scale;
            } else {
                scale *= 0.8;
            }
        } else if (pokemon === "377") {
            scale *= 1.2;
        } else if (pokemon === "378") {
            scale *= 1.2;
        } else if (pokemon === "379") {
            scale *= 1.2;
        } else if (pokemon === "380") {
            scale *= 1.6;
            translation[1] -= 50 * scale;
        } else if (pokemon === "381") {
            scale *= 1.6;
            translation[1] -= 150 * scale;
        } else if (pokemon === "382") {
            scale *= 1.2;
        } else if (pokemon === "383") {
            if (model === "1") {
                scale *= 1.3;
            } else {
                scale *= 1.2;
            }
        } else if (pokemon === "384") {
            if (model === "1") {
                scale *= 1.8;
                translation[1] -= 500 * scale;
                translation[2] -= 400 * scale;
            } else {
                scale *= 1.2;
                translation[1] -= 500 * scale;
            }
        } else if (pokemon === "386") {
            if (model === "0") {
                scale *= 1.1;
            } else if (model === "2") {
                scale *= 0.9;
            }
        } else if (pokemon === "387") {
            scale *= 0.8;
        } else if (pokemon === "388") {
            scale *= 1.1;
        } else if (pokemon === "389") {
            scale *= 1.1;
        } else if (pokemon === "390") {
            scale *= 0.8;
        } else if (pokemon === "391") {
            scale *= 1.2;
        } else if (pokemon === "392") {
            scale *= 1.2;
        } else if (pokemon === "393") {
            scale *= 0.7;
        } else if (pokemon === "394") {
            scale *= 1.1;
        } else if (pokemon === "395") {
            scale *= 1.3;
        } else if (pokemon === "396") {
            scale *= 0.7;
        } else if (pokemon === "397") {
            scale *= 1.2;
        } else if (pokemon === "398") {
            scale *= 1.2;
            translation[1] -= 220 * scale;
        } else if (pokemon === "399") {
            scale *= 0.8;
        } else if (pokemon === "400") {
            scale *= 1.4;
        } else if (pokemon === "401") {
            scale *= 0.8;
        } else if (pokemon === "402") {
            scale *= 1.3;
        } else if (pokemon === "404") {
            scale *= 1.3;
        } else if (pokemon === "405") {
            scale *= 1.4;
        } else if (pokemon === "406") {
            scale *= 0.6;
        } else if (pokemon === "407") {
            scale *= 1.2;
        } else if (pokemon === "408") {
            scale *= 0.8;
        } else if (pokemon === "409") {
            scale *= 1.3;
        } else if (pokemon === "410") {
            scale *= 0.8;
        } else if (pokemon === "411") {
            scale *= 1.3;
        } else if (pokemon === "413") {
            scale *= 1.3;
        } else if (pokemon === "414") {
            scale *= 1.5;
        } else if (pokemon === "419") {
            scale *= 1.3;
        } else if (pokemon === "420") {
            scale *= 0.8;
        } else if ((pokemon === "421") && (model === "1")) {
            scale *= 1.3;
        } else if (pokemon === "423") {
            scale *= 1.2;
        } else if (pokemon === "424") {
            scale *= 1.4;
        } else if (pokemon === "426") {
            scale *= 1.2;
        } else if (pokemon === "427") {
            scale *= 0.9;
        } else if (pokemon === "428") {
            if (model === "1") {
                scale *= 1.3;
            } else {
                scale *= 1.2;
            }
        } else if (pokemon === "429") {
            scale *= 1.5;
            translation[1] -= 40 * scale;
        } else if (pokemon === "430") {
            scale *= 1.2;
        } else if (pokemon === "435") {
            scale *= 1.5;
        } else if (pokemon === "437") {
            scale *= 1.3;
        } else if (pokemon === "438") {
            scale *= 0.7;
        } else if (pokemon === "439") {
            scale *= 0.7;
        } else if (pokemon === "440") {
            scale *= 0.8;
        } else if (pokemon === "443") {
            scale *= 0.7;
        } else if ((pokemon === "445") && (model === "2")) {
            scale *= 1.2;
        } else if (pokemon === "447") {
            scale *= 0.8;
        } else if (pokemon === "448") {
            scale *= 1.2;
        } else if (pokemon === "450") {
            scale *= 1.2;
        } else if (pokemon === "453") {
            scale *= 0.8;
        } else if (pokemon === "454") {
            scale *= 1.2;
        } else if (pokemon === "455") {
            scale *= 1.2;
        } else if (pokemon === "456") {
            scale *= 0.9;
        } else if (pokemon === "457") {
            scale *= 1.2;
        } else if (pokemon === "458") {
            scale *= 0.9;
        } else if ((pokemon === "460") && (model === "2")) {
            scale *= 0.8;
        } else if (pokemon === "461") {
            scale *= 1.1;
        } else if (pokemon === "461") {
            scale *= 1.2;
        } else if (pokemon === "463") {
            scale *= 1.3;
        } else if (pokemon === "464") {
            scale *= 1.1;
        } else if (pokemon === "465") {
            scale *= 1.2;
        } else if (pokemon === "466") {
            scale *= 1.2;
        } else if (pokemon === "467") {
            scale *= 1.4;
        } else if (pokemon === "468") {
            scale *= 1.4;
        } else if (pokemon === "470") {
            scale *= 1.25;
        } else if (pokemon === "471") {
            scale *= 1.4;
        } else if (pokemon === "472") {
            scale *= 1.2;
        } else if (pokemon === "474") {
            scale *= 1.15;
        } else if (pokemon === "475") {
            scale *= 1.25;
        } else if (pokemon === "475") {
            scale *= 1.2;
        } else if (pokemon === "476") {
            scale *= 1.2;
        } else if (pokemon === "477") {
            translation[1] += -300 * scale;
        } else if (pokemon === "478") {
            scale *= 1.3;
            translation[1] -= 50 * scale;
        } else if (pokemon === "479") {
            if (model === "0") {
                scale *= 1.6;
            } else {
                scale *= 1.3;
            }
        } else if (pokemon === "480") {
            scale *= 1.5;
            translation[1] -= 10 * scale;
        } else if (pokemon === "481") {
            scale *= 1.5;
            translation[1] -= 10 * scale;
        } else if (pokemon === "482") {
            scale *= 1.5;
            translation[1] -= 10 * scale;
        } else if (pokemon === "483") {
            scale *= 0.9;
        } else if (pokemon === "484") {
            scale *= 0.9;
        } else if (pokemon === "485") {
            scale *= 0.7;
        } else if ((pokemon === "487") && (model === "1")) {
            scale *= 1.2;
            translation[1] -= 800 * scale;
        } else if (pokemon === "488") {
            scale *= 1.3;
        } else if (pokemon === "489") {
            scale *= 0.9;
        } else if (pokemon === "491") {
            scale *= 1.3;
        } else if (pokemon === "492") {
            if (model === "0") {
                scale *= 0.7;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "493") {
            scale *= 0.9;
        } else if (pokemon === "495") {
            scale *= 0.9;
        } else if (pokemon === "496") {
            scale *= 1.1;
        } else if (pokemon === "497") {
            scale *= 1.4;
        } else if (pokemon === "498") {
            scale *= 0.9;
        } else if (pokemon === "499") {
            scale *= 0.9;
        } else if (pokemon === "500") {
            scale *= 1.25;
        } else if (pokemon === "501") {
            scale *= 0.7;
        } else if (pokemon === "503") {
            scale *= 1.4;
        } else if (pokemon === "504") {
            scale *= 0.8;
        } else if (pokemon === "505") {
            scale *= 1.3;
        } else if (pokemon === "506") {
            scale *= 0.8;
        } else if (pokemon === "508") {
            scale *= 1.3;
        } else if (pokemon === "509") {
            scale *= 0.8;
        } else if (pokemon === "510") {
            scale *= 1.3;
        } else if (pokemon === "511") {
            scale *= 0.8;
        } else if (pokemon === "512") {
            scale *= 1.2;
        } else if (pokemon === "513") {
            scale *= 0.8;
        } else if (pokemon === "514") {
            scale *= 1.2;
        } else if (pokemon === "515") {
            scale *= 0.8;
        } else if (pokemon === "516") {
            scale *= 1.05;
        } else if (pokemon === "517") {
            scale *= 0.7;
        } else if (pokemon === "519") {
            scale *= 0.6;
        } else if (pokemon === "520") {
            scale *= 1.4;
        } else if (pokemon === "521") {
            scale *= 1.6;
        } else if (pokemon === "523") {
            scale *= 1.2;
        } else if (pokemon === "524") {
            scale *= 0.7;
        } else if (pokemon === "525") {
            scale *= 1.1;
        } else if (pokemon === "528") {
            scale *= 1.3;
        } else if (pokemon === "530") {
            scale *= 1.3;
        } else if ((pokemon === "531") && (model === "1")) {
            scale *= 1.2;
        } else if (pokemon === "532") {
            scale *= 0.8;
        } else if (pokemon === "533") {
            scale *= 1.2;
        } else if (pokemon === "534") {
            scale *= 1.2;
        } else if (pokemon === "535") {
            scale *= 0.9;
        } else if (pokemon === "537") {
            scale *= 1.1;
        } else if (pokemon === "538") {
            scale *= 1.1;
        } else if (pokemon === "539") {
            scale *= 1.1;
        } else if (pokemon === "540") {
            scale *= 0.5;
        } else if (pokemon === "541") {
            scale *= 0.9;
        } else if (pokemon === "542") {
            scale *= 1.5;
            translation[1] -= 10 * scale;
        } else if (pokemon === "543") {
            scale *= 0.7;
        } else if (pokemon === "546") {
            scale *= 0.9;
        } else if (pokemon === "547") {
            scale *= 1.2;
        } else if (pokemon === "548") {
            scale *= 0.9;
        } else if (pokemon === "549") {
            scale *= 1.4;
        } else if (pokemon === "551") {
            scale *= 0.9;
        } else if (pokemon === "555") {
            if (model === "1") {
                scale *= 0.75;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "557") {
            scale *= 0.8;
        } else if (pokemon === "558") {
            scale *= 1.1;
        } else if (pokemon === "559") {
            scale *= 0.9;
        } else if (pokemon === "560") {
            scale *= 1.2;
        } else if (pokemon === "561") {
            scale *= 1.4;
        } else if (pokemon === "565") {
            scale *= 1.1;
        } else if (pokemon === "570") {
            scale *= 0.8;
        } else if (pokemon === "571") {
            scale *= 1.4;
        } else if (pokemon === "572") {
            scale *= 0.9;
        } else if (pokemon === "573") {
            scale *= 1.1;
        } else if (pokemon === "574") {
            scale *= 0.75;
        } else if (pokemon === "576") {
            scale *= 1.3;
        } else if (pokemon === "577") {
            scale *= 0.6;
        } else if (pokemon === "578") {
            scale *= 0.8;
        } else if (pokemon === "579") {
            scale *= 1.3;
        } else if (pokemon === "580") {
            scale *= 0.7;
        } else if (pokemon === "581") {
            scale *= 1.3;
            translation[1] -= 90 * scale;
        } else if (pokemon === "582") {
            scale *= 0.8;
        } else if (pokemon === "583") {
            scale *= 1.1;
        } else if (pokemon === "584") {
            scale *= 1.2;
        } else if (pokemon === "585") {
            scale *= 0.8;
        } else if (pokemon === "586") {
            scale *= 1.2;
        } else if (pokemon === "587") {
            scale *= 0.9;
        } else if (pokemon === "588") {
            scale *= 0.9;
        } else if (pokemon === "589") {
            scale *= 1.3;
        } else if (pokemon === "590") {
            scale *= 0.7;
        } else if (pokemon === "591") {
            scale *= 1.2;
        } else if (pokemon === "592") {
            scale *= 0.9;
        } else if (pokemon === "595") {
            scale *= 0.7;
            translation[1] += -5 * scale;
        } else if (pokemon === "596") {
            scale *= 1.2;
        } else if (pokemon === "597") {
            scale *= 0.8;
        } else if (pokemon === "599") {
            scale *= 0.8;
        } else if (pokemon === "601") {
            scale *= 1.4;
        } else if (pokemon === "602") {
            scale *= 0.8;
            translation[1] += 5 * scale;
        } else if (pokemon === "603") {
            scale *= 1.2;
        } else if (pokemon === "604") {
            scale *= 1.7;
        } else if (pokemon === "606") {
            scale *= 1.2;
            translation[1] -= 50 * scale;
        } else if (pokemon === "607") {
            scale *= 0.6;
        } else if (pokemon === "608") {
            scale *= 0.9;
        } else if (pokemon === "610") {
            scale *= 0.8;
        } else if (pokemon === "612") {
            scale *= 1.3;
        } else if (pokemon === "613") {
            scale *= 0.8;
        } else if (pokemon === "616") {
            scale *= 0.8;
        } else if (pokemon === "617") {
            scale *= 1.3;
        } else if (pokemon === "619") {
            scale *= 0.8;
        } else if (pokemon === "620") {
            scale *= 1.2;
        } else if (pokemon === "623") {
            scale *= 0.9;
        } else if (pokemon === "624") {
            scale *= 0.9;
        } else if (pokemon === "625") {
            scale *= 1.3;
        } else if (pokemon === "628") {
            scale *= 1.1;
        } else if (pokemon === "629") {
            scale *= 0.8;
        } else if (pokemon === "630") {
            scale *= 1.4;
        } else if (pokemon === "633") {
            scale *= 0.8;
        } else if (pokemon === "635") {
            scale *= 1.3;
            translation[1] -= 100 * scale;
        } else if (pokemon === "637") {
            scale *= 1.3;
        } else if (pokemon === "639") {
            scale *= 0.8;
        } else if (pokemon === "641") {
            if (model === "0") {
                scale *= 1.3;
                translation[1] -= 50 * scale;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "642") {
            if (model === "0") {
                scale *= 1.3;
                translation[1] -= 50 * scale;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "645") {
            if (model === "0") {
                scale *= 1.3;
                translation[1] -= 50 * scale;
            } else {
                scale *= 1.1;
            }
        } else if ((pokemon === "647") && (model == "1")) {
            scale *= 1.2;
        } else if (pokemon === "650") {
            scale *= 0.8;
        } else if (pokemon === "652") {
            scale *= 1.1;
        } else if (pokemon === "653") {
            scale *= 0.8;
        } else if (pokemon === "655") {
            scale *= 1.4;
        } else if (pokemon === "656") {
            scale *= 0.8;
        } else if (pokemon === "658") {
            if (model === "2") {
                scale *= 1.2;
            } else {
                scale *= 1.4;
            }
        } else if (pokemon === "660") {
            scale *= 1.2;
        } else if (pokemon === "661") {
            scale *= 0.8;
        } else if (pokemon === "662") {
            scale *= 1.1;
        } else if (pokemon === "663") {
            scale *= 1.2;
        } else if (pokemon === "664") {
            scale *= 0.7;
        } else if (pokemon === "665") {
            scale *= 0.8;
        } else if (pokemon === "666") {
            scale *= 1.2;
            translation[1] -= 40 * scale;
        } else if (pokemon === "667") {
            scale *= 0.8;
        } else if (pokemon === "668") {
            scale *= 1.2;
        } else if (pokemon === "670") {
            scale *= 1.2;
        } else if (pokemon === "671") {
            scale *= 1.2;
        } else if (pokemon === "672") {
            scale *= 0.9;
        } else if (pokemon === "673") {
            scale *= 1.1;
        } else if (pokemon === "674") {
            scale *= 0.7;
        } else if (pokemon === "677") {
            scale *= 0.6;
        } else if (pokemon === "678") {
            scale *= 1.2;
        } else if (pokemon === "680") {
            scale *= 1.3;
        } else if (pokemon === "681") {
            scale *= 1.2;
        } else if (pokemon === "684") {
            scale *= 0.8;
        } else if (pokemon === "687") {
            scale *= 1.2;
        } else if (pokemon === "689") {
            scale *= 1.2;
        } else if (pokemon === "690") {
            scale *= 0.9;
        } else if (pokemon === "691") {
            scale *= 1.2;
            translation[1] -= 160 * scale;
        } else if (pokemon === "692") {
            scale *= 0.8;
        } else if (pokemon === "693") {
            scale *= 1.6;
        } else if (pokemon === "694") {
            scale *= 0.8;
        } else if (pokemon === "695") {
            scale *= 1.6;
        } else if (pokemon === "697") {
            scale *= 1.2;
        } else if (pokemon === "700") {
            scale *= 1.2;
        } else if (pokemon === "701") {
            scale *= 1.2;
        } else if (pokemon === "702") {
            scale *= 0.8;
        } else if (pokemon === "703") {
            scale *= 0.8;
        } else if (pokemon === "704") {
            scale *= 0.6;
        } else if (pokemon === "706") {
            scale *= 1.2;
        } else if (pokemon === "707") {
            scale *= 1.2;
        } else if (pokemon === "708") {
            scale *= 0.8;
        } else if (pokemon === "709") {
            scale *= 1.2;
        } else if (pokemon === "710") {
            scale *= 0.8;
        } else if (pokemon === "711") {
            scale *= 1.2;
        } else if (pokemon === "712") {
            scale *= 0.6;
        } else if (pokemon === "713") {
            scale *= 1.2;
        } else if (pokemon === "715") {
            scale *= 1.2;
        } else if (pokemon === "716") {
            scale *= 0.9;
        } else if (pokemon === "718") {
            if (model === "4") {
                scale *= 1.05;
            } else {
                scale *= 0.8;
            }
        } else if (pokemon === "719") {
            if (model === "1") {
                scale *= 1.4;
                translation[1] -= 30 * scale;
            } else {
                scale *= 1.1;
            }
        } else if (pokemon === "720") {
            if (model === "1") {
                scale *= 1.1;
                translation[1] -= 640 * scale;
            } else {
                scale *= 0.8;
            }
        } else if (pokemon === "722") {
            scale *= 0.8;
        } else if (pokemon === "724") {
            scale *= 1.2;
        } else if (pokemon === "726") {
            scale *= 1.2;
        } else if (pokemon === "727") {
            scale *= 1.2;
        } else if (pokemon === "728") {
            scale *= 0.9;
        } else if (pokemon === "729") {
            scale *= 1.2;
        } else if (pokemon === "730") {
            scale *= 1.5;
        } else if (pokemon === "731") {
            scale *= 0.8;
        } else if (pokemon === "732") {
            scale *= 1.2;
        } else if (pokemon === "734") {
            scale *= 1.2;
        } else if (pokemon === "735") {
            scale *= 1.3;
        } else if (pokemon === "736") {
            scale *= 1.2;
        } else if (pokemon === "737") {
            scale *= 0.8;
        } else if (pokemon === "738") {
            scale *= 1.5;
            translation[1] -= 30 * scale;
        } else if (pokemon === "742") {
            scale *= 0.8;
            translation[1] += 10 * scale;
        } else if (pokemon === "743") {
            translation[1] += 4 * scale;
        } else if (pokemon === "744") {
            scale *= 0.7;
        } else if (pokemon === "745") {
            if (model === "1") {
                scale *= 1.2;
            } else {
                scale *= 1.4;
            }
        } else if ((pokemon === "746") && (model === "0")) {
            translation[1] += 5 * scale;
        } else if (pokemon === "747") {
            scale *= 0.7;
        } else if (pokemon === "748") {
            scale *= 1.4;
        } else if (pokemon === "753") {
            scale *= 0.7;
        } else if (pokemon === "754") {
            scale *= 1.4;
        } else if (pokemon === "756") {
            scale *= 1.2;
        } else if (pokemon === "758") {
            scale *= 1.4;
        } else if (pokemon === "761") {
            scale *= 0.7;
        } else if (pokemon === "763") {
            scale *= 1.2;
        } else if (pokemon === "765") {
            scale *= 1.2;
        } else if (pokemon === "766") {
            scale *= 1.4;
        } else if (pokemon === "767") {
            scale *= 1.3;
        } else if (pokemon === "770") {
            scale *= 1.2;
        } else if (pokemon === "780") {
            scale *= 1.4;
            translation[2] -= 200 * scale;
        } else if (pokemon === "781") {
            scale *= 0.9;
        } else if (pokemon === "782") {
            scale *= 0.7;
        } else if (pokemon === "784") {
            scale *= 1.4;
        } else if (pokemon === "785") {
            scale *= 1.3;
        } else if (pokemon === "786") {
            scale *= 1.3;
        } else if (pokemon === "787") {
            scale *= 1.3;
        } else if (pokemon === "788") {
            scale *= 1.3;
        } else if (pokemon === "790") {
            scale *= 0.6;
            translation[1] += 11 * scale;
        } else if (pokemon === "793") {
            scale *= 1.2;
        } else if (pokemon === "794") {
            scale *= 0.9;
        } else if (pokemon === "796") {
            scale *= 0.9;
        } else if (pokemon === "798") {
            scale *= 1.6;
        } else if (pokemon === "799") {
            scale *= 1.2;
            translation[2] -= 80 * scale;
        } else if ((pokemon === "800") && (model === "3")) {
            scale *= 1.2;
        } else if (pokemon === "804") {
            translation[1] -= 250 * scale;
        } else if (pokemon === "805") {
            scale *= 0.6;
        } else if (pokemon === "806") {
            scale *= 1.2;
        } else if (pokemon === "807") {
            scale *= 1.4;
        } 

    }

    translation[1] += ((-mins[1]) * 0.5 * scale - maxes[1] * 0.5 * scale) + 30;

    return {
        "translation": translation,
        "scale": scale
    };

};

const getM3DElements = function (app, id, query) {

    let from = app.filler.query("#diagram ui-diagram-frame").filter((index, dom) => {
        return $(dom).attr("wire-id") === id;
    })[0];
    if (!from) {
        return;
    }

    let objects = from.frame.filler.query("m3d-object#pokemon-model").children().filter("m3d-object").filter((index, dom) => {
        return $(dom).attr("base").split("/").slice(-1)[0] !== "shadow";
    });

    if (!query) {
        return objects;
    }

    return objects.find(query);

};

const EditableField = function (id, query, type, setter) {
    this.id = id;
    this.query = query;
    this.type = type;
    this.setter = setter;
};

const BackgroundColorField = function (value) {
    this.value = value;
};

const ToggleField = function (value, setter) {
    this.value = value;
    this.setter = setter;
};

const NumberField = function (value, setter) {
    this.value = value;
    this.setter = setter;
};

const LinkField = function (id, query, text) {
    this.id = id;
    this.text = text;
    this.query = query;
};

const MeshField = function Mesh(id, query, text) {
    this.id = id;
    this.text = text;
    this.query = query;
};

const MaterialField = function Material(id, query, text) {
    this.id = id;
    this.text = text;
    this.query = query;
};

const TokenField = function (value) {
    if ((value === undefined) || (value === null)) {
        return value;
    }
    this.value = value;
};

const TokenListField = function (value) {
    this.value = value.split(",");
};

const ResourceField = function (id, target) {
    this.id = id;
    this.target = target;
};

const VectorField = function (value) {
    if (typeof value === "string") {
        value = value.split(",").map(x => parseFloat(x));
    }
    this.value = value;
};

const TexturesField = function Textures(value) {
    Object.assign(this, value);
};

const BlendingField = function Blending(value) {
    Object.assign(this, value);
};

const StencilField = function StencilTest(value) {
    Object.assign(this, value);
};

const DepthField = function DepthTest(value) {
    Object.assign(this, value);
};

const StencilOperationsField = function StencilOperations(value) {
    Object.assign(this, value);
};

const App = function App(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

App.prototype.onKeyPressed = function (event) {
    switch (event.keyCode) {
        case 115: { // s
            this.filler.query("#search-field").select();
            break;
        };
        default: {
            // console.log(event.keyCode);
            break;
        };
    }
};

App.prototype.getNextFrameTopLeft = function (from, size) {

    let coast = $.dom.getDevicePixels(30);

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
            "top": mins[1] + coast + $.dom.getDevicePixels(40)
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
        "left": parseFloat(frame.left) + parseFloat(frame.width) + $.dom.getDevicePixels(40),
        "top": parseFloat(frame.top),
    };

    return suggested;

};

App.prototype.openModel = function (id, from, options) {

    let sceneSize = $.local["pkmsm.model-viewer.size"];
    if (sceneSize) {
        sceneSize = sceneSize.map((x) => $.dom.getDesignPixels(x));
    } else {
        sceneSize = [240, 240];
    }

    let size = {
        "width": $.dom.getDevicePixels(sceneSize[0]),
        "height": $.dom.getDevicePixels(sceneSize[1])
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Model “${filename}”`,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/model-viewer/model-viewer", {
        "id": id
    });

    this.loadModel(id, (error, result) => {

        if (error) {
            console.error(error); 
            if (options && options.finished) {
                options.finished(error);
            }
            return;
        }

        let mins = result.bounds.pose.mins;
        let maxes = result.bounds.pose.maxes;

        let needShadow = $.local["pkmsm.model-viewer.shadow"];
        if (needShadow === undefined) {
            needShadow = true;
        }

        // we need adjust the model to make it render in the window correctly
        let scale = 1;
        let translation = [0, 0, 0];
        if (options && options.icon) {
            let adjust = adjustSceneForIcon(id, mins, maxes);
            scale = adjust.scale;
            translation = adjust.translation;
        } else {
            let size = Math.max((maxes[0] - mins[0]),
                                Math.max(maxes[1], maxes[1] - mins[1]),
                                (maxes[2] - mins[2]));
            scale = 60 / size;
        }

        let m3dObject = $("<m3d-object>").attr({
            "id": "pokemon-model",
            "model-scale": scale,
            "model-translation": translation.map(x => x.toFixed(3)).join(","),
            "frustum-culled": "no"
        });

        const prepareDOM = (html, prefix) => {

            let dom = $(html);

            let id = result.id;

            let decoded = undefined;
            let binaryCallbacks = Object.create(null);
            $.ajax("/~pkmsm/model/data/mesh/" + result.id + (prefix ? "/" + prefix : ""), {
                "success": (result) => {

                    decoded = Object.create(null);
                    dom[0].binDecoded = decoded;
                    if (!prefix) {
                        m3dObject[0].binDecoded = decoded;
                    }
                    for (let key in result) {
                        let value = $.base64.decode(result[key]);
                        if (key.split(".").slice(-1)[0] === "bin") {
                            let type = key.split(".").slice(-2)[0];
                            switch (type) {
                                case "f32": { decoded[key] = new Float32Array(value); break; }
                                case "i8": { decoded[key] = new Int8Array(value); break; }
                                case "i16": { decoded[key] = new Int16Array(value); break; }
                                case "i32": { decoded[key] = new Int32Array(value); break; }
                                case "u8": { decoded[key] = new Uint8Array(value); break; }
                                case "u16": { decoded[key] = new Uint16Array(value); break; }
                                case "u32": { decoded[key] = new Uint32Array(value); break; }
                                default: { decoded[key] = value; break; }
                            }
                        } else {
                            decoded[key] = value;
                        }
                    }
                    if (binaryCallbacks) {
                        let callbacks = binaryCallbacks;
                        binaryCallbacks = null;
                        for (let key in callbacks) {
                            for (let callback of callbacks[key]) {
                                try {
                                    if (decoded[key]) {
                                        callback(undefined, decoded[key]);
                                    } else {
                                        callback(new Error(`Resource[${key}] not found`));
                                    }
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                        }
                    }

                    if (!prefix) {
                        $.ajax(`/~pkmsm/model/res/${id}/animation.xml`, {
                            "dataType": "text",
                            "success": (html) => {
                                let animations = $(html);
                                frame[0].frame.animations = animations;
                                $.ajax(`/~pkmsm/model/data/animation/${id}`, {
                                    "success": (result) => {
                                        for (let key in result) {
                                            let value = $.base64.decode(result[key]);
                                            if (key.split(".").slice(-1)[0] === "bin") {
                                                let type = key.split(".").slice(-2)[0];
                                                switch (type) {
                                                    case "u8": { 
                                                        decoded[key] = [];
                                                        let array = new Uint8Array(value); 
                                                        for (let value of array) {
                                                            decoded[key].push(value ? true : false);
                                                        }
                                                        break; 
                                                    }
                                                    case "f32": 
                                                    default: { 
                                                        decoded[key] = [];
                                                        let array = new Float32Array(value); 
                                                        for (let value of array) {
                                                            decoded[key].push(value);
                                                        }
                                                        break; 
                                                    }
                                                }
                                            } else {
                                                decoded[key] = value;
                                            }
                                        }
                                        dom.append(animations);
                                        let animationSet = Object.create(null);
                                        for (let animation of animations) {
                                            if (animation.id) {
                                                animationSet[animation.id] = true;
                                            }
                                        }
                                        if (animationSet["FightingAction1"]) {
                                            frame[0].frame.playAnimationSeries(["FightingAction1"], {
                                                "channel": "action",
                                                "priority": 1,
                                                "fading": 0,
                                                "paused": (options && options.paused) ? true : false,
                                                "loop": "last"
                                            });
                                        }
                                        let is327 = (id.split("-")[1] === "327");
                                        let paused = (options && options.paused) || is327;
                                        for (let id of [26, 27, 28, 29]) {
                                            let action = `FightingAction${id}`;
                                            let pausedFrame = is327 ? 128 : 0;
                                            if (animationSet[action]) {
                                                m3dObject[0].playM3DClip(action, {
                                                    "channel": `state-${id - 25}`,
                                                    "priority": (3 + id - 26),
                                                    "fading": 0,
                                                    "paused": paused,
                                                    "frame": pausedFrame,
                                                    "loop": Infinity
                                                });
                                            }
                                        }
                                        if (options && options.finished) {
                                            $.delay(10, () => {
                                                options.finished();
                                            });
                                        }
                                    },
                                    "error": () => {
                                        console.error("Failed to get animations data");
                                        if (options && options.finished) {
                                            options.finished(new Error("Failed to get animations data"));
                                        }
                                    }
                                });
                            },
                            "error": () => {
                                console.error("Failed to list animations");
                                if (options && options.finished) {
                                    options.finished(new Error("Failed to list animations"));
                                }
                            }
                        });
                    }

                },
                "error": () => {
                    if (binaryCallbacks) {
                        let callbacks = binaryCallbacks;
                        binaryCallbacks = null;
                        for (let key in callbacks) {
                            for (let callback of callbacks[key]) {
                                try {
                                    callback(new Error(`Resource[${prefix ? prefix + "/" : ""}${key}] not found`));
                                } catch (error) {
                                    console.error(error);
                                }
                            }
                        }
                    }
                    console.error("Failed to load model data");
                    if (options && options.finished) {
                        options.finished(new Error("Failed to load model data"));
                    }
                }
            });

            dom[0].m3dGetBin = function (id, callback) {
                if (decoded) {
                    try {
                        if (decoded[id]) {
                            callback(undefined, decoded[id]);
                        } else {
                            callback(new Error(`Resource[${id}] not found`));
                        }
                    } catch (error) {
                        console.error(error);
                    }
                    return;
                }
                if (!binaryCallbacks[id]) {
                    binaryCallbacks[id] = [];
                }
                binaryCallbacks[id].push(callback);
            };

            let patches = Object.create(null);

            dom[0].m3dLoadPatch = function (id, callback) {

                if (patches[id]) {
                    if (patches[id] instanceof Array) {
                        patches[id].push(callback);
                    } else {
                        callback(patches[id].error, patches[id].module); 
                    }
                    return;
                }

                patches[id] = [];

                let path = `/~pkmsm/model/res/${result.id}/${prefix ? prefix + "/" : ""}${id}`;
                $.res.load(path, (error, result) => {
                    let callbacks = patches[id];
                    if (callbacks && (!(callbacks instanceof Array))) {
                        return;
                    }
                    if (error) {
                        patches[id] = { "error": error };
                    } else {
                        let module = undefined;
                        try {
                            let functor = eval([
                                "(({ Vector2, Vector3, Vector4, Quaternion, Matrix3, Matrix4 }, module) => {" + result,
                                `}) //# sourceURL=${path}`,
                                ""
                            ].join("\n"));
                            let sandbox = { "exports": {} };
                            functor(require("/scripts/three.js"), sandbox);
                            module = sandbox.exports;
                            patches[id] = { "module": module };
                        } catch (error) {
                            patches[id] = { "error": error };
                        }
                    }
                    if (callbacks) {
                        for (let callback of callbacks) {
                            try {
                                callback(patches[id].error, patches[id].module);
                            } catch (error) {
                                console.error(error);
                            }
                        }
                    }
                });

            };

            return dom;

        };

        let modelDOM = prepareDOM(result.html.model, "");
        let shadowDOM = prepareDOM(result.html.shadow, "shadow");

        modelDOM.attr({
            "frustum-culled": "no"
        }).find("m3d-mesh, m3d-object").attr({
            "frustum-culled": "no"
        });

        shadowDOM.attr({
            "visible": needShadow ? "yes" : "no",
            "frustum-culled": "no"
        }).find("m3d-mesh, m3d-object").attr({
            "frustum-culled": "no"
        });

        m3dObject.append(shadowDOM);
        m3dObject.append(modelDOM);

        m3dObject[0].m3dGetBin = function (id, callback) {
            return modelDOM[0].m3dGetBin(id, callback);
        };

        let scene = frame[0].frame.filler.query("m3d-scene");

        scene.append(m3dObject);

    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

    return frame[0];

};

App.prototype.openAnimationController = function (id, from) {

    if (!from.animations) {
        console.error("Animations not available"); return;
    }

    let modelID = id.split("/")[0];

    let viewer = this.filler.query("#diagram").children("ui-diagram-frame").filter((index, dom) => {
        return $(dom).attr("wire-id") === modelID;
    })[0];

    if (!viewer) {
        viewer = from;
    } else {
        viewer = viewer.frame;
    }
    let size = {
        "width": $.dom.getDevicePixels(480),
        "height": $.dom.getDevicePixels(160)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Animation Controller of “${filename}”`,
        "resizable": "yes",
        "wire-id": id + "/animation-controller"
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/animation-controller/animation-controller", {
        "id": id,
    });

    let animations = Object.create(null);
    for (let animation of viewer.animations) {
        if (animation.localName && 
            (animation.localName.toLowerCase() === "m3d-clip")) {
            let id = $(animation).attr("id");
            let group = id.split("Action")[0];
            let duration = parseFloat($(animation).attr("duration"));
            animations[id] = {
                "id": id,
                "group": group,
                "duration": duration,
                "tracks": $(animation).children("m3d-track").length
            };
        }
    }

    frame[0].frame.updateAnimationState(
        viewer.getPlayingAnimationSeries(),
        viewer.getPlayingAnimations(),
        animations
    );

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openAnimationList = function (id, from) {

    if (!from.animations) {
        console.error("Animations not available"); return;
    }

    let modelID = id.split("/")[0];

    let viewer = this.filler.query("#diagram").children("ui-diagram-frame").filter((index, dom) => {
        return $(dom).attr("wire-id") === modelID;
    })[0];

    if (!viewer) {
        viewer = from;
    } else {
        viewer = viewer.frame;
    }

    let animations = Object.create(null);
    for (let animation of viewer.animations) {
        if (animation.localName && 
            (animation.localName.toLowerCase() === "m3d-clip")) {
            let id = $(animation).attr("id");
            let group = id.split("Action")[0];
            let duration = parseFloat($(animation).attr("duration"));
            if (!animations[group]) {
                animations[group] = [];
            }
            animations[group].push({
                "id": id,
                "group": group,
                "duration": duration,
                "tracks": $(animation).children("m3d-track").length
            });
        }
    }

    let size = {
        "width": $.dom.getDevicePixels(200),
        "height": $.dom.getDevicePixels(340)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Animations of “${filename}”`,
        "resizable": "yes",
        "wire-id": id + "/animation-list"
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/animation-list/animation-list", {
        "id": id,
        "groups": Object.keys(animations).sort().map((group) => ({
            "name": group,
            "animations": animations[group]
        }))
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openResourceList = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(200),
        "height": $.dom.getDevicePixels(340)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("#")[0].split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Resources of “${filename}”`,
        "resizable": "yes",
        "wire-id": id + "/resource-list"
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/resource-list/resource-list", {
        "id": id
    });

    $.ajax(`/~pkmsm/model/files/${id}`, {
        "success": function (result) {

            let files = result.split("\n").map((file) => file.trim()).filter((file) => file);

            let groups = Object.create(null);

            for (let file of files) {
                let group = file.split("/").slice(0, -1).join("/");
                let filename = file.split("/").slice(-1)[0];
                let basename = filename.split(".").slice(0, -1).join(".");
                let extname = filename.split(".").slice(-1)[0];
                if (extname) {
                    extname = "." + extname;
                }
                if (!groups[group]) {
                    groups[group] = [];
                } 
                groups[group].push({
                    "group": group,
                    "id": file,
                    "filename": filename,
                    "basename": basename,
                    "extname": extname
                });
            }

            frame[0].frame.filler.fill({
                "groups": Object.keys(groups).map((name) => ({
                    "name": name,
                    "files": groups[name].sort((a, b) => a.id.localeCompare(b.id))
                }))
            });

        },
        "error": function () {
            console.error("Failed list reource files");
        }
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openImage = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(240)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": filename,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/image-viewer/image-viewer");

    frame[0].frame.filler.fill({
        "target": id
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openLUT = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(80)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": filename,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/lut-viewer/lut-viewer");

    frame[0].frame.filler.fill({
        "target": id
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();

};

App.prototype.openShader = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(240)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": filename,
        "resizable": "yes",
        "wire-id": id
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/shader-editor/shader-editor");

    $.ajax(`/~pkmsm/model/res/${id}`, {
        "dataType": "text",
        "success": (result) => {
            frame[0].frame.filler.fill({
                "code": result
            });
        },
        "error": () => {
            console.error("Failed to load shader codes");
        }
    });

    this.filler.query("#diagram").append(frame);

    frame[0].bringToFirst();
};

App.prototype.inspectModel = function (id, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(180)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Inspector of “${id}”`,
        "resizable": "yes",
        "wire-id": id + "/inspector"
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/model-inspector/model-inspector");

    this.filler.query("#diagram").append(frame);

    let meshes = [];
    for (let mesh of getM3DElements(this, id, "m3d-mesh")) {
        meshes.push(new MeshField(id, `m3d-mesh#${$(mesh).attr("id")}`, $(mesh).attr("name")));
    }

    let modelFrame = this.filler.query("#diagram ui-diagram-frame").filter((index, dom) => {
        return $(dom).attr("wire-id") === id;
    })[0];
    if (!modelFrame) {
        modelFrame = from;
    }

    let background = { "r": 255, "g": 255, "b": 255, "a": 255 };
    let scene = modelFrame.frame.filler.query("m3d-scene")[0];
    if (scene) {
        let clearColor = scene.m3dRenderer.modelBackgroundColor;
        background.r = clearColor.r * 255;
        background.g = clearColor.g * 255;
        background.b = clearColor.b * 255;
        background.a = scene.m3dRenderer.getClearAlpha() * 255;
    }

    let m3dShadow = modelFrame.filler.query("m3d-object").filter((index, element) => {
        let base = $(element).attr("base");
        return base && (base.split("/").slice(-1)[0] === "shadow");
    });

    frame[0].frame.filler.fill({
        "target": {
            "background": new BackgroundColorField(background),
            "shadow": new ToggleField(m3dShadow.attr("visible") !== "no", (value) => {

                let modelFrame = this.filler.query("#diagram ui-diagram-frame").filter((index, dom) => {
                    return $(dom).attr("wire-id") === id;
                })[0];
                if (!modelFrame) { return; }

                let m3dShadow = modelFrame.filler.query("m3d-object").filter((index, element) => {
                    let base = $(element).attr("base");
                    return base && (base.split("/").slice(-1)[0] === "shadow");
                });

                m3dShadow.attr("visible", value ? "yes" : "no");

                frame[0].frame.filler.parameters.target.shadow.value = value;
                frame[0].frame.filler.fill({});

                $.local["pkmsm.model-viewer.shadow"] = value;

            }),
            "outline": new ToggleField(
                modelFrame.filler.query("m3d-scene")[0].m3dRenderer.drawPokemonOutline !== false, (value) => {

                let modelFrame = this.filler.query("#diagram ui-diagram-frame").filter((index, dom) => {
                    return $(dom).attr("wire-id") === id;
                })[0];
                if (!modelFrame) { return; }

                modelFrame.filler.query("m3d-scene")[0].m3dRenderer.drawPokemonOutline = value;

                frame[0].frame.filler.parameters.target.outline.value = value;
                frame[0].frame.filler.fill({});

                $.local["pkmsm.model-viewer.outline"] = value;

            }),
            // "width": new NumberField(parseInt($(modelFrame).css("width")), (value) => {}),
            // "height": new NumberField(parseInt($(modelFrame).css("height")), (value) => {}),
            // "statusHelper": false,
            "meshes": meshes
        }
    });

    frame[0].bringToFirst();
};

App.prototype.inspectMesh = function (id, query, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(200)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Inspector of “${id} ${query}”`,
        "resizable": "yes",
        "wire-id": id + "/inspector/" + query
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/model-inspector/model-inspector");

    this.filler.query("#diagram").append(frame);

    let mesh = getM3DElements(this, id, query);

    let extra = $(mesh).attr("extra");
    if (extra) {
        extra = JSON.parse(extra);
    }
    let order = $(mesh).attr("rendering-order");
    order = order ? parseInt(order) : 0;
    if (!isFinite(order)) {
        order = 0;
    }

    let materials = $(mesh).attr("materials").split(";").map((material) => {
        return new MaterialField(id, "m3d-material#" + material);
    });

    frame[0].frame.filler.fill({
        "target": {
            "visible": true,
            "materials": materials,
            "order": order,
            "bones": extra.bones
        }
    });

    frame[0].bringToFirst();
};

App.prototype.inspectMaterial = function (id, query, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(360)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Inspector of “${id} ${query}”`,
        "resizable": "yes",
        "wire-id": id + "/inspector/" + query
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/model-inspector/model-inspector");

    this.filler.query("#diagram").append(frame);

    let material = getM3DElements(this, id, query);

    let materialExtra = $(material).attr("extra");
    if (materialExtra) {
        materialExtra = JSON.parse(materialExtra);
    }
    let textures = {};
    $(material).attr("textures").split(";").forEach((texture) => {
        let query = "m3d-texture#" + texture.split(":")[1];
        let name = getM3DElements(this, id, query).attr("name");
        textures[texture.split(":")[0].slice(1)] = new LinkField(id, query, name);
    });

    frame[0].frame.filler.fill({
        "target": {
            "vertexShader": new ResourceField(id, $(material).attr("vertex-shader").slice(1)),
            "fragmentShader": new ResourceField(id, $(material).attr("fragment-shader").slice(1)),
            "geometryShader": materialExtra.isGeometryShader === "yes",
            "polygonOffset": parseInt($(material).attr("polygon-offset")),
            "side": new TokenField($(material).attr("side")),
            "depthTest": new DepthField({
                "enabled": $(material).attr("depth-test") === "yes",
                "writable": $(material).attr("depth-write") === "yes",
                "function": new TokenField($(material).attr("depth-test-function")),
            }),
            "stencilTest": new StencilField({
                "enabled": $(material).attr("stencil-test") === "yes",
                "function": new TokenField($(material).attr("stencil-test-function")),
                "reference": parseInt($(material).attr("stencil-test-reference")),
                "testMask": parseInt($(material).attr("stencil-test-mask")),
                "writeMask": parseInt($(material).attr("stencil-write-mask")),
                "operator": new StencilOperationsField({
                    "failed": new TokenField($(material).attr("stencil-failed")),
                    "zFailed": new TokenField($(material).attr("stencil-z-failed")),
                    "zPassed": new TokenField($(material).attr("stencil-z-passed")),
                })
            }),
            "blending": new BlendingField({
                "destination": new TokenListField($(material).attr("blending-destination")),
                "equation": new TokenListField($(material).attr("blending-equation")),
                "source": new TokenListField($(material).attr("blending-source")),
            }),
            "textures": new TexturesField(textures)
        }
    });

    frame[0].bringToFirst();

};

App.prototype.inspectTexture = function (id, query, from) {

    let size = {
        "width": $.dom.getDevicePixels(240),
        "height": $.dom.getDevicePixels(200)
    };
    let position = this.getNextFrameTopLeft(from, size);

    let filename = id.split("/").slice(-1)[0];
    let frame = $("<ui-diagram-frame>").attr({
        "caption": `Inspector of “${id} ${query}”`,
        "resizable": "yes",
        "wire-id": id + "/inspector/" + query
    }).css({
        "left": position.left + "px",
        "top": position.top + "px",
        "width": size.width + "px",
        "height": size.height + "px",
    });

    frame[0].loadUI("/~pkmsm/frames/model-inspector/model-inspector");

    this.filler.query("#diagram").append(frame);

    let texture = getM3DElements(this, id, query);

    frame[0].frame.filler.fill({
        "target": {
            "src": new ResourceField(id, $(texture).attr("src").slice(1)),
            "wrapS": $(texture).attr("wrap-s") ? new TokenField($(texture).attr("wrap-s")) : undefined,
            "wrapT": $(texture).attr("wrap-t") ? new TokenField($(texture).attr("wrap-t")) : undefined,
            "minFilter": $(texture).attr("min-filter") ? new TokenField($(texture).attr("min-filter")) : undefined,
            "magFilter": $(texture).attr("mag-filter") ? new TokenField($(texture).attr("mag-filter")) : undefined,
            "mipmap": $(texture).attr("mipmap") !== undefined ? ($(texture).attr("mipmap") === "yes") : undefined,
            "offset": $(texture).attr("offset") ? new VectorField($(texture).attr("offset")) : undefined,
            "repeat": $(texture).attr("repeat") ? new VectorField($(texture).attr("repeat")) : undefined,
            "rotation": $(texture).attr("rotation") !== undefined ? parseFloat($(texture).attr("rotation")) : undefined,
        }
    });

    frame[0].bringToFirst();

};

App.prototype.smartOpen = function (id, from) {

    let frames = this.filler.query("#diagram").children("ui-diagram-frame");
    for (let frame of frames) {
        if ($(frame).attr("wire-id") === id) {
            frame.bringToFirst();
            return;
        }
    }

    let extname = id.split(".").slice(-1)[0];
    switch (extname) {
        case "png": { 
            if (id.split("/")[1] === "luts") {
                this.openLUT(id, from); 
            } else {
                this.openImage(id, from); 
            }
            break; 
        }
        case "vert": { this.openShader(id, from); break; }
        case "frag": { this.openShader(id, from); break; }
        default: { 
            if (/^pokemon-([0-9]+)-([0-9]+)$/.test(id)) {
                this.openModel(id, from);
            } else {
                console.log(`Unknown target[${id}]`);
            }
            break; 
        }
    }

};

App.prototype.loadModel = function (id, callback) {

    $.ajax(`/~pkmsm/model/${id}`, {
        "success": (result) => {
            $.ajax(`/~pkmsm/model/res/${result.id}/normal-model.xml`, {
                "dataType": "text",
                "success": (html) => {
                    $.ajax(`/~pkmsm/model/res/${result.id}/shadow/model.xml`, {
                        "dataType": "text",
                        "success": (html2) => {
                            callback(null, Object.assign(result, {
                                "html": {
                                    "model": html,
                                    "shadow": html2
                                }
                            }));
                        },
                        "error": () => {
                            callback(new Error("Failed to get model"));
                        }
                    });
                },
                "error": () => {
                    callback(new Error("Failed to get model"));
                }
            });
        }
    });

};

App.prototype.pickColor = function (color, callback) {

    if (!this.colorPicker) {
        this.colorPicker = this.createDialog("/dialogs/color-picker/color-picker", {
            "caption": "Color Picker",
            "left": 50, "top": 100,
            "width": $.dom.getDevicePixels(240), 
            "height": $.dom.getDevicePixels(340),
            "justHideWhenClose": true
        });
    }

    this.colorPicker.colorCallback = callback;

    this.colorPicker.setColor(color);
    
    this.colorPicker.dom.showDialog();

};

App.prototype.batchSnapshots = function () {

    let batchSnapshots = this.createDialog("/~pkmsm/dialogs/batch-snapshots/batch-snapshots", {
        "caption": "Batch Snapshots",
        "left": 50, "top": 100,
        "width": $.dom.getDevicePixels(360), 
        "height": $.dom.getDevicePixels(220)
    });

    batchSnapshots.dom.showDialog();

};

App.prototype.openPokeDEX = function () {

    if (!this.pokemonList) {
        this.pokemonList = this.createDialog("/~pkmsm/dialogs/pokemon-list/pokemon-list", {
            "caption": "Pokemon List",
            "left": 50, "top": 100,
            "width": $.dom.getDevicePixels(640), 
            "height": $.dom.getDevicePixels(400),
            "justHideWhenClose": true
        });
    }

    this.pokemonList.dom.showDialog();

};

App.prototype.captureSnapshot = function (id, size, callback) {

    let frame = this.openModel(id, undefined, {
        "icon": true,
        "paused": true,
        "finished": (error) => {
            if (error) {
                callback(error); return;
            }
            $.delay(500, () => {
                frame.frame.savePNGSnapshot();
                frame.closeFrame();
                callback();
            });
            
        }
    });

    let coast = $.dom.getDevicePixels(30);

    let diagram = this.filler.query("#diagram");

    let { scrollLeft, scrollTop, viewportLeft, viewportTop } = diagram[0];
    let { width, height } = diagram.css(["width", "height"]);
    width = parseFloat(width);
    height = parseFloat(height);

    let mins = [viewportLeft + scrollLeft, viewportTop + scrollTop];

    $(frame).css({
        "left": `${mins[0] + coast}px`,
        "top": `${mins[1] + coast + $.dom.getDevicePixels(40)}px`,
        "width": `${size.width}px`,
        "height": `${size.height}px`,
        "min-width": `${size.width}px`,
        "min-height": `${size.height}px`,
    });

};

App.prototype.title = "Pokemon Ultra Sun/Moon - 3DS";

App.functors = {
    "preventSystemShortcut": function (event) {
        if (event.altKey) {
            event.preventDefault();
        }
    },
    "advanceSearch": function (event) {

        switch (event.keyCode) {
            case 13: { // return
                if (this.searchOverlay) {
                    if (this.searchOverlay.filler.parameters.results) {
                        let item = this.searchOverlay.filler.parameters.results[0];
                        this.smartOpen(item.id);
                        event.target.blur();
                        this.searchOverlay.dom.hideOverlay();
                    }
                }
                break;
            };
            case 27: { // escape
                event.target.blur();
                if (this.searchOverlay) {
                    this.searchOverlay.dom.hideOverlay();
                }
                break;
            };
            default: {
                break;
            };
        }

    },
    "updateSearchResult": function () {

        let width = $.dom.getDevicePixels(340);
        let height = $.dom.getDevicePixels(400);

        let left = parseInt($("body").css("width")) - $.dom.getDevicePixels(60) - width - $.dom.getDevicePixels(6);
        let top = $.dom.getDevicePixels(40 + 6);

        if (!this.searchOverlay) {
            this.searchOverlay = this.createOverlay("~pkmsm/overlays/search/search", {
                "left": left, "top": top,
                "width": width, "height": height,
                "justHideWhenClose": true
            });
        } else {
            $(this.searchOverlay.dom).css({
                "left": `${left}px`, "top": `${top}px`
            });
        }

        let keyword = this.filler.query("ui-input-field").val();

        this.searchOverlay.searchWithKeyword(keyword);

        this.searchOverlay.dom.showOverlay();

    },
    "smartOpen": function (id) {

        this.smartOpen(id);
        
    },
    "batchSnapshots": function () {

        this.batchSnapshots();

    },
    "openPokeDEX": function () {

        this.openPokeDEX();

    }
};

module.exports.App = App;

module.exports.ToggleField = ToggleField;
module.exports.NumberField = NumberField;
module.exports.LinkField = LinkField;
module.exports.MaterialField = MaterialField;
module.exports.MeshField = MeshField;
module.exports.TokenField = TokenField;
module.exports.ResourceField = ResourceField;
module.exports.VectorField = VectorField;
module.exports.TokenListField = TokenListField;
module.exports.BackgroundColorField = BackgroundColorField;

module.exports.getM3DElements = getM3DElements;

const App = function App(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

App.prototype.title = "Hanxue - 3D Printer Helper";

App.functors = {
    "loadModel": function () {
        let that = this;
        let input = $("<input>").attr({
            "type": "file"
        }).css({
            "display": "none"
        }).on("change", function (event) {

            let file = this.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                let arrayBuffer = event.target.result;
                let dataView = new DataView(arrayBuffer);
                let count = dataView.getUint32(80, true);
                let offset = 84;
                for (let looper = 0; loope < count; ++looper) {
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
                    offset += 2;
                }
                console.log(count);
            };

            reader.readAsArrayBuffer(file);

        });
        $("body").append(input);
        input.click();
        input.detach();
    }
};

module.exports.App = App;

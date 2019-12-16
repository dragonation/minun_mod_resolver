module.exports = {
    "attributes": ["src"],
    "listeners": {
        "onconnected": function () {

            this.updateImageSize();

            this.resizeObserver = new ResizeObserver((entries) => {
                this.updateImageSize();
            });
            this.resizeObserver.observe(this);

        },
        "ondisconnected": function () {

            this.resizeObserver.disconnect(this);

        },
        "onupdated": function (name, value) {
            if (name === "src") {
                if (value) {
                    this.image = new Image();
                    this.image.onload = () => {
                        this.updateImageSize();
                    };
                    this.image.src = value;
                }
            }
        }
    },
    "methods": {
        "updateImageSize": function () {

            let size = $(this).css(["width", "height"]);
            size.width = parseFloat(size.width) - 2;
            size.height = parseFloat(size.height) - 2;
            if (this.image && this.image.width && this.image.height) {

                let width = this.image.width / this.image.height * size.height;
                let height = this.image.height / this.image.width * size.width;
                if (size.width / size.height < this.image.width / this.image.height) {
                    width = size.width;
                } else {
                    height = size.height;
                }

                this.filler.fill({
                    "image": this.image.src,
                    "imageSize": {
                        "width": width,
                        "height": height
                    }
                });

            } else {
                this.filler.fill({
                    "image": null,
                    "imageSize": null
                });
            }



        }
    }
};

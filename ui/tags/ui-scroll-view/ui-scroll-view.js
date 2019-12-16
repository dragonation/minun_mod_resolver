let minIndicatorLength = $.dom.getDevicePixels(24);
let barSize = $.dom.getDevicePixels(8);

const indicatorHidingDelay = 2000;

module.exports = {
    "attributes": [ "scroll-x", "scroll-y", "scroll-indicator" ],
    "listener": {
        "onconnected": function (filler) {
            if (this.getAttribute("scroll-indicator") === "yes") {
                if (!this.indicatorTimer) {
                    this.indicatorTimer = $.timer(100, () => {
                        this.updateIndicators();
                    });
                }
            }
        },
        "ondisconnected": function (filler) {
            let scrollView = this.filler.query("#contents")[0];
            if (this.indicatorTimer) {
                this.indicatorTimer.cancel();
                this.indicatorTimer = null;
            }
        },
        "onupdated": function (filler, name, value) {
            if (name === "scroll-indicator") {
                if (value === "yes") {
                    if (!this.indicatorTimer) {
                        this.indicatorTimer = $.timer(100, () => {
                            this.updateIndicators();
                        });
                    }
                } else {
                    if (this.indicatorTimer) {
                        this.indicatorTimer.cancel();
                        this.indicatorTimer = null;
                    }
                }
            }
        }
    },
    "methods": {
        "prepareDOMs": function () {

            if (this.query) { return; }

            this.query = $(this);

            this.query.lastScrollLeft = 0;
            this.query.lastScrollTop = 0;

            this.contents = this.filler.query("#contents");

            this.indicatorX = this.filler.query("#indicator-x");
            this.indicatorY = this.filler.query("#indicator-y");

        },
        "updateIndicators": function () {

            this.prepareDOMs();

            let scrollLeft = this.contents[0].scrollLeft;
            let clientWidth = this.contents[0].clientWidth;
            let scrollWidth = this.contents[0].scrollWidth;

            if ((this.contents[0].lastScrollLeft !== scrollLeft) ||
                (this.contents[0].lastClientWidth !== clientWidth) ||
                (this.contents[0].lastScrollWidth !== scrollWidth)) {

                this.contents[0].lastScrollLeft = scrollLeft;
                this.contents[0].lastClientWidth = clientWidth;
                this.contents[0].lastScrollWidth = scrollWidth;

                let barWidth = clientWidth - 2;
                if (this.getAttribute("scroll-y") === "yes") {
                    barWidth -= barSize;
                }

                let indicatorWidth = barWidth * clientWidth / scrollWidth;
                if (indicatorWidth < minIndicatorLength) {
                    indicatorWidth = minIndicatorLength;
                }

                if (indicatorWidth > barWidth) {
                    indicatorWidth = barWidth;
                }

                let indicatorLeft = (barWidth - indicatorWidth) * scrollLeft / (scrollWidth - clientWidth);

                this.indicatorX.css({
                    "width": indicatorWidth + "px",
                    "left": (1 + indicatorLeft) + "px"
                });

                if (clientWidth < scrollWidth) {
                    this.query.addClass("scrollable-x");
                } else {
                    this.query.removeClass("scrollable-x");
                }

            }

            let scrollTop = this.contents[0].scrollTop;
            let clientHeight = this.contents[0].clientHeight;
            let scrollHeight = this.contents[0].scrollHeight;

            if ((this.contents[0].lastScrollTop !== scrollTop) ||
                (this.contents[0].lastClientHeight !== clientHeight) ||
                (this.contents[0].lastScrollHeight !== scrollHeight)) {

                this.contents[0].lastScrollTop = scrollTop;
                this.contents[0].lastClientHeight = clientHeight;
                this.contents[0].lastScrollHeight = scrollHeight;

                let barHeight = clientHeight - 2;
                if (this.getAttribute("scroll-x") === "yes") {
                    barHeight -= barSize;
                }

                let indicatorHeight = barHeight * clientHeight / scrollHeight;
                if (indicatorHeight < minIndicatorLength) {
                    indicatorHeight = minIndicatorLength;
                }

                if (indicatorHeight > barHeight) {
                    indicatorHeight = barHeight;
                }

                let indicatorTop = (barHeight - indicatorHeight) * scrollTop / (scrollHeight - clientHeight);

                this.indicatorY.css({
                    "height": indicatorHeight + "px",
                    "top": (1 + indicatorTop) + "px"
                });

                if(clientHeight < scrollHeight) {
                    this.query.addClass("scrollable-y");
                } else {
                    this.query.removeClass("scrollable-y");
                }

            }

        }
    },
    "properties": {
        "scrollTop": {
            "get": function () {
                if (!this.contents) {
                    this.contents = this.filler.query("#contents");
                }
                return this.contents[0].scrollTop;
            },
            "set": function (value) {
                if (!this.contents) {
                    this.contents = this.filler.query("#contents");
                }
                this.contents[0].scrollTop = value;
                return true;
            }
        },
        "scrollHeight": {
            "get": function () {
                if (!this.contents) {
                    this.contents = this.filler.query("#contents");
                }
                return this.contents[0].scrollHeight;
            }
        },
        "scrollLeft": {
            "get": function () {
                if (!this.contents) {
                    this.contents = this.filler.query("#contents");
                }
                return this.contents[0].scrollLeft;
            },
            "set": function (value) {
                if (!this.contents) {
                    this.contents = this.filler.query("#contents");
                }
                this.contents[0].scrollLeft = value;
                return true;
            }
        },
        "scrollWidth": {
            "get": function () {
                if (!this.contents) {
                    this.contents = this.filler.query("#contents");
                }
                return this.contents[0].scrollWidth;
            }
        }
    },
    "functors": {
        "triggerScrollEvent": function () {
            $(this).trigger("scroll", {
                "scrollLeft": this.scrollLeft,
                "scrollTop": this.scrollTop
            });
        },
        "startDraggingIndicator": function (event, direction) {

            this.prepareDOMs();

            if (event.buttons !== 1) {
                return;
            }

            this.query.addClass("user-dragging-" + direction);

            if (direction === "y") {
                this.indicatorY.draggingScrollTop = this.contents[0].scrollTop;
                this.indicatorY.draggingY = event.pageY;
            } else {
                this.indicatorX.draggingScrollLeft = this.contents[0].scrollLeft;
                this.indicatorX.draggingX = event.pageX;
            }

            const onmousemove = (event) => {

                if (!(event.buttons & 1)) {
                    onmouseup(event);
                    return;
                }

                if (direction === "y") {

                    let clientHeight = this.contents[0].clientHeight;
                    let barHeight = clientHeight - 2;
                    if (this.getAttribute("scroll-x") === "yes") {
                        barHeight -= barSize;
                    }
                    let scrollHeight = this.contents[0].scrollHeight;

                    let indicatorHeight = barHeight * clientHeight / scrollHeight;
                    if (indicatorHeight < minIndicatorLength) {
                        indicatorHeight = minIndicatorLength;
                    }

                    let translation = $.dom.getDevicePixels(event.pageY - this.indicatorY.draggingY);

                    let scrollOffset = (scrollHeight - clientHeight) * translation / (barHeight - indicatorHeight);

                    let newScrollTop = this.indicatorY.draggingScrollTop + scrollOffset;
                    if (newScrollTop < 0) {
                        newScrollTop = 0;
                    }
                    if (newScrollTop > scrollHeight - clientHeight) {
                        newScrollTop = scrollHeight - clientHeight;
                    }

                    this.contents[0].scrollTop = newScrollTop;

                } else {

                    let clientWidth = this.contents[0].clientWidth;
                    let barWidth = clientWidth - 2;
                    if (this.getAttribute("scroll-y") === "yes") {
                        barWidth -= barSize;
                    }
                    let scrollWidth = this.contents[0].scrollWidth;

                    let indicatorWidth = barWidth * clientWidth / scrollWidth;
                    if (indicatorWidth < minIndicatorLength) {
                        indicatorWidth = minIndicatorLength;
                    }

                    let translation = $.dom.getDevicePixels(event.pageX - this.indicatorX.draggingX);

                    let scrollOffset = (scrollWidth - clientWidth) * translation / (barWidth - indicatorWidth);

                    let newScrollLeft = this.indicatorX.draggingScrollLeft + scrollOffset;
                    if (newScrollLeft < 0) {
                        newScrollLeft = 0;
                    }
                    if (newScrollLeft > scrollWidth - clientWidth) {
                        newScrollLeft = scrollWidth - clientWidth;
                    }

                    this.contents[0].scrollLeft = newScrollLeft;
                }

            };

            const onmouseup = (event) => {

                if (event.buttons & 1) {
                    return;
                }

                this.query.removeClass("user-dragging-" + direction);

                document.body.removeEventListener("mousemove", onmousemove);
                document.body.removeEventListener("mouseup", onmouseup);

            };

            document.body.addEventListener("mousemove", onmousemove);
            document.body.addEventListener("mouseup", onmouseup);

        },
        "updateIndicator": function (event) {

            this.prepareDOMs();

            let changings = {};
            if (this.query.lastScrollLeft !== this.scrollLeft) {
                changings.x = true;
                this.query.addClass("user-scrolling-x");
                this.query.lastScrollLeft = this.scrollLeft;
            }

            if (this.query.lastScrollTop !== this.scrollTop) {
                changings.y = true;
                this.query.addClass("user-scrolling-y");
                this.query.lastScrollTop = this.scrollTop;
            }

            if (changings.x || changings.y) {
                if (this.query.hasClass("user-touching") && (!this.query.hasClass("user-panning"))) {
                    this.query.addClass("user-panning");
                }
                this.updateIndicators();
            }

            if (changings.x) {
                this.indicatorX.lastEventDate = Date.now();
                if (!this.indicatorX.timer) {
                    this.indicatorX.timer = $.timer(100, () => {
                        let panning = this.query.hasClass("user-panning");
                        if ((!panning) &&
                            (Date.now() - this.indicatorX.lastEventDate > indicatorHidingDelay)) {
                            this.query.removeClass("user-scrolling-x");
                            this.indicatorX.timer.cancel();
                            this.indicatorX.timer = null;
                        }
                    });
                }
            }

            if (changings.y) {
                this.indicatorY.lastEventDate = Date.now();
                if (!this.indicatorY.timer) {
                    this.indicatorY.timer = $.timer(100, () => {
                        let panning = this.query.hasClass("user-panning");
                        if ((!panning) &&
                            (Date.now() - this.indicatorY.lastEventDate > indicatorHidingDelay)) {
                            this.query.removeClass("user-scrolling-y");
                            this.indicatorY.timer.cancel();
                            this.indicatorY.timer = null;
                        }
                    });
                }

            }

        },
        "recordTouching": function () {

            this.prepareDOMs();

            this.query.addClass("user-touching");

        },
        "unrecordTouching": function (event) {

            this.prepareDOMs();

            if (event.targetTouches.length === 0) {
                this.query.removeClass("user-touching user-panning");
            }

        }
    }
};

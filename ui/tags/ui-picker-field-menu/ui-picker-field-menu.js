module.exports = {
    "attributes": [ "items", "value", "scroll-padding-top", "scroll-padding-bottom" ],
    "methods": {
        "selectValue": function (value, extraPadding) {

            $(this).attr("value", value);

            let item = this.filler.query(".item").filter((index, element) => {
                return $(element).attr("value") === value;
            })[0];

            if (item) {
                this.filler.query("#container")[0].scrollIntoView(item, extraPadding);
            }

        }
    },
    "functors": {
        "activateItem": function (item) {
            $(this).trigger("activated", {
                "value": item.value
            });
        },
        "updateScrollPaddings": function (event) {

            if (this.scrollingJob) {
                this.scrollingJob.cancel();
                delete this.scrollingJob;
            }

            if ((!parseFloat($(this).attr("scroll-padding-top"))) && 
                (!parseFloat($(this).attr("scroll-padding-bottom")))) {
                return;
            }

            // usually 20 tps scrolling event
            this.scrollingJob = $.delay(200, () => {

                let scrollView = this.filler.query("ui-scroll-view")[0];

                let scrollPaddingTop = parseFloat($(this).attr("scroll-padding-top"));
                if (!isFinite(scrollPaddingTop)) {
                    scrollPaddingTop = 0;
                }

                let scrollPaddingBottom = $(this).attr("scroll-padding-bottom");
                if (!isFinite(scrollPaddingBottom)) {
                    scrollPaddingBottom = 0;
                }

                let scrollTop = scrollView.scrollTop;
                let scrollHeight = scrollView.scrollHeight;
                let clientHeight = scrollView.clientHeight;
                if (scrollPaddingTop && (scrollTop > 0)) {
                    let newScrollTop = Math.max(0, scrollTop - scrollPaddingTop);
                    let differenceTop = scrollTop - newScrollTop;
                    scrollPaddingTop -= differenceTop;
                    $(this).attr("scroll-padding-top", scrollPaddingTop);
                    scrollView.scrollTop = newScrollTop;
                    scrollTop = newScrollTop;
                }

                let realScrollHeight = scrollHeight - scrollPaddingBottom;
                if (scrollPaddingBottom) {
                    scrollPaddingBottom = Math.max(0, scrollTop + clientHeight - realScrollHeight);
                    $(this).attr("scroll-padding-bottom", scrollPaddingBottom);
                }

            });

        }
    }
};
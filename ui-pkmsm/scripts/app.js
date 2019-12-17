$.dom.registerTagTemplate("pkmsm", "~pkmsm/tags/${tag}/${tag}");

const App = function App(dom, filler) {

    this.dom = dom;
    this.filler = filler;

};

App.prototype.title = "Pokemon Ultra Sun/Moon - 3DS";

App.functors = {
};

module.exports.App = App;

function sym(name, random) {
  return typeof Symbol == "undefined"
    ? "__" + name + (random ? Math.floor(Math.random() * 1e8) : "")
    : random ? Symbol(name) : Symbol.for(name)
}

var COUNT = sym("\u037c"), SET = sym("styleSet", 1), RULES = sym("rules", 1)
var top = typeof global == "undefined" ? window : global

// :: (Object<Style>, number) → StyleModule
// Instances of this class bind the property names
// from `spec` to CSS class names that assign the styles in the
// corresponding property values.
//
// A style module can only be used in a given DOM root after it has
// been _mounted_ there with `StyleModule.mount`.
//
// Style modules should be created once and stored somewhere, as
// opposed to re-creating them every time you need them. The amount of
// CSS rules generated for a given DOM root is bounded by the amount
// of style modules that were used. So to avoid leaking rules, don't
// create these dynamically, but treat them as one-time allocations.
var StyleModule = exports.StyleModule = function(spec) {
  this[RULES] = []
  top[COUNT] = top[COUNT] || 1
  for (var name in spec) {
    var style = spec[name], specificity = style.specificity || 0
    var id = "\u037c" + (top[COUNT]++).toString(36)
    var selector = "." + id, className = id
    for (var i = 0; i < specificity; i++) {
      var name$1 = "\u037c_" + (i ? i.toString(36) : "")
      selector += "." + name$1
      className += " " + name$1
    }
    this[name] = className
    renderStyle(selector, spec[name], this[RULES])
  }
}

StyleModule.prototype = Object.create(null)

// :: (union<Document, ShadowRoot>, union<[StyleModule], StyleModule>)
//
// Mount the given set of modules in the given DOM root, which ensures
// that the CSS rules defined by the module are available in that
// context.
//
// Rules are only added to the document once per root.
//
// Rule order will follow the order of the modules, so that rules from
// modules later in the array take precedence of those from earlier
// modules. If you call this function multiple times for the same root
// in a way that changes the order of already mounted modules, the old
// order will be changed.
StyleModule.mount = function(root, modules) {
  (root[SET] || new StyleSet(root)).mount(Array.isArray(modules) ? modules : [modules])
}

var StyleSet = function StyleSet(root) {
  this.root = root
  root[SET] = this
  this.styleTag = (root.ownerDocument || root).createElement("style")
  var target = root.head || root
  target.insertBefore(this.styleTag, target.firstChild)
  this.modules = []
};

StyleSet.prototype.mount = function mount (modules) {
  var sheet = this.styleTag.sheet, reset = !sheet
  var pos = 0 /* Current rule offset */, j = 0 /* Index into this.modules */
  for (var i = 0; i < modules.length; i++) {
    var mod = modules[i], index = this.modules.indexOf(mod)
    if (index < j && index > -1) { // Ordering conflict
      this.modules.splice(index, 1)
      j--
      index = -1
    }
    if (index == -1) {
      this.modules.splice(j++, 0, mod)
      if (!reset) { for (var k = 0; k < mod[RULES].length; k++)
        { sheet.insertRule(mod[RULES][k], pos++) } }
    } else {
      while (j < index) { pos += this.modules[j++][RULES].length }
      pos += mod[RULES].length
      j++
    }
  }

  if (reset) {
    var text = ""
    for (var i$1 = 0; i$1 < this.modules.length; i$1++)
      { text += this.modules[i$1][RULES].join("\n") + "\n" }
    this.styleTag.textContent = text
  }
};

function renderStyle(selector, spec, output) {
  if (typeof spec != "object") { throw new RangeError("Expected style object, got " + JSON.stringify(spec)) }
  var props = []
  for (var prop in spec) {
    if (/^@/.test(prop)) {
      var local = []
      renderStyle(selector, spec[prop], local)
      output.push(prop + " {" + local.join(" ") + "}")
    } else if (/&/.test(prop)) {
      renderStyle(prop.replace(/&/g, selector), spec[prop], output)
    } else if (prop != "specificity") {
      if (typeof spec[prop] == "object") { throw new RangeError("The value of a property (" + prop + ") should be a primitive value.") }
      props.push(prop.replace(/_.*/, "").replace(/[A-Z]/g, function (l) { return "-" + l.toLowerCase(); }) + ": " + spec[prop])
    }
  }
  if (props.length) { output.push(selector + " {" + props.join("; ") + "}") }
}

// Style::Object<union<Style,string>>
//
// A style is an object that, in the simple case, maps CSS property
// names to strings holding their values, as in `{color: "red",
// fontWeight: "bold"}`. The property names can be given in
// camel-case—the library will insert a dash before capital letters
// when converting them to CSS.
//
// If you include an underscore in a property name, it and everything
// after it will be removed from the output, which can be useful when
// providing a property multiple times, for browser compatibility
// reasons.
//
// A property in a style object can also be a sub-selector, which
// extends the current context to add a pseudo-selector or a child
// selector. Such a property should contain a `&` character, which
// will be replaced by the current selector. For example `{"&:before":
// {content: '"hi"'}}`. Sub-selectors and regular properties can
// freely be mixed in a given object. Any property containing a `&` is
// assumed to be a sub-selector.
//
// Finally, a property can specify an @-block to be wrapped around the
// styles defined inside the object that's the property's value. For
// example to create a media query you can do `{"@media screen and
// (min-width: 400px)": {...}}`.


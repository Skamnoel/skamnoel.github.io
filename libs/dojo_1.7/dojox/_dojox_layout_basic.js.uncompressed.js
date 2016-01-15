require({cache:{
'dijit/a11y':function(){
define("dijit/a11y", [
	"dojo/_base/array", // array.forEach array.map
	"dojo/dom",			// dom.byId
	"dojo/dom-attr", // domAttr.attr domAttr.has
	"dojo/dom-style", // domStyle.style
	"dojo/_base/lang", // lang.mixin()
	"dojo/_base/sniff", // has("ie") 1
	"./main"	// for exporting methods to dijit namespace
], function(array, dom, domAttr, domStyle, lang, has, dijit){

	// module:
	//		dijit/a11y

	var undefined;

	var a11y = {
		// summary:
		//		Accessibility utility functions (keyboard, tab stops, etc.)

		_isElementShown: function(/*Element*/ elem){
			var s = domStyle.get(elem);
			return (s.visibility != "hidden")
				&& (s.visibility != "collapsed")
				&& (s.display != "none")
				&& (domAttr.get(elem, "type") != "hidden");
		},

		hasDefaultTabStop: function(/*Element*/ elem){
			// summary:
			//		Tests if element is tab-navigable even without an explicit tabIndex setting

			// No explicit tabIndex setting, need to investigate node type
			switch(elem.nodeName.toLowerCase()){
				case "a":
					// An <a> w/out a tabindex is only navigable if it has an href
					return domAttr.has(elem, "href");
				case "area":
				case "button":
				case "input":
				case "object":
				case "select":
				case "textarea":
					// These are navigable by default
					return true;
				case "iframe":
					// If it's an editor <iframe> then it's tab navigable.
					var body;
					try{
						// non-IE
						var contentDocument = elem.contentDocument;
						if("designMode" in contentDocument && contentDocument.designMode == "on"){
							return true;
						}
						body = contentDocument.body;
					}catch(e1){
						// contentWindow.document isn't accessible within IE7/8
						// if the iframe.src points to a foreign url and this
						// page contains an element, that could get focus
						try{
							body = elem.contentWindow.document.body;
						}catch(e2){
							return false;
						}
					}
					return body && (body.contentEditable == 'true' ||
						(body.firstChild && body.firstChild.contentEditable == 'true'));
				default:
					return elem.contentEditable == 'true';
			}
		},

		effectiveTabIndex: function(/*Element*/ elem){
			// summary:
			//		Returns effective tabIndex of an element, either a number, or undefined if element isn't focusable.

			if(domAttr.get(elem, "disabled")){
				return undefined;
			}else if(domAttr.has(elem, "tabIndex")){
				// Explicit tab index setting
				return +domAttr.get(elem, "tabIndex");// + to convert string --> number
			}else{
				// No explicit tabIndex setting, so depends on node type
				return a11y.hasDefaultTabStop(elem) ? 0 : undefined;
			}
		},

		isTabNavigable: function(/*Element*/ elem){
			// summary:
			//		Tests if an element is tab-navigable

			return a11y.effectiveTabIndex(elem) >= 0;
		},

		isFocusable: function(/*Element*/ elem){
			// summary:
			//		Tests if an element is focusable by tabbing to it, or clicking it with the mouse.

			return a11y.effectiveTabIndex(elem) >= -1;
		},

		_getTabNavigable: function(/*DOMNode*/ root){
			// summary:
			//		Finds descendants of the specified root node.
			// description:
			//		Finds the following descendants of the specified root node:
			//
			//		- the first tab-navigable element in document order
			//		  without a tabIndex or with tabIndex="0"
			//		- the last tab-navigable element in document order
			//		  without a tabIndex or with tabIndex="0"
			//		- the first element in document order with the lowest
			//		  positive tabIndex value
			//		- the last element in document order with the highest
			//		  positive tabIndex value
			var first, last, lowest, lowestTabindex, highest, highestTabindex, radioSelected = {};

			function radioName(node){
				// If this element is part of a radio button group, return the name for that group.
				return node && node.tagName.toLowerCase() == "input" &&
					node.type && node.type.toLowerCase() == "radio" &&
					node.name && node.name.toLowerCase();
			}

			var shown = a11y._isElementShown, effectiveTabIndex = a11y.effectiveTabIndex;
			var walkTree = function(/*DOMNode*/ parent){
				for(var child = parent.firstChild; child; child = child.nextSibling){
					// Skip text elements, hidden elements, and also non-HTML elements (those in custom namespaces) in IE,
					// since show() invokes getAttribute("type"), which crash on VML nodes in IE.
					if(child.nodeType != 1 || (has("ie") <= 9 && child.scopeName !== "HTML") || !shown(child)){
						continue;
					}

					var tabindex = effectiveTabIndex(child);
					if(tabindex >= 0){
						if(tabindex == 0){
							if(!first){
								first = child;
							}
							last = child;
						}else if(tabindex > 0){
							if(!lowest || tabindex < lowestTabindex){
								lowestTabindex = tabindex;
								lowest = child;
							}
							if(!highest || tabindex >= highestTabindex){
								highestTabindex = tabindex;
								highest = child;
							}
						}
						var rn = radioName(child);
						if(domAttr.get(child, "checked") && rn){
							radioSelected[rn] = child;
						}
					}
					if(child.nodeName.toUpperCase() != 'SELECT'){
						walkTree(child);
					}
				}
			};
			if(shown(root)){
				walkTree(root);
			}
			function rs(node){
				// substitute checked radio button for unchecked one, if there is a checked one with the same name.
				return radioSelected[radioName(node)] || node;
			}

			return { first: rs(first), last: rs(last), lowest: rs(lowest), highest: rs(highest) };
		},

		getFirstInTabbingOrder: function(/*String|DOMNode*/ root, /*Document?*/ doc){
			// summary:
			//		Finds the descendant of the specified root node
			//		that is first in the tabbing order
			var elems = a11y._getTabNavigable(dom.byId(root, doc));
			return elems.lowest ? elems.lowest : elems.first; // DomNode
		},

		getLastInTabbingOrder: function(/*String|DOMNode*/ root, /*Document?*/ doc){
			// summary:
			//		Finds the descendant of the specified root node
			//		that is last in the tabbing order
			var elems = a11y._getTabNavigable(dom.byId(root, doc));
			return elems.last ? elems.last : elems.highest; // DomNode
		}
	};

	1 && lang.mixin(dijit, a11y);

	return a11y;
});

},
'dijit/_WidgetBase':function(){
define("dijit/_WidgetBase", [
	"require",			// require.toUrl
	"dojo/_base/array", // array.forEach array.map
	"dojo/aspect",
	"dojo/_base/config", // config.blankGif
	"dojo/_base/connect", // connect.connect
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.byId
	"dojo/dom-attr", // domAttr.set domAttr.remove
	"dojo/dom-class", // domClass.add domClass.replace
	"dojo/dom-construct", // domConstruct.create domConstruct.destroy domConstruct.place
	"dojo/dom-geometry",	// isBodyLtr
	"dojo/dom-style", // domStyle.set, domStyle.get
	"dojo/_base/kernel",
	"dojo/_base/lang", // mixin(), isArray(), etc.
	"dojo/on",
	"dojo/ready",
	"dojo/Stateful", // Stateful
	"dojo/topic",
	"dojo/_base/window", // win.doc.createTextNode
	"./registry"	// registry.getUniqueId(), registry.findWidgets()
], function(require, array, aspect, config, connect, declare,
			dom, domAttr, domClass, domConstruct, domGeometry, domStyle, kernel,
			lang, on, ready, Stateful, topic, win, registry){

/*=====
var Stateful = dojo.Stateful;
=====*/

// module:
//		dijit/_WidgetBase
// summary:
//		Future base class for all Dijit widgets.

// For back-compat, remove in 2.0.
if(!kernel.isAsync){
	ready(0, function(){
		var requires = ["dijit/_base/manager"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}

// Nested hash listing attributes for each tag, all strings in lowercase.
// ex: {"div": {"style": true, "tabindex" true}, "form": { ...
var tagAttrs = {};
function getAttrs(obj){
	var ret = {};
	for(var attr in obj){
		ret[attr.toLowerCase()] = true;
	}
	return ret;
}

function nonEmptyAttrToDom(attr){
	// summary:
	//		Returns a setter function that copies the attribute to this.domNode,
	//		or removes the attribute from this.domNode, depending on whether the
	//		value is defined or not.
	return function(val){
		domAttr[val ? "set" : "remove"](this.domNode, attr, val);
		this._set(attr, val);
	};
}

function isEqual(a, b){
	// summary:
	//		Function that determines whether two values are identical,
	//		taking into account that NaN is not normally equal to itself
	//		in JS.

	return a === b || (/* a is NaN */ a !== a && /* b is NaN */ b !== b);
}

return declare("dijit._WidgetBase", Stateful, {
	// summary:
	//		Future base class for all Dijit widgets.
	// description:
	//		Future base class for all Dijit widgets.
	//		_Widget extends this class adding support for various features needed by desktop.
	//
	//		Provides stubs for widget lifecycle methods for subclasses to extend, like postMixInProperties(), buildRendering(),
	//		postCreate(), startup(), and destroy(), and also public API methods like set(), get(), and watch().
	//
	//		Widgets can provide custom setters/getters for widget attributes, which are called automatically by set(name, value).
	//		For an attribute XXX, define methods _setXXXAttr() and/or _getXXXAttr().
	//
	//		_setXXXAttr can also be a string/hash/array mapping from a widget attribute XXX to the widget's DOMNodes:
	//
	//		- DOM node attribute
	// |		_setFocusAttr: {node: "focusNode", type: "attribute"}
	// |		_setFocusAttr: "focusNode"	(shorthand)
	// |		_setFocusAttr: ""		(shorthand, maps to this.domNode)
	// 		Maps this.focus to this.focusNode.focus, or (last example) this.domNode.focus
	//
	//		- DOM node innerHTML
	//	|		_setTitleAttr: { node: "titleNode", type: "innerHTML" }
	//		Maps this.title to this.titleNode.innerHTML
	//
	//		- DOM node innerText
	//	|		_setTitleAttr: { node: "titleNode", type: "innerText" }
	//		Maps this.title to this.titleNode.innerText
	//
	//		- DOM node CSS class
	// |		_setMyClassAttr: { node: "domNode", type: "class" }
	//		Maps this.myClass to this.domNode.className
	//
	//		If the value of _setXXXAttr is an array, then each element in the array matches one of the
	//		formats of the above list.
	//
	//		If the custom setter is null, no action is performed other than saving the new value
	//		in the widget (in this).
	//
	//		If no custom setter is defined for an attribute, then it will be copied
	//		to this.focusNode (if the widget defines a focusNode), or this.domNode otherwise.
	//		That's only done though for attributes that match DOMNode attributes (title,
	//		alt, aria-labelledby, etc.)

	// id: [const] String
	//		A unique, opaque ID string that can be assigned by users or by the
	//		system. If the developer passes an ID which is known not to be
	//		unique, the specified ID is ignored and the system-generated ID is
	//		used instead.
	id: "",
	_setIdAttr: "domNode",	// to copy to this.domNode even for auto-generated id's

	// lang: [const] String
	//		Rarely used.  Overrides the default Dojo locale used to render this widget,
	//		as defined by the [HTML LANG](http://www.w3.org/TR/html401/struct/dirlang.html#adef-lang) attribute.
	//		Value must be among the list of locales specified during by the Dojo bootstrap,
	//		formatted according to [RFC 3066](http://www.ietf.org/rfc/rfc3066.txt) (like en-us).
	lang: "",
	// set on domNode even when there's a focus node.   but don't set lang="", since that's invalid.
	_setLangAttr: nonEmptyAttrToDom("lang"),

	// dir: [const] String
	//		Bi-directional support, as defined by the [HTML DIR](http://www.w3.org/TR/html401/struct/dirlang.html#adef-dir)
	//		attribute. Either left-to-right "ltr" or right-to-left "rtl".  If undefined, widgets renders in page's
	//		default direction.
	dir: "",
	// set on domNode even when there's a focus node.   but don't set dir="", since that's invalid.
	_setDirAttr: nonEmptyAttrToDom("dir"),	// to set on domNode even when there's a focus node

	// textDir: String
	//		Bi-directional support,	the main variable which is responsible for the direction of the text.
	//		The text direction can be different than the GUI direction by using this parameter in creation
	//		of a widget.
	// 		Allowed values:
	//			1. "ltr"
	//			2. "rtl"
	//			3. "auto" - contextual the direction of a text defined by first strong letter.
	//		By default is as the page direction.
	textDir: "",

	// class: String
	//		HTML class attribute
	"class": "",
	_setClassAttr: { node: "domNode", type: "class" },

	// style: String||Object
	//		HTML style attributes as cssText string or name/value hash
	style: "",

	// title: String
	//		HTML title attribute.
	//
	//		For form widgets this specifies a tooltip to display when hovering over
	//		the widget (just like the native HTML title attribute).
	//
	//		For TitlePane or for when this widget is a child of a TabContainer, AccordionContainer,
	//		etc., it's used to specify the tab label, accordion pane title, etc.
	title: "",

	// tooltip: String
	//		When this widget's title attribute is used to for a tab label, accordion pane title, etc.,
	//		this specifies the tooltip to appear when the mouse is hovered over that text.
	tooltip: "",

	// baseClass: [protected] String
	//		Root CSS class of the widget (ex: dijitTextBox), used to construct CSS classes to indicate
	//		widget state.
	baseClass: "",

	// srcNodeRef: [readonly] DomNode
	//		pointer to original DOM node
	srcNodeRef: null,

	// domNode: [readonly] DomNode
	//		This is our visible representation of the widget! Other DOM
	//		Nodes may by assigned to other properties, usually through the
	//		template system's data-dojo-attach-point syntax, but the domNode
	//		property is the canonical "top level" node in widget UI.
	domNode: null,

	// containerNode: [readonly] DomNode
	//		Designates where children of the source DOM node will be placed.
	//		"Children" in this case refers to both DOM nodes and widgets.
	//		For example, for myWidget:
	//
	//		|	<div data-dojo-type=myWidget>
	//		|		<b> here's a plain DOM node
	//		|		<span data-dojo-type=subWidget>and a widget</span>
	//		|		<i> and another plain DOM node </i>
	//		|	</div>
	//
	//		containerNode would point to:
	//
	//		|		<b> here's a plain DOM node
	//		|		<span data-dojo-type=subWidget>and a widget</span>
	//		|		<i> and another plain DOM node </i>
	//
	//		In templated widgets, "containerNode" is set via a
	//		data-dojo-attach-point assignment.
	//
	//		containerNode must be defined for any widget that accepts innerHTML
	//		(like ContentPane or BorderContainer or even Button), and conversely
	//		is null for widgets that don't, like TextBox.
	containerNode: null,

/*=====
	// _started: Boolean
	//		startup() has completed.
	_started: false,
=====*/

	// attributeMap: [protected] Object
	//		Deprecated.   Instead of attributeMap, widget should have a _setXXXAttr attribute
	//		for each XXX attribute to be mapped to the DOM.
	//
	//		attributeMap sets up a "binding" between attributes (aka properties)
	//		of the widget and the widget's DOM.
	//		Changes to widget attributes listed in attributeMap will be
	//		reflected into the DOM.
	//
	//		For example, calling set('title', 'hello')
	//		on a TitlePane will automatically cause the TitlePane's DOM to update
	//		with the new title.
	//
	//		attributeMap is a hash where the key is an attribute of the widget,
	//		and the value reflects a binding to a:
	//
	//		- DOM node attribute
	// |		focus: {node: "focusNode", type: "attribute"}
	// 		Maps this.focus to this.focusNode.focus
	//
	//		- DOM node innerHTML
	//	|		title: { node: "titleNode", type: "innerHTML" }
	//		Maps this.title to this.titleNode.innerHTML
	//
	//		- DOM node innerText
	//	|		title: { node: "titleNode", type: "innerText" }
	//		Maps this.title to this.titleNode.innerText
	//
	//		- DOM node CSS class
	// |		myClass: { node: "domNode", type: "class" }
	//		Maps this.myClass to this.domNode.className
	//
	//		If the value is an array, then each element in the array matches one of the
	//		formats of the above list.
	//
	//		There are also some shorthands for backwards compatibility:
	//		- string --> { node: string, type: "attribute" }, for example:
	//	|	"focusNode" ---> { node: "focusNode", type: "attribute" }
	//		- "" --> { node: "domNode", type: "attribute" }
	attributeMap: {},

	// _blankGif: [protected] String
	//		Path to a blank 1x1 image.
	//		Used by <img> nodes in templates that really get their image via CSS background-image.
	_blankGif: config.blankGif || require.toUrl("dojo/resources/blank.gif"),

	//////////// INITIALIZATION METHODS ///////////////////////////////////////

	postscript: function(/*Object?*/params, /*DomNode|String*/srcNodeRef){
		// summary:
		//		Kicks off widget instantiation.  See create() for details.
		// tags:
		//		private
		this.create(params, srcNodeRef);
	},

	create: function(/*Object?*/params, /*DomNode|String?*/srcNodeRef){
		// summary:
		//		Kick off the life-cycle of a widget
		// params:
		//		Hash of initialization parameters for widget, including
		//		scalar values (like title, duration etc.) and functions,
		//		typically callbacks like onClick.
		// srcNodeRef:
		//		If a srcNodeRef (DOM node) is specified:
		//			- use srcNodeRef.innerHTML as my contents
		//			- if this is a behavioral widget then apply behavior
		//			  to that srcNodeRef
		//			- otherwise, replace srcNodeRef with my generated DOM
		//			  tree
		// description:
		//		Create calls a number of widget methods (postMixInProperties, buildRendering, postCreate,
		//		etc.), some of which of you'll want to override. See http://dojotoolkit.org/reference-guide/dijit/_WidgetBase.html
		//		for a discussion of the widget creation lifecycle.
		//
		//		Of course, adventurous developers could override create entirely, but this should
		//		only be done as a last resort.
		// tags:
		//		private

		// store pointer to original DOM tree
		this.srcNodeRef = dom.byId(srcNodeRef);

		// For garbage collection.  An array of listener handles returned by this.connect() / this.subscribe()
		this._connects = [];

		// For widgets internal to this widget, invisible to calling code
		this._supportingWidgets = [];

		// this is here for back-compat, remove in 2.0 (but check NodeList-instantiate.html test)
		if(this.srcNodeRef && (typeof this.srcNodeRef.id == "string")){ this.id = this.srcNodeRef.id; }

		// mix in our passed parameters
		if(params){
			this.params = params;
			lang.mixin(this, params);
		}
		this.postMixInProperties();

		// generate an id for the widget if one wasn't specified
		// (be sure to do this before buildRendering() because that function might
		// expect the id to be there.)
		if(!this.id){
			this.id = registry.getUniqueId(this.declaredClass.replace(/\./g,"_"));
		}
		registry.add(this);

		this.buildRendering();

		if(this.domNode){
			// Copy attributes listed in attributeMap into the [newly created] DOM for the widget.
			// Also calls custom setters for all attributes with custom setters.
			this._applyAttributes();

			// If srcNodeRef was specified, then swap out original srcNode for this widget's DOM tree.
			// For 2.0, move this after postCreate().  postCreate() shouldn't depend on the
			// widget being attached to the DOM since it isn't when a widget is created programmatically like
			// new MyWidget({}).   See #11635.
			var source = this.srcNodeRef;
			if(source && source.parentNode && this.domNode !== source){
				source.parentNode.replaceChild(this.domNode, source);
			}
		}

		if(this.domNode){
			// Note: for 2.0 may want to rename widgetId to dojo._scopeName + "_widgetId",
			// assuming that dojo._scopeName even exists in 2.0
			this.domNode.setAttribute("widgetId", this.id);
		}
		this.postCreate();

		// If srcNodeRef has been processed and removed from the DOM (e.g. TemplatedWidget) then delete it to allow GC.
		if(this.srcNodeRef && !this.srcNodeRef.parentNode){
			delete this.srcNodeRef;
		}

		this._created = true;
	},

	_applyAttributes: function(){
		// summary:
		//		Step during widget creation to copy  widget attributes to the
		//		DOM according to attributeMap and _setXXXAttr objects, and also to call
		//		custom _setXXXAttr() methods.
		//
		//		Skips over blank/false attribute values, unless they were explicitly specified
		//		as parameters to the widget, since those are the default anyway,
		//		and setting tabIndex="" is different than not setting tabIndex at all.
		//
		//		For backwards-compatibility reasons attributeMap overrides _setXXXAttr when
		//		_setXXXAttr is a hash/string/array, but _setXXXAttr as a functions override attributeMap.
		// tags:
		//		private

		// Get list of attributes where this.set(name, value) will do something beyond
		// setting this[name] = value.  Specifically, attributes that have:
		//		- associated _setXXXAttr() method/hash/string/array
		//		- entries in attributeMap.
		var ctor = this.constructor,
			list = ctor._setterAttrs;
		if(!list){
			list = (ctor._setterAttrs = []);
			for(var attr in this.attributeMap){
				list.push(attr);
			}

			var proto = ctor.prototype;
			for(var fxName in proto){
				if(fxName in this.attributeMap){ continue; }
				var setterName = "_set" + fxName.replace(/^[a-z]|-[a-zA-Z]/g, function(c){ return c.charAt(c.length-1).toUpperCase(); }) + "Attr";
				if(setterName in proto){
					list.push(fxName);
				}
			}
		}

		// Call this.set() for each attribute that was either specified as parameter to constructor,
		// or was found above and has a default non-null value.   For correlated attributes like value and displayedValue, the one
		// specified as a parameter should take precedence, so apply attributes in this.params last.
		// Particularly important for new DateTextBox({displayedValue: ...}) since DateTextBox's default value is
		// NaN and thus is not ignored like a default value of "".
		array.forEach(list, function(attr){
			if(this.params && attr in this.params){
				// skip this one, do it below
			}else if(this[attr]){
				this.set(attr, this[attr]);
			}
		}, this);
		for(var param in this.params){
			this.set(param, this[param]);
		}
	},

	postMixInProperties: function(){
		// summary:
		//		Called after the parameters to the widget have been read-in,
		//		but before the widget template is instantiated. Especially
		//		useful to set properties that are referenced in the widget
		//		template.
		// tags:
		//		protected
	},

	buildRendering: function(){
		// summary:
		//		Construct the UI for this widget, setting this.domNode.
		//		Most widgets will mixin `dijit._TemplatedMixin`, which implements this method.
		// tags:
		//		protected

		if(!this.domNode){
			// Create root node if it wasn't created by _Templated
			this.domNode = this.srcNodeRef || domConstruct.create('div');
		}

		// baseClass is a single class name or occasionally a space-separated list of names.
		// Add those classes to the DOMNode.  If RTL mode then also add with Rtl suffix.
		// TODO: make baseClass custom setter
		if(this.baseClass){
			var classes = this.baseClass.split(" ");
			if(!this.isLeftToRight()){
				classes = classes.concat( array.map(classes, function(name){ return name+"Rtl"; }));
			}
			domClass.add(this.domNode, classes);
		}
	},

	postCreate: function(){
		// summary:
		//		Processing after the DOM fragment is created
		// description:
		//		Called after the DOM fragment has been created, but not necessarily
		//		added to the document.  Do not include any operations which rely on
		//		node dimensions or placement.
		// tags:
		//		protected
	},

	startup: function(){
		// summary:
		//		Processing after the DOM fragment is added to the document
		// description:
		//		Called after a widget and its children have been created and added to the page,
		//		and all related widgets have finished their create() cycle, up through postCreate().
		//		This is useful for composite widgets that need to control or layout sub-widgets.
		//		Many layout widgets can use this as a wiring phase.
		if(this._started){ return; }
		this._started = true;
		array.forEach(this.getChildren(), function(obj){
			if(!obj._started && !obj._destroyed && lang.isFunction(obj.startup)){
				obj.startup();
				obj._started = true;
			}
		});
	},

	//////////// DESTROY FUNCTIONS ////////////////////////////////

	destroyRecursive: function(/*Boolean?*/ preserveDom){
		// summary:
		// 		Destroy this widget and its descendants
		// description:
		//		This is the generic "destructor" function that all widget users
		// 		should call to cleanly discard with a widget. Once a widget is
		// 		destroyed, it is removed from the manager object.
		// preserveDom:
		//		If true, this method will leave the original DOM structure
		//		alone of descendant Widgets. Note: This will NOT work with
		//		dijit._Templated widgets.

		this._beingDestroyed = true;
		this.destroyDescendants(preserveDom);
		this.destroy(preserveDom);
	},

	destroy: function(/*Boolean*/ preserveDom){
		// summary:
		// 		Destroy this widget, but not its descendants.
		//		This method will, however, destroy internal widgets such as those used within a template.
		// preserveDom: Boolean
		//		If true, this method will leave the original DOM structure alone.
		//		Note: This will not yet work with _Templated widgets

		this._beingDestroyed = true;
		this.uninitialize();

		// remove this.connect() and this.subscribe() listeners
		var c;
		while((c = this._connects.pop())){
			c.remove();
		}

		// destroy widgets created as part of template, etc.
		var w;
		while((w = this._supportingWidgets.pop())){
			if(w.destroyRecursive){
				w.destroyRecursive();
			}else if(w.destroy){
				w.destroy();
			}
		}

		this.destroyRendering(preserveDom);
		registry.remove(this.id);
		this._destroyed = true;
	},

	destroyRendering: function(/*Boolean?*/ preserveDom){
		// summary:
		//		Destroys the DOM nodes associated with this widget
		// preserveDom:
		//		If true, this method will leave the original DOM structure alone
		//		during tear-down. Note: this will not work with _Templated
		//		widgets yet.
		// tags:
		//		protected

		if(this.bgIframe){
			this.bgIframe.destroy(preserveDom);
			delete this.bgIframe;
		}

		if(this.domNode){
			if(preserveDom){
				domAttr.remove(this.domNode, "widgetId");
			}else{
				domConstruct.destroy(this.domNode);
			}
			delete this.domNode;
		}

		if(this.srcNodeRef){
			if(!preserveDom){
				domConstruct.destroy(this.srcNodeRef);
			}
			delete this.srcNodeRef;
		}
	},

	destroyDescendants: function(/*Boolean?*/ preserveDom){
		// summary:
		//		Recursively destroy the children of this widget and their
		//		descendants.
		// preserveDom:
		//		If true, the preserveDom attribute is passed to all descendant
		//		widget's .destroy() method. Not for use with _Templated
		//		widgets.

		// get all direct descendants and destroy them recursively
		array.forEach(this.getChildren(), function(widget){
			if(widget.destroyRecursive){
				widget.destroyRecursive(preserveDom);
			}
		});
	},

	uninitialize: function(){
		// summary:
		//		Stub function. Override to implement custom widget tear-down
		//		behavior.
		// tags:
		//		protected
		return false;
	},

	////////////////// GET/SET, CUSTOM SETTERS, ETC. ///////////////////

	_setStyleAttr: function(/*String||Object*/ value){
		// summary:
		//		Sets the style attribute of the widget according to value,
		//		which is either a hash like {height: "5px", width: "3px"}
		//		or a plain string
		// description:
		//		Determines which node to set the style on based on style setting
		//		in attributeMap.
		// tags:
		//		protected

		var mapNode = this.domNode;

		// Note: technically we should revert any style setting made in a previous call
		// to his method, but that's difficult to keep track of.

		if(lang.isObject(value)){
			domStyle.set(mapNode, value);
		}else{
			if(mapNode.style.cssText){
				mapNode.style.cssText += "; " + value;
			}else{
				mapNode.style.cssText = value;
			}
		}

		this._set("style", value);
	},

	_attrToDom: function(/*String*/ attr, /*String*/ value, /*Object?*/ commands){
		// summary:
		//		Reflect a widget attribute (title, tabIndex, duration etc.) to
		//		the widget DOM, as specified by commands parameter.
		//		If commands isn't specified then it's looked up from attributeMap.
		//		Note some attributes like "type"
		//		cannot be processed this way as they are not mutable.
		//
		// tags:
		//		private

		commands = arguments.length >= 3 ? commands : this.attributeMap[attr];

		array.forEach(lang.isArray(commands) ? commands : [commands], function(command){

			// Get target node and what we are doing to that node
			var mapNode = this[command.node || command || "domNode"];	// DOM node
			var type = command.type || "attribute";	// class, innerHTML, innerText, or attribute

			switch(type){
				case "attribute":
					if(lang.isFunction(value)){ // functions execute in the context of the widget
						value = lang.hitch(this, value);
					}

					// Get the name of the DOM node attribute; usually it's the same
					// as the name of the attribute in the widget (attr), but can be overridden.
					// Also maps handler names to lowercase, like onSubmit --> onsubmit
					var attrName = command.attribute ? command.attribute :
						(/^on[A-Z][a-zA-Z]*$/.test(attr) ? attr.toLowerCase() : attr);

					domAttr.set(mapNode, attrName, value);
					break;
				case "innerText":
					mapNode.innerHTML = "";
					mapNode.appendChild(win.doc.createTextNode(value));
					break;
				case "innerHTML":
					mapNode.innerHTML = value;
					break;
				case "class":
					domClass.replace(mapNode, value, this[attr]);
					break;
			}
		}, this);
	},

	get: function(name){
		// summary:
		//		Get a property from a widget.
		//	name:
		//		The property to get.
		// description:
		//		Get a named property from a widget. The property may
		//		potentially be retrieved via a getter method. If no getter is defined, this
		// 		just retrieves the object's property.
		//
		// 		For example, if the widget has properties `foo` and `bar`
		//		and a method named `_getFooAttr()`, calling:
		//		`myWidget.get("foo")` would be equivalent to calling
		//		`widget._getFooAttr()` and `myWidget.get("bar")`
		//		would be equivalent to the expression
		//		`widget.bar2`
		var names = this._getAttrNames(name);
		return this[names.g] ? this[names.g]() : this[name];
	},

	set: function(name, value){
		// summary:
		//		Set a property on a widget
		//	name:
		//		The property to set.
		//	value:
		//		The value to set in the property.
		// description:
		//		Sets named properties on a widget which may potentially be handled by a
		// 		setter in the widget.
		//
		// 		For example, if the widget has properties `foo` and `bar`
		//		and a method named `_setFooAttr()`, calling
		//		`myWidget.set("foo", "Howdy!")` would be equivalent to calling
		//		`widget._setFooAttr("Howdy!")` and `myWidget.set("bar", 3)`
		//		would be equivalent to the statement `widget.bar = 3;`
		//
		//		set() may also be called with a hash of name/value pairs, ex:
		//
		//	|	myWidget.set({
		//	|		foo: "Howdy",
		//	|		bar: 3
		//	|	});
		//
		//	This is equivalent to calling `set(foo, "Howdy")` and `set(bar, 3)`

		if(typeof name === "object"){
			for(var x in name){
				this.set(x, name[x]);
			}
			return this;
		}
		var names = this._getAttrNames(name),
			setter = this[names.s];
		if(lang.isFunction(setter)){
			// use the explicit setter
			var result = setter.apply(this, Array.prototype.slice.call(arguments, 1));
		}else{
			// Mapping from widget attribute to DOMNode attribute/value/etc.
			// Map according to:
			//		1. attributeMap setting, if one exists (TODO: attributeMap deprecated, remove in 2.0)
			//		2. _setFooAttr: {...} type attribute in the widget (if one exists)
			//		3. apply to focusNode or domNode if standard attribute name, excluding funcs like onClick.
			// Checks if an attribute is a "standard attribute" by whether the DOMNode JS object has a similar
			// attribute name (ex: accept-charset attribute matches jsObject.acceptCharset).
			// Note also that Tree.focusNode() is a function not a DOMNode, so test for that.
			var defaultNode = this.focusNode && !lang.isFunction(this.focusNode) ? "focusNode" : "domNode",
				tag = this[defaultNode].tagName,
				attrsForTag = tagAttrs[tag] || (tagAttrs[tag] = getAttrs(this[defaultNode])),
				map =	name in this.attributeMap ? this.attributeMap[name] :
						names.s in this ? this[names.s] :
						((names.l in attrsForTag && typeof value != "function") ||
							/^aria-|^data-|^role$/.test(name)) ? defaultNode : null;
			if(map != null){
				this._attrToDom(name, value, map);
			}
			this._set(name, value);
		}
		return result || this;
	},

	_attrPairNames: {},		// shared between all widgets
	_getAttrNames: function(name){
		// summary:
		//		Helper function for get() and set().
		//		Caches attribute name values so we don't do the string ops every time.
		// tags:
		//		private

		var apn = this._attrPairNames;
		if(apn[name]){ return apn[name]; }
		var uc = name.replace(/^[a-z]|-[a-zA-Z]/g, function(c){ return c.charAt(c.length-1).toUpperCase(); });
		return (apn[name] = {
			n: name+"Node",
			s: "_set"+uc+"Attr",	// converts dashes to camel case, ex: accept-charset --> _setAcceptCharsetAttr
			g: "_get"+uc+"Attr",
			l: uc.toLowerCase()		// lowercase name w/out dashes, ex: acceptcharset
		});
	},

	_set: function(/*String*/ name, /*anything*/ value){
		// summary:
		//		Helper function to set new value for specified attribute, and call handlers
		//		registered with watch() if the value has changed.
		var oldValue = this[name];
		this[name] = value;
		if(this._watchCallbacks && this._created && !isEqual(value, oldValue)){
			this._watchCallbacks(name, oldValue, value);
		}
	},

	on: function(/*String*/ type, /*Function*/ func){
		// summary:
		//		Call specified function when event occurs, ex: myWidget.on("click", function(){ ... }).
		// description:
		//		Call specified function when event `type` occurs, ex: `myWidget.on("click", function(){ ... })`.
		//		Note that the function is not run in any particular scope, so if (for example) you want it to run in the
		//		widget's scope you must do `myWidget.on("click", lang.hitch(myWidget, func))`.

		return aspect.after(this, this._onMap(type), func, true);
	},

	_onMap: function(/*String*/ type){
		// summary:
		//		Maps on() type parameter (ex: "mousemove") to method name (ex: "onMouseMove")
		var ctor = this.constructor, map = ctor._onMap;
		if(!map){
			map = (ctor._onMap = {});
			for(var attr in ctor.prototype){
				if(/^on/.test(attr)){
					map[attr.replace(/^on/, "").toLowerCase()] = attr;
				}
			}
		}
		return map[type.toLowerCase()];	// String
	},

	toString: function(){
		// summary:
		//		Returns a string that represents the widget
		// description:
		//		When a widget is cast to a string, this method will be used to generate the
		//		output. Currently, it does not implement any sort of reversible
		//		serialization.
		return '[Widget ' + this.declaredClass + ', ' + (this.id || 'NO ID') + ']'; // String
	},

	getChildren: function(){
		// summary:
		//		Returns all the widgets contained by this, i.e., all widgets underneath this.containerNode.
		//		Does not return nested widgets, nor widgets that are part of this widget's template.
		return this.containerNode ? registry.findWidgets(this.containerNode) : []; // dijit._Widget[]
	},

	getParent: function(){
		// summary:
		//		Returns the parent widget of this widget
		return registry.getEnclosingWidget(this.domNode.parentNode);
	},

	connect: function(
			/*Object|null*/ obj,
			/*String|Function*/ event,
			/*String|Function*/ method){
		// summary:
		//		Connects specified obj/event to specified method of this object
		//		and registers for disconnect() on widget destroy.
		// description:
		//		Provide widget-specific analog to dojo.connect, except with the
		//		implicit use of this widget as the target object.
		//		Events connected with `this.connect` are disconnected upon
		//		destruction.
		// returns:
		//		A handle that can be passed to `disconnect` in order to disconnect before
		//		the widget is destroyed.
		// example:
		//	|	var btn = new dijit.form.Button();
		//	|	// when foo.bar() is called, call the listener we're going to
		//	|	// provide in the scope of btn
		//	|	btn.connect(foo, "bar", function(){
		//	|		console.debug(this.toString());
		//	|	});
		// tags:
		//		protected

		var handle = connect.connect(obj, event, this, method);
		this._connects.push(handle);
		return handle;		// _Widget.Handle
	},

	disconnect: function(handle){
		// summary:
		//		Disconnects handle created by `connect`.
		//		Also removes handle from this widget's list of connects.
		// tags:
		//		protected
		var i = array.indexOf(this._connects, handle);
		if(i != -1){
			handle.remove();
			this._connects.splice(i, 1);
		}
	},

	subscribe: function(t, method){
		// summary:
		//		Subscribes to the specified topic and calls the specified method
		//		of this object and registers for unsubscribe() on widget destroy.
		// description:
		//		Provide widget-specific analog to dojo.subscribe, except with the
		//		implicit use of this widget as the target object.
		// t: String
		//		The topic
		// method: Function
		//		The callback
		// example:
		//	|	var btn = new dijit.form.Button();
		//	|	// when /my/topic is published, this button changes its label to
		//	|   // be the parameter of the topic.
		//	|	btn.subscribe("/my/topic", function(v){
		//	|		this.set("label", v);
		//	|	});
		// tags:
		//		protected
		var handle = topic.subscribe(t, lang.hitch(this, method));
		this._connects.push(handle);
		return handle;		// _Widget.Handle
	},

	unsubscribe: function(/*Object*/ handle){
		// summary:
		//		Unsubscribes handle created by this.subscribe.
		//		Also removes handle from this widget's list of subscriptions
		// tags:
		//		protected
		this.disconnect(handle);
	},

	isLeftToRight: function(){
		// summary:
		//		Return this widget's explicit or implicit orientation (true for LTR, false for RTL)
		// tags:
		//		protected
		return this.dir ? (this.dir == "ltr") : domGeometry.isBodyLtr(); //Boolean
	},

	isFocusable: function(){
		// summary:
		//		Return true if this widget can currently be focused
		//		and false if not
		return this.focus && (domStyle.get(this.domNode, "display") != "none");
	},

	placeAt: function(/* String|DomNode|_Widget */reference, /* String?|Int? */position){
		// summary:
		//		Place this widget's domNode reference somewhere in the DOM based
		//		on standard domConstruct.place conventions, or passing a Widget reference that
		//		contains and addChild member.
		//
		// description:
		//		A convenience function provided in all _Widgets, providing a simple
		//		shorthand mechanism to put an existing (or newly created) Widget
		//		somewhere in the dom, and allow chaining.
		//
		// reference:
		//		The String id of a domNode, a domNode reference, or a reference to a Widget possessing
		//		an addChild method.
		//
		// position:
		//		If passed a string or domNode reference, the position argument
		//		accepts a string just as domConstruct.place does, one of: "first", "last",
		//		"before", or "after".
		//
		//		If passed a _Widget reference, and that widget reference has an ".addChild" method,
		//		it will be called passing this widget instance into that method, supplying the optional
		//		position index passed.
		//
		// returns:
		//		dijit._Widget
		//		Provides a useful return of the newly created dijit._Widget instance so you
		//		can "chain" this function by instantiating, placing, then saving the return value
		//		to a variable.
		//
		// example:
		// | 	// create a Button with no srcNodeRef, and place it in the body:
		// | 	var button = new dijit.form.Button({ label:"click" }).placeAt(win.body());
		// | 	// now, 'button' is still the widget reference to the newly created button
		// | 	button.on("click", function(e){ console.log('click'); }));
		//
		// example:
		// |	// create a button out of a node with id="src" and append it to id="wrapper":
		// | 	var button = new dijit.form.Button({},"src").placeAt("wrapper");
		//
		// example:
		// |	// place a new button as the first element of some div
		// |	var button = new dijit.form.Button({ label:"click" }).placeAt("wrapper","first");
		//
		// example:
		// |	// create a contentpane and add it to a TabContainer
		// |	var tc = dijit.byId("myTabs");
		// |	new dijit.layout.ContentPane({ href:"foo.html", title:"Wow!" }).placeAt(tc)

		if(reference.declaredClass && reference.addChild){
			reference.addChild(this, position);
		}else{
			domConstruct.place(this.domNode, reference, position);
		}
		return this;
	},

	getTextDir: function(/*String*/ text,/*String*/ originalDir){
		// summary:
		//		Return direction of the text.
		//		The function overridden in the _BidiSupport module,
		//		its main purpose is to calculate the direction of the
		//		text, if was defined by the programmer through textDir.
		//	tags:
		//		protected.
		return originalDir;
	},

	applyTextDir: function(/*===== element, text =====*/){
		// summary:
		//		The function overridden in the _BidiSupport module,
		//		originally used for setting element.dir according to this.textDir.
		//		In this case does nothing.
		// element: DOMNode
		// text: String
		// tags:
		//		protected.
	},

	defer: function(fcn, delay){ 
		// summary:
		//		Wrapper to setTimeout to avoid deferred functions executing
		//		after the originating widget has been destroyed.
		//		Returns an object handle with a remove method (that returns null) (replaces clearTimeout).
		// fcn: function reference
		// delay: Optional number (defaults to 0)
		// tags:
		//		protected.
		var timer = setTimeout(lang.hitch(this, 
			function(){ 
				if(!timer){ return; }
				timer = null;
				if(!this._destroyed){ 
					lang.hitch(this, fcn)(); 
				} 
			}),
			delay || 0
		);
		return {
			remove:	function(){
					if(timer){
						clearTimeout(timer);
						timer = null;
					}
					return null; // so this works well: handle = handle.remove();
				}
		};
	}
});

});

},
'dojox/layout/ContentPane':function(){
define("dojox/layout/ContentPane", [
	"dojo/_base/lang",
	"dojo/_base/xhr",
	"dijit/layout/ContentPane",
	"dojox/html/_base",
	"dojo/_base/declare"
], function (lang, xhrUtil, ContentPane, htmlUtil, declare) {

/*===== var ContentPane = dijit.layout.ContentPane =====*/
return declare("dojox.layout.ContentPane", ContentPane, {
	// summary:
	//		An extended version of dijit.layout.ContentPane.
	//		Supports infile scripts and external ones declared by <script src=''
	//		relative path adjustments (content fetched from a different folder)
	//		<style> and <link rel='stylesheet' href='..'> tags,
	//		css paths inside cssText is adjusted (if you set adjustPaths = true)
	//
	//		NOTE that dojo.require in script in the fetched file isn't recommended
	//		Many widgets need to be required at page load to work properly

	// adjustPaths: Boolean
	//		Adjust relative paths in html string content to point to this page.
	//		Only useful if you grab content from a another folder then the current one
	adjustPaths: false,

	// cleanContent: Boolean
	//	summary:
	//		cleans content to make it less likely to generate DOM/JS errors.
	//	description:
	//		useful if you send ContentPane a complete page, instead of a html fragment
	//		scans for
	//
	//			* title Node, remove
	//			* DOCTYPE tag, remove
	cleanContent: false,

	// renderStyles: Boolean
	//		trigger/load styles in the content
	renderStyles: false,

	// executeScripts: Boolean
	//		Execute (eval) scripts that is found in the content
	executeScripts: true,

	// scriptHasHooks: Boolean
	//		replace keyword '_container_' in scripts with 'dijit.byId(this.id)'
	// NOTE this name might change in the near future
	scriptHasHooks: false,

	constructor: function(){
		// init per instance properties, initializer doesn't work here because how things is hooked up in dijit._Widget
		this.ioArgs = {};
		this.ioMethod = xhrUtil.get;
	},

	onExecError: function(e){
		// summary:
		//		event callback, called on script error or on java handler error
		//		overide and return your own html string if you want a some text
		//		displayed within the ContentPane
	},

	_setContent: function(cont){
		// override dijit.layout.ContentPane._setContent, to enable path adjustments
		
		var setter = this._contentSetter;
		if(! (setter && setter instanceof htmlUtil._ContentSetter)) {
			setter = this._contentSetter = new htmlUtil._ContentSetter({
				node: this.containerNode,
				_onError: lang.hitch(this, this._onError),
				onContentError: lang.hitch(this, function(e){
					// fires if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV
					var errMess = this.onContentError(e);
					try{
						this.containerNode.innerHTML = errMess;
					}catch(e){
						console.error('Fatal '+this.id+' could not change content due to '+e.message, e);
					}
				})/*,
				_onError */
			});
		};

		// stash the params for the contentSetter to allow inheritance to work for _setContent
		this._contentSetterParams = {
			adjustPaths: Boolean(this.adjustPaths && (this.href||this.referencePath)),
			referencePath: this.href || this.referencePath,
			renderStyles: this.renderStyles,
			executeScripts: this.executeScripts,
			scriptHasHooks: this.scriptHasHooks,
			scriptHookReplacement: "dijit.byId('"+this.id+"')"
		};

		this.inherited("_setContent", arguments);
	},
	// could put back _renderStyles by wrapping/aliasing dojox.html._ContentSetter.prototype._renderStyles

	destroy: function () {
		var setter = this._contentSetter;
		if (setter) {
			setter.tearDown();
		}
		this.inherited(arguments);
	}
});
});

},
'dojox/html/_base':function(){
define("dojox/html/_base", [
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/xhr",
	"dojo/_base/window",
	"dojo/_base/sniff",
	"dojo/_base/url",
	"dojo/dom-construct",
	"dojo/html",
	"dojo/_base/declare"
], function (dojo, lang, xhrUtil, windowUtil, has, _Url, domConstruct, htmlUtil) {
/*
	Status: dont know where this will all live exactly
	Need to pull in the implementation of the various helper methods
	Some can be static method, others maybe methods of the ContentSetter (?)

	Gut the ContentPane, replace its _setContent with our own call to dojox.html.set()


*/
	var html = dojo.getObject("dojox.html", true);

	if(has("ie")){
		var alphaImageLoader = /(AlphaImageLoader\([^)]*?src=(['"]))(?![a-z]+:|\/)([^\r\n;}]+?)(\2[^)]*\)\s*[;}]?)/g;
	}

	// css at-rules must be set before any css declarations according to CSS spec
	// match:
	// @import 'http://dojotoolkit.org/dojo.css';
	// @import 'you/never/thought/' print;
	// @import url("it/would/work") tv, screen;
	// @import url(/did/you/now.css);
	// but not:
	// @namespace dojo "http://dojotoolkit.org/dojo.css"; /* namespace URL should always be a absolute URI */
	// @charset 'utf-8';
	// @media print{ #menuRoot {display:none;} }

	// we adjust all paths that dont start on '/' or contains ':'
	//(?![a-z]+:|\/)

	var cssPaths = /(?:(?:@import\s*(['"])(?![a-z]+:|\/)([^\r\n;{]+?)\1)|url\(\s*(['"]?)(?![a-z]+:|\/)([^\r\n;]+?)\3\s*\))([a-z, \s]*[;}]?)/g;

	var adjustCssPaths = html._adjustCssPaths = function(cssUrl, cssText){
		//	summary:
		//		adjusts relative paths in cssText to be relative to cssUrl
		//		a path is considered relative if it doesn't start with '/' and not contains ':'
		//	description:
		//		Say we fetch a HTML page from level1/page.html
		//		It has some inline CSS:
		//			@import "css/page.css" tv, screen;
		//			...
		//			background-image: url(images/aplhaimage.png);
		//
		//		as we fetched this HTML and therefore this CSS
		//		from level1/page.html, these paths needs to be adjusted to:
		//			@import 'level1/css/page.css' tv, screen;
		//			...
		//			background-image: url(level1/images/alphaimage.png);
		//
		//		In IE it will also adjust relative paths in AlphaImageLoader()
		//			filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='images/alphaimage.png');
		//		will be adjusted to:
		//			filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='level1/images/alphaimage.png');
		//
		//		Please note that any relative paths in AlphaImageLoader in external css files wont work, as
		//		the paths in AlphaImageLoader is MUST be declared relative to the HTML page,
		//		not relative to the CSS file that declares it

		if(!cssText || !cssUrl){ return; }

		// support the ImageAlphaFilter if it exists, most people use it in IE 6 for transparent PNGs
		// We are NOT going to kill it in IE 7 just because the PNGs work there. Somebody might have
		// other uses for it.
		// If user want to disable css filter in IE6  he/she should
		// unset filter in a declaration that just IE 6 doesn't understands
		// like * > .myselector { filter:none; }
		if(alphaImageLoader){
			cssText = cssText.replace(alphaImageLoader, function(ignore, pre, delim, url, post){
				return pre + (new _Url(cssUrl, './'+url).toString()) + post;
			});
		}

		return cssText.replace(cssPaths, function(ignore, delimStr, strUrl, delimUrl, urlUrl, media){
			if(strUrl){
				return '@import "' + (new _Url(cssUrl, './'+strUrl).toString()) + '"' + media;
			}else{
				return 'url(' + (new _Url(cssUrl, './'+urlUrl).toString()) + ')' + media;
			}
		});
	};

	// attributepaths one tag can have multiple paths, example:
	// <input src="..." style="url(..)"/> or <a style="url(..)" href="..">
	// <img style='filter:progid...AlphaImageLoader(src="noticeTheSrcHereRunsThroughHtmlSrc")' src="img">
	var htmlAttrPaths = /(<[a-z][a-z0-9]*\s[^>]*)(?:(href|src)=(['"]?)([^>]*?)\3|style=(['"]?)([^>]*?)\5)([^>]*>)/gi;

	var adjustHtmlPaths = html._adjustHtmlPaths = function(htmlUrl, cont){
		var url = htmlUrl || "./";

		return cont.replace(htmlAttrPaths,
			function(tag, start, name, delim, relUrl, delim2, cssText, end){
				return start + (name ?
							(name + '=' + delim + (new _Url(url, relUrl).toString()) + delim)
						: ('style=' + delim2 + adjustCssPaths(url, cssText) + delim2)
				) + end;
			}
		);
	};

	var snarfStyles = html._snarfStyles = function	(/*String*/cssUrl, /*String*/cont, /*Array*/styles){
		/****************  cut out all <style> and <link rel="stylesheet" href=".."> **************/
		// also return any attributes from this tag (might be a media attribute)
		// if cssUrl is set it will adjust paths accordingly
		styles.attributes = [];

		return cont.replace(/(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi,
			function(ignore, styleAttr, cssText, linkAttr, delim, href){
				// trim attribute
				var i, attr = (styleAttr||linkAttr||"").replace(/^\s*([\s\S]*?)\s*$/i, "$1");
				if(cssText){
					i = styles.push(cssUrl ? adjustCssPaths(cssUrl, cssText) : cssText);
				}else{
					i = styles.push('@import "' + href + '";');
					attr = attr.replace(/\s*(?:rel|href)=(['"])?[^\s]*\1\s*/gi, ""); // remove rel=... and href=...
				}
				if(attr){
					attr = attr.split(/\s+/);// split on both "\n", "\t", " " etc
					var atObj = {}, tmp;
					for(var j = 0, e = attr.length; j < e; j++){
						tmp = attr[j].split('='); // split name='value'
						atObj[tmp[0]] = tmp[1].replace(/^\s*['"]?([\s\S]*?)['"]?\s*$/, "$1"); // trim and remove ''
					}
					styles.attributes[i - 1] = atObj;
				}
				return "";
			}
		);
	};

	var snarfScripts = html._snarfScripts = function(cont, byRef){
		// summary
		//		strips out script tags from cont
		// invoke with
		//	byRef = {errBack:function(){/*add your download error code here*/, downloadRemote: true(default false)}}
		//	byRef will have {code: 'jscode'} when this scope leaves
		byRef.code = "";

		//Update script tags nested in comments so that the script tag collector doesn't pick
		//them up.
		cont = cont.replace(/<[!][-][-](.|\s)*?[-][-]>/g,
			function(comment){
				return comment.replace(/<(\/?)script\b/ig,"&lt;$1Script");
			}
		);

		function download(src){
			if(byRef.downloadRemote){
				// console.debug('downloading',src);
				//Fix up src, in case there were entity character encodings in it.
				//Probably only need to worry about a subset.
				src = src.replace(/&([a-z0-9#]+);/g, function(m, name) {
					switch(name) {
						case "amp"	: return "&";
						case "gt"	: return ">";
						case "lt"	: return "<";
						default:
							return name.charAt(0)=="#" ? String.fromCharCode(name.substring(1)) : "&"+name+";";
					}
				});
				xhrUtil.get({
					url: src,
					sync: true,
					load: function(code){
						byRef.code += code+";";
					},
					error: byRef.errBack
				});
			}
		}

		// match <script>, <script type="text/..., but not <script type="dojo(/method)...
		return cont.replace(/<script\s*(?![^>]*type=['"]?(?:dojo\/|text\/html\b))(?:[^>]*?(?:src=(['"]?)([^>]*?)\1[^>]*)?)*>([\s\S]*?)<\/script>/gi,
			function(ignore, delim, src, code){
				if(src){
					download(src);
				}else{
					byRef.code += code;
				}
				return "";
			}
		);
	};

	var evalInGlobal = html.evalInGlobal = function(code, appendNode){
		// we do our own eval here as dojo.eval doesn't eval in global crossbrowser
		// This work X browser but but it relies on a DOM
		// plus it doesn't return anything, thats unrelevant here but not for dojo core
		appendNode = appendNode || windowUtil.doc.body;
		var n = appendNode.ownerDocument.createElement('script');
		n.type = "text/javascript";
		appendNode.appendChild(n);
		n.text = code; // DOM 1 says this should work
	};

	html._ContentSetter = dojo.declare(/*===== "dojox.html._ContentSetter", =====*/ htmlUtil._ContentSetter, {
		// adjustPaths: Boolean
		//		Adjust relative paths in html string content to point to this page
		//		Only useful if you grab content from a another folder than the current one
		adjustPaths: false,
		referencePath: ".",
		renderStyles: false,

		executeScripts: false,
		scriptHasHooks: false,
		scriptHookReplacement: null,

		_renderStyles: function(styles){
			// insert css from content into document head
			this._styleNodes = [];
			var st, att, cssText, doc = this.node.ownerDocument;
			var head = doc.getElementsByTagName('head')[0];

			for(var i = 0, e = styles.length; i < e; i++){
				cssText = styles[i]; att = styles.attributes[i];
				st = doc.createElement('style');
				st.setAttribute("type", "text/css"); // this is required in CSS spec!

				for(var x in att){
					st.setAttribute(x, att[x]);
				}

				this._styleNodes.push(st);
				head.appendChild(st); // must insert into DOM before setting cssText

				if(st.styleSheet){ // IE
					st.styleSheet.cssText = cssText;
				}else{ // w3c
					st.appendChild(doc.createTextNode(cssText));
				}
			}
		},

		empty: function() {
			this.inherited("empty", arguments);

			// empty out the styles array from any previous use
			this._styles = [];
		},

		onBegin: function() {
			// summary
			//		Called after instantiation, but before set();
			//		It allows modification of any of the object properties - including the node and content
			//		provided - before the set operation actually takes place
			//		This implementation extends that of dojo.html._ContentSetter
			//		to add handling for adjustPaths, renderStyles on the html string content before it is set
			this.inherited("onBegin", arguments);

			var cont = this.content,
				node = this.node;

			var styles = this._styles;// init vars

			if(lang.isString(cont)){
				if(this.adjustPaths && this.referencePath){
					cont = adjustHtmlPaths(this.referencePath, cont);
				}

				if(this.renderStyles || this.cleanContent){
					cont = snarfStyles(this.referencePath, cont, styles);
				}

				// because of a bug in IE, script tags that is first in html hierarchy doesnt make it into the DOM
				//	when content is innerHTML'ed, so we can't use dojo.query to retrieve scripts from DOM
				if(this.executeScripts){
					var _t = this;
					var byRef = {
						downloadRemote: true,
						errBack:function(e){
							_t._onError.call(_t, 'Exec', 'Error downloading remote script in "'+_t.id+'"', e);
						}
					};
					cont = snarfScripts(cont, byRef);
					this._code = byRef.code;
				}
			}
			this.content = cont;
		},

		onEnd: function() {
			// summary
			//		Called after set(), when the new content has been pushed into the node
			//		It provides an opportunity for post-processing before handing back the node to the caller
			//		This implementation extends that of dojo.html._ContentSetter

			var code = this._code,
				styles = this._styles;

			// clear old stylenodes from the DOM
			// these were added by the last set call
			// (in other words, if you dont keep and reuse the ContentSetter for a particular node
			// .. you'll have no practical way to do this)
			if(this._styleNodes && this._styleNodes.length){
				while(this._styleNodes.length){
					domConstruct.destroy(this._styleNodes.pop());
				}
			}
			// render new style nodes
			if(this.renderStyles && styles && styles.length){
				this._renderStyles(styles);
			}

			if(this.executeScripts && code){
				if(this.cleanContent){
					// clean JS from html comments and other crap that browser
					// parser takes care of in a normal page load
					code = code.replace(/(<!--|(?:\/\/)?-->|<!\[CDATA\[|\]\]>)/g, '');
				}
				if(this.scriptHasHooks){
					// replace _container_ with this.scriptHookReplace()
					// the scriptHookReplacement can be a string
					// or a function, which when invoked returns the string you want to substitute in
					code = code.replace(/_container_(?!\s*=[^=])/g, this.scriptHookReplacement);
				}
				try{
					evalInGlobal(code, this.node);
				}catch(e){
					this._onError('Exec', 'Error eval script in '+this.id+', '+e.message, e);
				}
			}
			this.inherited("onEnd", arguments);
		},
		tearDown: function() {
			this.inherited(arguments);
			delete this._styles;
			// only tear down -or another set() - will explicitly throw away the
			// references to the style nodes we added
			if(this._styleNodes && this._styleNodes.length){
				while(this._styleNodes.length){
					domConstruct.destroy(this._styleNodes.pop());
				}
			}
			delete this._styleNodes;
			// reset the defaults from the prototype
			// XXX: not sure if this is the correct intended behaviour, it was originally
			// dojo.getObject(this.declaredClass).prototype which will not work with anonymous
			// modules
			dojo.mixin(this, html._ContentSetter.prototype);
		}

	});

	html.set = function(/* DomNode */ node, /* String|DomNode|NodeList */ cont, /* Object? */ params){
		// TODO: add all the other options
			// summary:
			//		inserts (replaces) the given content into the given node
			//	node:
			//		the parent element that will receive the content
			//	cont:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo.NodeList, Array or other enumerable list of nodes
			//	params:
			//		Optional flags/properties to configure the content-setting. See dojo.html._ContentSetter
			//	example:
			//		A safe string/node/nodelist content replacement/injection with hooks for extension
			//		Example Usage:
			//		dojo.html.set(node, "some string");
			//		dojo.html.set(node, contentNode, {options});
			//		dojo.html.set(node, myNode.childNodes, {options});

		if(!params){
			// simple and fast
			return htmlUtil._setNodeContent(node, cont, true);
		}else{
			// more options but slower
			var op = new html._ContentSetter(dojo.mixin(
					params,
					{ content: cont, node: node }
			));
			return op.set();
		}
	};

	return html;
});
},
'dijit/_base/manager':function(){
define("dijit/_base/manager", [
	"dojo/_base/array",
	"dojo/_base/config", // defaultDuration
	"../registry",
	".."	// for setting exports to dijit namespace
], function(array, config, registry, dijit){

	// module:
	//		dijit/_base/manager
	// summary:
	//		Shim to methods on registry, plus a few other declarations.
	//		New code should access dijit/registry directly when possible.

	/*=====
	dijit.byId = function(id){
		// summary:
		//		Returns a widget by it's id, or if passed a widget, no-op (like dom.byId())
		// id: String|dijit._Widget
		return registry.byId(id); // dijit._Widget
	};

	dijit.getUniqueId = function(widgetType){
		// summary:
		//		Generates a unique id for a given widgetType
		// widgetType: String
		return registry.getUniqueId(widgetType); // String
	};

	dijit.findWidgets = function(root){
		// summary:
		//		Search subtree under root returning widgets found.
		//		Doesn't search for nested widgets (ie, widgets inside other widgets).
		// root: DOMNode
		return registry.findWidgets(root);
	};

	dijit._destroyAll = function(){
		// summary:
		//		Code to destroy all widgets and do other cleanup on page unload

		return registry._destroyAll();
	};

	dijit.byNode = function(node){
		// summary:
		//		Returns the widget corresponding to the given DOMNode
		// node: DOMNode
		return registry.byNode(node); // dijit._Widget
	};

	dijit.getEnclosingWidget = function(node){
		// summary:
		//		Returns the widget whose DOM tree contains the specified DOMNode, or null if
		//		the node is not contained within the DOM tree of any widget
		// node: DOMNode
		return registry.getEnclosingWidget(node);
	};
	=====*/
	array.forEach(["byId", "getUniqueId", "findWidgets", "_destroyAll", "byNode", "getEnclosingWidget"], function(name){
		dijit[name] = registry[name];
	});

	/*=====
	dojo.mixin(dijit, {
		// defaultDuration: Integer
		//		The default fx.animation speed (in ms) to use for all Dijit
		//		transitional fx.animations, unless otherwise specified
		//		on a per-instance basis. Defaults to 200, overrided by
		//		`djConfig.defaultDuration`
		defaultDuration: 200
	});
	=====*/
	dijit.defaultDuration = config["defaultDuration"] || 200;

	return dijit;
});

},
'dojox/layout/ResizeHandle':function(){
define("dojox/layout/ResizeHandle", ["dojo/_base/kernel","dojo/_base/lang","dojo/_base/connect","dojo/_base/array","dojo/_base/event",
	"dojo/_base/fx","dojo/_base/window","dojo/fx","dojo/window","dojo/dom","dojo/dom-class",
	"dojo/dom-geometry","dojo/dom-style","dijit/_base/manager","dijit/_Widget","dijit/_TemplatedMixin",
	"dojo/_base/declare"], function (
	kernel, lang, connect, arrayUtil, eventUtil, fxBase, windowBase, fxUtil, windowUtil, 
	domUtil, domClass, domGeometry, domStyle, manager, Widget, TemplatedMixin, declare) {

kernel.experimental("dojox.layout.ResizeHandle");

/*===== 
	var Widget = dijit._Widget;
	var TemplatedMixin = dijit._TemplatedMixin;
=====*/
var ResizeHandle = declare("dojox.layout.ResizeHandle",[Widget, TemplatedMixin],
	{
	// summary: A dragable handle used to resize an attached node.
	//
	// description:
	//	The handle on the bottom-right corner of FloatingPane or other widgets that allows
	//	the widget to be resized.
	//	Typically not used directly.
	//
	// targetId: String
	//	id of the Widget OR DomNode that I will size
	targetId: "",
	
	// targetContainer: DomNode
	//	over-ride targetId and attch this handle directly to a reference of a DomNode
	targetContainer: null,
	
	// resizeAxis: String
	//	one of: x|y|xy limit resizing to a single axis, default to xy ...
	resizeAxis: "xy",
	
	// activeResize: Boolean
	// 	if true, node will size realtime with mouse movement,
	//	if false, node will create virtual node, and only resize target on mouseUp
	activeResize: false,
	
	// activeResizeClass: String
	//	css class applied to virtual resize node.
	activeResizeClass: "dojoxResizeHandleClone",
	
	// animateSizing: Boolean
	//	only applicable if activeResize = false. onMouseup, animate the node to the
	//	new size
	animateSizing: true,
	
	// animateMethod: String
	// 	one of "chain" or "combine" ... visual effect only. combine will "scale"
	// 	node to size, "chain" will alter width, then height
	animateMethod: "chain",

	// animateDuration: Integer
	//	time in MS to run sizing animation. if animateMethod="chain", total animation
	//	playtime is 2*animateDuration
	animateDuration: 225,

	// minHeight: Integer
	//	smallest height in px resized node can be
	minHeight: 100,

	// minWidth: Integer
	//	smallest width in px resize node can be
	minWidth: 100,

	// constrainMax: Boolean
	//	Toggle if this widget cares about the maxHeight and maxWidth
	//	parameters.
	constrainMax: false,

	// maxHeight: Integer
	//	Largest height size in px the resize node can become.
	maxHeight:0,
	
	// maxWidth: Integer
	//	Largest width size in px the reize node can become.
	maxWidth:0,

	// fixedAspect: Boolean
	//		Toggle to enable this widget to maintain the aspect
	//		ratio of the attached node.
	fixedAspect: false,

	// intermediateChanges: Boolean
	//		Toggle to enable/disable this widget from firing onResize
	//		events at every step of a resize. If `activeResize` is true,
	//		and this is false, onResize only fires _after_ the drop
	//		operation. Animated resizing is not affected by this setting.
	intermediateChanges: false,

	// startTopic: String
	//		The name of the topic this resizehandle publishes when resize is starting
	startTopic: "/dojo/resize/start",
	
	// endTopic: String
	//		The name of the topic this resizehandle publishes when resize is complete
	endTopic:"/dojo/resize/stop",

	templateString: '<div dojoAttachPoint="resizeHandle" class="dojoxResizeHandle"><div></div></div>',

	postCreate: function(){
		// summary: setup our one major listener upon creation
		this.connect(this.resizeHandle, "onmousedown", "_beginSizing");
		if(!this.activeResize){
			// there shall be only a single resize rubberbox that at the top
			// level so that we can overlay it on anything whenever the user
			// resizes something. Since there is only one mouse pointer he
			// can't at once resize multiple things interactively.
			this._resizeHelper = manager.byId('dojoxGlobalResizeHelper');
			if(!this._resizeHelper){
				this._resizeHelper = new _ResizeHelper({
						id: 'dojoxGlobalResizeHelper'
				}).placeAt(windowBase.body());
				domClass.add(this._resizeHelper.domNode, this.activeResizeClass);
			}
		}else{ this.animateSizing = false; }

		if(!this.minSize){
			this.minSize = { w: this.minWidth, h: this.minHeight };
		}
		
		if(this.constrainMax){
			this.maxSize = { w: this.maxWidth, h: this.maxHeight }
		}
		
		// should we modify the css for the cursor hover to n-resize nw-resize and w-resize?
		this._resizeX = this._resizeY = false;
		var addClass = lang.partial(domClass.add, this.resizeHandle);
		switch(this.resizeAxis.toLowerCase()){
			case "xy" :
				this._resizeX = this._resizeY = true;
				// FIXME: need logic to determine NW or NE class to see
				// based on which [todo] corner is clicked
				addClass("dojoxResizeNW");
				break;
			case "x" :
				this._resizeX = true;
				addClass("dojoxResizeW");
				break;
			case "y" :
				this._resizeY = true;
				addClass("dojoxResizeN");
				break;
		}
	},

	_beginSizing: function(/*Event*/ e){
		// summary: setup movement listeners and calculate initial size
		
		if(this._isSizing){ return; }

		connect.publish(this.startTopic, [ this ]);
		this.targetWidget = manager.byId(this.targetId);

		this.targetDomNode = this.targetWidget ? this.targetWidget.domNode : domUtil.byId(this.targetId);
		if(this.targetContainer){ this.targetDomNode = this.targetContainer; }
		if(!this.targetDomNode){ return; }

		if(!this.activeResize){
			var c = domGeometry.position(this.targetDomNode, true);
			this._resizeHelper.resize({l: c.x, t: c.y, w: c.w, h: c.h});
			this._resizeHelper.show();
			if(!this.isLeftToRight()){
				this._resizeHelper.startPosition = {l: c.x, t: c.y};
			}
		}

		this._isSizing = true;
		this.startPoint  = { x:e.clientX, y:e.clientY };

		// widget.resize() or setting style.width/height expects native box model dimension 
		// (in most cases content-box, but it may be border-box if in backcompact mode)
		var style = domStyle.getComputedStyle(this.targetDomNode), 
			borderModel = domGeometry.boxModel==='border-model',
			padborder = borderModel?{w:0,h:0}:domGeometry.getPadBorderExtents(this.targetDomNode, style),
			margin = domGeometry.getMarginExtents(this.targetDomNode, style),
			mb;
		mb = this.startSize = { 
				w: domStyle.get(this.targetDomNode, 'width', style), 
				h: domStyle.get(this.targetDomNode, 'height', style),
				//ResizeHelper.resize expects a bounding box of the
				//border box, so let's keep track of padding/border
				//width/height as well
				pbw: padborder.w, pbh: padborder.h,
				mw: margin.w, mh: margin.h};
		if(!this.isLeftToRight() && dojo.style(this.targetDomNode, "position") == "absolute"){
			var p = domGeometry.position(this.targetDomNode, true);
			this.startPosition = {l: p.x, t: p.y};
		}
		
		this._pconnects = [
			connect.connect(windowBase.doc,"onmousemove",this,"_updateSizing"),
			connect.connect(windowBase.doc,"onmouseup", this, "_endSizing")
		];
		
		eventUtil.stop(e);
	},

	_updateSizing: function(/*Event*/ e){
		// summary: called when moving the ResizeHandle ... determines
		//	new size based on settings/position and sets styles.

		if(this.activeResize){
			this._changeSizing(e);
		}else{
			var tmp = this._getNewCoords(e, 'border', this._resizeHelper.startPosition);
			if(tmp === false){ return; }
			this._resizeHelper.resize(tmp);
		}
		e.preventDefault();
	},

	_getNewCoords: function(/* Event */ e, /* String */ box, /* Object */startPosition){
		
		// On IE, if you move the mouse above/to the left of the object being resized,
		// sometimes clientX/Y aren't set, apparently.  Just ignore the event.
		try{
			if(!e.clientX  || !e.clientY){ return false; }
		}catch(e){
			// sometimes you get an exception accessing above fields...
			return false;
		}
		this._activeResizeLastEvent = e;

		var dx = (this.isLeftToRight()?1:-1) * (this.startPoint.x - e.clientX),
			dy = this.startPoint.y - e.clientY,
			newW = this.startSize.w - (this._resizeX ? dx : 0),
			newH = this.startSize.h - (this._resizeY ? dy : 0),
			r = this._checkConstraints(newW, newH)
		;
		
		startPosition = (startPosition || this.startPosition);
		if(startPosition && this._resizeX){
			// adjust x position for RtoL
			r.l = startPosition.l + dx;
			if(r.w != newW){
				r.l += (newW - r.w);
			}
			r.t = startPosition.t;
		}

		switch(box){
			case 'margin':
				r.w += this.startSize.mw;
				r.h += this.startSize.mh;
				//pass through
			case "border":
				r.w += this.startSize.pbw;
				r.h += this.startSize.pbh;
				break;
			//default: //native, do nothing
		}

		return r; // Object
	},
	
	_checkConstraints: function(newW, newH){
		// summary: filter through the various possible constaint possibilities.
				
		// minimum size check
		if(this.minSize){
			var tm = this.minSize;
			if(newW < tm.w){
				newW = tm.w;
			}
			if(newH < tm.h){
				newH = tm.h;
			}
		}
		
		// maximum size check:
		if(this.constrainMax && this.maxSize){
			var ms = this.maxSize;
			if(newW > ms.w){
				newW = ms.w;
			}
			if(newH > ms.h){
				newH = ms.h;
			}
		}
		
		if(this.fixedAspect){
			var w = this.startSize.w, h = this.startSize.h,
				delta = w * newH - h * newW;
			if(delta<0){
				newW = newH * w / h;
			}else if(delta>0){
				newH = newW * h / w;
			}
		}
		
		return { w: newW, h: newH }; // Object
	},
		
	_changeSizing: function(/*Event*/ e){
		// summary: apply sizing information based on information in (e) to attached node
		
		var isWidget = this.targetWidget && lang.isFunction(this.targetWidget.resize),
			tmp = this._getNewCoords(e, isWidget && 'margin');
		if(tmp === false){ return; }

		if(isWidget){
			this.targetWidget.resize(tmp);
		}else{
			if(this.animateSizing){
				var anim = fxUtil[this.animateMethod]([
					fxBase.animateProperty({
						node: this.targetDomNode,
						properties: {
							width: { start: this.startSize.w, end: tmp.w }
						},
						duration: this.animateDuration
					}),
					fxBase.animateProperty({
						node: this.targetDomNode,
						properties: {
							height: { start: this.startSize.h, end: tmp.h }
						},
						duration: this.animateDuration
					})
				]);
				anim.play();
			}else{
				domStyle.set(this.targetDomNode,{
					width: tmp.w + "px",
					height: tmp.h + "px"
				});
			}
		}
		if(this.intermediateChanges){
			this.onResize(e);
		}
	},

	_endSizing: function(/*Event*/ e){
		// summary: disconnect listenrs and cleanup sizing
		arrayUtil.forEach(this._pconnects, connect.disconnect);
		var pub = lang.partial(connect.publish, this.endTopic, [ this ]);
		if(!this.activeResize){
			this._resizeHelper.hide();
			this._changeSizing(e);
			setTimeout(pub, this.animateDuration + 15);
		}else{
			pub();
		}
		this._isSizing = false;
		this.onResize(e);
	},
	
	onResize: function(e){
		// summary: Stub fired when sizing is done. Fired once
		//	after resize, or often when `intermediateChanges` is
		//	set to true.
	}
	
});

var _ResizeHelper = dojo.declare("dojox.layout._ResizeHelper", Widget, {
	// summary: A global private resize helper shared between any
	//		`dojox.layout.ResizeHandle` with activeSizing off.
	
	show: function(){
		// summary: show helper to start resizing
		domStyle.set(this.domNode, "display", "");
	},
	
	hide: function(){
		// summary: hide helper after resizing is complete
		domStyle.set(this.domNode, "display", "none");
	},
	
	resize: function(/* Object */dim){
		// summary: size the widget and place accordingly
		domGeometry.setMarginBox(this.domNode, dim);
	}
	
});
return ResizeHandle;
});

},
'dijit/registry':function(){
define("dijit/registry", [
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/sniff", // has("ie")
	"dojo/_base/unload", // unload.addOnWindowUnload
	"dojo/_base/window", // win.body
	"."	// dijit._scopeName
], function(array, has, unload, win, dijit){

	// module:
	//		dijit/registry
	// summary:
	//		Registry of existing widget on page, plus some utility methods.
	//		Must be accessed through AMD api, ex:
	//		require(["dijit/registry"], function(registry){ registry.byId("foo"); })

	var _widgetTypeCtr = {}, hash = {};

	var registry =  {
		// summary:
		//		A set of widgets indexed by id

		length: 0,

		add: function(/*dijit._Widget*/ widget){
			// summary:
			//		Add a widget to the registry. If a duplicate ID is detected, a error is thrown.
			//
			// widget: dijit._Widget
			//		Any dijit._Widget subclass.
			if(hash[widget.id]){
				throw new Error("Tried to register widget with id==" + widget.id + " but that id is already registered");
			}
			hash[widget.id] = widget;
			this.length++;
		},

		remove: function(/*String*/ id){
			// summary:
			//		Remove a widget from the registry. Does not destroy the widget; simply
			//		removes the reference.
			if(hash[id]){
				delete hash[id];
				this.length--;
			}
		},

		byId: function(/*String|Widget*/ id){
			// summary:
			//		Find a widget by it's id.
			//		If passed a widget then just returns the widget.
			return typeof id == "string" ? hash[id] : id;	// dijit._Widget
		},

		byNode: function(/*DOMNode*/ node){
			// summary:
			//		Returns the widget corresponding to the given DOMNode
			return hash[node.getAttribute("widgetId")]; // dijit._Widget
		},

		toArray: function(){
			// summary:
			//		Convert registry into a true Array
			//
			// example:
			//		Work with the widget .domNodes in a real Array
			//		|	array.map(dijit.registry.toArray(), function(w){ return w.domNode; });

			var ar = [];
			for(var id in hash){
				ar.push(hash[id]);
			}
			return ar;	// dijit._Widget[]
		},

		getUniqueId: function(/*String*/widgetType){
			// summary:
			//		Generates a unique id for a given widgetType

			var id;
			do{
				id = widgetType + "_" +
					(widgetType in _widgetTypeCtr ?
						++_widgetTypeCtr[widgetType] : _widgetTypeCtr[widgetType] = 0);
			}while(hash[id]);
			return dijit._scopeName == "dijit" ? id : dijit._scopeName + "_" + id; // String
		},

		findWidgets: function(/*DomNode*/ root){
			// summary:
			//		Search subtree under root returning widgets found.
			//		Doesn't search for nested widgets (ie, widgets inside other widgets).

			var outAry = [];

			function getChildrenHelper(root){
				for(var node = root.firstChild; node; node = node.nextSibling){
					if(node.nodeType == 1){
						var widgetId = node.getAttribute("widgetId");
						if(widgetId){
							var widget = hash[widgetId];
							if(widget){	// may be null on page w/multiple dojo's loaded
								outAry.push(widget);
							}
						}else{
							getChildrenHelper(node);
						}
					}
				}
			}

			getChildrenHelper(root);
			return outAry;
		},

		_destroyAll: function(){
			// summary:
			//		Code to destroy all widgets and do other cleanup on page unload

			// Clean up focus manager lingering references to widgets and nodes
			dijit._curFocus = null;
			dijit._prevFocus = null;
			dijit._activeStack = [];

			// Destroy all the widgets, top down
			array.forEach(registry.findWidgets(win.body()), function(widget){
				// Avoid double destroy of widgets like Menu that are attached to <body>
				// even though they are logically children of other widgets.
				if(!widget._destroyed){
					if(widget.destroyRecursive){
						widget.destroyRecursive();
					}else if(widget.destroy){
						widget.destroy();
					}
				}
			});
		},

		getEnclosingWidget: function(/*DOMNode*/ node){
			// summary:
			//		Returns the widget whose DOM tree contains the specified DOMNode, or null if
			//		the node is not contained within the DOM tree of any widget
			while(node){
				var id = node.getAttribute && node.getAttribute("widgetId");
				if(id){
					return hash[id];
				}
				node = node.parentNode;
			}
			return null;
		},

		// In case someone needs to access hash.
		// Actually, this is accessed from WidgetSet back-compatibility code
		_hash: hash
	};

	/*=====
	dijit.registry = {
		// summary:
		//		A list of widgets on a page.
	};
	=====*/
	dijit.registry = registry;

	return registry;
});

},
'dijit/_OnDijitClickMixin':function(){
define("dijit/_OnDijitClickMixin", [
	"dojo/on",
	"dojo/_base/array", // array.forEach
	"dojo/keys", // keys.ENTER keys.SPACE
	"dojo/_base/declare", // declare
	"dojo/_base/sniff", // has("ie")
	"dojo/_base/unload", // unload.addOnWindowUnload
	"dojo/_base/window" // win.doc.addEventListener win.doc.attachEvent win.doc.detachEvent
], function(on, array, keys, declare, has, unload, win){

	// module:
	//		dijit/_OnDijitClickMixin
	// summary:
	//		Mixin so you can pass "ondijitclick" to this.connect() method,
	//		as a way to handle clicks by mouse, or by keyboard (SPACE/ENTER key)


	// Keep track of where the last keydown event was, to help avoid generating
	// spurious ondijitclick events when:
	// 1. focus is on a <button> or <a>
	// 2. user presses then releases the ENTER key
	// 3. onclick handler fires and shifts focus to another node, with an ondijitclick handler
	// 4. onkeyup event fires, causing the ondijitclick handler to fire
	var lastKeyDownNode = null;
	if(has("ie") < 9){
		(function(){
			var keydownCallback = function(evt){
				lastKeyDownNode = evt.srcElement;
			};
			win.doc.attachEvent('onkeydown', keydownCallback);
			unload.addOnWindowUnload(function(){
				win.doc.detachEvent('onkeydown', keydownCallback);
			});
		})();
	}else{
		win.doc.addEventListener('keydown', function(evt){
			lastKeyDownNode = evt.target;
		}, true);
	}

	// Custom a11yclick (a.k.a. ondijitclick) event
	var a11yclick = function(node, listener){
		if(/input|button/i.test(node.nodeName)){
			// pass through, the browser already generates click event on SPACE/ENTER key
			return on(node, "click", listener);
		}else{
			// Don't fire the click event unless both the keydown and keyup occur on this node.
			// Avoids problems where focus shifted to this node or away from the node on keydown,
			// either causing this node to process a stray keyup event, or causing another node
			// to get a stray keyup event.

			function clickKey(/*Event*/ e){
				return (e.keyCode == keys.ENTER || e.keyCode == keys.SPACE) &&
						!e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey;
			}
			var handles = [
				on(node, "keypress", function(e){
					//console.log(this.id + ": onkeydown, e.target = ", e.target, ", lastKeyDownNode was ", lastKeyDownNode, ", equality is ", (e.target === lastKeyDownNode));
					if(clickKey(e)){
						// needed on IE for when focus changes between keydown and keyup - otherwise dropdown menus do not work
						lastKeyDownNode = e.target;

						// Prevent viewport scrolling on space key in IE<9.
						// (Reproducible on test_Button.html on any of the first dijit.form.Button examples)
						// Do this onkeypress rather than onkeydown because onkeydown.preventDefault() will
						// suppress the onkeypress event, breaking _HasDropDown
						e.preventDefault();
					}
				}),

				on(node, "keyup", function(e){
					//console.log(this.id + ": onkeyup, e.target = ", e.target, ", lastKeyDownNode was ", lastKeyDownNode, ", equality is ", (e.target === lastKeyDownNode));
					if(clickKey(e) && e.target == lastKeyDownNode){	// === breaks greasemonkey
						//need reset here or have problems in FF when focus returns to trigger element after closing popup/alert
						lastKeyDownNode = null;
						listener.call(this, e);
					}
				}),

				on(node, "click", function(e){
					// and connect for mouse clicks too (or touch-clicks on mobile)
					listener.call(this, e);
				})
			];

			return {
				remove: function(){
					array.forEach(handles, function(h){ h.remove(); });
				}
			};
		}
	};

	return declare("dijit._OnDijitClickMixin", null, {
		connect: function(
				/*Object|null*/ obj,
				/*String|Function*/ event,
				/*String|Function*/ method){
			// summary:
			//		Connects specified obj/event to specified method of this object
			//		and registers for disconnect() on widget destroy.
			// description:
			//		Provide widget-specific analog to connect.connect, except with the
			//		implicit use of this widget as the target object.
			//		This version of connect also provides a special "ondijitclick"
			//		event which triggers on a click or space or enter keyup.
			//		Events connected with `this.connect` are disconnected upon
			//		destruction.
			// returns:
			//		A handle that can be passed to `disconnect` in order to disconnect before
			//		the widget is destroyed.
			// example:
			//	|	var btn = new dijit.form.Button();
			//	|	// when foo.bar() is called, call the listener we're going to
			//	|	// provide in the scope of btn
			//	|	btn.connect(foo, "bar", function(){
			//	|		console.debug(this.toString());
			//	|	});
			// tags:
			//		protected

			return this.inherited(arguments, [obj, event == "ondijitclick" ? a11yclick : event, method]);
		}
	});
});

},
'dijit/hccss':function(){
define("dijit/hccss", [
	"require",			// require.toUrl
	"dojo/_base/config", // config.blankGif
	"dojo/dom-class", // domClass.add domConstruct.create domStyle.getComputedStyle
	"dojo/dom-construct", // domClass.add domConstruct.create domStyle.getComputedStyle
	"dojo/dom-style", // domClass.add domConstruct.create domStyle.getComputedStyle
	"dojo/ready", // ready
	"dojo/_base/sniff", // has("ie") has("mozilla")
	"dojo/_base/window" // win.body
], function(require, config, domClass, domConstruct, domStyle, ready, has, win){

	// module:
	//		dijit/hccss
	// summary:
	//		Test if computer is in high contrast mode, and sets dijit_a11y flag on <body> if it is.

	if(has("ie") || has("mozilla")){	// NOTE: checking in Safari messes things up
		// priority is 90 to run ahead of parser priority of 100
		ready(90, function(){
			// summary:
			//		Detects if we are in high-contrast mode or not

			// create div for testing if high contrast mode is on or images are turned off
			var div = domConstruct.create("div",{
				id: "a11yTestNode",
				style:{
					cssText:'border: 1px solid;'
						+ 'border-color:red green;'
						+ 'position: absolute;'
						+ 'height: 5px;'
						+ 'top: -999px;'
						+ 'background-image: url("' + (config.blankGif || require.toUrl("dojo/resources/blank.gif")) + '");'
				}
			}, win.body());

			// test it
			var cs = domStyle.getComputedStyle(div);
			if(cs){
				var bkImg = cs.backgroundImage;
				var needsA11y = (cs.borderTopColor == cs.borderRightColor) || (bkImg != null && (bkImg == "none" || bkImg == "url(invalid-url:)" ));
				if(needsA11y){
					domClass.add(win.body(), "dijit_a11y");
				}
				if(has("ie")){
					div.outerHTML = "";		// prevent mixed-content warning, see http://support.microsoft.com/kb/925014
				}else{
					win.body().removeChild(div);
				}
			}
		});
	}
});

},
'dijit/_TemplatedMixin':function(){
define("dijit/_TemplatedMixin", [
	"dojo/_base/lang", // lang.getObject
	"dojo/touch",
	"./_WidgetBase",
	"dojo/string", // string.substitute string.trim
	"dojo/cache",	// dojo.cache
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.destroy, domConstruct.toDom
	"dojo/_base/sniff", // has("ie")
	"dojo/_base/unload", // unload.addOnWindowUnload
	"dojo/_base/window" // win.doc
], function(lang, touch, _WidgetBase, string, cache, array, declare, domConstruct, has, unload, win) {

/*=====
	var _WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dijit/_TemplatedMixin
	// summary:
	//		Mixin for widgets that are instantiated from a template

	var _TemplatedMixin = declare("dijit._TemplatedMixin", null, {
		// summary:
		//		Mixin for widgets that are instantiated from a template

		// templateString: [protected] String
		//		A string that represents the widget template.
		//		Use in conjunction with dojo.cache() to load from a file.
		templateString: null,

		// templatePath: [protected deprecated] String
		//		Path to template (HTML file) for this widget relative to dojo.baseUrl.
		//		Deprecated: use templateString with require([... "dojo/text!..."], ...) instead
		templatePath: null,

		// skipNodeCache: [protected] Boolean
		//		If using a cached widget template nodes poses issues for a
		//		particular widget class, it can set this property to ensure
		//		that its template is always re-built from a string
		_skipNodeCache: false,

		// _earlyTemplatedStartup: Boolean
		//		A fallback to preserve the 1.0 - 1.3 behavior of children in
		//		templates having their startup called before the parent widget
		//		fires postCreate. Defaults to 'false', causing child widgets to
		//		have their .startup() called immediately before a parent widget
		//		.startup(), but always after the parent .postCreate(). Set to
		//		'true' to re-enable to previous, arguably broken, behavior.
		_earlyTemplatedStartup: false,

/*=====
		// _attachPoints: [private] String[]
		//		List of widget attribute names associated with data-dojo-attach-point=... in the
		//		template, ex: ["containerNode", "labelNode"]
 		_attachPoints: [],
 =====*/

/*=====
		// _attachEvents: [private] Handle[]
		//		List of connections associated with data-dojo-attach-event=... in the
		//		template
 		_attachEvents: [],
 =====*/

		constructor: function(){
			this._attachPoints = [];
			this._attachEvents = [];
		},

		_stringRepl: function(tmpl){
			// summary:
			//		Does substitution of ${foo} type properties in template string
			// tags:
			//		private
			var className = this.declaredClass, _this = this;
			// Cache contains a string because we need to do property replacement
			// do the property replacement
			return string.substitute(tmpl, this, function(value, key){
				if(key.charAt(0) == '!'){ value = lang.getObject(key.substr(1), false, _this); }
				if(typeof value == "undefined"){ throw new Error(className+" template:"+key); } // a debugging aide
				if(value == null){ return ""; }

				// Substitution keys beginning with ! will skip the transform step,
				// in case a user wishes to insert unescaped markup, e.g. ${!foo}
				return key.charAt(0) == "!" ? value :
					// Safer substitution, see heading "Attribute values" in
					// http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.3.2
					value.toString().replace(/"/g,"&quot;"); //TODO: add &amp? use encodeXML method?
			}, this);
		},

		buildRendering: function(){
			// summary:
			//		Construct the UI for this widget from a template, setting this.domNode.
			// tags:
			//		protected

			if(!this.templateString){
				this.templateString = cache(this.templatePath, {sanitize: true});
			}

			// Lookup cached version of template, and download to cache if it
			// isn't there already.  Returns either a DomNode or a string, depending on
			// whether or not the template contains ${foo} replacement parameters.
			var cached = _TemplatedMixin.getCachedTemplate(this.templateString, this._skipNodeCache);

			var node;
			if(lang.isString(cached)){
				node = domConstruct.toDom(this._stringRepl(cached));
				if(node.nodeType != 1){
					// Flag common problems such as templates with multiple top level nodes (nodeType == 11)
					throw new Error("Invalid template: " + cached);
				}
			}else{
				// if it's a node, all we have to do is clone it
				node = cached.cloneNode(true);
			}

			this.domNode = node;

			// Call down to _Widget.buildRendering() to get base classes assigned
			// TODO: change the baseClass assignment to _setBaseClassAttr
			this.inherited(arguments);

			// recurse through the node, looking for, and attaching to, our
			// attachment points and events, which should be defined on the template node.
			this._attachTemplateNodes(node, function(n,p){ return n.getAttribute(p); });

			this._beforeFillContent();		// hook for _WidgetsInTemplateMixin

			this._fillContent(this.srcNodeRef);
		},

		_beforeFillContent: function(){
		},

		_fillContent: function(/*DomNode*/ source){
			// summary:
			//		Relocate source contents to templated container node.
			//		this.containerNode must be able to receive children, or exceptions will be thrown.
			// tags:
			//		protected
			var dest = this.containerNode;
			if(source && dest){
				while(source.hasChildNodes()){
					dest.appendChild(source.firstChild);
				}
			}
		},

		_attachTemplateNodes: function(rootNode, getAttrFunc){
			// summary:
			//		Iterate through the template and attach functions and nodes accordingly.
			//		Alternately, if rootNode is an array of widgets, then will process data-dojo-attach-point
			//		etc. for those widgets.
			// description:
			//		Map widget properties and functions to the handlers specified in
			//		the dom node and it's descendants. This function iterates over all
			//		nodes and looks for these properties:
			//			* dojoAttachPoint/data-dojo-attach-point
			//			* dojoAttachEvent/data-dojo-attach-event
			// rootNode: DomNode|Widget[]
			//		the node to search for properties. All children will be searched.
			// getAttrFunc: Function
			//		a function which will be used to obtain property for a given
			//		DomNode/Widget
			// tags:
			//		private

			var nodes = lang.isArray(rootNode) ? rootNode : (rootNode.all || rootNode.getElementsByTagName("*"));
			var x = lang.isArray(rootNode) ? 0 : -1;
			for(; x<nodes.length; x++){
				var baseNode = (x == -1) ? rootNode : nodes[x];
				if(this.widgetsInTemplate && (getAttrFunc(baseNode, "dojoType") || getAttrFunc(baseNode, "data-dojo-type"))){
					continue;
				}
				// Process data-dojo-attach-point
				var attachPoint = getAttrFunc(baseNode, "dojoAttachPoint") || getAttrFunc(baseNode, "data-dojo-attach-point");
				if(attachPoint){
					var point, points = attachPoint.split(/\s*,\s*/);
					while((point = points.shift())){
						if(lang.isArray(this[point])){
							this[point].push(baseNode);
						}else{
							this[point]=baseNode;
						}
						this._attachPoints.push(point);
					}
				}

				// Process data-dojo-attach-event
				var attachEvent = getAttrFunc(baseNode, "dojoAttachEvent") || getAttrFunc(baseNode, "data-dojo-attach-event");
				if(attachEvent){
					// NOTE: we want to support attributes that have the form
					// "domEvent: nativeEvent; ..."
					var event, events = attachEvent.split(/\s*,\s*/);
					var trim = lang.trim;
					while((event = events.shift())){
						if(event){
							var thisFunc = null;
							if(event.indexOf(":") != -1){
								// oh, if only JS had tuple assignment
								var funcNameArr = event.split(":");
								event = trim(funcNameArr[0]);
								thisFunc = trim(funcNameArr[1]);
							}else{
								event = trim(event);
							}
							if(!thisFunc){
								thisFunc = event;
							}
							// Map "press", "move" and "release" to keys.touch, keys.move, keys.release
							this._attachEvents.push(this.connect(baseNode, touch[event] || event, thisFunc));
						}
					}
				}
			}
		},

		destroyRendering: function(){
			// Delete all attach points to prevent IE6 memory leaks.
			array.forEach(this._attachPoints, function(point){
				delete this[point];
			}, this);
			this._attachPoints = [];

			// And same for event handlers
			array.forEach(this._attachEvents, this.disconnect, this);
			this._attachEvents = [];

			this.inherited(arguments);
		}
	});

	// key is templateString; object is either string or DOM tree
	_TemplatedMixin._templateCache = {};

	_TemplatedMixin.getCachedTemplate = function(templateString, alwaysUseString){
		// summary:
		//		Static method to get a template based on the templatePath or
		//		templateString key
		// templateString: String
		//		The template
		// alwaysUseString: Boolean
		//		Don't cache the DOM tree for this template, even if it doesn't have any variables
		// returns: Mixed
		//		Either string (if there are ${} variables that need to be replaced) or just
		//		a DOM tree (if the node can be cloned directly)

		// is it already cached?
		var tmplts = _TemplatedMixin._templateCache;
		var key = templateString;
		var cached = tmplts[key];
		if(cached){
			try{
				// if the cached value is an innerHTML string (no ownerDocument) or a DOM tree created within the current document, then use the current cached value
				if(!cached.ownerDocument || cached.ownerDocument == win.doc){
					// string or node of the same document
					return cached;
				}
			}catch(e){ /* squelch */ } // IE can throw an exception if cached.ownerDocument was reloaded
			domConstruct.destroy(cached);
		}

		templateString = string.trim(templateString);

		if(alwaysUseString || templateString.match(/\$\{([^\}]+)\}/g)){
			// there are variables in the template so all we can do is cache the string
			return (tmplts[key] = templateString); //String
		}else{
			// there are no variables in the template so we can cache the DOM tree
			var node = domConstruct.toDom(templateString);
			if(node.nodeType != 1){
				throw new Error("Invalid template: " + templateString);
			}
			return (tmplts[key] = node); //Node
		}
	};

	if(has("ie")){
		unload.addOnWindowUnload(function(){
			var cache = _TemplatedMixin._templateCache;
			for(var key in cache){
				var value = cache[key];
				if(typeof value == "object"){ // value is either a string or a DOM node template
					domConstruct.destroy(value);
				}
				delete cache[key];
			}
		});
	}

	// These arguments can be specified for widgets which are used in templates.
	// Since any widget can be specified as sub widgets in template, mix it
	// into the base widget class.  (This is a hack, but it's effective.)
	lang.extend(_WidgetBase,{
		dojoAttachEvent: "",
		dojoAttachPoint: ""
	});

	return _TemplatedMixin;
});

},
'dijit/_Widget':function(){
define("dijit/_Widget", [
	"dojo/aspect",	// aspect.around
	"dojo/_base/config",	// config.isDebug
	"dojo/_base/connect",	// connect.connect
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.hitch
	"dojo/query",
	"dojo/ready",
	"./registry",	// registry.byNode
	"./_WidgetBase",
	"./_OnDijitClickMixin",
	"./_FocusMixin",
	"dojo/uacss",		// browser sniffing (included for back-compat; subclasses may be using)
	"./hccss"		// high contrast mode sniffing (included to set CSS classes on <body>, module ret value unused)
], function(aspect, config, connect, declare, kernel, lang, query, ready,
			registry, _WidgetBase, _OnDijitClickMixin, _FocusMixin){

/*=====
	var _WidgetBase = dijit._WidgetBase;
	var _OnDijitClickMixin = dijit._OnDijitClickMixin;
	var _FocusMixin = dijit._FocusMixin;
=====*/


// module:
//		dijit/_Widget
// summary:
//		Old base for widgets.   New widgets should extend _WidgetBase instead


function connectToDomNode(){
	// summary:
	//		If user connects to a widget method === this function, then they will
	//		instead actually be connecting the equivalent event on this.domNode
}

// Trap dojo.connect() calls to connectToDomNode methods, and redirect to _Widget.on()
function aroundAdvice(originalConnect){
	return function(obj, event, scope, method){
		if(obj && typeof event == "string" && obj[event] == connectToDomNode){
			return obj.on(event.substring(2).toLowerCase(), lang.hitch(scope, method));
		}
		return originalConnect.apply(connect, arguments);
	};
}
aspect.around(connect, "connect", aroundAdvice);
if(kernel.connect){
	aspect.around(kernel, "connect", aroundAdvice);
}

var _Widget = declare("dijit._Widget", [_WidgetBase, _OnDijitClickMixin, _FocusMixin], {
	// summary:
	//		Base class for all Dijit widgets.
	//
	//		Extends _WidgetBase, adding support for:
	//			- declaratively/programatically specifying widget initialization parameters like
	//				onMouseMove="foo" that call foo when this.domNode gets a mousemove event
	//			- ondijitclick
	//				Support new data-dojo-attach-event="ondijitclick: ..." that is triggered by a mouse click or a SPACE/ENTER keypress
	//			- focus related functions
	//				In particular, the onFocus()/onBlur() callbacks.   Driven internally by
	//				dijit/_base/focus.js.
	//			- deprecated methods
	//			- onShow(), onHide(), onClose()
	//
	//		Also, by loading code in dijit/_base, turns on:
	//			- browser sniffing (putting browser id like .dj_ie on <html> node)
	//			- high contrast mode sniffing (add .dijit_a11y class to <body> if machine is in high contrast mode)


	////////////////// DEFERRED CONNECTS ///////////////////

	onClick: connectToDomNode,
	/*=====
	onClick: function(event){
		// summary:
		//		Connect to this function to receive notifications of mouse click events.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onDblClick: connectToDomNode,
	/*=====
	onDblClick: function(event){
		// summary:
		//		Connect to this function to receive notifications of mouse double click events.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onKeyDown: connectToDomNode,
	/*=====
	onKeyDown: function(event){
		// summary:
		//		Connect to this function to receive notifications of keys being pressed down.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onKeyPress: connectToDomNode,
	/*=====
	onKeyPress: function(event){
		// summary:
		//		Connect to this function to receive notifications of printable keys being typed.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onKeyUp: connectToDomNode,
	/*=====
	onKeyUp: function(event){
		// summary:
		//		Connect to this function to receive notifications of keys being released.
		// event:
		//		key Event
		// tags:
		//		callback
	},
	=====*/
	onMouseDown: connectToDomNode,
	/*=====
	onMouseDown: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse button is pressed down.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseMove: connectToDomNode,
	/*=====
	onMouseMove: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves over nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseOut: connectToDomNode,
	/*=====
	onMouseOut: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves off of nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseOver: connectToDomNode,
	/*=====
	onMouseOver: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves onto nodes contained within this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseLeave: connectToDomNode,
	/*=====
	onMouseLeave: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves off of this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseEnter: connectToDomNode,
	/*=====
	onMouseEnter: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse moves onto this widget.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/
	onMouseUp: connectToDomNode,
	/*=====
	onMouseUp: function(event){
		// summary:
		//		Connect to this function to receive notifications of when the mouse button is released.
		// event:
		//		mouse Event
		// tags:
		//		callback
	},
	=====*/

	constructor: function(params){
		// extract parameters like onMouseMove that should connect directly to this.domNode
		this._toConnect = {};
		for(var name in params){
			if(this[name] === connectToDomNode){
				this._toConnect[name.replace(/^on/, "").toLowerCase()] = params[name];
				delete params[name];
			}
		}
	},

	postCreate: function(){
		this.inherited(arguments);

		// perform connection from this.domNode to user specified handlers (ex: onMouseMove)
		for(var name in this._toConnect){
			this.on(name, this._toConnect[name]);
		}
		delete this._toConnect;
	},

	on: function(/*String*/ type, /*Function*/ func){
		if(this[this._onMap(type)] === connectToDomNode){
			// Use connect.connect() rather than on() to get handling for "onmouseenter" on non-IE, etc.
			// Also, need to specify context as "this" rather than the default context of the DOMNode
			return connect.connect(this.domNode, type.toLowerCase(), this, func);
		}
		return this.inherited(arguments);
	},

	_setFocusedAttr: function(val){
		// Remove this method in 2.0 (or sooner), just here to set _focused == focused, for back compat
		// (but since it's a private variable we aren't required to keep supporting it).
		this._focused = val;
		this._set("focused", val);
	},

	////////////////// DEPRECATED METHODS ///////////////////

	setAttribute: function(/*String*/ attr, /*anything*/ value){
		// summary:
		//		Deprecated.  Use set() instead.
		// tags:
		//		deprecated
		kernel.deprecated(this.declaredClass+"::setAttribute(attr, value) is deprecated. Use set() instead.", "", "2.0");
		this.set(attr, value);
	},

	attr: function(/*String|Object*/name, /*Object?*/value){
		// summary:
		//		Set or get properties on a widget instance.
		//	name:
		//		The property to get or set. If an object is passed here and not
		//		a string, its keys are used as names of attributes to be set
		//		and the value of the object as values to set in the widget.
		//	value:
		//		Optional. If provided, attr() operates as a setter. If omitted,
		//		the current value of the named property is returned.
		// description:
		//		This method is deprecated, use get() or set() directly.

		// Print deprecation warning but only once per calling function
		if(config.isDebug){
			var alreadyCalledHash = arguments.callee._ach || (arguments.callee._ach = {}),
				caller = (arguments.callee.caller || "unknown caller").toString();
			if(!alreadyCalledHash[caller]){
				kernel.deprecated(this.declaredClass + "::attr() is deprecated. Use get() or set() instead, called from " +
				caller, "", "2.0");
				alreadyCalledHash[caller] = true;
			}
		}

		var args = arguments.length;
		if(args >= 2 || typeof name === "object"){ // setter
			return this.set.apply(this, arguments);
		}else{ // getter
			return this.get(name);
		}
	},

	getDescendants: function(){
		// summary:
		//		Returns all the widgets contained by this, i.e., all widgets underneath this.containerNode.
		//		This method should generally be avoided as it returns widgets declared in templates, which are
		//		supposed to be internal/hidden, but it's left here for back-compat reasons.

		kernel.deprecated(this.declaredClass+"::getDescendants() is deprecated. Use getChildren() instead.", "", "2.0");
		return this.containerNode ? query('[widgetId]', this.containerNode).map(registry.byNode) : []; // dijit._Widget[]
	},

	////////////////// MISCELLANEOUS METHODS ///////////////////

	_onShow: function(){
		// summary:
		//		Internal method called when this widget is made visible.
		//		See `onShow` for details.
		this.onShow();
	},

	onShow: function(){
		// summary:
		//		Called when this widget becomes the selected pane in a
		//		`dijit.layout.TabContainer`, `dijit.layout.StackContainer`,
		//		`dijit.layout.AccordionContainer`, etc.
		//
		//		Also called to indicate display of a `dijit.Dialog`, `dijit.TooltipDialog`, or `dijit.TitlePane`.
		// tags:
		//		callback
	},

	onHide: function(){
		// summary:
			//		Called when another widget becomes the selected pane in a
			//		`dijit.layout.TabContainer`, `dijit.layout.StackContainer`,
			//		`dijit.layout.AccordionContainer`, etc.
			//
			//		Also called to indicate hide of a `dijit.Dialog`, `dijit.TooltipDialog`, or `dijit.TitlePane`.
			// tags:
			//		callback
	},

	onClose: function(){
		// summary:
		//		Called when this widget is being displayed as a popup (ex: a Calendar popped
		//		up from a DateTextBox), and it is hidden.
		//		This is called from the dijit.popup code, and should not be called directly.
		//
		//		Also used as a parameter for children of `dijit.layout.StackContainer` or subclasses.
		//		Callback if a user tries to close the child.   Child will be closed if this function returns true.
		// tags:
		//		extension

		return true;		// Boolean
	}
});

// For back-compat, remove in 2.0.
if(!kernel.isAsync){
	ready(0, function(){
		var requires = ["dijit/_base"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}
return _Widget;
});

},
'dijit/_FocusMixin':function(){
define("dijit/_FocusMixin", [
	"./focus",
	"./_WidgetBase",
	"dojo/_base/declare", // declare
	"dojo/_base/lang" // lang.extend
], function(focus, _WidgetBase, declare, lang){

/*=====
	var _WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dijit/_FocusMixin
	// summary:
	//		Mixin to widget to provide _onFocus() and _onBlur() methods that
	//		fire when a widget or it's descendants get/lose focus

	// We don't know where _FocusMixin will occur in the inheritance chain, but we need the _onFocus()/_onBlur() below
	// to be last in the inheritance chain, so mixin to _WidgetBase.
	lang.extend(_WidgetBase, {
		// focused: [readonly] Boolean
		//		This widget or a widget it contains has focus, or is "active" because
		//		it was recently clicked.
		focused: false,

		onFocus: function(){
			// summary:
			//		Called when the widget becomes "active" because
			//		it or a widget inside of it either has focus, or has recently
			//		been clicked.
			// tags:
			//		callback
		},

		onBlur: function(){
			// summary:
			//		Called when the widget stops being "active" because
			//		focus moved to something outside of it, or the user
			//		clicked somewhere outside of it, or the widget was
			//		hidden.
			// tags:
			//		callback
		},

		_onFocus: function(){
			// summary:
			//		This is where widgets do processing for when they are active,
			//		such as changing CSS classes.  See onFocus() for more details.
			// tags:
			//		protected
			this.onFocus();
		},

		_onBlur: function(){
			// summary:
			//		This is where widgets do processing for when they stop being active,
			//		such as changing CSS classes.  See onBlur() for more details.
			// tags:
			//		protected
			this.onBlur();
		}
	});

	return declare("dijit._FocusMixin", null, {
		// summary:
		//		Mixin to widget to provide _onFocus() and _onBlur() methods that
		//		fire when a widget or it's descendants get/lose focus

		// flag that I want _onFocus()/_onBlur() notifications from focus manager
		_focusManager: focus
	});

});

},
'dijit/focus':function(){
define("dijit/focus", [
	"dojo/aspect",
	"dojo/_base/declare", // declare
	"dojo/dom", // domAttr.get dom.isDescendant
	"dojo/dom-attr", // domAttr.get dom.isDescendant
	"dojo/dom-construct", // connect to domConstruct.empty, domConstruct.destroy
	"dojo/Evented",
	"dojo/_base/lang", // lang.hitch
	"dojo/on",
	"dojo/domReady",
	"dojo/_base/sniff", // has("ie")
	"dojo/Stateful",
	"dojo/_base/window", // win.body
	"dojo/window", // winUtils.get
	"./a11y",	// a11y.isTabNavigable
	"./registry",	// registry.byId
	"./main"		// to set dijit.focus
], function(aspect, declare, dom, domAttr, domConstruct, Evented, lang, on, domReady, has, Stateful, win, winUtils,
			a11y, registry, dijit){

	// module:
	//		dijit/focus

	var FocusManager = declare([Stateful, Evented], {
		// summary:
		//		Tracks the currently focused node, and which widgets are currently "active".
		//		Access via require(["dijit/focus"], function(focus){ ... }).
		//
		//		A widget is considered active if it or a descendant widget has focus,
		//		or if a non-focusable node of this widget or a descendant was recently clicked.
		//
		//		Call focus.watch("curNode", callback) to track the current focused DOMNode,
		//		or focus.watch("activeStack", callback) to track the currently focused stack of widgets.
		//
		//		Call focus.on("widget-blur", func) or focus.on("widget-focus", ...) to monitor when
		//		when widgets become active/inactive
		//
		//		Finally, focus(node) will focus a node, suppressing errors if the node doesn't exist.

		// curNode: DomNode
		//		Currently focused item on screen
		curNode: null,

		// activeStack: dijit/_WidgetBase[]
		//		List of currently active widgets (focused widget and it's ancestors)
		activeStack: [],

		constructor: function(){
			// Don't leave curNode/prevNode pointing to bogus elements
			var check = lang.hitch(this, function(node){
				if(dom.isDescendant(this.curNode, node)){
					this.set("curNode", null);
				}
				if(dom.isDescendant(this.prevNode, node)){
					this.set("prevNode", null);
				}
			});
			aspect.before(domConstruct, "empty", check);
			aspect.before(domConstruct, "destroy", check);
		},

		registerIframe: function(/*DomNode*/ iframe){
			// summary:
			//		Registers listeners on the specified iframe so that any click
			//		or focus event on that iframe (or anything in it) is reported
			//		as a focus/click event on the `<iframe>` itself.
			// description:
			//		Currently only used by editor.
			// returns:
			//		Handle with remove() method to deregister.
			return this.registerWin(iframe.contentWindow, iframe);
		},

		registerWin: function(/*Window?*/targetWindow, /*DomNode?*/ effectiveNode){
			// summary:
			//		Registers listeners on the specified window (either the main
			//		window or an iframe's window) to detect when the user has clicked somewhere
			//		or focused somewhere.
			// description:
			//		Users should call registerIframe() instead of this method.
			// targetWindow:
			//		If specified this is the window associated with the iframe,
			//		i.e. iframe.contentWindow.
			// effectiveNode:
			//		If specified, report any focus events inside targetWindow as
			//		an event on effectiveNode, rather than on evt.target.
			// returns:
			//		Handle with remove() method to deregister.

			// TODO: make this function private in 2.0; Editor/users should call registerIframe(),

			// Listen for blur and focus events on targetWindow's document.
			var _this = this,
				body = targetWindow.document && targetWindow.document.body;

			if(body){
				var mdh = on(body, 'mousedown', function(evt){
					_this._justMouseDowned = true;
					// Use a 13 ms timeout to work-around Chrome resolving too fast and focusout
					// events not seeing that a mousedown just happened when a popup closes.
					// See https://bugs.dojotoolkit.org/ticket/17668
					setTimeout(function(){ _this._justMouseDowned = false; }, 13);

					// workaround weird IE bug where the click is on an orphaned node
					// (first time clicking a Select/DropDownButton inside a TooltipDialog).
					// actually, strangely this is happening on latest chrome too.
					if(evt && evt.target && evt.target.parentNode == null){
						return;
					}

					_this._onTouchNode(effectiveNode || evt.target, "mouse");
				});

				var fih = on(body, 'focusin', function(evt){

					// When you refocus the browser window, IE gives an event with an empty srcElement
					if(!evt.target.tagName) { return; }

					// IE reports that nodes like <body> have gotten focus, even though they have tabIndex=-1,
					// ignore those events
					var tag = evt.target.tagName.toLowerCase();
					if(tag == "#document" || tag == "body"){ return; }

					if(a11y.isTabNavigable(evt.target)){
						// If condition doesn't seem quite right, but it is correctly preventing focus events for
						// clicks on disabled buttons.
						_this._onFocusNode(effectiveNode || evt.target);
					}else{
						// Previous code called _onTouchNode() for any activate event on a non-focusable node.   Can
						// probably just ignore such an event as it will be handled by onmousedown handler above, but
						// leaving the code for now.
						_this._onTouchNode(effectiveNode || evt.target);
					}
				});

				var foh = on(body, 'focusout', function(evt){
					_this._onBlurNode(effectiveNode || evt.target);
				});

				return {
					remove: function(){
						mdh.remove();
						fih.remove();
						foh.remove();
						mdh = fih = foh = null;
						body = null;	// prevent memory leak (apparent circular reference via closure)
					}
				};
			}
		},

		_onBlurNode: function(/*DomNode*/ node){
			// summary:
			//		Called when focus leaves a node.
			//		Usually ignored, _unless_ it *isn't* followed by touching another node,
			//		which indicates that we tabbed off the last field on the page,
			//		in which case every widget is marked inactive

			// If the blur event isn't followed by a focus event, it means the user clicked on something unfocusable,
			// so clear focus.
			if(this._clearFocusTimer){
				clearTimeout(this._clearFocusTimer);
			}
			this._clearFocusTimer = setTimeout(lang.hitch(this, function(){
				this.set("prevNode", this.curNode);
				this.set("curNode", null);
			}), 0);

			if(this._justMouseDowned){
				// the mouse down caused a new widget to be marked as active; this blur event
				// is coming late, so ignore it.
				return;
			}

			// If the blur event isn't followed by a focus or touch event then mark all widgets as inactive.
			if(this._clearActiveWidgetsTimer){
				clearTimeout(this._clearActiveWidgetsTimer);
			}
			this._clearActiveWidgetsTimer = setTimeout(lang.hitch(this, function(){
				delete this._clearActiveWidgetsTimer;
				this._setStack([]);
			}), 100);
		},

		_onTouchNode: function(/*DomNode*/ node, /*String*/ by){
			// summary:
			//		Callback when node is focused or mouse-downed
			// node:
			//		The node that was touched.
			// by:
			//		"mouse" if the focus/touch was caused by a mouse down event

			// ignore the recent blurNode event
			if(this._clearActiveWidgetsTimer){
				clearTimeout(this._clearActiveWidgetsTimer);
				delete this._clearActiveWidgetsTimer;
			}

			// compute stack of active widgets (ex: ComboButton --> Menu --> MenuItem)
			var newStack=[];
			try{
				while(node){
					var popupParent = domAttr.get(node, "dijitPopupParent");
					if(popupParent){
						node=registry.byId(popupParent).domNode;
					}else if(node.tagName && node.tagName.toLowerCase() == "body"){
						// is this the root of the document or just the root of an iframe?
						if(node === win.body()){
							// node is the root of the main document
							break;
						}
						// otherwise, find the iframe this node refers to (can't access it via parentNode,
						// need to do this trick instead). window.frameElement is supported in IE/FF/Webkit
						node=winUtils.get(node.ownerDocument).frameElement;
					}else{
						// if this node is the root node of a widget, then add widget id to stack,
						// except ignore clicks on disabled widgets (actually focusing a disabled widget still works,
						// to support MenuItem)
						var id = node.getAttribute && node.getAttribute("widgetId"),
							widget = id && registry.byId(id);
						if(widget && !(by == "mouse" && widget.get("disabled"))){
							newStack.unshift(id);
						}
						node=node.parentNode;
					}
				}
			}catch(e){ /* squelch */ }

			this._setStack(newStack, by);
		},

		_onFocusNode: function(/*DomNode*/ node){
			// summary:
			//		Callback when node is focused

			if(!node){
				return;
			}

			if(node.nodeType == 9){
				// Ignore focus events on the document itself.  This is here so that
				// (for example) clicking the up/down arrows of a spinner
				// (which don't get focus) won't cause that widget to blur. (FF issue)
				return;
			}

			// There was probably a blur event right before this event, but since we have a new focus, don't
			// do anything with the blur
			if(this._clearFocusTimer){
				clearTimeout(this._clearFocusTimer);
				delete this._clearFocusTimer;
			}

			this._onTouchNode(node);

			if(node == this.curNode){ return; }
			this.set("prevNode", this.curNode);
			this.set("curNode", node);
		},

		_setStack: function(/*String[]*/ newStack, /*String*/ by){
			// summary:
			//		The stack of active widgets has changed.  Send out appropriate events and records new stack.
			// newStack:
			//		array of widget id's, starting from the top (outermost) widget
			// by:
			//		"mouse" if the focus/touch was caused by a mouse down event

			var oldStack = this.activeStack, lastOldIdx = oldStack.length - 1, lastNewIdx = newStack.length - 1;

			if(newStack[lastNewIdx] == oldStack[lastOldIdx]){
				// no changes, return now to avoid spurious notifications about changes to activeStack
				return;
			}

			this.set("activeStack", newStack);

			var widget, i;

			// for all elements that have gone out of focus, set focused=false
			for(i = lastOldIdx; i >= 0 && oldStack[i] != newStack[i]; i--){
				widget = registry.byId(oldStack[i]);
				if(widget){
					widget._hasBeenBlurred = true;		// TODO: used by form widgets, should be moved there
					widget.set("focused", false);
					if(widget._focusManager == this){
						widget._onBlur(by);
					}
					this.emit("widget-blur", widget, by);
				}
			}

			// for all element that have come into focus, set focused=true
			for(i++; i <= lastNewIdx; i++){
				widget = registry.byId(newStack[i]);
				if(widget){
					widget.set("focused", true);
					if(widget._focusManager == this){
						widget._onFocus(by);
					}
					this.emit("widget-focus", widget, by);
				}
			}
		},

		focus: function(node){
			// summary:
			//		Focus the specified node, suppressing errors if they occur
			if(node){
				try{ node.focus(); }catch(e){/*quiet*/}
			}
		}
	});

	var singleton = new FocusManager();

	// register top window and all the iframes it contains
	domReady(function(){
		var handle = singleton.registerWin(winUtils.get(document));
		if(has("ie")){
			on(window, "unload", function(){
				if(handle){	// because this gets called twice when doh.robot is running
					handle.remove();
					handle = null;
				}
			});
		}
	});

	// Setup dijit.focus as a pointer to the singleton but also (for backwards compatibility)
	// as a function to set focus.   Remove for 2.0.
	dijit.focus = function(node){
		singleton.focus(node);	// indirection here allows dijit/_base/focus.js to override behavior
	};
	for(var attr in singleton){
		if(!/^_/.test(attr)){
			dijit.focus[attr] = typeof singleton[attr] == "function" ? lang.hitch(singleton, attr) : singleton[attr];
		}
	}
	singleton.watch(function(attr, oldVal, newVal){
		dijit.focus[attr] = newVal;
	});

	return singleton;
});

},
'dijit/_Contained':function(){
define("dijit/_Contained", [
	"dojo/_base/declare", // declare
	"./registry"	// registry.getEnclosingWidget(), registry.byNode()
], function(declare, registry){

	// module:
	//		dijit/_Contained
	// summary:
	//		Mixin for widgets that are children of a container widget

	return declare("dijit._Contained", null, {
		// summary:
		//		Mixin for widgets that are children of a container widget
		//
		// example:
		// | 	// make a basic custom widget that knows about it's parents
		// |	declare("my.customClass",[dijit._Widget,dijit._Contained],{});

		_getSibling: function(/*String*/ which){
			// summary:
			//      Returns next or previous sibling
			// which:
			//      Either "next" or "previous"
			// tags:
			//      private
			var node = this.domNode;
			do{
				node = node[which+"Sibling"];
			}while(node && node.nodeType != 1);
			return node && registry.byNode(node);	// dijit._Widget
		},

		getPreviousSibling: function(){
			// summary:
			//		Returns null if this is the first child of the parent,
			//		otherwise returns the next element sibling to the "left".

			return this._getSibling("previous"); // dijit._Widget
		},

		getNextSibling: function(){
			// summary:
			//		Returns null if this is the last child of the parent,
			//		otherwise returns the next element sibling to the "right".

			return this._getSibling("next"); // dijit._Widget
		},

		getIndexInParent: function(){
			// summary:
			//		Returns the index of this widget within its container parent.
			//		It returns -1 if the parent does not exist, or if the parent
			//		is not a dijit._Container

			var p = this.getParent();
			if(!p || !p.getIndexOfChild){
				return -1; // int
			}
			return p.getIndexOfChild(this); // int
		}
	});
});

},
'dijit/main':function(){
define("dijit/main", [
	"dojo/_base/kernel"
], function(dojo){
	// module:
	//		dijit
	// summary:
	//		The dijit package main module

	return dojo.dijit;
});

},
'*noref':1}});
define("dojox/_dojox_layout_basic", [], 1);
require(["dojox/layout/ResizeHandle","dojox/layout/ContentPane"]);

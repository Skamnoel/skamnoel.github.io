require({cache:{
'dojox/charting/themes/Charged':function(){
define("dojox/charting/themes/Charged", ["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 75};
	
	themes.Charged = new Theme({
		chart: {
			fill: "#ededdf",
			pageStyle: {backgroundColor: "#ededdf", backgroundImage: "none", color: "inherit"}
		},
		plotarea: {
			fill: "transparent"
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#808078",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#b3b3a8",
				position:  "center",
				font:      "normal normal normal 7pt Helvetica, Arial, sans-serif",	// labels on axis
				fontColor: "#808078"								// color of labels
			}
		},
		series: {
			stroke:  {width: 2, color: "#595954"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#808078"
		},
		marker: {
			stroke:  {width: 3, color: "#595954"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#808078"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#004cbf", "#06f")},
			{fill: g(defaultFill, "#bf004c", "#f06")},
			{fill: g(defaultFill, "#43bf00", "#6f0")},
			{fill: g(defaultFill, "#7300bf", "#90f")},
			{fill: g(defaultFill, "#bf7300", "#f90")},
			{fill: g(defaultFill, "#00bf73", "#0f9")}
		],
		markerThemes: [
			{fill: "#06f", stroke: {color: "#06f"}},
			{fill: "#f06", stroke: {color: "#f06"}},
			{fill: "#6f0", stroke: {color: "#6f0"}},
			{fill: "#90f", stroke: {color: "#90f"}},
			{fill: "#f90", stroke: {color: "#f90"}},
			{fill: "#0f9", stroke: {color: "#0f9"}}
		]
	});
	
	themes.Charged.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = { width: 2.5, color: s.fill.colors[1].color};
			}
			if(elementType == "area"){
				s.fill.y2 = 90;
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.stroke;
			s.fill.y2 = 75;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Charged.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Charged;
});

},
'dojox/charting/plot2d/ClusteredBars':function(){
define("dojox/charting/plot2d/ClusteredBars", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Bars", "./common", 
		"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils"], 
	function(lang, arr, declare, Bars, dc, df, dfr, du){
/*=====
var Bars = dojox.charting.plot2d.Bars;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.ClusteredBars", Bars, {
		//	summary:
		//		A plot representing grouped or clustered bars (horizontal bars)
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.ClusteredBars
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, height, thickness,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._hScaler.bounds.lower),
				baselineWidth = ht(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt, this.series.length);
			gap = f.gap;
			height = thickness = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i], shift = thickness * (this.series.length - i - 1);
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("bar", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							hv = ht(v),
							width = hv - baselineWidth,
							w = Math.abs(width),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "bar", value, true) :
								t.post(theme, "bar");
						if(w >= 0 && height >= 1){
							var rect = {
								x: offsets.l + (v < baseline ? hv : baselineWidth),
								y: dim.height - offsets.b - vt(j + 1.5) + gap + shift,
								width: w, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									x:       v,
									y:       j + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l + baselineWidth, -width);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.ClusteredBars
		}
	});
});

},
'dojox/charting/plot2d/Lines':function(){
define("dojox/charting/plot2d/Lines", ["dojo/_base/declare", "./Default"], function(declare, Default){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	return declare("dojox.charting.plot2d.Lines", Default, {
		//	summary:
		//		A convenience constructor to create a typical line chart.
		constructor: function(){
			//	summary:
			//		Preset our default plot to be line-based.
			this.opt.lines = true;
		}
	});
});

},
'dojox/charting/themes/PlotKit/red':function(){
define("dojox/charting/themes/PlotKit/red", ["./base", "../../Theme"], function(pk, Theme){
	pk.red = pk.base.clone();
	pk.red.chart.fill = pk.red.plotarea.fill = "#f5e6e6";
	pk.red.colors = Theme.defineColors({hue: 1, saturation: 60, low: 40, high: 88});
	
	return pk.red;
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
'dojox/charting/themes/Chris':function(){
define("dojox/charting/themes/Chris", ["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	// created by Christopher Anderson

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 100};
	
	themes.Chris = new Theme({
		chart: {
			fill:   "#c1c1c1",
			stroke: {color: "#666"}
		},
		plotarea: {
			fill: "#c1c1c1"
		},
		series: {
			stroke:  {width: 2, color: "white"},
			outline: null,
			fontColor: "#333"
		},
		marker: {
			stroke:  {width: 2, color: "white"},
			outline: {width: 2, color: "white"},
			fontColor: "#333"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#01b717", "#238c01")},	// green
			{fill: g(defaultFill, "#d04918", "#7c0344")},	// red
			{fill: g(defaultFill, "#0005ec", "#002578")},	// blue
			{fill: g(defaultFill, "#f9e500", "#786f00")},	// yellow
			{fill: g(defaultFill, "#e27d00", "#773e00")},	// orange
			{fill: g(defaultFill, "#00b5b0", "#005f5d")},	// teal
			{fill: g(defaultFill, "#ac00cb", "#590060")}	// purple
		],
		markerThemes: [
			{fill: "#01b717", stroke: {color: "#238c01"}},	// green
			{fill: "#d04918", stroke: {color: "#7c0344"}},	// red
			{fill: "#0005ec", stroke: {color: "#002578"}},	// blue
			{fill: "#f9e500", stroke: {color: "#786f00"}},	// yellow
			{fill: "#e27d00", stroke: {color: "#773e00"}},	// orange
			{fill: "#00b5b0", stroke: {color: "#005f5d"}},	// teal
			{fill: "#ac00cb", stroke: {color: "#590060"}}	// purple
		]
	});
	
	themes.Chris.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = {color: s.fill.colors[1].color};
				s.outline = {width: 2, color: "white"};
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.outline;
			delete s.stroke;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Chris.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Chris;
});

},
'dijit/_CssStateMixin':function(){
define("dijit/_CssStateMixin", [
	"dojo/touch",
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/declare",	// declare
	"dojo/dom-class", // domClass.toggle
	"dojo/_base/lang", // lang.hitch
	"dojo/_base/window" // win.body
], function(touch, array, declare, domClass, lang, win){

// module:
//		dijit/_CssStateMixin
// summary:
//		Mixin for widgets to set CSS classes on the widget DOM nodes depending on hover/mouse press/focus
//		state changes, and also higher-level state changes such becoming disabled or selected.

return declare("dijit._CssStateMixin", [], {
	// summary:
	//		Mixin for widgets to set CSS classes on the widget DOM nodes depending on hover/mouse press/focus
	//		state changes, and also higher-level state changes such becoming disabled or selected.
	//
	// description:
	//		By mixing this class into your widget, and setting the this.baseClass attribute, it will automatically
	//		maintain CSS classes on the widget root node (this.domNode) depending on hover,
	//		active, focus, etc. state.   Ex: with a baseClass of dijitButton, it will apply the classes
	//		dijitButtonHovered and dijitButtonActive, as the user moves the mouse over the widget and clicks it.
	//
	//		It also sets CSS like dijitButtonDisabled based on widget semantic state.
	//
	//		By setting the cssStateNodes attribute, a widget can also track events on subnodes (like buttons
	//		within the widget).

	// cssStateNodes: [protected] Object
	//		List of sub-nodes within the widget that need CSS classes applied on mouse hover/press and focus
	//.
	//		Each entry in the hash is a an attachpoint names (like "upArrowButton") mapped to a CSS class names
	//		(like "dijitUpArrowButton"). Example:
	//	|		{
	//	|			"upArrowButton": "dijitUpArrowButton",
	//	|			"downArrowButton": "dijitDownArrowButton"
	//	|		}
	//		The above will set the CSS class dijitUpArrowButton to the this.upArrowButton DOMNode when it
	//		is hovered, etc.
	cssStateNodes: {},

	// hovering: [readonly] Boolean
	//		True if cursor is over this widget
	hovering: false,

	// active: [readonly] Boolean
	//		True if mouse was pressed while over this widget, and hasn't been released yet
	active: false,

	_applyAttributes: function(){
		// This code would typically be in postCreate(), but putting in _applyAttributes() for
		// performance: so the class changes happen before DOM is inserted into the document.
		// Change back to postCreate() in 2.0.  See #11635.

		this.inherited(arguments);

		// Automatically monitor mouse events (essentially :hover and :active) on this.domNode
		array.forEach(["onmouseenter", "onmouseleave", touch.press], function(e){
			this.connect(this.domNode, e, "_cssMouseEvent");
		}, this);

		// Monitoring changes to disabled, readonly, etc. state, and update CSS class of root node
		array.forEach(["disabled", "readOnly", "checked", "selected", "focused", "state", "hovering", "active"], function(attr){
			this.watch(attr, lang.hitch(this, "_setStateClass"));
		}, this);

		// Events on sub nodes within the widget
		for(var ap in this.cssStateNodes){
			this._trackMouseState(this[ap], this.cssStateNodes[ap]);
		}
		// Set state initially; there's probably no hover/active/focus state but widget might be
		// disabled/readonly/checked/selected so we want to set CSS classes for those conditions.
		this._setStateClass();
	},

	_cssMouseEvent: function(/*Event*/ event){
		// summary:
		//	Sets hovering and active properties depending on mouse state,
		//	which triggers _setStateClass() to set appropriate CSS classes for this.domNode.

		if(!this.disabled){
			switch(event.type){
				case "mouseenter":
				case "mouseover":	// generated on non-IE browsers even though we connected to mouseenter
					this._set("hovering", true);
					this._set("active", this._mouseDown);
					break;

				case "mouseleave":
				case "mouseout":	// generated on non-IE browsers even though we connected to mouseleave
					this._set("hovering", false);
					this._set("active", false);
					break;

				case "mousedown":
				case "touchpress":
					this._set("active", true);
					this._mouseDown = true;
					// Set a global event to handle mouseup, so it fires properly
					// even if the cursor leaves this.domNode before the mouse up event.
					// Alternately could set active=false on mouseout.
					var mouseUpConnector = this.connect(win.body(), touch.release, function(){
						this._mouseDown = false;
						this._set("active", false);
						this.disconnect(mouseUpConnector);
					});
					break;
			}
		}
	},

	_setStateClass: function(){
		// summary:
		//		Update the visual state of the widget by setting the css classes on this.domNode
		//		(or this.stateNode if defined) by combining this.baseClass with
		//		various suffixes that represent the current widget state(s).
		//
		// description:
		//		In the case where a widget has multiple
		//		states, it sets the class based on all possible
		//	 	combinations.  For example, an invalid form widget that is being hovered
		//		will be "dijitInput dijitInputInvalid dijitInputHover dijitInputInvalidHover".
		//
		//		The widget may have one or more of the following states, determined
		//		by this.state, this.checked, this.valid, and this.selected:
		//			- Error - ValidationTextBox sets this.state to "Error" if the current input value is invalid
		//			- Incomplete - ValidationTextBox sets this.state to "Incomplete" if the current input value is not finished yet
		//			- Checked - ex: a checkmark or a ToggleButton in a checked state, will have this.checked==true
		//			- Selected - ex: currently selected tab will have this.selected==true
		//
		//		In addition, it may have one or more of the following states,
		//		based on this.disabled and flags set in _onMouse (this.active, this.hovering) and from focus manager (this.focused):
		//			- Disabled	- if the widget is disabled
		//			- Active		- if the mouse (or space/enter key?) is being pressed down
		//			- Focused		- if the widget has focus
		//			- Hover		- if the mouse is over the widget

		// Compute new set of classes
		var newStateClasses = this.baseClass.split(" ");

		function multiply(modifier){
			newStateClasses = newStateClasses.concat(array.map(newStateClasses, function(c){ return c+modifier; }), "dijit"+modifier);
		}

		if(!this.isLeftToRight()){
			// For RTL mode we need to set an addition class like dijitTextBoxRtl.
			multiply("Rtl");
		}

		var checkedState = this.checked == "mixed" ? "Mixed" : (this.checked ? "Checked" : "");
		if(this.checked){
			multiply(checkedState);
		}
		if(this.state){
			multiply(this.state);
		}
		if(this.selected){
			multiply("Selected");
		}

		if(this.disabled){
			multiply("Disabled");
		}else if(this.readOnly){
			multiply("ReadOnly");
		}else{
			if(this.active){
				multiply("Active");
			}else if(this.hovering){
				multiply("Hover");
			}
		}

		if(this.focused){
			multiply("Focused");
		}

		// Remove old state classes and add new ones.
		// For performance concerns we only write into domNode.className once.
		var tn = this.stateNode || this.domNode,
			classHash = {};	// set of all classes (state and otherwise) for node

		array.forEach(tn.className.split(" "), function(c){ classHash[c] = true; });

		if("_stateClasses" in this){
			array.forEach(this._stateClasses, function(c){ delete classHash[c]; });
		}

		array.forEach(newStateClasses, function(c){ classHash[c] = true; });

		var newClasses = [];
		for(var c in classHash){
			newClasses.push(c);
		}
		tn.className = newClasses.join(" ");

		this._stateClasses = newStateClasses;
	},

	_trackMouseState: function(/*DomNode*/ node, /*String*/ clazz){
		// summary:
		//		Track mouse/focus events on specified node and set CSS class on that node to indicate
		//		current state.   Usually not called directly, but via cssStateNodes attribute.
		// description:
		//		Given class=foo, will set the following CSS class on the node
		//			- fooActive: if the user is currently pressing down the mouse button while over the node
		//			- fooHover: if the user is hovering the mouse over the node, but not pressing down a button
		//			- fooFocus: if the node is focused
		//
		//		Note that it won't set any classes if the widget is disabled.
		// node: DomNode
		//		Should be a sub-node of the widget, not the top node (this.domNode), since the top node
		//		is handled specially and automatically just by mixing in this class.
		// clazz: String
		//		CSS class name (ex: dijitSliderUpArrow).

		// Current state of node (initially false)
		// NB: setting specifically to false because domClass.toggle() needs true boolean as third arg
		var hovering=false, active=false, focused=false;

		var self = this,
			cn = lang.hitch(this, "connect", node);

		function setClass(){
			var disabled = ("disabled" in self && self.disabled) || ("readonly" in self && self.readonly);
			domClass.toggle(node, clazz+"Hover", hovering && !active && !disabled);
			domClass.toggle(node, clazz+"Active", active && !disabled);
			domClass.toggle(node, clazz+"Focused", focused && !disabled);
		}

		// Mouse
		cn("onmouseenter", function(){
			hovering = true;
			setClass();
		});
		cn("onmouseleave", function(){
			hovering = false;
			active = false;
			setClass();
		});
		cn(touch.press, function(){
			active = true;
			setClass();
		});
		cn(touch.release, function(){
			active = false;
			setClass();
		});

		// Focus
		cn("onfocus", function(){
			focused = true;
			setClass();
		});
		cn("onblur", function(){
			focused = false;
			setClass();
		});

		// Just in case widget is enabled/disabled while it has focus/hover/active state.
		// Maybe this is overkill.
		this.watch("disabled", setClass);
		this.watch("readOnly", setClass);
	}
});
});

},
'dojox/charting/plot2d/Areas':function(){
define("dojox/charting/plot2d/Areas", ["dojo/_base/declare", "./Default"], 
  function(declare, Default){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	return declare("dojox.charting.plot2d.Areas", Default, {
		//	summary:
		//		Represents an area chart.  See dojox.charting.plot2d.Default for details.
		constructor: function(){
			this.opt.lines = true;
			this.opt.areas = true;
		}
	});
});

},
'dijit/place':function(){
define("dijit/place", [
	"dojo/_base/array", // array.forEach array.map array.some
	"dojo/dom-geometry", // domGeometry.position
	"dojo/dom-style", // domStyle.getComputedStyle
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/window", // win.body
	"./Viewport", // getEffectiveBox
	"."	// dijit (defining dijit.place to match API doc)
], function(array, domGeometry, domStyle, kernel, win, Viewport, dijit){

	// module:
	//		dijit/place
	// summary:
	//		Code to place a popup relative to another node


	function _place(/*DomNode*/ node, choices, layoutNode, aroundNodeCoords){
		// summary:
		//		Given a list of spots to put node, put it at the first spot where it fits,
		//		of if it doesn't fit anywhere then the place with the least overflow
		// choices: Array
		//		Array of elements like: {corner: 'TL', pos: {x: 10, y: 20} }
		//		Above example says to put the top-left corner of the node at (10,20)
		// layoutNode: Function(node, aroundNodeCorner, nodeCorner, size)
		//		for things like tooltip, they are displayed differently (and have different dimensions)
		//		based on their orientation relative to the parent.	 This adjusts the popup based on orientation.
		//		It also passes in the available size for the popup, which is useful for tooltips to
		//		tell them that their width is limited to a certain amount.	 layoutNode() may return a value expressing
		//		how much the popup had to be modified to fit into the available space.	 This is used to determine
		//		what the best placement is.
		// aroundNodeCoords: Object
		//		Size of aroundNode, ex: {w: 200, h: 50}

		// get {x: 10, y: 10, w: 100, h:100} type obj representing position of
		// viewport over document
		var view = Viewport.getEffectiveBox(node.ownerDocument);

		// This won't work if the node is inside a <div style="position: relative">,
		// so reattach it to win.doc.body.	 (Otherwise, the positioning will be wrong
		// and also it might get cutoff)
		if(!node.parentNode || String(node.parentNode.tagName).toLowerCase() != "body"){
			win.body().appendChild(node);
		}

		var best = null;
		array.some(choices, function(choice){
			var corner = choice.corner;
			var pos = choice.pos;
			var overflow = 0;

			// calculate amount of space available given specified position of node
			var spaceAvailable = {
				w: {
					'L': view.l + view.w - pos.x,
					'R': pos.x - view.l,
					'M': view.w
				   }[corner.charAt(1)],
				h: {
					'T': view.t + view.h - pos.y,
					'B': pos.y - view.t,
					'M': view.h
				   }[corner.charAt(0)]
			};

			// Clear left/right position settings set earlier so they don't interfere with calculations,
			// specifically when layoutNode() (a.k.a. Tooltip.orient()) measures natural width of Tooltip
			var s = node.style;
			s.left = s.right = "auto";

			// configure node to be displayed in given position relative to button
			// (need to do this in order to get an accurate size for the node, because
			// a tooltip's size changes based on position, due to triangle)
			if(layoutNode){
				var res = layoutNode(node, choice.aroundCorner, corner, spaceAvailable, aroundNodeCoords);
				overflow = typeof res == "undefined" ? 0 : res;
			}

			// get node's size
			var style = node.style;
			var oldDisplay = style.display;
			var oldVis = style.visibility;
			if(style.display == "none"){
				style.visibility = "hidden";
				style.display = "";
			}
			var bb = domGeometry.position(node);
			style.display = oldDisplay;
			style.visibility = oldVis;

			// coordinates and size of node with specified corner placed at pos,
			// and clipped by viewport
			var
				startXpos = {
					'L': pos.x,
					'R': pos.x - bb.w,
					'M': Math.max(view.l, Math.min(view.l + view.w, pos.x + (bb.w >> 1)) - bb.w) // M orientation is more flexible
				}[corner.charAt(1)],
				startYpos = {
					'T': pos.y,
					'B': pos.y - bb.h,
					'M': Math.max(view.t, Math.min(view.t + view.h, pos.y + (bb.h >> 1)) - bb.h)
				}[corner.charAt(0)],
				startX = Math.max(view.l, startXpos),
				startY = Math.max(view.t, startYpos),
				endX = Math.min(view.l + view.w, startXpos + bb.w),
				endY = Math.min(view.t + view.h, startYpos + bb.h),
				width = endX - startX,
				height = endY - startY;

			overflow += (bb.w - width) + (bb.h - height);

			if(best == null || overflow < best.overflow){
				best = {
					corner: corner,
					aroundCorner: choice.aroundCorner,
					x: startX,
					y: startY,
					w: width,
					h: height,
					overflow: overflow,
					spaceAvailable: spaceAvailable
				};
			}

			return !overflow;
		});

		// In case the best position is not the last one we checked, need to call
		// layoutNode() again.
		if(best.overflow && layoutNode){
			layoutNode(node, best.aroundCorner, best.corner, best.spaceAvailable, aroundNodeCoords);
		}

		// And then position the node.  Do this last, after the layoutNode() above
		// has sized the node, due to browser quirks when the viewport is scrolled
		// (specifically that a Tooltip will shrink to fit as though the window was
		// scrolled to the left).
		var s = node.style;
		s.top = best.y + "px";
		s.left = best.x + "px";
		s.right = "auto";	// needed for FF or else tooltip goes to far left

		return best;
	}

	/*=====
	dijit.place.__Position = function(){
		// x: Integer
		//		horizontal coordinate in pixels, relative to document body
		// y: Integer
		//		vertical coordinate in pixels, relative to document body

		this.x = x;
		this.y = y;
	};
	=====*/

	/*=====
	dijit.place.__Rectangle = function(){
		// x: Integer
		//		horizontal offset in pixels, relative to document body
		// y: Integer
		//		vertical offset in pixels, relative to document body
		// w: Integer
		//		width in pixels.   Can also be specified as "width" for backwards-compatibility.
		// h: Integer
		//		height in pixels.   Can also be specified as "height" from backwards-compatibility.

		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	};
	=====*/

	return (dijit.place = {
		// summary:
		//		Code to place a DOMNode relative to another DOMNode.
		//		Load using require(["dijit/place"], function(place){ ... }).

		at: function(node, pos, corners, padding){
			// summary:
			//		Positions one of the node's corners at specified position
			//		such that node is fully visible in viewport.
			// description:
			//		NOTE: node is assumed to be absolutely or relatively positioned.
			// node: DOMNode
			//		The node to position
			// pos: dijit.place.__Position
			//		Object like {x: 10, y: 20}
			// corners: String[]
			//		Array of Strings representing order to try corners in, like ["TR", "BL"].
			//		Possible values are:
			//			* "BL" - bottom left
			//			* "BR" - bottom right
			//			* "TL" - top left
			//			* "TR" - top right
			// padding: dijit.place.__Position?
			//		optional param to set padding, to put some buffer around the element you want to position.
			// example:
			//		Try to place node's top right corner at (10,20).
			//		If that makes node go (partially) off screen, then try placing
			//		bottom left corner at (10,20).
			//	|	place(node, {x: 10, y: 20}, ["TR", "BL"])
			var choices = array.map(corners, function(corner){
				var c = { corner: corner, pos: {x:pos.x,y:pos.y} };
				if(padding){
					c.pos.x += corner.charAt(1) == 'L' ? padding.x : -padding.x;
					c.pos.y += corner.charAt(0) == 'T' ? padding.y : -padding.y;
				}
				return c;
			});

			return _place(node, choices);
		},

		around: function(
			/*DomNode*/		node,
			/*DomNode || dijit.place.__Rectangle*/ anchor,
			/*String[]*/	positions,
			/*Boolean*/		leftToRight,
			/*Function?*/	layoutNode){

			// summary:
			//		Position node adjacent or kitty-corner to anchor
			//		such that it's fully visible in viewport.
			//
			// description:
			//		Place node such that corner of node touches a corner of
			//		aroundNode, and that node is fully visible.
			//
			// anchor:
			//		Either a DOMNode or a __Rectangle (object with x, y, width, height).
			//
			// positions:
			//		Ordered list of positions to try matching up.
			//			* before: places drop down to the left of the anchor node/widget, or to the right in the case
			//				of RTL scripts like Hebrew and Arabic; aligns either the top of the drop down
			//				with the top of the anchor, or the bottom of the drop down with bottom of the anchor.
			//			* after: places drop down to the right of the anchor node/widget, or to the left in the case
			//				of RTL scripts like Hebrew and Arabic; aligns either the top of the drop down
			//				with the top of the anchor, or the bottom of the drop down with bottom of the anchor.
			//			* before-centered: centers drop down to the left of the anchor node/widget, or to the right
			//				 in the case of RTL scripts like Hebrew and Arabic
			//			* after-centered: centers drop down to the right of the anchor node/widget, or to the left
			//				 in the case of RTL scripts like Hebrew and Arabic
			//			* above-centered: drop down is centered above anchor node
			//			* above: drop down goes above anchor node, left sides aligned
			//			* above-alt: drop down goes above anchor node, right sides aligned
			//			* below-centered: drop down is centered above anchor node
			//			* below: drop down goes below anchor node
			//			* below-alt: drop down goes below anchor node, right sides aligned
			//
			// layoutNode: Function(node, aroundNodeCorner, nodeCorner)
			//		For things like tooltip, they are displayed differently (and have different dimensions)
			//		based on their orientation relative to the parent.	 This adjusts the popup based on orientation.
			//
			// leftToRight:
			//		True if widget is LTR, false if widget is RTL.   Affects the behavior of "above" and "below"
			//		positions slightly.
			//
			// example:
			//	|	placeAroundNode(node, aroundNode, {'BL':'TL', 'TR':'BR'});
			//		This will try to position node such that node's top-left corner is at the same position
			//		as the bottom left corner of the aroundNode (ie, put node below
			//		aroundNode, with left edges aligned).	If that fails it will try to put
			//		the bottom-right corner of node where the top right corner of aroundNode is
			//		(ie, put node above aroundNode, with right edges aligned)
			//

			// if around is a DOMNode (or DOMNode id), convert to coordinates
			var aroundNodePos = (typeof anchor == "string" || "offsetWidth" in anchor)
				? domGeometry.position(anchor, true)
				: anchor;

			// Compute position and size of visible part of anchor (it may be partially hidden by ancestor nodes w/scrollbars)
			if(anchor.parentNode){
				// ignore nodes between position:relative and position:absolute
				var sawPosAbsolute = domStyle.getComputedStyle(anchor).position == "absolute";
				var parent = anchor.parentNode;
				while(parent && parent.nodeType == 1 && parent.nodeName != "BODY"){  //ignoring the body will help performance
					var parentPos = domGeometry.position(parent, true),
						pcs = domStyle.getComputedStyle(parent);
					if(/relative|absolute/.test(pcs.position)){
						sawPosAbsolute = false;
					}
					if(!sawPosAbsolute && /hidden|auto|scroll/.test(pcs.overflow)){
						var bottomYCoord = Math.min(aroundNodePos.y + aroundNodePos.h, parentPos.y + parentPos.h);
						var rightXCoord = Math.min(aroundNodePos.x + aroundNodePos.w, parentPos.x + parentPos.w);
						aroundNodePos.x = Math.max(aroundNodePos.x, parentPos.x);
						aroundNodePos.y = Math.max(aroundNodePos.y, parentPos.y);
						aroundNodePos.h = bottomYCoord - aroundNodePos.y;
						aroundNodePos.w = rightXCoord - aroundNodePos.x;
					}	
					if(pcs.position == "absolute"){
						sawPosAbsolute = true;
					}
					parent = parent.parentNode;
				}
			}			


			var x = aroundNodePos.x,
				y = aroundNodePos.y,
				width = "w" in aroundNodePos ? aroundNodePos.w : (aroundNodePos.w = aroundNodePos.width),
				height = "h" in aroundNodePos ? aroundNodePos.h : (kernel.deprecated("place.around: dijit.place.__Rectangle: { x:"+x+", y:"+y+", height:"+aroundNodePos.height+", width:"+width+" } has been deprecated.  Please use { x:"+x+", y:"+y+", h:"+aroundNodePos.height+", w:"+width+" }", "", "2.0"), aroundNodePos.h = aroundNodePos.height);

			// Convert positions arguments into choices argument for _place()
			var choices = [];
			function push(aroundCorner, corner){
				choices.push({
					aroundCorner: aroundCorner,
					corner: corner,
					pos: {
						x: {
							'L': x,
							'R': x + width,
							'M': x + (width >> 1)
						   }[aroundCorner.charAt(1)],
						y: {
							'T': y,
							'B': y + height,
							'M': y + (height >> 1)
						   }[aroundCorner.charAt(0)]
					}
				})
			}
			array.forEach(positions, function(pos){
				var ltr =  leftToRight;
				switch(pos){
					case "above-centered":
						push("TM", "BM");
						break;
					case "below-centered":
						push("BM", "TM");
						break;
					case "after-centered":
						ltr = !ltr;
						// fall through
					case "before-centered":
						push(ltr ? "ML" : "MR", ltr ? "MR" : "ML");
						break;
					case "after":
						ltr = !ltr;
						// fall through
					case "before":
						push(ltr ? "TL" : "TR", ltr ? "TR" : "TL");
						push(ltr ? "BL" : "BR", ltr ? "BR" : "BL");
						break;
					case "below-alt":
						ltr = !ltr;
						// fall through
					case "below":
						// first try to align left borders, next try to align right borders (or reverse for RTL mode)
						push(ltr ? "BL" : "BR", ltr ? "TL" : "TR");
						push(ltr ? "BR" : "BL", ltr ? "TR" : "TL");
						break;
					case "above-alt":
						ltr = !ltr;
						// fall through
					case "above":
						// first try to align left borders, next try to align right borders (or reverse for RTL mode)
						push(ltr ? "TL" : "TR", ltr ? "BL" : "BR");
						push(ltr ? "TR" : "TL", ltr ? "BR" : "BL");
						break;
					default:
						// To assist dijit/_base/place, accept arguments of type {aroundCorner: "BL", corner: "TL"}.
						// Not meant to be used directly.
						push(pos.aroundCorner, pos.corner);
				}
			});

			var position = _place(node, choices, layoutNode, {w: width, h: height});
			position.aroundNodePos = aroundNodePos;

			return position;
		}
	});
});

},
'dojox/charting/themes/GreySkies':function(){
define("dojox/charting/themes/GreySkies", ["../Theme", "./common"], function(Theme, themes){
	
	themes.GreySkies=new Theme(Theme._def);
	
	return themes.GreySkies;
});

},
'dojox/charting/Chart2D':function(){
define("dojox/charting/Chart2D", ["dojo/_base/kernel", "dojox", "./Chart", 
	"./axis2d/Default", "./axis2d/Invisible", "./plot2d/Default", "./plot2d/Lines", "./plot2d/Areas",
	"./plot2d/Markers", "./plot2d/MarkersOnly", "./plot2d/Scatter", "./plot2d/Stacked", "./plot2d/StackedLines",
	"./plot2d/StackedAreas", "./plot2d/Columns", "./plot2d/StackedColumns", "./plot2d/ClusteredColumns",
	"./plot2d/Bars", "./plot2d/StackedBars", "./plot2d/ClusteredBars", "./plot2d/Grid", "./plot2d/Pie",
	"./plot2d/Bubble", "./plot2d/Candlesticks", "./plot2d/OHLC", "./plot2d/Spider"], 
	  function(dojo, dojox, Chart){
	dojo.deprecated("dojox.charting.Chart2D", "Use dojo.charting.Chart instead and require all other components explicitly", "2.0");
	// module:
	//		dojox/charting/Chart2D
	// summary:
	//		This is a compatibility module which loads all charting modules that used to be automatically
	//		loaded in versions prior to 1.6.  It is highly recommended for performance reasons that
	//		this module no longer be referenced by applications.  Instead, use dojox/charting/Chart.
	return dojox.charting.Chart2D = Chart;
});

},
'dojox/charting/themes/WatersEdge':function(){
define("dojox/charting/themes/WatersEdge", ["../Theme", "./common"], function(Theme, themes){
	
	themes.WatersEdge = new Theme({
		colors: [
			"#437cc0",
			"#6256a5",
			"#4552a3",
			"#43c4f2",
			"#4b66b0"
		]
	});
	
	return  themes.WatersEdge;
});

},
'dojox/charting/action2d/TouchZoomAndPan':function(){
define("dojox/charting/action2d/TouchZoomAndPan", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/event", "dojo/_base/sniff",
	"./ChartAction", "../Element", "dojox/gesture/tap", "../plot2d/common"], 
	function(lang, declare, eventUtil, has, ChartAction, Element, tap, common){
	var GlassView = declare("dojox.charting.action2d._GlassView", [Element], {
		//	summary: Private internal class used by TouchZoomAndPan actions.
		//	tags:
		//		private
		constructor: function(chart){
		},
		render: function(){
			if(!this.isDirty()){
				return;
			}
			this.cleanGroup();
			this.group.createRect({width: this.chart.dim.width, height: this.chart.dim.height}).setFill("rgba(0,0,0,0)");
		},
		cleanGroup: function(creator){
			//	summary:
			//		Clean any elements (HTML or GFX-based) out of our group, and create a new one.
			//	creator: dojox.gfx.Surface?
			//		An optional surface to work with.
			//	returns: dojox.charting.Element
			//		A reference to this object for functional chaining.
			this.inherited(arguments);
			return this;	//	dojox.charting.Element
		},
		clear: function(){
			//	summary:
			//		Clear out any parameters set on this plot.
			//	returns: dojox.charting.action2d._IndicatorElement
			//		The reference to this plot for functional chaining.
			this.dirty = true;
			// glass view needs to be above
			if(this.chart.stack[0] != this){
				this.chart.movePlotToFront(this.name);
			}
			return this;	//	dojox.charting.plot2d._IndicatorElement
		},
		getSeriesStats: function(){
			//	summary:
			//		Returns default stats (irrelevant for this type of plot).
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return lang.delegate(common.defaultStats);
		},
		initializeScalers: function(){
			//	summary:
			//		Does nothing (irrelevant for this type of plot).
			return this;
		},
		isDirty: function(){
			//	summary:
			//		Return whether or not this plot needs to be redrawn.
			//	returns: Boolean
			//		If this plot needs to be rendered, this will return true.
			return this.dirty;
		}
	});
	
	/*=====
	
	declare("dojox.charting.action2d.__TouchZoomAndPanCtorArgs", null, {
		//	summary:
		//		Additional arguments for mouse zoom and pan actions.
		
		//	axis: String?
		//		Target axis name for this action.  Default is "x".
		axis: "x",
		//	scaleFactor: Number?
		//		The scale factor applied on double tap.  Default is 1.2.
		scaleFactor: 1.2,
		//	maxScale: Number?
		//		The max scale factor accepted by this action.  Default is 100.
		maxScale: 100,
		//	enableScroll: Boolean?
		//		Whether touch drag gesture should scroll the chart.  Default is true.
		enableScroll: true,
		//	enableZoom: Boolean?
		//		Whether touch pinch and spread gesture should zoom out or in the chart.  Default is true.
		enableZoom: true,
	});
	var ChartAction = dojox.charting.action2d.ChartAction;
	=====*/
	
	return declare("dojox.charting.action2d.TouchZoomAndPan", ChartAction, {
		//	summary:
		//		Create a touch zoom and pan action. 
		//		You can zoom out or in the data window with pinch and spread gestures. You can scroll using drag gesture. 
		//		Finally this is possible to navigate between a fit window and a zoom one using double tap gesture.
	
		// the data description block for the widget parser
		defaultParams: {
			axis: "x",
			scaleFactor: 1.2,	
			maxScale: 100,
			enableScroll: true,
			enableZoom: true
		},
		optionalParams: {},	// no optional parameters
	
		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create a new touch zoom and pan action and connect it.
			//	chart: dojox.charting.Chart
			//		The chart this action applies to.
			//	kwArgs: dojox.charting.action2d.__TouchZoomAndPanCtorArgs?
			//		Optional arguments for the action.
			this._listeners = [{eventName: "ontouchstart", methodName: "onTouchStart"},
			                   {eventName: "ontouchmove", methodName: "onTouchMove"},
			                   {eventName: "ontouchend", methodName: "onTouchEnd"},
							   {eventName: tap.doubletap, methodName: "onDoubleTap"}];
			if(!kwArgs){ kwArgs = {}; }
			this.axis = kwArgs.axis ? kwArgs.axis : "x";
			this.scaleFactor = kwArgs.scaleFactor ? kwArgs.scaleFactor : 1.2;
			this.maxScale = kwArgs.maxScale ? kwArgs.maxScale : 100;
			this.enableScroll = kwArgs.enableScroll != undefined ? kwArgs.enableScroll : true;
			this.enableZoom = kwArgs.enableScroll != undefined ? kwArgs.enableZoom : true;
			this._uName = "touchZoomPan"+this.axis;
			this.connect();
		},
		
		connect: function(){
			//	summary:
			//		Connect this action to the chart. On Safari this adds a new glass view plot
			//		to the chart that's why Chart.render() must be called after connect.
			this.inherited(arguments);
			// this is needed to workaround issue on Safari + SVG, because a touch start action
			// started above a item that is removed during the touch action will stop
			// dispatching touch events!
			if(has("safari") && this.chart.surface.declaredClass.indexOf("svg")!=-1){
				this.chart.addPlot(this._uName, {type: GlassView});
			}
		},
		
		disconnect: function(){
			//	summary:
			//		Disconnect this action from the chart. 
			if(has("safari") && this.chart.surface.declaredClass.indexOf("svg")!=-1){
				this.chart.removePlot(this._uName);
			}
			this.inherited(arguments);
		},
	
		onTouchStart: function(event){
			//	summary:
			//		Called when touch is started on the chart.
			// we always want to be above regular plots and not clipped
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var length = event.touches.length;
			this._startPageCoord = {x: event.touches[0].pageX, y: event.touches[0].pageY};
			if((this.enableZoom || this.enableScroll) && chart._delayedRenderHandle){
				// we have pending rendering from a scroll, let's sync
				clearTimeout(chart._delayedRenderHandle);
				chart._delayedRenderHandle = null;
				chart.render();
			}
			if(this.enableZoom && length >= 2){
				this._endPageCoord =  {x: event.touches[1].pageX, y: event.touches[1].pageY};
				var middlePageCoord = {x: (this._startPageCoord.x + this._endPageCoord.x) / 2,
										y: (this._startPageCoord.y + this._endPageCoord.y) / 2};
				var scaler = axis.getScaler();
				this._initScale = axis.getWindowScale();
				var t = this._initData =  this.plot.toData();
				this._middleCoord = t(middlePageCoord)[this.axis];
				this._startCoord = scaler.bounds.from;
				this._endCoord = scaler.bounds.to;
			}else if(this.enableScroll){
				this._startScroll(axis);
				// needed for Android, otherwise will get a touch cancel while swiping
				eventUtil.stop(event);
			}
		},
	
		onTouchMove: function(event){
			//	summary:
			//		Called when touch is moved on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var length = event.touches.length;
			var pAttr = axis.vertical?"pageY":"pageX", 
					attr = axis.vertical?"y":"x";
			if(this.enableZoom && length >= 2){
				var newMiddlePageCoord = {x: (event.touches[1].pageX + event.touches[0].pageX) / 2,
											y: (event.touches[1].pageY + event.touches[0].pageY) / 2};		
				var scale = (this._endPageCoord[attr] - this._startPageCoord[attr]) /
					(event.touches[1][pAttr] - event.touches[0][pAttr]);
	
				if(this._initScale / scale > this.maxScale){
					return;
				}
	
				var newMiddleCoord = this._initData(newMiddlePageCoord)[this.axis];
	
				var newStart = scale * (this._startCoord - newMiddleCoord)  + this._middleCoord,
				newEnd = scale * (this._endCoord - newMiddleCoord) + this._middleCoord;
				chart.zoomIn(this.axis, [newStart, newEnd]);
				// avoid browser pan
				eventUtil.stop(event);
			}else if(this.enableScroll){
				var delta = axis.vertical?(this._startPageCoord[attr] - event.touches[0][pAttr]):
					(event.touches[0][pAttr] - this._startPageCoord[attr]);
				chart.setAxisWindow(this.axis, this._lastScale, this._initOffset - delta / this._lastFactor / this._lastScale);
				chart.delayedRender();
				// avoid browser pan
				eventUtil.stop(event);
			}		
		},
	
		onTouchEnd: function(event){
			//	summary:
			//		Called when touch is ended on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			if(event.touches.length == 1 && this.enableScroll){
				// still one touch available, let's start back from here for
				// potential pan
				this._startPageCoord = {x: event.touches[0].pageX, y: event.touches[0].pageY};
				this._startScroll(axis);
			}
		},
		
		_startScroll: function(axis){
			var bounds = axis.getScaler().bounds;
			this._initOffset = axis.getWindowOffset();
			// we keep it because of delay rendering we might now always have access to the
			// information to compute it
			this._lastScale = axis.getWindowScale();
			this._lastFactor = bounds.span / (bounds.upper - bounds.lower); 
		},
	
		onDoubleTap: function(event){
			//	summary:
			//		Called when double tap is performed on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var scale = 1 / this.scaleFactor;
			// are we fit?
			if(axis.getWindowScale()==1){
				// fit => zoom
				var scaler = axis.getScaler(), start = scaler.bounds.from, end = scaler.bounds.to, 
				oldMiddle = (start + end) / 2, newMiddle = this.plot.toData(this._startPageCoord)[this.axis], 
				newStart = scale * (start - oldMiddle) + newMiddle, newEnd = scale * (end - oldMiddle) + newMiddle;
				chart.zoomIn(this.axis, [newStart, newEnd]);
			}else{
				// non fit => fit
				chart.setAxisWindow(this.axis, 1, 0);
				chart.render();
			}
			eventUtil.stop(event);
		}
	});
});		

},
'dojox/charting/themes/Julie':function(){
define("dojox/charting/themes/Julie", ["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils){

	// created by Julie Santilli (Claro-based theme)
	
	var themes = dojox.charting.themes, g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 100};
	
	themes.Julie = new Theme({
		seriesThemes: [
			{fill: g(defaultFill, "#59a0bd", "#497c91"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#8d88c7", "#6c6d8e"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#85a54a", "#768b4e"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#e8e667", "#c6c361"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#e9c756", "#c7a223"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#a05a5a", "#815454"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#b17044", "#72543e"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#a5a5a5", "#727272"), stroke: {color: "#535353"}},	// grey

			{fill: g(defaultFill, "#9dc7d9", "#59a0bd"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#b7b3da", "#8681b3"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#a8c179", "#85a54a"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#eeea99", "#d6d456"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#ebcf81", "#e9c756"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#c99999", "#a05a5a"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#c28b69", "#7d5437"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#bebebe", "#8c8c8c"), stroke: {color: "#535353"}},	// grey

			{fill: g(defaultFill, "#c7e0e9", "#92baca"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#c9c6e4", "#ada9d6"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#c0d0a0", "#98ab74"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#f0eebb", "#dcd87c"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#efdeb0", "#ebcf81"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#ddc0c0", "#c99999"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#cfb09b", "#c28b69"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#d8d8d8", "#bebebe"), stroke: {color: "#535353"}},	// grey

			{fill: g(defaultFill, "#ddeff5", "#a5c4cd"), stroke: {color: "#22627d"}},	// blue
			{fill: g(defaultFill, "#dedcf0", "#b3afd3"), stroke: {color: "#8a84c5"}},	// purple
			{fill: g(defaultFill, "#dfe9ca", "#c0d0a0"), stroke: {color: "#5b6d1f"}},	// green
			{fill: g(defaultFill, "#f8f7db", "#e5e28f"), stroke: {color: "#918e38"}},	// yellow
			{fill: g(defaultFill, "#f7f0d8", "#cfbd88"), stroke: {color: "#947b30"}},	// orange
			{fill: g(defaultFill, "#eedede", "#caafaf"), stroke: {color: "#572828"}},	// red
			{fill: g(defaultFill, "#e3cdbf", "#cfb09b"), stroke: {color: "#74482e"}},	// brown
			{fill: g(defaultFill, "#efefef", "#cacaca"), stroke: {color: "#535353"}}	// grey
		]
	});
	
	themes.Julie.next = function(elementType, mixin, doPost){
		if(elementType == "line" || elementType == "area"){
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			var theme = Theme.prototype.next.apply(this, arguments);
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};

	themes.Julie.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if(elementType == "slice" && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Julie;
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
'dojox/charting/BidiSupport':function(){
define("dojox/charting/BidiSupport", ["dojo/_base/lang", "dojo/_base/html", "dojo/_base/array", "dojo/_base/sniff",
	"dojo/dom","dojo/dom-construct",
	"dojox/gfx", "dojox/gfx/_gfxBidiSupport", "./Chart", "./axis2d/common", "dojox/string/BidiEngine", "dojox/lang/functional"], 
	function(lang, html, arr, has, dom, domConstruct, g, gBidi, Chart, da, BidiEngine, df){

	var bidiEngine = new BidiEngine();
	
	lang.extend(Chart, {
		// summary:
		//		Add support for bidi scripts.
		// description:
		//		Bidi stands for support for languages with a bidirectional script. 
		//		There's a special need for displaying BIDI text in rtl direction 
		//		in ltr GUI, sometimes needed auto support.
		//		dojox.charting does not support control over base text direction provided in Dojo.

		// textDir: String
		//		Bi-directional support,	the main variable which is responsible for the direction of the text.
		//		The text direction can be different than the GUI direction by using this parameter.
		// 		Allowed values:
		//			1. "ltr"
		//			2. "rtl"
		//			3. "auto" - contextual the direction of a text defined by first strong letter.
		//		By default is as the page direction.		
		textDir:"",
		
		getTextDir: function(/*String*/text){
			// summary:
			//		Return direction of the text. 
			// description:
			// 		If textDir is ltr or rtl returns the value.
			//		If it's auto, calls to another function that responsible 
			//		for checking the value, and defining the direction.			
			// text:
			//		Used in case textDir is "auto", this case the direction is according to the first
			//		strong (directionally - which direction is strong defined) letter.
			//	tags:
			//		protected.
			var textDir = this.textDir == "auto" ? bidiEngine.checkContextual(text) : this.textDir;
			// providing default value
			if(!textDir){
				textDir = html.style(this.node,"direction");
			}
			return textDir;
		},

		postscript: function(node,args){
			// summary:
			//		Kicks off chart instantiation.
			// description:
			//		Used for setting the textDir of the chart. 
			// tags:
			//		private

			// validate textDir
			var textDir = args ? (args["textDir"] ? validateTextDir(args["textDir"]) : "") : "";
			// if textDir wasn't defined or was defined wrong, apply default value
			textDir = textDir ? textDir : html.style(this.node,"direction");
			this.textDir = textDir;

			this.surface.textDir = textDir;
			
			// two data structures, used for storing data for further enablement to change
			// textDir dynamically
			this.htmlElementsRegistry = [];
			this.truncatedLabelsRegistry = [];
		},

		setTextDir: function(/*String*/ newTextDir, obj){
			// summary:
			//		Setter for the textDir attribute.
			// description:
			//		Allows dynamically set the textDir, goes over all the text-children and  
			//		updates their base text direction.
			// tags:
			//		public
		
			if(newTextDir == this.textDir){
				return this;
			}
			if(validateTextDir(newTextDir) != null){
				this.textDir = newTextDir;
				
				// set automatically all the gfx objects that were created by this surface
				// (groups, text objects)
				this.surface.setTextDir(newTextDir);
			
				// truncated labels that were created with gfx creator need to recalculate dir
				// for case like: "111111A" (A stands for bidi character) and the truncation
				// is "111..." If the textDir is auto, the display should be: "...111" but in gfx
				// case we will get "111...". Because this.surface.setTextDir will calculate the dir of truncated
				// label, which value is "111..." but th real is "111111A".
				// each time we created a gfx truncated label we stored it in the truncatedLabelsRegistry, so update now 
				// the registry.
				if(this.truncatedLabelsRegistry && newTextDir == "auto"){
					arr.forEach(this.truncatedLabelsRegistry, function(elem){
						var tDir = this.getTextDir(elem["label"]);
						if(elem["element"].textDir != tDir){
							elem["element"].setShape({textDir: tDir});
						}
					}, this);
				}
				
				// re-render axes with html labels. for recalculation of the labels
				// positions etc.
				// create array of keys for all the axis in chart 
				var axesKeyArr = df.keys(this.axes);
				if(axesKeyArr.length > 0){
					// iterate over the axes, and for each that have html labels render it.
					arr.forEach(axesKeyArr, function(key, index, arr){
						// get the axis 
						var axis = this.axes[key];
						// if the axis has html labels 
						if(axis.htmlElements[0]){
							axis.dirty = true;
							axis.render(this.dim, this.offsets);
						}
					},this);
					
					// recreate title
					if(this.title){
						var forceHtmlLabels = (g.renderer == "canvas"),
							labelType = forceHtmlLabels || !has("ie") && !has("opera") ? "html" : "gfx",
							tsize = g.normalizedLength(g.splitFontString(this.titleFont).size);
						// remove the title
						domConstruct.destroy(this.chartTitle);
						this.chartTitle =null;
						// create the new title
						this.chartTitle = da.createText[labelType](
							this,
							this.surface,
							this.dim.width/2,
							this.titlePos=="top" ? tsize + this.margins.t : this.dim.height - this.margins.b,
							"middle",
							this.title,
							this.titleFont,
							this.titleFontColor
						);
					}				
				}else{
				// case of pies, spiders etc.
					arr.forEach(this.htmlElementsRegistry, function(elem, index, arr){
						var tDir = newTextDir == "auto" ? this.getTextDir(elem[4]) : newTextDir;
						if(elem[0].children[0] && elem[0].children[0].dir != tDir){
							dom.destroy(elem[0].children[0]);
							elem[0].children[0] = da.createText["html"]
									(this, this.surface, elem[1], elem[2], elem[3], elem[4], elem[5], elem[6]).children[0];
						}
					},this);
				}
			}
		},

		truncateBidi: function(elem, label, labelType){
			// summary:
			//		Enables bidi support for truncated labels.
			// description:
			//		Can be two types of labels: html or gfx.
			//		gfx labels: 
			//			Need to be stored in registry to be used when the textDir will be set dynamically.
			//			Additional work on truncated labels is needed for case as 111111A (A stands for "bidi" character rtl directioned).
			//			let say in this case the truncation is "111..." If the textDir is auto, the display should be: "...111" but in gfx
			//			case we will get "111...". Because this.surface.setTextDir will calculate the dir of truncated
			//			label, which value is "111..." but th real is "111111A".
			//			each time we created a gfx truncated label we store it in the truncatedLabelsRegistry.
			//		html labels:
			//			no need for repository (stored in another place). Here we only need to update the current dir according to textDir.
			// tags:
			//		private
		
			if(labelType == "gfx"){
				// store truncated gfx labels in the data structure.
				this.truncatedLabelsRegistry.push({element: elem, label: label});
				if(this.textDir == "auto"){
					elem.setShape({textDir: this.getTextDir(label)});
				}
			}
			if(labelType == "html" && this.textDir == "auto"){
				elem.children[0].dir = this.getTextDir(label);
			}
		}
	});

	var extendMethod = function(obj, method, bundleByPrototype, before, after){
		// Some helper function. Used for extending method of obj.
		// obj: Object
		//		The obj we overriding it's method.
		// method: String
		//		The method that is extended, the original method is called before or after
		//		functions that passed to extendMethod.
		// bundleByPrototype: boolean
		//		There's two methods to extend, using prototype or not.
		// before: function
		//		If defined this function will be executed before the original method.
		// after: function
		//		If defined this function will be executed after the original method.
		if(bundleByPrototype){
			var old = obj.prototype[method];
			obj.prototype[method] = 
				function(){
					var rBefore;
					if (before){
						rBefore = before.apply(this, arguments);
					}
					var r = old.apply(this, rBefore);
					if (after){
						r = after.call(this, r, arguments);
					}
					return r;
				};
		}else{
			var old = lang.clone(obj[method]);
			obj[method] = 
				function(){
					var rBefore;
					if (before){
						rBefore = before.apply(this, arguments);
					}
					var r = old.apply(this, arguments);
					if (after){
						after(r, arguments);
					}
					return r;
				};		
		}
	};

	var labelPreprocess = function(elem, chart, label, truncatedLabel, font, elemType){
		// aditional preprocessing of the labels, needed for rtl base text direction in LTR 
		// GUI, or for ltr base text direction for RTL GUI.

		var isChartDirectionRtl = (html.style(chart.node,"direction") == "rtl");
		var isBaseTextDirRtl = (chart.getTextDir(label) == "rtl");

		if(isBaseTextDirRtl && !isChartDirectionRtl){
			label = "<span dir='rtl'>" + label +"</span>";
		}
		if(!isBaseTextDirRtl && isChartDirectionRtl){
			label = "<span dir='ltr'>" + label +"</span>";
		}

		return arguments;
	};

	// connect labelPreprocess to run before labelTooltip.
	// patch it only is available
	if(dojox.charting.axis2d && dojox.charting.axis2d.Default){
		extendMethod(dojox.charting.axis2d.Default,"labelTooltip",true, labelPreprocess, null);
		//extendMethod(dijit,"showTooltip",false, labelPreprocess, null);
	}

	function htmlCreateText(r, agumentsArr){
		// function to register HTML elements that created by html.createText, this array
		// needed for allowing to change textDir dynamically.
		agumentsArr[0].htmlElementsRegistry.push([r, agumentsArr[2], agumentsArr[3], agumentsArr[4], agumentsArr[5], agumentsArr[6], agumentsArr[7]]);
	}

	extendMethod(da.createText,"html", false, null, htmlCreateText);

	function validateTextDir(textDir){
		return /^(ltr|rtl|auto)$/.test(textDir) ? textDir : null;
	}
		
});

},
'dojox/charting/themes/MiamiNice':function(){
define("dojox/charting/themes/MiamiNice", ["../Theme", "./common"], function(Theme, themes){
	
	themes.MiamiNice=new Theme({
		colors: [
			"#7f9599",
			"#45b8cc",
			"#8ecfb0",
			"#f8acac",
			"#cc4482"
		]
	});
	
	return themes.MiamiNice;
});

},
'dojox/charting/plot2d/Spider':function(){
define("dojox/charting/plot2d/Spider", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", "dojo/_base/html", "dojo/_base/array",
	"dojo/dom-geometry", "dojo/_base/fx", "dojo/fx", "dojo/_base/sniff", 
	"../Element", "./_PlotEvents", "dojo/_base/Color", "dojox/color/_base", "./common", "../axis2d/common", 
	"../scaler/primitive", "dojox/gfx", "dojox/gfx/matrix", "dojox/gfx/fx", "dojox/lang/functional", 
	"dojox/lang/utils", "dojo/fx/easing"],
	function(lang, declare, hub, html, arr, domGeom, baseFx, coreFx, has, 
			Element, PlotEvents, Color, dxcolor, dc, da, primitive,
			g, m, gfxfx, df, du, easing){
/*=====
var Element = dojox.charting.Element;
var PlotEvents = dojox.charting.plot2d._PlotEvents;
=====*/
	var FUDGE_FACTOR = 0.2; // use to overlap fans

	var Spider = declare("dojox.charting.plot2d.Spider", [Element, PlotEvents], {
		//	summary:
		//		The plot that represents a typical Spider chart.
		defaultParams: {
			labels:			true,
			ticks:			false,
			fixed:			true,
			precision:		1,
			labelOffset:	-10,
			labelStyle:		"default",	// default/rows/auto
			htmlLabels:		true,		// use HTML to draw labels
			startAngle:		-90,		// start angle for slices in degrees
			divisions:		 3,			// radius tick count
			axisColor:		 "",		// spider axis color
			axisWidth:		 0,			// spider axis stroke width
			spiderColor:	 "",		// spider web color
			spiderWidth:	 0,			// spider web stroke width
			seriesWidth:	 0,			// plot border with
			seriesFillAlpha: 0.2,		// plot fill alpha
			spiderOrigin:	 0.16,
			markerSize:		 3,			// radius of plot vertex (px)
			spiderType:		 "polygon", //"circle"
			animationType:	 easing.backOut,
			axisTickFont:		"",
			axisTickFontColor:	"",
			axisFont:			"",
			axisFontColor:		""
		},
		optionalParams: {
			radius:		0,
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create a Spider plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.dyn = [];
			this.datas = {};
			this.labelKey = [];
			this.oldSeriePoints = {};
			this.animations = {};
		},
		clear: function(){
			//	summary:
			//		Clear out all of the information tied to this plot.
			//	returns: dojox.charting.plot2d.Spider
			//		A reference to this plot for functional chaining.
			this.dirty = true;
			this.dyn = [];
			this.series = [];
			this.datas = {};
			this.labelKey = [];
			this.oldSeriePoints = {};
			this.animations = {};
			return this;	//	dojox.charting.plot2d.Spider
		},
		setAxis: function(axis){
			//	summary:
			//		Dummy method, since axes are irrelevant with a Spider chart.
			//	returns: dojox.charting.plot2d.Spider
			//		The reference to this plot for functional chaining.
			return this;	//	dojox.charting.plot2d.Spider
		},
		addSeries: function(run){
			//	summary:
			//		Add a data series to this plot.
			//	run: dojox.charting.Series
			//		The series to be added.
			//	returns: dojox.charting.plot2d.Base
			//		A reference to this plot for functional chaining.
			var matched = false;
			this.series.push(run);
			for(var key in run.data){
				var val = run.data[key],
					data = this.datas[key];
				if(data){
					data.vlist.push(val);
					data.min = Math.min(data.min, val);
					data.max = Math.max(data.max, val);
				}else{
					this.datas[key] = {min: val, max: val, vlist: [val]};
				}
			}
			if (this.labelKey.length <= 0) {
				for (var key in run.data) {
					this.labelKey.push(key);
				}
			}
			return this;	//	dojox.charting.plot2d.Base
		},
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return dc.collectSimpleStats(this.series);
		},
		calculateAxes: function(dim){
			//	summary:
			//		Stub function for running the axis calculations (depricated).
			//	dim: Object
			//		An object of the form { width, height }
			//	returns: dojox.charting.plot2d.Base
			//		A reference to this plot for functional chaining.
			this.initializeScalers(dim, this.getSeriesStats());
			return this;	//	dojox.charting.plot2d.Base
		},
		getRequiredColors: function(){
			//	summary:
			//		Get how many data series we have, so we know how many colors to use.
			//	returns: Number
			//		The number of colors needed.
			return this.series.length;	//	Number
		},
		initializeScalers: function(dim, stats){
			//	summary:
			//		Initializes scalers using attached axes.
			//	dim: Object:
			//		Size of a plot area in pixels as {width, height}.
			//	stats: Object:
			//		Min/max of data in both directions as {hmin, hmax, vmin, vmax}.
			//	returns: dojox.charting.plot2d.Base
			//		A reference to this plot for functional chaining.
			if(this._hAxis){
				if(!this._hAxis.initialized()){
					this._hAxis.calculate(stats.hmin, stats.hmax, dim.width);
				}
				this._hScaler = this._hAxis.getScaler();
			}else{
				this._hScaler = primitive.buildScaler(stats.hmin, stats.hmax, dim.width);
			}
			if(this._vAxis){
				if(!this._vAxis.initialized()){
					this._vAxis.calculate(stats.vmin, stats.vmax, dim.height);
				}
				this._vScaler = this._vAxis.getScaler();
			}else{
				this._vScaler = primitive.buildScaler(stats.vmin, stats.vmax, dim.height);
			}
			return this;	//	dojox.charting.plot2d.Base
		},
		render: function(dim, offsets){
			//	summary:
			//		Render the plot on the chart.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Spider
			//		A reference to this plot for functional chaining.
			if(!this.dirty){ return this; }
			this.dirty = false;
			this.cleanGroup();
			var s = this.group, t = this.chart.theme;
			this.resetEvents();

			if(!this.series || !this.series.length){
				return this;
			}

			// calculate the geometry
			var o = this.opt, ta = t.axis,
				rx = (dim.width	 - offsets.l - offsets.r) / 2,
				ry = (dim.height - offsets.t - offsets.b) / 2,
				r  = Math.min(rx, ry),
				axisTickFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font) || "normal normal normal 7pt Tahoma",
				axisFont = o.axisFont || (ta.tick && ta.tick.titleFont) || "normal normal normal 11pt Tahoma",
				axisTickFontColor = o.axisTickFontColor || (ta.majorTick && ta.majorTick.fontColor) || (ta.tick && ta.tick.fontColor) || "silver",
				axisFontColor = o.axisFontColor || (ta.tick && ta.tick.titleFontColor) || "black",
				axisColor = o.axisColor || (ta.tick && ta.tick.axisColor) || "silver",
				spiderColor = o.spiderColor || (ta.tick && ta.tick.spiderColor) || "silver",
				axisWidth = o.axisWidth || (ta.stroke && ta.stroke.width) || 2,
				spiderWidth = o.spiderWidth || (ta.stroke && ta.stroke.width) || 2,
				seriesWidth = o.seriesWidth || (ta.stroke && ta.stroke.width) || 2,
				asize = g.normalizedLength(g.splitFontString(axisFont).size),
				startAngle = m._degToRad(o.startAngle),
				start = startAngle, step, filteredRun, slices, labels, shift, labelR,
				outerPoints, innerPoints, divisionPoints, divisionRadius, labelPoints,
				ro = o.spiderOrigin, dv = o.divisions >= 3 ? o.divisions : 3, ms = o.markerSize,
				spt = o.spiderType, at = o.animationType, lboffset = o.labelOffset < -10 ? o.labelOffset : -10,
				axisExtra = 0.2;
			
			if(o.labels){
				labels = arr.map(this.series, function(s){
					return s.name;
				}, this);
				shift = df.foldl1(df.map(labels, function(label, i){
					var font = t.series.font;
					return g._base._getTextBox(label, {
						font: font
					}).w;
				}, this), "Math.max(a, b)") / 2;
				r = Math.min(rx - 2 * shift, ry - asize) + lboffset;
				labelR = r - lboffset;
			}
			if ("radius" in o) {
				r = o.radius;
				labelR = r - lboffset;
			}
			r /= (1+axisExtra);
			var circle = {
				cx: offsets.l + rx,
				cy: offsets.t + ry,
				r: r
			};
			
			for (var i = this.series.length - 1; i >= 0; i--) {
				var serieEntry = this.series[i];
				if (!this.dirty && !serieEntry.dirty) {
					t.skip();
					continue;
				}
				serieEntry.cleanGroup();
				var run = serieEntry.data;
				if (run !== null) {
					var len = this._getObjectLength(run);
					//construct connect points
					if (!outerPoints || outerPoints.length <= 0) {
						outerPoints = [], innerPoints = [], labelPoints = [];
						this._buildPoints(outerPoints, len, circle, r, start, true);
						this._buildPoints(innerPoints, len, circle, r*ro, start, true);
						this._buildPoints(labelPoints, len, circle, labelR, start);
						if(dv > 2){
							divisionPoints = [], divisionRadius = [];
							for (var j = 0; j < dv - 2; j++) {
								divisionPoints[j] = [];
								this._buildPoints(divisionPoints[j], len, circle, r*(ro + (1-ro)*(j+1)/(dv-1)), start, true);
								divisionRadius[j] = r*(ro + (1-ro)*(j+1)/(dv-1));
							}
						}
					}
				}
			}
			
			//draw Spider
			//axis
			var axisGroup = s.createGroup(), axisStroke = {color: axisColor, width: axisWidth},
				spiderStroke = {color: spiderColor, width: spiderWidth};
			for (var j = outerPoints.length - 1; j >= 0; --j) {
				var point = outerPoints[j],
					st = {
						x: point.x + (point.x - circle.cx) * axisExtra,
						y: point.y + (point.y - circle.cy) * axisExtra
					},
					nd = {
						x: point.x + (point.x - circle.cx) * axisExtra / 2,
						y: point.y + (point.y - circle.cy) * axisExtra / 2
					};
				axisGroup.createLine({
					x1: circle.cx,
					y1: circle.cy,
					x2: st.x,
					y2: st.y
				}).setStroke(axisStroke);
				//arrow
				this._drawArrow(axisGroup, st, nd, axisStroke);
			}
			
			// draw the label
			var labelGroup = s.createGroup();
			for (var j = labelPoints.length - 1; j >= 0; --j) {
				var point = labelPoints[j],
					fontWidth = g._base._getTextBox(this.labelKey[j], {font: axisFont}).w || 0,
					render = this.opt.htmlLabels && g.renderer != "vml" ? "html" : "gfx",
					elem = da.createText[render](this.chart, labelGroup, (!domGeom.isBodyLtr() && render == "html") ? (point.x + fontWidth - dim.width) : point.x, point.y,
							"middle", this.labelKey[j], axisFont, axisFontColor);
				if (this.opt.htmlLabels) {
					this.htmlElements.push(elem);
				}
			}
			
			//spider web: polygon or circle
			var spiderGroup = s.createGroup();
			if(spt == "polygon"){
				spiderGroup.createPolyline(outerPoints).setStroke(spiderStroke);
				spiderGroup.createPolyline(innerPoints).setStroke(spiderStroke);
				if (divisionPoints.length > 0) {
					for (var j = divisionPoints.length - 1; j >= 0; --j) {
						spiderGroup.createPolyline(divisionPoints[j]).setStroke(spiderStroke);
					}
				}
			}else{//circle
				var ccount = this._getObjectLength(this.datas);
				spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: r}).setStroke(spiderStroke);
				spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: r*ro}).setStroke(spiderStroke);
				if (divisionRadius.length > 0) {
					for (var j = divisionRadius.length - 1; j >= 0; --j) {
						spiderGroup.createCircle({cx: circle.cx, cy: circle.cy, r: divisionRadius[j]}).setStroke(spiderStroke);
					}
				}
			}
			//text
			var textGroup = s.createGroup(), len = this._getObjectLength(this.datas), k = 0;
			for(var key in this.datas){
				var data = this.datas[key], min = data.min, max = data.max, distance = max - min,
					end = start + 2 * Math.PI * k / len;
				for (var i = 0; i < dv; i++) {
					var text = min + distance*i/(dv-1), point = this._getCoordinate(circle, r*(ro + (1-ro)*i/(dv-1)), end);
					text = this._getLabel(text);
					var fontWidth = g._base._getTextBox(text, {font: axisTickFont}).w || 0,
						render = this.opt.htmlLabels && g.renderer != "vml" ? "html" : "gfx";
					if (this.opt.htmlLabels) {
						this.htmlElements.push(da.createText[render]
							(this.chart, textGroup, (!domGeom.isBodyLtr() && render == "html") ? (point.x + fontWidth - dim.width) : point.x, point.y,
								"start", text, axisTickFont, axisTickFontColor));
					}
				}
				k++;
			}
			
			//draw series (animation)
			this.chart.seriesShapes = {};
			var animationConnections = [];
			for (var i = this.series.length - 1; i >= 0; i--) {
				var serieEntry = this.series[i], run = serieEntry.data;
				if (run !== null) {
					//series polygon
					var seriePoints = [], k = 0, tipData = [];
					for(var key in run){
						var data = this.datas[key], min = data.min, max = data.max, distance = max - min,
							entry = run[key], end = start + 2 * Math.PI * k / len,
							point = this._getCoordinate(circle, r*(ro + (1-ro)*(entry-min)/distance), end);
						seriePoints.push(point);
						tipData.push({sname: serieEntry.name, key: key, data: entry});
						k++;
					}
					seriePoints[seriePoints.length] = seriePoints[0];
					tipData[tipData.length] = tipData[0];
					var polygonBoundRect = this._getBoundary(seriePoints),
						theme = t.next("spider", [o, serieEntry]), ts = serieEntry.group,
						f = g.normalizeColor(theme.series.fill), sk = {color: theme.series.fill, width: seriesWidth};
					f.a = o.seriesFillAlpha;
					serieEntry.dyn = {fill: f, stroke: sk};
					
					var osps = this.oldSeriePoints[serieEntry.name];
					var cs = this._createSeriesEntry(ts, (osps || innerPoints), seriePoints, f, sk, r, ro, ms, at);
					this.chart.seriesShapes[serieEntry.name] = cs;
					this.oldSeriePoints[serieEntry.name] = seriePoints;
					
					var po = {
						element: "spider_poly",
						index:	 i,
						id:		 "spider_poly_"+serieEntry.name,
						run:	 serieEntry,
						plot:	 this,
						shape:	 cs.poly,
						parent:	 ts,
						brect:	 polygonBoundRect,
						cx:		 circle.cx,
						cy:		 circle.cy,
						cr:		 r,
						f:		 f,
						s:		 s
					};
					this._connectEvents(po);
					
					var so = {
						element: "spider_plot",
						index:	 i,
						id:		 "spider_plot_"+serieEntry.name,
						run:	 serieEntry,
						plot:	 this,
						shape:	 serieEntry.group
					};
					this._connectEvents(so);
					
					arr.forEach(cs.circles, function(c, i){
						var shape = c.getShape(),
							co = {
								element: "spider_circle",
								index:	 i,
								id:		 "spider_circle_"+serieEntry.name+i,
								run:	 serieEntry,
								plot:	 this,
								shape:	 c,
								parent:	 ts,
								tdata:	 tipData[i],
								cx:		 seriePoints[i].x,
								cy:		 seriePoints[i].y,
								f:		 f,
								s:		 s
							};
						this._connectEvents(co);
					}, this);
				}
			}
			return this;	//	dojox.charting.plot2d.Spider
		},
		_createSeriesEntry: function(ts, osps, sps, f, sk, r, ro, ms, at){
			//polygon
			var spoly = ts.createPolyline(osps).setFill(f).setStroke(sk), scircle = [];
			for (var j = 0; j < osps.length; j++) {
				var point = osps[j], cr = ms;
				var circle = ts.createCircle({cx: point.x, cy: point.y, r: cr}).setFill(f).setStroke(sk);
				scircle.push(circle);
			}
			
			var anims = arr.map(sps, function(np, j){
				// create animation
				var sp = osps[j],
					anim = new baseFx.Animation({
					duration: 1000,
					easing:	  at,
					curve:	  [sp.y, np.y]
				});
				var spl = spoly, sc = scircle[j];
				hub.connect(anim, "onAnimate", function(y){
					//apply poly
					var pshape = spl.getShape();
					pshape.points[j].y = y;
					spl.setShape(pshape);
					//apply circle
					var cshape = sc.getShape();
					cshape.cy = y;
					sc.setShape(cshape);
				});
				return anim;
			});
			
			var anims1 = arr.map(sps, function(np, j){
				// create animation
				var sp = osps[j],
					anim = new baseFx.Animation({
					duration: 1000,
					easing:	  at,
					curve:	  [sp.x, np.x]
				});
				var spl = spoly, sc = scircle[j];
				hub.connect(anim, "onAnimate", function(x){
					//apply poly
					var pshape = spl.getShape();
					pshape.points[j].x = x;
					spl.setShape(pshape);
					//apply circle
					var cshape = sc.getShape();
					cshape.cx = x;
					sc.setShape(cshape);
				});
				return anim;
			});
			var masterAnimation = coreFx.combine(anims.concat(anims1)); //dojo.fx.chain(anims);
			masterAnimation.play();
			return {group :ts, poly: spoly, circles: scircle};
		},
		plotEvent: function(o){
			//	summary:
			//		Stub function for use by specific plots.
			//	o: Object
			//		An object intended to represent event parameters.
			var runName = o.id ? o.id : "default", a;
			if (runName in this.animations) {
				a = this.animations[runName];
				a.anim && a.anim.stop(true);
			} else {
				a = this.animations[runName] = {};
			}
			if(o.element == "spider_poly"){
				if(!a.color){
					var color = o.shape.getFill();
					if(!color || !(color instanceof Color)){
						return;
					}
					a.color = {
						start: color,
						end:   transColor(color)
					};
				}
				var start = a.color.start, end = a.color.end;
				if(o.type == "onmouseout"){
					// swap colors
					var t = start; start = end; end = t;
				}
				a.anim = gfxfx.animateFill({
					shape:	  o.shape,
					duration: 800,
					easing:	  easing.backOut,
					color:	  {start: start, end: end}
				});
				a.anim.play();
			}else if(o.element == "spider_circle"){
				var init, scale, defaultScale = 1.5;
				if(o.type == "onmouseover"){
					init  = m.identity;
					scale = defaultScale;
					//show tooltip
					var aroundRect = {type: "rect"};
					aroundRect.x = o.cx;
					aroundRect.y = o.cy;
					aroundRect.width = aroundRect.height = 1;
					var lt = html.coords(this.chart.node, true);
					aroundRect.x += lt.x;
					aroundRect.y += lt.y;
					aroundRect.x = Math.round(aroundRect.x);
					aroundRect.y = Math.round(aroundRect.y);
					aroundRect.width = aroundRect.w = Math.ceil(aroundRect.width);
					aroundRect.height = aroundRect.h = Math.ceil(aroundRect.height);
					this.aroundRect = aroundRect;
					var position = ["after-centered", "before-centered"];
					dc.doIfLoaded("dijit/Tooltip", dojo.hitch(this, function(Tooltip){
						Tooltip.show(o.tdata.sname + "<br/>" + o.tdata.key + "<br/>" + o.tdata.data, this.aroundRect, position);
					}));
				}else{
					init  = m.scaleAt(defaultScale, o.cx, o.cy);
					scale = 1/defaultScale;
					dc.doIfLoaded("dijit/Tooltip", dojo.hitch(this, function(Tooltip){
						this.aroundRect && Tooltip.hide(this.aroundRect);
					}));
				}
				var cs = o.shape.getShape(),
					init = m.scaleAt(defaultScale, cs.cx, cs.cy),
					kwArgs = {
						shape: o.shape,
						duration: 200,
						easing:	  easing.backOut,
						transform: [
							{name: "scaleAt", start: [1, cs.cx, cs.cy], end: [scale, cs.cx, cs.cy]},
							init
						]
					};
				a.anim = gfxfx.animateTransform(kwArgs);
				a.anim.play();
			}else if(o.element == "spider_plot"){
				//dojo gfx function "moveToFront" not work in IE
				if (o.type == "onmouseover" && !has("ie")) {
					o.shape.moveToFront();
				}
			}
		},
		_getBoundary: function(points){
			var xmax = points[0].x,
				xmin = points[0].x,
				ymax = points[0].y,
				ymin = points[0].y;
			for(var i = 0; i < points.length; i++){
				var point = points[i];
				xmax = Math.max(point.x, xmax);
				ymax = Math.max(point.y, ymax);
				xmin = Math.min(point.x, xmin);
				ymin = Math.min(point.y, ymin);
			}
			return {
				x: xmin,
				y: ymin,
				width: xmax - xmin,
				height: ymax - ymin
			};
		},
		
		_drawArrow: function(s, start, end, stroke){
			var len = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)),
				sin = (end.y - start.y)/len, cos = (end.x - start.x)/len,
				point2 = {x: end.x + (len/3)*(-sin), y: end.y + (len/3)*cos},
				point3 = {x: end.x + (len/3)*sin, y: end.y + (len/3)*(-cos)};
			s.createPolyline([start, point2, point3]).setFill(stroke.color).setStroke(stroke);
		},
		
		_buildPoints: function(points, count, circle, radius, angle, recursive){
			for (var i = 0; i < count; i++) {
				var end = angle + 2 * Math.PI * i / count;
				points.push(this._getCoordinate(circle, radius, end));
			}
			if(recursive){
				points.push(this._getCoordinate(circle, radius, angle + 2 * Math.PI));
			}
		},
		
		_getCoordinate: function(circle, radius, angle){
			return {
				x: circle.cx + radius * Math.cos(angle),
				y: circle.cy + radius * Math.sin(angle)
			}
		},
		
		_getObjectLength: function(obj){
			var count = 0;
			if(lang.isObject(obj)){
				for(var key in obj){
					count++;
				}
			}
			return count;
		},

		// utilities
		_getLabel: function(number){
			return dc.getLabel(number, this.opt.fixed, this.opt.precision);
		}
	});
	
	function transColor(color){
		var a = new dxcolor.Color(color),
			x = a.toHsl();
		if(x.s == 0){
			x.l = x.l < 50 ? 100 : 0;
		}else{
			x.s = 100;
			if(x.l < 50){
				x.l = 75;
			}else if(x.l > 75){
				x.l = 50;
			}else{
				x.l = x.l - 50 > 75 - x.l ?
					50 : 75;
			}
		}
		var color = dxcolor.fromHsl(x);
		color.a = 0.7;
		return color;
	}
	
	return Spider; // dojox.plot2d.Spider
});

},
'dijit/form/ToggleButton':function(){
define("dijit/form/ToggleButton", [
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.deprecated
	"./Button",
	"./_ToggleButtonMixin"
], function(declare, kernel, Button, _ToggleButtonMixin){

/*=====
	var Button = dijit.form.Button;
	var _ToggleButtonMixin = dijit.form._ToggleButtonMixin;
=====*/

	// module:
	//		dijit/form/ToggleButton
	// summary:
	//		A templated button widget that can be in two states (checked or not).


	return declare("dijit.form.ToggleButton", [Button, _ToggleButtonMixin], {
		// summary:
		//		A templated button widget that can be in two states (checked or not).
		//		Can be base class for things like tabs or checkbox or radio buttons

		baseClass: "dijitToggleButton",

		setChecked: function(/*Boolean*/ checked){
			// summary:
			//		Deprecated.  Use set('checked', true/false) instead.
			kernel.deprecated("setChecked("+checked+") is deprecated. Use set('checked',"+checked+") instead.", "", "2.0");
			this.set('checked', checked);
		}
	});
});

},
'dojox/charting/Chart3D':function(){
define("dojox/charting/Chart3D", ["dojo/_base/array", "dojo/dom","dojo/_base/declare", "dojo/_base/html", "dojox/gfx", "dojox/gfx3d"], 
	function(arr, dom, declare, html, gfx, gfx3d){
	// module:
	//		dojox/charting/Chart3D
	// summary:
	//		This module provides basic 3d charting capablities (using 2d vector graphics to simulate 3d.

	/*=====
	dojox.charting.__Chart3DCtorArgs = function(node, lights, camera, theme){
		//	summary:
		//		The keyword arguments that can be passed in a Chart constructor.
		//
		//	node: Node
		//		The DOM node to construct the chart on.
		//	lights: 
		//		Lighting properties for the 3d scene
		//	camera: Object
		//		Camera properties describing the viewing camera position.
		//	theme: Object
		//		Charting theme to use for coloring chart elements.
	}
	 =====*/
	var observerVector = {x: 0, y: 0, z: 1}, v = gfx3d.vector, n = gfx.normalizedLength;

	return declare("dojox.charting.Chart3D", null, {
		constructor: function(node, lights, camera, theme){
			// setup a view
			this.node = dom.byId(node);
			this.surface = gfx.createSurface(this.node, n(this.node.style.width), n(this.node.style.height));
			this.view = this.surface.createViewport();
			this.view.setLights(lights.lights, lights.ambient, lights.specular);
			this.view.setCameraTransform(camera);
			this.theme = theme;
			
			// initialize internal variables
			this.walls = [];
			this.plots = [];
		},
		
		// public API
		generate: function(){
			return this._generateWalls()._generatePlots();
		},
		invalidate: function(){
			this.view.invalidate();
			return this;
		},
		render: function(){
			this.view.render();
			return this;
		},
		addPlot: function(plot){
			return this._add(this.plots, plot);
		},
		removePlot: function(plot){
			return this._remove(this.plots, plot);
		},
		addWall: function(wall){
			return this._add(this.walls, wall);
		},
		removeWall: function(wall){
			return this._remove(this.walls, wall);
		},
		
		// internal API
		_add: function(array, item){
			if(!arr.some(array, function(i){ return i == item; })){
				array.push(item);
				this.view.invalidate();
			}
			return this;
		},
		_remove: function(array, item){
			var a = arr.filter(array, function(i){ return i != item; });
			return a.length < array.length ? (array = a, this.invalidate()) : this;
		},
		_generateWalls: function(){
			for(var i = 0; i < this.walls.length; ++i){
				if(v.dotProduct(observerVector, this.walls[i].normal) > 0){
					this.walls[i].generate(this);
				}
			}
			return this;
		},
		_generatePlots: function(){
			var depth = 0, m = gfx3d.matrix, i = 0;
			for(; i < this.plots.length; ++i){
				depth += this.plots[i].getDepth();
			}
			for(--i; i >= 0; --i){
				var scene = this.view.createScene();
				scene.setTransform(m.translate(0, 0, -depth));
				this.plots[i].generate(this, scene);
				depth -= this.plots[i].getDepth();
			}
			return this;
		}
	});
});

},
'dojox/gfx/_base':function(){
define("dojox/gfx/_base", ["dojo/_base/lang", "dojo/_base/html", "dojo/_base/Color", "dojo/_base/sniff", "dojo/_base/window",
	    "dojo/_base/array","dojo/dom", "dojo/dom-construct","dojo/dom-geometry"], 
  function(lang, html, Color, has, win, arr, dom, domConstruct, domGeom){
	// module:
	//		dojox/gfx
	// summary:
	//		This module contains common core Graphics API used by different graphics renderers.
	var g = lang.getObject("dojox.gfx", true),
		b = g._base = {};
	/*===== g = dojox.gfx; b = dojox.gfx._base; =====*/
	
	// candidates for dojox.style (work on VML and SVG nodes)
	g._hasClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary:
		//		Returns whether or not the specified classes are a portion of the
		//		class list currently applied to the node.
		// return (new RegExp('(^|\\s+)'+classStr+'(\\s+|$)')).test(node.className)	// Boolean
		var cls = node.getAttribute("className");
		return cls && (" " + cls + " ").indexOf(" " + classStr + " ") >= 0;  // Boolean
	};
	g._addClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary:
		//		Adds the specified classes to the end of the class list on the
		//		passed node.
		var cls = node.getAttribute("className") || "";
		if(!cls || (" " + cls + " ").indexOf(" " + classStr + " ") < 0){
			node.setAttribute("className", cls + (cls ? " " : "") + classStr);
		}
	};
	g._removeClass = function(/*DomNode*/node, /*String*/classStr){
		//	summary: Removes classes from node.
		var cls = node.getAttribute("className");
		if(cls){
			node.setAttribute(
				"className",
				cls.replace(new RegExp('(^|\\s+)' + classStr + '(\\s+|$)'), "$1$2")
			);
		}
	};

	// candidate for dojox.html.metrics (dynamic font resize handler is not implemented here)

	//	derived from Morris John's emResized measurer
	b._getFontMeasurements = function(){
		//	summary:
		//		Returns an object that has pixel equivilents of standard font
		//		size values.
		var heights = {
			'1em': 0, '1ex': 0, '100%': 0, '12pt': 0, '16px': 0, 'xx-small': 0,
			'x-small': 0, 'small': 0, 'medium': 0, 'large': 0, 'x-large': 0,
			'xx-large': 0
		};
		var p;

		if(has("ie")){
			//	we do a font-size fix if and only if one isn't applied already.
			//	NOTE: If someone set the fontSize on the HTML Element, this will kill it.
			win.doc.documentElement.style.fontSize="100%";
		}

		//	set up the measuring node.
		var div = domConstruct.create("div", {style: {
				position: "absolute",
				left: "0",
				top: "-100px",
				width: "30px",
				height: "1000em",
				borderWidth: "0",
				margin: "0",
				padding: "0",
				outline: "none",
				lineHeight: "1",
				overflow: "hidden"
			}}, win.body());

		//	do the measurements.
		for(p in heights){
			div.style.fontSize = p;
			heights[p] = Math.round(div.offsetHeight * 12/16) * 16/12 / 1000;
		}

		win.body().removeChild(div);
		return heights; //object
	};

	var fontMeasurements = null;

	b._getCachedFontMeasurements = function(recalculate){
		if(recalculate || !fontMeasurements){
			fontMeasurements = b._getFontMeasurements();
		}
		return fontMeasurements;
	};

	// candidate for dojox.html.metrics

	var measuringNode = null, empty = {};
	b._getTextBox = function(	/*String*/ text,
								/*Object*/ style,
								/*String?*/ className){
		var m, s, al = arguments.length;
		var i;
		if(!measuringNode){
			measuringNode = domConstruct.create("div", {style: {
				position: "absolute",
				top: "-10000px",
				left: "0"
			}}, win.body());
		}
		m = measuringNode;
		// reset styles
		m.className = "";
		s = m.style;
		s.borderWidth = "0";
		s.margin = "0";
		s.padding = "0";
		s.outline = "0";
		// set new style
		if(al > 1 && style){
			for(i in style){
				if(i in empty){ continue; }
				s[i] = style[i];
			}
		}
		// set classes
		if(al > 2 && className){
			m.className = className;
		}
		// take a measure
		m.innerHTML = text;

		if(m["getBoundingClientRect"]){
			var bcr = m.getBoundingClientRect();
			return {l: bcr.left, t: bcr.top, w: bcr.width || (bcr.right - bcr.left), h: bcr.height || (bcr.bottom - bcr.top)};
		}else{
			return domGeom.getMarginBox(m);
		}
	};

	// candidate for dojo.dom

	var uniqueId = 0;
	b._getUniqueId = function(){
		// summary: returns a unique string for use with any DOM element
		var id;
		do{
			id = dojo._scopeName + "xUnique" + (++uniqueId);
		}while(dom.byId(id));
		return id;
	};

	lang.mixin(g, {
		//	summary:
		//		defines constants, prototypes, and utility functions for the core Graphics API

		// default shapes, which are used to fill in missing parameters
		defaultPath: {
			//	summary:
			//		Defines the default Path prototype object.
			type: "path", 
			//	type: String
			//		Specifies this object is a Path, default value 'path'.
			path: ""
			//	path: String
			//		The path commands. See W32C SVG 1.0 specification. 
			//		Defaults to empty string value.
		},
		defaultPolyline: {
			//	summary:
			//		Defines the default PolyLine prototype.
			type: "polyline", 
			//	type: String
			//		Specifies this object is a PolyLine, default value 'polyline'.
			points: []
			//	points: Array
			//		An array of point objects [{x:0,y:0},...] defining the default polyline's line segments. Value is an empty array [].
		},
		defaultRect: {
			//	summary:
			//		Defines the default Rect prototype.
			type: "rect",
			//	type: String
			//		Specifies this default object is a type of Rect. Value is 'rect' 
			x: 0, 
			//	x: Number
			//		The X coordinate of the default rectangles position, value 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the default rectangle's position, value 0.
			width: 100, 
			//	width: Number
			//		The width of the default rectangle, value 100.
			height: 100, 
			//	height: Number
			//		The height of the default rectangle, value 100.
			r: 0
			//	r: Number
			//		The corner radius for the default rectangle, value 0.
		},
		defaultEllipse: {
			//	summary:
			//		Defines the default Ellipse prototype.
			type: "ellipse", 
			//	type: String
			//		Specifies that this object is a type of Ellipse, value is 'ellipse'
			cx: 0, 
			//	cx: Number
			//		The X coordinate of the center of the ellipse, default value 0.
			cy: 0, 
			//	cy: Number
			//		The Y coordinate of the center of the ellipse, default value 0.
			rx: 200,
			//	rx: Number
			//		The radius of the ellipse in the X direction, default value 200.
			ry: 100
			//	ry: Number
			//		The radius of the ellipse in the Y direction, default value 200.
		},
		defaultCircle: {
			//	summary:
			//		An object defining the default Circle prototype.
			type: "circle", 
			//	type: String
			//		Specifies this object is a circle, value 'circle'
			cx: 0, 
			//	cx: Number
			//		The X coordinate of the center of the circle, default value 0.
			cy: 0, 
			//	cy: Number
			//		The Y coordinate of the center of the circle, default value 0.
			r: 100
			//	r: Number
			//		The radius, default value 100.
		},
		defaultLine: {
			//	summary:
			//		An pbject defining the default Line prototype.
			type: "line", 
			//	type: String
			//		Specifies this is a Line, value 'line'
			x1: 0, 
			//	x1: Number
			//		The X coordinate of the start of the line, default value 0.
			y1: 0, 
			//	y1: Number
			//		The Y coordinate of the start of the line, default value 0.
			x2: 100,
			//	x2: Number
			//		The X coordinate of the end of the line, default value 100.
			y2: 100
			//	y2: Number
			//		The Y coordinate of the end of the line, default value 100.
		},
		defaultImage: {
			//	summary:
			//		Defines the default Image prototype.
			type: "image",
			//	type: String
			//		Specifies this object is an image, value 'image'.
			x: 0, 
			//	x: Number
			//		The X coordinate of the image's position, default value 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the image's position, default value 0.
			width: 0,
			//	width: Number
			//		The width of the image, default value 0.
			height: 0,
			//	height:Number
			//		The height of the image, default value 0.
			src: ""
			//	src: String
			//		The src url of the image, defaults to empty string.
		},
		defaultText: {
			//	summary:
			//		Defines the default Text prototype.
			type: "text", 
			//	type: String
			//		Specifies this is a Text shape, value 'text'.
			x: 0, 
			//	x: Number
			//		The X coordinate of the text position, default value 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the text position, default value 0.
			text: "",
			//	text: String
			//		The text to be displayed, default value empty string.
			align: "start",
			//	align:	String
			//		The horizontal text alignment, one of 'start', 'end', 'center'. Default value 'start'.
			decoration: "none",
			//	decoration: String
			//		The text decoration , one of 'none', ... . Default value 'none'.
			rotated: false,
			//	rotated: Boolean
			//		Whether the text is rotated, boolean default value false.
			kerning: true
			//	kerning: Boolean
			//		Whether kerning is used on the text, boolean default value true.
		},
		defaultTextPath: {
			//	summary:
			//		Defines the default TextPath prototype.
			type: "textpath", 
			//	type: String
			//		Specifies this is a TextPath, value 'textpath'.
			text: "", 
			//	text: String
			//		The text to be displayed, default value empty string.
			align: "start",
			//	align: String
			//		The horizontal text alignment, one of 'start', 'end', 'center'. Default value 'start'.
			decoration: "none",
			//	decoration: String
			//		The text decoration , one of 'none', ... . Default value 'none'.
			rotated: false,
			//	rotated: Boolean
			//		Whether the text is rotated, boolean default value false.
			kerning: true
			//	kerning: Boolean
			//		Whether kerning is used on the text, boolean default value true.
		},

		// default stylistic attributes
		defaultStroke: {
			//	summary:
			//		A stroke defines stylistic properties that are used when drawing a path.  
			//		This object defines the default Stroke prototype.
			type: "stroke", 
			//	type: String
			//		Specifies this object is a type of Stroke, value 'stroke'.
			color: "black", 
			//	color: String
			//		The color of the stroke, default value 'black'.
			style: "solid",
			//	style: String
			//		The style of the stroke, one of 'solid', ... . Default value 'solid'.
			width: 1,
			//	width: Number
			//		The width of a stroke, default value 1.
			cap: "butt",
			//	cap: String
			//		The endcap style of the path. One of 'butt', 'round', ... . Default value 'butt'.
			join: 4
			//	join: Number
			//		The join style to use when combining path segments. Default value 4.
		},
		defaultLinearGradient: {
			//	summary:
			//		An object defining the default stylistic properties used for Linear Gradient fills.
			//		Linear gradients are drawn along a virtual line, which results in appearance of a rotated pattern in a given direction/orientation.
			type: "linear", 
			//	type: String
			//		Specifies this object is a Linear Gradient, value 'linear'
			x1: 0, 
			//	x1: Number
			//		The X coordinate of the start of the virtual line along which the gradient is drawn, default value 0.
			y1: 0, 
			//	y1: Number
			//		The Y coordinate of the start of the virtual line along which the gradient is drawn, default value 0.
			x2: 100,
			//	x2: Number
			//		The X coordinate of the end of the virtual line along which the gradient is drawn, default value 100.
			y2: 100,
			//	y2: Number
			//		The Y coordinate of the end of the virtual line along which the gradient is drawn, default value 100.
			colors: [
				{ offset: 0, color: "black" }, { offset: 1, color: "white" }
			]
			//	colors: Array
			//		An array of colors at given offsets (from the start of the line).  The start of the line is
			//		defined at offest 0 with the end of the line at offset 1.
			//		Default value, [{ offset: 0, color: 'black'},{offset: 1, color: 'white'}], is a gradient from black to white. 
		},
		defaultRadialGradient: {
			// summary:
			//		An object specifying the default properties for RadialGradients using in fills patterns.
			type: "radial",
			//	type: String
			//		Specifies this is a RadialGradient, value 'radial'
			cx: 0, 
			//	cx: Number
			//		The X coordinate of the center of the radial gradient, default value 0.
			cy: 0, 
			//	cy: Number
			//		The Y coordinate of the center of the radial gradient, default value 0.
			r: 100,
			//	r: Number
			//		The radius to the end of the radial gradient, default value 100.
			colors: [
				{ offset: 0, color: "black" }, { offset: 1, color: "white" }
			]
			//	colors: Array
			//		An array of colors at given offsets (from the center of the radial gradient).  
			//		The center is defined at offest 0 with the outer edge of the gradient at offset 1.
			//		Default value, [{ offset: 0, color: 'black'},{offset: 1, color: 'white'}], is a gradient from black to white. 
		},
		defaultPattern: {
			// summary:
			//		An object specifying the default properties for a Pattern using in fill operations.
			type: "pattern", 
			// type: String
			//		Specifies this object is a Pattern, value 'pattern'.
			x: 0, 
			//	x: Number
			//		The X coordinate of the position of the pattern, default value is 0.
			y: 0, 
			//	y: Number
			//		The Y coordinate of the position of the pattern, default value is 0.
			width: 0, 
			//	width: Number
			//		The width of the pattern image, default value is 0.
			height: 0, 
			//	height: Number
			//		The height of the pattern image, default value is 0.
			src: ""
			//	src: String
			//		A url specifing the image to use for the pattern.
		},
		defaultFont: {
			// summary:
			//		An object specifying the default properties for a Font used in text operations.
			type: "font", 
			// type: String
			//		Specifies this object is a Font, value 'font'.
			style: "normal", 
			//	style: String
			//		The font style, one of 'normal', 'bold', default value 'normal'.
			variant: "normal",
			//	variant: String
			//		The font variant, one of 'normal', ... , default value 'normal'.
			weight: "normal", 
			//	weight: String
			//		The font weight, one of 'normal', ..., default value 'normal'.
			size: "10pt", 
			//	size: String
			//		The font size (including units), default value '10pt'.
			family: "serif"
			//	family: String
			//		The font family, one of 'serif', 'sanserif', ..., default value 'serif'.
		},

		getDefault: (function(){
			//	summary:
			//		Returns a function used to access default memoized prototype objects (see them defined above).
			var typeCtorCache = {};
			// a memoized delegate()
			return function(/*String*/ type){
				var t = typeCtorCache[type];
				if(t){
					return new t();
				}
				t = typeCtorCache[type] = new Function();
				t.prototype = g[ "default" + type ];
				return new t();
			}
		})(),

		normalizeColor: function(/*dojo.Color|Array|string|Object*/ color){
			//	summary:
			//		converts any legal color representation to normalized
			//		dojo.Color object
			return (color instanceof Color) ? color : new Color(color); // dojo.Color
		},
		normalizeParameters: function(existed, update){
			//	summary:
			//		updates an existing object with properties from an 'update'
			//		object
			//	existed: Object
			//		the target object to be updated
			//	update:  Object
			//		the 'update' object, whose properties will be used to update
			//		the existed object
			var x;
			if(update){
				var empty = {};
				for(x in existed){
					if(x in update && !(x in empty)){
						existed[x] = update[x];
					}
				}
			}
			return existed;	// Object
		},
		makeParameters: function(defaults, update){
			//	summary:
			//		copies the original object, and all copied properties from the
			//		'update' object
			//	defaults: Object
			//		the object to be cloned before updating
			//	update:   Object
			//		the object, which properties are to be cloned during updating
			var i = null;
			if(!update){
				// return dojo.clone(defaults);
				return lang.delegate(defaults);
			}
			var result = {};
			for(i in defaults){
				if(!(i in result)){
					result[i] = lang.clone((i in update) ? update[i] : defaults[i]);
				}
			}
			return result; // Object
		},
		formatNumber: function(x, addSpace){
			// summary: converts a number to a string using a fixed notation
			// x: Number
			//		number to be converted
			// addSpace: Boolean
			//		whether to add a space before a positive number
			var val = x.toString();
			if(val.indexOf("e") >= 0){
				val = x.toFixed(4);
			}else{
				var point = val.indexOf(".");
				if(point >= 0 && val.length - point > 5){
					val = x.toFixed(4);
				}
			}
			if(x < 0){
				return val; // String
			}
			return addSpace ? " " + val : val; // String
		},
		// font operations
		makeFontString: function(font){
			// summary: converts a font object to a CSS font string
			// font:	Object:	font object (see dojox.gfx.defaultFont)
			return font.style + " " + font.variant + " " + font.weight + " " + font.size + " " + font.family; // Object
		},
		splitFontString: function(str){
			// summary:
			//		converts a CSS font string to a font object
			// description:
			//		Converts a CSS font string to a gfx font object. The CSS font
			//		string components should follow the W3C specified order
			//		(see http://www.w3.org/TR/CSS2/fonts.html#font-shorthand):
			//		style, variant, weight, size, optional line height (will be
			//		ignored), and family.
			// str: String
			//		a CSS font string
			var font = g.getDefault("Font");
			var t = str.split(/\s+/);
			do{
				if(t.length < 5){ break; }
				font.style   = t[0];
				font.variant = t[1];
				font.weight  = t[2];
				var i = t[3].indexOf("/");
				font.size = i < 0 ? t[3] : t[3].substring(0, i);
				var j = 4;
				if(i < 0){
					if(t[4] == "/"){
						j = 6;
					}else if(t[4].charAt(0) == "/"){
						j = 5;
					}
				}
				if(j < t.length){
					font.family = t.slice(j).join(" ");
				}
			}while(false);
			return font;	// Object
		},
		// length operations
		cm_in_pt: 72 / 2.54, 
			//	cm_in_pt: Number
			//		points per centimeter (constant)
		mm_in_pt: 7.2 / 2.54,
			//	mm_in_pt: Number
			//		points per millimeter (constant)
		px_in_pt: function(){
			//	summary: returns the current number of pixels per point.
			return g._base._getCachedFontMeasurements()["12pt"] / 12;	// Number
		},
		pt2px: function(len){
			//	summary: converts points to pixels
			//	len: Number
			//		a value in points
			return len * g.px_in_pt();	// Number
		},
		px2pt: function(len){
			//	summary: converts pixels to points
			//	len: Number
			//		a value in pixels
			return len / g.px_in_pt();	// Number
		},
		normalizedLength: function(len) {
			//	summary: converts any length value to pixels
			//	len: String
			//		a length, e.g., '12pc'
			if(len.length === 0){ return 0; }
			if(len.length > 2){
				var px_in_pt = g.px_in_pt();
				var val = parseFloat(len);
				switch(len.slice(-2)){
					case "px": return val;
					case "pt": return val * px_in_pt;
					case "in": return val * 72 * px_in_pt;
					case "pc": return val * 12 * px_in_pt;
					case "mm": return val * g.mm_in_pt * px_in_pt;
					case "cm": return val * g.cm_in_pt * px_in_pt;
				}
			}
			return parseFloat(len);	// Number
		},

		pathVmlRegExp: /([A-Za-z]+)|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,
			//	pathVmlRegExp: RegExp
			//		a constant regular expression used to split a SVG/VML path into primitive components
		pathSvgRegExp: /([A-Za-z])|(\d+(\.\d+)?)|(\.\d+)|(-\d+(\.\d+)?)|(-\.\d+)/g,
			//	pathVmlRegExp: RegExp
			//		a constant regular expression used to split a SVG/VML path into primitive components

		equalSources: function(a /*Object*/, b /*Object*/){
			//	summary: compares event sources, returns true if they are equal
			//	a: first event source
			//	b: event source to compare against a
			return a && b && a === b;
		},

		switchTo: function(renderer/*String|Object*/){
			//	summary: switch the graphics implementation to the specified renderer.
			//	renderer: 
			//		Either the string name of a renderer (eg. 'canvas', 'svg, ...) or the renderer
			//		object to switch to.
			var ns = typeof renderer == "string" ? g[renderer] : renderer;
			if(ns){
				arr.forEach(["Group", "Rect", "Ellipse", "Circle", "Line",
						"Polyline", "Image", "Text", "Path", "TextPath",
						"Surface", "createSurface", "fixTarget"], function(name){
					g[name] = ns[name];
				});
			}
		}
	});
	return g; // defaults object api
});

},
'dojo/Stateful':function(){
define("dojo/Stateful", ["./_base/declare", "./_base/lang", "./_base/array"], function(declare, lang, array) {
	// module:
	//		dojo/Stateful
	// summary:
	//		TODOC

return declare("dojo.Stateful", null, {
	// summary:
	//		Base class for objects that provide named properties with optional getter/setter
	//		control and the ability to watch for property changes
	// example:
	//	|	var obj = new dojo.Stateful();
	//	|	obj.watch("foo", function(){
	//	|		console.log("foo changed to " + this.get("foo"));
	//	|	});
	//	|	obj.set("foo","bar");
	postscript: function(mixin){
		if(mixin){
			lang.mixin(this, mixin);
		}
	},

	get: function(/*String*/name){
		// summary:
		//		Get a property on a Stateful instance.
		//	name:
		//		The property to get.
		//	returns:
		//		The property value on this Stateful instance.
		// description:
		//		Get a named property on a Stateful object. The property may
		//		potentially be retrieved via a getter method in subclasses. In the base class
		// 		this just retrieves the object's property.
		// 		For example:
		//	|	stateful = new dojo.Stateful({foo: 3});
		//	|	stateful.get("foo") // returns 3
		//	|	stateful.foo // returns 3

		return this[name]; //Any
	},
	set: function(/*String*/name, /*Object*/value){
		// summary:
		//		Set a property on a Stateful instance
		//	name:
		//		The property to set.
		//	value:
		//		The value to set in the property.
		//	returns:
		//		The function returns this dojo.Stateful instance.
		// description:
		//		Sets named properties on a stateful object and notifies any watchers of
		// 		the property. A programmatic setter may be defined in subclasses.
		// 		For example:
		//	|	stateful = new dojo.Stateful();
		//	|	stateful.watch(function(name, oldValue, value){
		//	|		// this will be called on the set below
		//	|	}
		//	|	stateful.set(foo, 5);
		//
		//	set() may also be called with a hash of name/value pairs, ex:
		//	|	myObj.set({
		//	|		foo: "Howdy",
		//	|		bar: 3
		//	|	})
		//	This is equivalent to calling set(foo, "Howdy") and set(bar, 3)
		if(typeof name === "object"){
			for(var x in name){
				if(name.hasOwnProperty(x) && x !="_watchCallbacks"){
					this.set(x, name[x]);
				}
			}
			return this;
		}
		var oldValue = this[name];
		this[name] = value;
		if(this._watchCallbacks){
			this._watchCallbacks(name, oldValue, value);
		}
		return this; //dojo.Stateful
	},
	watch: function(/*String?*/name, /*Function*/callback){
		// summary:
		//		Watches a property for changes
		//	name:
		//		Indicates the property to watch. This is optional (the callback may be the
		// 		only parameter), and if omitted, all the properties will be watched
		// returns:
		//		An object handle for the watch. The unwatch method of this object
		// 		can be used to discontinue watching this property:
		//		|	var watchHandle = obj.watch("foo", callback);
		//		|	watchHandle.unwatch(); // callback won't be called now
		//	callback:
		//		The function to execute when the property changes. This will be called after
		//		the property has been changed. The callback will be called with the |this|
		//		set to the instance, the first argument as the name of the property, the
		// 		second argument as the old value and the third argument as the new value.

		var callbacks = this._watchCallbacks;
		if(!callbacks){
			var self = this;
			callbacks = this._watchCallbacks = function(name, oldValue, value, ignoreCatchall){
				var notify = function(propertyCallbacks){
					if(propertyCallbacks){
						propertyCallbacks = propertyCallbacks.slice();
						for(var i = 0, l = propertyCallbacks.length; i < l; i++){
							propertyCallbacks[i].call(self, name, oldValue, value);
						}
					}
				};
				notify(callbacks['_' + name]);
				if(!ignoreCatchall){
					notify(callbacks["*"]); // the catch-all
				}
			}; // we use a function instead of an object so it will be ignored by JSON conversion
		}
		if(!callback && typeof name === "function"){
			callback = name;
			name = "*";
		}else{
			// prepend with dash to prevent name conflicts with function (like "name" property)
			name = '_' + name;
		}
		var propertyCallbacks = callbacks[name];
		if(typeof propertyCallbacks !== "object"){
			propertyCallbacks = callbacks[name] = [];
		}
		propertyCallbacks.push(callback);
		return {
			unwatch: function(){
				propertyCallbacks.splice(array.indexOf(propertyCallbacks, callback), 1);
			}
		}; //Object
	}

});

});

},
'dojox/charting/axis2d/Invisible':function(){
define("dojox/charting/axis2d/Invisible", ["dojo/_base/lang", "dojo/_base/declare", "./Base", "../scaler/linear", 
	"dojox/gfx", "dojox/lang/utils", "dojox/lang/functional", "dojo/string"],
	function(lang, declare, Base, lin, g, du, df, dstring){
/*=====
var Base = dojox.charting.axis2d.Base;
=====*/ 
	var merge = du.merge,
		labelGap = 4,			// in pixels
		centerAnchorLimit = 45;	// in degrees

	return declare("dojox.charting.axis2d.Invisible", Base, {
		//	summary:
		//		The default axis object used in dojox.charting.  See dojox.charting.Chart.addAxis for details.
		//
		//	defaultParams: Object
		//		The default parameters used to define any axis.
		//	optionalParams: Object
		//		Any optional parameters needed to define an axis.

		/*
		//	TODO: the documentation tools need these to be pre-defined in order to pick them up
		//	correctly, but the code here is partially predicated on whether or not the properties
		//	actually exist.  For now, we will leave these undocumented but in the code for later. -- TRT

		//	opt: Object
		//		The actual options used to define this axis, created at initialization.
		//	scalar: Object
		//		The calculated helper object to tell charts how to draw an axis and any data.
		//	ticks: Object
		//		The calculated tick object that helps a chart draw the scaling on an axis.
		//	dirty: Boolean
		//		The state of the axis (whether it needs to be redrawn or not)
		//	scale: Number
		//		The current scale of the axis.
		//	offset: Number
		//		The current offset of the axis.

		opt: null,
		scalar: null,
		ticks: null,
		dirty: true,
		scale: 1,
		offset: 0,
		*/
		defaultParams: {
			vertical:    false,		// true for vertical axis
			fixUpper:    "none",	// align the upper on ticks: "major", "minor", "micro", "none"
			fixLower:    "none",	// align the lower on ticks: "major", "minor", "micro", "none"
			natural:     false,		// all tick marks should be made on natural numbers
			leftBottom:  true,		// position of the axis, used with "vertical"
			includeZero: false,		// 0 should be included
			fixed:       true,		// all labels are fixed numbers
			majorLabels: true,		// draw major labels
			minorTicks:  true,		// draw minor ticks
			minorLabels: true,		// draw minor labels
			microTicks:  false,		// draw micro ticks
			rotation:    0			// label rotation angle in degrees
		},
		optionalParams: {
			min:			0,	// minimal value on this axis
			max:			1,	// maximal value on this axis
			from:			0,	// visible from this value
			to:				1,	// visible to this value
			majorTickStep:	4,	// major tick step
			minorTickStep:	2,	// minor tick step
			microTickStep:	1,	// micro tick step
			labels:			[],	// array of labels for major ticks
								// with corresponding numeric values
								// ordered by values
			labelFunc:		null, // function to compute label values
			maxLabelSize:	0,	// size in px. For use with labelFunc
			maxLabelCharCount:	0,	// size in word count.
			trailingSymbol:			null

			// TODO: add support for minRange!
			// minRange:		1,	// smallest distance from min allowed on the axis
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for an axis.
			//	chart: dojox.charting.Chart
			//		The chart the axis belongs to.
			//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
			//		Any optional keyword arguments to be used to define this axis.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
		},
		dependOnData: function(){
			//	summary:
			//		Find out whether or not the axis options depend on the data in the axis.
			return !("min" in this.opt) || !("max" in this.opt);	//	Boolean
		},
		clear: function(){
			//	summary:
			//		Clear out all calculated properties on this axis;
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			delete this.scaler;
			delete this.ticks;
			this.dirty = true;
			return this;	//	dojox.charting.axis2d.Default
		},
		initialized: function(){
			//	summary:
			//		Finds out if this axis has been initialized or not.
			//	returns: Boolean
			//		Whether a scaler has been calculated and if the axis is not dirty.
			return "scaler" in this && !(this.dirty && this.dependOnData());
		},
		setWindow: function(scale, offset){
			//	summary:
			//		Set the drawing "window" for the axis.
			//	scale: Number
			//		The new scale for the axis.
			//	offset: Number
			//		The new offset for the axis.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			this.scale  = scale;
			this.offset = offset;
			return this.clear();	//	dojox.charting.axis2d.Default
		},
		getWindowScale: function(){
			//	summary:
			//		Get the current windowing scale of the axis.
			return "scale" in this ? this.scale : 1;	//	Number
		},
		getWindowOffset: function(){
			//	summary:
			//		Get the current windowing offset for the axis.
			return "offset" in this ? this.offset : 0;	//	Number
		},
		_groupLabelWidth: function(labels, font, wcLimit){
			if(!labels.length){
				return 0;
			}
			if(lang.isObject(labels[0])){
				labels = df.map(labels, function(label){ return label.text; });
			}
			if (wcLimit) {
				labels = df.map(labels, function(label){
					return lang.trim(label).length == 0 ? "" : label.substring(0, wcLimit) + this.trailingSymbol;
				}, this);
			}
			var s = labels.join("<br>");
			return g._base._getTextBox(s, {font: font}).w || 0;
		},
		calculate: function(min, max, span, labels){
			//	summary:
			//		Perform all calculations needed to render this axis.
			//	min: Number
			//		The smallest value represented on this axis.
			//	max: Number
			//		The largest value represented on this axis.
			//	span: Number
			//		The span in pixels over which axis calculations are made.
			//	labels: String[]
			//		Optional list of labels.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			if(this.initialized()){
				return this;
			}
			var o = this.opt;
			this.labels = "labels" in o  ? o.labels : labels;
			this.scaler = lin.buildScaler(min, max, span, o);
			var tsb = this.scaler.bounds;
			if("scale" in this){
				// calculate new range
				o.from = tsb.lower + this.offset;
				o.to   = (tsb.upper - tsb.lower) / this.scale + o.from;
				// make sure that bounds are correct
				if( !isFinite(o.from) ||
					isNaN(o.from) ||
					!isFinite(o.to) ||
					isNaN(o.to) ||
					o.to - o.from >= tsb.upper - tsb.lower
				){
					// any error --- remove from/to bounds
					delete o.from;
					delete o.to;
					delete this.scale;
					delete this.offset;
				}else{
					// shift the window, if we are out of bounds
					if(o.from < tsb.lower){
						o.to += tsb.lower - o.from;
						o.from = tsb.lower;
					}else if(o.to > tsb.upper){
						o.from += tsb.upper - o.to;
						o.to = tsb.upper;
					}
					// update the offset
					this.offset = o.from - tsb.lower;
				}
				// re-calculate the scaler
				this.scaler = lin.buildScaler(min, max, span, o);
				tsb = this.scaler.bounds;
				// cleanup
				if(this.scale == 1 && this.offset == 0){
					delete this.scale;
					delete this.offset;
				}
			}

			var ta = this.chart.theme.axis, labelWidth = 0, rotation = o.rotation % 360,
				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180));

			if(rotation < 0){
				rotation += 360;
			}

			if(size){
				if(this.vertical ? rotation != 0 && rotation != 180 : rotation != 90 && rotation != 270){
					// we need width of all labels
					if(this.labels){
						labelWidth = this._groupLabelWidth(this.labels, taFont, o.maxLabelCharCount);
					}else{
						var labelLength = Math.ceil(
								Math.log(
									Math.max(
										Math.abs(tsb.from),
										Math.abs(tsb.to)
									)
								) / Math.LN10
							),
							t = [];
						if(tsb.from < 0 || tsb.to < 0){
							t.push("-");
						}
						t.push(dstring.rep("9", labelLength));
						var precision = Math.floor(
							Math.log( tsb.to - tsb.from ) / Math.LN10
						);
						if(precision > 0){
							t.push(".");
							t.push(dstring.rep("9", precision));
						}
						labelWidth = g._base._getTextBox(
							t.join(""),
							{ font: taFont }
						).w;
					}
					labelWidth = o.maxLabelSize ? Math.min(o.maxLabelSize, labelWidth) : labelWidth;
				}else{
					labelWidth = size;
				}
				switch(rotation){
					case 0:
					case 90:
					case 180:
					case 270:
						// trivial cases: use labelWidth
						break;
					default:
						// rotated labels
						var gap1 = Math.sqrt(labelWidth * labelWidth + size * size),									// short labels
							gap2 = this.vertical ? size * cosr + labelWidth * sinr : labelWidth * cosr + size * sinr;	// slanted labels
						labelWidth = Math.min(gap1, gap2);
						break;
				}
			}

			this.scaler.minMinorStep = labelWidth + labelGap;
			this.ticks = lin.buildTicks(this.scaler, o);
			return this;	//	dojox.charting.axis2d.Default
		},
		getScaler: function(){
			//	summary:
			//		Get the pre-calculated scaler object.
			return this.scaler;	//	Object
		},
		getTicks: function(){
			//	summary:
			//		Get the pre-calculated ticks object.
			return this.ticks;	//	Object
		}
	});
});

},
'dojox/charting/action2d/MoveSlice':function(){
define("dojox/charting/action2d/MoveSlice", ["dojo/_base/connect", "dojo/_base/declare", "./PlotAction", "dojo/fx/easing", "dojox/gfx/matrix", 
	"dojox/gfx/fx", "dojox/lang/functional", "dojox/lang/functional/scan", "dojox/lang/functional/fold"], 
	function(hub, declare, PlotAction, dfe, m, gf, df, dfs, dff){

	/*=====
	dojo.declare("dojox.charting.action2d.__MoveSliceCtorArgs", dojox.charting.action2d.__PlotActionCtorArgs, {
		//	summary:
		//		Additional arguments for highlighting actions.
	
		//	scale: Number?
		//		The amount to scale the pie slice.  Default is 1.05.
		scale: 1.05,
	
		//	shift: Number?
		//		The amount in pixels to shift the pie slice.  Default is 7.
		shift: 7
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/
	
	var DEFAULT_SCALE = 1.05,
		DEFAULT_SHIFT = 7;	// px

	return declare("dojox.charting.action2d.MoveSlice", PlotAction, {
		//	summary:
		//		Create an action for a pie chart that moves and scales a pie slice.

		// the data description block for the widget parser
		defaultParams: {
			duration: 400,	// duration of the action in ms
			easing:   dfe.backOut,	// easing for the action
			scale:    DEFAULT_SCALE,	// scale of magnification
			shift:    DEFAULT_SHIFT		// shift of the slice
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the slice moving action and connect it to the plot.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot this action is attached to.  If not passed, "default" is assumed.
			//	kwArgs: dojox.charting.action2d.__MoveSliceCtorArgs?
			//		Optional keyword arguments object for setting parameters.
			if(!kwArgs){ kwArgs = {}; }
			this.scale = typeof kwArgs.scale == "number" ? kwArgs.scale : DEFAULT_SCALE;
			this.shift = typeof kwArgs.shift == "number" ? kwArgs.shift : DEFAULT_SHIFT;

			this.connect();
		},

		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the slice moving action.
			if(!o.shape || o.element != "slice" || !(o.type in this.overOutEvents)){ return; }

			if(!this.angles){
				// calculate the running total of slice angles
				var startAngle = m._degToRad(o.plot.opt.startAngle);
				if(typeof o.run.data[0] == "number"){
					this.angles = df.map(df.scanl(o.run.data, "+", startAngle),
						"* 2 * Math.PI / this", df.foldl(o.run.data, "+", 0));
				}else{
					this.angles = df.map(df.scanl(o.run.data, "a + b.y", startAngle),
						"* 2 * Math.PI / this", df.foldl(o.run.data, "a + b.y", 0));
				}
			}

			var index = o.index, anim, startScale, endScale, startOffset, endOffset,
				angle = (this.angles[index] + this.angles[index + 1]) / 2,
				rotateTo0  = m.rotateAt(-angle, o.cx, o.cy),
				rotateBack = m.rotateAt( angle, o.cx, o.cy);

			anim = this.anim[index];

			if(anim){
				anim.action.stop(true);
			}else{
				this.anim[index] = anim = {};
			}

			if(o.type == "onmouseover"){
				startOffset = 0;
				endOffset   = this.shift;
				startScale  = 1;
				endScale    = this.scale;
			}else{
				startOffset = this.shift;
				endOffset   = 0;
				startScale  = this.scale;
				endScale    = 1;
			}

			anim.action = gf.animateTransform({
				shape:    o.shape,
				duration: this.duration,
				easing:   this.easing,
				transform: [
					rotateBack,
					{name: "translate", start: [startOffset, 0], end: [endOffset, 0]},
					{name: "scaleAt",   start: [startScale, o.cx, o.cy],  end: [endScale, o.cx, o.cy]},
					rotateTo0
				]
			});

			if(o.type == "onmouseout"){
				hub.connect(anim.action, "onEnd", this, function(){
					delete this.anim[index];
				});
			}
			anim.action.play();
		},

		reset: function(){
			delete this.angles;
		}
	});
});

},
'dojox/gesture/tap':function(){
define("dojox/gesture/tap", [
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"./Base",
	"../main"
], function(kernel, declare, lang, Base, dojox){
// module:
//		dojox/gesture/tap
	
/*=====
	dojox.gesture.tap = {
		// summary:
		//		This module provides tap gesture event handlers:
		//
		//		1. dojox.gesture.tap: 'tap' event
		//
		//		2. dojox.gesture.tap.hold: 'tap.hold' event
		//
		//		3. dojox.gesture.tap.doubletap: 'tap.doubletap' event
		//
		// example:
		//		A. Used with dojo.connect()
		//		|	dojo.connect(node, dojox.gesture.tap, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.hold, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.doubletap, function(e){});
		//
		//		B. Used with dojo.on
		//		|	define(['dojo/on', 'dojox/gesture/tap'], function(on, tap){
		//		|		on(node, tap, function(e){});
		//		|		on(node, tap.hold, function(e){});
		//		|		on(node, tap.doubletap, function(e){});
		//
		//		C. Used with dojox.gesture.tap.* directly
		//		|	dojox.gesture.tap(node, function(e){});
		//		|	dojox.gesture.tap.hold(node, function(e){});
		//		|	dojox.gesture.tap.doubletap(node, function(e){});
		//
		//		Though there is always a default gesture instance after being required, e.g
		//		|	require(['dojox/gesture/tap'], function(){...});
		//
		//		It's possible to create a new one with different parameter setting:
		//		|	var myTap = new dojox.gesture.tap.Tap({holdThreshold: 300});
		//		|	dojo.connect(node, myTap, function(e){});
		//		|	dojo.connect(node, myTap.hold, function(e){});
		//		|	dojo.connect(node, myTap.doubletap, function(e){});
	};
=====*/

kernel.experimental("dojox.gesture.tap");

// Declare an internal anonymous class which will only be exported
// by module return value e.g. dojox.gesture.tap.Tap
var clz = declare(/*===== "dojox.gesture.tap", =====*/Base, {
	// defaultEvent: [readonly] String
	//		Default event - 'tap'
	defaultEvent: "tap",

	// subEvents: [readonly] Array
	//		List of sub events, used by being
	//		combined with defaultEvent as 'tap.hold', 'tap.doubletap'.
	subEvents: ["hold", "doubletap"],

	// holdThreshold: Integer
	//		Threshold(in milliseconds) for 'tap.hold'
	holdThreshold: 500,

	// holdThreshold: Integer
	//		Timeout (in milliseconds) for 'tap.doubletap'
	doubleTapTimeout: 250,

	// tapRadius: Integer
	//		Valid tap radius from previous touch point
	tapRadius: 10,

	press: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Overwritten, record initial tap info and register a timeout checker for 'tap.hold'
		if(e.touches && e.touches.length >= 2){
			//tap gesture is only for single touch
			clearTimeout(data.tapTimeOut); 
			delete data.context;
			return;
		}
		var target = e.target;
		this._initTap(data, e);
		data.tapTimeOut = setTimeout(lang.hitch(this, function(){
			if(this._isTap(data, e)){
				this.fire(target, {type: "tap.hold"});
			}
			delete data.context;
		}), this.holdThreshold);
	},
	release: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Overwritten, fire matched 'tap' or 'tap.doubletap' during touchend
		if(!data.context){
			clearTimeout(data.tapTimeOut);
			return;
		}
		if(this._isTap(data, e)){
			switch(data.context.c){
			case 1: 
				this.fire(e.target, {type: "tap"});
				break;
			case 2:
				this.fire(e.target, {type: "tap.doubletap"});
				break;
			}
		}
		clearTimeout(data.tapTimeOut);
	},
	_initTap: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Update the gesture data with new tap info 
		if(!data.context){
			data.context = {x: 0, y: 0, t: 0, c: 0};
		}
		var ct = new Date().getTime();
		if(ct - data.context.t <= this.doubleTapTimeout){
			data.context.c++;
		}else{
			data.context.c = 1;
			data.context.x = e.screenX;
			data.context.y = e.screenY;
		}
		data.context.t = ct;
	},
	_isTap: function(/*Object*/data, /*Event*/e){
		// summary:
		//		Check whether it's an valid tap
		var dx = Math.abs(data.context.x - e.screenX);
		var dy = Math.abs(data.context.y - e.screenY);
		return dx <= this.tapRadius && dy <= this.tapRadius;
	}
});

// the default tap instance for handy use
dojox.gesture.tap = new clz();
// Class for creating a new Tap instance
dojox.gesture.tap.Tap = clz;

return dojox.gesture.tap;

});
},
'dojox/charting/themes/PlotKit/cyan':function(){
define("dojox/charting/themes/PlotKit/cyan", ["./base", "../../Theme"], function(pk, Theme){
	pk.cyan = pk.base.clone();
	pk.cyan.chart.fill = pk.cyan.plotarea.fill = "#e6f1f5";
	pk.cyan.colors = Theme.defineColors({hue: 194, saturation: 60, low: 40, high: 88});
	
	return pk.cyan;
});

},
'dojox/charting/DataSeries':function(){
define("dojox/charting/DataSeries", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/_base/connect", "dojox/lang/functional"], 
	function(Lang, declare, ArrayUtil, Hub, df){

	return declare("dojox.charting.DataSeries", null, {
		constructor: function(store, kwArgs, value){
			//	summary:
			//		Series adapter for dojo.data stores.
			//	store: Object:
			//		A dojo.data store object.
			//	kwArgs: Object:
			//		A store-specific keyword parameters used for fetching items.
			//		See dojo.data.api.Read.fetch().
			//	value: Function|Object|String|Null:
			//		Function, which takes a store, and an object handle, and
			//		produces an output possibly inspecting the store's item. Or
			//		a dictionary object, which tells what names to extract from
			//		an object and how to map them to an output. Or a string, which
			//		is a numeric field name to use for plotting. If undefined, null
			//		or empty string (the default), "value" field is extracted.
			this.store = store;
			this.kwArgs = kwArgs;
	
			if(value){
				if(Lang.isFunction(value)){
					this.value = value;
				}else if(Lang.isObject(value)){
					this.value = Lang.hitch(this, "_dictValue",
						df.keys(value), value);
				}else{
					this.value = Lang.hitch(this, "_fieldValue", value);
				}
			}else{
				this.value = Lang.hitch(this, "_defaultValue");
			}
	
			this.data = [];
	
			this._events = [];
	
			if(this.store.getFeatures()["dojo.data.api.Notification"]){
				this._events.push(
					Hub.connect(this.store, "onNew", this, "_onStoreNew"),
					Hub.connect(this.store, "onDelete", this, "_onStoreDelete"),
					Hub.connect(this.store, "onSet", this, "_onStoreSet")
				);
			}
	
			this.fetch();
		},
	
		destroy: function(){
			//	summary:
			//		Clean up before GC.
			ArrayUtil.forEach(this._events, Hub.disconnect);
		},
	
		setSeriesObject: function(series){
			//	summary:
			//		Sets a dojox.charting.Series object we will be working with.
			//	series: dojox.charting.Series:
			//		Our interface to the chart.
			this.series = series;
		},
	
		// value transformers
	
		_dictValue: function(keys, dict, store, item){
			var o = {};
			ArrayUtil.forEach(keys, function(key){
				o[key] = store.getValue(item, dict[key]);
			});
			return o;
		},
	
		_fieldValue: function(field, store, item){
			return store.getValue(item, field);
		},
	
		_defaultValue: function(store, item){
			return store.getValue(item, "value");
		},
	
		// store fetch loop
	
		fetch: function(){
			//	summary:
			//		Fetches data from the store and updates a chart.
			if(!this._inFlight){
				this._inFlight = true;
				var kwArgs = Lang.delegate(this.kwArgs);
				kwArgs.onComplete = Lang.hitch(this, "_onFetchComplete");
				kwArgs.onError = Lang.hitch(this, "onFetchError");
				this.store.fetch(kwArgs);
			}
		},
	
		_onFetchComplete: function(items, request){
			this.items = items;
			this._buildItemMap();
			this.data = ArrayUtil.map(this.items, function(item){
				return this.value(this.store, item);
			}, this);
			this._pushDataChanges();
			this._inFlight = false;
		},
	
		onFetchError: function(errorData, request){
			//	summary:
			//		As stub to process fetch errors. Provide so user can attach to
			//		it with dojo.connect(). See dojo.data.api.Read fetch() for
			//		details: onError property.
			this._inFlight = false;
		},
	
		_buildItemMap: function(){
			if(this.store.getFeatures()["dojo.data.api.Identity"]){
				var itemMap = {};
				ArrayUtil.forEach(this.items, function(item, index){
					itemMap[this.store.getIdentity(item)] = index;
				}, this);
				this.itemMap = itemMap;
			}
		},
	
		_pushDataChanges: function(){
			if(this.series){
				this.series.chart.updateSeries(this.series.name, this);
				this.series.chart.delayedRender();
			}
		},
	
		// store notification handlers
	
		_onStoreNew: function(){
			// the only thing we can do is to re-fetch items
			this.fetch();
		},
	
		_onStoreDelete: function(item){
			// we cannot do anything with deleted item, the only way is to compare
			// items for equality
			if(this.items){
				var flag = ArrayUtil.some(this.items, function(it, index){
					if(it === item){
						this.items.splice(index, 1);
						this._buildItemMap();
						this.data.splice(index, 1);
						return true;
					}
					return false;
				}, this);
				if(flag){
					this._pushDataChanges();
				}
			}
		},
	
		_onStoreSet: function(item){
			if(this.itemMap){
				// we can use our handy item map, if the store supports Identity
				var id = this.store.getIdentity(item), index = this.itemMap[id];
				if(typeof index == "number"){
					this.data[index] = this.value(this.store, this.items[index]);
					this._pushDataChanges();
				}
			}else{
				// otherwise we have to rely on item's equality
				if(this.items){
					var flag = ArrayUtil.some(this.items, function(it, index){
						if(it === item){
							this.data[index] = this.value(this.store, it);
							return true;
						}
						return false;
					}, this);
					if(flag){
						this._pushDataChanges();
					}
				}
			}
		}
	});
});

},
'dojox/charting/action2d/Magnify':function(){
define("dojox/charting/action2d/Magnify", ["dojo/_base/connect", "dojo/_base/declare", 
	"./PlotAction", "dojox/gfx/matrix", 
	"dojox/gfx/fx", "dojo/fx", "dojo/fx/easing"], 
	function(Hub, declare, PlotAction, m, gf, df, dfe){

	/*=====
	dojo.declare("dojox.charting.action2d.__MagnifyCtorArgs", dojox.charting.action2d.__PlotActionCtorArgs, {
		//	summary:
		//		Additional arguments for highlighting actions.
	
		//	scale: Number?
		//		The amount to magnify the given object to.  Default is 2.
		scale: 2
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/
	
	var DEFAULT_SCALE = 2;

	return declare("dojox.charting.action2d.Magnify", PlotAction, {
		//	summary:
		//		Create an action that magnifies the object the action is applied to.

		// the data description block for the widget parser
		defaultParams: {
			duration: 400,	// duration of the action in ms
			easing:   dfe.backOut,	// easing for the action
			scale:    DEFAULT_SCALE	// scale of magnification
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the magnifying action.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot to apply the action to. If not passed, "default" is assumed.
			//	kwArgs: dojox.charting.action2d.__MagnifyCtorArgs?
			//		Optional keyword arguments for this action.

			// process optional named parameters
			this.scale = kwArgs && typeof kwArgs.scale == "number" ? kwArgs.scale : DEFAULT_SCALE;

			this.connect();
		},

		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the magnifying action.
			if(!o.shape || !(o.type in this.overOutEvents) ||
				!("cx" in o) || !("cy" in o)){ return; }

			var runName = o.run.name, index = o.index, vector = [], anim, init, scale;

			if(runName in this.anim){
				anim = this.anim[runName][index];
			}else{
				this.anim[runName] = {};
			}

			if(anim){
				anim.action.stop(true);
			}else{
				this.anim[runName][index] = anim = {};
			}

			if(o.type == "onmouseover"){
				init  = m.identity;
				scale = this.scale;
			}else{
				init  = m.scaleAt(this.scale, o.cx, o.cy);
				scale = 1 / this.scale;
			}

			var kwArgs = {
				shape:    o.shape,
				duration: this.duration,
				easing:   this.easing,
				transform: [
					{name: "scaleAt", start: [1, o.cx, o.cy], end: [scale, o.cx, o.cy]},
					init
				]
			};
			if(o.shape){
				vector.push(gf.animateTransform(kwArgs));
			}
			if(o.oultine){
				kwArgs.shape = o.outline;
				vector.push(gf.animateTransform(kwArgs));
			}
			if(o.shadow){
				kwArgs.shape = o.shadow;
				vector.push(gf.animateTransform(kwArgs));
			}

			if(!vector.length){
				delete this.anim[runName][index];
				return;
			}

			anim.action = df.combine(vector);
			if(o.type == "onmouseout"){
				Hub.connect(anim.action, "onEnd", this, function(){
					if(this.anim[runName]){
						delete this.anim[runName][index];
					}
				});
			}
			anim.action.play();
		}
	});
	
});

},
'dojox/charting/themes/Claro':function(){
define("dojox/charting/themes/Claro", ["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){
	// created by Tom Trenka

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 100};
	
	themes.Claro = new Theme({
		chart: {
			fill:	   {
				type: "linear",
				x1: 0, x2: 0, y1: 0, y2: 100,
				colors: [
					{ offset: 0, color: "#dbdbdb" },
					{ offset: 1, color: "#efefef" }
				]
			},
			stroke:    {color: "#b5bcc7"}
		},
		plotarea: {
			fill:	   {
				type: "linear",
				x1: 0, x2: 0, y1: 0, y2: 100,
				colors: [
					{ offset: 0, color: "#dbdbdb" },
					{ offset: 1, color: "#efefef" }
				]
			}
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#888c76",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#888c76",
				position:  "center",
				font:      "normal normal normal 7pt Verdana, Arial, sans-serif",	// labels on axis
				fontColor: "#888c76"								// color of labels
			}
		},
		series: {
			stroke:  {width: 2.5, color: "#fff"},
			outline: null,
			font: "normal normal normal 7pt Verdana, Arial, sans-serif",
			fontColor: "#131313"
		},
		marker: {
			stroke:  {width: 1.25, color: "#131313"},
			outline: {width: 1.25, color: "#131313"},
			font: "normal normal normal 8pt Verdana, Arial, sans-serif",
			fontColor: "#131313"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#2a6ead", "#3a99f2")},
			{fill: g(defaultFill, "#613e04", "#996106")},
			{fill: g(defaultFill, "#0e3961", "#155896")},
			{fill: g(defaultFill, "#55aafa", "#3f7fba")},
			{fill: g(defaultFill, "#ad7b2a", "#db9b35")}
		],
		markerThemes: [
			{fill: "#2a6ead", stroke: {color: "#fff"}},
			{fill: "#613e04", stroke: {color: "#fff"}},
			{fill: "#0e3961", stroke: {color: "#fff"}},
			{fill: "#55aafa", stroke: {color: "#fff"}},
			{fill: "#ad7b2a", stroke: {color: "#fff"}}
		]
	});
	
	themes.Claro.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length],
				m = this.markerThemes[this._current % this.markerThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = { width: 4, color: s.fill.colors[0].color};
			}
			m.outline = { width: 1.25, color: m.fill };
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.outline;
			delete s.stroke;
			s.fill.space = "shape";
			return theme;
		}
		else if(elementType == "candlestick"){
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			s.stroke  = { width: 1, color: s.fill.colors[0].color};
			var theme = Theme.prototype.next.apply(this, arguments);
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Claro.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Claro;
});

},
'dojox/charting/widget/Legend':function(){
define("dojox/charting/widget/Legend", ["dojo/_base/lang", "dojo/_base/html", "dojo/_base/declare", "dijit/_Widget", "dojox/gfx","dojo/_base/array", 
		"dojox/lang/functional", "dojox/lang/functional/array", "dojox/lang/functional/fold",
		"dojo/dom", "dojo/dom-construct", "dojo/dom-class","dijit/_base/manager"], 
		function(lang, html, declare, Widget, gfx, arrayUtil, df, dfa, dff, 
				dom, domFactory, domClass, widgetManager){
/*=====
var Widget = dijit._Widget;
=====*/

	var REVERSED_SERIES = /\.(StackedColumns|StackedAreas|ClusteredBars)$/;

	return declare("dojox.charting.widget.Legend", Widget, {
		// summary: A legend for a chart. A legend contains summary labels for
		// each series of data contained in the chart.
		//
		// Set the horizontal attribute to boolean false to layout legend labels vertically.
		// Set the horizontal attribute to a number to layout legend labels in horizontal
		// rows each containing that number of labels (except possibly the last row).
		//
		// (Line or Scatter charts (colored lines with shape symbols) )
		// -o- Series1		-X- Series2		-v- Series3
		//
		// (Area/Bar/Pie charts (letters represent colors))
		// [a] Series1		[b] Series2		[c] Series3

		chartRef:   "",
		horizontal: true,
		swatchSize: 18,

		legendBody: null,

		postCreate: function(){
			if(!this.chart){
				if(!this.chartRef){ return; }
				this.chart = widgetManager.byId(this.chartRef);
				if(!this.chart){
					var node = dom.byId(this.chartRef);
					if(node){
						this.chart = widgetManager.byNode(node);
					}else{
						console.log("Could not find chart instance with id: " + this.chartRef);
						return;
					}
				}
				this.series = this.chart.chart.series;
			}else{
				this.series = this.chart.series;
			}

			this.refresh();
		},
		buildRendering: function(){
			this.domNode = domFactory.create("table",
					{role: "group", "aria-label": "chart legend", "class": "dojoxLegendNode"});
			this.legendBody = domFactory.create("tbody", null, this.domNode);
			this.inherited(arguments);
		},
		destroy: function(){
			if(this._surfaces){
				arrayUtil.forEach(this._surfaces, function(surface){
					surface.destroy();
				});
			}
			this.inherited(arguments);
		},
		refresh: function(){
			// summary: regenerates the legend to reflect changes to the chart

			// cleanup
			if(this._surfaces){
				arrayUtil.forEach(this._surfaces, function(surface){
					surface.destroy();
				});
			}
			this._surfaces = [];
			while(this.legendBody.lastChild){
				domFactory.destroy(this.legendBody.lastChild);
			}

			if(this.horizontal){
				domClass.add(this.domNode, "dojoxLegendHorizontal");
				// make a container <tr>
				this._tr = domFactory.create("tr", null, this.legendBody);
				this._inrow = 0;
			}

			var s = this.series;
			if(s.length == 0){
				return;
			}
			if(s[0].chart.stack[0].declaredClass == "dojox.charting.plot2d.Pie"){
				var t = s[0].chart.stack[0];
				if(typeof t.run.data[0] == "number"){
					var filteredRun = df.map(t.run.data, "Math.max(x, 0)");
					if(df.every(filteredRun, "<= 0")){
						return;
					}
					var slices = df.map(filteredRun, "/this", df.foldl(filteredRun, "+", 0));
					arrayUtil.forEach(slices, function(x, i){
						this._addLabel(t.dyn[i], t._getLabel(x * 100) + "%");
					}, this);
				}else{
					arrayUtil.forEach(t.run.data, function(x, i){
						this._addLabel(t.dyn[i], x.legend || x.text || x.y);
					}, this);
				}
			}else{
				if(this._isReversal()){
					s = s.slice(0).reverse();
				}
				arrayUtil.forEach(s, function(x){
					this._addLabel(x.dyn, x.legend || x.name);
				}, this);
			}
		},
		_addLabel: function(dyn, label){
			// create necessary elements
			var wrapper = domFactory.create("td"),
				icon = domFactory.create("div", null, wrapper),
				text = domFactory.create("label", null, wrapper),
				div  = domFactory.create("div", {
					style: {
						"width": this.swatchSize + "px",
						"height":this.swatchSize + "px",
						"float": "left"
					}
				}, icon);
			domClass.add(icon, "dojoxLegendIcon dijitInline");
			domClass.add(text, "dojoxLegendText");
			// create a skeleton
			if(this._tr){
				// horizontal
				this._tr.appendChild(wrapper);
				if(++this._inrow === this.horizontal){
					// make a fresh container <tr>
					this._tr = domFactory.create("tr", null, this.legendBody);
					this._inrow = 0;
				}
			}else{
				// vertical
				var tr = domFactory.create("tr", null, this.legendBody);
				tr.appendChild(wrapper);
			}

			// populate the skeleton
			this._makeIcon(div, dyn);
			text.innerHTML = String(label);
			text.dir = this.getTextDir(label, text.dir);
		},
		_makeIcon: function(div, dyn){
			var mb = { h: this.swatchSize, w: this.swatchSize };
			var surface = gfx.createSurface(div, mb.w, mb.h);
			this._surfaces.push(surface);
			if(dyn.fill){
				// regions
				surface.createRect({x: 2, y: 2, width: mb.w - 4, height: mb.h - 4}).
					setFill(dyn.fill).setStroke(dyn.stroke);
			}else if(dyn.stroke || dyn.marker){
				// draw line
				var line = {x1: 0, y1: mb.h / 2, x2: mb.w, y2: mb.h / 2};
				if(dyn.stroke){
					surface.createLine(line).setStroke(dyn.stroke);
				}
				if(dyn.marker){
					// draw marker on top
					var c = {x: mb.w / 2, y: mb.h / 2};
					if(dyn.stroke){
						surface.createPath({path: "M" + c.x + " " + c.y + " " + dyn.marker}).
							setFill(dyn.stroke.color).setStroke(dyn.stroke);
					}else{
						surface.createPath({path: "M" + c.x + " " + c.y + " " + dyn.marker}).
							setFill(dyn.color).setStroke(dyn.color);
					}
				}
			}else{
				// nothing
				surface.createRect({x: 2, y: 2, width: mb.w - 4, height: mb.h - 4}).
					setStroke("black");
				surface.createLine({x1: 2, y1: 2, x2: mb.w - 2, y2: mb.h - 2}).setStroke("black");
				surface.createLine({x1: 2, y1: mb.h - 2, x2: mb.w - 2, y2: 2}).setStroke("black");
			}
		},
		_isReversal: function(){
			return (!this.horizontal) && arrayUtil.some(this.chart.stack, function(item){
				return REVERSED_SERIES.test(item.declaredClass);
			});
		}
	});
});

},
'dojox/charting/plot2d/common':function(){
define("dojox/charting/plot2d/common", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/Color", 
		"dojox/gfx", "dojox/lang/functional", "../scaler/common"], 
	function(lang, arr, Color, g, df, sc){
	
	var common = lang.getObject("dojox.charting.plot2d.common", true);
	
	return lang.mixin(common, {	
		doIfLoaded: sc.doIfLoaded,
		makeStroke: function(stroke){
			if(!stroke){ return stroke; }
			if(typeof stroke == "string" || stroke instanceof Color){
				stroke = {color: stroke};
			}
			return g.makeParameters(g.defaultStroke, stroke);
		},
		augmentColor: function(target, color){
			var t = new Color(target),
				c = new Color(color);
			c.a = t.a;
			return c;
		},
		augmentStroke: function(stroke, color){
			var s = common.makeStroke(stroke);
			if(s){
				s.color = common.augmentColor(s.color, color);
			}
			return s;
		},
		augmentFill: function(fill, color){
			var fc, c = new Color(color);
			if(typeof fill == "string" || fill instanceof Color){
				return common.augmentColor(fill, color);
			}
			return fill;
		},

		defaultStats: {
			vmin: Number.POSITIVE_INFINITY, vmax: Number.NEGATIVE_INFINITY,
			hmin: Number.POSITIVE_INFINITY, hmax: Number.NEGATIVE_INFINITY
		},

		collectSimpleStats: function(series){
			var stats = lang.delegate(common.defaultStats);
			for(var i = 0; i < series.length; ++i){
				var run = series[i];
				for(var j = 0; j < run.data.length; j++){
					if(run.data[j] !== null){
						if(typeof run.data[j] == "number"){
							// 1D case
							var old_vmin = stats.vmin, old_vmax = stats.vmax;
							if(!("ymin" in run) || !("ymax" in run)){
								arr.forEach(run.data, function(val, i){
									if(val !== null){
										var x = i + 1, y = val;
										if(isNaN(y)){ y = 0; }
										stats.hmin = Math.min(stats.hmin, x);
										stats.hmax = Math.max(stats.hmax, x);
										stats.vmin = Math.min(stats.vmin, y);
										stats.vmax = Math.max(stats.vmax, y);
									}
								});
							}
							if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
							if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
						}else{
							// 2D case
							var old_hmin = stats.hmin, old_hmax = stats.hmax,
								old_vmin = stats.vmin, old_vmax = stats.vmax;
							if(!("xmin" in run) || !("xmax" in run) || !("ymin" in run) || !("ymax" in run)){
								arr.forEach(run.data, function(val, i){
									if(val !== null){
										var x = "x" in val ? val.x : i + 1, y = val.y;
										if(isNaN(x)){ x = 0; }
										if(isNaN(y)){ y = 0; }
										stats.hmin = Math.min(stats.hmin, x);
										stats.hmax = Math.max(stats.hmax, x);
										stats.vmin = Math.min(stats.vmin, y);
										stats.vmax = Math.max(stats.vmax, y);
									}
								});
							}
							if("xmin" in run){ stats.hmin = Math.min(old_hmin, run.xmin); }
							if("xmax" in run){ stats.hmax = Math.max(old_hmax, run.xmax); }
							if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
							if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
						}

						break;
					}
				}
			}
			return stats;
		},

		calculateBarSize: function(/* Number */ availableSize, /* Object */ opt, /* Number? */ clusterSize){
			if(!clusterSize){
				clusterSize = 1;
			}
			var gap = opt.gap, size = (availableSize - 2 * gap) / clusterSize;
			if("minBarSize" in opt){
				size = Math.max(size, opt.minBarSize);
			}
			if("maxBarSize" in opt){
				size = Math.min(size, opt.maxBarSize);
			}
			size = Math.max(size, 1);
			gap = (availableSize - size * clusterSize) / 2;
			return {size: size, gap: gap};	// Object
		},

		collectStackedStats: function(series){
			// collect statistics
			var stats = lang.clone(common.defaultStats);
			if(series.length){
				// 1st pass: find the maximal length of runs
				stats.hmin = Math.min(stats.hmin, 1);
				stats.hmax = df.foldl(series, "seed, run -> Math.max(seed, run.data.length)", stats.hmax);
				// 2nd pass: stack values
				for(var i = 0; i < stats.hmax; ++i){
					var v = series[0].data[i];
                    v = v && (typeof v == "number" ? v : v.y);
					if(isNaN(v)){ v = 0; }
					stats.vmin = Math.min(stats.vmin, v);
					for(var j = 1; j < series.length; ++j){
						var t = series[j].data[i];
                        t = t && (typeof t == "number" ? t : t.y);
						if(isNaN(t)){ t = 0; }
						v += t;
					}
					stats.vmax = Math.max(stats.vmax, v);
				}
			}
			return stats;
		},

		curve: function(/* Number[] */a, /* Number|String */tension){
			//	FIX for #7235, submitted by Enzo Michelangeli.
			//	Emulates the smoothing algorithms used in a famous, unnamed spreadsheet
			//		program ;)
			var array = a.slice(0);
			if(tension == "x") {
				array[array.length] = arr[0];   // add a last element equal to the first, closing the loop
			}
			var p=arr.map(array, function(item, i){
				if(i==0){ return "M" + item.x + "," + item.y; }
				if(!isNaN(tension)) { // use standard Dojo smoothing in tension is numeric
					var dx=item.x-array[i-1].x, dy=array[i-1].y;
					return "C"+(item.x-(tension-1)*(dx/tension))+","+dy+" "+(item.x-(dx/tension))+","+item.y+" "+item.x+","+item.y;
				} else if(tension == "X" || tension == "x" || tension == "S") {
					// use Excel "line smoothing" algorithm (http://xlrotor.com/resources/files.shtml)
					var p0, p1 = array[i-1], p2 = array[i], p3;
					var bz1x, bz1y, bz2x, bz2y;
					var f = 1/6;
					if(i==1) {
						if(tension == "x") {
							p0 = array[array.length-2];
						} else { // "tension == X || tension == "S"
							p0 = p1;
						}
						f = 1/3;
					} else {
						p0 = array[i-2];
					}
					if(i==(array.length-1)) {
						if(tension == "x") {
							p3 = array[1];
						} else { // "tension == X || tension == "S"
							p3 = p2;
						}
						f = 1/3;
					} else {
						p3 = array[i+1];
					}
					var p1p2 = Math.sqrt((p2.x-p1.x)*(p2.x-p1.x)+(p2.y-p1.y)*(p2.y-p1.y));
					var p0p2 = Math.sqrt((p2.x-p0.x)*(p2.x-p0.x)+(p2.y-p0.y)*(p2.y-p0.y));
					var p1p3 = Math.sqrt((p3.x-p1.x)*(p3.x-p1.x)+(p3.y-p1.y)*(p3.y-p1.y));

					var p0p2f = p0p2 * f;
					var p1p3f = p1p3 * f;

					if(p0p2f > p1p2/2 && p1p3f > p1p2/2) {
						p0p2f = p1p2/2;
						p1p3f = p1p2/2;
					} else if(p0p2f > p1p2/2) {
						p0p2f = p1p2/2;
						p1p3f = p1p2/2 * p1p3/p0p2;
					} else if(p1p3f > p1p2/2) {
						p1p3f = p1p2/2;
						p0p2f = p1p2/2 * p0p2/p1p3;
					}

					if(tension == "S") {
						if(p0 == p1) { p0p2f = 0; }
						if(p2 == p3) { p1p3f = 0; }
					}

					bz1x = p1.x + p0p2f*(p2.x - p0.x)/p0p2;
					bz1y = p1.y + p0p2f*(p2.y - p0.y)/p0p2;
					bz2x = p2.x - p1p3f*(p3.x - p1.x)/p1p3;
					bz2y = p2.y - p1p3f*(p3.y - p1.y)/p1p3;
				}
				return "C"+(bz1x+","+bz1y+" "+bz2x+","+bz2y+" "+p2.x+","+p2.y);
			});
			return p.join(" ");
		},
		
		getLabel: function(/*Number*/number, /*Boolean*/fixed, /*Number*/precision){
			return sc.doIfLoaded("dojo/number", function(numberLib){
				return (fixed ? numberLib.format(number, {places : precision}) :
					numberLib.format(number)) || "";
			}, function(){
				return fixed ? number.toFixed(precision) : number.toString();
			});
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
'dojox/charting/themes/Renkoo':function(){
define("dojox/charting/themes/Renkoo", ["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	// created by Tom Trenka

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 150};
	
	themes.Renkoo = new Theme({
		chart: {
			fill:      "#123666",
			pageStyle: {backgroundColor: "#123666", backgroundImage: "none", color: "#95afdb"}
		},
		plotarea: {
			fill: "#123666"
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#95afdb",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#95afdb",
				position:  "center",
				font:      "normal normal normal 7pt Lucida Grande, Helvetica, Arial, sans-serif",	// labels on axis
				fontColor: "#95afdb"	// color of labels
			}
		},
		series: {
			stroke:  {width: 2.5, color: "#123666"},
			outline: null,
			font:      "normal normal normal 8pt Lucida Grande, Helvetica, Arial, sans-serif",	// labels on axis
			fontColor: "#95afdb"
		},
		marker: {
			stroke:  {width: 2.5, color: "#ccc"},
			outline: null,
			font:      "normal normal normal 8pt Lucida Grande, Helvetica, Arial, sans-serif",	// labels on axis
			fontColor: "#95afdb"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#e7e391", "#f8f7de")},
			{fill: g(defaultFill, "#ffb6b6", "#ffe8e8")},
			{fill: g(defaultFill, "#bcda7d", "#eef7da")},
			{fill: g(defaultFill, "#d5d5d5", "#f4f4f4")},
			{fill: g(defaultFill, "#c1e3fd", "#e4f3ff")}
		],
		markerThemes: [
			{fill: "#fcfcf3", stroke: {color: "#e7e391"}},
			{fill: "#fff1f1", stroke: {color: "#ffb6b6"}},
			{fill: "#fafdf4", stroke: {color: "#bcda7d"}},
			{fill: "#fbfbfb", stroke: {color: "#d5d5d5"}},
			{fill: "#f3faff", stroke: {color: "#c1e3fd"}}
		]
	});
	
	themes.Renkoo.next = function(elementType, mixin, doPost){
		if("slice,column,bar".indexOf(elementType) == -1){
			// custom processing to substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			s.stroke  = { width: 2, color: s.fill.colors[0].color};
			if(elementType == "line" || elementType == "area"){
				s.stroke.width = 4;
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.stroke;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Renkoo.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Renkoo;
});

},
'dojox/charting/themes/Electric':function(){
define("dojox/charting/themes/Electric", ["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 75};
	
	themes.Electric = new Theme({
		chart: {
			fill:      "#252525",
			stroke:    {color: "#252525"},
			pageStyle: {backgroundColor: "#252525", backgroundImage: "none", color: "#ccc"}
		},
		plotarea: {
			fill: "#252525"
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#aaa",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#777",
				position:  "center",
				font:      "normal normal normal 7pt Helvetica, Arial, sans-serif",	// labels on axis
				fontColor: "#777"								// color of labels
			}
		},
		series: {
			stroke:  {width: 2, color: "#ccc"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#ccc"
		},
		marker: {
			stroke:  {width: 3, color: "#ccc"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#ccc"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#004cbf", "#06f")},
			{fill: g(defaultFill, "#bf004c", "#f06")},
			{fill: g(defaultFill, "#43bf00", "#6f0")},
			{fill: g(defaultFill, "#7300bf", "#90f")},
			{fill: g(defaultFill, "#bf7300", "#f90")},
			{fill: g(defaultFill, "#00bf73", "#0f9")}
		],
		markerThemes: [
			{fill: "#06f", stroke: {color: "#06f"}},
			{fill: "#f06", stroke: {color: "#f06"}},
			{fill: "#6f0", stroke: {color: "#6f0"}},
			{fill: "#90f", stroke: {color: "#90f"}},
			{fill: "#f90", stroke: {color: "#f90"}},
			{fill: "#0f9", stroke: {color: "#0f9"}}
		]
	});
	
	themes.Electric.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = { width: 2.5, color: s.fill.colors[1].color};
			}
			if(elementType == "area"){
				s.fill.y2 = 90;
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.stroke;
			s.fill.y2 = 75;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Electric.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Electric;
});

},
'dojox/gfx3d/gradient':function(){
define("dojox/gfx3d/gradient", ["dojo/_base/lang","./matrix","./vector"], 
	function(lang,m,v){

	var gfx3d = lang.getObject("dojox.gfx3d",true);

	var dist = function(a, b){ return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)); };
	var N = 32;

	gfx3d.gradient = function(model, material, center, radius, from, to, matrix){
		// summary: calculate a cylindrical gradient
		// model: dojox.gfx3d.lighting.Model: color model
		// material: Object: defines visual properties
		// center: Object: center of the cylinder's bottom
		// radius: Number: radius of the cylinder
		// from: Number: from position in radians
		// to: Number: from position in radians
		// matrix: dojox.gfx3d.Matrix3D: the cumulative transformation matrix
		// tolerance: Number: tolerable difference in colors between gradient steps

		var mx = m.normalize(matrix),
			f = m.multiplyPoint(mx, radius * Math.cos(from) + center.x, radius * Math.sin(from) + center.y, center.z),
			t = m.multiplyPoint(mx, radius * Math.cos(to)   + center.x, radius * Math.sin(to)   + center.y, center.z),
			c = m.multiplyPoint(mx, center.x, center.y, center.z), step = (to - from) / N, r = dist(f, t) / 2,
			mod = model[material.type], fin = material.finish, pmt = material.color,
			colors = [{offset: 0, color: mod.call(model, v.substract(f, c), fin, pmt)}];

		for(var a = from + step; a < to; a += step){
			var p = m.multiplyPoint(mx, radius * Math.cos(a) + center.x, radius * Math.sin(a) + center.y, center.z),
				df = dist(f, p), dt = dist(t, p);
			colors.push({offset: df / (df + dt), color: mod.call(model, v.substract(p, c), fin, pmt)});
		}
		colors.push({offset: 1, color: mod.call(model, v.substract(t, c), fin, pmt)});

		return {type: "linear", x1: 0, y1: -r, x2: 0, y2: r, colors: colors};
	};

	return gfx3d.gradient;
});
},
'dojox/gfx/shape':function(){
define("dojox/gfx/shape", ["./_base", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/window", "dojo/_base/sniff",
	"dojo/_base/connect", "dojo/_base/array", "dojo/dom-construct", "dojo/_base/Color", "./matrix"], 
  function(g, lang, declare, win, has, events, arr, domConstruct, Color, matrixLib){

/*===== 
	dojox.gfx.shape = {
		// summary:
		//		This module contains the core graphics Shape API.
		//		Different graphics renderer implementation modules (svg, canvas, vml, silverlight, etc.) extend this 
		//		basic api to provide renderer-specific implementations for each shape.
	};
  =====*/

	var shape = g.shape = {};
	// a set of ids (keys=type)
	var _ids = {};
	// a simple set impl to map shape<->id
	var registry = {};
	var disposeCount = 0, fixIELeak = has("ie") < 9;

	function repack(oldRegistry){
		var newRegistry = {};
		for(var key in oldRegistry){
			if(oldRegistry.hasOwnProperty(key)){
				newRegistry[key] = oldRegistry[key]
			}
		}
		return newRegistry;
	}

	shape.register = function(/*dojox.gfx.shape.Shape*/shape){
		// summary: 
		//		Register the specified shape into the graphics registry.
		// shape: dojox.gfx.shape.Shape
		//		The shape to register.
		// returns:
		//		The unique id associated with this shape.
		// the id pattern : type+number (ex: Rect0,Rect1,etc)
		var t = shape.declaredClass.split('.').pop();
		var i = t in _ids ? ++_ids[t] : ((_ids[t] = 0));
		var uid = t+i;
		registry[uid] = shape;
		return uid;
	};
	
	shape.byId = function(/*String*/id){
		// summary: 
		//		Returns the shape that matches the specified id.
		// id: String
		//		The unique identifier for this Shape.
		return registry[id]; //dojox.gfx.shape.Shape
	};
	
	shape.dispose = function(/*dojox.gfx.shape.Shape*/shape){
		// summary: 
		//		Removes the specified shape from the registry.
		// shape: dojox.gfx.shape.Shape
		//		The shape to unregister.
		delete registry[shape.getUID()];
		++disposeCount;
		if(fixIELeak && disposeCount>10000){
			registry = repack(registry);
			disposeCount = 0;
		}
	};
	
	declare("dojox.gfx.shape.Shape", null, {
		// summary: a Shape object, which knows how to apply
		// graphical attributes and transformations
	
		constructor: function(){
			//	rawNode: Node
			//		underlying graphics-renderer-specific implementation object (if applicable)
			this.rawNode = null;
			//	shape: Object: an abstract shape object
			//	(see dojox.gfx.defaultPath,
			//	dojox.gfx.defaultPolyline,
			//	dojox.gfx.defaultRect,
			//	dojox.gfx.defaultEllipse,
			//	dojox.gfx.defaultCircle,
			//	dojox.gfx.defaultLine,
			//	or dojox.gfx.defaultImage)
			this.shape = null;
	
			//	matrix: dojox.gfx.Matrix2D
			//		a transformation matrix
			this.matrix = null;
	
			//	fillStyle: Object
			//		a fill object
			//		(see dojox.gfx.defaultLinearGradient,
			//		dojox.gfx.defaultRadialGradient,
			//		dojox.gfx.defaultPattern,
			//		or dojo.Color)
			this.fillStyle = null;
	
			//	strokeStyle: Object
			//		a stroke object
			//		(see dojox.gfx.defaultStroke)
			this.strokeStyle = null;
	
			// bbox: dojox.gfx.Rectangle
			//		a bounding box of this shape
			//		(see dojox.gfx.defaultRect)
			this.bbox = null;
	
			// virtual group structure
	
			// parent: Object
			//		a parent or null
			//		(see dojox.gfx.Surface,
			//		dojox.gfx.shape.VirtualGroup,
			//		or dojox.gfx.Group)
			this.parent = null;
	
			// parentMatrix: dojox.gfx.Matrix2D
			//	a transformation matrix inherited from the parent
			this.parentMatrix = null;
			
			var uid = shape.register(this);
			this.getUID = function(){
				return uid;
			}
		},	
	
		// trivial getters
	
		getNode: function(){
			// summary: Different graphics rendering subsystems implement shapes in different ways.  This
			//	method provides access to the underlying graphics subsystem object.  Clients calling this
			//	method and using the return value must be careful not to try sharing or using the underlying node
			//	in a general way across renderer implementation.
			//	Returns the underlying graphics Node, or null if no underlying graphics node is used by this shape.
			return this.rawNode; // Node
		},
		getShape: function(){
			// summary: returns the current Shape object or null
			//	(see dojox.gfx.defaultPath,
			//	dojox.gfx.defaultPolyline,
			//	dojox.gfx.defaultRect,
			//	dojox.gfx.defaultEllipse,
			//	dojox.gfx.defaultCircle,
			//	dojox.gfx.defaultLine,
			//	or dojox.gfx.defaultImage)
			return this.shape; // Object
		},
		getTransform: function(){
			// summary: Returns the current transformation matrix applied to this Shape or null
			return this.matrix;	// dojox.gfx.Matrix2D
		},
		getFill: function(){
			// summary: Returns the current fill object or null
			//	(see dojox.gfx.defaultLinearGradient,
			//	dojox.gfx.defaultRadialGradient,
			//	dojox.gfx.defaultPattern,
			//	or dojo.Color)
			return this.fillStyle;	// Object
		},
		getStroke: function(){
			// summary: Returns the current stroke object or null
			//	(see dojox.gfx.defaultStroke)
			return this.strokeStyle;	// Object
		},
		getParent: function(){
			// summary: Returns the parent Shape, Group or VirtualGroup or null if this Shape is unparented.
			//	(see dojox.gfx.Surface,
			//	dojox.gfx.shape.VirtualGroup,
			//	or dojox.gfx.Group)
			return this.parent;	// Object
		},
		getBoundingBox: function(){
			// summary: Returns the bounding box Rectanagle for this shape or null if a BoundingBox cannot be
			//	calculated for the shape on the current renderer or for shapes with no geometric area (points).
			//	A bounding box is a rectangular geometric region
			//	defining the X and Y extent of the shape.
			//	(see dojox.gfx.defaultRect)
			return this.bbox;	// dojox.gfx.Rectangle
		},
		getTransformedBoundingBox: function(){
			// summary: returns an array of four points or null
			//	four points represent four corners of the untransformed bounding box
			var b = this.getBoundingBox();
			if(!b){
				return null;	// null
			}
			var m = this._getRealMatrix(),
				gm = matrixLib;
			return [	// Array
					gm.multiplyPoint(m, b.x, b.y),
					gm.multiplyPoint(m, b.x + b.width, b.y),
					gm.multiplyPoint(m, b.x + b.width, b.y + b.height),
					gm.multiplyPoint(m, b.x, b.y + b.height)
				];
		},
		getEventSource: function(){
			// summary: returns a Node, which is used as
			//	a source of events for this shape
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			return this.rawNode;	// Node
		},
	
		// empty settings
	
		setShape: function(shape){
			// summary: sets a shape object
			//	(the default implementation simply ignores it)
			// shape: Object
			//	a shape object
			//	(see dojox.gfx.defaultPath,
			//	dojox.gfx.defaultPolyline,
			//	dojox.gfx.defaultRect,
			//	dojox.gfx.defaultEllipse,
			//	dojox.gfx.defaultCircle,
			//	dojox.gfx.defaultLine,
			//	or dojox.gfx.defaultImage)
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			this.shape = g.makeParameters(this.shape, shape);
			this.bbox = null;
			return this;	// self
		},
		setFill: function(fill){
			// summary: sets a fill object
			//	(the default implementation simply ignores it)
			// fill: Object
			//	a fill object
			//	(see dojox.gfx.defaultLinearGradient,
			//	dojox.gfx.defaultRadialGradient,
			//	dojox.gfx.defaultPattern,
			//	or dojo.Color)
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			if(!fill){
				// don't fill
				this.fillStyle = null;
				return this;	// self
			}
			var f = null;
			if(typeof(fill) == "object" && "type" in fill){
				// gradient or pattern
				switch(fill.type){
					case "linear":
						f = g.makeParameters(g.defaultLinearGradient, fill);
						break;
					case "radial":
						f = g.makeParameters(g.defaultRadialGradient, fill);
						break;
					case "pattern":
						f = g.makeParameters(g.defaultPattern, fill);
						break;
				}
			}else{
				// color object
				f = g.normalizeColor(fill);
			}
			this.fillStyle = f;
			return this;	// self
		},
		setStroke: function(stroke){
			// summary: sets a stroke object
			//	(the default implementation simply ignores it)
			// stroke: Object
			//	a stroke object
			//	(see dojox.gfx.defaultStroke)
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			if(!stroke){
				// don't stroke
				this.strokeStyle = null;
				return this;	// self
			}
			// normalize the stroke
			if(typeof stroke == "string" || lang.isArray(stroke) || stroke instanceof Color){
				stroke = {color: stroke};
			}
			var s = this.strokeStyle = g.makeParameters(g.defaultStroke, stroke);
			s.color = g.normalizeColor(s.color);
			return this;	// self
		},
		setTransform: function(matrix){
			// summary: sets a transformation matrix
			// matrix: dojox.gfx.Matrix2D
			//	a matrix or a matrix-like object
			//	(see an argument of dojox.gfx.Matrix2D
			//	constructor for a list of acceptable arguments)
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			this.matrix = matrixLib.clone(matrix ? matrixLib.normalize(matrix) : matrixLib.identity);
			return this._applyTransform();	// self
		},
	
		_applyTransform: function(){
			// summary: physically sets a matrix
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			return this;	// self
		},
	
		// z-index
	
		moveToFront: function(){
			// summary: moves a shape to front of its parent's list of shapes
			var p = this.getParent();
			if(p){
				p._moveChildToFront(this);
				this._moveToFront();	// execute renderer-specific action
			}
			return this;	// self
		},
		moveToBack: function(){
			// summary: moves a shape to back of its parent's list of shapes
			var p = this.getParent();
			if(p){
				p._moveChildToBack(this);
				this._moveToBack();	// execute renderer-specific action
			}
			return this;
		},
		_moveToFront: function(){
			// summary: renderer-specific hook, see dojox.gfx.shape.Shape.moveToFront()
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
		},
		_moveToBack: function(){
			// summary: renderer-specific hook, see dojox.gfx.shape.Shape.moveToFront()
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
		},
	
		// apply left & right transformation
	
		applyRightTransform: function(matrix){
			// summary: multiplies the existing matrix with an argument on right side
			//	(this.matrix * matrix)
			// matrix: dojox.gfx.Matrix2D
			//	a matrix or a matrix-like object
			//	(see an argument of dojox.gfx.Matrix2D
			//	constructor for a list of acceptable arguments)
			return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
		},
		applyLeftTransform: function(matrix){
			// summary: multiplies the existing matrix with an argument on left side
			//	(matrix * this.matrix)
			// matrix: dojox.gfx.Matrix2D
			//	a matrix or a matrix-like object
			//	(see an argument of dojox.gfx.Matrix2D
			//	constructor for a list of acceptable arguments)
			return matrix ? this.setTransform([matrix, this.matrix]) : this;	// self
		},
		applyTransform: function(matrix){
			// summary: a shortcut for dojox.gfx.Shape.applyRightTransform
			// matrix: dojox.gfx.Matrix2D
			//	a matrix or a matrix-like object
			//	(see an argument of dojox.gfx.Matrix2D
			//	constructor for a list of acceptable arguments)
			return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
		},
	
		// virtual group methods
	
		removeShape: function(silently){
			// summary: removes the shape from its parent's list of shapes
			// silently: Boolean
			// 		if true, do not redraw a picture yet
			if(this.parent){
				this.parent.remove(this, silently);
			}
			return this;	// self
		},
		_setParent: function(parent, matrix){
			// summary: sets a parent
			// parent: Object
			//	a parent or null
			//	(see dojox.gfx.Surface,
			//	dojox.gfx.shape.VirtualGroup,
			//	or dojox.gfx.Group)
			// matrix: dojox.gfx.Matrix2D
			//	a 2D matrix or a matrix-like object
			this.parent = parent;
			return this._updateParentMatrix(matrix);	// self
		},
		_updateParentMatrix: function(matrix){
			// summary: updates the parent matrix with new matrix
			// matrix: dojox.gfx.Matrix2D
			//	a 2D matrix or a matrix-like object
			this.parentMatrix = matrix ? matrixLib.clone(matrix) : null;
			return this._applyTransform();	// self
		},
		_getRealMatrix: function(){
			// summary: returns the cumulative ('real') transformation matrix
			//	by combining the shape's matrix with its parent's matrix
			var m = this.matrix;
			var p = this.parent;
			while(p){
				if(p.matrix){
					m = matrixLib.multiply(p.matrix, m);
				}
				p = p.parent;
			}
			return m;	// dojox.gfx.Matrix2D
		}
	});
	
	shape._eventsProcessing = {
		connect: function(name, object, method){
			// summary: connects a handler to an event on this shape
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
			// redirect to fixCallback to normalize events and add the gfxTarget to the event. The latter
			// is done by dojox.gfx.fixTarget which is defined by each renderer
			return events.connect(this.getEventSource(), name, shape.fixCallback(this, g.fixTarget, object, method));
			
		},
		disconnect: function(token){
			// summary: connects a handler by token from an event on this shape
			// COULD BE RE-IMPLEMENTED BY THE RENDERER!
	
			events.disconnect(token);
		}
	};
	
	shape.fixCallback = function(gfxElement, fixFunction, scope, method){
		//  summary:
		//      Wraps the callback to allow for tests and event normalization
		//      before it gets invoked. This is where 'fixTarget' is invoked.
		//  gfxElement: Object
		//      The GFX object that triggers the action (ex.: 
		//      dojox.gfx.Surface and dojox.gfx.Shape). A new event property
		//      'gfxTarget' is added to the event to reference this object.
		//      for easy manipulation of GFX objects by the event handlers.
		//  fixFunction: Function
		//      The function that implements the logic to set the 'gfxTarget'
		//      property to the event. It should be 'dojox.gfx.fixTarget' for
		//      most of the cases
		//  scope: Object
		//      Optional. The scope to be used when invoking 'method'. If
		//      omitted, a global scope is used.
		//  method: Function|String
		//      The original callback to be invoked.
		if(!method){
			method = scope;
			scope = null;
		}
		if(lang.isString(method)){
			scope = scope || win.global;
			if(!scope[method]){ throw(['dojox.gfx.shape.fixCallback: scope["', method, '"] is null (scope="', scope, '")'].join('')); }
			return function(e){  
				return fixFunction(e,gfxElement) ? scope[method].apply(scope, arguments || []) : undefined; }; // Function
		}
		return !scope 
			? function(e){ 
				return fixFunction(e,gfxElement) ? method.apply(scope, arguments) : undefined; } 
			: function(e){ 
				return fixFunction(e,gfxElement) ? method.apply(scope, arguments || []) : undefined; }; // Function
	};
	lang.extend(shape.Shape, shape._eventsProcessing);
	
	shape.Container = {
		// summary: a container of shapes, which can be used
		//	as a foundation for renderer-specific groups, or as a way
		//	to logically group shapes (e.g, to propagate matricies)
	
		_init: function() {
			// children: Array: a list of children
			this.children = [];
		},
	
		// group management
	
		openBatch: function() {
			// summary: starts a new batch, subsequent new child shapes will be held in
			//	the batch instead of appending to the container directly
		},
		closeBatch: function() {
			// summary: submits the current batch, append all pending child shapes to DOM
		},
		add: function(shape){
			// summary: adds a shape to the list
			// shape: dojox.gfx.Shape
			//		the shape to add to the list
			var oldParent = shape.getParent();
			if(oldParent){
				oldParent.remove(shape, true);
			}
			this.children.push(shape);
			return shape._setParent(this, this._getRealMatrix());	// self
		},
		remove: function(shape, silently){
			// summary: removes a shape from the list
			//	shape: dojox.gfx.shape.Shape
			//		the shape to remove
			// silently: Boolean
			//		if true, do not redraw a picture yet
			for(var i = 0; i < this.children.length; ++i){
				if(this.children[i] == shape){
					if(silently){
						// skip for now
					}else{
						shape.parent = null;
						shape.parentMatrix = null;
					}
					this.children.splice(i, 1);
					break;
				}
			}
			return this;	// self
		},
		clear: function(){
			// summary: removes all shapes from a group/surface
			var shape;
			for(var i = 0; i < this.children.length;++i){
				shape = this.children[i];
				shape.parent = null;
				shape.parentMatrix = null;
			}
			this.children = [];
			return this;	// self
		},
	
		// moving child nodes
	
		_moveChildToFront: function(shape){
			// summary: moves a shape to front of the list of shapes
			//	shape: dojox.gfx.shape.Shape
			//		one of the child shapes to move to the front
			for(var i = 0; i < this.children.length; ++i){
				if(this.children[i] == shape){
					this.children.splice(i, 1);
					this.children.push(shape);
					break;
				}
			}
			return this;	// self
		},
		_moveChildToBack: function(shape){
			// summary: moves a shape to back of the list of shapes
			//	shape: dojox.gfx.shape.Shape
			//		one of the child shapes to move to the front
			for(var i = 0; i < this.children.length; ++i){
				if(this.children[i] == shape){
					this.children.splice(i, 1);
					this.children.unshift(shape);
					break;
				}
			}
			return this;	// self
		}
	};
	
	declare("dojox.gfx.shape.Surface", null, {
		// summary: a surface object to be used for drawings
		constructor: function(){
			// underlying node
			this.rawNode = null;
			// the parent node
			this._parent = null;
			// the list of DOM nodes to be deleted in the case of destruction
			this._nodes = [];
			// the list of events to be detached in the case of destruction
			this._events = [];
		},
		destroy: function(){
			// summary: destroy all relevant external resources and release all
			//	external references to make this object garbage-collectible
			
			// dispose children from registry
			var _dispose = function(s){
				shape.dispose(s);
				s.parent = null;
				if(s.children && s.children.length){
					arr.forEach(s.children, _dispose);
					s.children = null;
				}
			};
			arr.forEach(this.children, _dispose);
			this.children = null;
			// destroy dom construct
			arr.forEach(this._nodes, domConstruct.destroy);
			this._nodes = [];
			arr.forEach(this._events, events.disconnect);
			this._events = [];
			this.rawNode = null;	// recycle it in _nodes, if it needs to be recycled
			if(has("ie")){
				while(this._parent.lastChild){
					domConstruct.destroy(this._parent.lastChild);
				}
			}else{
				this._parent.innerHTML = "";
			}
			this._parent = null;
		},
		getEventSource: function(){
			// summary: returns a node, which can be used to attach event listeners
			return this.rawNode; // Node
		},
		_getRealMatrix: function(){
			// summary: always returns the identity matrix
			return null;	// dojox.gfx.Matrix2D
		},
		isLoaded: true,
		onLoad: function(/*dojox.gfx.Surface*/ surface){
			// summary: local event, fired once when the surface is created
			// asynchronously, used only when isLoaded is false, required
			// only for Silverlight.
		},
		whenLoaded: function(/*Object|Null*/ context, /*Function|String*/ method){
			var f = lang.hitch(context, method);
			if(this.isLoaded){
				f(this);
			}else{
				var h = events.connect(this, "onLoad", function(surface){
					events.disconnect(h);
					f(surface);
				});
			}
		}
	});
	
	lang.extend(shape.Surface, shape._eventsProcessing);
	
	declare("dojox.gfx.Point", null, {
		// summary: a hypothetical 2D point to be used for drawings - {x, y}
		// description: This object is defined for documentation purposes.
		//	You should use the naked object instead: {x: 1, y: 2}.
	});
	
	declare("dojox.gfx.Rectangle", null, {
		// summary: a hypothetical rectangle - {x, y, width, height}
		// description: This object is defined for documentation purposes.
		//	You should use the naked object instead: {x: 1, y: 2, width: 100, height: 200}.
	});
	
	declare("dojox.gfx.shape.Rect", shape.Shape, {
		// summary: a generic rectangle
		constructor: function(rawNode){
			// rawNode: Node
			//		The underlying graphics system object (typically a DOM Node)
			this.shape = g.getDefault("Rect");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary: returns the bounding box (its shape in this case)
			return this.shape;	// dojox.gfx.Rectangle
		}
	});
	
	declare("dojox.gfx.shape.Ellipse", shape.Shape, {
		// summary: a generic ellipse
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Ellipse");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary: returns the bounding box
			if(!this.bbox){
				var shape = this.shape;
				this.bbox = {x: shape.cx - shape.rx, y: shape.cy - shape.ry,
					width: 2 * shape.rx, height: 2 * shape.ry};
			}
			return this.bbox;	// dojox.gfx.Rectangle
		}
	});
	
	declare("dojox.gfx.shape.Circle", shape.Shape, {
		// summary: a generic circle
		//	(this is a helper object, which is defined for convenience)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Circle");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary: returns the bounding box
			if(!this.bbox){
				var shape = this.shape;
				this.bbox = {x: shape.cx - shape.r, y: shape.cy - shape.r,
					width: 2 * shape.r, height: 2 * shape.r};
			}
			return this.bbox;	// dojox.gfx.Rectangle
		}
	});
	
	declare("dojox.gfx.shape.Line", shape.Shape, {
		// summary: a generic line
		//	(this is a helper object, which is defined for convenience)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Line");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary: returns the bounding box
			if(!this.bbox){
				var shape = this.shape;
				this.bbox = {
					x:		Math.min(shape.x1, shape.x2),
					y:		Math.min(shape.y1, shape.y2),
					width:	Math.abs(shape.x2 - shape.x1),
					height:	Math.abs(shape.y2 - shape.y1)
				};
			}
			return this.bbox;	// dojox.gfx.Rectangle
		}
	});
	
	declare("dojox.gfx.shape.Polyline", shape.Shape, {
		// summary: a generic polyline/polygon
		//	(this is a helper object, which is defined for convenience)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Polyline");
			this.rawNode = rawNode;
		},
		setShape: function(points, closed){
			// summary: sets a polyline/polygon shape object
			// points: Object
			//		a polyline/polygon shape object
			// closed: Boolean
			//		close the polyline to make a polygon
			if(points && points instanceof Array){
				// points: Array: an array of points
				this.inherited(arguments, [{points: points}]);
				if(closed && this.shape.points.length){
					this.shape.points.push(this.shape.points[0]);
				}
			}else{
				this.inherited(arguments, [points]);
			}
			return this;	// self
		},
		_normalizePoints: function(){
			// summary: normalize points to array of {x:number, y:number}
			var p = this.shape.points, l = p && p.length;
			if(l && typeof p[0] == "number"){
				var points = [];
				for(var i = 0; i < l; i += 2){
					points.push({x: p[i], y: p[i + 1]});
				}
				this.shape.points = points;
			}
		},
		getBoundingBox: function(){
			// summary: returns the bounding box
			if(!this.bbox && this.shape.points.length){
				var p = this.shape.points;
				var l = p.length;
				var t = p[0];
				var bbox = {l: t.x, t: t.y, r: t.x, b: t.y};
				for(var i = 1; i < l; ++i){
					t = p[i];
					if(bbox.l > t.x) bbox.l = t.x;
					if(bbox.r < t.x) bbox.r = t.x;
					if(bbox.t > t.y) bbox.t = t.y;
					if(bbox.b < t.y) bbox.b = t.y;
				}
				this.bbox = {
					x:		bbox.l,
					y:		bbox.t,
					width:	bbox.r - bbox.l,
					height:	bbox.b - bbox.t
				};
			}
			return this.bbox;	// dojox.gfx.Rectangle
		}
	});
	
	declare("dojox.gfx.shape.Image", shape.Shape, {
		// summary: a generic image
		//	(this is a helper object, which is defined for convenience)
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.shape = g.getDefault("Image");
			this.rawNode = rawNode;
		},
		getBoundingBox: function(){
			// summary: returns the bounding box (its shape in this case)
			return this.shape;	// dojox.gfx.Rectangle
		},
		setStroke: function(){
			// summary: ignore setting a stroke style
			return this;	// self
		},
		setFill: function(){
			// summary: ignore setting a fill style
			return this;	// self
		}
	});
	
	declare("dojox.gfx.shape.Text", shape.Shape, {
		// summary: a generic text
		constructor: function(rawNode){
			// rawNode: Node
			//		a DOM Node
			this.fontStyle = null;
			this.shape = g.getDefault("Text");
			this.rawNode = rawNode;
		},
		getFont: function(){
			// summary: returns the current font object or null
			return this.fontStyle;	// Object
		},
		setFont: function(newFont){
			// summary: sets a font for text
			// newFont: Object
			//		a font object (see dojox.gfx.defaultFont) or a font string
			this.fontStyle = typeof newFont == "string" ? g.splitFontString(newFont) :
				g.makeParameters(g.defaultFont, newFont);
			this._setFont();
			return this;	// self
		}
	});
	
	shape.Creator = {
		// summary: shape creators
		createShape: function(shape){
			// summary: creates a shape object based on its type; it is meant to be used
			//	by group-like objects
			// shape: Object
			//		a shape descriptor object
			switch(shape.type){
				case g.defaultPath.type:		return this.createPath(shape);
				case g.defaultRect.type:		return this.createRect(shape);
				case g.defaultCircle.type:	return this.createCircle(shape);
				case g.defaultEllipse.type:	return this.createEllipse(shape);
				case g.defaultLine.type:		return this.createLine(shape);
				case g.defaultPolyline.type:	return this.createPolyline(shape);
				case g.defaultImage.type:		return this.createImage(shape);
				case g.defaultText.type:		return this.createText(shape);
				case g.defaultTextPath.type:	return this.createTextPath(shape);
			}
			return null;
		},
		createGroup: function(){
			// summary: creates a group shape
			return this.createObject(g.Group);	// dojox.gfx.Group
		},
		createRect: function(rect){
			// summary: creates a rectangle shape
			// rect: Object
			//		a path object (see dojox.gfx.defaultRect)
			return this.createObject(g.Rect, rect);	// dojox.gfx.Rect
		},
		createEllipse: function(ellipse){
			// summary: creates an ellipse shape
			// ellipse: Object
			//		an ellipse object (see dojox.gfx.defaultEllipse)
			return this.createObject(g.Ellipse, ellipse);	// dojox.gfx.Ellipse
		},
		createCircle: function(circle){
			// summary: creates a circle shape
			// circle: Object
			//		a circle object (see dojox.gfx.defaultCircle)
			return this.createObject(g.Circle, circle);	// dojox.gfx.Circle
		},
		createLine: function(line){
			// summary: creates a line shape
			// line: Object
			//		a line object (see dojox.gfx.defaultLine)
			return this.createObject(g.Line, line);	// dojox.gfx.Line
		},
		createPolyline: function(points){
			// summary: creates a polyline/polygon shape
			// points: Object
			//		a points object (see dojox.gfx.defaultPolyline)
			//		or an Array of points
			return this.createObject(g.Polyline, points);	// dojox.gfx.Polyline
		},
		createImage: function(image){
			// summary: creates a image shape
			// image: Object
			//		an image object (see dojox.gfx.defaultImage)
			return this.createObject(g.Image, image);	// dojox.gfx.Image
		},
		createText: function(text){
			// summary: creates a text shape
			// text: Object
			//		a text object (see dojox.gfx.defaultText)
			return this.createObject(g.Text, text);	// dojox.gfx.Text
		},
		createPath: function(path){
			// summary: creates a path shape
			// path: Object
			//		a path object (see dojox.gfx.defaultPath)
			return this.createObject(g.Path, path);	// dojox.gfx.Path
		},
		createTextPath: function(text){
			// summary: creates a text shape
			// text: Object
			//		a textpath object (see dojox.gfx.defaultTextPath)
			return this.createObject(g.TextPath, {}).setText(text);	// dojox.gfx.TextPath
		},
		createObject: function(shapeType, rawShape){
			// summary: creates an instance of the passed shapeType class
			// SHOULD BE RE-IMPLEMENTED BY THE RENDERER!
			// shapeType: Function
			//		a class constructor to create an instance of
			// rawShape: Object 
			//		properties to be passed in to the classes 'setShape' method
	
			return null;	// dojox.gfx.Shape
		}
	};
	
	return shape;
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
'dojox/charting/action2d/MouseZoomAndPan':function(){
define("dojox/charting/action2d/MouseZoomAndPan", ["dojo/_base/html", "dojo/_base/declare", "dojo/_base/window", "dojo/_base/array", "dojo/_base/event",
	"dojo/_base/connect", "./ChartAction", "dojo/_base/sniff", "dojo/dom-prop", "dojo/keys"], 
	function(html, declare, win, arr, eventUtil, connect, ChartAction, has, domProp, keys){

	/*=====
	dojo.declare("dojox.charting.action2d.__MouseZoomAndPanCtorArgs", null, {
		//	summary:
		//		Additional arguments for mouse zoom and pan actions.
	
		//	axis: String?
		//		Target axis name for this action.  Default is "x".
		axis: "x",
		//	scaleFactor: Number?
		//		The scale factor applied on mouse wheel zoom.  Default is 1.2.
		scaleFactor: 1.2,
		//	maxScale: Number?
		//		The max scale factor accepted by this chart action.  Default is 100.
		maxScale: 100,
		//	enableScroll: Boolean?
		//		Whether mouse drag gesture should scroll the chart.  Default is true.
		enableScroll: true,
		//	enableDoubleClickZoom: Boolean?
		//		Whether a double click gesture should toggle between fit and zoom on the chart.  Default is true.
		enableDoubleClickZoom: true,
		//	enableKeyZoom: Boolean?
		//		Whether a keyZoomModifier + + or keyZoomModifier + - key press should zoom in our out on the chart.  Default is true.
		enableKeyZoom: true,
		//	keyZoomModifier: String?
		//		Which keyboard modifier should used for keyboard zoom in and out. This should be one of "alt", "ctrl", "shift" or "none" for no modifier. Default is "ctrl".
		keyZoomModifier: "ctrl"
	});
	var ChartAction = dojox.charting.action2d.ChartAction;
	=====*/

	var sUnit = has("mozilla") ? -3 : 120;
	var keyTests = {
		none: function(event){
			return !event.ctrlKey && !event.altKey && !event.shiftKey;
		},
		ctrl: function(event){
			return event.ctrlKey && !event.altKey && !event.shiftKey;
		},
		alt: function(event){
			return !event.ctrlKey && event.altKey && !event.shiftKey;
		},
		shift: function(event){
			return !event.ctrlKey && !event.altKey && event.shiftKey;
		}
	};

	return declare("dojox.charting.action2d.MouseZoomAndPan", ChartAction, {
		//	summary:
		//		Create an mouse zoom and pan action.
		//		You can zoom in or out the data window with mouse wheel. You can scroll using mouse drag gesture. 
		//		You can toggle between zoom and fit view using double click on the chart.

		// the data description block for the widget parser
		defaultParams: {
			axis: "x",
			scaleFactor: 1.2,	
			maxScale: 100,
			enableScroll: true,
			enableDoubleClickZoom: true,
			enableKeyZoom: true,
			keyZoomModifier: "ctrl"
		},
		optionalParams: {}, // no optional parameters
		
		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create an mouse zoom and pan action and connect it.
			//	chart: dojox.charting.Chart
			//		The chart this action applies to.
			//	kwArgs: dojox.charting.action2d.__MouseZoomAndPanCtorArgs?
			//		Optional arguments for the chart action.
			this._listeners = [{eventName: !has("mozilla") ? "onmousewheel" : "DOMMouseScroll", methodName: "onMouseWheel"}];
			if(!kwArgs){ kwArgs = {}; }
			this.axis = kwArgs.axis ? kwArgs.axis : "x";
			this.scaleFactor = kwArgs.scaleFactor ? kwArgs.scaleFactor : 1.2;
			this.maxScale = kwArgs.maxScale ? kwArgs.maxScale : 100;
			this.enableScroll = kwArgs.enableScroll != undefined ? kwArgs.enableScroll : true;
			this.enableDoubleClickZoom = kwArgs.enableDoubleClickZoom != undefined ? kwArgs.enableDoubleClickZoom : true;
			this.enableKeyZoom = kwArgs.enableKeyZoom != undefined ? kwArgs.enableKeyZoom : true;
			this.keyZoomModifier = kwArgs.keyZoomModifier ? kwArgs.keyZoomModifier : "ctrl";
			if(this.enableScroll){
				this._listeners.push({eventName: "onmousedown", methodName: "onMouseDown"});
			}
			if(this.enableDoubleClickZoom){
				this._listeners.push({eventName: "ondblclick", methodName: "onDoubleClick"});
			}
			if(this.enableKeyZoom){
				this._listeners.push({eventName: "keypress", methodName: "onKeyPress"});				
			}
			this._handles = [];
			this.connect();
		},
		
		_disconnectHandles: function(){
			if(has("ie")){
				this.chart.node.releaseCapture();
			}
			arr.forEach(this._handles, connect.disconnect);
			this._handles = [];
		},
		
		connect: function(){
			//	summary:
			//		Connect this action to the chart.
			this.inherited(arguments);
			if(this.enableKeyZoom){
				// we want to be able to get focus to receive key events 
				domProp.set(this.chart.node, "tabindex", "0");
				// if one doesn't want a focus border he can do something like
				// dojo.style(this.chart.node, "outline", "none");
			}
		},
		
		disconnect: function(){
			//	summary:
			//		Disconnect this action from the chart.
			this.inherited(arguments);
			if(this.enableKeyZoom){
				// we don't need anymore to be able to get focus to receive key events 
				domProp.set(this.chart.node, "tabindex", "-1");
			}
			// in case we disconnect before the end of the action
			this._disconnectHandles();
		},
	
		onMouseDown: function(event){
			//	summary:
			//		Called when mouse is down on the chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			if(!axis.vertical){
				this._startCoord = event.pageX;
			}else{
				this._startCoord = event.pageY;
			}
			this._startOffset = axis.getWindowOffset();
			this._isPanning = true;
			// we now want to capture mouse move events everywhere to avoid
			// stop scrolling when going out of the chart window
			if(has("ie")){
				this._handles.push(connect.connect(this.chart.node, "onmousemove", this, "onMouseMove"));
				this._handles.push(connect.connect(this.chart.node, "onmouseup", this, "onMouseUp"));
				this.chart.node.setCapture();
			}else{
				this._handles.push(connect.connect(win.doc, "onmousemove", this, "onMouseMove"));
				this._handles.push(connect.connect(win.doc, "onmouseup", this, "onMouseUp"));
			}
			chart.node.focus();
			// prevent the browser from trying the drag on the "image"
			eventUtil.stop(event);
		},
	
		onMouseMove: function(event){
			//	summary:
			//		Called when mouse is moved on the chart.
			if(this._isPanning){
				var chart = this.chart, axis = chart.getAxis(this.axis);
				var delta = axis.vertical?(this._startCoord- event.pageY):(event.pageX - this._startCoord);
				
				var bounds = axis.getScaler().bounds,
					s = bounds.span / (bounds.upper - bounds.lower);
		
				var scale = axis.getWindowScale();
		
				chart.setAxisWindow(this.axis, scale, this._startOffset - delta / s / scale);
				chart.render();
			}
		},
	
		onMouseUp: function(event){
			//	summary:
			//		Called when mouse is up on the chart.
			this._isPanning = false;
			this._disconnectHandles();
		},
		
		onMouseWheel: function(event){
			//	summary:
			//		Called when mouse wheel is used on the chart.
			var scroll = event[(has("mozilla") ? "detail" : "wheelDelta")] / sUnit;
			// on Mozilla the sUnit might actually not always be 3
			// make sure we never have -1 < scroll < 1
			if(scroll > -1 && scroll < 0){
				scroll = -1;
			}else if(scroll > 0 && scroll < 1){
				scroll = 1;
			}
 			this._onZoom(scroll, event);
		},
		
		onKeyPress: function(event){
			//	summary:
			//		Called when a key is pressed on the chart.
			if(keyTests[this.keyZoomModifier](event)){
				if(event.keyChar == "+" || event.keyCode == keys.NUMPAD_PLUS){
					this._onZoom(1, event);
				}else if(event.keyChar == "-" || event.keyCode == keys.NUMPAD_MINUS){
					this._onZoom(-1, event);					
				}
			} 
		},
		
		onDoubleClick: function(event){
			//	summary:
			//		Called when the mouse is double is double clicked on the chart. Toggle between zoom and fit chart.
			var chart = this.chart, axis = chart.getAxis(this.axis);
			var scale = 1 / this.scaleFactor;
			// are we fit?
			if(axis.getWindowScale()==1){
				// fit => zoom
				var scaler = axis.getScaler(), start = scaler.bounds.from, end = scaler.bounds.to, 
				oldMiddle = (start + end) / 2, newMiddle = this.plot.toData({x: event.pageX, y: event.pageY})[this.axis], 
				newStart = scale * (start - oldMiddle) + newMiddle, newEnd = scale * (end - oldMiddle) + newMiddle;
				chart.zoomIn(this.axis, [newStart, newEnd]);
			}else{
				// non fit => fit
				chart.setAxisWindow(this.axis, 1, 0);
				chart.render();
			}
			eventUtil.stop(event);
		},
		
		_onZoom: function(scroll, event){
			var scale = (scroll < 0 ? Math.abs(scroll)*this.scaleFactor : 
				1 / (Math.abs(scroll)*this.scaleFactor));
			var chart = this.chart, axis = chart.getAxis(this.axis);
			// after wheel reset event position exactly if we could start a new scroll action
			var cscale = axis.getWindowScale();
			if(cscale / scale > this.maxScale){
				return;
			}
			var scaler = axis.getScaler(), start = scaler.bounds.from, end = scaler.bounds.to;
			// keep mouse pointer as transformation center if available otherwise center
			var middle = (event.type == "keypress") ? (start + end) / 2 :
				this.plot.toData({x: event.pageX, y: event.pageY})[this.axis];
			var newStart = scale * (start - middle) + middle, newEnd = scale * (end - middle) + middle;
			chart.zoomIn(this.axis, [newStart, newEnd]);
			// do not scroll browser
			eventUtil.stop(event);
		}
	});		
});

},
'dojox/charting/action2d/Tooltip':function(){
define("dojox/charting/action2d/Tooltip", ["dojo/_base/kernel", "dijit/Tooltip","dojo/_base/lang", "dojo/_base/html", "dojo/_base/declare", "./PlotAction", 
	"dojox/gfx/matrix", "dojox/lang/functional", "dojox/lang/functional/scan", "dojox/lang/functional/fold"], 
	function(dojo, Tooltip, lang, html, declare, PlotAction, m, df, dfs, dff){
	
	/*=====
	dojo.declare("dojox.charting.action2d.__TooltipCtorArgs", dojox.charting.action2d.__PlotActionCtorArgs, {
		//	summary:
		//		Additional arguments for tooltip actions.
	
		//	text: Function?
		//		The function that produces the text to be shown within a tooltip.  By default this will be
		//		set by the plot in question, by returning the value of the element.
		text: null
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/

	var DEFAULT_TEXT = function(o){
		var t = o.run && o.run.data && o.run.data[o.index];
		if(t && typeof t != "number" && (t.tooltip || t.text)){
			return t.tooltip || t.text;
		}
		if(o.element == "candlestick"){
			return '<table cellpadding="1" cellspacing="0" border="0" style="font-size:0.9em;">'
				+ '<tr><td>Open:</td><td align="right"><strong>' + o.data.open + '</strong></td></tr>'
				+ '<tr><td>High:</td><td align="right"><strong>' + o.data.high + '</strong></td></tr>'
				+ '<tr><td>Low:</td><td align="right"><strong>' + o.data.low + '</strong></td></tr>'
				+ '<tr><td>Close:</td><td align="right"><strong>' + o.data.close + '</strong></td></tr>'
				+ (o.data.mid !== undefined ? '<tr><td>Mid:</td><td align="right"><strong>' + o.data.mid + '</strong></td></tr>' : '')
				+ '</table>';
		}
		return o.element == "bar" ? o.x : o.y;
	};

	var pi4 = Math.PI / 4, pi2 = Math.PI / 2;
	
	return declare("dojox.charting.action2d.Tooltip", PlotAction, {
		//	summary:
		//		Create an action on a plot where a tooltip is shown when hovering over an element.

		// the data description block for the widget parser
		defaultParams: {
			text: DEFAULT_TEXT	// the function to produce a tooltip from the object
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the tooltip action and connect it to the plot.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot this action is attached to.  If not passed, "default" is assumed.
			//	kwArgs: dojox.charting.action2d.__TooltipCtorArgs?
			//		Optional keyword arguments object for setting parameters.
			this.text = kwArgs && kwArgs.text ? kwArgs.text : DEFAULT_TEXT;
			
			this.connect();
		},
		
		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the highlighting action.
			if(o.type === "onplotreset" || o.type === "onmouseout"){
                Tooltip.hide(this.aroundRect);
				this.aroundRect = null;
				if(o.type === "onplotreset"){
					delete this.angles;
				}
				return;
			}
			
			if(!o.shape || o.type !== "onmouseover"){ return; }
			
			// calculate relative coordinates and the position
			var aroundRect = {type: "rect"}, position = ["after", "before"];
			switch(o.element){
				case "marker":
					aroundRect.x = o.cx;
					aroundRect.y = o.cy;
					aroundRect.w = aroundRect.h = 1;
					break;
				case "circle":
					aroundRect.x = o.cx - o.cr;
					aroundRect.y = o.cy - o.cr;
					aroundRect.w = aroundRect.h = 2 * o.cr;
					break;
				case "column":
					position = ["above", "below"];
					// intentional fall down
				case "bar":
					aroundRect = lang.clone(o.shape.getShape());
					aroundRect.w = aroundRect.width;
					aroundRect.h = aroundRect.height;
					break;
				case "candlestick":
					aroundRect.x = o.x;
					aroundRect.y = o.y;
					aroundRect.w = o.width;
					aroundRect.h = o.height;
					break;
				default:
				//case "slice":
					if(!this.angles){
						// calculate the running total of slice angles
						if(typeof o.run.data[0] == "number"){
							this.angles = df.map(df.scanl(o.run.data, "+", 0),
								"* 2 * Math.PI / this", df.foldl(o.run.data, "+", 0));
						}else{
							this.angles = df.map(df.scanl(o.run.data, "a + b.y", 0),
								"* 2 * Math.PI / this", df.foldl(o.run.data, "a + b.y", 0));
						}
					}
					var startAngle = m._degToRad(o.plot.opt.startAngle),
						angle = (this.angles[o.index] + this.angles[o.index + 1]) / 2 + startAngle;
					aroundRect.x = o.cx + o.cr * Math.cos(angle);
					aroundRect.y = o.cy + o.cr * Math.sin(angle);
					aroundRect.w = aroundRect.h = 1;
					// calculate the position
					if(angle < pi4){
						// do nothing: the position is right
					}else if(angle < pi2 + pi4){
						position = ["below", "above"];
					}else if(angle < Math.PI + pi4){
						position = ["before", "after"];
					}else if(angle < 2 * Math.PI - pi4){
						position = ["above", "below"];
					}
					/*
					else{
						// do nothing: the position is right
					}
					*/
					break;
			}
			
			// adjust relative coordinates to absolute, and remove fractions
			var lt = this.chart.getCoords();
			aroundRect.x += lt.x;
			aroundRect.y += lt.y;
			aroundRect.x = Math.round(aroundRect.x);
			aroundRect.y = Math.round(aroundRect.y);
			aroundRect.w = Math.ceil(aroundRect.w);
			aroundRect.h = Math.ceil(aroundRect.h);
			this.aroundRect = aroundRect;

			var tooltip = this.text(o);
			if(this.chart.getTextDir){
				var isChartDirectionRtl = (html.style(this.chart.node,"direction") == "rtl");
				var isBaseTextDirRtl = (this.chart.getTextDir(tooltip) == "rtl");
			}
			if(tooltip){
				if(isBaseTextDirRtl && !isChartDirectionRtl){
					Tooltip.show("<span dir = 'rtl'>" + tooltip +"</span>", this.aroundRect, position);
				}
				else if(!isBaseTextDirRtl && isChartDirectionRtl){
					Tooltip.show("<span dir = 'ltr'>" + tooltip +"</span>", this.aroundRect, position);
				}else{
					Tooltip.show(tooltip, this.aroundRect, position);
				}
			}
		}
	});
});

},
'dojox/charting/widget/BidiSupport':function(){
define("dojox/charting/widget/BidiSupport", ["dojo/dom", "dojo/_base/lang", "dojo/_base/html", "dojo/_base/array",  "dojo/_base/connect", "dojo/query",
	"dijit/_BidiSupport", "../BidiSupport", "dijit/registry", "./Chart", "./Legend"], 
	function(dom, lang, html, arrayUtil, hub, query, dBidi, cBidi, widgetManager, Chart, Legend){

	// patch only if present
	if( Legend ){
		lang.extend(Legend, {
			// summary:
			//		Add support for bidi scripts in legend.
			// description:
			//		Since dojox.charting.widget.Legend inherits from _Widget use the bidi support
			//		that introduced there.

			postMixInProperties: function(){
				// summary:
				//		Connect the setter of textDir legend to setTextDir of the chart,
				//		so _setTextDirAttr of the legend will be called after setTextDir of the chart is called.
				// tags:
				//		private

				// find the chart that is the owner of this legend, use it's 
				// textDir
				if(!this.chart){
					if(!this.chartRef){ return; }
					var chart = widgetManager.byId(this.chartRef);
					if(!chart){
						var node = dom.byId(this.chartRef);
						if(node){
							chart = widgetManager.byNode(node);
						}else{
							return;
						}
					}
					this.textDir = chart.chart.textDir;
					hub.connect(chart.chart, "setTextDir", this, "_setTextDirAttr");

				}else{
					this.textDir = this.chart.textDir;
					hub.connect(this.chart, "setTextDir", this, "_setTextDirAttr");

				}
			},

			_setTextDirAttr: function(/*String*/ textDir){
				// summary:
				//		Setter for textDir. 
				// description:
				//		Users shouldn't call this function; they should be calling
				//		set('textDir', value)
				// tags:
				//		private
				
				// only if new textDir is different from the old one
				if(validateTextDir(textDir) != null){
					if(this.textDir != textDir){
						this._set("textDir", textDir);
						// get array of all the labels
						var legendLabels = query(".dojoxLegendText", this._tr);
							// for every label calculate it's new dir.
							arrayUtil.forEach(legendLabels, function(label){
								label.dir = this.getTextDir(label.innerHTML, label.dir);
						}, this);					
					}
				}
			}
		});
	}
	
	// patch only if present
	if( Chart ){
		lang.extend( Chart ,{
			postMixInProperties: function(){
				// set initial textDir of the chart, if passed in the creation use that value
				// else use default value, following the GUI direction, this.chart doesn't exist yet
				// so can't use set("textDir", textDir). This passed to this.chart in it's future creation.
				this.textDir = this.params["textDir"] ? this.params["textDir"] : this.params["dir"];
			},

			_setTextDirAttr: function(/*String*/ textDir){
				if(validateTextDir(textDir) != null){
					this._set("textDir", textDir);
					this.chart.setTextDir(textDir);
				}
			}
		});
	}

	function validateTextDir(textDir){
		return /^(ltr|rtl|auto)$/.test(textDir) ? textDir : null;
	}
		
});

},
'dojox/charting/widget/Sparkline':function(){
define("dojox/charting/widget/Sparkline", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "dojo/_base/html", "dojo/query", 
	"./Chart", "../themes/GreySkies", "../plot2d/Lines", "dojo/dom-prop"], 
	function(lang, arrayUtil, declare, html, query, Chart, GreySkies, Lines, domProp){
/*=====
var Chart = dojox.charting.widget.Chart;
=====*/

	declare("dojox.charting.widget.Sparkline", Chart, {
			theme: GreySkies,
			margins: { l: 0, r: 0, t: 0, b: 0 },
			type: "Lines",
			valueFn: "Number(x)",
			store: "",
			field: "",
			query: "",
			queryOptions: "",
			start: "0",
			count: "Infinity",
			sort: "",
			data: "",
			name: "default",
			buildRendering: function(){
				var n = this.srcNodeRef;
				if(	!n.childNodes.length || // shortcut the query
					!query("> .axis, > .plot, > .action, > .series", n).length){
					var plot = document.createElement("div");
					domProp.set(plot, {
						"class": "plot",
						"name": "default",
						"type": this.type
					});
					n.appendChild(plot);

					var series = document.createElement("div");
					domProp.set(series, {
						"class": "series",
						plot: "default",
						name: this.name,
						start: this.start,
						count: this.count,
						valueFn: this.valueFn
					});
					arrayUtil.forEach(
						["store", "field", "query", "queryOptions", "sort", "data"],
						function(i){
							if(this[i].length){
								domProp.set(series, i, this[i]);
							}
						},
						this
					);
					n.appendChild(series);
				}
				this.inherited(arguments);
			}
		}
	);
});

},
'dijit/_BidiSupport':function(){
define("dijit/_BidiSupport", ["./_WidgetBase"], function(_WidgetBase){

/*=====
	var _WidgetBase = dijit._WidgetBase;
====*/

	// module:
	//		dijit/_BidiSupport
	// summary:
	//		Module that deals with BIDI, special with the auto
	//		direction if needed without changing the GUI direction.
	//		Including this module will extend _WidgetBase with BIDI related methods.
	// description:
	//		There's a special need for displaying BIDI text in rtl direction
	//		in ltr GUI, sometimes needed auto support.
	//		In creation of widget, if it's want to activate this class,
	//		the widget should define the "textDir".

	_WidgetBase.extend({

		getTextDir: function(/*String*/ text){
			// summary:
			//		Gets the right direction of text.
			// description:
			// 		If textDir is ltr or rtl returns the value.
			//		If it's auto, calls to another function that responsible
			//		for checking the value, and defining the direction.
			//	tags:
			//		protected.
			return this.textDir == "auto" ? this._checkContextual(text) : this.textDir;
		},

		_checkContextual: function(text){
			// summary:
			//		Finds the first strong (directional) character, return ltr if isLatin
			//		or rtl if isBidiChar.
			//	tags:
			//		private.

			// look for strong (directional) characters
			var fdc = /[A-Za-z\u05d0-\u065f\u066a-\u06ef\u06fa-\u07ff\ufb1d-\ufdff\ufe70-\ufefc]/.exec(text);
			// if found return the direction that defined by the character, else return widgets dir as defult.
			return fdc ? ( fdc[0] <= 'z' ? "ltr" : "rtl" ) : this.dir ? this.dir : this.isLeftToRight() ? "ltr" : "rtl";
		},

		applyTextDir: function(/*Object*/ element, /*String*/ text){
			// summary:
			//		Set element.dir according to this.textDir
			// element:
			//		The text element to be set. Should have dir property.
			// text:
			//		Used in case this.textDir is "auto", for calculating the right transformation
			// description:
			// 		If textDir is ltr or rtl returns the value.
			//		If it's auto, calls to another function that responsible
			//		for checking the value, and defining the direction.
			//	tags:
			//		protected.

			var textDir = this.textDir == "auto" ? this._checkContextual(text) : this.textDir;
			// update only when there's a difference
			if(element.dir != textDir){
				element.dir = textDir;
			}
		}
	});

	return _WidgetBase;
});

},
'dojox/charting/plot2d/Grid':function(){
define("dojox/charting/plot2d/Grid", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", "dojo/_base/array",
		"../Element", "./common", "dojox/lang/utils", "dojox/gfx/fx"], 
	function(lang, declare, hub, arr, Element, dc, du, fx){

	/*=====
	dojo.declare("dojox.charting.plot2d.__GridCtorArgs", dojox.charting.plot2d.__DefaultCtorArgs, {
		//	summary:
		//		A special keyword arguments object that is specific to a grid "plot".
	
		//	hMajorLines: Boolean?
		//		Whether to show lines at the major ticks along the horizontal axis. Default is true.
		hMajorLines: true,
	
		//	hMinorLines: Boolean?
		//		Whether to show lines at the minor ticks along the horizontal axis. Default is false.
		hMinorLines: false,
	
		//	vMajorLines: Boolean?
		//		Whether to show lines at the major ticks along the vertical axis. Default is true.
		vMajorLines: true,
	
		//	vMinorLines: Boolean?
		//		Whether to show lines at the major ticks along the vertical axis. Default is false.
		vMinorLines: false,
	
		//	hStripes: String?
		//		Whether or not to show stripes (alternating fills) along the horizontal axis. Default is "none".
		hStripes: "none",
	
		//	vStripes: String?
		//		Whether or not to show stripes (alternating fills) along the vertical axis. Default is "none".
		vStripes: "none",
		
		//	enableCache: Boolean?
		//		Whether the grid lines are cached from one rendering to another. This improves the rendering performance of
		//		successive rendering but penalize the first rendering.  Default false.
		enableCache: false
	});
	var Element = dojox.charting.plot2d.Element;
	=====*/

	return declare("dojox.charting.plot2d.Grid", Element, {
		//	summary:
		//		A "faux" plot that can be placed behind other plots to represent
		//		a grid against which other plots can be easily measured.
		defaultParams: {
			hAxis: "x",			// use a horizontal axis named "x"
			vAxis: "y",			// use a vertical axis named "y"
			hMajorLines: true,	// draw horizontal major lines
			hMinorLines: false,	// draw horizontal minor lines
			vMajorLines: true,	// draw vertical major lines
			vMinorLines: false,	// draw vertical minor lines
			hStripes: "none",	// TBD
			vStripes: "none",	// TBD
			animate: null,   // animate bars into place
			enableCache: false
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create the faux Grid plot.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__GridCtorArgs?
			//		An optional keyword arguments object to help define the parameters of the underlying grid.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.dirty = true;
			this.animate = this.opt.animate;
			this.zoom = null,
			this.zoomQueue = [];	// zooming action task queue
			this.lastWindow = {vscale: 1, hscale: 1, xoffset: 0, yoffset: 0};
			if(this.opt.enableCache){
				this._lineFreePool = [];
				this._lineUsePool = [];
			}
		},
		clear: function(){
			//	summary:
			//		Clear out any parameters set on this plot.
			//	returns: dojox.charting.plot2d.Grid
			//		The reference to this plot for functional chaining.
			this._hAxis = null;
			this._vAxis = null;
			this.dirty = true;
			return this;	//	dojox.charting.plot2d.Grid
		},
		setAxis: function(axis){
			//	summary:
			//		Set an axis for this plot.
			//	returns: dojox.charting.plot2d.Grid
			//		The reference to this plot for functional chaining.
			if(axis){
				this[axis.vertical ? "_vAxis" : "_hAxis"] = axis;
			}
			return this;	//	dojox.charting.plot2d.Grid
		},
		addSeries: function(run){
			//	summary:
			//		Ignored but included as a dummy method.
			//	returns: dojox.charting.plot2d.Grid
			//		The reference to this plot for functional chaining.
			return this;	//	dojox.charting.plot2d.Grid
		},
		getSeriesStats: function(){
			//	summary:
			//		Returns default stats (irrelevant for this type of plot).
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return lang.delegate(dc.defaultStats);
		},
		initializeScalers: function(){
			//	summary:
			//		Does nothing (irrelevant for this type of plot).
			return this;
		},
		isDirty: function(){
			//	summary:
			//		Return whether or not this plot needs to be redrawn.
			//	returns: Boolean
			//		If this plot needs to be rendered, this will return true.
			return this.dirty || this._hAxis && this._hAxis.dirty || this._vAxis && this._vAxis.dirty;	//	Boolean
		},
		performZoom: function(dim, offsets){
			//	summary:
			//		Create/alter any zooming windows on this plot.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Grid
			//		A reference to this plot for functional chaining.

			// get current zooming various
			var vs = this._vAxis.scale || 1,
				hs = this._hAxis.scale || 1,
				vOffset = dim.height - offsets.b,
				hBounds = this._hAxis.getScaler().bounds,
				xOffset = (hBounds.from - hBounds.lower) * hBounds.scale,
				vBounds = this._vAxis.getScaler().bounds,
				yOffset = (vBounds.from - vBounds.lower) * vBounds.scale,
				// get incremental zooming various
				rVScale = vs / this.lastWindow.vscale,
				rHScale = hs / this.lastWindow.hscale,
				rXOffset = (this.lastWindow.xoffset - xOffset)/
					((this.lastWindow.hscale == 1)? hs : this.lastWindow.hscale),
				rYOffset = (yOffset - this.lastWindow.yoffset)/
					((this.lastWindow.vscale == 1)? vs : this.lastWindow.vscale),

				shape = this.group,
				anim = fx.animateTransform(lang.delegate({
					shape: shape,
					duration: 1200,
					transform:[
						{name:"translate", start:[0, 0], end: [offsets.l * (1 - rHScale), vOffset * (1 - rVScale)]},
						{name:"scale", start:[1, 1], end: [rHScale, rVScale]},
						{name:"original"},
						{name:"translate", start: [0, 0], end: [rXOffset, rYOffset]}
					]}, this.zoom));

			lang.mixin(this.lastWindow, {vscale: vs, hscale: hs, xoffset: xOffset, yoffset: yOffset});
			//add anim to zooming action queue,
			//in order to avoid several zooming action happened at the same time
			this.zoomQueue.push(anim);
			//perform each anim one by one in zoomQueue
			hub.connect(anim, "onEnd", this, function(){
				this.zoom = null;
				this.zoomQueue.shift();
				if(this.zoomQueue.length > 0){
					this.zoomQueue[0].play();
				}
			});
			if(this.zoomQueue.length == 1){
				this.zoomQueue[0].play();
			}
			return this;	//	dojox.charting.plot2d.Grid
		},
		getRequiredColors: function(){
			//	summary:
			//		Ignored but included as a dummy method.
			//	returns: Number
			//		Returns 0, since there are no series associated with this plot type.
			return 0;	//	Number
		},
		cleanGroup: function(){
			this.inherited(arguments);
			if(this.opt.enableCache){
				this._lineFreePool = this._lineFreePool.concat(this._lineUsePool);
				this._lineUsePool = [];
			}
		},
		createLine: function(creator, params){
			var line;
			if(this.opt.enableCache && this._lineFreePool.length > 0){
				line = this._lineFreePool.pop();
				line.setShape(params);
				// was cleared, add it back
				creator.add(line);
			}else{
				line = creator.createLine(params);
			}
			if(this.opt.enableCache){
				this._lineUsePool.push(line);
			}
			return line;
		},
		render: function(dim, offsets){
			//	summary:
			//		Render the plot on the chart.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Grid
			//		A reference to this plot for functional chaining.
			if(this.zoom){
				return this.performZoom(dim, offsets);
			}
			this.dirty = this.isDirty();
			if(!this.dirty){ return this; }
			this.cleanGroup();
			var s = this.group, ta = this.chart.theme.axis;
			// draw horizontal stripes and lines
			try{
				var vScaler = this._vAxis.getScaler(),
					vt = vScaler.scaler.getTransformerFromModel(vScaler),
					ticks = this._vAxis.getTicks();
				if(ticks != null){
					if(this.opt.hMinorLines){
						arr.forEach(ticks.minor, function(tick){
							var y = dim.height - offsets.b - vt(tick.value);
							var hMinorLine = this.createLine(s, {
								x1: offsets.l,
								y1: y,
								x2: dim.width - offsets.r,
								y2: y
							}).setStroke(ta.minorTick);
							if(this.animate){
								this._animateGrid(hMinorLine, "h", offsets.l, offsets.r + offsets.l - dim.width);
							}
						}, this);
					}
					if(this.opt.hMajorLines){
						arr.forEach(ticks.major, function(tick){
							var y = dim.height - offsets.b - vt(tick.value);
							var hMajorLine = this.createLine(s, {
								x1: offsets.l,
								y1: y,
								x2: dim.width - offsets.r,
								y2: y
							}).setStroke(ta.majorTick);
							if(this.animate){
								this._animateGrid(hMajorLine, "h", offsets.l, offsets.r + offsets.l - dim.width);
							}
						}, this);
					}
				}
			}catch(e){
				// squelch
			}
			// draw vertical stripes and lines
			try{
				var hScaler = this._hAxis.getScaler(),
					ht = hScaler.scaler.getTransformerFromModel(hScaler),
					ticks = this._hAxis.getTicks();
				if(this != null){
					if(ticks && this.opt.vMinorLines){
						arr.forEach(ticks.minor, function(tick){
							var x = offsets.l + ht(tick.value);
							var vMinorLine = this.createLine(s, {
								x1: x,
								y1: offsets.t,
								x2: x,
								y2: dim.height - offsets.b
							}).setStroke(ta.minorTick);
							if(this.animate){
								this._animateGrid(vMinorLine, "v", dim.height - offsets.b, dim.height - offsets.b - offsets.t);
							}
						}, this);
					}
					if(ticks && this.opt.vMajorLines){
						arr.forEach(ticks.major, function(tick){
							var x = offsets.l + ht(tick.value);
							var vMajorLine = this.createLine(s, {
								x1: x,
								y1: offsets.t,
								x2: x,
								y2: dim.height - offsets.b
							}).setStroke(ta.majorTick);
							if(this.animate){
								this._animateGrid(vMajorLine, "v", dim.height - offsets.b, dim.height - offsets.b - offsets.t);
							}
						}, this);
					}
				}
			}catch(e){
				// squelch
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Grid
		},
		_animateGrid: function(shape, type, offset, size){
			var transStart = type == "h" ? [offset, 0] : [0, offset];
			var scaleStart = type == "h" ? [1/size, 1] : [1, 1/size];
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: transStart, end: [0, 0]},
					{name: "scale", start: scaleStart, end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});

},
'dojox/charting/plot2d/Markers':function(){
define("dojox/charting/plot2d/Markers", ["dojo/_base/declare", "./Default"], function(declare, Default){
/*=====
var Default = dojox.charting.plot2d.Default
=====*/
	return declare("dojox.charting.plot2d.Markers", Default, {
		//	summary:
		//		A convenience plot to draw a line chart with markers.
		constructor: function(){
			//	summary:
			//		Set up the plot for lines and markers.
			this.opt.markers = true;
		}
	});
});

},
'dojox/charting/themes/Algae':function(){
define("dojox/charting/themes/Algae", ["../Theme", "./common"], function(Theme, themes){
	themes.Algae = new Theme({
		colors: [
			"#57808f",
			"#506885",
			"#4f7878",
			"#558f7f",
			"#508567"
		]
	});
	return themes.Algae;
});

},
'dojox/lang/functional/sequence':function(){
define("dojox/lang/functional/sequence", ["dojo/_base/lang", "./lambda"], function(lang, df){

// This module adds high-level functions and related constructs:
//	- sequence generators

// If you want more general sequence builders check out listcomp.js and
// unfold() (in fold.js).

// Defined methods:
//	- take any valid lambda argument as the functional argument

/*=====
	var df = dojox.lang.functional;
 =====*/

	lang.mixin(df, {
		// sequence generators
		repeat: function(/*Number*/ n, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: builds an array by repeatedly applying a unary function N times
			//	with a seed value Z. N should be greater than 0.
			o = o || dojo.global; f = df.lambda(f);
			var t = new Array(n), i = 1;
			t[0] = z;
			for(; i < n; t[i] = z = f.call(o, z), ++i);
			return t;	// Array
		},
		until: function(/*Function|String|Array*/ pr, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: builds an array by repeatedly applying a unary function with
			//	a seed value Z until the predicate is satisfied.
			o = o || dojo.global; f = df.lambda(f); pr = df.lambda(pr);
			var t = [];
			for(; !pr.call(o, z); t.push(z), z = f.call(o, z));
			return t;	// Array
		}
	});
	
	return df;
});

},
'dojox/charting/widget/Chart2D':function(){
define("dojox/charting/widget/Chart2D", ["dojo/_base/kernel", "./Chart", "../Chart2D",
	"../action2d/Highlight", "../action2d/Magnify", 
	"../action2d/MoveSlice", "../action2d/Shake", "../action2d/Tooltip"], function(dojo, Chart) {
	dojo.deprecated("dojox.charting.widget.Chart2D", "Use dojo.charting.widget.Chart instead and require all other components explicitly", "2.0");
	return dojox.charting.widget.Chart2D = Chart;
});

},
'dojo/cache':function(){
define("dojo/cache", ["./_base/kernel", "./text"], function(dojo, text){
	// module:
	//		dojo/cache
	// summary:
	//		The module defines dojo.cache by loading dojo/text.

	//dojo.cache is defined in dojo/text
	return dojo.cache;
});

},
'dojox/gfx3d':function(){
// AMD-ID "dojox/gfx3d"
define("dojox/gfx3d", ["dojo/_base/kernel","dojox","./gfx3d/matrix","./gfx3d/_base","./gfx3d/object"], function(dojo,dojox) {
dojo.getObject("gfx3d", true, dojox);

return dojox.gfx3d;
});

},
'dojox/charting/themes/Distinctive':function(){
define("dojox/charting/themes/Distinctive", ["../Theme", "./common"], function(Theme, themes){
	
	themes.Distinctive=new Theme({
		colors: [
			"#497c91",
			"#ada9d6",
			"#768b4e",
			"#eeea99",
			"#b39c53",
			"#c28b69",
			"#815454",
			"#bebebe",
			"#59a0bd",
			"#c9c6e4",
			"#677e13",
			"#f0eebb",
			"#e9c756",
			"#cfb09b",
			"#a05a5a",
			"#d8d8d8",
			"#9dc7d9",
			"#7b78a4",
			"#a8c179",
			"#b7b35c",
			"#ebcf81",
			"#956649",
			"#c99999",
			"#868686",
			"#c7e0e9",
			"#8d88c7",
			"#c0d0a0",
			"#e8e667",
			"#efdeb0",
			"#b17044",
			"#ddc0c0",
			"#a5a5a5"
		
		]
	});
	
	return themes.Distinctive;
});

},
'url:dijit/form/templates/Button.html':"<span class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><span class=\"dijitReset dijitInline dijitButtonNode\"\n\t\tdata-dojo-attach-event=\"ondijitclick:_onClick\" role=\"presentation\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode,focusNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\"></span\n\t\t\t><span class=\"dijitReset dijitToggleButtonIconChar\">&#x25CF;</span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t\tdata-dojo-attach-point=\"containerNode\"\n\t\t\t></span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\"\n\t\ttabIndex=\"-1\" role=\"presentation\" data-dojo-attach-point=\"valueNode\"\n/></span>\n",
'dojox/charting/plot2d/Columns':function(){
define("dojox/charting/plot2d/Columns", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Base", "./common", 
		"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils", "dojox/gfx/fx"], 
	function(lang, arr, declare, Base, dc, df, dfr, du, fx){

	var purgeGroup = dfr.lambda("item.purgeGroup()");
/*=====
var Base = dojox.charting.plot2d.Base;
=====*/

	return declare("dojox.charting.plot2d.Columns", Base, {
		//	summary:
		//		The plot object representing a column chart (vertical bars).
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	0,		// gap between columns in pixels
			animate: null,  // animate bars into place
			enableCache: false
		},
		optionalParams: {
			minBarSize:	1,	// minimal column width in pixels
			maxBarSize:	1,	// maximal column width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a columns chart.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectSimpleStats(this.series);
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},
		
		createRect: function(run, creator, params){
			var rect;
			if(this.opt.enableCache && run._rectFreePool.length > 0){
				rect = run._rectFreePool.pop();
				rect.setShape(params);
				// was cleared, add it back
				creator.add(rect);
			}else{
				rect = creator.createRect(params);
			}
			if(this.opt.enableCache){
				run._rectUsePool.push(rect);
			}
			return rect;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Columns
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			var t = this.getSeriesStats();
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				min = Math.max(0, Math.floor(this._hScaler.bounds.from - 1)), max = Math.ceil(this._hScaler.bounds.to),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(this.opt.enableCache){
					run._rectFreePool = (run._rectFreePool?run._rectFreePool:[]).concat(run._rectUsePool?run._rectUsePool:[]);
					run._rectUsePool = [];
				}
				var theme = t.next("column", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				var l = Math.min(run.data.length, max);
				for(var j = min; j < l; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							vv = vt(v),
							height = vv - baselineHeight,
							h = Math.abs(height),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "column", value, true) :
								t.post(theme, "column");
						if(width >= 1 && h >= 0){
							var rect = {
								x: offsets.l + ht(j + 0.5) + gap,
								y: dim.height - offsets.b - (v > baseline ? vv : baselineHeight),
								width: width, height: h
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = this.createRect(run, s, rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									x:       j + 0.5,
									y:       v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b - baselineHeight, h);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Columns
		},
		_animateColumn: function(shape, voffset, vsize){
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, voffset - (voffset/vsize)], end: [0, 0]},
					{name: "scale", start: [1, 1/vsize], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});

},
'dojo/text':function(){
define("dojo/text", ["./_base/kernel", "require", "./has", "./_base/xhr"], function(dojo, require, has, xhr){
	// module:
	//		dojo/text
	// summary:
	//		This module implements the !dojo/text plugin and the dojo.cache API.
	// description:
	//		We choose to include our own plugin to leverage functionality already contained in dojo
	//		and thereby reduce the size of the plugin compared to various foreign loader implementations.
	//		Also, this allows foreign AMD loaders to be used without their plugins.
	//
	//		CAUTION: this module is designed to optionally function synchronously to support the dojo v1.x synchronous
	//		loader. This feature is outside the scope of the CommonJS plugins specification.

	var getText;
	if(1){
		getText= function(url, sync, load){
			xhr("GET", {url:url, sync:!!sync, load:load});
		};
	}else{
		// TODOC: only works for dojo AMD loader
		if(require.getText){
			getText= require.getText;
		}else{
			console.error("dojo/text plugin failed to load because loader does not support getText");
		}
	}

	var
		theCache= {},

		strip= function(text){
			//Strips <?xml ...?> declarations so that external SVG and XML
			//documents can be added to a document without worry. Also, if the string
			//is an HTML document, only the part inside the body tag is returned.
			if(text){
				text= text.replace(/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im, "");
				var matches= text.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
				if(matches){
					text= matches[1];
				}
			}else{
				text = "";
			}
			return text;
		},

		notFound = {},

		pending = {},

		result= {
			dynamic:
				// the dojo/text caches it's own resources because of dojo.cache
				true,

			normalize:function(id, toAbsMid){
				// id is something like (path may be relative):
				//
				//	 "path/to/text.html"
				//	 "path/to/text.html!strip"
				var parts= id.split("!"),
					url= parts[0];
				return (/^\./.test(url) ? toAbsMid(url) : url) + (parts[1] ? "!" + parts[1] : "");
			},

			load:function(id, require, load){
				// id is something like (path is always absolute):
				//
				//	 "path/to/text.html"
				//	 "path/to/text.html!strip"
				var
					parts= id.split("!"),
					stripFlag= parts.length>1,
					absMid= parts[0],
					url = require.toUrl(parts[0]),
					text = notFound,
					finish = function(text){
						load(stripFlag ? strip(text) : text);
					};
				if(absMid in theCache){
					text = theCache[absMid];
				}else if(url in require.cache){
					text = require.cache[url];
				}else if(url in theCache){
					text = theCache[url];
				}
				if(text===notFound){
					if(pending[url]){
						pending[url].push(finish);
					}else{
						var pendingList = pending[url] = [finish];
						getText(url, !require.async, function(text){
							theCache[absMid]= theCache[url]= text;
							for(var i = 0; i<pendingList.length;){
								pendingList[i++](text);
							}
							delete pending[url];
						});
					}
				}else{
					finish(text);
				}
			}
		};

	dojo.cache= function(/*String||Object*/module, /*String*/url, /*String||Object?*/value){
		//	 * (string string [value]) => (module, url, value)
		//	 * (object [value])        => (module, value), url defaults to ""
		//
		//	 * if module is an object, then it must be convertable to a string
		//	 * (module, url) module + (url ? ("/" + url) : "") must be a legal argument to require.toUrl
		//	 * value may be a string or an object; if an object then may have the properties "value" and/or "sanitize"
		var key;
		if(typeof module=="string"){
			if(/\//.test(module)){
				// module is a version 1.7+ resolved path
				key = module;
				value = url;
			}else{
				// module is a version 1.6- argument to dojo.moduleUrl
				key = require.toUrl(module.replace(/\./g, "/") + (url ? ("/" + url) : ""));
			}
		}else{
			key = module + "";
			value = url;
		}
		var
			val = (value != undefined && typeof value != "string") ? value.value : value,
			sanitize = value && value.sanitize;

		if(typeof val == "string"){
			//We have a string, set cache value
			theCache[key] = val;
			return sanitize ? strip(val) : val;
		}else if(val === null){
			//Remove cached value
			delete theCache[key];
			return null;
		}else{
			//Allow cache values to be empty strings. If key property does
			//not exist, fetch it.
			if(!(key in theCache)){
				getText(key, true, function(text){
					theCache[key]= text;
				});
			}
			return sanitize ? strip(theCache[key]) : theCache[key];
		}
	};

	return result;

/*=====
dojo.cache = function(module, url, value){
	// summary:
	//		A getter and setter for storing the string content associated with the
	//		module and url arguments.
	// description:
	//		If module is a string that contains slashes, then it is interpretted as a fully
	//		resolved path (typically a result returned by require.toUrl), and url should not be
	//		provided. This is the preferred signature. If module is a string that does not
	//		contain slashes, then url must also be provided and module and url are used to
	//		call `dojo.moduleUrl()` to generate a module URL. This signature is deprecated.
	//		If value is specified, the cache value for the moduleUrl will be set to
	//		that value. Otherwise, dojo.cache will fetch the moduleUrl and store it
	//		in its internal cache and return that cached value for the URL. To clear
	//		a cache value pass null for value. Since XMLHttpRequest (XHR) is used to fetch the
	//		the URL contents, only modules on the same domain of the page can use this capability.
	//		The build system can inline the cache values though, to allow for xdomain hosting.
	// module: String||Object
	//		If a String with slashes, a fully resolved path; if a String without slashes, the
	//		module name to use for the base part of the URL, similar to module argument
	//		to `dojo.moduleUrl`. If an Object, something that has a .toString() method that
	//		generates a valid path for the cache item. For example, a dojo._Url object.
	// url: String
	//		The rest of the path to append to the path derived from the module argument. If
	//		module is an object, then this second argument should be the "value" argument instead.
	// value: String||Object?
	//		If a String, the value to use in the cache for the module/url combination.
	//		If an Object, it can have two properties: value and sanitize. The value property
	//		should be the value to use in the cache, and sanitize can be set to true or false,
	//		to indicate if XML declarations should be removed from the value and if the HTML
	//		inside a body tag in the value should be extracted as the real value. The value argument
	//		or the value property on the value argument are usually only used by the build system
	//		as it inlines cache content.
	//	example:
	//		To ask dojo.cache to fetch content and store it in the cache (the dojo["cache"] style
	//		of call is used to avoid an issue with the build system erroneously trying to intern
	//		this example. To get the build system to intern your dojo.cache calls, use the
	//		"dojo.cache" style of call):
	//		| //If template.html contains "<h1>Hello</h1>" that will be
	//		| //the value for the text variable.
	//		| var text = dojo["cache"]("my.module", "template.html");
	//	example:
	//		To ask dojo.cache to fetch content and store it in the cache, and sanitize the input
	//		 (the dojo["cache"] style of call is used to avoid an issue with the build system
	//		erroneously trying to intern this example. To get the build system to intern your
	//		dojo.cache calls, use the "dojo.cache" style of call):
	//		| //If template.html contains "<html><body><h1>Hello</h1></body></html>", the
	//		| //text variable will contain just "<h1>Hello</h1>".
	//		| var text = dojo["cache"]("my.module", "template.html", {sanitize: true});
	//	example:
	//		Same example as previous, but demostrates how an object can be passed in as
	//		the first argument, then the value argument can then be the second argument.
	//		| //If template.html contains "<html><body><h1>Hello</h1></body></html>", the
	//		| //text variable will contain just "<h1>Hello</h1>".
	//		| var text = dojo["cache"](new dojo._Url("my/module/template.html"), {sanitize: true});
	return val; //String
};
=====*/
});


},
'dojox/charting/themes/PlotKit/orange':function(){
define("dojox/charting/themes/PlotKit/orange", ["./base", "../../Theme"], function(pk, Theme){
	pk.orange = pk.base.clone();
	pk.orange.chart.fill = pk.orange.plotarea.fill = "#f5eee6";
	pk.orange.colors = Theme.defineColors({hue: 31, saturation: 60, low: 40, high: 88});
	
	return pk.orange;
});

},
'dojox/charting/themes/BlueDusk':function(){
define("dojox/charting/themes/BlueDusk", ["../Theme", "./common"], function(Theme, themes){

	themes.BlueDusk=new Theme({
		colors: [
			"#292e76",
			"#3e56a6",
			"#10143f",
			"#33449c",
			"#798dcd"
		]
	});
	
	return themes.BlueDusk;
});

},
'url:dijit/form/templates/CheckBox.html':"<div class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><input\n\t \t${!nameAttrSetting} type=\"${type}\" ${checkedAttrSetting}\n\t\tclass=\"dijitReset dijitCheckBoxInput\"\n\t\tdata-dojo-attach-point=\"focusNode\"\n\t \tdata-dojo-attach-event=\"onclick:_onClick\"\n/></div>\n",
'dojox/string/BidiEngine':function(){
define("dojox/string/BidiEngine", ["dojo/_base/lang", "dojo/_base/declare"], 
  function(lang,declare){
lang.getObject("string", true, dojox);

declare("dojox.string.BidiEngine", null, {
	// summary:
	//		This class provides a bidi transformation engine, i.e.
	//		functions for reordering and shaping bidi text.
	// description:
	//		Bidi stands for support for languages with a bidirectional script. 
	//
	//		Usually Unicode Bidi Algorithm used by OS platform (and web browsers) is capable of properly transforming
	//		Bidi text and as a result it is adequately displayed on the screen. However, in some situations, 
	//		Unicode Bidi Algorithm is not invoked or is not properly applied. This may occur in situation in which software
	//		responsible for rendering the text is not leveraging Unicode Bidi Algorithm implemented by OS (e.g. dojox.GFX renderers).
	//
	//		Bidi engine provided in this class implements Unicode Bidi Algorithm as specified at:
	//			http://www.unicode.org/reports/tr9/. 
	//
	//		For more information on basic Bidi concepts please read following article:
	//			"Bidirectional script support - A primer" available from:
	//				http://www.ibm.com/developerworks/websphere/library/techarticles/bidi/bidigen.html
	//
	//		As of February 2011, Bidi engine has following limitations:
	//			1. No support for following numeric shaping options: 
	//				H - Hindi, 
	//				C - Contextual, 
	//				N - Nominal.
	//			2. No support for following shaping options: 
	//				I - Initial shaping, 
	//				M - Middle shaping, 
	//				F - Final shaping, 
	//				B - Isolated shaping.
	//			3. No support for source-to-target or/and target-to-source maps.
	//			4. No support for LRE/RLE/LRO/RLO/PDF (they are handled like neutrals).
	//			5. No support for Windows compatibility.
	//			6. No support for  insert/remove marks.
	//			7. No support for code pages (currently only UTF-8 is supported. Ideally we should convert from any code page to UTF-8).
	
	bidiTransform: function (/*String*/text, /*String*/formatIn, /*String*/formatOut){
		// summary:
		//		Central public API for Bidi engine. Transforms the text according to formatIn, formatOut parameters.
		//		If formatIn or formatOut parametrs are not valid throws an exception.
		// inputText:
		//		Input text subject to application of Bidi transformation.
		// formatIn:
		//		Input Bidi layout in which inputText is passed to the function.
		// formatOut:
		//		Output Bidi layout to which inputText should be transformed.
		// description:
		//		Both formatIn and formatOut parameters are 5 letters long strings. 
		//		For example - "ILYNN". Each letter is associated with specific attribute of Bidi layout. 
		//		Possible and default values for each one of the letters are provided below:
		//
		//		First letter:
		//			Letter position/index:	
		//				1
		//			Letter meaning:			
		//				Ordering Schema.
		//			Possible values:
		//				I - Implicit (Logical).
		//				V - Visual.
		//			Default value:
		//				I
		//
		//		Second letter:
		//			Letter position/index:	
		//				2
		//			Letter meaning:			
		//				Orientation.
		//			Possible values:
		//				L - Left To Right.
		//				R - Right To Left.
		//				C - Contextual Left to Right.
		//				D - Contextual Right to Left.
		//			Default value:
		//				L		
		//
		//		Third letter:
		//			Letter position/index:	
		//				3
		//			Letter meaning:			
		//				Symmetric Swapping.
		//			Possible values:
		//				Y - Symmetric swapping is on.
		//				N - Symmetric swapping is off.
		//			Default value:
		//				Y		
		//
		//		Fourth letter:
		//			Letter position/index:	
		//				4
		//			Letter meaning:			
		//				Shaping.
		//			Possible values:
		//				S - Text is shaped.
		//				N - Text is not shaped.
		//			Default value:
		//				N				
		//
		//		Fifth letter:
		//			Letter position/index:	
		//				5
		//			Letter meaning:			
		//				Numeric Shaping.
		//			Possible values:
		//				N - Nominal.
		//			Default value:
		//				N				
		//
		//		The output of this function is original text (passed via first argument) transformed from input Bidi layout (second argument)
		//		to output Bidi layout (last argument). 
		//
		//		Sample call:
		//	|	mytext = bidiTransform("HELLO WORLD", "ILYNN", "VLYNN");
		//		In this case, "HELLO WORLD" text is transformed from Logical - LTR to Visual - LTR Bidi layout with 
		//		default values for symmetric swapping (Yes), shaping (Not shaped) and numeric shaping (Nominal).
		// returns: /*String*/ or throws an exception.
		//		Original text transformed from input Bidi layout (second argument)
		//		to output Bidi layout (last argument).
		//		Throws an exception if the bidi layout strings are not valid.
		// tags:
		//		public
		
		if(!text){
			return '';
		}
		if(!formatIn && !formatOut){
			return text;
		}

		// regex for format validation
		// Allowed values for format string are:
		// 1st letter- I, V
		// 2nd letter- L, R, C, D
		// 3rd letter- Y, N
		// 4th letter- S, N
		// 5th letter- N
		var validFormat = /^[(I|V)][(L|R|C|D)][(Y|N)][(S|N)][N]$/;
		if(!validFormat.test(formatIn) || !validFormat.test(formatOut)){
			throw new Error("dojox.string.BidiEngine: the bidi layout string is wrong!");
		}

		if(formatIn == formatOut){
			return text;
		}

		var orientIn = getOrientation(formatIn.charAt(1))
			, orientOut = getOrientation(formatOut.charAt(1))
			, os_in = (formatIn.charAt(0) == 'I') ? 'L' : formatIn.charAt(0)
			, os_out = (formatOut.charAt(0) == 'I') ? 'L' : formatOut.charAt(0)
			, inFormat = os_in + orientIn
			, outFormat = os_out + orientOut
			, swap = formatIn.charAt(2) + formatOut.charAt(2)
			;

		if(inFormat){
			bdx.defInFormat = inFormat;
		}
		if(outFormat){
			bdx.defOutFormat = outFormat;
		}
		if(swap){
			bdx.defSwap = swap;
		}
		
		var stage1_text = doBidiReorder(text, os_in + orientIn, os_out + orientOut, formatIn.charAt(2) + formatOut.charAt(2))
			, isRtl = false;

		if(formatOut.charAt(1) == 'R'){
			isRtl = true;
		}else if(formatOut.charAt(1) == 'C' || formatOut.charAt(1) == 'D'){
			isRtl = this.checkContextual(stage1_text);
		}
		if(formatIn.charAt(3) == formatOut.charAt(3)){
			return stage1_text;
		}else if(formatOut.charAt(3) == 'S'){
			return shape(isRtl, stage1_text, true);
		}
		if(formatOut.charAt(3) == 'N'){
			return deshape(stage1_text, isRtl, true);
		}
	},
	checkContextual: function(/*String*/text){
		// summary: 	
		//		Determine the base direction of a bidi text according
		//		to its first strong directional character.
		// text: 
		//		The text to check.
		// returns: /*String*/
		//		"ltr" or "rtl" according to the first strong character.
		//		If there is no strong character, returns the value of the
		//		document dir property.
		// tags:
		//		public		
		var dir = firstStrongDir(text);
		if(dir != "ltr" && dir != "rtl"){
			dir = document.dir.toLowerCase();
			if(dir != "ltr" && dir != "rtl"){dir = "ltr";}
		}
		return dir;
	},
	hasBidiChar: function(/*String*/text){
		// summary:
		//		Return true if text contains RTL directed character.
		// text:
		//		The source string.
		// description:
		//		Iterates over the text string, letter by letter starting from its beginning,
		//		searching for RTL directed character. 
		//		Return true if found else false. Needed for vml transformation.
		// returns: /*Boolean*/
		//		true - if text has a RTL directed character.
		//		false - otherwise. 
		// tags:
		//		public

		var type = null, uc = null,	hi = null;
		for(var i = 0; i < text.length; i++){
			uc = text.charAt(i).charCodeAt(0);
			hi = MasterTable[uc >> 8];
			type = hi < TBBASE ? hi : UnicodeTable[hi - TBBASE][uc & 0xFF];
			if(type == UBAT_R || type == UBAT_AL){
				return true;
			}
			if(type == UBAT_B){
				break;
			}
		}
		return false;
	}	

});


function doBidiReorder(/*String*/text, /*String*/inFormat,
						/*String*/outFormat, /*String*/swap){
	// summary: 	
	//		Reorder the source text according to the bidi attributes
	//		of source and result.
	//	text:
	//		The text to reorder.
	//	inFormat:	
	//		Ordering scheme and base direction of the source text.
	//		Can be "LLTR", "LRTL", "LCLR", "LCRL", "VLTR", "VRTL",
	//		"VCLR", "VCRL".
	//		The first letter is "L" for logical ordering scheme,
	//		"V" for visual ordering scheme.
	//		The other letters specify the base direction.
	//		"CLR" means contextual direction defaulting to LTR if
	//		there is no strong letter.
	//		"CRL" means contextual direction defaulting to RTL if
	//		there is no strong letter.
	//		The initial value is "LLTR", if none, the initial value is used.
	//	outFormat:	
	//		Required ordering scheme and base direction of the
	//		result. Has the same format as inFormat.
	//		If none, the initial value "VLTR" is used.
	//	swap:
	//		Symmetric swapping attributes of source and result.
	//		The allowed values can be "YN", "NY", "YY" and "NN".
	//		The first letter reflects the symmetric swapping attribute
	//		of the source, the second letter that of the result.	
	// returns:
	//		Text reordered according to source and result attributes.

	if(inFormat == undefined){
		inFormat = bdx.defInFormat;
	}
	if(outFormat == undefined){
		outFormat = bdx.defOutFormat;
	}
	if(swap == undefined){
		swap = bdx.defSwap;
	}
	if(inFormat == outFormat){
		return text;
	}
	var dir, inOrdering = inFormat.substring(0,1)
		, inOrientation = inFormat.substring(1,4)
		, outOrdering = outFormat.substring(0,1)
		, outOrientation = outFormat.substring(1,4)
		;
	if(inOrientation.charAt(0) == "C"){
		dir = firstStrongDir(text);
		if(dir == "ltr" || dir == "rtl"){
			inOrientation = dir.toUpperCase();
		}else{
			inOrientation = inFormat.charAt(2) == "L" ? "LTR" : "RTL";
		}
		inFormat = inOrdering + inOrientation;
	}
	if(outOrientation.charAt(0) == "C"){
		dir = firstStrongDir(text);
		if(dir == "rtl"){
			outOrientation = "RTL";
		}else if(dir == "ltr"){
			dir = lastStrongDir(text);
			outOrientation = dir.toUpperCase();
		}else{
			outOrientation = outFormat.charAt(2) == "L" ? "LTR" : "RTL";
		}
		outFormat = outOrdering + outOrientation;
	}
	if(inFormat == outFormat){
		return text;
	}
	bdx.inFormat = inFormat;
	bdx.outFormat = outFormat;
	bdx.swap = swap;
	if((inOrdering == "L") && (outFormat == "VLTR")){ //core cases
		//cases: LLTR->VLTR, LRTL->VLTR
		if(inOrientation == "LTR"){
			bdx.dir = LTR;
			return doReorder(text);
		}
		if(inOrientation == "RTL"){
			bdx.dir = RTL;
			return doReorder(text);
		}
	}
	if((inOrdering == "V") && (outOrdering == "V")){
		//inOrientation != outOrientation
		//cases: VRTL->VLTR, VLTR->VRTL
		return invertStr(text);
	}
	if((inOrdering == "L") && (outFormat == "VRTL")){
		//cases: LLTR->VRTL, LRTL->VRTL
		if(inOrientation == "LTR"){
			bdx.dir = LTR;
			text = doReorder(text);
		}else{
			//inOrientation == RTL
			bdx.dir = RTL;
			text = doReorder(text);
		}
		return invertStr(text);
	}
	if((inFormat == "VLTR") && (outFormat == "LLTR")){
		//case: VLTR->LLTR
		bdx.dir = LTR;
		return doReorder(text);
	}
	if((inOrdering == "V") && (outOrdering == "L") && (inOrientation != outOrientation)){
		//cases: VLTR->LRTL, VRTL->LLTR
		text = invertStr(text);

		return (inOrientation == "RTL") ? doBidiReorder(text, "LLTR","VLTR", swap) : doBidiReorder(text, "LRTL","VRTL", swap);
	}
	if((inFormat == "VRTL") && (outFormat == "LRTL")){
		//case VRTL->LRTL
		return doBidiReorder(text, "LRTL","VRTL", swap);
	}
	if((inOrdering == "L") && (outOrdering == "L")){
		//inOrientation != outOrientation
		//cases: LRTL->LLTR, LLTR->LRTL
		var saveSwap = bdx.swap;
		bdx.swap = saveSwap.substr(0, 1) + "N";
		if(inOrientation == "RTL"){
			//LRTL->LLTR
			bdx.dir = RTL;
			text = doReorder(text);
			bdx.swap = "N" + saveSwap.substr(1, 2);
			bdx.dir = LTR;
			text = doReorder(text);
		}else{ //LLTR->LRTL
			bdx.dir = LTR;
			text = doReorder(text);
			bdx.swap = "N" + saveSwap.substr(1, 2);
			text = doBidiReorder(text, "VLTR","LRTL", bdx.swap);
		}
		return text;
	}

};

function shape(/*boolean*/rtl, /*String*/text, /*boolean*/compress){
	// summary:
	//		Shape the source text.
	// rtl:
	//		Flag indicating if the text is in RTL direction (logical
	//		direction for Arabic words).
	// text:
	//		The text to shape.
	// compress:
	//		A flag indicates to insert extra space after the lam alef compression
	//		to preserve the buffer size or not insert an extra space which will lead
	//		to decrease the buffer size. this option can be:
	//		- true (default) to not insert extra space after compressing Lam+Alef into one character Lamalef
	//		- false to insert an extra space after compressed Lamalef to preserve the buffer size
	// returns:
	//		text shaped.
	// tags:
	//		private.
	
	if(text.length == 0){
		return;
	}
	if(rtl == undefined){
		rtl = true;
	}
	if(compress == undefined){
		compress = true;
	}
	text = new String(text);
	
	var str06 = text.split("")
		, Ix = 0
		, step = +1
		, nIEnd = str06.length
		;
	if(!rtl){
		Ix = str06.length - 1;
		step = -1;
		nIEnd = 1;
	}
	var previousCursive = 0, compressArray = [], compressArrayIndx = 0;
	for(var index = Ix; index * step < nIEnd; index = index + step){
		if(isArabicAlefbet(str06[index]) || isArabicDiacritics(str06[index])){
			// Arabic letter Lam
			if(str06[index] == '\u0644'){
				if(isNextAlef(str06, (index + step), step, nIEnd)){
					str06[index] = (previousCursive == 0) ? getLamAlefFE(str06[index + step], LamAlefInialTableFE) : getLamAlefFE(str06[index + step], LamAlefMedialTableFE);
					index += step;
					setAlefToSpace(str06, index, step, nIEnd);
					if(compress){
						compressArray[compressArrayIndx] = index;
						compressArrayIndx++;
					}
					previousCursive = 0;
					continue;
				}
			}
			var currentChr = str06[index];
			if(previousCursive == 1){
				// if next is Arabic
				//Character is in medial form
				// else character is in final form
				str06[index] = (isNextArabic(str06, (index + step), step, nIEnd)) ? 
					getMedialFormCharacterFE(str06[index]) : getFormCharacterFE(str06[index], FinalForm);
			}else{
				if(isNextArabic(str06, (index + step), step, nIEnd) == true){
					//character is in Initial form
					str06[index] = getFormCharacterFE(str06[index],InitialForm);
				}else{
					str06[index] = getFormCharacterFE(str06[index], IsolatedForm);
				}
			}
			//exam if the current character is cursive
			if(!isArabicDiacritics(currentChr)){
				previousCursive = 1;
			}
			if(isStandAlonCharacter(currentChr) == true){
				previousCursive = 0;
			}
		}else{
			previousCursive = 0;
		}
	}
	var outBuf = "";
	for(idx = 0; idx < str06.length; idx++){
		if(!(compress && indexOf(compressArray, compressArray.length, idx) > -1)){
			outBuf += str06[idx];
		}
	}
	return outBuf;
};
function firstStrongDir(/*String*/text){
	// summary:
	//		Return the first strong character direction
	// text:
	//		The source string.
	// description:
	//		Iterates over the text string, letter by letter starting from its beginning,
	//		searching for first "strong" character. 
	//		Returns if strong character was found with the direction defined by this 
	//		character, if no strong character was found returns an empty string.
	// returns: /*String*/
	//		"ltr" - if the first strong character is Latin.
	//		"rtl" - if the first strong character is RTL directed character.
	//		"" - if the strong character wasn't found.
	// tags:
	//		private

	var type = null, uc = null, hi = null;
	for(var i = 0; i < text.length; i++){
		uc = text.charAt(i).charCodeAt(0);
		hi = MasterTable[uc >> 8];
		type = hi < TBBASE ? hi : UnicodeTable[hi - TBBASE][uc & 0xFF];
		if(type == UBAT_R || type == UBAT_AL){
			return "rtl";
		}
		if(type == UBAT_L){
			return	"ltr";
		}
		if(type == UBAT_B){
			break;
		}
	}
	return "";
};
function lastStrongDir(text){
	// summary:
	//		Return the last strong character direction
	// text:
	//		The source string.
	// description:
	//		Iterates over the text string, letter by letter starting from its end,
	//		searching for first (from the end) "strong" character. 
	//		Returns if strong character was found with the direction defined by this 
	//		character, if no strong character was found returns an empty string.
	// tags:
	//		private		
	var type = null;
	for(var i = text.length - 1; i >= 0; i--){
		type = getCharacterType(text.charAt(i));
		if(type == UBAT_R || type == UBAT_AL){
			return "rtl";
		}
		if(type == UBAT_L){
			return	"ltr";
		}
		if(type == UBAT_B){
			break;
		}
	}
	return "";
};
function deshape(/*String*/text, /*boolean*/rtl, /*boolean*/consume_next_space){
	// summary:
	//		deshape the source text.
	// text:
	//		the text to be deshape.
	// rtl:
	//		flag indicating if the text is in RTL direction (logical
	//		direction for Arabic words).
	// consume_next_space:
	//		flag indicating whether to consume the space next to the 
	//		the lam alef if there is a space followed the Lamalef character to preserve the buffer size. 
	//		In case there is no space next to the lam alef the buffer size will be increased due to the
	//		expansion of the lam alef one character into lam+alef two characters
	// returns:	text deshaped.
	if(text.length == 0){
		return;
	}
	if(consume_next_space == undefined){
		consume_next_space = true;
	}
	if(rtl == undefined){
		rtl = true;
	}
	text = new String(text);

	var outBuf = "", strFE = [], textBuff = "";
	if(consume_next_space){
		for(var j = 0; j < text.length; j++){
			if(text.charAt(j) == ' '){
				if(rtl){
					if(j > 0){
						if(text.charAt(j - 1) >= '\uFEF5' && text.charAt(j - 1) <= '\uFEFC'){
							continue;
						}
					}
				}else{
					if(j+1 < text.length){
						if(text.charAt(j + 1) >= '\uFEF5' && text.charAt(j + 1) <= '\uFEFC'){
							continue;
						}
					}				
				}
			}
			textBuff += text.charAt(j);
		}
	}else{
		textBuff = new String(text);
	}
	strFE = textBuff.split("");
	for(var i = 0; i < textBuff.length; i++){
		if(strFE[i] >= '\uFE70' && strFE[i] < '\uFEFF'){
			var chNum = textBuff.charCodeAt(i);
			if(strFE[i] >= '\uFEF5' && strFE[i] <= '\uFEFC'){
				//expand the LamAlef
				if(rtl){
					//Lam + Alef
					outBuf += '\u0644';
					outBuf += AlefTable[parseInt((chNum - 65269) / 2)];
				}else{
					outBuf += AlefTable[parseInt((chNum - 65269) / 2)];
					outBuf += '\u0644';
				}
			}else{
				outBuf += FETo06Table[chNum - 65136];
			}
		}else{
			outBuf += strFE[i];
		}
	}
	return outBuf;
};
function doReorder(str){
	// summary:
	//		Helper to the doBidiReorder. Manages the UBA.
	// str:
	//		the string to reorder.
	// returns:
	//		text reordered according to source and result attributes.
	// tags: 
	//		private	
	var chars = str.split(""), levels = [];

	computeLevels(chars, levels);
	swapChars(chars, levels);
	invertLevel(2, chars, levels);
	invertLevel(1, chars, levels);
	return chars.join("");
};
function computeLevels(chars, levels){
	var len = chars.length
		, impTab = bdx.dir ? impTab_RTL : impTab_LTR
		, prevState = null, newClass = null, newLevel = null, newState = 0
		, action = null, cond = null, condPos = -1, i = null, ix = null
		, types = []
		, classes = []
		;
	bdx.hiLevel = bdx.dir;
	bdx.lastArabic = false;
	bdx.hasUBAT_AL = false,
	bdx.hasUBAT_B = false;
	bdx.hasUBAT_S = false;
	for(i = 0; i < len; i++){
		types[i] = getCharacterType(chars[i]);
	}
	for(ix = 0; ix < len; ix++){
		prevState = newState;
		classes[ix] = newClass = getCharClass(chars, types, classes, ix);
		newState = impTab[prevState][newClass];
		action = newState & 0xF0;
		newState &= 0x0F;
		levels[ix] = newLevel = impTab[newState][ITIL];
		if(action > 0){
			if(action == 0x10){	// set conditional run to level 1
				for(i = condPos; i < ix; i++){
					levels[i] = 1;
				}
				condPos = -1;
			}else{	// 0x20 confirm the conditional run
				condPos = -1;
			}
		}
		cond = impTab[newState][ITCOND];
		if(cond){
			if(condPos == -1){
				condPos = ix;
			}
		}else{	// unconditional level
			if(condPos > -1){
				for(i = condPos; i < ix; i++){
					levels[i] = newLevel;
				}
				condPos = -1;
			}
		}
		if(types[ix] == UBAT_B){
			levels[ix] = 0;
		}
		bdx.hiLevel |= newLevel;
	}
	if(bdx.hasUBAT_S){
		for(i = 0; i < len; i++){
			if(types[i] == UBAT_S){
				levels[i] = bdx.dir;
				for(var j = i - 1; j >= 0; j--){
					if(types[j] == UBAT_WS){
						levels[j] = bdx.dir;
					}else{
						break;
					}
				}
			}
		}
	}
};
function swapChars(chars, levels){
	// summary:
	//		Swap characters with symmetrical mirroring as all kinds of parenthesis.
	//		(When needed).
	// chars:
	//		The source string as Array of characters.
	// levels:
	//		An array (like hash) of flags for each character in the source string,
	//		that defines if swapping should be applied on the following character.
	// description:
	//		First checks if the swapping should be applied, if not returns, else 
	//		uses the levels "hash" to find what characters should be swapped.
	// tags:
	//		private	

	if(bdx.hiLevel == 0 || bdx.swap.substr(0, 1) == bdx.swap.substr(1, 2)){
		return;
	};

	//console.log("bdx.hiLevel == 0: " + bdx.hiLevel + "bdx.swap[0]: "+ bdx.swap[0] +" bdx.swap[1]: " +bdx.swap[1]);
	for(var i = 0; i < chars.length; i++){
		if(levels[i] == 1){chars[i] = getMirror(chars[i]);}
	}
};
function getCharacterType(ch){
	// summary:
	//		Return the type of the character.
	// ch:
	//		The character to be checked.

	// description:
	//		Check the type of the character according to MasterTable,
	//		type = LTR, RTL, neutral,Arabic-Indic digit etc.
	// tags:
	//		private			
	var uc = ch.charCodeAt(0)
		, hi = MasterTable[uc >> 8];
	return (hi < TBBASE) ? hi : UnicodeTable[hi - TBBASE][uc & 0xFF];
};
function invertStr(str){
	// summary:
	//		Return the reversed string.
	// str:
	//		The string to be reversed.
	// description:
	//		Reverse the string str.
	// tags:
	//		private					
	var chars = str.split("");
	chars.reverse();
	return chars.join("");
};
function indexOf(cArray, cLength, idx){
	var counter = -1;
	for(var i = 0; i < cLength; i++){
		if(cArray[i] == idx){
			return i;
		}
	}
	return -1;
};
function isArabicAlefbet(c){
	for(var i = 0; i < ArabicAlefBetIntervalsBegine.length; i++){
		if(c >= ArabicAlefBetIntervalsBegine[i] && c <= ArabicAlefBetIntervalsEnd[i]){
			return true;
		}
	}
	return false;
};
function isNextArabic(str06, index, step, nIEnd){
	while(((index) * step) < nIEnd && isArabicDiacritics(str06[index])){
		index += step;
	}
	if(((index) * step) < nIEnd && isArabicAlefbet(str06[index])){
		return true;
	}
	return false;
};
function isNextAlef(str06, index, step, nIEnd){
	while(((index) * step) < nIEnd && isArabicDiacritics(str06[index])){
		index += step;
	}
	var c = ' ';
	if(((index) * step) < nIEnd){
		c = str06[index];
	}else{
		return false;
	}
	for(var i = 0; i < AlefTable.length; i++){
		if(AlefTable[i] == c){
			return true;
		}
	}
	return false;
};
function invertLevel(lev, chars, levels){
	if(bdx.hiLevel < lev){
		return;
	}
	if(lev == 1 && bdx.dir == RTL && !bdx.hasUBAT_B){
		chars.reverse();
		return;
	}
	var len = chars.length, start = 0, end, lo, hi, tmp;
	while(start < len){
		if(levels[start] >= lev){
			end = start + 1;
			while(end < len && levels[end] >= lev){
				end++;
			}
			for(lo = start, hi = end - 1 ; lo < hi; lo++, hi--){
				tmp = chars[lo];
				chars[lo] = chars[hi];
				chars[hi] = tmp;
			}
			start = end;
		}
		start++;
	}
};
function getCharClass(chars, types, classes, ix){
	// summary:
	//		Return the class if ix character in chars.
	// chars:
	//		The source string as Array of characters.
	// types:
	//		Array of types, for each character in chars.
	// classes:
	//		Array of classes that already been solved. 
	// ix:
	//		the index of checked character.
	// tags:
	//		private				
	var cType = types[ix], wType, nType, len, i;
	switch(cType){
		case UBAT_L:
		case UBAT_R:
			bdx.lastArabic = false;
		case UBAT_ON:
		case UBAT_AN:
			return cType;
		case UBAT_EN:
			return bdx.lastArabic ? UBAT_AN : UBAT_EN;
		case UBAT_AL:
			bdx.lastArabic = true;
			bdx.hasUBAT_AL = true;
			return UBAT_R;
		case UBAT_WS:
			return UBAT_ON;
		case UBAT_CS:
			if(ix < 1 || (ix + 1) >= types.length ||
				((wType = classes[ix - 1]) != UBAT_EN && wType != UBAT_AN) ||
				((nType = types[ix + 1]) != UBAT_EN && nType != UBAT_AN)){
				return UBAT_ON;
			}
			if(bdx.lastArabic){nType = UBAT_AN;}
			return nType == wType ? nType : UBAT_ON;
		case UBAT_ES:
			wType = ix > 0 ? classes[ix - 1] : UBAT_B;
			if(wType == UBAT_EN && (ix + 1) < types.length && types[ix + 1] == UBAT_EN){
				return UBAT_EN;
			}
			return UBAT_ON;
		case UBAT_ET:
			if(ix > 0 && classes[ix - 1] == UBAT_EN){
				return UBAT_EN;
			}
			if(bdx.lastArabic){
				return UBAT_ON;
			}
			i = ix + 1;
			len = types.length;
			while(i < len && types[i] == UBAT_ET){
				i++;
			}
			if(i < len && types[i] == UBAT_EN){
				return UBAT_EN;
			}
			return UBAT_ON;
		case UBAT_NSM:
			if(bdx.inFormat == "VLTR"){	// visual to implicit transformation
				len = types.length;
				i = ix + 1;
				while(i < len && types[i] == UBAT_NSM){
					i++;
				}
				if(i < len){
					var c = chars[ix]
						, rtlCandidate = (c >= 0x0591 && c <= 0x08FF) || c == 0xFB1E
						;
					wType = types[i];
					if(rtlCandidate && (wType == UBAT_R || wType == UBAT_AL)){
						return UBAT_R;
					}
				}
			}
			if(ix < 1 || (wType = types[ix - 1]) == UBAT_B){
				return UBAT_ON;
			}
			return classes[ix - 1];
		case UBAT_B:
			lastArabic = false;
			bdx.hasUBAT_B = true;
			return bdx.dir;
		case UBAT_S:
			bdx.hasUBAT_S = true;
			return UBAT_ON;
		case UBAT_LRE:
		case UBAT_RLE:
		case UBAT_LRO:
		case UBAT_RLO:
		case UBAT_PDF:
			lastArabic = false;
		case UBAT_BN:
			return UBAT_ON;
	}
};
function getMirror(c){
	// summary:
	//		Calculates the mirrored character of c
	// c:
	//		The character to be mirrored.
	// tags:
	//		private					
	var mid, low = 0, high = SwapTable.length - 1;

	while(low <= high){
		mid = Math.floor((low + high) / 2);
		if(c < SwapTable[mid][0]){
			high = mid - 1;
		}else if(c > SwapTable[mid][0]){
			low = mid + 1;
		}else{
			return SwapTable[mid][1];
		}
	}
	return c;
};
function isStandAlonCharacter(c){
	for(var i = 0; i < StandAlonForm.length; i++){
		if(StandAlonForm[i] == c){
			return true;
		}
	}
	return false;
};
function getMedialFormCharacterFE(c){
	for(var i = 0; i < BaseForm.length; i++){
		if(c == BaseForm[i]){
			return MedialForm[i];
		}
	}
	return c;
};
function getFormCharacterFE(/*char*/ c, /*char[]*/formArr){
	for(var i = 0; i < BaseForm.length; i++){
		if(c == BaseForm[i]){
			return formArr[i];
		}
	}
	return c;
};
function isArabicDiacritics(c){
	return	(c >= '\u064b' && c <= '\u0655') ? true : false;
};
function getOrientation(/*Char*/ oc){
	if(oc == 'L'){
		return "LTR";
	}
	if(oc == 'R'){
		return "RTL";
	}
	if(oc == 'C'){
		return "CLR";
	}
	if(oc == 'D'){
		return "CRL";
	}
};
function setAlefToSpace(str06, index, step, nIEnd){
	while(((index) * step) < nIEnd && isArabicDiacritics(str06[index])){
		index += step;
	}
	if(((index) * step) < nIEnd){
		str06[index] = ' ';
		return true;
	}
	return false;
};
function getLamAlefFE(alef06, LamAlefForm){
	for(var i = 0; i < AlefTable.length; i++){
		if(alef06 == AlefTable[i]){
			return LamAlefForm[i];
		}
	}
	return alef06;
};
function LamAlef(alef){
	// summary:
	//		If the alef variable is an ARABIC ALEF letter,
	//		return the LamAlef code associated with the specific 
	//		alef character.
	// alef:
	//		The alef code type.
	// description:
	//		If "alef" is an ARABIC ALEF letter, identify which alef is it,
	//		using AlefTable, then return the LamAlef associated with it.
	// tags:
	//		private			
	for(var i = 0; i < AlefTable.length; i++){
		if(AlefTable[i] == alef){
			return AlefTable[i];
		}
	}
	return 0;
};

var	bdx = {
		dir: 0,
		defInFormat: "LLTR",
		defoutFormat: "VLTR",
		defSwap: "YN",
		inFormat: "LLTR",
		outFormat: "VLTR",
		swap: "YN",
		hiLevel: 0,
		lastArabic: false,
		hasUBAT_AL: false,
		hasBlockSep: false,
		hasSegSep: false
};

var ITIL = 5;

var ITCOND = 6;

var LTR = 0;

var RTL = 1;

/****************************************************************************/
/* Array in which directional characters are replaced by their symmetric.	*/
/****************************************************************************/
var SwapTable = [
	[ "\u0028", "\u0029" ],	/* Round brackets					*/
	[ "\u0029", "\u0028" ],
	[ "\u003C", "\u003E" ],	/* Less than/greater than			*/
	[ "\u003E", "\u003C" ],
	[ "\u005B", "\u005D" ],	/* Square brackets					*/
	[ "\u005D", "\u005B" ],
	[ "\u007B", "\u007D" ],	/* Curly brackets					*/
	[ "\u007D", "\u007B" ],
	[ "\u00AB", "\u00BB" ],	/* Double angle quotation marks	*/
	[ "\u00BB", "\u00AB" ],
	[ "\u2039", "\u203A" ],	/* single angle quotation mark		*/
	[ "\u203A", "\u2039" ],
	[ "\u207D", "\u207E" ],	/* Superscript parentheses			*/
	[ "\u207E", "\u207D" ],
	[ "\u208D", "\u208E" ],	/* Subscript parentheses			*/
	[ "\u208E", "\u208D" ],
	[ "\u2264", "\u2265" ],	/* Less/greater than or equal		*/
	[ "\u2265", "\u2264" ],
	[ "\u2329", "\u232A" ],	/* Angle brackets					*/
	[ "\u232A", "\u2329" ],
	[ "\uFE59", "\uFE5A" ],	/* Small round brackets			*/
	[ "\uFE5A", "\uFE59" ],
	[ "\uFE5B", "\uFE5C" ],	/* Small curly brackets			*/
	[ "\uFE5C", "\uFE5B" ],
	[ "\uFE5D", "\uFE5E" ],	/* Small tortoise shell brackets	*/
	[ "\uFE5E", "\uFE5D" ],
	[ "\uFE64", "\uFE65" ],	/* Small less than/greater than	*/
	[ "\uFE65", "\uFE64" ]
];
var AlefTable = ['\u0622', '\u0623', '\u0625', '\u0627'];

var AlefTableFE = [0xFE81, 0xFE82, 0xFE83, 0xFE84, 0xFE87, 0xFE88, 0xFE8D, 0xFE8E];

var LamTableFE = [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0];

var LamAlefInialTableFE = ['\ufef5', '\ufef7', '\ufef9', '\ufefb'];

var LamAlefMedialTableFE = ['\ufef6', '\ufef8', '\ufefa', '\ufefc'];
/**
 * Arabic Characters in the base form
 */
var BaseForm = ['\u0627', '\u0628', '\u062A', '\u062B', '\u062C', '\u062D', '\u062E', '\u062F', '\u0630', '\u0631', '\u0632', '\u0633', '\u0634', '\u0635', '\u0636', '\u0637', '\u0638', '\u0639', '\u063A', '\u0641', '\u0642', '\u0643', '\u0644', '\u0645', '\u0646', '\u0647', '\u0648', '\u064A', '\u0625', '\u0623', '\u0622', '\u0629', '\u0649', '\u06CC', '\u0626', '\u0624', '\u064B', '\u064C', '\u064D', '\u064E', '\u064F', '\u0650', '\u0651', '\u0652', '\u0621'];

/**
 * Arabic shaped characters in Isolated form
 */
var IsolatedForm = ['\uFE8D', '\uFE8F', '\uFE95', '\uFE99', '\uFE9D', '\uFEA1', '\uFEA5', '\uFEA9', '\uFEAB', '\uFEAD', '\uFEAF', '\uFEB1', '\uFEB5', '\uFEB9', '\uFEBD', '\uFEC1', '\uFEC5', '\uFEC9', '\uFECD', '\uFED1', '\uFED5', '\uFED9', '\uFEDD', '\uFEE1', '\uFEE5', '\uFEE9', '\uFEED', '\uFEF1', '\uFE87', '\uFE83', '\uFE81', '\uFE93', '\uFEEF', '\uFBFC', '\uFE89', '\uFE85', '\uFE70', '\uFE72', '\uFE74', '\uFE76', '\uFE78', '\uFE7A', '\uFE7C', '\uFE7E', '\uFE80'];

/**
 * Arabic shaped characters in Final form
 */
var FinalForm = ['\uFE8E', '\uFE90', '\uFE96', '\uFE9A', '\uFE9E', '\uFEA2', '\uFEA6', '\uFEAA', '\uFEAC', '\uFEAE', '\uFEB0', '\uFEB2', '\uFEB6', '\uFEBA', '\uFEBE', '\uFEC2', '\uFEC6', '\uFECA', '\uFECE', '\uFED2', '\uFED6', '\uFEDA', '\uFEDE', '\uFEE2', '\uFEE6', '\uFEEA', '\uFEEE', '\uFEF2', '\uFE88', '\uFE84', '\uFE82', '\uFE94', '\uFEF0', '\uFBFD', '\uFE8A', '\uFE86', '\uFE70', '\uFE72', '\uFE74', '\uFE76', '\uFE78', '\uFE7A', '\uFE7C', '\uFE7E', '\uFE80'];

/**
 * Arabic shaped characters in Media form
 */
var MedialForm = ['\uFE8E', '\uFE92', '\uFE98', '\uFE9C', '\uFEA0', '\uFEA4', '\uFEA8', '\uFEAA', '\uFEAC', '\uFEAE', '\uFEB0', '\uFEB4', '\uFEB8', '\uFEBC', '\uFEC0', '\uFEC4', '\uFEC8', '\uFECC', '\uFED0', '\uFED4', '\uFED8', '\uFEDC', '\uFEE0', '\uFEE4', '\uFEE8', '\uFEEC', '\uFEEE', '\uFEF4', '\uFE88', '\uFE84', '\uFE82', '\uFE94', '\uFEF0', '\uFBFF', '\uFE8C', '\uFE86', '\uFE71', '\uFE72', '\uFE74', '\uFE77', '\uFE79', '\uFE7B', '\uFE7D', '\uFE7F', '\uFE80'];

/**
 * Arabic shaped characters in Initial form
 */
var InitialForm = ['\uFE8D', '\uFE91', '\uFE97', '\uFE9B', '\uFE9F', '\uFEA3', '\uFEA7', '\uFEA9', '\uFEAB', '\uFEAD', '\uFEAF', '\uFEB3', '\uFEB7', '\uFEBB', '\uFEBF', '\uFEC3', '\uFEC7', '\uFECB', '\uFECF', '\uFED3', '\uFED7', '\uFEDB', '\uFEDF', '\uFEE3', '\uFEE7', '\uFEEB', '\uFEED', '\uFEF3', '\uFE87', '\uFE83', '\uFE81', '\uFE93', '\uFEEF', '\uFBFE', '\uFE8B', '\uFE85', '\uFE70', '\uFE72', '\uFE74', '\uFE76', '\uFE78', '\uFE7A', '\uFE7C', '\uFE7E', '\uFE80'];

/**
 * Arabic characters that couldn't join to the next character
 */
var StandAlonForm = ['\u0621', '\u0627', '\u062F', '\u0630', '\u0631', '\u0632', '\u0648', '\u0622', '\u0629', '\u0626', '\u0624', '\u0625', '\u0675', '\u0623'];

var FETo06Table = ['\u064B', '\u064B', '\u064C', '\u061F', '\u064D', '\u061F', '\u064E', '\u064E', '\u064F', '\u064F', '\u0650', '\u0650', '\u0651', '\u0651', '\u0652', '\u0652', '\u0621', '\u0622', '\u0622', '\u0623', '\u0623', '\u0624', '\u0624', '\u0625', '\u0625', '\u0626', '\u0626', '\u0626', '\u0626', '\u0627', '\u0627', '\u0628', '\u0628', '\u0628', '\u0628', '\u0629', '\u0629', '\u062A', '\u062A', '\u062A', '\u062A', '\u062B', '\u062B', '\u062B', '\u062B', '\u062C', '\u062C', '\u062C', '\u062c', '\u062D', '\u062D', '\u062D', '\u062D', '\u062E', '\u062E', '\u062E', '\u062E', '\u062F', '\u062F', '\u0630', '\u0630', '\u0631', '\u0631', '\u0632', '\u0632', '\u0633', '\u0633', '\u0633', '\u0633', '\u0634', '\u0634', '\u0634', '\u0634', '\u0635', '\u0635', '\u0635', '\u0635', '\u0636', '\u0636', '\u0636', '\u0636', '\u0637', '\u0637', '\u0637', '\u0637', '\u0638', '\u0638', '\u0638', '\u0638', '\u0639', '\u0639', '\u0639', '\u0639', '\u063A', '\u063A', '\u063A', '\u063A', '\u0641', '\u0641', '\u0641', '\u0641', '\u0642', '\u0642', '\u0642', '\u0642', '\u0643', '\u0643', '\u0643', '\u0643', '\u0644', '\u0644', '\u0644', '\u0644', '\u0645', '\u0645', '\u0645', '\u0645', '\u0646', '\u0646', '\u0646', '\u0646', '\u0647', '\u0647', '\u0647', '\u0647', '\u0648', '\u0648', '\u0649', '\u0649', '\u064A', '\u064A', '\u064A', '\u064A', '\uFEF5', '\uFEF6', '\uFEF7', '\uFEF8', '\uFEF9', '\uFEFA', '\uFEFB', '\uFEFC', '\u061F', '\u061F', '\u061F'];

var ArabicAlefBetIntervalsBegine = ['\u0621', '\u0641'];

var ArabicAlefBetIntervalsEnd = ['\u063A', '\u064a'];

var Link06 = [
	1			+ 32 + 256 * 0x11,
	1			+ 32 + 256 * 0x13,
	1			+ 256 * 0x15,
	1			+ 32 + 256 * 0x17,
	1 + 2		+ 256 * 0x19,
	1			+ 32 + 256 * 0x1D,
	1 + 2		+ 256 * 0x1F,
	1			+ 256 * 0x23,
	1 + 2		+ 256 * 0x25,
	1 + 2		+ 256 * 0x29,
	1 + 2		+ 256 * 0x2D,
	1 + 2		+ 256 * 0x31,
	1 + 2		+ 256 * 0x35,
	1			+ 256 * 0x39,
	1			+ 256 * 0x3B,
	1			+ 256 * 0x3D,
	1			+ 256 * 0x3F,
	1 + 2		+ 256 * 0x41,
	1 + 2		+ 256 * 0x45,
	1 + 2		+ 256 * 0x49,
	1 + 2		+ 256 * 0x4D,
	1 + 2		+ 256 * 0x51,
	1 + 2		+ 256 * 0x55,
	1 + 2		+ 256 * 0x59,
	1 + 2		+ 256 * 0x5D,
	0, 0, 0, 0, 0,	/* 0x63B - 0x63F */
	1 + 2,
	1 + 2		+ 256 * 0x61,
	1 + 2		+ 256 * 0x65,
	1 + 2		+ 256 * 0x69,
	1 + 2		+ 16 + 256 * 0x6D,
	1 + 2		+ 256 * 0x71,
	1 + 2		+ 256 * 0x75,
	1 + 2		+ 256 * 0x79,
	1			+ 256 * 0x7D,
	1			+ 256 * 0x7F,
	1 + 2		+ 256 * 0x81,
	4, 4, 4, 4,
	4, 4, 4, 4, 	/* 0x64B - 0x652 */
	0, 0, 0, 0, 0,
	0, 0, 0, 0, 	/* 0x653 - 0x65B */
	1			+ 256 * 0x85,
	1			+ 256 * 0x87,
	1			+ 256 * 0x89,
	1			+ 256 * 0x8B,
	0, 0, 0, 0, 0,
	0, 0, 0, 0, 0,
	0, 0, 0, 0, 0, 0,/* 0x660 - 0x66F */
	4,
	0,
	1			+ 32,
	1			+ 32,
	0,
	1			+ 32,
	1, 1,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2,
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	1, 1, 1, 1, 1, 1, 1, 1,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2, 1+2,
	1,
	1+2,
	1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
	1+2,
	1,
	1+2, 1+2, 1+2, 1+2,
	1, 1
];

var LinkFE = [
	1 + 2,
	1 + 2,
	1 + 2, 0, 1+ 2, 0, 1+ 2,
	1 + 2,
	1+ 2, 1 + 2, 1+2, 1 + 2,
	1+ 2, 1 + 2, 1+2, 1 + 2,
	0, 0 + 32, 1 + 32, 0 + 32,
	1 + 32, 0, 1, 0 + 32,
	1 + 32, 0, 2, 1 + 2,
	1, 0 + 32, 1 + 32, 0,
	2, 1 + 2, 1, 0,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 2, 1 + 2,
	1, 0, 1, 0,
	1, 0, 1, 0,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0 + 16, 2 + 16, 1 + 2 +16,
	1 + 16, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 2, 1+2,
	1, 0, 1, 0,
	1, 0, 2, 1+2,
	1, 0, 1, 0,
	1, 0, 1, 0,
	1
];
var	impTab_LTR = [
					/*		L,		R,		EN,		AN,		N,		IL,		Cond */
	/* 0 LTR text	*/	[	0,		3,		0,		1,		0,		0,		0	],
	/* 1 LTR+AN		*/	[	0,		3,		0,		1,		2,		2,		0	],
	/* 2 LTR+AN+N	*/	[	0,		3,		0,		0x11,	2,		0,		1	],
	/* 3 RTL text	*/	[	0,		3,		5,		5,		4,		1,		0	],
	/* 4 RTL cont	*/	[	0,		3,		0x15,	0x15,	4,		0,		1	],
	/* 5 RTL+EN/AN	*/	[	0,		3,		5,		5,		4,		2,		0	]
];
var impTab_RTL = [
					/*		L,		R,		EN,		AN,		N,		IL,		Cond */
	/* 0 RTL text	*/	[	2,		0,		1,		1,		0,		1,		0	],
	/* 1 RTL+EN/AN	*/	[	2,		0,		1,		1,		0,		2,		0	],
	/* 2 LTR text	*/	[	2,		0,		2,		1,		3,		2,		0	],
	/* 3 LTR+cont	*/	[	2,		0,		2,		0x21,	3,		1,		1	]
];

var UBAT_L	= 0; /* left to right				*/
var UBAT_R	= 1; /* right to left				*/
var UBAT_EN = 2; /* European digit				*/
var UBAT_AN = 3; /* Arabic-Indic digit			*/
var UBAT_ON = 4; /* neutral						*/
var UBAT_B	= 5; /* block separator				*/
var UBAT_S	= 6; /* segment separator			*/
var UBAT_AL = 7; /* Arabic Letter				*/
var UBAT_WS = 8; /* white space					*/
var UBAT_CS = 9; /* common digit separator		*/
var UBAT_ES = 10; /* European digit separator	*/
var UBAT_ET = 11; /* European digit terminator	*/
var UBAT_NSM = 12; /* Non Spacing Mark			*/
var UBAT_LRE = 13; /* LRE						*/
var UBAT_RLE = 14; /* RLE						*/
var UBAT_PDF = 15; /* PDF						*/
var UBAT_LRO = 16; /* LRO						*/
var UBAT_RLO = 17; /* RLO						*/
var UBAT_BN	= 18; /* Boundary Neutral			*/

var TBBASE = 100;

var TB00 = TBBASE + 0;
var TB05 = TBBASE + 1;
var TB06 = TBBASE + 2;
var TB07 = TBBASE + 3;
var TB20 = TBBASE + 4;
var TBFB = TBBASE + 5;
var TBFE = TBBASE + 6;
var TBFF = TBBASE + 7;

var L	= UBAT_L;
var R	= UBAT_R;
var EN	= UBAT_EN;
var AN	= UBAT_AN;
var ON	= UBAT_ON;
var B	= UBAT_B;
var S	= UBAT_S;
var AL	= UBAT_AL;
var WS	= UBAT_WS;
var CS	= UBAT_CS;
var ES	= UBAT_ES;
var ET	= UBAT_ET;
var NSM	= UBAT_NSM;
var LRE	= UBAT_LRE;
var RLE	= UBAT_RLE;
var PDF	= UBAT_PDF;
var LRO	= UBAT_LRO;
var RLO	= UBAT_RLO;
var BN	= UBAT_BN;

var MasterTable = [
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	TB00,	L	,	L	,	L	,	L	,	TB05,	TB06,	TB07,	R	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*1-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*2-*/	TB20,	ON	,	ON	,	ON	,	L	,	ON	,	L	,	ON	,	L	,	ON	,	ON	,	ON	,	L	,	L	,	ON	,	ON	,
	/*3-*/	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	ON	,
	/*5-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*6-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*7-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*8-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*9-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,
	/*A-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,
	/*B-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	ON	,	ON	,	L	,	L	,	ON	,	ON	,	L	,
	/*E-*/	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*F-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	L	,	TBFB,	AL	,	AL	,	TBFE,	TBFF
];

delete TB00;
delete TB05;
delete TB06;
delete TB07;
delete TB20;
delete TBFB;
delete TBFE;
delete TBFF;

var UnicodeTable = [
	[ /*	Table 00: Unicode 00xx */
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	S	,	B	,	S	,	WS	,	B	,	BN	,	BN	,
	/*1-*/	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	B	,	B	,	B	,	S	,
	/*2-*/	WS	,	ON	,	ON	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ES	,	CS	,	ES	,	CS	,	CS	,
	/*3-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*5-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*6-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*7-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	BN	,
	/*8-*/	BN	,	BN	,	BN	,	BN	,	BN	,	B	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,
	/*9-*/	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,
	/*A-*/	CS	,	ON	,	ET	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	L	,	ON	,	ON	,	BN	,	ON	,	ON	,
	/*B-*/	ET	,	ET	,	EN	,	EN	,	ON	,	L	,	ON	,	ON	,	ON	,	EN	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*D-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*E-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*F-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L
	],
	[ /*	Table 01: Unicode 05xx */
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*1-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*2-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	 , ON	,	ON	,
	/*3-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*4-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*5-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*6-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*7-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*8-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*9-*/	ON	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*A-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*B-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	R	,	NSM	,
	/*C-*/	R	,	NSM	,	NSM	,	R	,	NSM	,	NSM	,	R	,	NSM	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*E-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*F-*/	R	,	R	,	R	,	R	,	R	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON
	],
	[ /*	Table 02: Unicode 06xx */
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	AN	,	AN	,	AN	,	AN	,	ON	,	ON	,	ON	,	ON	,	AL	,	ET	,	ET	,	AL	,	CS	,	AL	,	ON	,	ON	,
	/*1-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	AL	,	ON	,	ON	,	AL	,	AL	,
	/*2-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*3-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*4-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*5-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*6-*/	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	AN	,	ET	,	AN	,	AN	,	AL	,	AL	,	AL	,
	/*7-*/	NSM	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*B-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*C-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*D-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	AN	,	ON	,	NSM	,
	/*E-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	AL	,	AL	,	NSM	,	NSM	,	ON	,	NSM	,	NSM	,	NSM	,	NSM	,	AL	,	AL	,
	/*F-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL
	],
	[	/*	Table	03:	Unicode	07xx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	ON	,	AL	,
	/*1-*/	AL	,	NSM	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*2-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*3-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*4-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	ON	,	ON	,	AL	,	AL	,	AL	,
	/*5-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*6-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*7-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*B-*/	NSM	,	AL	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*D-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*E-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*F-*/	NSM	,	NSM	,	NSM	,	NSM	,	R	,	R	,	ON	,	ON	,	ON	,	ON	,	R	,	ON	,	ON	,	ON	,	ON	,	ON
	],
	[	/*	Table	04:	Unicode	20xx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	WS	,	BN	,	BN	,	BN	,	L	,	R	,
	/*1-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*2-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	WS	,	B	,	LRE	,	RLE	,	PDF	,	LRO	,	RLO	,	CS	,
	/*3-*/	ET	,	ET	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	ON	,	ON	,	ON	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*5-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	WS	,
	/*6-*/	BN	,	BN	,	BN	,	BN	,	BN	,	ON	,	ON	,	ON	,	ON	,	ON	,	BN	,	BN	,	BN	,	BN	,	BN	,	BN	,
	/*7-*/	EN	,	L	,	ON	,	ON	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	ES	,	ES	,	ON	,	ON	,	ON	,	L	,
	/*8-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	ES	,	ES	,	ON	,	ON	,	ON	,	ON	,
	/*9-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,
	/*A-*/	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,
	/*B-*/	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*C-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*E-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*F-*/	NSM	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON
	],
	[	/*	Table	05:	Unicode	FBxx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*1-*/	ON	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,	R	,	NSM	,	R	,
	/*2-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	ES	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*3-*/	R	,	R	,	R	,	R	,	R	,	R	,	R	,	ON	,	R	,	R	,	R	,	R	,	R	,	ON	,	R	,	ON	,
	/*4-*/	R	,	R	,	ON	,	R	,	R	,	ON	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,	R	,
	/*5-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*6-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*7-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*B-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*C-*/	AL	,	AL	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*D-*/	ON	,	ON	,	ON	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*E-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*F-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL
	],
	[	/*	Table	06:	Unicode	FExx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,
	/*1-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*2-*/	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	NSM	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*3-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*5-*/	CS	,	ON	,	CS	,	ON	,	ON	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ET	,
	/*6-*/	ON	,	ON	,	ES	,	ES	,	ON	,	ON	,	ON	,	ON	,	ON	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*7-*/	AL	,	AL	,	AL	,	AL	,	AL	,	ON	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*8-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*9-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*A-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*B-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*C-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*D-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*E-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,
	/*F-*/	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	AL	,	ON	,	ON	,	BN
	],
	[	/*	Table	07:	Unicode	FFxx	*/
	/************************************************************************************************************************************/
	/*		0		1		2		3		4		5		6		7		8		9		A		B		C		D		E		F	*/
	/************************************************************************************************************************************/
	/*0-*/	ON	,	ON	,	ON	,	ET	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ES	,	CS	,	ES	,	CS	,	CS	,
	/*1-*/	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	EN	,	CS	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*2-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*3-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*4-*/	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*5-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*6-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*7-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*8-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*9-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*A-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*B-*/	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,
	/*C-*/	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,
	/*D-*/	ON	,	ON	,	L	,	L	,	L	,	L	,	L	,	L	,	ON	,	ON	,	L	,	L	,	L	,	ON	,	ON	,	ON	,
	/*E-*/	ET	,	ET	,	ON	,	ON	,	ON	,	ET	,	ET	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,
	/*F-*/	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON	,	ON
	]
];

delete L;
delete R;
delete EN;
delete AN;
delete ON;
delete B;
delete S;
delete AL;
delete WS;
delete CS;
delete ES;
delete ET;
delete NSM;
delete LRE;
delete RLE;
delete PDF;
delete LRO;
delete RLO;
delete BN;

return dojox.string.BidiEngine;
});

},
'dojox/gfx3d/scheduler':function(){
define("dojox/gfx3d/scheduler", [
	"dojo/_base/lang",
	"dojo/_base/array",	// dojo.forEach, dojo.every
	"dojo/_base/declare",	// dojo.declare
	"./_base",
	"./vector"
], function(lang, arrayUtil, declare, gfx3d, vectorUtil){

gfx3d.scheduler = {
	zOrder: function(buffer, order){
		order = order ? order : gfx3d.scheduler.order;
		buffer.sort(function(a, b){
			return order(b) - order(a);
		});
		return buffer;
	},

	bsp: function(buffer, outline){
		// console.debug("BSP scheduler");
		outline = outline ? outline : gfx3d.scheduler.outline;
		var p = new gfx3d.scheduler.BinarySearchTree(buffer[0], outline);
		arrayUtil.forEach(buffer.slice(1), function(item){ p.add(item, outline); });
		return p.iterate(outline);
	},

	// default implementation
	order: function(it){
		return it.getZOrder();
	},

	outline: function(it){
		return it.getOutline();
	}
};

var BST = declare("dojox.gfx3d.scheduler.BinarySearchTree", null, {
	constructor: function(obj, outline){
		// summary: build the binary search tree, using binary space partition algorithm.
		// The idea is for any polygon, for example, (a, b, c), the space is divided by
		// the plane into two space: plus and minus.
		//
		// for any arbitary vertex p, if(p - a) dotProduct n = 0, p is inside the plane,
		// > 0, p is in the plus space, vice versa for minus space.
		// n is the normal vector that is perpendicular the plate, defined as:
		//            n = ( b - a) crossProduct ( c - a )
		//
		// in this implementation, n is declared as normal, ,a is declared as orient.
		//
		// obj: object: dojox.gfx3d.Object
		this.plus = null;
		this.minus = null;
		this.object = obj;

		var o = outline(obj);
		this.orient = o[0];
		this.normal = vectorUtil.normalize(o);
	},

	add: function(obj, outline){
		var epsilon = 0.5,
			o = outline(obj),
			v = vectorUtil,
			n = this.normal,
			a = this.orient,
			BST = gfx3d.scheduler.BinarySearchTree;

		if(
			arrayUtil.every(o, function(item){
				return Math.floor(epsilon + v.dotProduct(n, v.substract(item, a))) <= 0;
			})
		){
			if(this.minus){
				this.minus.add(obj, outline);
			}else{
				this.minus = new BST(obj, outline);
			}
		}else if(
			arrayUtil.every(o, function(item){
				return Math.floor(epsilon + v.dotProduct(n, v.substract(item, a))) >= 0;
			})
		){
			if(this.plus){
				this.plus.add(obj, outline);
			} else {
				this.plus = new BST(obj, outline);
			}
		}else{
			/*
			arrayUtil.forEach(o, function(item){
				console.debug(v.dotProduct(n, v.substract(item, a)));
			});
			*/
			throw "The case: polygon cross siblings' plate is not implemented yet";
		}
	},

	iterate: function(outline){
		var epsilon = 0.5;
		var v = vectorUtil;
		var sorted = [];
		var subs = null;
		// FIXME: using Infinity here?
		var view = {x: 0, y: 0, z: -10000};
		if(Math.floor( epsilon + v.dotProduct(this.normal, v.substract(view, this.orient))) <= 0){
			subs = [this.plus, this.minus];
		}else{
			subs = [this.minus, this.plus];
		}

		if(subs[0]){
			sorted = sorted.concat(subs[0].iterate());
		}

		sorted.push(this.object);

		if(subs[1]){
			sorted = sorted.concat(subs[1].iterate());
		}
		return sorted;
	}

});

gfx3d.drawer = {
	conservative: function(todos, objects, viewport){
		// console.debug('conservative draw');
		arrayUtil.forEach(this.objects, function(item){
			item.destroy();
		});
		arrayUtil.forEach(objects, function(item){
			item.draw(viewport.lighting);
		});
	},
	chart: function(todos, objects, viewport){
		// NOTE: ondemand may require the todos' objects to use setShape
		// to redraw themselves to maintain the z-order.

		// console.debug('chart draw');
		arrayUtil.forEach(this.todos, function(item){
			item.draw(viewport.lighting);
		});
	}
	// More aggrasive optimization may re-order the DOM nodes using the order
	// of objects, and only elements of todos call setShape.
};

var api = { 
	scheduler: gfx3d.scheduler,
	drawer: gfx3d.drawer,
	BinarySearchTree: BST
};

return api;
});
},
'dojox/charting/plot2d/StackedBars':function(){
define("dojox/charting/plot2d/StackedBars", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Bars", "./common", 
	"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/functional/sequence"], 
	function(lang, arr, declare, Bars, dc, df, dfr, dfs){

	var	purgeGroup = dfr.lambda("item.purgeGroup()");
/*=====
var bars = dojox.charting.plot2d.Bars;
=====*/
	return declare("dojox.charting.plot2d.StackedBars", Bars, {
		//	summary:
		//		The plot object representing a stacked bar chart (horizontal bars).
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectStackedStats(this.series), t;
			this._maxRunLength = stats.hmax;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			t = stats.hmin, stats.hmin = stats.vmin, stats.vmin = t;
			t = stats.hmax, stats.hmax = stats.vmax, stats.vmax = t;
			return stats;
		},
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.StackedBars
			//		A reference to this plot for functional chaining.
			if(this._maxRunLength <= 0){
				return this;
			}

			// stack all values
			var acc = df.repeat(this._maxRunLength, "-> 0", 0);
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i];
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] += v;
					}
				}
			}
			// draw runs in backwards
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, height,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				events = this.events();
			f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt);
			gap = f.gap;
			height = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("bar", [this.opt, run]), s = run.group,
					eventSeries = new Array(acc.length);
				for(var j = 0; j < acc.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = acc[j],
							width = ht(v),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "bar", value, true) :
								t.post(theme, "bar");
						if(width >= 0 && height >= 1){
							var rect = {
								x: offsets.l,
								y: dim.height - offsets.b - vt(j + 1.5) + gap,
								width: width, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									x:       v,
									y:       j + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l, -width);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
				// update the accumulator
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] -= v;
					}
				}
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.StackedBars
		}
	});
});

},
'dojox/charting/themes/PlotKit/blue':function(){
define("dojox/charting/themes/PlotKit/blue", ["./base", "../../Theme"], function(pk, Theme){
	pk.blue = pk.base.clone();
	pk.blue.chart.fill = pk.blue.plotarea.fill = "#e7eef6";
	pk.blue.colors = Theme.defineColors({hue: 217, saturation: 60, low: 40, high: 88});
	
	return pk.blue;
});

},
'dojo/uacss':function(){
define("dojo/uacss", ["./dom-geometry", "./_base/lang", "./ready", "./_base/sniff", "./_base/window"],
	function(geometry, lang, ready, has, baseWindow){
	// module:
	//		dojo/uacss
	// summary:
	//		Applies pre-set CSS classes to the top-level HTML node, based on:
	//			- browser (ex: dj_ie)
	//			- browser version (ex: dj_ie6)
	//			- box model (ex: dj_contentBox)
	//			- text direction (ex: dijitRtl)
	//
	//		In addition, browser, browser version, and box model are
	//		combined with an RTL flag when browser text is RTL. ex: dj_ie-rtl.

	var
		html = baseWindow.doc.documentElement,
		ie = has("ie"),
		opera = has("opera"),
		maj = Math.floor,
		ff = has("ff"),
		boxModel = geometry.boxModel.replace(/-/,''),

		classes = {
			"dj_quirks": has("quirks"),

			// NOTE: Opera not supported by dijit
			"dj_opera": opera,

			"dj_khtml": has("khtml"),

			"dj_webkit": has("webkit"),
			"dj_safari": has("safari"),
			"dj_chrome": has("chrome"),

			"dj_gecko": has("mozilla")
		}; // no dojo unsupported browsers

	if(ie){
		classes["dj_ie"] = true;
		classes["dj_ie" + maj(ie)] = true;
		classes["dj_iequirks"] = has("quirks");
	}
	if(ff){
		classes["dj_ff" + maj(ff)] = true;
	}

	classes["dj_" + boxModel] = true;

	// apply browser, browser version, and box model class names
	var classStr = "";
	for(var clz in classes){
		if(classes[clz]){
			classStr += clz + " ";
		}
	}
	html.className = lang.trim(html.className + " " + classStr);

	// If RTL mode, then add dj_rtl flag plus repeat existing classes with -rtl extension.
	// We can't run the code below until the <body> tag has loaded (so we can check for dir=rtl).
	// priority is 90 to run ahead of parser priority of 100
	ready(90, function(){
		if(!geometry.isBodyLtr()){
			var rtlClassStr = "dj_rtl dijitRtl " + classStr.replace(/ /g, "-rtl ");
			html.className = lang.trim(html.className + " " + rtlClassStr + "dj_rtl dijitRtl " + classStr.replace(/ /g, "-rtl "));
		}
	});
	return has;
});

},
'dojox/charting/themes/IndigoNation':function(){
define("dojox/charting/themes/IndigoNation", ["../Theme", "./common"], function(Theme, themes){
	
	//	notes: colors generated by moving in 30 degree increments around the hue circle,
	//		at 90% saturation, using a B value of 75 (HSB model).
	themes.IndigoNation=new Theme({
		colors: [
			"#93a4d0",
			"#3b4152",
			"#687291",
			"#9faed9",
			"#8290b8"
		]
	});
	
	return themes.IndigoNation;
});

},
'dojox/charting/themes/RoyalPurples':function(){
define("dojox/charting/themes/RoyalPurples", ["../Theme", "./common"], function(Theme, themes){
	
	themes.RoyalPurples=new Theme({
		colors: [
			"#473980",
			"#685aa7",
			"#7970b3",
			"#231c3f",
			"#7267ae"
		]
	});
	
	return themes.RoyalPurples;
});

},
'dijit/Tooltip':function(){
require({cache:{
'url:dijit/templates/Tooltip.html':"<div class=\"dijitTooltip dijitTooltipLeft\" id=\"dojoTooltip\"\n\t><div class=\"dijitTooltipContainer dijitTooltipContents\" data-dojo-attach-point=\"containerNode\" role='alert'></div\n\t><div class=\"dijitTooltipConnector\" data-dojo-attach-point=\"connectorNode\"></div\n></div>\n"}});
define("dijit/Tooltip", [
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/_base/fx", // fx.fadeIn fx.fadeOut
	"dojo/dom", // dom.byId
	"dojo/dom-class", // domClass.add
	"dojo/dom-geometry", // domGeometry.position
	"dojo/dom-style", // domStyle.set, domStyle.get
	"dojo/_base/lang", // lang.hitch lang.isArrayLike
	"dojo/_base/sniff", // has("ie")
	"dojo/_base/window", // win.body
	"./_base/manager",	// manager.defaultDuration
	"./place",
	"./_Widget",
	"./_TemplatedMixin",
	"./BackgroundIframe",
	"dojo/text!./templates/Tooltip.html",
	"."		// sets dijit.showTooltip etc. for back-compat
], function(array, declare, fx, dom, domClass, domGeometry, domStyle, lang, has, win,
			manager, place, _Widget, _TemplatedMixin, BackgroundIframe, template, dijit){

/*=====
	var _Widget = dijit._Widget;
	var BackgroundIframe = dijit.BackgroundIframe;
	var _TemplatedMixin = dijit._TemplatedMixin;
=====*/

	// module:
	//		dijit/Tooltip
	// summary:
	//		Defines dijit.Tooltip widget (to display a tooltip), showTooltip()/hideTooltip(), and _MasterTooltip


	var MasterTooltip = declare("dijit._MasterTooltip", [_Widget, _TemplatedMixin], {
		// summary:
		//		Internal widget that holds the actual tooltip markup,
		//		which occurs once per page.
		//		Called by Tooltip widgets which are just containers to hold
		//		the markup
		// tags:
		//		protected

		// duration: Integer
		//		Milliseconds to fade in/fade out
		duration: manager.defaultDuration,

		templateString: template,

		postCreate: function(){
			win.body().appendChild(this.domNode);

			this.bgIframe = new BackgroundIframe(this.domNode);

			// Setup fade-in and fade-out functions.
			this.fadeIn = fx.fadeIn({ node: this.domNode, duration: this.duration, onEnd: lang.hitch(this, "_onShow") });
			this.fadeOut = fx.fadeOut({ node: this.domNode, duration: this.duration, onEnd: lang.hitch(this, "_onHide") });
		},

		show: function(innerHTML, aroundNode, position, rtl, textDir){
			// summary:
			//		Display tooltip w/specified contents to right of specified node
			//		(To left if there's no space on the right, or if rtl == true)
			// innerHTML: String
			//		Contents of the tooltip
			// aroundNode: DomNode || dijit.__Rectangle
			//		Specifies that tooltip should be next to this node / area
			// position: String[]?
			//		List of positions to try to position tooltip (ex: ["right", "above"])
			// rtl: Boolean?
			//		Corresponds to `WidgetBase.dir` attribute, where false means "ltr" and true
			//		means "rtl"; specifies GUI direction, not text direction.
			// textDir: String?
			//		Corresponds to `WidgetBase.textdir` attribute; specifies direction of text.


			if(this.aroundNode && this.aroundNode === aroundNode && this.containerNode.innerHTML == innerHTML){
				return;
			}

			// reset width; it may have been set by orient() on a previous tooltip show()
			this.domNode.width = "auto";

			if(this.fadeOut.status() == "playing"){
				// previous tooltip is being hidden; wait until the hide completes then show new one
				this._onDeck=arguments;
				return;
			}
			this.containerNode.innerHTML=innerHTML;
			
			if(textDir){
				this.set("textDir", textDir);
			}
			this.containerNode.align = rtl? "right" : "left"; //fix the text alignment

			var pos = place.around(this.domNode, aroundNode,
				position && position.length ? position : Tooltip.defaultPosition, !rtl, lang.hitch(this, "orient"));

			// Position the tooltip connector for middle alignment.
			// This could not have been done in orient() since the tooltip wasn't positioned at that time.
			var aroundNodeCoords = pos.aroundNodePos;
			if(pos.corner.charAt(0) == 'M' && pos.aroundCorner.charAt(0) == 'M'){
				this.connectorNode.style.top = aroundNodeCoords.y + ((aroundNodeCoords.h - this.connectorNode.offsetHeight) >> 1) - pos.y + "px";
				this.connectorNode.style.left = "";
			}else if(pos.corner.charAt(1) == 'M' && pos.aroundCorner.charAt(1) == 'M'){
				this.connectorNode.style.left = aroundNodeCoords.x + ((aroundNodeCoords.w - this.connectorNode.offsetWidth) >> 1) - pos.x + "px";
			}

			// show it
			domStyle.set(this.domNode, "opacity", 0);
			this.fadeIn.play();
			this.isShowingNow = true;
			this.aroundNode = aroundNode;
		},

		orient: function(/*DomNode*/ node, /*String*/ aroundCorner, /*String*/ tooltipCorner, /*Object*/ spaceAvailable, /*Object*/ aroundNodeCoords){
			// summary:
			//		Private function to set CSS for tooltip node based on which position it's in.
			//		This is called by the dijit popup code.   It will also reduce the tooltip's
			//		width to whatever width is available
			// tags:
			//		protected

			this.connectorNode.style.top = ""; //reset to default

			// Adjust for space taking by tooltip connector.
			// Take care not to modify the original spaceAvailable arg as that confuses the caller (dijit.place).
			var heightAvailable = spaceAvailable.h,
				widthAvailable = spaceAvailable.w;
			if(aroundCorner.charAt(1) != tooltipCorner.charAt(1)){
				// left/right tooltip
				widthAvailable -= this.connectorNode.offsetWidth;
			}else{
				// above/below tooltip
				heightAvailable -= this.connectorNode.offsetHeight;
			}

			node.className = "dijitTooltip " +
				{
					"MR-ML": "dijitTooltipRight",
					"ML-MR": "dijitTooltipLeft",
					"TM-BM": "dijitTooltipAbove",
					"BM-TM": "dijitTooltipBelow",
					"BL-TL": "dijitTooltipBelow dijitTooltipABLeft",
					"TL-BL": "dijitTooltipAbove dijitTooltipABLeft",
					"BR-TR": "dijitTooltipBelow dijitTooltipABRight",
					"TR-BR": "dijitTooltipAbove dijitTooltipABRight",
					"BR-BL": "dijitTooltipRight",
					"BL-BR": "dijitTooltipLeft"
				}[aroundCorner + "-" + tooltipCorner];

			// reduce tooltip's width to the amount of width available, so that it doesn't overflow screen
			this.domNode.style.width = "auto";
			var size = domGeometry.getContentBox(this.domNode);

			var width = Math.min((Math.max(widthAvailable,1)), size.w);
			var widthWasReduced = width < size.w;

			this.domNode.style.width = width+"px";

			// Reposition the tooltip connector.
			if(tooltipCorner.charAt(0) == 'B' && aroundCorner.charAt(0) == 'B'){
				var bb = domGeometry.position(node);
				var tooltipConnectorHeight = this.connectorNode.offsetHeight;
				if(bb.h > heightAvailable){
					// The tooltip starts at the top of the page and will extend past the aroundNode
					var aroundNodePlacement = heightAvailable - ((aroundNodeCoords.h + tooltipConnectorHeight) >> 1);
					this.connectorNode.style.top = aroundNodePlacement + "px";
					this.connectorNode.style.bottom = "";
				}else{
					// Align center of connector with center of aroundNode, except don't let bottom
					// of connector extend below bottom of tooltip content, or top of connector
					// extend past top of tooltip content
					this.connectorNode.style.bottom = Math.min(
						Math.max(aroundNodeCoords.h/2 - tooltipConnectorHeight/2, 0),
						bb.h - tooltipConnectorHeight) + "px";
					this.connectorNode.style.top = "";
				}
			}else{
				// reset the tooltip back to the defaults
				this.connectorNode.style.top = "";
				this.connectorNode.style.bottom = "";
			}

			return Math.max(0, size.w - widthAvailable);
		},

		_onShow: function(){
			// summary:
			//		Called at end of fade-in operation
			// tags:
			//		protected
			if(has("ie")){
				// the arrow won't show up on a node w/an opacity filter
				this.domNode.style.filter="";
			}
		},

		hide: function(aroundNode){
			// summary:
			//		Hide the tooltip

			if(this._onDeck && this._onDeck[1] == aroundNode){
				// this hide request is for a show() that hasn't even started yet;
				// just cancel the pending show()
				this._onDeck=null;
			}else if(this.aroundNode === aroundNode){
				// this hide request is for the currently displayed tooltip
				this.fadeIn.stop();
				this.isShowingNow = false;
				this.aroundNode = null;
				this.fadeOut.play();
			}else{
				// just ignore the call, it's for a tooltip that has already been erased
			}
		},

		_onHide: function(){
			// summary:
			//		Called at end of fade-out operation
			// tags:
			//		protected

			this.domNode.style.cssText="";	// to position offscreen again
			this.containerNode.innerHTML="";
			if(this._onDeck){
				// a show request has been queued up; do it now
				this.show.apply(this, this._onDeck);
				this._onDeck=null;
			}
		},
		
		_setAutoTextDir: function(/*Object*/node){
		    // summary:
		    //	    Resolve "auto" text direction for children nodes
		    // tags:
		    //		private

            this.applyTextDir(node, has("ie") ? node.outerText : node.textContent);
            array.forEach(node.children, function(child){this._setAutoTextDir(child); }, this);
		},
		
		_setTextDirAttr: function(/*String*/ textDir){
		    // summary:
		    //		Setter for textDir.
		    // description:
		    //		Users shouldn't call this function; they should be calling
		    //		set('textDir', value)
		    // tags:
		    //		private
	
			this._set("textDir", textDir);

			if (textDir == "auto"){
				this._setAutoTextDir(this.containerNode);
			}else{
				this.containerNode.dir = this.textDir;
			}
        }
	});

	dijit.showTooltip = function(innerHTML, aroundNode, position, rtl, textDir){
		// summary:
		//		Static method to display tooltip w/specified contents in specified position.
		//		See description of dijit.Tooltip.defaultPosition for details on position parameter.
		//		If position is not specified then dijit.Tooltip.defaultPosition is used.
		// innerHTML: String
		//		Contents of the tooltip
		// aroundNode: dijit.__Rectangle
		//		Specifies that tooltip should be next to this node / area
		// position: String[]?
		//		List of positions to try to position tooltip (ex: ["right", "above"])
		// rtl: Boolean?
		//		Corresponds to `WidgetBase.dir` attribute, where false means "ltr" and true
		//		means "rtl"; specifies GUI direction, not text direction.
		// textDir: String?
		//		Corresponds to `WidgetBase.textdir` attribute; specifies direction of text.

		// after/before don't work, but they used to, so for back-compat convert them to after-centered, before-centered
		if(position){
			position = array.map(position, function(val){
				return {after: "after-centered", before: "before-centered"}[val] || val;
			});
		}

		if(!Tooltip._masterTT){ dijit._masterTT = Tooltip._masterTT = new MasterTooltip(); }
		return Tooltip._masterTT.show(innerHTML, aroundNode, position, rtl, textDir);
	};

	dijit.hideTooltip = function(aroundNode){
		// summary:
		//		Static method to hide the tooltip displayed via showTooltip()
		return Tooltip._masterTT && Tooltip._masterTT.hide(aroundNode);
	};

	var Tooltip = declare("dijit.Tooltip", _Widget, {
		// summary:
		//		Pops up a tooltip (a help message) when you hover over a node.

		// label: String
		//		Text to display in the tooltip.
		//		Specified as innerHTML when creating the widget from markup.
		label: "",

		// showDelay: Integer
		//		Number of milliseconds to wait after hovering over/focusing on the object, before
		//		the tooltip is displayed.
		showDelay: 400,

		// connectId: String|String[]
		//		Id of domNode(s) to attach the tooltip to.
		//		When user hovers over specified dom node, the tooltip will appear.
		connectId: [],

		// position: String[]
		//		See description of `dijit.Tooltip.defaultPosition` for details on position parameter.
		position: [],

		_setConnectIdAttr: function(/*String|String[]*/ newId){
			// summary:
			//		Connect to specified node(s)

			// Remove connections to old nodes (if there are any)
			array.forEach(this._connections || [], function(nested){
				array.forEach(nested, lang.hitch(this, "disconnect"));
			}, this);

			// Make array of id's to connect to, excluding entries for nodes that don't exist yet, see startup()
			this._connectIds = array.filter(lang.isArrayLike(newId) ? newId : (newId ? [newId] : []),
					function(id){ return dom.byId(id); });

			// Make connections
			this._connections = array.map(this._connectIds, function(id){
				var node = dom.byId(id);
				return [
					this.connect(node, "onmouseenter", "_onHover"),
					this.connect(node, "onmouseleave", "_onUnHover"),
					this.connect(node, "onfocus", "_onHover"),
					this.connect(node, "onblur", "_onUnHover")
				];
			}, this);

			this._set("connectId", newId);
		},

		addTarget: function(/*DOMNODE || String*/ node){
			// summary:
			//		Attach tooltip to specified node if it's not already connected

			// TODO: remove in 2.0 and just use set("connectId", ...) interface

			var id = node.id || node;
			if(array.indexOf(this._connectIds, id) == -1){
				this.set("connectId", this._connectIds.concat(id));
			}
		},

		removeTarget: function(/*DomNode || String*/ node){
			// summary:
			//		Detach tooltip from specified node

			// TODO: remove in 2.0 and just use set("connectId", ...) interface

			var id = node.id || node,	// map from DOMNode back to plain id string
				idx = array.indexOf(this._connectIds, id);
			if(idx >= 0){
				// remove id (modifies original this._connectIds but that's OK in this case)
				this._connectIds.splice(idx, 1);
				this.set("connectId", this._connectIds);
			}
		},

		buildRendering: function(){
			this.inherited(arguments);
			domClass.add(this.domNode,"dijitTooltipData");
		},

		startup: function(){
			this.inherited(arguments);

			// If this tooltip was created in a template, or for some other reason the specified connectId[s]
			// didn't exist during the widget's initialization, then connect now.
			var ids = this.connectId;
			array.forEach(lang.isArrayLike(ids) ? ids : [ids], this.addTarget, this);
		},

		_onHover: function(/*Event*/ e){
			// summary:
			//		Despite the name of this method, it actually handles both hover and focus
			//		events on the target node, setting a timer to show the tooltip.
			// tags:
			//		private
			if(!this._showTimer){
				var target = e.target;
				this._showTimer = setTimeout(lang.hitch(this, function(){this.open(target)}), this.showDelay);
			}
		},

		_onUnHover: function(/*Event*/ /*===== e =====*/){
			// summary:
			//		Despite the name of this method, it actually handles both mouseleave and blur
			//		events on the target node, hiding the tooltip.
			// tags:
			//		private

			// keep a tooltip open if the associated element still has focus (even though the
			// mouse moved away)
			if(this._focus){ return; }

			if(this._showTimer){
				clearTimeout(this._showTimer);
				delete this._showTimer;
			}
			this.close();
		},

		open: function(/*DomNode*/ target){
			// summary:
			//		Display the tooltip; usually not called directly.
			// tags:
			//		private

			if(this._showTimer){
				clearTimeout(this._showTimer);
				delete this._showTimer;
			}
			Tooltip.show(this.label || this.domNode.innerHTML, target, this.position, !this.isLeftToRight(), this.textDir);

			this._connectNode = target;
			this.onShow(target, this.position);
		},

		close: function(){
			// summary:
			//		Hide the tooltip or cancel timer for show of tooltip
			// tags:
			//		private

			if(this._connectNode){
				// if tooltip is currently shown
				Tooltip.hide(this._connectNode);
				delete this._connectNode;
				this.onHide();
			}
			if(this._showTimer){
				// if tooltip is scheduled to be shown (after a brief delay)
				clearTimeout(this._showTimer);
				delete this._showTimer;
			}
		},

		onShow: function(/*===== target, position =====*/){
			// summary:
			//		Called when the tooltip is shown
			// tags:
			//		callback
		},

		onHide: function(){
			// summary:
			//		Called when the tooltip is hidden
			// tags:
			//		callback
		},

		uninitialize: function(){
			this.close();
			this.inherited(arguments);
		}
	});

	Tooltip._MasterTooltip = MasterTooltip;		// for monkey patching
	Tooltip.show = dijit.showTooltip;		// export function through module return value
	Tooltip.hide = dijit.hideTooltip;		// export function through module return value

	// dijit.Tooltip.defaultPosition: String[]
	//		This variable controls the position of tooltips, if the position is not specified to
	//		the Tooltip widget or *TextBox widget itself.  It's an array of strings with the values
	//		possible for `dijit/place::around()`.   The recommended values are:
	//
	//			* before-centered: centers tooltip to the left of the anchor node/widget, or to the right
	//				 in the case of RTL scripts like Hebrew and Arabic
	//			* after-centered: centers tooltip to the right of the anchor node/widget, or to the left
	//				 in the case of RTL scripts like Hebrew and Arabic
	//			* above-centered: tooltip is centered above anchor node
	//			* below-centered: tooltip is centered above anchor node
	//
	//		The list is positions is tried, in order, until a position is found where the tooltip fits
	//		within the viewport.
	//
	//		Be careful setting this parameter.  A value of "above-centered" may work fine until the user scrolls
	//		the screen so that there's no room above the target node.   Nodes with drop downs, like
	//		DropDownButton or FilteringSelect, are especially problematic, in that you need to be sure
	//		that the drop down and tooltip don't overlap, even when the viewport is scrolled so that there
	//		is only room below (or above) the target node, but not both.
	Tooltip.defaultPosition = ["after-centered", "before-centered"];


	return Tooltip;
});

},
'dojo/string':function(){
define("dojo/string", ["./_base/kernel", "./_base/lang"], function(dojo, lang) {
	// module:
	//		dojo/string
	// summary:
	//		TODOC

lang.getObject("string", true, dojo);

/*=====
dojo.string = {
	// summary: String utilities for Dojo
};
=====*/

dojo.string.rep = function(/*String*/str, /*Integer*/num){
	// summary:
	//		Efficiently replicate a string `n` times.
	// str:
	//		the string to replicate
	// num:
	//		number of times to replicate the string

	if(num <= 0 || !str){ return ""; }

	var buf = [];
	for(;;){
		if(num & 1){
			buf.push(str);
		}
		if(!(num >>= 1)){ break; }
		str += str;
	}
	return buf.join("");	// String
};

dojo.string.pad = function(/*String*/text, /*Integer*/size, /*String?*/ch, /*Boolean?*/end){
	// summary:
	//		Pad a string to guarantee that it is at least `size` length by
	//		filling with the character `ch` at either the start or end of the
	//		string. Pads at the start, by default.
	// text:
	//		the string to pad
	// size:
	//		length to provide padding
	// ch:
	//		character to pad, defaults to '0'
	// end:
	//		adds padding at the end if true, otherwise pads at start
	// example:
	//	|	// Fill the string to length 10 with "+" characters on the right.  Yields "Dojo++++++".
	//	|	dojo.string.pad("Dojo", 10, "+", true);

	if(!ch){
		ch = '0';
	}
	var out = String(text),
		pad = dojo.string.rep(ch, Math.ceil((size - out.length) / ch.length));
	return end ? out + pad : pad + out;	// String
};

dojo.string.substitute = function(	/*String*/		template,
									/*Object|Array*/map,
									/*Function?*/	transform,
									/*Object?*/		thisObject){
	// summary:
	//		Performs parameterized substitutions on a string. Throws an
	//		exception if any parameter is unmatched.
	// template:
	//		a string with expressions in the form `${key}` to be replaced or
	//		`${key:format}` which specifies a format function. keys are case-sensitive.
	// map:
	//		hash to search for substitutions
	// transform:
	//		a function to process all parameters before substitution takes
	//		place, e.g. mylib.encodeXML
	// thisObject:
	//		where to look for optional format function; default to the global
	//		namespace
	// example:
	//		Substitutes two expressions in a string from an Array or Object
	//	|	// returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// by providing substitution data in an Array
	//	|	dojo.string.substitute(
	//	|		"File '${0}' is not found in directory '${1}'.",
	//	|		["foo.html","/temp"]
	//	|	);
	//	|
	//	|	// also returns "File 'foo.html' is not found in directory '/temp'."
	//	|	// but provides substitution data in an Object structure.  Dotted
	//	|	// notation may be used to traverse the structure.
	//	|	dojo.string.substitute(
	//	|		"File '${name}' is not found in directory '${info.dir}'.",
	//	|		{ name: "foo.html", info: { dir: "/temp" } }
	//	|	);
	// example:
	//		Use a transform function to modify the values:
	//	|	// returns "file 'foo.html' is not found in directory '/temp'."
	//	|	dojo.string.substitute(
	//	|		"${0} is not found in ${1}.",
	//	|		["foo.html","/temp"],
	//	|		function(str){
	//	|			// try to figure out the type
	//	|			var prefix = (str.charAt(0) == "/") ? "directory": "file";
	//	|			return prefix + " '" + str + "'";
	//	|		}
	//	|	);
	// example:
	//		Use a formatter
	//	|	// returns "thinger -- howdy"
	//	|	dojo.string.substitute(
	//	|		"${0:postfix}", ["thinger"], null, {
	//	|			postfix: function(value, key){
	//	|				return value + " -- howdy";
	//	|			}
	//	|		}
	//	|	);

	thisObject = thisObject || dojo.global;
	transform = transform ?
		lang.hitch(thisObject, transform) : function(v){ return v; };

	return template.replace(/\$\{([^\s\:\}]+)(?:\:([^\s\:\}]+))?\}/g,
		function(match, key, format){
			var value = lang.getObject(key, false, map);
			if(format){
				value = lang.getObject(format, false, thisObject).call(thisObject, value, key);
			}
			return transform(value, key).toString();
		}); // String
};

/*=====
dojo.string.trim = function(str){
	// summary:
	//		Trims whitespace from both sides of the string
	// str: String
	//		String to be trimmed
	// returns: String
	//		Returns the trimmed string
	// description:
	//		This version of trim() was taken from [Steven Levithan's blog](http://blog.stevenlevithan.com/archives/faster-trim-javascript).
	//		The short yet performant version of this function is dojo.trim(),
	//		which is part of Dojo base.  Uses String.prototype.trim instead, if available.
	return "";	// String
}
=====*/

dojo.string.trim = String.prototype.trim ?
	lang.trim : // aliasing to the native function
	function(str){
		str = str.replace(/^\s+/, '');
		for(var i = str.length - 1; i >= 0; i--){
			if(/\S/.test(str.charAt(i))){
				str = str.substring(0, i + 1);
				break;
			}
		}
		return str;
	};

return dojo.string;
});

},
'dijit/form/_FormWidgetMixin':function(){
define("dijit/form/_FormWidgetMixin", [
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-style", // domStyle.get
	"dojo/_base/lang", // lang.hitch lang.isArray
	"dojo/mouse", // mouse.isLeft
	"dojo/_base/sniff", // has("webkit")
	"dojo/_base/window", // win.body
	"dojo/window", // winUtils.scrollIntoView
	"../a11y"	// a11y.hasDefaultTabStop
], function(array, declare, domAttr, domStyle, lang, mouse, has, win, winUtils, a11y){

// module:
//		dijit/form/_FormWidgetMixin
// summary:
//		Mixin for widgets corresponding to native HTML elements such as <checkbox> or <button>,
//		which can be children of a <form> node or a `dijit.form.Form` widget.

return declare("dijit.form._FormWidgetMixin", null, {
	// summary:
	//		Mixin for widgets corresponding to native HTML elements such as <checkbox> or <button>,
	//		which can be children of a <form> node or a `dijit.form.Form` widget.
	//
	// description:
	//		Represents a single HTML element.
	//		All these widgets should have these attributes just like native HTML input elements.
	//		You can set them during widget construction or afterwards, via `dijit._Widget.attr`.
	//
	//		They also share some common methods.

	// name: [const] String
	//		Name used when submitting form; same as "name" attribute or plain HTML elements
	name: "",

	// alt: String
	//		Corresponds to the native HTML <input> element's attribute.
	alt: "",

	// value: String
	//		Corresponds to the native HTML <input> element's attribute.
	value: "",

	// type: [const] String
	//		Corresponds to the native HTML <input> element's attribute.
	type: "text",

	// tabIndex: Integer
	//		Order fields are traversed when user hits the tab key
	tabIndex: "0",
	_setTabIndexAttr: "focusNode",	// force copy even when tabIndex default value, needed since Button is <span>

	// disabled: Boolean
	//		Should this widget respond to user input?
	//		In markup, this is specified as "disabled='disabled'", or just "disabled".
	disabled: false,

	// intermediateChanges: Boolean
	//		Fires onChange for each value change or only on demand
	intermediateChanges: false,

	// scrollOnFocus: Boolean
	//		On focus, should this widget scroll into view?
	scrollOnFocus: true,

	// Override _WidgetBase mapping id to this.domNode, needs to be on focusNode so <label> etc.
	// works with screen reader
	_setIdAttr: "focusNode",

	_setDisabledAttr: function(/*Boolean*/ value){
		this._set("disabled", value);
		domAttr.set(this.focusNode, 'disabled', value);
		if(this.valueNode){
			domAttr.set(this.valueNode, 'disabled', value);
		}
		this.focusNode.setAttribute("aria-disabled", value ? "true" : "false");

		if(value){
			// reset these, because after the domNode is disabled, we can no longer receive
			// mouse related events, see #4200
			this._set("hovering", false);
			this._set("active", false);

			// clear tab stop(s) on this widget's focusable node(s)  (ComboBox has two focusable nodes)
			var attachPointNames = "tabIndex" in this.attributeMap ? this.attributeMap.tabIndex :
				("_setTabIndexAttr" in this) ? this._setTabIndexAttr : "focusNode";
			array.forEach(lang.isArray(attachPointNames) ? attachPointNames : [attachPointNames], function(attachPointName){
				var node = this[attachPointName];
				// complex code because tabIndex=-1 on a <div> doesn't work on FF
				if(has("webkit") || a11y.hasDefaultTabStop(node)){	// see #11064 about webkit bug
					node.setAttribute('tabIndex', "-1");
				}else{
					node.removeAttribute('tabIndex');
				}
			}, this);
		}else{
			if(this.tabIndex != ""){
				this.set('tabIndex', this.tabIndex);
			}
		}
	},

	_onFocus: function(/*String*/ by){
		// If user clicks on the widget, even if the mouse is released outside of it,
		// this widget's focusNode should get focus (to mimic native browser hehavior).
		// Browsers often need help to make sure the focus via mouse actually gets to the focusNode.
		if(by == "mouse" && this.isFocusable()){
			// IE exhibits strange scrolling behavior when refocusing a node so only do it when !focused.
			var focusConnector = this.connect(this.focusNode, "onfocus", function(){
				this.disconnect(mouseUpConnector);
				this.disconnect(focusConnector);
			});
			// Set a global event to handle mouseup, so it fires properly
			// even if the cursor leaves this.domNode before the mouse up event.
			var mouseUpConnector = this.connect(win.body(), "onmouseup", function(){
				this.disconnect(mouseUpConnector);
				this.disconnect(focusConnector);
				// if here, then the mousedown did not focus the focusNode as the default action
				if(this.focused){
					this.focus();
				}
			});
		}
		if(this.scrollOnFocus){
			this.defer(function(){ winUtils.scrollIntoView(this.domNode); }); // without defer, the input caret position can change on mouse click
		}
		this.inherited(arguments);
	},

	isFocusable: function(){
		// summary:
		//		Tells if this widget is focusable or not.  Used internally by dijit.
		// tags:
		//		protected
		return !this.disabled && this.focusNode && (domStyle.get(this.domNode, "display") != "none");
	},

	focus: function(){
		// summary:
		//		Put focus on this widget
		if(!this.disabled && this.focusNode.focus){
			try{ this.focusNode.focus(); }catch(e){}/*squelch errors from hidden nodes*/
		}
	},

	compare: function(/*anything*/ val1, /*anything*/ val2){
		// summary:
		//		Compare 2 values (as returned by get('value') for this widget).
		// tags:
		//		protected
		if(typeof val1 == "number" && typeof val2 == "number"){
			return (isNaN(val1) && isNaN(val2)) ? 0 : val1 - val2;
		}else if(val1 > val2){
			return 1;
		}else if(val1 < val2){
			return -1;
		}else{
			return 0;
		}
	},

	onChange: function(/*===== newValue =====*/){
		// summary:
		//		Callback when this widget's value is changed.
		// tags:
		//		callback
	},

	// _onChangeActive: [private] Boolean
	//		Indicates that changes to the value should call onChange() callback.
	//		This is false during widget initialization, to avoid calling onChange()
	//		when the initial value is set.
	_onChangeActive: false,

	_handleOnChange: function(/*anything*/ newValue, /*Boolean?*/ priorityChange){
		// summary:
		//		Called when the value of the widget is set.  Calls onChange() if appropriate
		// newValue:
		//		the new value
		// priorityChange:
		//		For a slider, for example, dragging the slider is priorityChange==false,
		//		but on mouse up, it's priorityChange==true.  If intermediateChanges==false,
		//		onChange is only called form priorityChange=true events.
		// tags:
		//		private
		if(this._lastValueReported == undefined && (priorityChange === null || !this._onChangeActive)){
			// this block executes not for a change, but during initialization,
			// and is used to store away the original value (or for ToggleButton, the original checked state)
			this._resetValue = this._lastValueReported = newValue;
		}
		this._pendingOnChange = this._pendingOnChange
			|| (typeof newValue != typeof this._lastValueReported)
			|| (this.compare(newValue, this._lastValueReported) != 0);
		if((this.intermediateChanges || priorityChange || priorityChange === undefined) && this._pendingOnChange){
			this._lastValueReported = newValue;
			this._pendingOnChange = false;
			if(this._onChangeActive){
				if(this._onChangeHandle){
					this._onChangeHandle.remove();
				}
				// defer allows hidden value processing to run and
				// also the onChange handler can safely adjust focus, etc
				this._onChangeHandle = this.defer(
					function(){
						this._onChangeHandle = null;
						this.onChange(newValue);
					}); // try to collapse multiple onChange's fired faster than can be processed
			}
		}
	},

	create: function(){
		// Overrides _Widget.create()
		this.inherited(arguments);
		this._onChangeActive = true;
	},

	destroy: function(){
		if(this._onChangeHandle){ // destroy called before last onChange has fired
			this._onChangeHandle.remove();
			this.onChange(this._lastValueReported);
		}
		this.inherited(arguments);
	}
});

});

},
'dojox/charting/action2d/Base':function(){
define("dojox/charting/action2d/Base", ["dojo/_base/lang", "dojo/_base/declare"], 
	function(lang, declare){

	return declare("dojox.charting.action2d.Base", null, {
		//	summary:
		//		Base action class for plot and chart actions.
	
		constructor: function(chart, plot){
			//	summary:
			//		Create a new base action.  This can either be a plot or a chart action.
			//	chart: dojox.charting.Chart
			//		The chart this action applies to.
			//	plot: String?|dojox.charting.plot2d.Base?
			//		Optional target plot for this action.  Default is "default".
			this.chart = chart;
			this.plot = plot ? (lang.isString(plot) ? this.chart.getPlot(plot) : plot) : this.chart.getPlot("default");
		},
	
		connect: function(){
			//	summary:
			//		Connect this action to the plot or the chart.
		},
	
		disconnect: function(){
			//	summary:
			//		Disconnect this action from the plot or the chart.
		},
		
		destroy: function(){
			//	summary:
			//		Do any cleanup needed when destroying parent elements.
			this.disconnect();
		}
	});

});

},
'dojox/charting/themes/PrimaryColors':function(){
define("dojox/charting/themes/PrimaryColors", ["../Theme", "./gradientGenerator", "./common"], function(Theme, gradientGenerator, themes){

	var colors = ["#f00", "#0f0", "#00f", "#ff0", "#0ff", "#f0f", "./common"],
		defaultFill = {type: "linear", space: "plot", x1: 0, y1: 0, x2: 0, y2: 100};

	themes.PrimaryColors = new Theme({
		seriesThemes: gradientGenerator.generateMiniTheme(colors, defaultFill, 90, 40, 25)
	});
	
	return themes.PrimaryColors;
});

},
'dojox/charting/plot2d/Stacked':function(){
define("dojox/charting/plot2d/Stacked", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "./Default", "./common", 
	"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/functional/sequence"], 
	function(lang, declare, arr, Default, dc, df, dfr, dfs){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.Stacked", Default, {
		//	summary:
		//		Like the default plot, Stacked sets up lines, areas and markers
		//		in a stacked fashion (values on the y axis added to each other)
		//		as opposed to a direct one.
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectStackedStats(this.series);
			this._maxRunLength = stats.hmax;
			return stats;
		},
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Stacked
			//		A reference to this plot for functional chaining.
			if(this._maxRunLength <= 0){
				return this;
			}

			// stack all values
			var acc = df.repeat(this._maxRunLength, "-> 0", 0);
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i];
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						if(isNaN(v)){ v = 0; }
						acc[j] += v;
					}
				}
			}
			// draw runs in backwards
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}

			var t = this.chart.theme, events = this.events(),
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler);

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next(this.opt.areas ? "area" : "line", [this.opt, run], true),
					s = run.group, outline,
					lpoly = arr.map(acc, function(v, i){
						return {
							x: ht(i + 1) + offsets.l,
							y: dim.height - offsets.b - vt(v)
						};
					}, this);

				var lpath = this.opt.tension ? dc.curve(lpoly, this.opt.tension) : "";

				if(this.opt.areas){
					var apoly = lang.clone(lpoly);
					if(this.opt.tension){
						var p=dc.curve(apoly, this.opt.tension);
						p += " L" + lpoly[lpoly.length - 1].x + "," + (dim.height - offsets.b) +
							" L" + lpoly[0].x + "," + (dim.height - offsets.b) +
							" L" + lpoly[0].x + "," + lpoly[0].y;
						run.dyn.fill = s.createPath(p).setFill(theme.series.fill).getFill();
					} else {
						apoly.push({x: lpoly[lpoly.length - 1].x, y: dim.height - offsets.b});
						apoly.push({x: lpoly[0].x, y: dim.height - offsets.b});
						apoly.push(lpoly[0]);
						run.dyn.fill = s.createPolyline(apoly).setFill(theme.series.fill).getFill();
					}
				}
				if(this.opt.lines || this.opt.markers){
					if(theme.series.outline){
						outline = dc.makeStroke(theme.series.outline);
						outline.width = 2 * outline.width + theme.series.stroke.width;
					}
				}
				if(this.opt.markers){
					run.dyn.marker = theme.symbol;
				}
				var frontMarkers, outlineMarkers, shadowMarkers;
				if(theme.series.shadow && theme.series.stroke){
					var shadow = theme.series.shadow,
						spoly = arr.map(lpoly, function(c){
							return {x: c.x + shadow.dx, y: c.y + shadow.dy};
						});
					if(this.opt.lines){
						if(this.opt.tension){
							run.dyn.shadow = s.createPath(dc.curve(spoly, this.opt.tension)).setStroke(shadow).getStroke();
						} else {
							run.dyn.shadow = s.createPolyline(spoly).setStroke(shadow).getStroke();
						}
					}
					if(this.opt.markers){
						shadow = theme.marker.shadow;
						shadowMarkers = arr.map(spoly, function(c){
							return s.createPath("M" + c.x + " " + c.y + " " + theme.symbol).
								setStroke(shadow).setFill(shadow.color);
						}, this);
					}
				}
				if(this.opt.lines){
					if(outline){
						if(this.opt.tension){
							run.dyn.outline = s.createPath(lpath).setStroke(outline).getStroke();
						} else {
							run.dyn.outline = s.createPolyline(lpoly).setStroke(outline).getStroke();
						}
					}
					if(this.opt.tension){
						run.dyn.stroke = s.createPath(lpath).setStroke(theme.series.stroke).getStroke();
					} else {
						run.dyn.stroke = s.createPolyline(lpoly).setStroke(theme.series.stroke).getStroke();
					}
				}
				if(this.opt.markers){
					frontMarkers = new Array(lpoly.length);
					outlineMarkers = new Array(lpoly.length);
					outline = null;
					if(theme.marker.outline){
						outline = dc.makeStroke(theme.marker.outline);
						outline.width = 2 * outline.width + (theme.marker.stroke ? theme.marker.stroke.width : 0);
					}
					arr.forEach(lpoly, function(c, i){
						var path = "M" + c.x + " " + c.y + " " + theme.symbol;
						if(outline){
							outlineMarkers[i] = s.createPath(path).setStroke(outline);
						}
						frontMarkers[i] = s.createPath(path).setStroke(theme.marker.stroke).setFill(theme.marker.fill);
					}, this);
					if(events){
						var eventSeries = new Array(frontMarkers.length);
						arr.forEach(frontMarkers, function(s, i){
							var o = {
								element: "marker",
								index:   i,
								run:     run,
								shape:   s,
								outline: outlineMarkers[i] || null,
								shadow:  shadowMarkers && shadowMarkers[i] || null,
								cx:      lpoly[i].x,
								cy:      lpoly[i].y,
								x:       i + 1,
								y:       run.data[i]
							};
							this._connectEvents(o);
							eventSeries[i] = o;
						}, this);
						this._eventSeries[run.name] = eventSeries;
					}else{
						delete this._eventSeries[run.name];
					}
				}
				run.dirty = false;
				// update the accumulator
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						if(isNaN(v)){ v = 0; }
						acc[j] -= v;
					}
				}
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Stacked
		}
	});
});

},
'dojox/charting/plot2d/Pie':function(){
define("dojox/charting/plot2d/Pie", ["dojo/_base/lang", "dojo/_base/array" ,"dojo/_base/declare", 
		"../Element", "./_PlotEvents", "./common", "../axis2d/common", 
		"dojox/gfx", "dojox/gfx/matrix", "dojox/lang/functional", "dojox/lang/utils"],
	function(lang, arr, declare, Element, PlotEvents, dc, da, g, m, df, du){

	/*=====
	var Element = dojox.charting.Element;
	var PlotEvents = dojox.charting.plot2d._PlotEvents;
	dojo.declare("dojox.charting.plot2d.__PieCtorArgs", dojox.charting.plot2d.__DefaultCtorArgs, {
		//	summary:
		//		Specialized keyword arguments object for use in defining parameters on a Pie chart.
	
		//	labels: Boolean?
		//		Whether or not to draw labels for each pie slice.  Default is true.
		labels:			true,
	
		//	ticks: Boolean?
		//		Whether or not to draw ticks to labels within each slice. Default is false.
		ticks:			false,
	
		//	fixed: Boolean?
		//		TODO
		fixed:			true,
	
		//	precision: Number?
		//		The precision at which to sum/add data values. Default is 1.
		precision:		1,
	
		//	labelOffset: Number?
		//		The amount in pixels by which to offset labels.  Default is 20.
		labelOffset:	20,
	
		//	labelStyle: String?
		//		Options as to where to draw labels.  Values include "default", and "columns".	Default is "default".
		labelStyle:		"default",	// default/columns
	
		//	htmlLabels: Boolean?
		//		Whether or not to use HTML to render slice labels. Default is true.
		htmlLabels:		true,
	
		//	radGrad: String?
		//		The type of radial gradient to use in rendering.  Default is "native".
		radGrad:        "native",
	
		//	fanSize: Number?
		//		The amount for a radial gradient.  Default is 5.
		fanSize:		5,
	
		//	startAngle: Number?
		//		Where to being rendering gradients in slices, in degrees.  Default is 0.
		startAngle:     0,
	
		//	radius: Number?
		//		The size of the radial gradient.  Default is 0.
		radius:		0
	});
	=====*/

	var FUDGE_FACTOR = 0.2; // use to overlap fans

	return declare("dojox.charting.plot2d.Pie", [Element, PlotEvents], {
		//	summary:
		//		The plot that represents a typical pie chart.
		defaultParams: {
			labels:			true,
			ticks:			false,
			fixed:			true,
			precision:		1,
			labelOffset:	20,
			labelStyle:		"default",	// default/columns
			htmlLabels:		true,		// use HTML to draw labels
			radGrad:        "native",	// or "linear", or "fan"
			fanSize:		5,			// maximum fan size in degrees
			startAngle:     0			// start angle for slices in degrees
		},
		optionalParams: {
			radius:		0,
			// theme components
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	"",
			labelWiring: {}
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create a pie plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.run = null;
			this.dyn = [];
		},
		clear: function(){
			//	summary:
			//		Clear out all of the information tied to this plot.
			//	returns: dojox.charting.plot2d.Pie
			//		A reference to this plot for functional chaining.
			this.dirty = true;
			this.dyn = [];
			this.run = null;
			return this;	//	dojox.charting.plot2d.Pie
		},
		setAxis: function(axis){
			//	summary:
			//		Dummy method, since axes are irrelevant with a Pie chart.
			//	returns: dojox.charting.plot2d.Pie
			//		The reference to this plot for functional chaining.
			return this;	//	dojox.charting.plot2d.Pie
		},
		addSeries: function(run){
			//	summary:
			//		Add a series of data to this plot.
			//	returns: dojox.charting.plot2d.Pie
			//		The reference to this plot for functional chaining.
			this.run = run;
			return this;	//	dojox.charting.plot2d.Pie
		},
		getSeriesStats: function(){
			//	summary:
			//		Returns default stats (irrelevant for this type of plot).
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return lang.delegate(dc.defaultStats);
		},
		initializeScalers: function(){
			//	summary:
			//		Does nothing (irrelevant for this type of plot).
			return this;
		},
		getRequiredColors: function(){
			//	summary:
			//		Return the number of colors needed to draw this plot.
			return this.run ? this.run.data.length : 0;
		},

		render: function(dim, offsets){
			//	summary:
			//		Render the plot on the chart.
			//	dim: Object
			//		An object of the form { width, height }.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.plot2d.Pie
			//		A reference to this plot for functional chaining.
			if(!this.dirty){ return this; }
			this.resetEvents();
			this.dirty = false;
			this._eventSeries = {};
			this.cleanGroup();
			var s = this.group, t = this.chart.theme;

			if(!this.run || !this.run.data.length){
				return this;
			}

			// calculate the geometry
			var rx = (dim.width  - offsets.l - offsets.r) / 2,
				ry = (dim.height - offsets.t - offsets.b) / 2,
				r  = Math.min(rx, ry),
				taFont = "font" in this.opt ? this.opt.font : t.axis.font,
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				taFontColor = "fontColor" in this.opt ? this.opt.fontColor : t.axis.fontColor,
				startAngle = m._degToRad(this.opt.startAngle),
				start = startAngle, step, filteredRun, slices, labels, shift, labelR,
				run = this.run.data,
				events = this.events();
			if(typeof run[0] == "number"){
				filteredRun = df.map(run, "x ? Math.max(x, 0) : 0");
				if(df.every(filteredRun, "<= 0")){
					return this;
				}
				slices = df.map(filteredRun, "/this", df.foldl(filteredRun, "+", 0));
				if(this.opt.labels){
					labels = arr.map(slices, function(x){
						return x > 0 ? this._getLabel(x * 100) + "%" : "";
					}, this);
				}
			}else{
				filteredRun = df.map(run, "x ? Math.max(x.y, 0) : 0");
				if(df.every(filteredRun, "<= 0")){
					return this;
				}
				slices = df.map(filteredRun, "/this", df.foldl(filteredRun, "+", 0));
				if(this.opt.labels){
					labels = arr.map(slices, function(x, i){
						if(x <= 0){ return ""; }
						var v = run[i];
						return "text" in v ? v.text : this._getLabel(x * 100) + "%";
					}, this);
				}
			}
			var themes = df.map(run, function(v, i){
				if(v === null || typeof v == "number"){
					return t.next("slice", [this.opt, this.run], true);
				}
				return t.next("slice", [this.opt, this.run, v], true);
			}, this);
			if(this.opt.labels){
				shift = df.foldl1(df.map(labels, function(label, i){
					var font = themes[i].series.font;
					return g._base._getTextBox(label, {font: font}).w;
				}, this), "Math.max(a, b)") / 2;
				if(this.opt.labelOffset < 0){
					r = Math.min(rx - 2 * shift, ry - size) + this.opt.labelOffset;
				}
				labelR = r - this.opt.labelOffset;
			}
			if("radius" in this.opt){
				r = this.opt.radius;
				labelR = r - this.opt.labelOffset;
			}
			var	circle = {
					cx: offsets.l + rx,
					cy: offsets.t + ry,
					r:  r
				};

			this.dyn = [];
			// draw slices
			var eventSeries = new Array(slices.length);
			arr.some(slices, function(slice, i){
				if(slice < 0){
					// degenerated slice
					return false;	// continue
				}
				if(slice == 0){
				  this.dyn.push({fill: null, stroke: null});
				  return false;
				}
				var v = run[i], theme = themes[i], specialFill;
				if(slice >= 1){
					// whole pie
					specialFill = this._plotFill(theme.series.fill, dim, offsets);
					specialFill = this._shapeFill(specialFill,
						{
							x: circle.cx - circle.r, y: circle.cy - circle.r,
							width: 2 * circle.r, height: 2 * circle.r
						});
					specialFill = this._pseudoRadialFill(specialFill, {x: circle.cx, y: circle.cy}, circle.r);
					var shape = s.createCircle(circle).setFill(specialFill).setStroke(theme.series.stroke);
					this.dyn.push({fill: specialFill, stroke: theme.series.stroke});

					if(events){
						var o = {
							element: "slice",
							index:   i,
							run:     this.run,
							shape:   shape,
							x:       i,
							y:       typeof v == "number" ? v : v.y,
							cx:      circle.cx,
							cy:      circle.cy,
							cr:      r
						};
						this._connectEvents(o);
						eventSeries[i] = o;
					}

					return true;	// stop iteration
				}
				// calculate the geometry of the slice
				var end = start + slice * 2 * Math.PI;
				if(i + 1 == slices.length){
					end = startAngle + 2 * Math.PI;
				}
				var	step = end - start,
					x1 = circle.cx + r * Math.cos(start),
					y1 = circle.cy + r * Math.sin(start),
					x2 = circle.cx + r * Math.cos(end),
					y2 = circle.cy + r * Math.sin(end);
				// draw the slice
				var fanSize = m._degToRad(this.opt.fanSize);
				if(theme.series.fill && theme.series.fill.type === "radial" && this.opt.radGrad === "fan" && step > fanSize){
					var group = s.createGroup(), nfans = Math.ceil(step / fanSize), delta = step / nfans;
					specialFill = this._shapeFill(theme.series.fill,
						{x: circle.cx - circle.r, y: circle.cy - circle.r, width: 2 * circle.r, height: 2 * circle.r});
					for(var j = 0; j < nfans; ++j){
						var fansx = j == 0 ? x1 : circle.cx + r * Math.cos(start + (j - FUDGE_FACTOR) * delta),
							fansy = j == 0 ? y1 : circle.cy + r * Math.sin(start + (j - FUDGE_FACTOR) * delta),
							fanex = j == nfans - 1 ? x2 : circle.cx + r * Math.cos(start + (j + 1 + FUDGE_FACTOR) * delta),
							faney = j == nfans - 1 ? y2 : circle.cy + r * Math.sin(start + (j + 1 + FUDGE_FACTOR) * delta),
							fan = group.createPath().
								moveTo(circle.cx, circle.cy).
								lineTo(fansx, fansy).
								arcTo(r, r, 0, delta > Math.PI, true, fanex, faney).
								lineTo(circle.cx, circle.cy).
								closePath().
								setFill(this._pseudoRadialFill(specialFill, {x: circle.cx, y: circle.cy}, r, start + (j + 0.5) * delta, start + (j + 0.5) * delta));
					}
					group.createPath().
						moveTo(circle.cx, circle.cy).
						lineTo(x1, y1).
						arcTo(r, r, 0, step > Math.PI, true, x2, y2).
						lineTo(circle.cx, circle.cy).
						closePath().
						setStroke(theme.series.stroke);
					shape = group;
				}else{
					shape = s.createPath().
						moveTo(circle.cx, circle.cy).
						lineTo(x1, y1).
						arcTo(r, r, 0, step > Math.PI, true, x2, y2).
						lineTo(circle.cx, circle.cy).
						closePath().
						setStroke(theme.series.stroke);
					var specialFill = theme.series.fill;
					if(specialFill && specialFill.type === "radial"){
						specialFill = this._shapeFill(specialFill, {x: circle.cx - circle.r, y: circle.cy - circle.r, width: 2 * circle.r, height: 2 * circle.r});
						if(this.opt.radGrad === "linear"){
							specialFill = this._pseudoRadialFill(specialFill, {x: circle.cx, y: circle.cy}, r, start, end);
						}
					}else if(specialFill && specialFill.type === "linear"){
						specialFill = this._plotFill(specialFill, dim, offsets);
						specialFill = this._shapeFill(specialFill, shape.getBoundingBox());
					}
					shape.setFill(specialFill);
				}
				this.dyn.push({fill: specialFill, stroke: theme.series.stroke});

				if(events){
					var o = {
						element: "slice",
						index:   i,
						run:     this.run,
						shape:   shape,
						x:       i,
						y:       typeof v == "number" ? v : v.y,
						cx:      circle.cx,
						cy:      circle.cy,
						cr:      r
					};
					this._connectEvents(o);
					eventSeries[i] = o;
				}

				start = end;

				return false;	// continue
			}, this);
			// draw labels
			if(this.opt.labels){
				if(this.opt.labelStyle == "default"){
					start = startAngle;
					arr.some(slices, function(slice, i){
						if(slice <= 0){
							// degenerated slice
							return false;	// continue
						}
						var theme = themes[i];
						if(slice >= 1){
							// whole pie
							var v = run[i], elem = da.createText[this.opt.htmlLabels && g.renderer != "vml" ? "html" : "gfx"](
									this.chart, s, circle.cx, circle.cy + size / 2, "middle", labels[i],
									theme.series.font, theme.series.fontColor);
							if(this.opt.htmlLabels){
								this.htmlElements.push(elem);
							}
							return true;	// stop iteration
						}
						// calculate the geometry of the slice
						var end = start + slice * 2 * Math.PI, v = run[i];
						if(i + 1 == slices.length){
							end = startAngle + 2 * Math.PI;
						}
						var	labelAngle = (start + end) / 2,
							x = circle.cx + labelR * Math.cos(labelAngle),
							y = circle.cy + labelR * Math.sin(labelAngle) + size / 2;
						// draw the label
						var elem = da.createText[this.opt.htmlLabels && g.renderer != "vml" ? "html" : "gfx"]
								(this.chart, s, x, y, "middle", labels[i], theme.series.font, theme.series.fontColor);
						if(this.opt.htmlLabels){
							this.htmlElements.push(elem);
						}
						start = end;
						return false;	// continue
					}, this);
				}else if(this.opt.labelStyle == "columns"){
					start = startAngle;
					//calculate label angles
					var labeledSlices = [];
					arr.forEach(slices, function(slice, i){
						var end = start + slice * 2 * Math.PI;
						if(i + 1 == slices.length){
							end = startAngle + 2 * Math.PI;
						}
						var labelAngle = (start + end) / 2;
						labeledSlices.push({
							angle: labelAngle,
							left: Math.cos(labelAngle) < 0,
							theme: themes[i],
							index: i,
							omit: end - start < 0.001
						});
						start = end;
					});
					//calculate label radius to each slice
					var labelHeight = g._base._getTextBox("a",{font:taFont}).h;
					this._getProperLabelRadius(labeledSlices, labelHeight, circle.r * 1.1);
					//draw label and wiring
					arr.forEach(labeledSlices, function(slice, i){
						if (!slice.omit) {
							var leftColumn = circle.cx - circle.r * 2,
								rightColumn = circle.cx + circle.r * 2,
								labelWidth = g._base._getTextBox(labels[i], {font: taFont}).w,
								x = circle.cx + slice.labelR * Math.cos(slice.angle),
								y = circle.cy + slice.labelR * Math.sin(slice.angle),
								jointX = (slice.left) ? (leftColumn + labelWidth) : (rightColumn - labelWidth),
								labelX = (slice.left) ? leftColumn : jointX;
							var wiring = s.createPath().moveTo(circle.cx + circle.r * Math.cos(slice.angle), circle.cy + circle.r * Math.sin(slice.angle))
							if (Math.abs(slice.labelR * Math.cos(slice.angle)) < circle.r * 2 - labelWidth) {
								wiring.lineTo(x, y);
							}
							wiring.lineTo(jointX, y).setStroke(slice.theme.series.labelWiring);
							var elem = da.createText[this.opt.htmlLabels && g.renderer != "vml" ? "html" : "gfx"](
								this.chart, s, labelX, y, "left", labels[i], slice.theme.series.font, slice.theme.series.fontColor);
							if (this.opt.htmlLabels) {
								this.htmlElements.push(elem);
							}
						}
					},this);
				}
			}
			// post-process events to restore the original indexing
			var esi = 0;
			this._eventSeries[this.run.name] = df.map(run, function(v){
				return v <= 0 ? null : eventSeries[esi++];
			});
			return this;	//	dojox.charting.plot2d.Pie
		},
		
		_getProperLabelRadius: function(slices, labelHeight, minRidius){
			var leftCenterSlice = {},rightCenterSlice = {},leftMinSIN = 1, rightMinSIN = 1;
			if (slices.length == 1) {
				slices[0].labelR = minRidius;
				return;
			}
			for(var i = 0;i<slices.length;i++){
				var tempSIN = Math.abs(Math.sin(slices[i].angle));
				if(slices[i].left){
					if(leftMinSIN >= tempSIN){
						leftMinSIN = tempSIN;
						leftCenterSlice = slices[i];
					}
				}else{
					if(rightMinSIN >= tempSIN){
						rightMinSIN = tempSIN;
						rightCenterSlice = slices[i];
					}
				}
			}
			leftCenterSlice.labelR = rightCenterSlice.labelR = minRidius;
			this._calculateLabelR(leftCenterSlice,slices,labelHeight);
			this._calculateLabelR(rightCenterSlice,slices,labelHeight);
		},
		_calculateLabelR: function(firstSlice,slices,labelHeight){
			var i = firstSlice.index,length = slices.length,
				currentLabelR = firstSlice.labelR;
			while(!(slices[i%length].left ^ slices[(i+1)%length].left)){
				if (!slices[(i + 1) % length].omit) {
					var nextLabelR = (Math.sin(slices[i % length].angle) * currentLabelR + ((slices[i % length].left) ? (-labelHeight) : labelHeight)) /
					Math.sin(slices[(i + 1) % length].angle);
					currentLabelR = (nextLabelR < firstSlice.labelR) ? firstSlice.labelR : nextLabelR;
					slices[(i + 1) % length].labelR = currentLabelR;
				}
				i++;
			}
			i = firstSlice.index;
			var j = (i == 0)?length-1 : i - 1;
			while(!(slices[i].left ^ slices[j].left)){
				if (!slices[j].omit) {
					var nextLabelR = (Math.sin(slices[i].angle) * currentLabelR + ((slices[i].left) ? labelHeight : (-labelHeight))) /
					Math.sin(slices[j].angle);
					currentLabelR = (nextLabelR < firstSlice.labelR) ? firstSlice.labelR : nextLabelR;
					slices[j].labelR = currentLabelR;
				}
				i--;j--;
				i = (i < 0)?i+slices.length:i;
				j = (j < 0)?j+slices.length:j;
			}
		},
		// utilities
		_getLabel: function(number){
			return dc.getLabel(number, this.opt.fixed, this.opt.precision);
		}
	});
});

},
'dojox/charting/plot3d/Bars':function(){
define("dojox/charting/plot3d/Bars", ["dojox/gfx3d", "dojo/_base/window", "dojo/_base/declare", "dojo/_base/Color", "./Base"], 
	function(gfx3d, win, declare, Color, Base) {

	// reduce function borrowed from dojox.fun
	var reduce = function(/*Array*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
		// summary: repeatedly applies a binary function to an array from left
		//	to right; returns the final value.
		a = typeof a == "string" ? a.split("") : a; o = o || win.global;
		var z = a[0];
		for(var i = 1; i < a.length; z = f.call(o, z, a[i++]));
		return z;	// Object
	};
	/*=====
	var Base = dojox.charting.plot3d.Base;
	=====*/
	return declare("dojox.charting.plot3d.Bars", Base, {
		constructor: function(width, height, kwArgs){
			this.depth = "auto";
			this.gap   = 0;
			this.data  = [];
			this.material = {type: "plastic", finish: "dull", color: "lime"};
			if(kwArgs){
				if("depth" in kwArgs){ this.depth = kwArgs.depth; }
				if("gap"   in kwArgs){ this.gap   = kwArgs.gap; }
				if("material" in kwArgs){
					var m = kwArgs.material;
					if(typeof m == "string" || m instanceof Color){
						this.material.color = m;
					}else{
						this.material = m;
					}
				}
			}
		},
		getDepth: function(){
			if(this.depth == "auto"){
				var w = this.width;
				if(this.data && this.data.length){
					w = w / this.data.length;
				}
				return w - 2 * this.gap;
			}
			return this.depth;
		},
		generate: function(chart, creator){
			if(!this.data){ return this; }
			var step = this.width / this.data.length, org = 0,
				depth = this.depth == "auto" ? step - 2 * this.gap : this.depth,
				scale = this.height / reduce(this.data, Math.max);
			if(!creator){ creator = chart.view; }
			for(var i = 0; i < this.data.length; ++i, org += step){
				creator
					.createCube({
						bottom: {x: org + this.gap, y: 0, z: 0},
						top:    {x: org + step - this.gap, y: this.data[i] * scale, z: depth}
					})
					.setFill(this.material);
			}
		}
	});
});

},
'dojox/charting/themes/Adobebricks':function(){
define("dojox/charting/themes/Adobebricks", ["../Theme", "./common"], function(Theme, themes){

	themes.Adobebricks=new Theme({
		colors: [
			"#7f2518",
			"#3e170c",
			"#cc3927",
			"#651f0e",
			"#8c271c"
		]
	});
	
	return themes.Adobebricks;
});

},
'dojox/gfx':function(){
define("dojox/gfx", ["dojo/_base/lang", "./gfx/_base", "./gfx/renderer!"], 
  function(lang, gfxBase, renderer){
	// module:
	//		dojox/gfx
	// summary:
	//		This the root of the Dojo Graphics package
	gfxBase.switchTo(renderer);
	return gfxBase;
});

},
'dojox/charting/action2d/PlotAction':function(){
define("dojox/charting/action2d/PlotAction", ["dojo/_base/connect", "dojo/_base/declare", "./Base", "dojo/fx/easing", "dojox/lang/functional", 
		"dojox/lang/functional/object"], 
	function(hub, declare, Base, dfe, df, dlfo){
	
	/*=====
	dojox.charting.action2d.__PlotActionCtorArgs = function(duration, easing){
	 	//	summary:
		//		The base keyword arguments object for creating an action2d.
		//	duration: Number?
		//		The amount of time in milliseconds for an animation to last.  Default is 400.
		//	easing: dojo.fx.easing.*?
		//		An easing object (see dojo.fx.easing) for use in an animation.  The
		//		default is dojo.fx.easing.backOut.
		this.duration = duration;
		this.easing = easing;
	}
	var Base = dojox.charting.action2d.Base;
	=====*/

	var DEFAULT_DURATION = 400,	// ms
		DEFAULT_EASING   = dfe.backOut;

	return declare("dojox.charting.action2d.PlotAction", Base, {
		//	summary:
		//		Base action class for plot actions.

		overOutEvents: {onmouseover: 1, onmouseout: 1},

		constructor: function(chart, plot, kwargs){
			//	summary:
			//		Create a new base PlotAction.
			//	chart: dojox.charting.Chart
			//		The chart this action applies to.
			//	plot: String?
			//		The name of the plot this action belongs to.  If none is passed "default" is assumed.
			//	kwargs: dojox.charting.action2d.__PlotActionCtorArgs?
			//		Optional arguments for the action.
			this.anim = {};

			// process common optional named parameters
			if(!kwargs){ kwargs = {}; }
			this.duration = kwargs.duration ? kwargs.duration : DEFAULT_DURATION;
			this.easing   = kwargs.easing   ? kwargs.easing   : DEFAULT_EASING;
		},

		connect: function(){
			//	summary:
			//		Connect this action to the given plot.
			this.handle = this.chart.connectToPlot(this.plot.name, this, "process");
		},

		disconnect: function(){
			//	summary:
			//		Disconnect this action from the given plot, if connected.
			if(this.handle){
				hub.disconnect(this.handle);
				this.handle = null;
			}
		},

		reset: function(){
			//	summary:
			//		Reset the action.
		},

		destroy: function(){
			//	summary:
			//		Do any cleanup needed when destroying parent elements.
			this.inherited(arguments);
			df.forIn(this.anim, function(o){
				df.forIn(o, function(anim){
					anim.action.stop(true);
				});
			});
			this.anim = {};
		}
	});
});

},
'dojox/charting/plot2d/Bars':function(){
define("dojox/charting/plot2d/Bars", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Base", "./common", 
	"dojox/gfx/fx", "dojox/lang/utils", "dojox/lang/functional", "dojox/lang/functional/reversed"], 
	function(dojo, lang, arr, declare, Base, dc, fx, du, df, dfr){
		
	/*=====
	dojo.declare("dojox.charting.plot2d.__BarCtorArgs", dojox.charting.plot2d.__DefaultCtorArgs, {
		//	summary:
		//		Additional keyword arguments for bar charts.
	
		//	minBarSize: Number?
		//		The minimum size for a bar in pixels.  Default is 1.
		minBarSize: 1,
	
		//	maxBarSize: Number?
		//		The maximum size for a bar in pixels.  Default is 1.
		maxBarSize: 1,
		
		//	enableCache: Boolean?
		//		Whether the bars rect are cached from one rendering to another. This improves the rendering performance of
		//		successive rendering but penalize the first rendering.  Default false.
		enableCache: false
	});
	var Base = dojox.charting.plot2d.Base;
	=====*/
	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.Bars", Base, {
		//	summary:
		//		The plot object representing a bar chart (horizontal bars).
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	0,		// gap between columns in pixels
			animate: null,   // animate bars into place
			enableCache: false
		},
		optionalParams: {
			minBarSize:	1,	// minimal bar width in pixels
			maxBarSize:	1,	// maximal bar width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a bar chart.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectSimpleStats(this.series), t;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			t = stats.hmin, stats.hmin = stats.vmin, stats.vmin = t;
			t = stats.hmax, stats.hmax = stats.vmax, stats.vmax = t;
			return stats;
		},
		
		createRect: function(run, creator, params){
			var rect;
			if(this.opt.enableCache && run._rectFreePool.length > 0){
				rect = run._rectFreePool.pop();
				rect.setShape(params);
				// was cleared, add it back
				creator.add(rect);
			}else{
				rect = creator.createRect(params);
			}
			if(this.opt.enableCache){
				run._rectUsePool.push(rect);
			}
			return rect;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Bars
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.dirty = this.isDirty();
			this.resetEvents();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, height,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._hScaler.bounds.lower),
				baselineWidth = ht(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._vScaler.bounds.scale, this.opt);
			gap = f.gap;
			height = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(this.opt.enableCache){
					run._rectFreePool = (run._rectFreePool?run._rectFreePool:[]).concat(run._rectUsePool?run._rectUsePool:[]);
					run._rectUsePool = [];
				}
				var theme = t.next("bar", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							hv = ht(v),
							width = hv - baselineWidth,
							w = Math.abs(width),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "bar", value, true) :
								t.post(theme, "bar");
						if(w >= 0 && height >= 1){
							var rect = {
								x: offsets.l + (v < baseline ? hv : baselineWidth),
								y: dim.height - offsets.b - vt(j + 1.5) + gap,
								width: w, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = this.createRect(run, s, rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "bar",
									index:   j,
									run:     run,
									shape:   shape,
									x:       v,
									y:       j + 1.5
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateBar(shape, offsets.l + baselineWidth, -w);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Bars
		},
		_animateBar: function(shape, hoffset, hsize){
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [hoffset - (hoffset/hsize), 0], end: [0, 0]},
					{name: "scale", start: [1/hsize, 1], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});

},
'dojox/charting/themes/Minty':function(){
define("dojox/charting/themes/Minty", ["../Theme", "./common"], function(Theme, themes){
	
	themes.Minty=new Theme({
		colors: [
			"#80ccbb",
			"#539e8b",
			"#335f54",
			"#8dd1c2",
			"#68c5ad"
		]
	});
	
	return themes.Minty;
});

},
'dojox/charting/themes/Shrooms':function(){
define("dojox/charting/themes/Shrooms", ["../Theme", "./common"], function(Theme, themes){
	//	notes: colors generated by moving in 30 degree increments around the hue circle,
	//		at 90% saturation, using a B value of 75 (HSB model).
	themes.Shrooms = new Theme({
		colors: [
			"#bf1313", // 0
			"#69bf13", // 90
			"#13bfbf", // 180
			"#6913bf", // 270
			"#bf6913", // 30
			"#13bf13", // 120
			"#1369bf", // 210
			"#bf13bf", // 300
			"#bfbf13", // 60
			"#13bf69", // 150
			"#1313bf", // 240
			"#bf1369"  // 330
		]
	});
	
	return themes.Shrooms;
});

},
'dojox/charting/themes/Dollar':function(){
define("dojox/charting/themes/Dollar", ["../Theme", "./common"], function(Theme, themes){
	
	themes.Dollar=new Theme({
		colors: [
			"#A4CE67",
			"#739363",
			"#6B824A",
			"#343434",
			"#636563"
		]
	});
	
	return themes.Dollar;
});

},
'dojox/charting/scaler/linear':function(){
define("dojox/charting/scaler/linear", ["dojo/_base/lang", "./common"], 
	function(lang, common){
	var linear = lang.getObject("dojox.charting.scaler.linear", true);
	
	var deltaLimit = 3,	// pixels
		findString = common.findString,
		getLabel = common.getNumericLabel;
	
	var calcTicks = function(min, max, kwArgs, majorTick, minorTick, microTick, span){
		kwArgs = lang.delegate(kwArgs);
		if(!majorTick){
			if(kwArgs.fixUpper == "major"){ kwArgs.fixUpper = "minor"; }
			if(kwArgs.fixLower == "major"){ kwArgs.fixLower = "minor"; }
		}
		if(!minorTick){
			if(kwArgs.fixUpper == "minor"){ kwArgs.fixUpper = "micro"; }
			if(kwArgs.fixLower == "minor"){ kwArgs.fixLower = "micro"; }
		}
		if(!microTick){
			if(kwArgs.fixUpper == "micro"){ kwArgs.fixUpper = "none"; }
			if(kwArgs.fixLower == "micro"){ kwArgs.fixLower = "none"; }
		}
		var lowerBound = findString(kwArgs.fixLower, ["major"]) ?
				Math.floor(kwArgs.min / majorTick) * majorTick :
					findString(kwArgs.fixLower, ["minor"]) ?
						Math.floor(kwArgs.min / minorTick) * minorTick :
							findString(kwArgs.fixLower, ["micro"]) ?
								Math.floor(kwArgs.min / microTick) * microTick : kwArgs.min,
			upperBound = findString(kwArgs.fixUpper, ["major"]) ?
				Math.ceil(kwArgs.max / majorTick) * majorTick :
					findString(kwArgs.fixUpper, ["minor"]) ?
						Math.ceil(kwArgs.max / minorTick) * minorTick :
							findString(kwArgs.fixUpper, ["micro"]) ?
								Math.ceil(kwArgs.max / microTick) * microTick : kwArgs.max;
								
		if(kwArgs.useMin){ min = lowerBound; }
		if(kwArgs.useMax){ max = upperBound; }
		
		var majorStart = (!majorTick || kwArgs.useMin && findString(kwArgs.fixLower, ["major"])) ?
				min : Math.ceil(min / majorTick) * majorTick,
			minorStart = (!minorTick || kwArgs.useMin && findString(kwArgs.fixLower, ["major", "minor"])) ?
				min : Math.ceil(min / minorTick) * minorTick,
			microStart = (! microTick || kwArgs.useMin && findString(kwArgs.fixLower, ["major", "minor", "micro"])) ?
				min : Math.ceil(min / microTick) * microTick,
			majorCount = !majorTick ? 0 : (kwArgs.useMax && findString(kwArgs.fixUpper, ["major"]) ?
				Math.round((max - majorStart) / majorTick) :
				Math.floor((max - majorStart) / majorTick)) + 1,
			minorCount = !minorTick ? 0 : (kwArgs.useMax && findString(kwArgs.fixUpper, ["major", "minor"]) ?
				Math.round((max - minorStart) / minorTick) :
				Math.floor((max - minorStart) / minorTick)) + 1,
			microCount = !microTick ? 0 : (kwArgs.useMax && findString(kwArgs.fixUpper, ["major", "minor", "micro"]) ?
				Math.round((max - microStart) / microTick) :
				Math.floor((max - microStart) / microTick)) + 1,
			minorPerMajor  = minorTick ? Math.round(majorTick / minorTick) : 0,
			microPerMinor  = microTick ? Math.round(minorTick / microTick) : 0,
			majorPrecision = majorTick ? Math.floor(Math.log(majorTick) / Math.LN10) : 0,
			minorPrecision = minorTick ? Math.floor(Math.log(minorTick) / Math.LN10) : 0,
			scale = span / (max - min);
		if(!isFinite(scale)){ scale = 1; }
		
		return {
			bounds: {
				lower:	lowerBound,
				upper:	upperBound,
				from:	min,
				to:		max,
				scale:	scale,
				span:	span
			},
			major: {
				tick:	majorTick,
				start:	majorStart,
				count:	majorCount,
				prec:	majorPrecision
			},
			minor: {
				tick:	minorTick,
				start:	minorStart,
				count:	minorCount,
				prec:	minorPrecision
			},
			micro: {
				tick:	microTick,
				start:	microStart,
				count:	microCount,
				prec:	0
			},
			minorPerMajor:	minorPerMajor,
			microPerMinor:	microPerMinor,
			scaler:			linear
		};
	};
	
	return lang.mixin(linear, {
		buildScaler: function(/*Number*/ min, /*Number*/ max, /*Number*/ span, /*Object*/ kwArgs){
			var h = {fixUpper: "none", fixLower: "none", natural: false};
			if(kwArgs){
				if("fixUpper" in kwArgs){ h.fixUpper = String(kwArgs.fixUpper); }
				if("fixLower" in kwArgs){ h.fixLower = String(kwArgs.fixLower); }
				if("natural"  in kwArgs){ h.natural  = Boolean(kwArgs.natural); }
			}
			
			// update bounds
			if("min" in kwArgs){ min = kwArgs.min; }
			if("max" in kwArgs){ max = kwArgs.max; }
			if(kwArgs.includeZero){
				if(min > 0){ min = 0; }
				if(max < 0){ max = 0; }
			}
			h.min = min;
			h.useMin = true;
			h.max = max;
			h.useMax = true;
			
			if("from" in kwArgs){
				min = kwArgs.from;
				h.useMin = false;
			}
			if("to" in kwArgs){
				max = kwArgs.to;
				h.useMax = false;
			}
			
			// check for erroneous condition
			if(max <= min){
				return calcTicks(min, max, h, 0, 0, 0, span);	// Object
			}
			
			var mag = Math.floor(Math.log(max - min) / Math.LN10),
				major = kwArgs && ("majorTickStep" in kwArgs) ? kwArgs.majorTickStep : Math.pow(10, mag),
				minor = 0, micro = 0, ticks;
				
			// calculate minor ticks
			if(kwArgs && ("minorTickStep" in kwArgs)){
				minor = kwArgs.minorTickStep;
			}else{
				do{
					minor = major / 10;
					if(!h.natural || minor > 0.9){
						ticks = calcTicks(min, max, h, major, minor, 0, span);
						if(ticks.bounds.scale * ticks.minor.tick > deltaLimit){ break; }
					}
					minor = major / 5;
					if(!h.natural || minor > 0.9){
						ticks = calcTicks(min, max, h, major, minor, 0, span);
						if(ticks.bounds.scale * ticks.minor.tick > deltaLimit){ break; }
					}
					minor = major / 2;
					if(!h.natural || minor > 0.9){
						ticks = calcTicks(min, max, h, major, minor, 0, span);
						if(ticks.bounds.scale * ticks.minor.tick > deltaLimit){ break; }
					}
					return calcTicks(min, max, h, major, 0, 0, span);	// Object
				}while(false);
			}
	
			// calculate micro ticks
			if(kwArgs && ("microTickStep" in kwArgs)){
				micro = kwArgs.microTickStep;
				ticks = calcTicks(min, max, h, major, minor, micro, span);
			}else{
				do{
					micro = minor / 10;
					if(!h.natural || micro > 0.9){
						ticks = calcTicks(min, max, h, major, minor, micro, span);
						if(ticks.bounds.scale * ticks.micro.tick > deltaLimit){ break; }
					}
					micro = minor / 5;
					if(!h.natural || micro > 0.9){
						ticks = calcTicks(min, max, h, major, minor, micro, span);
						if(ticks.bounds.scale * ticks.micro.tick > deltaLimit){ break; }
					}
					micro = minor / 2;
					if(!h.natural || micro > 0.9){
						ticks = calcTicks(min, max, h, major, minor, micro, span);
						if(ticks.bounds.scale * ticks.micro.tick > deltaLimit){ break; }
					}
					micro = 0;
				}while(false);
			}
	
			return micro ? ticks : calcTicks(min, max, h, major, minor, 0, span);	// Object
		},
		buildTicks: function(/*Object*/ scaler, /*Object*/ kwArgs){
			var step, next, tick,
				nextMajor = scaler.major.start,
				nextMinor = scaler.minor.start,
				nextMicro = scaler.micro.start;
			if(kwArgs.microTicks && scaler.micro.tick){
				step = scaler.micro.tick, next = nextMicro;
			}else if(kwArgs.minorTicks && scaler.minor.tick){
				step = scaler.minor.tick, next = nextMinor;
			}else if(scaler.major.tick){
				step = scaler.major.tick, next = nextMajor;
			}else{
				// no ticks
				return null;
			}
			// make sure that we have finite bounds
			var revScale = 1 / scaler.bounds.scale;
			if(scaler.bounds.to <= scaler.bounds.from || isNaN(revScale) || !isFinite(revScale) ||
					step <= 0 || isNaN(step) || !isFinite(step)){
				// no ticks
				return null;
			}
			// loop over all ticks
			var majorTicks = [], minorTicks = [], microTicks = [];
			while(next <= scaler.bounds.to + revScale){
				if(Math.abs(nextMajor - next) < step / 2){
					// major tick
					tick = {value: nextMajor};
					if(kwArgs.majorLabels){
						tick.label = getLabel(nextMajor, scaler.major.prec, kwArgs);
					}
					majorTicks.push(tick);
					nextMajor += scaler.major.tick;
					nextMinor += scaler.minor.tick;
					nextMicro += scaler.micro.tick;
				}else if(Math.abs(nextMinor - next) < step / 2){
					// minor tick
					if(kwArgs.minorTicks){
						tick = {value: nextMinor};
						if(kwArgs.minorLabels && (scaler.minMinorStep <= scaler.minor.tick * scaler.bounds.scale)){
							tick.label = getLabel(nextMinor, scaler.minor.prec, kwArgs);
						}
						minorTicks.push(tick);
					}
					nextMinor += scaler.minor.tick;
					nextMicro += scaler.micro.tick;
				}else{
					// micro tick
					if(kwArgs.microTicks){
						microTicks.push({value: nextMicro});
					}
					nextMicro += scaler.micro.tick;
				}
				next += step;
			}
			return {major: majorTicks, minor: minorTicks, micro: microTicks};	// Object
		},
		getTransformerFromModel: function(/*Object*/ scaler){
			var offset = scaler.bounds.from, scale = scaler.bounds.scale;
			return function(x){ return (x - offset) * scale; };	// Function
		},
		getTransformerFromPlot: function(/*Object*/ scaler){
			var offset = scaler.bounds.from, scale = scaler.bounds.scale;
			return function(x){ return x / scale + offset; };	// Function
		}
	});
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
'dojox/charting/plot3d/Base':function(){
define("dojox/charting/plot3d/Base", ["dojo/_base/declare"], 
  function(declare) {
	return declare("dojox.charting.plot3d.Base", null, {
		constructor: function(width, height, kwArgs){
			this.width  = width;
			this.height = height;
		},
		setData: function(data){
			this.data = data ? data : [];
			return this;
		},
		getDepth: function(){
			return this.depth;
		},
		generate: function(chart, creator){
		}
	});
});


},
'dojox/charting/themes/Wetland':function(){
define("dojox/charting/themes/Wetland", ["../Theme", "./common"], function(Theme, themes){
	
	themes.Wetland = new Theme({
		colors: [
			"#bfbc64",
			"#737130",
			"#73373b",
			"#7dafca",
			"#8d3c42"
		]
	});
	
	return themes.Wetland;
});

},
'dojox/charting/plot2d/Base':function(){
define("dojox/charting/plot2d/Base", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", 
		"../Element", "./_PlotEvents", "dojo/_base/array",
		"../scaler/primitive", "./common", "dojox/gfx/fx"],
	function(lang, declare, hub, Element, PlotEvents, arr, primitive, common, fx){
/*=====
var Element = dojox.charting.Element;
var PlotEvents = dojox.charting.plot2d._PlotEvents;
dojox.charting.plot2d.__PlotCtorArgs = function(){
	//	summary:
	//		The base keyword arguments object for plot constructors.
	//		Note that the parameters for this may change based on the
	//		specific plot type (see the corresponding plot type for
	//		details).
}
=====*/
return declare("dojox.charting.plot2d.Base", [Element, PlotEvents], {
	constructor: function(chart, kwArgs){
		//	summary:
		//		Create a base plot for charting.
		//	chart: dojox.chart.Chart
		//		The chart this plot belongs to.
		//	kwArgs: dojox.charting.plot2d.__PlotCtorArgs?
		//		An optional arguments object to help define the plot.
		this.zoom = null,
		this.zoomQueue = [];	// zooming action task queue
		this.lastWindow = {vscale: 1, hscale: 1, xoffset: 0, yoffset: 0};
	},
	clear: function(){
		//	summary:
		//		Clear out all of the information tied to this plot.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.series = [];
		this._hAxis = null;
		this._vAxis = null;
		this.dirty = true;
		return this;	//	dojox.charting.plot2d.Base
	},
	setAxis: function(axis){
		//	summary:
		//		Set an axis for this plot.
		//	axis: dojox.charting.axis2d.Base
		//		The axis to set.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		if(axis){
			this[axis.vertical ? "_vAxis" : "_hAxis"] = axis;
		}
		return this;	//	dojox.charting.plot2d.Base
	},
	toPage: function(coord){
		//	summary:
		//		Compute page coordinates from plot axis data coordinates.
		//	coord: Object?
		//		The coordinates in plot axis data coordinate space. For cartesian charts that is of the following form:
		//			`{ hAxisName: 50, vAxisName: 200 }`
		//		If not provided return the tranform method instead of the result of the transformation.
		//	returns: Object
		//		The resulting page pixel coordinates. That is of the following form:
		//			`{ x: 50, y: 200 }`
		var ah = this._hAxis, av = this._vAxis, 
			sh = ah.getScaler(), sv = av.getScaler(),  
			th = sh.scaler.getTransformerFromModel(sh),
			tv = sv.scaler.getTransformerFromModel(sv),
			c = this.chart.getCoords(),
			o = this.chart.offsets, dim = this.chart.dim;
		var t = function(coord){
			var r = {};
			r.x = th(coord[ah.name]) + c.x + o.l;
			r.y = c.y + dim.height - o.b - tv(coord[av.name]);
			return r;
		};
		// if no coord return the function so that we can capture the current transforms
		// and reuse them later on
		return coord?t(coord):t;
	},
	toData: function(coord){
		//	summary:
		//		Compute plot axis data coordinates from page coordinates.
		//	coord: Object
		//		The pixel coordinate in page coordinate space. That is of the following form:
		//			`{ x: 50, y: 200 }`
		//		If not provided return the tranform method instead of the result of the transformation.
		//	returns: Object
		//		The resulting plot axis data coordinates. For cartesian charts that is of the following form:
		//			`{ hAxisName: 50, vAxisName: 200 }`
		var ah = this._hAxis, av = this._vAxis, 
			sh = ah.getScaler(), sv = av.getScaler(),  
			th = sh.scaler.getTransformerFromPlot(sh),
			tv = sv.scaler.getTransformerFromPlot(sv),
			c = this.chart.getCoords(),
			o = this.chart.offsets, dim = this.chart.dim;
		var t = function(coord){
			var r = {};
			r[ah.name] = th(coord.x - c.x - o.l);
			r[av.name] = tv(c.y + dim.height - coord.y  - o.b);
			return r;
		};
		// if no coord return the function so that we can capture the current transforms
		// and reuse them later on
		return coord?t(coord):t;
	},
	addSeries: function(run){
		//	summary:
		//		Add a data series to this plot.
		//	run: dojox.charting.Series
		//		The series to be added.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.series.push(run);
		return this;	//	dojox.charting.plot2d.Base
	},
	getSeriesStats: function(){
		//	summary:
		//		Calculate the min/max on all attached series in both directions.
		//	returns: Object
		//		{hmin, hmax, vmin, vmax} min/max in both directions.
		return common.collectSimpleStats(this.series);
	},
	calculateAxes: function(dim){
		//	summary:
		//		Stub function for running the axis calculations (depricated).
		//	dim: Object
		//		An object of the form { width, height }
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		this.initializeScalers(dim, this.getSeriesStats());
		return this;	//	dojox.charting.plot2d.Base
	},
	isDirty: function(){
		//	summary:
		//		Returns whether or not this plot needs to be rendered.
		//	returns: Boolean
		//		The state of the plot.
		return this.dirty || this._hAxis && this._hAxis.dirty || this._vAxis && this._vAxis.dirty;	//	Boolean
	},
	isDataDirty: function(){
		//	summary:
		//		Returns whether or not any of this plot's data series need to be rendered.
		//	returns: Boolean
		//		Flag indicating if any of this plot's series are invalid and need rendering.
		return arr.some(this.series, function(item){ return item.dirty; });	//	Boolean
	},
	performZoom: function(dim, offsets){
		//	summary:
		//		Create/alter any zooming windows on this plot.
		//	dim: Object
		//		An object of the form { width, height }.
		//	offsets: Object
		//		An object of the form { l, r, t, b }.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.

		// get current zooming various
		var vs = this._vAxis.scale || 1,
			hs = this._hAxis.scale || 1,
			vOffset = dim.height - offsets.b,
			hBounds = this._hScaler.bounds,
			xOffset = (hBounds.from - hBounds.lower) * hBounds.scale,
			vBounds = this._vScaler.bounds,
			yOffset = (vBounds.from - vBounds.lower) * vBounds.scale,
			// get incremental zooming various
			rVScale = vs / this.lastWindow.vscale,
			rHScale = hs / this.lastWindow.hscale,
			rXOffset = (this.lastWindow.xoffset - xOffset)/
				((this.lastWindow.hscale == 1)? hs : this.lastWindow.hscale),
			rYOffset = (yOffset - this.lastWindow.yoffset)/
				((this.lastWindow.vscale == 1)? vs : this.lastWindow.vscale),

			shape = this.group,
			anim = fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform:[
					{name:"translate", start:[0, 0], end: [offsets.l * (1 - rHScale), vOffset * (1 - rVScale)]},
					{name:"scale", start:[1, 1], end: [rHScale, rVScale]},
					{name:"original"},
					{name:"translate", start: [0, 0], end: [rXOffset, rYOffset]}
				]}, this.zoom));

		lang.mixin(this.lastWindow, {vscale: vs, hscale: hs, xoffset: xOffset, yoffset: yOffset});
		//add anim to zooming action queue,
		//in order to avoid several zooming action happened at the same time
		this.zoomQueue.push(anim);
		//perform each anim one by one in zoomQueue
		hub.connect(anim, "onEnd", this, function(){
			this.zoom = null;
			this.zoomQueue.shift();
			if(this.zoomQueue.length > 0){
				this.zoomQueue[0].play();
			}
		});
		if(this.zoomQueue.length == 1){
			this.zoomQueue[0].play();
		}
		return this;	//	dojox.charting.plot2d.Base
	},
	render: function(dim, offsets){
		//	summary:
		//		Render the plot on the chart.
		//	dim: Object
		//		An object of the form { width, height }.
		//	offsets: Object
		//		An object of the form { l, r, t, b }.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		return this;	//	dojox.charting.plot2d.Base
	},
	getRequiredColors: function(){
		//	summary:
		//		Get how many data series we have, so we know how many colors to use.
		//	returns: Number
		//		The number of colors needed.
		return this.series.length;	//	Number
	},
	initializeScalers: function(dim, stats){
		//	summary:
		//		Initializes scalers using attached axes.
		//	dim: Object:
		//		Size of a plot area in pixels as {width, height}.
		//	stats: Object:
		//		Min/max of data in both directions as {hmin, hmax, vmin, vmax}.
		//	returns: dojox.charting.plot2d.Base
		//		A reference to this plot for functional chaining.
		if(this._hAxis){
			if(!this._hAxis.initialized()){
				this._hAxis.calculate(stats.hmin, stats.hmax, dim.width);
			}
			this._hScaler = this._hAxis.getScaler();
		}else{
			this._hScaler = primitive.buildScaler(stats.hmin, stats.hmax, dim.width);
		}
		if(this._vAxis){
			if(!this._vAxis.initialized()){
				this._vAxis.calculate(stats.vmin, stats.vmax, dim.height);
			}
			this._vScaler = this._vAxis.getScaler();
		}else{
			this._vScaler = primitive.buildScaler(stats.vmin, stats.vmax, dim.height);
		}
		return this;	//	dojox.charting.plot2d.Base
	}
});
});

},
'dojox/charting/themes/SageToLime':function(){
define("dojox/charting/themes/SageToLime", ["../Theme", "./common"], function(Theme, themes){
	
	themes.SageToLime=new Theme({
		colors: [
			"#abdbcb",
			"#435a51",
			"#70998b",
			"#5f8074",
			"#80ccbb",
			"#539e8b",
			"#78a596",
			"#335f54",
			"#8dd1c2",
			"#68c5ad"
		]
	});
	
	return themes.SageToLime;
});

},
'dijit/BackgroundIframe':function(){
define("dijit/BackgroundIframe", [
	"require",			// require.toUrl
	".",	// to export dijit.BackgroundIframe
	"dojo/_base/config",
	"dojo/dom-construct", // domConstruct.create
	"dojo/dom-style", // domStyle.set
	"dojo/_base/lang", // lang.extend lang.hitch
	"dojo/on",
	"dojo/_base/sniff", // has("ie"), has("mozilla"), has("quirks")
	"dojo/_base/window" // win.doc.createElement
], function(require, dijit, config, domConstruct, domStyle, lang, on, has, win){

	// module:
	//		dijit/BackgroundIFrame

	// Flag for whether to create background iframe behind popups like Menus and Dialog.
	// A background iframe is useful to prevent problems with popups appearing behind applets/pdf files,
	// and is also useful on older versions of IE (IE6 and IE7) to prevent the "bleed through select" problem.
	// TODO: For 2.0, make this false by default.  Also, possibly move definition to has.js so that this module can be
	// conditionally required via  dojo/has!bgIfame?dijit/BackgroundIframe
	has.add("bgIframe", has("ie") || has("mozilla"));
	// summary:
	//		new dijit.BackgroundIframe(node)
	//		Makes a background iframe as a child of node, that fills
	//		area (and position) of node

	// TODO: remove _frames, it isn't being used much, since popups never release their
	// iframes (see [22236])
	var _frames = new function(){
		// summary:
		//		cache of iframes

		var queue = [];

		this.pop = function(){
			var iframe;
			if(queue.length){
				iframe = queue.pop();
				iframe.style.display="";
			}else{
				if(has("ie") < 9){
					var burl = config["dojoBlankHtmlUrl"] || require.toUrl("dojo/resources/blank.html") || "javascript:\"\"";
					var html="<iframe src='" + burl + "' role='presentation'"
						+ " style='position: absolute; left: 0px; top: 0px;"
						+ "z-index: -1; filter:Alpha(Opacity=\"0\");'>";
					iframe = win.doc.createElement(html);
				}else{
					iframe = domConstruct.create("iframe");
					iframe.src = 'javascript:""';
					iframe.className = "dijitBackgroundIframe";
					iframe.setAttribute("role", "presentation");
					domStyle.set(iframe, "opacity", 0.1);
				}
				iframe.tabIndex = -1; // Magic to prevent iframe from getting focus on tab keypress - as style didn't work.
			}
			return iframe;
		};

		this.push = function(iframe){
			iframe.style.display="none";
			queue.push(iframe);
		}
	}();


	dijit.BackgroundIframe = function(/*DomNode*/ node){
		// summary:
		//		For IE/FF z-index schenanigans. id attribute is required.
		//
		// description:
		//		new dijit.BackgroundIframe(node)
		//			Makes a background iframe as a child of node, that fills
		//			area (and position) of node

		if(!node.id){ throw new Error("no id"); }
		if(has("bgIframe")){
			var iframe = (this.iframe = _frames.pop());
			node.appendChild(iframe);
			if(has("ie")<7 || has("quirks")){
				this.resize(node);
				this._conn = on(node, 'resize', lang.hitch(this, function(){
					this.resize(node);
				}));
			}else{
				domStyle.set(iframe, {
					width: '100%',
					height: '100%'
				});
			}
		}
	};

	lang.extend(dijit.BackgroundIframe, {
		resize: function(node){
			// summary:
			// 		Resize the iframe so it's the same size as node.
			//		Needed on IE6 and IE/quirks because height:100% doesn't work right.
			if(this.iframe){
				domStyle.set(this.iframe, {
					width: node.offsetWidth + 'px',
					height: node.offsetHeight + 'px'
				});
			}
		},
		destroy: function(){
			// summary:
			//		destroy the iframe
			if(this._conn){
				this._conn.remove();
				this._conn = null;
			}
			if(this.iframe){
				_frames.push(this.iframe);
				delete this.iframe;
			}
		}
	});

	return dijit.BackgroundIframe;
});

},
'dijit/form/Button':function(){
require({cache:{
'url:dijit/form/templates/Button.html':"<span class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><span class=\"dijitReset dijitInline dijitButtonNode\"\n\t\tdata-dojo-attach-event=\"ondijitclick:_onClick\" role=\"presentation\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode,focusNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\"></span\n\t\t\t><span class=\"dijitReset dijitToggleButtonIconChar\">&#x25CF;</span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t\tdata-dojo-attach-point=\"containerNode\"\n\t\t\t></span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\"\n\t\ttabIndex=\"-1\" role=\"presentation\" data-dojo-attach-point=\"valueNode\"\n/></span>\n"}});
define("dijit/form/Button", [
	"require",
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.toggle
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.trim
	"dojo/ready",
	"./_FormWidget",
	"./_ButtonMixin",
	"dojo/text!./templates/Button.html"
], function(require, declare, domClass, kernel, lang, ready, _FormWidget, _ButtonMixin, template){

/*=====
	var _FormWidget = dijit.form._FormWidget;
	var _ButtonMixin = dijit.form._ButtonMixin;
=====*/

// module:
//		dijit/form/Button
// summary:
//		Button widget

// Back compat w/1.6, remove for 2.0
if(!kernel.isAsync){
	ready(0, function(){
		var requires = ["dijit/form/DropDownButton", "dijit/form/ComboButton", "dijit/form/ToggleButton"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}

return declare("dijit.form.Button", [_FormWidget, _ButtonMixin], {
	// summary:
	//		Basically the same thing as a normal HTML button, but with special styling.
	// description:
	//		Buttons can display a label, an icon, or both.
	//		A label should always be specified (through innerHTML) or the label
	//		attribute.  It can be hidden via showLabel=false.
	// example:
	// |	<button data-dojo-type="dijit.form.Button" onClick="...">Hello world</button>
	//
	// example:
	// |	var button1 = new dijit.form.Button({label: "hello world", onClick: foo});
	// |	dojo.body().appendChild(button1.domNode);

	// showLabel: Boolean
	//		Set this to true to hide the label text and display only the icon.
	//		(If showLabel=false then iconClass must be specified.)
	//		Especially useful for toolbars.
	//		If showLabel=true, the label will become the title (a.k.a. tooltip/hint) of the icon.
	//
	//		The exception case is for computers in high-contrast mode, where the label
	//		will still be displayed, since the icon doesn't appear.
	showLabel: true,

	// iconClass: String
	//		Class to apply to DOMNode in button to make it display an icon
	iconClass: "dijitNoIcon",
	_setIconClassAttr: { node: "iconNode", type: "class" },

	baseClass: "dijitButton",

	templateString: template,

	// Map widget attributes to DOMNode attributes.
	_setValueAttr: "valueNode",

	_onClick: function(/*Event*/ e){
		// summary:
		//		Internal function to handle click actions
		var ok = this.inherited(arguments);
		if(ok){
			if(this.valueNode){
				this.valueNode.click();
				e.preventDefault(); // cancel BUTTON click and continue with hidden INPUT click
				// leave ok = true so that subclasses can do what they need to do
			}
		}
		return ok;
	},

	_fillContent: function(/*DomNode*/ source){
		// Overrides _Templated._fillContent().
		// If button label is specified as srcNodeRef.innerHTML rather than
		// this.params.label, handle it here.
		// TODO: remove the method in 2.0, parser will do it all for me
		if(source && (!this.params || !("label" in this.params))){
			var sourceLabel = lang.trim(source.innerHTML);
			if(sourceLabel){
				this.label = sourceLabel; // _applyAttributes will be called after buildRendering completes to update the DOM
			}
		}
	},

	_setShowLabelAttr: function(val){
		if(this.containerNode){
			domClass.toggle(this.containerNode, "dijitDisplayNone", !val);
		}
		this._set("showLabel", val);
	},

	setLabel: function(/*String*/ content){
		// summary:
		//		Deprecated.  Use set('label', ...) instead.
		kernel.deprecated("dijit.form.Button.setLabel() is deprecated.  Use set('label', ...) instead.", "", "2.0");
		this.set("label", content);
	},

	_setLabelAttr: function(/*String*/ content){
		// summary:
		//		Hook for set('label', ...) to work.
		// description:
		//		Set the label (text) of the button; takes an HTML string.
		//		If the label is hidden (showLabel=false) then and no title has
		//		been specified, then label is also set as title attribute of icon.
		this.inherited(arguments);
		if(!this.showLabel && !("title" in this.params)){
			this.titleNode.title = lang.trim(this.containerNode.innerText || this.containerNode.textContent || '');
		}
	}
});


});


},
'dojox/charting/DataChart':function(){
define("dojox/charting/DataChart", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/html", "dojo/_base/connect",
	 "dojo/_base/array", "./Chart2D", "./themes/PlotKit/blue", "dojo/dom"], 
	 function(kernel, lang, declare, html, hub, arr, Chart, blue, dom){
	// FIXME: This module drags in all Charting modules because of the Chart2D dependency...it is VERY heavy
	kernel.experimental("dojox.charting.DataChart");

	// Defaults for axes
	//	to be mixed in with xaxis/yaxis custom properties
	// see dojox.charting.axis2d.Default for details.
	var _yaxis = {
		vertical: true,
		min: 0,
		max: 10,
		majorTickStep: 5,
		minorTickStep: 1,
		natural:false,
		stroke: "black",
		majorTick: {stroke: "black", length: 8},
		minorTick: {stroke: "gray", length: 2},
		majorLabels:true
	};

	var _xaxis = {
		natural: true, 		// true - no fractions
		majorLabels: true, 	//show labels on major ticks
		includeZero: false, // do not change on upating chart
		majorTickStep: 1,
		majorTick: {stroke: "black", length: 8},
		fixUpper:"major",
		stroke: "black",
		htmlLabels: true,
		from:1
	};

	// default for chart elements
	var chartPlot = {
		markers: true,
		tension:2,
		gap:2
	};
	/*=====
	var Chart = dojox.charting.Chart;
	=====*/
	return declare("dojox.charting.DataChart", Chart, {
		//	summary:
		//		DataChart
		//		Extension to the 2D chart that connects to a data store in
		//		a simple manner. Convenience methods have been added for
		//		connecting store item labels to the chart labels.
		//
		//	description:
		//		This code should be considered very experimental and the APIs subject
		//		to change. This is currently an alpha version and will need some testing
		//		and review.
		//
		//		The main reason for this extension is to create animated charts, generally
		//		available with scroll=true, and a property field that gets continually updated.
		//		The previous property settings are kept in memory and displayed until scrolled
		//		off the chart.
		//
		//		Although great effort was made to maintain the integrity of the current
		//		charting APIs, some things have been added or modified in order to get
		//		the store to connect and also to get the data to scroll/animate.
		//		"displayRange" in particular is used to force the xaxis to a specific
		//		size and keep the chart from stretching or squashing to fit the data.
		//
		//		Currently, plot lines can only be set at initialization. Setting
		//		a new store query will have no effect (although using setStore
		//		may work but its untested).
		//
		//	example:
		//
		//	|	var chart = new dojox.charting.DataChart("myNode", {
		//	|		displayRange:8,
		//	|		store:dataStore,
		//	|		query:{symbol:"*"},
		//	|		fieldName:"price"
		//	|		type: dojox.charting.plot2d.Columns
		//	|	});
		//
		//	properties:
		//
		//	scroll: Boolean
		//		Whether live data updates and changes display, like columns moving
		//		up and down, or whether it scrolls to the left as data is added
		scroll:true,
		//
		//	comparative: Boolean
		//		If false, all items are each their own series.
		//		If true, the items are combined into one series
		//		so that their charted properties can be compared.
		comparative:false,
		//
		//		query: String
		//			Used for fetching items. Will vary depending upon store.
		query: "*",
		//
		//		queryOptions: String
		//			Option used for fetching items
		queryOptions: "",
		//
		/*=====
			//	start:Number
			//		first item to fetch from store
			//	count:Number
			//		Total amount of items to fetch from store
			//	sort:Object
			//		Paramaters to sort the fetched items from store
		=====*/
		//
		//		fieldName: String
		//			The field in the store item that is getting charted
		fieldName: "value",
		//
		//		chartTheme: dojox.charting.themes.*
		//			The theme to style the chart. Defaults to PlotKit.blue.
		chartTheme: blue,
		//
		//		displayRange: Number
		//			The number of major ticks to show on the xaxis
		displayRange:0,
		//
		// 		stretchToFit: Boolean
		//			If true, chart is sized to data. If false, chart is a
		//			fixed size. Note, is overridden by displayRange.
		//			TODO: Stretch for the y-axis?
		stretchToFit:true,
		//
		//		minWidth: Number
		//			The the smallest the chart width can be
		minWidth:200,
		//
		//		minHeight: Number
		//			The the smallest the chart height can be
		minHeight:100,
		//
		//		showing: Boolean
		//			Whether the chart is showing (default) on
		//			initialization or hidden.
		showing: true,
		//
		//		label: String
		//			The name field of the store item
		//			DO NOT SET: Set from store.labelAttribute
		label: "name",

		constructor: function(node, kwArgs){
			// summary:
			//		Set up properties and initialize chart build.
			//
			//	arguments:
			//		node: DomNode
			//			The node to attach the chart to.
			//		kwArgs:	Object
			//			xaxis: Object
			//				optional parameters for xaxis (see above)
			//			yaxis: Object
			//				optional parameters for yaxis (see above)
			//			store: Object
			//				dojo.data store (currently nly supports Persevere)
			//			xaxis: Object
			//				First query for store
			//			grid: Object
			//				Options for the grid plot
			//			chartPlot: Object
			//				Options for chart elements (lines, bars, etc)

			this.domNode = dom.byId(node);

			lang.mixin(this, kwArgs);

			this.xaxis = lang.mixin(lang.mixin({}, _xaxis), kwArgs.xaxis);
			if(this.xaxis.labelFunc == "seriesLabels"){
				this.xaxis.labelFunc = lang.hitch(this, "seriesLabels");
			}

			this.yaxis = lang.mixin(lang.mixin({}, _yaxis), kwArgs.yaxis);
			if(this.yaxis.labelFunc == "seriesLabels"){
				this.yaxis.labelFunc = lang.hitch(this, "seriesLabels");
			}

			// potential event's collector
			this._events = [];

			this.convertLabels(this.yaxis);
			this.convertLabels(this.xaxis);

			this.onSetItems = {};
			this.onSetInterval = 0;
			this.dataLength = 0;
			this.seriesData = {};
			this.seriesDataBk = {};
			this.firstRun =  true;

			this.dataOffset = 0;

			// FIXME: looks better with this, but it's custom
			this.chartTheme.plotarea.stroke = {color: "gray", width: 3};

			this.setTheme(this.chartTheme);

			// displayRange overrides stretchToFit
			if(this.displayRange){
				this.stretchToFit = false;
			}
			if(!this.stretchToFit){
				this.xaxis.to = this.displayRange;
			}
			this.addAxis("x", this.xaxis);
			this.addAxis("y", this.yaxis);
			chartPlot.type = kwArgs.type || "Markers"
			this.addPlot("default", lang.mixin(chartPlot, kwArgs.chartPlot));

			this.addPlot("grid", lang.mixin(kwArgs.grid || {}, {type: "Grid", hMinorLines: true}));

			if(this.showing){
				this.render();
			}

			if(kwArgs.store){
				this.setStore(kwArgs.store, kwArgs.query, kwArgs.fieldName, kwArgs.queryOptions);
			}
		},

		destroy: function(){
			arr.forEach(this._events, hub.disconnect);
			this.inherited(arguments);
		},

		setStore: function(/*Object*/store, /* ? String*/query, /* ? String*/fieldName, /* ? Object */queryOptions){
			//	 summary:
			//		Sets the chart store and query
			//		then does the first fetch and
			//		connects to subsequent changes.
			//
			// TODO: Not handling resetting store
			//
			this.firstRun = true;
			this.store = store || this.store;
			this.query = query || this.query;
			this.fieldName = fieldName || this.fieldName;
			this.label = this.store.getLabelAttributes();
			this.queryOptions = queryOptions || queryOptions;

			arr.forEach(this._events, hub.disconnect);
			this._events = [
				hub.connect(this.store, "onSet", this, "onSet"),
				hub.connect(this.store, "onError", this, "onError")
			];
			this.fetch();
		},

		show: function(){
			// summary:
			//		If chart is hidden, show it
			if(!this.showing){
				html.style(this.domNode, "display", "");
				this.showing = true;
				this.render();
			}
		},
		hide: function(){
			// 	summary:
			//		If chart is showing, hide it
			//		Prevents rendering while hidden
			if(this.showing){
				html.style(this.domNode, "display", "none");
				this.showing = false;
			}
		},

		onSet: function(/*storeObject*/item){
			//	summary:
			//		Fired when a store item changes.
			//		Collects the item calls and when
			//		done (after 200ms), sends item
			//		array to onData().
			//
			// FIXME: Using labels instead of IDs for item
			//	identifiers here and in the chart series. This
			//	is obviously short sighted, but currently used
			//	for seriesLabels. Workaround for potential bugs
			//	is to assign a label for which all items are unique.

			var nm = this.getProperty(item, this.label);

			// FIXME: why the check for if-in-runs?
			if(nm in this.runs || this.comparative){
				clearTimeout(this.onSetInterval);
				if(!this.onSetItems[nm]){
					this.onSetItems[nm] = item;
				}
				this.onSetInterval = setTimeout(lang.hitch(this, function(){
					clearTimeout(this.onSetInterval);
					var items = [];
					for(var nm in this.onSetItems){
						items.push(this.onSetItems[nm]);
					}
					this.onData(items);
					this.onSetItems = {};
				}),200);
			}
		},

		onError: function(/*Error*/err){
			// stub
			//	Fires on fetch error
			console.error("DataChart Error:", err);
		},

		onDataReceived: function(/*Array*/items){
			// summary:
			//		stub. Fires after data is received but
			//		before data is parsed and rendered
		},

		getProperty: function(/*storeObject*/item, prop){
			// summary:
			//		The main use of this function is to determine
			//		between a single value and an array of values.
			//		Other property types included for convenience.
			//
			if(prop==this.label){
				return this.store.getLabel(item);
			}
			if(prop=="id"){
				return this.store.getIdentity(item);
			}
			var value = this.store.getValues(item, prop);
			if(value.length < 2){
				value = this.store.getValue(item, prop);
			}
			return value;
		},
		onData: function(/*Array*/items){
			//	summary:
			//		Called after a completed fetch
			//		or when store items change.
			//		On first run, sets the chart data,
			//		then updates chart and legends.
			//
			//console.log("Store:", store);console.log("items: (", items.length+")", items);console.log("Chart:", this);
			if(!items || !items.length){ return; }

			if(this.items && this.items.length != items.length){
				arr.forEach(items, function(m){
					var id = this.getProperty(m, "id");
					arr.forEach(this.items, function(m2, i){
						if(this.getProperty(m2, "id") == id){
							this.items[i] = m2;
						}
					},this);
				}, this);
				items = this.items;
			}
			if(this.stretchToFit){
				this.displayRange = items.length;
			}
			this.onDataReceived(items);
			this.items = items;


			if(this.comparative){
				// all items are gathered together and used as one
				//	series so their properties can be compared.
				var nm = "default";

				this.seriesData[nm] = [];
				this.seriesDataBk[nm] = [];
				arr.forEach(items, function(m, i){
					var field = this.getProperty(m, this.fieldName);
					this.seriesData[nm].push(field);
				}, this);

			}else{

				// each item is a seperate series.
				arr.forEach(items, function(m, i){
					var nm = this.store.getLabel(m);
					if(!this.seriesData[nm]){
						this.seriesData[nm] = [];
						this.seriesDataBk[nm] = [];
					}

					// the property in the item we are using
					var field = this.getProperty(m, this.fieldName);
					if(lang.isArray(field)){
						// Data is an array, so it's a snapshot, and not
						//	live, updating data
						//
						this.seriesData[nm] = field;

					}else{
						if(!this.scroll){
							// Data updates, and "moves in place". Columns and
							//	line markers go up and down
							//
							// create empty chart elements by starting an array
							//	with zeros until we reach our relevant data
							var ar = arr.map(new Array(i+1), function(){ return 0; });
							ar.push(Number(field));
							this.seriesData[nm] = ar;

						}else{
							// Data updates and scrolls to the left
							if(this.seriesDataBk[nm].length > this.seriesData[nm].length){
								this.seriesData[nm] = this.seriesDataBk[nm];
							}
							// Collecting and storing series data. The items come in
							//	only one at a time, but we need to display historical
							//	data, so it is kept in memory.
							this.seriesData[nm].push(Number(field));
						}
						this.seriesDataBk[nm].push(Number(field));
					}
				}, this);
			}

			// displayData is the segment of the data array that is within
			// the chart boundaries
			var displayData;
			if(this.firstRun){
				// First time around we need to add the series (chart lines)
				//	to the chart.
				this.firstRun = false;
				for(nm in this.seriesData){
					this.addSeries(nm, this.seriesData[nm]);
					displayData = this.seriesData[nm];
				}

			}else{

				// update existing series
				for(nm in this.seriesData){
					displayData = this.seriesData[nm];

					if(this.scroll && displayData.length > this.displayRange){
						// chart lines have gone beyond the right boundary.
						this.dataOffset = displayData.length-this.displayRange - 1;
						displayData = displayData.slice(displayData.length-this.displayRange, displayData.length);
					}
					this.updateSeries(nm, displayData);
				}
			}
			this.dataLength = displayData.length;

			if(this.showing){
				this.render();
			}

		},

		fetch: function(){
			// summary:
			//		Fetches initial data. Subsequent changes
			//		are received via onSet in data store.
			//
			if(!this.store){ return; }
			this.store.fetch({query:this.query, queryOptions:this.queryOptions, start:this.start, count:this.count, sort:this.sort,
				onComplete:lang.hitch(this, function(data){
					setTimeout(lang.hitch(this, function(){
						this.onData(data)
					}),0);
				}),
				onError:lang.hitch(this, "onError")
			});
		},

		convertLabels: function(axis){
			// summary:
			//		Convenience method to convert a label array of strings
			//		into an array of objects
			//
			if(!axis.labels || lang.isObject(axis.labels[0])){ return null; }

			axis.labels = arr.map(axis.labels, function(ele, i){
				return {value:i, text:ele};
			});
			return null; // null
		},

		seriesLabels: function(/*Number*/val){
			// summary:
			//		Convenience method that sets series labels based on item labels.
			val--;
			if(this.series.length<1 || (!this.comparative && val>this.series.length)){ return "-"; }
			if(this.comparative){
				return this.store.getLabel(this.items[val]);// String

			}else{
				// FIXME:
				// Here we are setting the label base on if there is data in the array slot.
				//	A typical series may look like: [0,0,3.1,0,0,0] which mean the data is populated in the
				//	3rd row or column. This works well and keeps the labels aligned but has a side effect
				//	of not showing the label is the data is zero. Work around is to not go lower than
				//	0.01 or something.
				for(var i=0;i<this.series.length; i++){
					if(this.series[i].data[val]>0){
						return this.series[i].name; // String
					}
				}
			}
			return "-"; // String

		},

		resizeChart: function(/*Object*/dim){
			//	summary:
			//		Call this function to change the chart size.
			//		Can be connected to a layout widget that calls
			//		resize.
			//
			var w = Math.max(dim.w, this.minWidth);
			var h = Math.max(dim.h, this.minHeight);
			this.resize(w, h);
		}
	});
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
'dojox/charting/plot2d/Default':function(){
define("dojox/charting/plot2d/Default", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", 
		"./Base", "./common", "dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils", "dojox/gfx/fx"], 
	function(lang, declare, arr, Base, dc, df, dfr, du, fx){

	/*=====
	dojo.declare("dojox.charting.plot2d.__DefaultCtorArgs", dojox.charting.plot2d.__PlotCtorArgs, {
		//	summary:
		//		The arguments used for any/most plots.
	
		//	hAxis: String?
		//		The horizontal axis name.
		hAxis: "x",
	
		//	vAxis: String?
		//		The vertical axis name
		vAxis: "y",
	
		//	lines: Boolean?
		//		Whether or not to draw lines on this plot.  Defaults to true.
		lines:   true,
	
		//	areas: Boolean?
		//		Whether or not to draw areas on this plot. Defaults to false.
		areas:   false,
	
		//	markers: Boolean?
		//		Whether or not to draw markers at data points on this plot. Default is false.
		markers: false,
	
		//	tension: Number|String?
		//		Whether or not to apply 'tensioning' to the lines on this chart.
		//		Options include a number, "X", "x", or "S"; if a number is used, the
		//		simpler bezier curve calculations are used to draw the lines.  If X, x or S
		//		is used, the more accurate smoothing algorithm is used.
		tension: "",
	
		//	animate: Boolean?
		//		Whether or not to animate the chart to place.
		animate: false,
	
		//	stroke: dojox.gfx.Stroke?
		//		An optional stroke to use for any series on the plot.
		stroke:		{},
	
		//	outline: dojox.gfx.Stroke?
		//		An optional stroke used to outline any series on the plot.
		outline:	{},
	
		//	shadow: dojox.gfx.Stroke?
		//		An optional stroke to use to draw any shadows for a series on a plot.
		shadow:		{},
	
		//	fill: dojox.gfx.Fill?
		//		Any fill to be used for elements on the plot (such as areas).
		fill:		{},
	
		//	font: String?
		//		A font definition to be used for labels and other text-based elements on the plot.
		font:		"",
	
		//	fontColor: String|dojo.Color?
		//		The color to be used for any text-based elements on the plot.
		fontColor:	"",
	
		//	markerStroke: dojo.gfx.Stroke?
		//		An optional stroke to use for any markers on the plot.
		markerStroke:		{},
	
		//	markerOutline: dojo.gfx.Stroke?
		//		An optional outline to use for any markers on the plot.
		markerOutline:		{},
	
		//	markerShadow: dojo.gfx.Stroke?
		//		An optional shadow to use for any markers on the plot.
		markerShadow:		{},
	
		//	markerFill: dojo.gfx.Fill?
		//		An optional fill to use for any markers on the plot.
		markerFill:			{},
	
		//	markerFont: String?
		//		An optional font definition to use for any markers on the plot.
		markerFont:			"",
	
		//	markerFontColor: String|dojo.Color?
		//		An optional color to use for any marker text on the plot.
		markerFontColor:	"",
		
		//	enableCache: Boolean?
		//		Whether the markers are cached from one rendering to another. This improves the rendering performance of
		//		successive rendering but penalize the first rendering.  Default false.
		enableCache: false
	});
	
	var Base = dojox.charting.plot2d.Base;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	var DEFAULT_ANIMATION_LENGTH = 1200;	// in ms

	return declare("dojox.charting.plot2d.Default", Base, {
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			lines:   true,	// draw lines
			areas:   false,	// draw areas
			markers: false,	// draw markers
			tension: "",	// draw curved lines (tension is "X", "x", or "S")
			animate: false, // animate chart to place
			enableCache: false 
		},
		optionalParams: {
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	"",
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerFont:			"",
			markerFontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Return a new plot.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__DefaultCtorArgs?
			//		An optional arguments object to help define this plot.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
            du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;

			// animation properties
			this.animate = this.opt.animate;
		},

		createPath: function(run, creator, params){
			var path;
			if(this.opt.enableCache && run._pathFreePool.length > 0){
				path = run._pathFreePool.pop();
				path.setShape(params);
				// was cleared, add it back
				creator.add(path);
			}else{
				path = creator.createPath(params);
			}
			if(this.opt.enableCache){
				run._pathUsePool.push(path);
			}
			return path;
		},

		render: function(dim, offsets){
			//	summary:
			//		Render/draw everything on this plot.
			//	dim: Object
			//		An object of the form { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b }
			//	returns: dojox.charting.plot2d.Default
			//		A reference to this plot for functional chaining.

			// make sure all the series is not modified
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}

			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				this.group.setTransform(null);
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, stroke, outline, marker, events = this.events();

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(this.opt.enableCache){
					run._pathFreePool = (run._pathFreePool?run._pathFreePool:[]).concat(run._pathUsePool?run._pathUsePool:[]);
					run._pathUsePool = [];
				}
				if(!run.data.length){
					run.dirty = false;
					t.skip();
					continue;
				}

				var theme = t.next(this.opt.areas ? "area" : "line", [this.opt, run], true),
					s = run.group, rsegments = [], startindexes = [], rseg = null, lpoly,
					ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
					vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
					eventSeries = this._eventSeries[run.name] = new Array(run.data.length);
				
				// optim works only for index based case
				var indexed = typeof run.data[0] == "number";
				var min = indexed?Math.max(0, Math.floor(this._hScaler.bounds.from - 1)):0, 
						max = indexed?Math.min(run.data.length, Math.ceil(this._hScaler.bounds.to)):run.data.length;

                // split the run data into dense segments (each containing no nulls)
                for(var j = min; j < max; j++){
                    if(run.data[j] != null){
                        if(!rseg){
                            rseg = [];
                            startindexes.push(j);
                            rsegments.push(rseg);
                        }
                        rseg.push(run.data[j]);
                    }else{
                        rseg = null;
                    }
                }

                for(var seg = 0; seg < rsegments.length; seg++){
					if(typeof rsegments[seg][0] == "number"){
						lpoly = arr.map(rsegments[seg], function(v, i){
							return {
								x: ht(i + startindexes[seg] + 1) + offsets.l,
								y: dim.height - offsets.b - vt(v)
							};
						}, this);
					}else{
						lpoly = arr.map(rsegments[seg], function(v, i){
							return {
								x: ht(v.x) + offsets.l,
								y: dim.height - offsets.b - vt(v.y)
							};
						}, this);
					}

					var lpath = this.opt.tension ? dc.curve(lpoly, this.opt.tension) : "";

					if(this.opt.areas && lpoly.length > 1){
						var fill = theme.series.fill;
						var apoly = lang.clone(lpoly);
						if(this.opt.tension){
							var apath = "L" + apoly[apoly.length-1].x + "," + (dim.height - offsets.b) +
								" L" + apoly[0].x + "," + (dim.height - offsets.b) +
								" L" + apoly[0].x + "," + apoly[0].y;
							run.dyn.fill = s.createPath(lpath + " " + apath).setFill(fill).getFill();
						} else {
							apoly.push({x: lpoly[lpoly.length - 1].x, y: dim.height - offsets.b});
							apoly.push({x: lpoly[0].x, y: dim.height - offsets.b});
							apoly.push(lpoly[0]);
							run.dyn.fill = s.createPolyline(apoly).setFill(fill).getFill();
						}
					}
					if(this.opt.lines || this.opt.markers){
						// need a stroke
						stroke = theme.series.stroke;
						if(theme.series.outline){
							outline = run.dyn.outline = dc.makeStroke(theme.series.outline);
							outline.width = 2 * outline.width + stroke.width;
						}
					}
					if(this.opt.markers){
						run.dyn.marker = theme.symbol;
					}
					var frontMarkers = null, outlineMarkers = null, shadowMarkers = null;
					if(stroke && theme.series.shadow && lpoly.length > 1){
						var shadow = theme.series.shadow,
							spoly = arr.map(lpoly, function(c){
								return {x: c.x + shadow.dx, y: c.y + shadow.dy};
							});
						if(this.opt.lines){
							if(this.opt.tension){
								run.dyn.shadow = s.createPath(dc.curve(spoly, this.opt.tension)).setStroke(shadow).getStroke();
							} else {
								run.dyn.shadow = s.createPolyline(spoly).setStroke(shadow).getStroke();
							}
						}
						if(this.opt.markers && theme.marker.shadow){
							shadow = theme.marker.shadow;
							shadowMarkers = arr.map(spoly, function(c){
								return this.createPath(run, s, "M" + c.x + " " + c.y + " " + theme.symbol).
									setStroke(shadow).setFill(shadow.color);
							}, this);
						}
					}
					if(this.opt.lines && lpoly.length > 1){
						if(outline){
							if(this.opt.tension){
								run.dyn.outline = s.createPath(lpath).setStroke(outline).getStroke();
							} else {
								run.dyn.outline = s.createPolyline(lpoly).setStroke(outline).getStroke();
							}
						}
						if(this.opt.tension){
							run.dyn.stroke = s.createPath(lpath).setStroke(stroke).getStroke();
						} else {
							run.dyn.stroke = s.createPolyline(lpoly).setStroke(stroke).getStroke();
						}
					}
					if(this.opt.markers){
						frontMarkers = new Array(lpoly.length);
						outlineMarkers = new Array(lpoly.length);
						outline = null;
						if(theme.marker.outline){
							outline = dc.makeStroke(theme.marker.outline);
							outline.width = 2 * outline.width + (theme.marker.stroke ? theme.marker.stroke.width : 0);
						}
						arr.forEach(lpoly, function(c, i){
							var path = "M" + c.x + " " + c.y + " " + theme.symbol;
							if(outline){
								outlineMarkers[i] = this.createPath(run, s, path).setStroke(outline);
							}
							frontMarkers[i] = this.createPath(run, s, path).setStroke(theme.marker.stroke).setFill(theme.marker.fill);
						}, this);
						run.dyn.markerFill = theme.marker.fill;
						run.dyn.markerStroke = theme.marker.stroke;
						if(events){
							arr.forEach(frontMarkers, function(s, i){
								var o = {
									element: "marker",
									index:   i + startindexes[seg],
									run:     run,
									shape:   s,
									outline: outlineMarkers[i] || null,
									shadow:  shadowMarkers && shadowMarkers[i] || null,
									cx:      lpoly[i].x,
									cy:      lpoly[i].y
								};
								if(typeof rsegments[seg][0] == "number"){
									o.x = i + startindexes[seg] + 1;
									o.y = rsegments[seg][i];
								}else{
									o.x = rsegments[seg][i].x;
									o.y = rsegments[seg][i].y;
								}
								this._connectEvents(o);
								eventSeries[i + startindexes[seg]] = o;
							}, this);
						}else{
							delete this._eventSeries[run.name];
						}
					}
                }
				run.dirty = false;
			}
			if(this.animate){
				// grow from the bottom
				var plotGroup = this.group;
				fx.animateTransform(lang.delegate({
					shape: plotGroup,
					duration: DEFAULT_ANIMATION_LENGTH,
					transform:[
						{name:"translate", start: [0, dim.height - offsets.b], end: [0, 0]},
						{name:"scale", start: [1, 0], end:[1, 1]},
						{name:"original"}
					]
				}, this.animate)).play();
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Default
		}
	});
});

},
'dojox/charting/plot2d/StackedLines':function(){
define("dojox/charting/plot2d/StackedLines", ["dojo/_base/declare", "./Stacked"], function(declare, Stacked){
/*=====
var Stacked = dojox.charting.plot2d.Stacked;
=====*/
	return declare("dojox.charting.plot2d.StackedLines", Stacked, {
		//	summary:
		//		A convenience object to create a stacked line chart.
		constructor: function(){
			//	summary:
			//		Force our Stacked base to be lines only.
			this.opt.lines = true;
		}
	});
});

},
'dojox/charting/themes/PurpleRain':function(){
define("dojox/charting/themes/PurpleRain", ["../Theme", "./common"], function(Theme, themes){
	
	//	notes: colors generated by moving in 30 degree increments around the hue circle,
	//		at 90% saturation, using a B value of 75 (HSB model).
	themes.PurpleRain=new Theme({
		colors: [
			"#4879bc",
			"#ef446f",
			"#3f58a7",
			"#8254a2",
			"#4956a6"
		]
	});
	
	return themes.PurpleRain;
});

},
'url:dijit/templates/Tooltip.html':"<div class=\"dijitTooltip dijitTooltipLeft\" id=\"dojoTooltip\"\n\t><div class=\"dijitTooltipContainer dijitTooltipContents\" data-dojo-attach-point=\"containerNode\" role='alert'></div\n\t><div class=\"dijitTooltipConnector\" data-dojo-attach-point=\"connectorNode\"></div\n></div>\n",
'dojox/charting/themes/Ireland':function(){
define("dojox/charting/themes/Ireland", ["../Theme", "./common"], function(Theme, themes){
	
	themes.Ireland=new Theme({
		colors: [
			"#abdbcb",
			"#435a51",
			"#70998b",
			"#78d596",
			"#5f8074"
		]
	});
	
	return themes.Ireland;
});

},
'dojox/charting/themes/Grasshopper':function(){
define("dojox/charting/themes/Grasshopper", ["dojo/_base/lang","../Theme", "./common"], function(lang, Theme, themes){
	themes.Grasshopper=new Theme({
		colors: [
			"#208040",
			"#40b657",
			"#78c25e",
			"#14401f",
			"#64bd5f"
		]
	});
	return themes.Grasshopper;
});

},
'dojo/fx/easing':function(){
define("dojo/fx/easing", ["../_base/lang"], function(lang) {
// module:
//		dojo/fx/easing
// summary:
//		This module defines standard easing functions that are useful for animations.

var easingFuncs = /*===== dojo.fx.easing= =====*/ {
	// summary:
	//		Collection of easing functions to use beyond the default
	//		`dojo._defaultEasing` function.
	//
	// description:
	//
	//		Easing functions are used to manipulate the iteration through
	//		an `dojo.Animation`s _Line. _Line being the properties of an Animation,
	//		and the easing function progresses through that Line determing
	//		how quickly (or slowly) it should go. Or more accurately: modify
	//		the value of the _Line based on the percentage of animation completed.
	//
	//		All functions follow a simple naming convention of "ease type" + "when".
	//		If the name of the function ends in Out, the easing described appears
	//		towards the end of the animation. "In" means during the beginning,
	//		and InOut means both ranges of the Animation will applied, both
	//		beginning and end.
	//
	//		One does not call the easing function directly, it must be passed to
	//		the `easing` property of an animation.
	//
	//	example:
	//	|	dojo.require("dojo.fx.easing");
	//	|	var anim = dojo.fadeOut({
	//	|		node: 'node',
	//	|		duration: 2000,
	//	|		//	note there is no ()
	//	|		easing: dojo.fx.easing.quadIn
	//	|	}).play();
	//

	linear: function(/* Decimal? */n){
		// summary: A linear easing function
		return n;
	},

	quadIn: function(/* Decimal? */n){
		return Math.pow(n, 2);
	},

	quadOut: function(/* Decimal? */n){
		return n * (n - 2) * -1;
	},

	quadInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 2) / 2; }
		return -1 * ((--n) * (n - 2) - 1) / 2;
	},

	cubicIn: function(/* Decimal? */n){
		return Math.pow(n, 3);
	},

	cubicOut: function(/* Decimal? */n){
		return Math.pow(n - 1, 3) + 1;
	},

	cubicInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 3) / 2; }
		n -= 2;
		return (Math.pow(n, 3) + 2) / 2;
	},

	quartIn: function(/* Decimal? */n){
		return Math.pow(n, 4);
	},

	quartOut: function(/* Decimal? */n){
		return -1 * (Math.pow(n - 1, 4) - 1);
	},

	quartInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 4) / 2; }
		n -= 2;
		return -1 / 2 * (Math.pow(n, 4) - 2);
	},

	quintIn: function(/* Decimal? */n){
		return Math.pow(n, 5);
	},

	quintOut: function(/* Decimal? */n){
		return Math.pow(n - 1, 5) + 1;
	},

	quintInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return Math.pow(n, 5) / 2; }
		n -= 2;
		return (Math.pow(n, 5) + 2) / 2;
	},

	sineIn: function(/* Decimal? */n){
		return -1 * Math.cos(n * (Math.PI / 2)) + 1;
	},

	sineOut: function(/* Decimal? */n){
		return Math.sin(n * (Math.PI / 2));
	},

	sineInOut: function(/* Decimal? */n){
		return -1 * (Math.cos(Math.PI * n) - 1) / 2;
	},

	expoIn: function(/* Decimal? */n){
		return (n == 0) ? 0 : Math.pow(2, 10 * (n - 1));
	},

	expoOut: function(/* Decimal? */n){
		return (n == 1) ? 1 : (-1 * Math.pow(2, -10 * n) + 1);
	},

	expoInOut: function(/* Decimal? */n){
		if(n == 0){ return 0; }
		if(n == 1){ return 1; }
		n = n * 2;
		if(n < 1){ return Math.pow(2, 10 * (n - 1)) / 2; }
		--n;
		return (-1 * Math.pow(2, -10 * n) + 2) / 2;
	},

	circIn: function(/* Decimal? */n){
		return -1 * (Math.sqrt(1 - Math.pow(n, 2)) - 1);
	},

	circOut: function(/* Decimal? */n){
		n = n - 1;
		return Math.sqrt(1 - Math.pow(n, 2));
	},

	circInOut: function(/* Decimal? */n){
		n = n * 2;
		if(n < 1){ return -1 / 2 * (Math.sqrt(1 - Math.pow(n, 2)) - 1); }
		n -= 2;
		return 1 / 2 * (Math.sqrt(1 - Math.pow(n, 2)) + 1);
	},

	backIn: function(/* Decimal? */n){
		// summary:
		//		An easing function that starts away from the target,
		//		and quickly accelerates towards the end value.
		//
		//		Use caution when the easing will cause values to become
		//		negative as some properties cannot be set to negative values.
		var s = 1.70158;
		return Math.pow(n, 2) * ((s + 1) * n - s);
	},

	backOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that pops past the range briefly, and slowly comes back.
		//
		// description:
		//		An easing function that pops past the range briefly, and slowly comes back.
		//
		//		Use caution when the easing will cause values to become negative as some
		//		properties cannot be set to negative values.

		n = n - 1;
		var s = 1.70158;
		return Math.pow(n, 2) * ((s + 1) * n + s) + 1;
	},

	backInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function combining the effects of `backIn` and `backOut`
		//
		// description:
		//		An easing function combining the effects of `backIn` and `backOut`.
		//		Use caution when the easing will cause values to become negative
		//		as some properties cannot be set to negative values.
		var s = 1.70158 * 1.525;
		n = n * 2;
		if(n < 1){ return (Math.pow(n, 2) * ((s + 1) * n - s)) / 2; }
		n-=2;
		return (Math.pow(n, 2) * ((s + 1) * n + s) + 2) / 2;
	},

	elasticIn: function(/* Decimal? */n){
		// summary:
		//		An easing function the elastically snaps from the start value
		//
		// description:
		//		An easing function the elastically snaps from the start value
		//
		//		Use caution when the elasticity will cause values to become negative
		//		as some properties cannot be set to negative values.
		if(n == 0 || n == 1){ return n; }
		var p = .3;
		var s = p / 4;
		n = n - 1;
		return -1 * Math.pow(2, 10 * n) * Math.sin((n - s) * (2 * Math.PI) / p);
	},

	elasticOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that elasticly snaps around the target value,
		//		near the end of the Animation
		//
		// description:
		//		An easing function that elasticly snaps around the target value,
		//		near the end of the Animation
		//
		//		Use caution when the elasticity will cause values to become
		//		negative as some properties cannot be set to negative values.
		if(n==0 || n == 1){ return n; }
		var p = .3;
		var s = p / 4;
		return Math.pow(2, -10 * n) * Math.sin((n - s) * (2 * Math.PI) / p) + 1;
	},

	elasticInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that elasticly snaps around the value, near
		//		the beginning and end of the Animation.
		//
		// description:
		//		An easing function that elasticly snaps around the value, near
		//		the beginning and end of the Animation.
		//
		//		Use caution when the elasticity will cause values to become
		//		negative as some properties cannot be set to negative values.
		if(n == 0) return 0;
		n = n * 2;
		if(n == 2) return 1;
		var p = .3 * 1.5;
		var s = p / 4;
		if(n < 1){
			n -= 1;
			return -.5 * (Math.pow(2, 10 * n) * Math.sin((n - s) * (2 * Math.PI) / p));
		}
		n -= 1;
		return .5 * (Math.pow(2, -10 * n) * Math.sin((n - s) * (2 * Math.PI) / p)) + 1;
	},

	bounceIn: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' near the beginning of an Animation
		return (1 - easingFuncs.bounceOut(1 - n)); // Decimal
	},

	bounceOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' near the end of an Animation
		var s = 7.5625;
		var p = 2.75;
		var l;
		if(n < (1 / p)){
			l = s * Math.pow(n, 2);
		}else if(n < (2 / p)){
			n -= (1.5 / p);
			l = s * Math.pow(n, 2) + .75;
		}else if(n < (2.5 / p)){
			n -= (2.25 / p);
			l = s * Math.pow(n, 2) + .9375;
		}else{
			n -= (2.625 / p);
			l = s * Math.pow(n, 2) + .984375;
		}
		return l;
	},

	bounceInOut: function(/* Decimal? */n){
		// summary:
		//		An easing function that 'bounces' at the beginning and end of the Animation
		if(n < 0.5){ return easingFuncs.bounceIn(n * 2) / 2; }
		return (easingFuncs.bounceOut(n * 2 - 1) / 2) + 0.5; // Decimal
	}
};

lang.setObject("dojo.fx.easing", easingFuncs);

return easingFuncs;
});

},
'dojox/charting/plot2d/StackedAreas':function(){
define("dojox/charting/plot2d/StackedAreas", ["dojo/_base/declare", "./Stacked"], function(declare, Stacked){
/*=====
var Stacked = dojox.charting.plot2d.Stacked;
=====*/
	return declare("dojox.charting.plot2d.StackedAreas", Stacked, {
		//	summary:
		//		A convenience object to set up a stacked area plot.
		constructor: function(){
			//	summary:
			//		Force our Stacked plotter to include both lines and areas.
			this.opt.lines = true;
			this.opt.areas = true;
		}
	});
});


},
'dojox/charting/action2d/Highlight':function(){
define("dojox/charting/action2d/Highlight", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/Color", "dojo/_base/connect", "dojox/color/_base", 
		"./PlotAction", "dojo/fx/easing", "dojox/gfx/fx"], 
	function(dojo, lang, declare, Color, hub, c, PlotAction, dfe, dgf){

	/*=====
	dojo.declare("dojox.charting.action2d.__HighlightCtorArgs", dojox.charting.action2d.__PlotActionCtorArgs, {
		//	summary:
		//		Additional arguments for highlighting actions.
	
		//	highlight: String|dojo.Color|Function?
		//		Either a color or a function that creates a color when highlighting happens.
		highlight: null
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/
	
	var DEFAULT_SATURATION  = 100,	// %
		DEFAULT_LUMINOSITY1 = 75,	// %
		DEFAULT_LUMINOSITY2 = 50,	// %
		cc = function(color){
			return function(){ return color; };
		},

		hl = function(color){
			var a = new c.Color(color),
				x = a.toHsl();
			if(x.s == 0){
				x.l = x.l < 50 ? 100 : 0;
			}else{
				x.s = DEFAULT_SATURATION;
				if(x.l < DEFAULT_LUMINOSITY2){
					x.l = DEFAULT_LUMINOSITY1;
				}else if(x.l > DEFAULT_LUMINOSITY1){
					x.l = DEFAULT_LUMINOSITY2;
				}else{
					x.l = x.l - DEFAULT_LUMINOSITY2 > DEFAULT_LUMINOSITY1 - x.l ?
						DEFAULT_LUMINOSITY2 : DEFAULT_LUMINOSITY1;
				}
			}
			return c.fromHsl(x);
		};

	return declare("dojox.charting.action2d.Highlight", PlotAction, {
		//	summary:
		//		Creates a highlighting action on a plot, where an element on that plot
		//		has a highlight on it.

		// the data description block for the widget parser
		defaultParams: {
			duration: 400,	// duration of the action in ms
			easing:   dfe.backOut	// easing for the action
		},
		optionalParams: {
			highlight: "red"	// name for the highlight color
								// programmatic instantiation can use functions and color objects
		},

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the highlighting action and connect it to the plot.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot this action is attached to.  If not passed, "default" is assumed.
			//	kwArgs: charting.action2d.__HighlightCtorArgs?
			//		Optional keyword arguments object for setting parameters.
			var a = kwArgs && kwArgs.highlight;
			this.colorFun = a ? (lang.isFunction(a) ? a : cc(a)) : hl;

			this.connect();
		},

		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the highlighting action.
			if(!o.shape || !(o.type in this.overOutEvents)){ return; }

			var runName = o.run.name, index = o.index, anim, startFill, endFill;

			if(runName in this.anim){
				anim = this.anim[runName][index];
			}else{
				this.anim[runName] = {};
			}

			if(anim){
				anim.action.stop(true);
			}else{
				var color = o.shape.getFill();
				if(!color || !(color instanceof Color)){
					return;
				}
				this.anim[runName][index] = anim = {
					start: color,
					end:   this.colorFun(color)
				};
			}

			var start = anim.start, end = anim.end;
			if(o.type == "onmouseout"){
				// swap colors
				var t = start;
				start = end;
				end = t;
			}

			anim.action = dgf.animateFill({
				shape:    o.shape,
				duration: this.duration,
				easing:   this.easing,
				color:    {start: start, end: end}
			});
			if(o.type == "onmouseout"){
				hub.connect(anim.action, "onEnd", this, function(){
					if(this.anim[runName]){
						delete this.anim[runName][index];
					}
				});
			}
			anim.action.play();
		}
	});
	
});

},
'dojox/charting/plot3d/Cylinders':function(){
define("dojox/charting/plot3d/Cylinders", ["dojox/gfx3d", "dojox/gfx3d/matrix", "dojo/_base/declare", "dojo/_base/Color", "dojo/_base/window", "./Base"], 
	function(gfx3d, matrix3d, declare, Color, win, Base) {

	// reduce function borrowed from dojox.fun
	var reduce = function(/*Array*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
		// summary: repeatedly applies a binary function to an array from left
		//	to right; returns the final value.
		a = typeof a == "string" ? a.split("") : a; o = o || win.global;
		var z = a[0];
		for(var i = 1; i < a.length; z = f.call(o, z, a[i++]));
		return z;	// Object
	};
	/*=====
	var Base = dojox.charting.plot3d.Base;
	=====*/
	return declare("dojox.charting.plot3d.Cylinders", Base, {
		constructor: function(width, height, kwArgs){
			this.depth = "auto";
			this.gap   = 0;
			this.data  = [];
			this.material = {type: "plastic", finish: "shiny", color: "lime"};
			this.outline  = null;
			if(kwArgs){
				if("depth" in kwArgs){ this.depth = kwArgs.depth; }
				if("gap"   in kwArgs){ this.gap   = kwArgs.gap; }
				if("material" in kwArgs){
					var m = kwArgs.material;
					if(typeof m == "string" || m instanceof Color){
						this.material.color = m;
					}else{
						this.material = m;
					}
				}
				if("outline" in kwArgs){ this.outline = kwArgs.outline; }
			}
		},
		getDepth: function(){
			if(this.depth == "auto"){
				var w = this.width;
				if(this.data && this.data.length){
					w = w / this.data.length;
				}
				return w - 2 * this.gap;
			}
			return this.depth;
		},
		generate: function(chart, creator){
			if(!this.data){ return this; }
			var step = this.width / this.data.length, org = 0,
				scale = this.height / reduce(this.data, Math.max);
			if(!creator){ creator = chart.view; }
			for(var i = 0; i < this.data.length; ++i, org += step){
				creator
					.createCylinder({
						center: {x: org + step / 2, y: 0, z: 0},
						radius: step / 2 - this.gap,
						height: this.data[i] * scale
					})
					.setTransform(matrix3d.rotateXg(-90))
					.setFill(this.material).setStroke(this.outline);
			}
		}
	});
});


},
'dojox/charting/themes/PlotKit/base':function(){
define("dojox/charting/themes/PlotKit/base", ["dojo/_base/kernel","dojo/_base/lang","../../Theme", "../common"], 
	function(dojo, lang, Theme, themes){

	// the baseline theme for all PlotKIt themes
	var pk = lang.getObject("PlotKit", true, themes);

	pk.base = new Theme({
		chart:{
			stroke: null,
			fill:   "yellow"
		},
		plotarea:{
			stroke: null,
			fill:   "yellow"
		},
		axis:{
			stroke:    {color:"#fff", width:1},
			line:      {color:"#fff", width:.5},
			majorTick: {color: "#fff", width: .5, length: 6},
			minorTick: {color: "#fff", width: .5, length: 3},
			tick:      {font: "normal normal normal 7pt Helvetica,Arial,sans-serif", fontColor: "#999"}
		},
		series:{
			stroke:    {width: 2.5, color:"#fff"},
			fill:      "#666",
			font:      "normal normal normal 7.5pt Helvetica,Arial,sans-serif",	//	label
			fontColor: "#666"
		},
		marker:{	//	any markers on a series.
			stroke:    {width: 2},
			fill:      "#333",
			font:      "normal normal normal 7pt Helvetica,Arial,sans-serif",	//	label
			fontColor: "#666"
		},
		colors: ["red", "green", "blue"]
	});

	pk.base.next = function(elementType, mixin, doPost){
		var theme = Theme.prototype.next.apply(this, arguments);
		if(elementType == "line"){
			theme.marker.outline = {width: 2, color: "#fff"};
			theme.series.stroke.width = 3.5;
			theme.marker.stroke.width = 2;
		} else if (elementType == "candlestick"){
			theme.series.stroke.width = 1;
		} else {
			theme.series.stroke.color = "#fff";
		}
		return theme;
	};
	
	return pk;
});

},
'dojox/gesture/Base':function(){
define("dojox/gesture/Base", [
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/dom",
	"dojo/on",
	"dojo/touch",
	"dojo/has",
	"../main"
], function(kernel, declare, array, lang, dom, on, touch, has, dojox){
	// module:
	//		dojox/gesture/Base
	// summary:
	//		This module provides an abstract parental class for various gesture implementations.
	
/*=====
	dojox.gesture.Base = {
		// summary:
		//		An abstract parental class for various gesture implementations.
		//
		//		It's mainly responsible for:
		//
		//		1. Binding on() listening handlers for supported gesture events.
		//
		//		2. Monitoring underneath events and process different phases - 'press'|'move'|'release'|'cancel'.
		//
		//		3. Firing and bubbling gesture events with on() API.
		//
		//		A gesture implementation only needs to extend this class and overwrite appropriate phase handlers:
		//
		//		- press()|move()|release()|cancel for recognizing and firing gestures
		//
		// example:
		//		1. A typical gesture implementation.
		//
		//		Suppose we have dojox/gesture/a which provides 3 gesture events:"a", "a.x", "a.y" to be used as:
		//		|	dojo.connect(node, dojox.gesture.a, function(e){});
		//		|	dojo.connect(node, dojox.gesture.a.x, function(e){});
		//		|	dojo.connect(node, dojox.gesture.a.y, function(e){});
		//
		//		The definition of the gesture "a" may look like:
		//		|	define([..., "./Base"], function(..., Base){
		//		|		var clz = declare(Base, {
		//		|			defaultEvent: "a",
		//		|
		//		|			subEvents: ["x", "y"],
		//		|			
		//		|			press: function(data, e){
		//		|				this.fire(node, {type: "a.x", ...});
		//		|			},
		//		|			move: function(data, e){
		//		|				this.fire(node, {type: "a.y", ...});
		//		|			},
		//		|			release: function(data, e){
		//		|				this.fire(node, {type: "a", ...});
		//		|			},
		//		|			cancel: function(data, e){
		//		|				// clean up
		//		|			}
		//		|		});
		//		|
		//		|		// in order to have a default instance for handy use
		//		|		dojox.gesture.a = new clz();
		//		|
		//		|		// so that we can create new instances like
		//		|		// var mine = new dojox.gesture.a.A({...})
		//		|		dojox.gesture.a.A = clz;
		//		|
		//		|		return dojox.gesture.a;
		//		|	});
		//
		//		2. A gesture can be used in the following ways(taking dojox.gestre.tap for example):
		//
		//		A. Used with dojo.connect()
		//		|	dojo.connect(node, dojox.gesture.tap, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.hold, function(e){});
		//		|	dojo.connect(node, dojox.gesture.tap.doubletap, function(e){});		
		//
		//		B. Used with dojo.on
		//		|	define(["dojo/on", "dojox/gesture/tap"], function(on, tap){
		//		|		on(node, tap, function(e){});
		//		|		on(node, tap.hold, function(e){});
		//		|		on(node, tap.doubletap, function(e){});
		//
		//		C. Used with dojox.gesture.tap directly
		//		|	dojox.gesture.tap(node, function(e){});
		//		|	dojox.gesture.tap.hold(node, function(e){});
		//		|	dojox.gesture.tap.doubletap(node, function(e){});
		//
		//		Though there is always a default gesture instance after being required, e.g 
		//		|	require(["dojox/gesture/tap"], function(){...});
		//
		//		It's possible to create a new one with different parameter setting:
		//		|	var myTap = new dojox.gesture.tap.Tap({holdThreshold: 300});
		//		|	dojo.connect(node, myTap, function(e){});
		//		|	dojo.connect(node, myTap.hold, function(e){});
		//		|	dojo.connect(node, myTap.doubletap, function(e){});
		//		
		//		Please refer to dojox/gesture/ for more gesture usages
	};
=====*/
	kernel.experimental("dojox.gesture.Base");
	
	lang.getObject("gesture", true, dojox);

	// Declare an internal anonymous class which will only be exported by module return value
	return declare(/*===== "dojox.gesture.Base", =====*/null, {

		// defaultEvent: [readonly] String
		//		Default event e.g. 'tap' is a default event of dojox.gesture.tap
		defaultEvent: " ",

		// subEvents: [readonly] Array
		//		A list of sub events e.g ['hold', 'doubletap'],
		//		used by being combined with defaultEvent like 'tap.hold', 'tap.doubletap' etc.
		subEvents: [],

		// touchOnly: boolean
		//		Whether the gesture is touch-device only
		touchOnly : false,

		//	_elements: Array
		//		List of elements that wraps target node and gesture data
		_elements: null,

		/*=====
		// _lock: Dom
		//		The dom node whose descendants are all locked for processing
		_lock: null,
		
		// _events: [readonly] Array
		//		The complete list of supported gesture events with full name space
		//		e.g ['tap', 'tap.hold', 'tap.doubletap']
		_events: null,
		=====*/

		constructor: function(args){
			lang.mixin(this, args);
			this.init();
		},
		init: function(){
			// summary:
			//		Initialization works
			this._elements = [];

			if(!has("touch") && this.touchOnly){
				console.warn("Gestures:[", this.defaultEvent, "] is only supported on touch devices!");
				return;
			}

			// bind on() handlers for various events
			var evt = this.defaultEvent;
			this.call = this._handle(evt);

			this._events = [evt];
			array.forEach(this.subEvents, function(subEvt){
				this[subEvt] = this._handle(evt + '.' + subEvt);
				this._events.push(evt + '.' + subEvt);
			}, this);
		},
		_handle: function(/*String*/eventType){
			// summary:
			//		Bind listen handler for the given gesture event(e.g. 'tap', 'tap.hold' etc.)
			//		the returned handle will be used internally by dojo/on
			var self = this;
			//called by dojo/on
			return function(node, listener){
				// normalize, arguments might be (null, node, listener)
				var a = arguments;
				if(a.length > 2){
					node = a[1];
					listener = a[2];
				}
				var isNode = node && (node.nodeType || node.attachEvent || node.addEventListener);
				if(!isNode){
					return on(node, eventType, listener);
				}else{
					var onHandle = self._add(node, eventType, listener);
					// FIXME - users are supposed to explicitly call either
					// disconnect(signal) or signal.remove() to release resources
					var signal = {
						remove: function(){
							onHandle.remove();
							self._remove(node, eventType);
						}
					};
					return signal;
				}
			}; // dojo/on handle
		},
		_add: function(/*Dom*/node, /*String*/type, /*function*/listener){
			// summary:
			//		Bind dojo/on handlers for both gesture event(e.g 'tab.hold')
			//		and underneath 'press'|'move'|'release' events
			var element = this._getGestureElement(node);
			if(!element){
				// the first time listening to the node
				element = {
					target: node,
					data: {},
					handles: {}
				};

				var _press = lang.hitch(this, "_process", element, "press");
				var _move = lang.hitch(this, "_process", element, "move");
				var _release = lang.hitch(this, "_process", element, "release");
				var _cancel = lang.hitch(this, "_process", element, "cancel");

				var handles = element.handles;
				if(this.touchOnly){
					handles.press = on(node, 'touchstart', _press);
					handles.move = on(node, 'touchmove', _move);
					handles.release = on(node, 'touchend', _release);
					handles.cancel = on(node, 'touchcancel', _cancel);
				}else{
					handles.press = touch.press(node, _press);
					handles.move = touch.move(node, _move);
					handles.release = touch.release(node, _release);
					handles.cancel = touch.cancel(node, _cancel);
				}
				this._elements.push(element);
			}
			// track num of listeners for the gesture event - type
			// so that we can release element if no more gestures being monitored
			element.handles[type] = !element.handles[type] ? 1 : ++element.handles[type];

			return on(node, type, listener); //handle
		},
		_getGestureElement: function(/*Dom*/node){
			// summary:
			//		Obtain a gesture element for the give node
			var i = 0, element;
			for(; i < this._elements.length; i++){
				element = this._elements[i];
				if(element.target === node){
					return element;
				}
			}
		},
		_process: function(element, phase, e){
			// summary:
			//		Process and dispatch to appropriate phase handlers.
			//		Also provides the machinery for managing gesture bubbling.
			// description:
			//		1. e._locking is used to make sure only the most inner node
			//		will be processed for the same gesture, suppose we have:
			//	|	on(inner, dojox.gesture.tap, func1);
			//	|	on(outer, dojox.gesture.tap, func2);
			//		only the inner node will be processed by tap gesture, once matched,
			//		the 'tap' event will be bubbled up from inner to outer, dojo.StopEvent(e)
			//		can be used at any level to stop the 'tap' event.
			//
			//		2. Once a node starts being processed, all it's descendant nodes will be locked.
			//		The same gesture won't be processed on its descendant nodes until the lock is released.
			// element: Object
			//		Gesture element
			// phase: String
			//		Phase of a gesture to be processed, might be 'press'|'move'|'release'|'cancel'
			// e: Event
			//		Native event
			e._locking = e._locking || {};
			if(e._locking[this.defaultEvent] || this.isLocked(e.currentTarget)){
				return;
			}
			// invoking gesture.press()|move()|release()|cancel()
			e.preventDefault();
			e._locking[this.defaultEvent] = true;
			this[phase](element.data, e);
		},
		press: function(data, e){
			// summary:
			//		Process the 'press' phase of a gesture
		},
		move: function(data, e){
			// summary:
			//		Process the 'move' phase of a gesture
		},
		release: function(data, e){
			// summary:
			//		Process the 'release' phase of a gesture
		},
		cancel: function(data, e){
			// summary:
			//		Process the 'cancel' phase of a gesture
		},
		fire: function(node, event){
			// summary:
			//		Fire a gesture event and invoke registered listeners
			//		a simulated GestureEvent will also be sent along
			// node: DomNode
			//		Target node to fire the gesture
			// event: Object
			//		An object containing specific gesture info e.g {type: 'tap.hold'|'swipe.left'), ...}
			//		all these properties will be put into a simulated GestureEvent when fired.
			//		Note - Default properties in a native Event won't be overwritten, see on.emit() for more details.
			if(!node || !event){
				return;
			}
			event.bubbles = true;
			event.cancelable = true;
			on.emit(node, event.type, event);
		},
		_remove: function(/*Dom*/node, /*String*/type){
			// summary:
			//		Check and remove underneath handlers if node
			//		is not being listened for 'this' gesture anymore,
			//		this happens when user removed all previous on() handlers.
			var element = this._getGestureElement(node);
			if(!element || !element.handles){ return; }
			
			element.handles[type]--;

			var handles = element.handles;
			if(!array.some(this._events, function(evt){
				return handles[evt] > 0;
			})){
				// clean up if node is not being listened anymore
				this._cleanHandles(handles);
				var i = array.indexOf(this._elements, element);
				if(i >= 0){
					this._elements.splice(i, 1);
				}
			}
		},
		_cleanHandles: function(/*Object*/handles){
			// summary:
			//		Clean up on handles
			for(var x in handles){
				//remove handles for "press"|"move"|"release"|"cancel"
				if(handles[x].remove){
					handles[x].remove();
				}
				delete handles[x];
			}
		},
		lock: function(/*Dom*/node){
			// summary:
			//		Lock all descendants of the node.
			// tags:
			//		protected
			this._lock = node;
		},
		unLock: function(){
			// summary:
			//		Release the lock
			// tags:
			//		protected
			this._lock = null;
		},
		isLocked: function(node){
			// summary:
			//		Check if the node is locked, isLocked(node) means
			//		whether it's a descendant of the currently locked node.
			// tags:
			//		protected
			if(!this._lock || !node){
				return false;
			}
			return this._lock !== node && dom.isDescendant(node, this._lock);
		},
		destroy: function(){
			// summary:
			//		Release all handlers and resources
			array.forEach(this._elements, function(element){
				this._cleanHandles(element.handles);
			}, this);
			this._elements = null;
		}
	});
});
},
'dojox/charting/themes/Harmony':function(){
define("dojox/charting/themes/Harmony", ["../Theme", "./common"], function(Theme, themes){
	
	themes.Harmony=new Theme({
		colors: [
			"#497c91",
			"#59a0bd",
			"#9dc7d9",
			"#c7e0e9",
			"#7b78a4",
			"#8d88c7",
			"#ada9d6",
			"#c9c6e4",
			"#768b4e",
			"#677e13",
			"#a8c179",
			"#c0d0a0",
			"#b7b35c",
			"#e8e667",
			"#eeea99",
			"#f0eebb",
			"#b39c53",
			"#e9c756",
			"#ebcf81",
			"#efdeb0",
			"#956649",
			"#b17044",
			"#c28b69",
			"#cfb09b",
			"#815454",
			"#a05a5a",
			"#c99999",
			"#ddc0c0",
			"#868686",
			"#a5a5a5",
			"#bebebe",
			"#d8d8d8"
		]
	});
	
	return themes.Harmony;
});

},
'dojox/charting/action2d/ChartAction':function(){
define("dojox/charting/action2d/ChartAction", ["dojo/_base/connect", "dojo/_base/declare", "./Base"], 
	function(hub, declare, Base){
	/*=====
	var Base = dojox.charting.action2d.Base;
	=====*/
	return declare("dojox.charting.action2d.ChartAction", Base, {
		//	summary:
		//		Base action class for chart actions.
	
		constructor: function(chart, plot){
			//	summary:
			//		Create a new base chart action.
			//	chart: dojox.charting.Chart
			//		The chart this action applies to.
			//	plot: String?|dojox.charting.plot2d.Base?
			//		Optional target plot for this chart action.  Default is "default".
		},
	
		connect: function(){
			//	summary:
			//		Connect this action to the chart.
			for(var i = 0; i < this._listeners.length; ++i){
				this._listeners[i].handle = hub.connect(this.chart.node, this._listeners[i].eventName,
						this, this._listeners[i].methodName);
			}
		},
	
		disconnect: function(){
			//	summary:
			//		Disconnect this action from the chart.
			for(var i = 0; i < this._listeners.length; ++i){
				hub.disconnect(this._listeners[i].handle);
				delete this._listeners[i].handle;
			}
		}
});

});

},
'dojox/charting/plot2d/_PlotEvents':function(){
define("dojox/charting/plot2d/_PlotEvents", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "dojo/_base/connect"], 
	function(lang, arr, declare, hub){

	return declare("dojox.charting.plot2d._PlotEvents", null, {
		constructor: function(){
			this._shapeEvents = [];
			this._eventSeries = {};
		},
		destroy: function(){
			//	summary:
			//		Destroy any internal elements and event handlers.
			this.resetEvents();
			this.inherited(arguments);
		},
		plotEvent: function(o){
			//	summary:
			//		Stub function for use by specific plots.
			//	o: Object
			//		An object intended to represent event parameters.
		},
		raiseEvent: function(o){
			//	summary:
			//		Raises events in predefined order
			//	o: Object
			//		An object intended to represent event parameters.
			this.plotEvent(o);
			var t = lang.delegate(o);
			t.originalEvent = o.type;
			t.originalPlot  = o.plot;
			t.type = "onindirect";
			arr.forEach(this.chart.stack, function(plot){
				if(plot !== this && plot.plotEvent){
					t.plot = plot;
					plot.plotEvent(t);
				}
			}, this);
		},
		connect: function(object, method){
			//	summary:
			//		Helper function to connect any object's method to our plotEvent.
			//	object: Object
			//		The object to connect to.
			//	method: String|Function
			//		The method to fire when our plotEvent is fired.
			//	returns: Array
			//		The handle as returned from dojo.connect (see dojo.connect).
			this.dirty = true;
			return hub.connect(this, "plotEvent", object, method);	//	Array
		},
		events: function(){
			//	summary:
			//		Find out if any event handlers have been connected to our plotEvent.
			//	returns: Boolean
			//		A flag indicating that there are handlers attached.
			return !!this.plotEvent.after;
		},
		resetEvents: function(){
			//	summary:
			//		Reset all events attached to our plotEvent (i.e. disconnect).
			if(this._shapeEvents.length){
				arr.forEach(this._shapeEvents, function(item){
					item.shape.disconnect(item.handle);
				});
				this._shapeEvents = [];
			}
			this.raiseEvent({type: "onplotreset", plot: this});
		},
		_connectSingleEvent: function(o, eventName){
			this._shapeEvents.push({
				shape:  o.eventMask,
				handle: o.eventMask.connect(eventName, this, function(e){
					o.type  = eventName;
					o.event = e;
					this.raiseEvent(o);
					o.event = null;
				})
			});
		},
		_connectEvents: function(o){
			if(o){
				o.chart = this.chart;
				o.plot  = this;
				o.hAxis = this.hAxis || null;
				o.vAxis = this.vAxis || null;
				o.eventMask = o.eventMask || o.shape;
				this._connectSingleEvent(o, "onmouseover");
				this._connectSingleEvent(o, "onmouseout");
				this._connectSingleEvent(o, "onclick");
			}
		},
		_reconnectEvents: function(seriesName){
			var a = this._eventSeries[seriesName];
			if(a){
				arr.forEach(a, this._connectEvents, this);
			}
		},
		fireEvent: function(seriesName, eventName, index, eventObject){
			//	summary:
			//		Emulates firing an event for a given data value (specified by
			//		an index) of a given series.
			//	seriesName: String:
			//		Series name.
			//	eventName: String:
			//		Event name to emulate.
			//	index:	Number:
			//		Valid data value index used to raise an event.
			//	eventObject: Object?:
			//		Optional event object. Especially useful for synthetic events.
			//		Default: null.
			var s = this._eventSeries[seriesName];
			if(s && s.length && index < s.length){
				var o = s[index];
				o.type  = eventName;
				o.event = eventObject || null;
				this.raiseEvent(o);
				o.event = null;
			}
		}
	});
});

},
'dijit/form/_CheckBoxMixin':function(){
define("dijit/form/_CheckBoxMixin", [
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/_base/event" // event.stop
], function(declare, domAttr, event){

	// module:
	//		dijit/form/_CheckBoxMixin
	// summary:
	// 		Mixin to provide widget functionality corresponding to an HTML checkbox

	return declare("dijit.form._CheckBoxMixin", null, {
		// summary:
		// 		Mixin to provide widget functionality corresponding to an HTML checkbox
		//
		// description:
		//		User interacts with real html inputs.
		//		On onclick (which occurs by mouse click, space-bar, or
		//		using the arrow keys to switch the selected radio button),
		//		we update the state of the checkbox/radio.
		//

		// type: [private] String
		//		type attribute on <input> node.
		//		Overrides `dijit.form.Button.type`.  Users should not change this value.
		type: "checkbox",

		// value: String
		//		As an initialization parameter, equivalent to value field on normal checkbox
		//		(if checked, the value is passed as the value when form is submitted).
		value: "on",

		// readOnly: Boolean
		//		Should this widget respond to user input?
		//		In markup, this is specified as "readOnly".
		//		Similar to disabled except readOnly form values are submitted.
		readOnly: false,
		
		// aria-pressed for toggle buttons, and aria-checked for checkboxes
		_aria_attr: "aria-checked",

		_setReadOnlyAttr: function(/*Boolean*/ value){
			this._set("readOnly", value);
			domAttr.set(this.focusNode, 'readOnly', value);
		},

		// Override dijit.form.Button._setLabelAttr() since we don't even have a containerNode.
		// Normally users won't try to set label, except when CheckBox or RadioButton is the child of a dojox.layout.TabContainer
		_setLabelAttr: undefined,

		postMixInProperties: function(){
			if(this.value == ""){
				this.value = "on";
			}
			this.inherited(arguments);
		},

		reset: function(){
			this.inherited(arguments);
			// Handle unlikely event that the <input type=checkbox> value attribute has changed
			this._set("value", this.params.value || "on");
			domAttr.set(this.focusNode, 'value', this.value);
		},

		_onClick: function(/*Event*/ e){
			// summary:
			//		Internal function to handle click actions - need to check
			//		readOnly, since button no longer does that check.
			if(this.readOnly){
				event.stop(e);
				return false;
			}
			return this.inherited(arguments);
		}
	});
});

},
'dijit/form/CheckBox':function(){
require({cache:{
'url:dijit/form/templates/CheckBox.html':"<div class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><input\n\t \t${!nameAttrSetting} type=\"${type}\" ${checkedAttrSetting}\n\t\tclass=\"dijitReset dijitCheckBoxInput\"\n\t\tdata-dojo-attach-point=\"focusNode\"\n\t \tdata-dojo-attach-event=\"onclick:_onClick\"\n/></div>\n"}});
define("dijit/form/CheckBox", [
	"require",
	"dojo/_base/declare", // declare
	"dojo/dom-attr", // domAttr.set
	"dojo/_base/kernel",
	"dojo/query", // query
	"dojo/ready",
	"./ToggleButton",
	"./_CheckBoxMixin",
	"dojo/text!./templates/CheckBox.html",
	"dojo/NodeList-dom" // NodeList.addClass/removeClass
], function(require, declare, domAttr, kernel, query, ready, ToggleButton, _CheckBoxMixin, template){

/*=====
	var ToggleButton = dijit.form.ToggleButton;
	var _CheckBoxMixin = dijit.form._CheckBoxMixin;
=====*/

	// module:
	//		dijit/form/CheckBox
	// summary:
	//		Checkbox widget

	// Back compat w/1.6, remove for 2.0
	if(!kernel.isAsync){
		ready(0, function(){
			var requires = ["dijit/form/RadioButton"];
			require(requires);	// use indirection so modules not rolled into a build
		});
	}

	return declare("dijit.form.CheckBox", [ToggleButton, _CheckBoxMixin], {
		// summary:
		// 		Same as an HTML checkbox, but with fancy styling.
		//
		// description:
		//		User interacts with real html inputs.
		//		On onclick (which occurs by mouse click, space-bar, or
		//		using the arrow keys to switch the selected radio button),
		//		we update the state of the checkbox/radio.
		//
		//		There are two modes:
		//			1. High contrast mode
		//			2. Normal mode
		//
		//		In case 1, the regular html inputs are shown and used by the user.
		//		In case 2, the regular html inputs are invisible but still used by
		//		the user. They are turned quasi-invisible and overlay the background-image.

		templateString: template,

		baseClass: "dijitCheckBox",

		_setValueAttr: function(/*String|Boolean*/ newValue, /*Boolean*/ priorityChange){
			// summary:
			//		Handler for value= attribute to constructor, and also calls to
			//		set('value', val).
			// description:
			//		During initialization, just saves as attribute to the <input type=checkbox>.
			//
			//		After initialization,
			//		when passed a boolean, controls whether or not the CheckBox is checked.
			//		If passed a string, changes the value attribute of the CheckBox (the one
			//		specified as "value" when the CheckBox was constructed (ex: <input
			//		data-dojo-type="dijit.CheckBox" value="chicken">)
			//		widget.set('value', string) will check the checkbox and change the value to the
			//		specified string
			//		widget.set('value', boolean) will change the checked state.
			if(typeof newValue == "string"){
				this._set("value", newValue);
				domAttr.set(this.focusNode, 'value', newValue);
				newValue = true;
			}
			if(this._created){
				this.set('checked', newValue, priorityChange);
			}
		},
		_getValueAttr: function(){
			// summary:
			//		Hook so get('value') works.
			// description:
			//		If the CheckBox is checked, returns the value attribute.
			//		Otherwise returns false.
			return (this.checked ? this.value : false);
		},

		// Override behavior from Button, since we don't have an iconNode
		_setIconClassAttr: null,

		postMixInProperties: function(){
			this.inherited(arguments);

			// Need to set initial checked state as part of template, so that form submit works.
			// domAttr.set(node, "checked", bool) doesn't work on IE until node has been attached
			// to <body>, see #8666
			this.checkedAttrSetting = this.checked ? "checked" : "";
		},

		 _fillContent: function(){
			// Override Button::_fillContent() since it doesn't make sense for CheckBox,
			// since CheckBox doesn't even have a container
		},

		_onFocus: function(){
			if(this.id){
				query("label[for='"+this.id+"']").addClass("dijitFocusedLabel");
			}
			this.inherited(arguments);
		},

		_onBlur: function(){
			if(this.id){
				query("label[for='"+this.id+"']").removeClass("dijitFocusedLabel");
			}
			this.inherited(arguments);
		}
	});
});

},
'dojox/gfx/matrix':function(){
define("dojox/gfx/matrix", ["./_base","dojo/_base/lang"], 
  function(g, lang){
	var m = g.matrix = {};
	/*===== g = dojox.gfx; m = dojox.gfx.matrix =====*/

	// candidates for dojox.math:
	var _degToRadCache = {};
	m._degToRad = function(degree){
		return _degToRadCache[degree] || (_degToRadCache[degree] = (Math.PI * degree / 180));
	};
	m._radToDeg = function(radian){ return radian / Math.PI * 180; };

	m.Matrix2D = function(arg){
		// summary: 
		//		a 2D matrix object
		// description: Normalizes a 2D matrix-like object. If arrays is passed,
		//		all objects of the array are normalized and multiplied sequentially.
		// arg: Object
		//		a 2D matrix-like object, a number, or an array of such objects
		if(arg){
			if(typeof arg == "number"){
				this.xx = this.yy = arg;
			}else if(arg instanceof Array){
				if(arg.length > 0){
					var matrix = m.normalize(arg[0]);
					// combine matrices
					for(var i = 1; i < arg.length; ++i){
						var l = matrix, r = m.normalize(arg[i]);
						matrix = new m.Matrix2D();
						matrix.xx = l.xx * r.xx + l.xy * r.yx;
						matrix.xy = l.xx * r.xy + l.xy * r.yy;
						matrix.yx = l.yx * r.xx + l.yy * r.yx;
						matrix.yy = l.yx * r.xy + l.yy * r.yy;
						matrix.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
						matrix.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
					}
					lang.mixin(this, matrix);
				}
			}else{
				lang.mixin(this, arg);
			}
		}
	};

	// the default (identity) matrix, which is used to fill in missing values
	lang.extend(m.Matrix2D, {xx: 1, xy: 0, yx: 0, yy: 1, dx: 0, dy: 0});

	lang.mixin(m, {
		// summary: class constants, and methods of dojox.gfx.matrix

		// matrix constants

		// identity: dojox.gfx.matrix.Matrix2D
		//		an identity matrix constant: identity * (x, y) == (x, y)
		identity: new m.Matrix2D(),

		// flipX: dojox.gfx.matrix.Matrix2D
		//		a matrix, which reflects points at x = 0 line: flipX * (x, y) == (-x, y)
		flipX:    new m.Matrix2D({xx: -1}),

		// flipY: dojox.gfx.matrix.Matrix2D
		//		a matrix, which reflects points at y = 0 line: flipY * (x, y) == (x, -y)
		flipY:    new m.Matrix2D({yy: -1}),

		// flipXY: dojox.gfx.matrix.Matrix2D
		//		a matrix, which reflects points at the origin of coordinates: flipXY * (x, y) == (-x, -y)
		flipXY:   new m.Matrix2D({xx: -1, yy: -1}),

		// matrix creators

		translate: function(a, b){
			// summary: forms a translation matrix
			// description: The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value
			if(arguments.length > 1){
				return new m.Matrix2D({dx: a, dy: b}); // dojox.gfx.matrix.Matrix2D
			}
			// branch
			// a: dojox.gfx.Point: a point-like object, which specifies offsets for both dimensions
			// b: null
			return new m.Matrix2D({dx: a.x, dy: a.y}); // dojox.gfx.matrix.Matrix2D
		},
		scale: function(a, b){
			// summary: forms a scaling matrix
			// description: The resulting matrix is used to scale (magnify) points by specified offsets.
			// a: Number: a scaling factor used for the x coordinate
			// b: Number: a scaling factor used for the y coordinate
			if(arguments.length > 1){
				return new m.Matrix2D({xx: a, yy: b}); // dojox.gfx.matrix.Matrix2D
			}
			if(typeof a == "number"){
				// branch
				// a: Number: a uniform scaling factor used for the both coordinates
				// b: null
				return new m.Matrix2D({xx: a, yy: a}); // dojox.gfx.matrix.Matrix2D
			}
			// branch
			// a: dojox.gfx.Point: a point-like object, which specifies scale factors for both dimensions
			// b: null
			return new m.Matrix2D({xx: a.x, yy: a.y}); // dojox.gfx.matrix.Matrix2D
		},
		rotate: function(angle){
			// summary: forms a rotating matrix
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new m.Matrix2D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx.matrix.Matrix2D
		},
		rotateg: function(degree){
			// summary: forms a rotating matrix
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx.matrix.rotate() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return m.rotate(m._degToRad(degree)); // dojox.gfx.matrix.Matrix2D
		},
		skewX: function(angle) {
			// summary: forms an x skewing matrix
			// description: The resulting matrix is used to skew points in the x dimension
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an skewing angle in radians
			return new m.Matrix2D({xy: Math.tan(angle)}); // dojox.gfx.matrix.Matrix2D
		},
		skewXg: function(degree){
			// summary: forms an x skewing matrix
			// description: The resulting matrix is used to skew points in the x dimension
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx.matrix.skewX() for comparison.
			// degree: Number: an skewing angle in degrees
			return m.skewX(m._degToRad(degree)); // dojox.gfx.matrix.Matrix2D
		},
		skewY: function(angle){
			// summary: forms a y skewing matrix
			// description: The resulting matrix is used to skew points in the y dimension
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an skewing angle in radians
			return new m.Matrix2D({yx: Math.tan(angle)}); // dojox.gfx.matrix.Matrix2D
		},
		skewYg: function(degree){
			// summary: forms a y skewing matrix
			// description: The resulting matrix is used to skew points in the y dimension
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx.matrix.skewY() for comparison.
			// degree: Number: an skewing angle in degrees
			return m.skewY(m._degToRad(degree)); // dojox.gfx.matrix.Matrix2D
		},
		reflect: function(a, b){
			// summary: forms a reflection matrix
			// description: The resulting matrix is used to reflect points around a vector,
			//		which goes through the origin.
			// a: dojox.gfx.Point: a point-like object, which specifies a vector of reflection
			// b: null
			if(arguments.length == 1){
				b = a.y;
				a = a.x;
			}
			// branch
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value

			// make a unit vector
			var a2 = a * a, b2 = b * b, n2 = a2 + b2, xy = 2 * a * b / n2;
			return new m.Matrix2D({xx: 2 * a2 / n2 - 1, xy: xy, yx: xy, yy: 2 * b2 / n2 - 1}); // dojox.gfx.matrix.Matrix2D
		},
		project: function(a, b){
			// summary: forms an orthogonal projection matrix
			// description: The resulting matrix is used to project points orthogonally on a vector,
			//		which goes through the origin.
			// a: dojox.gfx.Point: a point-like object, which specifies a vector of projection
			// b: null
			if(arguments.length == 1){
				b = a.y;
				a = a.x;
			}
			// branch
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value

			// make a unit vector
			var a2 = a * a, b2 = b * b, n2 = a2 + b2, xy = a * b / n2;
			return new m.Matrix2D({xx: a2 / n2, xy: xy, yx: xy, yy: b2 / n2}); // dojox.gfx.matrix.Matrix2D
		},

		// ensure matrix 2D conformance
		normalize: function(matrix){
			// summary: converts an object to a matrix, if necessary
			// description: Converts any 2D matrix-like object or an array of
			//		such objects to a valid dojox.gfx.matrix.Matrix2D object.
			// matrix: Object: an object, which is converted to a matrix, if necessary
			return (matrix instanceof m.Matrix2D) ? matrix : new m.Matrix2D(matrix); // dojox.gfx.matrix.Matrix2D
		},

		// common operations

		clone: function(matrix){
			// summary: creates a copy of a 2D matrix
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object to be cloned
			var obj = new m.Matrix2D();
			for(var i in matrix){
				if(typeof(matrix[i]) == "number" && typeof(obj[i]) == "number" && obj[i] != matrix[i]) obj[i] = matrix[i];
			}
			return obj; // dojox.gfx.matrix.Matrix2D
		},
		invert: function(matrix){
			// summary: inverts a 2D matrix
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object to be inverted
			var M = m.normalize(matrix),
				D = M.xx * M.yy - M.xy * M.yx;
				M = new m.Matrix2D({
					xx: M.yy/D, xy: -M.xy/D,
					yx: -M.yx/D, yy: M.xx/D,
					dx: (M.xy * M.dy - M.yy * M.dx) / D,
					dy: (M.yx * M.dx - M.xx * M.dy) / D
				});
			return M; // dojox.gfx.matrix.Matrix2D
		},
		_multiplyPoint: function(matrix, x, y){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix object to be applied
			// x: Number: an x coordinate of a point
			// y: Number: a y coordinate of a point
			return {x: matrix.xx * x + matrix.xy * y + matrix.dx, y: matrix.yx * x + matrix.yy * y + matrix.dy}; // dojox.gfx.Point
		},
		multiplyPoint: function(matrix, /* Number||Point */ a, /* Number? */ b){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix object to be applied
			// a: Number: an x coordinate of a point
			// b: Number?: a y coordinate of a point
			var M = m.normalize(matrix);
			if(typeof a == "number" && typeof b == "number"){
				return m._multiplyPoint(M, a, b); // dojox.gfx.Point
			}
			// branch
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix object to be applied
			// a: dojox.gfx.Point: a point
			// b: null
			return m._multiplyPoint(M, a.x, a.y); // dojox.gfx.Point
		},
		multiply: function(matrix){
			// summary: combines matrices by multiplying them sequentially in the given order
			// matrix: dojox.gfx.matrix.Matrix2D...: a 2D matrix-like object,
			//		all subsequent arguments are matrix-like objects too
			var M = m.normalize(matrix);
			// combine matrices
			for(var i = 1; i < arguments.length; ++i){
				var l = M, r = m.normalize(arguments[i]);
				M = new m.Matrix2D();
				M.xx = l.xx * r.xx + l.xy * r.yx;
				M.xy = l.xx * r.xy + l.xy * r.yy;
				M.yx = l.yx * r.xx + l.yy * r.yx;
				M.yy = l.yx * r.xy + l.yy * r.yy;
				M.dx = l.xx * r.dx + l.xy * r.dy + l.dx;
				M.dy = l.yx * r.dx + l.yy * r.dy + l.dy;
			}
			return M; // dojox.gfx.matrix.Matrix2D
		},

		// high level operations

		_sandwich: function(matrix, x, y){
			// summary: applies a matrix at a centrtal point
			// matrix: dojox.gfx.matrix.Matrix2D: a 2D matrix-like object, which is applied at a central point
			// x: Number: an x component of the central point
			// y: Number: a y component of the central point
			return m.multiply(m.translate(x, y), matrix, m.translate(-x, -y)); // dojox.gfx.matrix.Matrix2D
		},
		scaleAt: function(a, b, c, d){
			// summary: scales a picture using a specified point as a center of scaling
			// description: Compare with dojox.gfx.matrix.scale().
			// a: Number: a scaling factor used for the x coordinate
			// b: Number: a scaling factor used for the y coordinate
			// c: Number: an x component of a central point
			// d: Number: a y component of a central point

			// accepts several signatures:
			//	1) uniform scale factor, Point
			//	2) uniform scale factor, x, y
			//	3) x scale, y scale, Point
			//	4) x scale, y scale, x, y

			switch(arguments.length){
				case 4:
					// a and b are scale factor components, c and d are components of a point
					return m._sandwich(m.scale(a, b), c, d); // dojox.gfx.matrix.Matrix2D
				case 3:
					if(typeof c == "number"){
						// branch
						// a: Number: a uniform scaling factor used for both coordinates
						// b: Number: an x component of a central point
						// c: Number: a y component of a central point
						// d: null
						return m._sandwich(m.scale(a), b, c); // dojox.gfx.matrix.Matrix2D
					}
					// branch
					// a: Number: a scaling factor used for the x coordinate
					// b: Number: a scaling factor used for the y coordinate
					// c: dojox.gfx.Point: a central point
					// d: null
					return m._sandwich(m.scale(a, b), c.x, c.y); // dojox.gfx.matrix.Matrix2D
			}
			// branch
			// a: Number: a uniform scaling factor used for both coordinates
			// b: dojox.gfx.Point: a central point
			// c: null
			// d: null
			return m._sandwich(m.scale(a), b.x, b.y); // dojox.gfx.matrix.Matrix2D
		},
		rotateAt: function(angle, a, b){
			// summary: rotates a picture using a specified point as a center of rotation
			// description: Compare with dojox.gfx.matrix.rotate().
			// angle: Number: an angle of rotation in radians (>0 for CW)
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) rotation angle in radians, Point
			//	2) rotation angle in radians, x, y

			if(arguments.length > 2){
				return m._sandwich(m.rotate(angle), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// angle: Number: an angle of rotation in radians (>0 for CCW)
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.rotate(angle), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		rotategAt: function(degree, a, b){
			// summary: rotates a picture using a specified point as a center of rotation
			// description: Compare with dojox.gfx.matrix.rotateg().
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) rotation angle in degrees, Point
			//	2) rotation angle in degrees, x, y

			if(arguments.length > 2){
				return m._sandwich(m.rotateg(degree), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// degree: Number: an angle of rotation in degrees (>0 for CCW)
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.rotateg(degree), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewXAt: function(angle, a, b){
			// summary: skews a picture along the x axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewX().
			// angle: Number: an skewing angle in radians
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in radians, Point
			//	2) skew angle in radians, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewX(angle), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// angle: Number: an skewing angle in radians
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewX(angle), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewXgAt: function(degree, a, b){
			// summary: skews a picture along the x axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewXg().
			// degree: Number: an skewing angle in degrees
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in degrees, Point
			//	2) skew angle in degrees, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewXg(degree), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// degree: Number: an skewing angle in degrees
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewXg(degree), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewYAt: function(angle, a, b){
			// summary: skews a picture along the y axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewY().
			// angle: Number: an skewing angle in radians
			// a: Number: an x component of a central point
			// b: Number: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in radians, Point
			//	2) skew angle in radians, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewY(angle), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// angle: Number: an skewing angle in radians
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewY(angle), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		},
		skewYgAt: function(/* Number */ degree, /* Number||Point */ a, /* Number? */ b){
			// summary: skews a picture along the y axis using a specified point as a center of skewing
			// description: Compare with dojox.gfx.matrix.skewYg().
			// degree: Number: an skewing angle in degrees
			// a: Number: an x component of a central point
			// b: Number?: a y component of a central point

			// accepts several signatures:
			//	1) skew angle in degrees, Point
			//	2) skew angle in degrees, x, y

			if(arguments.length > 2){
				return m._sandwich(m.skewYg(degree), a, b); // dojox.gfx.matrix.Matrix2D
			}

			// branch
			// degree: Number: an skewing angle in degrees
			// a: dojox.gfx.Point: a central point
			// b: null
			return m._sandwich(m.skewYg(degree), a.x, a.y); // dojox.gfx.matrix.Matrix2D
		}

		//TODO: rect-to-rect mapping, scale-to-fit (isotropic and anisotropic versions)

	});
	// propagate Matrix2D up
	g.Matrix2D = m.Matrix2D;

	return m;
});



},
'dojox/charting/axis2d/Base':function(){
define("dojox/charting/axis2d/Base", ["dojo/_base/declare", "../Element"], 
	function(declare, Element){
/*=====
var Element = dojox.charting.Element;
=====*/ 
return declare("dojox.charting.axis2d.Base", Element, {
	//	summary:
	//		The base class for any axis.  This is more of an interface/API
	//		definition than anything else; see dojox.charting.axis2d.Default
	//		for more details.
	constructor: function(chart, kwArgs){
		//	summary:
		//		Return a new base axis.
		//	chart: dojox.charting.Chart
		//		The chart this axis belongs to.
		//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
		//		An optional arguments object to define the axis parameters.
		this.vertical = kwArgs && kwArgs.vertical;
	},
	clear: function(){
		//	summary:
		//		Stub function for clearing the axis.
		//	returns: dojox.charting.axis2d.Base
		//		A reference to the axis for functional chaining.
		return this;	//	dojox.charting.axis2d.Base
	},
	initialized: function(){
		//	summary:
		//		Return a flag as to whether or not this axis has been initialized.
		//	returns: Boolean
		//		If the axis is initialized or not.
		return false;	//	Boolean
	},
	calculate: function(min, max, span){
		//	summary:
		//		Stub function to run the calcuations needed for drawing this axis.
		//	returns: dojox.charting.axis2d.Base
		//		A reference to the axis for functional chaining.
		return this;	//	dojox.charting.axis2d.Base
	},
	getScaler: function(){
		//	summary:
		//		A stub function to return the scaler object created during calculate.
		//	returns: Object
		//		The scaler object (see dojox.charting.scaler.linear for more information)
		return null;	//	Object
	},
	getTicks: function(){
		//	summary:
		//		A stub function to return the object that helps define how ticks are rendered.
		//	returns: Object
		//		The ticks object.
		return null;	//	Object
	},
	getOffsets: function(){
		//	summary:
		//		A stub function to return any offsets needed for axis and series rendering.
		//	returns: Object
		//		An object of the form { l, r, t, b }.
		return {l: 0, r: 0, t: 0, b: 0};	//	Object
	},
	render: function(dim, offsets){
		//	summary:
		//		Stub function to render this axis.
		//	returns: dojox.charting.axis2d.Base
		//		A reference to the axis for functional chaining.
		this.dirty = false;
		return this;	//	dojox.charting.axis2d.Base
	}
});
});

},
'dojox/lang/functional/scan':function(){
define("dojox/lang/functional/scan", ["dojo/_base/kernel", "dojo/_base/lang", "./lambda"], function(d, darray, df){

// This module adds high-level functions and related constructs:
//	- "scan" family of functions

// Notes:
//	- missing high-level functions are provided with the compatible API:
//		scanl, scanl1, scanr, scanr1

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument
//	- take an iterator objects as the array argument (only scanl, and scanl1)

	var empty = {};

	d.mixin(df, {
		// classic reduce-class functions
		scanl: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left
			//	to right using a seed value as a starting point; returns an array
			//	of values produced by foldl() at that point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var t, n, i;
			if(d.isArray(a)){
				// array
				t = new Array((n = a.length) + 1);
				t[0] = z;
				for(i = 0; i < n; z = f.call(o, z, a[i], i, a), t[++i] = z);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				t = [z];
				for(i = 0; a.hasNext(); t.push(z = f.call(o, z, a.next(), i++, a)));
			}else{
				// object/dictionary
				t = [z];
				for(i in a){
					if(!(i in empty)){
						t.push(z = f.call(o, z, a[i], i, a));
					}
				}
			}
			return t;	// Array
		},
		scanl1: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left
			//	to right; returns an array of values produced by foldl1() at that
			//	point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var t, n, z, first = true;
			if(d.isArray(a)){
				// array
				t = new Array(n = a.length);
				t[0] = z = a[0];
				for(var i = 1; i < n; t[i] = z = f.call(o, z, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				if(a.hasNext()){
					t = [z = a.next()];
					for(i = 1; a.hasNext(); t.push(z = f.call(o, z, a.next(), i++, a)));
				}
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						if(first){
							t = [z = a[i]];
							first = false;
						}else{
							t.push(z = f.call(o, z, a[i], i, a));
						}
					}
				}
			}
			return t;	// Array
		},
		scanr: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left using a seed value as a starting point; returns an array
			//	of values produced by foldr() at that point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var n = a.length, t = new Array(n + 1), i = n;
			t[n] = z;
			for(; i > 0; --i, z = f.call(o, z, a[i], i, a), t[i] = z);
			return t;	// Array
		},
		scanr1: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left; returns an array of values produced by foldr1() at that
			//	point.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || d.global; f = df.lambda(f);
			var n = a.length, t = new Array(n), z = a[n - 1], i = n - 1;
			t[i] = z;
			for(; i > 0; --i, z = f.call(o, z, a[i], i, a), t[i] = z);
			return t;	// Array
		}
	});
});

},
'dojox/charting/themes/PlotKit/purple':function(){
define("dojox/charting/themes/PlotKit/purple", ["./base", "../../Theme"], function(pk, Theme){
	pk.purple = pk.base.clone();
	pk.purple.chart.fill = pk.purple.plotarea.fill = "#eee6f5";
	pk.purple.colors = Theme.defineColors({hue: 271, saturation: 60, low: 40, high: 88});
	
	return pk.purple;
});

},
'dojox/gfx3d/lighting':function(){
define("dojox/gfx3d/lighting", [
	"dojo/_base/lang",
	"dojo/_base/Color",	// dojo.Color
	"dojo/_base/declare",	// dojo.declare
	"dojox/gfx/_base",
	"./_base"
],function(lang,Color,declare,gfx,gfx3d) {

	var lite = gfx3d.lighting = {
		// color utilities
		black: function(){
			return {r: 0, g: 0, b: 0, a: 1};
		},
		white: function(){
			return {r: 1, g: 1, b: 1, a: 1};
		},
		toStdColor: function(c){
			c = gfx.normalizeColor(c);
			return {r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a};
		},
		fromStdColor: function(c){
			return new Color([Math.round(255 * c.r), Math.round(255 * c.g), Math.round(255 * c.b), c.a]);
		},
		scaleColor: function(s, c){
			return {r: s * c.r, g: s * c.g, b: s * c.b, a: s * c.a};
		},
		addColor: function(a, b){
			return {r: a.r + b.r, g: a.g + b.g, b: a.b + b.b, a: a.a + b.a};
		},
		multiplyColor: function(a, b){
			return {r: a.r * b.r, g: a.g * b.g, b: a.b * b.b, a: a.a * b.a};
		},
		saturateColor: function(c){
			return {
				r: c.r < 0 ? 0 : c.r > 1 ? 1 : c.r,
				g: c.g < 0 ? 0 : c.g > 1 ? 1 : c.g,
				b: c.b < 0 ? 0 : c.b > 1 ? 1 : c.b,
				a: c.a < 0 ? 0 : c.a > 1 ? 1 : c.a
			};
		},
		mixColor: function(c1, c2, s){
			return lite.addColor(lite.scaleColor(s, c1), lite.scaleColor(1 - s, c2));
		},
		diff2Color: function(c1, c2){
			var r = c1.r - c2.r;
			var g = c1.g - c2.g;
			var b = c1.b - c2.b;
			var a = c1.a - c2.a;
			return r * r + g * g + b * b + a * a;
		},
		length2Color: function(c){
			return c.r * c.r + c.g * c.g + c.b * c.b + c.a * c.a;
		},
		
		// vector utilities
		//TODO: move vector utilities from this file to vector.js
		dot: function(a, b){
			return a.x * b.x + a.y * b.y + a.z * b.z;
		},
		scale: function(s, v){
			return {x: s * v.x, y: s * v.y, z: s * v.z};
		},
		add: function(a, b){
			return {x: a.x + b.x, y: a.y + b.y, z: a.z + b.z};
		},
		saturate: function(v){
			return Math.min(Math.max(v, 0), 1);
		},
		length: function(v){
			return Math.sqrt(gfx3d.lighting.dot(v, v));
		},
		normalize: function(v){
			return lite.scale(1 / lite.length(v), v);
		},
		faceforward: function(n, i){
			var p = gfx3d.lighting;
			var s = p.dot(i, n) < 0 ? 1 : -1;
			return p.scale(s, n);
		},
		reflect: function(i, n){
			var p = gfx3d.lighting;
			return p.add(i, p.scale(-2 * p.dot(i, n), n));
		},
		
		// lighting utilities
		diffuse: function(normal, lights){
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					d = lite.dot(lite.normalize(l.direction), normal);
				c = lite.addColor(c, lite.scaleColor(d, l.color));
			}
			return lite.saturateColor(c);
		},
		specular: function(normal, v, roughness, lights){
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					h = lite.normalize(lite.add(lite.normalize(l.direction), v)),
					s = Math.pow(Math.max(0, lite.dot(normal, h)), 1 / roughness);
				c = lite.addColor(c, lite.scaleColor(s, l.color));
			}
			return lite.saturateColor(c);
		},
		phong: function(normal, v, size, lights){
			normal = lite.normalize(normal);
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					r = lite.reflect(lite.scale(-1, lite.normalize(v)), normal),
					s = Math.pow(Math.max(0, lite.dot(r, lite.normalize(l.direction))), size);
				c = lite.addColor(c, lite.scaleColor(s, l.color));
			}
			return lite.saturateColor(c);
		}
	};

	// this lighting model is derived from RenderMan Interface Specification Version 3.2

	declare("dojox.gfx3d.lighting.Model", null, {
		constructor: function(incident, lights, ambient, specular){
			this.incident = lite.normalize(incident);
			this.lights = [];
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i];
				this.lights.push({direction: lite.normalize(l.direction), color: lite.toStdColor(l.color)});
			}
			this.ambient = lite.toStdColor(ambient.color ? ambient.color : "white");
			this.ambient = lite.scaleColor(ambient.intensity, this.ambient);
			this.ambient = lite.scaleColor(this.ambient.a, this.ambient);
			this.ambient.a = 1;
			this.specular = lite.toStdColor(specular ? specular : "white");
			this.specular = lite.scaleColor(this.specular.a, this.specular);
			this.specular.a = 1;
			this.npr_cool = {r: 0,   g: 0,   b: 0.4, a: 1};
			this.npr_warm = {r: 0.4, g: 0.4, b: 0.2, a: 1};
			this.npr_alpha = 0.2;
			this.npr_beta  = 0.6;
			this.npr_scale = 0.6;
		},
		constant: function(normal, finish, pigment){
			pigment   = lite.toStdColor(pigment);
			var alpha = pigment.a, color = lite.scaleColor(alpha, pigment);
			color.a   = alpha;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		matte: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights)),
				color   = lite.scaleColor(pigment.a, lite.multiplyColor(pigment, lite.addColor(ambient, diffuse)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		metal: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var v = lite.scale(-1, this.incident), specular, color,
				ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident));
			if("phong" in finish){
				specular = lite.scaleColor(shadow * finish.Ks * finish.phong, lite.phong(normal, v, finish.phong_size, this.lights));
			}else{
				specular = lite.scaleColor(shadow * finish.Ks, lite.specular(normal, v, finish.roughness, this.lights));
			}
			color = lite.scaleColor(pigment.a, lite.addColor(lite.multiplyColor(pigment, ambient), lite.multiplyColor(this.specular, specular)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		plastic: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var v = lite.scale(-1, this.incident), specular, color,
				ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights));
			if("phong" in finish){
				specular = lite.scaleColor(shadow * finish.Ks * finish.phong, lite.phong(normal, v, finish.phong_size, this.lights));
			}else{
				specular = lite.scaleColor(shadow * finish.Ks, lite.specular(normal, v, finish.roughness, this.lights));
			}
			color = lite.scaleColor(pigment.a, lite.addColor(lite.multiplyColor(pigment, lite.addColor(ambient, diffuse)), lite.multiplyColor(this.specular, specular)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		npr: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var ambient  = lite.scaleColor(finish.Ka, this.ambient),
				shadow   = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse  = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights)),
				color = lite.scaleColor(pigment.a, lite.multiplyColor(pigment, lite.addColor(ambient, diffuse))),
				cool = lite.addColor(this.npr_cool, lite.scaleColor(this.npr_alpha, color)),
				warm = lite.addColor(this.npr_warm, lite.scaleColor(this.npr_beta,  color)),
				d = (1 + lite.dot(this.incident, normal)) / 2,
				color = lite.scaleColor(this.npr_scale, lite.addColor(color, lite.mixColor(cool, warm, d)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		}
	});


	// POV-Ray basic finishes
	
	gfx3d.lighting.finish = {
	
		// Default
		
		defaults: {Ka: 0.1, Kd: 0.6, Ks: 0.0, roughness: 0.05},
		
		dull:     {Ka: 0.1, Kd: 0.6, Ks: 0.5, roughness: 0.15},
		shiny:    {Ka: 0.1, Kd: 0.6, Ks: 1.0, roughness: 0.001},
		glossy:   {Ka: 0.1, Kd: 0.6, Ks: 1.0, roughness: 0.0001},
		
		phong_dull:   {Ka: 0.1, Kd: 0.6, Ks: 0.5, phong: 0.5, phong_size: 1},
		phong_shiny:  {Ka: 0.1, Kd: 0.6, Ks: 1.0, phong: 1.0, phong_size: 200},
		phong_glossy: {Ka: 0.1, Kd: 0.6, Ks: 1.0, phong: 1.0, phong_size: 300},
	
		luminous: {Ka: 1.0, Kd: 0.0, Ks: 0.0, roughness: 0.05},
	
		// Metals
	
		// very soft and dull
		metalA: {Ka: 0.35, Kd: 0.3, Ks: 0.8, roughness: 1/20},
		// fairly soft and dull
		metalB: {Ka: 0.30, Kd: 0.4, Ks: 0.7, roughness: 1/60},
		// medium reflectivity, holds color well
		metalC: {Ka: 0.25, Kd: 0.5, Ks: 0.8, roughness: 1/80},
		// highly hard and polished, high reflectivity
		metalD: {Ka: 0.15, Kd: 0.6, Ks: 0.8, roughness: 1/100},
		// very highly polished and reflective
		metalE: {Ka: 0.10, Kd: 0.7, Ks: 0.8, roughness: 1/120}
	};

	return lite;
});

},
'dojox/charting/scaler/primitive':function(){
define("dojox/charting/scaler/primitive", ["dojo/_base/lang"], 
  function(lang){
	var primitive = lang.getObject("dojox.charting.scaler.primitive", true);
	return lang.mixin(primitive, {
		buildScaler: function(/*Number*/ min, /*Number*/ max, /*Number*/ span, /*Object*/ kwArgs){
			if(min == max){
				// artificially extend bounds
				min -= 0.5;
				max += 0.5;
				// now the line will be centered
			}
			return {
				bounds: {
					lower: min,
					upper: max,
					from:  min,
					to:    max,
					scale: span / (max - min),
					span:  span
				},
				scaler: primitive
			};
		},
		buildTicks: function(/*Object*/ scaler, /*Object*/ kwArgs){
			return {major: [], minor: [], micro: []};	// Object
		},
		getTransformerFromModel: function(/*Object*/ scaler){
			var offset = scaler.bounds.from, scale = scaler.bounds.scale;
			return function(x){ return (x - offset) * scale; };	// Function
		},
		getTransformerFromPlot: function(/*Object*/ scaler){
			var offset = scaler.bounds.from, scale = scaler.bounds.scale;
			return function(x){ return x / scale + offset; };	// Function
		}
	});
});

},
'dojo/window':function(){
define("dojo/window", ["./_base/lang", "./_base/sniff", "./_base/window", "./dom", "./dom-geometry", "./dom-style", "./dom-construct"],
	function(lang, has, baseWindow, dom, geom, style, domConstruct) {

	// feature detection
	/* not needed but included here for future reference
	has.add("rtl-innerVerticalScrollBar-on-left", function(win, doc){
		var	body = baseWindow.body(doc),
			scrollable = domConstruct.create('div', {
				style: {overflow:'scroll', overflowX:'hidden', direction:'rtl', visibility:'hidden', position:'absolute', left:'0', width:'64px', height:'64px'}
			}, body, "last"),
			center = domConstruct.create('center', {
				style: {overflow:'hidden', direction:'ltr'}
			}, scrollable, "last"),
			inner = domConstruct.create('div', {
				style: {overflow:'visible', display:'inline' }
			}, center, "last");
		inner.innerHTML="&nbsp;";
		var midPoint = Math.max(inner.offsetLeft, geom.position(inner).x);
		var ret = midPoint >= 32;
		center.removeChild(inner);
		scrollable.removeChild(center);
		body.removeChild(scrollable);
		return ret;
	});
	*/
	has.add("rtl-adjust-position-for-verticalScrollBar", function(win, doc){
		var	body = baseWindow.body(doc),
			scrollable = domConstruct.create('div', {
				style: {overflow:'scroll', overflowX:'visible', direction:'rtl', visibility:'hidden', position:'absolute', left:'0', top:'0', width:'64px', height:'64px'}
			}, body, "last"),
			div = domConstruct.create('div', {
				style: {overflow:'hidden', direction:'ltr'}
			}, scrollable, "last"),
			ret = geom.position(div).x != 0;
		scrollable.removeChild(div);
		body.removeChild(scrollable);
		return ret;
	});

	has.add("position-fixed-support", function(win, doc){
		// IE6, IE7+quirks, and some older mobile browsers don't support position:fixed
		var	body = baseWindow.body(doc),
			outer = domConstruct.create('span', {
				style: {visibility:'hidden', position:'fixed', left:'1px', top:'1px'}
			}, body, "last"),
			inner = domConstruct.create('span', {
				style: {position:'fixed', left:'0', top:'0'}
			}, outer, "last"),
			ret = geom.position(inner).x != geom.position(outer).x;
		outer.removeChild(inner);
		body.removeChild(outer);
		return ret;
	});

// module:
//		dojo/window
// summary:
//		TODOC

var window = lang.getObject("dojo.window", true);

/*=====
dojo.window = {
	// summary:
	//		TODO
};
window = dojo.window;
=====*/

window.getBox = function(){
	// summary:
	//		Returns the dimensions and scroll position of the viewable area of a browser window

	var
		scrollRoot = (baseWindow.doc.compatMode == 'BackCompat') ? baseWindow.body() : baseWindow.doc.documentElement,
		// get scroll position
		scroll = geom.docScroll(), // scrollRoot.scrollTop/Left should work
		w, h;

	if(has("touch")){ // if(scrollbars not supported)
		var uiWindow = baseWindow.doc.parentWindow || baseWindow.doc.defaultView;   // use UI window, not dojo.global window. baseWindow.doc.parentWindow probably not needed since it's not defined for webkit
		// on mobile, scrollRoot.clientHeight <= uiWindow.innerHeight <= scrollRoot.offsetHeight, return uiWindow.innerHeight
		w = uiWindow.innerWidth || scrollRoot.clientWidth; // || scrollRoot.clientXXX probably never evaluated
		h = uiWindow.innerHeight || scrollRoot.clientHeight;
	}else{
		// on desktops, scrollRoot.clientHeight <= scrollRoot.offsetHeight <= uiWindow.innerHeight, return scrollRoot.clientHeight
		// uiWindow.innerWidth/Height includes the scrollbar and cannot be used
		w = scrollRoot.clientWidth;
		h = scrollRoot.clientHeight;
	}
	return {
		l: scroll.x,
		t: scroll.y,
		w: w,
		h: h
	};
};

window.get = function(doc){
	// summary:
	// 		Get window object associated with document doc

	// In some IE versions (at least 6.0), document.parentWindow does not return a
	// reference to the real window object (maybe a copy), so we must fix it as well
	// We use IE specific execScript to attach the real window reference to
	// document._parentWindow for later use
	if(has("ie") < 9 && window !== document.parentWindow){
		/*
		In IE 6, only the variable "window" can be used to connect events (others
		may be only copies).
		*/
		doc.parentWindow.execScript("document._parentWindow = window;", "Javascript");
		//to prevent memory leak, unset it after use
		//another possibility is to add an onUnload handler which seems overkill to me (liucougar)
		var win = doc._parentWindow;
		doc._parentWindow = null;
		return win;	//	Window
	}

	return doc.parentWindow || doc.defaultView;	//	Window
};

window.scrollIntoView = function(/*DomNode*/ node, /*Object?*/ pos){
	// summary:
	//		Scroll the passed node into view using minimal movement, if it is not already.

	// Don't rely on node.scrollIntoView working just because the function is there since
	// it forces the node to the page's bottom or top (and left or right in IE) without consideration for the minimal movement.
	// WebKit's node.scrollIntoViewIfNeeded doesn't work either for inner scrollbars in right-to-left mode
	// and when there's a fixed position scrollable element

	try{ // catch unexpected/unrecreatable errors (#7808) since we can recover using a semi-acceptable native method
		node = dom.byId(node);
		var	doc = node.ownerDocument || baseWindow.doc,	// TODO: why baseWindow.doc?  Isn't node.ownerDocument always defined?
			body = baseWindow.body(doc),
			html = doc.documentElement || body.parentNode,
			isIE = has("ie"),
			isWK = has("webkit");
		// if an untested browser, then use the native method
		if(node == body || node == html){ return; }
		if(!(has("mozilla") || isIE || isWK || has("opera") || has("trident")) && ("scrollIntoView" in node)){
			node.scrollIntoView(false); // short-circuit to native if possible
			return;
		}
		var	backCompat = doc.compatMode == 'BackCompat',
			rootWidth = Math.min(body.clientWidth || html.clientWidth, html.clientWidth || body.clientWidth),
			rootHeight = Math.min(body.clientHeight || html.clientHeight, html.clientHeight || body.clientHeight),
			scrollRoot = (isWK || backCompat) ? body : html,
			nodePos = pos || geom.position(node),
			el = node.parentNode,
			isFixed = function(el){
				return (isIE <= 6 || (isIE == 7 && backCompat))
					? false
					: (has("position-fixed-support") && (style.get(el, 'position').toLowerCase() == "fixed"));
			},
			self = this,
			scrollElementBy = function(el, x, y){
				if(el.tagName == "BODY" || el.tagName == "HTML"){
					self.get(el.ownerDocument).scrollBy(x, y);
				}else{
					x && (el.scrollLeft += x);
					y && (el.scrollTop += y);
				}
			};
		if(isFixed(node)){ return; } // nothing to do
		while(el){
			if(el == body){ el = scrollRoot; }
			var	elPos = geom.position(el),
				fixedPos = isFixed(el),
				rtl = style.getComputedStyle(el).direction.toLowerCase() == "rtl";

			if(el == scrollRoot){
				elPos.w = rootWidth; elPos.h = rootHeight;
				if(scrollRoot == html && (isIE || has("trident")) && rtl){ elPos.x += scrollRoot.offsetWidth-elPos.w; } // IE workaround where scrollbar causes negative x
				if(elPos.x < 0 || !isIE || isIE >= 9 || has("trident")){ elPos.x = 0; } // older IE can have values > 0
				if(elPos.y < 0 || !isIE || isIE >= 9 || has("trident")){ elPos.y = 0; }
			}else{
				var pb = geom.getPadBorderExtents(el);
				elPos.w -= pb.w; elPos.h -= pb.h; elPos.x += pb.l; elPos.y += pb.t;
				var clientSize = el.clientWidth,
					scrollBarSize = elPos.w - clientSize;
				if(clientSize > 0 && scrollBarSize > 0){
					if(rtl && has("rtl-adjust-position-for-verticalScrollBar")){
						elPos.x += scrollBarSize;
					}
					elPos.w = clientSize;
				}
				clientSize = el.clientHeight;
				scrollBarSize = elPos.h - clientSize;
				if(clientSize > 0 && scrollBarSize > 0){
					elPos.h = clientSize;
				}
			}
			if(fixedPos){ // bounded by viewport, not parents
				if(elPos.y < 0){
					elPos.h += elPos.y; elPos.y = 0;
				}
				if(elPos.x < 0){
					elPos.w += elPos.x; elPos.x = 0;
				}
				if(elPos.y + elPos.h > rootHeight){
					elPos.h = rootHeight - elPos.y;
				}
				if(elPos.x + elPos.w > rootWidth){
					elPos.w = rootWidth - elPos.x;
				}
			}
			// calculate overflow in all 4 directions
			var	l = nodePos.x - elPos.x, // beyond left: < 0
//						t = nodePos.y - Math.max(elPos.y, 0), // beyond top: < 0
				t = nodePos.y - elPos.y, // beyond top: < 0
				r = l + nodePos.w - elPos.w, // beyond right: > 0
				bot = t + nodePos.h - elPos.h; // beyond bottom: > 0
			var s, old;
			if(r * l > 0 && (!!el.scrollLeft || el == scrollRoot || el.scrollWidth > el.offsetHeight)){
				s = Math[l < 0? "max" : "min"](l, r);
				if(rtl && ((isIE == 8 && !backCompat) || isIE >= 9 || has("trident"))){ s = -s; }
				old = el.scrollLeft;
				scrollElementBy(el, s, 0);
				s = el.scrollLeft - old;
				nodePos.x -= s;
			}
			if(bot * t > 0 && (!!el.scrollTop || el == scrollRoot || el.scrollHeight > el.offsetHeight)){
				s = Math.ceil(Math[t < 0? "max" : "min"](t, bot));
				old = el.scrollTop;
				scrollElementBy(el, 0, s);
				s = el.scrollTop - old;
				nodePos.y -= s;
			}
			el = (el != scrollRoot) && !fixedPos && el.parentNode;
		}
	}catch(error){
		console.error('scrollIntoView: ' + error);
		node.scrollIntoView(false);
	}
};

return window;
});

},
'dojox/gfx/fx':function(){
define("dojox/gfx/fx", ["dojo/_base/lang", "./_base", "./matrix", "dojo/_base/Color", "dojo/_base/array", "dojo/_base/fx", "dojo/_base/connect"], 
  function(lang, g, m, Color, arr, fx, Hub){
	var fxg = g.fx = {};
	/*===== g = dojox.gfx; fxg = dojox.gfx.fx; =====*/

	// Generic interpolators. Should they be moved to dojox.fx?

	function InterpolNumber(start, end){
		this.start = start, this.end = end;
	}
	InterpolNumber.prototype.getValue = function(r){
		return (this.end - this.start) * r + this.start;
	};

	function InterpolUnit(start, end, units){
		this.start = start, this.end = end;
		this.units = units;
	}
	InterpolUnit.prototype.getValue = function(r){
		return (this.end - this.start) * r + this.start + this.units;
	};

	function InterpolColor(start, end){
		this.start = start, this.end = end;
		this.temp = new Color();
	}
	InterpolColor.prototype.getValue = function(r){
		return Color.blendColors(this.start, this.end, r, this.temp);
	};

	function InterpolValues(values){
		this.values = values;
		this.length = values.length;
	}
	InterpolValues.prototype.getValue = function(r){
		return this.values[Math.min(Math.floor(r * this.length), this.length - 1)];
	};

	function InterpolObject(values, def){
		this.values = values;
		this.def = def ? def : {};
	}
	InterpolObject.prototype.getValue = function(r){
		var ret = lang.clone(this.def);
		for(var i in this.values){
			ret[i] = this.values[i].getValue(r);
		}
		return ret;
	};

	function InterpolTransform(stack, original){
		this.stack = stack;
		this.original = original;
	}
	InterpolTransform.prototype.getValue = function(r){
		var ret = [];
		arr.forEach(this.stack, function(t){
			if(t instanceof m.Matrix2D){
				ret.push(t);
				return;
			}
			if(t.name == "original" && this.original){
				ret.push(this.original);
				return;
			}
			if(!(t.name in m)){ return; }
			var f = m[t.name];
			if(typeof f != "function"){
				// constant
				ret.push(f);
				return;
			}
			var val = arr.map(t.start, function(v, i){
							return (t.end[i] - v) * r + v;
						}),
				matrix = f.apply(m, val);
			if(matrix instanceof m.Matrix2D){
				ret.push(matrix);
			}
		}, this);
		return ret;
	};

	var transparent = new Color(0, 0, 0, 0);

	function getColorInterpol(prop, obj, name, def){
		if(prop.values){
			return new InterpolValues(prop.values);
		}
		var value, start, end;
		if(prop.start){
			start = g.normalizeColor(prop.start);
		}else{
			start = value = obj ? (name ? obj[name] : obj) : def;
		}
		if(prop.end){
			end = g.normalizeColor(prop.end);
		}else{
			if(!value){
				value = obj ? (name ? obj[name] : obj) : def;
			}
			end = value;
		}
		return new InterpolColor(start, end);
	}

	function getNumberInterpol(prop, obj, name, def){
		if(prop.values){
			return new InterpolValues(prop.values);
		}
		var value, start, end;
		if(prop.start){
			start = prop.start;
		}else{
			start = value = obj ? obj[name] : def;
		}
		if(prop.end){
			end = prop.end;
		}else{
			if(typeof value != "number"){
				value = obj ? obj[name] : def;
			}
			end = value;
		}
		return new InterpolNumber(start, end);
	}

	fxg.animateStroke = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change stroke properties over time.
		// example:
		//	|	dojox.gfx.fx.animateStroke{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		color: {start: "red", end: "green"},
		//	|		width: {end: 15},
		//	|		join:  {values: ["miter", "bevel", "round"]}
		//	|	}).play();
		if(!args.easing){ args.easing = fx._defaultEasing; }
		var anim = new fx.Animation(args), shape = args.shape, stroke;
		Hub.connect(anim, "beforeBegin", anim, function(){
			stroke = shape.getStroke();
			var prop = args.color, values = {}, value, start, end;
			if(prop){
				values.color = getColorInterpol(prop, stroke, "color", transparent);
			}
			prop = args.style;
			if(prop && prop.values){
				values.style = new InterpolValues(prop.values);
			}
			prop = args.width;
			if(prop){
				values.width = getNumberInterpol(prop, stroke, "width", 1);
			}
			prop = args.cap;
			if(prop && prop.values){
				values.cap = new InterpolValues(prop.values);
			}
			prop = args.join;
			if(prop){
				if(prop.values){
					values.join = new InterpolValues(prop.values);
				}else{
					start = prop.start ? prop.start : (stroke && stroke.join || 0);
					end = prop.end ? prop.end : (stroke && stroke.join || 0);
					if(typeof start == "number" && typeof end == "number"){
						values.join = new InterpolNumber(start, end);
					}
				}
			}
			this.curve = new InterpolObject(values, stroke);
		});
		Hub.connect(anim, "onAnimate", shape, "setStroke");
		return anim; // dojo.Animation
	};

	fxg.animateFill = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change fill color over time.
		//	Only solid fill color is supported at the moment
		// example:
		//	|	dojox.gfx.fx.animateFill{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		color: {start: "red", end: "green"}
		//	|	}).play();
		if(!args.easing){ args.easing = fx._defaultEasing; }
		var anim = new fx.Animation(args), shape = args.shape, fill;
		Hub.connect(anim, "beforeBegin", anim, function(){
			fill = shape.getFill();
			var prop = args.color, values = {};
			if(prop){
				this.curve = getColorInterpol(prop, fill, "", transparent);
			}
		});
		Hub.connect(anim, "onAnimate", shape, "setFill");
		return anim; // dojo.Animation
	};

	fxg.animateFont = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change font properties over time.
		// example:
		//	|	dojox.gfx.fx.animateFont{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		variant: {values: ["normal", "small-caps"]},
		//	|		size:  {end: 10, units: "pt"}
		//	|	}).play();
		if(!args.easing){ args.easing = fx._defaultEasing; }
		var anim = new fx.Animation(args), shape = args.shape, font;
		Hub.connect(anim, "beforeBegin", anim, function(){
			font = shape.getFont();
			var prop = args.style, values = {}, value, start, end;
			if(prop && prop.values){
				values.style = new InterpolValues(prop.values);
			}
			prop = args.variant;
			if(prop && prop.values){
				values.variant = new InterpolValues(prop.values);
			}
			prop = args.weight;
			if(prop && prop.values){
				values.weight = new InterpolValues(prop.values);
			}
			prop = args.family;
			if(prop && prop.values){
				values.family = new InterpolValues(prop.values);
			}
			prop = args.size;
			if(prop && prop.units){
				start = parseFloat(prop.start ? prop.start : (shape.font && shape.font.size || "0"));
				end = parseFloat(prop.end ? prop.end : (shape.font && shape.font.size || "0"));
				values.size = new InterpolUnit(start, end, prop.units);
			}
			this.curve = new InterpolObject(values, font);
		});
		Hub.connect(anim, "onAnimate", shape, "setFont");
		return anim; // dojo.Animation
	};

	fxg.animateTransform = function(/*Object*/ args){
		// summary:
		//	Returns an animation which will change transformation over time.
		// example:
		//	|	dojox.gfx.fx.animateTransform{{
		//	|		shape: shape,
		//	|		duration: 500,
		//	|		transform: [
		//	|			{name: "translate", start: [0, 0], end: [200, 200]},
		//	|			{name: "original"}
		//	|		]
		//	|	}).play();
		if(!args.easing){ args.easing = fx._defaultEasing; }
		var anim = new fx.Animation(args), shape = args.shape, original;
		Hub.connect(anim, "beforeBegin", anim, function(){
			original = shape.getTransform();
			this.curve = new InterpolTransform(args.transform, original);
		});
		Hub.connect(anim, "onAnimate", shape, "setTransform");
		return anim; // dojo.Animation
	};
	
	return fxg;
});

},
'dojox/charting/plot2d/StackedColumns':function(){
define("dojox/charting/plot2d/StackedColumns", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Columns", "./common", 
	"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/functional/sequence"], 
	function(lang, arr, declare, Columns, dc, df, dfr, dfs){

	var	purgeGroup = dfr.lambda("item.purgeGroup()");
/*=====
var Columns = dojox.charting.plot2d.Columns;
=====*/
	return declare("dojox.charting.plot2d.StackedColumns", Columns, {
		//	summary:
		//		The plot object representing a stacked column chart (vertical bars).
		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = dc.collectStackedStats(this.series);
			this._maxRunLength = stats.hmax;
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.StackedColumns
			//		A reference to this plot for functional chaining.
			if(this._maxRunLength <= 0){
				return this;
			}

			// stack all values
			var acc = df.repeat(this._maxRunLength, "-> 0", 0);
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i];
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] += v;
					}
				}
			}
			// draw runs in backwards
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("column", [this.opt, run]), s = run.group,
					eventSeries = new Array(acc.length);
				for(var j = 0; j < acc.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = acc[j],
							height = vt(v),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "column", value, true) :
								t.post(theme, "column");
						if(width >= 1 && height >= 0){
							var rect = {
								x: offsets.l + ht(j + 0.5) + gap,
								y: dim.height - offsets.b - vt(v),
								width: width, height: height
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									x:       j + 0.5,
									y:       v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b, height);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
				// update the accumulator
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y;
						if(isNaN(v)){ v = 0; }
						acc[j] -= v;
					}
				}
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.StackedColumns
		}
	});
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
'dojox/charting/themes/ThreeD':function(){
define("dojox/charting/themes/ThreeD", ["dojox","dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array", "../Theme", "./gradientGenerator", "./PrimaryColors", "dojo/colors" /* for sanitize */, "./common"], 
	function(dojox, kernel, lang, ArrayUtil, Theme, gradientGenerator, PrimaryColors, themes){

	var colors = ["#f00", "#0f0", "#00f", "#ff0", "#0ff", "#f0f", "./common"],	// the same is in PrimaryColors
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 100, y2: 0},
		// 3D cylinder map is calculated using dojox.gfx3d
		cyl3dMap = [
			{o: 0.00, i: 174}, {o: 0.08, i: 231}, {o: 0.18, i: 237}, {o: 0.30, i: 231},
			{o: 0.39, i: 221}, {o: 0.49, i: 206}, {o: 0.58, i: 187}, {o: 0.68, i: 165},
			{o: 0.80, i: 128}, {o: 0.90, i: 102}, {o: 1.00, i: 174}
		],
		hiliteIndex = 2, hiliteIntensity = 100, lumStroke = 50,
		cyl3dFills = ArrayUtil.map(colors, function(c){
			var fill = lang.delegate(defaultFill),
				colors = fill.colors = gradientGenerator.generateGradientByIntensity(c, cyl3dMap),
				hilite = colors[hiliteIndex].color;
			// add highlight
			hilite.r += hiliteIntensity;
			hilite.g += hiliteIntensity;
			hilite.b += hiliteIntensity;
			hilite.sanitize();
			return fill;
		});

	themes.ThreeD = PrimaryColors.clone();
	themes.ThreeD.series.shadow = {dx: 1, dy: 1, width: 3, color: [0, 0, 0, 0.15]};

	themes.ThreeD.next = function(elementType, mixin, doPost){
		if(elementType == "bar" || elementType == "column"){
			// custom processing for bars and columns: substitute fills
			var index = this._current % this.seriesThemes.length,
				s = this.seriesThemes[index], old = s.fill;
			s.fill = cyl3dFills[index];
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			s.fill = old;
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	return themes.ThreeD;
});

},
'dojox/charting/themes/Tufte':function(){
define("dojox/charting/themes/Tufte", ["../Theme", "dojo/_base/Color", "./common"], function(Theme, Color, themes){
	/*
		A charting theme based on the principles championed by
		Edward Tufte.  By Alex Russell, Dojo Project Lead.
	*/
	themes.Tufte = new Theme({
		chart: {
			stroke: null,
			fill: "inherit"
		},
		plotarea: {
			// stroke: { width: 0.2, color: "#666666" },
			stroke: null,
			fill: "transparent"
		},
		axis: {
			stroke: {width: 1, color: "#ccc"},
			majorTick:{
				color:	"black",
				width:	1,
				length: 5
			},
			minorTick: {
				color:	"#666",
				width:	1,
				length:	2
			},
			font: "normal normal normal 8pt Tahoma",
			fontColor: "#999"
		},
		series: {
			outline:   null,
			stroke:	   {width: 1, color: "black"},
			// fill:   "#3b444b",
			fill:      new Color([0x3b, 0x44, 0x4b, 0.85]),
			font: "normal normal normal 7pt Tahoma",
			fontColor: "#717171"
		},
		marker: {
			stroke:    {width: 1, color: "black"},
			fill:      "#333",
			font: "normal normal normal 7pt Tahoma",
			fontColor: "black"
		},
		colors:[
			Color.fromHex("#8a8c8f"),
			Color.fromHex("#4b4b4b"),
			Color.fromHex("#3b444b"),
			Color.fromHex("#2e2d30"),
			Color.fromHex("#000000")
		]	
	});
	return themes.Tufte;
});

},
'dojox/gfx/renderer':function(){
define("dojox/gfx/renderer", ["./_base","dojo/_base/lang", "dojo/_base/sniff", "dojo/_base/window", "dojo/_base/config"],
  function(g, lang, has, win, config){
  //>> noBuildResolver
/*=====
	dojox.gfx.renderer = {
		// summary:
		//		This module is an AMD loader plugin that loads the appropriate graphics renderer
		//		implementation based on detected environment and current configuration settings.
	};
  =====*/
	var currentRenderer = null;

	has.add("vml", function(global, document, element){
		element.innerHTML = "<v:shape adj=\"1\"/>";
		var supported = ("adj" in element.firstChild);
		element.innerHTML = "";
		return supported;
	});

	return {
		load: function(id, require, load){
			if(currentRenderer && id != "force"){
				load(currentRenderer);
				return;
			}
			var renderer = config.forceGfxRenderer,
				renderers = !renderer && (lang.isString(config.gfxRenderer) ?
					config.gfxRenderer : "svg,vml,canvas,silverlight").split(","),
				silverlightObject, silverlightFlag;

			while(!renderer && renderers.length){
				switch(renderers.shift()){
					case "svg":
						// the next test is from https://github.com/phiggins42/has.js
						if("SVGAngle" in win.global){
							renderer = "svg";
						}
						break;
					case "vml":
						if(has("vml")){
							renderer = "vml";
						}
						break;
					case "silverlight":
						try{
							if(has("ie")){
								silverlightObject = new ActiveXObject("AgControl.AgControl");
								if(silverlightObject && silverlightObject.IsVersionSupported("1.0")){
									silverlightFlag = true;
								}
							}else{
								if(navigator.plugins["Silverlight Plug-In"]){
									silverlightFlag = true;
								}
							}
						}catch(e){
							silverlightFlag = false;
						}finally{
							silverlightObject = null;
						}
						if(silverlightFlag){
							renderer = "silverlight";
						}
						break;
					case "canvas":
						if(win.global.CanvasRenderingContext2D){
							renderer = "canvas";
						}
						break;
				}
			}

			if (renderer === 'canvas' && config.canvasEvents !== false) {
				renderer = "canvasWithEvents";
			}

			if(config.isDebug){
				console.log("gfx renderer = " + renderer);
			}

			function loadRenderer(){
				require(["dojox/gfx/" + renderer], function(module){
					g.renderer = renderer;
					// memorize the renderer module
					currentRenderer = module;
					// now load it
					load(module);
				});
			}
			if(renderer == "svg" && typeof window.svgweb != "undefined"){
				window.svgweb.addOnLoad(loadRenderer);
			}else{
				loadRenderer();
			}
		}
	};
});

},
'dojox/charting/plot2d/OHLC':function(){
define("dojox/charting/plot2d/OHLC", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Base", "./common", 
	"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils", "dojox/gfx/fx"],
	function(lang, arr, declare, Base, dc, df, dfr, du, fx){
/*=====
var Base = dojox.charting.plot2d.Base;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	//	Candlesticks are based on the Bars plot type; we expect the following passed
	//	as values in a series:
	//	{ x?, open, close, high, low }
	//	if x is not provided, the array index is used.
	//	failing to provide the OHLC values will throw an error.
	return declare("dojox.charting.plot2d.OHLC", Base, {
		//	summary:
		//		A plot that represents typical open/high/low/close (financial reporting, primarily).
		//		Unlike most charts, the Candlestick expects data points to be represented by
		//		an object of the form { x?, open, close, high, low, mid? }, where both
		//		x and mid are optional parameters.  If x is not provided, the index of the
		//		data array is used.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	2,		// gap between columns in pixels
			animate: null	// animate chart to place
		},
		optionalParams: {
			minBarSize: 1,	// minimal bar size in pixels
			maxBarSize: 1,	// maximal bar size in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a candlestick chart.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		collectStats: function(series){
			//	summary:
			//		Collect all statistics for drawing this chart.  Since the common
			//		functionality only assumes x and y, OHLC must create it's own
			//		stats (since data has no y value, but open/close/high/low instead).
			//	series: dojox.charting.Series[]
			//		The data series array to be drawn on this plot.
			//	returns: Object
			//		Returns an object in the form of { hmin, hmax, vmin, vmax }.

			//	we have to roll our own, since we need to use all four passed
			//	values to figure out our stats, and common only assumes x and y.
			var stats = lang.delegate(dc.defaultStats);
			for(var i=0; i<series.length; i++){
				var run = series[i];
				if(!run.data.length){ continue; }
				var old_vmin = stats.vmin, old_vmax = stats.vmax;
				if(!("ymin" in run) || !("ymax" in run)){
					arr.forEach(run.data, function(val, idx){
						if(val !== null){
							var x = val.x || idx + 1;
							stats.hmin = Math.min(stats.hmin, x);
							stats.hmax = Math.max(stats.hmax, x);
							stats.vmin = Math.min(stats.vmin, val.open, val.close, val.high, val.low);
							stats.vmax = Math.max(stats.vmax, val.open, val.close, val.high, val.low);
						}
					});
				}
				if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
				if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
			}
			return stats;
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = this.collectStats(this.series);
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.OHLC
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("candlestick", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						var finalTheme = t.addMixin(theme, "candlestick", v, true);

						//	calculate the points we need for OHLC
						var x = ht(v.x || (j+0.5)) + offsets.l + gap,
							y = dim.height - offsets.b,
							open = vt(v.open),
							close = vt(v.close),
							high = vt(v.high),
							low = vt(v.low);
						if(low > high){
							var tmp = high;
							high = low;
							low = tmp;
						}

						if(width >= 1){
							var hl = {x1: width/2, x2: width/2, y1: y - high, y2: y - low},
								op = {x1: 0, x2: ((width/2) + ((finalTheme.series.stroke.width||1)/2)), y1: y-open, y2: y-open},
								cl = {x1: ((width/2) - ((finalTheme.series.stroke.width||1)/2)), x2: width, y1: y-close, y2: y-close};
							var shape = s.createGroup();
							shape.setTransform({dx: x, dy: 0});
							var inner = shape.createGroup();
							inner.createLine(hl).setStroke(finalTheme.series.stroke);
							inner.createLine(op).setStroke(finalTheme.series.stroke);
							inner.createLine(cl).setStroke(finalTheme.series.stroke);

							//	TODO: double check this.
							run.dyn.stroke = finalTheme.series.stroke;
							if(events){
								var o = {
									element: "candlestick",
									index:   j,
									run:     run,
									shape:	 inner,
									x:       x,
									y:       y-Math.max(open, close),
									cx:		 width/2,
									cy:		 (y-Math.max(open, close)) + (Math.max(open > close ? open-close : close-open, 1)/2),
									width:	 width,
									height:  Math.max(open > close ? open-close : close-open, 1),
									data:	 v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
						}
						if(this.animate){
							this._animateOHLC(shape, y - low, high - low);
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.OHLC
		},
		_animateOHLC: function(shape, voffset, vsize){
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, voffset - (voffset/vsize)], end: [0, 0]},
					{name: "scale", start: [1, 1/vsize], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});

},
'dojox/charting/themes/CubanShirts':function(){
define("dojox/charting/themes/CubanShirts", ["../Theme", "./common"], function(Theme, themes){

	//	notes: colors generated by moving in 30 degree increments around the hue circle,
	//		at 90% saturation, using a B value of 75 (HSB model).
	themes.CubanShirts=new Theme({
		colors: [
			"#d42d2a",
			"#004f80",
			"#989736",
			"#2085c7",
			"#7f7f33"
		]
	});
	
	return themes.CubanShirts;
});

},
'dojox/gfx3d/object':function(){
define("dojox/gfx3d/object", [
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojox/gfx",
	"dojox/gfx/matrix",
	"./_base",
	"./scheduler",
	"./gradient",
	"./vector",
	"./matrix",
	"./lighting"
], function(arrayUtil,declare,lang,gfx,matrixUtil2d,gfx3d,schedulerExtensions,Gradient,VectorUtil,matrixUtil,lightUtil){

var scheduler = schedulerExtensions.scheduler;
	
// FIXME: why the "out" var here?
var out = function(o, x){
	if(arguments.length > 1){
		// console.debug("debug:", o);
		o = x;
	}
	var e = {};
	for(var i in o){
		if(i in e){ continue; }
		// console.debug("debug:", i, typeof o[i], o[i]);
	}
};

declare("dojox.gfx3d.Object", null, {
	constructor: function(){
		// summary: a Object object, which knows how to map
		// 3D objects to 2D shapes.

		// object: Object: an abstract Object object
		// (see dojox.gfx3d.defaultEdges,
		// dojox.gfx3d.defaultTriangles,
		// dojox.gfx3d.defaultQuads
		// dojox.gfx3d.defaultOrbit
		// dojox.gfx3d.defaultCube
		// or dojox.gfx3d.defaultCylinder)
		this.object = null;

		// matrix: dojox.gfx3d.matrix: world transform
		this.matrix = null;
		// cache: buffer for intermediate result, used late for draw()
		this.cache = null;
		// renderer: a reference for the Viewport
		this.renderer = null;
		// parent: a reference for parent, Scene or Viewport object
		this.parent = null;

		// strokeStyle: Object: a stroke object
		this.strokeStyle = null;
		// fillStyle: Object: a fill object or texture object
		this.fillStyle = null;
		// shape: dojox.gfx.Shape: an underlying 2D shape
		this.shape = null;
	},

	setObject: function(newObject){
		// summary: sets a Object object
		// object: Object: an abstract Object object
		// (see dojox.gfx3d.defaultEdges,
		// dojox.gfx3d.defaultTriangles,
		// dojox.gfx3d.defaultQuads
		// dojox.gfx3d.defaultOrbit
		// dojox.gfx3d.defaultCube
		// or dojox.gfx3d.defaultCylinder)
		this.object = gfx.makeParameters(this.object, newObject);
		return this;
	},

	setTransform: function(matrix){
		// summary: sets a transformation matrix
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		this.matrix = matrixUtil.clone(matrix ? matrixUtil.normalize(matrix) : gfx3d.identity, true);
		return this;	// self
	},

	// apply left & right transformation
	
	applyRightTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on right side
		//	(this.matrix * matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},
	applyLeftTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on left side
		//	(matrix * this.matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([matrix, this.matrix]) : this;	// self
	},

	applyTransform: function(matrix){
		// summary: a shortcut for dojox.gfx.Shape.applyRightTransform
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},
	
	setFill: function(fill){
		// summary: sets a fill object
		// (the default implementation is to delegate to
		// the underlying 2D shape).
		// fill: Object: a fill object
		//	(see dojox.gfx.defaultLinearGradient,
		//	dojox.gfx.defaultRadialGradient,
		//	dojox.gfx.defaultPattern,
		//	dojo.Color
		//	or dojox.gfx.MODEL)
		this.fillStyle = fill;
		return this;
	},

	setStroke: function(stroke){
		// summary: sets a stroke object
		//	(the default implementation simply ignores it)
		// stroke: Object: a stroke object
		//	(see dojox.gfx.defaultStroke)
		this.strokeStyle = stroke;
		return this;
	},

	toStdFill: function(lighting, normal){
		return (this.fillStyle && typeof this.fillStyle['type'] != "undefined") ? 
			lighting[this.fillStyle.type](normal, this.fillStyle.finish, this.fillStyle.color)
			: this.fillStyle;
	},

	invalidate: function(){
		this.renderer.addTodo(this);
	},
	
	destroy: function(){
		if(this.shape){
			var p = this.shape.getParent();
			if(p){
				p.remove(this.shape);
			}
			this.shape = null;
		}
	},

	// All the 3D objects need to override the following virtual functions:
	// render, getZOrder, getOutline, draw, redraw if necessary.

	render: function(camera){
		throw "Pure virtual function, not implemented";
	},

	draw: function(lighting){
		throw "Pure virtual function, not implemented";
	},

	getZOrder: function(){
		return 0;
	},

	getOutline: function(){
		return null;
	}

});

declare("dojox.gfx3d.Scene", gfx3d.Object, {
	// summary: the Scene is just a containter.
	// note: we have the following assumption:
	// all objects in the Scene are not overlapped with other objects
	// outside of the scene.
	constructor: function(){
		// summary: a containter of other 3D objects
		this.objects= [];
		this.todos = [];
		this.schedule = scheduler.zOrder;
		this._draw = gfx3d.drawer.conservative;
	},

	setFill: function(fill){
		this.fillStyle = fill;
		arrayUtil.forEach(this.objects, function(item){
			item.setFill(fill);
		});
		return this;
	},

	setStroke: function(stroke){
		this.strokeStyle = stroke;
		arrayUtil.forEach(this.objects, function(item){
			item.setStroke(stroke);
		});
		return this;
	},

	render: function(camera, deep){
		var m = matrixUtil.multiply(camera, this.matrix);
		if(deep){
			this.todos = this.objects;
		}
		arrayUtil.forEach(this.todos, function(item){ item.render(m, deep); });
	},

	draw: function(lighting){
		this.objects = this.schedule(this.objects);
		this._draw(this.todos, this.objects, this.renderer);
	},

	addTodo: function(newObject){
		// FIXME: use indexOf?
		if(arrayUtil.every(this.todos, function(item){ return item != newObject; })){
			this.todos.push(newObject);
			this.invalidate();
		}
	},

	invalidate: function(){
		this.parent.addTodo(this);
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.objects, function(item){ zOrder += item.getZOrder(); });
		return (this.objects.length > 1) ?  zOrder / this.objects.length : 0;
	}
});


declare("dojox.gfx3d.Edges", gfx3d.Object, {
	constructor: function(){
		// summary: a generic edge in 3D viewport
		this.object = lang.clone(gfx3d.defaultEdges);
	},

	setObject: function(newObject, /* String, optional */ style){
		// summary: setup the object
		// newObject: Array of points || Object
		// style: String, optional
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? { points: newObject, style: style } : newObject);
		return this;
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.cache, function(item){ zOrder += item.z;} );
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		this.cache = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
	},

	draw: function(){
		var c = this.cache;
		if(this.shape){
			this.shape.setShape("")
		}else{
			this.shape = this.renderer.createPath();
		}
		var p = this.shape.setAbsoluteMode("absolute");

		if(this.object.style == "strip" || this.object.style == "loop"){
			p.moveTo(c[0].x, c[0].y);
			arrayUtil.forEach(c.slice(1), function(item){
				p.lineTo(item.x, item.y);
			});
			if(this.object.style == "loop"){
				p.closePath();
			}
		}else{
			for(var i = 0; i < this.cache.length; ){
				p.moveTo(c[i].x, c[i].y);
				i ++;
				p.lineTo(c[i].x, c[i].y);
				i ++;
			}
		}
		// FIXME: doe setFill make sense here?
		p.setStroke(this.strokeStyle);
	}
});

declare("dojox.gfx3d.Orbit", gfx3d.Object, {
	constructor: function(){
		// summary: a generic edge in 3D viewport
		this.object = lang.clone(gfx3d.defaultOrbit);
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		var angles = [0, Math.PI/4, Math.PI/3];
		var center = matrixUtil.multiplyPoint(m, this.object.center);
		var marks = arrayUtil.map(angles, function(item){
			return {x: this.center.x + this.radius * Math.cos(item),
				y: this.center.y + this.radius * Math.sin(item), z: this.center.z};
			}, this.object);

		marks = arrayUtil.map(marks, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});

		var normal = VectorUtil.normalize(marks);

		marks = arrayUtil.map(marks, function(item){
			return VectorUtil.substract(item, center);
		});

		// Use the algorithm here:
		// http://www.3dsoftware.com/Math/PlaneCurves/EllipseAlgebra/
		// After we normalize the marks, the equation is:
		// a x^2 + 2b xy + cy^2 + f = 0: let a = 1
		//  so the final equation is:
		//  [ xy, y^2, 1] * [2b, c, f]' = [ -x^2 ]'

		var A = {
			xx: marks[0].x * marks[0].y, xy: marks[0].y * marks[0].y, xz: 1,
			yx: marks[1].x * marks[1].y, yy: marks[1].y * marks[1].y, yz: 1,
			zx: marks[2].x * marks[2].y, zy: marks[2].y * marks[2].y, zz: 1,
			dx: 0, dy: 0, dz: 0
		};
		var B = arrayUtil.map(marks, function(item){
			return -Math.pow(item.x, 2);
		});

		// X is 2b, c, f
		var X = matrixUtil.multiplyPoint(matrixUtil.invert(A),B[0], B[1], B[2]);
		var theta = Math.atan2(X.x, 1 - X.y) / 2;

		// rotate the marks back to the canonical form
		var probes = arrayUtil.map(marks, function(item){
			return matrixUtil2d.multiplyPoint(matrixUtil2d.rotate(-theta), item.x, item.y);
		});

		// we are solving the equation: Ax = b
		// A = [x^2, y^2] X = [1/a^2, 1/b^2]', b = [1, 1]'
		// so rx = Math.sqrt(1/ ( inv(A)[1:] * b ) );
		// so ry = Math.sqrt(1/ ( inv(A)[2:] * b ) );

		var a = Math.pow(probes[0].x, 2);
		var b = Math.pow(probes[0].y, 2);
		var c = Math.pow(probes[1].x, 2);
		var d = Math.pow(probes[1].y, 2);

		// the invert matrix is
		// 1/(ad -bc) [ d, -b; -c, a];
		var rx = Math.sqrt( (a*d - b*c)/ (d-b) );
		var ry = Math.sqrt( (a*d - b*c)/ (a-c) );

		this.cache = {cx: center.x, cy: center.y, rx: rx, ry: ry, theta: theta, normal: normal};
	},

	draw: function(lighting){
		if(this.shape){
			this.shape.setShape(this.cache);
		} else {
			this.shape = this.renderer.createEllipse(this.cache);
		}
		this.shape.applyTransform(matrixUtil2d.rotateAt(this.cache.theta, this.cache.cx, this.cache.cy))
			.setStroke(this.strokeStyle)
			.setFill(this.toStdFill(lighting, this.cache.normal));
	}
});

declare("dojox.gfx3d.Path3d", gfx3d.Object, {
	// This object is still very immature !
	constructor: function(){
		// summary: a generic line
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultPath3d);
		this.segments = [];
		this.absolute = true;
		this.last = {};
		this.path = "";
	},

	_collectArgs: function(array, args){
		// summary: converts an array of arguments to plain numeric values
		// array: Array: an output argument (array of numbers)
		// args: Array: an input argument (can be values of Boolean, Number, dojox.gfx.Point, or an embedded array of them)
		for(var i = 0; i < args.length; ++i){
			var t = args[i];
			if(typeof(t) == "boolean"){
				array.push(t ? 1 : 0);
			}else if(typeof(t) == "number"){
				array.push(t);
			}else if(t instanceof Array){
				this._collectArgs(array, t);
			}else if("x" in t && "y" in t){
				array.push(t.x);
				array.push(t.y);
			}
		}
	},

	// a dictionary, which maps segment type codes to a number of their argemnts
	_validSegments: {m: 3, l: 3,  z: 0},

	_pushSegment: function(action, args){
		// summary: adds a segment
		// action: String: valid SVG code for a segment's type
		// args: Array: a list of parameters for this segment
		var group = this._validSegments[action.toLowerCase()], segment;
		if(typeof(group) == "number"){
			if(group){
				if(args.length >= group){
					segment = {action: action, args: args.slice(0, args.length - args.length % group)};
					this.segments.push(segment);
				}
			}else{
				segment = {action: action, args: []};
				this.segments.push(segment);
			}
		}
	},

	moveTo: function(){
		// summary: formes a move segment
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "M" : "m", args);
		return this; // self
	},
	lineTo: function(){
		// summary: formes a line segment
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "L" : "l", args);
		return this; // self
	},

	closePath: function(){
		// summary: closes a path
		this._pushSegment("Z", []);
		return this; // self
	},

	render: function(camera){
		// TODO: we need to get the ancestors' matrix
		var m = matrixUtil.multiply(camera, this.matrix);
		// iterate all the segments and convert them to 2D canvas
		// TODO consider the relative mode
		var path = ""
		var _validSegments = this._validSegments;
		arrayUtil.forEach(this.segments, function(item){
			path += item.action;
			for(var i = 0; i < item.args.length; i+= _validSegments[item.action.toLowerCase()] ){
				var pt = matrixUtil.multiplyPoint(m, item.args[i], item.args[i+1], item.args[i+2])
				path += " " + pt.x + " " + pt.y;
			}
		});

		this.cache =  path;
	},

	_draw: function(){
		return this.parent.createPath(this.cache);
	}
});

declare("dojox.gfx3d.Triangles", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultTriangles);
	},

	setObject: function(newObject, /* String, optional */ style){
		// summary: setup the object
		// newObject: Array of points || Object
		// style: String, optional
		if(newObject instanceof Array){
			this.object = gfx.makeParameters(this.object, { points: newObject, style: style } );
		} else {
			this.object = gfx.makeParameters(this.object, newObject);
		}
		return this;
	},
	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		var c = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		this.cache = [];
		var pool = c.slice(0, 2);
		var center = c[0];
		if(this.object.style == "strip"){
			arrayUtil.forEach(c.slice(2), function(item){
				pool.push(item);
				pool.push(pool[0]);
				this.cache.push(pool);
				pool = pool.slice(1, 3);
			}, this);
		} else if(this.object.style == "fan"){
			arrayUtil.forEach(c.slice(2), function(item){
				pool.push(item);
				pool.push(center);
				this.cache.push(pool);
				pool = [center, item];
			}, this);
		} else {
			for(var i = 0; i < c.length; ){
				this.cache.push( [ c[i], c[i+1], c[i+2], c[i] ]);
				i += 3;
			}
		}
	},

	draw: function(lighting){
		// use the BSP to schedule
		this.cache = scheduler.bsp(this.cache, function(it){  return it; });
		if(this.shape){
			this.shape.clear();
		} else {
			this.shape = this.renderer.createGroup();
		}
		arrayUtil.forEach(this.cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(item)));
		}, this);
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.cache, function(item){
				zOrder += (item[0].z + item[1].z + item[2].z) / 3; });
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	}
});

declare("dojox.gfx3d.Quads", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultQuads);
	},

	setObject: function(newObject, /* String, optional */ style){
		// summary: setup the object
		// newObject: Array of points || Object
		// style: String, optional
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? 
			{ points: newObject, style: style } 
				: newObject );
		return this;
	},
	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix), i;
		var c = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		this.cache = [];
		if(this.object.style == "strip"){
			var pool = c.slice(0, 2);
			for(i = 2; i < c.length; ){
				pool = pool.concat( [ c[i], c[i+1], pool[0] ] );
				this.cache.push(pool);
				pool = pool.slice(2,4);
				i += 2;
			}
		}else{
			for(i = 0; i < c.length; ){
				this.cache.push( [c[i], c[i+1], c[i+2], c[i+3], c[i] ] );
				i += 4;
			}
		}
	},

	draw: function(lighting){
		// use the BSP to schedule
		this.cache = gfx3d.scheduler.bsp(this.cache, function(it){  return it; });
		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			this.shape.createPolyline(this.cache[x])
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(this.cache[x])));
		}
		/*
		dojo.forEach(this.cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, dojox.gfx3d.vector.normalize(item)));
		}, this);
		*/
	},

	getZOrder: function(){
		var zOrder = 0;
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			var i = this.cache[x];
			zOrder += (i[0].z + i[1].z + i[2].z + i[3].z) / 4;
		}
		/*
		dojo.forEach(this.cache, function(item){
				zOrder += (item[0].z + item[1].z + item[2].z + item[3].z) / 4; });
		*/
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	}
});

declare("dojox.gfx3d.Polygon", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultPolygon);
	},

	setObject: function(newObject){
		// summary: setup the object
		// newObject: Array of points || Object
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? {path: newObject} : newObject)
		return this;
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		this.cache = arrayUtil.map(this.object.path, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		// add the first point to close the polyline
		this.cache.push(this.cache[0]);
	},

	draw: function(lighting){
		if(this.shape){
			this.shape.setShape({points: this.cache});
		}else{
			this.shape = this.renderer.createPolyline({points: this.cache});
		}

		this.shape.setStroke(this.strokeStyle)
			.setFill(this.toStdFill(lighting, matrixUtil.normalize(this.cache)));
	},

	getZOrder: function(){
		var zOrder = 0;
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			zOrder += this.cache[x].z;
		}
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	},

	getOutline: function(){
		return this.cache.slice(0, 3);
	}
});

declare("dojox.gfx3d.Cube", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultCube);
		this.polygons = [];
	},

	setObject: function(newObject){
		// summary: setup the object
		// newObject: Array of points || Object
		this.object = gfx.makeParameters(this.object, newObject);
	},

	render: function(camera){
		// parse the top, bottom to get 6 polygons:
		var a = this.object.top;
		var g = this.object.bottom;
		var b = {x: g.x, y: a.y, z: a.z};
		var c = {x: g.x, y: g.y, z: a.z};
		var d = {x: a.x, y: g.y, z: a.z};
		var e = {x: a.x, y: a.y, z: g.z};
		var f = {x: g.x, y: a.y, z: g.z};
		var h = {x: a.x, y: g.y, z: g.z};
		var polygons = [a, b, c, d, e, f, g, h];
		var m = matrixUtil.multiply(camera, this.matrix);
		var p = arrayUtil.map(polygons, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		a = p[0]; b = p[1]; c = p[2]; d = p[3]; e = p[4]; f = p[5]; g = p[6]; h = p[7];
		this.cache = [[a, b, c, d, a], [e, f, g, h, e], [a, d, h, e, a], [d, c, g, h, d], [c, b, f, g, c], [b, a, e, f, b]];
	},

	draw: function(lighting){
		// use bsp to sort.
		this.cache = gfx3d.scheduler.bsp(this.cache, function(it){ return it; });
		// only the last 3 polys are visible.
		var cache = this.cache.slice(3);

		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		for(var x=0; x<cache.length; x++){
			this.shape.createPolyline(cache[x])
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(cache[x])));
		}
		/*
		dojo.forEach(cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, dojox.gfx3d.vector.normalize(item)));
		}, this);
		*/
	},

	getZOrder: function(){
		var top = this.cache[0][0];
		var bottom = this.cache[1][2];
		return (top.z + bottom.z) / 2;
	}
});


declare("dojox.gfx3d.Cylinder", gfx3d.Object, {
	constructor: function(){
		this.object = lang.clone(gfx3d.defaultCylinder);
	},

	render: function(camera){
		// get the bottom surface first
		var m = matrixUtil.multiply(camera, this.matrix);
		var angles = [0, Math.PI/4, Math.PI/3];
		var center = matrixUtil.multiplyPoint(m, this.object.center);
		var marks = arrayUtil.map(angles, function(item){
			return {x: this.center.x + this.radius * Math.cos(item),
				y: this.center.y + this.radius * Math.sin(item), z: this.center.z};
			}, this.object);

		marks = arrayUtil.map(marks, function(item){
			return VectorUtil.substract(matrixUtil.multiplyPoint(m, item), center);
		});

		// Use the algorithm here:
		// http://www.3dsoftware.com/Math/PlaneCurves/EllipseAlgebra/
		// After we normalize the marks, the equation is:
		// a x^2 + 2b xy + cy^2 + f = 0: let a = 1
		//  so the final equation is:
		//  [ xy, y^2, 1] * [2b, c, f]' = [ -x^2 ]'

		var A = {
			xx: marks[0].x * marks[0].y, xy: marks[0].y * marks[0].y, xz: 1,
			yx: marks[1].x * marks[1].y, yy: marks[1].y * marks[1].y, yz: 1,
			zx: marks[2].x * marks[2].y, zy: marks[2].y * marks[2].y, zz: 1,
			dx: 0, dy: 0, dz: 0
		};
		var B = arrayUtil.map(marks, function(item){
			return -Math.pow(item.x, 2);
		});

		// X is 2b, c, f
		var X = matrixUtil.multiplyPoint(matrixUtil.invert(A), B[0], B[1], B[2]);
		var theta = Math.atan2(X.x, 1 - X.y) / 2;

		// rotate the marks back to the canonical form
		var probes = arrayUtil.map(marks, function(item){
			return matrixUtil2d.multiplyPoint(matrixUtil2d.rotate(-theta), item.x, item.y);
		});

		// we are solving the equation: Ax = b
		// A = [x^2, y^2] X = [1/a^2, 1/b^2]', b = [1, 1]'
		// so rx = Math.sqrt(1/ ( inv(A)[1:] * b ) );
		// so ry = Math.sqrt(1/ ( inv(A)[2:] * b ) );

		var a = Math.pow(probes[0].x, 2);
		var b = Math.pow(probes[0].y, 2);
		var c = Math.pow(probes[1].x, 2);
		var d = Math.pow(probes[1].y, 2);

		// the invert matrix is
		// 1/(ad - bc) [ d, -b; -c, a];
		var rx = Math.sqrt((a * d - b * c) / (d - b));
		var ry = Math.sqrt((a * d - b * c) / (a - c));
		if(rx < ry){
			var t = rx;
			rx = ry;
			ry = t;
			theta -= Math.PI/2;
		}

		var top = matrixUtil.multiplyPoint(m,
			VectorUtil.sum(this.object.center, {x: 0, y:0, z: this.object.height}));

		var gradient = this.fillStyle.type == "constant" ? this.fillStyle.color
			: Gradient(this.renderer.lighting, this.fillStyle, this.object.center, this.object.radius, Math.PI, 2 * Math.PI, m);
		if(isNaN(rx) || isNaN(ry) || isNaN(theta)){
			// in case the cap is invisible (parallel to the incident vector)
			rx = this.object.radius, ry = 0, theta = 0;
		}
		this.cache = {center: center, top: top, rx: rx, ry: ry, theta: theta, gradient: gradient};
	},

	draw: function(){
		var c = this.cache, v = VectorUtil, m = matrixUtil2d,
			centers = [c.center, c.top], normal = v.substract(c.top, c.center);
		if(v.dotProduct(normal, this.renderer.lighting.incident) > 0){
			centers = [c.top, c.center];
			normal = v.substract(c.center, c.top);
		}

		var color = this.renderer.lighting[this.fillStyle.type](normal, this.fillStyle.finish, this.fillStyle.color),
			d = Math.sqrt( Math.pow(c.center.x - c.top.x, 2) + Math.pow(c.center.y - c.top.y, 2) );

		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		
		this.shape.createPath("")
			.moveTo(0, -c.rx)
			.lineTo(d, -c.rx)
			.lineTo(d, c.rx)
			.lineTo(0, c.rx)
			.arcTo(c.ry, c.rx, 0, true, true, 0, -c.rx)
			.setFill(c.gradient).setStroke(this.strokeStyle)
			.setTransform([m.translate(centers[0]),
				m.rotate(Math.atan2(centers[1].y - centers[0].y, centers[1].x - centers[0].x))]);

		if(c.rx > 0 && c.ry > 0){
			this.shape.createEllipse({cx: centers[1].x, cy: centers[1].y, rx: c.rx, ry: c.ry})
				.setFill(color).setStroke(this.strokeStyle)
				.applyTransform(m.rotateAt(c.theta, centers[1]));
		}
	}
});


// the ultimate container of 3D world
declare("dojox.gfx3d.Viewport", gfx.Group, {
	constructor: function(){
		// summary: a viewport/container for 3D objects, which knows
		// the camera and lightings

		// matrix: dojox.gfx3d.matrix: world transform
		// dimension: Object: the dimension of the canvas
		this.dimension = null;

		// objects: Array: all 3d Objects
		this.objects = [];
		// todos: Array: all 3d Objects that needs to redraw
		this.todos = [];

		// FIXME: memory leak?
		this.renderer = this;
		// Using zOrder as the default scheduler
		this.schedule = gfx3d.scheduler.zOrder;
		this.draw = gfx3d.drawer.conservative;
		// deep: boolean, true means the whole viewport needs to re-render, redraw
		this.deep = false;

		// lights: Array: an array of light objects
		this.lights = [];
		this.lighting = null;
	},

	setCameraTransform: function(matrix){
		// summary: sets a transformation matrix
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		this.camera = matrixUtil.clone(matrix ? matrixUtil.normalize(matrix) : gfx3d.identity, true);
		this.invalidate();
		return this;	// self
	},

	applyCameraRightTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on right side
		//	(this.matrix * matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setCameraTransform([this.camera, matrix]) : this;	// self
	},

	applyCameraLeftTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on left side
		//	(matrix * this.matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setCameraTransform([matrix, this.camera]) : this;	// self
	},

	applyCameraTransform: function(matrix){
		// summary: a shortcut for dojox.gfx3d.Object.applyRightTransform
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return this.applyCameraRightTransform(matrix); // self
	},

	setLights: function(/* Array || Object */lights, /* Color, optional */ ambient,
		/* Color, optional */ specular){
		// summary: set the lights
		// lights: Array: an array of light object
		// or lights object
		// ambient: Color: an ambient object
		// specular: Color: an specular object
		this.lights = (lights instanceof Array) ? 
			{sources: lights, ambient: ambient, specular: specular}
				: lights;
		var view = {x: 0, y: 0, z: 1};

		this.lighting = new lightUtil.Model(view, this.lights.sources,
				this.lights.ambient, this.lights.specular);
		this.invalidate();
		return this;
	},

	addLights: function(lights){
		// summary: add new light/lights to the viewport.
		// lights: Array || light object: light object(s)
		return this.setLights(this.lights.sources.concat(lights));
	},

	addTodo: function(newObject){
		// NOTE: Viewport implements almost the same addTodo,
		// except calling invalidate, since invalidate is used as
		// any modification needs to redraw the object itself, call invalidate.
		// then call render.
		if(arrayUtil.every(this.todos,
			function(item){
				return item != newObject;
			}
		)){
			this.todos.push(newObject);
		}
	},

	invalidate: function(){
		this.deep = true;
		this.todos = this.objects;
	},

	setDimensions: function(dim){
		if(dim){
			var w = lang.isString(dim.width) ? parseInt(dim.width)  : dim.width;
			var h = lang.isString(dim.height) ? parseInt(dim.height) : dim.height;
			// there is no rawNode in canvas GFX implementation
			if(this.rawNode){
				var trs = this.rawNode.style;
				trs.height = h;
				trs.width = w;
			}
			this.dimension = {
				width:  w,
				height: h
			};
		}else{
			this.dimension = null;
		}
	},

	render: function(){
		// summary: iterate all children and call their render callback function.
		if(!this.todos.length){ return; }
		// console.debug("Viewport::render");
		var m = matrixUtil;
		
		// Iterate the todos and call render to prepare the rendering:
		for(var x=0; x<this.todos.length; x++){
			this.todos[x].render(matrixUtil.normalize([
				m.cameraRotateXg(180),
				m.cameraTranslate(0, this.dimension.height, 0),
				this.camera
			]), this.deep);
		}

		this.objects = this.schedule(this.objects);
		this.draw(this.todos, this.objects, this);
		this.todos = [];
		this.deep = false;
	}

});

//FIXME: Viewport cannot masquerade as a Group
gfx3d.Viewport.nodeType = gfx.Group.nodeType;

gfx3d._creators = {
	// summary: object creators
	createEdges: function(edges, style){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Edges, edges, style);	// dojox.gfx3d.Edge
	},
	createTriangles: function(tris, style){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Triangles, tris, style);	// dojox.gfx3d.Edge
	},
	createQuads: function(quads, style){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Quads, quads, style);	// dojox.gfx3d.Edge
	},
	createPolygon: function(points){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Polygon, points);	// dojox.gfx3d.Polygon
	},

	createOrbit: function(orbit){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Orbit, orbit);	// dojox.gfx3d.Cube
	},

	createCube: function(cube){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Cube, cube);	// dojox.gfx3d.Cube
	},

	createCylinder: function(cylinder){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Cylinder, cylinder);	// dojox.gfx3d.Cube
	},

	createPath3d: function(path){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Path3d, path);	// dojox.gfx3d.Edge
	},
	createScene: function(){
		// summary: creates an triangle object
		// line: Object: a triangle object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Scene);	// dojox.gfx3d.Scene
	},

	create3DObject: function(objectType, rawObject, style){
		// summary: creates an instance of the passed shapeType class
		// shapeType: Function: a class constructor to create an instance of
		// rawShape: Object: properties to be passed in to the classes "setShape" method
		var obj = new objectType();
		this.adopt(obj);
		if(rawObject){ obj.setObject(rawObject, style); }
		return obj;	// dojox.gfx3d.Object
	},
	// todo : override the add/remove if necessary
	adopt: function(obj){
		// summary: adds a shape to the list
		// shape: dojox.gfx.Shape: a shape
		obj.renderer = this.renderer; // obj._setParent(this, null); more TODOs HERER?
		obj.parent = this;
		this.objects.push(obj);
		this.addTodo(obj);
		return this;
	},
	abandon: function(obj, silently){
		// summary: removes a shape from the list
		// silently: Boolean?: if true, do not redraw a picture yet
		for(var i = 0; i < this.objects.length; ++i){
			if(this.objects[i] == obj){
				this.objects.splice(i, 1);
			}
		}
		// if(this.rawNode == shape.rawNode.parentNode){
		//	this.rawNode.removeChild(shape.rawNode);
		// }
		// obj._setParent(null, null);
		obj.parent = null;
		return this;	// self
	},


	setScheduler: function(scheduler){
		this.schedule = scheduler;
	},

	setDrawer: function(drawer){
		this.draw = drawer;
	}
};

lang.extend(gfx3d.Viewport, gfx3d._creators);
lang.extend(gfx3d.Scene, gfx3d._creators);
delete gfx3d._creators;


//FIXME: extending dojox.gfx.Surface and masquerading Viewport as Group is hacky!

// Add createViewport to dojox.gfx.Surface
lang.extend(gfx.Surface, {
	createViewport: function(){
		//FIXME: createObject is non-public method!
		var viewport = this.createObject(gfx3d.Viewport, null, true);
		//FIXME: this may not work with dojox.gfx.Group !!
		viewport.setDimensions(this.getDimensions());
		return viewport;
	}
});

	return gfx3d.Object;
});

},
'dijit/form/_ButtonMixin':function(){
define("dijit/form/_ButtonMixin", [
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.setSelectable
	"dojo/_base/event", // event.stop
	"../registry"		// registry.byNode
], function(declare, dom, event, registry){

// module:
//		dijit/form/_ButtonMixin
// summary:
//		A mixin to add a thin standard API wrapper to a normal HTML button

return declare("dijit.form._ButtonMixin", null, {
	// summary:
	//		A mixin to add a thin standard API wrapper to a normal HTML button
	// description:
	//		A label should always be specified (through innerHTML) or the label attribute.
	//		Attach points:
	//			focusNode (required): this node receives focus
	//			valueNode (optional): this node's value gets submitted with FORM elements
	//			containerNode (optional): this node gets the innerHTML assignment for label
	// example:
	// |	<button data-dojo-type="dijit.form.Button" onClick="...">Hello world</button>
	//
	// example:
	// |	var button1 = new dijit.form.Button({label: "hello world", onClick: foo});
	// |	dojo.body().appendChild(button1.domNode);

	// label: HTML String
	//		Content to display in button.
	label: "",

	// type: [const] String
	//		Type of button (submit, reset, button, checkbox, radio)
	type: "button",

	_onClick: function(/*Event*/ e){
		// summary:
		//		Internal function to handle click actions
		if(this.disabled){
			event.stop(e);
			return false;
		}
		var preventDefault = this.onClick(e) === false; // user click actions
		if(!preventDefault && this.type == "submit" && !(this.valueNode||this.focusNode).form){ // see if a non-form widget needs to be signalled
			for(var node=this.domNode; node.parentNode; node=node.parentNode){
				var widget=registry.byNode(node);
				if(widget && typeof widget._onSubmit == "function"){
					widget._onSubmit(e);
					preventDefault = true;
					break;
				}
			}
		}
		if(preventDefault){
			e.preventDefault();
		}
		return !preventDefault;
	},

	postCreate: function(){
		this.inherited(arguments);
		dom.setSelectable(this.focusNode, false);
	},

	onClick: function(/*Event*/ /*===== e =====*/){
		// summary:
		//		Callback for when button is clicked.
		//		If type="submit", return true to perform submit, or false to cancel it.
		// type:
		//		callback
		return true;		// Boolean
	},

	_setLabelAttr: function(/*String*/ content){
		// summary:
		//		Hook for set('label', ...) to work.
		// description:
		//		Set the label (text) of the button; takes an HTML string.
		this._set("label", content);
		(this.containerNode||this.focusNode).innerHTML = content;
	}
});

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
'dojox/charting/themes/gradientGenerator':function(){
define("dojox/charting/themes/gradientGenerator", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/Color", "../Theme", "dojox/color/_base", "./common"], 
	function(lang, arr, Color, Theme, dxcolor, themes){
	
	var gg = lang.getObject("gradientGenerator", true, themes);

	gg.generateFills = function(colors, fillPattern, lumFrom, lumTo){
		//	summary:
		//		generates 2-color gradients using pure colors, a fill pattern, and two luminance values
		//	colors: Array:
		//		Array of colors to generate gradients for each.
		//	fillPattern: Object:
		//		Gradient fill descriptor which colors list will be generated.
		//	lumFrom: Number:
		//		Initial luminance value (0-100).
		//	lumTo: Number:
		//		Final luminance value (0-100).
		return arr.map(colors, function(c){	// Array
			return Theme.generateHslGradient(c, fillPattern, lumFrom, lumTo);
		});
	};
	
	gg.updateFills = function(themes, fillPattern, lumFrom, lumTo){
		//	summary:
		//		transforms solid color fills into 2-color gradients using a fill pattern, and two luminance values
		//	themes: Array:
		//		Array of mini-themes (usually series themes or marker themes), which fill will be transformed.
		//	fillPattern: Object:
		//		Gradient fill descriptor which colors list will be generated.
		//	lumFrom: Number:
		//		Initial luminance value (0-100).
		//	lumTo: Number:
		//		Final luminance value (0-100).
		arr.forEach(themes, function(t){
			if(t.fill && !t.fill.type){
				t.fill = Theme.generateHslGradient(t.fill, fillPattern, lumFrom, lumTo);
			}
		});
	};
	
	gg.generateMiniTheme = function(colors, fillPattern, lumFrom, lumTo, lumStroke){
		//	summary:
		//		generates mini-themes with 2-color gradients using colors, a fill pattern, and three luminance values
		//	colors: Array:
		//		Array of colors to generate gradients for each.
		//	fillPattern: Object:
		//		Gradient fill descriptor which colors list will be generated.
		//	lumFrom: Number:
		//		Initial luminance value (0-100).
		//	lumTo: Number:
		//		Final luminance value (0-100).
		//	lumStroke: Number:
		//		Stroke luminance value (0-100).
		return arr.map(colors, function(c){	// Array
			c = new dxcolor.Color(c);
			return {
				fill:   Theme.generateHslGradient(c, fillPattern, lumFrom, lumTo),
				stroke: {color: Theme.generateHslColor(c, lumStroke)}
			}
		});
	};
	
	gg.generateGradientByIntensity = function(color, intensityMap){
		//	summary:
		//		generates gradient colors using an intensity map
		//	color: dojo.Color:
		//		Color to use to generate gradients.
		//	intensityMap: Array:
		//		Array of tuples {o, i}, where o is a gradient offset (0-1),
		//		and i is an intensity (0-255).
		color = new Color(color);
		return arr.map(intensityMap, function(stop){	// Array
			var s = stop.i / 255;
			return {
				offset: stop.o,
				color:  new Color([color.r * s, color.g * s, color.b * s, color.a])
			};
		});
	}
	
	return gg;
});

},
'dojox/charting/themes/Grasslands':function(){
define("dojox/charting/themes/Grasslands", ["../Theme", "./common"], function(Theme, themes){
	
	//	notes: colors generated by moving in 30 degree increments around the hue circle,
	//		at 90% saturation, using a B value of 75 (HSB model).
	themes.Grasslands=new Theme({
		colors: [
			"#70803a",
			"#dde574",
			"#788062",
			"#b1cc5d",
			"#eff2c2"
		]
	});
	
	return themes.Grasslands;
});

},
'dojox/charting/plot2d/Candlesticks':function(){
define("dojox/charting/plot2d/Candlesticks", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "./Base", "./common", 
		"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils", "dojox/gfx/fx"], 
	function(lang, declare, arr, Base, dc, df, dfr, du, fx){
/*=====
var Base = dojox.charting.plot2d.Base;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	//	Candlesticks are based on the Bars plot type; we expect the following passed
	//	as values in a series:
	//	{ x?, open, close, high, low, mid? }
	//	if x is not provided, the array index is used.
	//	failing to provide the OHLC values will throw an error.
	return declare("dojox.charting.plot2d.Candlesticks", Base, {
		//	summary:
		//		A plot that represents typical candlesticks (financial reporting, primarily).
		//		Unlike most charts, the Candlestick expects data points to be represented by
		//		an object of the form { x?, open, close, high, low, mid? }, where both
		//		x and mid are optional parameters.  If x is not provided, the index of the
		//		data array is used.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			gap:	2,		// gap between columns in pixels
			animate: null   // animate bars into place
		},
		optionalParams: {
			minBarSize:	1,	// minimal candle width in pixels
			maxBarSize:	1,	// maximal candle width in pixels
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for a candlestick chart.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__BarCtorArgs?
			//		An optional keyword arguments object to help define the plot.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		collectStats: function(series){
			//	summary:
			//		Collect all statistics for drawing this chart.  Since the common
			//		functionality only assumes x and y, Candlesticks must create it's own
			//		stats (since data has no y value, but open/close/high/low instead).
			//	series: dojox.charting.Series[]
			//		The data series array to be drawn on this plot.
			//	returns: Object
			//		Returns an object in the form of { hmin, hmax, vmin, vmax }.

			//	we have to roll our own, since we need to use all four passed
			//	values to figure out our stats, and common only assumes x and y.
			var stats = lang.delegate(dc.defaultStats);
			for(var i=0; i<series.length; i++){
				var run = series[i];
				if(!run.data.length){ continue; }
				var old_vmin = stats.vmin, old_vmax = stats.vmax;
				if(!("ymin" in run) || !("ymax" in run)){
					arr.forEach(run.data, function(val, idx){
						if(val !== null){
							var x = val.x || idx + 1;
							stats.hmin = Math.min(stats.hmin, x);
							stats.hmax = Math.max(stats.hmax, x);
							stats.vmin = Math.min(stats.vmin, val.open, val.close, val.high, val.low);
							stats.vmax = Math.max(stats.vmax, val.open, val.close, val.high, val.low);
						}
					});
				}
				if("ymin" in run){ stats.vmin = Math.min(old_vmin, run.ymin); }
				if("ymax" in run){ stats.vmax = Math.max(old_vmax, run.ymax); }
			}
			return stats;	//	Object
		},

		getSeriesStats: function(){
			//	summary:
			//		Calculate the min/max on all attached series in both directions.
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			var stats = this.collectStats(this.series);
			stats.hmin -= 0.5;
			stats.hmax += 0.5;
			return stats;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Candlesticks
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt);
			gap = f.gap;
			width = f.size;
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("candlestick", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var v = run.data[j];
					if(v !== null){
						var finalTheme = t.addMixin(theme, "candlestick", v, true);

						//	calculate the points we need for OHLC
						var x = ht(v.x || (j+0.5)) + offsets.l + gap,
							y = dim.height - offsets.b,
							open = vt(v.open),
							close = vt(v.close),
							high = vt(v.high),
							low = vt(v.low);
						if("mid" in v){
							var mid = vt(v.mid);
						}
						if(low > high){
							var tmp = high;
							high = low;
							low = tmp;
						}

						if(width >= 1){
							//	draw the line and rect, set up as a group and pass that to the events.
							var doFill = open > close;
							var line = { x1: width/2, x2: width/2, y1: y - high, y2: y - low },
								rect = {
									x: 0, y: y-Math.max(open, close),
									width: width, height: Math.max(doFill ? open-close : close-open, 1)
								};
							var shape = s.createGroup();
							shape.setTransform({dx: x, dy: 0 });
							var inner = shape.createGroup();
							inner.createLine(line).setStroke(finalTheme.series.stroke);
							inner.createRect(rect).setStroke(finalTheme.series.stroke).
								setFill(doFill ? finalTheme.series.fill : "white");
							if("mid" in v){
								//	add the mid line.
								inner.createLine({
									x1: (finalTheme.series.stroke.width||1), x2: width - (finalTheme.series.stroke.width || 1),
									y1: y - mid, y2: y - mid
								}).setStroke(doFill ? "white" : finalTheme.series.stroke);
							}

							//	TODO: double check this.
							run.dyn.fill   = finalTheme.series.fill;
							run.dyn.stroke = finalTheme.series.stroke;
							if(events){
								var o = {
									element: "candlestick",
									index:   j,
									run:     run,
									shape:   inner,
									x:       x,
									y:       y-Math.max(open, close),
									cx:		 width/2,
									cy:		 (y-Math.max(open, close)) + (Math.max(doFill ? open-close : close-open, 1)/2),
									width:	 width,
									height:  Math.max(doFill ? open-close : close-open, 1),
									data:	 v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
						}
						if(this.animate){
							this._animateCandlesticks(shape, y - low, high - low);
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Candlesticks
		},
		_animateCandlesticks: function(shape, voffset, vsize){
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, voffset - (voffset/vsize)], end: [0, 0]},
					{name: "scale", start: [1, 1/vsize], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});

},
'dojox/charting/action2d/TouchIndicator':function(){
define("dojox/charting/action2d/TouchIndicator", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/event", "./ChartAction", "./_IndicatorElement", "dojox/lang/utils"],
	function(lang, declare, eventUtil, ChartAction, IndicatorElement, du){ 
	
	/*=====
	dojo.declare("dojox.charting.action2d.__TouchIndicatorCtorArgs", null, {
		//	summary:
		//		Additional arguments for Touch indicator.
		
		//	series: String
		//		Target series name for this chart action.
		series:	"",
		
		//	dualIndicator: Boolean? 
		//		Whether a double touch on the chart creates a dual indicator showing data trend between the two touch points. Default is false.
		dualIndicator:		false,
		
		//	autoScroll: Boolean? 
		//		Whether when moving indicator the chart is automatically scrolled. Default is true.
		autoScroll:		true,
	
		//	vertical: Boolean? 
		//		Whether the indicator is vertical or not. Default is true.
		vertical:		true,
		
		//	fixed: Boolean?
		//		Whether a fixed precision must be applied to data values for display. Default is true.
		fixed:			true,
	
		//	precision: Number?
		//		The precision at which to round data values for display. Default is 1.
		precision:		0,
		
		//	lineStroke: gfx.Stroke?
		//		An optional stroke to use for indicator line.
		lineStroke:		{},
	
		//	lineOutline: dojo.gfx.Stroke?
		//		An optional outline to use for indicator line.
		lineOutline:		{},
	
		//	lineShadow: dojo.gfx.Stroke?
		//		An optional shadow to use for indicator line.
		lineShadow:		{},
		
		//	stroke: dojo.gfx.Stroke?
		//		An optional stroke to use for indicator label background.
		stroke:		{},
	
		//	outline: dojo.gfx.Stroke?
		//		An optional outline to use for indicator label background.
		outline:		{},
	
		//	shadow: dojo.gfx.Stroke?
		//		An optional shadow to use for indicator label background.
		shadow:		{},
	
		//	fill: dojo.gfx.Fill?
		//		An optional fill to use for indicator label background.
		fill:			{},
		
		//	fillFunc: Function?
		//		An optional function to use to compute label background fill. It takes precedence over
		//		fill property when available.
		fillFunc:		null,
		
		//	labelFunc: Function?
		//		An optional function to use to compute label text. It takes precedence over
		//		the default text when available.
		labelFunc:		{},
	
		//	font: String?
		//		A font definition to use for indicator label background.
		font:		"",
	
		//	fontColor: String|dojo.Color?
		//		The color to use for indicator label background.
		fontColor:	"",
	
		//	markerStroke: dojo.gfx.Stroke?
		//		An optional stroke to use for indicator marker.
		markerStroke:		{},
	
		//	markerOutline: dojo.gfx.Stroke?
		//		An optional outline to use for indicator marker.
		markerOutline:		{},
	
		//	markerShadow: dojo.gfx.Stroke?
		//		An optional shadow to use for indicator marker.
		markerShadow:		{},
	
		//	markerFill: dojo.gfx.Fill?
		//		An optional fill to use for indicator marker.
		markerFill:			{},
		
		//	markerSymbol: String?
		//		An optional symbol string to use for indicator marker.
		markerFill:			{}	
	});
	var ChartAction = dojox.charting.action2d.ChartAction;
	=====*/

	return declare("dojox.charting.action2d.TouchIndicator", ChartAction, {
		//	summary:
		//		Create a touch indicator action. You can touch over the chart to display a data indicator.

		// the data description block for the widget parser
		defaultParams: {
			series: "",
			dualIndicator: false,
			vertical: true,
			autoScroll: true,
			fixed: true,
			precision: 0
		},
		optionalParams: {
			lineStroke: {},
			outlineStroke: {},
			shadowStroke: {},
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			fillFunc:  null,
			labelFunc: null,
			font:		"",
			fontColor:	"",
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerSymbol:		""
		},	

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create a new touch indicator action and connect it.
			//	chart: dojox.charting.Chart
			//		The chart this action applies to.
			//	kwArgs: dojox.charting.action2d.__TouchIndicatorCtorArgs?
			//		Optional arguments for the chart action.
			this._listeners = [{eventName: "ontouchstart", methodName: "onTouchStart"},
			                   {eventName: "ontouchmove", methodName: "onTouchMove"},
			                   {eventName: "ontouchend", methodName: "onTouchEnd"},
			                   {eventName: "ontouchcancel", methodName: "onTouchEnd"}];
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this._uName = "touchIndicator"+this.opt.series;
			this.connect();
		},
		
		connect: function(){
			//	summary:
			//		Connect this action to the chart. This adds a indicator plot
			//		to the chart that's why Chart.render() must be called after connect.
			this.inherited(arguments);
			// add plot with unique name
			this.chart.addPlot(this._uName, {type: IndicatorElement, inter: this});
		},

		disconnect: function(){
			//	summary:
			//		Disconnect this action from the chart.
			var plot = this.chart.getPlot(this._uName);
			if(plot.pageCoord){
				// we might still have something drawn on the screen
				this.onTouchEnd();
			}
			this.chart.removePlot(this._uName);
			this.inherited(arguments);
		},

		onTouchStart: function(event){
			//	summary:
			//		Called when touch is started on the chart.		
			if(event.touches.length==1){
				this._onTouchSingle(event, true);
			}else if(this.opt.dualIndicator && event.touches.length==2){
				this._onTouchDual(event);
			}
		},

		onTouchMove: function(event){
			//	summary:
			//		Called when touch is moved on the chart.
			if(event.touches.length==1){
				this._onTouchSingle(event);
			}else if(this.opt.dualIndicator && event.touches.length==2){
				this._onTouchDual(event);	
			}
		},

		_onTouchSingle: function(event, delayed){
			// sync
			if(this.chart._delayedRenderHandle && !delayed){
				// we have pending rendering from a previous call, let's sync
				clearTimeout(this.chart._delayedRenderHandle);
				this.chart._delayedRenderHandle = null;
				this.chart.render();
			}
			var plot = this.chart.getPlot(this._uName);
			plot.pageCoord  = {x: event.touches[0].pageX, y: event.touches[0].pageY};
			plot.dirty = true;
			if(delayed){
				this.chart.delayedRender();
			}else{
				this.chart.render();
			}
			eventUtil.stop(event);
		},
		
		_onTouchDual: function(event){
			var plot = this.chart.getPlot(this._uName);
			plot.pageCoord = {x: event.touches[0].pageX, y: event.touches[0].pageY};
			plot.secondCoord = {x: event.touches[1].pageX, y: event.touches[1].pageY};
			plot.dirty = true;
			this.chart.render();
			eventUtil.stop(event);
		},

		onTouchEnd: function(event){
			//	summary:
			//		Called when touch is ended or canceled on the chart.
			var plot = this.chart.getPlot(this._uName);
			plot.stopTrack();
			plot.pageCoord = null;
			plot.secondCoord = null;
			plot.dirty = true;
			this.chart.delayedRender();
		}
	});
});

},
'dojox/gfx/_gfxBidiSupport':function(){
define("dojox/gfx/_gfxBidiSupport", ["./_base", "dojo/_base/lang","dojo/_base/sniff", "dojo/dom", "dojo/_base/html", "dojo/_base/array",
		"./utils", "./shape", "dojox/string/BidiEngine"], 
  function(g, lang, has, dom, html, arr, utils, shapeLib, BidiEngine){
	lang.getObject("dojox.gfx._gfxBidiSupport", true);
	/*===== g = dojox.gfx; =====*/
	switch (g.renderer){
		case 'vml':
			g.isVml = true;
			break;
		case 'svg':
			g.isSvg = true;
			if(g.svg.useSvgWeb){
				g.isSvgWeb = true;
			}
			break;
		case 'silverlight':
			g.isSilverlight = true;
			break;
		case 'canvas':
			g.isCanvas = true;
			break;
	}

	var bidi_const = {
		LRM : '\u200E',
		LRE : '\u202A',
		PDF : '\u202C',
		RLM : '\u200f',
		RLE : '\u202B'
	};

	// the object that performs text transformations.
	var bidiEngine = new BidiEngine();

	lang.extend(g.shape.Surface, {
		// textDir: String
		//		Will be used as default for Text/TextPath/Group objects that created by this surface
		//		and textDir wasn't directly specified for them, though the bidi support was loaded.
		//		Can be setted in two ways:
		//			1. When the surface is created and textDir value passed to it as fourth 
		//			parameter.
		//			2. Using the setTextDir(String) function, when this function is used the value
		//			of textDir propogates to all of it's children and the children of children (for Groups) etc.
		textDir: "",

		setTextDir: function(/*String*/newTextDir){
			// summary:
			//		Used for propogation and change of textDir.
			//		newTextDir will be forced as textDir for all of it's children (Group/Text/TextPath).
			setTextDir(this, newTextDir);
		},

		getTextDir: function(){
			return this.textDir;
		}
	});

	lang.extend(g.Group, {                          
		// textDir: String
		//		Will be used for inheritance, or as default for text objects
		//		that textDir wasn't directly specified for them but the bidi support was required.
		textDir: "",

		setTextDir: function(/*String*/newTextDir){
			// summary:
			//		Used for propogation and change of textDir.
			//		newTextDir will be forced as textDir for all of it's children (Group/Text/TextPath).
			setTextDir(this, newTextDir);
		},

		getTextDir: function(){
			return this.textDir;
		}	
	});
	
	lang.extend(g.Text, {  
		// summary:
		//		Overrides some of dojox.gfx.Text properties, and adds some 
		//		for bidi support.
		
		// textDir: String
		//		Used for displaying bidi scripts in right layout.
		//		Defines the base direction of text that displayed, can have 3 values:
		//			1. "ltr" - base direction is left to right.
		//			2. "rtl" - base direction is right to left.
		//			3. "auto" - base direction is contextual (defined by first strong character).
		textDir: "",

		formatText: function (/*String*/ text, /*String*/ textDir){
			// summary: 
			//		Applies the right transform on text, according to renderer.
			// text:	
			//		the string for manipulation, by default return value.
			// textDir:	
			//		Text direction.
			//		Can be:
			//			1. "ltr" - for left to right layout.
			//			2. "rtl" - for right to left layout
			//			3. "auto" - for contextual layout: the first strong letter decides the direction.	
			// discription:
			//		Finds the right transformation that should be applied on the text, according to renderer.
			//		Was tested in:
			//			Renderers (browser for testing): 
			//				canvas (FF, Chrome, Safari), 
			//				vml (IE), 
			//				svg (FF, Chrome, Safari, Opera), 
			//				silverlight (IE, Chrome, Safari, Opera), 
			//				svgWeb(FF, Chrome, Safari, Opera, IE).
			//			Browsers [browser version that was tested]: 
			//				IE [6,7,8], FF [3.6], 
			//				Chrome (latest for March 2011), 
			//				Safari [5.0.3], 
			//				Opera [11.01].

			if(textDir && text && text.length > 1){
			var sourceDir = "ltr", targetDir = textDir;

			if(targetDir == "auto"){
				//is auto by default
				if(g.isVml){
					return text;
				}
				targetDir = bidiEngine.checkContextual(text);
			}

			if(g.isVml){
				sourceDir = bidiEngine.checkContextual(text);
				if(targetDir != sourceDir){
					if(targetDir == "rtl"){
						return !bidiEngine.hasBidiChar(text) ? bidiEngine.bidiTransform(text,"IRNNN","ILNNN") : bidi_const.RLM + bidi_const.RLM + text;
					}else{
						return bidi_const.LRM + text;
					}
				}
				return text;
			}

			if(g.isSvgWeb){
				if(targetDir == "rtl"){
					return bidiEngine.bidiTransform(text,"IRNNN","ILNNN");
				}
				return text;
			}

			if(g.isSilverlight){
				return (targetDir == "rtl") ? bidiEngine.bidiTransform(text,"IRNNN","VLYNN") : bidiEngine.bidiTransform(text,"ILNNN","VLYNN");
			}

			if(g.isCanvas){
				return (targetDir == "rtl") ? bidi_const.RLE + text + bidi_const.PDF : bidi_const.LRE + text + bidi_const.PDF;
			}

			if(g.isSvg){
				if(has("ff")){
					return (targetDir == "rtl") ? bidiEngine.bidiTransform(text,"IRYNN","VLNNN") : bidiEngine.bidiTransform(text,"ILYNN","VLNNN");
				}
				if(has("chrome") || has("safari") || has("opera")){
					return bidi_const.LRM + (targetDir == "rtl" ? bidi_const.RLE : bidi_const.LRE) + text + bidi_const.PDF;
				}					
			}					
}
			return text;
		},	

		bidiPreprocess: function(newShape){     
			return newShape;
		}	
	});

	lang.extend(g.TextPath, {          
			// textDir: String
			//		Used for displaying bidi scripts in right layout.
			//		Defines the base direction of text that displayed, can have 3 values:
			//			1. "ltr" - base direction is left to right.
			//			2. "rtl" - base direction is right to left.
			//			3. "auto" - base direction is contextual (defined by first strong character).
		textDir: "",

		formatText: function (/*String*/text, /*String*/textDir){
			// summary: 
			//		Applies the right transform on text, according to renderer.
			// text:	the string for manipulation, by default return value.
			// textDir:	text direction direction.
			//		Can be:
			//			1. "ltr" - for left to right layout.
			//			2. "rtl" - for right to left layout
			//			3. "auto" - for contextual layout: the first strong letter decides the direction.	
			// discription:
			//		Finds the right transformation that should be applied on the text, according to renderer.
			//		Was tested in:
			//			Renderers: 
			//				canvas (FF, Chrome, Safari), vml (IE), svg (FF, Chrome, Safari, Opera), silverlight (IE8), svgWeb(FF, Chrome, Safari, Opera, IE).
			//			Browsers: 
			//				IE [6,7,8], FF [3.6], Chrome (latest for February 2011), Safari [5.0.3], Opera [11.01].

			if(textDir && text && text.length > 1){
				var sourceDir = "ltr", targetDir = textDir;

				if(targetDir == "auto"){
					//is auto by default
					if(g.isVml){
						return text;
					}
					targetDir = bidiEngine.checkContextual(text);
				}

				if(g.isVml){
					sourceDir = bidiEngine.checkContextual(text);
					if(targetDir != sourceDir){
						if(targetDir == "rtl"){
							return !bidiEngine.hasBidiChar(text) ? bidiEngine.bidiTransform(text,"IRNNN","ILNNN") : bidi_const.RLM + bidi_const.RLM + text;
						}else{
							return bidi_const.LRM + text;
						}
					}
					return text;
				}
				if(g.isSvgWeb){
					if(targetDir == "rtl"){
						return bidiEngine.bidiTransform(text,"IRNNN","ILNNN");
					}
					return text;
				}
				//unlike the g.Text that is rendered in logical layout for Bidi scripts.
				//for g.TextPath in svg always visual -> bidi script is unreadable (except Opera).
				if(g.isSvg){
					if(has("opera")){
						text = bidi_const.LRM + (targetDir == "rtl"? bidi_const.RLE : bidi_const.LRE) + text + bidi_const.PDF;
					}else{
						text = (targetDir == "rtl") ? bidiEngine.bidiTransform(text,"IRYNN","VLNNN") : bidiEngine.bidiTransform(text,"ILYNN","VLNNN");
					}
				}					
			}	
			return text;
		},
		bidiPreprocess: function(newText){
			if(newText && (typeof newText == "string")){
				this.origText = newText;
				newText = this.formatText(newText,this.textDir);
			}
			return newText;
		}
	});	
		
	var extendMethod = function(shape, method, before, after){
		// Some helper function. Used for extending metod of shape.
		// shape: Object
		//		The shape we overriding it's metod.
		// method: String
		//		The method that is extended, the original metod is called before or after
		//		functions that passed to extendMethod. 
		// before: function
		//		If defined this function will be executed before the original method.
		// after: function
		//		If defined this function will be executed after the original method.
		var old = shape.prototype[method];
		shape.prototype[method] = 
			function(){
				var rBefore;
				if (before){
					rBefore = before.apply(this, arguments);
				}
				var r = old.call(this, rBefore);
				if (after){
					r = after.call(this, r, arguments);
				}
				return r;
			};
	};

	var bidiPreprocess = function(newText){
		if (newText){  
			if (newText.textDir){
				newText.textDir = validateTextDir(newText.textDir);
			}
			if (newText.text && (newText.text instanceof Array)){
				newText.text = newText.text.join(",");
			}
		}
		if(newText && (newText.text != undefined || newText.textDir) && (this.textDir != newText.textDir || newText.text != this.origText)){
			// store the original text. 
			this.origText = (newText.text != undefined) ? newText.text : this.origText;
			if(newText.textDir){
				this.textDir = newText.textDir;
			}
			newText.text = this.formatText(this.origText,this.textDir);
		}
		return this.bidiPreprocess(newText);

	};

	// Istead of adding bidiPreprocess to all renders one by one
	// use the extendMethod, at first there's a need for bidi transformation 
	// on text then call to original setShape.
	extendMethod(g.Text,"setShape", bidiPreprocess, null);
	extendMethod(g.TextPath,"setText", bidiPreprocess, null);
	
	var restoreText = function(origObj){
		var obj = lang.clone(origObj);
		if (obj && this.origText){
			obj.text = this.origText;
		}
		return obj;
	};

	// Istead of adding restoreText to all renders one by one
	// use the extendMethod, at first get the shape by calling the original getShape,
	// than resrore original text (without the text transformations).
	extendMethod(g.Text, "getShape", null, restoreText);
	extendMethod(g.TextPath, "getText", null, restoreText);

	var groupTextDir = function(group, args){
		var textDir;
		if (args && args[0]){
			textDir = validateTextDir(args[0]);
		}
		group.setTextDir(textDir ? textDir : this.textDir);
		return group;	// dojox.gfx.Group				
	};

	// In creation of Group there's a need to update it's textDir,
	// so instead of doing it in renders one by one (vml vs others)
	// use the extendMethod, at first the original createGroup is applied, the
	// groupTextDir which is setts Group's textDir as it's father's or if was defined
	// by user by this value.
	extendMethod(g.Surface, "createGroup", null, groupTextDir);
	extendMethod(g.Group, "createGroup", null, groupTextDir);

	var textDirPreprocess =  function(text){
		//  inherit from surface / group  if textDir is defined there
		if(text){
			var textDir = text.textDir ? validateTextDir(text.textDir) : this.textDir;
			if(textDir){
				text.textDir = textDir;
			}
		}
		return text;
	};

	// In creation there's a need to some preprocess,
	// so instead of doing it in renders one by one (vml vs others)
	// use the extendMethod, at first the textDirPreprocess function handles the input
	// then the original createXXXXXX is applied.
	extendMethod(g.Surface,"createText", textDirPreprocess, null);
	extendMethod(g.Surface,"createTextPath", textDirPreprocess, null);
	extendMethod(g.Group,"createText", textDirPreprocess, null);
	extendMethod(g.Group,"createTextPath", textDirPreprocess, null);

	g.createSurface = function(parentNode, width, height, textDir) {        
		var s = g[g.renderer].createSurface(parentNode, width, height);
		var tDir = validateTextDir(textDir);
		
		if(g.isSvgWeb){
			s.textDir = tDir ? tDir : html.style(dom.byId(parentNode),"direction");
			return s;
		}
		// if textDir was defined use it, else get default value.
		//s.textDir = tDir ? tDir : html.style(s.rawNode,"direction");
		if(g.isVml || g.isSvg || g.isCanvas){
			s.textDir = tDir ? tDir : html.style(s.rawNode,"direction");
		}
		if(g.isSilverlight){
			// allow this once rawNode will be able for the silverlight
			//s.textDir = tDir ? tDir : dojo.style(s.rawNode,"direction");
			s.textDir = tDir ? tDir : html.style(s._nodes[1],"direction");
		}
		
		return s;
	};

	// some helper functions
	
	function setTextDir(/*Object*/ obj, /*String*/ newTextDir){
		var tDir = validateTextDir(newTextDir);
		if (tDir){
			g.utils.forEach(obj,function(e){
				if(e instanceof g.Surface || e instanceof g.Group){
					e.textDir = tDir;
				}		
				if(e instanceof g.Text){
					e.setShape({textDir: tDir});
				}
				if(e instanceof g.TextPath){
					e.setText({textDir: tDir})
				}
			}, obj);
		}
		return obj;
	}

	function validateTextDir(textDir){
		var validValues = ["ltr","rtl","auto"]; 
		if (textDir){
			textDir = textDir.toLowerCase();
			if (arr.indexOf(validValues, textDir) < 0){
				return null;
			}
		}
		return textDir;
	}

	return g; // return gfx api augmented with bidi support	
});


},
'dojox/charting/axis2d/Default':function(){
define("dojox/charting/axis2d/Default", ["dojo/_base/lang", "dojo/_base/array","dojo/_base/sniff", "dojo/_base/declare", 
	"dojo/_base/connect", "dojo/_base/html", "dojo/dom-geometry", "./Invisible", 
	"../scaler/common", "../scaler/linear", "./common", "dojox/gfx", "dojox/lang/utils"], 
	function(lang, arr, has, declare, connect, html, domGeom, Invisible, scommon, 
			lin, acommon, g, du){

	/*=====
		dojox.charting.axis2d.__AxisCtorArgs = function(
			vertical, fixUpper, fixLower, natural, leftBottom,
			includeZero, fixed, majorLabels, minorTicks, minorLabels, microTicks, htmlLabels,
			min, max, from, to, majorTickStep, minorTickStep, microTickStep,
			labels, labelFunc, maxLabelSize,
			stroke, majorTick, minorTick, microTick, tick,
			font, fontColor
		){
		//	summary:
		//		Optional arguments used in the definition of an axis.
		//
		//	vertical: Boolean?
		//		A flag that says whether an axis is vertical (i.e. y axis) or horizontal. Default is false (horizontal).
		//	fixUpper: String?
		//		Align the greatest value on the axis with the specified tick level. Options are "major", "minor", "micro", or "none".  Defaults to "none".
		//	fixLower: String?
		//		Align the smallest value on the axis with the specified tick level. Options are "major", "minor", "micro", or "none".  Defaults to "none".
		//	natural: Boolean?
		//		Ensure tick marks are made on "natural" numbers. Defaults to false.
		//	leftBottom: Boolean?
		//		The position of a vertical axis; if true, will be placed against the left-bottom corner of the chart.  Defaults to true.
		//	includeZero: Boolean?
		//		Include 0 on the axis rendering.  Default is false.
		//	fixed: Boolean?
		//		Force all axis labels to be fixed numbers.  Default is true.
		//	majorLabels: Boolean?
		//		Flag to draw all labels at major ticks. Default is true.
		//	minorTicks: Boolean?
		//		Flag to draw minor ticks on an axis.  Default is true.
		//	minorLabels: Boolean?
		//		Flag to draw labels on minor ticks. Default is true.
		//	microTicks: Boolean?
		//		Flag to draw micro ticks on an axis. Default is false.
		//	htmlLabels: Boolean?
		//		Flag to use HTML (as opposed to the native vector graphics engine) to draw labels. Default is true.
		//	min: Number?
		//		The smallest value on an axis. Default is 0.
		//	max: Number?
		//		The largest value on an axis. Default is 1.
		//	from: Number?
		//		Force the chart to render data visible from this value. Default is 0.
		//	to: Number?
		//		Force the chart to render data visible to this value. Default is 1.
		//	majorTickStep: Number?
		//		The amount to skip before a major tick is drawn.  Default is 4.
		//	minorTickStep: Number?
		//		The amount to skip before a minor tick is drawn. Default is 2.
		//	microTickStep: Number?
		//		The amount to skip before a micro tick is drawn. Default is 1.
		//	labels: Object[]?
		//		An array of labels for major ticks, with corresponding numeric values, ordered by value.
		//	labelFunc: Function?
		//		An optional function used to compute label values.
		//	maxLabelSize: Number?
		//		The maximum size, in pixels, for a label.  To be used with the optional label function.
		//	stroke: dojox.gfx.Stroke?
		//		An optional stroke to be used for drawing an axis.
		//	majorTick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a major tick.
		//	minorTick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a minor tick.
		//	microTick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a micro tick.
		//	tick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a tick.
		//	font: String?
		//		An optional font definition (as used in the CSS font property) for labels.
		//	fontColor: String|dojo.Color?
		//		An optional color to be used in drawing labels.
		//	enableCache: Boolean?
		//		Whether the ticks and labels are cached from one rendering to another. This improves the rendering performance of
		//		successive rendering but penalize the first rendering. For labels it is only working with gfx labels
		//		not html ones.  Default false.
	
		this.vertical = vertical;
		this.fixUpper = fixUpper;
		this.fixLower = fixLower;
		this.natural = natural;
		this.leftBottom = leftBottom;
		this.includeZero = includeZero;
		this.fixed = fixed;
		this.majorLabels = majorLabels;
		this.minorTicks = minorTicks;
		this.minorLabels = minorLabels;
		this.microTicks = microTicks;
		this.htmlLabels = htmlLabels;
		this.min = min;
		this.max = max;
		this.from = from;
		this.to = to;
		this.majorTickStep = majorTickStep;
		this.minorTickStep = minorTickStep;
		this.microTickStep = microTickStep;
		this.labels = labels;
		this.labelFunc = labelFunc;
		this.maxLabelSize = maxLabelSize;
		this.stroke = stroke;
		this.majorTick = majorTick;
		this.minorTick = minorTick;
		this.microTick = microTick;
		this.tick = tick;
		this.font = font;
		this.fontColor = fontColor;
		this.enableCache = enableCache;
	}
	var Invisible = dojox.charting.axis2d.Invisible
	=====*/

	var labelGap = 4,			// in pixels
		centerAnchorLimit = 45;	// in degrees

	return declare("dojox.charting.axis2d.Default", Invisible, {
		//	summary:
		//		The default axis object used in dojox.charting.  See dojox.charting.Chart.addAxis for details.
		//
		//	defaultParams: Object
		//		The default parameters used to define any axis.
		//	optionalParams: Object
		//		Any optional parameters needed to define an axis.

		/*
		//	TODO: the documentation tools need these to be pre-defined in order to pick them up
		//	correctly, but the code here is partially predicated on whether or not the properties
		//	actually exist.  For now, we will leave these undocumented but in the code for later. -- TRT

		//	opt: Object
		//		The actual options used to define this axis, created at initialization.
		//	scalar: Object
		//		The calculated helper object to tell charts how to draw an axis and any data.
		//	ticks: Object
		//		The calculated tick object that helps a chart draw the scaling on an axis.
		//	dirty: Boolean
		//		The state of the axis (whether it needs to be redrawn or not)
		//	scale: Number
		//		The current scale of the axis.
		//	offset: Number
		//		The current offset of the axis.

		opt: null,
		scalar: null,
		ticks: null,
		dirty: true,
		scale: 1,
		offset: 0,
		*/
		defaultParams: {
			vertical:    false,		// true for vertical axis
			fixUpper:    "none",	// align the upper on ticks: "major", "minor", "micro", "none"
			fixLower:    "none",	// align the lower on ticks: "major", "minor", "micro", "none"
			natural:     false,		// all tick marks should be made on natural numbers
			leftBottom:  true,		// position of the axis, used with "vertical"
			includeZero: false,		// 0 should be included
			fixed:       true,		// all labels are fixed numbers
			majorLabels: true,		// draw major labels
			minorTicks:  true,		// draw minor ticks
			minorLabels: true,		// draw minor labels
			microTicks:  false,		// draw micro ticks
			rotation:    0,			// label rotation angle in degrees
			htmlLabels:  true,		// use HTML to draw labels
			enableCache: false		// whether we cache or not
		},
		optionalParams: {
			min:			0,	// minimal value on this axis
			max:			1,	// maximal value on this axis
			from:			0,	// visible from this value
			to:				1,	// visible to this value
			majorTickStep:	4,	// major tick step
			minorTickStep:	2,	// minor tick step
			microTickStep:	1,	// micro tick step
			labels:			[],	// array of labels for major ticks
								// with corresponding numeric values
								// ordered by values
			labelFunc:		null, // function to compute label values
			maxLabelSize:	0,	// size in px. For use with labelFunc
			maxLabelCharCount:	0,	// size in word count.
			trailingSymbol:	null,

			// TODO: add support for minRange!
			// minRange:		1,	// smallest distance from min allowed on the axis

			// theme components
			stroke:			{},	// stroke for an axis
			majorTick:		{},	// stroke + length for a tick
			minorTick:		{},	// stroke + length for a tick
			microTick:		{},	// stroke + length for a tick
			tick:           {},	// stroke + length for a tick
			font:			"",	// font for labels
			fontColor:		"",	// color for labels as a string
			title:		 		"",	// axis title
			titleGap:	 		0,		// gap between axis title and axis label
			titleFont:	 		"",		// axis title font
			titleFontColor:	 	"",		// axis title font color
			titleOrientation: 	""		// "axis" means the title facing the axis, "away" means facing away
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for an axis.
			//	chart: dojox.charting.Chart
			//		The chart the axis belongs to.
			//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
			//		Any optional keyword arguments to be used to define this axis.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			if(this.opt.enableCache){
				this._textFreePool = [];
				this._lineFreePool = [];
				this._textUsePool = [];
				this._lineUsePool = [];
			}
		},
		getOffsets: function(){
			//	summary:
			//		Get the physical offset values for this axis (used in drawing data series).
			//	returns: Object
			//		The calculated offsets in the form of { l, r, t, b } (left, right, top, bottom).
			var s = this.scaler, offsets = { l: 0, r: 0, t: 0, b: 0 };
			if(!s){
				return offsets;
			}
			var o = this.opt, labelWidth = 0, a, b, c, d,
				gl = scommon.getNumericLabel,
				offset = 0, ma = s.major, mi = s.minor,
				ta = this.chart.theme.axis,
				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				taTitleFont = o.titleFont || (ta.tick && ta.tick.titleFont),
				taTitleGap = (o.titleGap==0) ? 0 : o.titleGap || (ta.tick && ta.tick.titleGap) || 15,
				taMajorTick = this.chart.theme.getTick("major", o),
				taMinorTick = this.chart.theme.getTick("minor", o),
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				tsize = taTitleFont ? g.normalizedLength(g.splitFontString(taTitleFont).size) : 0,
				rotation = o.rotation % 360, leftBottom = o.leftBottom,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180));
			this.trailingSymbol = (o.trailingSymbol === undefined || o.trailingSymbol === null) ? this.trailingSymbol : o.trailingSymbol;
			if(rotation < 0){
				rotation += 360;
			}

			if(size){
				// we need width of all labels
				if(this.labels){
					labelWidth = this._groupLabelWidth(this.labels, taFont, o.maxLabelCharCount);
				}else{
					labelWidth = this._groupLabelWidth([
						gl(ma.start, ma.prec, o),
						gl(ma.start + ma.count * ma.tick, ma.prec, o),
						gl(mi.start, mi.prec, o),
						gl(mi.start + mi.count * mi.tick, mi.prec, o)
					], taFont, o.maxLabelCharCount);
				}
				labelWidth = o.maxLabelSize ? Math.min(o.maxLabelSize, labelWidth) : labelWidth;
				if(this.vertical){
					var side = leftBottom ? "l" : "r";
					switch(rotation){
						case 0:
						case 180:
							offsets[side] = labelWidth;
							offsets.t = offsets.b = size / 2;
							break;
						case 90:
						case 270:
							offsets[side] = size;
							offsets.t = offsets.b = labelWidth / 2;
							break;
						default:
							if(rotation <= centerAnchorLimit || (180 < rotation && rotation <= (180 + centerAnchorLimit))){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "t" : "b"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "b" : "t"] = size * cosr / 2;
							}else if(rotation > (360 - centerAnchorLimit) || (180 > rotation && rotation > (180 - centerAnchorLimit))){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "b" : "t"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "t" : "b"] = size * cosr / 2;
							}else if(rotation < 90 || (180 < rotation && rotation < 270)){
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "t" : "b"] = size * cosr + labelWidth * sinr;
							}else{
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "b" : "t"] = size * cosr + labelWidth * sinr;
							}
							break;
					}
					offsets[side] += labelGap + Math.max(taMajorTick.length, taMinorTick.length) + (o.title ? (tsize + taTitleGap) : 0);
				}else{
					var side = leftBottom ? "b" : "t";
					switch(rotation){
						case 0:
						case 180:
							offsets[side] = size;
							offsets.l = offsets.r = labelWidth / 2;
							break;
						case 90:
						case 270:
							offsets[side] = labelWidth;
							offsets.l = offsets.r = size / 2;
							break;
						default:
							if((90 - centerAnchorLimit) <= rotation && rotation <= 90 || (270 - centerAnchorLimit) <= rotation && rotation <= 270){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "r" : "l"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "l" : "r"] = size * cosr / 2;
							}else if(90 <= rotation && rotation <= (90 + centerAnchorLimit) || 270 <= rotation && rotation <= (270 + centerAnchorLimit)){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "l" : "r"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "r" : "l"] = size * cosr / 2;
							}else if(rotation < centerAnchorLimit || (180 < rotation && rotation < (180 - centerAnchorLimit))){
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "r" : "l"] = size * cosr + labelWidth * sinr;
							}else{
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "l" : "r"] = size * cosr + labelWidth * sinr;
							}
							break;
					}
					offsets[side] += labelGap + Math.max(taMajorTick.length, taMinorTick.length) + (o.title ? (tsize + taTitleGap) : 0);
				}
			}
			if(labelWidth){
				this._cachedLabelWidth = labelWidth;
			}
			return offsets;	//	Object
		},
		cleanGroup: function(creator){
			if(this.opt.enableCache && this.group){
				this._lineFreePool = this._lineFreePool.concat(this._lineUsePool);
				this._lineUsePool = [];
				this._textFreePool = this._textFreePool.concat(this._textUsePool);
				this._textUsePool = [];
			}
			this.inherited(arguments);
		},
		createText: function(labelType, creator, x, y, align, textContent, font, fontColor, labelWidth){
			if(!this.opt.enableCache || labelType=="html"){
				return acommon.createText[labelType](
						this.chart,
						creator,
						x,
						y,
						align,
						textContent,
						font,
						fontColor,
						labelWidth
					);
			}
			var text;
			if (this._textFreePool.length > 0){
				text = this._textFreePool.pop();
				text.setShape({x: x, y: y, text: textContent, align: align});
				// For now all items share the same font, no need to re-set it
				//.setFont(font).setFill(fontColor);
				// was cleared, add it back
				creator.add(text);
			}else{
				text = acommon.createText[labelType](
						this.chart,
						creator,
						x,
						y,
						align,
						textContent,
						font,
						fontColor,
						labelWidth
					);			}
			this._textUsePool.push(text);
			return text;
		},
		createLine: function(creator, params){
			var line;
			if(this.opt.enableCache && this._lineFreePool.length > 0){
				line = this._lineFreePool.pop();
				line.setShape(params);
				// was cleared, add it back
				creator.add(line);
			}else{
				line = creator.createLine(params);
			}
			if(this.opt.enableCache){
				this._lineUsePool.push(line);
			}
			return line;
		},
		render: function(dim, offsets){
			//	summary:
			//		Render/draw the axis.
			//	dim: Object
			//		An object of the form { width, height}.
			//	offsets: Object
			//		An object of the form { l, r, t, b }.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			if(!this.dirty){
				return this;	//	dojox.charting.axis2d.Default
			}
			// prepare variable
			var o = this.opt, ta = this.chart.theme.axis, leftBottom = o.leftBottom, rotation = o.rotation % 360,
				start, stop, titlePos, titleRotation=0, titleOffset, axisVector, tickVector, anchorOffset, labelOffset, labelAlign,

				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				taTitleFont = o.titleFont || (ta.tick && ta.tick.titleFont),
				// TODO: we use one font color --- we need to use different colors
				taFontColor = o.fontColor || (ta.majorTick && ta.majorTick.fontColor) || (ta.tick && ta.tick.fontColor) || "black",
				taTitleFontColor = o.titleFontColor || (ta.tick && ta.tick.titleFontColor) || "black",
				taTitleGap = (o.titleGap==0) ? 0 : o.titleGap || (ta.tick && ta.tick.titleGap) || 15,
				taTitleOrientation = o.titleOrientation || (ta.tick && ta.tick.titleOrientation) || "axis",
				taMajorTick = this.chart.theme.getTick("major", o),
				taMinorTick = this.chart.theme.getTick("minor", o),
				taMicroTick = this.chart.theme.getTick("micro", o),

				tickSize = Math.max(taMajorTick.length, taMinorTick.length, taMicroTick.length),
				taStroke = "stroke" in o ? o.stroke : ta.stroke,
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180)),
				tsize = taTitleFont ? g.normalizedLength(g.splitFontString(taTitleFont).size) : 0;
			if(rotation < 0){
				rotation += 360;
			}
			if(this.vertical){
				start = {y: dim.height - offsets.b};
				stop  = {y: offsets.t};
				titlePos = {y: (dim.height - offsets.b + offsets.t)/2};
				titleOffset = size * sinr + (this._cachedLabelWidth || 0) * cosr + labelGap + Math.max(taMajorTick.length, taMinorTick.length) + tsize + taTitleGap;
				axisVector = {x: 0, y: -1};
				labelOffset = {x: 0, y: 0};
				tickVector = {x: 1, y: 0};
				anchorOffset = {x: labelGap, y: 0};
				switch(rotation){
					case 0:
						labelAlign = "end";
						labelOffset.y = size * 0.4;
						break;
					case 90:
						labelAlign = "middle";
						labelOffset.x = -size;
						break;
					case 180:
						labelAlign = "start";
						labelOffset.y = -size * 0.4;
						break;
					case 270:
						labelAlign = "middle";
						break;
					default:
						if(rotation < centerAnchorLimit){
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}else if(rotation < 90){
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}else if(rotation < (180 - centerAnchorLimit)){
							labelAlign = "start";
						}else if(rotation < (180 + centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.y = -size * 0.4;
						}else if(rotation < 270){
							labelAlign = "start";
							labelOffset.x = leftBottom ? 0 : size * 0.4;
						}else if(rotation < (360 - centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.x = leftBottom ? 0 : size * 0.4;
						}else{
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}
				}
				if(leftBottom){
					start.x = stop.x = offsets.l;
					titleRotation = (taTitleOrientation && taTitleOrientation == "away") ? 90 : 270;
					titlePos.x = offsets.l - titleOffset + (titleRotation == 270 ? tsize : 0);
					tickVector.x = -1;
					anchorOffset.x = -anchorOffset.x;
				}else{
					start.x = stop.x = dim.width - offsets.r;
					titleRotation = (taTitleOrientation && taTitleOrientation == "axis") ? 90 : 270;
					titlePos.x = dim.width - offsets.r + titleOffset - (titleRotation == 270 ? 0 : tsize);
					switch(labelAlign){
						case "start":
							labelAlign = "end";
							break;
						case "end":
							labelAlign = "start";
							break;
						case "middle":
							labelOffset.x += size;
							break;
					}
				}
			}else{
				start = {x: offsets.l};
				stop  = {x: dim.width - offsets.r};
				titlePos = {x: (dim.width - offsets.r + offsets.l)/2};
				titleOffset = size * cosr + (this._cachedLabelWidth || 0) * sinr + labelGap + Math.max(taMajorTick.length, taMinorTick.length) + tsize + taTitleGap;
				axisVector = {x: 1, y: 0};
				labelOffset = {x: 0, y: 0};
				tickVector = {x: 0, y: 1};
				anchorOffset = {x: 0, y: labelGap};
				switch(rotation){
					case 0:
						labelAlign = "middle";
						labelOffset.y = size;
						break;
					case 90:
						labelAlign = "start";
						labelOffset.x = -size * 0.4;
						break;
					case 180:
						labelAlign = "middle";
						break;
					case 270:
						labelAlign = "end";
						labelOffset.x = size * 0.4;
						break;
					default:
						if(rotation < (90 - centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.y = leftBottom ? size : 0;
						}else if(rotation < (90 + centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.x = -size * 0.4;
						}else if(rotation < 180){
							labelAlign = "start";
							labelOffset.y = leftBottom ? 0 : -size;
						}else if(rotation < (270 - centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.y = leftBottom ? 0 : -size;
						}else if(rotation < (270 + centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.y = leftBottom ? size * 0.4 : 0;
						}else{
							labelAlign = "end";
							labelOffset.y = leftBottom ? size : 0;
						}
				}
				if(leftBottom){
					start.y = stop.y = dim.height - offsets.b;
					titleRotation = (taTitleOrientation && taTitleOrientation == "axis") ? 180 : 0;
					titlePos.y = dim.height - offsets.b + titleOffset - (titleRotation ? tsize : 0);
				}else{
					start.y = stop.y = offsets.t;
					titleRotation = (taTitleOrientation && taTitleOrientation == "away") ? 180 : 0;
					titlePos.y = offsets.t - titleOffset + (titleRotation ? 0 : tsize);
					tickVector.y = -1;
					anchorOffset.y = -anchorOffset.y;
					switch(labelAlign){
						case "start":
							labelAlign = "end";
							break;
						case "end":
							labelAlign = "start";
							break;
						case "middle":
							labelOffset.y -= size;
							break;
					}
				}
			}

			// render shapes

			this.cleanGroup();

			try{
				var s = this.group,
					c = this.scaler,
					t = this.ticks,
					canLabel,
					f = lin.getTransformerFromModel(this.scaler),
					// GFX Canvas now supports labels, so let's _not_ fallback to HTML anymore on canvas, just use
					// HTML labels if explicitly asked + no rotation + no IE + no Opera
					labelType = (!o.title || !titleRotation) && !rotation && this.opt.htmlLabels && !has("ie") && !has("opera") ? "html" : "gfx",
					dx = tickVector.x * taMajorTick.length,
					dy = tickVector.y * taMajorTick.length;

				s.createLine({
					x1: start.x,
					y1: start.y,
					x2: stop.x,
					y2: stop.y
				}).setStroke(taStroke);
				
				//create axis title
				if(o.title){
					var axisTitle = acommon.createText[labelType](
						this.chart,
						s,
						titlePos.x,
						titlePos.y,
						"middle",
						o.title,
						taTitleFont,
						taTitleFontColor
					);
					if(labelType == "html"){
						this.htmlElements.push(axisTitle);
					}else{
						//as soon as rotation is provided, labelType won't be "html"
						//rotate gfx labels
						axisTitle.setTransform(g.matrix.rotategAt(titleRotation, titlePos.x, titlePos.y));
					}
				}
				
				// go out nicely instead of try/catch
				if(t==null){
					this.dirty = false;
					return this;
				}

				arr.forEach(t.major, function(tick){
					var offset = f(tick.value), elem,
						x = start.x + axisVector.x * offset,
						y = start.y + axisVector.y * offset;
						this.createLine(s, {
							x1: x, y1: y,
							x2: x + dx,
							y2: y + dy
						}).setStroke(taMajorTick);
						if(tick.label){
							var label = o.maxLabelCharCount ? this.getTextWithLimitCharCount(tick.label, taFont, o.maxLabelCharCount) : {
								text: tick.label,
								truncated: false
							};
							label = o.maxLabelSize ? this.getTextWithLimitLength(label.text, taFont, o.maxLabelSize, label.truncated) : label;
							elem = this.createText(labelType,
								s,
								x + dx + anchorOffset.x + (rotation ? 0 : labelOffset.x),
								y + dy + anchorOffset.y + (rotation ? 0 : labelOffset.y),
								labelAlign,
								label.text,
								taFont,
								taFontColor
								//this._cachedLabelWidth
							);
							
							// if bidi support was required, the textDir is "auto" and truncation
							// took place, we need to update the dir of the element for cases as: 
							// Fool label: 111111W (W for bidi character)
							// truncated label: 11... 
							// in this case for auto textDir the dir will be "ltr" which is wrong.
							if(this.chart.truncateBidi  && label.truncated){
								this.chart.truncateBidi(elem, tick.label, labelType);
							}
							label.truncated && this.labelTooltip(elem, this.chart, tick.label, label.text, taFont, labelType);
							if(labelType == "html"){
								this.htmlElements.push(elem);
							}else if(rotation){
								elem.setTransform([
									{dx: labelOffset.x, dy: labelOffset.y},
									g.matrix.rotategAt(
										rotation,
										x + dx + anchorOffset.x,
										y + dy + anchorOffset.y
									)
								]);
							}
						}
				}, this);

				dx = tickVector.x * taMinorTick.length;
				dy = tickVector.y * taMinorTick.length;
				canLabel = c.minMinorStep <= c.minor.tick * c.bounds.scale;
				arr.forEach(t.minor, function(tick){
					var offset = f(tick.value), elem,
						x = start.x + axisVector.x * offset,
						y = start.y + axisVector.y * offset;
						this.createLine(s, {
							x1: x, y1: y,
							x2: x + dx,
							y2: y + dy
						}).setStroke(taMinorTick);
						if(canLabel && tick.label){
							var label = o.maxLabelCharCount ? this.getTextWithLimitCharCount(tick.label, taFont, o.maxLabelCharCount) : {
								text: tick.label,
								truncated: false
							};
							label = o.maxLabelSize ? this.getTextWithLimitLength(label.text, taFont, o.maxLabelSize, label.truncated) : label;
							elem = this.createText(labelType,
								s,
								x + dx + anchorOffset.x + (rotation ? 0 : labelOffset.x),
								y + dy + anchorOffset.y + (rotation ? 0 : labelOffset.y),
								labelAlign,
								label.text,
								taFont,
								taFontColor
								//this._cachedLabelWidth
							);
							// if bidi support was required, the textDir is "auto" and truncation
							// took place, we need to update the dir of the element for cases as: 
							// Fool label: 111111W (W for bidi character)
							// truncated label: 11... 
							// in this case for auto textDir the dir will be "ltr" which is wrong.
							if(this.chart.getTextDir && label.truncated){
								this.chart.truncateBidi(elem, tick.label, labelType);
							}
							label.truncated && this.labelTooltip(elem, this.chart, tick.label, label.text, taFont, labelType);
							if(labelType == "html"){
								this.htmlElements.push(elem);
							}else if(rotation){
								elem.setTransform([
									{dx: labelOffset.x, dy: labelOffset.y},
									g.matrix.rotategAt(
										rotation,
										x + dx + anchorOffset.x,
										y + dy + anchorOffset.y
									)
								]);
							}
						}
				}, this);

				dx = tickVector.x * taMicroTick.length;
				dy = tickVector.y * taMicroTick.length;
				arr.forEach(t.micro, function(tick){
					var offset = f(tick.value), elem,
						x = start.x + axisVector.x * offset,
						y = start.y + axisVector.y * offset;
						this.createLine(s, {
							x1: x, y1: y,
							x2: x + dx,
							y2: y + dy
						}).setStroke(taMicroTick);
				}, this);
			}catch(e){
				// squelch
			}

			this.dirty = false;
			return this;	//	dojox.charting.axis2d.Default
		},
		labelTooltip: function(elem, chart, label, truncatedLabel, font, elemType){
			var modules = ["dijit/Tooltip"];
			var aroundRect = {type: "rect"}, position = ["above", "below"],
				fontWidth = g._base._getTextBox(truncatedLabel, {font: font}).w || 0,
				fontHeight = font ? g.normalizedLength(g.splitFontString(font).size) : 0;
			if(elemType == "html"){
				lang.mixin(aroundRect, html.coords(elem.firstChild, true));
				aroundRect.width = Math.ceil(fontWidth);
				aroundRect.height = Math.ceil(fontHeight);
				this._events.push({
					shape:  dojo,
					handle: connect.connect(elem.firstChild, "onmouseover", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.show(label, aroundRect, position);
						});
					})
				});
				this._events.push({
					shape:  dojo,
					handle: connect.connect(elem.firstChild, "onmouseout", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.hide(aroundRect);
						});
					})
				});
			}else{
				var shp = elem.getShape(),
					lt = html.coords(chart.node, true);
				aroundRect = lang.mixin(aroundRect, {
					x: shp.x - fontWidth / 2,
					y: shp.y
				});
				aroundRect.x += lt.x;
				aroundRect.y += lt.y;
				aroundRect.x = Math.round(aroundRect.x);
				aroundRect.y = Math.round(aroundRect.y);
				aroundRect.width = Math.ceil(fontWidth);
				aroundRect.height = Math.ceil(fontHeight);
				this._events.push({
					shape:  elem,
					handle: elem.connect("onmouseenter", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.show(label, aroundRect, position);
						});
					})
				});
				this._events.push({
					shape:  elem,
					handle: elem.connect("onmouseleave", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.hide(aroundRect);
						});
					})
				});
			}
		}
	});
});

},
'dojox/charting/plot2d/Scatter':function(){
define("dojox/charting/plot2d/Scatter", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "./Base", "./common", 
	"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils", "dojox/gfx/fx", "dojox/gfx/gradutils"],
	function(lang, arr, declare, Base, dc, df, dfr, du, fx, gradutils){
/*=====
var Base = dojox.charting.plot2d.Base;
=====*/
	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.Scatter", Base, {
		//	summary:
		//		A plot object representing a typical scatter chart.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			shadows: null,	// draw shadows
			animate: null	// animate chart to place
		},
		optionalParams: {
			// theme component
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerFont:			"",
			markerFontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create the scatter plot.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__DefaultCtorArgs?
			//		An optional keyword arguments object to help define this plot's parameters.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
            du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Scatter
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, events = this.events();
			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(!run.data.length){
					run.dirty = false;
					t.skip();
					continue;
				}

				var theme = t.next("marker", [this.opt, run]), s = run.group, lpoly,
					ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
					vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler);
				if(typeof run.data[0] == "number"){
					lpoly = arr.map(run.data, function(v, i){
						return {
							x: ht(i + 1) + offsets.l,
							y: dim.height - offsets.b - vt(v)
						};
					}, this);
				}else{
					lpoly = arr.map(run.data, function(v, i){
						return {
							x: ht(v.x) + offsets.l,
							y: dim.height - offsets.b - vt(v.y)
						};
					}, this);
				}

				var shadowMarkers  = new Array(lpoly.length),
					frontMarkers   = new Array(lpoly.length),
					outlineMarkers = new Array(lpoly.length);

				arr.forEach(lpoly, function(c, i){
					var finalTheme = typeof run.data[i] == "number" ?
							t.post(theme, "marker") :
							t.addMixin(theme, "marker", run.data[i], true),
						path = "M" + c.x + " " + c.y + " " + finalTheme.symbol;
					if(finalTheme.marker.shadow){
						shadowMarkers[i] = s.createPath("M" + (c.x + finalTheme.marker.shadow.dx) + " " +
							(c.y + finalTheme.marker.shadow.dy) + " " + finalTheme.symbol).
							setStroke(finalTheme.marker.shadow).setFill(finalTheme.marker.shadow.color);
						if(this.animate){
							this._animateScatter(shadowMarkers[i], dim.height - offsets.b);
						}
					}
					if(finalTheme.marker.outline){
						var outline = dc.makeStroke(finalTheme.marker.outline);
						outline.width = 2 * outline.width + finalTheme.marker.stroke.width;
						outlineMarkers[i] = s.createPath(path).setStroke(outline);
						if(this.animate){
							this._animateScatter(outlineMarkers[i], dim.height - offsets.b);
						}
					}
					var stroke = dc.makeStroke(finalTheme.marker.stroke),
						fill = this._plotFill(finalTheme.marker.fill, dim, offsets);
					if(fill && (fill.type === "linear" || fill.type == "radial")){
						var color = gradutils.getColor(fill, {x: c.x, y: c.y});
						if(stroke){
							stroke.color = color;
						}
						frontMarkers[i] = s.createPath(path).setStroke(stroke).setFill(color);
					}else{
						frontMarkers[i] = s.createPath(path).setStroke(stroke).setFill(fill);
					}
					if(this.animate){
						this._animateScatter(frontMarkers[i], dim.height - offsets.b);
					}
				}, this);
				if(frontMarkers.length){
					run.dyn.stroke = frontMarkers[frontMarkers.length - 1].getStroke();
					run.dyn.fill   = frontMarkers[frontMarkers.length - 1].getFill();
				}

				if(events){
					var eventSeries = new Array(frontMarkers.length);
					arr.forEach(frontMarkers, function(s, i){
						var o = {
							element: "marker",
							index:   i,
							run:     run,
							shape:   s,
							outline: outlineMarkers && outlineMarkers[i] || null,
							shadow:  shadowMarkers && shadowMarkers[i] || null,
							cx:      lpoly[i].x,
							cy:      lpoly[i].y
						};
						if(typeof run.data[0] == "number"){
							o.x = i + 1;
							o.y = run.data[i];
						}else{
							o.x = run.data[i].x;
							o.y = run.data[i].y;
						}
						this._connectEvents(o);
						eventSeries[i] = o;
					}, this);
					this._eventSeries[run.name] = eventSeries;
				}else{
					delete this._eventSeries[run.name];
				}
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Scatter
		},
		_animateScatter: function(shape, offset){
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, offset], end: [0, 0]},
					{name: "scale", start: [0, 0], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});

},
'dojox/charting/plot2d/ClusteredColumns':function(){
define("dojox/charting/plot2d/ClusteredColumns", ["dojo/_base/array", "dojo/_base/declare", "./Columns", "./common", 
		"dojox/lang/functional", "dojox/lang/functional/reversed", "dojox/lang/utils"], 
	function(arr, declare, Columns, dc, df, dfr, du){
/*=====
var Columns = dojox.charting.plot2d.Columns;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.ClusteredColumns", Columns, {
		//	summary:
		//		A plot representing grouped or clustered columns (vertical bars).
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.ClusteredColumns
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}
			var t = this.chart.theme, f, gap, width, thickness,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				baseline = Math.max(0, this._vScaler.bounds.lower),
				baselineHeight = vt(baseline),
				events = this.events();
			f = dc.calculateBarSize(this._hScaler.bounds.scale, this.opt, this.series.length);
			gap = f.gap;
			width = thickness = f.size;
			for(var i = 0; i < this.series.length; ++i){
				var run = this.series[i], shift = thickness * i;
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				var theme = t.next("column", [this.opt, run]), s = run.group,
					eventSeries = new Array(run.data.length);
				for(var j = 0; j < run.data.length; ++j){
					var value = run.data[j];
					if(value !== null){
						var v = typeof value == "number" ? value : value.y,
							vv = vt(v),
							height = vv - baselineHeight,
							h = Math.abs(height),
							finalTheme = typeof value != "number" ?
								t.addMixin(theme, "column", value, true) :
								t.post(theme, "column");
						if(width >= 1 && h >= 0){
							var rect = {
								x: offsets.l + ht(j + 0.5) + gap + shift,
								y: dim.height - offsets.b - (v > baseline ? vv : baselineHeight),
								width: width, height: h
							};
							var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
							specialFill = this._shapeFill(specialFill, rect);
							var shape = s.createRect(rect).setFill(specialFill).setStroke(finalTheme.series.stroke);
							run.dyn.fill   = shape.getFill();
							run.dyn.stroke = shape.getStroke();
							if(events){
								var o = {
									element: "column",
									index:   j,
									run:     run,
									shape:   shape,
									x:       j + 0.5,
									y:       v
								};
								this._connectEvents(o);
								eventSeries[j] = o;
							}
							if(this.animate){
								this._animateColumn(shape, dim.height - offsets.b - baselineHeight, h);
							}
						}
					}
				}
				this._eventSeries[run.name] = eventSeries;
				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.ClusteredColumns
		}
	});
});

},
'dojox/charting/action2d/MouseIndicator':function(){
define("dojox/charting/action2d/MouseIndicator", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", "dojo/_base/window", "dojo/_base/sniff",
	"./ChartAction", "./_IndicatorElement", "dojox/lang/utils", "dojo/_base/event","dojo/_base/array"],
	function(lang, declare, hub, win, has, ChartAction, IndicatorElement, du, eventUtil, arr){ 

	/*=====
	dojo.declare("dojox.charting.action2d.__MouseIndicatorCtorArgs", null, {
		//	summary:
		//		Additional arguments for mouse indicator.
		
		//	series: String
		//		Target series name for this action.
		series: "",
		
		//	autoScroll: Boolean? 
		//		Whether when moving indicator the chart is automatically scrolled. Default is true.
		autoScroll:		true,
	
		//	vertical: Boolean? 
		//		Whether the indicator is vertical or not. Default is true.
		vertical:		true,
		
		//	fixed: Boolean?
		//		Whether a fixed precision must be applied to data values for display. Default is true.
		fixed:			true,

		//	precision: Number?
		//		The precision at which to round data values for display. Default is 1.
		precision:		0,
		
		//	lineStroke: dojo.gfx.Stroke?
		//		An optional stroke to use for indicator line.
		lineStroke:		{},
	
		//	lineOutline: dojo.gfx.Stroke?
		//		An optional outline to use for indicator line.
		lineOutline:		{},
	
		//	lineShadow: dojo.gfx.Stroke?
		//		An optional shadow to use for indicator line.
		lineShadow:		{},
		
		//	stroke: dojo.gfx.Stroke?
		//		An optional stroke to use for indicator label background.
		stroke:		{},
	
		//	outline: dojo.gfx.Stroke?
		//		An optional outline to use for indicator label background.
		outline:		{},
	
		//	shadow: dojo.gfx.Stroke?
		//		An optional shadow to use for indicator label background.
		shadow:		{},
	
		//	fill: dojo.gfx.Fill?
		//		An optional fill to use for indicator label background.
		fill:			{},
		
		//	fillFunc: Function?
		//		An optional function to use to compute label background fill. It takes precedence over
		//		fill property when available.
		fillFunc:		null,
		
		//	labelFunc: Function?
		//		An optional function to use to compute label text. It takes precedence over
		//		the default text when available.
		labelFunc:		{},
	
		//	font: String?
		//		A font definition to use for indicator label background.
		font:		"",
	
		//	fontColor: String|dojo.Color?
		//		The color to use for indicator label background.
		fontColor:	"",
	
		//	markerStroke: dojo.gfx.Stroke?
		//		An optional stroke to use for indicator marker.
		markerStroke:		{},
	
		//	markerOutline: dojo.gfx.Stroke?
		//		An optional outline to use for indicator marker.
		markerOutline:		{},
	
		//	markerShadow: dojo.gfx.Stroke?
		//		An optional shadow to use for indicator marker.
		markerShadow:		{},
	
		//	markerFill: dojo.gfx.Fill?
		//		An optional fill to use for indicator marker.
		markerFill:			{},
		
		//	markerSymbol: String?
		//		An optional symbol string to use for indicator marker.
		markerFill:			{}	
	});
	var ChartAction = dojox.charting.action2d.ChartAction;
	=====*/

	return declare("dojox.charting.action2d.MouseIndicator", ChartAction, {
		//	summary:
		//		Create a mouse indicator action. You can drag mouse over the chart to display a data indicator.

		// the data description block for the widget parser
		defaultParams: {
			series: "",
			vertical: true,
			autoScroll: true,
			fixed: true,
			precision: 0
		},
		optionalParams: {
			lineStroke: {},
			outlineStroke: {},
			shadowStroke: {},
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			fillFunc:  null,
			labelFunc: null,
			font:		"",
			fontColor:	"",
			markerStroke:		{},
			markerOutline:		{},
			markerShadow:		{},
			markerFill:			{},
			markerSymbol:		""
		},	

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create an mouse indicator action and connect it.
			//	chart: dojox.charting.Chart
			//		The chart this action applies to.
			//	kwArgs: dojox.charting.action2d.__MouseIndicatorCtorArgs?
			//		Optional arguments for the chart action.
			this._listeners = [{eventName: "onmousedown", methodName: "onMouseDown"}];
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			this._uName = "mouseIndicator"+this.opt.series;
			this._handles = [];
			this.connect();
		},
		
		_disconnectHandles: function(){
			if(has("ie")){
				this.chart.node.releaseCapture();
			}
			arr.forEach(this._handles, hub.disconnect);
			this._handles = [];
		},

		connect: function(){
			//	summary:
			//		Connect this action to the chart. This adds a indicator plot
			//		to the chart that's why Chart.render() must be called after connect.
			this.inherited(arguments);
			// add plot with unique name
			this.chart.addPlot(this._uName, {type: IndicatorElement, inter: this});
		},

		disconnect: function(){
			//	summary:
			//		Disconnect this action from the chart.
			if(this._isMouseDown){
				this.onMouseUp();
			}
			this.chart.removePlot(this._uName);
			this.inherited(arguments);
			this._disconnectHandles();
		},

		onMouseDown: function(event){
			//	summary:
			//		Called when mouse is down on the chart.
			this._isMouseDown = true;
			
			// we now want to capture mouse move events everywhere to avoid
			// stop scrolling when going out of the chart window
			if(has("ie")){
				this._handles.push(hub.connect(this.chart.node, "onmousemove", this, "onMouseMove"));
				this._handles.push(hub.connect(this.chart.node, "onmouseup", this, "onMouseUp"));
				this.chart.node.setCapture();
			}else{
				this._handles.push(hub.connect(win.doc, "onmousemove", this, "onMouseMove"));
				this._handles.push(hub.connect(win.doc, "onmouseup", this, "onMouseUp"));
			}	
			
			this._onMouseSingle(event);
		},

		onMouseMove: function(event){
			//	summary:
			//		Called when the mouse is moved on the chart.
			if(this._isMouseDown){
				this._onMouseSingle(event);
			}
		},

		_onMouseSingle: function(event){
			var plot = this.chart.getPlot(this._uName);
			plot.pageCoord  = {x: event.pageX, y: event.pageY};
			plot.dirty = true;
			this.chart.render();
			eventUtil.stop(event);
		},

		onMouseUp: function(event){
			//	summary:
			//		Called when mouse is up on the chart.
			var plot = this.chart.getPlot(this._uName);
			plot.stopTrack();
			this._isMouseDown = false;
			this._disconnectHandles();
			plot.pageCoord = null;
			plot.dirty = true;
			this.chart.render();
		}
	});
});

},
'dijit/form/_FormWidget':function(){
define("dijit/form/_FormWidget", [
	"dojo/_base/declare",	// declare
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/ready",
	"../_Widget",
	"../_CssStateMixin",
	"../_TemplatedMixin",
	"./_FormWidgetMixin"
], function(declare, kernel, ready, _Widget, _CssStateMixin, _TemplatedMixin, _FormWidgetMixin){

/*=====
var _Widget = dijit._Widget;
var _TemplatedMixin = dijit._TemplatedMixin;
var _CssStateMixin = dijit._CssStateMixin;
var _FormWidgetMixin = dijit.form._FormWidgetMixin;
=====*/

// module:
//		dijit/form/_FormWidget
// summary:
//		FormWidget


// Back compat w/1.6, remove for 2.0
if(!kernel.isAsync){
	ready(0, function(){
		var requires = ["dijit/form/_FormValueWidget"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}

return declare("dijit.form._FormWidget", [_Widget, _TemplatedMixin, _CssStateMixin, _FormWidgetMixin], {
	// summary:
	//		Base class for widgets corresponding to native HTML elements such as <checkbox> or <button>,
	//		which can be children of a <form> node or a `dijit.form.Form` widget.
	//
	// description:
	//		Represents a single HTML element.
	//		All these widgets should have these attributes just like native HTML input elements.
	//		You can set them during widget construction or afterwards, via `dijit._Widget.attr`.
	//
	//		They also share some common methods.

	setDisabled: function(/*Boolean*/ disabled){
		// summary:
		//		Deprecated.  Use set('disabled', ...) instead.
		kernel.deprecated("setDisabled("+disabled+") is deprecated. Use set('disabled',"+disabled+") instead.", "", "2.0");
		this.set('disabled', disabled);
	},

	setValue: function(/*String*/ value){
		// summary:
		//		Deprecated.  Use set('value', ...) instead.
		kernel.deprecated("dijit.form._FormWidget:setValue("+value+") is deprecated.  Use set('value',"+value+") instead.", "", "2.0");
		this.set('value', value);
	},

	getValue: function(){
		// summary:
		//		Deprecated.  Use get('value') instead.
		kernel.deprecated(this.declaredClass+"::getValue() is deprecated. Use get('value') instead.", "", "2.0");
		return this.get('value');
	},

	postMixInProperties: function(){
		// Setup name=foo string to be referenced from the template (but only if a name has been specified)
		// Unfortunately we can't use _setNameAttr to set the name due to IE limitations, see #8484, #8660.
		// Regarding escaping, see heading "Attribute values" in
		// http://www.w3.org/TR/REC-html40/appendix/notes.html#h-B.3.2
		this.nameAttrSetting = this.name ? ('name="' + this.name.replace(/'/g, "&quot;") + '"') : '';
		this.inherited(arguments);
	},

	// Override automatic assigning type --> focusNode, it causes exception on IE.
	// Instead, type must be specified as ${type} in the template, as part of the original DOM
	_setTypeAttr: null
});

});

},
'dojox/charting/widget/Chart':function(){
define("dojox/charting/widget/Chart", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array","dojo/_base/html","dojo/_base/declare", "dojo/query",
	"dijit/_Widget", "../Chart", "dojox/lang/utils", "dojox/lang/functional","dojox/lang/functional/lambda",
	"dijit/_base/manager"], 
	function(kernel, lang, arr, html, declare, query, Widget, Chart, du, df, dfl){
/*=====
var Widget = dijit._Widget;
=====*/
	var collectParams, collectAxisParams, collectPlotParams,
		collectActionParams, collectDataParams,
		notNull = function(o){ return o; },
		dc = lang.getObject("dojox.charting");
	
	var ChartWidget = declare("dojox.charting.widget.Chart", Widget, {
		// parameters for the markup
		
		// theme for the chart
		theme: null,
		
		// margins for the chart: {l: 10, r: 10, t: 10, b: 10}
		margins: null,
		
		// chart area, define them as undefined to:
		// allow the parser to take them into account
		// but make sure they have no defined value to not override theme
		stroke: undefined,
		fill:   undefined,
		
		// methods
		
		buildRendering: function(){
			this.inherited(arguments);
			
			n = this.domNode;
			
			// collect chart parameters
			var axes    = query("> .axis", n).map(collectAxisParams).filter(notNull),
				plots   = query("> .plot", n).map(collectPlotParams).filter(notNull),
				actions = query("> .action", n).map(collectActionParams).filter(notNull),
				series  = query("> .series", n).map(collectDataParams).filter(notNull);
			
			// build the chart
			n.innerHTML = "";
			var c = this.chart = new Chart(n, {
				margins: this.margins,
				stroke:  this.stroke,
				fill:    this.fill,
				textDir: this.textDir
			});
			
			// add collected parameters
			if(this.theme){
				c.setTheme(this.theme);
			}
			axes.forEach(function(axis){
				c.addAxis(axis.name, axis.kwArgs);
			});
			plots.forEach(function(plot){
				c.addPlot(plot.name, plot.kwArgs);
			});
			
			this.actions = actions.map(function(action){
				return new action.action(c, action.plot, action.kwArgs);
			});
			
			var render = df.foldl(series, function(render, series){
				if(series.type == "data"){
					c.addSeries(series.name, series.data, series.kwArgs);
					render = true;
				}else{
					c.addSeries(series.name, [0], series.kwArgs);
					var kw = {};
					du.updateWithPattern(
						kw,
						series.kwArgs,
						{
							"query": "",
							"queryOptions": null,
							"start": 0,
							"count": 1 //,
							// "sort": []
						},
						true
					);
					if(series.kwArgs.sort){
						// sort is a complex object type and doesn't survive coercian
						kw.sort = lang.clone(series.kwArgs.sort);
					}
					lang.mixin(kw, {
						onComplete: function(data){
							var values;
							if("valueFn" in series.kwArgs){
								var fn = series.kwArgs.valueFn;
								values = arr.map(data, function(x){
									return fn(series.data.getValue(x, series.field, 0));
								});
							}else{
								values = arr.map(data, function(x){
									return series.data.getValue(x, series.field, 0);
								});
							}
							c.addSeries(series.name, values, series.kwArgs).render();
						}
					});
					series.data.fetch(kw);
				}
				return render;
			}, false);
			if(render){ c.render(); }
		},
		destroy: function(){
			// summary: properly destroy the widget
			this.chart.destroy();
			this.inherited(arguments);
		},
		resize: function(box){
			//	summary:
			//		Resize the widget.
			//	description:
			//		Resize the domNode and the widget surface to the dimensions of a box of the following form:
			//			`{ l: 50, t: 200, w: 300: h: 150 }`
			//		If no box is provided, resize the surface to the marginBox of the domNode.
			//	box:
			//		If passed, denotes the new size of the widget.
			this.chart.resize(box);
		}
	});
	
	collectParams = function(node, type, kw){
		var dp = eval("(" + type + ".prototype.defaultParams)");
		var x, attr;
		for(x in dp){
			if(x in kw){ continue; }
			attr = node.getAttribute(x);
			kw[x] = du.coerceType(dp[x], attr == null || typeof attr == "undefined" ? dp[x] : attr);
		}
		var op = eval("(" + type + ".prototype.optionalParams)");
		for(x in op){
			if(x in kw){ continue; }
			attr = node.getAttribute(x);
			if(attr != null){
				kw[x] = du.coerceType(op[x], attr);
			}
		}
	};
	
	collectAxisParams = function(node){
		var name = node.getAttribute("name"), type = node.getAttribute("type");
		if(!name){ return null; }
		var o = {name: name, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dc.axis2d[type]){
				type = dojo._scopeName + "x.charting.axis2d." + type;
			}
			var axis = eval("(" + type + ")");
			if(axis){ kw.type = axis; }
		}else{
			type = dojo._scopeName + "x.charting.axis2d.Default";
		}
		collectParams(node, type, kw);
		// compatibility conversions
		if(kw.font || kw.fontColor){
			if(!kw.tick){
				kw.tick = {};
			}
			if(kw.font){
				kw.tick.font = kw.font;
			}
			if(kw.fontColor){
				kw.tick.fontColor = kw.fontColor;
			}
		}
		return o;
	};
	
	collectPlotParams = function(node){
		// var name = d.attr(node, "name"), type = d.attr(node, "type");
		var name = node.getAttribute("name"), type = node.getAttribute("type");
		if(!name){ return null; }
		var o = {name: name, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dc.plot2d && dc.plot2d[type]){
				type = dojo._scopeName + "x.charting.plot2d." + type;
			}
			var plot = eval("(" + type + ")");
			if(plot){ kw.type = plot; }
		}else{
			type = dojo._scopeName + "x.charting.plot2d.Default";
		}
		collectParams(node, type, kw);
		return o;
	};
	
	collectActionParams = function(node){
		// var plot = d.attr(node, "plot"), type = d.attr(node, "type");
		var plot = node.getAttribute("plot"), type = node.getAttribute("type");
		if(!plot){ plot = "default"; }
		var o = {plot: plot, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dc.action2d[type]){
				type = dojo._scopeName + "x.charting.action2d." + type;
			}
			var action = eval("(" + type + ")");
			if(!action){ return null; }
			o.action = action;
		}else{
			return null;
		}
		collectParams(node, type, kw);
		return o;
	};

	collectDataParams = function(node){
		var ga = lang.partial(html.attr, node);
		var name = ga("name");
		if(!name){ return null; }
		var o = { name: name, kwArgs: {} }, kw = o.kwArgs, t;
		t = ga("plot");
		if(t != null){ kw.plot = t; }
		t = ga("marker");
		if(t != null){ kw.marker = t; }
		t = ga("stroke");
		if(t != null){ kw.stroke = eval("(" + t + ")"); }
		t = ga("outline");
		if(t != null){ kw.outline = eval("(" + t + ")"); }
		t = ga("shadow");
		if(t != null){ kw.shadow = eval("(" + t + ")"); }
		t = ga("fill");
		if(t != null){ kw.fill = eval("(" + t + ")"); }
		t = ga("font");
		if(t != null){ kw.font = t; }
		t = ga("fontColor");
		if(t != null){ kw.fontColor = eval("(" + t + ")"); }
		t = ga("legend");
		if(t != null){ kw.legend = t; }
		t = ga("data");
		if(t != null){
			o.type = "data";
			o.data = t ? arr.map(String(t).split(','), Number) : [];
			return o;
		}
		t = ga("array");
		if(t != null){
			o.type = "data";
			o.data = eval("(" + t + ")");
			return o;
		}
		t = ga("store");
		if(t != null){
			o.type = "store";
			o.data = eval("(" + t + ")");
			t = ga("field");
			o.field = t != null ? t : "value";
			t = ga("query");
			if(!!t){ kw.query = t; }
			t = ga("queryOptions");
			if(!!t){ kw.queryOptions = eval("(" + t + ")"); }
			t = ga("start");
			if(!!t){ kw.start = Number(t); }
			t = ga("count");
			if(!!t){ kw.count = Number(t); }
			t = ga("sort");
			if(!!t){ kw.sort = eval("("+t+")"); }
			t = ga("valueFn");
			if(!!t){ kw.valueFn = dfl.lambda(t); }
			return o;
		}
		return null;
	};
	
	return ChartWidget;
});

},
'dojox/charting/action2d/_IndicatorElement':function(){
define("dojox/charting/action2d/_IndicatorElement", ["dojo/_base/lang", "dojo/_base/declare", "../Element", "../plot2d/common", 
    "../axis2d/common", "dojox/gfx"], 
	function(lang, declare, Element, dcpc, dcac, gfx){ 

	// all the code below should be removed when http://trac.dojotoolkit.org/ticket/11299 will be available
	var getBoundingBox = function(shape){
		return getTextBBox(shape, shape.getShape().text);
	};
	var getTextBBox = function(s, t){
		var c = s.declaredClass;
		if (c.indexOf("svg")!=-1){
			// try/catch the FF native getBBox error. cheaper than walking up in the DOM
			// hierarchy to check the conditions (bench show /10 )
			try {
				return lang.mixin({}, s.rawNode.getBBox());
			}catch (e){
				return null;
			}
		}else if(c.indexOf("vml")!=-1){
			var rawNode = s.rawNode, _display = rawNode.style.display;
			rawNode.style.display = "inline";
			var w = gfx.pt2px(parseFloat(rawNode.currentStyle.width));
			var h = gfx.pt2px(parseFloat(rawNode.currentStyle.height));
			var sz = {x: 0, y: 0, width: w, height: h};
			// in VML, the width/height we get are in view coordinates
			// in our case we don't zoom the view so that is ok
			// It's impossible to get the x/y from the currentStyle.left/top,
			// because all negative coordinates are 'clipped' to 0.
			// (x:0 + translate(-100) -> x=0
			computeLocation(s, sz);
			rawNode.style.display = _display;
			return sz;
		}else if(c.indexOf("silverlight")!=-1){
			var bb = {width: s.rawNode.actualWidth, height: s.rawNode.actualHeight};
			return computeLocation(s, bb, 0.75);
		}else if(s.getTextWidth){
			// canvas
			var w = s.getTextWidth();
			var font = s.getFont();
			var fz = font ? font.size : gfx.defaultFont.size;
			var h = gfx.normalizedLength(fz);
			sz = {width: w, height: h};
			computeLocation(s, sz, 0.75);
			return sz;
		}
	};
	var computeLocation =  function(s, sz, coef){
		var width = sz.width, height = sz.height, sh = s.getShape(), align = sh.align;
		switch (align) {
		case "end":
			sz.x = sh.x - width;
			break;
		case "middle":
			sz.x = sh.x - width / 2;
			break;
		case "start":
		default:
			sz.x = sh.x;
		break;
		}
		coef = coef || 1;
		sz.y = sh.y - height*coef; // rough approximation of the ascent!...
		return sz;
	};

	return declare("dojox.charting.action2d._IndicatorElement",[Element], {
		//	summary:
		//		Internal element used by indicator actions.
		//	tags:
		//		private
		constructor: function(chart, kwArgs){
			if(!kwArgs){ kwArgs = {}; }
			this.inter = kwArgs.inter;
		},
		_updateVisibility: function(cp, limit, attr){
			var axis = attr=="x"?this.inter.plot._hAxis:this.inter.plot._vAxis;
			var scale = axis.getWindowScale();
			this.chart.setAxisWindow(axis.name, scale, axis.getWindowOffset() + (cp[attr] - limit[attr]) / scale);
			this._noDirty = true;
			this.chart.render();
			this._noDirty = false;
			if(!this._tracker){
				this.initTrack();
			}
		},
		_trackMove: function(){
			// let's update the selector
			this._updateIndicator(this.pageCoord);            
			// if we reached that point once, then we don't stop until mouse up
			if(this._initTrackPhase){
				this._initTrackPhase = false;
				this._tracker = setInterval(lang.hitch(this, this._trackMove), 100);
			}
		},
		initTrack: function(){
			this._initTrackPhase = true;
			this._tracker = setTimeout(lang.hitch(this, this._trackMove), 500);
		},
		stopTrack: function(){
			if(this._tracker){
				if(this._initTrackPhase){
					clearTimeout(this._tracker);					
				}else{
					clearInterval(this._tracker);
				}
				this._tracker = null;
			}
		},
		render: function(){
			if(!this.isDirty()){
				return;
			}

			this.cleanGroup();

			if (!this.pageCoord){
				return;
			}
			
			this._updateIndicator(this.pageCoord, this.secondCoord);
		},
		_updateIndicator: function(cp1, cp2){
			var inter = this.inter, plot = inter.plot, v = inter.opt.vertical;
			var hAxis = this.chart.getAxis(plot.hAxis), vAxis = this.chart.getAxis(plot.vAxis);
			var hn = hAxis.name, vn = vAxis.name, hb = hAxis.getScaler().bounds, vb = vAxis.getScaler().bounds;
			var attr = v?"x":"y", n = v?hn:vn, bounds = v?hb:vb;
			
			// sort data point
			if(cp2){
				var tmp;
				if(v){
					if(cp1.x>cp2.x){
						tmp = cp2;
						cp2 = cp1;
						cp1 = tmp;
					}
				}else{
					if(cp1.y>cp2.y){
						tmp = cp2;
						cp2 = cp1;
						cp1 = tmp;
					}		
				}
			}

			var cd1 = plot.toData(cp1), cd2;
			if(cp2){
				cd2 = plot.toData(cp2);
			}
			
			var o = {};
			o[hn] = hb.from;
			o[vn] = vb.from;
			var min = plot.toPage(o);
			o[hn] = hb.to;
			o[vn] = vb.to;
			var max = plot.toPage(o);
			
			if(cd1[n] < bounds.from){
				// do not autoscroll if dual indicator
				if(!cd2 && inter.opt.autoScroll){
					this._updateVisibility(cp1, min, attr);
					return;
				}else{
					cp1[attr] = min[attr];
				}
				// cp1 might have changed, let's update cd1
				cd1 = plot.toData(cp1);
			}else if(cd1[n] > bounds.to){
				if(!cd2 && inter.opt.autoScroll){
					this._updateVisibility(cp1, max, attr);
					return;
				}else{
					cp1[attr] = max[attr];
				}
				// cp1 might have changed, let's update cd1
				cd1 = plot.toData(cp1);
			}	
			
			var c1 = this._getData(cd1, attr, v), c2;

			if(c1.y == null){
				// we have no data for that point let's just return
				return;
			}

			if(cp2){
				if(cd2[n] < bounds.from){
					cp2[attr] = min[attr];
					cd2 = plot.toData(cp2);
				}else if(cd2[n] > bounds.to){
					cp2[attr] = max[attr];
					cd2 = plot.toData(cp2);	
				}
				c2 = this._getData(cd2, attr, v);
				if(c2.y == null){
					// we have no data for that point let's pretend we have a single touch point
					cp2 = null;
				}
			}
			
			var t1 = this._renderIndicator(c1, cp2?1:0, hn, vn, min, max);
			if(cp2){
				var t2 = this._renderIndicator(c2, 2, hn, vn, min, max);
				var delta = v?c2.y-c1.y:c2.x-c1.y;
				var text = inter.opt.labelFunc?inter.opt.labelFunc(c1, c2, inter.opt.fixed, inter.opt.precision):
					(dcpc.getLabel(delta, inter.opt.fixed, inter.opt.precision)+" ("+dcpc.getLabel(100*delta/(v?c1.y:c1.x), true, 2)+"%)");
				this._renderText(text, inter, this.chart.theme, v?(t1.x+t2.x)/2:t1.x, v?t1.y:(t1.y+t2.y)/2, c1, c2);
			};
			
		},
		_renderIndicator: function(coord, index, hn, vn, min, max){
			var t = this.chart.theme, c = this.chart.getCoords(), inter = this.inter, plot = inter.plot, v = inter.opt.vertical;
			
			var mark = {};
			mark[hn] = coord.x;
			mark[vn] = coord.y;
			mark = plot.toPage(mark);

			var cx = mark.x - c.x, cy = mark.y - c.y;
			var x1 = v?cx:min.x - c.x, y1 = v?min.y - c.y:cy, x2 = v?x1:max.x - c.x, y2 = v?max.y - c.y:y1;
			var sh = inter.opt.lineShadow?inter.opt.lineShadow:t.indicator.lineShadow,
					ls = inter.opt.lineStroke?inter.opt.lineStroke:t.indicator.lineStroke,
							ol = inter.opt.lineOutline?inter.opt.lineOutline:t.indicator.lineOutline;
			if(sh){
				this.group.createLine({x1: x1 + sh.dx, y1: y1 + sh.dy, x2: x2 + sh.dx, y2: y2 + sh.dy}).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createLine({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(ol);
			}
			this.group.createLine({x1: x1, y1: y1, x2: x2, y2: y2}).setStroke(ls);

			var ms = inter.opt.markerSymbol?inter.opt.markerSymbol:t.indicator.markerSymbol,
					path = "M" + cx + " " + cy + " " + ms;
			sh = inter.opt.markerShadow?inter.opt.markerShadow:t.indicator.markerShadow;
			ls = inter.opt.markerStroke?inter.opt.markerStroke:t.indicator.markerStroke;
			ol = inter.opt.markerOutline?inter.opt.markerOutline:t.indicator.markerOutline;
			if(sh){
				var sp = "M" + (cx + sh.dx) + " " + (cy + sh.dy) + " " + ms;
				this.group.createPath(sp).setFill(sh.color).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createPath(path).setStroke(ol);
			}

			var shape = this.group.createPath(path);
			var sf = this._shapeFill(inter.opt.markerFill?inter.opt.markerFill:t.indicator.markerFill, shape.getBoundingBox());
			shape.setFill(sf).setStroke(ls);

			if(index==0){
				var text = inter.opt.labelFunc?inter.opt.labelFunc(coord, null, inter.opt.fixed, inter.opt.precision):
					dcpc.getLabel(v?coord.y:coord.x, inter.opt.fixed, inter.opt.precision);
				this._renderText(text, inter, t, v?x1:x2+5, v?y2+5:y1, coord);
			}else{
				return v?{x: x1, y: y2+5}:{x: x2+5, y: y1};
			}
			
		},
		_renderText: function(text, inter, t, x, y, c1, c2){
			var label = dcac.createText.gfx(
					this.chart,
					this.group,
					x, y,
					"middle",
					text, inter.opt.font?inter.opt.font:t.indicator.font, inter.opt.fontColor?inter.opt.fontColor:t.indicator.fontColor);
			var b = getBoundingBox(label);
			b.x-=2; b.y-=1; b.width+=4; b.height+=2; b.r = inter.opt.radius?inter.opt.radius:t.indicator.radius;
			sh = inter.opt.shadow?inter.opt.shadow:t.indicator.shadow;
			ls = inter.opt.stroke?inter.opt.stroke:t.indicator.stroke;
			ol = inter.opt.outline?inter.opt.outline:t.indicator.outline;
			if(sh){
				this.group.createRect(b).setFill(sh.color).setStroke(sh);
			}
			if(ol){
				ol = dcpc.makeStroke(ol);
				ol.width = 2 * ol.width + ls.width;
				this.group.createRect(b).setStroke(ol);
			}
			var f = inter.opt.fillFunc?inter.opt.fillFunc(c1, c2):(inter.opt.fill?inter.opt.fill:t.indicator.fill);
			this.group.createRect(b).setFill(this._shapeFill(f, b)).setStroke(ls);
			label.moveToFront();
		},
		_getData: function(cd, attr, v){
			// we need to find which actual data point is "close" to the data value
			var data = this.chart.getSeries(this.inter.opt.series).data;
			// let's consider data are sorted because anyway rendering will be "weird" with unsorted data
			// i is an index in the array, which is different from a x-axis value even for index based data
			var i, r, l = data.length;
			for (i = 0; i < l; ++i){
				r = data[i];
				if(r == null){
					// move to next item
				}else if(typeof r == "number"){
					if(i + 1 > cd[attr]){
						break;
					}
				}else if(r[attr] > cd[attr]){
					break;
				}
			}
			var x,y,px,py;
			if(typeof r == "number"){
				x = i+1;
				y = r;
				if(i>0){
					px = i;
					py = data[i-1];
				}
			}else{
				x = r.x;
				y = r.y;
				if(i>0){
					px = data[i-1].x;
					py = data[i-1].y;
				}
			}
			if(i>0){
				var m = v?(x+px)/2:(y+py)/2;
				if(cd[attr]<=m){
					x = px;
					y = py;
				}
			}
			return {x: x, y: y};
		},
		cleanGroup: function(creator){
			//	summary:
			//		Clean any elements (HTML or GFX-based) out of our group, and create a new one.
			//	creator: dojox.gfx.Surface?
			//		An optional surface to work with.
			//	returns: dojox.charting.Element
			//		A reference to this object for functional chaining.
			this.inherited(arguments);
			// we always want to be above regular plots and not clipped
			this.group.moveToFront();
			return this;	//	dojox.charting.Element
		},
		clear: function(){
			//	summary:
			//		Clear out any parameters set on this plot.
			//	returns: dojox.charting.action2d._IndicatorElement
			//		The reference to this plot for functional chaining.
			this.dirty = true;
			return this;	//	dojox.charting.plot2d._IndicatorElement
		},
		getSeriesStats: function(){
			//	summary:
			//		Returns default stats (irrelevant for this type of plot).
			//	returns: Object
			//		{hmin, hmax, vmin, vmax} min/max in both directions.
			return lang.delegate(dcpc.defaultStats);
		},
		initializeScalers: function(){
			//	summary:
			//		Does nothing (irrelevant for this type of plot).
			return this;
		},
		isDirty: function(){
			//	summary:
			//		Return whether or not this plot needs to be redrawn.
			//	returns: Boolean
			//		If this plot needs to be rendered, this will return true.
			return !this._noDirty && (this.dirty || this.inter.plot.isDirty());
		}
	});
});

},
'dojox/charting/action2d/Shake':function(){
define("dojox/charting/action2d/Shake", ["dojo/_base/connect", "dojo/_base/declare", "./PlotAction", 
	"dojo/fx", "dojo/fx/easing", "dojox/gfx/matrix", "dojox/gfx/fx"], 
	function(hub, declare, PlotAction, df, dfe, m, gf){

	/*=====
	dojo.declare("dojox.charting.action2d.__ShakeCtorArgs", dojox.charting.action2d.__PlotActionCtorArgstorArgs, {
		//	summary:
		//		Additional arguments for highlighting actions.
	
		//	shift: Number?
		//		The amount in pixels to shift the pie slice.  Default is 3.
		shift: 3
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/

	var DEFAULT_SHIFT = 3;

	return declare("dojox.charting.action2d.Shake", PlotAction, {
		//	summary:
		//		Create a shaking action for use on an element in a chart.

		// the data description block for the widget parser
		defaultParams: {
			duration: 400,	// duration of the action in ms
			easing:   dfe.backOut,	// easing for the action
			shiftX:   DEFAULT_SHIFT,	// shift of the element along the X axis
			shiftY:   DEFAULT_SHIFT		// shift of the element along the Y axis
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the shaking action and connect it to the plot.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot this action is attached to.  If not passed, "default" is assumed.
			//	kwArgs: dojox.charting.action2d.__ShakeCtorArgs?
			//		Optional keyword arguments object for setting parameters.
			if(!kwArgs){ kwArgs = {}; }
			this.shiftX = typeof kwArgs.shiftX == "number" ? kwArgs.shiftX : DEFAULT_SHIFT;
			this.shiftY = typeof kwArgs.shiftY == "number" ? kwArgs.shiftY : DEFAULT_SHIFT;

			this.connect();
		},

		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the slice moving action.
			if(!o.shape || !(o.type in this.overOutEvents)){ return; }

			var runName = o.run.name, index = o.index, vector = [], anim,
				shiftX = o.type == "onmouseover" ? this.shiftX : -this.shiftX,
				shiftY = o.type == "onmouseover" ? this.shiftY : -this.shiftY;

			if(runName in this.anim){
				anim = this.anim[runName][index];
			}else{
				this.anim[runName] = {};
			}

			if(anim){
				anim.action.stop(true);
			}else{
				this.anim[runName][index] = anim = {};
			}

			var kwArgs = {
				shape:     o.shape,
				duration:  this.duration,
				easing:    this.easing,
				transform: [
					{name: "translate", start: [this.shiftX, this.shiftY], end: [0, 0]},
					m.identity
				]
			};
			if(o.shape){
				vector.push(gf.animateTransform(kwArgs));
			}
			if(o.oultine){
				kwArgs.shape = o.outline;
				vector.push(gf.animateTransform(kwArgs));
			}
			if(o.shadow){
				kwArgs.shape = o.shadow;
				vector.push(gf.animateTransform(kwArgs));
			}

			if(!vector.length){
				delete this.anim[runName][index];
				return;
			}

			anim.action = df.combine(vector);
			if(o.type == "onmouseout"){
				hub.connect(anim.action, "onEnd", this, function(){
					if(this.anim[runName]){
						delete this.anim[runName][index];
					}
				});
			}
			anim.action.play();
		}
	});
});

},
'dijit/Viewport':function(){
define("dijit/Viewport", [
	"dojo/Evented",
	"dojo/on",
	"dojo/ready",
	"dojo/_base/sniff",
	"dojo/_base/window", // global
	"dojo/window" // getBox()
], function(Evented, on, ready, has, win, winUtils){

	// module:
	//		dijit/Viewport

	/*=====
	return {
		// summary:
		//		Utility singleton to watch for viewport resizes, avoiding duplicate notifications
		//		which can lead to infinite loops.
		// description:
		//		Usage: Viewport.on("resize", myCallback).
		//
		//		myCallback() is called without arguments in case it's _WidgetBase.resize(),
		//		which would interpret the argument as the size to make the widget.
	};
	=====*/

	var Viewport = new Evented();

	var focusedNode;

	ready(200, function(){
		var oldBox = winUtils.getBox();
		Viewport._rlh = on(win.global, "resize", function(){
			var newBox = winUtils.getBox();
			if(oldBox.h == newBox.h && oldBox.w == newBox.w){ return; }
			oldBox = newBox;
			Viewport.emit("resize");
		});

		// Also catch zoom changes on IE8, since they don't naturally generate resize events
		if(has("ie") == 8){
			var deviceXDPI = screen.deviceXDPI;
			setInterval(function(){
				if(screen.deviceXDPI != deviceXDPI){
					deviceXDPI = screen.deviceXDPI;
					Viewport.emit("resize");
				}
			}, 500);
		}

		// On iOS, keep track of the focused node so we can guess when the keyboard is/isn't being displayed.
		if(has("ios")){
			on(document, "focusin", function(evt){
				focusedNode = evt.target;
			});
			on(document, "focusout", function(evt){
				focusedNode = null;
			});
		}
	});

	Viewport.getEffectiveBox = function(/*Document*/ doc){
		// summary:
		//		Get the size of the viewport, or on mobile devices, the part of the viewport not obscured by the
		//		virtual keyboard.

		var box = winUtils.getBox(doc);

		// Account for iOS virtual keyboard, if it's being shown.  Unfortunately no direct way to check or measure.
		var tag = focusedNode && focusedNode.tagName && focusedNode.tagName.toLowerCase();
		if(has("ios") && focusedNode && !focusedNode.readOnly && (tag == "textarea" || (tag == "input" &&
			/^(color|email|number|password|search|tel|text|url)$/.test(focusedNode.type)))){

			// Box represents the size of the viewport.  Some of the viewport is likely covered by the keyboard.
			// Estimate height of visible viewport assuming viewport goes to bottom of screen, but is covered by keyboard.
			box.h *= (orientation == 0 || orientation == 180 ? 0.66 : 0.40);

			// Above measurement will be inaccurate if viewport was scrolled up so far that it ends before the bottom
			// of the screen.   In this case, keyboard isn't covering as much of the viewport as we thought.
			// We know the visible size is at least the distance from the top of the viewport to the focused node.
			var rect = focusedNode.getBoundingClientRect();
			box.h = Math.max(box.h, rect.top + rect.height);
		}

		return box;
	};

	return Viewport;
});

},
'dojox/charting/StoreSeries':function(){
define("dojox/charting/StoreSeries", ["dojo/_base/array", "dojo/_base/declare", "dojo/_base/Deferred"], 
  function(arr, declare, Deferred){
	
	return declare("dojox.charting.StoreSeries", null, {
		constructor: function(store, kwArgs, value){
			//	summary:
			//		Series adapter for dojo object stores (dojo.store).
			//	store: Object:
			//		A dojo object store.
			//	kwArgs: Object:
			//		A store-specific keyword parameters used for querying objects.
			//		See dojo.store docs
			//	value: Function|Object|String|Null:
			//		Function, which takes an object handle, and
			//		produces an output possibly inspecting the store's item. Or
			//		a dictionary object, which tells what names to extract from
			//		an object and how to map them to an output. Or a string, which
			//		is a numeric field name to use for plotting. If undefined, null
			//		or empty string (the default), "value" field is extracted.
			this.store = store;
			this.kwArgs = kwArgs;
	
			if(value){
				if(typeof value == "function"){
					this.value = value;
				}else if(typeof value == "object"){
					this.value = function(object){
						var o = {};
						for(var key in value){
							o[key] = object[value[key]];
						}
						return o;
					};
				}else{
					this.value = function(object){
						return object[value];
					};
				}
			}else{
				this.value = function(object){
					return object.value;
				};
			}
	
			this.data = [];
	
			this.fetch();
		},
	
		destroy: function(){
			//	summary:
			//		Clean up before GC.
			if(this.observeHandle){
				this.observeHandle.cancel();
			}
		},
	
		setSeriesObject: function(series){
			//	summary:
			//		Sets a dojox.charting.Series object we will be working with.
			//	series: dojox.charting.Series:
			//		Our interface to the chart.
			this.series = series;
		},
	
		// store fetch loop
	
		fetch: function(){
			//	summary:
			//		Fetches data from the store and updates a chart.
			var objects = this.objects = [];
			var self = this;
			if(this.observeHandle){
				this.observeHandle.cancel();
			}
			var results = this.store.query(this.kwArgs.query, this.kwArgs);
			Deferred.when(results, function(objects){
				self.objects = objects;
				update();
			});
			if(results.observe){
				this.observeHandle = results.observe(update, true);
			}
			function update(){
				self.data = arr.map(self.objects, function(object){
					return self.value(object, self.store);
				});
				self._pushDataChanges();
			}
		},
	
		_pushDataChanges: function(){
			if(this.series){
				this.series.chart.updateSeries(this.series.name, this);
				this.series.chart.delayedRender();
			}
		}
	
	});
});

},
'dojox/charting/themes/Midwest':function(){
define("dojox/charting/themes/Midwest", ["../Theme", "./common"], function(Theme, themes){
	
	themes.Midwest=new Theme({
		colors: [
			"#927b51",
			"#a89166",
			"#80c31c",
			"#bcdd5a",
			"#aebc21"
		]
	});
	
	return themes.Midwest;
});

},
'dojox/charting/widget/SelectableLegend':function(){
define("dojox/charting/widget/SelectableLegend", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/declare", "dojo/query", "dojo/_base/html", 
		"dojo/_base/connect", "dojo/_base/Color", "./Legend", "dijit/form/CheckBox", "../action2d/Highlight",
		"dojox/lang/functional", "dojox/gfx/fx", "dojo/keys", "dojo/_base/event", "dojo/dom-construct",
		"dojo/dom-prop"], 
	function(lang, arrayUtil, declare, query, html, hub, Color, Legend, CheckBox, 
			 Highlight, df, fx, keys, event, dom, domProp){
/*=====
var Legend = dojox.charting.widget.Legend;
=====*/
	var FocusManager = declare(null, {
		//	summary:
		//		It will take legend as a tab stop, and using
		//		cursor keys to navigate labels within the legend.
		constructor: function(legend){
			this.legend = legend;
			this.index = 0;
			this.horizontalLength = this._getHrizontalLength();
			arrayUtil.forEach(legend.legends, function(item, i){
				if(i > 0){
					query("input", item).attr("tabindex", -1);
				}
			});
			this.firstLabel = query("input", legend.legends[0])[0];
			hub.connect(this.firstLabel, "focus", this, function(){this.legend.active = true;});
			hub.connect(this.legend.domNode, "keydown", this, "_onKeyEvent");
		},
		_getHrizontalLength: function(){
			var horizontal = this.legend.horizontal;
			if(typeof horizontal == "number"){
				return Math.min(horizontal, this.legend.legends.length);
			}else if(!horizontal){
				return 1;
			}else{
				return this.legend.legends.length;
			}
		},
		_onKeyEvent: function(e){
			//	if not focused
			if(!this.legend.active){
				return;
			}
			//	lose focus
			if(e.keyCode == keys.TAB){
				this.legend.active = false;
				return;
			}
			//	handle with arrow keys
			var max = this.legend.legends.length;
			switch(e.keyCode){
				case keys.LEFT_ARROW:
					this.index--;
					if(this.index < 0){
						this.index += max;
					}
					break;
				case keys.RIGHT_ARROW:
					this.index++;
					if(this.index >= max){
						this.index -= max;
					}
					break;
				case keys.UP_ARROW:
					if(this.index - this.horizontalLength >= 0){
						this.index -= this.horizontalLength;
					}
					break;
				case keys.DOWN_ARROW:
					if(this.index + this.horizontalLength < max){
						this.index += this.horizontalLength;
					}
					break;
				default:
					return;
			}
			this._moveToFocus();
			Event.stop(e);
		},
		_moveToFocus: function(){
			query("input", this.legend.legends[this.index])[0].focus();
		}
	});
			
	declare("dojox.charting.widget.SelectableLegend", Legend, {
		//	summary:
		//		An enhanced chart legend supporting interactive events on data series
		
		//	theme component
		outline:			false,	//	outline of vanished data series
		transitionFill:		null,	//	fill of deselected data series
		transitionStroke:	null,	//	stroke of deselected data series
		
		postCreate: function(){
			this.legends = [];
			this.legendAnim = {};
			this.inherited(arguments);
		},
		refresh: function(){
			this.legends = [];
			this.inherited(arguments);
			this._applyEvents();
			new FocusManager(this);
		},
		_addLabel: function(dyn, label){
			this.inherited(arguments);
			//	create checkbox
			var legendNodes = query("td", this.legendBody);
			var currentLegendNode = legendNodes[legendNodes.length - 1];
			this.legends.push(currentLegendNode);
			var checkbox = new CheckBox({checked: true});
			dom.place(checkbox.domNode, currentLegendNode, "first");
			// connect checkbox and existed label
			var label = query("label", currentLegendNode)[0];
			domProp.set(label, "for", checkbox.id);
		},
		_applyEvents: function(){
			// summary:
			//		Apply click-event on checkbox and hover-event on legend icon,
			//		highlight data series or toggle it.
			// if the chart has not yet been refreshed it will crash here (targetData.group == null)
			if(this.chart.dirty){
				return;
			}
			arrayUtil.forEach(this.legends, function(legend, i){
				var targetData, shapes = [], plotName, seriesName;
				if(this._isPie()){
					targetData = this.chart.stack[0];
					shapes.push(targetData.group.children[i]);
					plotName = targetData.name;
					seriesName = this.chart.series[0].name;
				}else{
					targetData = this.chart.series[i];
					shapes = targetData.group.children;
					plotName = targetData.plot;
					seriesName = targetData.name;
				}
				var originalDyn = {
					fills : df.map(shapes, "x.getFill()"),
					strokes: df.map(shapes, "x.getStroke()")
				};
				//	toggle action
				var legendCheckBox = query(".dijitCheckBox", legend)[0];
				hub.connect(legendCheckBox, "onclick", this, function(e){
					this._toggle(shapes, i, legend.vanished, originalDyn, seriesName, plotName);
					legend.vanished = !legend.vanished;
					e.stopPropagation();
				});
				
				//	highlight action
				var legendIcon = query(".dojoxLegendIcon", legend)[0],
					iconShape = this._getFilledShape(this._surfaces[i].children);
				arrayUtil.forEach(["onmouseenter", "onmouseleave"], function(event){
					hub.connect(legendIcon, event, this, function(e){
						this._highlight(e, iconShape, shapes, i, legend.vanished, originalDyn, seriesName, plotName);
					});
				}, this);
			},this);
		},
		_toggle: function(shapes, index, isOff, dyn, seriesName, plotName){
			arrayUtil.forEach(shapes, function(shape, i){
				var startFill = dyn.fills[i],
					endFill = this._getTransitionFill(plotName),
					startStroke = dyn.strokes[i],
					endStroke = this.transitionStroke;
				if(startFill){
					if(endFill && (typeof startFill == "string" || startFill instanceof Color)){
						fx.animateFill({
							shape: shape,
							color: {
								start: isOff ? endFill : startFill,
								end: isOff ? startFill : endFill
							}
						}).play();
					}else{
						shape.setFill(isOff ? startFill : endFill);
					}
				}
				if(startStroke && !this.outline){
					shape.setStroke(isOff ? startStroke : endStroke);
				}
			}, this);
		},
		_highlight: function(e, iconShape, shapes, index, isOff, dyn, seriesName, plotName){
			if(!isOff){
				var anim = this._getAnim(plotName),
					isPie = this._isPie(),
					type = formatEventType(e.type);
				//	highlight the label icon,
				var label = {
					shape: iconShape,
					index: isPie ? "legend" + index : "legend",
					run: {name: seriesName},
					type: type
				};
				anim.process(label);
				//	highlight the data items
				arrayUtil.forEach(shapes, function(shape, i){
					shape.setFill(dyn.fills[i]);
					var o = {
						shape: shape,
						index: isPie ? index : i,
						run: {name: seriesName},
						type: type
					};
					anim.duration = 100;
					anim.process(o);
				});
			}
		},
		_getAnim: function(plotName){
			if(!this.legendAnim[plotName]){
				this.legendAnim[plotName] = new Highlight(this.chart, plotName);
			}
			return this.legendAnim[plotName];
		},
		_getTransitionFill: function(plotName){
			// Since series of stacked charts all start from the base line,
			// fill the "front" series with plotarea color to make it disappear .
			if(this.chart.stack[this.chart.plots[plotName]].declaredClass.indexOf("dojox.charting.plot2d.Stacked") != -1){
				return this.chart.theme.plotarea.fill;
			}
			return null;
		},
		_getFilledShape: function(shapes){
			//	summary:
			//		Get filled shape in legend icon which would be highlighted when hovered
			var i = 0;
			while(shapes[i]){
				if(shapes[i].getFill())return shapes[i];
				i++;
			}
		},
		_isPie: function(){
			return this.chart.stack[0].declaredClass == "dojox.charting.plot2d.Pie";
		}
	});
	
	function formatEventType(type){
		if(type == "mouseenter")return "onmouseover";
		if(type == "mouseleave")return "onmouseout";
		return "on" + type;
	}

	return dojox.charting.widget.SelectableLegend;
});

},
'dojox/charting/themes/PlotKit/green':function(){
define("dojox/charting/themes/PlotKit/green", ["./base", "../../Theme"], function(pk, Theme){
	pk.green = pk.base.clone();
	pk.green.chart.fill = pk.green.plotarea.fill = "#eff5e6";
	pk.green.colors = Theme.defineColors({hue: 82, saturation: 60, low: 40, high: 88});
	
	return pk.green;
});

},
'dojox/gfx3d/_base':function(){
define("dojox/gfx3d/_base", ["dojo/_base/lang"],function(lang) {
	var gfx3d = lang.getObject("dojox.gfx3d",true);
	lang.mixin( gfx3d, {
		// summary: defines constants, prototypes, and utility functions
		
		// default objects, which are used to fill in missing parameters
		defaultEdges:	  {type: "edges",     style: null, points: []},
		defaultTriangles: {type: "triangles", style: null, points: []},
		defaultQuads:	  {type: "quads",     style: null, points: []},
		defaultOrbit:	  {type: "orbit",     center: {x: 0, y: 0, z: 0}, radius: 50},
		defaultPath3d:	  {type: "path3d",    path: []},
		defaultPolygon:	  {type: "polygon",   path: []},
		defaultCube:	  {type: "cube",      bottom: {x: 0, y: 0, z: 0}, top: {x: 100, y: 100, z: 100}},
		defaultCylinder:  {type: "cylinder",  center: /* center of bottom */ {x: 0, y: 0, z: 0}, height: 100, radius: 50}
	});
	return gfx3d;
});
},
'dojox/charting/themes/common':function(){
define("dojox/charting/themes/common", ["dojo/_base/lang"], function(lang){
	return lang.getObject("dojox.charting.themes", true);
});

},
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
'dojox/charting/themes/Tom':function(){
define("dojox/charting/themes/Tom", ["../Theme", "dojox/gfx/gradutils", "./common"], function(Theme, gradutils, themes){

	// created by Tom Trenka
	
	var g = Theme.generateGradient,
		defaultFill = {type: "linear", space: "shape", x1: 0, y1: 0, x2: 0, y2: 100};
	
	themes.Tom = new Theme({
		chart: {
			fill:      "#181818",
			stroke:    {color: "#181818"},
			pageStyle: {backgroundColor: "#181818", backgroundImage: "none", color: "#eaf2cb"}
		},
		plotarea: {
			fill: "#181818"
		},
		axis:{
			stroke:	{ // the axis itself
				color: "#a0a68b",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#888c76",
				position:  "center",
				font:      "normal normal normal 7pt Helvetica, Arial, sans-serif",	// labels on axis
				fontColor: "#888c76"	// color of labels
			}
		},
		series: {
			stroke:  {width: 2.5, color: "#eaf2cb"},
			outline: null,
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#eaf2cb"
		},
		marker: {
			stroke:  {width: 1.25, color: "#eaf2cb"},
			outline: {width: 1.25, color: "#eaf2cb"},
			font: "normal normal normal 8pt Helvetica, Arial, sans-serif",
			fontColor: "#eaf2cb"
		},
		seriesThemes: [
			{fill: g(defaultFill, "#bf9e0a", "#ecc20c")},
			{fill: g(defaultFill, "#73b086", "#95e5af")},
			{fill: g(defaultFill, "#c7212d", "#ed2835")},
			{fill: g(defaultFill, "#87ab41", "#b6e557")},
			{fill: g(defaultFill, "#b86c25", "#d37d2a")}
		],
		markerThemes: [
			{fill: "#bf9e0a", stroke: {color: "#ecc20c"}},
			{fill: "#73b086", stroke: {color: "#95e5af"}},
			{fill: "#c7212d", stroke: {color: "#ed2835"}},
			{fill: "#87ab41", stroke: {color: "#b6e557"}},
			{fill: "#b86c25", stroke: {color: "#d37d2a"}}
		]
	});
	
	themes.Tom.next = function(elementType, mixin, doPost){
		var isLine = elementType == "line";
		if(isLine || elementType == "area"){
			// custom processing for lines: substitute colors
			var s = this.seriesThemes[this._current % this.seriesThemes.length];
			s.fill.space = "plot";
			if(isLine){
				s.stroke  = { width: 4, color: s.fill.colors[0].color};
			}
			var theme = Theme.prototype.next.apply(this, arguments);
			// cleanup
			delete s.outline;
			delete s.stroke;
			s.fill.space = "shape";
			return theme;
		}
		return Theme.prototype.next.apply(this, arguments);
	};
	
	themes.Tom.post = function(theme, elementType){
		theme = Theme.prototype.post.apply(this, arguments);
		if((elementType == "slice" || elementType == "circle") && theme.series.fill && theme.series.fill.type == "radial"){
			theme.series.fill = gradutils.reverse(theme.series.fill);
		}
		return theme;
	};
	
	return themes.Tom;
});

},
'dojox/gfx3d/vector':function(){
define("dojox/gfx3d/vector", ["dojo/_base/lang", "dojo/_base/array", "./_base"],function(lang, arrayUtil, gfx3d) {

gfx3d.vector =  {
	
	sum: function(){
		// summary: sum of the vectors
		var v = {x: 0, y: 0, z:0};
		arrayUtil.forEach(arguments, function(item){ v.x += item.x; v.y += item.y; v.z += item.z; });
		return v;
	},

	center: function(){
		// summary: center of the vectors
		var l = arguments.length;
		if(l == 0){
			return {x: 0, y: 0, z: 0};
		}
		var v = gfx3d.vector.sum(arguments);
		return {x: v.x/l, y: v.y/l, z: v.z/l};
	},

	substract: function(/* Pointer */a, /* Pointer */b){
		return  {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z};
	},

	_crossProduct: function(x, y, z, u, v, w){
		// summary: applies a cross product of two vectorss, (x, y, z) and (u, v, w)
		// x: Number: an x coordinate of a point
		// y: Number: a y coordinate of a point
		// z: Number: a z coordinate of a point
		// u: Number: an x coordinate of a point
		// v: Number: a y coordinate of a point
		// w: Number: a z coordinate of a point
		return {x: y * w - z * v, y: z * u - x * w, z: x * v - y * u}; // Object
	},

	crossProduct: function(/* Number||Point */ a, /* Number||Point */ b, /* Number, optional */ c, /* Number, optional */ d, /* Number, optional */ e, /* Number, optional */ f){
		// summary: applies a matrix to a point
		// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
		// a: Number: an x coordinate of a point
		// b: Number: a y coordinate of a point
		// c: Number: a z coordinate of a point
		// d: Number: an x coordinate of a point
		// e: Number: a y coordinate of a point
		// f: Number: a z coordinate of a point
		if(arguments.length == 6 && arrayUtil.every(arguments, function(item){ return typeof item == "number"; })){
			return gfx3d.vector._crossProduct(a, b, c, d, e, f); // Object
		}
		// branch
		// a: Object: a point
		// b: Object: a point
		// c: null
		// d: null
		// e: null
		// f: null
		return gfx3d.vector._crossProduct(a.x, a.y, a.z, b.x, b.y, b.z); // Object
	},

	_dotProduct: function(x, y, z, u, v, w){
		// summary: applies a cross product of two vectorss, (x, y, z) and (u, v, w)
		// x: Number: an x coordinate of a point
		// y: Number: a y coordinate of a point
		// z: Number: a z coordinate of a point
		// u: Number: an x coordinate of a point
		// v: Number: a y coordinate of a point
		// w: Number: a z coordinate of a point
		return x * u + y * v + z * w; // Number
	},
	dotProduct: function(/* Number||Point */ a, /* Number||Point */ b, /* Number, optional */ c, /* Number, optional */ d, /* Number, optional */ e, /* Number, optional */ f){
		// summary: applies a matrix to a point
		// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
		// a: Number: an x coordinate of a point
		// b: Number: a y coordinate of a point
		// c: Number: a z coordinate of a point
		// d: Number: an x coordinate of a point
		// e: Number: a y coordinate of a point
		// f: Number: a z coordinate of a point
		if(arguments.length == 6 && arrayUtil.every(arguments, function(item){ return typeof item == "number"; })){
			return gfx3d.vector._dotProduct(a, b, c, d, e, f); // Object
		}
		// branch
		// a: Object: a point
		// b: Object: a point
		// c: null
		// d: null
		// e: null
		// f: null
		return gfx3d.vector._dotProduct(a.x, a.y, a.z, b.x, b.y, b.z); // Object
	},

	normalize: function(/* Point||Array*/ a, /* Point */ b, /* Point */ c){
		// summary: find the normal of the implicit surface
		// a: Object: a point
		// b: Object: a point
		// c: Object: a point
		var l, m, n;
		if(a instanceof Array){
			l = a[0]; m = a[1]; n = a[2];
		}else{
			l = a; m = b; n = c;
		}

		var u = gfx3d.vector.substract(m, l);
		var v = gfx3d.vector.substract(n, l);
		return gfx3d.vector.crossProduct(u, v);
	}
};
	return gfx3d.vector;
});

},
'dojox/charting/plot2d/MarkersOnly':function(){
define("dojox/charting/plot2d/MarkersOnly", ["dojo/_base/declare", "./Default"], function(declare, Default){
/*=====
var Default = dojox.charting.plot2d.Default;
=====*/
	return declare("dojox.charting.plot2d.MarkersOnly", Default, {
		//	summary:
		//		A convenience object to draw only markers (like a scatter but not quite).
		constructor: function(){
			//	summary:
			//		Set up our default plot to only have markers and no lines.
			this.opt.lines   = false;
			this.opt.markers = true;
		}
	});
});

},
'dijit/form/_ToggleButtonMixin':function(){
define("dijit/form/_ToggleButtonMixin", [
	"dojo/_base/declare", // declare
	"dojo/dom-attr" // domAttr.set
], function(declare, domAttr){

// module:
//		dijit/form/_ToggleButtonMixin
// summary:
//		A mixin to provide functionality to allow a button that can be in two states (checked or not).

return declare("dijit.form._ToggleButtonMixin", null, {
	// summary:
	//		A mixin to provide functionality to allow a button that can be in two states (checked or not).

	// checked: Boolean
	//		Corresponds to the native HTML <input> element's attribute.
	//		In markup, specified as "checked='checked'" or just "checked".
	//		True if the button is depressed, or the checkbox is checked,
	//		or the radio button is selected, etc.
	checked: false,

	// aria-pressed for toggle buttons, and aria-checked for checkboxes
	_aria_attr: "aria-pressed",

	_onClick: function(/*Event*/ evt){
		var original = this.checked;
		this._set('checked', !original); // partially set the toggled value, assuming the toggle will work, so it can be overridden in the onclick handler
		var ret = this.inherited(arguments); // the user could reset the value here
		this.set('checked', ret ? this.checked : original); // officially set the toggled or user value, or reset it back
		return ret;
	},

	_setCheckedAttr: function(/*Boolean*/ value, /*Boolean?*/ priorityChange){
		this._set("checked", value);
		domAttr.set(this.focusNode || this.domNode, "checked", value);
		(this.focusNode || this.domNode).setAttribute(this._aria_attr, value ? "true" : "false"); // aria values should be strings
		this._handleOnChange(value, priorityChange);
	},

	reset: function(){
		// summary:
		//		Reset the widget's value to what it was at initialization time

		this._hasBeenBlurred = false;

		// set checked state to original setting
		this.set('checked', this.params.checked || false);
	}
});

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
'dojo/touch':function(){
define("dojo/touch", ["./_base/kernel", "./aspect", "./dom", "./on", "./has", "./mouse", "./domReady", "./_base/window"],
function(dojo, aspect, dom, on, has, mouse, domReady, win){

	// module:
	//		dojo/touch

	var hasTouch = has("touch");

	// TODO: get iOS version from dojo/sniff after #15827 is fixed
	var ios4 = false;
	if(has("ios")){
		var ua = navigator.userAgent;
		var v = ua.match(/OS ([\d_]+)/) ? RegExp.$1 : "1";
		var os = parseFloat(v.replace(/_/, '.').replace(/_/g, ''));
		ios4 = os < 5;
	}

	// Time of most recent touchstart or touchmove event
	var lastTouch;

	function dualEvent(mouseType, touchType){
		// Returns synthetic event that listens for both the specified mouse event and specified touch event.
		// But ignore fake mouse events that were generated due to the user touching the screen.
		if(hasTouch){
			return function(node, listener){
				var handle1 = on(node, touchType, listener),
					handle2 = on(node, mouseType, function(evt){
						if(!lastTouch || (new Date()).getTime() > lastTouch + 1000){
							listener.call(this, evt);
						}
					});
				return {
					remove: function(){
						handle1.remove();
						handle2.remove();
					}
				};
			};
		}else{
			// Avoid creating listeners for touch events on performance sensitive older browsers like IE6
			return function(node, listener){
				return on(node, mouseType, listener);
			}
		}
	}

	var touchmove, hoveredNode;

	if(hasTouch){
		domReady(function(){
			// Keep track of currently hovered node
			hoveredNode = win.body();	// currently hovered node

			win.doc.addEventListener("touchstart", function(evt){
				lastTouch = (new Date()).getTime();

				// Precede touchstart event with touch.over event.  DnD depends on this.
				// Use addEventListener(cb, true) to run cb before any touchstart handlers on node run,
				// and to ensure this code runs even if the listener on the node does event.stop().
				var oldNode = hoveredNode;
				hoveredNode = evt.target;
				on.emit(oldNode, "dojotouchout", {
					target: oldNode,
					relatedTarget: hoveredNode,
					bubbles: true
				});
				on.emit(hoveredNode, "dojotouchover", {
					target: hoveredNode,
					relatedTarget: oldNode,
					bubbles: true
				});
			}, true);

			// Fire synthetic touchover and touchout events on nodes since the browser won't do it natively.
			on(win.doc, "touchmove", function(evt){
				lastTouch = (new Date()).getTime();

				var newNode = win.doc.elementFromPoint(
					evt.pageX - (ios4 ? 0 : win.global.pageXOffset), // iOS 4 expects page coords
					evt.pageY - (ios4 ? 0 : win.global.pageYOffset)
				);
				if(newNode && hoveredNode !== newNode){
					// touch out on the old node
					on.emit(hoveredNode, "dojotouchout", {
						target: hoveredNode,
						relatedTarget: newNode,
						bubbles: true
					});

					// touchover on the new node
					on.emit(newNode, "dojotouchover", {
						target: newNode,
						relatedTarget: hoveredNode,
						bubbles: true
					});

					hoveredNode = newNode;
				}
			});
		});

		// Define synthetic touch.move event that unlike the native touchmove, fires for the node the finger is
		// currently dragging over rather than the node where the touch started.
		touchmove = function(node, listener){
			return on(win.doc, "touchmove", function(evt){
				if(node === win.doc || dom.isDescendant(hoveredNode, node)){
					evt.target = hoveredNode;
					listener.call(this, evt);
				}
			});
		};
	}


	//device neutral events - touch.press|move|release|cancel/over/out
	var touch = {
		press: dualEvent("mousedown", "touchstart"),
		move: dualEvent("mousemove", touchmove),
		release: dualEvent("mouseup", "touchend"),
		cancel: dualEvent(mouse.leave, "touchcancel"),
		over: dualEvent("mouseover", "dojotouchover"),
		out: dualEvent("mouseout", "dojotouchout"),
		enter: mouse._eventHandler(dualEvent("mouseover","dojotouchover")),
		leave: mouse._eventHandler(dualEvent("mouseout", "dojotouchout"))
	};

	/*=====
	touch = {
		// summary:
		//		This module provides unified touch event handlers by exporting
		//		press, move, release and cancel which can also run well on desktop.
		//		Based on http://dvcs.w3.org/hg/webevents/raw-file/tip/touchevents.html
		//
		// example:
		//		Used with dojo.on
		//		|	define(["dojo/on", "dojo/touch"], function(on, touch){
		//		|		on(node, touch.press, function(e){});
		//		|		on(node, touch.move, function(e){});
		//		|		on(node, touch.release, function(e){});
		//		|		on(node, touch.cancel, function(e){});
		// example:
		//		Used with touch.* directly
		//		|	touch.press(node, function(e){});
		//		|	touch.move(node, function(e){});
		//		|	touch.release(node, function(e){});
		//		|	touch.cancel(node, function(e){});

		press: function(node, listener){
			// summary:
			//		Register a listener to 'touchstart'|'mousedown' for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		move: function(node, listener){
			// summary:
			//		Register a listener to 'touchmove'|'mousemove' for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		release: function(node, listener){
			// summary:
			//		Register a listener to 'touchend'|'mouseup' for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		cancel: function(node, listener){
			// summary:
			//		Register a listener to 'touchcancel'|'mouseleave' for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		over: function(node, listener){
			// summary:
			//		Register a listener to 'mouseover' or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		out: function(node, listener){
			// summary:
			//		Register a listener to 'mouseout' or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		enter: function(node, listener){
			// summary:
			//		Register a listener to mouse.enter or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		},
		leave: function(node, listener){
			// summary:
			//		Register a listener to mouse.leave or touch equivalent for the given node
			// node: Dom
			//		Target node to listen to
			// listener: Function
			//		Callback function
			// returns:
			//		A handle which will be used to remove the listener by handle.remove()
		}
	};
	=====*/

	1 && (dojo.touch = touch);

	return touch;
});

},
'dojox/gfx3d/matrix':function(){
define("dojox/gfx3d/matrix", ["dojo/_base/lang", "./_base"], function(lang, gfx3d){
	
	// candidates for dojox.math:
	gfx3d.matrix = {
		_degToRad : function(degree){ return Math.PI * degree / 180; },
		_radToDeg : function(radian){ return radian / Math.PI * 180; }
	};
	
	gfx3d.matrix.Matrix3D = function(arg){
		// summary: a 3D matrix object
		// description: Normalizes a 3D matrix-like object. If arrays is passed,
		//		all objects of the array are normalized and multiplied sequentially.
		// arg: Object
		//		a 3D matrix-like object, a number, or an array of such objects
		if(arg){
			if(typeof arg == "number"){
				this.xx = this.yy = this.zz = arg;
			}else if(arg instanceof Array){
				if(arg.length > 0){
					var m = gfx3d.matrix.normalize(arg[0]);
					// combine matrices
					for(var i = 1; i < arg.length; ++i){
						var l = m;
						var r = gfx3d.matrix.normalize(arg[i]);
						m = new gfx3d.matrix.Matrix3D();
						m.xx = l.xx * r.xx + l.xy * r.yx + l.xz * r.zx;
						m.xy = l.xx * r.xy + l.xy * r.yy + l.xz * r.zy;
						m.xz = l.xx * r.xz + l.xy * r.yz + l.xz * r.zz;
						m.yx = l.yx * r.xx + l.yy * r.yx + l.yz * r.zx;
						m.yy = l.yx * r.xy + l.yy * r.yy + l.yz * r.zy;
						m.yz = l.yx * r.xz + l.yy * r.yz + l.yz * r.zz;
						m.zx = l.zx * r.xx + l.zy * r.yx + l.zz * r.zx;
						m.zy = l.zx * r.xy + l.zy * r.yy + l.zz * r.zy;
						m.zz = l.zx * r.xz + l.zy * r.yz + l.zz * r.zz;
						m.dx = l.xx * r.dx + l.xy * r.dy + l.xz * r.dz + l.dx;
						m.dy = l.yx * r.dx + l.yy * r.dy + l.yz * r.dz + l.dy;
						m.dz = l.zx * r.dx + l.zy * r.dy + l.zz * r.dz + l.dz;
					}
					lang.mixin(this, m);
				}
			}else{
				lang.mixin(this, arg);
			}
		}
	};
	
	// the default (identity) matrix, which is used to fill in missing values
	lang.extend(gfx3d.matrix.Matrix3D, {xx: 1, xy: 0, xz: 0, yx: 0, yy: 1, yz: 0, zx: 0, zy: 0, zz: 1, dx: 0, dy: 0, dz: 0});
	
	lang.mixin(gfx3d.matrix, {
		// summary: class constants, and methods of dojox.gfx3d.matrix
		
		// matrix constants
		
		// identity: dojox.gfx3d.matrix.Matrix3D
		//		an identity matrix constant: identity * (x, y, z) == (x, y, z)
		identity: new gfx3d.matrix.Matrix3D(),
		
		// matrix creators
		
		translate: function(a, b, c){
			// summary: forms a translation matrix
			// description: The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value
			// c: Number: a z coordinate value
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({dx: a, dy: b, dz: c}); // dojox.gfx3d.matrix.Matrix3D
			}
			// branch
			// a: Object: a point-like object, which specifies offsets for 3 dimensions
			// b: null
			return new gfx3d.matrix.Matrix3D({dx: a.x, dy: a.y, dz: a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		scale: function(a, b, c){
			// summary: forms a scaling matrix
			// description: The resulting matrix is used to scale (magnify) points by specified offsets.
			// a: Number: a scaling factor used for the x coordinate
			// b: Number: a scaling factor used for the y coordinate
			// c: Number: a scaling factor used for the z coordinate
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({xx: a, yy: b, zz: c}); // dojox.gfx3d.matrix.Matrix3D
			}
			if(typeof a == "number"){
				// branch
				// a: Number: a uniform scaling factor used for the all coordinates
				// b: null
				return new gfx3d.matrix.Matrix3D({xx: a, yy: a, zz: a}); // dojox.gfx3d.matrix.Matrix3D
			}
			// branch
			// a: Object: a point-like object, which specifies scale factors for 3 dimensions
			// b: null
			return new gfx3d.matrix.Matrix3D({xx: a.x, yy: a.y, zz: a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateX: function(angle){
			// summary: forms a rotating matrix (about the x axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({yy: c, yz: -s, zy: s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateXg: function(degree){
			// summary: forms a rotating matrix (about the x axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateX() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateX(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateY: function(angle){
			// summary: forms a rotating matrix (about the y axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xz: s, zx: -s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateYg: function(degree){
			// summary: forms a rotating matrix (about the y axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateY() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateY(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateZ: function(angle){
			// summary: forms a rotating matrix (about the z axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateZg: function(degree){
			// summary: forms a rotating matrix (about the z axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateZ() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateZ(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
	
		// camera transformation
		cameraTranslate: function(a, b, c){
			// summary: forms a translation matrix
			// description: The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value
			// c: Number: a z coordinate value
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({dx: -a, dy: -b, dz: -c}); // dojox.gfx3d.matrix.Matrix3D
			}
			// branch
			// a: Object: a point-like object, which specifies offsets for 3 dimensions
			// b: null
			return new gfx3d.matrix.Matrix3D({dx: -a.x, dy: -a.y, dz: -a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateX: function(angle){
			// summary: forms a rotating matrix (about the x axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({yy: c, yz: -s, zy: s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateXg: function(degree){
			// summary: forms a rotating matrix (about the x axis)in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateX() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateX(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateY: function(angle){
			// summary: forms a rotating matrix (about the y axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xz: s, zx: -s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateYg: function(degree){
			// summary: forms a rotating matrix (about the y axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateY() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateY(dojox.gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateZ: function(angle){
			// summary: forms a rotating matrix (about the z axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateZg: function(degree){
			// summary: forms a rotating matrix (about the z axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateZ() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateZ(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
	
		// ensure matrix 3D conformance
		normalize: function(matrix){
			// summary: converts an object to a matrix, if necessary
			// description: Converts any 3D matrix-like object or an array of
			//		such objects to a valid dojox.gfx3d.matrix.Matrix3D object.
			// matrix: Object: an object, which is converted to a matrix, if necessary
			return (matrix instanceof gfx3d.matrix.Matrix3D) ? matrix : new gfx3d.matrix.Matrix3D(matrix); // dojox.gfx3d.matrix.Matrix3D
		},
		
		// common operations
		
		clone: function(matrix){
			// summary: creates a copy of a 3D matrix
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix-like object to be cloned
			var obj = new gfx3d.matrix.Matrix3D();
			for(var i in matrix){
				if(typeof(matrix[i]) == "number" && typeof(obj[i]) == "number" && obj[i] != matrix[i]) obj[i] = matrix[i];
			}
			return obj; // dojox.gfx3d.matrix.Matrix3D
		},
		invert: function(matrix){
			// summary: inverts a 2D matrix
			// matrix: dojox.gfx.matrix.Matrix3D: a 2D matrix-like object to be inverted
			var m = gfx3d.matrix.normalize(matrix);
			var D = m.xx * m.yy * m.zz + m.xy * m.yz * m.zx + m.xz * m.yx * m.zy - m.xx * m.yz * m.zy - m.xy * m.yx * m.zz - m.xz * m.yy * m.zx;
			var M = new gfx3d.matrix.Matrix3D({
				xx: (m.yy * m.zz - m.yz * m.zy) / D,
				xy: (m.xz * m.zy - m.xy * m.zz) / D,
				xz: (m.xy * m.yz - m.xz * m.yy) / D,
				yx: (m.yz * m.zx - m.yx * m.zz) / D,
				yy: (m.xx * m.zz - m.xz * m.zx) / D,
				yz: (m.xz * m.yx - m.xx * m.yz) / D,
				zx: (m.yx * m.zy - m.yy * m.zx) / D,
				zy: (m.xy * m.zx - m.xx * m.zy) / D,
				zz: (m.xx * m.yy - m.xy * m.yx) / D,
				dx: -1 * (m.xy * m.yz * m.dz + m.xz * m.dy * m.zy + m.dx * m.yy * m.zz - m.xy * m.dy * m.zz - m.xz * m.yy * m.dz - m.dx * m.yz * m.zy) / D,
				dy: (m.xx * m.yz * m.dz + m.xz * m.dy * m.zx + m.dx * m.yx * m.zz - m.xx * m.dy * m.zz - m.xz * m.yx * m.dz - m.dx * m.yz * m.zx) / D,
				dz: -1 * (m.xx * m.yy * m.dz + m.xy * m.dy * m.zx + m.dx * m.yx * m.zy - m.xx * m.dy * m.zy - m.xy * m.yx * m.dz - m.dx * m.yy * m.zx) / D
			});
			return M; // dojox.gfx3d.matrix.Matrix3D
		},
		_multiplyPoint: function(m, x, y, z){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// x: Number: an x coordinate of a point
			// y: Number: a y coordinate of a point
			// z: Number: a z coordinate of a point
			return {x: m.xx * x + m.xy * y + m.xz * z + m.dx, y: m.yx * x + m.yy * y + m.yz * z + m.dy, z: m.zx * x + m.zy * y + m.zz * z + m.dz}; // Object
		},
		multiplyPoint: function(matrix, /* Number||Point */ a, /* Number, optional */ b, /* Number, optional */ c){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Number: an x coordinate of a point
			// b: Number: a y coordinate of a point
			// c: Number: a z coordinate of a point
			var m = gfx3d.matrix.normalize(matrix);
			if(typeof a == "number" && typeof b == "number" && typeof c == "number"){
				return gfx3d.matrix._multiplyPoint(m, a, b, c); // Object
			}
			// branch
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Object: a point
			// b: null
			// c: null
			return gfx3d.matrix._multiplyPoint(m, a.x, a.y, a.z); // Object
		},
		multiply: function(matrix){
			// summary: combines matrices by multiplying them sequentially in the given order
			// matrix: dojox.gfx3d.matrix.Matrix3D...: a 3D matrix-like object,
			//		all subsequent arguments are matrix-like objects too
			var m = gfx3d.matrix.normalize(matrix);
			// combine matrices
			for(var i = 1; i < arguments.length; ++i){
				var l = m;
				var r = gfx3d.matrix.normalize(arguments[i]);
				m = new gfx3d.matrix.Matrix3D();
				m.xx = l.xx * r.xx + l.xy * r.yx + l.xz * r.zx;
				m.xy = l.xx * r.xy + l.xy * r.yy + l.xz * r.zy;
				m.xz = l.xx * r.xz + l.xy * r.yz + l.xz * r.zz;
				m.yx = l.yx * r.xx + l.yy * r.yx + l.yz * r.zx;
				m.yy = l.yx * r.xy + l.yy * r.yy + l.yz * r.zy;
				m.yz = l.yx * r.xz + l.yy * r.yz + l.yz * r.zz;
				m.zx = l.zx * r.xx + l.zy * r.yx + l.zz * r.zx;
				m.zy = l.zx * r.xy + l.zy * r.yy + l.zz * r.zy;
				m.zz = l.zx * r.xz + l.zy * r.yz + l.zz * r.zz;
				m.dx = l.xx * r.dx + l.xy * r.dy + l.xz * r.dz + l.dx;
				m.dy = l.yx * r.dx + l.yy * r.dy + l.yz * r.dz + l.dy;
				m.dz = l.zx * r.dx + l.zy * r.dy + l.zz * r.dz + l.dz;
			}
			return m; // dojox.gfx3d.matrix.Matrix3D
		},
	
		_project: function(m, x, y, z){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// x: Number: an x coordinate of a point
			// y: Number: a y coordinate of a point
			// z: Number: a z coordinate of a point
			return {	// Object
				x: m.xx * x + m.xy * y + m.xz * z + m.dx,
				y: m.yx * x + m.yy * y + m.yz * z + m.dy,
				z: m.zx * x + m.zy * y + m.zz * z + m.dz};
		},
		project: function(matrix, /* Number||Point */ a, /* Number, optional */ b, /* Number, optional */ c){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Number: an x coordinate of a point
			// b: Number: a y coordinate of a point
			// c: Number: a z coordinate of a point
			var m = gfx3d.matrix.normalize(matrix);
			if(typeof a == "number" && typeof b == "number" && typeof c == "number"){
				return gfx3d.matrix._project(m, a, b, c); // Object
			}
			// branch
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Object: a point
			// b: null
			// c: null
			return gfx3d.matrix._project(m, a.x, a.y, a.z); // Object
		}
	});
	
	// propagate matrix up
	gfx3d.Matrix3D = gfx3d.matrix.Matrix3D;
	
	return gfx3d.matrix;
});
},
'dojo/fx':function(){
define("dojo/fx", [
	"./_base/lang",
	"./Evented",
	"./_base/kernel",
	"./_base/array",
	"./_base/connect",
	"./_base/fx",
	"./dom",
	"./dom-style",
	"./dom-geometry",
	"./ready",
	"require" // for context sensitive loading of Toggler
], function(lang, Evented, dojo, arrayUtil, connect, baseFx, dom, domStyle, geom, ready, require) {

	// module:
	//		dojo/fx
	// summary:
	//		TODOC


	/*=====
	dojo.fx = {
		// summary: Effects library on top of Base animations
	};
	var coreFx = dojo.fx;
	=====*/
	
// For back-compat, remove in 2.0.
if(!dojo.isAsync){
	ready(0, function(){
		var requires = ["./fx/Toggler"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}

	var coreFx = dojo.fx = {};

	var _baseObj = {
			_fire: function(evt, args){
				if(this[evt]){
					this[evt].apply(this, args||[]);
				}
				return this;
			}
		};

	var _chain = function(animations){
		this._index = -1;
		this._animations = animations||[];
		this._current = this._onAnimateCtx = this._onEndCtx = null;

		this.duration = 0;
		arrayUtil.forEach(this._animations, function(a){
			this.duration += a.duration;
			if(a.delay){ this.duration += a.delay; }
		}, this);
	};
	_chain.prototype = new Evented();
	lang.extend(_chain, {
		_onAnimate: function(){
			this._fire("onAnimate", arguments);
		},
		_onEnd: function(){
			connect.disconnect(this._onAnimateCtx);
			connect.disconnect(this._onEndCtx);
			this._onAnimateCtx = this._onEndCtx = null;
			if(this._index + 1 == this._animations.length){
				this._fire("onEnd");
			}else{
				// switch animations
				this._current = this._animations[++this._index];
				this._onAnimateCtx = connect.connect(this._current, "onAnimate", this, "_onAnimate");
				this._onEndCtx = connect.connect(this._current, "onEnd", this, "_onEnd");
				this._current.play(0, true);
			}
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			if(!this._current){ this._current = this._animations[this._index = 0]; }
			if(!gotoStart && this._current.status() == "playing"){ return this; }
			var beforeBegin = connect.connect(this._current, "beforeBegin", this, function(){
					this._fire("beforeBegin");
				}),
				onBegin = connect.connect(this._current, "onBegin", this, function(arg){
					this._fire("onBegin", arguments);
				}),
				onPlay = connect.connect(this._current, "onPlay", this, function(arg){
					this._fire("onPlay", arguments);
					connect.disconnect(beforeBegin);
					connect.disconnect(onBegin);
					connect.disconnect(onPlay);
				});
			if(this._onAnimateCtx){
				connect.disconnect(this._onAnimateCtx);
			}
			this._onAnimateCtx = connect.connect(this._current, "onAnimate", this, "_onAnimate");
			if(this._onEndCtx){
				connect.disconnect(this._onEndCtx);
			}
			this._onEndCtx = connect.connect(this._current, "onEnd", this, "_onEnd");
			this._current.play.apply(this._current, arguments);
			return this;
		},
		pause: function(){
			if(this._current){
				var e = connect.connect(this._current, "onPause", this, function(arg){
						this._fire("onPause", arguments);
						connect.disconnect(e);
					});
				this._current.pause();
			}
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			this.pause();
			var offset = this.duration * percent;
			this._current = null;
			arrayUtil.some(this._animations, function(a){
				if(a.duration <= offset){
					this._current = a;
					return true;
				}
				offset -= a.duration;
				return false;
			});
			if(this._current){
				this._current.gotoPercent(offset / this._current.duration, andPlay);
			}
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			if(this._current){
				if(gotoEnd){
					for(; this._index + 1 < this._animations.length; ++this._index){
						this._animations[this._index].stop(true);
					}
					this._current = this._animations[this._index];
				}
				var e = connect.connect(this._current, "onStop", this, function(arg){
						this._fire("onStop", arguments);
						connect.disconnect(e);
					});
				this._current.stop();
			}
			return this;
		},
		status: function(){
			return this._current ? this._current.status() : "stopped";
		},
		destroy: function(){
			if(this._onAnimateCtx){ connect.disconnect(this._onAnimateCtx); }
			if(this._onEndCtx){ connect.disconnect(this._onEndCtx); }
		}
	});
	lang.extend(_chain, _baseObj);

	coreFx.chain = /*===== dojo.fx.chain = =====*/ function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Chain a list of `dojo.Animation`s to run in sequence
		//
		// description:
		//		Return a `dojo.Animation` which will play all passed
		//		`dojo.Animation` instances in sequence, firing its own
		//		synthesized events simulating a single animation. (eg:
		//		onEnd of this animation means the end of the chain,
		//		not the individual animations within)
		//
		// example:
		//	Once `node` is faded out, fade in `otherNode`
		//	|	dojo.fx.chain([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		return new _chain(animations); // dojo.Animation
	};

	var _combine = function(animations){
		this._animations = animations||[];
		this._connects = [];
		this._finished = 0;

		this.duration = 0;
		arrayUtil.forEach(animations, function(a){
			var duration = a.duration;
			if(a.delay){ duration += a.delay; }
			if(this.duration < duration){ this.duration = duration; }
			this._connects.push(connect.connect(a, "onEnd", this, "_onEnd"));
		}, this);

		this._pseudoAnimation = new baseFx.Animation({curve: [0, 1], duration: this.duration});
		var self = this;
		arrayUtil.forEach(["beforeBegin", "onBegin", "onPlay", "onAnimate", "onPause", "onStop", "onEnd"],
			function(evt){
				self._connects.push(connect.connect(self._pseudoAnimation, evt,
					function(){ self._fire(evt, arguments); }
				));
			}
		);
	};
	lang.extend(_combine, {
		_doAction: function(action, args){
			arrayUtil.forEach(this._animations, function(a){
				a[action].apply(a, args);
			});
			return this;
		},
		_onEnd: function(){
			if(++this._finished > this._animations.length){
				this._fire("onEnd");
			}
		},
		_call: function(action, args){
			var t = this._pseudoAnimation;
			t[action].apply(t, args);
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			this._finished = 0;
			this._doAction("play", arguments);
			this._call("play", arguments);
			return this;
		},
		pause: function(){
			this._doAction("pause", arguments);
			this._call("pause", arguments);
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			var ms = this.duration * percent;
			arrayUtil.forEach(this._animations, function(a){
				a.gotoPercent(a.duration < ms ? 1 : (ms / a.duration), andPlay);
			});
			this._call("gotoPercent", arguments);
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			this._doAction("stop", arguments);
			this._call("stop", arguments);
			return this;
		},
		status: function(){
			return this._pseudoAnimation.status();
		},
		destroy: function(){
			arrayUtil.forEach(this._connects, connect.disconnect);
		}
	});
	lang.extend(_combine, _baseObj);

	coreFx.combine = /*===== dojo.fx.combine = =====*/ function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Combine a list of `dojo.Animation`s to run in parallel
		//
		// description:
		//		Combine an array of `dojo.Animation`s to run in parallel,
		//		providing a new `dojo.Animation` instance encompasing each
		//		animation, firing standard animation events.
		//
		// example:
		//	Fade out `node` while fading in `otherNode` simultaneously
		//	|	dojo.fx.combine([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		// example:
		//	When the longest animation ends, execute a function:
		//	|	var anim = dojo.fx.combine([
		//	|		dojo.fadeIn({ node: n, duration:700 }),
		//	|		dojo.fadeOut({ node: otherNode, duration: 300 })
		//	|	]);
		//	|	dojo.connect(anim, "onEnd", function(){
		//	|		// overall animation is done.
		//	|	});
		//	|	anim.play(); // play the animation
		//
		return new _combine(animations); // dojo.Animation
	};

	coreFx.wipeIn = /*===== dojo.fx.wipeIn = =====*/ function(/*Object*/ args){
		// summary:
		//		Expand a node to it's natural height.
		//
		// description:
		//		Returns an animation that will expand the
		//		node defined in 'args' object from it's current height to
		//		it's natural height (with no scrollbar).
		//		Node must have no margin/border/padding.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeIn({
		//	|		node:"someId"
		//	|	}).play()
		var node = args.node = dom.byId(args.node), s = node.style, o;

		var anim = baseFx.animateProperty(lang.mixin({
			properties: {
				height: {
					// wrapped in functions so we wait till the last second to query (in case value has changed)
					start: function(){
						// start at current [computed] height, but use 1px rather than 0
						// because 0 causes IE to display the whole panel
						o = s.overflow;
						s.overflow = "hidden";
						if(s.visibility == "hidden" || s.display == "none"){
							s.height = "1px";
							s.display = "";
							s.visibility = "";
							return 1;
						}else{
							var height = domStyle.get(node, "height");
							return Math.max(height, 1);
						}
					},
					end: function(){
						return node.scrollHeight;
					}
				}
			}
		}, args));

		var fini = function(){
			s.height = "auto";
			s.overflow = o;
		};
		connect.connect(anim, "onStop", fini);
		connect.connect(anim, "onEnd", fini);

		return anim; // dojo.Animation
	};

	coreFx.wipeOut = /*===== dojo.fx.wipeOut = =====*/ function(/*Object*/ args){
		// summary:
		//		Shrink a node to nothing and hide it.
		//
		// description:
		//		Returns an animation that will shrink node defined in "args"
		//		from it's current height to 1px, and then hide it.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeOut({ node:"someId" }).play()

		var node = args.node = dom.byId(args.node), s = node.style, o;

		var anim = baseFx.animateProperty(lang.mixin({
			properties: {
				height: {
					end: 1 // 0 causes IE to display the whole panel
				}
			}
		}, args));

		connect.connect(anim, "beforeBegin", function(){
			o = s.overflow;
			s.overflow = "hidden";
			s.display = "";
		});
		var fini = function(){
			s.overflow = o;
			s.height = "auto";
			s.display = "none";
		};
		connect.connect(anim, "onStop", fini);
		connect.connect(anim, "onEnd", fini);

		return anim; // dojo.Animation
	};

	coreFx.slideTo = /*===== dojo.fx.slideTo = =====*/ function(/*Object*/ args){
		// summary:
		//		Slide a node to a new top/left position
		//
		// description:
		//		Returns an animation that will slide "node"
		//		defined in args Object from its current position to
		//		the position defined by (args.left, args.top).
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on). Special args members
		//		are `top` and `left`, which indicate the new position to slide to.
		//
		// example:
		//	|	.slideTo({ node: node, left:"40", top:"50", units:"px" }).play()

		var node = args.node = dom.byId(args.node),
			top = null, left = null;

		var init = (function(n){
			return function(){
				var cs = domStyle.getComputedStyle(n);
				var pos = cs.position;
				top = (pos == 'absolute' ? n.offsetTop : parseInt(cs.top) || 0);
				left = (pos == 'absolute' ? n.offsetLeft : parseInt(cs.left) || 0);
				if(pos != 'absolute' && pos != 'relative'){
					var ret = geom.position(n, true);
					top = ret.y;
					left = ret.x;
					n.style.position="absolute";
					n.style.top=top+"px";
					n.style.left=left+"px";
				}
			};
		})(node);
		init();

		var anim = baseFx.animateProperty(lang.mixin({
			properties: {
				top: args.top || 0,
				left: args.left || 0
			}
		}, args));
		connect.connect(anim, "beforeBegin", anim, init);

		return anim; // dojo.Animation
	};

	return coreFx;
});

},
'dojox/charting/scaler/common':function(){
define("dojox/charting/scaler/common", ["dojo/_base/lang"], function(lang){

	var eq = function(/*Number*/ a, /*Number*/ b){
		// summary: compare two FP numbers for equality
		return Math.abs(a - b) <= 1e-6 * (Math.abs(a) + Math.abs(b));	// Boolean
	};
	
	var common = lang.getObject("dojox.charting.scaler.common", true);
	
	var testedModules = {};

	return lang.mixin(common, {
		doIfLoaded: function(moduleName, ifloaded, ifnotloaded){
			if(testedModules[moduleName] == undefined){
				try{
					testedModules[moduleName] = require(moduleName);
				}catch(e){
					testedModules[moduleName] = null;
				}
			}
			if(testedModules[moduleName]){
				return ifloaded(testedModules[moduleName]);
			}else{
				return ifnotloaded();
			}
		},
		findString: function(/*String*/ val, /*Array*/ text){
			val = val.toLowerCase();
			for(var i = 0; i < text.length; ++i){
				if(val == text[i]){ return true; }
			}
			return false;
		},
		getNumericLabel: function(/*Number*/ number, /*Number*/ precision, /*Object*/ kwArgs){
			var def = "";
			common.doIfLoaded("dojo/number", function(numberLib){
				def = (kwArgs.fixed ? numberLib.format(number, {places : precision < 0 ? -precision : 0}) :
					numberLib.format(number)) || "";
			}, function(){
				def = kwArgs.fixed ? number.toFixed(precision < 0 ? -precision : 0) : number.toString();
			});
			if(kwArgs.labelFunc){
				var r = kwArgs.labelFunc(def, number, precision);
				if(r){ return r; }
				// else fall through to the regular labels search
			}
			if(kwArgs.labels){
				// classic binary search
				var l = kwArgs.labels, lo = 0, hi = l.length;
				while(lo < hi){
					var mid = Math.floor((lo + hi) / 2), val = l[mid].value;
					if(val < number){
						lo = mid + 1;
					}else{
						hi = mid;
					}
				}
				// lets take into account FP errors
				if(lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				--lo;
				if(lo >= 0 && lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				lo += 2;
				if(lo < l.length && eq(l[lo].value, number)){
					return l[lo].text;
				}
				// otherwise we will produce a number
			}
			return def;
		}
	});
});

},
'dojox/charting/plot2d/Bubble':function(){
define("dojox/charting/plot2d/Bubble", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", 
		"./Base", "./common", "dojox/lang/functional", "dojox/lang/functional/reversed", 
		"dojox/lang/utils", "dojox/gfx/fx"], 
	function(lang, declare, arr, Base, dc, df, dfr, du, fx){
/*=====
var Base = dojox.charting.plot2d.Base;
=====*/

	var purgeGroup = dfr.lambda("item.purgeGroup()");

	return declare("dojox.charting.plot2d.Bubble", Base, {
		//	summary:
		//		A plot representing bubbles.  Note that data for Bubbles requires 3 parameters,
		//		in the form of:  { x, y, size }, where size determines the size of the bubble.
		defaultParams: {
			hAxis: "x",		// use a horizontal axis named "x"
			vAxis: "y",		// use a vertical axis named "y"
			animate: null   // animate bars into place
		},
		optionalParams: {
			// theme component
			stroke:		{},
			outline:	{},
			shadow:		{},
			fill:		{},
			font:		"",
			fontColor:	""
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		Create a plot of bubbles.
			//	chart: dojox.charting.Chart
			//		The chart this plot belongs to.
			//	kwArgs: dojox.charting.plot2d.__DefaultCtorArgs?
			//		Optional keyword arguments object to help define plot parameters.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
            du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
            this.series = [];
			this.hAxis = this.opt.hAxis;
			this.vAxis = this.opt.vAxis;
			this.animate = this.opt.animate;
		},

		//	override the render so that we are plotting only circles.
		render: function(dim, offsets){
			//	summary:
			//		Run the calculations for any axes for this plot.
			//	dim: Object
			//		An object in the form of { width, height }
			//	offsets: Object
			//		An object of the form { l, r, t, b}.
			//	returns: dojox.charting.plot2d.Bubble
			//		A reference to this plot for functional chaining.
			if(this.zoom && !this.isDataDirty()){
				return this.performZoom(dim, offsets);
			}
			this.resetEvents();
			this.dirty = this.isDirty();
			if(this.dirty){
				arr.forEach(this.series, purgeGroup);
				this._eventSeries = {};
				this.cleanGroup();
				var s = this.group;
				df.forEachRev(this.series, function(item){ item.cleanGroup(s); });
			}

			var t = this.chart.theme,
				ht = this._hScaler.scaler.getTransformerFromModel(this._hScaler),
				vt = this._vScaler.scaler.getTransformerFromModel(this._vScaler),
				events = this.events();

			for(var i = this.series.length - 1; i >= 0; --i){
				var run = this.series[i];
				if(!this.dirty && !run.dirty){
					t.skip();
					this._reconnectEvents(run.name);
					continue;
				}
				run.cleanGroup();
				if(!run.data.length){
					run.dirty = false;
					t.skip();
					continue;
				}

				if(typeof run.data[0] == "number"){
					console.warn("dojox.charting.plot2d.Bubble: the data in the following series cannot be rendered as a bubble chart; ", run);
					continue;
				}

				var theme = t.next("circle", [this.opt, run]), s = run.group,
					points = arr.map(run.data, function(v, i){
						return v ? {
							x: ht(v.x) + offsets.l,
							y: dim.height - offsets.b - vt(v.y),
							radius: this._vScaler.bounds.scale * (v.size / 2)
						} : null;
					}, this);

				var frontCircles = null, outlineCircles = null, shadowCircles = null;

				// make shadows if needed
				if(theme.series.shadow){
					shadowCircles = arr.map(points, function(item){
						if(item !== null){
							var finalTheme = t.addMixin(theme, "circle", item, true),
								shadow = finalTheme.series.shadow;
							var shape = s.createCircle({
								cx: item.x + shadow.dx, cy: item.y + shadow.dy, r: item.radius
							}).setStroke(shadow).setFill(shadow.color);
							if(this.animate){
								this._animateBubble(shape, dim.height - offsets.b, item.radius);
							}
							return shape;
						}
						return null;
					}, this);
					if(shadowCircles.length){
						run.dyn.shadow = shadowCircles[shadowCircles.length - 1].getStroke();
					}
				}

				// make outlines if needed
				if(theme.series.outline){
					outlineCircles = arr.map(points, function(item){
						if(item !== null){
							var finalTheme = t.addMixin(theme, "circle", item, true),
								outline = dc.makeStroke(finalTheme.series.outline);
							outline.width = 2 * outline.width + theme.series.stroke.width;
							var shape = s.createCircle({
								cx: item.x, cy: item.y, r: item.radius
							}).setStroke(outline);
							if(this.animate){
								this._animateBubble(shape, dim.height - offsets.b, item.radius);
							}
							return shape;
						}
						return null;
					}, this);
					if(outlineCircles.length){
						run.dyn.outline = outlineCircles[outlineCircles.length - 1].getStroke();
					}
				}

				//	run through the data and add the circles.
				frontCircles = arr.map(points, function(item){
					if(item !== null){
						var finalTheme = t.addMixin(theme, "circle", item, true),
							rect = {
								x: item.x - item.radius,
								y: item.y - item.radius,
								width:  2 * item.radius,
								height: 2 * item.radius
							};
						var specialFill = this._plotFill(finalTheme.series.fill, dim, offsets);
						specialFill = this._shapeFill(specialFill, rect);
						var shape = s.createCircle({
							cx: item.x, cy: item.y, r: item.radius
						}).setFill(specialFill).setStroke(finalTheme.series.stroke);
						if(this.animate){
							this._animateBubble(shape, dim.height - offsets.b, item.radius);
						}
						return shape;
					}
					return null;
				}, this);
				if(frontCircles.length){
					run.dyn.fill   = frontCircles[frontCircles.length - 1].getFill();
					run.dyn.stroke = frontCircles[frontCircles.length - 1].getStroke();
				}

				if(events){
					var eventSeries = new Array(frontCircles.length);
					arr.forEach(frontCircles, function(s, i){
						if(s !== null){
							var o = {
								element: "circle",
								index:   i,
								run:     run,
								shape:   s,
								outline: outlineCircles && outlineCircles[i] || null,
								shadow:  shadowCircles && shadowCircles[i] || null,
								x:       run.data[i].x,
								y:       run.data[i].y,
								r:       run.data[i].size / 2,
								cx:      points[i].x,
								cy:      points[i].y,
								cr:      points[i].radius
							};
							this._connectEvents(o);
							eventSeries[i] = o;
						}
					}, this);
					this._eventSeries[run.name] = eventSeries;
				}else{
					delete this._eventSeries[run.name];
				}

				run.dirty = false;
			}
			this.dirty = false;
			return this;	//	dojox.charting.plot2d.Bubble
		},
		_animateBubble: function(shape, offset, size){
			fx.animateTransform(lang.delegate({
				shape: shape,
				duration: 1200,
				transform: [
					{name: "translate", start: [0, offset], end: [0, 0]},
					{name: "scale", start: [0, 1/size], end: [1, 1]},
					{name: "original"}
				]
			}, this.animate)).play();
		}
	});
});

},
'dojox/charting/themes/Bahamation':function(){
define("dojox/charting/themes/Bahamation", ["../Theme", "./common"], function(Theme, themes){
	themes.Bahamation=new Theme({
		colors: [
			"#3f9998",
			"#3fc0c3",
			"#70c058",
			"#ef446f",
			"#c663a6"
		]
	});
	return themes.Bahamation;
});

},
'dojox/charting/themes/Desert':function(){
define("dojox/charting/themes/Desert", ["../Theme", "./common"], function(Theme, themes){

	//	notes: colors generated by moving in 30 degree increments around the hue circle,
	//		at 90% saturation, using a B value of 75 (HSB model).
	themes.Desert=new Theme({
		colors: [
			"#ffebd5",
			"#806544",
			"#fdc888",
			"#80766b",
			"#cda26e"
		]
	});
	
	return themes.Desert;
});

},
'*noref':1}});
define("dojox/_dojox_charting_all", [], 1);
require(["dojox/charting/BidiSupport","dojox/charting/Chart","dojox/charting/Chart2D","dojox/charting/Chart3D","dojox/charting/DataChart","dojox/charting/DataSeries","dojox/charting/Element","dojox/charting/Series","dojox/charting/StoreSeries","dojox/charting/Theme","dojox/charting/action2d/Base","dojox/charting/action2d/ChartAction","dojox/charting/action2d/Highlight","dojox/charting/action2d/Magnify","dojox/charting/action2d/MouseIndicator","dojox/charting/action2d/MouseZoomAndPan","dojox/charting/action2d/MoveSlice","dojox/charting/action2d/PlotAction","dojox/charting/action2d/Shake","dojox/charting/action2d/Tooltip","dojox/charting/action2d/TouchIndicator","dojox/charting/action2d/TouchZoomAndPan","dojox/charting/axis2d/Base","dojox/charting/axis2d/common","dojox/charting/axis2d/Default","dojox/charting/axis2d/Invisible","dojox/charting/plot2d/Areas","dojox/charting/plot2d/Bars","dojox/charting/plot2d/Base","dojox/charting/plot2d/Bubble","dojox/charting/plot2d/Candlesticks","dojox/charting/plot2d/ClusteredBars","dojox/charting/plot2d/ClusteredColumns","dojox/charting/plot2d/Columns","dojox/charting/plot2d/common","dojox/charting/plot2d/Default","dojox/charting/plot2d/Grid","dojox/charting/plot2d/Lines","dojox/charting/plot2d/Markers","dojox/charting/plot2d/MarkersOnly","dojox/charting/plot2d/OHLC","dojox/charting/plot2d/Pie","dojox/charting/plot2d/Scatter","dojox/charting/plot2d/Spider","dojox/charting/plot2d/Stacked","dojox/charting/plot2d/StackedAreas","dojox/charting/plot2d/StackedBars","dojox/charting/plot2d/StackedColumns","dojox/charting/plot2d/StackedLines","dojox/charting/plot3d/Bars","dojox/charting/plot3d/Base","dojox/charting/plot3d/Cylinders","dojox/charting/scaler/common","dojox/charting/scaler/linear","dojox/charting/scaler/primitive","dojox/charting/themes/PlotKit/base","dojox/charting/themes/PlotKit/blue","dojox/charting/themes/PlotKit/cyan","dojox/charting/themes/PlotKit/green","dojox/charting/themes/PlotKit/orange","dojox/charting/themes/PlotKit/purple","dojox/charting/themes/PlotKit/red","dojox/charting/themes/Adobebricks","dojox/charting/themes/Algae","dojox/charting/themes/Bahamation","dojox/charting/themes/BlueDusk","dojox/charting/themes/Charged","dojox/charting/themes/Chris","dojox/charting/themes/Claro","dojox/charting/themes/common","dojox/charting/themes/CubanShirts","dojox/charting/themes/Desert","dojox/charting/themes/Distinctive","dojox/charting/themes/Dollar","dojox/charting/themes/Electric","dojox/charting/themes/gradientGenerator","dojox/charting/themes/Grasshopper","dojox/charting/themes/Grasslands","dojox/charting/themes/GreySkies","dojox/charting/themes/Harmony","dojox/charting/themes/IndigoNation","dojox/charting/themes/Ireland","dojox/charting/themes/Julie","dojox/charting/themes/MiamiNice","dojox/charting/themes/Midwest","dojox/charting/themes/Minty","dojox/charting/themes/PrimaryColors","dojox/charting/themes/PurpleRain","dojox/charting/themes/Renkoo","dojox/charting/themes/RoyalPurples","dojox/charting/themes/SageToLime","dojox/charting/themes/Shrooms","dojox/charting/themes/ThreeD","dojox/charting/themes/Tom","dojox/charting/themes/Tufte","dojox/charting/themes/WatersEdge","dojox/charting/themes/Wetland","dojox/charting/widget/BidiSupport","dojox/charting/widget/Chart","dojox/charting/widget/Chart2D","dojox/charting/widget/Legend","dojox/charting/widget/SelectableLegend","dojox/charting/widget/Sparkline"]);

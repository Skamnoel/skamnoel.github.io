require({cache:{
'dojox/lang/functional/array':function(){
define("dojox/lang/functional/array", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/window", "./lambda"], 
	function(dojo, lang, arr, win, df){

// This module adds high-level functions and related constructs:
//	- array-processing functions similar to standard JS functions

// Notes:
//	- this module provides JS standard methods similar to high-level functions in dojo/_base/array.js:
//		forEach, map, filter, every, some

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument
//	- take an iterator objects as the array argument

	var empty = {};

/*=====
	var df = dojox.lang.functional;
 =====*/
	lang.mixin(df, {
		// JS 1.6 standard array functions, which can take a lambda as a parameter.
		// Consider using dojo._base.array functions, if you don't need the lambda support.
		filter: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with all elements that pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var t = [], v, i, n;
			if(lang.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; ++i){
					v = a[i];
					if(f.call(o, v, i, a)){ t.push(v); }
				}
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext();){
					v = a.next();
					if(f.call(o, v, i++, a)){ t.push(v); }
				}
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						v = a[i];
						if(f.call(o, v, i, a)){ t.push(v); }
					}
				}
			}
			return t;	// Array
		},
		forEach: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: executes a provided function once per array element.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var i, n;
			if(lang.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; f.call(o, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext(); f.call(o, a.next(), i++, a));
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						f.call(o, a[i], i, a);
					}
				}
			}
			return o;	// Object
		},
		map: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with the results of calling
			//	a provided function on every element in this array.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var t, n, i;
			if(lang.isArray(a)){
				// array
				t = new Array(n = a.length);
				for(i = 0; i < n; t[i] = f.call(o, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				t = [];
				for(i = 0; a.hasNext(); t.push(f.call(o, a.next(), i++, a)));
			}else{
				// object/dictionary
				t = [];
				for(i in a){
					if(!(i in empty)){
						t.push(f.call(o, a[i], i, a));
					}
				}
			}
			return t;	// Array
		},
		every: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether all elements in the array pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var i, n;
			if(lang.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; ++i){
					if(!f.call(o, a[i], i, a)){
						return false;	// Boolean
					}
				}
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext();){
					if(!f.call(o, a.next(), i++, a)){
						return false;	// Boolean
					}
				}
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						if(!f.call(o, a[i], i, a)){
							return false;	// Boolean
						}
					}
				}
			}
			return true;	// Boolean
		},
		some: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether some element in the array passes the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var i, n;
			if(lang.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; ++i){
					if(f.call(o, a[i], i, a)){
						return true;	// Boolean
					}
				}
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext();){
					if(f.call(o, a.next(), i++, a)){
						return true;	// Boolean
					}
				}
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						if(f.call(o, a[i], i, a)){
							return true;	// Boolean
						}
					}
				}
			}
			return false;	// Boolean
		}
	});
	
	return df;
});

},
'dojox/charting/Element':function(){
define("dojox/charting/Element", ["dojo/_base/lang", "dojo/_base/array", "dojo/dom-construct", "dojo/_base/declare", "dojox/gfx", "dojox/gfx/utils", "dojox/gfx/shape"],
	function(lang, arr, domConstruct, declare, gfx, utils, shape){
	
	return declare("dojox.charting.Element", null, {
		//	summary:
		//		A base class that is used to build other elements of a chart, such as
		//		a series.
		//	chart: dojox.charting.Chart
		//		The parent chart for this element.
		//	group: dojox.gfx.Group
		//		The visual GFX group representing this element.
		//	htmlElement: Array
		//		Any DOMNodes used as a part of this element (such as HTML-based labels).
		//	dirty: Boolean
		//		A flag indicating whether or not this element needs to be rendered.
	
		chart: null,
		group: null,
		htmlElements: null,
		dirty: true,
	
		constructor: function(chart){
			//	summary:
			//		Creates a new charting element.
			//	chart: dojox.charting.Chart
			//		The chart that this element belongs to.
			this.chart = chart;
			this.group = null;
			this.htmlElements = [];
			this.dirty = true;
			this.trailingSymbol = "...";
			this._events = [];
		},
		createGroup: function(creator){
			//	summary:
			//		Convenience function to create a new dojox.gfx.Group.
			//	creator: dojox.gfx.Surface?
			//		An optional surface in which to create this group.
			//	returns: dojox.charting.Element
			//		A reference to this object for functional chaining.
			if(!creator){ creator = this.chart.surface; }
			if(!this.group){
				this.group = creator.createGroup();
			}
			return this;	//	dojox.charting.Element
		},
		purgeGroup: function(){
			//	summary:
			//		Clear any elements out of our group, and destroy the group.
			//	returns: dojox.charting.Element
			//		A reference to this object for functional chaining.
			this.destroyHtmlElements();
			if(this.group){
				// since 1.7.x we need dispose shape otherwise there is a memoryleak
				utils.forEach(this.group, function(child){
					shape.dispose(child);
				});
				if(this.group.rawNode){
					domConstruct.empty(this.group.rawNode);
				}
				this.group.clear();
				this.group.removeShape();
				shape.dispose(this.group);
				this.group = null;
			}
			this.dirty = true;
			if(this._events.length){
				arr.forEach(this._events, function(item){
					item.shape.disconnect(item.handle);
				});
				this._events = [];
			}
			return this;	//	dojox.charting.Element
		},
		cleanGroup: function(creator){
			//	summary:
			//		Clean any elements (HTML or GFX-based) out of our group, and create a new one.
			//	creator: dojox.gfx.Surface?
			//		An optional surface to work with.
			//	returns: dojox.charting.Element
			//		A reference to this object for functional chaining.
			this.destroyHtmlElements();
			if(!creator){ creator = this.chart.surface; }
			if(this.group){
				var bgnode;
				utils.forEach(this.group, function(child){
					shape.dispose(child);
				});
				if(this.group.rawNode){
					bgnode = this.group.bgNode;
					domConstruct.empty(this.group.rawNode);
				}
				this.group.clear();
				if(bgnode){
					this.group.rawNode.appendChild(bgnode);
				}
			}else{
				this.group = creator.createGroup();
			}
			this.dirty = true;
			return this;	//	dojox.charting.Element
		},
		destroyHtmlElements: function(){
			//	summary:
			//		Destroy any DOMNodes that may have been created as a part of this element.
			if(this.htmlElements.length){
				arr.forEach(this.htmlElements, domConstruct.destroy);
				this.htmlElements = [];
			}
		},
		destroy: function(){
			//	summary:
			//		API addition to conform to the rest of the Dojo Toolkit's standard.
			this.purgeGroup();
		},
		//text utilities
		getTextWidth: function(s, font){
			return gfx._base._getTextBox(s, {font: font}).w || 0;
		},
		getTextWithLimitLength: function(s, font, limitWidth, truncated){
			//	summary:
			//		Get the truncated string based on the limited width in px(dichotomy algorithm)
			//	s: String?
			//		candidate text.
			//	font: String?
			//		text's font style.
			//	limitWidth: Number?
			//		text limited width in px.
			//	truncated: Boolean?
			//		whether the input text(s) has already been truncated.
			//	returns: Object
			//		{
			//			text: processed text, maybe truncated or not
			//			truncated: whether text has been truncated
			//		}
			if (!s || s.length <= 0) {
				return {
					text: "",
					truncated: truncated || false
				};
			}
			if(!limitWidth || limitWidth <= 0){
				return {
					text: s,
					truncated: truncated || false
				};
			}
			var delta = 2,
				//golden section for dichotomy algorithm
				trucPercentage = 0.618,
				minStr = s.substring(0,1) + this.trailingSymbol,
				minWidth = this.getTextWidth(minStr, font);
			if (limitWidth <= minWidth) {
				return {
					text: minStr,
					truncated: true
				};
			}
			var width = this.getTextWidth(s, font);
			if(width <= limitWidth){
				return {
					text: s,
					truncated: truncated || false
				};
			}else{
				var begin = 0,
					end = s.length;
				while(begin < end){
					if(end - begin <= delta ){
						while (this.getTextWidth(s.substring(0, begin) + this.trailingSymbol, font) > limitWidth) {
							begin -= 1;
						}
						return {
							text: (s.substring(0,begin) + this.trailingSymbol),
							truncated: true
						};
					}
					var index = begin + Math.round((end - begin) * trucPercentage),
						widthIntercepted = this.getTextWidth(s.substring(0, index), font);
					if(widthIntercepted < limitWidth){
						begin = index;
						end = end;
					}else{
						begin = begin;
						end = index;
					}
				}
			}
		},
		getTextWithLimitCharCount: function(s, font, wcLimit, truncated){
			//	summary:
			//		Get the truncated string based on the limited character count(dichotomy algorithm)
			//	s: String?
			//		candidate text.
			//	font: String?
			//		text's font style.
			//	wcLimit: Number?
			//		text limited character count.
			//	truncated: Boolean?
			//		whether the input text(s) has already been truncated.
			//	returns: Object
			//		{
			//			text: processed text, maybe truncated or not
			//			truncated: whether text has been truncated
			//		}
			if (!s || s.length <= 0) {
				return {
					text: "",
					truncated: truncated || false
				};
			}
			if(!wcLimit || wcLimit <= 0 || s.length <= wcLimit){
				return {
					text: s,
					truncated: truncated || false
				};
			}
			return {
				text: s.substring(0, wcLimit) + this.trailingSymbol,
				truncated: true
			};
		},
		// fill utilities
		_plotFill: function(fill, dim, offsets){
			// process a plot-wide fill
			if(!fill || !fill.type || !fill.space){
				return fill;
			}
			var space = fill.space;
			switch(fill.type){
				case "linear":
					if(space === "plot" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultLinearGradient, fill);
						fill.space = space;
						// process dimensions
						if(space === "plot" || space === "shapeX"){
							// process Y
							var span = dim.height - offsets.t - offsets.b;
							fill.y1 = offsets.t + span * fill.y1 / 100;
							fill.y2 = offsets.t + span * fill.y2 / 100;
						}
						if(space === "plot" || space === "shapeY"){
							// process X
							var span = dim.width - offsets.l - offsets.r;
							fill.x1 = offsets.l + span * fill.x1 / 100;
							fill.x2 = offsets.l + span * fill.x2 / 100;
						}
					}
					break;
				case "radial":
					if(space === "plot"){
						// this one is used exclusively for scatter charts
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultRadialGradient, fill);
						fill.space = space;
						// process both dimensions
						var spanX = dim.width  - offsets.l - offsets.r,
							spanY = dim.height - offsets.t - offsets.b;
						fill.cx = offsets.l + spanX * fill.cx / 100;
						fill.cy = offsets.t + spanY * fill.cy / 100;
						fill.r  = fill.r * Math.sqrt(spanX * spanX + spanY * spanY) / 200;
					}
					break;
				case "pattern":
					if(space === "plot" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultPattern, fill);
						fill.space = space;
						// process dimensions
						if(space === "plot" || space === "shapeX"){
							// process Y
							var span = dim.height - offsets.t - offsets.b;
							fill.y = offsets.t + span * fill.y / 100;
							fill.height = span * fill.height / 100;
						}
						if(space === "plot" || space === "shapeY"){
							// process X
							var span = dim.width - offsets.l - offsets.r;
							fill.x = offsets.l + span * fill.x / 100;
							fill.width = span * fill.width / 100;
						}
					}
					break;
			}
			return fill;
		},
		_shapeFill: function(fill, bbox){
			// process shape-specific fill
			if(!fill || !fill.space){
				return fill;
			}
			var space = fill.space;
			switch(fill.type){
				case "linear":
					if(space === "shape" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultLinearGradient, fill);
						fill.space = space;
						// process dimensions
						if(space === "shape" || space === "shapeX"){
							// process X
							var span = bbox.width;
							fill.x1 = bbox.x + span * fill.x1 / 100;
							fill.x2 = bbox.x + span * fill.x2 / 100;
						}
						if(space === "shape" || space === "shapeY"){
							// process Y
							var span = bbox.height;
							fill.y1 = bbox.y + span * fill.y1 / 100;
							fill.y2 = bbox.y + span * fill.y2 / 100;
						}
					}
					break;
				case "radial":
					if(space === "shape"){
						// this one is used exclusively for bubble charts and pie charts
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultRadialGradient, fill);
						fill.space = space;
						// process both dimensions
						fill.cx = bbox.x + bbox.width  / 2;
						fill.cy = bbox.y + bbox.height / 2;
						fill.r  = fill.r * bbox.width  / 200;
					}
					break;
				case "pattern":
					if(space === "shape" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultPattern, fill);
						fill.space = space;
						// process dimensions
						if(space === "shape" || space === "shapeX"){
							// process X
							var span = bbox.width;
							fill.x = bbox.x + span * fill.x / 100;
							fill.width = span * fill.width / 100;
						}
						if(space === "shape" || space === "shapeY"){
							// process Y
							var span = bbox.height;
							fill.y = bbox.y + span * fill.y / 100;
							fill.height = span * fill.height / 100;
						}
					}
					break;
			}
			return fill;
		},
		_pseudoRadialFill: function(fill, center, radius, start, end){
			// process pseudo-radial fills
			if(!fill || fill.type !== "radial" || fill.space !== "shape"){
				return fill;
			}
			// clone and normalize fill
			var space = fill.space;
			fill = gfx.makeParameters(gfx.defaultRadialGradient, fill);
			fill.space = space;
			if(arguments.length < 4){
				// process both dimensions
				fill.cx = center.x;
				fill.cy = center.y;
				fill.r  = fill.r * radius / 100;
				return fill;
			}
			// convert to a linear gradient
			var angle = arguments.length < 5 ? start : (end + start) / 2;
			return {
				type: "linear",
				x1: center.x,
				y1: center.y,
				x2: center.x + fill.r * radius * Math.cos(angle) / 100,
				y2: center.y + fill.r * radius * Math.sin(angle) / 100,
				colors: fill.colors
			};
			return fill;
		}
	});
});

},
'dojox/gfx/utils':function(){
define("dojox/gfx/utils", ["dojo/_base/kernel","dojo/_base/lang","./_base", "dojo/_base/html","dojo/_base/array", "dojo/_base/window", "dojo/_base/json", 
	"dojo/_base/Deferred", "dojo/_base/sniff", "require","dojo/_base/config"], 
  function(kernel, lang, g, html, arr, win, jsonLib, Deferred, has, require, config){
	var gu = g.utils = {};
	/*===== g= dojox.gfx; gu = dojox.gfx.utils; =====*/

	lang.mixin(gu, {
		forEach: function(
			/*dojox.gfx.Surface|dojox.gfx.Shape*/ object,
			/*Function|String|Array*/ f, /*Object?*/ o
		){
			// summary:
			//		Takes a shape or a surface and applies a function "f" to in the context of "o" 
			//		(or global, if missing). If "shape" was a surface or a group, it applies the same 
			//		function to all children recursively effectively visiting all shapes of the underlying scene graph.
			// object : The gfx container to iterate.
			// f : The function to apply.
			// o : The scope.
			o = o || win.global;
			f.call(o, object);
			if(object instanceof g.Surface || object instanceof g.Group){
				arr.forEach(object.children, function(shape){
					gu.forEach(shape, f, o);
				});
			}
		},

		serialize: function(
			/* dojox.gfx.Surface|dojox.gfx.Shape */ object
		){
			// summary:
			//		Takes a shape or a surface and returns a DOM object, which describes underlying shapes.
			var t = {}, v, isSurface = object instanceof g.Surface;
			if(isSurface || object instanceof g.Group){
				t.children = arr.map(object.children, gu.serialize);
				if(isSurface){
					return t.children;	// Array
				}
			}else{
				t.shape = object.getShape();
			}
			if(object.getTransform){
				v = object.getTransform();
				if(v){ t.transform = v; }
			}
			if(object.getStroke){
				v = object.getStroke();
				if(v){ t.stroke = v; }
			}
			if(object.getFill){
				v = object.getFill();
				if(v){ t.fill = v; }
			}
			if(object.getFont){
				v = object.getFont();
				if(v){ t.font = v; }
			}
			return t;	// Object
		},

		toJson: function(
			/* dojox.gfx.Surface|dojox.gfx.Shape */ object,
			/* Boolean? */ prettyPrint
		){
			// summary:
			//		Works just like serialize() but returns a JSON string. If prettyPrint is true, the string is pretty-printed to make it more human-readable.
			return jsonLib.toJson(gu.serialize(object), prettyPrint);	// String
		},

		deserialize: function(
			/* dojox.gfx.Surface|dojox.gfx.Shape */ parent,
			/* dojox.gfx.Shape|Array */ object
		){
			// summary:
			//		Takes a surface or a shape and populates it with an object produced by serialize().
			if(object instanceof Array){
				return arr.map(object, lang.hitch(null, gu.deserialize, parent));	// Array
			}
			var shape = ("shape" in object) ? parent.createShape(object.shape) : parent.createGroup();
			if("transform" in object){
				shape.setTransform(object.transform);
			}
			if("stroke" in object){
				shape.setStroke(object.stroke);
			}
			if("fill" in object){
				shape.setFill(object.fill);
			}
			if("font" in object){
				shape.setFont(object.font);
			}
			if("children" in object){
				arr.forEach(object.children, lang.hitch(null, gu.deserialize, shape));
			}
			return shape;	// dojox.gfx.Shape
		},

		fromJson: function(
			/* dojox.gfx.Surface|dojox.gfx.Shape */ parent,
			/* String */ json){
			// summary:
			//		Works just like deserialize() but takes a JSON representation of the object.
			return gu.deserialize(parent, jsonLib.fromJson(json));	// Array || dojox.gfx.Shape
		},

		toSvg: function(/*GFX object*/surface){
			// summary:
			//		Function to serialize a GFX surface to SVG text.
			// description:
			//		Function to serialize a GFX surface to SVG text.  The value of this output
			//		is that there are numerous serverside parser libraries that can render
			//		SVG into images in various formats.  This provides a way that GFX objects
			//		can be captured in a known format and sent serverside for serialization
			//		into an image.
			// surface:
			//		The GFX surface to serialize.
			// returns:
			//		Deferred object that will be called when SVG serialization is complete.
		
			//Since the init and even surface creation can be async, we need to
			//return a deferred that will be called when content has serialized.
			var deferred = new Deferred();
		
			if(g.renderer === "svg"){
				//If we're already in SVG mode, this is easy and quick.
				try{
					var svg = gu._cleanSvg(gu._innerXML(surface.rawNode));
					deferred.callback(svg);
				}catch(e){
					deferred.errback(e);
				}
			}else{
				//Okay, now we have to get creative with hidden iframes and the like to
				//serialize SVG.
				if (!gu._initSvgSerializerDeferred) {
					gu._initSvgSerializer();
				}
				var jsonForm = gu.toJson(surface);
				var serializer = function(){
					try{
						var sDim = surface.getDimensions();
						var width = sDim.width;
						var	height = sDim.height;

						//Create an attach point in the iframe for the contents.
						var node = gu._gfxSvgProxy.document.createElement("div");
						gu._gfxSvgProxy.document.body.appendChild(node);
						//Set the node scaling.
						win.withDoc(gu._gfxSvgProxy.document, function() {
							html.style(node, "width", width);
							html.style(node, "height", height);
						}, this);

						//Create temp surface to render object to and render.
						var ts = gu._gfxSvgProxy[dojox._scopeName].gfx.createSurface(node, width, height);

						//It's apparently possible that a suface creation is async, so we need to use
						//the whenLoaded function.  Probably not needed for SVG, but making it common
						var draw = function(surface) {
							try{
								gu._gfxSvgProxy[dojox._scopeName].gfx.utils.fromJson(surface, jsonForm);

								//Get contents and remove temp surface.
								var svg = gu._cleanSvg(node.innerHTML);
								surface.clear();
								surface.destroy();
								gu._gfxSvgProxy.document.body.removeChild(node);
								deferred.callback(svg);
							}catch(e){
								deferred.errback(e);
							}
						};
						ts.whenLoaded(null,draw);
					 }catch (ex) {
						deferred.errback(ex);
					}
				};
				//See if we can call it directly or pass it to the deferred to be
				//called on initialization.
				if(gu._initSvgSerializerDeferred.fired > 0){
					serializer();
				}else{
					gu._initSvgSerializerDeferred.addCallback(serializer);
				}
			}
			return deferred; //dojo.Deferred that will be called when serialization finishes.
		},

		//iFrame document used for handling SVG serialization.
		_gfxSvgProxy: null,

		//Serializer loaded.
		_initSvgSerializerDeferred: null,

		_svgSerializerInitialized: function() {
			// summary:
			//		Internal function to call when the serializer init completed.
			// tags:
			//		private
			gu._initSvgSerializerDeferred.callback(true);
		},

		_initSvgSerializer: function(){
			// summary:
			//		Internal function to initialize the hidden iframe where SVG rendering
			//		will occur.
			// tags:
			//		private
			if(!gu._initSvgSerializerDeferred){
				gu._initSvgSerializerDeferred = new Deferred();
				var f = win.doc.createElement("iframe");
				html.style(f, {
					display: "none",
					position: "absolute",
					width: "1em",
					height: "1em",
					top: "-10000px"
				});
				var intv;
				if(has("ie")){
					f.onreadystatechange = function(){
						if(f.contentWindow.document.readyState == "complete"){
							f.onreadystatechange = function() {};
							intv = setInterval(function() {
								if(f.contentWindow[kernel.scopeMap["dojo"][1]._scopeName] &&
								   f.contentWindow[kernel.scopeMap["dojox"][1]._scopeName].gfx &&
								   f.contentWindow[kernel.scopeMap["dojox"][1]._scopeName].gfx.utils){
									clearInterval(intv);
									f.contentWindow.parent[kernel.scopeMap["dojox"][1]._scopeName].gfx.utils._gfxSvgProxy = f.contentWindow;
									f.contentWindow.parent[kernel.scopeMap["dojox"][1]._scopeName].gfx.utils._svgSerializerInitialized();
								}
							}, 50);
						}
					};
				}else{
					f.onload = function(){
						f.onload = function() {};
						intv = setInterval(function() {
							if(f.contentWindow[kernel.scopeMap["dojo"][1]._scopeName] &&
							   f.contentWindow[kernel.scopeMap["dojox"][1]._scopeName].gfx &&
							   f.contentWindow[kernel.scopeMap["dojox"][1]._scopeName].gfx.utils){
								clearInterval(intv);
								f.contentWindow.parent[kernel.scopeMap["dojox"][1]._scopeName].gfx.utils._gfxSvgProxy = f.contentWindow;
								f.contentWindow.parent[kernel.scopeMap["dojox"][1]._scopeName].gfx.utils._svgSerializerInitialized();
							}
						}, 50);
					};
				}
				//We have to load the GFX SVG proxy frame.  Default is to use the one packaged in dojox.
				var uri = (config["dojoxGfxSvgProxyFrameUrl"]||require.toUrl("dojox/gfx/resources/gfxSvgProxyFrame.html"));
				f.setAttribute("src", uri.toString());
				win.body().appendChild(f);
			}
		},

		_innerXML: function(/*Node*/node){
			// summary:
			//		Implementation of MS's innerXML function, borrowed from dojox.xml.parser.
			// node:
			//		The node from which to generate the XML text representation.
			// tags:
			//		private
			if(node.innerXML){
				return node.innerXML;	//String
			}else if(node.xml){
				return node.xml;		//String
			}else if(typeof XMLSerializer != "undefined"){
				return (new XMLSerializer()).serializeToString(node);	//String
			}
			return null;
		},

		_cleanSvg: function(svg) {
			// summary:
			//		Internal function that cleans up artifacts in extracted SVG content.
			// tags:
			//		private
			if(svg){
				//Make sure the namespace is set.
				if(svg.indexOf("xmlns=\"http://www.w3.org/2000/svg\"") == -1){
					svg = svg.substring(4, svg.length);
					svg = "<svg xmlns=\"http://www.w3.org/2000/svg\"" + svg;
				}
				//Same for xmlns:xlink (missing in Chrome and Safari)
				if(svg.indexOf("xmlns:xlink=\"http://www.w3.org/1999/xlink\"") == -1){
					svg = svg.substring(4, svg.length);
					svg = "<svg xmlns:xlink=\"http://www.w3.org/1999/xlink\"" + svg;
				}
				//and add namespace to href attribute if not done yet 
				//(FF 5+ adds xlink:href but not the xmlns def)
				if(svg.indexOf("xlink:href") === -1){
					svg = svg.replace(/href\s*=/g, "xlink:href=");
				}
				//Do some other cleanup, like stripping out the
				//dojoGfx attributes and quoting ids.
				svg = svg.replace(/\bdojoGfx\w*\s*=\s*(['"])\w*\1/g, "");
				svg = svg.replace(/\b__gfxObject__\s*=\s*(['"])\w*\1/g, "");
				svg = svg.replace(/[=]([^"']+?)(\s|>)/g,'="$1"$2');
				
				// Undefined strokes (IE 8 seralization weirdness) should be removed to  
				// allow default.  'undefined' is not a valid value. 
				svg = svg.replace(/\bstroke-opacity\w*\s*=\s*(['"])undefined\1/g, ""); 				
			}
			return svg;  //Cleaned SVG text.
		}
	});

	return gu;
});

},
'dojox/main':function(){
define("dojox/main", ["dojo/_base/kernel"], function(dojo) {
	// module:
	//		dojox/main
	// summary:
	//		The dojox package main module; dojox package is somewhat unusual in that the main module currently just provides an empty object.

	return dojo.dojox;
});
},
'dojox/lang/functional/reversed':function(){
define("dojox/lang/functional/reversed", ["dojo/_base/lang", "dojo/_base/window" ,"./lambda"], 
	function(lang, win, df){
// This module adds high-level functions and related constructs:
//	- reversed versions of array-processing functions similar to standard JS functions

// Notes:
//	- this module provides reversed versions of standard array-processing functions:
//		forEachRev, mapRev, filterRev

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument

/*=====
	var df = dojox.lang.functional;
 =====*/
	lang.mixin(df, {
		// JS 1.6 standard array functions, which can take a lambda as a parameter.
		// Consider using dojo._base.array functions, if you don't need the lambda support.
		filterRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with all elements that pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var t = [], v, i = a.length - 1;
			for(; i >= 0; --i){
				v = a[i];
				if(f.call(o, v, i, a)){ t.push(v); }
			}
			return t;	// Array
		},
		forEachRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: executes a provided function once per array element.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			for(var i = a.length - 1; i >= 0; f.call(o, a[i], i, a), --i);
		},
		mapRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates a new array with the results of calling
			//	a provided function on every element in this array.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var n = a.length, t = new Array(n), i = n - 1, j = 0;
			for(; i >= 0; t[j++] = f.call(o, a[i], i, a), --i);
			return t;	// Array
		},
		everyRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether all elements in the array pass the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			for(var i = a.length - 1; i >= 0; --i){
				if(!f.call(o, a[i], i, a)){
					return false;	// Boolean
				}
			}
			return true;	// Boolean
		},
		someRev: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: tests whether some element in the array passes the test
			//	implemented by the provided function.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			for(var i = a.length - 1; i >= 0; --i){
				if(f.call(o, a[i], i, a)){
					return true;	// Boolean
				}
			}
			return false;	// Boolean
		}
	});
	
	return df;
});

},
'dojox/charting/Chart':function(){
define("dojox/charting/Chart", ["dojo/_base/lang", "dojo/_base/array","dojo/_base/declare", "dojo/_base/html", 
	"dojo/dom", "dojo/dom-geometry", "dojo/dom-construct","dojo/_base/Color", "dojo/_base/sniff",
	"./Element", "./Theme", "./Series", "./axis2d/common", "dojox/gfx/shape",
	"dojox/gfx", "dojox/lang/functional", "dojox/lang/functional/fold", "dojox/lang/functional/reversed"],
	function(lang, arr, declare, html, 
	 		 dom, domGeom, domConstruct, Color, has,
	 		 Element, Theme, Series, common, shape,
	 		 g, func, funcFold, funcReversed){
	/*=====
	dojox.charting.__ChartCtorArgs = function(margins, stroke, fill, delayInMs){
		//	summary:
		//		The keyword arguments that can be passed in a Chart constructor.
		//
		//	margins: Object?
		//		Optional margins for the chart, in the form of { l, t, r, b}.
		//	stroke: dojox.gfx.Stroke?
		//		An optional outline/stroke for the chart.
		//	fill: dojox.gfx.Fill?
		//		An optional fill for the chart.
		//	delayInMs: Number
		//		Delay in ms for delayedRender(). Default: 200.
		this.margins = margins;
		this.stroke = stroke;
		this.fill = fill;
		this.delayInMs = delayInMs;
	}
	 =====*/
	var dc = dojox.charting,
		clear = func.lambda("item.clear()"),
		purge = func.lambda("item.purgeGroup()"),
		destroy = func.lambda("item.destroy()"),
		makeClean = func.lambda("item.dirty = false"),
		makeDirty = func.lambda("item.dirty = true"),
		getName = func.lambda("item.name");

	declare("dojox.charting.Chart", null, {
		//	summary:
		//		The main chart object in dojox.charting.  This will create a two dimensional
		//		chart based on dojox.gfx.
		//
		//	description:
		//		dojox.charting.Chart is the primary object used for any kind of charts.  It
		//		is simple to create--just pass it a node reference, which is used as the
		//		container for the chart--and a set of optional keyword arguments and go.
		//
		//		Note that like most of dojox.gfx, most of dojox.charting.Chart's methods are
		//		designed to return a reference to the chart itself, to allow for functional
		//		chaining.  This makes defining everything on a Chart very easy to do.
		//
		//	example:
		//		Create an area chart, with smoothing.
		//	|	new dojox.charting.Chart(node))
		//	|		.addPlot("default", { type: "Areas", tension: "X" })
		//	|		.setTheme(dojox.charting.themes.Shrooms)
		//	|		.addSeries("Series A", [1, 2, 0.5, 1.5, 1, 2.8, 0.4])
		//	|		.addSeries("Series B", [2.6, 1.8, 2, 1, 1.4, 0.7, 2])
		//	|		.addSeries("Series C", [6.3, 1.8, 3, 0.5, 4.4, 2.7, 2])
		//	|		.render();
		//
		//	example:
		//		The form of data in a data series can take a number of forms: a simple array,
		//		an array of objects {x,y}, or something custom (as determined by the plot).
		//		Here's an example of a Candlestick chart, which expects an object of
		//		{ open, high, low, close }.
		//	|	new dojox.charting.Chart(node))
		//	|		.addPlot("default", {type: "Candlesticks", gap: 1})
		//	|		.addAxis("x", {fixLower: "major", fixUpper: "major", includeZero: true})
		//	|		.addAxis("y", {vertical: true, fixLower: "major", fixUpper: "major", natural: true})
		//	|		.addSeries("Series A", [
		//	|				{ open: 20, close: 16, high: 22, low: 8 },
		//	|				{ open: 16, close: 22, high: 26, low: 6, mid: 18 },
		//	|				{ open: 22, close: 18, high: 22, low: 11, mid: 21 },
		//	|				{ open: 18, close: 29, high: 32, low: 14, mid: 27 },
		//	|				{ open: 29, close: 24, high: 29, low: 13, mid: 27 },
		//	|				{ open: 24, close: 8, high: 24, low: 5 },
		//	|				{ open: 8, close: 16, high: 22, low: 2 },
		//	|				{ open: 16, close: 12, high: 19, low: 7 },
		//	|				{ open: 12, close: 20, high: 22, low: 8 },
		//	|				{ open: 20, close: 16, high: 22, low: 8 },
		//	|				{ open: 16, close: 22, high: 26, low: 6, mid: 18 },
		//	|				{ open: 22, close: 18, high: 22, low: 11, mid: 21 },
		//	|				{ open: 18, close: 29, high: 32, low: 14, mid: 27 },
		//	|				{ open: 29, close: 24, high: 29, low: 13, mid: 27 },
		//	|				{ open: 24, close: 8, high: 24, low: 5 },
		//	|				{ open: 8, close: 16, high: 22, low: 2 },
		//	|				{ open: 16, close: 12, high: 19, low: 7 },
		//	|				{ open: 12, close: 20, high: 22, low: 8 },
		//	|				{ open: 20, close: 16, high: 22, low: 8 },
		//	|				{ open: 16, close: 22, high: 26, low: 6 },
		//	|				{ open: 22, close: 18, high: 22, low: 11 },
		//	|				{ open: 18, close: 29, high: 32, low: 14 },
		//	|				{ open: 29, close: 24, high: 29, low: 13 },
		//	|				{ open: 24, close: 8, high: 24, low: 5 },
		//	|				{ open: 8, close: 16, high: 22, low: 2 },
		//	|				{ open: 16, close: 12, high: 19, low: 7 },
		//	|				{ open: 12, close: 20, high: 22, low: 8 },
		//	|				{ open: 20, close: 16, high: 22, low: 8 }
		//	|			],
		//	|			{ stroke: { color: "green" }, fill: "lightgreen" }
		//	|		)
		//	|		.render();
		
		//	theme: dojox.charting.Theme?
		//		An optional theme to use for styling the chart.
		//	axes: dojox.charting.Axis{}?
		//		A map of axes for use in plotting a chart.
		//	stack: dojox.charting.plot2d.Base[]
		//		A stack of plotters.
		//	plots: dojox.charting.plot2d.Base{}
		//		A map of plotter indices
		//	series: dojox.charting.Series[]
		//		The stack of data runs used to create plots.
		//	runs: dojox.charting.Series{}
		//		A map of series indices
		//	margins: Object?
		//		The margins around the chart. Default is { l:10, t:10, r:10, b:10 }.
		//	stroke: dojox.gfx.Stroke?
		//		The outline of the chart (stroke in vector graphics terms).
		//	fill: dojox.gfx.Fill?
		//		The color for the chart.
		//	node: DOMNode
		//		The container node passed to the constructor.
		//	surface: dojox.gfx.Surface
		//		The main graphics surface upon which a chart is drawn.
		//	dirty: Boolean
		//		A boolean flag indicating whether or not the chart needs to be updated/re-rendered.
		//	coords: Object
		//		The coordinates on a page of the containing node, as returned from dojo.coords.

		constructor: function(/* DOMNode */node, /* dojox.charting.__ChartCtorArgs? */kwArgs){
			//	summary:
			//		The constructor for a new Chart.  Initializes all parameters used for a chart.
			//	returns: dojox.charting.Chart
			//		The newly created chart.

			// initialize parameters
			if(!kwArgs){ kwArgs = {}; }
			this.margins   = kwArgs.margins ? kwArgs.margins : {l: 10, t: 10, r: 10, b: 10};
			this.stroke    = kwArgs.stroke;
			this.fill      = kwArgs.fill;
			this.delayInMs = kwArgs.delayInMs || 200;
			this.title     = kwArgs.title;
			this.titleGap  = kwArgs.titleGap;
			this.titlePos  = kwArgs.titlePos;
			this.titleFont = kwArgs.titleFont;
			this.titleFontColor = kwArgs.titleFontColor;
			this.chartTitle = null;

			// default initialization
			this.theme = null;
			this.axes = {};		// map of axes
			this.stack = [];	// stack of plotters
			this.plots = {};	// map of plotter indices
			this.series = [];	// stack of data runs
			this.runs = {};		// map of data run indices
			this.dirty = true;
			this.coords = null;

			this._clearRects = [];

			// create a surface
			this.node = dom.byId(node);
			var box = domGeom.getMarginBox(node);
			this.surface = g.createSurface(this.node, box.w || 400, box.h || 300);
		},
		destroy: function(){
			//	summary:
			//		Cleanup when a chart is to be destroyed.
			//	returns: void
			arr.forEach(this.series, destroy);
			arr.forEach(this.stack,  destroy);
			func.forIn(this.axes, destroy);
			if(this.chartTitle && this.chartTitle.tagName){
				// destroy title if it is a DOM node
				domConstruct.destroy(this.chartTitle);
			}
			arr.forEach(this._clearRects, function(child){
				shape.dispose(child);
			});
			this.surface.destroy();
		},
		getCoords: function(){
			//	summary:
			//		Get the coordinates and dimensions of the containing DOMNode, as
			//		returned by dojo.coords.
			//	returns: Object
			//		The resulting coordinates of the chart.  See dojo.coords for details.
			return html.coords(this.node, true); // Object
		},
		setTheme: function(theme){
			//	summary:
			//		Set a theme of the chart.
			//	theme: dojox.charting.Theme
			//		The theme to be used for visual rendering.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			this.theme = theme.clone();
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		addAxis: function(name, kwArgs){
			//	summary:
			//		Add an axis to the chart, for rendering.
			//	name: String
			//		The name of the axis.
			//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
			//		An optional keyword arguments object for use in defining details of an axis.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var axis, axisType = kwArgs && kwArgs.type || "Default";
			if(typeof axisType == "string"){
				if(!dc.axis2d || !dc.axis2d[axisType]){
					throw Error("Can't find axis: " + axisType + " - Check " + "require() dependencies.");
				}
				axis = new dc.axis2d[axisType](this, kwArgs);
			}else{
				axis = new axisType(this, kwArgs);
			}
			axis.name = name;
			axis.dirty = true;
			if(name in this.axes){
				this.axes[name].destroy();
			}
			this.axes[name] = axis;
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		getAxis: function(name){
			//	summary:
			//		Get the given axis, by name.
			//	name: String
			//		The name the axis was defined by.
			//	returns: dojox.charting.axis2d.Default
			//		The axis as stored in the chart's axis map.
			return this.axes[name];	//	dojox.charting.axis2d.Default
		},
		removeAxis: function(name){
			//	summary:
			//		Remove the axis that was defined using name.
			//	name: String
			//		The axis name, as defined in addAxis.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.axes){
				// destroy the axis
				this.axes[name].destroy();
				delete this.axes[name];
				// mark the chart as dirty
				this.dirty = true;
			}
			return this;	//	dojox.charting.Chart
		},
		addPlot: function(name, kwArgs){
			//	summary:
			//		Add a new plot to the chart, defined by name and using the optional keyword arguments object.
			//		Note that dojox.charting assumes the main plot to be called "default"; if you do not have
			//		a plot called "default" and attempt to add data series to the chart without specifying the
			//		plot to be rendered on, you WILL get errors.
			//	name: String
			//		The name of the plot to be added to the chart.  If you only plan on using one plot, call it "default".
			//	kwArgs: dojox.charting.plot2d.__PlotCtorArgs
			//		An object with optional parameters for the plot in question.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var plot, plotType = kwArgs && kwArgs.type || "Default";
			if(typeof plotType == "string"){
				if(!dc.plot2d || !dc.plot2d[plotType]){
					throw Error("Can't find plot: " + plotType + " - didn't you forget to dojo" + ".require() it?");
				}
				plot = new dc.plot2d[plotType](this, kwArgs);
			}else{
				plot = new plotType(this, kwArgs);
			}
			plot.name = name;
			plot.dirty = true;
			if(name in this.plots){
				this.stack[this.plots[name]].destroy();
				this.stack[this.plots[name]] = plot;
			}else{
				this.plots[name] = this.stack.length;
				this.stack.push(plot);
			}
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		getPlot: function(name){
			//	summary:
			//		Get the given plot, by name.
			//	name: String
			//		The name the plot was defined by.
			//	returns: dojox.charting.plot2d.Base
			//		The plot.
			return this.stack[this.plots[name]];
		},
		removePlot: function(name){
			//	summary:
			//		Remove the plot defined using name from the chart's plot stack.
			//	name: String
			//		The name of the plot as defined using addPlot.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.plots){
				// get the index and remove the name
				var index = this.plots[name];
				delete this.plots[name];
				// destroy the plot
				this.stack[index].destroy();
				// remove the plot from the stack
				this.stack.splice(index, 1);
				// update indices to reflect the shift
				func.forIn(this.plots, function(idx, name, plots){
					if(idx > index){
						plots[name] = idx - 1;
					}
				});
				// remove all related series
				var ns = arr.filter(this.series, function(run){ return run.plot != name; });
				if(ns.length < this.series.length){
					// kill all removed series
					arr.forEach(this.series, function(run){
						if(run.plot == name){
							run.destroy();
						}
					});
					// rebuild all necessary data structures
					this.runs = {};
					arr.forEach(ns, function(run, index){
						this.runs[run.plot] = index;
					}, this);
					this.series = ns;
				}
				// mark the chart as dirty
				this.dirty = true;
			}
			return this;	//	dojox.charting.Chart
		},
		getPlotOrder: function(){
			//	summary:
			//		Returns an array of plot names in the current order
			//		(the top-most plot is the first).
			//	returns: Array
			return func.map(this.stack, getName); // Array
		},
		setPlotOrder: function(newOrder){
			//	summary:
			//		Sets new order of plots. newOrder cannot add or remove
			//		plots. Wrong names, or dups are ignored.
			//	newOrder: Array:
			//		Array of plot names compatible with getPlotOrder().
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var names = {},
				order = func.filter(newOrder, function(name){
					if(!(name in this.plots) || (name in names)){
						return false;
					}
					names[name] = 1;
					return true;
				}, this);
			if(order.length < this.stack.length){
				func.forEach(this.stack, function(plot){
					var name = plot.name;
					if(!(name in names)){
						order.push(name);
					}
				});
			}
			var newStack = func.map(order, function(name){
					return this.stack[this.plots[name]];
				}, this);
			func.forEach(newStack, function(plot, i){
				this.plots[plot.name] = i;
			}, this);
			this.stack = newStack;
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		movePlotToFront: function(name){
			//	summary:
			//		Moves a given plot to front.
			//	name: String:
			//		Plot's name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.plots){
				var index = this.plots[name];
				if(index){
					var newOrder = this.getPlotOrder();
					newOrder.splice(index, 1);
					newOrder.unshift(name);
					return this.setPlotOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		movePlotToBack: function(name){
			//	summary:
			//		Moves a given plot to back.
			//	name: String:
			//		Plot's name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.plots){
				var index = this.plots[name];
				if(index < this.stack.length - 1){
					var newOrder = this.getPlotOrder();
					newOrder.splice(index, 1);
					newOrder.push(name);
					return this.setPlotOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		addSeries: function(name, data, kwArgs){
			//	summary:
			//		Add a data series to the chart for rendering.
			//	name: String:
			//		The name of the data series to be plotted.
			//	data: Array|Object:
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			//	kwArgs: dojox.charting.__SeriesCtorArgs?:
			//		An optional keyword arguments object that will be mixed into
			//		the resultant series object.
			//	returns: dojox.charting.Chart:
			//		A reference to the current chart for functional chaining.
			var run = new Series(this, data, kwArgs);
			run.name = name;
			if(name in this.runs){
				this.series[this.runs[name]].destroy();
				this.series[this.runs[name]] = run;
			}else{
				this.runs[name] = this.series.length;
				this.series.push(run);
			}
			this.dirty = true;
			// fix min/max
			if(!("ymin" in run) && "min" in run){ run.ymin = run.min; }
			if(!("ymax" in run) && "max" in run){ run.ymax = run.max; }
			return this;	//	dojox.charting.Chart
		},
		getSeries: function(name){
			//	summary:
			//		Get the given series, by name.
			//	name: String
			//		The name the series was defined by.
			//	returns: dojox.charting.Series
			//		The series.
			return this.series[this.runs[name]];
		},
		removeSeries: function(name){
			//	summary:
			//		Remove the series defined by name from the chart.
			//	name: String
			//		The name of the series as defined by addSeries.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				// get the index and remove the name
				var index = this.runs[name];
				delete this.runs[name];
				// destroy the run
				this.series[index].destroy();
				// remove the run from the stack of series
				this.series.splice(index, 1);
				// update indices to reflect the shift
				func.forIn(this.runs, function(idx, name, runs){
					if(idx > index){
						runs[name] = idx - 1;
					}
				});
				this.dirty = true;
			}
			return this;	//	dojox.charting.Chart
		},
		updateSeries: function(name, data){
			//	summary:
			//		Update the given series with a new set of data points.
			//	name: String
			//		The name of the series as defined in addSeries.
			//	data: Array|Object:
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				var run = this.series[this.runs[name]];
				run.update(data);
				this._invalidateDependentPlots(run.plot, false);
				this._invalidateDependentPlots(run.plot, true);
			}
			return this;	//	dojox.charting.Chart
		},
		getSeriesOrder: function(plotName){
			//	summary:
			//		Returns an array of series names in the current order
			//		(the top-most series is the first) within a plot.
			//	plotName: String:
			//		Plot's name.
			//	returns: Array
			return func.map(func.filter(this.series, function(run){
					return run.plot == plotName;
				}), getName);
		},
		setSeriesOrder: function(newOrder){
			//	summary:
			//		Sets new order of series within a plot. newOrder cannot add
			//		or remove series. Wrong names, or dups are ignored.
			//	newOrder: Array:
			//		Array of series names compatible with getPlotOrder(). All
			//		series should belong to the same plot.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var plotName, names = {},
				order = func.filter(newOrder, function(name){
					if(!(name in this.runs) || (name in names)){
						return false;
					}
					var run = this.series[this.runs[name]];
					if(plotName){
						if(run.plot != plotName){
							return false;
						}
					}else{
						plotName = run.plot;
					}
					names[name] = 1;
					return true;
				}, this);
			func.forEach(this.series, function(run){
				var name = run.name;
				if(!(name in names) && run.plot == plotName){
					order.push(name);
				}
			});
			var newSeries = func.map(order, function(name){
					return this.series[this.runs[name]];
				}, this);
			this.series = newSeries.concat(func.filter(this.series, function(run){
				return run.plot != plotName;
			}));
			func.forEach(this.series, function(run, i){
				this.runs[run.name] = i;
			}, this);
			this.dirty = true;
			return this;	//	dojox.charting.Chart
		},
		moveSeriesToFront: function(name){
			//	summary:
			//		Moves a given series to front of a plot.
			//	name: String:
			//		Series' name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				var index = this.runs[name],
					newOrder = this.getSeriesOrder(this.series[index].plot);
				if(name != newOrder[0]){
					newOrder.splice(index, 1);
					newOrder.unshift(name);
					return this.setSeriesOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		moveSeriesToBack: function(name){
			//	summary:
			//		Moves a given series to back of a plot.
			//	name: String:
			//		Series' name to move.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(name in this.runs){
				var index = this.runs[name],
					newOrder = this.getSeriesOrder(this.series[index].plot);
				if(name != newOrder[newOrder.length - 1]){
					newOrder.splice(index, 1);
					newOrder.push(name);
					return this.setSeriesOrder(newOrder);	//	dojox.charting.Chart
				}
			}
			return this;	//	dojox.charting.Chart
		},
		resize: function(width, height){
			//	summary:
			//		Resize the chart to the dimensions of width and height.
			//	description:
			//		Resize the chart and its surface to the width and height dimensions.
			//		If no width/height or box is provided, resize the surface to the marginBox of the chart.
			//	width: Number
			//		The new width of the chart.
			//	height: Number
			//		The new height of the chart.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var box;
			switch(arguments.length){
				// case 0, do not resize the div, just the surface
				case 1:
					// argument, override node box
					box = lang.mixin({}, width);
					domGeom.setMarginBox(this.node, box);
					break;
				case 2:
					box = {w: width, h: height};
					// argument, override node box
					domGeom.setMarginBox(this.node, box);
					break;
			}
			// in all cases take back the computed box
			box = domGeom.getMarginBox(this.node);
			var d = this.surface.getDimensions();
			if(d.width != box.w || d.height != box.h){
				// and set it on the surface
				this.surface.setDimensions(box.w, box.h);
				this.dirty = true;
				return this.render();	//	dojox.charting.Chart
			}else{
				return this;
			}
		},
		getGeometry: function(){
			//	summary:
			//		Returns a map of information about all axes in a chart and what they represent
			//		in terms of scaling (see dojox.charting.axis2d.Default.getScaler).
			//	returns: Object
			//		An map of geometry objects, a one-to-one mapping of axes.
			var ret = {};
			func.forIn(this.axes, function(axis){
				if(axis.initialized()){
					ret[axis.name] = {
						name:		axis.name,
						vertical:	axis.vertical,
						scaler:		axis.scaler,
						ticks:		axis.ticks
					};
				}
			});
			return ret;	//	Object
		},
		setAxisWindow: function(name, scale, offset, zoom){
			//	summary:
			//		Zooms an axis and all dependent plots. Can be used to zoom in 1D.
			//	name: String
			//		The name of the axis as defined by addAxis.
			//	scale: Number
			//		The scale on the target axis.
			//	offset: Number
			//		Any offest, as measured by axis tick
			//	zoom: Boolean|Object?
			//		The chart zooming animation trigger.  This is null by default,
			//		e.g. {duration: 1200}, or just set true.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			var axis = this.axes[name];
			if(axis){
				axis.setWindow(scale, offset);
				arr.forEach(this.stack,function(plot){
					if(plot.hAxis == name || plot.vAxis == name){
						plot.zoom = zoom;
					}
				});
			}
			return this;	//	dojox.charting.Chart
		},
		setWindow: function(sx, sy, dx, dy, zoom){
			//	summary:
			//		Zooms in or out any plots in two dimensions.
			//	sx: Number
			//		The scale for the x axis.
			//	sy: Number
			//		The scale for the y axis.
			//	dx: Number
			//		The pixel offset on the x axis.
			//	dy: Number
			//		The pixel offset on the y axis.
			//	zoom: Boolean|Object?
			//		The chart zooming animation trigger.  This is null by default,
			//		e.g. {duration: 1200}, or just set true.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(!("plotArea" in this)){
				this.calculateGeometry();
			}
			func.forIn(this.axes, function(axis){
				var scale, offset, bounds = axis.getScaler().bounds,
					s = bounds.span / (bounds.upper - bounds.lower);
				if(axis.vertical){
					scale  = sy;
					offset = dy / s / scale;
				}else{
					scale  = sx;
					offset = dx / s / scale;
				}
				axis.setWindow(scale, offset);
			});
			arr.forEach(this.stack, function(plot){ plot.zoom = zoom; });
			return this;	//	dojox.charting.Chart
		},
		zoomIn:	function(name, range){
			//	summary:
			//		Zoom the chart to a specific range on one axis.  This calls render()
			//		directly as a convenience method.
			//	name: String
			//		The name of the axis as defined by addAxis.
			//	range: Array
			//		The end points of the zoom range, measured in axis ticks.
			var axis = this.axes[name];
			if(axis){
				var scale, offset, bounds = axis.getScaler().bounds;
				var lower = Math.min(range[0],range[1]);
				var upper = Math.max(range[0],range[1]);
				lower = range[0] < bounds.lower ? bounds.lower : lower;
				upper = range[1] > bounds.upper ? bounds.upper : upper;
				scale = (bounds.upper - bounds.lower) / (upper - lower);
				offset = lower - bounds.lower;
				this.setAxisWindow(name, scale, offset);
				this.render();
			}
		},
		calculateGeometry: function(){
			//	summary:
			//		Calculate the geometry of the chart based on the defined axes of
			//		a chart.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(this.dirty){
				return this.fullGeometry();
			}

			// calculate geometry
			var dirty = arr.filter(this.stack, function(plot){
					return plot.dirty ||
						(plot.hAxis && this.axes[plot.hAxis].dirty) ||
						(plot.vAxis && this.axes[plot.vAxis].dirty);
				}, this);
			calculateAxes(dirty, this.plotArea);

			return this;	//	dojox.charting.Chart
		},
		fullGeometry: function(){
			//	summary:
			//		Calculate the full geometry of the chart.  This includes passing
			//		over all major elements of a chart (plots, axes, series, container)
			//		in order to ensure proper rendering.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			this._makeDirty();

			// clear old values
			arr.forEach(this.stack, clear);

			// rebuild new connections, and add defaults

			// set up a theme
			if(!this.theme){
				this.setTheme(new Theme(dojox.charting._def));
			}

			// assign series
			arr.forEach(this.series, function(run){
				if(!(run.plot in this.plots)){
					if(!dc.plot2d || !dc.plot2d.Default){
						throw Error("Can't find plot: Default - didn't you forget to dojo" + ".require() it?");
					}
					var plot = new dc.plot2d.Default(this, {});
					plot.name = run.plot;
					this.plots[run.plot] = this.stack.length;
					this.stack.push(plot);
				}
				this.stack[this.plots[run.plot]].addSeries(run);
			}, this);
			// assign axes
			arr.forEach(this.stack, function(plot){
				if(plot.hAxis){
					plot.setAxis(this.axes[plot.hAxis]);
				}
				if(plot.vAxis){
					plot.setAxis(this.axes[plot.vAxis]);
				}
			}, this);

			// calculate geometry

			// 1st pass
			var dim = this.dim = this.surface.getDimensions();
			dim.width  = g.normalizedLength(dim.width);
			dim.height = g.normalizedLength(dim.height);
			func.forIn(this.axes, clear);
			calculateAxes(this.stack, dim);

			// assumption: we don't have stacked axes yet
			var offsets = this.offsets = { l: 0, r: 0, t: 0, b: 0 };
			func.forIn(this.axes, function(axis){
				func.forIn(axis.getOffsets(), function(o, i){ offsets[i] += o; });
			});
			// add title area
			if(this.title){
				this.titleGap = (this.titleGap==0) ? 0 : this.titleGap || this.theme.chart.titleGap || 20;
				this.titlePos = this.titlePos || this.theme.chart.titlePos || "top";
				this.titleFont = this.titleFont || this.theme.chart.titleFont;
				this.titleFontColor = this.titleFontColor || this.theme.chart.titleFontColor || "black";
				var tsize = g.normalizedLength(g.splitFontString(this.titleFont).size);
				offsets[this.titlePos=="top" ? "t":"b"] += (tsize + this.titleGap);
			}
			// add margins
			func.forIn(this.margins, function(o, i){ offsets[i] += o; });

			// 2nd pass with realistic dimensions
			this.plotArea = {
				width: dim.width - offsets.l - offsets.r,
				height: dim.height - offsets.t - offsets.b
			};
			func.forIn(this.axes, clear);
			calculateAxes(this.stack, this.plotArea);

			return this;	//	dojox.charting.Chart
		},
		render: function(){
			//	summary:
			//		Render the chart according to the current information defined.  This should
			//		be the last call made when defining/creating a chart, or if data within the
			//		chart has been changed.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(this.theme){
				this.theme.clear();
			}

			if(this.dirty){
				return this.fullRender();
			}

			this.calculateGeometry();

			// go over the stack backwards
			func.forEachRev(this.stack, function(plot){ plot.render(this.dim, this.offsets); }, this);

			// go over axes
			func.forIn(this.axes, function(axis){ axis.render(this.dim, this.offsets); }, this);

			this._makeClean();

			// BEGIN FOR HTML CANVAS
			if(this.surface.render){ this.surface.render(); };
			// END FOR HTML CANVAS

			return this;	//	dojox.charting.Chart
		},
		fullRender: function(){
			//	summary:
			//		Force a full rendering of the chart, including full resets on the chart itself.
			//		You should not call this method directly unless absolutely necessary.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.

			// calculate geometry
			this.fullGeometry();
			var offsets = this.offsets, dim = this.dim, rect;

			// get required colors
			//var requiredColors = func.foldl(this.stack, "z + plot.getRequiredColors()", 0);
			//this.theme.defineColors({num: requiredColors, cache: false});

			// clear old shapes
			arr.forEach(this.series, purge);
			func.forIn(this.axes, purge);
			arr.forEach(this.stack,  purge);
			arr.forEach(this._clearRects, function(child){
				shape.dispose(child);
			});
			this._clearRects = [];
			if(this.chartTitle && this.chartTitle.tagName){
				// destroy title if it is a DOM node
			    domConstruct.destroy(this.chartTitle);
            }
			this.surface.clear();
			this.chartTitle = null;

			// generate shapes

			// draw a plot background
			var t = this.theme,
				fill   = t.plotarea && t.plotarea.fill,
				stroke = t.plotarea && t.plotarea.stroke,
				// size might be neg if offsets are bigger that chart size this happens quite often at 
				// initialization time if the chart widget is used in a BorderContainer
				// this will fail on IE/VML
				w = Math.max(0, dim.width  - offsets.l - offsets.r),
				h = Math.max(0, dim.height - offsets.t - offsets.b),
				rect = {
					x: offsets.l - 1, y: offsets.t - 1,
					width:  w + 2,
					height: h + 2
				};
			if(fill){
				fill = Element.prototype._shapeFill(Element.prototype._plotFill(fill, dim, offsets), rect);
				this._clearRects.push(this.surface.createRect(rect).setFill(fill));
			}
			if(stroke){
				this._clearRects.push(this.surface.createRect({
					x: offsets.l, y: offsets.t,
					width:  w + 1,
					height: h + 1
				}).setStroke(stroke));
			}

			// go over the stack backwards
			func.foldr(this.stack, function(z, plot){ return plot.render(dim, offsets), 0; }, 0);

			// pseudo-clipping: matting
			fill   = this.fill   !== undefined ? this.fill   : (t.chart && t.chart.fill);
			stroke = this.stroke !== undefined ? this.stroke : (t.chart && t.chart.stroke);

			//	TRT: support for "inherit" as a named value in a theme.
			if(fill == "inherit"){
				//	find the background color of the nearest ancestor node, and use that explicitly.
				var node = this.node, fill = new Color(html.style(node, "backgroundColor"));
				while(fill.a==0 && node!=document.documentElement){
					fill = new Color(html.style(node, "backgroundColor"));
					node = node.parentNode;
				}
			}

			if(fill){
				fill = Element.prototype._plotFill(fill, dim, offsets);
				if(offsets.l){	// left
					rect = {
						width:  offsets.l,
						height: dim.height + 1
					};
					this._clearRects.push(this.surface.createRect(rect).setFill(Element.prototype._shapeFill(fill, rect)));
				}
				if(offsets.r){	// right
					rect = {
						x: dim.width - offsets.r,
						width:  offsets.r + 1,
						height: dim.height + 2
					};
					this._clearRects.push(this.surface.createRect(rect).setFill(Element.prototype._shapeFill(fill, rect)));
				}
				if(offsets.t){	// top
					rect = {
						width:  dim.width + 1,
						height: offsets.t
					};
					this._clearRects.push(this.surface.createRect(rect).setFill(Element.prototype._shapeFill(fill, rect)));
				}
				if(offsets.b){	// bottom
					rect = {
						y: dim.height - offsets.b,
						width:  dim.width + 1,
						height: offsets.b + 2
					};
					this._clearRects.push(this.surface.createRect(rect).setFill(Element.prototype._shapeFill(fill, rect)));
				}
			}
			if(stroke){
				this._clearRects.push(this.surface.createRect({
					width:  dim.width - 1,
					height: dim.height - 1
				}).setStroke(stroke));
			}

			//create title: Whether to make chart title as a widget which extends dojox.charting.Element?
			if(this.title){
				var forceHtmlLabels = (g.renderer == "canvas"),
					labelType = forceHtmlLabels || !has("ie") && !has("opera") ? "html" : "gfx",
					tsize = g.normalizedLength(g.splitFontString(this.titleFont).size);
				this.chartTitle = common.createText[labelType](
					this,
					this.surface,
					dim.width/2,
					this.titlePos=="top" ? tsize + this.margins.t : dim.height - this.margins.b,
					"middle",
					this.title,
					this.titleFont,
					this.titleFontColor
				);
			}

			// go over axes
			func.forIn(this.axes, function(axis){ axis.render(dim, offsets); });

			this._makeClean();

			// BEGIN FOR HTML CANVAS
			if(this.surface.render){ this.surface.render(); };
			// END FOR HTML CANVAS

			return this;	//	dojox.charting.Chart
		},
		delayedRender: function(){
			//	summary:
			//		Delayed render, which is used to collect multiple updates
			//		within a delayInMs time window.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.

			if(!this._delayedRenderHandle){
				this._delayedRenderHandle = setTimeout(
					lang.hitch(this, function(){
						clearTimeout(this._delayedRenderHandle);
						this._delayedRenderHandle = null;
						this.render();
					}),
					this.delayInMs
				);
			}

			return this;	//	dojox.charting.Chart
		},
		connectToPlot: function(name, object, method){
			//	summary:
			//		A convenience method to connect a function to a plot.
			//	name: String
			//		The name of the plot as defined by addPlot.
			//	object: Object
			//		The object to be connected.
			//	method: Function
			//		The function to be executed.
			//	returns: Array
			//		A handle to the connection, as defined by dojo.connect (see dojo.connect).
			return name in this.plots ? this.stack[this.plots[name]].connect(object, method) : null;	//	Array
		},
		fireEvent: function(seriesName, eventName, index){
			//	summary:
			//		Fires a synthetic event for a series item.
			//	seriesName: String:
			//		Series name.
			//	eventName: String:
			//		Event name to simulate: onmouseover, onmouseout, onclick.
			//	index: Number:
			//		Valid data value index for the event.
			//	returns: dojox.charting.Chart
			//		A reference to the current chart for functional chaining.
			if(seriesName in this.runs){
				var plotName = this.series[this.runs[seriesName]].plot;
				if(plotName in this.plots){
					var plot = this.stack[this.plots[plotName]];
					if(plot){
						plot.fireEvent(seriesName, eventName, index);
					}
				}
			}
			return this;	//	dojox.charting.Chart
		},
		_makeClean: function(){
			// reset dirty flags
			arr.forEach(this.axes,   makeClean);
			arr.forEach(this.stack,  makeClean);
			arr.forEach(this.series, makeClean);
			this.dirty = false;
		},
		_makeDirty: function(){
			// reset dirty flags
			arr.forEach(this.axes,   makeDirty);
			arr.forEach(this.stack,  makeDirty);
			arr.forEach(this.series, makeDirty);
			this.dirty = true;
		},
		_invalidateDependentPlots: function(plotName, /* Boolean */ verticalAxis){
			if(plotName in this.plots){
				var plot = this.stack[this.plots[plotName]], axis,
					axisName = verticalAxis ? "vAxis" : "hAxis";
				if(plot[axisName]){
					axis = this.axes[plot[axisName]];
					if(axis && axis.dependOnData()){
						axis.dirty = true;
						// find all plots and mark them dirty
						arr.forEach(this.stack, function(p){
							if(p[axisName] && p[axisName] == plot[axisName]){
								p.dirty = true;
							}
						});
					}
				}else{
					plot.dirty = true;
				}
			}
		}
	});

	function hSection(stats){
		return {min: stats.hmin, max: stats.hmax};
	}

	function vSection(stats){
		return {min: stats.vmin, max: stats.vmax};
	}

	function hReplace(stats, h){
		stats.hmin = h.min;
		stats.hmax = h.max;
	}

	function vReplace(stats, v){
		stats.vmin = v.min;
		stats.vmax = v.max;
	}

	function combineStats(target, source){
		if(target && source){
			target.min = Math.min(target.min, source.min);
			target.max = Math.max(target.max, source.max);
		}
		return target || source;
	}

	function calculateAxes(stack, plotArea){
		var plots = {}, axes = {};
		arr.forEach(stack, function(plot){
			var stats = plots[plot.name] = plot.getSeriesStats();
			if(plot.hAxis){
				axes[plot.hAxis] = combineStats(axes[plot.hAxis], hSection(stats));
			}
			if(plot.vAxis){
				axes[plot.vAxis] = combineStats(axes[plot.vAxis], vSection(stats));
			}
		});
		arr.forEach(stack, function(plot){
			var stats = plots[plot.name];
			if(plot.hAxis){
				hReplace(stats, axes[plot.hAxis]);
			}
			if(plot.vAxis){
				vReplace(stats, axes[plot.vAxis]);
			}
			plot.initializeScalers(plotArea, stats);
		});
	}
	
	return dojox.charting.Chart;
});

},
'dojox/color/Palette':function(){
define("dojox/color/Palette", ["dojo/_base/kernel", "../main", "dojo/_base/lang", "dojo/_base/array", "./_base"], 
	function(dojo, dojox, lang, arr, dxc){

	/***************************************************************
	*	dojox.color.Palette
	*
	*	The Palette object is loosely based on the color palettes
	*	at Kuler (http://kuler.adobe.com).  They are 5 color palettes
	*	with the base color considered to be the third color in the
	*	palette (for generation purposes).
	*
	*	Palettes can be generated from well-known algorithms or they
	* 	can be manually created by passing an array to the constructor.
	*
	*	Palettes can be transformed, using a set of specific params
	*	similar to the way shapes can be transformed with dojox.gfx.
	*	However, unlike with transformations in dojox.gfx, transforming
	* 	a palette will return you a new Palette object, in effect
	* 	a clone of the original.
	***************************************************************/

	//	ctor ----------------------------------------------------------------------------
	dxc.Palette = function(/* String|Array|dojox.color.Color|dojox.color.Palette */base){
		//	summary:
		//		An object that represents a palette of colors.
		//	description:
		//		A Palette is a representation of a set of colors.  While the standard
		//		number of colors contained in a palette is 5, it can really handle any
		//		number of colors.
		//
		//		A palette is useful for the ability to transform all the colors in it
		//		using a simple object-based approach.  In addition, you can generate
		//		palettes using dojox.color.Palette.generate; these generated palettes
		//		are based on the palette generators at http://kuler.adobe.com.
		//
		//	colors: dojox.color.Color[]
		//		The actual color references in this palette.
		this.colors = [];
		if(base instanceof dxc.Palette){
			this.colors = base.colors.slice(0);
		}
		else if(base instanceof dxc.Color){
			this.colors = [ null, null, base, null, null ];
		}
		else if(lang.isArray(base)){
			this.colors = arr.map(base.slice(0), function(item){
				if(lang.isString(item)){ return new dxc.Color(item); }
				return item;
			});
		}
		else if (lang.isString(base)){
			this.colors = [ null, null, new dxc.Color(base), null, null ];
		}
	}

	//	private functions ---------------------------------------------------------------

	//	transformations
	function tRGBA(p, param, val){
		var ret = new dxc.Palette();
		ret.colors = [];
		arr.forEach(p.colors, function(item){
			var r=(param=="dr")?item.r+val:item.r,
				g=(param=="dg")?item.g+val:item.g,
				b=(param=="db")?item.b+val:item.b,
				a=(param=="da")?item.a+val:item.a
			ret.colors.push(new dxc.Color({
				r: Math.min(255, Math.max(0, r)),
				g: Math.min(255, Math.max(0, g)),
				b: Math.min(255, Math.max(0, b)),
				a: Math.min(1, Math.max(0, a))
			}));
		});
		return ret;
	}

	function tCMY(p, param, val){
		var ret = new dxc.Palette();
		ret.colors = [];
		arr.forEach(p.colors, function(item){
			var o=item.toCmy(),
				c=(param=="dc")?o.c+val:o.c,
				m=(param=="dm")?o.m+val:o.m,
				y=(param=="dy")?o.y+val:o.y;
			ret.colors.push(dxc.fromCmy(
				Math.min(100, Math.max(0, c)),
				Math.min(100, Math.max(0, m)),
				Math.min(100, Math.max(0, y))
			));
		});
		return ret;
	}

	function tCMYK(p, param, val){
		var ret = new dxc.Palette();
		ret.colors = [];
		arr.forEach(p.colors, function(item){
			var o=item.toCmyk(),
				c=(param=="dc")?o.c+val:o.c,
				m=(param=="dm")?o.m+val:o.m,
				y=(param=="dy")?o.y+val:o.y,
				k=(param=="dk")?o.b+val:o.b;
			ret.colors.push(dxc.fromCmyk(
				Math.min(100, Math.max(0, c)),
				Math.min(100, Math.max(0, m)),
				Math.min(100, Math.max(0, y)),
				Math.min(100, Math.max(0, k))
			));
		});
		return ret;
	}

	function tHSL(p, param, val){
		var ret = new dxc.Palette();
		ret.colors = [];
		arr.forEach(p.colors, function(item){
			var o=item.toHsl(),
				h=(param=="dh")?o.h+val:o.h,
				s=(param=="ds")?o.s+val:o.s,
				l=(param=="dl")?o.l+val:o.l;
			ret.colors.push(dxc.fromHsl(h%360, Math.min(100, Math.max(0, s)), Math.min(100, Math.max(0, l))));
		});
		return ret;
	}

	function tHSV(p, param, val){
		var ret = new dxc.Palette();
		ret.colors = [];
		arr.forEach(p.colors, function(item){
			var o=item.toHsv(),
				h=(param=="dh")?o.h+val:o.h,
				s=(param=="ds")?o.s+val:o.s,
				v=(param=="dv")?o.v+val:o.v;
			ret.colors.push(dxc.fromHsv(h%360, Math.min(100, Math.max(0, s)), Math.min(100, Math.max(0, v))));
		});
		return ret;
	}

	//	helper functions
	function rangeDiff(val, low, high){
		//	given the value in a range from 0 to high, find the equiv
		//		using the range low to high.
		return high-((high-val)*((high-low)/high));
	}

	//	object methods ---------------------------------------------------------------
	lang.extend(dxc.Palette, {
		transform: function(/* dojox.color.Palette.__transformArgs */kwArgs){
			//	summary:
			//		Transform the palette using a specific transformation function
			//		and a set of transformation parameters.
			//	description:
			//		{palette}.transform is a simple way to uniformly transform
			//		all of the colors in a palette using any of 5 formulae:
			//		RGBA, HSL, HSV, CMYK or CMY.
			//
			//		Once the forumula to be used is determined, you can pass any
			//		number of parameters based on the formula "d"[param]; for instance,
			//		{ use: "rgba", dr: 20, dg: -50 } will take all of the colors in
			//		palette, add 20 to the R value and subtract 50 from the G value.
			//
			//		Unlike other types of transformations, transform does *not* alter
			//		the original palette but will instead return a new one.
			var fn=tRGBA;	//	the default transform function.
			if(kwArgs.use){
				//	we are being specific about the algo we want to use.
				var use=kwArgs.use.toLowerCase();
				if(use.indexOf("hs")==0){
					if(use.charAt(2)=="l"){ fn=tHSL; }
					else { fn=tHSV; }
				}
				else if(use.indexOf("cmy")==0){
					if(use.charAt(3)=="k"){ fn=tCMYK; }
					else { fn=tCMY; }
				}
			}
			//	try to guess the best choice.
			else if("dc" in kwArgs || "dm" in kwArgs || "dy" in kwArgs){
				if("dk" in kwArgs){ fn = tCMYK; }
				else { fn = tCMY; }
			}
			else if("dh" in kwArgs || "ds" in kwArgs){
				if("dv" in kwArgs){ fn = tHSV; }
				else { fn = tHSL; }
			}

			var palette = this;
			for(var p in kwArgs){
				//	ignore use
				if(p=="use"){ continue; }
				palette = fn(palette, p, kwArgs[p]);
			}
			return palette;		//	dojox.color.Palette
		},
		clone: function(){
			//	summary:
			//		Clones the current palette.
			return new dxc.Palette(this);	//	dojox.color.Palette
		}
	});

/*=====
dojox.color.Palette.__transformArgs = function(use, dr, dg, db, da, dc, dm, dy, dk, dh, ds, dv, dl){
	//	summary:
	//		The keywords argument to be passed to the dojox.color.Palette.transform function.  Note that
	//		while all arguments are optional, *some* arguments must be passed.  The basic concept is that
	//		you pass a delta value for a specific aspect of a color model (or multiple aspects of the same
	//		color model); for instance, if you wish to transform a palette based on the HSV color model,
	//		you would pass one of "dh", "ds", or "dv" as a value.
	//
	//	use: String?
	//		Specify the color model to use for the transformation.  Can be "rgb", "rgba", "hsv", "hsl", "cmy", "cmyk".
	//	dr: Number?
	//		The delta to be applied to the red aspect of the RGB/RGBA color model.
	//	dg: Number?
	//		The delta to be applied to the green aspect of the RGB/RGBA color model.
	//	db: Number?
	//		The delta to be applied to the blue aspect of the RGB/RGBA color model.
	//	da: Number?
	//		The delta to be applied to the alpha aspect of the RGBA color model.
	//	dc: Number?
	//		The delta to be applied to the cyan aspect of the CMY/CMYK color model.
	//	dm: Number?
	//		The delta to be applied to the magenta aspect of the CMY/CMYK color model.
	//	dy: Number?
	//		The delta to be applied to the yellow aspect of the CMY/CMYK color model.
	//	dk: Number?
	//		The delta to be applied to the black aspect of the CMYK color model.
	//	dh: Number?
	//		The delta to be applied to the hue aspect of the HSL/HSV color model.
	//	ds: Number?
	//		The delta to be applied to the saturation aspect of the HSL/HSV color model.
	//	dl: Number?
	//		The delta to be applied to the luminosity aspect of the HSL color model.
	//	dv: Number?
	//		The delta to be applied to the value aspect of the HSV color model.
	this.use = use;
	this.dr = dr;
	this.dg = dg;
	this.db = db;
	this.da = da;
	this.dc = dc;
	this.dm = dm;
	this.dy = dy;
	this.dk = dk;
	this.dh = dh;
	this.ds = ds;
	this.dl = dl;
	this.dv = dv;
}
dojox.color.Palette.__generatorArgs = function(base){
	//	summary:
	//		The keyword arguments object used to create a palette based on a base color.
	//
	//	base: dojo.Color
	//		The base color to be used to generate the palette.
	this.base = base;
}
dojox.color.Palette.__analogousArgs = function(base, high, low){
	//	summary:
	//		The keyword arguments object that is used to create a 5 color palette based on the
	//		analogous rules as implemented at http://kuler.adobe.com, using the HSV color model.
	//
	//	base: dojo.Color
	//		The base color to be used to generate the palette.
	//	high: Number?
	//		The difference between the hue of the base color and the highest hue.  In degrees, default is 60.
	//	low: Number?
	//		The difference between the hue of the base color and the lowest hue.  In degrees, default is 18.
	this.base = base;
	this.high = high;
	this.low = low;
}
dojox.color.Palette.__splitComplementaryArgs = function(base, da){
	//	summary:
	//		The keyword arguments object used to create a palette based on the split complementary rules
	//		as implemented at http://kuler.adobe.com.
	//
	//	base: dojo.Color
	//		The base color to be used to generate the palette.
	//	da: Number?
	//		The delta angle to be used to determine where the split for the complementary rules happen.
	//		In degrees, the default is 30.
	this.base = base;
	this.da = da;
}
=====*/
	lang.mixin(dxc.Palette, {
		generators: {
			analogous:function(/* dojox.color.Palette.__analogousArgs */args){
				//	summary:
				//		Create a 5 color palette based on the analogous rules as implemented at
				//		http://kuler.adobe.com.
				var high=args.high||60, 	//	delta between base hue and highest hue (subtracted from base)
					low=args.low||18,		//	delta between base hue and lowest hue (added to base)
					base = lang.isString(args.base)?new dxc.Color(args.base):args.base,
					hsv=base.toHsv();

				//	generate our hue angle differences
				var h=[
					(hsv.h+low+360)%360,
					(hsv.h+Math.round(low/2)+360)%360,
					hsv.h,
					(hsv.h-Math.round(high/2)+360)%360,
					(hsv.h-high+360)%360
				];

				var s1=Math.max(10, (hsv.s<=95)?hsv.s+5:(100-(hsv.s-95))),
					s2=(hsv.s>1)?hsv.s-1:21-hsv.s,
					v1=(hsv.v>=92)?hsv.v-9:Math.max(hsv.v+9, 20),
					v2=(hsv.v<=90)?Math.max(hsv.v+5, 20):(95+Math.ceil((hsv.v-90)/2)),
					s=[ s1, s2, hsv.s, s1, s1 ],
					v=[ v1, v2, hsv.v, v1, v2 ]

				return new dxc.Palette(arr.map(h, function(hue, i){
					return dxc.fromHsv(hue, s[i], v[i]);
				}));		//	dojox.color.Palette
			},

			monochromatic: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the monochromatic rules as implemented at
				//		http://kuler.adobe.com.
				var base = lang.isString(args.base)?new dxc.Color(args.base):args.base,
					hsv = base.toHsv();
				
				//	figure out the saturation and value
				var s1 = (hsv.s-30>9)?hsv.s-30:hsv.s+30,
					s2 = hsv.s,
					v1 = rangeDiff(hsv.v, 20, 100),
					v2 = (hsv.v-20>20)?hsv.v-20:hsv.v+60,
					v3 = (hsv.v-50>20)?hsv.v-50:hsv.v+30;

				return new dxc.Palette([
					dxc.fromHsv(hsv.h, s1, v1),
					dxc.fromHsv(hsv.h, s2, v3),
					base,
					dxc.fromHsv(hsv.h, s1, v3),
					dxc.fromHsv(hsv.h, s2, v2)
				]);		//	dojox.color.Palette
			},

			triadic: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the triadic rules as implemented at
				//		http://kuler.adobe.com.
				var base = lang.isString(args.base)?new dxc.Color(args.base):args.base,
					hsv = base.toHsv();

				var h1 = (hsv.h+57+360)%360,
					h2 = (hsv.h-157+360)%360,
					s1 = (hsv.s>20)?hsv.s-10:hsv.s+10,
					s2 = (hsv.s>90)?hsv.s-10:hsv.s+10,
					s3 = (hsv.s>95)?hsv.s-5:hsv.s+5,
					v1 = (hsv.v-20>20)?hsv.v-20:hsv.v+20,
					v2 = (hsv.v-30>20)?hsv.v-30:hsv.v+30,
					v3 = (hsv.v-30>70)?hsv.v-30:hsv.v+30;

				return new dxc.Palette([
					dxc.fromHsv(h1, s1, hsv.v),
					dxc.fromHsv(hsv.h, s2, v2),
					base,
					dxc.fromHsv(h2, s2, v1),
					dxc.fromHsv(h2, s3, v3)
				]);		//	dojox.color.Palette
			},

			complementary: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the complementary rules as implemented at
				//		http://kuler.adobe.com.
				var base = lang.isString(args.base)?new dxc.Color(args.base):args.base,
					hsv = base.toHsv();

				var h1 = ((hsv.h*2)+137<360)?(hsv.h*2)+137:Math.floor(hsv.h/2)-137,
					s1 = Math.max(hsv.s-10, 0),
					s2 = rangeDiff(hsv.s, 10, 100),
					s3 = Math.min(100, hsv.s+20),
					v1 = Math.min(100, hsv.v+30),
					v2 = (hsv.v>20)?hsv.v-30:hsv.v+30;

				return new dxc.Palette([
					dxc.fromHsv(hsv.h, s1, v1),
					dxc.fromHsv(hsv.h, s2, v2),
					base,
					dxc.fromHsv(h1, s3, v2),
					dxc.fromHsv(h1, hsv.s, hsv.v)
				]);		//	dojox.color.Palette
			},

			splitComplementary: function(/* dojox.color.Palette.__splitComplementaryArgs */args){
				//	summary:
				//		Create a 5 color palette based on the split complementary rules as implemented at
				//		http://kuler.adobe.com.
				var base = lang.isString(args.base)?new dxc.Color(args.base):args.base,
					dangle = args.da || 30,
					hsv = base.toHsv();

				var baseh = ((hsv.h*2)+137<360)?(hsv.h*2)+137:Math.floor(hsv.h/2)-137,
					h1 = (baseh-dangle+360)%360,
					h2 = (baseh+dangle)%360,
					s1 = Math.max(hsv.s-10, 0),
					s2 = rangeDiff(hsv.s, 10, 100),
					s3 = Math.min(100, hsv.s+20),
					v1 = Math.min(100, hsv.v+30),
					v2 = (hsv.v>20)?hsv.v-30:hsv.v+30;

				return new dxc.Palette([
					dxc.fromHsv(h1, s1, v1),
					dxc.fromHsv(h1, s2, v2),
					base,
					dxc.fromHsv(h2, s3, v2),
					dxc.fromHsv(h2, hsv.s, hsv.v)
				]);		//	dojox.color.Palette
			},

			compound: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the compound rules as implemented at
				//		http://kuler.adobe.com.
				var base = lang.isString(args.base)?new dxc.Color(args.base):args.base,
					hsv = base.toHsv();

				var h1 = ((hsv.h*2)+18<360)?(hsv.h*2)+18:Math.floor(hsv.h/2)-18,
					h2 = ((hsv.h*2)+120<360)?(hsv.h*2)+120:Math.floor(hsv.h/2)-120,
					h3 = ((hsv.h*2)+99<360)?(hsv.h*2)+99:Math.floor(hsv.h/2)-99,
					s1 = (hsv.s-40>10)?hsv.s-40:hsv.s+40,
					s2 = (hsv.s-10>80)?hsv.s-10:hsv.s+10,
					s3 = (hsv.s-25>10)?hsv.s-25:hsv.s+25,
					v1 = (hsv.v-40>10)?hsv.v-40:hsv.v+40,
					v2 = (hsv.v-20>80)?hsv.v-20:hsv.v+20,
					v3 = Math.max(hsv.v, 20);

				return new dxc.Palette([
					dxc.fromHsv(h1, s1, v1),
					dxc.fromHsv(h1, s2, v2),
					base,
					dxc.fromHsv(h2, s3, v3),
					dxc.fromHsv(h3, s2, v2)
				]);		//	dojox.color.Palette
			},

			shades: function(/* dojox.color.Palette.__generatorArgs */args){
				//	summary:
				//		Create a 5 color palette based on the shades rules as implemented at
				//		http://kuler.adobe.com.
				var base = lang.isString(args.base)?new dxc.Color(args.base):args.base,
					hsv = base.toHsv();

				var s  = (hsv.s==100 && hsv.v==0)?0:hsv.s,
					v1 = (hsv.v-50>20)?hsv.v-50:hsv.v+30,
					v2 = (hsv.v-25>=20)?hsv.v-25:hsv.v+55,
					v3 = (hsv.v-75>=20)?hsv.v-75:hsv.v+5,
					v4 = Math.max(hsv.v-10, 20);

				return new dxc.Palette([
					new dxc.fromHsv(hsv.h, s, v1),
					new dxc.fromHsv(hsv.h, s, v2),
					base,
					new dxc.fromHsv(hsv.h, s, v3),
					new dxc.fromHsv(hsv.h, s, v4)
				]);		//	dojox.color.Palette
			}
		},
		generate: function(/* String|dojox.color.Color */base, /* Function|String */type){
			//	summary:
			//		Generate a new Palette using any of the named functions in
			//		dojox.color.Palette.generators or an optional function definition.  Current
			//		generators include "analogous", "monochromatic", "triadic", "complementary",
			//		"splitComplementary", and "shades".
			if(lang.isFunction(type)){
				return type({ base: base });	//	dojox.color.Palette
			}
			else if(dxc.Palette.generators[type]){
				return dxc.Palette.generators[type]({ base: base });	//	dojox.color.Palette
			}
			throw new Error("dojox.color.Palette.generate: the specified generator ('" + type + "') does not exist.");
		}
	});
	
	return dxc.Palette;
});

},
'dojox/color/_base':function(){
define("dojox/color/_base", ["dojo/_base/kernel", "../main", "dojo/_base/lang", "dojo/_base/Color", "dojo/colors"], 
	function(dojo, dojox, lang, Color, colors){

var cx = lang.getObject("dojox.color", true);
/*===== cx = dojox.color =====*/
		
//	alias all the dojo.Color mechanisms
cx.Color=Color;
cx.blend=Color.blendColors;
cx.fromRgb=Color.fromRgb;
cx.fromHex=Color.fromHex;
cx.fromArray=Color.fromArray;
cx.fromString=Color.fromString;

//	alias the dojo.colors mechanisms
cx.greyscale=colors.makeGrey;

lang.mixin(cx,{
	fromCmy: function(/* Object|Array|int */cyan, /*int*/magenta, /*int*/yellow){
		//	summary
		//	Create a dojox.color.Color from a CMY defined color.
		//	All colors should be expressed as 0-100 (percentage)
	
		if(lang.isArray(cyan)){
			magenta=cyan[1], yellow=cyan[2], cyan=cyan[0];
		} else if(lang.isObject(cyan)){
			magenta=cyan.m, yellow=cyan.y, cyan=cyan.c;
		}
		cyan/=100, magenta/=100, yellow/=100;
	
		var r=1-cyan, g=1-magenta, b=1-yellow;
		return new Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
	},
	
	fromCmyk: function(/* Object|Array|int */cyan, /*int*/magenta, /*int*/yellow, /*int*/black){
		//	summary
		//	Create a dojox.color.Color from a CMYK defined color.
		//	All colors should be expressed as 0-100 (percentage)
	
		if(lang.isArray(cyan)){
			magenta=cyan[1], yellow=cyan[2], black=cyan[3], cyan=cyan[0];
		} else if(lang.isObject(cyan)){
			magenta=cyan.m, yellow=cyan.y, black=cyan.b, cyan=cyan.c;
		}
		cyan/=100, magenta/=100, yellow/=100, black/=100;
		var r,g,b;
		r = 1-Math.min(1, cyan*(1-black)+black);
		g = 1-Math.min(1, magenta*(1-black)+black);
		b = 1-Math.min(1, yellow*(1-black)+black);
		return new Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
	},
		
	fromHsl: function(/* Object|Array|int */hue, /* int */saturation, /* int */luminosity){
		//	summary
		//	Create a dojox.color.Color from an HSL defined color.
		//	hue from 0-359 (degrees), saturation and luminosity 0-100.
	
		if(lang.isArray(hue)){
			saturation=hue[1], luminosity=hue[2], hue=hue[0];
		} else if(lang.isObject(hue)){
			saturation=hue.s, luminosity=hue.l, hue=hue.h;
		}
		saturation/=100;
		luminosity/=100;
	
		while(hue<0){ hue+=360; }
		while(hue>=360){ hue-=360; }
		
		var r, g, b;
		if(hue<120){
			r=(120-hue)/60, g=hue/60, b=0;
		} else if (hue<240){
			r=0, g=(240-hue)/60, b=(hue-120)/60;
		} else {
			r=(hue-240)/60, g=0, b=(360-hue)/60;
		}
		
		r=2*saturation*Math.min(r, 1)+(1-saturation);
		g=2*saturation*Math.min(g, 1)+(1-saturation);
		b=2*saturation*Math.min(b, 1)+(1-saturation);
		if(luminosity<0.5){
			r*=luminosity, g*=luminosity, b*=luminosity;
		}else{
			r=(1-luminosity)*r+2*luminosity-1;
			g=(1-luminosity)*g+2*luminosity-1;
			b=(1-luminosity)*b+2*luminosity-1;
		}
		return new Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
	}
});
	
cx.fromHsv = function(/* Object|Array|int */hue, /* int */saturation, /* int */value){
	//	summary
	//	Create a dojox.color.Color from an HSV defined color.
	//	hue from 0-359 (degrees), saturation and value 0-100.

	if(lang.isArray(hue)){
		saturation=hue[1], value=hue[2], hue=hue[0];
	} else if (lang.isObject(hue)){
		saturation=hue.s, value=hue.v, hue=hue.h;
	}
	
	if(hue==360){ hue=0; }
	saturation/=100;
	value/=100;
	
	var r, g, b;
	if(saturation==0){
		r=value, b=value, g=value;
	}else{
		var hTemp=hue/60, i=Math.floor(hTemp), f=hTemp-i;
		var p=value*(1-saturation);
		var q=value*(1-(saturation*f));
		var t=value*(1-(saturation*(1-f)));
		switch(i){
			case 0:{ r=value, g=t, b=p; break; }
			case 1:{ r=q, g=value, b=p; break; }
			case 2:{ r=p, g=value, b=t; break; }
			case 3:{ r=p, g=q, b=value; break; }
			case 4:{ r=t, g=p, b=value; break; }
			case 5:{ r=value, g=p, b=q; break; }
		}
	}
	return new Color({ r:Math.round(r*255), g:Math.round(g*255), b:Math.round(b*255) });	//	dojox.color.Color
};
lang.extend(Color,{
	toCmy: function(){
		//	summary
		//	Convert this Color to a CMY definition.
		var cyan=1-(this.r/255), magenta=1-(this.g/255), yellow=1-(this.b/255);
		return { c:Math.round(cyan*100), m:Math.round(magenta*100), y:Math.round(yellow*100) };		//	Object
	},
		
	toCmyk: function(){
		//	summary
		//	Convert this Color to a CMYK definition.
		var cyan, magenta, yellow, black;
		var r=this.r/255, g=this.g/255, b=this.b/255;
		black = Math.min(1-r, 1-g, 1-b);
		cyan = (1-r-black)/(1-black);
		magenta = (1-g-black)/(1-black);
		yellow = (1-b-black)/(1-black);
		return { c:Math.round(cyan*100), m:Math.round(magenta*100), y:Math.round(yellow*100), b:Math.round(black*100) };	//	Object
	},
		
	toHsl: function(){
		//	summary
		//	Convert this Color to an HSL definition.
		var r=this.r/255, g=this.g/255, b=this.b/255;
		var min = Math.min(r, b, g), max = Math.max(r, g, b);
		var delta = max-min;
		var h=0, s=0, l=(min+max)/2;
		if(l>0 && l<1){
			s = delta/((l<0.5)?(2*l):(2-2*l));
		}
		if(delta>0){
			if(max==r && max!=g){
				h+=(g-b)/delta;
			}
			if(max==g && max!=b){
				h+=(2+(b-r)/delta);
			}
			if(max==b && max!=r){
				h+=(4+(r-g)/delta);
			}
			h*=60;
		}
		return { h:h, s:Math.round(s*100), l:Math.round(l*100) };	//	Object
	},
	
	toHsv: function(){
		//	summary
		//	Convert this Color to an HSV definition.
		var r=this.r/255, g=this.g/255, b=this.b/255;
		var min = Math.min(r, b, g), max = Math.max(r, g, b);
		var delta = max-min;
		var h = null, s = (max==0)?0:(delta/max);
		if(s==0){
			h = 0;
		}else{
			if(r==max){
				h = 60*(g-b)/delta;
			}else if(g==max){
				h = 120 + 60*(b-r)/delta;
			}else{
				h = 240 + 60*(r-g)/delta;
			}
	
			if(h<0){ h+=360; }
		}
		return { h:h, s:Math.round(s*100), v:Math.round(max*100) };	//	Object
	}
});

return cx;
});

},
'dojo/colors':function(){
define("dojo/colors", ["./_base/kernel", "./_base/lang", "./_base/Color", "./_base/array"], function(dojo, lang, Color, ArrayUtil) {
	// module:
	//		dojo/colors
	// summary:
	//		TODOC

	var ColorExt = lang.getObject("dojo.colors", true);

//TODO: this module appears to break naming conventions

/*=====
	lang.mixin(dojo, {
		colors: {
			// summary: Color utilities, extending Base dojo.Color
		}
	});
=====*/

	// this is a standard conversion prescribed by the CSS3 Color Module
	var hue2rgb = function(m1, m2, h){
		if(h < 0){ ++h; }
		if(h > 1){ --h; }
		var h6 = 6 * h;
		if(h6 < 1){ return m1 + (m2 - m1) * h6; }
		if(2 * h < 1){ return m2; }
		if(3 * h < 2){ return m1 + (m2 - m1) * (2 / 3 - h) * 6; }
		return m1;
	};
	// Override base Color.fromRgb with the impl in this module
	dojo.colorFromRgb = Color.fromRgb = function(/*String*/ color, /*dojo.Color?*/ obj){
		// summary:
		//		get rgb(a) array from css-style color declarations
		// description:
		//		this function can handle all 4 CSS3 Color Module formats: rgb,
		//		rgba, hsl, hsla, including rgb(a) with percentage values.
		var m = color.toLowerCase().match(/^(rgba?|hsla?)\(([\s\.\-,%0-9]+)\)/);
		if(m){
			var c = m[2].split(/\s*,\s*/), l = c.length, t = m[1], a;
			if((t == "rgb" && l == 3) || (t == "rgba" && l == 4)){
				var r = c[0];
				if(r.charAt(r.length - 1) == "%"){
					// 3 rgb percentage values
					a = ArrayUtil.map(c, function(x){
						return parseFloat(x) * 2.56;
					});
					if(l == 4){ a[3] = c[3]; }
					return Color.fromArray(a, obj); // dojo.Color
				}
				return Color.fromArray(c, obj); // dojo.Color
			}
			if((t == "hsl" && l == 3) || (t == "hsla" && l == 4)){
				// normalize hsl values
				var H = ((parseFloat(c[0]) % 360) + 360) % 360 / 360,
					S = parseFloat(c[1]) / 100,
					L = parseFloat(c[2]) / 100,
					// calculate rgb according to the algorithm
					// recommended by the CSS3 Color Module
					m2 = L <= 0.5 ? L * (S + 1) : L + S - L * S,
					m1 = 2 * L - m2;
				a = [
					hue2rgb(m1, m2, H + 1 / 3) * 256,
					hue2rgb(m1, m2, H) * 256,
					hue2rgb(m1, m2, H - 1 / 3) * 256,
					1
				];
				if(l == 4){ a[3] = c[3]; }
				return Color.fromArray(a, obj); // dojo.Color
			}
		}
		return null;	// dojo.Color
	};

	var confine = function(c, low, high){
		// summary:
		//		sanitize a color component by making sure it is a number,
		//		and clamping it to valid values
		c = Number(c);
		return isNaN(c) ? high : c < low ? low : c > high ? high : c;	// Number
	};

	Color.prototype.sanitize = function(){
		// summary: makes sure that the object has correct attributes
		var t = this;
		t.r = Math.round(confine(t.r, 0, 255));
		t.g = Math.round(confine(t.g, 0, 255));
		t.b = Math.round(confine(t.b, 0, 255));
		t.a = confine(t.a, 0, 1);
		return this;	// dojo.Color
	};

	ColorExt.makeGrey = Color.makeGrey = function(/*Number*/ g, /*Number?*/ a){
		// summary: creates a greyscale color with an optional alpha
		return Color.fromArray([g, g, g, a]);	// dojo.Color
	};

	// mixin all CSS3 named colors not already in _base, along with SVG 1.0 variant spellings
	lang.mixin(Color.named, {
		"aliceblue":	[240,248,255],
		"antiquewhite": [250,235,215],
		"aquamarine":	[127,255,212],
		"azure":	[240,255,255],
		"beige":	[245,245,220],
		"bisque":	[255,228,196],
		"blanchedalmond":	[255,235,205],
		"blueviolet":	[138,43,226],
		"brown":	[165,42,42],
		"burlywood":	[222,184,135],
		"cadetblue":	[95,158,160],
		"chartreuse":	[127,255,0],
		"chocolate":	[210,105,30],
		"coral":	[255,127,80],
		"cornflowerblue":	[100,149,237],
		"cornsilk": [255,248,220],
		"crimson":	[220,20,60],
		"cyan": [0,255,255],
		"darkblue": [0,0,139],
		"darkcyan": [0,139,139],
		"darkgoldenrod":	[184,134,11],
		"darkgray": [169,169,169],
		"darkgreen":	[0,100,0],
		"darkgrey": [169,169,169],
		"darkkhaki":	[189,183,107],
		"darkmagenta":	[139,0,139],
		"darkolivegreen":	[85,107,47],
		"darkorange":	[255,140,0],
		"darkorchid":	[153,50,204],
		"darkred":	[139,0,0],
		"darksalmon":	[233,150,122],
		"darkseagreen": [143,188,143],
		"darkslateblue":	[72,61,139],
		"darkslategray":	[47,79,79],
		"darkslategrey":	[47,79,79],
		"darkturquoise":	[0,206,209],
		"darkviolet":	[148,0,211],
		"deeppink": [255,20,147],
		"deepskyblue":	[0,191,255],
		"dimgray":	[105,105,105],
		"dimgrey":	[105,105,105],
		"dodgerblue":	[30,144,255],
		"firebrick":	[178,34,34],
		"floralwhite":	[255,250,240],
		"forestgreen":	[34,139,34],
		"gainsboro":	[220,220,220],
		"ghostwhite":	[248,248,255],
		"gold": [255,215,0],
		"goldenrod":	[218,165,32],
		"greenyellow":	[173,255,47],
		"grey": [128,128,128],
		"honeydew": [240,255,240],
		"hotpink":	[255,105,180],
		"indianred":	[205,92,92],
		"indigo":	[75,0,130],
		"ivory":	[255,255,240],
		"khaki":	[240,230,140],
		"lavender": [230,230,250],
		"lavenderblush":	[255,240,245],
		"lawngreen":	[124,252,0],
		"lemonchiffon": [255,250,205],
		"lightblue":	[173,216,230],
		"lightcoral":	[240,128,128],
		"lightcyan":	[224,255,255],
		"lightgoldenrodyellow": [250,250,210],
		"lightgray":	[211,211,211],
		"lightgreen":	[144,238,144],
		"lightgrey":	[211,211,211],
		"lightpink":	[255,182,193],
		"lightsalmon":	[255,160,122],
		"lightseagreen":	[32,178,170],
		"lightskyblue": [135,206,250],
		"lightslategray":	[119,136,153],
		"lightslategrey":	[119,136,153],
		"lightsteelblue":	[176,196,222],
		"lightyellow":	[255,255,224],
		"limegreen":	[50,205,50],
		"linen":	[250,240,230],
		"magenta":	[255,0,255],
		"mediumaquamarine": [102,205,170],
		"mediumblue":	[0,0,205],
		"mediumorchid": [186,85,211],
		"mediumpurple": [147,112,219],
		"mediumseagreen":	[60,179,113],
		"mediumslateblue":	[123,104,238],
		"mediumspringgreen":	[0,250,154],
		"mediumturquoise":	[72,209,204],
		"mediumvioletred":	[199,21,133],
		"midnightblue": [25,25,112],
		"mintcream":	[245,255,250],
		"mistyrose":	[255,228,225],
		"moccasin": [255,228,181],
		"navajowhite":	[255,222,173],
		"oldlace":	[253,245,230],
		"olivedrab":	[107,142,35],
		"orange":	[255,165,0],
		"orangered":	[255,69,0],
		"orchid":	[218,112,214],
		"palegoldenrod":	[238,232,170],
		"palegreen":	[152,251,152],
		"paleturquoise":	[175,238,238],
		"palevioletred":	[219,112,147],
		"papayawhip":	[255,239,213],
		"peachpuff":	[255,218,185],
		"peru": [205,133,63],
		"pink": [255,192,203],
		"plum": [221,160,221],
		"powderblue":	[176,224,230],
		"rosybrown":	[188,143,143],
		"royalblue":	[65,105,225],
		"saddlebrown":	[139,69,19],
		"salmon":	[250,128,114],
		"sandybrown":	[244,164,96],
		"seagreen": [46,139,87],
		"seashell": [255,245,238],
		"sienna":	[160,82,45],
		"skyblue":	[135,206,235],
		"slateblue":	[106,90,205],
		"slategray":	[112,128,144],
		"slategrey":	[112,128,144],
		"snow": [255,250,250],
		"springgreen":	[0,255,127],
		"steelblue":	[70,130,180],
		"tan":	[210,180,140],
		"thistle":	[216,191,216],
		"tomato":	[255,99,71],
		"turquoise":	[64,224,208],
		"violet":	[238,130,238],
		"wheat":	[245,222,179],
		"whitesmoke":	[245,245,245],
		"yellowgreen":	[154,205,50]
	});

	return Color;
});

},
'dojox/charting/Theme':function(){
define("dojox/charting/Theme", ["dojo/_base/lang", "dojo/_base/array","dojo/_base/declare","dojo/_base/Color",
	    "dojox/color/_base", "dojox/color/Palette", "dojox/lang/utils", "dojox/gfx/gradutils"], 
	function(lang, arr, declare, Color, colorX, Palette, dlu, dgg){ 
	
	var Theme = declare("dojox.charting.Theme", null, {
	//	summary:
	//		A Theme is a pre-defined object, primarily JSON-based, that makes up the definitions to
	//		style a chart.
	//
	//	description:
	//		While you can set up style definitions on a chart directly (usually through the various add methods
	//		on a dojox.charting.Chart object), a Theme simplifies this manual setup by allowing you to
	//		pre-define all of the various visual parameters of each element in a chart.
	//
	//		Most of the properties of a Theme are straight-forward; if something is line-based (such as
	//		an axis or the ticks on an axis), they will be defined using basic stroke parameters.  Likewise,
	//		if an element is primarily block-based (such as the background of a chart), it will be primarily
	//		fill-based.
	//
	//		In addition (for convenience), a Theme definition does not have to contain the entire JSON-based
	//		structure.  Each theme is built on top of a default theme (which serves as the basis for the theme
	//		"GreySkies"), and is mixed into the default theme object.  This allows you to create a theme based,
	//		say, solely on colors for data series.
	//
	//		Defining a new theme is relatively easy; see any of the themes in dojox.charting.themes for examples
	//		on how to define your own.
	//
	//		When you set a theme on a chart, the theme itself is deep-cloned.  This means that you cannot alter
	//		the theme itself after setting the theme value on a chart, and expect it to change your chart.  If you
	//		are looking to make alterations to a theme for a chart, the suggestion would be to create your own
	//		theme, based on the one you want to use, that makes those alterations before it is applied to a chart.
	//
	//		Finally, a Theme contains a number of functions to facilitate rendering operations on a chart--the main
	//		helper of which is the ~next~ method, in which a chart asks for the information for the next data series
	//		to be rendered.
	//
	//		A note on colors:
	//		The Theme constructor was on the use of dojox.color.Palette (in general) for creating a visually distinct
	//		set of colors for usage in a chart.  A palette is usually comprised of 5 different color definitions, and
	//		no more.  If you have a need to render a chart with more than 5 data elements, you can simply "push"
	//		new color definitions into the theme's .color array.  Make sure that you do that with the actual
	//		theme object from a Chart, and not in the theme itself (i.e. either do that before using .setTheme
	//		on a chart).
	//
	//		example:
	//			The default theme (and structure) looks like so:
	//	|	// all objects are structs used directly in dojox.gfx
	//	|	chart:{
	//	|		stroke: null,
	//	|		fill: "white",
	//	|		pageStyle: null // suggested page style as an object suitable for dojo.style()
	//	|	},
	//	|	plotarea:{
	//	|		stroke: null,
	//	|		fill: "white"
	//	|	},
	//	|	axis:{
	//	|		stroke:	{ // the axis itself
	//	|			color: "#333",
	//	|			width: 1
	//	|		},
	//	|		tick: {	// used as a foundation for all ticks
	//	|			color:     "#666",
	//	|			position:  "center",
	//	|			font:      "normal normal normal 7pt Tahoma",	// labels on axis
	//	|			fontColor: "#333"								// color of labels
	//	|		},
	//	|		majorTick:	{ // major ticks on axis, and used for major gridlines
	//	|			width:  1,
	//	|			length: 6
	//	|		},
	//	|		minorTick:	{ // minor ticks on axis, and used for minor gridlines
	//	|			width:  0.8,
	//	|			length: 3
	//	|		},
	//	|		microTick:	{ // minor ticks on axis, and used for minor gridlines
	//	|			width:  0.5,
	//	|			length: 1
	//	|		}
	//	|	},
	//	|	series: {
	//	|		stroke:  {width: 1.5, color: "#333"},		// line
	//	|		outline: {width: 0.1, color: "#ccc"},		// outline
	//	|		//shadow:  {dx: 1, dy: 1, width: 2, color: [0, 0, 0, 0.3]},
	//	|		shadow: null,								// no shadow
	//	|		fill:    "#ccc",							// fill, if appropriate
	//	|		font:    "normal normal normal 8pt Tahoma",	// if there's a label
	//	|		fontColor: "#000"							// color of labels
	//	|		labelWiring: {width: 1, color: "#ccc"},		// connect marker and target data item(slice, column, bar...)
	//	|	},
	//	|	marker: {	// any markers on a series
	//	|		symbol:  "m-3,3 l3,-6 3,6 z",				// symbol
	//	|		stroke:  {width: 1.5, color: "#333"},		// stroke
	//	|		outline: {width: 0.1, color: "#ccc"},		// outline
	//	|		shadow: null,								// no shadow
	//	|		fill:    "#ccc",							// fill if needed
	//	|		font:    "normal normal normal 8pt Tahoma",	// label
	//	|		fontColor: "#000"
	//	|	},
	//	|	indicator: {
	//	|		lineStroke:  {width: 1.5, color: "#333"},		// line
	//	|		lineOutline: {width: 0.1, color: "#ccc"},		// line outline
	//	|		lineShadow: null,								// no line shadow
	//	|		stroke:  {width: 1.5, color: "#333"},			// label background stroke
	//	|		outline: {width: 0.1, color: "#ccc"},			// label background outline
	//	|		shadow: null,									// no label background shadow
	//	|		fill:  "#ccc",									// label background fill
	//	|		radius: 3,										// radius of the label background
	//	|		font:    "normal normal normal 10pt Tahoma",	// label font
	//	|		fontColor: "#000"								// label color
	//	|		markerFill:    "#ccc",							// marker fill
	//	|		markerSymbol:  "m-3,0 c0,-4 6,-4 6,0 m-6,0 c0,4 6,4 6,0",	// marker symbol
	//	|		markerStroke:  {width: 1.5, color: "#333"},		// marker stroke
	//	|		markerOutline: {width: 0.1, color: "#ccc"},		// marker outline
	//	|		markerShadow: null,								// no marker shadow
	//	|	}
	//
	//	example:
	//		Defining a new theme is pretty simple:
	//	|	dojox.charting.themes.Grasslands = new dojox.charting.Theme({
	//	|		colors: [ "#70803a", "#dde574", "#788062", "#b1cc5d", "#eff2c2" ]
	//	|	});
	//	|
	//	|	myChart.setTheme(dojox.charting.themes.Grasslands);

	shapeSpaces: {shape: 1, shapeX: 1, shapeY: 1},

	constructor: function(kwArgs){
		//	summary:
		//		Initialize a theme using the keyword arguments.  Note that the arguments
		//		look like the example (above), and may include a few more parameters.
		kwArgs = kwArgs || {};

		// populate theme with defaults updating them if needed
		var def = Theme.defaultTheme;
		arr.forEach(["chart", "plotarea", "axis", "series", "marker", "indicator"], function(name){
			this[name] = lang.delegate(def[name], kwArgs[name]);
		}, this);

		// personalize theme
		if(kwArgs.seriesThemes && kwArgs.seriesThemes.length){
			this.colors  = null;
			this.seriesThemes = kwArgs.seriesThemes.slice(0);
		}else{
			this.seriesThemes = null;
			this.colors = (kwArgs.colors || Theme.defaultColors).slice(0);
		}
		this.markerThemes = null;
		if(kwArgs.markerThemes && kwArgs.markerThemes.length){
			this.markerThemes = kwArgs.markerThemes.slice(0);
		}
		this.markers = kwArgs.markers ? lang.clone(kwArgs.markers) : lang.delegate(Theme.defaultMarkers);

		// set flags
		this.noGradConv = kwArgs.noGradConv;
		this.noRadialConv = kwArgs.noRadialConv;
		if(kwArgs.reverseFills){
			this.reverseFills();
		}

		//	private housekeeping
		this._current = 0;
		this._buildMarkerArray();
	},

	clone: function(){
		//	summary:
		//		Clone the current theme.
		//	returns: dojox.charting.Theme
		//		The cloned theme; any alterations made will not affect the original.
		var theme = new Theme({
			// theme components
			chart: this.chart,
			plotarea: this.plotarea,
			axis: this.axis,
			series: this.series,
			marker: this.marker,
			// individual arrays
			colors: this.colors,
			markers: this.markers,
			indicator: this.indicator,
			seriesThemes: this.seriesThemes,
			markerThemes: this.markerThemes,
			// flags
			noGradConv: this.noGradConv,
			noRadialConv: this.noRadialConv
		});
		// copy custom methods
		arr.forEach(
			["clone", "clear", "next", "skip", "addMixin", "post", "getTick"],
			function(name){
				if(this.hasOwnProperty(name)){
					theme[name] = this[name];
				}
			},
			this
		);
		return theme;	//	dojox.charting.Theme
	},

	clear: function(){
		//	summary:
		//		Clear and reset the internal pointer to start fresh.
		this._current = 0;
	},

	next: function(elementType, mixin, doPost){
		//	summary:
		//		Get the next color or series theme.
		//	elementType: String?
		//		An optional element type (for use with series themes)
		//	mixin: Object?
		//		An optional object to mix into the theme.
		//	doPost: Boolean?
		//		A flag to post-process the results.
		//	returns: Object
		//		An object of the structure { series, marker, symbol }
		var merge = dlu.merge, series, marker;
		if(this.colors){
			series = lang.delegate(this.series);
			marker = lang.delegate(this.marker);
			var color = new Color(this.colors[this._current % this.colors.length]), old;
			// modify the stroke
			if(series.stroke && series.stroke.color){
				series.stroke = lang.delegate(series.stroke);
				old = new Color(series.stroke.color);
				series.stroke.color = new Color(color);
				series.stroke.color.a = old.a;
			}else{
				series.stroke = {color: color};
			}
			if(marker.stroke && marker.stroke.color){
				marker.stroke = lang.delegate(marker.stroke);
				old = new Color(marker.stroke.color);
				marker.stroke.color = new Color(color);
				marker.stroke.color.a = old.a;
			}else{
				marker.stroke = {color: color};
			}
			// modify the fill
			if(!series.fill || series.fill.type){
				series.fill = color;
			}else{
				old = new Color(series.fill);
				series.fill = new Color(color);
				series.fill.a = old.a;
			}
			if(!marker.fill || marker.fill.type){
				marker.fill = color;
			}else{
				old = new Color(marker.fill);
				marker.fill = new Color(color);
				marker.fill.a = old.a;
			}
		}else{
			series = this.seriesThemes ?
				merge(this.series, this.seriesThemes[this._current % this.seriesThemes.length]) :
				this.series;
			marker = this.markerThemes ?
				merge(this.marker, this.markerThemes[this._current % this.markerThemes.length]) :
				series;
		}

		var symbol = marker && marker.symbol || this._markers[this._current % this._markers.length];

		var theme = {series: series, marker: marker, symbol: symbol};
		
		// advance the counter
		++this._current;

		if(mixin){
			theme = this.addMixin(theme, elementType, mixin);
		}
		if(doPost){
			theme = this.post(theme, elementType);
		}

		return theme;	//	Object
	},

	skip: function(){
		//	summary:
		//		Skip the next internal color.
		++this._current;
	},

	addMixin: function(theme, elementType, mixin, doPost){
		//	summary:
		//		Add a mixin object to the passed theme and process.
		//	theme: dojox.charting.Theme
		//		The theme to mixin to.
		//	elementType: String
		//		The type of element in question. Can be "line", "bar" or "circle"
		//	mixin: Object|Array
		//		The object or objects to mix into the theme.
		//	doPost: Boolean
		//		If true, run the new theme through the post-processor.
		//	returns: dojox.charting.Theme
		//		The new theme.
		if(lang.isArray(mixin)){
			arr.forEach(mixin, function(m){
				theme = this.addMixin(theme, elementType, m);
			}, this);
		}else{
			var t = {};
			if("color" in mixin){
				if(elementType == "line" || elementType == "area"){
					lang.setObject("series.stroke.color", mixin.color, t);
					lang.setObject("marker.stroke.color", mixin.color, t);
				}else{
					lang.setObject("series.fill", mixin.color, t);
				}
			}
			arr.forEach(["stroke", "outline", "shadow", "fill", "font", "fontColor", "labelWiring"], function(name){
				var markerName = "marker" + name.charAt(0).toUpperCase() + name.substr(1),
					b = markerName in mixin;
				if(name in mixin){
					lang.setObject("series." + name, mixin[name], t);
					if(!b){
						lang.setObject("marker." + name, mixin[name], t);
					}
				}
				if(b){
					lang.setObject("marker." + name, mixin[markerName], t);
				}
			});
			if("marker" in mixin){
				t.symbol = mixin.marker;
			}
			theme = dlu.merge(theme, t);
		}
		if(doPost){
			theme = this.post(theme, elementType);
		}
		return theme;	//	dojox.charting.Theme
	},

	post: function(theme, elementType){
		//	summary:
		//		Process any post-shape fills.
		//	theme: dojox.charting.Theme
		//		The theme to post process with.
		//	elementType: String
		//		The type of element being filled.  Can be "bar" or "circle".
		//	returns: dojox.charting.Theme
		//		The post-processed theme.
		var fill = theme.series.fill, t;
		if(!this.noGradConv && this.shapeSpaces[fill.space] && fill.type == "linear"){
			if(elementType == "bar"){
				// transpose start and end points
				t = {
					x1: fill.y1,
					y1: fill.x1,
					x2: fill.y2,
					y2: fill.x2
				};
			}else if(!this.noRadialConv && fill.space == "shape" && (elementType == "slice" || elementType == "circle")){
				// switch to radial
				t = {
					type: "radial",
					cx: 0,
					cy: 0,
					r:  100
				};
			}
			if(t){
				return dlu.merge(theme, {series: {fill: t}});
			}
		}
		return theme;	//	dojox.charting.Theme
	},

	getTick: function(name, mixin){
		//	summary:
		//		Calculates and merges tick parameters.
		//	name: String
		//		Tick name, can be "major", "minor", or "micro".
		//	mixin: Object?
		//		Optional object to mix in to the tick.
		var tick = this.axis.tick, tickName = name + "Tick",
			merge = dlu.merge;
		if(tick){
			if(this.axis[tickName]){
				tick = merge(tick, this.axis[tickName]);
			}
		}else{
			tick = this.axis[tickName];
		}
		if(mixin){
			if(tick){
				if(mixin[tickName]){
					tick = merge(tick, mixin[tickName]);
				}
			}else{
				tick = mixin[tickName];
			}
		}
		return tick;	//	Object
	},

	inspectObjects: function(f){
		arr.forEach(["chart", "plotarea", "axis", "series", "marker", "indicator"], function(name){
			f(this[name]);
		}, this);
		if(this.seriesThemes){
			arr.forEach(this.seriesThemes, f);
		}
		if(this.markerThemes){
			arr.forEach(this.markerThemes, f);
		}
	},

	reverseFills: function(){
		this.inspectObjects(function(o){
			if(o && o.fill){
				o.fill = dgg.reverse(o.fill);
			}
		});
	},

	addMarker:function(/*String*/ name, /*String*/ segment){
		//	summary:
		//		Add a custom marker to this theme.
		//	example:
		//	|	myTheme.addMarker("Ellipse", foo);
		this.markers[name] = segment;
		this._buildMarkerArray();
	},

	setMarkers:function(/*Object*/ obj){
		//	summary:
		//		Set all the markers of this theme at once.  obj should be a
		//		dictionary of keys and path segments.
		//
		//	example:
		//	|	myTheme.setMarkers({ "CIRCLE": foo });
		this.markers = obj;
		this._buildMarkerArray();
	},

	_buildMarkerArray: function(){
		this._markers = [];
		for(var p in this.markers){
			this._markers.push(this.markers[p]);
		}
	}
});

/*=====
dojox.charting.Theme.__DefineColorArgs = function(num, colors, hue, saturation, low, high, base, generator){
	//	summary:
	//		The arguments object that can be passed to define colors for a theme.
	//	num: Number?
	//		The number of colors to generate.  Defaults to 5.
	//	colors: String[]|dojo.Color[]?
	//		A pre-defined set of colors; this is passed through to the Theme directly.
	//	hue: Number?
	//		A hue to base the generated colors from (a number from 0 - 359).
	//	saturation: Number?
	//		If a hue is passed, this is used for the saturation value (0 - 100).
	//	low: Number?
	//		An optional value to determine the lowest value used to generate a color (HSV model)
	//	high: Number?
	//		An optional value to determine the highest value used to generate a color (HSV model)
	//	base: String|dojo.Color?
	//		A base color to use if we are defining colors using dojox.color.Palette
	//	generator: String?
	//		The generator function name from dojox.color.Palette.
	this.num = num;
	this.colors = colors;
	this.hue = hue;
	this.saturation = saturation;
	this.low = low;
	this.high = high;
	this.base = base;
	this.generator = generator;
}
=====*/
lang.mixin(Theme, {
	defaultMarkers: {
		CIRCLE:   "m-3,0 c0,-4 6,-4 6,0 m-6,0 c0,4 6,4 6,0",
		SQUARE:   "m-3,-3 l0,6 6,0 0,-6 z",
		DIAMOND:  "m0,-3 l3,3 -3,3 -3,-3 z",
		CROSS:    "m0,-3 l0,6 m-3,-3 l6,0",
		X:        "m-3,-3 l6,6 m0,-6 l-6,6",
		TRIANGLE: "m-3,3 l3,-6 3,6 z",
		TRIANGLE_INVERTED: "m-3,-3 l3,6 3,-6 z"
	},

	defaultColors:[
		// gray skies
		"#54544c", "#858e94", "#6e767a", "#948585", "#474747"
	],

	defaultTheme: {
		// all objects are structs used directly in dojox.gfx
		chart:{
			stroke: null,
			fill: "white",
			pageStyle: null,
			titleGap:		20,
			titlePos:		"top",
			titleFont:      "normal normal bold 14pt Tahoma",	// labels on axis
			titleFontColor: "#333"
		},
		plotarea:{
			stroke: null,
			fill: "white"
		},
		// TODO: label rotation on axis
		axis:{
			stroke:	{ // the axis itself
				color: "#333",
				width: 1
			},
			tick: {	// used as a foundation for all ticks
				color:     "#666",
				position:  "center",
				font:      "normal normal normal 7pt Tahoma",	// labels on axis
				fontColor: "#333",								// color of labels
				titleGap:  15,
				titleFont: "normal normal normal 11pt Tahoma",	// labels on axis
				titleFontColor: "#333",							// color of labels
				titleOrientation: "axis"						// "axis": facing the axis, "away": facing away
			},
			majorTick:	{ // major ticks on axis, and used for major gridlines
				width:  1,
				length: 6
			},
			minorTick:	{ // minor ticks on axis, and used for minor gridlines
				width:  0.8,
				length: 3
			},
			microTick:	{ // minor ticks on axis, and used for minor gridlines
				width:  0.5,
				length: 1
			}
		},
		series: {
			// used as a "main" theme for series, sThemes augment it
			stroke:  {width: 1.5, color: "#333"},		// line
			outline: {width: 0.1, color: "#ccc"},		// outline
			//shadow:  {dx: 1, dy: 1, width: 2, color: [0, 0, 0, 0.3]},
			shadow: null,								// no shadow
			fill:    "#ccc",							// fill, if appropriate
			font:    "normal normal normal 8pt Tahoma",	// if there's a label
			fontColor: "#000",							// color of labels
			labelWiring: {width: 1, color: "#ccc"}		// connect marker and target data item(slice, column, bar...)
		},
		marker: {	// any markers on a series
			stroke:  {width: 1.5, color: "#333"},		// stroke
			outline: {width: 0.1, color: "#ccc"},		// outline
			//shadow:  {dx: 1, dy: 1, width: 2, color: [0, 0, 0, 0.3]},
			shadow: null,								// no shadow
			fill:    "#ccc",							// fill if needed
			font:    "normal normal normal 8pt Tahoma",	// label
			fontColor: "#000"
		},
		indicator: {
			lineStroke:  {width: 1.5, color: "#333"},		
			lineOutline: {width: 0.1, color: "#ccc"},		
			lineShadow: null,
			stroke:  {width: 1.5, color: "#333"},		
			outline: {width: 0.1, color: "#ccc"},		
			shadow: null,								
			fill : "#ccc",
			radius: 3,
			font:    "normal normal normal 10pt Tahoma",	
			fontColor: "#000",							
			markerFill:    "#ccc",							
			markerSymbol:  "m-3,0 c0,-4 6,-4 6,0 m-6,0 c0,4 6,4 6,0",			
			markerStroke:  {width: 1.5, color: "#333"},		
			markerOutline: {width: 0.1, color: "#ccc"},		
			markerShadow: null								
		}
	},

	defineColors: function(kwArgs){
		//	summary:
		//		Generate a set of colors for the theme based on keyword
		//		arguments.
		//	kwArgs: dojox.charting.Theme.__DefineColorArgs
		//		The arguments object used to define colors.
		//	returns: dojo.Color[]
		//		An array of colors for use in a theme.
		//
		//	example:
		//	|	var colors = dojox.charting.Theme.defineColors({
		//	|		base: "#369",
		//	|		generator: "compound"
		//	|	});
		//
		//	example:
		//	|	var colors = dojox.charting.Theme.defineColors({
		//	|		hue: 60,
		//	|		saturation: 90,
		//	|		low: 30,
		//	|		high: 80
		//	|	});
		kwArgs = kwArgs || {};
		var l, c = [], n = kwArgs.num || 5;	// the number of colors to generate
		if(kwArgs.colors){
			// we have an array of colors predefined, so fix for the number of series.
			l = kwArgs.colors.length;
			for(var i = 0; i < n; i++){
				c.push(kwArgs.colors[i % l]);
			}
			return c;	//	dojo.Color[]
		}
		if(kwArgs.hue){
			// single hue, generate a set based on brightness
			var s = kwArgs.saturation || 100,	// saturation
				st = kwArgs.low || 30,
				end = kwArgs.high || 90;
			// we'd like it to be a little on the darker side.
			l = (end + st) / 2;
			// alternately, use "shades"
			return colorX.Palette.generate(
				colorX.fromHsv(kwArgs.hue, s, l), "monochromatic"
			).colors;
		}
		if(kwArgs.generator){
			//	pass a base color and the name of a generator
			return colorX.Palette.generate(kwArgs.base, kwArgs.generator).colors;
		}
		return c;	//	dojo.Color[]
	},
	
	generateGradient: function(fillPattern, colorFrom, colorTo){
		var fill = lang.delegate(fillPattern);
		fill.colors = [
			{offset: 0, color: colorFrom},
			{offset: 1, color: colorTo}
		];
		return fill;
	},
	
	generateHslColor: function(color, luminance){
		color = new Color(color);
		var hsl    = color.toHsl(),
			result = colorX.fromHsl(hsl.h, hsl.s, luminance);
		result.a = color.a;	// add missing opacity
		return result;
	},

	generateHslGradient: function(color, fillPattern, lumFrom, lumTo){
		color = new Color(color);
		var hsl       = color.toHsl(),
			colorFrom = colorX.fromHsl(hsl.h, hsl.s, lumFrom),
			colorTo   = colorX.fromHsl(hsl.h, hsl.s, lumTo);
		colorFrom.a = colorTo.a = color.a;	// add missing opacity
		return Theme.generateGradient(fillPattern, colorFrom, colorTo);	// Object
	}
});

return Theme;
});

},
'dojox/lang/functional/lambda':function(){
define("dojox/lang/functional/lambda", ["../..", "dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array"], function(dojox, dojo, lang, arr){
	var df = lang.getObject("lang.functional", true, dojox);

// This module adds high-level functions and related constructs:
//	- anonymous functions built from the string

// Acknoledgements:
//	- lambda() is based on work by Oliver Steele
//		(http://osteele.com/sources/javascript/functional/functional.js)
//		which was published under MIT License

// Notes:
//	- lambda() produces functions, which after the compilation step are
//		as fast as regular JS functions (at least theoretically).

// Lambda input values:
//	- returns functions unchanged
//	- converts strings to functions
//	- converts arrays to a functional composition

	var lcache = {};

	// split() is augmented on IE6 to ensure the uniform behavior
	var split = "ab".split(/a*/).length > 1 ? String.prototype.split :
			function(sep){
				 var r = this.split.call(this, sep),
					 m = sep.exec(this);
				 if(m && m.index == 0){ r.unshift(""); }
				 return r;
			};
			
	var lambda = function(/*String*/ s){
		var args = [], sects = split.call(s, /\s*->\s*/m);
		if(sects.length > 1){
			while(sects.length){
				s = sects.pop();
				args = sects.pop().split(/\s*,\s*|\s+/m);
				if(sects.length){ sects.push("(function(" + args + "){return (" + s + ")})"); }
			}
		}else if(s.match(/\b_\b/)){
			args = ["_"];
		}else{
			var l = s.match(/^\s*(?:[+*\/%&|\^\.=<>]|!=)/m),
				r = s.match(/[+\-*\/%&|\^\.=<>!]\s*$/m);
			if(l || r){
				if(l){
					args.push("$1");
					s = "$1" + s;
				}
				if(r){
					args.push("$2");
					s = s + "$2";
				}
			}else{
				// the point of the long regex below is to exclude all well-known
				// lower-case words from the list of potential arguments
				var vars = s.
					replace(/(?:\b[A-Z]|\.[a-zA-Z_$])[a-zA-Z_$\d]*|[a-zA-Z_$][a-zA-Z_$\d]*:|this|true|false|null|undefined|typeof|instanceof|in|delete|new|void|arguments|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|escape|eval|isFinite|isNaN|parseFloat|parseInt|unescape|dojo|dijit|dojox|window|document|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "").
					match(/([a-z_$][a-z_$\d]*)/gi) || [], t = {};
				arr.forEach(vars, function(v){
					if(!(v in t)){
						args.push(v);
						t[v] = 1;
					}
				});
			}
		}
		return {args: args, body: s};	// Object
	};

	var compose = function(/*Array*/ a){
		return a.length ?
					function(){
						var i = a.length - 1, x = df.lambda(a[i]).apply(this, arguments);
						for(--i; i >= 0; --i){ x = df.lambda(a[i]).call(this, x); }
						return x;
					}
				:
					// identity
					function(x){ return x; };
	};

	lang.mixin(df, {
		// lambda
		rawLambda: function(/*String*/ s){
			// summary:
			//		builds a function from a snippet, or array (composing),
			//		returns an object describing the function; functions are
			//		passed through unmodified.
			// description:
			//		This method is to normalize a functional representation (a
			//		text snippet) to an object that contains an array of
			//		arguments, and a body , which is used to calculate the
			//		returning value.
			return lambda(s);	// Object
		},
		buildLambda: function(/*String*/ s){
			// summary:
			//		builds a function from a snippet, returns a string, which
			//		represents the function.
			// description:
			//		This method returns a textual representation of a function
			//		built from the snippet. It is meant to be evaled in the
			//		proper context, so local variables can be pulled from the
			//		environment.
			s = lambda(s);
			return "function(" + s.args.join(",") + "){return (" + s.body + ");}";	// String
		},
		lambda: function(/*Function|String|Array*/ s){
			// summary:
			//		builds a function from a snippet, or array (composing),
			//		returns a function object; functions are passed through
			//		unmodified.
			// description:
			//		This method is used to normalize a functional
			//		representation (a text snippet, an array, or a function) to
			//		a function object.
			if(typeof s == "function"){ return s; }
			if(s instanceof Array){ return compose(s); }
			if(s in lcache){ return lcache[s]; }
			s = lambda(s);
			return lcache[s] = new Function(s.args, "return (" + s.body + ");");	// Function
		},
		clearLambdaCache: function(){
			// summary:
			//		clears internal cache of lambdas
			lcache = {};
		}
	});
	
	return df;
});

},
'dojox/lang/functional/fold':function(){
define("dojox/lang/functional/fold", ["dojo/_base/lang", "dojo/_base/array", "dojo/_base/window", "./lambda"],
	function(lang, arr, win, df){

// This module adds high-level functions and related constructs:
//	- "fold" family of functions

// Notes:
//	- missing high-level functions are provided with the compatible API:
//		foldl, foldl1, foldr, foldr1
//	- missing JS standard functions are provided with the compatible API:
//		reduce, reduceRight
//	- the fold's counterpart: unfold

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- operate on dense arrays
//	- take a string as the array argument
//	- take an iterator objects as the array argument (only foldl, foldl1, and reduce)

	var empty = {};

/*=====
	var df = dojox.lang.functional;
 =====*/
	lang.mixin(df, {
		// classic reduce-class functions
		foldl: function(/*Array|String|Object*/ a, /*Function*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left
			//	to right using a seed value as a starting point; returns the final
			//	value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var i, n;
			if(lang.isArray(a)){
				// array
				for(i = 0, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				for(i = 0; a.hasNext(); z = f.call(o, z, a.next(), i++, a));
			}else{
				// object/dictionary
				for(i in a){
					if(!(i in empty)){
						z = f.call(o, z, a[i], i, a);
					}
				}
			}
			return z;	// Object
		},
		foldl1: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from left
			//	to right; returns the final value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var z, i, n;
			if(lang.isArray(a)){
				// array
				z = a[0];
				for(i = 1, n = a.length; i < n; z = f.call(o, z, a[i], i, a), ++i);
			}else if(typeof a.hasNext == "function" && typeof a.next == "function"){
				// iterator
				if(a.hasNext()){
					z = a.next();
					for(i = 1; a.hasNext(); z = f.call(o, z, a.next(), i++, a));
				}
			}else{
				// object/dictionary
				var first = true;
				for(i in a){
					if(!(i in empty)){
						if(first){
							z = a[i];
							first = false;
						}else{
							z = f.call(o, z, a[i], i, a);
						}
					}
				}
			}
			return z;	// Object
		},
		foldr: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left using a seed value as a starting point; returns the final
			//	value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			for(var i = a.length; i > 0; --i, z = f.call(o, z, a[i], i, a));
			return z;	// Object
		},
		foldr1: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: repeatedly applies a binary function to an array from right
			//	to left; returns the final value.
			if(typeof a == "string"){ a = a.split(""); }
			o = o || win.global; f = df.lambda(f);
			var n = a.length, z = a[n - 1], i = n - 1;
			for(; i > 0; --i, z = f.call(o, z, a[i], i, a));
			return z;	// Object
		},
		// JS 1.8 standard array functions, which can take a lambda as a parameter.
		reduce: function(/*Array|String|Object*/ a, /*Function|String|Array*/ f, /*Object?*/ z){
			// summary: apply a function simultaneously against two values of the array
			//	(from left-to-right) as to reduce it to a single value.
			return arguments.length < 3 ? df.foldl1(a, f) : df.foldl(a, f, z);	// Object
		},
		reduceRight: function(/*Array|String*/ a, /*Function|String|Array*/ f, /*Object?*/ z){
			// summary: apply a function simultaneously against two values of the array
			//	(from right-to-left) as to reduce it to a single value.
			return arguments.length < 3 ? df.foldr1(a, f) : df.foldr(a, f, z);	// Object
		},
		// the fold's counterpart: unfold
		unfold: function(/*Function|String|Array*/ pr, /*Function|String|Array*/ f,
						/*Function|String|Array*/ g, /*Object*/ z, /*Object?*/ o){
			// summary: builds an array by unfolding a value
			o = o || win.global; f = df.lambda(f); g = df.lambda(g); pr = df.lambda(pr);
			var t = [];
			for(; !pr.call(o, z); t.push(f.call(o, z)), z = g.call(o, z));
			return t;	// Array
		}
	});
});

},
'dojox/charting/Series':function(){
define("dojox/charting/Series", ["dojo/_base/lang", "dojo/_base/declare", "./Element"], 
	function(lang, declare, Element){ 
	/*=====
	dojox.charting.__SeriesCtorArgs = function(plot){
		//	summary:
		//		An optional arguments object that can be used in the Series constructor.
		//	plot: String?
		//		The plot (by name) that this series belongs to.
		this.plot = plot;
	}

	var Element = dojox.charting.Element;
	=====*/
	return declare("dojox.charting.Series", Element, {
		//	summary:
		//		An object representing a series of data for plotting on a chart.
		constructor: function(chart, data, kwArgs){
			//	summary:
			//		Create a new data series object for use within charting.
			//	chart: dojox.charting.Chart
			//		The chart that this series belongs to.
			//	data: Array|Object:
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			//	kwArgs: dojox.charting.__SeriesCtorArgs?
			//		An optional keyword arguments object to set details for this series.
			lang.mixin(this, kwArgs);
			if(typeof this.plot != "string"){ this.plot = "default"; }
			this.update(data);
		},
	
		clear: function(){
			//	summary:
			//		Clear the calculated additional parameters set on this series.
			this.dyn = {};
		},
		
		update: function(data){
			//	summary:
			//		Set data and make this object dirty, so it can be redrawn.
			//	data: Array|Object:
			//		The array of data points (either numbers or objects) that
			//		represents the data to be drawn. Or it can be an object. In
			//		the latter case, it should have a property "data" (an array),
			//		destroy(), and setSeriesObject().
			if(lang.isArray(data)){
				this.data = data;
			}else{
				this.source = data;
				this.data = this.source.data;
				if(this.source.setSeriesObject){
					this.source.setSeriesObject(this);
				}
			}
			this.dirty = true;
			this.clear();
		}
	});

});

},
'dojox/lang/functional':function(){
define("dojox/lang/functional", ["./functional/lambda", "./functional/array", "./functional/object"], function(df){
	return df;
});

},
'dojox/gfx/gradutils':function(){
// Various generic utilities to deal with a linear gradient

define("dojox/gfx/gradutils", ["./_base", "dojo/_base/lang", "./matrix", "dojo/_base/Color"], 
  function(g, lang, m, Color){
  
	/*===== g= dojox.gfx =====*/
	var gradutils = g.gradutils = {};
	/*===== g= dojox.gfx; gradutils = dojox.gfx.gradutils; =====*/

	function findColor(o, c){
		if(o <= 0){
			return c[0].color;
		}
		var len = c.length;
		if(o >= 1){
			return c[len - 1].color;
		}
		//TODO: use binary search
		for(var i = 0; i < len; ++i){
			var stop = c[i];
			if(stop.offset >= o){
				if(i){
					var prev = c[i - 1];
					return Color.blendColors(new Color(prev.color), new Color(stop.color),
						(o - prev.offset) / (stop.offset - prev.offset));
				}
				return stop.color;
			}
		}
		return c[len - 1].color;
	}

	gradutils.getColor = function(fill, pt){
		// summary:
		//		sample a color from a gradient using a point
		// fill: Object:
		//		fill object
		// pt: dojox.gfx.Point:
		//		point where to sample a color
		var o;
		if(fill){
			switch(fill.type){
				case "linear":
					var angle = Math.atan2(fill.y2 - fill.y1, fill.x2 - fill.x1),
						rotation = m.rotate(-angle),
						projection = m.project(fill.x2 - fill.x1, fill.y2 - fill.y1),
						p = m.multiplyPoint(projection, pt),
						pf1 = m.multiplyPoint(projection, fill.x1, fill.y1),
						pf2 = m.multiplyPoint(projection, fill.x2, fill.y2),
						scale = m.multiplyPoint(rotation, pf2.x - pf1.x, pf2.y - pf1.y).x;
					o = m.multiplyPoint(rotation, p.x - pf1.x, p.y - pf1.y).x / scale;
					break;
				case "radial":
					var dx = pt.x - fill.cx, dy = pt.y - fill.cy;
					o = Math.sqrt(dx * dx + dy * dy) / fill.r;
					break;
			}
			return findColor(o, fill.colors);	// dojo.Color
		}
		// simple color
		return new Color(fill || [0, 0, 0, 0]);	// dojo.Color
	};

	gradutils.reverse = function(fill){
		// summary:
		//		reverses a gradient
		// fill: Object:
		//		fill object
		if(fill){
			switch(fill.type){
				case "linear":
				case "radial":
					fill = lang.delegate(fill);
					if(fill.colors){
						var c = fill.colors, l = c.length, i = 0, stop,
							n = fill.colors = new Array(c.length);
						for(; i < l; ++i){
							stop = c[i];
							n[i] = {
								offset: 1 - stop.offset,
								color:  stop.color
							};
						}
						n.sort(function(a, b){ return a.offset - b.offset; });
					}
					break;
			}
		}
		return fill;	// Object
	};

	return gradutils;
});

},
'dojox/lang/utils':function(){
define("dojox/lang/utils", ["..", "dojo/_base/lang"], 
  function(dojox, lang){
	var du = lang.getObject("lang.utils", true, dojox);
	
	var empty = {}, opts = Object.prototype.toString;

	var clone = function(o){
		if(o){
			switch(opts.call(o)){
				case "[object Array]":
					return o.slice(0);
				case "[object Object]":
					return lang.delegate(o);
			}
		}
		return o;
	}
	
	lang.mixin(du, {
		coerceType: function(target, source){
			// summary: Coerces one object to the type of another.
			// target: Object: object, which typeof result is used to coerce "source" object.
			// source: Object: object, which will be forced to change type.
			switch(typeof target){
				case "number":	return Number(eval("(" + source + ")"));
				case "string":	return String(source);
				case "boolean":	return Boolean(eval("(" + source + ")"));
			}
			return eval("(" + source + ")");
		},
		
		updateWithObject: function(target, source, conv){
			// summary: Updates an existing object in place with properties from an "source" object.
			// target: Object: the "target" object to be updated
			// source: Object: the "source" object, whose properties will be used to source the existed object.
			// conv: Boolean?: force conversion to the original type
			if(!source){ return target; }
			for(var x in target){
				if(x in source && !(x in empty)){
					var t = target[x];
					if(t && typeof t == "object"){
						du.updateWithObject(t, source[x], conv);
					}else{
						target[x] = conv ? du.coerceType(t, source[x]) : clone(source[x]);
					}
				}
			}
			return target;	// Object
		},
	
		updateWithPattern: function(target, source, pattern, conv){
			// summary: Updates an existing object in place with properties from an "source" object.
			// target: Object: the "target" object to be updated
			// source: Object: the "source" object, whose properties will be used to source the existed object.
			// pattern: Object: object, whose properties will be used to pull values from the "source"
			// conv: Boolean?: force conversion to the original type
			if(!source || !pattern){ return target; }
			for(var x in pattern){
				if(x in source && !(x in empty)){
					target[x] = conv ? du.coerceType(pattern[x], source[x]) : clone(source[x]);
				}
			}
			return target;	// Object
		},
		
		merge: function(object, mixin){
			// summary: Merge two objects structurally, mixin properties will override object's properties.
			// object: Object: original object.
			// mixin: Object: additional object, which properties will override object's properties.
			if(mixin){
				var otype = opts.call(object), mtype = opts.call(mixin), t, i, l, m;
				switch(mtype){
					case "[object Array]":
						if(mtype == otype){
							t = new Array(Math.max(object.length, mixin.length));
							for(i = 0, l = t.length; i < l; ++i){
								t[i] = du.merge(object[i], mixin[i]);
							}
							return t;
						}
						return mixin.slice(0);
					case "[object Object]":
						if(mtype == otype && object){
							t = lang.delegate(object);
							for(i in mixin){
								if(i in object){
									l = object[i];
									m = mixin[i];
									if(m !== l){
										t[i] = du.merge(l, m);
									}
								}else{
									t[i] = lang.clone(mixin[i]);
								}
							}
							return t;
						}
						return lang.clone(mixin);
				}
			}
			return mixin;
		}
	});
	
	return du;
});

},
'dojox/lang/functional/object':function(){
define("dojox/lang/functional/object", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/window", "./lambda"], function(dojo, lang, win, df){

// This module adds high-level functions and related constructs:
//	- object/dictionary helpers

// Defined methods:
//	- take any valid lambda argument as the functional argument
//	- skip all attributes that are present in the empty object
//		(IE and/or 3rd-party libraries).

	var empty = {};

/*=====
	var df = dojox.lang.functional;
 =====*/
	lang.mixin(df, {
		// object helpers
		keys: function(/*Object*/ obj){
			// summary: returns an array of all keys in the object
			var t = [];
			for(var i in obj){
				if(!(i in empty)){
					t.push(i);
				}
			}
			return	t; // Array
		},
		values: function(/*Object*/ obj){
			// summary: returns an array of all values in the object
			var t = [];
			for(var i in obj){
				if(!(i in empty)){
					t.push(obj[i]);
				}
			}
			return	t; // Array
		},
		filterIn: function(/*Object*/ obj, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates new object with all attributes that pass the test
			//	implemented by the provided function.
			o = o || win.global; f = df.lambda(f);
			var t = {}, v, i;
			for(i in obj){
				if(!(i in empty)){
					v = obj[i];
					if(f.call(o, v, i, obj)){ t[i] = v; }
				}
			}
			return t;	// Object
		},
		forIn: function(/*Object*/ obj, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: iterates over all object attributes.
			o = o || win.global; f = df.lambda(f);
			for(var i in obj){
				if(!(i in empty)){
					f.call(o, obj[i], i, obj);
				}
			}
			return o;	// Object
		},
		mapIn: function(/*Object*/ obj, /*Function|String|Array*/ f, /*Object?*/ o){
			// summary: creates new object with the results of calling
			//	a provided function on every attribute in this object.
			o = o || win.global; f = df.lambda(f);
			var t = {}, i;
			for(i in obj){
				if(!(i in empty)){
					t[i] = f.call(o, obj[i], i, obj);
				}
			}
			return t;	// Object
		}
	});
	
	return df;
});

},
'dojox/charting/axis2d/common':function(){
define("dojox/charting/axis2d/common", ["dojo/_base/lang", "dojo/_base/html", "dojo/_base/window", "dojo/dom-geometry", "dojox/gfx"], 
	function(lang, html, win, domGeom, g){

	var common = lang.getObject("dojox.charting.axis2d.common", true);
	
	var clearNode = function(s){
		s.marginLeft   = "0px";
		s.marginTop    = "0px";
		s.marginRight  = "0px";
		s.marginBottom = "0px";
		s.paddingLeft   = "0px";
		s.paddingTop    = "0px";
		s.paddingRight  = "0px";
		s.paddingBottom = "0px";
		s.borderLeftWidth   = "0px";
		s.borderTopWidth    = "0px";
		s.borderRightWidth  = "0px";
		s.borderBottomWidth = "0px";
	};

	var getBoxWidth = function(n){
		// marginBox is incredibly slow, so avoid it if we can
		if(n["getBoundingClientRect"]){
			var bcr = n.getBoundingClientRect();
			return bcr.width || (bcr.right - bcr.left);
		}else{
			return domGeom.getMarginBox(n).w;
		}
	};

	return lang.mixin(common, {
		//	summary:
		//		Common methods to be used by any axis.  This is considered "static".
		createText: {
			gfx: function(chart, creator, x, y, align, text, font, fontColor){
				//	summary:
				//		Use dojox.gfx to create any text.
				//	chart: dojox.charting.Chart
				//		The chart to create the text into.
				//	creator: dojox.gfx.Surface
				//		The graphics surface to use for creating the text.
				//	x: Number
				//		Where to create the text along the x axis (CSS left).
				//	y: Number
				//		Where to create the text along the y axis (CSS top).
				//	align: String
				//		How to align the text.  Can be "left", "right", "center".
				//	text: String
				//		The text to render.
				//	font: String
				//		The font definition, a la CSS "font".
				//	fontColor: String|dojo.Color
				//		The color of the resultant text.
				//	returns: dojox.gfx.Text
				//		The resultant GFX object.
				return creator.createText({
					x: x, y: y, text: text, align: align
				}).setFont(font).setFill(fontColor);	//	dojox.gfx.Text
			},
			html: function(chart, creator, x, y, align, text, font, fontColor, labelWidth){
				//	summary:
				//		Use the HTML DOM to create any text.
				//	chart: dojox.charting.Chart
				//		The chart to create the text into.
				//	creator: dojox.gfx.Surface
				//		The graphics surface to use for creating the text.
				//	x: Number
				//		Where to create the text along the x axis (CSS left).
				//	y: Number
				//		Where to create the text along the y axis (CSS top).
				//	align: String
				//		How to align the text.  Can be "left", "right", "center".
				//	text: String
				//		The text to render.
				//	font: String
				//		The font definition, a la CSS "font".
				//	fontColor: String|dojo.Color
				//		The color of the resultant text.
				//	labelWidth: Number?
				//		The maximum width of the resultant DOM node.
				//	returns: DOMNode
				//		The resultant DOMNode (a "div" element).

				// setup the text node
				var p = win.doc.createElement("div"), s = p.style, boxWidth;
				// bidi support, if this function exists the module was loaded 
				if(chart.getTextDir){
					p.dir = chart.getTextDir(text);
				}
				clearNode(s);
				s.font = font;
				p.innerHTML = String(text).replace(/\s/g, "&nbsp;");
				s.color = fontColor;
				// measure the size
				s.position = "absolute";
				s.left = "-10000px";
				win.body().appendChild(p);
				var size = g.normalizedLength(g.splitFontString(font).size);

				// do we need to calculate the label width?
				if(!labelWidth){
					boxWidth = getBoxWidth(p);
				}
				// when the textDir is rtl, but the UI ltr needs
				// to recalculate the starting point
				if(p.dir == "rtl"){
					x += labelWidth ? labelWidth : boxWidth;
				}

				// new settings for the text node
				win.body().removeChild(p);

				s.position = "relative";
				if(labelWidth){
					s.width = labelWidth + "px";
					// s.border = "1px dotted grey";
					switch(align){
						case "middle":
							s.textAlign = "center";
							s.left = (x - labelWidth / 2) + "px";
							break;
						case "end":
							s.textAlign = "right";
							s.left = (x - labelWidth) + "px";
							break;
						default:
							s.left = x + "px";
							s.textAlign = "left";
							break;
					}
				}else{
					switch(align){
						case "middle":
							s.left = Math.floor(x - boxWidth / 2) + "px";
							// s.left = Math.floor(x - p.offsetWidth / 2) + "px";
							break;
						case "end":
							s.left = Math.floor(x - boxWidth) + "px";
							// s.left = Math.floor(x - p.offsetWidth) + "px";
							break;
						//case "start":
						default:
							s.left = Math.floor(x) + "px";
							break;
					}
				}
				s.top = Math.floor(y - size) + "px";
				s.whiteSpace = "nowrap";	// hack for WebKit
				// setup the wrapper node
				var wrap = win.doc.createElement("div"), w = wrap.style;
				clearNode(w);
				w.width = "0px";
				w.height = "0px";
				// insert nodes
				wrap.appendChild(p)
				chart.node.insertBefore(wrap, chart.node.firstChild);
				return wrap;	//	DOMNode
			}
		}
	});
});

},
'*noref':1}});
define("dojox/_dojox_charting", [], 1);
require(["dojox/charting/Chart"]);

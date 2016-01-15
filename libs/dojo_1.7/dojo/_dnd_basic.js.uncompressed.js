require({cache:{
'dojo/dnd/autoscroll':function(){
define("dojo/dnd/autoscroll", ["../main", "../window"], function(dojo) {
	// module:
	//		dojo/dnd/autoscroll
	// summary:
	//		TODOC

dojo.getObject("dnd", true, dojo);

dojo.dnd.getViewport = dojo.window.getBox;

dojo.dnd.V_TRIGGER_AUTOSCROLL = 32;
dojo.dnd.H_TRIGGER_AUTOSCROLL = 32;

dojo.dnd.V_AUTOSCROLL_VALUE = 16;
dojo.dnd.H_AUTOSCROLL_VALUE = 16;

dojo.dnd.autoScroll = function(e){
	// summary:
	//		a handler for onmousemove event, which scrolls the window, if
	//		necesary
	// e: Event
	//		onmousemove event

	// FIXME: needs more docs!
	var v = dojo.window.getBox(), dx = 0, dy = 0;
	if(e.clientX < dojo.dnd.H_TRIGGER_AUTOSCROLL){
		dx = -dojo.dnd.H_AUTOSCROLL_VALUE;
	}else if(e.clientX > v.w - dojo.dnd.H_TRIGGER_AUTOSCROLL){
		dx = dojo.dnd.H_AUTOSCROLL_VALUE;
	}
	if(e.clientY < dojo.dnd.V_TRIGGER_AUTOSCROLL){
		dy = -dojo.dnd.V_AUTOSCROLL_VALUE;
	}else if(e.clientY > v.h - dojo.dnd.V_TRIGGER_AUTOSCROLL){
		dy = dojo.dnd.V_AUTOSCROLL_VALUE;
	}
	window.scrollBy(dx, dy);
};

dojo.dnd._validNodes = {"div": 1, "p": 1, "td": 1};
dojo.dnd._validOverflow = {"auto": 1, "scroll": 1};

dojo.dnd.autoScrollNodes = function(e){
	// summary:
	//		a handler for onmousemove event, which scrolls the first avaialble
	//		Dom element, it falls back to dojo.dnd.autoScroll()
	// e: Event
	//		onmousemove event

	// FIXME: needs more docs!

	var b, t, w, h, rx, ry, dx = 0, dy = 0, oldLeft, oldTop;

	for(var n = e.target; n;){
		if(n.nodeType == 1 && (n.tagName.toLowerCase() in dojo.dnd._validNodes)){
			var s = dojo.getComputedStyle(n),
				overflow = (s.overflow.toLowerCase() in dojo.dnd._validOverflow),
				overflowX = (s.overflowX.toLowerCase() in dojo.dnd._validOverflow),
				overflowY = (s.overflowY.toLowerCase() in dojo.dnd._validOverflow);
			if(overflow || overflowX || overflowY){
				b = dojo._getContentBox(n, s);
				t = dojo.position(n, true);
			}
			// overflow-x
			if(overflow || overflowX){
				w = Math.min(dojo.dnd.H_TRIGGER_AUTOSCROLL, b.w / 2);
				rx = e.pageX - t.x;
				if(dojo.isWebKit || dojo.isOpera){
					// FIXME: this code should not be here, it should be taken into account
					// either by the event fixing code, or the dojo.position()
					// FIXME: this code doesn't work on Opera 9.5 Beta
					rx += dojo.body().scrollLeft;
				}
				dx = 0;
				if(rx > 0 && rx < b.w){
					if(rx < w){
						dx = -w;
					}else if(rx > b.w - w){
						dx = w;
					}
					oldLeft = n.scrollLeft;
					n.scrollLeft = n.scrollLeft + dx;
				}
			}
			// overflow-y
			if(overflow || overflowY){
				//console.log(b.l, b.t, t.x, t.y, n.scrollLeft, n.scrollTop);
				h = Math.min(dojo.dnd.V_TRIGGER_AUTOSCROLL, b.h / 2);
				ry = e.pageY - t.y;
				if(dojo.isWebKit || dojo.isOpera){
					// FIXME: this code should not be here, it should be taken into account
					// either by the event fixing code, or the dojo.position()
					// FIXME: this code doesn't work on Opera 9.5 Beta
					ry += dojo.body().scrollTop;
				}
				dy = 0;
				if(ry > 0 && ry < b.h){
					if(ry < h){
						dy = -h;
					}else if(ry > b.h - h){
						dy = h;
					}
					oldTop = n.scrollTop;
					n.scrollTop  = n.scrollTop  + dy;
				}
			}
			if(dx || dy){ return; }
		}
		try{
			n = n.parentNode;
		}catch(x){
			n = null;
		}
	}
	dojo.dnd.autoScroll(e);
};

	return dojo.dnd;
});

},
'dojo/dnd/Target':function(){
define("dojo/dnd/Target", [ "./Source" ], function(Source){
	/*===== Source = dojo.dnd.Source =====*/
	return dojo.declare("dojo.dnd.Target", Source, {
		// summary: a Target object, which can be used as a DnD target

		constructor: function(node, params){
			// summary:
			//		a constructor of the Target --- see the `dojo.dnd.Source.constructor` for details
			this.isSource = false;
			dojo.removeClass(this.node, "dojoDndSource");
		}
	});
});

},
'dojo/dnd/common':function(){
define("dojo/dnd/common", ["../main"], function(dojo) {
	// module:
	//		dojo/dnd/common
	// summary:
	//		TODOC

dojo.getObject("dnd", true, dojo);

dojo.dnd.getCopyKeyState = dojo.isCopyKey;

dojo.dnd._uniqueId = 0;
dojo.dnd.getUniqueId = function(){
	// summary:
	//		returns a unique string for use with any DOM element
	var id;
	do{
		id = dojo._scopeName + "Unique" + (++dojo.dnd._uniqueId);
	}while(dojo.byId(id));
	return id;
};

dojo.dnd._empty = {};

dojo.dnd.isFormElement = function(/*Event*/ e){
	// summary:
	//		returns true if user clicked on a form element
	var t = e.target;
	if(t.nodeType == 3 /*TEXT_NODE*/){
		t = t.parentNode;
	}
	return " button textarea input select option ".indexOf(" " + t.tagName.toLowerCase() + " ") >= 0;	// Boolean
};

return dojo.dnd;
});

},
'dojo/dnd/Selector':function(){
define("dojo/dnd/Selector", ["../main", "./common", "./Container"], function(dojo) {
	// module:
	//		dojo/dnd/Selector
	// summary:
	//		TODOC


/*
	Container item states:
		""			- an item is not selected
		"Selected"	- an item is selected
		"Anchor"	- an item is selected, and is an anchor for a "shift" selection
*/

/*=====
dojo.declare("dojo.dnd.__SelectorArgs", [dojo.dnd.__ContainerArgs], {
	//	singular: Boolean
	//		allows selection of only one element, if true
	singular: false,

	//	autoSync: Boolean
	//		autosynchronizes the source with its list of DnD nodes,
	autoSync: false
});
=====*/

dojo.declare("dojo.dnd.Selector", dojo.dnd.Container, {
	// summary:
	//		a Selector object, which knows how to select its children

	/*=====
	// selection: Set<String>
	//		The set of id's that are currently selected, such that this.selection[id] == 1
	//		if the node w/that id is selected.  Can iterate over selected node's id's like:
	//	|		for(var id in this.selection)
	selection: {},
	=====*/

	constructor: function(node, params){
		// summary:
		//		constructor of the Selector
		// node: Node||String
		//		node or node's id to build the selector on
		// params: dojo.dnd.__SelectorArgs?
		//		a dictionary of parameters
		if(!params){ params = {}; }
		this.singular = params.singular;
		this.autoSync = params.autoSync;
		// class-specific variables
		this.selection = {};
		this.anchor = null;
		this.simpleSelection = false;
		// set up events
		this.events.push(
			dojo.connect(this.node, "onmousedown", this, "onMouseDown"),
			dojo.connect(this.node, "onmouseup",   this, "onMouseUp"));
	},

	// object attributes (for markup)
	singular: false,	// is singular property

	// methods
	getSelectedNodes: function(){
		// summary:
		//		returns a list (an array) of selected nodes
		var t = new dojo.NodeList();
		var e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			t.push(dojo.byId(i));
		}
		return t;	// NodeList
	},
	selectNone: function(){
		// summary:
		//		unselects all items
		return this._removeSelection()._removeAnchor();	// self
	},
	selectAll: function(){
		// summary:
		//		selects all items
		this.forInItems(function(data, id){
			this._addItemClass(dojo.byId(id), "Selected");
			this.selection[id] = 1;
		}, this);
		return this._removeAnchor();	// self
	},
	deleteSelectedNodes: function(){
		// summary:
		//		deletes all selected items
		var e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			var n = dojo.byId(i);
			this.delItem(i);
			dojo.destroy(n);
		}
		this.anchor = null;
		this.selection = {};
		return this;	// self
	},
	forInSelectedItems: function(/*Function*/ f, /*Object?*/ o){
		// summary:
		//		iterates over selected items;
		//		see `dojo.dnd.Container.forInItems()` for details
		o = o || dojo.global;
		var s = this.selection, e = dojo.dnd._empty;
		for(var i in s){
			if(i in e){ continue; }
			f.call(o, this.getItem(i), i, this);
		}
	},
	sync: function(){
		// summary:
		//		sync up the node list with the data map

		dojo.dnd.Selector.superclass.sync.call(this);

		// fix the anchor
		if(this.anchor){
			if(!this.getItem(this.anchor.id)){
				this.anchor = null;
			}
		}

		// fix the selection
		var t = [], e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			if(!this.getItem(i)){
				t.push(i);
			}
		}
		dojo.forEach(t, function(i){
			delete this.selection[i];
		}, this);

		return this;	// self
	},
	insertNodes: function(addSelected, data, before, anchor){
		// summary:
		//		inserts new data items (see `dojo.dnd.Container.insertNodes()` method for details)
		// addSelected: Boolean
		//		all new nodes will be added to selected items, if true, no selection change otherwise
		// data: Array
		//		a list of data items, which should be processed by the creator function
		// before: Boolean
		//		insert before the anchor, if true, and after the anchor otherwise
		// anchor: Node
		//		the anchor node to be used as a point of insertion
		var oldCreator = this._normalizedCreator;
		this._normalizedCreator = function(item, hint){
			var t = oldCreator.call(this, item, hint);
			if(addSelected){
				if(!this.anchor){
					this.anchor = t.node;
					this._removeItemClass(t.node, "Selected");
					this._addItemClass(this.anchor, "Anchor");
				}else if(this.anchor != t.node){
					this._removeItemClass(t.node, "Anchor");
					this._addItemClass(t.node, "Selected");
				}
				this.selection[t.node.id] = 1;
			}else{
				this._removeItemClass(t.node, "Selected");
				this._removeItemClass(t.node, "Anchor");
			}
			return t;
		};
		dojo.dnd.Selector.superclass.insertNodes.call(this, data, before, anchor);
		this._normalizedCreator = oldCreator;
		return this;	// self
	},
	destroy: function(){
		// summary:
		//		prepares the object to be garbage-collected
		dojo.dnd.Selector.superclass.destroy.call(this);
		this.selection = this.anchor = null;
	},

	// mouse events
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown
		// e: Event
		//		mouse event
		if(this.autoSync){ this.sync(); }
		if(!this.current){ return; }
		if(!this.singular && !dojo.isCopyKey(e) && !e.shiftKey && (this.current.id in this.selection)){
			this.simpleSelection = true;
			if(e.button === dojo.mouseButtons.LEFT){
				// accept the left button and stop the event
				// for IE we don't stop event when multiple buttons are pressed
				dojo.stopEvent(e);
			}
			return;
		}
		if(!this.singular && e.shiftKey){
			if(!dojo.isCopyKey(e)){
				this._removeSelection();
			}
			var c = this.getAllNodes();
			if(c.length){
				if(!this.anchor){
					this.anchor = c[0];
					this._addItemClass(this.anchor, "Anchor");
				}
				this.selection[this.anchor.id] = 1;
				if(this.anchor != this.current){
					var i = 0;
					for(; i < c.length; ++i){
						var node = c[i];
						if(node == this.anchor || node == this.current){ break; }
					}
					for(++i; i < c.length; ++i){
						var node = c[i];
						if(node == this.anchor || node == this.current){ break; }
						this._addItemClass(node, "Selected");
						this.selection[node.id] = 1;
					}
					this._addItemClass(this.current, "Selected");
					this.selection[this.current.id] = 1;
				}
			}
		}else{
			if(this.singular){
				if(this.anchor == this.current){
					if(dojo.isCopyKey(e)){
						this.selectNone();
					}
				}else{
					this.selectNone();
					this.anchor = this.current;
					this._addItemClass(this.anchor, "Anchor");
					this.selection[this.current.id] = 1;
				}
			}else{
				if(dojo.isCopyKey(e)){
					if(this.anchor == this.current){
						delete this.selection[this.anchor.id];
						this._removeAnchor();
					}else{
						if(this.current.id in this.selection){
							this._removeItemClass(this.current, "Selected");
							delete this.selection[this.current.id];
						}else{
							if(this.anchor){
								this._removeItemClass(this.anchor, "Anchor");
								this._addItemClass(this.anchor, "Selected");
							}
							this.anchor = this.current;
							this._addItemClass(this.current, "Anchor");
							this.selection[this.current.id] = 1;
						}
					}
				}else{
					if(!(this.current.id in this.selection)){
						this.selectNone();
						this.anchor = this.current;
						this._addItemClass(this.current, "Anchor");
						this.selection[this.current.id] = 1;
					}
				}
			}
		}
		dojo.stopEvent(e);
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup
		// e: Event
		//		mouse event
		if(!this.simpleSelection){ return; }
		this.simpleSelection = false;
		this.selectNone();
		if(this.current){
			this.anchor = this.current;
			this._addItemClass(this.anchor, "Anchor");
			this.selection[this.current.id] = 1;
		}
	},
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove
		// e: Event
		//		mouse event
		this.simpleSelection = false;
	},

	// utilities
	onOverEvent: function(){
		// summary:
		//		this function is called once, when mouse is over our container
		this.onmousemoveEvent = dojo.connect(this.node, "onmousemove", this, "onMouseMove");
	},
	onOutEvent: function(){
		// summary:
		//		this function is called once, when mouse is out of our container
		dojo.disconnect(this.onmousemoveEvent);
		delete this.onmousemoveEvent;
	},
	_removeSelection: function(){
		// summary:
		//		unselects all items
		var e = dojo.dnd._empty;
		for(var i in this.selection){
			if(i in e){ continue; }
			var node = dojo.byId(i);
			if(node){ this._removeItemClass(node, "Selected"); }
		}
		this.selection = {};
		return this;	// self
	},
	_removeAnchor: function(){
		if(this.anchor){
			this._removeItemClass(this.anchor, "Anchor");
			this.anchor = null;
		}
		return this;	// self
	}
});

return dojo.dnd.Selector;
});

},
'dojo/dnd/AutoSource':function(){
define("dojo/dnd/AutoSource", [ "./Source" ], function(Source){
	/*===== Source = dojo.dnd.Source =====*/
	return dojo.declare("dojo.dnd.AutoSource", Source, {
		// summary:
		//		a source that syncs its DnD nodes by default

		constructor: function(node, params){
			// summary:
			//		constructor of the AutoSource --- see the Source constructor for details
			this.autoSync = true;
		}
	});
});

},
'dojo/dnd/Source':function(){
define("dojo/dnd/Source", ["../main", "./Selector", "./Manager"], function(dojo, Selector, Manager) {
	// module:
	//		dojo/dnd/Source
	// summary:
	//		TODOC

/*=====
Selector = dojo.dnd.Selector;
=====*/

/*
	Container property:
		"Horizontal"- if this is the horizontal container
	Source states:
		""			- normal state
		"Moved"		- this source is being moved
		"Copied"	- this source is being copied
	Target states:
		""			- normal state
		"Disabled"	- the target cannot accept an avatar
	Target anchor state:
		""			- item is not selected
		"Before"	- insert point is before the anchor
		"After"		- insert point is after the anchor
*/

/*=====
dojo.dnd.__SourceArgs = function(){
	//	summary:
	//		a dict of parameters for DnD Source configuration. Note that any
	//		property on Source elements may be configured, but this is the
	//		short-list
	//	isSource: Boolean?
	//		can be used as a DnD source. Defaults to true.
	//	accept: Array?
	//		list of accepted types (text strings) for a target; defaults to
	//		["text"]
	//	autoSync: Boolean
	//		if true refreshes the node list on every operation; false by default
	//	copyOnly: Boolean?
	//		copy items, if true, use a state of Ctrl key otherwise,
	//		see selfCopy and selfAccept for more details
	//	delay: Number
	//		the move delay in pixels before detecting a drag; 0 by default
	//	horizontal: Boolean?
	//		a horizontal container, if true, vertical otherwise or when omitted
	//	selfCopy: Boolean?
	//		copy items by default when dropping on itself,
	//		false by default, works only if copyOnly is true
	//	selfAccept: Boolean?
	//		accept its own items when copyOnly is true,
	//		true by default, works only if copyOnly is true
	//	withHandles: Boolean?
	//		allows dragging only by handles, false by default
	//  generateText: Boolean?
	//		generate text node for drag and drop, true by default
	this.isSource = isSource;
	this.accept = accept;
	this.autoSync = autoSync;
	this.copyOnly = copyOnly;
	this.delay = delay;
	this.horizontal = horizontal;
	this.selfCopy = selfCopy;
	this.selfAccept = selfAccept;
	this.withHandles = withHandles;
	this.generateText = true;
}
=====*/

// For back-compat, remove in 2.0.
if(!dojo.isAsync){
	dojo.ready(0, function(){
		var requires = ["dojo/dnd/AutoSource", "dojo/dnd/Target"];
		require(requires);	// use indirection so modules not rolled into a build
	})
}

return dojo.declare("dojo.dnd.Source", Selector, {
	// summary:
	//		a Source object, which can be used as a DnD source, or a DnD target

	// object attributes (for markup)
	isSource: true,
	horizontal: false,
	copyOnly: false,
	selfCopy: false,
	selfAccept: true,
	skipForm: false,
	withHandles: false,
	autoSync: false,
	delay: 0, // pixels
	accept: ["text"],
	generateText: true,

	constructor: function(/*DOMNode|String*/node, /*dojo.dnd.__SourceArgs?*/params){
		// summary:
		//		a constructor of the Source
		// node:
		//		node or node's id to build the source on
		// params:
		//		any property of this class may be configured via the params
		//		object which is mixed-in to the `dojo.dnd.Source` instance
		dojo.mixin(this, dojo.mixin({}, params));
		var type = this.accept;
		if(type.length){
			this.accept = {};
			for(var i = 0; i < type.length; ++i){
				this.accept[type[i]] = 1;
			}
		}
		// class-specific variables
		this.isDragging = false;
		this.mouseDown = false;
		this.targetAnchor = null;
		this.targetBox = null;
		this.before = true;
		this._lastX = 0;
		this._lastY = 0;
		// states
		this.sourceState  = "";
		if(this.isSource){
			dojo.addClass(this.node, "dojoDndSource");
		}
		this.targetState  = "";
		if(this.accept){
			dojo.addClass(this.node, "dojoDndTarget");
		}
		if(this.horizontal){
			dojo.addClass(this.node, "dojoDndHorizontal");
		}
		// set up events
		this.topics = [
			dojo.subscribe("/dnd/source/over", this, "onDndSourceOver"),
			dojo.subscribe("/dnd/start",  this, "onDndStart"),
			dojo.subscribe("/dnd/drop",   this, "onDndDrop"),
			dojo.subscribe("/dnd/cancel", this, "onDndCancel")
		];
	},

	// methods
	checkAcceptance: function(source, nodes){
		// summary:
		//		checks if the target can accept nodes from this source
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		if(this == source){
			return !this.copyOnly || this.selfAccept;
		}
		for(var i = 0; i < nodes.length; ++i){
			var type = source.getItem(nodes[i].id).type;
			// type instanceof Array
			var flag = false;
			for(var j = 0; j < type.length; ++j){
				if(type[j] in this.accept){
					flag = true;
					break;
				}
			}
			if(!flag){
				return false;	// Boolean
			}
		}
		return true;	// Boolean
	},
	copyState: function(keyPressed, self){
		// summary:
		//		Returns true if we need to copy items, false to move.
		//		It is separated to be overwritten dynamically, if needed.
		// keyPressed: Boolean
		//		the "copy" key was pressed
		// self: Boolean?
		//		optional flag that means that we are about to drop on itself

		if(keyPressed){ return true; }
		if(arguments.length < 2){
			self = this == Manager.manager().target;
		}
		if(self){
			if(this.copyOnly){
				return this.selfCopy;
			}
		}else{
			return this.copyOnly;
		}
		return false;	// Boolean
	},
	destroy: function(){
		// summary:
		//		prepares the object to be garbage-collected
		dojo.dnd.Source.superclass.destroy.call(this);
		dojo.forEach(this.topics, dojo.unsubscribe);
		this.targetAnchor = null;
	},

	// mouse event processors
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove
		// e: Event
		//		mouse event
		if(this.isDragging && this.targetState == "Disabled"){ return; }
		dojo.dnd.Source.superclass.onMouseMove.call(this, e);
		var m = Manager.manager();
		if(!this.isDragging){
			if(this.mouseDown && this.isSource &&
					(Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay)){
				var nodes = this.getSelectedNodes();
				if(nodes.length){
					m.startDrag(this, nodes, this.copyState(dojo.isCopyKey(e), true));
				}
			}
		}
		if(this.isDragging){
			// calculate before/after
			var before = false;
			if(this.current){
				if(!this.targetBox || this.targetAnchor != this.current){
					this.targetBox = dojo.position(this.current, true);
				}
				if(this.horizontal){
					before = (e.pageX - this.targetBox.x) < (this.targetBox.w / 2);
				}else{
					before = (e.pageY - this.targetBox.y) < (this.targetBox.h / 2);
				}
			}
			if(this.current != this.targetAnchor || before != this.before){
				this._markTargetAnchor(before);
				m.canDrop(!this.current || m.source != this || !(this.current.id in this.selection));
			}
		}
	},
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown
		// e: Event
		//		mouse event
		if(!this.mouseDown && this._legalMouseDown(e) && (!this.skipForm || !dojo.dnd.isFormElement(e))){
			this.mouseDown = true;
			this._lastX = e.pageX;
			this._lastY = e.pageY;
			dojo.dnd.Source.superclass.onMouseDown.call(this, e);
		}
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup
		// e: Event
		//		mouse event
		if(this.mouseDown){
			this.mouseDown = false;
			dojo.dnd.Source.superclass.onMouseUp.call(this, e);
		}
	},

	// topic event processors
	onDndSourceOver: function(source){
		// summary:
		//		topic event processor for /dnd/source/over, called when detected a current source
		// source: Object
		//		the source which has the mouse over it
		if(this != source){
			this.mouseDown = false;
			if(this.targetAnchor){
				this._unmarkTargetAnchor();
			}
		}else if(this.isDragging){
			var m = Manager.manager();
			m.canDrop(this.targetState != "Disabled" && (!this.current || m.source != this || !(this.current.id in this.selection)));
		}
	},
	onDndStart: function(source, nodes, copy){
		// summary:
		//		topic event processor for /dnd/start, called to initiate the DnD operation
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		if(this.autoSync){ this.sync(); }
		if(this.isSource){
			this._changeState("Source", this == source ? (copy ? "Copied" : "Moved") : "");
		}
		var accepted = this.accept && this.checkAcceptance(source, nodes);
		this._changeState("Target", accepted ? "" : "Disabled");
		if(this == source){
			Manager.manager().overSource(this);
		}
		this.isDragging = true;
	},
	onDndDrop: function(source, nodes, copy, target){
		// summary:
		//		topic event processor for /dnd/drop, called to finish the DnD operation
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		// target: Object
		//		the target which accepts items
		if(this == target){
			// this one is for us => move nodes!
			this.onDrop(source, nodes, copy);
		}
		this.onDndCancel();
	},
	onDndCancel: function(){
		// summary:
		//		topic event processor for /dnd/cancel, called to cancel the DnD operation
		if(this.targetAnchor){
			this._unmarkTargetAnchor();
			this.targetAnchor = null;
		}
		this.before = true;
		this.isDragging = false;
		this.mouseDown = false;
		this._changeState("Source", "");
		this._changeState("Target", "");
	},

	// local events
	onDrop: function(source, nodes, copy){
		// summary:
		//		called only on the current target, when drop is performed
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise

		if(this != source){
			this.onDropExternal(source, nodes, copy);
		}else{
			this.onDropInternal(nodes, copy);
		}
	},
	onDropExternal: function(source, nodes, copy){
		// summary:
		//		called only on the current target, when drop is performed
		//		from an external source
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise

		var oldCreator = this._normalizedCreator;
		// transferring nodes from the source to the target
		if(this.creator){
			// use defined creator
			this._normalizedCreator = function(node, hint){
				return oldCreator.call(this, source.getItem(node.id).data, hint);
			};
		}else{
			// we have no creator defined => move/clone nodes
			if(copy){
				// clone nodes
				this._normalizedCreator = function(node, hint){
					var t = source.getItem(node.id);
					var n = node.cloneNode(true);
					n.id = dojo.dnd.getUniqueId();
					return {node: n, data: t.data, type: t.type};
				};
			}else{
				// move nodes
				this._normalizedCreator = function(node, hint){
					var t = source.getItem(node.id);
					source.delItem(node.id);
					return {node: node, data: t.data, type: t.type};
				};
			}
		}
		this.selectNone();
		if(!copy && !this.creator){
			source.selectNone();
		}
		this.insertNodes(true, nodes, this.before, this.current);
		if(!copy && this.creator){
			source.deleteSelectedNodes();
		}
		this._normalizedCreator = oldCreator;
	},
	onDropInternal: function(nodes, copy){
		// summary:
		//		called only on the current target, when drop is performed
		//		from the same target/source
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise

		var oldCreator = this._normalizedCreator;
		// transferring nodes within the single source
		if(this.current && this.current.id in this.selection){
			// do nothing
			return;
		}
		if(copy){
			if(this.creator){
				// create new copies of data items
				this._normalizedCreator = function(node, hint){
					return oldCreator.call(this, this.getItem(node.id).data, hint);
				};
			}else{
				// clone nodes
				this._normalizedCreator = function(node, hint){
					var t = this.getItem(node.id);
					var n = node.cloneNode(true);
					n.id = dojo.dnd.getUniqueId();
					return {node: n, data: t.data, type: t.type};
				};
			}
		}else{
			// move nodes
			if(!this.current){
				// do nothing
				return;
			}
			this._normalizedCreator = function(node, hint){
				var t = this.getItem(node.id);
				return {node: node, data: t.data, type: t.type};
			};
		}
		this._removeSelection();
		this.insertNodes(true, nodes, this.before, this.current);
		this._normalizedCreator = oldCreator;
	},
	onDraggingOver: function(){
		// summary:
		//		called during the active DnD operation, when items
		//		are dragged over this target, and it is not disabled
	},
	onDraggingOut: function(){
		// summary:
		//		called during the active DnD operation, when items
		//		are dragged away from this target, and it is not disabled
	},

	// utilities
	onOverEvent: function(){
		// summary:
		//		this function is called once, when mouse is over our container
		dojo.dnd.Source.superclass.onOverEvent.call(this);
		Manager.manager().overSource(this);
		if(this.isDragging && this.targetState != "Disabled"){
			this.onDraggingOver();
		}
	},
	onOutEvent: function(){
		// summary:
		//		this function is called once, when mouse is out of our container
		dojo.dnd.Source.superclass.onOutEvent.call(this);
		Manager.manager().outSource(this);
		if(this.isDragging && this.targetState != "Disabled"){
			this.onDraggingOut();
		}
	},
	_markTargetAnchor: function(before){
		// summary:
		//		assigns a class to the current target anchor based on "before" status
		// before: Boolean
		//		insert before, if true, after otherwise
		if(this.current == this.targetAnchor && this.before == before){ return; }
		if(this.targetAnchor){
			this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
		}
		this.targetAnchor = this.current;
		this.targetBox = null;
		this.before = before;
		if(this.targetAnchor){
			this._addItemClass(this.targetAnchor, this.before ? "Before" : "After");
		}
	},
	_unmarkTargetAnchor: function(){
		// summary:
		//		removes a class of the current target anchor based on "before" status
		if(!this.targetAnchor){ return; }
		this._removeItemClass(this.targetAnchor, this.before ? "Before" : "After");
		this.targetAnchor = null;
		this.targetBox = null;
		this.before = true;
	},
	_markDndStatus: function(copy){
		// summary:
		//		changes source's state based on "copy" status
		this._changeState("Source", copy ? "Copied" : "Moved");
	},
	_legalMouseDown: function(e){
		// summary:
		//		checks if user clicked on "approved" items
		// e: Event
		//		mouse event

		// accept only the left mouse button
		if(!dojo.mouseButtons.isLeft(e)){ return false; }

		if(!this.withHandles){ return true; }

		// check for handles
		for(var node = e.target; node && node !== this.node; node = node.parentNode){
			if(dojo.hasClass(node, "dojoDndHandle")){ return true; }
			if(dojo.hasClass(node, "dojoDndItem") || dojo.hasClass(node, "dojoDndIgnore")){ break; }
		}
		return false;	// Boolean
	}
});

});

},
'dojo/dnd/Container':function(){
define("dojo/dnd/Container", ["../main", "../Evented", "./common", "../parser"], function(dojo, Evented) {
	// module:
	//		dojo/dnd/Container
	// summary:
	//		TODOC


/*
	Container states:
		""		- normal state
		"Over"	- mouse over a container
	Container item states:
		""		- normal state
		"Over"	- mouse over a container item
*/

/*=====
dojo.declare("dojo.dnd.__ContainerArgs", [], {
	creator: function(){
		// summary:
		//		a creator function, which takes a data item, and returns an object like that:
		//		{node: newNode, data: usedData, type: arrayOfStrings}
	},

	// skipForm: Boolean
	//		don't start the drag operation, if clicked on form elements
	skipForm: false,

	// dropParent: Node||String
	//		node or node's id to use as the parent node for dropped items
	//		(must be underneath the 'node' parameter in the DOM)
	dropParent: null,

	// _skipStartup: Boolean
	//		skip startup(), which collects children, for deferred initialization
	//		(this is used in the markup mode)
	_skipStartup: false
});

dojo.dnd.Item = function(){
	// summary:
	//		Represents (one of) the source node(s) being dragged.
	//		Contains (at least) the "type" and "data" attributes.
	// type: String[]
	//		Type(s) of this item, by default this is ["text"]
	// data: Object
	//		Logical representation of the object being dragged.
	//		If the drag object's type is "text" then data is a String,
	//		if it's another type then data could be a different Object,
	//		perhaps a name/value hash.

	this.type = type;
	this.data = data;
}
=====*/

dojo.declare("dojo.dnd.Container", Evented, {
	// summary:
	//		a Container object, which knows when mouse hovers over it,
	//		and over which element it hovers

	// object attributes (for markup)
	skipForm: false,

	/*=====
	// current: DomNode
	//		The DOM node the mouse is currently hovered over
	current: null,

	// map: Hash<String, dojo.dnd.Item>
	//		Map from an item's id (which is also the DOMNode's id) to
	//		the dojo.dnd.Item itself.
	map: {},
	=====*/

	constructor: function(node, params){
		// summary:
		//		a constructor of the Container
		// node: Node
		//		node or node's id to build the container on
		// params: dojo.dnd.__ContainerArgs
		//		a dictionary of parameters
		this.node = dojo.byId(node);
		if(!params){ params = {}; }
		this.creator = params.creator || null;
		this.skipForm = params.skipForm;
		this.parent = params.dropParent && dojo.byId(params.dropParent);

		// class-specific variables
		this.map = {};
		this.current = null;

		// states
		this.containerState = "";
		dojo.addClass(this.node, "dojoDndContainer");

		// mark up children
		if(!(params && params._skipStartup)){
			this.startup();
		}

		// set up events
		this.events = [
			dojo.connect(this.node, "onmouseover", this, "onMouseOver"),
			dojo.connect(this.node, "onmouseout",  this, "onMouseOut"),
			// cancel text selection and text dragging
			dojo.connect(this.node, "ondragstart",   this, "onSelectStart"),
			dojo.connect(this.node, "onselectstart", this, "onSelectStart")
		];
	},

	// object attributes (for markup)
	creator: function(){
		// summary:
		//		creator function, dummy at the moment
	},

	// abstract access to the map
	getItem: function(/*String*/ key){
		// summary:
		//		returns a data item by its key (id)
		return this.map[key];	// dojo.dnd.Item
	},
	setItem: function(/*String*/ key, /*dojo.dnd.Item*/ data){
		// summary:
		//		associates a data item with its key (id)
		this.map[key] = data;
	},
	delItem: function(/*String*/ key){
		// summary:
		//		removes a data item from the map by its key (id)
		delete this.map[key];
	},
	forInItems: function(/*Function*/ f, /*Object?*/ o){
		// summary:
		//		iterates over a data map skipping members that
		//		are present in the empty object (IE and/or 3rd-party libraries).
		o = o || dojo.global;
		var m = this.map, e = dojo.dnd._empty;
		for(var i in m){
			if(i in e){ continue; }
			f.call(o, m[i], i, this);
		}
		return o;	// Object
	},
	clearItems: function(){
		// summary:
		//		removes all data items from the map
		this.map = {};
	},

	// methods
	getAllNodes: function(){
		// summary:
		//		returns a list (an array) of all valid child nodes
		return dojo.query("> .dojoDndItem", this.parent);	// NodeList
	},
	sync: function(){
		// summary:
		//		sync up the node list with the data map
		var map = {};
		this.getAllNodes().forEach(function(node){
			if(node.id){
				var item = this.getItem(node.id);
				if(item){
					map[node.id] = item;
					return;
				}
			}else{
				node.id = dojo.dnd.getUniqueId();
			}
			var type = node.getAttribute("dndType"),
				data = node.getAttribute("dndData");
			map[node.id] = {
				data: data || node.innerHTML,
				type: type ? type.split(/\s*,\s*/) : ["text"]
			};
		}, this);
		this.map = map;
		return this;	// self
	},
	insertNodes: function(data, before, anchor){
		// summary:
		//		inserts an array of new nodes before/after an anchor node
		// data: Array
		//		a list of data items, which should be processed by the creator function
		// before: Boolean
		//		insert before the anchor, if true, and after the anchor otherwise
		// anchor: Node
		//		the anchor node to be used as a point of insertion
		if(!this.parent.firstChild){
			anchor = null;
		}else if(before){
			if(!anchor){
				anchor = this.parent.firstChild;
			}
		}else{
			if(anchor){
				anchor = anchor.nextSibling;
			}
		}
		if(anchor){
			for(var i = 0; i < data.length; ++i){
				var t = this._normalizedCreator(data[i]);
				this.setItem(t.node.id, {data: t.data, type: t.type});
				this.parent.insertBefore(t.node, anchor);
			}
		}else{
			for(var i = 0; i < data.length; ++i){
				var t = this._normalizedCreator(data[i]);
				this.setItem(t.node.id, {data: t.data, type: t.type});
				this.parent.appendChild(t.node);
			}
		}
		return this;	// self
	},
	destroy: function(){
		// summary:
		//		prepares this object to be garbage-collected
		dojo.forEach(this.events, dojo.disconnect);
		this.clearItems();
		this.node = this.parent = this.current = null;
	},

	// markup methods
	markupFactory: function(params, node, ctor){
		params._skipStartup = true;
		return new ctor(node, params);
	},
	startup: function(){
		// summary:
		//		collects valid child items and populate the map

		// set up the real parent node
		if(!this.parent){
			// use the standard algorithm, if not assigned
			this.parent = this.node;
			if(this.parent.tagName.toLowerCase() == "table"){
				var c = this.parent.getElementsByTagName("tbody");
				if(c && c.length){ this.parent = c[0]; }
			}
		}
		this.defaultCreator = dojo.dnd._defaultCreator(this.parent);

		// process specially marked children
		this.sync();
	},

	// mouse events
	onMouseOver: function(e){
		// summary:
		//		event processor for onmouseover
		// e: Event
		//		mouse event
		var n = e.relatedTarget;
		while(n){
			if(n == this.node){ break; }
			try{
				n = n.parentNode;
			}catch(x){
				n = null;
			}
		}
		if(!n){
			this._changeState("Container", "Over");
			this.onOverEvent();
		}
		n = this._getChildByEvent(e);
		if(this.current == n){ return; }
		if(this.current){ this._removeItemClass(this.current, "Over"); }
		if(n){ this._addItemClass(n, "Over"); }
		this.current = n;
	},
	onMouseOut: function(e){
		// summary:
		//		event processor for onmouseout
		// e: Event
		//		mouse event
		for(var n = e.relatedTarget; n;){
			if(n == this.node){ return; }
			try{
				n = n.parentNode;
			}catch(x){
				n = null;
			}
		}
		if(this.current){
			this._removeItemClass(this.current, "Over");
			this.current = null;
		}
		this._changeState("Container", "");
		this.onOutEvent();
	},
	onSelectStart: function(e){
		// summary:
		//		event processor for onselectevent and ondragevent
		// e: Event
		//		mouse event
		if(!this.skipForm || !dojo.dnd.isFormElement(e)){
			dojo.stopEvent(e);
		}
	},

	// utilities
	onOverEvent: function(){
		// summary:
		//		this function is called once, when mouse is over our container
	},
	onOutEvent: function(){
		// summary:
		//		this function is called once, when mouse is out of our container
	},
	_changeState: function(type, newState){
		// summary:
		//		changes a named state to new state value
		// type: String
		//		a name of the state to change
		// newState: String
		//		new state
		var prefix = "dojoDnd" + type;
		var state  = type.toLowerCase() + "State";
		//dojo.replaceClass(this.node, prefix + newState, prefix + this[state]);
		dojo.replaceClass(this.node, prefix + newState, prefix + this[state]);
		this[state] = newState;
	},
	_addItemClass: function(node, type){
		// summary:
		//		adds a class with prefix "dojoDndItem"
		// node: Node
		//		a node
		// type: String
		//		a variable suffix for a class name
		dojo.addClass(node, "dojoDndItem" + type);
	},
	_removeItemClass: function(node, type){
		// summary:
		//		removes a class with prefix "dojoDndItem"
		// node: Node
		//		a node
		// type: String
		//		a variable suffix for a class name
		dojo.removeClass(node, "dojoDndItem" + type);
	},
	_getChildByEvent: function(e){
		// summary:
		//		gets a child, which is under the mouse at the moment, or null
		// e: Event
		//		a mouse event
		var node = e.target;
		if(node){
			for(var parent = node.parentNode; parent; node = parent, parent = node.parentNode){
				if(parent == this.parent && dojo.hasClass(node, "dojoDndItem")){ return node; }
			}
		}
		return null;
	},
	_normalizedCreator: function(/*dojo.dnd.Item*/ item, /*String*/ hint){
		// summary:
		//		adds all necessary data to the output of the user-supplied creator function
		var t = (this.creator || this.defaultCreator).call(this, item, hint);
		if(!dojo.isArray(t.type)){ t.type = ["text"]; }
		if(!t.node.id){ t.node.id = dojo.dnd.getUniqueId(); }
		dojo.addClass(t.node, "dojoDndItem");
		return t;
	}
});

dojo.dnd._createNode = function(tag){
	// summary:
	//		returns a function, which creates an element of given tag
	//		(SPAN by default) and sets its innerHTML to given text
	// tag: String
	//		a tag name or empty for SPAN
	if(!tag){ return dojo.dnd._createSpan; }
	return function(text){	// Function
		return dojo.create(tag, {innerHTML: text});	// Node
	};
};

dojo.dnd._createTrTd = function(text){
	// summary:
	//		creates a TR/TD structure with given text as an innerHTML of TD
	// text: String
	//		a text for TD
	var tr = dojo.create("tr");
	dojo.create("td", {innerHTML: text}, tr);
	return tr;	// Node
};

dojo.dnd._createSpan = function(text){
	// summary:
	//		creates a SPAN element with given text as its innerHTML
	// text: String
	//		a text for SPAN
	return dojo.create("span", {innerHTML: text});	// Node
};

// dojo.dnd._defaultCreatorNodes: Object
//		a dictionary that maps container tag names to child tag names
dojo.dnd._defaultCreatorNodes = {ul: "li", ol: "li", div: "div", p: "div"};

dojo.dnd._defaultCreator = function(node){
	// summary:
	//		takes a parent node, and returns an appropriate creator function
	// node: Node
	//		a container node
	var tag = node.tagName.toLowerCase();
	var c = tag == "tbody" || tag == "thead" ? dojo.dnd._createTrTd :
			dojo.dnd._createNode(dojo.dnd._defaultCreatorNodes[tag]);
	return function(item, hint){	// Function
		var isObj = item && dojo.isObject(item), data, type, n;
		if(isObj && item.tagName && item.nodeType && item.getAttribute){
			// process a DOM node
			data = item.getAttribute("dndData") || item.innerHTML;
			type = item.getAttribute("dndType");
			type = type ? type.split(/\s*,\s*/) : ["text"];
			n = item;	// this node is going to be moved rather than copied
		}else{
			// process a DnD item object or a string
			data = (isObj && item.data) ? item.data : item;
			type = (isObj && item.type) ? item.type : ["text"];
			n = (hint == "avatar" ? dojo.dnd._createSpan : c)(String(data));
		}
		if(!n.id){
			n.id = dojo.dnd.getUniqueId();
		}
		return {node: n, data: data, type: type};
	};
};

return dojo.dnd.Container;
});

},
'dojo/dnd/Manager':function(){
define("dojo/dnd/Manager", ["../main", "../Evented", "./common", "./autoscroll", "./Avatar"], function(dojo, Evented) {
	// module:
	//		dojo/dnd/Manager
	// summary:
	//		TODOC


var Manager = dojo.declare("dojo.dnd.Manager", [Evented], {
	// summary:
	//		the manager of DnD operations (usually a singleton)
	constructor: function(){
		this.avatar  = null;
		this.source = null;
		this.nodes = [];
		this.copy  = true;
		this.target = null;
		this.canDropFlag = false;
		this.events = [];
	},

	// avatar's offset from the mouse
	OFFSET_X: 16,
	OFFSET_Y: 16,

	// methods
	overSource: function(source){
		// summary:
		//		called when a source detected a mouse-over condition
		// source: Object
		//		the reporter
		if(this.avatar){
			this.target = (source && source.targetState != "Disabled") ? source : null;
			this.canDropFlag = Boolean(this.target);
			this.avatar.update();
		}
		dojo.publish("/dnd/source/over", [source]);
	},
	outSource: function(source){
		// summary:
		//		called when a source detected a mouse-out condition
		// source: Object
		//		the reporter
		if(this.avatar){
			if(this.target == source){
				this.target = null;
				this.canDropFlag = false;
				this.avatar.update();
				dojo.publish("/dnd/source/over", [null]);
			}
		}else{
			dojo.publish("/dnd/source/over", [null]);
		}
	},
	startDrag: function(source, nodes, copy){
		// summary:
		//		called to initiate the DnD operation
		// source: Object
		//		the source which provides items
		// nodes: Array
		//		the list of transferred items
		// copy: Boolean
		//		copy items, if true, move items otherwise
		this.source = source;
		this.nodes  = nodes;
		this.copy   = Boolean(copy); // normalizing to true boolean
		this.avatar = this.makeAvatar();
		dojo.body().appendChild(this.avatar.node);
		dojo.publish("/dnd/start", [source, nodes, this.copy]);
		this.events = [
			dojo.connect(dojo.doc, "onmousemove", this, "onMouseMove"),
			dojo.connect(dojo.doc, "onmouseup",   this, "onMouseUp"),
			dojo.connect(dojo.doc, "onkeydown",   this, "onKeyDown"),
			dojo.connect(dojo.doc, "onkeyup",     this, "onKeyUp"),
			// cancel text selection and text dragging
			dojo.connect(dojo.doc, "ondragstart",   dojo.stopEvent),
			dojo.connect(dojo.body(), "onselectstart", dojo.stopEvent)
		];
		var c = "dojoDnd" + (copy ? "Copy" : "Move");
		dojo.addClass(dojo.body(), c);
	},
	canDrop: function(flag){
		// summary:
		//		called to notify if the current target can accept items
		var canDropFlag = Boolean(this.target && flag);
		if(this.canDropFlag != canDropFlag){
			this.canDropFlag = canDropFlag;
			this.avatar.update();
		}
	},
	stopDrag: function(){
		// summary:
		//		stop the DnD in progress
		dojo.removeClass(dojo.body(), ["dojoDndCopy", "dojoDndMove"]);
		dojo.forEach(this.events, dojo.disconnect);
		this.events = [];
		this.avatar.destroy();
		this.avatar = null;
		this.source = this.target = null;
		this.nodes = [];
	},
	makeAvatar: function(){
		// summary:
		//		makes the avatar; it is separate to be overwritten dynamically, if needed
		return new dojo.dnd.Avatar(this);
	},
	updateAvatar: function(){
		// summary:
		//		updates the avatar; it is separate to be overwritten dynamically, if needed
		this.avatar.update();
	},

	// mouse event processors
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove
		// e: Event
		//		mouse event
		var a = this.avatar;
		if(a){
			dojo.dnd.autoScrollNodes(e);
			//dojo.dnd.autoScroll(e);
			var s = a.node.style;
			s.left = (e.pageX + this.OFFSET_X) + "px";
			s.top  = (e.pageY + this.OFFSET_Y) + "px";
			var copy = Boolean(this.source.copyState(dojo.isCopyKey(e)));
			if(this.copy != copy){
				this._setCopyStatus(copy);
			}
		}
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup
		// e: Event
		//		mouse event
		if(this.avatar){
			if(this.target && this.canDropFlag){
				var copy = Boolean(this.source.copyState(dojo.isCopyKey(e))),
				params = [this.source, this.nodes, copy, this.target, e];
				dojo.publish("/dnd/drop/before", params);
				dojo.publish("/dnd/drop", params);
			}else{
				dojo.publish("/dnd/cancel");
			}
			this.stopDrag();
		}
	},

	// keyboard event processors
	onKeyDown: function(e){
		// summary:
		//		event processor for onkeydown:
		//		watching for CTRL for copy/move status, watching for ESCAPE to cancel the drag
		// e: Event
		//		keyboard event
		if(this.avatar){
			switch(e.keyCode){
				case dojo.keys.CTRL:
					var copy = Boolean(this.source.copyState(true));
					if(this.copy != copy){
						this._setCopyStatus(copy);
					}
					break;
				case dojo.keys.ESCAPE:
					dojo.publish("/dnd/cancel");
					this.stopDrag();
					break;
			}
		}
	},
	onKeyUp: function(e){
		// summary:
		//		event processor for onkeyup, watching for CTRL for copy/move status
		// e: Event
		//		keyboard event
		if(this.avatar && e.keyCode == dojo.keys.CTRL){
			var copy = Boolean(this.source.copyState(false));
			if(this.copy != copy){
				this._setCopyStatus(copy);
			}
		}
	},

	// utilities
	_setCopyStatus: function(copy){
		// summary:
		//		changes the copy status
		// copy: Boolean
		//		the copy status
		this.copy = copy;
		this.source._markDndStatus(this.copy);
		this.updateAvatar();
		dojo.replaceClass(dojo.body(),
			"dojoDnd" + (this.copy ? "Copy" : "Move"),
			"dojoDnd" + (this.copy ? "Move" : "Copy"));
	}
});

// dojo.dnd._manager:
//		The manager singleton variable. Can be overwritten if needed.
dojo.dnd._manager = null;

Manager.manager = dojo.dnd.manager = function(){
	// summary:
	//		Returns the current DnD manager.  Creates one if it is not created yet.
	if(!dojo.dnd._manager){
		dojo.dnd._manager = new dojo.dnd.Manager();
	}
	return dojo.dnd._manager;	// Object
};

return Manager;
});

},
'dojo/dnd/Avatar':function(){
define("dojo/dnd/Avatar", ["../main", "./common"], function(dojo) {
	// module:
	//		dojo/dnd/Avatar
	// summary:
	//		TODOC


dojo.declare("dojo.dnd.Avatar", null, {
	// summary:
	//		Object that represents transferred DnD items visually
	// manager: Object
	//		a DnD manager object

	constructor: function(manager){
		this.manager = manager;
		this.construct();
	},

	// methods
	construct: function(){
		// summary:
		//		constructor function;
		//		it is separate so it can be (dynamically) overwritten in case of need
		this.isA11y = dojo.hasClass(dojo.body(),"dijit_a11y");
		var a = dojo.create("table", {
				"class": "dojoDndAvatar",
				style: {
					position: "absolute",
					zIndex:   "1999",
					margin:   "0px"
				}
			}),
			source = this.manager.source, node,
			b = dojo.create("tbody", null, a),
			tr = dojo.create("tr", null, b),
			td = dojo.create("td", null, tr),
			icon = this.isA11y ? dojo.create("span", {
						id : "a11yIcon",
						innerHTML : this.manager.copy ? '+' : "<"
					}, td) : null,
			span = dojo.create("span", {
				innerHTML: source.generateText ? this._generateText() : ""
			}, td),
			k = Math.min(5, this.manager.nodes.length), i = 0;
		// we have to set the opacity on IE only after the node is live
		dojo.attr(tr, {
			"class": "dojoDndAvatarHeader",
			style: {opacity: 0.9}
		});
		for(; i < k; ++i){
			if(source.creator){
				// create an avatar representation of the node
				node = source._normalizedCreator(source.getItem(this.manager.nodes[i].id).data, "avatar").node;
			}else{
				// or just clone the node and hope it works
				node = this.manager.nodes[i].cloneNode(true);
				if(node.tagName.toLowerCase() == "tr"){
					// insert extra table nodes
					var table = dojo.create("table"),
						tbody = dojo.create("tbody", null, table);
					tbody.appendChild(node);
					node = table;
				}
			}
			node.id = "";
			tr = dojo.create("tr", null, b);
			td = dojo.create("td", null, tr);
			td.appendChild(node);
			dojo.attr(tr, {
				"class": "dojoDndAvatarItem",
				style: {opacity: (9 - i) / 10}
			});
		}
		this.node = a;
	},
	destroy: function(){
		// summary:
		//		destructor for the avatar; called to remove all references so it can be garbage-collected
		dojo.destroy(this.node);
		this.node = false;
	},
	update: function(){
		// summary:
		//		updates the avatar to reflect the current DnD state
		dojo[(this.manager.canDropFlag ? "add" : "remove") + "Class"](this.node, "dojoDndAvatarCanDrop");
		if (this.isA11y){
			var icon = dojo.byId("a11yIcon");
			var text = '+';   // assume canDrop && copy
			if (this.manager.canDropFlag && !this.manager.copy) {
				text = '< '; // canDrop && move
			}else if (!this.manager.canDropFlag && !this.manager.copy) {
				text = "o"; //!canDrop && move
			}else if(!this.manager.canDropFlag){
				text = 'x';  // !canDrop && copy
			}
			icon.innerHTML=text;
		}
		// replace text
		dojo.query(("tr.dojoDndAvatarHeader td span" +(this.isA11y ? " span" : "")), this.node).forEach(
			function(node){
				node.innerHTML = this._generateText();
			}, this);
	},
	_generateText: function(){
		// summary: generates a proper text to reflect copying or moving of items
		return this.manager.nodes.length.toString();
	}
});

return dojo.dnd.Avatar;
});

},
'*noref':1}});
define("dojo/_dnd_basic", [], 1);
require(["dojo/dnd/common","dojo/dnd/Source","dojo/dnd/AutoSource","dojo/dnd/Target","dojo/dnd/Selector","dojo/dnd/Container","dojo/dnd/Manager","dojo/dnd/Avatar"]);

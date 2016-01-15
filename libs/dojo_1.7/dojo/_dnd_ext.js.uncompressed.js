require({cache:{
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
'dojo/dnd/TimedMoveable':function(){
define("dojo/dnd/TimedMoveable", ["../main", "./Moveable"], function(dojo) {
	// module:
	//		dojo/dnd/TimedMoveable
	// summary:
	//		TODOC

	/*=====
	dojo.declare("dojo.dnd.__TimedMoveableArgs", [dojo.dnd.__MoveableArgs], {
		// timeout: Number
		//		delay move by this number of ms,
		//		accumulating position changes during the timeout
		timeout: 0
	});
	=====*/

	// precalculate long expressions
	var oldOnMove = dojo.dnd.Moveable.prototype.onMove;

	dojo.declare("dojo.dnd.TimedMoveable", dojo.dnd.Moveable, {
		// summary:
		//		A specialized version of Moveable to support an FPS throttling.
		//		This class puts an upper restriction on FPS, which may reduce
		//		the CPU load. The additional parameter "timeout" regulates
		//		the delay before actually moving the moveable object.

		// object attributes (for markup)
		timeout: 40,	// in ms, 40ms corresponds to 25 fps

		constructor: function(node, params){
			// summary:
			//		an object that makes a node moveable with a timer
			// node: Node||String
			//		a node (or node's id) to be moved
			// params: dojo.dnd.__TimedMoveableArgs
			//		object with additional parameters.

			// sanitize parameters
			if(!params){ params = {}; }
			if(params.timeout && typeof params.timeout == "number" && params.timeout >= 0){
				this.timeout = params.timeout;
			}
		},

		onMoveStop: function(/* dojo.dnd.Mover */ mover){
			if(mover._timer){
				// stop timer
				clearTimeout(mover._timer);
				// reflect the last received position
				oldOnMove.call(this, mover, mover._leftTop)
			}
			dojo.dnd.Moveable.prototype.onMoveStop.apply(this, arguments);
		},
		onMove: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
			mover._leftTop = leftTop;
			if(!mover._timer){
				var _t = this;	// to avoid using dojo.hitch()
				mover._timer = setTimeout(function(){
					// we don't have any pending requests
					mover._timer = null;
					// reflect the last received position
					oldOnMove.call(_t, mover, mover._leftTop);
				}, this.timeout);
			}
		}
	});

	return dojo.dnd.TimedMoveable;
	
});

},
'dojo/dnd/Moveable':function(){
define("dojo/dnd/Moveable", ["../main", "../Evented", "../touch", "./Mover"], function(dojo, Evented, touch) {
	// module:
	//		dojo/dnd/Moveable
	// summary:
	//		TODOC


/*=====
dojo.declare("dojo.dnd.__MoveableArgs", [], {
	// handle: Node||String
	//		A node (or node's id), which is used as a mouse handle.
	//		If omitted, the node itself is used as a handle.
	handle: null,

	// delay: Number
	//		delay move by this number of pixels
	delay: 0,

	// skip: Boolean
	//		skip move of form elements
	skip: false,

	// mover: Object
	//		a constructor of custom Mover
	mover: dojo.dnd.Mover
});
=====*/

dojo.declare("dojo.dnd.Moveable", [Evented], {
	// object attributes (for markup)
	handle: "",
	delay: 0,
	skip: false,

	constructor: function(node, params){
		// summary:
		//		an object, which makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.__MoveableArgs?
		//		optional parameters
		this.node = dojo.byId(node);
		if(!params){ params = {}; }
		this.handle = params.handle ? dojo.byId(params.handle) : null;
		if(!this.handle){ this.handle = this.node; }
		this.delay = params.delay > 0 ? params.delay : 0;
		this.skip  = params.skip;
		this.mover = params.mover ? params.mover : dojo.dnd.Mover;
		this.events = [
			dojo.connect(this.handle, touch.press, this, "onMouseDown"),
			// cancel text selection and text dragging
			dojo.connect(this.handle, "ondragstart",   this, "onSelectStart"),
			dojo.connect(this.handle, "onselectstart", this, "onSelectStart")
		];
	},

	// markup methods
	markupFactory: function(params, node, ctor){
		return new ctor(node, params);
	},

	// methods
	destroy: function(){
		// summary:
		//		stops watching for possible move, deletes all references, so the object can be garbage-collected
		dojo.forEach(this.events, dojo.disconnect);
		this.events = this.node = this.handle = null;
	},

	// mouse event processors
	onMouseDown: function(e){
		// summary:
		//		event processor for onmousedown/ontouchstart, creates a Mover for the node
		// e: Event
		//		mouse/touch event
		if(this.skip && dojo.dnd.isFormElement(e)){ return; }
		if(this.delay){
			this.events.push(
				dojo.connect(this.handle, touch.move, this, "onMouseMove"),
				dojo.connect(this.handle, touch.release, this, "onMouseUp")
			);
			this._lastX = e.pageX;
			this._lastY = e.pageY;
		}else{
			this.onDragDetected(e);
		}
		dojo.stopEvent(e);
	},
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove/ontouchmove, used only for delayed drags
		// e: Event
		//		mouse/touch event
		if(Math.abs(e.pageX - this._lastX) > this.delay || Math.abs(e.pageY - this._lastY) > this.delay){
			this.onMouseUp(e);
			this.onDragDetected(e);
		}
		dojo.stopEvent(e);
	},
	onMouseUp: function(e){
		// summary:
		//		event processor for onmouseup, used only for delayed drags
		// e: Event
		//		mouse event
		for(var i = 0; i < 2; ++i){
			dojo.disconnect(this.events.pop());
		}
		dojo.stopEvent(e);
	},
	onSelectStart: function(e){
		// summary:
		//		event processor for onselectevent and ondragevent
		// e: Event
		//		mouse event
		if(!this.skip || !dojo.dnd.isFormElement(e)){
			dojo.stopEvent(e);
		}
	},

	// local events
	onDragDetected: function(/* Event */ e){
		// summary:
		//		called when the drag is detected;
		//		responsible for creation of the mover
		new this.mover(this.node, e, this);
	},
	onMoveStart: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called before every move operation
		dojo.publish("/dnd/move/start", [mover]);
		dojo.addClass(dojo.body(), "dojoMove");
		dojo.addClass(this.node, "dojoMoveItem");
	},
	onMoveStop: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called after every move operation
		dojo.publish("/dnd/move/stop", [mover]);
		dojo.removeClass(dojo.body(), "dojoMove");
		dojo.removeClass(this.node, "dojoMoveItem");
	},
	onFirstMove: function(/* dojo.dnd.Mover */ mover, /* Event */ e){
		// summary:
		//		called during the very first move notification;
		//		can be used to initialize coordinates, can be overwritten.

		// default implementation does nothing
	},
	onMove: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop, /* Event */ e){
		// summary:
		//		called during every move notification;
		//		should actually move the node; can be overwritten.
		this.onMoving(mover, leftTop);
		var s = mover.node.style;
		s.left = leftTop.l + "px";
		s.top  = leftTop.t + "px";
		this.onMoved(mover, leftTop);
	},
	onMoving: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called before every incremental move; can be overwritten.

		// default implementation does nothing
	},
	onMoved: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called after every incremental move; can be overwritten.

		// default implementation does nothing
	}
});

return dojo.dnd.Moveable;
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
'dojo/dnd/Mover':function(){
define("dojo/dnd/Mover", ["../main", "../Evented", "../touch", "./common", "./autoscroll"], function(dojo, Evented, touch) {
	// module:
	//		dojo/dnd/Mover
	// summary:
	//		TODOC


dojo.declare("dojo.dnd.Mover", [Evented], {
	constructor: function(node, e, host){
		// summary:
		//		an object which makes a node follow the mouse, or touch-drag on touch devices.
		//		Used as a default mover, and as a base class for custom movers.
		// node: Node
		//		a node (or node's id) to be moved
		// e: Event
		//		a mouse event, which started the move;
		//		only pageX and pageY properties are used
		// host: Object?
		//		object which implements the functionality of the move,
		//	 	and defines proper events (onMoveStart and onMoveStop)
		this.node = dojo.byId(node);
		this.marginBox = {l: e.pageX, t: e.pageY};
		this.mouseButton = e.button;
		var h = (this.host = host), d = node.ownerDocument;
		this.events = [
			// At the start of a drag, onFirstMove is called, and then the following two
			// connects are disconnected
			dojo.connect(d, touch.move, this, "onFirstMove"),

			// These are called continually during the drag
			dojo.connect(d, touch.move, this, "onMouseMove"),

			// And these are called at the end of the drag
			dojo.connect(d, touch.release,   this, "onMouseUp"),

			// cancel text selection and text dragging
			dojo.connect(d, "ondragstart",   dojo.stopEvent),
			dojo.connect(d.body, "onselectstart", dojo.stopEvent)
		];
		// notify that the move has started
		if(h && h.onMoveStart){
			h.onMoveStart(this);
		}
	},
	// mouse event processors
	onMouseMove: function(e){
		// summary:
		//		event processor for onmousemove/ontouchmove
		// e: Event
		//		mouse/touch event
		dojo.dnd.autoScroll(e);
		var m = this.marginBox;
		this.host.onMove(this, {l: m.l + e.pageX, t: m.t + e.pageY}, e);
		dojo.stopEvent(e);
	},
	onMouseUp: function(e){
		if(dojo.isWebKit && dojo.isMac && this.mouseButton == 2 ?
				e.button == 0 : this.mouseButton == e.button){ // TODO Should condition be met for touch devices, too?
			this.destroy();
		}
		dojo.stopEvent(e);
	},
	// utilities
	onFirstMove: function(e){
		// summary:
		//		makes the node absolute; it is meant to be called only once.
		// 		relative and absolutely positioned nodes are assumed to use pixel units
		var s = this.node.style, l, t, h = this.host;
		switch(s.position){
			case "relative":
			case "absolute":
				// assume that left and top values are in pixels already
				l = Math.round(parseFloat(s.left)) || 0;
				t = Math.round(parseFloat(s.top)) || 0;
				break;
			default:
				s.position = "absolute";	// enforcing the absolute mode
				var m = dojo.marginBox(this.node);
				// event.pageX/pageY (which we used to generate the initial
				// margin box) includes padding and margin set on the body.
				// However, setting the node's position to absolute and then
				// doing dojo.marginBox on it *doesn't* take that additional
				// space into account - so we need to subtract the combined
				// padding and margin.  We use getComputedStyle and
				// _getMarginBox/_getContentBox to avoid the extra lookup of
				// the computed style.
				var b = dojo.doc.body;
				var bs = dojo.getComputedStyle(b);
				var bm = dojo._getMarginBox(b, bs);
				var bc = dojo._getContentBox(b, bs);
				l = m.l - (bc.l - bm.l);
				t = m.t - (bc.t - bm.t);
				break;
		}
		this.marginBox.l = l - this.marginBox.l;
		this.marginBox.t = t - this.marginBox.t;
		if(h && h.onFirstMove){
			h.onFirstMove(this, e);
		}

		// Disconnect onmousemove and ontouchmove events that call this function
		dojo.disconnect(this.events.shift());
	},
	destroy: function(){
		// summary:
		//		stops the move, deletes all references, so the object can be garbage-collected
		dojo.forEach(this.events, dojo.disconnect);
		// undo global settings
		var h = this.host;
		if(h && h.onMoveStop){
			h.onMoveStop(this);
		}
		// destroy objects
		this.events = this.node = this.host = null;
	}
});

return dojo.dnd.Mover;
});

},
'dojo/dnd/move':function(){
define("dojo/dnd/move", ["../main", "./Mover", "./Moveable"], function(dojo) {
	// module:
	//		dojo/dnd/move
	// summary:
	//		TODOC


/*=====
dojo.declare("dojo.dnd.move.__constrainedMoveableArgs", [dojo.dnd.__MoveableArgs], {
	// constraints: Function
	//		Calculates a constraint box.
	//		It is called in a context of the moveable object.
	constraints: function(){},

	// within: Boolean
	//		restrict move within boundaries.
	within: false
});
=====*/

dojo.declare("dojo.dnd.move.constrainedMoveable", dojo.dnd.Moveable, {
	// object attributes (for markup)
	constraints: function(){},
	within: false,

	constructor: function(node, params){
		// summary:
		//		an object that makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.move.__constrainedMoveableArgs?
		//		an optional object with additional parameters;
		//		the rest is passed to the base class
		if(!params){ params = {}; }
		this.constraints = params.constraints;
		this.within = params.within;
	},
	onFirstMove: function(/* dojo.dnd.Mover */ mover){
		// summary:
		//		called during the very first move notification;
		//		can be used to initialize coordinates, can be overwritten.
		var c = this.constraintBox = this.constraints.call(this, mover);
		c.r = c.l + c.w;
		c.b = c.t + c.h;
		if(this.within){
			var mb = dojo._getMarginSize(mover.node);
			c.r -= mb.w;
			c.b -= mb.h;
		}
	},
	onMove: function(/* dojo.dnd.Mover */ mover, /* Object */ leftTop){
		// summary:
		//		called during every move notification;
		//		should actually move the node; can be overwritten.
		var c = this.constraintBox, s = mover.node.style;
		this.onMoving(mover, leftTop);
		leftTop.l = leftTop.l < c.l ? c.l : c.r < leftTop.l ? c.r : leftTop.l;
		leftTop.t = leftTop.t < c.t ? c.t : c.b < leftTop.t ? c.b : leftTop.t;
		s.left = leftTop.l + "px";
		s.top  = leftTop.t + "px";
		this.onMoved(mover, leftTop);
	}
});

/*=====
dojo.declare("dojo.dnd.move.__boxConstrainedMoveableArgs", [dojo.dnd.move.__constrainedMoveableArgs], {
	// box: Object
	//		a constraint box
	box: {}
});
=====*/

dojo.declare("dojo.dnd.move.boxConstrainedMoveable", dojo.dnd.move.constrainedMoveable, {
	// box:
	//		object attributes (for markup)
	box: {},

	constructor: function(node, params){
		// summary:
		//		an object, which makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.move.__boxConstrainedMoveableArgs?
		//		an optional object with parameters
		var box = params && params.box;
		this.constraints = function(){ return box; };
	}
});

/*=====
dojo.declare("dojo.dnd.move.__parentConstrainedMoveableArgs", [dojo.dnd.move.__constrainedMoveableArgs], {
	// area: String
	//		A parent's area to restrict the move.
	//		Can be "margin", "border", "padding", or "content".
	area: ""
});
=====*/

dojo.declare("dojo.dnd.move.parentConstrainedMoveable", dojo.dnd.move.constrainedMoveable, {
	// area:
	//		object attributes (for markup)
	area: "content",

	constructor: function(node, params){
		// summary:
		//		an object, which makes a node moveable
		// node: Node
		//		a node (or node's id) to be moved
		// params: dojo.dnd.move.__parentConstrainedMoveableArgs?
		//		an optional object with parameters
		var area = params && params.area;
		this.constraints = function(){
			var n = this.node.parentNode,
				s = dojo.getComputedStyle(n),
				mb = dojo._getMarginBox(n, s);
			if(area == "margin"){
				return mb;	// Object
			}
			var t = dojo._getMarginExtents(n, s);
			mb.l += t.l, mb.t += t.t, mb.w -= t.w, mb.h -= t.h;
			if(area == "border"){
				return mb;	// Object
			}
			t = dojo._getBorderExtents(n, s);
			mb.l += t.l, mb.t += t.t, mb.w -= t.w, mb.h -= t.h;
			if(area == "padding"){
				return mb;	// Object
			}
			t = dojo._getPadExtents(n, s);
			mb.l += t.l, mb.t += t.t, mb.w -= t.w, mb.h -= t.h;
			return mb;	// Object
		};
	}
});

// patching functions one level up for compatibility

dojo.dnd.constrainedMover = dojo.dnd.move.constrainedMover;
dojo.dnd.boxConstrainedMover = dojo.dnd.move.boxConstrainedMover;
dojo.dnd.parentConstrainedMover = dojo.dnd.move.parentConstrainedMover;

return dojo.dnd.move;
});

},
'*noref':1}});
define("dojo/_dnd_ext", [], 1);
require(["dojo/dnd/move","dojo/dnd/autoscroll","dojo/dnd/Mover","dojo/dnd/Moveable","dojo/dnd/TimedMoveable"]);

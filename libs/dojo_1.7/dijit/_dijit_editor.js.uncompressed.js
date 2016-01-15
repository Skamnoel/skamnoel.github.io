require({cache:{
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
'dijit/Editor':function(){
define("dijit/Editor", [
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred", // Deferred
	"dojo/i18n", // i18n.getLocalization
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-class", // domClass.add
	"dojo/dom-geometry",
	"dojo/dom-style", // domStyle.set, get
	"dojo/_base/event", // event.stop
	"dojo/keys", // keys.F1 keys.F15 keys.TAB
	"dojo/_base/lang", // lang.getObject lang.hitch
	"dojo/_base/sniff", // has("ie") has("mac") has("webkit")
	"dojo/string", // string.substitute
	"dojo/topic", // topic.publish()
	"dojo/_base/window", // win.withGlobal
	"./_base/focus",	// dijit.getBookmark()
	"./_Container",
	"./Toolbar",
	"./ToolbarSeparator",
	"./layout/_LayoutWidget",
	"./form/ToggleButton",
	"./_editor/_Plugin",
	"./_editor/plugins/EnterKeyHandling",
	"./_editor/html",
	"./_editor/range",
	"./_editor/RichText",
	".",	// dijit._scopeName
	"dojo/i18n!./_editor/nls/commands"
], function(array, declare, Deferred, i18n, domAttr, domClass, domGeometry, domStyle,
			event, keys, lang, has, string, topic, win,
			focusBase, _Container, Toolbar, ToolbarSeparator, _LayoutWidget, ToggleButton,
			_Plugin, EnterKeyHandling, html, rangeapi, RichText, dijit){

	// module:
	//		dijit/Editor
	// summary:
	//		A rich text Editing widget

	var Editor = declare("dijit.Editor", RichText, {
		// summary:
		//		A rich text Editing widget
		//
		// description:
		//		This widget provides basic WYSIWYG editing features, based on the browser's
		//		underlying rich text editing capability, accompanied by a toolbar (`dijit.Toolbar`).
		//		A plugin model is available to extend the editor's capabilities as well as the
		//		the options available in the toolbar.  Content generation may vary across
		//		browsers, and clipboard operations may have different results, to name
		//		a few limitations.  Note: this widget should not be used with the HTML
		//		&lt;TEXTAREA&gt; tag -- see dijit._editor.RichText for details.

		// plugins: [const] Object[]
		//		A list of plugin names (as strings) or instances (as objects)
		//		for this widget.
		//
		//		When declared in markup, it might look like:
		//	|	plugins="['bold',{name:'dijit._editor.plugins.FontChoice', command:'fontName', generic:true}]"
		plugins: null,

		// extraPlugins: [const] Object[]
		//		A list of extra plugin names which will be appended to plugins array
		extraPlugins: null,

		constructor: function(){
			// summary:
			//		Runs on widget initialization to setup arrays etc.
			// tags:
			//		private

			if(!lang.isArray(this.plugins)){
				this.plugins=["undo","redo","|","cut","copy","paste","|","bold","italic","underline","strikethrough","|",
				"insertOrderedList","insertUnorderedList","indent","outdent","|","justifyLeft","justifyRight","justifyCenter","justifyFull",
				EnterKeyHandling /*, "createLink"*/];
			}

			this._plugins=[];
			this._editInterval = this.editActionInterval * 1000;

			//IE will always lose focus when other element gets focus, while for FF and safari,
			//when no iframe is used, focus will be lost whenever another element gets focus.
			//For IE, we can connect to onBeforeDeactivate, which will be called right before
			//the focus is lost, so we can obtain the selected range. For other browsers,
			//no equivalent of onBeforeDeactivate, so we need to do two things to make sure
			//selection is properly saved before focus is lost: 1) when user clicks another
			//element in the page, in which case we listen to mousedown on the entire page and
			//see whether user clicks out of a focus editor, if so, save selection (focus will
			//only lost after onmousedown event is fired, so we can obtain correct caret pos.)
			//2) when user tabs away from the editor, which is handled in onKeyDown below.
			if(has("ie") || has("trident")){
				this.events.push("onBeforeDeactivate");
				this.events.push("onBeforeActivate");
			}
		},

		postMixInProperties: function(){
			// summary:
			//	Extension to make sure a deferred is in place before certain functions
			//	execute, like making sure all the plugins are properly inserted.

			// Set up a deferred so that the value isn't applied to the editor
			// until all the plugins load, needed to avoid timing condition
			// reported in #10537.
			this.setValueDeferred = new Deferred();
			this.inherited(arguments);
		},

		postCreate: function(){
			//for custom undo/redo, if enabled.
			this._steps=this._steps.slice(0);
			this._undoedSteps=this._undoedSteps.slice(0);

			if(lang.isArray(this.extraPlugins)){
				this.plugins=this.plugins.concat(this.extraPlugins);
			}

			this.inherited(arguments);

			this.commands = i18n.getLocalization("dijit._editor", "commands", this.lang);

			if(!this.toolbar){
				// if we haven't been assigned a toolbar, create one
				this.toolbar = new Toolbar({
					dir: this.dir,
					lang: this.lang
				});
				this.header.appendChild(this.toolbar.domNode);
			}

			array.forEach(this.plugins, this.addPlugin, this);

			// Okay, denote the value can now be set.
			this.setValueDeferred.callback(true);

			domClass.add(this.iframe.parentNode, "dijitEditorIFrameContainer");
			domClass.add(this.iframe, "dijitEditorIFrame");
			domAttr.set(this.iframe, "allowTransparency", true);

			if(has("webkit")){
				// Disable selecting the entire editor by inadvertent double-clicks.
				// on buttons, title bar, etc.  Otherwise clicking too fast on
				// a button such as undo/redo selects the entire editor.
				domStyle.set(this.domNode, "KhtmlUserSelect", "none");
			}
			this.toolbar.startup();
			this.onNormalizedDisplayChanged(); //update toolbar button status
		},
		destroy: function(){
			array.forEach(this._plugins, function(p){
				if(p && p.destroy){
					p.destroy();
				}
			});
			this._plugins=[];
			this.toolbar.destroyRecursive();
			delete this.toolbar;
			this.inherited(arguments);
		},
		addPlugin: function(/*String||Object||Function*/plugin, /*Integer?*/index){
			// summary:
			//		takes a plugin name as a string or a plugin instance and
			//		adds it to the toolbar and associates it with this editor
			//		instance. The resulting plugin is added to the Editor's
			//		plugins array. If index is passed, it's placed in the plugins
			//		array at that index. No big magic, but a nice helper for
			//		passing in plugin names via markup.
			//
			// plugin: String, args object, plugin instance, or plugin constructor
			//
			// args:
			//		This object will be passed to the plugin constructor
			//
			// index: Integer
			//		Used when creating an instance from
			//		something already in this.plugins. Ensures that the new
			//		instance is assigned to this.plugins at that index.
			var args=lang.isString(plugin)?{name:plugin}:lang.isFunction(plugin)?{ctor:plugin}:plugin;
			if(!args.setEditor){
				var o={"args":args,"plugin":null,"editor":this};
				if(args.name){
					// search registry for a plugin factory matching args.name, if it's not there then
					// fallback to 1.0 API:
					// ask all loaded plugin modules to fill in o.plugin if they can (ie, if they implement args.name)
					// remove fallback for 2.0.
					if(_Plugin.registry[args.name]){
						o.plugin = _Plugin.registry[args.name](args);
					}else{
						topic.publish(dijit._scopeName + ".Editor.getPlugin", o);	// publish
					}
				}
				if(!o.plugin){
					var pc = args.ctor || lang.getObject(args.name);
					if(pc){
						o.plugin=new pc(args);
					}
				}
				if(!o.plugin){
					console.warn('Cannot find plugin',plugin);
					return;
				}
				plugin=o.plugin;
			}
			if(arguments.length > 1){
				this._plugins[index] = plugin;
			}else{
				this._plugins.push(plugin);
			}
			plugin.setEditor(this);
			if(lang.isFunction(plugin.setToolbar)){
				plugin.setToolbar(this.toolbar);
			}
		},

		//the following 2 functions are required to make the editor play nice under a layout widget, see #4070

		resize: function(size){
			// summary:
			//		Resize the editor to the specified size, see `dijit.layout._LayoutWidget.resize`
			if(size){
				// we've been given a height/width for the entire editor (toolbar + contents), calls layout()
				// to split the allocated size between the toolbar and the contents
				_LayoutWidget.prototype.resize.apply(this, arguments);
			}
			/*
			else{
				// do nothing, the editor is already laid out correctly.   The user has probably specified
				// the height parameter, which was used to set a size on the iframe
			}
			*/
		},
		layout: function(){
			// summary:
			//		Called from `dijit.layout._LayoutWidget.resize`.  This shouldn't be called directly
			// tags:
			//		protected

			// Converts the iframe (or rather the <div> surrounding it) to take all the available space
			// except what's needed for the header (toolbars) and footer (breadcrumbs, etc).
			// A class was added to the iframe container and some themes style it, so we have to
			// calc off the added margins and padding too. See tracker: #10662
			var areaHeight = (this._contentBox.h -
				(this.getHeaderHeight() + this.getFooterHeight() +
				 domGeometry.getPadBorderExtents(this.iframe.parentNode).h +
				 domGeometry.getMarginExtents(this.iframe.parentNode).h));
			this.editingArea.style.height = areaHeight + "px";
			if(this.iframe){
				this.iframe.style.height="100%";
			}
			this._layoutMode = true;
		},

		_onIEMouseDown: function(/*Event*/ e){
			// summary:
			//		IE only to prevent 2 clicks to focus
			// tags:
			//		private
			var outsideClientArea;
			// IE 8's componentFromPoint is broken, which is a shame since it
			// was smaller code, but oh well.  We have to do this brute force
			// to detect if the click was scroller or not.
			var b = this.document.body;
			var clientWidth = b.clientWidth;
			var clientHeight = b.clientHeight;
			var clientLeft = b.clientLeft;
			var offsetWidth = b.offsetWidth;
			var offsetHeight = b.offsetHeight;
			var offsetLeft = b.offsetLeft;

			//Check for vertical scroller click.
			if(/^rtl$/i.test(b.dir || "")){
				if(clientWidth < offsetWidth && e.x > clientWidth && e.x < offsetWidth){
					// Check the click was between width and offset width, if so, scroller
					outsideClientArea = true;
				}
			}else{
				// RTL mode, we have to go by the left offsets.
				if(e.x < clientLeft && e.x > offsetLeft){
					// Check the click was between width and offset width, if so, scroller
					outsideClientArea = true;
				}
			}
			if(!outsideClientArea){
				// Okay, might be horiz scroller, check that.
				if(clientHeight < offsetHeight && e.y > clientHeight && e.y < offsetHeight){
					// Horizontal scroller.
					outsideClientArea = true;
				}
			}
			if(!outsideClientArea){
				delete this._cursorToStart; // Remove the force to cursor to start position.
				delete this._savedSelection; // new mouse position overrides old selection
				if(e.target.tagName == "BODY"){
					setTimeout(lang.hitch(this, "placeCursorAtEnd"), 0);
				}
				this.inherited(arguments);
			}
		},
		onBeforeActivate: function(){
			this._restoreSelection();
		},
		onBeforeDeactivate: function(e){
			// summary:
			//		Called on IE right before focus is lost.   Saves the selected range.
			// tags:
			//		private
			if(this.customUndo){
				this.endEditing(true);
			}
			//in IE, the selection will be lost when other elements get focus,
			//let's save focus before the editor is deactivated
			if(e.target.tagName != "BODY"){
				this._saveSelection();
			}
			//console.log('onBeforeDeactivate',this);
		},

		/* beginning of custom undo/redo support */

		// customUndo: Boolean
		//		Whether we shall use custom undo/redo support instead of the native
		//		browser support. By default, we now use custom undo.  It works better
		//		than native browser support and provides a consistent behavior across
		//		browsers with a minimal performance hit.  We already had the hit on
		//		the slowest browser, IE, anyway.
		customUndo: true,

		// editActionInterval: Integer
		//		When using customUndo, not every keystroke will be saved as a step.
		//		Instead typing (including delete) will be grouped together: after
		//		a user stops typing for editActionInterval seconds, a step will be
		//		saved; if a user resume typing within editActionInterval seconds,
		//		the timeout will be restarted. By default, editActionInterval is 3
		//		seconds.
		editActionInterval: 3,

		beginEditing: function(cmd){
			// summary:
			//		Called to note that the user has started typing alphanumeric characters, if it's not already noted.
			//		Deals with saving undo; see editActionInterval parameter.
			// tags:
			//		private
			if(!this._inEditing){
				this._inEditing=true;
				this._beginEditing(cmd);
			}
			if(this.editActionInterval>0){
				if(this._editTimer){
					clearTimeout(this._editTimer);
				}
				this._editTimer = setTimeout(lang.hitch(this, this.endEditing), this._editInterval);
			}
		},

		// TODO: declaring these in the prototype is meaningless, just create in the constructor/postCreate
		_steps:[],
		_undoedSteps:[],

		execCommand: function(cmd){
			// summary:
			//		Main handler for executing any commands to the editor, like paste, bold, etc.
			//      Called by plugins, but not meant to be called by end users.
			// tags:
			//		protected
			if(this.customUndo && (cmd == 'undo' || cmd == 'redo')){
				return this[cmd]();
			}else{
				if(this.customUndo){
					this.endEditing();
					this._beginEditing();
				}
				var r = this.inherited(arguments);
				if(this.customUndo){
					this._endEditing();
				}
				return r;
			}
		},

		_pasteImpl: function(){
			// summary:
			//		Over-ride of paste command control to make execCommand cleaner
			// tags:
			//		Protected
			return this._clipboardCommand("paste");
		},

		_cutImpl: function(){
			// summary:
			//		Over-ride of cut command control to make execCommand cleaner
			// tags:
			//		Protected
			return this._clipboardCommand("cut");
		},

		_copyImpl: function(){
			// summary:
			//		Over-ride of copy command control to make execCommand cleaner
			// tags:
			//		Protected
			return this._clipboardCommand("copy");
		},

		_clipboardCommand: function(cmd){
			// summary:
			//		Function to handle processing clipboard commands (or at least try to).
			// tags:
			//		Private
			var r;
			try{
				// Try to exec the superclass exec-command and see if it works.
				r = this.document.execCommand(cmd, false, null);
				if(has("webkit") && !r){ //see #4598: webkit does not guarantee clipboard support from js
					throw { code: 1011 }; // throw an object like Mozilla's error
				}
			}catch(e){
				//TODO: when else might we get an exception?  Do we need the Mozilla test below?
				if(e.code == 1011 /* Mozilla: service denied */){
					// Warn user of platform limitation.  Cannot programmatically access clipboard. See ticket #4136
					var sub = string.substitute,
						accel = {cut:'X', copy:'C', paste:'V'};
					alert(sub(this.commands.systemShortcut,
						[this.commands[cmd], sub(this.commands[has("mac") ? 'appleKey' : 'ctrlKey'], [accel[cmd]])]));
				}
				r = false;
			}
			return r;
		},

		queryCommandEnabled: function(cmd){
			// summary:
			//		Returns true if specified editor command is enabled.
			//      Used by the plugins to know when to highlight/not highlight buttons.
			// tags:
			//		protected
			if(this.customUndo && (cmd == 'undo' || cmd == 'redo')){
				return cmd == 'undo' ? (this._steps.length > 1) : (this._undoedSteps.length > 0);
			}else{
				return this.inherited(arguments);
			}
		},
		_moveToBookmark: function(b){
			// summary:
			//		Selects the text specified in bookmark b
			// tags:
			//		private
			var bookmark = b.mark;
			var mark = b.mark;
			var col = b.isCollapsed;
			var r, sNode, eNode, sel;
			if(mark){
				if(has("ie") < 9){
					if(lang.isArray(mark)){
						//IE CONTROL, have to use the native bookmark.
						bookmark = [];
						array.forEach(mark,function(n){
							bookmark.push(rangeapi.getNode(n,this.editNode));
						},this);
						win.withGlobal(this.window,'moveToBookmark',dijit,[{mark: bookmark, isCollapsed: col}]);
					}else{
						if(mark.startContainer && mark.endContainer){
							// Use the pseudo WC3 range API.  This works better for positions
							// than the IE native bookmark code.
							sel = rangeapi.getSelection(this.window);
							if(sel && sel.removeAllRanges){
								sel.removeAllRanges();
								r = rangeapi.create(this.window);
								sNode = rangeapi.getNode(mark.startContainer,this.editNode);
								eNode = rangeapi.getNode(mark.endContainer,this.editNode);
								if(sNode && eNode){
									// Okay, we believe we found the position, so add it into the selection
									// There are cases where it may not be found, particularly in undo/redo, when
									// IE changes the underlying DOM on us (wraps text in a <p> tag or similar.
									// So, in those cases, don't bother restoring selection.
									r.setStart(sNode,mark.startOffset);
									r.setEnd(eNode,mark.endOffset);
									sel.addRange(r);
								}
							}
						}
					}
				}else{//w3c range
					sel = rangeapi.getSelection(this.window);
					if(sel && sel.removeAllRanges){
						sel.removeAllRanges();
						r = rangeapi.create(this.window);
						sNode = rangeapi.getNode(mark.startContainer,this.editNode);
						eNode = rangeapi.getNode(mark.endContainer,this.editNode);
						if(sNode && eNode){
							// Okay, we believe we found the position, so add it into the selection
							// There are cases where it may not be found, particularly in undo/redo, when
							// formatting as been done and so on, so don't restore selection then.
							r.setStart(sNode,mark.startOffset);
							r.setEnd(eNode,mark.endOffset);
							sel.addRange(r);
						}
					}
				}
			}
		},
		_changeToStep: function(from, to){
			// summary:
			//		Reverts editor to "to" setting, from the undo stack.
			// tags:
			//		private
			this.setValue(to.text);
			var b=to.bookmark;
			if(!b){ return; }
			this._moveToBookmark(b);
		},
		undo: function(){
			// summary:
			//		Handler for editor undo (ex: ctrl-z) operation
			// tags:
			//		private
			//console.log('undo');
			var ret = false;
			if(!this._undoRedoActive){
				this._undoRedoActive = true;
				this.endEditing(true);
				var s=this._steps.pop();
				if(s && this._steps.length>0){
					this.focus();
					this._changeToStep(s,this._steps[this._steps.length-1]);
					this._undoedSteps.push(s);
					this.onDisplayChanged();
					delete this._undoRedoActive;
					ret = true;
				}
				delete this._undoRedoActive;
			}
			return ret;
		},
		redo: function(){
			// summary:
			//		Handler for editor redo (ex: ctrl-y) operation
			// tags:
			//		private
			//console.log('redo');
			var ret = false;
			if(!this._undoRedoActive){
				this._undoRedoActive = true;
				this.endEditing(true);
				var s=this._undoedSteps.pop();
				if(s && this._steps.length>0){
					this.focus();
					this._changeToStep(this._steps[this._steps.length-1],s);
					this._steps.push(s);
					this.onDisplayChanged();
					ret = true;
				}
				delete this._undoRedoActive;
			}
			return ret;
		},
		endEditing: function(ignore_caret){
			// summary:
			//		Called to note that the user has stopped typing alphanumeric characters, if it's not already noted.
			//		Deals with saving undo; see editActionInterval parameter.
			// tags:
			//		private
			if(this._editTimer){
				clearTimeout(this._editTimer);
			}
			if(this._inEditing){
				this._endEditing(ignore_caret);
				this._inEditing=false;
			}
		},

		_getBookmark: function(){
			// summary:
			//		Get the currently selected text
			// tags:
			//		protected
			var b=win.withGlobal(this.window,focusBase.getBookmark);
			var tmp=[];
			if(b && b.mark){
				var mark = b.mark;
				if(has("ie") < 9){
					// Try to use the pseudo range API on IE for better accuracy.
					var sel = rangeapi.getSelection(this.window);
					if(!lang.isArray(mark)){
						if(sel){
							var range;
							if(sel.rangeCount){
								range = sel.getRangeAt(0);
							}
							if(range){
								b.mark = range.cloneRange();
							}else{
								b.mark = win.withGlobal(this.window,focusBase.getBookmark);
							}
						}
					}else{
						// Control ranges (img, table, etc), handle differently.
						array.forEach(b.mark,function(n){
							tmp.push(rangeapi.getIndex(n,this.editNode).o);
						},this);
						b.mark = tmp;
					}
				}
				try{
					if(b.mark && b.mark.startContainer){
						tmp=rangeapi.getIndex(b.mark.startContainer,this.editNode).o;
						b.mark={startContainer:tmp,
							startOffset:b.mark.startOffset,
							endContainer:b.mark.endContainer===b.mark.startContainer?tmp:rangeapi.getIndex(b.mark.endContainer,this.editNode).o,
							endOffset:b.mark.endOffset};
					}
				}catch(e){
					b.mark = null;
				}
			}
			return b;
		},
		_beginEditing: function(){
			// summary:
			//		Called when the user starts typing alphanumeric characters.
			//		Deals with saving undo; see editActionInterval parameter.
			// tags:
			//		private
			if(this._steps.length === 0){
				// You want to use the editor content without post filtering
				// to make sure selection restores right for the 'initial' state.
				// and undo is called.  So not using this.value, as it was 'processed'
				// and the line-up for selections may have been altered.
				this._steps.push({'text':html.getChildrenHtml(this.editNode),'bookmark':this._getBookmark()});
			}
		},
		_endEditing: function(){
			// summary:
			//		Called when the user stops typing alphanumeric characters.
			//		Deals with saving undo; see editActionInterval parameter.
			// tags:
			//		private
			// Avoid filtering to make sure selections restore.
			var v = html.getChildrenHtml(this.editNode);

			this._undoedSteps=[];//clear undoed steps
			this._steps.push({text: v, bookmark: this._getBookmark()});
		},
		onKeyDown: function(e){
			// summary:
			//		Handler for onkeydown event.
			// tags:
			//		private

			//We need to save selection if the user TAB away from this editor
			//no need to call _saveSelection for IE, as that will be taken care of in onBeforeDeactivate
			if(!has("ie") && !this.iframe && e.keyCode == keys.TAB && !this.tabIndent){
				this._saveSelection();
			}
			if(!this.customUndo){
				this.inherited(arguments);
				return;
			}
			var k = e.keyCode;
			if(e.ctrlKey && !e.altKey){//undo and redo only if the special right Alt + z/y are not pressed #5892
				if(k == 90 || k == 122){ //z
					event.stop(e);
					this.undo();
					return;
				}else if(k == 89 || k == 121){ //y
					event.stop(e);
					this.redo();
					return;
				}
			}
			this.inherited(arguments);

			switch(k){
					case keys.ENTER:
					case keys.BACKSPACE:
					case keys.DELETE:
						this.beginEditing();
						break;
					case 88: //x
					case 86: //v
						if(e.ctrlKey && !e.altKey && !e.metaKey){
							this.endEditing();//end current typing step if any
							if(e.keyCode == 88){
								this.beginEditing('cut');
								//use timeout to trigger after the cut is complete
								setTimeout(lang.hitch(this, this.endEditing), 1);
							}else{
								this.beginEditing('paste');
								//use timeout to trigger after the paste is complete
								setTimeout(lang.hitch(this, this.endEditing), 1);
							}
							break;
						}
						//pass through
					default:
						if(!e.ctrlKey && !e.altKey && !e.metaKey && (e.keyCode<keys.F1 || e.keyCode>keys.F15)){
							this.beginEditing();
							break;
						}
						//pass through
					case keys.ALT:
						this.endEditing();
						break;
					case keys.UP_ARROW:
					case keys.DOWN_ARROW:
					case keys.LEFT_ARROW:
					case keys.RIGHT_ARROW:
					case keys.HOME:
					case keys.END:
					case keys.PAGE_UP:
					case keys.PAGE_DOWN:
						this.endEditing(true);
						break;
					//maybe ctrl+backspace/delete, so don't endEditing when ctrl is pressed
					case keys.CTRL:
					case keys.SHIFT:
					case keys.TAB:
						break;
				}
		},
		_onBlur: function(){
			// summary:
			//		Called from focus manager when focus has moved away from this editor
			// tags:
			//		protected

			//this._saveSelection();
			this.inherited(arguments);
			this.endEditing(true);
		},
		_saveSelection: function(){
			// summary:
			//		Save the currently selected text in _savedSelection attribute
			// tags:
			//		private
			try{
				this._savedSelection=this._getBookmark();
			}catch(e){ /* Squelch any errors that occur if selection save occurs due to being hidden simultaneously. */}
		},
		_restoreSelection: function(){
			// summary:
			//		Re-select the text specified in _savedSelection attribute;
			//		see _saveSelection().
			// tags:
			//		private
			if(this._savedSelection){
				// Clear off cursor to start, we're deliberately going to a selection.
				delete this._cursorToStart;
				// only restore the selection if the current range is collapsed
				// if not collapsed, then it means the editor does not lose
				// selection and there is no need to restore it
				if(win.withGlobal(this.window,'isCollapsed',dijit)){
					this._moveToBookmark(this._savedSelection);
				}
				delete this._savedSelection;
			}
		},

		onClick: function(){
			// summary:
			//		Handler for when editor is clicked
			// tags:
			//		protected
			this.endEditing(true);
			this.inherited(arguments);
		},

		replaceValue: function(/*String*/ html){
			// summary:
			//		over-ride of replaceValue to support custom undo and stack maintenance.
			// tags:
			//		protected
			if(!this.customUndo){
				this.inherited(arguments);
			}else{
				if(this.isClosed){
					this.setValue(html);
				}else{
					this.beginEditing();
					if(!html){
						html = "&#160;";	// &nbsp;
					}
					this.setValue(html);
					this.endEditing();
				}
			}
		},

		_setDisabledAttr: function(/*Boolean*/ value){
			var disableFunc = lang.hitch(this, function(){
				if((!this.disabled && value) || (!this._buttonEnabledPlugins && value)){
				// Disable editor: disable all enabled buttons and remember that list
					array.forEach(this._plugins, function(p){
						p.set("disabled", true);
				});
			}else if(this.disabled && !value){
					// Restore plugins to being active.
					array.forEach(this._plugins, function(p){
						p.set("disabled", false);
				});
			}
			});
			this.setValueDeferred.addCallback(disableFunc);
			this.inherited(arguments);
		},

		_setStateClass: function(){
			try{
				this.inherited(arguments);

				// Let theme set the editor's text color based on editor enabled/disabled state.
				// We need to jump through hoops because the main document (where the theme CSS is)
				// is separate from the iframe's document.
				if(this.document && this.document.body){
					domStyle.set(this.document.body, "color", domStyle.get(this.iframe, "color"));
				}
			}catch(e){ /* Squelch any errors caused by focus change if hidden during a state change */}
		}
	});

	// Register the "default plugins", ie, the built-in editor commands
	function simplePluginFactory(args){
		return new _Plugin({ command: args.name });
	}
	function togglePluginFactory(args){
		return new _Plugin({ buttonClass: ToggleButton, command: args.name });
	}
	lang.mixin(_Plugin.registry, {
		"undo": simplePluginFactory,
		"redo": simplePluginFactory,
		"cut": simplePluginFactory,
		"copy": simplePluginFactory,
		"paste": simplePluginFactory,
		"insertOrderedList": simplePluginFactory,
		"insertUnorderedList": simplePluginFactory,
		"indent": simplePluginFactory,
		"outdent": simplePluginFactory,
		"justifyCenter": simplePluginFactory,
		"justifyFull": simplePluginFactory,
		"justifyLeft": simplePluginFactory,
		"justifyRight": simplePluginFactory,
		"delete": simplePluginFactory,
		"selectAll": simplePluginFactory,
		"removeFormat": simplePluginFactory,
		"unlink": simplePluginFactory,
		"insertHorizontalRule": simplePluginFactory,

		"bold": togglePluginFactory,
		"italic": togglePluginFactory,
		"underline": togglePluginFactory,
		"strikethrough": togglePluginFactory,
		"subscript": togglePluginFactory,
		"superscript": togglePluginFactory,

		"|": function(){
			return new _Plugin({ button: new ToolbarSeparator(), setEditor: function(editor){this.editor = editor;}});
		}
	});

	return Editor;
});

},
'dojo/i18n':function(){
define("dojo/i18n", ["./_base/kernel", "require", "./has", "./_base/array", "./_base/config", "./_base/lang", "./_base/xhr", "./json"],
	function(dojo, require, has, array, config, lang, xhr, json) {
	// module:
	//		dojo/i18n
	// summary:
	//		This module implements the !dojo/i18n plugin and the v1.6- i18n API
	// description:
	//		We choose to include our own plugin to leverage functionality already contained in dojo
	//		and thereby reduce the size of the plugin compared to various loader implementations. Also, this
	//		allows foreign AMD loaders to be used without their plugins.


	has.add("dojo-preload-i18n-Api",
		// if true, define the preload localizations machinery
		1
	);

	true || has.add("dojo-v1x-i18n-Api",
		// if true, define the v1.x i18n functions
		1
	);

	var
		thisModule= dojo.i18n=
			// the dojo.i18n module
			{},

		nlsRe=
			// regexp for reconstructing the master bundle name from parts of the regexp match
			// nlsRe.exec("foo/bar/baz/nls/en-ca/foo") gives:
			// ["foo/bar/baz/nls/en-ca/foo", "foo/bar/baz/nls/", "/", "/", "en-ca", "foo"]
			// nlsRe.exec("foo/bar/baz/nls/foo") gives:
			// ["foo/bar/baz/nls/foo", "foo/bar/baz/nls/", "/", "/", "foo", ""]
			// so, if match[5] is blank, it means this is the top bundle definition.
			// courtesy of http://requirejs.org
			/(^.*(^|\/)nls)(\/|$)([^\/]*)\/?([^\/]*)/,

		getAvailableLocales= function(
			root,
			locale,
			bundlePath,
			bundleName
		){
			// return a vector of module ids containing all available locales with respect to the target locale
			// For example, assuming:
			//	 * the root bundle indicates specific bundles for "fr" and "fr-ca",
			//	 * bundlePath is "myPackage/nls"
			//	 * bundleName is "myBundle"
			// Then a locale argument of "fr-ca" would return
			//	 ["myPackage/nls/myBundle", "myPackage/nls/fr/myBundle", "myPackage/nls/fr-ca/myBundle"]
			// Notice that bundles are returned least-specific to most-specific, starting with the root.
			//
			// If root===false indicates we're working with a pre-AMD i18n bundle that doesn't tell about the available locales;
			// therefore, assume everything is available and get 404 errors that indicate a particular localization is not available
			//

			for(var result= [bundlePath + bundleName], localeParts= locale.split("-"), current= "", i= 0; i<localeParts.length; i++){
				current+= (current ? "-" : "") + localeParts[i];
				if(!root || root[current]){
					result.push(bundlePath + current + "/" + bundleName);
				}
			}
			return result;
		},

		cache= {},

		getL10nName= dojo.getL10nName = function(moduleName, bundleName, locale){
			locale = locale ? locale.toLowerCase() : dojo.locale;
			moduleName = "dojo/i18n!" + moduleName.replace(/\./g, "/");
			bundleName = bundleName.replace(/\./g, "/");
			return (/root/i.test(locale)) ?
				(moduleName + "/nls/" + bundleName) :
				(moduleName + "/nls/" + locale + "/" + bundleName);
		},

		doLoad = function(require, bundlePathAndName, bundlePath, bundleName, locale, load){
			// get the root bundle which instructs which other bundles are required to construct the localized bundle
			require([bundlePathAndName], function(root){
				var current = lang.clone(root.root || root.ROOT),// 1.6 built bundle defined ROOT
					availableLocales= getAvailableLocales(!root._v1x && root, locale, bundlePath, bundleName);
				require(availableLocales, function(){
					for (var i= 1; i<availableLocales.length; i++){
						current= lang.mixin(lang.clone(current), arguments[i]);
					}
					// target may not have been resolve (e.g., maybe only "fr" exists when "fr-ca" was requested)
					var target= bundlePathAndName + "/" + locale;
					cache[target]= current;
					load();
				});
			});
		},

		normalize = function(id, toAbsMid){
			// id may be relative
			// preload has form *preload*<path>/nls/<module>*<flattened locales> and
			// therefore never looks like a relative
			return /^\./.test(id) ? toAbsMid(id) : id;
		},

		getLocalesToLoad = function(targetLocale){
			var list = config.extraLocale || [];
			list = lang.isArray(list) ? list : [list];
			list.push(targetLocale);
			return list;
		},

		load = function(id, require, load){
			//
			// id is in one of the following formats
			//
			//	1. <path>/nls/<bundle>
			//		=> load the bundle, localized to config.locale; load all bundles localized to
			//      config.extraLocale (if any); return the loaded bundle localized to config.locale.
			//
			//  2. <path>/nls/<locale>/<bundle>
			//		=> load then return the bundle localized to <locale>
			//
			//  3. *preload*<path>/nls/<module>*<JSON array of available locales>
			//		=> for config.locale and all config.extraLocale, load all bundles found
			//		   in the best-matching bundle rollup. A value of 1 is returned, which
			//         is meaningless other than to say the plugin is executing the requested
			//         preloads
			//
			// In cases 1 and 2, <path> is always normalized to an absolute module id upon entry; see
			// normalize. In case 3, it <path> is assumed to be absolue; this is arranged by the builder.
			//
			// To load a bundle means to insert the bundle into the plugin's cache and publish the bundle
			// value to the loader. Given <path>, <bundle>, and a particular <locale>, the cache key
			//
			//   <path>/nls/<bundle>/<locale>
			//
			// will hold the value. Similarly, then plugin will publish this value to the loader by
			//
			//   define("<path>/nls/<bundle>/<locale>", <bundle-value>);
			//
			// Given this algorithm, other machinery can provide fast load paths be preplacing
			// values in the plugin's cache, which is public. When a load is demanded the
			// cache is inspected before starting any loading. Explicitly placing values in the plugin
			// cache is an advanced/experimental feature that should not be needed; use at your own risk.
			//
			// For the normal AMD algorithm, the root bundle is loaded first, which instructs the
			// plugin what additional localized bundles are required for a particular locale. These
			// additional locales are loaded and a mix of the root and each progressively-specific
			// locale is returned. For example:
			//
			// 1. The client demands "dojo/i18n!some/path/nls/someBundle
			//
			// 2. The loader demands load(some/path/nls/someBundle)
			//
			// 3. This plugin require's "some/path/nls/someBundle", which is the root bundle.
			//
			// 4. Assuming config.locale is "ab-cd-ef" and the root bundle indicates that localizations
			//    are available for "ab" and "ab-cd-ef" (note the missing "ab-cd", then the plugin
			//    requires "some/path/nls/ab/someBundle" and "some/path/nls/ab-cd-ef/someBundle"
			//
			// 5. Upon receiving all required bundles, the plugin constructs the value of the bundle
			//    ab-cd-ef as...
			//
			//      mixin(mixin(mixin({}, require("some/path/nls/someBundle"),
			//        require("some/path/nls/ab/someBundle")),
			//          require("some/path/nls/ab-cd-ef/someBundle"));
			//
			//    This value is inserted into the cache and published to the loader at the
			//    key/module-id some/path/nls/someBundle/ab-cd-ef.
			//
			// The special preload signature (case 3) instructs the plugin to stop servicing all normal requests
			// (further preload requests will be serviced) until all ongoing preloading has completed.
			//
			// The preload signature instructs the plugin that a special rollup module is available that contains
			// one or more flattened, localized bundles. The JSON array of available locales indicates which locales
			// are available. Here is an example:
			//
			//   *preload*some/path/nls/someModule*["root", "ab", "ab-cd-ef"]
			//
			// This indicates the following rollup modules are available:
			//
			//   some/path/nls/someModule_ROOT
			//   some/path/nls/someModule_ab
			//   some/path/nls/someModule_ab-cd-ef
			//
			// Each of these modules is a normal AMD module that contains one or more flattened bundles in a hash.
			// For example, assume someModule contained the bundles some/bundle/path/someBundle and
			// some/bundle/path/someOtherBundle, then some/path/nls/someModule_ab would be expressed as folllows:
			//
			// define({
			//   some/bundle/path/someBundle:<value of someBundle, flattened with respect to locale ab>,
			//   some/bundle/path/someOtherBundle:<value of someOtherBundle, flattened with respect to locale ab>,
			// });
			//
			// E.g., given this design, preloading for locale=="ab" can execute the following algorithm:
			//
			// require(["some/path/nls/someModule_ab"], function(rollup){
			//   for(var p in rollup){
			//     var id = p + "/ab",
			//     cache[id] = rollup[p];
			//     define(id, rollup[p]);
			//   }
			// });
			//
			// Similarly, if "ab-cd" is requested, the algorithm can determine that "ab" is the best available and
			// load accordingly.
			//
			// The builder will write such rollups for every layer if a non-empty localeList  profile property is
			// provided. Further, the builder will include the following cache entry in the cache associated with
			// any layer.
			//
			//   "*now":function(r){r(['dojo/i18n!*preload*<path>/nls/<module>*<JSON array of available locales>']);}
			//
			// The *now special cache module instructs the loader to apply the provided function to context-require
			// with respect to the particular layer being defined. This causes the plugin to hold all normal service
			// requests until all preloading is complete.
			//
			// Notice that this algorithm is rarely better than the standard AMD load algorithm. Consider the normal case
			// where the target locale has a single segment and a layer depends on a single bundle:
			//
			// Without Preloads:
			//
			//   1. Layer loads root bundle.
			//   2. bundle is demanded; plugin loads single localized bundle.
			//
			// With Preloads:
			//
			//   1. Layer causes preloading of target bundle.
			//   2. bundle is demanded; service is delayed until preloading complete; bundle is returned.
			//
			// In each case a single transaction is required to load the target bundle. In cases where multiple bundles
			// are required and/or the locale has multiple segments, preloads still requires a single transaction whereas
			// the normal path requires an additional transaction for each additional bundle/locale-segment. However all
			// of these additional transactions can be done concurrently. Owing to this analysis, the entire preloading
			// algorithm can be discard during a build by setting the has feature dojo-preload-i18n-Api to false.
			//
			if(has("dojo-preload-i18n-Api")){
				var split = id.split("*"),
					preloadDemand = split[1]=="preload";
				if(preloadDemand){
					if(!cache[id]){
						// use cache[id] to prevent multiple preloads of the same preload; this shouldn't happen, but
						// who knows what over-aggressive human optimizers may attempt
						cache[id] = 1;
						preloadL10n(split[2], json.parse(split[3]), 1);
					}
					// don't stall the loader!
					load(1);
				}
				if(preloadDemand || waitForPreloads(id, require, load)){
					return;
				}
			}

			var match= nlsRe.exec(id),
				bundlePath= match[1] + "/",
				bundleName= match[5] || match[4],
				bundlePathAndName= bundlePath + bundleName,
				localeSpecified = (match[5] && match[4]),
				targetLocale=  localeSpecified || dojo.locale,
				loadTarget= bundlePathAndName + "/" + targetLocale,
				loadList = localeSpecified ? [targetLocale] : getLocalesToLoad(targetLocale),
				remaining = loadList.length,
				finish = function(){
					if(!--remaining){
						load(lang.delegate(cache[loadTarget]));
					}
				};
			array.forEach(loadList, function(locale){
				var target = bundlePathAndName + "/" + locale;
				if(has("dojo-preload-i18n-Api")){
					checkForLegacyModules(target);
				}
				if(!cache[target]){
					doLoad(require, bundlePathAndName, bundlePath, bundleName, locale, finish);
				}else{
					finish();
				}
			});
		};

	if(has("dojo-unit-tests")){
		var unitTests = thisModule.unitTests = [];
	}

	if(has("dojo-preload-i18n-Api") || 1){
		var normalizeLocale = thisModule.normalizeLocale= function(locale){
				var result = locale ? locale.toLowerCase() : dojo.locale;
				return result == "root" ? "ROOT" : result;
			},

			isXd = function(mid){
				return (1 && 1) ?
					require.isXdUrl(require.toUrl(mid + ".js")) :
					true;
			},

			preloading = 0,

			preloadWaitQueue = [],

			preloadL10n = thisModule._preloadLocalizations = function(/*String*/bundlePrefix, /*Array*/localesGenerated, /*boolean*/ guaranteedAmdFormat){
				//	summary:
				//		Load available flattened resource bundles associated with a particular module for dojo.locale and all dojo.config.extraLocale (if any)
				//
				//  descirption:
				//		Only called by built layer files. The entire locale hierarchy is loaded. For example,
				//		if locale=="ab-cd", then ROOT, "ab", and "ab-cd" are loaded. This is different than v1.6-
				//		in that the v1.6- would lonly load ab-cd...which was *always* flattened.
				//
				//		If guaranteedAmdFormat is true, then the module can be loaded with require thereby circumventing the detection algorithm
				//		and the extra possible extra transaction.
				//

				function forEachLocale(locale, func){
					// given locale= "ab-cd-ef", calls func on "ab-cd-ef", "ab-cd", "ab", "ROOT"; stops calling the first time func returns truthy
					var parts = locale.split("-");
					while(parts.length){
						if(func(parts.join("-"))){
							return true;
						}
						parts.pop();
					}
					return func("ROOT");
				}

				function preload(locale){
					locale = normalizeLocale(locale);
					forEachLocale(locale, function(loc){
						if(array.indexOf(localesGenerated, loc)>=0){
							var mid = bundlePrefix.replace(/\./g, "/")+"_"+loc;
							preloading++;
							(isXd(mid) || guaranteedAmdFormat ? require : syncRequire)([mid], function(rollup){
								for(var p in rollup){
									cache[p + "/" + loc] = rollup[p];
								}
								--preloading;
								while(!preloading && preloadWaitQueue.length){
									load.apply(null, preloadWaitQueue.shift());
								}
							});
							return true;
						}
						return false;
					});
				}

				preload();
				array.forEach(dojo.config.extraLocale, preload);
			},

			waitForPreloads = function(id, require, load){
				if(preloading){
					preloadWaitQueue.push([id, require, load]);
				}
				return preloading;
			};
	}

	if(1){
		// this code path assumes the dojo loader and won't work with a standard AMD loader
		var evalBundle=
				// use the function ctor to keep the minifiers away (also come close to global scope, but this is secondary)
				new Function(
					"__bundle",                // the bundle to evalutate
					"__checkForLegacyModules", // a function that checks if __bundle defined __mid in the global space
					"__mid",                   // the mid that __bundle is intended to define

					// returns one of:
					//		1 => the bundle was an AMD bundle
					//		a legacy bundle object that is the value of __mid
					//		instance of Error => could not figure out how to evaluate bundle

					  // used to detect when __bundle calls define
					  "var define = function(){define.called = 1;},"
					+ "    require = function(){define.called = 1;};"

					+ "try{"
					+		"define.called = 0;"
					+		"eval(__bundle);"
					+		"if(define.called==1)"
								// bundle called define; therefore signal it's an AMD bundle
					+			"return 1;"

					+		"if((__checkForLegacyModules = __checkForLegacyModules(__mid)))"
								// bundle was probably a v1.6- built NLS flattened NLS bundle that defined __mid in the global space
					+			"return __checkForLegacyModules;"

					+ "}catch(e){}"
					// evaulating the bundle was *neither* an AMD *nor* a legacy flattened bundle
					// either way, re-eval *after* surrounding with parentheses

					+ "try{"
					+ 		"return eval('('+__bundle+')');"
					+ "}catch(e){"
					+ 		"return e;"
					+ "}"
				),

			syncRequire= function(deps, callback){
				var results= [];
				array.forEach(deps, function(mid){
					var url= require.toUrl(mid + ".js");

					function load(text){
						var result = evalBundle(text, checkForLegacyModules, mid);
						if(result===1){
							// the bundle was an AMD module; re-inject it through the normal AMD path
							// we gotta do this since it could be an anonymous module and simply evaluating
							// the text here won't provide the loader with the context to know what
							// module is being defined()'d. With browser caching, this should be free; further
							// this entire code path can be circumvented by using the AMD format to begin with
							require([mid], function(bundle){
								results.push(cache[url]= bundle);
							});
						}else{
							if(result instanceof Error){
								console.error("failed to evaluate i18n bundle; url=" + url, result);
								result = {};
							}
							// nls/<locale>/<bundle-name> indicates not the root.
							results.push(cache[url] = (/nls\/[^\/]+\/[^\/]+$/.test(url) ? result : {root:result, _v1x:1}));
						}
					}

					if(cache[url]){
						results.push(cache[url]);
					}else{
						var bundle = require.syncLoadNls(mid);
						// need to check for legacy module here because there might be a legacy module for a
						// less specific locale (which was not looked up during the first checkForLegacyModules
						// call in load()).
						// Also need to reverse the locale and the module name in the mid because syncRequire
						// deps parameters uses the AMD style package/nls/locale/module while legacy code uses
						// package/nls/module/locale.
						if(!bundle){
							bundle = checkForLegacyModules(mid.replace(/nls\/([^\/]*)\/([^\/]*)$/, "nls/$2/$1"));
						}
						if(bundle){
							results.push(bundle);
						}else{
							if(!xhr){
								try{
									require.getText(url, true, load);
								}catch(e){
									results.push(cache[url]= {});
								}
							}else{
								xhr.get({
									url:url,
									sync:true,
									load:load,
									error:function(){
										results.push(cache[url]= {});
									}
								});
							}
						}
					}
				});
				callback && callback.apply(null, results);
			},

			checkForLegacyModules = function(target){
				// legacy code may have already loaded [e.g] the raw bundle x/y/z at x.y.z; when true, push into the cache
				for(var result, names = target.split("/"), object = dojo.global[names[0]], i = 1; object && i<names.length-1; object = object[names[i++]]){}
				if(object){
					result = object[names[i]];
					if(!result){
						// fallback for incorrect bundle build of 1.6
						result = object[names[i].replace(/-/g,"_")];
					}
					if(result){
						cache[target] = result;
					}
				}
				return result;
			};

		thisModule.getLocalization= function(moduleName, bundleName, locale){
			var result,
				l10nName= getL10nName(moduleName, bundleName, locale).substring(10);
			load(l10nName, (!isXd(l10nName) ? syncRequire : require), function(result_){ result= result_; });
			return result;
		};

		if(has("dojo-unit-tests")){
			unitTests.push(function(doh){
				doh.register("tests.i18n.unit", function(t){
					var check;

					check = evalBundle("{prop:1}");
					t.is({prop:1}, check); t.is(undefined, check[1]);

					check = evalBundle("({prop:1})");
					t.is({prop:1}, check); t.is(undefined, check[1]);

					check = evalBundle("{'prop-x':1}");
					t.is({'prop-x':1}, check); t.is(undefined, check[1]);

					check = evalBundle("({'prop-x':1})");
					t.is({'prop-x':1}, check); t.is(undefined, check[1]);

					check = evalBundle("define({'prop-x':1})");
					t.is(1, check);

					check = evalBundle("this is total nonsense and should throw an error");
					t.is(check instanceof Error, true);
				});
			});
		}
	}

	return lang.mixin(thisModule, {
		dynamic:true,
		normalize:normalize,
		load:load,
		cache:cache
	});
});

},
'dijit/_editor/_Plugin':function(){
define("dijit/_editor/_Plugin", [
	"dojo/_base/connect", // connect.connect
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.mixin, lang.hitch
	"../form/Button"
], function(connect, declare, lang, Button){

// module:
//		dijit/_editor/_Plugin
// summary:
//		Base class for a "plugin" to the editor, which is usually
//		a single button on the Toolbar and some associated code


var _Plugin = declare("dijit._editor._Plugin", null, {
	// summary:
	//		Base class for a "plugin" to the editor, which is usually
	//		a single button on the Toolbar and some associated code

	constructor: function(/*Object?*/args){
		this.params = args || {};
		lang.mixin(this, this.params);
		this._connects=[];
		this._attrPairNames = {};
	},

	// editor: [const] dijit.Editor
	//		Points to the parent editor
	editor: null,

	// iconClassPrefix: [const] String
	//		The CSS class name for the button node is formed from `iconClassPrefix` and `command`
	iconClassPrefix: "dijitEditorIcon",

	// button: dijit._Widget?
	//		Pointer to `dijit.form.Button` or other widget (ex: `dijit.form.FilteringSelect`)
	//		that is added to the toolbar to control this plugin.
	//		If not specified, will be created on initialization according to `buttonClass`
	button: null,

	// command: String
	//		String like "insertUnorderedList", "outdent", "justifyCenter", etc. that represents an editor command.
	//		Passed to editor.execCommand() if `useDefaultCommand` is true.
	command: "",

	// useDefaultCommand: Boolean
	//		If true, this plugin executes by calling Editor.execCommand() with the argument specified in `command`.
	useDefaultCommand: true,

	// buttonClass: Widget Class
	//		Class of widget (ex: dijit.form.Button or dijit.form.FilteringSelect)
	//		that is added to the toolbar to control this plugin.
	//		This is used to instantiate the button, unless `button` itself is specified directly.
	buttonClass: Button,

	// disabled: Boolean
	//		Flag to indicate if this plugin has been disabled and should do nothing
	//		helps control button state, among other things.  Set via the setter api.
	disabled: false,

	getLabel: function(/*String*/key){
		// summary:
		//		Returns the label to use for the button
		// tags:
		//		private
		return this.editor.commands[key];		// String
	},

	_initButton: function(){
		// summary:
		//		Initialize the button or other widget that will control this plugin.
		//		This code only works for plugins controlling built-in commands in the editor.
		// tags:
		//		protected extension
		if(this.command.length){
			var label = this.getLabel(this.command),
				editor = this.editor,
				className = this.iconClassPrefix+" "+this.iconClassPrefix + this.command.charAt(0).toUpperCase() + this.command.substr(1);
			if(!this.button){
				var props = lang.mixin({
					label: label,
					dir: editor.dir,
					lang: editor.lang,
					showLabel: false,
					iconClass: className,
					dropDown: this.dropDown,
					tabIndex: "-1"
				}, this.params || {});
				this.button = new this.buttonClass(props);
			}
		}
		if(this.get("disabled") && this.button){
			this.button.set("disabled", this.get("disabled"));
		}
	},

	destroy: function(){
		// summary:
		//		Destroy this plugin

		var h;
		while(h = this._connects.pop()){ h.remove(); }
		if(this.dropDown){
			this.dropDown.destroyRecursive();
		}
	},

	connect: function(o, f, tf){
		// summary:
		//		Make a connect.connect() that is automatically disconnected when this plugin is destroyed.
		//		Similar to `dijit._Widget.connect`.
		// tags:
		//		protected
		this._connects.push(connect.connect(o, f, this, tf));
	},

	updateState: function(){
		// summary:
		//		Change state of the plugin to respond to events in the editor.
		// description:
		//		This is called on meaningful events in the editor, such as change of selection
		//		or caret position (but not simple typing of alphanumeric keys).   It gives the
		//		plugin a chance to update the CSS of its button.
		//
		//		For example, the "bold" plugin will highlight/unhighlight the bold button depending on whether the
		//		characters next to the caret are bold or not.
		//
		//		Only makes sense when `useDefaultCommand` is true, as it calls Editor.queryCommandEnabled(`command`).
		var e = this.editor,
			c = this.command,
			checked, enabled;
		if(!e || !e.isLoaded || !c.length){ return; }
		var disabled = this.get("disabled");
		if(this.button){
			try{
				enabled = !disabled && e.queryCommandEnabled(c);
				if(this.enabled !== enabled){
					this.enabled = enabled;
					this.button.set('disabled', !enabled);
				}
				if(typeof this.button.checked == 'boolean'){
					checked = e.queryCommandState(c);
					if(this.checked !== checked){
						this.checked = checked;
						this.button.set('checked', e.queryCommandState(c));
					}
				}
			}catch(e){
				console.log(e); // FIXME: we shouldn't have debug statements in our code.  Log as an error?
			}
		}
	},

	setEditor: function(/*dijit.Editor*/ editor){
		// summary:
		//		Tell the plugin which Editor it is associated with.

		// TODO: refactor code to just pass editor to constructor.

		// FIXME: detach from previous editor!!
		this.editor = editor;

		// FIXME: prevent creating this if we don't need to (i.e., editor can't handle our command)
		this._initButton();

		// Processing for buttons that execute by calling editor.execCommand()
		if(this.button && this.useDefaultCommand){
			if(this.editor.queryCommandAvailable(this.command)){
				this.connect(this.button, "onClick",
					lang.hitch(this.editor, "execCommand", this.command, this.commandArg)
				);
			}else{
				// hide button because editor doesn't support command (due to browser limitations)
				this.button.domNode.style.display = "none";
			}
		}

		this.connect(this.editor, "onNormalizedDisplayChanged", "updateState");
	},

	setToolbar: function(/*dijit.Toolbar*/ toolbar){
		// summary:
		//		Tell the plugin to add it's controller widget (often a button)
		//		to the toolbar.  Does nothing if there is no controller widget.

		// TODO: refactor code to just pass toolbar to constructor.

		if(this.button){
			toolbar.addChild(this.button);
		}
		// console.debug("adding", this.button, "to:", toolbar);
	},

	set: function(/* attribute */ name, /* anything */ value){
		// summary:
		//		Set a property on a plugin
		//	name:
		//		The property to set.
		//	value:
		//		The value to set in the property.
		// description:
		//		Sets named properties on a plugin which may potentially be handled by a
		// 		setter in the plugin.
		// 		For example, if the plugin has a properties "foo"
		//		and "bar" and a method named "_setFooAttr", calling:
		//	|	plugin.set("foo", "Howdy!");
		//		would be equivalent to writing:
		//	|	plugin._setFooAttr("Howdy!");
		//		and:
		//	|	plugin.set("bar", 3);
		//		would be equivalent to writing:
		//	|	plugin.bar = 3;
		//
		//	set() may also be called with a hash of name/value pairs, ex:
		//	|	plugin.set({
		//	|		foo: "Howdy",
		//	|		bar: 3
		//	|	})
		//	This is equivalent to calling set(foo, "Howdy") and set(bar, 3)
		if(typeof name === "object"){
			for(var x in name){
				this.set(x, name[x]);
	}
			return this;
		}
		var names = this._getAttrNames(name);
		if(this[names.s]){
			// use the explicit setter
			var result = this[names.s].apply(this, Array.prototype.slice.call(arguments, 1));
		}else{
			this._set(name, value);
		}
		return result || this;
	},

	get: function(name){
		// summary:
		//		Get a property from a plugin.
		//	name:
		//		The property to get.
		// description:
		//		Get a named property from a plugin. The property may
		//		potentially be retrieved via a getter method. If no getter is defined, this
		// 		just retrieves the object's property.
		// 		For example, if the plugin has a properties "foo"
		//		and "bar" and a method named "_getFooAttr", calling:
		//	|	plugin.get("foo");
		//		would be equivalent to writing:
		//	|	plugin._getFooAttr();
		//		and:
		//	|	plugin.get("bar");
		//		would be equivalent to writing:
		//	|	plugin.bar;
		var names = this._getAttrNames(name);
		return this[names.g] ? this[names.g]() : this[name];
	},

	_setDisabledAttr: function(disabled){
		// summary:
		//		Function to set the plugin state and call updateState to make sure the
		//		button is updated appropriately.
		this.disabled = disabled;
		this.updateState();
	},

	_getAttrNames: function(name){
		// summary:
		//		Helper function for get() and set().
		//		Caches attribute name values so we don't do the string ops every time.
		// tags:
		//		private

		var apn = this._attrPairNames;
		if(apn[name]){ return apn[name]; }
		var uc = name.charAt(0).toUpperCase() + name.substr(1);
		return (apn[name] = {
			s: "_set"+uc+"Attr",
			g: "_get"+uc+"Attr"
		});
	},

	_set: function(/*String*/ name, /*anything*/ value){
		// summary:
		//		Helper function to set new value for specified attribute
		this[name] = value;
	}
});

// Hash mapping plugin name to factory, used for registering plugins
_Plugin.registry = {};

return _Plugin;

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
'dojo/_base/url':function(){
define("dojo/_base/url", ["./kernel"], function(dojo) {
	// module:
	//		dojo/url
	// summary:
	//		This module contains dojo._Url

	var
		ore = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),
		ire = new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$"),
		_Url = function(){
			var n = null,
				_a = arguments,
				uri = [_a[0]];
			// resolve uri components relative to each other
			for(var i = 1; i<_a.length; i++){
				if(!_a[i]){ continue; }

				// Safari doesn't support this.constructor so we have to be explicit
				// FIXME: Tracked (and fixed) in Webkit bug 3537.
				//		http://bugs.webkit.org/show_bug.cgi?id=3537
				var relobj = new _Url(_a[i]+""),
					uriobj = new _Url(uri[0]+"");

				if(
					relobj.path == "" &&
					!relobj.scheme &&
					!relobj.authority &&
					!relobj.query
				){
					if(relobj.fragment != n){
						uriobj.fragment = relobj.fragment;
					}
					relobj = uriobj;
				}else if(!relobj.scheme){
					relobj.scheme = uriobj.scheme;

					if(!relobj.authority){
						relobj.authority = uriobj.authority;

						if(relobj.path.charAt(0) != "/"){
							var path = uriobj.path.substring(0,
								uriobj.path.lastIndexOf("/") + 1) + relobj.path;

							var segs = path.split("/");
							for(var j = 0; j < segs.length; j++){
								if(segs[j] == "."){
									// flatten "./" references
									if(j == segs.length - 1){
										segs[j] = "";
									}else{
										segs.splice(j, 1);
										j--;
									}
								}else if(j > 0 && !(j == 1 && segs[0] == "") &&
									segs[j] == ".." && segs[j-1] != ".."){
									// flatten "../" references
									if(j == (segs.length - 1)){
										segs.splice(j, 1);
										segs[j - 1] = "";
									}else{
										segs.splice(j - 1, 2);
										j -= 2;
									}
								}
							}
							relobj.path = segs.join("/");
						}
					}
				}

				uri = [];
				if(relobj.scheme){
					uri.push(relobj.scheme, ":");
				}
				if(relobj.authority){
					uri.push("//", relobj.authority);
				}
				uri.push(relobj.path);
				if(relobj.query){
					uri.push("?", relobj.query);
				}
				if(relobj.fragment){
					uri.push("#", relobj.fragment);
				}
			}

			this.uri = uri.join("");

			// break the uri into its main components
			var r = this.uri.match(ore);

			this.scheme = r[2] || (r[1] ? "" : n);
			this.authority = r[4] || (r[3] ? "" : n);
			this.path = r[5]; // can never be undefined
			this.query = r[7] || (r[6] ? "" : n);
			this.fragment	 = r[9] || (r[8] ? "" : n);

			if(this.authority != n){
				// server based naming authority
				r = this.authority.match(ire);

				this.user = r[3] || n;
				this.password = r[4] || n;
				this.host = r[6] || r[7]; // ipv6 || ipv4
				this.port = r[9] || n;
			}
		};
	_Url.prototype.toString = function(){ return this.uri; };

	return dojo._Url = _Url;
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
'dijit/_editor/html':function(){
define("dijit/_editor/html", [
	"dojo/_base/array",
	"dojo/_base/lang", // lang.getObject
	"dojo/_base/sniff", // has("ie")
	".."		// for exporting symbols to dijit._editor (remove for 2.0)
], function(array, lang, has, dijit){


// module:
//		dijit/_editor/html
// summary:
//		Utility functions used by editor

// Tests for DOMNode.attributes[] behavior:
//	 - dom-attributes-explicit - attributes[] only lists explicitly user specified attributes
//	 - dom-attributes-specified-flag (IE8) - need to check attr.specified flag to skip attributes user didn't specify
//	 - Otherwise, in IE6-7. attributes[] will list hundreds of values, so need to do outerHTML to get attrs instead.
var form = document.createElement("form");
has.add("dom-attributes-explicit", form.attributes.length == 0); // W3C
has.add("dom-attributes-specified-flag", form.attributes.length > 0 && form.attributes.length < 40);	// IE8

lang.getObject("_editor", true, dijit);

dijit._editor.escapeXml=function(/*String*/str, /*Boolean?*/noSingleQuotes){
	// summary:
	//		Adds escape sequences for special characters in XML: &<>"'
	//		Optionally skips escapes for single quotes
	str = str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;");
	if(!noSingleQuotes){
		str = str.replace(/'/gm, "&#39;");
	}
	return str; // string
};

dijit._editor.getNodeHtml=function(/* DomNode */node){
	var output;
	switch(node.nodeType){
		case 1: //element node
			var lName = node.nodeName.toLowerCase();
			if(!lName || lName.charAt(0) == "/"){
				// IE does some strange things with malformed HTML input, like
				// treating a close tag </span> without an open tag <span>, as
				// a new tag with tagName of /span.  Corrupts output HTML, remove
				// them.  Other browsers don't prefix tags that way, so will
				// never show up.
				return "";
			}
			output = '<' + lName;

			//store the list of attributes and sort it to have the
			//attributes appear in the dictionary order
			var attrarray = [], attrhash = {};
			var attr;
			if(has("dom-attributes-explicit") || has("dom-attributes-specified-flag")){
				// IE8+ and all other browsers.
				var i = 0;
				while((attr = node.attributes[i++])){
					// ignore all attributes starting with _dj which are
					// internal temporary attributes used by the editor
					var n = attr.name;
					if(n.substr(0,3) !== '_dj' &&
						(!has("dom-attributes-specified-flag") || attr.specified) &&
						!(n in attrhash)){	// workaround repeated attributes bug in IE8 (LinkDialog test)
						var v = attr.value;
						if(n == 'src' || n == 'href'){
							if(node.getAttribute('_djrealurl')){
								v = node.getAttribute('_djrealurl');
							}
						}
						if(has("ie") === 8 && n === "style"){
							v = v.replace("HEIGHT:", "height:").replace("WIDTH:", "width:");
						}
						attrarray.push([n,v]);
						attrhash[n] = v;
					}
				}
			}else{
				// IE6-7 code path
				var clone = /^input$|^img$/i.test(node.nodeName) ? node : node.cloneNode(false);
				var s = clone.outerHTML;
				// Split up and manage the attrs via regexp
				// similar to prettyPrint attr logic.
				var rgxp_attrsMatch = /[\w-]+=("[^"]*"|'[^']*'|\S*)/gi
				var attrSplit = s.match(rgxp_attrsMatch);
				s = s.substr(0, s.indexOf('>'));
				array.forEach(attrSplit, function(attr){
					if(attr){
						var idx = attr.indexOf("=");
						if(idx > 0){
							var key = attr.substring(0,idx);
							if(key.substr(0,3) != '_dj'){
								if(key == 'src' || key == 'href'){
									if(node.getAttribute('_djrealurl')){
										attrarray.push([key,node.getAttribute('_djrealurl')]);
										return;
									}
								}
								var val, match;
								switch(key){
									case 'style':
										val = node.style.cssText.toLowerCase();
										break;
									case 'class':
										val = node.className;
										break;
									case 'width':
										if(lName === "img"){
											// This somehow gets lost on IE for IMG tags and the like
											// and we have to find it in outerHTML, known IE oddity.
											match=/width=(\S+)/i.exec(s);
											if(match){
												val = match[1];
											}
											break;
										}
									case 'height':
										if(lName === "img"){
											// This somehow gets lost on IE for IMG tags and the like
											// and we have to find it in outerHTML, known IE oddity.
											match=/height=(\S+)/i.exec(s);
											if(match){
												val = match[1];
											}
											break;
										}
									default:
										val = node.getAttribute(key);
								}
								if(val != null){
									attrarray.push([key, val.toString()]);
								}
							}
						}
					}
				}, this);
			}
			attrarray.sort(function(a,b){
				return a[0] < b[0] ? -1 : (a[0] == b[0] ? 0 : 1);
			});
			var j = 0;
			while((attr = attrarray[j++])){
				output += ' ' + attr[0] + '="' +
					(lang.isString(attr[1]) ? dijit._editor.escapeXml(attr[1], true) : attr[1]) + '"';
			}
			if(lName === "script"){
				// Browsers handle script tags differently in how you get content,
				// but innerHTML always seems to work, so insert its content that way
				// Yes, it's bad to allow script tags in the editor code, but some people
				// seem to want to do it, so we need to at least return them right.
				// other plugins/filters can strip them.
				output += '>' + node.innerHTML +'</' + lName + '>';
			}else{
				if(node.childNodes.length){
					output += '>' + dijit._editor.getChildrenHtml(node)+'</' + lName +'>';
				}else{
					switch(lName){
						case 'br':
						case 'hr':
						case 'img':
						case 'input':
						case 'base':
						case 'meta':
						case 'area':
						case 'basefont':
							// These should all be singly closed
							output += ' />';
							break;
						default:
							// Assume XML style separate closure for everything else.
							output += '></' + lName + '>';
					}
				}
			}
			break;
		case 4: // cdata
		case 3: // text
			// FIXME:
			output = dijit._editor.escapeXml(node.nodeValue, true);
			break;
		case 8: //comment
			// FIXME:
			output = '<!--' + dijit._editor.escapeXml(node.nodeValue, true) + '-->';
			break;
		default:
			output = "<!-- Element not recognized - Type: " + node.nodeType + " Name: " + node.nodeName + "-->";
	}
	return output;
};

dijit._editor.getChildrenHtml = function(/* DomNode */dom){
	// summary:
	//		Returns the html content of a DomNode and children
	var out = "";
	if(!dom){ return out; }
	var nodes = dom["childNodes"] || dom;

	//IE issue.
	//If we have an actual node we can check parent relationships on for IE,
	//We should check, as IE sometimes builds invalid DOMS.  If no parent, we can't check
	//And should just process it and hope for the best.
	var checkParent = !has("ie") || nodes !== dom;

	var node, i = 0;
	while((node = nodes[i++])){
		//IE is broken.  DOMs are supposed to be a tree.  But in the case of malformed HTML, IE generates a graph
		//meaning one node ends up with multiple references (multiple parents).  This is totally wrong and invalid, but
		//such is what it is.  We have to keep track and check for this because otherise the source output HTML will have dups.
		//No other browser generates a graph.  Leave it to IE to break a fundamental DOM rule.  So, we check the parent if we can
		//If we can't, nothing more we can do other than walk it.
		if(!checkParent || node.parentNode == dom){
			out += dijit._editor.getNodeHtml(node);
		}
	}
	return out; // String
};

return dijit._editor;
});

},
'dijit/_editor/RichText':function(){
define("dijit/_editor/RichText", [
	"dojo/_base/array", // array.forEach array.indexOf array.some
	"dojo/_base/config", // config
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred", // Deferred
	"dojo/dom", // dom.byId
	"dojo/dom-attr", // domAttr.set or get
	"dojo/dom-class", // domClass.add domClass.remove
	"dojo/dom-construct", // domConstruct.create domConstruct.destroy domConstruct.place
	"dojo/dom-geometry", // domGeometry.position
	"dojo/dom-style", // domStyle.getComputedStyle domStyle.set
	"dojo/_base/event", // event.stop
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys", // keys.BACKSPACE keys.TAB
	"dojo/_base/lang", // lang.clone lang.hitch lang.isArray lang.isFunction lang.isString lang.trim
	"dojo/on", // on()
	"dojo/query", // query
	"dojo/ready", // ready
	"dojo/_base/sniff", // has("ie") has("mozilla") has("opera") has("safari") has("webkit")
	"dojo/topic",	// topic.publish() (publish)
	"dojo/_base/unload", // unload
	"dojo/_base/url", // url
	"dojo/_base/window", // win.body win.doc.body.focus win.doc.createElement win.global.location win.withGlobal
	"../_Widget",
	"../_CssStateMixin",
	"./selection",
	"./range",
	"./html",
	"../focus",
	".."	// dijit._scopeName
], function(array, config, declare, Deferred, dom, domAttr, domClass, domConstruct, domGeometry, domStyle,
	event, kernel, keys, lang, on, query, ready, has, topic, unload, _Url, win,
	_Widget, _CssStateMixin, selectionapi, rangeapi, htmlapi, focus, dijit){

/*=====
	var _Widget = dijit._Widget;
	var _CssStateMixin = dijit._CssStateMixin;
=====*/

// module:
//		dijit/_editor/RichText
// summary:
//		dijit._editor.RichText is the core of dijit.Editor, which provides basic
//		WYSIWYG editing features.

// if you want to allow for rich text saving with back/forward actions, you must add a text area to your page with
// the id==dijit._scopeName + "._editor.RichText.value" (typically "dijit._editor.RichText.value). For example,
// something like this will work:
//
//	<textarea id="dijit._editor.RichText.value" style="display:none;position:absolute;top:-100px;left:-100px;height:3px;width:3px;overflow:hidden;"></textarea>
//

var RichText = declare("dijit._editor.RichText", [_Widget, _CssStateMixin], {
	// summary:
	//		dijit._editor.RichText is the core of dijit.Editor, which provides basic
	//		WYSIWYG editing features.
	//
	// description:
	//		dijit._editor.RichText is the core of dijit.Editor, which provides basic
	//		WYSIWYG editing features. It also encapsulates the differences
	//		of different js engines for various browsers.  Do not use this widget
	//		with an HTML &lt;TEXTAREA&gt; tag, since the browser unescapes XML escape characters,
	//		like &lt;.  This can have unexpected behavior and lead to security issues
	//		such as scripting attacks.
	//
	// tags:
	//		private

	constructor: function(params){
		// contentPreFilters: Function(String)[]
		//		Pre content filter function register array.
		//		these filters will be executed before the actual
		//		editing area gets the html content.
		this.contentPreFilters = [];

		// contentPostFilters: Function(String)[]
		//		post content filter function register array.
		//		These will be used on the resulting html
		//		from contentDomPostFilters. The resulting
		//		content is the final html (returned by getValue()).
		this.contentPostFilters = [];

		// contentDomPreFilters: Function(DomNode)[]
		//		Pre content dom filter function register array.
		//		These filters are applied after the result from
		//		contentPreFilters are set to the editing area.
		this.contentDomPreFilters = [];

		// contentDomPostFilters: Function(DomNode)[]
		//		Post content dom filter function register array.
		//		These filters are executed on the editing area dom.
		//		The result from these will be passed to contentPostFilters.
		this.contentDomPostFilters = [];

		// editingAreaStyleSheets: dojo._URL[]
		//		array to store all the stylesheets applied to the editing area
		this.editingAreaStyleSheets = [];

		// Make a copy of this.events before we start writing into it, otherwise we
		// will modify the prototype which leads to bad things on pages w/multiple editors
		this.events = [].concat(this.events);

		this._keyHandlers = {};

		if(params && lang.isString(params.value)){
			this.value = params.value;
		}

		this.onLoadDeferred = new Deferred();
	},

	baseClass: "dijitEditor",

	// inheritWidth: Boolean
	//		whether to inherit the parent's width or simply use 100%
	inheritWidth: false,

	// focusOnLoad: [deprecated] Boolean
	//		Focus into this widget when the page is loaded
	focusOnLoad: false,

	// name: String?
	//		Specifies the name of a (hidden) <textarea> node on the page that's used to save
	//		the editor content on page leave.   Used to restore editor contents after navigating
	//		to a new page and then hitting the back button.
	name: "",

	// styleSheets: [const] String
	//		semicolon (";") separated list of css files for the editing area
	styleSheets: "",

	// height: String
	//		Set height to fix the editor at a specific height, with scrolling.
	//		By default, this is 300px.  If you want to have the editor always
	//		resizes to accommodate the content, use AlwaysShowToolbar plugin
	//		and set height="".  If this editor is used within a layout widget,
	//		set height="100%".
	height: "300px",

	// minHeight: String
	//		The minimum height that the editor should have.
	minHeight: "1em",

	// isClosed: [private] Boolean
	isClosed: true,

	// isLoaded: [private] Boolean
	isLoaded: false,

	// _SEPARATOR: [private] String
	//		Used to concat contents from multiple editors into a single string,
	//		so they can be saved into a single <textarea> node.  See "name" attribute.
	_SEPARATOR: "@@**%%__RICHTEXTBOUNDRY__%%**@@",

	// _NAME_CONTENT_SEP: [private] String
	//		USed to separate name from content.  Just a colon isn't safe.
	_NAME_CONTENT_SEP: "@@**%%:%%**@@",

	// onLoadDeferred: [readonly] dojo.Deferred
	//		Deferred which is fired when the editor finishes loading.
	//		Call myEditor.onLoadDeferred.then(callback) it to be informed
	//		when the rich-text area initialization is finalized.
	onLoadDeferred: null,

	// isTabIndent: Boolean
	//		Make tab key and shift-tab indent and outdent rather than navigating.
	//		Caution: sing this makes web pages inaccessible to users unable to use a mouse.
	isTabIndent: false,

	// disableSpellCheck: [const] Boolean
	//		When true, disables the browser's native spell checking, if supported.
	//		Works only in Firefox.
	disableSpellCheck: false,

	postCreate: function(){
		if("textarea" === this.domNode.tagName.toLowerCase()){
			console.warn("RichText should not be used with the TEXTAREA tag.  See dijit._editor.RichText docs.");
		}

		// Push in the builtin filters now, making them the first executed, but not over-riding anything
		// users passed in.  See: #6062
		this.contentPreFilters = [lang.hitch(this, "_preFixUrlAttributes")].concat(this.contentPreFilters);
		if(has("mozilla")){
			this.contentPreFilters = [this._normalizeFontStyle].concat(this.contentPreFilters);
			this.contentPostFilters = [this._removeMozBogus].concat(this.contentPostFilters);
		}
		if(has("webkit")){
			// Try to clean up WebKit bogus artifacts.  The inserted classes
			// made by WebKit sometimes messes things up.
			this.contentPreFilters = [this._removeWebkitBogus].concat(this.contentPreFilters);
			this.contentPostFilters = [this._removeWebkitBogus].concat(this.contentPostFilters);
		}
		if(has("ie") || has("trident")){
			// IE generates <strong> and <em> but we want to normalize to <b> and <i>
				// Still happens in IE11!
			this.contentPostFilters = [this._normalizeFontStyle].concat(this.contentPostFilters);
			this.contentDomPostFilters = [lang.hitch(this, this._stripBreakerNodes)].concat(this.contentDomPostFilters);
		}
		this.inherited(arguments);

		topic.publish(dijit._scopeName + "._editor.RichText::init", this);
		this.open();
		this.setupDefaultShortcuts();
	},

	setupDefaultShortcuts: function(){
		// summary:
		//		Add some default key handlers
		// description:
		//		Overwrite this to setup your own handlers. The default
		//		implementation does not use Editor commands, but directly
		//		executes the builtin commands within the underlying browser
		//		support.
		// tags:
		//		protected
		var exec = lang.hitch(this, function(cmd, arg){
			return function(){
				return !this.execCommand(cmd,arg);
			};
		});

		var ctrlKeyHandlers = {
			b: exec("bold"),
			i: exec("italic"),
			u: exec("underline"),
			a: exec("selectall"),
			s: function(){ this.save(true); },
			m: function(){ this.isTabIndent = !this.isTabIndent; },

			"1": exec("formatblock", "h1"),
			"2": exec("formatblock", "h2"),
			"3": exec("formatblock", "h3"),
			"4": exec("formatblock", "h4"),

			"\\": exec("insertunorderedlist")
		};

		if(!has("ie")){
			ctrlKeyHandlers.Z = exec("redo"); //FIXME: undo?
		}

		var key;
		for(key in ctrlKeyHandlers){
			this.addKeyHandler(key, true, false, ctrlKeyHandlers[key]);
		}
	},

	// events: [private] String[]
	//		 events which should be connected to the underlying editing area
	events: ["onKeyPress", "onKeyDown", "onKeyUp"], // onClick handled specially

	// captureEvents: [deprecated] String[]
	//		 Events which should be connected to the underlying editing
	//		 area, events in this array will be addListener with
	//		 capture=true.
	// TODO: looking at the code I don't see any distinction between events and captureEvents,
	// so get rid of this for 2.0 if not sooner
	captureEvents: [],

	_editorCommandsLocalized: false,
	_localizeEditorCommands: function(){
		// summary:
		//		When IE is running in a non-English locale, the API actually changes,
		//		so that we have to say (for example) danraku instead of p (for paragraph).
		//		Handle that here.
		// tags:
		//		private
		if(RichText._editorCommandsLocalized){
			// Use the already generate cache of mappings.
			this._local2NativeFormatNames = RichText._local2NativeFormatNames;
			this._native2LocalFormatNames = RichText._native2LocalFormatNames;
			return;
		}
		RichText._editorCommandsLocalized = true;
		RichText._local2NativeFormatNames = {};
		RichText._native2LocalFormatNames = {};
		this._local2NativeFormatNames = RichText._local2NativeFormatNames;
		this._native2LocalFormatNames = RichText._native2LocalFormatNames;
		//in IE, names for blockformat is locale dependent, so we cache the values here

		//put p after div, so if IE returns Normal, we show it as paragraph
		//We can distinguish p and div if IE returns Normal, however, in order to detect that,
		//we have to call this.document.selection.createRange().parentElement() or such, which
		//could slow things down. Leave it as it is for now
		var formats = ['div', 'p', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ol', 'ul', 'address'];
		var localhtml = "", format, i=0;
		while((format=formats[i++])){
			//append a <br> after each element to separate the elements more reliably
			if(format.charAt(1) !== 'l'){
				localhtml += "<"+format+"><span>content</span></"+format+"><br/>";
			}else{
				localhtml += "<"+format+"><li>content</li></"+format+"><br/>";
			}
		}
		// queryCommandValue returns empty if we hide editNode, so move it out of screen temporary
		// Also, IE9 does weird stuff unless we do it inside the editor iframe.
		var style = { position: "absolute", top: "0px", zIndex: 10, opacity: 0.01 };
		var div = domConstruct.create('div', {style: style, innerHTML: localhtml});
		win.body().appendChild(div);

		// IE9 has a timing issue with doing this right after setting
		// the inner HTML, so put a delay in.
		var inject = lang.hitch(this, function(){
			var node = div.firstChild;
			while(node){
				try{
					selectionapi.selectElement(node.firstChild);
					var nativename = node.tagName.toLowerCase();
					this._local2NativeFormatNames[nativename] = document.queryCommandValue("formatblock");
					this._native2LocalFormatNames[this._local2NativeFormatNames[nativename]] = nativename;
					node = node.nextSibling.nextSibling;
					//console.log("Mapped: ", nativename, " to: ", this._local2NativeFormatNames[nativename]);
				}catch(e){ /*Sqelch the occasional IE9 error */ }
			}
			div.parentNode.removeChild(div);
			div.innerHTML = "";
		});
		setTimeout(inject, 0);
	},

	open: function(/*DomNode?*/ element){
		// summary:
		//		Transforms the node referenced in this.domNode into a rich text editing
		//		node.
		// description:
		//		Sets up the editing area asynchronously. This will result in
		//		the creation and replacement with an iframe.
		// tags:
		//		private

		if(!this.onLoadDeferred || this.onLoadDeferred.fired >= 0){
			this.onLoadDeferred = new Deferred();
		}

		if(!this.isClosed){ this.close(); }
		topic.publish(dijit._scopeName + "._editor.RichText::open", this);

		if(arguments.length === 1 && element.nodeName){ // else unchanged
			this.domNode = element;
		}

		var dn = this.domNode;

		// "html" will hold the innerHTML of the srcNodeRef and will be used to
		// initialize the editor.
		var html;

		if(lang.isString(this.value)){
			// Allow setting the editor content programmatically instead of
			// relying on the initial content being contained within the target
			// domNode.
			html = this.value;
			delete this.value;
			dn.innerHTML = "";
		}else if(dn.nodeName && dn.nodeName.toLowerCase() == "textarea"){
			// if we were created from a textarea, then we need to create a
			// new editing harness node.
			var ta = (this.textarea = dn);
			this.name = ta.name;
			html = ta.value;
			dn = this.domNode = win.doc.createElement("div");
			dn.setAttribute('widgetId', this.id);
			ta.removeAttribute('widgetId');
			dn.cssText = ta.cssText;
			dn.className += " " + ta.className;
			domConstruct.place(dn, ta, "before");
			var tmpFunc = lang.hitch(this, function(){
				//some browsers refuse to submit display=none textarea, so
				//move the textarea off screen instead
				domStyle.set(ta, {
					display: "block",
					position: "absolute",
					top: "-1000px"
				});

				if(has("ie")){ //nasty IE bug: abnormal formatting if overflow is not hidden
					var s = ta.style;
					this.__overflow = s.overflow;
					s.overflow = "hidden";
				}
			});
			if(has("ie")){
				setTimeout(tmpFunc, 10);
			}else{
				tmpFunc();
			}

			if(ta.form){
				var resetValue = ta.value;
				this.reset = function(){
					var current = this.getValue();
					if(current !== resetValue){
						this.replaceValue(resetValue);
					}
				};
				on(ta.form, "submit", lang.hitch(this, function(){
					// Copy value to the <textarea> so it gets submitted along with form.
					// FIXME: should we be calling close() here instead?
					domAttr.set(ta, 'disabled', this.disabled); // don't submit the value if disabled
					ta.value = this.getValue();
				}));
			}
		}else{
			html = htmlapi.getChildrenHtml(dn);
			dn.innerHTML = "";
		}

		this.value = html;

		// If we're a list item we have to put in a blank line to force the
		// bullet to nicely align at the top of text
		if(dn.nodeName && dn.nodeName === "LI"){
			dn.innerHTML = " <br>";
		}

		// Construct the editor div structure.
		this.header = dn.ownerDocument.createElement("div");
		dn.appendChild(this.header);
		this.editingArea = dn.ownerDocument.createElement("div");
		dn.appendChild(this.editingArea);
		this.footer = dn.ownerDocument.createElement("div");
		dn.appendChild(this.footer);

		if(!this.name){
			this.name = this.id + "_AUTOGEN";
		}

		// User has pressed back/forward button so we lost the text in the editor, but it's saved
		// in a hidden <textarea> (which contains the data for all the editors on this page),
		// so get editor value from there
		if(this.name !== "" && (!config["useXDomain"] || config["allowXdRichTextSave"])){
			var saveTextarea = dom.byId(dijit._scopeName + "._editor.RichText.value");
			if(saveTextarea && saveTextarea.value !== ""){
				var datas = saveTextarea.value.split(this._SEPARATOR), i=0, dat;
				while((dat=datas[i++])){
					var data = dat.split(this._NAME_CONTENT_SEP);
					if(data[0] === this.name){
						html = data[1];
						datas = datas.splice(i, 1);
						saveTextarea.value = datas.join(this._SEPARATOR);
						break;
					}
				}
			}

			if(!RichText._globalSaveHandler){
				RichText._globalSaveHandler = {};
				unload.addOnUnload(function(){
					var id;
					for(id in RichText._globalSaveHandler){
						var f = RichText._globalSaveHandler[id];
						if(lang.isFunction(f)){
							f();
						}
					}
				});
			}
			RichText._globalSaveHandler[this.id] = lang.hitch(this, "_saveContent");
		}

		this.isClosed = false;

		var ifr = (this.editorObject = this.iframe = win.doc.createElement('iframe'));
		ifr.id = this.id+"_iframe";
		ifr.style.border = "none";
		ifr.style.width = "100%";
		if(this._layoutMode){
			// iframe should be 100% height, thus getting it's height from surrounding
			// <div> (which has the correct height set by Editor)
			ifr.style.height = "100%";
		}else{
			if(has("ie") >= 7){
				if(this.height){
					ifr.style.height = this.height;
				}
				if(this.minHeight){
					ifr.style.minHeight = this.minHeight;
				}
			}else{
				ifr.style.height = this.height ? this.height : this.minHeight;
			}
		}
		ifr.frameBorder = 0;
		ifr._loadFunc = lang.hitch( this, function(w){
			this.window = w;
				this.document = w.document;

			if(has("ie")){
				this._localizeEditorCommands();
			}

			// Do final setup and set initial contents of editor
			this.onLoad(html);
		});

		// Attach iframe to document, and set the initial (blank) content.
		var src = this._getIframeDocTxt().replace(/\\/g, "\\\\").replace(/'/g, "\\'"),
			s;

		// IE10 and earlier will throw an "Access is denied" error when attempting to access the parent frame if
		// document.domain has been set, unless the child frame also has the same document.domain set. The child frame
		// can only set document.domain while the document is being constructed using open/write/close; attempting to
		// set it later results in a different "This method can't be used in this context" error. See #17529
		if (has("ie") < 11) {
			s = 'javascript:document.open();try{parent.window;}catch(e){document.domain="' + document.domain + '";}' +
				'document.write(\'' + src + '\');document.close()';
		}
		else {
			s = "javascript: '" + src + "'";
		}

			if(has("ie") == 9){
				// On IE9, attach to document before setting the content, to avoid problem w/iframe running in
			// wrong security context, see #16633.
			this.editingArea.appendChild(ifr);
			ifr.src = s;
		}else{
			// For other browsers, set src first, especially for IE6/7 where attaching first gives a warning on
			// https:// about "this page contains secure and insecure items, do you want to view both?"
			ifr.setAttribute('src', s);
			this.editingArea.appendChild(ifr);
		}

		if(has("safari") <= 4){
			src = ifr.getAttribute("src");
			if(!src || src.indexOf("javascript") === -1){
				// Safari 4 and earlier sometimes act oddly
				// So we have to set it again.
				setTimeout(function(){ifr.setAttribute('src', s);},0);
			}
		}

		// TODO: this is a guess at the default line-height, kinda works
		if(dn.nodeName === "LI"){
			dn.lastChild.style.marginTop = "-1.2em";
		}

		domClass.add(this.domNode, this.baseClass);
	},

	//static cache variables shared among all instance of this class
	_local2NativeFormatNames: {},
	_native2LocalFormatNames: {},

	_getIframeDocTxt: function(){
		// summary:
		//		Generates the boilerplate text of the document inside the iframe (ie, <html><head>...</head><body/></html>).
		//		Editor content (if not blank) should be added afterwards.
		// tags:
		//		private
		var _cs = domStyle.getComputedStyle(this.domNode);

		// The contents inside of <body>.  The real contents are set later via a call to setValue().
			// In auto-expand mode, need a wrapper div for AlwaysShowToolbar plugin to correctly
			// expand/contract the editor as the content changes.
			var html = "<div id='dijitEditorBody'></div>";

		var font = [ _cs.fontWeight, _cs.fontSize, _cs.fontFamily ].join(" ");

		// line height is tricky - applying a units value will mess things up.
		// if we can't get a non-units value, bail out.
		var lineHeight = _cs.lineHeight;
		if(lineHeight.indexOf("px") >= 0){
			lineHeight = parseFloat(lineHeight)/parseFloat(_cs.fontSize);
			// console.debug(lineHeight);
		}else if(lineHeight.indexOf("em")>=0){
			lineHeight = parseFloat(lineHeight);
		}else{
			// If we can't get a non-units value, just default
			// it to the CSS spec default of 'normal'.  Seems to
			// work better, esp on IE, than '1.0'
			lineHeight = "normal";
		}
		var userStyle = "";
		var self = this;
		this.style.replace(/(^|;)\s*(line-|font-?)[^;]+/ig, function(match){
			match = match.replace(/^;/ig,"") + ';';
			var s = match.split(":")[0];
			if(s){
				s = lang.trim(s);
				s = s.toLowerCase();
				var i;
				var sC = "";
				for(i = 0; i < s.length; i++){
					var c = s.charAt(i);
					switch(c){
						case "-":
							i++;
							c = s.charAt(i).toUpperCase();
						default:
							sC += c;
					}
				}
				domStyle.set(self.domNode, sC, "");
			}
			userStyle += match + ';';
		});


		// need to find any associated label element and update iframe document title
		var label=query('label[for="'+this.id+'"]');

		return [
			this.isLeftToRight() ? "<html>\n<head>\n" : "<html dir='rtl'>\n<head>\n",
			(has("mozilla") && label.length ? "<title>" + label[0].innerHTML + "</title>\n" : ""),
			"<meta http-equiv='Content-Type' content='text/html'>\n",
			"<style>\n",
			"\tbody,html {\n",
			"\t\tbackground:transparent;\n",
			"\t\tpadding: 1px 0 0 0;\n",
			"\t\tmargin: -1px 0 0 0;\n", // remove extraneous vertical scrollbar on safari and firefox
			"\t}\n",
				"\tbody,html,#dijitEditorBody { outline: none; }",

				// Set <body> to expand to full size of editor, so clicking anywhere will work.
				// Except in auto-expand mode, in which case the editor expands to the size of <body>.
				// Also determine how scrollers should be applied.  In autoexpand mode (height = "") no scrollers on y at all.
				// But in fixed height mode we want both x/y scrollers.
				// Scrollers go on <body> since it's been set to height: 100%.
				"html { height: 100%; width: 100%; overflow: hidden; }\n",	// scroll bar is on #dijitEditorBody, shouldn't be on <html>
				this.height ? "\tbody,#dijitEditorBody { height: 100%; width: 100%; overflow: auto; }\n" :
					"\tbody,#dijitEditorBody { min-height: " + this.minHeight + "; width: 100%; overflow-x: auto; overflow-y: hidden; }\n",

			// TODO: left positioning will cause contents to disappear out of view
			//	   if it gets too wide for the visible area
			"\tbody{\n",
			"\t\ttop:0px;\n",
			"\t\tleft:0px;\n",
			"\t\tright:0px;\n",
			"\t\tfont:", font, ";\n",
				((this.height||has("opera")) ? "" : "\t\tposition: fixed;\n"),
			"\t\tline-height:", lineHeight,";\n",
			"\t}\n",
			"\tp{ margin: 1em 0; }\n",

			"\tli > ul:-moz-first-node, li > ol:-moz-first-node{ padding-top: 1.2em; }\n",
			// Can't set min-height in IE>=9, it puts layout on li, which puts move/resize handles.
			(has("ie") || has("trident") ? "" : "\tli{ min-height:1.2em; }\n"),
			"</style>\n",
			this._applyEditingAreaStyleSheets(),"\n",
			"</head>\n<body ",
			"</head>\n<body role='main' ",

			// Onload handler fills in real editor content.
			// On IE9, sometimes onload is called twice, and the first time frameElement is null (test_FullScreen.html)
			"onload='frameElement && frameElement._loadFunc(window,document)' ",
			"style='"+userStyle+"'>", html, "</body>\n</html>"
		].join(""); // String
	},

	_applyEditingAreaStyleSheets: function(){
		// summary:
		//		apply the specified css files in styleSheets
		// tags:
		//		private
		var files = [];
		if(this.styleSheets){
			files = this.styleSheets.split(';');
			this.styleSheets = '';
		}

		//empty this.editingAreaStyleSheets here, as it will be filled in addStyleSheet
		files = files.concat(this.editingAreaStyleSheets);
		this.editingAreaStyleSheets = [];

		var text='', i=0, url;
		while((url=files[i++])){
			var abstring = (new _Url(win.global.location, url)).toString();
			this.editingAreaStyleSheets.push(abstring);
			text += '<link rel="stylesheet" type="text/css" href="'+abstring+'"/>';
		}
		return text;
	},

	addStyleSheet: function(/*dojo._Url*/ uri){
		// summary:
		//		add an external stylesheet for the editing area
		// uri:
		//		A dojo.uri.Uri pointing to the url of the external css file
		var url=uri.toString();

		//if uri is relative, then convert it to absolute so that it can be resolved correctly in iframe
		if(url.charAt(0) === '.' || (url.charAt(0) !== '/' && !uri.host)){
			url = (new _Url(win.global.location, url)).toString();
		}

		if(array.indexOf(this.editingAreaStyleSheets, url) > -1){
//			console.debug("dijit._editor.RichText.addStyleSheet: Style sheet "+url+" is already applied");
			return;
		}

		this.editingAreaStyleSheets.push(url);
		this.onLoadDeferred.addCallback(lang.hitch(this, function(){
			if(this.document.createStyleSheet){ //IE
				this.document.createStyleSheet(url);
			}else{ //other browser
				var head = this.document.getElementsByTagName("head")[0];
				var stylesheet = this.document.createElement("link");
				stylesheet.rel="stylesheet";
				stylesheet.type="text/css";
				stylesheet.href=url;
				head.appendChild(stylesheet);
			}
		}));
	},

	removeStyleSheet: function(/*dojo._Url*/ uri){
		// summary:
		//		remove an external stylesheet for the editing area
		var url=uri.toString();
		//if uri is relative, then convert it to absolute so that it can be resolved correctly in iframe
		if(url.charAt(0) === '.' || (url.charAt(0) !== '/' && !uri.host)){
			url = (new _Url(win.global.location, url)).toString();
		}
		var index = array.indexOf(this.editingAreaStyleSheets, url);
		if(index === -1){
//			console.debug("dijit._editor.RichText.removeStyleSheet: Style sheet "+url+" has not been applied");
			return;
		}
		delete this.editingAreaStyleSheets[index];
		win.withGlobal(this.window,'query', dojo, ['link:[href="'+url+'"]']).orphan();
	},

	// disabled: Boolean
	//		The editor is disabled; the text cannot be changed.
	disabled: false,

	_mozSettingProps: {'styleWithCSS':false},
	_setDisabledAttr: function(/*Boolean*/ value){
		value = !!value;
		this._set("disabled", value);
		if(!this.isLoaded){
			return;
		} // this method requires init to be complete
		var preventIEfocus = has("ie") && (this.isLoaded || !this.focusOnLoad);
		if(preventIEfocus){
			this.editNode.unselectable = "on";
		}
		this.editNode.contentEditable = !value;
		this.editNode.tabIndex = value ? "-1" : this.tabIndex;
		if(preventIEfocus){
			this.defer(function(){
				if(this.editNode){        // guard in case widget destroyed before timeout
					this.editNode.unselectable = "off";
				}
			});
		}
		if(has("mozilla") && !value && this._mozSettingProps){
			var ps = this._mozSettingProps;
			var n;
			for(n in ps){
				if(ps.hasOwnProperty(n)){
					try{
						this.document.execCommand(n, false, ps[n]);
					}catch(e2){
					}
				}
			}
		}
		this._disabledOK = true;
	},

/* Event handlers
 *****************/

	onLoad: function(/*String*/ html){
		// summary:
		//		Handler after the iframe finishes loading.
		// html: String
		//		Editor contents should be set to this value
		// tags:
		//		protected

		// TODO: rename this to _onLoad, make empty public onLoad() method, deprecate/make protected onLoadDeferred handler?

		if(!this.window.__registeredWindow){
			this.window.__registeredWindow = true;
			this._iframeRegHandle = focus.registerIframe(this.iframe);
		}

		// there's a wrapper div around the content, see _getIframeDocTxt().
		this.editNode = this.document.body.firstChild;
		var _this = this;

		// Helper code so IE and FF skip over focusing on the <iframe> and just focus on the inner <div>.
		// See #4996 IE wants to focus the BODY tag.
		this.beforeIframeNode = domConstruct.place("<div tabIndex=-1></div>", this.iframe, "before");
		this.afterIframeNode = domConstruct.place("<div tabIndex=-1></div>", this.iframe, "after");
		this.iframe.onfocus = this.document.onfocus = function(){
			_this.editNode.focus();
		};

		this.focusNode = this.editNode; // for InlineEditBox


		var events = this.events.concat(this.captureEvents);
		var ap = this.iframe ? this.document : this.editNode;
		array.forEach(events, function(item){
			this.connect(ap, item.toLowerCase(), item);
		}, this);

		this.connect(ap, "onmouseup", "onClick"); // mouseup in the margin does not generate an onclick event

		if(has("ie")){ // IE contentEditable
			this.connect(this.document, "onmousedown", "_onIEMouseDown"); // #4996 fix focus

			// give the node Layout on IE
			// TODO: this may no longer be needed, since we've reverted IE to using an iframe,
			// not contentEditable.   Removing it would also probably remove the need for creating
			// the extra <div> in _getIframeDocTxt()
			this.editNode.style.zoom = 1.0;
		}else{
			this.connect(this.document, "onmousedown", function(){
				// Clear the moveToStart focus, as mouse
				// down will set cursor point.  Required to properly
				// work with selection/position driven plugins and clicks in
				// the window. refs: #10678
				delete this._cursorToStart;
			});
		}

		if(has("webkit")){
			//WebKit sometimes doesn't fire right on selections, so the toolbar
			//doesn't update right.  Therefore, help it out a bit with an additional
			//listener.  A mouse up will typically indicate a display change, so fire this
			//and get the toolbar to adapt.  Reference: #9532
			this._webkitListener = this.connect(this.document, "onmouseup", "onDisplayChanged");
			this.connect(this.document, "onmousedown", function(e){
				var t = e.target;
				if(t && (t === this.document.body || t === this.document)){
					// Since WebKit uses the inner DIV, we need to check and set position.
					// See: #12024 as to why the change was made.
					setTimeout(lang.hitch(this, "placeCursorAtEnd"), 0);
				}
			});
		}

		if(has("ie")){
			// Try to make sure 'hidden' elements aren't visible in edit mode (like browsers other than IE
			// do).  See #9103
			try{
				this.document.execCommand('RespectVisibilityInDesign', true, null);
			}catch(e){/* squelch */}
		}

		this.isLoaded = true;

		this.set('disabled', this.disabled); // initialize content to editable (or not)

		// Note that setValue() call will only work after isLoaded is set to true (above)

		// Set up a function to allow delaying the setValue until a callback is fired
		// This ensures extensions like dijit.Editor have a way to hold the value set
		// until plugins load (and do things like register filters).
		var setContent = lang.hitch(this, function(){
			this.setValue(html);
			if(this.onLoadDeferred){
				this.onLoadDeferred.callback(true);
			}
			this.onDisplayChanged();
			if(this.focusOnLoad){
				// after the document loads, then set focus after updateInterval expires so that
				// onNormalizedDisplayChanged has run to avoid input caret issues
				ready(lang.hitch(this, function(){ setTimeout(lang.hitch(this, "focus"), this.updateInterval); }));
			}
			// Save off the initial content now
			this.value = this.getValue(true);
		});
		if(this.setValueDeferred){
			this.setValueDeferred.addCallback(setContent);
		}else{
			setContent();
		}
	},

	onKeyDown: function(/* Event */ e){
		// summary:
		//		Handler for onkeydown event
		// tags:
		//		protected

		// we need this event at the moment to get the events from control keys
		// such as the backspace. It might be possible to add this to Dojo, so that
		// keyPress events can be emulated by the keyDown and keyUp detection.

		if(e.keyCode === keys.TAB && this.isTabIndent){
			event.stop(e); //prevent tab from moving focus out of editor

			// FIXME: this is a poor-man's indent/outdent. It would be
			// better if it added 4 "&nbsp;" chars in an undoable way.
			// Unfortunately pasteHTML does not prove to be undoable
			if(this.queryCommandEnabled((e.shiftKey ? "outdent" : "indent"))){
				this.execCommand((e.shiftKey ? "outdent" : "indent"));
			}
		}

		// Make tab and shift-tab skip over the <iframe>, going from the nested <div> to the toolbar
		// or next element after the editor.   Needed on IE<9 and firefox.
		if(e.keyCode == keys.TAB && !this.isTabIndent){
			if(e.shiftKey && !e.ctrlKey && !e.altKey){
				// focus the <iframe> so the browser will shift-tab away from it instead
				this.beforeIframeNode.focus();
			}else if(!e.shiftKey && !e.ctrlKey && !e.altKey){
				// focus node after the <iframe> so the browser will tab away from it instead
				this.afterIframeNode.focus();
			}
		}

		if(has("ie") < 9 && e.keyCode === keys.BACKSPACE && this.document.selection.type === "Control"){
			// IE has a bug where if a non-text object is selected in the editor,
			// hitting backspace would act as if the browser's back button was
			// clicked instead of deleting the object. see #1069
			e.stopPropagation();
			e.preventDefault();
			this.execCommand("delete");
		}

		if(has("ff")){
			if(e.keyCode === keys.PAGE_UP || e.keyCode === keys.PAGE_DOWN ){
				if(this.editNode.clientHeight >= this.editNode.scrollHeight){
					// Stop the event to prevent firefox from trapping the cursor when there is no scroll bar.
					e.preventDefault();
				}
			}
		}
		return true;
	},

	onKeyUp: function(/*===== e =====*/){
		// summary:
		//		Handler for onkeyup event
		// tags:
		//      callback
	},

	setDisabled: function(/*Boolean*/ disabled){
		// summary:
		//		Deprecated, use set('disabled', ...) instead.
		// tags:
		//		deprecated
		kernel.deprecated('dijit.Editor::setDisabled is deprecated','use dijit.Editor::attr("disabled",boolean) instead', 2.0);
		this.set('disabled',disabled);
	},
	_setValueAttr: function(/*String*/ value){
		// summary:
		//      Registers that attr("value", foo) should call setValue(foo)
		this.setValue(value);
	},
	_setDisableSpellCheckAttr: function(/*Boolean*/ disabled){
		if(this.document){
			domAttr.set(this.document.body, "spellcheck", !disabled);
		}else{
			// try again after the editor is finished loading
			this.onLoadDeferred.addCallback(lang.hitch(this, function(){
				domAttr.set(this.document.body, "spellcheck", !disabled);
			}));
		}
		this._set("disableSpellCheck", disabled);
	},

	onKeyPress: function(e){
		// summary:
		//		Handle the various key events
		// tags:
		//		protected

		if(e.keyCode === keys.SHIFT ||
		   e.keyCode === keys.ALT ||
		   e.keyCode === keys.META ||
		   e.keyCode === keys.CTRL ||
		   (e.keyCode == keys.TAB && !this.isTabIndent && !e.ctrlKey && !e.altKey)){
			return true;
		}

		var c = (e.keyChar && e.keyChar.toLowerCase()) || e.keyCode,
			handlers = this._keyHandlers[c],
			args = arguments;
			
		if(handlers && !e.altKey){
			array.some(handlers, function(h){
				// treat meta- same as ctrl-, for benefit of mac users
				if(!(h.shift ^ e.shiftKey) && !(h.ctrl ^ (e.ctrlKey||e.metaKey))){ 
					if(!h.handler.apply(this, args)){
						e.preventDefault();
					}
					return true;
				}
			}, this);
		}

		// function call after the character has been inserted
		if(!this._onKeyHitch){
			this._onKeyHitch = lang.hitch(this, "onKeyPressed");
		}
		setTimeout(this._onKeyHitch, 1);
		return true;
	},

	addKeyHandler: function(/*String*/ key, /*Boolean*/ ctrl, /*Boolean*/ shift, /*Function*/ handler){
		// summary:
		//		Add a handler for a keyboard shortcut
		// description:
		//		The key argument should be in lowercase if it is a letter character
		// tags:
		//		protected
		if(!lang.isArray(this._keyHandlers[key])){
			this._keyHandlers[key] = [];
		}
		//TODO: would be nice to make this a hash instead of an array for quick lookups
		this._keyHandlers[key].push({
			shift: shift || false,
			ctrl: ctrl || false,
			handler: handler
		});
	},

	onKeyPressed: function(){
		// summary:
		//		Handler for after the user has pressed a key, and the display has been updated.
		//		(Runs on a timer so that it runs after the display is updated)
		// tags:
		//		private
		this.onDisplayChanged(/*e*/); // can't pass in e
	},

	onClick: function(/*Event*/ e){
		// summary:
		//		Handler for when the user clicks.
		// tags:
		//		private

		// console.info('onClick',this._tryDesignModeOn);
		this.onDisplayChanged(e);
	},

	_onIEMouseDown: function(){
		// summary:
		//		IE only to prevent 2 clicks to focus
		// tags:
		//		protected

		if(!this.focused && !this.disabled){
			this.focus();
		}
	},

	_onBlur: function(e){
		// summary:
		//		Called from focus manager when focus has moved away from this editor
		// tags:
		//		protected

		// console.info('_onBlur')

		this.inherited(arguments);

		var newValue = this.getValue(true);
		if(newValue !== this.value){
			this.onChange(newValue);
		}
		this._set("value", newValue);
	},

	_onFocus: function(/*Event*/ e){
		// summary:
		//		Called from focus manager when focus has moved into this editor
		// tags:
		//		protected

		// console.info('_onFocus')
		if(!this.disabled){
			if(!this._disabledOK){
				this.set('disabled', false);
			}
			this.inherited(arguments);
		}
	},

	// TODO: remove in 2.0
	blur: function(){
		// summary:
		//		Remove focus from this instance.
		// tags:
		//		deprecated
		if(!has("ie") && this.window.document.documentElement && this.window.document.documentElement.focus){
			this.window.document.documentElement.focus();
		}else if(win.doc.body.focus){
			win.doc.body.focus();
		}
	},

	focus: function(){
		// summary:
		//		Move focus to this editor
		if(!this.isLoaded){
			this.focusOnLoad = true;
			return;
		}
		if(this._cursorToStart){
			delete this._cursorToStart;
			if(this.editNode.childNodes){
				this.placeCursorAtStart(); // this calls focus() so return
				return;
			}
		}
		if(has("ie") < 9){
			//this.editNode.focus(); -> causes IE to scroll always (strict and quirks mode) to the top the Iframe
			// if we fire the event manually and let the browser handle the focusing, the latest
			// cursor position is focused like in FF
			this.iframe.fireEvent('onfocus', document.createEventObject()); // createEventObject/fireEvent only in IE < 11
		}else{
			// Firefox and chrome
			this.editNode.focus();
		}
	},

	// _lastUpdate: 0,
	updateInterval: 200,
	_updateTimer: null,
	onDisplayChanged: function(/*Event*/ /*===== e =====*/){
		// summary:
		//		This event will be fired every time the display context
		//		changes and the result needs to be reflected in the UI.
		// description:
		//		If you don't want to have update too often,
		//		onNormalizedDisplayChanged should be used instead
		// tags:
		//		private

		// var _t=new Date();
		if(this._updateTimer){
			clearTimeout(this._updateTimer);
		}
		if(!this._updateHandler){
			this._updateHandler = lang.hitch(this,"onNormalizedDisplayChanged");
		}
		this._updateTimer = setTimeout(this._updateHandler, this.updateInterval);

		// Technically this should trigger a call to watch("value", ...) registered handlers,
		// but getValue() is too slow to call on every keystroke so we don't.
	},
	onNormalizedDisplayChanged: function(){
		// summary:
		//		This event is fired every updateInterval ms or more
		// description:
		//		If something needs to happen immediately after a
		//		user change, please use onDisplayChanged instead.
		// tags:
		//		private
		delete this._updateTimer;
	},
	onChange: function(/*===== newContent =====*/){
		// summary:
		//		This is fired if and only if the editor loses focus and
		//		the content is changed.
	},
	_normalizeCommand: function(/*String*/ cmd, /*Anything?*/argument){
		// summary:
		//		Used as the advice function to map our
		//		normalized set of commands to those supported by the target
		//		browser.
		// tags:
		//		private

		var command = cmd.toLowerCase();
		if(command === "formatblock"){
			if(has("safari") && argument === undefined){ command = "heading"; }
		}else if(command === "hilitecolor" && !has("mozilla")){
			command = "backcolor";
		}

		return command;
	},

	_qcaCache: {},
	queryCommandAvailable: function(/*String*/ command){
		// summary:
		//		Tests whether a command is supported by the host. Clients
		//		SHOULD check whether a command is supported before attempting
		//		to use it, behaviour for unsupported commands is undefined.
		// command:
		//		The command to test for
		// tags:
		//		private

		// memoizing version. See _queryCommandAvailable for computing version
		var ca = this._qcaCache[command];
		if(ca !== undefined){ return ca; }
		return (this._qcaCache[command] = this._queryCommandAvailable(command));
	},

	_queryCommandAvailable: function(/*String*/ command){
		// summary:
		//		See queryCommandAvailable().
		// tags:
		//		private

		var ie = 1;
		var mozilla = 1 << 1;
		var webkit = 1 << 2;
		var opera = 1 << 3;

		function isSupportedBy(browsers){
			return {
				ie: Boolean(browsers & ie),
				mozilla: Boolean(browsers & mozilla),
				webkit: Boolean(browsers & webkit),
				opera: Boolean(browsers & opera)
			};
		}

		var supportedBy = null;

		switch(command.toLowerCase()){
			case "bold": case "italic": case "underline":
			case "subscript": case "superscript":
			case "fontname": case "fontsize":
			case "forecolor": case "hilitecolor":
			case "justifycenter": case "justifyfull": case "justifyleft":
			case "justifyright": case "delete": case "selectall": case "toggledir":
				supportedBy = isSupportedBy(mozilla | ie | webkit | opera);
				break;

			case "createlink": case "unlink": case "removeformat":
			case "inserthorizontalrule": case "insertimage":
			case "insertorderedlist": case "insertunorderedlist":
			case "indent": case "outdent": case "formatblock":
			case "inserthtml": case "undo": case "redo": case "strikethrough": case "tabindent":
				supportedBy = isSupportedBy(mozilla | ie | opera | webkit);
				break;

			case "blockdirltr": case "blockdirrtl":
			case "dirltr": case "dirrtl":
			case "inlinedirltr": case "inlinedirrtl":
				supportedBy = isSupportedBy(ie);
				break;
			case "cut": case "copy": case "paste":
				supportedBy = isSupportedBy( ie | mozilla | webkit);
				break;

			case "inserttable":
				supportedBy = isSupportedBy(mozilla | ie);
				break;

			case "insertcell": case "insertcol": case "insertrow":
			case "deletecells": case "deletecols": case "deleterows":
			case "mergecells": case "splitcell":
				supportedBy = isSupportedBy(ie | mozilla);
				break;

			default: return false;
		}

		return ((has("ie") || has("trident")) && supportedBy.ie) ||
			(has("mozilla") && supportedBy.mozilla) ||
			(has("webkit") && supportedBy.webkit) ||
			(has("opera") && supportedBy.opera);	// Boolean return true if the command is supported, false otherwise
	},

	execCommand: function(/*String*/ command, argument){
		// summary:
		//		Executes a command in the Rich Text area
		// command:
		//		The command to execute
		// argument:
		//		An optional argument to the command
		// tags:
		//		protected
		var returnValue;

		//focus() is required for IE to work
		//In addition, focus() makes sure after the execution of
		//the command, the editor receives the focus as expected
		if(this.focused){
			// put focus back in the iframe, unless focus has somehow been shifted out of the editor completely
			this.focus();
		}

		command = this._normalizeCommand(command, argument);
		
		if(argument !== undefined){
			if(command === "heading"){
				throw new Error("unimplemented");
			}else if(command === "formatblock" && (has("ie") || has("trident"))){
				argument = '<'+argument+'>';
			}
		}

		//Check to see if we have any over-rides for commands, they will be functions on this
		//widget of the form _commandImpl.  If we don't, fall through to the basic native
		//exec command of the browser.
		var implFunc = "_" + command + "Impl";
		if(this[implFunc]){
			returnValue = this[implFunc](argument);
		}else{
			argument = arguments.length > 1 ? argument : null;
			if(argument || command !== "createlink"){
				returnValue = this.document.execCommand(command, false, argument);
			}
		}

		this.onDisplayChanged();
		return returnValue;
	},

	queryCommandEnabled: function(/*String*/ command){
		// summary:
		//		Check whether a command is enabled or not.
		// command:
		//		The command to execute
		// tags:
		//		protected
		if(this.disabled || !this._disabledOK){ return false; }

		command = this._normalizeCommand(command);

		//Check to see if we have any over-rides for commands, they will be functions on this
		//widget of the form _commandEnabledImpl.  If we don't, fall through to the basic native
		//command of the browser.
		var implFunc = "_" + command + "EnabledImpl";

		if(this[implFunc]){
			return  this[implFunc](command);
		}else{
			return this._browserQueryCommandEnabled(command);
		}
	},

	queryCommandState: function(command){
		// summary:
		//		Check the state of a given command and returns true or false.
		// tags:
		//		protected

		if(this.disabled || !this._disabledOK){ return false; }
		command = this._normalizeCommand(command);
		try{
			return this.document.queryCommandState(command);
		}catch(e){
			//Squelch, occurs if editor is hidden on FF 3 (and maybe others.)
			return false;
		}
	},

	queryCommandValue: function(command){
		// summary:
		//		Check the value of a given command. This matters most for
		//		custom selections and complex values like font value setting.
		// tags:
		//		protected

		if(this.disabled || !this._disabledOK){ return false; }
		var r;
		command = this._normalizeCommand(command);
			if((has("ie") || has("trident")) && command === "formatblock"){
			r = this._native2LocalFormatNames[this.document.queryCommandValue(command)];
		}else if(has("mozilla") && command === "hilitecolor"){
			var oldValue;
			try{
				oldValue = this.document.queryCommandValue("styleWithCSS");
			}catch(e){
				oldValue = false;
			}
			this.document.execCommand("styleWithCSS", false, true);
			r = this.document.queryCommandValue(command);
			this.document.execCommand("styleWithCSS", false, oldValue);
		}else{
			r = this.document.queryCommandValue(command);
		}
		return r;
	},

	// Misc.

	_sCall: function(name, args){
		// summary:
		//		Run the named method of dijit._editor.selection over the
		//		current editor instance's window, with the passed args.
		// tags:
		//		private
		return win.withGlobal(this.window, name, selectionapi, args);
	},

	// FIXME: this is a TON of code duplication. Why?

	placeCursorAtStart: function(){
		// summary:
		//		Place the cursor at the start of the editing area.
		// tags:
		//		private

		this.focus();

		//see comments in placeCursorAtEnd
		var isvalid=false;
		if(has("mozilla")){
			// TODO:  Is this branch even necessary?
			var first=this.editNode.firstChild;
			while(first){
				if(first.nodeType === 3){
					if(first.nodeValue.replace(/^\s+|\s+$/g, "").length>0){
						isvalid=true;
						this._sCall("selectElement", [ first ]);
						break;
					}
				}else if(first.nodeType === 1){
					isvalid=true;
					var tg = first.tagName ? first.tagName.toLowerCase() : "";
					// Collapse before childless tags.
					if(/br|input|img|base|meta|area|basefont|hr|link/.test(tg)){
						this._sCall("selectElement", [ first ]);
					}else{
						// Collapse inside tags with children.
						this._sCall("selectElementChildren", [ first ]);
					}
					break;
				}
				first = first.nextSibling;
			}
		}else{
			isvalid=true;
			this._sCall("selectElementChildren", [ this.editNode ]);
		}
		if(isvalid){
			this._sCall("collapse", [ true ]);
		}
	},

	placeCursorAtEnd: function(){
		// summary:
		//		Place the cursor at the end of the editing area.
		// tags:
		//		private

		this.focus();

		//In mozilla, if last child is not a text node, we have to use
		// selectElementChildren on this.editNode.lastChild otherwise the
		// cursor would be placed at the end of the closing tag of
		//this.editNode.lastChild
		var isvalid=false;
		if(has("mozilla")){
			var last=this.editNode.lastChild;
			while(last){
				if(last.nodeType === 3){
					if(last.nodeValue.replace(/^\s+|\s+$/g, "").length>0){
						isvalid=true;
						this._sCall("selectElement", [ last ]);
						break;
					}
				}else if(last.nodeType === 1){
					isvalid=true;
					if(last.lastChild){
						this._sCall("selectElement", [ last.lastChild ]);
					}else{
						this._sCall("selectElement", [ last ]);
					}
					break;
				}
				last = last.previousSibling;
			}
		}else{
			isvalid=true;
			this._sCall("selectElementChildren", [ this.editNode ]);
		}
		if(isvalid){
			this._sCall("collapse", [ false ]);
		}
	},

	getValue: function(/*Boolean?*/ nonDestructive){
		// summary:
		//		Return the current content of the editing area (post filters
		//		are applied).  Users should call get('value') instead.
		//	nonDestructive:
		//		defaults to false. Should the post-filtering be run over a copy
		//		of the live DOM? Most users should pass "true" here unless they
		//		*really* know that none of the installed filters are going to
		//		mess up the editing session.
		// tags:
		//		private
		if(this.textarea){
			if(this.isClosed || !this.isLoaded){
				return this.textarea.value;
			}
		}

		return this._postFilterContent(null, nonDestructive);
	},
	_getValueAttr: function(){
		// summary:
		//		Hook to make attr("value") work
		return this.getValue(true);
	},

	setValue: function(/*String*/ html){
		// summary:
		//		This function sets the content. No undo history is preserved.
		//		Users should use set('value', ...) instead.
		// tags:
		//		deprecated

		// TODO: remove this and getValue() for 2.0, and move code to _setValueAttr()

		if(!this.isLoaded){
			// try again after the editor is finished loading
			this.onLoadDeferred.addCallback(lang.hitch(this, function(){
				this.setValue(html);
			}));
			return;
		}
		this._cursorToStart = true;
		if(this.textarea && (this.isClosed || !this.isLoaded)){
			this.textarea.value=html;
		}else{
			html = this._preFilterContent(html);
			var node = this.isClosed ? this.domNode : this.editNode;

			// Use &nbsp; to avoid webkit problems where editor is disabled until the user clicks it
			if(!html && has("webkit")){
				html = "&#160;";	// &nbsp;
			}
			node.innerHTML = html;
			this._preDomFilterContent(node);
		}

		this.onDisplayChanged();
		this._set("value", this.getValue(true));
	},

	replaceValue: function(/*String*/ html){
		// summary:
		//		This function set the content while trying to maintain the undo stack
		//		(now only works fine with Moz, this is identical to setValue in all
		//		other browsers)
		// tags:
		//		protected

		if(this.isClosed){
			this.setValue(html);
		}else if(this.window && this.window.getSelection && !has("mozilla")){ // Safari
			// look ma! it's a totally f'd browser!
			this.setValue(html);
		}else if(this.window && this.window.getSelection){ // Moz
			html = this._preFilterContent(html);
			this.execCommand("selectall");
			this.execCommand("inserthtml", html);
			this._preDomFilterContent(this.editNode);
		}else if(this.document && this.document.selection){//IE
			//In IE, when the first element is not a text node, say
			//an <a> tag, when replacing the content of the editing
			//area, the <a> tag will be around all the content
			//so for now, use setValue for IE too
			this.setValue(html);
		}

		this._set("value", this.getValue(true));
	},

	_preFilterContent: function(/*String*/ html){
		// summary:
		//		Filter the input before setting the content of the editing
		//		area. DOM pre-filtering may happen after this
		//		string-based filtering takes place but as of 1.2, this is not
		//		guaranteed for operations such as the inserthtml command.
		// tags:
		//		private

		var ec = html;
		array.forEach(this.contentPreFilters, function(ef){ if(ef){ ec = ef(ec); } });
		return ec;
	},
	_preDomFilterContent: function(/*DomNode*/ dom){
		// summary:
		//		filter the input's live DOM. All filter operations should be
		//		considered to be "live" and operating on the DOM that the user
		//		will be interacting with in their editing session.
		// tags:
		//		private
		dom = dom || this.editNode;
		array.forEach(this.contentDomPreFilters, function(ef){
			if(ef && lang.isFunction(ef)){
				ef(dom);
			}
		}, this);
	},

	_postFilterContent: function(
		/*DomNode|DomNode[]|String?*/ dom,
		/*Boolean?*/ nonDestructive){
		// summary:
		//		filter the output after getting the content of the editing area
		//
		// description:
		//		post-filtering allows plug-ins and users to specify any number
		//		of transforms over the editor's content, enabling many common
		//		use-cases such as transforming absolute to relative URLs (and
		//		vice-versa), ensuring conformance with a particular DTD, etc.
		//		The filters are registered in the contentDomPostFilters and
		//		contentPostFilters arrays. Each item in the
		//		contentDomPostFilters array is a function which takes a DOM
		//		Node or array of nodes as its only argument and returns the
		//		same. It is then passed down the chain for further filtering.
		//		The contentPostFilters array behaves the same way, except each
		//		member operates on strings. Together, the DOM and string-based
		//		filtering allow the full range of post-processing that should
		//		be necessaray to enable even the most agressive of post-editing
		//		conversions to take place.
		//
		//		If nonDestructive is set to "true", the nodes are cloned before
		//		filtering proceeds to avoid potentially destructive transforms
		//		to the content which may still needed to be edited further.
		//		Once DOM filtering has taken place, the serialized version of
		//		the DOM which is passed is run through each of the
		//		contentPostFilters functions.
		//
		//	dom:
		//		a node, set of nodes, which to filter using each of the current
		//		members of the contentDomPostFilters and contentPostFilters arrays.
		//
		//	nonDestructive:
		//		defaults to "false". If true, ensures that filtering happens on
		//		a clone of the passed-in content and not the actual node
		//		itself.
		//
		// tags:
		//		private

		var ec;
		if(!lang.isString(dom)){
			dom = dom || this.editNode;
			if(this.contentDomPostFilters.length){
				if(nonDestructive){
					dom = lang.clone(dom);
				}
				array.forEach(this.contentDomPostFilters, function(ef){
					dom = ef(dom);
				});
			}
			ec = htmlapi.getChildrenHtml(dom);
		}else{
			ec = dom;
		}

		if(!lang.trim(ec.replace(/^\xA0\xA0*/, '').replace(/\xA0\xA0*$/, '')).length){
			ec = "";
		}

		//	if(has("ie")){
		//		//removing appended <P>&nbsp;</P> for IE
		//		ec = ec.replace(/(?:<p>&nbsp;</p>[\n\r]*)+$/i,"");
		//	}
		array.forEach(this.contentPostFilters, function(ef){
			ec = ef(ec);
		});

		return ec;
	},

	_saveContent: function(){
		// summary:
		//		Saves the content in an onunload event if the editor has not been closed
		// tags:
		//		private

		var saveTextarea = dom.byId(dijit._scopeName + "._editor.RichText.value");
		if(saveTextarea){
			if(saveTextarea.value){
				saveTextarea.value += this._SEPARATOR;
			}
			saveTextarea.value += this.name + this._NAME_CONTENT_SEP + this.getValue(true);
		}
	},


	escapeXml: function(/*String*/ str, /*Boolean*/ noSingleQuotes){
		// summary:
		//		Adds escape sequences for special characters in XML.
		//		Optionally skips escapes for single quotes
		// tags:
		//		private

		str = str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;");
		if(!noSingleQuotes){
			str = str.replace(/'/gm, "&#39;");
		}
		return str; // string
	},

	getNodeHtml: function(/* DomNode */ node){
		// summary:
		//		Deprecated.   Use dijit/_editor/html::_getNodeHtml() instead.
		// tags:
		//		deprecated
		kernel.deprecated('dijit.Editor::getNodeHtml is deprecated','use dijit/_editor/html::getNodeHtml instead', 2);
		return htmlapi.getNodeHtml(node); // String
	},

	getNodeChildrenHtml: function(/* DomNode */ dom){
		// summary:
		//		Deprecated.   Use dijit/_editor/html::getChildrenHtml() instead.
		// tags:
		//		deprecated
		kernel.deprecated('dijit.Editor::getNodeChildrenHtml is deprecated','use dijit/_editor/html::getChildrenHtml instead', 2);
		return htmlapi.getChildrenHtml(dom);
	},

	close: function(/*Boolean?*/ save){
		// summary:
		//		Kills the editor and optionally writes back the modified contents to the
		//		element from which it originated.
		// save:
		//		Whether or not to save the changes. If false, the changes are discarded.
		// tags:
		//		private

		if(this.isClosed){ return; }

		if(!arguments.length){ save = true; }
		if(save){
			this._set("value", this.getValue(true));
		}

		// line height is squashed for iframes
		// FIXME: why was this here? if(this.iframe){ this.domNode.style.lineHeight = null; }

		if(this.interval){ clearInterval(this.interval); }

		if(this._webkitListener){
			//Cleaup of WebKit fix: #9532
			this.disconnect(this._webkitListener);
			delete this._webkitListener;
		}

		// Guard against memory leaks on IE (see #9268)
		if(has("ie")){
			 this.iframe.onfocus = null;
		}
		this.iframe._loadFunc = null;

		if(this._iframeRegHandle){
			this._iframeRegHandle.remove();
			delete this._iframeRegHandle;
		}

		if(this.textarea){
			var s = this.textarea.style;
			s.position = "";
			s.left = s.top = "";
			if(has("ie")){
				s.overflow = this.__overflow;
				this.__overflow = null;
			}
			this.textarea.value = this.value;
			domConstruct.destroy(this.domNode);
			this.domNode = this.textarea;
		}else{
			// Note that this destroys the iframe
			this.domNode.innerHTML = this.value;
		}
		delete this.iframe;

		domClass.remove(this.domNode, this.baseClass);
		this.isClosed = true;
		this.isLoaded = false;

		delete this.editNode;
		delete this.focusNode;

		if(this.window && this.window._frameElement){
			this.window._frameElement = null;
		}

		this.window = null;
		this.document = null;
		this.editingArea = null;
		this.editorObject = null;
	},

	destroy: function(){
		if(!this.isClosed){ this.close(false); }
		if(this._updateTimer){
			clearTimeout(this._updateTimer);
		}
		this.inherited(arguments);
		if(RichText._globalSaveHandler){
			delete RichText._globalSaveHandler[this.id];
		}
	},

	_removeMozBogus: function(/* String */ html){
		// summary:
		//		Post filter to remove unwanted HTML attributes generated by mozilla
		// tags:
		//		private
		return html.replace(/\stype="_moz"/gi, '').replace(/\s_moz_dirty=""/gi, '').replace(/_moz_resizing="(true|false)"/gi,''); // String
	},
	_removeWebkitBogus: function(/* String */ html){
		// summary:
		//		Post filter to remove unwanted HTML attributes generated by webkit
		// tags:
		//		private
		html = html.replace(/\sclass="webkit-block-placeholder"/gi, '');
		html = html.replace(/\sclass="apple-style-span"/gi, '');
		// For some reason copy/paste sometime adds extra meta tags for charset on
		// webkit (chrome) on mac.They need to be removed.  See: #12007"
		html = html.replace(/<meta charset=\"utf-8\" \/>/gi, '');
		return html; // String
	},
	_normalizeFontStyle: function(/* String */ html){
		// summary:
		//		Convert 'strong' and 'em' to 'b' and 'i'.
		// description:
		//		Moz can not handle strong/em tags correctly, so to help
		//		mozilla and also to normalize output, convert them to 'b' and 'i'.
		//
		//		Note the IE generates 'strong' and 'em' rather than 'b' and 'i'
		// tags:
		//		private
		return html.replace(/<(\/)?strong([ \>])/gi, '<$1b$2')
			.replace(/<(\/)?em([ \>])/gi, '<$1i$2' ); // String
	},

	_preFixUrlAttributes: function(/* String */ html){
		// summary:
		//		Pre-filter to do fixing to href attributes on <a> and <img> tags
		// tags:
		//		private
		return html.replace(/(?:(<a(?=\s).*?\shref=)("|')(.*?)\2)|(?:(<a\s.*?href=)([^"'][^ >]+))/gi,
				'$1$4$2$3$5$2 _djrealurl=$2$3$5$2')
			.replace(/(?:(<img(?=\s).*?\ssrc=)("|')(.*?)\2)|(?:(<img\s.*?src=)([^"'][^ >]+))/gi,
				'$1$4$2$3$5$2 _djrealurl=$2$3$5$2'); // String
	},

	/*****************************************************************************
		The following functions implement HTML manipulation commands for various
		browser/contentEditable implementations.  The goal of them is to enforce
		standard behaviors of them.
	******************************************************************************/

	/*** queryCommandEnabled implementations ***/

	_browserQueryCommandEnabled: function(command){
		// summary:
		//		Implementation to call to the native queryCommandEnabled of the browser.
		// command:
		//		The command to check.
		// tags:
		//		protected
		if(!command) { return false; }
		var elem = has("ie") < 9 ? this.document.selection.createRange() : this.document;
		try{
			return elem.queryCommandEnabled(command);
		}catch(e){
			return false;
		}
	},

	_createlinkEnabledImpl: function(/*===== argument =====*/){
		// summary:
		//		This function implements the test for if the create link
		//		command should be enabled or not.
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var enabled = true;
		if(has("opera")){
			var sel = this.window.getSelection();
			if(sel.isCollapsed){
				enabled = true;
			}else{
				enabled = this.document.queryCommandEnabled("createlink");
			}
		}else{
			enabled = this._browserQueryCommandEnabled("createlink");
		}
		return enabled;
	},

	_unlinkEnabledImpl: function(/*===== argument =====*/){
		// summary:
		//		This function implements the test for if the unlink
		//		command should be enabled or not.
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var enabled = true;
		if(has("mozilla") || has("webkit")){
			enabled = this._sCall("hasAncestorElement", ["a"]);
		}else{
			enabled = this._browserQueryCommandEnabled("unlink");
		}
		return enabled;
	},

	_inserttableEnabledImpl: function(/*===== argument =====*/){
		// summary:
		//		This function implements the test for if the inserttable
		//		command should be enabled or not.
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var enabled = true;
		if(has("mozilla") || has("webkit")){
			enabled = true;
		}else{
			enabled = this._browserQueryCommandEnabled("inserttable");
		}
		return enabled;
	},

	_cutEnabledImpl: function(/*===== argument =====*/){
		// summary:
		//		This function implements the test for if the cut
		//		command should be enabled or not.
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var enabled = true;
		if(has("webkit")){
			// WebKit deems clipboard activity as a security threat and natively would return false
			var sel = this.window.getSelection();
			if(sel){ sel = sel.toString(); }
			enabled = !!sel;
		}else{
			enabled = this._browserQueryCommandEnabled("cut");
		}
		return enabled;
	},

	_copyEnabledImpl: function(/*===== argument =====*/){
		// summary:
		//		This function implements the test for if the copy
		//		command should be enabled or not.
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var enabled = true;
		if(has("webkit")){
			// WebKit deems clipboard activity as a security threat and natively would return false
			var sel = this.window.getSelection();
			if(sel){ sel = sel.toString(); }
			enabled = !!sel;
		}else{
			enabled = this._browserQueryCommandEnabled("copy");
		}
		return enabled;
	},

	_pasteEnabledImpl: function(/*===== argument =====*/){
		// summary:c
		//		This function implements the test for if the paste
		//		command should be enabled or not.
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var enabled = true;
		if(has("webkit")){
			return true;
		}else{
			enabled = this._browserQueryCommandEnabled("paste");
		}
		return enabled;
	},

	/*** execCommand implementations ***/

	_inserthorizontalruleImpl: function(argument){
		// summary:
		//		This function implements the insertion of HTML 'HR' tags.
		//		into a point on the page.  IE doesn't to it right, so
		//		we have to use an alternate form
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		if(has("ie")){
			return this._inserthtmlImpl("<hr>");
		}
		return this.document.execCommand("inserthorizontalrule", false, argument);
	},

	_unlinkImpl: function(argument){
		// summary:
		//		This function implements the unlink of an 'a' tag.
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		if((this.queryCommandEnabled("unlink")) && (has("mozilla") || has("webkit"))){
			var a = this._sCall("getAncestorElement", [ "a" ]);
			this._sCall("selectElement", [ a ]);
			return this.document.execCommand("unlink", false, null);
		}
		return this.document.execCommand("unlink", false, argument);
	},

	_hilitecolorImpl: function(argument){
		// summary:
		//		This function implements the hilitecolor command
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var returnValue;
		var isApplied = this._handleTextColorOrProperties("hilitecolor", argument);
		if(!isApplied){
			if(has("mozilla")){
				// mozilla doesn't support hilitecolor properly when useCSS is
				// set to false (bugzilla #279330)
				this.document.execCommand("styleWithCSS", false, true);
				console.log("Executing color command.");
				returnValue = this.document.execCommand("hilitecolor", false, argument);
				this.document.execCommand("styleWithCSS", false, false);
			}else{
				returnValue = this.document.execCommand("hilitecolor", false, argument);
			}
		}
		return returnValue;
	},

	_backcolorImpl: function(argument){
		// summary:
		//		This function implements the backcolor command
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		if(has("ie")){
			// Tested under IE 6 XP2, no problem here, comment out
			// IE weirdly collapses ranges when we exec these commands, so prevent it
			//	var tr = this.document.selection.createRange();
			argument = argument ? argument : null;
		}
		var isApplied = this._handleTextColorOrProperties("backcolor", argument);
		if(!isApplied){
			isApplied = this.document.execCommand("backcolor", false, argument);
		}
		return isApplied;
	},

	_forecolorImpl: function(argument){
		// summary:
		//		This function implements the forecolor command
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		if(has("ie")){
			// Tested under IE 6 XP2, no problem here, comment out
			// IE weirdly collapses ranges when we exec these commands, so prevent it
			//	var tr = this.document.selection.createRange();
			argument = argument? argument : null;
		}
		var isApplied = false;
		isApplied = this._handleTextColorOrProperties("forecolor", argument);
		if(!isApplied){
			isApplied = this.document.execCommand("forecolor", false, argument);
		}
		return isApplied;
	},

	_inserthtmlImpl: function(argument){
		// summary:
		//		This function implements the insertion of HTML content into
		//		a point on the page.
		// argument:
		//		The content to insert, if any.
		// tags:
		//		protected
		argument = this._preFilterContent(argument);
		var rv = true;
		if(has("ie") < 9){
			var insertRange = this.document.selection.createRange();
			if(this.document.selection.type.toUpperCase() === 'CONTROL'){
				var n = insertRange.item(0);
				while(insertRange.length){
					insertRange.remove(insertRange.item(0));
				}
				n.outerHTML = argument;
			}else{
				insertRange.pasteHTML(argument);
			}
			insertRange.select();
		}else if(has("trident") < 8){
			var insertRange;
			var selection = rangeapi.getSelection(this.window);
			if(selection && selection.rangeCount && selection.getRangeAt){
				insertRange = selection.getRangeAt(0);
				insertRange.deleteContents();

				var div = domConstruct.create('div');
				div.innerHTML = argument;
				var node, lastNode;
				var n = this.document.createDocumentFragment();
				while((node = div.firstChild)){
					lastNode = n.appendChild(node);
				}
				insertRange.insertNode(n);
				if(lastNode) {
					insertRange = insertRange.cloneRange();
					insertRange.setStartAfter(lastNode);
					insertRange.collapse(false);
					selection.removeAllRanges();
					selection.addRange(insertRange);
				}
			}
		}else if(has("mozilla") && !argument.length){
			//mozilla can not inserthtml an empty html to delete current selection
			//so we delete the selection instead in this case
			this._sCall("remove"); // FIXME
		}else{
			rv = this.document.execCommand("inserthtml", false, argument);
		}
		return rv;
	},

	_boldImpl: function(argument){
		// summary:
		//		This function implements an over-ride of the bold command.
		// argument:
		//		Not used, operates by selection.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			this._adaptIESelection();		
			applied = this._adaptIEFormatAreaAndExec("bold");
		}
		if(!applied){
			applied = this.document.execCommand("bold", false, argument);
		}
		return applied;
	},

	_italicImpl: function(argument){
		// summary:
		//		This function implements an over-ride of the italic command.
		// argument:
		//		Not used, operates by selection.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			this._adaptIESelection();			
			applied = this._adaptIEFormatAreaAndExec("italic");
		}
		if(!applied){
			applied = this.document.execCommand("italic", false, argument);
		}
		return applied;
	},

	_underlineImpl: function(argument){
		// summary:
		//		This function implements an over-ride of the underline command.
		// argument:
		//		Not used, operates by selection.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			this._adaptIESelection();			
			applied = this._adaptIEFormatAreaAndExec("underline");
		}
		if(!applied){
			applied = this.document.execCommand("underline", false, argument);
		}
		return applied;
	},

	_strikethroughImpl: function(argument){
		// summary:
		//		This function implements an over-ride of the strikethrough command.
		// argument:
		//		Not used, operates by selection.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			this._adaptIESelection();			
			applied = this._adaptIEFormatAreaAndExec("strikethrough");
		}
		if(!applied){
			applied = this.document.execCommand("strikethrough", false, argument);
		}
		return applied;
	},

	_superscriptImpl: function(argument){
		// summary:
		//		This function implements an over-ride of the superscript command.
		// argument:
		//		Not used, operates by selection.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			this._adaptIESelection();			
			applied = this._adaptIEFormatAreaAndExec("superscript");
		}
		if(!applied){
			applied = this.document.execCommand("superscript", false, argument);
		}
		return applied;
	},

	_subscriptImpl: function(argument){
		// summary:
		//		This function implements an over-ride of the superscript command.
		// argument:
		//		Not used, operates by selection.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			this._adaptIESelection();			
			applied = this._adaptIEFormatAreaAndExec("subscript");
			
		}
		if(!applied){
			applied = this.document.execCommand("subscript", false, argument);
		}
		return applied;
	},
	
	_fontnameImpl: function(argument){
		// summary:
		//		This function implements the fontname command
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var isApplied;
		if(has("ie") || has("trident")){
			isApplied = this._handleTextColorOrProperties("fontname", argument);
		}
		if(!isApplied){
			isApplied = this.document.execCommand("fontname", false, argument);
		}
		return isApplied;
	},

	_fontsizeImpl: function(argument){
		// summary:
		//		This function implements the fontsize command
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var isApplied;
		if(has("ie") || has("trident")){
			isApplied = this._handleTextColorOrProperties("fontsize", argument);
		}
		if(!isApplied){
			isApplied = this.document.execCommand("fontsize", false, argument);
		}
		return isApplied;
	},
	
	_insertorderedlistImpl: function(argument){
		// summary:
		//		This function implements the insertorderedlist command
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			applied = this._adaptIEList("insertorderedlist", argument);
		}
		if(!applied){
			applied = this.document.execCommand("insertorderedlist", false, argument);
		}
		return applied;
	},
	
	_insertunorderedlistImpl: function(argument){
		// summary:
		//		This function implements the insertunorderedlist command
		// argument:
		//		arguments to the exec command, if any.
		// tags:
		//		protected
		var applied = false;
		if(has("ie") || has("trident")){
			applied = this._adaptIEList("insertunorderedlist", argument);
		}
		if(!applied){
			applied = this.document.execCommand("insertunorderedlist", false, argument);
		}
		return applied;
	},
	
	getHeaderHeight: function(){
		// summary:
		//		A function for obtaining the height of the header node
		return this._getNodeChildrenHeight(this.header); // Number
	},

	getFooterHeight: function(){
		// summary:
		//		A function for obtaining the height of the footer node
		return this._getNodeChildrenHeight(this.footer); // Number
	},

	_getNodeChildrenHeight: function(node){
		// summary:
		//		An internal function for computing the cumulative height of all child nodes of 'node'
		// node:
		//		The node to process the children of;
		var h = 0;
		if(node && node.childNodes){
			// IE didn't compute it right when position was obtained on the node directly is some cases,
			// so we have to walk over all the children manually.
			var i;
			for(i = 0; i < node.childNodes.length; i++){
				var size = domGeometry.position(node.childNodes[i]);
				h += size.h;
			}
		}
		return h; // Number
	},

	_isNodeEmpty: function(node, startOffset){
		// summary:
		//		Function to test if a node is devoid of real content.
		// node:
		//		The node to check.
		// tags:
		//		private.
		if(node.nodeType === 1/*element*/){
			if(node.childNodes.length > 0){
				return this._isNodeEmpty(node.childNodes[0], startOffset);
	}
			return true;
		}else if(node.nodeType === 3/*text*/){
			return (node.nodeValue.substring(startOffset) === "");
		}
		return false;
	},

	_removeStartingRangeFromRange: function(node, range){
		// summary:
		//		Function to adjust selection range by removing the current
		//		start node.
		// node:
		//		The node to remove from the starting range.
		// range:
		//		The range to adapt.
		// tags:
		//		private
		if(node.nextSibling){
			range.setStart(node.nextSibling,0);
		}else{
			var parent = node.parentNode;
			while(parent && parent.nextSibling == null){
				//move up the tree until we find a parent that has another node, that node will be the next node
				parent = parent.parentNode;
			}
			if(parent){
				range.setStart(parent.nextSibling,0);
			}
		}
		return range;
	},

	_adaptIESelection: function(){
		// summary:
		//		Function to adapt the IE range by removing leading 'newlines'
		//		Needed to fix issue with bold/italics/underline not working if
		//		range included leading 'newlines'.
		//		In IE, if a user starts a selection at the very end of a line,
		//		then the native browser commands will fail to execute correctly.
		//		To work around the issue,  we can remove all empty nodes from
		//		the start of the range selection.
		var selection = rangeapi.getSelection(this.window);
		if(selection && selection.rangeCount && !selection.isCollapsed){
			var range = selection.getRangeAt(0);
			var firstNode = range.startContainer;
			var startOffset = range.startOffset;

			while(firstNode.nodeType === 3/*text*/ && startOffset >= firstNode.length && firstNode.nextSibling){
				//traverse the text nodes until we get to the one that is actually highlighted
				startOffset = startOffset - firstNode.length;
				firstNode = firstNode.nextSibling;
			}

			//Remove the starting ranges until the range does not start with an empty node.
			var lastNode=null;
			while(this._isNodeEmpty(firstNode, startOffset) && firstNode !== lastNode){
				lastNode =firstNode; //this will break the loop in case we can't find the next sibling
				range = this._removeStartingRangeFromRange(firstNode, range); //move the start container to the next node in the range
				firstNode = range.startContainer;
				startOffset = 0; //start at the beginning of the new starting range
			}
			selection.removeAllRanges();// this will work as long as users cannot select multiple ranges. I have not been able to do that in the editor.
			selection.addRange(range);
		}
	},
	
	_adaptIEFormatAreaAndExec: function(command){
		// summary:
		//		Function to handle IE's quirkiness regarding how it handles
		//		format commands on a word.  This involves a lit of node splitting
		//		and format cloning.
		// command:
		//		The format command, needed to check if the desired
		//		command is true or not.
		var selection = rangeapi.getSelection(this.window);
		var doc = this.document;
		var rs, ret, range, txt, startNode, endNode, breaker, sNode;
		if(command && selection && selection.isCollapsed){
			var isApplied = this.queryCommandValue(command);
			if(isApplied){
				
				// We have to split backwards until we hit the format
				var nNames = this._tagNamesForCommand(command);
				range = selection.getRangeAt(0);
				var fs = range.startContainer;
				if(fs.nodeType === 3){
					var offset = range.endOffset;
					if(fs.length < offset){
						//We are not looking from the right node, try to locate the correct one
						ret = this._adjustNodeAndOffset(rs, offset);
						fs = ret.node;
						offset = ret.offset;
					}
				}									
				var topNode;
				while(fs && fs !== this.editNode){
					// We have to walk back and see if this is still a format or not.
					// Hm, how do I do this?
					var tName = fs.tagName? fs.tagName.toLowerCase() : "";
					if(array.indexOf(nNames, tName) > -1){
						topNode = fs;
						break;
					}
					fs = fs.parentNode;
				}

				// Okay, we have a stopping place, time to split things apart.
				if(topNode){
					// Okay, we know how far we have to split backwards, so we have to split now.
					rs = range.startContainer;
					var newblock = doc.createElement(topNode.tagName);
					domConstruct.place(newblock, topNode, "after");
					if(rs && rs.nodeType === 3){
						// Text node, we have to split it.
						var nodeToMove, tNode;
						var endOffset = range.endOffset;
						if(rs.length < endOffset){
							//We are not splitting the right node, try to locate the correct one
							ret = this._adjustNodeAndOffset(rs, endOffset);
							rs = ret.node;
							endOffset = ret.offset;
						}
		
						txt = rs.nodeValue;
						startNode = doc.createTextNode(txt.substring(0, endOffset));
						var endText = txt.substring(endOffset, txt.length);
						if(endText){
							endNode = doc.createTextNode(endText);
						}
						// Place the split, then remove original nodes.
						domConstruct.place(startNode, rs, "before");
						if(endNode){
							breaker = doc.createElement("span");
							breaker.className = "ieFormatBreakerSpan";
							domConstruct.place(breaker, rs, "after");
							domConstruct.place(endNode, breaker, "after");
							endNode = breaker;
						}
						domConstruct.destroy(rs);
						
						// Okay, we split the text.  Now we need to see if we're
						// parented to the block element we're splitting and if
						// not, we have to split all the way up.  Ugh.
						var parentC = startNode.parentNode;
						var tagList = [];
						var tagData;
						while(parentC !== topNode){
							var tg = parentC.tagName;
							tagData = {tagName: tg};
							tagList.push(tagData);
														
							var newTg = doc.createElement(tg);
							// Clone over any 'style' data.
							if(parentC.style){
								if(newTg.style){
									if(parentC.style.cssText){
										newTg.style.cssText = parentC.style.cssText;
										tagData.cssText = parentC.style.cssText;
									}
								}
							}
							// If font also need to clone over any font data.
							if(parentC.tagName === "FONT"){
								if(parentC.color){
									newTg.color = parentC.color;
									tagData.color = parentC.color;
								}
								if(parentC.face){
									newTg.face = parentC.face;
									tagData.face = parentC.face;
								}
								if(parentC.size){  // this check was necessary on IE
									newTg.size = parentC.size;
									tagData.size = parentC.size;
								}
							}
							if(parentC.className){
								newTg.className = parentC.className;
								tagData.className = parentC.className;
							}
							
							// Now move end node and every sibling 
							// after it over into the new tag.
							if(endNode){
								nodeToMove = endNode;
								while(nodeToMove){
									tNode = nodeToMove.nextSibling;
									newTg.appendChild(nodeToMove);
									nodeToMove = tNode;
								}
							}
							if(newTg.tagName == parentC.tagName){
								breaker = doc.createElement("span");
								breaker.className = "ieFormatBreakerSpan";
								domConstruct.place(breaker, parentC, "after");
								domConstruct.place(newTg, breaker, "after");
							}else{
								domConstruct.place(newTg, parentC, "after");
							}
							startNode = parentC;
							endNode = newTg;
							parentC = parentC.parentNode;
						}

						// Lastly, move the split out all the split tags 
						// to the new block as they should now be split properly.
						if(endNode){
							nodeToMove = endNode;
							if(nodeToMove.nodeType === 1 || (nodeToMove.nodeType === 3 && nodeToMove.nodeValue)){
								// Non-blank text and non-text nodes need to clear out that blank space
								// before moving the contents.
								newblock.innerHTML = "";
							}
							while(nodeToMove){
								tNode = nodeToMove.nextSibling;
								newblock.appendChild(nodeToMove);
								nodeToMove = tNode;
							}
						}
						
						// We had intermediate tags, we have to now recreate them inbetween the split
						// and restore what styles, classnames, etc, we can.  
						if(tagList.length){
							tagData = tagList.pop();
							var newContTag = doc.createElement(tagData.tagName);
							if(tagData.cssText && newContTag.style){
								newContTag.style.cssText = tagData.cssText;
							}
							if(tagData.className){
								newContTag.className = tagData.className;
							}
							if(tagData.tagName === "FONT"){
								if(tagData.color){
									newContTag.color = tagData.color;
								}
								if(tagData.face){
									newContTag.face = tagData.face;
								}
								if(tagData.size){ 
									newContTag.size = tagData.size;
								}
							}								
							domConstruct.place(newContTag, newblock, "before");
							while(tagList.length){
								tagData = tagList.pop();
								var newTgNode = doc.createElement(tagData.tagName);
								if(tagData.cssText && newTgNode.style){
									newTgNode.style.cssText = tagData.cssText;
								}
								if(tagData.className){
									newTgNode.className = tagData.className;
								}
								if(tagData.tagName === "FONT"){
									if(tagData.color){
										newTgNode.color = tagData.color;
									}
									if(tagData.face){
										newTgNode.face = tagData.face;
									}
									if(tagData.size){ 
										newTgNode.size = tagData.size;
									}
								}	
								newContTag.appendChild(newTgNode);
								newContTag = newTgNode;
							}							
							
							// Okay, everything is theoretically split apart and removed from the content
							// so insert the dummy text to select, select it, then
							// clear to position cursor.
							sNode = doc.createTextNode(".");
							breaker.appendChild(sNode);
							newContTag.appendChild(sNode);
							win.withGlobal(this.window, lang.hitch(this, function(){
								var newrange = rangeapi.create();
								newrange.setStart(sNode, 0);
								newrange.setEnd(sNode, sNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								selectionapi.collapse(false);
								sNode.parentNode.innerHTML = "";
							}));							
						}else{
							// No extra tags, so we have to insert a breaker point and rely
							// on filters to remove it later.
							breaker = doc.createElement("span");
							breaker.className="ieFormatBreakerSpan";
							sNode = doc.createTextNode(".");
							breaker.appendChild(sNode);
							domConstruct.place(breaker, newblock, "before");
							win.withGlobal(this.window, lang.hitch(this, function(){
								var newrange = rangeapi.create();
								newrange.setStart(sNode, 0);
								newrange.setEnd(sNode, sNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								selectionapi.collapse(false);
								sNode.parentNode.innerHTML = "";
							}));
						}
						if(!newblock.firstChild){
							// Empty, we don't need it.  Split was at end or similar
							// So, remove it.
							domConstruct.destroy(newblock);
						}					
						return true;
					}
				}
				return false;
			}else{
				range = selection.getRangeAt(0);
				rs = range.startContainer;
				if(rs && rs.nodeType === 3){
					// Text node, we have to split it.
					win.withGlobal(this.window, lang.hitch(this, function(){
						var offset = range.startOffset;
						if(rs.length < offset){
							//We are not splitting the right node, try to locate the correct one
							ret = this._adjustNodeAndOffset(rs, offset);
							rs = ret.node;
							offset = ret.offset;
						}
						txt = rs.nodeValue;
						startNode = doc.createTextNode(txt.substring(0, offset));
						var endText = txt.substring(offset);
						if(endText !== ""){
							endNode = doc.createTextNode(txt.substring(offset));
						}
						// Create a space, we'll select and bold it, so 
						// the whole word doesn't get bolded
						breaker = doc.createElement("span");
						sNode = doc.createTextNode(".");
						breaker.appendChild(sNode);
						if(startNode.length){
							domConstruct.place(startNode, rs, "after");
						}else{
							startNode = rs;
						}
						domConstruct.place(breaker, startNode, "after");
						if(endNode){
							domConstruct.place(endNode, breaker, "after");
						}
						domConstruct.destroy(rs);
						var newrange = rangeapi.create();
						newrange.setStart(sNode, 0);
						newrange.setEnd(sNode, sNode.length);
						selection.removeAllRanges();
						selection.addRange(newrange);
						doc.execCommand(command);
						domConstruct.place(breaker.firstChild, breaker, "before");
						domConstruct.destroy(breaker);
						newrange.setStart(sNode, 0);
						newrange.setEnd(sNode, sNode.length);
						selection.removeAllRanges();
						selection.addRange(newrange);
						selectionapi.collapse(false);
						sNode.parentNode.innerHTML = "";
					}));
					return true;
				}
			}
		}else{
			return false;
		}
	},
	
	_adaptIEList: function(command /*===== , argument =====*/){
		// summary:
		//		This function handles normalizing the IE list behavior as 
		//		much as possible.
		// command:
		//		The list command to execute.
		// argument:
		//		Any additional argument.
		// tags:
		//		private
		var selection = rangeapi.getSelection(this.window);
		if(selection.isCollapsed){
			// In the case of no selection, lets commonize the behavior and
			// make sure that it indents if needed.
			if(selection.rangeCount && !this.queryCommandValue(command)){
				var range = selection.getRangeAt(0);
				var sc = range.startContainer;
				if(sc && sc.nodeType == 3){
					// text node.  Lets see if there is a node before it that isn't
					// some sort of breaker.
					if(!range.startOffset){
						// We're at the beginning of a text area.  It may have been br split
						// Who knows?  In any event, we must create the list manually
						// or IE may shove too much into the list element.  It seems to
						// grab content before the text node too if it's br split.
						// Why can't IE work like everyone else?
						win.withGlobal(this.window, lang.hitch(this, function(){
							// Create a space, we'll select and bold it, so 
							// the whole word doesn't get bolded
							var lType = "ul";
							if(command === "insertorderedlist"){
								lType = "ol";
							}
							var list = domConstruct.create(lType);
							var li = domConstruct.create("li", null, list);
							domConstruct.place(list, sc, "before");
							// Move in the text node as part of the li.
							li.appendChild(sc);
							// We need a br after it or the enter key handler
							// sometimes throws errors.
							domConstruct.create("br", null, list, "after");
							// Okay, now lets move our cursor to the beginning.
							var newrange = rangeapi.create();
							newrange.setStart(sc, 0);
							newrange.setEnd(sc, sc.length);
							selection.removeAllRanges();
							selection.addRange(newrange);
							selectionapi.collapse(true);
						}));
						return true;
					}
				}
			}
		}
		return false;
	},
	
	_handleTextColorOrProperties: function(command, argument){
		// summary:
		//		This function handles appplying text color as best it is 
		//		able to do so when the selection is collapsed, making the
		//		behavior cross-browser consistent. It also handles the name
		//		and size for IE.
		// command:
		//		The command.
		// argument:
		//		Any additional arguments.
		// tags:
		//		private
		var selection = rangeapi.getSelection(this.window);
		var doc = this.document;
		var rs, ret, range, txt, startNode, endNode, breaker, sNode;
		argument = argument || null;
		if(command && selection && selection.isCollapsed){
			if(selection.rangeCount){
				range = selection.getRangeAt(0);
				rs = range.startContainer;
				if(rs && rs.nodeType === 3){
					// Text node, we have to split it.
					win.withGlobal(this.window, lang.hitch(this, function(){
						var offset = range.startOffset;
						if(rs.length < offset){
							//We are not splitting the right node, try to locate the correct one
							ret = this._adjustNodeAndOffset(rs, offset);
							rs = ret.node;
							offset = ret.offset;
						}
						txt = rs.nodeValue;
						startNode = doc.createTextNode(txt.substring(0, offset));
						var endText = txt.substring(offset);
						if(endText !== ""){
							endNode = doc.createTextNode(txt.substring(offset));
						}
						// Create a space, we'll select and bold it, so 
						// the whole word doesn't get bolded
						breaker = domConstruct.create("span");
						sNode = doc.createTextNode(".");
						breaker.appendChild(sNode);
						// Create a junk node to avoid it trying to stlye the breaker.
						// This will get destroyed later.
						var extraSpan = domConstruct.create("span");
						breaker.appendChild(extraSpan);
						if(startNode.length){
							domConstruct.place(startNode, rs, "after");
						}else{
							startNode = rs;
						}
						domConstruct.place(breaker, startNode, "after");
						if(endNode){
							domConstruct.place(endNode, breaker, "after");
						}
						domConstruct.destroy(rs);
						var newrange = rangeapi.create();
						newrange.setStart(sNode, 0);
						newrange.setEnd(sNode, sNode.length);
						selection.removeAllRanges();
						selection.addRange(newrange);
						if(has("webkit")){
							// WebKit is frustrating with positioning the cursor. 
							// It stinks to have a selected space, but there really
							// isn't much choice here.
							var style = "color";
							if(command === "hilitecolor" || command === "backcolor"){
								style = "backgroundColor";
							}
							domStyle.set(breaker, style, argument);
							selectionapi.remove();
							domConstruct.destroy(extraSpan);
							breaker.innerHTML = "&#160;";	// &nbsp;
							selectionapi.selectElement(breaker);
							this.focus();
						}else{
							this.execCommand(command, argument);
							domConstruct.place(breaker.firstChild, breaker, "before");
							domConstruct.destroy(breaker);
							newrange.setStart(sNode, 0);
							newrange.setEnd(sNode, sNode.length);
							selection.removeAllRanges();
							selection.addRange(newrange);
							selectionapi.collapse(false);
							sNode.parentNode.removeChild(sNode);
						}
					}));
					return true;
				}
			}				
		}
		return false;
	},
	
	_adjustNodeAndOffset: function(/*DomNode*/node, /*Int*/offset){
		// summary:
		//		In the case there are multiple text nodes in a row the offset may not be within the node.  
		//		If the offset is larger than the node length, it will attempt to find
		//		the next text sibling until it locates the text node in which the offset refers to
		// node:
		//		The node to check.
		// offset:
		//		The position to find within the text node
		// tags:
		//		private.
		while(node.length < offset && node.nextSibling && node.nextSibling.nodeType === 3){
			//Adjust the offset and node in the case of multiple text nodes in a row
			offset = offset - node.length;
			node = node.nextSibling;
		}
		return {"node": node, "offset": offset};
	},
	
	_tagNamesForCommand: function(command){
		// summary:
		//		Function to return the tab names that are associated
		//		with a particular style.
		// command: String
		//		The command to return tags for.
		// tags:
		//		private
		if(command === "bold"){
			return ["b", "strong"];
		}else if(command === "italic"){
			return ["i","em"];
		}else if(command === "strikethrough"){
			return ["s", "strike"];
		}else if(command === "superscript"){
			return ["sup"];
		}else if(command === "subscript"){
			return ["sub"];
		}else if(command === "underline"){
			return ["u"];
		}	
		return [];
	},

	_stripBreakerNodes: function(node){
		// summary:
		//		Function for stripping out the breaker spans inserted by the formatting command.
		//		Registered as a filter for IE, handles the breaker spans needed to fix up
		//		How bold/italic/etc, work when selection is collapsed (single cursor).
		win.withGlobal(this.window, lang.hitch(this, function(){
			var breakers = query(".ieFormatBreakerSpan", node);
			var i;
			for(i = 0; i < breakers.length; i++){
				var b = breakers[i];
				while(b.firstChild){
					domConstruct.place(b.firstChild, b, "before");
				}
				domConstruct.destroy(b);
			}		
		}));
		return node;
	}
});

return RichText;

});

},
'url:dijit/form/templates/Button.html':"<span class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><span class=\"dijitReset dijitInline dijitButtonNode\"\n\t\tdata-dojo-attach-event=\"ondijitclick:_onClick\" role=\"presentation\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode,focusNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\"></span\n\t\t\t><span class=\"dijitReset dijitToggleButtonIconChar\">&#x25CF;</span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t\tdata-dojo-attach-point=\"containerNode\"\n\t\t\t></span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\"\n\t\ttabIndex=\"-1\" role=\"presentation\" data-dojo-attach-point=\"valueNode\"\n/></span>\n",
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
'dijit/_editor/selection':function(){
define("dijit/_editor/selection", [
	"dojo/dom", // dom.byId
	"dojo/_base/lang",
	"dojo/_base/sniff", // has("ie") has("opera")
	"dojo/_base/window", // win.body win.doc win.doc.createElement win.doc.selection win.doc.selection.createRange win.doc.selection.type.toLowerCase win.global win.global.getSelection
	".."		// for exporting symbols to dijit._editor.selection (TODO: remove in 2.0)
], function(dom, lang, has, win, dijit){

// module:
//		dijit/_editor/selection
// summary:
//		Text selection API


lang.getObject("_editor.selection", true, dijit);

// FIXME:
//		all of these methods branch internally for IE. This is probably
//		sub-optimal in terms of runtime performance. We should investigate the
//		size difference for differentiating at definition time.

lang.mixin(dijit._editor.selection, {
	getType: function(){
		// summary:
		//		Get the selection type (like win.doc.select.type in IE).
		if(!win.doc.getSelection){
			// IE6-8
			return win.doc.selection.type.toLowerCase();
		}else{
			// W3C
			var stype = "text";

			// Check if the actual selection is a CONTROL (IMG, TABLE, HR, etc...).
			var oSel;
			try{
				oSel = win.global.getSelection();
			}catch(e){ /*squelch*/ }

			if(oSel && oSel.rangeCount == 1){
				var oRange = oSel.getRangeAt(0);
				if(	(oRange.startContainer == oRange.endContainer) &&
					((oRange.endOffset - oRange.startOffset) == 1) &&
					(oRange.startContainer.nodeType != 3 /* text node*/)
				){
					stype = "control";
				}
			}
			return stype; //String
		}
	},

	getSelectedText: function(){
		// summary:
		//		Return the text (no html tags) included in the current selection or null if no text is selected
		if(!win.doc.getSelection){
			// IE6-8
			if(dijit._editor.selection.getType() == 'control'){
				return null;
			}
			return win.doc.selection.createRange().text;
		}else{
			// W3C
			var selection = win.global.getSelection();
			if(selection){
				return selection.toString(); //String
			}
		}
		return '';
	},

	getSelectedHtml: function(){
		// summary:
		//		Return the html text of the current selection or null if unavailable
		if(!win.doc.getSelection){
			// IE6-8
			if(dijit._editor.selection.getType() == 'control'){
				return null;
			}
			return win.doc.selection.createRange().htmlText;
		}else{
			// W3C
			var selection = win.global.getSelection();
			if(selection && selection.rangeCount){
				var i;
				var html = "";
				for(i = 0; i < selection.rangeCount; i++){
					//Handle selections spanning ranges, such as Opera
					var frag = selection.getRangeAt(i).cloneContents();
					var div = win.doc.createElement("div");
					div.appendChild(frag);
					html += div.innerHTML;
				}
				return html; //String
			}
			return null;
		}
	},

	getSelectedElement: function(){
		// summary:
		//		Retrieves the selected element (if any), just in the case that
		//		a single element (object like and image or a table) is
		//		selected.
		if(dijit._editor.selection.getType() == "control"){
			if(!win.doc.getSelection){
				// IE6-8
				var range = win.doc.selection.createRange();
				if(range && range.item){
					return win.doc.selection.createRange().item(0);
				}
			}else{
				// W3C
				var selection = win.global.getSelection();
				return selection.anchorNode.childNodes[ selection.anchorOffset ];
			}
		}
		return null;
	},

	getParentElement: function(){
		// summary:
		//		Get the parent element of the current selection
		if(dijit._editor.selection.getType() == "control"){
			var p = this.getSelectedElement();
			if(p){ return p.parentNode; }
		}else{
			if(!win.doc.getSelection){
				// IE6-8
				var r = win.doc.selection.createRange();
				r.collapse(true);
				return r.parentElement();
			}else{
				// W3C
				var selection = win.global.getSelection();
				if(selection){
					var node = selection.anchorNode;
					while(node && (node.nodeType != 1)){ // not an element
						node = node.parentNode;
					}
					return node;
				}
			}
		}
		return null;
	},

	hasAncestorElement: function(/*String*/tagName /* ... */){
		// summary:
		// 		Check whether current selection has a  parent element which is
		// 		of type tagName (or one of the other specified tagName)
		// tagName: String
		//		The tag name to determine if it has an ancestor of.
		return this.getAncestorElement.apply(this, arguments) != null; //Boolean
	},

	getAncestorElement: function(/*String*/tagName /* ... */){
		// summary:
		//		Return the parent element of the current selection which is of
		//		type tagName (or one of the other specified tagName)
		// tagName: String
		//		The tag name to determine if it has an ancestor of.
		var node = this.getSelectedElement() || this.getParentElement();
		return this.getParentOfType(node, arguments); //DOMNode
	},

	isTag: function(/*DomNode*/ node, /*String[]*/ tags){
		// summary:
		//		Function to determine if a node is one of an array of tags.
		// node:
		//		The node to inspect.
		// tags:
		//		An array of tag name strings to check to see if the node matches.
		if(node && node.tagName){
			var _nlc = node.tagName.toLowerCase();
			for(var i=0; i<tags.length; i++){
				var _tlc = String(tags[i]).toLowerCase();
				if(_nlc == _tlc){
					return _tlc; // String
				}
			}
		}
		return "";
	},

	getParentOfType: function(/*DomNode*/ node, /*String[]*/ tags){
		// summary:
		//		Function to locate a parent node that matches one of a set of tags
		// node:
		//		The node to inspect.
		// tags:
		//		An array of tag name strings to check to see if the node matches.
		while(node){
			if(this.isTag(node, tags).length){
				return node; // DOMNode
			}
			node = node.parentNode;
		}
		return null;
	},

	collapse: function(/*Boolean*/beginning){
		// summary:
		//		Function to collapse (clear), the current selection
		// beginning: Boolean
		//		Boolean to indicate whether to collapse the cursor to the beginning of the selection or end.
		if(window.getSelection){
			var selection = win.global.getSelection();
			if(selection.removeAllRanges){ // Mozilla
				if(beginning){
					selection.collapseToStart();
				}else{
					selection.collapseToEnd();
				}
			}else{ // Safari
				// pulled from WebCore/ecma/kjs_window.cpp, line 2536
				selection.collapse(beginning);
			}
		}else if(has("ie")){ // IE
			var range = win.doc.selection.createRange();
			range.collapse(beginning);
			range.select();
		}
	},

	remove: function(){
		// summary:
		//		Function to delete the currently selected content from the document.
		var sel = win.doc.selection;
		if(!win.doc.getSelection){
			// IE6-8
			if(sel.type.toLowerCase() != "none"){
				sel.clear();
			}
			return sel; //Selection
		}else{
			// W3C
			sel = win.global.getSelection();
			sel.deleteFromDocument();
			return sel; //Selection
		}
	},

	selectElementChildren: function(/*DomNode*/element,/*Boolean?*/nochangefocus){
		// summary:
		//		clear previous selection and select the content of the node
		//		(excluding the node itself)
		// element: DOMNode
		//		The element you wish to select the children content of.
		// nochangefocus: Boolean
		//		Boolean to indicate if the foxus should change or not.
		var global = win.global;
		var doc = win.doc;
		var range;
		element = dom.byId(element);
		if(doc.selection && !doc.getSelection && win.body().createTextRange){
			// IE6-8
			range = element.ownerDocument.body.createTextRange();
			range.moveToElementText(element);
			if(!nochangefocus){
				try{
					range.select(); // IE throws an exception here if the widget is hidden.  See #5439
				}catch(e){ /* squelch */}
			}
		}else if(global.getSelection){
			// W3C
			var selection = win.global.getSelection();
			if(has("opera")){
				//Opera's selectAllChildren doesn't seem to work right
				//against <body> nodes and possibly others ... so
				//we use the W3C range API
				if(selection.rangeCount){
					range = selection.getRangeAt(0);
				}else{
					range = doc.createRange();
				}
				range.setStart(element, 0);
				range.setEnd(element,(element.nodeType == 3)?element.length:element.childNodes.length);
				selection.addRange(range);
			}else{
				selection.selectAllChildren(element);
			}
		}
	},

	selectElement: function(/*DomNode*/element,/*Boolean?*/nochangefocus){
		// summary:
		//		clear previous selection and select element (including all its children)
		// element:  DOMNode
		//		The element to select.
		// nochangefocus: Boolean
		//		Boolean indicating if the focus should be changed.  IE only.
		var range;
		var doc = win.doc;
		var global = win.global;
		element = dom.byId(element);
		if(!doc.getSelection && win.body().createTextRange){
			// IE6-8
			try{
				var tg = element.tagName ? element.tagName.toLowerCase() : "";
				if(tg === "img" || tg === "table"){
					range = win.body().createControlRange();
				}else{
					range = win.body().createRange();
				}
				range.addElement(element);
				if(!nochangefocus){
					range.select();
				}
			}catch(e){
				this.selectElementChildren(element,nochangefocus);
			}
		}else if(global.getSelection){
			// W3C
			var selection = global.getSelection();
			range = doc.createRange();
			if(selection.removeAllRanges){ // Mozilla
				// FIXME: does this work on Safari?
				if(has("opera")){
					//Opera works if you use the current range on
					//the selection if present.
					if(selection.getRangeAt(0)){
						range = selection.getRangeAt(0);
					}
				}
				range.selectNode(element);
				selection.removeAllRanges();
				selection.addRange(range);
			}
		}
	},

	inSelection: function(node){
		// summary:
		//		This function determines if 'node' is
		//		in the current selection.
		// tags:
		//		public
		if(node){
			var newRange;
			var doc = win.doc;
			var range;

			if(win.global.getSelection){
				//WC3
				var sel = win.global.getSelection();
				if(sel && sel.rangeCount > 0){
					range = sel.getRangeAt(0);
				}
				if(range && range.compareBoundaryPoints && doc.createRange){
					try{
						newRange = doc.createRange();
						newRange.setStart(node, 0);
						if(range.compareBoundaryPoints(range.START_TO_END, newRange) === 1){
							return true;
						}
					}catch(e){ /* squelch */}
				}
			}else if(doc.selection){
				// Probably IE, so we can't use the range object as the pseudo
				// range doesn't implement the boundry checking, we have to
				// use IE specific crud.
				range = doc.selection.createRange();
				try{
					newRange = node.ownerDocument.body.createControlRange();
					if(newRange){
						newRange.addElement(node);
					}
				}catch(e1){
					try{
						newRange = node.ownerDocument.body.createTextRange();
						newRange.moveToElementText(node);
					}catch(e2){/* squelch */}
				}
				if(range && newRange){
					// We can finally compare similar to W3C
					if(range.compareEndPoints("EndToStart", newRange) === 1){
						return true;
					}
				}
			}
		}
		return false; // boolean
	}

});

return dijit._editor.selection;
});

},
'dijit/_editor/plugins/EnterKeyHandling':function(){
define("dijit/_editor/plugins/EnterKeyHandling", [
	"dojo/_base/declare", // declare
	"dojo/dom-construct", // domConstruct.destroy domConstruct.place
	"dojo/_base/event", // event.stop
	"dojo/keys", // keys.ENTER
	"dojo/_base/lang",
	"dojo/_base/sniff", // has("ie") has("mozilla") has("webkit")
	"dojo/_base/window", // win.global win.withGlobal
	"dojo/window", // winUtils.scrollIntoView
	"../_Plugin",
	"../RichText",
	"../range",
	"../selection"
], function(declare, domConstruct, event, keys, lang, has, win, winUtils, _Plugin, RichText, rangeapi, selectionapi){

/*=====
	var _Plugin = dijit._editor._Plugin;
=====*/

// module:
//		dijit/_editor/plugins/EnterKeyHandling
// summary:
//		This plugin tries to make all browsers behave consistently with regard to
//		how ENTER behaves in the editor window.  It traps the ENTER key and alters
//		the way DOM is constructed in certain cases to try to commonize the generated
//		DOM and behaviors across browsers.


return declare("dijit._editor.plugins.EnterKeyHandling", _Plugin, {
	// summary:
	//		This plugin tries to make all browsers behave consistently with regard to
	//		how ENTER behaves in the editor window.  It traps the ENTER key and alters
	//		the way DOM is constructed in certain cases to try to commonize the generated
	//		DOM and behaviors across browsers.
	//
	// description:
	//		This plugin has three modes:
	//
	//			* blockNodeForEnter=BR
	//			* blockNodeForEnter=DIV
	//			* blockNodeForEnter=P
	//
	//		In blockNodeForEnter=P, the ENTER key starts a new
	//		paragraph, and shift-ENTER starts a new line in the current paragraph.
	//		For example, the input:
	//
	//		|	first paragraph <shift-ENTER>
	//		|	second line of first paragraph <ENTER>
	//		|	second paragraph
	//
	//		will generate:
	//
	//		|	<p>
	//		|		first paragraph
	//		|		<br/>
	//		|		second line of first paragraph
	//		|	</p>
	//		|	<p>
	//		|		second paragraph
	//		|	</p>
	//
	//		In BR and DIV mode, the ENTER key conceptually goes to a new line in the
	//		current paragraph, and users conceptually create a new paragraph by pressing ENTER twice.
	//		For example, if the user enters text into an editor like this:
	//
	//		|		one <ENTER>
	//		|		two <ENTER>
	//		|		three <ENTER>
	//		|		<ENTER>
	//		|		four <ENTER>
	//		|		five <ENTER>
	//		|		six <ENTER>
	//
	//		It will appear on the screen as two 'paragraphs' of three lines each.  Markupwise, this generates:
	//
	//		BR:
	//		|		one<br/>
	//		|		two<br/>
	//		|		three<br/>
	//		|		<br/>
	//		|		four<br/>
	//		|		five<br/>
	//		|		six<br/>
	//
	//		DIV:
	//		|		<div>one</div>
	//		|		<div>two</div>
	//		|		<div>three</div>
	//		|		<div>&nbsp;</div>
	//		|		<div>four</div>
	//		|		<div>five</div>
	//		|		<div>six</div>

	// blockNodeForEnter: String
	//		This property decides the behavior of Enter key. It can be either P,
	//		DIV, BR, or empty (which means disable this feature). Anything else
	//		will trigger errors.  The default is 'BR'
	//
	//		See class description for more details.
	blockNodeForEnter: 'BR',

	constructor: function(args){
		if(args){
			if("blockNodeForEnter" in args){
				args.blockNodeForEnter = args.blockNodeForEnter.toUpperCase();
			}
			lang.mixin(this,args);
		}
	},

	setEditor: function(editor){
		// Overrides _Plugin.setEditor().
		if(this.editor === editor){ return; }
		this.editor = editor;
		if(this.blockNodeForEnter == 'BR'){
			// While Moz has a mode tht mostly works, it's still a little different,
			// So, try to just have a common mode and be consistent.  Which means
			// we need to enable customUndo, if not already enabled.
			this.editor.customUndo = true;
				editor.onLoadDeferred.then(lang.hitch(this,function(d){
					this.connect(editor.document, "onkeypress", function(e){
						if(e.charOrCode == keys.ENTER){
							// Just do it manually.  The handleEnterKey has a shift mode that
							// Always acts like <br>, so just use it.
							var ne = lang.mixin({},e);
							ne.shiftKey = true;
							if(!this.handleEnterKey(ne)){
								event.stop(e);
							}
						}
					});
					if(has("ie") >= 9){
						this.connect(editor.document, "onpaste", function(e){
							setTimeout(dojo.hitch(this, function(){
								// Use the old range/selection code to kick IE 9 into updating
								// its range by moving it back, then forward, one 'character'.
								var r = this.editor.document.selection.createRange();
								r.move('character',-1);
								r.select();
								r.move('character',1);
								r.select();
							}),0);
						});
					}
					return d;
				}));
		}else if(this.blockNodeForEnter){
			// add enter key handler
			// FIXME: need to port to the new event code!!
			var h = lang.hitch(this,this.handleEnterKey);
			editor.addKeyHandler(13, 0, 0, h); //enter
			editor.addKeyHandler(13, 0, 1, h); //shift+enter
			this.connect(this.editor,'onKeyPressed','onKeyPressed');
		}
	},
	onKeyPressed: function(){
		// summary:
		//		Handler for keypress events.
		// tags:
		//		private
		if(this._checkListLater){
			if(win.withGlobal(this.editor.window, 'isCollapsed', dijit)){
				var liparent=win.withGlobal(this.editor.window, 'getAncestorElement', selectionapi, ['LI']);
				if(!liparent){
					// circulate the undo detection code by calling RichText::execCommand directly
					RichText.prototype.execCommand.call(this.editor, 'formatblock',this.blockNodeForEnter);
					// set the innerHTML of the new block node
					var block = win.withGlobal(this.editor.window, 'getAncestorElement', selectionapi, [this.blockNodeForEnter]);
					if(block){
						block.innerHTML=this.bogusHtmlContent;
						if(has("ie") <= 9){
							// move to the start by moving backwards one char
							var r = this.editor.document.selection.createRange();
							r.move('character',-1);
							r.select();
						}
					}else{
						console.error('onKeyPressed: Cannot find the new block node'); // FIXME
					}
				}else{
					if(has("mozilla")){
						if(liparent.parentNode.parentNode.nodeName == 'LI'){
							liparent=liparent.parentNode.parentNode;
						}
					}
					var fc=liparent.firstChild;
					if(fc && fc.nodeType == 1 && (fc.nodeName == 'UL' || fc.nodeName == 'OL')){
						liparent.insertBefore(fc.ownerDocument.createTextNode('\xA0'),fc);
						var newrange = rangeapi.create(this.editor.window);
						newrange.setStart(liparent.firstChild,0);
						var selection = rangeapi.getSelection(this.editor.window, true);
						selection.removeAllRanges();
						selection.addRange(newrange);
					}
				}
			}
			this._checkListLater = false;
		}
		if(this._pressedEnterInBlock){
			// the new created is the original current P, so we have previousSibling below
			if(this._pressedEnterInBlock.previousSibling){
				this.removeTrailingBr(this._pressedEnterInBlock.previousSibling);
			}
			delete this._pressedEnterInBlock;
		}
	},

	// bogusHtmlContent: [private] String
	//		HTML to stick into a new empty block
	bogusHtmlContent: '&#160;',		// &nbsp;

	// blockNodes: [private] Regex
	//		Regex for testing if a given tag is a block level (display:block) tag
	blockNodes: /^(?:P|H1|H2|H3|H4|H5|H6|LI)$/,

	handleEnterKey: function(e){
		// summary:
		//		Handler for enter key events when blockNodeForEnter is DIV or P.
		// description:
		//		Manually handle enter key event to make the behavior consistent across
		//		all supported browsers. See class description for details.
		// tags:
		//		private

		var selection, range, newrange, startNode, endNode, brNode, doc=this.editor.document,br,rs,txt;
		if(e.shiftKey){		// shift+enter always generates <br>
			var parent = win.withGlobal(this.editor.window, "getParentElement", selectionapi);
			var header = rangeapi.getAncestor(parent,this.blockNodes);
			if(header){
				if(header.tagName == 'LI'){
					return true; // let browser handle
				}
				selection = rangeapi.getSelection(this.editor.window);
				range = selection.getRangeAt(0);
				if(!range.collapsed){
					range.deleteContents();
					selection = rangeapi.getSelection(this.editor.window);
					range = selection.getRangeAt(0);
				}
				if(rangeapi.atBeginningOfContainer(header, range.startContainer, range.startOffset)){
						br=doc.createElement('br');
						newrange = rangeapi.create(this.editor.window);
						header.insertBefore(br,header.firstChild);
						newrange.setStartAfter(br);
						selection.removeAllRanges();
						selection.addRange(newrange);
				}else if(rangeapi.atEndOfContainer(header, range.startContainer, range.startOffset)){
					newrange = rangeapi.create(this.editor.window);
					br=doc.createElement('br');
						header.appendChild(br);
						header.appendChild(doc.createTextNode('\xA0'));
						newrange.setStart(header.lastChild,0);
					selection.removeAllRanges();
					selection.addRange(newrange);
				}else{
					rs = range.startContainer;
					if(rs && rs.nodeType == 3){
						// Text node, we have to split it.
						txt = rs.nodeValue;
						win.withGlobal(this.editor.window, function(){
							startNode = doc.createTextNode(txt.substring(0, range.startOffset));
							endNode = doc.createTextNode(txt.substring(range.startOffset));
							brNode = doc.createElement("br");

							if(endNode.nodeValue == "" && has("webkit")){
								endNode = doc.createTextNode('\xA0')
							}
							domConstruct.place(startNode, rs, "after");
							domConstruct.place(brNode, startNode, "after");
							domConstruct.place(endNode, brNode, "after");
							domConstruct.destroy(rs);
							newrange = rangeapi.create();
							newrange.setStart(endNode,0);
							selection.removeAllRanges();
							selection.addRange(newrange);
						});
						return false;
					}
					return true; // let browser handle
				}
			}else{
				selection = rangeapi.getSelection(this.editor.window);
				if(selection.rangeCount){
					range = selection.getRangeAt(0);
					if(range && range.startContainer){
						if(!range.collapsed){
							range.deleteContents();
							selection = rangeapi.getSelection(this.editor.window);
							range = selection.getRangeAt(0);
						}
						rs = range.startContainer;
						if(rs && rs.nodeType == 3){
							// Text node, we have to split it.
							win.withGlobal(this.editor.window, lang.hitch(this, function(){
								var endEmpty = false;

								var offset = range.startOffset;
								if(rs.length < offset){
									//We are not splitting the right node, try to locate the correct one
									ret = this._adjustNodeAndOffset(rs, offset);
									rs = ret.node;
									offset = ret.offset;
								}
								txt = rs.nodeValue;

								startNode = doc.createTextNode(txt.substring(0, offset));
								endNode = doc.createTextNode(txt.substring(offset));
								brNode = doc.createElement("br");

								if(!endNode.length){
									endNode = doc.createTextNode('\xA0');
									endEmpty = true;
								}

								if(startNode.length){
									domConstruct.place(startNode, rs, "after");
								}else{
									startNode = rs;
								}
								domConstruct.place(brNode, startNode, "after");
								domConstruct.place(endNode, brNode, "after");
								domConstruct.destroy(rs);
								newrange = rangeapi.create();
								newrange.setStart(endNode,0);
								newrange.setEnd(endNode, endNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								if(endEmpty && !has("webkit")){
									selectionapi.remove();
								}else{
									selectionapi.collapse(true);
								}
							}));
						}else{
							var targetNode;
							if(range.startOffset >= 0){
								targetNode = rs.childNodes[range.startOffset];
							}
							win.withGlobal(this.editor.window, lang.hitch(this, function(){
								var brNode = doc.createElement("br");
								var endNode = doc.createTextNode('\xA0');
								if(!targetNode){
									rs.appendChild(brNode);
									rs.appendChild(endNode);
								}else{
									domConstruct.place(brNode, targetNode, "before");
									domConstruct.place(endNode, brNode, "after");
								}
								newrange = rangeapi.create(win.global);
								newrange.setStart(endNode,0);
								newrange.setEnd(endNode, endNode.length);
								selection.removeAllRanges();
								selection.addRange(newrange);
								selectionapi.collapse(true);
							}));
						}
					}
				}else{
					// don't change this: do not call this.execCommand, as that may have other logic in subclass
					RichText.prototype.execCommand.call(this.editor, 'inserthtml', '<br>');
				}
			}
			return false;
		}
		var _letBrowserHandle = true;

		// first remove selection
		selection = rangeapi.getSelection(this.editor.window);
		range = selection.getRangeAt(0);
		if(!range.collapsed){
			range.deleteContents();
			selection = rangeapi.getSelection(this.editor.window);
			range = selection.getRangeAt(0);
		}

		var block = rangeapi.getBlockAncestor(range.endContainer, null, this.editor.editNode);
		var blockNode = block.blockNode;

		// if this is under a LI or the parent of the blockNode is LI, just let browser to handle it
		if((this._checkListLater = (blockNode && (blockNode.nodeName == 'LI' || blockNode.parentNode.nodeName == 'LI')))){
			if(has("mozilla")){
				// press enter in middle of P may leave a trailing <br/>, let's remove it later
				this._pressedEnterInBlock = blockNode;
			}
			// if this li only contains spaces, set the content to empty so the browser will outdent this item
			if(/^(\s|&nbsp;|&#160;|\xA0|<span\b[^>]*\bclass=['"]Apple-style-span['"][^>]*>(\s|&nbsp;|&#160;|\xA0)<\/span>)?(<br>)?$/.test(blockNode.innerHTML)){
				// empty LI node
				blockNode.innerHTML = '';
				if(has("webkit")){ // WebKit tosses the range when innerHTML is reset
					newrange = rangeapi.create(this.editor.window);
					newrange.setStart(blockNode, 0);
					selection.removeAllRanges();
					selection.addRange(newrange);
				}
				this._checkListLater = false; // nothing to check since the browser handles outdent
			}
			return true;
		}

		// text node directly under body, let's wrap them in a node
		if(!block.blockNode || block.blockNode===this.editor.editNode){
			try{
				RichText.prototype.execCommand.call(this.editor, 'formatblock',this.blockNodeForEnter);
			}catch(e2){ /*squelch FF3 exception bug when editor content is a single BR*/ }
			// get the newly created block node
			// FIXME
			block = {blockNode:win.withGlobal(this.editor.window, "getAncestorElement", selectionapi, [this.blockNodeForEnter]),
					blockContainer: this.editor.editNode};
			if(block.blockNode){
				if(block.blockNode != this.editor.editNode &&
					(!(block.blockNode.textContent || block.blockNode.innerHTML).replace(/^\s+|\s+$/g, "").length)){
					this.removeTrailingBr(block.blockNode);
					return false;
				}
			}else{	// we shouldn't be here if formatblock worked
				block.blockNode = this.editor.editNode;
			}
			selection = rangeapi.getSelection(this.editor.window);
			range = selection.getRangeAt(0);
		}

		var newblock = doc.createElement(this.blockNodeForEnter);
		newblock.innerHTML=this.bogusHtmlContent;
		this.removeTrailingBr(block.blockNode);
		var endOffset = range.endOffset;
		var node = range.endContainer;
		if(node.length < endOffset){
			//We are not checking the right node, try to locate the correct one
			var ret = this._adjustNodeAndOffset(node, endOffset);
			node = ret.node;
			endOffset = ret.offset;
		}
		if(rangeapi.atEndOfContainer(block.blockNode, node, endOffset)){
			if(block.blockNode === block.blockContainer){
				block.blockNode.appendChild(newblock);
			}else{
				domConstruct.place(newblock, block.blockNode, "after");
			}
			_letBrowserHandle = false;
			// lets move caret to the newly created block
			newrange = rangeapi.create(this.editor.window);
			newrange.setStart(newblock, 0);
			selection.removeAllRanges();
			selection.addRange(newrange);
			if(this.editor.height){
				winUtils.scrollIntoView(newblock);
			}
		}else if(rangeapi.atBeginningOfContainer(block.blockNode,
				range.startContainer, range.startOffset)){
			domConstruct.place(newblock, block.blockNode, block.blockNode === block.blockContainer ? "first" : "before");
			if(newblock.nextSibling && this.editor.height){
				// position input caret - mostly WebKit needs this
				newrange = rangeapi.create(this.editor.window);
				newrange.setStart(newblock.nextSibling, 0);
				selection.removeAllRanges();
				selection.addRange(newrange);
				// browser does not scroll the caret position into view, do it manually
				winUtils.scrollIntoView(newblock.nextSibling);
			}
			_letBrowserHandle = false;
		}else{ //press enter in the middle of P/DIV/Whatever/
			if(block.blockNode === block.blockContainer){
				block.blockNode.appendChild(newblock);
			}else{
				domConstruct.place(newblock, block.blockNode, "after");
			}
			_letBrowserHandle = false;

			// Clone any block level styles.
			if(block.blockNode.style){
				if(newblock.style){
					if(block.blockNode.style.cssText){
						newblock.style.cssText = block.blockNode.style.cssText;
					}
				}
			}

			// Okay, we probably have to split.
			rs = range.startContainer;
			var firstNodeMoved;
			if(rs && rs.nodeType == 3){
				// Text node, we have to split it.
				var nodeToMove, tNode;
				endOffset = range.endOffset;
				if(rs.length < endOffset){
					//We are not splitting the right node, try to locate the correct one
					ret = this._adjustNodeAndOffset(rs, endOffset);
					rs = ret.node;
					endOffset = ret.offset;
				}

				txt = rs.nodeValue;
				startNode = doc.createTextNode(txt.substring(0, endOffset));
				endNode = doc.createTextNode(txt.substring(endOffset, txt.length));

				// Place the split, then remove original nodes.
				domConstruct.place(startNode, rs, "before");
				domConstruct.place(endNode, rs, "after");
				domConstruct.destroy(rs);

				// Okay, we split the text.  Now we need to see if we're
				// parented to the block element we're splitting and if
				// not, we have to split all the way up.  Ugh.
				var parentC = startNode.parentNode;
				while(parentC !== block.blockNode){
					var tg = parentC.tagName;
					var newTg = doc.createElement(tg);
					// Clone over any 'style' data.
					if(parentC.style){
						if(newTg.style){
							if(parentC.style.cssText){
								newTg.style.cssText = parentC.style.cssText;
							}
						}
					}
					// If font also need to clone over any font data.
					if(parentC.tagName === "FONT"){
						if(parentC.color){
							newTg.color = parentC.color;
						}
						if(parentC.face){
							newTg.face = parentC.face;
						}
						if(parentC.size){  // this check was necessary on IE
							newTg.size = parentC.size;
						}
					}

					nodeToMove = endNode;
					while(nodeToMove){
						tNode = nodeToMove.nextSibling;
						newTg.appendChild(nodeToMove);
						nodeToMove = tNode;
					}
					domConstruct.place(newTg, parentC, "after");
					startNode = parentC;
					endNode = newTg;
					parentC = parentC.parentNode;
				}

				// Lastly, move the split out tags to the new block.
				// as they should now be split properly.
				nodeToMove = endNode;
				if(nodeToMove.nodeType == 1 || (nodeToMove.nodeType == 3 && nodeToMove.nodeValue)){
					// Non-blank text and non-text nodes need to clear out that blank space
					// before moving the contents.
					newblock.innerHTML = "";
				}
				firstNodeMoved = nodeToMove;
				while(nodeToMove){
					tNode = nodeToMove.nextSibling;
					newblock.appendChild(nodeToMove);
					nodeToMove = tNode;
				}
			}

			//lets move caret to the newly created block
			newrange = rangeapi.create(this.editor.window);
			var nodeForCursor;
			var innerMostFirstNodeMoved = firstNodeMoved;
			if(this.blockNodeForEnter !== 'BR'){
				while(innerMostFirstNodeMoved){
					nodeForCursor = innerMostFirstNodeMoved;
					tNode = innerMostFirstNodeMoved.firstChild;
					innerMostFirstNodeMoved = tNode;
				}
				if(nodeForCursor && nodeForCursor.parentNode){
					newblock = nodeForCursor.parentNode;
					newrange.setStart(newblock, 0);
					selection.removeAllRanges();
					selection.addRange(newrange);
					if(this.editor.height){
						winUtils.scrollIntoView(newblock);
					}
					if(has("mozilla")){
						// press enter in middle of P may leave a trailing <br/>, let's remove it later
						this._pressedEnterInBlock = block.blockNode;
					}
				}else{
					_letBrowserHandle = true;
				}
			}else{
				newrange.setStart(newblock, 0);
				selection.removeAllRanges();
				selection.addRange(newrange);
				if(this.editor.height){
					winUtils.scrollIntoView(newblock);
				}
				if(has("mozilla")){
					// press enter in middle of P may leave a trailing <br/>, let's remove it later
					this._pressedEnterInBlock = block.blockNode;
				}
			}
		}
		return _letBrowserHandle;
	},

	_adjustNodeAndOffset: function(/*DomNode*/node, /*Int*/offset){
		// summary:
		//              In the case there are multiple text nodes in a row the offset may not be within the node.  If the offset is larger than the node length, it will attempt to find
		//              the next text sibling until it locates the text node in which the offset refers to
		// node:
		//              The node to check.
		// offset:
		//              The position to find within the text node
		// tags:
		//              private.
		while(node.length < offset && node.nextSibling && node.nextSibling.nodeType==3){
			//Adjust the offset and node in the case of multiple text nodes in a row
			offset = offset - node.length;
			node = node.nextSibling;
		}
		return {"node": node, "offset": offset};
	},

	removeTrailingBr: function(container){
		// summary:
		//		If last child of container is a <br>, then remove it.
		// tags:
		//		private
		var para = /P|DIV|LI/i.test(container.tagName) ?
			container : selectionapi.getParentOfType(container,['P','DIV','LI']);

		if(!para){ return; }
		if(para.lastChild){
			if((para.childNodes.length > 1 && para.lastChild.nodeType == 3 && /^[\s\xAD]*$/.test(para.lastChild.nodeValue)) ||
				para.lastChild.tagName=='BR'){

				domConstruct.destroy(para.lastChild);
			}
		}
		if(!para.childNodes.length){
			para.innerHTML=this.bogusHtmlContent;
		}
	}
});

});

},
'dijit/_editor/range':function(){
define("dijit/_editor/range", [
	"dojo/_base/array", // array.every
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.isArray
	"dojo/_base/window", // win.global
	".."	// for exporting symbols to dijit, TODO: remove in 2.0
], function(array, declare, lang, win, dijit){

// module:
//		dijit/_editor/range
// summary:
//		W3C range API


dijit.range={};

dijit.range.getIndex = function(/*DomNode*/node, /*DomNode*/parent){
//	dojo.profile.start("dijit.range.getIndex");
	var ret = [], retR = [];
	var onode = node;

	var pnode, n;
	while(node != parent){
		var i = 0;
		pnode = node.parentNode;
		while((n = pnode.childNodes[i++])){
			if(n === node){
				--i;
				break;
			}
		}
		//if(i>=pnode.childNodes.length){
			//dojo.debug("Error finding index of a node in dijit.range.getIndex");
		//}
		ret.unshift(i);
		retR.unshift(i - pnode.childNodes.length);
		node = pnode;
	}

	//normalized() can not be called so often to prevent
	//invalidating selection/range, so we have to detect
	//here that any text nodes in a row
	if(ret.length > 0 && onode.nodeType == 3){
		n = onode.previousSibling;
		while(n && n.nodeType == 3){
			ret[ret.length - 1]--;
			n = n.previousSibling;
		}
		n = onode.nextSibling;
		while(n && n.nodeType == 3){
			retR[retR.length - 1]++;
			n = n.nextSibling;
		}
	}
//	dojo.profile.end("dijit.range.getIndex");
	return {o: ret, r:retR};
};

dijit.range.getNode = function(/*Array*/index, /*DomNode*/parent){
	if(!lang.isArray(index) || index.length == 0){
		return parent;
	}
	var node = parent;
//	if(!node)debugger
	array.every(index, function(i){
		if(i >= 0 && i < node.childNodes.length){
			node = node.childNodes[i];
		}else{
			node = null;
			//console.debug('Error: can not find node with index',index,'under parent node',parent );
			return false; //terminate array.every
		}
		return true; //carry on the every loop
	});

	return node;
};

dijit.range.getCommonAncestor = function(n1, n2, root){
	root = root || n1.ownerDocument.body;
	var getAncestors = function(n){
		var as = [];
		while(n){
			as.unshift(n);
			if(n !== root){
				n = n.parentNode;
			}else{
				break;
			}
		}
		return as;
	};
	var n1as = getAncestors(n1);
	var n2as = getAncestors(n2);

	var m = Math.min(n1as.length, n2as.length);
	var com = n1as[0]; //at least, one element should be in the array: the root (BODY by default)
	for(var i = 1; i < m; i++){
		if(n1as[i] === n2as[i]){
			com = n1as[i]
		}else{
			break;
		}
	}
	return com;
};

dijit.range.getAncestor = function(/*DomNode*/node, /*RegEx?*/regex, /*DomNode?*/root){
	root = root || node.ownerDocument.body;
	while(node && node !== root){
		var name = node.nodeName.toUpperCase();
		if(regex.test(name)){
			return node;
		}

		node = node.parentNode;
	}
	return null;
};

dijit.range.BlockTagNames = /^(?:P|DIV|H1|H2|H3|H4|H5|H6|ADDRESS|PRE|OL|UL|LI|DT|DE)$/;
dijit.range.getBlockAncestor = function(/*DomNode*/node, /*RegEx?*/regex, /*DomNode?*/root){
	root = root || node.ownerDocument.body;
	regex = regex || dijit.range.BlockTagNames;
	var block = null, blockContainer;
	while(node && node !== root){
		var name = node.nodeName.toUpperCase();
		if(!block && regex.test(name)){
			block = node;
		}
		if(!blockContainer && (/^(?:BODY|TD|TH|CAPTION)$/).test(name)){
			blockContainer = node;
		}

		node = node.parentNode;
	}
	return {blockNode:block, blockContainer:blockContainer || node.ownerDocument.body};
};

dijit.range.atBeginningOfContainer = function(/*DomNode*/container, /*DomNode*/node, /*Int*/offset){
	var atBeginning = false;
	var offsetAtBeginning = (offset == 0);
	if(!offsetAtBeginning && node.nodeType == 3){ //if this is a text node, check whether the left part is all space
		if(/^[\s\xA0]+$/.test(node.nodeValue.substr(0, offset))){
			offsetAtBeginning = true;
		}
	}
	if(offsetAtBeginning){
		var cnode = node;
		atBeginning = true;
		while(cnode && cnode !== container){
			if(cnode.previousSibling){
				atBeginning = false;
				break;
			}
			cnode = cnode.parentNode;
		}
	}
	return atBeginning;
};

dijit.range.atEndOfContainer = function(/*DomNode*/container, /*DomNode*/node, /*Int*/offset){
	var atEnd = false;
	var offsetAtEnd = (offset == (node.length || node.childNodes.length));
	if(!offsetAtEnd && node.nodeType == 3){ //if this is a text node, check whether the right part is all space
		if(/^[\s\xA0]+$/.test(node.nodeValue.substr(offset))){
			offsetAtEnd = true;
		}
	}
	if(offsetAtEnd){
		var cnode = node;
		atEnd = true;
		while(cnode && cnode !== container){
			if(cnode.nextSibling){
				atEnd = false;
				break;
			}
			cnode = cnode.parentNode;
		}
	}
	return atEnd;
};

dijit.range.adjacentNoneTextNode = function(startnode, next){
	var node = startnode;
	var len = (0 - startnode.length) || 0;
	var prop = next ? 'nextSibling' : 'previousSibling';
	while(node){
		if(node.nodeType != 3){
			break;
		}
		len += node.length;
		node = node[prop];
	}
	return [node,len];
};

dijit.range._w3c = Boolean(window['getSelection']);
dijit.range.create = function(/*Window?*/window){
	if(dijit.range._w3c){
		return (window || win.global).document.createRange();
	}else{//IE
		return new dijit.range.W3CRange;
	}
};

dijit.range.getSelection = function(/*Window*/win, /*Boolean?*/ignoreUpdate){
	if(dijit.range._w3c){
		return win.getSelection();
	}else{//IE
		var s = new dijit.range.ie.selection(win);
		if(!ignoreUpdate){
			s._getCurrentSelection();
		}
		return s;
	}
};

if(!dijit.range._w3c){
	dijit.range.ie = {
		cachedSelection: {},
		selection: function(win){
			this._ranges = [];
			this.addRange = function(r, /*boolean*/internal){
				this._ranges.push(r);
				if(!internal){
					r._select();
				}
				this.rangeCount = this._ranges.length;
			};
			this.removeAllRanges = function(){
				//don't detach, the range may be used later
//				for(var i=0;i<this._ranges.length;i++){
//					this._ranges[i].detach();
//				}
				this._ranges = [];
				this.rangeCount = 0;
			};
			var _initCurrentRange = function(){
				var r = win.document.selection.createRange();
				var type = win.document.selection.type.toUpperCase();
				if(type == "CONTROL"){
					//TODO: multiple range selection(?)
					return new dijit.range.W3CRange(dijit.range.ie.decomposeControlRange(r));
				}else{
					return new dijit.range.W3CRange(dijit.range.ie.decomposeTextRange(r));
				}
			};
			this.getRangeAt = function(i){
				return this._ranges[i];
			};
			this._getCurrentSelection = function(){
				this.removeAllRanges();
				var r = _initCurrentRange();
				if(r){
					this.addRange(r, true);
					this.isCollapsed = r.collapsed;
				}else{
					this.isCollapsed = true;
				}
			};
		},
		decomposeControlRange: function(range){
			var firstnode = range.item(0), lastnode = range.item(range.length - 1);
			var startContainer = firstnode.parentNode, endContainer = lastnode.parentNode;
			var startOffset = dijit.range.getIndex(firstnode, startContainer).o[0];
			var endOffset = dijit.range.getIndex(lastnode, endContainer).o[0] + 1;
			return [startContainer, startOffset,endContainer, endOffset];
		},
		getEndPoint: function(range, end){
			var atmrange = range.duplicate();
			atmrange.collapse(!end);
			var cmpstr = 'EndTo' + (end ? 'End' : 'Start');
			var parentNode = atmrange.parentElement();

			var startnode, startOffset, lastNode;
			if(parentNode.childNodes.length > 0){
				array.every(parentNode.childNodes, function(node, i){
					var calOffset;
					if(node.nodeType != 3){
						atmrange.moveToElementText(node);

						if(atmrange.compareEndPoints(cmpstr, range) > 0){
							//startnode = node.previousSibling;
							if(lastNode && lastNode.nodeType == 3){
								//where shall we put the start? in the text node or after?
								startnode = lastNode;
								calOffset = true;
							}else{
								startnode = parentNode;
								startOffset = i;
								return false;
							}
						}else{
							if(i == parentNode.childNodes.length - 1){
								startnode = parentNode;
								startOffset = parentNode.childNodes.length;
								return false;
							}
						}
					}else{
						if(i == parentNode.childNodes.length - 1){//at the end of this node
							startnode = node;
							calOffset = true;
						}
					}
					//			try{
					if(calOffset && startnode){
						var prevnode = dijit.range.adjacentNoneTextNode(startnode)[0];
						if(prevnode){
							startnode = prevnode.nextSibling;
						}else{
							startnode = parentNode.firstChild; //firstChild must be a text node
						}
						var prevnodeobj = dijit.range.adjacentNoneTextNode(startnode);
						prevnode = prevnodeobj[0];
						var lenoffset = prevnodeobj[1];
						if(prevnode){
							atmrange.moveToElementText(prevnode);
							atmrange.collapse(false);
						}else{
							atmrange.moveToElementText(parentNode);
						}
						atmrange.setEndPoint(cmpstr, range);
						startOffset = atmrange.text.length - lenoffset;

						return false;
					}
					//			}catch(e){ debugger }
					lastNode = node;
					return true;
				});
			}else{
				startnode = parentNode;
				startOffset = 0;
			}

			//if at the end of startnode and we are dealing with start container, then
			//move the startnode to nextSibling if it is a text node
			//TODO: do this for end container?
			if(!end && startnode.nodeType == 1 && startOffset == startnode.childNodes.length){
				var nextnode = startnode.nextSibling;
				if(nextnode && nextnode.nodeType == 3){
					startnode = nextnode;
					startOffset = 0;
				}
			}
			return [startnode, startOffset];
		},
		setEndPoint: function(range, container, offset){
			//text node
			var atmrange = range.duplicate(), node, len;
			if(container.nodeType != 3){ //normal node
				if(offset > 0){
					node = container.childNodes[offset - 1];
					if(node){
						if(node.nodeType == 3){
							container = node;
							offset = node.length;
							//pass through
						}else{
							if(node.nextSibling && node.nextSibling.nodeType == 3){
								container = node.nextSibling;
								offset = 0;
								//pass through
							}else{
								atmrange.moveToElementText(node.nextSibling ? node : container);
								var parent = node.parentNode;
								var tempNode = parent.insertBefore(node.ownerDocument.createTextNode(' '), node.nextSibling);
								atmrange.collapse(false);
								parent.removeChild(tempNode);
							}
						}
					}
				}else{
					atmrange.moveToElementText(container);
					atmrange.collapse(true);
				}
			}
			if(container.nodeType == 3){
				var prevnodeobj = dijit.range.adjacentNoneTextNode(container);
				var prevnode = prevnodeobj[0];
				len = prevnodeobj[1];
				if(prevnode){
					atmrange.moveToElementText(prevnode);
					atmrange.collapse(false);
					//if contentEditable is not inherit, the above collapse won't make the end point
					//in the correctly position: it always has a -1 offset, so compensate it
					if(prevnode.contentEditable != 'inherit'){
						len++;
					}
				}else{
					atmrange.moveToElementText(container.parentNode);
					atmrange.collapse(true);
				}

				offset += len;
				if(offset > 0){
					if(atmrange.move('character', offset) != offset){
						console.error('Error when moving!');
					}
				}
			}

			return atmrange;
		},
		decomposeTextRange: function(range){
			var tmpary = dijit.range.ie.getEndPoint(range);
			var startContainer = tmpary[0], startOffset = tmpary[1];
			var endContainer = tmpary[0], endOffset = tmpary[1];

			if(range.htmlText.length){
				if(range.htmlText == range.text){ //in the same text node
					endOffset = startOffset + range.text.length;
				}else{
					tmpary = dijit.range.ie.getEndPoint(range, true);
					endContainer = tmpary[0],endOffset = tmpary[1];
//					if(startContainer.tagName == "BODY"){
//						startContainer = startContainer.firstChild;
//					}
				}
			}
			return [startContainer, startOffset, endContainer, endOffset];
		},
		setRange: function(range, startContainer, startOffset, endContainer, endOffset, collapsed){
			var start = dijit.range.ie.setEndPoint(range, startContainer, startOffset);

			range.setEndPoint('StartToStart', start);
			if(!collapsed){
				var end = dijit.range.ie.setEndPoint(range, endContainer, endOffset);
			}
			range.setEndPoint('EndToEnd', end || start);

			return range;
		}
	};

declare("dijit.range.W3CRange",null, {
	constructor: function(){
		if(arguments.length>0){
			this.setStart(arguments[0][0],arguments[0][1]);
			this.setEnd(arguments[0][2],arguments[0][3]);
		}else{
			this.commonAncestorContainer = null;
			this.startContainer = null;
			this.startOffset = 0;
			this.endContainer = null;
			this.endOffset = 0;
			this.collapsed = true;
		}
	},
	_updateInternal: function(){
		if(this.startContainer !== this.endContainer){
			this.commonAncestorContainer = dijit.range.getCommonAncestor(this.startContainer, this.endContainer);
		}else{
			this.commonAncestorContainer = this.startContainer;
		}
		this.collapsed = (this.startContainer === this.endContainer) && (this.startOffset == this.endOffset);
	},
	setStart: function(node, offset){
		offset=parseInt(offset);
		if(this.startContainer === node && this.startOffset == offset){
			return;
		}
		delete this._cachedBookmark;

		this.startContainer = node;
		this.startOffset = offset;
		if(!this.endContainer){
			this.setEnd(node, offset);
		}else{
			this._updateInternal();
		}
	},
	setEnd: function(node, offset){
		offset=parseInt(offset);
		if(this.endContainer === node && this.endOffset == offset){
			return;
		}
		delete this._cachedBookmark;

		this.endContainer = node;
		this.endOffset = offset;
		if(!this.startContainer){
			this.setStart(node, offset);
		}else{
			this._updateInternal();
		}
	},
	setStartAfter: function(node, offset){
		this._setPoint('setStart', node, offset, 1);
	},
	setStartBefore: function(node, offset){
		this._setPoint('setStart', node, offset, 0);
	},
	setEndAfter: function(node, offset){
		this._setPoint('setEnd', node, offset, 1);
	},
	setEndBefore: function(node, offset){
		this._setPoint('setEnd', node, offset, 0);
	},
	_setPoint: function(what, node, offset, ext){
		var index = dijit.range.getIndex(node, node.parentNode).o;
		this[what](node.parentNode, index.pop()+ext);
	},
	_getIERange: function(){
		var r = (this._body || this.endContainer.ownerDocument.body).createTextRange();
		dijit.range.ie.setRange(r, this.startContainer, this.startOffset, this.endContainer, this.endOffset, this.collapsed);
		return r;
	},
	getBookmark: function(){
		this._getIERange();
		return this._cachedBookmark;
	},
	_select: function(){
		var r = this._getIERange();
		r.select();
	},
	deleteContents: function(){
		var s = this.startContainer, r = this._getIERange();
		if(s.nodeType === 3 && !this.startOffset){
			//if the range starts at the beginning of a
			//text node, move it to before the textnode
			//to make sure the range is still valid
			//after deleteContents() finishes
			this.setStartBefore(s);
		}
		r.pasteHTML('');
		this.endContainer = this.startContainer;
		this.endOffset = this.startOffset;
		this.collapsed = true;
	},
	cloneRange: function(){
		var r = new dijit.range.W3CRange([this.startContainer,this.startOffset,
			this.endContainer,this.endOffset]);
		r._body = this._body;
		return r;
	},
	detach: function(){
		this._body = null;
		this.commonAncestorContainer = null;
		this.startContainer = null;
		this.startOffset = 0;
		this.endContainer = null;
		this.endOffset = 0;
		this.collapsed = true;
}
});
} //if(!dijit.range._w3c)


return dijit.range;
});

},
'*now':function(r){r(['dojo/i18n!*preload*dijit/nls/_dijit_editor*["ar","ca","cs","da","de","el","en","es","fi","fr","he","hr","hu","it","ja","kk","ko","nl","no","pl","pt","pt-br","ro","ru","sk","sl","sv","th","tr","uk","zh","zh-tw","ROOT"]']);}
,
'*noref':1}});
define("dijit/_dijit_editor", [], 1);
require(["dijit/Editor","dijit/_editor/_Plugin","dijit/_editor/RichText","dijit/_editor/html","dijit/_editor/range","dijit/_editor/selection"]);

require({cache:{
'url:dijit/layout/templates/AccordionButton.html':"<div data-dojo-attach-event='onclick:_onTitleClick' class='dijitAccordionTitle' role=\"presentation\">\n\t<div data-dojo-attach-point='titleNode,focusNode' data-dojo-attach-event='onkeypress:_onTitleKeyPress'\n\t\t\tclass='dijitAccordionTitleFocus' role=\"tab\" aria-expanded=\"false\"\n\t\t><span class='dijitInline dijitAccordionArrow' role=\"presentation\"></span\n\t\t><span class='arrowTextUp' role=\"presentation\">+</span\n\t\t><span class='arrowTextDown' role=\"presentation\">-</span\n\t\t><img src=\"${_blankGif}\" alt=\"\" class=\"dijitIcon\" data-dojo-attach-point='iconNode' style=\"vertical-align: middle\" role=\"presentation\"/>\n\t\t<span role=\"presentation\" data-dojo-attach-point='titleTextNode' class='dijitAccordionText'></span>\n\t</div>\n</div>\n",
'dijit/layout/StackContainer':function(){
define("dijit/layout/StackContainer", [
	"dojo/_base/array", // array.forEach array.indexOf array.some
	"dojo/cookie", // cookie
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.replace
	"dojo/_base/kernel",	// kernel.isAsync
	"dojo/_base/lang",	// lang.extend
	"dojo/ready",
	"dojo/topic", // publish
	"../registry",	// registry.byId
	"../_WidgetBase",
	"./_LayoutWidget",
	"dojo/i18n!../nls/common"
], function(array, cookie, declare, domClass, kernel, lang, ready, topic,
			registry, _WidgetBase, _LayoutWidget){

/*=====
var _WidgetBase = dijit._WidgetBase;
var _LayoutWidget = dijit.layout._LayoutWidget;
var StackController = dijit.layout.StackController;
=====*/

// module:
//		dijit/layout/StackContainer
// summary:
//		A container that has multiple children, but shows only one child at a time.

// Back compat w/1.6, remove for 2.0
if(!kernel.isAsync){
	ready(0, function(){
		var requires = ["dijit/layout/StackController"];
		require(requires);	// use indirection so modules not rolled into a build
	});
}

// These arguments can be specified for the children of a StackContainer.
// Since any widget can be specified as a StackContainer child, mix them
// into the base widget class.  (This is a hack, but it's effective.)
lang.extend(_WidgetBase, {
	// selected: Boolean
	//		Parameter for children of `dijit.layout.StackContainer` or subclasses.
	//		Specifies that this widget should be the initially displayed pane.
	//		Note: to change the selected child use `dijit.layout.StackContainer.selectChild`
	selected: false,

	// closable: Boolean
	//		Parameter for children of `dijit.layout.StackContainer` or subclasses.
	//		True if user can close (destroy) this child, such as (for example) clicking the X on the tab.
	closable: false,

	// iconClass: String
	//		Parameter for children of `dijit.layout.StackContainer` or subclasses.
	//		CSS Class specifying icon to use in label associated with this pane.
	iconClass: "dijitNoIcon",

	// showTitle: Boolean
	//		Parameter for children of `dijit.layout.StackContainer` or subclasses.
	//		When true, display title of this widget as tab label etc., rather than just using
	//		icon specified in iconClass
	showTitle: true
});

return declare("dijit.layout.StackContainer", _LayoutWidget, {
	// summary:
	//		A container that has multiple children, but shows only
	//		one child at a time
	//
	// description:
	//		A container for widgets (ContentPanes, for example) That displays
	//		only one Widget at a time.
	//
	//		Publishes topics [widgetId]-addChild, [widgetId]-removeChild, and [widgetId]-selectChild
	//
	//		Can be base class for container, Wizard, Show, etc.

	// doLayout: Boolean
	//		If true, change the size of my currently displayed child to match my size
	doLayout: true,

	// persist: Boolean
	//		Remembers the selected child across sessions
	persist: false,

	baseClass: "dijitStackContainer",

/*=====
	// selectedChildWidget: [readonly] dijit._Widget
	//		References the currently selected child widget, if any.
	//		Adjust selected child with selectChild() method.
	selectedChildWidget: null,
=====*/

	buildRendering: function(){
		this.inherited(arguments);
		domClass.add(this.domNode, "dijitLayoutContainer");
		this.containerNode.setAttribute("role", "tabpanel");
	},

	postCreate: function(){
		this.inherited(arguments);
		this.connect(this.domNode, "onkeypress", this._onKeyPress);
	},

	startup: function(){
		if(this._started){ return; }

		var children = this.getChildren();

		// Setup each page panel to be initially hidden
		array.forEach(children, this._setupChild, this);

		// Figure out which child to initially display, defaulting to first one
		if(this.persist){
			this.selectedChildWidget = registry.byId(cookie(this.id + "_selectedChild"));
		}else{
			array.some(children, function(child){
				if(child.selected){
					this.selectedChildWidget = child;
				}
				return child.selected;
			}, this);
		}
		var selected = this.selectedChildWidget;
		if(!selected && children[0]){
			selected = this.selectedChildWidget = children[0];
			selected.selected = true;
		}

		// Publish information about myself so any StackControllers can initialize.
		// This needs to happen before this.inherited(arguments) so that for
		// TabContainer, this._contentBox doesn't include the space for the tab labels.
		topic.publish(this.id+"-startup", {children: children, selected: selected});

		// Startup each child widget, and do initial layout like setting this._contentBox,
		// then calls this.resize() which does the initial sizing on the selected child.
		this.inherited(arguments);
	},

	resize: function(){
		// Resize is called when we are first made visible (it's called from startup()
		// if we are initially visible). If this is the first time we've been made
		// visible then show our first child.
		if(!this._hasBeenShown){
			this._hasBeenShown = true;
			var selected = this.selectedChildWidget;
			if(selected){
				this._showChild(selected);
			}
		}
		this.inherited(arguments);
	},

	_setupChild: function(/*dijit._Widget*/ child){
		// Overrides _LayoutWidget._setupChild()

		this.inherited(arguments);

		domClass.replace(child.domNode, "dijitHidden", "dijitVisible");

		// remove the title attribute so it doesn't show up when i hover
		// over a node
		child.domNode.title = "";
	},

	addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
		// Overrides _Container.addChild() to do layout and publish events

		this.inherited(arguments);

		if(this._started){
			topic.publish(this.id+"-addChild", child, insertIndex);	// publish

			// in case the tab titles have overflowed from one line to two lines
			// (or, if this if first child, from zero lines to one line)
			// TODO: w/ScrollingTabController this is no longer necessary, although
			// ScrollTabController.resize() does need to get called to show/hide
			// the navigation buttons as appropriate, but that's handled in ScrollingTabController.onAddChild().
			// If this is updated to not layout [except for initial child added / last child removed], update
			// "childless startup" test in StackContainer.html to check for no resize event after second addChild()
			this.layout();

			// if this is the first child, then select it
			if(!this.selectedChildWidget){
				this.selectChild(child);
			}
		}
	},

	removeChild: function(/*dijit._Widget*/ page){
		// Overrides _Container.removeChild() to do layout and publish events

		this.inherited(arguments);

		if(this._started){
			// this will notify any tablists to remove a button; do this first because it may affect sizing
			topic.publish(this.id + "-removeChild", page);	// publish
		}

		// If all our children are being destroyed than don't run the code below (to select another page),
		//  because we are deleting every page one by one
		if(this._descendantsBeingDestroyed){ return; }

		// Select new page to display, also updating TabController to show the respective tab.
		// Do this before layout call because it can affect the height of the TabController.
		if(this.selectedChildWidget === page){
			this.selectedChildWidget = undefined;
			if(this._started){
				var children = this.getChildren();
				if(children.length){
					this.selectChild(children[0]);
				}
			}
		}

		if(this._started){
			// In case the tab titles now take up one line instead of two lines
			// (note though that ScrollingTabController never overflows to multiple lines),
			// or the height has changed slightly because of addition/removal of tab which close icon
			this.layout();
		}
	},

	selectChild: function(/*dijit._Widget|String*/ page, /*Boolean*/ animate){
		// summary:
		//		Show the given widget (which must be one of my children)
		// page:
		//		Reference to child widget or id of child widget

		page = registry.byId(page);

		if(this.selectedChildWidget != page){
			// Deselect old page and select new one
			var d = this._transition(page, this.selectedChildWidget, animate);
			this._set("selectedChildWidget", page);
			topic.publish(this.id+"-selectChild", page);	// publish

			if(this.persist){
				cookie(this.id + "_selectedChild", this.selectedChildWidget.id);
			}
		}

		return d;		// If child has an href, promise that fires when the child's href finishes loading
	},

	_transition: function(newWidget, oldWidget /*===== ,  animate =====*/){
		// summary:
		//		Hide the old widget and display the new widget.
		//		Subclasses should override this.
		// newWidget: dijit._Widget
		//		The newly selected widget.
		// oldWidget: dijit._Widget
		//		The previously selected widget.
		// animate: Boolean
		//		Used by AccordionContainer to turn on/off slide effect.
		// tags:
		//		protected extension
		if(oldWidget){
			this._hideChild(oldWidget);
		}
		var d = this._showChild(newWidget);

		// Size the new widget, in case this is the first time it's being shown,
		// or I have been resized since the last time it was shown.
		// Note that page must be visible for resizing to work.
		if(newWidget.resize){
			if(this.doLayout){
				newWidget.resize(this._containerContentBox || this._contentBox);
			}else{
				// the child should pick it's own size but we still need to call resize()
				// (with no arguments) to let the widget lay itself out
				newWidget.resize();
			}
		}

		return d;	// If child has an href, promise that fires when the child's href finishes loading
	},

	_adjacent: function(/*Boolean*/ forward){
		// summary:
		//		Gets the next/previous child widget in this container from the current selection.
		var children = this.getChildren();
		var index = array.indexOf(children, this.selectedChildWidget);
		index += forward ? 1 : children.length - 1;
		return children[ index % children.length ]; // dijit._Widget
	},

	forward: function(){
		// summary:
		//		Advance to next page.
		return this.selectChild(this._adjacent(true), true);
	},

	back: function(){
		// summary:
		//		Go back to previous page.
		return this.selectChild(this._adjacent(false), true);
	},

	_onKeyPress: function(e){
		topic.publish(this.id+"-containerKeyPress", { e: e, page: this});	// publish
	},

	layout: function(){
		// Implement _LayoutWidget.layout() virtual method.
		var child = this.selectedChildWidget;
		if(child && child.resize){
			if(this.doLayout){
				child.resize(this._containerContentBox || this._contentBox);
			}else{
				child.resize();
			}
		}
	},

	_showChild: function(/*dijit._Widget*/ page){
		// summary:
		//		Show the specified child by changing it's CSS, and call _onShow()/onShow() so
		//		it can do any updates it needs regarding loading href's etc.
		// returns:
		//		Promise that fires when page has finished showing, or true if there's no href
		var children = this.getChildren();
		page.isFirstChild = (page == children[0]);
		page.isLastChild = (page == children[children.length-1]);
		page._set("selected", true);

		domClass.replace(page.domNode, "dijitVisible", "dijitHidden");

		return (page._onShow && page._onShow()) || true;
	},

	_hideChild: function(/*dijit._Widget*/ page){
		// summary:
		//		Hide the specified child by changing it's CSS, and call _onHide() so
		//		it's notified.
		page._set("selected", false);
		domClass.replace(page.domNode, "dijitHidden", "dijitVisible");

		page.onHide && page.onHide();
	},

	closeChild: function(/*dijit._Widget*/ page){
		// summary:
		//		Callback when user clicks the [X] to remove a page.
		//		If onClose() returns true then remove and destroy the child.
		// tags:
		//		private
		var remove = page.onClose(this, page);
		if(remove){
			this.removeChild(page);
			// makes sure we can clean up executeScripts in ContentPane onUnLoad
			page.destroyRecursive();
		}
	},

	destroyDescendants: function(/*Boolean*/ preserveDom){
		this._descendantsBeingDestroyed = true;
		this.selectedChildWidget = undefined;
		array.forEach(this.getChildren(), function(child){
			if(!preserveDom){
				this.removeChild(child);
			}
			child.destroyRecursive(preserveDom);
		}, this);
		this._descendantsBeingDestroyed = false;
	}
});

});

},
'dijit/layout/AccordionPane':function(){
define("dijit/layout/AccordionPane", [
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.deprecated
	"./ContentPane"
], function(declare, kernel, ContentPane){

/*=====
	var ContentPane = dijit.layout.ContentPane;
=====*/

	// module:
	//		dijit/layout/AccordionPane
	// summary:
	//		Deprecated widget.   Use `dijit.layout.ContentPane` instead.

	return declare("dijit.layout.AccordionPane", ContentPane, {
		// summary:
		//		Deprecated widget.   Use `dijit.layout.ContentPane` instead.
		// tags:
		//		deprecated

		constructor: function(){
			kernel.deprecated("dijit.layout.AccordionPane deprecated, use ContentPane instead", "", "2.0");
		},

		onSelected: function(){
			// summary:
			//		called when this pane is selected
		}
	});
});

},
'dijit/layout/TabController':function(){
require({cache:{
'url:dijit/layout/templates/_TabButton.html':"<div role=\"presentation\" data-dojo-attach-point=\"titleNode\" data-dojo-attach-event='onclick:onClick'>\n    <div role=\"presentation\" class='dijitTabInnerDiv' data-dojo-attach-point='innerDiv'>\n        <div role=\"presentation\" class='dijitTabContent' data-dojo-attach-point='tabContent'>\n        \t<div role=\"presentation\" data-dojo-attach-point='focusNode'>\n\t\t        <img src=\"${_blankGif}\" alt=\"\" class=\"dijitIcon dijitTabButtonIcon\" data-dojo-attach-point='iconNode' />\n\t\t        <span data-dojo-attach-point='containerNode' class='tabLabel'></span>\n\t\t        <span class=\"dijitInline dijitTabCloseButton dijitTabCloseIcon\" data-dojo-attach-point='closeNode'\n\t\t        \t\tdata-dojo-attach-event='onclick: onClickCloseButton' role=\"presentation\">\n\t\t            <span data-dojo-attach-point='closeText' class='dijitTabCloseText'>[x]</span\n\t\t        ></span>\n\t\t\t</div>\n        </div>\n    </div>\n</div>\n"}});
define("dijit/layout/TabController", [
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.setSelectable
	"dojo/dom-attr", // domAttr.attr
	"dojo/dom-class", // domClass.toggle
	"dojo/i18n", // i18n.getLocalization
	"dojo/_base/lang", // lang.hitch lang.trim
	"./StackController",
	"../Menu",
	"../MenuItem",
	"dojo/text!./templates/_TabButton.html",
	"dojo/i18n!../nls/common"
], function(declare, dom, domAttr, domClass, i18n, lang, StackController, Menu, MenuItem, template){

/*=====
	var StackController = dijit.layout.StackController;
	var Menu = dijit.Menu;
	var MenuItem = dijit.MenuItem;
=====*/

	// module:
	//		dijit/layout/TabController
	// summary:
	// 		Set of tabs (the things with titles and a close button, that you click to show a tab panel).
	//		Used internally by `dijit.layout.TabContainer`.

	var TabButton = declare("dijit.layout._TabButton", StackController.StackButton, {
		// summary:
		//		A tab (the thing you click to select a pane).
		// description:
		//		Contains the title of the pane, and optionally a close-button to destroy the pane.
		//		This is an internal widget and should not be instantiated directly.
		// tags:
		//		private

		// baseClass: String
		//		The CSS class applied to the domNode.
		baseClass: "dijitTab",

		// Apply dijitTabCloseButtonHover when close button is hovered
		cssStateNodes: {
			closeNode: "dijitTabCloseButton"
		},

		templateString: template,

		// Override _FormWidget.scrollOnFocus.
		// Don't scroll the whole tab container into view when the button is focused.
		scrollOnFocus: false,

		buildRendering: function(){
			this.inherited(arguments);

			dom.setSelectable(this.containerNode, false);
		},

		startup: function(){
			this.inherited(arguments);
			var n = this.domNode;

			// Required to give IE6 a kick, as it initially hides the
			// tabs until they are focused on.
			setTimeout(function(){
				n.className = n.className;
			}, 1);
		},

		_setCloseButtonAttr: function(/*Boolean*/ disp){
			// summary:
			//		Hide/show close button
			this._set("closeButton", disp);
			domClass.toggle(this.innerDiv, "dijitClosable", disp);
			this.closeNode.style.display = disp ? "" : "none";
			if(disp){
				var _nlsResources = i18n.getLocalization("dijit", "common");
				if(this.closeNode){
					domAttr.set(this.closeNode,"title", _nlsResources.itemClose);
				}
				// add context menu onto title button
				this._closeMenu = new Menu({
					id: this.id+"_Menu",
					dir: this.dir,
					lang: this.lang,
					textDir: this.textDir,
					targetNodeIds: [this.domNode]
				});

				this._closeMenu.addChild(new MenuItem({
					label: _nlsResources.itemClose,
					dir: this.dir,
					lang: this.lang,
					textDir: this.textDir,
					onClick: lang.hitch(this, "onClickCloseButton")
				}));
			}else{
				if(this._closeMenu){
					this._closeMenu.destroyRecursive();
					delete this._closeMenu;
				}
			}
		},
		_setLabelAttr: function(/*String*/ content){
			// summary:
			//		Hook for set('label', ...) to work.
			// description:
			//		takes an HTML string.
			//		Inherited ToggleButton implementation will Set the label (text) of the button;
			//		Need to set the alt attribute of icon on tab buttons if no label displayed
			this.inherited(arguments);
			if(!this.showLabel && !this.params.title){
				this.iconNode.alt = lang.trim(this.containerNode.innerText || this.containerNode.textContent || '');
			}
		},

		destroy: function(){
			if(this._closeMenu){
				this._closeMenu.destroyRecursive();
				delete this._closeMenu;
			}
			this.inherited(arguments);
		}
	});

	var TabController = declare("dijit.layout.TabController", StackController, {
		// summary:
		// 		Set of tabs (the things with titles and a close button, that you click to show a tab panel).
		//		Used internally by `dijit.layout.TabContainer`.
		// description:
		//		Lets the user select the currently shown pane in a TabContainer or StackContainer.
		//		TabController also monitors the TabContainer, and whenever a pane is
		//		added or deleted updates itself accordingly.
		// tags:
		//		private

		baseClass: "dijitTabController",

		templateString: "<div role='tablist' data-dojo-attach-event='onkeypress:onkeypress'></div>",

		// tabPosition: String
		//		Defines where tabs go relative to the content.
		//		"top", "bottom", "left-h", "right-h"
		tabPosition: "top",

		// buttonWidget: Constructor
		//		The tab widget to create to correspond to each page
		buttonWidget: TabButton,

		_rectifyRtlTabList: function(){
			// summary:
			//		For left/right TabContainer when page is RTL mode, rectify the width of all tabs to be equal, otherwise the tab widths are different in IE

			if(0 >= this.tabPosition.indexOf('-h')){ return; }
			if(!this.pane2button){ return; }

			var maxWidth = 0;
			for(var pane in this.pane2button){
				var ow = this.pane2button[pane].innerDiv.scrollWidth;
				maxWidth = Math.max(maxWidth, ow);
			}
			//unify the length of all the tabs
			for(pane in this.pane2button){
				this.pane2button[pane].innerDiv.style.width = maxWidth + 'px';
			}
		}
	});

	TabController.TabButton = TabButton;	// for monkey patching

	return TabController;
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
'dijit/layout/StackController':function(){
define("dijit/layout/StackController", [
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/_base/event", // event.stop
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.getObject
	"dojo/_base/sniff", // has("ie")
	"../focus",		// focus.focus()
	"../registry",	// registry.byId
	"../_Widget",
	"../_TemplatedMixin",
	"../_Container",
	"../form/ToggleButton",
	"dojo/i18n!../nls/common"
], function(array, declare, event, keys, lang, has,
			focus, registry, _Widget, _TemplatedMixin, _Container, ToggleButton){

/*=====
	var _Widget = dijit._Widget;
	var _TemplatedMixin = dijit._TemplatedMixin;
	var _Container = dijit._Container;
	var ToggleButton = dijit.form.ToggleButton;
=====*/

	// module:
	//		dijit/layout/StackController
	// summary:
	//		Set of buttons to select a page in a `dijit.layout.StackContainer`

	var StackButton = declare("dijit.layout._StackButton", ToggleButton, {
		// summary:
		//		Internal widget used by StackContainer.
		// description:
		//		The button-like or tab-like object you click to select or delete a page
		// tags:
		//		private

		// Override _FormWidget.tabIndex.
		// StackContainer buttons are not in the tab order by default.
		// Probably we should be calling this.startupKeyNavChildren() instead.
		tabIndex: "-1",

		// closeButton: Boolean
		//		When true, display close button for this tab
		closeButton: false,
		
		_setCheckedAttr: function(/*Boolean*/ value, /*Boolean?*/ priorityChange){
			this.inherited(arguments);
			this.focusNode.removeAttribute("aria-pressed");
		},

		buildRendering: function(/*Event*/ evt){
			this.inherited(arguments);
			(this.focusNode || this.domNode).setAttribute("role", "tab");
		},

		onClick: function(/*Event*/ /*===== evt =====*/){
			// summary:
			//		This is for TabContainer where the tabs are <span> rather than button,
			//		so need to set focus explicitly (on some browsers)
			//		Note that you shouldn't override this method, but you can connect to it.
			focus.focus(this.focusNode);

			// ... now let StackController catch the event and tell me what to do
		},

		onClickCloseButton: function(/*Event*/ evt){
			// summary:
			//		StackContainer connects to this function; if your widget contains a close button
			//		then clicking it should call this function.
			//		Note that you shouldn't override this method, but you can connect to it.
			evt.stopPropagation();
		}
	});


	var StackController = declare("dijit.layout.StackController", [_Widget, _TemplatedMixin, _Container], {
		// summary:
		//		Set of buttons to select a page in a `dijit.layout.StackContainer`
		// description:
		//		Monitors the specified StackContainer, and whenever a page is
		//		added, deleted, or selected, updates itself accordingly.

		baseClass: "dijitStackController",

		templateString: "<span role='tablist' data-dojo-attach-event='onkeypress'></span>",

		// containerId: [const] String
		//		The id of the page container that I point to
		containerId: "",

		// buttonWidget: [const] Constructor
		//		The button widget to create to correspond to each page
		buttonWidget: StackButton,

		constructor: function(){
			this.pane2button = {};		// mapping from pane id to buttons
			this.pane2connects = {};	// mapping from pane id to this.connect() handles
			this.pane2watches = {};		// mapping from pane id to watch() handles
		},

		postCreate: function(){
			this.inherited(arguments);

			// Listen to notifications from StackContainer
			this.subscribe(this.containerId+"-startup", "onStartup");
			this.subscribe(this.containerId+"-addChild", "onAddChild");
			this.subscribe(this.containerId+"-removeChild", "onRemoveChild");
			this.subscribe(this.containerId+"-selectChild", "onSelectChild");
			this.subscribe(this.containerId+"-containerKeyPress", "onContainerKeyPress");
		},

		onStartup: function(/*Object*/ info){
			// summary:
			//		Called after StackContainer has finished initializing
			// tags:
			//		private
			array.forEach(info.children, this.onAddChild, this);
			if(info.selected){
				// Show button corresponding to selected pane (unless selected
				// is null because there are no panes)
				this.onSelectChild(info.selected);
			}
		},

		destroy: function(){
			for(var pane in this.pane2button){
				this.onRemoveChild(registry.byId(pane));
			}
			this.inherited(arguments);
		},

		onAddChild: function(/*dijit._Widget*/ page, /*Integer?*/ insertIndex){
			// summary:
			//		Called whenever a page is added to the container.
			//		Create button corresponding to the page.
			// tags:
			//		private

			// create an instance of the button widget
			// (remove typeof buttonWidget == string support in 2.0)
			var cls = lang.isString(this.buttonWidget) ? lang.getObject(this.buttonWidget) : this.buttonWidget;
			var button = new cls({
				id: this.id + "_" + page.id,
				label: page.title,
				dir: page.dir,
				lang: page.lang,
				textDir: page.textDir,
				showLabel: page.showTitle,
				iconClass: page.iconClass,
				closeButton: page.closable,
				title: page.tooltip
			});
			button.focusNode.setAttribute("aria-selected", "false");


			// map from page attribute to corresponding tab button attribute
			var pageAttrList = ["title", "showTitle", "iconClass", "closable", "tooltip"],
				buttonAttrList = ["label", "showLabel", "iconClass", "closeButton", "title"];

			// watch() so events like page title changes are reflected in tab button
			this.pane2watches[page.id] = array.map(pageAttrList, function(pageAttr, idx){
				return page.watch(pageAttr, function(name, oldVal, newVal){
					button.set(buttonAttrList[idx], newVal);
				});
			});

			// connections so that clicking a tab button selects the corresponding page
			this.pane2connects[page.id] = [
				this.connect(button, 'onClick', lang.hitch(this,"onButtonClick", page)),
				this.connect(button, 'onClickCloseButton', lang.hitch(this,"onCloseButtonClick", page))
			];

			this.addChild(button, insertIndex);
			this.pane2button[page.id] = button;
			page.controlButton = button;	// this value might be overwritten if two tabs point to same container
			if(!this._currentChild){ // put the first child into the tab order
				button.focusNode.setAttribute("tabIndex", "0");
				button.focusNode.setAttribute("aria-selected", "true");
				this._currentChild = page;
			}
			// make sure all tabs have the same length
			if(!this.isLeftToRight() && has("ie") && this._rectifyRtlTabList){
				this._rectifyRtlTabList();
			}
		},

		onRemoveChild: function(/*dijit._Widget*/ page){
			// summary:
			//		Called whenever a page is removed from the container.
			//		Remove the button corresponding to the page.
			// tags:
			//		private

			if(this._currentChild === page){ this._currentChild = null; }

			// disconnect/unwatch connections/watches related to page being removed
			array.forEach(this.pane2connects[page.id], lang.hitch(this, "disconnect"));
			delete this.pane2connects[page.id];
			array.forEach(this.pane2watches[page.id], function(w){ w.unwatch(); });
			delete this.pane2watches[page.id];

			var button = this.pane2button[page.id];
			if(button){
				this.removeChild(button);
				delete this.pane2button[page.id];
				button.destroy();
			}
			delete page.controlButton;
		},

		onSelectChild: function(/*dijit._Widget*/ page){
			// summary:
			//		Called when a page has been selected in the StackContainer, either by me or by another StackController
			// tags:
			//		private

			if(!page){ return; }

			if(this._currentChild){
				var oldButton=this.pane2button[this._currentChild.id];
				oldButton.set('checked', false);
				oldButton.focusNode.setAttribute("aria-selected", "false");
				oldButton.focusNode.setAttribute("tabIndex", "-1");
			}

			var newButton=this.pane2button[page.id];
			newButton.set('checked', true);
			newButton.focusNode.setAttribute("aria-selected", "true");
			this._currentChild = page;
			newButton.focusNode.setAttribute("tabIndex", "0");
			var container = registry.byId(this.containerId);
			container.containerNode.setAttribute("aria-labelledby", newButton.id);
		},

		onButtonClick: function(/*dijit._Widget*/ page){
			// summary:
			//		Called whenever one of my child buttons is pressed in an attempt to select a page
			// tags:
			//		private

			if(this._currentChild.id === page.id) {
				//In case the user clicked the checked button, keep it in the checked state because it remains to be the selected stack page.
				var button=this.pane2button[page.id];
				button.set('checked', true);
			}
			var container = registry.byId(this.containerId);
			container.selectChild(page);
		},

		onCloseButtonClick: function(/*dijit._Widget*/ page){
			// summary:
			//		Called whenever one of my child buttons [X] is pressed in an attempt to close a page
			// tags:
			//		private

			var container = registry.byId(this.containerId);
			container.closeChild(page);
			if(this._currentChild){
				var b = this.pane2button[this._currentChild.id];
				if(b){
					focus.focus(b.focusNode || b.domNode);
				}
			}
		},

		// TODO: this is a bit redundant with forward, back api in StackContainer
		adjacent: function(/*Boolean*/ forward){
			// summary:
			//		Helper for onkeypress to find next/previous button
			// tags:
			//		private

			if(!this.isLeftToRight() && (!this.tabPosition || /top|bottom/.test(this.tabPosition))){ forward = !forward; }
			// find currently focused button in children array
			var children = this.getChildren();
			var current = array.indexOf(children, this.pane2button[this._currentChild.id]);
			// pick next button to focus on
			var offset = forward ? 1 : children.length - 1;
			return children[ (current + offset) % children.length ]; // dijit._Widget
		},

		onkeypress: function(/*Event*/ e){
			// summary:
			//		Handle keystrokes on the page list, for advancing to next/previous button
			//		and closing the current page if the page is closable.
			// tags:
			//		private

			if(this.disabled || e.altKey ){ return; }
			var forward = null;
			if(e.ctrlKey || !e._djpage){
				switch(e.charOrCode){
					case keys.LEFT_ARROW:
					case keys.UP_ARROW:
						if(!e._djpage){ forward = false; }
						break;
					case keys.PAGE_UP:
						if(e.ctrlKey){ forward = false; }
						break;
					case keys.RIGHT_ARROW:
					case keys.DOWN_ARROW:
						if(!e._djpage){ forward = true; }
						break;
					case keys.PAGE_DOWN:
						if(e.ctrlKey){ forward = true; }
						break;
					case keys.HOME:
					case keys.END:
						var children = this.getChildren();
						if(children && children.length){
							children[e.charOrCode == keys.HOME ? 0 : children.length-1].onClick();
						}
						event.stop(e);
						break;
					case keys.DELETE:
						if(this._currentChild.closable){
							this.onCloseButtonClick(this._currentChild);
						}
						event.stop(e);
						break;
					default:
						if(e.ctrlKey){
							if(e.charOrCode === keys.TAB){
								this.adjacent(!e.shiftKey).onClick();
								event.stop(e);
							}else if(e.charOrCode == "w"){
								if(this._currentChild.closable){
									this.onCloseButtonClick(this._currentChild);
								}
								event.stop(e); // avoid browser tab closing.
							}
						}
				}
				// handle next/previous page navigation (left/right arrow, etc.)
				if(forward !== null){
					this.adjacent(forward).onClick();
					event.stop(e);
				}
			}
		},

		onContainerKeyPress: function(/*Object*/ info){
			// summary:
			//		Called when there was a keypress on the container
			// tags:
			//		private
			info.e._djpage = info.page;
			this.onkeypress(info.e);
		}
	});

	StackController.StackButton = StackButton;	// for monkey patching

	return StackController;
});

},
'url:dijit/layout/templates/TabContainer.html':"<div class=\"dijitTabContainer\">\n\t<div class=\"dijitTabListWrapper\" data-dojo-attach-point=\"tablistNode\"></div>\n\t<div data-dojo-attach-point=\"tablistSpacer\" class=\"dijitTabSpacer ${baseClass}-spacer\"></div>\n\t<div class=\"dijitTabPaneWrapper ${baseClass}-container\" data-dojo-attach-point=\"containerNode\"></div>\n</div>\n",
'url:dijit/layout/templates/_TabButton.html':"<div role=\"presentation\" data-dojo-attach-point=\"titleNode\" data-dojo-attach-event='onclick:onClick'>\n    <div role=\"presentation\" class='dijitTabInnerDiv' data-dojo-attach-point='innerDiv'>\n        <div role=\"presentation\" class='dijitTabContent' data-dojo-attach-point='tabContent'>\n        \t<div role=\"presentation\" data-dojo-attach-point='focusNode'>\n\t\t        <img src=\"${_blankGif}\" alt=\"\" class=\"dijitIcon dijitTabButtonIcon\" data-dojo-attach-point='iconNode' />\n\t\t        <span data-dojo-attach-point='containerNode' class='tabLabel'></span>\n\t\t        <span class=\"dijitInline dijitTabCloseButton dijitTabCloseIcon\" data-dojo-attach-point='closeNode'\n\t\t        \t\tdata-dojo-attach-event='onclick: onClickCloseButton' role=\"presentation\">\n\t\t            <span data-dojo-attach-point='closeText' class='dijitTabCloseText'>[x]</span\n\t\t        ></span>\n\t\t\t</div>\n        </div>\n    </div>\n</div>\n",
'dijit/layout/BorderContainer':function(){
define("dijit/layout/BorderContainer", [
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/cookie", // cookie
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.remove domClass.toggle
	"dojo/dom-construct", // domConstruct.destroy domConstruct.place
	"dojo/dom-geometry", // domGeometry.marginBox
	"dojo/dom-style", // domStyle.style
	"dojo/_base/event", // event.stop
	"dojo/keys",
	"dojo/_base/lang", // lang.getObject lang.hitch
	"dojo/on",
	"dojo/touch",
	"dojo/_base/window", // win.body win.doc win.doc.createElement
	"../_WidgetBase",
	"../_Widget",
	"../_TemplatedMixin",
	"./_LayoutWidget",
	"./utils"		// layoutUtils.layoutChildren
], function(array, cookie, declare, domClass, domConstruct, domGeometry, domStyle, event, keys, lang, on, touch, win,
			_WidgetBase, _Widget, _TemplatedMixin, _LayoutWidget, layoutUtils){

/*=====
	var _WidgetBase = dijit._WidgetBase;
	var _Widget = dijit._Widget;
	var _TemplatedMixin = dijit._TemplatedMixin;
	var _LayoutWidget = dijit.layout._LayoutWidget;
=====*/

// module:
//		dijit/layout/BorderContainer
// summary:
//		Provides layout in up to 5 regions, a mandatory center with optional borders along its 4 sides.

var _Splitter = declare("dijit.layout._Splitter", [_Widget, _TemplatedMixin ],
{
	// summary:
	//		A draggable spacer between two items in a `dijit.layout.BorderContainer`.
	// description:
	//		This is instantiated by `dijit.layout.BorderContainer`.  Users should not
	//		create it directly.
	// tags:
	//		private

/*=====
 	// container: [const] dijit.layout.BorderContainer
 	//		Pointer to the parent BorderContainer
	container: null,

	// child: [const] dijit.layout._LayoutWidget
	//		Pointer to the pane associated with this splitter
	child: null,

	// region: [const] String
	//		Region of pane associated with this splitter.
	//		"top", "bottom", "left", "right".
	region: null,
=====*/

	// live: [const] Boolean
	//		If true, the child's size changes and the child widget is redrawn as you drag the splitter;
	//		otherwise, the size doesn't change until you drop the splitter (by mouse-up)
	live: true,

	templateString: '<div class="dijitSplitter" data-dojo-attach-event="onkeypress:_onKeyPress,press:_startDrag,onmouseenter:_onMouse,onmouseleave:_onMouse" tabIndex="0" role="separator"><div class="dijitSplitterThumb"></div></div>',

	constructor: function(){
		this._handlers = [];
	},

	postMixInProperties: function(){
		this.inherited(arguments);

		this.horizontal = /top|bottom/.test(this.region);
		this._factor = /top|left/.test(this.region) ? 1 : -1;
		this._cookieName = this.container.id + "_" + this.region;
	},

	buildRendering: function(){
		this.inherited(arguments);

		domClass.add(this.domNode, "dijitSplitter" + (this.horizontal ? "H" : "V"));

		if(this.container.persist){
			// restore old size
			var persistSize = cookie(this._cookieName);
			if(persistSize){
				this.child.domNode.style[this.horizontal ? "height" : "width"] = persistSize;
			}
		}
	},

	_computeMaxSize: function(){
		// summary:
		//		Return the maximum size that my corresponding pane can be set to

		var dim = this.horizontal ? 'h' : 'w',
			childSize = domGeometry.getMarginBox(this.child.domNode)[dim],
			center = array.filter(this.container.getChildren(), function(child){ return child.region == "center";})[0],
			spaceAvailable = domGeometry.getMarginBox(center.domNode)[dim];	// can expand until center is crushed to 0

		return Math.min(this.child.maxSize, childSize + spaceAvailable);
	},

	_startDrag: function(e){
		if(!this.cover){
			this.cover = win.doc.createElement('div');
			domClass.add(this.cover, "dijitSplitterCover");
			domConstruct.place(this.cover, this.child.domNode, "after");
		}
		domClass.add(this.cover, "dijitSplitterCoverActive");

		// Safeguard in case the stop event was missed.  Shouldn't be necessary if we always get the mouse up.
		if(this.fake){ domConstruct.destroy(this.fake); }
		if(!(this._resize = this.live)){ //TODO: disable live for IE6?
			// create fake splitter to display at old position while we drag
			(this.fake = this.domNode.cloneNode(true)).removeAttribute("id");
			domClass.add(this.domNode, "dijitSplitterShadow");
			domConstruct.place(this.fake, this.domNode, "after");
		}
		domClass.add(this.domNode, "dijitSplitterActive dijitSplitter" + (this.horizontal ? "H" : "V") + "Active");
		if(this.fake){
			domClass.remove(this.fake, "dijitSplitterHover dijitSplitter" + (this.horizontal ? "H" : "V") + "Hover");
		}

		//Performance: load data info local vars for onmousevent function closure
		var factor = this._factor,
			isHorizontal = this.horizontal,
			axis = isHorizontal ? "pageY" : "pageX",
			pageStart = e[axis],
			splitterStyle = this.domNode.style,
			dim = isHorizontal ? 'h' : 'w',
			childStart = domGeometry.getMarginBox(this.child.domNode)[dim],
			max = this._computeMaxSize(),
			min = this.child.minSize || 20,
			region = this.region,
			splitterAttr = region == "top" || region == "bottom" ? "top" : "left",	// style attribute of splitter to adjust
			splitterStart = parseInt(splitterStyle[splitterAttr], 10),
			resize = this._resize,
			layoutFunc = lang.hitch(this.container, "_layoutChildren", this.child.id),
			de = win.doc;

		this._handlers = this._handlers.concat([
			on(de, touch.move, this._drag = function(e, forceResize){
				var delta = e[axis] - pageStart,
					childSize = factor * delta + childStart,
					boundChildSize = Math.max(Math.min(childSize, max), min);

				if(resize || forceResize){
					layoutFunc(boundChildSize);
				}
				// TODO: setting style directly (usually) sets content box size, need to set margin box size
				splitterStyle[splitterAttr] = delta + splitterStart + factor*(boundChildSize - childSize) + "px";
			}),
			on(de, "dragstart", event.stop),
			on(win.body(), "selectstart", event.stop),
			on(de, touch.release, lang.hitch(this, "_stopDrag"))
		]);
		event.stop(e);
	},

	_onMouse: function(e){
		// summary:
		//		Handler for onmouseenter / onmouseleave events
		var o = (e.type == "mouseover" || e.type == "mouseenter");
		domClass.toggle(this.domNode, "dijitSplitterHover", o);
		domClass.toggle(this.domNode, "dijitSplitter" + (this.horizontal ? "H" : "V") + "Hover", o);
	},

	_stopDrag: function(e){
		try{
			if(this.cover){
				domClass.remove(this.cover, "dijitSplitterCoverActive");
			}
			if(this.fake){ domConstruct.destroy(this.fake); }
			domClass.remove(this.domNode, "dijitSplitterActive dijitSplitter"
				+ (this.horizontal ? "H" : "V") + "Active dijitSplitterShadow");
			this._drag(e); //TODO: redundant with onmousemove?
			this._drag(e, true);
		}finally{
			this._cleanupHandlers();
			delete this._drag;
		}

		if(this.container.persist){
			cookie(this._cookieName, this.child.domNode.style[this.horizontal ? "height" : "width"], {expires:365});
		}
	},

	_cleanupHandlers: function(){
		var h;
		while(h = this._handlers.pop()){ h.remove(); }
	},

	_onKeyPress: function(/*Event*/ e){
		// should we apply typematic to this?
		this._resize = true;
		var horizontal = this.horizontal;
		var tick = 1;
		switch(e.charOrCode){
			case horizontal ? keys.UP_ARROW : keys.LEFT_ARROW:
				tick *= -1;
//				break;
			case horizontal ? keys.DOWN_ARROW : keys.RIGHT_ARROW:
				break;
			default:
//				this.inherited(arguments);
				return;
		}
		var childSize = domGeometry.getMarginSize(this.child.domNode)[ horizontal ? 'h' : 'w' ] + this._factor * tick;
		this.container._layoutChildren(this.child.id, Math.max(Math.min(childSize, this._computeMaxSize()), this.child.minSize));
		event.stop(e);
	},

	destroy: function(){
		this._cleanupHandlers();
		delete this.child;
		delete this.container;
		delete this.cover;
		delete this.fake;
		this.inherited(arguments);
	}
});

var _Gutter = declare("dijit.layout._Gutter", [_Widget, _TemplatedMixin],
{
	// summary:
	// 		Just a spacer div to separate side pane from center pane.
	//		Basically a trick to lookup the gutter/splitter width from the theme.
	// description:
	//		Instantiated by `dijit.layout.BorderContainer`.  Users should not
	//		create directly.
	// tags:
	//		private

	templateString: '<div class="dijitGutter" role="presentation"></div>',

	postMixInProperties: function(){
		this.inherited(arguments);
		this.horizontal = /top|bottom/.test(this.region);
	},

	buildRendering: function(){
		this.inherited(arguments);
		domClass.add(this.domNode, "dijitGutter" + (this.horizontal ? "H" : "V"));
	}
});

var BorderContainer = declare("dijit.layout.BorderContainer", _LayoutWidget, {
	// summary:
	//		Provides layout in up to 5 regions, a mandatory center with optional borders along its 4 sides.
	//
	// description:
	//		A BorderContainer is a box with a specified size, such as style="width: 500px; height: 500px;",
	//		that contains a child widget marked region="center" and optionally children widgets marked
	//		region equal to "top", "bottom", "leading", "trailing", "left" or "right".
	//		Children along the edges will be laid out according to width or height dimensions and may
	//		include optional splitters (splitter="true") to make them resizable by the user.  The remaining
	//		space is designated for the center region.
	//
	//		The outer size must be specified on the BorderContainer node.  Width must be specified for the sides
	//		and height for the top and bottom, respectively.  No dimensions should be specified on the center;
	//		it will fill the remaining space.  Regions named "leading" and "trailing" may be used just like
	//		"left" and "right" except that they will be reversed in right-to-left environments.
	//
	//		For complex layouts, multiple children can be specified for a single region.   In this case, the
	//		layoutPriority flag on the children determines which child is closer to the edge (low layoutPriority)
	//		and which child is closer to the center (high layoutPriority).   layoutPriority can also be used
	//		instead of the design attribute to control layout precedence of horizontal vs. vertical panes.
	// example:
	// |	<div data-dojo-type="dijit.layout.BorderContainer" data-dojo-props="design: 'sidebar', gutters: false"
	// |            style="width: 400px; height: 300px;">
	// |		<div data-dojo-type="dijit.layout.ContentPane" data-dojo-props="region: 'top'">header text</div>
	// |		<div data-dojo-type="dijit.layout.ContentPane" data-dojo-props="region: 'right', splitter: true" style="width: 200px;">table of contents</div>
	// |		<div data-dojo-type="dijit.layout.ContentPane" data-dojo-props="region: 'center'">client area</div>
	// |	</div>

	// design: String
	//		Which design is used for the layout:
	//			- "headline" (default) where the top and bottom extend
	//				the full width of the container
	//			- "sidebar" where the left and right sides extend from top to bottom.
	design: "headline",

	// gutters: [const] Boolean
	//		Give each pane a border and margin.
	//		Margin determined by domNode.paddingLeft.
	//		When false, only resizable panes have a gutter (i.e. draggable splitter) for resizing.
	gutters: true,

	// liveSplitters: [const] Boolean
	//		Specifies whether splitters resize as you drag (true) or only upon mouseup (false)
	liveSplitters: true,

	// persist: Boolean
	//		Save splitter positions in a cookie.
	persist: false,

	baseClass: "dijitBorderContainer",

	// _splitterClass: Function||String
	// 		Optional hook to override the default Splitter widget used by BorderContainer
	_splitterClass: _Splitter,

	postMixInProperties: function(){
		// change class name to indicate that BorderContainer is being used purely for
		// layout (like LayoutContainer) rather than for pretty formatting.
		if(!this.gutters){
			this.baseClass += "NoGutter";
		}
		this.inherited(arguments);
	},

	startup: function(){
		if(this._started){ return; }
		array.forEach(this.getChildren(), this._setupChild, this);
		this.inherited(arguments);
	},

	_setupChild: function(/*dijit._Widget*/ child){
		// Override _LayoutWidget._setupChild().

		var region = child.region;
		if(region){
			this.inherited(arguments);

			domClass.add(child.domNode, this.baseClass+"Pane");

			var ltr = this.isLeftToRight();
			if(region == "leading"){ region = ltr ? "left" : "right"; }
			if(region == "trailing"){ region = ltr ? "right" : "left"; }

			// Create draggable splitter for resizing pane,
			// or alternately if splitter=false but BorderContainer.gutters=true then
			// insert dummy div just for spacing
			if(region != "center" && (child.splitter || this.gutters) && !child._splitterWidget){
				var _Splitter = child.splitter ? this._splitterClass : _Gutter;
				if(lang.isString(_Splitter)){
					_Splitter = lang.getObject(_Splitter);	// for back-compat, remove in 2.0
				}
				var splitter = new _Splitter({
					id: child.id + "_splitter",
					container: this,
					child: child,
					region: region,
					live: this.liveSplitters
				});
				splitter.isSplitter = true;
				child._splitterWidget = splitter;

				domConstruct.place(splitter.domNode, child.domNode, "after");

				// Splitters aren't added as Contained children, so we need to call startup explicitly
				splitter.startup();
			}
			child.region = region;	// TODO: technically wrong since it overwrites "trailing" with "left" etc.
		}
	},

	layout: function(){
		// Implement _LayoutWidget.layout() virtual method.
		this._layoutChildren();
	},

	addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
		// Override _LayoutWidget.addChild().
		this.inherited(arguments);
		if(this._started){
			this.layout(); //OPT
		}
	},

	removeChild: function(/*dijit._Widget*/ child){
		// Override _LayoutWidget.removeChild().

		var region = child.region;
		var splitter = child._splitterWidget;
		if(splitter){
			splitter.destroy();
			delete child._splitterWidget;
		}
		this.inherited(arguments);

		if(this._started){
			this._layoutChildren();
		}
		// Clean up whatever style changes we made to the child pane.
		// Unclear how height and width should be handled.
		domClass.remove(child.domNode, this.baseClass+"Pane");
		domStyle.set(child.domNode, {
			top: "auto",
			bottom: "auto",
			left: "auto",
			right: "auto",
			position: "static"
		});
		domStyle.set(child.domNode, region == "top" || region == "bottom" ? "width" : "height", "auto");
	},

	getChildren: function(){
		// Override _LayoutWidget.getChildren() to only return real children, not the splitters.
		return array.filter(this.inherited(arguments), function(widget){
			return !widget.isSplitter;
		});
	},

	// TODO: remove in 2.0
	getSplitter: function(/*String*/region){
		// summary:
		//		Returns the widget responsible for rendering the splitter associated with region
		// tags:
		//		deprecated
		return array.filter(this.getChildren(), function(child){
			return child.region == region;
		})[0]._splitterWidget;
	},

	resize: function(newSize, currentSize){
		// Overrides _LayoutWidget.resize().

		// resetting potential padding to 0px to provide support for 100% width/height + padding
		// TODO: this hack doesn't respect the box model and is a temporary fix
		if(!this.cs || !this.pe){
			var node = this.domNode;
			this.cs = domStyle.getComputedStyle(node);
			this.pe = domGeometry.getPadExtents(node, this.cs);
			this.pe.r = domStyle.toPixelValue(node, this.cs.paddingRight);
			this.pe.b = domStyle.toPixelValue(node, this.cs.paddingBottom);

			domStyle.set(node, "padding", "0px");
		}

		this.inherited(arguments);
	},

	_layoutChildren: function(/*String?*/ changedChildId, /*Number?*/ changedChildSize){
		// summary:
		//		This is the main routine for setting size/position of each child.
		// description:
		//		With no arguments, measures the height of top/bottom panes, the width
		//		of left/right panes, and then sizes all panes accordingly.
		//
		//		With changedRegion specified (as "left", "top", "bottom", or "right"),
		//		it changes that region's width/height to changedRegionSize and
		//		then resizes other regions that were affected.
		// changedChildId:
		//		Id of the child which should be resized because splitter was dragged.
		// changedChildSize:
		//		The new width/height (in pixels) to make specified child

		if(!this._borderBox || !this._borderBox.h){
			// We are currently hidden, or we haven't been sized by our parent yet.
			// Abort.   Someone will resize us later.
			return;
		}

		// Generate list of wrappers of my children in the order that I want layoutChildren()
		// to process them (i.e. from the outside to the inside)
		var wrappers = array.map(this.getChildren(), function(child, idx){
			return {
				pane: child,
				weight: [
					child.region == "center" ? Infinity : 0,
					child.layoutPriority,
					(this.design == "sidebar" ? 1 : -1) * (/top|bottom/.test(child.region) ? 1 : -1),
					idx
				]
			};
		}, this);
		wrappers.sort(function(a, b){
			var aw = a.weight, bw = b.weight;
			for(var i=0; i<aw.length; i++){
				if(aw[i] != bw[i]){
					return aw[i] - bw[i];
				}
			}
			return 0;
		});

		// Make new list, combining the externally specified children with splitters and gutters
		var childrenAndSplitters = [];
		array.forEach(wrappers, function(wrapper){
			var pane = wrapper.pane;
			childrenAndSplitters.push(pane);
			if(pane._splitterWidget){
				childrenAndSplitters.push(pane._splitterWidget);
			}
		});

		// Compute the box in which to lay out my children
		var dim = {
			l: this.pe.l,
			t: this.pe.t,
			w: this._borderBox.w - this.pe.w,
			h: this._borderBox.h - this.pe.h
		};

		// Layout the children, possibly changing size due to a splitter drag
		layoutUtils.layoutChildren(this.domNode, dim, childrenAndSplitters,
			changedChildId, changedChildSize);
	},

	destroyRecursive: function(){
		// Destroy splitters first, while getChildren() still works
		array.forEach(this.getChildren(), function(child){
			var splitter = child._splitterWidget;
			if(splitter){
				splitter.destroy();
			}
			delete child._splitterWidget;
		});

		// Then destroy the real children, and myself
		this.inherited(arguments);
	}
});

// This argument can be specified for the children of a BorderContainer.
// Since any widget can be specified as a LayoutContainer child, mix it
// into the base widget class.  (This is a hack, but it's effective.)
lang.extend(_WidgetBase, {
	// region: [const] String
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Values: "top", "bottom", "leading", "trailing", "left", "right", "center".
	//		See the `dijit.layout.BorderContainer` description for details.
	region: '',

	// layoutPriority: [const] Number
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Children with a higher layoutPriority will be placed closer to the BorderContainer center,
	//		between children with a lower layoutPriority.
	layoutPriority: 0,

	// splitter: [const] Boolean
	//		Parameter for child of `dijit.layout.BorderContainer` where region != "center".
	//		If true, enables user to resize the widget by putting a draggable splitter between
	//		this widget and the region=center widget.
	splitter: false,

	// minSize: [const] Number
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Specifies a minimum size (in pixels) for this widget when resized by a splitter.
	minSize: 0,

	// maxSize: [const] Number
	//		Parameter for children of `dijit.layout.BorderContainer`.
	//		Specifies a maximum size (in pixels) for this widget when resized by a splitter.
	maxSize: Infinity
});

// For monkey patching
BorderContainer._Splitter = _Splitter;
BorderContainer._Gutter = _Gutter;

return BorderContainer;
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
'url:dijit/form/templates/Button.html':"<span class=\"dijit dijitReset dijitInline\" role=\"presentation\"\n\t><span class=\"dijitReset dijitInline dijitButtonNode\"\n\t\tdata-dojo-attach-event=\"ondijitclick:_onClick\" role=\"presentation\"\n\t\t><span class=\"dijitReset dijitStretch dijitButtonContents\"\n\t\t\tdata-dojo-attach-point=\"titleNode,focusNode\"\n\t\t\trole=\"button\" aria-labelledby=\"${id}_label\"\n\t\t\t><span class=\"dijitReset dijitInline dijitIcon\" data-dojo-attach-point=\"iconNode\"></span\n\t\t\t><span class=\"dijitReset dijitToggleButtonIconChar\">&#x25CF;</span\n\t\t\t><span class=\"dijitReset dijitInline dijitButtonText\"\n\t\t\t\tid=\"${id}_label\"\n\t\t\t\tdata-dojo-attach-point=\"containerNode\"\n\t\t\t></span\n\t\t></span\n\t></span\n\t><input ${!nameAttrSetting} type=\"${type}\" value=\"${value}\" class=\"dijitOffScreen\"\n\t\ttabIndex=\"-1\" role=\"presentation\" data-dojo-attach-point=\"valueNode\"\n/></span>\n",
'url:dijit/layout/templates/_ScrollingTabControllerButton.html':"<div data-dojo-attach-event=\"onclick:_onClick\">\n\t<div role=\"presentation\" class=\"dijitTabInnerDiv\" data-dojo-attach-point=\"innerDiv,focusNode\">\n\t\t<div role=\"presentation\" class=\"dijitTabContent dijitButtonContents\" data-dojo-attach-point=\"tabContent\">\n\t\t\t<img role=\"presentation\" alt=\"\" src=\"${_blankGif}\" class=\"dijitTabStripIcon\" data-dojo-attach-point=\"iconNode\"/>\n\t\t\t<span data-dojo-attach-point=\"containerNode,titleNode\" class=\"dijitButtonText\"></span>\n\t\t</div>\n\t</div>\n</div>",
'dijit/layout/AccordionContainer':function(){
require({cache:{
'url:dijit/layout/templates/AccordionButton.html':"<div data-dojo-attach-event='onclick:_onTitleClick' class='dijitAccordionTitle' role=\"presentation\">\n\t<div data-dojo-attach-point='titleNode,focusNode' data-dojo-attach-event='onkeypress:_onTitleKeyPress'\n\t\t\tclass='dijitAccordionTitleFocus' role=\"tab\" aria-expanded=\"false\"\n\t\t><span class='dijitInline dijitAccordionArrow' role=\"presentation\"></span\n\t\t><span class='arrowTextUp' role=\"presentation\">+</span\n\t\t><span class='arrowTextDown' role=\"presentation\">-</span\n\t\t><img src=\"${_blankGif}\" alt=\"\" class=\"dijitIcon\" data-dojo-attach-point='iconNode' style=\"vertical-align: middle\" role=\"presentation\"/>\n\t\t<span role=\"presentation\" data-dojo-attach-point='titleTextNode' class='dijitAccordionText'></span>\n\t</div>\n</div>\n"}});
define("dijit/layout/AccordionContainer", [
	"require",
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/declare", // declare
	"dojo/_base/event", // event.stop
	"dojo/_base/fx", // fx.Animation
	"dojo/dom", // dom.setSelectable
	"dojo/dom-attr", // domAttr.attr
	"dojo/dom-class", // domClass.remove
	"dojo/dom-construct", // domConstruct.place
	"dojo/dom-geometry",
	"dojo/_base/kernel",
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.getObject lang.hitch
	"dojo/_base/sniff", // has("ie")
	"dojo/topic", // publish
	"../focus",			// focus.focus()
	"../_base/manager",	// manager.defaultDuration
	"dojo/ready",
	"../_Widget",
	"../_Container",
	"../_TemplatedMixin",
	"../_CssStateMixin",
	"./StackContainer",
	"./ContentPane",
	"dojo/text!./templates/AccordionButton.html"
], function(require, array, declare, event, fx, dom, domAttr, domClass, domConstruct, domGeometry,
			kernel, keys, lang, has, topic, focus, manager, ready,
			_Widget, _Container, _TemplatedMixin, _CssStateMixin, StackContainer, ContentPane, template){

/*=====
	var _Widget = dijit._Widget;
	var _Container = dijit._Container;
	var _TemplatedMixin = dijit._TemplatedMixin;
	var _CssStateMixin = dijit._CssStateMixin;
	var StackContainer = dijit.layout.StackContainer;
	var ContentPane = dijit.layout.ContentPane;
=====*/

	// module:
	//		dijit/layout/AccordionContainer
	// summary:
	//		Holds a set of panes where every pane's title is visible, but only one pane's content is visible at a time,
	//		and switching between panes is visualized by sliding the other panes up/down.


	// Design notes:
	//
	// An AccordionContainer is a StackContainer, but each child (typically ContentPane)
	// is wrapped in a _AccordionInnerContainer.   This is hidden from the caller.
	//
	// The resulting markup will look like:
	//
	//	<div class=dijitAccordionContainer>
	//		<div class=dijitAccordionInnerContainer>	(one pane)
	//				<div class=dijitAccordionTitle>		(title bar) ... </div>
	//				<div class=dijtAccordionChildWrapper>   (content pane) </div>
	//		</div>
	//	</div>
	//
	// Normally the dijtAccordionChildWrapper is hidden for all but one child (the shown
	// child), so the space for the content pane is all the title bars + the one dijtAccordionChildWrapper,
	// which on claro has a 1px border plus a 2px bottom margin.
	//
	// During animation there are two dijtAccordionChildWrapper's shown, so we need
	// to compensate for that.


	var AccordionButton = declare("dijit.layout._AccordionButton", [_Widget, _TemplatedMixin, _CssStateMixin], {
		// summary:
		//		The title bar to click to open up an accordion pane.
		//		Internal widget used by AccordionContainer.
		// tags:
		//		private

		templateString: template,

		// label: String
		//		Title of the pane
		label: "",
		_setLabelAttr: {node: "titleTextNode", type: "innerHTML" },

		// title: String
		//		Tooltip that appears on hover
		title: "",
		_setTitleAttr: {node: "titleTextNode", type: "attribute", attribute: "title"},

		// iconClassAttr: String
		//		CSS class for icon to left of label
		iconClassAttr: "",
		_setIconClassAttr: { node: "iconNode", type: "class" },

		baseClass: "dijitAccordionTitle",

		getParent: function(){
			// summary:
			//		Returns the AccordionContainer parent.
			// tags:
			//		private
			return this.parent;
		},

		buildRendering: function(){
			this.inherited(arguments);
			var titleTextNodeId = this.id.replace(' ','_');
			domAttr.set(this.titleTextNode, "id", titleTextNodeId+"_title");
			this.focusNode.setAttribute("aria-labelledby", domAttr.get(this.titleTextNode, "id"));
			dom.setSelectable(this.domNode, false);
		},

		getTitleHeight: function(){
			// summary:
			//		Returns the height of the title dom node.
			return domGeometry.getMarginSize(this.domNode).h;	// Integer
		},

		// TODO: maybe the parent should set these methods directly rather than forcing the code
		// into the button widget?
		_onTitleClick: function(){
			// summary:
			//		Callback when someone clicks my title.
			var parent = this.getParent();
				parent.selectChild(this.contentWidget, true);
				focus.focus(this.focusNode);
		},

		_onTitleKeyPress: function(/*Event*/ evt){
			return this.getParent()._onKeyPress(evt, this.contentWidget);
		},

		_setSelectedAttr: function(/*Boolean*/ isSelected){
			this._set("selected", isSelected);
			this.focusNode.setAttribute("aria-expanded", isSelected);
			this.focusNode.setAttribute("aria-selected", isSelected);
			this.focusNode.setAttribute("tabIndex", isSelected ? "0" : "-1");
		}
	});

	var AccordionInnerContainer = declare("dijit.layout._AccordionInnerContainer", [_Widget, _CssStateMixin], {
		// summary:
		//		Internal widget placed as direct child of AccordionContainer.containerNode.
		//		When other widgets are added as children to an AccordionContainer they are wrapped in
		//		this widget.

/*=====
		// buttonWidget: Function || String
		//		Class to use to instantiate title
		//		(Wish we didn't have a separate widget for just the title but maintaining it
		//		for backwards compatibility, is it worth it?)
		 buttonWidget: null,
=====*/

/*=====
		// contentWidget: dijit._Widget
		//		Pointer to the real child widget
	 	contentWidget: null,
=====*/

		baseClass: "dijitAccordionInnerContainer",

		// tell nested layout widget that we will take care of sizing
		isLayoutContainer: true,

		buildRendering: function(){
			// Builds a template like:
			//	<div class=dijitAccordionInnerContainer>
			//		Button
			//		<div class=dijitAccordionChildWrapper>
			//			ContentPane
			//		</div>
			//	</div>

			// Create wrapper div, placed where the child is now
			this.domNode = domConstruct.place("<div class='" + this.baseClass +
				"' role='presentation'>", this.contentWidget.domNode, "after");

			// wrapper div's first child is the button widget (ie, the title bar)
			var child = this.contentWidget,
				cls = lang.isString(this.buttonWidget) ? lang.getObject(this.buttonWidget) : this.buttonWidget;
			this.button = child._buttonWidget = (new cls({
				contentWidget: child,
				label: child.title,
				title: child.tooltip,
				dir: child.dir,
				lang: child.lang,
				textDir: child.textDir,
				iconClass: child.iconClass,
				id: child.id + "_button",
				parent: this.parent
			})).placeAt(this.domNode);

			// and then the actual content widget (changing it from prior-sibling to last-child),
			// wrapped by a <div class=dijitAccordionChildWrapper>
			this.containerNode = domConstruct.place("<div class='dijitAccordionChildWrapper' style='display:none'>", this.domNode);
			domConstruct.place(this.contentWidget.domNode, this.containerNode);
		},

		postCreate: function(){
			this.inherited(arguments);

			// Map changes in content widget's title etc. to changes in the button
			var button = this.button;
			this._contentWidgetWatches = [
				this.contentWidget.watch('title', lang.hitch(this, function(name, oldValue, newValue){
					button.set("label", newValue);
				})),
				this.contentWidget.watch('tooltip', lang.hitch(this, function(name, oldValue, newValue){
					button.set("title", newValue);
				})),
				this.contentWidget.watch('iconClass', lang.hitch(this, function(name, oldValue, newValue){
					button.set("iconClass", newValue);
				}))
			];
		},

		_setSelectedAttr: function(/*Boolean*/ isSelected){
			this._set("selected", isSelected);
			this.button.set("selected", isSelected);
			if(isSelected){
				var cw = this.contentWidget;
				if(cw.onSelected){ cw.onSelected(); }
			}
		},

		startup: function(){
			// Called by _Container.addChild()
			this.contentWidget.startup();
		},

		destroy: function(){
			this.button.destroyRecursive();

			array.forEach(this._contentWidgetWatches || [], function(w){ w.unwatch(); });

			delete this.contentWidget._buttonWidget;
			delete this.contentWidget._wrapperWidget;

			this.inherited(arguments);
		},

		destroyDescendants: function(/*Boolean*/ preserveDom){
			// since getChildren isn't working for me, have to code this manually
			this.contentWidget.destroyRecursive(preserveDom);
		}
	});

	var AccordionContainer = declare("dijit.layout.AccordionContainer", StackContainer, {
		// summary:
		//		Holds a set of panes where every pane's title is visible, but only one pane's content is visible at a time,
		//		and switching between panes is visualized by sliding the other panes up/down.
		// example:
		//	| 	<div data-dojo-type="dijit.layout.AccordionContainer">
		//	|		<div data-dojo-type="dijit.layout.ContentPane" title="pane 1">
		//	|		</div>
		//	|		<div data-dojo-type="dijit.layout.ContentPane" title="pane 2">
		//	|			<p>This is some text</p>
		//	|		</div>
		//	|	</div>

		// duration: Integer
		//		Amount of time (in ms) it takes to slide panes
		duration: manager.defaultDuration,

		// buttonWidget: [const] String
		//		The name of the widget used to display the title of each pane
		buttonWidget: AccordionButton,

/*=====
		// _verticalSpace: Number
		//		Pixels of space available for the open pane
		//		(my content box size minus the cumulative size of all the title bars)
		_verticalSpace: 0,
=====*/
		baseClass: "dijitAccordionContainer",

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.style.overflow = "hidden";		// TODO: put this in dijit.css
			this.domNode.setAttribute("role", "tablist");	// TODO: put this in template
		},

		startup: function(){
			if(this._started){ return; }
			this.inherited(arguments);
			if(this.selectedChildWidget){
				var style = this.selectedChildWidget.containerNode.style;
				style.display = "";
				style.overflow = "auto";
				this.selectedChildWidget._wrapperWidget.set("selected", true);
			}
		},

		layout: function(){
			// Implement _LayoutWidget.layout() virtual method.
			// Set the height of the open pane based on what room remains.

			var openPane = this.selectedChildWidget;

			if(!openPane){ return;}

			// space taken up by title, plus wrapper div (with border/margin) for open pane
			var wrapperDomNode = openPane._wrapperWidget.domNode,
				wrapperDomNodeMargin = domGeometry.getMarginExtents(wrapperDomNode),
				wrapperDomNodePadBorder = domGeometry.getPadBorderExtents(wrapperDomNode),
				wrapperContainerNode = openPane._wrapperWidget.containerNode,
				wrapperContainerNodeMargin = domGeometry.getMarginExtents(wrapperContainerNode),
				wrapperContainerNodePadBorder = domGeometry.getPadBorderExtents(wrapperContainerNode),
				mySize = this._contentBox;

			// get cumulative height of all the unselected title bars
			var totalCollapsedHeight = 0;
			array.forEach(this.getChildren(), function(child){
	            if(child != openPane){
					// Using domGeometry.getMarginSize() rather than domGeometry.position() since claro has 1px bottom margin
					// to separate accordion panes.  Not sure that works perfectly, it's probably putting a 1px
					// margin below the bottom pane (even though we don't want one).
					totalCollapsedHeight += domGeometry.getMarginSize(child._wrapperWidget.domNode).h;
				}
			});
			this._verticalSpace = mySize.h - totalCollapsedHeight - wrapperDomNodeMargin.h
			 	- wrapperDomNodePadBorder.h - wrapperContainerNodeMargin.h - wrapperContainerNodePadBorder.h
				- openPane._buttonWidget.getTitleHeight();

			// Memo size to make displayed child
			this._containerContentBox = {
				h: this._verticalSpace,
				w: this._contentBox.w - wrapperDomNodeMargin.w - wrapperDomNodePadBorder.w
					- wrapperContainerNodeMargin.w - wrapperContainerNodePadBorder.w
			};

			if(openPane){
				openPane.resize(this._containerContentBox);
			}
		},

		_setupChild: function(child){
			// Overrides _LayoutWidget._setupChild().
			// Put wrapper widget around the child widget, showing title

			child._wrapperWidget = AccordionInnerContainer({
				contentWidget: child,
				buttonWidget: this.buttonWidget,
				id: child.id + "_wrapper",
				dir: child.dir,
				lang: child.lang,
				textDir: child.textDir,
				parent: this
			});

			this.inherited(arguments);
		},

		addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
			if(this._started){
				// Adding a child to a started Accordion is complicated because children have
				// wrapper widgets.  Default code path (calling this.inherited()) would add
				// the new child inside another child's wrapper.

				// First add in child as a direct child of this AccordionContainer
				var refNode = this.containerNode;
				if(insertIndex && typeof insertIndex == "number"){
					var children = _Widget.prototype.getChildren.call(this);	// get wrapper panes
					if(children && children.length >= insertIndex){
						refNode = children[insertIndex-1].domNode;
						insertIndex = "after";
					}
				}
				domConstruct.place(child.domNode, refNode, insertIndex);

				if(!child._started){
					child.startup();
				}

				// Then stick the wrapper widget around the child widget
				this._setupChild(child);

				// Code below copied from StackContainer
				topic.publish(this.id+"-addChild", child, insertIndex);	// publish
				this.layout();
				if(!this.selectedChildWidget){
					this.selectChild(child);
				}
			}else{
				// We haven't been started yet so just add in the child widget directly,
				// and the wrapper will be created on startup()
				this.inherited(arguments);
			}
		},

		removeChild: function(child){
			// Overrides _LayoutWidget.removeChild().

			// Destroy wrapper widget first, before StackContainer.getChildren() call.
			// Replace wrapper widget with true child widget (ContentPane etc.).
			// This step only happens if the AccordionContainer has been started; otherwise there's no wrapper.
			if(child._wrapperWidget){
				domConstruct.place(child.domNode, child._wrapperWidget.domNode, "after");
				child._wrapperWidget.destroy();
				delete child._wrapperWidget;
			}

			domClass.remove(child.domNode, "dijitHidden");

			this.inherited(arguments);
		},

		getChildren: function(){
			// Overrides _Container.getChildren() to return content panes rather than internal AccordionInnerContainer panes
			return array.map(this.inherited(arguments), function(child){
				return child.declaredClass == "dijit.layout._AccordionInnerContainer" ? child.contentWidget : child;
			}, this);
		},

		destroy: function(){
			if(this._animation){
				this._animation.stop();
			}
			array.forEach(this.getChildren(), function(child){
				// If AccordionContainer has been started, then each child has a wrapper widget which
				// also needs to be destroyed.
				if(child._wrapperWidget){
					child._wrapperWidget.destroy();
				}else{
					child.destroyRecursive();
				}
			});
			this.inherited(arguments);
		},

		_showChild: function(child){
			// Override StackContainer._showChild() to set visibility of _wrapperWidget.containerNode
			child._wrapperWidget.containerNode.style.display="block";
			return this.inherited(arguments);
		},

		_hideChild: function(child){
			// Override StackContainer._showChild() to set visibility of _wrapperWidget.containerNode
			child._wrapperWidget.containerNode.style.display="none";
			this.inherited(arguments);
		},

		_transition: function(/*dijit._Widget?*/ newWidget, /*dijit._Widget?*/ oldWidget, /*Boolean*/ animate){
			// Overrides StackContainer._transition() to provide sliding of title bars etc.

			if(has("ie") < 8){
				// workaround animation bugs by not animating; not worth supporting animation for IE6 & 7
				animate = false;
			}

			if(this._animation){
				// there's an in-progress animation.  speedily end it so we can do the newly requested one
				this._animation.stop(true);
				delete this._animation;
			}

			var self = this;

			if(newWidget){
				newWidget._wrapperWidget.set("selected", true);

				var d = this._showChild(newWidget);	// prepare widget to be slid in

				// Size the new widget, in case this is the first time it's being shown,
				// or I have been resized since the last time it was shown.
				// Note that page must be visible for resizing to work.
				if(this.doLayout && newWidget.resize){
					newWidget.resize(this._containerContentBox);
				}
			}

			if(oldWidget){
				oldWidget._wrapperWidget.set("selected", false);
				if(!animate){
					this._hideChild(oldWidget);
				}
			}

			if(animate){
				var newContents = newWidget._wrapperWidget.containerNode,
					oldContents = oldWidget._wrapperWidget.containerNode;

				// During the animation we will be showing two dijitAccordionChildWrapper nodes at once,
				// which on claro takes up 4px extra space (compared to stable AccordionContainer).
				// Have to compensate for that by immediately shrinking the pane being closed.
				var wrapperContainerNode = newWidget._wrapperWidget.containerNode,
					wrapperContainerNodeMargin = domGeometry.getMarginExtents(wrapperContainerNode),
					wrapperContainerNodePadBorder = domGeometry.getPadBorderExtents(wrapperContainerNode),
					animationHeightOverhead = wrapperContainerNodeMargin.h + wrapperContainerNodePadBorder.h;

				oldContents.style.height = (self._verticalSpace - animationHeightOverhead) + "px";

				this._animation = new fx.Animation({
					node: newContents,
					duration: this.duration,
					curve: [1, this._verticalSpace - animationHeightOverhead - 1],
					onAnimate: function(value){
						value = Math.floor(value);	// avoid fractional values
						newContents.style.height = value + "px";
						oldContents.style.height = (self._verticalSpace - animationHeightOverhead - value) + "px";
					},
					onEnd: function(){
						delete self._animation;
						newContents.style.height = "auto";
						oldWidget._wrapperWidget.containerNode.style.display = "none";
						oldContents.style.height = "auto";
						self._hideChild(oldWidget);
					}
				});
				this._animation.onStop = this._animation.onEnd;
				this._animation.play();
			}

			return d;	// If child has an href, promise that fires when the widget has finished loading
		},

		// note: we are treating the container as controller here
		_onKeyPress: function(/*Event*/ e, /*dijit._Widget*/ fromTitle){
			// summary:
			//		Handle keypress events
			// description:
			//		This is called from a handler on AccordionContainer.domNode
			//		(setup in StackContainer), and is also called directly from
			//		the click handler for accordion labels
			if(this.disabled || e.altKey || !(fromTitle || e.ctrlKey)){
				return;
			}
			var c = e.charOrCode;
			if((fromTitle && (c == keys.LEFT_ARROW || c == keys.UP_ARROW)) ||
					(e.ctrlKey && c == keys.PAGE_UP)){
				this._adjacent(false)._buttonWidget._onTitleClick();
				event.stop(e);
			}else if((fromTitle && (c == keys.RIGHT_ARROW || c == keys.DOWN_ARROW)) ||
					(e.ctrlKey && (c == keys.PAGE_DOWN || c == keys.TAB))){
				this._adjacent(true)._buttonWidget._onTitleClick();
				event.stop(e);
			}
		}
	});

	// Back compat w/1.6, remove for 2.0
	if(!kernel.isAsync){
		ready(0, function(){
			var requires = ["dijit/layout/AccordionPane"];
			require(requires);	// use indirection so modules not rolled into a build
		});
	}

	// For monkey patching
	AccordionContainer._InnerContainer = AccordionInnerContainer;
	AccordionContainer._Button = AccordionButton;

	return AccordionContainer;
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
'url:dijit/layout/templates/ScrollingTabController.html':"<div class=\"dijitTabListContainer-${tabPosition}\" style=\"visibility:hidden\">\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerMenuButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_menuBtn\"\n\t\t\tdata-dojo-props=\"containerId: '${containerId}', iconClass: 'dijitTabStripMenuIcon',\n\t\t\t\t\tdropDownPosition: ['below-alt', 'above-alt']\"\n\t\t\tdata-dojo-attach-point=\"_menuBtn\" showLabel=\"false\" title=\"\">&#9660;</div>\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_leftBtn\"\n\t\t\tdata-dojo-props=\"iconClass:'dijitTabStripSlideLeftIcon', showLabel:false, title:''\"\n\t\t\tdata-dojo-attach-point=\"_leftBtn\" data-dojo-attach-event=\"onClick: doSlideLeft\">&#9664;</div>\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_rightBtn\"\n\t\t\tdata-dojo-props=\"iconClass:'dijitTabStripSlideRightIcon', showLabel:false, title:''\"\n\t\t\tdata-dojo-attach-point=\"_rightBtn\" data-dojo-attach-event=\"onClick: doSlideRight\">&#9654;</div>\n\t<div class='dijitTabListWrapper' data-dojo-attach-point='tablistWrapper'>\n\t\t<div role='tablist' data-dojo-attach-event='onkeypress:onkeypress'\n\t\t\t\tdata-dojo-attach-point='containerNode' class='nowrapTabStrip'></div>\n\t</div>\n</div>",
'dijit/layout/ScrollingTabController':function(){
require({cache:{
'url:dijit/layout/templates/ScrollingTabController.html':"<div class=\"dijitTabListContainer-${tabPosition}\" style=\"visibility:hidden\">\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerMenuButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_menuBtn\"\n\t\t\tdata-dojo-props=\"containerId: '${containerId}', iconClass: 'dijitTabStripMenuIcon',\n\t\t\t\t\tdropDownPosition: ['below-alt', 'above-alt']\"\n\t\t\tdata-dojo-attach-point=\"_menuBtn\" showLabel=\"false\" title=\"\">&#9660;</div>\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_leftBtn\"\n\t\t\tdata-dojo-props=\"iconClass:'dijitTabStripSlideLeftIcon', showLabel:false, title:''\"\n\t\t\tdata-dojo-attach-point=\"_leftBtn\" data-dojo-attach-event=\"onClick: doSlideLeft\">&#9664;</div>\n\t<div data-dojo-type=\"dijit.layout._ScrollingTabControllerButton\"\n\t\t\tclass=\"tabStripButton-${tabPosition}\"\n\t\t\tid=\"${id}_rightBtn\"\n\t\t\tdata-dojo-props=\"iconClass:'dijitTabStripSlideRightIcon', showLabel:false, title:''\"\n\t\t\tdata-dojo-attach-point=\"_rightBtn\" data-dojo-attach-event=\"onClick: doSlideRight\">&#9654;</div>\n\t<div class='dijitTabListWrapper' data-dojo-attach-point='tablistWrapper'>\n\t\t<div role='tablist' data-dojo-attach-event='onkeypress:onkeypress'\n\t\t\t\tdata-dojo-attach-point='containerNode' class='nowrapTabStrip'></div>\n\t</div>\n</div>",
'url:dijit/layout/templates/_ScrollingTabControllerButton.html':"<div data-dojo-attach-event=\"onclick:_onClick\">\n\t<div role=\"presentation\" class=\"dijitTabInnerDiv\" data-dojo-attach-point=\"innerDiv,focusNode\">\n\t\t<div role=\"presentation\" class=\"dijitTabContent dijitButtonContents\" data-dojo-attach-point=\"tabContent\">\n\t\t\t<img role=\"presentation\" alt=\"\" src=\"${_blankGif}\" class=\"dijitTabStripIcon\" data-dojo-attach-point=\"iconNode\"/>\n\t\t\t<span data-dojo-attach-point=\"containerNode,titleNode\" class=\"dijitButtonText\"></span>\n\t\t</div>\n\t</div>\n</div>"}});
define("dijit/layout/ScrollingTabController", [
	"dojo/_base/array", // array.forEach
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.contains
	"dojo/dom-geometry", // domGeometry.contentBox
	"dojo/dom-style", // domStyle.style
	"dojo/_base/fx", // Animation
	"dojo/_base/lang", // lang.hitch
	"dojo/query", // query
	"dojo/_base/sniff", // has("ie"), has("webkit"), has("quirks")
	"../registry",	// registry.byId()
	"dojo/text!./templates/ScrollingTabController.html",
	"dojo/text!./templates/_ScrollingTabControllerButton.html",
	"./TabController",
	"./utils",	// marginBox2contextBox, layoutChildren
	"../_WidgetsInTemplateMixin",
	"../Menu",
	"../MenuItem",
	"../form/Button",
	"../_HasDropDown",
	"dojo/NodeList-dom" // NodeList.style
], function(array, declare, domClass, domGeometry, domStyle, fx, lang, query, has,
	registry, tabControllerTemplate, buttonTemplate, TabController, layoutUtils, _WidgetsInTemplateMixin,
	Menu, MenuItem, Button, _HasDropDown){

/*=====
var _WidgetsInTemplateMixin = dijit._WidgetsInTemplateMixin;
var Menu = dijit.Menu;
var _HasDropDown = dijit._HasDropDown;
var TabController = dijit.layout.TabController;
=====*/


// module:
//		dijit/layout/ScrollingTabController
// summary:
//		Set of tabs with left/right arrow keys and a menu to switch between tabs not
//		all fitting on a single row.


var ScrollingTabController = declare("dijit.layout.ScrollingTabController", [TabController, _WidgetsInTemplateMixin], {
	// summary:
	//		Set of tabs with left/right arrow keys and a menu to switch between tabs not
	//		all fitting on a single row.
	//		Works only for horizontal tabs (either above or below the content, not to the left
	//		or right).
	// tags:
	//		private

	baseClass: "dijitTabController dijitScrollingTabController",

	templateString: tabControllerTemplate,

	// useMenu: [const] Boolean
	//		True if a menu should be used to select tabs when they are too
	//		wide to fit the TabContainer, false otherwise.
	useMenu: true,

	// useSlider: [const] Boolean
	//		True if a slider should be used to select tabs when they are too
	//		wide to fit the TabContainer, false otherwise.
	useSlider: true,

	// tabStripClass: [const] String
	//		The css class to apply to the tab strip, if it is visible.
	tabStripClass: "",

	widgetsInTemplate: true,

	// _minScroll: Number
	//		The distance in pixels from the edge of the tab strip which,
	//		if a scroll animation is less than, forces the scroll to
	//		go all the way to the left/right.
	_minScroll: 5,

	// Override default behavior mapping class to DOMNode
	_setClassAttr: { node: "containerNode", type: "class" },

	buildRendering: function(){
		this.inherited(arguments);
		var n = this.domNode;

		this.scrollNode = this.tablistWrapper;
		this._initButtons();

		if(!this.tabStripClass){
			this.tabStripClass = "dijitTabContainer" +
				this.tabPosition.charAt(0).toUpperCase() +
				this.tabPosition.substr(1).replace(/-.*/, "") +
				"None";
			domClass.add(n, "tabStrip-disabled")
		}

		domClass.add(this.tablistWrapper, this.tabStripClass);
	},

	onStartup: function(){
		this.inherited(arguments);

		// TabController is hidden until it finishes drawing, to give
		// a less visually jumpy instantiation.   When it's finished, set visibility to ""
		// to that the tabs are hidden/shown depending on the container's visibility setting.
		domStyle.set(this.domNode, "visibility", "");
		this._postStartup = true;
	},

	onAddChild: function(page, insertIndex){
		this.inherited(arguments);

		// changes to the tab button label or iconClass will have changed the width of the
		// buttons, so do a resize
		array.forEach(["label", "iconClass"], function(attr){
			this.pane2watches[page.id].push(
				this.pane2button[page.id].watch(attr, lang.hitch(this, function(){
					if(this._postStartup && this._dim){
						this.resize(this._dim);
					}
				}))
			);
		}, this);

		// Increment the width of the wrapper when a tab is added
		// This makes sure that the buttons never wrap.
		// The value 200 is chosen as it should be bigger than most
		// Tab button widths.
		domStyle.set(this.containerNode, "width",
			(domStyle.get(this.containerNode, "width") + 200) + "px");
	},

	onRemoveChild: function(page, insertIndex){
		// null out _selectedTab because we are about to delete that dom node
		var button = this.pane2button[page.id];
		if(this._selectedTab === button.domNode){
			this._selectedTab = null;
		}

		this.inherited(arguments);
	},

	_initButtons: function(){
		// summary:
		//		Creates the buttons used to scroll to view tabs that
		//		may not be visible if the TabContainer is too narrow.

		// Make a list of the buttons to display when the tab labels become
		// wider than the TabContainer, and hide the other buttons.
		// Also gets the total width of the displayed buttons.
		this._btnWidth = 0;
		this._buttons = query("> .tabStripButton", this.domNode).filter(function(btn){
			if((this.useMenu && btn == this._menuBtn.domNode) ||
				(this.useSlider && (btn == this._rightBtn.domNode || btn == this._leftBtn.domNode))){
				this._btnWidth += domGeometry.getMarginSize(btn).w;
				return true;
			}else{
				domStyle.set(btn, "display", "none");
				return false;
			}
		}, this);
	},

	_getTabsWidth: function(){
		var children = this.getChildren();
		if(children.length){
			var leftTab = children[this.isLeftToRight() ? 0 : children.length - 1].domNode,
				rightTab = children[this.isLeftToRight() ? children.length - 1 : 0].domNode;
			return rightTab.offsetLeft + domStyle.get(rightTab, "width") - leftTab.offsetLeft;
		}else{
			return 0;
		}
	},

	_enableBtn: function(width){
		// summary:
		//		Determines if the tabs are wider than the width of the TabContainer, and
		//		thus that we need to display left/right/menu navigation buttons.
		var tabsWidth = this._getTabsWidth();
		width = width || domStyle.get(this.scrollNode, "width");
		return tabsWidth > 0 && width < tabsWidth;
	},

	resize: function(dim){
		// summary:
		//		Hides or displays the buttons used to scroll the tab list and launch the menu
		//		that selects tabs.

		// Save the dimensions to be used when a child is renamed.
		this._dim = dim;

		// Set my height to be my natural height (tall enough for one row of tab labels),
		// and my content-box width based on margin-box width specified in dim parameter.
		// But first reset scrollNode.height in case it was set by layoutChildren() call
		// in a previous run of this method.
		this.scrollNode.style.height = "auto";
		var cb = this._contentBox = layoutUtils.marginBox2contentBox(this.domNode, {h: 0, w: dim.w});
		cb.h = this.scrollNode.offsetHeight;
		domGeometry.setContentSize(this.domNode, cb);

		// Show/hide the left/right/menu navigation buttons depending on whether or not they
		// are needed.
		var enable = this._enableBtn(this._contentBox.w);
		this._buttons.style("display", enable ? "" : "none");

		// Position and size the navigation buttons and the tablist
		this._leftBtn.layoutAlign = "left";
		this._rightBtn.layoutAlign = "right";
		this._menuBtn.layoutAlign = this.isLeftToRight() ? "right" : "left";
		layoutUtils.layoutChildren(this.domNode, this._contentBox,
			[this._menuBtn, this._leftBtn, this._rightBtn, {domNode: this.scrollNode, layoutAlign: "client"}]);

		// set proper scroll so that selected tab is visible
		if(this._selectedTab){
			if(this._anim && this._anim.status() == "playing"){
				this._anim.stop();
			}
			this.scrollNode.scrollLeft = this._convertToScrollLeft(this._getScrollForSelectedTab());
		}

		// Enable/disabled left right buttons depending on whether or not user can scroll to left or right
		this._setButtonClass(this._getScroll());

		this._postResize = true;

		// Return my size so layoutChildren() can use it.
		// Also avoids IE9 layout glitch on browser resize when scroll buttons present
		return {h: this._contentBox.h, w: dim.w};
	},

	_getScroll: function(){
		// summary:
		//		Returns the current scroll of the tabs where 0 means
		//		"scrolled all the way to the left" and some positive number, based on #
		//		of pixels of possible scroll (ex: 1000) means "scrolled all the way to the right"
		return (this.isLeftToRight() || has("ie") < 8 || (has("ie") && has("quirks")) || has("webkit")) ? this.scrollNode.scrollLeft :
				domStyle.get(this.containerNode, "width") - domStyle.get(this.scrollNode, "width")
					 + (has("ie") == 8 ? -1 : 1) * this.scrollNode.scrollLeft;
	},

	_convertToScrollLeft: function(val){
		// summary:
		//		Given a scroll value where 0 means "scrolled all the way to the left"
		//		and some positive number, based on # of pixels of possible scroll (ex: 1000)
		//		means "scrolled all the way to the right", return value to set this.scrollNode.scrollLeft
		//		to achieve that scroll.
		//
		//		This method is to adjust for RTL funniness in various browsers and versions.
		if(this.isLeftToRight() || has("ie") < 8 || (has("ie") && has("quirks")) || has("webkit")){
			return val;
		}else{
			var maxScroll = domStyle.get(this.containerNode, "width") - domStyle.get(this.scrollNode, "width");
			return (has("ie") == 8 ? -1 : 1) * (val - maxScroll);
		}
	},

	onSelectChild: function(/*dijit._Widget*/ page){
		// summary:
		//		Smoothly scrolls to a tab when it is selected.

		var tab = this.pane2button[page.id];
		if(!tab || !page){return;}

		var node = tab.domNode;

		// Save the selection
		if(node != this._selectedTab){
			this._selectedTab = node;

			// Scroll to the selected tab, except on startup, when scrolling is handled in resize()
			if(this._postResize){
				var sl = this._getScroll();

				if(sl > node.offsetLeft ||
						sl + domStyle.get(this.scrollNode, "width") <
						node.offsetLeft + domStyle.get(node, "width")){
					this.createSmoothScroll().play();
				}
			}
		}

		this.inherited(arguments);
	},

	_getScrollBounds: function(){
		// summary:
		//		Returns the minimum and maximum scroll setting to show the leftmost and rightmost
		//		tabs (respectively)
		var children = this.getChildren(),
			scrollNodeWidth = domStyle.get(this.scrollNode, "width"),		// about 500px
			containerWidth = domStyle.get(this.containerNode, "width"),	// 50,000px
			maxPossibleScroll = containerWidth - scrollNodeWidth,	// scrolling until right edge of containerNode visible
			tabsWidth = this._getTabsWidth();

		if(children.length && tabsWidth > scrollNodeWidth){
			// Scrolling should happen
			return {
				min: this.isLeftToRight() ? 0 : children[children.length-1].domNode.offsetLeft,
				max: this.isLeftToRight() ?
					(children[children.length-1].domNode.offsetLeft + domStyle.get(children[children.length-1].domNode, "width")) - scrollNodeWidth :
					maxPossibleScroll
			};
		}else{
			// No scrolling needed, all tabs visible, we stay either scrolled to far left or far right (depending on dir)
			var onlyScrollPosition = this.isLeftToRight() ? 0 : maxPossibleScroll;
			return {
				min: onlyScrollPosition,
				max: onlyScrollPosition
			};
		}
	},

	_getScrollForSelectedTab: function(){
		// summary:
		//		Returns the scroll value setting so that the selected tab
		//		will appear in the center
		var w = this.scrollNode,
			n = this._selectedTab,
			scrollNodeWidth = domStyle.get(this.scrollNode, "width"),
			scrollBounds = this._getScrollBounds();

		// TODO: scroll minimal amount (to either right or left) so that
		// selected tab is fully visible, and just return if it's already visible?
		var pos = (n.offsetLeft + domStyle.get(n, "width")/2) - scrollNodeWidth/2;
		pos = Math.min(Math.max(pos, scrollBounds.min), scrollBounds.max);

		// TODO:
		// If scrolling close to the left side or right side, scroll
		// all the way to the left or right.  See this._minScroll.
		// (But need to make sure that doesn't scroll the tab out of view...)
		return pos;
	},

	createSmoothScroll: function(x){
		// summary:
		//		Creates a dojo._Animation object that smoothly scrolls the tab list
		//		either to a fixed horizontal pixel value, or to the selected tab.
		// description:
		//		If an number argument is passed to the function, that horizontal
		//		pixel position is scrolled to.  Otherwise the currently selected
		//		tab is scrolled to.
		// x: Integer?
		//		An optional pixel value to scroll to, indicating distance from left.

		// Calculate position to scroll to
		if(arguments.length > 0){
			// position specified by caller, just make sure it's within bounds
			var scrollBounds = this._getScrollBounds();
			x = Math.min(Math.max(x, scrollBounds.min), scrollBounds.max);
		}else{
			// scroll to center the current tab
			x = this._getScrollForSelectedTab();
		}

		if(this._anim && this._anim.status() == "playing"){
			this._anim.stop();
		}

		var self = this,
			w = this.scrollNode,
			anim = new fx.Animation({
				beforeBegin: function(){
					if(this.curve){ delete this.curve; }
					var oldS = w.scrollLeft,
						newS = self._convertToScrollLeft(x);
					anim.curve = new fx._Line(oldS, newS);
				},
				onAnimate: function(val){
					w.scrollLeft = val;
				}
			});
		this._anim = anim;

		// Disable/enable left/right buttons according to new scroll position
		this._setButtonClass(x);

		return anim; // dojo._Animation
	},

	_getBtnNode: function(/*Event*/ e){
		// summary:
		//		Gets a button DOM node from a mouse click event.
		// e:
		//		The mouse click event.
		var n = e.target;
		while(n && !domClass.contains(n, "tabStripButton")){
			n = n.parentNode;
		}
		return n;
	},

	doSlideRight: function(/*Event*/ e){
		// summary:
		//		Scrolls the menu to the right.
		// e:
		//		The mouse click event.
		this.doSlide(1, this._getBtnNode(e));
	},

	doSlideLeft: function(/*Event*/ e){
		// summary:
		//		Scrolls the menu to the left.
		// e:
		//		The mouse click event.
		this.doSlide(-1,this._getBtnNode(e));
	},

	doSlide: function(/*Number*/ direction, /*DomNode*/ node){
		// summary:
		//		Scrolls the tab list to the left or right by 75% of the widget width.
		// direction:
		//		If the direction is 1, the widget scrolls to the right, if it is
		//		-1, it scrolls to the left.

		if(node && domClass.contains(node, "dijitTabDisabled")){return;}

		var sWidth = domStyle.get(this.scrollNode, "width");
		var d = (sWidth * 0.75) * direction;

		var to = this._getScroll() + d;

		this._setButtonClass(to);

		this.createSmoothScroll(to).play();
	},

	_setButtonClass: function(/*Number*/ scroll){
		// summary:
		//		Disables the left scroll button if the tabs are scrolled all the way to the left,
		//		or the right scroll button in the opposite case.
		// scroll: Integer
		//		amount of horizontal scroll

		var scrollBounds = this._getScrollBounds();
		this._leftBtn.set("disabled", scroll <= scrollBounds.min);
		this._rightBtn.set("disabled", scroll >= scrollBounds.max);
	}
});


var ScrollingTabControllerButtonMixin = declare("dijit.layout._ScrollingTabControllerButtonMixin", null, {
	baseClass: "dijitTab tabStripButton",

	templateString: buttonTemplate,

		// Override inherited tabIndex: 0 from dijit.form.Button, because user shouldn't be
		// able to tab to the left/right/menu buttons
	tabIndex: "",

	// Similarly, override FormWidget.isFocusable() because clicking a button shouldn't focus it
	// either (this override avoids focus() call in FormWidget.js)
	isFocusable: function(){ return false; }
});
/*=====
ScrollingTabControllerButtonMixin = dijit.layout._ScrollingTabControllerButtonMixin;
=====*/

// Class used in template
declare("dijit.layout._ScrollingTabControllerButton",
	[Button, ScrollingTabControllerButtonMixin]);

// Class used in template
declare(
	"dijit.layout._ScrollingTabControllerMenuButton",
	[Button, _HasDropDown, ScrollingTabControllerButtonMixin],
{
	// id of the TabContainer itself
	containerId: "",

	// -1 so user can't tab into the button, but so that button can still be focused programatically.
	// Because need to move focus to the button (or somewhere) before the menu is hidden or IE6 will crash.
	tabIndex: "-1",

	isLoaded: function(){
		// recreate menu every time, in case the TabContainer's list of children (or their icons/labels) have changed
		return false;
	},

	loadDropDown: function(callback){
		this.dropDown = new Menu({
			id: this.containerId + "_menu",
			dir: this.dir,
			lang: this.lang,
			textDir: this.textDir
		});
		var container = registry.byId(this.containerId);
		array.forEach(container.getChildren(), function(page){
			var menuItem = new MenuItem({
				id: page.id + "_stcMi",
				label: page.title,
				iconClass: page.iconClass,
				dir: page.dir,
				lang: page.lang,
				textDir: page.textDir,
				onClick: function(){
					container.selectChild(page);
				}
			});
			this.dropDown.addChild(menuItem);
		}, this);
		callback();
	},

	closeDropDown: function(/*Boolean*/ focus){
		this.inherited(arguments);
		if(this.dropDown){
			this.dropDown.destroyRecursive();
			delete this.dropDown;
		}
	}
});

return ScrollingTabController;
});

},
'dijit/layout/TabContainer':function(){
define("dijit/layout/TabContainer", [
	"dojo/_base/lang", // lang.getObject
	"dojo/_base/declare", // declare
	"./_TabContainerBase",
	"./TabController",
	"./ScrollingTabController"
], function(lang, declare, _TabContainerBase, TabController, ScrollingTabController){

/*=====
	var _TabContainerBase = dijit.layout._TabContainerBase;
	var TabController = dijit.layout.TabController;
	var ScrollingTabController = dijit.layout.ScrollingTabController;
=====*/

	// module:
	//		dijit/layout/TabContainer
	// summary:
	//		A Container with tabs to select each child (only one of which is displayed at a time).


	return declare("dijit.layout.TabContainer", _TabContainerBase, {
		// summary:
		//		A Container with tabs to select each child (only one of which is displayed at a time).
		// description:
		//		A TabContainer is a container that has multiple panes, but shows only
		//		one pane at a time.  There are a set of tabs corresponding to each pane,
		//		where each tab has the name (aka title) of the pane, and optionally a close button.

		// useMenu: [const] Boolean
		//		True if a menu should be used to select tabs when they are too
		//		wide to fit the TabContainer, false otherwise.
		useMenu: true,

		// useSlider: [const] Boolean
		//		True if a slider should be used to select tabs when they are too
		//		wide to fit the TabContainer, false otherwise.
		useSlider: true,

		// controllerWidget: String
		//		An optional parameter to override the widget used to display the tab labels
		controllerWidget: "",

		_makeController: function(/*DomNode*/ srcNode){
			// summary:
			//		Instantiate tablist controller widget and return reference to it.
			//		Callback from _TabContainerBase.postCreate().
			// tags:
			//		protected extension

			var cls = this.baseClass + "-tabs" + (this.doLayout ? "" : " dijitTabNoLayout"),
				TabController = lang.getObject(this.controllerWidget);

			return new TabController({
				id: this.id + "_tablist",
				dir: this.dir,
				lang: this.lang,
				textDir: this.textDir,
				tabPosition: this.tabPosition,
				doLayout: this.doLayout,
				containerId: this.id,
				"class": cls,
				nested: this.nested,
				useMenu: this.useMenu,
				useSlider: this.useSlider,
				tabStripClass: this.tabStrip ? this.baseClass + (this.tabStrip ? "":"No") + "Strip": null
			}, srcNode);
		},

		postMixInProperties: function(){
			this.inherited(arguments);

			// Scrolling controller only works for horizontal non-nested tabs
			if(!this.controllerWidget){
				this.controllerWidget = (this.tabPosition == "top" || this.tabPosition == "bottom") && !this.nested ?
							"dijit.layout.ScrollingTabController" : "dijit.layout.TabController";
			}
		}
	});
});

},
'dijit/_HasDropDown':function(){
define("dijit/_HasDropDown", [
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred",
	"dojo/_base/event", // event.stop
	"dojo/dom", // dom.isDescendant
	"dojo/dom-attr", // domAttr.set
	"dojo/dom-class", // domClass.add domClass.contains domClass.remove
	"dojo/dom-geometry", // domGeometry.marginBox domGeometry.position
	"dojo/dom-style", // domStyle.set
	"dojo/has",
	"dojo/keys", // keys.DOWN_ARROW keys.ENTER keys.ESCAPE
	"dojo/_base/lang", // lang.hitch lang.isFunction
	"dojo/touch",
	"dojo/_base/window", // win.doc
	"./registry",	// registry.byNode()
	"./focus",
	"./popup",
	"./_FocusMixin",
	"./Viewport"
], function(declare, Deferred, event,dom, domAttr, domClass, domGeometry, domStyle, has, keys, lang, touch,
			win, registry, focus, popup, _FocusMixin, Viewport){

/*=====
	var _FocusMixin = dijit._FocusMixin;
=====*/

	// module:
	//		dijit/_HasDropDown
	// summary:
	//		Mixin for widgets that need drop down ability.

	return declare("dijit._HasDropDown", _FocusMixin, {
		// summary:
		//		Mixin for widgets that need drop down ability.

		// _buttonNode: [protected] DomNode
		//		The button/icon/node to click to display the drop down.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then either focusNode or domNode (if focusNode is also missing) will be used.
		_buttonNode: null,

		// _arrowWrapperNode: [protected] DomNode
		//		Will set CSS class dijitUpArrow, dijitDownArrow, dijitRightArrow etc. on this node depending
		//		on where the drop down is set to be positioned.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then _buttonNode will be used.
		_arrowWrapperNode: null,

		// _popupStateNode: [protected] DomNode
		//		The node to set the popupActive class on.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then focusNode or _buttonNode (if focusNode is missing) will be used.
		_popupStateNode: null,

		// _aroundNode: [protected] DomNode
		//		The node to display the popup around.
		//		Can be set via a data-dojo-attach-point assignment.
		//		If missing, then domNode will be used.
		_aroundNode: null,

		// dropDown: [protected] Widget
		//		The widget to display as a popup.  This widget *must* be
		//		defined before the startup function is called.
		dropDown: null,

		// autoWidth: [protected] Boolean
		//		Set to true to make the drop down at least as wide as this
		//		widget.  Set to false if the drop down should just be its
		//		default width
		autoWidth: true,

		// forceWidth: [protected] Boolean
		//		Set to true to make the drop down exactly as wide as this
		//		widget.  Overrides autoWidth.
		forceWidth: false,

		// maxHeight: [protected] Integer
		//		The max height for our dropdown.
		//		Any dropdown taller than this will have scrollbars.
		//		Set to 0 for no max height, or -1 to limit height to available space in viewport
		maxHeight: 0,

		// dropDownPosition: [const] String[]
		//		This variable controls the position of the drop down.
		//		It's an array of strings with the following values:
		//
		//			* before: places drop down to the left of the target node/widget, or to the right in
		//			  the case of RTL scripts like Hebrew and Arabic
		//			* after: places drop down to the right of the target node/widget, or to the left in
		//			  the case of RTL scripts like Hebrew and Arabic
		//			* above: drop down goes above target node
		//			* below: drop down goes below target node
		//
		//		The list is positions is tried, in order, until a position is found where the drop down fits
		//		within the viewport.
		//
		dropDownPosition: ["below","above"],

		// _stopClickEvents: Boolean
		//		When set to false, the click events will not be stopped, in
		//		case you want to use them in your subwidget
		_stopClickEvents: true,

		_onDropDownMouseDown: function(/*Event*/ e){
			// summary:
			//		Callback when the user mousedown's on the arrow icon
			if(this.disabled || this.readOnly){ return; }

			// Prevent default to stop things like text selection, but don't stop propogation, so that:
			//		1. TimeTextBox etc. can focusthe <input> on mousedown
			//		2. dropDownButtonActive class applied by _CssStateMixin (on button depress)
			//		3. user defined onMouseDown handler fires
			//
			// Also, don't call preventDefault() on MSPointerDown event (on IE10) because that prevents the button
			// from getting focus, and then the focus manager doesn't know what's going on (#17262)
			if(e.type != "MSPointerDown" && e.type != "pointerdown"){
				e.preventDefault();
			}

			this._docHandler = this.connect(win.doc, touch.release, "_onDropDownMouseUp");

			this.toggleDropDown();
		},

		_onDropDownMouseUp: function(/*Event?*/ e){
			// summary:
			//		Callback when the user lifts their mouse after mouse down on the arrow icon.
			//		If the drop down is a simple menu and the mouse is over the menu, we execute it, otherwise, we focus our
			//		drop down widget.  If the event is missing, then we are not
			//		a mouseup event.
			//
			//		This is useful for the common mouse movement pattern
			//		with native browser <select> nodes:
			//			1. mouse down on the select node (probably on the arrow)
			//			2. move mouse to a menu item while holding down the mouse button
			//			3. mouse up.  this selects the menu item as though the user had clicked it.
			if(e && this._docHandler){
				this.disconnect(this._docHandler);
			}
			var dropDown = this.dropDown, overMenu = false;

			if(e && this._opened){
				// This code deals with the corner-case when the drop down covers the original widget,
				// because it's so large.  In that case mouse-up shouldn't select a value from the menu.
				// Find out if our target is somewhere in our dropdown widget,
				// but not over our _buttonNode (the clickable node)
				var c = domGeometry.position(this._buttonNode, true);
				if(!(e.pageX >= c.x && e.pageX <= c.x + c.w) ||
					!(e.pageY >= c.y && e.pageY <= c.y + c.h)){
					var t = e.target;
					while(t && !overMenu){
						if(domClass.contains(t, "dijitPopup")){
							overMenu = true;
						}else{
							t = t.parentNode;
						}
					}
					if(overMenu){
						t = e.target;
						if(dropDown.onItemClick){
							var menuItem;
							while(t && !(menuItem = registry.byNode(t))){
								t = t.parentNode;
							}
							if(menuItem && menuItem.onClick && menuItem.getParent){
								menuItem.getParent().onItemClick(menuItem, e);
							}
						}
						return;
					}
				}
			}
			if(this._opened){
				if(dropDown.focus && dropDown.autoFocus !== false){
					// Focus the dropdown widget - do it on a delay so that we
					// don't steal our own focus.
					window.setTimeout(lang.hitch(dropDown, "focus"), 1);
				}
			}else{
				// The drop down arrow icon probably can't receive focus, but widget itself should get focus.
				// setTimeout() needed to make it work on IE (test DateTextBox)
				setTimeout(lang.hitch(this, "focus"), 0);
			}

			if(has("ios")){
				this._justGotMouseUp = true;
				setTimeout(lang.hitch(this, function(){
					this._justGotMouseUp = false;
				}), 0);
			}
		},

		_onDropDownClick: function(/*Event*/ e){
			if(has("ios") && !this._justGotMouseUp){
				// This branch fires on iPhone for ComboBox, because the button node is an <input> and doesn't
				// generate touchstart/touchend events.   Pretend we just got a mouse down / mouse up.
				// The if(has("ios") is necessary since IE and desktop safari get spurious onclick events
				// when there are nested tables (specifically, clicking on a table that holds a dijit.form.Select,
				// but not on the Select itself, causes an onclick event on the Select)
				this._onDropDownMouseDown(e);
				this._onDropDownMouseUp(e);
			}

			// The drop down was already opened on mousedown/keydown; just need to call stopEvent().
			if(this._stopClickEvents){
				event.stop(e);
			}
		},

		buildRendering: function(){
			this.inherited(arguments);

			this._buttonNode = this._buttonNode || this.focusNode || this.domNode;
			this._popupStateNode = this._popupStateNode || this.focusNode || this._buttonNode;

			// Add a class to the "dijitDownArrowButton" type class to _buttonNode so theme can set direction of arrow
			// based on where drop down will normally appear
			var defaultPos = {
					"after" : this.isLeftToRight() ? "Right" : "Left",
					"before" : this.isLeftToRight() ? "Left" : "Right",
					"above" : "Up",
					"below" : "Down",
					"left" : "Left",
					"right" : "Right"
			}[this.dropDownPosition[0]] || this.dropDownPosition[0] || "Down";
			domClass.add(this._arrowWrapperNode || this._buttonNode, "dijit" + defaultPos + "ArrowButton");
		},

		postCreate: function(){
			// summary:
			//		set up nodes and connect our mouse and keyboard events

			this.inherited(arguments);

			this.connect(this._buttonNode, touch.press, "_onDropDownMouseDown");
			this.connect(this._buttonNode, "onclick", "_onDropDownClick");
			this.connect(this.focusNode, "onkeydown", "_onKey");
			this.connect(this.focusNode, "onkeyup", "_onKeyUp");
		},

		destroy: function(){
			if(this.dropDown){
				// Destroy the drop down, unless it's already been destroyed.  This can happen because
				// the drop down is a direct child of <body> even though it's logically my child.
				if(!this.dropDown._destroyed){
					this.dropDown.destroyRecursive();
				}
				delete this.dropDown;
			}
			this.inherited(arguments);
		},

		_onKey: function(/*Event*/ e){
			// summary:
			//		Callback when the user presses a key while focused on the button node

			if(this.disabled || this.readOnly){ return; }
			var d = this.dropDown, target = e.target;
			if(d && this._opened && d.handleKey){
				if(d.handleKey(e) === false){
					/* false return code means that the drop down handled the key */
					event.stop(e);
					return;
				}
			}
			if(d && this._opened && e.keyCode == keys.ESCAPE){
				this.closeDropDown();
				event.stop(e);
			}else if(!this._opened &&
					(e.keyCode == keys.DOWN_ARROW ||
						( (e.keyCode == keys.ENTER || e.keyCode == dojo.keys.SPACE) &&
						  //ignore enter and space if the event is for a text input
						  ((target.tagName || "").toLowerCase() !== 'input' ||
						     (target.type && target.type.toLowerCase() !== 'text'))))){
				// Toggle the drop down, but wait until keyup so that the drop down doesn't
				// get a stray keyup event, or in the case of key-repeat (because user held
				// down key for too long), stray keydown events
				this._toggleOnKeyUp = true;
				event.stop(e);
			}
		},

		_onKeyUp: function(){
			if(this._toggleOnKeyUp){
				delete this._toggleOnKeyUp;
				this.toggleDropDown();
				var d = this.dropDown;	// drop down may not exist until toggleDropDown() call
				if(d && d.focus){
					setTimeout(lang.hitch(d, "focus"), 1);
				}
			}
		},

		_onBlur: function(){
			// summary:
			//		Called magically when focus has shifted away from this widget and it's dropdown

			// Don't focus on button if the user has explicitly focused on something else (happens
			// when user clicks another control causing the current popup to close)..
			// But if focus is inside of the drop down then reset focus to me, because IE doesn't like
			// it when you display:none a node with focus.
			var focusMe = focus.curNode && this.dropDown && dom.isDescendant(focus.curNode, this.dropDown.domNode);

			this.closeDropDown(focusMe);

			this.inherited(arguments);
		},

		isLoaded: function(){
			// summary:
			//		Returns true if the dropdown exists and it's data is loaded.  This can
			//		be overridden in order to force a call to loadDropDown().
			// tags:
			//		protected

			return true;
		},

		loadDropDown: function(/*Function*/ loadCallback){
			// summary:
			//		Creates the drop down if it doesn't exist, loads the data
			//		if there's an href and it hasn't been loaded yet, and then calls
			//		the given callback.
			// tags:
			//		protected

			// TODO: for 2.0, change API to return a Deferred, instead of calling loadCallback?
			loadCallback();
		},

		loadAndOpenDropDown: function(){
			// summary:
			//		Creates the drop down if it doesn't exist, loads the data
			//		if there's an href and it hasn't been loaded yet, and
			//		then opens the drop down.  This is basically a callback when the
			//		user presses the down arrow button to open the drop down.
			// returns: Deferred
			//		Deferred for the drop down widget that
			//		fires when drop down is created and loaded
			// tags:
			//		protected
			var d = new Deferred(),
				afterLoad = lang.hitch(this, function(){
					this.openDropDown();
					d.resolve(this.dropDown);
				});
			if(!this.isLoaded()){
				this.loadDropDown(afterLoad);
			}else{
				afterLoad();
			}
			return d;
		},

		toggleDropDown: function(){
			// summary:
			//		Callback when the user presses the down arrow button or presses
			//		the down arrow key to open/close the drop down.
			//		Toggle the drop-down widget; if it is up, close it, if not, open it
			// tags:
			//		protected

			if(this.disabled || this.readOnly){ return; }
			if(!this._opened){
				this.loadAndOpenDropDown();
			}else{
				this.closeDropDown();
			}
		},

		openDropDown: function(){
			// summary:
			//		Opens the dropdown for this widget.   To be called only when this.dropDown
			//		has been created and is ready to display (ie, it's data is loaded).
			// returns:
			//		return value of dijit.popup.open()
			// tags:
			//		protected

			var dropDown = this.dropDown,
				ddNode = dropDown.domNode,
				aroundNode = this._aroundNode || this.domNode,
				self = this;

			// Prepare our popup's height and honor maxHeight if it exists.

			// TODO: isn't maxHeight dependent on the return value from dijit.popup.open(),
			// ie, dependent on how much space is available (BK)

			if(!this._preparedNode){
				this._preparedNode = true;
				// Check if we have explicitly set width and height on the dropdown widget dom node
				if(ddNode.style.width){
					this._explicitDDWidth = true;
				}
				if(ddNode.style.height){
					this._explicitDDHeight = true;
				}
			}

			// Code for resizing dropdown (height limitation, or increasing width to match my width)
			if(this.maxHeight || this.forceWidth || this.autoWidth){
				var myStyle = {
					display: "",
					visibility: "hidden"
				};
				if(!this._explicitDDWidth){
					myStyle.width = "";
				}
				if(!this._explicitDDHeight){
					myStyle.height = "";
				}
				domStyle.set(ddNode, myStyle);

				// Figure out maximum height allowed (if there is a height restriction)
				var maxHeight = this.maxHeight;
				if(maxHeight == -1){
					// limit height to space available in viewport either above or below my domNode
					// (whichever side has more room)
					var viewport = Viewport.getEffectiveBox(this.ownerDocument),
						position = domGeometry.position(aroundNode, false);
					maxHeight = Math.floor(Math.max(position.y, viewport.h - (position.y + position.h)));
				}

				// Attach dropDown to DOM and make make visibility:hidden rather than display:none
				// so we call startup() and also get the size
				popup.moveOffScreen(dropDown);

				if(dropDown.startup && !dropDown._started){
					dropDown.startup(); // this has to be done after being added to the DOM
				}
				// Get size of drop down, and determine if vertical scroll bar needed
				var mb = domGeometry.getMarginSize(ddNode);
				var overHeight = (maxHeight && mb.h > maxHeight);
				domStyle.set(ddNode, {
					overflow: overHeight ? "auto" : "visible"
				});
				if(overHeight){
					mb.h = maxHeight;
					if("w" in mb){
						mb.w += 16;	// room for vertical scrollbar
					}
				}else{
					delete mb.h;
				}

				// Adjust dropdown width to match or be larger than my width
				if(this.forceWidth){
					mb.w = aroundNode.offsetWidth;
				}else if(this.autoWidth){
					mb.w = Math.max(mb.w, aroundNode.offsetWidth);
				}else{
					delete mb.w;
				}

				// And finally, resize the dropdown to calculated height and width
				if(lang.isFunction(dropDown.resize)){
					dropDown.resize(mb);
				}else{
					domGeometry.setMarginBox(ddNode, mb);
				}
			}

			var retVal = popup.open({
				parent: this,
				popup: dropDown,
				around: aroundNode,
				orient: this.dropDownPosition,
				onExecute: function(){
					self.closeDropDown(true);
				},
				onCancel: function(){
					self.closeDropDown(true);
				},
				onClose: function(){
					domAttr.set(self._popupStateNode, "popupActive", false);
					domClass.remove(self._popupStateNode, "dijitHasDropDownOpen");
					self._opened = false;
				}
			});
			domAttr.set(this._popupStateNode, "popupActive", "true");
			domClass.add(self._popupStateNode, "dijitHasDropDownOpen");
			this._opened=true;

			// TODO: set this.checked and call setStateClass(), to affect button look while drop down is shown
			return retVal;
		},

		closeDropDown: function(/*Boolean*/ focus){
			// summary:
			//		Closes the drop down on this widget
			// focus:
			//		If true, refocuses the button widget
			// tags:
			//		protected

			if(this._opened){
				if(focus){ this.focus(); }
				popup.close(this.dropDown);
				this._opened = false;
			}
		}

	});
});

},
'dijit/layout/_TabContainerBase':function(){
require({cache:{
'url:dijit/layout/templates/TabContainer.html':"<div class=\"dijitTabContainer\">\n\t<div class=\"dijitTabListWrapper\" data-dojo-attach-point=\"tablistNode\"></div>\n\t<div data-dojo-attach-point=\"tablistSpacer\" class=\"dijitTabSpacer ${baseClass}-spacer\"></div>\n\t<div class=\"dijitTabPaneWrapper ${baseClass}-container\" data-dojo-attach-point=\"containerNode\"></div>\n</div>\n"}});
define("dijit/layout/_TabContainerBase", [
	"dojo/text!./templates/TabContainer.html",
	"./StackContainer",
	"./utils",	// marginBox2contextBox, layoutChildren
	"../_TemplatedMixin",
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add
	"dojo/dom-geometry", // domGeometry.contentBox
	"dojo/dom-style" // domStyle.style
], function(template, StackContainer, layoutUtils, _TemplatedMixin, declare, domClass, domGeometry, domStyle){


/*=====
	var StackContainer = dijit.layout.StackContainer;
	var _TemplatedMixin = dijit._TemplatedMixin;
=====*/

// module:
//		dijit/layout/_TabContainerBase
// summary:
//		Abstract base class for TabContainer.   Must define _makeController() to instantiate
//		and return the widget that displays the tab labels


return declare("dijit.layout._TabContainerBase", [StackContainer, _TemplatedMixin], {
	// summary:
	//		Abstract base class for TabContainer.   Must define _makeController() to instantiate
	//		and return the widget that displays the tab labels
	// description:
	//		A TabContainer is a container that has multiple panes, but shows only
	//		one pane at a time.  There are a set of tabs corresponding to each pane,
	//		where each tab has the name (aka title) of the pane, and optionally a close button.

	// tabPosition: String
	//		Defines where tabs go relative to tab content.
	//		"top", "bottom", "left-h", "right-h"
	tabPosition: "top",

	baseClass: "dijitTabContainer",

	// tabStrip: [const] Boolean
	//		Defines whether the tablist gets an extra class for layouting, putting a border/shading
	//		around the set of tabs.   Not supported by claro theme.
	tabStrip: false,

	// nested: [const] Boolean
	//		If true, use styling for a TabContainer nested inside another TabContainer.
	//		For tundra etc., makes tabs look like links, and hides the outer
	//		border since the outer TabContainer already has a border.
	nested: false,

	templateString: template,

	postMixInProperties: function(){
		// set class name according to tab position, ex: dijitTabContainerTop
		this.baseClass += this.tabPosition.charAt(0).toUpperCase() + this.tabPosition.substr(1).replace(/-.*/, "");

		this.srcNodeRef && domStyle.set(this.srcNodeRef, "visibility", "hidden");

		this.inherited(arguments);
	},

	buildRendering: function(){
		this.inherited(arguments);

		// Create the tab list that will have a tab (a.k.a. tab button) for each tab panel
		this.tablist = this._makeController(this.tablistNode);

		if(!this.doLayout){ domClass.add(this.domNode, "dijitTabContainerNoLayout"); }

		if(this.nested){
			/* workaround IE's lack of support for "a > b" selectors by
			 * tagging each node in the template.
			 */
			domClass.add(this.domNode, "dijitTabContainerNested");
			domClass.add(this.tablist.containerNode, "dijitTabContainerTabListNested");
			domClass.add(this.tablistSpacer, "dijitTabContainerSpacerNested");
			domClass.add(this.containerNode, "dijitTabPaneWrapperNested");
		}else{
			domClass.add(this.domNode, "tabStrip-" + (this.tabStrip ? "enabled" : "disabled"));
		}
	},

	_setupChild: function(/*dijit._Widget*/ tab){
		// Overrides StackContainer._setupChild().
		domClass.add(tab.domNode, "dijitTabPane");
		this.inherited(arguments);
	},

	startup: function(){
		if(this._started){ return; }

		// wire up the tablist and its tabs
		this.tablist.startup();

		this.inherited(arguments);
	},

	layout: function(){
		// Overrides StackContainer.layout().
		// Configure the content pane to take up all the space except for where the tabs are

		if(!this._contentBox || typeof(this._contentBox.l) == "undefined"){return;}

		var sc = this.selectedChildWidget;

		if(this.doLayout){
			// position and size the titles and the container node
			var titleAlign = this.tabPosition.replace(/-h/, "");
			this.tablist.layoutAlign = titleAlign;
			var children = [this.tablist, {
				domNode: this.tablistSpacer,
				layoutAlign: titleAlign
			}, {
				domNode: this.containerNode,
				layoutAlign: "client"
			}];
			layoutUtils.layoutChildren(this.domNode, this._contentBox, children);

			// Compute size to make each of my children.
			// children[2] is the margin-box size of this.containerNode, set by layoutChildren() call above
			this._containerContentBox = layoutUtils.marginBox2contentBox(this.containerNode, children[2]);

			if(sc && sc.resize){
				sc.resize(this._containerContentBox);
			}
		}else{
			// just layout the tab controller, so it can position left/right buttons etc.
			if(this.tablist.resize){
				//make the tabs zero width so that they don't interfere with width calc, then reset
				var s = this.tablist.domNode.style;
				s.width="0";
				var width = domGeometry.getContentBox(this.domNode).w;
				s.width="";
				this.tablist.resize({w: width});
			}

			// and call resize() on the selected pane just to tell it that it's been made visible
			if(sc && sc.resize){
				sc.resize();
			}
		}
	},

	destroy: function(){
		if(this.tablist){
			this.tablist.destroy();
		}
		this.inherited(arguments);
	}
});

});

},
'*noref':1}});
define("dijit/_dijit_layout_ext", [], 1);
require(["dijit/layout/BorderContainer","dijit/layout/AccordionContainer","dijit/layout/AccordionPane","dijit/layout/TabContainer"]);

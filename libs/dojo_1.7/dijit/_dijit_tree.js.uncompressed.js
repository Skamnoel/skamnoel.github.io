require({cache:{
'dijit/tree/_dndSelector':function(){
define("dijit/tree/_dndSelector", [
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/_base/connect", // connect.isCopyKey
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.hitch
	"dojo/mouse", // mouse.isLeft
	"dojo/on",
	"dojo/touch",
	"dojo/_base/window", // win.global
	"./_dndContainer"
], function(array, connect, declare, lang, mouse, on, touch, win, _dndContainer){

	// module:
	//		dijit/tree/_dndSelector
	// summary:
	//		This is a base class for `dijit.tree.dndSource` , and isn't meant to be used directly.
	//		It's based on `dojo.dnd.Selector`.


	return declare("dijit.tree._dndSelector", _dndContainer, {
		// summary:
		//		This is a base class for `dijit.tree.dndSource` , and isn't meant to be used directly.
		//		It's based on `dojo.dnd.Selector`.
		// tags:
		//		protected

		/*=====
		// selection: Hash<String, DomNode>
		//		(id, DomNode) map for every TreeNode that's currently selected.
		//		The DOMNode is the TreeNode.rowNode.
		selection: {},
		=====*/

		constructor: function(){
			// summary:
			//		Initialization
			// tags:
			//		private

			this.selection={};
			this.anchor = null;

			this.tree.domNode.setAttribute("aria-multiselect", !this.singular);

			this.events.push(
				on(this.tree.domNode, touch.press, lang.hitch(this,"onMouseDown")),
				on(this.tree.domNode, touch.release, lang.hitch(this,"onMouseUp")),
				on(this.tree.domNode, touch.move, lang.hitch(this,"onMouseMove"))
			);
		},

		//	singular: Boolean
		//		Allows selection of only one element, if true.
		//		Tree hasn't been tested in singular=true mode, unclear if it works.
		singular: false,

		// methods
		getSelectedTreeNodes: function(){
			// summary:
			//		Returns a list of selected node(s).
			//		Used by dndSource on the start of a drag.
			// tags:
			//		protected
			var nodes=[], sel = this.selection;
			for(var i in sel){
				nodes.push(sel[i]);
			}
			return nodes;
		},

		selectNone: function(){
			// summary:
			//		Unselects all items
			// tags:
			//		private

			this.setSelection([]);
			return this;	// self
		},

		destroy: function(){
			// summary:
			//		Prepares the object to be garbage-collected
			this.inherited(arguments);
			this.selection = this.anchor = null;
		},
		addTreeNode: function(/*dijit._TreeNode*/node, /*Boolean?*/isAnchor){
			// summary:
			//		add node to current selection
			// node: Node
			//		node to add
			// isAnchor: Boolean
			//		Whether the node should become anchor.

			this.setSelection(this.getSelectedTreeNodes().concat( [node] ));
			if(isAnchor){ this.anchor = node; }
			return node;
		},
		removeTreeNode: function(/*dijit._TreeNode*/node){
			// summary:
			//		remove node from current selection
			// node: Node
			//		node to remove
			this.setSelection(this._setDifference(this.getSelectedTreeNodes(), [node]));
			return node;
		},
		isTreeNodeSelected: function(/*dijit._TreeNode*/node){
			// summary:
			//		return true if node is currently selected
			// node: Node
			//		the node to check whether it's in the current selection

			return node.id && !!this.selection[node.id];
		},
		setSelection: function(/*dijit._treeNode[]*/ newSelection){
			// summary:
			//		set the list of selected nodes to be exactly newSelection. All changes to the
			//		selection should be passed through this function, which ensures that derived
			//		attributes are kept up to date. Anchor will be deleted if it has been removed
			//		from the selection, but no new anchor will be added by this function.
			// newSelection: Node[]
			//		list of tree nodes to make selected
			var oldSelection = this.getSelectedTreeNodes();
			array.forEach(this._setDifference(oldSelection, newSelection), lang.hitch(this, function(node){
				node.setSelected(false);
				if(this.anchor == node){
					delete this.anchor;
				}
				delete this.selection[node.id];
			}));
			array.forEach(this._setDifference(newSelection, oldSelection), lang.hitch(this, function(node){
				node.setSelected(true);
				this.selection[node.id] = node;
			}));
			this._updateSelectionProperties();
		},
		_setDifference: function(xs,ys){
			// summary:
			//		Returns a copy of xs which lacks any objects
			//		occurring in ys. Checks for membership by
			//		modifying and then reading the object, so it will
			//		not properly handle sets of numbers or strings.

			array.forEach(ys, function(y){ y.__exclude__ = true; });
			var ret = array.filter(xs, function(x){ return !x.__exclude__; });

			// clean up after ourselves.
			array.forEach(ys, function(y){ delete y['__exclude__'] });
			return ret;
		},
		_updateSelectionProperties: function(){
			// summary:
			//		Update the following tree properties from the current selection:
			//		path[s], selectedItem[s], selectedNode[s]

			var selected = this.getSelectedTreeNodes();
			var paths = [], nodes = [];
			array.forEach(selected, function(node){
				nodes.push(node);
				paths.push(node.getTreePath());
			});
			var items = array.map(nodes,function(node){ return node.item; });
			this.tree._set("paths", paths);
			this.tree._set("path", paths[0] || []);
			this.tree._set("selectedNodes", nodes);
			this.tree._set("selectedNode", nodes[0] || null);
			this.tree._set("selectedItems", items);
			this.tree._set("selectedItem", items[0] || null);
		},
		// mouse events
		onMouseDown: function(e){
			// summary:
			//		Event processor for onmousedown/ontouchstart
			// e: Event
			//		onmousedown/ontouchstart event
			// tags:
			//		protected

			// ignore click on expando node
			if(!this.current || this.tree.isExpandoNode(e.target, this.current)){ return; }

			if(e.type == "mousedown" && mouse.isLeft(e)){
				// Prevent text selection while dragging on desktop, see #16328.   But don't call preventDefault()
				// for mobile because it will break things completely, see #15838.  Also, don't preventDefault() on
				// MSPointerDown or pointerdown events, because that stops the mousedown event from being generated,
				// see #17709.
				// TODO: remove this completely in 2.0.  It shouldn't be needed since dojo/dnd/Manager already
				// calls preventDefault() for the "selectstart" event.  It can also be achieved via CSS:
				// http://stackoverflow.com/questions/826782/css-rule-to-disable-text-selection-highlighting
				e.preventDefault();
			}else if(e.type != "touchstart"){
				// Ignore right click
				return;
			}

			var treeNode = this.current,
			  copy = connect.isCopyKey(e), id = treeNode.id;

			// if shift key is not pressed, and the node is already in the selection,
			// delay deselection until onmouseup so in the case of DND, deselection
			// will be canceled by onmousemove.
			if(!this.singular && !e.shiftKey && this.selection[id]){
				this._doDeselect = true;
				return;
			}else{
				this._doDeselect = false;
			}
			this.userSelect(treeNode, copy, e.shiftKey);
		},

		onMouseUp: function(e){
			// summary:
			//		Event processor for onmouseup/ontouchend
			// e: Event
			//		onmouseup/ontouchend event
			// tags:
			//		protected

			// _doDeselect is the flag to indicate that the user wants to either ctrl+click on
			// a already selected item (to deselect the item), or click on a not-yet selected item
			// (which should remove all current selection, and add the clicked item). This can not
			// be done in onMouseDown, because the user may start a drag after mousedown. By moving
			// the deselection logic here, the user can drags an already selected item.
			if(!this._doDeselect){ return; }
			this._doDeselect = false;
			this.userSelect(this.current, connect.isCopyKey(e), e.shiftKey);
		},
		onMouseMove: function(/*===== e =====*/){
			// summary:
			//		event processor for onmousemove/ontouchmove
			// e: Event
			//		onmousemove/ontouchmove event
			this._doDeselect = false;
		},

		_compareNodes: function(n1, n2){
			if(n1 === n2){
				return 0;
			}

			if('sourceIndex' in document.documentElement){ //IE
				//TODO: does not yet work if n1 and/or n2 is a text node
				return n1.sourceIndex - n2.sourceIndex;
			}else if('compareDocumentPosition' in document.documentElement){ //FF, Opera
				return n1.compareDocumentPosition(n2) & 2 ? 1: -1;
			}else if(document.createRange){ //Webkit
				var r1 = doc.createRange();
				r1.setStartBefore(n1);

				var r2 = doc.createRange();
				r2.setStartBefore(n2);

				return r1.compareBoundaryPoints(r1.END_TO_END, r2);
			}else{
				throw Error("dijit.tree._compareNodes don't know how to compare two different nodes in this browser");
			}
		},

		userSelect: function(node, multi, range){
			// summary:
			//		Add or remove the given node from selection, responding
			//		to a user action such as a click or keypress.
			// multi: Boolean
			//		Indicates whether this is meant to be a multi-select action (e.g. ctrl-click)
			// range: Boolean
			//		Indicates whether this is meant to be a ranged action (e.g. shift-click)
			// tags:
			//		protected

			if(this.singular){
				if(this.anchor == node && multi){
					this.selectNone();
				}else{
					this.setSelection([node]);
					this.anchor = node;
				}
			}else{
				if(range && this.anchor){
					var cr = this._compareNodes(this.anchor.rowNode, node.rowNode),
					begin, end, anchor = this.anchor;

					if(cr < 0){ //current is after anchor
						begin = anchor;
						end = node;
					}else{ //current is before anchor
						begin = node;
						end = anchor;
					}
					var nodes = [];
					//add everything betweeen begin and end inclusively
					while(begin != end){
						nodes.push(begin);
						begin = this.tree._getNextNode(begin);
					}
					nodes.push(end);

					this.setSelection(nodes);
				}else{
					if( this.selection[ node.id ] && multi ){
						this.removeTreeNode( node );
					}else if(multi){
						this.addTreeNode(node, true);
					}else{
						this.setSelection([node]);
						this.anchor = node;
					}
				}
			}
		},

		getItem: function(/*String*/ key){
			// summary:
			//		Returns the dojo.dnd.Item (representing a dragged node) by it's key (id).
			//		Called by dojo.dnd.Source.checkAcceptance().
			// tags:
			//		protected

			var widget = this.selection[key];
			return {
				data: widget,
				type: ["treeNode"]
			}; // dojo.dnd.Item
		},

		forInSelectedItems: function(/*Function*/ f, /*Object?*/ o){
			// summary:
			//		Iterates over selected items;
			//		see `dojo.dnd.Container.forInItems()` for details
			o = o || win.global;
			for(var id in this.selection){
				// console.log("selected item id: " + id);
				f.call(o, this.getItem(id), id, this);
			}
		}
	});
});

},
'dijit/tree/TreeStoreModel':function(){
define("dijit/tree/TreeStoreModel", [
	"dojo/_base/array", // array.filter array.forEach array.indexOf array.some
	"dojo/aspect", // aspect.after
	"dojo/_base/declare", // declare
	"dojo/_base/json", // json.stringify
	"dojo/_base/lang" // lang.hitch
], function(array, aspect, declare, json, lang){

	// module:
	//		dijit/tree/TreeStoreModel
	// summary:
	//		Implements dijit.Tree.model connecting to a dojo.data store with a single
	//		root item.

	return declare("dijit.tree.TreeStoreModel", null, {
		// summary:
		//		Implements dijit.Tree.model connecting to a dojo.data store with a single
		//		root item.  Any methods passed into the constructor will override
		//		the ones defined here.

		// store: dojo.data.Store
		//		Underlying store
		store: null,

		// childrenAttrs: String[]
		//		One or more attribute names (attributes in the dojo.data item) that specify that item's children
		childrenAttrs: ["children"],

		// newItemIdAttr: String
		//		Name of attribute in the Object passed to newItem() that specifies the id.
		//
		//		If newItemIdAttr is set then it's used when newItem() is called to see if an
		//		item with the same id already exists, and if so just links to the old item
		//		(so that the old item ends up with two parents).
		//
		//		Setting this to null or "" will make every drop create a new item.
		newItemIdAttr: "id",

		// labelAttr: String
		//		If specified, get label for tree node from this attribute, rather
		//		than by calling store.getLabel()
		labelAttr: "",

	 	// root: [readonly] dojo.data.Item
		//		Pointer to the root item (read only, not a parameter)
		root: null,

		// query: anything
		//		Specifies datastore query to return the root item for the tree.
		//		Must only return a single item.   Alternately can just pass in pointer
		//		to root item.
		// example:
		//	|	{id:'ROOT'}
		query: null,

		// deferItemLoadingUntilExpand: Boolean
		//		Setting this to true will cause the TreeStoreModel to defer calling loadItem on nodes
		// 		until they are expanded. This allows for lazying loading where only one
		//		loadItem (and generally one network call, consequently) per expansion
		// 		(rather than one for each child).
		// 		This relies on partial loading of the children items; each children item of a
		// 		fully loaded item should contain the label and info about having children.
		deferItemLoadingUntilExpand: false,

		constructor: function(/* Object */ args){
			// summary:
			//		Passed the arguments listed above (store, etc)
			// tags:
			//		private

			lang.mixin(this, args);

			this.connects = [];

			var store = this.store;
			if(!store.getFeatures()['dojo.data.api.Identity']){
				throw new Error("dijit.Tree: store must support dojo.data.Identity");
			}

			// if the store supports Notification, subscribe to the notification events
			if(store.getFeatures()['dojo.data.api.Notification']){
				this.connects = this.connects.concat([
					aspect.after(store, "onNew", lang.hitch(this, "onNewItem"), true),
					aspect.after(store, "onDelete", lang.hitch(this, "onDeleteItem"), true),
					aspect.after(store, "onSet", lang.hitch(this, "onSetItem"), true)
				]);
			}
		},

		destroy: function(){
			var h;
			while(h = this.connects.pop()){ h.remove(); }
			// TODO: should cancel any in-progress processing of getRoot(), getChildren()
		},

		// =======================================================================
		// Methods for traversing hierarchy

		getRoot: function(onItem, onError){
			// summary:
			//		Calls onItem with the root item for the tree, possibly a fabricated item.
			//		Calls onError on error.
			if(this.root){
				onItem(this.root);
			}else{
				this.store.fetch({
					query: this.query,
					onComplete: lang.hitch(this, function(items){
						if(items.length != 1){
							throw new Error(this.declaredClass + ": query " + json.stringify(this.query) + " returned " + items.length +
							 	" items, but must return exactly one item");
						}
						this.root = items[0];
						onItem(this.root);
					}),
					onError: onError
				});
			}
		},

		mayHaveChildren: function(/*dojo.data.Item*/ item){
			// summary:
			//		Tells if an item has or may have children.  Implementing logic here
			//		avoids showing +/- expando icon for nodes that we know don't have children.
			//		(For efficiency reasons we may not want to check if an element actually
			//		has children until user clicks the expando node)
			return array.some(this.childrenAttrs, function(attr){
				return this.store.hasAttribute(item, attr);
			}, this);
		},

		getChildren: function(/*dojo.data.Item*/ parentItem, /*function(items)*/ onComplete, /*function*/ onError){
			// summary:
			// 		Calls onComplete() with array of child items of given parent item, all loaded.

			var store = this.store;
			if(!store.isItemLoaded(parentItem)){
				// The parent is not loaded yet, we must be in deferItemLoadingUntilExpand
				// mode, so we will load it and just return the children (without loading each
				// child item)
				var getChildren = lang.hitch(this, arguments.callee);
				store.loadItem({
					item: parentItem,
					onItem: function(parentItem){
						getChildren(parentItem, onComplete, onError);
					},
					onError: onError
				});
				return;
			}
			// get children of specified item
			var childItems = [];
			for(var i=0; i<this.childrenAttrs.length; i++){
				var vals = store.getValues(parentItem, this.childrenAttrs[i]);
				childItems = childItems.concat(vals);
			}

			// count how many items need to be loaded
			var _waitCount = 0;
			if(!this.deferItemLoadingUntilExpand){
				array.forEach(childItems, function(item){ if(!store.isItemLoaded(item)){ _waitCount++; } });
			}

			if(_waitCount == 0){
				// all items are already loaded (or we aren't loading them).  proceed...
				onComplete(childItems);
			}else{
				// still waiting for some or all of the items to load
				array.forEach(childItems, function(item, idx){
					if(!store.isItemLoaded(item)){
						store.loadItem({
							item: item,
							onItem: function(item){
								childItems[idx] = item;
								if(--_waitCount == 0){
									// all nodes have been loaded, send them to the tree
									onComplete(childItems);
								}
							},
							onError: onError
						});
					}
				});
			}
		},

		// =======================================================================
		// Inspecting items

		isItem: function(/* anything */ something){
			return this.store.isItem(something);	// Boolean
		},

		fetchItemByIdentity: function(/* object */ keywordArgs){
			this.store.fetchItemByIdentity(keywordArgs);
		},

		getIdentity: function(/* item */ item){
			return this.store.getIdentity(item);	// Object
		},

		getLabel: function(/*dojo.data.Item*/ item){
			// summary:
			//		Get the label for an item
			if(this.labelAttr){
				return this.store.getValue(item,this.labelAttr);	// String
			}else{
				return this.store.getLabel(item);	// String
			}
		},

		// =======================================================================
		// Write interface

		newItem: function(/* dojo.dnd.Item */ args, /*Item*/ parent, /*int?*/ insertIndex){
			// summary:
			//		Creates a new item.   See `dojo.data.api.Write` for details on args.
			//		Used in drag & drop when item from external source dropped onto tree.
			// description:
			//		Developers will need to override this method if new items get added
			//		to parents with multiple children attributes, in order to define which
			//		children attribute points to the new item.

			var pInfo = {parent: parent, attribute: this.childrenAttrs[0]}, LnewItem;

			if(this.newItemIdAttr && args[this.newItemIdAttr]){
				// Maybe there's already a corresponding item in the store; if so, reuse it.
				this.fetchItemByIdentity({identity: args[this.newItemIdAttr], scope: this, onItem: function(item){
					if(item){
						// There's already a matching item in store, use it
						this.pasteItem(item, null, parent, true, insertIndex);
					}else{
						// Create new item in the tree, based on the drag source.
						LnewItem=this.store.newItem(args, pInfo);
						if(LnewItem && (insertIndex!=undefined)){
							// Move new item to desired position
							this.pasteItem(LnewItem, parent, parent, false, insertIndex);
						}
					}
				}});
			}else{
				// [as far as we know] there is no id so we must assume this is a new item
				LnewItem=this.store.newItem(args, pInfo);
				if(LnewItem && (insertIndex!=undefined)){
					// Move new item to desired position
					this.pasteItem(LnewItem, parent, parent, false, insertIndex);
				}
			}
		},

		pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem, /*Boolean*/ bCopy, /*int?*/ insertIndex){
			// summary:
			//		Move or copy an item from one parent item to another.
			//		Used in drag & drop
			var store = this.store,
				parentAttr = this.childrenAttrs[0];	// name of "children" attr in parent item

			// remove child from source item, and record the attribute that child occurred in
			if(oldParentItem){
				array.forEach(this.childrenAttrs, function(attr){
					if(store.containsValue(oldParentItem, attr, childItem)){
						if(!bCopy){
							var values = array.filter(store.getValues(oldParentItem, attr), function(x){
								return x != childItem;
							});
							store.setValues(oldParentItem, attr, values);
						}
						parentAttr = attr;
					}
				});
			}

			// modify target item's children attribute to include this item
			if(newParentItem){
				if(typeof insertIndex == "number"){
					// call slice() to avoid modifying the original array, confusing the data store
					var childItems = store.getValues(newParentItem, parentAttr).slice();
					childItems.splice(insertIndex, 0, childItem);
					store.setValues(newParentItem, parentAttr, childItems);
				}else{
					store.setValues(newParentItem, parentAttr,
						store.getValues(newParentItem, parentAttr).concat(childItem));
				}
			}
		},

		// =======================================================================
		// Callbacks

		onChange: function(/*dojo.data.Item*/ /*===== item =====*/){
			// summary:
			//		Callback whenever an item has changed, so that Tree
			//		can update the label, icon, etc.   Note that changes
			//		to an item's children or parent(s) will trigger an
			//		onChildrenChange() so you can ignore those changes here.
			// tags:
			//		callback
		},

		onChildrenChange: function(/*===== parent, newChildrenList =====*/){
			// summary:
			//		Callback to do notifications about new, updated, or deleted items.
			// parent: dojo.data.Item
			// newChildrenList: dojo.data.Item[]
			// tags:
			//		callback
		},

		onDelete: function(/*dojo.data.Item*/ /*===== item =====*/){
			// summary:
			//		Callback when an item has been deleted.
			// description:
			//		Note that there will also be an onChildrenChange() callback for the parent
			//		of this item.
			// tags:
			//		callback
		},

		// =======================================================================
		// Events from data store

		onNewItem: function(/* dojo.data.Item */ item, /* Object */ parentInfo){
			// summary:
			//		Handler for when new items appear in the store, either from a drop operation
			//		or some other way.   Updates the tree view (if necessary).
			// description:
			//		If the new item is a child of an existing item,
			//		calls onChildrenChange() with the new list of children
			//		for that existing item.
			//
			// tags:
			//		extension

			// We only care about the new item if it has a parent that corresponds to a TreeNode
			// we are currently displaying
			if(!parentInfo){
				return;
			}

			// Call onChildrenChange() on parent (ie, existing) item with new list of children
			// In the common case, the new list of children is simply parentInfo.newValue or
			// [ parentInfo.newValue ], although if items in the store has multiple
			// child attributes (see `childrenAttr`), then it's a superset of parentInfo.newValue,
			// so call getChildren() to be sure to get right answer.
			this.getChildren(parentInfo.item, lang.hitch(this, function(children){
				this.onChildrenChange(parentInfo.item, children);
			}));
		},

		onDeleteItem: function(/*Object*/ item){
			// summary:
			//		Handler for delete notifications from underlying store
			this.onDelete(item);
		},

		onSetItem: function(item, attribute /*===== , oldValue, newValue =====*/){
			// summary:
			//		Updates the tree view according to changes in the data store.
			// description:
			//		Handles updates to an item's children by calling onChildrenChange(), and
			//		other updates to an item by calling onChange().
			//
			//		See `onNewItem` for more details on handling updates to an item's children.
			// item: Item
			// attribute: attribute-name-string
			// oldValue: object | array
			// newValue: object | array
			// tags:
			//		extension

			if(array.indexOf(this.childrenAttrs, attribute) != -1){
				// item's children list changed
				this.getChildren(item, lang.hitch(this, function(children){
					// See comments in onNewItem() about calling getChildren()
					this.onChildrenChange(item, children);
				}));
			}else{
				// item's label/icon/etc. changed.
				this.onChange(item);
			}
		}
	});
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
'dijit/Tree':function(){
require({cache:{
'url:dijit/templates/TreeNode.html':"<div class=\"dijitTreeNode\" role=\"presentation\"\n\t><div data-dojo-attach-point=\"rowNode\" class=\"dijitTreeRow\" role=\"presentation\" data-dojo-attach-event=\"onmouseenter:_onMouseEnter, onmouseleave:_onMouseLeave, onclick:_onClick, ondblclick:_onDblClick\"\n\t\t><img src=\"${_blankGif}\" alt=\"\" data-dojo-attach-point=\"expandoNode\" class=\"dijitTreeExpando\" role=\"presentation\"\n\t\t/><span data-dojo-attach-point=\"expandoNodeText\" class=\"dijitExpandoText\" role=\"presentation\"\n\t\t></span\n\t\t><span data-dojo-attach-point=\"contentNode\"\n\t\t\tclass=\"dijitTreeContent\" role=\"presentation\">\n\t\t\t<img src=\"${_blankGif}\" alt=\"\" data-dojo-attach-point=\"iconNode\" class=\"dijitIcon dijitTreeIcon\" role=\"presentation\"\n\t\t\t/><span data-dojo-attach-point=\"labelNode\" class=\"dijitTreeLabel\" role=\"treeitem\" tabindex=\"-1\" aria-selected=\"false\" data-dojo-attach-event=\"onfocus:_onLabelFocus\"></span>\n\t\t</span\n\t></div>\n\t<div data-dojo-attach-point=\"containerNode\" class=\"dijitTreeContainer\" role=\"presentation\" style=\"display: none;\"></div>\n</div>\n",
'url:dijit/templates/Tree.html':"<div class=\"dijitTree dijitTreeContainer\" role=\"tree\">\n\t<div class=\"dijitInline dijitTreeIndent\" style=\"position: absolute; top: -9999px\" data-dojo-attach-point=\"indentDetector\"></div>\n</div>\n"}});
define("dijit/Tree", [
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/_base/connect",	// connect.isCopyKey()
	"dojo/cookie", // cookie
	"dojo/_base/declare", // declare
	"dojo/_base/Deferred", // Deferred
	"dojo/DeferredList", // DeferredList
	"dojo/dom", // dom.isDescendant
	"dojo/dom-class", // domClass.add domClass.remove domClass.replace domClass.toggle
	"dojo/dom-geometry", // domGeometry.setMarginBox domGeometry.position
	"dojo/dom-style",// domStyle.set
	"dojo/_base/event", // event.stop
	"dojo/fx", // fxUtils.wipeIn fxUtils.wipeOut
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/keys",	// arrows etc.
	"dojo/_base/lang", // lang.getObject lang.mixin lang.hitch
	"dojo/on",
	"dojo/topic",
	"./focus",
	"./registry",	// registry.getEnclosingWidget(), manager.defaultDuration
	"./_base/manager",	// manager.getEnclosingWidget(), manager.defaultDuration
	"./_Widget",
	"./_TemplatedMixin",
	"./_Container",
	"./_Contained",
	"./_CssStateMixin",
	"dojo/text!./templates/TreeNode.html",
	"dojo/text!./templates/Tree.html",
	"./tree/TreeStoreModel",
	"./tree/ForestStoreModel",
	"./tree/_dndSelector"
], function(array, connect, cookie, declare, Deferred, DeferredList,
			dom, domClass, domGeometry, domStyle, event, fxUtils, kernel, keys, lang, on, topic,
			focus, registry, manager, _Widget, _TemplatedMixin, _Container, _Contained, _CssStateMixin,
			treeNodeTemplate, treeTemplate, TreeStoreModel, ForestStoreModel, _dndSelector){

/*=====
	var _Widget = dijit._Widget;
	var _TemplatedMixin = dijit._TemplatedMixin;
	var _CssStateMixin = dijit._CssStateMixin;
	var _Container = dijit._Container;
	var _Contained = dijit._Contained;
=====*/

// module:
//		dijit/Tree
// summary:
//		dijit.Tree widget, and internal dijit._TreeNode widget


var TreeNode = declare(
	"dijit._TreeNode",
	[_Widget, _TemplatedMixin, _Container, _Contained, _CssStateMixin],
{
	// summary:
	//		Single node within a tree.   This class is used internally
	//		by Tree and should not be accessed directly.
	// tags:
	//		private

	// item: [const] Item
	//		the dojo.data entry this tree represents
	item: null,

	// isTreeNode: [protected] Boolean
	//		Indicates that this is a TreeNode.   Used by `dijit.Tree` only,
	//		should not be accessed directly.
	isTreeNode: true,

	// label: String
	//		Text of this tree node
	label: "",
	_setLabelAttr: {node: "labelNode", type: "innerText"},

	// isExpandable: [private] Boolean
	//		This node has children, so show the expando node (+ sign)
	isExpandable: null,

	// isExpanded: [readonly] Boolean
	//		This node is currently expanded (ie, opened)
	isExpanded: false,

	// state: [private] String
	//		Dynamic loading-related stuff.
	//		When an empty folder node appears, it is "UNCHECKED" first,
	//		then after dojo.data query it becomes "LOADING" and, finally "LOADED"
	state: "UNCHECKED",

	templateString: treeNodeTemplate,

	baseClass: "dijitTreeNode",

	// For hover effect for tree node, and focus effect for label
	cssStateNodes: {
		rowNode: "dijitTreeRow",
		labelNode: "dijitTreeLabel"
	},

	// Tooltip is defined in _WidgetBase but we need to handle the mapping to DOM here
	_setTooltipAttr: {node: "rowNode", type: "attribute", attribute: "title"},

	buildRendering: function(){
		this.inherited(arguments);

		// set expand icon for leaf
		this._setExpando();

		// set icon and label class based on item
		this._updateItemClasses(this.item);

		if(this.isExpandable){
			this.labelNode.setAttribute("aria-expanded", this.isExpanded);
		}

		//aria-selected should be false on all selectable elements.
		this.setSelected(false);
	},

	_setIndentAttr: function(indent){
		// summary:
		//		Tell this node how many levels it should be indented
		// description:
		//		0 for top level nodes, 1 for their children, 2 for their
		//		grandchildren, etc.

		// Math.max() is to prevent negative padding on hidden root node (when indent == -1)
		var pixels = (Math.max(indent, 0) * this.tree._nodePixelIndent) + "px";

		domStyle.set(this.domNode, "backgroundPosition",	pixels + " 0px");
		domStyle.set(this.rowNode, this.isLeftToRight() ? "paddingLeft" : "paddingRight", pixels);

		array.forEach(this.getChildren(), function(child){
			child.set("indent", indent+1);
		});

		this._set("indent", indent);
	},

	markProcessing: function(){
		// summary:
		//		Visually denote that tree is loading data, etc.
		// tags:
		//		private
		this.state = "LOADING";
		this._setExpando(true);
	},

	unmarkProcessing: function(){
		// summary:
		//		Clear markup from markProcessing() call
		// tags:
		//		private
		this._setExpando(false);
	},

	_updateItemClasses: function(item){
		// summary:
		//		Set appropriate CSS classes for icon and label dom node
		//		(used to allow for item updates to change respective CSS)
		// tags:
		//		private
		var tree = this.tree, model = tree.model;
		if(tree._v10Compat && item === model.root){
			// For back-compat with 1.0, need to use null to specify root item (TODO: remove in 2.0)
			item = null;
		}
		this._applyClassAndStyle(item, "icon", "Icon");
		this._applyClassAndStyle(item, "label", "Label");
		this._applyClassAndStyle(item, "row", "Row");
	},

	_applyClassAndStyle: function(item, lower, upper){
		// summary:
		//		Set the appropriate CSS classes and styles for labels, icons and rows.
		//
		// item:
		//		The data item.
		//
		// lower:
		//		The lower case attribute to use, e.g. 'icon', 'label' or 'row'.
		//
		// upper:
		//		The upper case attribute to use, e.g. 'Icon', 'Label' or 'Row'.
		//
		// tags:
		//		private

		var clsName = "_" + lower + "Class";
		var nodeName = lower + "Node";
		var oldCls = this[clsName];

		this[clsName] = this.tree["get" + upper + "Class"](item, this.isExpanded);
		domClass.replace(this[nodeName], this[clsName] || "", oldCls || "");

		domStyle.set(this[nodeName], this.tree["get" + upper + "Style"](item, this.isExpanded) || {});
 	},

	_updateLayout: function(){
		// summary:
		//		Set appropriate CSS classes for this.domNode
		// tags:
		//		private
		var parent = this.getParent();
		if(!parent || !parent.rowNode || parent.rowNode.style.display == "none"){
			/* if we are hiding the root node then make every first level child look like a root node */
			domClass.add(this.domNode, "dijitTreeIsRoot");
		}else{
			domClass.toggle(this.domNode, "dijitTreeIsLast", !this.getNextSibling());
		}
	},

	_setExpando: function(/*Boolean*/ processing){
		// summary:
		//		Set the right image for the expando node
		// tags:
		//		private

		var styles = ["dijitTreeExpandoLoading", "dijitTreeExpandoOpened",
						"dijitTreeExpandoClosed", "dijitTreeExpandoLeaf"],
			_a11yStates = ["*","-","+","*"],
			idx = processing ? 0 : (this.isExpandable ?	(this.isExpanded ? 1 : 2) : 3);

		// apply the appropriate class to the expando node
		domClass.replace(this.expandoNode, styles[idx], styles);

		// provide a non-image based indicator for images-off mode
		this.expandoNodeText.innerHTML = _a11yStates[idx];

	},

	expand: function(){
		// summary:
		//		Show my children
		// returns:
		//		Deferred that fires when expansion is complete

		// If there's already an expand in progress or we are already expanded, just return
		if(this._expandDeferred){
			return this._expandDeferred;		// dojo.Deferred
		}

		// cancel in progress collapse operation
		this._wipeOut && this._wipeOut.stop();

		// All the state information for when a node is expanded, maybe this should be
		// set when the animation completes instead
		this.isExpanded = true;
		this.labelNode.setAttribute("aria-expanded", "true");
		if(this.tree.showRoot || this !== this.tree.rootNode){
			this.containerNode.setAttribute("role", "group");
		}
		domClass.add(this.contentNode,'dijitTreeContentExpanded');
		this._setExpando();
		this._updateItemClasses(this.item);
		if(this == this.tree.rootNode){
			this.tree.domNode.setAttribute("aria-expanded", "true");
		}

		var def,
			wipeIn = fxUtils.wipeIn({
				node: this.containerNode, duration: manager.defaultDuration,
				onEnd: function(){
					def.callback(true);
				}
			});

		// Deferred that fires when expand is complete
		def = (this._expandDeferred = new Deferred(function(){
			// Canceller
			wipeIn.stop();
		}));

		wipeIn.play();

		return def;		// dojo.Deferred
	},

	collapse: function(){
		// summary:
		//		Collapse this node (if it's expanded)

		if(!this.isExpanded){ return; }

		// cancel in progress expand operation
		if(this._expandDeferred){
			this._expandDeferred.cancel();
			delete this._expandDeferred;
		}

		this.isExpanded = false;
		this.labelNode.setAttribute("aria-expanded", "false");
		if(this == this.tree.rootNode){
			this.tree.domNode.setAttribute("aria-expanded", "false");
		}
		domClass.remove(this.contentNode,'dijitTreeContentExpanded');
		this._setExpando();
		this._updateItemClasses(this.item);

		if(!this._wipeOut){
			this._wipeOut = fxUtils.wipeOut({
				node: this.containerNode, duration: manager.defaultDuration
			});
		}
		this._wipeOut.play();
	},

	// indent: Integer
	//		Levels from this node to the root node
	indent: 0,

	setChildItems: function(/* Object[] */ items){
		// summary:
		//		Sets the child items of this node, removing/adding nodes
		//		from current children to match specified items[] array.
		//		Also, if this.persist == true, expands any children that were previously
		// 		opened.
		// returns:
		//		Deferred object that fires after all previously opened children
		//		have been expanded again (or fires instantly if there are no such children).

		var tree = this.tree,
			model = tree.model,
			defs = [];	// list of deferreds that need to fire before I am complete


		// Orphan all my existing children.
		// If items contains some of the same items as before then we will reattach them.
		// Don't call this.removeChild() because that will collapse the tree etc.
		array.forEach(this.getChildren(), function(child){
			_Container.prototype.removeChild.call(this, child);
		}, this);

		this.state = "LOADED";

		if(items && items.length > 0){
			this.isExpandable = true;

			// Create _TreeNode widget for each specified tree node, unless one already
			// exists and isn't being used (presumably it's from a DnD move and was recently
			// released
			array.forEach(items, function(item){
				var id = model.getIdentity(item),
					existingNodes = tree._itemNodesMap[id],
					node;
				if(existingNodes){
					for(var i=0;i<existingNodes.length;i++){
						if(existingNodes[i] && !existingNodes[i].getParent()){
							node = existingNodes[i];
							node.set('indent', this.indent+1);
							break;
						}
					}
				}
				if(!node){
					node = this.tree._createTreeNode({
							item: item,
							tree: tree,
							isExpandable: model.mayHaveChildren(item),
							label: tree.getLabel(item),
							tooltip: tree.getTooltip(item),
							dir: tree.dir,
							lang: tree.lang,
							textDir: tree.textDir,
							indent: this.indent + 1
						});
					if(existingNodes){
						existingNodes.push(node);
					}else{
						tree._itemNodesMap[id] = [node];
					}
				}
				this.addChild(node);

				// If node was previously opened then open it again now (this may trigger
				// more data store accesses, recursively)
				if(this.tree.autoExpand || this.tree._state(node)){
					defs.push(tree._expandNode(node));
				}
			}, this);

			// note that updateLayout() needs to be called on each child after
			// _all_ the children exist
			array.forEach(this.getChildren(), function(child){
				child._updateLayout();
			});
		}else{
			this.isExpandable=false;
		}

		if(this._setExpando){
			// change expando to/from dot or + icon, as appropriate
			this._setExpando(false);
		}

		// Set leaf icon or folder icon, as appropriate
		this._updateItemClasses(this.item);

		// On initial tree show, make the selected TreeNode as either the root node of the tree,
		// or the first child, if the root node is hidden
		if(this == tree.rootNode){
			var fc = this.tree.showRoot ? this : this.getChildren()[0];
			if(fc){
				fc.setFocusable(true);
				tree.lastFocused = fc;
			}else{
				// fallback: no nodes in tree so focus on Tree <div> itself
				tree.domNode.setAttribute("tabIndex", "0");
			}
		}

		return new DeferredList(defs);	// dojo.Deferred
	},

	getTreePath: function(){
		var node = this;
		var path = [];
		while(node && node !== this.tree.rootNode){
				path.unshift(node.item);
				node = node.getParent();
		}
		path.unshift(this.tree.rootNode.item);

		return path;
	},

	getIdentity: function(){
		return this.tree.model.getIdentity(this.item);
	},

	removeChild: function(/* treeNode */ node){
		this.inherited(arguments);

		var children = this.getChildren();
		if(children.length == 0){
			this.isExpandable = false;
			this.collapse();
		}

		array.forEach(children, function(child){
				child._updateLayout();
		});
	},

	makeExpandable: function(){
		// summary:
		//		if this node wasn't already showing the expando node,
		//		turn it into one and call _setExpando()

		// TODO: hmm this isn't called from anywhere, maybe should remove it for 2.0

		this.isExpandable = true;
		this._setExpando(false);
	},

	_onLabelFocus: function(){
		// summary:
		//		Called when this row is focused (possibly programatically)
		//		Note that we aren't using _onFocus() builtin to dijit
		//		because it's called when focus is moved to a descendant TreeNode.
		// tags:
		//		private
		this.tree._onNodeFocus(this);
	},

	setSelected: function(/*Boolean*/ selected){
		// summary:
		//		A Tree has a (single) currently selected node.
		//		Mark that this node is/isn't that currently selected node.
		// description:
		//		In particular, setting a node as selected involves setting tabIndex
		//		so that when user tabs to the tree, focus will go to that node (only).
		this.labelNode.setAttribute("aria-selected", selected);
		domClass.toggle(this.rowNode, "dijitTreeRowSelected", selected);
	},

	setFocusable: function(/*Boolean*/ selected){
		// summary:
		//		A Tree has a (single) node that's focusable.
		//		Mark that this node is/isn't that currently focsuable node.
		// description:
		//		In particular, setting a node as selected involves setting tabIndex
		//		so that when user tabs to the tree, focus will go to that node (only).

		this.labelNode.setAttribute("tabIndex", selected ? "0" : "-1");
	},

	_onClick: function(evt){
		// summary:
		//		Handler for onclick event on a node
		// tags:
		//		private
		this.tree._onClick(this, evt);
	},
	_onDblClick: function(evt){
		// summary:
		//		Handler for ondblclick event on a node
		// tags:
		//		private
		this.tree._onDblClick(this, evt);
	},

	_onMouseEnter: function(evt){
		// summary:
		//		Handler for onmouseenter event on a node
		// tags:
		//		private
		this.tree._onNodeMouseEnter(this, evt);
	},

	_onMouseLeave: function(evt){
		// summary:
		//		Handler for onmouseenter event on a node
		// tags:
		//		private
		this.tree._onNodeMouseLeave(this, evt);
	},

	_setTextDirAttr: function(textDir){
		if(textDir &&((this.textDir != textDir) || !this._created)){
			this._set("textDir", textDir);
			this.applyTextDir(this.labelNode, this.labelNode.innerText || this.labelNode.textContent || "");
			array.forEach(this.getChildren(), function(childNode){
				childNode.set("textDir", textDir);
			}, this);
		}
	}
});

var Tree = declare("dijit.Tree", [_Widget, _TemplatedMixin], {
	// summary:
	//		This widget displays hierarchical data from a store.

	// store: [deprecated] String||dojo.data.Store
	//		Deprecated.  Use "model" parameter instead.
	//		The store to get data to display in the tree.
	store: null,

	// model: dijit.Tree.model
	//		Interface to read tree data, get notifications of changes to tree data,
	//		and for handling drop operations (i.e drag and drop onto the tree)
	model: null,

	// query: [deprecated] anything
	//		Deprecated.  User should specify query to the model directly instead.
	//		Specifies datastore query to return the root item or top items for the tree.
	query: null,

	// label: [deprecated] String
	//		Deprecated.  Use dijit.tree.ForestStoreModel directly instead.
	//		Used in conjunction with query parameter.
	//		If a query is specified (rather than a root node id), and a label is also specified,
	//		then a fake root node is created and displayed, with this label.
	label: "",

	// showRoot: [const] Boolean
	//		Should the root node be displayed, or hidden?
	showRoot: true,

	// childrenAttr: [deprecated] String[]
	//		Deprecated.   This information should be specified in the model.
	//		One ore more attributes that holds children of a tree node
	childrenAttr: ["children"],

	// paths: String[][] or Item[][]
	//		Full paths from rootNode to selected nodes expressed as array of items or array of ids.
	//		Since setting the paths may be asynchronous (because ofwaiting on dojo.data), set("paths", ...)
	//		returns a Deferred to indicate when the set is complete.
	paths: [],

	// path: String[] or Item[]
	//      Backward compatible singular variant of paths.
	path: [],

	// selectedItems: [readonly] Item[]
	//		The currently selected items in this tree.
	//		This property can only be set (via set('selectedItems', ...)) when that item is already
	//		visible in the tree.   (I.e. the tree has already been expanded to show that node.)
	//		Should generally use `paths` attribute to set the selected items instead.
	selectedItems: null,

	// selectedItem: [readonly] Item
	//      Backward compatible singular variant of selectedItems.
	selectedItem: null,

	// openOnClick: Boolean
	//		If true, clicking a folder node's label will open it, rather than calling onClick()
	openOnClick: false,

	// openOnDblClick: Boolean
	//		If true, double-clicking a folder node's label will open it, rather than calling onDblClick()
	openOnDblClick: false,

	templateString: treeTemplate,

	// persist: Boolean
	//		Enables/disables use of cookies for state saving.
	persist: true,

	// autoExpand: Boolean
	//		Fully expand the tree on load.   Overrides `persist`.
	autoExpand: false,

	// dndController: [protected] Function|String
	//		Class to use as as the dnd controller.  Specifying this class enables DnD.
	//		Generally you should specify this as dijit.tree.dndSource.
	//      Setting of dijit.tree._dndSelector handles selection only (no actual DnD).
	dndController: _dndSelector,

	// parameters to pull off of the tree and pass on to the dndController as its params
	dndParams: ["onDndDrop","itemCreator","onDndCancel","checkAcceptance", "checkItemAcceptance", "dragThreshold", "betweenThreshold"],

	//declare the above items so they can be pulled from the tree's markup

	// onDndDrop: [protected] Function
	//		Parameter to dndController, see `dijit.tree.dndSource.onDndDrop`.
	//		Generally this doesn't need to be set.
	onDndDrop: null,

	/*=====
	itemCreator: function(nodes, target, source){
		// summary:
		//		Returns objects passed to `Tree.model.newItem()` based on DnD nodes
		//		dropped onto the tree.   Developer must override this method to enable
		// 		dropping from external sources onto this Tree, unless the Tree.model's items
		//		happen to look like {id: 123, name: "Apple" } with no other attributes.
		// description:
		//		For each node in nodes[], which came from source, create a hash of name/value
		//		pairs to be passed to Tree.model.newItem().  Returns array of those hashes.
		// nodes: DomNode[]
		//		The DOMNodes dragged from the source container
		// target: DomNode
		//		The target TreeNode.rowNode
		// source: dojo.dnd.Source
		//		The source container the nodes were dragged from, perhaps another Tree or a plain dojo.dnd.Source
		// returns: Object[]
		//		Array of name/value hashes for each new item to be added to the Tree, like:
		// |	[
		// |		{ id: 123, label: "apple", foo: "bar" },
		// |		{ id: 456, label: "pear", zaz: "bam" }
		// |	]
		// tags:
		//		extension
		return [{}];
	},
	=====*/
	itemCreator: null,

	// onDndCancel: [protected] Function
	//		Parameter to dndController, see `dijit.tree.dndSource.onDndCancel`.
	//		Generally this doesn't need to be set.
	onDndCancel: null,

/*=====
	checkAcceptance: function(source, nodes){
		// summary:
		//		Checks if the Tree itself can accept nodes from this source
		// source: dijit.tree._dndSource
		//		The source which provides items
		// nodes: DOMNode[]
		//		Array of DOM nodes corresponding to nodes being dropped, dijitTreeRow nodes if
		//		source is a dijit.Tree.
		// tags:
		//		extension
		return true;	// Boolean
	},
=====*/
	checkAcceptance: null,

/*=====
	checkItemAcceptance: function(target, source, position){
		// summary:
		//		Stub function to be overridden if one wants to check for the ability to drop at the node/item level
		// description:
		//		In the base case, this is called to check if target can become a child of source.
		//		When betweenThreshold is set, position="before" or "after" means that we
		//		are asking if the source node can be dropped before/after the target node.
		// target: DOMNode
		//		The dijitTreeRoot DOM node inside of the TreeNode that we are dropping on to
		//		Use dijit.getEnclosingWidget(target) to get the TreeNode.
		// source: dijit.tree.dndSource
		//		The (set of) nodes we are dropping
		// position: String
		//		"over", "before", or "after"
		// tags:
		//		extension
		return true;	// Boolean
	},
=====*/
	checkItemAcceptance: null,

	// dragThreshold: Integer
	//		Number of pixels mouse moves before it's considered the start of a drag operation
	dragThreshold: 5,

	// betweenThreshold: Integer
	//		Set to a positive value to allow drag and drop "between" nodes.
	//
	//		If during DnD mouse is over a (target) node but less than betweenThreshold
	//		pixels from the bottom edge, dropping the the dragged node will make it
	//		the next sibling of the target node, rather than the child.
	//
	//		Similarly, if mouse is over a target node but less that betweenThreshold
	//		pixels from the top edge, dropping the dragged node will make it
	//		the target node's previous sibling rather than the target node's child.
	betweenThreshold: 0,

	// _nodePixelIndent: Integer
	//		Number of pixels to indent tree nodes (relative to parent node).
	//		Default is 19 but can be overridden by setting CSS class dijitTreeIndent
	//		and calling resize() or startup() on tree after it's in the DOM.
	_nodePixelIndent: 19,

	_publish: function(/*String*/ topicName, /*Object*/ message){
		// summary:
		//		Publish a message for this widget/topic
		topic.publish(this.id, lang.mixin({tree: this, event: topicName}, message || {}));	// publish
	},

	postMixInProperties: function(){
		this.tree = this;

		if(this.autoExpand){
			// There's little point in saving opened/closed state of nodes for a Tree
			// that initially opens all it's nodes.
			this.persist = false;
		}

		this._itemNodesMap={};

		if(!this.cookieName && this.id){
			this.cookieName = this.id + "SaveStateCookie";
		}

		this._loadDeferred = new Deferred();

		this.inherited(arguments);
	},

	postCreate: function(){
		this._initState();

		// Catch events on TreeNodes
		var self = this;
		this._connects.push(
			on(this.domNode, on.selector(".dijitTreeNode", "keypress"), function(evt){
				self._onKeyPress(registry.byNode(this), evt);
			}),
			on(this.domNode, on.selector(".dijitTreeNode", "keydown"), function(evt){
				self._onKeyDown(registry.byNode(this), evt);
			})
		);

		// Create glue between store and Tree, if not specified directly by user
		if(!this.model){
			this._store2model();
		}

		// monitor changes to items
		this.connect(this.model, "onChange", "_onItemChange");
		this.connect(this.model, "onChildrenChange", "_onItemChildrenChange");
		this.connect(this.model, "onDelete", "_onItemDelete");

		this._load();

		this.inherited(arguments);

		if(this.dndController){
			if(lang.isString(this.dndController)){
				this.dndController = lang.getObject(this.dndController);
			}
			var params={};
			for(var i=0; i<this.dndParams.length;i++){
				if(this[this.dndParams[i]]){
					params[this.dndParams[i]] = this[this.dndParams[i]];
				}
			}
			this.dndController = new this.dndController(this, params);
		}
	},

	_store2model: function(){
		// summary:
		//		User specified a store&query rather than model, so create model from store/query
		this._v10Compat = true;
		kernel.deprecated("Tree: from version 2.0, should specify a model object rather than a store/query");

		var modelParams = {
			id: this.id + "_ForestStoreModel",
			store: this.store,
			query: this.query,
			childrenAttrs: this.childrenAttr
		};

		// Only override the model's mayHaveChildren() method if the user has specified an override
		if(this.params.mayHaveChildren){
			modelParams.mayHaveChildren = lang.hitch(this, "mayHaveChildren");
		}

		if(this.params.getItemChildren){
			modelParams.getChildren = lang.hitch(this, function(item, onComplete, onError){
				this.getItemChildren((this._v10Compat && item === this.model.root) ? null : item, onComplete, onError);
			});
		}
		this.model = new ForestStoreModel(modelParams);

		// For backwards compatibility, the visibility of the root node is controlled by
		// whether or not the user has specified a label
		this.showRoot = Boolean(this.label);
	},

	onLoad: function(){
		// summary:
		//		Called when tree finishes loading and expanding.
		// description:
		//		If persist == true the loading may encompass many levels of fetches
		//		from the data store, each asynchronous.   Waits for all to finish.
		// tags:
		//		callback
	},

	_load: function(){
		// summary:
		//		Initial load of the tree.
		//		Load root node (possibly hidden) and it's children.
		this.model.getRoot(
			lang.hitch(this, function(item){
				var rn = (this.rootNode = this.tree._createTreeNode({
					item: item,
					tree: this,
					isExpandable: true,
					label: this.label || this.getLabel(item),
					textDir: this.textDir,
					indent: this.showRoot ? 0 : -1
				}));
				if(!this.showRoot){
					rn.rowNode.style.display="none";
					// if root is not visible, move tree role to the invisible
					// root node's containerNode, see #12135
					this.domNode.setAttribute("role", "presentation");

					rn.labelNode.setAttribute("role", "presentation");
					rn.containerNode.setAttribute("role", "tree");
				}
				this.domNode.appendChild(rn.domNode);
				var identity = this.model.getIdentity(item);
				if(this._itemNodesMap[identity]){
					this._itemNodesMap[identity].push(rn);
				}else{
					this._itemNodesMap[identity] = [rn];
				}

				rn._updateLayout();		// sets "dijitTreeIsRoot" CSS classname

				// load top level children and then fire onLoad() event
				this._expandNode(rn).addCallback(lang.hitch(this, function(){
					this._loadDeferred.callback(true);
					this.onLoad();
				}));
			}),
			function(err){
				console.error(this, ": error loading root: ", err);
			}
		);
	},

	getNodesByItem: function(/*Item or id*/ item){
		// summary:
		//		Returns all tree nodes that refer to an item
		// returns:
		//		Array of tree nodes that refer to passed item

		if(!item){ return []; }
		var identity = lang.isString(item) ? item : this.model.getIdentity(item);
		// return a copy so widget don't get messed up by changes to returned array
		return [].concat(this._itemNodesMap[identity]);
	},

	_setSelectedItemAttr: function(/*Item or id*/ item){
		this.set('selectedItems', [item]);
	},

	_setSelectedItemsAttr: function(/*Items or ids*/ items){
		// summary:
		//		Select tree nodes related to passed items.
		//		WARNING: if model use multi-parented items or desired tree node isn't already loaded
		//		behavior is undefined. Use set('paths', ...) instead.
		var tree = this;
		this._loadDeferred.addCallback( lang.hitch(this, function(){
			var identities = array.map(items, function(item){
				return (!item || lang.isString(item)) ? item : tree.model.getIdentity(item);
			});
			var nodes = [];
			array.forEach(identities, function(id){
				nodes = nodes.concat(tree._itemNodesMap[id] || []);
			});
			this.set('selectedNodes', nodes);
		}));
	},

	_setPathAttr: function(/*Item[] || String[]*/ path){
		// summary:
		//      Singular variant of _setPathsAttr
		if(path.length){
			return this.set("paths", [path]);
		}else{
			// Empty list is interpreted as "select nothing"
			return this.set("paths", []);
		}
	},

	_setPathsAttr: function(/*Item[][] || String[][]*/ paths){
		// summary:
		//		Select the tree nodes identified by passed paths.
		// paths:
		//		Array of arrays of items or item id's
		// returns:
		//		Deferred to indicate when the set is complete
		var tree = this;

		// We may need to wait for some nodes to expand, so setting
		// each path will involve a Deferred. We bring those deferreds
		// together witha DeferredList.
		return new DeferredList(array.map(paths, function(path){
			var d = new Deferred();

			// normalize path to use identity
			path = array.map(path, function(item){
				return lang.isString(item) ? item : tree.model.getIdentity(item);
			});

			if(path.length){
				// Wait for the tree to load, if it hasn't already.
				tree._loadDeferred.addCallback(function(){ selectPath(path, [tree.rootNode], d); });
			}else{
				d.errback("Empty path");
			}
			return d;
		})).addCallback(setNodes);

		function selectPath(path, nodes, def){
			// Traverse path; the next path component should be among "nodes".
			var nextPath = path.shift();
			var nextNode = array.filter(nodes, function(node){
				return node.getIdentity() == nextPath;
			})[0];
			if(!!nextNode){
				if(path.length){
					tree._expandNode(nextNode).addCallback(function(){ selectPath(path, nextNode.getChildren(), def); });
				}else{
					//Successfully reached the end of this path
					def.callback(nextNode);
				}
			}else{
				def.errback("Could not expand path at " + nextPath);
			}
		}

		function setNodes(newNodes){
			//After all expansion is finished, set the selection to
			//the set of nodes successfully found.
			tree.set("selectedNodes", array.map(
				array.filter(newNodes,function(x){return x[0];}),
				function(x){return x[1];}));
		}
	},

	_setSelectedNodeAttr: function(node){
		this.set('selectedNodes', [node]);
	},
	_setSelectedNodesAttr: function(nodes){
		this._loadDeferred.addCallback( lang.hitch(this, function(){
			this.dndController.setSelection(nodes);
		}));
	},


	////////////// Data store related functions //////////////////////
	// These just get passed to the model; they are here for back-compat

	mayHaveChildren: function(/*dojo.data.Item*/ /*===== item =====*/){
		// summary:
		//		Deprecated.   This should be specified on the model itself.
		//
		//		Overridable function to tell if an item has or may have children.
		//		Controls whether or not +/- expando icon is shown.
		//		(For efficiency reasons we may not want to check if an element actually
		//		has children until user clicks the expando node)
		// tags:
		//		deprecated
	},

	getItemChildren: function(/*===== parentItem, onComplete =====*/){
		// summary:
		//		Deprecated.   This should be specified on the model itself.
		//
		// 		Overridable function that return array of child items of given parent item,
		//		or if parentItem==null then return top items in tree
		// tags:
		//		deprecated
	},

	///////////////////////////////////////////////////////
	// Functions for converting an item to a TreeNode
	getLabel: function(/*dojo.data.Item*/ item){
		// summary:
		//		Overridable function to get the label for a tree node (given the item)
		// tags:
		//		extension
		return this.model.getLabel(item);	// String
	},

	getIconClass: function(/*dojo.data.Item*/ item, /*Boolean*/ opened){
		// summary:
		//		Overridable function to return CSS class name to display icon
		// tags:
		//		extension
		return (!item || this.model.mayHaveChildren(item)) ? (opened ? "dijitFolderOpened" : "dijitFolderClosed") : "dijitLeaf"
	},

	getLabelClass: function(/*===== item, opened =====*/){
		// summary:
		//		Overridable function to return CSS class name to display label
		// item: dojo.data.Item
		// opened: Boolean
		// returns: String
		//		CSS class name
		// tags:
		//		extension
	},

	getRowClass: function(/*===== item, opened =====*/){
		// summary:
		//		Overridable function to return CSS class name to display row
		// item: dojo.data.Item
		// opened: Boolean
		// returns: String
		//		CSS class name
		// tags:
		//		extension
	},

	getIconStyle: function(/*===== item, opened =====*/){
		// summary:
		//		Overridable function to return CSS styles to display icon
		// item: dojo.data.Item
		// opened: Boolean
		// returns: Object
		//		Object suitable for input to dojo.style() like {backgroundImage: "url(...)"}
		// tags:
		//		extension
	},

	getLabelStyle: function(/*===== item, opened =====*/){
		// summary:
		//		Overridable function to return CSS styles to display label
		// item: dojo.data.Item
		// opened: Boolean
		// returns:
		//		Object suitable for input to dojo.style() like {color: "red", background: "green"}
		// tags:
		//		extension
	},

	getRowStyle: function(/*===== item, opened =====*/){
		// summary:
		//		Overridable function to return CSS styles to display row
		// item: dojo.data.Item
		// opened: Boolean
		// returns:
		//		Object suitable for input to dojo.style() like {background-color: "#bbb"}
		// tags:
		//		extension
	},

	getTooltip: function(/*dojo.data.Item*/ /*===== item =====*/){
		// summary:
		//		Overridable function to get the tooltip for a tree node (given the item)
		// tags:
		//		extension
		return "";	// String
	},

	/////////// Keyboard and Mouse handlers ////////////////////

	_onKeyPress: function(/*dijit.TreeNode*/ treeNode, /*Event*/ e){
		// summary:
		//		Handles keystrokes for printable keys, doing search navigation

		if(e.charCode <= 32){
			// Avoid duplicate events on firefox (this is an arrow key that will be handled by keydown handler)
			return;
		}

		if(!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey){
			var c = String.fromCharCode(e.charCode);
			this._onLetterKeyNav( { node: treeNode, key: c.toLowerCase() } );
			event.stop(e);
		}
	},

	_onKeyDown: function(/*dijit.TreeNode*/ treeNode, /*Event*/ e){
		// summary:
		//		Handles arrow, space, and enter keys

		var key = e.keyCode;

		var map = this._keyHandlerMap;
		if(!map){
			// setup table mapping keys to events
			map = {};
			map[keys.ENTER]="_onEnterKey";
			//On WebKit based browsers, the combination ctrl-enter
			//does not get passed through. To allow accessible
			//multi-select on those browsers, the space key is
			//also used for selection.
			map[keys.SPACE]= map[" "] = "_onEnterKey";
			map[this.isLeftToRight() ? keys.LEFT_ARROW : keys.RIGHT_ARROW]="_onLeftArrow";
			map[this.isLeftToRight() ? keys.RIGHT_ARROW : keys.LEFT_ARROW]="_onRightArrow";
			map[keys.UP_ARROW]="_onUpArrow";
			map[keys.DOWN_ARROW]="_onDownArrow";
			map[keys.HOME]="_onHomeKey";
			map[keys.END]="_onEndKey";
			this._keyHandlerMap = map;
		}

		if(this._keyHandlerMap[key]){
			// clear record of recent printables (being saved for multi-char letter navigation),
			// because "a", down-arrow, "b" shouldn't search for "ab"
			if(this._curSearch){
				clearTimeout(this._curSearch.timer);
				delete this._curSearch;
			}

			this[this._keyHandlerMap[key]]( { node: treeNode, item: treeNode.item, evt: e } );
			event.stop(e);
		}
	},

	_onEnterKey: function(/*Object*/ message){
		this._publish("execute", { item: message.item, node: message.node } );
		this.dndController.userSelect(message.node, connect.isCopyKey( message.evt ), message.evt.shiftKey);
		this.onClick(message.item, message.node, message.evt);
	},

	_onDownArrow: function(/*Object*/ message){
		// summary:
		//		down arrow pressed; get next visible node, set focus there
		var node = this._getNextNode(message.node);
		if(node && node.isTreeNode){
			this.focusNode(node);
		}
	},

	_onUpArrow: function(/*Object*/ message){
		// summary:
		//		Up arrow pressed; move to previous visible node

		var node = message.node;

		// if younger siblings
		var previousSibling = node.getPreviousSibling();
		if(previousSibling){
			node = previousSibling;
			// if the previous node is expanded, dive in deep
			while(node.isExpandable && node.isExpanded && node.hasChildren()){
				// move to the last child
				var children = node.getChildren();
				node = children[children.length-1];
			}
		}else{
			// if this is the first child, return the parent
			// unless the parent is the root of a tree with a hidden root
			var parent = node.getParent();
			if(!(!this.showRoot && parent === this.rootNode)){
				node = parent;
			}
		}

		if(node && node.isTreeNode){
			this.focusNode(node);
		}
	},

	_onRightArrow: function(/*Object*/ message){
		// summary:
		//		Right arrow pressed; go to child node
		var node = message.node;

		// if not expanded, expand, else move to 1st child
		if(node.isExpandable && !node.isExpanded){
			this._expandNode(node);
		}else if(node.hasChildren()){
			node = node.getChildren()[0];
			if(node && node.isTreeNode){
				this.focusNode(node);
			}
		}
	},

	_onLeftArrow: function(/*Object*/ message){
		// summary:
		//		Left arrow pressed.
		//		If not collapsed, collapse, else move to parent.

		var node = message.node;

		if(node.isExpandable && node.isExpanded){
			this._collapseNode(node);
		}else{
			var parent = node.getParent();
			if(parent && parent.isTreeNode && !(!this.showRoot && parent === this.rootNode)){
				this.focusNode(parent);
			}
		}
	},

	_onHomeKey: function(){
		// summary:
		//		Home key pressed; get first visible node, and set focus there
		var node = this._getRootOrFirstNode();
		if(node){
			this.focusNode(node);
		}
	},

	_onEndKey: function(){
		// summary:
		//		End key pressed; go to last visible node.

		var node = this.rootNode;
		while(node.isExpanded){
			var c = node.getChildren();
			node = c[c.length - 1];
		}

		if(node && node.isTreeNode){
			this.focusNode(node);
		}
	},

	// multiCharSearchDuration: Number
	//		If multiple characters are typed where each keystroke happens within
	//		multiCharSearchDuration of the previous keystroke,
	//		search for nodes matching all the keystrokes.
	//
	//		For example, typing "ab" will search for entries starting with
	//		"ab" unless the delay between "a" and "b" is greater than multiCharSearchDuration.
	multiCharSearchDuration: 250,

	_onLetterKeyNav: function(message){
		// summary:
		//		Called when user presses a prinatable key; search for node starting with recently typed letters.
		// message: Object
		//		Like { node: TreeNode, key: 'a' } where key is the key the user pressed.

		// Branch depending on whether this key starts a new search, or modifies an existing search
		var cs = this._curSearch;
		if(cs){
			// We are continuing a search.  Ex: user has pressed 'a', and now has pressed
			// 'b', so we want to search for nodes starting w/"ab".
			cs.pattern = cs.pattern + message.key;
			clearTimeout(cs.timer);
		}else{
			// We are starting a new search
			cs = this._curSearch = {
					pattern: message.key,
					startNode: message.node
			};
		}

		// set/reset timer to forget recent keystrokes
		var self = this;
		cs.timer = setTimeout(function(){
			delete self._curSearch;
		}, this.multiCharSearchDuration);

		// Navigate to TreeNode matching keystrokes [entered so far].
		var node = cs.startNode;
		do{
			node = this._getNextNode(node);
			//check for last node, jump to first node if necessary
			if(!node){
				node = this._getRootOrFirstNode();
			}
		}while(node !== cs.startNode && (node.label.toLowerCase().substr(0, cs.pattern.length) != cs.pattern));
		if(node && node.isTreeNode){
			// no need to set focus if back where we started
			if(node !== cs.startNode){
				this.focusNode(node);
			}
		}
	},

	isExpandoNode: function(node, widget){
		// summary:
		//		check whether a dom node is the expandoNode for a particular TreeNode widget
		return dom.isDescendant(node, widget.expandoNode);
	},
	_onClick: function(/*TreeNode*/ nodeWidget, /*Event*/ e){
		// summary:
		//		Translates click events into commands for the controller to process

		var domElement = e.target,
			isExpandoClick = this.isExpandoNode(domElement, nodeWidget);

		if( (this.openOnClick && nodeWidget.isExpandable) || isExpandoClick ){
			// expando node was clicked, or label of a folder node was clicked; open it
			if(nodeWidget.isExpandable){
				this._onExpandoClick({node:nodeWidget});
			}
		}else{
			this._publish("execute", { item: nodeWidget.item, node: nodeWidget, evt: e } );
			this.onClick(nodeWidget.item, nodeWidget, e);
			this.focusNode(nodeWidget);
		}
		event.stop(e);
	},
	_onDblClick: function(/*TreeNode*/ nodeWidget, /*Event*/ e){
		// summary:
		//		Translates double-click events into commands for the controller to process

		var domElement = e.target,
			isExpandoClick = (domElement == nodeWidget.expandoNode || domElement == nodeWidget.expandoNodeText);

		if( (this.openOnDblClick && nodeWidget.isExpandable) ||isExpandoClick ){
			// expando node was clicked, or label of a folder node was clicked; open it
			if(nodeWidget.isExpandable){
				this._onExpandoClick({node:nodeWidget});
			}
		}else{
			this._publish("execute", { item: nodeWidget.item, node: nodeWidget, evt: e } );
			this.onDblClick(nodeWidget.item, nodeWidget, e);
			this.focusNode(nodeWidget);
		}
		event.stop(e);
	},

	_onExpandoClick: function(/*Object*/ message){
		// summary:
		//		User clicked the +/- icon; expand or collapse my children.
		var node = message.node;

		// If we are collapsing, we might be hiding the currently focused node.
		// Also, clicking the expando node might have erased focus from the current node.
		// For simplicity's sake just focus on the node with the expando.
		this.focusNode(node);

		if(node.isExpanded){
			this._collapseNode(node);
		}else{
			this._expandNode(node);
		}
	},

	onClick: function(/*===== item, node, evt =====*/){
		// summary:
		//		Callback when a tree node is clicked
		// item: dojo.data.Item
		// node: TreeNode
		// evt: Event
		// tags:
		//		callback
	},
	onDblClick: function(/*===== item, node, evt =====*/){
		// summary:
		//		Callback when a tree node is double-clicked
		// item: dojo.data.Item
		// node: TreeNode
		// evt: Event
		// tags:
		//		callback
	},
	onOpen: function(/*===== item, node =====*/){
		// summary:
		//		Callback when a node is opened
		// item: dojo.data.Item
		// node: TreeNode
		// tags:
		//		callback
	},
	onClose: function(/*===== item, node =====*/){
		// summary:
		//		Callback when a node is closed
		// item: dojo.data.Item
		// node: TreeNode
		// tags:
		//		callback
	},

	_getNextNode: function(node){
		// summary:
		//		Get next visible node

		if(node.isExpandable && node.isExpanded && node.hasChildren()){
			// if this is an expanded node, get the first child
			return node.getChildren()[0];		// _TreeNode
		}else{
			// find a parent node with a sibling
			while(node && node.isTreeNode){
				var returnNode = node.getNextSibling();
				if(returnNode){
					return returnNode;		// _TreeNode
				}
				node = node.getParent();
			}
			return null;
		}
	},

	_getRootOrFirstNode: function(){
		// summary:
		//		Get first visible node
		return this.showRoot ? this.rootNode : this.rootNode.getChildren()[0];
	},

	_collapseNode: function(/*_TreeNode*/ node){
		// summary:
		//		Called when the user has requested to collapse the node

		if(node._expandNodeDeferred){
			delete node._expandNodeDeferred;
		}

		if(node.isExpandable){
			if(node.state == "LOADING"){
				// ignore clicks while we are in the process of loading data
				return;
			}

			node.collapse();
			this.onClose(node.item, node);

			this._state(node, false);
		}
	},

	_expandNode: function(/*_TreeNode*/ node, /*Boolean?*/ recursive){
		// summary:
		//		Called when the user has requested to expand the node
		// recursive:
		//		Internal flag used when _expandNode() calls itself, don't set.
		// returns:
		//		Deferred that fires when the node is loaded and opened and (if persist=true) all it's descendants
		//		that were previously opened too

		if(node._expandNodeDeferred && !recursive){
			// there's already an expand in progress (or completed), so just return
			return node._expandNodeDeferred;	// dojo.Deferred
		}

		var model = this.model,
			item = node.item,
			_this = this;

		switch(node.state){
			case "UNCHECKED":
				// need to load all the children, and then expand
				node.markProcessing();

				// Setup deferred to signal when the load and expand are finished.
				// Save that deferred in this._expandDeferred as a flag that operation is in progress.
				var def = (node._expandNodeDeferred = new Deferred());

				// Get the children
				model.getChildren(
					item,
					function(items){
						node.unmarkProcessing();

						// Display the children and also start expanding any children that were previously expanded
						// (if this.persist == true).   The returned Deferred will fire when those expansions finish.
						var scid = node.setChildItems(items);

						// Call _expandNode() again but this time it will just to do the animation (default branch).
						// The returned Deferred will fire when the animation completes.
						// TODO: seems like I can avoid recursion and just use a deferred to sequence the events?
						var ed = _this._expandNode(node, true);

						// After the above two tasks (setChildItems() and recursive _expandNode()) finish,
						// signal that I am done.
						scid.addCallback(function(){
							ed.addCallback(function(){
								def.callback();
							})
						});
					},
					function(err){
						console.error(_this, ": error loading root children: ", err);
					}
				);
				break;

			default:	// "LOADED"
				// data is already loaded; just expand node
				def = (node._expandNodeDeferred = node.expand());

				this.onOpen(node.item, node);

				this._state(node, true);
		}

		return def;	// dojo.Deferred
	},

	////////////////// Miscellaneous functions ////////////////

	focusNode: function(/* _tree.Node */ node){
		// summary:
		//		Focus on the specified node (which must be visible)
		// tags:
		//		protected

		// set focus so that the label will be voiced using screen readers
		focus.focus(node.labelNode);
	},

	_onNodeFocus: function(/*dijit._Widget*/ node){
		// summary:
		//		Called when a TreeNode gets focus, either by user clicking
		//		it, or programatically by arrow key handling code.
		// description:
		//		It marks that the current node is the selected one, and the previously
		//		selected node no longer is.

		if(node && node != this.lastFocused){
			if(this.lastFocused && !this.lastFocused._destroyed){
				// mark that the previously focsable node is no longer focusable
				this.lastFocused.setFocusable(false);
			}

			// mark that the new node is the currently selected one
			node.setFocusable(true);
			this.lastFocused = node;
		}
	},

	_onNodeMouseEnter: function(/*dijit._Widget*/ /*===== node =====*/){
		// summary:
		//		Called when mouse is over a node (onmouseenter event),
		//		this is monitored by the DND code
	},

	_onNodeMouseLeave: function(/*dijit._Widget*/ /*===== node =====*/){
		// summary:
		//		Called when mouse leaves a node (onmouseleave event),
		//		this is monitored by the DND code
	},

	//////////////// Events from the model //////////////////////////

	_onItemChange: function(/*Item*/ item){
		// summary:
		//		Processes notification of a change to an item's scalar values like label
		var model = this.model,
			identity = model.getIdentity(item),
			nodes = this._itemNodesMap[identity];

		if(nodes){
			var label = this.getLabel(item),
				tooltip = this.getTooltip(item);
			array.forEach(nodes, function(node){
				node.set({
					item: item,		// theoretically could be new JS Object representing same item
					label: label,
					tooltip: tooltip
				});
				node._updateItemClasses(item);
			});
		}
	},

	_onItemChildrenChange: function(/*dojo.data.Item*/ parent, /*dojo.data.Item[]*/ newChildrenList){
		// summary:
		//		Processes notification of a change to an item's children
		var model = this.model,
			identity = model.getIdentity(parent),
			parentNodes = this._itemNodesMap[identity];

		if(parentNodes){
			array.forEach(parentNodes,function(parentNode){
				parentNode.setChildItems(newChildrenList);
			});
		}
	},

	_onItemDelete: function(/*Item*/ item){
		// summary:
		//		Processes notification of a deletion of an item
		var model = this.model,
			identity = model.getIdentity(item),
			nodes = this._itemNodesMap[identity];

		if(nodes){
			array.forEach(nodes,function(node){
				// Remove node from set of selected nodes (if it's selected)
				this.dndController.removeTreeNode(node);

				var parent = node.getParent();
				if(parent){
					// if node has not already been orphaned from a _onSetItem(parent, "children", ..) call...
					parent.removeChild(node);
				}
				node.destroyRecursive();
			}, this);
			delete this._itemNodesMap[identity];
		}
	},

	/////////////// Miscellaneous funcs

	_initState: function(){
		// summary:
		//		Load in which nodes should be opened automatically
		this._openedNodes = {};
		if(this.persist && this.cookieName){
			var oreo = cookie(this.cookieName);
			if(oreo){
				array.forEach(oreo.split(','), function(item){
					this._openedNodes[item] = true;
				}, this);
			}
		}
	},
	_state: function(node, expanded){
		// summary:
		//		Query or set expanded state for an node
		if(!this.persist){
			return false;
		}
		var path = array.map(node.getTreePath(), function(item){
				return this.model.getIdentity(item);
			}, this).join("/");
		if(arguments.length === 1){
			return this._openedNodes[path];
		}else{
			if(expanded){
				this._openedNodes[path] = true;
			}else{
				delete this._openedNodes[path];
			}
			var ary = [];
			for(var id in this._openedNodes){
				ary.push(id);
			}
			cookie(this.cookieName, ary.join(","), {expires:365});
		}
	},

	destroy: function(){
		if(this._curSearch){
			clearTimeout(this._curSearch.timer);
			delete this._curSearch;
		}
		if(this.rootNode){
			this.rootNode.destroyRecursive();
		}
		if(this.dndController && !lang.isString(this.dndController)){
			this.dndController.destroy();
		}
		this.rootNode = null;
		this.inherited(arguments);
	},

	destroyRecursive: function(){
		// A tree is treated as a leaf, not as a node with children (like a grid),
		// but defining destroyRecursive for back-compat.
		this.destroy();
	},

	resize: function(changeSize){
		if(changeSize){
			domGeometry.setMarginBox(this.domNode, changeSize);
		}

		// The only JS sizing involved w/tree is the indentation, which is specified
		// in CSS and read in through this dummy indentDetector node (tree must be
		// visible and attached to the DOM to read this)
		this._nodePixelIndent = domGeometry.position(this.tree.indentDetector).w;

		if(this.tree.rootNode){
			// If tree has already loaded, then reset indent for all the nodes
			this.tree.rootNode.set('indent', this.showRoot ? 0 : -1);
		}
	},

	_createTreeNode: function(/*Object*/ args){
		// summary:
		//		creates a TreeNode
		// description:
		//		Developers can override this method to define their own TreeNode class;
		//		However it will probably be removed in a future release in favor of a way
		//		of just specifying a widget for the label, rather than one that contains
		//		the children too.
		return new TreeNode(args);
	},

	_setTextDirAttr: function(textDir){
		if(textDir && this.textDir!= textDir){
			this._set("textDir",textDir);
			this.rootNode.set("textDir", textDir);
		}
	}
});

Tree._TreeNode = TreeNode;	// for monkey patching

return Tree;
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
'url:dijit/templates/Tree.html':"<div class=\"dijitTree dijitTreeContainer\" role=\"tree\">\n\t<div class=\"dijitInline dijitTreeIndent\" style=\"position: absolute; top: -9999px\" data-dojo-attach-point=\"indentDetector\"></div>\n</div>\n",
'url:dijit/templates/TreeNode.html':"<div class=\"dijitTreeNode\" role=\"presentation\"\n\t><div data-dojo-attach-point=\"rowNode\" class=\"dijitTreeRow\" role=\"presentation\" data-dojo-attach-event=\"onmouseenter:_onMouseEnter, onmouseleave:_onMouseLeave, onclick:_onClick, ondblclick:_onDblClick\"\n\t\t><img src=\"${_blankGif}\" alt=\"\" data-dojo-attach-point=\"expandoNode\" class=\"dijitTreeExpando\" role=\"presentation\"\n\t\t/><span data-dojo-attach-point=\"expandoNodeText\" class=\"dijitExpandoText\" role=\"presentation\"\n\t\t></span\n\t\t><span data-dojo-attach-point=\"contentNode\"\n\t\t\tclass=\"dijitTreeContent\" role=\"presentation\">\n\t\t\t<img src=\"${_blankGif}\" alt=\"\" data-dojo-attach-point=\"iconNode\" class=\"dijitIcon dijitTreeIcon\" role=\"presentation\"\n\t\t\t/><span data-dojo-attach-point=\"labelNode\" class=\"dijitTreeLabel\" role=\"treeitem\" tabindex=\"-1\" aria-selected=\"false\" data-dojo-attach-event=\"onfocus:_onLabelFocus\"></span>\n\t\t</span\n\t></div>\n\t<div data-dojo-attach-point=\"containerNode\" class=\"dijitTreeContainer\" role=\"presentation\" style=\"display: none;\"></div>\n</div>\n",
'dijit/tree/_dndContainer':function(){
define("dijit/tree/_dndContainer", [
	"dojo/aspect",	// aspect.after
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.remove domClass.replace
	"dojo/_base/event",	// event.stop
	"dojo/_base/lang", // lang.getObject lang.mixin lang.hitch
	"dojo/mouse",	// mouse.enter, mouse.leave
	"dojo/on"
], function(aspect, declare, domClass, event, lang, mouse, on){

	// module:
	//		dijit/tree/_dndContainer
	// summary:
	//		This is a base class for `dijit.tree._dndSelector`, and isn't meant to be used directly.
	//		It's modeled after `dojo.dnd.Container`.

	return declare("dijit.tree._dndContainer", null, {

		// summary:
		//		This is a base class for `dijit.tree._dndSelector`, and isn't meant to be used directly.
		//		It's modeled after `dojo.dnd.Container`.
		// tags:
		//		protected

		/*=====
		// current: DomNode
		//		The currently hovered TreeNode.rowNode (which is the DOM node
		//		associated w/a given node in the tree, excluding it's descendants)
		current: null,
		=====*/

		constructor: function(tree, params){
			// summary:
			//		A constructor of the Container
			// tree: Node
			//		Node or node's id to build the container on
			// params: dijit.tree.__SourceArgs
			//		A dict of parameters, which gets mixed into the object
			// tags:
			//		private
			this.tree = tree;
			this.node = tree.domNode;	// TODO: rename; it's not a TreeNode but the whole Tree
			lang.mixin(this, params);

			// class-specific variables
			this.current = null;	// current TreeNode's DOM node

			// states
			this.containerState = "";
			domClass.add(this.node, "dojoDndContainer");

			// set up events
			this.events = [
				// container level events
				on(this.node, mouse.enter, lang.hitch(this, "onOverEvent")),
				on(this.node, mouse.leave,	lang.hitch(this, "onOutEvent")),

				// switching between TreeNodes
				aspect.after(this.tree, "_onNodeMouseEnter", lang.hitch(this, "onMouseOver"), true),
				aspect.after(this.tree, "_onNodeMouseLeave", lang.hitch(this, "onMouseOut"), true),

				// cancel text selection and text dragging
				on(this.node, "dragstart", lang.hitch(event, "stop")),
				on(this.node, "selectstart", lang.hitch(event, "stop"))
			];
		},

		destroy: function(){
			// summary:
			//		Prepares this object to be garbage-collected

			var h;
			while(h = this.events.pop()){ h.remove(); }

			// this.clearItems();
			this.node = this.parent = null;
		},

		// mouse events
		onMouseOver: function(widget /*===== , evt =====*/){
			// summary:
			//		Called when mouse is moved over a TreeNode
			// widget: TreeNode
			// evt: Event
			// tags:
			//		protected
			this.current = widget;
		},

		onMouseOut: function(/*===== widget, evt =====*/){
			// summary:
			//		Called when mouse is moved away from a TreeNode
			// widget: TreeNode
			// evt: Event
			// tags:
			//		protected
			this.current = null;
		},

		_changeState: function(type, newState){
			// summary:
			//		Changes a named state to new state value
			// type: String
			//		A name of the state to change
			// newState: String
			//		new state
			var prefix = "dojoDnd" + type;
			var state = type.toLowerCase() + "State";
			//domClass.replace(this.node, prefix + newState, prefix + this[state]);
			domClass.replace(this.node, prefix + newState, prefix + this[state]);
			this[state] = newState;
		},

		_addItemClass: function(node, type){
			// summary:
			//		Adds a class with prefix "dojoDndItem"
			// node: Node
			//		A node
			// type: String
			//		A variable suffix for a class name
			domClass.add(node, "dojoDndItem" + type);
		},

		_removeItemClass: function(node, type){
			// summary:
			//		Removes a class with prefix "dojoDndItem"
			// node: Node
			//		A node
			// type: String
			//		A variable suffix for a class name
			domClass.remove(node, "dojoDndItem" + type);
		},

		onOverEvent: function(){
			// summary:
			//		This function is called once, when mouse is over our container
			// tags:
			//		protected
			this._changeState("Container", "Over");
		},

		onOutEvent: function(){
			// summary:
			//		This function is called once, when mouse is out of our container
			// tags:
			//		protected
			this._changeState("Container", "");
		}
	});
});

},
'dijit/tree/dndSource':function(){
define("dijit/tree/dndSource", [
	"dojo/_base/array", // array.forEach array.indexOf array.map
	"dojo/_base/connect", // isCopyKey
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add
	"dojo/dom-geometry", // domGeometry.position
	"dojo/_base/lang", // lang.mixin lang.hitch
	"dojo/on", // subscribe
	"dojo/touch",
	"dojo/topic",
	"dojo/dnd/Manager", // DNDManager.manager
	"./_dndSelector"
], function(array, connect, declare, domClass, domGeometry, lang, on, touch, topic, DNDManager, _dndSelector){

// module:
//		dijit/tree/dndSource
// summary:
//		Handles drag and drop operations (as a source or a target) for `dijit.Tree`

/*=====
dijit.tree.__SourceArgs = function(){
	// summary:
	//		A dict of parameters for Tree source configuration.
	// isSource: Boolean?
	//		Can be used as a DnD source. Defaults to true.
	// accept: String[]
	//		List of accepted types (text strings) for a target; defaults to
	//		["text", "treeNode"]
	// copyOnly: Boolean?
	//		Copy items, if true, use a state of Ctrl key otherwise,
	// dragThreshold: Number
	//		The move delay in pixels before detecting a drag; 0 by default
	// betweenThreshold: Integer
	//		Distance from upper/lower edge of node to allow drop to reorder nodes
	this.isSource = isSource;
	this.accept = accept;
	this.autoSync = autoSync;
	this.copyOnly = copyOnly;
	this.dragThreshold = dragThreshold;
	this.betweenThreshold = betweenThreshold;
}
=====*/

return declare("dijit.tree.dndSource", _dndSelector, {
	// summary:
	//		Handles drag and drop operations (as a source or a target) for `dijit.Tree`

	// isSource: [private] Boolean
	//		Can be used as a DnD source.
	isSource: true,

	// accept: String[]
	//		List of accepted types (text strings) for the Tree; defaults to
	//		["text"]
	accept: ["text", "treeNode"],

	// copyOnly: [private] Boolean
	//		Copy items, if true, use a state of Ctrl key otherwise
	copyOnly: false,

	// dragThreshold: Number
	//		The move delay in pixels before detecting a drag; 5 by default
	dragThreshold: 5,

	// betweenThreshold: Integer
	//		Distance from upper/lower edge of node to allow drop to reorder nodes
	betweenThreshold: 0,

	constructor: function(/*dijit.Tree*/ tree, /*dijit.tree.__SourceArgs*/ params){
		// summary:
		//		a constructor of the Tree DnD Source
		// tags:
		//		private
		if(!params){ params = {}; }
		lang.mixin(this, params);
		this.isSource = typeof params.isSource == "undefined" ? true : params.isSource;
		var type = params.accept instanceof Array ? params.accept : ["text", "treeNode"];
		this.accept = null;
		if(type.length){
			this.accept = {};
			for(var i = 0; i < type.length; ++i){
				this.accept[type[i]] = 1;
			}
		}

		// class-specific variables
		this.isDragging = false;
		this.mouseDown = false;
		this.targetAnchor = null;	// DOMNode corresponding to the currently moused over TreeNode
		this.targetBox = null;	// coordinates of this.targetAnchor
		this.dropPosition = "";	// whether mouse is over/after/before this.targetAnchor
		this._lastX = 0;
		this._lastY = 0;

		// states
		this.sourceState = "";
		if(this.isSource){
			domClass.add(this.node, "dojoDndSource");
		}
		this.targetState = "";
		if(this.accept){
			domClass.add(this.node, "dojoDndTarget");
		}

		// set up events
		this.topics = [
			topic.subscribe("/dnd/source/over", lang.hitch(this, "onDndSourceOver")),
			topic.subscribe("/dnd/start", lang.hitch(this, "onDndStart")),
			topic.subscribe("/dnd/drop", lang.hitch(this, "onDndDrop")),
			topic.subscribe("/dnd/cancel", lang.hitch(this, "onDndCancel"))
		];
	},

	// methods
	checkAcceptance: function(/*===== source, nodes =====*/){
		// summary:
		//		Checks if the target can accept nodes from this source
		// source: dijit.tree.dndSource
		//		The source which provides items
		// nodes: DOMNode[]
		//		Array of DOM nodes corresponding to nodes being dropped, dijitTreeRow nodes if
		//		source is a dijit.Tree.
		// tags:
		//		extension
		return true;	// Boolean
	},

	copyState: function(keyPressed){
		// summary:
		//		Returns true, if we need to copy items, false to move.
		//		It is separated to be overwritten dynamically, if needed.
		// keyPressed: Boolean
		//		The "copy" control key was pressed
		// tags:
		//		protected
		return this.copyOnly || keyPressed;	// Boolean
	},
	destroy: function(){
		// summary:
		//		Prepares the object to be garbage-collected.
		this.inherited(arguments);
		var h;
		while(h = this.topics.pop()){ h.remove(); }
		this.targetAnchor = null;
	},

	_onDragMouse: function(e){
		// summary:
		//		Helper method for processing onmousemove/onmouseover events while drag is in progress.
		//		Keeps track of current drop target.

		var m = DNDManager.manager(),
			oldTarget = this.targetAnchor,			// the TreeNode corresponding to TreeNode mouse was previously over
			newTarget = this.current,				// TreeNode corresponding to TreeNode mouse is currently over
			oldDropPosition = this.dropPosition;	// the previous drop position (over/before/after)

		// calculate if user is indicating to drop the dragged node before, after, or over
		// (i.e., to become a child of) the target node
		var newDropPosition = "Over";
		if(newTarget && this.betweenThreshold > 0){
			// If mouse is over a new TreeNode, then get new TreeNode's position and size
			if(!this.targetBox || oldTarget != newTarget){
				this.targetBox = domGeometry.position(newTarget.rowNode, true);
			}
			if((e.pageY - this.targetBox.y) <= this.betweenThreshold){
				newDropPosition = "Before";
			}else if((e.pageY - this.targetBox.y) >= (this.targetBox.h - this.betweenThreshold)){
				newDropPosition = "After";
			}
		}

		if(newTarget != oldTarget || newDropPosition != oldDropPosition){
			if(oldTarget){
				this._removeItemClass(oldTarget.rowNode, oldDropPosition);
			}
			if(newTarget){
				this._addItemClass(newTarget.rowNode, newDropPosition);
			}

			// Check if it's ok to drop the dragged node on/before/after the target node.
			if(!newTarget){
				m.canDrop(false);
			}else if(newTarget == this.tree.rootNode && newDropPosition != "Over"){
				// Can't drop before or after tree's root node; the dropped node would just disappear (at least visually)
				m.canDrop(false);
			}else{
				// Guard against dropping onto yourself (TODO: guard against dropping onto your descendant, #7140)
				var model = this.tree.model,
					sameId = false;
				if(m.source == this){
					for(var dragId in this.selection){
						var dragNode = this.selection[dragId];
						if(dragNode.item === newTarget.item){
							sameId = true;
							break;
						}
					}
				}
				if(sameId){
					m.canDrop(false);
				}else if(this.checkItemAcceptance(newTarget.rowNode, m.source, newDropPosition.toLowerCase())
						&& !this._isParentChildDrop(m.source, newTarget.rowNode)){
					m.canDrop(true);
				}else{
					m.canDrop(false);
				}
			}

			this.targetAnchor = newTarget;
			this.dropPosition = newDropPosition;
		}
	},

	onMouseMove: function(e){
		// summary:
		//		Called for any onmousemove/ontouchmove events over the Tree
		// e: Event
		//		onmousemouse/ontouchmove event
		// tags:
		//		private
		if(this.isDragging && this.targetState == "Disabled"){ return; }
		this.inherited(arguments);
		var m = DNDManager.manager();
		if(this.isDragging){
			this._onDragMouse(e);
		}else{
			if(this.mouseDown && this.isSource &&
				 (Math.abs(e.pageX-this._lastX)>=this.dragThreshold || Math.abs(e.pageY-this._lastY)>=this.dragThreshold)){
				var nodes = this.getSelectedTreeNodes();
				if(nodes.length){
					if(nodes.length > 1){
						//filter out all selected items which has one of their ancestor selected as well
						var seen = this.selection, i = 0, r = [], n, p;
						nextitem: while((n = nodes[i++])){
							for(p = n.getParent(); p && p !== this.tree; p = p.getParent()){
								if(seen[p.id]){ //parent is already selected, skip this node
									continue nextitem;
								}
							}
							//this node does not have any ancestors selected, add it
							r.push(n);
						}
						nodes = r;
					}
					nodes = array.map(nodes, function(n){return n.domNode});
					m.startDrag(this, nodes, this.copyState(connect.isCopyKey(e)));
				}
			}
		}
	},

	onMouseDown: function(e){
		// summary:
		//		Event processor for onmousedown/ontouchstart
		// e: Event
		//		onmousedown/ontouchend event
		// tags:
		//		private
		this.mouseDown = true;
		this.mouseButton = e.button;
		this._lastX = e.pageX;
		this._lastY = e.pageY;
		this.inherited(arguments);
	},

	onMouseUp: function(e){
		// summary:
		//		Event processor for onmouseup/ontouchend
		// e: Event
		//		onmouseup/ontouchend event
		// tags:
		//		private
		if(this.mouseDown){
			this.mouseDown = false;
			this.inherited(arguments);
		}
	},

	onMouseOut: function(){
		// summary:
		//		Event processor for when mouse is moved away from a TreeNode
		// tags:
		//		private
		this.inherited(arguments);
		this._unmarkTargetAnchor();
	},

	checkItemAcceptance: function(/*===== target, source, position =====*/){
		// summary:
		//		Stub function to be overridden if one wants to check for the ability to drop at the node/item level
		// description:
		//		In the base case, this is called to check if target can become a child of source.
		//		When betweenThreshold is set, position="before" or "after" means that we
		//		are asking if the source node can be dropped before/after the target node.
		// target: DOMNode
		//		The dijitTreeRoot DOM node inside of the TreeNode that we are dropping on to
		//		Use dijit.getEnclosingWidget(target) to get the TreeNode.
		// source: dijit.tree.dndSource
		//		The (set of) nodes we are dropping
		// position: String
		//		"over", "before", or "after"
		// tags:
		//		extension
		return true;
	},

	// topic event processors
	onDndSourceOver: function(source){
		// summary:
		//		Topic event processor for /dnd/source/over, called when detected a current source.
		// source: Object
		//		The dijit.tree.dndSource / dojo.dnd.Source which has the mouse over it
		// tags:
		//		private
		if(this != source){
			this.mouseDown = false;
			this._unmarkTargetAnchor();
		}else if(this.isDragging){
			var m = DNDManager.manager();
			m.canDrop(false);
		}
	},
	onDndStart: function(source, nodes, copy){
		// summary:
		//		Topic event processor for /dnd/start, called to initiate the DnD operation
		// source: Object
		//		The dijit.tree.dndSource / dojo.dnd.Source which is providing the items
		// nodes: DomNode[]
		//		The list of transferred items, dndTreeNode nodes if dragging from a Tree
		// copy: Boolean
		//		Copy items, if true, move items otherwise
		// tags:
		//		private

		if(this.isSource){
			this._changeState("Source", this == source ? (copy ? "Copied" : "Moved") : "");
		}
		var accepted = this.checkAcceptance(source, nodes);

		this._changeState("Target", accepted ? "" : "Disabled");

		if(this == source){
			DNDManager.manager().overSource(this);
		}

		this.isDragging = true;
	},

	itemCreator: function(nodes /*===== , target, source =====*/){
		// summary:
		//		Returns objects passed to `Tree.model.newItem()` based on DnD nodes
		//		dropped onto the tree.   Developer must override this method to enable
		// 		dropping from external sources onto this Tree, unless the Tree.model's items
		//		happen to look like {id: 123, name: "Apple" } with no other attributes.
		// description:
		//		For each node in nodes[], which came from source, create a hash of name/value
		//		pairs to be passed to Tree.model.newItem().  Returns array of those hashes.
		// nodes: DomNode[]
		// target: DomNode
		// source: dojo.dnd.Source
		// returns: Object[]
		//		Array of name/value hashes for each new item to be added to the Tree, like:
		// |	[
		// |		{ id: 123, label: "apple", foo: "bar" },
		// |		{ id: 456, label: "pear", zaz: "bam" }
		// |	]
		// tags:
		//		extension

		// TODO: for 2.0 refactor so itemCreator() is called once per drag node, and
		// make signature itemCreator(sourceItem, node, target) (or similar).

		return array.map(nodes, function(node){
			return {
				"id": node.id,
				"name": node.textContent || node.innerText || ""
			};
		}); // Object[]
	},

	onDndDrop: function(source, nodes, copy){
		// summary:
		//		Topic event processor for /dnd/drop, called to finish the DnD operation.
		// description:
		//		Updates data store items according to where node was dragged from and dropped
		//		to.   The tree will then respond to those data store updates and redraw itself.
		// source: Object
		//		The dijit.tree.dndSource / dojo.dnd.Source which is providing the items
		// nodes: DomNode[]
		//		The list of transferred items, dndTreeNode nodes if dragging from a Tree
		// copy: Boolean
		//		Copy items, if true, move items otherwise
		// tags:
		//		protected
		if(this.containerState == "Over"){
			var tree = this.tree,
				model = tree.model,
				target = this.targetAnchor;

			this.isDragging = false;

			// Compute the new parent item
			var newParentItem;
			var insertIndex;
			newParentItem = (target && target.item) || tree.item;
			if(this.dropPosition == "Before" || this.dropPosition == "After"){
				// TODO: if there is no parent item then disallow the drop.
				// Actually this should be checked during onMouseMove too, to make the drag icon red.
				newParentItem = (target.getParent() && target.getParent().item) || tree.item;
				// Compute the insert index for reordering
				insertIndex = target.getIndexInParent();
				if(this.dropPosition == "After"){
					insertIndex = target.getIndexInParent() + 1;
				}
			}else{
				newParentItem = (target && target.item) || tree.item;
			}

			// If necessary, use this variable to hold array of hashes to pass to model.newItem()
			// (one entry in the array for each dragged node).
			var newItemsParams;

			array.forEach(nodes, function(node, idx){
				// dojo.dnd.Item representing the thing being dropped.
				// Don't confuse the use of item here (meaning a DnD item) with the
				// uses below where item means dojo.data item.
				var sourceItem = source.getItem(node.id);

				// Information that's available if the source is another Tree
				// (possibly but not necessarily this tree, possibly but not
				// necessarily the same model as this Tree)
				if(array.indexOf(sourceItem.type, "treeNode") != -1){
					var childTreeNode = sourceItem.data,
						childItem = childTreeNode.item,
						oldParentItem = childTreeNode.getParent().item;
				}

				if(source == this){
					// This is a node from my own tree, and we are moving it, not copying.
					// Remove item from old parent's children attribute.
					// TODO: dijit.tree.dndSelector should implement deleteSelectedNodes()
					// and this code should go there.

					if(typeof insertIndex == "number"){
						if(newParentItem == oldParentItem && childTreeNode.getIndexInParent() < insertIndex){
							insertIndex -= 1;
						}
					}
					model.pasteItem(childItem, oldParentItem, newParentItem, copy, insertIndex);
				}else if(model.isItem(childItem)){
					// Item from same model
					// (maybe we should only do this branch if the source is a tree?)
					model.pasteItem(childItem, oldParentItem, newParentItem, copy, insertIndex);
				}else{
					// Get the hash to pass to model.newItem().  A single call to
					// itemCreator() returns an array of hashes, one for each drag source node.
					if(!newItemsParams){
						newItemsParams = this.itemCreator(nodes, target.rowNode, source);
					}

					// Create new item in the tree, based on the drag source.
					model.newItem(newItemsParams[idx], newParentItem, insertIndex);
				}
			}, this);

			// Expand the target node (if it's currently collapsed) so the user can see
			// where their node was dropped.   In particular since that node is still selected.
			this.tree._expandNode(target);
		}
		this.onDndCancel();
	},

	onDndCancel: function(){
		// summary:
		//		Topic event processor for /dnd/cancel, called to cancel the DnD operation
		// tags:
		//		private
		this._unmarkTargetAnchor();
		this.isDragging = false;
		this.mouseDown = false;
		delete this.mouseButton;
		this._changeState("Source", "");
		this._changeState("Target", "");
	},

	// When focus moves in/out of the entire Tree
	onOverEvent: function(){
		// summary:
		//		This method is called when mouse is moved over our container (like onmouseenter)
		// tags:
		//		private
		this.inherited(arguments);
		DNDManager.manager().overSource(this);
	},
	onOutEvent: function(){
		// summary:
		//		This method is called when mouse is moved out of our container (like onmouseleave)
		// tags:
		//		private
		this._unmarkTargetAnchor();
		var m = DNDManager.manager();
		if(this.isDragging){
			m.canDrop(false);
		}
		m.outSource(this);

		this.inherited(arguments);
	},

	_isParentChildDrop: function(source, targetRow){
		// summary:
		//		Checks whether the dragged items are parent rows in the tree which are being
		//		dragged into their own children.
		//
		// source:
		//		The DragSource object.
		//
		// targetRow:
		//		The tree row onto which the dragged nodes are being dropped.
		//
		// tags:
		//		private

		// If the dragged object is not coming from the tree this widget belongs to,
		// it cannot be invalid.
		if(!source.tree || source.tree != this.tree){
			return false;
		}


		var root = source.tree.domNode;
		var ids = source.selection;

		var node = targetRow.parentNode;

		// Iterate up the DOM hierarchy from the target drop row,
		// checking of any of the dragged nodes have the same ID.
		while(node != root && !ids[node.id]){
			node = node.parentNode;
		}

		return node.id && ids[node.id];
	},

	_unmarkTargetAnchor: function(){
		// summary:
		//		Removes hover class of the current target anchor
		// tags:
		//		private
		if(!this.targetAnchor){ return; }
		this._removeItemClass(this.targetAnchor.rowNode, this.dropPosition);
		this.targetAnchor = null;
		this.targetBox = null;
		this.dropPosition = null;
	},

	_markDndStatus: function(copy){
		// summary:
		//		Changes source's state based on "copy" status
		this._changeState("Source", copy ? "Copied" : "Moved");
	}
});

});

},
'dijit/tree/ForestStoreModel':function(){
define("dijit/tree/ForestStoreModel", [
	"dojo/_base/array", // array.indexOf array.some
	"dojo/_base/declare", // declare
	"dojo/_base/lang", // lang.hitch
	"dojo/_base/window", // win.global
	"./TreeStoreModel"
], function(array, declare, lang, win, TreeStoreModel){

/*=====
var TreeStoreModel = dijit.tree.TreeStoreModel;
=====*/

// module:
//		dijit/tree/ForestStoreModel
// summary:
//		Interface between a dijit.Tree and a dojo.data store that doesn't have a root item,
//		a.k.a. a store that has multiple "top level" items.

return declare("dijit.tree.ForestStoreModel", TreeStoreModel, {
	// summary:
	//		Interface between a dijit.Tree and a dojo.data store that doesn't have a root item,
	//		a.k.a. a store that has multiple "top level" items.
	//
	// description
	//		Use this class to wrap a dojo.data store, making all the items matching the specified query
	//		appear as children of a fabricated "root item".  If no query is specified then all the
	//		items returned by fetch() on the underlying store become children of the root item.
	//		This class allows dijit.Tree to assume a single root item, even if the store doesn't have one.
	//
	//		When using this class the developer must override a number of methods according to their app and
	//		data, including:
	//			- onNewRootItem
	//			- onAddToRoot
	//			- onLeaveRoot
	//			- onNewItem
	//			- onSetItem

	// Parameters to constructor

	// rootId: String
	//		ID of fabricated root item
	rootId: "$root$",

	// rootLabel: String
	//		Label of fabricated root item
	rootLabel: "ROOT",

	// query: String
	//		Specifies the set of children of the root item.
	// example:
	//	|	{type:'continent'}
	query: null,

	// End of parameters to constructor

	constructor: function(params){
		// summary:
		//		Sets up variables, etc.
		// tags:
		//		private

		// Make dummy root item
		this.root = {
			store: this,
			root: true,
			id: params.rootId,
			label: params.rootLabel,
			children: params.rootChildren	// optional param
		};
	},

	// =======================================================================
	// Methods for traversing hierarchy

	mayHaveChildren: function(/*dojo.data.Item*/ item){
		// summary:
		//		Tells if an item has or may have children.  Implementing logic here
		//		avoids showing +/- expando icon for nodes that we know don't have children.
		//		(For efficiency reasons we may not want to check if an element actually
		//		has children until user clicks the expando node)
		// tags:
		//		extension
		return item === this.root || this.inherited(arguments);
	},

	getChildren: function(/*dojo.data.Item*/ parentItem, /*function(items)*/ callback, /*function*/ onError){
		// summary:
		// 		Calls onComplete() with array of child items of given parent item, all loaded.
		if(parentItem === this.root){
			if(this.root.children){
				// already loaded, just return
				callback(this.root.children);
			}else{
				this.store.fetch({
					query: this.query,
					onComplete: lang.hitch(this, function(items){
						this.root.children = items;
						callback(items);
					}),
					onError: onError
				});
			}
		}else{
			this.inherited(arguments);
		}
	},

	// =======================================================================
	// Inspecting items

	isItem: function(/* anything */ something){
		return (something === this.root) ? true : this.inherited(arguments);
	},

	fetchItemByIdentity: function(/* object */ keywordArgs){
		if(keywordArgs.identity == this.root.id){
			var scope = keywordArgs.scope?keywordArgs.scope:win.global;
			if(keywordArgs.onItem){
				keywordArgs.onItem.call(scope, this.root);
			}
		}else{
			this.inherited(arguments);
		}
	},

	getIdentity: function(/* item */ item){
		return (item === this.root) ? this.root.id : this.inherited(arguments);
	},

	getLabel: function(/* item */ item){
		return	(item === this.root) ? this.root.label : this.inherited(arguments);
	},

	// =======================================================================
	// Write interface

	newItem: function(/* dojo.dnd.Item */ args, /*Item*/ parent, /*int?*/ insertIndex){
		// summary:
		//		Creates a new item.   See dojo.data.api.Write for details on args.
		//		Used in drag & drop when item from external source dropped onto tree.
		if(parent === this.root){
			this.onNewRootItem(args);
			return this.store.newItem(args);
		}else{
			return this.inherited(arguments);
		}
	},

	onNewRootItem: function(/* dojo.dnd.Item */ /*===== args =====*/){
		// summary:
		//		User can override this method to modify a new element that's being
		//		added to the root of the tree, for example to add a flag like root=true
	},

	pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem, /*Boolean*/ bCopy, /*int?*/ insertIndex){
		// summary:
		//		Move or copy an item from one parent item to another.
		//		Used in drag & drop
		if(oldParentItem === this.root){
			if(!bCopy){
				// It's onLeaveRoot()'s responsibility to modify the item so it no longer matches
				// this.query... thus triggering an onChildrenChange() event to notify the Tree
				// that this element is no longer a child of the root node
				this.onLeaveRoot(childItem);
			}
		}
		this.inherited(arguments, [childItem,
			oldParentItem === this.root ? null : oldParentItem,
			newParentItem === this.root ? null : newParentItem,
			bCopy,
			insertIndex
		]);
		if(newParentItem === this.root){
			// It's onAddToRoot()'s responsibility to modify the item so it matches
			// this.query... thus triggering an onChildrenChange() event to notify the Tree
			// that this element is now a child of the root node
			this.onAddToRoot(childItem);
		}
	},

	// =======================================================================
	// Handling for top level children

	onAddToRoot: function(/* item */ item){
		// summary:
		//		Called when item added to root of tree; user must override this method
		//		to modify the item so that it matches the query for top level items
		// example:
		//	|	store.setValue(item, "root", true);
		// tags:
		//		extension
		console.log(this, ": item ", item, " added to root");
	},

	onLeaveRoot: function(/* item */ item){
		// summary:
		//		Called when item removed from root of tree; user must override this method
		//		to modify the item so it doesn't match the query for top level items
		// example:
		// 	|	store.unsetAttribute(item, "root");
		// tags:
		//		extension
		console.log(this, ": item ", item, " removed from root");
	},

	// =======================================================================
	// Events from data store

	_requeryTop: function(){
		// reruns the query for the children of the root node,
		// sending out an onSet notification if those children have changed
		var oldChildren = this.root.children || [];
		this.store.fetch({
			query: this.query,
			onComplete: lang.hitch(this, function(newChildren){
				this.root.children = newChildren;

				// If the list of children or the order of children has changed...
				if(oldChildren.length != newChildren.length ||
					array.some(oldChildren, function(item, idx){ return newChildren[idx] != item;})){
					this.onChildrenChange(this.root, newChildren);
				}
			})
		});
	},

	onNewItem: function(/* dojo.data.Item */ item, /* Object */ parentInfo){
		// summary:
		//		Handler for when new items appear in the store.  Developers should override this
		//		method to be more efficient based on their app/data.
		// description:
		//		Note that the default implementation requeries the top level items every time
		//		a new item is created, since any new item could be a top level item (even in
		//		addition to being a child of another item, since items can have multiple parents).
		//
		//		If developers can detect which items are possible top level items (based on the item and the
		//		parentInfo parameters), they should override this method to only call _requeryTop() for top
		//		level items.  Often all top level items have parentInfo==null, but
		//		that will depend on which store you use and what your data is like.
		// tags:
		//		extension
		this._requeryTop();

		this.inherited(arguments);
	},

	onDeleteItem: function(/*Object*/ item){
		// summary:
		//		Handler for delete notifications from underlying store

		// check if this was a child of root, and if so send notification that root's children
		// have changed
		if(array.indexOf(this.root.children, item) != -1){
			this._requeryTop();
		}

		this.inherited(arguments);
	},

	onSetItem: function(/* item */ item,
					/* attribute-name-string */ attribute,
					/* object | array */ oldValue,
					/* object | array */ newValue){
		// summary:
		//		Updates the tree view according to changes to an item in the data store.
		//		Developers should override this method to be more efficient based on their app/data.
		// description:
		//		Handles updates to an item's children by calling onChildrenChange(), and
		//		other updates to an item by calling onChange().
		//
		//		Also, any change to any item re-executes the query for the tree's top-level items,
		//		since this modified item may have started/stopped matching the query for top level items.
		//
		//		If possible, developers should override this function to only call _requeryTop() when
		//		the change to the item has caused it to stop/start being a top level item in the tree.
		// tags:
		//		extension

		this._requeryTop();
		this.inherited(arguments);
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
'*noref':1}});
define("dijit/_dijit_tree", [], 1);
require(["dijit/Tree","dijit/tree/dndSource","dijit/tree/TreeStoreModel","dijit/tree/ForestStoreModel"]);

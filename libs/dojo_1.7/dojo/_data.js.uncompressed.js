require({cache:{
'dojo/data/util/simpleFetch':function(){
define("dojo/data/util/simpleFetch", ["../../_base/lang", "../../_base/window", "./sorter"],
  function(lang, winUtil, sorter) {
	// module:
	//		dojo/data/util/simpleFetch
	// summary:
	//		TODOC

var simpleFetch = lang.getObject("dojo.data.util.simpleFetch", true);

simpleFetch.fetch = function(/* Object? */ request){
	//	summary:
	//		The simpleFetch mixin is designed to serve as a set of function(s) that can
	//		be mixed into other datastore implementations to accelerate their development.
	//		The simpleFetch mixin should work well for any datastore that can respond to a _fetchItems()
	//		call by returning an array of all the found items that matched the query.  The simpleFetch mixin
	//		is not designed to work for datastores that respond to a fetch() call by incrementally
	//		loading items, or sequentially loading partial batches of the result
	//		set.  For datastores that mixin simpleFetch, simpleFetch
	//		implements a fetch method that automatically handles eight of the fetch()
	//		arguments -- onBegin, onItem, onComplete, onError, start, count, sort and scope
	//		The class mixing in simpleFetch should not implement fetch(),
	//		but should instead implement a _fetchItems() method.  The _fetchItems()
	//		method takes three arguments, the keywordArgs object that was passed
	//		to fetch(), a callback function to be called when the result array is
	//		available, and an error callback to be called if something goes wrong.
	//		The _fetchItems() method should ignore any keywordArgs parameters for
	//		start, count, onBegin, onItem, onComplete, onError, sort, and scope.
	//		The _fetchItems() method needs to correctly handle any other keywordArgs
	//		parameters, including the query parameter and any optional parameters
	//		(such as includeChildren).  The _fetchItems() method should create an array of
	//		result items and pass it to the fetchHandler along with the original request object
	//		-- or, the _fetchItems() method may, if it wants to, create an new request object
	//		with other specifics about the request that are specific to the datastore and pass
	//		that as the request object to the handler.
	//
	//		For more information on this specific function, see dojo.data.api.Read.fetch()
	request = request || {};
	if(!request.store){
		request.store = this;
	}
	var self = this;

	var _errorHandler = function(errorData, requestObject){
		if(requestObject.onError){
			var scope = requestObject.scope || winUtil.global;
			requestObject.onError.call(scope, errorData, requestObject);
		}
	};

	var _fetchHandler = function(items, requestObject){
		var oldAbortFunction = requestObject.abort || null;
		var aborted = false;

		var startIndex = requestObject.start?requestObject.start:0;
		var endIndex = (requestObject.count && (requestObject.count !== Infinity))?(startIndex + requestObject.count):items.length;

		requestObject.abort = function(){
			aborted = true;
			if(oldAbortFunction){
				oldAbortFunction.call(requestObject);
			}
		};

		var scope = requestObject.scope || winUtil.global;
		if(!requestObject.store){
			requestObject.store = self;
		}
		if(requestObject.onBegin){
			requestObject.onBegin.call(scope, items.length, requestObject);
		}
		if(requestObject.sort){
			items.sort(sorter.createSortFunction(requestObject.sort, self));
		}
		if(requestObject.onItem){
			for(var i = startIndex; (i < items.length) && (i < endIndex); ++i){
				var item = items[i];
				if(!aborted){
					requestObject.onItem.call(scope, item, requestObject);
				}
			}
		}
		if(requestObject.onComplete && !aborted){
			var subset = null;
			if(!requestObject.onItem){
				subset = items.slice(startIndex, endIndex);
			}
			requestObject.onComplete.call(scope, subset, requestObject);
		}
	};
	this._fetchItems(request, _fetchHandler, _errorHandler);
	return request;	// Object
};

return simpleFetch;
});

},
'dojo/data/ItemFileWriteStore':function(){
define("dojo/data/ItemFileWriteStore", ["../_base/lang", "../_base/declare", "../_base/array", "../_base/json", "../_base/window", 
	"./ItemFileReadStore", "../date/stamp"
], function(lang, declare, arrayUtil, jsonUtil, window, ItemFileReadStore, dateStamp) {
	// module:
	//		dojo/data/ItemFileWriteStore
	// summary:
	//		TODOC

/*===== var ItemFileReadStore = dojo.data.ItemFileReadStore; =====*/
return declare("dojo.data.ItemFileWriteStore", ItemFileReadStore, {
	constructor: function(/* object */ keywordParameters){
		//	keywordParameters: {typeMap: object)
		//		The structure of the typeMap object is as follows:
		//		{
		//			type0: function || object,
		//			type1: function || object,
		//			...
		//			typeN: function || object
		//		}
		//		Where if it is a function, it is assumed to be an object constructor that takes the
		//		value of _value as the initialization parameters.  It is serialized assuming object.toString()
		//		serialization.  If it is an object, then it is assumed
		//		to be an object of general form:
		//		{
		//			type: function, //constructor.
		//			deserialize:	function(value) //The function that parses the value and constructs the object defined by type appropriately.
		//			serialize:	function(object) //The function that converts the object back into the proper file format form.
		//		}

		// ItemFileWriteStore extends ItemFileReadStore to implement these additional dojo.data APIs
		this._features['dojo.data.api.Write'] = true;
		this._features['dojo.data.api.Notification'] = true;

		// For keeping track of changes so that we can implement isDirty and revert
		this._pending = {
			_newItems:{},
			_modifiedItems:{},
			_deletedItems:{}
		};

		if(!this._datatypeMap['Date'].serialize){
			this._datatypeMap['Date'].serialize = function(obj){
				return dateStamp.toISOString(obj, {zulu:true});
			};
		}
		//Disable only if explicitly set to false.
		if(keywordParameters && (keywordParameters.referenceIntegrity === false)){
			this.referenceIntegrity = false;
		}

		// this._saveInProgress is set to true, briefly, from when save() is first called to when it completes
		this._saveInProgress = false;
	},

	referenceIntegrity: true, //Flag that defaultly enabled reference integrity tracking.  This way it can also be disabled pogrammatially or declaratively.

	_assert: function(/* boolean */ condition){
		if(!condition){
			throw new Error("assertion failed in ItemFileWriteStore");
		}
	},

	_getIdentifierAttribute: function(){
		// this._assert((identifierAttribute === Number) || (dojo.isString(identifierAttribute)));
		return this.getFeatures()['dojo.data.api.Identity'];
	},


/* dojo.data.api.Write */

	newItem: function(/* Object? */ keywordArgs, /* Object? */ parentInfo){
		// summary: See dojo.data.api.Write.newItem()

		this._assert(!this._saveInProgress);

		if(!this._loadFinished){
			// We need to do this here so that we'll be able to find out what
			// identifierAttribute was specified in the data file.
			this._forceLoad();
		}

		if(typeof keywordArgs != "object" && typeof keywordArgs != "undefined"){
			throw new Error("newItem() was passed something other than an object");
		}
		var newIdentity = null;
		var identifierAttribute = this._getIdentifierAttribute();
		if(identifierAttribute === Number){
			newIdentity = this._arrayOfAllItems.length;
		}else{
			newIdentity = keywordArgs[identifierAttribute];
			if(typeof newIdentity === "undefined"){
				throw new Error("newItem() was not passed an identity for the new item");
			}
			if(lang.isArray(newIdentity)){
				throw new Error("newItem() was not passed an single-valued identity");
			}
		}

		// make sure this identity is not already in use by another item, if identifiers were
		// defined in the file.  Otherwise it would be the item count,
		// which should always be unique in this case.
		if(this._itemsByIdentity){
			this._assert(typeof this._itemsByIdentity[newIdentity] === "undefined");
		}
		this._assert(typeof this._pending._newItems[newIdentity] === "undefined");
		this._assert(typeof this._pending._deletedItems[newIdentity] === "undefined");

		var newItem = {};
		newItem[this._storeRefPropName] = this;
		newItem[this._itemNumPropName] = this._arrayOfAllItems.length;
		if(this._itemsByIdentity){
			this._itemsByIdentity[newIdentity] = newItem;
			//We have to set the identifier now, otherwise we can't look it
			//up at calls to setValueorValues in parentInfo handling.
			newItem[identifierAttribute] = [newIdentity];
		}
		this._arrayOfAllItems.push(newItem);

		//We need to construct some data for the onNew call too...
		var pInfo = null;

		// Now we need to check to see where we want to assign this thingm if any.
		if(parentInfo && parentInfo.parent && parentInfo.attribute){
			pInfo = {
				item: parentInfo.parent,
				attribute: parentInfo.attribute,
				oldValue: undefined
			};

			//See if it is multi-valued or not and handle appropriately
			//Generally, all attributes are multi-valued for this store
			//So, we only need to append if there are already values present.
			var values = this.getValues(parentInfo.parent, parentInfo.attribute);
			if(values && values.length > 0){
				var tempValues = values.slice(0, values.length);
				if(values.length === 1){
					pInfo.oldValue = values[0];
				}else{
					pInfo.oldValue = values.slice(0, values.length);
				}
				tempValues.push(newItem);
				this._setValueOrValues(parentInfo.parent, parentInfo.attribute, tempValues, false);
				pInfo.newValue = this.getValues(parentInfo.parent, parentInfo.attribute);
			}else{
				this._setValueOrValues(parentInfo.parent, parentInfo.attribute, newItem, false);
				pInfo.newValue = newItem;
			}
		}else{
			//Toplevel item, add to both top list as well as all list.
			newItem[this._rootItemPropName]=true;
			this._arrayOfTopLevelItems.push(newItem);
		}

		this._pending._newItems[newIdentity] = newItem;

		//Clone over the properties to the new item
		for(var key in keywordArgs){
			if(key === this._storeRefPropName || key === this._itemNumPropName){
				// Bummer, the user is trying to do something like
				// newItem({_S:"foo"}).  Unfortunately, our superclass,
				// ItemFileReadStore, is already using _S in each of our items
				// to hold private info.  To avoid a naming collision, we
				// need to move all our private info to some other property
				// of all the items/objects.  So, we need to iterate over all
				// the items and do something like:
				//    item.__S = item._S;
				//    item._S = undefined;
				// But first we have to make sure the new "__S" variable is
				// not in use, which means we have to iterate over all the
				// items checking for that.
				throw new Error("encountered bug in ItemFileWriteStore.newItem");
			}
			var value = keywordArgs[key];
			if(!lang.isArray(value)){
				value = [value];
			}
			newItem[key] = value;
			if(this.referenceIntegrity){
				for(var i = 0; i < value.length; i++){
					var val = value[i];
					if(this.isItem(val)){
						this._addReferenceToMap(val, newItem, key);
					}
				}
			}
		}
		this.onNew(newItem, pInfo); // dojo.data.api.Notification call
		return newItem; // item
	},

	_removeArrayElement: function(/* Array */ array, /* anything */ element){
		var index = arrayUtil.indexOf(array, element);
		if(index != -1){
			array.splice(index, 1);
			return true;
		}
		return false;
	},

	deleteItem: function(/* item */ item){
		// summary: See dojo.data.api.Write.deleteItem()
		this._assert(!this._saveInProgress);
		this._assertIsItem(item);

		// Remove this item from the _arrayOfAllItems, but leave a null value in place
		// of the item, so as not to change the length of the array, so that in newItem()
		// we can still safely do: newIdentity = this._arrayOfAllItems.length;
		var indexInArrayOfAllItems = item[this._itemNumPropName];
		var identity = this.getIdentity(item);

		//If we have reference integrity on, we need to do reference cleanup for the deleted item
		if(this.referenceIntegrity){
			//First scan all the attributes of this items for references and clean them up in the map
			//As this item is going away, no need to track its references anymore.

			//Get the attributes list before we generate the backup so it
			//doesn't pollute the attributes list.
			var attributes = this.getAttributes(item);

			//Backup the map, we'll have to restore it potentially, in a revert.
			if(item[this._reverseRefMap]){
				item["backup_" + this._reverseRefMap] = lang.clone(item[this._reverseRefMap]);
			}

			//TODO:  This causes a reversion problem.  This list won't be restored on revert since it is
			//attached to the 'value'. item, not ours.  Need to back tese up somehow too.
			//Maybe build a map of the backup of the entries and attach it to the deleted item to be restored
			//later.  Or just record them and call _addReferenceToMap on them in revert.
			arrayUtil.forEach(attributes, function(attribute){
				arrayUtil.forEach(this.getValues(item, attribute), function(value){
					if(this.isItem(value)){
						//We have to back up all the references we had to others so they can be restored on a revert.
						if(!item["backupRefs_" + this._reverseRefMap]){
							item["backupRefs_" + this._reverseRefMap] = [];
						}
						item["backupRefs_" + this._reverseRefMap].push({id: this.getIdentity(value), attr: attribute});
						this._removeReferenceFromMap(value, item, attribute);
					}
				}, this);
			}, this);

			//Next, see if we have references to this item, if we do, we have to clean them up too.
			var references = item[this._reverseRefMap];
			if(references){
				//Look through all the items noted as references to clean them up.
				for(var itemId in references){
					var containingItem = null;
					if(this._itemsByIdentity){
						containingItem = this._itemsByIdentity[itemId];
					}else{
						containingItem = this._arrayOfAllItems[itemId];
					}
					//We have a reference to a containing item, now we have to process the
					//attributes and clear all references to the item being deleted.
					if(containingItem){
						for(var attribute in references[itemId]){
							var oldValues = this.getValues(containingItem, attribute) || [];
							var newValues = arrayUtil.filter(oldValues, function(possibleItem){
								return !(this.isItem(possibleItem) && this.getIdentity(possibleItem) == identity);
							}, this);
							//Remove the note of the reference to the item and set the values on the modified attribute.
							this._removeReferenceFromMap(item, containingItem, attribute);
							if(newValues.length < oldValues.length){
								this._setValueOrValues(containingItem, attribute, newValues, true);
							}
						}
					}
				}
			}
		}

		this._arrayOfAllItems[indexInArrayOfAllItems] = null;

		item[this._storeRefPropName] = null;
		if(this._itemsByIdentity){
			delete this._itemsByIdentity[identity];
		}
		this._pending._deletedItems[identity] = item;

		//Remove from the toplevel items, if necessary...
		if(item[this._rootItemPropName]){
			this._removeArrayElement(this._arrayOfTopLevelItems, item);
		}
		this.onDelete(item); // dojo.data.api.Notification call
		return true;
	},

	setValue: function(/* item */ item, /* attribute-name-string */ attribute, /* almost anything */ value){
		// summary: See dojo.data.api.Write.set()
		return this._setValueOrValues(item, attribute, value, true); // boolean
	},

	setValues: function(/* item */ item, /* attribute-name-string */ attribute, /* array */ values){
		// summary: See dojo.data.api.Write.setValues()
		return this._setValueOrValues(item, attribute, values, true); // boolean
	},

	unsetAttribute: function(/* item */ item, /* attribute-name-string */ attribute){
		// summary: See dojo.data.api.Write.unsetAttribute()
		return this._setValueOrValues(item, attribute, [], true);
	},

	_setValueOrValues: function(/* item */ item, /* attribute-name-string */ attribute, /* anything */ newValueOrValues, /*boolean?*/ callOnSet){
		this._assert(!this._saveInProgress);

		// Check for valid arguments
		this._assertIsItem(item);
		this._assert(lang.isString(attribute));
		this._assert(typeof newValueOrValues !== "undefined");

		// Make sure the user isn't trying to change the item's identity
		var identifierAttribute = this._getIdentifierAttribute();
		if(attribute == identifierAttribute){
			throw new Error("ItemFileWriteStore does not have support for changing the value of an item's identifier.");
		}

		// To implement the Notification API, we need to make a note of what
		// the old attribute value was, so that we can pass that info when
		// we call the onSet method.
		var oldValueOrValues = this._getValueOrValues(item, attribute);

		var identity = this.getIdentity(item);
		if(!this._pending._modifiedItems[identity]){
			// Before we actually change the item, we make a copy of it to
			// record the original state, so that we'll be able to revert if
			// the revert method gets called.  If the item has already been
			// modified then there's no need to do this now, since we already
			// have a record of the original state.
			var copyOfItemState = {};
			for(var key in item){
				if((key === this._storeRefPropName) || (key === this._itemNumPropName) || (key === this._rootItemPropName)){
					copyOfItemState[key] = item[key];
				}else if(key === this._reverseRefMap){
					copyOfItemState[key] = lang.clone(item[key]);
				}else{
					copyOfItemState[key] = item[key].slice(0, item[key].length);
				}
			}
			// Now mark the item as dirty, and save the copy of the original state
			this._pending._modifiedItems[identity] = copyOfItemState;
		}

		// Okay, now we can actually change this attribute on the item
		var success = false;

		if(lang.isArray(newValueOrValues) && newValueOrValues.length === 0){

			// If we were passed an empty array as the value, that counts
			// as "unsetting" the attribute, so we need to remove this
			// attribute from the item.
			success = delete item[attribute];
			newValueOrValues = undefined; // used in the onSet Notification call below

			if(this.referenceIntegrity && oldValueOrValues){
				var oldValues = oldValueOrValues;
				if(!lang.isArray(oldValues)){
					oldValues = [oldValues];
				}
				for(var i = 0; i < oldValues.length; i++){
					var value = oldValues[i];
					if(this.isItem(value)){
						this._removeReferenceFromMap(value, item, attribute);
					}
				}
			}
		}else{
			var newValueArray;
			if(lang.isArray(newValueOrValues)){
				// Unfortunately, it's not safe to just do this:
				//    newValueArray = newValueOrValues;
				// Instead, we need to copy the array, which slice() does very nicely.
				// This is so that our internal data structure won't
				// get corrupted if the user mucks with the values array *after*
				// calling setValues().
				newValueArray = newValueOrValues.slice(0, newValueOrValues.length);
			}else{
				newValueArray = [newValueOrValues];
			}

			//We need to handle reference integrity if this is on.
			//In the case of set, we need to see if references were added or removed
			//and update the reference tracking map accordingly.
			if(this.referenceIntegrity){
				if(oldValueOrValues){
					var oldValues = oldValueOrValues;
					if(!lang.isArray(oldValues)){
						oldValues = [oldValues];
					}
					//Use an associative map to determine what was added/removed from the list.
					//Should be O(n) performant.  First look at all the old values and make a list of them
					//Then for any item not in the old list, we add it.  If it was already present, we remove it.
					//Then we pass over the map and any references left it it need to be removed (IE, no match in
					//the new values list).
					var map = {};
					arrayUtil.forEach(oldValues, function(possibleItem){
						if(this.isItem(possibleItem)){
							var id = this.getIdentity(possibleItem);
							map[id.toString()] = true;
						}
					}, this);
					arrayUtil.forEach(newValueArray, function(possibleItem){
						if(this.isItem(possibleItem)){
							var id = this.getIdentity(possibleItem);
							if(map[id.toString()]){
								delete map[id.toString()];
							}else{
								this._addReferenceToMap(possibleItem, item, attribute);
							}
						}
					}, this);
					for(var rId in map){
						var removedItem;
						if(this._itemsByIdentity){
							removedItem = this._itemsByIdentity[rId];
						}else{
							removedItem = this._arrayOfAllItems[rId];
						}
						this._removeReferenceFromMap(removedItem, item, attribute);
					}
				}else{
					//Everything is new (no old values) so we have to just
					//insert all the references, if any.
					for(var i = 0; i < newValueArray.length; i++){
						var value = newValueArray[i];
						if(this.isItem(value)){
							this._addReferenceToMap(value, item, attribute);
						}
					}
				}
			}
			item[attribute] = newValueArray;
			success = true;
		}

		// Now we make the dojo.data.api.Notification call
		if(callOnSet){
			this.onSet(item, attribute, oldValueOrValues, newValueOrValues);
		}
		return success; // boolean
	},

	_addReferenceToMap: function(/* item */ refItem, /* item */ parentItem, /* string */ attribute){
		//	summary:
		//		Method to add an reference map entry for an item and attribute.
		//	description:
		//		Method to add an reference map entry for an item and attribute. 		 //
		//	refItem:
		//		The item that is referenced.
		//	parentItem:
		//		The item that holds the new reference to refItem.
		//	attribute:
		//		The attribute on parentItem that contains the new reference.

		var parentId = this.getIdentity(parentItem);
		var references = refItem[this._reverseRefMap];

		if(!references){
			references = refItem[this._reverseRefMap] = {};
		}
		var itemRef = references[parentId];
		if(!itemRef){
			itemRef = references[parentId] = {};
		}
		itemRef[attribute] = true;
	},

	_removeReferenceFromMap: function(/* item */ refItem, /* item */ parentItem, /* string */ attribute){
		//	summary:
		//		Method to remove an reference map entry for an item and attribute.
		//	description:
		//		Method to remove an reference map entry for an item and attribute.  This will
		//		also perform cleanup on the map such that if there are no more references at all to
		//		the item, its reference object and entry are removed.
		//
		//	refItem:
		//		The item that is referenced.
		//	parentItem:
		//		The item holding a reference to refItem.
		//	attribute:
		//		The attribute on parentItem that contains the reference.
		var identity = this.getIdentity(parentItem);
		var references = refItem[this._reverseRefMap];
		var itemId;
		if(references){
			for(itemId in references){
				if(itemId == identity){
					delete references[itemId][attribute];
					if(this._isEmpty(references[itemId])){
						delete references[itemId];
					}
				}
			}
			if(this._isEmpty(references)){
				delete refItem[this._reverseRefMap];
			}
		}
	},

	_dumpReferenceMap: function(){
		//	summary:
		//		Function to dump the reverse reference map of all items in the store for debug purposes.
		//	description:
		//		Function to dump the reverse reference map of all items in the store for debug purposes.
		var i;
		for(i = 0; i < this._arrayOfAllItems.length; i++){
			var item = this._arrayOfAllItems[i];
			if(item && item[this._reverseRefMap]){
				console.log("Item: [" + this.getIdentity(item) + "] is referenced by: " + jsonUtil.toJson(item[this._reverseRefMap]));
			}
		}
	},

	_getValueOrValues: function(/* item */ item, /* attribute-name-string */ attribute){
		var valueOrValues = undefined;
		if(this.hasAttribute(item, attribute)){
			var valueArray = this.getValues(item, attribute);
			if(valueArray.length == 1){
				valueOrValues = valueArray[0];
			}else{
				valueOrValues = valueArray;
			}
		}
		return valueOrValues;
	},

	_flatten: function(/* anything */ value){
		if(this.isItem(value)){
			// Given an item, return an serializable object that provides a
			// reference to the item.
			// For example, given kermit:
			//    var kermit = store.newItem({id:2, name:"Kermit"});
			// we want to return
			//    {_reference:2}
			return {_reference: this.getIdentity(value)};
		}else{
			if(typeof value === "object"){
				for(var type in this._datatypeMap){
					var typeMap = this._datatypeMap[type];
					if(lang.isObject(typeMap) && !lang.isFunction(typeMap)){
						if(value instanceof typeMap.type){
							if(!typeMap.serialize){
								throw new Error("ItemFileWriteStore:  No serializer defined for type mapping: [" + type + "]");
							}
							return {_type: type, _value: typeMap.serialize(value)};
						}
					} else if(value instanceof typeMap){
						//SImple mapping, therefore, return as a toString serialization.
						return {_type: type, _value: value.toString()};
					}
				}
			}
			return value;
		}
	},

	_getNewFileContentString: function(){
		// summary:
		//		Generate a string that can be saved to a file.
		//		The result should look similar to:
		//		http://trac.dojotoolkit.org/browser/dojo/trunk/tests/data/countries.json
		var serializableStructure = {};

		var identifierAttribute = this._getIdentifierAttribute();
		if(identifierAttribute !== Number){
			serializableStructure.identifier = identifierAttribute;
		}
		if(this._labelAttr){
			serializableStructure.label = this._labelAttr;
		}
		serializableStructure.items = [];
		for(var i = 0; i < this._arrayOfAllItems.length; ++i){
			var item = this._arrayOfAllItems[i];
			if(item !== null){
				var serializableItem = {};
				for(var key in item){
					if(key !== this._storeRefPropName && key !== this._itemNumPropName && key !== this._reverseRefMap && key !== this._rootItemPropName){
						var valueArray = this.getValues(item, key);
						if(valueArray.length == 1){
							serializableItem[key] = this._flatten(valueArray[0]);
						}else{
							var serializableArray = [];
							for(var j = 0; j < valueArray.length; ++j){
								serializableArray.push(this._flatten(valueArray[j]));
								serializableItem[key] = serializableArray;
							}
						}
					}
				}
				serializableStructure.items.push(serializableItem);
			}
		}
		var prettyPrint = true;
		return jsonUtil.toJson(serializableStructure, prettyPrint);
	},

	_isEmpty: function(something){
		//	summary:
		//		Function to determine if an array or object has no properties or values.
		//	something:
		//		The array or object to examine.
		var empty = true;
		if(lang.isObject(something)){
			var i;
			for(i in something){
				empty = false;
				break;
			}
		}else if(lang.isArray(something)){
			if(something.length > 0){
				empty = false;
			}
		}
		return empty; //boolean
	},

	save: function(/* object */ keywordArgs){
		// summary: See dojo.data.api.Write.save()
		this._assert(!this._saveInProgress);

		// this._saveInProgress is set to true, briefly, from when save is first called to when it completes
		this._saveInProgress = true;

		var self = this;
		var saveCompleteCallback = function(){
			self._pending = {
				_newItems:{},
				_modifiedItems:{},
				_deletedItems:{}
			};

			self._saveInProgress = false; // must come after this._pending is cleared, but before any callbacks
			if(keywordArgs && keywordArgs.onComplete){
				var scope = keywordArgs.scope || window.global;
				keywordArgs.onComplete.call(scope);
			}
		};
		var saveFailedCallback = function(err){
			self._saveInProgress = false;
			if(keywordArgs && keywordArgs.onError){
				var scope = keywordArgs.scope || window.global;
				keywordArgs.onError.call(scope, err);
			}
		};

		if(this._saveEverything){
			var newFileContentString = this._getNewFileContentString();
			this._saveEverything(saveCompleteCallback, saveFailedCallback, newFileContentString);
		}
		if(this._saveCustom){
			this._saveCustom(saveCompleteCallback, saveFailedCallback);
		}
		if(!this._saveEverything && !this._saveCustom){
			// Looks like there is no user-defined save-handler function.
			// That's fine, it just means the datastore is acting as a "mock-write"
			// store -- changes get saved in memory but don't get saved to disk.
			saveCompleteCallback();
		}
	},

	revert: function(){
		// summary: See dojo.data.api.Write.revert()
		this._assert(!this._saveInProgress);

		var identity;
		for(identity in this._pending._modifiedItems){
			// find the original item and the modified item that replaced it
			var copyOfItemState = this._pending._modifiedItems[identity];
			var modifiedItem = null;
			if(this._itemsByIdentity){
				modifiedItem = this._itemsByIdentity[identity];
			}else{
				modifiedItem = this._arrayOfAllItems[identity];
			}

			// Restore the original item into a full-fledged item again, we want to try to
			// keep the same object instance as if we don't it, causes bugs like #9022.
			copyOfItemState[this._storeRefPropName] = this;
			for(var key in modifiedItem){
				delete modifiedItem[key];
			}
			lang.mixin(modifiedItem, copyOfItemState);
		}
		var deletedItem;
		for(identity in this._pending._deletedItems){
			deletedItem = this._pending._deletedItems[identity];
			deletedItem[this._storeRefPropName] = this;
			var index = deletedItem[this._itemNumPropName];

			//Restore the reverse refererence map, if any.
			if(deletedItem["backup_" + this._reverseRefMap]){
				deletedItem[this._reverseRefMap] = deletedItem["backup_" + this._reverseRefMap];
				delete deletedItem["backup_" + this._reverseRefMap];
			}
			this._arrayOfAllItems[index] = deletedItem;
			if(this._itemsByIdentity){
				this._itemsByIdentity[identity] = deletedItem;
			}
			if(deletedItem[this._rootItemPropName]){
				this._arrayOfTopLevelItems.push(deletedItem);
			}
		}
		//We have to pass through it again and restore the reference maps after all the
		//undeletes have occurred.
		for(identity in this._pending._deletedItems){
			deletedItem = this._pending._deletedItems[identity];
			if(deletedItem["backupRefs_" + this._reverseRefMap]){
				arrayUtil.forEach(deletedItem["backupRefs_" + this._reverseRefMap], function(reference){
					var refItem;
					if(this._itemsByIdentity){
						refItem = this._itemsByIdentity[reference.id];
					}else{
						refItem = this._arrayOfAllItems[reference.id];
					}
					this._addReferenceToMap(refItem, deletedItem, reference.attr);
				}, this);
				delete deletedItem["backupRefs_" + this._reverseRefMap];
			}
		}

		for(identity in this._pending._newItems){
			var newItem = this._pending._newItems[identity];
			newItem[this._storeRefPropName] = null;
			// null out the new item, but don't change the array index so
			// so we can keep using _arrayOfAllItems.length.
			this._arrayOfAllItems[newItem[this._itemNumPropName]] = null;
			if(newItem[this._rootItemPropName]){
				this._removeArrayElement(this._arrayOfTopLevelItems, newItem);
			}
			if(this._itemsByIdentity){
				delete this._itemsByIdentity[identity];
			}
		}

		this._pending = {
			_newItems:{},
			_modifiedItems:{},
			_deletedItems:{}
		};
		return true; // boolean
	},

	isDirty: function(/* item? */ item){
		// summary: See dojo.data.api.Write.isDirty()
		if(item){
			// return true if the item is dirty
			var identity = this.getIdentity(item);
			return new Boolean(this._pending._newItems[identity] ||
				this._pending._modifiedItems[identity] ||
				this._pending._deletedItems[identity]).valueOf(); // boolean
		}else{
			// return true if the store is dirty -- which means return true
			// if there are any new items, dirty items, or modified items
			return !this._isEmpty(this._pending._newItems) ||
				!this._isEmpty(this._pending._modifiedItems) ||
				!this._isEmpty(this._pending._deletedItems); // boolean
		}
	},

/* dojo.data.api.Notification */

	onSet: function(/* item */ item,
					/*attribute-name-string*/ attribute,
					/*object|array*/ oldValue,
					/*object|array*/ newValue){
		// summary: See dojo.data.api.Notification.onSet()

		// No need to do anything. This method is here just so that the
		// client code can connect observers to it.
	},

	onNew: function(/* item */ newItem, /*object?*/ parentInfo){
		// summary: See dojo.data.api.Notification.onNew()

		// No need to do anything. This method is here just so that the
		// client code can connect observers to it.
	},

	onDelete: function(/* item */ deletedItem){
		// summary: See dojo.data.api.Notification.onDelete()

		// No need to do anything. This method is here just so that the
		// client code can connect observers to it.
	},

	close: function(/* object? */ request){
		 // summary:
		 //		Over-ride of base close function of ItemFileReadStore to add in check for store state.
		 // description:
		 //		Over-ride of base close function of ItemFileReadStore to add in check for store state.
		 //		If the store is still dirty (unsaved changes), then an error will be thrown instead of
		 //		clearing the internal state for reload from the url.

		 //Clear if not dirty ... or throw an error
		 if(this.clearOnClose){
			 if(!this.isDirty()){
				 this.inherited(arguments);
			 }else{
				 //Only throw an error if the store was dirty and we were loading from a url (cannot reload from url until state is saved).
				 throw new Error("dojo.data.ItemFileWriteStore: There are unsaved changes present in the store.  Please save or revert the changes before invoking close.");
			 }
		 }
	}
});

});

},
'dojo/data/util/sorter':function(){
define("dojo/data/util/sorter", ["../../_base/lang"], function(lang) {
	// module:
	//		dojo/data/util/sorter
	// summary:
	//		TODOC

var sorter = lang.getObject("dojo.data.util.sorter", true);

sorter.basicComparator = function(	/*anything*/ a,
													/*anything*/ b){
	//	summary:
	//		Basic comparision function that compares if an item is greater or less than another item
	//	description:
	//		returns 1 if a > b, -1 if a < b, 0 if equal.
	//		'null' values (null, undefined) are treated as larger values so that they're pushed to the end of the list.
	//		And compared to each other, null is equivalent to undefined.

	//null is a problematic compare, so if null, we set to undefined.
	//Makes the check logic simple, compact, and consistent
	//And (null == undefined) === true, so the check later against null
	//works for undefined and is less bytes.
	var r = -1;
	if(a === null){
		a = undefined;
	}
	if(b === null){
		b = undefined;
	}
	if(a == b){
		r = 0;
	}else if(a > b || a == null){
		r = 1;
	}
	return r; //int {-1,0,1}
};

sorter.createSortFunction = function(	/* attributes array */sortSpec, /*dojo.data.core.Read*/ store){
	//	summary:
	//		Helper function to generate the sorting function based off the list of sort attributes.
	//	description:
	//		The sort function creation will look for a property on the store called 'comparatorMap'.  If it exists
	//		it will look in the mapping for comparisons function for the attributes.  If one is found, it will
	//		use it instead of the basic comparator, which is typically used for strings, ints, booleans, and dates.
	//		Returns the sorting function for this particular list of attributes and sorting directions.
	//
	//	sortSpec: array
	//		A JS object that array that defines out what attribute names to sort on and whether it should be descenting or asending.
	//		The objects should be formatted as follows:
	//		{
	//			attribute: "attributeName-string" || attribute,
	//			descending: true|false;   // Default is false.
	//		}
	//	store: object
	//		The datastore object to look up item values from.
	//
	var sortFunctions=[];

	function createSortFunction(attr, dir, comp, s){
		//Passing in comp and s (comparator and store), makes this
		//function much faster.
		return function(itemA, itemB){
			var a = s.getValue(itemA, attr);
			var b = s.getValue(itemB, attr);
			return dir * comp(a,b); //int
		};
	}
	var sortAttribute;
	var map = store.comparatorMap;
	var bc = sorter.basicComparator;
	for(var i = 0; i < sortSpec.length; i++){
		sortAttribute = sortSpec[i];
		var attr = sortAttribute.attribute;
		if(attr){
			var dir = (sortAttribute.descending) ? -1 : 1;
			var comp = bc;
			if(map){
				if(typeof attr !== "string" && ("toString" in attr)){
					 attr = attr.toString();
				}
				comp = map[attr] || bc;
			}
			sortFunctions.push(createSortFunction(attr,
				dir, comp, store));
		}
	}
	return function(rowA, rowB){
		var i=0;
		while(i < sortFunctions.length){
			var ret = sortFunctions[i++](rowA, rowB);
			if(ret !== 0){
				return ret;//int
			}
		}
		return 0; //int
	}; // Function
};

return sorter;
});

},
'dojo/data/util/filter':function(){
define("dojo/data/util/filter", ["../../_base/lang"], function(lang) {
	// module:
	//		dojo/data/util/filter
	// summary:
	//		TODOC

var filter = lang.getObject("dojo.data.util.filter", true);

filter.patternToRegExp = function(/*String*/pattern, /*boolean?*/ ignoreCase){
	//	summary:
	//		Helper function to convert a simple pattern to a regular expression for matching.
	//	description:
	//		Returns a regular expression object that conforms to the defined conversion rules.
	//		For example:
	//			ca*   -> /^ca.*$/
	//			*ca*  -> /^.*ca.*$/
	//			*c\*a*  -> /^.*c\*a.*$/
	//			*c\*a?*  -> /^.*c\*a..*$/
	//			and so on.
	//
	//	pattern: string
	//		A simple matching pattern to convert that follows basic rules:
	//			* Means match anything, so ca* means match anything starting with ca
	//			? Means match single character.  So, b?b will match to bob and bab, and so on.
	//      	\ is an escape character.  So for example, \* means do not treat * as a match, but literal character *.
	//				To use a \ as a character in the string, it must be escaped.  So in the pattern it should be
	//				represented by \\ to be treated as an ordinary \ character instead of an escape.
	//
	//	ignoreCase:
	//		An optional flag to indicate if the pattern matching should be treated as case-sensitive or not when comparing
	//		By default, it is assumed case sensitive.

	var rxp = "^";
	var c = null;
	for(var i = 0; i < pattern.length; i++){
		c = pattern.charAt(i);
		switch(c){
			case '\\':
				rxp += c;
				i++;
				rxp += pattern.charAt(i);
				break;
			case '*':
				rxp += ".*"; break;
			case '?':
				rxp += "."; break;
			case '$':
			case '^':
			case '/':
			case '+':
			case '.':
			case '|':
			case '(':
			case ')':
			case '{':
			case '}':
			case '[':
			case ']':
				rxp += "\\"; //fallthrough
			default:
				rxp += c;
		}
	}
	rxp += "$";
	if(ignoreCase){
		return new RegExp(rxp,"mi"); //RegExp
	}else{
		return new RegExp(rxp,"m"); //RegExp
	}

};

return filter;
});

},
'dojo/data/ItemFileReadStore':function(){
define("dojo/data/ItemFileReadStore", ["../_base/kernel", "../_base/lang", "../_base/declare", "../_base/array", "../_base/xhr", 
	"../Evented", "../_base/window", "./util/filter", "./util/simpleFetch", "../date/stamp"
], function(kernel, lang, declare, array, xhr, Evented, window, filterUtil, simpleFetch, dateStamp) {
	// module:
	//		dojo/data/ItemFileReadStore
	// summary:
	//		TODOC


var ItemFileReadStore = declare("dojo.data.ItemFileReadStore", [Evented],{
	//	summary:
	//		The ItemFileReadStore implements the dojo.data.api.Read API and reads
	//		data from JSON files that have contents in this format --
	//		{ items: [
	//			{ name:'Kermit', color:'green', age:12, friends:['Gonzo', {_reference:{name:'Fozzie Bear'}}]},
	//			{ name:'Fozzie Bear', wears:['hat', 'tie']},
	//			{ name:'Miss Piggy', pets:'Foo-Foo'}
	//		]}
	//		Note that it can also contain an 'identifer' property that specified which attribute on the items
	//		in the array of items that acts as the unique identifier for that item.
	//
	constructor: function(/* Object */ keywordParameters){
		//	summary: constructor
		//	keywordParameters: {url: String}
		//	keywordParameters: {data: jsonObject}
		//	keywordParameters: {typeMap: object)
		//		The structure of the typeMap object is as follows:
		//		{
		//			type0: function || object,
		//			type1: function || object,
		//			...
		//			typeN: function || object
		//		}
		//		Where if it is a function, it is assumed to be an object constructor that takes the
		//		value of _value as the initialization parameters.  If it is an object, then it is assumed
		//		to be an object of general form:
		//		{
		//			type: function, //constructor.
		//			deserialize:	function(value) //The function that parses the value and constructs the object defined by type appropriately.
		//		}

		this._arrayOfAllItems = [];
		this._arrayOfTopLevelItems = [];
		this._loadFinished = false;
		this._jsonFileUrl = keywordParameters.url;
		this._ccUrl = keywordParameters.url;
		this.url = keywordParameters.url;
		this._jsonData = keywordParameters.data;
		this.data = null;
		this._datatypeMap = keywordParameters.typeMap || {};
		if(!this._datatypeMap['Date']){
			//If no default mapping for dates, then set this as default.
			//We use the dojo.date.stamp here because the ISO format is the 'dojo way'
			//of generically representing dates.
			this._datatypeMap['Date'] = {
											type: Date,
											deserialize: function(value){
												return dateStamp.fromISOString(value);
											}
										};
		}
		this._features = {'dojo.data.api.Read':true, 'dojo.data.api.Identity':true};
		this._itemsByIdentity = null;
		this._storeRefPropName = "_S"; // Default name for the store reference to attach to every item.
		this._itemNumPropName = "_0"; // Default Item Id for isItem to attach to every item.
		this._rootItemPropName = "_RI"; // Default Item Id for isItem to attach to every item.
		this._reverseRefMap = "_RRM"; // Default attribute for constructing a reverse reference map for use with reference integrity
		this._loadInProgress = false; //Got to track the initial load to prevent duelling loads of the dataset.
		this._queuedFetches = [];
		if(keywordParameters.urlPreventCache !== undefined){
			this.urlPreventCache = keywordParameters.urlPreventCache?true:false;
		}
		if(keywordParameters.hierarchical !== undefined){
			this.hierarchical = keywordParameters.hierarchical?true:false;
		}
		if(keywordParameters.clearOnClose){
			this.clearOnClose = true;
		}
		if("failOk" in keywordParameters){
			this.failOk = keywordParameters.failOk?true:false;
		}
	},

	url: "",	// use "" rather than undefined for the benefit of the parser (#3539)

	//Internal var, crossCheckUrl.  Used so that setting either url or _jsonFileUrl, can still trigger a reload
	//when clearOnClose and close is used.
	_ccUrl: "",

	data: null,	// define this so that the parser can populate it

	typeMap: null, //Define so parser can populate.

	//Parameter to allow users to specify if a close call should force a reload or not.
	//By default, it retains the old behavior of not clearing if close is called.  But
	//if set true, the store will be reset to default state.  Note that by doing this,
	//all item handles will become invalid and a new fetch must be issued.
	clearOnClose: false,

	//Parameter to allow specifying if preventCache should be passed to the xhrGet call or not when loading data from a url.
	//Note this does not mean the store calls the server on each fetch, only that the data load has preventCache set as an option.
	//Added for tracker: #6072
	urlPreventCache: false,

	//Parameter for specifying that it is OK for the xhrGet call to fail silently.
	failOk: false,

	//Parameter to indicate to process data from the url as hierarchical
	//(data items can contain other data items in js form).  Default is true
	//for backwards compatibility.  False means only root items are processed
	//as items, all child objects outside of type-mapped objects and those in
	//specific reference format, are left straight JS data objects.
	hierarchical: true,

	_assertIsItem: function(/* item */ item){
		//	summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojo.data.ItemFileReadStore: Invalid item argument.");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojo.data.ItemFileReadStore: Invalid attribute argument.");
		}
	},

	getValue: function(	/* item */ item,
						/* attribute-name-string */ attribute,
						/* value? */ defaultValue){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		return (values.length > 0)?values[0]:defaultValue; // mixed
	},

	getValues: function(/* item */ item,
						/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.getValues()

		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		// Clone it before returning.  refs: #10474
		return (item[attribute] || []).slice(0); // Array
	},

	getAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		for(var key in item){
			// Save off only the real item attributes, not the special id marks for O(1) isItem.
			if((key !== this._storeRefPropName) && (key !== this._itemNumPropName) && (key !== this._rootItemPropName) && (key !== this._reverseRefMap)){
				attributes.push(key);
			}
		}
		return attributes; // Array
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttribute()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		return (attribute in item);
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		//	summary:
		//		See dojo.data.api.Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = filterUtil.patternToRegExp(value, false);
		}
		return this._containsValue(item, attribute, value, regexp); //boolean.
	},

	_containsValue: function(	/* item */ item,
								/* attribute-name-string */ attribute,
								/* anything */ value,
								/* RegExp?*/ regexp){
		//	summary:
		//		Internal function for looking at the values contained by the item.
		//	description:
		//		Internal function for looking at the values contained by the item.  This
		//		function allows for denoting if the comparison should be case sensitive for
		//		strings or not (for handling filtering cases where string case should not matter)
		//
		//	item:
		//		The data item to examine for attribute values.
		//	attribute:
		//		The attribute to inspect.
		//	value:
		//		The value to match.
		//	regexp:
		//		Optional regular expression generated off value if value was of string type to handle wildcarding.
		//		If present and attribute values are string, then it can be used for comparison instead of 'value'
		return array.some(this.getValues(item, attribute), function(possibleValue){
			if(possibleValue !== null && !lang.isObject(possibleValue) && regexp){
				if(possibleValue.toString().match(regexp)){
					return true; // Boolean
				}
			}else if(value === possibleValue){
				return true; // Boolean
			}
		});
	},

	isItem: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		if(something && something[this._storeRefPropName] === this){
			if(this._arrayOfAllItems[something[this._itemNumPropName]] === something){
				return true;
			}
		}
		return false; // Boolean
	},

	isItemLoaded: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItemLoaded()
		return this.isItem(something); //boolean
	},

	loadItem: function(/* object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Read.loadItem()
		this._assertIsItem(keywordArgs.item);
	},

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return this._features; //Object
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		if(this._labelAttr && this.isItem(item)){
			return this.getValue(item,this._labelAttr); //String
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		if(this._labelAttr){
			return [this._labelAttr]; //array
		}
		return null; //null
	},

	_fetchItems: function(	/* Object */ keywordArgs,
							/* Function */ findCallback,
							/* Function */ errorCallback){
		//	summary:
		//		See dojo.data.util.simpleFetch.fetch()
		var self = this,
		    filter = function(requestArgs, arrayOfItems){
			var items = [],
			    i, key;
			if(requestArgs.query){
				var value,
				    ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(key in requestArgs.query){
					value = requestArgs.query[key];
					if(typeof value === "string"){
						regexpList[key] = filterUtil.patternToRegExp(value, ignoreCase);
					}else if(value instanceof RegExp){
						regexpList[key] = value;
					}
				}
				for(i = 0; i < arrayOfItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfItems[i];
					if(candidateItem === null){
						match = false;
					}else{
						for(key in requestArgs.query){
							value = requestArgs.query[key];
							if(!self._containsValue(candidateItem, key, value, regexpList[key])){
								match = false;
							}
						}
					}
					if(match){
						items.push(candidateItem);
					}
				}
				findCallback(items, requestArgs);
			}else{
				// We want a copy to pass back in case the parent wishes to sort the array.
				// We shouldn't allow resort of the internal list, so that multiple callers
				// can get lists and sort without affecting each other.  We also need to
				// filter out any null values that have been left as a result of deleteItem()
				// calls in ItemFileWriteStore.
				for(i = 0; i < arrayOfItems.length; ++i){
					var item = arrayOfItems[i];
					if(item !== null){
						items.push(item);
					}
				}
				findCallback(items, requestArgs);
			}
		};

		if(this._loadFinished){
			filter(keywordArgs, this._getItemsArray(keywordArgs.queryOptions));
		}else{
			//Do a check on the JsonFileUrl and crosscheck it.
			//If it doesn't match the cross-check, it needs to be updated
			//This allows for either url or _jsonFileUrl to he changed to
			//reset the store load location.  Done this way for backwards
			//compatibility.  People use _jsonFileUrl (even though officially
			//private.
			if(this._jsonFileUrl !== this._ccUrl){
				kernel.deprecated("dojo.data.ItemFileReadStore: ",
					"To change the url, set the url property of the store," +
					" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
				this._ccUrl = this._jsonFileUrl;
				this.url = this._jsonFileUrl;
			}else if(this.url !== this._ccUrl){
				this._jsonFileUrl = this.url;
				this._ccUrl = this.url;
			}

			//See if there was any forced reset of data.
			if(this.data != null){
				this._jsonData = this.data;
				this.data = null;
			}

			if(this._jsonFileUrl){
				//If fetches come in before the loading has finished, but while
				//a load is in progress, we have to defer the fetching to be
				//invoked in the callback.
				if(this._loadInProgress){
					this._queuedFetches.push({args: keywordArgs, filter: filter});
				}else{
					this._loadInProgress = true;
					var getArgs = {
							url: self._jsonFileUrl,
							handleAs: "json-comment-optional",
							preventCache: this.urlPreventCache,
							failOk: this.failOk
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						try{
							self._getItemsFromLoadedData(data);
							self._loadFinished = true;
							self._loadInProgress = false;

							filter(keywordArgs, self._getItemsArray(keywordArgs.queryOptions));
							self._handleQueuedFetches();
						}catch(e){
							self._loadFinished = true;
							self._loadInProgress = false;
							errorCallback(e, keywordArgs);
						}
					});
					getHandler.addErrback(function(error){
						self._loadInProgress = false;
						errorCallback(error, keywordArgs);
					});

					//Wire up the cancel to abort of the request
					//This call cancel on the deferred if it hasn't been called
					//yet and then will chain to the simple abort of the
					//simpleFetch keywordArgs
					var oldAbort = null;
					if(keywordArgs.abort){
						oldAbort = keywordArgs.abort;
					}
					keywordArgs.abort = function(){
						var df = getHandler;
						if(df && df.fired === -1){
							df.cancel();
							df = null;
						}
						if(oldAbort){
							oldAbort.call(keywordArgs);
						}
					};
				}
			}else if(this._jsonData){
				try{
					this._loadFinished = true;
					this._getItemsFromLoadedData(this._jsonData);
					this._jsonData = null;
					filter(keywordArgs, this._getItemsArray(keywordArgs.queryOptions));
				}catch(e){
					errorCallback(e, keywordArgs);
				}
			}else{
				errorCallback(new Error("dojo.data.ItemFileReadStore: No JSON source data was provided as either URL or a nested Javascript object."), keywordArgs);
			}
		}
	},

	_handleQueuedFetches: function(){
		//	summary:
		//		Internal function to execute delayed request in the store.
		//Execute any deferred fetches now.
		if(this._queuedFetches.length > 0){
			for(var i = 0; i < this._queuedFetches.length; i++){
				var fData = this._queuedFetches[i],
				    delayedQuery = fData.args,
				    delayedFilter = fData.filter;
				if(delayedFilter){
					delayedFilter(delayedQuery, this._getItemsArray(delayedQuery.queryOptions));
				}else{
					this.fetchItemByIdentity(delayedQuery);
				}
			}
			this._queuedFetches = [];
		}
	},

	_getItemsArray: function(/*object?*/queryOptions){
		//	summary:
		//		Internal function to determine which list of items to search over.
		//	queryOptions: The query options parameter, if any.
		if(queryOptions && queryOptions.deep){
			return this._arrayOfAllItems;
		}
		return this._arrayOfTopLevelItems;
	},

	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		 //	summary:
		 //		See dojo.data.api.Read.close()
		 if(this.clearOnClose &&
			this._loadFinished &&
			!this._loadInProgress){
			 //Reset all internalsback to default state.  This will force a reload
			 //on next fetch.  This also checks that the data or url param was set
			 //so that the store knows it can get data.  Without one of those being set,
			 //the next fetch will trigger an error.

			 if(((this._jsonFileUrl == "" || this._jsonFileUrl == null) &&
				 (this.url == "" || this.url == null)
				) && this.data == null){
				 console.debug("dojo.data.ItemFileReadStore: WARNING!  Data reload " +
					" information has not been provided." +
					"  Please set 'url' or 'data' to the appropriate value before" +
					" the next fetch");
			 }
			 this._arrayOfAllItems = [];
			 this._arrayOfTopLevelItems = [];
			 this._loadFinished = false;
			 this._itemsByIdentity = null;
			 this._loadInProgress = false;
			 this._queuedFetches = [];
		 }
	},

	_getItemsFromLoadedData: function(/* Object */ dataObject){
		//	summary:
		//		Function to parse the loaded data into item format and build the internal items array.
		//	description:
		//		Function to parse the loaded data into item format and build the internal items array.
		//
		//	dataObject:
		//		The JS data object containing the raw data to convery into item format.
		//
		// 	returns: array
		//		Array of items in store item format.

		// First, we define a couple little utility functions...
		var addingArrays = false,
		    self = this;

		function valueIsAnItem(/* anything */ aValue){
			// summary:
			//		Given any sort of value that could be in the raw json data,
			//		return true if we should interpret the value as being an
			//		item itself, rather than a literal value or a reference.
			// example:
			// 	|	false == valueIsAnItem("Kermit");
			// 	|	false == valueIsAnItem(42);
			// 	|	false == valueIsAnItem(new Date());
			// 	|	false == valueIsAnItem({_type:'Date', _value:'1802-05-14'});
			// 	|	false == valueIsAnItem({_reference:'Kermit'});
			// 	|	true == valueIsAnItem({name:'Kermit', color:'green'});
			// 	|	true == valueIsAnItem({iggy:'pop'});
			// 	|	true == valueIsAnItem({foo:42});
			return (aValue !== null) &&
				(typeof aValue === "object") &&
				(!lang.isArray(aValue) || addingArrays) &&
				(!lang.isFunction(aValue)) &&
				(aValue.constructor == Object || lang.isArray(aValue)) &&
				(typeof aValue._reference === "undefined") &&
				(typeof aValue._type === "undefined") &&
				(typeof aValue._value === "undefined") &&
				self.hierarchical;
		}

		function addItemAndSubItemsToArrayOfAllItems(/* Item */ anItem){
			self._arrayOfAllItems.push(anItem);
			for(var attribute in anItem){
				var valueForAttribute = anItem[attribute];
				if(valueForAttribute){
					if(lang.isArray(valueForAttribute)){
						var valueArray = valueForAttribute;
						for(var k = 0; k < valueArray.length; ++k){
							var singleValue = valueArray[k];
							if(valueIsAnItem(singleValue)){
								addItemAndSubItemsToArrayOfAllItems(singleValue);
							}
						}
					}else{
						if(valueIsAnItem(valueForAttribute)){
							addItemAndSubItemsToArrayOfAllItems(valueForAttribute);
						}
					}
				}
			}
		}

		this._labelAttr = dataObject.label;

		// We need to do some transformations to convert the data structure
		// that we read from the file into a format that will be convenient
		// to work with in memory.

		// Step 1: Walk through the object hierarchy and build a list of all items
		var i,
		    item;
		this._arrayOfAllItems = [];
		this._arrayOfTopLevelItems = dataObject.items;

		for(i = 0; i < this._arrayOfTopLevelItems.length; ++i){
			item = this._arrayOfTopLevelItems[i];
			if(lang.isArray(item)){
				addingArrays = true;
			}
			addItemAndSubItemsToArrayOfAllItems(item);
			item[this._rootItemPropName]=true;
		}

		// Step 2: Walk through all the attribute values of all the items,
		// and replace single values with arrays.  For example, we change this:
		//		{ name:'Miss Piggy', pets:'Foo-Foo'}
		// into this:
		//		{ name:['Miss Piggy'], pets:['Foo-Foo']}
		//
		// We also store the attribute names so we can validate our store
		// reference and item id special properties for the O(1) isItem
		var allAttributeNames = {},
		    key;

		for(i = 0; i < this._arrayOfAllItems.length; ++i){
			item = this._arrayOfAllItems[i];
			for(key in item){
				if(key !== this._rootItemPropName){
					var value = item[key];
					if(value !== null){
						if(!lang.isArray(value)){
							item[key] = [value];
						}
					}else{
						item[key] = [null];
					}
				}
				allAttributeNames[key]=key;
			}
		}

		// Step 3: Build unique property names to use for the _storeRefPropName and _itemNumPropName
		// This should go really fast, it will generally never even run the loop.
		while(allAttributeNames[this._storeRefPropName]){
			this._storeRefPropName += "_";
		}
		while(allAttributeNames[this._itemNumPropName]){
			this._itemNumPropName += "_";
		}
		while(allAttributeNames[this._reverseRefMap]){
			this._reverseRefMap += "_";
		}

		// Step 4: Some data files specify an optional 'identifier', which is
		// the name of an attribute that holds the identity of each item.
		// If this data file specified an identifier attribute, then build a
		// hash table of items keyed by the identity of the items.
		var arrayOfValues;

		var identifier = dataObject.identifier;
		if(identifier){
			this._itemsByIdentity = {};
			this._features['dojo.data.api.Identity'] = identifier;
			for(i = 0; i < this._arrayOfAllItems.length; ++i){
				item = this._arrayOfAllItems[i];
				arrayOfValues = item[identifier];
				var identity = arrayOfValues[0];
				if(!Object.hasOwnProperty.call(this._itemsByIdentity, identity)){
					this._itemsByIdentity[identity] = item;
				}else{
					if(this._jsonFileUrl){
						throw new Error("dojo.data.ItemFileReadStore:  The json data as specified by: [" + this._jsonFileUrl + "] is malformed.  Items within the list have identifier: [" + identifier + "].  Value collided: [" + identity + "]");
					}else if(this._jsonData){
						throw new Error("dojo.data.ItemFileReadStore:  The json data provided by the creation arguments is malformed.  Items within the list have identifier: [" + identifier + "].  Value collided: [" + identity + "]");
					}
				}
			}
		}else{
			this._features['dojo.data.api.Identity'] = Number;
		}

		// Step 5: Walk through all the items, and set each item's properties
		// for _storeRefPropName and _itemNumPropName, so that store.isItem() will return true.
		for(i = 0; i < this._arrayOfAllItems.length; ++i){
			item = this._arrayOfAllItems[i];
			item[this._storeRefPropName] = this;
			item[this._itemNumPropName] = i;
		}

		// Step 6: We walk through all the attribute values of all the items,
		// looking for type/value literals and item-references.
		//
		// We replace item-references with pointers to items.  For example, we change:
		//		{ name:['Kermit'], friends:[{_reference:{name:'Miss Piggy'}}] }
		// into this:
		//		{ name:['Kermit'], friends:[miss_piggy] }
		// (where miss_piggy is the object representing the 'Miss Piggy' item).
		//
		// We replace type/value pairs with typed-literals.  For example, we change:
		//		{ name:['Nelson Mandela'], born:[{_type:'Date', _value:'1918-07-18'}] }
		// into this:
		//		{ name:['Kermit'], born:(new Date(1918, 6, 18)) }
		//
		// We also generate the associate map for all items for the O(1) isItem function.
		for(i = 0; i < this._arrayOfAllItems.length; ++i){
			item = this._arrayOfAllItems[i]; // example: { name:['Kermit'], friends:[{_reference:{name:'Miss Piggy'}}] }
			for(key in item){
				arrayOfValues = item[key]; // example: [{_reference:{name:'Miss Piggy'}}]
				for(var j = 0; j < arrayOfValues.length; ++j){
					value = arrayOfValues[j]; // example: {_reference:{name:'Miss Piggy'}}
					if(value !== null && typeof value == "object"){
						if(("_type" in value) && ("_value" in value)){
							var type = value._type; // examples: 'Date', 'Color', or 'ComplexNumber'
							var mappingObj = this._datatypeMap[type]; // examples: Date, dojo.Color, foo.math.ComplexNumber, {type: dojo.Color, deserialize(value){ return new dojo.Color(value)}}
							if(!mappingObj){
								throw new Error("dojo.data.ItemFileReadStore: in the typeMap constructor arg, no object class was specified for the datatype '" + type + "'");
							}else if(lang.isFunction(mappingObj)){
								arrayOfValues[j] = new mappingObj(value._value);
							}else if(lang.isFunction(mappingObj.deserialize)){
								arrayOfValues[j] = mappingObj.deserialize(value._value);
							}else{
								throw new Error("dojo.data.ItemFileReadStore: Value provided in typeMap was neither a constructor, nor a an object with a deserialize function");
							}
						}
						if(value._reference){
							var referenceDescription = value._reference; // example: {name:'Miss Piggy'}
							if(!lang.isObject(referenceDescription)){
								// example: 'Miss Piggy'
								// from an item like: { name:['Kermit'], friends:[{_reference:'Miss Piggy'}]}
								arrayOfValues[j] = this._getItemByIdentity(referenceDescription);
							}else{
								// example: {name:'Miss Piggy'}
								// from an item like: { name:['Kermit'], friends:[{_reference:{name:'Miss Piggy'}}] }
								for(var k = 0; k < this._arrayOfAllItems.length; ++k){
									var candidateItem = this._arrayOfAllItems[k],
									    found = true;
									for(var refKey in referenceDescription){
										if(candidateItem[refKey] != referenceDescription[refKey]){
											found = false;
										}
									}
									if(found){
										arrayOfValues[j] = candidateItem;
									}
								}
							}
							if(this.referenceIntegrity){
								var refItem = arrayOfValues[j];
								if(this.isItem(refItem)){
									this._addReferenceToMap(refItem, item, key);
								}
							}
						}else if(this.isItem(value)){
							//It's a child item (not one referenced through _reference).
							//We need to treat this as a referenced item, so it can be cleaned up
							//in a write store easily.
							if(this.referenceIntegrity){
								this._addReferenceToMap(value, item, key);
							}
						}
					}
				}
			}
		}
	},

	_addReferenceToMap: function(/*item*/ refItem, /*item*/ parentItem, /*string*/ attribute){
		 //	summary:
		 //		Method to add an reference map entry for an item and attribute.
		 //	description:
		 //		Method to add an reference map entry for an item and attribute. 		 //
		 //	refItem:
		 //		The item that is referenced.
		 //	parentItem:
		 //		The item that holds the new reference to refItem.
		 //	attribute:
		 //		The attribute on parentItem that contains the new reference.

		 //Stub function, does nothing.  Real processing is in ItemFileWriteStore.
	},

	getIdentity: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentity()
		var identifier = this._features['dojo.data.api.Identity'];
		if(identifier === Number){
			return item[this._itemNumPropName]; // Number
		}else{
			var arrayOfValues = item[identifier];
			if(arrayOfValues){
				return arrayOfValues[0]; // Object || String
			}
		}
		return null; // null
	},

	fetchItemByIdentity: function(/* Object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()

		// Hasn't loaded yet, we have to trigger the load.
		var item,
		    scope;
		if(!this._loadFinished){
			var self = this;
			//Do a check on the JsonFileUrl and crosscheck it.
			//If it doesn't match the cross-check, it needs to be updated
			//This allows for either url or _jsonFileUrl to he changed to
			//reset the store load location.  Done this way for backwards
			//compatibility.  People use _jsonFileUrl (even though officially
			//private.
			if(this._jsonFileUrl !== this._ccUrl){
				kernel.deprecated("dojo.data.ItemFileReadStore: ",
					"To change the url, set the url property of the store," +
					" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
				this._ccUrl = this._jsonFileUrl;
				this.url = this._jsonFileUrl;
			}else if(this.url !== this._ccUrl){
				this._jsonFileUrl = this.url;
				this._ccUrl = this.url;
			}

			//See if there was any forced reset of data.
			if(this.data != null && this._jsonData == null){
				this._jsonData = this.data;
				this.data = null;
			}

			if(this._jsonFileUrl){

				if(this._loadInProgress){
					this._queuedFetches.push({args: keywordArgs});
				}else{
					this._loadInProgress = true;
					var getArgs = {
							url: self._jsonFileUrl,
							handleAs: "json-comment-optional",
							preventCache: this.urlPreventCache,
							failOk: this.failOk
					};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						var scope = keywordArgs.scope?keywordArgs.scope:window.global;
						try{
							self._getItemsFromLoadedData(data);
							self._loadFinished = true;
							self._loadInProgress = false;
							item = self._getItemByIdentity(keywordArgs.identity);
							if(keywordArgs.onItem){
								keywordArgs.onItem.call(scope, item);
							}
							self._handleQueuedFetches();
						}catch(error){
							self._loadInProgress = false;
							if(keywordArgs.onError){
								keywordArgs.onError.call(scope, error);
							}
						}
					});
					getHandler.addErrback(function(error){
						self._loadInProgress = false;
						if(keywordArgs.onError){
							var scope = keywordArgs.scope?keywordArgs.scope:window.global;
							keywordArgs.onError.call(scope, error);
						}
					});
				}

			}else if(this._jsonData){
				// Passed in data, no need to xhr.
				self._getItemsFromLoadedData(self._jsonData);
				self._jsonData = null;
				self._loadFinished = true;
				item = self._getItemByIdentity(keywordArgs.identity);
				if(keywordArgs.onItem){
					scope = keywordArgs.scope?keywordArgs.scope:window.global;
					keywordArgs.onItem.call(scope, item);
				}
			}
		}else{
			// Already loaded.  We can just look it up and call back.
			item = this._getItemByIdentity(keywordArgs.identity);
			if(keywordArgs.onItem){
				scope = keywordArgs.scope?keywordArgs.scope:window.global;
				keywordArgs.onItem.call(scope, item);
			}
		}
	},

	_getItemByIdentity: function(/* Object */ identity){
		//	summary:
		//		Internal function to look an item up by its identity map.
		var item = null;
		if(this._itemsByIdentity){
			// If this map is defined, we need to just try to get it.  If it fails
			// the item does not exist.
			if(Object.hasOwnProperty.call(this._itemsByIdentity, identity)){
				item = this._itemsByIdentity[identity];
			}
		}else if (Object.hasOwnProperty.call(this._arrayOfAllItems, identity)){
			item = this._arrayOfAllItems[identity];
		}
		if(item === undefined){
			item = null;
		}
		return item; // Object
	},

	getIdentityAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentityAttributes()

		var identifier = this._features['dojo.data.api.Identity'];
		if(identifier === Number){
			// If (identifier === Number) it means getIdentity() just returns
			// an integer item-number for each item.  The dojo.data.api.Identity
			// spec says we need to return null if the identity is not composed
			// of attributes
			return null; // null
		}else{
			return [identifier]; // Array
		}
	},

	_forceLoad: function(){
		//	summary:
		//		Internal function to force a load of the store if it hasn't occurred yet.  This is required
		//		for specific functions to work properly.
		var self = this;
		//Do a check on the JsonFileUrl and crosscheck it.
		//If it doesn't match the cross-check, it needs to be updated
		//This allows for either url or _jsonFileUrl to he changed to
		//reset the store load location.  Done this way for backwards
		//compatibility.  People use _jsonFileUrl (even though officially
		//private.
		if(this._jsonFileUrl !== this._ccUrl){
			kernel.deprecated("dojo.data.ItemFileReadStore: ",
				"To change the url, set the url property of the store," +
				" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");
			this._ccUrl = this._jsonFileUrl;
			this.url = this._jsonFileUrl;
		}else if(this.url !== this._ccUrl){
			this._jsonFileUrl = this.url;
			this._ccUrl = this.url;
		}

		//See if there was any forced reset of data.
		if(this.data != null){
			this._jsonData = this.data;
			this.data = null;
		}

		if(this._jsonFileUrl){
				var getArgs = {
					url: this._jsonFileUrl,
					handleAs: "json-comment-optional",
					preventCache: this.urlPreventCache,
					failOk: this.failOk,
					sync: true
				};
			var getHandler = xhr.get(getArgs);
			getHandler.addCallback(function(data){
				try{
					//Check to be sure there wasn't another load going on concurrently
					//So we don't clobber data that comes in on it.  If there is a load going on
					//then do not save this data.  It will potentially clobber current data.
					//We mainly wanted to sync/wait here.
					//TODO:  Revisit the loading scheme of this store to improve multi-initial
					//request handling.
					if(self._loadInProgress !== true && !self._loadFinished){
						self._getItemsFromLoadedData(data);
						self._loadFinished = true;
					}else if(self._loadInProgress){
						//Okay, we hit an error state we can't recover from.  A forced load occurred
						//while an async load was occurring.  Since we cannot block at this point, the best
						//that can be managed is to throw an error.
						throw new Error("dojo.data.ItemFileReadStore:  Unable to perform a synchronous load, an async load is in progress.");
					}
				}catch(e){
					console.log(e);
					throw e;
				}
			});
			getHandler.addErrback(function(error){
				throw error;
			});
		}else if(this._jsonData){
			self._getItemsFromLoadedData(self._jsonData);
			self._jsonData = null;
			self._loadFinished = true;
		}
	}
});
//Mix in the simple fetch implementation to this class.
lang.extend(ItemFileReadStore,simpleFetch);

return ItemFileReadStore;
});

},
'dojo/date/stamp':function(){
define("dojo/date/stamp", ["../_base/kernel", "../_base/lang", "../_base/array"], function(dojo, lang, array) {
	// module:
	//		dojo/date/stamp
	// summary:
	//		TODOC

lang.getObject("date.stamp", true, dojo);

// Methods to convert dates to or from a wire (string) format using well-known conventions

dojo.date.stamp.fromISOString = function(/*String*/formattedString, /*Number?*/defaultTime){
	//	summary:
	//		Returns a Date object given a string formatted according to a subset of the ISO-8601 standard.
	//
	//	description:
	//		Accepts a string formatted according to a profile of ISO8601 as defined by
	//		[RFC3339](http://www.ietf.org/rfc/rfc3339.txt), except that partial input is allowed.
	//		Can also process dates as specified [by the W3C](http://www.w3.org/TR/NOTE-datetime)
	//		The following combinations are valid:
	//
	//			* dates only
	//			|	* yyyy
	//			|	* yyyy-MM
	//			|	* yyyy-MM-dd
	// 			* times only, with an optional time zone appended
	//			|	* THH:mm
	//			|	* THH:mm:ss
	//			|	* THH:mm:ss.SSS
	// 			* and "datetimes" which could be any combination of the above
	//
	//		timezones may be specified as Z (for UTC) or +/- followed by a time expression HH:mm
	//		Assumes the local time zone if not specified.  Does not validate.  Improperly formatted
	//		input may return null.  Arguments which are out of bounds will be handled
	// 		by the Date constructor (e.g. January 32nd typically gets resolved to February 1st)
	//		Only years between 100 and 9999 are supported.
	//
  	//	formattedString:
	//		A string such as 2005-06-30T08:05:00-07:00 or 2005-06-30 or T08:05:00
	//
	//	defaultTime:
	//		Used for defaults for fields omitted in the formattedString.
	//		Uses 1970-01-01T00:00:00.0Z by default.

	if(!dojo.date.stamp._isoRegExp){
		dojo.date.stamp._isoRegExp =
//TODO: could be more restrictive and check for 00-59, etc.
			/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
	}

	var match = dojo.date.stamp._isoRegExp.exec(formattedString),
		result = null;

	if(match){
		match.shift();
		if(match[1]){match[1]--;} // Javascript Date months are 0-based
		if(match[6]){match[6] *= 1000;} // Javascript Date expects fractional seconds as milliseconds

		if(defaultTime){
			// mix in defaultTime.  Relatively expensive, so use || operators for the fast path of defaultTime === 0
			defaultTime = new Date(defaultTime);
			array.forEach(array.map(["FullYear", "Month", "Date", "Hours", "Minutes", "Seconds", "Milliseconds"], function(prop){
				return defaultTime["get" + prop]();
			}), function(value, index){
				match[index] = match[index] || value;
			});
		}
		result = new Date(match[0]||1970, match[1]||0, match[2]||1, match[3]||0, match[4]||0, match[5]||0, match[6]||0); //TODO: UTC defaults
		if(match[0] < 100){
			result.setFullYear(match[0] || 1970);
		}

		var offset = 0,
			zoneSign = match[7] && match[7].charAt(0);
		if(zoneSign != 'Z'){
			offset = ((match[8] || 0) * 60) + (Number(match[9]) || 0);
			if(zoneSign != '-'){ offset *= -1; }
		}
		if(zoneSign){
			offset -= result.getTimezoneOffset();
		}
		if(offset){
			result.setTime(result.getTime() + offset * 60000);
		}
	}

	return result; // Date or null
};

/*=====
	dojo.date.stamp.__Options = function(){
		//	selector: String
		//		"date" or "time" for partial formatting of the Date object.
		//		Both date and time will be formatted by default.
		//	zulu: Boolean
		//		if true, UTC/GMT is used for a timezone
		//	milliseconds: Boolean
		//		if true, output milliseconds
		this.selector = selector;
		this.zulu = zulu;
		this.milliseconds = milliseconds;
	}
=====*/

dojo.date.stamp.toISOString = function(/*Date*/dateObject, /*dojo.date.stamp.__Options?*/options){
	//	summary:
	//		Format a Date object as a string according a subset of the ISO-8601 standard
	//
	//	description:
	//		When options.selector is omitted, output follows [RFC3339](http://www.ietf.org/rfc/rfc3339.txt)
	//		The local time zone is included as an offset from GMT, except when selector=='time' (time without a date)
	//		Does not check bounds.  Only years between 100 and 9999 are supported.
	//
	//	dateObject:
	//		A Date object

	var _ = function(n){ return (n < 10) ? "0" + n : n; };
	options = options || {};
	var formattedDate = [],
		getter = options.zulu ? "getUTC" : "get",
		date = "";
	if(options.selector != "time"){
		var year = dateObject[getter+"FullYear"]();
		date = ["0000".substr((year+"").length)+year, _(dateObject[getter+"Month"]()+1), _(dateObject[getter+"Date"]())].join('-');
	}
	formattedDate.push(date);
	if(options.selector != "date"){
		var time = [_(dateObject[getter+"Hours"]()), _(dateObject[getter+"Minutes"]()), _(dateObject[getter+"Seconds"]())].join(':');
		var millis = dateObject[getter+"Milliseconds"]();
		if(options.milliseconds){
			time += "."+ (millis < 100 ? "0" : "") + _(millis);
		}
		if(options.zulu){
			time += "Z";
		}else if(options.selector != "time"){
			var timezoneOffset = dateObject.getTimezoneOffset();
			var absOffset = Math.abs(timezoneOffset);
			time += (timezoneOffset > 0 ? "-" : "+") +
				_(Math.floor(absOffset/60)) + ":" + _(absOffset%60);
		}
		formattedDate.push(time);
	}
	return formattedDate.join('T'); // String
};

return dojo.date.stamp;
});

},
'*noref':1}});
define("dojo/_data", [], 1);
require(["dojo/data/ItemFileReadStore","dojo/data/ItemFileWriteStore","dojo/data/util/simpleFetch","dojo/data/util/sorter","dojo/data/util/filter"]);

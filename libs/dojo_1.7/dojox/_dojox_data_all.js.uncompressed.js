require({cache:{
'dojox/data/QueryReadStore':function(){
define("dojox/data/QueryReadStore", ["dojo", "dojox", "dojo/data/util/sorter", "dojo/string"], function(dojo, dojox) {

dojo.declare("dojox.data.QueryReadStore",
	null,
	{
		//	summary:
		//		This class provides a store that is mainly intended to be used
		//		for loading data dynamically from the server, used i.e. for
		//		retreiving chunks of data from huge data stores on the server (by server-side filtering!).
		//		Upon calling the fetch() method of this store the data are requested from
		//		the server if they are not yet loaded for paging (or cached).
		//
		//		For example used for a combobox which works on lots of data. It
		//		can be used to retreive the data partially upon entering the
		//		letters "ac" it returns only items like "action", "acting", etc.
		//
		// note:
		//		The field name "id" in a query is reserved for looking up data
		//		by id. This is necessary as before the first fetch, the store
		//		has no way of knowing which field the server will declare as
		//		identifier.
		//
		//	example:
		// |	// The parameter "query" contains the data that are sent to the server.
		// |	var store = new dojox.data.QueryReadStore({url:'/search.php'});
		// |	store.fetch({query:{name:'a'}, queryOptions:{ignoreCase:false}});
		//
		// |	// Since "serverQuery" is given, it overrules and those data are
		// |	// sent to the server.
		// |	var store = new dojox.data.QueryReadStore({url:'/search.php'});
		// |	store.fetch({serverQuery:{name:'a'}, queryOptions:{ignoreCase:false}});
		//
		// |	<div dojoType="dojox.data.QueryReadStore"
		// |		jsId="store2"
		// |		url="../tests/stores/QueryReadStore.php"
		// |		requestMethod="post"></div>
		// |	<div dojoType="dojox.grid.data.DojoData"
		// |		jsId="model2"
		// |		store="store2"
		// |		sortFields="[{attribute: 'name', descending: true}]"
		// |		rowsPerPage="30"></div>
		// |	<div dojoType="dojox.Grid" id="grid2"
		// |		model="model2"
		// |		structure="gridLayout"
		// |		style="height:300px; width:800px;"></div>
	
		//
		//	todo:
		//		- there is a bug in the paging, when i set start:2, count:5 after an initial fetch() and doClientPaging:true
		//		  it returns 6 elemetns, though count=5, try it in QueryReadStore.html
		//		- add optional caching
		//		- when the first query searched for "a" and the next for a subset of
		//		  the first, i.e. "ab" then we actually dont need a server request, if
		//		  we have client paging, we just need to filter the items we already have
		//		  that might also be tooo much logic
		
		url:"",
		requestMethod:"get",
		//useCache:false,
		
		// We use the name in the errors, once the name is fixed hardcode it, may be.
		_className:"dojox.data.QueryReadStore",
		
		// This will contain the items we have loaded from the server.
		// The contents of this array is optimized to satisfy all read-api requirements
		// and for using lesser storage, so the keys and their content need some explaination:
		// 		this._items[0].i - the item itself
		//		this._items[0].r - a reference to the store, so we can identify the item
		//			securly. We set this reference right after receiving the item from the
		//			server.
		_items:[],
		
		// Store the last query that triggered xhr request to the server.
		// So we can compare if the request changed and if we shall reload
		// (this also depends on other factors, such as is caching used, etc).
		_lastServerQuery:null,
		
		// Store how many rows we have so that we can pass it to a clientPaging handler
		_numRows:-1,
		
		// Store a hash of the last server request. Actually I introduced this
		// for testing, so I can check if no unnecessary requests were issued for
		// client-side-paging.
		lastRequestHash:null,
		
		// summary:
		//		By default every request for paging is sent to the server.
		doClientPaging:false,
	
		// summary:
		//		By default all the sorting is done serverside before the data is returned
		//		which is the proper place to be doing it for really large datasets.
		doClientSorting:false,
	
		// Items by identify for Identify API
		_itemsByIdentity:null,
		
		// Identifier used
		_identifier:null,
	
		_features: {'dojo.data.api.Read':true, 'dojo.data.api.Identity':true},
	
		_labelAttr: "label",
		
		constructor: function(/* Object */ params){
			dojo.mixin(this,params);
		},
		
		getValue: function(/* item */ item, /* attribute-name-string */ attribute, /* value? */ defaultValue){
			//	According to the Read API comments in getValue() and exception is
			//	thrown when an item is not an item or the attribute not a string!
			this._assertIsItem(item);
			if(!dojo.isString(attribute)){
				throw new Error(this._className+".getValue(): Invalid attribute, string expected!");
			}
			if(!this.hasAttribute(item, attribute)){
				// read api says: return defaultValue "only if *item* does not have a value for *attribute*."
				// Is this the case here? The attribute doesn't exist, but a defaultValue, sounds reasonable.
				if(defaultValue){
					return defaultValue;
				}
			}
			return item.i[attribute];
		},
		
		getValues: function(/* item */ item, /* attribute-name-string */ attribute){
			this._assertIsItem(item);
			var ret = [];
			if(this.hasAttribute(item, attribute)){
				ret.push(item.i[attribute]);
			}
			return ret;
		},
		
		getAttributes: function(/* item */ item){
			this._assertIsItem(item);
			var ret = [];
			for(var i in item.i){
				ret.push(i);
			}
			return ret;
		},
	
		hasAttribute: function(/* item */ item,	/* attribute-name-string */ attribute){
			//	summary:
			//		See dojo.data.api.Read.hasAttribute()
			return this.isItem(item) && typeof item.i[attribute]!="undefined";
		},
		
		containsValue: function(/* item */ item, /* attribute-name-string */ attribute, /* anything */ value){
			var values = this.getValues(item, attribute);
			var len = values.length;
			for(var i=0; i<len; i++){
				if(values[i] == value){
					return true;
				}
			}
			return false;
		},
		
		isItem: function(/* anything */ something){
			// Some basic tests, that are quick and easy to do here.
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem("");
			// false
			//
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem({});
			// false
			//
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem(0);
			// false
			//
			// >>> var store = new dojox.data.QueryReadStore({});
			// >>> store.isItem({name:"me", label:"me too"});
			// false
			//
			if(something){
				return typeof something.r != "undefined" && something.r == this;
			}
			return false;
		},
		
		isItemLoaded: function(/* anything */ something){
			// Currently we dont have any state that tells if an item is loaded or not
			// if the item exists its also loaded.
			// This might change when we start working with refs inside items ...
			return this.isItem(something);
		},
	
		loadItem: function(/* object */ args){
			if(this.isItemLoaded(args.item)){
				return;
			}
			// Actually we have nothing to do here, or at least I dont know what to do here ...
		},
	
		fetch:function(/* Object? */ request){
			//	summary:
			//		See dojo.data.util.simpleFetch.fetch() this is just a copy and I adjusted
			//		only the paging, since it happens on the server if doClientPaging is
			//		false, thx to http://trac.dojotoolkit.org/ticket/4761 reporting this.
			//		Would be nice to be able to use simpleFetch() to reduce copied code,
			//		but i dont know how yet. Ideas please!
			request = request || {};
			if(!request.store){
				request.store = this;
			}
			var self = this;
		
			var _errorHandler = function(errorData, requestObject){
				if(requestObject.onError){
					var scope = requestObject.scope || dojo.global;
					requestObject.onError.call(scope, errorData, requestObject);
				}
			};
		
			var _fetchHandler = function(items, requestObject, numRows){
				var oldAbortFunction = requestObject.abort || null;
				var aborted = false;
				
				var startIndex = requestObject.start?requestObject.start:0;
				if(self.doClientPaging == false){
					// For client paging we dont need no slicing of the result.
					startIndex = 0;
				}
				var endIndex = requestObject.count?(startIndex + requestObject.count):items.length;
		
				requestObject.abort = function(){
					aborted = true;
					if(oldAbortFunction){
						oldAbortFunction.call(requestObject);
					}
				};
		
				var scope = requestObject.scope || dojo.global;
				if(!requestObject.store){
					requestObject.store = self;
				}
				if(requestObject.onBegin){
					requestObject.onBegin.call(scope, numRows, requestObject);
				}
				if(requestObject.sort && self.doClientSorting){
					items.sort(dojo.data.util.sorter.createSortFunction(requestObject.sort, self));
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
		},
	
		getFeatures: function(){
			return this._features;
		},
	
		close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
			// I have no idea if this is really needed ...
		},
	
		getLabel: function(/* item */ item){
			//	summary:
			//		See dojo.data.api.Read.getLabel()
			if(this._labelAttr && this.isItem(item)){
				return this.getValue(item, this._labelAttr); //String
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
		
		_xhrFetchHandler: function(data, request, fetchHandler, errorHandler){
			data = this._filterResponse(data);
			if(data.label){
				this._labelAttr = data.label;
			}
			var numRows = data.numRows || -1;

			this._items = [];
			// Store a ref to "this" in each item, so we can simply check if an item
			// really origins form here (idea is from ItemFileReadStore, I just don't know
			// how efficient the real storage use, garbage collection effort, etc. is).
			dojo.forEach(data.items,function(e){
				this._items.push({i:e, r:this});
			},this);
			
			var identifier = data.identifier;
			this._itemsByIdentity = {};
			if(identifier){
				this._identifier = identifier;
				var i;
				for(i = 0; i < this._items.length; ++i){
					var item = this._items[i].i;
					var identity = item[identifier];
					if(!this._itemsByIdentity[identity]){
						this._itemsByIdentity[identity] = item;
					}else{
						throw new Error(this._className+":  The json data as specified by: [" + this.url + "] is malformed.  Items within the list have identifier: [" + identifier + "].  Value collided: [" + identity + "]");
					}
				}
			}else{
				this._identifier = Number;
				for(i = 0; i < this._items.length; ++i){
					this._items[i].n = i;
				}
			}
			
			// TODO actually we should do the same as dojo.data.ItemFileReadStore._getItemsFromLoadedData() to sanitize
			// (does it really sanititze them) and store the data optimal. should we? for security reasons???
			numRows = this._numRows = (numRows === -1) ? this._items.length : numRows;
			fetchHandler(this._items, request, numRows);
			this._numRows = numRows;
		},
		
		_fetchItems: function(request, fetchHandler, errorHandler){
			//	summary:
			// 		The request contains the data as defined in the Read-API.
			// 		Additionally there is following keyword "serverQuery".
			//
			//	The *serverQuery* parameter, optional.
			//		This parameter contains the data that will be sent to the server.
			//		If this parameter is not given the parameter "query"'s
			//		data are sent to the server. This is done for some reasons:
			//		- to specify explicitly which data are sent to the server, they
			//		  might also be a mix of what is contained in "query", "queryOptions"
			//		  and the paging parameters "start" and "count" or may be even
			//		  completely different things.
			//		- don't modify the request.query data, so the interface using this
			//		  store can rely on unmodified data, as the combobox dijit currently
			//		  does it, it compares if the query has changed
			//		- request.query is required by the Read-API
			//
			// 		I.e. the following examples might be sent via GET:
			//		  fetch({query:{name:"abc"}, queryOptions:{ignoreCase:true}})
			//		  the URL will become:   /url.php?name=abc
			//
			//		  fetch({serverQuery:{q:"abc", c:true}, query:{name:"abc"}, queryOptions:{ignoreCase:true}})
			//		  the URL will become:   /url.php?q=abc&c=true
			//		  // The serverQuery-parameter has overruled the query-parameter
			//		  // but the query parameter stays untouched, but is not sent to the server!
			//		  // The serverQuery contains more data than the query, so they might differ!
			//
	
			var serverQuery = request.serverQuery || request.query || {};
			//Need to add start and count
			if(!this.doClientPaging){
				serverQuery.start = request.start || 0;
				// Count might not be sent if not given.
				if(request.count){
					serverQuery.count = request.count;
				}
			}
			if(!this.doClientSorting && request.sort){
				var sortInfo = [];
				dojo.forEach(request.sort, function(sort){
					if(sort && sort.attribute){
						sortInfo.push((sort.descending ? "-" : "") + sort.attribute);
					}
				});
				serverQuery.sort = sortInfo.join(',');
			}
			// Compare the last query and the current query by simply json-encoding them,
			// so we dont have to do any deep object compare ... is there some dojo.areObjectsEqual()???
			if(this.doClientPaging && this._lastServerQuery !== null &&
				dojo.toJson(serverQuery) == dojo.toJson(this._lastServerQuery)
				){
				this._numRows = (this._numRows === -1) ? this._items.length : this._numRows;
				fetchHandler(this._items, request, this._numRows);
			}else{
				var xhrFunc = this.requestMethod.toLowerCase() == "post" ? dojo.xhrPost : dojo.xhrGet;
				var xhrHandler = xhrFunc({url:this.url, handleAs:"json-comment-optional", content:serverQuery, failOk: true});
				request.abort = function(){
					xhrHandler.cancel();
				};
				xhrHandler.addCallback(dojo.hitch(this, function(data){
					this._xhrFetchHandler(data, request, fetchHandler, errorHandler);
				}));
				xhrHandler.addErrback(function(error){
					errorHandler(error, request);
				});
				// Generate the hash using the time in milliseconds and a randon number.
				// Since Math.randon() returns something like: 0.23453463, we just remove the "0."
				// probably just for esthetic reasons :-).
				this.lastRequestHash = new Date().getTime()+"-"+String(Math.random()).substring(2);
				this._lastServerQuery = dojo.mixin({}, serverQuery);
			}
		},
		
		_filterResponse: function(data){
			//	summary:
			//		If the data from servers needs to be processed before it can be processed by this
			//		store, then this function should be re-implemented in subclass. This default
			//		implementation just return the data unchanged.
			//	data:
			//		The data received from server
			return data;
		},
	
		_assertIsItem: function(/* item */ item){
			//	summary:
			//		It throws an error if item is not valid, so you can call it in every method that needs to
			//		throw an error when item is invalid.
			//	item:
			//		The item to test for being contained by the store.
			if(!this.isItem(item)){
				throw new Error(this._className+": Invalid item argument.");
			}
		},
	
		_assertIsAttribute: function(/* attribute-name-string */ attribute){
			//	summary:
			//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
			//	attribute:
			//		The attribute to test for being contained by the store.
			if(typeof attribute !== "string"){
				throw new Error(this._className+": Invalid attribute argument ('"+attribute+"').");
			}
		},
	
		fetchItemByIdentity: function(/* Object */ keywordArgs){
			//	summary:
			//		See dojo.data.api.Identity.fetchItemByIdentity()
	
			// See if we have already loaded the item with that id
			// In case there hasn't been a fetch yet, _itemsByIdentity is null
			// and thus a fetch will be triggered below.
			if(this._itemsByIdentity){
				var item = this._itemsByIdentity[keywordArgs.identity];
				if(!(item === undefined)){
					if(keywordArgs.onItem){
						var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
						keywordArgs.onItem.call(scope, {i:item, r:this});
					}
					return;
				}
			}
	
			// Otherwise we need to go remote
			// Set up error handler
			var _errorHandler = function(errorData, requestObject){
				var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
				if(keywordArgs.onError){
					keywordArgs.onError.call(scope, errorData);
				}
			};
			
			// Set up fetch handler
			var _fetchHandler = function(items, requestObject){
				var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
				try{
					// There is supposed to be only one result
					var item = null;
					if(items && items.length == 1){
						item = items[0];
					}
					
					// If no item was found, item is still null and we'll
					// fire the onItem event with the null here
					if(keywordArgs.onItem){
						keywordArgs.onItem.call(scope, item);
					}
				}catch(error){
					if(keywordArgs.onError){
						keywordArgs.onError.call(scope, error);
					}
				}
			};
			
			// Construct query
			var request = {serverQuery:{id:keywordArgs.identity}};
			
			// Dispatch query
			this._fetchItems(request, _fetchHandler, _errorHandler);
		},
		
		getIdentity: function(/* item */ item){
			//	summary:
			//		See dojo.data.api.Identity.getIdentity()
			var identifier = null;
			if(this._identifier === Number){
				identifier = item.n; // Number
			}else{
				identifier = item.i[this._identifier];
			}
			return identifier;
		},
		
		getIdentityAttributes: function(/* item */ item){
			//	summary:
			//		See dojo.data.api.Identity.getIdentityAttributes()
			return [this._identifier];
		}
	}
);

return dojox.data.QueryReadStore;
});

},
'dojox/data/CdfStore':function(){
define("dojox/data/CdfStore", ["dojo", "dojox", "dojo/data/util/sorter"], function(dojo, dojox) {

dojox.data.ASYNC_MODE = 0;
dojox.data.SYNC_MODE = 1;

dojo.declare("dojox.data.CdfStore", null, {
	//	summary:
	//		IMPORTANT: The CDF Store is designed to work with Tibco GI, and references Tibco's
	//		JSX3 JavaScript library and will not work without it.
	//
	//		The CDF Store implements dojo.data.Read, Write, and Identity api's.  It is a local
	//		(in memory) store that handles XML documents formatted according to the
	//		Common Data Format (CDF) spec:
	//		http://www.tibco.com/devnet/resources/gi/3_1/tips_and_techniques/CommonDataFormatCDF.pdf
	//
	//		The purpose of this store is to provide a glue between a jsx3 CDF file and a Dijit.
	//
	//		While a CDF document is an XML file, other than the initial input, all data returned
	//		from and written to this store should be in object format.
	//
	// identity: [const] String
	//		The unique identifier for each item. Defaults to "jsxid" which is standard for a CDF
	//		document. Should not be changed.
	identity: "jsxid",
	//
	//	url : String
	//		The location from which to fetch the XML (CDF) document.
	url: "",
	//
	//	xmlStr: String
	//		A string that can be parsed into an XML document and should be formatted according
	//		to the CDF spec.
	//	example:
	//		|	'<data jsxid="jsxroot"><record jsxtext="A"/><record jsxtext="B" jsxid="2" jsxid="2"/></data>'
	xmlStr:"",
	//
	//	data:	Object
	//		A object that will be converted into the xmlStr property, and then parsed into a CDF.
	data:null,
	//
	//	label:	String
	//		The property within each item used to define the item.
	label: "",
	//
	//	mode [const]: dojox.data.ASYNC_MODE | dojox.data.SYNC_MODE
	//		This store supports syncronous fetches if this property is set to dojox.data.SYNC_MODE.
	mode:dojox.data.ASYNC_MODE,
	
	constructor: function(/* Object */ args){
		// summary:
		//	Constructor for the CDF store. Instantiate a new CdfStore.
		//
		if(args){
			this.url = args.url;
			this.xmlStr = args.xmlStr || args.str;
			if(args.data){
				this.xmlStr = this._makeXmlString(args.data);
			}
			this.identity = args.identity || this.identity;
			this.label = args.label || this.label;
			this.mode = args.mode !== undefined ? args.mode : this.mode;
		}
		this._modifiedItems = {};
		
		this.byId = this.fetchItemByIdentity;
	},
	
	/* dojo.data.api.Read */

	getValue: function(/* jsx3.xml.Entity */ item, /* String */ property, /* value? */ defaultValue){
		//	summary:
		//		Return an property value of an item
		//
		return item.getAttribute(property) || defaultValue; // anything
	},

	getValues: function(/* jsx3.xml.Entity */ item, /* String */ property){
		//	summary:
		//		Return an array of values
		//
		//	TODO!!! Can't find an example of an array in any CDF files
		//
		var v = this.getValue(item, property, []);
		return dojo.isArray(v) ? v : [v];
	},

	getAttributes: function(/* jsx3.xml.Entity */ item){
		//	summary:
		//		Return an array of property names
		//
		return item.getAttributeNames(); // Array
	},

	hasAttribute: function(/* jsx3.xml.Entity */ item, /* String */ property){
		//	summary:
		//		Check whether an item has a property
		//
		return (this.getValue(item, property) !== undefined); // Boolean
	},
	
	hasProperty: function(/* jsx3.xml.Entity */ item, /* String */ property){
		// summary:
		//	Alias for hasAttribute
		return this.hasAttribute(item, property);
	},
	
	containsValue: function(/* jsx3.xml.Entity */ item, /* String */ property, /* anything */ value){
		//	summary:
		//		Check whether an item contains a value
		//
		var values = this.getValues(item, property);
		for(var i = 0; i < values.length; i++){
			if(values[i] === null){ continue; }
			if((typeof value === "string")){
				if(values[i].toString && values[i].toString() === value){
					return true;
				}
			}else if(values[i] === value){
				return true; //boolean
			}
		}
		return false;//boolean
	},

	isItem: function(/* anything */ something){
		//	summary:
		//		Check whether the object is an item (jsx3.xml.Entity)
		//
		if(something.getClass && something.getClass().equals(jsx3.xml.Entity.jsxclass)){
			return true; //boolean
		}
		return false; //boolran
	},

	isItemLoaded: function(/* anything */ something){
		//	summary:
		//		Check whether the object is a jsx3.xml.Entity object and loaded
		//
		return this.isItem(something); // Boolean
	},

	loadItem: function(/* object */ keywordArgs){
		//	summary:
		//		Load an item
		//	description:
		//		The store always loads all items, so if it's an item, then it's loaded.
	},

	getFeatures: function(){
		//	summary:
		//		Return supported data APIs
		//
		return {
			"dojo.data.api.Read": true,
			"dojo.data.api.Write": true,
			"dojo.data.api.Identity":true
		}; // Object
	},

	getLabel: function(/* jsx3.xml.Entity */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		//
		if((this.label !== "") && this.isItem(item)){
			var label = this.getValue(item,this.label);
			if(label){
				return label.toString();
			}
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* jsx3.xml.Entity */ item){
		//	summary:
		//		returns an array of what properties of the item that were used
		//      to generate its label
		//		See dojo.data.api.Read.getLabelAttributes()
		//
		if(this.label !== ""){
			return [this.label]; //array
		}
		return null; //null
	},

	
	fetch: function(/* Object? */ request){
		// summary:
		//		Returns an Array of items based on the request arguments.
		// description:
		//		Returns an Array of items based on the request arguments.
		//		If the store is in ASYNC mode, the items should be expected in an onComplete
		//		method passed in the request object. If store is in SYNC mode, the items will
		//		be return directly as well as within the onComplete method.
		//	note:
		//		The mode can be set on store initialization or during a fetch as one of the
		//		parameters.
		//
		//	query: String
		//		The items in the store are treated as objects, but this is reading an XML
		//		document. Further, the actual querying of the items takes place in Tibco GI's
		//		jsx3.xml.Entity. Therefore, we are using their syntax which is xpath.
		//	Note:
		//		As conforming to a CDF document, most, if not all nodes are considered "records"
		//		and their tagNames are as such. The root node is named "data".
		//
		//	examples:
		//		All items:
		//		|	store.fetch({query:"*"});
		//		Item with a jsxid attribute equal to "1" (note you could use byId for this)
		//		|	store.fetch({query:"//record[@jsxid='1']"});
		//		All items with any jsxid attribute:
		//		|	"//record[@jsxid='*']"
		//		The items with a jsxid of '1' or '4':
		//		|	"//record[@jsxid='4' or @jsxid='1']"
		//		All children within a "group" node (could be multiple group nodes):
		//		"//group/record"
		//		All children within a specific group node:
		//		"//group[@name='mySecondGroup']/record"
		//		Any record, anywhere in the document:
		//		|	"//record"
		//		Only the records beneath the root (data) node:
		//		|	"//data/record"
		//
		//	See:
		//	http://www.tibco.com/devnet/resources/gi/3_7/api/html/jsx3/xml/Entity.html#method:selectNodes
		//	http://www.w3.org/TR/xpath
		//	http://msdn.microsoft.com/en-us/library/ms256086.aspx
		//
		//	See dojo.data.Read.fetch():
		//	onBegin
		//	onComplete
		//	onItem
		//	onError
		//	scope
		//	start
		//	count
		//	sort
		//
		request = request || {};
		if(!request.store){
			request.store = this;
		}
		if(request.mode !== undefined){
			this.mode = request.mode;
		}
		var self = this;
	
		var errorHandler = function(errorData){
			if(request.onError){
				var scope = request.scope || dojo.global;
				request.onError.call(scope, errorData, request);
			}else{
				console.error("cdfStore Error:", errorData);
			}
		};
	
		var fetchHandler = function(items, requestObject){
			requestObject = requestObject || request;
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
	
			var scope = requestObject.scope || dojo.global;
			if(!requestObject.store){
				requestObject.store = self;
			}
			if(requestObject.onBegin){
				requestObject.onBegin.call(scope, items.length, requestObject);
			}
			if(requestObject.sort){
				items.sort(dojo.data.util.sorter.createSortFunction(requestObject.sort, self));
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
				if(!requestObject.onItem){
					items = items.slice(startIndex, endIndex);
					if(requestObject.byId){
						items = items[0];
					}
				}
				requestObject.onComplete.call(scope, items, requestObject);
			}else{
				items = items.slice(startIndex, endIndex);
				if(requestObject.byId){
					items = items[0];
				}
			}
			return items;
		};
		
		if(!this.url && !this.data && !this.xmlStr){
			errorHandler(new Error("No URL or data specified."));
			return false;
		}
		var localRequest = request || "*"; // use request for _getItems()
		
		if(this.mode == dojox.data.SYNC_MODE){
			// sync mode. items returned directly
			var res = this._loadCDF();
			if(res instanceof Error){
				if(request.onError){
					request.onError.call(request.scope || dojo.global, res, request);
				}else{
					console.error("CdfStore Error:", res);
				}
				return res;
			}
			this.cdfDoc = res;
			
			var items = this._getItems(this.cdfDoc, localRequest);
			if(items && items.length > 0){
				items = fetchHandler(items, request);
			}else{
				items = fetchHandler([], request);
			}
			return items;
		
		}else{
			
			// async mode. Return a Deferred.
			var dfd = this._loadCDF();
			dfd.addCallbacks(dojo.hitch(this, function(cdfDoc){
				var items = this._getItems(this.cdfDoc, localRequest);
				if(items && items.length > 0){
					fetchHandler(items, request);
				}else{
					fetchHandler([], request);
				}
			}),
			dojo.hitch(this, function(err){
				errorHandler(err, request);
			}));
			
			return dfd;	// Object
		}
	},

	
	_loadCDF: function(){
		//	summary:
		//		Internal method.
		//		If a cdfDoc exists, return it. Otherwise, get one from JSX3,
		//		load the data or url, and return the doc or a deferred.
		var dfd = new dojo.Deferred();
		if(this.cdfDoc){
			if(this.mode == dojox.data.SYNC_MODE){
				return this.cdfDoc; // jsx3.xml.CDF
			}else{
				setTimeout(dojo.hitch(this, function(){
					dfd.callback(this.cdfDoc);
				}), 0);
				return dfd; // dojo.Deferred
			}
		}
		
		this.cdfDoc = jsx3.xml.CDF.Document.newDocument();
		this.cdfDoc.subscribe("response", this, function(evt){
			dfd.callback(this.cdfDoc);
		});
		this.cdfDoc.subscribe("error", this, function(err){
			dfd.errback(err);
		});
		
		this.cdfDoc.setAsync(!this.mode);
		if(this.url){
			this.cdfDoc.load(this.url);
		}else if(this.xmlStr){
			this.cdfDoc.loadXML(this.xmlStr);
			if(this.cdfDoc.getError().code){
				return new Error(this.cdfDoc.getError().description); // Error
			}
		}
		
		if(this.mode == dojox.data.SYNC_MODE){
			return this.cdfDoc; // jsx3.xml.CDF
		}else{
			return dfd;			// dojo.Deferred
		}
	},
	
	_getItems: function(/* jsx3.xml.Entity */cdfDoc, /* Object */request){
		// summary:
		//		Internal method.
		//		Requests the items from jsx3.xml.Entity with an xpath query.
		//
		var itr = cdfDoc.selectNodes(request.query, false, 1);
		var items = [];
		while(itr.hasNext()){
			items.push(itr.next());
		}
		return items;
	},

	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		 //	summary:
		 //		See dojo.data.api.Read.close()
	},

/* dojo.data.api.Write */

	newItem: function(/* object? */ keywordArgs, /* object? || String? */parentInfo){
		//	summary:
		//		Creates a jsx3.xml.Entity item and inserts it either inside the
		//		parent or appends it to the root
		//
		keywordArgs = (keywordArgs || {});
		if(keywordArgs.tagName){
			// record tagName is automatic and this would add it
			// as a property
			if(keywordArgs.tagName!="record"){
				// TODO: How about some sort of group?
				console.warn("Only record inserts are supported at this time");
			}
			delete keywordArgs.tagName;
		}
		keywordArgs.jsxid = keywordArgs.jsxid || this.cdfDoc.getKey();
		if(this.isItem(parentInfo)){
			parentInfo = this.getIdentity(parentInfo);
		}
		var item = this.cdfDoc.insertRecord(keywordArgs, parentInfo);

		this._makeDirty(item);
		
		return item; // jsx3.xml.Entity
	},
	
	deleteItem: function(/* jsx3.xml.Entity */ item){
		//	summary:
		//		Delete an jsx3.xml.Entity (wrapper to a XML element).
		//
		this.cdfDoc.deleteRecord(this.getIdentity(item));
		this._makeDirty(item);
		return true; //boolean
	},
	
	setValue: function(/* jsx3.xml.Entity */ item, /* String */ property, /* almost anything */ value){
		//	summary:
		//		Set an property value
		//
		this._makeDirty(item);
		item.setAttribute(property, value);
		return true; // Boolean
	},
		
	setValues: function(/* jsx3.xml.Entity */ item, /* String */ property, /*array*/ values){
		//	summary:
		//		Set property values
		//		TODO: Needs to be fully implemented.
		//
		this._makeDirty(item);
		console.warn("cdfStore.setValues only partially implemented.");
		return item.setAttribute(property, values);
		
	},
	
	unsetAttribute: function(/* jsx3.xml.Entity */ item, /* String */ property){
		//	summary:
		//		Remove an property
		//
		this._makeDirty(item);
		item.removeAttribute(property);
		return true; // Boolean
	},
	
	revert: function(){
		// summary:
		//		Invalidate changes (new and/or modified elements)
		//		Resets data by simply deleting the reference to the cdfDoc.
		//		Subsequent fetches will load the new data.
		// Note:
		//		Any items outside the store will no longer be valid and may cause errors.
		//
		delete this.cdfDoc;
		this._modifiedItems = {};
		return true; //boolean
	},
	
	isDirty: function(/* jsx3.xml.Entity ? */ item){
		//	summary:
		//		Check whether an item is new, modified or deleted.
		//		If no item is passed, checks if anything in the store has changed.
		//
		if(item){
			return !!this._modifiedItems[this.getIdentity(item)]; // Boolean
		}else{
			var _dirty = false;
			for(var nm in this._modifiedItems){ _dirty = true; break; }
			return _dirty; // Boolean
		}
	},

	

/* internal API */

	_makeDirty: function(item){
		// summary:
		//		Internal method.
		//		Marks items as modified, deleted or new.
		var id = this.getIdentity(item);
		this._modifiedItems[id] = item;
	},
	
	
	_makeXmlString: function(obj){
		// summary:
		//		Internal method.
		//		Converts an object into an XML string.
		//
		var parseObj = function(obj, name){
			var xmlStr = "";
			var nm;
			if(dojo.isArray(obj)){
				for(var i=0;i<obj.length;i++){
					xmlStr += parseObj(obj[i], name);
				}
			}else if(dojo.isObject(obj)){
				xmlStr += '<'+name+' ';
				for(nm in obj){
					if(!dojo.isObject(obj[nm])){
						xmlStr += nm+'="'+obj[nm]+'" ';
					}
				}
				xmlStr +='>';
				for(nm in obj){
					if(dojo.isObject(obj[nm])){
						xmlStr += parseObj(obj[nm], nm);
					}
				}
				xmlStr += '</'+name+'>';
			}
			return xmlStr;
		};
		return parseObj(obj, "data");
	},

	/*************************************
	 * Dojo.data Identity implementation *
	 *************************************/
	getIdentity: function(/* jsx3.xml.Entity */ item){
		//	summary:
		//		Returns the identifier for an item.
		//
		return this.getValue(item, this.identity); // String
	},

	getIdentityAttributes: function(/* jsx3.xml.Entity */ item){
		//	summary:
		//		Returns the property used for the identity.
		//
		return [this.identity]; // Array
	},


	fetchItemByIdentity: function(/* Object || String */ args){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity(keywordArgs)
		//
		//	Note:
		//		This method can be synchronous if mode is set.
		//		Also, there is a more finger friendly alias of this method, byId();
		if(dojo.isString(args)){
			var id = args;
			args = {query:"//record[@jsxid='"+id+"']", mode: dojox.data.SYNC_MODE};
		}else{
			if(args){
				args.query = "//record[@jsxid='"+args.identity+"']";
			}
			if(!args.mode){args.mode = this.mode;}
		}
		args.byId = true;
		return this.fetch(args); // dojo.Deferred || Array
	},
	byId: function(/* Object || String */ args){
		// stub. See fetchItemByIdentity
	}
	
});

return dojox.data.CdfStore;
});


},
'dojox/data/JsonQueryRestStore':function(){
define("dojox/data/JsonQueryRestStore", ["dojo", "dojox", "dojox/data/JsonRestStore", "dojox/data/util/JsonQuery", "dojox/data/ClientFilter", "dojox/json/query"], function(dojo, dojox) {

// this is an extension of JsonRestStore to convert object attribute queries to
// JSONQuery/JSONPath syntax to be sent to the server. This also enables
//	JSONQuery/JSONPath queries to be performed locally if dojox.data.ClientFilter
//	has been loaded
dojo.declare("dojox.data.JsonQueryRestStore",[dojox.data.JsonRestStore,dojox.data.util.JsonQuery],{
	matchesQuery: function(item,request){
		return item.__id && (item.__id.indexOf("#") == -1) && this.inherited(arguments);
	}
});

return dojox.data.JsonQueryRestStore;
});

},
'dojox/data/HtmlTableStore':function(){
define("dojox/data/HtmlTableStore", ["dojo/_base/kernel", "dojo/_base/declare", "dojo/_base/lang", "dojo/dom", "dojo/_base/array",
		"dojo/_base/xhr", "dojo/_base/sniff", "dojo/_base/window", "dojo/data/util/simpleFetch", 
		"dojo/data/util/filter", "dojox/xml/parser"], 
  function(kernel, declare, lang, dom, array, xhr, has, winUtil, simpleFetch, filter, xmlParser) {

var HtmlTableStore = declare("dojox.data.HtmlTableStore", null, {
	constructor: function(/*Object*/args){
		kernel.deprecated("dojox.data.HtmlTableStore", "Please use dojox.data.HtmlStore");
		//	summary:
		//		Initializer for the HTML table store.
		//	description:
		//		The HtmlTableStore can be created in one of two ways: a) by parsing an existing
		//		table DOM node on the current page or b) by referencing an external url and giving
		//		the id of the table in that page.  The remote url will be parsed as an html page.
		//
		//		The HTML table should be of the following form:
		//		<table id="myTable">
		//			<thead>
		//				<tr>
		//					<th>Attribute1</th>
		//					<th>Attribute2</th>
		//				</tr>
		//			</thead>
		//			<tbody>
		//				<tr>
		//					<td>Value1.1</td>
		//					<td>Value1.2</td>
		//				</tr>
		//				<tr>
		//					<td>Value2.1</td>
		//					<td>Value2.2</td>
		//				</tr>
		//			</tbody>
		//		</table>
		//
		//	args:
		//		An anonymous object to initialize properties.  It expects the following values:
		//		tableId:	The id of the HTML table to use.
		//		OR
		//		url:		The url of the remote page to load
		//		tableId:	The id of the table element in the remote page
		
		if(args.url){
			if(!args.tableId)
				throw new Error("dojo.data.HtmlTableStore: Cannot instantiate using url without an id!");
			this.url = args.url;
			this.tableId = args.tableId;
		}else{
			if(args.tableId){
				this._rootNode = dom.byId(args.tableId);
				this.tableId = this._rootNode.id;
			}else{
				this._rootNode = dom.byId(this.tableId);
			}
			this._getHeadings();
			for(var i=0; i<this._rootNode.rows.length; i++){
				this._rootNode.rows[i].store = this;
			}
		}
	},

	// url: [public] string
	//		The URL from which to load an HTML document for data loading
	url: "",
	
	// tableId: [public] string
	//		The id of the table to load as store contents.
	tableId: "",

	_getHeadings: function(){
		//	summary:
		//		Function to load the attribute names from the table header so that the
		//		attributes (cells in a row), can have a reasonable name.
		this._headings = [];
		array.forEach(this._rootNode.tHead.rows[0].cells, lang.hitch(this, function(th){
			this._headings.push(xmlParser.textContent(th));
		}));
	},
	
	_getAllItems: function(){
		//	summary:
		//		Function to return all rows in the table as an array of items.
		var items = [];
		for(var i=1; i<this._rootNode.rows.length; i++){
			items.push(this._rootNode.rows[i]);
		}
		return items; //array
	},
	
	_assertIsItem: function(/* item */ item){
		//	summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojo.data.HtmlTableStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* String */ attribute){
		//	summary:
		//      This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		//
		//	returns:
		//		Returns the index (column) that the attribute resides in the row.
		if(typeof attribute !== "string"){
			throw new Error("dojo.data.HtmlTableStore: a function was passed an attribute argument that was not an attribute name string");
			return -1;
		}
		return array.indexOf(this._headings, attribute); //int
	},

/***************************************
     dojo.data.api.Read API
***************************************/
	
	getValue: function(	/* item */ item,
						/* attribute-name-string */ attribute,
						/* value? */ defaultValue){
		//	summary:
		//      See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		return (values.length > 0)?values[0]:defaultValue; //Object || int || Boolean
	},

	getValues: function(/* item */ item,
						/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.getValues()

		this._assertIsItem(item);
		var index = this._assertIsAttribute(attribute);

		if(index>-1){
			return [xmlParser.textContent(item.cells[index])] ;
		}
		return []; //Array
	},

	getAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		for(var i=0; i<this._headings.length; i++){
			if(this.hasAttribute(item, this._headings[i]))
				attributes.push(this._headings[i]);
		}
		return attributes; //Array
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttribute()
		return this.getValues(item, attribute).length > 0;
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		//	summary:
		//		See dojo.data.api.Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = filter.patternToRegExp(value, false);
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
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; ++i){
			var possibleValue = values[i];
			if(typeof possibleValue === "string" && regexp){
				return (possibleValue.match(regexp) !== null);
			}else{
				//Non-string matching.
				if(value === possibleValue){
					return true; // Boolean
				}
			}
		}
		return false; // Boolean
	},

	isItem: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		if(something && something.store && something.store === this){
			return true; //boolean
		}
		return false; //boolean
	},

	isItemLoaded: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItemLoaded()
		return this.isItem(something);
	},

	loadItem: function(/* Object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Read.loadItem()
		this._assertIsItem(keywordArgs.item);
	},
	
	_fetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Fetch items (XML elements) that match to a query
		//	description:
		//		If '_fetchUrl' is specified, it is used to load an XML document
		//		with a query string.
		//		Otherwise and if 'url' is specified, the XML document is
		//		loaded and list XML elements that match to a query (set of element
		//		names and their text attribute values that the items to contain).
		//		A wildcard, "*" can be used to query values to match all
		//		occurrences.
		//		If '_rootItem' is specified, it is used to fetch items.
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error
		
		if(this._rootNode){
			this._finishFetchItems(request, fetchHandler, errorHandler);
		}else{
			if(!this.url){
				this._rootNode = dom.byId(this.tableId);
				this._getHeadings();
				for(var i=0; i<this._rootNode.rows.length; i++){
					this._rootNode.rows[i].store = this;
				}
			}else{
				var getArgs = {
						url: this.url,
						handleAs: "text"
					};
				var self = this;
				var getHandler = xhr.get(getArgs);
				getHandler.addCallback(function(data){
					var findNode = function(node, id){
						if(node.id == id){
							return node; //object
						}
						if(node.childNodes){
							for(var i=0; i<node.childNodes.length; i++){
								var returnNode = findNode(node.childNodes[i], id);
								if(returnNode){
									return returnNode; //object
								}
							}
						}
						return null; //null
					}

					var d = document.createElement("div");
					d.innerHTML = data;
					self._rootNode = findNode(d, self.tableId);
					self._getHeadings.call(self);
					for(var i=0; i<self._rootNode.rows.length; i++){
						self._rootNode.rows[i].store = self;
					}
					self._finishFetchItems(request, fetchHandler, errorHandler);
				});
				getHandler.addErrback(function(error){
					errorHandler(error, request);
				});
			}
		}
	},
	
	_finishFetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Internal function for processing the passed in request and locating the requested items.
		var items = null;
		var arrayOfAllItems = this._getAllItems();
		if(request.query){
			var ignoreCase = request.queryOptions ? request.queryOptions.ignoreCase : false;
			items = [];

			//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
			//same value for each item examined.  Much more efficient.
			var regexpList = {};
			var value;
			var key;
			for(key in request.query){
				value = request.query[key]+'';
				if(typeof value === "string"){
					regexpList[key] = filter.patternToRegExp(value, ignoreCase);
				}
			}

			for(var i = 0; i < arrayOfAllItems.length; ++i){
				var match = true;
				var candidateItem = arrayOfAllItems[i];
				for(key in request.query){
					value = request.query[key]+'';
					if(!this._containsValue(candidateItem, key, value, regexpList[key])){
						match = false;
					}
				}
				if(match){
					items.push(candidateItem);
				}
			}
			fetchHandler(items, request);
		}else{
			// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
			// of the internal list so that multiple callers can get listsand sort without affecting each other.
			if(arrayOfAllItems.length> 0){
				items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
			}
			fetchHandler(items, request);
		}
	},

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
	},
	
	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		//	summary:
		//		See dojo.data.api.Read.close()
		// nothing to do here!
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		if(this.isItem(item))
			return "Table Row #" + this.getIdentity(item);
		return undefined;
	},

	getLabelAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		return null;
	},

/***************************************
     dojo.data.api.Identity API
***************************************/

	getIdentity: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentity()
		this._assertIsItem(item);
		//Opera doesn't support the sectionRowIndex,
		//So, have to call the indexOf to locate it.
		//Blah.
		if(!has("opera")){
			return item.sectionRowIndex; // int
		}else{
			return (array.indexOf(this._rootNode.rows, item) - 1) // int
		}
	},

	getIdentityAttributes: function(/* item */ item){
		 //	summary:
		 //		See dojo.data.api.Identity.getIdentityAttributes()
		 //Identity isn't taken from a public attribute.
		 return null;
	},

	fetchItemByIdentity: function(keywordArgs){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()
		var identity = keywordArgs.identity;
		var self = this;
		var item = null;
		var scope = null;

		if(!this._rootNode){
			if(!this.url){
				this._rootNode = dom.byId(this.tableId);
				this._getHeadings();
				for(var i=0; i<this._rootNode.rows.length; i++){
					this._rootNode.rows[i].store = this;
				}
				item = this._rootNode.rows[identity+1];
				if(keywordArgs.onItem){
					scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
					keywordArgs.onItem.call(scope, item);
				}

			}else{
				var getArgs = {
						url: this.url,
						handleAs: "text"
					};
				var getHandler = xhr.get(getArgs);
				getHandler.addCallback(function(data){
					var findNode = function(node, id){
						if(node.id == id){
							return node; //object
						}
						if(node.childNodes){
							for(var i=0; i<node.childNodes.length; i++){
								var returnNode = findNode(node.childNodes[i], id);
								if(returnNode){
									return returnNode; //object
								}
							}
						}
						return null; //null
					}
					var d = document.createElement("div");
					d.innerHTML = data;
					self._rootNode = findNode(d, self.tableId);
					self._getHeadings.call(self);
					for(var i=0; i<self._rootNode.rows.length; i++){
						self._rootNode.rows[i].store = self;
					}
					item = self._rootNode.rows[identity+1];
					if(keywordArgs.onItem){
						scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
						keywordArgs.onItem.call(scope, item);
					}
				});
				getHandler.addErrback(function(error){
					if(keywordArgs.onError){
						scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
						keywordArgs.onError.call(scope, error);

					}
				});
			}
		}else{
			if(this._rootNode.rows[identity+1]){
				item = this._rootNode.rows[identity+1];
				if(keywordArgs.onItem){
					scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
					keywordArgs.onItem.call(scope, item);
				}
			}
		}
	}
});
lang.extend(HtmlTableStore,simpleFetch);

return HtmlTableStore;
});

},
'dojox/data/CouchDBRestStore':function(){
define("dojox/data/CouchDBRestStore", ["dojo", "dojox", "dojox/data/JsonRestStore"], function(dojo, dojox) {

// A CouchDBRestStore is an extension of JsonRestStore to handle CouchDB's idiosyncrasies, special features,
// and deviations from standard HTTP Rest.
// NOTE: CouchDB is not designed to be run on a public facing network. There is no access control
// on database documents, and you should NOT rely on client side control to implement security.


dojo.declare("dojox.data.CouchDBRestStore",
	dojox.data.JsonRestStore,
	{
		save: function(kwArgs){
			var actions = this.inherited(arguments); // do the default save and then update for version numbers
			var prefix = this.service.servicePath;
			for(var i = 0; i < actions.length; i++){
				// need to update the item's version number after it has been committed
				(function(item,dfd){
					dfd.addCallback(function(result){
						if(result){
							item.__id = prefix + result.id; // update the object with the results of the post
							item._rev = result.rev;
						}
						return result;
					});
				})(actions[i].content,actions[i].deferred);
			}
		},
		fetch: function(args){
			// summary:
			// 		This only differs from JsonRestStore in that it, will put the query string the query part of the URL and it handles start and count
			args.query = args.query || '_all_docs?';
			if(args.start){
				args.query = (args.query ? (args.query + '&') : '') + 'startkey=' + args.start;
				delete args.start;
			}
			if(args.count){
				args.query = (args.query ? (args.query + '&') : '') + 'limit=' + args.count;
				delete args.count;
			}
			return this.inherited(arguments);
		},
		_processResults: function(results){
			var rows = results.rows;
			if(rows){
				var prefix = this.service.servicePath;
				var self = this;
				for(var i = 0; i < rows.length;i++){
					var realItem = rows[i].value;
					realItem.__id= prefix + rows[i].id;
					realItem._id= rows[i].id;
					realItem._loadObject= dojox.rpc.JsonRest._loader;
					rows[i] = realItem;
				}
				return {totalCount:results.total_rows, items:results.rows};
			}else{
				return {items:results};
			}

		}
	}
);

// create a set of stores
dojox.data.CouchDBRestStore.getStores = function(couchServerUrl){
	var dfd = dojo.xhrGet({
		url: couchServerUrl+"_all_dbs",
		handleAs: "json",
		sync: true
	});
	var stores = {};
	dfd.addBoth(function(dbs){
		for(var i = 0; i < dbs.length; i++){
			stores[dbs[i]] = new dojox.data.CouchDBRestStore({target:couchServerUrl + dbs[i],idAttribute:"_id"});
		}
		return stores;
	});
	return stores;
};

return dojox.data.CouchDBRestStore;

});

},
'dojox/data/GoogleFeedStore':function(){
define("dojox/data/GoogleFeedStore", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojox/data/GoogleSearchStore"], 
  function(dojo, lang, declare, GoogleSearchStore) {

dojo.experimental("dojox.data.GoogleFeedStore");

/*===== var Search = dojox.data.GoogleSearchStore =====*/
var Search = GoogleSearchStore.Search;

return declare("dojox.data.GoogleFeedStore", Search,{
	// summary:
	//	A data store for retrieving RSS and Atom feeds from Google. The
	//  feeds can come from any source, which is specified in the "url"
	//  parameter of the query passed to the "fetch" function.
	//	The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The feed entry title.</li>
	//			<li>link - The URL for the HTML version of the feed entry.</li>
	//			<li>content - The full content of the blog post, in HTML format</li>
	//			<li>summary - A snippet of information about the feed entry, in plain text</li>
	//			<li>published - The string date on which the entry was published.
	//				You can parse the date with new Date(store.getValue(item, "published")</li>
	//			<li>categories - An array of string tags for the entry</li>
	//		</ul>
	//	The query accepts one parameter: url - The URL of the feed to retrieve
	_type: "",
	_googleUrl: "http://ajax.googleapis.com/ajax/services/feed/load",
	_attributes: ["title", "link", "author", "published",
			"content", "summary", "categories"],
	_queryAttrs: {
		"url":"q"
	},
	
	getFeedValue: function(attribute, defaultValue){
		// summary:
		//		Non-API method for retrieving values regarding the Atom feed,
		//		rather than the Atom entries.
		var values = this.getFeedValues(attribute, defaultValue);
		if(lang.isArray(values)){
			return values[0];
		}
		return values;
	},

	getFeedValues: function(attribute, defaultValue){
		// summary:
		//		Non-API method for retrieving values regarding the Atom feed,
		//		rather than the Atom entries.
		if(!this._feedMetaData){
			return defaultValue;
		}
		return this._feedMetaData[attribute] || defaultValue;
	},

	_processItem: function(item, request) {
		this.inherited(arguments);
		item["summary"] = item["contentSnippet"];
		item["published"] = item["publishedDate"];
	},

	_getItems: function(data){
		if(data['feed']){
			this._feedMetaData = {
				title: data.feed.title,
				desc: data.feed.description,
				url: data.feed.link,
				author: data.feed.author
			};
			return data.feed.entries;
		}
		return null;
	},

	_createContent: function(query, callback, request){
		var cb = this.inherited(arguments);
		cb.num = (request.count || 10) + (request.start || 0);
		return cb;
	}
});

});

},
'dojox/rpc/ProxiedPath':function(){
define("dojox/rpc/ProxiedPath", ["dojo", "dojox", "dojox/rpc/Service"], function(dojo, dojox) {

dojox.rpc.envelopeRegistry.register(
	"PROXIED-PATH",function(str){return str == "PROXIED-PATH"},{
		serialize:function(smd, method, data){
			var i;
			var target = dojox.rpc.getTarget(smd, method);
			if(dojo.isArray(data)){
				for(i = 0; i < data.length;i++){
					target += '/' + (data[i] == null ? "" : data[i]);
				}
			}else{
				for(i in data){
					target += '/' + i + '/' + data[i];
				}
			}
			return {
				data:'',
				target: (method.proxyUrl || smd.proxyUrl) + "?url=" + encodeURIComponent(target)
			};
		},
		deserialize:function(results){
			return results;
		}
	}
);

});

},
'dojox/atom/io/Connection':function(){
define("dojox/atom/io/Connection", [
	"dojo/_base/kernel",
	"dojo/_base/xhr",
	"dojo/_base/window",
	"./model",
	"dojo/_base/declare"], function (dojo, xhrUtil, windowUtil, model) {
return dojo.declare("dojox.atom.io.Connection",null,{
	// summary: This object implements a transport layer for working with ATOM feeds and ATOM publishing protocols.
	// description: This object implements a transport layer for working with ATOM feeds and ATOM publishing protocols.
	//   Specifically, it provides a mechanism by which feeds can be fetched and entries can be fetched, created
	//   deleted, and modified.  It also provides access to the introspection data.

	constructor: function(/* Boolean */sync, /* Boolean */preventCache){
		// 	summary:
		//		initializer
		this.sync = sync;
		this.preventCache = preventCache;
	},

	preventCache: false, //Flag to denote if the instance should use the xhr prevent cache mechanism

	alertsEnabled: false, //Flag to turn on alerts instead of throwing errors.

	getFeed: function(/*String*/url, /*Function*/callback, /*Function*/errorCallback, scope){
		// 	summary:
		//		Function to obtain a s specific ATOM feed from a given ATOM Feed url.
		//	description:
		//		This function takes the URL for a specific ATOM feed and returns
		//		the data from that feed to the caller through the use of a callback
		//		handler.
		//
		// 	url: String
		//		The URL of the ATOM feed to fetch.
		//	callback:
		//		Function
		//		A function reference that will handle the feed when it has been retrieved.
		//		The callback should accept two parameters:  The feed object and the original complete DOM object.
		//	scope: Object
		//		The scope to use for all callbacks.
		//
		//	returns:
		//		Nothing. The return is handled through the callback handler.
		this._getXmlDoc(url, "feed", new model.Feed(), model._Constants.ATOM_NS, callback, /*handleDocumentRetrieved,*/ errorCallback, scope);
	},
	
	getService: function(url, callback, errorCallback, scope){
		//	summary:
		//		Function to retrieve an introspection document from the given URL.
		// 	description:
		//		This function takes the URL for an ATOM item and feed and returns
		//		the introspection document.
		//
		//	url:
		//		String
		//		The URL of the ATOM document to obtain the introspection document of.
		//	callback:
		//		Function
		//		A function reference that will handle the introspection document when it has been retrieved.
		//		The callback should accept two parameters:  The introspection document object and the original complete DOM object.
		//
		//	returns:
		//		Nothing. The return is handled through the callback handler.
		this._getXmlDoc(url, "service", new model.Service(url), model._Constants.APP_NS, callback, errorCallback, scope);
	},
	
	getEntry: function(url, callback, errorCallback, scope){
		//	summary:
		//		Function to retrieve a single entry from an ATOM feed from the given URL.
		//	description:
		//		This function takes the URL for an ATOM entry and returns the constructed dojox.atom.io.model.Entry object through
		//		the specified callback.
		//
		//	url:
		//		String
		//		The URL of the ATOM Entry document to parse.
		//	callback:
		//		Function
		//		A function reference that will handle the Entry object obtained.
		//		The callback should accept two parameters, the dojox.atom.io.model.Entry object and the original dom.
		//
		//	returns:
		//		Nothing. The return is handled through the callback handler.
		this._getXmlDoc(url, "entry", new model.Entry(), model._Constants.ATOM_NS, callback, errorCallback, scope);
	},

	_getXmlDoc: function(url, nodeName, newNode, namespace, callback, errorCallback, scope){
		//	summary:
		//		Internal Function to retrieve an XML document and pass the results to a callback.
		//	description:
		//		This internal function takes the URL for an XML document and and passes the
		//		parsed contents to a specified callback.
		//
		//	url:
		//		String
		//		The URL of the XML document to retrieve
		//	callback:
		//		Function
		//		A function reference that will handle the retrieved XML data.
		//		The callback should accept one parameter, the DOM of the parsed XML document.
		//
		//	returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = windowUtil.global;
		}
		var ae = this.alertsEnabled;
		var xhrArgs = {
			url: url,
			handleAs: "xml",
			sync: this.sync,
			preventCache: this.preventCache,
			load: function(data, args){
				var node	 = null;
				var evaldObj = data;
				var nodes;
				if(evaldObj){
					//find the first node of the appropriate name
					if(typeof(evaldObj.getElementsByTagNameNS)!= "undefined"){
						nodes = evaldObj.getElementsByTagNameNS(namespace,nodeName);
						if(nodes && nodes.length > 0){
							node = nodes.item(0);
						}else if(evaldObj.lastChild){
							// name_spaces can be used without declaration of atom (for example
							// gooogle feeds often returns iTunes name_space qualifiers on elements)
							// Treat this situation like name_spaces not enabled.
							node = evaldObj.lastChild;
						}
					}else if(typeof(evaldObj.getElementsByTagName)!= "undefined"){
						// Find the first eith the correct tag name and correct namespace.
						nodes = evaldObj.getElementsByTagName(nodeName);
						if(nodes && nodes.length > 0){
							for(var i=0; i<nodes.length; i++){
								if(nodes[i].namespaceURI == namespace){
									node = nodes[i];
									break;
								}
							}
						}else if(evaldObj.lastChild){
							node = evaldObj.lastChild;
						}
					}else if(evaldObj.lastChild){
						node = evaldObj.lastChild;
					}else{
						callback.call(scope, null, null, args);
						return;
					}
					newNode.buildFromDom(node);
					if(callback){
						callback.call(scope, newNode, evaldObj, args);
					}else if(ae){
						throw new Error("The callback value does not exist.");
					}
				}else{
					callback.call(scope, null, null, args);
				}
			}
		};

		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}
		xhrUtil.get(xhrArgs);
	},

	updateEntry: function(entry, callback, errorCallback, retrieveUpdated, xmethod, scope){
		//	summary:
		//		Function to update a specific ATOM entry by putting the new changes via APP.
		//	description:
		//		This function takes a specific dojox.atom.io.model.Entry object and pushes the
		//		changes back to the provider of the Entry.
		//		The entry MUST have a link tag with rel="edit" for this to work.
		//
		//	entry:
		//		Object
		//		The dojox.atom.io.model.Entry object to update.
		//	callback:
		//		Function
		//		A function reference that will handle the results from the entry update.
		//		The callback should accept two parameters:  The first is an Entry object, and the second is the URL of that Entry
		//		Either can be null, depending on the value of retrieveUpdated.
		//	retrieveUpdated:
		//		boolean
		//		A boolean flag denoting if the entry that was updated should then be
		//		retrieved and returned to the caller via the callback.
		//	xmethod:
		//		boolean
		//		Whether to use POST for PUT/DELETE items and send the X-Method-Override header.
		//	scope:
		//		Object
		//		The scope to use for all callbacks.
		//
		//	returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = windowUtil.global;
		}
		entry.updated = new Date();
		var url = entry.getEditHref();
		if(!url){
			throw new Error("A URL has not been specified for editing this entry.");
		}

		var self = this;
		var ae = this.alertsEnabled;
		var xhrArgs = {
			url: url,
			handleAs: "text",
			contentType: "text/xml",
			sync: this.sync,
			preventCache: this.preventCache,
			load: function(data, args){
				var location = null;
				if(retrieveUpdated){
					location = args.xhr.getResponseHeader("Location");
					if(!location){location = url;}

					//Function to handle the callback mapping of a getEntry after an update to return the
					//entry and location.
					var handleRetrieve = function(entry, dom, args){
						if(callback){
							callback.call(scope, entry, location, args);
						}else if(ae){
							throw new Error("The callback value does not exist.");
						}
					};
					self.getEntry(location,handleRetrieve);
				}else{
					if(callback){
						callback.call(scope, entry, args.xhr.getResponseHeader("Location"), args);
					}else if(ae){
						throw new Error("The callback value does not exist.");
					}
				}
				return data;
			}
		};
		
		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}

		if(xmethod){
			xhrArgs.postData = entry.toString(true); //Set the content to send.
			xhrArgs.headers = {"X-Method-Override": "PUT"};
			xhrUtil.post(xhrArgs);
		}else{
			xhrArgs.putData = entry.toString(true); //Set the content to send.
			var xhr = xhrUtil.put(xhrArgs);
		}
	},

	addEntry: function(entry, url, callback, errorCallback, retrieveEntry, scope){
		//	summary:
		//		Function to add a new ATOM entry by posting the new entry via APP.
		//	description:
		//		This function takes a specific dojox.atom.io.model.Entry object and pushes the
		//		changes back to the provider of the Entry.
		//
		//	entry:
		//		Object
		//		The dojox.atom.io.model.Entry object to publish.
		//	callback:
		//		Function
		//		A function reference that will handle the results from the entry publish.
		//		The callback should accept two parameters:   The first is an dojox.atom.io.model.Entry object, and the second is the location of the entry
		//		Either can be null, depending on the value of retrieveUpdated.
		//	retrieveEntry:
		//		boolean
		//		A boolean flag denoting if the entry that was created should then be
		//		retrieved and returned to the caller via the callback.
		//	scope:
		//		Object
		//	 	The scope to use for all callbacks.
		//
		//	returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = windowUtil.global;
		}

		entry.published = new Date();
		entry.updated = new Date();

		var feedUrl = entry.feedUrl;
		var ae = this.alertsEnabled;

		//Determine which URL to use for the post.
		if(!url && feedUrl){url = feedUrl;}
		if(!url){
			if(ae){
				throw new Error("The request cannot be processed because the URL parameter is missing.");
			}
			return;
		}

		var self = this;
		var xhrArgs = {
			url: url,
			handleAs: "text",
			contentType: "text/xml",
			sync: this.sync,
			preventCache: this.preventCache,
			postData: entry.toString(true),
			load: function(data, args){
				var location = args.xhr.getResponseHeader("Location");
				if(!location){
					location = url;
				}
				if(!args.retrieveEntry){
					if(callback){
						callback.call(scope, entry, location, args);
					}else if(ae){
						throw new Error("The callback value does not exist.");
					}
				}else{
					//Function to handle the callback mapping of a getEntry after an update to return the
					//entry and location.
					var handleRetrieve = function(entry, dom, args){
						if(callback){
							callback.call(scope, entry, location, args);
						}else if(ae){
							throw new Error("The callback value does not exist.");
						}
					};
					self.getEntry(location,handleRetrieve);
				}
				return data;
			}
		};

		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}
		xhrUtil.post(xhrArgs);
	},

	deleteEntry: function(entry,callback,errorCallback,xmethod,scope){
		//	summary:
		//		Function to delete a specific ATOM entry via APP.
		//	description:
		//		This function takes a specific dojox.atom.io.model.Entry object and calls for a delete on the
		//		service housing the ATOM Entry database.
		//		The entry MUST have a link tag with rel="edit" for this to work.
		//
		//	entry:
		//		Object
		//		The dojox.atom.io.model.Entry object to delete.
		//	callback:
		//		Function
		//		A function reference that will handle the results from the entry delete.
		//		The callback is called only if the delete is successful.
		//
		//	returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = windowUtil.global;
		}

		var url = null;
		if(typeof(entry) == "string"){
			url = entry;
		}else{
			url = entry.getEditHref();
		}
		if(!url){
			callback.call(scope, false, null);
			throw new Error("The request cannot be processed because the URL parameter is missing.");
		}

		var xhrArgs = {
			url: url,
			handleAs: "text",
			sync: this.sync,
			preventCache: this.preventCache,
			load: function(data, args){
				callback.call(scope, args);
				return data;
			}
		};

		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}
		if(xmethod){
			xhrArgs.headers = {"X-Method-Override": "DELETE"};
			dhxr.post(xhrArgs);
		}else{
			xhrUtil.del(xhrArgs);
		}
	}
});
});
},
'dojox/data/css':function(){
define("dojox/data/css", ["dojo/_base/lang", "dojo/_base/array"], 
  function(lang, array) {

var css = lang.getObject("dojox.data.css",true) 

css.rules = {};

css.rules.forEach = function(fn,ctx,context){
	if(context){
		var _processSS = function(styleSheet){
			//iterate across rules in the stylesheet
			array.forEach(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
				if(!rule.type || rule.type !== 3){// apply fn to current rule with approp ctx. rule is arg (all browsers)
					var href = "";
					if(styleSheet && styleSheet.href){
						href = styleSheet.href;
					}
					fn.call(ctx?ctx:this,rule, styleSheet, href);
				}
			});
			//process any child stylesheets
		};
		array.forEach(context,_processSS);
	}
};

css.findStyleSheets = function(sheets){
	// Takes an array of stylesheet paths and finds the currently loaded StyleSheet objects matching
	// those names
	var sheetObjects = [];
	var _processSS = function(styleSheet){
		var s = css.findStyleSheet(styleSheet);
		if(s){
			array.forEach(s, function(sheet){
				if(array.indexOf(sheetObjects, sheet) === -1){
					sheetObjects.push(sheet);
				}
			});
		}
	};
	array.forEach(sheets, _processSS);
	return sheetObjects;
};

css.findStyleSheet = function(sheet){
	// Takes a stylesheet path and finds the currently loaded StyleSheet objects matching
	// those names (and it's parent(s), if it is imported from another)
	var sheetObjects = [];
	if(sheet.charAt(0) === '.'){
		sheet = sheet.substring(1);
	}
	var _processSS = function(styleSheet){
		if(styleSheet.href && styleSheet.href.match(sheet)){
			sheetObjects.push(styleSheet);
			return true;
		}
		if(styleSheet.imports){
			return array.some(styleSheet.imports, function(importedSS){ //IE stylesheet has imports[] containing @import'ed rules
				//console.debug("Processing IE @import rule",importedSS);
				return _processSS(importedSS);
			});
		}
		//iterate across rules in the stylesheet
		return array.some(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
			if(rule.type && rule.type === 3 && _processSS(rule.styleSheet)){// CSSImportRule (firefox)
				//sheetObjects.push(styleSheet);
				return true;
			}
			return false;
		});
	};
	array.some(document.styleSheets, _processSS);
	return sheetObjects;
};

css.determineContext = function(initialStylesheets){
	// Takes an array of stylesheet paths and returns an array of all stylesheets that fall in the
	// given context.  If no paths are given, all stylesheets are returned.
	var ret = [];
	if(initialStylesheets && initialStylesheets.length > 0){
		initialStylesheets = css.findStyleSheets(initialStylesheets);
	}else{
		initialStylesheets = document.styleSheets;
	}
	var _processSS = function(styleSheet){
		ret.push(styleSheet);
		if(styleSheet.imports){
			array.forEach(styleSheet.imports, function(importedSS){ //IE stylesheet has imports[] containing @import'ed rules
				//console.debug("Processing IE @import rule",importedSS);
				_processSS(importedSS);
			});
		}
		//iterate across rules in the stylesheet
		array.forEach(styleSheet[styleSheet.cssRules?"cssRules":"rules"], function(rule){
			if(rule.type && rule.type === 3){// CSSImportRule (firefox)
				_processSS(rule.styleSheet);
			}
		});
	};
	array.forEach(initialStylesheets,_processSS);
	return ret;
};

return css;

});

},
'dojox/data/FileStore':function(){
define("dojox/data/FileStore", ["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/window", "dojo/_base/json", "dojo/_base/xhr"], 
  function(declare, lang, winUtil, jsonUtil, xhr) {

return declare("dojox.data.FileStore", null, {
	constructor: function(/*Object*/args){
		//	summary:
		//		A simple store that provides a datastore interface to a filesystem.
		//	description:
		//		A simple store that provides a datastore interface to a filesystem.  It takes a few parameters
		//		for initialization:
		//			url:	The URL of the service which provides the file store serverside implementation.
		//			label:	The attribute of the file to use as the huma-readable text.  Default is 'name'.
		//		The purpose of this store is to represent a file as a datastore item.  The
		//		datastore item by default has the following attributes that can be examined on it.
		//			directory:	Boolean indicating if the file item represents a directory.
		//			name:	The filename with no path informatiom.
		//			path:	The file complete file path including name, relative to the location the
		//					file service scans from
		//			size:	The size of the file, in bytes.
		//			parentDir:	The parent directory path.
		//			children:	Any child files contained by a directory file item.
		//
		//		Note that the store's server call pattern is RESTlike.
		//
		//		The store also supports the passing of configurable options to the back end service, such as
		//		expanding all child files (no lazy load), displaying hidden files, displaying only directories, and so on.
		//		These are defined through a comma-separated list in declarative, or through setting the options array in programmatic.
		//		example:	options="expand,dirsOnly,showHiddenFiles"
		if(args && args.label){
			this.label = args.label;
		}
		if(args && args.url){
			this.url = args.url;
		}
		if(args && args.options){
			if(lang.isArray(args.options)){
				this.options = args.options;
			}else{
				if(lang.isString(args.options)){
					this.options = args.options.split(",");
				}
			}
		}
		if(args && args.pathAsQueryParam){
			this.pathAsQueryParam = true;
		}
		if(args && "urlPreventCache" in args){
			this.urlPreventCache = args.urlPreventCache?true:false;
		}
	},

	// url: [public] string
	//		The URL to the file path service.
	url: "",
	
	// _storeRef: [private] string
	//		Internal variable used to denote an item came from this store instance.
	_storeRef: "_S",

	// label: [public] string
	//		Default attribute to use to represent the item as a user-readable
	//		string.  Public, so users can change it.
	label: "name",

	// _identifier: [private] string
	//		Default attribute to use to represent the item's identifier.
	//		Path should always be unique in the store instance.
	_identifier: "path",

	// _attributes: [private] string
	//		Internal variable of attributes all file items should have.
	_attributes: ["children", "directory", "name", "path", "modified", "size", "parentDir"], //
	
	// pathSeparator: [public] string
	//		The path separator to use when chaining requests for children
	//		Can be overriden by the server on initial load
	pathSeparator: "/",

	// options: [public] array
	//		Array of options to always send when doing requests.
	//		Back end service controls this, like 'dirsOnly', 'showHiddenFiles', 'expandChildren', etc.
	options: [],

	// failOk: [public] boolean
	//		Flag to pass on to xhr functions to check if we are OK to fail the call silently
	failOk: false,

	// urlPreventCache: [public] string
	//		Flag to dennote if preventCache should be passed to xhrGet.
	urlPreventCache: true,

	_assertIsItem: function(/* item */ item){
		// summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.FileStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		// summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.FileStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	pathAsQueryParam: false, //Function to switch between REST style URL lookups and passing the path to specific items as a query param: 'path'.

	getFeatures: function(){
		// summary:
		//      See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true, 'dojo.data.api.Identity':true
		};
	},

	getValue: function(item, attribute, defaultValue){
		// summary:
		//      See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		// summary:
		//      See dojo.data.api.Read.getAttributes()
		return this._attributes;
	},

	hasAttribute: function(item, attribute){
		// summary:
		//      See dojo.data.api.Read.hasAttribute()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		return (attribute in item);
	},
	
	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Identity.getIdentity()
		return this.getValue(item, this._identifier);
	},
	
	getIdentityAttributes: function(item){
		// summary:
		//      See dojo.data.api.Read.getLabelAttributes()
		return [this._identifier];
	},


	isItemLoaded: function(item){
		 //	summary:
		 //      See dojo.data.api.Read.isItemLoaded()
		 var loaded = this.isItem(item);
		 if(loaded && typeof item._loaded == "boolean" && !item._loaded){
		 	loaded = false;
		 }
		 return loaded;
	},

	loadItem: function(keywordArgs){
		// summary:
		//      See dojo.data.api.Read.loadItem()
		var item = keywordArgs.item;
		var self = this;
		var scope = keywordArgs.scope || winUtil.global;

		var content = {};

		if(this.options.length > 0){
			content.options = jsonUtil.toJson(this.options);
		}

		if(this.pathAsQueryParam){
			content.path = item.parentPath + this.pathSeparator + item.name;
		}
		var xhrData = {
			url: this.pathAsQueryParam? this.url : this.url + "/" + item.parentPath + "/" + item.name,
			handleAs: "json-comment-optional",
			content: content,
			preventCache: this.urlPreventCache,
			failOk: this.failOk
		};

		var deferred = xhr.get(xhrData);
		deferred.addErrback(function(error){
				if(keywordArgs.onError){
					keywordArgs.onError.call(scope, error);
				}
		});
		
		deferred.addCallback(function(data){
			delete item.parentPath;
			delete item._loaded;
			lang.mixin(item, data);
			self._processItem(item);
			if(keywordArgs.onItem){
				keywordArgs.onItem.call(scope, item);
			}
		});
	},

	getLabel: function(item){
		// summary:
		//      See dojo.data.api.Read.getLabel()
		return this.getValue(item,this.label);
	},
	
	getLabelAttributes: function(item){
		// summary:
		//      See dojo.data.api.Read.getLabelAttributes()
		return [this.label];
	},
	
	containsValue: function(item, attribute, value){
		// summary:
		//      See dojo.data.api.Read.containsValue()
		var values = this.getValues(item,attribute);
		for(var i = 0; i < values.length; i++){
			if(values[i] == value){
				return true;
			}
		}
		return false;
	},

	getValues: function(item, attribute){
		// summary:
		//      See dojo.data.api.Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		
		var value = item[attribute];
		if(typeof value !== "undefined" && !lang.isArray(value)){
			value = [value];
		}else if(typeof value === "undefined"){
			value = [];
		}
		return value;
	},

	isItem: function(item){
		// summary:
		//      See dojo.data.api.Read.isItem()
		if(item && item[this._storeRef] === this){
			return true;
		}
		return false;
	},
	
	close: function(request){
		// summary:
		//      See dojo.data.api.Read.close()
	},

	fetch: function(request){
		// summary:
		//		Fetch  items that match to a query
		// request:
		//		A request object

		request = request || {};
		if(!request.store){
			request.store = this;
		}
		var self = this;
		var scope = request.scope || winUtil.global;

		//Generate what will be sent over.
		var reqParams = {};
		if(request.query){
			reqParams.query = jsonUtil.toJson(request.query);
		}

		if(request.sort){
			reqParams.sort = jsonUtil.toJson(request.sort);
		}

		if(request.queryOptions){
			reqParams.queryOptions = jsonUtil.toJson(request.queryOptions);
		}

		if(typeof request.start == "number"){
			reqParams.start = "" + request.start;
		}
		if(typeof request.count == "number"){
			reqParams.count = "" + request.count;
		}

		if(this.options.length > 0){
			reqParams.options = jsonUtil.toJson(this.options);
		}

		var getArgs = {
			url: this.url,
			preventCache: this.urlPreventCache,
			failOk: this.failOk,
			handleAs: "json-comment-optional",
			content: reqParams
		};


		var deferred = xhr.get(getArgs);

		deferred.addCallback(function(data){self._processResult(data, request);});
		deferred.addErrback(function(error){
			if(request.onError){
				request.onError.call(scope, error, request);
			}
		});
	},

	fetchItemByIdentity: function(keywordArgs){
		// summary:
		//      See dojo.data.api.Read.loadItem()
		var path = keywordArgs.identity;
		var self = this;
		var scope = keywordArgs.scope || winUtil.global;

		var content = {};

		if(this.options.length > 0){
			content.options = jsonUtil.toJson(this.options);
		}

		if(this.pathAsQueryParam){
			content.path = path;
		}
		var xhrData = {
			url: this.pathAsQueryParam? this.url : this.url + "/" + path,
			handleAs: "json-comment-optional",
			content: content,
			preventCache: this.urlPreventCache,
			failOk: this.failOk
		};

		var deferred = xhr.get(xhrData);
		deferred.addErrback(function(error){
				if(keywordArgs.onError){
					keywordArgs.onError.call(scope, error);
				}
		});
		
		deferred.addCallback(function(data){
			var item = self._processItem(data);
			if(keywordArgs.onItem){
				keywordArgs.onItem.call(scope, item);
			}
		});
	},

	_processResult: function(data, request){
		 var scope = request.scope || winUtil.global;
		 try{
			 //If the data contains a path separator, set ours
			 if(data.pathSeparator){
				 this.pathSeparator = data.pathSeparator;
			 }
			 //Invoke the onBegin handler, if any, to return the
			 //size of the dataset as indicated by the service.
			 if(request.onBegin){
				 request.onBegin.call(scope, data.total, request);
			 }
			 //Now process all the returned items thro
			 var items = this._processItemArray(data.items);
			 if(request.onItem){
				var i;
				for(i = 0; i < items.length; i++){
					request.onItem.call(scope, items[i], request);
				}
				items = null;
			 }
			 if(request.onComplete){
				 request.onComplete.call(scope, items, request);
			 }
		 }catch (e){
			 if(request.onError){
				 request.onError.call(scope, e, request);
			 }else{
				 console.log(e);
			 }
		 }
	},
	
	_processItemArray: function(itemArray){
		 //	summary:
		 //		Internal function for processing an array of items for return.
		 var i;
		 for(i = 0; i < itemArray.length; i++){
		 	this._processItem(itemArray[i]);
		 }
		 return itemArray;
	},
	
	_processItem: function(item){
		//	summary:
		//		Internal function for processing an item returned from the store.
		//		It sets up the store ref as well as sets up the attributes necessary
		//		to invoke a lazy load on a child, if there are any.
		if(!item){return null;}
		item[this._storeRef] = this;
		if(item.children && item.directory){
			if(lang.isArray(item.children)){
				var children = item.children;
				var i;
				for(i = 0; i < children.length; i++ ){
					var name = children[i];
					if(lang.isObject(name)){
						children[i] = this._processItem(name);
					}else{
						children[i] = {name: name, _loaded: false, parentPath: item.path};
						children[i][this._storeRef] = this;
					}
				}
			}else{
				delete item.children;
			}
		}
		return item;
	}
});
});

},
'dojox/data/AndOrWriteStore':function(){
define("dojox/data/AndOrWriteStore", ["dojo/_base/declare","dojo/_base/lang","dojo/_base/array", "dojo/_base/json", "dojo/date/stamp",
		"dojo/_base/window", "./AndOrReadStore"], 
  function(declare, lang, arrayUtil, json, dateStamp, winUtil, AndOrReadStore) {
/*===== var AndOrReadStore = dojox.data.AndOrReadStore; =====*/

return declare("dojox.data.AndOrWriteStore", AndOrReadStore, {
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

		// AndOrWriteStore duplicates ItemFileWriteStore, except extends AndOrReadStore, which offers complex queries.
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
		var identifierAttribute = this.getFeatures()['dojo.data.api.Identity'];
		// this._assert((identifierAttribute === Number) || (dojo.isString(identifierAttribute)));
		return identifierAttribute;
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
								this._setValueOrValues(containingItem, attribute, newValues);
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
				var newValues = newValueOrValues;
				// Unfortunately, it's not safe to just do this:
				//    newValueArray = newValues;
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

	_removeReferenceFromMap: function(/* item */ refItem, /* item */ parentItem, /*strin*/ attribute){
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
				console.log("Item: [" + this.getIdentity(item) + "] is referenced by: " + json.toJson(item[this._reverseRefMap]));
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
			var item = value;
			// Given an item, return an serializable object that provides a
			// reference to the item.
			// For example, given kermit:
			//    var kermit = store.newItem({id:2, name:"Kermit"});
			// we want to return
			//    {_reference:2}
			var identity = this.getIdentity(item);
			var referenceObject = {_reference: identity};
			return referenceObject;
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
						var attribute = key;
						var valueArray = this.getValues(item, attribute);
						if(valueArray.length == 1){
							serializableItem[attribute] = this._flatten(valueArray[0]);
						}else{
							var serializableArray = [];
							for(var j = 0; j < valueArray.length; ++j){
								serializableArray.push(this._flatten(valueArray[j]));
								serializableItem[attribute] = serializableArray;
							}
						}
					}
				}
				serializableStructure.items.push(serializableItem);
			}
		}
		var prettyPrint = true;
		return json.toJson(serializableStructure, prettyPrint);
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
				var scope = keywordArgs.scope || winUtil.global;
				keywordArgs.onComplete.call(scope);
			}
		};
		var saveFailedCallback = function(){
			self._saveInProgress = false;
			if(keywordArgs && keywordArgs.onError){
				var scope = keywordArgs.scope || winUtil.global;
				keywordArgs.onError.call(scope);
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
			for(key in modifiedItem){
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
			if(!this._isEmpty(this._pending._newItems) ||
				!this._isEmpty(this._pending._modifiedItems) ||
				!this._isEmpty(this._pending._deletedItems)){
				return true;
			}
			return false; // boolean
		}
	},

/* dojo.data.api.Notification */

	onSet: function(/* item */ item,
					/*attribute-name-string*/ attribute,
					/*object | array*/ oldValue,
					/*object | array*/ newValue){
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
				throw new Error("dojox.data.AndOrWriteStore: There are unsaved changes present in the store.  Please save or revert the changes before invoking close.");
			}
		}
	}
});

});

},
'dojox/data/HtmlStore':function(){
define("dojox/data/HtmlStore", ["dojo/_base/declare", "dojo/_base/array", "dojo/_base/lang", "dojo/dom", "dojo/_base/xhr", "dojo/_base/window",
		"dojo/data/util/simpleFetch", "dojo/data/util/filter", "dojox/xml/parser"], 
  function(declare, array, lang, dom, xhr, winUtil, simpleFetch, filter, xmlParser) {

var HtmlStore = declare("dojox.data.HtmlStore", null, {
	constructor: function(/*Object*/args){
		//	summary:
		//		Initializer for the HTML table store.
		//	description:
		//		The HtmlStore can be created in one of two ways: a) by parsing an existing
		//		table or list DOM node on the current page or b) by referencing an external url and giving
		//		the id of the table or list in that page.  The remote url will be parsed as an html page.
		//
		//		The HTML table or list should be of the following form:
		//
		//		|	<table id="myTable">
		//		|		<thead>
		//		|			<tr>
		//		|				<th>Attribute1</th>
		//		|				<th>Attribute2</th>
		//		|			</tr>
		//		|		</thead>
		//		|		<tbody>
		//		|			<tr>
		//		|				<td>Value1.1</td>
		//		|				<td>Value1.2</td>
		//		|			</tr>
		//		|			<tr>
		//		|				<td>Value2.1</td>
		//		|				<td>Value2.2</td>
		//		|			</tr>
		//		|		</tbody>
		//		|	</table>
		//
		// -or-
		//
		//		|	<ul id="myUnorderedList">
		//		|		<li>Value.1</li>
		//		|		<li>Value.2</li>
		//		|	</ul>
		//
		// -or-
		//
		//		|	<ol id="myOrderedList">
		//		|		<li>Value.1</li>
		//		|		<li>Value.2</li>
		//		|	</ol>
		//
		//	args:
		//		An anonymous object to initialize properties.  It expects the following values:
		//		dataId:	The id of the HTML table to use.
		//		OR
		//		url:	The url of the remote page to load
		//		dataId:	The id of the table element in the remote page
		//		and the option:
		//		trimWhitespace:  Trim off any surrounding whitespace from the headers (attribute
		//			names) and text content of the items in question.  Default is false for
		//			backwards compatibility.
		if(args && "urlPreventCache" in args){
			this.urlPreventCache = args.urlPreventCache?true:false;
		}
		if(args && "trimWhitespace" in args){
			this.trimWhitespace = args.trimWhitespace?true:false;
		}
		if(args.url){
			if(!args.dataId){
				throw new Error("dojo.data.HtmlStore: Cannot instantiate using url without an id!");
			}
			this.url = args.url;
			this.dataId = args.dataId;
		}else{
			if(args.dataId){
				this.dataId = args.dataId;
			}
		}
		if(args && "fetchOnCreate" in args){
			this.fetchOnCreate = args.fetchOnCreate?true:false;
		}
		if(this.fetchOnCreate && this.dataId){
			this.fetch();
		}
	},

	// url: [public] string
	//		The URL from which to load an HTML document for data loading
	url: "",
	
	// dataId: [public] string
	//		The id in the document for an element from which to get the data.
	dataId: "",

	// trimWhitepace: [public] boolean
	//		Boolean flag to denote if the store should trim whitepace around
	//		header and data content of a node.  This matters if reformatters
	//		alter the white spacing around the tags.  The default is false for
	//		backwards compat.
	trimWhitespace: false,

	// urlPreventCache: [public] boolean
	//		Flag to denote if peventCache should be used on xhrGet calls.
	urlPreventCache: false,
	
	// fetchOnCreate: [public] boolean
	// 		Flag to denote if it should try to load from a data id (nested in the page)
	//		The moment the store is created, instead of waiting for first
	//		fetch call.
	fetchOnCreate: false,
	
	_indexItems: function(){
		// summary:
		//		Function to index items found under the id.
		// tags:
		//		private
		this._getHeadings();
		if(this._rootNode.rows){//tables
			if(this._rootNode.tBodies && this._rootNode.tBodies.length > 0){
				this._rootNode = this._rootNode.tBodies[0];
			}
			var i;
			for(i=0; i<this._rootNode.rows.length; i++){
				this._rootNode.rows[i]._ident = i+1;
			}
		}else{//lists
			var c=1;
			for(i=0; i<this._rootNode.childNodes.length; i++){
				if(this._rootNode.childNodes[i].nodeType === 1){
					this._rootNode.childNodes[i]._ident = c;
					c++;
				}
			}
		}
	},

	_getHeadings: function(){
		//	summary:
		//		Function to load the attribute names from the table header so that the
		//		attributes (cells in a row), can have a reasonable name.
		//      For list items, returns single implicit heading, ["name"]
		this._headings = [];
		if(this._rootNode.tHead){
			array.forEach(this._rootNode.tHead.rows[0].cells, lang.hitch(this, function(th){
				var text = xmlParser.textContent(th);
				this._headings.push(this.trimWhitespace?lang.trim(text):text);
			}));
		}else{
			this._headings = ["name"];
		}
	},
	
	_getAllItems: function(){
		//	summary:
		//		Function to return all rows in the table as an array of items.
		var items = [];
		var i;
		if(this._rootNode.rows){//table
			for(i=0; i<this._rootNode.rows.length; i++){
				items.push(this._rootNode.rows[i]);
			}
		}else{ //list
			for(i=0; i<this._rootNode.childNodes.length; i++){
				if(this._rootNode.childNodes[i].nodeType === 1){
					items.push(this._rootNode.childNodes[i]);
				}
			}
		}
		return items; //array
	},
	
	_assertIsItem: function(/* item */ item){
		//	summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojo.data.HtmlStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* String */ attribute){
		//	summary:
		//      This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		//
		//	returns:
		//		Returns the index (column) that the attribute resides in the row.
		if(typeof attribute !== "string"){
			throw new Error("dojo.data.HtmlStore: a function was passed an attribute argument that was not an attribute name string");
			return -1;
		}
		return array.indexOf(this._headings, attribute); //int
	},

/***************************************
	 dojo.data.api.Read API
***************************************/
	
	getValue: function(	/* item */ item,
						/* attribute-name-string */ attribute,
						/* value? */ defaultValue){
		//	summary:
		//      See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		return (values.length > 0)?values[0]:defaultValue; //Object || int || Boolean
	},

	getValues: function(/* item */ item,
						/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.getValues()

		this._assertIsItem(item);
		var index = this._assertIsAttribute(attribute);
		if(index>-1){
			var text;
			if(item.cells){
				text = xmlParser.textContent(item.cells[index]);
			}else{//return Value for lists
				text = xmlParser.textContent(item);
			}
			return [this.trimWhitespace?lang.trim(text):text];
		}
		return []; //Array
	},

	getAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		for(var i=0; i<this._headings.length; i++){
			if(this.hasAttribute(item, this._headings[i]))
				attributes.push(this._headings[i]);
		}
		return attributes; //Array
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttribute()
		return this.getValues(item, attribute).length > 0;
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		//	summary:
		//		See dojo.data.api.Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = filter.patternToRegExp(value, false);
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
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; ++i){
			var possibleValue = values[i];
			if(typeof possibleValue === "string" && regexp){
				return (possibleValue.match(regexp) !== null);
			}else{
				//Non-string matching.
				if(value === possibleValue){
					return true; // Boolean
				}
			}
		}
		return false; // Boolean
	},

	isItem: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		return something && dom.isDescendant(something, this._rootNode);
	},

	isItemLoaded: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItemLoaded()
		return this.isItem(something);
	},

	loadItem: function(/* Object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Read.loadItem()
		this._assertIsItem(keywordArgs.item);
	},
	
	_fetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Fetch items (XML elements) that match to a query
		//	description:
		//		If '_fetchUrl' is specified, it is used to load an XML document
		//		with a query string.
		//		Otherwise and if 'url' is specified, the XML document is
		//		loaded and list XML elements that match to a query (set of element
		//		names and their text attribute values that the items to contain).
		//		A wildcard, "*" can be used to query values to match all
		//		occurrences.
		//		If '_rootItem' is specified, it is used to fetch items.
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error
		
		if(this._rootNode){
			this._finishFetchItems(request, fetchHandler, errorHandler);
		}else{
			if(!this.url){
				this._rootNode = dom.byId(this.dataId);
				this._indexItems();
				this._finishFetchItems(request, fetchHandler, errorHandler);
			}else{
				var getArgs = {
						url: this.url,
						handleAs: "text",
						preventCache: this.urlPreventCache
					};
				var self = this;
				var getHandler = xhr.get(getArgs);
				getHandler.addCallback(function(data){
					var findNode = function(node, id){
						if(node.id == id){
							return node; //object
						}
						if(node.childNodes){
							for(var i=0; i<node.childNodes.length; i++){
								var returnNode = findNode(node.childNodes[i], id);
								if(returnNode){
									return returnNode; //object
								}
							}
						}
						return null; //null
					}

					var d = document.createElement("div");
					d.innerHTML = data;
					self._rootNode = findNode(d, self.dataId);
					self._indexItems();
					self._finishFetchItems(request, fetchHandler, errorHandler);
				});
				getHandler.addErrback(function(error){
					errorHandler(error, request);
				});
			}
		}
	},
	
	_finishFetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Internal function for processing the passed in request and locating the requested items.
		var items = [];
		var arrayOfAllItems = this._getAllItems();
		if(request.query){
			var ignoreCase = request.queryOptions ? request.queryOptions.ignoreCase : false;
			items = [];

			//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
			//same value for each item examined.  Much more efficient.
			var regexpList = {};
			var key;
						var value;
			for(key in request.query){
				value = request.query[key]+'';
				if(typeof value === "string"){
					regexpList[key] = filter.patternToRegExp(value, ignoreCase);
				}
			}

			for(var i = 0; i < arrayOfAllItems.length; ++i){
				var match = true;
				var candidateItem = arrayOfAllItems[i];
				for(key in request.query){
					value = request.query[key]+'';
					if(!this._containsValue(candidateItem, key, value, regexpList[key])){
						match = false;
					}
				}
				if(match){
					items.push(candidateItem);
				}
			}
			fetchHandler(items, request);
		}else{
			// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
			// of the internal list so that multiple callers can get listsand sort without affecting each other.
			if(arrayOfAllItems.length> 0){
				items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
			}
			fetchHandler(items, request);
		}
	},

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
	},
	
	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		//	summary:
		//		See dojo.data.api.Read.close()
		// nothing to do here!
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		if(this.isItem(item)){
			if(item.cells){
				return "Item #" + this.getIdentity(item);
			}else{
				return this.getValue(item,"name");
			}
		}
		return undefined;
	},

	getLabelAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		if(item.cells){
			return null;
		}else{
			return ["name"];
		}
	},

/***************************************
	 dojo.data.api.Identity API
***************************************/

	getIdentity: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentity()
		this._assertIsItem(item);
		if(this.hasAttribute(item, "name")){
		 	return this.getValue(item,"name");
		}else{
			return item._ident;
		}
	},

	getIdentityAttributes: function(/* item */ item){
		 //	summary:
		 //		See dojo.data.api.Identity.getIdentityAttributes()
		 //Identity isn't taken from a public attribute.
		 return null;
	},

	fetchItemByIdentity: function(keywordArgs){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()
		var identity = keywordArgs.identity;
		var self = this;
		var item = null;
		var scope = null;
		if(!this._rootNode){
			if(!this.url){
				this._rootNode = dom.byId(this.dataId);
				this._indexItems();
				if(self._rootNode.rows){ //Table
					item = this._rootNode.rows[identity + 1];
				}else{ //Lists
					for(var i = 0; i < self._rootNode.childNodes.length; i++){
						if(self._rootNode.childNodes[i].nodeType === 1 && identity === xmlParser.textContent(self._rootNode.childNodes[i])){
							item = self._rootNode.childNodes[i];
						}
					}
				}
				if(keywordArgs.onItem){
					scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
					keywordArgs.onItem.call(scope, item);
				}

			}else{
				var getArgs = {
						url: this.url,
						handleAs: "text"
					};
				var getHandler = xhr.get(getArgs);
				getHandler.addCallback(function(data){
					var findNode = function(node, id){
						if(node.id == id){
							return node; //object
						}
						if(node.childNodes){
							for(var i=0; i<node.childNodes.length; i++){
								var returnNode = findNode(node.childNodes[i], id);
								if(returnNode){
									return returnNode; //object
								}
							}
						}
						return null; //null
					}
					var d = document.createElement("div");
					d.innerHTML = data;
					self._rootNode = findNode(d, self.dataId);
					self._indexItems();
					if(self._rootNode.rows && identity <= self._rootNode.rows.length){ //Table
						item = self._rootNode.rows[identity-1];
					}else{ //List
						for(var i = 0; i < self._rootNode.childNodes.length; i++){
							if(self._rootNode.childNodes[i].nodeType === 1 && identity === xmlParser.textContent(self._rootNode.childNodes[i])){
									item = self._rootNode.childNodes[i];
									break;
							}
						}
					}
					if(keywordArgs.onItem){
						scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
						keywordArgs.onItem.call(scope, item);
					}
				});
				getHandler.addErrback(function(error){
					if(keywordArgs.onError){
						scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
						keywordArgs.onError.call(scope, error);

					}
				});
			}
		}else{
			if(this._rootNode.rows[identity+1]){
				item = this._rootNode.rows[identity+1];
				if(keywordArgs.onItem){
					scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
					keywordArgs.onItem.call(scope, item);
				}
			}
		}
	}
});
lang.extend(HtmlStore, simpleFetch);
return HtmlStore;
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
'dojox/data/WikipediaStore':function(){
define("dojox/data/WikipediaStore", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/io/script", 
		"dojo/io-query", "dojox/rpc/Service", "dojox/data/ServiceStore"], 
  function(kernel, lang, declare, scriptIO, ioQuery, Service, ServiceStore) {

kernel.experimental("dojox.data.WikipediaStore");

/*===== var ServiceStore = dojox.data.ServiceStore; =====*/

return declare("dojox.data.WikipediaStore", ServiceStore, {
	//	summary:
	//		Initializer for the Wikipedia data store interface.
	//	description:
	//		The WikipediaStore is a data store interface to Wikipedia, using the
	//		Wikipedia SMD spec from dojox.rpc. It currently is useful only for
	//		finding articles that contain some particular text or grabbing single
	//		articles by full name; no wildcards or other filtering are supported.
	//	example:
	//		|	var store = new dojox.data.WikipediaStore();
	//		|	store.fetch({
	//		|		query: {title:"Dojo Toolkit"},
	//		|		onItem: function(item){
	//		|			dojo.byId("somediv").innerHTML = item.text["*"];
	//		|		}
	//		|	});
	constructor: function(options){
		if(options && options.service){
			this.service = options.service;
		}else{
			var svc = new Service(require.toUrl("dojox/rpc/SMDLibrary/wikipedia.smd"));
			this.service = svc.query;
		}

		this.idAttribute = this.labelAttribute = "title";
	},

	fetch: function(/* object */ request){
		//	summary:
		//		Fetch a page or some partially-loaded search results from
		//		Wikipedia. Note that there isn't a way to sort data coming
		//		in from the API, so we just ignore the *sort* parameter.
		//	example:
		//		Loading a page:
		//		|	store.fetch({
		//		|		query: {title:"Dojo Toolkit"},
		//		|		// define your handlers here
		//		|	});
		//	example:
		//		Searching for pages containing "dojo":
		//		|	store.fetch({
		//		|		query: {
		//		|			action: "query",
		//		|			text: "dojo"
		//		|		},
		//		|		// define your handlers here
		//		|	});
		//	example:
		//		Searching for the next 50 pages containing "dojo":
		//		|	store.fetch({
		//		|		query: {
		//		|			action: "query",
		//		|			text: "dojo",
		//		|			start: 10,
		//		|			count: 50 // max 500; will be capped if necessary
		//		|		},
		//		|		// define your handlers here
		//		|	});
		var rq = lang.mixin({}, request.query);
		if(rq && (!rq.action || rq.action === "parse")){
			// default to a single page fetch
			rq.action = "parse";
			rq.page = rq.title;
			delete rq.title;

		}else if(rq.action === "query"){
			// perform a full text search on page content
			rq.list = "search";
			rq.srwhat = "text";
			rq.srsearch = rq.text;
			if(request.start){
				rq.sroffset = request.start-1;
			}
			if(request.count){
				rq.srlimit = request.count >= 500 ? 500 : request.count;
			}
			delete rq.text;
		}
		request.query = rq;
		return this.inherited(arguments);
	},

	_processResults: function(results, def){
		if(results.parse){
			// loading a complete page
			results.parse.title = ioQuery.queryToObject(def.ioArgs.url.split("?")[1]).page;
			results = [results.parse];

		}else if(results.query && results.query.search){
			// loading some search results; all we have here is page titles,
			// so we mark our items as incomplete
			results = results.query.search;
			var _thisStore = this;
			for(var i in results){
				results[i]._loadObject = function(callback){
					_thisStore.fetch({
						query: { action:"parse", title:this.title },
						onItem: callback
					});
					delete this._loadObject;
				}
			}
		}
		return this.inherited(arguments);
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
'dojox/data/FlickrStore':function(){
define("dojox/data/FlickrStore", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/data/util/simpleFetch", "dojo/io/script", 
		"dojo/_base/connect", "dojo/date/stamp", "dojo/AdapterRegistry"], 
  function(lang, declare, array, simpleFetch, scriptIO, connect, dateStamp, AdapterRegistry) {

var FlickrStore = declare("dojox.data.FlickrStore", null, {
	constructor: function(/*Object*/args){
		//	summary:
		//		Initializer for the FlickrStore store.
		//	description:
		//		The FlickrStore is a Datastore interface to one of the basic services
		//		of the Flickr service, the public photo feed.  This does not provide
		//		access to all the services of Flickr.
		//		This store cannot do * and ? filtering as the flickr service
		//		provides no interface for wildcards.
		if(args && args.label){
			this.label = args.label;
		}
		if(args && "urlPreventCache" in args){
			this.urlPreventCache = args.urlPreventCache?true:false;
		}
	},

	_storeRef: "_S",

	label: "title",

	//Flag to allor control of if cache prevention is enabled or not.
	urlPreventCache: true,

	_assertIsItem: function(/* item */ item){
		//	summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.FlickrStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.FlickrStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	getFeatures: function(){
		//	summary:
		//      See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true
		};
	},

	getValue: function(item, attribute, defaultValue){
		//	summary:
		//      See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		//	summary:
		//      See dojo.data.api.Read.getAttributes()
		return [
			"title", "description", "author", "datePublished", "dateTaken",
			"imageUrl", "imageUrlSmall", "imageUrlMedium", "tags", "link"
		];
	},

	hasAttribute: function(item, attribute){
		//	summary:
		//      See dojo.data.api.Read.hasAttributes()
		var v = this.getValue(item,attribute);
		if(v || v === "" || v === false){
			return true;
		}
		return false;
	},

	isItemLoaded: function(item){
		 //	summary:
		 //      See dojo.data.api.Read.isItemLoaded()
		 return this.isItem(item);
	},

	loadItem: function(keywordArgs){
		//	summary:
		//      See dojo.data.api.Read.loadItem()
	},

	getLabel: function(item){
		//	summary:
		//      See dojo.data.api.Read.getLabel()
		return this.getValue(item,this.label);
	},
	
	getLabelAttributes: function(item){
		//	summary:
		//      See dojo.data.api.Read.getLabelAttributes()
		return [this.label];
	},

	containsValue: function(item, attribute, value){
		//	summary:
		//      See dojo.data.api.Read.containsValue()
		var values = this.getValues(item,attribute);
		for(var i = 0; i < values.length; i++){
			if(values[i] === value){
				return true;
			}
		}
		return false;
	},

	getValues: function(item, attribute){
		//	summary:
		//      See dojo.data.api.Read.getValue()

		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var u = lang.hitch(this, "_unescapeHtml");
		var s = lang.hitch(dateStamp, "fromISOString");
		switch(attribute){
			case "title":
				return [ u(item.title) ];
			case "author":
				return [ u(item.author) ];
			case "datePublished":
				return [ s(item.published) ];
			case "dateTaken":
				return [ s(item.date_taken) ];
			case "imageUrlSmall":
				return [ item.media.m.replace(/_m\./, "_s.") ];
			case "imageUrl":
				return [ item.media.m.replace(/_m\./, ".") ];
			case "imageUrlMedium":
				return [ item.media.m ];
			case "link":
				return [ item.link ];
			case "tags":
				return item.tags.split(" ");
			case "description":
				return [ u(item.description) ];
			default:
				return [];
		}
	},

	isItem: function(item){
		//	summary:
		//      See dojo.data.api.Read.isItem()
		if(item && item[this._storeRef] === this){
			return true;
		}
		return false;
	},
	
	close: function(request){
		//	summary:
		//      See dojo.data.api.Read.close()
	},

	_fetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Fetch flickr items that match to a query
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error

		var rq = request.query = request.query || {};

		//Build up the content to send the request for.
		var content = {
			format: "json",
			tagmode:"any"
		};

		array.forEach(
			[ "tags", "tagmode", "lang", "id", "ids" ],
			function(i){
				if(rq[i]){ content[i] = rq[i]; }
			}
		);

		content.id = rq.id || rq.userid || rq.groupid;

		if(rq.userids){
			content.ids = rq.userids;
		}

		//Linking this up to Flickr is a PAIN!
		var handle = null;
		var getArgs = {
			url: dojox.data.FlickrStore.urlRegistry.match(request),
			preventCache: this.urlPreventCache,
			content: content
		};
		var myHandler = lang.hitch(this, function(data){
			if(!!handle){
				connect.disconnect(handle);
			}

			//Process the items...
			fetchHandler(this._processFlickrData(data), request);
		});
		handle = connect.connect("jsonFlickrFeed", myHandler);
		var deferred = scriptIO.get(getArgs);
		
		//We only set up the errback, because the callback isn't ever really used because we have
		//to link to the jsonFlickrFeed function....
		deferred.addErrback(function(error){
			connect.disconnect(handle);
			errorHandler(error, request);
		});
	},

	_processFlickrData: function(data){
		 var items = [];
		 if(data.items){
			 items = data.items;
			 //Add on the store ref so that isItem can work.
			 for(var i = 0; i < data.items.length; i++){
				 var item = data.items[i];
				 item[this._storeRef] = this;
			 }
		 }
		 return items;
	},

	_unescapeHtml: function(/*String*/ str){
		// summary:
		//		Utility function to un-escape XML special characters in an
		//		HTML string.
		//	str: String.
		//		The string to un-escape
		// returns:
		//		HTML String converted back to the normal text (unescaped)
		//		characters (<,>,&, ", etc,).

		//TODO:
		//		Check to see if theres already compatible escape() in
		//		dojo.string or dojo.html
		return 	str.replace(/&amp;/gm, "&").
					replace(/&lt;/gm, "<").
					replace(/&gt;/gm, ">").
					replace(/&quot;/gm, "\"").
					replace(/&#39;/gm, "'");
	}
});

lang.extend(FlickrStore, simpleFetch);

var feedsUrl = "http://api.flickr.com/services/feeds/";

var reg = FlickrStore.urlRegistry = new AdapterRegistry(true);

reg.register("group pool",
	function(request){ return !!request.query["groupid"]; },
	feedsUrl+"groups_pool.gne"
);

reg.register("default",
	function(request){ return true; },
	feedsUrl+"photos_public.gne"
);

//We have to define this because of how the Flickr API works.
//This somewhat stinks, but what can you do?
if(!jsonFlickrFeed){
	var jsonFlickrFeed = function(data){};
}

return FlickrStore;
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
'dojox/json/schema':function(){
define("dojox/json/schema", ["dojo/_base/kernel", "dojox", "dojo/_base/array"], function(dojo, dojox){

dojo.getObject("json.schema", true, dojox);


dojox.json.schema.validate = function(/*Any*/instance,/*Object*/schema){
	// summary:
	//  	To use the validator call this with an instance object and an optional schema object.
	// 		If a schema is provided, it will be used to validate. If the instance object refers to a schema (self-validating),
	// 		that schema will be used to validate and the schema parameter is not necessary (if both exist,
	// 		both validations will occur).
	//	instance:
	//		The instance value/object to validate
	// schema:
	//		The schema to use to validate
	// description:
	// 		The validate method will return an object with two properties:
	// 			valid: A boolean indicating if the instance is valid by the schema
	// 			errors: An array of validation errors. If there are no errors, then an
	// 					empty list will be returned. A validation error will have two properties:
	// 						property: which indicates which property had the error
	// 						message: which indicates what the error was
	//
	return this._validate(instance,schema,false);
};
dojox.json.schema.checkPropertyChange = function(/*Any*/value,/*Object*/schema, /*String*/ property){
	// summary:
	// 		The checkPropertyChange method will check to see if an value can legally be in property with the given schema
	// 		This is slightly different than the validate method in that it will fail if the schema is readonly and it will
	// 		not check for self-validation, it is assumed that the passed in value is already internally valid.
	// 		The checkPropertyChange method will return the same object type as validate, see JSONSchema.validate for
	// 		information.
	//	value:
	//		The new instance value/object to check
	// schema:
	//		The schema to use to validate
	// return:
	// 		see dojox.validate.jsonSchema.validate
	//
	return this._validate(value,schema, property || "property");
};
dojox.json.schema.mustBeValid = function(result){
	//	summary:
	//		This checks to ensure that the result is valid and will throw an appropriate error message if it is not
	// result: the result returned from checkPropertyChange or validate
	if(!result.valid){
		throw new TypeError(dojo.map(result.errors,function(error){return "for property " + error.property + ': ' + error.message;}).join(", "));
	}
}
dojox.json.schema._validate = function(/*Any*/instance,/*Object*/schema,/*Boolean*/ _changing){
	
	var errors = [];
		// validate a value against a property definition
	function checkProp(value, schema, path,i){
		var l;
		path += path ? typeof i == 'number' ? '[' + i + ']' : typeof i == 'undefined' ? '' : '.' + i : i;
		function addError(message){
			errors.push({property:path,message:message});
		}
		
		if((typeof schema != 'object' || schema instanceof Array) && (path || typeof schema != 'function')){
			if(typeof schema == 'function'){
				if(!(Object(value) instanceof schema)){
					addError("is not an instance of the class/constructor " + schema.name);
				}
			}else if(schema){
				addError("Invalid schema/property definition " + schema);
			}
			return null;
		}
		if(_changing && schema.readonly){
			addError("is a readonly field, it can not be changed");
		}
		if(schema['extends']){ // if it extends another schema, it must pass that schema as well
			checkProp(value,schema['extends'],path,i);
		}
		// validate a value against a type definition
		function checkType(type,value){
			if(type){
				if(typeof type == 'string' && type != 'any' &&
						(type == 'null' ? value !== null : typeof value != type) &&
						!(value instanceof Array && type == 'array') &&
						!(type == 'integer' && value%1===0)){
					return [{property:path,message:(typeof value) + " value found, but a " + type + " is required"}];
				}
				if(type instanceof Array){
					var unionErrors=[];
					for(var j = 0; j < type.length; j++){ // a union type
						if(!(unionErrors=checkType(type[j],value)).length){
							break;
						}
					}
					if(unionErrors.length){
						return unionErrors;
					}
				}else if(typeof type == 'object'){
					var priorErrors = errors;
					errors = [];
					checkProp(value,type,path);
					var theseErrors = errors;
					errors = priorErrors;
					return theseErrors;
				}
			}
			return [];
		}
		if(value === undefined){
			if(!schema.optional){
				addError("is missing and it is not optional");
			}
		}else{
			errors = errors.concat(checkType(schema.type,value));
			if(schema.disallow && !checkType(schema.disallow,value).length){
				addError(" disallowed value was matched");
			}
			if(value !== null){
				if(value instanceof Array){
					if(schema.items){
						if(schema.items instanceof Array){
							for(i=0,l=value.length; i<l; i++){
								errors.concat(checkProp(value[i],schema.items[i],path,i));
							}
						}else{
							for(i=0,l=value.length; i<l; i++){
								errors.concat(checkProp(value[i],schema.items,path,i));
							}
						}
					}
					if(schema.minItems && value.length < schema.minItems){
						addError("There must be a minimum of " + schema.minItems + " in the array");
					}
					if(schema.maxItems && value.length > schema.maxItems){
						addError("There must be a maximum of " + schema.maxItems + " in the array");
					}
				}else if(schema.properties){
					errors.concat(checkObj(value,schema.properties,path,schema.additionalProperties));
				}
				if(schema.pattern && typeof value == 'string' && !value.match(schema.pattern)){
					addError("does not match the regex pattern " + schema.pattern);
				}
				if(schema.maxLength && typeof value == 'string' && value.length > schema.maxLength){
					addError("may only be " + schema.maxLength + " characters long");
				}
				if(schema.minLength && typeof value == 'string' && value.length < schema.minLength){
					addError("must be at least " + schema.minLength + " characters long");
				}
				if(typeof schema.minimum !== undefined && typeof value == typeof schema.minimum &&
						schema.minimum > value){
					addError("must have a minimum value of " + schema.minimum);
				}
				if(typeof schema.maximum !== undefined && typeof value == typeof schema.maximum &&
						schema.maximum < value){
					addError("must have a maximum value of " + schema.maximum);
				}
				if(schema['enum']){
					var enumer = schema['enum'];
					l = enumer.length;
					var found;
					for(var j = 0; j < l; j++){
						if(enumer[j]===value){
							found=1;
							break;
						}
					}
					if(!found){
						addError("does not have a value in the enumeration " + enumer.join(", "));
					}
				}
				if(typeof schema.maxDecimal == 'number' &&
					(value.toString().match(new RegExp("\\.[0-9]{" + (schema.maxDecimal + 1) + ",}")))){
					addError("may only have " + schema.maxDecimal + " digits of decimal places");
				}
			}
		}
		return null;
	}
	// validate an object against a schema
	function checkObj(instance,objTypeDef,path,additionalProp){
	
		if(typeof objTypeDef =='object'){
			if(typeof instance != 'object' || instance instanceof Array){
				errors.push({property:path,message:"an object is required"});
			}
			
			for(var i in objTypeDef){
				if(objTypeDef.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_')){
					var value = instance[i];
					var propDef = objTypeDef[i];
					checkProp(value,propDef,path,i);
				}
			}
		}
		for(i in instance){
			if(instance.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_') && objTypeDef && !objTypeDef[i] && additionalProp===false){
				errors.push({property:path,message:(typeof value) + "The property " + i +
						" is not defined in the schema and the schema does not allow additional properties"});
			}
			var requires = objTypeDef && objTypeDef[i] && objTypeDef[i].requires;
			if(requires && !(requires in instance)){
				errors.push({property:path,message:"the presence of the property " + i + " requires that " + requires + " also be present"});
			}
			value = instance[i];
			if(objTypeDef && typeof objTypeDef == 'object' && !(i in objTypeDef)){
				checkProp(value,additionalProp,path,i);
			}
			if(!_changing && value && value.$schema){
				errors = errors.concat(checkProp(value,value.$schema,path,i));
			}
		}
		return errors;
	}
	if(schema){
		checkProp(instance,schema,'',_changing || '');
	}
	if(!_changing && instance && instance.$schema){
		checkProp(instance,instance.$schema,'','');
	}
	return {valid:!errors.length,errors:errors};
};

return dojox.json.schema;
});

},
'dojox/data/FlickrRestStore':function(){
define("dojox/data/FlickrRestStore", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/io/script", "dojox/data/FlickrStore", "dojo/_base/connect"], 
  function(lang, declare, array, scriptIO, FlickrStore, connect) {

/*===== var FlickrStore = dojox.data.FlickrStore; =====*/

var FlickrRestStore = declare("dojox.data.FlickrRestStore",
	FlickrStore, {
	constructor: function(/*Object*/args){
		// summary:
		//	Initializer for the FlickrRestStore store.
		// description:
		//	The FlickrRestStore is a Datastore interface to one of the basic services
		//	of the Flickr service, the public photo feed.  This does not provide
		//	access to all the services of Flickr.
		//	This store cannot do * and ? filtering as the flickr service
		//	provides no interface for wildcards.
		if(args){
			if(args.label){
				this.label = args.label;
			}
			if(args.apikey){
				this._apikey = args.apikey;
			}
		}
		this._cache = [];
		this._prevRequests = {};
		this._handlers = {};
		this._prevRequestRanges = [];
		this._maxPhotosPerUser = {};
		this._id = FlickrRestStore.prototype._id++;
	},

	// _id: Integer
	//		A unique identifier for this store.
	_id: 0,

	// _requestCount: Integer
	//		A counter for the number of requests made. This is used to define
	//		the callback function that Flickr will use.
	_requestCount: 0,

	// _flickrRestUrl: String
	//		The URL to the Flickr REST services.
	_flickrRestUrl: "http://www.flickr.com/services/rest/",

	// _apikey: String
	//		The users API key to be used when accessing Flickr REST services.
	_apikey: null,

	// _storeRef: String
	//		A key used to mark an data store item as belonging to this store.
	_storeRef: "_S",

	// _cache: Array
	//		An Array of all previously downloaded picture info.
	_cache: null,

	// _prevRequests: Object
	//		A HashMap used to record the signature of a request to prevent duplicate
	//		request being made.
	_prevRequests: null,

	// _handlers: Object
	//		A HashMap used to record the handlers registered for a single remote request.  Multiple
	//		requests may be made for the same information before the first request has finished.
	//		Each element of this Object is an array of handlers to call back when the request finishes.
	//		This prevents multiple requests being made for the same information.
	_handlers: null,

	// _sortAttributes: Object
	//		A quick lookup of valid attribute names in a sort query.
	_sortAttributes: {
		"date-posted": true,
		"date-taken": true,
		"interestingness": true
	},

	_fetchItems: function(	/*Object*/ request,
							/*Function*/ fetchHandler,
							/*Function*/ errorHandler){
		//	summary: Fetch flickr items that match to a query
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error
		var query = {};
		if(!request.query){
			request.query = query = {};
		} else {
			lang.mixin(query, request.query);
		}

		var primaryKey = [];
		var secondaryKey = [];

		//Build up the content to send the request for.
		var content = {
			format: "json",
			method: "flickr.photos.search",
			api_key: this._apikey,
			extras: "owner_name,date_upload,date_taken"
		};
		var isRest = false;
		if(query.userid){
			isRest = true;
			content.user_id = request.query.userid;
			primaryKey.push("userid"+request.query.userid);
		}

		if(query.groupid){
			isRest = true;
			content.group_id = query.groupid;
			primaryKey.push("groupid" + query.groupid);
		}

		if(query.apikey){
			isRest = true;
			content.api_key = request.query.apikey;
			secondaryKey.push("api"+request.query.apikey);
		}else if(content.api_key){
			isRest = true;
			request.query.apikey = content.api_key;
			secondaryKey.push("api"+content.api_key);
		}else{
			throw Error("dojox.data.FlickrRestStore: An API key must be specified.");
		}

		request._curCount = request.count;

		if(query.page){
			content.page = request.query.page;
			secondaryKey.push("page" + content.page);
		}else if(("start" in request) && request.start !== null){
			if(!request.count){
				request.count = 20;
			}
			var diff = request.start % request.count;
			var start = request.start, count = request.count;
			// If the count does not divide cleanly into the start number,
			// more work has to be done to figure out the best page to request
			if(diff !== 0) {
				if(start < count / 2){
					// If the first record requested is less than half the
					// amount requested, then request from 0 to the count record
					count = start + count;
					start = 0;
				}else{
					var divLimit = 20, div = 2;
					for(var i = divLimit; i > 0; i--){
						if(start % i === 0 && (start/i) >= count){
							div = i;
							break;
						}
					}
					count = start/div;
				}
				request._realStart = request.start;
				request._realCount = request.count;
				request._curStart = start;
				request._curCount = count;
			}else{
				request._realStart = request._realCount = null;
				request._curStart = request.start;
				request._curCount = request.count;
			}

			content.page = (start / count) + 1;
			secondaryKey.push("page" + content.page);
		}

		if(request._curCount){
			content.per_page = request._curCount;
			secondaryKey.push("count" + request._curCount);
		}

		if(query.lang){
			content.lang = request.query.lang;
			primaryKey.push("lang" + request.lang);
		}

		if(query.setid){
			content.method = "flickr.photosets.getPhotos";
			content.photoset_id = request.query.setid;
			primaryKey.push("set" + request.query.setid);
		}

		if(query.tags){
			if(query.tags instanceof Array){
				content.tags = query.tags.join(",");
			}else{
				content.tags = query.tags;
			}
			primaryKey.push("tags" + content.tags);

			if(query["tag_mode"] && (query.tag_mode.toLowerCase() === "any" ||
				query.tag_mode.toLowerCase() === "all")){
				content.tag_mode = query.tag_mode;
			}
		}
		if(query.text){
			content.text=query.text;
			primaryKey.push("text:"+query.text);
		}

		//The store only supports a single sort attribute, even though the
		//Read API technically allows multiple sort attributes
		if(query.sort && query.sort.length > 0){
			//The default sort attribute is 'date-posted'
			if(!query.sort[0].attribute){
				query.sort[0].attribute = "date-posted";
			}

			//If the sort attribute is valid, check if it is ascending or
			//descending.
			if(this._sortAttributes[query.sort[0].attribute]) {
				if(query.sort[0].descending){
					content.sort = query.sort[0].attribute + "-desc";
				}else{
					content.sort = query.sort[0].attribute + "-asc";
				}
			}
		}else{
			//The default sort in the Dojo Data API is ascending.
			content.sort = "date-posted-asc";
		}
		primaryKey.push("sort:"+content.sort);

		//Generate a unique key for this request, so the store can
		//detect duplicate requests.
		primaryKey = primaryKey.join(".");
		secondaryKey = secondaryKey.length > 0 ? "." + secondaryKey.join(".") : "";
		var requestKey = primaryKey + secondaryKey;

		//Make a copy of the request, in case the source object is modified
		//before the request completes
		request = {
			query: query,
			count: request._curCount,
			start: request._curStart,
			_realCount: request._realCount,
			_realStart: request._realStart,
			onBegin: request.onBegin,
			onComplete: request.onComplete,
			onItem: request.onItem
		};

		var thisHandler = {
			request: request,
			fetchHandler: fetchHandler,
			errorHandler: errorHandler
		};

		//If the request has already been made, but not yet completed,
		//then add the callback handler to the list of handlers
		//for this request, and finish.
		if(this._handlers[requestKey]){
			this._handlers[requestKey].push(thisHandler);
			return;
		}

		this._handlers[requestKey] = [thisHandler];

		//Linking this up to Flickr is a PAIN!
		var handle = null;
		var getArgs = {
			url: this._flickrRestUrl,
			preventCache: this.urlPreventCache,
			content: content,
			callbackParamName: "jsoncallback"
		};

		var doHandle = lang.hitch(this, function(processedData, data, handler){
			var onBegin = handler.request.onBegin;
			handler.request.onBegin = null;
			var maxPhotos;
			var req = handler.request;

			if(("_realStart" in req) && req._realStart != null){
				req.start = req._realStart;
				req.count = req._realCount;
				req._realStart = req._realCount = null;
			}

			//If the request contains an onBegin method, the total number
			//of photos must be calculated.
			if(onBegin){
				var photos = null;
				if(data){
					photos = (data.photoset ? data.photoset : data.photos);
				}
				if(photos && ("perpage" in photos) && ("pages" in photos)){
					if(photos.perpage * photos.pages <= handler.request.start + handler.request.count){
						//If the final page of results has been received, it is possible to
						//know exactly how many photos there are
						maxPhotos = handler.request.start + photos.photo.length;
					}else{
						//If the final page of results has not yet been received,
						//it is not possible to tell exactly how many photos exist, so
						//return the number of pages multiplied by the number of photos per page.
						maxPhotos = photos.perpage * photos.pages;
					}
					this._maxPhotosPerUser[primaryKey] = maxPhotos;
					onBegin(maxPhotos, handler.request);
				}else if(this._maxPhotosPerUser[primaryKey]){
					onBegin(this._maxPhotosPerUser[primaryKey], handler.request);
				}
			}
			//Call whatever functions the caller has defined on the request object, except for onBegin
			handler.fetchHandler(processedData, handler.request);
			if(onBegin){
				//Replace the onBegin function, if it existed.
				handler.request.onBegin = onBegin;
			}
		});

		//Define a callback for the script that iterates through a list of
		//handlers for this piece of data.	Multiple requests can come into
		//the store for the same data.
		var myHandler = lang.hitch(this, function(data){
			//The handler should not be called more than once, so disconnect it.
			//if(handle !== null){ dojo.disconnect(handle); }
			if(data.stat != "ok"){
				errorHandler(null, request);
			}else{ //Process the items...
				var handlers = this._handlers[requestKey];
				if(!handlers){
					console.log("FlickrRestStore: no handlers for data", data);
					return;
				}

				this._handlers[requestKey] = null;
				this._prevRequests[requestKey] = data;

				//Process the data once.
				var processedData = this._processFlickrData(data, request, primaryKey);
				if(!this._prevRequestRanges[primaryKey]){
					this._prevRequestRanges[primaryKey] = [];
				}
				this._prevRequestRanges[primaryKey].push({
					start: request.start,
					end: request.start + (data.photoset ? data.photoset.photo.length : data.photos.photo.length)
				});

				//Iterate through the array of handlers, calling each one.
				array.forEach(handlers, function(i){
					doHandle(processedData, data, i);
				});
			}
		});

		var data = this._prevRequests[requestKey];

		//If the data was previously retrieved, there is no need to fetch it again.
		if(data){
			this._handlers[requestKey] = null;
			doHandle(this._cache[primaryKey], data, thisHandler);
			return;
		}else if(this._checkPrevRanges(primaryKey, request.start, request.count)){
			//If this range of data has already been retrieved, reuse it.
			this._handlers[requestKey] = null;
			doHandle(this._cache[primaryKey], null, thisHandler);
			return;
		}

		var deferred = scriptIO.get(getArgs);
		deferred.addCallback(myHandler);

		//We only set up the errback, because the callback isn't ever really used because we have
		//to link to the jsonFlickrFeed function....
		deferred.addErrback(function(error){
			connect.disconnect(handle);
			errorHandler(error, request);
		});
	},

	getAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		return [
			"title", "author", "imageUrl", "imageUrlSmall", "imageUrlMedium",
			"imageUrlThumb", "imageUrlLarge", "imageUrlOriginal", "link", "dateTaken", "datePublished"
		];
	},

	getValues: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);

		switch(attribute){
			case "title":
				return [ this._unescapeHtml(item.title) ]; // String
			case "author":
				return [ item.ownername ]; // String
			case "imageUrlSmall":
				return [ item.media.s ]; // String
			case "imageUrl":
				return [ item.media.l ]; // String
			case "imageUrlOriginal":
				return [ item.media.o ]; // String
			case "imageUrlLarge":
				return [ item.media.l ]; // String
			case "imageUrlMedium":
				return [ item.media.m ]; // String
			case "imageUrlThumb":
				return [ item.media.t ]; // String
			case "link":
				return [ "http://www.flickr.com/photos/" + item.owner + "/" + item.id ]; // String
			case "dateTaken":
				return [ item.datetaken ];
			case "datePublished":
				return [ item.datepublished ];
			default:
				return undefined;
		}

	},

	_processFlickrData: function(/* Object */data, /* Object */request, /* String */ cacheKey){
		// summary: Processes the raw data from Flickr and updates the internal cache.
		// data:
		//		Data returned from Flickr
		// request:
		//		The original dojo.data.Request object passed in by the user.

		// If the data contains an 'item' object, it has not come from the REST
		// services, so process it using the FlickrStore.
		if(data.items){
			return FlickrStore.prototype._processFlickrData.apply(this,arguments);
		}
		var template = ["http://farm", null, ".static.flickr.com/", null, "/", null, "_", null];

		var items = [];
		var photos = (data.photoset ? data.photoset : data.photos);
		if(data.stat == "ok" && photos && photos.photo){
			items = photos.photo;

			//Add on the store ref so that isItem can work.
			for(var i = 0; i < items.length; i++){
				var item = items[i];
				item[this._storeRef] = this;
				template[1] = item.farm;
				template[3] = item.server;
				template[5] = item.id;
				template[7] = item.secret;
				
				var base = template.join("");
				item.media = {
					s: base + "_s.jpg",
					m: base + "_m.jpg",
					l: base + ".jpg",
					t: base + "_t.jpg",
					o: base + "_o.jpg"
				};
				if(!item.owner && data.photoset){
					item.owner = data.photoset.owner;
				}
			}
		}
		var start = request.start ? request.start : 0;
		var arr = this._cache[cacheKey];
		if(!arr){
			this._cache[cacheKey] = arr = [];
		}
		array.forEach(items, function(i, idx){
			arr[idx+ start] = i;
		});

		return arr; // Array
	},

	_checkPrevRanges: function(primaryKey, start, count){
		var end = start + count;
		var arr = this._prevRequestRanges[primaryKey];
		return (!!arr) && array.some(arr, function(item){
			return ((start >= item.start)&&(end <= item.end));
		});
	}
});
return FlickrRestStore;
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
'dojox/data/CssClassStore':function(){
define("dojox/data/CssClassStore", ["dojo/_base/declare","dojox/data/CssRuleStore"], 
  function(declare, CssRuleStore) {

/*===== var CssRuleStore = dojox.data.CssRuleStore =====*/

return declare("dojox.data.CssClassStore", CssRuleStore, {
	//	summary:
	//		Basic store to display CSS information.
	//	description:
	//		The CssClassStore allows users to get information about active Css classes in the page running the CssClassStore.
	//		It can also filter out classes from specific stylesheets.  The attributes it exposes on classes are as follows:
	//			class:		The classname, including the '.'.
	//			classSans:	The classname without the '.'.

	_labelAttribute: 'class', // text representation of the Item [label and identifier may need to stay due to method names]
	_idAttribute: 'class',
	_cName: "dojox.data.CssClassStore",

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return {
			"dojo.data.api.Read" : true,
			"dojo.data.api.Identity" : true
		};
	},

	getAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		return ['class', 'classSans'];
	},

	getValue: function(item, attribute, defaultValue){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getValues: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.getValues()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var value = [];
		if(attribute === "class"){
			value = [item.className];
		}else if(attribute === "classSans"){
			value = [item.className.replace(/\./g,'')];
		}
		return value;
	},

	_handleRule: function(rule, styleSheet, href){
		//	summary:
		//		Handles the creation of an item based on the passed rule.  In this store, this implies
		//		parsing out all available class names.
		var obj = {};
		var s = rule['selectorText'].split(" ");
		for(var j=0; j<s.length; j++){
			var tmp = s[j];
			var first = tmp.indexOf('.');
			if(tmp && tmp.length > 0 && first !== -1){
				var last = tmp.indexOf(',') || tmp.indexOf('[');
				tmp = tmp.substring(first, ((last !== -1 && last > first)?last:tmp.length));
				obj[tmp] = true;
			}
		}
		for(var key in obj){
			if(!this._allItems[key]){
				var item = {};
				item.className = key;
				item[this._storeRef] = this;
				this._allItems[key] = item;
			}
		}
	},

	_handleReturn: function(){
		//	summary:
		//		Handles the return from a fetching action.  Delegates requests to act on the resulting
		//		item set to eitehr the _handleFetchReturn or _handleFetchByIdentityReturn depending on
		//		where the request originated.
		var _inProgress = [];
		
		var items = {};
		for(var i in this._allItems){
			items[i] = this._allItems[i];
		}
		var requestInfo;
		// One-level deep clone (can't use dojo.clone, since we don't want to clone all those store refs!)
		while(this._pending.length){
			requestInfo = this._pending.pop();
			requestInfo.request._items = items;
			_inProgress.push(requestInfo);
		}

		while(_inProgress.length){
			requestInfo = _inProgress.pop();
			if(requestInfo.fetch){
				this._handleFetchReturn(requestInfo.request);
			}else{
				this._handleFetchByIdentityReturn(requestInfo.request);
			}
		}
	},

	_handleFetchByIdentityReturn: function(request){
		//	summary:
		//		Handles a fetchByIdentity request by finding the correct item.
		var items = request._items;
		// Per https://bugs.webkit.org/show_bug.cgi?id=17935 , Safari 3.x always returns the selectorText
		// of a rule in full lowercase.
		var item = items[request.identity];
		if(!this.isItem(item)){
			item = null;
		}
		if(request.onItem){
			var scope = request.scope || dojo.global;
			request.onItem.call(scope, item);
		}
	},

	/* Identity API */
	getIdentity: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentity()
		this._assertIsItem(item);
		return this.getValue(item, this._idAttribute);
	},

	getIdentityAttributes: function(/* item */ item){
		 //	summary:
		 //		See dojo.data.api.Identity.getIdentityAttributes()
		this._assertIsItem(item);
		return [this._idAttribute];
	},

	fetchItemByIdentity: function(/* request */ request){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()
		request = request || {};
		if(!request.store){
			request.store = this;
		}
		if(this._pending && this._pending.length > 0){
			this._pending.push({request: request});
		}else{
			this._pending = [{request: request}];
			this._fetch(request);
		}
		return request;
	}
});

});

},
'dojox/data/RailsStore':function(){
define("dojox/data/RailsStore", ["dojo", "dojox", "dojox/data/JsonRestStore"], function(dojo, dojox) {

// Contains code donated by Travis Tilley under CLA
dojo.declare("dojox.data.RailsStore", dojox.data.JsonRestStore, {
	constructor: function(){
		//	summary:
		//		RailsStore is a data store for interacting with RESTful Rails controllers
	},
	preamble: function(options){
		if(typeof options.target == 'string' && !options.service){
			var target = options.target.replace(/\/$/g, '');

			// Special getRequest handler for handling content type negotiation via
			// the Rails format extension, as well as properly setting the ID param
			// in the URL.
			var getRequest = function(id, args){
				args = args || {};
				var url = target;
				var query;
				var ident;

				if(dojo.isObject(id)){
					ident = '';
					query = '?' + dojo.objectToQuery(id);
				}else if(args.queryStr && args.queryStr.indexOf('?') != -1){
					ident = args.queryStr.replace(/\?.*/, '');
					query = args.queryStr.replace(/[^?]*\?/g, '?');
				}else if(dojo.isString(args.query) && args.query.indexOf('?') != -1){
					ident = args.query.replace(/\?.*/, '');
					query = args.query.replace(/[^?]*\?/g, '?');
				}else{
					ident = id ? id.toString() : '';
					query = '';
				}

				if(ident.indexOf('=') != -1){
					query = ident;
					ident = '';
				}

				if(ident){
					url = url + '/' + ident + '.json' + query;
				}else{
					url = url + '.json' + query;
				}

				var isSync = dojox.rpc._sync;
				dojox.rpc._sync = false;

				return {
					url : url,
					handleAs : 'json',
					contentType : 'application/json',
					sync : isSync,
					headers : {
						Accept : 'application/json,application/javascript',
						Range : args && (args.start >= 0 || args.count >= 0)
								? "items="
										+ (args.start || '0')
										+ '-'
										+ ((args.count && (args.count
												+ (args.start || 0) - 1)) || '')
								: undefined
					}
				};
			};

			options.service = dojox.rpc.Rest(this.target, true, null,
					getRequest);
		}
	},
	fetch: function(args){
		args = args || {};
		function addToQueryStr(obj){
			function buildInitialQueryString(){
				if(args.queryStr == null){
					args.queryStr = '';
				}
				if(dojo.isObject(args.query)){
					args.queryStr = '?' + dojo.objectToQuery(args.query);
				}else if(dojo.isString(args.query)){
					args.queryStr = args.query;
				}
			}
			function separator(){
				if(args.queryStr.indexOf('?') == -1){
					return '?';
				}else{
					return '&';
				}
			}
			if(args.queryStr == null){
				buildInitialQueryString();
			}
			args.queryStr = args.queryStr + separator() + dojo.objectToQuery(obj);
		}
		if(args.start || args.count){
			// in addition to the content range headers, also provide query parameters for use
			// with the will_paginate plugin if so desired.
			if((args.start || 0) % args.count){
				throw new Error("The start parameter must be a multiple of the count parameter");
			}
			addToQueryStr({
				page: ((args.start || 0) / args.count) + 1,
				per_page: args.count
			});
		}
		if(args.sort){
			// make the sort into query parameters
			var queryObj = {
				sortBy : [],
				sortDir : []
			};

			dojo.forEach(args.sort, function(item){
				queryObj.sortBy.push(item.attribute);
				queryObj.sortDir.push(!!item.descending ? 'DESC' : 'ASC');
			});

			addToQueryStr(queryObj);
			delete args.sort;
		}

		return this.inherited(arguments);
	},
	_processResults: function(results, deferred){
		var items;

		/*
		 * depending on the ActiveRecord::Base.include_root_in_json setting,
		 * you might get back an array of attribute objects, or an array of
		 * objects with the attribute object nested under an attribute having
		 * the same name as the (remote and unguessable) model class.
		 *
		 * 'Example' without root_in_json: [{'id':1, 'text':'first'}]
		 * 'Example' with root_in_json: [{'example':{'id':1, 'text':'first'}}]
		 */
		if((typeof this.rootAttribute == 'undefined') && results[0]){
			if(results[0][this.idAttribute]){
				this.rootAttribute = false;
				console.debug('RailsStore: without root_in_json');
			}else{
				for(var attribute in results[0]){
					if(results[0][attribute][this.idAttribute]){
						this.rootAttribute = attribute;
						console.debug('RailsStore: with root_in_json, attribute: ' + attribute);
					}
				}
			}
		}

		if(this.rootAttribute){
			items = dojo.map(results, function(item){
				return item[this.rootAttribute];
			}, this);
		}else{
			items = results;
		}

		// index the results
		var count = results.length;
		// if we don't know the length, and it is partial result, we will guess that it is twice as big, that will work for most widgets
		return {totalCount:deferred.fullLength || (deferred.request.count == count ? (deferred.request.start || 0) + count * 2 : count), items: items};
	}
});

return dojox.data.RailsStore;
});

},
'dojox/data/AppStore':function(){
define("dojox/data/AppStore", ["dojo", "dojox", "dojo/data/util/simpleFetch", "dojo/data/util/filter", "dojox/atom/io/Connection"], function(dojo, dojox) {

dojo.experimental("dojox.data.AppStore");

dojo.declare("dojox.data.AppStore",
	null,{

	// url: [public] string
	//		So the parser can instantiate the store via markup.
	url: "",
	
	// urlPreventCache: [public] boolean
	//		Whether or not to pass the preventCache parameter to the connection
	urlPreventCache: false,

	// xmethod: [public] boolean
	//		Whether to use X-Method-Override for PUT/DELETE.
	xmethod: false,
	
	_atomIO: null,
	_feed: null,
	_requests: null,
	_processing: null,
	
	_updates: null,
	_adds: null,
	_deletes: null,
	
	constructor: function(/*Object*/args){
		// summary:
		//		The APP data store.
		// description:
		//		The APP Store is instantiated either in markup or programmatically by supplying a
		//		url of the Collection to be used.
		//
		// args:
		//		An anonymous object to initialize properties.  It expects the following values:
		//		url:		The url of the Collection to load.
		//		urlPreventCache:	Whether or not to append on cache prevention params (as defined by dojo.xhr*)
		
		if(args && args.url){
			this.url = args.url;
		}
		if(args && args.urlPreventCache){
			this.urlPreventCache = args.urlPreventCache;
		}
		if(!this.url){
			throw new Error("A URL is required to instantiate an APP Store object");
		}
	},
	
	_setFeed: function(feed, data){
		// summary:
		//		Sets the internal feed using a dojox.atom.io.model.Feed object.
		// description:
		//		Sets the internal feed using a dojox.atom.io.model.Feed object.  Also adds
		//		a property to the entries to track that they belong to this store. It
		//		also parses stored requests (since we were waiting on a callback) and
		//		executes those as well.
		//
		// feed: dojox.atom.io.model.Feed object
		//		The Feed to use for this data store.
		// data: unused
		//		Signature for this function is defined by AtomIO.getFeed, since this is a callback.
		this._feed = feed;
		var i;
		for(i=0; i<this._feed.entries.length; i++){
			this._feed.entries[i].store = this;
		}
		if(this._requests){
			for(i=0; i<this._requests.length; i++){
				var request = this._requests[i];
				if(request.request && request.fh && request.eh){
					this._finishFetchItems(request.request, request.fh, request.eh);
				}else if(request.clear){
					this._feed = null;
				}else if(request.add){
					this._feed.addEntry(request.add);
				}else if(request.remove){
					this._feed.removeEntry(request.remove);
				}
			}
		}
		this._requests = null;
	},
	
	_getAllItems: function(){
		// summary:
		//		Function to return all entries in the Feed as an array of items.
		// description:
		//		Function to return all entries in the Feed as an array of items.
		//
		// returns:
		//		Array of all entries in the feed.
		var items = [];
		for(var i=0; i<this._feed.entries.length; i++){
			items.push(this._feed.entries[i]);
		}
		return items; //array
	},
	
	_assertIsItem: function(/* item */ item){
		// summary:
		//		This function tests whether the item is an item.
		// description:
		//		This function tests whether the item passed in is indeed an item
		//		in the store.
		//
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("This error message is provided when a function is called in the following form: "
				+ "getAttribute(argument, attributeName).  The argument variable represents the member "
				+ "or owner of the object. The error is created when an item that does not belong "
				+ "to this store is specified as an argument.");
		}
	},

	_assertIsAttribute: function(/* String */ attribute){
		// summary:
		//		This function tests whether the item is an attribute.
		// description:
		//		This function tests whether the item passed in is indeed a valid
		//		'attribute' like type for the store.
		// attribute:
		//		The attribute to test for being contained by the store.
		//
		// returns:
		//		Returns a boolean indicating whether this is a valid attribute.
		if(typeof attribute !== "string"){
			throw new Error("The attribute argument must be a string. The error is created "
			+ "when a different type of variable is specified such as an array or object.");
		}

		for(var key in dojox.atom.io.model._actions){
			if(key == attribute){
				return true;
			}
		}
		return false;
	},
	
	_addUpdate: function(/* Object */ update){
		// summary:
		//		Internal function to add an updated entry to our updates array
		// description:
		//		Internal function to add an updated entry to our updates array
		//
		// update: dojox.atom.io.model.Entry object
		//		The updated Entry we've changed.
		if(!this._updates){
			this._updates = [update];
		}else{
			this._updates.push(update);
		}
	},

/***************************************
     dojo.data.api.Read API
***************************************/
	
	getValue: function(	/* item */ item,
						/* attribute-name-string */ attribute,
						/* value? */ defaultValue){
		// summary:
		//      See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		return (values.length > 0)?values[0]:defaultValue; //Object || int || Boolean
	},

	getValues: function(/* item */ item,
						/* attribute-name-string */ attribute){
		// summary:
		//		See dojo.data.api.Read.getValues()

		this._assertIsItem(item);
		var flag = this._assertIsAttribute(attribute);

		if(flag){
			if((attribute === "author" || attribute === "contributor" || attribute === "link") && item[attribute+"s"]){
				return item[attribute+"s"];
			}
			if(attribute === "category" && item.categories){
				return item.categories;
			}
			if(item[attribute]){
				item = item[attribute];
				if(item.nodeType == "Content"){
					return [item.value];
				}
				return [item] ;
			}
		}
		return []; //Array
	},

	getAttributes: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		for(var key in dojox.atom.io.model._actions){
			if(this.hasAttribute(item, key)){
				attributes.push(key);
			}
		}
		return attributes; //Array
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		// summary:
		//		See dojo.data.api.Read.hasAttribute()
		return this.getValues(item, attribute).length > 0;
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		// summary:
		//		See dojo.data.api.Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = dojo.data.util.filter.patternToRegExp(value, false);
		}
		return this._containsValue(item, attribute, value, regexp); //boolean.
	},

	_containsValue: function(	/* item */ item,
								/* attribute-name-string */ attribute,
								/* anything */ value,
								/* RegExp?*/ regexp,
								/* Boolean?*/ trim){
		// summary:
		//		Internal function for looking at the values contained by the item.
		// description:
		//		Internal function for looking at the values contained by the item.  This
		//		function allows for denoting if the comparison should be case sensitive for
		//		strings or not (for handling filtering cases where string case should not matter)
		//
		// item:
		//		The data item to examine for attribute values.
		// attribute:
		//		The attribute to inspect.
		// value:
		//		The value to match.
		// regexp:
		//		Optional regular expression generated off value if value was of string type to handle wildcarding.
		//		If present and attribute values are string, then it can be used for comparison instead of 'value'
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; ++i){
			var possibleValue = values[i];
			if(typeof possibleValue === "string" && regexp){
				if(trim){
					possibleValue = possibleValue.replace(new RegExp(/^\s+/),""); // START
					possibleValue = possibleValue.replace(new RegExp(/\s+$/),""); // END
				}
				possibleValue = possibleValue.replace(/\r|\n|\r\n/g, "");
				return (possibleValue.match(regexp) !== null);
			}else{
				//Non-string matching.
				if(value === possibleValue){
					return true; // Boolean
				}
			}
		}
		return false; // Boolean
	},

	isItem: function(/* anything */ something){
		// summary:
		//		See dojo.data.api.Read.isItem()
		return something && something.store && something.store === this; //boolean
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		See dojo.data.api.Read.isItemLoaded()
		return this.isItem(something);
	},

	loadItem: function(/* Object */ keywordArgs){
		// summary:
		//		See dojo.data.api.Read.loadItem()
		this._assertIsItem(keywordArgs.item);
	},
	
	_fetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Fetch items (Atom entries) that match to a query
		// description:
		//		Fetch items (Atom entries) that match to a query
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error
		if(this._feed){
			this._finishFetchItems(request, fetchHandler, errorHandler);
		}else{
			var flag = false;
			if(!this._requests){
				this._requests = [];
				flag = true;
			}
			this._requests.push({request: request, fh: fetchHandler, eh: errorHandler});
			if(flag){
				this._atomIO = new dojox.atom.io.Connection(false, this.urlPreventCache);
				this._atomIO.getFeed(this.url,this._setFeed, null, this);
			}
		}
	},
		
	_finishFetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Internal function for finishing a fetch request.
		// description:
		//		Internal function for finishing a fetch request.  Needed since the feed
		//		might not have been loaded, so we finish the fetch in a callback.
		//
		// request:
		//		A request object
		// fetchHandler:
		//		A function to call for fetched items
		// errorHandler:
		//		A function to call on error
		var items = null;
		var arrayOfAllItems = this._getAllItems();
		if(request.query){
			var ignoreCase = request.queryOptions ? request.queryOptions.ignoreCase : false;
			items = [];

			//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
			//same value for each item examined.  Much more efficient.
			var regexpList = {};
			var key;
			var value;
			for(key in request.query){
				value = request.query[key]+'';
				if(typeof value === "string"){
					regexpList[key] = dojo.data.util.filter.patternToRegExp(value, ignoreCase);
				}
			}

			for(var i = 0; i < arrayOfAllItems.length; ++i){
				var match = true;
				var candidateItem = arrayOfAllItems[i];
				for(key in request.query){
					value = request.query[key]+'';
					if(!this._containsValue(candidateItem, key, value, regexpList[key], request.trim)){
						match = false;
					}
				}
				if(match){
					items.push(candidateItem);
				}
			}
		}else{
			// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
			// of the internal list so that multiple callers can get listsand sort without affecting each other.
			if(arrayOfAllItems.length> 0){
				items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
			}
		}
		try{
			fetchHandler(items, request);
		}catch(e){
			errorHandler(e, request);
		}
	},

	getFeatures: function(){
		// summary:
		//		See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true,
			'dojo.data.api.Write': true,
			'dojo.data.api.Identity': true
		};
	},
	
	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		// summary:
		//		See dojo.data.api.Read.close()
		// nothing to do here!
		this._feed = null;
	},

	getLabel: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Read.getLabel()
		if(this.isItem(item)){
			return this.getValue(item, "title", "No Title");
		}
		return undefined;
	},

	getLabelAttributes: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		return ["title"];
	},

/***************************************
     dojo.data.api.Identity API
***************************************/

	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Identity.getIdentity()
		this._assertIsItem(item);
		return this.getValue(item, "id");
	},

	getIdentityAttributes: function(/* item */ item){
		 //	summary:
		 //		See dojo.data.api.Identity.getIdentityAttributes()
		 return ["id"];
	},

	fetchItemByIdentity: function(keywordArgs){
		// summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()

		this._fetchItems({query:{id:keywordArgs.identity}, onItem: keywordArgs.onItem, scope: keywordArgs.scope},
			function(items, request){
				var scope = request.scope;
				if(!scope){
					scope = dojo.global;
				}
				if(items.length < 1){
					request.onItem.call(scope, null);
				}else{
					request.onItem.call(scope, items[0]);
				}
		}, keywordArgs.onError);
	},

/***************************************
     dojo.data.api.Identity API
***************************************/

	newItem: function(/* Object? */ keywordArgs){
		// summary:
		//		See dojo.data.api.Write.newItem()
		var entry = new dojox.atom.io.model.Entry();
		var value = null;
		var temp = null;
		var i;
		for(var key in keywordArgs){
			if(this._assertIsAttribute(key)){
				value = keywordArgs[key];
				switch(key){
					case "link":
						for(i in value){
							temp = value[i];
							entry.addLink(temp.href,temp.rel,temp.hrefLang,temp.title,temp.type);
						}
						break;
					case "author":
						for(i in value){
							temp = value[i];
							entry.addAuthor(temp.name, temp.email, temp.uri);
						}
						break;
					case "contributor":
						for(i in value){
							temp = value[i];
							entry.addContributor(temp.name, temp.email, temp.uri);
						}
						break;
					case "category":
						for(i in value){
							temp = value[i];
							entry.addCategory(temp.scheme, temp.term, temp.label);
						}
						break;
					case "icon":
					case "id":
					case "logo":
					case "xmlBase":
					case "rights":
						entry[key] = value;
						break;
					case "updated":
					case "published":
					case "issued":
					case "modified":
						entry[key] = dojox.atom.io.model.util.createDate(value);
						break;
					case "content":
					case "summary":
					case "title":
					case "subtitle":
						entry[key] = new dojox.atom.io.model.Content(key);
						entry[key].value = value;
						break;
					default:
						entry[key] = value;
						break;
				}
			}
		}
		entry.store = this;
		entry.isDirty = true;

		if(!this._adds){
			this._adds = [entry];
		}else{
			this._adds.push(entry);
		}

		if(this._feed){
			this._feed.addEntry(entry);
		}else{
			if(this._requests){
				this._requests.push({add:entry});
			}else{
				this._requests = [{add:entry}];
				this._atomIO = new dojox.atom.io.Connection(false, this.urlPreventCache);
				this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
			}
		}
		return true;
	},

	deleteItem: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Write.deleteItem()
		this._assertIsItem(item);

		if(!this._deletes){
			this._deletes = [item];
		}else{
			this._deletes.push(item);
		}

		if(this._feed){
			this._feed.removeEntry(item);
		}else{
			if(this._requests){
				this._requests.push({remove:item});
			}else{
				this._requests = [{remove:item}];
				this._atomIO = new dojox.atom.io.Connection(false, this.urlPreventCache);
				this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
			}
		}
		item = null;
		return true;
	},

	setValue: function(	/* item */ item,
						/* string */ attribute,
						/* almost anything */ value){
		// summary:
		//		See dojo.data.api.Write.setValue()
		this._assertIsItem(item);
		
		var update = {item: item};
		if(this._assertIsAttribute(attribute)){
			switch(attribute){
				case "link":
					update.links = item.links;
					this._addUpdate(update);
					item.links = null;
					item.addLink(value.href,value.rel,value.hrefLang,value.title,value.type);
					item.isDirty = true;
					return true;
				case "author":
					update.authors = item.authors;
					this._addUpdate(update);
					item.authors = null;
					item.addAuthor(value.name, value.email, value.uri);
					item.isDirty = true;
					return true;
				case "contributor":
					update.contributors = item.contributors;
					this._addUpdate(update);
					item.contributors = null;
					item.addContributor(value.name, value.email, value.uri);
					item.isDirty = true;
					return true;
				case "category":
					update.categories = item.categories;
					this._addUpdate(update);
					item.categories = null;
					item.addCategory(value.scheme, value.term, value.label);
					item.isDirty = true;
					return true;
				case "icon":
				case "id":
				case "logo":
				case "xmlBase":
				case "rights":
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = value;
					item.isDirty = true;
					return true;
				case "updated":
				case "published":
				case "issued":
				case "modified":
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = dojox.atom.io.model.util.createDate(value);
					item.isDirty = true;
					return true;
				case "content":
				case "summary":
				case "title":
				case "subtitle":
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = new dojox.atom.io.model.Content(attribute);
					item[attribute].value = value;
					item.isDirty = true;
					return true;
				default:
					update[attribute] = item[attribute];
					this._addUpdate(update);
					item[attribute] = value;
					item.isDirty = true;
					return true;
			}
		}
		return false;
	},

	setValues: function(/* item */ item,
						/* string */ attribute,
						/* array */ values){
		// summary:
		//		See dojo.data.api.Write.setValues()
		if(values.length === 0){
			return this.unsetAttribute(item, attribute);
		}
		this._assertIsItem(item);
		
		var update = {item: item};
		var value;
		var i;
		if(this._assertIsAttribute(attribute)){
			switch(attribute){
				case "link":
					update.links = item.links;
					item.links = null;
					for(i in values){
						value = values[i];
						item.addLink(value.href,value.rel,value.hrefLang,value.title,value.type);
					}
					item.isDirty = true;
					return true;
				case "author":
					update.authors = item.authors;
					item.authors = null;
					for(i in values){
						value = values[i];
						item.addAuthor(value.name, value.email, value.uri);
					}
					item.isDirty = true;
					return true;
				case "contributor":
					update.contributors = item.contributors;
					item.contributors = null;
					for(i in values){
						value = values[i];
						item.addContributor(value.name, value.email, value.uri);
					}
					item.isDirty = true;
					return true;
				case "categories":
					update.categories = item.categories;
					item.categories = null;
					for(i in values){
						value = values[i];
						item.addCategory(value.scheme, value.term, value.label);
					}
					item.isDirty = true;
					return true;
				case "icon":
				case "id":
				case "logo":
				case "xmlBase":
				case "rights":
					update[attribute] = item[attribute];
					item[attribute] = values[0];
					item.isDirty = true;
					return true;
				case "updated":
				case "published":
				case "issued":
				case "modified":
					update[attribute] = item[attribute];
					item[attribute] = dojox.atom.io.model.util.createDate(values[0]);
					item.isDirty = true;
					return true;
				case "content":
				case "summary":
				case "title":
				case "subtitle":
					update[attribute] = item[attribute];
					item[attribute] = new dojox.atom.io.model.Content(attribute);
					item[attribute].values[0] = values[0];
					item.isDirty = true;
					return true;
				default:
					update[attribute] = item[attribute];
					item[attribute] = values[0];
					item.isDirty = true;
					return true;
			}
		}
		this._addUpdate(update);
		return false;
	},

	unsetAttribute: function(	/* item */ item,
								/* string */ attribute){
		// summary:
		//		See dojo.data.api.Write.unsetAttribute()
		this._assertIsItem(item);
		if(this._assertIsAttribute(attribute)){
			if(item[attribute] !== null){
				var update = {item: item};
				switch(attribute){
					case "author":
					case "contributor":
					case "link":
						update[attribute+"s"] = item[attribute+"s"];
						break;
					case "category":
						update.categories = item.categories;
						break;
					default:
						update[attribute] = item[attribute];
						break;
				}
				item.isDirty = true;
				item[attribute] = null;
				this._addUpdate(update);
				return true;
			}
		}
		return false; // boolean
	},

	save: function(/* object */ keywordArgs){
		// summary:
		//		See dojo.data.api.Write.save()
		// keywordArgs:
		//		{
		//			onComplete: function
		//			onError: function
		//			scope: object
		//		}
		var i;
		for(i in this._adds){
			this._atomIO.addEntry(this._adds[i], null, function(){}, keywordArgs.onError, false, keywordArgs.scope);
		}
			
		this._adds = null;
		
		for(i in this._updates){
			this._atomIO.updateEntry(this._updates[i].item, function(){}, keywordArgs.onError, false, this.xmethod, keywordArgs.scope);
		}
			
		this._updates = null;
		
		for(i in this._deletes){
			this._atomIO.removeEntry(this._deletes[i], function(){}, keywordArgs.onError, this.xmethod, keywordArgs.scope);
		}
			
		this._deletes = null;
		
		this._atomIO.getFeed(this.url,dojo.hitch(this,this._setFeed));
		
		if(keywordArgs.onComplete){
			var scope = keywordArgs.scope || dojo.global;
			keywordArgs.onComplete.call(scope);
		}
	},

	revert: function(){
		// summary:
		//		See dojo.data.api.Write.revert()
		var i;
		for(i in this._adds){
			this._feed.removeEntry(this._adds[i]);
		}
			
		this._adds = null;
		
		var update, item, key;
		for(i in this._updates){
			update = this._updates[i];
			item = update.item;
			for(key in update){
				if(key !== "item"){
					item[key] = update[key];
				}
			}
		}
		this._updates = null;
		
		for(i in this._deletes){
			this._feed.addEntry(this._deletes[i]);
		}
		this._deletes = null;
		return true;
	},

	isDirty: function(/* item? */ item){
		// summary:
		//		See dojo.data.api.Write.isDirty()
		if(item){
			this._assertIsItem(item);
			return item.isDirty?true:false; //boolean
		}
		return (this._adds !== null || this._updates !== null); //boolean
	}
});
dojo.extend(dojox.data.AppStore,dojo.data.util.simpleFetch);

return dojox.data.AppStore;
});

},
'dojox/data/dom':function(){
define("dojox/data/dom", ["dojo/_base/kernel", "dojo/_base/lang", "dojox/xml/parser"], 
  function(kernel, lang, xmlParser) {

//DOM type to int value for reference.
//Ints make for more compact code than full constant names.
//ELEMENT_NODE                  = 1;
//ATTRIBUTE_NODE                = 2;
//TEXT_NODE                     = 3;
//CDATA_SECTION_NODE            = 4;
//ENTITY_REFERENCE_NODE         = 5;
//ENTITY_NODE                   = 6;
//PROCESSING_INSTRUCTION_NODE   = 7;
//COMMENT_NODE                  = 8;
//DOCUMENT_NODE                 = 9;
//DOCUMENT_TYPE_NODE            = 10;
//DOCUMENT_FRAGMENT_NODE        = 11;
//NOTATION_NODE                 = 12;

//This file contains internal/helper APIs as holders for people who used them.  They have been migrated to
//a better project, dojox.xml and experimental has been removed there.  Please update usage to the new package.
dojo.deprecated("dojox.data.dom", "Use dojox.xml.parser instead.", "2.0");

var dataDom = lang.getObject("dojox.data.dom",true);

dataDom.createDocument = function(/*string?*/ str, /*string?*/ mimetype){
	//	summary:
	//		cross-browser implementation of creating an XML document object.
	//
	//	str:
	//		Optional text to create the document from.  If not provided, an empty XML document will be created.
	//		If str is empty string "", then a new empty document will be created.
	//	mimetype:
	//		Optional mimetype of the text.  Typically, this is text/xml.  Will be defaulted to text/xml if not provided.
	dojo.deprecated("dojox.data.dom.createDocument()", "Use dojox.xml.parser.parse() instead.", "2.0");
	try{
		return xmlParser.parse(str,mimetype); //DOMDocument.
	}catch(e){
		/*Squeltch errors like the old parser did.*/
		return null;
	}
};

dataDom.textContent = function(/*Node*/node, /*string?*/text){
	//	summary:
	//		Implementation of the DOM Level 3 attribute; scan node for text
	//	description:
	//		Implementation of the DOM Level 3 attribute; scan node for text
	//		This function can also update the text of a node by replacing all child
	//		content of the node.
	//	node:
	//		The node to get the text off of or set the text on.
	//	text:
	//		Optional argument of the text to apply to the node.
	dojo.deprecated("dojox.data.dom.textContent()", "Use dojox.xml.parser.textContent() instead.", "2.0");
	if(arguments.length> 1){
		return xmlParser.textContent(node, text); //string
	}else{
		return xmlParser.textContent(node); //string
	}
};

dataDom.replaceChildren = function(/*Element*/node, /*Node || array*/ newChildren){
	//	summary:
	//		Removes all children of node and appends newChild. All the existing
	//		children will be destroyed.
	//	description:
	//		Removes all children of node and appends newChild. All the existing
	//		children will be destroyed.
	// 	node:
	//		The node to modify the children on
	//	newChildren:
	//		The children to add to the node.  It can either be a single Node or an
	//		array of Nodes.
	dojo.deprecated("dojox.data.dom.replaceChildren()", "Use dojox.xml.parser.replaceChildren() instead.", "2.0");
	xmlParser.replaceChildren(node, newChildren);
};

dataDom.removeChildren = function(/*Element*/node){
	//	summary:
	//		removes all children from node and returns the count of children removed.
	//		The children nodes are not destroyed. Be sure to call dojo._destroyElement on them
	//		after they are not used anymore.
	//	node:
	//		The node to remove all the children from.
	dojo.deprecated("dojox.data.dom.removeChildren()", "Use dojox.xml.parser.removeChildren() instead.", "2.0");
	return dojox.xml.parser.removeChildren(node); //int
};

dataDom.innerXML = function(/*Node*/node){
	//	summary:
	//		Implementation of MS's innerXML function.
	//	node:
	//		The node from which to generate the XML text representation.
	dojo.deprecated("dojox.data.dom.innerXML()", "Use dojox.xml.parser.innerXML() instead.", "2.0");
	return xmlParser.innerXML(node); //string||null
};

return dataDom;

});


},
'dojox/rpc/Service':function(){
define("dojox/rpc/Service", ["dojo", "dojox", "dojo/AdapterRegistry", "dojo/_base/url"], function(dojo, dojox) {

dojo.declare("dojox.rpc.Service", null, {
	constructor: function(smd, options){
		// summary:
		//		Take a string as a url to retrieve an smd or an object that is an smd or partial smd to use
		//		as a definition for the service
		//
		//	smd: object
		//		Takes a number of properties as kwArgs for defining the service.  It also
		//		accepts a string.  When passed a string, it is treated as a url from
		//		which it should synchronously retrieve an smd file.  Otherwise it is a kwArgs
		//		object.  It accepts serviceUrl, to manually define a url for the rpc service
		//		allowing the rpc system to be used without an smd definition. strictArgChecks
		//		forces the system to verify that the # of arguments provided in a call
		//		matches those defined in the smd.  smdString allows a developer to pass
		//		a jsonString directly, which will be converted into an object or alternatively
		//		smdObject is accepts an smdObject directly.
		//
		//	description:
		//		dojox.rpc.Service must be loaded prior to any plugin services like dojox.rpc.Rest
		// 		dojox.rpc.JsonRpc in order for them to register themselves, otherwise you get
		// 		a "No match found" error.
		var url;
		var self = this;
		function processSmd(smd){
			smd._baseUrl = new dojo._Url((dojo.isBrowser ? location.href : dojo.config.baseUrl) ,url || '.') + '';
			self._smd = smd;

			//generate the methods
 			for(var serviceName in self._smd.services){
				var pieces = serviceName.split("."); // handle "namespaced" services by breaking apart by .
				var current = self;
				for(var i=0; i< pieces.length-1; i++){
					// create or reuse each object as we go down the chain
					current = current[pieces[i]] || (current[pieces[i]] = {});
				}
				current[pieces[pieces.length-1]]=	self._generateService(serviceName, self._smd.services[serviceName]);
 			}
		}
		if(smd){
			//ifthe arg is a string, we assume it is a url to retrieve an smd definition from
			if( (dojo.isString(smd)) || (smd instanceof dojo._Url)){
				if(smd instanceof dojo._Url){
					url = smd + "";
				}else{
					url = smd;
				}

				var text = dojo._getText(url);
				if(!text){
					throw new Error("Unable to load SMD from " + smd);
				}else{
					processSmd(dojo.fromJson(text));
				}
			}else{
				processSmd(smd);
			}
		}

		this._options = (options ? options : {});
		this._requestId = 0;
	},

	_generateService: function(serviceName, method){
		if(this[method]){
			throw new Error("WARNING: "+ serviceName+ " already exists for service. Unable to generate function");
		}
		method.name = serviceName;
		var func = dojo.hitch(this, "_executeMethod",method);
		var transport = dojox.rpc.transportRegistry.match(method.transport || this._smd.transport);
		if(transport.getExecutor){
			func = transport.getExecutor(func,method,this);
		}
		var schema = method.returns || (method._schema = {}); // define the schema
		var servicePath = '/' + serviceName +'/';
		// schemas are minimally used to track the id prefixes for the different services
		schema._service = func;
		func.servicePath = servicePath;
		func._schema = schema;
		func.id = dojox.rpc.Service._nextId++;
		return func;
	},
	_getRequest: function(method,args){
		var smd = this._smd;
		var envDef = dojox.rpc.envelopeRegistry.match(method.envelope || smd.envelope || "NONE");
		var parameters = (method.parameters || []).concat(smd.parameters || []);
		if(envDef.namedParams){
			// the serializer is expecting named params
			if((args.length==1) && dojo.isObject(args[0])){
				// looks like we have what we want
				args = args[0];
			}else{
				// they provided ordered, must convert
				var data={};
				for(var i=0;i<method.parameters.length;i++){
					if(typeof args[i] != "undefined" || !method.parameters[i].optional){
						data[method.parameters[i].name]=args[i];
					}
				}
				args = data;
			}
			if(method.strictParameters||smd.strictParameters){
				//remove any properties that were not defined
				for(i in args){
					var found=false;
					for(var j=0; j<parameters.length;j++){
						if(parameters[i].name==i){ found=true; }
					}
					if(!found){
						delete args[i];
					}
				}

			}
			// setting default values
			for(i=0; i< parameters.length; i++){
				var param = parameters[i];
				if(!param.optional && param.name && !args[param.name]){
					if(param["default"]){
						args[param.name] = param["default"];
					}else if(!(param.name in args)){
						throw new Error("Required parameter " + param.name + " was omitted");
					}
				}
			}
		}else if(parameters && parameters[0] && parameters[0].name && (args.length==1) && dojo.isObject(args[0])){
			// looks like named params, we will convert
			if(envDef.namedParams === false){
				// the serializer is expecting ordered params, must be ordered
				args = dojox.rpc.toOrdered(parameters, args);
			}else{
				// named is ok
				args = args[0];
			}
		}

		if(dojo.isObject(this._options)){
			args = dojo.mixin(args, this._options);
		}

		var schema = method._schema || method.returns; // serialize with the right schema for the context;
		var request = envDef.serialize.apply(this, [smd, method, args]);
		request._envDef = envDef;// save this for executeMethod
		var contentType = (method.contentType || smd.contentType || request.contentType);

		// this allows to mandate synchronous behavior from elsewhere when necessary, this may need to be changed to be one-shot in FF3 new sync handling model
		return dojo.mixin(request, {
			sync: dojox.rpc._sync,
			contentType: contentType,
			headers: method.headers || smd.headers || request.headers || {},
			target: request.target || dojox.rpc.getTarget(smd, method),
			transport: method.transport || smd.transport || request.transport,
			envelope: method.envelope || smd.envelope || request.envelope,
			timeout: method.timeout || smd.timeout,
			callbackParamName: method.callbackParamName || smd.callbackParamName,
			rpcObjectParamName: method.rpcObjectParamName || smd.rpcObjectParamName,
			schema: schema,
			handleAs: request.handleAs || "auto",
			preventCache: method.preventCache || smd.preventCache,
			frameDoc: this._options.frameDoc || undefined
		});
	},
	_executeMethod: function(method){
		var args = [];
		var i;
		for(i=1; i< arguments.length; i++){
			args.push(arguments[i]);
		}
		var request = this._getRequest(method,args);
		var deferred = dojox.rpc.transportRegistry.match(request.transport).fire(request);

		deferred.addBoth(function(results){
			return request._envDef.deserialize.call(this,results);
		});
		return deferred;
	}
});

dojox.rpc.getTarget = function(smd, method){
	var dest=smd._baseUrl;
	if(smd.target){
		dest = new dojo._Url(dest,smd.target) + '';
	}
	if(method.target){
		dest = new dojo._Url(dest,method.target) + '';
	}
	return dest;
};

dojox.rpc.toOrdered=function(parameters, args){
	if(dojo.isArray(args)){ return args; }
	var data=[];
	for(var i=0;i<parameters.length;i++){
		data.push(args[parameters[i].name]);
	}
	return data;
};

dojox.rpc.transportRegistry = new dojo.AdapterRegistry(true);
dojox.rpc.envelopeRegistry = new dojo.AdapterRegistry(true);
//Built In Envelopes

dojox.rpc.envelopeRegistry.register(
	"URL",
	function(str){ return str == "URL"; },
	{
		serialize:function(smd, method, data ){
			var d = dojo.objectToQuery(data);
			return {
				data: d,
				transport:"POST"
			};
		},
		deserialize:function(results){
			return results;
		},
		namedParams: true
	}
);

dojox.rpc.envelopeRegistry.register(
	"JSON",
	function(str){ return str == "JSON"; },
	{
		serialize: function(smd, method, data){
			var d = dojo.toJson(data);

			return {
				data: d,
				handleAs: 'json',
				contentType : 'application/json'
			};
		},
		deserialize: function(results){
			return results;
		}
	}
);
dojox.rpc.envelopeRegistry.register(
	"PATH",
	function(str){ return str == "PATH"; },
	{
		serialize:function(smd, method, data){
			var i;
			var target = dojox.rpc.getTarget(smd, method);
			if(dojo.isArray(data)){
				for(i = 0; i < data.length;i++){
					target += '/' + data[i];
				}
			}else{
				for(i in data){
					target += '/' + i + '/' + data[i];
				}
			}

			return {
				data:'',
				target: target
			};
		},
		deserialize:function(results){
			return results;
		}
	}
);



//post is registered first because it is the default;
dojox.rpc.transportRegistry.register(
	"POST",
	function(str){ return str == "POST"; },
	{
		fire:function(r){
			r.url = r.target;
			r.postData = r.data;
			return dojo.rawXhrPost(r);
		}
	}
);

dojox.rpc.transportRegistry.register(
	"GET",
	function(str){ return str == "GET"; },
	{
		fire: function(r){
			r.url=  r.target + (r.data ? '?' + ((r.rpcObjectParamName) ? r.rpcObjectParamName + '=' : '') + r.data : '');
			return dojo.xhrGet(r);
		}
	}
);


//only works ifyou include dojo.io.script
dojox.rpc.transportRegistry.register(
	"JSONP",
	function(str){ return str == "JSONP"; },
	{
		fire: function(r){
			r.url = r.target + ((r.target.indexOf("?") == -1) ? '?' : '&') + ((r.rpcObjectParamName) ? r.rpcObjectParamName + '=' : '') + r.data;
			r.callbackParamName = r.callbackParamName || "callback";
			return dojo.io.script.get(r);
		}
	}
);
dojox.rpc.Service._nextId = 1;

dojo._contentHandlers.auto = function(xhr){
	// automatically choose the right handler based on the returned content type
	var handlers = dojo._contentHandlers;
	var retContentType = xhr.getResponseHeader("Content-Type");
	var results = !retContentType ? handlers.text(xhr) :
		retContentType.match(/\/.*json/) ? handlers.json(xhr) :
		retContentType.match(/\/javascript/) ? handlers.javascript(xhr) :
		retContentType.match(/\/xml/) ? handlers.xml(xhr) : handlers.text(xhr);
	return results;
};

return dojox.rpc.Service;

});

},
'dojox/data/PersevereStore':function(){
define("dojox/data/PersevereStore", ["dojo", "dojox", "require", "dojox/data/JsonQueryRestStore", "dojox/rpc/Client", "dojo/_base/url"], function(dojo, dojox, require) {

// PersevereStore is an extension of JsonRestStore to handle Persevere's special features

dojox.json.ref.serializeFunctions = true; // Persevere supports persisted functions

dojo.declare("dojox.data.PersevereStore",dojox.data.JsonQueryRestStore,{
	useFullIdInQueries: true, // in JSONQuerys use the full id
	jsonQueryPagination: false // use the Range headers instead
});

dojox.data.PersevereStore.getStores = function(/*String?*/path,/*Boolean?*/sync){
	// summary:
	//		Creates Dojo data stores for all the table/classes on a Persevere server
	// path:
	// 		URL of the Persevere server's root, this normally just "/"
	// 		which is the default value if the target is not provided
	// sync:
	// 		Indicates that the operation should happen synchronously.
	// return:
	// 		A map/object of datastores will be returned if it is performed asynchronously,
	// 		otherwise it will return a Deferred object that will provide the map/object.
	// 		The name of each property is a the name of a store,
	// 		and the value is the actual data store object.
	path = (path && (path.match(/\/$/) ? path : (path + '/'))) || '/';
	if(path.match(/^\w*:\/\//)){
		// if it is cross-domain, we will use window.name for communication
		require("dojox/io/xhrScriptPlugin");
		dojox.io.xhrScriptPlugin(path, "callback", dojox.io.xhrPlugins.fullHttpAdapter);
	}
	var plainXhr = dojo.xhr;
	dojo.xhr = function(method,args){
		(args.headers = args.headers || {})['Server-Methods'] = "false";
		return plainXhr.apply(dojo,arguments);
	}
	var rootService= dojox.rpc.Rest(path,true);
	dojox.rpc._sync = sync;
	var dfd = rootService("Class/");//dojo.xhrGet({url: target, sync:!callback, handleAs:'json'});
	var results;
	var stores = {};
	var callId = 0;
	dfd.addCallback(function(schemas){
		dojox.json.ref.resolveJson(schemas, {
			index: dojox.rpc.Rest._index,
			idPrefix: "/Class/",
			assignAbsoluteIds: true
		});
		function setupHierarchy(schema){
			if(schema['extends'] && schema['extends'].prototype){
				if(!schema.prototype || !schema.prototype.isPrototypeOf(schema['extends'].prototype)){
					setupHierarchy(schema['extends']);
					dojox.rpc.Rest._index[schema.prototype.__id] = schema.prototype = dojo.mixin(dojo.delegate(schema['extends'].prototype), schema.prototype);
				}
			}
		}
		function setupMethods(methodsDefinitions, methodsTarget){
			if(methodsDefinitions && methodsTarget){
				for(var j in methodsDefinitions){
					var methodDef = methodsDefinitions[j];
					// if any method definitions indicate that the method should run on the server, than add
					// it to the prototype as a JSON-RPC method
					if(methodDef.runAt != "client" && !methodsTarget[j]){
						methodsTarget[j] = (function(methodName){
							return function(){
								// execute a JSON-RPC call
								var deferred = dojo.rawXhrPost({
									url: this.__id,
									// the JSON-RPC call
									postData: dojox.json.ref.toJson({
										method: methodName,
										id: callId++,
										params: dojo._toArray(arguments)
									}),
									handleAs: "json"
								});
								deferred.addCallback(function(response){
									// handle the response
									return response.error ?
										new Error(response.error) :
										response.result;
								});
								return deferred;
							}
						})(j);
					}
				}
			}
		}
		for(var i in schemas){
			if(typeof schemas[i] == 'object'){
				var schema = schemas[i];
				setupHierarchy(schema);
				setupMethods(schema.methods, schema.prototype = schema.prototype || {});
				setupMethods(schema.staticMethods, schema);
				stores[schemas[i].id] = new dojox.data.PersevereStore({target:new dojo._Url(path,schemas[i].id) + '/',schema:schema});
			}
		}
		return (results = stores);
	});
	dojo.xhr = plainXhr;
	return sync ? results : dfd;
};
dojox.data.PersevereStore.addProxy = function(){
	// summary:
	//		Invokes the XHR proxy plugin. Call this if you will be using x-site data.
	require("dojox/io/xhrPlugins"); // also not necessary, but we can register that Persevere supports proxying
	dojox.io.xhrPlugins.addProxy("/proxy/");
};

return dojox.data.PersevereStore;

});

},
'dojox/data/CssRuleStore':function(){
define("dojox/data/CssRuleStore", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/array", "dojo/_base/json","dojo/_base/window", "dojo/_base/sniff", "dojo/data/util/sorter", "dojo/data/util/filter", "./css"],
 function(lang, declare, array, jsonUtil, winUtil, has, sorter, filter, css) {

return declare("dojox.data.CssRuleStore", null, {
	//	summary:
	//		Basic store to display CSS information.
	//	description:
	//		The CssRuleStore allows users to get information about active CSS rules in the page running the CssRuleStore.
	//		It can also filter out rules from specific stylesheets.  The attributes it exposes on rules are as follows:
	//			selector:				The selector text.
	//			classes:				An array of classes present in this selector.
	//			rule:					The actual DOM Rule object.
	//			style:					The actual DOM CSSStyleDeclaration object.
	//			cssText:				The cssText string provided on the rule object.
	//			styleSheet:				The originating DOM Stylesheet object.
	//			parentStyleSheet: 		The parent stylesheet to the sheet this rule originates from.
	//			parentStyleSheetHref: 	The href of the parent stylesheet.
	//		AND every style attribute denoted as style.*, such as style.textAlign or style.backgroundColor

	_storeRef: '_S',
	_labelAttribute: 'selector', // text representation of the Item [label and identifier may need to stay due to method names]

	_cache: null,

	_browserMap: null,

	_cName: "dojox.data.CssRuleStore",

	constructor: function(/* Object */ keywordParameters){
		// Initializes this store
		if(keywordParameters){
			lang.mixin(this, keywordParameters);
		}
		this._cache = {};
		this._allItems = null;
		this._waiting = [];
		this.gatherHandle = null;
		var self = this;
		// CSS files may not be finished loading by the time the store is constructed.  We need to
		// give them a little time, so setting the stylesheet loading to retry every 250ms.
		function gatherRules(){
			try{
				// Funkiness here is due to css that may still be loading.  This throws an DOM Access
				// error if css isnt completely loaded.
				self.context = css.determineContext(self.context);
				if(self.gatherHandle){
					clearInterval(self.gatherHandle);
					self.gatherHandle = null;
				}
				// Handle any fetches that have been queued while we've been waiting on the CSS files
				// to finish
				while(self._waiting.length){
					var item = self._waiting.pop();
					css.rules.forEach(item.forFunc, null, self.context);
					item.finishFunc();
				}
			}catch(e){}
		}
		this.gatherHandle = setInterval(gatherRules,250);
	},
	
	setContext: function(/* Array */ context){
		// Sets the context in which queries are executed
		// context: Array - Array of CSS string paths to execute queries within
		if(context){
			this.close();
			this.context = css.determineContext(context);
		}
	},

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return {
			"dojo.data.api.Read" : true
		};
	},

	isItem: function(item){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		if(item && item[this._storeRef] == this){
			return true;
		}
		return false;
	},

	hasAttribute: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttribute()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var attrs = this.getAttributes(item);
		if(array.indexOf(attrs, attribute) != -1){
			return true;
		}
		return false;
	},

	getAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		var attrs = ['selector', 'classes', 'rule', 'style', 'cssText', 'styleSheet', 'parentStyleSheet', 'parentStyleSheetHref'];
		var style = item.rule.style;
		if(style){
			var key;
			for(key in style){
				attrs.push("style." + key);
			}
		}
		return attrs;
	},

	getValue: function(item, attribute, defaultValue){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		var value = defaultValue;
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getValues: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.getValues()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var value = null;
		if(attribute === "selector"){
			value = item.rule["selectorText"];
			if(value && lang.isString(value)){
				value = value.split(",");
			}
		}else if(attribute === "classes"){
			value = item.classes;
		}else if(attribute === "rule"){
			value = item.rule.rule;
		}else if(attribute === "style"){
			value = item.rule.style;
		}else if(attribute === "cssText"){
			if(has("ie")){
				if(item.rule.style){
					value = item.rule.style.cssText;
					if(value){
						value = "{ " + value.toLowerCase() + " }";
					}
				}
			}else{
				value = item.rule.cssText;
				if(value){
					value = value.substring(value.indexOf("{"), value.length);
				}
			}
		}else if(attribute === "styleSheet"){
			value = item.rule.styleSheet;
		}else if(attribute === "parentStyleSheet"){
			value = item.rule.parentStyleSheet;
		}else if(attribute === "parentStyleSheetHref"){
			if(item.href){
				value = item.href;
			}
		}else if(attribute.indexOf("style.") === 0){
			var attr = attribute.substring(attribute.indexOf("."), attribute.length);
			value = item.rule.style[attr];
		}else{
			value = [];
		}
		if(value !== undefined){
			if(!lang.isArray(value)){
				value = [value];
			}
		}
		return value;
	},

	getLabel: function(item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		this._assertIsItem(item);
		return this.getValue(item, this._labelAttribute);
	},

	getLabelAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		return [this._labelAttribute];
	},

	containsValue: function(/* item */ item,
							/* attribute-name-string */ attribute,
							/* anything */ value){
		//	summary:
		//		See dojo.data.api.Read.containsValue()
		var regexp = undefined;
		if(typeof value === "string"){
			regexp = filter.patternToRegExp(value, false);
		}
		return this._containsValue(item, attribute, value, regexp); //boolean.
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

	fetch: function(request){
		//	summary:
		//		See dojo.data.api.Read.fetch()
		request = request || {};
		if(!request.store){
			request.store = this;
		}

		var scope = request.scope || winUtil.global;
		if(this._pending && this._pending.length > 0){
			this._pending.push({request: request, fetch: true});
		}else{
			this._pending = [{request: request, fetch: true}];
			this._fetch(request);
		}
		return request;
	},

	_fetch: function(request){
		//	summary:
		//		Populates the _allItems object with unique class names
		var scope = request.scope || winUtil.global;
		if(this._allItems === null){
			this._allItems = {};
			try{
				if(this.gatherHandle){
					this._waiting.push({'forFunc': lang.hitch(this, this._handleRule), 'finishFunc': lang.hitch(this, this._handleReturn)});
				}else{
					css.rules.forEach(lang.hitch(this, this._handleRule), null, this.context);
					this._handleReturn();
				}
			}catch(e){
				if(request.onError){
					request.onError.call(scope, e, request);
				}
			}
		}else{
			this._handleReturn();
		}
	},

	_handleRule: function(rule, styleSheet, href){
		//	summary:
		//		Handles the creation of an item based on the passed rule.  In this store, this implies
		//		parsing out all available class names.
		var selector = rule['selectorText'];
		var s = selector.split(" ");
		var classes = [];
		for(var j=0; j<s.length; j++){
			var tmp = s[j];
			var first = tmp.indexOf('.');
			if(tmp && tmp.length > 0 && first !== -1){
				var last = tmp.indexOf(',') || tmp.indexOf('[');
				tmp = tmp.substring(first, ((last !== -1 && last > first)?last:tmp.length));
				classes.push(tmp);
			}
		}
		var item = {};
		item.rule = rule;
		item.styleSheet = styleSheet;
		item.href = href;
		item.classes = classes;
		item[this._storeRef] = this;
		if(!this._allItems[selector]){
			this._allItems[selector] = [];
		}
		this._allItems[selector].push(item);
	},

	_handleReturn: function(){
		//	summary:
		//		Handles the return from a fetching action.  Delegates requests to act on the resulting
		//		item set to eitehr the _handleFetchReturn or _handleFetchByIdentityReturn depending on
		//		where the request originated.
		var _inProgress = [];
		
		var items = [];
		var item = null;
		for(var i in this._allItems){
			item = this._allItems[i];
			for(var j in item){
				items.push(item[j]);
			}
		}

		var requestInfo;
		// One-level deep clone (can't use dojo.clone, since we don't want to clone all those store refs!)
		while(this._pending.length){
			requestInfo = this._pending.pop();
			requestInfo.request._items = items;
			_inProgress.push(requestInfo);
		}

		while(_inProgress.length){
			requestInfo = _inProgress.pop();
			this._handleFetchReturn(requestInfo.request);
		}
	},

	_handleFetchReturn: function(/*Request */ request){
		//	summary:
		//		Handles a fetchByIdentity request by finding the correct items.
		var scope = request.scope || winUtil.global;
		var items = [];
		//Check to see if we've looked this query up before
		//If so, just reuse it, much faster.  Only regen if query changes.
		var cacheKey = "all";
		var i;
		if(request.query){
			cacheKey = jsonUtil.toJson(request.query);
		}
		if(this._cache[cacheKey]){
			items = this._cache[cacheKey];
		}else if(request.query){
			for(i in request._items){
				var item = request._items[i];
				// Per https://bugs.webkit.org/show_bug.cgi?id=17935 , Safari 3.x always returns the selectorText
				// of a rule in full lowercase.
				var ignoreCase = (request.queryOptions ? request.queryOptions.ignoreCase : false);
				var regexpList = {};
				var key;
				var value;
				for(key in request.query){
					value = request.query[key];
					if(typeof value === "string"){
						regexpList[key] = filter.patternToRegExp(value, ignoreCase);
					}
				}
				var match = true;
				for(key in request.query){
					value = request.query[key];
					if(!this._containsValue(item, key, value, regexpList[key])){
						match = false;
					}
				}
				if(match){
					items.push(item);
				}
			}
			this._cache[cacheKey] = items;
		}else{
			for(i in request._items){
				items.push(request._items[i]);
			}
		}
		var total = items.length;

		//Sort it if we need to.
		if(request.sort){
			items.sort(sorter.createSortFunction(request.sort, this));
		}
		var start = 0;
		var count = items.length;
		if(request.start > 0 && request.start < items.length){
			start = request.start;
		}
		if(request.count && request.count){
			count = request.count;
		}
		var endIdx = start + count;
		if(endIdx > items.length){
			endIdx = items.length;
		}

		items = items.slice(start, endIdx);

		if(request.onBegin){
			request.onBegin.call(scope, total, request);
		}
		if(request.onItem){
			if(lang.isArray(items)){
				for(i = 0; i < items.length; i++){
					request.onItem.call(scope, items[i], request);
				}
				if(request.onComplete){
					request.onComplete.call(scope, null, request);
				}
			}
		}else if(request.onComplete){
			request.onComplete.call(scope, items, request);
		}
		return request;
	},

	close: function(){
		//	summary:
		//		See dojo.data.api.Read.close()
		//		Clears out the cache and allItems objects, meaning all future fetches will requery
		//		the stylesheets.
		this._cache = {};
		this._allItems = null;
	},
	
	_assertIsItem: function(/* item */ item){
		//	summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error(this._cName + ": Invalid item argument.");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error(this._cName + ": Invalid attribute argument.");
		}
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
			return false;
		});
	}
});
});

},
'dojox/data/JsonRestStore':function(){
define("dojox/data/JsonRestStore", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/connect", "dojox/rpc/Rest", 
		"dojox/rpc/JsonRest", "dojox/json/schema", "dojox/data/ServiceStore"], 
  function(lang, declare, connect, rpcRest, rpcJsonRest, jsonSchema, ServiceStore) {

var rpc = lang.getObject("dojox.rpc", true);

/*=====
var ServiceStore = dojox.data.ServiceStore;
=====*/

var JsonRestStore = declare("dojox.data.JsonRestStore", ServiceStore,
	{
		constructor: function(options){
			//summary:
			//		JsonRestStore is a Dojo Data store interface to JSON HTTP/REST web
			//		storage services that support read and write through GET, PUT, POST, and DELETE.
			// options:
			// 		Keyword arguments
			//
			// The *schema* parameter
			//		This is a schema object for this store. This should be JSON Schema format.
			//
			// The *service* parameter
			// 		This is the service object that is used to retrieve lazy data and save results
			// 		The function should be directly callable with a single parameter of an object id to be loaded
			// 		The function should also have the following methods:
			// 			put(id,value) - puts the value at the given id
			// 			post(id,value) - posts (appends) the value at the given id
			// 			delete(id) - deletes the value corresponding to the given id
			//		Note that it is critical that the service parses responses as JSON.
			//		If you are using dojox.rpc.Service, the easiest way to make sure this
			// 		happens is to make the responses have a content type of
			// 		application/json. If you are creating your own service, make sure you
			//		use handleAs: "json" with your XHR requests.
			//
			// The *target* parameter
			// 		This is the target URL for this Service store. This may be used in place
			// 		of a service parameter to connect directly to RESTful URL without
			// 		using a dojox.rpc.Service object.
			//
			// The *idAttribute* parameter
			//		Defaults to 'id'. The name of the attribute that holds an objects id.
			//		This can be a preexisting id provided by the server.
			//		If an ID isn't already provided when an object
			//		is fetched or added to the store, the autoIdentity system
			//		will generate an id for it and add it to the index.
			//
			// The *syncMode* parameter
			//		Setting this to true will set the store to using synchronous calls by default.
			//		Sync calls return their data immediately from the calling function, so
			//		callbacks are unnecessary
			//
			//	description:
			//		The JsonRestStore will cause all saved modifications to be sent to the server using Rest commands (PUT, POST, or DELETE).
			// 		When using a Rest store on a public network, it is important to implement proper security measures to
			//		control access to resources.
			//		On the server side implementing a REST interface means providing GET, PUT, POST, and DELETE handlers.
			//		GET - Retrieve an object or array/result set, this can be by id (like /table/1) or with a
			// 			query (like /table/?name=foo).
			//		PUT - This should modify a object, the URL will correspond to the id (like /table/1), and the body will
			// 			provide the modified object
			//		POST - This should create a new object. The URL will correspond to the target store (like /table/)
			// 			and the body should be the properties of the new object. The server's response should include a
			// 			Location header that indicates the id of the newly created object. This id will be used for subsequent
			// 			PUT and DELETE requests. JsonRestStore also includes a Content-Location header that indicates
			//			the temporary randomly generated id used by client, and this location is used for subsequent
			// 			PUT/DELETEs if no Location header is provided by the server or if a modification is sent prior
			// 			to receiving a response from the server.
			// 		DELETE - This should delete an object by id.
			// 		These articles include more detailed information on using the JsonRestStore:
			//		http://www.sitepen.com/blog/2008/06/13/restful-json-dojo-data/
			//		http://blog.medryx.org/2008/07/24/jsonreststore-overview/
			//
			//	example:
			// 		A JsonRestStore takes a REST service or a URL and uses it the remote communication for a
			// 		read/write dojo.data implementation. A JsonRestStore can be created with a simple URL like:
			// 	|	new JsonRestStore({target:"/MyData/"});
			//	example:
			// 		To use a JsonRestStore with a service, you should create a
			// 		service with a REST transport. This can be configured with an SMD:
			//	|	{
			//	|		services: {
			//	|			jsonRestStore: {
			//	|				transport: "REST",
			//	|				envelope: "URL",
			//	|				target: "store.php",
			//	|				contentType:"application/json",
			//	|				parameters: [
			//	|					{name: "location", type: "string", optional: true}
			//	|				]
			//	|			}
			//	|		}
			//	|	}
			// 		The SMD can then be used to create service, and the service can be passed to a JsonRestStore. For example:
			//	|	var myServices = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.tests.resources", "test.smd"));
			//	|	var jsonStore = new dojox.data.JsonRestStore({service:myServices.jsonRestStore});
			//	example:
			//		The JsonRestStore also supports lazy loading. References can be made to objects that have not been loaded.
			//		For example if a service returned:
			//	|	{"name":"Example","lazyLoadedObject":{"$ref":"obj2"}}
			// 		And this object has accessed using the dojo.data API:
			//	|	var obj = jsonStore.getValue(myObject,"lazyLoadedObject");
			//		The object would automatically be requested from the server (with an object id of "obj2").
			//

			connect.connect(rpcRest._index,"onUpdate",this,function(obj,attrName,oldValue,newValue){
				var prefix = this.service.servicePath;
				if(!obj.__id){
					console.log("no id on updated object ", obj);
				}else if(obj.__id.substring(0,prefix.length) == prefix){
					this.onSet(obj,attrName,oldValue,newValue);
				}
			});
			this.idAttribute = this.idAttribute || 'id';// no options about it, we have to have identity

			if(typeof options.target == 'string'){
				options.target = options.target.match(/\/$/) || this.allowNoTrailingSlash ? options.target : (options.target + '/');
				if(!this.service){
					this.service = rpcJsonRest.services[options.target] ||
							rpcRest(options.target, true);
					// create a default Rest service
				}
			}

			rpcJsonRest.registerService(this.service, options.target, this.schema);
			this.schema = this.service._schema = this.schema || this.service._schema || {};
			// wrap the service with so it goes through JsonRest manager
			this.service._store = this;
			this.service.idAsRef = this.idAsRef;
			this.schema._idAttr = this.idAttribute;
			var constructor = rpcJsonRest.getConstructor(this.service);
			var self = this;
			this._constructor = function(data){
				constructor.call(this, data);
				self.onNew(this);
			}
			this._constructor.prototype = constructor.prototype;
			this._index = rpcRest._index;
		},
		
		// summary:
		//		Will load any schemas referenced content-type header or in Link headers
		loadReferencedSchema: true,
		// summary:
		//		Treat objects in queries as partially loaded objects
		idAsRef: false,
		referenceIntegrity: true,
		target:"",
		// summary:
		// 		Allow no trailing slash on target paths. This is generally discouraged since
		// 		it creates prevents simple scalar values from being used a relative URLs.
		// 		Disabled by default.
		allowNoTrailingSlash: false,
		//Write API Support
		newItem: function(data, parentInfo){
			// summary:
			//		adds a new item to the store at the specified point.
			//		Takes two parameters, data, and options.
			//
			//	data: /* object */
			//		The data to be added in as an item.
			data = new this._constructor(data);
			if(parentInfo){
				// get the previous value or any empty array
				var values = this.getValue(parentInfo.parent,parentInfo.attribute,[]);
				// set the new value
				values = values.concat([data]);
				data.__parent = values;
				this.setValue(parentInfo.parent, parentInfo.attribute, values);
			}
			return data;
		},
		deleteItem: function(item){
			// summary:
			//		deletes item and any references to that item from the store.
			//
			//	item:
			//		item to delete
			//

			//	If the desire is to delete only one reference, unsetAttribute or
			//	setValue is the way to go.
			var checked = [];
			var store = dataExtCfg._getStoreForItem(item) || this;
			if(this.referenceIntegrity){
				// cleanup all references
				rpcJsonRest._saveNotNeeded = true;
				var index = rpcRest._index;
				var fixReferences = function(parent){
					var toSplice;
					// keep track of the checked ones
					checked.push(parent);
					// mark it checked so we don't run into circular loops when encountering cycles
					parent.__checked = 1;
					for(var i in parent){
						if(i.substring(0,2) != "__"){
							var value = parent[i];
							if(value == item){
								if(parent != index){ // make sure we are just operating on real objects
									if(parent instanceof Array){
										// mark it as needing to be spliced, don't do it now or it will mess up the index into the array
										(toSplice = toSplice || []).push(i);
									}else{
										// property, just delete it.
										(dataExtCfg._getStoreForItem(parent) || store).unsetAttribute(parent, i);
									}
								}
							}else{
								if((typeof value == 'object') && value){
									if(!value.__checked){
										// recursively search
										fixReferences(value);
									}
									if(typeof value.__checked == 'object' && parent != index){
										// if it is a modified array, we will replace it
										(dataExtCfg._getStoreForItem(parent) || store).setValue(parent, i, value.__checked);
									}
								}
							}
						}
					}
					if(toSplice){
						// we need to splice the deleted item out of these arrays
						i = toSplice.length;
						parent = parent.__checked = parent.concat(); // indicates that the array is modified
						while(i--){
							parent.splice(toSplice[i], 1);
						}
						return parent;
					}
					return null;
				};
				// start with the index
				fixReferences(index);
				rpcJsonRest._saveNotNeeded = false;
				var i = 0;
				while(checked[i]){
					// remove the checked marker
					delete checked[i++].__checked;
				}
			}
			rpcJsonRest.deleteObject(item);

			store.onDelete(item);
		},
		changing: function(item,_deleting){
			// summary:
			//		adds an item to the list of dirty items.	This item
			//		contains a reference to the item itself as well as a
			//		cloned and trimmed version of old item for use with
			//		revert.
			rpcJsonRest.changing(item,_deleting);
		},
		cancelChanging : function(object){
			//	summary:
			// 		Removes an object from the list of dirty objects
			//		This will prevent that object from being saved to the server on the next save
			//	object:
			//		The item to cancel changes on
			if(!object.__id){
				return;
			}
			dirtyObjects = dirty=rpcJsonRest.getDirtyObjects();
			for(var i=0; i<dirtyObjects.length; i++){
				var dirty = dirtyObjects[i];
				if(object==dirty.object){
					dirtyObjects.splice(i, 1);
					return;
				}
			}
	
		},

		setValue: function(item, attribute, value){
			// summary:
			//		sets 'attribute' on 'item' to 'value'

			var old = item[attribute];
			var store = item.__id ? dataExtCfg._getStoreForItem(item) : this;
			if(jsonSchema && store.schema && store.schema.properties){
				// if we have a schema and schema validator available we will validate the property change
				jsonSchema.mustBeValid(jsonSchema.checkPropertyChange(value,store.schema.properties[attribute]));
			}
			if(attribute == store.idAttribute){
				throw new Error("Can not change the identity attribute for an item");
			}
			store.changing(item);
			item[attribute]=value;
			if(value && !value.__parent){
				value.__parent = item;
			}
			store.onSet(item,attribute,old,value);
		},
		setValues: function(item, attribute, values){
			// summary:
			//	sets 'attribute' on 'item' to 'value' value
			//	must be an array.


			if(!lang.isArray(values)){
				throw new Error("setValues expects to be passed an Array object as its value");
			}
			this.setValue(item,attribute,values);
		},

		unsetAttribute: function(item, attribute){
			// summary:
			//		unsets 'attribute' on 'item'

			this.changing(item);
			var old = item[attribute];
			delete item[attribute];
			this.onSet(item,attribute,old,undefined);
		},
		save: function(kwArgs){
			// summary:
			//		Saves the dirty data using REST Ajax methods. See dojo.data.api.Write for API.
			//
			//	kwArgs.global:
			//		This will cause the save to commit the dirty data for all
			// 		JsonRestStores as a single transaction.
			//
			//	kwArgs.revertOnError
			//		This will cause the changes to be reverted if there is an
			//		error on the save. By default a revert is executed unless
			//		a value of false is provide for this parameter.
			//
			//	kwArgs.incrementalUpdates
			//		For items that have been updated, if this is enabled, the server will be sent a POST request
			// 		with a JSON object containing the changed properties. By default this is
			// 		not enabled, and a PUT is used to deliver an update, and will include a full
			// 		serialization of all the properties of the item/object.
			//		If this is true, the POST request body will consist of a JSON object with
			// 		only the changed properties. The incrementalUpdates parameter may also
			//		be a function, in which case it will be called with the updated and previous objects
			//		and an object update representation can be returned.
			//
			//	kwArgs.alwaysPostNewItems
			//		If this is true, new items will always be sent with a POST request. By default
			//		this is not enabled, and the JsonRestStore will send a POST request if
			//		the item does not include its identifier (expecting server assigned location/
			//		identifier), and will send a PUT request if the item does include its identifier
			//		(the PUT will be sent to the URI corresponding to the provided identifier).

			if(!(kwArgs && kwArgs.global)){
				(kwArgs = kwArgs || {}).service = this.service;
			}
			if("syncMode" in kwArgs ? kwArgs.syncMode : this.syncMode){
				rpc._sync = true;
			}

			var actions = rpcJsonRest.commit(kwArgs);
			this.serverVersion = this._updates && this._updates.length;
			return actions;
		},

		revert: function(kwArgs){
			// summary
			//		returns any modified data to its original state prior to a save();
			//
			//	kwArgs.global:
			//		This will cause the revert to undo all the changes for all
			// 		JsonRestStores in a single operation.
			rpcJsonRest.revert(kwArgs && kwArgs.global && this.service);
		},

		isDirty: function(item){
			// summary
			//		returns true if the item is marked as dirty.
			return rpcJsonRest.isDirty(item, this);
		},
		isItem: function(item, anyStore){
			//	summary:
			//		Checks to see if a passed 'item'
			//		really belongs to this JsonRestStore.
			//
			//	item: /* object */
			//		The value to test for being an item
			//	anyStore: /* boolean*/
			//		If true, this will return true if the value is an item for any JsonRestStore,
			//		not just this instance
			return item && item.__id && (anyStore || this.service == rpcJsonRest.getServiceAndId(item.__id).service);
		},
		_doQuery: function(args){
			var query= typeof args.queryStr == 'string' ? args.queryStr : args.query;
			var deferred = rpcJsonRest.query(this.service,query, args);
			var self = this;
			if(this.loadReferencedSchema){
				deferred.addCallback(function(result){
					var contentType = deferred.ioArgs && deferred.ioArgs.xhr && deferred.ioArgs.xhr.getResponseHeader("Content-Type");
					var schemaRef = contentType && contentType.match(/definedby\s*=\s*([^;]*)/);
					if(contentType && !schemaRef){
						schemaRef = deferred.ioArgs.xhr.getResponseHeader("Link");
						schemaRef = schemaRef && schemaRef.match(/<([^>]*)>;\s*rel="?definedby"?/);
					}
					schemaRef = schemaRef && schemaRef[1];
					if(schemaRef){
						var serviceAndId = rpcJsonRest.getServiceAndId((self.target + schemaRef).replace(/^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/,"$2$3"));
						var schemaDeferred = rpcJsonRest.byId(serviceAndId.service, serviceAndId.id);
						schemaDeferred.addCallbacks(function(newSchema){
							lang.mixin(self.schema, newSchema);
							return result;
						}, function(error){
							console.error(error); // log it, but don't let it cause the main request to fail
							return result;
						});
						return schemaDeferred;
					}
					return undefined;//don't change anything, and deal with the stupid post-commit lint complaints
				});
			}
			return deferred;
		},
		_processResults: function(results, deferred){
			// index the results
			var count = results.length;
			// if we don't know the length, and it is partial result, we will guess that it is twice as big, that will work for most widgets
			return {totalCount:deferred.fullLength || (deferred.request.count == count ? (deferred.request.start || 0) + count * 2 : count), items: results};
		},

		getConstructor: function(){
			// summary:
			// 		Gets the constructor for objects from this store
			return this._constructor;
		},
		getIdentity: function(item){
			var id = item.__clientId || item.__id;
			if(!id){
				return id;
			}
			var prefix = this.service.servicePath.replace(/[^\/]*$/,'');
			// support for relative or absolute referencing with ids
			return id.substring(0,prefix.length) != prefix ?	id : id.substring(prefix.length); // String
		},
		fetchItemByIdentity: function(args){
			var id = args.identity;
			var store = this;
			// if it is an absolute id, we want to find the right store to query
			if(id.toString().match(/^(\w*:)?\//)){
				var serviceAndId = rpcJsonRest.getServiceAndId(id);
				store = serviceAndId.service._store;
				args.identity = serviceAndId.id;
			}
			args._prefix = store.service.servicePath.replace(/[^\/]*$/,'');
			return store.inherited(arguments);
		},
		//Notifcation Support

		onSet: function(){},
		onNew: function(){},
		onDelete: 	function(){},

		getFeatures: function(){
			// summary:
			// 		return the store feature set
			var features = this.inherited(arguments);
			features["dojo.data.api.Write"] = true;
			features["dojo.data.api.Notification"] = true;
			return features;
		},

		getParent: function(item){
			//	summary:
			//		Returns the parent item (or query) for the given item
			//	item:
			//		The item to find the parent of

			return item && item.__parent;
		}


	}
);
JsonRestStore.getStore = function(options, Class){
	//	summary:
	//		Will retrieve or create a store using the given options (the same options
	//		that are passed to JsonRestStore constructor. Returns a JsonRestStore instance
	//	options:
	//		See the JsonRestStore constructor
	//	Class:
	//		Constructor to use (for creating stores from JsonRestStore subclasses).
	// 		This is optional and defaults to JsonRestStore.
	if(typeof options.target == 'string'){
		options.target = options.target.match(/\/$/) || options.allowNoTrailingSlash ?
				options.target : (options.target + '/');
		var store = (rpcJsonRest.services[options.target] || {})._store;
		if(store){
			return store;
		}
	}
	return new (Class || JsonRestStore)(options);
};

var dataExtCfg = lang.getObject("dojox.data",true); 
dataExtCfg._getStoreForItem = function(item){
	if(item.__id){
		var serviceAndId = rpcJsonRest.getServiceAndId(item.__id);
		if(serviceAndId && serviceAndId.service._store){
			return serviceAndId.service._store;
		}else{
			var servicePath = item.__id.toString().match(/.*\//)[0];
			return new JsonRestStore({target:servicePath});
		}
	}
	return null;
};
var jsonRefConfig = lang.getObject("dojox.json.ref", true);
jsonRefConfig._useRefs = true; // Use referencing when identifiable objects are referenced

return JsonRestStore;
});

},
'dojox/json/query':function(){
define("dojox/json/query", ["dojo/_base/kernel", "dojox", "dojo/_base/array"], function(dojo, dojox){

	dojo.getObject("json", true, dojox);

	dojox.json._slice = function(obj,start,end,step){
		// handles slice operations: [3:6:2]
		var len=obj.length,results = [];
		end = end || len;
		start = (start < 0) ? Math.max(0,start+len) : Math.min(len,start);
		end = (end < 0) ? Math.max(0,end+len) : Math.min(len,end);
	  	for(var i=start; i<end; i+=step){
	  		results.push(obj[i]);
	  	}
		return results;
	}
	dojox.json._find = function e(obj,name){
		// handles ..name, .*, [*], [val1,val2], [val]
		// name can be a property to search for, undefined for full recursive, or an array for picking by index
		var results = [];
		function walk(obj){
			if(name){
				if(name===true && !(obj instanceof Array)){
					//recursive object search
					results.push(obj);
				}else if(obj[name]){
					// found the name, add to our results
					results.push(obj[name]);
				}
			}
			for(var i in obj){
				var val = obj[i];
				if(!name){
					// if we don't have a name we are just getting all the properties values (.* or [*])
					results.push(val);
				}else if(val && typeof val == 'object'){

					walk(val);
				}
			}
		}
		if(name instanceof Array){
			// this is called when multiple items are in the brackets: [3,4,5]
			if(name.length==1){
				// this can happen as a result of the parser becoming confused about commas
				// in the brackets like [@.func(4,2)]. Fixing the parser would require recursive
				// analsys, very expensive, but this fixes the problem nicely.
				return obj[name[0]];
			}
			for(var i = 0; i < name.length; i++){
				results.push(obj[name[i]]);
			}
		}else{
			// otherwise we expanding
			walk(obj);
		}
		return results;
	}

	dojox.json._distinctFilter = function(array, callback){
		// does the filter with removal of duplicates in O(n)
		var outArr = [];
		var primitives = {};
		for(var i=0,l=array.length; i<l; ++i){
			var value = array[i];
			if(callback(value, i, array)){
				if((typeof value == 'object') && value){
					// with objects we prevent duplicates with a marker property
					if(!value.__included){
						value.__included = true;
						outArr.push(value);
					}
				}else if(!primitives[value + typeof value]){
					// with primitives we prevent duplicates by putting it in a map
					primitives[value + typeof value] = true;
					outArr.push(value);
				}
			}
		}
		for(i=0,l=outArr.length; i<l; ++i){
			// cleanup the marker properties
			if(outArr[i]){
				delete outArr[i].__included;
			}
		}
		return outArr;
	}
	return dojox.json.query = function(/*String*/query,/*Object?*/obj){
		// summary:
		// 		Performs a JSONQuery on the provided object and returns the results.
		// 		If no object is provided (just a query), it returns a "compiled" function that evaluates objects
		// 		according to the provided query.
		// query:
		// 		Query string
		// 	obj:
		// 		Target of the JSONQuery
		//
		//	description:
		//		JSONQuery provides a comprehensive set of data querying tools including filtering,
		//		recursive search, sorting, mapping, range selection, and powerful expressions with
		//		wildcard string comparisons and various operators. JSONQuery generally supersets
		// 		JSONPath and provides syntax that matches and behaves like JavaScript where
		// 		possible.
		//
		//		JSONQuery evaluations begin with the provided object, which can referenced with
		// 		$. From
		// 		the starting object, various operators can be successively applied, each operating
		// 		on the result of the last operation.
		//
		// 		Supported Operators:
		// 		--------------------
		//		* .property - This will return the provided property of the object, behaving exactly
		// 		like JavaScript.
		// 		* [expression] - This returns the property name/index defined by the evaluation of
		// 		the provided expression, behaving exactly like JavaScript.
		//		* [?expression] - This will perform a filter operation on an array, returning all the
		// 		items in an array that match the provided expression. This operator does not
		//		need to be in brackets, you can simply use ?expression, but since it does not
		//		have any containment, no operators can be used afterwards when used
		// 		without brackets.
		//		* [^?expression] - This will perform a distinct filter operation on an array. This behaves
		//		as [?expression] except that it will remove any duplicate values/objects from the
		//		result set.
		// 		* [/expression], [\expression], [/expression, /expression] - This performs a sort
		// 		operation on an array, with sort based on the provide expression. Multiple comma delimited sort
		// 		expressions can be provided for multiple sort orders (first being highest priority). /
		//		indicates ascending order and \ indicates descending order
		// 		* [=expression] - This performs a map operation on an array, creating a new array
		//		with each item being the evaluation of the expression for each item in the source array.
		//		* [start:end:step] - This performs an array slice/range operation, returning the elements
		//		from the optional start index to the optional end index, stepping by the optional step number.
		// 		* [expr,expr] - This a union operator, returning an array of all the property/index values from
		// 		the evaluation of the comma delimited expressions.
		// 		* .* or [*] - This returns the values of all the properties of the current object.
		// 		* $ - This is the root object, If a JSONQuery expression does not being with a $,
		// 		it will be auto-inserted at the beginning.
		// 		* @ - This is the current object in filter, sort, and map expressions. This is generally
		// 		not necessary, names are auto-converted to property references of the current object
		// 		in expressions.
		// 		*	..property - Performs a recursive search for the given property name, returning
		// 		an array of all values with such a property name in the current object and any subobjects
		// 		* expr = expr - Performs a comparison (like JS's ==). When comparing to
		// 		a string, the comparison string may contain wildcards * (matches any number of
		// 		characters) and ? (matches any single character).
		// 		* expr ~ expr - Performs a string comparison with case insensitivity.
		//		* ..[?expression] - This will perform a deep search filter operation on all the objects and
		// 		subobjects of the current data. Rather than only searching an array, this will search
		// 		property values, arrays, and their children.
		//		* $1,$2,$3, etc. - These are references to extra parameters passed to the query
		//		function or the evaluator function.
		//		* +, -, /, *, &, |, %, (, ), <, >, <=, >=, != - These operators behave just as they do
		// 		in JavaScript.
		//
		//
		//
		// 	|	dojox.json.query(queryString,object)
		// 		and
		// 	|	dojox.json.query(queryString)(object)
		// 		always return identical results. The first one immediately evaluates, the second one returns a
		// 		function that then evaluates the object.
		//
		// 	example:
		// 	|	dojox.json.query("foo",{foo:"bar"})
		// 		This will return "bar".
		//
		//	example:
		//	|	evaluator = dojox.json.query("?foo='bar'&rating>3");
		//		This creates a function that finds all the objects in an array with a property
		//		foo that is equals to "bar" and with a rating property with a value greater
		//		than 3.
		//	|	evaluator([{foo:"bar",rating:4},{foo:"baz",rating:2}])
		// 		This returns:
		// 	|	{foo:"bar",rating:4}
		//
		//	example:
		// 	|	evaluator = dojox.json.query("$[?price<15.00][\rating][0:10]");
		// 	 	This finds objects in array with a price less than 15.00 and sorts then
		// 		by rating, highest rated first, and returns the first ten items in from this
		// 		filtered and sorted list.
		var depth = 0;
		var str = [];
		query = query.replace(/"(\\.|[^"\\])*"|'(\\.|[^'\\])*'|[\[\]]/g,function(t){
			depth += t == '[' ? 1 : t == ']' ? -1 : 0; // keep track of bracket depth
			return (t == ']' && depth > 0) ? '`]' : // we mark all the inner brackets as skippable
					(t.charAt(0) == '"' || t.charAt(0) == "'") ? "`" + (str.push(t) - 1) :// and replace all the strings
						t;
		});
		var prefix = '';
		function call(name){
			// creates a function call and puts the expression so far in a parameter for a call
			prefix = name + "(" + prefix;
		}
		function makeRegex(t,a,b,c,d,e,f,g){
			// creates a regular expression matcher for when wildcards and ignore case is used
			return str[g].match(/[\*\?]/) || f == '~' ?
					"/^" + str[g].substring(1,str[g].length-1).replace(/\\([btnfr\\"'])|([^\w\*\?])/g,"\\$1$2").replace(/([\*\?])/g,"[\\w\\W]$1") + (f == '~' ? '$/i' : '$/') + ".test(" + a + ")" :
					t;
		}
		query.replace(/(\]|\)|push|pop|shift|splice|sort|reverse)\s*\(/,function(){
			throw new Error("Unsafe function call");
		});

		query = query.replace(/([^<>=]=)([^=])/g,"$1=$2"). // change the equals to comparisons except operators ==, <=, >=
			replace(/@|(\.\s*)?[a-zA-Z\$_]+(\s*:)?/g,function(t){
				return t.charAt(0) == '.' ? t : // leave .prop alone
					t == '@' ? "$obj" :// the reference to the current object
					(t.match(/:|^(\$|Math|true|false|null)$/) ? "" : "$obj.") + t; // plain names should be properties of root... unless they are a label in object initializer
			}).
			replace(/\.?\.?\[(`\]|[^\]])*\]|\?.*|\.\.([\w\$_]+)|\.\*/g,function(t,a,b){
				var oper = t.match(/^\.?\.?(\[\s*\^?\?|\^?\?|\[\s*==)(.*?)\]?$/); // [?expr] and ?expr and [=expr and =expr
				if(oper){
					var prefix = '';
					if(t.match(/^\./)){
						// recursive object search
						call("dojox.json._find");
						prefix = ",true)";
					}
					call(oper[1].match(/\=/) ? "dojo.map" : oper[1].match(/\^/) ? "dojox.json._distinctFilter" : "dojo.filter");
					return prefix + ",function($obj){return " + oper[2] + "})";
				}
				oper = t.match(/^\[\s*([\/\\].*)\]/); // [/sortexpr,\sortexpr]
				if(oper){
					// make a copy of the array and then sort it using the sorting expression
					return ".concat().sort(function(a,b){" + oper[1].replace(/\s*,?\s*([\/\\])\s*([^,\\\/]+)/g,function(t,a,b){
							return "var av= " + b.replace(/\$obj/,"a") + ",bv= " + b.replace(/\$obj/,"b") + // FIXME: Should check to make sure the $obj token isn't followed by characters
									";if(av>bv||bv==null){return " + (a== "/" ? 1 : -1) +";}\n" +
									"if(bv>av||av==null){return " + (a== "/" ? -1 : 1) +";}\n";
					}) + "return 0;})";
				}
				oper = t.match(/^\[(-?[0-9]*):(-?[0-9]*):?(-?[0-9]*)\]/); // slice [0:3]
				if(oper){
					call("dojox.json._slice");
					return "," + (oper[1] || 0) + "," + (oper[2] || 0) + "," + (oper[3] || 1) + ")";
				}
				if(t.match(/^\.\.|\.\*|\[\s*\*\s*\]|,/)){ // ..prop and [*]
					call("dojox.json._find");
					return (t.charAt(1) == '.' ?
							",'" + b + "'" : // ..prop
								t.match(/,/) ?
									"," + t : // [prop1,prop2]
									"") + ")"; // [*]
				}
				return t;
			}).
			replace(/(\$obj\s*((\.\s*[\w_$]+\s*)|(\[\s*`([0-9]+)\s*`\]))*)(==|~)\s*`([0-9]+)/g,makeRegex). // create regex matching
			replace(/`([0-9]+)\s*(==|~)\s*(\$obj\s*((\.\s*[\w_$]+)|(\[\s*`([0-9]+)\s*`\]))*)/g,function(t,a,b,c,d,e,f,g){ // and do it for reverse =
				return makeRegex(t,c,d,e,f,g,b,a);
			});
		query = prefix + (query.charAt(0) == '$' ? "" : "$") + query.replace(/`([0-9]+|\])/g,function(t,a){
			//restore the strings
			return a == ']' ? ']' : str[a];
		});
		// create a function within this scope (so it can use expand and slice)

		var executor = eval("1&&function($,$1,$2,$3,$4,$5,$6,$7,$8,$9){var $obj=$;return " + query + "}");
		for(var i = 0;i<arguments.length-1;i++){
			arguments[i] = arguments[i+1];
		}
		return obj ? executor.apply(this,arguments) : executor;
	};

});
},
'dojox/data/KeyValueStore':function(){
define("dojox/data/KeyValueStore", ["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/xhr", "dojo/_base/window", 
		"dojo/data/util/simpleFetch", "dojo/data/util/filter"], 
  function(declare, lang, xhr, winUtil, simpleFetch, filterUtil) {

var KeyValueStore = declare("dojox.data.KeyValueStore", null, {
	//	summary:
	//		This is a dojo.data store implementation.  It can take in either a Javascript
	//		array, JSON string, or URL as the data source.  Data is expected to be in the
	//		following format:
	//			[
	//				{ "key1": "value1" },
	//				{ "key2": "value2" }
	//			]
	//		This is to mimic the Java Properties file format.  Each 'item' from this store
	//		is a JS object representing a key-value pair.  If an item in the above array has
	//		more than one key/value pair, only the first will be used/accessed.
	constructor: function(/* Object */ keywordParameters){
		//	summary: constructor
		//	keywordParameters: {url: String}
		//	keywordParameters: {data: string}
		//	keywordParameters: {dataVar: jsonObject}
		if(keywordParameters.url){
			this.url = keywordParameters.url;
		}
		this._keyValueString = keywordParameters.data;
		this._keyValueVar = keywordParameters.dataVar;
		this._keyAttribute = "key";
		this._valueAttribute = "value";
		this._storeProp = "_keyValueStore";
		this._features = {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
		this._loadInProgress = false;	//Got to track the initial load to prevent duelling loads of the dataset.
		this._queuedFetches = [];
		if(keywordParameters && "urlPreventCache" in keywordParameters){
			this.urlPreventCache = keywordParameters.urlPreventCache?true:false;
		}
	},
	
	url: "",
	data: "",

	//urlPreventCache: boolean
	//Controls if urlPreventCache should be used with underlying xhrGet.
	urlPreventCache: false,
	
	_assertIsItem: function(/* item */ item){
		//	summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.KeyValueStore: a function was passed an item argument that was not an item");
		}
	},
	
	_assertIsAttribute: function(/* item */ item, /* String */ attribute){
		//	summary:
		//      This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(!lang.isString(attribute)){
			throw new Error("dojox.data.KeyValueStore: a function was passed an attribute argument that was not an attribute object nor an attribute name string");
		}
	},

/***************************************
     dojo.data.api.Read API
***************************************/
	getValue: function(	/* item */ item,
						/* attribute-name-string */ attribute,
						/* value? */ defaultValue){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(item, attribute);
		var value;
		if(attribute == this._keyAttribute){ // Looking for key
			value = item[this._keyAttribute];
		}else{
			value = item[this._valueAttribute]; // Otherwise, attribute == ('value' || the actual key )
		}
		if(value === undefined){
			value = defaultValue;
		}
		return value;
	},

	getValues: function(/* item */ item,
						/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.getValues()
		// 		Key/Value syntax does not support multi-valued attributes, so this is just a
		// 		wrapper function for getValue().
		var value = this.getValue(item, attribute);
		return (value ? [value] : []); //Array
	},

	getAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		return [this._keyAttribute, this._valueAttribute, item[this._keyAttribute]];
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttribute()
		this._assertIsItem(item);
		this._assertIsAttribute(item, attribute);
		return (attribute == this._keyAttribute || attribute == this._valueAttribute || attribute == item[this._keyAttribute]);
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
								/* attribute || attribute-name-string */ attribute,
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
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; ++i){
			var possibleValue = values[i];
			if(typeof possibleValue === "string" && regexp){
				return (possibleValue.match(regexp) !== null);
			}else{
				//Non-string matching.
				if(value === possibleValue){
					return true; // Boolean
				}
			}
		}
		return false; // Boolean
	},

	isItem: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		if(something && something[this._storeProp] === this){
			return true; //Boolean
		}
		return false; //Boolean
	},

	isItemLoaded: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItemLoaded()
		//		The KeyValueStore always loads all items, so if it's an item, then it's loaded.
		return this.isItem(something); //Boolean
	},

	loadItem: function(/* object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Read.loadItem()
		//	description:
		//		The KeyValueStore always loads all items, so if it's an item, then it's loaded.
		//		From the dojo.data.api.Read.loadItem docs:
		//			If a call to isItemLoaded() returns true before loadItem() is even called,
		//			then loadItem() need not do any work at all and will not even invoke
		//			the callback handlers.
	},

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return this._features; //Object
	},

	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		//	summary:
		//		See dojo.data.api.Read.close()
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		return item[this._keyAttribute];
	},

	getLabelAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		return [this._keyAttribute];
	},
	
	// The dojo.data.api.Read.fetch() function is implemented as
	// a mixin from dojo.data.util.simpleFetch.
	// That mixin requires us to define _fetchItems().
	_fetchItems: function(	/* Object */ keywordArgs,
							/* Function */ findCallback,
							/* Function */ errorCallback){
		//	summary:
		//		See dojo.data.util.simpleFetch.fetch()
		
		var self = this;

		var filter = function(requestArgs, arrayOfAllItems){
			var items = null;
			if(requestArgs.query){
				items = [];
				var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(var key in requestArgs.query){
					var value = requestArgs.query[key];
					if(typeof value === "string"){
						regexpList[key] = filterUtil.patternToRegExp(value, ignoreCase);
					}
				}

				for(var i = 0; i < arrayOfAllItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfAllItems[i];
					for(var key in requestArgs.query){
						var value = requestArgs.query[key];
						if(!self._containsValue(candidateItem, key, value, regexpList[key])){
							match = false;
						}
					}
					if(match){
						items.push(candidateItem);
					}
				}
			}else if(requestArgs.identity){
				items = [];
				var item;
				for(var key in arrayOfAllItems){
					item = arrayOfAllItems[key];
					if(item[self._keyAttribute] == requestArgs.identity){
						items.push(item);
						break;
					}
				}
			}else{
				// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
				// of the internal list so that multiple callers can get lists and sort without affecting each other.
				if(arrayOfAllItems.length> 0){
					items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
				}
			}
			findCallback(items, requestArgs);
		};

		if(this._loadFinished){
			filter(keywordArgs, this._arrayOfAllItems);
		}else{
			if(this.url !== ""){
				//If fetches come in before the loading has finished, but while
				//a load is in progress, we have to defer the fetching to be
				//invoked in the callback.
				if(this._loadInProgress){
					this._queuedFetches.push({args: keywordArgs, filter: filter});
				}else{
					this._loadInProgress = true;
					var getArgs = {
							url: self.url,
							handleAs: "json-comment-filtered",
							preventCache: this.urlPreventCache
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						self._processData(data);
						filter(keywordArgs, self._arrayOfAllItems);
						self._handleQueuedFetches();
					});
					getHandler.addErrback(function(error){
						self._loadInProgress = false;
						throw error;
					});
				}
			}else if(this._keyValueString){
				this._processData(eval(this._keyValueString));
				this._keyValueString = null;
				filter(keywordArgs, this._arrayOfAllItems);
			}else if(this._keyValueVar){
				this._processData(this._keyValueVar);
				this._keyValueVar = null;
				filter(keywordArgs, this._arrayOfAllItems);
			}else{
				throw new Error("dojox.data.KeyValueStore: No source data was provided as either URL, String, or Javascript variable data input.");
			}
		}
		
	},

	_handleQueuedFetches: function(){
		//	summary:
		//		Internal function to execute delayed request in the store.
		//Execute any deferred fetches now.
		if(this._queuedFetches.length > 0){
			for(var i = 0; i < this._queuedFetches.length; i++){
				var fData = this._queuedFetches[i];
				var delayedFilter = fData.filter;
				var delayedQuery = fData.args;
				if(delayedFilter){
					delayedFilter(delayedQuery, this._arrayOfAllItems);
				}else{
					this.fetchItemByIdentity(fData.args);
				}
			}
			this._queuedFetches = [];
		}
	},
	
	_processData: function(/* Array */ data){
		this._arrayOfAllItems = [];
		for(var i=0; i<data.length; i++){
			this._arrayOfAllItems.push(this._createItem(data[i]));
		}
		this._loadFinished = true;
		this._loadInProgress = false;
	},
	
	_createItem: function(/* Object */ something){
		var item = {};
		item[this._storeProp] = this;
		for(var i in something){
			item[this._keyAttribute] = i;
			item[this._valueAttribute] = something[i];
			break;
		}
		return item; //Object
	},

/***************************************
     dojo.data.api.Identity API
***************************************/
	getIdentity: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentity()
		if(this.isItem(item)){
			return item[this._keyAttribute]; //String
		}
		return null; //null
	},

	getIdentityAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentifierAttributes()
		return [this._keyAttribute];
	},

	fetchItemByIdentity: function(/* object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()
		keywordArgs.oldOnItem = keywordArgs.onItem;
		keywordArgs.onItem = null;
		keywordArgs.onComplete = this._finishFetchItemByIdentity ;
		this.fetch(keywordArgs);
	},
	
	_finishFetchItemByIdentity: function(/* Array */ items, /* object */ request){
		var scope = request.scope || winUtil.global;
		if(items.length){
			request.oldOnItem.call(scope, items[0]);
		}else{
			request.oldOnItem.call(scope, null);
		}
	}
});
//Mix in the simple fetch implementation to this class.
lang.extend(KeyValueStore,simpleFetch);
return KeyValueStore;
});

},
'dojox/rpc/Rest':function(){
define("dojox/rpc/Rest", ["dojo", "dojox"], function(dojo, dojox) {
// Note: This doesn't require dojox.rpc.Service, and if you want it you must require it
// yourself, and you must load it prior to dojox.rpc.Rest.

// summary:
// 		This provides a HTTP REST service with full range REST verbs include PUT,POST, and DELETE.
// description:
// 		A normal GET query is done by using the service directly:
// 		| var restService = dojox.rpc.Rest("Project");
// 		| restService("4");
//		This will do a GET for the URL "/Project/4".
//		| restService.put("4","new content");
//		This will do a PUT to the URL "/Project/4" with the content of "new content".
//		You can also use the SMD service to generate a REST service:
// 		| var services = dojox.rpc.Service({services: {myRestService: {transport: "REST",...
// 		| services.myRestService("parameters");
//
// 		The modifying methods can be called as sub-methods of the rest service method like:
//  	| services.myRestService.put("parameters","data to put in resource");
//  	| services.myRestService.post("parameters","data to post to the resource");
//  	| services.myRestService['delete']("parameters");

  dojo.getObject("rpc.Rest", true, dojox);

	if(dojox.rpc && dojox.rpc.transportRegistry){
		// register it as an RPC service if the registry is available
		dojox.rpc.transportRegistry.register(
			"REST",
			function(str){return str == "REST";},
			{
				getExecutor : function(func,method,svc){
					return new dojox.rpc.Rest(
						method.name,
						(method.contentType||svc._smd.contentType||"").match(/json|javascript/), // isJson
						null,
						function(id, args){
							var request = svc._getRequest(method,[id]);
							request.url= request.target + (request.data ? '?'+  request.data : '');
							if(args && (args.start >= 0 || args.count >= 0)){
								request.headers = request.headers || {};
								request.headers.Range = "items=" + (args.start || '0') + '-' +
									(("count" in args && args.count != Infinity) ?
										(args.count + (args.start || 0) - 1) : '');
							}
							return request;
						}
					);
				}
			}
		);
	}
	var drr;

	function index(deferred, service, range, id){
		deferred.addCallback(function(result){
			if(deferred.ioArgs.xhr && range){
					// try to record the total number of items from the range header
					range = deferred.ioArgs.xhr.getResponseHeader("Content-Range");
					deferred.fullLength = range && (range=range.match(/\/(.*)/)) && parseInt(range[1]);
			}
			return result;
		});
		return deferred;
	}
	drr = dojox.rpc.Rest = function(/*String*/path, /*Boolean?*/isJson, /*Object?*/schema, /*Function?*/getRequest){
		// summary:
		//		Creates a REST service using the provided path.
		var service;
		// it should be in the form /Table/
		service = function(id, args){
			return drr._get(service, id, args);
		};
		service.isJson = isJson;
		service._schema = schema;
		// cache:
		//		This is an object that provides indexing service
		// 		This can be overriden to take advantage of more complex referencing/indexing
		// 		schemes
		service.cache = {
			serialize: isJson ? ((dojox.json && dojox.json.ref) || dojo).toJson : function(result){
				return result;
			}
		};
		// the default XHR args creator:
		service._getRequest = getRequest || function(id, args){
			if(dojo.isObject(id)){
				id = dojo.objectToQuery(id);
				id = id ? "?" + id: "";
			}
			if(args && args.sort && !args.queryStr){
				id += (id ? "&" : "?") + "sort("
				for(var i = 0; i<args.sort.length; i++){
					var sort = args.sort[i];
					id += (i > 0 ? "," : "") + (sort.descending ? '-' : '+') + encodeURIComponent(sort.attribute);
				}
				id += ")";
			}
			var request = {
				url: path + (id == null ? "" : id),
				handleAs: isJson ? 'json' : 'text',
				contentType: isJson ? 'application/json' : 'text/plain',
				sync: dojox.rpc._sync,
				headers: {
					Accept: isJson ? 'application/json,application/javascript' : '*/*'
				}
			};
			if(args && (args.start >= 0 || args.count >= 0)){
				request.headers.Range = "items=" + (args.start || '0') + '-' +
					(("count" in args && args.count != Infinity) ?
						(args.count + (args.start || 0) - 1) : '');
			}
			dojox.rpc._sync = false;
			return request;
		};
		// each calls the event handler
		function makeRest(name){
			service[name] = function(id,content){
				return drr._change(name,service,id,content); // the last parameter is to let the OfflineRest know where to store the item
			};
		}
		makeRest('put');
		makeRest('post');
		makeRest('delete');
		// record the REST services for later lookup
		service.servicePath = path;
		return service;
	};

	drr._index={};// the map of all indexed objects that have gone through REST processing
	drr._timeStamps={};
	// these do the actual requests
	drr._change = function(method,service,id,content){
		// this is called to actually do the put, post, and delete
		var request = service._getRequest(id);
		request[method+"Data"] = content;
		return index(dojo.xhr(method.toUpperCase(),request,true),service);
	};

	drr._get= function(service,id, args){
		args = args || {};
		// this is called to actually do the get
		return index(dojo.xhrGet(service._getRequest(id, args)), service, (args.start >= 0 || args.count >= 0), id);
	};

	return dojox.rpc.Rest;
});

},
'dojox/rpc/Client':function(){
define("dojox/rpc/Client", ["dojo", "dojox"], function(dojo, dojox) {

	dojo.getObject("rpc.Client", true, dojox);

	// Provide extra headers for robust client and server communication

	dojo._defaultXhr = dojo.xhr;
	dojo.xhr = function(method,args){
		var headers = args.headers = args.headers || {};
		// set the client id, this can be used by servers to maintain state information with the
		// a specific client. Many servers rely on sessions for this, but sessions are shared
		// between tabs/windows, so this is not appropriate for application state, it
		// really only useful for storing user authentication
		headers["Client-Id"] = dojox.rpc.Client.clientId;
		// set the sequence id. HTTP is non-deterministic, message can arrive at the server
		// out of order. In complex Ajax applications, it may be more to ensure that messages
		// can be properly sequenced deterministically. This applies a sequency id to each
		// XHR request so that the server can order them.
		headers["Seq-Id"] = dojox._reqSeqId = (dojox._reqSeqId||0)+1;
		return dojo._defaultXhr.apply(dojo,arguments);
	}

	// initiate the client id to a good random number
	dojox.rpc.Client.clientId = (Math.random() + '').substring(2,14) + (new Date().getTime() + '').substring(8,13);

	return dojox.rpc.Client;

});

},
'dojox/rpc/JsonRest':function(){
define("dojox/rpc/JsonRest", ["dojo", "dojox", "dojox/json/ref", "dojox/rpc/Rest"], function(dojo, dojox) {
	var dirtyObjects = [];
	var Rest = dojox.rpc.Rest;
	var jr;
	function resolveJson(service, deferred, value, defaultId){
		var timeStamp = deferred.ioArgs && deferred.ioArgs.xhr && deferred.ioArgs.xhr.getResponseHeader("Last-Modified");
		if(timeStamp && Rest._timeStamps){
			Rest._timeStamps[defaultId] = timeStamp;
		}
		var hrefProperty = service._schema && service._schema.hrefProperty;
		if(hrefProperty){
			dojox.json.ref.refAttribute = hrefProperty;
		}
		value = value && dojox.json.ref.resolveJson(value, {
			defaultId: defaultId,
			index: Rest._index,
			timeStamps: timeStamp && Rest._timeStamps,
			time: timeStamp,
			idPrefix: service.servicePath.replace(/[^\/]*$/,''),
			idAttribute: jr.getIdAttribute(service),
			schemas: jr.schemas,
			loader:	jr._loader,
			idAsRef: service.idAsRef,
			assignAbsoluteIds: true
		});
		dojox.json.ref.refAttribute  = "$ref";
		return value;
	}
	jr = dojox.rpc.JsonRest={
		serviceClass: dojox.rpc.Rest,
		conflictDateHeader: "If-Unmodified-Since",
		commit: function(kwArgs){
			// summary:
			//		Saves the dirty data using REST Ajax methods

			kwArgs = kwArgs || {};
			var actions = [];
			var alreadyRecorded = {};
			var savingObjects = [];
			for(var i = 0; i < dirtyObjects.length; i++){
				var dirty = dirtyObjects[i];
				var object = dirty.object;
				var old = dirty.old;
				var append = false;
				if(!(kwArgs.service && (object || old) &&
						(object || old).__id.indexOf(kwArgs.service.servicePath)) && dirty.save){
					delete object.__isDirty;
					if(object){
						if(old){
							// changed object
							var pathParts;
							if((pathParts = object.__id.match(/(.*)#.*/))){ // it is a path reference
								// this means it is a sub object, we must go to the parent object and save it
								object = Rest._index[pathParts[1]];
							}
							if(!(object.__id in alreadyRecorded)){// if it has already been saved, we don't want to repeat it
								// record that we are saving
								alreadyRecorded[object.__id] = object;
								if(kwArgs.incrementalUpdates
									&& !pathParts){ // I haven't figured out how we would do incremental updates on sub-objects yet
									// make an incremental update using a POST
									var incremental = (typeof kwArgs.incrementalUpdates == 'function' ?
										kwArgs.incrementalUpdates : function(){
											incremental = {};
											for(var j in object){
												if(object.hasOwnProperty(j)){
													if(object[j] !== old[j]){
														incremental[j] = object[j];
													}
												}else if(old.hasOwnProperty(j)){
													// we can't use incremental updates to remove properties
													return null;
												}
											}
											return incremental;
										})(object, old);
								}
								
								if(incremental){
									actions.push({method:"post",target:object, content: incremental});
								}
								else{
									actions.push({method:"put",target:object,content:object});
								}
							}
						}else{
							// new object
							var service = jr.getServiceAndId(object.__id).service;
							var idAttribute = jr.getIdAttribute(service);
							if((idAttribute in object) && !kwArgs.alwaysPostNewItems){
								// if the id attribute is specified, then we should know the location
								actions.push({method:"put",target:object, content:object});
							}else{
								actions.push({method:"post",target:{__id:service.servicePath},
														content:object});
							}
						}
					}else if(old){
						// deleted object
						actions.push({method:"delete",target:old});
					}//else{ this would happen if an object is created and then deleted, don't do anything
					savingObjects.push(dirty);
					dirtyObjects.splice(i--,1);
				}
			}
			dojo.connect(kwArgs,"onError",function(){
				if(kwArgs.revertOnError !== false){
					var postCommitDirtyObjects = dirtyObjects;
					dirtyObjects = savingObjects;
					var numDirty = 0; // make sure this does't do anything if it is called again
					jr.revert(); // revert if there was an error
					dirtyObjects = postCommitDirtyObjects;
				}
				else{
					dirtyObjects = dirtyObjects.concat(savingObjects);
				}
			});
			jr.sendToServer(actions, kwArgs);
			return actions;
		},
		sendToServer: function(actions, kwArgs){
			var xhrSendId;
			var plainXhr = dojo.xhr;
			var left = actions.length;// this is how many changes are remaining to be received from the server
			var i, contentLocation;
			var timeStamp;
			var conflictDateHeader = this.conflictDateHeader;
			// add headers for extra information
			dojo.xhr = function(method,args){
				// keep the transaction open as we send requests
				args.headers = args.headers || {};
				// the last one should commit the transaction
				args.headers['Transaction'] = actions.length - 1 == i ? "commit" : "open";
				if(conflictDateHeader && timeStamp){
					args.headers[conflictDateHeader] = timeStamp;
				}
				if(contentLocation){
					args.headers['Content-ID'] = '<' + contentLocation + '>';
				}
				return plainXhr.apply(dojo,arguments);
			};
			for(i =0; i < actions.length;i++){ // iterate through the actions to execute
				var action = actions[i];
				dojox.rpc.JsonRest._contentId = action.content && action.content.__id; // this is used by OfflineRest
				var isPost = action.method == 'post';
				timeStamp = action.method == 'put' && Rest._timeStamps[action.content.__id];
				if(timeStamp){
					// update it now
					Rest._timeStamps[action.content.__id] = (new Date()) + '';
				}
				// send the content location to the server
				contentLocation = isPost && dojox.rpc.JsonRest._contentId;
				var serviceAndId = jr.getServiceAndId(action.target.__id);
				var service = serviceAndId.service;
				var dfd = action.deferred = service[action.method](
									serviceAndId.id.replace(/#/,''), // if we are using references, we need eliminate #
									dojox.json.ref.toJson(action.content, false, service.servicePath, true)
								);
				(function(object, dfd, service){
					dfd.addCallback(function(value){
						try{
							// Implements id assignment per the HTTP specification
							var newId = dfd.ioArgs.xhr && dfd.ioArgs.xhr.getResponseHeader("Location");
							//TODO: match URLs if the servicePath is relative...
							if(newId){
								// if the path starts in the middle of an absolute URL for Location, we will use the just the path part
								var startIndex = newId.match(/(^\w+:\/\/)/) && newId.indexOf(service.servicePath);
								newId = startIndex > 0 ? newId.substring(startIndex) : (service.servicePath + newId).
										// now do simple relative URL resolution in case of a relative URL.
										replace(/^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/,'$2$3');
								object.__id = newId;
								Rest._index[newId] = object;
							}
							value = resolveJson(service, dfd, value, object && object.__id);
						}catch(e){}
						if(!(--left)){
							if(kwArgs.onComplete){
								kwArgs.onComplete.call(kwArgs.scope, actions);
							}
						}
						return value;
					});
				})(action.content, dfd, service);
								
				dfd.addErrback(function(value){
					
					// on an error we want to revert, first we want to separate any changes that were made since the commit
					left = -1; // first make sure that success isn't called
					kwArgs.onError.call(kwArgs.scope, value);
				});
			}
			// revert back to the normal XHR handler
			dojo.xhr = plainXhr;
			
		},
		getDirtyObjects: function(){
			return dirtyObjects;
		},
		revert: function(service){
			// summary:
			//		Reverts all the changes made to JSON/REST data
			for(var i = dirtyObjects.length; i > 0;){
				i--;
				var dirty = dirtyObjects[i];
				var object = dirty.object;
				var old = dirty.old;
				var store = dojox.data._getStoreForItem(object || old);
				
				if(!(service && (object || old) &&
					(object || old).__id.indexOf(service.servicePath))){
					// if we are in the specified store or if this is a global revert
					if(object && old){
						// changed
						for(var j in old){
							if(old.hasOwnProperty(j) && object[j] !== old[j]){
								if(store){
									store.onSet(object, j, object[j], old[j]);
								}
								object[j] = old[j];
							}
						}
						for(j in object){
							if(!old.hasOwnProperty(j)){
								if(store){
									store.onSet(object, j, object[j]);
								}
								delete object[j];
							}
						}
					}else if(!old){
						// was an addition, remove it
						if(store){
							store.onDelete(object);
						}
					}else{
						// was a deletion, we will add it back
						if(store){
							store.onNew(old);
						}
					}
					delete (object || old).__isDirty;
					dirtyObjects.splice(i, 1);
				}
			}
		},
		changing: function(object,_deleting){
			// summary:
			//		adds an object to the list of dirty objects.  This object
			//		contains a reference to the object itself as well as a
			//		cloned and trimmed version of old object for use with
			//		revert.
			if(!object.__id){
				return;
			}
			object.__isDirty = true;
			//if an object is already in the list of dirty objects, don't add it again
			//or it will overwrite the premodification data set.
			for(var i=0; i<dirtyObjects.length; i++){
				var dirty = dirtyObjects[i];
				if(object==dirty.object){
					if(_deleting){
						// we are deleting, no object is an indicator of deletiong
						dirty.object = false;
						if(!this._saveNotNeeded){
							dirty.save = true;
						}
					}
					return;
				}
			}
			var old = object instanceof Array ? [] : {};
			for(i in object){
				if(object.hasOwnProperty(i)){
					old[i] = object[i];
				}
			}
			dirtyObjects.push({object: !_deleting && object, old: old, save: !this._saveNotNeeded});
		},
		deleteObject: function(object){
			// summary:
			//		deletes an object
			//	object:
			//  	object to delete
			this.changing(object,true);
		},
		getConstructor: function(/*Function|String*/service, schema){
			// summary:
			// 		Creates or gets a constructor for objects from this service
			if(typeof service == 'string'){
				var servicePath = service;
				service = new dojox.rpc.Rest(service,true);
				this.registerService(service, servicePath, schema);
			}
			if(service._constructor){
				return service._constructor;
			}
			service._constructor = function(data){
				// summary:
				//		creates a new object for this table
				//
				//	data:
				//		object to mixed in
				var self = this;
				var args = arguments;
				var properties;
				var initializeCalled;
				function addDefaults(schema){
					if(schema){
						addDefaults(schema['extends']);
						properties = schema.properties;
						for(var i in properties){
							var propDef = properties[i];
							if(propDef && (typeof propDef == 'object') && ("default" in propDef)){
								self[i] = propDef["default"];
							}
						}
					}
					if(schema && schema.prototype && schema.prototype.initialize){
						initializeCalled = true;
						schema.prototype.initialize.apply(self, args);
					}
				}
				addDefaults(service._schema);
				if(!initializeCalled && data && typeof data == 'object'){
					dojo.mixin(self,data);
				}
				var idAttribute = jr.getIdAttribute(service);
				Rest._index[this.__id = this.__clientId =
						service.servicePath + (this[idAttribute] ||
							Math.random().toString(16).substring(2,14) + '@' + ((dojox.rpc.Client && dojox.rpc.Client.clientId) || "client"))] = this;
				if(dojox.json.schema && properties){
					dojox.json.schema.mustBeValid(dojox.json.schema.validate(this, service._schema));
				}
				dirtyObjects.push({object:this, save: true});
			};
			return dojo.mixin(service._constructor, service._schema, {load:service});
		},
		fetch: function(absoluteId){
			// summary:
			//		Fetches a resource by an absolute path/id and returns a dojo.Deferred.
			var serviceAndId = jr.getServiceAndId(absoluteId);
			return this.byId(serviceAndId.service,serviceAndId.id);
		},
		getIdAttribute: function(service){
			// summary:
			//		Return the ids attribute used by this service (based on it's schema).
			//		Defaults to "id", if not other id is defined
			var schema = service._schema;
			var idAttr;
			if(schema){
				if(!(idAttr = schema._idAttr)){
					for(var i in schema.properties){
						if(schema.properties[i].identity || (schema.properties[i].link == "self")){
							schema._idAttr = idAttr = i;
						}
					}
				}
			}
			return idAttr || 'id';
		},
		getServiceAndId: function(/*String*/absoluteId){
			// summary:
			//		Returns the REST service and the local id for the given absolute id. The result
			// 		is returned as an object with a service property and an id property
			//	absoluteId:
			//		This is the absolute id of the object
			var serviceName = '';
			
			for(var service in jr.services){
				if((absoluteId.substring(0, service.length) == service) && (service.length >= serviceName.length)){
					serviceName = service;
				}
			}
			if (serviceName){
				return {service: jr.services[serviceName], id:absoluteId.substring(serviceName.length)};
			}
			var parts = absoluteId.match(/^(.*\/)([^\/]*)$/);
			return {service: new jr.serviceClass(parts[1], true), id:parts[2]};
		},
		services:{},
		schemas:{},
		registerService: function(/*Function*/ service, /*String*/ servicePath, /*Object?*/ schema){
			//	summary:
			//		Registers a service for as a JsonRest service, mapping it to a path and schema
			//	service:
			//		This is the service to register
			//	servicePath:
			//		This is the path that is used for all the ids for the objects returned by service
			//	schema:
			//		This is a JSON Schema object to associate with objects returned by this service
			servicePath = service.servicePath = servicePath || service.servicePath;
			service._schema = jr.schemas[servicePath] = schema || service._schema || {};
			jr.services[servicePath] = service;
		},
		byId: function(service, id){
			// if caching is allowed, we look in the cache for the result
			var deferred, result = Rest._index[(service.servicePath || '') + id];
			if(result && !result._loadObject){// cache hit
				deferred = new dojo.Deferred();
				deferred.callback(result);
				return deferred;
			}
			return this.query(service, id);
		},
		query: function(service, id, args){
			var deferred = service(id, args);
			
			deferred.addCallback(function(result){
				if(result.nodeType && result.cloneNode){
					// return immediately if it is an XML document
					return result;
				}
				return resolveJson(service, deferred, result, typeof id != 'string' || (args && (args.start || args.count)) ? undefined: id);
			});
			return deferred;
		},
		_loader: function(callback){
			// load a lazy object
			var serviceAndId = jr.getServiceAndId(this.__id);
			var self = this;
			jr.query(serviceAndId.service, serviceAndId.id).addBoth(function(result){
				// if they are the same this means an object was loaded, otherwise it
				// might be a primitive that was loaded or maybe an error
				if(result == self){
					// we can clear the flag, so it is a loaded object
					delete result.$ref;
					delete result._loadObject;
				}else{
					// it is probably a primitive value, we can't change the identity of an object to
					//	the loaded value, so we will keep it lazy, but define the lazy loader to always
					//	return the loaded value
					self._loadObject = function(callback){
						callback(result);
					};
				}
				callback(result);
			});
		},
		isDirty: function(item, store){
			// summary
			//		returns true if the item is marked as dirty or true if there are any dirty items
			if(!item){
				if(store){
					return dojo.some(dirtyObjects, function(dirty){
						return dojox.data._getStoreForItem(dirty.object || dirty.old) == store;
					});
				}
				return !!dirtyObjects.length;
			}
			return item.__isDirty;
		}
		
	};

	return dojox.rpc.JsonRest;
});


},
'dojox/data/ClientFilter':function(){
define("dojox/data/ClientFilter", ["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/Deferred", "dojo/data/util/filter"], 
  function(declare, lang, array, Deferred, filter) {

// This is an abstract data store module for adding updateable result set functionality to an existing data store class

	var addUpdate = function(store,create,remove){
		// create a handler that adds to the list of notifications
		return function(item){
			store._updates.push({
					create:create && item,
					remove:remove && item
				});
			ClientFilter.onUpdate();
		}
	};
	var ClientFilter = declare("dojox.data.ClientFilter", null, {
			cacheByDefault: false,
			constructor: function(){
				// summary:
				//		This is an abstract class that data stores can extend to add updateable result set functionality
				//		as well as client side querying capabilities. This enables
				//		widgets to be aware of how active results change in response to the modifications/notifications.
				//
				//	description:
				//		To a update a result set after a notification (onNew, onSet, and onDelete),
				//		widgets can call the updateResultSet method. Widgets can use the updated
				//		result sets to determine how to react to notifications, and how to update their displayed results
				//		based on changes.
				//
				//		This module will use the best available information to update result sets, using query attribute
				//		objects to determine if items are in a result set, and using the sort arrays to maintain sort
				//		information. However, queries can be opaque strings, and this module can not update
				//		results by itself in this case. In this situations, data stores can provide a isUpdateable(request) function
				//		and matchesQuery(item,request) function. If a data store can handle a query, it can return true from
				//		isUpdateable and if an item matches a query, it can return true from matchesQuery. Here is
				//		definition of isUpdateable and matchesQuery
				//		isUpdateable(request)  - request is the keywords arguments as is passed to the fetch function.
				//		matchesQuery(item,request) - item is the item to test, and request is the value arguments object
				//				for the fetch function.
				//
				//		You can define a property on this object instance "cacheByDefault" to a value of true that will
				//		cause all queries to be cached by default unless the cache queryOption is explicitly set to false.
				//		This can be defined in the constructor options for ServiceStore/JsonRestStore and subtypes.
				//
				// example:
				//		to make a updated-result-set data store from an existing data store:
				//	|	dojo.declare("dojox.data.MyLiveDataStore",
				//	|		dojox.data.MyDataStore,dojox.data.ClientFilter], // subclass LiveResultSets if available
				//	|		{}
				//	|	);
				this.onSet = addUpdate(this,true,true);
				this.onNew = addUpdate(this,true,false);
				this.onDelete = addUpdate(this,false,true);
				this._updates= [];
				this._fetchCache = [];
			},
			clearCache: function(){
				//	summary:
				//		Clears the cache of client side queries
				this._fetchCache = [];
			},
			updateResultSet: function(/*Array*/ resultSet, /*Object*/ request){
				//	summary:
				//		Attempts to update the given result set based on previous notifications
				//	resultSet:
				//		The result set array that should be updated
				//	request:
				//		This object follows the same meaning as the keywordArgs passed to a dojo.data.api.Read.fetch.
				//	description:
				// 		This will attempt to update the provide result based on previous notification, adding new items
				// 		from onNew calls, removing deleted items, and updating modified items, and properly removing
				//  	and adding items as required by the query and sort parameters. This function will return:
				//		0: Indicates it could not successfully update the result set
				//		1: Indicates it could successfully handle all the notifications, but no changes were made to the result set
				//		2: Indicates it successfully handled all the notifications and result set has been updated.
				if(this.isUpdateable(request)){
					// we try to avoid rerunning notification updates more than once on the same object for performance
					for(var i = request._version || 0; i < this._updates.length;i++){
						// for each notification,we will update the result set
						var create = this._updates[i].create;
						var remove = this._updates[i].remove;
						if(remove){
							for(var j = 0; j < resultSet.length;j++){
								if(this.getIdentity(resultSet[j]) == this.getIdentity(remove)){
									resultSet.splice(j--,1);
									var updated = true;
								}
							}
						}
						if(create && this.matchesQuery(create,request) && // if there is a new/replacement item and it matches the query
								array.indexOf(resultSet,create) == -1){ // and it doesn't already exist in query
							resultSet.push(create); // should this go at the beginning by default instead?
							updated = true;
						}
					}
					if(request.sort && updated){
						// do the sort if needed
						resultSet.sort(this.makeComparator(request.sort.concat()));
					}
					resultSet._fullLength = resultSet.length;
					if(request.count && updated && request.count !== Infinity){
						// do we really need to do this?
						// make sure we still find within the defined paging set
						resultSet.splice(request.count, resultSet.length);
					}
					request._version = this._updates.length;
					return updated ? 2 : 1;
				}
				return 0;
			},
			querySuperSet: function(argsSuper, argsSub){
				//	summary:
				//		Determines whether the provided arguments are super/sub sets of each other
				// argsSuper:
				//		Dojo Data Fetch arguments
				// argsSub:
				//		Dojo Data Fetch arguments
				if(argsSuper.query == argsSub.query){
					return {};
				}
				if(!(argsSub.query instanceof Object && // sub query must be an object
						// super query must be non-existent or an object
						(!argsSuper.query || typeof argsSuper.query == 'object'))){
					return false;
				}
				var clientQuery = lang.mixin({},argsSub.query);
				for(var i in argsSuper.query){
					if(clientQuery[i] == argsSuper.query[i]){
						delete clientQuery[i];
					}else if(!(typeof argsSuper.query[i] == 'string' &&
							// if it is a pattern, we can test to see if it is a sub-pattern
							// FIXME: This is not technically correct, but it will work for the majority of cases
							filter.patternToRegExp(argsSuper.query[i]).test(clientQuery[i]))){
						return false;
					}
				}
				return clientQuery;
			},
			//	This is the point in the version notification history at which it is known that the server is in sync, this should
			//	be updated to this._updates.length on commit operations.
			serverVersion: 0,
			
			cachingFetch: function(args){
				var self = this;
				for(var i = 0; i < this._fetchCache.length;i++){
					var cachedArgs = this._fetchCache[i];
					var clientQuery = this.querySuperSet(cachedArgs,args);
					if(clientQuery !== false){
						var defResult = cachedArgs._loading;
						if(!defResult){
							defResult = new Deferred();
							defResult.callback(cachedArgs.cacheResults);
						}
						defResult.addCallback(function(results){
							results = self.clientSideFetch(lang.mixin(lang.mixin({}, args),{query:clientQuery}), results);
							defResult.fullLength = results._fullLength;
							return results;
						});
						args._version = cachedArgs._version;
						break;
					}
				}
				if(!defResult){
					var serverArgs = lang.mixin({}, args);
					var putInCache = (args.queryOptions || 0).cache;
					var fetchCache = this._fetchCache;
					if(putInCache === undefined ? this.cacheByDefault : putInCache){
						// we are caching this request, so we want to get all the data, and page on the client side
						if(args.start || args.count){
							delete serverArgs.start;
							delete serverArgs.count;
							args.clientQuery = lang.mixin(args.clientQuery || {}, {
								start: args.start,
								count: args.count
							});
						}
						args = serverArgs;
						fetchCache.push(args);
					}
					defResult= args._loading = this._doQuery(args);
					 
					defResult.addErrback(function(){
						fetchCache.splice(array.indexOf(fetchCache, args), 1);
					});
				}
				var version = this.serverVersion;
				
				defResult.addCallback(function(results){
					delete args._loading;
					// update the result set in case anything changed while we were waiting for the fetch
					if(results){
						args._version = typeof args._version == "number" ? args._version : version;
						self.updateResultSet(results,args);
						args.cacheResults = results;
						if(!args.count || results.length < args.count){
							defResult.fullLength = ((args.start)?args.start:0) + results.length;
						}
					}
					return results;
				});
				return defResult;
			},
			isUpdateable: function(/*Object*/ request){
				//	summary:
				//		Returns whether the provide fetch arguments can be used to update an existing list
				//	request:
				//		See dojo.data.api.Read.fetch request
				
				return typeof request.query == "object";
			},
			clientSideFetch: function(/*Object*/ request,/*Array*/ baseResults){
				// summary:
				//		Performs a query on the client side and returns the results as an array
				//
				//	request:
				//		See dojo.data.api.Read.fetch request
				//
				//	baseResults:
				//		This provides the result set to start with for client side querying
				if(request.queryOptions && request.queryOptions.results){
					baseResults = request.queryOptions.results;
				}
				if(request.query){
					// filter by the query
					var results = [];
					for(var i = 0; i < baseResults.length; i++){
						var value = baseResults[i];
						if(value && this.matchesQuery(value,request)){
							results.push(baseResults[i]);
						}
					}
				}else{
					results = request.sort ? baseResults.concat() : baseResults; // we don't want to mutate the baseResults if we are doing a sort
				}
				if(request.sort){
					// do the sort if needed
					results.sort(this.makeComparator(request.sort.concat()));
				}
				return this.clientSidePaging(request, results);
			},
			clientSidePaging: function(/*Object*/ request,/*Array*/ baseResults){
				var start = request.start || 0;
				var finalResults = (start || request.count) ? baseResults.slice(start,start + (request.count || baseResults.length)) : baseResults;
				finalResults._fullLength = baseResults.length;
				return finalResults;
			},
			matchesQuery: function(item,request){
				var query = request.query;
				var ignoreCase = request.queryOptions && request.queryOptions.ignoreCase;
				for(var i in query){
					// if anything doesn't match, than this should be in the query
					var match = query[i];
					var value = this.getValue(item,i);
					if((typeof match == 'string' && (match.match(/[\*\.]/) || ignoreCase)) ?
						!filter.patternToRegExp(match, ignoreCase).test(value) :
						value != match){
						return false;
					}
				}
				return true;
			},
			makeComparator: function(sort){
				//	summary:
				//		returns a comparator function for the given sort order array
				//	sort:
				//		See dojox.data.api.Read.fetch
				var current = sort.shift();
				if(!current){
					// sort order for ties and no sort orders
					return function(){
						return 0;// keep the order unchanged
					};
				}
				var attribute = current.attribute;
				var descending = !!current.descending;
				var next = this.makeComparator(sort);
				var store = this;
				return function(a,b){
					var av = store.getValue(a,attribute);
					var bv = store.getValue(b,attribute);
					if(av != bv){
						return av < bv == descending ? 1 : -1;
					}
					return next(a,b);
				};
			}
		}
	);
	ClientFilter.onUpdate = function(){};

	return ClientFilter;
});

},
'dojox/atom/io/model':function(){
define("dojox/atom/io/model", [
	"dojo/_base/kernel",
	"dojo/_base/declare", // dojo.declare
	 "dojo/_base/lang",
	"dojo/date/stamp",
	"dojox/xml/parser"
], function (dojo, declare, lang, stamp, parser) {

var model = dojo.getObject("dojox.atom.io.model", true);

model._Constants = {
	//	summary:
	//		Container for general constants.
	//	description:
	//		Container for general constants.
	"ATOM_URI": "http://www.w3.org/2005/Atom",
	"ATOM_NS": "http://www.w3.org/2005/Atom",
	"PURL_NS": "http://purl.org/atom/app#",
	"APP_NS": "http://www.w3.org/2007/app"
};

model._actions = {
	//	summary:
	//		Container for tag handling functions.
	//	description:
	//		Container for tag handling functions.  Each child of this container is
	//		a handler function for the given type of node. Each accepts two parameters:
	//	obj:  Object.
	//		  The object to insert data into.
	//	node: DOM Node.
	//		  The dom node containing the data
	"link": function(obj,node){
		if(obj.links === null){obj.links = [];}
		var link = new model.Link();
		link.buildFromDom(node);
		obj.links.push(link);
	},
	"author": function(obj,node){
		if(obj.authors === null){obj.authors = [];}
		var person = new model.Person("author");
		person.buildFromDom(node);
		obj.authors.push(person);
	},
	"contributor": function(obj,node){
		if(obj.contributors === null){obj.contributors = [];}
		var person = new model.Person("contributor");
		person.buildFromDom(node);
		obj.contributors.push(person);
	},
	"category": function(obj,node){
		if(obj.categories === null){obj.categories = [];}
		var cat = new model.Category();
		cat.buildFromDom(node);
		obj.categories.push(cat);
	},
	"icon": function(obj,node){
		obj.icon = parser.textContent(node);
	},
	"id": function(obj,node){
		obj.id = parser.textContent(node);
	},
	"rights": function(obj,node){
		obj.rights = parser.textContent(node);
	},
	"subtitle": function(obj,node){
		var cnt = new model.Content("subtitle");
		cnt.buildFromDom(node);
		obj.subtitle = cnt;
	},
	"title": function(obj,node){
		var cnt = new model.Content("title");
		cnt.buildFromDom(node);
		obj.title = cnt;
	},
	"updated": function(obj,node){
		obj.updated = model.util.createDate(node);
	},
	// Google news
	"issued": function(obj,node){
		obj.issued = model.util.createDate(node);
	},
	// Google news
	"modified": function(obj,node){
		obj.modified = model.util.createDate(node);
	},
	"published": function(obj,node){
		obj.published = model.util.createDate(node);
	},
	"entry": function(obj,node){
		if(obj.entries === null){obj.entries = [];}
		//The object passed in should be a Feed object, since only feeds can contain Entries
		var entry = obj.createEntry ? obj.createEntry() : new model.Entry();
		entry.buildFromDom(node);
		obj.entries.push(entry);
	},
	"content": function(obj, node){
		var cnt = new model.Content("content");
		cnt.buildFromDom(node);
		obj.content = cnt;
	},
	"summary": function(obj, node){
		var summary = new model.Content("summary");
		summary.buildFromDom(node);
		obj.summary = summary;
	},

	"name": function(obj,node){
		obj.name = parser.textContent(node);
	},
	"email" : function(obj,node){
		obj.email = parser.textContent(node);
	},
	"uri" : function(obj,node){
		obj.uri = parser.textContent(node);
	},
	"generator" : function(obj,node){
		obj.generator = new model.Generator();
		obj.generator.buildFromDom(node);
	}
};

model.util = {
	createDate: function(/*DOM node*/node){
		//	summary:
		//		Utility function to create a date from a DOM node's text content.
		//	description:
		//		Utility function to create a date from a DOM node's text content.
		//
		//	node:
		//		The DOM node to inspect.
		//	returns:
		//		Date object from a DOM Node containing a ISO-8610 string.
		var textContent = parser.textContent(node);
		if(textContent){
			return stamp.fromISOString(lang.trim(textContent));
		}
		return null;
	},
	escapeHtml: function(/*String*/str){
		//	summary:
		//		Utility function to escape XML special characters in an HTML string.
		//	description:
		//		Utility function to escape XML special characters in an HTML string.
		//
		//	str:
		//		The string to escape
		//	returns:
		//		HTML String with special characters (<,>,&, ", etc,) escaped.
		return str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;")
			.replace(/'/gm, "&#39;"); // String
	},
	unEscapeHtml: function(/*String*/str){
		//	summary:
		//		Utility function to un-escape XML special characters in an HTML string.
		//	description:
		//		Utility function to un-escape XML special characters in an HTML string.
		//
		//	str:
		//		The string to un-escape.
		//	returns:
		//		HTML String converted back to the normal text (unescaped) characters (<,>,&, ", etc,).
		return str.replace(/&lt;/gm, "<").replace(/&gt;/gm, ">").replace(/&quot;/gm, "\"")
			.replace(/&#39;/gm, "'").replace(/&amp;/gm, "&"); // String
	},
	getNodename: function(/*DOM node*/node){
		//	summary:
		//		Utility function to get a node name and deal with IE's bad handling of namespaces
		//		on tag names.
		//	description:
		//		Utility function to get a node name and deal with IE's bad handling of namespaces
		//		on tag names.
		//
		//	node:
		//		The DOM node whose name to retrieve.
		//	returns:
		//		String
		//	The name without namespace prefixes.
		var name = null;
		if(node !== null){
			name = node.localName ? node.localName: node.nodeName;
			if(name !== null){
				var nsSep = name.indexOf(":");
				if(nsSep !== -1){
					name = name.substring((nsSep + 1), name.length);
				}
			}
		}
		return name;
	}
};

model.Node = dojo.declare(/*===== 'dojox.atom.io.model.Node', =====*/ null, {
	constructor: function(name_space,name, attributes,content, shortNs){
		this.name_space = name_space;
		this.name = name;
		this.attributes = [];
		if(attributes){
			this.attributes = attributes;
		}
		this.content = [];
		this.rawNodes = [];
		this.textContent = null;
		if(content){
			this.content.push(content);
		}
		this.shortNs = shortNs;
		this._objName = "Node";//for debugging purposes
		this.nodeType = "Node";
	},
	buildFromDom: function(node){
		this._saveAttributes(node);
		this.name_space = node.namespaceURI;
		this.shortNs = node.prefix;
		this.name = model.util.getNodename(node);
		for(var x=0; x < node.childNodes.length; x++){
			var c = node.childNodes[x];
			if(model.util.getNodename(c) != "#text" ){
				this.rawNodes.push(c);
				var n = new model.Node();
				n.buildFromDom(c, true);
				this.content.push(n);
			}else{
				this.content.push(c.nodeValue);
			}
		}
		this.textContent = parser.textContent(node);
	},
	_saveAttributes: function(node){
		if(!this.attributes){this.attributes = [];}
		// Work around lack of hasAttributes() in IE
		var hasAttributes = function(node){
			var attrs = node.attributes;
			if(attrs === null){return false;}
			return (attrs.length !== 0);
		};
	
		if(hasAttributes(node) && this._getAttributeNames){
			var names = this._getAttributeNames(node);
			if(names && names.length > 0){
				for(var x in names){
					var attrib = node.getAttribute(names[x]);
					if(attrib){this.attributes[names[x]] = attrib;}
				}
			}
		}
	},
	addAttribute: function(name, value){
		this.attributes[name]=value;
	},
	getAttribute: function(name){
		return this.attributes[name];
	},
	//if child objects want their attributes parsed, they should override
	//to return an array of attrib names
	_getAttributeNames: function(node){
		var names = [];
		for(var i =0; i<node.attributes.length; i++){
			names.push(node.attributes[i].nodeName);
		}
		return names;
	},
	toString: function(){
		var xml = [];
		var x;
		var name = (this.shortNs?this.shortNs+":":'')+this.name;
		var cdata = (this.name == "#cdata-section");
		if(cdata){
			xml.push("<![CDATA[");
			xml.push(this.textContent);
			xml.push("]]>");
		}else{
			xml.push("<");
			xml.push(name);
			if(this.name_space){
				xml.push(" xmlns='" + this.name_space + "'");
			}
			if(this.attributes){
				for(x in this.attributes){
					xml.push(" " + x + "='" + this.attributes[x] + "'");
				}
			}
			if(this.content){
				xml.push(">");
				for(x in this.content){
					xml.push(this.content[x]);
				}
				xml.push("</" + name + ">\n");
			}else{
				xml.push("/>\n");
			}
		}
		return xml.join('');
	},
	addContent: function(content){
		this.content.push(content);
	}
});
//Types are as follows: links: array of Link, authors: array of Person, categories: array of Category
//contributors: array of Person, ico
model.AtomItem = dojo.declare(/*===== "dojox.atom.io.model.AtomItem", =====*/ model.Node,{
	 constructor: function(args){
		this.ATOM_URI = model._Constants.ATOM_URI;
		this.links = null;						//Array of Link
		this.authors = null;					//Array of Person
		this.categories = null;					//Array of Category
		this.contributors = null;				//Array of Person
		this.icon = this.id = this.logo = this.xmlBase = this.rights = null; //String
		this.subtitle = this.title = null;		//Content
		this.updated = this.published = null;	//Date
		// Google news
		this.issued = this.modified = null;		//Date
		this.content =  null;					//Content
		this.extensions = null;					//Array of Node, non atom based
		this.entries = null;					//Array of Entry
		this.name_spaces = {};
		this._objName = "AtomItem";			 //for debugging purposes
		this.nodeType = "AtomItem";
	},
	// summary: Class container for generic Atom items.
	// description: Class container for generic Atom items.
	_getAttributeNames: function(){return null;},
	_accepts: {},
	accept: function(tag){return Boolean(this._accepts[tag]);},
	_postBuild: function(){},//child objects can override this if they want to be called after a Dom build
	buildFromDom: function(node){
		var i, c, n;
		for(i=0; i<node.attributes.length; i++){
			c = node.attributes.item(i);
			n = model.util.getNodename(c);
			if(c.prefix == "xmlns" && c.prefix != n){
				this.addNamespace(c.nodeValue, n);
			}
		}
		c = node.childNodes;
		for(i = 0; i< c.length; i++){
			if(c[i].nodeType == 1) {
				var name = model.util.getNodename(c[i]);
				if(!name){continue;}
				if(c[i].namespaceURI != model._Constants.ATOM_NS && name != "#text"){
					if(!this.extensions){this.extensions = [];}
					var extensionNode = new model.Node();
					extensionNode.buildFromDom(c[i]);
					this.extensions.push(extensionNode);
				}
				if(!this.accept(name.toLowerCase())){
					continue;
				}
				var fn = model._actions[name];
				if(fn) {
					fn(this,c[i]);
				}
			}
		}
		this._saveAttributes(node);
		if(this._postBuild){this._postBuild();}
	},
	addNamespace: function(fullName, shortName){
		if(fullName && shortName){
			this.name_spaces[shortName] = fullName;
		}
	},
	addAuthor: function(/*String*/name, /*String*/email, /*String*/uri){
		//	summary:
		//		Function to add in an author to the list of authors.
		//	description:
		//		Function to add in an author to the list of authors.
		//
		//	name:
		//		The author's name.
		//	email:
		//		The author's e-mail address.
		//	uri:
		//		A URI associated with the author.
		if(!this.authors){this.authors = [];}
		this.authors.push(new model.Person("author",name,email,uri));
	},
	addContributor: function(/*String*/name, /*String*/email, /*String*/uri){
		//	summary:
		//		Function to add in an author to the list of authors.
		//	description:
		//		Function to add in an author to the list of authors.
		//
		//	name:
		//		The author's name.
		//	email:
		//		The author's e-mail address.
		//	uri:
		//		A URI associated with the author.
		if(!this.contributors){this.contributors = [];}
		this.contributors.push(new model.Person("contributor",name,email,uri));
	},
	addLink: function(/*String*/href,/*String*/rel,/*String*/hrefLang,/*String*/title,/*String*/type){
		//	summary:
		//		Function to add in a link to the list of links.
		//	description:
		//		Function to add in a link to the list of links.
		//
		//	href:
		//		The href.
		//	rel:
		//		String
		//	hrefLang:
		//		String
		//	title:
		//		A title to associate with the link.
		//	type:
		//		The type of link is is.
		if(!this.links){this.links=[];}
		this.links.push(new model.Link(href,rel,hrefLang,title,type));
	},
	removeLink: function(/*String*/href, /*String*/rel){
		//	summary:
		//		Function to remove a link from the list of links.
		//	description:
		//		Function to remove a link from the list of links.
		//
		//	href:
		//		The href.
		//	rel:
		//		String
		if(!this.links || !lang.isArray(this.links)){return;}
		var count = 0;
		for(var i = 0; i < this.links.length; i++){
			if((!href || this.links[i].href === href) && (!rel || this.links[i].rel === rel)){
				this.links.splice(i,1); count++;
			}
		}
		return count;
	},
	removeBasicLinks: function(){
		//	summary:
		//		Function to remove all basic links from the list of links.
		//	description:
		//		Function to remove all basic link from the list of links.
		if(!this.links){return;}
		var count = 0;
		for(var i = 0; i < this.links.length; i++){
			if(!this.links[i].rel){this.links.splice(i,1); count++; i--;}
		}
		return count;
	},
	addCategory: function(/*String*/scheme, /*String*/term, /*String*/label){
		//	summary:
		//		Function to add in a category to the list of categories.
		//	description:
		//		Function to add in a category to the list of categories.
		//
		//	scheme:
		//		String
		//	term:
		//		String
		//	label:
		//		String
		if(!this.categories){this.categories = [];}
		this.categories.push(new model.Category(scheme,term,label));
	},
	getCategories: function(/*String*/scheme){
		//	summary:
		//		Function to get all categories that match a particular scheme.
		//	description:
		//		Function to get all categories that match a particular scheme.
		//
		//	scheme:
		//		String
		//		The scheme to filter on.
		if(!scheme){return this.categories;}
		//If categories belonging to a particular scheme are required, then create a new array containing these
		var arr = [];
		for(var x in this.categories){
			if(this.categories[x].scheme === scheme){arr.push(this.categories[x]);}
		}
		return arr;
	},
	removeCategories: function(/*String*/scheme, /*String*/term){
		//	summary:
		//		Function to remove all categories that match a particular scheme and term.
		//	description:
		//		Function to remove all categories that match a particular scheme and term.
		//
		//	scheme:
		//		The scheme to filter on.
		//	term:
		//		The term to filter on.
		if(!this.categories){return;}
		var count = 0;
		for(var i=0; i<this.categories.length; i++){
			if((!scheme || this.categories[i].scheme === scheme) && (!term || this.categories[i].term === term)){
				this.categories.splice(i, 1); count++; i--;
			}
		}
		return count;
	},
	setTitle: function(/*String*/str, /*String*/type){
		//	summary:
		//		Function to set the title of the item.
		//	description:
		//		Function to set the title of the item.
		//
		//	str:
		//		The title to set.
		//	type:
		//		The type of title format, text, xml, xhtml, etc.
		if(!str){return;}
		this.title = new model.Content("title");
		this.title.value = str;
		if(type){this.title.type = type;}
	},
	addExtension: function(/*String*/name_space,/*String*/name, /*Array*/attributes, /*String*/content, /*String*/shortNS){
		//	summary:
		//		Function to add in an extension namespace into the item.
		//	description:
		//		Function to add in an extension namespace into the item.
		//
		//	name_space:
		//		The namespace of the extension.
		//	name:
		//		The name of the extension
		//	attributes:
		//		The attributes associated with the extension.
		//	content:
		//		The content of the extension.
		if(!this.extensions){this.extensions=[];}
		this.extensions.push(new model.Node(name_space,name,attributes,content, shortNS || "ns"+this.extensions.length));
	},
	getExtensions: function(/*String*/name_space, /*String*/name){
		//	summary:
		//		Function to get extensions that match a namespace and name.
		//	description:
		//		Function to get extensions that match a namespace and name.
		//
		//	name_space:
		//		The namespace of the extension.
		//	name:
		//		The name of the extension
		var arr = [];
		if(!this.extensions){return arr;}
		for(var x in this.extensions){
			if((this.extensions[x].name_space === name_space || this.extensions[x].shortNs === name_space) && (!name || this.extensions[x].name === name)){
				arr.push(this.extensions[x]);
			}
		}
		return arr;
	},
	removeExtensions: function(/*String*/name_space, /*String*/name){
		//	summary:
		//		Function to remove extensions that match a namespace and name.
		//	description:
		//		Function to remove extensions that match a namespace and name.
		//
		//	name_space:
		//		The namespace of the extension.
		//	name:
		//		The name of the extension
		if(!this.extensions){return;}
		for(var i=0; i< this.extensions.length; i++){
			if((this.extensions[i].name_space == name_space || this.extensions[i].shortNs === name_space) && this.extensions[i].name === name){
				this.extensions.splice(i,1);
				i--;
			}
		}
	},
	destroy: function() {
		this.links = null;
		this.authors = null;
		this.categories = null;
		this.contributors = null;
		this.icon = this.id = this.logo = this.xmlBase = this.rights = null;
		this.subtitle = this.title = null;
		this.updated = this.published = null;
		// Google news
		this.issued = this.modified = null;
		this.content =  null;
		this.extensions = null;
		this.entries = null;
	}
});

model.Category = dojo.declare(/*===== "dojox.atom.io.model.Category", =====*/ model.Node,{
	//	summary:
	//		Class container for 'Category' types.
	//	description:
	//		Class container for 'Category' types.
	constructor: function(/*String*/scheme, /*String*/term, /*String*/label){
		this.scheme = scheme; this.term = term; this.label = label;
		this._objName = "Category";//for debugging
		this.nodeType = "Category";
	},
	_postBuild: function(){},
	_getAttributeNames: function(){
		return ["label","scheme","term"];
	},
	toString: function(){
		//	summary:
		//		Function to construct string form of the category tag, which is an XML structure.
		//	description:
		//		Function to construct string form of the category tag, which is an XML structure.
		var s = [];
		s.push('<category ');
		if(this.label){s.push(' label="'+this.label+'" ');}
		if(this.scheme){s.push(' scheme="'+this.scheme+'" ');}
		if(this.term){s.push(' term="'+this.term+'" ');}
		s.push('/>\n');
		return s.join('');
	},
	buildFromDom: function(/*DOM node*/node){
		//	summary:
		//		Function to do construction of the Category data from the DOM node containing it.
		//	description:
		//		Function to do construction of the Category data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for content.
		this._saveAttributes(node);//just get the attributes from the node
		this.label = this.attributes.label;
		this.scheme = this.attributes.scheme;
		this.term = this.attributes.term;
		if(this._postBuild){this._postBuild();}
	}
});

model.Content = dojo.declare(/*===== "dojox.atom.io.model.Content", =====*/ model.Node,{
	//	summary:
	//		Class container for 'Content' types. Such as summary, content, username, and so on types of data.
	//	description:
	//		Class container for 'Content' types. Such as summary, content, username, and so on types of data.
	constructor: function(tagName, value, src, type,xmlLang){
		this.tagName = tagName; this.value = value; this.src = src; this.type=type; this.xmlLang = xmlLang;
		this.HTML = "html"; this.TEXT = "text"; this.XHTML = "xhtml"; this.XML="xml";
		this._useTextContent = "true";
		this.nodeType = "Content";
	},
	_getAttributeNames: function(){return ["type","src"];},
	_postBuild: function(){},
	buildFromDom: function(/*DOM node*/node){
		//	summary:
		//		Function to do construction of the Content data from the DOM node containing it.
		//	description:
		//		Function to do construction of the Content data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for content.
		//Handle checking for XML content as the content type
		var type = node.getAttribute("type");
		if(type){
			type = type.toLowerCase();
			if(type == "xml" || "text/xml"){
				type = this.XML;
			}
		}else{
			type="text";
		}
		if(type === this.XML){
			if(node.firstChild){
				var i;
				this.value = "";
				for(i = 0; i < node.childNodes.length; i++){
					var c = node.childNodes[i];
					if(c){
						this.value += parser.innerXML(c);
					}
				}
			}
		} else if(node.innerHTML){
			this.value = node.innerHTML;
		}else{
			this.value = parser.textContent(node);
		}

		this._saveAttributes(node);

		if(this.attributes){
			this.type = this.attributes.type;
			this.scheme = this.attributes.scheme;
			this.term = this.attributes.term;
		}
		if(!this.type){this.type = "text";}

		//We need to unescape the HTML content here so that it can be displayed correctly when the value is fetched.
		var lowerType = this.type.toLowerCase();
		if(lowerType === "html" || lowerType === "text/html" || lowerType === "xhtml" || lowerType === "text/xhtml"){
			this.value = this.value?model.util.unEscapeHtml(this.value):"";
		}

		if(this._postBuild){this._postBuild();}
	},
	toString: function(){
		//	summary:
		//		Function to construct string form of the content tag, which is an XML structure.
		//	description:
		//		Function to construct string form of the content tag, which is an XML structure.
		var s = [];
		s.push('<'+this.tagName+' ');
		if(!this.type){this.type = "text";}
		if(this.type){s.push(' type="'+this.type+'" ');}
		if(this.xmlLang){s.push(' xml:lang="'+this.xmlLang+'" ');}
		if(this.xmlBase){s.push(' xml:base="'+this.xmlBase+'" ');}
		
		//all HTML must be escaped
		if(this.type.toLowerCase() == this.HTML){
			s.push('>'+model.util.escapeHtml(this.value)+'</'+this.tagName+'>\n');
		}else{
			s.push('>'+this.value+'</'+this.tagName+'>\n');
		}
		var ret = s.join('');
		return ret;
	}
});

model.Link = dojo.declare(/*===== "dojox.atom.io.model.Link", =====*/ model.Node,{
	//	summary:
	//		Class container for 'link' types.
	//	description:
	//		Class container for 'link' types.
	constructor: function(href,rel,hrefLang,title,type){
		this.href = href; this.hrefLang = hrefLang; this.rel = rel; this.title = title;this.type = type;
		this.nodeType = "Link";
	},
	_getAttributeNames: function(){return ["href","jrefLang","rel","title","type"];},
	_postBuild: function(){},
	buildFromDom: function(node){
		//	summary:
		//		Function to do construction of the link data from the DOM node containing it.
		//	description:
		//		Function to do construction of the link data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for link data.
		this._saveAttributes(node);//just get the attributes from the node
		this.href = this.attributes.href;
		this.hrefLang = this.attributes.hreflang;
		this.rel = this.attributes.rel;
		this.title = this.attributes.title;
		this.type = this.attributes.type;
		if(this._postBuild){this._postBuild();}
	},
	toString: function(){
		//	summary:
		//		Function to construct string form of the link tag, which is an XML structure.
		//	description:
		//		Function to construct string form of the link tag, which is an XML structure.
		var s = [];
		s.push('<link ');
		if(this.href){s.push(' href="'+this.href+'" ');}
		if(this.hrefLang){s.push(' hrefLang="'+this.hrefLang+'" ');}
		if(this.rel){s.push(' rel="'+this.rel+'" ');}
		if(this.title){s.push(' title="'+this.title+'" ');}
		if(this.type){s.push(' type = "'+this.type+'" ');}
		s.push('/>\n');
		return s.join('');
	}
});

model.Person = dojo.declare(/*===== "dojox.atom.io.model.Person", =====*/ model.Node,{
	//	summary:
	//		Class container for 'person' types, such as Author, controbutors, and so on.
	//	description:
	//		Class container for 'person' types, such as Author, controbutors, and so on.
	constructor: function(personType, name, email, uri){
		this.author = "author";
		this.contributor = "contributor";
		if(!personType){
			personType = this.author;
		}
		this.personType = personType;
		this.name = name || '';
		this.email = email || '';
		this.uri = uri || '';
		this._objName = "Person";//for debugging
		this.nodeType = "Person";
	},
	_getAttributeNames: function(){return null;},
	_postBuild: function(){},
	accept: function(tag){return Boolean(this._accepts[tag]);},
	buildFromDom: function(node){
		//	summary:
		//		Function to do construction of the person data from the DOM node containing it.
		//	description:
		//		Function to do construction of the person data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for person data.
		var c = node.childNodes;
		for(var i = 0; i< c.length; i++){
			var name = model.util.getNodename(c[i]);
			
			if(!name){continue;}

			if(c[i].namespaceURI != model._Constants.ATOM_NS && name != "#text"){
				if(!this.extensions){this.extensions = [];}
				var extensionNode = new model.Node();
				extensionNode.buildFromDom(c[i]);
				this.extensions.push(extensionNode);
			}
			if(!this.accept(name.toLowerCase())){
				continue;
			}
			var fn = model._actions[name];
			if(fn) {
				fn(this,c[i]);
			}
		}
		this._saveAttributes(node);
		if(this._postBuild){this._postBuild();}
	},
	_accepts: {
		'name': true,
		'uri': true,
		'email': true
	},
	toString: function(){
		//	summary:
		//		Function to construct string form of the Person tag, which is an XML structure.
		//	description:
		//		Function to construct string form of the Person tag, which is an XML structure.
		var s = [];
		s.push('<'+this.personType+'>\n');
		if(this.name){s.push('\t<name>'+this.name+'</name>\n');}
		if(this.email){s.push('\t<email>'+this.email+'</email>\n');}
		if(this.uri){s.push('\t<uri>'+this.uri+'</uri>\n');}
		s.push('</'+this.personType+'>\n');
		return s.join('');
	}
});

model.Generator = dojo.declare(/*===== "dojox.atom.io.model.Generator", =====*/ model.Node,{
	//	summary:
	//		Class container for 'Generator' types.
	//	description:
	//		Class container for 'Generator' types.
	constructor: function(/*String*/uri, /*String*/version, /*String*/value){
		this.uri = uri;
		this.version = version;
		this.value = value;
	},
	_postBuild: function(){},
	buildFromDom: function(node){
		//	summary:
		//		Function to do construction of the generator data from the DOM node containing it.
		//	description:
		//		Function to do construction of the generator data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for link data.

		this.value = parser.textContent(node);
		this._saveAttributes(node);

		this.uri = this.attributes.uri;
		this.version = this.attributes.version;

		if(this._postBuild){this._postBuild();}
	},
	toString: function(){
		//	summary:
		//		Function to construct string form of the Generator tag, which is an XML structure.
		//	description:
		//		Function to construct string form of the Generator tag, which is an XML structure.
		var s = [];
		s.push('<generator ');
		if(this.uri){s.push(' uri="'+this.uri+'" ');}
		if(this.version){s.push(' version="'+this.version+'" ');}
		s.push('>'+this.value+'</generator>\n');
		var ret = s.join('');
		return ret;
	}
});

model.Entry = dojo.declare(/*===== "dojox.atom.io.model.Entry", =====*/ model.AtomItem,{
	//	summary:
	//		Class container for 'Entry' types.
	//	description:
	//		Class container for 'Entry' types.
	constructor: function(/*String*/id){
		this.id = id; this._objName = "Entry"; this.feedUrl = null;
	},
	_getAttributeNames: function(){return null;},
	_accepts: {
		'author': true,
		'content': true,
		'category': true,
		'contributor': true,
		'created': true,
		'id': true,
		'link': true,
		'published': true,
		'rights': true,
		'summary': true,
		'title': true,
		'updated': true,
		'xmlbase': true,
		'issued': true,
		'modified': true
	},
	toString: function(amPrimary){
		//	summary:
		//		Function to construct string form of the entry tag, which is an XML structure.
		//	description:
		//		Function to construct string form of the entry tag, which is an XML structure.
		var s = [];
		var i;
		if(amPrimary){
			s.push("<?xml version='1.0' encoding='UTF-8'?>");
			s.push("<entry xmlns='"+model._Constants.ATOM_URI+"'");
		}else{s.push("<entry");}
		if(this.xmlBase){s.push(' xml:base="'+this.xmlBase+'" ');}
		for(i in this.name_spaces){s.push(' xmlns:'+i+'="'+this.name_spaces[i]+'"');}
		s.push('>\n');
		s.push('<id>' + (this.id ? this.id: '') + '</id>\n');
		if(this.issued && !this.published){this.published = this.issued;}
		if(this.published){s.push('<published>'+stamp.toISOString(this.published)+'</published>\n');}
		if(this.created){s.push('<created>'+stamp.toISOString(this.created)+'</created>\n');}
		//Google News
		if(this.issued){s.push('<issued>'+stamp.toISOString(this.issued)+'</issued>\n');}

		//Google News
		if(this.modified){s.push('<modified>'+stamp.toISOString(this.modified)+'</modified>\n');}

		if(this.modified && !this.updated){this.updated = this.modified;}
		if(this.updated){s.push('<updated>'+stamp.toISOString(this.updated)+'</updated>\n');}
		if(this.rights){s.push('<rights>'+this.rights+'</rights>\n');}
		if(this.title){s.push(this.title.toString());}
		if(this.summary){s.push(this.summary.toString());}
		var arrays = [this.authors,this.categories,this.links,this.contributors,this.extensions];
		for(var x in arrays){
			if(arrays[x]){
				for(var y in arrays[x]){
					s.push(arrays[x][y]);
				}
			}
		}
		if(this.content){s.push(this.content.toString());}
		s.push("</entry>\n");
		return s.join(''); //string
	},
	getEditHref: function(){
		//	summary:
		//		Function to get the href that allows editing of this feed entry.
		//	description:
		//		Function to get the href that allows editing of this feed entry.
		//
		//	returns:
		//		The href that specifies edit capability.
		if(this.links === null || this.links.length === 0){
			return null;
		}
		for(var x in this.links){
			if(this.links[x].rel && this.links[x].rel == "edit"){
				return this.links[x].href; //string
			}
		}
		return null;
	},
	setEditHref: function(url){
		if(this.links === null){
			this.links = [];
		}
		for(var x in this.links){
			if(this.links[x].rel && this.links[x].rel == "edit"){
				this.links[x].href = url;
				return;
			}
		}
		this.addLink(url, 'edit');
	}
});

model.Feed = dojo.declare(/*===== "dojox.atom.io.model.Feed", =====*/ model.AtomItem,{
	//	summary:
	//		Class container for 'Feed' types.
	//	description:
	//		Class container for 'Feed' types.
	_accepts: {
		'author': true,
		'content': true,
		'category': true,
		'contributor': true,
		'created': true,
		'id': true,
		'link': true,
		'published': true,
		'rights': true,
		'summary': true,
		'title': true,
		'updated': true,
		'xmlbase': true,
		'entry': true,
		'logo': true,
		'issued': true,
		'modified': true,
		'icon': true,
		'subtitle': true
	},
	addEntry: function(/*object*/entry){
		//	summary:
		//		Function to add an entry to this feed.
		//	description:
		//		Function to add an entry to this feed.
		//	entry:
		//		The entry object to add.
		if(!entry.id){
			throw new Error("The entry object must be assigned an ID attribute.");
		}
		if(!this.entries){this.entries = [];}
		entry.feedUrl = this.getSelfHref();
		this.entries.push(entry);
	},
	getFirstEntry: function(){
		//	summary:
		//		Function to get the first entry of the feed.
		//	description:
		//		Function to get the first entry of the feed.
		//
		//	returns:
		//		The first entry in the feed.
		if(!this.entries || this.entries.length === 0){return null;}
		return this.entries[0]; //object
	},
	getEntry: function(/*String*/entryId){
		//	summary:
		//		Function to get an entry by its id.
		//	description:
		//		Function to get an entry by its id.
		//
		//	returns:
		//		The entry desired, or null if none.
		if(!this.entries){return null;}
		for(var x in this.entries){
			if(this.entries[x].id == entryId){
				return this.entries[x];
			}
		}
		return null;
	},
	removeEntry: function(/*object*/entry){
		//	summary:
		//		Function to remove an entry from the list of links.
		//	description:
		//		Function to remove an entry from the list of links.
		//
		//	entry:
		//		The entry.
		if(!this.entries){return;}
		var count = 0;
		for(var i = 0; i < this.entries.length; i++){
			if(this.entries[i] === entry){
				this.entries.splice(i,1);
				count++;
			}
		}
		return count;
	},
	setEntries: function(/*array*/arrayOfEntry){
		//	summary:
		//		Function to add a set of entries to the feed.
		//	description:
		//		Function to get an entry by its id.
		//
		//	arrayOfEntry:
		//		An array of entry objects to add to the feed.
		for(var x in arrayOfEntry){
			this.addEntry(arrayOfEntry[x]);
		}
	},
	toString: function(){
		//	summary:
		//		Function to construct string form of the feed tag, which is an XML structure.
		//	description:
		//		Function to construct string form of the feed tag, which is an XML structure.
		var s = [];
		var i;
		s.push('<?xml version="1.0" encoding="utf-8"?>\n');
		s.push('<feed xmlns="'+model._Constants.ATOM_URI+'"');
		if(this.xmlBase){s.push(' xml:base="'+this.xmlBase+'"');}
		for(i in this.name_spaces){s.push(' xmlns:'+i+'="'+this.name_spaces[i]+'"');}
		s.push('>\n');
		s.push('<id>' + (this.id ? this.id: '') + '</id>\n');
		if(this.title){s.push(this.title);}
		if(this.copyright && !this.rights){this.rights = this.copyright;}
		if(this.rights){s.push('<rights>' + this.rights + '</rights>\n');}
		
		// Google news
		if(this.issued){s.push('<issued>'+stamp.toISOString(this.issued)+'</issued>\n');}
		if(this.modified){s.push('<modified>'+stamp.toISOString(this.modified)+'</modified>\n');}

		if(this.modified && !this.updated){this.updated=this.modified;}
		if(this.updated){s.push('<updated>'+stamp.toISOString(this.updated)+'</updated>\n');}
		if(this.published){s.push('<published>'+stamp.toISOString(this.published)+'</published>\n');}
		if(this.icon){s.push('<icon>'+this.icon+'</icon>\n');}
		if(this.language){s.push('<language>'+this.language+'</language>\n');}
		if(this.logo){s.push('<logo>'+this.logo+'</logo>\n');}
		if(this.subtitle){s.push(this.subtitle.toString());}
		if(this.tagline){s.push(this.tagline.toString());}
		//TODO: need to figure out what to do with xmlBase
		var arrays = [this.alternateLinks,this.authors,this.categories,this.contributors,this.otherLinks,this.extensions,this.entries];
		for(i in arrays){
			if(arrays[i]){
				for(var x in arrays[i]){
					s.push(arrays[i][x]);
				}
			}
		}
		s.push('</feed>');
		return s.join('');
	},
	createEntry: function(){
		//	summary:
		//		Function to Create a new entry object in the feed.
		//	description:
		//		Function to Create a new entry object in the feed.
		//	returns:
		//		An empty entry object in the feed.
		var entry = new model.Entry();
		entry.feedUrl = this.getSelfHref();
		return entry; //object
	},
	getSelfHref: function(){
		//	summary:
		//		Function to get the href that refers to this feed.
		//	description:
		//		Function to get the href that refers to this feed.
		//	returns:
		//		The href that refers to this feed or null if none.
		if(this.links === null || this.links.length === 0){
			return null;
		}
		for(var x in this.links){
			if(this.links[x].rel && this.links[x].rel == "self"){
				return this.links[x].href; //string
			}
		}
		return null;
	}
});

model.Service = dojo.declare(/*===== "dojox.atom.io.model.Service", =====*/ model.AtomItem,{
	//	summary:
	//		Class container for 'Feed' types.
	//	description:
	//		Class container for 'Feed' types.
	constructor: function(href){
		this.href = href;
	},
	//builds a Service document.  each element of this, except for the namespace, is the href of
	//a service that the server supports.  Some of the common services are:
	//"create-entry" , "user-prefs" , "search-entries" , "edit-template" , "categories"
	buildFromDom: function(/*DOM node*/node){
		//	summary:
		//		Function to do construction of the Service data from the DOM node containing it.
		//	description:
		//		Function to do construction of the Service data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for content.
		var i;
		this.workspaces = [];
		if(node.tagName != "service"){
			// FIXME: Need 0.9 DOM util...
			//node = dojox.xml.parser.firstElement(node,"service");
			//if(!node){return;}
			return;
		}
		if(node.namespaceURI != model._Constants.PURL_NS && node.namespaceURI != model._Constants.APP_NS){return;}
		var ns = node.namespaceURI;
		this.name_space = node.namespaceURI;
		//find all workspaces, and create them
		var workspaces ;
		if(typeof(node.getElementsByTagNameNS)!= "undefined"){
			workspaces = node.getElementsByTagNameNS(ns,"workspace");
		}else{
			// This block is IE only, which doesn't have a 'getElementsByTagNameNS' function
			workspaces = [];
			var temp = node.getElementsByTagName('workspace');
			for(i=0; i<temp.length; i++){
				if(temp[i].namespaceURI == ns){
					workspaces.push(temp[i]);
				}
			}
		}
		if(workspaces && workspaces.length > 0){
			var wkLen = 0;
			var workspace;
			for(i = 0; i< workspaces.length; i++){
				workspace = (typeof(workspaces.item)==="undefined"?workspaces[i]:workspaces.item(i));
				var wkspace = new model.Workspace();
				wkspace.buildFromDom(workspace);
				this.workspaces[wkLen++] = wkspace;
			}
		}
	},
	getCollection: function(/*String*/url){
		//	summary:
		//		Function to collections that match a specific url.
		//	description:
		//		Function to collections that match a specific url.
		//
		//	url:
		//		e URL to match collections against.
		for(var i=0;i<this.workspaces.length;i++){
			var coll=this.workspaces[i].collections;
			for(var j=0;j<coll.length;j++){
				if(coll[j].href == url){
					return coll;
				}
			}
		}
		return null;
	}
});

model.Workspace = dojo.declare(/*===== "dojox.atom.io.model.Workspace", =====*/ model.AtomItem,{
	//	summary:
	//		Class container for 'Workspace' types.
	//	description:
	//		Class container for 'Workspace' types.
	constructor: function(title){
		this.title = title;
		this.collections = [];
	},

	buildFromDom: function(/*DOM node*/node){
		//	summary:
		//		Function to do construction of the Workspace data from the DOM node containing it.
		//	description:
		//		Function to do construction of the Workspace data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for content.
		var name = model.util.getNodename(node);
		if(name != "workspace"){return;}
		var c = node.childNodes;
		var len = 0;
		for(var i = 0; i< c.length; i++){
			var child = c[i];
			if(child.nodeType === 1){
				name = model.util.getNodename(child);
				if(child.namespaceURI == model._Constants.PURL_NS || child.namespaceURI == model._Constants.APP_NS){
					if(name === "collection"){
						var coll = new model.Collection();
						coll.buildFromDom(child);
						this.collections[len++] = coll;
					}
				}else if(child.namespaceURI === model._Constants.ATOM_NS){
					if(name === "title"){
						this.title = parser.textContent(child);
					}
				}
				//FIXME: Add an extension point so others can impl different namespaces.  For now just
				//ignore unknown namespace tags.
			}
		}
	}
});

model.Collection = dojo.declare(/*===== "dojox.atom.io.model.Collection", =====*/ model.AtomItem,{
	//	summary:
	//		Class container for 'Collection' types.
	//	description:
	//		Class container for 'Collection' types.
	constructor: function(href, title){
		this.href = href;
		this.title = title;
		this.attributes = [];
		this.features = [];
		this.children = [];
		this.memberType = null;
		this.id = null;
	},

	buildFromDom: function(/*DOM node*/node){
		//	summary:
		//		Function to do construction of the Collection data from the DOM node containing it.
		//	description:
		//		Function to do construction of the Collection data from the DOM node containing it.
		//
		//	node:
		//		The DOM node to process for content.
		this.href = node.getAttribute("href");
		var c = node.childNodes;
		for(var i = 0; i< c.length; i++){
			var child = c[i];
			if(child.nodeType === 1){
				var name = model.util.getNodename(child);
				if(child.namespaceURI == model._Constants.PURL_NS || child.namespaceURI == model._Constants.APP_NS){
					if(name === "member-type"){
						this.memberType = parser.textContent(child);
					}else if(name == "feature"){//this IF stmt might need some more work
						if(child.getAttribute("id")){this.features.push(child.getAttribute("id"));}
					}else{
						var unknownTypeChild = new model.Node();
						unknownTypeChild.buildFromDom(child);
						this.children.push(unknownTypeChild);
					}
				}else if(child.namespaceURI === model._Constants.ATOM_NS){
					if(name === "id"){
						this.id = parser.textContent(child);
					}else if(name === "title"){
						this.title = parser.textContent(child);
					}
				}
			}
		}
	}
});

return model;
});

},
'dojo/AdapterRegistry':function(){
define("dojo/AdapterRegistry", ["./_base/kernel", "./_base/lang"], function(dojo, lang) {
	// module:
	//		dojo/AdapterRegistry
	// summary:
	//		TODOC

var AdapterRegistry = dojo.AdapterRegistry = function(/*Boolean?*/ returnWrappers){
	//	summary:
	//		A registry to make contextual calling/searching easier.
	//	description:
	//		Objects of this class keep list of arrays in the form [name, check,
	//		wrap, directReturn] that are used to determine what the contextual
	//		result of a set of checked arguments is. All check/wrap functions
	//		in this registry should be of the same arity.
	//	example:
	//	|	// create a new registry
	//	|	var reg = new dojo.AdapterRegistry();
	//	|	reg.register("handleString",
	//	|		dojo.isString,
	//	|		function(str){
	//	|			// do something with the string here
	//	|		}
	//	|	);
	//	|	reg.register("handleArr",
	//	|		dojo.isArray,
	//	|		function(arr){
	//	|			// do something with the array here
	//	|		}
	//	|	);
	//	|
	//	|	// now we can pass reg.match() *either* an array or a string and
	//	|	// the value we pass will get handled by the right function
	//	|	reg.match("someValue"); // will call the first function
	//	|	reg.match(["someValue"]); // will call the second

	this.pairs = [];
	this.returnWrappers = returnWrappers || false; // Boolean
};

/*=====
// doc alias helpers:
AdapterRegistry = dojo.AdapterRegistry;
=====*/

lang.extend(AdapterRegistry, {
	register: function(/*String*/ name, /*Function*/ check, /*Function*/ wrap, /*Boolean?*/ directReturn, /*Boolean?*/ override){
		//	summary:
		//		register a check function to determine if the wrap function or
		//		object gets selected
		//	name:
		//		a way to identify this matcher.
		//	check:
		//		a function that arguments are passed to from the adapter's
		//		match() function.  The check function should return true if the
		//		given arguments are appropriate for the wrap function.
		//	directReturn:
		//		If directReturn is true, the value passed in for wrap will be
		//		returned instead of being called. Alternately, the
		//		AdapterRegistry can be set globally to "return not call" using
		//		the returnWrappers property. Either way, this behavior allows
		//		the registry to act as a "search" function instead of a
		//		function interception library.
		//	override:
		//		If override is given and true, the check function will be given
		//		highest priority. Otherwise, it will be the lowest priority
		//		adapter.
		this.pairs[((override) ? "unshift" : "push")]([name, check, wrap, directReturn]);
	},

	match: function(/* ... */){
		// summary:
		//		Find an adapter for the given arguments. If no suitable adapter
		//		is found, throws an exception. match() accepts any number of
		//		arguments, all of which are passed to all matching functions
		//		from the registered pairs.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[1].apply(this, arguments)){
				if((pair[3])||(this.returnWrappers)){
					return pair[2];
				}else{
					return pair[2].apply(this, arguments);
				}
			}
		}
		throw new Error("No match found");
	},

	unregister: function(name){
		// summary:
		//		Remove a named adapter from the registry
		// name: String
		//		The name of the adapter.
		// returns: Boolean
		//		Returns true if operation is successful.
		//		Returns false if operation fails.
	
		// FIXME: this is kind of a dumb way to handle this. On a large
		// registry this will be slow-ish and we can use the name as a lookup
		// should we choose to trade memory for speed.
		for(var i = 0; i < this.pairs.length; i++){
			var pair = this.pairs[i];
			if(pair[0] == name){
				this.pairs.splice(i, 1);
				return true;
			}
		}
		return false;
	}
});

return AdapterRegistry;
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
'dojox/data/AndOrReadStore':function(){
define("dojox/data/AndOrReadStore", ["dojo/_base/kernel", "dojo/_base/declare", "dojo/_base/lang", "dojo/data/util/filter", "dojo/data/util/simpleFetch",
		"dojo/_base/array", "dojo/date/stamp", "dojo/_base/json", "dojo/_base/window", "dojo/_base/xhr"], 
  function(kernel, declare, lang, filterUtil, simpleFetch, array, dateStamp, json, winUtil, xhr) {

var AndOrReadStore = declare("dojox.data.AndOrReadStore", null, {
	//	summary:
	//		AndOrReadStore uses ItemFileReadStore as a base, modifying only the query (_fetchItems) section.
	//		Supports queries of the form: query:"id:1* OR dept:'Sales Department' || (id:2* && NOT dept:S*)"
	//		Includes legacy/widget support via:
	//			query:{complexQuery:"id:1* OR dept:'Sales Department' || (id:2* && NOT dept:S*)"}
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
	},
	
	url: "", // use "" rather than undefined for the benefit of the parser (#3539)

	//Internal var, crossCheckUrl.  Used so that setting either url or _jsonFileUrl, can still trigger a reload
	//when clearOnClose and close is used.
	_ccUrl: "",

	data: null, //Make this parser settable.

	typeMap: null, //Make this parser settable.

	//Parameter to allow users to specify if a close call should force a reload or not.
	//By default, it retains the old behavior of not clearing if close is called.  But
	//if set true, the store will be reset to default state.  Note that by doing this,
	//all item handles will become invalid and a new fetch must be issued.
	clearOnClose: false,

	//Parameter to allow specifying if preventCache should be passed to the xhrGet call or not when loading data from a url.
	//Note this does not mean the store calls the server on each fetch, only that the data load has preventCache set as an option.
	//Added for tracker: #6072
	urlPreventCache: false,

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
			throw new Error("dojox.data.AndOrReadStore: Invalid item argument.");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.AndOrReadStore: Invalid attribute argument.");
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
		var arr = item[attribute] || [];
		// Clone it before returning.  refs: #10474
		return arr.slice(0, arr.length); // Array
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
			} else if(value === possibleValue){
				return true; // Boolean
			} else {
				return false;
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
		//		filter modified to permit complex queries where
		//			logical operators are case insensitive:
		//			, NOT AND OR ( ) ! && ||
		//			Note:  "," included for quoted/string legacy queries.
		var self = this;
		var filter = function(requestArgs, arrayOfItems){
			var items = [];
			if(requestArgs.query){
				//Complete copy, we may have to mess with it.
				//Safer than clone, which does a shallow copy, I believe.
				var query = json.fromJson(json.toJson(requestArgs.query));
				//Okay, object form query, we have to check to see if someone mixed query methods (such as using FilteringSelect
				//with a complexQuery).  In that case, the params need to be anded to the complex query statement.
				//See defect #7980
				if(typeof query == "object" ){
					var count = 0;
					var p;
					for(p in query){
						count++;
					}
					if(count > 1 && query.complexQuery){
						var cq = query.complexQuery;
						var wrapped = false;
						for(p in query){
							if(p !== "complexQuery"){
								//We should wrap this in () as it should and with the entire complex query
								//Not just part of it.
								if(!wrapped){
									cq = "( " + cq + " )";
									wrapped = true;
								}
								//Make sure strings are quoted when going into complexQuery merge.
								var v = requestArgs.query[p];
								if(lang.isString(v)){
									v = "'" + v + "'";
								}
								cq += " AND " + p + ":" + v;
								delete query[p];
								
							}
						}
						query.complexQuery = cq;
					}
				}

				var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;
				//for complex queries only:  pattern = query[:|=]"NOT id:23* AND (type:'test*' OR dept:'bob') && !filed:true"
				//logical operators are case insensitive:  , NOT AND OR ( ) ! && ||  // "," included for quoted/string legacy queries.
				if(typeof query != "string"){
					query = json.toJson(query);
					query = query.replace(/\\\\/g,"\\"); //counter toJson expansion of backslashes, e.g., foo\\*bar test.
				}
				query = query.replace(/\\"/g,"\"");   //ditto, for embedded \" in lieu of " availability.
				var complexQuery = lang.trim(query.replace(/{|}/g,"")); //we can handle these, too.
				var pos2, i;
				if(complexQuery.match(/"? *complexQuery *"?:/)){ //case where widget required a json object, so use complexQuery:'the real query'
					complexQuery = lang.trim(complexQuery.replace(/"?\s*complexQuery\s*"?:/,""));
					var quotes = ["'",'"'];
					var pos1,colon;
					var flag = false;
					for(i = 0; i<quotes.length; i++){
						pos1 = complexQuery.indexOf(quotes[i]);
						pos2 = complexQuery.indexOf(quotes[i],1);
						colon = complexQuery.indexOf(":",1);
						if(pos1 === 0 && pos2 != -1 && colon < pos2){
							flag = true;
							break;
						} //first two sets of quotes don't occur before the first colon.
					}
					if(flag){	//dojo.toJson, and maybe user, adds surrounding quotes, which we need to remove.
						complexQuery = complexQuery.replace(/^\"|^\'|\"$|\'$/g,"");
					}
				} //end query="{complexQuery:'id:1* || dept:Sales'}" parsing (for when widget required json object query).
				var complexQuerySave = complexQuery;
				//valid logical operators.
				var begRegExp = /^,|^NOT |^AND |^OR |^\(|^\)|^!|^&&|^\|\|/i; //trailing space on some tokens on purpose.
				var sQuery = ""; //will be eval'ed for each i-th candidateItem, based on query components.
				var op = "";
				var val = "";
				var pos = -1;
				var err = false;
				var key = "";
				var value = "";
				var tok = "";
				pos2 = -1;
				for(i = 0; i < arrayOfItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfItems[i];
					if(candidateItem === null){
						match = false;
					}else{
						//process entire string for this i-th candidateItem.
						complexQuery = complexQuerySave; //restore query for next candidateItem.
						sQuery = "";
						//work left to right, finding either key:value pair or logical operator at the beginning of the complexQuery string.
						//when found, concatenate to sQuery and remove from complexQuery and loop back.
						while(complexQuery.length > 0 && !err){
							op = complexQuery.match(begRegExp);
							
							//get/process/append one or two leading logical operators.
							while(op && !err){ //look for leading logical operators.
								complexQuery = lang.trim(complexQuery.replace(op[0],""));
								op = lang.trim(op[0]).toUpperCase();
								//convert some logical operators to their javascript equivalents for later eval.
								op = op == "NOT" ? "!" : op == "AND" || op == "," ? "&&" : op == "OR" ? "||" : op;
								op = " " + op + " ";
								sQuery += op;
								op = complexQuery.match(begRegExp);
							}//end op && !err
							
							//now get/process/append one key:value pair.
							if(complexQuery.length > 0){
								pos = complexQuery.indexOf(":");
								if(pos == -1){
									err = true;
									break;
								}else{
									key = lang.trim(complexQuery.substring(0,pos).replace(/\"|\'/g,""));
									complexQuery = lang.trim(complexQuery.substring(pos + 1));
									tok = complexQuery.match(/^\'|^\"/);	//quoted?
									if(tok){
										tok = tok[0];
										pos = complexQuery.indexOf(tok);
										pos2 = complexQuery.indexOf(tok,pos + 1);
										if(pos2 == -1){
											err = true;
											break;
										}
										value = complexQuery.substring(pos + 1,pos2);
										if(pos2 == complexQuery.length - 1){ //quote is last character
											complexQuery = "";
										}else{
											complexQuery = lang.trim(complexQuery.substring(pos2 + 1));
										}
										sQuery += self._containsValue(candidateItem, key, value, filterUtil.patternToRegExp(value, ignoreCase));
									}
									else{ //not quoted, so a space, comma, or closing parens (or the end) will be the break.
										tok = complexQuery.match(/\s|\)|,/);
										if(tok){
											var pos3 = new Array(tok.length);
											for(var j = 0;j<tok.length;j++){
												pos3[j] = complexQuery.indexOf(tok[j]);
											}
											pos = pos3[0];
											if(pos3.length > 1){
												for(var j=1;j<pos3.length;j++){
													pos = Math.min(pos,pos3[j]);
												}
											}
											value = lang.trim(complexQuery.substring(0,pos));
											complexQuery = lang.trim(complexQuery.substring(pos));
										}else{ //not a space, so must be at the end of the complexQuery.
											value = lang.trim(complexQuery);
											complexQuery = "";
										} //end  inner if(tok) else
										sQuery += self._containsValue(candidateItem, key, value, filterUtil.patternToRegExp(value, ignoreCase));
									} //end outer if(tok) else
								} //end found ":"
							} //end if(complexQuery.length > 0)
						} //end while complexQuery.length > 0 && !err, so finished the i-th item.
						match = eval(sQuery);
					} //end else is non-null candidateItem.
					if(match){
						items.push(candidateItem);
					}
				} //end for/next of all items.
				if(err){
					//soft fail.
					items = [];
					console.log("The store's _fetchItems failed, probably due to a syntax error in query.");
				}
				findCallback(items, requestArgs);
			}else{
				// No query...
				// We want a copy to pass back in case the parent wishes to sort the array.
				// We shouldn't allow resort of the internal list, so that multiple callers
				// can get lists and sort without affecting each other.  We also need to
				// filter out any null values that have been left as a result of deleteItem()
				// calls in ItemFileWriteStore.
				for(var i = 0; i < arrayOfItems.length; ++i){
					var item = arrayOfItems[i];
					if(item !== null){
						items.push(item);
					}
				}
				findCallback(items, requestArgs);
			} //end if there is a query.
		}; //end filter function

		if(this._loadFinished){
			filter(keywordArgs, this._getItemsArray(keywordArgs.queryOptions));
		}else{
			if(this._jsonFileUrl !== this._ccUrl){
				kernel.deprecated("dojox.data.AndOrReadStore: ",
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
							preventCache: this.urlPreventCache
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
				errorCallback(new Error("dojox.data.AndOrReadStore: No JSON source data was provided as either URL or a nested Javascript object."), keywordArgs);
			}
		} //end deferred fetching.
	}, //end _fetchItems

	_handleQueuedFetches: function(){
		//	summary:
		//		Internal function to execute delayed request in the store.
		//Execute any deferred fetches now.
		if(this._queuedFetches.length > 0){
			for(var i = 0; i < this._queuedFetches.length; i++){
				var fData = this._queuedFetches[i];
				var delayedQuery = fData.args;
				var delayedFilter = fData.filter;
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
				 console.debug("dojox.data.AndOrReadStore: WARNING!  Data reload " +
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
		
		var self = this;
		function valueIsAnItem(/* anything */ aValue){
			// summary:
			//		Given any sort of value that could be in the raw json data,
			//		return true if we should interpret the value as being an
			//		item itself, rather than a literal value or a reference.
			// example:
			// 	|	false == valueIsAnItem("Kermit");
			// 	|	false == valueIsAnItem(42);
			// 	|	false == valueIsAnItem(new Date());
			// 	|	false == valueIsAnItem({_type:'Date', _value:'May 14, 1802'});
			// 	|	false == valueIsAnItem({_reference:'Kermit'});
			// 	|	true == valueIsAnItem({name:'Kermit', color:'green'});
			// 	|	true == valueIsAnItem({iggy:'pop'});
			// 	|	true == valueIsAnItem({foo:42});
			var isItem = (
				(aValue !== null) &&
				(typeof aValue === "object") &&
				(!lang.isArray(aValue)) &&
				(!lang.isFunction(aValue)) &&
				(aValue.constructor == Object) &&
				(typeof aValue._reference === "undefined") &&
				(typeof aValue._type === "undefined") &&
				(typeof aValue._value === "undefined") &&
				self.hierarchical
			);
			return isItem;
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
		var i;
		var item;
		this._arrayOfAllItems = [];
		this._arrayOfTopLevelItems = dataObject.items;

		for(i = 0; i < this._arrayOfTopLevelItems.length; ++i){
			item = this._arrayOfTopLevelItems[i];
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
		var allAttributeNames = {};
		var key;

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
				if(!this._itemsByIdentity[identity]){
					this._itemsByIdentity[identity] = item;
				}else{
					if(this._jsonFileUrl){
						throw new Error("dojox.data.AndOrReadStore:  The json data as specified by: [" + this._jsonFileUrl + "] is malformed.  Items within the list have identifier: [" + identifier + "].  Value collided: [" + identity + "]");
					}else if(this._jsonData){
						throw new Error("dojox.data.AndOrReadStore:  The json data provided by the creation arguments is malformed.  Items within the list have identifier: [" + identifier + "].  Value collided: [" + identity + "]");
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
		//		{ name:['Nelson Mandela'], born:[{_type:'Date', _value:'July 18, 1918'}] }
		// into this:
		//		{ name:['Kermit'], born:(new Date('July 18, 1918')) }
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
								throw new Error("dojox.data.AndOrReadStore: in the typeMap constructor arg, no object class was specified for the datatype '" + type + "'");
							}else if(lang.isFunction(mappingObj)){
								arrayOfValues[j] = new mappingObj(value._value);
							}else if(lang.isFunction(mappingObj.deserialize)){
								arrayOfValues[j] = mappingObj.deserialize(value._value);
							}else{
								throw new Error("dojox.data.AndOrReadStore: Value provided in typeMap was neither a constructor, nor a an object with a deserialize function");
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
									var candidateItem = this._arrayOfAllItems[k];
									var found = true;
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
		if(!this._loadFinished){
			var self = this;
			if(this._jsonFileUrl !== this._ccUrl){
				kernel.deprecated("dojox.data.AndOrReadStore: ",
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
							preventCache: this.urlPreventCache
					};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						var scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
						try{
							self._getItemsFromLoadedData(data);
							self._loadFinished = true;
							self._loadInProgress = false;
							var item = self._getItemByIdentity(keywordArgs.identity);
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
							var scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
							keywordArgs.onError.call(scope, error);
						}
					});
				}

			}else if(this._jsonData){
				// Passed in data, no need to xhr.
				self._getItemsFromLoadedData(self._jsonData);
				self._jsonData = null;
				self._loadFinished = true;
				var item = self._getItemByIdentity(keywordArgs.identity);
				if(keywordArgs.onItem){
					var scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
					keywordArgs.onItem.call(scope, item);
				}
			}
		}else{
			// Already loaded.  We can just look it up and call back.
			var item = this._getItemByIdentity(keywordArgs.identity);
			if(keywordArgs.onItem){
				var scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
				keywordArgs.onItem.call(scope, item);
			}
		}
	},

	_getItemByIdentity: function(/* Object */ identity){
		//	summary:
		//		Internal function to look an item up by its identity map.
		var item = null;
		if(this._itemsByIdentity){
			item = this._itemsByIdentity[identity];
		}else{
			item = this._arrayOfAllItems[identity];
		}
		if(item === undefined){
			item = null;
		}
		return item; // Object
	},

	getIdentityAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentifierAttributes()
		 
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
		if(this._jsonFileUrl !== this._ccUrl){
			kernel.deprecated("dojox.data.AndOrReadStore: ",
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
				var getArgs = {
					url: self._jsonFileUrl,
					handleAs: "json-comment-optional",
					preventCache: this.urlPreventCache,
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
						throw new Error("dojox.data.AndOrReadStore:  Unable to perform a synchronous load, an async load is in progress.");
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
lang.extend(AndOrReadStore, simpleFetch);

return AndOrReadStore;
});



},
'dojox/data/OpenSearchStore':function(){
define("dojox/data/OpenSearchStore", [
	"dojo/_base/kernel", // dojo.experimental
	"dojo/_base/lang", // dojo.extend
	"dojo/_base/declare", // dojo.declare
	"dojo/_base/xhr", // dojo.xhrGet
	"dojo/_base/array", // dojo.forEach
	"dojo/_base/window", // dojo.doc
	"dojo/query",
	"dojo/data/util/simpleFetch",
	"dojox/xml/parser"], function (kernel, lang, declare, dxhr, array, window, query, simpleFetch, parser) {
kernel.experimental("dojox.data.OpenSearchStore");

var OpenSearchStore = declare("dojox.data.OpenSearchStore", null, {
	constructor: function(/*Object*/args){
		//	summary:
		//		Initializer for the OpenSearchStore store.
		//	description:
		//		The OpenSearchStore is a Datastore interface to any search
		//		engine that implements the open search specifications.
		if(args){
			this.label = args.label;
			this.url = args.url;
			this.itemPath = args.itemPath;
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
			}
		}
		var def = dxhr.get({
			url: this.url,
			handleAs: "xml",
			sync: true,
			preventCache: this.urlPreventCache
		});
		def.addCallback(this, "_processOsdd");
		def.addErrback(function(){
			throw new Error("Unable to load OpenSearch Description document from " . args.url);
		});
	},
	
	// URL to the open search description document
	url: "",
	itemPath: "",
	_storeRef: "_S",
	urlElement: null,
	iframeElement: null,

	//urlPreventCache: boolean
	//Flag denoting if xhrGet calls should use the preventCache option.
	urlPreventCache: true,
	
	ATOM_CONTENT_TYPE: 3,
	ATOM_CONTENT_TYPE_STRING: "atom",
	RSS_CONTENT_TYPE: 2,
	RSS_CONTENT_TYPE_STRING: "rss",
	XML_CONTENT_TYPE: 1,
	XML_CONTENT_TYPE_STRING: "xml",

	_assertIsItem: function(/* item */ item){
		//	summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.OpenSearchStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.OpenSearchStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	getFeatures: function(){
		//	summary:
		//      See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true
		};
	},

	getValue: function(item, attribute, defaultValue){
		//	summary:
		//      See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		if(values){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		//	summary:
		//      See dojo.data.api.Read.getAttributes()
		return ["content"];
	},

	hasAttribute: function(item, attribute){
		//	summary:
		//      See dojo.data.api.Read.hasAttributes()
		if(this.getValue(item,attribute)){
			return true;
		}
		return false;
	},

	isItemLoaded: function(item){
		 //	summary:
		 //      See dojo.data.api.Read.isItemLoaded()
		 return this.isItem(item);
	},

	loadItem: function(keywordArgs){
		//	summary:
		//      See dojo.data.api.Read.loadItem()
	},

	getLabel: function(item){
		//	summary:
		//      See dojo.data.api.Read.getLabel()
		return undefined;
	},
	
	getLabelAttributes: function(item){
		//	summary:
		//      See dojo.data.api.Read.getLabelAttributes()
		return null;
	},

	containsValue: function(item, attribute, value){
		//	summary:
		//      See dojo.data.api.Read.containsValue()
		var values = this.getValues(item,attribute);
		for(var i = 0; i < values.length; i++){
			if(values[i] === value){
				return true;
			}
		}
		return false;
	},

	getValues: function(item, attribute){
		//	summary:
		//      See dojo.data.api.Read.getValue()

		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var value = this.processItem(item, attribute);
		if(value){
			return [value];
		}
		return undefined;
	},

	isItem: function(item){
		//	summary:
		//      See dojo.data.api.Read.isItem()
		if(item && item[this._storeRef] === this){
			return true;
		}
		return false;
	},
	
	close: function(request){
		//	summary:
		//      See dojo.data.api.Read.close()
	},
	
	process: function(data){
		// This should return an array of items.  This would be the function to override if the
		// developer wanted to customize the processing/parsing of the entire batch of search
		// results.
		return this["_processOSD"+this.contentType](data);
	},
	
	processItem: function(item, attribute){
		// This returns the text that represents the item.  If a developer wanted to customize
		// how an individual item is rendered/parsed, they'd override this function.
		return this["_processItem"+this.contentType](item.node, attribute);
	},
	
	_createSearchUrl: function(request){
		var template = this.urlElement.attributes.getNamedItem("template").nodeValue;
		var attrs = this.urlElement.attributes;
		var index = template.indexOf("{searchTerms}");
		template = template.substring(0, index) + request.query.searchTerms + template.substring(index+13);
		
		array.forEach([	{'name': 'count', 'test': request.count, 'def': '10'},
						{'name': 'startIndex', 'test': request.start, 'def': this.urlElement.attributes.getNamedItem("indexOffset")?this.urlElement.attributes.getNamedItem("indexOffset").nodeValue:0},
						{'name': 'startPage', 'test': request.startPage, 'def': this.urlElement.attributes.getNamedItem("pageOffset")?this.urlElement.attributes.getNamedItem("pageOffset").nodeValue:0},
						{'name': 'language', 'test': request.language, 'def': "*"},
						{'name': 'inputEncoding', 'test': request.inputEncoding, 'def': 'UTF-8'},
						{'name': 'outputEncoding', 'test': request.outputEncoding, 'def': 'UTF-8'}
					], function(item){
			template = template.replace('{'+item.name+'}', item.test || item.def);
			template = template.replace('{'+item.name+'?}', item.test || item.def);
		});
		return template;
	},

	_fetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Fetch OpenSearch items that match to a query
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error

		if(!request.query){
			request.query={};
		}

		//Build up the content using information from the request
		var self = this;
		var url = this._createSearchUrl(request);
		var getArgs = {
			url: url,
			preventCache: this.urlPreventCache
		};

		// Change to fetch the query results.
		var xhr = dxhr.get(getArgs);

		xhr.addErrback(function(error){
			errorHandler(error, request);
		});

		xhr.addCallback(function(data){
			var items = [];
			if(data){
				//Process the items...
				items = self.process(data);
				for(var i=0; i < items.length; i++){
					items[i] = {node: items[i]};
					items[i][self._storeRef] = self;
				}
			}
			fetchHandler(items, request);
		});
	},
	
	_processOSDxml: function(data){
		var div = window.doc.createElement("div");
		div.innerHTML = data;
		return query(this.itemPath, div);
	},
	
	_processItemxml: function(item, attribute){
		if(attribute === "content"){
			return item.innerHTML;
		}
		return undefined;
	},
	
	_processOSDatom: function(data){
		return this._processOSDfeed(data, "entry");
	},

	_processItematom: function(item, attribute){
		return this._processItemfeed(item, attribute, "content");
	},

	_processOSDrss: function(data){
		return this._processOSDfeed(data, "item");
	},

	_processItemrss: function(item, attribute){
		return this._processItemfeed(item, attribute, "description");
	},

	_processOSDfeed: function(data, type){
		data = dojox.xml.parser.parse(data);
		var items = [];
		var nodeList = data.getElementsByTagName(type);
		for(var i=0; i<nodeList.length; i++){
			items.push(nodeList.item(i));
		}
		return items;
	},

	_processItemfeed: function(item, attribute, type){
		if(attribute === "content"){
			var content = item.getElementsByTagName(type).item(0);
			return this._getNodeXml(content, true);
		}
		return undefined;
	},
	
	_getNodeXml: function(node, skipFirst){
		var i;
		switch(node.nodeType){
			case 1:
				var xml = [];
				if(!skipFirst){
					xml.push("<"+node.tagName);
					var attr;
					for(i=0; i<node.attributes.length; i++){
						attr = node.attributes.item(i);
						xml.push(" "+attr.nodeName+"=\""+attr.nodeValue+"\"");
					}
					xml.push(">");
				}
				for(i=0; i<node.childNodes.length; i++){
					xml.push(this._getNodeXml(node.childNodes.item(i)));
				}
				if(!skipFirst){
					xml.push("</"+node.tagName+">\n");
				}
				return xml.join("");
			case 3:
			case 4:
				return node.nodeValue;
		}
		return undefined;
	},

	_processOsdd: function(doc){
		var urlnodes = doc.getElementsByTagName("Url");
		//TODO: Check all the urlnodes and determine what our best one is...
		var types = [];
		var contentType;
		var i;
		for(i=0; i<urlnodes.length; i++){
			contentType = urlnodes[i].attributes.getNamedItem("type").nodeValue;
			switch(contentType){
				case "application/rss+xml":
					types[i] = this.RSS_CONTENT_TYPE;
					break;
				case "application/atom+xml":
					types[i] = this.ATOM_CONTENT_TYPE;
					break;
				default:
					types[i] = this.XML_CONTENT_TYPE;
					break;
			}
		}
		var index = 0;
		var currentType = types[0];
		for(i=1; i<urlnodes.length; i++){
			if(types[i]>currentType){
				index = i;
				currentType = types[i];
			}
		}

		// We'll be using urlnodes[index] as it's the best option (ATOM > RSS > XML)
		var label = urlnodes[index].nodeName.toLowerCase();
		if(label == 'url'){
			var urlattrs = urlnodes[index].attributes;
			this.urlElement = urlnodes[index];
			switch(types[index]){
				case this.ATOM_CONTENT_TYPE:
					this.contentType = this.ATOM_CONTENT_TYPE_STRING;
					break;
				case this.RSS_CONTENT_TYPE:
					this.contentType = this.RSS_CONTENT_TYPE_STRING;
					break;
				case this.XML_CONTENT_TYPE:
					this.contentType = this.XML_CONTENT_TYPE_STRING;
					break;
			}
		}
	}
});
return lang.extend(OpenSearchStore,simpleFetch);
});
},
'dojox/data/SnapLogicStore':function(){
define("dojox/data/SnapLogicStore", ["dojo", "dojox", "dojo/io/script", "dojo/data/util/sorter"], function(dojo, dojox) {

dojo.declare("dojox.data.SnapLogicStore", null, {
	Parts: {
		DATA: "data",
		COUNT: "count"
	},

	url: "",

	constructor: function(/* Object */args){
		//	summary:
		//		Initialize a SnapLogicStore object.
		//	args:
		//		An object that contains properties for initializing the new data store object. The
		//		following properties are understood:
		//			url:
		//				A URL to the SnapLogic pipeline's output routed through PipeToHttp. Typically, this
		//				will look like "http://<server-host>:<port>/pipe/<pipeline-url>/<pipeline-output-view>".
		//			parameters:
		//				An object whose properties define parameters to the pipeline. The values of these
		//				properties will be sent to the pipeline as parameters when it run.
		//
		if(args.url){
			this.url = args.url;
		}
		this._parameters = args.parameters;
	},

	_assertIsItem: function(/* item */item){
		//	summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.SnapLogicStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.SnapLogicStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true
		};
	},

	getValue: function(item, attribute, defaultValue){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var i = dojo.indexOf(item.attributes, attribute);
		if(i !== -1){
			return item.values[i];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		return item.attributes;
	},

	hasAttribute: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttributes()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		for(var i = 0; i < item.attributes.length; ++i){
			if(attribute == item.attributes[i]){
				return true;
			}
		}
		return false;
	},

	isItemLoaded: function(item){
		 //	summary:
		 //		 See dojo.data.api.Read.isItemLoaded()
		 return this.isItem(item);		// Boolean
	},

	loadItem: function(keywordArgs){
		//	summary:
		//		See dojo.data.api.Read.loadItem()
	},

	getLabel: function(item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		return undefined;
	},
	
	getLabelAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		return null;
	},

	containsValue: function(item, attribute, value){
		//	summary:
		//		See dojo.data.api.Read.containsValue()
		return this.getValue(item, attribute) === value;		// Boolean
	},

	getValues: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var i = dojo.indexOf(item.attributes, attribute);
		if(i !== -1){
			return [item.values[i]];	// Array
		}
		return [];
	},

	isItem: function(item){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		if(item && item._store === this){
			return true;
		}
		return false;
	},
	
	close: function(request){
		//	summary:
		//		See dojo.data.api.Read.close()
	},

	_fetchHandler: function(/* Object */request){
		//	summary:
		//		Process data retrieved via fetch and send it back to requester.
		//	response:
		//		The data returend from the I/O transport. In the normal case, it will be an array of result rows
		//		from the pipeline. In the special case for record count optimization, response will be an array
		//		with a single element containing the total pipeline result row count. See fetch() for details
		//		on this optimization.

		var scope = request.scope || dojo.global;

		if(request.onBegin){
			// Check for the record count optimization
			request.onBegin.call(scope, request._countResponse[0], request);
		}
		
		if(request.onItem || request.onComplete){
			var response = request._dataResponse;

			if(!response.length){
				request.onError.call(scope,
									 new Error("dojox.data.SnapLogicStore: invalid response of length 0"),
									 request);
				return;
			}else if(request.query != 'record count'){
				//If this was not a record count request, the first element returned will contain
				//the field names.
				var field_names = response.shift();
				
				var items = [];
				for(var i = 0; i < response.length; ++i){
					if(request._aborted){
						break;
					}

					items.push({attributes: field_names, values: response[i], _store: this});
				}

				if(request.sort && !request._aborted){
					items.sort(dojo.data.util.sorter.createSortFunction(request.sort, self));
				}
			}else{
				//This is a record count request, so manually set the field names.
				items = [({attributes: ['count'], values: response, _store: this})];
			}

			if(request.onItem){
				for(var i = 0; i < items.length; ++i){
					if(request._aborted){
						break;
					}
					request.onItem.call(scope, items[i], request);
				}
				items = null;
			}

			if(request.onComplete && !request._aborted){
				request.onComplete.call(scope, items, request);
			}
		}
	},
		
	_partHandler: function(/* Object */request, /* String */part, /* Object */response){
		//	summary:
		//		Handle the individual replies for both data and length requests.
		//	request:
		//		The request/handle object used with the original fetch() call.
		//  part:
		//		A value indicating which request this handler call is for (this.Parts).
		//	response:
		//		Response received from the underlying IO transport.

		if(response instanceof Error){
			if(part == this.Parts.DATA){
				request._dataHandle = null;
			}else{
				request._countHandle = null;
			}
			request._aborted = true;
			if(request.onError){
				request.onError.call(request.scope, response, request);
			}
		}else{
			if(request._aborted){
				return;
			}
			if(part == this.Parts.DATA){
				request._dataResponse = response;
			}else{
				request._countResponse = response;
			}
			if((!request._dataHandle || request._dataResponse !== null) &&
				(!request._countHandle || request._countResponse !== null)){
				this._fetchHandler(request);
			}
		}
	},

	fetch: function(/* Object */request){
		//	summary:
		//		See dojo.data.api.Read.close()
		//	request:
		//		See dojo.data.api.Read.close() for generic interface.
		//
		//		In addition to the standard Read API fetch support, this store supports an optimization for
		//		for retrieving the total count of records in the Pipeline without retrieving the data. To
		//		use this optimization, simply provide an onBegin handler without an onItem or onComplete handler.

		request._countResponse = null;
		request._dataResponse = null;
		request._aborted = false;
		request.abort = function(){
			if(!request._aborted){
				request._aborted = true;
				if(request._dataHandle && request._dataHandle.cancel){
					request._dataHandle.cancel();
				}
				if(request._countHandle && request._countHandle.cancel){
					request._countHandle.cancel();
				}
			}
		};

		// Only make the call for data if onItem or onComplete is used. Otherwise, onBegin will only
		// require the total row count.
		if(request.onItem || request.onComplete){
			var content = this._parameters || {};
			if(request.start){
				if(request.start < 0){
					throw new Error("dojox.data.SnapLogicStore: request start value must be 0 or greater");
				}
				content['sn.start'] = request.start + 1;
			}
			if(request.count){
				if(request.count < 0){
					throw new Error("dojox.data.SnapLogicStore: request count value 0 or greater");
				}
				content['sn.limit'] = request.count;
			}
			
			content['sn.content_type'] = 'application/javascript';

			var store = this;
			var handler = function(response, ioArgs){
				if(response instanceof Error){
					store._fetchHandler(response, request);
				}
			};

			var getArgs = {
				url: this.url,
				content: content,
				// preventCache: true,
				timeout: 60000,								//Starting a pipeline can take a long time.
				callbackParamName: "sn.stream_header",
				handle: dojo.hitch(this, "_partHandler", request, this.Parts.DATA)
			};

			request._dataHandle = dojo.io.script.get(getArgs);
		}
		
		if(request.onBegin){
			var content = {};
			content['sn.count'] = 'records';
			content['sn.content_type'] = 'application/javascript';

			var getArgs = {
				url: this.url,
				content: content,
				timeout: 60000,
				callbackParamName: "sn.stream_header",
				handle: dojo.hitch(this, "_partHandler", request, this.Parts.COUNT)
			};

			request._countHandle = dojo.io.script.get(getArgs);
		}
			
		return request;			// Object
	}
});

return dojox.data.SnapLogicStore;
});


},
'dojox/data/S3Store':function(){
define("dojox/data/S3Store", ["dojo/_base/declare", "dojox/data/JsonRestStore", "dojox/rpc/ProxiedPath"], 
  function(declare, JsonRestStore, ProxiedPath) {

// S3JsonRestStore is an extension of JsonRestStore to handle
// Amazon's S3 service using JSON data
/*===== var JsonRestStore = dojox.data.JsonRestStore =====*/
return declare("dojox.data.S3Store", JsonRestStore,
	{
		_processResults : function(results){
			// unfortunately, S3 returns query results in XML form
			var keyElements = results.getElementsByTagName("Key");
			var jsResults = [];
			var self = this;
			for(var i=0; i <keyElements.length;i++){
				var keyElement = keyElements[i];
				// manually create lazy loaded Deferred items for each item in the result array
				var val = {
					_loadObject: (function(key,val){
						return function(callback){
							// when a callback is added we will fetch it
							delete this._loadObject;
							self.service(key).addCallback(callback);
						};
					})(keyElement.firstChild.nodeValue,val)
				};
				jsResults.push(val);
			}
			
			return {totalCount:jsResults.length, items: jsResults};
		}
	}
);

});

},
'dojox/data/OpmlStore':function(){
define("dojox/data/OpmlStore", ["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/xhr", "dojo/data/util/simpleFetch", "dojo/data/util/filter",
		"dojo/_base/window"], 
  function(declare, lang, xhr, simpleFetch, filterUtil, winUtil) {

var OpmlStore = declare("dojox.data.OpmlStore", null, {
	/* summary:
	 *   The OpmlStore implements the dojo.data.api.Read API.
	 */
	 
	/* examples:
	 *   var opmlStore = new dojo.data.OpmlStore({url:"geography.xml"});
	 *   var opmlStore = new dojo.data.OpmlStore({url:"http://example.com/geography.xml"});
	 */
	constructor: function(/* Object */ keywordParameters){
		// summary: constructor
		// keywordParameters: {url: String, label: String}  Where label is optional and configures what should be used as the return from getLabel()
		this._xmlData = null;
		this._arrayOfTopLevelItems = [];
		this._arrayOfAllItems = [];
		this._metadataNodes = null;
		this._loadFinished = false;
		this.url = keywordParameters.url;
		this._opmlData = keywordParameters.data; // XML DOM Document
		if(keywordParameters.label){
			this.label = keywordParameters.label;
		}
		this._loadInProgress = false;	//Got to track the initial load to prevent duelling loads of the dataset.
		this._queuedFetches = [];
		this._identityMap = {};
		this._identCount = 0;
		this._idProp = "_I";
		if(keywordParameters && "urlPreventCache" in keywordParameters){
			this.urlPreventCache = keywordParameters.urlPreventCache?true:false;
		}
	},

	// label: [public] string
	//		The attribute of the Opml item to act as a label.
	label: "text",

	// url: [public] string
	//		The location from which to fetch the Opml document.
	url: "",

	// urlPreventCache: [public] boolean
	//		Flag to denote if the underlying xhrGet call should set preventCache.
	urlPreventCache: false,

	_assertIsItem: function(/* item */ item){
		if(!this.isItem(item)){
			throw new Error("dojo.data.OpmlStore: a function was passed an item argument that was not an item");
		}
	},
	
	_assertIsAttribute: function(/* item || String */ attribute){
		//	summary:
		//      This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(!lang.isString(attribute)){
			throw new Error("dojox.data.OpmlStore: a function was passed an attribute argument that was not an attribute object nor an attribute name string");
		}
	},
	
	_removeChildNodesThatAreNotElementNodes: function(/* node */ node, /* boolean */ recursive){
		var childNodes = node.childNodes;
		if(childNodes.length === 0){
			return;
		}
		var nodesToRemove = [];
		var i, childNode;
		for(i = 0; i < childNodes.length; ++i){
			childNode = childNodes[i];
			if(childNode.nodeType != 1){
				nodesToRemove.push(childNode);
			}
		}
		for(i = 0; i < nodesToRemove.length; ++i){
			childNode = nodesToRemove[i];
			node.removeChild(childNode);
		}
		if(recursive){
			for(i = 0; i < childNodes.length; ++i){
				childNode = childNodes[i];
				this._removeChildNodesThatAreNotElementNodes(childNode, recursive);
			}
		}
	},
	
	_processRawXmlTree: function(/* xmlDoc */ rawXmlTree){
		this._loadFinished = true;
		this._xmlData = rawXmlTree;
		var headNodes = rawXmlTree.getElementsByTagName('head');
		var headNode = headNodes[0];
		if(headNode){
			this._removeChildNodesThatAreNotElementNodes(headNode);
			this._metadataNodes = headNode.childNodes;
		}
		var bodyNodes = rawXmlTree.getElementsByTagName('body');
		var bodyNode = bodyNodes[0];
		if(bodyNode){
			this._removeChildNodesThatAreNotElementNodes(bodyNode, true);
			
			var bodyChildNodes = bodyNodes[0].childNodes;
			for(var i = 0; i < bodyChildNodes.length; ++i){
				var node = bodyChildNodes[i];
				if(node.tagName == 'outline'){
					this._identityMap[this._identCount] = node;
					this._identCount++;
					this._arrayOfTopLevelItems.push(node);
					this._arrayOfAllItems.push(node);
					this._checkChildNodes(node);
				}
			}
		}
	},

	_checkChildNodes: function(node /*Node*/){
		//	summary:
		//		Internal function to recurse over all child nodes from the store and add them
		//		As non-toplevel items
		//	description:
		//		Internal function to recurse over all child nodes from the store and add them
		//		As non-toplevel items
		//
		//	node:
		//		The child node to walk.
		if(node.firstChild){
			for(var i = 0; i < node.childNodes.length; i++){
				var child = node.childNodes[i];
				if(child.tagName == 'outline'){
					this._identityMap[this._identCount] = child;
					this._identCount++;
					this._arrayOfAllItems.push(child);
					this._checkChildNodes(child);
				}
			}
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

/***************************************
     dojo.data.api.Read API
***************************************/
	getValue: function( /* item */ item,
						/* attribute || attribute-name-string */ attribute,
						/* value? */ defaultValue){
		//	summary:
		//      See dojo.data.api.Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		if(attribute == 'children'){
			return (item.firstChild || defaultValue); //Object
		}else{
			var value = item.getAttribute(attribute);
			return (value !== undefined) ? value : defaultValue; //Object
		}
	},
	
	getValues: function(/* item */ item,
						/* attribute || attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.getValues()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var array = [];
		if(attribute == 'children'){
			for(var i = 0; i < item.childNodes.length; ++i){
				array.push(item.childNodes[i]);
			}
		} else if(item.getAttribute(attribute) !== null){
				array.push(item.getAttribute(attribute));
		}
		return array; // Array
	},
	
	getAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		var xmlNode = item;
		var xmlAttributes = xmlNode.attributes;
		for(var i = 0; i < xmlAttributes.length; ++i){
			var xmlAttribute = xmlAttributes.item(i);
			attributes.push(xmlAttribute.nodeName);
		}
		if(xmlNode.childNodes.length > 0){
			attributes.push('children');
		}
		return attributes; //Array
	},
	
	hasAttribute: function( /* item */ item,
							/* attribute || attribute-name-string */ attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttribute()
		return (this.getValues(item, attribute).length > 0); //Boolean
	},
	
	containsValue: function(/* item */ item,
							/* attribute || attribute-name-string */ attribute,
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
								/* attribute || attribute-name-string */ attribute,
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
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; ++i){
			var possibleValue = values[i];
			if(typeof possibleValue === "string" && regexp){
				return (possibleValue.match(regexp) !== null);
			}else{
				//Non-string matching.
				if(value === possibleValue){
					return true; // Boolean
				}
			}
		}
		return false; // Boolean
	},
			
	isItem: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		//	description:
		//		Four things are verified to ensure that "something" is an item:
		//		something can not be null, the nodeType must be an XML Element,
		//		the tagName must be "outline", and the node must be a member of
		//		XML document for this datastore.
		return (something &&
				something.nodeType == 1 &&
				something.tagName == 'outline' &&
				something.ownerDocument === this._xmlData); //Boolean
	},
	
	isItemLoaded: function(/* anything */ something){
		//	summary:
		//		See dojo.data.api.Read.isItemLoaded()
		// 		OpmlStore loads every item, so if it's an item, then it's loaded.
		return this.isItem(something); //Boolean
	},
	
	loadItem: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.loadItem()
		//	description:
		//		The OpmlStore always loads all items, so if it's an item, then it's loaded.
		//		From the dojo.data.api.Read.loadItem docs:
		//			If a call to isItemLoaded() returns true before loadItem() is even called,
		//			then loadItem() need not do any work at all and will not even invoke the callback handlers.
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		if(this.isItem(item)){
			return this.getValue(item,this.label); //String
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		return [this.label]; //array
	},

	// The dojo.data.api.Read.fetch() function is implemented as
	// a mixin from dojo.data.util.simpleFetch.
	// That mixin requires us to define _fetchItems().
	_fetchItems: function(	/* Object */ keywordArgs,
							/* Function */ findCallback,
							/* Function */ errorCallback){
		//	summary:
		//		See dojo.data.util.simpleFetch.fetch()
		
		var self = this;
		var filter = function(requestArgs, arrayOfItems){
			var items = null;
			if(requestArgs.query){
				items = [];
				var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(var key in requestArgs.query){
					var value = requestArgs.query[key];
					if(typeof value === "string"){
						regexpList[key] = filterUtil.patternToRegExp(value, ignoreCase);
					}
				}

				for(var i = 0; i < arrayOfItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfItems[i];
					for(var key in requestArgs.query){
						var value = requestArgs.query[key];
						if(!self._containsValue(candidateItem, key, value, regexpList[key])){
							match = false;
						}
					}
					if(match){
						items.push(candidateItem);
					}
				}
			}else{
				// We want a copy to pass back in case the parent wishes to sort the array.  We shouldn't allow resort
				// of the internal list so that multiple callers can get lists and sort without affecting each other.
				if(arrayOfItems.length> 0){
					items = arrayOfItems.slice(0,arrayOfItems.length);
				}
			}
			findCallback(items, requestArgs);
		};

		if(this._loadFinished){
			filter(keywordArgs, this._getItemsArray(keywordArgs.queryOptions));
		}else{

			//If fetches come in before the loading has finished, but while
			//a load is in progress, we have to defer the fetching to be
			//invoked in the callback.
			if(this._loadInProgress){
				this._queuedFetches.push({args: keywordArgs, filter: filter});
			}else{
				if(this.url !== ""){
					this._loadInProgress = true;
					var getArgs = {
							url: self.url,
							handleAs: "xml",
							preventCache: self.urlPreventCache
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						self._processRawXmlTree(data);
						filter(keywordArgs, self._getItemsArray(keywordArgs.queryOptions));
						self._handleQueuedFetches();
					});
					getHandler.addErrback(function(error){
						throw error;
					});
				}else if(this._opmlData){
					this._processRawXmlTree(this._opmlData);
					this._opmlData = null;
					filter(keywordArgs, this._getItemsArray(keywordArgs.queryOptions));
				}else{
					throw new Error("dojox.data.OpmlStore: No OPML source data was provided as either URL or XML data input.");
				}
			}
		}
	},
	
	getFeatures: function(){
		// summary: See dojo.data.api.Read.getFeatures()
		var features = {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
		return features; //Object
	},

/***************************************
     dojo.data.api.Identity API
***************************************/
	getIdentity: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Identity.getIdentity()
		if(this.isItem(item)){
			//No ther way to do this other than O(n) without
			//complete rework of how the tree stores nodes.
			for(var i in this._identityMap){
				if(this._identityMap[i] === item){
					return i;
				}
			}
		}
		return null; //null
	},

	fetchItemByIdentity: function(/* Object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()

		//Hasn't loaded yet, we have to trigger the load.
		if(!this._loadFinished){
			var self = this;
			if(this.url !== ""){
				//If fetches come in before the loading has finished, but while
				//a load is in progress, we have to defer the fetching to be
				//invoked in the callback.
				if(this._loadInProgress){
					this._queuedFetches.push({args: keywordArgs});
				}else{
					this._loadInProgress = true;
					var getArgs = {
							url: self.url,
							handleAs: "xml"
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						var scope = keywordArgs.scope ? keywordArgs.scope : winUtil.global;
						try{
							self._processRawXmlTree(data);
							var item = self._identityMap[keywordArgs.identity];
							if(!self.isItem(item)){
								item = null;
							}
							if(keywordArgs.onItem){
								keywordArgs.onItem.call(scope, item);
							}
							self._handleQueuedFetches();
						}catch(error){
							if(keywordArgs.onError){
								keywordArgs.onError.call(scope, error);
							}
						}
					});
					getHandler.addErrback(function(error){
						this._loadInProgress = false;
						if(keywordArgs.onError){
							var scope = keywordArgs.scope ? keywordArgs.scope : winUtil.global;
							keywordArgs.onError.call(scope, error);
						}
					});
				}
			}else if(this._opmlData){
				this._processRawXmlTree(this._opmlData);
				this._opmlData = null;
				var item = this._identityMap[keywordArgs.identity];
				if(!self.isItem(item)){
					item = null;
				}
				if(keywordArgs.onItem){
					var scope = keywordArgs.scope ? keywordArgs.scope : winUtil.global;
					keywordArgs.onItem.call(scope, item);
				}
			}
		}else{
			//Already loaded.  We can just look it up and call back.
			var item = this._identityMap[keywordArgs.identity];
			if(!this.isItem(item)){
				item = null;
			}
			if(keywordArgs.onItem){
				var scope = keywordArgs.scope ? keywordArgs.scope : winUtil.global;
				keywordArgs.onItem.call(scope, item);
			}
		}
	},

	getIdentityAttributes: function(/* item */ item){
		 //	summary:
		 //		See dojo.data.api.Identity.getIdentifierAttributes()
		 
		 //Identity isn't a public attribute in the item, it's the node count.
		 //So, return null.
		 return null;
	},

	_handleQueuedFetches: function(){
		//	summary:
		//		Internal function to execute delayed request in the store.
		//Execute any deferred fetches now.
		if(this._queuedFetches.length > 0){
			for(var i = 0; i < this._queuedFetches.length; i++){
				var fData = this._queuedFetches[i];
				var delayedQuery = fData.args;
				var delayedFilter = fData.filter;
				if(delayedFilter){
					delayedFilter(delayedQuery, this._getItemsArray(delayedQuery.queryOptions));
				}else{
					this.fetchItemByIdentity(delayedQuery);
				}
			}
			this._queuedFetches = [];
		}
	},

	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		 //	summary:
		 //		See dojo.data.api.Read.close()
	}
});
//Mix in the simple fetch implementation to this class.
lang.extend(OpmlStore, simpleFetch);

return OpmlStore;
});
	

},
'dojox/json/ref':function(){
define("dojox/json/ref", ["dojo/_base/kernel", "dojox", "dojo/date/stamp", "dojo/_base/array", "dojo/_base/json"], function(dojo, dojox){

dojo.getObject("json", true, dojox);

return dojox.json.ref = {
	// summary:
	// 		Adds advanced JSON {de}serialization capabilities to the base json library.
	// 		This enhances the capabilities of dojo.toJson and dojo.fromJson,
	// 		adding referencing support, date handling, and other extra format handling.
	// 		On parsing, references are resolved. When references are made to
	// 		ids/objects that have been loaded yet, the loader function will be set to
	// 		_loadObject to denote a lazy loading (not loaded yet) object.


	resolveJson: function(/*Object*/ root,/*Object?*/ args){
		// summary:
		// 		Indexes and resolves references in the JSON object.
		// description:
		// 		A JSON Schema object that can be used to advise the handling of the JSON (defining ids, date properties, urls, etc)
		//
		// root:
		//		The root object of the object graph to be processed
		// args:
		//		Object with additional arguments:
		//
		// The *index* parameter.
		//		This is the index object (map) to use to store an index of all the objects.
		// 		If you are using inter-message referencing, you must provide the same object for each call.
		// The *defaultId* parameter.
		//		This is the default id to use for the root object (if it doesn't define it's own id)
		//	The *idPrefix* parameter.
		//		This the prefix to use for the ids as they enter the index. This allows multiple tables
		// 		to use ids (that might otherwise collide) that enter the same global index.
		// 		idPrefix should be in the form "/Service/".  For example,
		//		if the idPrefix is "/Table/", and object is encountered {id:"4",...}, this would go in the
		//		index as "/Table/4".
		//	The *idAttribute* parameter.
		//		This indicates what property is the identity property. This defaults to "id"
		//	The *assignAbsoluteIds* parameter.
		//		This indicates that the resolveJson should assign absolute ids (__id) as the objects are being parsed.
		//
		// The *schemas* parameter
		//		This provides a map of schemas, from which prototypes can be retrieved
		// The *loader* parameter
		//		This is a function that is called added to the reference objects that can't be resolved (lazy objects)
		// return:
		//		An object, the result of the processing
		args = args || {};
		var idAttribute = args.idAttribute || 'id';
		var refAttribute = this.refAttribute;
		var idAsRef = args.idAsRef;
		var prefix = args.idPrefix || '';
		var assignAbsoluteIds = args.assignAbsoluteIds;
		var index = args.index || {}; // create an index if one doesn't exist
		var timeStamps = args.timeStamps;
		var ref,reWalk=[];
		var pathResolveRegex = /^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/;
		var addProp = this._addProp;
		var F = function(){};
		function walk(it, stop, defaultId, needsPrefix, schema, defaultObject){
			// this walks the new graph, resolving references and making other changes
		 	var i, update, val, id = idAttribute in it ? it[idAttribute] : defaultId;
		 	if(idAttribute in it || ((id !== undefined) && needsPrefix)){
		 		id = (prefix + id).replace(pathResolveRegex,'$2$3');
		 	}
		 	var target = defaultObject || it;
			if(id !== undefined){ // if there is an id available...
				if(assignAbsoluteIds){
					it.__id = id;
				}
				if(args.schemas && (!(it instanceof Array)) && // won't try on arrays to do prototypes, plus it messes with queries
		 					(val = id.match(/^(.+\/)[^\.\[]*$/))){ // if it has a direct table id (no paths)
		 			schema = args.schemas[val[1]];
				}
				// if the id already exists in the system, we should use the existing object, and just
				// update it... as long as the object is compatible
				if(index[id] && ((it instanceof Array) == (index[id] instanceof Array))){
					target = index[id];
					delete target.$ref; // remove this artifact
					delete target._loadObject;
					update = true;
				}else{
				 	var proto = schema && schema.prototype; // and if has a prototype
					if(proto){
						// if the schema defines a prototype, that needs to be the prototype of the object
						F.prototype = proto;
						target = new F();
					}
				}
				index[id] = target; // add the prefix, set _id, and index it
				if(timeStamps){
					timeStamps[id] = args.time;
				}
			}
			while(schema){
				var properties = schema.properties;
				if(properties){
					for(i in it){
						var propertyDefinition = properties[i];
						if(propertyDefinition && propertyDefinition.format == 'date-time' && typeof it[i] == 'string'){
							it[i] = dojo.date.stamp.fromISOString(it[i]);
						}
					}
				}
				schema = schema["extends"];
			}
			var length = it.length;
			for(i in it){
				if(i==length){
					break;
				}
				if(it.hasOwnProperty(i)){
					val=it[i];
					if((typeof val =='object') && val && !(val instanceof Date) && i != '__parent'){
						ref=val[refAttribute] || (idAsRef && val[idAttribute]);
						if(!ref || !val.__parent){
							if(it != reWalk){
								val.__parent = target;
							}
						}
						if(ref){ // a reference was found
							// make sure it is a safe reference
							delete it[i];// remove the property so it doesn't resolve to itself in the case of id.propertyName lazy values
							var path = ref.toString().replace(/(#)([^\.\[])/,'$1.$2').match(/(^([^\[]*\/)?[^#\.\[]*)#?([\.\[].*)?/); // divide along the path
							if(index[(prefix + ref).replace(pathResolveRegex,'$2$3')]){
								ref = index[(prefix + ref).replace(pathResolveRegex,'$2$3')];
							}else if((ref = (path[1]=='$' || path[1]=='this' || path[1]=='') ? root : index[(prefix + path[1]).replace(pathResolveRegex,'$2$3')])){  // a $ indicates to start with the root, otherwise start with an id
								// if there is a path, we will iterate through the path references
								if(path[3]){
									path[3].replace(/(\[([^\]]+)\])|(\.?([^\.\[]+))/g,function(t,a,b,c,d){
										ref = ref && ref[b ? b.replace(/[\"\'\\]/,'') : d];
									});
								}
							}
							if(ref){
								val = ref;
							}else{
								// otherwise, no starting point was found (id not found), if stop is set, it does not exist, we have
								// unloaded reference, if stop is not set, it may be in a part of the graph not walked yet,
								// we will wait for the second loop
								if(!stop){
									var rewalking;
									if(!rewalking){
										reWalk.push(target); // we need to rewalk it to resolve references
									}
									rewalking = true; // we only want to add it once
									val = walk(val, false, val[refAttribute], true, propertyDefinition);
									// create a lazy loaded object
									val._loadObject = args.loader;
								}
							}
						}else{
							if(!stop){ // if we are in stop, that means we are in the second loop, and we only need to check this current one,
								// further walking may lead down circular loops
								val = walk(
									val,
									reWalk==it,
									id === undefined ? undefined : addProp(id, i), // the default id to use
									false,
									propertyDefinition,
									// if we have an existing object child, we want to
									// maintain it's identity, so we pass it as the default object
									target != it && typeof target[i] == 'object' && target[i]
								);
							}
						}
					}
					it[i] = val;
					if(target!=it && !target.__isDirty){// do updates if we are updating an existing object and it's not dirty
						var old = target[i];
						target[i] = val; // only update if it changed
						if(update && val !== old && // see if it is different
								!target._loadObject && // no updates if we are just lazy loading
								!(i.charAt(0) == '_' && i.charAt(1) == '_') && i != "$ref" &&
								!(val instanceof Date && old instanceof Date && val.getTime() == old.getTime()) && // make sure it isn't an identical date
								!(typeof val == 'function' && typeof old == 'function' && val.toString() == old.toString()) && // make sure it isn't an indentical function
								index.onUpdate){
							index.onUpdate(target,i,old,val); // call the listener for each update
						}
					}
				}
			}
	
			if(update && (idAttribute in it || target instanceof Array)){
				// this means we are updating with a full representation of the object, we need to remove deleted
				for(i in target){
					if(!target.__isDirty && target.hasOwnProperty(i) && !it.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_') && !(target instanceof Array && isNaN(i))){
						if(index.onUpdate && i != "_loadObject" && i != "_idAttr"){
							index.onUpdate(target,i,target[i],undefined); // call the listener for each update
						}
						delete target[i];
						while(target instanceof Array && target.length && target[target.length-1] === undefined){
							// shorten the target if necessary
							target.length--;
						}
					}
				}
			}else{
				if(index.onLoad){
					index.onLoad(target);
				}
			}
			return target;
		}
		if(root && typeof root == 'object'){
			root = walk(root,false,args.defaultId, true); // do the main walk through
			walk(reWalk,false); // re walk any parts that were not able to resolve references on the first round
		}
		return root;
	},


	fromJson: function(/*String*/ str,/*Object?*/ args){
	// summary:
	// 		evaluates the passed string-form of a JSON object.
	//
	// str:
	//		a string literal of a JSON item, for instance:
	//			'{ "foo": [ "bar", 1, { "baz": "thud" } ] }'
	// args: See resolveJson
	//
	// return:
	//		An object, the result of the evaluation
		function ref(target){ // support call styles references as well
			var refObject = {};
			refObject[this.refAttribute] = target;
			return refObject;
		}
		try{
			var root = eval('(' + str + ')'); // do the eval
		}catch(e){
			throw new SyntaxError("Invalid JSON string: " + e.message + " parsing: "+ str);
		}
		if(root){
			return this.resolveJson(root, args);
		}
		return root;
	},
	
	toJson: function(/*Object*/ it, /*Boolean?*/ prettyPrint, /*Object?*/ idPrefix, /*Object?*/ indexSubObjects){
		// summary:
		//		Create a JSON serialization of an object.
		//		This has support for referencing, including circular references, duplicate references, and out-of-message references
		// 		id and path-based referencing is supported as well and is based on http://www.json.com/2007/10/19/json-referencing-proposal-and-library/.
		//
		// it:
		//		an object to be serialized.
		//
		// prettyPrint:
		//		if true, we indent objects and arrays to make the output prettier.
		//		The variable dojo.toJsonIndentStr is used as the indent string
		//		-- to use something other than the default (tab),
		//		change that variable before calling dojo.toJson().
		//
		// idPrefix: The prefix that has been used for the absolute ids
		//
		// return:
		//		a String representing the serialized version of the passed object.
		var useRefs = this._useRefs;
		var addProp = this._addProp;
		var refAttribute = this.refAttribute;
		idPrefix = idPrefix || ''; // the id prefix for this context
		var paths={};
		var generated = {};
		function serialize(it,path,_indentStr){
			if(typeof it == 'object' && it){
				var value;
				if(it instanceof Date){ // properly serialize dates
					return '"' + dojo.date.stamp.toISOString(it,{zulu:true}) + '"';
				}
				var id = it.__id;
				if(id){ // we found an identifiable object, we will just serialize a reference to it... unless it is the root
					if(path != '#' && ((useRefs && !id.match(/#/)) || paths[id])){
						var ref = id;
						if(id.charAt(0)!='#'){
							if(it.__clientId == id){
								ref = "cid:" + id;
							}else if(id.substring(0, idPrefix.length) == idPrefix){ // see if the reference is in the current context
								// a reference with a prefix matching the current context, the prefix should be removed
								ref = id.substring(idPrefix.length);
							}else{
								// a reference to a different context, assume relative url based referencing
								ref = id;
							}
						}
						var refObject = {};
						refObject[refAttribute] = ref;
						return serialize(refObject,'#');
					}
					path = id;
				}else{
					it.__id = path; // we will create path ids for other objects in case they are circular
					generated[path] = it;
				}
				paths[path] = it;// save it here so they can be deleted at the end
				_indentStr = _indentStr || "";
				var nextIndent = prettyPrint ? _indentStr + dojo.toJsonIndentStr : "";
				var newLine = prettyPrint ? "\n" : "";
				var sep = prettyPrint ? " " : "";
	
				if(it instanceof Array){
					var res = dojo.map(it, function(obj,i){
						var val = serialize(obj, addProp(path, i), nextIndent);
						if(typeof val != "string"){
							val = "undefined";
						}
						return newLine + nextIndent + val;
					});
					return "[" + res.join("," + sep) + newLine + _indentStr + "]";
				}
	
				var output = [];
				for(var i in it){
					if(it.hasOwnProperty(i)){
						var keyStr;
						if(typeof i == "number"){
							keyStr = '"' + i + '"';
						}else if(typeof i == "string" && (i.charAt(0) != '_' || i.charAt(1) != '_')){
							// we don't serialize our internal properties __id and __clientId
							keyStr = dojo._escapeString(i);
						}else{
							// skip non-string or number keys
							continue;
						}
						var val = serialize(it[i],addProp(path, i),nextIndent);
						if(typeof val != "string"){
							// skip non-serializable values
							continue;
						}
						output.push(newLine + nextIndent + keyStr + ":" + sep + val);
					}
				}
				return "{" + output.join("," + sep) + newLine + _indentStr + "}";
			}else if(typeof it == "function" && dojox.json.ref.serializeFunctions){
				return it.toString();
			}
	
			return dojo.toJson(it); // use the default serializer for primitives
		}
		var json = serialize(it,'#','');
		if(!indexSubObjects){
			for(var i in generated)  {// cleanup the temporary path-generated ids
				delete generated[i].__id;
			}
		}
		return json;
	},
	_addProp: function(id, prop){
		return id + (id.match(/#/) ? id.length == 1 ? '' : '.' : '#') + prop;
	},
	//	refAttribute: String
	//		This indicates what property is the reference property. This acts like the idAttribute
	// 		except that this is used to indicate the current object is a reference or only partially
	// 		loaded. This defaults to "$ref".
	refAttribute: "$ref",
	_useRefs: false,
	serializeFunctions: false
};
});

},
'dojox/data/AtomReadStore':function(){
define("dojox/data/AtomReadStore", ["dojo", "dojox", "dojo/data/util/filter", "dojo/data/util/simpleFetch", "dojo/date/stamp"], function(dojo, dojox) {
dojo.experimental("dojox.data.AtomReadStore");

dojo.declare("dojox.data.AtomReadStore", null, {
	//	summary:
	//		A read only data store for Atom XML based services or documents
	//	description:
	//		A data store for Atom XML based services or documents.	This store is still under development
	//		and doesn't support wildcard filtering yet.	Attribute filtering is limited to category or id.

	constructor: function(/* object */ args){
		//	summary:
		//		Constructor for the AtomRead store.
		//	args:
		//		An anonymous object to initialize properties.	It expects the following values:
		//		url:			The url to a service or an XML document that represents the store
		//		unescapeHTML:	A boolean to specify whether or not to unescape HTML text
		//		sendQuery:		A boolean indicate to add a query string to the service URL

		if(args){
			this.url = args.url;
			this.rewriteUrl = args.rewriteUrl;
			this.label = args.label || this.label;
			this.sendQuery = (args.sendQuery || args.sendquery || this.sendQuery);
			this.unescapeHTML = args.unescapeHTML;
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
						}
		}
		if(!this.url){
			throw new Error("AtomReadStore: a URL must be specified when creating the data store");
		}
	},

	//Values that may be set by the parser.
	//Ergo, have to be instantiated to something
	//So the parser knows how to set them.
	url: "",

	label: "title",

	sendQuery: false,

	unescapeHTML: false,

	//Configurable preventCache option for the URL.
	urlPreventCache: false,

	/* dojo.data.api.Read */

	getValue: function(/* item */ item, /* attribute || attribute-name-string */ attribute, /* value? */ defaultValue){
		//	summary:
		//		Return an attribute value
		//	description:
		//		'item' must be an instance of an object created by the AtomReadStore instance.
		//		Accepted attributes are id, subtitle, title, summary, content, author, updated,
		//		published, category, link and alternate
		//	item:
		//		An item returned by a call to the 'fetch' method.
		//	attribute:
		//		A attribute of the Atom Entry
		//	defaultValue:
		//		A default value
		//	returns:
		//		An attribute value found, otherwise 'defaultValue'
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		this._initItem(item);
		attribute = attribute.toLowerCase();
		//If the attribute has previously been retrieved, then return it
		if(!item._attribs[attribute] && !item._parsed){
			this._parseItem(item);
			item._parsed = true;
		}
		var retVal = item._attribs[attribute];

		if(!retVal && attribute == "summary"){
			var content = this.getValue(item, "content");
			var regexp = new RegExp("/(<([^>]+)>)/g", "i");
			var text = content.text.replace(regexp,"");
			retVal = {
				text: text.substring(0, Math.min(400, text.length)),
				type: "text"
			};
			item._attribs[attribute] = retVal;
		}

		if(retVal && this.unescapeHTML){
			if((attribute == "content" || attribute == "summary" || attribute == "subtitle") && !item["_"+attribute+"Escaped"]){
				retVal.text = this._unescapeHTML(retVal.text);
				item["_"+attribute+"Escaped"] = true;
			}
		}
		return retVal ? dojo.isArray(retVal) ? retVal[0]: retVal : defaultValue;
	},

	getValues: function(/* item */ item, /* attribute || attribute-name-string */ attribute){
		//	summary:
		//		Return an attribute value
		//	description:
		//		'item' must be an instance of an object created by the AtomReadStore instance.
		//		Accepted attributes are id, subtitle, title, summary, content, author, updated,
		//		published, category, link and alternate
		//	item:
		//		An item returned by a call to the 'fetch' method.
		//	attribute:
		//		A attribute of the Atom Entry
		//	returns:
		//		An array of values for the attribute value found, otherwise 'defaultValue'
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		this._initItem(item);
		attribute = attribute.toLowerCase();
		//If the attribute has previously been retrieved, then return it
		if(!item._attribs[attribute]){
			this._parseItem(item);
		}
		var retVal = item._attribs[attribute];
		return retVal ? ((retVal.length !== undefined && typeof(retVal) !== "string") ? retVal : [retVal]) : undefined;
	},

	getAttributes: function(/* item */ item){
		//	summary:
		//		Return an array of attribute names
		// 	description:
		//		'item' must be have been created by the AtomReadStore instance.
		//		tag names of child elements and XML attribute names of attributes
		//		specified to the element are returned along with special attribute
		//		names applicable to the element including "tagName", "childNodes"
		//		if the element has child elements, "text()" if the element has
		//		child text nodes, and attribute names in '_attributeMap' that match
		//		the tag name of the element.
		//	item:
		//		An XML element
		//	returns:
		//		An array of attributes found
		this._assertIsItem(item);
		if(!item._attribs){
			this._initItem(item);
			this._parseItem(item);
		}
		var attrNames = [];
		for(var x in item._attribs){
			attrNames.push(x);
		}
		return attrNames; //array
	},

	hasAttribute: function(/* item */ item, /* attribute || attribute-name-string */ attribute){
		//	summary:
		//		Check whether an element has the attribute
		//	item:
		//		'item' must be created by the AtomReadStore instance.
		//	attribute:
		//		An attribute of an Atom Entry item.
		//	returns:
		//		True if the element has the attribute, otherwise false
		return (this.getValue(item, attribute) !== undefined); //boolean
	},

	containsValue: function(/* item */ item, /* attribute || attribute-name-string */ attribute, /* anything */ value){
		//	summary:
		//		Check whether the attribute values contain the value
		//	item:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//	attribute:
		//		A tag name of a child element, An XML attribute name or one of
		//		special names
		//	returns:
		//		True if the attribute values contain the value, otherwise false
		var values = this.getValues(item, attribute);
		for(var i = 0; i < values.length; i++){
			if((typeof value === "string")){
				if(values[i].toString && values[i].toString() === value){
					return true;
				}
			}else if(values[i] === value){
				return true; //boolean
			}
		}
		return false;//boolean
	},

	isItem: function(/* anything */ something){
		//	summary:
		//		Check whether the object is an item (XML element)
		//	item:
		//		An object to check
		// 	returns:
		//		True if the object is an XML element, otherwise false
		if(something && something.element && something.store && something.store === this){
			return true; //boolean
		}
		return false; //boolran
	},

	isItemLoaded: function(/* anything */ something){
		//	summary:
		//		Check whether the object is an item (XML element) and loaded
		//	item:
		//		An object to check
		//	returns:
		//		True if the object is an XML element, otherwise false
		return this.isItem(something); //boolean
	},

	loadItem: function(/* object */ keywordArgs){
		//	summary:
		//		Load an item (XML element)
		//	keywordArgs:
		//		object containing the args for loadItem.	See dojo.data.api.Read.loadItem()
	},

	getFeatures: function(){
		//	summary:
		//		Return supported data APIs
		//	returns:
		//		"dojo.data.api.Read" and "dojo.data.api.Write"
		var features = {
			"dojo.data.api.Read": true
		};
		return features; //array
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		if((this.label !== "") && this.isItem(item)){
			var label = this.getValue(item,this.label);
			if(label && label.text){
				return label.text;
			}else if(label){
				return label.toString();
			}else{
				return undefined;
			}
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		if(this.label !== ""){
			return [this.label]; //array
		}
		return null; //null
	},

	getFeedValue: function(attribute, defaultValue){
		// summary:
		//		Non-API method for retrieving values regarding the Atom feed,
		//		rather than the Atom entries.
		var values = this.getFeedValues(attribute, defaultValue);
		if(dojo.isArray(values)){
			return values[0];
		}
		return values;
	},

	getFeedValues: function(attribute, defaultValue){
		// summary:
		//		Non-API method for retrieving values regarding the Atom feed,
		//		rather than the Atom entries.
		if(!this.doc){
			return defaultValue;
		}
		if(!this._feedMetaData){
			this._feedMetaData = {
				element: this.doc.getElementsByTagName("feed")[0],
				store: this,
				_attribs: {}
			};
			this._parseItem(this._feedMetaData);
		}
		return this._feedMetaData._attribs[attribute] || defaultValue;
	},

	_initItem: function(item){
		// summary:
		//		Initializes an item before it can be parsed.
		if(!item._attribs){
			item._attribs = {};
		}
	},

	_fetchItems: function(request, fetchHandler, errorHandler){
		// summary:
		//		Retrieves the items from the Atom XML document.
		var url = this._getFetchUrl(request);
		if(!url){
			errorHandler(new Error("No URL specified."));
			return;
		}
		var localRequest = (!this.sendQuery ? request : null); // use request for _getItems()

		var _this = this;
		var docHandler = function(data){
			_this.doc = data;
			var items = _this._getItems(data, localRequest);
			var query = request.query;
			if(query){
				if(query.id){
					items = dojo.filter(items, function(item){
						return (_this.getValue(item, "id") == query.id);
					});
				}else if(query.category){
					items = dojo.filter(items, function(entry){
						var cats = _this.getValues(entry, "category");
						if(!cats){
							return false;
						}
						return dojo.some(cats, "return item.term=='"+query.category+"'");
					});
				}
			}

			if(items && items.length > 0){
				fetchHandler(items, request);
			}else{
				fetchHandler([], request);
			}
		};

		if(this.doc){
			docHandler(this.doc);
		}else{
			var getArgs = {
				url: url,
				handleAs: "xml",
				preventCache: this.urlPreventCache
			};
			var getHandler = dojo.xhrGet(getArgs);
			getHandler.addCallback(docHandler);

			getHandler.addErrback(function(data){
				errorHandler(data, request);
			});
		}
	},

	_getFetchUrl: function(request){
		if(!this.sendQuery){
			return this.url;
		}
		var query = request.query;
		if(!query){
			return this.url;
		}
		if(dojo.isString(query)){
			return this.url + query;
		}
		var queryString = "";
		for(var name in query){
			var value = query[name];
			if(value){
				if(queryString){
					queryString += "&";
				}
				queryString += (name + "=" + value);
			}
		}
		if(!queryString){
			return this.url;
		}
		//Check to see if the URL already has query params or not.
		var fullUrl = this.url;
		if(fullUrl.indexOf("?") < 0){
			fullUrl += "?";
		}else{
			fullUrl += "&";
		}
		return fullUrl + queryString;
	},

	_getItems: function(document, request){
		// summary:
		//		Parses the document in a first pass
		if(this._items){
			return this._items;
		}
		var items = [];
		var nodes = [];

		if(document.childNodes.length < 1){
			this._items = items;
			console.log("dojox.data.AtomReadStore: Received an invalid Atom document. Check the content type header");
			return items;
		}

		var feedNodes = dojo.filter(document.childNodes, "return item.tagName && item.tagName.toLowerCase() == 'feed'");

		var query = request.query;

		if(!feedNodes || feedNodes.length != 1){
			console.log("dojox.data.AtomReadStore: Received an invalid Atom document, number of feed tags = " + (feedNodes? feedNodes.length : 0));
			return items;
		}

		nodes = dojo.filter(feedNodes[0].childNodes, "return item.tagName && item.tagName.toLowerCase() == 'entry'");

		if(request.onBegin){
			request.onBegin(nodes.length, this.sendQuery ? request : {});
		}

		for(var i = 0; i < nodes.length; i++){
			var node = nodes[i];
			if(node.nodeType != 1 /*ELEMENT_NODE*/){
				continue;
			}
			items.push(this._getItem(node));
		}
		this._items = items;
		return items;
	},

	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		 //	summary:
		 //		See dojo.data.api.Read.close()
	},

/* internal API */

	_getItem: function(element){
		return {
			element: element,
			store: this
		};
	},

	_parseItem: function(item){
		var attribs = item._attribs;
		var _this = this;
		var text, type;

		function getNodeText(node){
			var txt = node.textContent || node.innerHTML || node.innerXML;
			if(!txt && node.childNodes[0]){
				var child = node.childNodes[0];
				if(child && (child.nodeType == 3 || child.nodeType == 4)){
					txt = node.childNodes[0].nodeValue;
				}
			}
			return txt;
		}
		function parseTextAndType(node){
			return {text: getNodeText(node),type: node.getAttribute("type")};
		}
		dojo.forEach(item.element.childNodes, function(node){
			var tagName = node.tagName ? node.tagName.toLowerCase() : "";
			switch(tagName){
				case "title":
					attribs[tagName] = {
						text: getNodeText(node),
						type: node.getAttribute("type")
					}; break;
				case "subtitle":
				case "summary":
				case "content":
					attribs[tagName] = parseTextAndType(node);
					break;
				case "author":
					var nameNode ,uriNode;
					dojo.forEach(node.childNodes, function(child){
						if(!child.tagName){
							return;
						}
						switch(child.tagName.toLowerCase()){
							case "name":
								nameNode = child;
								break;
							case "uri":
								uriNode = child;
								break;
						}
					});
					var author = {};
					if(nameNode && nameNode.length == 1){
						author.name = getNodeText(nameNode[0]);
					}
					if(uriNode && uriNode.length == 1){
						author.uri = getNodeText(uriNode[0]);
					}
					attribs[tagName] = author;
					break;
				case "id":
					attribs[tagName] = getNodeText(node);
					break;
				case "updated":
					attribs[tagName] = dojo.date.stamp.fromISOString(getNodeText(node) );
					break;
				case "published":
					attribs[tagName] = dojo.date.stamp.fromISOString(getNodeText(node));
					break;
				case "category":
					if(!attribs[tagName]){
						attribs[tagName] = [];
					}
					attribs[tagName].push({scheme:node.getAttribute("scheme"), term: node.getAttribute("term")});
					break;
				case "link":
					if(!attribs[tagName]){
						attribs[tagName] = [];
					}
					var link = {
						rel: node.getAttribute("rel"),
						href: node.getAttribute("href"),
						type: node.getAttribute("type")};
					attribs[tagName].push(link);

					if(link.rel == "alternate"){
						attribs["alternate"] = link;
					}
					break;
				default:
					break;
			}
		});
	},

	_unescapeHTML : function(text){
		//Replace HTML character codes with their unencoded equivalents, e.g. &#8217; with '
		text = text.replace(/&#8217;/m , "'").replace(/&#8243;/m , "\"").replace(/&#60;/m,">").replace(/&#62;/m,"<").replace(/&#38;/m,"&");
		return text;
	},

	_assertIsItem: function(/* item */ item){
		//	summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.AtomReadStore: Invalid item argument.");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.AtomReadStore: Invalid attribute argument.");
		}
	}
});
dojo.extend(dojox.data.AtomReadStore,dojo.data.util.simpleFetch);

return dojox.data.AtomReadStore;
});

},
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
'dojox/data/PicasaStore':function(){
define("dojox/data/PicasaStore", ["dojo/_base/lang","dojo/_base/declare", "dojo/_base/connect", "dojo/io/script", "dojo/data/util/simpleFetch", "dojo/date/stamp"], 
  function(lang, declare, connect, scriptIO, simpleFetch, dateStamp) {

var PicasaStore = declare("dojox.data.PicasaStore", null, {
	constructor: function(/*Object*/args){
		//	summary:
		//		Initializer for the PicasaStore store.
		//	description:
		//		The PicasaStore is a Datastore interface to one of the basic services
		//		of the Picasa service, the public photo feed.  This does not provide
		//		access to all the services of Picasa.
		//		This store cannot do * and ? filtering as the picasa service
		//		provides no interface for wildcards.
		if(args && args.label){
			this.label = args.label;
		}
		if(args && "urlPreventCache" in args){
			this.urlPreventCache = args.urlPreventCache?true:false;
		}
		if(args && "maxResults" in args){
			this.maxResults = parseInt(args.maxResults);
			if(!this.maxResults){
				this.maxResults = 20;
			}
		}
	},

	_picasaUrl: "http://picasaweb.google.com/data/feed/api/all",

	_storeRef: "_S",

	//label: string
	//The attribute to use from the picasa item as its label.
	label: "title",

	//urlPreventCache: boolean
	//Flag denoting if preventCache should be passed to io.script.
	urlPreventCache: false,

	//maxResults:  Define out how many results to return for a fetch.
	maxResults: 20,

	_assertIsItem: function(/* item */ item){
		//	summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.PicasaStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.PicasaStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	getFeatures: function(){
		//	summary:
		//      See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true
		};
	},

	getValue: function(item, attribute, defaultValue){
		//	summary:
		//      See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		//	summary:
		//      See dojo.data.api.Read.getAttributes()
		 return ["id", "published", "updated", "category", "title$type", "title",
			 "summary$type", "summary", "rights$type", "rights", "link", "author",
			 "gphoto$id", "gphoto$name", "location", "imageUrlSmall", "imageUrlMedium",
			 "imageUrl", "datePublished", "dateTaken","description"];
	},

	hasAttribute: function(item, attribute){
		//	summary:
		//      See dojo.data.api.Read.hasAttributes()
		if(this.getValue(item,attribute)){
			return true;
		}
		return false;
	},

	isItemLoaded: function(item){
		 //	summary:
		 //      See dojo.data.api.Read.isItemLoaded()
		 return this.isItem(item);
	},

	loadItem: function(keywordArgs){
		//	summary:
		//      See dojo.data.api.Read.loadItem()
	},

	getLabel: function(item){
		//	summary:
		//      See dojo.data.api.Read.getLabel()
		return this.getValue(item,this.label);
	},
	
	getLabelAttributes: function(item){
		//	summary:
		//      See dojo.data.api.Read.getLabelAttributes()
		return [this.label];
	},

	containsValue: function(item, attribute, value){
		//	summary:
		//      See dojo.data.api.Read.containsValue()
		var values = this.getValues(item,attribute);
		for(var i = 0; i < values.length; i++){
			if(values[i] === value){
				return true;
			}
		}
		return false;
	},

	getValues: function(item, attribute){
		//	summary:
		//      See dojo.data.api.Read.getValue()

		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		if(attribute === "title"){
			return [this._unescapeHtml(item.title)];
		}else if(attribute === "author"){
			return [this._unescapeHtml(item.author[0].name)];
		}else if(attribute === "datePublished"){
			return [dateAtamp.fromISOString(item.published)];
		}else if(attribute === "dateTaken"){
			return [dateStamp.fromISOString(item.published)];
		}else if(attribute === "updated"){
			return [dateStamp.fromISOString(item.updated)];
		}else if(attribute === "imageUrlSmall"){
			return [item.media.thumbnail[1].url];
		}else if(attribute === "imageUrl"){
			return [item.content$src];
		}else if(attribute === "imageUrlMedium"){
			return [item.media.thumbnail[2].url];
		}else if(attribute === "link"){
			return [item.link[1]];
		}else if(attribute === "tags"){
			return item.tags.split(" ");
		}else if(attribute === "description"){
			return [this._unescapeHtml(item.summary)];
		}
		return [];
	},

	isItem: function(item){
		//	summary:
		//      See dojo.data.api.Read.isItem()
		if(item && item[this._storeRef] === this){
			return true;
		}
		return false;
	},
	
	close: function(request){
		//	summary:
		//      See dojo.data.api.Read.close()
	},

	_fetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Fetch picasa items that match to a query
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error

		if(!request.query){
			request.query={};
		}

		//Build up the content to send the request for.
		var content = {alt: "jsonm", pp: "1", psc: "G"};

		content['start-index'] = "1";
		if(request.query.start){
			content['start-index'] = request.query.start;
		}
		if(request.query.tags){
			content.q = request.query.tags;
		}
		if(request.query.userid){
			content.uname = request.query.userid;
		}
		if(request.query.userids){
			content.ids = request.query.userids;
		}
		if(request.query.lang){
			content.hl = request.query.lang;
		}
		content['max-results'] = this.maxResults;

		//Linking this up to Picasa is a JOY!
		var self = this;
		var handle = null;
		var myHandler = function(data){
			if(handle !== null){
				connect.disconnect(handle);
			}

			//Process the items...
			fetchHandler(self._processPicasaData(data), request);
		};
		var getArgs = {
			url: this._picasaUrl,
			preventCache: this.urlPreventCache,
			content: content,
			callbackParamName: 'callback',
			handle: myHandler
		};
		var deferred = scriptIO.get(getArgs);
		
		deferred.addErrback(function(error){
			connect.disconnect(handle);
			errorHandler(error, request);
		});
	},

	_processPicasaData: function(data){
		var items = [];
		if(data.feed){
			items = data.feed.entry;
			//Add on the store ref so that isItem can work.
			for(var i = 0; i < items.length; i++){
				var item = items[i];
				item[this._storeRef] = this;
			}
		}
		return items;
	},

	_unescapeHtml: function(str){
		// summary: Utility function to un-escape XML special characters in an HTML string.
		// description: Utility function to un-escape XML special characters in an HTML string.
		// str: String.
		//   The string to un-escape
		// returns: HTML String converted back to the normal text (unescaped) characters (<,>,&, ", etc,).
		//
		//TODO: Check to see if theres already compatible escape() in dojo.string or dojo.html
		if(str){
			str = str.replace(/&amp;/gm, "&").replace(/&lt;/gm, "<").replace(/&gt;/gm, ">").replace(/&quot;/gm, "\"");
			str = str.replace(/&#39;/gm, "'");
		}
		return str;
	}
});
lang.extend(PicasaStore, simpleFetch);

return PicasaStore;

});

},
'dojox/data/ServiceStore':function(){
define("dojox/data/ServiceStore", ["dojo/_base/declare", "dojo/_base/lang", "dojo/_base/array"], 
  function(declare, lang, array) {

// note that dojox.rpc.Service is not required, you can create your own services

// A ServiceStore is a readonly data store that provides a data.data interface to an RPC service.
// var myServices = new dojox.rpc.Service(dojo.moduleUrl("dojox.rpc.tests.resources", "test.smd"));
// var serviceStore = new dojox.data.ServiceStore({service:myServices.ServiceStore});
//
// The ServiceStore also supports lazy loading. References can be made to objects that have not been loaded.
//	For example if a service returned:
// {"name":"Example","lazyLoadedObject":{"$ref":"obj2"}}
//
// And this object has accessed using the dojo.data API:
// var obj = serviceStore.getValue(myObject,"lazyLoadedObject");
// The object would automatically be requested from the server (with an object id of "obj2").
//

return declare("dojox.data.ServiceStore",
	// ClientFilter is intentionally not required, ServiceStore does not need it, and is more
	// lightweight without it, but if it is provided, the ServiceStore will use it.
	lang.getObject("dojox.data.ClientFilter", 0)||null,{
		service: null,
		constructor: function(options){
			//summary:
			//		ServiceStore constructor, instantiate a new ServiceStore
			// 		A ServiceStore can be configured from a JSON Schema. Queries are just
			// 		passed through to the underlying services
			//
			// options:
			// 		Keyword arguments
			// The *schema* parameter
			//		This is a schema object for this store. This should be JSON Schema format.
			//
			// The *service* parameter
			// 		This is the service object that is used to retrieve lazy data and save results
			// 		The function should be directly callable with a single parameter of an object id to be loaded
			//
			// The *idAttribute* parameter
			//		Defaults to 'id'. The name of the attribute that holds an objects id.
			//		This can be a preexisting id provided by the server.
			//		If an ID isn't already provided when an object
			//		is fetched or added to the store, the autoIdentity system
			//		will generate an id for it and add it to the index.
			//
			// The *estimateCountFactor* parameter
			// 		This parameter is used by the ServiceStore to estimate the total count. When
			//		paging is indicated in a fetch and the response includes the full number of items
			//	 	requested by the fetch's count parameter, then the total count will be estimated
			//		to be estimateCountFactor multiplied by the provided count. If this is 1, then it is assumed that the server
			//		does not support paging, and the response is the full set of items, where the
			// 		total count is equal to the numer of items returned. If the server does support
			//		paging, an estimateCountFactor of 2 is a good value for estimating the total count
			//		It is also possible to override _processResults if the server can provide an exact
			// 		total count.
			//
			// The *syncMode* parameter
			//		Setting this to true will set the store to using synchronous calls by default.
			//		Sync calls return their data immediately from the calling function, so
			//		callbacks are unnecessary. This will only work with a synchronous capable service.
			//
			// description:
			//		ServiceStore can do client side caching and result set updating if
			// 		dojox.data.ClientFilter is loaded. Do this add:
			//	|	dojo.require("dojox.data.ClientFilter")
			//		prior to loading the ServiceStore (ClientFilter must be loaded before ServiceStore).
			//		To utilize client side filtering with a subclass, you can break queries into
			//		client side and server side components by putting client side actions in
			//		clientFilter property in fetch calls. For example you could override fetch:
			//	|	fetch: function(args){
				//	|		// do the sorting and paging on the client side
	 			//	|		args.clientFilter = {start:args.start, count: args.count, sort: args.sort};
	 			//	|		// args.query will be passed to the service object for the server side handling
	 			//	|		return this.inherited(arguments);
			//	|	}
			//		When extending this class, if you would like to create lazy objects, you can follow
			//		the example from dojox.data.tests.stores.ServiceStore:
			// |	var lazyItem = {
			// |		_loadObject: function(callback){
			// |			this.name="loaded";
			// |			delete this._loadObject;
			// |			callback(this);
			// |		}
			// |	};
			//setup a byId alias to the api call
			this.byId=this.fetchItemByIdentity;
			this._index = {};
			// if the advanced json parser is enabled, we can pass through object updates as onSet events
			if(options){
				lang.mixin(this,options);
			}
			// We supply a default idAttribute for parser driven construction, but if no id attribute
			//	is supplied, it should be null so that auto identification takes place properly
			this.idAttribute = (options && options.idAttribute) || (this.schema && this.schema._idAttr);
		},
		schema: null,
		idAttribute: "id",
		labelAttribute: "label",
		syncMode: false,
		estimateCountFactor: 1,
		getSchema: function(){
			return this.schema;
		},

		loadLazyValues:true,

		getValue: function(/*Object*/ item, /*String*/property, /*value?*/defaultValue){
			// summary:
			//	Gets the value of an item's 'property'
			//
			//	item:
			//		The item to get the value from
			//	property:
			//		property to look up value for
			//	defaultValue:
			//		the default value

			var value = item[property];
			return value || // return the plain value since it was found;
						(property in item ? // a truthy value was not found, see if we actually have it
							value : // we do, so we can return it
							item._loadObject ? // property was not found, maybe because the item is not loaded, we will try to load it synchronously so we can get the property
								(dojox.rpc._sync = true) && arguments.callee.call(this,dojox.data.ServiceStore.prototype.loadItem({item:item}) || {}, property, defaultValue) : // load the item and run getValue again
								defaultValue);// not in item -> return default value
		},
		getValues: function(item, property){
			// summary:
			//		Gets the value of an item's 'property' and returns
			//		it.	If this value is an array it is just returned,
			//		if not, the value is added to an array and that is returned.
			//
			//	item: /* object */
			//	property: /* string */
			//		property to look up value for

			var val = this.getValue(item,property);
			return val instanceof Array ? val : val === undefined ? [] : [val];
		},

		getAttributes: function(item){
			// summary:
			//	Gets the available attributes of an item's 'property' and returns
			//	it as an array.
			//
			//	item: /* object */

			var res = [];
			for(var i in item){
				if(item.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_')){
					res.push(i);
				}
			}
			return res;
		},

		hasAttribute: function(item,attribute){
			// summary:
			//		Checks to see if item has attribute
			//
			//	item: /* object */
			//	attribute: /* string */
			return attribute in item;
		},

		containsValue: function(item, attribute, value){
			// summary:
			//		Checks to see if 'item' has 'value' at 'attribute'
			//
			//	item: /* object */
			//	attribute: /* string */
			//	value: /* anything */
			return array.indexOf(this.getValues(item,attribute),value) > -1;
		},


		isItem: function(item){
			// summary:
			//		Checks to see if the argument is an item
			//
			//	item: /* object */
			//	attribute: /* string */

			// we have no way of determining if it belongs, we just have object returned from
			// 	service queries
			return (typeof item == 'object') && item && !(item instanceof Date);
		},

		isItemLoaded: function(item){
			// summary:
			//		Checks to see if the item is loaded.
			//
			//		item: /* object */

			return item && !item._loadObject;
		},

		loadItem: function(args){
			// summary:
			// 		Loads an item and calls the callback handler. Note, that this will call the callback
			// 		handler even if the item is loaded. Consequently, you can use loadItem to ensure
			// 		that an item is loaded is situations when the item may or may not be loaded yet.
			// 		If you access a value directly through property access, you can use this to load
			// 		a lazy value as well (doesn't need to be an item).
			//
			//	example:
			//		store.loadItem({
			//			item: item, // this item may or may not be loaded
			//			onItem: function(item){
			// 				// do something with the item
			//			}
			//		});

			var item;
			if(args.item._loadObject){
				args.item._loadObject(function(result){
					item = result; // in synchronous mode this can allow loadItem to return the value
					delete item._loadObject;
					var func = result instanceof Error ? args.onError : args.onItem;
					if(func){
						func.call(args.scope, result);
					}
				});
			}else if(args.onItem){
				// even if it is already loaded, we will use call the callback, this makes it easier to
				// use when it is not known if the item is loaded (you can always safely call loadItem).
				args.onItem.call(args.scope, args.item);
			}
			return item;
		},
		_currentId : 0,
		_processResults : function(results, deferred){
			// this should return an object with the items as an array and the total count of
			// items (maybe more than currently in the result set).
			// for example:
			//	| {totalCount:10, items: [{id:1},{id:2}]}

			// index the results, assigning ids as necessary

			if(results && typeof results == 'object'){
				var id = results.__id;
				if(!id){// if it hasn't been assigned yet
					if(this.idAttribute){
						// use the defined id if available
						id = results[this.idAttribute];
					}else{
						id = this._currentId++;
					}
					if(id !== undefined){
						var existingObj = this._index[id];
						if(existingObj){
							for(var j in existingObj){
								delete existingObj[j]; // clear it so we can mixin
							}
							results = lang.mixin(existingObj,results);
						}
						results.__id = id;
						this._index[id] = results;
					}
				}
				for(var i in results){
					results[i] = this._processResults(results[i], deferred).items;
				}
				var count = results.length;
			}
			return {totalCount: deferred.request.count == count ? (deferred.request.start || 0) + count * this.estimateCountFactor : count, items: results};
		},
		close: function(request){
			return request && request.abort && request.abort();
		},
		fetch: function(args){
			// summary:
			//		See dojo.data.api.Read.fetch
			//
			// The *queryOptions.cache* parameter
			//		If true, indicates that the query result should be cached for future use. This is only available
			// 		if dojox.data.ClientFilter has been loaded before the ServiceStore
			//
			//	The *syncMode* parameter
			//		Indicates that the call should be fetch synchronously if possible (this is not always possible)
			//
			// The *clientFetch* parameter
			//		This is a fetch keyword argument for explicitly doing client side filtering, querying, and paging

			args = args || {};

			if("syncMode" in args ? args.syncMode : this.syncMode){
				dojox.rpc._sync = true;
			}
			var self = this;

			var scope = args.scope || self;
			var defResult = this.cachingFetch ? this.cachingFetch(args) : this._doQuery(args);
			defResult.request = args;
			defResult.addCallback(function(results){
				if(args.clientFetch){
					results = self.clientSideFetch({query:args.clientFetch,sort:args.sort,start:args.start,count:args.count},results);
				}
				var resultSet = self._processResults(results, defResult);
				results = args.results = resultSet.items;
				if(args.onBegin){
					args.onBegin.call(scope, resultSet.totalCount, args);
				}
				if(args.onItem){
					for(var i=0; i<results.length;i++){
						args.onItem.call(scope, results[i], args);
					}
				}
				if(args.onComplete){
					args.onComplete.call(scope, args.onItem ? null : results, args);
				}
				return results;
			});
			defResult.addErrback(args.onError && function(err){
				return args.onError.call(scope, err, args);
			});
			args.abort = function(){
				// abort the request
				defResult.cancel();
			};
			args.store = this;
			return args;
		},
		_doQuery: function(args){
			var query= typeof args.queryStr == 'string' ? args.queryStr : args.query;
			return this.service(query);
		},
		getFeatures: function(){
			// summary:
			// 		return the store feature set

			return {
				"dojo.data.api.Read": true,
				"dojo.data.api.Identity": true,
				"dojo.data.api.Schema": this.schema
			};
		},

		getLabel: function(item){
			// summary
			//		returns the label for an item. Just gets the "label" attribute.
			//
			return this.getValue(item,this.labelAttribute);
		},

		getLabelAttributes: function(item){
			// summary:
			//		returns an array of attributes that are used to create the label of an item
			return [this.labelAttribute];
		},

		//Identity API Support


		getIdentity: function(item){
			return item.__id;
		},

		getIdentityAttributes: function(item){
			// summary:
			//		returns the attributes which are used to make up the
			//		identity of an item.	Basically returns this.idAttribute

			return [this.idAttribute];
		},

		fetchItemByIdentity: function(args){
			// summary:
			//		fetch an item by its identity, by looking in our index of what we have loaded
			var item = this._index[(args._prefix || '') + args.identity];
			if(item){
				// the item exists in the index
				if(item._loadObject){
					// we have a handle on the item, but it isn't loaded yet, so we need to load it
					args.item = item;
					return this.loadItem(args);
				}else if(args.onItem){
					// it's already loaded, so we can immediately callback
					args.onItem.call(args.scope, item);
				}
			}else{
				// convert the different spellings
				return this.fetch({
						query: args.identity,
						onComplete: args.onItem,
						onError: args.onError,
						scope: args.scope
					}).results;
			}
			return item;
		}

	}
);
});

},
'dojox/data/util/JsonQuery':function(){
define("dojox/data/util/JsonQuery", ["dojo", "dojox"], function(dojo, dojox) {

// this is a mixin to convert object attribute queries to
// JSONQuery/JSONPath syntax to be sent to the server.
dojo.declare("dojox.data.util.JsonQuery", null, {
	useFullIdInQueries: false,
	_toJsonQuery: function(args, jsonQueryPagination){
		var first = true;
		var self = this;
		function buildQuery(path, query){
			var isDataItem = query.__id;
			if(isDataItem){
				// it is a reference to a persisted object, need to make it a query by id
				var newQuery = {};
				newQuery[self.idAttribute] = self.useFullIdInQueries ? query.__id : query[self.idAttribute];
				query = newQuery;
			}
			for(var i in query){
				// iterate through each property, adding them to the overall query
				var value = query[i];
				var newPath = path + (/^[a-zA-Z_][\w_]*$/.test(i) ? '.' + i : '[' + dojo._escapeString(i) + ']');
				if(value && typeof value == "object"){
					buildQuery(newPath, value);
				}else if(value!="*"){ // full wildcards can be ommitted
					jsonQuery += (first ? "" : "&") + newPath +
						((!isDataItem && typeof value == "string" && args.queryOptions && args.queryOptions.ignoreCase) ? "~" : "=") +
						 (self.simplifiedQuery ? encodeURIComponent(value) : dojo.toJson(value));
					first = false;
				}
			}
		}
		// performs conversion of Dojo Data query objects and sort arrays to JSONQuery strings
		if(args.query && typeof args.query == "object"){
			// convert Dojo Data query objects to JSONQuery
			var jsonQuery = "[?(";
			buildQuery("@", args.query);
			if(!first){
				// use ' instead of " for quoting in JSONQuery, and end with ]
				jsonQuery += ")]";
			}else{
				jsonQuery = "";
			}
			args.queryStr = jsonQuery.replace(/\\"|"/g,function(t){return t == '"' ? "'" : t;});
		}else if(!args.query || args.query == '*'){
			args.query = "";
		}
		
		var sort = args.sort;
		if(sort){
			// if we have a sort order, add that to the JSONQuery expression
			args.queryStr = args.queryStr || (typeof args.query == 'string' ? args.query : "");
			first = true;
			for(i = 0; i < sort.length; i++){
				args.queryStr += (first ? '[' : ',') + (sort[i].descending ? '\\' : '/') + "@[" + dojo._escapeString(sort[i].attribute) + "]";
				first = false;
			}
			args.queryStr += ']';
		}
		// this is optional because with client side paging JSONQuery doesn't yield the total count
		if(jsonQueryPagination && (args.start || args.count)){
			// pagination
			args.queryStr = (args.queryStr || (typeof args.query == 'string' ? args.query : "")) +
				'[' + (args.start || '') + ':' + (args.count ? (args.start || 0) + args.count : '') + ']';
		}
		if(typeof args.queryStr == 'string'){
			args.queryStr = args.queryStr.replace(/\\"|"/g,function(t){return t == '"' ? "'" : t;});
			return args.queryStr;
		}
		return args.query;
	},
	jsonQueryPagination: true,
	fetch: function(args){
		this._toJsonQuery(args, this.jsonQueryPagination);
		return this.inherited(arguments);
	},
	isUpdateable: function(){
		return true;
	},
	matchesQuery: function(item,request){
		request._jsonQuery = request._jsonQuery || dojox.json.query(this._toJsonQuery(request));
		return request._jsonQuery([item]).length;
	},
	clientSideFetch: function(/*Object*/ request,/*Array*/ baseResults){
		request._jsonQuery = request._jsonQuery || dojox.json.query(this._toJsonQuery(request));
		// we use client side paging function here instead of JSON Query because we must also determine the total count
		return this.clientSidePaging(request, request._jsonQuery(baseResults));
	},
	querySuperSet: function(argsSuper,argsSub){
		if(!argsSuper.query){
			return argsSub.query;
		}
		return this.inherited(arguments);
	}
	
});

return dojox.data.util.JsonQuery;
});

},
'dojox/data/GoogleSearchStore':function(){
define("dojox/data/GoogleSearchStore", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/window", "dojo/_base/query", 
		"dojo/dom-construct","dojo/io/script"], 
  function(dojo, lang, declare, winUtil, domQuery, domConstruct, scriptIO) {

dojo.experimental("dojox.data.GoogleSearchStore");

var SearchStore = declare("dojox.data.GoogleSearchStore",null,{
	//	summary:
	//		A data store for retrieving search results from Google.
	//		This data store acts as a base class for Google searches,
	//		and has a number of child data stores that implement different
	//		searches. This store defaults to searching the web, and is functionally
	//		identical to the dojox.data.GoogleWebSearchStore object.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>url - The URL for the item</li>
	//			<li>unescapedUrl - The URL for the item, with URL escaping. This is often more readable</li>
	//			<li>visibleUrl - The URL with no protocol specified.
	//			<li>cacheUrl - The URL to the copy of the document cached by Google
	//			<li>title - The page title in HTML format.</li>
	//			<li>titleNoFormatting - The page title in plain text</li>
	//			<li>content - A snippet of information about the page</li>
	//		</ul>
	//		The query accepts one parameter: text - The string to search for
	constructor: function(/*Object*/args){
		//	summary:
		//		Initializer for the GoogleSearchStore store.
		//	description:
		//		The GoogleSearchStore is a Datastore interface to
		//		the Google search service. The constructor accepts the following arguments:
		//		<ul>
		//			<li>label - the label attribute to use. Defaults to titleNoFormatting</li>
		//			<li>key - The API key to use. This is optional</li>
		//			<li>lang - The language locale to use. Defaults to the browser locale</li>
		//		</ul>

		if(args){
			if(args.label){
				this.label = args.label;
			}
			if(args.key){
				this._key = args.key;
			}
			if(args.lang){
				this._lang = args.lang;
			}
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
			}
		}
		this._id = dojox.data.GoogleSearchStore.prototype._id++;
	},

	// _id: Integer
	// A unique identifier for this store.
	_id: 0,

	// _requestCount: Integer
	// A counter for the number of requests made. This is used to define
	// the callback function that GoogleSearchStore will use.
	_requestCount: 0,

	// _googleUrl: String
	// The URL to Googles search web service.
	_googleUrl: "http://ajax.googleapis.com/ajax/services/search/",

	// _storeRef: String
	// The internal reference added to each item pointing at the store which owns it.
	_storeRef: "_S",

	// _attributes: Array
	// The list of attributes that this store supports
	_attributes: [	"unescapedUrl", "url", "visibleUrl", "cacheUrl", "title",
			"titleNoFormatting", "content", "estimatedResultCount"],

	// _aggregtedAttributes: Hash
	// Maps per-query aggregated attributes that this store supports to the result keys that they come from.
	_aggregatedAttributes: {
		estimatedResultCount: "cursor.estimatedResultCount"
	},

	// label: String
	// The default attribute which acts as a label for each item.
	label: "titleNoFormatting",

	// type: String
	// The type of search. Valid values are "web", "local", "video", "blogs", "news", "books", "images".
	// This should not be set directly. Instead use one of the child classes.
	_type: "web",

	// urlPreventCache: boolean
	// Sets whether or not to pass preventCache to dojo.io.script.
	urlPreventCache: true,


	// _queryAttrs: Hash
	// Maps query hash keys to Google query parameters.
	_queryAttrs: {
		text: 'q'
	},

	_assertIsItem: function(/* item */ item){
		//	summary:
		//		This function tests whether the item passed in is indeed an item in the store.
		//	item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error("dojox.data.GoogleSearchStore: a function was passed an item argument that was not an item");
		}
	},

	_assertIsAttribute: function(/* attribute-name-string */ attribute){
		//	summary:
		//		This function tests whether the item passed in is indeed a valid 'attribute' like type for the store.
		//	attribute:
		//		The attribute to test for being contained by the store.
		if(typeof attribute !== "string"){
			throw new Error("dojox.data.GoogleSearchStore: a function was passed an attribute argument that was not an attribute name string");
		}
	},

	getFeatures: function(){
		//	summary:
		//		See dojo.data.api.Read.getFeatures()
		return {
			'dojo.data.api.Read': true
		};
	},

	getValue: function(item, attribute, defaultValue){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		var values = this.getValues(item, attribute);
		if(values && values.length > 0){
			return values[0];
		}
		return defaultValue;
	},

	getAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getAttributes()
		return this._attributes;
	},

	hasAttribute: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.hasAttributes()
		if(this.getValue(item,attribute)){
			return true;
		}
		return false;
	},

	isItemLoaded: function(item){
		 //	summary:
		 //		See dojo.data.api.Read.isItemLoaded()
		 return this.isItem(item);
	},

	loadItem: function(keywordArgs){
		//	summary:
		//		See dojo.data.api.Read.loadItem()
	},

	getLabel: function(item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		return this.getValue(item,this.label);
	},

	getLabelAttributes: function(item){
		//	summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		return [this.label];
	},

	containsValue: function(item, attribute, value){
		//	summary:
		//		See dojo.data.api.Read.containsValue()
		var values = this.getValues(item,attribute);
		for(var i = 0; i < values.length; i++){
			if(values[i] === value){
				return true;
			}
		}
		return false;
	},

	getValues: function(item, attribute){
		//	summary:
		//		See dojo.data.api.Read.getValue()
		this._assertIsItem(item);
		this._assertIsAttribute(attribute);
		var val = item[attribute];
		if(lang.isArray(val)) {
			return val;
		}else if(val !== undefined){
			return [val];
		}else{
			return [];
		}
	},

	isItem: function(item){
		//	summary:
		//		See dojo.data.api.Read.isItem()
		if(item && item[this._storeRef] === this){
			return true;
		}
		return false;
	},

	close: function(request){
		//	summary:
		//		See dojo.data.api.Read.close()
	},

	_format: function(item, name){
		return item;//base implementation does not format any items
	},

	fetch: function(request){
		//	summary:
		//		Fetch Google search items that match to a query
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error
		request = request || {};

		var scope = request.scope || winUtil.global;

		if(!request.query){
			if(request.onError){
				request.onError.call(scope, new Error(this.declaredClass +
					": A query must be specified."));
				return;
			}
		}
		//Make a copy of the request object, in case it is
		//modified outside the store in the middle of a request
		var query = {};
		for(var attr in this._queryAttrs) {
			query[attr] = request.query[attr];
		}
		request = {
			query: query,
			onComplete: request.onComplete,
			onError: request.onError,
			onItem: request.onItem,
			onBegin: request.onBegin,
			start: request.start,
			count: request.count
		};

		//Google's web api will only return a max of 8 results per page.
		var pageSize = 8;

		//Generate a unique function to be called back
		var callbackFn = "GoogleSearchStoreCallback_" + this._id + "_" + (++this._requestCount);

		//Build up the content to send the request for.
		//rsz is the result size, "large" gives 8 results each time
		var content = this._createContent(query, callbackFn, request);

		var firstRequest;

		if(typeof(request.start) === "undefined" || request.start === null){
			request.start = 0;
		}

		if(!request.count){
			request.count = pageSize;
		}
		firstRequest = {start: request.start - request.start % pageSize};

		var _this = this;
		var searchUrl = this._googleUrl + this._type;

		var getArgs = {
			url: searchUrl,
			preventCache: this.urlPreventCache,
			content: content
		};

		var items = [];
		var successfulReq = 0;
		var finished = false;
		var lastOnItem = request.start -1;
		var numRequests = 0;
		var scriptIds = [];

		// Performs the remote request.
		function doRequest(req){
			//Record how many requests have been made.
			numRequests ++;
			getArgs.content.context = getArgs.content.start = req.start;

			var deferred = scriptIO.get(getArgs);
			scriptIds.push(deferred.ioArgs.id);

			//We only set up the errback, because the callback isn't ever really used because we have
			//to link to the jsonp callback function....
			deferred.addErrback(function(error){
				if(request.onError){
					request.onError.call(scope, error, request);
				}
			});
		}

		// Function to handle returned data.
		var myHandler = function(start, data){
			if (scriptIds.length > 0) {
				// Delete the script node that was created.
				domQuery("#" + scriptIds.splice(0,1)).forEach(domConstruct.destroy);
			}
			if(finished){return;}

			var results = _this._getItems(data);
			var cursor = data ? data['cursor']: null;

			if(results){
				//Process the results, adding the store reference to them
				for(var i = 0; i < results.length && i + start < request.count + request.start; i++) {
					_this._processItem(results[i], data);
					items[i + start] = results[i];
				}
				successfulReq ++;
				if(successfulReq == 1){
					// After the first request, we know how many results exist.
					// So perform any follow up requests to retrieve more data.
					var pages = cursor ? cursor.pages : null;
					var firstStart = pages ? Number(pages[pages.length - 1].start) : 0;

					//Call the onBegin method if it exists
					if (request.onBegin){
						var est = cursor ? cursor.estimatedResultCount : results.length;
						var total =  est ? Math.min(est, firstStart + results.length) : firstStart + results.length;
						request.onBegin.call(scope, total, request);
					}

					// Request the next pages.
					var nextPage = (request.start - request.start % pageSize) + pageSize;
					var page = 1;
					while(pages){
						if(!pages[page] || Number(pages[page].start) >= request.start + request.count){
							break;
						}
						if(Number(pages[page].start) >= nextPage) {
							doRequest({start: pages[page].start});
						}
						page++;
					}
				}

				// Call the onItem function on all retrieved items.
				if(request.onItem && items[lastOnItem + 1]){
					do{
						lastOnItem++;
						request.onItem.call(scope, items[lastOnItem], request);
					}while(items[lastOnItem + 1] && lastOnItem < request.start + request.count);
				}

				//If this is the last request, call final fetch handler.
				if(successfulReq == numRequests){
					//Process the items...
					finished = true;
					//Clean up the function, it should never be called again
					winUtil.global[callbackFn] = null;
					if(request.onItem){
						request.onComplete.call(scope, null, request);
					}else{
						items = items.slice(request.start, request.start + request.count);
						request.onComplete.call(scope, items, request);
					}

				}
			}
		};

		var callbacks = [];
		var lastCallback = firstRequest.start - 1;

		// Attach a callback function to the global namespace, where Google can call it.
		winUtil.global[callbackFn] = function(start, data, responseCode, errorMsg){
			try {
				if(responseCode != 200){
					if(request.onError){
						request.onError.call(scope, new Error("Response from Google was: " + responseCode), request);
					}
					winUtil.global[callbackFn] = function(){};//an error occurred, do not return anything else.
					return;
				}
	
				if(start == lastCallback + 1){
					myHandler(Number(start), data);
					lastCallback += pageSize;
	
					//make sure that the callbacks happen in the correct sequence
					if(callbacks.length > 0){
						callbacks.sort(_this._getSort());
						//In case the requsts do not come back in order, sort the returned results.
						while(callbacks.length > 0 && callbacks[0].start == lastCallback + 1){
							myHandler(Number(callbacks[0].start), callbacks[0].data);
							callbacks.splice(0,1);
							lastCallback += pageSize;
						}
					}
				}else{
					callbacks.push({start:start, data: data});
				}
			} catch (e) {
				request.onError.call(scope, e, request);
			}
		};

		// Perform the first request. When this has finished
		// we will have a list of pages, which can then be
		// gone through
		doRequest(firstRequest);
	},
	
	_getSort: function() {
		return function(a,b){
			if(a.start < b.start){return -1;}
			if(b.start < a.start){return 1;}
			return 0;
		};
	},

	_processItem: function(item, data) {
		item[this._storeRef] = this;
		// Copy aggregated attributes from query results to the item.
		for(var attribute in this._aggregatedAttributes) {
			item[attribute] = lang.getObject(this._aggregatedAttributes[attribute], false, data);
		}
	},

	_getItems: function(data){
		return data['results'] || data;
	},

	_createContent: function(query, callback, request){
		var content = {
			v: "1.0",
			rsz: "large",
			callback: callback,
			key: this._key,
			hl: this._lang
		};
		for(var attr in this._queryAttrs) {
			content[this._queryAttrs[attr]] = query[attr];
		}
		return content;
	}
});

var WebSearchStore = declare("dojox.data.GoogleWebSearchStore", SearchStore,{
	//	Summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The page title in HTML format.</li>
	//			<li>titleNoFormatting - The page title in plain text</li>
	//			<li>content - A snippet of information about the page</li>
	//			<li>url - The URL for the item</li>
	//			<li>unescapedUrl - The URL for the item, with URL escaping. This is often more readable</li>
	//			<li>visibleUrl - The URL with no protocol specified.</li>
	//			<li>cacheUrl - The URL to the copy of the document cached by Google</li>
	//			<li>estimatedResultCount - (aggregated per-query) estimated number of results</li>
	//		</ul>
	//		The query accepts one parameter: text - The string to search for
});

var BlogSearchStore = declare("dojox.data.GoogleBlogSearchStore", SearchStore,{
	//	Summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The blog post title in HTML format.</li>
	//			<li>titleNoFormatting - The  blog post title in plain text</li>
	//			<li>content - A snippet of information about the blog post</li>
	//			<li>blogUrl - The URL for the blog</li>
	//			<li>postUrl - The URL for the a single blog post</li>
	//			<li>visibleUrl - The URL with no protocol specified.
	//			<li>cacheUrl - The URL to the copy of the document cached by Google
	//			<li>author - The author of the blog post</li>
	//			<li>publishedDate - The published date, in RFC-822 format</li>
	//		</ul>
	//		The query accepts one parameter: text - The string to search for
	_type: "blogs",
	_attributes: ["blogUrl", "postUrl", "title", "titleNoFormatting", "content",
			"author", "publishedDate"],
	_aggregatedAttributes: { }
});


var LocalSearchStore = declare("dojox.data.GoogleLocalSearchStore", SearchStore,{
	//	summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The blog post title in HTML format.</li>
	//			<li>titleNoFormatting - The  blog post title in plain text</li>
	//			<li>content - A snippet of information about the blog post</li>
	//			<li>url - The URL for the item</li>
	//			<li>lat - The latitude.</li>
	//			<li>lng - The longtitude.</li>
	//			<li>streetAddress - The street address</li>
	//			<li>city - The city</li>
	//			<li>region - The region</li>
	//			<li>country - The country</li>
	//			<li>phoneNumbers - Phone numbers associated with this address. Can be one or more.</li>
	//			<li>ddUrl - A URL that can be used to provide driving directions from the center of the search results to this search results</li>
	//			<li>ddUrlToHere - A URL that can be used to provide driving directions from this search result to a user specified location</li>
	//			<li>staticMapUrl - The published date, in RFC-822 format</li>
	//			<li>viewport - Recommended viewport for the query results (same for all results in a query)
	//				<ul>
	//					<li>center - contains lat, lng properties</li>
	//					<li>span - lat, lng properties for the viewport span</li>
	//					<li>ne, sw - lat, lng properties for the viewport corners<li>
	//				</ul>
	//			</li>
	//		</ul>
	//		The query accepts the following parameters:
	//		<ul>
	//			<li>text - The string to search for</li>
	//			<li>centerLatLong - Comma-separated lat & long for the center of the search (e.g. "48.8565,2.3509")</li>
	//			<li>searchSpan - Comma-separated lat & long degrees indicating the size of the desired search area (e.g. "0.065165,0.194149")</li>
	//		</ul>
	_type: "local",
	_attributes: ["title", "titleNoFormatting", "url", "lat", "lng", "streetAddress",
			"city", "region", "country", "phoneNumbers", "ddUrl", "ddUrlToHere",
			"ddUrlFromHere", "staticMapUrl", "viewport"],
	_aggregatedAttributes: {
		viewport: "viewport"
	},
	_queryAttrs: {
		text: 'q',
		centerLatLong: 'sll',
		searchSpan: 'sspn'
	}
});

var VideoSearchStore = declare("dojox.data.GoogleVideoSearchStore", SearchStore,{
	//	summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The blog post title in HTML format.</li>
	//			<li>titleNoFormatting - The  blog post title in plain text</li>
	//			<li>content - A snippet of information about the blog post</li>
	//			<li>url - The URL for the item</li>
	//			<li>published - The published date, in RFC-822 format.</li>
	//			<li>publisher - The name of the publisher.</li>
	//			<li>duration - The approximate duration, in seconds, of the video.</li>
	//			<li>tbWidth - The width in pixels of the video.</li>
	//			<li>tbHeight - The height in pixels of the video</li>
	//			<li>tbUrl - The URL to a thumbnail representation of the video.</li>
	//			<li>playUrl - If present, supplies the url of the flash version of the video that can be played inline on your page. To play this video simply create and <embed> element on your page using this value as the src attribute and using application/x-shockwave-flash as the type attribute. If you want the video to play right away, make sure to append &autoPlay=true to the url..</li>
	//		</ul>
	//		The query accepts one parameter: text - The string to search for
	_type: "video",
	_attributes: ["title", "titleNoFormatting", "content", "url", "published", "publisher",
			"duration", "tbWidth", "tbHeight", "tbUrl", "playUrl"],
	_aggregatedAttributes: { }
});

var NewsSearchStore = declare("dojox.data.GoogleNewsSearchStore", SearchStore,{
	//	summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The news story title in HTML format.</li>
	//			<li>titleNoFormatting - The news story title in plain text</li>
	//			<li>content - A snippet of information about the news story</li>
	//			<li>url - The URL for the item</li>
	//			<li>unescapedUrl - The URL for the item, with URL escaping. This is often more readable</li>
	//			<li>publisher - The name of the publisher</li>
	//			<li>clusterUrl - A URL pointing to a page listing related storied.</li>
	//			<li>location - The location of the news story.</li>
	//			<li>publishedDate - The date of publication, in RFC-822 format.</li>
	//			<li>relatedStories - An optional array of objects specifying related stories.
	//				Each object has the following subset of properties:
	//				"title", "titleNoFormatting", "url", "unescapedUrl", "publisher", "location", "publishedDate".
	//			</li>
	//		</ul>
	//		The query accepts one parameter: text - The string to search for
	_type: "news",
	_attributes: ["title", "titleNoFormatting", "content", "url", "unescapedUrl", "publisher",
			"clusterUrl", "location", "publishedDate", "relatedStories" ],
	_aggregatedAttributes: { }
});

var BookSearchStore = declare("dojox.data.GoogleBookSearchStore", SearchStore,{
	// 	summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The book title in HTML format.</li>
	//			<li>titleNoFormatting - The book title in plain text</li>
	//			<li>authors - An array of authors</li>
	//			<li>url - The URL for the item</li>
	//			<li>unescapedUrl - The URL for the item, with URL escaping. This is often more readable</li>
	//			<li>bookId - An identifier for the book, usually an ISBN.</li>
	//			<li>pageCount - The number of pages in the book.</li>
	//			<li>publishedYear - The year of publication.</li>
	//		</ul>
	//		The query accepts one parameter: text - The string to search for
	_type: "books",
	_attributes: ["title", "titleNoFormatting", "authors", "url", "unescapedUrl", "bookId",
			"pageCount", "publishedYear"],
	_aggregatedAttributes: { }
});

var ImageSearchStore = declare("dojox.data.GoogleImageSearchStore", SearchStore,{
	//	summary:
	//		A data store for retrieving search results from Google.
	//		The following attributes are supported on each item:
	//		<ul>
	//			<li>title - The image title in HTML format.</li>
	//			<li>titleNoFormatting - The image title in plain text</li>
	//			<li>url - The URL for the image</li>
	//			<li>unescapedUrl - The URL for the image, with URL escaping. This is often more readable</li>
	//			<li>tbUrl - The URL for the image thumbnail</li>
	//			<li>visibleUrl - A shortened version of the URL associated with the result, stripped of a protocol and path</li>
	//			<li>originalContextUrl - The URL of the page containing the image.</li>
	//			<li>width - The width of the image in pixels.</li>
	//			<li>height - The height of the image in pixels.</li>
	//			<li>tbWidth - The width of the image thumbnail in pixels.</li>
	//			<li>tbHeight - The height of the image thumbnail in pixels.</li>
	//			<li>content - A snippet of information about the image, in HTML format</li>
	//			<li>contentNoFormatting - A snippet of information about the image, in plain text</li>
	//		</ul>
	//		The query accepts one parameter: text - The string to search for
	_type: "images",
	_attributes: ["title", "titleNoFormatting", "visibleUrl", "url", "unescapedUrl",
			"originalContextUrl", "width", "height", "tbWidth", "tbHeight",
			"tbUrl", "content", "contentNoFormatting"],
	_aggregatedAttributes: { }
});

return {
	Search: SearchStore,
	ImageSearch: ImageSearchStore,
	BookSearch: BookSearchStore,
	NewsSearch: NewsSearchStore,
	VideoSearch: VideoSearchStore,
	LocalSearch: LocalSearchStore,
	BlogSearch: BlogSearchStore,
	WebSearch: WebSearchStore
	}
});

},
'dojo/io/script':function(){
define("dojo/io/script", ["../main"], function(dojo) {
	// module:
	//		dojo/io/script
	// summary:
	//		TODOC

	dojo.getObject("io", true, dojo);

/*=====
dojo.declare("dojo.io.script.__ioArgs", dojo.__IoArgs, {
	constructor: function(){
		//	summary:
		//		All the properties described in the dojo.__ioArgs type, apply to this
		//		type as well, EXCEPT "handleAs". It is not applicable to
		//		dojo.io.script.get() calls, since it is implied by the usage of
		//		"jsonp" (response will be a JSONP call returning JSON)
		//		or the response is pure JavaScript defined in
		//		the body of the script that was attached.
		//	callbackParamName: String
		//		Deprecated as of Dojo 1.4 in favor of "jsonp", but still supported for
		//		legacy code. See notes for jsonp property.
		//	jsonp: String
		//		The URL parameter name that indicates the JSONP callback string.
		//		For instance, when using Yahoo JSONP calls it is normally,
		//		jsonp: "callback". For AOL JSONP calls it is normally
		//		jsonp: "c".
		//	checkString: String
		//		A string of JavaScript that when evaluated like so:
		//		"typeof(" + checkString + ") != 'undefined'"
		//		being true means that the script fetched has been loaded.
		//		Do not use this if doing a JSONP type of call (use callbackParamName instead).
		//	frameDoc: Document
		//		The Document object for a child iframe. If this is passed in, the script
		//		will be attached to that document. This can be helpful in some comet long-polling
		//		scenarios with Firefox and Opera.
		this.callbackParamName = callbackParamName;
		this.jsonp = jsonp;
		this.checkString = checkString;
		this.frameDoc = frameDoc;
	}
});
=====*/

	var loadEvent = dojo.isIE ? "onreadystatechange" : "load",
		readyRegExp = /complete|loaded/;

	dojo.io.script = {
		get: function(/*dojo.io.script.__ioArgs*/args){
			//	summary:
			//		sends a get request using a dynamically created script tag.
			var dfd = this._makeScriptDeferred(args);
			var ioArgs = dfd.ioArgs;
			dojo._ioAddQueryToUrl(ioArgs);

			dojo._ioNotifyStart(dfd);

			if(this._canAttach(ioArgs)){
				var node = this.attach(ioArgs.id, ioArgs.url, args.frameDoc);

				//If not a jsonp callback or a polling checkString case, bind
				//to load event on the script tag.
				if(!ioArgs.jsonp && !ioArgs.args.checkString){
					var handle = dojo.connect(node, loadEvent, function(evt){
						if(evt.type == "load" || readyRegExp.test(node.readyState)){
							dojo.disconnect(handle);
							ioArgs.scriptLoaded = evt;
						}
					});
				}
			}

			dojo._ioWatch(dfd, this._validCheck, this._ioCheck, this._resHandle);
			return dfd;
		},

		attach: function(/*String*/id, /*String*/url, /*Document?*/frameDocument){
			//	summary:
			//		creates a new <script> tag pointing to the specified URL and
			//		adds it to the document.
			//	description:
			//		Attaches the script element to the DOM.	 Use this method if you
			//		just want to attach a script to the DOM and do not care when or
			//		if it loads.
			var doc = (frameDocument || dojo.doc);
			var element = doc.createElement("script");
			element.type = "text/javascript";
			element.src = url;
			element.id = id;
			element.async = true;
			element.charset = "utf-8";
			return doc.getElementsByTagName("head")[0].appendChild(element);
		},

		remove: function(/*String*/id, /*Document?*/frameDocument){
			//summary: removes the script element with the given id, from the given frameDocument.
			//If no frameDocument is passed, the current document is used.
			dojo.destroy(dojo.byId(id, frameDocument));

			//Remove the jsonp callback on dojo.io.script, if it exists.
			if(this["jsonp_" + id]){
				delete this["jsonp_" + id];
			}
		},

		_makeScriptDeferred: function(/*Object*/args){
			//summary:
			//		sets up a Deferred object for an IO request.
			var dfd = dojo._ioSetArgs(args, this._deferredCancel, this._deferredOk, this._deferredError);

			var ioArgs = dfd.ioArgs;
			ioArgs.id = dojo._scopeName + "IoScript" + (this._counter++);
			ioArgs.canDelete = false;

			//Special setup for jsonp case
			ioArgs.jsonp = args.callbackParamName || args.jsonp;
			if(ioArgs.jsonp){
				//Add the jsonp parameter.
				ioArgs.query = ioArgs.query || "";
				if(ioArgs.query.length > 0){
					ioArgs.query += "&";
				}
				ioArgs.query += ioArgs.jsonp
					+ "="
					+ (args.frameDoc ? "parent." : "")
					+ dojo._scopeName + ".io.script.jsonp_" + ioArgs.id + "._jsonpCallback";

				ioArgs.frameDoc = args.frameDoc;

				//Setup the Deferred to have the jsonp callback.
				ioArgs.canDelete = true;
				dfd._jsonpCallback = this._jsonpCallback;
				this["jsonp_" + ioArgs.id] = dfd;
			}
			return dfd; // dojo.Deferred
		},

		_deferredCancel: function(/*Deferred*/dfd){
			//summary: canceller function for dojo._ioSetArgs call.

			//DO NOT use "this" and expect it to be dojo.io.script.
			dfd.canceled = true;
			if(dfd.ioArgs.canDelete){
				dojo.io.script._addDeadScript(dfd.ioArgs);
			}
		},

		_deferredOk: function(/*Deferred*/dfd){
			//summary: okHandler function for dojo._ioSetArgs call.

			//DO NOT use "this" and expect it to be dojo.io.script.
			var ioArgs = dfd.ioArgs;

			//Add script to list of things that can be removed.
			if(ioArgs.canDelete){
				dojo.io.script._addDeadScript(ioArgs);
			}

			//Favor JSONP responses, script load events then lastly ioArgs.
			//The ioArgs are goofy, but cannot return the dfd since that stops
			//the callback chain in Deferred. The return value is not that important
			//in that case, probably a checkString case.
			return ioArgs.json || ioArgs.scriptLoaded || ioArgs;
		},

		_deferredError: function(/*Error*/error, /*Deferred*/dfd){
			//summary: errHandler function for dojo._ioSetArgs call.

			if(dfd.ioArgs.canDelete){
				//DO NOT use "this" and expect it to be dojo.io.script.
				if(error.dojoType == "timeout"){
					//For timeouts, remove the script element immediately to
					//avoid a response from it coming back later and causing trouble.
					dojo.io.script.remove(dfd.ioArgs.id, dfd.ioArgs.frameDoc);
				}else{
					dojo.io.script._addDeadScript(dfd.ioArgs);
				}
			}
			console.log("dojo.io.script error", error);
			return error;
		},

		_deadScripts: [],
		_counter: 1,

		_addDeadScript: function(/*Object*/ioArgs){
			//summary: sets up an entry in the deadScripts array.
			dojo.io.script._deadScripts.push({id: ioArgs.id, frameDoc: ioArgs.frameDoc});
			//Being extra paranoid about leaks:
			ioArgs.frameDoc = null;
		},

		_validCheck: function(/*Deferred*/dfd){
			//summary: inflight check function to see if dfd is still valid.

			//Do script cleanup here. We wait for one inflight pass
			//to make sure we don't get any weird things by trying to remove a script
			//tag that is part of the call chain (IE 6 has been known to
			//crash in that case).
			var _self = dojo.io.script;
			var deadScripts = _self._deadScripts;
			if(deadScripts && deadScripts.length > 0){
				for(var i = 0; i < deadScripts.length; i++){
					//Remove the script tag
					_self.remove(deadScripts[i].id, deadScripts[i].frameDoc);
					deadScripts[i].frameDoc = null;
				}
				dojo.io.script._deadScripts = [];
			}

			return true;
		},

		_ioCheck: function(/*Deferred*/dfd){
			//summary: inflight check function to see if IO finished.
			var ioArgs = dfd.ioArgs;
			//Check for finished jsonp
			if(ioArgs.json || (ioArgs.scriptLoaded && !ioArgs.args.checkString)){
				return true;
			}

			//Check for finished "checkString" case.
			var checkString = ioArgs.args.checkString;
			return checkString && eval("typeof(" + checkString + ") != 'undefined'");


		},

		_resHandle: function(/*Deferred*/dfd){
			//summary: inflight function to handle a completed response.
			if(dojo.io.script._ioCheck(dfd)){
				dfd.callback(dfd);
			}else{
				//This path should never happen since the only way we can get
				//to _resHandle is if _ioCheck is true.
				dfd.errback(new Error("inconceivable dojo.io.script._resHandle error"));
			}
		},

		_canAttach: function(/*Object*/ioArgs){
			//summary: A method that can be overridden by other modules
			//to control when the script attachment occurs.
			return true;
		},

		_jsonpCallback: function(/*JSON Object*/json){
			//summary:
			//		generic handler for jsonp callback. A pointer to this function
			//		is used for all jsonp callbacks.  NOTE: the "this" in this
			//		function will be the Deferred object that represents the script
			//		request.
			this.ioArgs.json = json;
		}
	};

	return dojo.io.script;
});

},
'*noref':1}});
define("dojox/_dojox_data_all", [], 1);
require(["dojox/data/AndOrReadStore","dojox/data/AndOrWriteStore","dojox/data/AppStore","dojox/data/AtomReadStore","dojox/data/CdfStore","dojox/data/ClientFilter","dojox/data/CouchDBRestStore","dojox/data/css","dojox/data/CssClassStore","dojox/data/CssRuleStore","dojox/data/CsvStore","dojox/data/dom","dojox/data/FileStore","dojox/data/FlickrRestStore","dojox/data/FlickrStore","dojox/data/GoogleFeedStore","dojox/data/GoogleSearchStore","dojox/data/HtmlStore","dojox/data/HtmlTableStore","dojox/data/KeyValueStore","dojox/data/OpenSearchStore","dojox/data/OpmlStore","dojox/data/PersevereStore","dojox/data/PicasaStore","dojox/data/QueryReadStore","dojox/data/RailsStore","dojox/data/S3Store","dojox/data/ServiceStore","dojox/data/SnapLogicStore","dojox/data/WikipediaStore","dojox/data/XmlItem","dojox/data/XmlStore"]);

require({cache:{
'dojox/xml/parser':function(){
define("dojox/xml/parser", ['dojo/_base/kernel', 'dojo/_base/lang', 'dojo/_base/array', 'dojo/_base/window', 'dojo/_base/sniff'], function(dojo){

dojo.getObject("xml.parser", true, dojox);

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

dojox.xml.parser.parse = function(/*String?*/ str, /*String?*/ mimetype){
	//	summary:
	//		cross-browser implementation of creating an XML document object from null, empty string, and XML text..
	//
	//	str:
	//		Optional text to create the document from.  If not provided, an empty XML document will be created.
	//		If str is empty string "", then a new empty document will be created.
	//	mimetype:
	//		Optional mimetype of the text.  Typically, this is text/xml.  Will be defaulted to text/xml if not provided.
	var _document = dojo.doc;
	var doc;

	mimetype = mimetype || "text/xml";
	if(str && dojo.trim(str) && "DOMParser" in dojo.global){
		//Handle parsing the text on Mozilla based browsers etc..
		var parser = new DOMParser();
		doc = parser.parseFromString(str, mimetype);
		var de = doc.documentElement;
		var errorNS = "http://www.mozilla.org/newlayout/xml/parsererror.xml";
		if(de.nodeName == "parsererror" && de.namespaceURI == errorNS){
			var sourceText = de.getElementsByTagNameNS(errorNS, 'sourcetext')[0];
			if(sourceText){
				sourceText = sourceText.firstChild.data;
			}
        	throw new Error("Error parsing text " + de.firstChild.data + " \n" + sourceText);
		}
		return doc;

	}else if("ActiveXObject" in dojo.global){
		//Handle IE.
		var ms = function(n){ return "MSXML" + n + ".DOMDocument"; };
		var dp = ["Microsoft.XMLDOM", ms(6), ms(4), ms(3), ms(2)];
		dojo.some(dp, function(p){
			try{
				doc = new ActiveXObject(p);
			}catch(e){ return false; }
			return true;
		});
		if(str && doc){
			doc.async = false;
			doc.loadXML(str);
			var pe = doc.parseError;
			if(pe.errorCode !== 0){
				throw new Error("Line: " + pe.line + "\n" +
					"Col: " + pe.linepos + "\n" +
					"Reason: " + pe.reason + "\n" +
					"Error Code: " + pe.errorCode + "\n" +
					"Source: " + pe.srcText);
			}
		}
		if(doc){
			return doc; //DOMDocument
		}
	}else if(_document.implementation && _document.implementation.createDocument){
		if(str && dojo.trim(str) && _document.createElement){
			//Everyone else that we couldn't get to work.  Fallback case.
			// FIXME: this may change all tags to uppercase!
			var tmp = _document.createElement("xml");
			tmp.innerHTML = str;
			var xmlDoc = _document.implementation.createDocument("foo", "", null);
			dojo.forEach(tmp.childNodes, function(child){
				xmlDoc.importNode(child, true);
			});
			return xmlDoc;	//	DOMDocument
		}else{
			return _document.implementation.createDocument("", "", null); // DOMDocument
		}
	}
	return null;	//	null
};

dojox.xml.parser.textContent = function(/*Node*/node, /*String?*/text){
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
	if(arguments.length>1){
		var _document = node.ownerDocument || dojo.doc;  //Preference is to get the node owning doc first or it may fail
		dojox.xml.parser.replaceChildren(node, _document.createTextNode(text));
		return text;	//	String
	}else{
		if(node.textContent !== undefined){ //FF 1.5 -- remove?
			return node.textContent;	//	String
		}
		var _result = "";
		if(node){
			dojo.forEach(node.childNodes, function(child){
				switch(child.nodeType){
					case 1: // ELEMENT_NODE
					case 5: // ENTITY_REFERENCE_NODE
						_result += dojox.xml.parser.textContent(child);
						break;
					case 3: // TEXT_NODE
					case 2: // ATTRIBUTE_NODE
					case 4: // CDATA_SECTION_NODE
						_result += child.nodeValue;
				}
			});
		}
		return _result;	//	String
	}
};

dojox.xml.parser.replaceChildren = function(/*Element*/node, /*Node || Array*/ newChildren){
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
	var nodes = [];

	if(dojo.isIE){
		dojo.forEach(node.childNodes, function(child){
			nodes.push(child);
		});
	}

	dojox.xml.parser.removeChildren(node);
	dojo.forEach(nodes, dojo.destroy);

	if(!dojo.isArray(newChildren)){
		node.appendChild(newChildren);
	}else{
		dojo.forEach(newChildren, function(child){
			node.appendChild(child);
		});
	}
};

dojox.xml.parser.removeChildren = function(/*Element*/node){
	//	summary:
	//		removes all children from node and returns the count of children removed.
	//		The children nodes are not destroyed. Be sure to call dojo.destroy on them
	//		after they are not used anymore.
	//	node:
	//		The node to remove all the children from.
	var count = node.childNodes.length;
	while(node.hasChildNodes()){
		node.removeChild(node.firstChild);
	}
	return count; // int
};


dojox.xml.parser.innerXML = function(/*Node*/node){
	//	summary:
	//		Implementation of MS's innerXML function.
	//	node:
	//		The node from which to generate the XML text representation.
	if(node.innerXML){
		return node.innerXML;	//	String
	}else if(node.xml){
		return node.xml;		//	String
	}else if(typeof XMLSerializer != "undefined"){
		return (new XMLSerializer()).serializeToString(node);	//	String
	}
	return null;
};

return dojox.xml.parser;

});

},
'dojox/data/CsvStore':function(){
define("dojox/data/CsvStore", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/xhr", "dojo/_base/window","dojo/data/util/filter", "dojo/data/util/simpleFetch"], 
  function(lang, declare, xhr, winUtil, filterUtil, simpleFetch) {

var CsvStore = declare("dojox.data.CsvStore", null, {
	// summary:
	//		The CsvStore implements the dojo.data.api.Read API and reads
	//		data from files in CSV (Comma Separated Values) format.
	//		All values are simple string values. References to other items
	//		are not supported as attribute values in this datastore.
	//
	//		Example data file:
	//		name, color, age, tagline
	//		Kermit, green, 12, "Hi, I'm Kermit the Frog."
	//		Fozzie Bear, orange, 10, "Wakka Wakka Wakka!"
	//		Miss Piggy, pink, 11, "Kermie!"
	//
	//		Note that values containing a comma must be enclosed with quotes ("")
	//		Also note that values containing quotes must be escaped with two consecutive quotes (""quoted"")
	//
	// examples:
	//		var csvStore = new dojox.data.CsvStore({url:"movies.csv");
	//		var csvStore = new dojox.data.CsvStore({url:"http://example.com/movies.csv");

	constructor: function(/* Object */ keywordParameters){
		// summary:
		//		initializer
		// keywordParameters: {url: String}
		// keywordParameters: {data: String}
		// keywordParameters: {label: String} The column label for the column to use for the label returned by getLabel.
		// keywordParameters: {identifier: String} The column label for the column to use for the identity.  Optional.  If not set, the identity is the row number.
		
		this._attributes = [];			// e.g. ["Title", "Year", "Producer"]
		this._attributeIndexes = {};	// e.g. {Title: 0, Year: 1, Producer: 2}
 		this._dataArray = [];			// e.g. [[<Item0>],[<Item1>],[<Item2>]]
 		this._arrayOfAllItems = [];		// e.g. [{_csvId:0,_csvStore:store},...]
		this._loadFinished = false;
		if(keywordParameters.url){
			this.url = keywordParameters.url;
		}
		this._csvData = keywordParameters.data;
		if(keywordParameters.label){
			this.label = keywordParameters.label;
		}else if(this.label === ""){
			this.label = undefined;
		}
		this._storeProp = "_csvStore";	// Property name for the store reference on every item.
		this._idProp = "_csvId"; 		// Property name for the Item Id on every item.
		this._features = {
			'dojo.data.api.Read': true,
			'dojo.data.api.Identity': true
		};
		this._loadInProgress = false;	//Got to track the initial load to prevent duelling loads of the dataset.
		this._queuedFetches = [];
		this.identifier = keywordParameters.identifier;
		if(this.identifier === ""){
			delete this.identifier;
		}else{
			this._idMap = {};
		}
		if("separator" in keywordParameters){
			this.separator = keywordParameters.separator;
		}
		if("urlPreventCache" in keywordParameters){
			this.urlPreventCache = keywordParameters.urlPreventCache?true:false;
		}
	},

	// url: [public] string
	//		Declarative hook for setting Csv source url.
	url: "",

	// label: [public] string
	//		Declarative hook for setting the label attribute.
	label: "",

	// identifier: [public] string
	//		Declarative hook for setting the identifier.
	identifier: "",

	// separator: [public] string
	//		Declatative and programmatic hook for defining the separator
	//		character used in the Csv style file.
	separator: ",",

	// separator: [public] string
	//		Parameter to allow specifying if preventCache should be passed to
	//		the xhrGet call or not when loading data from a url.
	//		Note this does not mean the store calls the server on each fetch,
	//		only that the data load has preventCache set as an option.
	urlPreventCache: false,

	_assertIsItem: function(/* item */ item){
		// summary:
		//      This function tests whether the item passed in is indeed an item in the store.
		// item:
		//		The item to test for being contained by the store.
		if(!this.isItem(item)){
			throw new Error(this.declaredClass + ": a function was passed an item argument that was not an item");
		}
	},
	
	_getIndex: function(item){
		// summary:
		//		Internal function to get the internal index to the item data from the item handle
		// item:
		//		The idem handle to get the index for.
		var idx = this.getIdentity(item);
		if(this.identifier){
			idx = this._idMap[idx];
		}
		return idx;
	},

/***************************************
     dojo.data.api.Read API
***************************************/
	getValue: function(	/* item */ item,
						/* attribute || attribute-name-string */ attribute,
						/* value? */ defaultValue){
		// summary:
		//      See dojo.data.api.Read.getValue()
		//		Note that for the CsvStore, an empty string value is the same as no value,
		// 		so the defaultValue would be returned instead of an empty string.
		this._assertIsItem(item);
		var itemValue = defaultValue;
		if(typeof attribute === "string"){
			var ai = this._attributeIndexes[attribute];
			if(ai != null){
				var itemData = this._dataArray[this._getIndex(item)];
				itemValue = itemData[ai] || defaultValue;
			}
		}else{
			throw new Error(this.declaredClass + ": a function was passed an attribute argument that was not a string");
		}
		return itemValue; //String
	},

	getValues: function(/* item */ item,
						/* attribute || attribute-name-string */ attribute){
		// summary:
		//		See dojo.data.api.Read.getValues()
		// 		CSV syntax does not support multi-valued attributes, so this is just a
		// 		wrapper function for getValue().
		var value = this.getValue(item, attribute);
		return (value ? [value] : []); //Array
	},

	getAttributes: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Read.getAttributes()
		this._assertIsItem(item);
		var attributes = [];
		var itemData = this._dataArray[this._getIndex(item)];
		for(var i=0; i<itemData.length; i++){
			// Check for empty string values. CsvStore treats empty strings as no value.
			if(itemData[i] !== ""){
				attributes.push(this._attributes[i]);
			}
		}
		return attributes; //Array
	},

	hasAttribute: function(	/* item */ item,
							/* attribute-name-string */ attribute){
		// summary:
		//		See dojo.data.api.Read.hasAttribute()
		// 		The hasAttribute test is true if attribute has an index number within the item's array length
		// 		AND if the item has a value for that attribute. Note that for the CsvStore, an
		// 		empty string value is the same as no value.
		this._assertIsItem(item);
		if(typeof attribute === "string"){
			var attributeIndex = this._attributeIndexes[attribute];
			var itemData = this._dataArray[this._getIndex(item)];
			return (typeof attributeIndex !== "undefined" && attributeIndex < itemData.length && itemData[attributeIndex] !== ""); //Boolean
		}else{
			throw new Error(this.declaredClass + ": a function was passed an attribute argument that was not a string");
		}
	},

	containsValue: function(/* item */ item,
							/* attribute || attribute-name-string */ attribute,
							/* anything */ value){
		// summary:
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
		// tags:
		//		private
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
		// summary:
		//		See dojo.data.api.Read.isItem()
		if(something && something[this._storeProp] === this){
			var identity = something[this._idProp];
			//If an identifier was specified, we have to look it up via that and the mapping,
			//otherwise, just use row number.
			if(this.identifier){
				var data = this._dataArray[this._idMap[identity]];
				if(data){
					return true;
				}
			}else{
				if(identity >= 0 && identity < this._dataArray.length){
					return true; //Boolean
				}
			}
		}
		return false; //Boolean
	},

	isItemLoaded: function(/* anything */ something){
		// summary:
		//		See dojo.data.api.Read.isItemLoaded()
		//		The CsvStore always loads all items, so if it's an item, then it's loaded.
		return this.isItem(something); //Boolean
	},

	loadItem: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Read.loadItem()
		// description:
		//		The CsvStore always loads all items, so if it's an item, then it's loaded.
		//		From the dojo.data.api.Read.loadItem docs:
		//			If a call to isItemLoaded() returns true before loadItem() is even called,
		//			then loadItem() need not do any work at all and will not even invoke
		//			the callback handlers.
	},

	getFeatures: function(){
		// summary:
		//		See dojo.data.api.Read.getFeatures()
		return this._features; //Object
	},

	getLabel: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Read.getLabel()
		if(this.label && this.isItem(item)){
			return this.getValue(item,this.label); //String
		}
		return undefined; //undefined
	},

	getLabelAttributes: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Read.getLabelAttributes()
		if(this.label){
			return [this.label]; //array
		}
		return null; //null
	},


	// The dojo.data.api.Read.fetch() function is implemented as
	// a mixin from dojo.data.util.simpleFetch.
	// That mixin requires us to define _fetchItems().
	_fetchItems: function(	/* Object */ keywordArgs,
							/* Function */ findCallback,
							/* Function */ errorCallback){
		// summary:
		//		See dojo.data.util.simpleFetch.fetch()
		// tags:
		//		protected
		var self = this;
		var filter = function(requestArgs, arrayOfAllItems){
			var items = null;
			if(requestArgs.query){
				var key, value;
				items = [];
				var ignoreCase = requestArgs.queryOptions ? requestArgs.queryOptions.ignoreCase : false;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(key in requestArgs.query){
					value = requestArgs.query[key];
					if(typeof value === "string"){
						regexpList[key] = filterUtil.patternToRegExp(value, ignoreCase);
					}
				}

				for(var i = 0; i < arrayOfAllItems.length; ++i){
					var match = true;
					var candidateItem = arrayOfAllItems[i];
					for(key in requestArgs.query){
						value = requestArgs.query[key];
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
				items = arrayOfAllItems.slice(0,arrayOfAllItems.length);
				
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
							handleAs: "text",
							preventCache: self.urlPreventCache
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						try{
							self._processData(data);
							filter(keywordArgs, self._arrayOfAllItems);
							self._handleQueuedFetches();
						}catch(e){
							errorCallback(e, keywordArgs);
						}
					});
					getHandler.addErrback(function(error){
						self._loadInProgress = false;
						if(errorCallback){
							errorCallback(error, keywordArgs);
						}else{
							throw error;
						}
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
			}else if(this._csvData){
				try{
					this._processData(this._csvData);
					this._csvData = null;
					filter(keywordArgs, this._arrayOfAllItems);
				}catch(e){
					errorCallback(e, keywordArgs);
				}
			}else{
				var error = new Error(this.declaredClass + ": No CSV source data was provided as either URL or String data input.");
				if(errorCallback){
					errorCallback(error, keywordArgs);
				}else{
					throw error;
				}
			}
		}
	},
	
	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		 //	summary:
		 //		See dojo.data.api.Read.close()
	},
	
	
	// -------------------------------------------------------------------
	// Private methods
	_getArrayOfArraysFromCsvFileContents: function(/* string */ csvFileContents){
		// summary:
		//		Parses a string of CSV records into a nested array structure.
		// description:
		//		Given a string containing CSV records, this method parses
		//		the string and returns a data structure containing the parsed
		//		content.  The data structure we return is an array of length
		//		R, where R is the number of rows (lines) in the CSV data.  The
		//		return array contains one sub-array for each CSV line, and each
		//		sub-array contains C string values, where C is the number of
		//		columns in the CSV data.
		// example:
		//		For example, given this CSV string as input:
		//			"Title, Year, Producer \n Alien, 1979, Ridley Scott \n Blade Runner, 1982, Ridley Scott"
		//		this._dataArray will be set to:
		//			[["Alien", "1979", "Ridley Scott"],
		//			["Blade Runner", "1982", "Ridley Scott"]]
		//		And this._attributes will be set to:
		//			["Title", "Year", "Producer"]
		//		And this._attributeIndexes will be set to:
		//			{ "Title":0, "Year":1, "Producer":2 }
		// tags:
		//		private
		if(lang.isString(csvFileContents)){
			var leadingWhiteSpaceCharacters = new RegExp("^\\s+",'g');
			var trailingWhiteSpaceCharacters = new RegExp("\\s+$",'g');
			var doubleQuotes = new RegExp('""','g');
			var arrayOfOutputRecords = [];
			var i;
			
			var arrayOfInputLines = this._splitLines(csvFileContents);
			for(i = 0; i < arrayOfInputLines.length; ++i){
				var singleLine = arrayOfInputLines[i];
				if(singleLine.length > 0){
					var listOfFields = singleLine.split(this.separator);
					var j = 0;
					while(j < listOfFields.length){
						var space_field_space = listOfFields[j];
						var field_space = space_field_space.replace(leadingWhiteSpaceCharacters, ''); // trim leading whitespace
						var field = field_space.replace(trailingWhiteSpaceCharacters, ''); // trim trailing whitespace
						var firstChar = field.charAt(0);
						var lastChar = field.charAt(field.length - 1);
						var secondToLastChar = field.charAt(field.length - 2);
						var thirdToLastChar = field.charAt(field.length - 3);
						if(field.length === 2 && field == "\"\""){
							listOfFields[j] = ""; //Special case empty string field.
						}else if((firstChar == '"') &&
								((lastChar != '"') ||
								 ((lastChar == '"') && (secondToLastChar == '"') && (thirdToLastChar != '"')))){
							if(j+1 === listOfFields.length){
								// alert("The last field in record " + i + " is corrupted:\n" + field);
								return; //null
							}
							var nextField = listOfFields[j+1];
							listOfFields[j] = field_space + this.separator + nextField;
							listOfFields.splice(j+1, 1); // delete element [j+1] from the list
						}else{
							if((firstChar == '"') && (lastChar == '"')){
								field = field.slice(1, (field.length - 1)); // trim the " characters off the ends
								field = field.replace(doubleQuotes, '"'); // replace "" with "
							}
							listOfFields[j] = field;
							j += 1;
						}
					}
					arrayOfOutputRecords.push(listOfFields);
				}
			}
			
			// The first item of the array must be the header row with attribute names.
			this._attributes = arrayOfOutputRecords.shift();
			for(i = 0; i<this._attributes.length; i++){
				// Store the index of each attribute
				this._attributeIndexes[this._attributes[i]] = i;
			}
			this._dataArray = arrayOfOutputRecords; //Array
		}
	},

	_splitLines: function(csvContent){
		// summary:
		//		Function to split the CSV file contents into separate lines.
		//		Since line breaks can occur inside quotes, a Regexp didn't
		//		work as well.  A quick passover parse should be just as efficient.
		// tags:
		//		private
		var split = [];
		var i;
		var line = "";
		var inQuotes = false;
		for(i = 0; i < csvContent.length; i++){
			var c = csvContent.charAt(i);
			switch(c){
				case '\"':
					inQuotes = !inQuotes;
					line += c;
					break;
				case '\r':
					if(inQuotes){
						line += c;
					}else{
						split.push(line);
						line = "";
						if(i < (csvContent.length - 1) && csvContent.charAt(i + 1) == '\n'){
							i++; //Skip it, it's CRLF
						}
					}
					break;
				case '\n':
					if(inQuotes){
						line += c;
					}else{
						split.push(line);
						line = "";
					}
					break;
				default:
					line +=c;
			}
		}
		if(line !== ""){
			split.push(line);
		}
		return split;
	},
	
	_processData: function(/* String */ data){
		// summary:
		//		Function for processing the string data from the server.
		// data: String
		//		The CSV data.
		// tags:
		//		private
		this._getArrayOfArraysFromCsvFileContents(data);
		this._arrayOfAllItems = [];

		//Check that the specified Identifier is actually a column title, if provided.
		if(this.identifier){
			if(this._attributeIndexes[this.identifier] === undefined){
				throw new Error(this.declaredClass + ": Identity specified is not a column header in the data set.");
			}
		}

		for(var i=0; i<this._dataArray.length; i++){
			var id = i;
			//Associate the identifier to a row in this case
			//for o(1) lookup.
			if(this.identifier){
				var iData = this._dataArray[i];
				id = iData[this._attributeIndexes[this.identifier]];
				this._idMap[id] = i;
			}
			this._arrayOfAllItems.push(this._createItemFromIdentity(id));
		}
		this._loadFinished = true;
		this._loadInProgress = false;
	},
	
	_createItemFromIdentity: function(/* String */ identity){
		// summary:
		//		Function for creating a new item from its identifier.
		// identity: String
		//		The identity
		// tags:
		//		private
		var item = {};
		item[this._storeProp] = this;
		item[this._idProp] = identity;
		return item; //Object
	},
	
	
/***************************************
     dojo.data.api.Identity API
***************************************/
	getIdentity: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Identity.getIdentity()
		// tags:
		//		public
		if(this.isItem(item)){
			return item[this._idProp]; //String
		}
		return null; //null
	},

	fetchItemByIdentity: function(/* Object */ keywordArgs){
		// summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity()
		// tags:
		//		public
		var item;
		var scope = keywordArgs.scope?keywordArgs.scope:winUtil.global;
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
							handleAs: "text"
						};
					var getHandler = xhr.get(getArgs);
					getHandler.addCallback(function(data){
						try{
							self._processData(data);
							var item = self._createItemFromIdentity(keywordArgs.identity);
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
							keywordArgs.onError.call(scope, error);
						}
					});
				}
			}else if(this._csvData){
				try{
					self._processData(self._csvData);
					self._csvData = null;
					item = self._createItemFromIdentity(keywordArgs.identity);
					if(!self.isItem(item)){
						item = null;
					}
					if(keywordArgs.onItem){
						keywordArgs.onItem.call(scope, item);
					}
				}catch(e){
					if(keywordArgs.onError){
						keywordArgs.onError.call(scope, e);
					}
				}
			}
		}else{
			//Already loaded.  We can just look it up and call back.
			item = this._createItemFromIdentity(keywordArgs.identity);
			if(!this.isItem(item)){
				item = null;
			}
			if(keywordArgs.onItem){
				keywordArgs.onItem.call(scope, item);
			}
		}
	},

	getIdentityAttributes: function(/* item */ item){
		// summary:
		//		See dojo.data.api.Identity.getIdentifierAttributes()
		// tags:
		//		public
		 
		//Identity isn't a public attribute in the item, it's the row position index.
		//So, return null.
		if(this.identifier){
			return [this.identifier];
		}else{
			return null;
		}
	},

	_handleQueuedFetches: function(){
		// summary:
		//		Internal function to execute delayed request in the store.
		// tags:
		//		private

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
	}
});
//Mix in the simple fetch implementation to this class.
lang.extend(CsvStore, simpleFetch);

return CsvStore;
});

},
'dojox/data/XmlItem':function(){
define("dojox/data/XmlItem", ["dojo/_base/declare"], 
  function(declare) {

return declare("dojox.data.XmlItem", null, {
	constructor: function(element, store, query){
		//	summary:
		//		Initialize with an XML element
		//	element:
		//		An XML element
		//	store:
		//		The containing store, if any.
		//	query:
		//		The query to use to look up a specific element.
		//		Usually an XPath or dojo.query statement.
		this.element = element;
		this.store = store;
		this.q = query;
	},
	//	summary:
	//		A data item of 'XmlStore'
	//	description:
	//		This class represents an item of 'XmlStore' holding an XML element.
	//		'element'
	//	element:
	//		An XML element
	toString: function(){
		//	summary:
		//		Return a value of the first text child of the element
		// 	returns:
		//		a value of the first text child of the element
		var str = "";
		if(this.element){
			for(var i = 0; i < this.element.childNodes.length; i++){
				var node = this.element.childNodes[i];
				if(node.nodeType === 3 || node.nodeType === 4){
					str += node.nodeValue;
				}
			}
		}
		return str;	//String
	}
});
});

},
'dojox/data/XmlStore':function(){
define("dojox/data/XmlStore", ["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/xhr", "dojo/data/util/simpleFetch", 
		"dojo/_base/query", "dojo/_base/array", "dojo/_base/window", "dojo/data/util/filter", "dojox/xml/parser",
		"dojox/data/XmlItem"], 
  function(lang, declare, xhr, simpleFetch, domQuery, array, winUtil, filter, xmlParser, XmlItem) {

var XmlStore = declare("dojox.data.XmlStore", null, {
	//	summary:
	//		A data store for XML based services or documents
	//	description:
	//		A data store for XML based services or documents
	
	constructor: function(/* object */ args){
		//	summary:
		//		Constructor for the XML store.
		//	args:
		//		An anonymous object to initialize properties.  It expects the following values:
		//		url:		The url to a service or an XML document that represents the store
		//		rootItem:	A tag name for root items
		//		keyAttribute:	An attribute name for a key or an identity (unique identifier)
		//						Required for serverside fetchByIdentity, etc.  Not required for
		//						client side fetchItemBIdentity, as it will use an XPath-like
		//						structure if keyAttribute was not specified.  Recommended to always
		//						set this, though, for consistent identity behavior.
		// 		attributeMap:   An anonymous object contains properties for attribute mapping,
		//						{"tag_name.item_attribute_name": "@xml_attribute_name", ...}
		//		sendQuery:		A boolean indicate to add a query string to the service URL.
		//						Default is false.
		//		urlPreventCache: Parameter to indicate whether or not URL calls should apply
		//		                 the preventCache option to the xhr request.
		if(args){
			this.url = args.url;
			this.rootItem = (args.rootItem || args.rootitem || this.rootItem);
			this.keyAttribute = (args.keyAttribute || args.keyattribute || this.keyAttribute);
			this._attributeMap = (args.attributeMap || args.attributemap);
			this.label = args.label || this.label;
			this.sendQuery = (args.sendQuery || args.sendquery || this.sendQuery);
			if("urlPreventCache" in args){
				this.urlPreventCache = args.urlPreventCache?true:false;
			}
		}
		this._newItems = [];
		this._deletedItems = [];
		this._modifiedItems = [];
	},

	//Values that may be set by the parser.
	//Ergo, have to be instantiated to something
	//So the parser knows how to set them.
	url: "",

	//	A tag name for XML tags to be considered root items in the hierarchy
	rootItem: "",

	//	An attribute name for a key or an identity (unique identifier)
	//	Required for serverside fetchByIdentity, etc.  Not required for
	//	client side fetchItemBIdentity, as it will use an XPath-like
	//	structure if keyAttribute was not specified.  Recommended to always
	//	set this, though, for consistent identity behavior.
	keyAttribute: "",

	//	An attribute of the item to use as the label.
	label: "",

	//	A boolean indicate to add a query string to the service URL.
	//	Default is false.
	sendQuery: false,

	//	An anonymous object that contains properties for attribute mapping,
	//	for example {"tag_name.item_attribute_name": "@xml_attribute_name", ...}.
	//	This is optional. This is done so that attributes which are actual
	//	XML tag attributes (and not sub-tags of an XML tag), can be referenced.
	attributeMap: null,

	//	Parameter to indicate whether or not URL calls should apply the preventCache option to the xhr request.
	urlPreventCache: true,

	/* dojo.data.api.Read */

	getValue: function(/* item */ item, /* attribute || attribute-name-string */ attribute, /* value? */ defaultValue){
		//	summary:
		//		Return an attribute value
		//	description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", the tag name of the element is
		//		returned.
		//		If 'attribute' specifies "childNodes", the first element child is
		//		returned.
		//		If 'attribute' specifies "text()", the value of the first text
		//		child is returned.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the value of the XML
		//		attribute is returned.
		//		Otherwise, the first child element of the tag name specified with
		//		'attribute' is returned.
		//	item:
		//		An XML element that holds the attribute
		//	attribute:
		//		A tag name of a child element, An XML attribute name or one of
		// 		special names
		//	defaultValue:
		//		A default value
		//	returns:
		//		An attribute value found, otherwise 'defaultValue'
		var element = item.element;
		var i;
		var node;
		if(attribute === "tagName"){
			return element.nodeName;
		}else if(attribute === "childNodes"){
			for(i = 0; i < element.childNodes.length; i++){
				node = element.childNodes[i];
				if(node.nodeType === 1 /*ELEMENT_NODE*/){
					return this._getItem(node); //object
				}
			}
			return defaultValue;
		}else if(attribute === "text()"){
			for(i = 0; i < element.childNodes.length; i++){
				node = element.childNodes[i];
				if(node.nodeType === 3 /*TEXT_NODE*/ ||
					node.nodeType === 4 /*CDATA_SECTION_NODE*/){
					return node.nodeValue; //string
				}
			}
			return defaultValue;
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				var value = element.getAttribute(name);
				//Note that getAttribute will return null or empty string for undefined/unset
				//attributes, therefore, we should just check the return was valid
				//non-empty string and not null.
				return (value) ? value : defaultValue; //object
			}else{
				for(i = 0; i < element.childNodes.length; i++){
					node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						return this._getItem(node); //object
					}
				}
				return defaultValue; //object
			}
		}
	},

	getValues: function(/* item */ item, /* attribute || attribute-name-string */ attribute){
		//	summary:
		//		Return an array of attribute values
		//	description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", the tag name of the element is
		//		returned.
		//		If 'attribute' specifies "childNodes", child elements are returned.
		//		If 'attribute' specifies "text()", the values of child text nodes
		//		are returned.
		//		For generic attributes, if 'attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the value of the XML
		//		attribute is returned.
		//		Otherwise, child elements of the tag name specified with
		//		'attribute' are returned.
		//	item:
		//		An XML element that holds the attribute
		//	attribute:
		//		A tag name of child elements, An XML attribute name or one of
		//		special names
		//	returns:
		//		An array of attribute values found, otherwise an empty array
		var element = item.element;
		var values = [];
		var i;
		var node;
		if(attribute === "tagName"){
			return [element.nodeName];
		}else if(attribute === "childNodes"){
			for(i = 0; i < element.childNodes.length; i++){
				node = element.childNodes[i];
				if(node.nodeType === 1 /*ELEMENT_NODE*/){
					values.push(this._getItem(node));
				}
			}
			return values; //array
		}else if(attribute === "text()"){
			var ec = element.childNodes;
			for(i = 0; i < ec.length; i++){
				node = ec[i];
				if(node.nodeType === 3 || node.nodeType === 4){
					values.push(node.nodeValue);
				}
			}
			return values; //array
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				var value = element.getAttribute(name);
				return (value !== undefined) ? [value] : []; //array
			}else{
				for(i = 0; i < element.childNodes.length; i++){
					node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						values.push(this._getItem(node));
					}
				}
				return values; //array
			}
		}
	},

	getAttributes: function(/* item */ item){
		//	summary:
		//		Return an array of attribute names
		// 	description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
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
		var element = item.element;
		var attributes = [];
		var i;
		attributes.push("tagName");
		if(element.childNodes.length > 0){
			var names = {};
			var childNodes = true;
			var text = false;
			for(i = 0; i < element.childNodes.length; i++){
				var node = element.childNodes[i];
				if(node.nodeType === 1 /*ELEMENT_NODE*/){
					var name = node.nodeName;
					if(!names[name]){
						attributes.push(name);
						names[name] = name;
					}
					childNodes = true;
				}else if(node.nodeType === 3){
					text = true;
				}
			}
			if(childNodes){
				attributes.push("childNodes");
			}
			if(text){
				attributes.push("text()");
			}
		}
		for(i = 0; i < element.attributes.length; i++){
			attributes.push("@" + element.attributes[i].nodeName);
		}
		if(this._attributeMap){
			for(var key in this._attributeMap){
				i = key.indexOf('.');
				if(i > 0){
					var tagName = key.substring(0, i);
					if(tagName === element.nodeName){
						attributes.push(key.substring(i + 1));
					}
				}else{ // global attribute
					attributes.push(key);
				}
			}
		}
		return attributes; //array
	},

	hasAttribute: function(/* item */ item, /* attribute || attribute-name-string */ attribute){
		//	summary:
		//		Check whether an element has the attribute
		//	item:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//	attribute:
		//		A tag name of a child element, An XML attribute name or one of
		//		special names
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
		//		object containing the args for loadItem.  See dojo.data.api.Read.loadItem()
	},

	getFeatures: function(){
		//	summary:
		//		Return supported data APIs
		//	returns:
		//		"dojo.data.api.Read" and "dojo.data.api.Write"
		var features = {
			"dojo.data.api.Read": true,
			"dojo.data.api.Write": true
		};

		//Local XML parsing can implement Identity fairly simple via
		if(!this.sendQuery || this.keyAttribute !== ""){
			features["dojo.data.api.Identity"] = true;
		}
		return features; //array
	},

	getLabel: function(/* item */ item){
		//	summary:
		//		See dojo.data.api.Read.getLabel()
		if((this.label !== "") && this.isItem(item)){
			var label = this.getValue(item,this.label);
			if(label){
				return label.toString();
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

	_fetchItems: function(request, fetchHandler, errorHandler){
		//	summary:
		//		Fetch items (XML elements) that match to a query
		//	description:
		//		If 'sendQuery' is true, an XML document is loaded from
		//		'url' with a query string.
		//		Otherwise, an XML document is loaded and list XML elements that
		//		match to a query (set of element names and their text attribute
		//		values that the items to contain).
		//		A wildcard, "*" can be used to query values to match all
		//		occurrences.
		//		If 'rootItem' is specified, it is used to fetch items.
		//	request:
		//		A request object
		//	fetchHandler:
		//		A function to call for fetched items
		//	errorHandler:
		//		A function to call on error
		var url = this._getFetchUrl(request);
		if(!url){
			errorHandler(new Error("No URL specified."), request);
			return;
		}
		var localRequest = (!this.sendQuery ? request : {}); // use request for _getItems()

		var self = this;
		var getArgs = {
				url: url,
				handleAs: "xml",
				preventCache: self.urlPreventCache
			};
		var getHandler = xhr.get(getArgs);
		getHandler.addCallback(function(data){
			var items = self._getItems(data, localRequest);
			if(items && items.length > 0){
				fetchHandler(items, request);
			}else{
				fetchHandler([], request);
			}
		});
		getHandler.addErrback(function(data){
			errorHandler(data, request);
		});
	},

	_getFetchUrl: function(request){
		//	summary:
		//		Generate a URL for fetch
		//	description:
		//		This default implementation generates a query string in the form of
		//		"?name1=value1&name2=value2..." off properties of 'query' object
		//		specified in 'request' and appends it to 'url', if 'sendQuery'
		//		is set to false.
		//		Otherwise, 'url' is returned as is.
		//		Sub-classes may override this method for the custom URL generation.
		//	request:
		//		A request object
		//	returns:
		//		A fetch URL
		if(!this.sendQuery){
			return this.url;
		}
		var query = request.query;
		if(!query){
			return this.url;
		}
		if(lang.isString(query)){
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
		//	summary:
		//		Fetch items (XML elements) in an XML document based on a request
		//	description:
		//		This default implementation walks through child elements of
		//		the document element to see if all properties of 'query' object
		//		match corresponding attributes of the element (item).
		//		If 'request' is not specified, all child elements are returned.
		//		Sub-classes may override this method for the custom search in
		//		an XML document.
		//	document:
		//		An XML document
		//	request:
		//		A request object
		//	returns:
		//		An array of items
		var query = null;
		if(request){
			query = request.query;
		}
		var items = [];
		var nodes = null;

		if(this.rootItem !== ""){
			nodes = domQuery(this.rootItem, document);
		}else{
			nodes = document.documentElement.childNodes;
		}

		var deep = request.queryOptions ? request.queryOptions.deep : false;
		if(deep){
			nodes = this._flattenNodes(nodes);
		}
		for(var i = 0; i < nodes.length; i++){
			var node = nodes[i];
			if(node.nodeType != 1 /*ELEMENT_NODE*/){
				continue;
			}
			var item = this._getItem(node);
			if(query){
				var ignoreCase = request.queryOptions ? request.queryOptions.ignoreCase : false;
				var value;
				var match = false;
				var j;
				var emptyQuery = true;

				//See if there are any string values that can be regexp parsed first to avoid multiple regexp gens on the
				//same value for each item examined.  Much more efficient.
				var regexpList = {};
				for(var key in query){
					value = query[key];
					if(typeof value === "string"){
						regexpList[key] = filter.patternToRegExp(value, ignoreCase);
					}else if(value){
						// It's an object, possibly regexp, so treat it as one.
						regexpList[key] = value;
					}
				}
				for(var attribute in query){
					emptyQuery = false;
					var values = this.getValues(item, attribute);
					for(j = 0; j < values.length; j++){
						value = values[j];
						if(value){
							var queryValue = query[attribute];
							if((typeof value) === "string" &&
								(regexpList[attribute])){
								if((value.match(regexpList[attribute])) !== null){
									match = true;
								}else{
									match = false;
								}
							}else if((typeof value) === "object"){
								if(	value.toString &&
									(regexpList[attribute])){
									var stringValue = value.toString();
									if((stringValue.match(regexpList[attribute])) !== null){
										match = true;
									}else{
										match = false;
									}
								}else{
									if(queryValue === "*" || queryValue === value){
										match = true;
									}else{
										match = false;
									}
								}
							}
						}
						//One of the multiValue values matched,
						//so quit looking.
						if(match){
							break;
						}
					}
					if(!match){
						break;
					}
				}
				//Either the query was an empty object {}, which is match all, or
				//was an actual match.
				if(emptyQuery || match){
					items.push(item);
				}
			}else{
				//No query, everything matches.
				items.push(item);
			}
		}
		array.forEach(items,function(item){
			if(item.element.parentNode){
				item.element.parentNode.removeChild(item.element); // make it root
			}
		},this);
		return items;
	},

	_flattenNodes: function(nodes){
		//	Summary:
		//		Function used to flatten a hierarchy of XML nodes into a single list for
		//		querying over.  Used when deep = true;
		var flattened = [];
		if(nodes){
			var i;
			for(i = 0; i < nodes.length; i++){
				var node = nodes[i];
				flattened.push(node);
				if(node.childNodes && node.childNodes.length > 0){
					flattened = flattened.concat(this._flattenNodes(node.childNodes));
				}
			}
		}
		return flattened;
	},

	close: function(/*dojo.data.api.Request || keywordArgs || null */ request){
		 //	summary:
		 //		See dojo.data.api.Read.close()
	},

/* dojo.data.api.Write */

	newItem: function(/* object? */ keywordArgs, parentInfo){
		//	summary:
		//		Return a new dojox.data.XmlItem
		//	description:
		//		At least, 'keywordArgs' must contain "tagName" to be used for
		//		the new	element.
		//		Other attributes in 'keywordArgs' are set to the new element,
		//		including "text()", but excluding "childNodes".
		// 	keywordArgs:
		//		An object containing initial attributes
		//	returns:
		//		An XML element
		keywordArgs = (keywordArgs || {});
		var tagName = keywordArgs.tagName;
		if(!tagName){
			tagName = this.rootItem;
			if(tagName === ""){
				return null;
			}
		}

		var document = this._getDocument();
		var element = document.createElement(tagName);
		for(var attribute in keywordArgs){
			var text;
			if(attribute === "tagName"){
				continue;
			}else if(attribute === "text()"){
				text = document.createTextNode(keywordArgs[attribute]);
				element.appendChild(text);
			}else{
				attribute = this._getAttribute(tagName, attribute);
				if(attribute.charAt(0) === '@'){
					var name = attribute.substring(1);
					element.setAttribute(name, keywordArgs[attribute]);
				}else{
					var child = document.createElement(attribute);
					text = document.createTextNode(keywordArgs[attribute]);
					child.appendChild(text);
					element.appendChild(child);
				}
			}
		}

		var item = this._getItem(element);
		this._newItems.push(item);

		var pInfo = null;
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
				tempValues.push(item);
				this.setValues(parentInfo.parent, parentInfo.attribute, tempValues);
				pInfo.newValue = this.getValues(parentInfo.parent, parentInfo.attribute);
			}else{
				this.setValue(parentInfo.parent, parentInfo.attribute, item);
				pInfo.newValue = item;
			}
		}
		return item; //object
	},
	
	deleteItem: function(/* item */ item){
		//	summary:
		//		Delete an dojox.data.XmlItem (wrapper to a XML element).
		//	item:
		//		An XML element to delete
		//	returns:
		//		True
		var element = item.element;
		if(element.parentNode){
			this._backupItem(item);
			element.parentNode.removeChild(element);
			return true;
		}
		this._forgetItem(item);
		this._deletedItems.push(item);
		return true; //boolean
	},
	
	setValue: function(/* item */ item, /* attribute || string */ attribute, /* almost anything */ value){
		//	summary:
		//		Set an attribute value
		//	description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", nothing is set and false is
		//		returned.
		//		If 'attribute' specifies "childNodes", the value (XML element) is
		//		added to the element.
		//		If 'attribute' specifies "text()", a text node is created with
		//		the value and set it to the element as a child.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the value is set to the XML
		//		attribute.
		//		Otherwise, a text node is created with the value and set it to
		//		the first child element of the tag name specified with 'attribute'.
		//		If the child element does not exist, it is created.
		//	item:
		//		An XML element that holds the attribute
		//	attribute:
		//		A tag name of a child element, An XML attribute name or one of
		//		special names
		//	value:
		//		A attribute value to set
		//	returns:
		//		False for "tagName", otherwise true
		if(attribute === "tagName"){
			return false; //boolean
		}

		this._backupItem(item);

		var element = item.element;
		var child;
		var text;
		if(attribute === "childNodes"){
			child = value.element;
			element.appendChild(child);
		}else if(attribute === "text()"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
			text = this._getDocument(element).createTextNode(value);
			element.appendChild(text);
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				element.setAttribute(name, value);
			}else{
				for(var i = 0; i < element.childNodes.length; i++){
					var node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						child = node;
						break;
					}
				}
				var document = this._getDocument(element);
				if(child){
					while(child.firstChild){
						child.removeChild(child.firstChild);
					}
				}else{
					child = document.createElement(attribute);
					element.appendChild(child);
				}
				text = document.createTextNode(value);
				child.appendChild(text);
			}
		}
		return true; //boolean
	},
		
	setValues: function(/* item */ item, /* attribute || string */ attribute, /*array*/ values){
		//	summary:
		//		Set attribute values
		//	description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		If 'attribute' specifies "tagName", nothing is set and false is
		//		returned.
		//		If 'attribute' specifies "childNodes", the value (array of XML
		//		elements) is set to the element's childNodes.
		//		If 'attribute' specifies "text()", a text node is created with
		//		the values and set it to the element as a child.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the first value is set to
		//		the XML attribute.
		//		Otherwise, child elements of the tag name specified with
		//		'attribute' are replaced with new child elements and their
		//		child text nodes of values.
		//	item:
		//		An XML element that holds the attribute
		//	attribute:
		//		A tag name of child elements, an XML attribute name or one of
		//		special names
		//	value:
		//		A attribute value to set
		//	notify:
		//		A non-API optional argument, used to indicate if notification API should be called
		//		or not.

		//	returns:
		//		False for "tagName", otherwise true
		if(attribute === "tagName"){
			return false; //boolean
		}

		this._backupItem(item);

		var element = item.element;
		var i;
		var child;
		var text;
		if(attribute === "childNodes"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
			for(i = 0; i < values.length; i++){
				child = values[i].element;
				element.appendChild(child);
			}
		}else if(attribute === "text()"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
			var value = "";
			for(i = 0; i < values.length; i++){
				value += values[i];
			}
			text = this._getDocument(element).createTextNode(value);
			element.appendChild(text);
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				element.setAttribute(name, values[0]);
			}else{
				for(i = element.childNodes.length - 1; i >= 0; i--){
					var node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						element.removeChild(node);
					}
				}
				var document = this._getDocument(element);
				for(i = 0; i < values.length; i++){
					child = document.createElement(attribute);
					text = document.createTextNode(values[i]);
					child.appendChild(text);
					element.appendChild(child);
				}
			}
		}
		return true; //boolean
	},
	
	unsetAttribute: function(/* item */ item, /* attribute || string */ attribute){
		//	summary:
		//		Remove an attribute
		//	description:
		//		'item' must be an instance of a dojox.data.XmlItem from the store instance.
		//		'attribute' can be an XML attribute name of the element or one of
		//		special names described below.
		//		If 'attribute' specifies "tagName", nothing is removed and false is
		//		returned.
		//		If 'attribute' specifies "childNodes" or "text()", all child nodes
		//		are removed.
		//		For generic attributes, if '_attributeMap' is specified,
		//		an actual attribute name is looked up with the tag name of
		//		the element and 'attribute' (concatenated with '.').
		//		Then, if 'attribute' starts with "@", the XML attribute is removed.
		//		Otherwise, child elements of the tag name specified with
		//		'attribute' are removed.
		//	item:
		//		An XML element that holds the attribute
		//	attribute:
		//		A tag name of child elements, an XML attribute name or one of
		//		special names
		//	returns:
		//		False for "tagName", otherwise true
		if(attribute === "tagName"){
			return false; //boolean
		}

		this._backupItem(item);

		var element = item.element;
		if(attribute === "childNodes" || attribute === "text()"){
			while(element.firstChild){
				element.removeChild(element.firstChild);
			}
		}else{
			attribute = this._getAttribute(element.nodeName, attribute);
			if(attribute.charAt(0) === '@'){
				var name = attribute.substring(1);
				element.removeAttribute(name);
			}else{
				for(var i = element.childNodes.length - 1; i >= 0; i--){
					var node = element.childNodes[i];
					if(	node.nodeType === 1 /*ELEMENT_NODE*/ &&
						node.nodeName === attribute){
						element.removeChild(node);
					}
				}
			}
		}
		return true; //boolean
	},
	
	save: function(/* object */ keywordArgs){
		//	summary:
		//		Save new and/or modified items (XML elements)
		// 	description:
		//		'url' is used to save XML documents for new, modified and/or
		//		deleted XML elements.
		// 	keywordArgs:
		//		An object for callbacks
		if(!keywordArgs){
			keywordArgs = {};
		}
		var i;
		for(i = 0; i < this._modifiedItems.length; i++){
			this._saveItem(this._modifiedItems[i], keywordArgs, "PUT");
		}
		for(i = 0; i < this._newItems.length; i++){
			var item = this._newItems[i];
			if(item.element.parentNode){ // reparented
				this._newItems.splice(i, 1);
				i--;
				continue;
			}
			this._saveItem(this._newItems[i], keywordArgs, "POST");
		}
		for(i = 0; i < this._deletedItems.length; i++){
			this._saveItem(this._deletedItems[i], keywordArgs, "DELETE");
		}
	},

	revert: function(){
		// summary:
		//	Invalidate changes (new and/or modified elements)
		// returns:
		//	True
		this._newItems = [];
		this._restoreItems(this._deletedItems);
		this._deletedItems = [];
		this._restoreItems(this._modifiedItems);
		this._modifiedItems = [];
		return true; //boolean
	},
	
	isDirty: function(/* item? */ item){
		//	summary:
		//		Check whether an item is new, modified or deleted
		//	description:
		//		If 'item' is specified, true is returned if the item is new,
		//		modified or deleted.
		//		Otherwise, true is returned if there are any new, modified
		//		or deleted items.
		//	item:
		//		An item (XML element) to check
		//	returns:
		//		True if an item or items are new, modified or deleted, otherwise
		//		false
		if(item){
			var element = this._getRootElement(item.element);
			return (this._getItemIndex(this._newItems, element) >= 0 ||
				this._getItemIndex(this._deletedItems, element) >= 0 ||
				this._getItemIndex(this._modifiedItems, element) >= 0); //boolean
		}else{
			return (this._newItems.length > 0 ||
				this._deletedItems.length > 0 ||
				this._modifiedItems.length > 0); //boolean
		}
	},

	_saveItem: function(item, keywordArgs, method){
		var url;
		var scope;
		if(method === "PUT"){
			url = this._getPutUrl(item);
		}else if(method === "DELETE"){
			url = this._getDeleteUrl(item);
		}else{ // POST
			url = this._getPostUrl(item);
		}
		if(!url){
			if(keywordArgs.onError){
				scope = keywordArgs.scope || winUtil.global;
				keywordArgs.onError.call(scope, new Error("No URL for saving content: " + this._getPostContent(item)));
			}
			return;
		}

		var saveArgs = {
			url: url,
			method: (method || "POST"),
			contentType: "text/xml",
			handleAs: "xml"
		};
		var saveHandler;
		if(method === "PUT"){
			saveArgs.putData = this._getPutContent(item);
			saveHandler = xhr.put(saveArgs);
		}else if(method === "DELETE"){
			saveHandler = xhr.del(saveArgs);
		}else{ // POST
			saveArgs.postData = this._getPostContent(item);
			saveHandler = xhr.post(saveArgs);
		}
		scope = (keywordArgs.scope || winUtil. global);
		var self = this;
		saveHandler.addCallback(function(data){
			self._forgetItem(item);
			if(keywordArgs.onComplete){
				keywordArgs.onComplete.call(scope);
			}
		});
		saveHandler.addErrback(function(error){
			if(keywordArgs.onError){
				keywordArgs.onError.call(scope, error);
			}
		});
	},

	_getPostUrl: function(item){
		//	summary:
		//		Generate a URL for post
		//	description:
		//		This default implementation just returns 'url'.
		//		Sub-classes may override this method for the custom URL.
		//	item:
		//		An item to save
		//	returns:
		//		A post URL
		return this.url; //string
	},

	_getPutUrl: function(item){
		//	summary:
		//		Generate a URL for put
		//	description:
		//		This default implementation just returns 'url'.
		//		Sub-classes may override this method for the custom URL.
		//	item:
		//		An item to save
		//	returns:
		//		A put URL
		return this.url; //string
	},

	_getDeleteUrl: function(item){
		//	summary:
		//		Generate a URL for delete
		// 	description:
		//		This default implementation returns 'url' with 'keyAttribute'
		//		as a query string.
		//		Sub-classes may override this method for the custom URL based on
		//		changes (new, deleted, or modified).
		// 	item:
		//		An item to delete
		// 	returns:
		//		A delete URL
		var url = this.url;
		if(item && this.keyAttribute !== ""){
			var value = this.getValue(item, this.keyAttribute);
			if(value){
				var key = this.keyAttribute.charAt(0) ==='@' ? this.keyAttribute.substring(1): this.keyAttribute;
				url += url.indexOf('?') < 0 ? '?' : '&';
				url += key + '=' + value;
			}
		}
		return url;	//string
	},

	_getPostContent: function(item){
		//	summary:
		//		Generate a content to post
		// 	description:
		//		This default implementation generates an XML document for one
		//		(the first only) new or modified element.
		//		Sub-classes may override this method for the custom post content
		//		generation.
		//	item:
		//		An item to save
		//	returns:
		//		A post content
		return "<?xml version=\'1.0\'?>" + xmlParser.innerXML(item.element); //XML string
	},

	_getPutContent: function(item){
		//	summary:
		//		Generate a content to put
		// 	description:
		//		This default implementation generates an XML document for one
		//		(the first only) new or modified element.
		//		Sub-classes may override this method for the custom put content
		//		generation.
		//	item:
		//		An item to save
		//	returns:
		//		A post content
		return "<?xml version='1.0'?>" + xmlParser.innerXML(item.element); //XML string
	},

/* internal API */

	_getAttribute: function(tagName, attribute){
		if(this._attributeMap){
			var key = tagName + "." + attribute;
			var value = this._attributeMap[key];
			if(value){
				attribute = value;
			}else{ // look for global attribute
				value = this._attributeMap[attribute];
				if(value){
					attribute = value;
				}
			}
		}
		return attribute; //object
	},

	_getItem: function(element){
		try{
			var q = null;
			//Avoid function call if possible.
			if(this.keyAttribute === ""){
				q = this._getXPath(element);
			}
			return new XmlItem(element, this, q); //object
		}catch (e){
			console.log(e);
		}
		return null;
	},

	_getItemIndex: function(items, element){
		for(var i = 0; i < items.length; i++){
			if(items[i].element === element){
				return i; //int
			}
		}
		return -1; //int
	},

	_backupItem: function(item){
		var element = this._getRootElement(item.element);
		if(	this._getItemIndex(this._newItems, element) >= 0 ||
			this._getItemIndex(this._modifiedItems, element) >= 0){
			return; // new or already modified
		}
		if(element != item.element){
			item = this._getItem(element);
		}
		item._backup = element.cloneNode(true);
		this._modifiedItems.push(item);
	},

	_restoreItems: function(items){

		array.forEach(items,function(item){
			if(item._backup){
				item.element = item._backup;
				item._backup = null;
			}
		},this);
	},

	_forgetItem: function(item){
		var element = item.element;
		var index = this._getItemIndex(this._newItems, element);
		if(index >= 0){
			this._newItems.splice(index, 1);
		}
		index = this._getItemIndex(this._deletedItems, element);
		if(index >= 0){
			this._deletedItems.splice(index, 1);
		}
		index = this._getItemIndex(this._modifiedItems, element);
		if(index >= 0){
			this._modifiedItems.splice(index, 1);
		}
	},

	_getDocument: function(element){
		if(element){
			return element.ownerDocument; //DOMDocument
		}else if(!this._document){
			return xmlParser.parse(); // DOMDocument
		}
		return null; //null
	},

	_getRootElement: function(element){
		while(element.parentNode){
			element = element.parentNode;
		}
		return element; //DOMElement
	},

	_getXPath: function(element){
		//	summary:
		//		A function to compute the xpath of a node in a DOM document.
		//	description:
		//		A function to compute the xpath of a node in a DOM document.  Used for
		//		Client side query handling and identity.
		var xpath = null;
		if(!this.sendQuery){
			//xpath should be null for any server queries, as we don't have the entire
			//XML dom to figure it out.
			var node = element;
			xpath = "";
			while(node && node != element.ownerDocument){
				var pos = 0;
				var sibling = node;
				var name = node.nodeName;
				while(sibling){
					sibling = sibling.previousSibling;
					if(sibling && sibling.nodeName === name){
						pos++;
					}
				}
				var temp = "/" + name + "[" + pos + "]";
				if(xpath){
					xpath = temp + xpath;
				}else{
					xpath = temp;
				}
				node = node.parentNode;
			}
		}
		return xpath; //string
	},

	/*************************************
	 * Dojo.data Identity implementation *
	 *************************************/
	getIdentity: function(/* item */ item){
		//	summary:
		//		Returns a unique identifier for an item.
		//	item:
		//		The XML Item from the store from which to obtain its identifier.
		if(!this.isItem(item)){
			throw new Error("dojox.data.XmlStore: Object supplied to getIdentity is not an item");
		}else{
			var id = null;
			if(this.sendQuery && this.keyAttribute !== ""){
				id = this.getValue(item, this.keyAttribute).toString();
			}else if(!this.serverQuery){
				if(this.keyAttribute !== ""){
					id = this.getValue(item,this.keyAttribute).toString();
				}else{
					//No specified identity, so return the dojo.query/xpath
					//for the node as fallback.
					id = item.q;
				}
			}
			return id; //String.
		}
	},

	getIdentityAttributes: function(/* item */ item){
		//	summary:
		//		Returns an array of attribute names that are used to generate the identity.
		//	description:
		//		For XmlStore, if sendQuery is false and no keyAttribute was set, then this function
		//		returns null, as xpath is used for the identity, which is not a public attribute of
		//		the item.  If sendQuery is true and keyAttribute is set, then this function
		//		returns an array of one attribute name: keyAttribute.   This means the server side
		//		implementation must apply a keyAttribute to a returned node that always allows
		//		it to be looked up again.
		//	item:
		//		The item from the store from which to obtain the array of public attributes that
		//		compose the identifier, if any.
		if(!this.isItem(item)){
			throw new Error("dojox.data.XmlStore: Object supplied to getIdentity is not an item");
		}else{
			if(this.keyAttribute !== ""){
				return [this.keyAttribute]; //array
			}else{
				//Otherwise it's either using xpath (not an attribute), or the remote store
				//doesn't support identity.
				return null; //null
			}
		}
	},


	fetchItemByIdentity: function(/* object */ keywordArgs){
		//	summary:
		//		See dojo.data.api.Identity.fetchItemByIdentity(keywordArgs)
		var handleDocument = null;
		var scope = null;
		var self = this;
		var url = null;
		var getArgs = null;
		var getHandler = null;

		if(!self.sendQuery){
			handleDocument = function(data){
				if(data){
					if(self.keyAttribute !== ""){
						//We have a key attribute specified.  So ... we can process the items and locate the item
						//that contains a matching key attribute.  Its identity, as it were.
						var request = {};
						request.query={};
						request.query[self.keyAttribute] = keywordArgs.identity;
						request.queryOptions = {deep: true};
						var items = self._getItems(data,request);
						scope = keywordArgs.scope || winUtil.global;
						if(items.length === 1){
							if(keywordArgs.onItem){
								keywordArgs.onItem.call(scope, items[0]);
							}
						}else if(items.length === 0){
							if(keywordArgs.onItem){
								keywordArgs.onItem.call(scope, null);
							}
						}else{
							if(keywordArgs.onError){
								keywordArgs.onError.call(scope, new Error("Items array size for identity lookup greater than 1, invalid keyAttribute."));
							}
						}
					}else{
						//Since dojo.query doesn't really support the functions needed
						//to do child node selection on IE well and since xpath support
						//is flakey across browsers, it's simpler to implement a
						//pseudo-xpath parser here.
						var qArgs = keywordArgs.identity.split("/");
						var i;
						var node = data;
						for(i = 0; i < qArgs.length; i++){
							if(qArgs[i] && qArgs[i] !== ""){
								var section = qArgs[i];
								section = section.substring(0,section.length - 1);
								var vals = section.split("[");
								var tag = vals[0];
								var index = parseInt(vals[1], 10);
								var pos = 0;
								if(node){
									var cNodes = node.childNodes;
									if(cNodes){
										var j;
										var foundNode = null;
										for(j = 0; j < cNodes.length; j++){
											var pNode = cNodes[j];
											if(pNode.nodeName === tag){
												if(pos < index){
													pos++;
												}else{
													foundNode = pNode;
													break;
												}
											}
										}
										if(foundNode){
											node = foundNode;
										}else{
											node = null;
										}
									}else{
										node = null;
									}
								}else{
									break;
								}
							}
						}
						//Return what we found, if any.
						var item = null;
						if(node){
							item = self._getItem(node);
							if(item.element.parentNode){
								item.element.parentNode.removeChild(item.element);
							}
						}
						if(keywordArgs.onItem){
							scope = keywordArgs.scope || winUtil.global;
							keywordArgs.onItem.call(scope, item);
						}
					}
				}
			};
			url = this._getFetchUrl(null);
			getArgs = {
				url: url,
				handleAs: "xml",
				preventCache: self.urlPreventCache
			};
			getHandler = xhr.get(getArgs);
			
			//Add in the callbacks for completion of data load.
			getHandler.addCallback(handleDocument);
			if(keywordArgs.onError){
				getHandler.addErrback(function(error){
					var s = keywordArgs.scope || winUtil.global;
					keywordArgs.onError.call(s, error);
				});
			}
		}else{
			//Server side querying, so need to pass the keyAttribute back to the server and let it return
			//what it will.  It SHOULD be only one item.
			if(self.keyAttribute !== ""){
				var request = {query:{}};
				request.query[self.keyAttribute] = keywordArgs.identity;
				url = this._getFetchUrl(request);
				handleDocument = function(data){
					var item = null;
					if(data){
						var items = self._getItems(data, {});
						if(items.length === 1){
							item = items[0];
						}else{
							if(keywordArgs.onError){
								var scope = keywordArgs.scope || winUtil.global;
								keywordArgs.onError.call(scope, new Error("More than one item was returned from the server for the denoted identity"));
							}
						}
					}
					if(keywordArgs.onItem){
						scope = keywordArgs.scope || winUtil.global;
						keywordArgs.onItem.call(scope, item);
					}
				};

				getArgs = {
					url: url,
					handleAs: "xml",
					preventCache: self.urlPreventCache
				};
				getHandler = xhr.get(getArgs);

				//Add in the callbacks for completion of data load.
				getHandler.addCallback(handleDocument);
				if(keywordArgs.onError){
					getHandler.addErrback(function(error){
						var s = keywordArgs.scope || winUtil.global;
						keywordArgs.onError.call(s, error);
					});
				}
			}else{
				if(keywordArgs.onError){
					var s = keywordArgs.scope || winUtil.global;
					keywordArgs.onError.call(s, new Error("XmlStore is not told that the server to provides identity support.  No keyAttribute specified."));
				}
			}
		}
	}
});

lang.extend(XmlStore,simpleFetch);

return XmlStore;
});

},
'dojo/_base/query':function(){
define("dojo/_base/query", ["./kernel", "../query", "./NodeList"], function(dojo){
	return dojo.query;
});

},
'*noref':1}});
define("dojox/_dojox_data_basic", [], 1);
require(["dojox/data/XmlStore","dojox/data/CsvStore"]);

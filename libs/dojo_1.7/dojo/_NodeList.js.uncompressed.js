require({cache:{
'dojo/NodeList-manipulate':function(){
define("dojo/NodeList-manipulate", ["./query", "./_base/lang", "./_base/array", "./dom-construct", "./NodeList-dom"], function(dquery, lang, array, construct) {
	// module:
	//		dojo/NodeList-manipulate
	// summary:
	//		TODOC

var NodeList = dquery.NodeList;

/*=====
dojo["NodeList-manipulate"] = {
	// summary: Adds a chainable methods to dojo.query() / Nodelist instances for manipulating HTML
	// and DOM nodes and their properties.
};

// doc alias helpers:
NodeList = dojo.NodeList;
=====*/

//TODO: add a way to parse for widgets in the injected markup?

	function getText(/*DOMNode*/node){
		// summary:
		// 		recursion method for text() to use. Gets text value for a node.
		// description:
		// 		Juse uses nodedValue so things like <br/> tags do not end up in
		// 		the text as any sort of line return.
		var text = "", ch = node.childNodes;
		for(var i = 0, n; n = ch[i]; i++){
			//Skip comments.
			if(n.nodeType != 8){
				if(n.nodeType == 1){
					text += getText(n);
				}else{
					text += n.nodeValue;
				}
			}
		}
		return text;
	}

	function getWrapInsertion(/*DOMNode*/node){
		// summary:
		// 		finds the innermost element to use for wrap insertion.

		//Make it easy, assume single nesting, no siblings.
		while(node.childNodes[0] && node.childNodes[0].nodeType == 1){
			node = node.childNodes[0];
		}
		return node; //DOMNode
	}

	function makeWrapNode(/*DOMNode||String*/html, /*DOMNode*/refNode){
		// summary:
		// 		convert HTML into nodes if it is not already a node.
		if(typeof html == "string"){
			html = construct.toDom(html, (refNode && refNode.ownerDocument));
			if(html.nodeType == 11){
				//DocumentFragment cannot handle cloneNode, so choose first child.
				html = html.childNodes[0];
			}
		}else if(html.nodeType == 1 && html.parentNode){
			//This element is already in the DOM clone it, but not its children.
			html = html.cloneNode(false);
		}
		return html; /*DOMNode*/
	}

	lang.extend(NodeList, {
		_placeMultiple: function(/*String||Node||NodeList*/query, /*String*/position){
			// summary:
			// 		private method for inserting queried nodes into all nodes in this NodeList
			// 		at different positions. Differs from NodeList.place because it will clone
			// 		the nodes in this NodeList if the query matches more than one element.
			var nl2 = typeof query == "string" || query.nodeType ? dquery(query) : query;
			var toAdd = [];
			for(var i = 0; i < nl2.length; i++){
				//Go backwards in DOM to make dom insertions easier via insertBefore
				var refNode = nl2[i];
				var length = this.length;
				for(var j = length - 1, item; item = this[j]; j--){
					if(i > 0){
						//Need to clone the item. This also means
						//it needs to be added to the current NodeList
						//so it can also be the target of other chaining operations.
						item = this._cloneNode(item);
						toAdd.unshift(item);
					}
					if(j == length - 1){
						construct.place(item, refNode, position);
					}else{
						refNode.parentNode.insertBefore(item, refNode);
					}
					refNode = item;
				}
			}

			if(toAdd.length){
				//Add the toAdd items to the current NodeList. Build up list of args
				//to pass to splice.
				toAdd.unshift(0);
				toAdd.unshift(this.length - 1);
				Array.prototype.splice.apply(this, toAdd);
			}

			return this; //dojo.NodeList
		},

		innerHTML: function(/*String?||DOMNode?|NodeList?*/value){
			// summary:
			// 		allows setting the innerHTML of each node in the NodeList,
			// 		if there is a value passed in, otherwise, reads the innerHTML value of the first node.
			// description:
			// 		This method is simpler than the dojo.NodeList.html() method provided by
			// 		`dojo.NodeList-html`. This method just does proper innerHTML insertion of HTML fragments,
			// 		and it allows for the innerHTML to be read for the first node in the node list.
			// 		Since dojo.NodeList-html already took the "html" name, this method is called
			// 		"innerHTML". However, if dojo.NodeList-html has not been loaded yet, this
			// 		module will define an "html" method that can be used instead. Be careful if you
			// 		are working in an environment where it is possible that dojo.NodeList-html could
			// 		have been loaded, since its definition of "html" will take precedence.
			// 		The nodes represented by the value argument will be cloned if more than one
			// 		node is in this NodeList. The nodes in this NodeList are returned in the "set"
			// 		usage of this method, not the HTML that was inserted.
			//	returns:
			//		if no value is passed, the result is String, the innerHTML of the first node.
			//		If a value is passed, the return is this dojo.NodeList
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"></div>
			//	|	<div id="bar"></div>
			//		This code inserts <p>Hello World</p> into both divs:
			//	|	dojo.query("div").innerHTML("<p>Hello World</p>");
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		This code returns "<p>Hello Mars</p>":
			//	|	var message = dojo.query("div").innerHTML();
			if(arguments.length){
				return this.addContent(value, "only"); //dojo.NodeList
			}else{
				return this[0].innerHTML; //String
			}
		},

		/*=====
		html: function(value){
			// summary:
			//		see the information for "innerHTML". "html" is an alias for "innerHTML", but is
			// 		only defined if dojo.NodeList-html has not been loaded.
			// description:
			// 		An alias for the "innerHTML" method, but only defined if there is not an existing
			// 		"html" method on dojo.NodeList. Be careful if you are working in an environment
			// 		where it is possible that dojo.NodeList-html could have been loaded, since its
			// 		definition of "html" will take precedence. If you are not sure if dojo.NodeList-html
			// 		could be loaded, use the "innerHTML" method.
			//	value: String?||DOMNode?||NodeList?
			//		optional. The HTML fragment to use as innerHTML. If value is not passed, then the innerHTML
			// 		of the first element in this NodeList is returned.
			//	returns:
			//		if no value is passed, the result is String, the innerHTML of the first node.
			//		If a value is passed, the return is this dojo.NodeList
			return; // dojo.NodeList
			return; // String
		},
		=====*/

		text: function(/*String*/value){
			// summary:
			// 		allows setting the text value of each node in the NodeList,
			// 		if there is a value passed in, otherwise, returns the text value for all the
			// 		nodes in the NodeList in one string.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"></div>
			//	|	<div id="bar"></div>
			//		This code inserts "Hello World" into both divs:
			//	|	dojo.query("div").text("Hello World");
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars <span>today</span></p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		This code returns "Hello Mars today":
			//	|	var message = dojo.query("div").text();
			//	returns:
			//		if no value is passed, the result is String, the text value of the first node.
			//		If a value is passed, the return is this dojo.NodeList
			if(arguments.length){
				for(var i = 0, node; node = this[i]; i++){
					if(node.nodeType == 1){
						construct.empty(node);
						node.appendChild(node.ownerDocument.createTextNode(value));
					}
				}
				return this; //dojo.NodeList
			}else{
				var result = "";
				for(i = 0; node = this[i]; i++){
					result += getText(node);
				}
				return result; //String
			}
		},

		val: function(/*String||Array*/value){
			// summary:
			// 		If a value is passed, allows seting the value property of form elements in this
			// 		NodeList, or properly selecting/checking the right value for radio/checkbox/select
			// 		elements. If no value is passed, the value of the first node in this NodeList
			// 		is returned.
			//	returns:
			//		if no value is passed, the result is String or an Array, for the value of the
			//		first node.
			//		If a value is passed, the return is this dojo.NodeList
			//	example:
			//		assume a DOM created by this markup:
			//	|	<input type="text" value="foo">
			//	|	<select multiple>
			//	|		<option value="red" selected>Red</option>
			//	|		<option value="blue">Blue</option>
			//	|		<option value="yellow" selected>Yellow</option>
			//	|	</select>
			//		This code gets and sets the values for the form fields above:
			//	|	dojo.query('[type="text"]').val(); //gets value foo
			//	|	dojo.query('[type="text"]').val("bar"); //sets the input's value to "bar"
			// 	|	dojo.query("select").val() //gets array value ["red", "yellow"]
			// 	|	dojo.query("select").val(["blue", "yellow"]) //Sets the blue and yellow options to selected.

			//Special work for input elements.
			if(arguments.length){
				var isArray = lang.isArray(value);
				for(var index = 0, node; node = this[index]; index++){
					var name = node.nodeName.toUpperCase();
					var type = node.type;
					var newValue = isArray ? value[index] : value;

					if(name == "SELECT"){
						var opts = node.options;
						for(var i = 0; i < opts.length; i++){
							var opt = opts[i];
							if(node.multiple){
								opt.selected = (array.indexOf(value, opt.value) != -1);
							}else{
								opt.selected = (opt.value == newValue);
							}
						}
					}else if(type == "checkbox" || type == "radio"){
						node.checked = (node.value == newValue);
					}else{
						node.value = newValue;
					}
				}
				return this; //dojo.NodeList
			}else{
				//node already declared above.
				node = this[0];
				if(!node || node.nodeType != 1){
					return undefined;
				}
				value = node.value || "";
				if(node.nodeName.toUpperCase() == "SELECT" && node.multiple){
					//A multivalued selectbox. Do the pain.
					value = [];
					//opts declared above in if block.
					opts = node.options;
					//i declared above in if block;
					for(i = 0; i < opts.length; i++){
						//opt declared above in if block
						opt = opts[i];
						if(opt.selected){
							value.push(opt.value);
						}
					}
					if(!value.length){
						value = null;
					}
				}
				return value; //String||Array
			}
		},

		append: function(/*String||DOMNode||NodeList*/content){
			// summary:
			// 		appends the content to every node in the NodeList.
			// description:
			// 		The content will be cloned if the length of NodeList
			// 		is greater than 1. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").append("<span>append</span>");
			//		Results in this DOM structure:
			//	|	<div id="foo"><p>Hello Mars</p><span>append</span></div>
			//	|	<div id="bar"><p>Hello World</p><span>append</span></div>
			return this.addContent(content, "last"); //dojo.NodeList
		},

		appendTo: function(/*String*/query){
			// summary:
			// 		appends nodes in this NodeList to the nodes matched by
			// 		the query passed to appendTo.
			// description:
			// 		The nodes in this NodeList will be cloned if the query
			// 		matches more than one element. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<span>append</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").appendTo("p");
			//		Results in this DOM structure:
			//	|	<p>Hello Mars<span>append</span></p>
			//	|	<p>Hello World<span>append</span></p>
			return this._placeMultiple(query, "last"); //dojo.NodeList
		},

		prepend: function(/*String||DOMNode||NodeList*/content){
			// summary:
			// 		prepends the content to every node in the NodeList.
			// description:
			// 		The content will be cloned if the length of NodeList
			// 		is greater than 1. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").prepend("<span>prepend</span>");
			//		Results in this DOM structure:
			//	|	<div id="foo"><span>prepend</span><p>Hello Mars</p></div>
			//	|	<div id="bar"><span>prepend</span><p>Hello World</p></div>
			return this.addContent(content, "first"); //dojo.NodeList
		},

		prependTo: function(/*String*/query){
			// summary:
			// 		prepends nodes in this NodeList to the nodes matched by
			// 		the query passed to prependTo.
			// description:
			// 		The nodes in this NodeList will be cloned if the query
			// 		matches more than one element. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<span>prepend</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").prependTo("p");
			//		Results in this DOM structure:
			//	|	<p><span>prepend</span>Hello Mars</p>
			//	|	<p><span>prepend</span>Hello World</p>
			return this._placeMultiple(query, "first"); //dojo.NodeList
		},

		after: function(/*String||Element||NodeList*/content){
			// summary:
			// 		Places the content after every node in the NodeList.
			// description:
			// 		The content will be cloned if the length of NodeList
			// 		is greater than 1. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").after("<span>after</span>");
			//		Results in this DOM structure:
			//	|	<div id="foo"><p>Hello Mars</p></div><span>after</span>
			//	|	<div id="bar"><p>Hello World</p></div><span>after</span>
			return this.addContent(content, "after"); //dojo.NodeList
		},

		insertAfter: function(/*String*/query){
			// summary:
			// 		The nodes in this NodeList will be placed after the nodes
			// 		matched by the query passed to insertAfter.
			// description:
			// 		The nodes in this NodeList will be cloned if the query
			// 		matches more than one element. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<span>after</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").insertAfter("p");
			//		Results in this DOM structure:
			//	|	<p>Hello Mars</p><span>after</span>
			//	|	<p>Hello World</p><span>after</span>
			return this._placeMultiple(query, "after"); //dojo.NodeList
		},

		before: function(/*String||DOMNode||NodeList*/content){
			// summary:
			// 		Places the content before every node in the NodeList.
			// description:
			// 		The content will be cloned if the length of NodeList
			// 		is greater than 1. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the appended content.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo"><p>Hello Mars</p></div>
			//	|	<div id="bar"><p>Hello World</p></div>
			//		Running this code:
			//	|	dojo.query("div").before("<span>before</span>");
			//		Results in this DOM structure:
			//	|	<span>before</span><div id="foo"><p>Hello Mars</p></div>
			//	|	<span>before</span><div id="bar"><p>Hello World</p></div>
			return this.addContent(content, "before"); //dojo.NodeList
		},

		insertBefore: function(/*String*/query){
			// summary:
			// 		The nodes in this NodeList will be placed after the nodes
			// 		matched by the query passed to insertAfter.
			// description:
			// 		The nodes in this NodeList will be cloned if the query
			// 		matches more than one element. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		dojo.NodeList, the nodes currently in this NodeList will be returned,
			//		not the matched nodes from the query.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<span>before</span>
			//	|	<p>Hello Mars</p>
			//	|	<p>Hello World</p>
			//		Running this code:
			//	|	dojo.query("span").insertBefore("p");
			//		Results in this DOM structure:
			//	|	<span>before</span><p>Hello Mars</p>
			//	|	<span>before</span><p>Hello World</p>
			return this._placeMultiple(query, "before"); //dojo.NodeList
		},

		/*=====
		remove: function(simpleFilter){
			//	summary:
			//		alias for dojo.NodeList's orphan method. Removes elements
			// 		in this list that match the simple filter from their parents
			// 		and returns them as a new NodeList.
			//	simpleFilter: String
			//		single-expression CSS rule. For example, ".thinger" or
			//		"#someId[attrName='value']" but not "div > span". In short,
			//		anything which does not invoke a descent to evaluate but
			//		can instead be used to test a single node is acceptable.
			//	returns:
			//		dojo.NodeList
			return; // dojo.NodeList
		},
		=====*/
		remove: NodeList.prototype.orphan,

		wrap: function(/*String||DOMNode*/html){
			// summary:
			// 		Wrap each node in the NodeList with html passed to wrap.
			// description:
			// 		html will be cloned if the NodeList has more than one
			// 		element. Only DOM nodes are cloned, not any attached
			// 		event handlers.
			// returns:
			//		dojo.NodeList, the nodes in the current NodeList will be returned,
			//		not the nodes from html argument.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<b>one</b>
			//	|	<b>two</b>
			//		Running this code:
			//	|	dojo.query("b").wrap("<div><span></span></div>");
			//		Results in this DOM structure:
			//	|	<div><span><b>one</b></span></div>
			//	|	<div><span><b>two</b></span></div>
			if(this[0]){
				html = makeWrapNode(html, this[0]);

				//Now cycle through the elements and do the insertion.
				for(var i = 0, node; node = this[i]; i++){
					//Always clone because if html is used to hold one of
					//the "this" nodes, then on the clone of html it will contain
					//that "this" node, and that would be bad.
					var clone = this._cloneNode(html);
					if(node.parentNode){
						node.parentNode.replaceChild(clone, node);
					}
					//Find deepest element and insert old node in it.
					var insertion = getWrapInsertion(clone);
					insertion.appendChild(node);
				}
			}
			return this; //dojo.NodeList
		},

		wrapAll: function(/*String||DOMNode*/html){
			// summary:
			// 		Insert html where the first node in this NodeList lives, then place all
			// 		nodes in this NodeList as the child of the html.
			// returns:
			//		dojo.NodeList, the nodes in the current NodeList will be returned,
			//		not the nodes from html argument.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").wrapAll('<div class="allRed"></div>');
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="allRed">
			// 	|			<div class="red">Red One</div>
			// 	|			<div class="red">Red Two</div>
			// 	|		</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			if(this[0]){
				html = makeWrapNode(html, this[0]);

				//Place the wrap HTML in place of the first node.
				this[0].parentNode.replaceChild(html, this[0]);

				//Now cycle through the elements and move them inside
				//the wrap.
				var insertion = getWrapInsertion(html);
				for(var i = 0, node; node = this[i]; i++){
					insertion.appendChild(node);
				}
			}
			return this; //dojo.NodeList
		},

		wrapInner: function(/*String||DOMNode*/html){
			// summary:
			// 		For each node in the NodeList, wrap all its children with the passed in html.
			// description:
			// 		html will be cloned if the NodeList has more than one
			// 		element. Only DOM nodes are cloned, not any attached
			// 		event handlers.
			// returns:
			//		dojo.NodeList, the nodes in the current NodeList will be returned,
			//		not the nodes from html argument.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").wrapInner('<span class="special"></span>');
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="red"><span class="special">Red One</span></div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red"><span class="special">Red Two</span></div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			if(this[0]){
				html = makeWrapNode(html, this[0]);
				for(var i = 0; i < this.length; i++){
					//Always clone because if html is used to hold one of
					//the "this" nodes, then on the clone of html it will contain
					//that "this" node, and that would be bad.
					var clone = this._cloneNode(html);

					//Need to convert the childNodes to an array since wrapAll modifies the
					//DOM and can change the live childNodes NodeList.
					this._wrap(lang._toArray(this[i].childNodes), null, this._NodeListCtor).wrapAll(clone);
				}
			}
			return this; //dojo.NodeList
		},

		replaceWith: function(/*String||DOMNode||NodeList*/content){
			// summary:
			// 		Replaces each node in ths NodeList with the content passed to replaceWith.
			// description:
			// 		The content will be cloned if the length of NodeList
			// 		is greater than 1. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		The nodes currently in this NodeList will be returned, not the replacing content.
			//		Note that the returned nodes have been removed from the DOM.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").replaceWith('<div class="green">Green</div>');
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="green">Green</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="green">Green</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			content = this._normalize(content, this[0]);
			for(var i = 0, node; node = this[i]; i++){
				this._place(content, node, "before", i > 0);
				node.parentNode.removeChild(node);
			}
			return this; //dojo.NodeList
		},

		replaceAll: function(/*String*/query){
			// summary:
			// 		replaces nodes matched by the query passed to replaceAll with the nodes
			// 		in this NodeList.
			// description:
			// 		The nodes in this NodeList will be cloned if the query
			// 		matches more than one element. Only the DOM nodes are cloned, not
			// 		any attached event handlers.
			// returns:
			//		The nodes currently in this NodeList will be returned, not the matched nodes
			//		from the query. The nodes currently in this NodeLIst could have
			//		been cloned, so the returned NodeList will include the cloned nodes.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").replaceAll(".blue");
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="spacer">___</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="red">Red Two</div>
			//	|	</div>
			var nl = dquery(query);
			var content = this._normalize(this, this[0]);
			for(var i = 0, node; node = nl[i]; i++){
				this._place(content, node, "before", i > 0);
				node.parentNode.removeChild(node);
			}
			return this; //dojo.NodeList
		},

		clone: function(){
			// summary:
			// 		Clones all the nodes in this NodeList and returns them as a new NodeList.
			// description:
			// 		Only the DOM nodes are cloned, not any attached event handlers.
			// returns:
			//		dojo.NodeList, a cloned set of the original nodes.
			//	example:
			//		assume a DOM created by this markup:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			//	|	</div>
			//		Running this code:
			//	|	dojo.query(".red").clone().appendTo(".container");
			//		Results in this DOM structure:
			//	|	<div class="container">
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="blue">Blue One</div>
			// 	|		<div class="red">Red Two</div>
			// 	|		<div class="blue">Blue Two</div>
			// 	|		<div class="red">Red One</div>
			// 	|		<div class="red">Red Two</div>
			//	|	</div>

			//TODO: need option to clone events?
			var ary = [];
			for(var i = 0; i < this.length; i++){
				ary.push(this._cloneNode(this[i]));
			}
			return this._wrap(ary, this, this._NodeListCtor); //dojo.NodeList
		}
	});

	//set up html method if one does not exist
	if(!NodeList.prototype.html){
		NodeList.prototype.html = NodeList.prototype.innerHTML;
	}

return NodeList;
});

},
'dojo/NodeList-fx':function(){
define("dojo/NodeList-fx", ["./_base/NodeList", "./_base/lang", "./_base/connect", "./_base/fx", "./fx"],
  function(NodeList, lang, connectLib, baseFx, coreFx) {
	// module:
	//		dojo/NodeList-fx
	// summary:
	//		TODOC

/*=====
dojo["NodeList-fx"] = {
	// summary: Adds dojo.fx animation support to dojo.query() by extending the NodeList class
	//		with additional FX functions.  NodeList is the array-like object used to hold query results.
};

// doc alias helpers:
NodeList = dojo.NodeList;
=====*/

lang.extend(NodeList, {
	_anim: function(obj, method, args){
		args = args||{};
		var a = coreFx.combine(
			this.map(function(item){
				var tmpArgs = { node: item };
				lang.mixin(tmpArgs, args);
				return obj[method](tmpArgs);
			})
		);
		return args.auto ? a.play() && this : a; // dojo.Animation|dojo.NodeList
	},

	wipeIn: function(args){
		// summary:
		//		wipe in all elements of this NodeList via `dojo.fx.wipeIn`
		//
		// args: Object?
		//		Additional dojo.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo.Animation|dojo.NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo.NodeList will be returned for further
		//		chaining. Otherwise the dojo.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Fade in all tables with class "blah":
		//		|	dojo.query("table.blah").wipeIn().play();
		//
		// example:
		//		Utilizing `auto` to get the NodeList back:
		//		|	dojo.query(".titles").wipeIn({ auto:true }).onclick(someFunction);
		//
		return this._anim(coreFx, "wipeIn", args); // dojo.Animation|dojo.NodeList
	},

	wipeOut: function(args){
		// summary:
		//		wipe out all elements of this NodeList via `dojo.fx.wipeOut`
		//
		// args: Object?
		//		Additional dojo.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo.Animation|dojo.NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo.NodeList will be returned for further
		//		chaining. Otherwise the dojo.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Wipe out all tables with class "blah":
		//		|	dojo.query("table.blah").wipeOut().play();
		return this._anim(coreFx, "wipeOut", args); // dojo.Animation|dojo.NodeList
	},

	slideTo: function(args){
		// summary:
		//		slide all elements of the node list to the specified place via `dojo.fx.slideTo`
		//
		// args: Object?
		//		Additional dojo.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo.Animation|dojo.NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo.NodeList will be returned for further
		//		chaining. Otherwise the dojo.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		|	Move all tables with class "blah" to 300/300:
		//		|	dojo.query("table.blah").slideTo({
		//		|		left: 40,
		//		|		top: 50
		//		|	}).play();
		return this._anim(coreFx, "slideTo", args); // dojo.Animation|dojo.NodeList
	},


	fadeIn: function(args){
		// summary:
		//		fade in all elements of this NodeList via `dojo.fadeIn`
		//
		// args: Object?
		//		Additional dojo.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo.Animation|dojo.NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo.NodeList will be returned for further
		//		chaining. Otherwise the dojo.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Fade in all tables with class "blah":
		//		|	dojo.query("table.blah").fadeIn().play();
		return this._anim(baseFx, "fadeIn", args); // dojo.Animation|dojo.NodeList
	},

	fadeOut: function(args){
		// summary:
		//		fade out all elements of this NodeList via `dojo.fadeOut`
		//
		// args: Object?
		//		Additional dojo.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo.Animation|dojo.NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo.NodeList will be returned for further
		//		chaining. Otherwise the dojo.Animation instance is returned and must be .play()'ed
		//
		// example:
		//		Fade out all elements with class "zork":
		//		|	dojo.query(".zork").fadeOut().play();
		// example:
		//		Fade them on a delay and do something at the end:
		//		|	var fo = dojo.query(".zork").fadeOut();
		//		|	dojo.connect(fo, "onEnd", function(){ /*...*/ });
		//		|	fo.play();
		// example:
		//		Using `auto`:
		//		|	dojo.query("li").fadeOut({ auto:true }).filter(filterFn).forEach(doit);
		//
		return this._anim(baseFx, "fadeOut", args); // dojo.Animation|dojo.NodeList
	},

	animateProperty: function(args){
		// summary:
		//		Animate all elements of this NodeList across the properties specified.
		//		syntax identical to `dojo.animateProperty`
		//
		// args: Object?
		//		Additional dojo.Animation arguments to mix into this set with the addition of
		//		an `auto` parameter.
		//
		// returns: dojo.Animation|dojo.NodeList
		//		A special args member `auto` can be passed to automatically play the animation.
		//		If args.auto is present, the original dojo.NodeList will be returned for further
		//		chaining. Otherwise the dojo.Animation instance is returned and must be .play()'ed
		//
		// example:
		//	|	dojo.query(".zork").animateProperty({
		//	|		duration: 500,
		//	|		properties: {
		//	|			color:		{ start: "black", end: "white" },
		//	|			left:		{ end: 300 }
		//	|		}
		//	|	}).play();
		//
		//	example:
		//	|	dojo.query(".grue").animateProperty({
		//	|		auto:true,
		//	|		properties: {
		//	|			height:240
		//	|		}
		//	|	}).onclick(handler);
		return this._anim(baseFx, "animateProperty", args); // dojo.Animation|dojo.NodeList
	},

	anim: function( /*Object*/			properties,
					/*Integer?*/		duration,
					/*Function?*/		easing,
					/*Function?*/		onEnd,
					/*Integer?*/		delay){
		// summary:
		//		Animate one or more CSS properties for all nodes in this list.
		//		The returned animation object will already be playing when it
		//		is returned. See the docs for `dojo.anim` for full details.
		// properties: Object
		//		the properties to animate. does NOT support the `auto` parameter like other
		//		NodeList-fx methods.
		// duration: Integer?
		//		Optional. The time to run the animations for
		// easing: Function?
		//		Optional. The easing function to use.
		// onEnd: Function?
		//		A function to be called when the animation ends
		// delay:
		//		how long to delay playing the returned animation
		// example:
		//		Another way to fade out:
		//	|	dojo.query(".thinger").anim({ opacity: 0 });
		// example:
		//		animate all elements with the "thigner" class to a width of 500
		//		pixels over half a second
		//	|	dojo.query(".thinger").anim({ width: 500 }, 700);
		var canim = coreFx.combine(
			this.map(function(item){
				return baseFx.animateProperty({
					node: item,
					properties: properties,
					duration: duration||350,
					easing: easing
				});
			})
		);
		if(onEnd){
			connectLib.connect(canim, "onEnd", onEnd);
		}
		return canim.play(delay||0); // dojo.Animation
	}
});

return NodeList;
});

},
'dojo/NodeList-traverse':function(){
define("dojo/NodeList-traverse", ["./query", "./_base/lang", "./_base/array"], function(dquery, lang, array) {
	// module:
	//		dojo/NodeList-traverse
	// summary:
	//		TODOC

var NodeList = dquery.NodeList;

/*=====
dojo["NodeList-traverse"] = {
	// summary: Adds a chainable methods to dojo.query() / Nodelist instances for traversing the DOM
};

// doc alias helpers:
NodeList = dojo.NodeList;
=====*/

lang.extend(NodeList, {
	_buildArrayFromCallback: function(/*Function*/callback){
		// summary:
		// 		builds a new array of possibly differing size based on the input list.
		// 		Since the returned array is likely of different size than the input array,
		// 		the array's map function cannot be used.
		var ary = [];
		for(var i = 0; i < this.length; i++){
			var items = callback.call(this[i], this[i], ary);
			if(items){
				ary = ary.concat(items);
			}
		}
		return ary;	//Array
	},

	_getUniqueAsNodeList: function(/*Array*/ nodes){
		// summary:
		// 		given a list of nodes, make sure only unique
		// 		elements are returned as our NodeList object.
		// 		Does not call _stash().
		var ary = [];
		//Using for loop for better speed.
		for(var i = 0, node; node = nodes[i]; i++){
			//Should be a faster way to do this. dojo.query has a private
			//_zip function that may be inspirational, but there are pathways
			//in query that force nozip?
			if(node.nodeType == 1 && array.indexOf(ary, node) == -1){
				ary.push(node);
			}
		}
		return this._wrap(ary, null, this._NodeListCtor);	 //dojo.NodeList
	},

	_getUniqueNodeListWithParent: function(/*Array*/ nodes, /*String*/ query){
		// summary:
		// 		gets unique element nodes, filters them further
		// 		with an optional query and then calls _stash to track parent NodeList.
		var ary = this._getUniqueAsNodeList(nodes);
		ary = (query ? dquery._filterResult(ary, query) : ary);
		return ary._stash(this);  //dojo.NodeList
	},

	_getRelatedUniqueNodes: function(/*String?*/ query, /*Function*/ callback){
		// summary:
		// 		cycles over all the nodes and calls a callback
		// 		to collect nodes for a possible inclusion in a result.
		// 		The callback will get two args: callback(node, ary),
		// 		where ary is the array being used to collect the nodes.
		return this._getUniqueNodeListWithParent(this._buildArrayFromCallback(callback), query);  //dojo.NodeList
	},

	children: function(/*String?*/ query){
		// summary:
		// 		Returns all immediate child elements for nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the child elements.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		// query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, all immediate child elements for the nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		Some Text
		// 	|		<div class="blue">Blue One</div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".container").children();
		//		returns the four divs that are children of the container div.
		//		Running this code:
		//	|	dojo.query(".container").children(".red");
		//		returns the two divs that have the class "red".
		return this._getRelatedUniqueNodes(query, function(node, ary){
			return lang._toArray(node.childNodes);
		}); //dojo.NodeList
	},

	closest: function(/*String*/ query, /*String|DOMNode?*/ root){
		// summary:
		// 		Returns closest parent that matches query, including current node in this
		// 		dojo.NodeList if it matches the query.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		// query:
		//		a CSS selector.
		// root:
		//		If specified, query is relative to "root" rather than document body.
		// returns:
		//		dojo.NodeList, the closest parent that matches the query, including the current
		//		node in this dojo.NodeList if it matches the query.
		// example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		//	|		<div class="red">Red One</div>
		//	|		Some Text
		//	|		<div class="blue">Blue One</div>
		//	|		<div class="red">Red Two</div>
		//	|		<div class="blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".red").closest(".container");
		//		returns the div with class "container".
		return this._getRelatedUniqueNodes(null, function(node, ary){
			do{
				if(dquery._filterResult([node], query, root).length){
					return node;
				}
			}while(node != root && (node = node.parentNode) && node.nodeType == 1);
			return null; //To make rhino strict checking happy.
		}); //dojo.NodeList
	},

	parent: function(/*String?*/ query){
		// summary:
		// 		Returns immediate parent elements for nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the parent elements.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		//	query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, immediate parent elements for nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		<div class="blue first"><span class="text">Blue One</span></div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue"><span class="text">Blue Two</span></div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".text").parent();
		//		returns the two divs with class "blue".
		//		Running this code:
		//	|	dojo.query(".text").parent(".first");
		//		returns the one div with class "blue" and "first".
		return this._getRelatedUniqueNodes(query, function(node, ary){
			return node.parentNode;
		}); //dojo.NodeList
	},

	parents: function(/*String?*/ query){
		// summary:
		// 		Returns all parent elements for nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the child elements.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		//	query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, all parent elements for nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		<div class="blue first"><span class="text">Blue One</span></div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue"><span class="text">Blue Two</span></div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".text").parents();
		//		returns the two divs with class "blue", the div with class "container",
		// 	|	the body element and the html element.
		//		Running this code:
		//	|	dojo.query(".text").parents(".container");
		//		returns the one div with class "container".
		return this._getRelatedUniqueNodes(query, function(node, ary){
			var pary = [];
			while(node.parentNode){
				node = node.parentNode;
				pary.push(node);
			}
			return pary;
		}); //dojo.NodeList
	},

	siblings: function(/*String?*/ query){
		// summary:
		// 		Returns all sibling elements for nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the sibling elements.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		//	query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, all sibling elements for nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		Some Text
		// 	|		<div class="blue first">Blue One</div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".first").siblings();
		//		returns the two divs with class "red" and the other div
		// 	|	with class "blue" that does not have "first".
		//		Running this code:
		//	|	dojo.query(".first").siblings(".red");
		//		returns the two div with class "red".
		return this._getRelatedUniqueNodes(query, function(node, ary){
			var pary = [];
			var nodes = (node.parentNode && node.parentNode.childNodes);
			for(var i = 0; i < nodes.length; i++){
				if(nodes[i] != node){
					pary.push(nodes[i]);
				}
			}
			return pary;
		}); //dojo.NodeList
	},

	next: function(/*String?*/ query){
		// summary:
		// 		Returns the next element for nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the next elements.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		//	query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, the next element for nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		Some Text
		// 	|		<div class="blue first">Blue One</div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue last">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".first").next();
		//		returns the div with class "red" and has innerHTML of "Red Two".
		//		Running this code:
		//	|	dojo.query(".last").next(".red");
		//		does not return any elements.
		return this._getRelatedUniqueNodes(query, function(node, ary){
			var next = node.nextSibling;
			while(next && next.nodeType != 1){
				next = next.nextSibling;
			}
			return next;
		}); //dojo.NodeList
	},

	nextAll: function(/*String?*/ query){
		// summary:
		// 		Returns all sibling elements that come after the nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the sibling elements.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		//	query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, all sibling elements that come after the nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		Some Text
		// 	|		<div class="blue first">Blue One</div>
		// 	|		<div class="red next">Red Two</div>
		// 	|		<div class="blue next">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".first").nextAll();
		//		returns the two divs with class of "next".
		//		Running this code:
		//	|	dojo.query(".first").nextAll(".red");
		//		returns the one div with class "red" and innerHTML "Red Two".
		return this._getRelatedUniqueNodes(query, function(node, ary){
			var pary = [];
			var next = node;
			while((next = next.nextSibling)){
				if(next.nodeType == 1){
					pary.push(next);
				}
			}
			return pary;
		}); //dojo.NodeList
	},

	prev: function(/*String?*/ query){
		// summary:
		// 		Returns the previous element for nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the previous elements.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		//	query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, the previous element for nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		Some Text
		// 	|		<div class="blue first">Blue One</div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".first").prev();
		//		returns the div with class "red" and has innerHTML of "Red One".
		//		Running this code:
		//	|	dojo.query(".first").prev(".blue");
		//		does not return any elements.
		return this._getRelatedUniqueNodes(query, function(node, ary){
			var prev = node.previousSibling;
			while(prev && prev.nodeType != 1){
				prev = prev.previousSibling;
			}
			return prev;
		}); //dojo.NodeList
	},

	prevAll: function(/*String?*/ query){
		// summary:
		// 		Returns all sibling elements that come before the nodes in this dojo.NodeList.
		// 		Optionally takes a query to filter the sibling elements.
		// description:
		// 		The returned nodes will be in reverse DOM order -- the first node in the list will
		// 		be the node closest to the original node/NodeList.
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		//	query:
		//		a CSS selector.
		// returns:
		//		dojo.NodeList, all sibling elements that come before the nodes in this dojo.NodeList.
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red prev">Red One</div>
		// 	|		Some Text
		// 	|		<div class="blue prev">Blue One</div>
		// 	|		<div class="red second">Red Two</div>
		// 	|		<div class="blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".second").prevAll();
		//		returns the two divs with class of "prev".
		//		Running this code:
		//	|	dojo.query(".first").prevAll(".red");
		//		returns the one div with class "red prev" and innerHTML "Red One".
		return this._getRelatedUniqueNodes(query, function(node, ary){
			var pary = [];
			var prev = node;
			while((prev = prev.previousSibling)){
				if(prev.nodeType == 1){
					pary.push(prev);
				}
			}
			return pary;
		}); //dojo.NodeList
	},

	andSelf: function(){
		// summary:
		// 		Adds the nodes from the previous dojo.NodeList to the current dojo.NodeList.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		// returns:
		//		dojo.NodeList
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red prev">Red One</div>
		// 	|		Some Text
		// 	|		<div class="blue prev">Blue One</div>
		// 	|		<div class="red second">Red Two</div>
		// 	|		<div class="blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".second").prevAll().andSelf();
		//		returns the two divs with class of "prev", as well as the div with class "second".
		return this.concat(this._parent);	//dojo.NodeList
	},

	//Alternate methods for the :first/:last/:even/:odd pseudos.
	first: function(){
		// summary:
		// 		Returns the first node in this dojo.NodeList as a dojo.NodeList.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		// returns:
		//		dojo.NodeList, with the first node in this dojo.NodeList
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		<div class="blue first">Blue One</div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue last">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".blue").first();
		//		returns the div with class "blue" and "first".
		return this._wrap(((this[0] && [this[0]]) || []), this); //dojo.NodeList
	},

	last: function(){
		// summary:
		// 		Returns the last node in this dojo.NodeList as a dojo.NodeList.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		// returns:
		//		dojo.NodeList, with the last node in this dojo.NodeList
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="red">Red One</div>
		// 	|		<div class="blue first">Blue One</div>
		// 	|		<div class="red">Red Two</div>
		// 	|		<div class="blue last">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".blue").last();
		//		returns the last div with class "blue",
		return this._wrap((this.length ? [this[this.length - 1]] : []), this); //dojo.NodeList
	},

	even: function(){
		// summary:
		// 		Returns the even nodes in this dojo.NodeList as a dojo.NodeList.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		// returns:
		//		dojo.NodeList, with the even nodes in this dojo.NodeList
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="interior red">Red One</div>
		// 	|		<div class="interior blue">Blue One</div>
		// 	|		<div class="interior red">Red Two</div>
		// 	|		<div class="interior blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".interior").even();
		//		returns the two divs with class "blue"
		return this.filter(function(item, i){
			return i % 2 != 0;
		}); //dojo.NodeList
	},

	odd: function(){
		// summary:
		// 		Returns the odd nodes in this dojo.NodeList as a dojo.NodeList.
		// description:
		// 		.end() can be used on the returned dojo.NodeList to get back to the
		// 		original dojo.NodeList.
		// returns:
		//		dojo.NodeList, with the odd nodes in this dojo.NodeList
		//	example:
		//		assume a DOM created by this markup:
		//	|	<div class="container">
		// 	|		<div class="interior red">Red One</div>
		// 	|		<div class="interior blue">Blue One</div>
		// 	|		<div class="interior red">Red Two</div>
		// 	|		<div class="interior blue">Blue Two</div>
		//	|	</div>
		//		Running this code:
		//	|	dojo.query(".interior").odd();
		//		returns the two divs with class "red"
		return this.filter(function(item, i){
			return i % 2 == 0;
		}); //dojo.NodeList
	}
});

return NodeList;
});

},
'dojo/NodeList-html':function(){
define("dojo/NodeList-html", ["./query", "./_base/lang", "./html"], function(query, lang, html) {
	// module:
	//		dojo/NodeList-html
	// summary:
	//		TODOC

var NodeList = query.NodeList;

/*=====
dojo["NodeList-html"] = {
	// summary: Adds a chainable html method to dojo.query() / Nodelist instances for setting/replacing node content
};

// doc helper aliases:
NodeList = dojo.NodeList;
=====*/

lang.extend(NodeList, {
	html: function(/* String|DomNode|NodeList? */ content, /* Object? */params){
		//	summary:
		//		see `dojo.html.set()`. Set the content of all elements of this NodeList
		//
		//	content:
		//		An html string, node or enumerable list of nodes for insertion into the dom
		//
		//	params:
		//		Optional flags/properties to configure the content-setting. See dojo.html._ContentSetter
		//
		//	description:
		//		Based around `dojo.html.set()`, set the content of the Elements in a
		//		NodeList to the given content (string/node/nodelist), with optional arguments
		//		to further tune the set content behavior.
		//
		//	example:
		//	| dojo.query(".thingList").html("<li dojoType='dojo.dnd.Moveable'>1</li><li dojoType='dojo.dnd.Moveable'>2</li><li dojoType='dojo.dnd.Moveable'>3</li>",
		//	| {
		//	| 	parseContent: true,
		//	| 	onBegin: function(){
		//	| 		this.content = this.content.replace(/([0-9])/g, this.id + ": $1");
		//	| 		this.inherited("onBegin", arguments);
		//	| 	}
		//	| }).removeClass("notdone").addClass("done");

		var dhs = new html._ContentSetter(params || {});
		this.forEach(function(elm){
			dhs.node = elm;
			dhs.set(content);
			dhs.tearDown();
		});
		return this; // dojo.NodeList
	}
});

return NodeList;
});

},
'*noref':1}});
define("dojo/_NodeList", [], 1);
require(["dojo/NodeList-fx","dojo/NodeList-html","dojo/NodeList-manipulate","dojo/NodeList-traverse"]);

require({cache:{
'dojox/html/_base':function(){
define("dojox/html/_base", [
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/xhr",
	"dojo/_base/window",
	"dojo/_base/sniff",
	"dojo/_base/url",
	"dojo/dom-construct",
	"dojo/html",
	"dojo/_base/declare"
], function (dojo, lang, xhrUtil, windowUtil, has, _Url, domConstruct, htmlUtil) {
/*
	Status: dont know where this will all live exactly
	Need to pull in the implementation of the various helper methods
	Some can be static method, others maybe methods of the ContentSetter (?)

	Gut the ContentPane, replace its _setContent with our own call to dojox.html.set()


*/
	var html = dojo.getObject("dojox.html", true);

	if(has("ie")){
		var alphaImageLoader = /(AlphaImageLoader\([^)]*?src=(['"]))(?![a-z]+:|\/)([^\r\n;}]+?)(\2[^)]*\)\s*[;}]?)/g;
	}

	// css at-rules must be set before any css declarations according to CSS spec
	// match:
	// @import 'http://dojotoolkit.org/dojo.css';
	// @import 'you/never/thought/' print;
	// @import url("it/would/work") tv, screen;
	// @import url(/did/you/now.css);
	// but not:
	// @namespace dojo "http://dojotoolkit.org/dojo.css"; /* namespace URL should always be a absolute URI */
	// @charset 'utf-8';
	// @media print{ #menuRoot {display:none;} }

	// we adjust all paths that dont start on '/' or contains ':'
	//(?![a-z]+:|\/)

	var cssPaths = /(?:(?:@import\s*(['"])(?![a-z]+:|\/)([^\r\n;{]+?)\1)|url\(\s*(['"]?)(?![a-z]+:|\/)([^\r\n;]+?)\3\s*\))([a-z, \s]*[;}]?)/g;

	var adjustCssPaths = html._adjustCssPaths = function(cssUrl, cssText){
		//	summary:
		//		adjusts relative paths in cssText to be relative to cssUrl
		//		a path is considered relative if it doesn't start with '/' and not contains ':'
		//	description:
		//		Say we fetch a HTML page from level1/page.html
		//		It has some inline CSS:
		//			@import "css/page.css" tv, screen;
		//			...
		//			background-image: url(images/aplhaimage.png);
		//
		//		as we fetched this HTML and therefore this CSS
		//		from level1/page.html, these paths needs to be adjusted to:
		//			@import 'level1/css/page.css' tv, screen;
		//			...
		//			background-image: url(level1/images/alphaimage.png);
		//
		//		In IE it will also adjust relative paths in AlphaImageLoader()
		//			filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='images/alphaimage.png');
		//		will be adjusted to:
		//			filter:progid:DXImageTransform.Microsoft.AlphaImageLoader(src='level1/images/alphaimage.png');
		//
		//		Please note that any relative paths in AlphaImageLoader in external css files wont work, as
		//		the paths in AlphaImageLoader is MUST be declared relative to the HTML page,
		//		not relative to the CSS file that declares it

		if(!cssText || !cssUrl){ return; }

		// support the ImageAlphaFilter if it exists, most people use it in IE 6 for transparent PNGs
		// We are NOT going to kill it in IE 7 just because the PNGs work there. Somebody might have
		// other uses for it.
		// If user want to disable css filter in IE6  he/she should
		// unset filter in a declaration that just IE 6 doesn't understands
		// like * > .myselector { filter:none; }
		if(alphaImageLoader){
			cssText = cssText.replace(alphaImageLoader, function(ignore, pre, delim, url, post){
				return pre + (new _Url(cssUrl, './'+url).toString()) + post;
			});
		}

		return cssText.replace(cssPaths, function(ignore, delimStr, strUrl, delimUrl, urlUrl, media){
			if(strUrl){
				return '@import "' + (new _Url(cssUrl, './'+strUrl).toString()) + '"' + media;
			}else{
				return 'url(' + (new _Url(cssUrl, './'+urlUrl).toString()) + ')' + media;
			}
		});
	};

	// attributepaths one tag can have multiple paths, example:
	// <input src="..." style="url(..)"/> or <a style="url(..)" href="..">
	// <img style='filter:progid...AlphaImageLoader(src="noticeTheSrcHereRunsThroughHtmlSrc")' src="img">
	var htmlAttrPaths = /(<[a-z][a-z0-9]*\s[^>]*)(?:(href|src)=(['"]?)([^>]*?)\3|style=(['"]?)([^>]*?)\5)([^>]*>)/gi;

	var adjustHtmlPaths = html._adjustHtmlPaths = function(htmlUrl, cont){
		var url = htmlUrl || "./";

		return cont.replace(htmlAttrPaths,
			function(tag, start, name, delim, relUrl, delim2, cssText, end){
				return start + (name ?
							(name + '=' + delim + (new _Url(url, relUrl).toString()) + delim)
						: ('style=' + delim2 + adjustCssPaths(url, cssText) + delim2)
				) + end;
			}
		);
	};

	var snarfStyles = html._snarfStyles = function	(/*String*/cssUrl, /*String*/cont, /*Array*/styles){
		/****************  cut out all <style> and <link rel="stylesheet" href=".."> **************/
		// also return any attributes from this tag (might be a media attribute)
		// if cssUrl is set it will adjust paths accordingly
		styles.attributes = [];

		return cont.replace(/(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi,
			function(ignore, styleAttr, cssText, linkAttr, delim, href){
				// trim attribute
				var i, attr = (styleAttr||linkAttr||"").replace(/^\s*([\s\S]*?)\s*$/i, "$1");
				if(cssText){
					i = styles.push(cssUrl ? adjustCssPaths(cssUrl, cssText) : cssText);
				}else{
					i = styles.push('@import "' + href + '";');
					attr = attr.replace(/\s*(?:rel|href)=(['"])?[^\s]*\1\s*/gi, ""); // remove rel=... and href=...
				}
				if(attr){
					attr = attr.split(/\s+/);// split on both "\n", "\t", " " etc
					var atObj = {}, tmp;
					for(var j = 0, e = attr.length; j < e; j++){
						tmp = attr[j].split('='); // split name='value'
						atObj[tmp[0]] = tmp[1].replace(/^\s*['"]?([\s\S]*?)['"]?\s*$/, "$1"); // trim and remove ''
					}
					styles.attributes[i - 1] = atObj;
				}
				return "";
			}
		);
	};

	var snarfScripts = html._snarfScripts = function(cont, byRef){
		// summary
		//		strips out script tags from cont
		// invoke with
		//	byRef = {errBack:function(){/*add your download error code here*/, downloadRemote: true(default false)}}
		//	byRef will have {code: 'jscode'} when this scope leaves
		byRef.code = "";

		//Update script tags nested in comments so that the script tag collector doesn't pick
		//them up.
		cont = cont.replace(/<[!][-][-](.|\s)*?[-][-]>/g,
			function(comment){
				return comment.replace(/<(\/?)script\b/ig,"&lt;$1Script");
			}
		);

		function download(src){
			if(byRef.downloadRemote){
				// console.debug('downloading',src);
				//Fix up src, in case there were entity character encodings in it.
				//Probably only need to worry about a subset.
				src = src.replace(/&([a-z0-9#]+);/g, function(m, name) {
					switch(name) {
						case "amp"	: return "&";
						case "gt"	: return ">";
						case "lt"	: return "<";
						default:
							return name.charAt(0)=="#" ? String.fromCharCode(name.substring(1)) : "&"+name+";";
					}
				});
				xhrUtil.get({
					url: src,
					sync: true,
					load: function(code){
						byRef.code += code+";";
					},
					error: byRef.errBack
				});
			}
		}

		// match <script>, <script type="text/..., but not <script type="dojo(/method)...
		return cont.replace(/<script\s*(?![^>]*type=['"]?(?:dojo\/|text\/html\b))(?:[^>]*?(?:src=(['"]?)([^>]*?)\1[^>]*)?)*>([\s\S]*?)<\/script>/gi,
			function(ignore, delim, src, code){
				if(src){
					download(src);
				}else{
					byRef.code += code;
				}
				return "";
			}
		);
	};

	var evalInGlobal = html.evalInGlobal = function(code, appendNode){
		// we do our own eval here as dojo.eval doesn't eval in global crossbrowser
		// This work X browser but but it relies on a DOM
		// plus it doesn't return anything, thats unrelevant here but not for dojo core
		appendNode = appendNode || windowUtil.doc.body;
		var n = appendNode.ownerDocument.createElement('script');
		n.type = "text/javascript";
		appendNode.appendChild(n);
		n.text = code; // DOM 1 says this should work
	};

	html._ContentSetter = dojo.declare(/*===== "dojox.html._ContentSetter", =====*/ htmlUtil._ContentSetter, {
		// adjustPaths: Boolean
		//		Adjust relative paths in html string content to point to this page
		//		Only useful if you grab content from a another folder than the current one
		adjustPaths: false,
		referencePath: ".",
		renderStyles: false,

		executeScripts: false,
		scriptHasHooks: false,
		scriptHookReplacement: null,

		_renderStyles: function(styles){
			// insert css from content into document head
			this._styleNodes = [];
			var st, att, cssText, doc = this.node.ownerDocument;
			var head = doc.getElementsByTagName('head')[0];

			for(var i = 0, e = styles.length; i < e; i++){
				cssText = styles[i]; att = styles.attributes[i];
				st = doc.createElement('style');
				st.setAttribute("type", "text/css"); // this is required in CSS spec!

				for(var x in att){
					st.setAttribute(x, att[x]);
				}

				this._styleNodes.push(st);
				head.appendChild(st); // must insert into DOM before setting cssText

				if(st.styleSheet){ // IE
					st.styleSheet.cssText = cssText;
				}else{ // w3c
					st.appendChild(doc.createTextNode(cssText));
				}
			}
		},

		empty: function() {
			this.inherited("empty", arguments);

			// empty out the styles array from any previous use
			this._styles = [];
		},

		onBegin: function() {
			// summary
			//		Called after instantiation, but before set();
			//		It allows modification of any of the object properties - including the node and content
			//		provided - before the set operation actually takes place
			//		This implementation extends that of dojo.html._ContentSetter
			//		to add handling for adjustPaths, renderStyles on the html string content before it is set
			this.inherited("onBegin", arguments);

			var cont = this.content,
				node = this.node;

			var styles = this._styles;// init vars

			if(lang.isString(cont)){
				if(this.adjustPaths && this.referencePath){
					cont = adjustHtmlPaths(this.referencePath, cont);
				}

				if(this.renderStyles || this.cleanContent){
					cont = snarfStyles(this.referencePath, cont, styles);
				}

				// because of a bug in IE, script tags that is first in html hierarchy doesnt make it into the DOM
				//	when content is innerHTML'ed, so we can't use dojo.query to retrieve scripts from DOM
				if(this.executeScripts){
					var _t = this;
					var byRef = {
						downloadRemote: true,
						errBack:function(e){
							_t._onError.call(_t, 'Exec', 'Error downloading remote script in "'+_t.id+'"', e);
						}
					};
					cont = snarfScripts(cont, byRef);
					this._code = byRef.code;
				}
			}
			this.content = cont;
		},

		onEnd: function() {
			// summary
			//		Called after set(), when the new content has been pushed into the node
			//		It provides an opportunity for post-processing before handing back the node to the caller
			//		This implementation extends that of dojo.html._ContentSetter

			var code = this._code,
				styles = this._styles;

			// clear old stylenodes from the DOM
			// these were added by the last set call
			// (in other words, if you dont keep and reuse the ContentSetter for a particular node
			// .. you'll have no practical way to do this)
			if(this._styleNodes && this._styleNodes.length){
				while(this._styleNodes.length){
					domConstruct.destroy(this._styleNodes.pop());
				}
			}
			// render new style nodes
			if(this.renderStyles && styles && styles.length){
				this._renderStyles(styles);
			}

			if(this.executeScripts && code){
				if(this.cleanContent){
					// clean JS from html comments and other crap that browser
					// parser takes care of in a normal page load
					code = code.replace(/(<!--|(?:\/\/)?-->|<!\[CDATA\[|\]\]>)/g, '');
				}
				if(this.scriptHasHooks){
					// replace _container_ with this.scriptHookReplace()
					// the scriptHookReplacement can be a string
					// or a function, which when invoked returns the string you want to substitute in
					code = code.replace(/_container_(?!\s*=[^=])/g, this.scriptHookReplacement);
				}
				try{
					evalInGlobal(code, this.node);
				}catch(e){
					this._onError('Exec', 'Error eval script in '+this.id+', '+e.message, e);
				}
			}
			this.inherited("onEnd", arguments);
		},
		tearDown: function() {
			this.inherited(arguments);
			delete this._styles;
			// only tear down -or another set() - will explicitly throw away the
			// references to the style nodes we added
			if(this._styleNodes && this._styleNodes.length){
				while(this._styleNodes.length){
					domConstruct.destroy(this._styleNodes.pop());
				}
			}
			delete this._styleNodes;
			// reset the defaults from the prototype
			// XXX: not sure if this is the correct intended behaviour, it was originally
			// dojo.getObject(this.declaredClass).prototype which will not work with anonymous
			// modules
			dojo.mixin(this, html._ContentSetter.prototype);
		}

	});

	html.set = function(/* DomNode */ node, /* String|DomNode|NodeList */ cont, /* Object? */ params){
		// TODO: add all the other options
			// summary:
			//		inserts (replaces) the given content into the given node
			//	node:
			//		the parent element that will receive the content
			//	cont:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo.NodeList, Array or other enumerable list of nodes
			//	params:
			//		Optional flags/properties to configure the content-setting. See dojo.html._ContentSetter
			//	example:
			//		A safe string/node/nodelist content replacement/injection with hooks for extension
			//		Example Usage:
			//		dojo.html.set(node, "some string");
			//		dojo.html.set(node, contentNode, {options});
			//		dojo.html.set(node, myNode.childNodes, {options});

		if(!params){
			// simple and fast
			return htmlUtil._setNodeContent(node, cont, true);
		}else{
			// more options but slower
			var op = new html._ContentSetter(dojo.mixin(
					params,
					{ content: cont, node: node }
			));
			return op.set();
		}
	};

	return html;
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
'dojo/html':function(){
define("dojo/html", ["./_base/kernel", "./_base/lang", "./_base/array", "./_base/declare", "./dom", "./dom-construct", "./parser"], function(dojo, lang, darray, declare, dom, domConstruct, parser) {
	// module:
	//		dojo/html
	// summary:
	//		TODOC

	lang.getObject("html", true, dojo);

	// the parser might be needed..

	// idCounter is incremented with each instantiation to allow asignment of a unique id for tracking, logging purposes
	var idCounter = 0;

	dojo.html._secureForInnerHtml = function(/*String*/ cont){
		// summary:
		//		removes !DOCTYPE and title elements from the html string.
		//
		//		khtml is picky about dom faults, you can't attach a style or <title> node as child of body
		//		must go into head, so we need to cut out those tags
		//	cont:
		//		An html string for insertion into the dom
		//
		return cont.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig, ""); // String
	};

/*====
	dojo.html._emptyNode = function(node){
		// summary:
		//		removes all child nodes from the given node
		//	node: DOMNode
		//		the parent element
	};
=====*/
	dojo.html._emptyNode = domConstruct.empty;

	dojo.html._setNodeContent = function(/* DomNode */ node, /* String|DomNode|NodeList */ cont){
		// summary:
		//		inserts the given content into the given node
		//	node:
		//		the parent element
		//	content:
		//		the content to be set on the parent element.
		//		This can be an html string, a node reference or a NodeList, dojo.NodeList, Array or other enumerable list of nodes

		// always empty
		domConstruct.empty(node);

		if(cont) {
			if(typeof cont == "string") {
				cont = domConstruct.toDom(cont, node.ownerDocument);
			}
			if(!cont.nodeType && lang.isArrayLike(cont)) {
				// handle as enumerable, but it may shrink as we enumerate it
				for(var startlen=cont.length, i=0; i<cont.length; i=startlen==cont.length ? i+1 : 0) {
					domConstruct.place( cont[i], node, "last");
				}
			} else {
				// pass nodes, documentFragments and unknowns through to dojo.place
				domConstruct.place(cont, node, "last");
			}
		}

		// return DomNode
		return node;
	};

	// we wrap up the content-setting operation in a object
	declare("dojo.html._ContentSetter", null,
		{
			// node: DomNode|String
			//		An node which will be the parent element that we set content into
			node: "",

			// content: String|DomNode|DomNode[]
			//		The content to be placed in the node. Can be an HTML string, a node reference, or a enumerable list of nodes
			content: "",

			// id: String?
			//		Usually only used internally, and auto-generated with each instance
			id: "",

			// cleanContent: Boolean
			//		Should the content be treated as a full html document,
			//		and the real content stripped of <html>, <body> wrapper before injection
			cleanContent: false,

			// extractContent: Boolean
			//		Should the content be treated as a full html document, and the real content stripped of <html>, <body> wrapper before injection
			extractContent: false,

			// parseContent: Boolean
			//		Should the node by passed to the parser after the new content is set
			parseContent: false,

			// parserScope: String
			//		Flag passed to parser.	Root for attribute names to search for.	  If scopeName is dojo,
			//		will search for data-dojo-type (or dojoType).  For backwards compatibility
			//		reasons defaults to dojo._scopeName (which is "dojo" except when
			//		multi-version support is used, when it will be something like dojo16, dojo20, etc.)
			parserScope: dojo._scopeName,

			// startup: Boolean
			//		Start the child widgets after parsing them.	  Only obeyed if parseContent is true.
			startup: true,

			// lifecyle methods
			constructor: function(/* Object */params, /* String|DomNode */node){
				//	summary:
				//		Provides a configurable, extensible object to wrap the setting on content on a node
				//		call the set() method to actually set the content..

				// the original params are mixed directly into the instance "this"
				lang.mixin(this, params || {});

				// give precedence to params.node vs. the node argument
				// and ensure its a node, not an id string
				node = this.node = dom.byId( this.node || node );

				if(!this.id){
					this.id = [
						"Setter",
						(node) ? node.id || node.tagName : "",
						idCounter++
					].join("_");
				}
			},
			set: function(/* String|DomNode|NodeList? */ cont, /* Object? */ params){
				// summary:
				//		front-end to the set-content sequence
				//	cont:
				//		An html string, node or enumerable list of nodes for insertion into the dom
				//		If not provided, the object's content property will be used
				if(undefined !== cont){
					this.content = cont;
				}
				// in the re-use scenario, set needs to be able to mixin new configuration
				if(params){
					this._mixin(params);
				}

				this.onBegin();
				this.setContent();
				this.onEnd();

				return this.node;
			},
			setContent: function(){
				// summary:
				//		sets the content on the node

				var node = this.node;
				if(!node) {
					// can't proceed
					throw new Error(this.declaredClass + ": setContent given no node");
				}
				try{
					node = dojo.html._setNodeContent(node, this.content);
				}catch(e){
					// check if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV

					// FIXME: need to allow the user to provide a content error message string
					var errMess = this.onContentError(e);
					try{
						node.innerHTML = errMess;
					}catch(e){
						console.error('Fatal ' + this.declaredClass + '.setContent could not change content due to '+e.message, e);
					}
				}
				// always put back the node for the next method
				this.node = node; // DomNode
			},

			empty: function() {
				// summary
				//	cleanly empty out existing content

				// destroy any widgets from a previous run
				// NOTE: if you dont want this you'll need to empty
				// the parseResults array property yourself to avoid bad things happenning
				if(this.parseResults && this.parseResults.length) {
					darray.forEach(this.parseResults, function(w) {
						if(w.destroy){
							w.destroy();
						}
					});
					delete this.parseResults;
				}
				// this is fast, but if you know its already empty or safe, you could
				// override empty to skip this step
				dojo.html._emptyNode(this.node);
			},

			onBegin: function(){
				// summary
				//		Called after instantiation, but before set();
				//		It allows modification of any of the object properties
				//		- including the node and content provided - before the set operation actually takes place
				//		This default implementation checks for cleanContent and extractContent flags to
				//		optionally pre-process html string content
				var cont = this.content;

				if(lang.isString(cont)){
					if(this.cleanContent){
						cont = dojo.html._secureForInnerHtml(cont);
					}

					if(this.extractContent){
						var match = cont.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
						if(match){ cont = match[1]; }
					}
				}

				// clean out the node and any cruft associated with it - like widgets
				this.empty();

				this.content = cont;
				return this.node; /* DomNode */
			},

			onEnd: function(){
				// summary
				//		Called after set(), when the new content has been pushed into the node
				//		It provides an opportunity for post-processing before handing back the node to the caller
				//		This default implementation checks a parseContent flag to optionally run the dojo parser over the new content
				if(this.parseContent){
					// populates this.parseResults if you need those..
					this._parse();
				}
				return this.node; /* DomNode */
			},

			tearDown: function(){
				// summary
				//		manually reset the Setter instance if its being re-used for example for another set()
				// description
				//		tearDown() is not called automatically.
				//		In normal use, the Setter instance properties are simply allowed to fall out of scope
				//		but the tearDown method can be called to explicitly reset this instance.
				delete this.parseResults;
				delete this.node;
				delete this.content;
			},

			onContentError: function(err){
				return "Error occured setting content: " + err;
			},

			_mixin: function(params){
				// mix properties/methods into the instance
				// TODO: the intention with tearDown is to put the Setter's state
				// back to that of the original constructor (vs. deleting/resetting everything regardless of ctor params)
				// so we could do something here to move the original properties aside for later restoration
				var empty = {}, key;
				for(key in params){
					if(key in empty){ continue; }
					// TODO: here's our opportunity to mask the properties we dont consider configurable/overridable
					// .. but history shows we'll almost always guess wrong
					this[key] = params[key];
				}
			},
			_parse: function(){
				// summary:
				//		runs the dojo parser over the node contents, storing any results in this.parseResults
				//		Any errors resulting from parsing are passed to _onError for handling

				var rootNode = this.node;
				try{
					// store the results (widgets, whatever) for potential retrieval
					var inherited = {};
					darray.forEach(["dir", "lang", "textDir"], function(name){
						if(this[name]){
							inherited[name] = this[name];
						}
					}, this);
					this.parseResults = parser.parse({
						rootNode: rootNode,
						noStart: !this.startup,
						inherited: inherited,
						scope: this.parserScope
					});
				}catch(e){
					this._onError('Content', e, "Error parsing in _ContentSetter#"+this.id);
				}
			},

			_onError: function(type, err, consoleText){
				// summary:
				//		shows user the string that is returned by on[type]Error
				//		overide/implement on[type]Error and return your own string to customize
				var errText = this['on' + type + 'Error'].call(this, err);
				if(consoleText){
					console.error(consoleText, err);
				}else if(errText){ // a empty string won't change current content
					dojo.html._setNodeContent(this.node, errText, true);
				}
			}
	}); // end dojo.declare()

	dojo.html.set = function(/* DomNode */ node, /* String|DomNode|NodeList */ cont, /* Object? */ params){
			// summary:
			//		inserts (replaces) the given content into the given node. dojo.place(cont, node, "only")
			//		may be a better choice for simple HTML insertion.
			// description:
			//		Unless you need to use the params capabilities of this method, you should use
			//		dojo.place(cont, node, "only"). dojo.place() has more robust support for injecting
			//		an HTML string into the DOM, but it only handles inserting an HTML string as DOM
			//		elements, or inserting a DOM node. dojo.place does not handle NodeList insertions
			//		or the other capabilities as defined by the params object for this method.
			//	node:
			//		the parent element that will receive the content
			//	cont:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo.NodeList, Array or other enumerable list of nodes
			//	params:
			//		Optional flags/properties to configure the content-setting. See dojo.html._ContentSetter
			//	example:
			//		A safe string/node/nodelist content replacement/injection with hooks for extension
			//		Example Usage:
			//		dojo.html.set(node, "some string");
			//		dojo.html.set(node, contentNode, {options});
			//		dojo.html.set(node, myNode.childNodes, {options});
		if(undefined == cont){
			console.warn("dojo.html.set: no cont argument provided, using empty string");
			cont = "";
		}
		if(!params){
			// simple and fast
			return dojo.html._setNodeContent(node, cont, true);
		}else{
			// more options but slower
			// note the arguments are reversed in order, to match the convention for instantiation via the parser
			var op = new dojo.html._ContentSetter(lang.mixin(
					params,
					{ content: cont, node: node }
			));
			return op.set();
		}
	};

	return dojo.html;
});

},
'dojox/html/metrics':function(){
define("dojox/html/metrics", ["dojo/_base/kernel","dojo/_base/lang", "dojo/_base/sniff", "dojo/ready", "dojo/_base/unload",
		"dojo/_base/window", "dojo/dom-geometry"],
  function(kernel,lang,has,ready,UnloadUtil,Window,DOMGeom){
	var dhm = lang.getObject("dojox.html.metrics",true);
	var dojox = lang.getObject("dojox");

	//	derived from Morris John's emResized measurer
	dhm.getFontMeasurements = function(){
		//	summary
		//	Returns an object that has pixel equivilents of standard font size values.
		var heights = {
			'1em':0, '1ex':0, '100%':0, '12pt':0, '16px':0, 'xx-small':0, 'x-small':0,
			'small':0, 'medium':0, 'large':0, 'x-large':0, 'xx-large':0
		};
	
		var oldStyle;	
		if(has("ie")){
			//	We do a font-size fix if and only if one isn't applied already.
			// NOTE: If someone set the fontSize on the HTML Element, this will kill it.
			oldStyle = Window.doc.documentElement.style.fontSize || "";
			if(!oldStyle){
				Window.doc.documentElement.style.fontSize="100%";
			}
		}		
	
		//	set up the measuring node.
		var div=Window.doc.createElement("div");
		var ds = div.style;
		ds.position="absolute";
		ds.left="-100px";
		ds.top="0";
		ds.width="30px";
		ds.height="1000em";
		ds.borderWidth="0";
		ds.margin="0";
		ds.padding="0";
		ds.outline="0";
		ds.lineHeight="1";
		ds.overflow="hidden";
		Window.body().appendChild(div);
	
		//	do the measurements.
		for(var p in heights){
			ds.fontSize = p;
			heights[p] = Math.round(div.offsetHeight * 12/16) * 16/12 / 1000;
		}

		if(has("ie")){
			// Restore the font to its old style.
			Window.doc.documentElement.style.fontSize = oldStyle;
		}
		
		Window.body().removeChild(div);
		div = null;
		return heights; 	//	object
	};

	var fontMeasurements = null;
	
	dhm.getCachedFontMeasurements = function(recalculate){
		if(recalculate || !fontMeasurements){
			fontMeasurements = dhm.getFontMeasurements();
		}
		return fontMeasurements;
	};

	var measuringNode = null, empty = {};
	dhm.getTextBox = function(/* String */ text, /* Object */ style, /* String? */ className){
		var m, s;
		if(!measuringNode){
			m = measuringNode = Window.doc.createElement("div");
			// Container that we can set contraints on so that it doesn't
			// trigger a scrollbar.
			var c = Window.doc.createElement("div");
			c.appendChild(m);
			s = c.style;
			s.overflow='scroll';
			s.position = "absolute";
			s.left = "0px";
			s.top = "-10000px";
			s.width = "1px";
			s.height = "1px";
			s.visibility = "hidden";
			s.borderWidth = "0";
			s.margin = "0";
			s.padding = "0";
			s.outline = "0";
			Window.body().appendChild(c);
		}else{
			m = measuringNode;
		}
		// reset styles
		m.className = "";
		s = m.style;
		s.borderWidth = "0";
		s.margin = "0";
		s.padding = "0";
		s.outline = "0";
		// set new style
		if(arguments.length > 1 && style){
			for(var i in style){
				if(i in empty){ continue; }
				s[i] = style[i];
			}
		}
		// set classes
		if(arguments.length > 2 && className){
			m.className = className;
		}
		// take a measure
		m.innerHTML = text;
		var box = DOMGeom.position(m);
		// position doesn't report right (reports 1, since parent is 1)
		// So we have to look at the scrollWidth to get the real width
		// Height is right.
		box.w = m.parentNode.scrollWidth;
		return box;
	};

	//	determine the scrollbar sizes on load.
	var scroll={ w:16, h:16 };
	dhm.getScrollbar=function(){ return { w:scroll.w, h:scroll.h }; };

	dhm._fontResizeNode = null;

	dhm.initOnFontResize = function(interval){
		var f = dhm._fontResizeNode = Window.doc.createElement("iframe");
		var fs = f.style;
		fs.position = "absolute";
		fs.width = "5em";
		fs.height = "10em";
		fs.top = "-10000px";
		if(has("ie")){
			f.onreadystatechange = function(){
				if(f.contentWindow.document.readyState == "complete"){
					f.onresize = f.contentWindow.parent[dojox._scopeName].html.metrics._fontresize;
				}
			};
		}else{
			f.onload = function(){
				f.contentWindow.onresize = f.contentWindow.parent[dojox._scopeName].html.metrics._fontresize;
			};
		}
		//The script tag is to work around a known firebug race condition.  See comments in bug #9046
		f.setAttribute("src", "javascript:'<html><head><script>if(\"loadFirebugConsole\" in window){window.loadFirebugConsole();}</script></head><body></body></html>'");
		Window.body().appendChild(f);
		dhm.initOnFontResize = function(){};
	};

	dhm.onFontResize = function(){};
	dhm._fontresize = function(){
		dhm.onFontResize();
	}

	UnloadUtil.addOnUnload(function(){
		// destroy our font resize iframe if we have one
		var f = dhm._fontResizeNode;
		if(f){
			if(has("ie") && f.onresize){
				f.onresize = null;
			}else if(f.contentWindow && f.contentWindow.onresize){
				f.contentWindow.onresize = null;
			}
			dhm._fontResizeNode = null;
		}
	});

	ready(function(){
		// getScrollbar metrics node
		try{
			var n=Window.doc.createElement("div");
			n.style.cssText = "top:0;left:0;width:100px;height:100px;overflow:scroll;position:absolute;visibility:hidden;";
			Window.body().appendChild(n);
			scroll.w = n.offsetWidth - n.clientWidth;
			scroll.h = n.offsetHeight - n.clientHeight;
			Window.body().removeChild(n);
			//console.log("Scroll bar dimensions: ", scroll);
			delete n;
		}catch(e){}

		// text size poll setup
		if("fontSizeWatch" in kernel.config && !!kernel.config.fontSizeWatch){
			dhm.initOnFontResize();
		}
	});
	return dhm;
});
},
'dojox/html/entities':function(){
define("dojox/html/entities", ["dojo/_base/lang"], function(lang) {
	// dojox.html.entities.html [public] Array
	//		Entity characters for HTML, represented as an array of
	//		character code, entity name (minus & and ; wrapping.
	//		The function wrapper is to fix global leking with the build tools.
	var dhe = lang.getObject("dojox.html.entities",true);	
	
	var _applyEncodingMap = function(str, map){
		// summary:
		//		Private internal function for performing encoding of entity characters.
		// tags:
		//		private
	
		// Check to see if we have genned and cached a regexp for this map yet
		// If we have, use it, if not, gen it, cache, then use.
		var mapper, regexp;
		if(map._encCache &&
			map._encCache.regexp &&
			map._encCache.mapper &&
			map.length == map._encCache.length){
			mapper = map._encCache.mapper;
			regexp = map._encCache.regexp;
		}else{
			mapper = {};
			regexp = ["["];
			var i;
			for(i = 0; i < map.length; i++){
				mapper[map[i][0]] = "&" + map[i][1] + ";";
				regexp.push(map[i][0]);
			}
			regexp.push("]");
			regexp = new RegExp(regexp.join(""), "g");
			map._encCache = {
				mapper: mapper,
				regexp: regexp,
				length: map.length
			};
		}
		str = str.replace(regexp, function(c){
			return mapper[c];
		});
		return str;
	};
	
	var _applyDecodingMap = function(str, map){
		// summary:
		//		Private internal function for performing decoding of entity characters.
		// tags:
		//		private
		var mapper, regexp;
		if(map._decCache &&
			map._decCache.regexp &&
			map._decCache.mapper &&
			map.length == map._decCache.length){
			mapper = map._decCache.mapper;
			regexp = map._decCache.regexp;
		}else{
			mapper = {};
			regexp = ["("];
			var i;
			for(i = 0; i < map.length; i++){
				var e = "&" + map[i][1] + ";";
				if(i){regexp.push("|");}
				mapper[e] = map[i][0];
				regexp.push(e);
			}
			regexp.push(")");
			regexp = new RegExp(regexp.join(""), "g");
			map._decCache = {
				mapper: mapper,
				regexp: regexp,
				length: map.length
			};
		}
		str = str.replace(regexp, function(c){
			return mapper[c];
		});
		return str;
	};

	dhe.html = [
		["\u0026","amp"], ["\u0022","quot"],["\u003C","lt"], ["\u003E","gt"],
		["\u00A0","nbsp"]
	];
	
	// dojox.html.entities.latin [public] Array
	//		Entity characters for Latin characters and similar, represented as an array of
	//		character code, entity name (minus & and ; wrapping.
	dhe.latin = [
		["\u00A1","iexcl"],["\u00A2","cent"],["\u00A3","pound"],["\u20AC","euro"],
		["\u00A4","curren"],["\u00A5","yen"],["\u00A6","brvbar"],["\u00A7","sect"],
		["\u00A8","uml"],["\u00A9","copy"],["\u00AA","ordf"],["\u00AB","laquo"],
		["\u00AC","not"],["\u00AD","shy"],["\u00AE","reg"],["\u00AF","macr"],
		["\u00B0","deg"],["\u00B1","plusmn"],["\u00B2","sup2"],["\u00B3","sup3"],
		["\u00B4","acute"],["\u00B5","micro"],["\u00B6","para"],["\u00B7","middot"],
		["\u00B8","cedil"],["\u00B9","sup1"],["\u00BA","ordm"],["\u00BB","raquo"],
		["\u00BC","frac14"],["\u00BD","frac12"],["\u00BE","frac34"],["\u00BF","iquest"],
		["\u00C0","Agrave"],["\u00C1","Aacute"],["\u00C2","Acirc"],["\u00C3","Atilde"],
		["\u00C4","Auml"],["\u00C5","Aring"],["\u00C6","AElig"],["\u00C7","Ccedil"],
		["\u00C8","Egrave"],["\u00C9","Eacute"],["\u00CA","Ecirc"],["\u00CB","Euml"],
		["\u00CC","Igrave"],["\u00CD","Iacute"],["\u00CE","Icirc"],["\u00CF","Iuml"],
		["\u00D0","ETH"],["\u00D1","Ntilde"],["\u00D2","Ograve"],["\u00D3","Oacute"],
		["\u00D4","Ocirc"],["\u00D5","Otilde"],["\u00D6","Ouml"],["\u00D7","times"],
		["\u00D8","Oslash"],["\u00D9","Ugrave"],["\u00DA","Uacute"],["\u00DB","Ucirc"],
		["\u00DC","Uuml"],["\u00DD","Yacute"],["\u00DE","THORN"],["\u00DF","szlig"],
		["\u00E0","agrave"],["\u00E1","aacute"],["\u00E2","acirc"],["\u00E3","atilde"],
		["\u00E4","auml"],["\u00E5","aring"],["\u00E6","aelig"],["\u00E7","ccedil"],
		["\u00E8","egrave"],["\u00E9","eacute"],["\u00EA","ecirc"],["\u00EB","euml"],
		["\u00EC","igrave"],["\u00ED","iacute"],["\u00EE","icirc"],["\u00EF","iuml"],
		["\u00F0","eth"],["\u00F1","ntilde"],["\u00F2","ograve"],["\u00F3","oacute"],
		["\u00F4","ocirc"],["\u00F5","otilde"],["\u00F6","ouml"],["\u00F7","divide"],
		["\u00F8","oslash"],["\u00F9","ugrave"],["\u00FA","uacute"],["\u00FB","ucirc"],
		["\u00FC","uuml"],["\u00FD","yacute"],["\u00FE","thorn"],["\u00FF","yuml"],
		["\u0192","fnof"],["\u0391","Alpha"],["\u0392","Beta"],["\u0393","Gamma"],
		["\u0394","Delta"],["\u0395","Epsilon"],["\u0396","Zeta"],["\u0397","Eta"],
		["\u0398","Theta"], ["\u0399","Iota"],["\u039A","Kappa"],["\u039B","Lambda"],
		["\u039C","Mu"],["\u039D","Nu"],["\u039E","Xi"],["\u039F","Omicron"],
		["\u03A0","Pi"],["\u03A1","Rho"],["\u03A3","Sigma"],["\u03A4","Tau"],
		["\u03A5","Upsilon"],["\u03A6","Phi"],["\u03A7","Chi"],["\u03A8","Psi"],
		["\u03A9","Omega"],["\u03B1","alpha"],["\u03B2","beta"],["\u03B3","gamma"],
		["\u03B4","delta"],["\u03B5","epsilon"],["\u03B6","zeta"],["\u03B7","eta"],
		["\u03B8","theta"],["\u03B9","iota"],["\u03BA","kappa"],["\u03BB","lambda"],
		["\u03BC","mu"],["\u03BD","nu"],["\u03BE","xi"],["\u03BF","omicron"],
		["\u03C0","pi"],["\u03C1","rho"],["\u03C2","sigmaf"],["\u03C3","sigma"],
		["\u03C4","tau"],["\u03C5","upsilon"],["\u03C6","phi"],["\u03C7","chi"],
		["\u03C8","psi"],["\u03C9","omega"],["\u03D1","thetasym"],["\u03D2","upsih"],
		["\u03D6","piv"],["\u2022","bull"],["\u2026","hellip"],["\u2032","prime"],
		["\u2033","Prime"],["\u203E","oline"],["\u2044","frasl"],["\u2118","weierp"],
		["\u2111","image"],["\u211C","real"],["\u2122","trade"],["\u2135","alefsym"],
		["\u2190","larr"],["\u2191","uarr"],["\u2192","rarr"],["\u2193","darr"],
		["\u2194","harr"],["\u21B5","crarr"],["\u21D0","lArr"],["\u21D1","uArr"],
		["\u21D2","rArr"],["\u21D3","dArr"],["\u21D4","hArr"],["\u2200","forall"],
		["\u2202","part"],["\u2203","exist"],["\u2205","empty"],["\u2207","nabla"],
		["\u2208","isin"],["\u2209","notin"],["\u220B","ni"],["\u220F","prod"],
		["\u2211","sum"],["\u2212","minus"],["\u2217","lowast"],["\u221A","radic"],
		["\u221D","prop"],["\u221E","infin"],["\u2220","ang"],["\u2227","and"],
		["\u2228","or"],["\u2229","cap"],["\u222A","cup"],["\u222B","int"],
		["\u2234","there4"],["\u223C","sim"],["\u2245","cong"],["\u2248","asymp"],
		["\u2260","ne"],["\u2261","equiv"],["\u2264","le"],["\u2265","ge"],
		["\u2282","sub"],["\u2283","sup"],["\u2284","nsub"],["\u2286","sube"],
		["\u2287","supe"],["\u2295","oplus"],["\u2297","otimes"],["\u22A5","perp"],
		["\u22C5","sdot"],["\u2308","lceil"],["\u2309","rceil"],["\u230A","lfloor"],
		["\u230B","rfloor"],["\u2329","lang"],["\u232A","rang"],["\u25CA","loz"],
		["\u2660","spades"],["\u2663","clubs"],["\u2665","hearts"],["\u2666","diams"],
		["\u0152","Elig"],["\u0153","oelig"],["\u0160","Scaron"],["\u0161","scaron"],
		["\u0178","Yuml"],["\u02C6","circ"],["\u02DC","tilde"],["\u2002","ensp"],
		["\u2003","emsp"],["\u2009","thinsp"],["\u200C","zwnj"],["\u200D","zwj"],
		["\u200E","lrm"],["\u200F","rlm"],["\u2013","ndash"],["\u2014","mdash"],
		["\u2018","lsquo"],["\u2019","rsquo"],["\u201A","sbquo"],["\u201C","ldquo"],
		["\u201D","rdquo"],["\u201E","bdquo"],["\u2020","dagger"],["\u2021","Dagger"],
		["\u2030","permil"],["\u2039","lsaquo"],["\u203A","rsaquo"]
	];
	
	dhe.encode = function(str/*string*/, m /*array?*/){
		// summary:
		//		Function to obtain an entity encoding for a specified character
		// str:
		//		The string to process for possible entity encoding.
		// m:
		//		An optional list of character to entity name mappings (array of
		//		arrays).  If not provided, it uses the and Latin entities as the
		//		set to map and escape.
		// tags:
		//		public
		if(str){
			if(!m){
				// Apply the basic mappings.  HTML should always come first when decoding
				// as well.
				str = _applyEncodingMap(str, dhe.html);
				str = _applyEncodingMap(str, dhe.latin);
	
			}else{
				str = _applyEncodingMap(str, m);
			}
		}
		return str;
	};
	
	dhe.decode = function(str/*string*/, m /*array?*/){
		// summary:
		//		Function to obtain an entity encoding for a specified character
		// str:
		//		The string to process for possible entity encoding to decode.
		// m:
		//		An optional list of character to entity name mappings (array of
		//		arrays).  If not provided, it uses the HTML and Latin entities as the
		//		set to map and decode.
		// tags:
		//		public
		if(str){
			if(!m){
				// Apply the basic mappings.  HTML should always come first when decoding
				// as well.
				str = _applyDecodingMap(str, dhe.html);
				str = _applyDecodingMap(str, dhe.latin);
	
			}else{
				str = _applyDecodingMap(str, m);
			}
		}
		return str;
	};
	return dhe;
});


},
'dojo/parser':function(){
define(
	"dojo/parser", ["./_base/kernel", "./_base/lang", "./_base/array", "./_base/config", "./_base/html", "./_base/window", "./_base/url",
	 	"./_base/json", "./aspect", "./date/stamp", "./has", "./query", "./on", "./ready"],
	function(dojo, dlang, darray, config, dhtml, dwindow, _Url, djson, aspect, dates, has, query, don, ready){

// module:
//		dojo/parser
// summary:
//		The Dom/Widget parsing package

new Date("X"); // workaround for #11279, new Date("") == NaN

if (1) {
	var form = document.createElement("form");
	// Test if DOMNode.attributes only lists the attributes the user specified, not attributes w/default values.
	has.add("dom-attributes-explicit", form.attributes.length == 0);

	// IE8 will erroneously list a few attributes that weren't specified,
	// but we know to skip them because they have a specified flag which is false
	has.add("dom-attributes-specified-flag", form.attributes.length < 40);

	// Otherwise, it's IE6-7 form.attributes will list hundreds of values, need to do outerHTML instead.
}

dojo.parser = new function(){
	// summary:
	//		The Dom/Widget parsing package

	var _nameMap = {
		// Map from widget name (ex: "dijit.form.Button") to structure mapping
		// lowercase version of attribute names to the version in the widget ex:
		//	{
		//		label: "label",
		//		onclick: "onClick"
		//	}
	};
	function getNameMap(proto){
		// summary:
		//		Returns map from lowercase name to attribute name in class, ex: {onclick: "onClick"}
		var map = {};
		for(var name in proto){
			if(name.charAt(0)=="_"){ continue; }	// skip internal properties
			map[name.toLowerCase()] = name;
		}
		return map;
	}
	// Widgets like BorderContainer add properties to _Widget via dojo.extend().
	// If BorderContainer is loaded after _Widget's parameter list has been cached,
	// we need to refresh that parameter list (for _Widget and all widgets that extend _Widget).
	aspect.after(dlang, "extend", function(){
		_nameMap = {};
	}, true);

	// Map from widget name (ex: "dijit.form.Button") to a map of { "list-of-mixins": ctor }
	// if "list-of-mixins" is "__type" this is the raw type without mixins
	var _ctorMap = {};


	function getCtor(type){
		var map = _ctorMap[type] || (_ctorMap[type] = {});
		return map["__type"] || (map["__type"] = (dlang.getObject(type) || require(type)));
	}

	this._functionFromScript = function(script, attrData){
		// summary:
		//		Convert a <script type="dojo/method" args="a, b, c"> ... </script>
		//		into a function
		// script: DOMNode
		//		The <script> DOMNode
		// attrData: String
		//		For HTML5 compliance, searches for attrData + "args" (typically
		//		"data-dojo-args") instead of "args"
		var preamble = "";
		var suffix = "";
		var argsStr = (script.getAttribute(attrData + "args") || script.getAttribute("args"));
		if(argsStr){
			darray.forEach(argsStr.split(/\s*,\s*/), function(part, idx){
				preamble += "var "+part+" = arguments["+idx+"]; ";
			});
		}
		var withStr = script.getAttribute("with");
		if(withStr && withStr.length){
			darray.forEach(withStr.split(/\s*,\s*/), function(part){
				preamble += "with("+part+"){";
				suffix += "}";
			});
		}
		return new Function(preamble+script.innerHTML+suffix);
	};

	this.instantiate = /*====== dojo.parser.instantiate= ======*/ function(nodes, mixin, options) {
		// summary:
		//		Takes array of nodes, and turns them into class instances and
		//		potentially calls a startup method to allow them to connect with
		//		any children.
		// nodes: Array
		//		Array of DOM nodes
		// mixin: Object?
		//		An object that will be mixed in with each node in the array.
		//		Values in the mixin will override values in the node, if they
		//		exist.
		// options: Object?
		//		An object used to hold kwArgs for instantiation.
		//		See parse.options argument for details.

		mixin = mixin || {};
		options = options || {};

		var dojoType = (options.scope || dojo._scopeName) + "Type",		// typically "dojoType"
			attrData = "data-" + (options.scope || dojo._scopeName) + "-",// typically "data-dojo-"
			dataDojoType = attrData + "type";						// typically "data-dojo-type"

		var list = [];
		darray.forEach(nodes, function(node){
			var type = dojoType in mixin ? mixin[dojoType] : node.getAttribute(dataDojoType) || node.getAttribute(dojoType);
			if(type){
				list.push({
					node: node,
					"type": type
				});
			}
		});

		// Instantiate the nodes and return the objects
		return this._instantiate(list, mixin, options);
	};

	this._instantiate = /*====== dojo.parser.instantiate= ======*/ function(nodes, mixin, options){
		// summary:
		//		Takes array of objects representing nodes, and turns them into class instances and
		//		potentially calls a startup method to allow them to connect with
		//		any children.
		// nodes: Array
		//		Array of objects like
		//	|		{
		//	|			type: "dijit.form.Button",
		//	|			node: DOMNode,
		//	|			scripts: [ ... ],	// array of <script type="dojo/..."> children of node
		//	|			inherited: { ... }	// settings inherited from ancestors like dir, theme, etc.
		//	|		}
		// mixin: Object
		//		An object that will be mixed in with each node in the array.
		//		Values in the mixin will override values in the node, if they
		//		exist.
		// options: Object
		//		An options object used to hold kwArgs for instantiation.
		//		See parse.options argument for details.

		var thelist = [];

		// Precompute names of special attributes we are looking for
		// TODO: for 2.0 default to data-dojo- regardless of scopeName (or maybe scopeName won't exist in 2.0)
		var dojoType = (options.scope || dojo._scopeName) + "Type",		// typically "dojoType"
			attrData = "data-" + (options.scope || dojo._scopeName) + "-",// typically "data-dojo-"
			dataDojoType = attrData + "type",						// typically "data-dojo-type"
			dataDojoProps = attrData + "props",						// typically "data-dojo-props"
			dataDojoAttachPoint = attrData + "attach-point",
			dataDojoAttachEvent = attrData + "attach-event",
			dataDojoId = attrData + "id",
			dataDojoMixins = attrData + "mixins";

		// And make hash to quickly check if a given attribute is special, and to map the name to something friendly
		var specialAttrs = {};
		darray.forEach([dataDojoProps, dataDojoType, dojoType, dataDojoId, "jsId", dataDojoAttachPoint,
				dataDojoAttachEvent, "dojoAttachPoint", "dojoAttachEvent", "class", "style", dataDojoMixins], function(name){
			specialAttrs[name.toLowerCase()] = name.replace(options.scope, "dojo");
		});

		function extend(type, mixins){
			return type.createSubclass && type.createSubclass(mixins) || type.extend.apply(type, mixins);
		}

		darray.forEach(nodes, function(obj){
			if(!obj){ return; }

			var node = obj.node,
				type = obj.type,
				mixins = node.getAttribute(dataDojoMixins), ctor;

			if(mixins){
				var map = _ctorMap[type];
				// remove whitespaces
				mixins = mixins.replace(/ /g, "");
				ctor = map && map[mixins];
				if(!ctor){
					// first get ctor for raw type (& create _ctorMap[type] if needed (should not be))
					ctor = getCtor(type);
					// then do the mixin
					ctor = _ctorMap[type][mixins] = extend(ctor, darray.map(mixins.split(","), getCtor));
				}
			}else{
				ctor = getCtor(type);
			}

			var proto = ctor && ctor.prototype;

			// Setup hash to hold parameter settings for this widget.	Start with the parameter
			// settings inherited from ancestors ("dir" and "lang").
			// Inherited setting may later be overridden by explicit settings on node itself.
			var params = {};

			if(options.defaults){
				// settings for the document itself (or whatever subtree is being parsed)
				dlang.mixin(params, options.defaults);
			}
			if(obj.inherited){
				// settings from dir=rtl or lang=... on a node above this node
				dlang.mixin(params, obj.inherited);
			}

			// Get list of attributes explicitly listed in the markup
			var attributes;
			if(has("dom-attributes-explicit")){
				// Standard path to get list of user specified attributes
				attributes = node.attributes;
			}else if(has("dom-attributes-specified-flag")){
				// Special processing needed for IE8, to skip a few faux values in attributes[]
				attributes = darray.filter(node.attributes, function(a){ return a.specified;});
			}else{
				// Special path for IE6-7, avoid (sometimes >100) bogus entries in node.attributes
				var clone = /^input$|^img$/i.test(node.nodeName) ? node : node.cloneNode(false),
					attrs = clone.outerHTML.replace(/=[^\s"']+|="[^"]*"|='[^']*'/g, "").replace(/^\s*<[a-zA-Z0-9]*\s*/, "").replace(/\s*>.*$/, "");

				attributes = darray.map(attrs.split(/\s+/), function(name){
					var lcName = name.toLowerCase();
					return {
						name: name,
						// getAttribute() doesn't work for button.value, returns innerHTML of button.
						// but getAttributeNode().value doesn't work for the form.encType or li.value
						value: (node.nodeName == "LI" && name == "value") || lcName == "enctype" ?
								node.getAttribute(lcName) : node.getAttributeNode(lcName).value
					};
				});
			}

			// Read in attributes and process them, including data-dojo-props, data-dojo-type,
			// dojoAttachPoint, etc., as well as normal foo=bar attributes.
			var i=0, item;
			while(item = attributes[i++]){
				var name = item.name,
					lcName = name.toLowerCase(),
					value = item.value;

				if(lcName in specialAttrs){
					switch(specialAttrs[lcName]){

					// Data-dojo-props.   Save for later to make sure it overrides direct foo=bar settings
					case "data-dojo-props":
						var extra = value;
						break;

					// data-dojo-id or jsId. TODO: drop jsId in 2.0
					case "data-dojo-id":
					case "jsId":
						var jsname = value;
						break;

					// For the benefit of _Templated
					case "data-dojo-attach-point":
					case "dojoAttachPoint":
						params.dojoAttachPoint = value;
						break;
					case "data-dojo-attach-event":
					case "dojoAttachEvent":
						params.dojoAttachEvent = value;
						break;

					// Special parameter handling needed for IE
					case "class":
						params["class"] = node.className;
						break;
					case "style":
						params["style"] = node.style && node.style.cssText;
						break;
					}
				}else{
					// Normal attribute, ex: value="123"

					// Find attribute in widget corresponding to specified name.
					// May involve case conversion, ex: onclick --> onClick
					if(!(name in proto)){
						var map = (_nameMap[type] || (_nameMap[type] = getNameMap(proto)));
						name = map[lcName] || name;
					}

					// Set params[name] to value, doing type conversion
					if(name in proto){
						switch(typeof proto[name]){
						case "string":
							params[name] = value;
							break;
						case "number":
							params[name] = value.length ? Number(value) : NaN;
							break;
						case "boolean":
							// for checked/disabled value might be "" or "checked".	 interpret as true.
							params[name] = value.toLowerCase() != "false";
							break;
						case "function":
							if(value === "" || value.search(/[^\w\.]+/i) != -1){
								// The user has specified some text for a function like "return x+5"
								params[name] = new Function(value);
							}else{
								// The user has specified the name of a function like "myOnClick"
								// or a single word function "return"
								params[name] = dlang.getObject(value, false) || new Function(value);
							}
							break;
						default:
							var pVal = proto[name];
							params[name] =
								(pVal && "length" in pVal) ? (value ? value.split(/\s*,\s*/) : []) :	// array
									(pVal instanceof Date) ?
										(value == "" ? new Date("") :	// the NaN of dates
										value == "now" ? new Date() :	// current date
										dates.fromISOString(value)) :
								(pVal instanceof dojo._Url) ? (dojo.baseUrl + value) :
								djson.fromJson(value);
						}
					}else{
						params[name] = value;
					}
				}
			}

			// Mix things found in data-dojo-props into the params, overriding any direct settings
			if(extra){
				try{
					extra = djson.fromJson.call(options.propsThis, "{" + extra + "}");
					dlang.mixin(params, extra);
				}catch(e){
					// give the user a pointer to their invalid parameters. FIXME: can we kill this in production?
					throw new Error(e.toString() + " in data-dojo-props='" + extra + "'");
				}
			}

			// Any parameters specified in "mixin" override everything else.
			dlang.mixin(params, mixin);

			var scripts = obj.scripts || (ctor && (ctor._noScript || proto._noScript) ? [] :
						query("> script[type^='dojo/']", node));

			// Process <script type="dojo/*"> script tags
			// <script type="dojo/method" event="foo"> tags are added to params, and passed to
			// the widget on instantiation.
			// <script type="dojo/method"> tags (with no event) are executed after instantiation
			// <script type="dojo/connect" data-dojo-event="foo"> tags are dojo.connected after instantiation
			// <script type="dojo/watch" data-dojo-prop="foo"> tags are dojo.watch after instantiation
			// <script type="dojo/on" data-dojo-event="foo"> tags are dojo.on after instantiation
			// note: dojo/* script tags cannot exist in self closing widgets, like <input />
			var connects = [],	// functions to connect after instantiation
				calls = [],		// functions to call after instantiation
				watch = [],  //functions to watch after instantiation
				on = []; //functions to on after instantiation

			if(scripts){
				for(i=0; i<scripts.length; i++){
					var script = scripts[i];
					node.removeChild(script);
					// FIXME: drop event="" support in 2.0. use data-dojo-event="" instead
					var event = (script.getAttribute(attrData + "event") || script.getAttribute("event")),
						prop = script.getAttribute(attrData + "prop"),
						scriptType = script.getAttribute("type"),
						nf = this._functionFromScript(script, attrData);
					if(event){
						if(scriptType == "dojo/connect"){
							connects.push({event: event, func: nf});
						}else if(scriptType == "dojo/on"){
							on.push({event: event, func: nf});
						}else{
							params[event] = nf;
						}
					}else if(scriptType == "dojo/watch"){
						watch.push({prop: prop, func: nf});
					}else{
						calls.push(nf);
					}
				}
			}

			// create the instance
			var markupFactory = ctor.markupFactory || proto.markupFactory;
			var instance = markupFactory ? markupFactory(params, node, ctor) : new ctor(params, node);
			thelist.push(instance);

			// map it to the JS namespace if that makes sense
			if(jsname){
				dlang.setObject(jsname, instance);
			}

			// process connections and startup functions
			for(i=0; i<connects.length; i++){
				aspect.after(instance, connects[i].event, dojo.hitch(instance, connects[i].func), true);
			}
			for(i=0; i<calls.length; i++){
				calls[i].call(instance);
			}
			for(i=0; i<watch.length; i++){
				instance.watch(watch[i].prop, watch[i].func);
			}
			for(i=0; i<on.length; i++){
				don(instance, on[i].event, on[i].func);
			}
		}, this);

		// Call startup on each top level instance if it makes sense (as for
		// widgets).  Parent widgets will recursively call startup on their
		// (non-top level) children
		if(!mixin._started){
			darray.forEach(thelist, function(instance){
				if( !options.noStart && instance  &&
					dlang.isFunction(instance.startup) &&
					!instance._started
				){
					instance.startup();
				}
			});
		}
		return thelist;
	};

	this.scan = /*====== dojo.parser.scan= ======*/ function(root, options){
		// summary:
		//		Scan a DOM tree and return an array of objects representing the DOMNodes
		//		that need to be turned into widgets.
		// description:
		//		Search specified node (or document root node) recursively for class instances
		//		and return an array of objects that represent potential widgets to be
		//		instantiated. Searches for either data-dojo-type="MID" or dojoType="MID" where
		//		"MID" is a module ID like "dijit/form/Button" or a fully qualified Class name
		//		like "dijit.form.Button".
		//
		//		See parser.parse() for details of markup.
		// root: DomNode?
		//		A default starting root node from which to start the parsing. Can be
		//		omitted, defaulting to the entire document. If omitted, the `options`
		//		object can be passed in this place. If the `options` object has a
		//		`rootNode` member, that is used.
		// options: Object
		//		a kwArgs options object, see parse() for details

		// Output list
		var list = [];

		var dojoType = (options.scope || dojo._scopeName) + "Type",		// typically "dojoType"
			attrData = "data-" + (options.scope || dojo._scopeName) + "-",	// typically "data-dojo-"
			dataDojoType = attrData + "type",						// typically "data-dojo-type"
			dataDojoTextDir = attrData + "textdir";					// typically "data-dojo-textdir"

		// Info on DOMNode currently being processed
		var node = root.firstChild;

		// Info on parent of DOMNode currently being processed
		//	- inherited: dir, lang, and textDir setting of parent, or inherited by parent
		//	- parent: pointer to identical structure for my parent (or null if no parent)
		//	- scripts: if specified, collects <script type="dojo/..."> type nodes from children
		var inherited = options.inherited;
		if(!inherited){
			function findAncestorAttr(node, attr){
				return (node.getAttribute && node.getAttribute(attr)) ||
					(node !== dwindow.doc && node !== dwindow.doc.documentElement && node.parentNode ? findAncestorAttr(node.parentNode, attr) : null);
			}
			inherited = {
				dir: findAncestorAttr(root, "dir"),
				lang: findAncestorAttr(root, "lang"),
				textDir: findAncestorAttr(root, dataDojoTextDir)
			};
			for(var key in inherited){
				if(!inherited[key]){ delete inherited[key]; }
			}
		}
		var parent = {
			inherited: inherited
		};

		// For collecting <script type="dojo/..."> type nodes (when null, we don't need to collect)
		var scripts;

		// when true, only look for <script type="dojo/..."> tags, and don't recurse to children
		var scriptsOnly;

		function getEffective(parent){
			// summary:
			//		Get effective dir, lang, textDir settings for specified obj
			//		(matching "parent" object structure above), and do caching.
			//		Take care not to return null entries.
			if(!parent.inherited){
				parent.inherited = {};
				var node = parent.node,
					grandparent = getEffective(parent.parent);
				var inherited  = {
					dir: node.getAttribute("dir") || grandparent.dir,
					lang: node.getAttribute("lang") || grandparent.lang,
					textDir: node.getAttribute(dataDojoTextDir) || grandparent.textDir
				};
				for(var key in inherited){
					if(inherited[key]){
						parent.inherited[key] = inherited[key];
					}
				}
			}
			return parent.inherited;
		}

		// DFS on DOM tree, collecting nodes with data-dojo-type specified.
		while(true){
			if(!node){
				// Finished this level, continue to parent's next sibling
				if(!parent || !parent.node){
					break;
				}
				node = parent.node.nextSibling;
				scripts = parent.scripts;
				scriptsOnly = false;
				parent = parent.parent;
				continue;
			}

			if(node.nodeType != 1){
				// Text or comment node, skip to next sibling
				node = node.nextSibling;
				continue;
			}

			if(scripts && node.nodeName.toLowerCase() == "script"){
				// Save <script type="dojo/..."> for parent, then continue to next sibling
				type = node.getAttribute("type");
				if(type && /^dojo\/\w/i.test(type)){
					scripts.push(node);
				}
				node = node.nextSibling;
				continue;
			}
			if(scriptsOnly){
				node = node.nextSibling;
				continue;
			}

			// Check for data-dojo-type attribute, fallback to backward compatible dojoType
			var type = node.getAttribute(dataDojoType) || node.getAttribute(dojoType);

			// Short circuit for leaf nodes containing nothing [but text]
			var firstChild = node.firstChild;
			if(!type && (!firstChild || (firstChild.nodeType == 3 && !firstChild.nextSibling))){
				node = node.nextSibling;
				continue;
			}

			// Setup data structure to save info on current node for when we return from processing descendant nodes
			var current = {
				node: node,
				scripts: scripts,
				parent: parent
			};

			// If dojoType/data-dojo-type specified, add to output array of nodes to instantiate
			// Note: won't find classes declared via dojo.Declaration, so use try/catch to avoid throw from require()
			// We don't care yet about mixins ctors, we check script stop only on main class
			var ctor;
			try{
				ctor = type && getCtor(type);
			}catch(e){
			}
			var childScripts = ctor && !ctor.prototype._noScript ? [] : null; // <script> nodes that are parent's children
			if(type){
				list.push({
					"type": type,
					node: node,
					scripts: childScripts,
					inherited: getEffective(current) // dir & lang settings for current node, explicit or inherited
				});
			}

			// Recurse, collecting <script type="dojo/..."> children, and also looking for
			// descendant nodes with dojoType specified (unless the widget has the stopParser flag).
			// When finished with children, go to my next sibling.
			node = firstChild;
			scripts = childScripts;
			scriptsOnly = ctor && ctor.prototype.stopParser && !(options.template);
			parent = current;
		}

		return list;
	};

	this.parse = /*====== dojo.parser.parse= ======*/ function(rootNode, options){
		// summary:
		//		Scan the DOM for class instances, and instantiate them.
		//
		// description:
		//		Search specified node (or root node) recursively for class instances,
		//		and instantiate them. Searches for either data-dojo-type="Class" or
		//		dojoType="Class" where "Class" is a a fully qualified class name,
		//		like `dijit.form.Button`
		//
		//		Using `data-dojo-type`:
		//		Attributes using can be mixed into the parameters used to instantiate the
		//		Class by using a `data-dojo-props` attribute on the node being converted.
		//		`data-dojo-props` should be a string attribute to be converted from JSON.
		//
		//		Using `dojoType`:
		//		Attributes are read from the original domNode and converted to appropriate
		//		types by looking up the Class prototype values. This is the default behavior
		//		from Dojo 1.0 to Dojo 1.5. `dojoType` support is deprecated, and will
		//		go away in Dojo 2.0.
		//
		// rootNode: DomNode?
		//		A default starting root node from which to start the parsing. Can be
		//		omitted, defaulting to the entire document. If omitted, the `options`
		//		object can be passed in this place. If the `options` object has a
		//		`rootNode` member, that is used.
		//
		// options: Object?
		//		A hash of options.
		//
		//			* noStart: Boolean?
		//				when set will prevent the parser from calling .startup()
		//				when locating the nodes.
		//			* rootNode: DomNode?
		//				identical to the function's `rootNode` argument, though
		//				allowed to be passed in via this `options object.
		//			* template: Boolean
		//				If true, ignores ContentPane's stopParser flag and parses contents inside of
		//				a ContentPane inside of a template.   This allows dojoAttachPoint on widgets/nodes
		//				nested inside the ContentPane to work.
		//			* inherited: Object
		//				Hash possibly containing dir and lang settings to be applied to
		//				parsed widgets, unless there's another setting on a sub-node that overrides
		//			* scope: String
		//				Root for attribute names to search for.   If scopeName is dojo,
		//				will search for data-dojo-type (or dojoType).   For backwards compatibility
		//				reasons defaults to dojo._scopeName (which is "dojo" except when
		//				multi-version support is used, when it will be something like dojo16, dojo20, etc.)
		//			* propsThis: Object
		//				If specified, "this" referenced from data-dojo-props will refer to propsThis.
		//				Intended for use from the widgets-in-template feature of `dijit._WidgetsInTemplateMixin`
		//
		// example:
		//		Parse all widgets on a page:
		//	|		dojo.parser.parse();
		//
		// example:
		//		Parse all classes within the node with id="foo"
		//	|		dojo.parser.parse(dojo.byId('foo'));
		//
		// example:
		//		Parse all classes in a page, but do not call .startup() on any
		//		child
		//	|		dojo.parser.parse({ noStart: true })
		//
		// example:
		//		Parse all classes in a node, but do not call .startup()
		//	|		dojo.parser.parse(someNode, { noStart:true });
		//	|		// or
		//	|		dojo.parser.parse({ noStart:true, rootNode: someNode });

		// determine the root node and options based on the passed arguments.
		var root;
		if(!options && rootNode && rootNode.rootNode){
			options = rootNode;
			root = options.rootNode;
		}else if(rootNode && dlang.isObject(rootNode) && !("nodeType" in rootNode)){
			options = rootNode;
		}else{
			root = rootNode;
		}
		root = root ? dhtml.byId(root) : dwindow.body();

		options = options || {};

		// List of all nodes on page w/dojoType specified
		var list = this.scan(root, options);

		// go build the object instances
		var mixin = options.template ? {template: true} : {};
		return this._instantiate(list, mixin, options); // Array
	};
}();


//Register the parser callback. It should be the first callback
//after the a11y test.
if(config.parseOnLoad){
	ready(100, dojo.parser, "parse");
}

return dojo.parser;
});

},
'dojox/html':function(){
define("dojox/html", ["./html/_base"], function (html) {
	return html;
});
},
'*noref':1}});
define("dojox/_dojox_html", [], 1);
require(["dojox/html","dojox/html/metrics","dojox/html/entities"]);

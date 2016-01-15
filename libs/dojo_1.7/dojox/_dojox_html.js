/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is an optimized version of Dojo, built for deployment and not for
	development. To get sources and documentation, please visit:

		http://dojotoolkit.org
*/

//>>built
require({cache:{"dojox/html/_base":function(){define("dojox/html/_base",["dojo/_base/kernel","dojo/_base/lang","dojo/_base/xhr","dojo/_base/window","dojo/_base/sniff","dojo/_base/url","dojo/dom-construct","dojo/html","dojo/_base/declare"],function(_1,_2,_3,_4,_5,_6,_7,_8){var _9=_1.getObject("dojox.html",true);if(_5("ie")){var _a=/(AlphaImageLoader\([^)]*?src=(['"]))(?![a-z]+:|\/)([^\r\n;}]+?)(\2[^)]*\)\s*[;}]?)/g;}var _b=/(?:(?:@import\s*(['"])(?![a-z]+:|\/)([^\r\n;{]+?)\1)|url\(\s*(['"]?)(?![a-z]+:|\/)([^\r\n;]+?)\3\s*\))([a-z, \s]*[;}]?)/g;var _c=_9._adjustCssPaths=function(_d,_e){if(!_e||!_d){return;}if(_a){_e=_e.replace(_a,function(_f,pre,_10,url,_11){return pre+(new _6(_d,"./"+url).toString())+_11;});}return _e.replace(_b,function(_12,_13,_14,_15,_16,_17){if(_14){return "@import \""+(new _6(_d,"./"+_14).toString())+"\""+_17;}else{return "url("+(new _6(_d,"./"+_16).toString())+")"+_17;}});};var _18=/(<[a-z][a-z0-9]*\s[^>]*)(?:(href|src)=(['"]?)([^>]*?)\3|style=(['"]?)([^>]*?)\5)([^>]*>)/gi;var _19=_9._adjustHtmlPaths=function(_1a,_1b){var url=_1a||"./";return _1b.replace(_18,function(tag,_1c,_1d,_1e,_1f,_20,_21,end){return _1c+(_1d?(_1d+"="+_1e+(new _6(url,_1f).toString())+_1e):("style="+_20+_c(url,_21)+_20))+end;});};var _22=_9._snarfStyles=function(_23,_24,_25){_25.attributes=[];return _24.replace(/(?:<style([^>]*)>([\s\S]*?)<\/style>|<link\s+(?=[^>]*rel=['"]?stylesheet)([^>]*?href=(['"])([^>]*?)\4[^>\/]*)\/?>)/gi,function(_26,_27,_28,_29,_2a,_2b){var i,_2c=(_27||_29||"").replace(/^\s*([\s\S]*?)\s*$/i,"$1");if(_28){i=_25.push(_23?_c(_23,_28):_28);}else{i=_25.push("@import \""+_2b+"\";");_2c=_2c.replace(/\s*(?:rel|href)=(['"])?[^\s]*\1\s*/gi,"");}if(_2c){_2c=_2c.split(/\s+/);var _2d={},tmp;for(var j=0,e=_2c.length;j<e;j++){tmp=_2c[j].split("=");_2d[tmp[0]]=tmp[1].replace(/^\s*['"]?([\s\S]*?)['"]?\s*$/,"$1");}_25.attributes[i-1]=_2d;}return "";});};var _2e=_9._snarfScripts=function(_2f,_30){_30.code="";_2f=_2f.replace(/<[!][-][-](.|\s)*?[-][-]>/g,function(_31){return _31.replace(/<(\/?)script\b/ig,"&lt;$1Script");});function _32(src){if(_30.downloadRemote){src=src.replace(/&([a-z0-9#]+);/g,function(m,_33){switch(_33){case "amp":return "&";case "gt":return ">";case "lt":return "<";default:return _33.charAt(0)=="#"?String.fromCharCode(_33.substring(1)):"&"+_33+";";}});_3.get({url:src,sync:true,load:function(_34){_30.code+=_34+";";},error:_30.errBack});}};return _2f.replace(/<script\s*(?![^>]*type=['"]?(?:dojo\/|text\/html\b))(?:[^>]*?(?:src=(['"]?)([^>]*?)\1[^>]*)?)*>([\s\S]*?)<\/script>/gi,function(_35,_36,src,_37){if(src){_32(src);}else{_30.code+=_37;}return "";});};var _38=_9.evalInGlobal=function(_39,_3a){_3a=_3a||_4.doc.body;var n=_3a.ownerDocument.createElement("script");n.type="text/javascript";_3a.appendChild(n);n.text=_39;};_9._ContentSetter=_1.declare(_8._ContentSetter,{adjustPaths:false,referencePath:".",renderStyles:false,executeScripts:false,scriptHasHooks:false,scriptHookReplacement:null,_renderStyles:function(_3b){this._styleNodes=[];var st,att,_3c,doc=this.node.ownerDocument;var _3d=doc.getElementsByTagName("head")[0];for(var i=0,e=_3b.length;i<e;i++){_3c=_3b[i];att=_3b.attributes[i];st=doc.createElement("style");st.setAttribute("type","text/css");for(var x in att){st.setAttribute(x,att[x]);}this._styleNodes.push(st);_3d.appendChild(st);if(st.styleSheet){st.styleSheet.cssText=_3c;}else{st.appendChild(doc.createTextNode(_3c));}}},empty:function(){this.inherited("empty",arguments);this._styles=[];},onBegin:function(){this.inherited("onBegin",arguments);var _3e=this.content,_3f=this.node;var _40=this._styles;if(_2.isString(_3e)){if(this.adjustPaths&&this.referencePath){_3e=_19(this.referencePath,_3e);}if(this.renderStyles||this.cleanContent){_3e=_22(this.referencePath,_3e,_40);}if(this.executeScripts){var _41=this;var _42={downloadRemote:true,errBack:function(e){_41._onError.call(_41,"Exec","Error downloading remote script in \""+_41.id+"\"",e);}};_3e=_2e(_3e,_42);this._code=_42.code;}}this.content=_3e;},onEnd:function(){var _43=this._code,_44=this._styles;if(this._styleNodes&&this._styleNodes.length){while(this._styleNodes.length){_7.destroy(this._styleNodes.pop());}}if(this.renderStyles&&_44&&_44.length){this._renderStyles(_44);}if(this.executeScripts&&_43){if(this.cleanContent){_43=_43.replace(/(<!--|(?:\/\/)?-->|<!\[CDATA\[|\]\]>)/g,"");}if(this.scriptHasHooks){_43=_43.replace(/_container_(?!\s*=[^=])/g,this.scriptHookReplacement);}try{_38(_43,this.node);}catch(e){this._onError("Exec","Error eval script in "+this.id+", "+e.message,e);}}this.inherited("onEnd",arguments);},tearDown:function(){this.inherited(arguments);delete this._styles;if(this._styleNodes&&this._styleNodes.length){while(this._styleNodes.length){_7.destroy(this._styleNodes.pop());}}delete this._styleNodes;_1.mixin(this,_9._ContentSetter.prototype);}});_9.set=function(_45,_46,_47){if(!_47){return _8._setNodeContent(_45,_46,true);}else{var op=new _9._ContentSetter(_1.mixin(_47,{content:_46,node:_45}));return op.set();}};return _9;});},"dojo/_base/url":function(){define("dojo/_base/url",["./kernel"],function(_48){var ore=new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),ire=new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$"),_49=function(){var n=null,_4a=arguments,uri=[_4a[0]];for(var i=1;i<_4a.length;i++){if(!_4a[i]){continue;}var _4b=new _49(_4a[i]+""),_4c=new _49(uri[0]+"");if(_4b.path==""&&!_4b.scheme&&!_4b.authority&&!_4b.query){if(_4b.fragment!=n){_4c.fragment=_4b.fragment;}_4b=_4c;}else{if(!_4b.scheme){_4b.scheme=_4c.scheme;if(!_4b.authority){_4b.authority=_4c.authority;if(_4b.path.charAt(0)!="/"){var _4d=_4c.path.substring(0,_4c.path.lastIndexOf("/")+1)+_4b.path;var _4e=_4d.split("/");for(var j=0;j<_4e.length;j++){if(_4e[j]=="."){if(j==_4e.length-1){_4e[j]="";}else{_4e.splice(j,1);j--;}}else{if(j>0&&!(j==1&&_4e[0]=="")&&_4e[j]==".."&&_4e[j-1]!=".."){if(j==(_4e.length-1)){_4e.splice(j,1);_4e[j-1]="";}else{_4e.splice(j-1,2);j-=2;}}}}_4b.path=_4e.join("/");}}}}uri=[];if(_4b.scheme){uri.push(_4b.scheme,":");}if(_4b.authority){uri.push("//",_4b.authority);}uri.push(_4b.path);if(_4b.query){uri.push("?",_4b.query);}if(_4b.fragment){uri.push("#",_4b.fragment);}}this.uri=uri.join("");var r=this.uri.match(ore);this.scheme=r[2]||(r[1]?"":n);this.authority=r[4]||(r[3]?"":n);this.path=r[5];this.query=r[7]||(r[6]?"":n);this.fragment=r[9]||(r[8]?"":n);if(this.authority!=n){r=this.authority.match(ire);this.user=r[3]||n;this.password=r[4]||n;this.host=r[6]||r[7];this.port=r[9]||n;}};_49.prototype.toString=function(){return this.uri;};return _48._Url=_49;});},"dojo/date/stamp":function(){define("dojo/date/stamp",["../_base/kernel","../_base/lang","../_base/array"],function(_4f,_50,_51){_50.getObject("date.stamp",true,_4f);_4f.date.stamp.fromISOString=function(_52,_53){if(!_4f.date.stamp._isoRegExp){_4f.date.stamp._isoRegExp=/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;}var _54=_4f.date.stamp._isoRegExp.exec(_52),_55=null;if(_54){_54.shift();if(_54[1]){_54[1]--;}if(_54[6]){_54[6]*=1000;}if(_53){_53=new Date(_53);_51.forEach(_51.map(["FullYear","Month","Date","Hours","Minutes","Seconds","Milliseconds"],function(_56){return _53["get"+_56]();}),function(_57,_58){_54[_58]=_54[_58]||_57;});}_55=new Date(_54[0]||1970,_54[1]||0,_54[2]||1,_54[3]||0,_54[4]||0,_54[5]||0,_54[6]||0);if(_54[0]<100){_55.setFullYear(_54[0]||1970);}var _59=0,_5a=_54[7]&&_54[7].charAt(0);if(_5a!="Z"){_59=((_54[8]||0)*60)+(Number(_54[9])||0);if(_5a!="-"){_59*=-1;}}if(_5a){_59-=_55.getTimezoneOffset();}if(_59){_55.setTime(_55.getTime()+_59*60000);}}return _55;};_4f.date.stamp.toISOString=function(_5b,_5c){var _5d=function(n){return (n<10)?"0"+n:n;};_5c=_5c||{};var _5e=[],_5f=_5c.zulu?"getUTC":"get",_60="";if(_5c.selector!="time"){var _61=_5b[_5f+"FullYear"]();_60=["0000".substr((_61+"").length)+_61,_5d(_5b[_5f+"Month"]()+1),_5d(_5b[_5f+"Date"]())].join("-");}_5e.push(_60);if(_5c.selector!="date"){var _62=[_5d(_5b[_5f+"Hours"]()),_5d(_5b[_5f+"Minutes"]()),_5d(_5b[_5f+"Seconds"]())].join(":");var _63=_5b[_5f+"Milliseconds"]();if(_5c.milliseconds){_62+="."+(_63<100?"0":"")+_5d(_63);}if(_5c.zulu){_62+="Z";}else{if(_5c.selector!="time"){var _64=_5b.getTimezoneOffset();var _65=Math.abs(_64);_62+=(_64>0?"-":"+")+_5d(Math.floor(_65/60))+":"+_5d(_65%60);}}_5e.push(_62);}return _5e.join("T");};return _4f.date.stamp;});},"dojo/html":function(){define("dojo/html",["./_base/kernel","./_base/lang","./_base/array","./_base/declare","./dom","./dom-construct","./parser"],function(_66,_67,_68,_69,dom,_6a,_6b){_67.getObject("html",true,_66);var _6c=0;_66.html._secureForInnerHtml=function(_6d){return _6d.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig,"");};_66.html._emptyNode=_6a.empty;_66.html._setNodeContent=function(_6e,_6f){_6a.empty(_6e);if(_6f){if(typeof _6f=="string"){_6f=_6a.toDom(_6f,_6e.ownerDocument);}if(!_6f.nodeType&&_67.isArrayLike(_6f)){for(var _70=_6f.length,i=0;i<_6f.length;i=_70==_6f.length?i+1:0){_6a.place(_6f[i],_6e,"last");}}else{_6a.place(_6f,_6e,"last");}}return _6e;};_69("dojo.html._ContentSetter",null,{node:"",content:"",id:"",cleanContent:false,extractContent:false,parseContent:false,parserScope:_66._scopeName,startup:true,constructor:function(_71,_72){_67.mixin(this,_71||{});_72=this.node=dom.byId(this.node||_72);if(!this.id){this.id=["Setter",(_72)?_72.id||_72.tagName:"",_6c++].join("_");}},set:function(_73,_74){if(undefined!==_73){this.content=_73;}if(_74){this._mixin(_74);}this.onBegin();this.setContent();this.onEnd();return this.node;},setContent:function(){var _75=this.node;if(!_75){throw new Error(this.declaredClass+": setContent given no node");}try{_75=_66.html._setNodeContent(_75,this.content);}catch(e){var _76=this.onContentError(e);try{_75.innerHTML=_76;}catch(e){console.error("Fatal "+this.declaredClass+".setContent could not change content due to "+e.message,e);}}this.node=_75;},empty:function(){if(this.parseResults&&this.parseResults.length){_68.forEach(this.parseResults,function(w){if(w.destroy){w.destroy();}});delete this.parseResults;}_66.html._emptyNode(this.node);},onBegin:function(){var _77=this.content;if(_67.isString(_77)){if(this.cleanContent){_77=_66.html._secureForInnerHtml(_77);}if(this.extractContent){var _78=_77.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);if(_78){_77=_78[1];}}}this.empty();this.content=_77;return this.node;},onEnd:function(){if(this.parseContent){this._parse();}return this.node;},tearDown:function(){delete this.parseResults;delete this.node;delete this.content;},onContentError:function(err){return "Error occured setting content: "+err;},_mixin:function(_79){var _7a={},key;for(key in _79){if(key in _7a){continue;}this[key]=_79[key];}},_parse:function(){var _7b=this.node;try{var _7c={};_68.forEach(["dir","lang","textDir"],function(_7d){if(this[_7d]){_7c[_7d]=this[_7d];}},this);this.parseResults=_6b.parse({rootNode:_7b,noStart:!this.startup,inherited:_7c,scope:this.parserScope});}catch(e){this._onError("Content",e,"Error parsing in _ContentSetter#"+this.id);}},_onError:function(_7e,err,_7f){var _80=this["on"+_7e+"Error"].call(this,err);if(_7f){console.error(_7f,err);}else{if(_80){_66.html._setNodeContent(this.node,_80,true);}}}});_66.html.set=function(_81,_82,_83){if(undefined==_82){console.warn("dojo.html.set: no cont argument provided, using empty string");_82="";}if(!_83){return _66.html._setNodeContent(_81,_82,true);}else{var op=new _66.html._ContentSetter(_67.mixin(_83,{content:_82,node:_81}));return op.set();}};return _66.html;});},"dojox/html/metrics":function(){define("dojox/html/metrics",["dojo/_base/kernel","dojo/_base/lang","dojo/_base/sniff","dojo/ready","dojo/_base/unload","dojo/_base/window","dojo/dom-geometry"],function(_84,_85,has,_86,_87,_88,_89){var dhm=_85.getObject("dojox.html.metrics",true);var _8a=_85.getObject("dojox");dhm.getFontMeasurements=function(){var _8b={"1em":0,"1ex":0,"100%":0,"12pt":0,"16px":0,"xx-small":0,"x-small":0,"small":0,"medium":0,"large":0,"x-large":0,"xx-large":0};var _8c;if(has("ie")){_8c=_88.doc.documentElement.style.fontSize||"";if(!_8c){_88.doc.documentElement.style.fontSize="100%";}}var div=_88.doc.createElement("div");var ds=div.style;ds.position="absolute";ds.left="-100px";ds.top="0";ds.width="30px";ds.height="1000em";ds.borderWidth="0";ds.margin="0";ds.padding="0";ds.outline="0";ds.lineHeight="1";ds.overflow="hidden";_88.body().appendChild(div);for(var p in _8b){ds.fontSize=p;_8b[p]=Math.round(div.offsetHeight*12/16)*16/12/1000;}if(has("ie")){_88.doc.documentElement.style.fontSize=_8c;}_88.body().removeChild(div);div=null;return _8b;};var _8d=null;dhm.getCachedFontMeasurements=function(_8e){if(_8e||!_8d){_8d=dhm.getFontMeasurements();}return _8d;};var _8f=null,_90={};dhm.getTextBox=function(_91,_92,_93){var m,s;if(!_8f){m=_8f=_88.doc.createElement("div");var c=_88.doc.createElement("div");c.appendChild(m);s=c.style;s.overflow="scroll";s.position="absolute";s.left="0px";s.top="-10000px";s.width="1px";s.height="1px";s.visibility="hidden";s.borderWidth="0";s.margin="0";s.padding="0";s.outline="0";_88.body().appendChild(c);}else{m=_8f;}m.className="";s=m.style;s.borderWidth="0";s.margin="0";s.padding="0";s.outline="0";if(arguments.length>1&&_92){for(var i in _92){if(i in _90){continue;}s[i]=_92[i];}}if(arguments.length>2&&_93){m.className=_93;}m.innerHTML=_91;var box=_89.position(m);box.w=m.parentNode.scrollWidth;return box;};var _94={w:16,h:16};dhm.getScrollbar=function(){return {w:_94.w,h:_94.h};};dhm._fontResizeNode=null;dhm.initOnFontResize=function(_95){var f=dhm._fontResizeNode=_88.doc.createElement("iframe");var fs=f.style;fs.position="absolute";fs.width="5em";fs.height="10em";fs.top="-10000px";if(has("ie")){f.onreadystatechange=function(){if(f.contentWindow.document.readyState=="complete"){f.onresize=f.contentWindow.parent[_8a._scopeName].html.metrics._fontresize;}};}else{f.onload=function(){f.contentWindow.onresize=f.contentWindow.parent[_8a._scopeName].html.metrics._fontresize;};}f.setAttribute("src","javascript:'<html><head><script>if(\"loadFirebugConsole\" in window){window.loadFirebugConsole();}</script></head><body></body></html>'");_88.body().appendChild(f);dhm.initOnFontResize=function(){};};dhm.onFontResize=function(){};dhm._fontresize=function(){dhm.onFontResize();};_87.addOnUnload(function(){var f=dhm._fontResizeNode;if(f){if(has("ie")&&f.onresize){f.onresize=null;}else{if(f.contentWindow&&f.contentWindow.onresize){f.contentWindow.onresize=null;}}dhm._fontResizeNode=null;}});_86(function(){try{var n=_88.doc.createElement("div");n.style.cssText="top:0;left:0;width:100px;height:100px;overflow:scroll;position:absolute;visibility:hidden;";_88.body().appendChild(n);_94.w=n.offsetWidth-n.clientWidth;_94.h=n.offsetHeight-n.clientHeight;_88.body().removeChild(n);delete n;}catch(e){}if("fontSizeWatch" in _84.config&&!!_84.config.fontSizeWatch){dhm.initOnFontResize();}});return dhm;});},"dojox/html/entities":function(){define("dojox/html/entities",["dojo/_base/lang"],function(_96){var dhe=_96.getObject("dojox.html.entities",true);var _97=function(str,map){var _98,_99;if(map._encCache&&map._encCache.regexp&&map._encCache.mapper&&map.length==map._encCache.length){_98=map._encCache.mapper;_99=map._encCache.regexp;}else{_98={};_99=["["];var i;for(i=0;i<map.length;i++){_98[map[i][0]]="&"+map[i][1]+";";_99.push(map[i][0]);}_99.push("]");_99=new RegExp(_99.join(""),"g");map._encCache={mapper:_98,regexp:_99,length:map.length};}str=str.replace(_99,function(c){return _98[c];});return str;};var _9a=function(str,map){var _9b,_9c;if(map._decCache&&map._decCache.regexp&&map._decCache.mapper&&map.length==map._decCache.length){_9b=map._decCache.mapper;_9c=map._decCache.regexp;}else{_9b={};_9c=["("];var i;for(i=0;i<map.length;i++){var e="&"+map[i][1]+";";if(i){_9c.push("|");}_9b[e]=map[i][0];_9c.push(e);}_9c.push(")");_9c=new RegExp(_9c.join(""),"g");map._decCache={mapper:_9b,regexp:_9c,length:map.length};}str=str.replace(_9c,function(c){return _9b[c];});return str;};dhe.html=[["&","amp"],["\"","quot"],["<","lt"],[">","gt"],[" ","nbsp"]];dhe.latin=[["¡","iexcl"],["¢","cent"],["£","pound"],["€","euro"],["¤","curren"],["¥","yen"],["¦","brvbar"],["§","sect"],["¨","uml"],["©","copy"],["ª","ordf"],["«","laquo"],["¬","not"],["­","shy"],["®","reg"],["¯","macr"],["°","deg"],["±","plusmn"],["²","sup2"],["³","sup3"],["´","acute"],["µ","micro"],["¶","para"],["·","middot"],["¸","cedil"],["¹","sup1"],["º","ordm"],["»","raquo"],["¼","frac14"],["½","frac12"],["¾","frac34"],["¿","iquest"],["À","Agrave"],["Á","Aacute"],["Â","Acirc"],["Ã","Atilde"],["Ä","Auml"],["Å","Aring"],["Æ","AElig"],["Ç","Ccedil"],["È","Egrave"],["É","Eacute"],["Ê","Ecirc"],["Ë","Euml"],["Ì","Igrave"],["Í","Iacute"],["Î","Icirc"],["Ï","Iuml"],["Ð","ETH"],["Ñ","Ntilde"],["Ò","Ograve"],["Ó","Oacute"],["Ô","Ocirc"],["Õ","Otilde"],["Ö","Ouml"],["×","times"],["Ø","Oslash"],["Ù","Ugrave"],["Ú","Uacute"],["Û","Ucirc"],["Ü","Uuml"],["Ý","Yacute"],["Þ","THORN"],["ß","szlig"],["à","agrave"],["á","aacute"],["â","acirc"],["ã","atilde"],["ä","auml"],["å","aring"],["æ","aelig"],["ç","ccedil"],["è","egrave"],["é","eacute"],["ê","ecirc"],["ë","euml"],["ì","igrave"],["í","iacute"],["î","icirc"],["ï","iuml"],["ð","eth"],["ñ","ntilde"],["ò","ograve"],["ó","oacute"],["ô","ocirc"],["õ","otilde"],["ö","ouml"],["÷","divide"],["ø","oslash"],["ù","ugrave"],["ú","uacute"],["û","ucirc"],["ü","uuml"],["ý","yacute"],["þ","thorn"],["ÿ","yuml"],["ƒ","fnof"],["Α","Alpha"],["Β","Beta"],["Γ","Gamma"],["Δ","Delta"],["Ε","Epsilon"],["Ζ","Zeta"],["Η","Eta"],["Θ","Theta"],["Ι","Iota"],["Κ","Kappa"],["Λ","Lambda"],["Μ","Mu"],["Ν","Nu"],["Ξ","Xi"],["Ο","Omicron"],["Π","Pi"],["Ρ","Rho"],["Σ","Sigma"],["Τ","Tau"],["Υ","Upsilon"],["Φ","Phi"],["Χ","Chi"],["Ψ","Psi"],["Ω","Omega"],["α","alpha"],["β","beta"],["γ","gamma"],["δ","delta"],["ε","epsilon"],["ζ","zeta"],["η","eta"],["θ","theta"],["ι","iota"],["κ","kappa"],["λ","lambda"],["μ","mu"],["ν","nu"],["ξ","xi"],["ο","omicron"],["π","pi"],["ρ","rho"],["ς","sigmaf"],["σ","sigma"],["τ","tau"],["υ","upsilon"],["φ","phi"],["χ","chi"],["ψ","psi"],["ω","omega"],["ϑ","thetasym"],["ϒ","upsih"],["ϖ","piv"],["•","bull"],["…","hellip"],["′","prime"],["″","Prime"],["‾","oline"],["⁄","frasl"],["℘","weierp"],["ℑ","image"],["ℜ","real"],["™","trade"],["ℵ","alefsym"],["←","larr"],["↑","uarr"],["→","rarr"],["↓","darr"],["↔","harr"],["↵","crarr"],["⇐","lArr"],["⇑","uArr"],["⇒","rArr"],["⇓","dArr"],["⇔","hArr"],["∀","forall"],["∂","part"],["∃","exist"],["∅","empty"],["∇","nabla"],["∈","isin"],["∉","notin"],["∋","ni"],["∏","prod"],["∑","sum"],["−","minus"],["∗","lowast"],["√","radic"],["∝","prop"],["∞","infin"],["∠","ang"],["∧","and"],["∨","or"],["∩","cap"],["∪","cup"],["∫","int"],["∴","there4"],["∼","sim"],["≅","cong"],["≈","asymp"],["≠","ne"],["≡","equiv"],["≤","le"],["≥","ge"],["⊂","sub"],["⊃","sup"],["⊄","nsub"],["⊆","sube"],["⊇","supe"],["⊕","oplus"],["⊗","otimes"],["⊥","perp"],["⋅","sdot"],["⌈","lceil"],["⌉","rceil"],["⌊","lfloor"],["⌋","rfloor"],["〈","lang"],["〉","rang"],["◊","loz"],["♠","spades"],["♣","clubs"],["♥","hearts"],["♦","diams"],["Œ","Elig"],["œ","oelig"],["Š","Scaron"],["š","scaron"],["Ÿ","Yuml"],["ˆ","circ"],["˜","tilde"],[" ","ensp"],[" ","emsp"],[" ","thinsp"],["‌","zwnj"],["‍","zwj"],["‎","lrm"],["‏","rlm"],["–","ndash"],["—","mdash"],["‘","lsquo"],["’","rsquo"],["‚","sbquo"],["“","ldquo"],["”","rdquo"],["„","bdquo"],["†","dagger"],["‡","Dagger"],["‰","permil"],["‹","lsaquo"],["›","rsaquo"]];dhe.encode=function(str,m){if(str){if(!m){str=_97(str,dhe.html);str=_97(str,dhe.latin);}else{str=_97(str,m);}}return str;};dhe.decode=function(str,m){if(str){if(!m){str=_9a(str,dhe.html);str=_9a(str,dhe.latin);}else{str=_9a(str,m);}}return str;};return dhe;});},"dojo/parser":function(){define("dojo/parser",["./_base/kernel","./_base/lang","./_base/array","./_base/config","./_base/html","./_base/window","./_base/url","./_base/json","./aspect","./date/stamp","./has","./query","./on","./ready"],function(_9d,_9e,_9f,_a0,_a1,_a2,_a3,_a4,_a5,_a6,has,_a7,don,_a8){new Date("X");if(1){var _a9=document.createElement("form");has.add("dom-attributes-explicit",_a9.attributes.length==0);has.add("dom-attributes-specified-flag",_a9.attributes.length<40);}_9d.parser=new function(){var _aa={};function _ab(_ac){var map={};for(var _ad in _ac){if(_ad.charAt(0)=="_"){continue;}map[_ad.toLowerCase()]=_ad;}return map;};_a5.after(_9e,"extend",function(){_aa={};},true);var _ae={};function _af(_b0){var map=_ae[_b0]||(_ae[_b0]={});return map["__type"]||(map["__type"]=(_9e.getObject(_b0)||require(_b0)));};this._functionFromScript=function(_b1,_b2){var _b3="";var _b4="";var _b5=(_b1.getAttribute(_b2+"args")||_b1.getAttribute("args"));if(_b5){_9f.forEach(_b5.split(/\s*,\s*/),function(_b6,idx){_b3+="var "+_b6+" = arguments["+idx+"]; ";});}var _b7=_b1.getAttribute("with");if(_b7&&_b7.length){_9f.forEach(_b7.split(/\s*,\s*/),function(_b8){_b3+="with("+_b8+"){";_b4+="}";});}return new Function(_b3+_b1.innerHTML+_b4);};this.instantiate=function(_b9,_ba,_bb){_ba=_ba||{};_bb=_bb||{};var _bc=(_bb.scope||_9d._scopeName)+"Type",_bd="data-"+(_bb.scope||_9d._scopeName)+"-",_be=_bd+"type";var _bf=[];_9f.forEach(_b9,function(_c0){var _c1=_bc in _ba?_ba[_bc]:_c0.getAttribute(_be)||_c0.getAttribute(_bc);if(_c1){_bf.push({node:_c0,"type":_c1});}});return this._instantiate(_bf,_ba,_bb);};this._instantiate=function(_c2,_c3,_c4){var _c5=[];var _c6=(_c4.scope||_9d._scopeName)+"Type",_c7="data-"+(_c4.scope||_9d._scopeName)+"-",_c8=_c7+"type",_c9=_c7+"props",_ca=_c7+"attach-point",_cb=_c7+"attach-event",_cc=_c7+"id",_cd=_c7+"mixins";var _ce={};_9f.forEach([_c9,_c8,_c6,_cc,"jsId",_ca,_cb,"dojoAttachPoint","dojoAttachEvent","class","style",_cd],function(_cf){_ce[_cf.toLowerCase()]=_cf.replace(_c4.scope,"dojo");});function _d0(_d1,_d2){return _d1.createSubclass&&_d1.createSubclass(_d2)||_d1.extend.apply(_d1,_d2);};_9f.forEach(_c2,function(obj){if(!obj){return;}var _d3=obj.node,_d4=obj.type,_d5=_d3.getAttribute(_cd),_d6;if(_d5){var map=_ae[_d4];_d5=_d5.replace(/ /g,"");_d6=map&&map[_d5];if(!_d6){_d6=_af(_d4);_d6=_ae[_d4][_d5]=_d0(_d6,_9f.map(_d5.split(","),_af));}}else{_d6=_af(_d4);}var _d7=_d6&&_d6.prototype;var _d8={};if(_c4.defaults){_9e.mixin(_d8,_c4.defaults);}if(obj.inherited){_9e.mixin(_d8,obj.inherited);}var _d9;if(has("dom-attributes-explicit")){_d9=_d3.attributes;}else{if(has("dom-attributes-specified-flag")){_d9=_9f.filter(_d3.attributes,function(a){return a.specified;});}else{var _da=/^input$|^img$/i.test(_d3.nodeName)?_d3:_d3.cloneNode(false),_db=_da.outerHTML.replace(/=[^\s"']+|="[^"]*"|='[^']*'/g,"").replace(/^\s*<[a-zA-Z0-9]*\s*/,"").replace(/\s*>.*$/,"");_d9=_9f.map(_db.split(/\s+/),function(_dc){var _dd=_dc.toLowerCase();return {name:_dc,value:(_d3.nodeName=="LI"&&_dc=="value")||_dd=="enctype"?_d3.getAttribute(_dd):_d3.getAttributeNode(_dd).value};});}}var i=0,_de;while(_de=_d9[i++]){var _df=_de.name,_e0=_df.toLowerCase(),_e1=_de.value;if(_e0 in _ce){switch(_ce[_e0]){case "data-dojo-props":var _e2=_e1;break;case "data-dojo-id":case "jsId":var _e3=_e1;break;case "data-dojo-attach-point":case "dojoAttachPoint":_d8.dojoAttachPoint=_e1;break;case "data-dojo-attach-event":case "dojoAttachEvent":_d8.dojoAttachEvent=_e1;break;case "class":_d8["class"]=_d3.className;break;case "style":_d8["style"]=_d3.style&&_d3.style.cssText;break;}}else{if(!(_df in _d7)){var map=(_aa[_d4]||(_aa[_d4]=_ab(_d7)));_df=map[_e0]||_df;}if(_df in _d7){switch(typeof _d7[_df]){case "string":_d8[_df]=_e1;break;case "number":_d8[_df]=_e1.length?Number(_e1):NaN;break;case "boolean":_d8[_df]=_e1.toLowerCase()!="false";break;case "function":if(_e1===""||_e1.search(/[^\w\.]+/i)!=-1){_d8[_df]=new Function(_e1);}else{_d8[_df]=_9e.getObject(_e1,false)||new Function(_e1);}break;default:var _e4=_d7[_df];_d8[_df]=(_e4&&"length" in _e4)?(_e1?_e1.split(/\s*,\s*/):[]):(_e4 instanceof Date)?(_e1==""?new Date(""):_e1=="now"?new Date():_a6.fromISOString(_e1)):(_e4 instanceof _9d._Url)?(_9d.baseUrl+_e1):_a4.fromJson(_e1);}}else{_d8[_df]=_e1;}}}if(_e2){try{_e2=_a4.fromJson.call(_c4.propsThis,"{"+_e2+"}");_9e.mixin(_d8,_e2);}catch(e){throw new Error(e.toString()+" in data-dojo-props='"+_e2+"'");}}_9e.mixin(_d8,_c3);var _e5=obj.scripts||(_d6&&(_d6._noScript||_d7._noScript)?[]:_a7("> script[type^='dojo/']",_d3));var _e6=[],_e7=[],_e8=[],on=[];if(_e5){for(i=0;i<_e5.length;i++){var _e9=_e5[i];_d3.removeChild(_e9);var _ea=(_e9.getAttribute(_c7+"event")||_e9.getAttribute("event")),_eb=_e9.getAttribute(_c7+"prop"),_ec=_e9.getAttribute("type"),nf=this._functionFromScript(_e9,_c7);if(_ea){if(_ec=="dojo/connect"){_e6.push({event:_ea,func:nf});}else{if(_ec=="dojo/on"){on.push({event:_ea,func:nf});}else{_d8[_ea]=nf;}}}else{if(_ec=="dojo/watch"){_e8.push({prop:_eb,func:nf});}else{_e7.push(nf);}}}}var _ed=_d6.markupFactory||_d7.markupFactory;var _ee=_ed?_ed(_d8,_d3,_d6):new _d6(_d8,_d3);_c5.push(_ee);if(_e3){_9e.setObject(_e3,_ee);}for(i=0;i<_e6.length;i++){_a5.after(_ee,_e6[i].event,_9d.hitch(_ee,_e6[i].func),true);}for(i=0;i<_e7.length;i++){_e7[i].call(_ee);}for(i=0;i<_e8.length;i++){_ee.watch(_e8[i].prop,_e8[i].func);}for(i=0;i<on.length;i++){don(_ee,on[i].event,on[i].func);}},this);if(!_c3._started){_9f.forEach(_c5,function(_ef){if(!_c4.noStart&&_ef&&_9e.isFunction(_ef.startup)&&!_ef._started){_ef.startup();}});}return _c5;};this.scan=function(_f0,_f1){var _f2=[];var _f3=(_f1.scope||_9d._scopeName)+"Type",_f4="data-"+(_f1.scope||_9d._scopeName)+"-",_f5=_f4+"type",_f6=_f4+"textdir";var _f7=_f0.firstChild;var _f8=_f1.inherited;if(!_f8){function _f9(_fa,_fb){return (_fa.getAttribute&&_fa.getAttribute(_fb))||(_fa!==_a2.doc&&_fa!==_a2.doc.documentElement&&_fa.parentNode?_f9(_fa.parentNode,_fb):null);};_f8={dir:_f9(_f0,"dir"),lang:_f9(_f0,"lang"),textDir:_f9(_f0,_f6)};for(var key in _f8){if(!_f8[key]){delete _f8[key];}}}var _fc={inherited:_f8};var _fd;var _fe;function _ff(_100){if(!_100.inherited){_100.inherited={};var node=_100.node,_101=_ff(_100.parent);var _102={dir:node.getAttribute("dir")||_101.dir,lang:node.getAttribute("lang")||_101.lang,textDir:node.getAttribute(_f6)||_101.textDir};for(var key in _102){if(_102[key]){_100.inherited[key]=_102[key];}}}return _100.inherited;};while(true){if(!_f7){if(!_fc||!_fc.node){break;}_f7=_fc.node.nextSibling;_fd=_fc.scripts;_fe=false;_fc=_fc.parent;continue;}if(_f7.nodeType!=1){_f7=_f7.nextSibling;continue;}if(_fd&&_f7.nodeName.toLowerCase()=="script"){type=_f7.getAttribute("type");if(type&&/^dojo\/\w/i.test(type)){_fd.push(_f7);}_f7=_f7.nextSibling;continue;}if(_fe){_f7=_f7.nextSibling;continue;}var type=_f7.getAttribute(_f5)||_f7.getAttribute(_f3);var _103=_f7.firstChild;if(!type&&(!_103||(_103.nodeType==3&&!_103.nextSibling))){_f7=_f7.nextSibling;continue;}var _104={node:_f7,scripts:_fd,parent:_fc};var ctor;try{ctor=type&&_af(type);}catch(e){}var _105=ctor&&!ctor.prototype._noScript?[]:null;if(type){_f2.push({"type":type,node:_f7,scripts:_105,inherited:_ff(_104)});}_f7=_103;_fd=_105;_fe=ctor&&ctor.prototype.stopParser&&!(_f1.template);_fc=_104;}return _f2;};this.parse=function(_106,_107){var root;if(!_107&&_106&&_106.rootNode){_107=_106;root=_107.rootNode;}else{if(_106&&_9e.isObject(_106)&&!("nodeType" in _106)){_107=_106;}else{root=_106;}}root=root?_a1.byId(root):_a2.body();_107=_107||{};var list=this.scan(root,_107);var _108=_107.template?{template:true}:{};return this._instantiate(list,_108,_107);};}();if(_a0.parseOnLoad){_a8(100,_9d.parser,"parse");}return _9d.parser;});},"dojox/html":function(){define("dojox/html",["./html/_base"],function(html){return html;});},"*noref":1}});define("dojox/_dojox_html",[],1);require(["dojox/html","dojox/html/metrics","dojox/html/entities"]);
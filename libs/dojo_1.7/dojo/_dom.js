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
require({cache:{"dojo/touch":function(){define("dojo/touch",["./_base/kernel","./aspect","./dom","./on","./has","./mouse","./domReady","./_base/window"],function(_1,_2,_3,on,_4,_5,_6,_7){var _8=_4("touch");var _9=false;if(_4("ios")){var ua=navigator.userAgent;var v=ua.match(/OS ([\d_]+)/)?RegExp.$1:"1";var os=parseFloat(v.replace(/_/,".").replace(/_/g,""));_9=os<5;}var _a;function _b(_c,_d){if(_8){return function(_e,_f){var _10=on(_e,_d,_f),_11=on(_e,_c,function(evt){if(!_a||(new Date()).getTime()>_a+1000){_f.call(this,evt);}});return {remove:function(){_10.remove();_11.remove();}};};}else{return function(_12,_13){return on(_12,_c,_13);};}};var _14,_15;if(_8){_6(function(){_15=_7.body();_7.doc.addEventListener("touchstart",function(evt){_a=(new Date()).getTime();var _16=_15;_15=evt.target;on.emit(_16,"dojotouchout",{target:_16,relatedTarget:_15,bubbles:true});on.emit(_15,"dojotouchover",{target:_15,relatedTarget:_16,bubbles:true});},true);on(_7.doc,"touchmove",function(evt){_a=(new Date()).getTime();var _17=_7.doc.elementFromPoint(evt.pageX-(_9?0:_7.global.pageXOffset),evt.pageY-(_9?0:_7.global.pageYOffset));if(_17&&_15!==_17){on.emit(_15,"dojotouchout",{target:_15,relatedTarget:_17,bubbles:true});on.emit(_17,"dojotouchover",{target:_17,relatedTarget:_15,bubbles:true});_15=_17;}});});_14=function(_18,_19){return on(_7.doc,"touchmove",function(evt){if(_18===_7.doc||_3.isDescendant(_15,_18)){evt.target=_15;_19.call(this,evt);}});};}var _1a={press:_b("mousedown","touchstart"),move:_b("mousemove",_14),release:_b("mouseup","touchend"),cancel:_b(_5.leave,"touchcancel"),over:_b("mouseover","dojotouchover"),out:_b("mouseout","dojotouchout"),enter:_5._eventHandler(_b("mouseover","dojotouchover")),leave:_5._eventHandler(_b("mouseout","dojotouchout"))};1&&(_1.touch=_1a);return _1a;});},"dojo/date/stamp":function(){define("dojo/date/stamp",["../_base/kernel","../_base/lang","../_base/array"],function(_1b,_1c,_1d){_1c.getObject("date.stamp",true,_1b);_1b.date.stamp.fromISOString=function(_1e,_1f){if(!_1b.date.stamp._isoRegExp){_1b.date.stamp._isoRegExp=/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;}var _20=_1b.date.stamp._isoRegExp.exec(_1e),_21=null;if(_20){_20.shift();if(_20[1]){_20[1]--;}if(_20[6]){_20[6]*=1000;}if(_1f){_1f=new Date(_1f);_1d.forEach(_1d.map(["FullYear","Month","Date","Hours","Minutes","Seconds","Milliseconds"],function(_22){return _1f["get"+_22]();}),function(_23,_24){_20[_24]=_20[_24]||_23;});}_21=new Date(_20[0]||1970,_20[1]||0,_20[2]||1,_20[3]||0,_20[4]||0,_20[5]||0,_20[6]||0);if(_20[0]<100){_21.setFullYear(_20[0]||1970);}var _25=0,_26=_20[7]&&_20[7].charAt(0);if(_26!="Z"){_25=((_20[8]||0)*60)+(Number(_20[9])||0);if(_26!="-"){_25*=-1;}}if(_26){_25-=_21.getTimezoneOffset();}if(_25){_21.setTime(_21.getTime()+_25*60000);}}return _21;};_1b.date.stamp.toISOString=function(_27,_28){var _29=function(n){return (n<10)?"0"+n:n;};_28=_28||{};var _2a=[],_2b=_28.zulu?"getUTC":"get",_2c="";if(_28.selector!="time"){var _2d=_27[_2b+"FullYear"]();_2c=["0000".substr((_2d+"").length)+_2d,_29(_27[_2b+"Month"]()+1),_29(_27[_2b+"Date"]())].join("-");}_2a.push(_2c);if(_28.selector!="date"){var _2e=[_29(_27[_2b+"Hours"]()),_29(_27[_2b+"Minutes"]()),_29(_27[_2b+"Seconds"]())].join(":");var _2f=_27[_2b+"Milliseconds"]();if(_28.milliseconds){_2e+="."+(_2f<100?"0":"")+_29(_2f);}if(_28.zulu){_2e+="Z";}else{if(_28.selector!="time"){var _30=_27.getTimezoneOffset();var _31=Math.abs(_30);_2e+=(_30>0?"-":"+")+_29(Math.floor(_31/60))+":"+_29(_31%60);}}_2a.push(_2e);}return _2a.join("T");};return _1b.date.stamp;});},"dojo/_base/url":function(){define("dojo/_base/url",["./kernel"],function(_32){var ore=new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),ire=new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$"),_33=function(){var n=null,_34=arguments,uri=[_34[0]];for(var i=1;i<_34.length;i++){if(!_34[i]){continue;}var _35=new _33(_34[i]+""),_36=new _33(uri[0]+"");if(_35.path==""&&!_35.scheme&&!_35.authority&&!_35.query){if(_35.fragment!=n){_36.fragment=_35.fragment;}_35=_36;}else{if(!_35.scheme){_35.scheme=_36.scheme;if(!_35.authority){_35.authority=_36.authority;if(_35.path.charAt(0)!="/"){var _37=_36.path.substring(0,_36.path.lastIndexOf("/")+1)+_35.path;var _38=_37.split("/");for(var j=0;j<_38.length;j++){if(_38[j]=="."){if(j==_38.length-1){_38[j]="";}else{_38.splice(j,1);j--;}}else{if(j>0&&!(j==1&&_38[0]=="")&&_38[j]==".."&&_38[j-1]!=".."){if(j==(_38.length-1)){_38.splice(j,1);_38[j-1]="";}else{_38.splice(j-1,2);j-=2;}}}}_35.path=_38.join("/");}}}}uri=[];if(_35.scheme){uri.push(_35.scheme,":");}if(_35.authority){uri.push("//",_35.authority);}uri.push(_35.path);if(_35.query){uri.push("?",_35.query);}if(_35.fragment){uri.push("#",_35.fragment);}}this.uri=uri.join("");var r=this.uri.match(ore);this.scheme=r[2]||(r[1]?"":n);this.authority=r[4]||(r[3]?"":n);this.path=r[5];this.query=r[7]||(r[6]?"":n);this.fragment=r[9]||(r[8]?"":n);if(this.authority!=n){r=this.authority.match(ire);this.user=r[3]||n;this.password=r[4]||n;this.host=r[6]||r[7];this.port=r[9]||n;}};_33.prototype.toString=function(){return this.uri;};return _32._Url=_33;});},"dojo/html":function(){define("dojo/html",["./_base/kernel","./_base/lang","./_base/array","./_base/declare","./dom","./dom-construct","./parser"],function(_39,_3a,_3b,_3c,dom,_3d,_3e){_3a.getObject("html",true,_39);var _3f=0;_39.html._secureForInnerHtml=function(_40){return _40.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig,"");};_39.html._emptyNode=_3d.empty;_39.html._setNodeContent=function(_41,_42){_3d.empty(_41);if(_42){if(typeof _42=="string"){_42=_3d.toDom(_42,_41.ownerDocument);}if(!_42.nodeType&&_3a.isArrayLike(_42)){for(var _43=_42.length,i=0;i<_42.length;i=_43==_42.length?i+1:0){_3d.place(_42[i],_41,"last");}}else{_3d.place(_42,_41,"last");}}return _41;};_3c("dojo.html._ContentSetter",null,{node:"",content:"",id:"",cleanContent:false,extractContent:false,parseContent:false,parserScope:_39._scopeName,startup:true,constructor:function(_44,_45){_3a.mixin(this,_44||{});_45=this.node=dom.byId(this.node||_45);if(!this.id){this.id=["Setter",(_45)?_45.id||_45.tagName:"",_3f++].join("_");}},set:function(_46,_47){if(undefined!==_46){this.content=_46;}if(_47){this._mixin(_47);}this.onBegin();this.setContent();this.onEnd();return this.node;},setContent:function(){var _48=this.node;if(!_48){throw new Error(this.declaredClass+": setContent given no node");}try{_48=_39.html._setNodeContent(_48,this.content);}catch(e){var _49=this.onContentError(e);try{_48.innerHTML=_49;}catch(e){console.error("Fatal "+this.declaredClass+".setContent could not change content due to "+e.message,e);}}this.node=_48;},empty:function(){if(this.parseResults&&this.parseResults.length){_3b.forEach(this.parseResults,function(w){if(w.destroy){w.destroy();}});delete this.parseResults;}_39.html._emptyNode(this.node);},onBegin:function(){var _4a=this.content;if(_3a.isString(_4a)){if(this.cleanContent){_4a=_39.html._secureForInnerHtml(_4a);}if(this.extractContent){var _4b=_4a.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);if(_4b){_4a=_4b[1];}}}this.empty();this.content=_4a;return this.node;},onEnd:function(){if(this.parseContent){this._parse();}return this.node;},tearDown:function(){delete this.parseResults;delete this.node;delete this.content;},onContentError:function(err){return "Error occured setting content: "+err;},_mixin:function(_4c){var _4d={},key;for(key in _4c){if(key in _4d){continue;}this[key]=_4c[key];}},_parse:function(){var _4e=this.node;try{var _4f={};_3b.forEach(["dir","lang","textDir"],function(_50){if(this[_50]){_4f[_50]=this[_50];}},this);this.parseResults=_3e.parse({rootNode:_4e,noStart:!this.startup,inherited:_4f,scope:this.parserScope});}catch(e){this._onError("Content",e,"Error parsing in _ContentSetter#"+this.id);}},_onError:function(_51,err,_52){var _53=this["on"+_51+"Error"].call(this,err);if(_52){console.error(_52,err);}else{if(_53){_39.html._setNodeContent(this.node,_53,true);}}}});_39.html.set=function(_54,_55,_56){if(undefined==_55){console.warn("dojo.html.set: no cont argument provided, using empty string");_55="";}if(!_56){return _39.html._setNodeContent(_54,_55,true);}else{var op=new _39.html._ContentSetter(_3a.mixin(_56,{content:_55,node:_54}));return op.set();}};return _39.html;});},"dojo/uacss":function(){define("dojo/uacss",["./dom-geometry","./_base/lang","./ready","./_base/sniff","./_base/window"],function(_57,_58,_59,has,_5a){var _5b=_5a.doc.documentElement,ie=has("ie"),_5c=has("opera"),maj=Math.floor,ff=has("ff"),_5d=_57.boxModel.replace(/-/,""),_5e={"dj_quirks":has("quirks"),"dj_opera":_5c,"dj_khtml":has("khtml"),"dj_webkit":has("webkit"),"dj_safari":has("safari"),"dj_chrome":has("chrome"),"dj_gecko":has("mozilla")};if(ie){_5e["dj_ie"]=true;_5e["dj_ie"+maj(ie)]=true;_5e["dj_iequirks"]=has("quirks");}if(ff){_5e["dj_ff"+maj(ff)]=true;}_5e["dj_"+_5d]=true;var _5f="";for(var clz in _5e){if(_5e[clz]){_5f+=clz+" ";}}_5b.className=_58.trim(_5b.className+" "+_5f);_59(90,function(){if(!_57.isBodyLtr()){var _60="dj_rtl dijitRtl "+_5f.replace(/ /g,"-rtl ");_5b.className=_58.trim(_5b.className+" "+_60+"dj_rtl dijitRtl "+_5f.replace(/ /g,"-rtl "));}});return has;});},"dojo/window":function(){define("dojo/window",["./_base/lang","./_base/sniff","./_base/window","./dom","./dom-geometry","./dom-style","./dom-construct"],function(_61,has,_62,dom,_63,_64,_65){has.add("rtl-adjust-position-for-verticalScrollBar",function(win,doc){var _66=_62.body(doc),_67=_65.create("div",{style:{overflow:"scroll",overflowX:"visible",direction:"rtl",visibility:"hidden",position:"absolute",left:"0",top:"0",width:"64px",height:"64px"}},_66,"last"),div=_65.create("div",{style:{overflow:"hidden",direction:"ltr"}},_67,"last"),ret=_63.position(div).x!=0;_67.removeChild(div);_66.removeChild(_67);return ret;});has.add("position-fixed-support",function(win,doc){var _68=_62.body(doc),_69=_65.create("span",{style:{visibility:"hidden",position:"fixed",left:"1px",top:"1px"}},_68,"last"),_6a=_65.create("span",{style:{position:"fixed",left:"0",top:"0"}},_69,"last"),ret=_63.position(_6a).x!=_63.position(_69).x;_69.removeChild(_6a);_68.removeChild(_69);return ret;});var _6b=_61.getObject("dojo.window",true);_6b.getBox=function(){var _6c=(_62.doc.compatMode=="BackCompat")?_62.body():_62.doc.documentElement,_6d=_63.docScroll(),w,h;if(has("touch")){var _6e=_62.doc.parentWindow||_62.doc.defaultView;w=_6e.innerWidth||_6c.clientWidth;h=_6e.innerHeight||_6c.clientHeight;}else{w=_6c.clientWidth;h=_6c.clientHeight;}return {l:_6d.x,t:_6d.y,w:w,h:h};};_6b.get=function(doc){if(has("ie")<9&&_6b!==document.parentWindow){doc.parentWindow.execScript("document._parentWindow = window;","Javascript");var win=doc._parentWindow;doc._parentWindow=null;return win;}return doc.parentWindow||doc.defaultView;};_6b.scrollIntoView=function(_6f,pos){try{_6f=dom.byId(_6f);var doc=_6f.ownerDocument||_62.doc,_70=_62.body(doc),_71=doc.documentElement||_70.parentNode,_72=has("ie"),_73=has("webkit");if(_6f==_70||_6f==_71){return;}if(!(has("mozilla")||_72||_73||has("opera")||has("trident"))&&("scrollIntoView" in _6f)){_6f.scrollIntoView(false);return;}var _74=doc.compatMode=="BackCompat",_75=Math.min(_70.clientWidth||_71.clientWidth,_71.clientWidth||_70.clientWidth),_76=Math.min(_70.clientHeight||_71.clientHeight,_71.clientHeight||_70.clientHeight),_77=(_73||_74)?_70:_71,_78=pos||_63.position(_6f),el=_6f.parentNode,_79=function(el){return (_72<=6||(_72==7&&_74))?false:(has("position-fixed-support")&&(_64.get(el,"position").toLowerCase()=="fixed"));},_7a=this,_7b=function(el,x,y){if(el.tagName=="BODY"||el.tagName=="HTML"){_7a.get(el.ownerDocument).scrollBy(x,y);}else{x&&(el.scrollLeft+=x);y&&(el.scrollTop+=y);}};if(_79(_6f)){return;}while(el){if(el==_70){el=_77;}var _7c=_63.position(el),_7d=_79(el),rtl=_64.getComputedStyle(el).direction.toLowerCase()=="rtl";if(el==_77){_7c.w=_75;_7c.h=_76;if(_77==_71&&(_72||has("trident"))&&rtl){_7c.x+=_77.offsetWidth-_7c.w;}if(_7c.x<0||!_72||_72>=9||has("trident")){_7c.x=0;}if(_7c.y<0||!_72||_72>=9||has("trident")){_7c.y=0;}}else{var pb=_63.getPadBorderExtents(el);_7c.w-=pb.w;_7c.h-=pb.h;_7c.x+=pb.l;_7c.y+=pb.t;var _7e=el.clientWidth,_7f=_7c.w-_7e;if(_7e>0&&_7f>0){if(rtl&&has("rtl-adjust-position-for-verticalScrollBar")){_7c.x+=_7f;}_7c.w=_7e;}_7e=el.clientHeight;_7f=_7c.h-_7e;if(_7e>0&&_7f>0){_7c.h=_7e;}}if(_7d){if(_7c.y<0){_7c.h+=_7c.y;_7c.y=0;}if(_7c.x<0){_7c.w+=_7c.x;_7c.x=0;}if(_7c.y+_7c.h>_76){_7c.h=_76-_7c.y;}if(_7c.x+_7c.w>_75){_7c.w=_75-_7c.x;}}var l=_78.x-_7c.x,t=_78.y-_7c.y,r=l+_78.w-_7c.w,bot=t+_78.h-_7c.h;var s,old;if(r*l>0&&(!!el.scrollLeft||el==_77||el.scrollWidth>el.offsetHeight)){s=Math[l<0?"max":"min"](l,r);if(rtl&&((_72==8&&!_74)||_72>=9||has("trident"))){s=-s;}old=el.scrollLeft;_7b(el,s,0);s=el.scrollLeft-old;_78.x-=s;}if(bot*t>0&&(!!el.scrollTop||el==_77||el.scrollHeight>el.offsetHeight)){s=Math.ceil(Math[t<0?"max":"min"](t,bot));old=el.scrollTop;_7b(el,0,s);s=el.scrollTop-old;_78.y-=s;}el=(el!=_77)&&!_7d&&el.parentNode;}}catch(error){console.error("scrollIntoView: "+error);_6f.scrollIntoView(false);}};return _6b;});},"dojo/parser":function(){define("dojo/parser",["./_base/kernel","./_base/lang","./_base/array","./_base/config","./_base/html","./_base/window","./_base/url","./_base/json","./aspect","./date/stamp","./has","./query","./on","./ready"],function(_80,_81,_82,_83,_84,_85,_86,_87,_88,_89,has,_8a,don,_8b){new Date("X");if(1){var _8c=document.createElement("form");has.add("dom-attributes-explicit",_8c.attributes.length==0);has.add("dom-attributes-specified-flag",_8c.attributes.length<40);}_80.parser=new function(){var _8d={};function _8e(_8f){var map={};for(var _90 in _8f){if(_90.charAt(0)=="_"){continue;}map[_90.toLowerCase()]=_90;}return map;};_88.after(_81,"extend",function(){_8d={};},true);var _91={};function _92(_93){var map=_91[_93]||(_91[_93]={});return map["__type"]||(map["__type"]=(_81.getObject(_93)||require(_93)));};this._functionFromScript=function(_94,_95){var _96="";var _97="";var _98=(_94.getAttribute(_95+"args")||_94.getAttribute("args"));if(_98){_82.forEach(_98.split(/\s*,\s*/),function(_99,idx){_96+="var "+_99+" = arguments["+idx+"]; ";});}var _9a=_94.getAttribute("with");if(_9a&&_9a.length){_82.forEach(_9a.split(/\s*,\s*/),function(_9b){_96+="with("+_9b+"){";_97+="}";});}return new Function(_96+_94.innerHTML+_97);};this.instantiate=function(_9c,_9d,_9e){_9d=_9d||{};_9e=_9e||{};var _9f=(_9e.scope||_80._scopeName)+"Type",_a0="data-"+(_9e.scope||_80._scopeName)+"-",_a1=_a0+"type";var _a2=[];_82.forEach(_9c,function(_a3){var _a4=_9f in _9d?_9d[_9f]:_a3.getAttribute(_a1)||_a3.getAttribute(_9f);if(_a4){_a2.push({node:_a3,"type":_a4});}});return this._instantiate(_a2,_9d,_9e);};this._instantiate=function(_a5,_a6,_a7){var _a8=[];var _a9=(_a7.scope||_80._scopeName)+"Type",_aa="data-"+(_a7.scope||_80._scopeName)+"-",_ab=_aa+"type",_ac=_aa+"props",_ad=_aa+"attach-point",_ae=_aa+"attach-event",_af=_aa+"id",_b0=_aa+"mixins";var _b1={};_82.forEach([_ac,_ab,_a9,_af,"jsId",_ad,_ae,"dojoAttachPoint","dojoAttachEvent","class","style",_b0],function(_b2){_b1[_b2.toLowerCase()]=_b2.replace(_a7.scope,"dojo");});function _b3(_b4,_b5){return _b4.createSubclass&&_b4.createSubclass(_b5)||_b4.extend.apply(_b4,_b5);};_82.forEach(_a5,function(obj){if(!obj){return;}var _b6=obj.node,_b7=obj.type,_b8=_b6.getAttribute(_b0),_b9;if(_b8){var map=_91[_b7];_b8=_b8.replace(/ /g,"");_b9=map&&map[_b8];if(!_b9){_b9=_92(_b7);_b9=_91[_b7][_b8]=_b3(_b9,_82.map(_b8.split(","),_92));}}else{_b9=_92(_b7);}var _ba=_b9&&_b9.prototype;var _bb={};if(_a7.defaults){_81.mixin(_bb,_a7.defaults);}if(obj.inherited){_81.mixin(_bb,obj.inherited);}var _bc;if(has("dom-attributes-explicit")){_bc=_b6.attributes;}else{if(has("dom-attributes-specified-flag")){_bc=_82.filter(_b6.attributes,function(a){return a.specified;});}else{var _bd=/^input$|^img$/i.test(_b6.nodeName)?_b6:_b6.cloneNode(false),_be=_bd.outerHTML.replace(/=[^\s"']+|="[^"]*"|='[^']*'/g,"").replace(/^\s*<[a-zA-Z0-9]*\s*/,"").replace(/\s*>.*$/,"");_bc=_82.map(_be.split(/\s+/),function(_bf){var _c0=_bf.toLowerCase();return {name:_bf,value:(_b6.nodeName=="LI"&&_bf=="value")||_c0=="enctype"?_b6.getAttribute(_c0):_b6.getAttributeNode(_c0).value};});}}var i=0,_c1;while(_c1=_bc[i++]){var _c2=_c1.name,_c3=_c2.toLowerCase(),_c4=_c1.value;if(_c3 in _b1){switch(_b1[_c3]){case "data-dojo-props":var _c5=_c4;break;case "data-dojo-id":case "jsId":var _c6=_c4;break;case "data-dojo-attach-point":case "dojoAttachPoint":_bb.dojoAttachPoint=_c4;break;case "data-dojo-attach-event":case "dojoAttachEvent":_bb.dojoAttachEvent=_c4;break;case "class":_bb["class"]=_b6.className;break;case "style":_bb["style"]=_b6.style&&_b6.style.cssText;break;}}else{if(!(_c2 in _ba)){var map=(_8d[_b7]||(_8d[_b7]=_8e(_ba)));_c2=map[_c3]||_c2;}if(_c2 in _ba){switch(typeof _ba[_c2]){case "string":_bb[_c2]=_c4;break;case "number":_bb[_c2]=_c4.length?Number(_c4):NaN;break;case "boolean":_bb[_c2]=_c4.toLowerCase()!="false";break;case "function":if(_c4===""||_c4.search(/[^\w\.]+/i)!=-1){_bb[_c2]=new Function(_c4);}else{_bb[_c2]=_81.getObject(_c4,false)||new Function(_c4);}break;default:var _c7=_ba[_c2];_bb[_c2]=(_c7&&"length" in _c7)?(_c4?_c4.split(/\s*,\s*/):[]):(_c7 instanceof Date)?(_c4==""?new Date(""):_c4=="now"?new Date():_89.fromISOString(_c4)):(_c7 instanceof _80._Url)?(_80.baseUrl+_c4):_87.fromJson(_c4);}}else{_bb[_c2]=_c4;}}}if(_c5){try{_c5=_87.fromJson.call(_a7.propsThis,"{"+_c5+"}");_81.mixin(_bb,_c5);}catch(e){throw new Error(e.toString()+" in data-dojo-props='"+_c5+"'");}}_81.mixin(_bb,_a6);var _c8=obj.scripts||(_b9&&(_b9._noScript||_ba._noScript)?[]:_8a("> script[type^='dojo/']",_b6));var _c9=[],_ca=[],_cb=[],on=[];if(_c8){for(i=0;i<_c8.length;i++){var _cc=_c8[i];_b6.removeChild(_cc);var _cd=(_cc.getAttribute(_aa+"event")||_cc.getAttribute("event")),_ce=_cc.getAttribute(_aa+"prop"),_cf=_cc.getAttribute("type"),nf=this._functionFromScript(_cc,_aa);if(_cd){if(_cf=="dojo/connect"){_c9.push({event:_cd,func:nf});}else{if(_cf=="dojo/on"){on.push({event:_cd,func:nf});}else{_bb[_cd]=nf;}}}else{if(_cf=="dojo/watch"){_cb.push({prop:_ce,func:nf});}else{_ca.push(nf);}}}}var _d0=_b9.markupFactory||_ba.markupFactory;var _d1=_d0?_d0(_bb,_b6,_b9):new _b9(_bb,_b6);_a8.push(_d1);if(_c6){_81.setObject(_c6,_d1);}for(i=0;i<_c9.length;i++){_88.after(_d1,_c9[i].event,_80.hitch(_d1,_c9[i].func),true);}for(i=0;i<_ca.length;i++){_ca[i].call(_d1);}for(i=0;i<_cb.length;i++){_d1.watch(_cb[i].prop,_cb[i].func);}for(i=0;i<on.length;i++){don(_d1,on[i].event,on[i].func);}},this);if(!_a6._started){_82.forEach(_a8,function(_d2){if(!_a7.noStart&&_d2&&_81.isFunction(_d2.startup)&&!_d2._started){_d2.startup();}});}return _a8;};this.scan=function(_d3,_d4){var _d5=[];var _d6=(_d4.scope||_80._scopeName)+"Type",_d7="data-"+(_d4.scope||_80._scopeName)+"-",_d8=_d7+"type",_d9=_d7+"textdir";var _da=_d3.firstChild;var _db=_d4.inherited;if(!_db){function _dc(_dd,_de){return (_dd.getAttribute&&_dd.getAttribute(_de))||(_dd!==_85.doc&&_dd!==_85.doc.documentElement&&_dd.parentNode?_dc(_dd.parentNode,_de):null);};_db={dir:_dc(_d3,"dir"),lang:_dc(_d3,"lang"),textDir:_dc(_d3,_d9)};for(var key in _db){if(!_db[key]){delete _db[key];}}}var _df={inherited:_db};var _e0;var _e1;function _e2(_e3){if(!_e3.inherited){_e3.inherited={};var _e4=_e3.node,_e5=_e2(_e3.parent);var _e6={dir:_e4.getAttribute("dir")||_e5.dir,lang:_e4.getAttribute("lang")||_e5.lang,textDir:_e4.getAttribute(_d9)||_e5.textDir};for(var key in _e6){if(_e6[key]){_e3.inherited[key]=_e6[key];}}}return _e3.inherited;};while(true){if(!_da){if(!_df||!_df.node){break;}_da=_df.node.nextSibling;_e0=_df.scripts;_e1=false;_df=_df.parent;continue;}if(_da.nodeType!=1){_da=_da.nextSibling;continue;}if(_e0&&_da.nodeName.toLowerCase()=="script"){_e7=_da.getAttribute("type");if(_e7&&/^dojo\/\w/i.test(_e7)){_e0.push(_da);}_da=_da.nextSibling;continue;}if(_e1){_da=_da.nextSibling;continue;}var _e7=_da.getAttribute(_d8)||_da.getAttribute(_d6);var _e8=_da.firstChild;if(!_e7&&(!_e8||(_e8.nodeType==3&&!_e8.nextSibling))){_da=_da.nextSibling;continue;}var _e9={node:_da,scripts:_e0,parent:_df};var _ea;try{_ea=_e7&&_92(_e7);}catch(e){}var _eb=_ea&&!_ea.prototype._noScript?[]:null;if(_e7){_d5.push({"type":_e7,node:_da,scripts:_eb,inherited:_e2(_e9)});}_da=_e8;_e0=_eb;_e1=_ea&&_ea.prototype.stopParser&&!(_d4.template);_df=_e9;}return _d5;};this.parse=function(_ec,_ed){var _ee;if(!_ed&&_ec&&_ec.rootNode){_ed=_ec;_ee=_ed.rootNode;}else{if(_ec&&_81.isObject(_ec)&&!("nodeType" in _ec)){_ed=_ec;}else{_ee=_ec;}}_ee=_ee?_84.byId(_ee):_85.body();_ed=_ed||{};var _ef=this.scan(_ee,_ed);var _f0=_ed.template?{template:true}:{};return this._instantiate(_ef,_f0,_ed);};}();if(_83.parseOnLoad){_8b(100,_80.parser,"parse");}return _80.parser;});},"*noref":1}});define("dojo/_dom",[],1);require(["dojo/window","dojo/uacss","dojo/html","dojo/parser","dojo/touch"]);
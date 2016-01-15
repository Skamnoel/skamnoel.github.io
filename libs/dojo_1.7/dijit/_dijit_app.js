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
require({cache:{"dojo/uacss":function(){define("dojo/uacss",["./dom-geometry","./_base/lang","./ready","./_base/sniff","./_base/window"],function(_1,_2,_3,_4,_5){var _6=_5.doc.documentElement,ie=_4("ie"),_7=_4("opera"),_8=Math.floor,ff=_4("ff"),_9=_1.boxModel.replace(/-/,""),_a={"dj_quirks":_4("quirks"),"dj_opera":_7,"dj_khtml":_4("khtml"),"dj_webkit":_4("webkit"),"dj_safari":_4("safari"),"dj_chrome":_4("chrome"),"dj_gecko":_4("mozilla")};if(ie){_a["dj_ie"]=true;_a["dj_ie"+_8(ie)]=true;_a["dj_iequirks"]=_4("quirks");}if(ff){_a["dj_ff"+_8(ff)]=true;}_a["dj_"+_9]=true;var _b="";for(var _c in _a){if(_a[_c]){_b+=_c+" ";}}_6.className=_2.trim(_6.className+" "+_b);_3(90,function(){if(!_1.isBodyLtr()){var _d="dj_rtl dijitRtl "+_b.replace(/ /g,"-rtl ");_6.className=_2.trim(_6.className+" "+_d+"dj_rtl dijitRtl "+_b.replace(/ /g,"-rtl "));}});return _4;});},"dijit/Toolbar":function(){define("dijit/Toolbar",["require","dojo/_base/declare","dojo/_base/kernel","dojo/keys","dojo/ready","./_Widget","./_KeyNavContainer","./_TemplatedMixin"],function(_e,_f,_10,_11,_12,_13,_14,_15){if(!_10.isAsync){_12(0,function(){var _16=["dijit/ToolbarSeparator"];_e(_16);});}return _f("dijit.Toolbar",[_13,_15,_14],{templateString:"<div class=\"dijit\" role=\"toolbar\" tabIndex=\"${tabIndex}\" data-dojo-attach-point=\"containerNode\">"+"</div>",baseClass:"dijitToolbar",postCreate:function(){this.inherited(arguments);this.connectKeyNavHandlers(this.isLeftToRight()?[_11.LEFT_ARROW]:[_11.RIGHT_ARROW],this.isLeftToRight()?[_11.RIGHT_ARROW]:[_11.LEFT_ARROW]);}});});},"dijit/ProgressBar":function(){require({cache:{"url:dijit/templates/ProgressBar.html":"<div class=\"dijitProgressBar dijitProgressBarEmpty\" role=\"progressbar\"\n\t><div  data-dojo-attach-point=\"internalProgress\" class=\"dijitProgressBarFull\"\n\t\t><div class=\"dijitProgressBarTile\" role=\"presentation\"></div\n\t\t><span style=\"visibility:hidden\">&#160;</span\n\t></div\n\t><div data-dojo-attach-point=\"labelNode\" class=\"dijitProgressBarLabel\" id=\"${id}_label\"></div\n\t><img data-dojo-attach-point=\"indeterminateHighContrastImage\" class=\"dijitProgressBarIndeterminateHighContrastImage\" alt=\"\"\n/></div>\n"}});define("dijit/ProgressBar",["require","dojo/_base/declare","dojo/dom-class","dojo/_base/lang","dojo/number","./_Widget","./_TemplatedMixin","dojo/text!./templates/ProgressBar.html"],function(_17,_18,_19,_1a,_1b,_1c,_1d,_1e){return _18("dijit.ProgressBar",[_1c,_1d],{progress:"0",value:"",maximum:100,places:0,indeterminate:false,label:"",name:"",templateString:_1e,_indeterminateHighContrastImagePath:_17.toUrl("./themes/a11y/indeterminate_progress.gif"),postMixInProperties:function(){this.inherited(arguments);if(!("value" in this.params)){this.value=this.indeterminate?Infinity:this.progress;}},buildRendering:function(){this.inherited(arguments);this.indeterminateHighContrastImage.setAttribute("src",this._indeterminateHighContrastImagePath.toString());this.update();},update:function(_1f){_1a.mixin(this,_1f||{});var tip=this.internalProgress,ap=this.domNode;var _20=1;if(this.indeterminate){ap.removeAttribute("aria-valuenow");}else{if(String(this.progress).indexOf("%")!=-1){_20=Math.min(parseFloat(this.progress)/100,1);this.progress=_20*this.maximum;}else{this.progress=Math.min(this.progress,this.maximum);_20=this.maximum?this.progress/this.maximum:0;}ap.setAttribute("aria-valuenow",this.progress);}ap.setAttribute("aria-describedby",this.labelNode.id);ap.setAttribute("aria-valuemin",0);ap.setAttribute("aria-valuemax",this.maximum);this.labelNode.innerHTML=this.report(_20);_19.toggle(this.domNode,"dijitProgressBarIndeterminate",this.indeterminate);tip.style.width=(_20*100)+"%";this.onChange();},_setValueAttr:function(v){this._set("value",v);if(v==Infinity){this.update({indeterminate:true});}else{this.update({indeterminate:false,progress:v});}},_setLabelAttr:function(_21){this._set("label",_21);this.update();},_setIndeterminateAttr:function(_22){this.indeterminate=_22;this.update();},report:function(_23){return this.label?this.label:(this.indeterminate?"&#160;":_1b.format(_23,{type:"percent",places:this.places,locale:this.lang}));},onChange:function(){}});});},"url:dijit/templates/ProgressBar.html":"<div class=\"dijitProgressBar dijitProgressBarEmpty\" role=\"progressbar\"\n\t><div  data-dojo-attach-point=\"internalProgress\" class=\"dijitProgressBarFull\"\n\t\t><div class=\"dijitProgressBarTile\" role=\"presentation\"></div\n\t\t><span style=\"visibility:hidden\">&#160;</span\n\t></div\n\t><div data-dojo-attach-point=\"labelNode\" class=\"dijitProgressBarLabel\" id=\"${id}_label\"></div\n\t><img data-dojo-attach-point=\"indeterminateHighContrastImage\" class=\"dijitProgressBarIndeterminateHighContrastImage\" alt=\"\"\n/></div>\n","dojo/touch":function(){define("dojo/touch",["./_base/kernel","./aspect","./dom","./on","./has","./mouse","./domReady","./_base/window"],function(_24,_25,dom,on,has,_26,_27,win){var _28=has("touch");var _29=false;if(has("ios")){var ua=navigator.userAgent;var v=ua.match(/OS ([\d_]+)/)?RegExp.$1:"1";var os=parseFloat(v.replace(/_/,".").replace(/_/g,""));_29=os<5;}var _2a;function _2b(_2c,_2d){if(_28){return function(_2e,_2f){var _30=on(_2e,_2d,_2f),_31=on(_2e,_2c,function(evt){if(!_2a||(new Date()).getTime()>_2a+1000){_2f.call(this,evt);}});return {remove:function(){_30.remove();_31.remove();}};};}else{return function(_32,_33){return on(_32,_2c,_33);};}};var _34,_35;if(_28){_27(function(){_35=win.body();win.doc.addEventListener("touchstart",function(evt){_2a=(new Date()).getTime();var _36=_35;_35=evt.target;on.emit(_36,"dojotouchout",{target:_36,relatedTarget:_35,bubbles:true});on.emit(_35,"dojotouchover",{target:_35,relatedTarget:_36,bubbles:true});},true);on(win.doc,"touchmove",function(evt){_2a=(new Date()).getTime();var _37=win.doc.elementFromPoint(evt.pageX-(_29?0:win.global.pageXOffset),evt.pageY-(_29?0:win.global.pageYOffset));if(_37&&_35!==_37){on.emit(_35,"dojotouchout",{target:_35,relatedTarget:_37,bubbles:true});on.emit(_37,"dojotouchover",{target:_37,relatedTarget:_35,bubbles:true});_35=_37;}});});_34=function(_38,_39){return on(win.doc,"touchmove",function(evt){if(_38===win.doc||dom.isDescendant(_35,_38)){evt.target=_35;_39.call(this,evt);}});};}var _3a={press:_2b("mousedown","touchstart"),move:_2b("mousemove",_34),release:_2b("mouseup","touchend"),cancel:_2b(_26.leave,"touchcancel"),over:_2b("mouseover","dojotouchover"),out:_2b("mouseout","dojotouchout"),enter:_26._eventHandler(_2b("mouseover","dojotouchover")),leave:_26._eventHandler(_2b("mouseout","dojotouchout"))};1&&(_24.touch=_3a);return _3a;});},"dijit/ToolbarSeparator":function(){define("dijit/ToolbarSeparator",["dojo/_base/declare","dojo/dom","./_Widget","./_TemplatedMixin"],function(_3b,dom,_3c,_3d){return _3b("dijit.ToolbarSeparator",[_3c,_3d],{templateString:"<div class=\"dijitToolbarSeparator dijitInline\" role=\"presentation\"></div>",buildRendering:function(){this.inherited(arguments);dom.setSelectable(this.domNode,false);},isFocusable:function(){return false;}});});},"dijit/_KeyNavContainer":function(){define("dijit/_KeyNavContainer",["dojo/_base/kernel","./_Container","./_FocusMixin","dojo/_base/array","dojo/keys","dojo/_base/declare","dojo/_base/event","dojo/dom-attr","dojo/_base/lang"],function(_3e,_3f,_40,_41,_42,_43,_44,_45,_46){return _43("dijit._KeyNavContainer",[_40,_3f],{tabIndex:"0",connectKeyNavHandlers:function(_47,_48){var _49=(this._keyNavCodes={});var _4a=_46.hitch(this,"focusPrev");var _4b=_46.hitch(this,"focusNext");_41.forEach(_47,function(_4c){_49[_4c]=_4a;});_41.forEach(_48,function(_4d){_49[_4d]=_4b;});_49[_42.HOME]=_46.hitch(this,"focusFirstChild");_49[_42.END]=_46.hitch(this,"focusLastChild");this.connect(this.domNode,"onkeypress","_onContainerKeypress");this.connect(this.domNode,"onfocus","_onContainerFocus");},startupKeyNavChildren:function(){_3e.deprecated("startupKeyNavChildren() call no longer needed","","2.0");},startup:function(){this.inherited(arguments);_41.forEach(this.getChildren(),_46.hitch(this,"_startupChild"));},addChild:function(_4e,_4f){this.inherited(arguments);this._startupChild(_4e);},focus:function(){this.focusFirstChild();},focusFirstChild:function(){this.focusChild(this._getFirstFocusableChild());},focusLastChild:function(){this.focusChild(this._getLastFocusableChild());},focusNext:function(){this.focusChild(this._getNextFocusableChild(this.focusedChild,1));},focusPrev:function(){this.focusChild(this._getNextFocusableChild(this.focusedChild,-1),true);},focusChild:function(_50,_51){if(!_50){return;}if(this.focusedChild&&_50!==this.focusedChild){this._onChildBlur(this.focusedChild);}_50.set("tabIndex",this.tabIndex);_50.focus(_51?"end":"start");this._set("focusedChild",_50);},_startupChild:function(_52){_52.set("tabIndex","-1");this.connect(_52,"_onFocus",function(){_52.set("tabIndex",this.tabIndex);});this.connect(_52,"_onBlur",function(){_52.set("tabIndex","-1");});},_onContainerFocus:function(evt){if(evt.target!==this.domNode||this.focusedChild){return;}this.focusFirstChild();_45.set(this.domNode,"tabIndex","-1");},_onBlur:function(evt){if(this.tabIndex){_45.set(this.domNode,"tabIndex",this.tabIndex);}this.focusedChild=null;this.inherited(arguments);},_onContainerKeypress:function(evt){if(evt.ctrlKey||evt.altKey){return;}var _53=this._keyNavCodes[evt.charOrCode];if(_53){_53();_44.stop(evt);}},_onChildBlur:function(){},_getFirstFocusableChild:function(){return this._getNextFocusableChild(null,1);},_getLastFocusableChild:function(){return this._getNextFocusableChild(null,-1);},_getNextFocusableChild:function(_54,dir){if(_54){_54=this._getSiblingOfChild(_54,dir);}var _55=this.getChildren();for(var i=0;i<_55.length;i++){if(!_54){_54=_55[(dir>0)?0:(_55.length-1)];}if(_54.isFocusable()){return _54;}_54=this._getSiblingOfChild(_54,dir);}return null;}});});},"url:dijit/templates/Tooltip.html":"<div class=\"dijitTooltip dijitTooltipLeft\" id=\"dojoTooltip\"\n\t><div class=\"dijitTooltipContainer dijitTooltipContents\" data-dojo-attach-point=\"containerNode\" role='alert'></div\n\t><div class=\"dijitTooltipConnector\" data-dojo-attach-point=\"connectorNode\"></div\n></div>\n","url:dijit/templates/ColorPalette.html":"<div class=\"dijitInline dijitColorPalette\">\n\t<table dojoAttachPoint=\"paletteTableNode\" class=\"dijitPaletteTable\" cellSpacing=\"0\" cellPadding=\"0\" role=\"grid\">\n\t\t<tbody data-dojo-attach-point=\"gridNode\"></tbody>\n\t</table>\n</div>\n","dijit/_PaletteMixin":function(){define("dijit/_PaletteMixin",["dojo/_base/declare","dojo/dom-attr","dojo/dom-class","dojo/dom-construct","dojo/_base/event","dojo/keys","dojo/_base/lang","./_CssStateMixin","./focus","./typematic"],function(_56,_57,_58,_59,_5a,_5b,_5c,_5d,_5e,_5f){return _56("dijit._PaletteMixin",[_5d],{defaultTimeout:500,timeoutChangeRate:0.9,value:"",_selectedCell:-1,tabIndex:"0",cellClass:"dijitPaletteCell",dyeClass:"",summary:"",_setSummaryAttr:"paletteTableNode",_dyeFactory:function(_60){var _61=_5c.getObject(this.dyeClass);return new _61(_60);},_preparePalette:function(_62,_63){this._cells=[];var url=this._blankGif;this.connect(this.gridNode,"ondijitclick","_onCellClick");for(var row=0;row<_62.length;row++){var _64=_59.create("tr",{tabIndex:"-1"},this.gridNode);for(var col=0;col<_62[row].length;col++){var _65=_62[row][col];if(_65){var _66=this._dyeFactory(_65,row,col);var _67=_59.create("td",{"class":this.cellClass,tabIndex:"-1",title:_63[_65],role:"gridcell"});_66.fillCell(_67,url);_59.place(_67,_64);_67.index=this._cells.length;this._cells.push({node:_67,dye:_66});}}}this._xDim=_62[0].length;this._yDim=_62.length;var _68={UP_ARROW:-this._xDim,DOWN_ARROW:this._xDim,RIGHT_ARROW:this.isLeftToRight()?1:-1,LEFT_ARROW:this.isLeftToRight()?-1:1};for(var key in _68){this._connects.push(_5f.addKeyListener(this.domNode,{charOrCode:_5b[key],ctrlKey:false,altKey:false,shiftKey:false},this,function(){var _69=_68[key];return function(_6a){this._navigateByKey(_69,_6a);};}(),this.timeoutChangeRate,this.defaultTimeout));}},postCreate:function(){this.inherited(arguments);this._setCurrent(this._cells[0].node);},focus:function(){_5e.focus(this._currentFocus);},_onCellClick:function(evt){var _6b=evt.target;while(_6b.tagName!="TD"){if(!_6b.parentNode||_6b==this.gridNode){return;}_6b=_6b.parentNode;}var _6c=this._getDye(_6b).getValue();this._setCurrent(_6b);_5e.focus(_6b);this._setValueAttr(_6c,true);_5a.stop(evt);},_setCurrent:function(_6d){if("_currentFocus" in this){_57.set(this._currentFocus,"tabIndex","-1");}this._currentFocus=_6d;if(_6d){_57.set(_6d,"tabIndex",this.tabIndex);}},_setValueAttr:function(_6e,_6f){if(this._selectedCell>=0){_58.remove(this._cells[this._selectedCell].node,this.cellClass+"Selected");}this._selectedCell=-1;if(_6e){for(var i=0;i<this._cells.length;i++){if(_6e==this._cells[i].dye.getValue()){this._selectedCell=i;_58.add(this._cells[i].node,this.cellClass+"Selected");break;}}}this._set("value",this._selectedCell>=0?_6e:null);if(_6f||_6f===undefined){this.onChange(_6e);}},onChange:function(){},_navigateByKey:function(_70,_71){if(_71==-1){return;}var _72=this._currentFocus.index+_70;if(_72<this._cells.length&&_72>-1){var _73=this._cells[_72].node;this._setCurrent(_73);setTimeout(_5c.hitch(dijit,"focus",_73),0);}},_getDye:function(_74){return this._cells[_74.index].dye;}});});},"dojo/window":function(){define("dojo/window",["./_base/lang","./_base/sniff","./_base/window","./dom","./dom-geometry","./dom-style","./dom-construct"],function(_75,has,_76,dom,_77,_78,_79){has.add("rtl-adjust-position-for-verticalScrollBar",function(win,doc){var _7a=_76.body(doc),_7b=_79.create("div",{style:{overflow:"scroll",overflowX:"visible",direction:"rtl",visibility:"hidden",position:"absolute",left:"0",top:"0",width:"64px",height:"64px"}},_7a,"last"),div=_79.create("div",{style:{overflow:"hidden",direction:"ltr"}},_7b,"last"),ret=_77.position(div).x!=0;_7b.removeChild(div);_7a.removeChild(_7b);return ret;});has.add("position-fixed-support",function(win,doc){var _7c=_76.body(doc),_7d=_79.create("span",{style:{visibility:"hidden",position:"fixed",left:"1px",top:"1px"}},_7c,"last"),_7e=_79.create("span",{style:{position:"fixed",left:"0",top:"0"}},_7d,"last"),ret=_77.position(_7e).x!=_77.position(_7d).x;_7d.removeChild(_7e);_7c.removeChild(_7d);return ret;});var _7f=_75.getObject("dojo.window",true);_7f.getBox=function(){var _80=(_76.doc.compatMode=="BackCompat")?_76.body():_76.doc.documentElement,_81=_77.docScroll(),w,h;if(has("touch")){var _82=_76.doc.parentWindow||_76.doc.defaultView;w=_82.innerWidth||_80.clientWidth;h=_82.innerHeight||_80.clientHeight;}else{w=_80.clientWidth;h=_80.clientHeight;}return {l:_81.x,t:_81.y,w:w,h:h};};_7f.get=function(doc){if(has("ie")<9&&_7f!==document.parentWindow){doc.parentWindow.execScript("document._parentWindow = window;","Javascript");var win=doc._parentWindow;doc._parentWindow=null;return win;}return doc.parentWindow||doc.defaultView;};_7f.scrollIntoView=function(_83,pos){try{_83=dom.byId(_83);var doc=_83.ownerDocument||_76.doc,_84=_76.body(doc),_85=doc.documentElement||_84.parentNode,_86=has("ie"),_87=has("webkit");if(_83==_84||_83==_85){return;}if(!(has("mozilla")||_86||_87||has("opera")||has("trident"))&&("scrollIntoView" in _83)){_83.scrollIntoView(false);return;}var _88=doc.compatMode=="BackCompat",_89=Math.min(_84.clientWidth||_85.clientWidth,_85.clientWidth||_84.clientWidth),_8a=Math.min(_84.clientHeight||_85.clientHeight,_85.clientHeight||_84.clientHeight),_8b=(_87||_88)?_84:_85,_8c=pos||_77.position(_83),el=_83.parentNode,_8d=function(el){return (_86<=6||(_86==7&&_88))?false:(has("position-fixed-support")&&(_78.get(el,"position").toLowerCase()=="fixed"));},_8e=this,_8f=function(el,x,y){if(el.tagName=="BODY"||el.tagName=="HTML"){_8e.get(el.ownerDocument).scrollBy(x,y);}else{x&&(el.scrollLeft+=x);y&&(el.scrollTop+=y);}};if(_8d(_83)){return;}while(el){if(el==_84){el=_8b;}var _90=_77.position(el),_91=_8d(el),rtl=_78.getComputedStyle(el).direction.toLowerCase()=="rtl";if(el==_8b){_90.w=_89;_90.h=_8a;if(_8b==_85&&(_86||has("trident"))&&rtl){_90.x+=_8b.offsetWidth-_90.w;}if(_90.x<0||!_86||_86>=9||has("trident")){_90.x=0;}if(_90.y<0||!_86||_86>=9||has("trident")){_90.y=0;}}else{var pb=_77.getPadBorderExtents(el);_90.w-=pb.w;_90.h-=pb.h;_90.x+=pb.l;_90.y+=pb.t;var _92=el.clientWidth,_93=_90.w-_92;if(_92>0&&_93>0){if(rtl&&has("rtl-adjust-position-for-verticalScrollBar")){_90.x+=_93;}_90.w=_92;}_92=el.clientHeight;_93=_90.h-_92;if(_92>0&&_93>0){_90.h=_92;}}if(_91){if(_90.y<0){_90.h+=_90.y;_90.y=0;}if(_90.x<0){_90.w+=_90.x;_90.x=0;}if(_90.y+_90.h>_8a){_90.h=_8a-_90.y;}if(_90.x+_90.w>_89){_90.w=_89-_90.x;}}var l=_8c.x-_90.x,t=_8c.y-_90.y,r=l+_8c.w-_90.w,bot=t+_8c.h-_90.h;var s,old;if(r*l>0&&(!!el.scrollLeft||el==_8b||el.scrollWidth>el.offsetHeight)){s=Math[l<0?"max":"min"](l,r);if(rtl&&((_86==8&&!_88)||_86>=9||has("trident"))){s=-s;}old=el.scrollLeft;_8f(el,s,0);s=el.scrollLeft-old;_8c.x-=s;}if(bot*t>0&&(!!el.scrollTop||el==_8b||el.scrollHeight>el.offsetHeight)){s=Math.ceil(Math[t<0?"max":"min"](t,bot));old=el.scrollTop;_8f(el,0,s);s=el.scrollTop-old;_8c.y-=s;}el=(el!=_8b)&&!_91&&el.parentNode;}}catch(error){console.error("scrollIntoView: "+error);_83.scrollIntoView(false);}};return _7f;});},"dijit/ColorPalette":function(){require({cache:{"url:dijit/templates/ColorPalette.html":"<div class=\"dijitInline dijitColorPalette\">\n\t<table dojoAttachPoint=\"paletteTableNode\" class=\"dijitPaletteTable\" cellSpacing=\"0\" cellPadding=\"0\" role=\"grid\">\n\t\t<tbody data-dojo-attach-point=\"gridNode\"></tbody>\n\t</table>\n</div>\n"}});define("dijit/ColorPalette",["require","dojo/text!./templates/ColorPalette.html","./_Widget","./_TemplatedMixin","./_PaletteMixin","dojo/i18n","dojo/_base/Color","dojo/_base/declare","dojo/dom-class","dojo/dom-construct","dojo/_base/window","dojo/string","dojo/i18n!dojo/nls/colors","dojo/colors"],function(_94,_95,_96,_97,_98,_99,_9a,_9b,_9c,_9d,win,_9e){var _9f=_9b("dijit.ColorPalette",[_96,_97,_98],{palette:"7x10",_palettes:{"7x10":[["white","seashell","cornsilk","lemonchiffon","lightyellow","palegreen","paleturquoise","lightcyan","lavender","plum"],["lightgray","pink","bisque","moccasin","khaki","lightgreen","lightseagreen","lightskyblue","cornflowerblue","violet"],["silver","lightcoral","sandybrown","orange","palegoldenrod","chartreuse","mediumturquoise","skyblue","mediumslateblue","orchid"],["gray","red","orangered","darkorange","yellow","limegreen","darkseagreen","royalblue","slateblue","mediumorchid"],["dimgray","crimson","chocolate","coral","gold","forestgreen","seagreen","blue","blueviolet","darkorchid"],["darkslategray","firebrick","saddlebrown","sienna","olive","green","darkcyan","mediumblue","darkslateblue","darkmagenta"],["black","darkred","maroon","brown","darkolivegreen","darkgreen","midnightblue","navy","indigo","purple"]],"3x4":[["white","lime","green","blue"],["silver","yellow","fuchsia","navy"],["gray","red","purple","black"]]},templateString:_95,baseClass:"dijitColorPalette",_dyeFactory:function(_a0,row,col){return new this._dyeClass(_a0,row,col);},buildRendering:function(){this.inherited(arguments);this._dyeClass=_9b(_9f._Color,{hc:_9c.contains(win.body(),"dijit_a11y"),palette:this.palette});this._preparePalette(this._palettes[this.palette],_99.getLocalization("dojo","colors",this.lang));}});_9f._Color=_9b("dijit._Color",_9a,{template:"<span class='dijitInline dijitPaletteImg'>"+"<img src='${blankGif}' alt='${alt}' class='dijitColorPaletteSwatch' style='background-color: ${color}'/>"+"</span>",hcTemplate:"<span class='dijitInline dijitPaletteImg' style='position: relative; overflow: hidden; height: 12px; width: 14px;'>"+"<img src='${image}' alt='${alt}' style='position: absolute; left: ${left}px; top: ${top}px; ${size}'/>"+"</span>",_imagePaths:{"7x10":_94.toUrl("./themes/a11y/colors7x10.png"),"3x4":_94.toUrl("./themes/a11y/colors3x4.png")},constructor:function(_a1,row,col){this._alias=_a1;this._row=row;this._col=col;this.setColor(_9a.named[_a1]);},getValue:function(){return this.toHex();},fillCell:function(_a2,_a3){var _a4=_9e.substitute(this.hc?this.hcTemplate:this.template,{color:this.toHex(),blankGif:_a3,alt:this._alias,image:this._imagePaths[this.palette].toString(),left:this._col*-20-5,top:this._row*-20-5,size:this.palette=="7x10"?"height: 145px; width: 206px":"height: 64px; width: 86px"});_9d.place(_a4,_a2);}});return _9f;});},"dijit/Tooltip":function(){require({cache:{"url:dijit/templates/Tooltip.html":"<div class=\"dijitTooltip dijitTooltipLeft\" id=\"dojoTooltip\"\n\t><div class=\"dijitTooltipContainer dijitTooltipContents\" data-dojo-attach-point=\"containerNode\" role='alert'></div\n\t><div class=\"dijitTooltipConnector\" data-dojo-attach-point=\"connectorNode\"></div\n></div>\n"}});define("dijit/Tooltip",["dojo/_base/array","dojo/_base/declare","dojo/_base/fx","dojo/dom","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/_base/lang","dojo/_base/sniff","dojo/_base/window","./_base/manager","./place","./_Widget","./_TemplatedMixin","./BackgroundIframe","dojo/text!./templates/Tooltip.html","."],function(_a5,_a6,fx,dom,_a7,_a8,_a9,_aa,has,win,_ab,_ac,_ad,_ae,_af,_b0,_b1){var _b2=_a6("dijit._MasterTooltip",[_ad,_ae],{duration:_ab.defaultDuration,templateString:_b0,postCreate:function(){win.body().appendChild(this.domNode);this.bgIframe=new _af(this.domNode);this.fadeIn=fx.fadeIn({node:this.domNode,duration:this.duration,onEnd:_aa.hitch(this,"_onShow")});this.fadeOut=fx.fadeOut({node:this.domNode,duration:this.duration,onEnd:_aa.hitch(this,"_onHide")});},show:function(_b3,_b4,_b5,rtl,_b6){if(this.aroundNode&&this.aroundNode===_b4&&this.containerNode.innerHTML==_b3){return;}this.domNode.width="auto";if(this.fadeOut.status()=="playing"){this._onDeck=arguments;return;}this.containerNode.innerHTML=_b3;if(_b6){this.set("textDir",_b6);}this.containerNode.align=rtl?"right":"left";var pos=_ac.around(this.domNode,_b4,_b5&&_b5.length?_b5:_b7.defaultPosition,!rtl,_aa.hitch(this,"orient"));var _b8=pos.aroundNodePos;if(pos.corner.charAt(0)=="M"&&pos.aroundCorner.charAt(0)=="M"){this.connectorNode.style.top=_b8.y+((_b8.h-this.connectorNode.offsetHeight)>>1)-pos.y+"px";this.connectorNode.style.left="";}else{if(pos.corner.charAt(1)=="M"&&pos.aroundCorner.charAt(1)=="M"){this.connectorNode.style.left=_b8.x+((_b8.w-this.connectorNode.offsetWidth)>>1)-pos.x+"px";}}_a9.set(this.domNode,"opacity",0);this.fadeIn.play();this.isShowingNow=true;this.aroundNode=_b4;},orient:function(_b9,_ba,_bb,_bc,_bd){this.connectorNode.style.top="";var _be=_bc.h,_bf=_bc.w;if(_ba.charAt(1)!=_bb.charAt(1)){_bf-=this.connectorNode.offsetWidth;}else{_be-=this.connectorNode.offsetHeight;}_b9.className="dijitTooltip "+{"MR-ML":"dijitTooltipRight","ML-MR":"dijitTooltipLeft","TM-BM":"dijitTooltipAbove","BM-TM":"dijitTooltipBelow","BL-TL":"dijitTooltipBelow dijitTooltipABLeft","TL-BL":"dijitTooltipAbove dijitTooltipABLeft","BR-TR":"dijitTooltipBelow dijitTooltipABRight","TR-BR":"dijitTooltipAbove dijitTooltipABRight","BR-BL":"dijitTooltipRight","BL-BR":"dijitTooltipLeft"}[_ba+"-"+_bb];this.domNode.style.width="auto";var _c0=_a8.getContentBox(this.domNode);var _c1=Math.min((Math.max(_bf,1)),_c0.w);var _c2=_c1<_c0.w;this.domNode.style.width=_c1+"px";if(_bb.charAt(0)=="B"&&_ba.charAt(0)=="B"){var bb=_a8.position(_b9);var _c3=this.connectorNode.offsetHeight;if(bb.h>_be){var _c4=_be-((_bd.h+_c3)>>1);this.connectorNode.style.top=_c4+"px";this.connectorNode.style.bottom="";}else{this.connectorNode.style.bottom=Math.min(Math.max(_bd.h/2-_c3/2,0),bb.h-_c3)+"px";this.connectorNode.style.top="";}}else{this.connectorNode.style.top="";this.connectorNode.style.bottom="";}return Math.max(0,_c0.w-_bf);},_onShow:function(){if(has("ie")){this.domNode.style.filter="";}},hide:function(_c5){if(this._onDeck&&this._onDeck[1]==_c5){this._onDeck=null;}else{if(this.aroundNode===_c5){this.fadeIn.stop();this.isShowingNow=false;this.aroundNode=null;this.fadeOut.play();}else{}}},_onHide:function(){this.domNode.style.cssText="";this.containerNode.innerHTML="";if(this._onDeck){this.show.apply(this,this._onDeck);this._onDeck=null;}},_setAutoTextDir:function(_c6){this.applyTextDir(_c6,has("ie")?_c6.outerText:_c6.textContent);_a5.forEach(_c6.children,function(_c7){this._setAutoTextDir(_c7);},this);},_setTextDirAttr:function(_c8){this._set("textDir",_c8);if(_c8=="auto"){this._setAutoTextDir(this.containerNode);}else{this.containerNode.dir=this.textDir;}}});_b1.showTooltip=function(_c9,_ca,_cb,rtl,_cc){if(_cb){_cb=_a5.map(_cb,function(val){return {after:"after-centered",before:"before-centered"}[val]||val;});}if(!_b7._masterTT){_b1._masterTT=_b7._masterTT=new _b2();}return _b7._masterTT.show(_c9,_ca,_cb,rtl,_cc);};_b1.hideTooltip=function(_cd){return _b7._masterTT&&_b7._masterTT.hide(_cd);};var _b7=_a6("dijit.Tooltip",_ad,{label:"",showDelay:400,connectId:[],position:[],_setConnectIdAttr:function(_ce){_a5.forEach(this._connections||[],function(_cf){_a5.forEach(_cf,_aa.hitch(this,"disconnect"));},this);this._connectIds=_a5.filter(_aa.isArrayLike(_ce)?_ce:(_ce?[_ce]:[]),function(id){return dom.byId(id);});this._connections=_a5.map(this._connectIds,function(id){var _d0=dom.byId(id);return [this.connect(_d0,"onmouseenter","_onHover"),this.connect(_d0,"onmouseleave","_onUnHover"),this.connect(_d0,"onfocus","_onHover"),this.connect(_d0,"onblur","_onUnHover")];},this);this._set("connectId",_ce);},addTarget:function(_d1){var id=_d1.id||_d1;if(_a5.indexOf(this._connectIds,id)==-1){this.set("connectId",this._connectIds.concat(id));}},removeTarget:function(_d2){var id=_d2.id||_d2,idx=_a5.indexOf(this._connectIds,id);if(idx>=0){this._connectIds.splice(idx,1);this.set("connectId",this._connectIds);}},buildRendering:function(){this.inherited(arguments);_a7.add(this.domNode,"dijitTooltipData");},startup:function(){this.inherited(arguments);var ids=this.connectId;_a5.forEach(_aa.isArrayLike(ids)?ids:[ids],this.addTarget,this);},_onHover:function(e){if(!this._showTimer){var _d3=e.target;this._showTimer=setTimeout(_aa.hitch(this,function(){this.open(_d3);}),this.showDelay);}},_onUnHover:function(){if(this._focus){return;}if(this._showTimer){clearTimeout(this._showTimer);delete this._showTimer;}this.close();},open:function(_d4){if(this._showTimer){clearTimeout(this._showTimer);delete this._showTimer;}_b7.show(this.label||this.domNode.innerHTML,_d4,this.position,!this.isLeftToRight(),this.textDir);this._connectNode=_d4;this.onShow(_d4,this.position);},close:function(){if(this._connectNode){_b7.hide(this._connectNode);delete this._connectNode;this.onHide();}if(this._showTimer){clearTimeout(this._showTimer);delete this._showTimer;}},onShow:function(){},onHide:function(){},uninitialize:function(){this.close();this.inherited(arguments);}});_b7._MasterTooltip=_b2;_b7.show=_b1.showTooltip;_b7.hide=_b1.hideTooltip;_b7.defaultPosition=["after-centered","before-centered"];return _b7;});},"*now":function(r){r(["dojo/i18n!*preload*dijit/nls/_dijit_app*[\"ar\",\"ca\",\"cs\",\"da\",\"de\",\"el\",\"en\",\"es\",\"fi\",\"fr\",\"he\",\"hr\",\"hu\",\"it\",\"ja\",\"kk\",\"ko\",\"nl\",\"no\",\"pl\",\"pt\",\"pt-br\",\"ro\",\"ru\",\"sk\",\"sl\",\"sv\",\"th\",\"tr\",\"uk\",\"zh\",\"zh-tw\",\"ROOT\"]"]);},"*noref":1}});define("dijit/_dijit_app",[],1);require(["dijit/ColorPalette","dijit/ProgressBar","dijit/Toolbar","dijit/ToolbarSeparator","dijit/Tooltip"]);
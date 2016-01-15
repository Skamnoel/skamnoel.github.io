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
require({cache:{"dojo/touch":function(){define("dojo/touch",["./_base/kernel","./aspect","./dom","./on","./has","./mouse","./domReady","./_base/window"],function(_1,_2,_3,on,_4,_5,_6,_7){var _8=_4("touch");var _9=false;if(_4("ios")){var ua=navigator.userAgent;var v=ua.match(/OS ([\d_]+)/)?RegExp.$1:"1";var os=parseFloat(v.replace(/_/,".").replace(/_/g,""));_9=os<5;}var _a;function _b(_c,_d){if(_8){return function(_e,_f){var _10=on(_e,_d,_f),_11=on(_e,_c,function(evt){if(!_a||(new Date()).getTime()>_a+1000){_f.call(this,evt);}});return {remove:function(){_10.remove();_11.remove();}};};}else{return function(_12,_13){return on(_12,_c,_13);};}};var _14,_15;if(_8){_6(function(){_15=_7.body();_7.doc.addEventListener("touchstart",function(evt){_a=(new Date()).getTime();var _16=_15;_15=evt.target;on.emit(_16,"dojotouchout",{target:_16,relatedTarget:_15,bubbles:true});on.emit(_15,"dojotouchover",{target:_15,relatedTarget:_16,bubbles:true});},true);on(_7.doc,"touchmove",function(evt){_a=(new Date()).getTime();var _17=_7.doc.elementFromPoint(evt.pageX-(_9?0:_7.global.pageXOffset),evt.pageY-(_9?0:_7.global.pageYOffset));if(_17&&_15!==_17){on.emit(_15,"dojotouchout",{target:_15,relatedTarget:_17,bubbles:true});on.emit(_17,"dojotouchover",{target:_17,relatedTarget:_15,bubbles:true});_15=_17;}});});_14=function(_18,_19){return on(_7.doc,"touchmove",function(evt){if(_18===_7.doc||_3.isDescendant(_15,_18)){evt.target=_15;_19.call(this,evt);}});};}var _1a={press:_b("mousedown","touchstart"),move:_b("mousemove",_14),release:_b("mouseup","touchend"),cancel:_b(_5.leave,"touchcancel"),over:_b("mouseover","dojotouchover"),out:_b("mouseout","dojotouchout"),enter:_5._eventHandler(_b("mouseover","dojotouchover")),leave:_5._eventHandler(_b("mouseout","dojotouchout"))};1&&(_1.touch=_1a);return _1a;});},"dojo/dnd/TimedMoveable":function(){define("dojo/dnd/TimedMoveable",["../main","./Moveable"],function(_1b){var _1c=_1b.dnd.Moveable.prototype.onMove;_1b.declare("dojo.dnd.TimedMoveable",_1b.dnd.Moveable,{timeout:40,constructor:function(_1d,_1e){if(!_1e){_1e={};}if(_1e.timeout&&typeof _1e.timeout=="number"&&_1e.timeout>=0){this.timeout=_1e.timeout;}},onMoveStop:function(_1f){if(_1f._timer){clearTimeout(_1f._timer);_1c.call(this,_1f,_1f._leftTop);}_1b.dnd.Moveable.prototype.onMoveStop.apply(this,arguments);},onMove:function(_20,_21){_20._leftTop=_21;if(!_20._timer){var _22=this;_20._timer=setTimeout(function(){_20._timer=null;_1c.call(_22,_20,_20._leftTop);},this.timeout);}}});return _1b.dnd.TimedMoveable;});},"dojo/dnd/Moveable":function(){define("dojo/dnd/Moveable",["../main","../Evented","../touch","./Mover"],function(_23,_24,_25){_23.declare("dojo.dnd.Moveable",[_24],{handle:"",delay:0,skip:false,constructor:function(_26,_27){this.node=_23.byId(_26);if(!_27){_27={};}this.handle=_27.handle?_23.byId(_27.handle):null;if(!this.handle){this.handle=this.node;}this.delay=_27.delay>0?_27.delay:0;this.skip=_27.skip;this.mover=_27.mover?_27.mover:_23.dnd.Mover;this.events=[_23.connect(this.handle,_25.press,this,"onMouseDown"),_23.connect(this.handle,"ondragstart",this,"onSelectStart"),_23.connect(this.handle,"onselectstart",this,"onSelectStart")];},markupFactory:function(_28,_29,_2a){return new _2a(_29,_28);},destroy:function(){_23.forEach(this.events,_23.disconnect);this.events=this.node=this.handle=null;},onMouseDown:function(e){if(this.skip&&_23.dnd.isFormElement(e)){return;}if(this.delay){this.events.push(_23.connect(this.handle,_25.move,this,"onMouseMove"),_23.connect(this.handle,_25.release,this,"onMouseUp"));this._lastX=e.pageX;this._lastY=e.pageY;}else{this.onDragDetected(e);}_23.stopEvent(e);},onMouseMove:function(e){if(Math.abs(e.pageX-this._lastX)>this.delay||Math.abs(e.pageY-this._lastY)>this.delay){this.onMouseUp(e);this.onDragDetected(e);}_23.stopEvent(e);},onMouseUp:function(e){for(var i=0;i<2;++i){_23.disconnect(this.events.pop());}_23.stopEvent(e);},onSelectStart:function(e){if(!this.skip||!_23.dnd.isFormElement(e)){_23.stopEvent(e);}},onDragDetected:function(e){new this.mover(this.node,e,this);},onMoveStart:function(_2b){_23.publish("/dnd/move/start",[_2b]);_23.addClass(_23.body(),"dojoMove");_23.addClass(this.node,"dojoMoveItem");},onMoveStop:function(_2c){_23.publish("/dnd/move/stop",[_2c]);_23.removeClass(_23.body(),"dojoMove");_23.removeClass(this.node,"dojoMoveItem");},onFirstMove:function(_2d,e){},onMove:function(_2e,_2f,e){this.onMoving(_2e,_2f);var s=_2e.node.style;s.left=_2f.l+"px";s.top=_2f.t+"px";this.onMoved(_2e,_2f);},onMoving:function(_30,_31){},onMoved:function(_32,_33){}});return _23.dnd.Moveable;});},"dojo/window":function(){define("dojo/window",["./_base/lang","./_base/sniff","./_base/window","./dom","./dom-geometry","./dom-style","./dom-construct"],function(_34,has,_35,dom,_36,_37,_38){has.add("rtl-adjust-position-for-verticalScrollBar",function(win,doc){var _39=_35.body(doc),_3a=_38.create("div",{style:{overflow:"scroll",overflowX:"visible",direction:"rtl",visibility:"hidden",position:"absolute",left:"0",top:"0",width:"64px",height:"64px"}},_39,"last"),div=_38.create("div",{style:{overflow:"hidden",direction:"ltr"}},_3a,"last"),ret=_36.position(div).x!=0;_3a.removeChild(div);_39.removeChild(_3a);return ret;});has.add("position-fixed-support",function(win,doc){var _3b=_35.body(doc),_3c=_38.create("span",{style:{visibility:"hidden",position:"fixed",left:"1px",top:"1px"}},_3b,"last"),_3d=_38.create("span",{style:{position:"fixed",left:"0",top:"0"}},_3c,"last"),ret=_36.position(_3d).x!=_36.position(_3c).x;_3c.removeChild(_3d);_3b.removeChild(_3c);return ret;});var _3e=_34.getObject("dojo.window",true);_3e.getBox=function(){var _3f=(_35.doc.compatMode=="BackCompat")?_35.body():_35.doc.documentElement,_40=_36.docScroll(),w,h;if(has("touch")){var _41=_35.doc.parentWindow||_35.doc.defaultView;w=_41.innerWidth||_3f.clientWidth;h=_41.innerHeight||_3f.clientHeight;}else{w=_3f.clientWidth;h=_3f.clientHeight;}return {l:_40.x,t:_40.y,w:w,h:h};};_3e.get=function(doc){if(has("ie")<9&&_3e!==document.parentWindow){doc.parentWindow.execScript("document._parentWindow = window;","Javascript");var win=doc._parentWindow;doc._parentWindow=null;return win;}return doc.parentWindow||doc.defaultView;};_3e.scrollIntoView=function(_42,pos){try{_42=dom.byId(_42);var doc=_42.ownerDocument||_35.doc,_43=_35.body(doc),_44=doc.documentElement||_43.parentNode,_45=has("ie"),_46=has("webkit");if(_42==_43||_42==_44){return;}if(!(has("mozilla")||_45||_46||has("opera")||has("trident"))&&("scrollIntoView" in _42)){_42.scrollIntoView(false);return;}var _47=doc.compatMode=="BackCompat",_48=Math.min(_43.clientWidth||_44.clientWidth,_44.clientWidth||_43.clientWidth),_49=Math.min(_43.clientHeight||_44.clientHeight,_44.clientHeight||_43.clientHeight),_4a=(_46||_47)?_43:_44,_4b=pos||_36.position(_42),el=_42.parentNode,_4c=function(el){return (_45<=6||(_45==7&&_47))?false:(has("position-fixed-support")&&(_37.get(el,"position").toLowerCase()=="fixed"));},_4d=this,_4e=function(el,x,y){if(el.tagName=="BODY"||el.tagName=="HTML"){_4d.get(el.ownerDocument).scrollBy(x,y);}else{x&&(el.scrollLeft+=x);y&&(el.scrollTop+=y);}};if(_4c(_42)){return;}while(el){if(el==_43){el=_4a;}var _4f=_36.position(el),_50=_4c(el),rtl=_37.getComputedStyle(el).direction.toLowerCase()=="rtl";if(el==_4a){_4f.w=_48;_4f.h=_49;if(_4a==_44&&(_45||has("trident"))&&rtl){_4f.x+=_4a.offsetWidth-_4f.w;}if(_4f.x<0||!_45||_45>=9||has("trident")){_4f.x=0;}if(_4f.y<0||!_45||_45>=9||has("trident")){_4f.y=0;}}else{var pb=_36.getPadBorderExtents(el);_4f.w-=pb.w;_4f.h-=pb.h;_4f.x+=pb.l;_4f.y+=pb.t;var _51=el.clientWidth,_52=_4f.w-_51;if(_51>0&&_52>0){if(rtl&&has("rtl-adjust-position-for-verticalScrollBar")){_4f.x+=_52;}_4f.w=_51;}_51=el.clientHeight;_52=_4f.h-_51;if(_51>0&&_52>0){_4f.h=_51;}}if(_50){if(_4f.y<0){_4f.h+=_4f.y;_4f.y=0;}if(_4f.x<0){_4f.w+=_4f.x;_4f.x=0;}if(_4f.y+_4f.h>_49){_4f.h=_49-_4f.y;}if(_4f.x+_4f.w>_48){_4f.w=_48-_4f.x;}}var l=_4b.x-_4f.x,t=_4b.y-_4f.y,r=l+_4b.w-_4f.w,bot=t+_4b.h-_4f.h;var s,old;if(r*l>0&&(!!el.scrollLeft||el==_4a||el.scrollWidth>el.offsetHeight)){s=Math[l<0?"max":"min"](l,r);if(rtl&&((_45==8&&!_47)||_45>=9||has("trident"))){s=-s;}old=el.scrollLeft;_4e(el,s,0);s=el.scrollLeft-old;_4b.x-=s;}if(bot*t>0&&(!!el.scrollTop||el==_4a||el.scrollHeight>el.offsetHeight)){s=Math.ceil(Math[t<0?"max":"min"](t,bot));old=el.scrollTop;_4e(el,0,s);s=el.scrollTop-old;_4b.y-=s;}el=(el!=_4a)&&!_50&&el.parentNode;}}catch(error){console.error("scrollIntoView: "+error);_42.scrollIntoView(false);}};return _3e;});},"dojo/dnd/Mover":function(){define("dojo/dnd/Mover",["../main","../Evented","../touch","./common","./autoscroll"],function(_53,_54,_55){_53.declare("dojo.dnd.Mover",[_54],{constructor:function(_56,e,_57){this.node=_53.byId(_56);this.marginBox={l:e.pageX,t:e.pageY};this.mouseButton=e.button;var h=(this.host=_57),d=_56.ownerDocument;this.events=[_53.connect(d,_55.move,this,"onFirstMove"),_53.connect(d,_55.move,this,"onMouseMove"),_53.connect(d,_55.release,this,"onMouseUp"),_53.connect(d,"ondragstart",_53.stopEvent),_53.connect(d.body,"onselectstart",_53.stopEvent)];if(h&&h.onMoveStart){h.onMoveStart(this);}},onMouseMove:function(e){_53.dnd.autoScroll(e);var m=this.marginBox;this.host.onMove(this,{l:m.l+e.pageX,t:m.t+e.pageY},e);_53.stopEvent(e);},onMouseUp:function(e){if(_53.isWebKit&&_53.isMac&&this.mouseButton==2?e.button==0:this.mouseButton==e.button){this.destroy();}_53.stopEvent(e);},onFirstMove:function(e){var s=this.node.style,l,t,h=this.host;switch(s.position){case "relative":case "absolute":l=Math.round(parseFloat(s.left))||0;t=Math.round(parseFloat(s.top))||0;break;default:s.position="absolute";var m=_53.marginBox(this.node);var b=_53.doc.body;var bs=_53.getComputedStyle(b);var bm=_53._getMarginBox(b,bs);var bc=_53._getContentBox(b,bs);l=m.l-(bc.l-bm.l);t=m.t-(bc.t-bm.t);break;}this.marginBox.l=l-this.marginBox.l;this.marginBox.t=t-this.marginBox.t;if(h&&h.onFirstMove){h.onFirstMove(this,e);}_53.disconnect(this.events.shift());},destroy:function(){_53.forEach(this.events,_53.disconnect);var h=this.host;if(h&&h.onMoveStop){h.onMoveStop(this);}this.events=this.node=this.host=null;}});return _53.dnd.Mover;});},"dojo/dnd/move":function(){define("dojo/dnd/move",["../main","./Mover","./Moveable"],function(_58){_58.declare("dojo.dnd.move.constrainedMoveable",_58.dnd.Moveable,{constraints:function(){},within:false,constructor:function(_59,_5a){if(!_5a){_5a={};}this.constraints=_5a.constraints;this.within=_5a.within;},onFirstMove:function(_5b){var c=this.constraintBox=this.constraints.call(this,_5b);c.r=c.l+c.w;c.b=c.t+c.h;if(this.within){var mb=_58._getMarginSize(_5b.node);c.r-=mb.w;c.b-=mb.h;}},onMove:function(_5c,_5d){var c=this.constraintBox,s=_5c.node.style;this.onMoving(_5c,_5d);_5d.l=_5d.l<c.l?c.l:c.r<_5d.l?c.r:_5d.l;_5d.t=_5d.t<c.t?c.t:c.b<_5d.t?c.b:_5d.t;s.left=_5d.l+"px";s.top=_5d.t+"px";this.onMoved(_5c,_5d);}});_58.declare("dojo.dnd.move.boxConstrainedMoveable",_58.dnd.move.constrainedMoveable,{box:{},constructor:function(_5e,_5f){var box=_5f&&_5f.box;this.constraints=function(){return box;};}});_58.declare("dojo.dnd.move.parentConstrainedMoveable",_58.dnd.move.constrainedMoveable,{area:"content",constructor:function(_60,_61){var _62=_61&&_61.area;this.constraints=function(){var n=this.node.parentNode,s=_58.getComputedStyle(n),mb=_58._getMarginBox(n,s);if(_62=="margin"){return mb;}var t=_58._getMarginExtents(n,s);mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;if(_62=="border"){return mb;}t=_58._getBorderExtents(n,s);mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;if(_62=="padding"){return mb;}t=_58._getPadExtents(n,s);mb.l+=t.l,mb.t+=t.t,mb.w-=t.w,mb.h-=t.h;return mb;};}});_58.dnd.constrainedMover=_58.dnd.move.constrainedMover;_58.dnd.boxConstrainedMover=_58.dnd.move.boxConstrainedMover;_58.dnd.parentConstrainedMover=_58.dnd.move.parentConstrainedMover;return _58.dnd.move;});},"*noref":1}});define("dojo/_dnd_ext",[],1);require(["dojo/dnd/move","dojo/dnd/autoscroll","dojo/dnd/Mover","dojo/dnd/Moveable","dojo/dnd/TimedMoveable"]);
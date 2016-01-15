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
require({cache:{"dojox/gfx3d/_base":function(){define("dojox/gfx3d/_base",["dojo/_base/lang"],function(_1){var _2=_1.getObject("dojox.gfx3d",true);_1.mixin(_2,{defaultEdges:{type:"edges",style:null,points:[]},defaultTriangles:{type:"triangles",style:null,points:[]},defaultQuads:{type:"quads",style:null,points:[]},defaultOrbit:{type:"orbit",center:{x:0,y:0,z:0},radius:50},defaultPath3d:{type:"path3d",path:[]},defaultPolygon:{type:"polygon",path:[]},defaultCube:{type:"cube",bottom:{x:0,y:0,z:0},top:{x:100,y:100,z:100}},defaultCylinder:{type:"cylinder",center:{x:0,y:0,z:0},height:100,radius:50}});return _2;});},"dojox/gfx3d/object":function(){define("dojox/gfx3d/object",["dojo/_base/array","dojo/_base/declare","dojo/_base/lang","dojox/gfx","dojox/gfx/matrix","./_base","./scheduler","./gradient","./vector","./matrix","./lighting"],function(_3,_4,_5,_6,_7,_8,_9,_a,_b,_c,_d){var _e=_9.scheduler;var _f=function(o,x){if(arguments.length>1){o=x;}var e={};for(var i in o){if(i in e){continue;}}};_4("dojox.gfx3d.Object",null,{constructor:function(){this.object=null;this.matrix=null;this.cache=null;this.renderer=null;this.parent=null;this.strokeStyle=null;this.fillStyle=null;this.shape=null;},setObject:function(_10){this.object=_6.makeParameters(this.object,_10);return this;},setTransform:function(_11){this.matrix=_c.clone(_11?_c.normalize(_11):_8.identity,true);return this;},applyRightTransform:function(_12){return _12?this.setTransform([this.matrix,_12]):this;},applyLeftTransform:function(_13){return _13?this.setTransform([_13,this.matrix]):this;},applyTransform:function(_14){return _14?this.setTransform([this.matrix,_14]):this;},setFill:function(_15){this.fillStyle=_15;return this;},setStroke:function(_16){this.strokeStyle=_16;return this;},toStdFill:function(_17,_18){return (this.fillStyle&&typeof this.fillStyle["type"]!="undefined")?_17[this.fillStyle.type](_18,this.fillStyle.finish,this.fillStyle.color):this.fillStyle;},invalidate:function(){this.renderer.addTodo(this);},destroy:function(){if(this.shape){var p=this.shape.getParent();if(p){p.remove(this.shape);}this.shape=null;}},render:function(_19){throw "Pure virtual function, not implemented";},draw:function(_1a){throw "Pure virtual function, not implemented";},getZOrder:function(){return 0;},getOutline:function(){return null;}});_4("dojox.gfx3d.Scene",_8.Object,{constructor:function(){this.objects=[];this.todos=[];this.schedule=_e.zOrder;this._draw=_8.drawer.conservative;},setFill:function(_1b){this.fillStyle=_1b;_3.forEach(this.objects,function(_1c){_1c.setFill(_1b);});return this;},setStroke:function(_1d){this.strokeStyle=_1d;_3.forEach(this.objects,function(_1e){_1e.setStroke(_1d);});return this;},render:function(_1f,_20){var m=_c.multiply(_1f,this.matrix);if(_20){this.todos=this.objects;}_3.forEach(this.todos,function(_21){_21.render(m,_20);});},draw:function(_22){this.objects=this.schedule(this.objects);this._draw(this.todos,this.objects,this.renderer);},addTodo:function(_23){if(_3.every(this.todos,function(_24){return _24!=_23;})){this.todos.push(_23);this.invalidate();}},invalidate:function(){this.parent.addTodo(this);},getZOrder:function(){var _25=0;_3.forEach(this.objects,function(_26){_25+=_26.getZOrder();});return (this.objects.length>1)?_25/this.objects.length:0;}});_4("dojox.gfx3d.Edges",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultEdges);},setObject:function(_27,_28){this.object=_6.makeParameters(this.object,(_27 instanceof Array)?{points:_27,style:_28}:_27);return this;},getZOrder:function(){var _29=0;_3.forEach(this.cache,function(_2a){_29+=_2a.z;});return (this.cache.length>1)?_29/this.cache.length:0;},render:function(_2b){var m=_c.multiply(_2b,this.matrix);this.cache=_3.map(this.object.points,function(_2c){return _c.multiplyPoint(m,_2c);});},draw:function(){var c=this.cache;if(this.shape){this.shape.setShape("");}else{this.shape=this.renderer.createPath();}var p=this.shape.setAbsoluteMode("absolute");if(this.object.style=="strip"||this.object.style=="loop"){p.moveTo(c[0].x,c[0].y);_3.forEach(c.slice(1),function(_2d){p.lineTo(_2d.x,_2d.y);});if(this.object.style=="loop"){p.closePath();}}else{for(var i=0;i<this.cache.length;){p.moveTo(c[i].x,c[i].y);i++;p.lineTo(c[i].x,c[i].y);i++;}}p.setStroke(this.strokeStyle);}});_4("dojox.gfx3d.Orbit",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultOrbit);},render:function(_2e){var m=_c.multiply(_2e,this.matrix);var _2f=[0,Math.PI/4,Math.PI/3];var _30=_c.multiplyPoint(m,this.object.center);var _31=_3.map(_2f,function(_32){return {x:this.center.x+this.radius*Math.cos(_32),y:this.center.y+this.radius*Math.sin(_32),z:this.center.z};},this.object);_31=_3.map(_31,function(_33){return _c.multiplyPoint(m,_33);});var _34=_b.normalize(_31);_31=_3.map(_31,function(_35){return _b.substract(_35,_30);});var A={xx:_31[0].x*_31[0].y,xy:_31[0].y*_31[0].y,xz:1,yx:_31[1].x*_31[1].y,yy:_31[1].y*_31[1].y,yz:1,zx:_31[2].x*_31[2].y,zy:_31[2].y*_31[2].y,zz:1,dx:0,dy:0,dz:0};var B=_3.map(_31,function(_36){return -Math.pow(_36.x,2);});var X=_c.multiplyPoint(_c.invert(A),B[0],B[1],B[2]);var _37=Math.atan2(X.x,1-X.y)/2;var _38=_3.map(_31,function(_39){return _7.multiplyPoint(_7.rotate(-_37),_39.x,_39.y);});var a=Math.pow(_38[0].x,2);var b=Math.pow(_38[0].y,2);var c=Math.pow(_38[1].x,2);var d=Math.pow(_38[1].y,2);var rx=Math.sqrt((a*d-b*c)/(d-b));var ry=Math.sqrt((a*d-b*c)/(a-c));this.cache={cx:_30.x,cy:_30.y,rx:rx,ry:ry,theta:_37,normal:_34};},draw:function(_3a){if(this.shape){this.shape.setShape(this.cache);}else{this.shape=this.renderer.createEllipse(this.cache);}this.shape.applyTransform(_7.rotateAt(this.cache.theta,this.cache.cx,this.cache.cy)).setStroke(this.strokeStyle).setFill(this.toStdFill(_3a,this.cache.normal));}});_4("dojox.gfx3d.Path3d",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultPath3d);this.segments=[];this.absolute=true;this.last={};this.path="";},_collectArgs:function(_3b,_3c){for(var i=0;i<_3c.length;++i){var t=_3c[i];if(typeof (t)=="boolean"){_3b.push(t?1:0);}else{if(typeof (t)=="number"){_3b.push(t);}else{if(t instanceof Array){this._collectArgs(_3b,t);}else{if("x" in t&&"y" in t){_3b.push(t.x);_3b.push(t.y);}}}}}},_validSegments:{m:3,l:3,z:0},_pushSegment:function(_3d,_3e){var _3f=this._validSegments[_3d.toLowerCase()],_40;if(typeof (_3f)=="number"){if(_3f){if(_3e.length>=_3f){_40={action:_3d,args:_3e.slice(0,_3e.length-_3e.length%_3f)};this.segments.push(_40);}}else{_40={action:_3d,args:[]};this.segments.push(_40);}}},moveTo:function(){var _41=[];this._collectArgs(_41,arguments);this._pushSegment(this.absolute?"M":"m",_41);return this;},lineTo:function(){var _42=[];this._collectArgs(_42,arguments);this._pushSegment(this.absolute?"L":"l",_42);return this;},closePath:function(){this._pushSegment("Z",[]);return this;},render:function(_43){var m=_c.multiply(_43,this.matrix);var _44="";var _45=this._validSegments;_3.forEach(this.segments,function(_46){_44+=_46.action;for(var i=0;i<_46.args.length;i+=_45[_46.action.toLowerCase()]){var pt=_c.multiplyPoint(m,_46.args[i],_46.args[i+1],_46.args[i+2]);_44+=" "+pt.x+" "+pt.y;}});this.cache=_44;},_draw:function(){return this.parent.createPath(this.cache);}});_4("dojox.gfx3d.Triangles",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultTriangles);},setObject:function(_47,_48){if(_47 instanceof Array){this.object=_6.makeParameters(this.object,{points:_47,style:_48});}else{this.object=_6.makeParameters(this.object,_47);}return this;},render:function(_49){var m=_c.multiply(_49,this.matrix);var c=_3.map(this.object.points,function(_4a){return _c.multiplyPoint(m,_4a);});this.cache=[];var _4b=c.slice(0,2);var _4c=c[0];if(this.object.style=="strip"){_3.forEach(c.slice(2),function(_4d){_4b.push(_4d);_4b.push(_4b[0]);this.cache.push(_4b);_4b=_4b.slice(1,3);},this);}else{if(this.object.style=="fan"){_3.forEach(c.slice(2),function(_4e){_4b.push(_4e);_4b.push(_4c);this.cache.push(_4b);_4b=[_4c,_4e];},this);}else{for(var i=0;i<c.length;){this.cache.push([c[i],c[i+1],c[i+2],c[i]]);i+=3;}}}},draw:function(_4f){this.cache=_e.bsp(this.cache,function(it){return it;});if(this.shape){this.shape.clear();}else{this.shape=this.renderer.createGroup();}_3.forEach(this.cache,function(_50){this.shape.createPolyline(_50).setStroke(this.strokeStyle).setFill(this.toStdFill(_4f,_b.normalize(_50)));},this);},getZOrder:function(){var _51=0;_3.forEach(this.cache,function(_52){_51+=(_52[0].z+_52[1].z+_52[2].z)/3;});return (this.cache.length>1)?_51/this.cache.length:0;}});_4("dojox.gfx3d.Quads",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultQuads);},setObject:function(_53,_54){this.object=_6.makeParameters(this.object,(_53 instanceof Array)?{points:_53,style:_54}:_53);return this;},render:function(_55){var m=_c.multiply(_55,this.matrix),i;var c=_3.map(this.object.points,function(_56){return _c.multiplyPoint(m,_56);});this.cache=[];if(this.object.style=="strip"){var _57=c.slice(0,2);for(i=2;i<c.length;){_57=_57.concat([c[i],c[i+1],_57[0]]);this.cache.push(_57);_57=_57.slice(2,4);i+=2;}}else{for(i=0;i<c.length;){this.cache.push([c[i],c[i+1],c[i+2],c[i+3],c[i]]);i+=4;}}},draw:function(_58){this.cache=_8.scheduler.bsp(this.cache,function(it){return it;});if(this.shape){this.shape.clear();}else{this.shape=this.renderer.createGroup();}for(var x=0;x<this.cache.length;x++){this.shape.createPolyline(this.cache[x]).setStroke(this.strokeStyle).setFill(this.toStdFill(_58,_b.normalize(this.cache[x])));}},getZOrder:function(){var _59=0;for(var x=0;x<this.cache.length;x++){var i=this.cache[x];_59+=(i[0].z+i[1].z+i[2].z+i[3].z)/4;}return (this.cache.length>1)?_59/this.cache.length:0;}});_4("dojox.gfx3d.Polygon",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultPolygon);},setObject:function(_5a){this.object=_6.makeParameters(this.object,(_5a instanceof Array)?{path:_5a}:_5a);return this;},render:function(_5b){var m=_c.multiply(_5b,this.matrix);this.cache=_3.map(this.object.path,function(_5c){return _c.multiplyPoint(m,_5c);});this.cache.push(this.cache[0]);},draw:function(_5d){if(this.shape){this.shape.setShape({points:this.cache});}else{this.shape=this.renderer.createPolyline({points:this.cache});}this.shape.setStroke(this.strokeStyle).setFill(this.toStdFill(_5d,_c.normalize(this.cache)));},getZOrder:function(){var _5e=0;for(var x=0;x<this.cache.length;x++){_5e+=this.cache[x].z;}return (this.cache.length>1)?_5e/this.cache.length:0;},getOutline:function(){return this.cache.slice(0,3);}});_4("dojox.gfx3d.Cube",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultCube);this.polygons=[];},setObject:function(_5f){this.object=_6.makeParameters(this.object,_5f);},render:function(_60){var a=this.object.top;var g=this.object.bottom;var b={x:g.x,y:a.y,z:a.z};var c={x:g.x,y:g.y,z:a.z};var d={x:a.x,y:g.y,z:a.z};var e={x:a.x,y:a.y,z:g.z};var f={x:g.x,y:a.y,z:g.z};var h={x:a.x,y:g.y,z:g.z};var _61=[a,b,c,d,e,f,g,h];var m=_c.multiply(_60,this.matrix);var p=_3.map(_61,function(_62){return _c.multiplyPoint(m,_62);});a=p[0];b=p[1];c=p[2];d=p[3];e=p[4];f=p[5];g=p[6];h=p[7];this.cache=[[a,b,c,d,a],[e,f,g,h,e],[a,d,h,e,a],[d,c,g,h,d],[c,b,f,g,c],[b,a,e,f,b]];},draw:function(_63){this.cache=_8.scheduler.bsp(this.cache,function(it){return it;});var _64=this.cache.slice(3);if(this.shape){this.shape.clear();}else{this.shape=this.renderer.createGroup();}for(var x=0;x<_64.length;x++){this.shape.createPolyline(_64[x]).setStroke(this.strokeStyle).setFill(this.toStdFill(_63,_b.normalize(_64[x])));}},getZOrder:function(){var top=this.cache[0][0];var _65=this.cache[1][2];return (top.z+_65.z)/2;}});_4("dojox.gfx3d.Cylinder",_8.Object,{constructor:function(){this.object=_5.clone(_8.defaultCylinder);},render:function(_66){var m=_c.multiply(_66,this.matrix);var _67=[0,Math.PI/4,Math.PI/3];var _68=_c.multiplyPoint(m,this.object.center);var _69=_3.map(_67,function(_6a){return {x:this.center.x+this.radius*Math.cos(_6a),y:this.center.y+this.radius*Math.sin(_6a),z:this.center.z};},this.object);_69=_3.map(_69,function(_6b){return _b.substract(_c.multiplyPoint(m,_6b),_68);});var A={xx:_69[0].x*_69[0].y,xy:_69[0].y*_69[0].y,xz:1,yx:_69[1].x*_69[1].y,yy:_69[1].y*_69[1].y,yz:1,zx:_69[2].x*_69[2].y,zy:_69[2].y*_69[2].y,zz:1,dx:0,dy:0,dz:0};var B=_3.map(_69,function(_6c){return -Math.pow(_6c.x,2);});var X=_c.multiplyPoint(_c.invert(A),B[0],B[1],B[2]);var _6d=Math.atan2(X.x,1-X.y)/2;var _6e=_3.map(_69,function(_6f){return _7.multiplyPoint(_7.rotate(-_6d),_6f.x,_6f.y);});var a=Math.pow(_6e[0].x,2);var b=Math.pow(_6e[0].y,2);var c=Math.pow(_6e[1].x,2);var d=Math.pow(_6e[1].y,2);var rx=Math.sqrt((a*d-b*c)/(d-b));var ry=Math.sqrt((a*d-b*c)/(a-c));if(rx<ry){var t=rx;rx=ry;ry=t;_6d-=Math.PI/2;}var top=_c.multiplyPoint(m,_b.sum(this.object.center,{x:0,y:0,z:this.object.height}));var _70=this.fillStyle.type=="constant"?this.fillStyle.color:_a(this.renderer.lighting,this.fillStyle,this.object.center,this.object.radius,Math.PI,2*Math.PI,m);if(isNaN(rx)||isNaN(ry)||isNaN(_6d)){rx=this.object.radius,ry=0,_6d=0;}this.cache={center:_68,top:top,rx:rx,ry:ry,theta:_6d,gradient:_70};},draw:function(){var c=this.cache,v=_b,m=_7,_71=[c.center,c.top],_72=v.substract(c.top,c.center);if(v.dotProduct(_72,this.renderer.lighting.incident)>0){_71=[c.top,c.center];_72=v.substract(c.center,c.top);}var _73=this.renderer.lighting[this.fillStyle.type](_72,this.fillStyle.finish,this.fillStyle.color),d=Math.sqrt(Math.pow(c.center.x-c.top.x,2)+Math.pow(c.center.y-c.top.y,2));if(this.shape){this.shape.clear();}else{this.shape=this.renderer.createGroup();}this.shape.createPath("").moveTo(0,-c.rx).lineTo(d,-c.rx).lineTo(d,c.rx).lineTo(0,c.rx).arcTo(c.ry,c.rx,0,true,true,0,-c.rx).setFill(c.gradient).setStroke(this.strokeStyle).setTransform([m.translate(_71[0]),m.rotate(Math.atan2(_71[1].y-_71[0].y,_71[1].x-_71[0].x))]);if(c.rx>0&&c.ry>0){this.shape.createEllipse({cx:_71[1].x,cy:_71[1].y,rx:c.rx,ry:c.ry}).setFill(_73).setStroke(this.strokeStyle).applyTransform(m.rotateAt(c.theta,_71[1]));}}});_4("dojox.gfx3d.Viewport",_6.Group,{constructor:function(){this.dimension=null;this.objects=[];this.todos=[];this.renderer=this;this.schedule=_8.scheduler.zOrder;this.draw=_8.drawer.conservative;this.deep=false;this.lights=[];this.lighting=null;},setCameraTransform:function(_74){this.camera=_c.clone(_74?_c.normalize(_74):_8.identity,true);this.invalidate();return this;},applyCameraRightTransform:function(_75){return _75?this.setCameraTransform([this.camera,_75]):this;},applyCameraLeftTransform:function(_76){return _76?this.setCameraTransform([_76,this.camera]):this;},applyCameraTransform:function(_77){return this.applyCameraRightTransform(_77);},setLights:function(_78,_79,_7a){this.lights=(_78 instanceof Array)?{sources:_78,ambient:_79,specular:_7a}:_78;var _7b={x:0,y:0,z:1};this.lighting=new _d.Model(_7b,this.lights.sources,this.lights.ambient,this.lights.specular);this.invalidate();return this;},addLights:function(_7c){return this.setLights(this.lights.sources.concat(_7c));},addTodo:function(_7d){if(_3.every(this.todos,function(_7e){return _7e!=_7d;})){this.todos.push(_7d);}},invalidate:function(){this.deep=true;this.todos=this.objects;},setDimensions:function(dim){if(dim){var w=_5.isString(dim.width)?parseInt(dim.width):dim.width;var h=_5.isString(dim.height)?parseInt(dim.height):dim.height;if(this.rawNode){var trs=this.rawNode.style;trs.height=h;trs.width=w;}this.dimension={width:w,height:h};}else{this.dimension=null;}},render:function(){if(!this.todos.length){return;}var m=_c;for(var x=0;x<this.todos.length;x++){this.todos[x].render(_c.normalize([m.cameraRotateXg(180),m.cameraTranslate(0,this.dimension.height,0),this.camera]),this.deep);}this.objects=this.schedule(this.objects);this.draw(this.todos,this.objects,this);this.todos=[];this.deep=false;}});_8.Viewport.nodeType=_6.Group.nodeType;_8._creators={createEdges:function(_7f,_80){return this.create3DObject(_8.Edges,_7f,_80);},createTriangles:function(_81,_82){return this.create3DObject(_8.Triangles,_81,_82);},createQuads:function(_83,_84){return this.create3DObject(_8.Quads,_83,_84);},createPolygon:function(_85){return this.create3DObject(_8.Polygon,_85);},createOrbit:function(_86){return this.create3DObject(_8.Orbit,_86);},createCube:function(_87){return this.create3DObject(_8.Cube,_87);},createCylinder:function(_88){return this.create3DObject(_8.Cylinder,_88);},createPath3d:function(_89){return this.create3DObject(_8.Path3d,_89);},createScene:function(){return this.create3DObject(_8.Scene);},create3DObject:function(_8a,_8b,_8c){var obj=new _8a();this.adopt(obj);if(_8b){obj.setObject(_8b,_8c);}return obj;},adopt:function(obj){obj.renderer=this.renderer;obj.parent=this;this.objects.push(obj);this.addTodo(obj);return this;},abandon:function(obj,_8d){for(var i=0;i<this.objects.length;++i){if(this.objects[i]==obj){this.objects.splice(i,1);}}obj.parent=null;return this;},setScheduler:function(_8e){this.schedule=_8e;},setDrawer:function(_8f){this.draw=_8f;}};_5.extend(_8.Viewport,_8._creators);_5.extend(_8.Scene,_8._creators);delete _8._creators;_5.extend(_6.Surface,{createViewport:function(){var _90=this.createObject(_8.Viewport,null,true);_90.setDimensions(this.getDimensions());return _90;}});return _8.Object;});},"dojox/main":function(){define("dojox/main",["dojo/_base/kernel"],function(_91){return _91.dojox;});},"dojox/gfx3d/scheduler":function(){define("dojox/gfx3d/scheduler",["dojo/_base/lang","dojo/_base/array","dojo/_base/declare","./_base","./vector"],function(_92,_93,_94,_95,_96){_95.scheduler={zOrder:function(_97,_98){_98=_98?_98:_95.scheduler.order;_97.sort(function(a,b){return _98(b)-_98(a);});return _97;},bsp:function(_99,_9a){_9a=_9a?_9a:_95.scheduler.outline;var p=new _95.scheduler.BinarySearchTree(_99[0],_9a);_93.forEach(_99.slice(1),function(_9b){p.add(_9b,_9a);});return p.iterate(_9a);},order:function(it){return it.getZOrder();},outline:function(it){return it.getOutline();}};var BST=_94("dojox.gfx3d.scheduler.BinarySearchTree",null,{constructor:function(obj,_9c){this.plus=null;this.minus=null;this.object=obj;var o=_9c(obj);this.orient=o[0];this.normal=_96.normalize(o);},add:function(obj,_9d){var _9e=0.5,o=_9d(obj),v=_96,n=this.normal,a=this.orient,BST=_95.scheduler.BinarySearchTree;if(_93.every(o,function(_9f){return Math.floor(_9e+v.dotProduct(n,v.substract(_9f,a)))<=0;})){if(this.minus){this.minus.add(obj,_9d);}else{this.minus=new BST(obj,_9d);}}else{if(_93.every(o,function(_a0){return Math.floor(_9e+v.dotProduct(n,v.substract(_a0,a)))>=0;})){if(this.plus){this.plus.add(obj,_9d);}else{this.plus=new BST(obj,_9d);}}else{throw "The case: polygon cross siblings' plate is not implemented yet";}}},iterate:function(_a1){var _a2=0.5;var v=_96;var _a3=[];var _a4=null;var _a5={x:0,y:0,z:-10000};if(Math.floor(_a2+v.dotProduct(this.normal,v.substract(_a5,this.orient)))<=0){_a4=[this.plus,this.minus];}else{_a4=[this.minus,this.plus];}if(_a4[0]){_a3=_a3.concat(_a4[0].iterate());}_a3.push(this.object);if(_a4[1]){_a3=_a3.concat(_a4[1].iterate());}return _a3;}});_95.drawer={conservative:function(_a6,_a7,_a8){_93.forEach(this.objects,function(_a9){_a9.destroy();});_93.forEach(_a7,function(_aa){_aa.draw(_a8.lighting);});},chart:function(_ab,_ac,_ad){_93.forEach(this.todos,function(_ae){_ae.draw(_ad.lighting);});}};var api={scheduler:_95.scheduler,drawer:_95.drawer,BinarySearchTree:BST};return api;});},"dojox/gfx3d/matrix":function(){define("dojox/gfx3d/matrix",["dojo/_base/lang","./_base"],function(_af,_b0){_b0.matrix={_degToRad:function(_b1){return Math.PI*_b1/180;},_radToDeg:function(_b2){return _b2/Math.PI*180;}};_b0.matrix.Matrix3D=function(arg){if(arg){if(typeof arg=="number"){this.xx=this.yy=this.zz=arg;}else{if(arg instanceof Array){if(arg.length>0){var m=_b0.matrix.normalize(arg[0]);for(var i=1;i<arg.length;++i){var l=m;var r=_b0.matrix.normalize(arg[i]);m=new _b0.matrix.Matrix3D();m.xx=l.xx*r.xx+l.xy*r.yx+l.xz*r.zx;m.xy=l.xx*r.xy+l.xy*r.yy+l.xz*r.zy;m.xz=l.xx*r.xz+l.xy*r.yz+l.xz*r.zz;m.yx=l.yx*r.xx+l.yy*r.yx+l.yz*r.zx;m.yy=l.yx*r.xy+l.yy*r.yy+l.yz*r.zy;m.yz=l.yx*r.xz+l.yy*r.yz+l.yz*r.zz;m.zx=l.zx*r.xx+l.zy*r.yx+l.zz*r.zx;m.zy=l.zx*r.xy+l.zy*r.yy+l.zz*r.zy;m.zz=l.zx*r.xz+l.zy*r.yz+l.zz*r.zz;m.dx=l.xx*r.dx+l.xy*r.dy+l.xz*r.dz+l.dx;m.dy=l.yx*r.dx+l.yy*r.dy+l.yz*r.dz+l.dy;m.dz=l.zx*r.dx+l.zy*r.dy+l.zz*r.dz+l.dz;}_af.mixin(this,m);}}else{_af.mixin(this,arg);}}}};_af.extend(_b0.matrix.Matrix3D,{xx:1,xy:0,xz:0,yx:0,yy:1,yz:0,zx:0,zy:0,zz:1,dx:0,dy:0,dz:0});_af.mixin(_b0.matrix,{identity:new _b0.matrix.Matrix3D(),translate:function(a,b,c){if(arguments.length>1){return new _b0.matrix.Matrix3D({dx:a,dy:b,dz:c});}return new _b0.matrix.Matrix3D({dx:a.x,dy:a.y,dz:a.z});},scale:function(a,b,c){if(arguments.length>1){return new _b0.matrix.Matrix3D({xx:a,yy:b,zz:c});}if(typeof a=="number"){return new _b0.matrix.Matrix3D({xx:a,yy:a,zz:a});}return new _b0.matrix.Matrix3D({xx:a.x,yy:a.y,zz:a.z});},rotateX:function(_b3){var c=Math.cos(_b3);var s=Math.sin(_b3);return new _b0.matrix.Matrix3D({yy:c,yz:-s,zy:s,zz:c});},rotateXg:function(_b4){return _b0.matrix.rotateX(_b0.matrix._degToRad(_b4));},rotateY:function(_b5){var c=Math.cos(_b5);var s=Math.sin(_b5);return new _b0.matrix.Matrix3D({xx:c,xz:s,zx:-s,zz:c});},rotateYg:function(_b6){return _b0.matrix.rotateY(_b0.matrix._degToRad(_b6));},rotateZ:function(_b7){var c=Math.cos(_b7);var s=Math.sin(_b7);return new _b0.matrix.Matrix3D({xx:c,xy:-s,yx:s,yy:c});},rotateZg:function(_b8){return _b0.matrix.rotateZ(_b0.matrix._degToRad(_b8));},cameraTranslate:function(a,b,c){if(arguments.length>1){return new _b0.matrix.Matrix3D({dx:-a,dy:-b,dz:-c});}return new _b0.matrix.Matrix3D({dx:-a.x,dy:-a.y,dz:-a.z});},cameraRotateX:function(_b9){var c=Math.cos(-_b9);var s=Math.sin(-_b9);return new _b0.matrix.Matrix3D({yy:c,yz:-s,zy:s,zz:c});},cameraRotateXg:function(_ba){return _b0.matrix.rotateX(_b0.matrix._degToRad(_ba));},cameraRotateY:function(_bb){var c=Math.cos(-_bb);var s=Math.sin(-_bb);return new _b0.matrix.Matrix3D({xx:c,xz:s,zx:-s,zz:c});},cameraRotateYg:function(_bc){return _b0.matrix.rotateY(dojox.gfx3d.matrix._degToRad(_bc));},cameraRotateZ:function(_bd){var c=Math.cos(-_bd);var s=Math.sin(-_bd);return new _b0.matrix.Matrix3D({xx:c,xy:-s,yx:s,yy:c});},cameraRotateZg:function(_be){return _b0.matrix.rotateZ(_b0.matrix._degToRad(_be));},normalize:function(_bf){return (_bf instanceof _b0.matrix.Matrix3D)?_bf:new _b0.matrix.Matrix3D(_bf);},clone:function(_c0){var obj=new _b0.matrix.Matrix3D();for(var i in _c0){if(typeof (_c0[i])=="number"&&typeof (obj[i])=="number"&&obj[i]!=_c0[i]){obj[i]=_c0[i];}}return obj;},invert:function(_c1){var m=_b0.matrix.normalize(_c1);var D=m.xx*m.yy*m.zz+m.xy*m.yz*m.zx+m.xz*m.yx*m.zy-m.xx*m.yz*m.zy-m.xy*m.yx*m.zz-m.xz*m.yy*m.zx;var M=new _b0.matrix.Matrix3D({xx:(m.yy*m.zz-m.yz*m.zy)/D,xy:(m.xz*m.zy-m.xy*m.zz)/D,xz:(m.xy*m.yz-m.xz*m.yy)/D,yx:(m.yz*m.zx-m.yx*m.zz)/D,yy:(m.xx*m.zz-m.xz*m.zx)/D,yz:(m.xz*m.yx-m.xx*m.yz)/D,zx:(m.yx*m.zy-m.yy*m.zx)/D,zy:(m.xy*m.zx-m.xx*m.zy)/D,zz:(m.xx*m.yy-m.xy*m.yx)/D,dx:-1*(m.xy*m.yz*m.dz+m.xz*m.dy*m.zy+m.dx*m.yy*m.zz-m.xy*m.dy*m.zz-m.xz*m.yy*m.dz-m.dx*m.yz*m.zy)/D,dy:(m.xx*m.yz*m.dz+m.xz*m.dy*m.zx+m.dx*m.yx*m.zz-m.xx*m.dy*m.zz-m.xz*m.yx*m.dz-m.dx*m.yz*m.zx)/D,dz:-1*(m.xx*m.yy*m.dz+m.xy*m.dy*m.zx+m.dx*m.yx*m.zy-m.xx*m.dy*m.zy-m.xy*m.yx*m.dz-m.dx*m.yy*m.zx)/D});return M;},_multiplyPoint:function(m,x,y,z){return {x:m.xx*x+m.xy*y+m.xz*z+m.dx,y:m.yx*x+m.yy*y+m.yz*z+m.dy,z:m.zx*x+m.zy*y+m.zz*z+m.dz};},multiplyPoint:function(_c2,a,b,c){var m=_b0.matrix.normalize(_c2);if(typeof a=="number"&&typeof b=="number"&&typeof c=="number"){return _b0.matrix._multiplyPoint(m,a,b,c);}return _b0.matrix._multiplyPoint(m,a.x,a.y,a.z);},multiply:function(_c3){var m=_b0.matrix.normalize(_c3);for(var i=1;i<arguments.length;++i){var l=m;var r=_b0.matrix.normalize(arguments[i]);m=new _b0.matrix.Matrix3D();m.xx=l.xx*r.xx+l.xy*r.yx+l.xz*r.zx;m.xy=l.xx*r.xy+l.xy*r.yy+l.xz*r.zy;m.xz=l.xx*r.xz+l.xy*r.yz+l.xz*r.zz;m.yx=l.yx*r.xx+l.yy*r.yx+l.yz*r.zx;m.yy=l.yx*r.xy+l.yy*r.yy+l.yz*r.zy;m.yz=l.yx*r.xz+l.yy*r.yz+l.yz*r.zz;m.zx=l.zx*r.xx+l.zy*r.yx+l.zz*r.zx;m.zy=l.zx*r.xy+l.zy*r.yy+l.zz*r.zy;m.zz=l.zx*r.xz+l.zy*r.yz+l.zz*r.zz;m.dx=l.xx*r.dx+l.xy*r.dy+l.xz*r.dz+l.dx;m.dy=l.yx*r.dx+l.yy*r.dy+l.yz*r.dz+l.dy;m.dz=l.zx*r.dx+l.zy*r.dy+l.zz*r.dz+l.dz;}return m;},_project:function(m,x,y,z){return {x:m.xx*x+m.xy*y+m.xz*z+m.dx,y:m.yx*x+m.yy*y+m.yz*z+m.dy,z:m.zx*x+m.zy*y+m.zz*z+m.dz};},project:function(_c4,a,b,c){var m=_b0.matrix.normalize(_c4);if(typeof a=="number"&&typeof b=="number"&&typeof c=="number"){return _b0.matrix._project(m,a,b,c);}return _b0.matrix._project(m,a.x,a.y,a.z);}});_b0.Matrix3D=_b0.matrix.Matrix3D;return _b0.matrix;});},"dojox/gfx3d/gradient":function(){define("dojox/gfx3d/gradient",["dojo/_base/lang","./matrix","./vector"],function(_c5,m,v){var _c6=_c5.getObject("dojox.gfx3d",true);var _c7=function(a,b){return Math.sqrt(Math.pow(b.x-a.x,2)+Math.pow(b.y-a.y,2));};var N=32;_c6.gradient=function(_c8,_c9,_ca,_cb,_cc,to,_cd){var mx=m.normalize(_cd),f=m.multiplyPoint(mx,_cb*Math.cos(_cc)+_ca.x,_cb*Math.sin(_cc)+_ca.y,_ca.z),t=m.multiplyPoint(mx,_cb*Math.cos(to)+_ca.x,_cb*Math.sin(to)+_ca.y,_ca.z),c=m.multiplyPoint(mx,_ca.x,_ca.y,_ca.z),_ce=(to-_cc)/N,r=_c7(f,t)/2,mod=_c8[_c9.type],fin=_c9.finish,pmt=_c9.color,_cf=[{offset:0,color:mod.call(_c8,v.substract(f,c),fin,pmt)}];for(var a=_cc+_ce;a<to;a+=_ce){var p=m.multiplyPoint(mx,_cb*Math.cos(a)+_ca.x,_cb*Math.sin(a)+_ca.y,_ca.z),df=_c7(f,p),dt=_c7(t,p);_cf.push({offset:df/(df+dt),color:mod.call(_c8,v.substract(p,c),fin,pmt)});}_cf.push({offset:1,color:mod.call(_c8,v.substract(t,c),fin,pmt)});return {type:"linear",x1:0,y1:-r,x2:0,y2:r,colors:_cf};};return _c6.gradient;});},"dojox/gfx3d":function(){define("dojox/gfx3d",["dojo/_base/kernel","dojox","./gfx3d/matrix","./gfx3d/_base","./gfx3d/object"],function(_d0,_d1){_d0.getObject("gfx3d",true,_d1);return _d1.gfx3d;});},"dojox/gfx3d/vector":function(){define("dojox/gfx3d/vector",["dojo/_base/lang","dojo/_base/array","./_base"],function(_d2,_d3,_d4){_d4.vector={sum:function(){var v={x:0,y:0,z:0};_d3.forEach(arguments,function(_d5){v.x+=_d5.x;v.y+=_d5.y;v.z+=_d5.z;});return v;},center:function(){var l=arguments.length;if(l==0){return {x:0,y:0,z:0};}var v=_d4.vector.sum(arguments);return {x:v.x/l,y:v.y/l,z:v.z/l};},substract:function(a,b){return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};},_crossProduct:function(x,y,z,u,v,w){return {x:y*w-z*v,y:z*u-x*w,z:x*v-y*u};},crossProduct:function(a,b,c,d,e,f){if(arguments.length==6&&_d3.every(arguments,function(_d6){return typeof _d6=="number";})){return _d4.vector._crossProduct(a,b,c,d,e,f);}return _d4.vector._crossProduct(a.x,a.y,a.z,b.x,b.y,b.z);},_dotProduct:function(x,y,z,u,v,w){return x*u+y*v+z*w;},dotProduct:function(a,b,c,d,e,f){if(arguments.length==6&&_d3.every(arguments,function(_d7){return typeof _d7=="number";})){return _d4.vector._dotProduct(a,b,c,d,e,f);}return _d4.vector._dotProduct(a.x,a.y,a.z,b.x,b.y,b.z);},normalize:function(a,b,c){var l,m,n;if(a instanceof Array){l=a[0];m=a[1];n=a[2];}else{l=a;m=b;n=c;}var u=_d4.vector.substract(m,l);var v=_d4.vector.substract(n,l);return _d4.vector.crossProduct(u,v);}};return _d4.vector;});},"dojox/gfx3d/lighting":function(){define("dojox/gfx3d/lighting",["dojo/_base/lang","dojo/_base/Color","dojo/_base/declare","dojox/gfx/_base","./_base"],function(_d8,_d9,_da,gfx,_db){var _dc=_db.lighting={black:function(){return {r:0,g:0,b:0,a:1};},white:function(){return {r:1,g:1,b:1,a:1};},toStdColor:function(c){c=gfx.normalizeColor(c);return {r:c.r/255,g:c.g/255,b:c.b/255,a:c.a};},fromStdColor:function(c){return new _d9([Math.round(255*c.r),Math.round(255*c.g),Math.round(255*c.b),c.a]);},scaleColor:function(s,c){return {r:s*c.r,g:s*c.g,b:s*c.b,a:s*c.a};},addColor:function(a,b){return {r:a.r+b.r,g:a.g+b.g,b:a.b+b.b,a:a.a+b.a};},multiplyColor:function(a,b){return {r:a.r*b.r,g:a.g*b.g,b:a.b*b.b,a:a.a*b.a};},saturateColor:function(c){return {r:c.r<0?0:c.r>1?1:c.r,g:c.g<0?0:c.g>1?1:c.g,b:c.b<0?0:c.b>1?1:c.b,a:c.a<0?0:c.a>1?1:c.a};},mixColor:function(c1,c2,s){return _dc.addColor(_dc.scaleColor(s,c1),_dc.scaleColor(1-s,c2));},diff2Color:function(c1,c2){var r=c1.r-c2.r;var g=c1.g-c2.g;var b=c1.b-c2.b;var a=c1.a-c2.a;return r*r+g*g+b*b+a*a;},length2Color:function(c){return c.r*c.r+c.g*c.g+c.b*c.b+c.a*c.a;},dot:function(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;},scale:function(s,v){return {x:s*v.x,y:s*v.y,z:s*v.z};},add:function(a,b){return {x:a.x+b.x,y:a.y+b.y,z:a.z+b.z};},saturate:function(v){return Math.min(Math.max(v,0),1);},length:function(v){return Math.sqrt(_db.lighting.dot(v,v));},normalize:function(v){return _dc.scale(1/_dc.length(v),v);},faceforward:function(n,i){var p=_db.lighting;var s=p.dot(i,n)<0?1:-1;return p.scale(s,n);},reflect:function(i,n){var p=_db.lighting;return p.add(i,p.scale(-2*p.dot(i,n),n));},diffuse:function(_dd,_de){var c=_dc.black();for(var i=0;i<_de.length;++i){var l=_de[i],d=_dc.dot(_dc.normalize(l.direction),_dd);c=_dc.addColor(c,_dc.scaleColor(d,l.color));}return _dc.saturateColor(c);},specular:function(_df,v,_e0,_e1){var c=_dc.black();for(var i=0;i<_e1.length;++i){var l=_e1[i],h=_dc.normalize(_dc.add(_dc.normalize(l.direction),v)),s=Math.pow(Math.max(0,_dc.dot(_df,h)),1/_e0);c=_dc.addColor(c,_dc.scaleColor(s,l.color));}return _dc.saturateColor(c);},phong:function(_e2,v,_e3,_e4){_e2=_dc.normalize(_e2);var c=_dc.black();for(var i=0;i<_e4.length;++i){var l=_e4[i],r=_dc.reflect(_dc.scale(-1,_dc.normalize(v)),_e2),s=Math.pow(Math.max(0,_dc.dot(r,_dc.normalize(l.direction))),_e3);c=_dc.addColor(c,_dc.scaleColor(s,l.color));}return _dc.saturateColor(c);}};_da("dojox.gfx3d.lighting.Model",null,{constructor:function(_e5,_e6,_e7,_e8){this.incident=_dc.normalize(_e5);this.lights=[];for(var i=0;i<_e6.length;++i){var l=_e6[i];this.lights.push({direction:_dc.normalize(l.direction),color:_dc.toStdColor(l.color)});}this.ambient=_dc.toStdColor(_e7.color?_e7.color:"white");this.ambient=_dc.scaleColor(_e7.intensity,this.ambient);this.ambient=_dc.scaleColor(this.ambient.a,this.ambient);this.ambient.a=1;this.specular=_dc.toStdColor(_e8?_e8:"white");this.specular=_dc.scaleColor(this.specular.a,this.specular);this.specular.a=1;this.npr_cool={r:0,g:0,b:0.4,a:1};this.npr_warm={r:0.4,g:0.4,b:0.2,a:1};this.npr_alpha=0.2;this.npr_beta=0.6;this.npr_scale=0.6;},constant:function(_e9,_ea,_eb){_eb=_dc.toStdColor(_eb);var _ec=_eb.a,_ed=_dc.scaleColor(_ec,_eb);_ed.a=_ec;return _dc.fromStdColor(_dc.saturateColor(_ed));},matte:function(_ee,_ef,_f0){if(typeof _ef=="string"){_ef=_dc.finish[_ef];}_f0=_dc.toStdColor(_f0);_ee=_dc.faceforward(_dc.normalize(_ee),this.incident);var _f1=_dc.scaleColor(_ef.Ka,this.ambient),_f2=_dc.saturate(-4*_dc.dot(_ee,this.incident)),_f3=_dc.scaleColor(_f2*_ef.Kd,_dc.diffuse(_ee,this.lights)),_f4=_dc.scaleColor(_f0.a,_dc.multiplyColor(_f0,_dc.addColor(_f1,_f3)));_f4.a=_f0.a;return _dc.fromStdColor(_dc.saturateColor(_f4));},metal:function(_f5,_f6,_f7){if(typeof _f6=="string"){_f6=_dc.finish[_f6];}_f7=_dc.toStdColor(_f7);_f5=_dc.faceforward(_dc.normalize(_f5),this.incident);var v=_dc.scale(-1,this.incident),_f8,_f9,_fa=_dc.scaleColor(_f6.Ka,this.ambient),_fb=_dc.saturate(-4*_dc.dot(_f5,this.incident));if("phong" in _f6){_f8=_dc.scaleColor(_fb*_f6.Ks*_f6.phong,_dc.phong(_f5,v,_f6.phong_size,this.lights));}else{_f8=_dc.scaleColor(_fb*_f6.Ks,_dc.specular(_f5,v,_f6.roughness,this.lights));}_f9=_dc.scaleColor(_f7.a,_dc.addColor(_dc.multiplyColor(_f7,_fa),_dc.multiplyColor(this.specular,_f8)));_f9.a=_f7.a;return _dc.fromStdColor(_dc.saturateColor(_f9));},plastic:function(_fc,_fd,_fe){if(typeof _fd=="string"){_fd=_dc.finish[_fd];}_fe=_dc.toStdColor(_fe);_fc=_dc.faceforward(_dc.normalize(_fc),this.incident);var v=_dc.scale(-1,this.incident),_ff,_100,_101=_dc.scaleColor(_fd.Ka,this.ambient),_102=_dc.saturate(-4*_dc.dot(_fc,this.incident)),_103=_dc.scaleColor(_102*_fd.Kd,_dc.diffuse(_fc,this.lights));if("phong" in _fd){_ff=_dc.scaleColor(_102*_fd.Ks*_fd.phong,_dc.phong(_fc,v,_fd.phong_size,this.lights));}else{_ff=_dc.scaleColor(_102*_fd.Ks,_dc.specular(_fc,v,_fd.roughness,this.lights));}_100=_dc.scaleColor(_fe.a,_dc.addColor(_dc.multiplyColor(_fe,_dc.addColor(_101,_103)),_dc.multiplyColor(this.specular,_ff)));_100.a=_fe.a;return _dc.fromStdColor(_dc.saturateColor(_100));},npr:function(_104,_105,_106){if(typeof _105=="string"){_105=_dc.finish[_105];}_106=_dc.toStdColor(_106);_104=_dc.faceforward(_dc.normalize(_104),this.incident);var _107=_dc.scaleColor(_105.Ka,this.ambient),_108=_dc.saturate(-4*_dc.dot(_104,this.incident)),_109=_dc.scaleColor(_108*_105.Kd,_dc.diffuse(_104,this.lights)),_10a=_dc.scaleColor(_106.a,_dc.multiplyColor(_106,_dc.addColor(_107,_109))),cool=_dc.addColor(this.npr_cool,_dc.scaleColor(this.npr_alpha,_10a)),warm=_dc.addColor(this.npr_warm,_dc.scaleColor(this.npr_beta,_10a)),d=(1+_dc.dot(this.incident,_104))/2,_10a=_dc.scaleColor(this.npr_scale,_dc.addColor(_10a,_dc.mixColor(cool,warm,d)));_10a.a=_106.a;return _dc.fromStdColor(_dc.saturateColor(_10a));}});_db.lighting.finish={defaults:{Ka:0.1,Kd:0.6,Ks:0,roughness:0.05},dull:{Ka:0.1,Kd:0.6,Ks:0.5,roughness:0.15},shiny:{Ka:0.1,Kd:0.6,Ks:1,roughness:0.001},glossy:{Ka:0.1,Kd:0.6,Ks:1,roughness:0.0001},phong_dull:{Ka:0.1,Kd:0.6,Ks:0.5,phong:0.5,phong_size:1},phong_shiny:{Ka:0.1,Kd:0.6,Ks:1,phong:1,phong_size:200},phong_glossy:{Ka:0.1,Kd:0.6,Ks:1,phong:1,phong_size:300},luminous:{Ka:1,Kd:0,Ks:0,roughness:0.05},metalA:{Ka:0.35,Kd:0.3,Ks:0.8,roughness:1/20},metalB:{Ka:0.3,Kd:0.4,Ks:0.7,roughness:1/60},metalC:{Ka:0.25,Kd:0.5,Ks:0.8,roughness:1/80},metalD:{Ka:0.15,Kd:0.6,Ks:0.8,roughness:1/100},metalE:{Ka:0.1,Kd:0.7,Ks:0.8,roughness:1/120}};return _dc;});},"*noref":1}});define("dojox/_dojox_gfx3d",[],1);require(["dojox/gfx3d"]);
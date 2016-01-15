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
require({cache:{"dojox/collections":function(){define("dojox/collections",["./collections/_base"],function(_1){return _1;});},"dojox/collections/Queue":function(){define("dojox/collections/Queue",["dojo/_base/kernel","dojo/_base/array","./_base"],function(_2,_3,_4){_4.Queue=function(_5){var q=[];if(_5){q=q.concat(_5);}this.count=q.length;this.clear=function(){q=[];this.count=q.length;};this.clone=function(){return new _4.Queue(q);};this.contains=function(o){for(var i=0;i<q.length;i++){if(q[i]==o){return true;}}return false;};this.copyTo=function(_6,i){_6.splice(i,0,q);};this.dequeue=function(){var r=q.shift();this.count=q.length;return r;};this.enqueue=function(o){this.count=q.push(o);};this.forEach=function(fn,_7){_2.forEach(q,fn,_7);};this.getIterator=function(){return new _4.Iterator(q);};this.peek=function(){return q[0];};this.toArray=function(){return [].concat(q);};};return _4.Queue;});},"dojox/collections/Set":function(){define("dojox/collections/Set",["./_base","./ArrayList"],function(_8,_9){_8.Set=new (function(){function _a(_b){if(_b.constructor==Array){return new _9(_b);}return _b;};this.union=function(_c,_d){_c=_a(_c);_d=_a(_d);var _e=new _9(_c.toArray());var e=_d.getIterator();while(!e.atEnd()){var _f=e.get();if(!_e.contains(_f)){_e.add(_f);}}return _e;};this.intersection=function(_10,_11){_10=_a(_10);_11=_a(_11);var _12=new _9();var e=_11.getIterator();while(!e.atEnd()){var _13=e.get();if(_10.contains(_13)){_12.add(_13);}}return _12;};this.difference=function(_14,_15){_14=_a(_14);_15=_a(_15);var _16=new _9();var e=_14.getIterator();while(!e.atEnd()){var _17=e.get();if(!_15.contains(_17)){_16.add(_17);}}return _16;};this.isSubSet=function(_18,_19){_18=_a(_18);_19=_a(_19);var e=_18.getIterator();while(!e.atEnd()){if(!_19.contains(e.get())){return false;}}return true;};this.isSuperSet=function(_1a,_1b){_1a=_a(_1a);_1b=_a(_1b);var e=_1b.getIterator();while(!e.atEnd()){if(!_1a.contains(e.get())){return false;}}return true;};})();return _8.Set;});},"dojox/collections/SortedList":function(){define("dojox/collections/SortedList",["dojo/_base/kernel","dojo/_base/array","./_base"],function(_1c,_1d,dxc){dxc.SortedList=function(_1e){var _1f=this;var _20={};var q=[];var _21=function(a,b){if(a.key>b.key){return 1;}if(a.key<b.key){return -1;}return 0;};var _22=function(){q=[];var e=_1f.getIterator();while(!e.atEnd()){q.push(e.get());}q.sort(_21);};var _23={};this.count=q.length;this.add=function(k,v){if(!_20[k]){_20[k]=new dxc.DictionaryEntry(k,v);this.count=q.push(_20[k]);q.sort(_21);}};this.clear=function(){_20={};q=[];this.count=q.length;};this.clone=function(){return new dxc.SortedList(this);};this.contains=this.containsKey=function(k){if(_23[k]){return false;}return (_20[k]!=null);};this.containsValue=function(o){var e=this.getIterator();while(!e.atEnd()){var _24=e.get();if(_24.value==o){return true;}}return false;};this.copyTo=function(arr,i){var e=this.getIterator();var idx=i;while(!e.atEnd()){arr.splice(idx,0,e.get());idx++;}};this.entry=function(k){return _20[k];};this.forEach=function(fn,_25){_1c.forEach(q,fn,_25);};this.getByIndex=function(i){return q[i].valueOf();};this.getIterator=function(){return new dxc.DictionaryIterator(_20);};this.getKey=function(i){return q[i].key;};this.getKeyList=function(){var arr=[];var e=this.getIterator();while(!e.atEnd()){arr.push(e.get().key);}return arr;};this.getValueList=function(){var arr=[];var e=this.getIterator();while(!e.atEnd()){arr.push(e.get().value);}return arr;};this.indexOfKey=function(k){for(var i=0;i<q.length;i++){if(q[i].key==k){return i;}}return -1;};this.indexOfValue=function(o){for(var i=0;i<q.length;i++){if(q[i].value==o){return i;}}return -1;};this.item=function(k){if(k in _20&&!_23[k]){return _20[k].valueOf();}return undefined;};this.remove=function(k){delete _20[k];_22();this.count=q.length;};this.removeAt=function(i){delete _20[q[i].key];_22();this.count=q.length;};this.replace=function(k,v){if(!_20[k]){this.add(k,v);return false;}else{_20[k]=new dxc.DictionaryEntry(k,v);_22();return true;}};this.setByIndex=function(i,o){_20[q[i].key].value=o;_22();this.count=q.length;};if(_1e){var e=_1e.getIterator();while(!e.atEnd()){var _26=e.get();q[q.length]=_20[_26.key]=new dxc.DictionaryEntry(_26.key,_26.value);}q.sort(_21);}};return dxc.SortedList;});},"dojox/collections/ArrayList":function(){define("dojox/collections/ArrayList",["dojo/_base/kernel","dojo/_base/array","./_base"],function(_27,_28,dxc){dxc.ArrayList=function(arr){var _29=[];if(arr){_29=_29.concat(arr);}this.count=_29.length;this.add=function(obj){_29.push(obj);this.count=_29.length;};this.addRange=function(a){if(a.getIterator){var e=a.getIterator();while(!e.atEnd()){this.add(e.get());}this.count=_29.length;}else{for(var i=0;i<a.length;i++){_29.push(a[i]);}this.count=_29.length;}};this.clear=function(){_29.splice(0,_29.length);this.count=0;};this.clone=function(){return new dxc.ArrayList(_29);};this.contains=function(obj){for(var i=0;i<_29.length;i++){if(_29[i]==obj){return true;}}return false;};this.forEach=function(fn,_2a){_27.forEach(_29,fn,_2a);};this.getIterator=function(){return new dxc.Iterator(_29);};this.indexOf=function(obj){for(var i=0;i<_29.length;i++){if(_29[i]==obj){return i;}}return -1;};this.insert=function(i,obj){_29.splice(i,0,obj);this.count=_29.length;};this.item=function(i){return _29[i];};this.remove=function(obj){var i=this.indexOf(obj);if(i>=0){_29.splice(i,1);}this.count=_29.length;};this.removeAt=function(i){_29.splice(i,1);this.count=_29.length;};this.reverse=function(){_29.reverse();};this.sort=function(fn){if(fn){_29.sort(fn);}else{_29.sort();}};this.setByIndex=function(i,obj){_29[i]=obj;this.count=_29.length;};this.toArray=function(){return [].concat(_29);};this.toString=function(_2b){return _29.join((_2b||","));};};return dxc.ArrayList;});},"dojox/collections/_base":function(){define("dojox/collections/_base",["dojo/_base/kernel","dojo/_base/lang","dojo/_base/array"],function(_2c,_2d,arr){var _2e=_2d.getObject("dojox.collections",true);_2e.DictionaryEntry=function(k,v){this.key=k;this.value=v;this.valueOf=function(){return this.value;};this.toString=function(){return String(this.value);};};_2e.Iterator=function(a){var _2f=0;this.element=a[_2f]||null;this.atEnd=function(){return (_2f>=a.length);};this.get=function(){if(this.atEnd()){return null;}this.element=a[_2f++];return this.element;};this.map=function(fn,_30){return arr.map(a,fn,_30);};this.reset=function(){_2f=0;this.element=a[_2f];};};_2e.DictionaryIterator=function(obj){var a=[];var _31={};for(var p in obj){if(!_31[p]){a.push(obj[p]);}}var _32=0;this.element=a[_32]||null;this.atEnd=function(){return (_32>=a.length);};this.get=function(){if(this.atEnd()){return null;}this.element=a[_32++];return this.element;};this.map=function(fn,_33){return arr.map(a,fn,_33);};this.reset=function(){_32=0;this.element=a[_32];};};return _2e;});},"dojox/collections/Dictionary":function(){define("dojox/collections/Dictionary",["dojo/_base/kernel","dojo/_base/array","./_base"],function(_34,_35,dxc){dxc.Dictionary=function(_36){var _37={};this.count=0;var _38={};this.add=function(k,v){var b=(k in _37);_37[k]=new dxc.DictionaryEntry(k,v);if(!b){this.count++;}};this.clear=function(){_37={};this.count=0;};this.clone=function(){return new dxc.Dictionary(this);};this.contains=this.containsKey=function(k){if(_38[k]){return false;}return (_37[k]!=null);};this.containsValue=function(v){var e=this.getIterator();while(e.get()){if(e.element.value==v){return true;}}return false;};this.entry=function(k){return _37[k];};this.forEach=function(fn,_39){var a=[];for(var p in _37){if(!_38[p]){a.push(_37[p]);}}_34.forEach(a,fn,_39);};this.getKeyList=function(){return (this.getIterator()).map(function(_3a){return _3a.key;});};this.getValueList=function(){return (this.getIterator()).map(function(_3b){return _3b.value;});};this.item=function(k){if(k in _37){return _37[k].valueOf();}return undefined;};this.getIterator=function(){return new dxc.DictionaryIterator(_37);};this.remove=function(k){if(k in _37&&!_38[k]){delete _37[k];this.count--;return true;}return false;};if(_36){var e=_36.getIterator();while(e.get()){this.add(e.element.key,e.element.value);}}};return dxc.Dictionary;});},"dojox/collections/BinaryTree":function(){define("dojox/collections/BinaryTree",["dojo/_base/kernel","dojo/_base/array","./_base"],function(_3c,_3d,dxc){dxc.BinaryTree=function(_3e){function _3f(_40,_41,_42){this.value=_40||null;this.right=_41||null;this.left=_42||null;this.clone=function(){var c=new _3f();if(this.value.value){c.value=this.value.clone();}else{c.value=this.value;}if(this.left!=null){c.left=this.left.clone();}if(this.right!=null){c.right=this.right.clone();}return c;};this.compare=function(n){if(this.value>n.value){return 1;}if(this.value<n.value){return -1;}return 0;};this.compareData=function(d){if(this.value>d){return 1;}if(this.value<d){return -1;}return 0;};};function _43(_44,a){if(_44){_43(_44.left,a);a.push(_44.value);_43(_44.right,a);}};function _45(_46,sep){var s="";if(_46){s=_46.value.toString()+sep;s+=_45(_46.left,sep);s+=_45(_46.right,sep);}return s;};function _47(_48,sep){var s="";if(_48){s=_47(_48.left,sep);s+=_48.value.toString()+sep;s+=_47(_48.right,sep);}return s;};function _49(_4a,sep){var s="";if(_4a){s=_49(_4a.left,sep);s+=_49(_4a.right,sep);s+=_4a.value.toString()+sep;}return s;};function _4b(_4c,_4d){if(!_4c){return null;}var i=_4c.compareData(_4d);if(i==0){return _4c;}if(i>0){return _4b(_4c.left,_4d);}else{return _4b(_4c.right,_4d);}};this.add=function(_4e){var n=new _3f(_4e);var i;var _4f=_50;var _51=null;while(_4f){i=_4f.compare(n);if(i==0){return;}_51=_4f;if(i>0){_4f=_4f.left;}else{_4f=_4f.right;}}this.count++;if(!_51){_50=n;}else{i=_51.compare(n);if(i>0){_51.left=n;}else{_51.right=n;}}};this.clear=function(){_50=null;this.count=0;};this.clone=function(){var c=new dxc.BinaryTree();var itr=this.getIterator();while(!itr.atEnd()){c.add(itr.get());}return c;};this.contains=function(_52){return this.search(_52)!=null;};this.deleteData=function(_53){var _54=_50;var _55=null;var i=_54.compareData(_53);while(i!=0&&_54!=null){if(i>0){_55=_54;_54=_54.left;}else{if(i<0){_55=_54;_54=_54.right;}}i=_54.compareData(_53);}if(!_54){return;}this.count--;if(!_54.right){if(!_55){_50=_54.left;}else{i=_55.compare(_54);if(i>0){_55.left=_54.left;}else{if(i<0){_55.right=_54.left;}}}}else{if(!_54.right.left){if(!_55){_50=_54.right;}else{i=_55.compare(_54);if(i>0){_55.left=_54.right;}else{if(i<0){_55.right=_54.right;}}}}else{var _56=_54.right.left;var _57=_54.right;while(_56.left!=null){_57=_56;_56=_56.left;}_57.left=_56.right;_56.left=_54.left;_56.right=_54.right;if(!_55){_50=_56;}else{i=_55.compare(_54);if(i>0){_55.left=_56;}else{if(i<0){_55.right=_56;}}}}}};this.getIterator=function(){var a=[];_43(_50,a);return new dxc.Iterator(a);};this.search=function(_58){return _4b(_50,_58);};this.toString=function(_59,sep){if(!_59){_59=dxc.BinaryTree.TraversalMethods.Inorder;}if(!sep){sep=",";}var s="";switch(_59){case dxc.BinaryTree.TraversalMethods.Preorder:s=_45(_50,sep);break;case dxc.BinaryTree.TraversalMethods.Inorder:s=_47(_50,sep);break;case dxc.BinaryTree.TraversalMethods.Postorder:s=_49(_50,sep);break;}if(s.length==0){return "";}else{return s.substring(0,s.length-sep.length);}};this.count=0;var _50=this.root=null;if(_3e){this.add(_3e);}};dxc.BinaryTree.TraversalMethods={Preorder:1,Inorder:2,Postorder:3};return dxc.BinaryTree;});},"dojox/collections/Stack":function(){define("dojox/collections/Stack",["dojo/_base/kernel","dojo/_base/array","./_base"],function(_5a,_5b,dxc){dxc.Stack=function(arr){var q=[];if(arr){q=q.concat(arr);}this.count=q.length;this.clear=function(){q=[];this.count=q.length;};this.clone=function(){return new dxc.Stack(q);};this.contains=function(o){for(var i=0;i<q.length;i++){if(q[i]==o){return true;}}return false;};this.copyTo=function(arr,i){arr.splice(i,0,q);};this.forEach=function(fn,_5c){_5a.forEach(q,fn,_5c);};this.getIterator=function(){return new dxc.Iterator(q);};this.peek=function(){return q[(q.length-1)];};this.pop=function(){var r=q.pop();this.count=q.length;return r;};this.push=function(o){this.count=q.push(o);};this.toArray=function(){return [].concat(q);};};return dxc.Stack;});},"*noref":1}});define("dojox/_dojox_collections",[],1);require(["dojox/collections","dojox/collections/ArrayList","dojox/collections/BinaryTree","dojox/collections/Dictionary","dojox/collections/Queue","dojox/collections/Set","dojox/collections/SortedList","dojox/collections/Stack"]);
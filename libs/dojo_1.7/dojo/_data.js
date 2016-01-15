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
require({cache:{"dojo/data/util/simpleFetch":function(){define("dojo/data/util/simpleFetch",["../../_base/lang","../../_base/window","./sorter"],function(_1,_2,_3){var _4=_1.getObject("dojo.data.util.simpleFetch",true);_4.fetch=function(_5){_5=_5||{};if(!_5.store){_5.store=this;}var _6=this;var _7=function(_8,_9){if(_9.onError){var _a=_9.scope||_2.global;_9.onError.call(_a,_8,_9);}};var _b=function(_c,_d){var _e=_d.abort||null;var _f=false;var _10=_d.start?_d.start:0;var _11=(_d.count&&(_d.count!==Infinity))?(_10+_d.count):_c.length;_d.abort=function(){_f=true;if(_e){_e.call(_d);}};var _12=_d.scope||_2.global;if(!_d.store){_d.store=_6;}if(_d.onBegin){_d.onBegin.call(_12,_c.length,_d);}if(_d.sort){_c.sort(_3.createSortFunction(_d.sort,_6));}if(_d.onItem){for(var i=_10;(i<_c.length)&&(i<_11);++i){var _13=_c[i];if(!_f){_d.onItem.call(_12,_13,_d);}}}if(_d.onComplete&&!_f){var _14=null;if(!_d.onItem){_14=_c.slice(_10,_11);}_d.onComplete.call(_12,_14,_d);}};this._fetchItems(_5,_b,_7);return _5;};return _4;});},"dojo/data/ItemFileWriteStore":function(){define("dojo/data/ItemFileWriteStore",["../_base/lang","../_base/declare","../_base/array","../_base/json","../_base/window","./ItemFileReadStore","../date/stamp"],function(_15,_16,_17,_18,_19,_1a,_1b){return _16("dojo.data.ItemFileWriteStore",_1a,{constructor:function(_1c){this._features["dojo.data.api.Write"]=true;this._features["dojo.data.api.Notification"]=true;this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};if(!this._datatypeMap["Date"].serialize){this._datatypeMap["Date"].serialize=function(obj){return _1b.toISOString(obj,{zulu:true});};}if(_1c&&(_1c.referenceIntegrity===false)){this.referenceIntegrity=false;}this._saveInProgress=false;},referenceIntegrity:true,_assert:function(_1d){if(!_1d){throw new Error("assertion failed in ItemFileWriteStore");}},_getIdentifierAttribute:function(){return this.getFeatures()["dojo.data.api.Identity"];},newItem:function(_1e,_1f){this._assert(!this._saveInProgress);if(!this._loadFinished){this._forceLoad();}if(typeof _1e!="object"&&typeof _1e!="undefined"){throw new Error("newItem() was passed something other than an object");}var _20=null;var _21=this._getIdentifierAttribute();if(_21===Number){_20=this._arrayOfAllItems.length;}else{_20=_1e[_21];if(typeof _20==="undefined"){throw new Error("newItem() was not passed an identity for the new item");}if(_15.isArray(_20)){throw new Error("newItem() was not passed an single-valued identity");}}if(this._itemsByIdentity){this._assert(typeof this._itemsByIdentity[_20]==="undefined");}this._assert(typeof this._pending._newItems[_20]==="undefined");this._assert(typeof this._pending._deletedItems[_20]==="undefined");var _22={};_22[this._storeRefPropName]=this;_22[this._itemNumPropName]=this._arrayOfAllItems.length;if(this._itemsByIdentity){this._itemsByIdentity[_20]=_22;_22[_21]=[_20];}this._arrayOfAllItems.push(_22);var _23=null;if(_1f&&_1f.parent&&_1f.attribute){_23={item:_1f.parent,attribute:_1f.attribute,oldValue:undefined};var _24=this.getValues(_1f.parent,_1f.attribute);if(_24&&_24.length>0){var _25=_24.slice(0,_24.length);if(_24.length===1){_23.oldValue=_24[0];}else{_23.oldValue=_24.slice(0,_24.length);}_25.push(_22);this._setValueOrValues(_1f.parent,_1f.attribute,_25,false);_23.newValue=this.getValues(_1f.parent,_1f.attribute);}else{this._setValueOrValues(_1f.parent,_1f.attribute,_22,false);_23.newValue=_22;}}else{_22[this._rootItemPropName]=true;this._arrayOfTopLevelItems.push(_22);}this._pending._newItems[_20]=_22;for(var key in _1e){if(key===this._storeRefPropName||key===this._itemNumPropName){throw new Error("encountered bug in ItemFileWriteStore.newItem");}var _26=_1e[key];if(!_15.isArray(_26)){_26=[_26];}_22[key]=_26;if(this.referenceIntegrity){for(var i=0;i<_26.length;i++){var val=_26[i];if(this.isItem(val)){this._addReferenceToMap(val,_22,key);}}}}this.onNew(_22,_23);return _22;},_removeArrayElement:function(_27,_28){var _29=_17.indexOf(_27,_28);if(_29!=-1){_27.splice(_29,1);return true;}return false;},deleteItem:function(_2a){this._assert(!this._saveInProgress);this._assertIsItem(_2a);var _2b=_2a[this._itemNumPropName];var _2c=this.getIdentity(_2a);if(this.referenceIntegrity){var _2d=this.getAttributes(_2a);if(_2a[this._reverseRefMap]){_2a["backup_"+this._reverseRefMap]=_15.clone(_2a[this._reverseRefMap]);}_17.forEach(_2d,function(_2e){_17.forEach(this.getValues(_2a,_2e),function(_2f){if(this.isItem(_2f)){if(!_2a["backupRefs_"+this._reverseRefMap]){_2a["backupRefs_"+this._reverseRefMap]=[];}_2a["backupRefs_"+this._reverseRefMap].push({id:this.getIdentity(_2f),attr:_2e});this._removeReferenceFromMap(_2f,_2a,_2e);}},this);},this);var _30=_2a[this._reverseRefMap];if(_30){for(var _31 in _30){var _32=null;if(this._itemsByIdentity){_32=this._itemsByIdentity[_31];}else{_32=this._arrayOfAllItems[_31];}if(_32){for(var _33 in _30[_31]){var _34=this.getValues(_32,_33)||[];var _35=_17.filter(_34,function(_36){return !(this.isItem(_36)&&this.getIdentity(_36)==_2c);},this);this._removeReferenceFromMap(_2a,_32,_33);if(_35.length<_34.length){this._setValueOrValues(_32,_33,_35,true);}}}}}}this._arrayOfAllItems[_2b]=null;_2a[this._storeRefPropName]=null;if(this._itemsByIdentity){delete this._itemsByIdentity[_2c];}this._pending._deletedItems[_2c]=_2a;if(_2a[this._rootItemPropName]){this._removeArrayElement(this._arrayOfTopLevelItems,_2a);}this.onDelete(_2a);return true;},setValue:function(_37,_38,_39){return this._setValueOrValues(_37,_38,_39,true);},setValues:function(_3a,_3b,_3c){return this._setValueOrValues(_3a,_3b,_3c,true);},unsetAttribute:function(_3d,_3e){return this._setValueOrValues(_3d,_3e,[],true);},_setValueOrValues:function(_3f,_40,_41,_42){this._assert(!this._saveInProgress);this._assertIsItem(_3f);this._assert(_15.isString(_40));this._assert(typeof _41!=="undefined");var _43=this._getIdentifierAttribute();if(_40==_43){throw new Error("ItemFileWriteStore does not have support for changing the value of an item's identifier.");}var _44=this._getValueOrValues(_3f,_40);var _45=this.getIdentity(_3f);if(!this._pending._modifiedItems[_45]){var _46={};for(var key in _3f){if((key===this._storeRefPropName)||(key===this._itemNumPropName)||(key===this._rootItemPropName)){_46[key]=_3f[key];}else{if(key===this._reverseRefMap){_46[key]=_15.clone(_3f[key]);}else{_46[key]=_3f[key].slice(0,_3f[key].length);}}}this._pending._modifiedItems[_45]=_46;}var _47=false;if(_15.isArray(_41)&&_41.length===0){_47=delete _3f[_40];_41=undefined;if(this.referenceIntegrity&&_44){var _48=_44;if(!_15.isArray(_48)){_48=[_48];}for(var i=0;i<_48.length;i++){var _49=_48[i];if(this.isItem(_49)){this._removeReferenceFromMap(_49,_3f,_40);}}}}else{var _4a;if(_15.isArray(_41)){_4a=_41.slice(0,_41.length);}else{_4a=[_41];}if(this.referenceIntegrity){if(_44){var _48=_44;if(!_15.isArray(_48)){_48=[_48];}var map={};_17.forEach(_48,function(_4b){if(this.isItem(_4b)){var id=this.getIdentity(_4b);map[id.toString()]=true;}},this);_17.forEach(_4a,function(_4c){if(this.isItem(_4c)){var id=this.getIdentity(_4c);if(map[id.toString()]){delete map[id.toString()];}else{this._addReferenceToMap(_4c,_3f,_40);}}},this);for(var rId in map){var _4d;if(this._itemsByIdentity){_4d=this._itemsByIdentity[rId];}else{_4d=this._arrayOfAllItems[rId];}this._removeReferenceFromMap(_4d,_3f,_40);}}else{for(var i=0;i<_4a.length;i++){var _49=_4a[i];if(this.isItem(_49)){this._addReferenceToMap(_49,_3f,_40);}}}}_3f[_40]=_4a;_47=true;}if(_42){this.onSet(_3f,_40,_44,_41);}return _47;},_addReferenceToMap:function(_4e,_4f,_50){var _51=this.getIdentity(_4f);var _52=_4e[this._reverseRefMap];if(!_52){_52=_4e[this._reverseRefMap]={};}var _53=_52[_51];if(!_53){_53=_52[_51]={};}_53[_50]=true;},_removeReferenceFromMap:function(_54,_55,_56){var _57=this.getIdentity(_55);var _58=_54[this._reverseRefMap];var _59;if(_58){for(_59 in _58){if(_59==_57){delete _58[_59][_56];if(this._isEmpty(_58[_59])){delete _58[_59];}}}if(this._isEmpty(_58)){delete _54[this._reverseRefMap];}}},_dumpReferenceMap:function(){var i;for(i=0;i<this._arrayOfAllItems.length;i++){var _5a=this._arrayOfAllItems[i];if(_5a&&_5a[this._reverseRefMap]){}}},_getValueOrValues:function(_5b,_5c){var _5d=undefined;if(this.hasAttribute(_5b,_5c)){var _5e=this.getValues(_5b,_5c);if(_5e.length==1){_5d=_5e[0];}else{_5d=_5e;}}return _5d;},_flatten:function(_5f){if(this.isItem(_5f)){return {_reference:this.getIdentity(_5f)};}else{if(typeof _5f==="object"){for(var _60 in this._datatypeMap){var _61=this._datatypeMap[_60];if(_15.isObject(_61)&&!_15.isFunction(_61)){if(_5f instanceof _61.type){if(!_61.serialize){throw new Error("ItemFileWriteStore:  No serializer defined for type mapping: ["+_60+"]");}return {_type:_60,_value:_61.serialize(_5f)};}}else{if(_5f instanceof _61){return {_type:_60,_value:_5f.toString()};}}}}return _5f;}},_getNewFileContentString:function(){var _62={};var _63=this._getIdentifierAttribute();if(_63!==Number){_62.identifier=_63;}if(this._labelAttr){_62.label=this._labelAttr;}_62.items=[];for(var i=0;i<this._arrayOfAllItems.length;++i){var _64=this._arrayOfAllItems[i];if(_64!==null){var _65={};for(var key in _64){if(key!==this._storeRefPropName&&key!==this._itemNumPropName&&key!==this._reverseRefMap&&key!==this._rootItemPropName){var _66=this.getValues(_64,key);if(_66.length==1){_65[key]=this._flatten(_66[0]);}else{var _67=[];for(var j=0;j<_66.length;++j){_67.push(this._flatten(_66[j]));_65[key]=_67;}}}}_62.items.push(_65);}}var _68=true;return _18.toJson(_62,_68);},_isEmpty:function(_69){var _6a=true;if(_15.isObject(_69)){var i;for(i in _69){_6a=false;break;}}else{if(_15.isArray(_69)){if(_69.length>0){_6a=false;}}}return _6a;},save:function(_6b){this._assert(!this._saveInProgress);this._saveInProgress=true;var _6c=this;var _6d=function(){_6c._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};_6c._saveInProgress=false;if(_6b&&_6b.onComplete){var _6e=_6b.scope||_19.global;_6b.onComplete.call(_6e);}};var _6f=function(err){_6c._saveInProgress=false;if(_6b&&_6b.onError){var _70=_6b.scope||_19.global;_6b.onError.call(_70,err);}};if(this._saveEverything){var _71=this._getNewFileContentString();this._saveEverything(_6d,_6f,_71);}if(this._saveCustom){this._saveCustom(_6d,_6f);}if(!this._saveEverything&&!this._saveCustom){_6d();}},revert:function(){this._assert(!this._saveInProgress);var _72;for(_72 in this._pending._modifiedItems){var _73=this._pending._modifiedItems[_72];var _74=null;if(this._itemsByIdentity){_74=this._itemsByIdentity[_72];}else{_74=this._arrayOfAllItems[_72];}_73[this._storeRefPropName]=this;for(var key in _74){delete _74[key];}_15.mixin(_74,_73);}var _75;for(_72 in this._pending._deletedItems){_75=this._pending._deletedItems[_72];_75[this._storeRefPropName]=this;var _76=_75[this._itemNumPropName];if(_75["backup_"+this._reverseRefMap]){_75[this._reverseRefMap]=_75["backup_"+this._reverseRefMap];delete _75["backup_"+this._reverseRefMap];}this._arrayOfAllItems[_76]=_75;if(this._itemsByIdentity){this._itemsByIdentity[_72]=_75;}if(_75[this._rootItemPropName]){this._arrayOfTopLevelItems.push(_75);}}for(_72 in this._pending._deletedItems){_75=this._pending._deletedItems[_72];if(_75["backupRefs_"+this._reverseRefMap]){_17.forEach(_75["backupRefs_"+this._reverseRefMap],function(_77){var _78;if(this._itemsByIdentity){_78=this._itemsByIdentity[_77.id];}else{_78=this._arrayOfAllItems[_77.id];}this._addReferenceToMap(_78,_75,_77.attr);},this);delete _75["backupRefs_"+this._reverseRefMap];}}for(_72 in this._pending._newItems){var _79=this._pending._newItems[_72];_79[this._storeRefPropName]=null;this._arrayOfAllItems[_79[this._itemNumPropName]]=null;if(_79[this._rootItemPropName]){this._removeArrayElement(this._arrayOfTopLevelItems,_79);}if(this._itemsByIdentity){delete this._itemsByIdentity[_72];}}this._pending={_newItems:{},_modifiedItems:{},_deletedItems:{}};return true;},isDirty:function(_7a){if(_7a){var _7b=this.getIdentity(_7a);return new Boolean(this._pending._newItems[_7b]||this._pending._modifiedItems[_7b]||this._pending._deletedItems[_7b]).valueOf();}else{return !this._isEmpty(this._pending._newItems)||!this._isEmpty(this._pending._modifiedItems)||!this._isEmpty(this._pending._deletedItems);}},onSet:function(_7c,_7d,_7e,_7f){},onNew:function(_80,_81){},onDelete:function(_82){},close:function(_83){if(this.clearOnClose){if(!this.isDirty()){this.inherited(arguments);}else{throw new Error("dojo.data.ItemFileWriteStore: There are unsaved changes present in the store.  Please save or revert the changes before invoking close.");}}}});});},"dojo/data/util/sorter":function(){define("dojo/data/util/sorter",["../../_base/lang"],function(_84){var _85=_84.getObject("dojo.data.util.sorter",true);_85.basicComparator=function(a,b){var r=-1;if(a===null){a=undefined;}if(b===null){b=undefined;}if(a==b){r=0;}else{if(a>b||a==null){r=1;}}return r;};_85.createSortFunction=function(_86,_87){var _88=[];function _89(_8a,dir,_8b,s){return function(_8c,_8d){var a=s.getValue(_8c,_8a);var b=s.getValue(_8d,_8a);return dir*_8b(a,b);};};var _8e;var map=_87.comparatorMap;var bc=_85.basicComparator;for(var i=0;i<_86.length;i++){_8e=_86[i];var _8f=_8e.attribute;if(_8f){var dir=(_8e.descending)?-1:1;var _90=bc;if(map){if(typeof _8f!=="string"&&("toString" in _8f)){_8f=_8f.toString();}_90=map[_8f]||bc;}_88.push(_89(_8f,dir,_90,_87));}}return function(_91,_92){var i=0;while(i<_88.length){var ret=_88[i++](_91,_92);if(ret!==0){return ret;}}return 0;};};return _85;});},"dojo/data/util/filter":function(){define("dojo/data/util/filter",["../../_base/lang"],function(_93){var _94=_93.getObject("dojo.data.util.filter",true);_94.patternToRegExp=function(_95,_96){var rxp="^";var c=null;for(var i=0;i<_95.length;i++){c=_95.charAt(i);switch(c){case "\\":rxp+=c;i++;rxp+=_95.charAt(i);break;case "*":rxp+=".*";break;case "?":rxp+=".";break;case "$":case "^":case "/":case "+":case ".":case "|":case "(":case ")":case "{":case "}":case "[":case "]":rxp+="\\";default:rxp+=c;}}rxp+="$";if(_96){return new RegExp(rxp,"mi");}else{return new RegExp(rxp,"m");}};return _94;});},"dojo/data/ItemFileReadStore":function(){define("dojo/data/ItemFileReadStore",["../_base/kernel","../_base/lang","../_base/declare","../_base/array","../_base/xhr","../Evented","../_base/window","./util/filter","./util/simpleFetch","../date/stamp"],function(_97,_98,_99,_9a,xhr,_9b,_9c,_9d,_9e,_9f){var _a0=_99("dojo.data.ItemFileReadStore",[_9b],{constructor:function(_a1){this._arrayOfAllItems=[];this._arrayOfTopLevelItems=[];this._loadFinished=false;this._jsonFileUrl=_a1.url;this._ccUrl=_a1.url;this.url=_a1.url;this._jsonData=_a1.data;this.data=null;this._datatypeMap=_a1.typeMap||{};if(!this._datatypeMap["Date"]){this._datatypeMap["Date"]={type:Date,deserialize:function(_a2){return _9f.fromISOString(_a2);}};}this._features={"dojo.data.api.Read":true,"dojo.data.api.Identity":true};this._itemsByIdentity=null;this._storeRefPropName="_S";this._itemNumPropName="_0";this._rootItemPropName="_RI";this._reverseRefMap="_RRM";this._loadInProgress=false;this._queuedFetches=[];if(_a1.urlPreventCache!==undefined){this.urlPreventCache=_a1.urlPreventCache?true:false;}if(_a1.hierarchical!==undefined){this.hierarchical=_a1.hierarchical?true:false;}if(_a1.clearOnClose){this.clearOnClose=true;}if("failOk" in _a1){this.failOk=_a1.failOk?true:false;}},url:"",_ccUrl:"",data:null,typeMap:null,clearOnClose:false,urlPreventCache:false,failOk:false,hierarchical:true,_assertIsItem:function(_a3){if(!this.isItem(_a3)){throw new Error("dojo.data.ItemFileReadStore: Invalid item argument.");}},_assertIsAttribute:function(_a4){if(typeof _a4!=="string"){throw new Error("dojo.data.ItemFileReadStore: Invalid attribute argument.");}},getValue:function(_a5,_a6,_a7){var _a8=this.getValues(_a5,_a6);return (_a8.length>0)?_a8[0]:_a7;},getValues:function(_a9,_aa){this._assertIsItem(_a9);this._assertIsAttribute(_aa);return (_a9[_aa]||[]).slice(0);},getAttributes:function(_ab){this._assertIsItem(_ab);var _ac=[];for(var key in _ab){if((key!==this._storeRefPropName)&&(key!==this._itemNumPropName)&&(key!==this._rootItemPropName)&&(key!==this._reverseRefMap)){_ac.push(key);}}return _ac;},hasAttribute:function(_ad,_ae){this._assertIsItem(_ad);this._assertIsAttribute(_ae);return (_ae in _ad);},containsValue:function(_af,_b0,_b1){var _b2=undefined;if(typeof _b1==="string"){_b2=_9d.patternToRegExp(_b1,false);}return this._containsValue(_af,_b0,_b1,_b2);},_containsValue:function(_b3,_b4,_b5,_b6){return _9a.some(this.getValues(_b3,_b4),function(_b7){if(_b7!==null&&!_98.isObject(_b7)&&_b6){if(_b7.toString().match(_b6)){return true;}}else{if(_b5===_b7){return true;}}});},isItem:function(_b8){if(_b8&&_b8[this._storeRefPropName]===this){if(this._arrayOfAllItems[_b8[this._itemNumPropName]]===_b8){return true;}}return false;},isItemLoaded:function(_b9){return this.isItem(_b9);},loadItem:function(_ba){this._assertIsItem(_ba.item);},getFeatures:function(){return this._features;},getLabel:function(_bb){if(this._labelAttr&&this.isItem(_bb)){return this.getValue(_bb,this._labelAttr);}return undefined;},getLabelAttributes:function(_bc){if(this._labelAttr){return [this._labelAttr];}return null;},_fetchItems:function(_bd,_be,_bf){var _c0=this,_c1=function(_c2,_c3){var _c4=[],i,key;if(_c2.query){var _c5,_c6=_c2.queryOptions?_c2.queryOptions.ignoreCase:false;var _c7={};for(key in _c2.query){_c5=_c2.query[key];if(typeof _c5==="string"){_c7[key]=_9d.patternToRegExp(_c5,_c6);}else{if(_c5 instanceof RegExp){_c7[key]=_c5;}}}for(i=0;i<_c3.length;++i){var _c8=true;var _c9=_c3[i];if(_c9===null){_c8=false;}else{for(key in _c2.query){_c5=_c2.query[key];if(!_c0._containsValue(_c9,key,_c5,_c7[key])){_c8=false;}}}if(_c8){_c4.push(_c9);}}_be(_c4,_c2);}else{for(i=0;i<_c3.length;++i){var _ca=_c3[i];if(_ca!==null){_c4.push(_ca);}}_be(_c4,_c2);}};if(this._loadFinished){_c1(_bd,this._getItemsArray(_bd.queryOptions));}else{if(this._jsonFileUrl!==this._ccUrl){_97.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");this._ccUrl=this._jsonFileUrl;this.url=this._jsonFileUrl;}else{if(this.url!==this._ccUrl){this._jsonFileUrl=this.url;this._ccUrl=this.url;}}if(this.data!=null){this._jsonData=this.data;this.data=null;}if(this._jsonFileUrl){if(this._loadInProgress){this._queuedFetches.push({args:_bd,filter:_c1});}else{this._loadInProgress=true;var _cb={url:_c0._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};var _cc=xhr.get(_cb);_cc.addCallback(function(_cd){try{_c0._getItemsFromLoadedData(_cd);_c0._loadFinished=true;_c0._loadInProgress=false;_c1(_bd,_c0._getItemsArray(_bd.queryOptions));_c0._handleQueuedFetches();}catch(e){_c0._loadFinished=true;_c0._loadInProgress=false;_bf(e,_bd);}});_cc.addErrback(function(_ce){_c0._loadInProgress=false;_bf(_ce,_bd);});var _cf=null;if(_bd.abort){_cf=_bd.abort;}_bd.abort=function(){var df=_cc;if(df&&df.fired===-1){df.cancel();df=null;}if(_cf){_cf.call(_bd);}};}}else{if(this._jsonData){try{this._loadFinished=true;this._getItemsFromLoadedData(this._jsonData);this._jsonData=null;_c1(_bd,this._getItemsArray(_bd.queryOptions));}catch(e){_bf(e,_bd);}}else{_bf(new Error("dojo.data.ItemFileReadStore: No JSON source data was provided as either URL or a nested Javascript object."),_bd);}}}},_handleQueuedFetches:function(){if(this._queuedFetches.length>0){for(var i=0;i<this._queuedFetches.length;i++){var _d0=this._queuedFetches[i],_d1=_d0.args,_d2=_d0.filter;if(_d2){_d2(_d1,this._getItemsArray(_d1.queryOptions));}else{this.fetchItemByIdentity(_d1);}}this._queuedFetches=[];}},_getItemsArray:function(_d3){if(_d3&&_d3.deep){return this._arrayOfAllItems;}return this._arrayOfTopLevelItems;},close:function(_d4){if(this.clearOnClose&&this._loadFinished&&!this._loadInProgress){if(((this._jsonFileUrl==""||this._jsonFileUrl==null)&&(this.url==""||this.url==null))&&this.data==null){}this._arrayOfAllItems=[];this._arrayOfTopLevelItems=[];this._loadFinished=false;this._itemsByIdentity=null;this._loadInProgress=false;this._queuedFetches=[];}},_getItemsFromLoadedData:function(_d5){var _d6=false,_d7=this;function _d8(_d9){return (_d9!==null)&&(typeof _d9==="object")&&(!_98.isArray(_d9)||_d6)&&(!_98.isFunction(_d9))&&(_d9.constructor==Object||_98.isArray(_d9))&&(typeof _d9._reference==="undefined")&&(typeof _d9._type==="undefined")&&(typeof _d9._value==="undefined")&&_d7.hierarchical;};function _da(_db){_d7._arrayOfAllItems.push(_db);for(var _dc in _db){var _dd=_db[_dc];if(_dd){if(_98.isArray(_dd)){var _de=_dd;for(var k=0;k<_de.length;++k){var _df=_de[k];if(_d8(_df)){_da(_df);}}}else{if(_d8(_dd)){_da(_dd);}}}}};this._labelAttr=_d5.label;var i,_e0;this._arrayOfAllItems=[];this._arrayOfTopLevelItems=_d5.items;for(i=0;i<this._arrayOfTopLevelItems.length;++i){_e0=this._arrayOfTopLevelItems[i];if(_98.isArray(_e0)){_d6=true;}_da(_e0);_e0[this._rootItemPropName]=true;}var _e1={},key;for(i=0;i<this._arrayOfAllItems.length;++i){_e0=this._arrayOfAllItems[i];for(key in _e0){if(key!==this._rootItemPropName){var _e2=_e0[key];if(_e2!==null){if(!_98.isArray(_e2)){_e0[key]=[_e2];}}else{_e0[key]=[null];}}_e1[key]=key;}}while(_e1[this._storeRefPropName]){this._storeRefPropName+="_";}while(_e1[this._itemNumPropName]){this._itemNumPropName+="_";}while(_e1[this._reverseRefMap]){this._reverseRefMap+="_";}var _e3;var _e4=_d5.identifier;if(_e4){this._itemsByIdentity={};this._features["dojo.data.api.Identity"]=_e4;for(i=0;i<this._arrayOfAllItems.length;++i){_e0=this._arrayOfAllItems[i];_e3=_e0[_e4];var _e5=_e3[0];if(!Object.hasOwnProperty.call(this._itemsByIdentity,_e5)){this._itemsByIdentity[_e5]=_e0;}else{if(this._jsonFileUrl){throw new Error("dojo.data.ItemFileReadStore:  The json data as specified by: ["+this._jsonFileUrl+"] is malformed.  Items within the list have identifier: ["+_e4+"].  Value collided: ["+_e5+"]");}else{if(this._jsonData){throw new Error("dojo.data.ItemFileReadStore:  The json data provided by the creation arguments is malformed.  Items within the list have identifier: ["+_e4+"].  Value collided: ["+_e5+"]");}}}}}else{this._features["dojo.data.api.Identity"]=Number;}for(i=0;i<this._arrayOfAllItems.length;++i){_e0=this._arrayOfAllItems[i];_e0[this._storeRefPropName]=this;_e0[this._itemNumPropName]=i;}for(i=0;i<this._arrayOfAllItems.length;++i){_e0=this._arrayOfAllItems[i];for(key in _e0){_e3=_e0[key];for(var j=0;j<_e3.length;++j){_e2=_e3[j];if(_e2!==null&&typeof _e2=="object"){if(("_type" in _e2)&&("_value" in _e2)){var _e6=_e2._type;var _e7=this._datatypeMap[_e6];if(!_e7){throw new Error("dojo.data.ItemFileReadStore: in the typeMap constructor arg, no object class was specified for the datatype '"+_e6+"'");}else{if(_98.isFunction(_e7)){_e3[j]=new _e7(_e2._value);}else{if(_98.isFunction(_e7.deserialize)){_e3[j]=_e7.deserialize(_e2._value);}else{throw new Error("dojo.data.ItemFileReadStore: Value provided in typeMap was neither a constructor, nor a an object with a deserialize function");}}}}if(_e2._reference){var _e8=_e2._reference;if(!_98.isObject(_e8)){_e3[j]=this._getItemByIdentity(_e8);}else{for(var k=0;k<this._arrayOfAllItems.length;++k){var _e9=this._arrayOfAllItems[k],_ea=true;for(var _eb in _e8){if(_e9[_eb]!=_e8[_eb]){_ea=false;}}if(_ea){_e3[j]=_e9;}}}if(this.referenceIntegrity){var _ec=_e3[j];if(this.isItem(_ec)){this._addReferenceToMap(_ec,_e0,key);}}}else{if(this.isItem(_e2)){if(this.referenceIntegrity){this._addReferenceToMap(_e2,_e0,key);}}}}}}}},_addReferenceToMap:function(_ed,_ee,_ef){},getIdentity:function(_f0){var _f1=this._features["dojo.data.api.Identity"];if(_f1===Number){return _f0[this._itemNumPropName];}else{var _f2=_f0[_f1];if(_f2){return _f2[0];}}return null;},fetchItemByIdentity:function(_f3){var _f4,_f5;if(!this._loadFinished){var _f6=this;if(this._jsonFileUrl!==this._ccUrl){_97.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");this._ccUrl=this._jsonFileUrl;this.url=this._jsonFileUrl;}else{if(this.url!==this._ccUrl){this._jsonFileUrl=this.url;this._ccUrl=this.url;}}if(this.data!=null&&this._jsonData==null){this._jsonData=this.data;this.data=null;}if(this._jsonFileUrl){if(this._loadInProgress){this._queuedFetches.push({args:_f3});}else{this._loadInProgress=true;var _f7={url:_f6._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk};var _f8=xhr.get(_f7);_f8.addCallback(function(_f9){var _fa=_f3.scope?_f3.scope:_9c.global;try{_f6._getItemsFromLoadedData(_f9);_f6._loadFinished=true;_f6._loadInProgress=false;_f4=_f6._getItemByIdentity(_f3.identity);if(_f3.onItem){_f3.onItem.call(_fa,_f4);}_f6._handleQueuedFetches();}catch(error){_f6._loadInProgress=false;if(_f3.onError){_f3.onError.call(_fa,error);}}});_f8.addErrback(function(_fb){_f6._loadInProgress=false;if(_f3.onError){var _fc=_f3.scope?_f3.scope:_9c.global;_f3.onError.call(_fc,_fb);}});}}else{if(this._jsonData){_f6._getItemsFromLoadedData(_f6._jsonData);_f6._jsonData=null;_f6._loadFinished=true;_f4=_f6._getItemByIdentity(_f3.identity);if(_f3.onItem){_f5=_f3.scope?_f3.scope:_9c.global;_f3.onItem.call(_f5,_f4);}}}}else{_f4=this._getItemByIdentity(_f3.identity);if(_f3.onItem){_f5=_f3.scope?_f3.scope:_9c.global;_f3.onItem.call(_f5,_f4);}}},_getItemByIdentity:function(_fd){var _fe=null;if(this._itemsByIdentity){if(Object.hasOwnProperty.call(this._itemsByIdentity,_fd)){_fe=this._itemsByIdentity[_fd];}}else{if(Object.hasOwnProperty.call(this._arrayOfAllItems,_fd)){_fe=this._arrayOfAllItems[_fd];}}if(_fe===undefined){_fe=null;}return _fe;},getIdentityAttributes:function(_ff){var _100=this._features["dojo.data.api.Identity"];if(_100===Number){return null;}else{return [_100];}},_forceLoad:function(){var self=this;if(this._jsonFileUrl!==this._ccUrl){_97.deprecated("dojo.data.ItemFileReadStore: ","To change the url, set the url property of the store,"+" not _jsonFileUrl.  _jsonFileUrl support will be removed in 2.0");this._ccUrl=this._jsonFileUrl;this.url=this._jsonFileUrl;}else{if(this.url!==this._ccUrl){this._jsonFileUrl=this.url;this._ccUrl=this.url;}}if(this.data!=null){this._jsonData=this.data;this.data=null;}if(this._jsonFileUrl){var _101={url:this._jsonFileUrl,handleAs:"json-comment-optional",preventCache:this.urlPreventCache,failOk:this.failOk,sync:true};var _102=xhr.get(_101);_102.addCallback(function(data){try{if(self._loadInProgress!==true&&!self._loadFinished){self._getItemsFromLoadedData(data);self._loadFinished=true;}else{if(self._loadInProgress){throw new Error("dojo.data.ItemFileReadStore:  Unable to perform a synchronous load, an async load is in progress.");}}}catch(e){throw e;}});_102.addErrback(function(_103){throw _103;});}else{if(this._jsonData){self._getItemsFromLoadedData(self._jsonData);self._jsonData=null;self._loadFinished=true;}}}});_98.extend(_a0,_9e);return _a0;});},"dojo/date/stamp":function(){define("dojo/date/stamp",["../_base/kernel","../_base/lang","../_base/array"],function(dojo,lang,_104){lang.getObject("date.stamp",true,dojo);dojo.date.stamp.fromISOString=function(_105,_106){if(!dojo.date.stamp._isoRegExp){dojo.date.stamp._isoRegExp=/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;}var _107=dojo.date.stamp._isoRegExp.exec(_105),_108=null;if(_107){_107.shift();if(_107[1]){_107[1]--;}if(_107[6]){_107[6]*=1000;}if(_106){_106=new Date(_106);_104.forEach(_104.map(["FullYear","Month","Date","Hours","Minutes","Seconds","Milliseconds"],function(prop){return _106["get"+prop]();}),function(_109,_10a){_107[_10a]=_107[_10a]||_109;});}_108=new Date(_107[0]||1970,_107[1]||0,_107[2]||1,_107[3]||0,_107[4]||0,_107[5]||0,_107[6]||0);if(_107[0]<100){_108.setFullYear(_107[0]||1970);}var _10b=0,_10c=_107[7]&&_107[7].charAt(0);if(_10c!="Z"){_10b=((_107[8]||0)*60)+(Number(_107[9])||0);if(_10c!="-"){_10b*=-1;}}if(_10c){_10b-=_108.getTimezoneOffset();}if(_10b){_108.setTime(_108.getTime()+_10b*60000);}}return _108;};dojo.date.stamp.toISOString=function(_10d,_10e){var _10f=function(n){return (n<10)?"0"+n:n;};_10e=_10e||{};var _110=[],_111=_10e.zulu?"getUTC":"get",date="";if(_10e.selector!="time"){var year=_10d[_111+"FullYear"]();date=["0000".substr((year+"").length)+year,_10f(_10d[_111+"Month"]()+1),_10f(_10d[_111+"Date"]())].join("-");}_110.push(date);if(_10e.selector!="date"){var time=[_10f(_10d[_111+"Hours"]()),_10f(_10d[_111+"Minutes"]()),_10f(_10d[_111+"Seconds"]())].join(":");var _112=_10d[_111+"Milliseconds"]();if(_10e.milliseconds){time+="."+(_112<100?"0":"")+_10f(_112);}if(_10e.zulu){time+="Z";}else{if(_10e.selector!="time"){var _113=_10d.getTimezoneOffset();var _114=Math.abs(_113);time+=(_113>0?"-":"+")+_10f(Math.floor(_114/60))+":"+_10f(_114%60);}}_110.push(time);}return _110.join("T");};return dojo.date.stamp;});},"*noref":1}});define("dojo/_data",[],1);require(["dojo/data/ItemFileReadStore","dojo/data/ItemFileWriteStore","dojo/data/util/simpleFetch","dojo/data/util/sorter","dojo/data/util/filter"]);
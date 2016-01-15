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
require({cache:{"dojox/string/tokenize":function(){define("dojox/string/tokenize",["dojo/_base/lang","dojo/_base/sniff"],function(_1,_2){var _3=_1.getObject("dojox.string",true).tokenize;_3=function(_4,re,_5,_6){var _7=[];var _8,_9,_a=0;while(_8=re.exec(_4)){_9=_4.slice(_a,re.lastIndex-_8[0].length);if(_9.length){_7.push(_9);}if(_5){if(_2("opera")){var _b=_8.slice(0);while(_b.length<_8.length){_b.push(null);}_8=_b;}var _c=_5.apply(_6,_8.slice(1).concat(_7.length));if(typeof _c!="undefined"){_7.push(_c);}}_a=re.lastIndex;}_9=_4.slice(_a);if(_9.length){_7.push(_9);}return _7;};return _3;});},"dojox/string/Builder":function(){define("dojox/string/Builder",["dojo/_base/lang"],function(_d){_d.getObject("string",true,dojox).Builder=function(_e){var b="";this.length=0;this.append=function(s){if(arguments.length>1){var _f="",l=arguments.length;switch(l){case 9:_f=""+arguments[8]+_f;case 8:_f=""+arguments[7]+_f;case 7:_f=""+arguments[6]+_f;case 6:_f=""+arguments[5]+_f;case 5:_f=""+arguments[4]+_f;case 4:_f=""+arguments[3]+_f;case 3:_f=""+arguments[2]+_f;case 2:b+=""+arguments[0]+arguments[1]+_f;break;default:var i=0;while(i<arguments.length){_f+=arguments[i++];}b+=_f;}}else{b+=s;}this.length=b.length;return this;};this.concat=function(s){return this.append.apply(this,arguments);};this.appendArray=function(_10){return this.append.apply(this,_10);};this.clear=function(){b="";this.length=0;return this;};this.replace=function(_11,_12){b=b.replace(_11,_12);this.length=b.length;return this;};this.remove=function(_13,len){if(len===undefined){len=b.length;}if(len==0){return this;}b=b.substr(0,_13)+b.substr(_13+len);this.length=b.length;return this;};this.insert=function(_14,str){if(_14==0){b=str+b;}else{b=b.slice(0,_14)+str+b.slice(_14);}this.length=b.length;return this;};this.toString=function(){return b;};if(_e){this.append(_e);}};return dojox.string.Builder;});},"dojox/string/sprintf":function(){define("dojox/string/sprintf",["dojo/_base/kernel","dojo/_base/lang","dojo/_base/sniff","./tokenize"],function(_15,_16,has,_17){var _18=_16.getObject("string",true,dojox);_18.sprintf=function(_19,_1a){for(var _1b=[],i=1;i<arguments.length;i++){_1b.push(arguments[i]);}var _1c=new _18.sprintf.Formatter(_19);return _1c.format.apply(_1c,_1b);};_18.sprintf.Formatter=function(_1d){var _1e=[];this._mapped=false;this._format=_1d;this._tokens=_17(_1d,this._re,this._parseDelim,this);};_16.extend(_18.sprintf.Formatter,{_re:/\%(?:\(([\w_]+)\)|([1-9]\d*)\$)?([0 +\-\#]*)(\*|\d+)?(\.)?(\*|\d+)?[hlL]?([\%scdeEfFgGiouxX])/g,_parseDelim:function(_1f,_20,_21,_22,_23,_24,_25){if(_1f){this._mapped=true;}return {mapping:_1f,intmapping:_20,flags:_21,_minWidth:_22,period:_23,_precision:_24,specifier:_25};},_specifiers:{b:{base:2,isInt:true},o:{base:8,isInt:true},x:{base:16,isInt:true},X:{extend:["x"],toUpper:true},d:{base:10,isInt:true},i:{extend:["d"]},u:{extend:["d"],isUnsigned:true},c:{setArg:function(_26){if(!isNaN(_26.arg)){var num=parseInt(_26.arg);if(num<0||num>127){throw new Error("invalid character code passed to %c in sprintf");}_26.arg=isNaN(num)?""+num:String.fromCharCode(num);}}},s:{setMaxWidth:function(_27){_27.maxWidth=(_27.period==".")?_27.precision:-1;}},e:{isDouble:true,doubleNotation:"e"},E:{extend:["e"],toUpper:true},f:{isDouble:true,doubleNotation:"f"},F:{extend:["f"]},g:{isDouble:true,doubleNotation:"g"},G:{extend:["g"],toUpper:true}},format:function(_28){if(this._mapped&&typeof _28!="object"){throw new Error("format requires a mapping");}var str="";var _29=0;for(var i=0,_2a;i<this._tokens.length;i++){_2a=this._tokens[i];if(typeof _2a=="string"){str+=_2a;}else{if(this._mapped){if(typeof _28[_2a.mapping]=="undefined"){throw new Error("missing key "+_2a.mapping);}_2a.arg=_28[_2a.mapping];}else{if(_2a.intmapping){var _29=parseInt(_2a.intmapping)-1;}if(_29>=arguments.length){throw new Error("got "+arguments.length+" printf arguments, insufficient for '"+this._format+"'");}_2a.arg=arguments[_29++];}if(!_2a.compiled){_2a.compiled=true;_2a.sign="";_2a.zeroPad=false;_2a.rightJustify=false;_2a.alternative=false;var _2b={};for(var fi=_2a.flags.length;fi--;){var _2c=_2a.flags.charAt(fi);_2b[_2c]=true;switch(_2c){case " ":_2a.sign=" ";break;case "+":_2a.sign="+";break;case "0":_2a.zeroPad=(_2b["-"])?false:true;break;case "-":_2a.rightJustify=true;_2a.zeroPad=false;break;case "#":_2a.alternative=true;break;default:throw Error("bad formatting flag '"+_2a.flags.charAt(fi)+"'");}}_2a.minWidth=(_2a._minWidth)?parseInt(_2a._minWidth):0;_2a.maxWidth=-1;_2a.toUpper=false;_2a.isUnsigned=false;_2a.isInt=false;_2a.isDouble=false;_2a.precision=1;if(_2a.period=="."){if(_2a._precision){_2a.precision=parseInt(_2a._precision);}else{_2a.precision=0;}}var _2d=this._specifiers[_2a.specifier];if(typeof _2d=="undefined"){throw new Error("unexpected specifier '"+_2a.specifier+"'");}if(_2d.extend){_16.mixin(_2d,this._specifiers[_2d.extend]);delete _2d.extend;}_16.mixin(_2a,_2d);}if(typeof _2a.setArg=="function"){_2a.setArg(_2a);}if(typeof _2a.setMaxWidth=="function"){_2a.setMaxWidth(_2a);}if(_2a._minWidth=="*"){if(this._mapped){throw new Error("* width not supported in mapped formats");}_2a.minWidth=parseInt(arguments[_29++]);if(isNaN(_2a.minWidth)){throw new Error("the argument for * width at position "+_29+" is not a number in "+this._format);}if(_2a.minWidth<0){_2a.rightJustify=true;_2a.minWidth=-_2a.minWidth;}}if(_2a._precision=="*"&&_2a.period=="."){if(this._mapped){throw new Error("* precision not supported in mapped formats");}_2a.precision=parseInt(arguments[_29++]);if(isNaN(_2a.precision)){throw Error("the argument for * precision at position "+_29+" is not a number in "+this._format);}if(_2a.precision<0){_2a.precision=1;_2a.period="";}}if(_2a.isInt){if(_2a.period=="."){_2a.zeroPad=false;}this.formatInt(_2a);}else{if(_2a.isDouble){if(_2a.period!="."){_2a.precision=6;}this.formatDouble(_2a);}}this.fitField(_2a);str+=""+_2a.arg;}}return str;},_zeros10:"0000000000",_spaces10:"          ",formatInt:function(_2e){var i=parseInt(_2e.arg);if(!isFinite(i)){if(typeof _2e.arg!="number"){throw new Error("format argument '"+_2e.arg+"' not an integer; parseInt returned "+i);}i=0;}if(i<0&&(_2e.isUnsigned||_2e.base!=10)){i=4294967295+i+1;}if(i<0){_2e.arg=(-i).toString(_2e.base);this.zeroPad(_2e);_2e.arg="-"+_2e.arg;}else{_2e.arg=i.toString(_2e.base);if(!i&&!_2e.precision){_2e.arg="";}else{this.zeroPad(_2e);}if(_2e.sign){_2e.arg=_2e.sign+_2e.arg;}}if(_2e.base==16){if(_2e.alternative){_2e.arg="0x"+_2e.arg;}_2e.arg=_2e.toUpper?_2e.arg.toUpperCase():_2e.arg.toLowerCase();}if(_2e.base==8){if(_2e.alternative&&_2e.arg.charAt(0)!="0"){_2e.arg="0"+_2e.arg;}}},formatDouble:function(_2f){var f=parseFloat(_2f.arg);if(!isFinite(f)){if(typeof _2f.arg!="number"){throw new Error("format argument '"+_2f.arg+"' not a float; parseFloat returned "+f);}f=0;}switch(_2f.doubleNotation){case "e":_2f.arg=f.toExponential(_2f.precision);break;case "f":_2f.arg=f.toFixed(_2f.precision);break;case "g":if(Math.abs(f)<0.0001){_2f.arg=f.toExponential(_2f.precision>0?_2f.precision-1:_2f.precision);}else{_2f.arg=f.toPrecision(_2f.precision);}if(!_2f.alternative){_2f.arg=_2f.arg.replace(/(\..*[^0])0*/,"$1");_2f.arg=_2f.arg.replace(/\.0*e/,"e").replace(/\.0$/,"");}break;default:throw new Error("unexpected double notation '"+_2f.doubleNotation+"'");}_2f.arg=_2f.arg.replace(/e\+(\d)$/,"e+0$1").replace(/e\-(\d)$/,"e-0$1");if(has("opera")){_2f.arg=_2f.arg.replace(/^\./,"0.");}if(_2f.alternative){_2f.arg=_2f.arg.replace(/^(\d+)$/,"$1.");_2f.arg=_2f.arg.replace(/^(\d+)e/,"$1.e");}if(f>=0&&_2f.sign){_2f.arg=_2f.sign+_2f.arg;}_2f.arg=_2f.toUpper?_2f.arg.toUpperCase():_2f.arg.toLowerCase();},zeroPad:function(_30,_31){_31=(arguments.length==2)?_31:_30.precision;if(typeof _30.arg!="string"){_30.arg=""+_30.arg;}var _32=_31-10;while(_30.arg.length<_32){_30.arg=(_30.rightJustify)?_30.arg+this._zeros10:this._zeros10+_30.arg;}var pad=_31-_30.arg.length;_30.arg=(_30.rightJustify)?_30.arg+this._zeros10.substring(0,pad):this._zeros10.substring(0,pad)+_30.arg;},fitField:function(_33){if(_33.maxWidth>=0&&_33.arg.length>_33.maxWidth){return _33.arg.substring(0,_33.maxWidth);}if(_33.zeroPad){this.zeroPad(_33,_33.minWidth);return;}this.spacePad(_33);},spacePad:function(_34,_35){_35=(arguments.length==2)?_35:_34.minWidth;if(typeof _34.arg!="string"){_34.arg=""+_34.arg;}var _36=_35-10;while(_34.arg.length<_36){_34.arg=(_34.rightJustify)?_34.arg+this._spaces10:this._spaces10+_34.arg;}var pad=_35-_34.arg.length;_34.arg=(_34.rightJustify)?_34.arg+this._spaces10.substring(0,pad):this._spaces10.substring(0,pad)+_34.arg;}});return _18.sprintf;});},"*noref":1}});define("dojox/_dojox_string",[],1);require(["dojox/string/Builder","dojox/string/tokenize","dojox/string/sprintf"]);
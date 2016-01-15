require({cache:{
'dojox/uuid':function(){
define("dojox/uuid", ['dojox/uuid/_base'], function(uuid){
	return uuid;
});

},
'dojox/uuid/Uuid':function(){
define("dojox/uuid/Uuid", ['dojo/_base/lang', './_base'], function(dojo, uuid){

dojox.uuid.Uuid = function(/*String?*/ input){
	// summary:
	//		This is the constructor for the Uuid class.  The Uuid class offers
	//		methods for inspecting existing UUIDs.
	// input: A 36-character string that conforms to the UUID spec.
	// examples:
	//		var uuid;
	//		uuid = new dojox.uuid.Uuid("3b12f1df-5232-4804-897e-917bf397618a");
	//		uuid = new dojox.uuid.Uuid(); // "00000000-0000-0000-0000-000000000000"
	//		uuid = new dojox.uuid.Uuid(dojox.uuid.generateRandomUuid());
	//		uuid = new dojox.uuid.Uuid(dojox.uuid.generateTimeBasedUuid());
	//		dojox.uuid.Uuid.setGenerator(dojox.uuid.generateRandomUuid);
	//		uuid = new dojox.uuid.Uuid();
	//		dojox.uuid.assert(!uuid.isEqual(dojox.uuid.NIL_UUID));
	this._uuidString = dojox.uuid.NIL_UUID;
	if(input){
		dojox.uuid.assert(dojo.isString(input));
		this._uuidString = input.toLowerCase();
		dojox.uuid.assert(this.isValid());
	}else{
		var ourGenerator = dojox.uuid.Uuid.getGenerator();
		if(ourGenerator){
			this._uuidString = ourGenerator();
			dojox.uuid.assert(this.isValid());
		}
	}
};

dojox.uuid.Uuid.compare = function(/*dojox.uuid.Uuid*/ uuidOne, /*dojox.uuid.Uuid*/ uuidTwo){
	// summary:
	//		Given two UUIDs to compare, this method returns 0, 1, or -1.
	// description:
	//		This method is designed to be used by sorting routines, like the
	//		JavaScript built-in Array sort() method. This implementation is
	//		intended to match the sample implementation in IETF RFC 4122:
	//		http://www.ietf.org/rfc/rfc4122.txt
	// uuidOne: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.
	// uuidTwo: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.

	// examples:
	//		var uuid;
	//		var generator = dojox.uuid.TimeBasedGenerator;
	//		var a = new dojox.uuid.Uuid(generator);
	//		var b = new dojox.uuid.Uuid(generator);
	//		var c = new dojox.uuid.Uuid(generator);
	//		var array = new Array(a, b, c);
	//		array.sort(dojox.uuid.Uuid.compare);
	var uuidStringOne = uuidOne.toString();
	var uuidStringTwo = uuidTwo.toString();
	if (uuidStringOne > uuidStringTwo) return 1;   // integer
	if (uuidStringOne < uuidStringTwo) return -1;  // integer
	return 0; // integer (either 0, 1, or -1)
};

dojox.uuid.Uuid.setGenerator = function(/*Function?*/ generator){
	// summary:
	//		Sets the default generator, which will be used by the
	//		"new dojox.uuid.Uuid()" constructor if no parameters
	//		are passed in.
	// generator: A UUID generator function, such as dojox.uuid.generateTimeBasedUuid.
	dojox.uuid.assert(!generator || dojo.isFunction(generator));
	dojox.uuid.Uuid._ourGenerator = generator;
};

dojox.uuid.Uuid.getGenerator = function(){
	// summary:
	//		Returns the default generator.  See setGenerator().
	return dojox.uuid.Uuid._ourGenerator; // generator (A UUID generator, such as dojox.uuid.TimeBasedGenerator).
};

dojox.uuid.Uuid.prototype.toString = function(){
	// summary:
	//		This method returns a standard 36-character string representing
	//		the UUID, such as "3b12f1df-5232-4804-897e-917bf397618a".
	return this._uuidString; // string
};

dojox.uuid.Uuid.prototype.compare = function(/*dojox.uuid.Uuid*/ otherUuid){
	// summary:
	//		Compares this UUID to another UUID, and returns 0, 1, or -1.
	// description:
	//		This implementation is intended to match the sample implementation
	//		in IETF RFC 4122: http://www.ietf.org/rfc/rfc4122.txt
	// otherUuid: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.
	return dojox.uuid.Uuid.compare(this, otherUuid); // integer (either 0, 1, or -1)
};

dojox.uuid.Uuid.prototype.isEqual = function(/*dojox.uuid.Uuid*/ otherUuid){
	// summary:
	//		Returns true if this UUID is equal to the otherUuid, or false otherwise.
	// otherUuid: Any object that has toString() method that returns a 36-character string that conforms to the UUID spec.
	return (this.compare(otherUuid) == 0); // boolean
};

dojox.uuid.Uuid.prototype.isValid = function(){
	// summary:
	//		Returns true if the UUID was initialized with a valid value.
	return dojox.uuid.isValid(this);
};

dojox.uuid.Uuid.prototype.getVariant = function(){
	// summary:
	//		Returns a variant code that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.variant values.

	// example:
	//		var uuid = new dojox.uuid.Uuid("3b12f1df-5232-4804-897e-917bf397618a");
	//		var variant = uuid.getVariant();
	//		dojox.uuid.assert(variant == dojox.uuid.variant.DCE);
	// example:
	// "3b12f1df-5232-4804-897e-917bf397618a"
	//                     ^
	//                     |
	//         (variant "10__" == DCE)
	return dojox.uuid.getVariant(this);
};

dojox.uuid.Uuid.prototype.getVersion = function(){
	// summary:
	//		Returns a version number that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.version values.
	// example:
	//		var uuid = new dojox.uuid.Uuid("b4308fb0-86cd-11da-a72b-0800200c9a66");
	//		var version = uuid.getVersion();
	//		dojox.uuid.assert(version == dojox.uuid.version.TIME_BASED);
	// exceptions:
	//		Throws an Error if this is not a DCE Variant UUID.
	if(!this._versionNumber){
		this._versionNumber = dojox.uuid.getVersion(this);
	}
	return this._versionNumber; // dojox.uuid.version
};

dojox.uuid.Uuid.prototype.getNode = function(){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), getNode() returns a
	//		12-character string with the "node" or "pseudonode" portion of the UUID,
	//		which is the rightmost 12 characters.
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	if (!this._nodeString) {
		this._nodeString = dojox.uuid.getNode(this);
	}
	return this._nodeString; // String (a 12-character string, which will look something like "917bf397618a")
};

dojox.uuid.Uuid.prototype.getTimestamp = function(/*String?*/ returnType){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), this method returns
	//		the timestamp value encoded in the UUID.  The caller can ask for the
	//		timestamp to be returned either as a JavaScript Date object or as a
	//		15-character string of hex digits.
	// returnType: Any of these five values: "string", String, "hex", "date", Date
	// returns:
	//		Returns the timestamp value as a JavaScript Date object or a 15-character string of hex digits.
	// examples:
	//		var uuid = new dojox.uuid.Uuid("b4308fb0-86cd-11da-a72b-0800200c9a66");
	//		var date, string, hexString;
	//		date   = uuid.getTimestamp();         // returns a JavaScript Date
	//		date   = uuid.getTimestamp(Date);     //
	//		string = uuid.getTimestamp(String);   // "Mon, 16 Jan 2006 20:21:41 GMT"
	//		hexString = uuid.getTimestamp("hex"); // "1da86cdb4308fb0"
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	if(!returnType){returnType = null};
	switch(returnType){
		case "string":
		case String:
			return this.getTimestamp(Date).toUTCString(); // String (e.g. "Mon, 16 Jan 2006 20:21:41 GMT")
			break;
		case "hex":
			// Return a 15-character string of hex digits containing the
			// timestamp for this UUID, with the high-order bits first.
			if (!this._timestampAsHexString) {
				this._timestampAsHexString = dojox.uuid.getTimestamp(this, "hex");
			}
			return this._timestampAsHexString; // String (e.g. "1da86cdb4308fb0")
			break;
		case null: // no returnType was specified, so default to Date
		case "date":
		case Date:
			// Return a JavaScript Date object.
			if (!this._timestampAsDate) {
				this._timestampAsDate = dojox.uuid.getTimestamp(this, Date);
			}
			return this._timestampAsDate; // Date
			break;
		default:
			// we got passed something other than a valid returnType
			dojox.uuid.assert(false, "The getTimestamp() method dojox.uuid.Uuid was passed a bogus returnType: " + returnType);
			break;
	}
};

return dojox.uuid.Uuid;

});

},
'dojox/uuid/_base':function(){
define("dojox/uuid/_base", ['dojo/_base/kernel', 'dojo/_base/lang'], function(dojo){

dojo.getObject("uuid", true, dojox);

// Public constants:
dojox.uuid.NIL_UUID = "00000000-0000-0000-0000-000000000000";
dojox.uuid.version = {
	//	Enumeration for the different UUID versions.
	UNKNOWN: 0,
	TIME_BASED: 1,
	DCE_SECURITY: 2,
	NAME_BASED_MD5: 3,
	RANDOM: 4,
	NAME_BASED_SHA1: 5 };
dojox.uuid.variant = {
	//	Enumeration for the different UUID variants.
	NCS: "0",
	DCE: "10",
	MICROSOFT: "110",
	UNKNOWN: "111" };

dojox.uuid.assert = function(/*Boolean*/ booleanValue, /*String?*/ message){
	// summary:
	//		Throws an exception if the assertion fails.
	// description:
	//		If the asserted condition is true, this method does nothing. If the
	//		condition is false, we throw an error with a error message.
	// booleanValue: Must be true for the assertion to succeed.
	// message: A string describing the assertion.
	// throws: Throws an Error if 'booleanValue' is false.
	if(!booleanValue){
		if(!message){
			message = "An assert statement failed.\n" +
			"The method dojox.uuid.assert() was called with a 'false' value.\n";
		}
		throw new Error(message);
	}
};

dojox.uuid.generateNilUuid = function(){
	// summary:
	//		This function returns the Nil UUID: "00000000-0000-0000-0000-000000000000".
	// description:
	//		The Nil UUID is described in section 4.1.7 of
	//		RFC 4122: http://tools.ietf.org/html/rfc4122#section-4.1.7
	// examples:
	//		var string = dojox.uuid.generateNilUuid();
	return dojox.uuid.NIL_UUID; // String
};

dojox.uuid.isValid = function(/*String*/ uuidString){
	// summary:
	//		Returns true if the UUID was initialized with a valid value.
	uuidString = uuidString.toString();
	var valid = (dojo.isString(uuidString) &&
		(uuidString.length == 36) &&
		(uuidString == uuidString.toLowerCase()));
	if(valid){
		var arrayOfParts = uuidString.split("-");
		valid = ((arrayOfParts.length == 5) &&
			(arrayOfParts[0].length == 8) &&
			(arrayOfParts[1].length == 4) &&
			(arrayOfParts[2].length == 4) &&
			(arrayOfParts[3].length == 4) &&
			(arrayOfParts[4].length == 12));
		var HEX_RADIX = 16;
		for (var i in arrayOfParts) {
			var part = arrayOfParts[i];
			var integer = parseInt(part, HEX_RADIX);
			valid = valid && isFinite(integer);
		}
	}
	return valid; // boolean
};

dojox.uuid.getVariant = function(/*String*/ uuidString){
	// summary:
	//		Returns a variant code that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.variant values.
	// example:
	//		var variant = dojox.uuid.getVariant("3b12f1df-5232-4804-897e-917bf397618a");
	//		dojox.uuid.assert(variant == dojox.uuid.variant.DCE);
	// example:
	// "3b12f1df-5232-4804-897e-917bf397618a"
	//                     ^
	//                     |
	//         (variant "10__" == DCE)
	if(!dojox.uuid._ourVariantLookupTable){
		var variant = dojox.uuid.variant;
		var lookupTable = [];

		lookupTable[0x0] = variant.NCS;       // 0000
		lookupTable[0x1] = variant.NCS;       // 0001
		lookupTable[0x2] = variant.NCS;       // 0010
		lookupTable[0x3] = variant.NCS;       // 0011

		lookupTable[0x4] = variant.NCS;       // 0100
		lookupTable[0x5] = variant.NCS;       // 0101
		lookupTable[0x6] = variant.NCS;       // 0110
		lookupTable[0x7] = variant.NCS;       // 0111

		lookupTable[0x8] = variant.DCE;       // 1000
		lookupTable[0x9] = variant.DCE;       // 1001
		lookupTable[0xA] = variant.DCE;       // 1010
		lookupTable[0xB] = variant.DCE;       // 1011

		lookupTable[0xC] = variant.MICROSOFT; // 1100
		lookupTable[0xD] = variant.MICROSOFT; // 1101
		lookupTable[0xE] = variant.UNKNOWN;   // 1110
		lookupTable[0xF] = variant.UNKNOWN;   // 1111
		
		dojox.uuid._ourVariantLookupTable = lookupTable;
	}

	uuidString = uuidString.toString();
	var variantCharacter = uuidString.charAt(19);
	var HEX_RADIX = 16;
	var variantNumber = parseInt(variantCharacter, HEX_RADIX);
	dojox.uuid.assert((variantNumber >= 0) && (variantNumber <= 16));
	return dojox.uuid._ourVariantLookupTable[variantNumber]; // dojox.uuid.variant
};

dojox.uuid.getVersion = function(/*String*/ uuidString){
	// summary:
	//		Returns a version number that indicates what type of UUID this is.
	//		Returns one of the enumerated dojox.uuid.version values.
	// example:
	//		var version = dojox.uuid.getVersion("b4308fb0-86cd-11da-a72b-0800200c9a66");
	//		dojox.uuid.assert(version == dojox.uuid.version.TIME_BASED);
	// exceptions:
	//		Throws an Error if this is not a DCE Variant UUID.
	var errorMessage = "dojox.uuid.getVersion() was not passed a DCE Variant UUID.";
	dojox.uuid.assert(dojox.uuid.getVariant(uuidString) == dojox.uuid.variant.DCE, errorMessage);
	uuidString = uuidString.toString();
	
		// "b4308fb0-86cd-11da-a72b-0800200c9a66"
		//                ^
		//                |
		//       (version 1 == TIME_BASED)
	var versionCharacter = uuidString.charAt(14);
	var HEX_RADIX = 16;
	var versionNumber = parseInt(versionCharacter, HEX_RADIX);
	return versionNumber; // dojox.uuid.version
};

dojox.uuid.getNode = function(/*String*/ uuidString){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), getNode() returns a
	//		12-character string with the "node" or "pseudonode" portion of the UUID,
	//		which is the rightmost 12 characters.
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	var errorMessage = "dojox.uuid.getNode() was not passed a TIME_BASED UUID.";
	dojox.uuid.assert(dojox.uuid.getVersion(uuidString) == dojox.uuid.version.TIME_BASED, errorMessage);

	uuidString = uuidString.toString();
	var arrayOfStrings = uuidString.split('-');
	var nodeString = arrayOfStrings[4];
	return nodeString; // String (a 12-character string, which will look something like "917bf397618a")
};

dojox.uuid.getTimestamp = function(/*String*/ uuidString, /*String?*/ returnType){
	// summary:
	//		If this is a version 1 UUID (a time-based UUID), this method returns
	//		the timestamp value encoded in the UUID.  The caller can ask for the
	//		timestamp to be returned either as a JavaScript Date object or as a
	//		15-character string of hex digits.
	// returnType: Any of these five values: "string", String, "hex", "date", Date
	// returns:
	//		Returns the timestamp value as a JavaScript Date object or a 15-character string of hex digits.
	// examples:
	//		var uuidString = "b4308fb0-86cd-11da-a72b-0800200c9a66";
	//		var date, string, hexString;
	//		date   = dojox.uuid.getTimestamp(uuidString);         // returns a JavaScript Date
	//		date   = dojox.uuid.getTimestamp(uuidString, Date);     //
	//		string = dojox.uuid.getTimestamp(uuidString, String);   // "Mon, 16 Jan 2006 20:21:41 GMT"
	//		hexString = dojox.uuid.getTimestamp(uuidString, "hex"); // "1da86cdb4308fb0"
	// exceptions:
	//		Throws an Error if this is not a version 1 UUID.
	var errorMessage = "dojox.uuid.getTimestamp() was not passed a TIME_BASED UUID.";
	dojox.uuid.assert(dojox.uuid.getVersion(uuidString) == dojox.uuid.version.TIME_BASED, errorMessage);
	
	uuidString = uuidString.toString();
	if(!returnType){returnType = null};
	switch(returnType){
		case "string":
		case String:
			return dojox.uuid.getTimestamp(uuidString, Date).toUTCString(); // String (e.g. "Mon, 16 Jan 2006 20:21:41 GMT")
			break;
		case "hex":
			// Return a 15-character string of hex digits containing the
			// timestamp for this UUID, with the high-order bits first.
			var arrayOfStrings = uuidString.split('-');
			var hexTimeLow = arrayOfStrings[0];
			var hexTimeMid = arrayOfStrings[1];
			var hexTimeHigh = arrayOfStrings[2];
		
			// Chop off the leading "1" character, which is the UUID
			// version number for time-based UUIDs.
			hexTimeHigh = hexTimeHigh.slice(1);
		
			var timestampAsHexString = hexTimeHigh + hexTimeMid + hexTimeLow;
			dojox.uuid.assert(timestampAsHexString.length == 15);
			return timestampAsHexString; // String (e.g. "1da86cdb4308fb0")
			break;
		case null: // no returnType was specified, so default to Date
		case "date":
		case Date:
			// Return a JavaScript Date object.
			var GREGORIAN_CHANGE_OFFSET_IN_HOURS = 3394248;
			var HEX_RADIX = 16;
		
			var arrayOfParts = uuidString.split('-');
			var timeLow = parseInt(arrayOfParts[0], HEX_RADIX);
			var timeMid = parseInt(arrayOfParts[1], HEX_RADIX);
			var timeHigh = parseInt(arrayOfParts[2], HEX_RADIX);
			var hundredNanosecondIntervalsSince1582 = timeHigh & 0x0FFF;
			hundredNanosecondIntervalsSince1582 <<= 16;
			hundredNanosecondIntervalsSince1582 += timeMid;
			// What we really want to do next is shift left 32 bits, but the
			// result will be too big to fit in an int, so we'll multiply by 2^32,
			// and the result will be a floating point approximation.
			hundredNanosecondIntervalsSince1582 *= 0x100000000;
			hundredNanosecondIntervalsSince1582 += timeLow;
			var millisecondsSince1582 = hundredNanosecondIntervalsSince1582 / 10000;
		
			// Again, this will be a floating point approximation.
			// We can make things exact later if we need to.
			var secondsPerHour = 60 * 60;
			var hoursBetween1582and1970 = GREGORIAN_CHANGE_OFFSET_IN_HOURS;
			var secondsBetween1582and1970 = hoursBetween1582and1970 * secondsPerHour;
			var millisecondsBetween1582and1970 = secondsBetween1582and1970 * 1000;
			var millisecondsSince1970 = millisecondsSince1582 - millisecondsBetween1582and1970;
		
			var timestampAsDate = new Date(millisecondsSince1970);
			return timestampAsDate; // Date
			break;
		default:
			// we got passed something other than a valid returnType
			dojox.uuid.assert(false, "dojox.uuid.getTimestamp was not passed a valid returnType: " + returnType);
			break;
	}
};

return dojox.uuid;

});

},
'dojox/uuid/generateTimeBasedUuid':function(){
define("dojox/uuid/generateTimeBasedUuid", [ 'dojo/_base/lang', './_base'], function(lang){

dojox.uuid.generateTimeBasedUuid = function(/*String?*/ node){
	// summary:
	//		This function generates time-based UUIDs, meaning "version 1" UUIDs.
	// description:
	// For more info, see
	//		http://www.webdav.org/specs/draft-leach-uuids-guids-01.txt
	//		http://www.infonuovo.com/dma/csdocs/sketch/instidid.htm
	//		http://kruithof.xs4all.nl/uuid/uuidgen
	//		http://www.opengroup.org/onlinepubs/009629399/apdxa.htm#tagcjh_20
	//		http://jakarta.apache.org/commons/sandbox/id/apidocs/org/apache/commons/id/uuid/clock/Clock.html
	// node:
	//		A 12-character hex string representing either a pseudo-node or
	//		hardware-node (an IEEE 802.3 network node).  A hardware-node
	//		will be something like "017bf397618a", always with the first bit
	//		being 0.  A pseudo-node will be something like "f17bf397618a",
	//		always with the first bit being 1.
	// examples:
	//		string = dojox.uuid.generateTimeBasedUuid();
	//		string = dojox.uuid.generateTimeBasedUuid("017bf397618a");
	//		dojox.uuid.generateTimeBasedUuid.setNode("017bf397618a");
	//		string = dojox.uuid.generateTimeBasedUuid(); // the generated UUID has node == "017bf397618a"
	var uuidString = dojox.uuid.generateTimeBasedUuid._generator.generateUuidString(node);
	return uuidString; // String
};

dojox.uuid.generateTimeBasedUuid.isValidNode = function(/*String?*/ node){
	var HEX_RADIX = 16;
	var integer = parseInt(node, HEX_RADIX);
	var valid = lang.isString(node) && node.length == 12 && isFinite(integer);
	return valid; // Boolean
};

dojox.uuid.generateTimeBasedUuid.setNode = function(/*String?*/ node){
	// summary:
	//		Sets the 'node' value that will be included in generated UUIDs.
	// node: A 12-character hex string representing a pseudoNode or hardwareNode.
	dojox.uuid.assert((node === null) || this.isValidNode(node));
	this._uniformNode = node;
};

dojox.uuid.generateTimeBasedUuid.getNode = function(){
	// summary:
	//		Returns the 'node' value that will be included in generated UUIDs.
	return this._uniformNode; // String (a 12-character hex string representing a pseudoNode or hardwareNode)
};

	
dojox.uuid.generateTimeBasedUuid._generator = new function(){
	// Number of hours between October 15, 1582 and January 1, 1970:
	this.GREGORIAN_CHANGE_OFFSET_IN_HOURS = 3394248;
	
	// Number of seconds between October 15, 1582 and January 1, 1970:
	//   dojox.uuid.generateTimeBasedUuid.GREGORIAN_CHANGE_OFFSET_IN_SECONDS = 12219292800;
	
	// --------------------------------------------------
	// Private variables:
	var _uuidPseudoNodeString = null;
	var _uuidClockSeqString = null;
	var _dateValueOfPreviousUuid = null;
	var _nextIntraMillisecondIncrement = 0;
	var _cachedMillisecondsBetween1582and1970 = null;
	var _cachedHundredNanosecondIntervalsPerMillisecond = null;
	
	// --------------------------------------------------
	// Private constants:
	var HEX_RADIX = 16;

	function _carry(/* array */ arrayA){
		// summary:
		//		Given an array which holds a 64-bit number broken into 4 16-bit
		//		elements, this method carries any excess bits (greater than 16-bits)
		//		from each array element into the next.
		// arrayA: An array with 4 elements, each of which is a 16-bit number.
		arrayA[2] += arrayA[3] >>> 16;
		arrayA[3] &= 0xFFFF;
		arrayA[1] += arrayA[2] >>> 16;
		arrayA[2] &= 0xFFFF;
		arrayA[0] += arrayA[1] >>> 16;
		arrayA[1] &= 0xFFFF;
		dojox.uuid.assert((arrayA[0] >>> 16) === 0);
	}

	function _get64bitArrayFromFloat(/* float */ x){
		// summary:
		//		Given a floating point number, this method returns an array which
		//		holds a 64-bit number broken into 4 16-bit elements.
		var result = new Array(0, 0, 0, 0);
		result[3] = x % 0x10000;
		x -= result[3];
		x /= 0x10000;
		result[2] = x % 0x10000;
		x -= result[2];
		x /= 0x10000;
		result[1] = x % 0x10000;
		x -= result[1];
		x /= 0x10000;
		result[0] = x;
		return result; // Array with 4 elements, each of which is a 16-bit number.
	}

	function _addTwo64bitArrays(/* array */ arrayA, /* array */ arrayB){
		// summary:
		//		Takes two arrays, each of which holds a 64-bit number broken into 4
		//		16-bit elements, and returns a new array that holds a 64-bit number
		//		that is the sum of the two original numbers.
		// arrayA: An array with 4 elements, each of which is a 16-bit number.
		// arrayB: An array with 4 elements, each of which is a 16-bit number.
		dojox.uuid.assert(lang.isArray(arrayA));
		dojox.uuid.assert(lang.isArray(arrayB));
		dojox.uuid.assert(arrayA.length == 4);
		dojox.uuid.assert(arrayB.length == 4);
	
		var result = new Array(0, 0, 0, 0);
		result[3] = arrayA[3] + arrayB[3];
		result[2] = arrayA[2] + arrayB[2];
		result[1] = arrayA[1] + arrayB[1];
		result[0] = arrayA[0] + arrayB[0];
		_carry(result);
		return result; // Array with 4 elements, each of which is a 16-bit number.
	}

	function _multiplyTwo64bitArrays(/* array */ arrayA, /* array */ arrayB){
		// summary:
		//		Takes two arrays, each of which holds a 64-bit number broken into 4
		//		16-bit elements, and returns a new array that holds a 64-bit number
		//		that is the product of the two original numbers.
		// arrayA: An array with 4 elements, each of which is a 16-bit number.
		// arrayB: An array with 4 elements, each of which is a 16-bit number.
		dojox.uuid.assert(lang.isArray(arrayA));
		dojox.uuid.assert(lang.isArray(arrayB));
		dojox.uuid.assert(arrayA.length == 4);
		dojox.uuid.assert(arrayB.length == 4);
	
		var overflow = false;
		if(arrayA[0] * arrayB[0] !== 0){ overflow = true; }
		if(arrayA[0] * arrayB[1] !== 0){ overflow = true; }
		if(arrayA[0] * arrayB[2] !== 0){ overflow = true; }
		if(arrayA[1] * arrayB[0] !== 0){ overflow = true; }
		if(arrayA[1] * arrayB[1] !== 0){ overflow = true; }
		if(arrayA[2] * arrayB[0] !== 0){ overflow = true; }
		dojox.uuid.assert(!overflow);
	
		var result = new Array(0, 0, 0, 0);
		result[0] += arrayA[0] * arrayB[3];
		_carry(result);
		result[0] += arrayA[1] * arrayB[2];
		_carry(result);
		result[0] += arrayA[2] * arrayB[1];
		_carry(result);
		result[0] += arrayA[3] * arrayB[0];
		_carry(result);
		result[1] += arrayA[1] * arrayB[3];
		_carry(result);
		result[1] += arrayA[2] * arrayB[2];
		_carry(result);
		result[1] += arrayA[3] * arrayB[1];
		_carry(result);
		result[2] += arrayA[2] * arrayB[3];
		_carry(result);
		result[2] += arrayA[3] * arrayB[2];
		_carry(result);
		result[3] += arrayA[3] * arrayB[3];
		_carry(result);
		return result; // Array with 4 elements, each of which is a 16-bit number.
	}

	function _padWithLeadingZeros(/* string */ string, /* int */ desiredLength){
		// summary:
		//		Pads a string with leading zeros and returns the result.
		// string: A string to add padding to.
		// desiredLength: The number of characters the return string should have.

		// examples:
		//		result = _padWithLeadingZeros("abc", 6);
		//		dojox.uuid.assert(result == "000abc");
		while(string.length < desiredLength){
			string = "0" + string;
		}
		return string; // string
	}

	function _generateRandomEightCharacterHexString() {
		// summary:
		//		Returns a randomly generated 8-character string of hex digits.

		// FIXME: This probably isn't a very high quality random number.
	
		// Make random32bitNumber be a randomly generated floating point number
		// between 0 and (4,294,967,296 - 1), inclusive.
		var random32bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 32) );
	
		var eightCharacterString = random32bitNumber.toString(HEX_RADIX);
		while(eightCharacterString.length < 8){
			eightCharacterString = "0" + eightCharacterString;
		}
		return eightCharacterString; // String (an 8-character hex string)
	}
	
	this.generateUuidString = function(/*String?*/ node){
		// summary:
		//		Generates a time-based UUID, meaning a version 1 UUID.
		// description:
		//		JavaScript code running in a browser doesn't have access to the
		//		IEEE 802.3 address of the computer, so if a node value isn't
		//		supplied, we generate a random pseudonode value instead.
		// node: An optional 12-character string to use as the node in the new UUID.
		if(node){
			dojox.uuid.assert(dojox.uuid.generateTimeBasedUuid.isValidNode(node));
		}else{
			if(dojox.uuid.generateTimeBasedUuid._uniformNode){
				node = dojox.uuid.generateTimeBasedUuid._uniformNode;
			}else{
				if(!_uuidPseudoNodeString){
					var pseudoNodeIndicatorBit = 0x8000;
					var random15bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 15) );
					var leftmost4HexCharacters = (pseudoNodeIndicatorBit | random15bitNumber).toString(HEX_RADIX);
					_uuidPseudoNodeString = leftmost4HexCharacters + _generateRandomEightCharacterHexString();
				}
				node = _uuidPseudoNodeString;
			}
		}
		if(!_uuidClockSeqString){
			var variantCodeForDCEUuids = 0x8000; // 10--------------, i.e. uses only first two of 16 bits.
			var random14bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 14) );
			_uuidClockSeqString = (variantCodeForDCEUuids | random14bitNumber).toString(HEX_RADIX);
		}
	
		// Maybe we should think about trying to make the code more readable to
		// newcomers by creating a class called "WholeNumber" that encapsulates
		// the methods and data structures for working with these arrays that
		// hold 4 16-bit numbers?  And then these variables below have names
		// like "wholeSecondsPerHour" rather than "arraySecondsPerHour"?
		var now = new Date();
		var millisecondsSince1970 = now.valueOf(); // milliseconds since midnight 01 January, 1970 UTC.
		var nowArray = _get64bitArrayFromFloat(millisecondsSince1970);
		if(!_cachedMillisecondsBetween1582and1970){
			var arraySecondsPerHour = _get64bitArrayFromFloat(60 * 60);
			var arrayHoursBetween1582and1970 = _get64bitArrayFromFloat(dojox.uuid.generateTimeBasedUuid._generator.GREGORIAN_CHANGE_OFFSET_IN_HOURS);
			var arraySecondsBetween1582and1970 = _multiplyTwo64bitArrays(arrayHoursBetween1582and1970, arraySecondsPerHour);
			var arrayMillisecondsPerSecond = _get64bitArrayFromFloat(1000);
			_cachedMillisecondsBetween1582and1970 = _multiplyTwo64bitArrays(arraySecondsBetween1582and1970, arrayMillisecondsPerSecond);
			_cachedHundredNanosecondIntervalsPerMillisecond = _get64bitArrayFromFloat(10000);
		}
		var arrayMillisecondsSince1970 = nowArray;
		var arrayMillisecondsSince1582 = _addTwo64bitArrays(_cachedMillisecondsBetween1582and1970, arrayMillisecondsSince1970);
		var arrayHundredNanosecondIntervalsSince1582 = _multiplyTwo64bitArrays(arrayMillisecondsSince1582, _cachedHundredNanosecondIntervalsPerMillisecond);
	
		if(now.valueOf() == _dateValueOfPreviousUuid){
			arrayHundredNanosecondIntervalsSince1582[3] += _nextIntraMillisecondIncrement;
			_carry(arrayHundredNanosecondIntervalsSince1582);
			_nextIntraMillisecondIncrement += 1;
			if (_nextIntraMillisecondIncrement == 10000) {
				// If we've gotten to here, it means we've already generated 10,000
				// UUIDs in this single millisecond, which is the most that the UUID
				// timestamp field allows for.  So now we'll just sit here and wait
				// for a fraction of a millisecond, so as to ensure that the next
				// time this method is called there will be a different millisecond
				// value in the timestamp field.
				while (now.valueOf() == _dateValueOfPreviousUuid) {
					now = new Date();
				}
			}
		}else{
			_dateValueOfPreviousUuid = now.valueOf();
			_nextIntraMillisecondIncrement = 1;
		}
	
		var hexTimeLowLeftHalf  = arrayHundredNanosecondIntervalsSince1582[2].toString(HEX_RADIX);
		var hexTimeLowRightHalf = arrayHundredNanosecondIntervalsSince1582[3].toString(HEX_RADIX);
		var hexTimeLow = _padWithLeadingZeros(hexTimeLowLeftHalf, 4) + _padWithLeadingZeros(hexTimeLowRightHalf, 4);
		var hexTimeMid = arrayHundredNanosecondIntervalsSince1582[1].toString(HEX_RADIX);
		hexTimeMid = _padWithLeadingZeros(hexTimeMid, 4);
		var hexTimeHigh = arrayHundredNanosecondIntervalsSince1582[0].toString(HEX_RADIX);
		hexTimeHigh = _padWithLeadingZeros(hexTimeHigh, 3);
		var hyphen = "-";
		var versionCodeForTimeBasedUuids = "1"; // binary2hex("0001")
		var resultUuid = hexTimeLow + hyphen + hexTimeMid + hyphen +
					versionCodeForTimeBasedUuids + hexTimeHigh + hyphen +
					_uuidClockSeqString + hyphen + node;
		resultUuid = resultUuid.toLowerCase();
		return resultUuid; // String (a 36 character string, which will look something like "b4308fb0-86cd-11da-a72b-0800200c9a66")
	}

}();

return dojox.uuid.generateTimeBasedUuid;

});

},
'dojox/uuid/generateRandomUuid':function(){
define("dojox/uuid/generateRandomUuid", ['./_base'], function(){

dojox.uuid.generateRandomUuid = function(){
	// summary:
	//		This function generates random UUIDs, meaning "version 4" UUIDs.
	// description:
	//		A typical generated value would be something like this:
	//		"3b12f1df-5232-4804-897e-917bf397618a"
	//
	//		For more information about random UUIDs, see sections 4.4 and
	//		4.5 of RFC 4122: http://tools.ietf.org/html/rfc4122#section-4.4
	//
	//		This generator function is designed to be small and fast,
	//		but not necessarily good.
	//
	//		Small: This generator has a small footprint. Once comments are
	//		stripped, it's only about 25 lines of code, and it doesn't
	//		dojo.require() any other modules.
	//
	//		Fast: This generator can generate lots of new UUIDs fairly quickly
	//		(at least, more quickly than the other dojo UUID generators).
	//
	//		Not necessarily good: We use Math.random() as our source
	//		of randomness, which may or may not provide much randomness.
	// examples:
	//		var string = dojox.uuid.generateRandomUuid();
	var HEX_RADIX = 16;

	function _generateRandomEightCharacterHexString(){
		// Make random32bitNumber be a randomly generated floating point number
		// between 0 and (4,294,967,296 - 1), inclusive.
		var random32bitNumber = Math.floor( (Math.random() % 1) * Math.pow(2, 32) );
		var eightCharacterHexString = random32bitNumber.toString(HEX_RADIX);
		while(eightCharacterHexString.length < 8){
			eightCharacterHexString = "0" + eightCharacterHexString;
		}
		return eightCharacterHexString; // for example: "3B12F1DF"
	}

	var hyphen = "-";
	var versionCodeForRandomlyGeneratedUuids = "4"; // 8 == binary2hex("0100")
	var variantCodeForDCEUuids = "8"; // 8 == binary2hex("1000")
	var a = _generateRandomEightCharacterHexString();
	var b = _generateRandomEightCharacterHexString();
	b = b.substring(0, 4) + hyphen + versionCodeForRandomlyGeneratedUuids + b.substring(5, 8);
	var c = _generateRandomEightCharacterHexString();
	c = variantCodeForDCEUuids + c.substring(1, 4) + hyphen + c.substring(4, 8);
	var d = _generateRandomEightCharacterHexString();
	var returnValue = a + hyphen + b + hyphen + c + d;
	returnValue = returnValue.toLowerCase();
	return returnValue; // String
};

return dojox.uuid.generateRandomUuid;

});

},
'*noref':1}});
define("dojox/_dojox_uuid", [], 1);
require(["dojox/uuid","dojox/uuid/Uuid","dojox/uuid/generateRandomUuid","dojox/uuid/generateTimeBasedUuid"]);

require({cache:{
'dojox/gfx3d/_base':function(){
define("dojox/gfx3d/_base", ["dojo/_base/lang"],function(lang) {
	var gfx3d = lang.getObject("dojox.gfx3d",true);
	lang.mixin( gfx3d, {
		// summary: defines constants, prototypes, and utility functions
		
		// default objects, which are used to fill in missing parameters
		defaultEdges:	  {type: "edges",     style: null, points: []},
		defaultTriangles: {type: "triangles", style: null, points: []},
		defaultQuads:	  {type: "quads",     style: null, points: []},
		defaultOrbit:	  {type: "orbit",     center: {x: 0, y: 0, z: 0}, radius: 50},
		defaultPath3d:	  {type: "path3d",    path: []},
		defaultPolygon:	  {type: "polygon",   path: []},
		defaultCube:	  {type: "cube",      bottom: {x: 0, y: 0, z: 0}, top: {x: 100, y: 100, z: 100}},
		defaultCylinder:  {type: "cylinder",  center: /* center of bottom */ {x: 0, y: 0, z: 0}, height: 100, radius: 50}
	});
	return gfx3d;
});
},
'dojox/gfx3d/object':function(){
define("dojox/gfx3d/object", [
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojox/gfx",
	"dojox/gfx/matrix",
	"./_base",
	"./scheduler",
	"./gradient",
	"./vector",
	"./matrix",
	"./lighting"
], function(arrayUtil,declare,lang,gfx,matrixUtil2d,gfx3d,schedulerExtensions,Gradient,VectorUtil,matrixUtil,lightUtil){

var scheduler = schedulerExtensions.scheduler;
	
// FIXME: why the "out" var here?
var out = function(o, x){
	if(arguments.length > 1){
		// console.debug("debug:", o);
		o = x;
	}
	var e = {};
	for(var i in o){
		if(i in e){ continue; }
		// console.debug("debug:", i, typeof o[i], o[i]);
	}
};

declare("dojox.gfx3d.Object", null, {
	constructor: function(){
		// summary: a Object object, which knows how to map
		// 3D objects to 2D shapes.

		// object: Object: an abstract Object object
		// (see dojox.gfx3d.defaultEdges,
		// dojox.gfx3d.defaultTriangles,
		// dojox.gfx3d.defaultQuads
		// dojox.gfx3d.defaultOrbit
		// dojox.gfx3d.defaultCube
		// or dojox.gfx3d.defaultCylinder)
		this.object = null;

		// matrix: dojox.gfx3d.matrix: world transform
		this.matrix = null;
		// cache: buffer for intermediate result, used late for draw()
		this.cache = null;
		// renderer: a reference for the Viewport
		this.renderer = null;
		// parent: a reference for parent, Scene or Viewport object
		this.parent = null;

		// strokeStyle: Object: a stroke object
		this.strokeStyle = null;
		// fillStyle: Object: a fill object or texture object
		this.fillStyle = null;
		// shape: dojox.gfx.Shape: an underlying 2D shape
		this.shape = null;
	},

	setObject: function(newObject){
		// summary: sets a Object object
		// object: Object: an abstract Object object
		// (see dojox.gfx3d.defaultEdges,
		// dojox.gfx3d.defaultTriangles,
		// dojox.gfx3d.defaultQuads
		// dojox.gfx3d.defaultOrbit
		// dojox.gfx3d.defaultCube
		// or dojox.gfx3d.defaultCylinder)
		this.object = gfx.makeParameters(this.object, newObject);
		return this;
	},

	setTransform: function(matrix){
		// summary: sets a transformation matrix
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		this.matrix = matrixUtil.clone(matrix ? matrixUtil.normalize(matrix) : gfx3d.identity, true);
		return this;	// self
	},

	// apply left & right transformation
	
	applyRightTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on right side
		//	(this.matrix * matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},
	applyLeftTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on left side
		//	(matrix * this.matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([matrix, this.matrix]) : this;	// self
	},

	applyTransform: function(matrix){
		// summary: a shortcut for dojox.gfx.Shape.applyRightTransform
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setTransform([this.matrix, matrix]) : this;	// self
	},
	
	setFill: function(fill){
		// summary: sets a fill object
		// (the default implementation is to delegate to
		// the underlying 2D shape).
		// fill: Object: a fill object
		//	(see dojox.gfx.defaultLinearGradient,
		//	dojox.gfx.defaultRadialGradient,
		//	dojox.gfx.defaultPattern,
		//	dojo.Color
		//	or dojox.gfx.MODEL)
		this.fillStyle = fill;
		return this;
	},

	setStroke: function(stroke){
		// summary: sets a stroke object
		//	(the default implementation simply ignores it)
		// stroke: Object: a stroke object
		//	(see dojox.gfx.defaultStroke)
		this.strokeStyle = stroke;
		return this;
	},

	toStdFill: function(lighting, normal){
		return (this.fillStyle && typeof this.fillStyle['type'] != "undefined") ? 
			lighting[this.fillStyle.type](normal, this.fillStyle.finish, this.fillStyle.color)
			: this.fillStyle;
	},

	invalidate: function(){
		this.renderer.addTodo(this);
	},
	
	destroy: function(){
		if(this.shape){
			var p = this.shape.getParent();
			if(p){
				p.remove(this.shape);
			}
			this.shape = null;
		}
	},

	// All the 3D objects need to override the following virtual functions:
	// render, getZOrder, getOutline, draw, redraw if necessary.

	render: function(camera){
		throw "Pure virtual function, not implemented";
	},

	draw: function(lighting){
		throw "Pure virtual function, not implemented";
	},

	getZOrder: function(){
		return 0;
	},

	getOutline: function(){
		return null;
	}

});

declare("dojox.gfx3d.Scene", gfx3d.Object, {
	// summary: the Scene is just a containter.
	// note: we have the following assumption:
	// all objects in the Scene are not overlapped with other objects
	// outside of the scene.
	constructor: function(){
		// summary: a containter of other 3D objects
		this.objects= [];
		this.todos = [];
		this.schedule = scheduler.zOrder;
		this._draw = gfx3d.drawer.conservative;
	},

	setFill: function(fill){
		this.fillStyle = fill;
		arrayUtil.forEach(this.objects, function(item){
			item.setFill(fill);
		});
		return this;
	},

	setStroke: function(stroke){
		this.strokeStyle = stroke;
		arrayUtil.forEach(this.objects, function(item){
			item.setStroke(stroke);
		});
		return this;
	},

	render: function(camera, deep){
		var m = matrixUtil.multiply(camera, this.matrix);
		if(deep){
			this.todos = this.objects;
		}
		arrayUtil.forEach(this.todos, function(item){ item.render(m, deep); });
	},

	draw: function(lighting){
		this.objects = this.schedule(this.objects);
		this._draw(this.todos, this.objects, this.renderer);
	},

	addTodo: function(newObject){
		// FIXME: use indexOf?
		if(arrayUtil.every(this.todos, function(item){ return item != newObject; })){
			this.todos.push(newObject);
			this.invalidate();
		}
	},

	invalidate: function(){
		this.parent.addTodo(this);
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.objects, function(item){ zOrder += item.getZOrder(); });
		return (this.objects.length > 1) ?  zOrder / this.objects.length : 0;
	}
});


declare("dojox.gfx3d.Edges", gfx3d.Object, {
	constructor: function(){
		// summary: a generic edge in 3D viewport
		this.object = lang.clone(gfx3d.defaultEdges);
	},

	setObject: function(newObject, /* String, optional */ style){
		// summary: setup the object
		// newObject: Array of points || Object
		// style: String, optional
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? { points: newObject, style: style } : newObject);
		return this;
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.cache, function(item){ zOrder += item.z;} );
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		this.cache = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
	},

	draw: function(){
		var c = this.cache;
		if(this.shape){
			this.shape.setShape("")
		}else{
			this.shape = this.renderer.createPath();
		}
		var p = this.shape.setAbsoluteMode("absolute");

		if(this.object.style == "strip" || this.object.style == "loop"){
			p.moveTo(c[0].x, c[0].y);
			arrayUtil.forEach(c.slice(1), function(item){
				p.lineTo(item.x, item.y);
			});
			if(this.object.style == "loop"){
				p.closePath();
			}
		}else{
			for(var i = 0; i < this.cache.length; ){
				p.moveTo(c[i].x, c[i].y);
				i ++;
				p.lineTo(c[i].x, c[i].y);
				i ++;
			}
		}
		// FIXME: doe setFill make sense here?
		p.setStroke(this.strokeStyle);
	}
});

declare("dojox.gfx3d.Orbit", gfx3d.Object, {
	constructor: function(){
		// summary: a generic edge in 3D viewport
		this.object = lang.clone(gfx3d.defaultOrbit);
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		var angles = [0, Math.PI/4, Math.PI/3];
		var center = matrixUtil.multiplyPoint(m, this.object.center);
		var marks = arrayUtil.map(angles, function(item){
			return {x: this.center.x + this.radius * Math.cos(item),
				y: this.center.y + this.radius * Math.sin(item), z: this.center.z};
			}, this.object);

		marks = arrayUtil.map(marks, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});

		var normal = VectorUtil.normalize(marks);

		marks = arrayUtil.map(marks, function(item){
			return VectorUtil.substract(item, center);
		});

		// Use the algorithm here:
		// http://www.3dsoftware.com/Math/PlaneCurves/EllipseAlgebra/
		// After we normalize the marks, the equation is:
		// a x^2 + 2b xy + cy^2 + f = 0: let a = 1
		//  so the final equation is:
		//  [ xy, y^2, 1] * [2b, c, f]' = [ -x^2 ]'

		var A = {
			xx: marks[0].x * marks[0].y, xy: marks[0].y * marks[0].y, xz: 1,
			yx: marks[1].x * marks[1].y, yy: marks[1].y * marks[1].y, yz: 1,
			zx: marks[2].x * marks[2].y, zy: marks[2].y * marks[2].y, zz: 1,
			dx: 0, dy: 0, dz: 0
		};
		var B = arrayUtil.map(marks, function(item){
			return -Math.pow(item.x, 2);
		});

		// X is 2b, c, f
		var X = matrixUtil.multiplyPoint(matrixUtil.invert(A),B[0], B[1], B[2]);
		var theta = Math.atan2(X.x, 1 - X.y) / 2;

		// rotate the marks back to the canonical form
		var probes = arrayUtil.map(marks, function(item){
			return matrixUtil2d.multiplyPoint(matrixUtil2d.rotate(-theta), item.x, item.y);
		});

		// we are solving the equation: Ax = b
		// A = [x^2, y^2] X = [1/a^2, 1/b^2]', b = [1, 1]'
		// so rx = Math.sqrt(1/ ( inv(A)[1:] * b ) );
		// so ry = Math.sqrt(1/ ( inv(A)[2:] * b ) );

		var a = Math.pow(probes[0].x, 2);
		var b = Math.pow(probes[0].y, 2);
		var c = Math.pow(probes[1].x, 2);
		var d = Math.pow(probes[1].y, 2);

		// the invert matrix is
		// 1/(ad -bc) [ d, -b; -c, a];
		var rx = Math.sqrt( (a*d - b*c)/ (d-b) );
		var ry = Math.sqrt( (a*d - b*c)/ (a-c) );

		this.cache = {cx: center.x, cy: center.y, rx: rx, ry: ry, theta: theta, normal: normal};
	},

	draw: function(lighting){
		if(this.shape){
			this.shape.setShape(this.cache);
		} else {
			this.shape = this.renderer.createEllipse(this.cache);
		}
		this.shape.applyTransform(matrixUtil2d.rotateAt(this.cache.theta, this.cache.cx, this.cache.cy))
			.setStroke(this.strokeStyle)
			.setFill(this.toStdFill(lighting, this.cache.normal));
	}
});

declare("dojox.gfx3d.Path3d", gfx3d.Object, {
	// This object is still very immature !
	constructor: function(){
		// summary: a generic line
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultPath3d);
		this.segments = [];
		this.absolute = true;
		this.last = {};
		this.path = "";
	},

	_collectArgs: function(array, args){
		// summary: converts an array of arguments to plain numeric values
		// array: Array: an output argument (array of numbers)
		// args: Array: an input argument (can be values of Boolean, Number, dojox.gfx.Point, or an embedded array of them)
		for(var i = 0; i < args.length; ++i){
			var t = args[i];
			if(typeof(t) == "boolean"){
				array.push(t ? 1 : 0);
			}else if(typeof(t) == "number"){
				array.push(t);
			}else if(t instanceof Array){
				this._collectArgs(array, t);
			}else if("x" in t && "y" in t){
				array.push(t.x);
				array.push(t.y);
			}
		}
	},

	// a dictionary, which maps segment type codes to a number of their argemnts
	_validSegments: {m: 3, l: 3,  z: 0},

	_pushSegment: function(action, args){
		// summary: adds a segment
		// action: String: valid SVG code for a segment's type
		// args: Array: a list of parameters for this segment
		var group = this._validSegments[action.toLowerCase()], segment;
		if(typeof(group) == "number"){
			if(group){
				if(args.length >= group){
					segment = {action: action, args: args.slice(0, args.length - args.length % group)};
					this.segments.push(segment);
				}
			}else{
				segment = {action: action, args: []};
				this.segments.push(segment);
			}
		}
	},

	moveTo: function(){
		// summary: formes a move segment
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "M" : "m", args);
		return this; // self
	},
	lineTo: function(){
		// summary: formes a line segment
		var args = [];
		this._collectArgs(args, arguments);
		this._pushSegment(this.absolute ? "L" : "l", args);
		return this; // self
	},

	closePath: function(){
		// summary: closes a path
		this._pushSegment("Z", []);
		return this; // self
	},

	render: function(camera){
		// TODO: we need to get the ancestors' matrix
		var m = matrixUtil.multiply(camera, this.matrix);
		// iterate all the segments and convert them to 2D canvas
		// TODO consider the relative mode
		var path = ""
		var _validSegments = this._validSegments;
		arrayUtil.forEach(this.segments, function(item){
			path += item.action;
			for(var i = 0; i < item.args.length; i+= _validSegments[item.action.toLowerCase()] ){
				var pt = matrixUtil.multiplyPoint(m, item.args[i], item.args[i+1], item.args[i+2])
				path += " " + pt.x + " " + pt.y;
			}
		});

		this.cache =  path;
	},

	_draw: function(){
		return this.parent.createPath(this.cache);
	}
});

declare("dojox.gfx3d.Triangles", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultTriangles);
	},

	setObject: function(newObject, /* String, optional */ style){
		// summary: setup the object
		// newObject: Array of points || Object
		// style: String, optional
		if(newObject instanceof Array){
			this.object = gfx.makeParameters(this.object, { points: newObject, style: style } );
		} else {
			this.object = gfx.makeParameters(this.object, newObject);
		}
		return this;
	},
	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		var c = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		this.cache = [];
		var pool = c.slice(0, 2);
		var center = c[0];
		if(this.object.style == "strip"){
			arrayUtil.forEach(c.slice(2), function(item){
				pool.push(item);
				pool.push(pool[0]);
				this.cache.push(pool);
				pool = pool.slice(1, 3);
			}, this);
		} else if(this.object.style == "fan"){
			arrayUtil.forEach(c.slice(2), function(item){
				pool.push(item);
				pool.push(center);
				this.cache.push(pool);
				pool = [center, item];
			}, this);
		} else {
			for(var i = 0; i < c.length; ){
				this.cache.push( [ c[i], c[i+1], c[i+2], c[i] ]);
				i += 3;
			}
		}
	},

	draw: function(lighting){
		// use the BSP to schedule
		this.cache = scheduler.bsp(this.cache, function(it){  return it; });
		if(this.shape){
			this.shape.clear();
		} else {
			this.shape = this.renderer.createGroup();
		}
		arrayUtil.forEach(this.cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(item)));
		}, this);
	},

	getZOrder: function(){
		var zOrder = 0;
		arrayUtil.forEach(this.cache, function(item){
				zOrder += (item[0].z + item[1].z + item[2].z) / 3; });
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	}
});

declare("dojox.gfx3d.Quads", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultQuads);
	},

	setObject: function(newObject, /* String, optional */ style){
		// summary: setup the object
		// newObject: Array of points || Object
		// style: String, optional
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? 
			{ points: newObject, style: style } 
				: newObject );
		return this;
	},
	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix), i;
		var c = arrayUtil.map(this.object.points, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		this.cache = [];
		if(this.object.style == "strip"){
			var pool = c.slice(0, 2);
			for(i = 2; i < c.length; ){
				pool = pool.concat( [ c[i], c[i+1], pool[0] ] );
				this.cache.push(pool);
				pool = pool.slice(2,4);
				i += 2;
			}
		}else{
			for(i = 0; i < c.length; ){
				this.cache.push( [c[i], c[i+1], c[i+2], c[i+3], c[i] ] );
				i += 4;
			}
		}
	},

	draw: function(lighting){
		// use the BSP to schedule
		this.cache = gfx3d.scheduler.bsp(this.cache, function(it){  return it; });
		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			this.shape.createPolyline(this.cache[x])
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(this.cache[x])));
		}
		/*
		dojo.forEach(this.cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, dojox.gfx3d.vector.normalize(item)));
		}, this);
		*/
	},

	getZOrder: function(){
		var zOrder = 0;
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			var i = this.cache[x];
			zOrder += (i[0].z + i[1].z + i[2].z + i[3].z) / 4;
		}
		/*
		dojo.forEach(this.cache, function(item){
				zOrder += (item[0].z + item[1].z + item[2].z + item[3].z) / 4; });
		*/
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	}
});

declare("dojox.gfx3d.Polygon", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultPolygon);
	},

	setObject: function(newObject){
		// summary: setup the object
		// newObject: Array of points || Object
		this.object = gfx.makeParameters(this.object, (newObject instanceof Array) ? {path: newObject} : newObject)
		return this;
	},

	render: function(camera){
		var m = matrixUtil.multiply(camera, this.matrix);
		this.cache = arrayUtil.map(this.object.path, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		// add the first point to close the polyline
		this.cache.push(this.cache[0]);
	},

	draw: function(lighting){
		if(this.shape){
			this.shape.setShape({points: this.cache});
		}else{
			this.shape = this.renderer.createPolyline({points: this.cache});
		}

		this.shape.setStroke(this.strokeStyle)
			.setFill(this.toStdFill(lighting, matrixUtil.normalize(this.cache)));
	},

	getZOrder: function(){
		var zOrder = 0;
		// using naive iteration to speed things up a bit by avoiding function call overhead
		for(var x=0; x<this.cache.length; x++){
			zOrder += this.cache[x].z;
		}
		return (this.cache.length > 1) ?  zOrder / this.cache.length : 0;
	},

	getOutline: function(){
		return this.cache.slice(0, 3);
	}
});

declare("dojox.gfx3d.Cube", gfx3d.Object, {
	constructor: function(){
		// summary: a generic triangle
		//	(this is a helper object, which is defined for convenience)
		this.object = lang.clone(gfx3d.defaultCube);
		this.polygons = [];
	},

	setObject: function(newObject){
		// summary: setup the object
		// newObject: Array of points || Object
		this.object = gfx.makeParameters(this.object, newObject);
	},

	render: function(camera){
		// parse the top, bottom to get 6 polygons:
		var a = this.object.top;
		var g = this.object.bottom;
		var b = {x: g.x, y: a.y, z: a.z};
		var c = {x: g.x, y: g.y, z: a.z};
		var d = {x: a.x, y: g.y, z: a.z};
		var e = {x: a.x, y: a.y, z: g.z};
		var f = {x: g.x, y: a.y, z: g.z};
		var h = {x: a.x, y: g.y, z: g.z};
		var polygons = [a, b, c, d, e, f, g, h];
		var m = matrixUtil.multiply(camera, this.matrix);
		var p = arrayUtil.map(polygons, function(item){
			return matrixUtil.multiplyPoint(m, item);
		});
		a = p[0]; b = p[1]; c = p[2]; d = p[3]; e = p[4]; f = p[5]; g = p[6]; h = p[7];
		this.cache = [[a, b, c, d, a], [e, f, g, h, e], [a, d, h, e, a], [d, c, g, h, d], [c, b, f, g, c], [b, a, e, f, b]];
	},

	draw: function(lighting){
		// use bsp to sort.
		this.cache = gfx3d.scheduler.bsp(this.cache, function(it){ return it; });
		// only the last 3 polys are visible.
		var cache = this.cache.slice(3);

		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		for(var x=0; x<cache.length; x++){
			this.shape.createPolyline(cache[x])
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, VectorUtil.normalize(cache[x])));
		}
		/*
		dojo.forEach(cache, function(item){
			this.shape.createPolyline(item)
				.setStroke(this.strokeStyle)
				.setFill(this.toStdFill(lighting, dojox.gfx3d.vector.normalize(item)));
		}, this);
		*/
	},

	getZOrder: function(){
		var top = this.cache[0][0];
		var bottom = this.cache[1][2];
		return (top.z + bottom.z) / 2;
	}
});


declare("dojox.gfx3d.Cylinder", gfx3d.Object, {
	constructor: function(){
		this.object = lang.clone(gfx3d.defaultCylinder);
	},

	render: function(camera){
		// get the bottom surface first
		var m = matrixUtil.multiply(camera, this.matrix);
		var angles = [0, Math.PI/4, Math.PI/3];
		var center = matrixUtil.multiplyPoint(m, this.object.center);
		var marks = arrayUtil.map(angles, function(item){
			return {x: this.center.x + this.radius * Math.cos(item),
				y: this.center.y + this.radius * Math.sin(item), z: this.center.z};
			}, this.object);

		marks = arrayUtil.map(marks, function(item){
			return VectorUtil.substract(matrixUtil.multiplyPoint(m, item), center);
		});

		// Use the algorithm here:
		// http://www.3dsoftware.com/Math/PlaneCurves/EllipseAlgebra/
		// After we normalize the marks, the equation is:
		// a x^2 + 2b xy + cy^2 + f = 0: let a = 1
		//  so the final equation is:
		//  [ xy, y^2, 1] * [2b, c, f]' = [ -x^2 ]'

		var A = {
			xx: marks[0].x * marks[0].y, xy: marks[0].y * marks[0].y, xz: 1,
			yx: marks[1].x * marks[1].y, yy: marks[1].y * marks[1].y, yz: 1,
			zx: marks[2].x * marks[2].y, zy: marks[2].y * marks[2].y, zz: 1,
			dx: 0, dy: 0, dz: 0
		};
		var B = arrayUtil.map(marks, function(item){
			return -Math.pow(item.x, 2);
		});

		// X is 2b, c, f
		var X = matrixUtil.multiplyPoint(matrixUtil.invert(A), B[0], B[1], B[2]);
		var theta = Math.atan2(X.x, 1 - X.y) / 2;

		// rotate the marks back to the canonical form
		var probes = arrayUtil.map(marks, function(item){
			return matrixUtil2d.multiplyPoint(matrixUtil2d.rotate(-theta), item.x, item.y);
		});

		// we are solving the equation: Ax = b
		// A = [x^2, y^2] X = [1/a^2, 1/b^2]', b = [1, 1]'
		// so rx = Math.sqrt(1/ ( inv(A)[1:] * b ) );
		// so ry = Math.sqrt(1/ ( inv(A)[2:] * b ) );

		var a = Math.pow(probes[0].x, 2);
		var b = Math.pow(probes[0].y, 2);
		var c = Math.pow(probes[1].x, 2);
		var d = Math.pow(probes[1].y, 2);

		// the invert matrix is
		// 1/(ad - bc) [ d, -b; -c, a];
		var rx = Math.sqrt((a * d - b * c) / (d - b));
		var ry = Math.sqrt((a * d - b * c) / (a - c));
		if(rx < ry){
			var t = rx;
			rx = ry;
			ry = t;
			theta -= Math.PI/2;
		}

		var top = matrixUtil.multiplyPoint(m,
			VectorUtil.sum(this.object.center, {x: 0, y:0, z: this.object.height}));

		var gradient = this.fillStyle.type == "constant" ? this.fillStyle.color
			: Gradient(this.renderer.lighting, this.fillStyle, this.object.center, this.object.radius, Math.PI, 2 * Math.PI, m);
		if(isNaN(rx) || isNaN(ry) || isNaN(theta)){
			// in case the cap is invisible (parallel to the incident vector)
			rx = this.object.radius, ry = 0, theta = 0;
		}
		this.cache = {center: center, top: top, rx: rx, ry: ry, theta: theta, gradient: gradient};
	},

	draw: function(){
		var c = this.cache, v = VectorUtil, m = matrixUtil2d,
			centers = [c.center, c.top], normal = v.substract(c.top, c.center);
		if(v.dotProduct(normal, this.renderer.lighting.incident) > 0){
			centers = [c.top, c.center];
			normal = v.substract(c.center, c.top);
		}

		var color = this.renderer.lighting[this.fillStyle.type](normal, this.fillStyle.finish, this.fillStyle.color),
			d = Math.sqrt( Math.pow(c.center.x - c.top.x, 2) + Math.pow(c.center.y - c.top.y, 2) );

		if(this.shape){
			this.shape.clear();
		}else{
			this.shape = this.renderer.createGroup();
		}
		
		this.shape.createPath("")
			.moveTo(0, -c.rx)
			.lineTo(d, -c.rx)
			.lineTo(d, c.rx)
			.lineTo(0, c.rx)
			.arcTo(c.ry, c.rx, 0, true, true, 0, -c.rx)
			.setFill(c.gradient).setStroke(this.strokeStyle)
			.setTransform([m.translate(centers[0]),
				m.rotate(Math.atan2(centers[1].y - centers[0].y, centers[1].x - centers[0].x))]);

		if(c.rx > 0 && c.ry > 0){
			this.shape.createEllipse({cx: centers[1].x, cy: centers[1].y, rx: c.rx, ry: c.ry})
				.setFill(color).setStroke(this.strokeStyle)
				.applyTransform(m.rotateAt(c.theta, centers[1]));
		}
	}
});


// the ultimate container of 3D world
declare("dojox.gfx3d.Viewport", gfx.Group, {
	constructor: function(){
		// summary: a viewport/container for 3D objects, which knows
		// the camera and lightings

		// matrix: dojox.gfx3d.matrix: world transform
		// dimension: Object: the dimension of the canvas
		this.dimension = null;

		// objects: Array: all 3d Objects
		this.objects = [];
		// todos: Array: all 3d Objects that needs to redraw
		this.todos = [];

		// FIXME: memory leak?
		this.renderer = this;
		// Using zOrder as the default scheduler
		this.schedule = gfx3d.scheduler.zOrder;
		this.draw = gfx3d.drawer.conservative;
		// deep: boolean, true means the whole viewport needs to re-render, redraw
		this.deep = false;

		// lights: Array: an array of light objects
		this.lights = [];
		this.lighting = null;
	},

	setCameraTransform: function(matrix){
		// summary: sets a transformation matrix
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		this.camera = matrixUtil.clone(matrix ? matrixUtil.normalize(matrix) : gfx3d.identity, true);
		this.invalidate();
		return this;	// self
	},

	applyCameraRightTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on right side
		//	(this.matrix * matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setCameraTransform([this.camera, matrix]) : this;	// self
	},

	applyCameraLeftTransform: function(matrix){
		// summary: multiplies the existing matrix with an argument on left side
		//	(matrix * this.matrix)
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return matrix ? this.setCameraTransform([matrix, this.camera]) : this;	// self
	},

	applyCameraTransform: function(matrix){
		// summary: a shortcut for dojox.gfx3d.Object.applyRightTransform
		// matrix: dojox.gfx3d.matrix.Matrix: a matrix or a matrix-like object
		//	(see an argument of dojox.gfx3d.matrix.Matrix
		//	constructor for a list of acceptable arguments)
		return this.applyCameraRightTransform(matrix); // self
	},

	setLights: function(/* Array || Object */lights, /* Color, optional */ ambient,
		/* Color, optional */ specular){
		// summary: set the lights
		// lights: Array: an array of light object
		// or lights object
		// ambient: Color: an ambient object
		// specular: Color: an specular object
		this.lights = (lights instanceof Array) ? 
			{sources: lights, ambient: ambient, specular: specular}
				: lights;
		var view = {x: 0, y: 0, z: 1};

		this.lighting = new lightUtil.Model(view, this.lights.sources,
				this.lights.ambient, this.lights.specular);
		this.invalidate();
		return this;
	},

	addLights: function(lights){
		// summary: add new light/lights to the viewport.
		// lights: Array || light object: light object(s)
		return this.setLights(this.lights.sources.concat(lights));
	},

	addTodo: function(newObject){
		// NOTE: Viewport implements almost the same addTodo,
		// except calling invalidate, since invalidate is used as
		// any modification needs to redraw the object itself, call invalidate.
		// then call render.
		if(arrayUtil.every(this.todos,
			function(item){
				return item != newObject;
			}
		)){
			this.todos.push(newObject);
		}
	},

	invalidate: function(){
		this.deep = true;
		this.todos = this.objects;
	},

	setDimensions: function(dim){
		if(dim){
			var w = lang.isString(dim.width) ? parseInt(dim.width)  : dim.width;
			var h = lang.isString(dim.height) ? parseInt(dim.height) : dim.height;
			// there is no rawNode in canvas GFX implementation
			if(this.rawNode){
				var trs = this.rawNode.style;
				trs.height = h;
				trs.width = w;
			}
			this.dimension = {
				width:  w,
				height: h
			};
		}else{
			this.dimension = null;
		}
	},

	render: function(){
		// summary: iterate all children and call their render callback function.
		if(!this.todos.length){ return; }
		// console.debug("Viewport::render");
		var m = matrixUtil;
		
		// Iterate the todos and call render to prepare the rendering:
		for(var x=0; x<this.todos.length; x++){
			this.todos[x].render(matrixUtil.normalize([
				m.cameraRotateXg(180),
				m.cameraTranslate(0, this.dimension.height, 0),
				this.camera
			]), this.deep);
		}

		this.objects = this.schedule(this.objects);
		this.draw(this.todos, this.objects, this);
		this.todos = [];
		this.deep = false;
	}

});

//FIXME: Viewport cannot masquerade as a Group
gfx3d.Viewport.nodeType = gfx.Group.nodeType;

gfx3d._creators = {
	// summary: object creators
	createEdges: function(edges, style){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Edges, edges, style);	// dojox.gfx3d.Edge
	},
	createTriangles: function(tris, style){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Triangles, tris, style);	// dojox.gfx3d.Edge
	},
	createQuads: function(quads, style){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Quads, quads, style);	// dojox.gfx3d.Edge
	},
	createPolygon: function(points){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Polygon, points);	// dojox.gfx3d.Polygon
	},

	createOrbit: function(orbit){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Orbit, orbit);	// dojox.gfx3d.Cube
	},

	createCube: function(cube){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Cube, cube);	// dojox.gfx3d.Cube
	},

	createCylinder: function(cylinder){
		// summary: creates an triangle object
		// points: Array of points || Object
		return this.create3DObject(gfx3d.Cylinder, cylinder);	// dojox.gfx3d.Cube
	},

	createPath3d: function(path){
		// summary: creates an edge object
		// line: Object: a edge object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Path3d, path);	// dojox.gfx3d.Edge
	},
	createScene: function(){
		// summary: creates an triangle object
		// line: Object: a triangle object (see dojox.gfx3d.defaultPath)
		return this.create3DObject(gfx3d.Scene);	// dojox.gfx3d.Scene
	},

	create3DObject: function(objectType, rawObject, style){
		// summary: creates an instance of the passed shapeType class
		// shapeType: Function: a class constructor to create an instance of
		// rawShape: Object: properties to be passed in to the classes "setShape" method
		var obj = new objectType();
		this.adopt(obj);
		if(rawObject){ obj.setObject(rawObject, style); }
		return obj;	// dojox.gfx3d.Object
	},
	// todo : override the add/remove if necessary
	adopt: function(obj){
		// summary: adds a shape to the list
		// shape: dojox.gfx.Shape: a shape
		obj.renderer = this.renderer; // obj._setParent(this, null); more TODOs HERER?
		obj.parent = this;
		this.objects.push(obj);
		this.addTodo(obj);
		return this;
	},
	abandon: function(obj, silently){
		// summary: removes a shape from the list
		// silently: Boolean?: if true, do not redraw a picture yet
		for(var i = 0; i < this.objects.length; ++i){
			if(this.objects[i] == obj){
				this.objects.splice(i, 1);
			}
		}
		// if(this.rawNode == shape.rawNode.parentNode){
		//	this.rawNode.removeChild(shape.rawNode);
		// }
		// obj._setParent(null, null);
		obj.parent = null;
		return this;	// self
	},


	setScheduler: function(scheduler){
		this.schedule = scheduler;
	},

	setDrawer: function(drawer){
		this.draw = drawer;
	}
};

lang.extend(gfx3d.Viewport, gfx3d._creators);
lang.extend(gfx3d.Scene, gfx3d._creators);
delete gfx3d._creators;


//FIXME: extending dojox.gfx.Surface and masquerading Viewport as Group is hacky!

// Add createViewport to dojox.gfx.Surface
lang.extend(gfx.Surface, {
	createViewport: function(){
		//FIXME: createObject is non-public method!
		var viewport = this.createObject(gfx3d.Viewport, null, true);
		//FIXME: this may not work with dojox.gfx.Group !!
		viewport.setDimensions(this.getDimensions());
		return viewport;
	}
});

	return gfx3d.Object;
});

},
'dojox/main':function(){
define("dojox/main", ["dojo/_base/kernel"], function(dojo) {
	// module:
	//		dojox/main
	// summary:
	//		The dojox package main module; dojox package is somewhat unusual in that the main module currently just provides an empty object.

	return dojo.dojox;
});
},
'dojox/gfx3d/scheduler':function(){
define("dojox/gfx3d/scheduler", [
	"dojo/_base/lang",
	"dojo/_base/array",	// dojo.forEach, dojo.every
	"dojo/_base/declare",	// dojo.declare
	"./_base",
	"./vector"
], function(lang, arrayUtil, declare, gfx3d, vectorUtil){

gfx3d.scheduler = {
	zOrder: function(buffer, order){
		order = order ? order : gfx3d.scheduler.order;
		buffer.sort(function(a, b){
			return order(b) - order(a);
		});
		return buffer;
	},

	bsp: function(buffer, outline){
		// console.debug("BSP scheduler");
		outline = outline ? outline : gfx3d.scheduler.outline;
		var p = new gfx3d.scheduler.BinarySearchTree(buffer[0], outline);
		arrayUtil.forEach(buffer.slice(1), function(item){ p.add(item, outline); });
		return p.iterate(outline);
	},

	// default implementation
	order: function(it){
		return it.getZOrder();
	},

	outline: function(it){
		return it.getOutline();
	}
};

var BST = declare("dojox.gfx3d.scheduler.BinarySearchTree", null, {
	constructor: function(obj, outline){
		// summary: build the binary search tree, using binary space partition algorithm.
		// The idea is for any polygon, for example, (a, b, c), the space is divided by
		// the plane into two space: plus and minus.
		//
		// for any arbitary vertex p, if(p - a) dotProduct n = 0, p is inside the plane,
		// > 0, p is in the plus space, vice versa for minus space.
		// n is the normal vector that is perpendicular the plate, defined as:
		//            n = ( b - a) crossProduct ( c - a )
		//
		// in this implementation, n is declared as normal, ,a is declared as orient.
		//
		// obj: object: dojox.gfx3d.Object
		this.plus = null;
		this.minus = null;
		this.object = obj;

		var o = outline(obj);
		this.orient = o[0];
		this.normal = vectorUtil.normalize(o);
	},

	add: function(obj, outline){
		var epsilon = 0.5,
			o = outline(obj),
			v = vectorUtil,
			n = this.normal,
			a = this.orient,
			BST = gfx3d.scheduler.BinarySearchTree;

		if(
			arrayUtil.every(o, function(item){
				return Math.floor(epsilon + v.dotProduct(n, v.substract(item, a))) <= 0;
			})
		){
			if(this.minus){
				this.minus.add(obj, outline);
			}else{
				this.minus = new BST(obj, outline);
			}
		}else if(
			arrayUtil.every(o, function(item){
				return Math.floor(epsilon + v.dotProduct(n, v.substract(item, a))) >= 0;
			})
		){
			if(this.plus){
				this.plus.add(obj, outline);
			} else {
				this.plus = new BST(obj, outline);
			}
		}else{
			/*
			arrayUtil.forEach(o, function(item){
				console.debug(v.dotProduct(n, v.substract(item, a)));
			});
			*/
			throw "The case: polygon cross siblings' plate is not implemented yet";
		}
	},

	iterate: function(outline){
		var epsilon = 0.5;
		var v = vectorUtil;
		var sorted = [];
		var subs = null;
		// FIXME: using Infinity here?
		var view = {x: 0, y: 0, z: -10000};
		if(Math.floor( epsilon + v.dotProduct(this.normal, v.substract(view, this.orient))) <= 0){
			subs = [this.plus, this.minus];
		}else{
			subs = [this.minus, this.plus];
		}

		if(subs[0]){
			sorted = sorted.concat(subs[0].iterate());
		}

		sorted.push(this.object);

		if(subs[1]){
			sorted = sorted.concat(subs[1].iterate());
		}
		return sorted;
	}

});

gfx3d.drawer = {
	conservative: function(todos, objects, viewport){
		// console.debug('conservative draw');
		arrayUtil.forEach(this.objects, function(item){
			item.destroy();
		});
		arrayUtil.forEach(objects, function(item){
			item.draw(viewport.lighting);
		});
	},
	chart: function(todos, objects, viewport){
		// NOTE: ondemand may require the todos' objects to use setShape
		// to redraw themselves to maintain the z-order.

		// console.debug('chart draw');
		arrayUtil.forEach(this.todos, function(item){
			item.draw(viewport.lighting);
		});
	}
	// More aggrasive optimization may re-order the DOM nodes using the order
	// of objects, and only elements of todos call setShape.
};

var api = { 
	scheduler: gfx3d.scheduler,
	drawer: gfx3d.drawer,
	BinarySearchTree: BST
};

return api;
});
},
'dojox/gfx3d/matrix':function(){
define("dojox/gfx3d/matrix", ["dojo/_base/lang", "./_base"], function(lang, gfx3d){
	
	// candidates for dojox.math:
	gfx3d.matrix = {
		_degToRad : function(degree){ return Math.PI * degree / 180; },
		_radToDeg : function(radian){ return radian / Math.PI * 180; }
	};
	
	gfx3d.matrix.Matrix3D = function(arg){
		// summary: a 3D matrix object
		// description: Normalizes a 3D matrix-like object. If arrays is passed,
		//		all objects of the array are normalized and multiplied sequentially.
		// arg: Object
		//		a 3D matrix-like object, a number, or an array of such objects
		if(arg){
			if(typeof arg == "number"){
				this.xx = this.yy = this.zz = arg;
			}else if(arg instanceof Array){
				if(arg.length > 0){
					var m = gfx3d.matrix.normalize(arg[0]);
					// combine matrices
					for(var i = 1; i < arg.length; ++i){
						var l = m;
						var r = gfx3d.matrix.normalize(arg[i]);
						m = new gfx3d.matrix.Matrix3D();
						m.xx = l.xx * r.xx + l.xy * r.yx + l.xz * r.zx;
						m.xy = l.xx * r.xy + l.xy * r.yy + l.xz * r.zy;
						m.xz = l.xx * r.xz + l.xy * r.yz + l.xz * r.zz;
						m.yx = l.yx * r.xx + l.yy * r.yx + l.yz * r.zx;
						m.yy = l.yx * r.xy + l.yy * r.yy + l.yz * r.zy;
						m.yz = l.yx * r.xz + l.yy * r.yz + l.yz * r.zz;
						m.zx = l.zx * r.xx + l.zy * r.yx + l.zz * r.zx;
						m.zy = l.zx * r.xy + l.zy * r.yy + l.zz * r.zy;
						m.zz = l.zx * r.xz + l.zy * r.yz + l.zz * r.zz;
						m.dx = l.xx * r.dx + l.xy * r.dy + l.xz * r.dz + l.dx;
						m.dy = l.yx * r.dx + l.yy * r.dy + l.yz * r.dz + l.dy;
						m.dz = l.zx * r.dx + l.zy * r.dy + l.zz * r.dz + l.dz;
					}
					lang.mixin(this, m);
				}
			}else{
				lang.mixin(this, arg);
			}
		}
	};
	
	// the default (identity) matrix, which is used to fill in missing values
	lang.extend(gfx3d.matrix.Matrix3D, {xx: 1, xy: 0, xz: 0, yx: 0, yy: 1, yz: 0, zx: 0, zy: 0, zz: 1, dx: 0, dy: 0, dz: 0});
	
	lang.mixin(gfx3d.matrix, {
		// summary: class constants, and methods of dojox.gfx3d.matrix
		
		// matrix constants
		
		// identity: dojox.gfx3d.matrix.Matrix3D
		//		an identity matrix constant: identity * (x, y, z) == (x, y, z)
		identity: new gfx3d.matrix.Matrix3D(),
		
		// matrix creators
		
		translate: function(a, b, c){
			// summary: forms a translation matrix
			// description: The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value
			// c: Number: a z coordinate value
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({dx: a, dy: b, dz: c}); // dojox.gfx3d.matrix.Matrix3D
			}
			// branch
			// a: Object: a point-like object, which specifies offsets for 3 dimensions
			// b: null
			return new gfx3d.matrix.Matrix3D({dx: a.x, dy: a.y, dz: a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		scale: function(a, b, c){
			// summary: forms a scaling matrix
			// description: The resulting matrix is used to scale (magnify) points by specified offsets.
			// a: Number: a scaling factor used for the x coordinate
			// b: Number: a scaling factor used for the y coordinate
			// c: Number: a scaling factor used for the z coordinate
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({xx: a, yy: b, zz: c}); // dojox.gfx3d.matrix.Matrix3D
			}
			if(typeof a == "number"){
				// branch
				// a: Number: a uniform scaling factor used for the all coordinates
				// b: null
				return new gfx3d.matrix.Matrix3D({xx: a, yy: a, zz: a}); // dojox.gfx3d.matrix.Matrix3D
			}
			// branch
			// a: Object: a point-like object, which specifies scale factors for 3 dimensions
			// b: null
			return new gfx3d.matrix.Matrix3D({xx: a.x, yy: a.y, zz: a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateX: function(angle){
			// summary: forms a rotating matrix (about the x axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({yy: c, yz: -s, zy: s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateXg: function(degree){
			// summary: forms a rotating matrix (about the x axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateX() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateX(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateY: function(angle){
			// summary: forms a rotating matrix (about the y axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xz: s, zx: -s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateYg: function(degree){
			// summary: forms a rotating matrix (about the y axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateY() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateY(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateZ: function(angle){
			// summary: forms a rotating matrix (about the z axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(angle);
			var s = Math.sin(angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		rotateZg: function(degree){
			// summary: forms a rotating matrix (about the z axis)
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateZ() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateZ(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
	
		// camera transformation
		cameraTranslate: function(a, b, c){
			// summary: forms a translation matrix
			// description: The resulting matrix is used to translate (move) points by specified offsets.
			// a: Number: an x coordinate value
			// b: Number: a y coordinate value
			// c: Number: a z coordinate value
			if(arguments.length > 1){
				return new gfx3d.matrix.Matrix3D({dx: -a, dy: -b, dz: -c}); // dojox.gfx3d.matrix.Matrix3D
			}
			// branch
			// a: Object: a point-like object, which specifies offsets for 3 dimensions
			// b: null
			return new gfx3d.matrix.Matrix3D({dx: -a.x, dy: -a.y, dz: -a.z}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateX: function(angle){
			// summary: forms a rotating matrix (about the x axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({yy: c, yz: -s, zy: s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateXg: function(degree){
			// summary: forms a rotating matrix (about the x axis)in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateX() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateX(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateY: function(angle){
			// summary: forms a rotating matrix (about the y axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xz: s, zx: -s, zz: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateYg: function(degree){
			// summary: forms a rotating matrix (about the y axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateY() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateY(dojox.gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateZ: function(angle){
			// summary: forms a rotating matrix (about the z axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified angle.
			// angle: Number: an angle of rotation in radians (>0 for CW)
			var c = Math.cos(-angle);
			var s = Math.sin(-angle);
			return new gfx3d.matrix.Matrix3D({xx: c, xy: -s, yx: s, yy: c}); // dojox.gfx3d.matrix.Matrix3D
		},
		cameraRotateZg: function(degree){
			// summary: forms a rotating matrix (about the z axis) in cameraTransform manner
			// description: The resulting matrix is used to rotate points
			//		around the origin of coordinates (0, 0) by specified degree.
			//		See dojox.gfx3d.matrix.rotateZ() for comparison.
			// degree: Number: an angle of rotation in degrees (>0 for CW)
			return gfx3d.matrix.rotateZ(gfx3d.matrix._degToRad(degree)); // dojox.gfx3d.matrix.Matrix3D
		},
	
		// ensure matrix 3D conformance
		normalize: function(matrix){
			// summary: converts an object to a matrix, if necessary
			// description: Converts any 3D matrix-like object or an array of
			//		such objects to a valid dojox.gfx3d.matrix.Matrix3D object.
			// matrix: Object: an object, which is converted to a matrix, if necessary
			return (matrix instanceof gfx3d.matrix.Matrix3D) ? matrix : new gfx3d.matrix.Matrix3D(matrix); // dojox.gfx3d.matrix.Matrix3D
		},
		
		// common operations
		
		clone: function(matrix){
			// summary: creates a copy of a 3D matrix
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix-like object to be cloned
			var obj = new gfx3d.matrix.Matrix3D();
			for(var i in matrix){
				if(typeof(matrix[i]) == "number" && typeof(obj[i]) == "number" && obj[i] != matrix[i]) obj[i] = matrix[i];
			}
			return obj; // dojox.gfx3d.matrix.Matrix3D
		},
		invert: function(matrix){
			// summary: inverts a 2D matrix
			// matrix: dojox.gfx.matrix.Matrix3D: a 2D matrix-like object to be inverted
			var m = gfx3d.matrix.normalize(matrix);
			var D = m.xx * m.yy * m.zz + m.xy * m.yz * m.zx + m.xz * m.yx * m.zy - m.xx * m.yz * m.zy - m.xy * m.yx * m.zz - m.xz * m.yy * m.zx;
			var M = new gfx3d.matrix.Matrix3D({
				xx: (m.yy * m.zz - m.yz * m.zy) / D,
				xy: (m.xz * m.zy - m.xy * m.zz) / D,
				xz: (m.xy * m.yz - m.xz * m.yy) / D,
				yx: (m.yz * m.zx - m.yx * m.zz) / D,
				yy: (m.xx * m.zz - m.xz * m.zx) / D,
				yz: (m.xz * m.yx - m.xx * m.yz) / D,
				zx: (m.yx * m.zy - m.yy * m.zx) / D,
				zy: (m.xy * m.zx - m.xx * m.zy) / D,
				zz: (m.xx * m.yy - m.xy * m.yx) / D,
				dx: -1 * (m.xy * m.yz * m.dz + m.xz * m.dy * m.zy + m.dx * m.yy * m.zz - m.xy * m.dy * m.zz - m.xz * m.yy * m.dz - m.dx * m.yz * m.zy) / D,
				dy: (m.xx * m.yz * m.dz + m.xz * m.dy * m.zx + m.dx * m.yx * m.zz - m.xx * m.dy * m.zz - m.xz * m.yx * m.dz - m.dx * m.yz * m.zx) / D,
				dz: -1 * (m.xx * m.yy * m.dz + m.xy * m.dy * m.zx + m.dx * m.yx * m.zy - m.xx * m.dy * m.zy - m.xy * m.yx * m.dz - m.dx * m.yy * m.zx) / D
			});
			return M; // dojox.gfx3d.matrix.Matrix3D
		},
		_multiplyPoint: function(m, x, y, z){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// x: Number: an x coordinate of a point
			// y: Number: a y coordinate of a point
			// z: Number: a z coordinate of a point
			return {x: m.xx * x + m.xy * y + m.xz * z + m.dx, y: m.yx * x + m.yy * y + m.yz * z + m.dy, z: m.zx * x + m.zy * y + m.zz * z + m.dz}; // Object
		},
		multiplyPoint: function(matrix, /* Number||Point */ a, /* Number, optional */ b, /* Number, optional */ c){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Number: an x coordinate of a point
			// b: Number: a y coordinate of a point
			// c: Number: a z coordinate of a point
			var m = gfx3d.matrix.normalize(matrix);
			if(typeof a == "number" && typeof b == "number" && typeof c == "number"){
				return gfx3d.matrix._multiplyPoint(m, a, b, c); // Object
			}
			// branch
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Object: a point
			// b: null
			// c: null
			return gfx3d.matrix._multiplyPoint(m, a.x, a.y, a.z); // Object
		},
		multiply: function(matrix){
			// summary: combines matrices by multiplying them sequentially in the given order
			// matrix: dojox.gfx3d.matrix.Matrix3D...: a 3D matrix-like object,
			//		all subsequent arguments are matrix-like objects too
			var m = gfx3d.matrix.normalize(matrix);
			// combine matrices
			for(var i = 1; i < arguments.length; ++i){
				var l = m;
				var r = gfx3d.matrix.normalize(arguments[i]);
				m = new gfx3d.matrix.Matrix3D();
				m.xx = l.xx * r.xx + l.xy * r.yx + l.xz * r.zx;
				m.xy = l.xx * r.xy + l.xy * r.yy + l.xz * r.zy;
				m.xz = l.xx * r.xz + l.xy * r.yz + l.xz * r.zz;
				m.yx = l.yx * r.xx + l.yy * r.yx + l.yz * r.zx;
				m.yy = l.yx * r.xy + l.yy * r.yy + l.yz * r.zy;
				m.yz = l.yx * r.xz + l.yy * r.yz + l.yz * r.zz;
				m.zx = l.zx * r.xx + l.zy * r.yx + l.zz * r.zx;
				m.zy = l.zx * r.xy + l.zy * r.yy + l.zz * r.zy;
				m.zz = l.zx * r.xz + l.zy * r.yz + l.zz * r.zz;
				m.dx = l.xx * r.dx + l.xy * r.dy + l.xz * r.dz + l.dx;
				m.dy = l.yx * r.dx + l.yy * r.dy + l.yz * r.dz + l.dy;
				m.dz = l.zx * r.dx + l.zy * r.dy + l.zz * r.dz + l.dz;
			}
			return m; // dojox.gfx3d.matrix.Matrix3D
		},
	
		_project: function(m, x, y, z){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// x: Number: an x coordinate of a point
			// y: Number: a y coordinate of a point
			// z: Number: a z coordinate of a point
			return {	// Object
				x: m.xx * x + m.xy * y + m.xz * z + m.dx,
				y: m.yx * x + m.yy * y + m.yz * z + m.dy,
				z: m.zx * x + m.zy * y + m.zz * z + m.dz};
		},
		project: function(matrix, /* Number||Point */ a, /* Number, optional */ b, /* Number, optional */ c){
			// summary: applies a matrix to a point
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Number: an x coordinate of a point
			// b: Number: a y coordinate of a point
			// c: Number: a z coordinate of a point
			var m = gfx3d.matrix.normalize(matrix);
			if(typeof a == "number" && typeof b == "number" && typeof c == "number"){
				return gfx3d.matrix._project(m, a, b, c); // Object
			}
			// branch
			// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
			// a: Object: a point
			// b: null
			// c: null
			return gfx3d.matrix._project(m, a.x, a.y, a.z); // Object
		}
	});
	
	// propagate matrix up
	gfx3d.Matrix3D = gfx3d.matrix.Matrix3D;
	
	return gfx3d.matrix;
});
},
'dojox/gfx3d/gradient':function(){
define("dojox/gfx3d/gradient", ["dojo/_base/lang","./matrix","./vector"], 
	function(lang,m,v){

	var gfx3d = lang.getObject("dojox.gfx3d",true);

	var dist = function(a, b){ return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2)); };
	var N = 32;

	gfx3d.gradient = function(model, material, center, radius, from, to, matrix){
		// summary: calculate a cylindrical gradient
		// model: dojox.gfx3d.lighting.Model: color model
		// material: Object: defines visual properties
		// center: Object: center of the cylinder's bottom
		// radius: Number: radius of the cylinder
		// from: Number: from position in radians
		// to: Number: from position in radians
		// matrix: dojox.gfx3d.Matrix3D: the cumulative transformation matrix
		// tolerance: Number: tolerable difference in colors between gradient steps

		var mx = m.normalize(matrix),
			f = m.multiplyPoint(mx, radius * Math.cos(from) + center.x, radius * Math.sin(from) + center.y, center.z),
			t = m.multiplyPoint(mx, radius * Math.cos(to)   + center.x, radius * Math.sin(to)   + center.y, center.z),
			c = m.multiplyPoint(mx, center.x, center.y, center.z), step = (to - from) / N, r = dist(f, t) / 2,
			mod = model[material.type], fin = material.finish, pmt = material.color,
			colors = [{offset: 0, color: mod.call(model, v.substract(f, c), fin, pmt)}];

		for(var a = from + step; a < to; a += step){
			var p = m.multiplyPoint(mx, radius * Math.cos(a) + center.x, radius * Math.sin(a) + center.y, center.z),
				df = dist(f, p), dt = dist(t, p);
			colors.push({offset: df / (df + dt), color: mod.call(model, v.substract(p, c), fin, pmt)});
		}
		colors.push({offset: 1, color: mod.call(model, v.substract(t, c), fin, pmt)});

		return {type: "linear", x1: 0, y1: -r, x2: 0, y2: r, colors: colors};
	};

	return gfx3d.gradient;
});
},
'dojox/gfx3d':function(){
// AMD-ID "dojox/gfx3d"
define("dojox/gfx3d", ["dojo/_base/kernel","dojox","./gfx3d/matrix","./gfx3d/_base","./gfx3d/object"], function(dojo,dojox) {
dojo.getObject("gfx3d", true, dojox);

return dojox.gfx3d;
});

},
'dojox/gfx3d/vector':function(){
define("dojox/gfx3d/vector", ["dojo/_base/lang", "dojo/_base/array", "./_base"],function(lang, arrayUtil, gfx3d) {

gfx3d.vector =  {
	
	sum: function(){
		// summary: sum of the vectors
		var v = {x: 0, y: 0, z:0};
		arrayUtil.forEach(arguments, function(item){ v.x += item.x; v.y += item.y; v.z += item.z; });
		return v;
	},

	center: function(){
		// summary: center of the vectors
		var l = arguments.length;
		if(l == 0){
			return {x: 0, y: 0, z: 0};
		}
		var v = gfx3d.vector.sum(arguments);
		return {x: v.x/l, y: v.y/l, z: v.z/l};
	},

	substract: function(/* Pointer */a, /* Pointer */b){
		return  {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z};
	},

	_crossProduct: function(x, y, z, u, v, w){
		// summary: applies a cross product of two vectorss, (x, y, z) and (u, v, w)
		// x: Number: an x coordinate of a point
		// y: Number: a y coordinate of a point
		// z: Number: a z coordinate of a point
		// u: Number: an x coordinate of a point
		// v: Number: a y coordinate of a point
		// w: Number: a z coordinate of a point
		return {x: y * w - z * v, y: z * u - x * w, z: x * v - y * u}; // Object
	},

	crossProduct: function(/* Number||Point */ a, /* Number||Point */ b, /* Number, optional */ c, /* Number, optional */ d, /* Number, optional */ e, /* Number, optional */ f){
		// summary: applies a matrix to a point
		// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
		// a: Number: an x coordinate of a point
		// b: Number: a y coordinate of a point
		// c: Number: a z coordinate of a point
		// d: Number: an x coordinate of a point
		// e: Number: a y coordinate of a point
		// f: Number: a z coordinate of a point
		if(arguments.length == 6 && arrayUtil.every(arguments, function(item){ return typeof item == "number"; })){
			return gfx3d.vector._crossProduct(a, b, c, d, e, f); // Object
		}
		// branch
		// a: Object: a point
		// b: Object: a point
		// c: null
		// d: null
		// e: null
		// f: null
		return gfx3d.vector._crossProduct(a.x, a.y, a.z, b.x, b.y, b.z); // Object
	},

	_dotProduct: function(x, y, z, u, v, w){
		// summary: applies a cross product of two vectorss, (x, y, z) and (u, v, w)
		// x: Number: an x coordinate of a point
		// y: Number: a y coordinate of a point
		// z: Number: a z coordinate of a point
		// u: Number: an x coordinate of a point
		// v: Number: a y coordinate of a point
		// w: Number: a z coordinate of a point
		return x * u + y * v + z * w; // Number
	},
	dotProduct: function(/* Number||Point */ a, /* Number||Point */ b, /* Number, optional */ c, /* Number, optional */ d, /* Number, optional */ e, /* Number, optional */ f){
		// summary: applies a matrix to a point
		// matrix: dojox.gfx3d.matrix.Matrix3D: a 3D matrix object to be applied
		// a: Number: an x coordinate of a point
		// b: Number: a y coordinate of a point
		// c: Number: a z coordinate of a point
		// d: Number: an x coordinate of a point
		// e: Number: a y coordinate of a point
		// f: Number: a z coordinate of a point
		if(arguments.length == 6 && arrayUtil.every(arguments, function(item){ return typeof item == "number"; })){
			return gfx3d.vector._dotProduct(a, b, c, d, e, f); // Object
		}
		// branch
		// a: Object: a point
		// b: Object: a point
		// c: null
		// d: null
		// e: null
		// f: null
		return gfx3d.vector._dotProduct(a.x, a.y, a.z, b.x, b.y, b.z); // Object
	},

	normalize: function(/* Point||Array*/ a, /* Point */ b, /* Point */ c){
		// summary: find the normal of the implicit surface
		// a: Object: a point
		// b: Object: a point
		// c: Object: a point
		var l, m, n;
		if(a instanceof Array){
			l = a[0]; m = a[1]; n = a[2];
		}else{
			l = a; m = b; n = c;
		}

		var u = gfx3d.vector.substract(m, l);
		var v = gfx3d.vector.substract(n, l);
		return gfx3d.vector.crossProduct(u, v);
	}
};
	return gfx3d.vector;
});

},
'dojox/gfx3d/lighting':function(){
define("dojox/gfx3d/lighting", [
	"dojo/_base/lang",
	"dojo/_base/Color",	// dojo.Color
	"dojo/_base/declare",	// dojo.declare
	"dojox/gfx/_base",
	"./_base"
],function(lang,Color,declare,gfx,gfx3d) {

	var lite = gfx3d.lighting = {
		// color utilities
		black: function(){
			return {r: 0, g: 0, b: 0, a: 1};
		},
		white: function(){
			return {r: 1, g: 1, b: 1, a: 1};
		},
		toStdColor: function(c){
			c = gfx.normalizeColor(c);
			return {r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a};
		},
		fromStdColor: function(c){
			return new Color([Math.round(255 * c.r), Math.round(255 * c.g), Math.round(255 * c.b), c.a]);
		},
		scaleColor: function(s, c){
			return {r: s * c.r, g: s * c.g, b: s * c.b, a: s * c.a};
		},
		addColor: function(a, b){
			return {r: a.r + b.r, g: a.g + b.g, b: a.b + b.b, a: a.a + b.a};
		},
		multiplyColor: function(a, b){
			return {r: a.r * b.r, g: a.g * b.g, b: a.b * b.b, a: a.a * b.a};
		},
		saturateColor: function(c){
			return {
				r: c.r < 0 ? 0 : c.r > 1 ? 1 : c.r,
				g: c.g < 0 ? 0 : c.g > 1 ? 1 : c.g,
				b: c.b < 0 ? 0 : c.b > 1 ? 1 : c.b,
				a: c.a < 0 ? 0 : c.a > 1 ? 1 : c.a
			};
		},
		mixColor: function(c1, c2, s){
			return lite.addColor(lite.scaleColor(s, c1), lite.scaleColor(1 - s, c2));
		},
		diff2Color: function(c1, c2){
			var r = c1.r - c2.r;
			var g = c1.g - c2.g;
			var b = c1.b - c2.b;
			var a = c1.a - c2.a;
			return r * r + g * g + b * b + a * a;
		},
		length2Color: function(c){
			return c.r * c.r + c.g * c.g + c.b * c.b + c.a * c.a;
		},
		
		// vector utilities
		//TODO: move vector utilities from this file to vector.js
		dot: function(a, b){
			return a.x * b.x + a.y * b.y + a.z * b.z;
		},
		scale: function(s, v){
			return {x: s * v.x, y: s * v.y, z: s * v.z};
		},
		add: function(a, b){
			return {x: a.x + b.x, y: a.y + b.y, z: a.z + b.z};
		},
		saturate: function(v){
			return Math.min(Math.max(v, 0), 1);
		},
		length: function(v){
			return Math.sqrt(gfx3d.lighting.dot(v, v));
		},
		normalize: function(v){
			return lite.scale(1 / lite.length(v), v);
		},
		faceforward: function(n, i){
			var p = gfx3d.lighting;
			var s = p.dot(i, n) < 0 ? 1 : -1;
			return p.scale(s, n);
		},
		reflect: function(i, n){
			var p = gfx3d.lighting;
			return p.add(i, p.scale(-2 * p.dot(i, n), n));
		},
		
		// lighting utilities
		diffuse: function(normal, lights){
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					d = lite.dot(lite.normalize(l.direction), normal);
				c = lite.addColor(c, lite.scaleColor(d, l.color));
			}
			return lite.saturateColor(c);
		},
		specular: function(normal, v, roughness, lights){
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					h = lite.normalize(lite.add(lite.normalize(l.direction), v)),
					s = Math.pow(Math.max(0, lite.dot(normal, h)), 1 / roughness);
				c = lite.addColor(c, lite.scaleColor(s, l.color));
			}
			return lite.saturateColor(c);
		},
		phong: function(normal, v, size, lights){
			normal = lite.normalize(normal);
			var c = lite.black();
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i],
					r = lite.reflect(lite.scale(-1, lite.normalize(v)), normal),
					s = Math.pow(Math.max(0, lite.dot(r, lite.normalize(l.direction))), size);
				c = lite.addColor(c, lite.scaleColor(s, l.color));
			}
			return lite.saturateColor(c);
		}
	};

	// this lighting model is derived from RenderMan Interface Specification Version 3.2

	declare("dojox.gfx3d.lighting.Model", null, {
		constructor: function(incident, lights, ambient, specular){
			this.incident = lite.normalize(incident);
			this.lights = [];
			for(var i = 0; i < lights.length; ++i){
				var l = lights[i];
				this.lights.push({direction: lite.normalize(l.direction), color: lite.toStdColor(l.color)});
			}
			this.ambient = lite.toStdColor(ambient.color ? ambient.color : "white");
			this.ambient = lite.scaleColor(ambient.intensity, this.ambient);
			this.ambient = lite.scaleColor(this.ambient.a, this.ambient);
			this.ambient.a = 1;
			this.specular = lite.toStdColor(specular ? specular : "white");
			this.specular = lite.scaleColor(this.specular.a, this.specular);
			this.specular.a = 1;
			this.npr_cool = {r: 0,   g: 0,   b: 0.4, a: 1};
			this.npr_warm = {r: 0.4, g: 0.4, b: 0.2, a: 1};
			this.npr_alpha = 0.2;
			this.npr_beta  = 0.6;
			this.npr_scale = 0.6;
		},
		constant: function(normal, finish, pigment){
			pigment   = lite.toStdColor(pigment);
			var alpha = pigment.a, color = lite.scaleColor(alpha, pigment);
			color.a   = alpha;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		matte: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights)),
				color   = lite.scaleColor(pigment.a, lite.multiplyColor(pigment, lite.addColor(ambient, diffuse)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		metal: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var v = lite.scale(-1, this.incident), specular, color,
				ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident));
			if("phong" in finish){
				specular = lite.scaleColor(shadow * finish.Ks * finish.phong, lite.phong(normal, v, finish.phong_size, this.lights));
			}else{
				specular = lite.scaleColor(shadow * finish.Ks, lite.specular(normal, v, finish.roughness, this.lights));
			}
			color = lite.scaleColor(pigment.a, lite.addColor(lite.multiplyColor(pigment, ambient), lite.multiplyColor(this.specular, specular)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		plastic: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var v = lite.scale(-1, this.incident), specular, color,
				ambient = lite.scaleColor(finish.Ka, this.ambient),
				shadow  = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights));
			if("phong" in finish){
				specular = lite.scaleColor(shadow * finish.Ks * finish.phong, lite.phong(normal, v, finish.phong_size, this.lights));
			}else{
				specular = lite.scaleColor(shadow * finish.Ks, lite.specular(normal, v, finish.roughness, this.lights));
			}
			color = lite.scaleColor(pigment.a, lite.addColor(lite.multiplyColor(pigment, lite.addColor(ambient, diffuse)), lite.multiplyColor(this.specular, specular)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		},
		npr: function(normal, finish, pigment){
			if(typeof finish == "string"){ finish = lite.finish[finish]; }
			pigment = lite.toStdColor(pigment);
			normal  = lite.faceforward(lite.normalize(normal), this.incident);
			var ambient  = lite.scaleColor(finish.Ka, this.ambient),
				shadow   = lite.saturate(-4 * lite.dot(normal, this.incident)),
				diffuse  = lite.scaleColor(shadow * finish.Kd, lite.diffuse(normal, this.lights)),
				color = lite.scaleColor(pigment.a, lite.multiplyColor(pigment, lite.addColor(ambient, diffuse))),
				cool = lite.addColor(this.npr_cool, lite.scaleColor(this.npr_alpha, color)),
				warm = lite.addColor(this.npr_warm, lite.scaleColor(this.npr_beta,  color)),
				d = (1 + lite.dot(this.incident, normal)) / 2,
				color = lite.scaleColor(this.npr_scale, lite.addColor(color, lite.mixColor(cool, warm, d)));
			color.a = pigment.a;
			return lite.fromStdColor(lite.saturateColor(color));
		}
	});


	// POV-Ray basic finishes
	
	gfx3d.lighting.finish = {
	
		// Default
		
		defaults: {Ka: 0.1, Kd: 0.6, Ks: 0.0, roughness: 0.05},
		
		dull:     {Ka: 0.1, Kd: 0.6, Ks: 0.5, roughness: 0.15},
		shiny:    {Ka: 0.1, Kd: 0.6, Ks: 1.0, roughness: 0.001},
		glossy:   {Ka: 0.1, Kd: 0.6, Ks: 1.0, roughness: 0.0001},
		
		phong_dull:   {Ka: 0.1, Kd: 0.6, Ks: 0.5, phong: 0.5, phong_size: 1},
		phong_shiny:  {Ka: 0.1, Kd: 0.6, Ks: 1.0, phong: 1.0, phong_size: 200},
		phong_glossy: {Ka: 0.1, Kd: 0.6, Ks: 1.0, phong: 1.0, phong_size: 300},
	
		luminous: {Ka: 1.0, Kd: 0.0, Ks: 0.0, roughness: 0.05},
	
		// Metals
	
		// very soft and dull
		metalA: {Ka: 0.35, Kd: 0.3, Ks: 0.8, roughness: 1/20},
		// fairly soft and dull
		metalB: {Ka: 0.30, Kd: 0.4, Ks: 0.7, roughness: 1/60},
		// medium reflectivity, holds color well
		metalC: {Ka: 0.25, Kd: 0.5, Ks: 0.8, roughness: 1/80},
		// highly hard and polished, high reflectivity
		metalD: {Ka: 0.15, Kd: 0.6, Ks: 0.8, roughness: 1/100},
		// very highly polished and reflective
		metalE: {Ka: 0.10, Kd: 0.7, Ks: 0.8, roughness: 1/120}
	};

	return lite;
});

},
'*noref':1}});
define("dojox/_dojox_gfx3d", [], 1);
require(["dojox/gfx3d"]);

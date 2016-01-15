require({cache:{
'dojox/collections':function(){
define("dojox/collections", ["./collections/_base"], function(collections){
	return collections;
});

},
'dojox/collections/Queue':function(){
define("dojox/collections/Queue", ["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){
/*=====
var dxc = dojox.collections;
=====*/
	dxc.Queue=function(/* array? */arr){
		//	summary
		//	return an object of type dojox.collections.Queue
		var q=[];
		if (arr){
			q=q.concat(arr);
		}
		this.count=q.length;
		this.clear=function(){
			//	summary
			//	clears the internal collection
			q=[];
			this.count=q.length;
		};
		this.clone=function(){
			//	summary
			//	creates a new Queue based on this one
			return new dxc.Queue(q);	//	dojox.collections.Queue
		};
		this.contains=function(/* object */ o){
			//	summary
			//	Check to see if the passed object is an element in this queue
			for(var i=0; i<q.length; i++){
				if (q[i]==o){
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.copyTo=function(/* array */ arr, /* int */ i){
			//	summary
			//	Copy the contents of this queue into the passed array at index i.
			arr.splice(i,0,q);
		};
		this.dequeue=function(){
			//	summary
			//	shift the first element off the queue and return it
			var r=q.shift();
			this.count=q.length;
			return r;	//	object
		};
		this.enqueue=function(/* object */ o){
			//	summary
			//	put the passed object at the end of the queue
			this.count=q.push(o);
		};
		this.forEach=function(/* function */ fn, /* object? */ scope){
			//	summary
			//	functional iterator, following the mozilla spec.
			dojo.forEach(q, fn, scope);
		};
		this.getIterator=function(){
			//	summary
			//	get an Iterator based on this queue.
			return new dxc.Iterator(q);	//	dojox.collections.Iterator
		};
		this.peek=function(){
			//	summary
			//	get the next element in the queue without altering the queue.
			return q[0];
		};
		this.toArray=function(){
			//	summary
			//	return an array based on the internal array of the queue.
			return [].concat(q);
		};
	};
	return dxc.Queue;
});

},
'dojox/collections/Set':function(){
define("dojox/collections/Set", ["./_base", "./ArrayList"], function(dxc, ArrayList){
/*=====
var dxc = dojox.collections;
=====*/
	dxc.Set=new (function(){
		function conv(arr){
			if(arr.constructor==Array){
				return new ArrayList(arr);	//	dojox.collections.ArrayList
			}
			return arr;		//	dojox.collections.ArrayList
		}
		this.union = function(/* array */setA, /* array */setB){
			//	summary
			//	Return the union of the two passed sets.
			setA=conv(setA);
			setB=conv(setB);
			var result = new ArrayList(setA.toArray());
			var e = setB.getIterator();
			while(!e.atEnd()){
				var item=e.get();
				if(!result.contains(item)){
					result.add(item);
				}
			}
			return result;	//	dojox.collections.ArrayList
		};
		this.intersection = function(/* array */setA, /* array */setB){
			//	summary
			//	Return the intersection of the two passed sets.
			setA=conv(setA);
			setB=conv(setB);
			var result = new ArrayList();
			var e = setB.getIterator();
			while(!e.atEnd()){
				var item=e.get();
				if(setA.contains(item)){
					result.add(item);
				}
			}
			return result;	//	dojox.collections.ArrayList
		};
		this.difference = function(/* array */setA, /* array */setB){
			//	summary
			//	Returns everything in setA that is not in setB.
			setA=conv(setA);
			setB=conv(setB);
			var result = new ArrayList();
			var e=setA.getIterator();
			while(!e.atEnd()){
				var item=e.get();
				if(!setB.contains(item)){
					result.add(item);
				}
			}
			return result;	//	dojox.collections.ArrayList
		};
		this.isSubSet = function(/* array */setA, /* array */setB) {
			//	summary
			//	Returns if set B is a subset of set A.
			setA=conv(setA);
			setB=conv(setB);
			var e = setA.getIterator();
			while(!e.atEnd()){
				if(!setB.contains(e.get())){
					return false;	//	boolean
				}
			}
			return true;	//	boolean
		};
		this.isSuperSet = function(/* array */setA, /* array */setB){
			//	summary
			//	Returns if set B is a superset of set A.
			setA=conv(setA);
			setB=conv(setB);
			var e = setB.getIterator();
			while(!e.atEnd()){
				if(!setA.contains(e.get())){
					return false;	//	boolean
				}
			}
			return true;	//	boolean
		};
	})();
	return dxc.Set;
});

},
'dojox/collections/SortedList':function(){
define("dojox/collections/SortedList", ["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){
/*=====
var dxc = dojox.collections;
=====*/
	dxc.SortedList=function(/* object? */ dictionary){
		//	summary
		//	creates a collection that acts like a dictionary but is also internally sorted.
		//	Note that the act of adding any elements forces an internal resort, making this object potentially slow.
		var _this=this;
		var items={};
		var q=[];
		var sorter=function(a,b){
			if (a.key > b.key) return 1;
			if (a.key < b.key) return -1;
			return 0;
		};
		var build=function(){
			q=[];
			var e=_this.getIterator();
			while (!e.atEnd()){
				q.push(e.get());
			}
			q.sort(sorter);
		};
		var testObject={};

		this.count=q.length;
		this.add=function(/* string */ k,/* object */v){
			//	summary
			//	add the passed value to the dictionary at location k
			if (!items[k]) {
				items[k]=new dxc.DictionaryEntry(k,v);
				this.count=q.push(items[k]);
				q.sort(sorter);
			}
		};
		this.clear=function(){
			//	summary
			//	clear the internal collections
			items={};
			q=[];
			this.count=q.length;
		};
		this.clone=function(){
			//	summary
			//	create a clone of this sorted list
			return new dxc.SortedList(this);	//	dojox.collections.SortedList
		};
		this.contains=this.containsKey=function(/* string */ k){
			//	summary
			//	Check to see if the list has a location k
			if(testObject[k]){
				return false;			//	bool
			}
			return (items[k]!=null);	//	bool
		};
		this.containsValue=function(/* object */ o){
			//	summary
			//	Check to see if this list contains the passed object
			var e=this.getIterator();
			while (!e.atEnd()){
				var item=e.get();
				if(item.value==o){
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.copyTo=function(/* array */ arr, /* int */ i){
			//	summary
			//	copy the contents of the list into array arr at index i
			var e=this.getIterator();
			var idx=i;
			while(!e.atEnd()){
				arr.splice(idx,0,e.get());
				idx++;
			}
		};
		this.entry=function(/* string */ k){
			//	summary
			//	return the object at location k
			return items[k];	//	dojox.collections.DictionaryEntry
		};
		this.forEach=function(/* function */ fn, /* object? */ scope){
			//	summary
			//	functional iterator, following the mozilla spec.
			dojo.forEach(q, fn, scope);
		};
		this.getByIndex=function(/* int */ i){
			//	summary
			//	return the item at index i
			return q[i].valueOf();	//	object
		};
		this.getIterator=function(){
			//	summary
			//	get an iterator for this object
			return new dxc.DictionaryIterator(items);	//	dojox.collections.DictionaryIterator
		};
		this.getKey=function(/* int */ i){
			//	summary
			//	return the key of the item at index i
			return q[i].key;
		};
		this.getKeyList=function(){
			//	summary
			//	return an array of the keys set in this list
			var arr=[];
			var e=this.getIterator();
			while (!e.atEnd()){
				arr.push(e.get().key);
			}
			return arr;	//	array
		};
		this.getValueList=function(){
			//	summary
			//	return an array of values in this list
			var arr=[];
			var e=this.getIterator();
			while (!e.atEnd()){
				arr.push(e.get().value);
			}
			return arr;	//	array
		};
		this.indexOfKey=function(/* string */ k){
			//	summary
			//	return the index of the passed key.
			for (var i=0; i<q.length; i++){
				if (q[i].key==k){
					return i;	//	int
				}
			}
			return -1;	//	int
		};
		this.indexOfValue=function(/* object */ o){
			//	summary
			//	return the first index of object o
			for (var i=0; i<q.length; i++){
				if (q[i].value==o){
					return i;	//	int
				}
			}
			return -1;	//	int
		};
		this.item=function(/* string */ k){
			// 	summary
			//	return the value of the object at location k.
			if(k in items && !testObject[k]){
				return items[k].valueOf();	//	object
			}
			return undefined;	//	object
		};
		this.remove=function(/* string */k){
			// 	summary
			//	remove the item at location k and rebuild the internal collections.
			delete items[k];
			build();
			this.count=q.length;
		};
		this.removeAt=function(/* int */ i){
			//	summary
			//	remove the item at index i, and rebuild the internal collections.
			delete items[q[i].key];
			build();
			this.count=q.length;
		};
		this.replace=function(/* string */ k, /* object */ v){
			//	summary
			//	Replace an existing item if it's there, and add a new one if not.
			if (!items[k]){
				//	we're adding a new object, return false
				this.add(k,v);
				return false; // bool
			}else{
				//	we're replacing an object, return true
				items[k]=new dxc.DictionaryEntry(k,v);
				build();
				return true; // bool
			}
		};
		this.setByIndex=function(/* int */ i, /* object */ o){
			//	summary
			//	set an item by index
			items[q[i].key].value=o;
			build();
			this.count=q.length;
		};
		if (dictionary){
			var e=dictionary.getIterator();
			while (!e.atEnd()){
				var item=e.get();
				q[q.length]=items[item.key]=new dxc.DictionaryEntry(item.key,item.value);
			}
			q.sort(sorter);
		}
	};
	return dxc.SortedList;
});

},
'dojox/collections/ArrayList':function(){
define("dojox/collections/ArrayList", ["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){
/*=====
var dxc = dojox.collections;
=====*/
	dxc.ArrayList=function(/* array? */arr){
		//	summary
		//	Returns a new object of type dojox.collections.ArrayList
		var items=[];
		if(arr) items=items.concat(arr);
		this.count=items.length;
		this.add=function(/* object */obj){
			//	summary
			//	Add an element to the collection.
			items.push(obj);
			this.count=items.length;
		};
		this.addRange=function(/* array */a){
			//	summary
			//	Add a range of objects to the ArrayList
			if(a.getIterator){
				var e=a.getIterator();
				while(!e.atEnd()){
					this.add(e.get());
				}
				this.count=items.length;
			}else{
				for(var i=0; i<a.length; i++){
					items.push(a[i]);
				}
				this.count=items.length;
			}
		};
		this.clear=function(){
			//	summary
			//	Clear all elements out of the collection, and reset the count.
			items.splice(0, items.length);
			this.count=0;
		};
		this.clone=function(){
			//	summary
			//	Clone the array list
			return new dxc.ArrayList(items);	//	dojox.collections.ArrayList
		};
		this.contains=function(/* object */obj){
			//	summary
			//	Check to see if the passed object is a member in the ArrayList
			for(var i=0; i < items.length; i++){
				if(items[i] == obj) {
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.forEach=function(/* function */ fn, /* object? */ scope){
			//	summary
			//	functional iterator, following the mozilla spec.
			dojo.forEach(items, fn, scope);
		};
		this.getIterator=function(){
			//	summary
			//	Get an Iterator for this object
			return new dxc.Iterator(items);	//	dojox.collections.Iterator
		};
		this.indexOf=function(/* object */obj){
			//	summary
			//	Return the numeric index of the passed object; will return -1 if not found.
			for(var i=0; i < items.length; i++){
				if(items[i] == obj) {
					return i;	//	int
				}
			}
			return -1;	// int
		};
		this.insert=function(/* int */ i, /* object */ obj){
			//	summary
			//	Insert the passed object at index i
			items.splice(i,0,obj);
			this.count=items.length;
		};
		this.item=function(/* int */ i){
			//	summary
			//	return the element at index i
			return items[i];	//	object
		};
		this.remove=function(/* object */obj){
			//	summary
			//	Look for the passed object, and if found, remove it from the internal array.
			var i=this.indexOf(obj);
			if(i >=0) {
				items.splice(i,1);
			}
			this.count=items.length;
		};
		this.removeAt=function(/* int */ i){
			//	summary
			//	return an array with function applied to all elements
			items.splice(i,1);
			this.count=items.length;
		};
		this.reverse=function(){
			//	summary
			//	Reverse the internal array
			items.reverse();
		};
		this.sort=function(/* function? */ fn){
			//	summary
			//	sort the internal array
			if(fn){
				items.sort(fn);
			}else{
				items.sort();
			}
		};
		this.setByIndex=function(/* int */ i, /* object */ obj){
			//	summary
			//	Set an element in the array by the passed index.
			items[i]=obj;
			this.count=items.length;
		};
		this.toArray=function(){
			//	summary
			//	Return a new array with all of the items of the internal array concatenated.
			return [].concat(items);
		}
		this.toString=function(/* string */ delim){
			//	summary
			//	implementation of toString, follows [].toString();
			return items.join((delim||","));
		};
	};
	return dxc.ArrayList;
});

},
'dojox/collections/_base':function(){
define("dojox/collections/_base", ["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array"], 
  function(dojo, lang, arr){
	var collections = lang.getObject("dojox.collections", true);

/*=====
	collections = dojox.collections;
=====*/

	collections.DictionaryEntry=function(/* string */k, /* object */v){
		//	summary
		//	return an object of type dojox.collections.DictionaryEntry
		this.key=k;
		this.value=v;
		this.valueOf=function(){
			return this.value; 	//	object
		};
		this.toString=function(){
			return String(this.value);	//	string
		};
	}

	/*	Iterators
	 *	The collections.Iterators (Iterator and DictionaryIterator) are built to
	 *	work with the Collections included in this module.  However, they *can*
	 *	be used with arrays and objects, respectively, should one choose to do so.
	 */
	collections.Iterator=function(/* array */a){
		//	summary
		//	return an object of type dojox.collections.Iterator
		var position=0;
		this.element=a[position]||null;
		this.atEnd=function(){
			//	summary
			//	Test to see if the internal cursor has reached the end of the internal collection.
			return (position>=a.length);	//	bool
		};
		this.get=function(){
			//	summary
			//	Get the next member in the collection.
			if(this.atEnd()){
				return null;		//	object
			}
			this.element=a[position++];
			return this.element;	//	object
		};
		this.map=function(/* function */fn, /* object? */scope){
			//	summary
			//	Functional iteration with optional scope.
			return arr.map(a, fn, scope);
		};
		this.reset=function(){
			//	summary
			//	reset the internal cursor.
			position=0;
			this.element=a[position];
		};
	}

	/*	Notes:
	 *	The DictionaryIterator no longer supports a key and value property;
	 *	the reality is that you can use this to iterate over a JS object
	 *	being used as a hashtable.
	 */
	collections.DictionaryIterator=function(/* object */obj){
		//	summary
		//	return an object of type dojox.collections.DictionaryIterator
		var a=[];	//	Create an indexing array
		var testObject={};
		for(var p in obj){
			if(!testObject[p]){
				a.push(obj[p]);	//	fill it up
			}
		}
		var position=0;
		this.element=a[position]||null;
		this.atEnd=function(){
			//	summary
			//	Test to see if the internal cursor has reached the end of the internal collection.
			return (position>=a.length);	//	bool
		};
		this.get=function(){
			//	summary
			//	Get the next member in the collection.
			if(this.atEnd()){
				return null;		//	object
			}
			this.element=a[position++];
			return this.element;	//	object
		};
		this.map=function(/* function */fn, /* object? */scope){
			//	summary
			//	Functional iteration with optional scope.
			return arr.map(a, fn, scope);
		};
		this.reset=function() {
			//	summary
			//	reset the internal cursor.
			position=0;
			this.element=a[position];
		};
	};

	return collections;
});

},
'dojox/collections/Dictionary':function(){
define("dojox/collections/Dictionary", ["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){
/*=====
var dxc = dojox.collections;
=====*/
	dxc.Dictionary=function(/* dojox.collections.Dictionary? */dictionary){
		//	summary
		//	Returns an object of type dojox.collections.Dictionary
		var items={};
		this.count=0;

		//	comparator for property addition and access.
		var testObject={};

		this.add=function(/* string */k, /* object */v){
			//	summary
			//	Add a new item to the Dictionary.
			var b=(k in items);
			items[k]=new dxc.DictionaryEntry(k,v);
			if(!b){
				this.count++;
			}
		};
		this.clear=function(){
			//	summary
			//	Clears the internal dictionary.
			items={};
			this.count=0;
		};
		this.clone=function(){
			//	summary
			//	Returns a new instance of dojox.collections.Dictionary; note the the dictionary is a clone but items might not be.
			return new dxc.Dictionary(this);	//	dojox.collections.Dictionary
		};
		this.contains=this.containsKey=function(/* string */k){
			//	summary
			//	Check to see if the dictionary has an entry at key "k".
			if(testObject[k]){
				return false;			// bool
			}
			return (items[k]!=null);	//	bool
		};
		this.containsValue=function(/* object */v){
			//	summary
			//	Check to see if the dictionary has an entry with value "v".
			var e=this.getIterator();
			while(e.get()){
				if(e.element.value==v){
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.entry=function(/* string */k){
			//	summary
			//	Accessor method; similar to dojox.collections.Dictionary.item but returns the actual Entry object.
			return items[k];	//	dojox.collections.DictionaryEntry
		};
		this.forEach=function(/* function */ fn, /* object? */ scope){
			//	summary
			//	functional iterator, following the mozilla spec.
			var a=[];	//	Create an indexing array
			for(var p in items) {
				if(!testObject[p]){
					a.push(items[p]);	//	fill it up
				}
			}
			dojo.forEach(a, fn, scope);
		};
		this.getKeyList=function(){
			//	summary
			//	Returns an array of the keys in the dictionary.
			return (this.getIterator()).map(function(entry){
				return entry.key;
			});	//	array
		};
		this.getValueList=function(){
			//	summary
			//	Returns an array of the values in the dictionary.
			return (this.getIterator()).map(function(entry){
				return entry.value;
			});	//	array
		};
		this.item=function(/* string */k){
			//	summary
			//	Accessor method.
			if(k in items){
				return items[k].valueOf();	//	object
			}
			return undefined;	//	object
		};
		this.getIterator=function(){
			//	summary
			//	Gets a dojox.collections.DictionaryIterator for iteration purposes.
			return new dxc.DictionaryIterator(items);	//	dojox.collections.DictionaryIterator
		};
		this.remove=function(/* string */k){
			//	summary
			//	Removes the item at k from the internal collection.
			if(k in items && !testObject[k]){
				delete items[k];
				this.count--;
				return true;	//	bool
			}
			return false;	//	bool
		};

		if (dictionary){
			var e=dictionary.getIterator();
			while(e.get()) {
				 this.add(e.element.key, e.element.value);
			}
		}
	};
	return dxc.Dictionary;
});

},
'dojox/collections/BinaryTree':function(){
define("dojox/collections/BinaryTree", ["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){
/*=====
var dxc = dojox.collections;
=====*/
	dxc.BinaryTree=function(data){
		function node(data, rnode, lnode){
			this.value=data||null;
			this.right=rnode||null;
			this.left=lnode||null;
			this.clone=function(){
				var c=new node();
				if(this.value.value){
					c.value=this.value.clone();
				}else{
					c.value=this.value;
				}
				if(this.left!=null){
					c.left=this.left.clone();
				}
				if(this.right!=null){
					c.right=this.right.clone();
				}
				return c;
			}
			this.compare=function(n){
				if(this.value>n.value){ return 1; }
				if(this.value<n.value){ return -1; }
				return 0;
			}
			this.compareData=function(d){
				if(this.value>d){ return 1; }
				if(this.value<d){ return -1; }
				return 0;
			}
		}

		function inorderTraversalBuildup(current, a){
			if(current){
				inorderTraversalBuildup(current.left, a);
				a.push(current.value);
				inorderTraversalBuildup(current.right, a);
			}
		}

		function preorderTraversal(current, sep){
			var s="";
			if (current){
				s=current.value.toString() + sep;
				s+=preorderTraversal(current.left, sep);
				s+=preorderTraversal(current.right, sep);
			}
			return s;
		}
		function inorderTraversal(current, sep){
			var s="";
			if (current){
				s=inorderTraversal(current.left, sep);
				s+=current.value.toString() + sep;
				s+=inorderTraversal(current.right, sep);
			}
			return s;
		}
		function postorderTraversal(current, sep){
			var s="";
			if (current){
				s=postorderTraversal(current.left, sep);
				s+=postorderTraversal(current.right, sep);
				s+=current.value.toString() + sep;
			}
			return s;
		}
		
		function searchHelper(current, data){
			if(!current){ return null; }
			var i=current.compareData(data);
			if(i==0){ return current; }
			if(i>0){ return searchHelper(current.left, data); }
			else{ return searchHelper(current.right, data); }
		}

		this.add=function(data){
			var n=new node(data);
			var i;
			var current=root;
			var parent=null;
			while(current){
				i=current.compare(n);
				if(i==0){ return; }
				parent=current;
				if(i>0){ current=current.left; }
				else{ current=current.right; }
			}
			this.count++;
			if(!parent){
				root=n;
			}else{
				i=parent.compare(n);
				if(i>0){
					parent.left=n;
				}else{
					parent.right=n;
				}
			}
		};
		this.clear=function(){
			root=null;
			this.count=0;
		};
		this.clone=function(){
			var c=new dxc.BinaryTree();
			var itr=this.getIterator();
			while(!itr.atEnd()){
				c.add(itr.get());
			}
			return c;
		};
		this.contains=function(data){
			return this.search(data) != null;
		};
		this.deleteData=function(data){
			var current=root;
			var parent=null;
			var i=current.compareData(data);
			while(i!=0&&current!=null){
				if(i>0){
					parent=current;
					current=current.left;
				}else if(i<0){
					parent=current;
					current=current.right;
				}
				i=current.compareData(data);
			}
			if(!current){ return; }
			this.count--;
			if(!current.right){
				if(!parent){
					root=current.left;
				}else{
					i=parent.compare(current);
					if(i>0){ parent.left=current.left; }
					else if(i<0){ parent.right=current.left; }
				}
			}
			else if(!current.right.left){
				if(!parent){
					root=current.right;
				}else{
					i=parent.compare(current);
					if(i>0){ parent.left=current.right; }
					else if(i<0){ parent.right=current.right; }
				}
			}
			else{
				var leftmost=current.right.left;
				var lmParent=current.right;
				while(leftmost.left!=null){
					lmParent=leftmost;
					leftmost=leftmost.left;
				}
				lmParent.left=leftmost.right;
				leftmost.left=current.left;
				leftmost.right=current.right;
				if(!parent){
					root=leftmost;
				}else{
					i=parent.compare(current);
					if(i>0){ parent.left=leftmost; }
					else if(i<0){ parent.right=leftmost; }
				}
			}
		};
		this.getIterator=function(){
			var a=[];
			inorderTraversalBuildup(root, a);
			return new dxc.Iterator(a);
		};
		this.search=function(data){
			return searchHelper(root, data);
		};
		this.toString=function(order, sep){
			if(!order){ order=dxc.BinaryTree.TraversalMethods.Inorder; }
			if(!sep){ sep=","; }
			var s="";
			switch(order){
				case dxc.BinaryTree.TraversalMethods.Preorder:
					s=preorderTraversal(root, sep);
					break;
				case dxc.BinaryTree.TraversalMethods.Inorder:
					s=inorderTraversal(root, sep);
					break;
				case dxc.BinaryTree.TraversalMethods.Postorder:
					s=postorderTraversal(root, sep);
					break;
			};
			if(s.length==0){ return ""; }
			else{ return s.substring(0, s.length - sep.length); }
		};

		this.count=0;
		var root=this.root=null;
		if(data){
			this.add(data);
		}
	}
	dxc.BinaryTree.TraversalMethods={
		Preorder: 1, Inorder: 2, Postorder: 3
	};
	return dxc.BinaryTree;
});

},
'dojox/collections/Stack':function(){
define("dojox/collections/Stack", ["dojo/_base/kernel", "dojo/_base/array", "./_base"], function(dojo, darray, dxc){
/*=====
var dxc = dojox.collections;
=====*/
	dxc.Stack=function(/* array? */arr){
		//	summary
		//	returns an object of type dojox.collections.Stack
		var q=[];
		if (arr) q=q.concat(arr);
		this.count=q.length;
		this.clear=function(){
			//	summary
			//	Clear the internal array and reset the count
			q=[];
			this.count=q.length;
		};
		this.clone=function(){
			//	summary
			//	Create and return a clone of this Stack
			return new dxc.Stack(q);
		};
		this.contains=function(/* object */o){
			//	summary
			//	check to see if the stack contains object o
			for (var i=0; i<q.length; i++){
				if (q[i] == o){
					return true;	//	bool
				}
			}
			return false;	//	bool
		};
		this.copyTo=function(/* array */ arr, /* int */ i){
			//	summary
			//	copy the stack into array arr at index i
			arr.splice(i,0,q);
		};
		this.forEach=function(/* function */ fn, /* object? */ scope){
			//	summary
			//	functional iterator, following the mozilla spec.
			dojo.forEach(q, fn, scope);
		};
		this.getIterator=function(){
			//	summary
			//	get an iterator for this collection
			return new dxc.Iterator(q);	//	dojox.collections.Iterator
		};
		this.peek=function(){
			//	summary
			//	Return the next item without altering the stack itself.
			return q[(q.length-1)];	//	object
		};
		this.pop=function(){
			//	summary
			//	pop and return the next item on the stack
			var r=q.pop();
			this.count=q.length;
			return r;	//	object
		};
		this.push=function(/* object */ o){
			//	summary
			//	Push object o onto the stack
			this.count=q.push(o);
		};
		this.toArray=function(){
			//	summary
			//	create and return an array based on the internal collection
			return [].concat(q);	//	array
		};
	};
	return dxc.Stack;
});

},
'*noref':1}});
define("dojox/_dojox_collections", [], 1);
require(["dojox/collections","dojox/collections/ArrayList","dojox/collections/BinaryTree","dojox/collections/Dictionary","dojox/collections/Queue","dojox/collections/Set","dojox/collections/SortedList","dojox/collections/Stack"]);

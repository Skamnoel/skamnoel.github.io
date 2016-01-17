$(function() {

	SyntaxHighlighter.defaults['toolbar'] = false;

	/**
	 * 				MODELS  (& COLLECTIONS)
	 */
	var BlockModel = Backbone.Model.extend({
		defaults: {
			code: null,
			title: null,
			description: null,
			explanation: null,
			showDescTxt: 'Объяснение'
		}
	});

	var BlocksCollection = Backbone.Collection.extend({
		model: BlockModel
	});

	var JsExample = Backbone.Model.extend({
		title: null,
		blocks: []
	});

	var JsExamplesCollection = Backbone.Collection.extend({
		model: JsExample
	});

	/**
	 * 				VIEWS
	 */

	// ***************************** MENU VIEW START *****************************
	// view for single menu item:
	var MenuItemView = Backbone.View.extend({

		tagName: 'li',

		className: 'menu-item',

		template: _.template($('#menuItemTemplate').html()),

		events: {
			'click': 'menuClicked'
		},

		initialize: function() {
			this.model.on('hide', this.hide, this);
		},

		hide: function() {
			this.$el.fadeOut();
		},

		menuClicked: function(e) {
			this.model.trigger("selected", this.model);
		},

		render: function() {
			var parsedTemplate = this.template(this.model.attributes);
			this.$el.html(parsedTemplate);
			if (!this.model.get('title')) this.el.style['display'] = 'none';
			return this;
		}
	});

	// menu list view:
	var MenuListView = Backbone.View.extend({

		tagName: 'ul',
		className: 'menu-list',

		initialize: function() {
			this.collection.on('add', this.addOne, this);
			this.collection.on('reset', this.addAll, this);
		},

		addOne: function(BlockModel) {
			var menuItemView = new MenuItemView({
				model: BlockModel
			});
			this.$el.append(menuItemView.render().el);
		},

		addAll: function() {
			this.collection.forEach(this.addOne, this);
		},

		render: function() {
			this.addAll();
			return this;
		}

	});
	// ***************************** MENU VIEW END *****************************

	// ***************************** JS BLOCK VIEW START *****************************
	// view for single js block
	var BlockView = Backbone.View.extend({

		tagName: 'li',
		className: 'js-block',

		template: _.template($('#blockTemplate').html()),

		events: {
			'click .trigger-explan': 'triggerExplanation',
			'click .run-button-wrapper': 'runCode'
		},

		render: function() {
			var parsedTemplate = this.template(this.model.attributes);
			this.$el.html(parsedTemplate);
			var codeElems = this.$el.find(".codewrapper");
			if (codeElems.length) {
				codeElems[0].viewAttached = this;
			}
			// debugger
			return this;
		},

		initialize: function() {
			this.model.on('hide', this.hide, this);
		},

		hide: function() {
			this.$el.fadeOut();
			this.$el.hide();
		},

		runCode: function() {
			var codeToRun = this.model.get('code');
			try {
				var result = eval(codeToRun);
			} catch (e) {
				alert("Произошла ошибка:\n" + e.message);
				console.error(e);
			}
			if (result) {
				alert("Код вернул результат:\n" + result);
			}
		},

		triggerExplanation: function() {
			this.$el.find('.explan').slideToggle();
		}

	});

	// view for JS Blocks Collection
	var BlocksCollectionView = Backbone.View.extend({

		tagName: 'ul',
		className: 'js-blocks-list',

		initialize: function() {
			this.collection.on('add', this.addOne, this);
			this.collection.on('reset', this.addAll, this);
			this.collection.on('remove', this.hideModel);
		},

		render: function() {
			this.addAll();
			return this;
		},

		addOne: function(BlockModel) {
			var exampleView = new BlockView({
				model: BlockModel
			});
			this.$el.append(exampleView.render().el);
			setTimeout(function() { //timeout so elem gets attached to DOM before highlighter is executed
				SyntaxHighlighter.highlight(exampleView.el);
			});
		},

		addAll: function() {
			this.collection.forEach(this.addOne, this);
		}

	});
	// ***************************** JS BLOCK VIEW END *****************************

	// ***************************** JS EXAMPLE VIEW START *****************************
	// view for single JS Example
	var JsExampleView = Backbone.View.extend({

		tagName: 'div',
		className: 'js-example',

		template: _.template($('#exampleTemplate').html()),

		render: function() {
			var parsedTemplate = this.template(this.model.attributes);
			this.$el.html(parsedTemplate);
			this.blocksCollection.reset(this.model.get('blocks'));
			this.blocksColView = new BlocksCollectionView({
				collection: this.blocksCollection
			});
			this.$el.append(this.blocksColView.render().$el);
			return this;
		},

		initialize: function(options) {
			var self = this;
			this.blocksCollection = new BlocksCollection();
			this.model.on('selected', function(item) {
				$('.js-example').removeClass('selected').css('display','none');
				self.$el.fadeIn('250', function() {
					self.$el.addClass('selected')
				});
			});
		}

	});

	// view for the JS Examples Collection
	var JsExamplesColView = Backbone.View.extend({

		tagName: 'div',
		className: 'js-examples-list',

		initialize: function() {
			this.collection.on('add', this.addOne, this);
			this.collection.on('reset', this.addAll, this);
			// this.collection.on('remove', this.hideBlock);
		},

		addOne: function(jsExampleModel) {
			var jsExampleView = new JsExampleView({
				model: jsExampleModel
			});
			this.$el.append(jsExampleView.render().$el);
		},

		addAll: function() {
			this.collection.forEach(this.addOne, this);
		},

		render: function() {
			this.addAll();
			return this;
		}

	});
	// ***************************** JS EXAMPLE VIEW END *****************************

	/**
	 *			    INIT CODE
	 */


	var examples = [{
		title: 'Test JS Example Title1',
		blocks: [{
			code: 'var test1 = function(sayThis){\n\talert(sayThis);\n}\ntest("Hello World!");',
			title: 'Block Title1',
			description: "some description1",
			explanation: 'Example Explanation1<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'
		}, {
			code: 'var test2 = function(sayThis){\n\talert("Test is OK");\n}\ntest2("Hello World!");',
			title: 'Block Title2',
			explanation: 'Example Explanation2<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'

		}, {
			code: 'var test3 = function(){\n\treturn 5;\n}\ntest3();',
			title: 'Block Title3',
			description: "some description3",
			explanation: 'Example Explanation'
		}, {
			code: 'var test4 = function(){\n\treturn 4;\n}\ntest4();'
		}]
	}, {
		title: 'Test JS Example Title2',
		blocks: [{
			code: 'var test1 = function(sayThis){\n\talert(sayThis);\n}\ntest("Hello World!");',
			title: 'Block Title1',
			description: "some description1",
			explanation: 'Example Explanation1<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'
		}, {
			code: 'var test2 = function(sayThis){\n\talert("Test is OK");\n}\ntest2("Hello World!");',
			title: 'Block Title2',
			explanation: 'Example Explanation2<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'

		}, {
			code: 'var test3 = function(){\n\treturn 5;\n}\ntest3();',
			title: 'Block Title3',
			description: "some description3",
			explanation: 'Example Explanation'
		}, {
			code: 'var test4 = function(){\n\treturn 4;\n}\ntest4();'
		}]
	}, {
		title: 'Test JS Example Title3',
		blocks: [{
			code: 'var test1 = function(sayThis){\n\talert(sayThis);\n}\ntest("Hello World!");',
			title: 'Block Title1',
			description: "some description1",
			explanation: 'Example Explanation1<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'
		}, {
			code: 'var test2 = function(sayThis){\n\talert("Test is OK");\n}\ntest2("Hello World!");',
			title: 'Block Title2',
			explanation: 'Example Explanation2<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'

		}, {
			code: 'var test3 = function(){\n\treturn 5;\n}\ntest3();',
			title: 'Block Title3',
			description: "some description3",
			explanation: 'Example Explanation'
		}, {
			code: 'var test4 = function(){\n\treturn 4;\n}\ntest4();'
		}]
	}, {
		title: 'Test JS Example Title4',
		blocks: [{
			code: 'var test1 = function(sayThis){\n\talert(sayThis);\n}\ntest("Hello World!");',
			title: 'Block Title1',
			description: "some description1",
			explanation: 'Example Explanation1<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'
		}, {
			code: 'var test2 = function(sayThis){\n\talert("Test is OK");\n}\ntest2("Hello World!");',
			title: 'Block Title2',
			explanation: 'Example Explanation2<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'

		}, {
			code: 'var test3 = function(){\n\treturn 5;\n}\ntest3();',
			title: 'Block Title3',
			description: "some description3",
			explanation: 'Example Explanation'
		}, {
			code: 'var test4 = function(){\n\treturn 4;\n}\ntest4();'
		}]
	}, {
		title: 'Test JS Example Title5',
		blocks: [{
			code: 'var test1 = function(sayThis){\n\talert(sayThis);\n}\ntest("Hello World!");',
			title: 'Block Title1',
			description: "some description1",
			explanation: 'Example Explanation1<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'
		}, {
			code: 'var test2 = function(sayThis){\n\talert("Test is OK");\n}\ntest2("Hello World!");',
			title: 'Block Title2',
			explanation: 'Example Explanation2<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>Example Explanation<br/>'

		}, {
			code: 'var test3 = function(){\n\treturn 5;\n}\ntest3();',
			title: 'Block Title3',
			description: "some description3",
			explanation: 'Example Explanation'
		}, {
			code: 'var test4 = function(){\n\treturn 4;\n}\ntest4();'
		}]
	}];

	var jsExamplesCollection = new JsExamplesCollection(examples);

	var jsExamplesColView = new JsExamplesColView({
		collection: jsExamplesCollection
	});
	window.jsExamplesColView = jsExamplesColView;
	jsExamplesColView.render();
	$('#examplesContainer').append(jsExamplesColView.$el);

	// menu view init:
	var menuListView = new MenuListView({
		collection: jsExamplesCollection
	});
	window.menuListView = menuListView;
	menuListView.render();
	$('#menu').append(menuListView.$el);


});
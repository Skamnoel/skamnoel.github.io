/**
 *  Custom Output Example for dojo MVC 1.7
 *  by SBT-Leontev-MS
 */
define(['dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/text!../view/MyOutputExample.html',
	'lms/examples/model/Simple',
	'lms/examples/MyOutput',
	'dojox/mvc/StatefulModel',
	'dojox/mvc',
	'dijit/form/TextBox',
	'dijit/form/Button'
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template) {

	return declare('lms.examples.controller.MyOutputExample', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

		templateString: template, // шаблон виджета

		model: null, // модель, используемая в виджете

		constructor: function() {
			this.model=new dojox.mvc.newStatefulModel({data: {numberM: 123}});
		},

		/* 
		 * Увеличивает на единицу значение в numberM
		 */
		increment: function() {
			var currentValue = this.model.numberM.get('value');
			this.model.numberM.set('value', ++currentValue);
		}

	})
})
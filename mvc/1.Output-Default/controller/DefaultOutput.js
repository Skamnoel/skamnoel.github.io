/**
 *  Default Output Example for dojo MVC 1.7
 *  by SBT-Leontev-MS
 */
define(['dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/text!../view/DefaultOutput.html',
	'lms/examples/model/Simple',
	'dojox/mvc/Output',
	'dijit/form/Button'
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, SimpleModel) {

	return declare('lms.examples.controller.DefaultOutput', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

		templateString: template, // шаблон виджета

		model: new SimpleModel(), // модель, используемая в виджете

		numberMTemplate:"${this.value}", // templateString для Output виджета (см. комментарии в DefaultOutput.html)

		/* 
		 * Увеличивает на единицу значение в numberTest
		 */
		increment: function() {
			var currentValue = this.model.numberM.get('value');
			this.model.numberM.set('value', ++currentValue);
		},

		/* 
		 * Изменяет Шаблон на правильный для примера с выводом html
		 * (attachpoint = _htmlOutput)
		 */
		changeTemplate: function() {
			// Set new template:
			this._htmlOutput.set('templateString', ' Шаблон изменён. Значение теперь будет изменяться: <span style="color:#52D612;">${this.value}</span>');
			// Force refresh view:
			this._htmlOutput.set('value', this._htmlOutput.get('value'));
		}

	})
})
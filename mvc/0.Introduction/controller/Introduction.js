/**
 *  Introduction to the word of dojo 1.7 MVC
 *  by SBT-Leontev-MS
 */
define(['dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/text!../view/Introduction.html',
	'lms/examples/model/Simple',
	// 'dijit/form/Form',
	'dijit/form/TextBox',
	'dijit/form/ValidationTextBox',
	'dijit/form/SimpleTextarea',
	'dijit/form/Textarea',
	'dijit/form/DateTextBox',
	'dojox/widget/Calendar',
	'dijit/CalendarLite',
	'dijit/Calendar',
	'dijit/form/Button'
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, SimpleModel) {

	return declare('lms.examples.controller.Introduction', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

		templateString: template, // шаблон виджета

		model: new SimpleModel(), // используемая модель


		/*
		 ****************************************************************************************
		 ************************ Функции-обработчики нажатий на кнопки *************************
		 ****************************************************************************************
		 */


		/* 
		 * Увеличивает на единицу значение в numberTest
		 */
		incrementDate: function() {
			//берём текущее значение из модели:
			var curentValue = this.model.myDate.get('value');
			//получаем дату + 1 день:
			var temp = new Date(+curentValue + 24 * 60 * 60 * 1000);
			//кладём полученное значение в модель:
			this.model.myDate.set('value', temp);
		},

		/* 
		 * Обработчики кнопок 2ой части (ShowCase #2):
		 */
		setValueToTest: function() {
			this.model.myText.set('value', "ТЕСТ");
		},

		resetModel: function() {
			this.model.myText.reset();
		},

		commitModel: function() {
			this.model.myText.commit();
		},

		toggleReadOnly: function() {
			var currentV = this.model.myText.get('readOnly')
			this.model.myText.set('readOnly', !currentV);
		},

		toggleRequired: function() {
			var currentV = this.model.myText.get('required')
			this.model.myText.set('required', !currentV);
		},

		toggleRelevant: function() {
			var currentV = this.model.myText.get('relevant');
			if (typeof currentV == "undefined") currentV = true;
			this.model.myText.set('relevant', !currentV);
		},

		toggleValid: function() {
			var currentV = this.model.myText.get('valid')
			this.model.myText.set('valid', !currentV);
		}

	})
})
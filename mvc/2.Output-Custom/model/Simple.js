/**
 * Простая модель с несколькими значениями для примера
 */
define(['dojo/_base/declare',
	'dojox/mvc/StatefulModel',
	'dojox/mvc'
], function(declare, StatefulModel, mvc) {

	return declare('lms.examples.model.Simple', [StatefulModel], {

		data: {
			undefinedM: undefined,
			nullM: null,
			emptyStrM: '',
			txtM: 'some text value',
			numberM: 123
		}
		
	})
})
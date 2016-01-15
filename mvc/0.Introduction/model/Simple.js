/**
 * Простая модель с несколькими значениями 
 */
define(['dojo/_base/declare',
	'dojox/mvc/StatefulModel',
	'dojox/mvc'
], function(declare, StatefulModel, mvc) {

	return declare('lms.examples.model.Simple', [StatefulModel], {

		data: {
			myText: "initial value",
			myDate: new Date() // 946674000000 = 01 Января 2000
		}
		
	})
})
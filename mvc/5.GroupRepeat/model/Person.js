/**
 * Простая модель описывающая человека
 */
define(['dojo/_base/declare',
	'dojox/mvc/StatefulModel',
	'dojox/mvc',
	"dojo/_base/lang"
], function(declare, StatefulModel, mvc, lang) {

	return declare('lms.examples.model.Person', [StatefulModel], {

		data: {
			id: 'НОВЫЙ',
			name: '',
			surname: '',
			patronymic: '',
			dateOfBirth: ' wrongFormatHack :) ',
			jobPosition: '',
			fio: ''
		},

		// инициализация
		postscript: function() {
			this.inherited(arguments);
			// инициализируем вычисляемую ФИО
			this.updateFio();
			// подписываемся на изменения модели для обновления обновления ФИО при изменении любой части
			this.name.watch('value', lang.hitch(this, this.updateFio));
			this.surname.watch('value', lang.hitch(this, this.updateFio));
			this.patronymic.watch('value', lang.hitch(this, this.updateFio));
		},

		// функция для обновления ФИО при изменении любой состовляющей
		updateFio: function() {
			var name = this.name.get('value'),
				surname = this.surname.get('value'),
				patronymic = this.patronymic.get('value'),
				fio = surname + " " + name + " " + patronymic;
			if (!this.fio) { //создаём модель для ФИО, если её еще нет (см. People.js initMockData)
				this.add('fio', dojox.mvc.newStatefulModel({
					data: fio
				}));
			} else { //устанавливаем значение ФИО
				this.fio.set('value', fio);
			}
		},

		/* 
		 *	функция для парсинга JS-объектов (например, полученных с backend) в модель. Здесь для примера, но тут не используется =]
		 */
		parseObject: function(obj, modelRef) {
			modelRef = modelRef || this;
			for (key in obj) { //cycle through properties in JSON
				if (lang.isObject(obj[key])) { // if we find object - make child model with recursive call
					this.parseJson(obj[key], modelRef[key]);
				} else if (modelRef[key]) { //if this is normal value - set model's value for this node
					modelRef[key].set('value', obj[key]);
				}
			}
		}

	})
})
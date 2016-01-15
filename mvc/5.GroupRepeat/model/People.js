/**
 * Модель списка людей с несколькими изначальными значениями
 */
define(['dojo/_base/declare',
	'dojox/mvc/StatefulModel',
	'dojox/mvc',
	'./Person',
	"dojo/_base/lang",
	"dojo/_base/array",
	"./Person"
], function(declare, StatefulModel, mvc, PersonModel, lang, array, Person) {

	return declare('lms.examples.model.People', [StatefulModel], {

		data: {
			people: []
		},

		// добавляет модель человека в people
		addPerson: function(personObject) {
			// Можем добавить какие-либо свойства с помощью mixin:
			// lang.mixin(personObject, {
			// 	id: personObject.id || "НОВЫЙ"
			// });
			// Создаём новую модель человека:
			var newPerson = new Person({
				data: personObject
			});
			// добавляем новую модель в список людей
			this.people.add(this.people.length, newPerson);
			return newPerson;
		},

		// удаляет модель человека
		removePerson: function(personModel) {
			// Находим индекс для удаляемого элемента
			// Прим.: вместо этого можно фильтровать, например, по id, если вы используете Json Rest Store
			var index = array.indexOf(this.people, personModel);
			// Если элемент был найден, то удаляем его
			if (index >= 0) {
				this.people.remove(index);
				return true;
			}
			return false;
		},

		//инициализация "mock" данных
		initMockData:function(){
			this.addPerson({
				id: 6,
				name: 'Людмила',
				surname: 'Токарева',
				patronymic: 'Андреевна',
				dateOfBirth: new Date(1000, 7, 31),
				jobPosition: 'Ведущий инженер'
			});
			this.addPerson({
				id: 83,
				name: 'Галина',
				surname: 'Светлова',
				patronymic: 'Васильевна',
				dateOfBirth: new Date(1000, 2, 3),
				jobPosition: 'Начальник отдела'
			});
			this.addPerson({
				id: 3,
				name: 'Али',
				surname: 'Алимов',
				patronymic: 'Абдулберович',
				dateOfBirth: new Date(1000, 10, 24),
				jobPosition: 'Гл. руководитель разработки'
			});
			this.addPerson({
				id: 666,
				name: 'Иван',
				surname: 'Иванов',
				patronymic: 'Иванович',
				dateOfBirth: new Date(1000, 0, 1),
				jobPosition: 'шпион!'
			});
			this.addPerson({
				id: 46,
				name: 'Дмитрий',
				surname: 'Бессонов',
				patronymic: 'Вячеславович',
				dateOfBirth: new Date(1000, 6, 8),
				jobPosition: 'Руководитель разработки'
			});
			this.addPerson({
				id: 52,
				name: 'Максим',
				surname: 'Леонтьев',
				patronymic: 'Сергеевич',
				dateOfBirth: new Date(1000, 11, 4),
				jobPosition: 'Ведущий инженер'
			});
			this.addPerson({
				id: 33,
				name: 'Лжедмитрий',
				surname: 'Козьмин',
				patronymic: 'Олегович',
				dateOfBirth: new Date(1000, 3, 14),
				jobPosition: 'Старший инженер'
			});
		}

	})
})
/**
 *  MVC Group and Edit Advanced Example
 *  by SBT-Leontev-MS
 */
define(['dojo/_base/declare',
	'dijit/_WidgetBase',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/text!../view/GroupRepeatExample.html',
	'lms/examples/model/People',
	'lms/examples/model/Person',
	"dojo/on",
	"dojo/dom-attr",
	'dojo/dom-class',
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/date",
	"dojo/query",
	'dijit/CalendarLite',
	"dojo/NodeList-traverse",
	'dojox/mvc/Group',
	'dojox/mvc/Repeat',
	'dojox/mvc/Output',
	'dijit/form/TextBox',
	'dijit/form/DateTextBox',
	'dojox/layout/TableContainer',
	'dijit/form/Button',
	'dijit/form/Form',
	"dijit/layout/ContentPane"
], function(declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, PeopleModel, PersonModel, on, domAttr, domClass, lang, array, date, query, CalendarLite) {

	return declare('lms.examples.controller.GroupRepeatExample', [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

		templateString: template, // шаблон виджета

		// Используемые модели:
		peopleModel: new PeopleModel(),
		blankPersonModel: new PersonModel(),
		buttonModel: dojox.mvc.newStatefulModel({ //пустая модель для управления кнопками
			data: {}
		}),

		maxBirthdayValue: date.add(new Date(), "year", -14), // максимальное значение для даты рождения сотрудника

		_signals: [], //сигналы

		// стандартная функция жизненного цикла виджета
		postCreate: function() {
			//добавляем начальные данные
			this.peopleModel.initMockData();

			//вешаем обработчики кликов
			this._signals.push(on(this.domNode, ".person-item:click", lang.hitch(this, this.editSelected)));

			//подписываемся на изменение валидности формы:
			var self = this;
			this._myForm.watch('state', function(prop, oldV, newV) {
				var formIsValid = (newV == "");
				// активируем/деактивируем кнопки:
				self.setButtonsToDisabled(formIsValid);
				// показываем/скрываем сообщение:
				self._infoMsg.style.display = (formIsValid) ? 'none' : 'block';
			});
		},

		// стандартная функция жизненного цикла виджета
		startup: function() {
			this.inherited(arguments);
			this.setButtonsToDisabled(this._myForm.isValid());
		},

		// вкл/выкл кнопки
		setButtonsToDisabled: function(state) {
			this.buttonModel.set('relevant', state);
		},

		// редактирование выбранного человека
		editSelected: function(evt) {
			var target = evt.target;
			// Выделим редактируемого человека, предварительно удалив все старые выделения:
			this.removeSelection();
			var targetPersonElem = query(target).closest(".person-item")[0];
			domClass.add(targetPersonElem, 'selected');
			// Получаем индекс из HTML
			var index = domAttr.get(target, 'data-index');
			// можно сбрасывать сделанные изменения перед выбором следующего или добавить подтверждение
			// this.getSelectedPersonModel().reset();
			// перетаскиваем группу на новую модель
			this.setSelectedPersonModel(this.peopleModel.people[index]);
		},

		/*
		 ****************************************************************************************
		 **************************** Обработчики нажатий на кнопки *****************************
		 ****************************************************************************************
		 */

		// вызвать commit текущей выбранной модели
		commit: function() {
			this.getSelectedPersonModel().commit();
			//можно после commit'a сбрасывать на пустые значения:
			//this._resetToEmptyModel();
		},

		// вызвать reset текущей выбранной модели
		reset: function() {
			this.getSelectedPersonModel().reset();
		},

		// Добавить выбранного человека в список
		addPerson: function() {
			// убираем выделение:
			this.removeSelection();
			//берём значение модели текущего редактируемого человека
			var personToAdd = this.getSelectedPersonModel().valueOf();
			// добавляем его и сохраняем полученную ссылку на модель
			var addedPerson = this.peopleModel.addPerson(personToAdd);
			// ставим ref группы на новую модель
			this.setSelectedPersonModel(addedPerson);
		},

		// удалить выбранного
		deletePerson: function() {
			var personToDelete = this.getSelectedPersonModel();
			this.peopleModel.removePerson(personToDelete);
			// var newRef = this.getSelectedPersonModel();
			// this.setSelectedPersonModel(newRef);
			this._resetToEmptyModel();
		},

		// Сбросить/Новый
		resetEdit: function() {
			this._resetToEmptyModel();
		},

		/*
		 ****************************************************************************************
		 ************************			 Функции помошники			*************************
		 ****************************************************************************************
		 */

		// Убрать текущее выделение
		removeSelection: function() {
			array.forEach(query(".person-item", this.domNode), function(elem) {
				domClass.remove(elem, 'selected')
			});
		},

		// Получить текущего(выбранного) человека
		getSelectedPersonModel: function() {
			return this._groupAttachPoint.get('ref');
		},

		// Задать текущего человека
		setSelectedPersonModel: function(model) {
			return this._groupAttachPoint.set('ref', model);
		},

		/*
		 ****************************************************************************************
		 ************************			 Внутренние функции			*************************
		 ****************************************************************************************
		 */

		// Обнуление на пустую модель человека
		_resetToEmptyModel: function() {
			this.blankPersonModel = new PersonModel();
			this.setSelectedPersonModel(this.blankPersonModel);
		},

		// Удаление подписчиков
		uninitialise: function() {
			array.forEach(this._signals, function(signal) {
				signal.remove();
			})
		}

	})

})
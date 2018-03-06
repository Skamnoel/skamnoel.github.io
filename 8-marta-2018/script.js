$(document).ready(function() {

    // кол-во картинок в logos
    var logoAmount = 21;

    var compliments = [
        '${ name },<br/> ты прирожденный руководитель и лидер! Тебе бы корпорацию возглавлять, уж ты бы развернулся!',
        '${ name },<br/> так бывает очень редко, но у тебя есть способности ко всему, за что ты берешься! Ты удивительный человек!',
        '${ name },<br/> твои идеи и творчество достойны восхищения!',
        '${ name },<br/> благодаря твоему бесценному опыту и стремлению развиваться, ты стала самым перспективным сотрудником компании!',
        '${ name },<br/> тобой хочется гордиться и брать с тебя пример!',
        '${ name },<br/> да ты настоящий самородок! Такие люди сегодня на вес золота!',
        '${ name },<br/> талантливый человек талантлив во многих сферах. Вот ты, например. По-моему, мало что есть, чего ты не умеешь!',
        '${ name },<br/> ты непревзойденный профессионал своего дела!',
        '${ name },<br/> ты успешна не только потому, что отличный специалист, но потому, что ты замечательная женщина!',
        '${ name },<br/> ты такая мудрая! Всегда находишь правильное решение в любой ситуации!',
        '${ name },<br/> в твоем арсенале есть умения и навыки на все случаи жизни!',
        '${ name },<br/> твои блестящие успехи в работе гарантируют тебе великолепную карьеру!',
        '${ name },<br/> твоя светлая голова полна самых смелых идей и экспериментов!',
        '${ name },<br/> как тебе удается так грамотно спланировать свой день? У тебя для всего есть время!',
        '${ name },<br/> у тебя есть огромный творческий потенциал! Ты способна творить шедевры в любой сфере жизни!',
        '${ name },<br/> так великолепно делать свою работу можешь только ты!',
        '${ name },<br/> ты лучшая в своём деле!',
        '${ name },<br/> ты прекрасна во всех своих проявлениях!',
        '${ name },<br/> оставайся и дальше такой прекрасной',
        '${ name },<br/> будь всегда такой жизнерадостной и веселой!'
    ];

    const girls = [
        {
            displayName: 'Маша',
            title: 'БТ <br/> уже в конфе!',
            className: 'masha'
        },
        {
            displayName: 'Аня',
            title: 'Увезите соседа!',
            className: 'anna'
        },
        {
            displayName: 'Юля',
            title: 'Я слышу: мы всё<br/>успеем к демо!',
            className: 'yulya'
        },
        {
            displayName: 'Таня',
            title: 'Омниканальный <br/> дизайн!',
            className: 'tanya'
        },
        {
            displayName: 'Эльмира',
            title: 'Все в ПРОМ!',
            className: 'elmira'
        },
        {
            displayName: 'Маша',
            title: 'Всё <br/> чётко!',
            className: 'mariya'
        },
        {
            displayName: 'Катя',
            title: 'Идеальный код',
            className: 'katya'
        },
        {
            displayName: 'Настя',
            title: 'Баги найдутся<br/> всегда',
            className: 'nastya'
        }
    ];

    function getRandomCompliment (name) {
        var randomIndex = _.random(0, compliments.length - 1);
        var pickedTemplate = _.template(compliments[randomIndex]);
        return pickedTemplate({name: name});
    }

    function getRandomLogo () {
        return _.random(1, logoAmount) + '.jpg';
    }

    function handler(debugString){
        return function (event) {
            //console.log(debugString);
            var flipper = $(this).closest('.flip-container');
            // Если карточка открывается
            if (!flipper.hasClass('hover')) {
                // выставляем комплимент
                var name = flipper.data('name');
                var compliment = getRandomCompliment(name);
                flipper.find('.back-compliment').html(compliment);
                // изменяем картинку
                var imageUrl = './images/logos/' + getRandomLogo();
                flipper.find('.back-logo').html('<img src="' + imageUrl + '"/>');
            }
            $(this).closest('.flip-container').toggleClass('hover');
        }
    }

    function applyListeners() {
        var flippers = $('.flip-container');
        flippers.find('.front').bind('click', handler('clickFront'));
        flippers.find('.back').bind('click', handler('clickBack'));

        $.scrollify({section : "section"});
    }

    var getHtmlForGirl = _.template($('#girlTemplate').html());

    _.forEach(girls, function(girl){
        $('#app').append(getHtmlForGirl(girl))
    });

    applyListeners();
});
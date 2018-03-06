$(document).ready(function() {

    var compliments = [
        '${ name }, ты прирожденный руководитель и лидер! Тебе бы корпорацию возглавлять, уж ты бы развернулся!',
        '${ name }, так бывает очень редко, но у тебя есть способности ко всему, за что ты берешься! Ты удивительный человек!',
        '${ name }, твои идеи и творчество достойны восхищения!',
        '${ name }, благодаря твоему бесценному опыту и стремлению развиваться, ты стала самым перспективным сотрудником компании!',
        '${ name }, тобой хочется гордиться и брать с тебя пример!',
        '${ name }, да ты настоящий самородок! Такие люди сегодня на вес золота!',
        '${ name }, талантливый человек талантлив во многих сферах. Вот ты, например. По-моему, мало что есть, чего ты не умеешь!',
        '${ name }, ты непревзойденный профессионал своего дела!',
        '${ name }, ты успешна не только потому, что отличный специалист, но потому, что ты замечательная женщина!',
        '${ name }, ты такая мудрая! Всегда находишь правильное решение в любой ситуации!',
        '${ name }, в твоем арсенале есть умения и навыки на все случаи жизни!',
        '${ name }, твои блестящие успехи в работе гарантируют тебе великолепную карьеру!',
        '${ name }, твоя светлая голова полна самых смелых идей и экспериментов!',
        '${ name }, как тебе удается так грамотно спланировать свой день? У тебя для всего есть время!',
        '${ name }, у тебя есть огромный творческий потенциал! Ты способна творить шедевры в любой сфере жизни!',
        '${ name }, так великолепно делать свою работу можешь только ты!',
        '${ name }, ты лучшая в своём деле!',
        '${ name }, ты прекрасна во всех своих проявлениях!',
        '${ name }, оставайся и дальше такой прекрасной',
        '${ name }, будь всегда такой жизнерадостной и веселой!'
    ];

    const girls = [
        {
            displayName: 'Маша',
            title: 'БТ уже в конфе!',
            className: 'masha'
        },
        {
            displayName: 'Аня',
            title: 'Увезите соседа!',
            className: 'anna'
        },
        {
            displayName: 'Юля',
            title: 'Я слышу: мы всё<br/>успеваем к демо!',
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
            title: 'Всегда в моде!',
            className: 'mariya'
        },
        {
            displayName: 'Катя',
            title: 'Багов нет!',
            className: 'katya'
        },
        {
            displayName: 'Настя',
            title: 'Баги всегда найдутся',
            className: 'nastya'
        }
    ];

    function getRandomCompliment (name) {
        var randomIndex = _.random(0, compliments.length - 1);
        var pickedTemplate = _.template(compliments[randomIndex]);
        return pickedTemplate({name: name});
    }

    function handler(debugString){
        return function (event) {
            //console.log(debugString);
            var flipper = $(this).closest('.flip-container');
            // Если карточка открывается - выставляем комплимент
            if (!flipper.hasClass('hover')) {
                var name = flipper.data('name');
                var compliment = getRandomCompliment(name);
                flipper.find('.back-compliment').html(compliment);
            }
            $(this).closest('.flip-container').toggleClass('hover');
        }
    }

    function applyListeners() {
        var flippers = $('.flip-container');
        flippers.find('.front').bind('click', handler('clickFront'));
        flippers.find('.back').bind('click', handler('clickBack'));
    }

    var getHtmlForGirl = _.template($('#girlTemplate').html());

    _.forEach(girls, function(girl){
        $('#app').append(getHtmlForGirl(girl))
    })

    applyListeners();
});
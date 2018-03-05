$(document).ready(function() {
    var flippers = $('.flip-container');
    function handler(debugString){
        return function (event) {
            console.log(debugString);
            $(this).closest('.flip-container').toggleClass('hover');
            this.classList.toggle('hover');
        }
    }
    // flippers.find('.front').bind('touchstart', handler('touchstartFront'));
    // flippers.find('.back').bind('touchstart', handler('touchstartBack'));
    flippers.find('.front').bind('click', handler('clickFront'));
    flippers.find('.back').bind('click', handler('clickBack'));
});
$(document).ready(function() {
    var flippers = $('.flip-container');
    function handler(event){
        this.classList.toggle('hover');
    }
    flippers.bind('mouseenter', handler);
    flippers.bind('mouseleave', handler);
    flippers.bind('touchstart', handler);
});
$(document).ready(function() {

    // Some random colors
    const colors = [
        "#3CC157",
        "#2AA7FF",
        "#1B1B1B",
        "#FCBC0F",
        "#F85F36"
    ];

    const numBalls = 100;
    const balls = [];

    for (var i = 0; i < numBalls; i++) {
        var ball = document.createElement("div");
        ball.classList.add("ball");
        ball.style.background = colors[Math.floor(Math.random() * colors.length)];
        var left = Math.floor(Math.random() * 100)
        ball.style.left = left + 'vw';
        var top = Math.floor(Math.random() * 100)
        ball.style.top = top + 'vh';
        ball.style.transform = 'scale(' + Math.random() + ')';
        ball.style.width = Math.random() + 'em';
        ball.style.height = ball.style.width;

        balls.push(ball);
        document.body.append(ball);
    }

    // Keyframes
    balls.forEach(function (el, i, ra) {
        let to = {
            x: Math.random() * (i % 2 === 0 ? -11 : 11),
            y: Math.random() * 12
        };

        let anim = el.animate(
            [
                {transform: "translate(0, 0)"},
                {transform: _.template('translate(${x}rem, ${y}rem)')(to)}
            ],
            {
                duration: (Math.random() + 1) * 2000, // random duration
                direction: "alternate",
                fill: "both",
                iterations: Infinity,
                easing: "ease-in-out"
            }
        );
    });

});
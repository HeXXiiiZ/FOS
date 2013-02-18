


var main = function() {
    var headers = $('article > header');
    headers.click(function() { $(this).siblings().toggle(); });
    headers.siblings().hide();
    headers.hover(
        function() { $(this).addClass("roll"); },
        function() { $(this).removeClass("roll"); }
    );
};



$(main);



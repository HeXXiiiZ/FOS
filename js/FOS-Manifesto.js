







var main = function() {
    var headers = $('article > header');

    headers.click(function() { $(this).siblings().toggle(); });
    var expand   = function() { headers.siblings().show(); };
    var contract = function() { headers.siblings().hide(); };
    contract();

    $('#expander').click(expand);
    $('#contractor').click(contract);

    headers.hover(
        function() { $(this).addClass("roll"); },
        function() { $(this).removeClass("roll"); }
    );
};



$(main);



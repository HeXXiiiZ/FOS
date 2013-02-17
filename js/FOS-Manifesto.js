


var main = function() {
    $('article').click(function() {
        var that = $(this)
        that.children('section').toggle();
        that.children('aside').toggle();
        that.children('footer').toggle();
    });

    $('article').children('section').hide();
    $('article').children('aside').hide();
    $('article').children('footer').hide();
};



$(main);



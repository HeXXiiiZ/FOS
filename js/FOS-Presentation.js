



var PP = require('prelude-ls');


function getUnicodeCharacter(cp) {
    if (cp >= 0 && cp <= 0xD7FF || cp >= 0xE000 && cp <= 0xFFFF) {
        return String.fromCharCode(cp);
    } else if (cp >= 0x10000 && cp <= 0x10FFFF) {

        // we substract 0x10000 from cp to get a 20-bits number
        // in the range 0..0xFFFF
        cp -= 0x10000;

        // we add 0xD800 to the number formed by the first 10 bits
        // to give the first byte
        var first = ((0xffc00 & cp) >> 10) + 0xD800

        // we add 0xDC00 to the number formed by the low 10 bits
        // to give the second byte
        var second = (0x3ff & cp) + 0xDC00;

        return String.fromCharCode(first) + String.fromCharCode(second);
    }
}


function peopleLink(person) {
    if (typeof(person) == "string") person = people[person];
    return $("<a>", { href : person.home }).addClass('person').text(person.name);
}

function refGenLink(ref) {
    if (typeof(ref) == "string") ref = references[ref];
    return (ref.type == "paper" || ref.type == "patent")
    ? $("<a>", { href : ref.url })
    .addClass('reference')
    .append($("<q>").text(ref.title))
    : $("<a>", { href : ref.url }).addClass('reference').text(ref.title);
}

function refLink(ref, ltext) {
    if (typeof(ref) == "string") ref = references[ref];
    return $("<a>", { href : ref.url }).addClass('reference').text(ltext)
}

function refIndexLink(ref, index) {
    if (typeof(ref) == "string") ref = references[ref];
    return $("<a>", { href : ref.url }).addClass('reference').text("[" + index + "]");
}


function parseAuthor(nameStr) {
    if (typeof(nameStr) != "string") return {};
    var nameMatch = nameStr.match(/^(.*?)\s*(?:\*\s*(.*))?$/);
    if (!nameMatch[1]) return {};
    if (!nameMatch[2]) return { first: "", last: nameMatch[1] };
    return { first: nameMatch[1], last: nameMatch[2] };
}

function parseAuthors(authlist) {
    if (!(authlist instanceof Array)) return [];
    return authlist.map(function(el) {
        if (typeof(el) == "string") return parseAuthor(el);
        if (typeof(el) == "object" && el.name) {
            var auth = parseAuthor(el.name);
            if (el.home) auth.url = el.home;
            return auth;
        }
        return {};
    });
}

function formPeopleTime(ref) {
    if (typeof(ref) == "string") ref = references[ref];
    var authors = parseAuthors(ref.authors);
    return _.pluck(authors, "last").join(", ") + ", " + ref.date;
}

function formBTitle(ref) {

}

function isReference() { return this.innerHTML in references; }
function refReplace(sel, fun) {
    $(sel).filter(isReference).each(function () {
        var name = this.innerHTML;
        var ref = references[name];
        this.innerHTML = fun(ref);
        $(this).data('refkey', name).addClass('bib');
    });
}


function buildStructure() {
    var cont = $.deck('getContainer');
    var struct = { doc : { slides : [], subs : [], elem : cont } };

    var tags = ['doc', 'sec', 'subsec', 'subsubsec'];
    var tDepth = function(el) {
        return _.indexOf(PP.map(function(x) { return el.hasClass(x); }, tags), true);
    };
    var zipp = [struct.doc], depth = 0;
    cont.children().each(function (dex, el) {
        var ell = $(el);
        var zipc = PP.last(zipp);
        if (ell.hasClass('org')) {
            var cdep = tDepth(ell);
            if (cdep < 0) return;
            _.each(_.range(depth, cdep-1, -1), function() { zipp.pop(); })

            zipc = PP.last(zipp);
            var n = { title : el.innerHTML, slides : [], subs : [], elem : ell };
            zipc.subs.push(n);
            zipp.push(n);

            depth = cdep;
            return;
        }

        if (ell.hasClass('slide')) {
            var htitle = ell.find('h2');
            var t = htitle.length <= 0 ? "" : htitle.html();
            var n = { title : t, elem : ell };
            zipc.slides.push(n);
        }
    });

    cont.data('structure', struct);
    return struct;
}


function makeSubTitle(name) {
    return $('<section />', { 'class' : 'slide' }).append('<h1>' + name + '</h1>');
}

function addTitles(struct) {
    _.each(struct.doc.subs, function (el) {
        el.elem.after(el.tslide = makeSubTitle(el.title));
        //_.each(el.subs, function (et) { });
    });
}

function buildToc(struct, hidex) {
    var tocOl = $('<ol />');
    _.each(struct.doc.subs, function (el, dex) {
        var tslide = el.tslide || PP.first(el.slides).elem;
        var anch = $('<a />', { 'class' : 'backlink' }).html(el.title).data('ref', tslide);
        var subbar = $('<div />', { 'class' : 'subbar' });
        _.each(el.subs, function (et) {
            var nslide  = PP.first(et.slides).elem;
            var subanch = $('<a />', { 'class' : 'backlink' }).html(et.title).data('ref', nslide);
            subbar.append($('<span />', { 'class' : 'subbar' }).append(subanch));
        });

        var tocLi = $('<li />').append(anch);
        if (el.subs.length > 0) tocLi.append($('<br />'), subbar);
        if (hidex == dex) tocLi.addClass('hiToc');
        tocOl.append(tocLi);
    });

    return $('<section />', { 'class' : 'slide toc' }).append('<h2>Outline</h2>', tocOl);
}

function buildTopbar(struct, hidex) {
    var topbar = $('<div />', {'class' : 'topbar'});

    var tslide = struct.tslide || PP.first(struct.slides).elem;
    var anch = $('<a />', { 'class' : 'backlink' }).html(struct.title).data('ref', tslide);
    topbar.append($('<span />', { 'class' : 'topbarHead' }).append(anch));

    _.each(struct.subs, function (el, dex) {
        var fslide = PP.first(el.slides).elem;
        var subanch = $('<a />', { 'class' : 'backlink' }).html(el.title).data('ref', fslide);
        var cell = $('<span />').append(subanch);
        cell.addClass(hidex == dex ? 'topbarSubHi' : 'topbarSub');
        topbar.append(cell);
    });

    return topbar;
}

function resolveReferences() {
    $("span.ref").each(function() {
        var nameMatch = this.innerHTML.match(/^(\w*)(?::\s*(.*))?$/);
        this.innerHTML = "";
        var name = nameMatch[1];
        var link = nameMatch[2] ? refLink(name, nameMatch[2]) : refGenLink(name);
        $(this).append(link).data('refkey', name).addClass('bib');
    });

    $("span.whoswhen").filter(isReference).each(function () {
        var name = this.innerHTML;
        this.innerHTML = formPeopleTime(name);
        $(this).data('refkey', name).addClass('bib');
    });

    refReplace("span.btitle", function(ref) {
        return "<b>" + ref.title + "</b>";
    });


}

function buildBiblio() {
    var bibsSet = {};
    $('.bib').each(function (dex, el) {
        bibsSet[$(el).data('refkey')] = true;
    });

    var bibs = _.keys(bibsSet);
}

$(document).bind('deck.beforeInit', function() {
    buildStructure();
    var struct = $.deck('getContainer').data('structure');
    addTitles(struct);

    var toc = buildToc(struct);
    PP.last(struct.doc.slides).elem.after(toc);

    _.each(struct.doc.subs, function (el, dex) {
        var toc = buildToc(struct, dex);
        if (el.tslide) el.tslide.append(toc);
        else PP.first(el.slides).elem.prepend(toc)
        _.each(el.slides, function (et) { et.elem.prepend(buildTopbar(el)); });
        _.each(el.subs, function (et, ddex) {
            _.each(et.slides, function(en) { en.elem.prepend(buildTopbar(el, ddex)); });
        });
    });

    resolveReferences();
    buildBiblio();
});



$(document).bind('deck.init', function() {
    $('a.backlink').each(function(dex, el) {
        var ell = $(el);
        ell.attr('href', '#' + ell.data('ref').attr('id'));
    });
});

/*
PP.last(str.doc.slides).elem
.after($('<section />', { 'class': 'slide' }).append('<h2>New Slide</h2>'))
 */










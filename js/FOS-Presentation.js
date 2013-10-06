


var PP = require('prelude-ls');





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




////////////////////////////////////////////////////////////////////////////////
// Presentation Structure Builder Code //
////////////////////////////////////////////////////////////////////////////////

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


////////////////////////////////////////////////////////////////////////////////
// Title Code //
////////////////////////////////////////////////////////////////////////////////

function makeSubTitle(name) {
    return $('<section />', { 'class' : 'slide' }).append('<h1>' + name + '</h1>');
}

function addTitles(struct) {
    _.each(struct.doc.subs, function (el) {
        el.elem.after(el.tslide = makeSubTitle(el.title));
        //_.each(el.subs, function (et) { });
    });
}


////////////////////////////////////////////////////////////////////////////////
// Table of Contents Code //
////////////////////////////////////////////////////////////////////////////////


function buildToc(struct, hidex) {
    var tocOl = $('<ol />');
    _.each(struct.doc.subs, function (el, dex) {
        var tslide = el.tslide || PP.empty(el.slides) ? '#' : PP.first(el.slides).elem;
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

    var tslide = struct.tslide || PP.empty(struct.slides) ? '#' : PP.first(struct.slides).elem;
    var anch = $('<a />', { 'class' : 'backlink' }).html(struct.title).data('ref', tslide);
    topbar.append($('<span />', { 'class' : 'topbarHead' }).append(anch));

    _.each(struct.subs, function (el, dex) {
        var fslide = PP.empty(el.slides) ? '#' : PP.first(el.slides).elem;
        var subanch = $('<a />', { 'class' : 'backlink' }).html(el.title).data('ref', fslide);
        var cell = $('<span />').append(subanch);
        cell.addClass(hidex == dex ? 'topbarSubHi' : 'topbarSub');
        topbar.append(cell);
    });

    return topbar;
}


////////////////////////////////////////////////////////////////////////////////
// Reference Code //
////////////////////////////////////////////////////////////////////////////////

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



////////////////////////////////////////////////////////////////////////////////
// Setup Code //
////////////////////////////////////////////////////////////////////////////////

$(document).bind('deck.beforeInit', function() {
    buildStructure();
    var struct = $.deck('getContainer').data('structure');
    addTitles(struct);

    var toc = buildToc(struct);
    PP.last(struct.doc.slides).elem.after(toc);

    _.each(struct.doc.subs, function (el, dex) {
        var toc = buildToc(struct, dex);
        if (el.tslide) el.tslide.append(toc);
        else if (!PP.empty(el.slides)) PP.first(el.slides).elem.prepend(toc);
        else ;
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
        var dref = ell.data('ref');
        ell.attr('href', '#' + (dref === '#' ? '' : dref.attr('id')));
    });
});

/*
PP.last(str.doc.slides).elem
.after($('<section />', { 'class': 'slide' }).append('<h2>New Slide</h2>'))
 */


function getElementCenter(elem) {
  var bb = elem.getBBox();
  return {
    'x': bb.x + 0.5*bb.width, 
    'y': bb.y + 0.5*bb.height  
  };
}


function drawing() {
  var paper = Raphael('sci-model-1', 550, 670);
  var sciModel = makeSciModel(paper);
  var communlets = makeClassicCom(paper, sciModel);  
}

function makeClassicCom(paper, model) {
  makeCom(paper, model, 'Proposal', "Funding");
  makeCom(paper, model, 'Writing', "Peer-Review");
  makeCom(paper, model, 'Publication', "Popular Media");
}


function makeCom(paper, model, key, comLabel) {
  var cboxHeight = 35;
  var cboxWidth  = 120;
  var cboxDist   = 150;
  var cboxHeightH = 0.5*cboxHeight;

  var cjoin = model.arrows[model.stageIndex[key]].center;
  cjoin.y -= 3;
  var cnode = paper.rect(cjoin.x + cboxDist, cjoin.y - cboxHeightH, cboxWidth, cboxHeight, 5);
  cnode.attr({ 'fill': '#ff0000' });

  var cent = getElementCenter(cnode); 
  var label = paper.text(cent.x, cent.y, comLabel);
  label.attr({
    'font-size' : '16pt',
    'fill'      : '#8fff8f',
  });

  var carr  = paper.path([ 'M', cjoin.x - 70, cjoin.y, 'L', cjoin.x + cboxDist - 10, cjoin.y ]);
  carr.attr({
    'stroke'       : '#ff1111',
    'stroke-width' : '2px',
    'stroke-linecap' : 'round'
  });

}

function makeSciModel(paper) {
  var boxHeight = 50;
  var boxWidth  = 150;
  var boxGap    = 30;
  var boxXpos   = 10;
  var stages = [
    'Background', 'Synthesis', 'Proposal', 'Experiment',
    'Analysis', 'Writing', 'Publication', 'Dissemination'
  ];

  var pos = 10;
  var stageNodes = PP.map(function(el) {
    var rect = paper.rect(boxXpos, pos, boxWidth, boxHeight, 10);
    rect.attr({ 'fill': '#10008f' });

    var cent = getElementCenter(rect); 
    var label = paper.text(cent.x, cent.y, el);
    label.attr({
      'font-size' : '16pt',
      'fill'      : '#8fff8f',
    });

    pos += boxHeight + boxGap;
    return { 'label': el, 'node': rect, 'center': cent };  
  }, stages);

  var stageArrows = PP.map(function(el) {
    var boxHeightH = boxHeight/2;
    var cent = el.center;
    var ays = cent.y - boxGap - boxHeightH;
    var aye = cent.y - boxHeightH - 6;
    var aym = ays + 0.5*(aye - ays);
    var acent = { 'x': cent.x, 'y': aym };
    var arr  = paper.path([ 'M', cent.x, ays, 'L', cent.x, aye ]);
    arr.attr({
      'stroke'       : '#ffffff',
      'stroke-width' : '5px',
      'arrow-end'    : 'classic-medium-medium'
    });

    return { 'arr': arr, 'center': acent };
  }, PP.tail(stageNodes));

  var stageIndex = {}, k = 0;
  PP.each(function(el) { stageIndex[el] = k; k += 1; }, stages);

  return { 'stageIndex': stageIndex, 'nodes': stageNodes, 'arrows': stageArrows };
}














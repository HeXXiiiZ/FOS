


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




function drawing() {
  var paper = Raphael('sci-model-1', 350, 600);
  var sciModel = SciMod.makeSciModel(paper, 0);
  var communlets = SciMod.makeClassicCom(paper, sciModel);  

  var paper2 = Raphael('sci-model-2', 350, 600);
  var sciModel2a = SciMod.makeSciModel(paper2, 0);
  var sciModel2b = SciMod.makeSciModel(paper2, 1);
  var interactlets = SciMod.makeClassicInter(paper2, sciModel2a);
  
  var paper3 = Raphael('sci-model-3', 350, 600);
  var sciModel3 = SciMod.makeSciModel(paper3, 0);
  var nanopubs = SciMod.makeNanoPubs(paper3, sciModel3);

  var paper4 = Raphael('sci-model-4', 350, 600);
  var sciModel4a = SciMod.makeSciModel(paper4, 0);
  var sciModel4b = SciMod.makeSciModel(paper4, 1);
  var interactions = SciMod.makeAltInter(paper4, sciModel4a);
}


var SciMod = (function() { 
  var boxHeight   = 35;
  var boxWidth    = 130;
  var boxGap      = 35;
  var boxXpos     = 10;
  var nSep        = 50;

  var cboxHeight  = 35;
  var cboxWidth   = 120;
  var cboxDist    = 150;

  var intboxWidth = 180;

  var stages = [
    'Background', 'Synthesis', 'Proposal', 'Experiment',
    'Analysis', 'Writing', 'Publication', 'Dissemination'
  ];

  function getElCenter(elem) {
    var bb = elem.getBBox();
    return { 'x': bb.x + 0.5*bb.width, 'y': bb.y + 0.5*bb.height };
  }

  function rectCent(paper, x, y, w, h, r) {
    return paper.rect(x - 0.5*w, y - 0.5*h, w, h, r); 
  }

  function makeSqNode(paper, x, y, ltext) {
    var rect = rectCent(paper, x, y, boxWidth, boxHeight, 10).attr({ 'fill': '#10008f' });
    var label = paper.text(x, y, ltext).attr({ 'font-size': '16pt', 'fill': '#8fff8f' });
    return { 'label': ltext, 'node': rect, 'center': {'x': x, 'y': y} };   
  } 

  function makeSqArrows(paper, xs, ys, xe, ye) {
    var ym = ys + 0.5*(ye - ys);
    var acent = { 'x': xs + 0.5*(xe - xs), 'y': ys + 0.5*(ye - ys) };
    var arr  = paper.path([ 'M', xs, ys, 'L', xe, ye ]);
    arr.attr({
      'stroke'       : '#ffffff',
      'stroke-width' : '5px',
      'arrow-end'    : 'classic-medium-medium'
    });

    return { 'arr': arr, 'center': acent };
  }

  function makeSciModel(paper, n) {
    var pos = 10 + 0.5*boxHeight;
    var xpos = boxXpos + 0.5*boxWidth + n*(nSep + boxWidth);
    var stageNodes = PP.map(function(el) { 
      sq = makeSqNode(paper, xpos, pos, el)
      pos += boxGap + boxHeight; 
      return sq;
    }, stages);

    var stageArrows = PP.map(function(el) {
      var ays = el.center.y - boxGap - 0.5*boxHeight;
      var aye = el.center.y - 0.5*boxHeight - 6;
      return makeSqArrows(paper, el.center.x, ays, el.center.x, aye); 
    }, PP.tail(stageNodes));

    var stageIndex = {}, k = 0;
    PP.each(function(el) { stageIndex[el] = k; k += 1; }, stages);

    return { 'stageIndex': stageIndex, 'nodes': stageNodes, 'arrows': stageArrows };
  }

  function makeCom(paper, x, y, comLabel) {
    var cx = x + cboxDist, cy = y - 3;
    var cnode = rectCent(paper, cx, cy, cboxWidth, cboxHeight, 5);
    cnode.attr({ 'fill': '#ff0000' });

    var label = paper.text(cx, cy, comLabel);
    label.attr({ 'font-size': '16pt', 'fill': '#8fff8f' });

    var carr  = paper.path([ 'M', x - 70, cy, 'L', cx - 0.5*cboxWidth - 10, cy ]);
    carr.attr({
      'stroke'       : '#ff1111',
      'stroke-width' : '2px',
      'stroke-linecap' : 'round'
    });

    return { 'node': cnode, 'arrow': carr };
  }

  function makeNanoPub(paper, x, y, comLabel) {
    var cx = x + cboxDist, cy = y;
    var cnode = rectCent(paper, cx, cy, cboxWidth, cboxHeight, 5);
    cnode.attr({ 'fill': '#af8080' });

    var label = paper.text(cx, cy, comLabel);
    label.attr({ 'font-size': '14pt', 'fill': '#40ff90' });

    var carr  = paper.path([ 'M', x + 10, cy, 'L', cx - 0.5*cboxWidth - 10, cy ]);
    carr.attr({
      'stroke'       : '#ff1111',
      'stroke-width' : '4px',
      'stroke-linecap' : 'round'
    });

    return { 'node': cnode, 'arrow': carr };
  }


  function makeClassicCom(paper, model) {
    var comStages = [
      { 'stage': 'Proposal',    'form': "Funding" },
      { 'stage': 'Writing',     'form': "Peer-Review" },
      { 'stage': 'Publication', 'form': "Popular Media" }
    ];

    PP.map(function(el) {
      var cjoin = model.arrows[model.stageIndex[el.stage]].center;
      makeCom(paper, cjoin.x, cjoin.y, el.form);
    }, comStages);
  }

  function makeClassicInter(paper, model) {
    var bx = boxXpos + boxWidth + 0.5*nSep;
    var cSyn = model.nodes[model.stageIndex['Synthesis']].center;
    var bSyn = rectCent(paper, bx, cSyn.y, intboxWidth, 35, 15);
    bSyn.attr({ 'fill': '#8f0040' });
    bSyn.rotate(-90); 

    var bSynLabel = paper.text(bx, cSyn.y, "Email / Informal");
    bSynLabel.attr({ 'font-size': '16pt', 'fill': '#8fff8f' });
    bSynLabel.rotate(-90);
    
    var cAna = model.nodes[model.stageIndex['Analysis']].center;
    var bAna = rectCent(paper, bx, cAna.y, 10, intboxWidth + 20, 5);
    bAna.attr({ 'fill': '#fff0ff' });
    
    var cPub = model.nodes[model.stageIndex['Publication']].center;
    var bPub = rectCent(paper, bx, cPub.y, 30, 30, 5);
    bPub.attr({ 'fill': '#8f0040' });
    
    var bPubLabel = paper.text(bx, cPub.y, "A");
    bPubLabel.attr({ 'font-size': '16pt', 'fill': '#8fff8f' });

    var cDis = model.nodes[model.stageIndex['Dissemination']].center;
    var bDis = rectCent(paper, bx, cDis.y, 30, 30, 5);
    bDis.attr({ 'fill': '#8f0040' });

    var bDisLabel = paper.text(bx, cDis.y, "B");
    bDisLabel.attr({ 'font-size': '16pt', 'fill': '#8fff8f' });
  }


  function makeNanoPubs(paper, model) {
    var nanoPubStages = [
      { 'stage': 'Proposal',    'form': "Expr Design" }, 
      { 'stage': 'Experiment',  'form': "Data Set" }, 
      { 'stage': 'Analysis',    'form': "Workflow" }, 
      { 'stage': 'Writing',     'form': "Formal Paper" }, 
      { 'stage': 'Publication', 'form': "Presentation" } 
    ];

    PP.map(function(el) {
      var cjoin = model.arrows[model.stageIndex[el.stage]].center;
      return makeNanoPub(paper, cjoin.x, cjoin.y, el.form);
    }, nanoPubStages);

  }

  function makeAltInter(paper, model) {
    PP.map(function(el) {
      var x = el.center.x, y = el.center.y;
      var carr  = paper.path([ 'M', x + 20, y, 'L', x + boxWidth + nSep - 20, y ]);
      carr.attr({
        'stroke'       : '#ffffff',
        'stroke-width' : '6px',
        'stroke-linecap' : 'round',
        'arrow-start' : 'classic-medium-medium', 
        'arrow-end'   : 'classic-medium-medium'
      });

      return carr;
    }, model.arrows); 
    
  }


  return {
    'makeSciModel'     : makeSciModel,
    'makeClassicCom'   : makeClassicCom,
    'makeClassicInter' : makeClassicInter,
    'makeAltInter'     : makeAltInter,
    'makeNanoPubs'     : makeNanoPubs
  };

})();





















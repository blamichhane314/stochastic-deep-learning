(function(){
  "use strict";
  var A=window.Atlas, D=window.SDL, id=A.qs("id"), p=A.paper(id);
  if(!p){ A.mount("papers.html","Paper not found.",
    '<p class="empty">No paper with that identifier. <a href="papers.html">All papers</a>.</p>'); return; }

  var edges=A.of(id), byRel={};
  edges.forEach(function(e){ (byRel[e.rel]=byRel[e.rel]||[]).push(e); });

  var main='<div class="head"><p class="kicker">'+A.date(p.date)+' · session '+p.session+
    ' · '+A.esc(p.venue)+' '+p.year+'</p><h2>'+A.esc(p.title)+'</h2>'+
    '<p class="sub">'+A.esc(p.authors)+'</p></div>';

  if(p.selfquote){
    main+='<h4 class="sec">In its own words</h4>'+
      A.passage(p.selfquote.context,p.selfquote.text)+
      '<p class="prov">On '+A.esc(A.clabel(p.selfquote.concept))+'</p>';
  }

  A.RELORDER.forEach(function(rel){
    var list=byRel[rel]; if(!list||!list.length) return;
    main+='<h4 class="sec">'+rel.replace(/-/g," ")+'</h4>';
    list.forEach(function(e){
      main+='<div class="edge"><p class="rel">'+rel.replace(/-/g," ")+'</p>'+
        '<p class="to"><a href="concept.html?id='+e.to+'">'+A.esc(A.clabel(e.to))+'</a></p>'+
        (e.note?'<p class="note">'+A.esc(e.note)+'</p>':'')+
        A.passage(e.context,e.quote)+A.prov(e)+'</div>';
    });
  });

  var cc=D.edges.filter(function(e){ return e.kind==="concept-concept" && e.asserted_by===id; });
  if(cc.length){
    main+='<h4 class="sec">Relations this paper asserts between concepts</h4>';
    cc.forEach(function(e){
      main+='<div class="edge"><p class="rel">'+e.rel.replace(/-/g," ")+'</p>'+
        '<p class="to"><a href="concept.html?id='+e.from+'">'+A.esc(A.clabel(e.from))+'</a> — '+
        '<a href="concept.html?id='+e.to+'">'+A.esc(A.clabel(e.to))+'</a></p>'+
        A.passage(e.context,e.quote)+A.prov(e)+'</div>';
    });
  }

  if(p.math && p.math.length){
    var ths=p.math.filter(function(m){ return m.kind!=="equation"; });
    var eqs=p.math.filter(function(m){ return m.kind==="equation"; });
    if(ths.length){
      main+='<h4 class="sec">Formal statements</h4>';
      ths.forEach(function(m){
        main+='<div class="thm"><p class="lbl">'+A.esc(m.label)+
          (m.title?' — '+A.esc(m.title):'')+'</p>'+
          '<div class="math">'+(m.html||("\\["+m.display+"\\]"))+'</div></div>';
      });
    }
    if(eqs.length){
      main+='<h4 class="sec">Equations the paper points at</h4>';
      eqs.forEach(function(m){
        main+='<div class="thm"><div class="math">\\['+m.display+'\\]</div></div>';
      });
    }
    main+='<p class="prov">From the paper\u2019s LaTeX source'+
      (p.arxiv?' · arXiv '+A.esc(p.arxiv):'')+'</p>';
  }

  var out=A.cites(id), inn=A.citedBy(id);
  var side='<h4 class="sec">Notes</h4><p class="empty">None yet.</p>';
  if(p.arxiv){
    side+='<h4 class="sec">Source</h4><p class="chips">'+
      '<a href="https://arxiv.org/abs/'+A.esc(p.arxiv)+'">arXiv '+A.esc(p.arxiv)+'</a></p>';
  } else {
    side+='<h4 class="sec">Source</h4><p class="empty">Predates arXiv</p>';
  }
  side+='<h4 class="sec">Evaluated with</h4>';
  side+= p.evaluation && p.evaluation.length
    ? '<p class="chips">'+p.evaluation.map(function(c){
        return '<a href="concept.html?id='+c+'">'+A.esc(A.clabel(c))+'</a>'; }).join("")+'</p>'
    : '<p class="empty">None recorded</p>';
  side+='<h4 class="sec">Cites, within these 28</h4>';
  side+= out.length ? '<p class="chips">'+out.map(function(e){
      return '<a href="paper.html?id='+e.to+'">'+A.esc(A.paper(e.to).title.slice(0,44))+'</a>'; }).join("")+'</p>'
    : '<p class="empty">None</p>';
  side+='<h4 class="sec">Cited by, within these 28</h4>';
  side+= inn.length ? '<p class="chips">'+inn.map(function(e){
      return '<a href="paper.html?id='+e.from+'">'+A.esc(A.paper(e.from).title.slice(0,44))+'</a>'; }).join("")+'</p>'
    : '<p class="empty">None</p>';
  if(p.contributions && p.contributions.length){
    side+='<h4 class="sec">Distinctive to this paper</h4><p class="chips">'+
      p.contributions.map(function(c){ return '<span>'+A.esc(c)+'</span>'; }).join("")+'</p>';
  }

  main+='<h4 class="sec">This paper\u2019s neighbourhood</h4>'+
    '<div class="egowrap" id="ego"></div>'+
    '<p class="prov">Squares are papers, circles are concepts</p>'+
    '<div class="rosekey" id="rosekey"></div>';

  A.mount("papers.html", p.title,
    '<div class="cols two"><div>'+main+'</div><aside>'+side+'</aside></div>');

  /* radius-1 neighbourhood as a compass rose: concepts by family,
     then the papers it cites, then its citers; chords keep the
     links among the neighbours */
  (function(){
    var host=document.getElementById("ego"); if(!host||!A.Rose) return;
    var rose=A.Rose(host,D,id,{W:host.clientWidth||760});
    if(!rose){ host.innerHTML='<p class="empty">Not enough links to draw a neighbourhood.</p>'; return; }

    /* The key. Every spoke in the rose carries a relation and each relation has
       its own line, so name them -- otherwise the picture asks the reader to
       infer an encoding it never shows. Only the relations this rose actually
       drew are listed; a key for a line that is not on the page is noise.
       The swatch is a real `svg.rose` with the spoke's own class, so it is
       drawn by the same stylesheet and cannot fall out of step with it. */
    var LAB={"introduces":"introduces","motivated-by":"motivated by","extends":"extends",
             "replaces":"replaces","uses":"uses","evaluates-with":"evaluates with",
             "acknowledges-limitation":"limitation","relates":"concept \u2194 concept",
             "cites":"cites","cited-by":"cited by"};
    function swatch(cls,d){
      return '<svg class="rose" width="26" height="9" viewBox="0 0 26 9" aria-hidden="true">'+
        '<path class="'+cls+'" d="'+d+'"/></svg>';
    }
    var key=document.getElementById("rosekey");
    if(!key) return;
    var parts=(rose.rels||[]).map(function(r){
      return '<span class="k">'+swatch("sp t-"+r,"M1 4.5 H25")+
             '<b>'+A.esc(LAB[r]||r.replace(/-/g," "))+'</b></span>';
    });
    if(rose.chords)
      parts.push('<span class="k">'+swatch("ch","M1 7 Q13 0 25 7")+
                 '<b>between neighbours</b></span>');
    key.innerHTML=parts.join("");
  })();
})();

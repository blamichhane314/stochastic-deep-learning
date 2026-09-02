(function(){
  "use strict";
  var A=window.Atlas, D=window.SDL, id=A.qs("id"), c=A.concept(id);
  if(!c){ A.mount("concepts.html","Concept not found.",
    '<p class="empty">No concept with that identifier. <a href="concepts.html">All concepts</a>.</p>'); return; }
  var touching=A.touching(id), cc=A.cc(id);
  var byRel={}; touching.forEach(function(e){ (byRel[e.rel]=byRel[e.rel]||[]).push(e); });

  var main='<div class="head"><p class="kicker">'+A.esc(c.family)+' · '+A.esc(c.type)+'</p>'+
    '<h2>'+A.esc(c.label)+'</h2><p class="sub">'+
    (touching.length? touching.length+' of '+D.stats.papers+' papers' : 'No linked papers')+
    '</p></div>';

  if(!touching.length && !cc.length){
    main+='<p class="empty">No links yet.</p>';
  }

  if(cc.length){
    main+='<h4 class="sec">Related concepts, and who says so</h4>';
    cc.forEach(function(e){
      var other=e.from===id?e.to:e.from, dir=e.from===id?"→":"←";
      main+='<div class="edge"><p class="rel">'+e.rel.replace(/-/g," ")+' '+dir+'</p>'+
        '<p class="to"><a href="concept.html?id='+other+'">'+A.esc(A.clabel(other))+'</a>'+
        ' <span class="note">asserted by <a href="paper.html?id='+e.asserted_by+'">'+
        A.esc(A.paper(e.asserted_by).title.slice(0,52))+'</a></span></p>'+
        A.passage(e.context,e.quote)+A.prov(e)+'</div>';
    });
  }

  A.RELORDER.forEach(function(rel){
    var list=byRel[rel]; if(!list||!list.length) return;
    main+='<h4 class="sec">'+A.relPhrase(rel)+'</h4>';
    list.sort(function(a,b){ return A.paper(a.from).session-A.paper(b.from).session; });
    list.forEach(function(e){
      var p=A.paper(e.from);
      main+='<div class="edge"><p class="to"><a href="paper.html?id='+e.from+'">'+
        A.esc(p.title)+'</a> <span class="note">'+p.year+'</span></p>'+
        (e.note?'<p class="note">'+A.esc(e.note)+'</p>':'')+
        A.passage(e.context,e.quote)+A.prov(e)+'</div>';
    });
  });

  var span=touching.map(function(e){ return A.paper(e.from).session; });
  var side='<h4 class="sec">Reach</h4>';
  side+= span.length
    ? '<p class="sub">Sessions '+Math.min.apply(null,span)+' to '+Math.max.apply(null,span)+
      ', across '+(new Set(span)).size+' of the ten meetings.</p>'
    : '<p class="empty">Not yet reached by any session.</p>';
  side+='<h4 class="sec">Notes</h4><p class="empty">None yet.</p>';

  A.mount("concepts.html", c.label,
    '<div class="cols two"><div>'+main+'</div><aside>'+side+'</aside></div>');
})();

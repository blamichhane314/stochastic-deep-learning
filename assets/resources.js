(function(){
  "use strict";
  var A=window.Atlas, D=window.SDL, R=D.resources||[], EV=D.events||[];

  /* one talk. Only what can be checked from outside the video:
     who speaks, whether they wrote the paper, where, when, who hosts it. */
  function row(r, pid){
    var mark = r.is_author
      ? '<span class="mark">'+(r.confidence==="confirmed" ? "author" : "author, unconfirmed")+'</span>'
      : "";
    var where=[r.venue, r.year].filter(Boolean).join(", ");
    return '<div class="res">'+
      (pid ? '<p class="rp"><a href="paper.html?id='+pid+'">'+A.esc(A.paper(pid).title)+'</a></p>' : "")+
      '<p class="rt"><a href="'+A.esc(r.url)+'" target="_blank" rel="noopener">'+
        A.esc(r.title)+'</a></p>'+
      '<p class="rs">'+A.esc(r.speaker)+mark+'</p>'+
      (where ? '<p class="rv">'+A.esc(where)+'</p>' : "")+
      (r.channel && r.channel!==r.venue ? '<p class="prov">'+A.esc(r.channel)+'</p>' : "")+
      '</div>';
  }

  /* ---- by paper: reading order is the site's spine, so the list follows
     the sessions. A paper with no talk simply is not here. ---- */
  function byPaper(){
    var html="", papers=0, seen={}, talks=0;
    D.sessions.forEach(function(s){
      var block="";
      s.papers.forEach(function(pid){
        var mine=R.filter(function(r){ return r.attaches_to.indexOf(pid)>=0; });
        if(!mine.length) return;
        papers++;
        /* a talk covering two papers is listed under each, but counted once */
        mine.forEach(function(r){
          block+=row(r,pid);
          if(!seen[r.id]){ seen[r.id]=1; talks++; }
        });
      });
      if(block) html+='<p class="sessmark">Session '+s.n+'</p>'+block;
    });
    return {html:html, dek: talks+' talks, on '+papers+' of the '+D.stats.papers+' papers.'};
  }

  /* ---- by event: the same talks grouped by the occasion they were given at,
     in the order they were given. The event header carries the venue and the
     date, so a row here needs only its slot, its title and who gave it.
     A talk with no paper of its own still belongs: it was in the room. ---- */
  function evtRow(r){
    var pid=r.attaches_to.filter(function(a){ return A.paper(a); })[0];
    var who=[r.speaker, r.affiliation].filter(Boolean).join(", ");
    return '<div class="etalk">'+
      '<p class="eslot">'+A.esc(r.slot||"")+'</p>'+
      '<div><p class="et"><a href="'+A.esc(r.url)+'" target="_blank" rel="noopener">'+
        A.esc(r.short||r.title)+'</a></p>'+
      '<p class="ew">'+A.esc(who)+'</p>'+
      (pid ? '<p class="epaper"><a href="paper.html?id='+pid+'">'+
        A.esc(A.paper(pid).title)+'</a></p>' : "")+
      '</div></div>';
  }

  function byEvent(){
    var html="", n=0, shown=0;
    EV.forEach(function(e){
      var mine=R.filter(function(r){ return r.event===e.id; })
                .sort(function(a,b){ return (a.event_order||0)-(b.event_order||0); });
      if(!mine.length) return;
      n+=mine.length; shown++;
      html+='<div class="evt"><p class="sessmark">'+A.esc(e.venue)+'</p>'+
        '<h3>'+A.esc(e.title)+'</h3>'+
        '<p class="evwhen">'+A.esc([e.dates, e.place].filter(Boolean).join(" · "))+'</p>'+
        mine.map(evtRow).join("")+'</div>';
    });
    return {html:html, dek: n+' talks, across '+shown+' occasions.'};
  }

  var VIEWS=[["paper","By paper"],["event","By event"]];
  var view="paper";

  function render(){
    var v = view==="event" ? byEvent() : byPaper();
    A.mount("resources.html","",
      '<div class="head"><p class="kicker">recommended watch</p><h2>Resources</h2>'+
      (v.dek ? '<p class="sub">'+A.esc(v.dek)+'</p>' : "")+
      '<p class="grp">'+VIEWS.map(function(x){
        return '<button type="button" class="mbtn" data-v="'+x[0]+'" aria-pressed="'+
          (x[0]===view)+'">'+x[1]+'</button>'; }).join("")+'</p>'+
      '</div>'+
      (v.html || '<p class="empty">None yet.</p>'));

    [].forEach.call(document.querySelectorAll(".mbtn[data-v]"),function(b){
      b.addEventListener("click",function(){ view=b.dataset.v; render(); });
    });
  }

  render();
})();

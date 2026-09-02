(function(){
  "use strict";
  var A=window.Atlas, D=window.SDL, R=D.resources||[];

  /* one talk. Only what can be checked from outside the video:
     who speaks, whether they wrote the paper, where, when, who hosts it. */
  function row(r, pid){
    var mark = r.is_author
      ? '<span class="mark">'+(r.confidence==="confirmed" ? "author" : "author, unconfirmed")+'</span>'
      : "";
    var where=[r.venue, r.year].filter(Boolean).join(", ");
    return '<div class="res">'+
      '<p class="rp"><a href="paper.html?id='+pid+'">'+A.esc(A.paper(pid).title)+'</a></p>'+
      '<p class="rt"><a href="'+A.esc(r.url)+'" target="_blank" rel="noopener">'+
        A.esc(r.title)+'</a></p>'+
      '<p class="rs">'+A.esc(r.speaker)+mark+'</p>'+
      (where ? '<p class="rv">'+A.esc(where)+'</p>' : "")+
      (r.channel && r.channel!==r.venue ? '<p class="prov">'+A.esc(r.channel)+'</p>' : "")+
      '</div>';
  }

  /* reading order is the site's spine, so the list follows the sessions.
     A paper with no talk simply is not here. */
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

  A.mount("resources.html","",
    '<div class="head"><p class="kicker">recommended watch</p><h2>Resources</h2>'+
    (talks ? '<p class="sub">'+talks+' talks, on '+papers+' of the '+D.stats.papers+' papers.</p>' : "")+
    '</div>'+
    (html || '<p class="empty">None yet.</p>'));
})();

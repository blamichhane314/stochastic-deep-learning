(function(){
  "use strict";
  var A=window.Atlas;

  /* ---------- shared derived model for the chart, matrix and rose ---------- */

  A.surname=function(a){
    var t=String(a||"").replace(/\bet\s+al\.?/gi,"").trim();
    var first=t.split(/,| & | and /)[0].trim();
    var bits=first.split(/\s+/).filter(function(w){ return w && w!=="."; });
    return bits[bits.length-1]||first||"?";
  };
  A.short=function(p){ return A.surname(p.authors)+" "+p.year; };
  A.cut=function(s,n){ return s.length>n ? s.slice(0,Math.max(1,n-1))+"…" : s; };

  /* Everything deterministic, computed once from the data. */
  A.Net=function(D){
    var deg={}, pcOfC={}, pcOfP={};
    D.edges.forEach(function(e){
      deg[e.from]=(deg[e.from]||0)+1; deg[e.to]=(deg[e.to]||0)+1;
      if(e.kind==="paper-concept"){
        (pcOfC[e.to]=pcOfC[e.to]||[]).push(e);
        (pcOfP[e.from]=pcOfP[e.from]||[]).push(e);
      }
    });

    /* papers in true reading order, straight from the session lists */
    var porder=[], sess=[];
    D.sessions.forEach(function(s){
      sess.push({n:s.n,date:s.date,papers:s.papers.slice()});
      s.papers.forEach(function(pid){ porder.push(pid); });
    });

    /* live concepts and their session affinity (mean session of linked papers) */
    var live=D.concepts.filter(function(c){ return deg[c.id]; });
    var aff={};
    live.forEach(function(c){
      var es=pcOfC[c.id]||[], s=0;
      es.forEach(function(e){ var p=A.paper(e.from); if(p) s+=p.session; });
      aff[c.id]= es.length ? s/es.length : null;
    });

    /* families ordered left→right by the weighted mean session of their links,
       so the ground of the chart runs in step with the reading order above it */
    var famMap={};
    live.forEach(function(c){ (famMap[c.family]=famMap[c.family]||[]).push(c); });
    var fams=Object.keys(famMap).map(function(name){
      var cs=famMap[name], sum=0, n=0;
      cs.forEach(function(c){
        var es=pcOfC[c.id]||[];
        es.forEach(function(e){ var p=A.paper(e.from); if(p){ sum+=p.session; n++; } });
      });
      var mean=n?sum/n:5.5;
      cs.forEach(function(c){ if(aff[c.id]==null) aff[c.id]=mean; });
      cs.sort(function(a,b){ return aff[a.id]-aff[b.id] || a.label.localeCompare(b.label); });
      return {name:name, mean:mean, concepts:cs};
    });
    fams.sort(function(a,b){ return a.mean-b.mean || a.name.localeCompare(b.name); });

    var pp=D.edges.filter(function(e){ return e.kind==="paper-paper"; });
    var cc=D.edges.filter(function(e){ return e.kind==="concept-concept"; });
    var pc=D.edges.filter(function(e){ return e.kind==="paper-concept"; });

    return {deg:deg, porder:porder, sess:sess, live:live, fams:fams,
            pp:pp, cc:cc, pc:pc, pcOfC:pcOfC, pcOfP:pcOfP, aff:aff};
  };

  /* map an edge rel to the css class used by every view */
  A.relClass=function(e){
    return "t-"+(e.kind==="paper-paper" ? "cites"
      : e.kind==="concept-concept" ? "relates" : e.rel);
  };
})();

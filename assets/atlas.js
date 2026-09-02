(function(){
  "use strict";
  var D = window.SDL;
  var A = window.Atlas = {};

  /* ---- palettes: reader's choice, remembered, never fatal ---- */
  var SCHEMES = ["survey","cyanotype","bathy","thermal"];
  var LABEL = {survey:"Survey",cyanotype:"Cyanotype",bathy:"Bathymetric",thermal:"Thermal"};
  try{ var s = localStorage.getItem("sdl-scheme");
       if (SCHEMES.indexOf(s) >= 0) document.documentElement.setAttribute("data-scheme", s);
  }catch(e){}

  var SWATCH={survey:["#191b1d","#e06a55"],cyanotype:["#14395f","#e3b23c"],
              bathy:["#0d181d","#ee7fb4"],thermal:["#101012","#eb9b3f"]};
  A.esc = function(t){ return String(t == null ? "" : t)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); };
  A.qs = function(k){ return new URLSearchParams(location.search).get(k); };
  A.paper = function(id){ return D.papers.filter(function(p){ return p.id === id; })[0]; };
  A.concept = function(id){ return D.concepts.filter(function(c){ return c.id === id; })[0]; };
  A.clabel = function(id){ var c = A.concept(id); return c ? c.label : id.replace(/-/g," "); };
  A.date = function(iso){
    var M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var p = iso.split("-"); return M[+p[1]-1] + " " + (+p[2]);
  };

  /* ---- a quote always arrives inside the passage it came from ---- */
  A.passage = function(ctx, quote){
    if (!ctx) return '<p class="passage"><span class="none">Context not recovered from the PDF.'+
      '</span><br><mark>'+A.esc(quote)+'</mark></p>';
    return '<p class="passage">'+ (ctx.before ? "…"+A.esc(ctx.before)+" " : "") +
      '<mark>'+A.esc(ctx.hit)+'</mark>' + (ctx.after ? " "+A.esc(ctx.after)+"…" : "") + '</p>';
  };

  A.prov = function(e){
    var m = e.method === "citation" ? "From the bibliography" : "Verified against source";
    return '<p class="prov">'+A.esc(m)+'</p>';
  };

  /* ---- shell ---- */
  var NAV = [["index.html","Timeline"],["network.html","Connections"],
             ["papers.html","Papers"],["concepts.html","Concepts"],
             ["experiments.html","Experiments"],["resources.html","Resources"]];
  A.shell = function(here, dek){
    var nav = NAV.map(function(n){
      var cur = n[0] === here ? ' aria-current="page"' : "";
      return '<a href="'+n[0]+'"'+cur+'>'+n[1]+'</a>';
    }).join("");
    return '<header class="cartouche">'+
      '<h1>Stochastic deep learning</h1>'+
      (dek ? '<p class="dek">'+A.esc(dek)+'</p>' : '')+'<hr>'+
      '<nav aria-label="Sections">'+nav+'</nav></header>'+
      '';
  };

  A.foot = function(){
    return '<footer><p>'+D.stats.papers+' papers · '+D.stats.concepts_live+
      ' concepts · '+D.stats.edges+' links</p><p>1985 — 2023</p></footer>';
  };

  A.themeBar = function(){
    if (document.querySelector(".themes")) return;
    var d=document.createElement("div");
    d.className="themes"; d.setAttribute("role","group");
    d.setAttribute("aria-label","Theme");
    d.innerHTML='<span class="lbl">Theme</span>'+SCHEMES.map(function(s){
      var c=SWATCH[s];
      return '<button type="button" data-s="'+s+'" aria-label="'+LABEL[s]+'" '+
        'aria-pressed="false" style="background:'+c[0]+'">'+
        '<span style="position:absolute;inset:4px;border-radius:50%;background:'+c[1]+'"></span>'+
        '</button>'; }).join("");
    document.body.appendChild(d);
    var cur=document.documentElement.getAttribute("data-scheme")||"cyanotype";
    [].forEach.call(d.querySelectorAll("button"),function(b){
      b.setAttribute("aria-pressed",String(b.dataset.s===cur));
      b.addEventListener("click",function(){
        document.documentElement.setAttribute("data-scheme",b.dataset.s);
        try{ localStorage.setItem("sdl-scheme",b.dataset.s); }catch(e){}
        [].forEach.call(d.querySelectorAll("button"),function(o){
          o.setAttribute("aria-pressed",String(o===b)); });
      });
    });
  };

  A.mount = function(here, dek, html){
    document.getElementById("app").innerHTML = A.shell(here, dek) + html + A.foot();
    A.typeset();
    A.themeBar();
  };

  /* ---- math: only inside .math, never inside a verbatim quote ---- */
  A.typeset = function(){
    if (!window.MathJax || !MathJax.typesetPromise) return;
    var els = document.querySelectorAll(".math");
    if (!els.length) return;
    MathJax.typesetPromise([].slice.call(els)).catch(function(e){
      console.warn("math typeset skipped:", e && e.message);
    });
  };
  if (document.readyState !== "loading") { /* startup handled per-mount */ }
  window.addEventListener("load", function(){ A.typeset(); });

  /* ---- edge selectors ---- */
  A.of = function(pid){ return D.edges.filter(function(e){
    return e.kind === "paper-concept" && e.from === pid; }); };
  A.touching = function(cid){ return D.edges.filter(function(e){
    return e.kind === "paper-concept" && e.to === cid; }); };
  A.cc = function(cid){ return D.edges.filter(function(e){
    return e.kind === "concept-concept" && (e.from === cid || e.to === cid); }); };
  A.cites = function(pid){ return D.edges.filter(function(e){
    return e.kind === "paper-paper" && e.from === pid; }); };
  A.citedBy = function(pid){ return D.edges.filter(function(e){
    return e.kind === "paper-paper" && e.to === pid; }); };

  A.RELORDER = ["introduces","motivated-by","extends","replaces","uses",
                "evaluates-with","acknowledges-limitation"];

  /* "papers that introduces it" was wrong on every concept page */
  var PHRASE = {
    "introduces":"papers that introduce it",
    "motivated-by":"papers motivated by it",
    "extends":"papers that extend it",
    "replaces":"papers that replace it",
    "uses":"papers that use it",
    "evaluates-with":"papers that evaluate with it",
    "acknowledges-limitation":"papers that name it as a limitation"
  };
  A.relPhrase = function(rel){ return PHRASE[rel] || ("papers linked by "+rel.replace(/-/g," ")); };
})();

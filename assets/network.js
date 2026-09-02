(function(){
  "use strict";
  var A=window.Atlas, D=window.SDL;
  var TYPES=[["cites","cites"],["relates","concept ↔ concept"],["introduces","introduces"],
             ["motivated-by","motivated by"],["extends","extends"],["replaces","replaces"],
             ["uses","uses"],["evaluates-with","evaluates with"],
             ["acknowledges-limitation","limitation"]];
  var QUIET=["uses","evaluates-with"];
  var VIEWS=[["chart","Semester chart"],["bipartite","Papers ↔ concepts"],
             ["matrix","Citation matrix"]];
  var SCHEMES=[["survey","Survey"],["cyanotype","Cyanotype"],["bathy","Bathymetric"],["thermal","Thermal"]];
  var HINTS={
    chart:"Click a node to isolate it · double-click opens its page · Esc clears",
    bipartite:"Click a node to isolate it · double-click to open it",
    matrix:"A filled cell: the row paper cites the column paper · click to isolate · double-click opens"
  };

  var types={}; TYPES.forEach(function(t){ types[t[0]]=QUIET.indexOf(t[0])<0; });
  var view="chart", inst=null;

  document.getElementById("app").innerHTML=
    '<div class="netbar" id="netbar">'+
      '<a class="home" href="index.html">← Namche</a>'+
      '<span class="grp">'+VIEWS.map(function(v,i){
        return '<button type="button" class="mbtn" data-v="'+v[0]+'" aria-pressed="'+(i===0)+'">'+
          v[1]+'</button>'; }).join("")+'</span>'+
      '<span class="grp" id="chips">'+TYPES.map(function(t){
        var on=QUIET.indexOf(t[0])<0;
        return '<button type="button" class="rchip" data-r="'+t[0]+'" aria-pressed="'+on+'">'+
          t[1]+'</button>'; }).join("")+
      '<button type="button" class="mbtn" id="allw" aria-pressed="false">All wires</button></span>'+
      '<span class="count">'+D.stats.edges+' links · 28 papers · '+D.stats.concepts_live+' concepts</span>'+
    '</div>'+
    '<div class="netstage" id="stage"><div class="gvhost" id="gvhost"></div>'+
    '<p class="nethint" id="hint"></p></div>'+
    '<aside class="netpanel" id="panel"><button class="close" id="pclose" aria-label="Close">×</button>'+
    '<div id="pbody"></div></aside>';

  var stage=document.getElementById("stage"), host=document.getElementById("gvhost");
  var panel=document.getElementById("panel"), pbody=document.getElementById("pbody");

  function barh(){
    var h=document.getElementById("netbar").getBoundingClientRect().height;
    document.documentElement.style.setProperty("--barh",Math.round(h)+"px");
  }

  /* ---- where you have been ----
     Isolating a node says where you are and forgets where you were, which is
     the wrong trade when the whole point is to walk the graph. The last few
     visited nodes keep a glow, each fainter than the one after it.

     The decay is over visit ORDER, not wall-clock: a trail that evaporated
     while you sat reading the panel would punish the slow reader, who is the
     reader this site is for. Weight for the nth node back is exp(-n/TAU), so
     the one you just left is full strength and the trail is spent about seven
     nodes later. Ids are shared across all three views, so the trail follows
     you from the chart to the bipartite columns to the matrix. */
  var TRAIL=[], TAU=2.2, FLOOR=0.06, CAP=10, current=null;

  function remember(id){
    if(!id) return;
    var i=TRAIL.indexOf(id);
    if(i===0) return;             /* still standing on it */
    if(i>0) TRAIL.splice(i,1);    /* revisited: it comes back to the front */
    TRAIL.unshift(id);
    if(TRAIL.length>CAP) TRAIL.length=CAP;
  }

  function glow(){
    /* Ask the host for the svg that is actually on screen. A view paints once
       from inside its own constructor, before `inst` has been reassigned, so
       inst.svg would still be the previous view's detached node and the trail
       would be written to an element nobody can see. */
    var svg=host.querySelector("svg");
    if(!svg) return;
    var w={}, rank=0;
    TRAIL.forEach(function(id){
      if(current&&id===current) return;   /* the node you are on has its own mark */
      var v=Math.exp(-rank/TAU); rank++;
      if(v>=FLOOR) w[id]=v;
    });
    [].forEach.call(svg.querySelectorAll(".pn,.cn,.bn,.ml"),function(n){
      var v=w[n.dataset.id];
      n.classList.toggle("trail",!!v);
      if(v) n.style.setProperty("--trail",v.toFixed(3));
      else n.style.removeProperty("--trail");
    });
  }

  function detail(sel,edges){
    var selId=sel?(sel.id!==undefined?sel.id:sel):null;
    remember(selId); current=selId; glow();
    if(!sel){ panel.classList.remove("open"); return; }
    var id=selId;
    var kind=(sel.kind)||(A.paper(id)?"paper":"concept");
    var h='';
    if(kind==="paper"){
      var p=A.paper(id);
      h+='<p class="pk">Paper · '+p.year+' · session '+p.session+'</p>'+
        '<h3><a href="paper.html?id='+id+'">'+A.esc(p.title)+'</a></h3>'+
        '<p class="au">'+A.esc(p.authors)+'</p>';
    } else {
      var c=A.concept(id);
      h+='<p class="pk">Concept · '+A.esc(c.family)+'</p>'+
        '<h3><a href="concept.html?id='+id+'">'+A.esc(c.label)+'</a></h3>';
    }
    var grp={};
    (edges||[]).forEach(function(e){
      var from=e.from||(e.s&&e.s.id), to=e.to||(e.t&&e.t.id);
      var other=from===id?to:from, key;
      if(e.kind==="paper-paper"||e.type==="cites") key=(from===id?"cites":"cited by");
      else if(e.kind==="concept-concept"||e.type==="relates")
        key="related concept ("+e.rel.replace(/-/g," ")+")";
      else key = kind==="paper" ? e.rel.replace(/-/g," ") : A.relPhrase(e.rel);
      (grp[key]=grp[key]||[]).push(other);
    });
    Object.keys(grp).forEach(function(k){
      h+='<p class="rl">'+A.esc(k)+' · '+grp[k].length+'</p><p class="chips">'+
        grp[k].map(function(o){
          var isP=!!A.paper(o), lab=isP?A.paper(o).title:A.clabel(o);
          return '<a href="'+(isP?"paper.html?id=":"concept.html?id=")+o+'">'+
            A.esc(lab.length>36?lab.slice(0,35)+"…":lab)+'</a>'; }).join("")+'</p>';
    });
    if(!Object.keys(grp).length) h+='<p class="empty">No links under the current filters.</p>';
    pbody.innerHTML=h;
    panel.classList.add("open");
  }

  function render(){
    barh();
    host.innerHTML="";
    document.body.classList.toggle("bip",view==="bipartite");
    panel.classList.remove("open");
    document.getElementById("hint").textContent=HINTS[view];
    var chips=document.getElementById("chips");
    chips.style.display = view==="matrix" ? "none" : "";
    var cw=stage.clientWidth, ch=stage.clientHeight;
    if(view==="bipartite"){
      inst=A.BipView(host,D,{types:types,onSelect:detail});
    } else if(view==="chart"){
      inst=A.ChartView(host,D,{W:Math.max(980,cw),H:Math.max(660,ch),
        types:types,onSelect:detail});
    } else {
      inst=A.MatrixView(host,D,{W:cw,H:ch,onSelect:detail});
    }
    glow();   /* the trail is the shell's, not the view's: it crosses views */
  }
  render();

  /* Esc clears the selection; Esc again, with nothing selected, clears the trail.
     Capture phase so this sees `current` before the view's own handler nulls it. */
  document.addEventListener("keydown",function(ev){
    if(ev.key!=="Escape"||current||!TRAIL.length) return;
    TRAIL.length=0; glow();
  },true);

  document.getElementById("pclose").addEventListener("click",function(){
    panel.classList.remove("open");
    if(inst.select) inst.select(null);
  });
  [].forEach.call(document.querySelectorAll(".rchip[data-r]"),function(b){
    b.addEventListener("click",function(){
      var on=b.getAttribute("aria-pressed")!=="true";
      b.setAttribute("aria-pressed",String(on)); types[b.dataset.r]=on;
      if(inst.setType) inst.setType(b.dataset.r,on);
    });
  });
  [].forEach.call(document.querySelectorAll(".mbtn[data-v]"),function(b){
    b.addEventListener("click",function(){
      view=b.dataset.v;
      document.querySelectorAll(".mbtn[data-v]").forEach(function(o){
        o.setAttribute("aria-pressed",String(o.dataset.v===view)); });
      render();
    });
  });
  if(window.Atlas && Atlas.themeBar) Atlas.themeBar();
  document.getElementById("allw").addEventListener("click",function(){
    var on=this.getAttribute("aria-pressed")!=="true";
    this.setAttribute("aria-pressed",String(on));
    if(inst.setAll) inst.setAll(on);
  });
  var rt=null;
  window.addEventListener("resize",function(){
    clearTimeout(rt); rt=setTimeout(function(){ if(view!=="bipartite") render(); else barh(); },220);
  });
})();

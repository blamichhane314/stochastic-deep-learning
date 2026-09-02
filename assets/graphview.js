(function(){
  "use strict";
  var A=window.Atlas, NS="http://www.w3.org/2000/svg";

  function el(tag,cls,at){
    var n=document.createElementNS(NS,tag);
    if(cls) n.setAttribute("class",cls);
    if(at) Object.keys(at).forEach(function(k){ n.setAttribute(k,at[k]); });
    return n;
  }
  function txt(cls,x,y,s,at){
    var t=el("text",cls,at||{}); t.setAttribute("x",x); t.setAttribute("y",y);
    t.textContent=s; return t;
  }
  var CHW=5.8; /* estimated px per character at 10.5px Archivo */

  /* ================================================================
     THE SEMESTER CHART — the whole corpus on one deterministic plate.
     Sky: citation arcs over the 28 papers in true reading order.
     Ground: the 74 concepts in 11 family territories, ordered so the
     ground runs in step with the reading order above it.
     ================================================================ */
  A.ChartView=function(host,D,cfg){
    cfg=cfg||{};
    var net=A.Net(D);
    var W=cfg.W||1200, H=cfg.H||760;
    var L=20,R=20;

    /* ---- vertical registers ---- */
    var skyH=Math.max(150,Math.min(Math.round(H*0.27),235));
    var y0=skyH;                 /* paper centreline */
    var LB=62;                   /* angled label band */
    var rulerY=y0+16+LB;         /* session bracket line */
    var TT=rulerY+36;            /* territories top */
    var TZ=H-TT-8;

    /* ---- territory packing (deterministic ladder: shrink columns,
            then widen the plate for a horizontal scroll) ---- */
    var rowH=TZ/2, headH=34, step=16.5;
    var maxRows=Math.max(3,Math.floor((rowH-headH-6)/step));
    var avail=W-L-R, colW=0, plan=null;
    function headW(f){ return (f.name.length+4)*7.9+10; }
    function mkPlan(cw){
      return net.fams.map(function(f){
        var cols=Math.ceil(f.concepts.length/maxRows);
        return {f:f,cols:cols,w:Math.max(cols*cw+14,headW(f))};
      });
    }
    [176,162,148,134,122,110].some(function(cw){
      var p=mkPlan(cw);
      var tot=p.reduce(function(a,b){return a+b.w;},0)+(p.length-2)*12;
      if(tot<=2*avail*0.97){ colW=cw; plan=p; return true; }
      return false;
    });
    if(!plan){
      colW=110; plan=mkPlan(colW);
      var tot=plan.reduce(function(a,b){return a+b.w;},0);
      W=Math.max(W,Math.ceil(tot/2)+L+R+plan.length*12);
      avail=W-L-R;
    }
    /* greedy fill of two territory rows, then justify each row */
    var trows=[[],[]], tw=[0,0], ri=0;
    plan.forEach(function(b){
      if(ri===0 && tw[0]>0 && tw[0]+b.w+12>avail){ ri=1; }
      trows[ri].push(b); tw[ri]+=b.w+(trows[ri].length>1?12:0);
    });

    /* ---- paper x positions: reading order with session gutters ---- */
    var GUT=0.85, inset=34;
    var units=(net.porder.length-1)+ (net.sess.length-1)*GUT;
    var ustep=(W-L-R-2*inset)/units;
    var P={}, order=[], u=0;
    net.sess.forEach(function(s,si){
      if(si>0) u+=GUT;
      s.papers.forEach(function(pid,pi){
        if(pi>0) u+=1;
        var p=A.paper(pid);
        var sz=8+Math.min(net.deg[pid]||0,26)*0.34;
        P[pid]={id:pid,x:L+inset+u*ustep,y:y0,s:sz,short:A.short(p),p:p};
        order.push(pid);
      });
      s.x0=P[s.papers[0]].x; s.x1=P[s.papers[s.papers.length-1]].x;
    });

    /* ---- concept positions inside their territories ---- */
    var C={};
    trows.forEach(function(row,rix){
      var y=TT+rix*rowH;
      var used=row.reduce(function(a,b){return a+b.w;},0);
      var gap=row.length>1 ? (avail-used)/(row.length-1) : 0;
      var x=L;
      row.forEach(function(b){
        b.x=x; b.y=y;
        var eColW=(b.w-14)/b.cols;
        b.f.concepts.forEach(function(c,i){
          var col=Math.floor(i/maxRows), rw=i%maxRows;
          C[c.id]={id:c.id,c:c,
            x:b.x+10+col*eColW, y:y+headH+10+rw*step,
            r:2.3+Math.min(net.deg[c.id]||0,18)*0.2,
            lw:eColW-26};
        });
        x+=b.w+gap;
      });
    });

    /* ---- svg scaffold ---- */
    var svg=el("svg","chart",{viewBox:"0 0 "+W+" "+H,width:W,height:H,
      role:"group","aria-label":"Semester chart: papers in reading order above concept territories"});
    var gWv=el("g","gWv"), gArc=el("g","gArc"), gCC=el("g","gCC"),
        gWire=el("g","gWire"), gN=el("g","gN");
    [gWv,gArc,gCC,gWire,gN].forEach(function(g){ svg.appendChild(g); });
    host.appendChild(svg);

    gN.appendChild(txt("cap",L,16,net.pp.length+" citations among the "+net.porder.length+" papers"));

    /* ---- citation arcs, apex eased by span so they fill the sky ---- */
    var arcEls=[], maxDx=1;
    net.pp.forEach(function(e){
      if(P[e.from]&&P[e.to]) maxDx=Math.max(maxDx,Math.abs(P[e.from].x-P[e.to].x));
    });
    net.pp.forEach(function(e){
      var a=P[e.from],b=P[e.to]; if(!a||!b) return;
      var x1=a.x,x2=b.x, ya=y0-a.s/2-2, yb=y0-b.s/2-2;
      var h=20+(skyH-44)*Math.pow(Math.abs(x2-x1)/maxDx,0.72);
      var p=el("path","arc",{d:"M "+x1.toFixed(1)+" "+ya.toFixed(1)+
        " C "+x1.toFixed(1)+" "+(ya-h).toFixed(1)+" "+x2.toFixed(1)+" "+(yb-h).toFixed(1)+
        " "+x2.toFixed(1)+" "+yb.toFixed(1)});
      p._e=e; gArc.appendChild(p); arcEls.push(p);
    });

    /* ---- concept-relation curves (the corpus's own assertions) ---- */
    var ccEls=[];
    net.cc.forEach(function(e){
      var a=C[e.from],b=C[e.to]; if(!a||!b) return;
      var mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
      var dx=b.x-a.x, dy=b.y-a.y, d=Math.sqrt(dx*dx+dy*dy)||1;
      var k=Math.min(46,10+d*0.18);
      var p=el("path","ccv",{d:"M "+a.x+" "+a.y+" Q "+(mx-dy/d*k).toFixed(1)+" "+
        (my+dx/d*k).toFixed(1)+" "+b.x+" "+b.y});
      p._e=e; gCC.appendChild(p); ccEls.push(p);
    });

    /* ---- session ruler ---- */
    net.sess.forEach(function(s){
      var x0=s.x0-ustep*0.34, x1=s.x1+ustep*0.34, xm=(x0+x1)/2;
      gN.appendChild(el("path","brk",{d:"M "+x0+" "+(rulerY-5)+" V "+rulerY+
        " H "+x1+" V "+(rulerY-5)}));
      gN.appendChild(txt("sn",xm,rulerY+15,"S"+s.n,{"text-anchor":"middle"}));
      gN.appendChild(txt("sd",xm,rulerY+28,A.date(s.date),{"text-anchor":"middle"}));
    });

    /* ---- paper nodes ---- */
    var nEls={};
    order.forEach(function(pid){
      var v=P[pid];
      var g=el("g","pn",{tabindex:0,role:"button","aria-label":"paper: "+v.p.title});
      g.dataset.id=pid; g.dataset.kind="paper";
      g.appendChild(el("circle","hit",{cx:v.x,cy:v.y,r:16,fill:"transparent"}));
      g.appendChild(el("rect","mk",{x:(v.x-v.s/2).toFixed(1),y:(v.y-v.s/2).toFixed(1),
        width:v.s.toFixed(1),height:v.s.toFixed(1)}));
      var t=txt("pl",(v.x+3).toFixed(1),(v.y+v.s/2+13).toFixed(1),v.short,
        {"text-anchor":"end"});
      t.setAttribute("transform","rotate(-33 "+(v.x+3).toFixed(1)+" "+(v.y+v.s/2+13).toFixed(1)+")");
      g.appendChild(t);
      gN.appendChild(g); nEls[pid]=g;
    });

    /* ---- territories + concept nodes ---- */
    trows.forEach(function(row){
      row.forEach(function(b){
        gN.appendChild(txt("fh",b.x,b.y+16,
          b.f.name+" · "+b.f.concepts.length));
        gN.appendChild(el("path","fr",{d:"M "+b.x+" "+(b.y+23)+" H "+(b.x+b.w-14)}));
      });
    });
    var fitQ=[];
    net.live.forEach(function(c){
      var v=C[c.id]; if(!v) return;
      var g=el("g","cn",{tabindex:0,role:"button","aria-label":"concept: "+c.label});
      g.dataset.id=c.id; g.dataset.kind="concept";
      g.appendChild(el("rect","hit",{x:v.x-8,y:v.y-8,width:v.lw+18,height:16,fill:"transparent"}));
      g.appendChild(el("circle","dot",{cx:v.x,cy:v.y,r:v.r.toFixed(1)}));
      var t=txt("cl",v.x+9,v.y+3.6,c.label);
      g.appendChild(t); fitQ.push([t,c.label,v.lw]);
      gN.appendChild(g); nEls[c.id]=g;
    });
    /* measured truncation: trim only labels that actually overflow */
    fitQ.forEach(function(q){
      var t=q[0], s=q[1], w=q[2], n=s.length;
      try{
        while(n>4 && t.getComputedTextLength()>w){ n--; t.textContent=s.slice(0,n)+"…"; }
      }catch(e){ t.textContent=A.cut(s,Math.floor(w/CHW)); }
    });

    /* ---- wires (drawn on demand) ---- */
    function wireD(pid,cid){
      var a=P[pid],b=C[cid];
      var y1=a.y+a.s/2+2, y2=b.y-b.r-1, m=(y1+y2)/2;
      return "M "+a.x.toFixed(1)+" "+y1.toFixed(1)+
        " C "+a.x.toFixed(1)+" "+m.toFixed(1)+" "+b.x.toFixed(1)+" "+m.toFixed(1)+
        " "+b.x.toFixed(1)+" "+y2.toFixed(1);
    }
    var types=cfg.types||{}, showAll=false, sel=null, hov=null;
    function on(t){ return types[t]!==false; }

    function whisper(){
      while(gWv.firstChild) gWv.removeChild(gWv.firstChild);
      if(!showAll) return;
      net.pc.forEach(function(e){
        if(!on(e.rel)||!P[e.from]||!C[e.to]) return;
        gWv.appendChild(el("path","wv",{d:wireD(e.from,e.to)}));
      });
    }

    function liveEdgesFor(id,kind){
      var out=[];
      if(kind==="paper"){
        net.pc.forEach(function(e){ if(e.from===id&&on(e.rel)&&C[e.to]) out.push(e); });
        if(on("cites")) net.pp.forEach(function(e){
          if(e.from===id||e.to===id) out.push(e); });
      } else {
        net.pc.forEach(function(e){ if(e.to===id&&on(e.rel)&&P[e.from]) out.push(e); });
        if(on("relates")) net.cc.forEach(function(e){
          if(e.from===id||e.to===id) out.push(e); });
      }
      return out;
    }

    function paint(){
      while(gWire.firstChild) gWire.removeChild(gWire.firstChild);
      svg.classList.toggle("focused",!!sel);
      var live=sel?liveEdgesFor(sel.id,sel.kind):[], near={};
      live.forEach(function(e){ near[e.from]=1; near[e.to]=1; });
      live.forEach(function(e){
        if(e.kind!=="paper-concept") return;
        gWire.appendChild(el("path","w hot "+A.relClass(e),{d:wireD(e.from,e.to)}));
      });
      if(!sel && hov){
        liveEdgesFor(hov.id,hov.kind).forEach(function(e){
          if(e.kind!=="paper-concept") return;
          gWire.appendChild(el("path","w pv "+A.relClass(e),{d:wireD(e.from,e.to)}));
        });
      }
      arcEls.forEach(function(p){
        var e=p._e, cls="arc";
        p.style.display=on("cites")?"":"none";
        if(sel){
          if(sel.kind==="paper"&&e.from===sel.id) cls="arc out";
          else if(sel.kind==="paper"&&e.to===sel.id) cls="arc in";
          else cls="arc dim";
        } else if(hov&&hov.kind==="paper"){
          if(e.from===hov.id) cls="arc out pv"; else if(e.to===hov.id) cls="arc in pv";
        }
        p.setAttribute("class",cls);
      });
      ccEls.forEach(function(p){
        var e=p._e, cls="ccv";
        p.style.display=on("relates")?"":"none";
        var hit=function(o){ return o&&(e.from===o.id||e.to===o.id||e.asserted_by===o.id); };
        if(sel) cls=hit(sel)?"ccv hot":"ccv dim";
        else if(hov&&hit(hov)) cls="ccv hot";
        p.setAttribute("class",cls);
      });
      Object.keys(nEls).forEach(function(id){
        var g=nEls[id];
        g.classList.toggle("sel",!!sel&&sel.id===id);
        g.classList.toggle("near",!!sel&&!!near[id]&&sel.id!==id);
        g.classList.toggle("far",!!sel&&!near[id]&&sel.id!==id);
      });
      if(cfg.onSelect) cfg.onSelect(sel,live);
    }

    /* ---- interaction ---- */
    var down=null;
    svg.addEventListener("pointerdown",function(ev){ down={x:ev.clientX,y:ev.clientY}; });
    svg.addEventListener("pointerup",function(ev){
      if(!down) return;
      var moved=Math.abs(ev.clientX-down.x)+Math.abs(ev.clientY-down.y);
      down=null; if(moved>6) return;
      var n=ev.target.closest(".pn,.cn");
      sel = n ? (sel&&sel.id===n.dataset.id?null:{id:n.dataset.id,kind:n.dataset.kind}) : null;
      hov=null; paint();
    });
    svg.addEventListener("dblclick",function(ev){
      var n=ev.target.closest(".pn,.cn"); if(!n) return;
      location.href=(n.dataset.kind==="paper"?"paper.html?id=":"concept.html?id=")+n.dataset.id;
    });
    svg.addEventListener("keydown",function(ev){
      var n=ev.target.closest&&ev.target.closest(".pn,.cn");
      if(n&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault();
        sel=(sel&&sel.id===n.dataset.id)?null:{id:n.dataset.id,kind:n.dataset.kind}; paint(); }
      else if(ev.key==="Escape"){ sel=null; paint(); }
    });
    svg.addEventListener("pointerover",function(ev){
      var n=ev.target.closest(".pn,.cn");
      var h=n?{id:n.dataset.id,kind:n.dataset.kind}:null;
      if((h&&h.id)!==(hov&&hov.id)){ hov=h; if(!sel) paint(); }
    });
    svg.addEventListener("pointerout",function(ev){
      if(!ev.relatedTarget||!ev.relatedTarget.closest||!ev.relatedTarget.closest(".pn,.cn")){
        if(hov){ hov=null; if(!sel) paint(); } }
    });

    whisper(); paint();
    return {
      svg:svg,
      setType:function(t,v){ types[t]=v; whisper(); paint(); },
      setAll:function(v){ showAll=v; whisper(); },
      select:function(id,kind){ sel=id?{id:id,kind:kind}:null; paint(); }
    };
  };

  /* ================================================================
     THE CITATION MATRIX — who cites whom, in reading order.
     A filled cell means the row paper cites the column paper.
     ================================================================ */
  A.MatrixView=function(host,D,cfg){
    cfg=cfg||{};
    var net=A.Net(D);
    var n=net.porder.length;
    var LW=168, TW=118, ML=26, MT=8;
    var availW=(cfg.W||1100)-LW-ML-64, availH=(cfg.H||760)-TW-MT-46;
    var c=Math.max(13,Math.min(24,Math.floor(Math.min(availW,availH)/n)));
    var ox=ML+LW, oy=MT+TW, S=n*c;
    var W=Math.max(cfg.W||0,ox+S+64), H=Math.max(cfg.H||0,oy+S+46);

    var idx={}; net.porder.forEach(function(pid,i){ idx[pid]=i; });
    var outN={}, inN={};
    net.pp.forEach(function(e){ outN[e.from]=(outN[e.from]||0)+1; inN[e.to]=(inN[e.to]||0)+1; });

    var svg=el("svg","mx",{viewBox:"0 0 "+W+" "+H,width:W,height:H,
      role:"group","aria-label":"Citation matrix: a filled cell means the row paper cites the column paper"});
    host.appendChild(svg);
    var gG=el("g","gG"), gC=el("g","gC"), gL=el("g","gL");
    svg.appendChild(gG); svg.appendChild(gC); svg.appendChild(gL);

    /* grid + session rules */
    for(var i=0;i<=n;i++){
      gG.appendChild(el("path","gl",{d:"M "+ox+" "+(oy+i*c)+" H "+(ox+S)}));
      gG.appendChild(el("path","gl",{d:"M "+(ox+i*c)+" "+oy+" V "+(oy+S)}));
    }
    var acc=0;
    net.sess.forEach(function(s){
      acc+=s.papers.length;
      if(acc<n){
        gG.appendChild(el("path","sl",{d:"M "+ox+" "+(oy+acc*c)+" H "+(ox+S)}));
        gG.appendChild(el("path","sl",{d:"M "+(ox+acc*c)+" "+oy+" V "+(oy+S)}));
      }
    });
    gG.appendChild(el("path","dg",{d:"M "+ox+" "+oy+" L "+(ox+S)+" "+(oy+S)}));

    /* crosshair shades */
    var rowSh=el("rect","shade",{x:ox,y:-99,width:S,height:c,display:"none"});
    var colSh=el("rect","shade",{x:-99,y:oy,width:c,height:S,display:"none"});
    gG.appendChild(rowSh); gG.appendChild(colSh);

    gL.appendChild(txt("axis",ox-8,oy-8,"cites →",{"text-anchor":"end"}));

    /* labels */
    var rEls={}, cEls={};
    net.porder.forEach(function(pid,i){
      var p=A.paper(pid), lab=A.short(p);
      var g=el("g","ml",{tabindex:0,role:"button","aria-label":"paper: "+p.title});
      g.dataset.id=pid;
      g.appendChild(el("rect","hit",{x:ML-6,y:oy+i*c,width:LW+S+12,height:c,fill:"transparent"}));
      g.appendChild(txt("mt",ox-8,oy+i*c+c/2+3.5,lab,{"text-anchor":"end"}));
      g.appendChild(txt("mn",ox+S+8,oy+i*c+c/2+3.5,outN[pid]||"·"));
      gL.appendChild(g); rEls[pid]=g;

      var x=ox+i*c+c/2;
      var g2=el("g","ml col");
      g2.dataset.id=pid;
      var t=txt("mt",x+3,oy-8,lab,{"text-anchor":"start"});
      t.setAttribute("transform","rotate(-56 "+(x+3)+" "+(oy-8)+")");
      g2.appendChild(t);
      var bn=txt("mn",x,oy+S+16,inN[pid]||"·",{"text-anchor":"middle"});
      g2.appendChild(bn);
      gL.appendChild(g2); cEls[pid]=g2;
    });

    /* cells */
    var cells=[];
    net.pp.forEach(function(e){
      var r=idx[e.from], k=idx[e.to];
      if(r==null||k==null) return;
      var g=el("g","cell");
      g.dataset.from=e.from; g.dataset.to=e.to;
      var rc=el("rect","cf",{x:ox+k*c+2.5,y:oy+r*c+2.5,width:c-5,height:c-5});
      var ti=el("title"); ti.textContent=A.short(A.paper(e.from))+" cites "+A.short(A.paper(e.to));
      g.appendChild(rc); g.appendChild(ti);
      g._e=e; gC.appendChild(g); cells.push(g);
    });

    var sel=null;
    function paint(){
      svg.classList.toggle("focused",!!sel);
      cells.forEach(function(g){
        var e=g._e, hit=sel&&(e.from===sel||e.to===sel);
        g.classList.toggle("hot",!!hit);
        g.classList.toggle("dim",!!sel&&!hit);
      });
      net.porder.forEach(function(pid){
        var near=sel&&net.pp.some(function(e){
          return (e.from===sel&&e.to===pid)||(e.to===sel&&e.from===pid); });
        [rEls[pid],cEls[pid]].forEach(function(g){
          g.classList.toggle("sel",sel===pid);
          g.classList.toggle("near",!!near&&sel!==pid);
          g.classList.toggle("far",!!sel&&!near&&sel!==pid);
        });
      });
      if(cfg.onSelect)
        cfg.onSelect(sel?{id:sel,kind:"paper"}:null,
          sel?net.pp.filter(function(e){ return e.from===sel||e.to===sel; }):[]);
    }
    function cross(r,k){
      if(r==null){ rowSh.setAttribute("display","none"); }
      else { rowSh.setAttribute("display",""); rowSh.setAttribute("y",oy+r*c); }
      if(k==null){ colSh.setAttribute("display","none"); }
      else { colSh.setAttribute("display",""); colSh.setAttribute("x",ox+k*c); }
    }
    svg.addEventListener("pointermove",function(ev){
      var pt=svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY;
      var m=svg.getScreenCTM(); if(!m) return;
      var q=pt.matrixTransform(m.inverse());
      var r=(q.y>=oy&&q.y<=oy+S)?Math.floor((q.y-oy)/c):null;
      var k=(q.x>=ox&&q.x<=ox+S)?Math.floor((q.x-ox)/c):null;
      cross(r,k);
    });
    svg.addEventListener("pointerleave",function(){ cross(null,null); });
    function pick(ev){
      var cell=ev.target.closest(".cell");
      var lab=ev.target.closest(".ml");
      var id=cell?cell.dataset.from:(lab?lab.dataset.id:null);
      sel=(id&&sel!==id)?id:null; paint();
    }
    svg.addEventListener("click",pick);
    svg.addEventListener("dblclick",function(ev){
      var cell=ev.target.closest(".cell"), lab=ev.target.closest(".ml");
      var id=cell?cell.dataset.from:(lab?lab.dataset.id:null);
      if(id) location.href="paper.html?id="+id;
    });
    svg.addEventListener("keydown",function(ev){
      var g=ev.target.closest&&ev.target.closest(".ml");
      if(g&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault();
        sel=(sel===g.dataset.id)?null:g.dataset.id; paint(); }
      else if(ev.key==="Escape"){ sel=null; paint(); }
    });

    paint();
    return {
      svg:svg,
      setType:function(){}, setAll:function(){},
      select:function(id){ sel=id||null; paint(); }
    };
  };

  /* ================================================================
     THE COMPASS ROSE — one paper's whole neighbourhood on a ring:
     concepts by family, then the papers it cites, then its citers.
     Chords keep the links among the neighbours.
     ================================================================ */
  A.Rose=function(host,D,pid,cfg){
    cfg=cfg||{};
    var net=A.Net(D);
    var famRank={}; net.fams.forEach(function(f,i){ famRank[f.name]=i; });

    var items=[], seen={};
    function push(id,kind,rel){
      if(id===pid||seen[id]) return; seen[id]=1;
      var it={id:id,kind:kind,rel:rel};
      if(kind==="concept"){ var c=A.concept(id); it.label=c.label; it.fam=famRank[c.family]||0; }
      else it.label=A.short(A.paper(id));
      items.push(it);
    }
    var cons=[],outs=[],ins=[];
    D.edges.forEach(function(e){
      if(e.kind==="paper-concept"&&e.from===pid) cons.push(e);
      else if(e.kind==="paper-paper"&&e.from===pid) outs.push(e);
      else if(e.kind==="paper-paper"&&e.to===pid) ins.push(e);
      else if(e.kind==="concept-concept"&&e.asserted_by===pid){
        push(e.from,"concept","relates"); push(e.to,"concept","relates");
      }
    });
    cons.sort(function(a,b){
      var ca=A.concept(a.to), cb=A.concept(b.to);
      return (famRank[ca.family]||0)-(famRank[cb.family]||0)
        || (net.aff[a.to]||0)-(net.aff[b.to]||0);
    });
    cons.forEach(function(e){ push(e.to,"concept",e.rel); });
    outs.forEach(function(e){ push(e.to,"paper","cites"); });
    ins.forEach(function(e){ push(e.from,"paper","cited-by"); });
    if(items.length<2){ return null; }

    /* which relations this particular rose ended up drawing, in the house order.
       The key is built from this, so it never names a line the reader cannot see. */
    var drew={}; items.forEach(function(it){ drew[it.rel]=1; });
    var relsDrawn=A.RELORDER.concat(["relates","cites","cited-by"])
      .filter(function(r){ return drew[r]; });

    /* segment gaps: before concepts, before cites, before cited-by */
    var segStart={}; segStart[0]=1;
    var nc=items.filter(function(i){return i.kind==="concept";}).length;
    var no=outs.length;
    if(nc<items.length) segStart[nc]=1;
    if(no&&nc+no<items.length) segStart[nc+no]=1;
    var gaps=Object.keys(segStart).length;

    /* Every ring label runs radially, so its room has to be reserved on all
       sides. The rose sits in the paper page's sidebar now, not in a wide
       column, so the reserve and the radius follow the host width rather than
       assuming one: at 560px it draws as it always did, and it keeps shrinking
       rather than overflowing when the column is narrower than that. */
    var W=Math.max(380,cfg.W||host.clientWidth||760);
    var LR=Math.max(96,Math.min(138,Math.round(W*0.27))), LCUT=LR>=118?22:16;
    var r=Math.max(80,Math.min((W-2*LR-20)/2, 130+items.length*4, 200));
    var H=Math.round(2*(r+LR)+10);
    var cx=W/2, cy=Math.round(H/2);

    var slots=items.length+gaps*1.4, a0=-Math.PI/2;
    var acc2=0;
    items.forEach(function(it,i){
      if(segStart[i]) acc2+=1.4;
      it.th=a0+((i+acc2)/slots)*2*Math.PI;
      it.x=cx+r*Math.cos(it.th); it.y=cy+r*Math.sin(it.th);
    });
    var byId={}; items.forEach(function(it){ byId[it.id]=it; });

    var svg=el("svg","rose",{viewBox:"0 0 "+W+" "+H,width:W,height:H,
      role:"group","aria-label":"Neighbourhood of this paper"});
    host.appendChild(svg);
    var gCh=el("g","gCh"), gSp=el("g","gSp"), gI=el("g","gI");
    svg.appendChild(gCh); svg.appendChild(gSp); svg.appendChild(gI);

    /* chords: links among the neighbours */
    var chords=[];
    D.edges.forEach(function(e){
      if(e.from===pid||e.to===pid) return;
      var a=byId[e.from], b=byId[e.to]; if(!a||!b) return;
      var mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
      var qx=mx+(cx-mx)*0.55, qy=my+(cy-my)*0.55;
      var p=el("path","ch "+A.relClass(e),
        {d:"M "+a.x.toFixed(1)+" "+a.y.toFixed(1)+" Q "+qx.toFixed(1)+" "+qy.toFixed(1)+
           " "+b.x.toFixed(1)+" "+b.y.toFixed(1)});
      p._a=e.from; p._b=e.to; gCh.appendChild(p); chords.push(p);
    });

    /* spokes */
    var spokes={};
    items.forEach(function(it){
      var x0=cx+30*Math.cos(it.th), y0=cy+30*Math.sin(it.th);
      var x1=cx+(r-9)*Math.cos(it.th), y1=cy+(r-9)*Math.sin(it.th);
      var s=el("path","sp t-"+it.rel,{d:"M "+x0.toFixed(1)+" "+y0.toFixed(1)+
        " L "+x1.toFixed(1)+" "+y1.toFixed(1)});
      gSp.appendChild(s); spokes[it.id]=s;
    });

    /* centre */
    var p0=A.paper(pid);
    gI.appendChild(el("rect","ctr",{x:cx-7,y:cy-7,width:14,height:14}));
    gI.appendChild(txt("ctl",cx,cy+24,A.short(p0),{"text-anchor":"middle"}));

    /* ring items */
    var iEls={};
    items.forEach(function(it){
      var g=el("g","ri k-"+it.kind,{tabindex:0,role:"link",
        "aria-label":it.kind+": "+it.label});
      g.dataset.id=it.id; g.dataset.kind=it.kind;
      g.appendChild(el("circle","hit",{cx:it.x,cy:it.y,r:13,fill:"transparent"}));
      if(it.kind==="paper")
        g.appendChild(el("rect","mk",{x:it.x-4.5,y:it.y-4.5,width:9,height:9}));
      else
        g.appendChild(el("circle","dot",{cx:it.x,cy:it.y,
          r:(2.4+Math.min(net.deg[it.id]||0,18)*0.16).toFixed(1)}));
      var deg=it.th*180/Math.PI, right=Math.cos(it.th)>=-0.001;
      var lx=cx+(r+13)*Math.cos(it.th), ly=cy+(r+13)*Math.sin(it.th)+3.5;
      var t=txt("rl",lx.toFixed(1),ly.toFixed(1),A.cut(it.label,LCUT),
        {"text-anchor":right?"start":"end"});
      t.setAttribute("transform","rotate("+(right?deg:deg+180).toFixed(1)+
        " "+lx.toFixed(1)+" "+(ly-3.5).toFixed(1)+")");
      g.appendChild(t);
      gI.appendChild(g); iEls[it.id]=g;
    });

    function paint(hot){
      svg.classList.toggle("focused",!!hot);
      chords.forEach(function(p){
        var near=hot&&(p._a===hot||p._b===hot);
        p.classList.toggle("hot",!!near);
        p.classList.toggle("dim",!!hot&&!near);
      });
      items.forEach(function(it){
        spokes[it.id].classList.toggle("hot",hot===it.id);
        spokes[it.id].classList.toggle("dim",!!hot&&hot!==it.id);
        iEls[it.id].classList.toggle("hl",hot===it.id);
      });
    }
    svg.addEventListener("pointerover",function(ev){
      var g=ev.target.closest(".ri"); paint(g?g.dataset.id:null);
    });
    svg.addEventListener("pointerout",function(ev){
      if(!ev.relatedTarget||!ev.relatedTarget.closest||!ev.relatedTarget.closest(".ri"))
        paint(null);
    });
    function open(g){
      location.href=(g.dataset.kind==="paper"?"paper.html?id=":"concept.html?id=")+g.dataset.id;
    }
    svg.addEventListener("click",function(ev){
      var g=ev.target.closest(".ri"); if(g) open(g);
    });
    svg.addEventListener("keydown",function(ev){
      var g=ev.target.closest&&ev.target.closest(".ri");
      if(g&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault(); open(g); }
    });
    paint(null);
    return {svg:svg, rels:relsDrawn, chords:chords.length>0};
  };
})();

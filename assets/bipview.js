(function(){
  "use strict";
  var A=window.Atlas, NS="http://www.w3.org/2000/svg";

  A.BipView=function(host,D,cfg){
    cfg=cfg||{};
    var FAM=["obstruction","energy","score","diffusion","variational","flow",
             "autoregressive","adversarial","metric","architecture","evaluation"];
    var linked={};
    D.edges.forEach(function(e){
      if(e.kind==="paper-concept") linked[e.to]=1;
      else if(e.kind==="concept-concept"){ linked[e.from]=1; linked[e.to]=1; }
    });
    var P=D.papers.slice().sort(function(a,b){ return a.session-b.session; });
    var C=D.concepts.filter(function(c){ return linked[c.id]; })
      .sort(function(a,b){ return FAM.indexOf(a.family)-FAM.indexOf(b.family)
        || a.label.localeCompare(b.label); });
    var pc=D.edges.filter(function(e){ return e.kind==="paper-concept"; });
    var cc=D.edges.filter(function(e){ return e.kind==="concept-concept"; });
    var ct=D.edges.filter(function(e){ return e.kind==="paper-paper"; });

    var W=1020, PLAB=250, PX=322, CX=660, TOP=48;
    var H=TOP+Math.max(P.length*32, C.length*16.5)+34;
    var py={}, cy={};
    P.forEach(function(p,i){ py[p.id]=TOP+i*((H-TOP-24)/(P.length-1)); });
    C.forEach(function(c,i){ cy[c.id]=TOP+i*((H-TOP-24)/(C.length-1)); });

    var sel=null, types=cfg.types||{}, showAll=false;
    function on(t){ return types[t]!==false; }
    function cut(s,n){ return s.length>n? s.slice(0,n-1)+"…" : s; }

    var svg=document.createElementNS(NS,"svg");
    svg.setAttribute("viewBox","0 0 "+W+" "+H);
    svg.setAttribute("class","bip2");
    svg.setAttribute("role","group");
    svg.setAttribute("aria-label","Papers on the left, concepts on the right");
    host.appendChild(svg);

    var gW=document.createElementNS(NS,"g");
    var gN=document.createElementNS(NS,"g");
    svg.appendChild(gW); svg.appendChild(gN);

    function node(kind,id,label,x,y,sub,r){
      var g=document.createElementNS(NS,"g");
      g.setAttribute("class","bn k-"+kind); g.dataset.id=id; g.dataset.kind=kind;
      g.setAttribute("tabindex","0"); g.setAttribute("role","button");
      g.setAttribute("aria-label",kind+": "+label);
      var hit=document.createElementNS(NS,"rect");
      hit.setAttribute("x", kind==="paper"?0:(x-10));
      hit.setAttribute("y", y-(kind==="paper"?13:8));
      hit.setAttribute("width", kind==="paper"?(PX+12):(W-x+10));
      hit.setAttribute("height", kind==="paper"?26:16);
      hit.setAttribute("fill","transparent"); hit.setAttribute("class","hit");
      var dot=document.createElementNS(NS,"circle");
      dot.setAttribute("cx",x); dot.setAttribute("cy",y); dot.setAttribute("r",r);
      dot.setAttribute("class","bdot");
      var tx=document.createElementNS(NS,"text");
      tx.setAttribute("class","blab"+(kind==="concept"?" sm":""));
      if(kind==="paper"){ tx.setAttribute("x",PLAB); tx.setAttribute("y",y+3);
        tx.setAttribute("text-anchor","end"); }
      else { tx.setAttribute("x",x+11); tx.setAttribute("y",y+3.4); }
      tx.textContent=label;
      g.appendChild(hit); g.appendChild(dot); g.appendChild(tx);
      if(sub){
        var s2=document.createElementNS(NS,"text");
        s2.setAttribute("class","bsub"); s2.setAttribute("x",PLAB);
        s2.setAttribute("y",y+14); s2.setAttribute("text-anchor","end");
        s2.textContent=sub; g.appendChild(s2);
      }
      gN.appendChild(g); return g;
    }

    var head1=document.createElementNS(NS,"text");
    head1.setAttribute("class","bhead"); head1.setAttribute("x",PLAB);
    head1.setAttribute("y",22); head1.setAttribute("text-anchor","end");
    head1.textContent=P.length+" papers · reading order"; gN.appendChild(head1);
    var head2=document.createElementNS(NS,"text");
    head2.setAttribute("class","bhead"); head2.setAttribute("x",CX+11);
    head2.setAttribute("y",22); head2.textContent=C.length+" concepts · by family";
    gN.appendChild(head2);

    var els={};
    P.forEach(function(p){
      els[p.id]=node("paper",p.id,cut(p.title,38),PX,py[p.id],
        p.year+" · "+A.of(p.id).length+" links",3.4);
    });
    C.forEach(function(c){
      var n=A.touching(c.id).length;
      els[c.id]=node("concept",c.id,c.label,CX,cy[c.id],null,2+Math.min(n,9)*0.32);
    });

    function wire(x1,y1,x2,y2){
      var mx=(x1+x2)/2;
      return "M "+x1+" "+y1+" C "+mx+" "+y1+" "+mx+" "+y2+" "+x2+" "+y2;
    }
    function arc(x,y1,y2,side){
      var d=Math.abs(y2-y1), bulge=Math.min(150,26+d*0.30)*(side==="L"?-1:1);
      return "M "+x+" "+y1+" C "+(x+bulge)+" "+y1+" "+(x+bulge)+" "+y2+" "+x+" "+y2;
    }

    function draw(){
      while(gW.firstChild) gW.removeChild(gW.firstChild);
      var live=[], near={};
      if(sel){
        if(sel.kind==="paper"){
          live=pc.filter(function(e){ return e.from===sel.id && on(e.rel); });
          live.forEach(function(e){ near[e.to]=1; });
          if(on("cites")) ct.filter(function(e){ return e.from===sel.id||e.to===sel.id; })
            .forEach(function(e){ live.push(e); near[e.from]=1; near[e.to]=1; });
        } else {
          live=pc.filter(function(e){ return e.to===sel.id && on(e.rel); });
          live.forEach(function(e){ near[e.from]=1; });
          if(on("relates")) cc.filter(function(e){ return e.from===sel.id||e.to===sel.id; })
            .forEach(function(e){ live.push(e); near[e.from]=1; near[e.to]=1; });
        }
      } else if(showAll){
        live=pc.filter(function(e){ return on(e.rel); });
      }
      live.forEach(function(e){
        var p=document.createElementNS(NS,"path");
        if(e.kind==="paper-concept") p.setAttribute("d",wire(PX,py[e.from],CX,cy[e.to]));
        else if(e.kind==="paper-paper") p.setAttribute("d",arc(PX,py[e.from],py[e.to],"L"));
        else p.setAttribute("d",arc(CX,cy[e.from],cy[e.to],"R"));
        p.setAttribute("class","bw t-"+(e.kind==="paper-paper"?"cites":
          e.kind==="concept-concept"?"relates":e.rel));
        gW.appendChild(p);
      });
      Object.keys(els).forEach(function(id){
        var g=els[id];
        g.classList.toggle("sel", !!sel && sel.id===id);
        g.classList.toggle("near", !!near[id] && (!sel||sel.id!==id));
        g.classList.toggle("far", !!sel && !near[id] && sel.id!==id);
      });
      if(cfg.onSelect) cfg.onSelect(sel, live);
    }

    /* click that survives drag: compare down/up positions */
    var down=null;
    svg.addEventListener("pointerdown",function(ev){ down={x:ev.clientX,y:ev.clientY}; });
    svg.addEventListener("pointerup",function(ev){
      if(!down) return;
      var moved=Math.abs(ev.clientX-down.x)+Math.abs(ev.clientY-down.y);
      down=null; if(moved>6) return;
      var n=ev.target.closest(".bn");
      if(n){ sel = (sel&&sel.id===n.dataset.id) ? null : {id:n.dataset.id,kind:n.dataset.kind}; }
      else sel=null;
      draw();
    });
    svg.addEventListener("keydown",function(ev){
      var n=ev.target.closest&&ev.target.closest(".bn");
      if(n&&(ev.key==="Enter"||ev.key===" ")){ ev.preventDefault();
        sel=(sel&&sel.id===n.dataset.id)?null:{id:n.dataset.id,kind:n.dataset.kind}; draw(); }
      else if(ev.key==="Escape"){ sel=null; draw(); }
    });
    svg.addEventListener("dblclick",function(ev){
      var n=ev.target.closest(".bn"); if(!n) return;
      location.href=(n.dataset.kind==="paper"?"paper.html?id=":"concept.html?id=")+n.dataset.id;
    });

    draw();
    return {
      setType:function(t,v){ types[t]=v; draw(); },
      setAll:function(v){ showAll=v; draw(); },
      select:function(id,kind){ sel=id?{id:id,kind:kind}:null; draw(); },
      svg:svg
    };
  };
})();

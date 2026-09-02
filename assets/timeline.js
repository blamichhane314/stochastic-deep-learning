(function(){
  "use strict";
  var A=window.Atlas, D=window.SDL;

  function dominant(pids){
    var c={}; pids.forEach(function(p){
      A.of(p).forEach(function(e){
        var f=(A.concept(e.to)||{}).family; if(f) c[f]=(c[f]||0)+1; }); });
    var best=null,n=-1; for(var k in c) if(c[k]>n){ n=c[k]; best=k; }
    return best||"energy";
  }

  var html='', ix=0;
  D.sessions.forEach(function(s){
    html+='<li class="sessmark">'+A.date(s.date)+'</li>';
    s.papers.forEach(function(pid){
      ix++;
      var p=A.paper(pid), q=p.selfquote;
      var chips=A.of(pid).slice().sort(function(a,b){
        return A.RELORDER.indexOf(a.rel)-A.RELORDER.indexOf(b.rel); }).slice(0,4);
      html+='<li class="stop" id="s'+ix+'" data-p="'+pid+'">'+
        '<p class="meta">'+A.date(p.date)+' · '+String(ix).padStart(2,"0")+'</p>'+
        '<h3><a href="paper.html?id='+pid+'">'+A.esc(p.title)+'</a></h3>'+
        '<p class="au">'+A.esc(p.authors)+' · '+A.esc(p.venue)+', '+p.year+'</p>'+
        (q ? '<blockquote>“'+A.esc(q.text)+'”<cite>'+
             A.esc(A.clabel(q.concept))+'</cite></blockquote>' : '')+
        '<p class="chips">'+chips.map(function(e){
          return '<a href="concept.html?id='+e.to+'">'+A.esc(A.clabel(e.to))+'</a>'; }).join("")+
        '</p></li>';
    });
  });

  A.mount("index.html","",
    A.profileHTML()+
    '<main class="map" id="map"><svg class="terrain" id="terrain" aria-hidden="true" focusable="false"></svg>'+
    '<ol class="route" id="stops">'+html+'</ol></main>');
  A.profileInit();

  /* contour basins: one per session, sized to the papers it holds */
  function terrain(){
    var svg=document.getElementById("terrain"), map=document.getElementById("map");
    if(!svg||!map) return;
    if(getComputedStyle(svg).display==="none"){ while(svg.firstChild) svg.removeChild(svg.firstChild); return; }
    var mb=map.getBoundingClientRect(), W=svg.getBoundingClientRect().width||240, H=mb.height;
    svg.setAttribute("viewBox","0 0 "+W+" "+H);
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    var NS="http://www.w3.org/2000/svg", cx=W*0.52, pts=[];
    D.sessions.forEach(function(s,si){
      var ys=[];
      s.papers.forEach(function(pid){
        var el=map.querySelector('[data-p="'+pid+'"]'); if(!el) return;
        var r=el.getBoundingClientRect();
        ys.push(r.top-mb.top+r.height*0.34);
      });
      if(!ys.length) return;
      var top=Math.min.apply(null,ys), bot=Math.max.apply(null,ys);
      var mid=(top+bot)/2, ry=Math.min(230,Math.max(46,(bot-top)/2+40));
      for(var k=0;k<3;k++){
        var el=document.createElementNS(NS,"ellipse");
        el.setAttribute("cx",cx); el.setAttribute("cy",mid);
        el.setAttribute("rx",(W*0.30)*(1-k*0.26)); el.setAttribute("ry",ry*(1-k*0.22));
        el.setAttribute("fill","var(--r"+k+"f)"); el.setAttribute("stroke","var(--r"+k+"s)");
        el.setAttribute("stroke-width","0.9"); el.setAttribute("opacity",0.85-k*0.06);
        svg.appendChild(el);
      }
      var lbl=document.createElementNS(NS,"text");
      lbl.setAttribute("x",cx-W*0.30+11); lbl.setAttribute("y",mid);
      lbl.setAttribute("fill","var(--ink-faint)"); lbl.setAttribute("font-size","9.5");
      lbl.setAttribute("font-family","var(--sans)"); lbl.setAttribute("letter-spacing","2.2");
      lbl.setAttribute("transform","rotate(-90 "+(cx-W*0.30+11)+" "+mid+")");
      lbl.setAttribute("text-anchor","middle");
      lbl.textContent=dominant(s.papers).toUpperCase();
      svg.appendChild(lbl);
      ys.forEach(function(y){ pts.push([cx,y]); });
    });
    if(pts.length>1){
      var d="M "+pts[0][0]+" "+pts[0][1];
      for(var i=1;i<pts.length;i++){
        var a=pts[i-1], b=pts[i], my=(a[1]+b[1])/2, off=(i%2?1:-1)*13;
        d+=" C "+(a[0]+off)+" "+my+" "+(b[0]-off)+" "+my+" "+b[0]+" "+b[1];
      }
      var path=document.createElementNS(NS,"path");
      path.setAttribute("d",d); path.setAttribute("fill","none");
      path.setAttribute("stroke","var(--route)"); path.setAttribute("stroke-width","1.3");
      path.setAttribute("opacity","0.85"); svg.appendChild(path);
    }
    pts.forEach(function(p,i){
      var c=document.createElementNS(NS,"circle");
      c.setAttribute("cx",p[0]); c.setAttribute("cy",p[1]); c.setAttribute("r",i===0?4.6:2.6);
      c.setAttribute("fill",i===0?"var(--paper)":"var(--route)");
      c.setAttribute("stroke","var(--route)"); c.setAttribute("stroke-width","1.3");
      svg.appendChild(c);
    });
  }
  terrain();
  window.addEventListener("resize",function(){ clearTimeout(window.__t);
    window.__t=setTimeout(terrain,140); });
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(terrain);
})();

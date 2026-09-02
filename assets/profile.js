(function(){
  "use strict";
  window.Atlas = window.Atlas || {};
  window.Atlas.profileHTML = function(){
    return '<section class="profile" aria-label="Elevation profile">'+
      '<div class="bar"><label for="pT">Temperature</label>'+
      '<input id="pT" type="range" min="-1.52" max="0.48" step="0.01" value="-0.155">'+
      '<span class="val" id="pTv">0.70</span><span class="val" id="pSteps">0</span></div>'+
      '<figure><canvas id="pCv"></canvas></figure></section>';
  };
  window.Atlas.profileInit = function(){
    var cv=document.getElementById("pCv"); if(!cv) return;
    var ctx=cv.getContext("2d"), sl=document.getElementById("pT"),
        out=document.getElementById("pTv"), stEl=document.getElementById("pSteps");
    var C=[0.10,0.30,0.52,0.72,0.90], A=[1.10,1.70,0.95,1.50,1.20],
        Wd=[0.050,0.062,0.043,0.058,0.048];
    function U(x){ var u=4*Math.pow(x-0.5,4);
      for(var k=0;k<5;k++){ var d=x-C[k]; u-=A[k]*Math.exp(-d*d/(2*Wd[k]*Wd[k])); } return u; }
    function dU(x){ var g=16*Math.pow(x-0.5,3);
      for(var k=0;k<5;k++){ var d=x-C[k],w2=Wd[k]*Wd[k];
        g+=A[k]*d/w2*Math.exp(-d*d/(2*w2)); } return g; }
    var G=512, Ug=new Float64Array(G), Umin=1e9, Umax=-1e9;
    for(var i=0;i<G;i++){ Ug[i]=U(i/(G-1)); if(Ug[i]<Umin)Umin=Ug[i]; if(Ug[i]>Umax)Umax=Ug[i]; }
    var N=460, xs=new Float64Array(N);
    for(var j=0;j<N;j++) xs[j]=Math.random();
    var T=0.70, dt=0.00045, steps=0, BINS=64, ema=new Float64Array(BINS), spare=null;
    function randn(){ if(spare!==null){var s=spare;spare=null;return s;}
      var u=0,v=0; while(u===0)u=Math.random(); v=Math.random();
      var m=Math.sqrt(-2*Math.log(u)); spare=m*Math.sin(2*Math.PI*v); return m*Math.cos(2*Math.PI*v); }
    var col={};
    function refresh(){ var cs=getComputedStyle(document.documentElement);
      col.faint=cs.getPropertyValue("--ink-faint").trim();
      col.etch=cs.getPropertyValue("--etch").trim();
      col.route=cs.getPropertyValue("--route").trim();
      col.spark=(cs.getPropertyValue("--spark")||"").trim()||col.route; }
    function fit(){ var r=cv.getBoundingClientRect(), d=Math.min(window.devicePixelRatio||1,2);
      cv.width=Math.round(r.width*d); cv.height=Math.round(r.height*d); ctx.setTransform(d,0,0,d,0,0); }
    function trueMass(){ var p=new Float64Array(BINS), s=0;
      for(var b=0;b<BINS;b++){ var x=(b+0.5)/BINS; p[b]=Math.exp(-(U(x)-Umin)/T); s+=p[b]; }
      for(var b2=0;b2<BINS;b2++) p[b2]/=s; return p; }
    function empMass(){ var p=new Float64Array(BINS), s=0;
      for(var b=0;b<BINS;b++){ p[b]=ema[b]; s+=p[b]; }
      if(s>0) for(var b2=0;b2<BINS;b2++) p[b2]/=s; return p; }
    var padL=18,padR=18;
    function draw(){
      var r=cv.getBoundingClientRect(), W=r.width, H=r.height;
      ctx.clearRect(0,0,W,H);
      var hH=Math.max(56,H*0.34), cTop=10, cBot=H-hH-16, span=Umax-Umin;
      function px(x){ return padL+x*(W-padL-padR); }
      function py(u){ return cTop+(1-(u-Umin)/span)*(cBot-cTop); }
      ctx.beginPath();
      for(var i=0;i<G;i++){ var x=px(i/(G-1)), y=py(Ug[i]); i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
      ctx.strokeStyle=col.etch; ctx.lineWidth=1.2; ctx.stroke();
      for(var j=0;j<N;j++){
        var xv=xs[j], yv=py(U(xv));
        ctx.globalAlpha=0.16; ctx.fillStyle=col.spark;
        ctx.beginPath(); ctx.arc(px(xv),yv,3.2,0,7); ctx.fill();
        ctx.globalAlpha=0.92; ctx.fillStyle=col.spark;
        ctx.beginPath(); ctx.arc(px(xv),yv,1.15,0,7); ctx.fill();
      }
      ctx.globalAlpha=1;
      var tp=trueMass(), ep=empMass(), mx=0;
      for(var b=0;b<BINS;b++){ if(tp[b]>mx)mx=tp[b]; if(ep[b]>mx)mx=ep[b]; }
      if(mx<=0) mx=1;
      var base=H-6, bw=(W-padL-padR)/BINS;
      function hy(v){ return base-(v/mx)*(hH-12); }
      ctx.fillStyle=col.route; ctx.globalAlpha=0.05;
      ctx.beginPath(); ctx.moveTo(px(0.5/BINS),hy(ep[0]));
      for(var b1=0;b1<BINS;b1++) ctx.lineTo(px((b1+0.5)/BINS),hy(ep[b1]));
      for(var b2=BINS-1;b2>=0;b2--) ctx.lineTo(px((b2+0.5)/BINS),hy(tp[b2]));
      ctx.closePath(); ctx.fill(); ctx.globalAlpha=1;
      ctx.fillStyle=col.route; ctx.globalAlpha=0.32;
      for(var b3=0;b3<BINS;b3++){ var h=base-hy(ep[b3]); if(h>0) ctx.fillRect(px(b3/BINS),hy(ep[b3]),bw-1,h); }
      ctx.globalAlpha=1;
      ctx.beginPath();
      for(var b4=0;b4<BINS;b4++){ var xx=px((b4+0.5)/BINS), yy=hy(tp[b4]); b4?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy); }
      ctx.strokeStyle=col.faint; ctx.lineWidth=1.1; ctx.stroke();
    }
    function step(){ var sq=Math.sqrt(2*T*dt);
      for(var s=0;s<3;s++){
        for(var i=0;i<N;i++){ var x=xs[i]-dU(xs[i])*dt+sq*randn();
          if(x<0.002)x=0.004-x; if(x>0.998)x=1.996-x; xs[i]=x; }
        steps++;
      }
      var c=new Float64Array(BINS);
      for(var k=0;k<N;k++) c[Math.min(BINS-1,Math.floor(xs[k]*BINS))]++;
      for(var b=0;b<BINS;b++) ema[b]=ema[b]*0.975+c[b];
    }
    var reduce=window.matchMedia("(prefers-reduced-motion: reduce)"), run=false, vis=true;
    function loop(){ if(!run) return; step(); draw(); stEl.textContent=steps.toLocaleString();
      requestAnimationFrame(loop); }
    function settle(){ for(var s=0;s<4000;s++) step(); draw(); stEl.textContent="∞"; }
    function mode(){ var want=!reduce.matches && vis;
      if(want && !run){ run=true; loop(); } else if(!want){ run=false; settle(); } }
    sl.addEventListener("input",function(){ T=Math.pow(10,parseFloat(sl.value));
      out.textContent=T.toFixed(T<0.1?3:2); if(!run) settle(); });
    new MutationObserver(function(){ refresh(); if(!run) draw(); })
      .observe(document.documentElement,{attributes:true,attributeFilter:["data-scheme","data-theme"]});
    window.addEventListener("resize",function(){ fit(); if(!run) draw(); });
    if(window.IntersectionObserver)
      new IntersectionObserver(function(e){ vis=e[0].isIntersecting; mode(); },{threshold:0.05}).observe(cv);
    if(reduce.addEventListener) reduce.addEventListener("change",mode);
    refresh(); fit(); out.textContent=T.toFixed(2); mode();
  };
})();

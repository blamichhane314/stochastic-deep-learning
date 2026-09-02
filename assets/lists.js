(function(){
  "use strict";
  var A=window.Atlas, D=window.SDL, which=document.body.dataset.list;
  if(which==="papers"){
    var rows=D.papers.map(function(p){
      return '<tr><td>'+A.date(p.date)+'</td>'+
        '<td><a href="paper.html?id='+p.id+'">'+A.esc(p.title)+'</a></td>'+
        '<td>'+A.esc(p.authors)+'</td><td>'+p.year+'</td>'+
        '<td>'+A.of(p.id).length+'</td></tr>'; }).join("");
    A.mount("papers.html","",
      '<div class="head"><p class="kicker">'+D.stats.papers+' papers</p><h2>Papers</h2></div>'+
      '<table class="tbl"><thead><tr><th>Read</th><th>Title</th><th>Authors</th>'+
      '<th>Year</th><th>Links</th></tr></thead><tbody>'+rows+'</tbody></table>');
  } else {
    var fam={};
    D.concepts.forEach(function(c){ (fam[c.family]=fam[c.family]||[]).push(c); });
    var order=["obstruction","energy","score","diffusion","variational","flow",
               "autoregressive","adversarial","metric","architecture","evaluation"];
    var html='';
    order.forEach(function(f){
      var list=(fam[f]||[]).slice().sort(function(a,b){
        return A.touching(b.id).length-A.touching(a.id).length; });
      if(!list.length) return;
      html+='<h4 class="sec">'+f+'</h4><div class="grid">'+list.map(function(c){
        var n=A.touching(c.id).length;
        return '<a class="'+(n?'':'dim')+'" href="concept.html?id='+c.id+'">'+
          A.esc(c.label)+'<span class="n">'+(n||"—")+'</span></a>'; }).join("")+'</div>';
    });
    A.mount("concepts.html","",
      '<div class="head"><p class="kicker">by family</p><h2>Concepts</h2>'+
      '<p class="sub">Papers per concept</p></div>'+html);
  }
})();

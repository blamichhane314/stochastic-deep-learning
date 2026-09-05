(function(){
  "use strict";
  var A=window.Atlas;

  /* The first experiment. Rule 6 held this page empty until the owner understood
     and asked for one; he asked on 2026-09-04. Absence still renders as absence,
     so this lists what exists and nothing else -- no placeholders for the rungs
     that are not built. The line under each title says what the thing does; that
     is a description of the simulation, not of the project. */
  var RUNS = [
    { href:"exp-annealing.html",
      title:"Damped Descent and Simulated Annealing on an Energy Surface",
      note:"A damped ball following \u2212\u2207E, with and without Metropolis-accepted "+
           "jumps under a cooling schedule, from one initial condition. Then two copies, "+
           "then an ensemble of 240 checked against the Boltzmann basin masses." }
  ];

  A.mount("experiments.html","",
    '<div class="head"><h2>Experiments</h2></div>'+
    (RUNS.length
      ? RUNS.map(function(r){
          return '<div class="run"><p class="rt"><a href="'+r.href+'">'+A.esc(r.title)+'</a></p>'+
                 '<p class="rn">'+A.esc(r.note)+'</p></div>';
        }).join("")
      : '<p class="empty">None yet.</p>'));
})();

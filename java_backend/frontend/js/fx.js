/* Cursor effects: a soft glow and a ring that glide after the pointer,
   a spotlight inside cards, and a gentle parallax on [data-depth] items.
   Switched off on touch screens and for people who prefer reduced motion. */
(function(){
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if(reduce || touch) return;

  var glow = document.createElement('div'); glow.className = 'fx-glow';
  var ring = document.createElement('div'); ring.className = 'fx-ring';
  var dot  = document.createElement('div'); dot.className  = 'fx-dot';
  document.body.appendChild(glow); document.body.appendChild(ring); document.body.appendChild(dot);

  var tx = window.innerWidth / 2, ty = window.innerHeight / 2;   // where the pointer is
  var gx = tx, gy = ty, rx = tx, ry = ty;                         // where the effects are
  var seen = false, running = false;
  var parallax = Array.prototype.slice.call(document.querySelectorAll('[data-depth]'));

  var HOT = 'a, button, [role="button"], input, select, label, summary, tr[data-id], .dropzone, .nav-link, .tab, .chip';

  function frame(){
    gx += (tx - gx) * 0.07;      // glow trails the most
    gy += (ty - gy) * 0.07;
    rx += (tx - rx) * 0.2;       // ring follows more closely
    ry += (ty - ry) * 0.2;

    glow.style.transform = 'translate3d(' + gx + 'px,' + gy + 'px,0)';
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    dot.style.transform  = 'translate3d(' + tx + 'px,' + ty + 'px,0)';

    if(parallax.length){
      var nx = (rx / window.innerWidth - 0.5), ny = (ry / window.innerHeight - 0.5);
      parallax.forEach(function(el){
        var d = parseFloat(el.getAttribute('data-depth')) || 10;
        var rot = el.getAttribute('data-rot') || '0';
        el.style.transform = 'translate3d(' + (-nx * d) + 'px,' + (-ny * d) + 'px,0) rotate(' + rot + 'deg)';
      });
    }

    var settled = Math.abs(tx - rx) < 0.1 && Math.abs(ty - ry) < 0.1 && Math.abs(tx - gx) < 0.1 && Math.abs(ty - gy) < 0.1;
    if(settled){ running = false; } else { requestAnimationFrame(frame); }
  }
  function kick(){ if(!running){ running = true; requestAnimationFrame(frame); } }

  document.addEventListener('mousemove', function(e){
    tx = e.clientX; ty = e.clientY;
    if(!seen){
      seen = true; gx = rx = tx; gy = ry = ty;
      glow.style.opacity = '1'; ring.classList.add('on'); dot.classList.add('on');
    }
    var spot = e.target.closest && e.target.closest('.spot');
    if(spot){
      var r = spot.getBoundingClientRect();
      spot.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      spot.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }
    ring.classList.toggle('hot', !!(e.target.closest && e.target.closest(HOT)));
    kick();
  }, { passive: true });

  document.addEventListener('mousedown', function(){ ring.classList.add('down'); });
  document.addEventListener('mouseup', function(){ ring.classList.remove('down'); });
  document.documentElement.addEventListener('mouseleave', function(){
    glow.style.opacity = '0'; ring.classList.remove('on'); dot.classList.remove('on'); seen = false;
  });
})();

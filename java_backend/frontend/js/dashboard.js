(function(R){
  'use strict';
  var user = R.requireAuth(); if(!user) return;
  R.mountShell('dashboard');

  document.getElementById('hello').textContent = 'Welcome back, ' + user.name.split(' ')[0];

  var NO_IMG = '<div class="thumb thumb-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/></svg></div>';

  R.api('/history').then(function(records){
    var total = records.length, weeds = 0, sum = 0;
    records.forEach(function(r){ if(R.isWeed(r)) weeds++; sum += r.confidence || 0; });
    document.getElementById('sTotal').textContent = total;
    document.getElementById('sRose').textContent = total - weeds;
    document.getElementById('sWeed').textContent = weeds;
    document.getElementById('sConf').textContent = total ? Math.round(sum / total * 100) + '%' : '\u2014';

    var list = document.getElementById('recent');
    if(!total){
      list.innerHTML = '<li class="empty">No scans yet. Check your first plant to see it here.</li>';
      return;
    }
    list.innerHTML = records.slice(0, 5).map(function(r){
      var img = r.thumbnail ? '<img class="thumb" src="' + R.esc(r.thumbnail) + '" alt="">' : NO_IMG;
      return '<li>' + img + '<div class="meta"><b>' + R.esc(r.fileName || 'image') + '</b><small>' +
        R.fmtDate(r.createdAt) + ' \u00b7 ' + Math.round((r.confidence || 0) * 100) + '% confidence</small></div>' + R.pill(r) + '</li>';
    }).join('');
  }).catch(function(err){
    document.getElementById('recent').innerHTML = '<li class="empty">' + R.esc(err.message) + '</li>';
  });
})(window.Rosarium);

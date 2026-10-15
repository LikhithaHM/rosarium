(function(R){
  'use strict';
  var user = R.requireAuth(); if(!user) return;
  R.mountShell('history');

  var $ = function(id){ return document.getElementById(id); };
  var searchEl = $('search'), labelEl = $('label'), fromEl = $('from'), toEl = $('to');
  var body = $('rows'), countEl = $('count'), dlg = $('detail'), dlgBody = $('detailBody');
  var all = [];

  var NO_IMG = '<div class="thumb thumb-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/></svg></div>';

  function filtered(){
    var q = searchEl.value.trim().toLowerCase();
    var want = labelEl.value;
    var from = fromEl.value ? new Date(fromEl.value + 'T00:00:00') : null;
    var to = toEl.value ? new Date(toEl.value + 'T23:59:59') : null;
    return all.filter(function(r){
      if(q && String(r.fileName || '').toLowerCase().indexOf(q) === -1) return false;
      if(want === 'rose' && R.isWeed(r)) return false;
      if(want === 'weed' && !R.isWeed(r)) return false;
      var d = r.createdAt ? new Date(r.createdAt) : null;
      if(from && (!d || d < from)) return false;
      if(to && (!d || d > to)) return false;
      return true;
    });
  }

  function render(){
    var rows = filtered();
    countEl.textContent = all.length
      ? 'Showing ' + rows.length + ' of ' + all.length + ' scan' + (all.length === 1 ? '' : 's')
      : '';
    if(!all.length){
      body.innerHTML = '<tr><td colspan="5" class="empty" style="padding:28px 18px;white-space:normal">No scans yet. <a href="detect.html" style="color:var(--rose);font-weight:700">Check your first plant</a> and it will appear here.</td></tr>';
      return;
    }
    if(!rows.length){
      body.innerHTML = '<tr><td colspan="5" class="empty" style="padding:28px 18px">No scans match these filters.</td></tr>';
      return;
    }
    body.innerHTML = rows.map(function(r){
      var img = r.thumbnail ? '<img class="thumb" src="' + R.esc(r.thumbnail) + '" alt="">' : NO_IMG;
      return '<tr data-id="' + r.id + '" tabindex="0">' +
        '<td><div class="cell-thumb">' + img + '</div></td>' +
        '<td class="fname">' + R.esc(r.fileName || 'image') + '</td>' +
        '<td>' + R.pill(r) + '</td>' +
        '<td>' + Math.round((r.confidence || 0) * 100) + '%</td>' +
        '<td>' + R.fmtDate(r.createdAt) + '</td></tr>';
    }).join('');
  }

  [searchEl, labelEl, fromEl, toEl].forEach(function(el){ el.addEventListener('input', render); });
  $('clearFilters').addEventListener('click', function(){
    searchEl.value = ''; labelEl.value = 'all'; fromEl.value = ''; toEl.value = ''; render();
  });

  /* ---------- detail dialog ---------- */
  function openDetail(id){
    var r = all.filter(function(x){ return String(x.id) === String(id); })[0];
    if(!r) return;
    var v = R.verdict(r), weedPct = Math.round((r.weedProbability || 0) * 100);
    var img = r.thumbnail
      ? '<div class="photo"><img src="' + R.esc(r.thumbnail) + '" alt="Photo you checked"></div>'
      : '<div class="photo" style="display:flex;align-items:center;justify-content:center;color:var(--faint)">No preview saved</div>';
    dlgBody.innerHTML =
      '<button class="modal-close" id="closeDetail" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<div class="preview-card">' + img +
        '<div class="side">' +
          '<div class="verdict ' + v.cls + '"><div class="verdict-icon">' + v.icon + '</div><div><h2>' + v.title + '</h2><small>' + v.sub + '</small></div></div>' +
          '<div class="probs" style="margin-bottom:14px"><div><span>Confidence</span><b>' + v.pct + '%</b></div>' +
            '<div><span>Chance it is a weed</span><b>' + weedPct + '%</b></div>' +
            '<div><span>Chance it is a rose</span><b>' + (100 - weedPct) + '%</b></div></div>' +
          R.resultNotes(r) +
          '<div class="modal-meta">' + R.esc(r.fileName || 'image') + '<br>' + R.fmtDate(r.createdAt) + '</div>' +
        '</div></div>';
    $('closeDetail').addEventListener('click', function(){ dlg.close(); });
    dlg.showModal();
  }
  body.addEventListener('click', function(e){
    var tr = e.target.closest('tr[data-id]'); if(tr) openDetail(tr.getAttribute('data-id'));
  });
  body.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ var tr = e.target.closest('tr[data-id]'); if(tr) openDetail(tr.getAttribute('data-id')); }
  });
  dlg.addEventListener('click', function(e){ if(e.target === dlg) dlg.close(); });

  R.api('/history').then(function(records){ all = records; render(); }).catch(function(err){
    body.innerHTML = '<tr><td colspan="5" class="empty" style="padding:28px 18px;white-space:normal">' + R.esc(err.message) + '</td></tr>';
  });
})(window.Rosarium);

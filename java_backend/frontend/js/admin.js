(function(R){
  'use strict';
  var user = R.requireAdmin(); if(!user) return;
  R.mountShell('admin');

  var $ = function(id){ return document.getElementById(id); };
  var ROSE = '#7C9A7A', WEED = '#D9A03A', LINE = '#B0305A';

  R.api('/admin/stats').then(render).catch(function(err){
    $('adminError').textContent = err.message; $('adminError').classList.add('active');
  });

  function render(s){
    var total = s.totalPredictions;
    $('aTotal').textContent = total;
    $('aSplit').textContent = total ? Math.round(s.roseCount / total * 100) + ' : ' + Math.round(s.weedCount / total * 100) : '\u2014';
    $('aSplitSub').textContent = s.roseCount + ' rose \u00b7 ' + s.weedCount + ' weed';
    $('aConf').textContent = total ? Math.round(s.averageConfidence * 100) + '%' : '\u2014';
    $('aActive').textContent = s.activeUsers;
    $('aActiveSub').textContent = 'of ' + s.registeredUsers + ' registered';

    $('donut').innerHTML = donut(s.roseCount, s.weedCount);
    $('legend').innerHTML =
      '<li><i style="background:' + ROSE + '"></i>Rose<b>' + s.roseCount + '</b></li>' +
      '<li><i style="background:' + WEED + '"></i>Weed<b>' + s.weedCount + '</b></li>';
    $('line').innerHTML = lineChart(s.perDay);
  }

  function donut(rose, weed){
    var total = rose + weed, r = 62, c = 2 * Math.PI * r;
    var svg = '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="#EADCCF" stroke-width="22"/>';
    if(total){
      var roseLen = c * rose / total, weedLen = c * weed / total;
      svg += '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="' + ROSE + '" stroke-width="22" stroke-dasharray="' + roseLen + ' ' + (c - roseLen) + '" transform="rotate(-90 85 85)"/>';
      if(weed) svg += '<circle cx="85" cy="85" r="' + r + '" fill="none" stroke="' + WEED + '" stroke-width="22" stroke-dasharray="' + weedLen + ' ' + (c - weedLen) + '" stroke-dashoffset="' + (-roseLen) + '" transform="rotate(-90 85 85)"/>';
    }
    svg += '<text x="85" y="86" text-anchor="middle" font-size="26" font-weight="600" fill="#3A2C2C">' + total + '</text>' +
           '<text x="85" y="106" text-anchor="middle" font-size="11" fill="#9A8A82">predictions</text>';
    return svg;
  }

  function lineChart(days){
    var W = 640, H = 250, padL = 36, padR = 14, padT = 16, padB = 34;
    var max = Math.max.apply(null, days.map(function(d){ return d.count; }).concat([4]));
    max = Math.ceil(max / 4) * 4;
    var iw = W - padL - padR, ih = H - padT - padB;
    function x(i){ return padL + (days.length === 1 ? iw / 2 : i * iw / (days.length - 1)); }
    function y(v){ return padT + ih - (v / max) * ih; }

    var svg = '';
    for(var g = 0; g <= 4; g++){
      var val = max * g / 4, gy = y(val);
      svg += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + gy + '" y2="' + gy + '" stroke="#EADCCF" stroke-dasharray="3 4"/>' +
             '<text x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end">' + Math.round(val) + '</text>';
    }
    var pts = days.map(function(d, i){ return x(i) + ',' + y(d.count); });
    svg += '<polygon points="' + x(0) + ',' + y(0) + ' ' + pts.join(' ') + ' ' + x(days.length - 1) + ',' + y(0) + '" fill="rgba(176,48,90,.10)"/>';
    svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + LINE + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    days.forEach(function(d, i){
      var dt = new Date(d.date + 'T00:00:00');
      svg += '<circle class="pt" cx="' + x(i) + '" cy="' + y(d.count) + '" r="4.5"><title>' +
             dt.toLocaleDateString(undefined, { day:'numeric', month:'short' }) + ': ' + d.count + ' prediction' + (d.count === 1 ? '' : 's') + '</title></circle>';
      if(i % 2 === 0 || days.length < 8){
        svg += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle">' + dt.toLocaleDateString(undefined, { day:'numeric', month:'short' }) + '</text>';
      }
    });
    return svg;
  }
})(window.Rosarium);

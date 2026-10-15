(function(R){
  'use strict';
  var user = R.requireAuth(); if(!user) return;
  R.mountShell('detect');

  var $ = function(id){ return document.getElementById(id); };
  var dropzone = $('dropzone'), fileInput = $('fileInput'), stage = $('stage');
  var photo = $('photo'), previewImg = $('previewImg');
  var preview = $('previewPanel'), loader = $('loader'), loaderText = $('loaderText'), result = $('result'), errorBox = $('errorBox');
  var analyzeBtn = $('analyzeBtn'), clearBtn = $('clearBtn');

  var currentBlob = null, currentName = 'upload.jpg';

  /* ---------- sample images (drawn on a canvas, no downloads needed) ---------- */
  function makeSample(kind, cb){
    var c = document.createElement('canvas'); c.width = 480; c.height = 360;
    var ctx = c.getContext('2d');
    if(kind === 'rose'){
      ctx.fillStyle = '#233024'; ctx.fillRect(0,0,480,360);
      for(var i=0;i<40;i++){
        ctx.fillStyle = 'rgba(80,110,70,' + (0.3+Math.random()*0.3) + ')';
        ctx.beginPath(); ctx.ellipse(Math.random()*480, Math.random()*360, 20+Math.random()*30, 8+Math.random()*14, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
      }
      var cx=240, cy=180;
      for(var r=48;r>6;r-=6){
        ctx.fillStyle = 'hsl(' + (340+Math.random()*14) + ', 68%, ' + (44+(48-r)*0.5) + '%)';
        for(var p=0;p<7;p++){
          var ang = (p/7)*Math.PI*2 + r*0.05;
          ctx.beginPath(); ctx.ellipse(cx+Math.cos(ang)*r*0.5, cy+Math.sin(ang)*r*0.5, r*0.6, r*0.4, ang, 0, Math.PI*2); ctx.fill();
        }
      }
    } else {
      ctx.fillStyle = '#1d2a1c'; ctx.fillRect(0,0,480,360);
      for(var j=0;j<26;j++){
        var bx = 40+Math.random()*400, by = 40+Math.random()*280;
        ctx.strokeStyle = 'hsl(' + (95+Math.random()*30) + ', 40%, 32%)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx,by+30); ctx.lineTo(bx,by-30); ctx.stroke();
        for(var k=0;k<5;k++){
          ctx.fillStyle = 'hsl(' + (90+Math.random()*35) + ', 45%, ' + (30+Math.random()*15) + '%)';
          ctx.beginPath(); ctx.ellipse(bx+(Math.random()-0.5)*24, by-30+k*14, 10, 4, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill();
        }
      }
    }
    c.toBlob(function(blob){ cb(blob, c.toDataURL('image/png')); }, 'image/jpeg', 0.92);
  }

  /* small JPEG preview saved with the prediction, so the history page can show it */
  function makeThumbnail(blob, cb){
    var url = URL.createObjectURL(blob), img = new Image();
    img.onload = function(){
      var max = 360, s = Math.min(1, max / Math.max(img.width, img.height));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      cb(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = function(){ URL.revokeObjectURL(url); cb(null); };
    img.src = url;
  }

  /* ---------- upload flow ---------- */
  function show(previewSrc, blob, name){
    previewImg.src = previewSrc; currentBlob = blob; currentName = name;
    dropzone.style.display = 'none'; stage.classList.add('active');
    preview.style.display = ''; loader.classList.remove('active');
    result.classList.remove('active'); errorBox.classList.remove('active');
    analyzeBtn.disabled = false;
  }
  function reset(){
    stage.classList.remove('active'); dropzone.style.display = '';
    fileInput.value = ''; currentBlob = null;
  }
  function readFile(file){
    if(!/^image\//.test(file.type)){ alert('Please choose an image file (JPG or PNG).'); return; }
    var reader = new FileReader();
    reader.onload = function(e){ show(e.target.result, file, file.name); };
    reader.readAsDataURL(file);
  }

  dropzone.addEventListener('dragover', function(e){ e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', function(){ dropzone.classList.remove('dragover'); });
  dropzone.addEventListener('drop', function(e){
    e.preventDefault(); dropzone.classList.remove('dragover');
    var f = e.dataTransfer.files && e.dataTransfer.files[0]; if(f) readFile(f);
  });
  fileInput.addEventListener('change', function(){ if(fileInput.files && fileInput.files[0]) readFile(fileInput.files[0]); });
  document.querySelectorAll('.chip[data-sample]').forEach(function(btn){
    btn.addEventListener('click', function(){
      makeSample(btn.dataset.sample, function(blob, dataUrl){ show(dataUrl, blob, btn.dataset.sample + '-sample.jpg'); });
    });
  });
  clearBtn.addEventListener('click', reset);

  /* ---------- analyse ---------- */
  var MESSAGES = ['Uploading your photo\u2026', 'Looking at leaves and blooms\u2026', 'Preparing your result\u2026'];

  analyzeBtn.addEventListener('click', function(){
    if(!currentBlob) return;
    analyzeBtn.disabled = true;
    errorBox.classList.remove('active'); result.classList.remove('active');
    preview.style.display = 'none';
    loader.classList.add('active'); photo.classList.add('scanning');

    var n = 0; loaderText.textContent = MESSAGES[0];
    var timer = setInterval(function(){ n = Math.min(n + 1, MESSAGES.length - 1); loaderText.textContent = MESSAGES[n]; }, 900);

    makeThumbnail(currentBlob, function(thumb){
      var fd = new FormData();
      fd.append('file', currentBlob, currentName);
      if(thumb) fd.append('thumbnail', thumb);

      R.api('/predict', { method:'POST', body: fd }).then(function(record){
        clearInterval(timer); finish(record, null);
      }).catch(function(err){
        clearInterval(timer); finish(null, err.message);
      });
    });
  });

  function finish(record, message){
    photo.classList.remove('scanning'); loader.classList.remove('active');
    if(message){
      preview.style.display = '';
      analyzeBtn.disabled = false;
      errorBox.innerHTML = '<strong>We couldn\u2019t get a result.</strong> ' + R.esc(message) +
        ' Check that the Spring Boot app (port 8080) and the Python API (port 5000) are running, then try again.';
      errorBox.classList.add('active');
      return;
    }
    renderResult(record);
  }

  function renderResult(record){
    var v = R.verdict(record);
    var circumference = 339.3;
    var weedPct = Math.round((record.weedProbability || 0) * 100);

    result.innerHTML =
      '<div class="verdict ' + v.cls + '"><div class="verdict-icon">' + v.icon + '</div>' +
        '<div><h2>' + v.title + '</h2><small>' + v.sub + '</small></div></div>' +
      '<div class="gauge-row">' +
        '<div class="gauge ' + v.cls + '" role="img" aria-label="' + v.pct + ' percent confidence">' +
          '<svg viewBox="0 0 130 130"><circle class="track" cx="65" cy="65" r="54"/><circle class="bar" id="gaugeBar" cx="65" cy="65" r="54"/></svg>' +
          '<div class="num"><b>' + v.pct + '%</b><small>confidence</small></div></div>' +
        '<div class="probs"><div><span>Chance it is a weed</span><b>' + weedPct + '%</b></div>' +
          '<div><span>Chance it is a rose</span><b>' + (100 - weedPct) + '%</b></div></div>' +
      '</div>' +
      R.resultNotes(record) +
      '<div class="actions"><button class="btn btn-primary" id="againBtn2">Check another photo</button>' +
      '<a class="btn btn-ghost" href="history.html">View history</a></div>';

    result.classList.add('active');
    document.getElementById('againBtn2').addEventListener('click', reset);
    // animate the ring after it has been painted once
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      document.getElementById('gaugeBar').style.strokeDashoffset = circumference * (1 - v.pct / 100);
    }); });
  }
})(window.Rosarium);

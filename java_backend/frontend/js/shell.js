/* Builds the top bar and left sidebar on every signed-in page.
   Usage: Rosarium.mountShell('dashboard' | 'detect' | 'history' | 'admin') */
(function(R){
  'use strict';

  var I = {
    home:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="8" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="5" rx="1.6"/><rect x="13.5" y="11.5" width="7" height="9" rx="1.6"/><rect x="3.5" y="14.5" width="7" height="6" rx="1.6"/></svg>',
    detect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.3-2h6l1.3 2h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z"/><circle cx="12" cy="12.5" r="3.4"/></svg>',
    history:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    admin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    out:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10"/><path d="M15 8l4 4-4 4M19 12H9"/></svg>',
    menu:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    chev:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
  };

  var MARK = '<svg class="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">' +
    '<circle cx="16" cy="16" r="15" stroke="#B0305A" stroke-width="1.4"/>' +
    '<path d="M16 8 C 19 11, 19 14, 16 17 C 13 14, 13 11, 16 8 Z" fill="#B0305A"/>' +
    '<path d="M16 17 C 20 17.5, 22 20, 22 23" stroke="#7C9A7A" stroke-width="1.5" fill="none"/>' +
    '<path d="M16 17 C 12 17.5, 10 20, 10 23" stroke="#7C9A7A" stroke-width="1.5" fill="none"/></svg>';

  function initials(name){
    var parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function mountShell(active){
    var user = R.getUser();
    if(!user) return;

    var links = [
      { id:'dashboard', href:'index.html',   label:'Dashboard',     icon:I.home },
      { id:'detect',    href:'detect.html',  label:'Upload / Detect', icon:I.detect },
      { id:'history',   href:'history.html', label:'History',       icon:I.history }
    ];
    if(user.role === 'ADMIN') links.push({ id:'admin', href:'admin.html', label:'Admin', icon:I.admin });

    var topbar = document.getElementById('topbar');
    topbar.innerHTML =
      '<button class="menu-btn" id="menuBtn" aria-label="Open menu">' + I.menu + '</button>' +
      '<a class="brand" href="index.html">' + MARK +
        '<div><div class="brand-name">Rosarium</div><div class="brand-sub">Rose or weed, from a photo</div></div></a>' +
      '<div class="spacer"></div>' +
      '<span class="status" id="apiStatus" title="Checking connection\u2026"><i></i><b>Checking\u2026</b></span>' +
      '<div class="user-menu" id="userMenu">' +
        '<button class="avatar-btn" id="avatarBtn" aria-haspopup="true" aria-expanded="false">' +
          '<span class="avatar">' + R.esc(initials(user.name)) + '</span><span class="nm">' + R.esc(user.name) + '</span>' + I.chev +
        '</button>' +
        '<div class="dropdown" role="menu">' +
          '<div class="who"><b>' + R.esc(user.name) + '</b><small>' + R.esc(user.email) + '</small>' +
          '<span class="pill pill-role">' + (user.role === 'ADMIN' ? 'Administrator' : 'Member') + '</span></div>' +
          '<button class="btn btn-ghost btn-block" id="logoutBtn1">' + I.out + ' Sign out</button>' +
        '</div>' +
      '</div>';

    var sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = links.map(function(l){
      return '<a class="nav-link' + (l.id === active ? ' active' : '') + '" href="' + l.href + '"' +
             (l.id === active ? ' aria-current="page"' : '') + '>' + l.icon + '<span>' + l.label + '</span></a>';
    }).join('') +
      '<div class="nav-sep"></div>' +
      '<button class="nav-link nav-btn" id="logoutBtn2">' + I.out + '<span>Sign out</span></button>';

    var scrim = document.createElement('div'); scrim.className = 'scrim'; document.body.appendChild(scrim);

    function openSidebar(open){ sidebar.classList.toggle('open', open); scrim.classList.toggle('show', open); }
    document.getElementById('menuBtn').addEventListener('click', function(){ openSidebar(!sidebar.classList.contains('open')); });
    scrim.addEventListener('click', function(){ openSidebar(false); });

    var menu = document.getElementById('userMenu'), btn = document.getElementById('avatarBtn');
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = !menu.classList.contains('open');
      menu.classList.toggle('open', open); btn.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', function(e){ if(!menu.contains(e.target)) menu.classList.remove('open'); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ menu.classList.remove('open'); openSidebar(false); } });

    function logout(){
      R.api('/auth/logout', { method:'POST' }).catch(function(){}).then(function(){ R.clearSession(); R.goToLogin(); });
    }
    document.getElementById('logoutBtn1').addEventListener('click', logout);
    document.getElementById('logoutBtn2').addEventListener('click', logout);

    checkStatus();
  }

  function checkStatus(){
    var el = document.getElementById('apiStatus'), label = el.querySelector('b');
    function set(cls, text, tip){ el.className = 'status ' + cls; label.textContent = text; el.title = tip; }
    R.api('/health', { public:true }).then(function(d){
      if(d.python === 'ok') set('ok', 'Ready', 'Java backend and Python CNN API are both running.');
      else set('warn', 'CNN service offline', 'Start the Python API: uvicorn main:app --host 0.0.0.0 --port 5000');
    }).catch(function(){
      set('err', 'Backend offline', 'Start the Spring Boot app (port 8080) and the Python API (port 5000).');
    });
  }

  R.mountShell = mountShell;
})(window.Rosarium);

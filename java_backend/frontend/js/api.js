/* Shared helpers: backend address, sign-in session, fetch wrapper */
window.Rosarium = (function(){
  'use strict';

  /* Spring Boot backend (server.port=8080). Change if you deploy elsewhere. */
  /* Local dev (Live Server / file) -> talk to localhost:8080.
     Deployed (served by Spring Boot itself) -> same-origin /api. */
  var isLocalDev = location.protocol === 'file:' ||
    ((location.hostname === 'localhost' || location.hostname === '127.0.0.1') && location.port !== '8080');
  var API_BASE = isLocalDev ? 'http://localhost:8080/api' : '/api';
  var TOKEN_KEY = 'rosarium-token';
  var USER_KEY = 'rosarium-user';

  function getToken(){ try{ return localStorage.getItem(TOKEN_KEY); }catch(e){ return null; } }
  function getUser(){
    try{ return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }catch(e){ return null; }
  }
  function setSession(token, user){
    try{ localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); }catch(e){}
  }
  function clearSession(){
    try{ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }catch(e){}
  }

  function goToLogin(){ window.location.replace('login.html'); }

  /* Call at the top of every protected page */
  function requireAuth(){
    if(!getToken() || !getUser()){ goToLogin(); return null; }
    return getUser();
  }
  function requireAdmin(){
    var u = requireAuth();
    if(u && u.role !== 'ADMIN'){ window.location.replace('index.html'); return null; }
    return u;
  }

  /* fetch + auth header + JSON + readable errors.
     Pass a FormData body as-is; pass an object as `json` for JSON bodies. */
  function api(path, options){
    options = options || {};
    var headers = {};
    var token = getToken();
    if(token && !options.public) headers['Authorization'] = 'Bearer ' + token;
    var init = { method: options.method || 'GET', headers: headers };
    if(options.json !== undefined){
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(options.json);
    } else if(options.body){
      init.body = options.body;
    }
    return fetch(API_BASE + path, init).then(function(res){
      if(res.status === 401 && !options.public){
        clearSession(); goToLogin();
        throw new Error('Your session has ended. Please sign in again.');
      }
      if(!res.ok){
        return res.json().catch(function(){ return {}; }).then(function(body){
          throw new Error(body.message || ('Request failed (status ' + res.status + ')'));
        });
      }
      return res.json();
    }, function(){
      throw new Error('Can\u2019t reach the server at ' + API_BASE + '. Start the Spring Boot app (port 8080).');
    });
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function fmtDate(iso){
    if(!iso) return '\u2014';
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' }) + ', ' +
           d.toLocaleTimeString(undefined, { hour:'numeric', minute:'2-digit' });
  }

  /* "Weed Detected" -> weed, "No Weed Detected" -> rose */
  function isWeed(record){
    var p = String(record && record.prediction || '').toLowerCase();
    return p.indexOf('weed') !== -1 && p.indexOf('no weed') === -1;
  }

  var ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var ICON_WARN  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4 2.8 19.5h18.4L12 4Z"/><path d="M12 10v4.5M12 17.4h.01"/></svg>';
  var ICON_INFO  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>';

  function pill(record){
    return isWeed(record)
      ? '<span class="pill pill-weed">WEED</span>'
      : '<span class="pill pill-rose">ROSE</span>';
  }

  /* Shared text for the result view (detect page + history modal) */
  function verdict(record){
    var weed = isWeed(record);
    var pct = Math.round((record.confidence || 0) * 100);
    return {
      weed: weed,
      cls: weed ? 'weed' : 'rose',
      title: weed ? 'WEED' : 'ROSE',
      sub: weed ? 'Please verify before removing anything.' : 'This looks like one of your roses.',
      icon: weed ? ICON_WARN : ICON_CHECK,
      pct: pct,
      lowConfidence: pct < 75
    };
  }

  function resultNotes(record){
    var v = verdict(record);
    var html = '<div class="callout">' + ICON_INFO + '<div>' +
      '<p>This model is a decision-support tool. Please verify before taking action, especially for lower-confidence results.</p></div></div>';
    if(v.lowConfidence){
      html = '<div class="callout warn">' + ICON_INFO + '<div>' +
        '<p><strong>Confidence is lower than usual.</strong> The model recognises roses mainly by their bloom, so a closer, well-lit photo that includes a flower will give a firmer answer.</p>' +
        '<p>This model is a decision-support tool. Please verify before taking action.</p></div></div>';
    }
    return html;
  }

  return {
    API_BASE: API_BASE, api: api, getToken: getToken, getUser: getUser, setSession: setSession,
    clearSession: clearSession, requireAuth: requireAuth, requireAdmin: requireAdmin, goToLogin: goToLogin,
    esc: esc, fmtDate: fmtDate, isWeed: isWeed, pill: pill, verdict: verdict, resultNotes: resultNotes,
    icons: { check: ICON_CHECK, warn: ICON_WARN, info: ICON_INFO }
  };
})();

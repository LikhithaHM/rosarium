(function(R){
  'use strict';
  if(R.getToken() && R.getUser()){ window.location.replace('index.html'); return; }

  var tabLogin = document.getElementById('tabLogin');
  var tabRegister = document.getElementById('tabRegister');
  var form = document.getElementById('authForm');
  var nameField = document.getElementById('nameField');
  var nameInput = document.getElementById('name');
  var emailInput = document.getElementById('email');
  var passInput = document.getElementById('password');
  var submitBtn = document.getElementById('submitBtn');
  var errBox = document.getElementById('formError');
  var heading = document.getElementById('authHeading');
  var subline = document.getElementById('authSub');
  var mode = 'login';

  function setMode(next){
    mode = next;
    var isLogin = mode === 'login';
    tabLogin.classList.toggle('active', isLogin);
    tabRegister.classList.toggle('active', !isLogin);
    tabLogin.setAttribute('aria-selected', isLogin);
    tabRegister.setAttribute('aria-selected', !isLogin);
    nameField.style.display = isLogin ? 'none' : '';
    nameInput.required = !isLogin;
    passInput.autocomplete = isLogin ? 'current-password' : 'new-password';
    heading.textContent = isLogin ? 'Welcome back' : 'Create your account';
    subline.textContent = isLogin ? 'Sign in to check your plants and see your history.' : 'It takes a few seconds. Your scans stay private to you.';
    submitBtn.textContent = isLogin ? 'Sign in' : 'Create account';
    errBox.classList.remove('active');
  }
  tabLogin.addEventListener('click', function(){ setMode('login'); });
  tabRegister.addEventListener('click', function(){ setMode('register'); });

  form.addEventListener('submit', function(e){
    e.preventDefault();
    errBox.classList.remove('active');
    submitBtn.disabled = true;
    var original = submitBtn.textContent;
    submitBtn.textContent = 'Please wait\u2026';

    var request = mode === 'login'
      ? R.api('/auth/login',    { method:'POST', public:true, json:{ email: emailInput.value, password: passInput.value } })
      : R.api('/auth/register', { method:'POST', public:true, json:{ name: nameInput.value, email: emailInput.value, password: passInput.value } });

    request.then(function(session){
      R.setSession(session.token, session.user);
      window.location.replace('index.html');
    }).catch(function(err){
      errBox.textContent = err.message;
      errBox.classList.add('active');
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    });
  });

  setMode('login');
})(window.Rosarium);

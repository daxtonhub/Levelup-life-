// ══════════════════════════════════
// TERMS
// ══════════════════════════════════
function showTerms(required) {
  fadeLoading();
  hide('auth-wrap');
  show('terms-screen');
  if (!required) {
    const footer = document.querySelector('.terms-footer');
    if (footer) footer.style.display = 'none';
  }
}
function showTermsView() { showTerms(false); }

window.switchTermsTab = function(tab, btn) {
  document.querySelectorAll('.terms-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  hide('terms-privacy-content');
  hide('terms-content');
  show(tab === 'privacy' ? 'terms-privacy-content' : 'terms-content');
};

window.toggleTermsCheck = function() {
  termsChecked = !termsChecked;
  const cb = id('terms-checkbox');
  const btn = id('terms-accept-btn');
  cb.classList.toggle('checked', termsChecked);
  cb.textContent = termsChecked ? '✓' : '';
  btn.disabled = !termsChecked;
  btn.style.opacity = termsChecked ? '1' : '.5';
};

window.acceptTerms = async function() {
  if (!termsChecked) return;
  if (user) {
    await sb.from('profiles').update({
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString()
    }).eq('id', user.id);
    if (profile) profile.terms_accepted = true;
    try {
      await sb.from('privacy_acceptances').insert({ user_id: user.id, version: '1.0' });
    } catch(e) {}
  }
  hide('terms-screen');
  if (!profile?.gender_selected) {
    show('gender-screen');
  } else {
    await checkVIPStatus();
    await generateDailyQuests();
    await loadAllData();
    showMainApp();
  }
};

// ══════════════════════════════════
// GENDER
// ══════════════════════════════════
window.pickGender = function(gender) {
  selectedGender = gender;
  id('gender-male').classList.toggle('selected', gender === 'male');
  id('gender-female').classList.toggle('selected', gender === 'female');
  const btn = id('gender-confirm-btn');
  btn.disabled = false;
  btn.style.opacity = '1';
};

window.confirmGender = async function() {
  if (!selectedGender) return;
  await sb.from('profiles').update({
    gender: selectedGender,
    gender_selected: true,
    is_female_mode: selectedGender === 'female'
  }).eq('id', user.id);
  if (profile) {
    profile.gender = selectedGender;
    profile.gender_selected = true;
    profile.is_female_mode = selectedGender === 'female';
  }
  hide('gender-screen');
  if (!profile?.onboarding_complete) {
    show('onboarding-screen');
    obShowStep(1);
    return;
  }
  await checkVIPStatus();
  await generateDailyQuests();
  await loadAllData();
  showMainApp();
};

// ══════════════════════════════════
// VIP CHECK
// ══════════════════════════════════
async function checkVIPStatus() {
  if (!user || !profile) return;
  try {
    const { data: vip } = await sb.from('vip_players')
      .select('*')
      .eq('email', user.email.toLowerCase())
      .single();
    if (vip && !profile.is_premium) {
      await sb.from('profiles').update({
        is_premium: true,
        premium_type: 'premium_ai'
      }).eq('id', user.id);
      if (!vip.user_id) {
        await sb.from('vip_players').update({ user_id: user.id }).eq('id', vip.id);
      }
      profile.is_premium = true;
      profile.premium_type = 'premium_ai';
    }
  } catch(e) {}
}

// ══════════════════════════════════
// AUTH SCREENS
// ══════════════════════════════════
window.switchAuth = function(tab) { showAuthScreen(tab); };

function showAuthScreen(name) {
  ['login', 'signup', 'forgot'].forEach(s => hide(s + '-screen'));
  show(name + '-screen');
}

// ══════════════════════════════════
// LOGIN
// ══════════════════════════════════
window.doLogin = async function() {
  const email = val('login-email'), pass = val('login-password');
  const errEl = id('login-error'), btn = id('login-btn');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = '⚠️ Fill in all fields'; return; }
  btn.textContent = 'Logging in...'; btn.disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  btn.textContent = 'ENTER THE GAME'; btn.disabled = false;
  if (error) {
    errEl.textContent = error.message.includes('Invalid')
      ? '❌ Wrong email or password'
      : '❌ ' + error.message;
    return;
  }
  user = data.user;
  hide('auth-wrap');
  show('loading-screen');
  id('loading-screen').classList.remove('fade-out');
  await loadProfile();
  if (!profile?.terms_accepted) { showTerms(true); return; }
  if (!profile?.gender_selected) { fadeLoading(); show('gender-screen'); return; }
  if (!profile?.onboarding_complete) { fadeLoading(); show('onboarding-screen'); obShowStep(1); return; }
  await checkVIPStatus();
  await generateDailyQuests();
  await loadAllData();
  showMainApp();
};

// ══════════════════════════════════
// SIGNUP
// ══════════════════════════════════
window.doSignup = async function() {
  const username = val('signup-username'), email = val('signup-email'), pass = val('signup-password');
  const errEl = id('signup-error'), btn = id('signup-btn');
  errEl.textContent = '';
  if (!username || !email || !pass) { errEl.textContent = '⚠️ Fill in all fields'; return; }
  if (pass.length < 6) { errEl.textContent = '⚠️ Password must be 6+ characters'; return; }
  btn.textContent = 'Creating account...'; btn.disabled = true;
  const { data, error } = await sb.auth.signUp({ email, password: pass });
  btn.textContent = 'BEGIN ADVENTURE'; btn.disabled = false;
  if (error) { errEl.textContent = '❌ ' + error.message; return; }
  user = data.user;
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  await sb.from('profiles').insert({
    id: user.id, username, xp: 0, level: 1, motivation: 100,
    streak: 0, is_admin: isAdmin, gems: 0, coins: 0, role: 'warrior',
    terms_accepted: false, gender_selected: false
  });
  for (const s of ['fitness','mindset','knowledge','discipline','creativity','social']) {
    await sb.from('skills').insert({ user_id: user.id, skill_name: s, skill_level: 1, skill_xp: 0 });
  }
  hide('auth-wrap');
  await loadProfile();
  showTerms(true);
};

// ══════════════════════════════════
// FORGOT PASSWORD
// ══════════════════════════════════
window.doForgot = async function() {
  const email = val('forgot-email'), msgEl = id('forgot-msg');
  msgEl.style.color = 'var(--red)';
  if (!email) { msgEl.textContent = '⚠️ Enter your email'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) { msgEl.textContent = '❌ ' + error.message; return; }
  msgEl.style.color = 'var(--green)';
  msgEl.textContent = '✅ Reset email sent!';
};

// ══════════════════════════════════
// LOGOUT
// ══════════════════════════════════
window.doLogout = async function() {
  await sb.auth.signOut();
  user = null; profile = null;
  dailyQuests = []; systemQuests = [];
  hide('main-app');
  show('auth-wrap');
  showAuthScreen('login');
};

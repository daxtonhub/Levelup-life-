// ════════════════════════════════════════════
// APP.JS — Core Logic
// ════════════════════════════════════════════

// ─── RANK SYSTEM ──────────────────────────────
const STAGE_XP_BASE = 4000;
const STAGE_XP_MULT = 1.5;

const RANK_TIERS = [
  { name:'Bronze',       icon:'🥉', color:'#cd7f32', frame:'frame-bronze'       },
  { name:'Silver',       icon:'🥈', color:'#c0c0c0', frame:'frame-silver'       },
  { name:'Gold',         icon:'🏅', color:'#ffd700', frame:'frame-gold'         },
  { name:'Platinum',     icon:'💎', color:'#60a5fa', frame:'frame-platinum'     },
  { name:'Diamond',      icon:'💠', color:'#67e8f9', frame:'frame-diamond'      },
  { name:'Master',       icon:'⚔️', color:'#6366f1', frame:'frame-master'       },
  { name:'Grandmaster',  icon:'🔮', color:'#7c3aed', frame:'frame-grandmaster'  },
  { name:'Legendary',    icon:'🌟', color:'#f59e0b', frame:'frame-legendary'    },
  { name:'Mythic',       icon:'🔥', color:'#ef4444', frame:'frame-mythic'       },
  { name:'Ascended',     icon:'👑', color:'#a855f7', frame:'frame-ascended'     },
  { name:'Transcendent', icon:'✨', color:'#ffffff', frame:'frame-transcendent' }
];

// XP needed to COMPLETE stage at stageIndex (0 = Bronze I)
function getStageXP(stageIndex) {
  return Math.round(STAGE_XP_BASE * Math.pow(STAGE_XP_MULT, stageIndex));
}

// Cumulative XP needed to START stageIndex
function getStageCumulativeXP(stageIndex) {
  let total = 0;
  for (let i = 0; i < stageIndex; i++) total += getStageXP(i);
  return total;
}

// Full rank info from total XP
function getRankInfo(totalXP) {
  const xp = totalXP || 0;
  let stageIndex = 0, cumulative = 0;
  while (true) {
    const needed = getStageXP(stageIndex);
    if (xp < cumulative + needed) break;
    cumulative += needed;
    stageIndex++;
    if (stageIndex > 500) break; // safety
  }
  const tierIndex = Math.min(Math.floor(stageIndex / 3), RANK_TIERS.length - 1);
  const tier = RANK_TIERS[tierIndex];
  const STAGES = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  let stage;
  if (tier.name === 'Transcendent') {
    const tSub = stageIndex - 30; // 0-indexed within Transcendent
    stage = STAGES[tSub] || ('T' + (tSub + 1));
  } else {
    stage = STAGES[stageIndex % 3];
  }
  const stageXP = getStageXP(stageIndex);
  const xpInStage = xp - cumulative;
  const pct = Math.min(100, Math.round((xpInStage / stageXP) * 100));
  return { tier, stage, tierIndex, stageIndex, fullName: `${tier.name} ${stage}`, icon: tier.icon, color: tier.color, frame: tier.frame, xpInStage, stageXP, cumulativeXP: cumulative, pct };
}

function checkTierChange(oldXP, newXP) {
  const oldR = getRankInfo(oldXP), newR = getRankInfo(newXP);
  if (newR.tierIndex > oldR.tierIndex) return newR;
  return null;
}

function applyFrame() {
  if (!profile) return;
  const rs = getRankInfo(profile.xp || 0);
  const activeFrame = profile.active_frame === 'rank' || !profile.active_frame ? rs.frame : profile.active_frame;
  const heroCard = document.querySelector('.hero-card');
  const profileCard = document.querySelector('.profile-card');
  const allFrames = RANK_TIERS.map(t => t.frame);
  allFrames.forEach(fc => { heroCard?.classList.remove(fc); profileCard?.classList.remove(fc); });
  heroCard?.classList.add(activeFrame);
  profileCard?.classList.add(activeFrame);
  const rb = id('rank-badge-display');
  if (rb) { rb.textContent = rs.icon + ' ' + rs.fullName; rb.style.color = rs.color; rb.style.borderColor = rs.color + '44'; rb.style.background = rs.color + '11'; }
}

// ─── CONSTANTS ────────────────────────────────
// today removed — using getToday() from supabase.js
const DAILY_BONUS_XP    = 300;
const DAILY_BONUS_COINS  = 500;
const DAILY_BONUS_GEMS   = 20;

const SUMMON_RANKS = {
  Common:    { color:'#94a3b8', icon:'⚪' },
  Rare:      { color:'#60a5fa', icon:'🔵' },
  Epic:      { color:'#a855f7', icon:'🟣' },
  Legendary: { color:'#f59e0b', icon:'🟡' },
  Mythic:    { color:'#ef4444', icon:'🔴' }
};

function abilityLabel(a) {
  if (!a || !a.type) return null;
  if (a.type === 'xp_boost') return `+${a.value}% All XP`;
  if (a.type === 'coin_boost') return `+${a.value}% Coins`;
  if (a.type === 'skill_xp_boost') return `+${a.value}% ${cap(a.skill||'')} XP`;
  if (a.type === 'energy_boost') return `+${a.value} Energy/Quest`;
  if (a.type === 'streak_shield') return `🛡️ Streak Guard`;
  return null;
}
function getAbilitiesList(s) { return (s.abilities || []).map(abilityLabel).filter(Boolean); }

const DIFF_CONFIG = {
  easy:   { label:'Easy',   cls:'diff-easy',   icon:'⚪', xp:50,  coins:15 },
  medium: { label:'Medium', cls:'diff-medium', icon:'🟡', xp:100, coins:35 },
  hard:   { label:'Hard',   cls:'diff-hard',   icon:'🔴', xp:200, coins:75 }
};

const SKILL_ICONS = { fitness:'💪', mindset:'🧠', knowledge:'📚', discipline:'⚔️', creativity:'🎨', social:'🤝' };
const MOOD_ICONS  = { struggling:'😔', neutral:'😐', okay:'🙂', good:'😊', amazing:'🌟' };

const ROLES = {
  warrior:  { icon:'⚔️', name:'Warrior',   bonus:'fitness',    color:'#ef4444', desc:'+20% XP on Fitness'    },
  mage:     { icon:'🧙', name:'Mage',       bonus:'knowledge',  color:'#a855f7', desc:'+20% XP on Knowledge'  },
  assassin: { icon:'🗡️', name:'Assassin',   bonus:'discipline', color:'#94a3b8', desc:'+20% XP on Discipline' },
  healer:   { icon:'💚', name:'Healer',     bonus:'mindset',    color:'#10b981', desc:'+20% XP on Mindset'    },
  creator:  { icon:'🎨', name:'Creator',    bonus:'creativity', color:'#f97316', desc:'+20% XP on Creativity' },
  diplomat: { icon:'🤝', name:'Diplomat',   bonus:'social',     color:'#3b82f6', desc:'+20% XP on Social'     }
};

const BG_COLORS = ['#1a1a2e','#0d1a2e','#1a0a2e','#0d2e1a','#2e1a0d','#1a2e2e','#2e0d1a','#0a1a0a','#1a1a0a','#0a0a2e','#2d1065','#134e4a','#1e3a5f','#4a1942','#1a0000','#0f172a','#1c1917','#052e16','#450a0a','#1e1b4b'];

const DEFAULT_QUESTS = [
  { title:'Morning Stretch (5 mins)',        type:'habit', skill:'fitness',    diff:'easy'   },
  { title:'Drink 8 glasses of water',        type:'habit', skill:'discipline', diff:'easy'   },
  { title:'Read for 15 minutes',             type:'habit', skill:'knowledge',  diff:'medium' },
  { title:'Write in your journal',           type:'habit', skill:'mindset',    diff:'medium' },
  { title:'No social media for 2 hrs',       type:'habit', skill:'discipline', diff:'hard'   },
  { title:'Learn something new',             type:'habit', skill:'knowledge',  diff:'medium' },
  { title:'Reach out to a friend',           type:'todo',  skill:'social',     diff:'medium' }
];

const PERIOD_PHASES = {
  menstrual:  { name:'Menstrual Phase',  icon:'🌸', color:'#ec4899', days:'Day 1–5',  desc:'Rest and restore.',     tip:'Focus on gentle movement and self-care.'        },
  follicular: { name:'Follicular Phase', icon:'🌱', color:'#10b981', days:'Day 6–13', desc:'Energy rising.',        tip:'Great time to start new habits and goals.'      },
  ovulation:  { name:'Ovulation Phase',  icon:'⭐', color:'#f59e0b', days:'Day 14',   desc:'Peak energy.',          tip:'Best time for workouts and social activities.'  },
  luteal:     { name:'Luteal Phase',     icon:'🌙', color:'#6366f1', days:'Day 15–28',desc:'Turning inward.',       tip:'Focus on journaling and slowing down.'          }
};

const STRUGGLE_CONFIG = {
  phone_addiction: { label:'Phone Addiction', petName:'Nova', quests:[
    { title:'No phone for 1 hour', diff:'easy' },
    { title:'Keep phone in another room while studying', diff:'medium' },
    { title:'Track your screen time today', diff:'easy' }
  ]},
  laziness: { label:'Laziness', petName:'Blaze', quests:[
    { title:'Wake up without snoozing', diff:'easy' },
    { title:'Complete 1 task before checking phone', diff:'medium' },
    { title:'Do 10 minutes of movement', diff:'easy' }
  ]},
  focus: { label:'Focus Issues', petName:'Sage', quests:[
    { title:'Study for 25 minutes without distraction', diff:'medium' },
    { title:'Write down 3 priorities for today', diff:'easy' },
    { title:'Complete one full task before switching', diff:'medium' }
  ]}
};

const LOOT_TABLE = [
  { type:'coins',  label:'COINS',         icon:'🪙',   chance:40, getValue:() => 50  + Math.floor(Math.random()*150) },
  { type:'coins',  label:'BIG COINS',     icon:'🪙',   chance:20, getValue:() => 200 + Math.floor(Math.random()*300) },
  { type:'xp',     label:'XP BOOST',      icon:'⚡',   chance:15, getValue:() => 200 },
  { type:'shards', label:'SUMMON SHARD',  icon:'🔮',   chance:15, getValue:() => 1 },
  { type:'shield', label:'STREAK SHIELD', icon:'🛡️',  chance:8,  getValue:() => 1 },
  { type:'shards', label:'3 SHARDS',      icon:'🔮✨', chance:2,  getValue:() => 3 }
];

// ─── GLOBALS ──────────────────────────────────
let user, profile;
let dailyQuests = [], systemQuests = [], allSkills = [];
let qFilter = 'all', selectedBg = '#1a1a2e';
let selectedMood = 'okay', selectedRole = 'warrior';
let selectedGender = null, termsChecked = false;
let currentManualCategory = 'all';
let userGuild = null;
let activeSummons = [];

async function loadActiveSummons() {
  try {
    const { data } = await sb.from('summons').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: true }).limit(2);
    activeSummons = data || [];
  } catch(e) { activeSummons = []; }
}

// ─── PWA ──────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// ─── INIT ─────────────────────────────────────
async function initApp() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      user = session.user;
      await loadProfile();
      if (!profile?.terms_accepted)      { showTerms(true); return; }
      if (!profile?.gender_selected)     { fadeLoading(); show('gender-screen'); return; }
      if (!profile?.onboarding_complete) { fadeLoading(); show('onboarding-screen'); obShowStep(1); return; }
      await generateDailyQuests();
      await loadAllData();
      showMainApp();
    } else {
      fadeLoading();
      show('auth-wrap');
      showAuthScreen('login');
    }
  } catch (err) {
    console.error('initApp error:', err);
    emergencyShowAuth();
  }
}

function fadeLoading() {
  const ls = id('loading-screen');
  if (ls) { ls.classList.add('fade-out'); setTimeout(() => hide('loading-screen'), 500); }
}
function emergencyShowAuth() {
  fadeLoading(); hide('terms-screen'); hide('gender-screen');
  show('auth-wrap');
  ['login','signup','forgot'].forEach(s => hide(s + '-screen'));
  show('login-screen');
}
setTimeout(() => { const ls = id('loading-screen'); if (ls && !ls.classList.contains('fade-out')) emergencyShowAuth(); }, 6000);

// ─── TERMS ────────────────────────────────────
function showTerms(required) {
  fadeLoading(); show('terms-screen');
  if (!required) { const f = document.querySelector('.terms-footer'); if(f) f.style.display = 'none'; }
}
window.showTermsView    = () => showTerms(false);
window.switchTermsTab   = (tab, btn) => { document.querySelectorAll('.terms-tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); hide('terms-privacy-content'); hide('terms-content'); show(tab === 'privacy' ? 'terms-privacy-content' : 'terms-content'); };
window.toggleTermsCheck = () => { termsChecked = !termsChecked; const cb = id('terms-checkbox'), btn = id('terms-accept-btn'); cb.classList.toggle('checked', termsChecked); cb.textContent = termsChecked ? '✓' : ''; btn.disabled = !termsChecked; btn.style.opacity = termsChecked ? '1' : '.5'; };
window.acceptTerms = async () => {
  if (!termsChecked) return;
  if (user) { await sb.from('profiles').update({ terms_accepted: true, terms_accepted_at: new Date().toISOString() }).eq('id', user.id); if (profile) profile.terms_accepted = true; try { await sb.from('privacy_acceptances').insert({ user_id: user.id, version: '1.0' }); } catch(e) {} }
  hide('terms-screen');
  if (!profile?.gender_selected) show('gender-screen');
  else { await generateDailyQuests(); await loadAllData(); showMainApp(); }
};

// ─── GENDER ───────────────────────────────────
window.pickGender = (gender) => { selectedGender = gender; id('gender-male')?.classList.toggle('selected', gender === 'male'); id('gender-female')?.classList.toggle('selected', gender === 'female'); const btn = id('gender-confirm-btn'); if (btn) { btn.disabled = false; btn.style.opacity = '1'; } };
window.confirmGender = async () => {
  if (!selectedGender) return;
  await sb.from('profiles').update({ gender: selectedGender, gender_selected: true, is_female_mode: selectedGender === 'female' }).eq('id', user.id);
  if (profile) { profile.gender = selectedGender; profile.gender_selected = true; profile.is_female_mode = selectedGender === 'female'; }
  hide('gender-screen');
  if (!profile?.onboarding_complete) { show('onboarding-screen'); obShowStep(1); return; }
  await generateDailyQuests(); await loadAllData(); showMainApp();
};

// ─── AUTH ─────────────────────────────────────
window.switchAuth = (tab) => showAuthScreen(tab);
function showAuthScreen(name) { ['login','signup','forgot'].forEach(s => hide(s + '-screen')); show(name + '-screen'); }

window.doLogin = async () => {
  const email = val('login-email'), pass = val('login-password');
  const errEl = id('login-error'), btn = id('login-btn');
  errEl.textContent = '';
  if (!email || !pass) { errEl.textContent = '⚠️ Fill in all fields'; return; }
  btn.textContent = 'Logging in...'; btn.disabled = true;
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  btn.textContent = 'ENTER THE GAME'; btn.disabled = false;
  if (error) { errEl.textContent = error.message.includes('Invalid') ? '❌ Wrong email or password' : '❌ ' + error.message; return; }
  user = data.user; hide('auth-wrap'); show('loading-screen'); id('loading-screen').classList.remove('fade-out');
  await loadProfile();
  if (!profile?.terms_accepted)      { showTerms(true); return; }
  if (!profile?.gender_selected)     { fadeLoading(); show('gender-screen'); return; }
  if (!profile?.onboarding_complete) { fadeLoading(); show('onboarding-screen'); obShowStep(1); return; }
  await generateDailyQuests(); await loadAllData(); showMainApp();
};

window.doSignup = async () => {
  const username = val('signup-username'), email = val('signup-email'), pass = val('signup-password');
  const errEl = id('signup-error'), btn = id('signup-btn');
  errEl.textContent = '';
  if (!username || !email || !pass) { errEl.textContent = '⚠️ Fill in all fields'; return; }
  if (pass.length < 6)              { errEl.textContent = '⚠️ Password must be 6+ characters'; return; }
  btn.textContent = 'Creating...'; btn.disabled = true;
  const { data, error } = await sb.auth.signUp({ email, password: pass });
  btn.textContent = 'BEGIN ADVENTURE'; btn.disabled = false;
  if (error) { errEl.textContent = '❌ ' + error.message; return; }
  user = data.user;
  const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  await sb.from('profiles').insert({ id: user.id, username, xp: 0, energy: 100, streak: 0, is_admin: isAdmin, gems: 0, coins: 0, role: 'warrior', terms_accepted: false, gender_selected: false, active_frame: 'rank' });
  for (const s of Object.keys(SKILL_ICONS)) await sb.from('skills').insert({ user_id: user.id, skill_name: s, skill_level: 1, skill_xp: 0 });
  hide('auth-wrap'); await loadProfile(); showTerms(true);
};

window.doForgot = async () => {
  const email = val('forgot-email'), msgEl = id('forgot-msg');
  msgEl.style.color = 'var(--red)';
  if (!email) { msgEl.textContent = '⚠️ Enter your email'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email);
  if (error) { msgEl.textContent = '❌ ' + error.message; return; }
  msgEl.style.color = 'var(--green)'; msgEl.textContent = '✅ Reset email sent!';
};

window.doLogout = async () => {
  await sb.auth.signOut();
  user = null; profile = null; dailyQuests = []; systemQuests = [];
  hide('main-app'); show('auth-wrap'); showAuthScreen('login');
};

// ─── PROFILE ──────────────────────────────────
async function loadProfile() {
  const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (data) { profile = data; }
  else {
    const isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const { data: np } = await sb.from('profiles').insert({ id: user.id, username: user.email.split('@')[0], xp: 0, energy: 100, streak: 0, is_admin: isAdmin, gems: 0, coins: 0, role: 'warrior', terms_accepted: false, gender_selected: false, active_frame: 'rank' }).select().single();
    profile = np;
  }
  selectedRole = profile?.role || 'warrior';
  if (profile && profile.energy === null) profile.energy = 100;
}

async function loadAllData() {
  const [dq, sq, sk] = await Promise.all([
    sb.from('daily_quests').select('*').eq('user_id', user.id).eq('quest_date', getToday()),
    sb.from('system_quests').select('*').eq('is_active', true),
    sb.from('skills').select('*').eq('user_id', user.id)
  ]);
  dailyQuests  = dq.data || [];
  systemQuests = sq.data || [];
  allSkills    = sk.data || [];
  if (!allSkills.length) {
    for (const s of Object.keys(SKILL_ICONS)) await sb.from('skills').insert({ user_id: user.id, skill_name: s, skill_level: 1, skill_xp: 0 });
    const { data: nsk } = await sb.from('skills').select('*').eq('user_id', user.id);
    allSkills = nsk || [];
  }
}

async function generateDailyQuests() {
  const { data: ex } = await sb.from('daily_quests').select('id').eq('user_id', user.id).eq('quest_date', getToday()).limit(1);
  if (ex && ex.length > 0) return;
  await sb.from('daily_quests').insert(DEFAULT_QUESTS.map(q => ({
    user_id: user.id, title: q.title, quest_type: q.type, skill_category: q.skill,
    xp_reward: DIFF_CONFIG[q.diff].xp, quest_date: getToday(), is_completed: false, difficulty: q.diff, is_recurring: q.type === 'habit'
  })));
  if (profile?.gender === 'female' && profile?.is_female_mode) await generatePeriodQuests();
}

async function generatePeriodQuests() {
  const phase = await getCurrentPhase(); if (!phase) return;
  const { data: pqs } = await sb.from('period_quests').select('*').eq('phase', phase).eq('is_active', true).limit(3);
  if (!pqs?.length) return;
  await sb.from('daily_quests').insert(pqs.map(q => ({ user_id: user.id, title: q.title, quest_type: 'habit', skill_category: 'mindset', xp_reward: q.xp_reward || DIFF_CONFIG.easy.xp, quest_date: getToday(), is_completed: false, difficulty: 'easy', is_recurring: true })));
}

async function getCurrentPhase() {
  try {
    const { data: lp } = await sb.from('period_tracking').select('*').eq('user_id', user.id).order('period_start', { ascending: false }).limit(1).single();
    if (!lp) return null;
    const dayNum = Math.floor((new Date() - new Date(lp.period_start + 'T00:00:00')) / 86400000) + 1;
    if (dayNum <= 5)  return 'menstrual';
    if (dayNum <= 13) return 'follicular';
    if (dayNum === 14) return 'ovulation';
    if (dayNum <= 28) return 'luteal';
    return null;
  } catch(e) { return null; }
}

// ─── SHOW MAIN APP ────────────────────────────
async function loadUserGuild() {
  try {
    const { data: m } = await sb.from('guild_members').select('*,guilds(*)').eq('user_id', user.id).single();
    userGuild = m?.guilds || null;
    const sub = id('guild-status-sub'); if (sub) sub.textContent = userGuild ? `Member of ${userGuild.name}` : 'Join or create a guild';
  } catch(e) { userGuild = null; }
}

function showMainApp() {
  fadeLoading(); hide('auth-wrap'); hide('terms-screen'); hide('gender-screen');
  setTimeout(async () => {
    show('main-app');
renderDateDisplay(); await loadActiveSummons(); renderAll(); checkDailyBonusAvailable(); checkPeriodPhase(); checkPenalties(); loadUserGuild(); requestNotificationPermission(); await checkLoginReward();
    if (profile?.is_admin || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) { const nb = id('nav-admin'); if (nb) nb.style.display = ''; }
    if (profile?.gender === 'female') { id('female-mode-row')?.style.setProperty('display', ''); if (profile?.is_female_mode) { id('female-toggle')?.classList.add('on'); show('female-section'); id('period-quest-filter')?.style.setProperty('display', ''); } }
    const gd = id('gender-display'); if (gd) gd.textContent = profile?.gender === 'female' ? '🌸 Female' : profile?.gender === 'male' ? '⚔️ Male' : 'Not set';
    checkAdvancementQuestsBanner();
  }, 500);
}

async function checkAdvancementQuestsBanner() {
  try {
    const { data: advQ } = await sb.from('advancement_quests').select('*').eq('user_id', user.id).eq('is_completed', false);
    const wrap = id('dash-advancement-wrap'), list = id('dash-advancement');
    if (!advQ?.length || !wrap || !list) { hide('dash-advancement-wrap'); return; }
    show('dash-advancement-wrap');
    list.innerHTML = advQ.map(q => `<div class="quest-card advancement-q" onclick="completeAdvancementQuest('${q.id}')">
      <div class="qcheck">🏆</div>
      <div class="qinfo"><div class="qtitle">${q.title}</div><div class="qmeta" style="color:var(--gold)">⚔️ Advancement — ${cap(q.rank_tier)} Rank</div></div>
      <div class="qright"><div class="qxp" style="color:var(--gold)">+200 XP</div></div>
    </div>`).join('');
  } catch(e) {}
}

// ─── DATE DISPLAY ─────────────────────────────
function renderDateDisplay() {
  const now = new Date();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const dayName = days[now.getDay()];
  if (id('home-date'))       id('home-date').textContent    = '📅 ' + dateStr;
  if (id('home-day'))        id('home-day').textContent     = dayName;
  if (id('journal-date'))    id('journal-date').textContent    = dateStr;
  if (id('journal-dayname')) id('journal-dayname').textContent = dayName;
}

// ─── RENDER ALL ───────────────────────────────
function renderAll() { renderTopbar(); renderHeroCard(); renderDashQuests(); renderDashSystem(); renderSkills(); renderQuestsTab(); renderMeTab(); }
function getRoleInfo(role) { return ROLES[role] || ROLES.warrior; }

function renderTopbar() {
  if (!profile) return;
  const rs = getRankInfo(profile.xp || 0);
  id('topbar-name').textContent  = profile.username || 'Hero';
  id('topbar-level').textContent = rs.icon + ' ' + rs.fullName;
  id('topbar-coins').textContent = profile.coins || 0;
  id('topbar-gems').textContent  = profile.gems  || 0;
  id('topbar-xp').textContent    = (profile.xp || 0) + ' XP';
  if (profile.avatar_url) id('topbar-avatar').innerHTML = `<img src="${profile.avatar_url}"/>`;
}

function renderHeroCard() {
  if (!profile) return;
  const xp = profile.xp || 0;
  const rs  = getRankInfo(xp);
  const role = getRoleInfo(profile.role || 'warrior');
  const energy = profile.energy ?? 100;
  const energyColor = energy > 60 ? 'var(--green)' : energy > 30 ? '#f97316' : 'var(--red)';

  const set = (eid, val) => { const el = id(eid); if (el) el.textContent = val; };
  set('hero-name', profile.username || 'Hero');
  set('hero-badge', rs.icon);
  set('rank-name-display', rs.fullName);
  set('xp-nums', `${rs.xpInStage.toLocaleString()} / ${rs.stageXP.toLocaleString()} XP`);
  set('hstat-streak', profile.streak || 0);
  set('hstat-done', dailyQuests.filter(q => q.is_completed).length);
  set('dash-gems', profile.gems || 0);
  set('dash-coins', profile.coins || 0);

  const hrole = id('hero-role');
  if (hrole) { hrole.textContent = `${role.icon} ${role.name}`; hrole.style.color = role.color; }
  const xpFill = id('xp-fill');
  if (xpFill) xpFill.style.width = rs.pct + '%';
  const energyEl = id('hstat-energy');
  if (energyEl) { energyEl.textContent = energy; energyEl.style.color = energyColor; }
  if (profile.avatar_url) { const av = id('hero-avatar'); if (av) av.innerHTML = `<img src="${profile.avatar_url}"/>`; }
  if (profile.bg_image_url) applyBgImage(profile.bg_image_url);
  else if (profile.namecard_bg) { const hb = document.querySelector('.hero-bg'); if (hb) hb.style.background = `linear-gradient(135deg,${profile.namecard_bg} 0%,#0a0a1a 100%)`; }
  applyFrame();
  const summonsRow = id('hero-summons-row');
  if (summonsRow) {
    summonsRow.innerHTML = activeSummons.map(s => {
      const rankInfo = SUMMON_RANKS[s.rank] || SUMMON_RANKS.Common;
      return `<div class="hero-summon-chip">
        ${s.image_url ? `<img src="${s.image_url}"/>` : `<div class="hero-summon-chip-placeholder">🔮</div>`}
        <div class="hero-summon-chip-info">
          <div class="hero-summon-chip-name">${s.name}</div>
          <div class="hero-summon-chip-meta">${rankInfo.icon} ${s.rank} • Bond ${s.bond_level}</div>
        </div>
      </div>`;
    }).join('');
  }
}

function checkDailyBonusAvailable() {
  if (!dailyQuests.length) return;
  const done = dailyQuests.filter(q => q.is_completed).length;
  if (done === dailyQuests.length && profile?.daily_bonus_claimed !== getToday()) show('bonus-banner-wrap');
  else hide('bonus-banner-wrap');
}

window.claimDailyBonus = async () => {
  if (profile?.daily_bonus_claimed === getToday()) { toast('Already claimed! ✅'); return; }
  await giveXP(DAILY_BONUS_XP, null, profile.role);
  await awardCurrency(DAILY_BONUS_GEMS, DAILY_BONUS_COINS);
  const newShards = (profile.summon_shards || 0) + 1;
  await sb.from('profiles').update({ daily_bonus_claimed: getToday(), summon_shards: newShards }).eq('id', user.id);
  profile.daily_bonus_claimed = getToday(); profile.summon_shards = newShards;
  hide('bonus-banner-wrap');
  toast(`🎁 +${DAILY_BONUS_XP}XP +🪙${DAILY_BONUS_COINS} +💎${DAILY_BONUS_GEMS} +1 Shard!`, 'gem');
  checkShardsToTicket(); openLootBox(); await checkAchievements(); renderAll();
};

function renderDashQuests() {
  const el = id('dash-quests'); if (!el) return;
  if (!dailyQuests.length) { el.innerHTML = empty('✅', 'No quests getToday()'); return; }
  el.innerHTML = dailyQuests.slice(0, 5).map(q => questCard(q)).join('');
}

async function renderDashSystem() {
  const el = id('dash-system'); if (!el) return;
  if (!systemQuests.length) { el.innerHTML = empty('🎯', 'No system quests yet'); return; }
  const { data: uSQ } = await sb.from('user_system_quests').select('*').eq('user_id', user.id);
  const doneIds = (uSQ || []).filter(x => x.is_completed).map(x => x.quest_id);
  el.innerHTML = systemQuests.map(q => {
    const dc = DIFF_CONFIG[q.difficulty || 'medium'] || DIFF_CONFIG.medium;
    const done = doneIds.includes(q.id);
    return `<div class="quest-card system-q ${done ? 'done' : ''}" onclick="completeSQ('${q.id}',${done})">
      <div class="qcheck">${done ? '✓' : '👑'}</div>
      <div class="qinfo"><div class="qtitle">${q.title}</div><div class="qmeta">${SKILL_ICONS[q.skill_category]||'👑'} <span class="diff-badge ${dc.cls}">${dc.icon} ${dc.label}</span></div></div>
      <div class="qright"><div class="qxp">+${q.xp_reward} XP</div></div>
    </div>`;
  }).join('');
}

function renderSkills() {
  const el = id('dash-skills'); if (!el || !allSkills.length) { if(el) el.innerHTML = empty('📚', 'No skills yet'); return; }
  const sorted = [...allSkills].sort((a, b) => (b.skill_xp||0) - (a.skill_xp||0));
  const badges = ['🥇','🥈','🥉'];
  el.innerHTML = allSkills.map(s => {
    const rank = sorted.indexOf(s);
    const perf = rank < 3 ? ['perf-gold','perf-silver','perf-bronze'][rank] : '';
    return `<div class="skill-card ${perf}">
      ${rank < 3 ? `<div class="skill-top-badge">${badges[rank]}</div>` : ''}
      <div class="skill-icon">${SKILL_ICONS[s.skill_name]||'⭐'}</div>
      <div class="skill-name">${cap(s.skill_name)}</div>
      <div class="skill-lv">LV ${s.skill_level}</div>
      <div class="skill-track"><div class="skill-fill" style="width:${(s.skill_xp||0)%100}%"></div></div>
    </div>`;
  }).join('');
}

function questCard(q) {
  const dc = DIFF_CONFIG[q.difficulty] || DIFF_CONFIG.medium;
  const isPeriod = q.quest_type === 'period' || q.skill_category === 'period';
  return `<div class="quest-card ${q.is_completed?'done':''} ${isPeriod?'period-q':''}" onclick="completeQuest('${q.id}','${q.skill_category}',${q.is_completed},'${q.difficulty||'medium'}')">
    <div class="qcheck">${q.is_completed?'✓':''}</div>
    <div class="qinfo"><div class="qtitle">${q.title}</div><div class="qmeta">${SKILL_ICONS[q.skill_category]||'⭐'} ${q.skill_category} <span class="diff-badge ${dc.cls}">${dc.icon} ${dc.label}</span></div></div>
    <div class="qright"><div class="qxp">+${q.xp_reward} XP</div><div style="font-size:10px;color:var(--text3)">🪙${dc.coins}</div></div>
  </div>`;
}

async function renderQuestsTab() {
  const el = id('quests-list'); if (!el) return;
  const total = dailyQuests.length, done = dailyQuests.filter(q => q.is_completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const pFill = id('q-progress-fill'), pText = id('q-progress-text');
  if (pFill) pFill.style.width = pct + '%';
  if (pText) pText.textContent = `${done}/${total} done`;

  const { data: uSQ } = await sb.from('user_system_quests').select('*').eq('user_id', user.id);
  const doneIds = (uSQ || []).filter(x => x.is_completed).map(x => x.quest_id);
  const { data: advQ } = await sb.from('advancement_quests').select('*').eq('user_id', user.id).eq('is_completed', false);

  let list = [...dailyQuests];
  const sqList  = systemQuests.map(q => ({ ...q, quest_type: 'system', is_completed: doneIds.includes(q.id) }));
  const advList = (advQ || []).map(q => ({ ...q, quest_type: 'advancement' }));

  if      (qFilter === 'all')         list = [...advList, ...list, ...sqList];
  else if (qFilter === 'habit')       list = list.filter(q => q.quest_type === 'habit');
  else if (qFilter === 'todo')        list = list.filter(q => q.quest_type === 'todo');
  else if (qFilter === 'system')      list = sqList;
  else if (qFilter === 'advancement') list = advList;
  else if (qFilter === 'period')      list = list.filter(q => q.quest_type === 'period' || q.skill_category === 'period');
  else if (qFilter === 'scheduled')   { const { data: future } = await sb.from('daily_quests').select('*').eq('user_id', user.id).gt('quest_date', getToday()).order('quest_date', { ascending: true }).limit(20); list = future || []; }

  if (!list.length) { el.innerHTML = empty('📋', qFilter === 'scheduled' ? 'No upcoming scheduled quests' : 'No quests here yet'); return; }

  el.innerHTML = list.map(q => {
    if (q.quest_type === 'advancement') return `<div class="quest-card advancement-q" onclick="completeAdvancementQuest('${q.id}')"><div class="qcheck">🏆</div><div class="qinfo"><div class="qtitle">${q.title}</div><div class="qmeta" style="color:var(--gold)">⚔️ Advancement — ${cap(q.rank_tier)} Rank</div></div><div class="qright"><div class="qxp" style="color:var(--gold)">+200 XP</div></div></div>`;
    if (q.quest_type === 'system') { const dc = DIFF_CONFIG[q.difficulty||'medium']||DIFF_CONFIG.medium; return `<div class="quest-card system-q ${q.is_completed?'done':''}" onclick="completeSQ('${q.id}',${q.is_completed})"><div class="qcheck">${q.is_completed?'✓':'👑'}</div><div class="qinfo"><div class="qtitle">${q.title}</div><div class="qmeta">👑 System Quest</div></div><div class="qxp">+${q.xp_reward} XP</div></div>`; }
    if (q.quest_date !== getToday()) { const dc = DIFF_CONFIG[q.difficulty||'medium']||DIFF_CONFIG.medium; return `<div class="quest-card" style="border-left-color:var(--blue);opacity:.8"><div class="qcheck" style="border-color:var(--blue)">🗓️</div><div class="qinfo"><div class="qtitle">${q.title}</div><div class="qmeta">📅 Starts ${q.quest_date} <span class="diff-badge ${dc.cls}">${dc.icon} ${dc.label}</span></div></div><div class="qxp">+${q.xp_reward} XP</div></div>`; }
    return questCard(q);
  }).join('');
}

function renderMeTab() {
  if (!profile) return;
  const rs   = getRankInfo(profile.xp || 0);
  const role = getRoleInfo(profile.role || 'warrior');
  const energy = profile.energy ?? 100;

  const set = (eid, v) => { const el = id(eid); if (el) el.textContent = v; };
  set('profile-name', profile.username || 'Hero');
  set('profile-email', user?.email || '');
  set('pstat-xp', (profile.xp||0).toLocaleString());
  set('pstat-streak', profile.streak || 0);
  set('pstat-energy', energy);
  set('pstat-gems', profile.gems || 0);
  set('pstat-coins', profile.coins || 0);

  const rb = id('profile-role-badge');
  if (rb) { rb.textContent = `${role.icon} ${role.name}`; rb.style.color = role.color; rb.style.borderColor = role.color + '44'; rb.style.background = role.color + '11'; }
  const cs = id('class-sub'); if (cs) cs.textContent = `${role.icon} ${role.name} — ${role.desc}`;
  if (profile.avatar_url) { const pa = id('profile-avatar'); if(pa) pa.innerHTML = `<img src="${profile.avatar_url}"/>`; }
  if (profile.bg_image_url) applyBgImage(profile.bg_image_url);
  else if (profile.namecard_bg) { const pb = document.querySelector('.profile-bg'); if(pb) pb.style.background = `linear-gradient(135deg,${profile.namecard_bg} 0%,#0a1a2e 100%)`; }
  const gd = id('gender-display'); if (gd) gd.textContent = profile?.gender === 'female' ? '🌸 Female' : profile?.gender === 'male' ? '⚔️ Male' : 'Not set';
  if (profile.is_female_mode) { id('female-toggle')?.classList.add('on'); show('female-section'); loadPeriodHistory(); }
  applyFrame();
}

// ─── SECTION TOGGLE ───────────────────────────
window.toggleSection = (contentId, arrowId) => {
  const content = id(contentId); if (!content) return;
  const isHidden = content.classList.contains('hidden');
  content.classList.toggle('hidden', !isHidden);
  const arrow = id(arrowId); if (arrow) arrow.textContent = isHidden ? '‹' : '›';
  if (isHidden) {
    if (contentId === 'glory-content')     renderGlory();
    else if (contentId === 'guilds-content')    renderGuildSection();
    else if (contentId === 'events-content')    renderEvents();
    else if (contentId === 'boss-content')      renderBossFights();
    else if (contentId === 'manuals-content')   renderManuals();
    else if (contentId === 'shop-content')         renderShopSection();
    else if (contentId === 'frames-content')       renderFramesSection();
    else if (contentId === 'your-summons-content') renderYourSummons();
  }
};

// ─── QUEST COMPLETION ─────────────────────────
window.completeQuest = async (qid, skillCat, done, diff) => {
  if (done) { toast('Already done! ✅'); return; }
  const q = dailyQuests.find(x => x.id === qid); if (q) q.is_completed = true;
  const card = document.querySelector(`[onclick*="${qid}"]`);
  if (card) { card.classList.add('done'); card.querySelector('.qcheck')?.setAttribute('textContent','✓'); const ck = card.querySelector('.qcheck'); if(ck) ck.textContent = '✓'; card.querySelector('.qtitle')?.style.setProperty('text-decoration','line-through'); }
  const dc = DIFF_CONFIG[diff] || DIFF_CONFIG.medium;
  toast(`+${dc.xp} XP! 🪙${dc.coins}`);
  showCurrencyPop(dc.coins);
  const doneEl = id('hstat-done'); if (doneEl) doneEl.textContent = dailyQuests.filter(q => q.is_completed).length;

  try {
    await sb.from('daily_quests').update({ is_completed: true, completion_count: 1 }).eq('id', qid);
    const oldXP = profile.xp || 0;
    await giveXP(dc.xp, skillCat, profile.role || 'warrior');
    let energyBonus = 0;
for (const s of activeSummons) { for (const a of (s.abilities || [])) { if (a.type === 'energy_boost') energyBonus += (a.value || 0); } }
const newEnergy = Math.min(100, (profile.energy ?? 100) + 2 + energyBonus);
    await sb.from('profiles').update({ energy: newEnergy }).eq('id', user.id);
    profile.energy = newEnergy;
    await awardCurrency(0, dc.coins);
    await checkStreak(); await checkAchievements(); await rollQuestLoot();
    const tierChange = checkTierChange(oldXP, profile.xp || 0);
    if (tierChange) { await generateAdvancementQuests(tierChange.tier.name.toLowerCase()); checkAdvancementQuestsBanner(); }
    await growSummonBond(5);
  } catch(e) { console.error('Quest error:', e); }

  renderTopbar(); renderHeroCard(); checkDailyBonusAvailable();
  const total = dailyQuests.length, done2 = dailyQuests.filter(q => q.is_completed).length, pct = total > 0 ? Math.round((done2/total)*100) : 0;
  const pFill = id('q-progress-fill'), pText = id('q-progress-text');
  if (pFill) pFill.style.width = pct + '%';
  if (pText) pText.textContent = `${done2}/${total} done`;
};

window.completeSQ = async (sqId, done) => {
  if (done) { toast('Already done! ✅'); return; }
  const sq = systemQuests.find(q => q.id === sqId); if (!sq) return;
  const { data: ex } = await sb.from('user_system_quests').select('id').eq('user_id', user.id).eq('quest_id', sqId).single().catch(() => ({ data: null }));
  if (ex) await sb.from('user_system_quests').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', ex.id);
  else    await sb.from('user_system_quests').insert({ user_id: user.id, quest_id: sqId, is_completed: true, completed_at: new Date().toISOString() });
  await giveXP(sq.xp_reward, null, profile.role || 'warrior');
  await awardCurrency(0, 50);
  showCurrencyPop(50); toast(`👑 +${sq.xp_reward} XP! 🪙50`);
  await checkAchievements(); renderAll();
};

window.completeAdvancementQuest = async (aqId) => {
  const { data: aq } = await sb.from('advancement_quests').select('*').eq('id', aqId).single();
  if (!aq || aq.is_completed) { toast('Already completed!'); return; }
  await sb.from('advancement_quests').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', aqId);
  await giveXP(200, null, profile.role || 'warrior');
  await awardCurrency(0, 300);
  toast(`🏆 Advancement Quest Complete! +200 XP 🪙300`, 'gem');
  checkAdvancementQuestsBanner(); renderAll();
};

// ─── XP / ENERGY / CURRENCY ───────────────────
async function giveXP(amount, skillCat, role) {
  if (!profile) return;
  const mult  = getStreakMultiplier(profile.streak || 0);
  let   final = Math.round(amount * mult);
  if (role && skillCat && ROLES[role]?.bonus === skillCat) { final = Math.round(final * 1.2); setTimeout(() => toast(`${ROLES[role].icon} Class Bonus!`, 'gem'), 400); }
  for (const s of activeSummons) {
    for (const a of (s.abilities || [])) {
      if (a.type === 'xp_boost' && a.value > 0) final = Math.round(final * (1 + a.value / 100));
      else if (a.type === 'skill_xp_boost' && skillCat === a.skill && a.value > 0) final = Math.round(final * (1 + a.value / 100));
    }
  }
  const oldXP = profile.xp || 0, newXP = oldXP + final;
  await sb.from('profiles').update({ xp: newXP }).eq('id', user.id);
  profile.xp = newXP;
  const oldR = getRankInfo(oldXP), newR = getRankInfo(newXP);
  if (newR.tierIndex > oldR.tierIndex) setTimeout(() => toast(`👑 RANK UP! ${newR.fullName}!`, 'gem'), 700);
  if (skillCat && skillCat !== 'system' && skillCat !== 'period') {
    const sk = allSkills.find(s => s.skill_name === skillCat);
    if (sk) { const nSXP = (sk.skill_xp||0) + final, nSLV = Math.floor(nSXP/100) + 1; await sb.from('skills').update({ skill_xp: nSXP, skill_level: nSLV }).eq('id', sk.id); sk.skill_xp = nSXP; sk.skill_level = nSLV; }
  }
}

function getStreakMultiplier(streak) {
  if (streak >= 30) return 3.0; if (streak >= 15) return 2.5;
  if (streak >= 8)  return 2.0; if (streak >= 4)  return 1.5;
  return 1.0;
}

async function awardCurrency(gems, coins) {
  if (!profile) return;
  let finalCoins = coins;
  if (coins > 0) {
    for (const s of activeSummons) {
      for (const a of (s.abilities || [])) {
        if (a.type === 'coin_boost' && a.value > 0) finalCoins = Math.round(finalCoins * (1 + a.value / 100));
      }
    }
  }
  const ng = (profile.gems||0) + gems, nc = (profile.coins||0) + finalCoins;
  await sb.from('profiles').update({ gems: ng, coins: nc }).eq('id', user.id);
  profile.gems = ng; profile.coins = nc;
}

async function checkStreak() {
  if (!profile || profile.last_active === getToday()) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const missedDays = profile.last_active !== yesterday && profile.last_active !== getToday();
  let newStreak = profile.last_active === yesterday ? (profile.streak||0) + 1 : 1;
  const hasSummonGuard = activeSummons.some(s => (s.abilities||[]).some(a => a.type === 'streak_shield'));
  if (missedDays && hasSummonGuard) {
    newStreak = profile.streak || 0;
    toast('🛡️ Your summon protected your streak!', 'green');
  } else if (missedDays && profile.streak_shields > 0) {
    newStreak = profile.streak || 0;
    await sb.from('profiles').update({ streak_shields: (profile.streak_shields||1) - 1 }).eq('id', user.id);
    profile.streak_shields = Math.max(0, (profile.streak_shields||1) - 1);
    toast('🛡️ Streak Shield activated!', 'green');
  }
  profile.streak = newStreak; profile.last_active = getToday();
  await sb.from('profiles').update({ streak: newStreak, last_active: getToday() }).eq('id', user.id);
}

async function checkPenalties() {
  if (!profile) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  try {
    const { data: existing } = await sb.from('penalty_log').select('id').eq('user_id', user.id).eq('penalty_date', yesterday).single();
    if (existing) return;
    const { data: missed } = await sb.from('daily_quests').select('id').eq('user_id', user.id).eq('quest_date', yesterday).eq('quest_type', 'habit').eq('is_completed', false);
    const missedCount = (missed || []).length; if (!missedCount) return;
    const energyLost = missedCount * 5;
    const newEnergy  = Math.max(0, (profile.energy ?? 100) - energyLost);
    await sb.from('profiles').update({ energy: newEnergy }).eq('id', user.id);
    profile.energy = newEnergy;
    await sb.from('penalty_log').insert({ user_id: user.id, penalty_date: yesterday, missed_habits: missedCount, motivation_lost: energyLost });
    setTimeout(() => toast(`⚠️ ${missedCount} habits missed. -${energyLost} Energy.`, 'red'), 1500);
    reduceBondForMissedDays(1);
  } catch(e) {}
}

async function reduceBondForMissedDays(days) { const loss = days === 1 ? 10 : days === 2 ? 25 : 50; await growSummonBond(-loss); }

// ─── ADVANCEMENT QUESTS ───────────────────────
async function generateAdvancementQuests(tierName) {
  const { data: existing } = await sb.from('advancement_quests').select('id').eq('user_id', user.id).eq('rank_tier', tierName).limit(1);
  if (existing && existing.length > 0) return;
  const rs = getRankInfo(profile.xp || 0), role = getRoleInfo(profile.role || 'warrior');
  const struggle = profile.struggle || 'general improvement';
  try {
    const text = await callAI([{ role: 'user', content:
      `Generate 3 advancement quests for a player who just reached ${cap(tierName)} rank in a self-improvement RPG.
Class: ${role.name}. Main struggle: ${struggle}. Rank reached: ${rs.fullName}.
Make them challenging but achievable in 1 week.
Return ONLY a JSON array with 3 objects, each having: title (action-focused, max 10 words), description (1 motivating sentence).
No preamble, no markdown, just the JSON array.`
    }]);
    const match = text.match(/\[[\s\S]*\]/);
    const quests = match ? JSON.parse(match[0]).slice(0, 3) : null;
    if (!quests) throw new Error('No quests');
    await sb.from('advancement_quests').insert(quests.map(q => ({
      user_id: user.id, title: q.title, description: q.description || '',
      rank_tier: tierName, is_completed: false
    })));
    setTimeout(() => toast(`⚔️ Advancement Quests unlocked for ${cap(tierName)}!`, 'gem'), 1000);
  } catch(e) {
    // Fallback if AI fails
    await sb.from('advancement_quests').insert([
      { user_id: user.id, title: 'Complete 7 consecutive days of daily habits', rank_tier: tierName, is_completed: false },
      { user_id: user.id, title: 'Write 3 journal entries reflecting on your growth', rank_tier: tierName, is_completed: false },
      { user_id: user.id, title: `Earn 1000 XP from your ${role.name} class skill`, rank_tier: tierName, is_completed: false }
    ]);
    setTimeout(() => toast(`⚔️ Advancement Quests unlocked for ${cap(tierName)}!`, 'gem'), 1000);
  }
}

// ─── ACHIEVEMENTS ─────────────────────────────
async function checkAchievements() {
  if (!profile) return;
  try {
    const [{ data: allDone }, { data: allAch }, { data: earned }] = await Promise.all([
      sb.from('daily_quests').select('id').eq('user_id', user.id).eq('is_completed', true),
      sb.from('achievements').select('*').eq('is_active', true),
      sb.from('user_achievements').select('achievement_id').eq('user_id', user.id)
    ]);
    const earnedIds = (earned || []).map(e => e.achievement_id);
    const totalDone = (allDone || []).length, streak = profile.streak || 0;
    const rs = getRankInfo(profile.xp || 0);
    for (const ach of (allAch || [])) {
      if (earnedIds.includes(ach.id)) continue;
      let q = false;
      if      (ach.requirement_type === 'quests_done')   q = totalDone >= ach.requirement_value;
      else if (ach.requirement_type === 'streak_days')   q = streak    >= ach.requirement_value;
      else if (ach.requirement_type === 'rank_reached')  q = rs.stageIndex >= ach.requirement_value;
      if (q) {
        await sb.from('user_achievements').insert({ user_id: user.id, achievement_id: ach.id });
        await awardCurrency(0, ach.coins_reward || 0);
        if (ach.xp_reward > 0) await giveXP(ach.xp_reward, null, profile.role);
        setTimeout(() => toast(`🏆 ${ach.title}! +🪙${ach.coins_reward || 0}`, 'gem'), 300);
      }
    }
  } catch(e) {}
}

// ─── PERIOD PHASE ─────────────────────────────
async function checkPeriodPhase() {
  if (profile?.gender !== 'female' || !profile?.is_female_mode) return;
  const phase = await getCurrentPhase(); if (!phase) return;
  const info = PERIOD_PHASES[phase];
  const pSection = id('period-phase-section'), pCard = id('period-phase-card');
  if (!pSection || !pCard) return;
  show('period-phase-section');
  try {
    const { data: lp } = await sb.from('period_tracking').select('*').eq('user_id', user.id).order('period_start', { ascending: false }).limit(1).single();
    const dayNum = lp ? Math.floor((new Date() - new Date(lp.period_start + 'T00:00:00')) / 86400000) + 1 : 1;
    const pct = Math.min(100, Math.round((dayNum / 28) * 100));
    pCard.innerHTML = `<div class="phase-card">
      <div class="phase-header">
        <div class="phase-icon">${info.icon}</div>
        <div>
          <div class="phase-name" style="color:${info.color}">${info.name}</div>
          <div class="phase-desc">${info.desc}</div>
          <div class="phase-days">Day ${dayNum} of cycle • ${info.days}</div>
        </div>
      </div>
      <div class="phase-bar"><div class="phase-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${info.color},var(--accent2))"></div></div>
      <div style="font-size:12px;color:var(--text2);background:rgba(255,255,255,.04);border-radius:10px;padding:10px;border:1px solid rgba(255,255,255,.06)">💡 ${info.tip}</div>
    </div>`;
  } catch(e) {}
}

// ─── FEMALE MODE ──────────────────────────────
window.toggleFemale = async () => {
  const btn = id('female-toggle'), isOn = !btn.classList.contains('on');
  btn.classList.toggle('on', isOn); profile.is_female_mode = isOn;
  if (isOn) { show('female-section'); const pqf = id('period-quest-filter'); if(pqf) pqf.style.display = ''; }
  else       { hide('female-section'); const pqf = id('period-quest-filter'); if(pqf) pqf.style.display = 'none'; }
  await sb.from('profiles').update({ is_female_mode: isOn }).eq('id', user.id);
  if (isOn) { loadPeriodHistory(); checkPeriodPhase(); }
  toast(isOn ? 'Period tracking on 🌸' : 'Period tracking off', 'green');
};

window.logPeriod = async () => {
  const start = val('period-start'), end = val('period-end');
  if (!start) { toast('Enter start date ⚠️', 'red'); return; }
  await sb.from('period_tracking').insert({ user_id: user.id, period_start: start, period_end: end || null });
  toast('Period logged 🌸', 'green');
  id('period-start').value = ''; id('period-end').value = '';
  loadPeriodHistory(); checkPeriodPhase();
};

async function loadPeriodHistory() {
  const { data } = await sb.from('period_tracking').select('*').eq('user_id', user.id).order('period_start', { ascending: false }).limit(5);
  const el = id('period-history'); if (!el) return;
  if (!data?.length) { el.innerHTML = '<div style="font-size:12px;color:#444;margin-top:8px">No entries yet</div>'; return; }
  el.innerHTML = data.map(p => `<div style="background:var(--bg3);border:1px solid rgba(236,72,153,.15);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--text2);margin-top:8px">🌸 ${p.period_start}${p.period_end ? ' → ' + p.period_end : ''}</div>`).join('');
}

// ─── ADD QUEST ────────────────────────────────
window.openAddQuest = () => { const d = id('nq-date'); if(d) d.value = getToday(); show('add-quest-modal'); };

window.addQuest = async () => {
  const title = val('nq-title'), type = val('nq-type'), diff = val('nq-difficulty') || 'medium', skill = val('nq-skill');
  const schedDate = val('nq-date') || getToday(), schedTime = document.getElementById('nq-time')?.value || null;
  if (!title) { toast('Enter a title! ⚠️', 'red'); return; }
  const dc = DIFF_CONFIG[diff] || DIFF_CONFIG.medium;
  const { data } = await sb.from('daily_quests').insert({
    user_id: user.id, title, quest_type: type, skill_category: skill,
    xp_reward: dc.xp, quest_date: schedDate, is_completed: false,
    difficulty: diff, scheduled_time: schedTime, is_recurring: type === 'habit'
  }).select().single();
  if (data && schedDate === getToday()) dailyQuests.push(data);
  closeModal('add-quest-modal');
  const nt = id('nq-title'); if(nt) nt.value = '';
  toast(schedDate === getToday() ? 'Quest created! 🎯' : `Scheduled for ${schedDate}! 🗓️`, 'green');
  renderAll();
};

window.filterQ = (f, btn) => {
  qFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderQuestsTab();
};

// ─── ROLE SELECTION ───────────────────────────
window.openRoleModal = () => {
  id('role-grid').innerHTML = Object.entries(ROLES).map(([key, r]) =>
    `<div style="background:var(--bg3);border:2px solid ${key===selectedRole?r.color+'66':'var(--border)'};border-radius:16px;padding:16px;text-align:center;cursor:pointer;transition:all .2s${key===selectedRole?';background:rgba(168,85,247,.08)':''}" onclick="pickRole('${key}')">
      <div style="font-size:28px;margin-bottom:6px">${r.icon}</div>
      <div style="font-family:'Orbitron',monospace;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">${r.name}</div>
      <div style="font-size:11px;color:var(--text2)">${r.desc}</div>
      ${key===selectedRole?`<div style="color:var(--accent2);font-size:14px;font-weight:700;margin-top:6px">✓</div>`:''}
    </div>`
  ).join('');
  show('role-modal');
};

window.pickRole = (key) => { selectedRole = key; window.openRoleModal(); };

window.saveRole = async () => {
  await sb.from('profiles').update({ role: selectedRole }).eq('id', user.id);
  profile.role = selectedRole;
  closeModal('role-modal');
  toast(`${getRoleInfo(selectedRole).icon} ${getRoleInfo(selectedRole).name} chosen!`, 'green');
  renderAll();
};

// ─── NAME CHANGE ──────────────────────────────
window.openNameChange = () => {
  const count = profile.name_change_count || 0;
  id('name-change-error').textContent = '';
  id('name-change-count').textContent = `${count} / 2`;
  id('name-change-coins').textContent = `🪙 ${profile.coins || 0}`;
  show('name-modal');
};

window.executeNameChange = async () => {
  const newName = val('new-username'), errEl = id('name-change-error');
  errEl.textContent = '';
  if (!newName)             { errEl.textContent = '⚠️ Enter a username'; return; }
  if (newName.length < 3)   { errEl.textContent = '⚠️ Must be 3+ characters'; return; }
  const now = new Date(), resetDate = profile.name_change_reset_date;
  let count = profile.name_change_count || 0;
  if (!resetDate || new Date(resetDate).getMonth() !== now.getMonth()) count = 0;
  if (count >= 2)            { errEl.textContent = '❌ Limit reached (2/month)'; return; }
  if ((profile.coins||0) < 650) { errEl.textContent = '❌ Need 🪙 650'; return; }
  try { await sb.from('name_changes').insert({ user_id: user.id, old_name: profile.username, new_name: newName, coins_spent: 650 }); } catch(e) {}
  const nc = (profile.coins || 0) - 650;
  await sb.from('profiles').update({ username: newName, coins: nc, name_change_count: count + 1, name_change_reset_date: getToday() }).eq('id', user.id);
  profile.username = newName; profile.coins = nc; profile.name_change_count = count + 1;
  closeModal('name-modal');
  toast(`✅ Name changed to ${newName}!`, 'green');
  renderAll();
};

// ─── LOOT BOX ─────────────────────────────────
function rollLootTable() {
  let roll = Math.random() * 100, cum = 0;
  for (const item of LOOT_TABLE) { cum += item.chance; if (roll < cum) return item; }
  return LOOT_TABLE[0];
}

async function openLootBox() {
  const reward = rollLootTable(), value = reward.getValue();
  if      (reward.type === 'coins')  { await awardCurrency(0, value); }
  else if (reward.type === 'xp')     { await giveXP(value, null, profile.role || 'warrior'); }
  else if (reward.type === 'shards') {
    const ns = (profile.summon_shards || 0) + value;
    await sb.from('profiles').update({ summon_shards: ns }).eq('id', user.id);
    profile.summon_shards = ns; checkShardsToTicket();
  } else if (reward.type === 'shield') {
    const shields = (profile.streak_shields || 0) + 1;
    await sb.from('profiles').update({ streak_shields: shields }).eq('id', user.id);
    profile.streak_shields = shields;
  }
  await sb.from('loot_box_history').insert({ user_id: user.id, reward_type: reward.type, reward_value: value, reward_label: reward.label }).catch(() => {});
  const icon = id('loot-reward-icon'), label = id('loot-reward-label'), valEl = id('loot-reward-value');
  if (icon)  icon.textContent  = reward.icon;
  if (label) label.textContent = reward.label;
  if (valEl) valEl.textContent = reward.type === 'shield' ? 'SHIELD ACTIVATED' : '+' + value;
  show('loot-box-overlay');
}

window.closeLootBox = () => { hide('loot-box-overlay'); renderAll(); };
async function rollQuestLoot() { if (Math.random() < 0.25) await openLootBox(); }

function checkShardsToTicket() {
  const shards = profile.summon_shards || 0;
  if (shards >= 5) {
    const tickets = Math.floor(shards / 5), remaining = shards % 5;
    const newTickets = (profile.summon_tickets || 0) + tickets;
    sb.from('profiles').update({ summon_shards: remaining, summon_tickets: newTickets }).eq('id', user.id);
    profile.summon_shards = remaining; profile.summon_tickets = newTickets;
    toast(`🎫 ${tickets} Summon Ticket${tickets > 1 ? 's' : ''} earned!`, 'gem');
  }
}

// ─── LOGIN REWARDS ────────────────────────────
async function checkLoginReward() {
  if (!profile || profile.last_login_date === getToday()) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const loginStreak = profile.last_login_date === yesterday ? (profile.login_streak_count || 0) + 1 : 1;
  const dayInCycle  = ((loginStreak - 1) % 7) + 1;
  await sb.from('profiles').update({ last_login_date: getToday(), login_streak_count: loginStreak }).eq('id', user.id);
  profile.last_login_date = getToday(); profile.login_streak_count = loginStreak;
  const { data: reward } = await sb.from('login_rewards').select('*').eq('day', dayInCycle).single().catch(() => ({ data: null }));
  if (!reward) return;
  if      (reward.reward_type === 'coins')  { await awardCurrency(0, reward.reward_value); }
  else if (reward.reward_type === 'xp')     { await giveXP(reward.reward_value, null, profile.role || 'warrior'); }
  else if (reward.reward_type === 'shards') {
    const ns = (profile.summon_shards || 0) + reward.reward_value;
    await sb.from('profiles').update({ summon_shards: ns }).eq('id', user.id);
    profile.summon_shards = ns; checkShardsToTicket();
  } else if (reward.reward_type === 'ticket') {
    const nt = (profile.summon_tickets || 0) + 1, nc = (profile.coins || 0) + 300;
    await sb.from('profiles').update({ summon_tickets: nt, coins: nc }).eq('id', user.id);
    profile.summon_tickets = nt; profile.coins = nc;
  }
  showLoginRewardModal(dayInCycle, reward, loginStreak);
}

function showLoginRewardModal(day, reward, streak) {
  const el = id('login-reward-content'); if (!el) return;
  const icons = { coins:'🪙', xp:'⚡', shards:'🔮', ticket:'🎫' };
  el.innerHTML = `
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:48px;margin-bottom:12px;animation:rewardBounce .6s cubic-bezier(.4,0,.2,1)">${icons[reward.reward_type]||'🎁'}</div>
      <div style="font-family:'Orbitron',monospace;font-size:20px;font-weight:900;color:var(--gold);margin-bottom:6px">${reward.description}</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:20px">Day ${day} Login Reward${day===7?' 🎉 Week Complete!':''}</div>
      <div class="login-reward-days">
        ${[1,2,3,4,5,6,7].map(d => `<div class="lr-day ${d<day?'claimed':''} ${d===day?'getToday()':''}"><div class="lr-day-num">D${d}</div><div class="lr-day-icon">${d===7?'🎫':d===3||d===6?'🔮':'🎁'}</div></div>`).join('')}
      </div>
      <div style="font-size:12px;color:var(--text3)">Login Streak: ${streak} days</div>
    </div>
    <button class="btn-primary" onclick="closeModal('login-reward-modal')">COLLECT</button>`;
  show('login-reward-modal');
}

// ─── NOTIFICATIONS ────────────────────────────
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { scheduleLocalReminder(); return; }
  if (Notification.permission !== 'denied') {
    const p = await Notification.requestPermission();
    if (p === 'granted') {
      scheduleLocalReminder();
      const nt = id('notif-toggle'); if (nt) { nt.classList.add('on'); show('reminder-time-wrap'); }
    }
  }
}
function scheduleLocalReminder() { if (profile?.reminder_time) scheduleReminderNotification(profile.reminder_time); }
function scheduleReminderNotification(time) {
  const [h, m] = (time || '08:00').split(':').map(Number);
  const now = new Date(), rt = new Date(); rt.setHours(h, m, 0, 0);
  if (rt <= now) rt.setDate(rt.getDate() + 1);
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      const pending = dailyQuests.filter(q => !q.is_completed).length;
      if (pending > 0) new Notification('⚡ LevelUp Life', { body: `${pending} quests waiting! Keep your streak! 🔥`, icon: './icon.png' });
    }
    scheduleReminderNotification(time);
  }, rt.getTime() - now.getTime());
}
window.toggleNotifications = async () => {
  const btn = id('notif-toggle'), isOn = !btn.classList.contains('on');
  if (isOn) { await requestNotificationPermission(); btn.classList.add('on'); show('reminder-time-wrap'); }
  else { btn.classList.remove('on'); hide('reminder-time-wrap'); }
};
window.saveReminderTime = async (time) => {
  await sb.from('profiles').update({ reminder_time: time }).eq('id', user.id).catch(() => {});
  profile.reminder_time = time; scheduleReminderNotification(time);
  toast('⏰ Reminder set for ' + time, 'green');
};

// ─── AVATAR & BACKGROUND ──────────────────────
window.uploadAvatar = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  toast('Uploading...', 'green');
  const ext = file.name.split('.').pop(), path = `${user.id}/avatar.${ext}`;
  const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) { toast('Upload failed: ' + error.message, 'red'); return; }
  const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
  const url = publicUrl + '?t=' + Date.now();
  await sb.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  profile.avatar_url = url;
  toast('Avatar updated! 🎉', 'green'); renderAll();
};

window.uploadBgImage = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  toast('Uploading...', 'green');
  const ext = file.name.split('.').pop(), path = `${user.id}/bg.${ext}`;
  const { error } = await sb.storage.from('backgrounds').upload(path, file, { upsert: true });
  if (error) { toast('Failed: ' + error.message, 'red'); return; }
  const { data: { publicUrl } } = sb.storage.from('backgrounds').getPublicUrl(path);
  const url = publicUrl + '?t=' + Date.now();
  await sb.from('profiles').update({ bg_image_url: url }).eq('id', user.id);
  profile.bg_image_url = url; applyBgImage(url);
  toast('Background updated! 🎉', 'green');
};

function applyBgImage(url) {
  if (!url) return;
  const style = `url('${url}') center/cover no-repeat`;
  document.querySelector('.hero-bg')?.style.setProperty('background', style);
  document.querySelector('.profile-bg')?.style.setProperty('background', style);
}

window.openBgPicker = () => {
  id('color-grid').innerHTML = BG_COLORS.map(c =>
    `<div class="color-swatch ${c===selectedBg?'selected':''}" style="background:${c}" onclick="pickBg('${c}',this)"></div>`
  ).join('');
  show('bg-modal');
};
window.pickBg = (c, el) => { selectedBg = c; document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected')); el.classList.add('selected'); };
window.saveBg = async () => {
  await sb.from('profiles').update({ namecard_bg: selectedBg }).eq('id', user.id);
  profile.namecard_bg = selectedBg;
  closeModal('bg-modal'); toast('Background saved! 🎨', 'green'); renderAll();
};

// ─── EXPORT DATA ──────────────────────────────
async function exportAccountData() {
  toast('📦 Preparing backup...', 'green');
  const [a, b, c, d, e, f] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('daily_quests').select('*').eq('user_id', user.id).order('quest_date', { ascending: false }),
    sb.from('journal_entries').select('*').eq('user_id', user.id).eq('is_deleted', false).order('entry_date', { ascending: false }),
    sb.from('user_achievements').select('*,achievements(*)').eq('user_id', user.id),
    sb.from('skills').select('*').eq('user_id', user.id),
    sb.from('advancement_quests').select('*').eq('user_id', user.id)
  ]);
  const rs = getRankInfo(a.data?.xp || 0);
  const backup = {
    exported_at: new Date().toISOString(), app: 'LevelUp Life', version: '3.0',
    profile: a.data,
    stats: { total_xp: a.data?.xp||0, rank: rs.fullName, streak: a.data?.streak||0, energy: a.data?.energy||100, coins: a.data?.coins||0, gems: a.data?.gems||0 },
    quests: { total: (b.data||[]).length, completed: (b.data||[]).filter(q => q.is_completed).length },
    journals: (c.data||[]).map(j => ({ date: j.entry_date, title: j.title, mood: j.mood, content: j.content })),
    achievements: (d.data||[]).map(a => ({ title: a.achievements?.title, earned_at: a.earned_at })),
    skills: e.data || [],
    advancement_quests: f.data || []
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), a2 = document.createElement('a');
  a2.href = url; a2.download = `levelup-backup-${getToday()}.json`; a2.click();
  URL.revokeObjectURL(url);
  toast('✅ Backup downloaded!', 'green');
}

// ─── NAVIGATION ───────────────────────────────
window.showTab = async (tab) => {
  document.querySelectorAll('.tab-content').forEach(t => { t.classList.add('hidden'); t.classList.remove('active'); });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const tabEl = id('tab-' + tab); if (tabEl) { tabEl.classList.remove('hidden'); tabEl.classList.add('active'); }
  const navBtn = id('nav-' + tab); if (navBtn) navBtn.classList.add('active');
  if (tab === 'admin')     await renderAdmin();
  if (tab === 'quests')    await renderQuestsTab();
  if (tab === 'journal')   { renderDateDisplay(); await renderJournal(); }
  if (tab === 'me')        renderMeTab();
  if (tab === 'dashboard') { renderDateDisplay(); checkPeriodPhase(); checkDailyBonusAvailable(); checkAdvancementQuestsBanner(); }
};

// ─── ONBOARDING ───────────────────────────────
let selectedStruggle = null, obGeneratedQuests = [], obStarterPet = null;

window.selectStruggle = (struggle, el) => {
  selectedStruggle = struggle;
  document.querySelectorAll('.struggle-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  const btn = id('ob-next-1'); if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
};

window.obStep1Continue = async () => {
  if (!selectedStruggle) return;
  obShowStep(2);
  await generateObQuests();
};

async function generateObQuests() {
  const config = STRUGGLE_CONFIG[selectedStruggle];
  try {
    const text = await callAI([{ role: 'user', content:
      `Generate exactly 3 starter quests for someone who struggles with: ${config.label}.
Return ONLY a JSON array with 3 objects, each having: title (short action, max 8 words), difficulty (easy/medium/hard).
No explanations, no markdown, just the JSON array.`
    }]);
    const match = text.match(/\[[\s\S]*\]/);
    obGeneratedQuests = match ? JSON.parse(match[0]).slice(0, 3) : config.quests;
  } catch(e) {
    obGeneratedQuests = config.quests;
  }
  obShowStep(3);
  renderObQuests();
}

function renderObQuests() {
  const el = id('ob-quests-list'); if (!el) return;
  el.innerHTML = obGeneratedQuests.map((q, i) => {
    const diff = q.difficulty || q.diff || 'easy';
    const xp = DIFF_CONFIG[diff]?.xp || 50;
    return `<div class="ob-quest-preview">
      <div class="ob-quest-num">QUEST ${i + 1}</div>
      <div class="ob-quest-title">${q.title}</div>
      <div class="ob-quest-xp">+${xp} XP • ${cap(diff)}</div>
    </div>`;
  }).join('');
}

window.obStep3Continue = async () => { obShowStep(4); await loadObPet(); };

async function loadObPet() {
  const config = STRUGGLE_CONFIG[selectedStruggle];
  const res = await sb.from('shop_summons').select('*').eq('name', config.petName).single().catch(() => ({ data: null }));
  obStarterPet = res.data;
  const el = id('ob-pet-display'); if (!el) return;
  const icons = { Nova: '🦊', Blaze: '🐺', Sage: '🦉' };
  if (obStarterPet?.image_url) {
    el.innerHTML = `<img class="ob-pet-img" src="${obStarterPet.image_url}"/><div class="ob-pet-name">${obStarterPet.name}</div><div class="ob-pet-desc">${obStarterPet.description||''}</div>`;
  } else {
    el.innerHTML = `<div class="ob-pet-placeholder">${icons[config.petName]||'🔮'}</div><div class="ob-pet-name">${config.petName}</div><div class="ob-pet-desc">Your starter companion. Keep them happy.</div>`;
  }
}

window.obStep4Continue = () => obShowStep(5);

window.obFinish = async () => {
  const btn = document.querySelector('#ob-step-5 .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'LOADING...'; }
  await saveOnboarding();
  hide('onboarding-screen');
  await generateDailyQuests(); await loadAllData(); showMainApp();
};

async function saveOnboarding() {
  await sb.from('profiles').update({ struggle: selectedStruggle, onboarding_complete: true }).eq('id', user.id);
  profile.struggle = selectedStruggle; profile.onboarding_complete = true;
  if (obGeneratedQuests.length > 0) {
    await sb.from('daily_quests').insert(obGeneratedQuests.map(q => {
      const diff = q.difficulty || q.diff || 'easy';
      const dc = DIFF_CONFIG[diff] || DIFF_CONFIG.easy;
      return { user_id: user.id, title: q.title, quest_type: 'habit', skill_category: 'discipline', xp_reward: dc.xp, quest_date: getToday(), is_completed: false, difficulty: diff, is_recurring: true };
    }));
  }
  if (obStarterPet) {
    await sb.from('summons').insert({
      user_id: user.id, name: obStarterPet.name, class: obStarterPet.class, race: obStarterPet.race,
      rank: obStarterPet.rarity ? cap(obStarterPet.rarity) : 'Common', description: obStarterPet.description, image_url: obStarterPet.image_url,
      special_effect: obStarterPet.special_effect, has_frame: obStarterPet.has_frame || false, frame_class: obStarterPet.frame_class,
      abilities: obStarterPet.abilities || [],
      bond_level: 1, bond_xp: 500, is_active: true, obtained_from: 'starter', shop_summon_id: obStarterPet.id
    });
  }
}

function obShowStep(step) {
  for (let i = 1; i <= 5; i++) {
    id('ob-step-' + i)?.classList.toggle('hidden', i !== step);
    const dot = id('ob-dot-' + i);
    if (dot) { dot.classList.remove('active', 'done'); if (i < step) dot.classList.add('done'); else if (i === step) dot.classList.add('active'); }
  }
  document.querySelector('.ob-container')?.scrollTo(0, 0);
}

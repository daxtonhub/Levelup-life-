// ══════════════════════════════════
// LEVEL / ROLE HELPERS
// ══════════════════════════════════
function getLevel(xp) {
  var l = 1;
  for (var i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) { l = i + 1; break; }
  }
  return l;
}
function getTitle(l)  { return LEVELS[Math.min(l - 1, LEVELS.length - 1)].title; }
function getMinXP(l)  { return LEVELS[Math.min(l - 1, LEVELS.length - 1)].min; }
function getNextXP(l) { return LEVELS[Math.min(l, LEVELS.length - 1)].min; }
function getRoleInfo(role) { return ROLES[role] || ROLES.warrior; }

// ══════════════════════════════════
// DATE DISPLAY
// ══════════════════════════════════
function renderDateDisplay() {
  var now = new Date();
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var dateStr = now.getDate() + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
  var dayName = days[now.getDay()];
  if (id('home-date')) id('home-date').textContent = '📅 ' + dateStr;
  if (id('home-day'))  id('home-day').textContent  = dayName;
  if (id('journal-date'))    id('journal-date').textContent    = dateStr;
  if (id('journal-dayname')) id('journal-dayname').textContent = dayName;
}

// ══════════════════════════════════
// PERIOD PHASE
// ══════════════════════════════════
async function checkPeriodPhase() {
  if (profile?.gender !== 'female' || !profile?.is_female_mode) return;
  var phase = await getCurrentPhase();
  if (!phase) return;
  var phaseInfo = PERIOD_PHASES[phase];
  var pSection = id('period-phase-section');
  var pCard    = id('period-phase-card');
  if (!pSection || !pCard) return;
  show('period-phase-section');
  try {
    var lp = (await sb.from('period_tracking').select('*').eq('user_id', user.id).order('period_start', { ascending: false }).limit(1).single()).data;
    var dayNum = 1;
    if (lp) {
      var start = new Date(lp.period_start + 'T00:00:00');
      dayNum = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24)) + 1;
    }
    var pct = Math.min(100, Math.round((dayNum / 28) * 100));
    pCard.innerHTML = '<div class="phase-card"><div class="phase-header"><div class="phase-icon">' + phaseInfo.icon + '</div><div><div class="phase-name" style="color:' + phaseInfo.color + '">' + phaseInfo.name + '</div><div class="phase-desc">' + phaseInfo.desc + '</div><div class="phase-days">Day ' + dayNum + ' of cycle • ' + phaseInfo.days + '</div></div></div><div class="phase-bar"><div class="phase-bar-fill" style="width:' + pct + '%;background:linear-gradient(90deg,' + phaseInfo.color + ',var(--accent2))"></div></div><div style="font-size:12px;color:var(--text2);background:rgba(255,255,255,.04);border-radius:10px;padding:10px;border:1px solid rgba(255,255,255,.06)">💡 ' + phaseInfo.tip + '</div></div>';
  } catch (e) {}
}

// ══════════════════════════════════
// RENDER ALL
// ══════════════════════════════════
function renderAll() {
  renderTopbar();
  renderHeroCard();
  renderDashQuests();
  renderDashSystem();
  renderSkills();
  renderQuestsTab();
  renderMeTab();
}

// ══════════════════════════════════
// TOPBAR
// ══════════════════════════════════
function renderTopbar() {
  if (!profile) return;
  var xp = profile.xp || 0;
  var rs = getRankStage(xp);
  id('topbar-name').textContent  = profile.username || 'Hero';
  id('topbar-level').textContent = rs.icon + ' ' + rs.fullName;
  id('topbar-coins').textContent = '🪙 ' + (profile.coins || 0);
  id('topbar-xp').textContent    = xp + ' XP';
  if (profile.avatar_url) id('topbar-avatar').innerHTML = '<img src="' + profile.avatar_url + '"/>';
}

// ══════════════════════════════════
// HERO CARD
// ══════════════════════════════════
function renderHeroCard() {
  if (!profile) return;
  var xp     = profile.xp || 0;
  var level  = getLevel(xp);
  var curMin = getMinXP(level);
  var nextMin= getNextXP(level);
  var pct    = level >= 10 ? 100 : Math.round(((xp - curMin) / (nextMin - curMin)) * 100);
  var role   = getRoleInfo(profile.role || 'warrior');
  var rs     = getRankStage(xp);

  id('hero-name').textContent = profile.username || 'Hero';
  id('hero-role').style.color = role.color;
  id('hero-role').textContent = role.icon + ' ' + role.name;
  id('hero-badge').textContent = rs.stage;
  id('xp-fill').style.width   = pct + '%';
  id('xp-nums').textContent   = xp + ' / ' + nextMin;
  id('hstat-streak').textContent = profile.streak  || 0;
  id('hstat-energy').textContent = profile.energy  || 100;
  id('hstat-done').textContent   = dailyQuests.filter(function(q){ return q.is_completed; }).length;
  id('dash-gems').textContent  = profile.gems  || 0;
  id('dash-coins').textContent = profile.coins || 0;

  if (profile.avatar_url) id('hero-avatar').innerHTML = '<img src="' + profile.avatar_url + '"/>';
  if (profile.bg_image_url) applyBgImage(profile.bg_image_url);
  else if (profile.namecard_bg) document.querySelector('.hero-bg').style.background = 'linear-gradient(135deg,' + profile.namecard_bg + ' 0%,#0a0a1a 100%)';
  applyFrame();
}

// ══════════════════════════════════
// DAILY BONUS
// ══════════════════════════════════
function checkDailyBonusAvailable() {
  var total = dailyQuests.length; if (!total) return;
  var done  = dailyQuests.filter(function(q){ return q.is_completed; }).length;
  if (done === total && profile?.daily_bonus_claimed !== today) show('bonus-banner-wrap');
  else hide('bonus-banner-wrap');
}

window.claimDailyBonus = async function() {
  if (profile?.daily_bonus_claimed === today) { toast('Already claimed! ✅'); return; }
  await giveXP(DAILY_BONUS_XP, null, profile.role || 'warrior');
  await awardCurrency(0, DAILY_BONUS_COINS);
  var newShards = (profile.summon_shards || 0) + 1;
  await sb.from('profiles').update({ daily_bonus_claimed: today, summon_shards: newShards }).eq('id', user.id);
  profile.daily_bonus_claimed = today;
  profile.summon_shards = newShards;
  hide('bonus-banner-wrap');
  toast('🎁 Bonus! +100XP +🪙100 +1 Shard!', 'gem');
  checkShardsToTicket();
  openLootBox();
  await checkAchievements();
  renderAll();
};

// ══════════════════════════════════
// DASH RENDERS
// ══════════════════════════════════
function renderDashQuests() {
  var el = id('dash-quests');
  if (!dailyQuests.length) { el.innerHTML = empty('✅', 'No quests today'); return; }
  el.innerHTML = dailyQuests.slice(0, 5).map(function(q){ return questCard(q); }).join('');
}

async function renderDashSystem() {
  var el = id('dash-system');
  if (!systemQuests.length) { el.innerHTML = empty('🎯', 'No system quests yet'); return; }
  var uSQ = (await sb.from('user_system_quests').select('*').eq('user_id', user.id)).data;
  var doneIds = (uSQ || []).filter(function(x){ return x.is_completed; }).map(function(x){ return x.quest_id; });
  el.innerHTML = systemQuests.map(function(q) {
    var subtype = q.quest_subtype || 'challenge';
    var stIcon  = subtype === 'habit' ? '🔁' : subtype === 'todo' ? '✅' : '👑';
    var stName  = subtype === 'habit' ? 'Daily Habit' : subtype === 'todo' ? 'Task' : 'Challenge';
    var dc = DIFF_CONFIG[q.difficulty || 'epic'];
    return '<div class="quest-card system-q ' + (doneIds.includes(q.id) ? 'done' : '') + '" onclick="completeSQ(\'' + q.id + '\',' + doneIds.includes(q.id) + ')"><div class="qcheck">' + (doneIds.includes(q.id) ? '✓' : stIcon) + '</div><div class="qinfo"><div class="qtitle">' + q.title + '</div><div class="qmeta">' + (SKILL_ICONS[q.skill_category] || '👑') + ' ' + stName + ' <span class="diff-badge ' + dc.cls + '">' + dc.icon + ' ' + dc.label + '</span></div></div><div class="qright"><div class="qxp">+' + q.xp_reward + ' XP</div></div></div>';
  }).join('');
}

function renderSkills() {
  var el = id('dash-skills');
  if (!allSkills.length) { el.innerHTML = empty('📚', 'No skills yet'); return; }
  var sorted = [...allSkills].sort(function(a, b){ return (b.skill_xp || 0) - (a.skill_xp || 0); });
  var perfMap = {}, badges = { gold: '🥇', silver: '🥈', bronze: '🥉' };
  if (sorted[0]) perfMap[sorted[0].id] = 'gold';
  if (sorted[1]) perfMap[sorted[1].id] = 'silver';
  if (sorted[2]) perfMap[sorted[2].id] = 'bronze';
  el.innerHTML = allSkills.map(function(s) {
    var perf = perfMap[s.id];
    return '<div class="skill-card ' + (perf ? 'perf-' + perf : '') + '">' + (perf ? '<div class="skill-top-badge">' + badges[perf] + '</div>' : '') + '<div class="skill-icon">' + (SKILL_ICONS[s.skill_name] || '⭐') + '</div><div class="skill-name">' + cap(s.skill_name) + '</div><div class="skill-lv">LV ' + s.skill_level + '</div><div class="skill-track"><div class="skill-fill" style="width:' + ((s.skill_xp || 0) % 100) + '%"></div></div></div>';
  }).join('');
}

// ══════════════════════════════════
// QUEST CARD TEMPLATE
// ══════════════════════════════════
function questCard(q) {
  var dc = DIFF_CONFIG[q.difficulty || 'spark'];
  return '<div class="quest-card ' + (q.is_completed ? 'done' : '') + ' ' + (q.quest_type === 'period' ? 'period-q' : '') + '" onclick="completeQuest(\'' + q.id + '\',\'' + q.skill_category + '\',' + q.is_completed + ',\'' + (q.difficulty || 'spark') + '\')"><div class="qcheck">' + (q.is_completed ? '✓' : '') + '</div><div class="qinfo"><div class="qtitle">' + q.title + '</div><div class="qmeta">' + (SKILL_ICONS[q.skill_category] || '⭐') + ' ' + q.skill_category + ' <span class="diff-badge ' + dc.cls + '">' + dc.icon + ' ' + dc.label + '</span></div></div><div class="qright"><div class="qxp">+' + q.xp_reward + ' XP</div><div style="font-size:10px;color:var(--text3)">🪙' + dc.coins + '</div></div></div>';
}

// ══════════════════════════════════
// XP + CURRENCY ENGINE
// ══════════════════════════════════
async function giveXP(amount, skillCat, role) {
  if (!profile) return;
  var mult  = getStreakMultiplier(profile.streak || 0);
  var final = Math.round(amount * mult);
  if (role && skillCat && ROLES[role] && ROLES[role].bonus === skillCat) {
    final = Math.round(final * 1.2);
    if (final > amount && mult === 1) setTimeout(function(){ toast(ROLES[role].icon + ' Class Bonus!', 'gem'); }, 400);
  }
  var rs    = getRankStage(profile.xp || 0);
  var newXP = (profile.xp || 0) + final;
  var newRs = getRankStage(newXP);
  await sb.from('profiles').update({ xp: newXP }).eq('id', user.id);
  profile.xp = newXP;
  if (newRs.id > rs.id) setTimeout(function(){ toast('🎉 RANK UP! ' + newRs.fullName + '!', 'gem'); }, 700);
  if (skillCat && skillCat !== 'system' && skillCat !== 'period') {
    var sk = allSkills.find(function(s){ return s.skill_name === skillCat; });
    if (sk) {
      var nSXP = (sk.skill_xp || 0) + final;
      var nSLV = Math.floor(nSXP / 100) + 1;
      await sb.from('skills').update({ skill_xp: nSXP, skill_level: nSLV }).eq('id', sk.id);
      sk.skill_xp = nSXP; sk.skill_level = nSLV;
    }
  }
  var newMot = Math.min(100, (profile.motivation || 100) + 2);
  await sb.from('profiles').update({ motivation: newMot }).eq('id', user.id);
  profile.motivation = newMot;
  applyFrame();
}

function getStreakMultiplier(streak) {
  if (streak >= 30) return 3.0;
  if (streak >= 15) return 2.5;
  if (streak >= 8)  return 2.0;
  if (streak >= 4)  return 1.5;
  return 1.0;
}

async function awardCurrency(gems, coins) {
  if (!profile) return;
  var ng = (profile.gems || 0) + gems, nc = (profile.coins || 0) + coins;
  await sb.from('profiles').update({ gems: ng, coins: nc }).eq('id', user.id);
  profile.gems = ng; profile.coins = nc;
}

function showCurrencyPop(coins) {
  if (!coins) return;
  var pop = document.createElement('div');
  pop.className = 'currency-pop';
  pop.style.cssText = 'left:' + (50 + Math.random() * 20 - 10) + '%;top:50%;';
  pop.textContent = '+🪙' + coins;
  document.body.appendChild(pop);
  setTimeout(function(){ pop.remove(); }, 900);
}

async function checkStreak() {
  if (!profile) return;
  if (profile.last_active === today) return;
  var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  var newStreak = profile.last_active === yesterday ? (profile.streak || 0) + 1 : 1;
  profile.streak = newStreak; profile.last_active = today;
  await sb.from('profiles').update({ streak: newStreak, last_active: today }).eq('id', user.id);
}

// ══════════════════════════════════
// PENALTY SYSTEM
// ══════════════════════════════════
async function checkPenalties() {
  if (!profile) return;
  var yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  try {
    var existing = (await sb.from('penalty_log').select('id').eq('user_id', user.id).eq('penalty_date', yesterday).single()).data;
    if (existing) return;
    var missed = (await sb.from('daily_quests').select('id').eq('user_id', user.id).eq('quest_date', yesterday).eq('quest_type', 'habit').eq('is_completed', false)).data;
    var missedCount = (missed || []).length;
    if (!missedCount) return;
    var motLost = missedCount * 5;
    var newMot  = Math.max(0, (profile.motivation || 100) - motLost);
    await sb.from('profiles').update({ motivation: newMot }).eq('id', user.id);
    profile.motivation = newMot;
    await sb.from('penalty_log').insert({ user_id: user.id, penalty_date: yesterday, missed_habits: missedCount, motivation_lost: motLost });
    await reduceBondForMissedDays(1);
    if (motLost > 0) setTimeout(function(){ toast('⚠️ ' + missedCount + ' habits missed. -' + motLost + ' motivation.', 'red'); }, 1500);
  } catch (e) {}
}

async function reduceBondForMissedDays(days) {
  var lossPerDay = days === 1 ? 10 : days === 2 ? 25 : 50;
  await growSummonBond(-lossPerDay);
}

async function startComebackSession() {
  try {
    var existing = (await sb.from('comeback_sessions').select('*').eq('user_id', user.id).eq('is_complete', false).single()).data;
    if (existing) return;
    await sb.from('comeback_sessions').insert({ user_id: user.id });
    await sb.from('daily_quests').insert([
      { user_id: user.id, title: 'Complete 1 small task right now', quest_type: 'todo', skill_category: 'mindset', xp_reward: 10, quest_date: today, is_completed: false, difficulty: 'easy' },
      { user_id: user.id, title: 'Drink a glass of water', quest_type: 'todo', skill_category: 'mindset', xp_reward: 10, quest_date: today, is_completed: false, difficulty: 'easy' },
      { user_id: user.id, title: 'Write one sentence in your journal', quest_type: 'todo', skill_category: 'mindset', xp_reward: 10, quest_date: today, is_completed: false, difficulty: 'easy' }
    ]);
    dailyQuests = [];
    await loadAllData();
    toast('🔄 Comeback quests added. Complete them to restore your pet!', 'green');
  } catch (e) {}
}

async function checkComebackProgress() {
  if (!profile?.comeback_active) return;
  try {
    var session = (await sb.from('comeback_sessions').select('*').eq('user_id', user.id).eq('is_complete', false).single()).data;
    if (!session) return;
    var completed = dailyQuests.filter(function(q){ return q.is_completed; }).length;
    if (completed >= 3) {
      await sb.from('comeback_sessions').update({ is_complete: true, completed_at: new Date().toISOString() }).eq('id', session.id);
      await sb.from('profiles').update({ comeback_active: false }).eq('id', user.id);
      profile.comeback_active = false;
      var ps = (await sb.from('player_summons').select('*').eq('user_id', user.id).eq('is_active', false).order('obtained_at', { ascending: false }).limit(1).single()).data;
      if (ps) {
        await sb.from('player_summons').update({ is_active: true, bond_xp: 200 }).eq('id', ps.id);
        await sb.from('profiles').update({ active_summon_id: ps.id }).eq('id', user.id);
        profile.active_summon_id = ps.id;
        var sm = (await sb.from('shop_summons').select('name').eq('id', ps.summon_id).single()).data;
        toast('🔮 ' + (sm ? sm.name : 'Your companion') + ' has returned!', 'gem');
      }
      renderAll();
    }
  } catch (e) {}
}

// ══════════════════════════════════
// ACHIEVEMENTS
// ══════════════════════════════════
async function checkAchievements() {
  if (!profile) return;
  try {
    var allDone = (await sb.from('daily_quests').select('id').eq('user_id', user.id).eq('is_completed', true)).data;
    var allAch  = (await sb.from('achievements').select('*').eq('is_active', true)).data;
    var earned  = (await sb.from('user_achievements').select('achievement_id').eq('user_id', user.id)).data;
    var earnedIds = (earned || []).map(function(e){ return e.achievement_id; });
    var totalDone = (allDone || []).length, streak = profile.streak || 0, level = getLevel(profile.xp || 0);
    for (var i = 0; i < (allAch || []).length; i++) {
      var ach = allAch[i];
      if (earnedIds.includes(ach.id)) continue;
      var q = false;
      if (ach.requirement_type === 'quests_done')   q = totalDone >= ach.requirement_value;
      else if (ach.requirement_type === 'streak_days')   q = streak    >= ach.requirement_value;
      else if (ach.requirement_type === 'level_reached') q = level     >= ach.requirement_value;
      if (q) {
        await sb.from('user_achievements').insert({ user_id: user.id, achievement_id: ach.id });
        await awardCurrency(0, (ach.coins_reward || 0) + (ach.gems_reward || 0));
        if (ach.xp_reward > 0) await giveXP(ach.xp_reward, null, profile.role);
        setTimeout(function(a){ return function(){ toast('🏆 ' + a.title + '! +🪙' + (a.coins_reward || 0), 'gem'); }; }(ach), 300);
      }
    }
  } catch (e) {}
}

async function renderGlory() {
  var el = id('achievements-list'); if (!el) return;
  try {
    var allAch = (await sb.from('achievements').select('*').eq('is_active', true)).data;
    var earned = (await sb.from('user_achievements').select('*').eq('user_id', user.id)).data;
    var earnedIds = (earned || []).map(function(e){ return e.achievement_id; });
    var glorySummary = id('glory-summary'), gloryGems = id('glory-gems'), gloryEarned = id('glory-earned');
    if (glorySummary) glorySummary.textContent = earnedIds.length + '/' + (allAch || []).length + ' unlocked';
    if (gloryGems)    gloryGems.textContent    = profile.gems || 0;
    if (gloryEarned)  gloryEarned.textContent  = earnedIds.length;
    if (!allAch || !allAch.length) { el.innerHTML = empty('🏆', 'No achievements yet'); return; }
    var sorted = [...(allAch || [])].sort(function(a, b){ return earnedIds.includes(b.id) - earnedIds.includes(a.id); });
    el.innerHTML = sorted.map(function(ach) {
      var isEarned = earnedIds.includes(ach.id);
      return '<div style="display:flex;align-items:center;gap:14px;background:var(--bg3);border:1px solid ' + (isEarned ? 'rgba(245,158,11,.4)' : 'var(--border)') + ';border-radius:16px;padding:14px;margin-bottom:10px;opacity:' + (isEarned ? '1' : '.4') + '"><div style="width:50px;height:50px;border-radius:14px;background:' + (isEarned ? 'rgba(245,158,11,.1)' : 'var(--bg)') + ';border:1px solid ' + (isEarned ? 'var(--gold)' : 'var(--border)') + ';display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">' + (ach.icon || '🏆') + '</div><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px">' + ach.title + '</div><div style="font-size:12px;color:var(--text2)">' + (ach.description || '') + '</div><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">' + (ach.coins_reward > 0 ? '<span style="font-size:10px;font-weight:700;color:var(--coin);border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.08);border-radius:5px;padding:2px 7px">🪙 ' + ach.coins_reward + '</span>' : '') + (ach.xp_reward > 0 ? '<span style="font-size:10px;font-weight:700;color:var(--accent2);border:1px solid rgba(168,85,247,.3);background:rgba(168,85,247,.08);border-radius:5px;padding:2px 7px">⚡ ' + ach.xp_reward + ' XP</span>' : '') + '</div></div>' + (isEarned ? '<div style="font-family:Orbitron,monospace;font-size:9px;color:var(--gold);background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:5px;padding:2px 7px;white-space:nowrap;flex-shrink:0">✓ EARNED</div>' : '<div style="font-size:20px;opacity:.4">🔒</div>') + '</div>';
    }).join('');
  } catch (e) {}
}

// ══════════════════════════════════
// LOOT / SHARDS
// ══════════════════════════════════
function checkShardsToTicket() {
  var shards = profile.summon_shards || 0;
  if (shards >= 5) {
    var tickets   = Math.floor(shards / 5);
    var remaining = shards % 5;
    var newTickets = (profile.summon_tickets || 0) + tickets;
    sb.from('profiles').update({ summon_shards: remaining, summon_tickets: newTickets }).eq('id', user.id);
    profile.summon_shards  = remaining;
    profile.summon_tickets = newTickets;
    toast('🎫 ' + tickets + ' Summon Ticket' + (tickets > 1 ? 's' : '') + ' earned!', 'gem');
  }
}

var LOOT_TABLE = [
  { type: 'coins',  label: 'COINS',         icon: '🪙',  chance: 40, getValue: function(){ return 50  + Math.floor(Math.random() * 100); } },
  { type: 'coins',  label: 'COINS',         icon: '🪙',  chance: 20, getValue: function(){ return 100 + Math.floor(Math.random() * 150); } },
  { type: 'xp',     label: 'XP BOOST',      icon: '⚡',  chance: 15, getValue: function(){ return 50; } },
  { type: 'shards', label: 'SUMMON SHARD',  icon: '🔮',  chance: 15, getValue: function(){ return 1;  } },
  { type: 'shield', label: 'STREAK SHIELD', icon: '🛡️', chance:  8, getValue: function(){ return 1;  } },
  { type: 'shards', label: 'SUMMON SHARDS', icon: '🔮✨',chance:  2, getValue: function(){ return 3;  } }
];

function rollLootTable() {
  var roll = Math.random() * 100, cumulative = 0;
  for (var i = 0; i < LOOT_TABLE.length; i++) {
    cumulative += LOOT_TABLE[i].chance;
    if (roll < cumulative) return LOOT_TABLE[i];
  }
  return LOOT_TABLE[0];
}

async function openLootBox() {
  var reward = rollLootTable(), value = reward.getValue();
  if (reward.type === 'coins') {
    await awardCurrency(0, value);
  } else if (reward.type === 'xp') {
    await giveXP(value, null, profile.role || 'warrior');
  } else if (reward.type === 'shards') {
    var ns = (profile.summon_shards || 0) + value;
    await sb.from('profiles').update({ summon_shards: ns }).eq('id', user.id);
    profile.summon_shards = ns;
    checkShardsToTicket();
  } else if (reward.type === 'shield') {
    var shields = (profile.streak_shields || 0) + 1;
    await sb.from('profiles').update({ streak_shields: shields }).eq('id', user.id);
    profile.streak_shields = shields;
  }
  await sb.from('loot_box_history').insert({ user_id: user.id, reward_type: reward.type, reward_value: value, reward_label: reward.label }).catch(function(){});
  var icon = id('loot-reward-icon'), label = id('loot-reward-label'), valEl = id('loot-reward-value');
  if (icon)  icon.textContent  = reward.icon;
  if (label) label.textContent = reward.label;
  if (valEl) valEl.textContent = reward.type === 'shield' ? 'SHIELD ACTIVATED' : '+' + value;
  show('loot-box-overlay');
}

window.closeLootBox = function() { hide('loot-box-overlay'); renderAll(); };

async function rollQuestLoot() { if (Math.random() < 0.25) await openLootBox(); }

async function checkLoginReward() {
  if (!profile) return;
  if (profile.last_login_date === today) return;
  var yesterday    = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  var loginStreak  = profile.last_login_date === yesterday ? (profile.login_streak_count || 0) + 1 : 1;
  var dayInCycle   = ((loginStreak - 1) % 7) + 1;
  await sb.from('profiles').update({ last_login_date: today, login_streak_count: loginStreak }).eq('id', user.id);
  profile.last_login_date    = today;
  profile.login_streak_count = loginStreak;
  var res = await sb.from('login_rewards').select('*').eq('day', dayInCycle).single().catch(function(){ return { data: null }; });
  if (!res.data) return;
  var reward = res.data;
  if (reward.reward_type === 'coins')  await awardCurrency(0, reward.reward_value);
  else if (reward.reward_type === 'xp') await giveXP(reward.reward_value, null, profile.role || 'warrior');
  else if (reward.reward_type === 'shards') {
    var ns = (profile.summon_shards || 0) + reward.reward_value;
    await sb.from('profiles').update({ summon_shards: ns }).eq('id', user.id);
    profile.summon_shards = ns;
    checkShardsToTicket();
  } else if (reward.reward_type === 'ticket') {
    var nt = (profile.summon_tickets || 0) + 1, nc = (profile.coins || 0) + 300;
    await sb.from('profiles').update({ summon_tickets: nt, coins: nc }).eq('id', user.id);
    profile.summon_tickets = nt; profile.coins = nc;
  }
  showLoginRewardModal(dayInCycle, reward, loginStreak);
}

function showLoginRewardModal(day, reward, streak) {
  var el = id('login-reward-content'); if (!el) return;
  var icons = { coins: '🪙', xp: '⚡', shards: '🔮', ticket: '🎫' };
  var html = '<div style="text-align:center;padding:16px 0">';
  html += '<div style="font-size:48px;margin-bottom:12px;animation:rewardBounce .6s cubic-bezier(.4,0,.2,1)">' + (icons[reward.reward_type] || '🎁') + '</div>';
  html += '<div style="font-family:Orbitron,monospace;font-size:20px;font-weight:900;color:var(--gold);margin-bottom:6px">' + reward.description + '</div>';
  html += '<div style="font-size:13px;color:var(--text2);margin-bottom:20px">Day ' + day + ' Login Reward' + (day === 7 ? ' 🎉 Week Complete!' : '') + '</div>';
  html += '<div class="login-reward-days">';
  for (var d = 1; d <= 7; d++) {
    var isClaimed = d < day, isToday = d === day;
    html += '<div class="lr-day ' + (isClaimed ? 'claimed ' : '') + (isToday ? 'today' : '') + '"><div class="lr-day-num">D' + d + '</div><div class="lr-day-icon">' + (d === 7 ? '🎫' : d === 3 || d === 6 ? '🔮' : '🎁') + '</div></div>';
  }
  html += '</div><div style="font-size:12px;color:var(--text3)">Login Streak: ' + streak + ' days</div></div>';
  html += '<button class="btn-primary" onclick="closeModal(\'login-reward-modal\')">COLLECT</button>';
  el.innerHTML = html;
  show('login-reward-modal');
}

// ══════════════════════════════════
// NEW RANK SYSTEM — 10 RANKS / 30 STAGES
// ══════════════════════════════════
const RANK_STAGES = [
  {id:0, rank:'Bronze',      stage:'I',   icon:'🥉', color:'#cd7f32', frame:'frame-bronze',      minXP:0,     maxXP:300},
  {id:1, rank:'Bronze',      stage:'II',  icon:'🥉', color:'#cd7f32', frame:'frame-bronze',      minXP:300,   maxXP:700},
  {id:2, rank:'Bronze',      stage:'III', icon:'🥉', color:'#cd7f32', frame:'frame-bronze',      minXP:700,   maxXP:1200},
  {id:3, rank:'Silver',      stage:'I',   icon:'🥈', color:'#c0c0c0', frame:'frame-silver',      minXP:1200,  maxXP:1800},
  {id:4, rank:'Silver',      stage:'II',  icon:'🥈', color:'#c0c0c0', frame:'frame-silver',      minXP:1800,  maxXP:2500},
  {id:5, rank:'Silver',      stage:'III', icon:'🥈', color:'#c0c0c0', frame:'frame-silver',      minXP:2500,  maxXP:3300},
  {id:6, rank:'Gold',        stage:'I',   icon:'🏅', color:'#ffd700', frame:'frame-gold',        minXP:3300,  maxXP:4200},
  {id:7, rank:'Gold',        stage:'II',  icon:'🏅', color:'#ffd700', frame:'frame-gold',        minXP:4200,  maxXP:5200},
  {id:8, rank:'Gold',        stage:'III', icon:'🏅', color:'#ffd700', frame:'frame-gold',        minXP:5200,  maxXP:6300},
  {id:9, rank:'Platinum',    stage:'I',   icon:'💎', color:'#60a5fa', frame:'frame-platinum',    minXP:6300,  maxXP:7500},
  {id:10,rank:'Platinum',    stage:'II',  icon:'💎', color:'#60a5fa', frame:'frame-platinum',    minXP:7500,  maxXP:8800},
  {id:11,rank:'Platinum',    stage:'III', icon:'💎', color:'#60a5fa', frame:'frame-platinum',    minXP:8800,  maxXP:10200},
  {id:12,rank:'Diamond',     stage:'I',   icon:'💠', color:'#67e8f9', frame:'frame-diamond',     minXP:10200, maxXP:11700},
  {id:13,rank:'Diamond',     stage:'II',  icon:'💠', color:'#67e8f9', frame:'frame-diamond',     minXP:11700, maxXP:13300},
  {id:14,rank:'Diamond',     stage:'III', icon:'💠', color:'#67e8f9', frame:'frame-diamond',     minXP:13300, maxXP:15000},
  {id:15,rank:'Master',      stage:'I',   icon:'⚔️', color:'#6366f1', frame:'frame-master',      minXP:15000, maxXP:17000},
  {id:16,rank:'Master',      stage:'II',  icon:'⚔️', color:'#6366f1', frame:'frame-master',      minXP:17000, maxXP:19200},
  {id:17,rank:'Master',      stage:'III', icon:'⚔️', color:'#6366f1', frame:'frame-master',      minXP:19200, maxXP:21600},
  {id:18,rank:'Grandmaster', stage:'I',   icon:'🔮', color:'#7c3aed', frame:'frame-grandmaster', minXP:21600, maxXP:24200},
  {id:19,rank:'Grandmaster', stage:'II',  icon:'🔮', color:'#7c3aed', frame:'frame-grandmaster', minXP:24200, maxXP:27000},
  {id:20,rank:'Grandmaster', stage:'III', icon:'🔮', color:'#7c3aed', frame:'frame-grandmaster', minXP:27000, maxXP:30000},
  {id:21,rank:'Legendary',   stage:'I',   icon:'🌟', color:'#f59e0b', frame:'frame-legendary',   minXP:30000, maxXP:33500},
  {id:22,rank:'Legendary',   stage:'II',  icon:'🌟', color:'#f59e0b', frame:'frame-legendary',   minXP:33500, maxXP:37500},
  {id:23,rank:'Legendary',   stage:'III', icon:'🌟', color:'#f59e0b', frame:'frame-legendary',   minXP:37500, maxXP:42000},
  {id:24,rank:'Mythic',      stage:'I',   icon:'🔥', color:'#ef4444', frame:'frame-mythic',      minXP:42000, maxXP:47000},
  {id:25,rank:'Mythic',      stage:'II',  icon:'🔥', color:'#ef4444', frame:'frame-mythic',      minXP:47000, maxXP:52500},
  {id:26,rank:'Mythic',      stage:'III', icon:'🔥', color:'#ef4444', frame:'frame-mythic',      minXP:52500, maxXP:58500},
  {id:27,rank:'Ascended',    stage:'I',   icon:'👑', color:'#a855f7', frame:'frame-ascended',    minXP:58500, maxXP:65500},
  {id:28,rank:'Ascended',    stage:'II',  icon:'👑', color:'#a855f7', frame:'frame-ascended',    minXP:65500, maxXP:73500},
  {id:29,rank:'Ascended',    stage:'III', icon:'👑', color:'#a855f7', frame:'frame-ascended',    minXP:73500, maxXP:83500}
];

function getRankStage(xp) {
  var x = xp || 0;
  if (x >= 83500) {
    var beyond = Math.floor((x - 83500) / 10000);
    var stages = ['IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
    var st = stages[beyond] || ('X' + (beyond - stages.length + 1));
    return { rank:'Ascended', stage:st, fullName:'Ascended '+st, icon:'👑', color:'#a855f7', frame:'frame-ascended', minXP:83500+(beyond*10000), maxXP:83500+((beyond+1)*10000), id:30+beyond };
  }
  for (var i = RANK_STAGES.length - 1; i >= 0; i--) {
    if (x >= RANK_STAGES[i].minXP) {
      var rs = RANK_STAGES[i];
      return { rank:rs.rank, stage:rs.stage, fullName:rs.rank+' '+rs.stage, icon:rs.icon, color:rs.color, frame:rs.frame, minXP:rs.minXP, maxXP:rs.maxXP, id:i };
    }
  }
  return { rank:'Bronze', stage:'I', fullName:'Bronze I', icon:'🥉', color:'#cd7f32', frame:'frame-bronze', minXP:0, maxXP:300, id:0 };
}

function getRankProgress(xp) {
  var rs = getRankStage(xp || 0), range = rs.maxXP - rs.minXP;
  if (range <= 0) return 100;
  return Math.min(100, Math.round((((xp || 0) - rs.minXP) / range) * 100));
}

function applyFrame() {
  if (!profile) return;
  var activeFrame = profile.active_frame || 'rank';
  var rs = getRankStage(profile.xp || 0);
  var frameClass = activeFrame === 'rank' ? rs.frame : activeFrame;
  var heroCard    = document.querySelector('.hero-card');
  var profileCard = document.querySelector('.profile-card');
  var allFrames = ['frame-bronze','frame-silver','frame-gold','frame-platinum','frame-diamond','frame-master','frame-grandmaster','frame-legendary','frame-mythic','frame-ascended'];
  allFrames.forEach(function(fc) {
    if (heroCard)    heroCard.classList.remove(fc);
    if (profileCard) profileCard.classList.remove(fc);
  });
  if (heroCard)    heroCard.classList.add(frameClass);
  if (profileCard) profileCard.classList.add(frameClass);
  var rb = id('rank-badge-display');
  if (rb) { rb.textContent = rs.icon + ' ' + rs.fullName; rb.style.color = rs.color; rb.style.borderColor = rs.color + '44'; rb.style.background = rs.color + '11'; }
}

// getRankOrder used by shop unlock logic
function getRankOrder(rank) {
  var order = ['Bronze','Silver','Gold','Platinum','Diamond','Master','Grandmaster','Legendary','Mythic','Ascended'];
  return order.indexOf(rank);
}

// ══════════════════════════════════
// SUMMON BOND (shop-summons version)
// ══════════════════════════════════
async function growSummonBond(amount) {
  if (!user || !profile) return;
  try {
    var res = await sb.from('player_summons').select('*').eq('id', profile.active_summon_id).single();
    if (!res.data) return;
    var ps = res.data;
    var newBondXP = (ps.bond_xp || 0) + amount;
    var newBondLv = Math.floor(newBondXP / 100) + 1;
    var leveledUp = newBondLv > ps.bond_level;
    await sb.from('player_summons').update({ bond_xp: newBondXP, bond_level: newBondLv }).eq('id', ps.id);
    if (leveledUp) {
      var sRes = await sb.from('shop_summons').select('name').eq('id', ps.summon_id).single();
      var name = sRes.data ? sRes.data.name : 'Companion';
      toast('🔮 ' + name + ' Bond Lv ' + newBondLv + '!', 'gem');
    }
  } catch (e) {}
}

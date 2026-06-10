// ══════════════════════════════════
// GUILDS
// ══════════════════════════════════
async function loadUserGuild() {
  try {
    var m = (await sb.from('guild_members').select('*,guilds(*)').eq('user_id', user.id).single()).data;
    userGuild = m?.guilds || null;
    var sub = id('guild-status-sub'); if (sub) sub.textContent = userGuild ? 'Member of ' + userGuild.name : 'Join or create a guild';
  } catch (e) { userGuild = null; }
}

async function renderGuildSection() {
  await loadUserGuild();
  var el = id('guild-content-inner'); if (!el) return;
  if (userGuild) await renderMyGuild(el); else renderGuildBrowse(el);
}

async function renderMyGuild(el) {
  var members  = (await sb.from('guild_members').select('*,profiles(username,avatar_url,xp,role)').eq('guild_id', userGuild.id)).data;
  var messages = (await sb.from('guild_messages').select('*,profiles(username)').eq('guild_id', userGuild.id).order('created_at', { ascending: false }).limit(20)).data;
  var totalXP  = (members || []).reduce(function(a, m){ return a + (m.profiles?.xp || 0); }, 0);
  el.innerHTML = '<div class="guild-card" style="cursor:default"><div class="guild-banner" style="background:' + (userGuild.banner_color || '#1a0a3a') + '">' + (userGuild.icon || '⚔️') + '</div><div class="guild-body"><div class="guild-name">' + userGuild.name + '</div><div class="guild-desc">' + (userGuild.description || 'A mighty guild.') + '</div><div class="guild-stats"><div class="guild-stat">👥 <span>' + (members || []).length + '</span></div><div class="guild-stat">⚡ <span>' + totalXP + '</span> XP</div><div class="guild-stat">🔑 <span>' + userGuild.invite_code + '</span></div></div></div></div>'
    + '<div class="sec-title">👥 Members</div>'
    + (members || []).map(function(m){ return '<div class="guild-member"><div class="lb-av">' + (m.profiles?.avatar_url ? '<img src="' + m.profiles.avatar_url + '"/>' : '🧙') + '</div><div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">' + (m.profiles?.username || 'Player') + (m.member_role === 'leader' ? ' 👑' : '') + '</div><div style="font-size:11px;color:var(--text2)">' + getRoleInfo(m.profiles?.role || 'warrior').icon + ' ' + (m.profiles?.xp || 0) + ' XP</div></div></div>'; }).join('')
    + '<div class="sec-title" style="margin-top:16px">💬 Guild Chat</div>'
    + '<div style="background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:0 14px;max-height:200px;overflow-y:auto;margin-bottom:8px">' + (messages || []).reverse().map(function(msg){ return '<div class="guild-message"><div class="gm-meta"><span class="gm-name">' + (msg.profiles?.username || '?') + '</span><span class="gm-time">' + new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '</span></div><div class="gm-text">' + msg.content + '</div></div>'; }).join('') + '</div>'
    + '<div class="guild-chat-input"><input type="text" id="guild-chat-input" class="guild-chat-field" placeholder="Message your guild..." onkeydown="if(event.key===\'Enter\')sendGuildMessage()"/><button class="guild-send" onclick="sendGuildMessage()">➤</button></div>'
    + '<button class="btn-secondary" style="margin-top:12px;border-color:rgba(239,68,68,.3);color:var(--red)" onclick="leaveGuild()">🚪 Leave Guild</button>';
}

async function renderGuildBrowse(el) {
  var guilds = (await sb.from('guilds').select('*').eq('is_public', true).order('total_xp', { ascending: false }).limit(10)).data;
  el.innerHTML = '<button class="guild-join-btn" style="margin-bottom:12px" onclick="openCreateGuild()">⚔️ Create New Guild</button>'
    + '<div style="display:flex;gap:8px;margin-bottom:16px"><input type="text" id="guild-invite-code" style="flex:1;padding:11px 14px;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:14px;outline:none" placeholder="Enter invite code"/><button onclick="joinGuildByCode()" style="padding:11px 16px;background:var(--accent);border:none;border-radius:12px;color:#fff;font-weight:700;cursor:pointer">Join</button></div>'
    + '<div class="sec-title">Public Guilds</div>'
    + (!guilds || !guilds.length ? empty('⚔️', 'No public guilds yet') : guilds.map(function(g){ return '<div class="guild-card" onclick="joinGuildConfirm(\'' + g.id + '\',\'' + g.name + '\')"><div class="guild-banner" style="background:' + (g.banner_color || '#1a0a3a') + '">' + (g.icon || '⚔️') + '</div><div class="guild-body"><div class="guild-name">' + g.name + '</div><div class="guild-desc">' + (g.description || 'A mighty guild.') + '</div><div class="guild-stats"><div class="guild-stat">👥 <span>' + (g.member_count || 1) + '</span></div><div class="guild-stat">⚡ <span>' + (g.total_xp || 0) + '</span> XP</div></div><button class="guild-join-btn">Join Guild</button></div></div>'; }).join(''));
}

window.openCreateGuild = function() {
  var el = id('guild-content-inner'); if (!el) return;
  el.innerHTML = '<div class="form-card"><div class="form-card-title">⚔️ Create Guild</div><div class="form-group"><label>Guild Name</label><input type="text" id="new-guild-name" placeholder="e.g. Shadow Warriors"/></div><div class="form-group"><label>Description</label><input type="text" id="new-guild-desc" placeholder="What\'s your guild about?"/></div><div class="form-group"><label>Icon (emoji)</label><input type="text" id="new-guild-icon" placeholder="⚔️" maxlength="2"/></div><div class="form-group"><label>Banner Color</label><select id="new-guild-color"><option value="#1a0a3a">🟣 Deep Purple</option><option value="#1a0a00">🟡 Dark Gold</option><option value="#0a1a2e">🔵 Midnight Blue</option><option value="#0a1a0a">🟢 Forest Dark</option><option value="#1a0000">🔴 Blood Red</option></select></div><button class="btn-primary" onclick="createGuild()">CREATE GUILD</button><button class="btn-secondary" onclick="renderGuildSection()">Cancel</button></div>';
};

window.createGuild = async function() {
  var name = val('new-guild-name'), desc = val('new-guild-desc'), icon = val('new-guild-icon') || '⚔️', color = val('new-guild-color');
  if (!name) { toast('Enter guild name! ⚠️', 'red'); return; }
  var inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();
  var res = await sb.from('guilds').insert({ name, description: desc, icon, banner_color: color, leader_id: user.id, invite_code: inviteCode, is_public: true, member_count: 1, total_xp: profile.xp || 0 }).select().single();
  if (res.error) { toast('Error: ' + res.error.message, 'red'); return; }
  await sb.from('guild_members').insert({ guild_id: res.data.id, user_id: user.id, member_role: 'leader' });
  toast('⚔️ Guild "' + name + '" created!', 'green'); userGuild = res.data; renderGuildSection();
};

window.joinGuildConfirm = async function(guildId, guildName) {
  if (userGuild) { toast('Leave your current guild first!', 'red'); return; }
  await sb.from('guild_members').insert({ guild_id: guildId, user_id: user.id, member_role: 'member' });
  var g = (await sb.from('guilds').select('member_count').eq('id', guildId).single()).data;
  await sb.from('guilds').update({ member_count: (g?.member_count || 1) + 1 }).eq('id', guildId);
  toast('⚔️ Joined ' + guildName + '!', 'green'); renderGuildSection();
};

window.joinGuildByCode = async function() {
  var code = val('guild-invite-code').toUpperCase(); if (!code) { toast('Enter invite code! ⚠️', 'red'); return; }
  var guild = (await sb.from('guilds').select('*').eq('invite_code', code).single().catch(function(){ return { data: null }; })).data;
  if (!guild) { toast('Invalid invite code!', 'red'); return; }
  await joinGuildConfirm(guild.id, guild.name);
};

window.leaveGuild = async function() {
  if (!userGuild) return;
  await sb.from('guild_members').delete().eq('user_id', user.id).eq('guild_id', userGuild.id);
  toast('Left guild.', 'green'); userGuild = null; renderGuildSection();
};

window.sendGuildMessage = async function() {
  if (!userGuild) return;
  var input = id('guild-chat-input'), msg = input?.value?.trim(); if (!msg) return;
  input.value = '';
  await sb.from('guild_messages').insert({ guild_id: userGuild.id, user_id: user.id, content: msg });
  await sb.from('guilds').update({ total_xp: profile.xp || 0 }).eq('id', userGuild.id);
  renderGuildSection();
};

// ══════════════════════════════════
// EVENTS
// ══════════════════════════════════
async function renderEvents() {
  var el = id('events-list'); if (!el) return;
  try {
    var events = (await sb.from('events').select('*').eq('is_active', true).order('start_date', { ascending: true })).data;
    if (!events || !events.length) { el.innerHTML = empty('🎪', 'No events right now. Check back soon!'); return; }
    var myP      = (await sb.from('event_participants').select('*').eq('user_id', user.id)).data;
    var joinedIds = (myP || []).map(function(p){ return p.event_id; });
    el.innerHTML = events.map(function(ev) {
      var isJoined = joinedIds.includes(ev.id);
      var isDone   = (myP || []).find(function(p){ return p.event_id === ev.id && p.is_completed; });
      var typeCls  = ev.event_type === 'guild' ? 'style="color:var(--gold);border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.08)"' : ev.event_type === 'seasonal' ? 'style="color:var(--pink);border-color:rgba(236,72,153,.3);background:rgba(236,72,153,.08)"' : 'style="color:var(--gem);border-color:rgba(96,165,250,.3);background:rgba(96,165,250,.08)"';
      var progress = isJoined ? (myP || []).find(function(p){ return p.event_id === ev.id; })?.progress || 0 : 0;
      var pct = ev.quest_requirement > 0 ? Math.round((progress / ev.quest_requirement) * 100) : 0;
      return '<div class="event-card"><div class="event-header"><div class="event-icon">' + (ev.icon || '🎪') + '</div><div class="event-title-wrap"><div class="event-title">' + ev.title + '</div><div class="event-dates">' + ev.start_date + ' → ' + (ev.end_date || 'Ongoing') + '</div></div><div class="event-type-badge" ' + typeCls + '>' + cap(ev.event_type || 'community') + '</div></div><div class="event-body"><div class="event-desc">' + (ev.description || '') + '</div><div class="event-rewards">' + (ev.xp_reward > 0 ? '<div class="event-reward" style="color:var(--accent2);border-color:rgba(168,85,247,.3);background:rgba(168,85,247,.08)">⚡ ' + ev.xp_reward + ' XP</div>' : '') + (ev.coins_reward > 0 ? '<div class="event-reward" style="color:var(--coin);border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.08)">🪙 ' + ev.coins_reward + '</div>' : '') + '</div>' + (isJoined ? '<div class="progress-wrap"><div class="progress-label"><span>Progress</span><span>' + progress + '/' + ev.quest_requirement + '</span></div><div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div></div>' + (isDone ? '<div class="event-joined-badge">✅ COMPLETED!</div>' : '<div class="event-joined-badge">✅ Joined</div>') : '<button class="event-join-btn" onclick="joinEvent(\'' + ev.id + '\')">Join Event</button>') + '</div></div>';
    }).join('');
  } catch (e) {}
}

window.joinEvent = async function(eventId) {
  try {
    await sb.from('event_participants').insert({ user_id: user.id, event_id: eventId, progress: 0 });
    toast('🎪 Event joined!', 'green'); renderEvents();
  } catch (e) { toast('Already joined!', 'red'); }
};

// ══════════════════════════════════
// MANUALS
// ══════════════════════════════════
var currentManualCategory = 'all';

async function renderManuals() {
  var listEl = id('manuals-list'); if (!listEl) return;
  try {
    var manuals  = (await sb.from('skill_manuals').select('*').eq('is_published', true).order('category')).data;
    var comps    = (await sb.from('manual_completions').select('manual_id').eq('user_id', user.id)).data;
    var doneIds  = (comps || []).map(function(c){ return c.manual_id; });
    var filtered = (currentManualCategory === 'all' ? (manuals || []) : (manuals || []).filter(function(m){ return m.category === currentManualCategory; })).filter(function(m){ return m.category !== 'period_advice' || profile?.gender === 'female'; });
    listEl.innerHTML = filtered.map(function(m){ return '<div class="manual-card ' + (doneIds.includes(m.id) ? 'completed' : '') + '" onclick="openManual(\'' + m.id + '\')"><div class="manual-icon">' + (m.icon || '📚') + '</div><div class="manual-info"><div class="manual-title">' + m.title + '</div><div class="manual-meta"><span class="diff-badge ' + DIFF_CONFIG[m.difficulty || 'charged'].cls + '">' + DIFF_CONFIG[m.difficulty || 'charged'].icon + '</span><span style="font-size:10px;color:var(--text3)">⏱ ' + m.read_time_mins + ' min</span></div></div><div style="text-align:right;flex-shrink:0">' + (doneIds.includes(m.id) ? '<div style="color:var(--green);font-size:20px">✅</div>' : '<div style="font-size:12px;color:var(--accent2);font-weight:700">+🪙' + m.coins_reward + '</div>') + '</div></div>'; }).join('');
  } catch (e) {}
}

window.filterManuals = function(cat, btn) {
  currentManualCategory = cat;
  document.querySelectorAll('.manual-cat-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active'); renderManuals();
};

window.openManual = async function(manualId) {
  var manual = (await sb.from('skill_manuals').select('*').eq('id', manualId).single()).data; if (!manual) return;
  var comp   = (await sb.from('manual_completions').select('id').eq('user_id', user.id).eq('manual_id', manualId).single().catch(function(){ return { data: null }; })).data;
  var isCompleted = !!comp;
  id('manual-modal-content').innerHTML = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px"><div style="font-size:36px">' + (manual.icon || '📚') + '</div><div><div style="font-family:Orbitron,monospace;font-size:15px;font-weight:900;color:var(--text)">' + manual.title + '</div><div style="font-size:11px;color:var(--text2);margin-top:4px">⏱ ' + manual.read_time_mins + ' min • ' + cap(manual.category) + '</div></div></div><div class="manual-content">' + (manual.content || 'No content yet.') + '</div>' + (isCompleted ? '<div style="text-align:center;padding:16px;color:var(--green);font-weight:700;font-size:14px">✅ Completed!</div>' : '<button class="manual-complete-btn" onclick="completeManual(\'' + manual.id + '\',' + manual.xp_reward + ',' + manual.coins_reward + ')">✅ MARK AS READ (+' + manual.xp_reward + ' XP +🪙' + manual.coins_reward + ')</button>') + '<button class="btn-secondary" onclick="closeModal(\'manual-modal\')" style="margin-top:10px">Close</button>';
  show('manual-modal');
};

window.completeManual = async function(manualId, xpRew, coinsRew) {
  await sb.from('manual_completions').insert({ user_id: user.id, manual_id: manualId });
  await giveXP(xpRew, 'knowledge', profile.role || 'warrior');
  await awardCurrency(0, coinsRew);
  toast('📚 Manual complete! +' + xpRew + 'XP 🪙' + coinsRew, 'green');
  closeModal('manual-modal'); renderManuals();
};

// ══════════════════════════════════
// BOSS FIGHTS
// ══════════════════════════════════
async function renderBossFights() {
  var el = id('boss-list'); if (!el) return;
  try {
    var bosses = (await sb.from('boss_fights').select('*').eq('is_active', true).order('created_at', { ascending: false })).data;
    if (!bosses || !bosses.length) { el.innerHTML = empty('🐉', 'No active bosses. A challenger approaches...'); return; }
    var myHits = (await sb.from('boss_participants').select('*').eq('user_id', user.id)).data;
    el.innerHTML = bosses.map(function(boss) {
      var hpPct      = Math.round((boss.current_hp / boss.total_hp) * 100);
      var myDmg      = (myHits || []).find(function(h){ return h.boss_id === boss.id; });
      var isDefeated = boss.is_defeated || boss.current_hp <= 0;
      return '<div class="boss-card"><div class="boss-icon">' + (boss.boss_icon || '🐉') + '</div><div class="boss-name">' + boss.title + '</div><div class="boss-desc">' + (boss.description || '') + '</div><div class="boss-hp-label"><span>💀 BOSS HP</span><span>' + boss.current_hp + ' / ' + boss.total_hp + '</span></div><div class="boss-hp-track"><div class="boss-hp-fill" style="width:' + hpPct + '%"></div></div><div class="boss-stats-row"><div class="boss-stat"><div class="boss-stat-val">' + boss.xp_per_hit + '</div><div class="boss-stat-lbl">XP/HIT</div></div><div class="boss-stat"><div class="boss-stat-val">' + (myDmg?.damage_dealt || 0) + '</div><div class="boss-stat-lbl">YOUR HITS</div></div><div class="boss-stat"><div class="boss-stat-val">' + boss.coins_reward + '</div><div class="boss-stat-lbl">🪙 REWARD</div></div></div>' + (isDefeated ? '<div class="boss-defeated">💀 BOSS DEFEATED! 🎉</div>' : '<button class="boss-attack-btn" onclick="attackBoss(\'' + boss.id + '\',' + boss.xp_per_hit + ',' + boss.current_hp + ',' + boss.xp_reward + ',' + boss.coins_reward + ')">⚔️ ATTACK!</button>') + '</div>';
    }).join('');
  } catch (e) {}
}

window.attackBoss = async function(bossId, xpPerHit, currentHp, totalXpRew, coinsRew) {
  if (currentHp <= 0) { toast('Boss already defeated!', 'green'); return; }
  var newHp = Math.max(0, currentHp - 50), isDefeated = newHp <= 0;
  await sb.from('boss_fights').update({ current_hp: newHp, is_defeated: isDefeated }).eq('id', bossId);
  try {
    var ex = (await sb.from('boss_participants').select('*').eq('boss_id', bossId).eq('user_id', user.id).single()).data;
    if (ex) await sb.from('boss_participants').update({ damage_dealt: ex.damage_dealt + 50, last_hit_at: new Date().toISOString() }).eq('id', ex.id);
    else    await sb.from('boss_participants').insert({ boss_id: bossId, user_id: user.id, damage_dealt: 50, last_hit_at: new Date().toISOString() });
  } catch (e) {
    await sb.from('boss_participants').insert({ boss_id: bossId, user_id: user.id, damage_dealt: 50, last_hit_at: new Date().toISOString() });
  }
  await giveXP(xpPerHit, 'discipline', profile.role || 'warrior');
  toast('⚔️ Hit! -50 HP! +' + xpPerHit + 'XP');
  if (isDefeated) { await awardCurrency(0, coinsRew); await giveXP(totalXpRew, null, profile.role); setTimeout(function(){ toast('🎉 BOSS DEFEATED! +' + totalXpRew + 'XP 🪙' + coinsRew + '!', 'gem'); }, 500); }
  renderBossFights();
};

// ══════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════
function openLeaderboard() { show('leaderboard-screen'); loadLeaderboard('all', null); }

async function loadLeaderboard(type, btn) {
  if (btn) { document.querySelectorAll('.lb-tab').forEach(function(t){ t.classList.remove('active'); }); btn.classList.add('active'); }
  var el = id('leaderboard-list'), myRankNum = id('my-rank-num'), myRankSub = id('my-rank-sub'); if (!el) return;
  var query = sb.from('profiles').select('id,username,avatar_url,xp,level,streak,role,gender');
  if (type === 'streak') query = query.order('streak', { ascending: false });
  else                   query = query.order('xp',     { ascending: false });
  var players = (await query.limit(20)).data;
  if (!players || !players.length) { el.innerHTML = empty('🏆', 'No players yet'); return; }
  var myRank = players.findIndex(function(p){ return p.id === user.id; }) + 1;
  if (myRank > 0 && myRankNum) myRankNum.textContent = '#' + myRank;
  if (myRankSub) { var me = players.find(function(p){ return p.id === user.id; }); myRankSub.textContent = me ? me.xp + ' XP • Level ' + getLevel(me.xp || 0) : 'Keep earning XP!'; }
  el.innerHTML = players.map(function(p, i) {
    var rank = i + 1, rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
    var rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '#' + rank;
    var isMe = p.id === user.id;
    return '<div class="lb-card" ' + (isMe ? 'style="border-color:rgba(124,58,237,.4);background:rgba(124,58,237,.05)"' : '') + '><div class="lb-rank ' + rankClass + '">' + rankDisplay + '</div><div class="lb-av">' + (p.avatar_url ? '<img src="' + p.avatar_url + '"/>' : '🧙') + '</div><div class="lb-info"><div class="lb-name">' + (p.username || 'Player') + (isMe ? '<span class="lb-me-badge">YOU</span>' : '') + (p.gender === 'female' ? ' 🌸' : '') + '</div><div class="lb-sub">' + getRoleInfo(p.role || 'warrior').icon + ' ' + (type === 'streak' ? '🔥 ' + (p.streak || 0) + ' days' : 'LV ' + getLevel(p.xp || 0)) + '</div></div><div><div class="lb-xp">' + (type === 'streak' ? p.streak || 0 : p.xp || 0) + '</div><div class="lb-level">' + (type === 'streak' ? 'streak days' : 'Level ' + getLevel(p.xp || 0)) + '</div></div></div>';
  }).join('');
}

// ══════════════════════════════════
// ADMIN
// ══════════════════════════════════

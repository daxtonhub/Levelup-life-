// ════════════════════════════════════════════
// FEATURES.JS — Journal, Guilds, Events,
// Bosses, Leaderboard, Manuals, Frames,
// Summons, Admin
// ════════════════════════════════════════════

// ─── JOURNAL ──────────────────────────────────
async function renderJournal() {
  const el = id('journal-list'); if (!el) return;
  try {
    const { data } = await sb.from('journal_entries').select('*').eq('user_id', user.id).eq('is_deleted', false).order('entry_date', { ascending: false }).limit(30);
    if (!data?.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">📖</div><div>No entries yet.</div><div style="font-size:12px;color:var(--text3);margin-top:6px">Start writing your story today.</div></div>`; return; }
    el.innerHTML = data.map(e => `
      <div class="journal-entry-card">
        <div class="je-delete-btn" onclick="softDeleteJournal('${e.id}',event)">🗑</div>
        <div onclick="viewJournalEntry('${e.id}')">
          <div class="je-top"><div class="je-mood">${MOOD_ICONS[e.mood]||'🙂'}</div><div class="je-title">${e.title||'Untitled'}</div><div class="je-date">${formatDate(e.entry_date)}</div></div>
          <div class="je-preview">${e.content||''}</div>
          <div class="je-footer">${e.what_learned?'<div class="je-tag">📚 Learned</div>':''}${e.lesson_learned?'<div class="je-tag">💡 Lesson</div>':''}</div>
        </div>
      </div>`).join('');
  } catch(e) {}
}

window.openJournalModal = () => {
  id('je-title').value = ''; id('je-content').value = ''; id('je-learned').value = ''; id('je-lesson').value = '';
  selectedMood = 'okay';
  document.querySelectorAll('.mood-opt').forEach(m => m.classList.toggle('selected', m.dataset.mood === 'okay'));
  id('journal-modal-title').textContent = '✍️ ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  show('journal-modal');
};

window.selectMood = (el) => {
  selectedMood = el.dataset.mood;
  document.querySelectorAll('.mood-opt').forEach(m => m.classList.remove('selected'));
  el.classList.add('selected');
};

window.saveJournalEntry = async () => {
  const title = val('je-title') || 'Entry ' + getToday(), content = document.getElementById('je-content').value.trim();
  const learned = document.getElementById('je-learned').value.trim(), lesson = document.getElementById('je-lesson').value.trim();
  if (!content) { toast('Write something first! ✍️', 'red'); return; }
  await sb.from('journal_entries').insert({ user_id: user.id, title, content, what_learned: learned||null, lesson_learned: lesson||null, mood: selectedMood, entry_date: getToday(), is_deleted: false, restore_before: new Date(Date.now() + 90*24*60*60*1000).toISOString() });
  await awardCurrency(0, 10);
  toast('Entry saved! 📖 +🪙10', 'green');
  closeModal('journal-modal');
  renderJournal();
};

window.softDeleteJournal = async (entryId, event) => {
  event.stopPropagation();
  await sb.from('journal_entries').update({ is_deleted: true, deleted_at: new Date().toISOString(), restore_before: new Date(Date.now() + 90*24*60*60*1000).toISOString() }).eq('id', entryId);
  toast('Moved to trash. Recoverable 90 days 🗑');
  renderJournal();
};

window.toggleDeletedJournals = async () => {
  const el = id('deleted-journal-list'); if (!el) return;
  const isHidden = el.classList.contains('hidden');
  if (isHidden) {
    show('deleted-journal-list');
    const { data } = await sb.from('journal_entries').select('*').eq('user_id', user.id).eq('is_deleted', true).order('deleted_at', { ascending: false });
    if (!data?.length) { el.innerHTML = empty('🗑️', 'No deleted entries'); return; }
    el.innerHTML = data.map(e => `
      <div class="journal-entry-card" style="border:1px solid rgba(239,68,68,.2);opacity:.7">
        <div class="je-top"><div class="je-mood">${MOOD_ICONS[e.mood]||'🙂'}</div><div class="je-title">${e.title||'Untitled'}</div><div class="je-date">Del. ${formatDate(e.deleted_at)}</div></div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="restoreJournal('${e.id}')" style="flex:1;padding:8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:8px;color:var(--green);font-size:12px;font-weight:700;cursor:pointer">↩️ Restore</button>
          <div style="font-size:11px;color:var(--text3);padding:8px;display:flex;align-items:center">Exp. ${formatDate(e.restore_before)}</div>
        </div>
      </div>`).join('');
  } else { hide('deleted-journal-list'); }
};

window.restoreJournal = async (entryId) => {
  await sb.from('journal_entries').update({ is_deleted: false, deleted_at: null, restore_before: null }).eq('id', entryId);
  toast('Entry restored! ✅', 'green'); renderJournal(); hide('deleted-journal-list');
};

window.viewJournalEntry = async (entryId) => {
  const { data: e } = await sb.from('journal_entries').select('*').eq('id', entryId).single();
  if (!e) return;
  id('journal-view-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="font-size:28px">${MOOD_ICONS[e.mood]||'🙂'}</div>
      <div><div style="font-family:'Orbitron',monospace;font-size:15px;font-weight:900;color:var(--text)">${e.title||'Untitled'}</div><div style="font-size:12px;color:var(--text2);margin-top:3px">${formatDate(e.entry_date)}</div></div>
    </div>
    <div class="je-full-content">${e.content||''}</div>
    ${e.what_learned?`<div class="je-section-label">📚 WHAT I LEARNED TODAY</div><div class="je-section-text">${e.what_learned}</div>`:''}
    ${e.lesson_learned?`<div class="je-section-label">💡 LESSON LEARNED</div><div class="je-section-text">${e.lesson_learned}</div>`:''}`;
  show('journal-view-modal');
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── GLORY / ACHIEVEMENTS ─────────────────────
async function renderGlory() {
  const el = id('achievements-list'); if (!el) return;
  try {
    const { data: allAch } = await sb.from('achievements').select('*').eq('is_active', true);
    const { data: earned } = await sb.from('user_achievements').select('*').eq('user_id', user.id);
    const earnedIds = (earned || []).map(e => e.achievement_id);
    const glorySummary = id('glory-summary');
    if (glorySummary) glorySummary.textContent = `${earnedIds.length}/${(allAch||[]).length} unlocked`;
    if (!allAch?.length) { el.innerHTML = empty('🏆', 'No achievements yet'); return; }
    const sorted = [...allAch].sort((a, b) => earnedIds.includes(b.id) - earnedIds.includes(a.id));
    el.innerHTML = sorted.map(ach => {
      const isEarned = earnedIds.includes(ach.id);
      return `<div style="display:flex;align-items:center;gap:14px;background:var(--bg3);border:1px solid ${isEarned?'rgba(245,158,11,.4)':'var(--border)'};border-radius:16px;padding:14px;margin-bottom:10px;opacity:${isEarned?'1':'.4'}">
        <div style="width:50px;height:50px;border-radius:14px;background:${isEarned?'rgba(245,158,11,.1)':'var(--bg)'};border:1px solid ${isEarned?'var(--gold)':'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">${ach.icon||'🏆'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:3px">${ach.title}</div>
          <div style="font-size:12px;color:var(--text2)">${ach.description||''}</div>
          <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
            ${ach.coins_reward>0?`<span style="font-size:10px;font-weight:700;color:var(--coin);border:1px solid rgba(245,158,11,.3);background:rgba(245,158,11,.08);border-radius:5px;padding:2px 7px">🪙 ${ach.coins_reward}</span>`:''}
            ${ach.xp_reward>0?`<span style="font-size:10px;font-weight:700;color:var(--accent2);border:1px solid rgba(168,85,247,.3);background:rgba(168,85,247,.08);border-radius:5px;padding:2px 7px">⚡ ${ach.xp_reward} XP</span>`:''}
          </div>
        </div>
        ${isEarned?`<div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--gold);background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:5px;padding:2px 7px;white-space:nowrap;flex-shrink:0">✓ EARNED</div>`:`<div style="font-size:20px;opacity:.4">🔒</div>`}
      </div>`;
    }).join('');
  } catch(e) {}
}

// ─── LEADERBOARD ──────────────────────────────
function openLeaderboard() { show('leaderboard-screen'); loadLeaderboard('xp', null); }

async function loadLeaderboard(type, btn) {
  if (btn) { document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); }
  const el = id('leaderboard-list'); if (!el) return;
  let query = sb.from('profiles').select('id,username,avatar_url,xp,streak,role,gender,energy');
  query = type === 'streak' ? query.order('streak', { ascending: false }) : query.order('xp', { ascending: false });
  const { data: players } = await query.limit(20);
  if (!players?.length) { el.innerHTML = empty('🏆', 'No players yet'); return; }
  const myRank = players.findIndex(p => p.id === user.id) + 1;
  const myRankNum = id('my-rank-num'), myRankSub = id('my-rank-sub');
  if (myRank > 0 && myRankNum) myRankNum.textContent = `#${myRank}`;
  if (myRankSub) { const me = players.find(p => p.id === user.id); const rs = getRankInfo(me?.xp||0); myRankSub.textContent = me ? `${rs.fullName} • ${me.xp||0} XP` : 'Keep earning XP!'; }
  el.innerHTML = players.map((p, i) => {
    const rank = i + 1;
    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
    const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
    const isMe = p.id === user.id;
    const rs = getRankInfo(p.xp || 0);
    return `<div class="lb-card" ${isMe?'style="border-color:rgba(124,58,237,.4);background:rgba(124,58,237,.05)"':''}>
      <div class="lb-rank ${rankClass}">${rankDisplay}</div>
      <div class="lb-av">${p.avatar_url?`<img src="${p.avatar_url}"/>`:'🧙'}</div>
      <div class="lb-info">
        <div class="lb-name">${p.username||'Player'}${isMe?'<span class="lb-me-badge">YOU</span>':''}${p.gender==='female'?' 🌸':''}</div>
        <div class="lb-sub">${getRoleInfo(p.role||'warrior').icon} ${rs.fullName}</div>
      </div>
      <div>
        <div class="lb-xp">${type==='streak'?p.streak||0:(p.xp||0).toLocaleString()}</div>
        <div class="lb-level">${type==='streak'?'streak days':'XP'}</div>
      </div>
    </div>`;
  }).join('');
}

// ─── GUILDS ───────────────────────────────────
async function renderGuildSection() {
  await loadUserGuild();
  const el = id('guild-content-inner'); if (!el) return;
  if (userGuild) await renderMyGuild(el); else renderGuildBrowse(el);
}

async function renderMyGuild(el) {
  const [{ data: members }, { data: messages }] = await Promise.all([
    sb.from('guild_members').select('*,profiles(username,avatar_url,xp,role)').eq('guild_id', userGuild.id),
    sb.from('guild_messages').select('*,profiles(username)').eq('guild_id', userGuild.id).order('created_at', { ascending: false }).limit(20)
  ]);
  const totalXP = (members || []).reduce((a, m) => a + (m.profiles?.xp || 0), 0);
  el.innerHTML = `
    <div class="guild-card" style="cursor:default">
      <div class="guild-banner" style="background:${userGuild.banner_color||'#1a0a3a'}">${userGuild.icon||'⚔️'}</div>
      <div class="guild-body">
        <div class="guild-name">${userGuild.name}</div>
        <div class="guild-desc">${userGuild.description||'A mighty guild.'}</div>
        <div class="guild-stats">
          <div class="guild-stat">👥 <span>${(members||[]).length}</span></div>
          <div class="guild-stat">⚡ <span>${totalXP.toLocaleString()}</span> XP</div>
          <div class="guild-stat">🔑 <span>${userGuild.invite_code}</span></div>
        </div>
      </div>
    </div>
    <div class="sec-title">👥 Members</div>
    ${(members||[]).map(m => `<div class="guild-member"><div class="lb-av">${m.profiles?.avatar_url?`<img src="${m.profiles.avatar_url}"/>`:'🧙'}</div><div style="flex:1"><div style="font-size:13px;font-weight:700;color:var(--text)">${m.profiles?.username||'Player'}${m.member_role==='leader'?' 👑':''}</div><div style="font-size:11px;color:var(--text2)">${getRoleInfo(m.profiles?.role||'warrior').icon} ${(m.profiles?.xp||0).toLocaleString()} XP</div></div></div>`).join('')}
    <div class="sec-title" style="margin-top:16px">💬 Guild Chat</div>
    <div style="background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:0 14px;max-height:200px;overflow-y:auto;margin-bottom:8px">
      ${(messages||[]).reverse().map(msg => `<div class="guild-message"><div class="gm-meta"><span class="gm-name">${msg.profiles?.username||'?'}</span><span class="gm-time">${new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div><div class="gm-text">${msg.content}</div></div>`).join('')}
    </div>
    <div class="guild-chat-input">
      <input type="text" id="guild-chat-input" class="guild-chat-field" placeholder="Message your guild..." onkeydown="if(event.key==='Enter')sendGuildMessage()"/>
      <button class="guild-send" onclick="sendGuildMessage()">➤</button>
    </div>
    <button class="btn-secondary" style="margin-top:12px;border-color:rgba(239,68,68,.3);color:var(--red)" onclick="leaveGuild()">🚪 Leave Guild</button>`;
}

async function renderGuildBrowse(el) {
  const { data: guilds } = await sb.from('guilds').select('*').eq('is_public', true).order('total_xp', { ascending: false }).limit(10);
  el.innerHTML = `
    <button class="guild-join-btn" style="margin-bottom:12px" onclick="openCreateGuild()">⚔️ Create New Guild</button>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <input type="text" id="guild-invite-code" style="flex:1;padding:11px 14px;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text);font-size:14px;outline:none" placeholder="Enter invite code"/>
      <button onclick="joinGuildByCode()" style="padding:11px 16px;background:var(--accent);border:none;border-radius:12px;color:#fff;font-weight:700;cursor:pointer">Join</button>
    </div>
    <div class="sec-title">Public Guilds</div>
    ${!guilds?.length ? empty('⚔️', 'No public guilds yet') : guilds.map(g => `
      <div class="guild-card" onclick="joinGuildConfirm('${g.id}','${g.name}')">
        <div class="guild-banner" style="background:${g.banner_color||'#1a0a3a'}">${g.icon||'⚔️'}</div>
        <div class="guild-body">
          <div class="guild-name">${g.name}</div>
          <div class="guild-desc">${g.description||'A mighty guild.'}</div>
          <div class="guild-stats"><div class="guild-stat">👥 <span>${g.member_count||1}</span></div><div class="guild-stat">⚡ <span>${(g.total_xp||0).toLocaleString()}</span> XP</div></div>
          <button class="guild-join-btn">Join Guild</button>
        </div>
      </div>`).join('')}`;
}

window.openCreateGuild = () => {
  const el = id('guild-content-inner'); if (!el) return;
  el.innerHTML = `<div class="form-card">
    <div class="form-card-title">⚔️ Create Guild</div>
    <div class="form-group"><label>Guild Name</label><input type="text" id="new-guild-name" placeholder="e.g. Shadow Warriors"/></div>
    <div class="form-group"><label>Description</label><input type="text" id="new-guild-desc" placeholder="What's your guild about?"/></div>
    <div class="form-group"><label>Icon (emoji)</label><input type="text" id="new-guild-icon" placeholder="⚔️" maxlength="2"/></div>
    <div class="form-group"><label>Banner Color</label><select id="new-guild-color"><option value="#1a0a3a">🟣 Deep Purple</option><option value="#1a0a00">🟡 Dark Gold</option><option value="#0a1a2e">🔵 Midnight Blue</option><option value="#0a1a0a">🟢 Forest Dark</option><option value="#1a0000">🔴 Blood Red</option></select></div>
    <button class="btn-primary" onclick="createGuild()">CREATE GUILD</button>
    <button class="btn-secondary" onclick="renderGuildSection()">Cancel</button>
  </div>`;
};

window.createGuild = async () => {
  const name = val('new-guild-name'), desc = val('new-guild-desc'), icon = val('new-guild-icon') || '⚔️', color = val('new-guild-color');
  if (!name) { toast('Enter guild name! ⚠️', 'red'); return; }
  const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();
  const { data: guild, error } = await sb.from('guilds').insert({ name, description: desc, icon, banner_color: color, leader_id: user.id, invite_code: inviteCode, is_public: true, member_count: 1, total_xp: profile.xp || 0 }).select().single();
  if (error) { toast('Error: ' + error.message, 'red'); return; }
  await sb.from('guild_members').insert({ guild_id: guild.id, user_id: user.id, member_role: 'leader' });
  toast(`⚔️ Guild "${name}" created!`, 'green'); userGuild = guild; renderGuildSection();
};

window.joinGuildConfirm = async (guildId, guildName) => {
  if (userGuild) { toast('Leave your current guild first!', 'red'); return; }
  await sb.from('guild_members').insert({ guild_id: guildId, user_id: user.id, member_role: 'member' });
  const { data: g } = await sb.from('guilds').select('member_count').eq('id', guildId).single();
  await sb.from('guilds').update({ member_count: (g?.member_count||1) + 1 }).eq('id', guildId);
  toast(`⚔️ Joined ${guildName}!`, 'green'); renderGuildSection();
};

window.joinGuildByCode = async () => {
  const code = val('guild-invite-code').toUpperCase(); if (!code) { toast('Enter invite code! ⚠️', 'red'); return; }
  const { data: guild } = await sb.from('guilds').select('*').eq('invite_code', code).single().catch(() => ({ data: null }));
  if (!guild) { toast('Invalid invite code!', 'red'); return; }
  await joinGuildConfirm(guild.id, guild.name);
};

window.leaveGuild = async () => {
  if (!userGuild) return;
  await sb.from('guild_members').delete().eq('user_id', user.id).eq('guild_id', userGuild.id);
  toast('Left guild.', 'green'); userGuild = null; renderGuildSection();
};

window.sendGuildMessage = async () => {
  if (!userGuild) return;
  const input = id('guild-chat-input'), msg = input?.value?.trim(); if (!msg) return;
  input.value = '';
  await sb.from('guild_messages').insert({ guild_id: userGuild.id, user_id: user.id, content: msg });
  await sb.from('guilds').update({ total_xp: profile.xp || 0 }).eq('id', userGuild.id);
  renderGuildSection();
};

// ─── EVENTS ───────────────────────────────────
async function renderEvents() {
  const el = id('events-list'); if (!el) return;
  try {
    const { data: events } = await sb.from('events').select('*').eq('is_active', true).order('start_date', { ascending: true });
    if (!events?.length) { el.innerHTML = empty('🎪', 'No events right now. Check back soon!'); return; }
    const { data: myP } = await sb.from('event_participants').select('*').eq('user_id', user.id);
    const joinedIds = (myP || []).map(p => p.event_id);
    el.innerHTML = events.map(ev => {
      const isJoined = joinedIds.includes(ev.id), isDone = (myP||[]).find(p => p.event_id === ev.id && p.is_completed);
      const typeColor = ev.event_type === 'guild' ? 'var(--accent2)' : ev.event_type === 'boss' ? 'var(--red)' : ev.event_type === 'seasonal' ? 'var(--gold)' : 'var(--blue)';
      const pct = ev.quest_requirement > 0 ? Math.min(100, Math.round(((ev.current_progress||0) / ev.quest_requirement) * 100)) : 0;
      return `<div class="event-card">
        <div class="event-header">
          <div class="event-icon">${ev.event_type==='boss'?'🐉':ev.event_type==='guild'?'⚔️':'🎪'}</div>
          <div class="event-title-wrap"><div class="event-title">${ev.title}</div><div class="event-dates">${ev.start_date||''}${ev.end_date?' → '+ev.end_date:''}</div></div>
          <div class="event-type-badge" style="color:${typeColor};border-color:${typeColor}44;background:${typeColor}11">${cap(ev.event_type)}</div>
        </div>
        <div class="event-body">
          <div class="event-desc">${ev.description||''}</div>
          <div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:6px"><span>Progress</span><span>${ev.current_progress||0}/${ev.quest_requirement}</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>
          <div class="event-rewards">
            ${ev.xp_reward>0?`<div class="event-reward" style="color:var(--accent2);border-color:rgba(168,85,247,.3);background:rgba(168,85,247,.08)">⚡ ${ev.xp_reward} XP</div>`:''}
            <div class="event-reward" style="color:var(--coin);border-color:rgba(245,158,11,.3);background:rgba(245,158,11,.08)">🪙 ${ev.coins_reward}</div>
          </div>
          ${isDone
            ? `<div class="event-joined-badge">✅ Completed!</div>`
            : isJoined
              ? `<button class="event-join-btn" style="background:linear-gradient(135deg,var(--green),#34d399)" onclick="contributeToEvent('${ev.id}',${ev.xp_reward},${ev.coins_reward},${ev.quest_requirement},${ev.current_progress||0})">⚡ Contribute</button>`
              : `<button class="event-join-btn" onclick="joinEvent('${ev.id}')">Join Event</button>`}
        </div>
      </div>`;
    }).join('');
  } catch(e) { console.error(e); }
}

window.joinEvent = async (eventId) => {
  await sb.from('event_participants').insert({ event_id: eventId, user_id: user.id, is_completed: false });
  toast('🎪 Joined the event!', 'green'); renderEvents();
};

window.contributeToEvent = async (eventId, xpRew, coinsRew, goal, current) => {
  await sb.from('event_participants').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('event_id', eventId).eq('user_id', user.id);
  const newProg = parseInt(current) + 1;
  await sb.from('events').update({ current_progress: newProg }).eq('id', eventId);
  if (newProg >= parseInt(goal)) { await giveXP(parseInt(xpRew), null, profile.role); await awardCurrency(0, parseInt(coinsRew)); toast(`🎪 Event Complete! +${xpRew}XP 🪙${coinsRew}`, 'gem'); }
  else toast('⚡ Progress contributed!', 'green');
  renderEvents();
};

// ─── BOSS FIGHTS ──────────────────────────────
async function renderBossFights() {
  const el = id('boss-list'); if (!el) return;
  try {
    const { data: bosses } = await sb.from('boss_fights').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (!bosses?.length) { el.innerHTML = empty('🐉', 'No active bosses. A challenger approaches...'); return; }
    const { data: myHits } = await sb.from('boss_participants').select('*').eq('user_id', user.id);
    el.innerHTML = bosses.map(boss => {
      const hpPct = Math.round((boss.current_hp / boss.total_hp) * 100);
      const myDmg = (myHits||[]).find(h => h.boss_id === boss.id);
      const isDefeated = boss.is_defeated || boss.current_hp <= 0;
      return `<div class="boss-card">
        <div class="boss-icon">${boss.boss_icon||'🐉'}</div>
        <div class="boss-name">${boss.title}</div>
        <div class="boss-desc">${boss.description||''}</div>
        <div class="boss-hp-label"><span>💀 BOSS HP</span><span>${boss.current_hp.toLocaleString()} / ${boss.total_hp.toLocaleString()}</span></div>
        <div class="boss-hp-track"><div class="boss-hp-fill" style="width:${hpPct}%"></div></div>
        <div class="boss-stats-row">
          <div class="boss-stat"><div class="boss-stat-val">${boss.xp_per_hit}</div><div class="boss-stat-lbl">XP/HIT</div></div>
          <div class="boss-stat"><div class="boss-stat-val">${myDmg?.damage_dealt||0}</div><div class="boss-stat-lbl">YOUR HITS</div></div>
          <div class="boss-stat"><div class="boss-stat-val">${boss.coins_reward}</div><div class="boss-stat-lbl">🪙 REWARD</div></div>
        </div>
        ${isDefeated
          ? `<div class="boss-defeated">💀 BOSS DEFEATED! 🎉</div>`
          : `<button class="boss-attack-btn" onclick="attackBoss('${boss.id}',${boss.xp_per_hit},${boss.current_hp},${boss.xp_reward},${boss.coins_reward})">⚔️ ATTACK!</button>`}
      </div>`;
    }).join('');
  } catch(e) {}
}

window.attackBoss = async (bossId, xpPerHit, currentHp, totalXpRew, coinsRew) => {
  if (currentHp <= 0) { toast('Boss already defeated!', 'green'); return; }
  const newHp = Math.max(0, currentHp - 50), isDefeated = newHp <= 0;
  await sb.from('boss_fights').update({ current_hp: newHp, is_defeated: isDefeated }).eq('id', bossId);
  try {
    const { data: ex } = await sb.from('boss_participants').select('*').eq('boss_id', bossId).eq('user_id', user.id).single();
    if (ex) await sb.from('boss_participants').update({ damage_dealt: ex.damage_dealt + 50, last_hit_at: new Date().toISOString() }).eq('id', ex.id);
    else     await sb.from('boss_participants').insert({ boss_id: bossId, user_id: user.id, damage_dealt: 50, last_hit_at: new Date().toISOString() });
  } catch(e) { await sb.from('boss_participants').insert({ boss_id: bossId, user_id: user.id, damage_dealt: 50, last_hit_at: new Date().toISOString() }); }
  await giveXP(xpPerHit, 'discipline', profile.role || 'warrior');
  toast(`⚔️ Hit! -50 HP! +${xpPerHit}XP`);
  if (isDefeated) { await awardCurrency(0, coinsRew); await giveXP(totalXpRew, null, profile.role); setTimeout(() => toast(`🎉 BOSS DEFEATED! +${totalXpRew}XP 🪙${coinsRew}!`, 'gem'), 500); }
  renderBossFights();
};

// ─── SKILL MANUALS ────────────────────────────
async function renderManuals() {
  const catEl = id('manual-categories'), listEl = id('manuals-list'); if (!catEl || !listEl) return;
  try {
    const { data: manuals } = await sb.from('skill_manuals').select('*').eq('is_active', true).order('category');
    const { data: completed } = await sb.from('manual_completions').select('manual_id').eq('user_id', user.id);
    const doneIds = (completed || []).map(c => c.manual_id);
    const categories = ['all', ...new Set((manuals||[]).map(m => m.category))];
    catEl.innerHTML = categories.map(cat =>
      `<button class="manual-cat-btn ${cat===currentManualCategory?'active':''}" onclick="filterManuals('${cat}',this)">${cat==='all'?'📚 All':cat==='breathing'?'🫁 Breathing':cat==='meditation'?'🧘 Meditation':cat==='daily_essentials'?'📋 Essentials':cat==='period_advice'?'🌸 Cycle':cat==='self_improvement'?'🎯 Growth':cap(cat)}</button>`
    ).join('');
    const filtered = (currentManualCategory === 'all' ? (manuals||[]) : (manuals||[]).filter(m => m.category === currentManualCategory)).filter(m => m.category !== 'period_advice' || profile?.gender === 'female');
    listEl.innerHTML = filtered.map(m => {
      const dc = DIFF_CONFIG[m.difficulty||'medium'] || DIFF_CONFIG.medium;
      return `<div class="manual-card ${doneIds.includes(m.id)?'completed':''}" onclick="openManual('${m.id}')">
        <div class="manual-icon">${m.icon||'📚'}</div>
        <div class="manual-info"><div class="manual-title">${m.title}</div><div class="manual-meta"><span class="diff-badge ${dc.cls}">${dc.icon}</span><span style="font-size:10px;color:var(--text3)">⏱ ${m.read_time_mins} min</span></div></div>
        <div style="text-align:right;flex-shrink:0">${doneIds.includes(m.id)?'<div style="color:var(--green);font-size:20px">✅</div>':`<div style="font-size:12px;color:var(--accent2);font-weight:700">+🪙${m.coins_reward}</div>`}</div>
      </div>`;
    }).join('');
  } catch(e) {}
}

window.filterManuals = (cat, btn) => {
  currentManualCategory = cat;
  document.querySelectorAll('.manual-cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); renderManuals();
};

window.openManual = async (manualId) => {
  const { data: manual } = await sb.from('skill_manuals').select('*').eq('id', manualId).single();
  if (!manual) return;
  const { data: comp } = await sb.from('manual_completions').select('id').eq('user_id', user.id).eq('manual_id', manualId).single().catch(() => ({ data: null }));
  const isCompleted = !!comp;
  id('manual-modal-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="font-size:36px">${manual.icon||'📚'}</div>
      <div><div style="font-family:'Orbitron',monospace;font-size:15px;font-weight:900;color:var(--text)">${manual.title}</div><div style="font-size:11px;color:var(--text2);margin-top:4px">⏱ ${manual.read_time_mins} min • ${cap(manual.category)}</div></div>
    </div>
    <div class="manual-content">${manual.content||'No content yet.'}</div>
    ${isCompleted
      ? `<div style="text-align:center;padding:16px;color:var(--green);font-weight:700;font-size:14px">✅ Completed!</div>`
      : `<button class="manual-complete-btn" onclick="completeManual('${manual.id}',${manual.xp_reward},${manual.coins_reward})">✅ MARK AS READ (+${manual.xp_reward} XP +🪙${manual.coins_reward})</button>`}
    <button class="btn-secondary" onclick="closeModal('manual-modal')" style="margin-top:10px">Close</button>`;
  show('manual-modal');
};

window.completeManual = async (manualId, xpRew, coinsRew) => {
  await sb.from('manual_completions').insert({ user_id: user.id, manual_id: manualId });
  await giveXP(xpRew, 'knowledge', profile.role || 'warrior');
  await awardCurrency(0, coinsRew);
  toast(`📚 Manual complete! +${xpRew}XP 🪙${coinsRew}`, 'green');
  closeModal('manual-modal'); renderManuals();
};

// ─── AVATAR FRAMES ────────────────────────────
async function renderFramesSection() {
  const el = id('frames-list'); if (!el) return;
  const rs = getRankInfo(profile.xp || 0);
  const activeFrame = profile.active_frame || 'rank';

  // Build list of rank frames unlocked so far
  const unlockedTierIdx = rs.tierIndex;
  const rankFrames = RANK_TIERS.slice(0, unlockedTierIdx + 1).map(t => ({
    id: t.frame, name: t.name + ' Frame', icon: t.icon, source: 'rank'
  }));

  // Summon frames from owned legendary/mythic summons
  let summonFrames = [];
  try {
    const { data: ownedSummons } = await sb.from('player_summons').select('*,shop_summons(name,frame_class,rarity,has_frame)').eq('user_id', user.id);
    summonFrames = (ownedSummons || [])
      .filter(ps => ps.shop_summons?.has_frame && ps.shop_summons?.frame_class)
      .map(ps => ({ id: ps.shop_summons.frame_class, name: ps.shop_summons.name + ' Frame', icon: ps.shop_summons.rarity === 'legendary' ? '🌟' : '🔥', source: 'summon' }));
  } catch(e) {}

  const allFrames = [{ id: 'rank', name: 'Current Rank Frame', icon: rs.icon, source: 'auto' }, ...rankFrames, ...summonFrames];
  const currentFrame = activeFrame === 'rank' ? rs.frame : activeFrame;

  el.innerHTML = `
    <div style="font-size:12px;color:var(--text2);margin-bottom:16px;line-height:1.6">Your frame updates automatically as you rank up. You can also equip a frame from your summons.</div>
    <div class="sec-title">RANK FRAMES</div>
    <div class="frames-row">
      ${allFrames.filter(f => f.source === 'auto' || f.source === 'rank').map(f => `
        <div class="frame-item">
          <div class="frame-option ${f.id===activeFrame?'active-frame':''} ${f.id===activeFrame?'selected-frame':''}" onclick="selectFrame('${f.id}')" style="${getFramePreviewStyle(f.id)}">
            <span style="font-size:20px">${f.icon}</span>
          </div>
          <div class="frame-label">${f.name}</div>
        </div>`).join('')}
    </div>
    ${summonFrames.length > 0 ? `
      <div class="sec-title" style="margin-top:16px">SUMMON FRAMES</div>
      <div class="frames-row">
        ${summonFrames.map(f => `
          <div class="frame-item">
            <div class="frame-option ${f.id===activeFrame?'active-frame selected-frame':''}" onclick="selectFrame('${f.id}')" style="${getFramePreviewStyle(f.id)}">
              <span style="font-size:20px">${f.icon}</span>
            </div>
            <div class="frame-label">${f.name}</div>
          </div>`).join('')}
      </div>` : ''}
    <div id="frame-sub-info" style="font-size:12px;color:var(--accent2);text-align:center;margin-top:12px">${activeFrame==='rank'?'Auto-updating with your rank':'Custom frame equipped'}</div>`;

  const frameSub = id('frame-sub');
  if (frameSub) frameSub.textContent = activeFrame === 'rank' ? 'Auto rank frame' : 'Custom frame equipped';
}

function getFramePreviewStyle(frameId) {
  const styles = {
    'rank':             'border-color:var(--accent2)',
    'frame-bronze':     'border-color:#cd7f32;box-shadow:0 0 8px rgba(205,127,50,.4)',
    'frame-silver':     'border-color:#e8e8e8;box-shadow:0 0 8px rgba(192,192,192,.4)',
    'frame-gold':       'border-color:#ffd700;box-shadow:0 0 8px rgba(255,215,0,.5)',
    'frame-platinum':   'border-color:#60a5fa;box-shadow:0 0 8px rgba(96,165,250,.5)',
    'frame-diamond':    'border-color:#67e8f9;box-shadow:0 0 8px rgba(103,232,249,.5)',
    'frame-master':     'border-color:#818cf8;box-shadow:0 0 8px rgba(99,102,241,.6)',
    'frame-grandmaster':'border-color:#a855f7;box-shadow:0 0 8px rgba(124,58,237,.7)',
    'frame-legendary':  'border-color:#f59e0b;box-shadow:0 0 10px rgba(245,158,11,.7)',
    'frame-mythic':     'border-color:#ef4444;box-shadow:0 0 10px rgba(239,68,68,.7)',
    'frame-ascended':   'border-color:#a855f7;box-shadow:0 0 12px rgba(168,85,247,.8)',
    'frame-transcendent':'border-color:#fff;box-shadow:0 0 12px rgba(255,255,255,.6)'
  };
  return styles[frameId] || 'border-color:var(--border)';
}

window.selectFrame = async (frameId) => {
  await sb.from('profiles').update({ active_frame: frameId }).eq('id', user.id);
  profile.active_frame = frameId;
  applyFrame();
  renderFramesSection();
  toast('🖼️ Frame equipped!', 'green');
};

// ─── SUMMONS (Custom AI) ──────────────────────
let currentSummonData = null, currentSummonImageBase64 = null, currentSummonMediaType = null;

async function loadUserSummon() {
  const sub = id('summon-status-sub'); if (!profile) return;
  try {
    const { data: summons } = await sb.from('summons').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    const summon = summons?.[0] || null;
    if (summon && sub) sub.textContent = summon.name + ' — Bond Lv ' + summon.bond_level;
    else if (sub) sub.textContent = 'No companion yet';
    return summon;
  } catch(e) { return null; }
}

async function renderSummonSection() {
  const el = id('summon-content-inner'); if (!el) return;
  const summon = await loadUserSummon();
  if (!summon) {
    el.innerHTML = `<div class="summon-empty">
      <div class="summon-empty-icon">🔮</div>
      <div style="font-family:'Orbitron',monospace;font-size:14px;color:var(--accent2);font-weight:900;margin-bottom:8px">No Companion Yet</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6">Upload an image and AI will bring your companion to life.</div>
      <button class="btn-summon" onclick="openSummonModal()">🔮 SUMMON A COMPANION</button>
    </div>`;
    return;
  }
  const bondPct = Math.min(100, Math.round(((summon.bond_xp || 0) % 100)));
  el.innerHTML = `<div class="summon-card">
    <div style="display:flex;gap:16px;align-items:flex-start">
      ${summon.image_url ? `<img class="summon-avatar" src="${summon.image_url}"/>` : `<div class="summon-avatar-placeholder">🔮</div>`}
      <div style="flex:1;min-width:0">
        <div class="summon-name">${summon.name}</div>
        <div class="summon-class">⚔️ ${summon.class}</div>
        <div class="summon-race">🧬 ${summon.race}</div>
        <div class="summon-desc">${summon.description}</div>
      </div>
    </div>
    <div class="summon-bond">
      <div class="summon-bond-label">BOND LEVEL ${summon.bond_level} — ${summon.bond_xp} XP</div>
      <div class="summon-bond-track"><div class="summon-bond-fill" style="width:${bondPct}%"></div></div>
    </div>
  </div>
  <button class="btn-regen" onclick="openSummonModal()">+ Summon Another Companion</button>`;
}

window.openSummonModal = () => {
  currentSummonData = null; currentSummonImageBase64 = null; currentSummonMediaType = null;
  id('summon-modal-title').textContent = '🔮 Summon a Companion';
  renderSummonStep1(); show('summon-modal');
};

function renderSummonStep1() {
  id('summon-modal-body').innerHTML = `
    <div style="text-align:center;padding:12px 0">
      <div style="font-size:40px;margin-bottom:12px">🖼️</div>
      <div style="font-size:14px;color:var(--text2);margin-bottom:20px;line-height:1.6">Upload an image of your companion.<br/>AI will generate its identity.</div>
      <input type="file" id="summon-img-input" accept="image/*" style="display:none" onchange="onSummonImageSelected(event)"/>
      <button class="btn-summon" onclick="document.getElementById('summon-img-input').click()">📷 CHOOSE IMAGE</button>
      <div class="manual-override-btn" onclick="renderSummonManual()">Enter details manually instead</div>
    </div>`;
}

window.onSummonImageSelected = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const mediaType = file.type || 'image/jpeg';
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result, base64 = dataUrl.split(',')[1];
    currentSummonImageBase64 = base64; currentSummonMediaType = mediaType;
    id('summon-modal-body').innerHTML = `
      <div class="summon-preview" style="text-align:center">
        <img class="summon-preview-img" src="${dataUrl}"/><br/>
        <div style="font-size:13px;color:var(--text2);margin-bottom:12px">Image selected!</div>
      </div>
      <div class="summon-loading">✨ GENERATING IDENTITY...</div>`;
    await generateSummonWithAI(base64, mediaType, dataUrl);
  };
  reader.readAsDataURL(file);
};

async function generateSummonWithAI(base64, mediaType, previewUrl) {
  try {
    const text = await callAI([{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: 'Generate a companion identity for this image for a self-improvement RPG app called LevelUp Life. Return ONLY valid JSON with exactly these fields: name (1-2 powerful words), class (Warrior/Mage/Assassin/Healer/Creator/Strategist/Guardian/Shadow), race (Human/Beast/Spirit/Dragon/Hybrid/Ancient/Phantom), description (2-3 lines about personality and how this companion helps the user grow). Keep it short and meaningful.' }
    ]}]);
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { currentSummonData = JSON.parse(match[0]); renderSummonPreview(currentSummonData, previewUrl); }
    else throw new Error('No JSON');
  } catch(err) {
    console.error('AI summon error:', err);
    renderSummonManualWithImage(previewUrl);
    toast('AI failed — enter details manually', 'red');
  }
}

function renderSummonPreview(data, previewUrl) {
  id('summon-modal-body').innerHTML = `
    <div class="summon-preview" style="text-align:center">
      ${previewUrl ? `<img class="summon-preview-img" src="${previewUrl}"/>` : '<div style="font-size:40px;margin-bottom:12px">🔮</div>'}
      <div class="summon-name">${data.name||'Unknown'}</div>
      <div class="summon-class">⚔️ ${data.class||'Warrior'}</div>
      <div class="summon-race">🧬 ${data.race||'Spirit'}</div>
      <div class="summon-desc" style="text-align:left;margin-top:10px">${data.description||''}</div>
    </div>
    <button class="btn-summon" onclick="saveSummon()">✨ CONFIRM SUMMON</button>
    <button class="btn-regen" onclick="renderSummonStep1()">🔄 Choose Different Image</button>
    <div class="manual-override-btn" onclick="renderSummonManualWithImage('${previewUrl||''}')">Edit details manually</div>`;
}

function renderSummonManual() {
  currentSummonImageBase64 = null;
  id('summon-modal-body').innerHTML = `
    <div class="form-group"><label>Name</label><input type="text" id="sm-name" placeholder="e.g. Shadow Fang"/></div>
    <div class="form-group"><label>Class</label><select id="sm-class"><option>Warrior</option><option>Mage</option><option>Assassin</option><option>Healer</option><option>Creator</option><option>Strategist</option><option>Guardian</option><option>Shadow</option></select></div>
    <div class="form-group"><label>Race</label><select id="sm-race"><option>Human</option><option>Beast</option><option>Spirit</option><option>Dragon</option><option>Hybrid</option><option>Ancient</option><option>Phantom</option></select></div>
    <div class="form-group"><label>Description</label><textarea id="sm-desc" placeholder="Describe your companion..." style="min-height:80px"></textarea></div>
    <button class="btn-summon" onclick="saveSummonManual()">✨ SUMMON</button>
    <button class="btn-regen" onclick="renderSummonStep1()">← Back</button>`;
}

function renderSummonManualWithImage(previewUrl) {
  id('summon-modal-body').innerHTML = `
    ${previewUrl ? `<div style="text-align:center;margin-bottom:12px"><img src="${previewUrl}" style="width:80px;height:80px;border-radius:14px;object-fit:cover;border:2px solid var(--accent2)"/></div>` : ''}
    <div class="form-group"><label>Name</label><input type="text" id="sm-name" placeholder="e.g. Shadow Fang" value="${currentSummonData?.name||''}"/></div>
    <div class="form-group"><label>Class</label><select id="sm-class"><option>Warrior</option><option>Mage</option><option>Assassin</option><option>Healer</option><option>Creator</option><option>Strategist</option><option>Guardian</option><option>Shadow</option></select></div>
    <div class="form-group"><label>Race</label><select id="sm-race"><option>Human</option><option>Beast</option><option>Spirit</option><option>Dragon</option><option>Hybrid</option><option>Ancient</option><option>Phantom</option></select></div>
    <div class="form-group"><label>Description</label><textarea id="sm-desc" style="min-height:80px">${currentSummonData?.description||''}</textarea></div>
    <button class="btn-summon" onclick="saveSummonManual()">✨ SUMMON</button>
    <button class="btn-regen" onclick="renderSummonStep1()">← Back</button>`;
  if (currentSummonData?.class) { const cls = id('sm-class'); if(cls) cls.value = currentSummonData.class; }
  if (currentSummonData?.race)  { const rc  = id('sm-race');  if(rc)  rc.value  = currentSummonData.race;  }
}

window.saveSummon = async () => {
  if (!currentSummonData) return;
  let imageUrl = null;
  if (currentSummonImageBase64 && currentSummonMediaType) imageUrl = await uploadSummonImage();
  await sb.from('summons').insert({ user_id: user.id, name: currentSummonData.name||'Companion', class: currentSummonData.class||'Warrior', race: currentSummonData.race||'Spirit', description: currentSummonData.description||'', image_url: imageUrl, bond_level: 1, bond_xp: 0, is_active: true });
  closeModal('summon-modal');
  toast('🔮 ' + (currentSummonData.name||'Companion') + ' summoned!', 'gem');
  renderSummonSection();
};

window.saveSummonManual = async () => {
  const name = val('sm-name'), cls = document.getElementById('sm-class')?.value || 'Warrior', race = document.getElementById('sm-race')?.value || 'Spirit', desc = document.getElementById('sm-desc')?.value?.trim() || '';
  if (!name) { toast('Enter a name!', 'red'); return; }
  let imageUrl = null;
  if (currentSummonImageBase64 && currentSummonMediaType) imageUrl = await uploadSummonImage();
  await sb.from('summons').insert({ user_id: user.id, name, class: cls, race, description: desc, image_url: imageUrl, bond_level: 1, bond_xp: 0, is_active: true });
  closeModal('summon-modal');
  toast('🔮 ' + name + ' summoned!', 'gem');
  renderSummonSection();
};

async function uploadSummonImage() {
  if (!currentSummonImageBase64) return null;
  try {
    const byteStr = atob(currentSummonImageBase64), arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    const ext = (currentSummonMediaType.split('/')[1] || 'jpg'), blob = new Blob([arr], { type: currentSummonMediaType });
    const path = user.id + '/summon_' + Date.now() + '.' + ext;
    const upRes = await sb.storage.from('avatars').upload(path, blob, { upsert: true });
    if (upRes.error) return null;
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
  } catch(e) { return null; }
}

async function growSummonBond(amount) {
  if (!user || !profile) return;
  try {
    const { data: summons } = await sb.from('summons').select('*').eq('user_id', user.id).eq('is_active', true);
    if (!summons?.length) return;
    for (const summon of summons) {
      const newBondXP = Math.min(1000, Math.max(0, (summon.bond_xp || 0) + amount));
      const newBondLv = Math.floor(newBondXP / 100) + 1;
      const leveledUp = newBondLv > (summon.bond_level || 1) && amount > 0;
      const bondPct   = Math.round(newBondXP / 10);
      if (bondPct < 10 && amount < 0) setTimeout(() => toast(`⚠️ ${summon.name} bond is critical! ${bondPct}%`, 'red'), 500);
      if (newBondXP === 0) { await handlePetLeave(summon); continue; }
      await sb.from('summons').update({ bond_xp: newBondXP, bond_level: newBondLv }).eq('id', summon.id);
      if (leveledUp) toast(`🔮 ${summon.name} Bond Lv ${newBondLv}!`, 'gem');
    }
    await loadActiveSummons();
  } catch(e) {}
}

async function handlePetLeave(summon) {
  await sb.from('summons').update({ is_active: false }).eq('id', summon.id);
  await loadActiveSummons();
  await sb.from('profiles').update({ comeback_active: true }).eq('id', user.id);
  profile.comeback_active = true;
  toast(`💔 ${summon.name} has left. Complete comeback quests to bring them back.`, 'red');
  await startComebackSession();
}

async function startComebackSession() {
  try {
    const { data: existing } = await sb.from('comeback_sessions').select('*').eq('user_id', user.id).eq('is_complete', false).single();
    if (existing) return;
    await sb.from('comeback_sessions').insert({ user_id: user.id });
    await sb.from('daily_quests').insert([
      { user_id: user.id, title: 'Complete 1 small task right now', quest_type: 'todo', skill_category: 'mindset', xp_reward: 50, quest_date: getToday(), is_completed: false, difficulty: 'easy' },
      { user_id: user.id, title: 'Drink a glass of water', quest_type: 'todo', skill_category: 'discipline', xp_reward: 50, quest_date: getToday(), is_completed: false, difficulty: 'easy' },
      { user_id: user.id, title: 'Write one sentence in your journal', quest_type: 'todo', skill_category: 'mindset', xp_reward: 50, quest_date: getToday(), is_completed: false, difficulty: 'easy' }
    ]);
    dailyQuests = []; await loadAllData();
    toast('🔄 Comeback quests added!', 'green');
  } catch(e) {}
}

// ─── SHOP ─────────────────────────────────────
let shopFilter = 'all', shopSummons = [], playerOwnedSummons = [];

async function renderShopSection() {
  const el = id('shop-summons-list'); if (!el) return;
  el.innerHTML = `<div style="color:var(--text2);font-size:13px;padding:12px;text-align:center">Loading...</div>`;
  try {
    const [sRes, pRes] = await Promise.all([
      sb.from('shop_summons').select('*').eq('is_available', true).order('rarity'),
      sb.from('player_summons').select('*').eq('user_id', user.id)
    ]);
    shopSummons = sRes.data || []; playerOwnedSummons = pRes.data || [];
    const ownedIds = playerOwnedSummons.map(p => p.summon_id);
    let filtered = shopFilter === 'all' ? shopSummons : shopSummons.filter(s => s.rarity === shopFilter);
    if (!filtered.length) { el.innerHTML = empty('🔮', 'No summons in this category yet'); return; }

    let html = `<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);padding:4px 0 12px"><span>Your balance:</span><span>💎 ${profile.gems||0} • 🪙 ${profile.coins||0}</span></div>`;
    filtered.forEach(s => {
      const owned = ownedIds.includes(s.id);
      const meetsReqs = (profile.xp||0) >= (s.unlock_xp||0);
      const imgHtml = s.image_url ? `<img class="summon-img" src="${s.image_url}"/>` : `<div class="summon-img-placeholder">🔮</div>`;
      const rarityClass = 'rarity-' + s.rarity;
      html += `<div class="shop-summon-card ${rarityClass}">
        <div style="display:flex;gap:14px;padding:14px;align-items:flex-start">
          ${imgHtml}
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
              <span style="font-family:'Orbitron',monospace;font-size:14px;font-weight:900;color:var(--text)">${s.name}</span>
              <span class="rarity-badge ${rarityClass}">${cap(s.rarity)}</span>
            </div>
            <div style="font-size:11px;color:var(--text2);margin-bottom:3px">⚔️ ${s.class} • 🧬 ${s.race}</div>
            <div style="font-size:12px;color:var(--text2);margin-bottom:6px;line-height:1.5">${s.description||''}</div>
            ${s.special_effect ? `<div class="effect-tag">✨ ${s.special_effect}</div>` : ''}
            ${s.has_frame ? `<div class="effect-tag" style="margin-left:4px">🖼️ Includes Frame</div>` : ''}
            ${!meetsReqs && s.unlock_description ? `<div class="lock-tag">🔒 ${s.unlock_description}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;min-width:70px">
            ${owned
              ? `<button class="btn-purchase owned">✅ Owned</button>`
              : !meetsReqs
                ? `<button class="btn-purchase locked">🔒 Locked</button>`
                : s.price_gems > 0
                  ? `<button class="btn-purchase gems" onclick="purchaseSummon('${s.id}')">💎 ${s.price_gems}</button>`
                  : `<button class="btn-purchase" onclick="purchaseSummon('${s.id}')">🪙 ${s.price_coins}</button>`}
          </div>
        </div>
      </div>`;
    });
    el.innerHTML = html;
  } catch(e) { el.innerHTML = empty('🔮', 'Failed to load shop'); console.error(e); }
}

window.filterShop = (filter, btn) => {
  shopFilter = filter;
  document.querySelectorAll('#shop-rarity-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); renderShopSection();
};

window.purchaseSummon = async (summonId) => {
  const summon = shopSummons.find(s => s.id === summonId); if (!summon) return;
  if (summon.price_gems > 0) {
    if ((profile.gems||0) < summon.price_gems) { toast(`Not enough gems! Need 💎${summon.price_gems}`, 'red'); return; }
    await awardCurrency(-summon.price_gems, 0);
    toast(`💎 -${summon.price_gems} gems`);
  } else {
    if ((profile.coins||0) < summon.price_coins) { toast(`Not enough coins! Need 🪙${summon.price_coins}`, 'red'); return; }
    await awardCurrency(0, -summon.price_coins);
    toast(`🪙 -${summon.price_coins} coins`);
  }
  await sb.from('player_summons').insert({ user_id: user.id, summon_id: summonId, is_active: false, bond_level: 1, bond_xp: 0, obtained_from: 'shop' });
  // Unlock summon frame if it has one
  if (summon.has_frame && summon.frame_class) {
    await sb.from('player_frames').insert({ user_id: user.id, frame_id: summon.frame_class, frame_name: summon.name + ' Frame', frame_source: 'summon' }).catch(() => {});
  }
  toast(`🔮 ${summon.name} acquired!`, 'gem');
  renderTopbar(); renderHeroCard(); renderShopSection(); renderSummonInventory();
};

// ─── SUMMON INVENTORY ─────────────────────────
async function renderSummonInventory() {
  const el = id('inventory-list'); if (!el) return;
  try {
    const { data: owned } = await sb.from('player_summons').select('*,shop_summons(*)').eq('user_id', user.id).order('obtained_at', { ascending: false });
    const sub = id('inventory-sub'); if (sub) sub.textContent = (owned||[]).length + ' companion' + ((owned||[]).length !== 1 ? 's' : '');
    if (!owned?.length) { el.innerHTML = `<div class="empty"><div class="empty-icon">🔮</div><div>No summons yet.</div><div style="font-size:12px;color:var(--text3);margin-top:6px">Purchase summons from the store!</div></div>`; return; }
    el.innerHTML = owned.map(ps => {
      const s = ps.shop_summons; if (!s) return '';
      const bondPct = Math.min(100, (ps.bond_xp || 0) % 100);
      const rarityClass = 'rarity-' + (s.rarity || 'common');
      return `<div class="inv-summon-card ${ps.is_active?'active-summon':''}" onclick="toggleActiveSummon('${ps.id}',${ps.is_active})">
        ${s.image_url ? `<img class="inv-summon-img" src="${s.image_url}"/>` : `<div class="inv-summon-img" style="background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:24px">🔮</div>`}
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
            <span style="font-size:14px;font-weight:700;color:var(--text)">${s.name}</span>
            <span class="rarity-badge ${rarityClass}">${cap(s.rarity)}</span>
            ${ps.is_active ? '<span class="active-badge">ACTIVE</span>' : ''}
          </div>
          <div style="font-size:11px;color:var(--text2);margin-bottom:2px">⚔️ ${s.class} • 🧬 ${s.race}</div>
          ${s.special_effect ? `<div style="font-size:11px;color:var(--green)">✨ ${s.special_effect}</div>` : ''}
          <div style="font-size:10px;color:var(--text3);margin-top:4px">Bond Lv ${ps.bond_level} — ${ps.bond_xp} XP</div>
          <div class="bond-mini-track"><div class="bond-mini-fill" style="width:${bondPct}%"></div></div>
        </div>
        <div style="flex-shrink:0;font-size:20px;color:var(--text3)">${ps.is_active?'✅':'○'}</div>
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = empty('🔮', 'Failed to load inventory'); }
}

window.toggleActiveSummon = async (psId, isCurrentlyActive) => {
  if (isCurrentlyActive) {
    await sb.from('player_summons').update({ is_active: false }).eq('id', psId);
    await sb.from('profiles').update({ active_summon_id: null }).eq('id', user.id);
    profile.active_summon_id = null; toast('Summon deactivated');
  } else {
    await sb.from('player_summons').update({ is_active: false }).eq('user_id', user.id);
    await sb.from('player_summons').update({ is_active: true }).eq('id', psId);
    await sb.from('profiles').update({ active_summon_id: psId }).eq('id', user.id);
    profile.active_summon_id = psId; toast('🔮 Summon activated!', 'green');
  }
  renderSummonInventory();
};

// ─── ADMIN ────────────────────────────────────
async function renderAdmin() {
  const isAdmin = profile?.is_admin || user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  if (!isAdmin) { id('admin-wrap').innerHTML = `<div class="empty" style="padding-top:80px"><div class="empty-icon">🔒</div><div style="color:var(--red);font-family:'Orbitron',monospace;font-size:16px;font-weight:900;margin-bottom:8px">Access Denied</div><div>Host only area</div></div>`; return; }
  const [{ data: users }, { data: squests }, { data: comps }] = await Promise.all([
    sb.from('profiles').select('*'),
    sb.from('system_quests').select('*'),
    sb.from('user_system_quests').select('*').eq('is_completed', true)
  ]);
  const totalXP = (users||[]).reduce((a, u) => a + (u.xp||0), 0);
  let assignOptions = '<option value="">All Players</option>';
  (users||[]).forEach(u => { assignOptions += `<option value="${u.id}">${u.username||'Unknown'}</option>`; });
  let sqHtml = (squests||[]).length === 0 ? empty('📋', 'No system quests yet') : (squests||[]).map(q => adminQCard(q, users)).join('');
  let playersHtml = (users||[]).length === 0 ? empty('👤', 'No players yet') : [...(users||[])].sort((a,b) => (b.xp||0)-(a.xp||0)).map((u, i) => {
    const role = getRoleInfo(u.role||'warrior'), rs = getRankInfo(u.xp||0);
    return `<div class="player-card" onclick="viewPlayer('${u.id}')">
      <div class="player-card-top">
        <div class="player-av">${u.avatar_url?`<img src="${u.avatar_url}"/>`:'🧙'}</div>
        <div style="flex:1"><div class="player-name">${i===0?'🥇 ':''}${u.username||'Unknown'}${u.is_admin?' 👑':''}${u.gender==='female'?' 🌸':''}</div><div class="player-meta">${role.icon} ${role.name} • 🔥 ${u.streak||0} • 🪙${u.coins||0}</div></div>
        <div class="player-xp">${(u.xp||0).toLocaleString()} XP</div>
      </div>
      <div class="player-mini-stats">
        <div class="mini-stat"><div class="mini-val">${(u.xp||0).toLocaleString()}</div><div class="mini-lbl">XP</div></div>
        <div class="mini-stat"><div class="mini-val">${rs.fullName}</div><div class="mini-lbl">RANK</div></div>
        <div class="mini-stat"><div class="mini-val">${u.streak||0}</div><div class="mini-lbl">STREAK</div></div>
        <div class="mini-stat"><div class="mini-val" style="color:var(--coin)">${u.coins||0}</div><div class="mini-lbl">COINS</div></div>
      </div>
      <div class="view-profile-btn">View Full Profile →</div>
    </div>`;
  }).join('');

  id('admin-wrap').innerHTML = `
    <div class="admin-banner"><div class="admin-crown">👑</div><div><div class="admin-banner-title">HOST CONTROL PANEL</div><div class="admin-banner-sub">Welcome, ${profile.username}</div></div></div>
    <div class="admin-stats">
      <div class="astat"><div class="astat-val">${(users||[]).length}</div><div class="astat-lbl">PLAYERS</div></div>
      <div class="astat"><div class="astat-val">${(squests||[]).length}</div><div class="astat-lbl">QUESTS</div></div>
      <div class="astat"><div class="astat-val">${(comps||[]).length}</div><div class="astat-lbl">DONE</div></div>
      <div class="astat"><div class="astat-val">${totalXP.toLocaleString()}</div><div class="astat-lbl">TOTAL XP</div></div>
    </div>
    <div class="admin-tabs">
      <button class="admin-tab active" onclick="switchAdminTab('quests',this)">📋 Quests</button>
      <button class="admin-tab" onclick="switchAdminTab('players',this)">👥 Players</button>
      <button class="admin-tab" onclick="switchAdminTab('bosses',this)">🐉 Bosses</button>
      <button class="admin-tab" onclick="switchAdminTab('events',this)">🎪 Events</button>
      <button class="admin-tab" onclick="switchAdminTab('summons',this)">🔮 Summons</button>
      <button class="admin-tab" onclick="switchAdminTab('journals',this)">📖 Journals</button>
    </div>
    <div class="admin-section active" id="asec-quests">
      <div class="form-card">
        <div class="form-card-title">Create System Quest</div>
        <div class="form-group"><label>Title</label><input type="text" id="sq-title" placeholder="Quest title"/></div>
        <div class="form-group"><label>Description</label><textarea id="sq-desc" placeholder="Quest description..."></textarea></div>
        <div class="form-group"><label>XP Reward</label><input type="number" id="sq-xp" value="200" min="1"/></div>
        <div class="form-group"><label>Difficulty</label><select id="sq-diff"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></div>
        <div class="form-group"><label>Skill</label><select id="sq-skill-cat"><option value="fitness">Fitness</option><option value="mindset">Mindset</option><option value="knowledge">Knowledge</option><option value="discipline">Discipline</option><option value="creativity">Creativity</option><option value="social">Social</option></select></div>
        <div class="form-group"><label>Assign To</label><select id="sq-assign">${assignOptions}</select></div>
        <button class="btn-gold" onclick="createSQ()">CREATE QUEST</button>
      </div>
      <div class="sec-title">Active System Quests</div>
      <div id="admin-sq-list">${sqHtml}</div>
    </div>
    <div class="admin-section" id="asec-players"><div class="sec-title">All Players</div>${playersHtml}</div>
    <div class="admin-section" id="asec-bosses">
      <div class="form-card">
        <div class="form-card-title">Create Boss Fight</div>
        <div class="form-group"><label>Boss Name</label><input type="text" id="boss-name" placeholder="e.g. The Procrastination Dragon"/></div>
        <div class="form-group"><label>Description</label><textarea id="boss-desc" placeholder="What must players overcome?"></textarea></div>
        <div class="form-group"><label>Boss Icon</label><input type="text" id="boss-icon" placeholder="🐉" maxlength="2"/></div>
        <div class="form-group"><label>Total HP</label><input type="number" id="boss-hp" value="5000" min="100"/></div>
        <div class="form-group"><label>XP Per Hit</label><input type="number" id="boss-xp-hit" value="50" min="1"/></div>
        <div class="form-group"><label>Victory XP Reward</label><input type="number" id="boss-xp-reward" value="1000" min="50"/></div>
        <div class="form-group"><label>Victory Coins Reward</label><input type="number" id="boss-coins-reward" value="500" min="10"/></div>
        <div class="form-group"><label>End Date</label><input type="date" id="boss-end-date"/></div>
        <button class="btn-gold" onclick="createBoss()">CREATE BOSS</button>
      </div>
    </div>
    <div class="admin-section" id="asec-events">
      <div class="form-card">
        <div class="form-card-title">Create Event</div>
        <div class="form-group"><label>Event Title</label><input type="text" id="ev-title" placeholder="e.g. 7-Day Focus Challenge"/></div>
        <div class="form-group"><label>Description</label><textarea id="ev-desc" placeholder="What is this event about?"></textarea></div>
        <div class="form-group"><label>Type</label><select id="ev-type"><option value="community">Community</option><option value="guild">Guild</option><option value="seasonal">Seasonal</option></select></div>
        <div class="form-group"><label>Progress Goal</label><input type="number" id="ev-goal" value="100" min="1"/></div>
        <div class="form-group"><label>XP Reward</label><input type="number" id="ev-xp" value="500" min="10"/></div>
        <div class="form-group"><label>Coins Reward</label><input type="number" id="ev-coins" value="200" min="5"/></div>
        <div class="form-group"><label>Start Date</label><input type="date" id="ev-start"/></div>
        <div class="form-group"><label>End Date</label><input type="date" id="ev-end"/></div>
        <button class="btn-gold" onclick="createEvent()">CREATE EVENT</button>
      </div>
    </div>
    <div class="admin-section" id="asec-journals">
      <div class="form-card">
        <div class="form-card-title">📖 Read Player Journal</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:14px;line-height:1.6">
          Only read journals of players who gave you permission.
        </div>
        <div class="form-group">
          <label>Player Gmail</label>
          <input type="email" id="journal-player-email" placeholder="player@gmail.com"/>
        </div>
        <button class="btn-gold" onclick="adminReadJournal()">READ JOURNAL</button>
      </div>
      <div id="admin-journal-results"></div>
    </div>
    <div class="admin-section" id="asec-summons">
  <div class="form-card">
    <div class="form-card-title">🔮 Add New Summon to Shop</div>
    <div class="form-group"><label>Summon Image</label><input type="file" id="admin-summon-img" accept="image/*" style="width:100%;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--text)"/><div id="admin-summon-preview" style="margin-top:8px"></div></div>
    <button class="btn-ai" id="admin-ai-gen-btn" onclick="adminGenerateSummonAI()" style="margin-bottom:14px">✨ Generate with AI</button>
    <div class="form-group"><label>Name</label><input type="text" id="as-name" placeholder="e.g. Shadow Wolf"/></div>
    <div class="form-group"><label>Class</label><select id="as-class"><option>Warrior</option><option>Mage</option><option>Assassin</option><option>Healer</option><option>Creator</option><option>Strategist</option><option>Guardian</option><option>Shadow</option></select></div>
    <div class="form-group"><label>Race</label><select id="as-race"><option>Human</option><option>Beast</option><option>Spirit</option><option>Dragon</option><option>Hybrid</option><option>Ancient</option><option>Phantom</option><option>Elf</option><option>Orc</option><option>Dwarf</option></select></div>
    <div class="form-group"><label>Description</label><textarea id="as-desc" placeholder="Describe this summon..." style="min-height:70px"></textarea></div>
    <div class="form-group"><label>Rarity</label><select id="as-rarity"><option value="common">Common</option><option value="rare">Rare</option><option value="epic">Epic</option><option value="legendary">Legendary</option></select></div>

    <div class="sec-title" style="margin-top:16px">Abilities (up to 3, optional)</div>
    <div class="form-group"><label>Ability 1</label><select id="as-ability-type-1"><option value="">None</option><option value="xp_boost">+% All XP</option><option value="coin_boost">+% Coins</option><option value="skill_xp_boost">+% Skill XP</option><option value="energy_boost">+ Energy per Quest</option><option value="streak_shield">🛡️ Streak Guard</option></select></div>
    <div class="form-group"><label>Ability 1 Value</label><input type="number" id="as-ability-value-1" value="10" min="0"/></div>
    <div class="form-group hidden" id="as-ability-skill-wrap-1"><label>Ability 1 Skill</label><select id="as-ability-skill-1"><option value="fitness">Fitness</option><option value="mindset">Mindset</option><option value="knowledge">Knowledge</option><option value="discipline">Discipline</option><option value="creativity">Creativity</option><option value="social">Social</option></select></div>

    <div class="form-group"><label>Ability 2</label><select id="as-ability-type-2"><option value="">None</option><option value="xp_boost">+% All XP</option><option value="coin_boost">+% Coins</option><option value="skill_xp_boost">+% Skill XP</option><option value="energy_boost">+ Energy per Quest</option><option value="streak_shield">🛡️ Streak Guard</option></select></div>
    <div class="form-group"><label>Ability 2 Value</label><input type="number" id="as-ability-value-2" value="10" min="0"/></div>
    <div class="form-group hidden" id="as-ability-skill-wrap-2"><label>Ability 2 Skill</label><select id="as-ability-skill-2"><option value="fitness">Fitness</option><option value="mindset">Mindset</option><option value="knowledge">Knowledge</option><option value="discipline">Discipline</option><option value="creativity">Creativity</option><option value="social">Social</option></select></div>

    <div class="form-group"><label>Ability 3</label><select id="as-ability-type-3"><option value="">None</option><option value="xp_boost">+% All XP</option><option value="coin_boost">+% Coins</option><option value="skill_xp_boost">+% Skill XP</option><option value="energy_boost">+ Energy per Quest</option><option value="streak_shield">🛡️ Streak Guard</option></select></div>
    <div class="form-group"><label>Ability 3 Value</label><input type="number" id="as-ability-value-3" value="10" min="0"/></div>
    <div class="form-group hidden" id="as-ability-skill-wrap-3"><label>Ability 3 Skill</label><select id="as-ability-skill-3"><option value="fitness">Fitness</option><option value="mindset">Mindset</option><option value="knowledge">Knowledge</option><option value="discipline">Discipline</option><option value="creativity">Creativity</option><option value="social">Social</option></select></div>

    <div class="form-group"><label>Price (Coins)</label><input type="number" id="as-price-coins" value="1000" min="0"/></div>
    <div class="form-group"><label>Price (Gems) — 0 = coins only</label><input type="number" id="as-price-gems" value="0" min="0"/></div>
    <div class="form-group"><label>Min XP to unlock (0 = free)</label><input type="number" id="as-xp" value="0" min="0"/></div>
    <div class="form-group"><label>Unlock Description</label><input type="text" id="as-unlock-desc" placeholder="e.g. Reach Platinum rank"/></div>
    <div class="form-group"><label>Has Frame?</label><select id="as-has-frame"><option value="false">No</option><option value="true">Yes (legendary only)</option></select></div>
    <div class="form-group"><label>Frame Class (if has frame)</label><input type="text" id="as-frame-class" placeholder="e.g. frame-shadowwolf"/></div>
    <button class="btn-gold" onclick="adminAddSummon()">🔮 ADD SUMMON TO SHOP</button>
  </div>
  <div class="sec-title">Current Summons</div>
  <div id="admin-summons-list"></div>
</div>

  // Image preview listener
  document.addEventListener('change', (e) => {
    if (e.target?.id === 'admin-summon-img') {
      const file = e.target.files[0]; if (!file) return;
      const preview = id('admin-summon-preview'); if (!preview) return;
      const reader = new FileReader();
      reader.onload = (ev) => { preview.innerHTML = `<img src="${ev.target.result}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:2px solid var(--accent2)"/>`; };
      reader.readAsDataURL(file);
    }
  }, { once: true });
}

function adminQCard(q, users) {
  const au = q.assigned_to ? (users||[]).find(u => u.id === q.assigned_to) : null;
  return `<div class="sq-item">
    <div class="sq-info">
      <div class="sq-title">${q.title}</div>
      <div class="sq-desc">${q.description||'No description'}</div>
      <div class="sq-badges">
        <div class="sq-xp-badge">+${q.xp_reward} XP</div>
        <div class="sq-tag">${au?'👤 '+au.username:'👥 All'}</div>
        <div class="sq-tag" style="color:${q.is_active?'var(--green)':'var(--red)'}">● ${q.is_active?'Active':'Inactive'}</div>
      </div>
    </div>
    <div class="sq-actions">
      <button class="btn-icon del" onclick="deleteSQ('${q.id}')">🗑</button>
      <button class="btn-icon tog" onclick="toggleSQ('${q.id}',${q.is_active})">${q.is_active?'✓':'○'}</button>
    </div>
  </div>`;
}

window.adminReadJournal = async () => {
  const email = val('journal-player-email');
  if (!email) { toast('Enter a Gmail address!', 'red'); return; }
  const resultsEl = id('admin-journal-results');
  resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text2)">Loading...</div>';

  // Step 1: find the user by email
  const { data: found } = await sb.from('profiles')
    .select('id, username, avatar_url, xp')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (!found) {
    resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--red)">❌ No player found with that email.</div>';
    return;
  }

  // Step 2: load their journals (including soft-deleted)
  const { data: entries } = await sb.from('journal_entries')
    .select('*')
    .eq('user_id', found.id)
    .order('entry_date', { ascending: false });

  if (!entries || entries.length === 0) {
    resultsEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text2)">📭 This player has no journal entries yet.</div>';
    return;
  }

  const moodMap = { great:'😄', good:'🙂', okay:'😐', bad:'😔', awful:'😢' };

  resultsEl.innerHTML = `
    <div style="margin-top:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="font-size:28px">${found.avatar_url ? '<img src="'+found.avatar_url+'" style="width:36px;height:36px;border-radius:50%;object-fit:cover"/>' : '🧙'}</div>
        <div>
          <div style="font-family:'Orbitron',monospace;font-weight:700;color:var(--accent2)">${sanitize(found.username || 'Unknown')}</div>
          <div style="font-size:12px;color:var(--text2)">${entries.length} journal entries</div>
        </div>
      </div>
      ${entries.map(e => `
        <div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:12px;${e.is_deleted ? 'opacity:0.5;border-color:var(--red)' : ''}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-weight:700;color:var(--text);font-size:14px">${sanitize(e.title || 'Untitled')} ${e.is_deleted ? '<span style="color:var(--red);font-size:11px">[DELETED]</span>' : ''}</div>
            <div style="font-size:18px">${moodMap[e.mood] || '📝'}</div>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:10px">📅 ${e.entry_date || ''}</div>
          <div style="font-size:13px;color:var(--text2);line-height:1.6;white-space:pre-wrap">${sanitize(e.content || '')}</div>
          ${e.what_learned ? '<div style="margin-top:10px;font-size:12px;color:var(--accent2)">💡 Learned: '+sanitize(e.what_learned)+'</div>' : ''}
          ${e.lesson_learned ? '<div style="font-size:12px;color:var(--gold)">⚡ Lesson: '+sanitize(e.lesson_learned)+'</div>' : ''}
        </div>
      `).join('')}
    </div>`;
};

window.switchAdminTab = (tab, btn) => {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active')); btn.classList.add('active');
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  const sec = id('asec-' + tab); if (sec) sec.classList.add('active');
  if (tab === 'summons') loadAdminSummonsList();
};

window.createSQ = async () => {
  const title = val('sq-title'), desc = val('sq-desc'), xp = parseInt(val('sq-xp')) || 200;
  const diff = val('sq-diff') || 'medium', skill = val('sq-skill-cat') || 'discipline', assign = val('sq-assign') || null;
  if (!title) { toast('Enter a title!', 'red'); return; }
  await sb.from('system_quests').insert({ title, description: desc, xp_reward: xp, is_active: true, assigned_to: assign, difficulty: diff, skill_category: skill });
  toast('Quest created!', 'green'); await loadAllData(); renderAdmin();
};

window.deleteSQ = async (id_) => { await sb.from('system_quests').delete().eq('id', id_); toast('Quest deleted'); await loadAllData(); renderAdmin(); };
window.toggleSQ = async (id_, curr) => { await sb.from('system_quests').update({ is_active: !curr }).eq('id', id_); toast(curr?'Deactivated':'Activated', 'green'); await loadAllData(); renderAdmin(); };

window.createBoss = async () => {
  const title = val('boss-name'), desc = val('boss-desc'), icon = val('boss-icon') || '🐉';
  const hp = parseInt(val('boss-hp')) || 5000, xpHit = parseInt(val('boss-xp-hit')) || 50;
  const xpRew = parseInt(val('boss-xp-reward')) || 1000, coinsRew = parseInt(val('boss-coins-reward')) || 500;
  const endDate = val('boss-end-date') || null;
  if (!title) { toast('Enter boss name!', 'red'); return; }
  await sb.from('boss_fights').insert({ title, description: desc, boss_icon: icon, total_hp: hp, current_hp: hp, xp_per_hit: xpHit, xp_reward: xpRew, coins_reward: coinsRew, end_date: endDate, start_date: getToday(), is_active: true, is_defeated: false });
  toast('Boss created!', 'green'); renderAdmin();
};

window.createEvent = async () => {
  const title = val('ev-title'), desc = val('ev-desc'), type = val('ev-type');
  const goal = parseInt(val('ev-goal')) || 100, xpRew = parseInt(val('ev-xp')) || 500, coinsRew = parseInt(val('ev-coins')) || 200;
  const startDate = val('ev-start') || getToday(), endDate = val('ev-end') || null;
  if (!title) { toast('Enter event title!', 'red'); return; }
  await sb.from('events').insert({ title, description: desc, event_type: type, quest_requirement: goal, current_progress: 0, xp_reward: xpRew, coins_reward: coinsRew, gems_reward: 0, start_date: startDate, end_date: endDate, is_active: true });
  toast('Event created!', 'green'); renderAdmin();
};

window.viewPlayer = async (userId) => {
  const [{ data: p }, { data: quests }, { data: skills }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', userId).single(),
    sb.from('daily_quests').select('*').eq('user_id', userId).order('quest_date', { ascending: false }).limit(20),
    sb.from('skills').select('*').eq('user_id', userId)
  ]);
  if (!p) return;
  const rs = getRankInfo(p.xp || 0), role = getRoleInfo(p.role || 'warrior');
  const todayQ = (quests||[]).filter(q => q.quest_date === getToday());
  const todayDone = todayQ.filter(q => q.is_completed).length;
  const sorted = [...(skills||[])].sort((a, b) => (b.skill_xp||0) - (a.skill_xp||0));
  const badges = ['🥇','🥈','🥉'];
  id('admin-wrap').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:16px 0;cursor:pointer" onclick="renderAdmin()">
      <span style="color:var(--accent2);font-size:20px">←</span>
      <span style="color:var(--text2);font-size:14px;font-weight:600">Back to Players</span>
    </div>
    <div class="profile-card" style="margin-bottom:16px">
      <div class="profile-bg"></div>
      <div class="profile-avatar-wrap"><div class="profile-avatar">${p.avatar_url?`<img src="${p.avatar_url}"/>`:'🧙'}</div></div>
      <div class="profile-name">${p.username||'Unknown'}${p.is_admin?' 👑':''}${p.gender==='female'?' 🌸':''}</div>
      <div style="display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:10px;font-size:12px;font-weight:700;margin-bottom:12px;color:${role.color};border:1px solid ${role.color}44;background:${role.color}11">${role.icon} ${role.name}</div>
      <div class="profile-email">${rs.fullName} • Joined ${new Date(p.created_at).toLocaleDateString()}</div>
      <div class="profile-stats">
        <div class="pstat"><div class="pstat-val">${(p.xp||0).toLocaleString()}</div><div class="pstat-lbl">XP</div></div>
        <div class="pstat"><div class="pstat-val">${p.streak||0}</div><div class="pstat-lbl">STREAK</div></div>
        <div class="pstat"><div class="pstat-val" style="color:var(--green)">${p.energy??100}</div><div class="pstat-lbl">ENERGY</div></div>
        <div class="pstat"><div class="pstat-val" style="color:var(--coin)">${p.coins||0}</div><div class="pstat-lbl">COINS</div></div>
        <div class="pstat"><div class="pstat-val" style="color:var(--gem)">${p.gems||0}</div><div class="pstat-lbl">GEMS</div></div>
      </div>
    </div>
    <div class="sec-title">Today</div>
    <div class="form-card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px"><span style="font-size:13px;color:var(--text2)">Completed today</span><span style="font-family:'Orbitron',monospace;color:var(--gold);font-weight:700">${todayDone}/${todayQ.length}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${todayQ.length>0?Math.round((todayDone/todayQ.length)*100):0}%"></div></div>
    </div>
    <div class="sec-title">Skills</div>
    <div class="skills-grid" style="margin-bottom:16px">
      ${sorted.map((s, i) => `<div class="skill-card ${i===0?'perf-gold':i===1?'perf-silver':i===2?'perf-bronze':''}">${i<3?`<div class="skill-top-badge">${badges[i]}</div>`:''}<div class="skill-icon">${SKILL_ICONS[s.skill_name]||'⭐'}</div><div class="skill-name">${cap(s.skill_name)}</div><div class="skill-lv">LV ${s.skill_level}</div><div class="skill-track"><div class="skill-fill" style="width:${(s.skill_xp||0)%100}%"></div></div></div>`).join('')}
    </div>
    <div class="sec-title">Admin Actions</div>
    <div class="form-card">
      <div class="form-card-title">Give Bonus to ${p.username||'Player'}</div>
      <div class="form-group"><label>XP Amount</label><input type="number" id="bonus-xp-amount" value="500" min="0"/></div>
      <div class="form-group"><label>Gems</label><input type="number" id="bonus-gems-amount" value="0" min="0"/></div>
      <div class="form-group"><label>Coins</label><input type="number" id="bonus-coins" value="100" min="0"/></div>
      <button class="btn-gold" onclick="giveBonusXP('${p.id}')">Give Reward</button>
    </div>`;
};

window.giveBonusXP = async (userId) => {
  const xp    = parseInt(val('bonus-xp-amount')) || 0;
  const gems  = parseInt(document.getElementById('bonus-gems-amount')?.value) || 0;
  const coins = parseInt(document.getElementById('bonus-coins')?.value) || 0;
  const { data: p } = await sb.from('profiles').select('xp,username,gems,coins').eq('id', userId).single();
  if (!p) return;
  await sb.from('profiles').update({ xp: (p.xp||0)+xp, gems: (p.gems||0)+gems, coins: (p.coins||0)+coins }).eq('id', userId);
  toast(`Gave ${xp?xp+' XP':''}${gems?' +'+gems+' gems':''}${coins?' +'+coins+' coins':''} to ${p.username||'player'}`, 'green');
  viewPlayer(userId);
};

async function loadAdminSummonsList() {
  const el = id('admin-summons-list'); if (!el) return;
  const { data: summons } = await sb.from('shop_summons').select('*').order('created_at', { ascending: false });
  if (!summons?.length) { el.innerHTML = empty('🔮', 'No summons added yet'); return; }
  el.innerHTML = summons.map(s => `
    <div class="sq-item">
      ${s.image_url?`<img src="${s.image_url}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0"/>`:`<div style="width:40px;height:40px;border-radius:8px;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🔮</div>`}
      <div class="sq-info">
        <div class="sq-title">${s.name}</div>
        <div class="sq-desc">${s.class} — ${cap(s.rarity)}${s.has_frame?' 🖼️ Frame':''}</div>
        <div class="sq-badges">
          <div class="sq-xp-badge">${s.price_gems>0?'💎 '+s.price_gems+' gems':'🪙 '+s.price_coins+' coins'}</div>
          <div class="sq-tag" style="color:${s.is_available?'var(--green)':'var(--red)'}">● ${s.is_available?'Available':'Hidden'}</div>
        </div>
      </div>
      <div class="sq-actions">
        <button class="btn-icon del" onclick="adminDeleteSummon('${s.id}')">🗑</button>
        <button class="btn-icon tog" onclick="adminToggleSummon('${s.id}',${s.is_available})">${s.is_available?'✓':'○'}</button>
      </div>
    </div>`).join('');
}

window.adminAddSummon = async () => {
  const imgInput = id('admin-summon-img');
  const name = val('as-name'), cls = val('as-class'), race = val('as-race'), desc = val('as-desc');
  const rarity = val('as-rarity') || 'common', priceCoins = parseInt(val('as-price-coins')) || 0;
  const priceGems = parseInt(val('as-price-gems')) || 0, unlockXP = parseInt(val('as-xp')) || 0;
  const unlockDesc = val('as-unlock-desc'), effect = val('as-effect');
  const hasFrame = document.getElementById('as-has-frame')?.value === 'true';
  const frameClass = val('as-frame-class') || null;
  if (!name) { toast('Enter a name!', 'red'); return; }
  toast('Uploading...', 'green');
  let imageUrl = null;
  if (imgInput?.files?.[0]) {
    const file = imgInput.files[0], ext = file.name.split('.').pop() || 'jpg';
    const path = Date.now() + '-' + name.replace(/\s/g,'_') + '.' + ext;
    const upRes = await sb.storage.from('summons').upload(path, file, { upsert: true });
    if (!upRes.error) imageUrl = sb.storage.from('summons').getPublicUrl(path).data.publicUrl;
  }
  await sb.from('shop_summons').insert({ name, description: desc, class: cls, race, image_url: imageUrl, rarity, price_coins: priceCoins, price_gems: priceGems, is_premium: priceGems > 0, unlock_xp: unlockXP, unlock_description: unlockDesc||null, special_effect: effect||null, has_frame: hasFrame, frame_class: frameClass, is_available: true, added_by: user.id });
  toast(`🔮 ${name} added to shop!`, 'green');
  loadAdminSummonsList();
};

window.adminDeleteSummon = async (id_) => { await sb.from('shop_summons').delete().eq('id', id_); toast('Summon deleted', 'red'); loadAdminSummonsList(); };
window.adminToggleSummon = async (id_, curr) => { await sb.from('shop_summons').update({ is_available: !curr }).eq('id', id_); toast(curr?'Summon hidden':'Summon visible', 'green'); loadAdminSummonsList(); };

// ─── KICK OFF ─────────────────────────────────
initApp().catch(emergencyShowAuth);

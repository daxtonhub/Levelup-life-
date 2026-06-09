// ══════════════════════════════════
// QUEST TAB RENDER
// ══════════════════════════════════
async function renderQuestsTab() {
  var el = id('quests-list');
  var total = dailyQuests.length, done = dailyQuests.filter(function(q){ return q.is_completed; }).length;
  var pct = total > 0 ? Math.round((done / total) * 100) : 0;
  id('q-progress-fill').style.width = pct + '%';
  id('q-progress-text').textContent = done + '/' + total + ' done';
  var uSQ = (await sb.from('user_system_quests').select('*').eq('user_id', user.id)).data;
  var doneIds = (uSQ || []).filter(function(x){ return x.is_completed; }).map(function(x){ return x.quest_id; });
  var list = [...dailyQuests];
  var sqList = systemQuests.map(function(q){ return Object.assign({}, q, { quest_type: 'system', skill_category: q.skill_category || 'system', is_completed: doneIds.includes(q.id) }); });
  if      (qFilter === 'all')       list = [...list, ...sqList];
  else if (qFilter === 'habit')     list = list.filter(function(q){ return q.quest_type === 'habit'; });
  else if (qFilter === 'todo')      list = list.filter(function(q){ return q.quest_type === 'todo'; });
  else if (qFilter === 'system')    list = sqList;
  else if (qFilter === 'period')    list = list.filter(function(q){ return q.quest_type === 'period' || q.skill_category === 'period'; });
  else if (qFilter === 'scheduled') {
    var future = (await sb.from('daily_quests').select('*').eq('user_id', user.id).gt('quest_date', today).order('quest_date', { ascending: true }).limit(20)).data;
    list = future || [];
  }
  if (!list.length) { el.innerHTML = empty('📋', qFilter === 'scheduled' ? 'No upcoming scheduled quests' : 'No quests here yet'); return; }
  el.innerHTML = list.map(function(q) {
    if (q.quest_type === 'system') {
      var dc = DIFF_CONFIG[q.difficulty || 'epic'];
      return '<div class="quest-card system-q ' + (q.is_completed ? 'done' : '') + '" onclick="completeSQ(\'' + q.id + '\',' + q.is_completed + ')"><div class="qcheck">' + (q.is_completed ? '✓' : '👑') + '</div><div class="qinfo"><div class="qtitle">' + q.title + '</div><div class="qmeta">👑 System Quest</div></div><div class="qxp">+' + q.xp_reward + ' XP</div></div>';
    }
    if (q.quest_date !== today) {
      var dc = DIFF_CONFIG[q.difficulty || 'spark'];
      return '<div class="quest-card" style="border-left-color:var(--blue);opacity:.8"><div class="qcheck" style="border-color:var(--blue)">🗓️</div><div class="qinfo"><div class="qtitle">' + q.title + '</div><div class="qmeta">📅 Starts ' + q.quest_date + ' <span class="diff-badge ' + dc.cls + '">' + dc.icon + ' ' + dc.label + '</span></div></div><div class="qxp">+' + q.xp_reward + ' XP</div></div>';
    }
    return questCard(q);
  }).join('');
}

// ══════════════════════════════════
// COMPLETE QUEST
// ══════════════════════════════════
window.completeQuest = async function(qid, skillCat, done, diff) {
  if (done) { toast('Already done! ✅'); return; }
  var q = dailyQuests.find(function(x){ return x.id === qid; });
  if (q) q.is_completed = true;
  var card = document.querySelector('[onclick*="' + qid + '"]');
  if (card) {
    card.classList.add('done');
    var check = card.querySelector('.qcheck'); if (check) check.textContent = '✓';
    var title = card.querySelector('.qtitle'); if (title) title.style.textDecoration = 'line-through';
  }
  var doneEl = id('hstat-done');
  if (doneEl) doneEl.textContent = dailyQuests.filter(function(q){ return q.is_completed; }).length;
  var dc = DIFF_CONFIG[diff || 'spark'];
  toast('+' + FIXED_XP + ' XP! 🪙' + dc.coins);
  showCurrencyPop(dc.coins);
  try {
    await sb.from('daily_quests').update({ is_completed: true, completion_count: 1 }).eq('id', qid);
    await giveXP(FIXED_XP, skillCat, profile.role || 'warrior');
    await awardCurrency(0, dc.coins);
    await checkStreak();
    await checkAchievements();
    growSummonBond(5);
  } catch (e) { console.error('Quest update error:', e); }
  renderTopbar();
  renderHeroCard();
  checkDailyBonusAvailable();
  var total2 = dailyQuests.length;
  var done2   = dailyQuests.filter(function(q){ return q.is_completed; }).length;
  var pct2    = total2 > 0 ? Math.round((done2 / total2) * 100) : 0;
  var pFill = id('q-progress-fill'), pText = id('q-progress-text');
  if (pFill) pFill.style.width = pct2 + '%';
  if (pText) pText.textContent = done2 + '/' + total2 + ' done';
};

window.completeSQ = async function(sqId, done) {
  if (done) { toast('Already done! ✅'); return; }
  var sq = systemQuests.find(function(q){ return q.id === sqId; }); if (!sq) return;
  var ex = (await sb.from('user_system_quests').select('id').eq('user_id', user.id).eq('quest_id', sqId).single().catch(function(){ return { data: null }; })).data;
  if (ex) await sb.from('user_system_quests').update({ is_completed: true, completed_at: new Date().toISOString() }).eq('id', ex.id);
  else    await sb.from('user_system_quests').insert({ user_id: user.id, quest_id: sqId, is_completed: true, completed_at: new Date().toISOString() });
  await giveXP(sq.xp_reward, null, profile.role || 'warrior');
  await awardCurrency(0, 50);
  showCurrencyPop(50);
  toast('👑 +' + sq.xp_reward + ' XP! 🪙50');
  await checkAchievements();
  renderAll();
};

// ══════════════════════════════════
// ADD QUEST
// ══════════════════════════════════
window.openAddQuest = function() { id('nq-date').value = today; show('add-quest-modal'); };

window.addQuest = async function() {
  var title     = val('nq-title'), type = val('nq-type'), diff = val('nq-difficulty') || 'epic', skill = val('nq-skill');
  var schedDate = val('nq-date') || today, schedTime = document.getElementById('nq-time').value || null;
  if (!title) { toast('Enter a title! ⚠️', 'red'); return; }
  var xpReward = diff === 'hard' ? 50 : diff === 'medium' ? 25 : 10;
  var res = await sb.from('daily_quests').insert({ user_id: user.id, title, quest_type: type, skill_category: skill, xp_reward: xpReward, quest_date: schedDate, is_completed: false, difficulty: diff, scheduled_time: schedTime, is_recurring: type === 'habit' }).select().single();
  if (res.data && schedDate === today) dailyQuests.push(res.data);
  closeModal('add-quest-modal');
  id('nq-title').value = '';
  toast(schedDate === today ? 'Quest created! 🎯' : 'Scheduled for ' + schedDate + '! 🗓️', 'green');
  renderAll();
};

window.filterQ = function(f, btn) {
  qFilter = f;
  document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  renderQuestsTab();
};

// ══════════════════════════════════
// JOURNAL
// ══════════════════════════════════
async function renderJournal() {
  var el = id('journal-list'); if (!el) return;
  try {
    var data = (await sb.from('journal_entries').select('*').eq('user_id', user.id).eq('is_deleted', false).order('entry_date', { ascending: false }).limit(30)).data;
    if (!data || !data.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">📖</div><div>No entries yet.</div><div style="font-size:12px;color:var(--text3);margin-top:6px">Start writing your story today.</div></div>'; return; }
    el.innerHTML = data.map(function(e){ return '<div class="journal-entry-card"><div class="je-delete-btn" onclick="softDeleteJournal(\'' + e.id + '\',event)">🗑</div><div onclick="viewJournalEntry(\'' + e.id + '\')"><div class="je-top"><div class="je-mood">' + (MOOD_ICONS[e.mood] || '🙂') + '</div><div class="je-title">' + (e.title || 'Untitled') + '</div><div class="je-date">' + formatDate(e.entry_date) + '</div></div><div class="je-preview">' + (e.content || '') + '</div><div class="je-footer">' + (e.what_learned ? '<div class="je-tag">📚 Learned</div>' : '') + (e.lesson_learned ? '<div class="je-tag">💡 Lesson</div>' : '') + '</div></div></div>'; }).join('');
  } catch (e) {}
}

window.openJournalModal = function() {
  id('je-title').value = ''; id('je-content').value = ''; id('je-learned').value = ''; id('je-lesson').value = '';
  selectedMood = 'okay';
  document.querySelectorAll('.mood-opt').forEach(function(m){ m.classList.toggle('selected', m.dataset.mood === 'okay'); });
  id('journal-modal-title').textContent = '✍️ ' + new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  show('journal-modal');
};

window.selectMood = function(el) {
  selectedMood = el.dataset.mood;
  document.querySelectorAll('.mood-opt').forEach(function(m){ m.classList.remove('selected'); });
  el.classList.add('selected');
};

window.saveJournalEntry = async function() {
  var title   = val('je-title') || 'Entry ' + today;
  var content = document.getElementById('je-content').value.trim();
  var learned = document.getElementById('je-learned').value.trim();
  var lesson  = document.getElementById('je-lesson').value.trim();
  if (!content) { toast('Write something first! ✍️', 'red'); return; }
  await sb.from('journal_entries').insert({ user_id: user.id, title, content, what_learned: learned || null, lesson_learned: lesson || null, mood: selectedMood, entry_date: today, is_deleted: false, restore_before: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() });
  await awardCurrency(0, 5);
  toast('Entry saved! 📖 +🪙5', 'green');
  closeModal('journal-modal');
  try {
    var allE    = (await sb.from('journal_entries').select('id').eq('user_id', user.id).eq('is_deleted', false)).data;
    var count   = (allE || []).length;
    var jAch    = (await sb.from('achievements').select('*').eq('requirement_type', 'journals_written')).data;
    var jEarned = (await sb.from('user_achievements').select('achievement_id').eq('user_id', user.id)).data;
    var jEarnedIds = (jEarned || []).map(function(e){ return e.achievement_id; });
    for (var i = 0; i < (jAch || []).length; i++) {
      var ach = jAch[i];
      if (!jEarnedIds.includes(ach.id) && count >= ach.requirement_value) {
        await sb.from('user_achievements').insert({ user_id: user.id, achievement_id: ach.id });
        await awardCurrency(0, ach.coins_reward || 0);
        toast('🏆 ' + ach.title + '!', 'gem');
      }
    }
  } catch (e) {}
  renderJournal();
};

window.softDeleteJournal = async function(entryId, event) {
  event.stopPropagation();
  await sb.from('journal_entries').update({ is_deleted: true, deleted_at: new Date().toISOString(), restore_before: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }).eq('id', entryId);
  toast('Moved to trash. Recoverable for 90 days 🗑');
  renderJournal();
};

window.toggleDeletedJournals = async function() {
  var el = id('deleted-journal-list'); if (!el) return;
  var isHidden = el.classList.contains('hidden');
  if (isHidden) {
    show('deleted-journal-list');
    var data = (await sb.from('journal_entries').select('*').eq('user_id', user.id).eq('is_deleted', true).order('deleted_at', { ascending: false })).data;
    if (!data || !data.length) { el.innerHTML = empty('🗑️', 'No deleted entries'); return; }
    el.innerHTML = data.map(function(e){ return '<div class="journal-entry-card" style="border:1px solid rgba(239,68,68,.2);opacity:.7"><div class="je-top"><div class="je-mood">' + (MOOD_ICONS[e.mood] || '🙂') + '</div><div class="je-title">' + (e.title || 'Untitled') + '</div><div class="je-date">Del. ' + formatDate(e.deleted_at) + '</div></div><div style="display:flex;gap:8px;margin-top:10px"><button onclick="restoreJournal(\'' + e.id + '\')" style="flex:1;padding:8px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:8px;color:var(--green);font-size:12px;font-weight:700;cursor:pointer">↩️ Restore</button><div style="font-size:11px;color:var(--text3);padding:8px;display:flex;align-items:center">Exp. ' + formatDate(e.restore_before) + '</div></div></div>'; }).join('');
  } else { hide('deleted-journal-list'); }
};

window.restoreJournal = async function(entryId) {
  await sb.from('journal_entries').update({ is_deleted: false, deleted_at: null, restore_before: null }).eq('id', entryId);
  toast('Entry restored! ✅', 'green'); renderJournal(); hide('deleted-journal-list');
};

window.viewJournalEntry = async function(entryId) {
  var e = (await sb.from('journal_entries').select('*').eq('id', entryId).single()).data;
  if (!e) return;
  id('journal-view-content').innerHTML = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><div style="font-size:28px">' + (MOOD_ICONS[e.mood] || '🙂') + '</div><div><div style="font-family:Orbitron,monospace;font-size:15px;font-weight:900;color:var(--text)">' + (e.title || 'Untitled') + '</div><div style="font-size:12px;color:var(--text2);margin-top:3px">' + formatDate(e.entry_date) + '</div></div></div><div class="je-full-content">' + (e.content || '') + '</div>' + (e.what_learned ? '<div class="je-section-label">📚 WHAT I LEARNED TODAY</div><div class="je-section-text">' + e.what_learned + '</div>' : '') + (e.lesson_learned ? '<div class="je-section-label">💡 LESSON LEARNED</div><div class="je-section-text">' + e.lesson_learned + '</div>' : '');
  show('journal-view-modal');
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  var d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

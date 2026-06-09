// ══════════════════════════════════
// ME TAB
// ══════════════════════════════════
function renderMeTab() {
  if (!profile) return;
  var xp = profile.xp || 0, level = getLevel(xp), role = getRoleInfo(profile.role || 'warrior');
  id('profile-name').textContent  = profile.username || 'Hero';
  id('profile-email').textContent = user?.email || '';
  id('pstat-level').textContent   = level;
  id('pstat-xp').textContent      = xp;
  id('pstat-streak').textContent  = profile.streak || 0;
  id('pstat-gems').textContent    = profile.gems   || 0;
  id('pstat-coins').textContent   = profile.coins  || 0;
  var rb = id('profile-role-badge');
  rb.textContent = role.icon + ' ' + role.name; rb.style.color = role.color; rb.style.borderColor = role.color + '44'; rb.style.background = role.color + '11';
  var cs = id('class-sub'); if (cs) cs.textContent = role.icon + ' ' + role.name + ' — ' + role.desc;
  if (profile.avatar_url) id('profile-avatar').innerHTML = '<img src="' + profile.avatar_url + '"/>';
  if (profile.bg_image_url) applyBgImage(profile.bg_image_url);
  else if (profile.namecard_bg) document.querySelector('.profile-bg').style.background = 'linear-gradient(135deg,' + profile.namecard_bg + ' 0%,#0a1a2e 100%)';
  if (profile.is_female_mode) { var ft = id('female-toggle'); if (ft) ft.classList.add('on'); show('female-section'); loadPeriodHistory(); }
  var gd = id('gender-display'); if (gd) gd.textContent = profile?.gender === 'female' ? '🌸 Female' : profile?.gender === 'male' ? '⚔️ Male' : 'Not set';
  loadUserSummon();
  applyFrame();
}

// ══════════════════════════════════
// SECTION TOGGLE
// ══════════════════════════════════
window.toggleSection = function(contentId, arrowId) {
  var content = id(contentId); if (!content) return;
  var isHidden = content.classList.contains('hidden');
  content.classList.toggle('hidden', !isHidden);
  var arrow = id(arrowId); if (arrow) arrow.textContent = isHidden ? '‹' : '›';
  if (isHidden) {
    if (contentId === 'summons-content'  || contentId === 'summon-content')   renderSummonSection();
    if (contentId === 'shop-content')      renderShopSection();
    if (contentId === 'inventory-content') renderSummonInventory();
    if (contentId === 'frames-content')    renderFramesSection();
    if (contentId === 'glory-content')     renderGlory();
    else if (contentId === 'guilds-content') renderGuildSection();
    else if (contentId === 'events-content') renderEvents();
    else if (contentId === 'boss-content')   renderBossFights();
    else if (contentId === 'manuals-content')renderManuals();
  }
};

// ══════════════════════════════════
// FEMALE MODE
// ══════════════════════════════════
window.toggleFemale = async function() {
  var btn = id('female-toggle'), isOn = !btn.classList.contains('on');
  btn.classList.toggle('on', isOn); profile.is_female_mode = isOn;
  if (isOn) { show('female-section'); id('period-quest-filter').style.display = ''; }
  else      { hide('female-section'); id('period-quest-filter').style.display = 'none'; }
  await sb.from('profiles').update({ is_female_mode: isOn }).eq('id', user.id);
  if (isOn) { loadPeriodHistory(); checkPeriodPhase(); }
  toast(isOn ? 'Period tracking on 🌸' : 'Period tracking off', 'green');
};

window.logPeriod = async function() {
  var start = val('period-start'), end = val('period-end');
  if (!start) { toast('Enter start date ⚠️', 'red'); return; }
  await sb.from('period_tracking').insert({ user_id: user.id, period_start: start, period_end: end || null });
  toast('Period logged 🌸', 'green'); id('period-start').value = ''; id('period-end').value = '';
  loadPeriodHistory(); checkPeriodPhase();
};

async function loadPeriodHistory() {
  var data = (await sb.from('period_tracking').select('*').eq('user_id', user.id).order('period_start', { ascending: false }).limit(5)).data;
  var el = id('period-history'); if (!el) return;
  if (!data || !data.length) { el.innerHTML = '<div style="font-size:12px;color:#444;margin-top:8px">No entries yet</div>'; return; }
  el.innerHTML = data.map(function(p){ return '<div style="background:var(--bg3);border:1px solid rgba(236,72,153,.15);border-radius:8px;padding:9px 12px;font-size:12px;color:var(--text2);margin-top:8px">🌸 ' + p.period_start + (p.period_end ? ' → ' + p.period_end : '') + '</div>'; }).join('');
}

// ══════════════════════════════════
// ROLE
// ══════════════════════════════════
window.openRoleModal = function() {
  selectedRole = profile?.role || 'warrior';
  id('role-grid').innerHTML = Object.entries(ROLES).map(function(entry){ var key = entry[0], r = entry[1]; return '<div style="background:var(--bg3);border:2px solid ' + (key === selectedRole ? r.color + '66' : 'var(--border)') + ';border-radius:16px;padding:16px;text-align:center;cursor:pointer;transition:all .2s;position:relative' + (key === selectedRole ? ';background:rgba(168,85,247,.08)' : '') + '" onclick="pickRole(\'' + key + '\',this)"><div style="font-size:28px;margin-bottom:6px">' + r.icon + '</div><div style="font-family:Orbitron,monospace;font-size:12px;font-weight:700;color:var(--text);margin-bottom:4px">' + r.name + '</div><div style="font-size:11px;color:var(--text2)">' + r.desc + '</div>' + (key === selectedRole ? '<div style="position:absolute;top:8px;right:10px;color:var(--accent2);font-size:14px;font-weight:700">✓</div>' : '') + '</div>'; }).join('');
  show('role-modal');
};

window.pickRole = function(key, el) {
  selectedRole = key;
  var cards = document.querySelectorAll('#role-grid > div'), keys = Object.keys(ROLES);
  cards.forEach(function(c, i) {
    var rk = keys[i];
    c.style.borderColor = rk === key ? ROLES[rk].color + '66' : 'var(--border)';
    c.style.background  = rk === key ? 'rgba(168,85,247,.08)' : 'var(--bg3)';
    c.querySelectorAll('[style*="position:absolute"]').forEach(function(el){ el.remove(); });
    if (rk === key) c.innerHTML += '<div style="position:absolute;top:8px;right:10px;color:var(--accent2);font-size:14px;font-weight:700">✓</div>';
  });
};

window.saveRole = async function() {
  await sb.from('profiles').update({ role: selectedRole }).eq('id', user.id);
  profile.role = selectedRole;
  try {
    var rAch    = (await sb.from('achievements').select('*').eq('requirement_type', 'role_chosen')).data;
    var rEarned = (await sb.from('user_achievements').select('achievement_id').eq('user_id', user.id)).data;
    var rIds    = (rEarned || []).map(function(e){ return e.achievement_id; });
    for (var i = 0; i < (rAch || []).length; i++) {
      var ach = rAch[i];
      if (!rIds.includes(ach.id)) {
        await sb.from('user_achievements').insert({ user_id: user.id, achievement_id: ach.id });
        await awardCurrency(0, ach.coins_reward || 0);
        if (ach.xp_reward > 0) await giveXP(ach.xp_reward, null, selectedRole);
        toast('🏆 ' + ach.title + '!', 'gem');
      }
    }
  } catch (e) {}
  closeModal('role-modal');
  toast(getRoleInfo(selectedRole).icon + ' ' + getRoleInfo(selectedRole).name + ' chosen!', 'green');
  renderAll();
};

// ══════════════════════════════════
// NAME CHANGE
// ══════════════════════════════════
window.openNameChange = function() {
  var count = profile.name_change_count || 0, coins = profile.coins || 0;
  id('name-change-error').textContent = '';
  id('name-change-count').textContent = count + ' / 2';
  id('name-change-coins').textContent = '🪙 ' + coins;
  show('name-modal');
};

window.executeNameChange = async function() {
  var newName = val('new-username'), errEl = id('name-change-error'); errEl.textContent = '';
  if (!newName) { errEl.textContent = '⚠️ Enter a username'; return; }
  if (newName.length < 3) { errEl.textContent = '⚠️ Must be 3+ characters'; return; }
  var now = new Date(), resetDate = profile.name_change_reset_date;
  var count = profile.name_change_count || 0;
  if (!resetDate || new Date(resetDate).getMonth() !== now.getMonth()) count = 0;
  if (count >= 2) { errEl.textContent = '❌ Limit reached (2/month)'; return; }
  if ((profile.coins || 0) < 650) { errEl.textContent = '❌ Not enough coins (need 🪙 650)'; return; }
  try { await sb.from('name_changes').insert({ user_id: user.id, old_name: profile.username, new_name: newName, coins_spent: 650 }); } catch (e) {}
  var newCoins = (profile.coins || 0) - 650;
  await sb.from('profiles').update({ username: newName, coins: newCoins, name_change_count: count + 1, name_change_reset_date: today }).eq('id', user.id);
  profile.username = newName; profile.coins = newCoins; profile.name_change_count = count + 1;
  closeModal('name-modal'); toast('✅ Name changed to ' + newName + '!', 'green'); renderAll();
};

// ══════════════════════════════════
// PREMIUM
// ══════════════════════════════════
window.switchPremiumTab = function(tab, btn) {
  currentPremiumTab = tab;
  document.querySelectorAll('.premium-tab').forEach(function(t){ t.classList.remove('active'); });
  btn.classList.add('active');
  updatePremiumContent(tab);
};

function updatePremiumContent(tab) {
  var fl = id('premium-features-list'), ot = id('premium-offer-text'), pa = id('premium-price-amount'), pp = id('premium-price-per'), cb = id('premium-cta-btn');
  if (tab === 'premium') {
    if (ot) ot.innerHTML = 'With <strong>60% off</strong> and a <strong>7-day free trial</strong> on LevelUp Life Premium features';
    if (pa) pa.textContent = '₹999 / year'; if (pp) pp.textContent = '(₹83.25/month) • Cancel anytime';
    if (cb) { cb.className = 'btn-premium'; cb.textContent = 'Try for free'; }
    if (fl) fl.innerHTML = ['Unlimited quests & habits','Advanced skill tracking','Full achievement system','90-day journal backup','Name change (2x/month)','Remove all limitations'].map(function(f){ return '<div class="premium-feature"><div class="pf-check">✓</div><div class="pf-text">' + f + '</div></div>'; }).join('');
  } else {
    if (ot) ot.innerHTML = 'With <strong>50% off</strong> and a <strong>3-day free trial</strong> on Premium + AI features';
    if (pa) pa.textContent = '₹1999 / year'; if (pp) pp.textContent = '(₹166.58/month) • Cancel anytime';
    if (cb) { cb.className = 'btn-premium ai'; cb.textContent = 'Try for free'; }
    if (fl) fl.innerHTML = ['Everything in Premium','AI Life Coach (unlimited)','AI-powered journal insights','Personalized quest recommendations','AI mood analysis','Smart habit suggestions'].map(function(f){ return '<div class="premium-feature"><div class="pf-check">✓</div><div class="pf-text">' + f + '</div></div>'; }).join('');
  }
}

window.startPremiumTrial = async function() {
  var plan = currentPremiumTab === 'ai' ? 'premium_ai' : 'premium', trialDays = plan === 'premium_ai' ? 3 : 7;
  var trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
  try { await sb.from('subscriptions').insert({ user_id: user.id, plan, status: 'trial', trial_ends_at: trialEnd }); } catch (e) {}
  await sb.from('profiles').update({ is_premium: true, premium_type: plan }).eq('id', user.id);
  profile.is_premium = true; profile.premium_type = plan;
  hide('premium-screen'); toast('👑 ' + trialDays + '-day trial started!', 'gem');
};

// ══════════════════════════════════
// AVATAR & BACKGROUND
// ══════════════════════════════════
window.uploadAvatar = async function(e) {
  var file = e.target.files[0]; if (!file) return;
  toast('Uploading...', 'green');
  var ext = file.name.split('.').pop(), path = user.id + '/avatar.' + ext;
  var res = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if (res.error) { toast('Upload failed: ' + res.error.message, 'red'); return; }
  var url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
  await sb.from('profiles').update({ avatar_url: url }).eq('id', user.id);
  profile.avatar_url = url; toast('Avatar updated! 🎉', 'green'); renderAll();
};

window.uploadBgImage = async function(e) {
  var file = e.target.files[0]; if (!file) return;
  toast('Uploading...', 'green');
  var ext = file.name.split('.').pop(), path = user.id + '/bg.' + ext;
  var res = await sb.storage.from('backgrounds').upload(path, file, { upsert: true });
  if (res.error) { toast('Failed: ' + res.error.message, 'red'); return; }
  var url = sb.storage.from('backgrounds').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
  await sb.from('profiles').update({ bg_image_url: url }).eq('id', user.id);
  profile.bg_image_url = url; applyBgImage(url); toast('Background updated! 🎉', 'green');
};

function applyBgImage(url) {
  if (!url) return;
  var style = "url('" + url + "') center/cover no-repeat";
  var heroB = document.querySelector('.hero-bg'), profB = document.querySelector('.profile-bg');
  if (heroB) heroB.style.background = style; if (profB) profB.style.background = style;
}

window.openBgPicker = function() {
  id('color-grid').innerHTML = BG_COLORS.map(function(c){ return '<div class="color-swatch ' + (c === selectedBg ? 'selected' : '') + '" style="background:' + c + '" onclick="pickBg(\'' + c + '\',this)"></div>'; }).join('');
  show('bg-modal');
};

window.pickBg = function(c, el) {
  selectedBg = c;
  document.querySelectorAll('.color-swatch').forEach(function(s){ s.classList.remove('selected'); });
  el.classList.add('selected');
};

window.saveBg = async function() {
  await sb.from('profiles').update({ namecard_bg: selectedBg }).eq('id', user.id);
  profile.namecard_bg = selectedBg; closeModal('bg-modal'); toast('Background saved! 🎨', 'green'); renderAll();
};

// ══════════════════════════════════
// EXPORT
// ══════════════════════════════════
window.exportAccountData = async function() {
  toast('📦 Preparing backup...', 'green');
  var results = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id).single(),
    sb.from('daily_quests').select('*').eq('user_id', user.id).order('quest_date', { ascending: false }),
    sb.from('journal_entries').select('*').eq('user_id', user.id).eq('is_deleted', false).order('entry_date', { ascending: false }),
    sb.from('user_achievements').select('*,achievements(*)').eq('user_id', user.id),
    sb.from('skills').select('*').eq('user_id', user.id),
    sb.from('manual_completions').select('*,skill_manuals(title)').eq('user_id', user.id)
  ]);
  var a = results[0], b = results[1], c = results[2], d = results[3], e = results[4], f = results[5];
  var backup = { exported_at: new Date().toISOString(), app: 'LevelUp Life', version: '2.0', profile: a.data, stats: { total_xp: a.data?.xp || 0, level: getLevel(a.data?.xp || 0), streak: a.data?.streak || 0, coins: a.data?.coins || 0, gems: a.data?.gems || 0 }, quests: { total: (b.data || []).length, completed: (b.data || []).filter(function(q){ return q.is_completed; }).length, data: b.data || [] }, journals: { total: (c.data || []).length, data: (c.data || []).map(function(j){ return { date: j.entry_date, title: j.title, mood: j.mood, content: j.content, learned: j.what_learned, lesson: j.lesson_learned }; }) }, achievements: { total: (d.data || []).length, data: (d.data || []).map(function(a){ return { title: a.achievements?.title, earned_at: a.earned_at }; }) }, skills: e.data || [], manuals_read: (f.data || []).map(function(m){ return m.skill_manuals?.title; }) };
  var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob), a2 = document.createElement('a');
  a2.href = url; a2.download = 'levelup-backup-' + today + '.json'; a2.click(); URL.revokeObjectURL(url);
  toast('✅ Backup downloaded!', 'green');
};

// ══════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════
async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { scheduleLocalReminder(); return; }
  if (Notification.permission !== 'denied') {
    var p = await Notification.requestPermission();
    if (p === 'granted') {
      scheduleLocalReminder();
      var nt = id('notif-toggle'); if (nt) { nt.classList.add('on'); show('reminder-time-wrap'); }
    }
  }
}

function scheduleLocalReminder() { if (profile?.reminder_time) scheduleReminderNotification(profile.reminder_time); }

function scheduleReminderNotification(time) {
  var parts = (time || '08:00').split(':').map(Number);
  var now = new Date(), rt = new Date(); rt.setHours(parts[0], parts[1], 0, 0);
  if (rt <= now) rt.setDate(rt.getDate() + 1);
  var delay = rt.getTime() - now.getTime();
  setTimeout(function() {
    if (Notification.permission === 'granted') {
      var pending = dailyQuests.filter(function(q){ return !q.is_completed; }).length;
      if (pending > 0) new Notification('⚡ LevelUp Life', { body: 'You have ' + pending + ' quests waiting! Keep your streak! 🔥', icon: '/icon.png' });
    }
    scheduleReminderNotification(time);
  }, delay);
}

window.toggleNotifications = async function() {
  var btn = id('notif-toggle'), isOn = !btn.classList.contains('on');
  if (isOn) { await requestNotificationPermission(); btn.classList.add('on'); show('reminder-time-wrap'); }
  else { btn.classList.remove('on'); hide('reminder-time-wrap'); }
};

window.saveReminderTime = async function(time) {
  await sb.from('profiles').update({ reminder_time: time }).eq('id', user.id).catch(function(){});
  profile.reminder_time = time; scheduleReminderNotification(time); toast('⏰ Reminder set for ' + time, 'green');
};

// ══════════════════════════════════
// SUMMON SYSTEM (old summons table)
// ══════════════════════════════════
var currentSummonData = null;
var currentSummonImageBase64 = null;
var currentSummonMediaType = null;

async function loadUserSummon() {
  var sub = id('summon-status-sub'); if (!profile) return;
  try {
    var res    = await sb.from('summons').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(1);
    var summon = res.data && res.data[0] ? res.data[0] : null;
    if (summon && sub) sub.textContent = summon.name + ' — Bond Lv ' + summon.bond_level;
    else if (sub) sub.textContent = 'No companion yet';
    return summon;
  } catch (e) { return null; }
}

async function renderSummonSection() {
  var el = id('summon-content-inner'); if (!el) return;
  var summon = await loadUserSummon();
  if (!summon) {
    el.innerHTML = '<div class="summon-empty"><div class="summon-empty-icon">🔮</div><div style="font-family:Orbitron,monospace;font-size:14px;color:var(--accent2);font-weight:900;margin-bottom:8px">No Companion Yet</div><div style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.6">Summon your first companion. Upload an image and AI will bring it to life.</div><button class="btn-summon" onclick="openSummonModal()">🔮 SUMMON A COMPANION</button></div>';
    return;
  }
  var bondPct = Math.min(100, Math.round(((summon.bond_xp || 0) % 100)));
  var imgHtml = summon.image_url ? '<img class="summon-avatar" src="' + summon.image_url + '"/>' : '<div class="summon-avatar-placeholder">🔮</div>';
  el.innerHTML = '<div class="summon-card"><div style="display:flex;gap:16px;align-items:flex-start">' + imgHtml + '<div style="flex:1;min-width:0"><div class="summon-name">' + summon.name + '</div><div class="summon-class">⚔️ ' + summon.class + '</div><div class="summon-race">🧬 ' + summon.race + '</div><div class="summon-desc">' + summon.description + '</div></div></div><div class="summon-bond"><div class="summon-bond-label">BOND LEVEL ' + summon.bond_level + ' — ' + summon.bond_xp + ' XP</div><div class="summon-bond-track"><div class="summon-bond-fill" style="width:' + bondPct + '%"></div></div></div></div><button class="btn-regen" onclick="openSummonModal()">+ Summon Another Companion</button>';
}

window.openSummonModal = function() {
  currentSummonData = null; currentSummonImageBase64 = null; currentSummonMediaType = null;
  id('summon-modal-title').textContent = '🔮 Summon a Companion';
  renderSummonStep1();
  show('summon-modal');
};

function renderSummonStep1() {
  id('summon-modal-body').innerHTML = '<div style="text-align:center;padding:12px 0"><div style="font-size:40px;margin-bottom:12px">🖼️</div><div style="font-size:14px;color:var(--text2);margin-bottom:20px;line-height:1.6">Upload an image of your companion.<br/>AI will generate its identity.</div><input type="file" id="summon-img-input" accept="image/*" style="display:none" onchange="onSummonImageSelected(event)"/><button class="btn-summon" onclick="document.getElementById(\'summon-img-input\').click()">📷 CHOOSE IMAGE</button><div class="manual-override-btn" onclick="renderSummonManual()">Enter details manually instead</div></div>';
}

window.onSummonImageSelected = async function(e) {
  var file = e.target.files[0]; if (!file) return;
  var mediaType = file.type || 'image/jpeg';
  var reader = new FileReader();
  reader.onload = async function(ev) {
    var dataUrl = ev.target.result;
    var base64  = dataUrl.split(',')[1];
    currentSummonImageBase64 = base64;
    currentSummonMediaType   = mediaType;
    id('summon-modal-body').innerHTML = '<div class="summon-preview" style="text-align:center"><img class="summon-preview-img" src="' + dataUrl + '"/><br/><div style="font-size:13px;color:var(--text2);margin-bottom:12px">Image selected!</div></div><div class="summon-loading">✨ GENERATING IDENTITY...</div>';
    await generateSummonWithAI(base64, mediaType, dataUrl);
  };
  reader.readAsDataURL(file);
};

// Uses the Gemini Edge Function (no Anthropic key)
async function generateSummonWithAI(base64, mediaType, previewUrl) {
  try {
    var response = await fetch(SUPABASE_URL + '/functions/v1/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
      body: JSON.stringify({ type: 'summon_image', image_base64: base64, media_type: mediaType })
    });
    var data = await response.json();
    var text = data.text || '';
    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      currentSummonData = parsed;
      renderSummonPreview(parsed, previewUrl);
    } else { throw new Error('No JSON in response'); }
  } catch (err) {
    console.error('AI summon error:', err);
    renderSummonManualWithImage(previewUrl);
    toast('AI failed — enter details manually', 'red');
  }
}

function renderSummonPreview(data, previewUrl) {
  var imgTag = previewUrl ? '<img class="summon-preview-img" src="' + previewUrl + '"/>' : '<div style="font-size:40px;margin-bottom:12px">🔮</div>';
  id('summon-modal-body').innerHTML = '<div class="summon-preview" style="text-align:center">' + imgTag + '<div class="summon-name">' + (data.name || 'Unknown') + '</div><div class="summon-class">⚔️ ' + (data.class || 'Warrior') + '</div><div class="summon-race">🧬 ' + (data.race || 'Spirit') + '</div><div class="summon-desc" style="text-align:left;margin-top:10px">' + (data.description || '') + '</div></div><button class="btn-summon" onclick="saveSummon()">✨ CONFIRM SUMMON</button><button class="btn-regen" onclick="renderSummonStep1()">🔄 Choose Different Image</button><div class="manual-override-btn" onclick="renderSummonManualWithImage(\'' + (previewUrl || '') + '\')">Edit details manually</div>';
}

function renderSummonManual() {
  currentSummonImageBase64 = null;
  var opts = '<option>Warrior</option><option>Mage</option><option>Assassin</option><option>Healer</option><option>Creator</option><option>Strategist</option><option>Guardian</option><option>Shadow</option>';
  var races = '<option>Human</option><option>Beast</option><option>Spirit</option><option>Dragon</option><option>Hybrid</option><option>Ancient</option><option>Phantom</option>';
  id('summon-modal-body').innerHTML = '<div style="margin-bottom:8px;font-size:13px;color:var(--text2)">Enter your companion details:</div><div class="form-group"><label>Name</label><input type="text" id="sm-name" placeholder="e.g. Shadow Fang"/></div><div class="form-group"><label>Class</label><select id="sm-class">' + opts + '</select></div><div class="form-group"><label>Race</label><select id="sm-race">' + races + '</select></div><div class="form-group"><label>Description</label><textarea id="sm-desc" placeholder="Describe your companion and how they help you grow..." style="min-height:80px"></textarea></div><button class="btn-summon" onclick="saveSummonManual()">✨ SUMMON</button><button class="btn-regen" onclick="renderSummonStep1()">← Back</button>';
}

function renderSummonManualWithImage(previewUrl) {
  var opts  = '<option>Warrior</option><option>Mage</option><option>Assassin</option><option>Healer</option><option>Creator</option><option>Strategist</option><option>Guardian</option><option>Shadow</option>';
  var races = '<option>Human</option><option>Beast</option><option>Spirit</option><option>Dragon</option><option>Hybrid</option><option>Ancient</option><option>Phantom</option>';
  id('summon-modal-body').innerHTML = (previewUrl ? '<div style="text-align:center;margin-bottom:12px"><img src="' + previewUrl + '" style="width:80px;height:80px;border-radius:14px;object-fit:cover;border:2px solid var(--accent2)"/></div>' : '') + '<div class="form-group"><label>Name</label><input type="text" id="sm-name" placeholder="e.g. Shadow Fang" value="' + (currentSummonData && currentSummonData.name || '') + '"/></div><div class="form-group"><label>Class</label><select id="sm-class">' + opts + '</select></div><div class="form-group"><label>Race</label><select id="sm-race">' + races + '</select></div><div class="form-group"><label>Description</label><textarea id="sm-desc" style="min-height:80px">' + (currentSummonData && currentSummonData.description || '') + '</textarea></div><button class="btn-summon" onclick="saveSummonManual()">✨ SUMMON</button><button class="btn-regen" onclick="renderSummonStep1()">← Back</button>';
  if (currentSummonData?.class) { var cls = id('sm-class'); if (cls) cls.value = currentSummonData.class; }
  if (currentSummonData?.race)  { var rc  = id('sm-race');  if (rc)  rc.value  = currentSummonData.race; }
}

window.saveSummon = async function() {
  if (!currentSummonData) return;
  var imageUrl = null;
  if (currentSummonImageBase64 && currentSummonMediaType) imageUrl = await uploadSummonImage();
  await sb.from('summons').insert({ user_id: user.id, name: currentSummonData.name || 'Companion', class: currentSummonData.class || 'Warrior', race: currentSummonData.race || 'Spirit', description: currentSummonData.description || '', image_url: imageUrl, bond_level: 1, bond_xp: 0, is_active: true });
  closeModal('summon-modal'); toast('🔮 ' + currentSummonData.name + ' summoned!', 'gem'); renderSummonSection();
};

window.saveSummonManual = async function() {
  var nameEl = id('sm-name'), clsEl = id('sm-class'), raceEl = id('sm-race'), descEl = id('sm-desc');
  var name = nameEl ? nameEl.value.trim() : '';
  var cls  = clsEl  ? clsEl.value  : 'Warrior';
  var race = raceEl ? raceEl.value : 'Spirit';
  var desc = descEl ? descEl.value.trim() : '';
  if (!name) { toast('Enter a name!', 'red'); return; }
  var imageUrl = null;
  if (currentSummonImageBase64 && currentSummonMediaType) imageUrl = await uploadSummonImage();
  await sb.from('summons').insert({ user_id: user.id, name, class: cls, race, description: desc, image_url: imageUrl, bond_level: 1, bond_xp: 0, is_active: true });
  closeModal('summon-modal'); toast('🔮 ' + name + ' summoned!', 'gem'); renderSummonSection();
};

async function uploadSummonImage() {
  if (!currentSummonImageBase64) return null;
  try {
    var byteStr = atob(currentSummonImageBase64), arr = new Uint8Array(byteStr.length);
    for (var i = 0; i < byteStr.length; i++) arr[i] = byteStr.charCodeAt(i);
    var ext  = currentSummonMediaType.split('/')[1] || 'jpg';
    var blob = new Blob([arr], { type: currentSummonMediaType });
    var path = user.id + '/summon_' + Date.now() + '.' + ext;
    var upRes = await sb.storage.from('avatars').upload(path, blob, { upsert: true });
    if (upRes.error) return null;
    return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl + '?t=' + Date.now();
  } catch (e) { return null; }
}

// ══════════════════════════════════
// SHOP (shop_summons table)
// ══════════════════════════════════
var shopFilter = 'all', shopSummons = [], playerOwnedSummons = [];

async function renderShopSection() {
  var el = id('shop-summons-list'); if (!el) return;
  el.innerHTML = '<div style="color:var(--text2);font-size:13px;padding:12px;text-align:center">Loading...</div>';
  try {
    shopSummons = (await sb.from('shop_summons').select('*').eq('is_available', true).order('rarity')).data || [];
    playerOwnedSummons = (await sb.from('player_summons').select('*,shop_summons(*)').eq('user_id', user.id)).data || [];
    var ownedIds = playerOwnedSummons.map(function(p){ return p.summon_id; });
    var filtered = shopFilter === 'all' ? shopSummons : shopFilter === 'premium' ? shopSummons.filter(function(s){ return s.is_premium; }) : shopSummons.filter(function(s){ return s.rarity === shopFilter; });
    if (!filtered.length) { el.innerHTML = empty('🔮', 'No summons in this category yet'); return; }
    var html = '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);padding:4px 0 12px"><span>Your balance:</span><span>💎 ' + (profile.gems || 0) + ' • 🪙 ' + (profile.coins || 0) + '</span></div>';
    filtered.forEach(function(s) {
      var owned      = ownedIds.indexOf(s.id) > -1;
      var meetsXP    = (profile.xp || 0) >= (s.unlock_xp || 0);
      var meetsLevel = getLevel(profile.xp || 0) >= (s.unlock_level || 1);
      var meetStreak = (profile.streak || 0) >= (s.unlock_streak || 0);
      var isUnlocked = meetsXP && meetsLevel && meetStreak;
      var imgHtml    = s.image_url ? '<img class="summon-img" src="' + s.image_url + '"/>' : '<div class="summon-img-placeholder">🔮</div>';
      var rarityClass= 'rarity-' + s.rarity;
      html += '<div class="shop-summon-card ' + rarityClass + '"><div style="display:flex;gap:14px;padding:14px;align-items:flex-start">' + imgHtml + '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-family:Orbitron,monospace;font-size:14px;font-weight:900;color:var(--text)">' + s.name + '</span><span class="rarity-badge ' + rarityClass + '">' + cap(s.rarity) + '</span></div><div style="font-size:11px;color:var(--text2);margin-bottom:3px">⚔️ ' + s.class + ' • 🧬 ' + s.race + '</div><div style="font-size:12px;color:var(--text2);margin-bottom:6px;line-height:1.5">' + (s.description || '') + '</div>' + (s.special_effect ? '<div class="effect-tag">✨ ' + s.special_effect + '</div>' : '') + (!isUnlocked && s.unlock_description ? '<div class="lock-tag">🔒 ' + s.unlock_description + '</div>' : '') + '</div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;min-width:70px">';
      if (owned)          html += '<button class="btn-purchase owned">✅ Owned</button>';
      else if (!isUnlocked) html += '<button class="btn-purchase locked">🔒 Locked</button>';
      else if (s.is_premium && s.price_gems > 0) html += '<button class="btn-purchase gems" onclick="purchaseSummon(\'' + s.id + '\')">💎 ' + s.price_gems + '</button>';
      else html += '<button class="btn-purchase" onclick="purchaseSummon(\'' + s.id + '\')">🪙 ' + s.price_coins + '</button>';
      html += '</div></div></div>';
    });
    el.innerHTML = html;
  } catch (e) { el.innerHTML = empty('🔮', 'Failed to load shop'); }
}

window.filterShop = function(filter, btn) {
  shopFilter = filter;
  document.querySelectorAll('#shop-rarity-filters .filter-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active'); renderShopSection();
};

window.purchaseSummon = async function(summonId) {
  var summon = shopSummons.find(function(s){ return s.id === summonId; }); if (!summon) return;
  var isPremium = summon.is_premium && summon.price_gems > 0;
  if (isPremium) {
    if ((profile.gems || 0) < summon.price_gems) { toast('Not enough gems! Need 💎' + summon.price_gems, 'red'); return; }
    await awardCurrency(-summon.price_gems, 0); toast('💎 -' + summon.price_gems + ' gems');
  } else {
    if ((profile.coins || 0) < summon.price_coins) { toast('Not enough coins! Need 🪙' + summon.price_coins, 'red'); return; }
    await awardCurrency(0, -summon.price_coins); toast('🪙 -' + summon.price_coins + ' coins');
  }
  await sb.from('player_summons').insert({ user_id: user.id, summon_id: summonId, is_active: false, bond_level: 1, bond_xp: 0, obtained_from: 'shop' });
  if (summon.frame_id) await unlockFrame(summon.frame_id);
  toast('🔮 ' + summon.name + ' acquired!', 'gem');
  renderTopbar(); renderHeroCard(); renderShopSection(); renderSummonInventory();
};

// ══════════════════════════════════
// INVENTORY
// ══════════════════════════════════
async function renderSummonInventory() {
  var el = id('inventory-list'); if (!el) return;
  try {
    var owned = (await sb.from('player_summons').select('*,shop_summons(*)').eq('user_id', user.id).order('obtained_at', { ascending: false })).data || [];
    var sub = id('inventory-sub'); if (sub) sub.textContent = owned.length + ' companion' + (owned.length !== 1 ? 's' : '');
    if (!owned.length) { el.innerHTML = '<div class="empty"><div class="empty-icon">🔮</div><div>No summons yet.</div><div style="font-size:12px;color:var(--text3);margin-top:6px">Purchase summons from the shop!</div></div>'; return; }
    var html = '';
    owned.forEach(function(ps) {
      var s = ps.shop_summons; if (!s) return;
      var bondPct = Math.min(100, (ps.bond_xp || 0) % 100);
      var imgHtml = s.image_url ? '<img class="inv-summon-img" src="' + s.image_url + '"/>' : '<div class="inv-summon-img" style="background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:24px">🔮</div>';
      var rarityClass = 'rarity-' + (s.rarity || 'common');
      html += '<div class="inv-summon-card ' + (ps.is_active ? 'active-summon' : '') + '" onclick="toggleActiveSummon(\'' + ps.id + '\',' + ps.is_active + ')">' + imgHtml + '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;margin-bottom:2px"><span style="font-size:14px;font-weight:700;color:var(--text)">' + s.name + '</span><span class="rarity-badge ' + rarityClass + '">' + cap(s.rarity) + '</span>' + (ps.is_active ? '<span class="active-badge">ACTIVE</span>' : '') + '</div><div style="font-size:11px;color:var(--text2);margin-bottom:2px">⚔️ ' + s.class + ' • 🧬 ' + s.race + '</div>' + (s.special_effect ? '<div style="font-size:11px;color:var(--green)">✨ ' + s.special_effect + '</div>' : '') + '<div style="font-size:10px;color:var(--text3);margin-top:4px">Bond Lv ' + ps.bond_level + ' — ' + ps.bond_xp + ' XP</div><div class="bond-mini-track"><div class="bond-mini-fill" style="width:' + bondPct + '%"></div></div></div><div style="flex-shrink:0;font-size:20px;color:var(--text3)">' + (ps.is_active ? '✅' : '○') + '</div></div>';
    });
    el.innerHTML = html;
  } catch (e) { el.innerHTML = empty('🔮', 'Failed to load inventory'); }
}

window.toggleActiveSummon = async function(psId, isCurrentlyActive) {
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

// ══════════════════════════════════
// FRAMES
// ══════════════════════════════════
async function renderFramesSection() {
  var el = id('frames-list'); if (!el) return;
  try {
    var res = await sb.from('profiles').select('unlocked_frames,active_frame').eq('id', user.id).single();
    var unlocked = res.data?.unlocked_frames || [];
    var active   = res.data?.active_frame || 'rank';
    var allFrames = [
      { id: 'rank',          label: 'Auto Rank', icon: '🏆' },
      { id: 'frame-bronze',  label: 'Bronze',    icon: '🥉' },
      { id: 'frame-silver',  label: 'Silver',    icon: '🥈' },
      { id: 'frame-gold',    label: 'Gold',       icon: '🏅' },
      { id: 'frame-platinum',label: 'Platinum',  icon: '💎' },
      { id: 'frame-diamond', label: 'Diamond',   icon: '💠' },
      { id: 'frame-master',  label: 'Master',    icon: '⚔️' },
      { id: 'frame-grandmaster', label: 'Grandmaster', icon: '🔮' },
      { id: 'frame-legendary',   label: 'Legendary',   icon: '🌟' },
      { id: 'frame-mythic',      label: 'Mythic',      icon: '🔥' },
      { id: 'frame-ascended',    label: 'Ascended',    icon: '👑' }
    ];
    var rs = getRankStage(profile.xp || 0);
    var currentRankFrames = ['frame-bronze','frame-silver','frame-gold','frame-platinum','frame-diamond','frame-master','frame-grandmaster','frame-legendary','frame-mythic','frame-ascended'].slice(0, allFrames.findIndex(function(f){ return f.id === rs.frame; }) + 1);
    var autoUnlocked = new Set(['rank', ...currentRankFrames, ...unlocked]);
    el.innerHTML = '<div class="frames-row">' + allFrames.map(function(f) {
      var isUnlocked = autoUnlocked.has(f.id);
      var isActive   = active === f.id;
      return '<div style="text-align:center;flex-shrink:0"><div class="frame-option ' + (isActive ? 'selected' : '') + (isUnlocked ? '' : '" style="opacity:.3;cursor:not-allowed') + '" onclick="' + (isUnlocked ? 'selectFrame(\'' + f.id + '\')' : '') + '">' + f.icon + '</div><div class="frame-label">' + f.label + '</div></div>';
    }).join('') + '</div>';
  } catch (e) {}
}

window.selectFrame = async function(frameId) {
  await sb.from('profiles').update({ active_frame: frameId }).eq('id', user.id);
  profile.active_frame = frameId; applyFrame(); renderFramesSection(); toast('Frame updated! ✨', 'green');
};

async function unlockFrame(frameId) {
  try {
    var res = await sb.from('profiles').select('unlocked_frames').eq('id', user.id).single();
    var current = res.data?.unlocked_frames || [];
    if (!current.includes(frameId)) {
      current.push(frameId);
      await sb.from('profiles').update({ unlocked_frames: current }).eq('id', user.id);
    }
  } catch (e) {}
}

// ══════════════════════════════════
// ONBOARDING
// ══════════════════════════════════
var selectedStruggle = null, obGeneratedQuests = [], obStarterPet = null;

const STRUGGLE_CONFIG = {
  phone_addiction: { label: 'Phone Addiction', petName: 'Nova', quests: [{ title: 'No phone for 1 hour', diff: 'easy' }, { title: 'Keep phone in another room while studying', diff: 'medium' }, { title: 'Track your screen time today', diff: 'easy' }] },
  laziness:        { label: 'Laziness',         petName: 'Blaze', quests: [{ title: 'Wake up without snoozing', diff: 'easy' }, { title: 'Complete 1 task before checking phone', diff: 'medium' }, { title: 'Do 10 minutes of movement', diff: 'easy' }] },
  focus:           { label: 'Focus Issues',     petName: 'Sage',  quests: [{ title: 'Study for 25 minutes without distraction', diff: 'medium' }, { title: 'Write down 3 priorities for today', diff: 'easy' }, { title: 'Complete one full task before switching', diff: 'medium' }] }
};

window.selectStruggle = function(struggle, el) {
  selectedStruggle = struggle;
  document.querySelectorAll('.struggle-card').forEach(function(c){ c.classList.remove('selected'); });
  el.classList.add('selected');
  var btn = id('ob-next-1'); if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
};

window.obStep1Continue = async function() {
  if (!selectedStruggle) return;
  obShowStep(2);
  await generateObQuests();
};

// Uses Gemini Edge Function (no Anthropic key)
async function generateObQuests() {
  var config = STRUGGLE_CONFIG[selectedStruggle];
  try {
    var res  = await fetch(SUPABASE_URL + '/functions/v1/ai-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_KEY },
      body: JSON.stringify({ type: 'onboarding_quests', struggle_label: config.label })
    });
    var data  = await res.json();
    var text  = data.text || '';
    var match = text.match(/\[[\s\S]*\]/);
    if (match) { var parsed = JSON.parse(match[0]); obGeneratedQuests = parsed.slice(0, 3); }
    else        { obGeneratedQuests = config.quests; }
  } catch (e) { obGeneratedQuests = config.quests; }
  obShowStep(3); renderObQuests();
}

function renderObQuests() {
  var el = id('ob-quests-list'); if (!el) return;
  var html = '';
  for (var i = 0; i < obGeneratedQuests.length; i++) {
    var q = obGeneratedQuests[i], diff = q.difficulty || q.diff || 'easy';
    var xp = diff === 'hard' ? 50 : diff === 'medium' ? 25 : 10;
    html += '<div class="ob-quest-preview"><div class="ob-quest-num">QUEST ' + (i + 1) + '</div><div class="ob-quest-title">' + q.title + '</div><div class="ob-quest-xp">+' + xp + ' XP • ' + cap(diff) + '</div></div>';
  }
  el.innerHTML = html;
}

window.obStep3Continue = async function() { obShowStep(4); await loadObPet(); };

async function loadObPet() {
  var config = STRUGGLE_CONFIG[selectedStruggle], petName = config.petName;
  var res = await sb.from('shop_summons').select('*').eq('name', petName).single().catch(function(){ return { data: null }; });
  obStarterPet = res.data;
  var el = id('ob-pet-display'); if (!el) return;
  var icons = { Nova: '🦊', Blaze: '🐺', Sage: '🦉' };
  if (obStarterPet && obStarterPet.image_url) {
    el.innerHTML = '<img class="ob-pet-img" src="' + obStarterPet.image_url + '"/><div class="ob-pet-name">' + obStarterPet.name + '</div><div class="ob-pet-desc">' + (obStarterPet.description || '') + '</div>';
  } else {
    el.innerHTML = '<div class="ob-pet-placeholder">' + (icons[petName] || '🔮') + '</div><div class="ob-pet-name">' + petName + '</div><div class="ob-pet-desc">' + (obStarterPet ? obStarterPet.description || '' : 'Your starter companion.') + '</div>';
  }
}

window.obStep4Continue = function() { obShowStep(5); };

window.obFinish = async function() {
  var btn = document.querySelector('#ob-step-5 .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'LOADING...'; }
  await saveOnboarding(); hide('onboarding-screen');
  await checkVIPStatus(); await generateDailyQuests(); await loadAllData(); showMainApp();
};

async function saveOnboarding() {
  await sb.from('profiles').update({ struggle: selectedStruggle, onboarding_complete: true }).eq('id', user.id);
  profile.struggle = selectedStruggle; profile.onboarding_complete = true;
  var diffs = { easy: 10, medium: 25, hard: 50 };
  var questsToInsert = obGeneratedQuests.map(function(q) {
    var diff = q.difficulty || q.diff || 'easy';
    return { user_id: user.id, title: q.title, quest_type: 'habit', skill_category: 'discipline', xp_reward: diffs[diff] || 10, quest_date: today, is_completed: false, difficulty: diff, is_recurring: true };
  });
  if (questsToInsert.length > 0) await sb.from('daily_quests').insert(questsToInsert);
  if (obStarterPet) {
    await sb.from('player_summons').insert({ user_id: user.id, summon_id: obStarterPet.id, is_active: true, bond_level: 1, bond_xp: 500, obtained_from: 'starter' });
    await sb.from('profiles').update({ active_summon_id: obStarterPet.id }).eq('id', user.id);
    profile.active_summon_id = obStarterPet.id;
  }
}

function obShowStep(step) {
  for (var i = 1; i <= 5; i++) {
    var el = id('ob-step-' + i);
    if (el) { if (i === step) el.classList.remove('hidden'); else el.classList.add('hidden'); }
    var dot = id('ob-dot-' + i);
    if (dot) { dot.classList.remove('active', 'done'); if (i < step) dot.classList.add('done'); else if (i === step) dot.classList.add('active'); }
  }
  var container = document.querySelector('.ob-container');
  if (container) container.scrollTop = 0;
} 

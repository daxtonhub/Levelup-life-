const $ = (x) => document.getElementById(x);
// ══════════════════════════════════
// RANK SYSTEM
// ══════════════════════════════════
const RANKS = ['Bronze','Silver','Gold','Platinum','Diamond','Master','Grandmaster','Legend','Ascendant','Reborn','Transcendent'];
const TIERS_PER_RANK = 3;
const LEVELS_PER_TIER = 10;
const LEVELS_PER_RANK = TIERS_PER_RANK * LEVELS_PER_TIER;
const ADVANCEMENT_START_LEVEL = LEVELS_PER_RANK + 1; // Gold 1

function getRankFromLevel(level) {
  const idx = Math.max(0, level - 1);
  const rankIndex = Math.min(Math.floor(idx / LEVELS_PER_RANK), RANKS.length - 1);
  const tier = Math.floor((idx % LEVELS_PER_RANK) / LEVELS_PER_TIER) + 1;
  return { name: RANKS[rankIndex], tier, full: `${RANKS[rankIndex]} ${tier}` };
}

// ══════════════════════════════════
// LEVEL + XP SYSTEM
// ══════════════════════════════════
function getRequiredXP(level) {
  return Math.floor(100 * Math.pow(level, 1.15));
}

function canLevelUp(player) {
  if (player.currentXP < player.requiredXP) return false;
  if (player.level + 1 >= ADVANCEMENT_START_LEVEL) return !!player.advancementQuestDone;
  return true;
}

function levelUp(player) {
  player.currentXP -= player.requiredXP;
  player.level += 1;
  player.requiredXP = getRequiredXP(player.level);
  player.advancementQuestDone = false;
  return player;
}

function addXP(player, amount) {
  player.currentXP = (player.currentXP || 0) + amount;
  while (canLevelUp(player)) levelUp(player);
  return player;
}

// ══════════════════════════════════
// ADVANCEMENT SYSTEM
// ══════════════════════════════════
function completeAdvancementQuest(player) {
  player.advancementQuestDone = true;
  if (player.currentXP >= player.requiredXP) addXP(player, 0);
  return player;
}

// ══════════════════════════════════
// XP AWARD (replaces old giveXP)
// ══════════════════════════════════
async function giveXP(amount, skillCat, role) {
  if (!profile) return;
  let final = amount;
  if (role && skillCat && ROLES[role]?.bonus === skillCat) {
    final = Math.round(amount*1.2);
    if (final > amount) setTimeout(()=>toast(`⚔️ ${ROLES[role].name} Bonus! +${final-amount}XP`,'gem'),400);
  }
  profile.level = profile.level || 1;
  profile.currentXP = profile.currentXP || 0;
  profile.requiredXP = profile.requiredXP || getRequiredXP(profile.level);
  profile.advancementQuestDone = profile.advancementQuestDone || false;

  const oldLevel = profile.level;
  const blockedByAdvancement = profile.level + 1 >= ADVANCEMENT_START_LEVEL && !profile.advancementQuestDone;

  addXP(profile, final);
  profile.xp = (profile.xp||0) + final;

  await sb.from('profiles').update({
    xp: profile.xp,
    level: profile.level,
    current_xp: profile.currentXP,
    required_xp: profile.requiredXP,
    advancement_quest_done: profile.advancementQuestDone
  }).eq('id', user.id);

  if (profile.level > oldLevel) {
    setTimeout(()=>toast(`🎉 LEVEL UP! Level ${profile.level}!`),700);
    await awardCurrency(0,50);
  } else if (blockedByAdvancement && profile.currentXP >= profile.requiredXP) {
    id('advancement-banner')?.classList.remove('hidden');
  }

  if (skillCat && skillCat!=='system' && skillCat!=='period') {
    const sk = allSkills.find(s=>s.skill_name===skillCat);
    if (sk) { const nSXP=(sk.skill_xp||0)+final,nSLV=Math.floor(nSXP/100)+1; await sb.from('skills').update({skill_xp:nSXP,skill_level:nSLV}).eq('id',sk.id); sk.skill_xp=nSXP; sk.skill_level=nSLV; }
  }
  const newMot = Math.min(100,(profile.motivation||100)+2);
  await sb.from('profiles').update({motivation:newMot}).eq('id',user.id); profile.motivation=newMot;
}

window.completeAdvancement = async function() {
  if (!profile) return;
  completeAdvancementQuest(profile);
  await sb.from('profiles').update({
    level: profile.level,
    current_xp: profile.currentXP,
    required_xp: profile.requiredXP,
    advancement_quest_done: profile.advancementQuestDone
  }).eq('id', user.id);
  id('advancement-banner')?.classList.add('hidden');
  toast(`🎉 LEVEL UP! Level ${profile.level}!`);
  renderAll();
};

// ══════════════════════════════════
// RENDER (replaces topbar/hero xp section)
// ══════════════════════════════════
function renderTopbar() {
  if (!profile) return;
  const xp = profile.xp||0, level = profile.level||1, rank = getRankFromLevel(level);
  id('topbar-name').textContent = profile.username||'Hero';
  id('topbar-level').textContent = `LVL ${level} • ${rank.full}`;
  id('topbar-coins').textContent = `🪙 ${profile.coins||0}`;
  id('topbar-xp').textContent = `${xp} XP`;
  if (profile.avatar_url) id('topbar-avatar').innerHTML = `<img src="${profile.avatar_url}"/>`;
}

function renderHeroCard() {
  if (!profile) return;
  const level = profile.level||1, curXP = profile.currentXP||0, reqXP = profile.requiredXP||getRequiredXP(level);
  const pct = Math.min(100, Math.round((curXP/reqXP)*100));
  const rank = getRankFromLevel(level);
  const role = getRoleInfo(profile.role||'warrior');
  id('hero-name').textContent = profile.username||'Hero';
  id('hero-role').style.color = role.color; id('hero-role').textContent = `${role.icon} ${role.name}`;
  id('hero-badge').textContent = `LV ${level}`;
  id('xp-fill').style.width = pct+'%'; id('xp-nums').textContent = `${curXP} / ${reqXP}`;
  id('hstat-streak').textContent = profile.streak||0;
  id('hstat-energy').textContent = profile.energy||100;
  id('hstat-done').textContent = dailyQuests.filter(q=>q.is_completed).length;
  id('dash-gems').textContent = profile.gems||0; id('dash-coins').textContent = profile.coins||0;
  if (profile.avatar_url) id('hero-avatar').innerHTML = `<img src="${profile.avatar_url}"/>`;
  if (profile.bg_image_url) applyBgImage(profile.bg_image_url);
  else if (profile.namecard_bg) { document.querySelector('.hero-bg').style.background = `linear-gradient(135deg,${profile.namecard_bg} 0%,#0a0a1a 100%)`; }

  const banner = id('advancement-banner');
  if (banner) {
    const blocked = level + 1 >= ADVANCEMENT_START_LEVEL && !profile.advancementQuestDone && curXP >= reqXP;
    banner.classList.toggle('hidden', !blocked);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const testName = document.getElementById("topbar-name");
  if (testName) testName.innerText = "TEST USER";

  const testCoins = document.getElementById("topbar-coins");
  if (testCoins) testCoins.innerText = "🪙 999";

  const testXP = document.getElementById("topbar-xp");
  if (testXP) testXP.innerText = "9999 XP";
});

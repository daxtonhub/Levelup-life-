// supabase.js — Config, Client, AI, Helpers

const SUPABASE_URL = 'https://tcdptsbhkprngrwlsewq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjZHB0c2Joa3Bybmdyd2xzZXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MjU0OTYsImV4cCI6MjA5NTMwMTQ5Nn0.JUwa7eYAzX135HQl8jbEirZvckF5iPJGaKtsdWaFtW0';
const ADMIN_EMAIL  = 'daxtonhub6@gmail.com';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Date helper (replaces the old "today" constant) ──
function getToday() {
  return new Date().toISOString().split('T')[0];
}

// ── AI via Supabase Edge Function ──
async function callAI(messages, system, maxTokens) {
  system = system || '';
  maxTokens = maxTokens || 600;
  const { data, error } = await sb.functions.invoke('ai-proxy', {
    body: { messages: messages, system: system, max_tokens: maxTokens }
  });
  if (error) throw new Error('AI error: ' + error.message);
  return (data.content || []).map(function(b) { return b.text || ''; }).join('');
}

// ── Utilities ──
function id(i)    { return document.getElementById(i); }
function val(i)   { var el = document.getElementById(i); return el ? el.value.trim() : ''; }
function show(i)  { var el = document.getElementById(i); if (el) el.classList.remove('hidden'); }
function hide(i)  { var el = document.getElementById(i); if (el) el.classList.add('hidden'); }
function cap(s)   { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function empty(icon, msg) {
  return '<div class="empty"><div class="empty-icon">' + icon + '</div>' + msg + '</div>';
}
function sanitize(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function toast(msg, type) {
  type = type || '';
  var old = id('_toast'); if (old) old.remove();
  var t = document.createElement('div');
  t.id = '_toast';
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { t.remove(); }, 2800);
}

function showCurrencyPop(coins) {
  if (!coins) return;
  var pop = document.createElement('div');
  pop.className = 'currency-pop';
  pop.style.cssText = 'left:' + (50 + Math.random() * 20 - 10) + '%;top:50%;';
  pop.textContent = '+\uD83E\uDE99' + coins;
  document.body.appendChild(pop);
  setTimeout(function() { pop.remove(); }, 900);
}

window.closeModal   = function(mid) { hide(mid); };
window.closeModalBg = function(e, mid) { if (e.target.id === mid) hide(mid); };

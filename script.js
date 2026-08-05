'use strict';

/* ---------- helpers ---------- */
const KEY = 'caffeineDiary.entries';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };

/* ---------- state ---------- */
const load = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v.filter((e) => e && e.name && e.date && e.rating >= 1 && e.rating <= 5) : [];
  }
  catch { return []; }
};
let entries = load();
let rating = 0;
let editingId = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* storage unavailable */ } };
const sorted = () => [...entries].sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));

/* ---------- rendering ---------- */
function card(e) {
  const stars = '★'.repeat(e.rating) + '☆'.repeat(5 - e.rating);
  return `
  <article class="card" data-id="${e.id}">
    <div class="card-top"><h3>${esc(e.name)}</h3><span class="card-rating" aria-label="${e.rating} of 5 stars">${stars}</span></div>
    <p class="meta">${esc(e.brew)} · ${fmtDate(e.date)}</p>
    ${e.notes ? `<p class="notes">${esc(e.notes)}</p>` : ''}
    <div class="card-actions">
      <button class="btn btn-ghost btn-sm" data-action="edit">Edit</button>
      <button class="btn btn-ghost btn-sm btn-danger" data-action="delete">Delete</button>
    </div>
  </article>`;
}

function renderStats() {
  if (!entries.length) {
    $('#statTotal').textContent = '0';
    $('#statAvg').textContent = '—';
    $('#statBest').textContent = '—';
    $('#statBestSub').textContent = '';
    return;
  }
  const avg = entries.reduce((s, e) => s + e.rating, 0) / entries.length;
  let best = entries[0];
  for (const e of entries) if (e.rating > best.rating || (e.rating === best.rating && (e.created || 0) > (best.created || 0))) best = e;
  $('#statTotal').textContent = entries.length;
  $('#statAvg').textContent = avg.toFixed(1);
  $('#statBest').textContent = best.name;
  $('#statBestSub').textContent = '★ ' + best.rating + ' / 5';
}

function paintStars(n = rating) {
  $$('#stars .star').forEach((s, i) => { s.classList.toggle('on', i < n); s.setAttribute('aria-checked', i < n); });
}

function render() {
  const list = sorted();
  $('#entryCount').textContent = list.length ? `${list.length} ${list.length === 1 ? 'entry' : 'entries'}` : '';
  $('#entryList').innerHTML = list.length
    ? list.map(card).join('')
    : `<div class="empty"><span class="cup">☕</span><p>No tastings logged yet.<br>Brew something &amp; add your first entry.</p></div>`;
  renderStats();
  paintStars();
}

/* ---------- form ---------- */
const form = $('#entryForm');

function flag(el) {
  el.classList.remove('flag');
  void el.offsetWidth; /* restart animation */
  el.classList.add('flag');
  if (el.focus) el.focus();
}

function resetForm() {
  editingId = null;
  rating = 0;
  form.reset();
  $('#date').value = today();
  $('#formTitle').textContent = 'New tasting';
  $('#submitBtn').textContent = 'Save tasting';
  $('#cancelBtn').hidden = true;
  paintStars();
}

function editEntry(id) {
  const e = entries.find((x) => x.id === id);
  if (!e) return;
  editingId = id;
  rating = e.rating;
  $('#name').value = e.name;
  $('#brew').value = e.brew;
  $('#date').value = e.date;
  $('#notes').value = e.notes;
  $('#formTitle').textContent = 'Edit tasting';
  $('#submitBtn').textContent = 'Update entry';
  $('#cancelBtn').hidden = false;
  paintStars();
  $('#formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('#name').focus();
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#name').value.trim();
  const brew = $('#brew').value;
  const date = $('#date').value;
  const notes = $('#notes').value.trim();
  if (!name) return flag($('#name'));
  if (!date) return flag($('#date'));
  if (!rating) return flag($('#stars'));
  const data = { name, brew, date, notes, rating };
  if (editingId) {
    const i = entries.findIndex((x) => x.id === editingId);
    entries[i] = { ...entries[i], ...data };
  } else {
    entries.push({ id: uid(), created: Date.now(), ...data });
  }
  save();
  resetForm();
  render();
});

form.addEventListener('input', (e) => e.target.classList.remove('flag'));
$('#cancelBtn').addEventListener('click', resetForm);

/* ---------- interactions ---------- */
$('#stars').addEventListener('click', (e) => {
  const b = e.target.closest('.star');
  if (!b) return;
  rating = +b.dataset.v;
  $('#stars').classList.remove('flag');
  paintStars();
});
$('#stars').addEventListener('mouseover', (e) => {
  const b = e.target.closest('.star');
  if (b) paintStars(+b.dataset.v);
});
$('#stars').addEventListener('mouseleave', () => paintStars());

$('#entryList').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const id = b.closest('.card').dataset.id;
  if (b.dataset.action === 'edit') return editEntry(id);
  if (!confirm('Delete this tasting?')) return;
  entries = entries.filter((x) => x.id !== id);
  if (editingId === id) resetForm();
  save();
  render();
});

/* ---------- init ---------- */
$('#date').value = today();
render();

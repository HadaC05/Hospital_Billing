'use strict';

console.log('receptionist-dashboard.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    window.location.href = '../index.html';
    return;
  }
  const dateEl = document.getElementById('recdash-date');
  try { if (dateEl) dateEl.textContent = new Date().toLocaleString(); } catch {}
  loadReceptionistDashboard();
});

function loadReceptionistDashboard() {
  const apiUrl = '../api/get-admissions.php';
  // Fetch a large page to compute KPIs on the client for now
  axios.post(apiUrl, {
    operation: 'getAdmissions',
    page: 1,
    itemsPerPage: 500,
    search: ''
  }).then((resp) => {
    const payload = resp?.data;
    if (!payload || payload.status !== 'success') {
      console.warn('Failed to load admissions:', payload?.message || payload);
      renderRecKpis([]);
      renderRecRecent([]);
      return;
    }
    const rows = payload.data || [];
    renderRecKpis(rows);
    renderRecRecent(rows);
  }).catch((err) => {
    console.error('Error loading receptionist dashboard:', err);
    renderRecKpis([]);
    renderRecRecent([]);
  });
}

function renderRecKpis(rows) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10); // yyyy-mm-dd
  const days30Ago = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const active = rows.filter(r => (r.status || '').toLowerCase().trim() === 'active').length;
  const admitToday = rows.filter(r => sameDay(r.admission_date, todayStr)).length;
  const dischToday = rows.filter(r => sameDay(r.discharge_date, todayStr)).length;
  const admit30 = rows.filter(r => {
    const d = toDate(r.admission_date);
    return d && d >= days30Ago;
  }).length;

  setText('rec-kpi-active', active);
  setText('rec-kpi-admit-today', admitToday);
  setText('rec-kpi-disch-today', dischToday);
  setText('rec-kpi-admit30', admit30);
}

function renderRecRecent(rows) {
  const tbody = document.getElementById('recdash-recent');
  if (!tbody) return;
  tbody.innerHTML = '';

  const sorted = [...rows].sort((a, b) => {
    const ad = toDate(a.admission_date)?.getTime() || 0;
    const bd = toDate(b.admission_date)?.getTime() || 0;
    return bd - ad;
  }).slice(0, 10);

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No recent admissions</td></tr>';
    return;
  }

  sorted.forEach(r => {
    const name = [r.patient_fname, r.patient_mname, r.patient_lname].filter(Boolean).join(' ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.admission_id)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(r.mobile_number || '')}</td>
      <td>${formatDate(r.admission_date)}</td>
      <td>${formatDate(r.discharge_date)}</td>
      <td>${statusBadge(r.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function sameDay(dt, yyyy_mm_dd) {
  const d = toDate(dt);
  if (!d) return false;
  try {
    return d.toISOString().slice(0, 10) === yyyy_mm_dd;
  } catch { return false; }
}

function formatDate(d) {
  const dt = toDate(d);
  if (!dt) return '';
  try { return dt.toLocaleDateString(); } catch { return ''; }
}

function toDate(d) {
  if (!d) return null;
  const t = Date.parse(d);
  if (!isNaN(t)) return new Date(t);
  try { const norm = (d || '').replace(' ', 'T'); const t2 = Date.parse(norm); return isNaN(t2) ? null : new Date(t2); } catch { return null; }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = `${val}`;
}

function escapeHtml(str) {
  return (str == null ? '' : String(str))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusBadge(status) {
  const s = (status || '').toLowerCase().trim();
  let cls = 'secondary';
  if (s === 'active') cls = 'primary';
  else if (s === 'discharged' || s === 'completed') cls = 'success';
  else if (s === 'pending') cls = 'warning';
  else if (s === 'critical') cls = 'danger';
  else if (s === 'stable') cls = 'info';
  return `<span class="badge bg-${cls}">${escapeHtml(status || '')}</span>`;
}

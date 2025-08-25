'use strict';

console.log('doctor-dashboard.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    window.location.href = '../index.html';
    return;
  }

  // Show current date/time
  const dateEl = document.getElementById('docdash-date');
  try {
    const now = new Date();
    if (dateEl) dateEl.textContent = now.toLocaleString();
  } catch (_) {}

  loadDoctorDashboard();
});

function loadDoctorDashboard() {
  const apiUrl = '../api/get-doctor-patients.php';

  axios.post(apiUrl, {
    operation: 'getDoctorAdmissions',
    page: 1,
    itemsPerPage: 500,
    search: ''
  }).then((resp) => {
    const payload = resp?.data;
    if (!payload || payload.status !== 'success') {
      console.warn('Failed to load doctor admissions:', payload?.message || payload);
      renderKPIs([]);
      renderRecent([]);
      return;
    }
    const rows = payload.data || [];
    renderKPIs(rows);
    renderRecent(rows);
  }).catch((err) => {
    console.error('Error loading doctor dashboard:', err);
    renderKPIs([]);
    renderRecent([]);
  });
}

function renderKPIs(rows) {
  const now = new Date();
  const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalAssigned = rows.length;
  const activeCount = rows.filter(r => (r.status || '').toLowerCase() === 'active').length;

  const admitted30 = rows.filter(r => {
    const d = toDate(r.admission_date);
    return d && d >= days30Ago;
  }).length;

  const disch30 = rows.filter(r => {
    const d = toDate(r.discharge_date);
    return d && d >= days30Ago;
  }).length;

  setText('kpi-total', totalAssigned);
  setText('kpi-active', activeCount);
  setText('kpi-admit30', admitted30);
  setText('kpi-disch30', disch30);
}

function renderRecent(rows) {
  const tbody = document.getElementById('docdash-recent');
  if (!tbody) return;
  tbody.innerHTML = '';

  const sorted = [...rows].sort((a, b) => {
    const ad = toDate(a.admission_date)?.getTime() || 0;
    const bd = toDate(b.admission_date)?.getTime() || 0;
    return bd - ad;
  }).slice(0, 10);

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No assigned patients</td></tr>';
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

function formatDate(d) {
  const dt = toDate(d);
  if (!dt) return '';
  try { return dt.toLocaleDateString(); } catch (_) { return ''; }
}

function toDate(d) {
  if (!d) return null;
  const t = Date.parse(d);
  if (!isNaN(t)) return new Date(t);
  // try if yyyy-mm-dd hh:mm:ss without timezone
  try {
    const norm = (d || '').replace(' ', 'T');
    const t2 = Date.parse(norm);
    return isNaN(t2) ? null : new Date(t2);
  } catch (_) {
    return null;
  }
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
  const s = (status || '').toLowerCase();
  let cls = 'secondary';
  if (s === 'active') cls = 'primary';
  else if (s === 'discharged' || s === 'completed') cls = 'success';
  else if (s === 'pending') cls = 'warning';
  else if (s === 'cancelled' || s === 'canceled') cls = 'danger';
  return `<span class="badge bg-${cls}">${escapeHtml(status || '')}</span>`;
}

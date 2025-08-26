'use strict';

console.log('biller-dashboard.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    window.location.href = '../index.html';
    return;
  }
  try { document.getElementById('biller-date').textContent = new Date().toLocaleString(); } catch {}
  attachFilterHandlers();
  loadBillerDashboard();
});

function attachFilterHandlers() {
  const apply = document.getElementById('flt-apply');
  if (apply) apply.addEventListener('click', loadBillerDashboard);
}

function readFilters() {
  const start = document.getElementById('flt-start')?.value || null;
  const end = document.getElementById('flt-end')?.value || null;
  const status = document.getElementById('flt-status')?.value || 'ALL';
  return { start_date: start, end_date: end, status };
}

function loadBillerDashboard() {
  const apiUrl = '../api/billing.php';
  const filters = readFilters();
  axios.post(apiUrl, {
    operation: 'getOverview',
    json: JSON.stringify(filters)
  }).then((resp) => {
    const data = resp?.data;
    if (!data?.success) {
      console.warn('Failed to load billing overview', data?.message);
      renderBillerKpis(null);
      renderBillerRecent([]);
      return;
    }
    renderBillerKpis(data.kpis || {});
    renderBillerRecent(data.invoices || []);
  }).catch((err) => {
    console.error('Error fetching billing overview', err);
    renderBillerKpis(null);
    renderBillerRecent([]);
  });
}

function renderBillerKpis(kpis) {
  const totalInvoices = kpis?.total_invoices ?? 0;
  const totalBilled = kpis?.total_billed ?? 0;
  const totalCovered = kpis?.total_covered ?? 0;
  const totalDue = kpis?.total_due ?? 0;
  setText('kpi-total-invoices', totalInvoices);
  setText('kpi-total-billed', currency(totalBilled));
  setText('kpi-total-covered', currency(totalCovered));
  setText('kpi-total-due', currency(totalDue));
}

function renderBillerRecent(rows) {
  const tbody = document.getElementById('biller-recent');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No invoices</td></tr>';
    return;
  }
  rows.slice(0, 12).forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.invoice_id)}</td>
      <td>${formatDate(r.invoice_date)}</td>
      <td>${escapeHtml(r.patient_name || '')}</td>
      <td>${currency(r.total_amount)}</td>
      <td>${currency(r.insurance_covered_amount)}</td>
      <td>${currency(r.amount_due)}</td>
      <td>${statusBadge(r.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = `${v}`; }
function currency(n) { const num = Number(n||0); return num.toLocaleString(undefined, { style: 'currency', currency: 'USD' }); }
function formatDate(d) { try { return new Date(d).toLocaleDateString(); } catch { return ''; } }
function escapeHtml(str) { return (str==null?'':String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function statusBadge(status){ const s=(status||'').toUpperCase(); let cls='secondary'; if(s==='PAID') cls='success'; else if(s==='UNPAID') cls='warning'; else if(s==='PENDING') cls='info'; return `<span class="badge bg-${cls}">${escapeHtml(status||'')}</span>`; }

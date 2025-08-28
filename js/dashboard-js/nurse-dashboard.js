'use strict';

console.log('nurse-dashboard.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) { window.location.href = '../index.html'; return; }
  try { document.getElementById('nurse-date').textContent = new Date().toLocaleString(); } catch {}
  loadNurseDashboard();
});

function loadNurseDashboard() {
  axios.post('../api/get-admissions.php', { operation: 'getAdmissions', page: 1, itemsPerPage: 500, search: '' })
    .then(resp => {
      const payload = resp?.data;
      const rows = (payload && payload.status === 'success') ? (payload.data || []) : [];
      renderNurseKpis(rows);
      renderNurseRecent(rows);
    })
    .catch(err => { console.error('Nurse dashboard load error', err); renderNurseKpis([]); renderNurseRecent([]); });
}

function renderNurseKpis(rows) {
  const todayStr = new Date().toISOString().slice(0,10);
  const days30Ago = new Date(Date.now() - 30*24*60*60*1000);
  const active = rows.filter(r => (r.status||'').toLowerCase().trim() === 'active').length;
  const admitToday = rows.filter(r => sameDay(r.admission_date, todayStr)).length;
  const dischToday = rows.filter(r => sameDay(r.discharge_date, todayStr)).length;
  const admit30 = rows.filter(r => { const d = toDate(r.admission_date); return d && d >= days30Ago; }).length;
  setText('nurse-kpi-active', active);
  setText('nurse-kpi-admit-today', admitToday);
  setText('nurse-kpi-disch-today', dischToday);
  setText('nurse-kpi-admit30', admit30);
}

function renderNurseRecent(rows) {
  const tbody = document.getElementById('nurse-recent'); if (!tbody) return;
  tbody.innerHTML='';
  const sorted = [...rows].sort((a,b) => (toDate(b.admission_date)?.getTime()||0)-(toDate(a.admission_date)?.getTime()||0)).slice(0,10);
  if (!sorted.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No recent admissions</td></tr>'; return; }
  sorted.forEach(r => {
    const name = [r.patient_fname, r.patient_mname, r.patient_lname].filter(Boolean).join(' ');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.admission_id)}</td>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(r.mobile_number||'')}</td>
      <td>${formatDate(r.admission_date)}</td>
      <td>${formatDate(r.discharge_date)}</td>
      <td>${statusBadge(r.status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function sameDay(dt, ymd) { const d = toDate(dt); try { return d && d.toISOString().slice(0,10)===ymd; } catch { return false; } }
function toDate(d){ if(!d) return null; const t=Date.parse(d); if(!isNaN(t)) return new Date(t); try{const t2=Date.parse(String(d).replace(' ','T')); return isNaN(t2)?null:new Date(t2);}catch{return null;} }
function formatDate(d){ const dt=toDate(d); try{ return dt?dt.toLocaleDateString():'';} catch { return ''; } }
function setText(id,v){ const el=document.getElementById(id); if(el) el.textContent = `${v}`; }
function escapeHtml(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
function statusBadge(status){ const s=(status||'').toLowerCase().trim(); let cls='secondary'; if(s==='active') cls='primary'; else if(s==='discharged'||s==='completed') cls='success'; else if(s==='pending') cls='warning'; else if(s==='critical') cls='danger'; else if(s==='stable') cls='info'; return `<span class=\"badge bg-${cls}\">${escapeHtml(status||'')}</span>`; }

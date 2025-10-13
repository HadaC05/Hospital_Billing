console.log('therapist-requests.js loaded');
document.addEventListener('DOMContentLoaded', async () => {
  const baseApiUrl = `${window.location.origin}/hospital_billing/api`;
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    window.location.href = '../../index.html';
    return;
  }

  const tbody = document.getElementById('th-tbody');
  const search = document.getElementById('th-search');
  const statusSel = document.getElementById('th-status');
  const modalEl = document.getElementById('th-modal');
  const modal = new bootstrap.Modal(modalEl);

  const form = document.getElementById('th-form');
  const idInput = document.getElementById('th-id');
  const patientInput = document.getElementById('th-patient');
  const typeSel = document.getElementById('th-type');
  const notesInput = document.getElementById('th-notes');

  // Therapist role: hide creating/editing controls
  const newBtn = document.getElementById('th-new-btn');
  if (newBtn) newBtn.style.display = 'none';
  const saveBtn = document.getElementById('th-save');
  if (saveBtn) saveBtn.style.display = 'none';

  let requests = [];
  await loadRequests();
  render();

  ;[search, statusSel].forEach(el => el?.addEventListener('input', render));

  async function loadRequests() {
    try {
      const res = await axios.post(`${baseApiUrl}/therapist.php`, { operation: 'list' });
      const data = res.data;
      if (!data?.success) throw new Error(data?.message || 'Failed');
      requests = Array.isArray(data.requests) ? data.requests : [];
    } catch (e) {
      console.error('Load therapist requests failed', e);
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load</td></tr>';
    }
  }

  function render() {
    const s = (search?.value || '').toLowerCase().trim();
    const st = statusSel?.value || 'ALL';
    let rows = requests.filter(r => {
      const matchS = !s || [r.patient, r.type].some(v => String(v||'').toLowerCase().includes(s));
      const matchT = st === 'ALL' || r.status === st;
      return matchS && matchT;
    });
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No requests</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.request_id)}</td>
        <td>${escapeHtml(r.patient)}</td>
        <td>${escapeHtml(r.type)}</td>
        <td>${escapeHtml(formatDate(r.date))}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>
          ${r.status === 'PENDING' ? `<button class="btn btn-sm btn-outline-success me-1" data-accept="${r.request_id}"><i class="fas fa-check"></i> Accept</button>` : ''}
          ${r.status === 'APPROVED' ? `<button class="btn btn-sm btn-outline-primary" data-complete="${r.request_id}"><i class="fas fa-flag-checkered"></i> Complete</button>` : ''}
        </td>
      </tr>
    `).join('');

    Array.from(tbody.querySelectorAll('button[data-accept]')).forEach(btn => btn.addEventListener('click', () => updateStatus(btn.getAttribute('data-accept'), 'accept')));
    Array.from(tbody.querySelectorAll('button[data-complete]')).forEach(btn => btn.addEventListener('click', () => updateStatus(btn.getAttribute('data-complete'), 'complete')));
  }

  async function updateStatus(id, op) {
    try {
      const res = await axios.post(`${baseApiUrl}/therapist.php`, { operation: op, data: { request_id: id } });
      const data = res.data;
      if (!data?.success) throw new Error(data?.message || 'Failed');
      await loadRequests();
      render();
      Swal.fire({ icon: 'success', title: op === 'accept' ? 'Accepted' : 'Completed' });
    } catch (e) {
      console.error('Update status error', e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update status' });
    }
  }

  async function removeReq(id) {
    const ok = await Swal.fire({ icon: 'warning', title: 'Delete request?', showCancelButton: true, confirmButtonText: 'Delete' }).then(r => r.isConfirmed);
    if (!ok) return;
    try {
      const res = await axios.post(`${baseApiUrl}/therapist.php`, { operation: 'delete', data: { request_id: id } });
      const data = res.data;
      if (!data?.success) throw new Error(data?.message || 'Failed');
      await loadRequests();
      render();
      Swal.fire({ icon: 'success', title: 'Deleted' });
    } catch (e) {
      console.error('Delete error', e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to delete' });
    }
  }

  function escapeHtml(str) { return (str == null ? '' : String(str)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
  function formatDate(d) { try { return d ? new Date(d).toLocaleDateString() : ''; } catch { return ''; } }
});



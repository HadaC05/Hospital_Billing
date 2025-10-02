'use strict';

console.log('pharmacist-dashboard.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = '../index.html'; return; }
    try { document.getElementById('pharm-date').textContent = new Date().toLocaleString(); } catch { }
    loadPharmacistDashboard();
});

function loadPharmacistDashboard() {
    // Keep KPI loading as is
    axios.post('../api/get-admissions.php', { operation: 'getAdmissions', page: 1, itemsPerPage: 500, search: '' })
        .then(resp => {
            const payload = resp?.data;
            const rows = (payload && payload.status === 'success') ? (payload.data || []) : [];
            renderPharmKpis(rows);
        })
        .catch(err => { console.error('Pharmacist KPI load error', err); renderPharmKpis([]); });

    // Load medicine batch requests
    loadMedicineRequests();
}

async function loadMedicineRequests() {
    const tbody = document.getElementById('medicine-requests-list');
    if (!tbody) return;

    try {
        const response = await axios.get('../api/requests-php/medicine-requests.php', {
            params: { operation: 'getBatchRequests' },
            withCredentials: true
        });

        if (response.data.success) {
            renderMedicineRequests(response.data.data);
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${escapeHtml(response.data.message)}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading medicine requests:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load data.</td></tr>';
    }
}

function renderMedicineRequests(requests) {
    const tbody = document.getElementById('medicine-requests-list');
    tbody.innerHTML = '';

    if (!requests || requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No pending medicine requests.</td></tr>';
        return;
    }

    requests.forEach(req => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(req.batch_id)}</td>
            <td>${escapeHtml(req.patient_name)}</td>
            <td>${escapeHtml(req.doctor_name)}</td>
            <td>${formatDate(req.request_date)}</td>
            <td>${statusBadge(req.status)}</td>
            <td>
                <button class="btn btn-sm btn-info view-details-btn" data-batch-id="${req.batch_id}">
                    <i class="fas fa-eye me-1"></i> View Details
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Event delegation for view details buttons
document.getElementById('medicine-requests-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('.view-details-btn');
    if (btn) {
        const batchId = btn.dataset.batchId;
        showBatchDetails(batchId);
    }
});

const batchDetailsModal = new bootstrap.Modal(document.getElementById('batchDetailsModal'));

async function showBatchDetails(batchId) {
    const batchIdSpan = document.getElementById('batchIdSpan');
    const batchItemsTbody = document.getElementById('batchItemsTbody');
    batchIdSpan.textContent = batchId;
    batchItemsTbody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
    batchDetailsModal.show();

    try {
        const response = await axios.get('../api/requests-php/medicine-requests.php', {
            params: { operation: 'getBatchDetails', batch_id: batchId },
            withCredentials: true
        });

        if (response.data.success) {
            renderBatchItems(response.data.data);
        } else {
            batchItemsTbody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">${escapeHtml(response.data.message)}</td></tr>`;
        }
    } catch (error) {
        console.error('Error fetching batch details:', error);
        batchItemsTbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load details.</td></tr>';
    }
}

function renderBatchItems(items) {
    const batchItemsTbody = document.getElementById('batchItemsTbody');
    batchItemsTbody.innerHTML = '';

    if (!items || items.length === 0) {
        batchItemsTbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No items in this batch.</td></tr>';
        return;
    }

    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(item.med_name)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>${escapeHtml(item.notes)}</td>
        `;
        batchItemsTbody.appendChild(tr);
    });
}


function renderPharmKpis(rows) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const days30Ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const active = rows.filter(r => (r.status || '').toLowerCase().trim() === 'active').length;
    const admitToday = rows.filter(r => sameDay(r.admission_date, todayStr)).length;
    const dischToday = rows.filter(r => sameDay(r.discharge_date, todayStr)).length;
    const admit30 = rows.filter(r => { const d = toDate(r.admission_date); return d && d >= days30Ago; }).length;
    setText('pharm-kpi-active', active);
    setText('pharm-kpi-admit-today', admitToday);
    setText('pharm-kpi-disch-today', dischToday);
    setText('pharm-kpi-admit30', admit30);
}

function sameDay(dt, ymd) { const d = toDate(dt); try { return d && d.toISOString().slice(0, 10) === ymd; } catch { return false; } }
function toDate(d) { if (!d) return null; const t = Date.parse(d); if (!isNaN(t)) return new Date(t); try { const t2 = Date.parse(String(d).replace(' ', 'T')); return isNaN(t2) ? null : new Date(t2); } catch { return null; } }
function formatDate(d) { const dt = toDate(d); try { return dt ? dt.toLocaleDateString() : ''; } catch { return ''; } }
function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = `${v}`; }
function escapeHtml(s) { return (s == null ? '' : String(s)).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); }
function statusBadge(status) { const s = (status || '').toLowerCase().trim(); let cls = 'secondary'; if (s === 'active' || s === 'pending') cls = 'warning'; else if (s === 'discharged' || s === 'completed') cls = 'success'; else if (s === 'cancelled') cls = 'danger'; return `<span class="badge bg-${cls}">${escapeHtml(status || '')}</span>`; }

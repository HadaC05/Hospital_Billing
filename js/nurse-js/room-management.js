console.log('nurse room-management.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    const baseApiUrl = `${window.location.origin}/hospital_billing/api`;
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const tbody = document.getElementById('rm-tbody');
    const typeSel = document.getElementById('rm-type');
    const statusSel = document.getElementById('rm-status');
    const searchInput = document.getElementById('rm-search');

    const transferModalEl = document.getElementById('rm-transfer-modal');
    const transferModal = new bootstrap.Modal(transferModalEl);
    const transferForm = document.getElementById('rm-transfer-form');

    const newRoomSel = document.getElementById('rm-new-room');
    const transferDateInput = document.getElementById('rm-transfer-date');
    const reasonInput = document.getElementById('rm-reason');
    const admissionIdHidden = document.getElementById('rm-admission-id');

    let rooms = [];
    let admissions = [];
    let merged = [];

    document.getElementById('rm-date').textContent = new Date().toLocaleString();
    document.getElementById('rm-recent-btn')?.addEventListener('click', openRecentModal);
    document.getElementById('rm-requests-btn')?.addEventListener('click', openRequestsModal);

    // Load data
    try {
        await Promise.all([loadRooms(), loadActiveAdmissions()]);
        mergeData();
        populateTypeFilter();
        renderTable();
    } catch (e) {
        console.error('Failed to load room management data', e);
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load</td></tr>';
    }

    // Event listeners
    ;[searchInput, typeSel, statusSel].forEach(el => el && el.addEventListener('input', renderTable));

    document.getElementById('rm-transfer-submit')?.addEventListener('click', onTransferSubmit);

    async function loadRooms() {
        const resp = await axios.get(`${baseApiUrl}/masterfiles-php/get-rooms.php`, { params: { operation: 'getRooms', page: 1, itemsPerPage: 1000 } });
        if (!resp?.data?.success) throw new Error(resp?.data?.message || 'Failed to load rooms');
        rooms = Array.isArray(resp.data.rooms) ? resp.data.rooms : [];
    }

    async function loadActiveAdmissions() {
        // Reuse existing admissions endpoint list, then filter active
        const res = await axios.get(`${baseApiUrl}/admission-php/get-admissions.php`, { params: { operation: 'getAdmissions' } });
        const data = res.data;
        if (!data?.success) throw new Error(data?.message || 'Failed to load admissions');
        admissions = Array.isArray(data.data) ? data.data.filter(a => (a.status||'').toLowerCase() === 'active') : [];
    }

    function mergeData() {
        // Lookup maps
        const typeByRoomNumber = new Map();
        const roomIdByNumber = new Map();
        rooms.forEach(r => {
            typeByRoomNumber.set(String(r.room_number), r.room_type_name);
            roomIdByNumber.set(String(r.room_number), r.room_id);
        });

        // One row per occupied admission
        const occupiedRows = admissions
            .filter(a => a.current_room)
            .map(a => ({
                room_id: roomIdByNumber.get(String(a.current_room)) || null,
                room_number: a.current_room,
                room_type_name: typeByRoomNumber.get(String(a.current_room)) || '',
                status: 'OCCUPIED',
                patient_name: a.patient_name || '',
                admission_id: a.admission_id || '',
                admission_date: a.admission_date || ''
            }));

        // Available rooms
        const occupiedNumbers = new Set(occupiedRows.map(r => String(r.room_number)));
        const availableRows = rooms
            .filter(r => !occupiedNumbers.has(String(r.room_number)))
            .map(r => ({
                room_id: r.room_id,
                room_number: r.room_number,
                room_type_name: r.room_type_name,
                status: 'AVAILABLE',
                patient_name: '',
                admission_id: '',
                admission_date: ''
            }));

        merged = occupiedRows.concat(availableRows);
    }

    function populateTypeFilter() {
        if (!typeSel) return;
        const types = Array.from(new Set(rooms.map(r => r.room_type_name).filter(Boolean))).sort((a,b)=>a.localeCompare(b));
        typeSel.innerHTML = ['<option value="ALL">All Types</option>'].concat(types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)).join('');
    }

    function renderTable() {
        if (!tbody) return;
        const s = (searchInput?.value || '').toLowerCase().trim();
        const status = statusSel?.value || 'ALL';
        const type = typeSel?.value || 'ALL';

        let rows = merged.filter(m => {
            const matchSearch = !s || [m.patient_name, m.room_number, m.room_type_name].some(v => String(v||'').toLowerCase().includes(s));
            const matchStatus = status === 'ALL' || m.status === status;
            const matchType = type === 'ALL' || m.room_type_name === type;
            return matchSearch && matchStatus && matchType;
        });

        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(m => `
            <tr>
                <td>${escapeHtml(m.admission_id)}</td>
                <td>${escapeHtml(m.patient_name)}</td>
                <td>${escapeHtml(m.room_number)}</td>
                <td>${escapeHtml(m.room_type_name)}</td>
                <td>${escapeHtml(formatDate(m.admission_date))}</td>
                <td>
                    ${m.status === 'OCCUPIED' && m.admission_id ? `<button class=\"btn btn-sm btn-outline-primary me-1\" data-adm=\"${m.admission_id}\" title=\"Transfer\"><i class=\"fas fa-exchange-alt\"></i></button>` : ''}
                    ${m.status === 'OCCUPIED' && m.admission_id ? `<button class=\"btn btn-sm btn-outline-secondary\" data-hist=\"${m.admission_id}\" title=\"History\"><i class=\"fas fa-clock-rotate-left\"></i></button>` : ''}
                </td>
            </tr>
        `).join('');

        // Wire buttons
        Array.from(tbody.querySelectorAll('button[data-adm]')).forEach(btn => {
            btn.addEventListener('click', () => openTransferModal(btn.getAttribute('data-adm')));
        });
        Array.from(tbody.querySelectorAll('button[data-hist]')).forEach(btn => {
            btn.addEventListener('click', () => openHistoryModal(btn.getAttribute('data-hist')));
        });
    }

    async function openTransferModal(admissionId) {
        admissionIdHidden.value = String(admissionId);
        // Load available rooms for selection (any room not full). For simplicity, reuse rooms list directly
        // Only list rooms that are currently available (no active stays)
        const occupiedNumbers = new Set(merged.filter(m => m.status === 'OCCUPIED').map(r => String(r.room_number)));
        // Show rooms that are NOT FULL: current < max
        const available = rooms.filter(r => {
            const occCount = merged.filter(x => x.status === 'OCCUPIED' && String(x.room_number) === String(r.room_number)).length;
            const maxOcc = Number(r.max_occupancy || 1);
            return occCount < maxOcc; // include partially occupied wards
        });
        newRoomSel.innerHTML = '<option value="">Select room</option>' + available.map(r => {
            const occCount = merged.filter(x => x.status === 'OCCUPIED' && String(x.room_number) === String(r.room_number)).length;
            const maxOcc = Number(r.max_occupancy || 1);
            return `<option value="${r.room_id}">${escapeHtml(r.room_number)} (${escapeHtml(r.room_type_name)}) - ${occCount}/${maxOcc}</option>`;
        }).join('');
        transferDateInput.valueAsDate = new Date();
        reasonInput.value = '';
        transferModal.show();
    }

    async function onTransferSubmit() {
        if (!transferForm.reportValidity()) return;
        const payload = {
            operation: 'transferRoom',
            admission_id: admissionIdHidden.value,
            new_room_id: newRoomSel.value,
            transfer_date: transferDateInput.value,
            nurse_id: user?.user_id || null,
            reason: reasonInput.value
        };
        try {
            const res = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, payload);
            const data = res.data;
            if (data?.success) {
                transferModal.hide();
                await loadActiveAdmissions();
                mergeData();
                renderTable();
                Swal.fire({ icon: 'success', title: 'Transferred', text: 'Room transferred successfully.' });
            } else {
                Swal.fire({ icon: 'error', title: 'Transfer failed', text: data?.message || 'Unable to transfer room.' });
            }
        } catch (e) {
            console.error('Transfer error', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Network or server error during transfer' });
        }
    }

    async function openHistoryModal(admissionId) {
        const modalEl = document.getElementById('rm-history-modal');
        const modal = new bootstrap.Modal(modalEl);
        const histBody = document.getElementById('rm-history-tbody');
        histBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted"><i class="fas fa-spinner fa-pulse me-2"></i>Loading...</td></tr>';
        try {
            const res = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, { operation: 'getRoomStaysByAdmission', admission_id: admissionId });
            const data = res.data;
            if (!data?.success) throw new Error(data?.message || 'Failed');
            const stays = Array.isArray(data.stays) ? data.stays : [];
            if (stays.length === 0) {
                histBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No room stays found</td></tr>';
            } else {
                histBody.innerHTML = stays.map(s => `
                    <tr>
                        <td>${escapeHtml(s.room_number)}</td>
                        <td>${escapeHtml(s.room_type_name)}</td>
                        <td>${escapeHtml(formatDate(s.start_date))}</td>
                        <td>${escapeHtml(formatDate(s.end_date))}</td>
                    </tr>
                `).join('');
            }
            modal.show();
        } catch (e) {
            console.error('History load error', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load room history' });
        }
    }

    function escapeHtml(str) {
        return (str == null ? '' : String(str))
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#039;');
    }
    function formatDate(d) { try { return d ? new Date(d).toLocaleDateString() : ''; } catch { return ''; } }
    async function openRecentModal() {
        const modalEl = document.getElementById('rm-recent-modal');
        const modal = new bootstrap.Modal(modalEl);
        const body = document.getElementById('rm-recent-tbody');
        body.innerHTML = '<tr><td colspan="6" class="text-center text-muted"><i class="fas fa-spinner fa-pulse me-2"></i>Loading...</td></tr>';
        try {
            const res = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, { operation: 'getRecentRoomStays' });
            const data = res.data;
            if (!data?.success) throw new Error(data?.message || 'Failed');
            const stays = Array.isArray(data.stays) ? data.stays : [];
            if (stays.length === 0) {
                body.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No recent stays</td></tr>';
            } else {
                body.innerHTML = stays.map(s => `
                    <tr>
                        <td>${escapeHtml(s.admission_id)}</td>
                        <td>${escapeHtml([s.first_name, s.last_name].filter(Boolean).join(' '))}</td>
                        <td>${escapeHtml(s.room_number)}</td>
                        <td>${escapeHtml(s.room_type_name)}</td>
                        <td>${escapeHtml(formatDate(s.start_date))}</td>
                        <td>${escapeHtml(formatDate(s.end_date))}</td>
                    </tr>
                `).join('');
            }
            modal.show();
        } catch (e) {
            console.error('Recent load error', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load recent room stays' });
        }
    }

    async function openRequestsModal() {
        const modalEl = document.getElementById('rm-requests-modal');
        const modal = new bootstrap.Modal(modalEl);
        const body = document.getElementById('rm-requests-tbody');
        body.innerHTML = '<tr><td colspan="6" class="text-center text-muted"><i class="fas fa-spinner fa-pulse me-2"></i>Loading...</td></tr>';
        try {
            const res = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, { operation: 'listRoomChangeRequests' });
            const data = res.data;
            if (!data?.success) throw new Error(data?.message || 'Failed');
            const rows = Array.isArray(data.requests) ? data.requests : [];
            if (rows.length === 0) {
                body.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No pending requests</td></tr>';
            } else {
                body.innerHTML = rows.map(r => `
                    <tr>
                        <td>${escapeHtml(r.patient_name)}</td>
                        <td>${escapeHtml(r.current_room || '')}</td>
                        <td>${escapeHtml(r.requested_room)}</td>
                        <td>${escapeHtml(r.reason || '')}</td>
                        <td>${escapeHtml(formatDate(r.created_at))}</td>
                        <td>
                            <button class="btn btn-sm btn-outline-success me-1" data-approve="${r.request_id}" data-adm="${r.admission_id}"><i class="fas fa-check"></i> Approve</button>
                            <button class="btn btn-sm btn-outline-danger" data-reject="${r.request_id}"><i class="fas fa-xmark"></i> Reject</button>
                        </td>
                    </tr>
                `).join('');

                Array.from(body.querySelectorAll('button[data-approve]')).forEach(btn => btn.addEventListener('click', async () => {
                    const requestId = btn.getAttribute('data-approve');
                    const ok = await Swal.fire({ icon: 'question', title: 'Approve room change?', showCancelButton: true }).then(r => r.isConfirmed);
                    if (!ok) return;
                    try {
                        const res = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, { operation: 'approveRoomChangeRequest', data: { request_id: requestId, nurse_id: user?.user_id } });
                        const data = res.data;
                        if (!data?.success) throw new Error(data?.message || 'Failed');
                        await loadActiveAdmissions();
                        mergeData();
                        renderTable();
                        openRequestsModal();
                        Swal.fire({ icon: 'success', title: 'Approved' });
                    } catch (e) {
                        console.error(e);
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to approve request' });
                    }
                }));

                Array.from(body.querySelectorAll('button[data-reject]')).forEach(btn => btn.addEventListener('click', async () => {
                    const requestId = btn.getAttribute('data-reject');
                    const { value: reason } = await Swal.fire({ title: 'Reject request', input: 'text', inputPlaceholder: 'Reason (optional)', showCancelButton: true });
                    if (reason === undefined) return;
                    try {
                        const res = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, { operation: 'rejectRoomChangeRequest', data: { request_id: requestId, reason } });
                        const data = res.data;
                        if (!data?.success) throw new Error(data?.message || 'Failed');
                        openRequestsModal();
                        Swal.fire({ icon: 'success', title: 'Rejected' });
                    } catch (e) {
                        console.error(e);
                        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to reject request' });
                    }
                }));
            }
            modal.show();
        } catch (e) {
            console.error('Requests load error', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load requests' });
        }
    }
});



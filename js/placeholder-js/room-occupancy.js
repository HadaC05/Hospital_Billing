console.log('room-occupancy.js loaded');
document.addEventListener('DOMContentLoaded', async () => {
    const baseApiUrl = 'http://localhost/hospital_billing/api';
    
    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }
    
    // State
    let allRooms = [];
    let currentAdmissions = [];
    let merged = [];

    // Initialize date display
    try {
        const dateElement = document.getElementById('occ-date');
        if (dateElement) {
            dateElement.textContent = new Date().toLocaleString();
        }
    } catch (e) {
        console.error('Error setting date:', e);
    }

    // Initialize the occupancy page
    try {
        await Promise.all([loadRooms(), loadActiveAdmissions()]);
        buildMerged();
        renderKpis();
        populateFilters();
        renderTable();
        wireFilters();
    } catch (e) {
        console.error('Failed to init occupancy page', e);
        renderError();
    }

    // Load all rooms
    async function loadRooms() {
        const baseApiUrl = `${window.location.origin}/hospital_billing/api`;
        // Reuse masterfiles endpoint to get all rooms (fetch many to cover all)
        const resp = await axios.get(`${baseApiUrl}/masterfiles-php/get-rooms.php`, { params: { operation: 'getRooms', page: 1, itemsPerPage: 1000 } });
        const data = resp?.data;
        if (!data?.success) throw new Error(data?.message || 'Failed to load rooms');
        allRooms = Array.isArray(data.rooms) ? data.rooms : [];
    }

    // Load active admissions
    async function loadActiveAdmissions() {
        try {
            const response = await axios.post('../api/AdmissionAPI.php', {
                operation: 'getActiveAdmissions'
            });
            const data = response.data;
            
            if (data?.status !== 'success') {
                throw new Error(data?.message || 'Failed to load active admissions');
            }
            
            currentAdmissions = Array.isArray(data.admissions) ? data.admissions : [];
        } catch (error) {
            console.error('Error loading admissions:', error);
            throw error;
        }
    }

    // Merge rooms and admissions data
    function buildMerged() {
        const byRoom = new Map();
        currentAdmissions.forEach(a => {
            if (a.room_id) byRoom.set(String(a.room_id), a);
        });
        
        merged = allRooms.map(r => {
            const occ = byRoom.get(String(r.room_id));
            const patientName = occ ? 
                [occ.patient_fname, occ.patient_mname, occ.patient_lname].filter(Boolean).join(' ') : '';
            
            return {
                room_id: r.room_id,
                room_number: r.room_number,
                room_type_name: r.room_type_name,
                is_available: Number(r.is_available) === 1 && !occ ? 1 : 0,
                status: occ ? 'OCCUPIED' : 'AVAILABLE',
                patient_name: patientName,
                admission_id: occ?.admission_id || '',
                admission_date: occ?.admission_date || '',
                is_er: (r.room_type_name || '').toLowerCase().startsWith('emergency')
            };
        });
    }

    // Render KPI cards
    function renderKpis() {
        const total = merged.length;
        const occupied = merged.filter(x => x.status === 'OCCUPIED').length;
        const available = total - occupied;
        const er = merged.filter(x => x.is_er && x.status === 'OCCUPIED').length;
        
        setText('kpi-total-rooms', total);
        setText('kpi-occupied', occupied);
        setText('kpi-available', available);
        setText('kpi-er', er);
    }

    // Populate filter dropdowns
    function populateFilters() {
        const typeSel = document.getElementById('occ-type');
        if (!typeSel) return;
        
        const types = Array.from(new Set(
            merged.map(m => m.room_type_name).filter(Boolean)
        )).sort((a,b)=>a.localeCompare(b));
        
        const opts = ['<option value="ALL">All Types</option>'].concat(
            types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
        );
        
        typeSel.innerHTML = opts.join('');
    }

    // Wire filter event listeners
    function wireFilters() {
        const search = document.getElementById('occ-search');
        const typeSel = document.getElementById('occ-type');
        const statusSel = document.getElementById('occ-status');
        const sortSel = document.getElementById('occ-sort');
        
        [search, typeSel, statusSel, sortSel].forEach(el => {
            if (!el) return;
            el.addEventListener('input', renderTable);
            el.addEventListener('change', renderTable);
        });
    }

    // Render the main table
    function renderTable() {
        const tbody = document.getElementById('occ-tbody');
        if (!tbody) return;
        
        const search = (document.getElementById('occ-search')?.value || '').toLowerCase().trim();
        const type = document.getElementById('occ-type')?.value || 'ALL';
        const status = document.getElementById('occ-status')?.value || 'ALL';
        const sort = document.getElementById('occ-sort')?.value || 'ROOM';
        
        let rows = merged.filter(m => {
            const matchesSearch = !search || 
                [m.room_number, m.room_type_name, m.patient_name].some(
                    v => String(v||'').toLowerCase().includes(search)
                );
            const matchesType = type === 'ALL' || m.room_type_name === type;
            const matchesStatus = status === 'ALL' || m.status === status;
            
            return matchesSearch && matchesType && matchesStatus;
        });
        
        rows.sort((a, b) => {
            if (sort === 'TYPE') {
                return String(a.room_type_name||'').localeCompare(String(b.room_type_name||''));
            }
            if (sort === 'STATUS') {
                return String(a.status||'').localeCompare(String(b.status||''));
            }
            
            const an = String(a.room_number||'');
            const bn = String(b.room_number||'');
            const ai = parseInt(an, 10); 
            const bi = parseInt(bn, 10);
            
            if (!isNaN(ai) && !isNaN(bi)) return ai - bi;
            return an.localeCompare(bn);
        });
        
        if (rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No rooms found</td></tr>';
            return;
        }
        
        tbody.innerHTML = rows.map(r => `
            <tr>
                <td>${escapeHtml(r.room_number)}</td>
                <td>${escapeHtml(r.room_type_name)}</td>
                <td>${statusBadge(r.status)}</td>
                <td>${escapeHtml(r.patient_name)}</td>
                <td>${escapeHtml(r.admission_id)}</td>
                <td>${formatDate(r.admission_date)}</td>
            </tr>
        `).join('');
    }

    // Utility functions
    function setText(id, val) { 
        const el = document.getElementById(id); 
        if (el) el.textContent = String(val); 
    }
    
    function escapeHtml(str) { 
        return (str == null ? '' : String(str))
            .replace(/&/g,'&amp;')
            .replace(/</g,'&lt;')
            .replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;')
            .replace(/'/g,'&#039;'); 
    }
    
    function toDate(d) { 
        if (!d) return null; 
        const t = Date.parse(d); 
        if (!isNaN(t)) return new Date(t); 
        try { 
            const norm=(d||'').replace(' ','T'); 
            const t2=Date.parse(norm); 
            return isNaN(t2)?null:new Date(t2);
        } catch { 
            return null; 
        } 
    }
    
    function formatDate(d) { 
        const dt = toDate(d); 
        if (!dt) return ''; 
        try { 
            return dt.toLocaleDateString(); 
        } catch { 
            return ''; 
        } 
    }
    
    function statusBadge(s) { 
        const m = (s||'').toUpperCase(); 
        const cls = m==='OCCUPIED'?'danger':(m==='AVAILABLE'?'success':'secondary'); 
        return `<span class="badge bg-${cls}">${escapeHtml(m)}</span>`; 
    }
    
    function renderError() {
        setText('kpi-total-rooms', 0);
        setText('kpi-occupied', 0);
        setText('kpi-available', 0);
        setText('kpi-er', 0);
        
        const tbody = document.getElementById('occ-tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load data</td></tr>';
        }
    }
});
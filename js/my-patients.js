console.log('my-patients.js loaded');

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    const apiUrl = '../api/get-doctor-patients.php';

    const tbody = document.getElementById('mp_list');
    const searchInput = document.getElementById('mp_searchInput');
    const statusFilter = document.getElementById('mp_statusFilter');
    const printBtn = document.getElementById('mp_printBtn');

    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => load(page, pagination.getItemsPerPage(), currentSearch()),
        onItemsPerPageChange: (items) => load(1, items, currentSearch()),
    });

    function currentSearch() {
        return (searchInput?.value || '').trim();
    }

    function load(page = 1, itemsPerPage = 10, search = '') {
        axios.post(apiUrl, {
            operation: 'getDoctorAdmissions',
            page,
            itemsPerPage,
            search,
        }).then((resp) => {
            const payload = resp?.data;
            if (!payload || payload.status !== 'success') {
                console.warn('Failed to load patients:', payload?.message);
                renderRows([]);
                return;
            }
            window.__MY_PAT_ADM__ = payload.data || [];
            renderRows(window.__MY_PAT_ADM__);
            if (payload.pagination) {
                const p = payload.pagination;
                pagination.calculatePagination(p.totalItems, p.currentPage, p.itemsPerPage);
                pagination.generatePaginationControls('mp_pagination');
            }
        }).catch((err) => {
            console.error('API error:', err);
            renderRows([]);
        });
    }

    function renderRows(rows) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No data</td></tr>';
            return;
        }

        const statusValue = (statusFilter?.value || 'all').toLowerCase();
        const filtered = rows.filter((r) => {
            // status filtering
            if (statusValue !== 'all') {
                const s = (r.status || '').toLowerCase();
                if (statusValue === 'active' && s !== 'active') return false;
                if (statusValue === 'discharged' && s !== 'discharged') return false;
                if (statusValue === 'pending' && s !== 'pending') return false;
                if (statusValue === 'critical' && s !== 'critical') return false;
                if (statusValue === 'stable' && s !== 'stable') return false;
            }
            return true;
        });

        filtered.forEach((r) => {
            const admissionDate = formatDate(r.admission_date);
            const dischargeDate = r.discharge_date ? formatDate(r.discharge_date) : 'Not discharged';
            const name = `${safe(r.patient_lname)}, ${safe(r.patient_fname)} ${safe(r.patient_mname || '')}`.trim();
            const statusClass = statusColor(r.status);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${safe(r.patient_id)}</td>
                <td>${name}</td>
                <td>${safe(r.mobile_number || 'N/A')}</td>
                <td>${admissionDate}</td>
                <td>${dischargeDate}</td>
                <td>${truncate(r.admission_reason || '', 60)}</td>
                <td class="${statusClass}">${safe(r.status || '')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function formatDate(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleDateString();
        } catch { return value; }
    }

    function safe(v) {
        if (v === null || v === undefined) return '';
        return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }

    function truncate(t, n) {
        if (!t) return '';
        return t.length <= n ? t : t.substring(0, n) + '...';
    }

    function statusColor(status) {
        const s = (status || '').toLowerCase();
        if (s === 'discharged') return 'text-success';
        if (s === 'pending') return 'text-warning';
        if (s === 'critical') return 'text-danger';
        if (s === 'stable') return 'text-info';
        return 'text-primary';
    }

    function printList() {
        const rows = [];
        document.querySelectorAll('#mp_list tr').forEach((tr) => {
            const tds = tr.querySelectorAll('td');
            if (tds.length >= 7) {
                rows.push({
                    id: tds[0].textContent,
                    name: tds[1].textContent,
                    contact: tds[2].textContent,
                    admission: tds[3].textContent,
                    discharge: tds[4].textContent,
                    status: tds[6].textContent,
                });
            }
        });
        document.getElementById('mp_print_date').textContent = new Date().toLocaleString();
        const tbl = document.getElementById('mp_print_table');
        tbl.innerHTML = `
            <thead>
                <tr>
                    <th>Patient ID</th>
                    <th>Patient Name</th>
                    <th>Contact</th>
                    <th>Admission Date</th>
                    <th>Discharge Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map(r => `
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.name}</td>
                        <td>${r.contact}</td>
                        <td>${r.admission}</td>
                        <td>${r.discharge}</td>
                        <td>${r.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        const content = document.getElementById('mp_printView').innerHTML;
        const original = document.body.innerHTML;
        document.body.innerHTML = content;
        window.print();
        document.body.innerHTML = original;
        location.reload();
    }

    // Events
    if (searchInput) {
        searchInput.addEventListener('input', () => load(1, pagination.getItemsPerPage(), currentSearch()));
    }
    if (statusFilter) {
        statusFilter.addEventListener('change', () => renderRows(window.__MY_PAT_ADM__ || []));
    }
    if (printBtn) {
        printBtn.addEventListener('click', printList);
    }

    // Initial load
    load(1, pagination.getItemsPerPage(), currentSearch());
});

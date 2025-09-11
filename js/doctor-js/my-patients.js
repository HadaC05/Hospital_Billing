console.log('my-patients.js loaded');

document.addEventListener('DOMContentLoaded', async () => {

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../../index.html';
        return;
    }

    const apiUrl = `${window.location.origin}/hospital_billing/api/doctor-php/get-doctor-patients.php`;

    const tbody = document.getElementById('mp_list');

    // Load data
    async function loadPatients() {
        try {
            const response = await axios.get(apiUrl, {
                params: { operation: "getDoctorAdmissions" },
                withCredentials: true

            });

            const data = response.data;
            if (!data.success) {
                console.error("Error fetching doctor patients:", data.message);
                renderRows([]);
                return;
            }

            renderRows(data.data);
        } catch (err) {
            console.error("API error:", err);
            renderRows([]);
        }
    }

    function renderRows(rows) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No data</td></tr>';
            return;
        }

        rows.forEach((r) => {
            const admissionDate = formatDate(r.admission_date);
            const statusClass = statusColor(r.status);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${admissionDate}</td>
                <td>${safe(r.patient_name)}</td>
                <td>${safe(r.room_number)}</td>
                <td>${truncate(r.admission_reason || '', 60)}</td>
                <td class="${statusClass}">${safe(r.status || '')}</td>
                <td>Placeholder</td>
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

    await loadPatients();

});
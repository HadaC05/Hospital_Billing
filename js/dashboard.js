console.log('dashboard.js is working');

document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const welcomeMessage = document.getElementById('welcomeMessage') || document.getElementById('welcome-msg');

    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    if (welcomeMessage) {
        welcomeMessage.textContent = `Welcome, ${user.full_name || 'User'}`;
    }

    loadAdminDashboardStats();
});

function getBaseApiUrl() {
    return `${window.location.origin}/hospital_billing/api`;
}

async function loadAdminDashboardStats() {
    try {
        const [admittedCount, billingOverview, pendingClaims] = await Promise.all([
            fetchAdmittedPatientsCount(),
            fetchBillingOverview(),
            fetchInsuranceClaims('PENDING')
        ]);

        // KPIs
        setText('#kpi-admitted', admittedCount);
        setText('#kpi-invoices', billingOverview?.kpis?.total_invoices ?? 0);
        setText('#kpi-billed', formatCurrency(billingOverview?.kpis?.total_billed ?? 0));
        setText('#kpi-due', formatCurrency(billingOverview?.kpis?.total_due ?? 0));

        // Recent invoices table
        populateRecentInvoices(billingOverview?.invoices ?? []);

        // Recent claims table
        populateRecentClaims(pendingClaims ?? []);
    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
    }
}

async function fetchAdmittedPatientsCount() {
    const base = getBaseApiUrl();
    try {
        const resp = await axios.get(`${base}/get-admissions.php`, {
            params: { operation: 'getAdmissions' }
        });
        const payload = resp?.data;
        if (!payload || payload.status !== 'success' || !Array.isArray(payload.data)) {
            return 0;
        }
        // Prefer status-based admitted flag; fallback to missing discharge_date
        const rows = payload.data;
        const admitted = rows.filter((r) => {
            const status = (r.status || '').toString().trim().toUpperCase();
            const isAdmittedByStatus = status === 'ADMITTED' || status === 'ACTIVE' || status === 'ONGOING';
            const noDischargeDate = !r.discharge_date;
            return isAdmittedByStatus || noDischargeDate;
        });
        return admitted.length;
    } catch (e) {
        console.warn('fetchAdmittedPatientsCount failed:', e);
        return 0;
    }
}

async function fetchBillingOverview() {
    const base = getBaseApiUrl();
    try {
        const resp = await axios.post(`${base}/billing.php`, {
            operation: 'getOverview',
            json: JSON.stringify({})
        });
        if (resp?.data?.success) {
            return resp.data;
        }
        return { kpis: { total_invoices: 0, total_billed: 0, total_covered: 0, total_due: 0 }, invoices: [] };
    } catch (e) {
        console.warn('fetchBillingOverview failed:', e);
        return { kpis: { total_invoices: 0, total_billed: 0, total_covered: 0, total_due: 0 }, invoices: [] };
    }
}

async function fetchInsuranceClaims(status) {
    const base = getBaseApiUrl();
    try {
        const resp = await axios.post(`${base}/insurance.php`, {
            operation: 'getClaims',
            json: JSON.stringify({ status })
        });
        if (resp?.data?.success && Array.isArray(resp.data.claims)) {
            return resp.data.claims;
        }
        return [];
    } catch (e) {
        console.warn('fetchInsuranceClaims failed:', e);
        return [];
    }
}

function populateRecentInvoices(invoices) {
    const tbody = document.getElementById('recent-invoices');
    if (!tbody) return;
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No data</td></tr>';
        return;
    }
    const rows = invoices.slice(0, 5).map((inv) => {
        const id = safe(inv.invoice_id);
        const date = formatDate(inv.invoice_date);
        const patient = safe(inv.patient_name);
        const total = formatCurrency(inv.total_amount);
        const due = formatCurrency(inv.amount_due);
        const status = badge(inv.status);
        return `
			<tr>
				<td>${id}</td>
				<td>${date}</td>
				<td>${patient}</td>
				<td class="text-end">${total}</td>
				<td class="text-end">${due}</td>
				<td>${status}</td>
			</tr>
		`;
    }).join('');
    tbody.innerHTML = rows;
}

function populateRecentClaims(claims) {
    const tbody = document.getElementById('recent-claims');
    if (!tbody) return;
    if (!claims || claims.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No data</td></tr>';
        return;
    }
    const rows = claims.slice(0, 5).map((c) => {
        const id = safe(c.claim_id);
        const provider = safe(c.provider_name);
        const patient = safe(c.patient_name);
        const status = badge(c.status);
        const approved = formatCurrency(c.approved_amount || 0);
        return `
			<tr>
				<td>${id}</td>
				<td>${provider}</td>
				<td>${patient}</td>
				<td>${status}</td>
				<td class="text-end">${approved}</td>
			</tr>
		`;
    }).join('');
    tbody.innerHTML = rows;
}

function setText(selector, value) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (el) { el.textContent = `${value}`; }
}

function formatCurrency(value) {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(num);
}

function formatDate(value) {
    if (!value) return '';
    try {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return value;
        return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: '2-digit' });
    } catch { return value; }
}

function safe(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function badge(status) {
    const s = (status || '').toString().toUpperCase();
    let cls = 'secondary';
    if (s === 'PAID' || s === 'APPROVED') cls = 'success';
    else if (s === 'UNPAID' || s === 'PENDING') cls = 'warning';
    else if (s === 'DENIED' || s === 'CANCELLED') cls = 'danger';
    return `<span class="badge bg-${cls}">${safe(status)}</span>`;
}
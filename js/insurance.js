console.log('insurance.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Sidebar is handled globally by js/sidebar.js

    // Elements
    const statusFilter = document.getElementById('statusFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const claimsBody = document.getElementById('claimsBody');

    async function loadClaims() {
        const status = statusFilter.value;
        claimsBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
        try {
            const response = await axios.post(`${apiBase}/insurance.php`, {
                operation: 'getClaims',
                json: JSON.stringify({ status })
            });
            if (response.data && response.data.success) {
                renderClaims(response.data.claims || []);
            } else {
                claimsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load claims.</td></tr>';
            }
        } catch (e) {
            console.error(e);
            claimsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    function peso(n) {
        return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderClaims(claims) {
        if (!claims || claims.length === 0) {
            claimsBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No claims found.</td></tr>';
            return;
        }
        claimsBody.innerHTML = '';
        claims.forEach(claim => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${claim.claim_id}</td>
                <td>${claim.invoice_id}</td>
                <td>${claim.patient_name || ''}</td>
                <td>${claim.provider_name || ''}</td>
                <td>${new Date(claim.submitted_date).toLocaleDateString()}</td>
                <td>${claim.status}</td>
                <td class="text-end">${peso(claim.approved_amount)}</td>
                <td>
                    ${claim.status === 'PENDING' ? `
                        <button class="btn btn-sm btn-success" data-action="approve" data-id="${claim.claim_id}">Approve</button>
                        <button class="btn btn-sm btn-danger" data-action="deny" data-id="${claim.claim_id}">Deny</button>
                    ` : '<span class="text-muted">—</span>'}
                </td>
            `;
            claimsBody.appendChild(tr);
        });
    }

    // Approve/Deny Handlers
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.dataset.action === 'approve') {
            const claimId = btn.dataset.id;
            try {
                const resp = await axios.post(`${apiBase}/insurance.php`, {
                    operation: 'getClaimDetails',
                    json: JSON.stringify({ claim_id: claimId })
                });
                if (resp.data && resp.data.success) {
                    const d = resp.data.detail;
                    document.getElementById('approve_claim_id').value = d.claim_id;
                    document.getElementById('approve_invoice_total').value = peso(d.total_amount);
                    document.getElementById('approve_current_covered').value = peso(d.insurance_covered_amount);
                    document.getElementById('approve_amount_due').value = peso(d.amount_due);
                    document.getElementById('approve_amount').value = d.amount_due;
                    new bootstrap.Modal(document.getElementById('approveModal')).show();
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: resp.data.message || 'Failed to load claim detail',
                        icon: 'error'
                    });
                }
            } catch {
                Swal.fire({
                    title: 'Error',
                    text: 'Error loading claim detail',
                    icon: 'error'
                });
            }
        }

        if (btn.dataset.action === 'deny') {
            document.getElementById('deny_claim_id').value = btn.dataset.id;
            new bootstrap.Modal(document.getElementById('denyModal')).show();
        }
    });

    document.getElementById('approveForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const claim_id = document.getElementById('approve_claim_id').value;
        const approve_amount = parseFloat(document.getElementById('approve_amount').value || '0');
        try {
            const resp = await axios.post(`${apiBase}/insurance.php`, {
                operation: 'approveClaim',
                json: JSON.stringify({ claim_id, approve_amount })
            });
            if (resp.data && resp.data.success) {
                bootstrap.Modal.getInstance(document.getElementById('approveModal')).hide();
                await loadClaims();
                Swal.fire({
                    title: 'Approved',
                    text: 'Claim approved',
                    icon: 'success'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: resp.data.message || 'Approval failed',
                    icon: 'error'
                });
            }
        } catch {
            Swal.fire({
                title: 'Error',
                text: 'Network error while approving',
                icon: 'error'
            });
        }
    });

    document.getElementById('confirmDenyBtn').addEventListener('click', async () => {
        const claim_id = document.getElementById('deny_claim_id').value;
        try {
            const resp = await axios.post(`${apiBase}/insurance.php`, {
                operation: 'denyClaim',
                json: JSON.stringify({ claim_id })
            });
            if (resp.data && resp.data.success) {
                bootstrap.Modal.getInstance(document.getElementById('denyModal')).hide();
                await loadClaims();
                Swal.fire({
                    title: 'Denied',
                    text: 'Claim denied',
                    icon: 'success'
                });
            } else {
                Swal.fire({
                    title: 'Error',
                    text: resp.data.message || 'Deny failed',
                    icon: 'error'
                });
            }
        } catch {
            Swal.fire({
                title: 'Error',
                text: 'Network error while denying',
                icon: 'error'
            });
        }
    });

    // Filters
    statusFilter.addEventListener('change', loadClaims);
    refreshBtn.addEventListener('click', loadClaims);

    // Initial
    await loadClaims();
});



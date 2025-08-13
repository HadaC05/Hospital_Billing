console.log('insurance.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Load sidebar
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    try {
        const sidebarResponse = await axios.get('../components/sidebar.html');
        sidebarPlaceholder.innerHTML = sidebarResponse.data;

        const sidebarElement = document.getElementById('sidebar');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const logoutBtn = document.getElementById('logout-btn');

        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebarElement.classList.add('collapsed');
        }

        hamburgerBtn.addEventListener('click', () => {
            sidebarElement.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebarElement.classList.contains('collapsed'));
        });

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await axios.post(`${apiBase}/logout.php`);
                    localStorage.removeItem('user');
                    window.location.href = '../index.html';
                } catch {
                    alert('Logout failed.');
                }
            });
        }

        // Populate sidebar links per permissions
        try {
            const response = await axios.post(`${apiBase}/get-permissions.php`, {
                operation: 'getUserPermissions',
                json: JSON.stringify({ user_id: user.user_id })
            });
            if (response.data && response.data.success) {
                renderModules(response.data.permissions);
            }
        } catch (e) {
            console.warn('Permission load failed', e);
        }
    } catch (e) {
        console.error('Failed to load sidebar', e);
    }

    function renderModules(permissions) {
        const moduleMap = {
            'dashboard': { label: 'Dashboard', link: '../dashboard.html' },
            'manage_users': { label: 'Manage Users', link: 'user-management.html' },
            'manage_roles': { label: 'Role Settings', link: 'role-settings.html' },
            'view_admissions': { label: 'Admission Records', link: 'admission-records.html' },
            'edit_admissions': { label: 'Admission Editor', link: 'admission-editor.html' },
            'access_billing': { label: 'Billing Overview', link: 'billing-overview.html' },
            'generate_invoice': { label: 'Invoice Generator', link: 'invoice-generator.html' },
            'view_patient_records': { label: 'Patient Records Viewer', link: 'patient-records.html' },
            'approve_insurance': { label: 'Insurance Approval Panel', link: 'insurance-approval.html' },
            'dashboard': { label: 'Dashboard', link: '../components/dashboard.html' }
        };

        const inventoryMap = {
            'manage_medicine': { label: 'Medicine Module', link: 'inv-medicine.html' },
            'manage_surgeries': { label: 'Surgical Module', link: 'inv-surgery.html' },
            'manage_labtests': { label: 'Laboratory Module', link: 'inv-labtest.html' },
            'manage_treatments': { label: 'Treatment Module', link: 'inv-treatments.html' },
            'manage_rooms': { label: 'Room Management', link: 'inv-rooms.html' },
        };

        const sidebarLinks = document.getElementById('sidebar-links');
        const accordionBody = document.querySelector('#invCollapse .accordion-body');

        permissions.forEach(permission => {
            if (moduleMap[permission]) {
                const { label, link } = moduleMap[permission];
                const a = document.createElement('a');
                a.href = link.startsWith('#') ? `../module/${link}` : link;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white');
                a.textContent = label;
                sidebarLinks.appendChild(a);
            }
        });

        let inventoryShown = false;
        permissions.forEach(permission => {
            if (inventoryMap[permission]) {
                inventoryShown = true;
                const { label, link } = inventoryMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white');
                a.textContent = label;
                accordionBody.appendChild(a);
            }
        });

        if (!inventoryShown) {
            const inventoryAccordionItem = document.querySelector('.accordion-item');
            if (inventoryAccordionItem) {
                inventoryAccordionItem.style.display = 'none';
            }
        }
    }

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
                    alert(resp.data.message || 'Failed to load claim detail');
                }
            } catch {
                alert('Error loading claim detail');
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
                alert('Claim approved');
            } else {
                alert(resp.data.message || 'Approval failed');
            }
        } catch {
            alert('Network error while approving');
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
                alert('Claim denied');
            } else {
                alert(resp.data.message || 'Deny failed');
            }
        } catch {
            alert('Network error while denying');
        }
    });

    // Filters
    statusFilter.addEventListener('change', loadClaims);
    refreshBtn.addEventListener('click', loadClaims);

    // Initial
    await loadClaims();
});



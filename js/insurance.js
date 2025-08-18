console.log('insurance.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Check if user has permission to access insurance approval
    try {
        const response = await axios.post(`${apiBase}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data.success || !data.permissions.includes('approve_insurance')) {
            alert('You do not have permission to access this page.');
            window.location.href = '../components/dashboard.html';
            return;
        }
        
        // Store permissions for sidebar rendering
        window.userPermissions = data.permissions;
    } catch (error) {
        console.error('Error checking permissions:', error);
        alert('Failed to verify permissions. Please try again.');
        window.location.href = '../components/dashboard.html';
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

        // Set user name in sidebar
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.full_name || user.username;
        }

        // Render navigation modules based on permissions
        if (window.userPermissions) {
            renderModules(window.userPermissions);
        }
    } catch (e) {
        console.error('Failed to load sidebar', e);
    }

    function renderModules(permissions) {
        const moduleMap = {
            'dashboard': { label: 'Dashboard', link: '../components/dashboard.html' },
            'manage_users': { label: 'Manage Users', link: 'user-management.html' },
            'manage_roles': { label: 'Role Settings', link: 'role-settings.html' },
            'view_admissions': { label: 'Admission Records', link: 'admission-records.html' },
            'edit_admissions': { label: 'Admission Editor', link: 'admission-editor.html' },
            'access_billing': { label: 'Billing Overview', link: 'billing-overview.html' },
            'generate_invoice': { label: 'Invoice Generator', link: 'invoice-generator.html' },
            'view_patient_records': { label: 'Patient Records Viewer', link: 'patient-records.html' },
            'approve_insurance': { label: 'Insurance Approval Panel', link: 'insurance-approval.html' },
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

        // Clear existing links
        if (sidebarLinks) sidebarLinks.innerHTML = '';
        if (accordionBody) accordionBody.innerHTML = '';

        // Add standalone navigation links
        permissions.forEach(permission => {
            if (moduleMap[permission]) {
                const { label, link } = moduleMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white', 'text-decoration-none');
                a.innerHTML = `<i class="fas fa-chevron-right me-2"></i>${label}`;
                
                // Highlight current page
                if (link === 'insurance-approval.html') {
                    a.classList.add('bg-primary', 'bg-opacity-25');
                }
                
                if (sidebarLinks) {
                    sidebarLinks.appendChild(a);
                }
            }
        });

        // Add inventory modules to accordion
        let inventoryShown = false;
        permissions.forEach(permission => {
            if (inventoryMap[permission]) {
                const { label, link } = inventoryMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-dark', 'text-decoration-none', 'border-bottom', 'border-light');
                a.innerHTML = `<i class="fas fa-box me-2 text-primary"></i>${label}`;
                
                // Add hover effects
                a.addEventListener('mouseenter', () => {
                    a.classList.add('bg-light');
                });
                a.addEventListener('mouseleave', () => {
                    if (!a.classList.contains('bg-primary')) {
                        a.classList.remove('bg-light');
                    }
                });
                
                if (accordionBody) {
                    accordionBody.appendChild(a);
                }
                inventoryShown = true;
            }
        });

        // Show/hide inventory accordion based on permissions
        const inventoryAccordion = document.querySelector('#invHeading').parentElement;
        if (inventoryAccordion) {
            inventoryAccordion.style.display = inventoryShown ? 'block' : 'none';
        }
    }

    // Elements
    const statusFilter = document.getElementById('statusFilter');
    const refreshBtn = document.getElementById('refreshBtn');
    const claimsBody = document.getElementById('claimsBody');
    const searchInput = document.getElementById('searchClaims');

    let allClaims = [];
    let filteredClaims = [];

    async function loadClaims() {
        const status = statusFilter.value;
        claimsBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
        try {
            const response = await axios.post(`${apiBase}/insurance.php`, {
                operation: 'getClaims',
                json: JSON.stringify({ status })
            });
            if (response.data && response.data.success) {
                allClaims = response.data.claims || [];
                applyClaimsFilter();
            } else {
                claimsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load claims.</td></tr>';
            }
        } catch (e) {
            console.error(e);
            claimsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    function applyClaimsFilter() {
        const searchTerm = searchInput?.value.toLowerCase() || '';
        
        filteredClaims = allClaims.filter(claim => {
            const matchesSearch = !searchTerm || 
                claim.claim_id.toString().includes(searchTerm) ||
                claim.invoice_id.toString().includes(searchTerm) ||
                (claim.patient_name && claim.patient_name.toLowerCase().includes(searchTerm)) ||
                (claim.provider_name && claim.provider_name.toLowerCase().includes(searchTerm));
            
            return matchesSearch;
        });
        
        renderClaims(filteredClaims);
    }

    function peso(n) {
        return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getStatusBadge(status) {
        const statusLower = status.toLowerCase();
        switch(statusLower) {
            case 'pending':
                return '<span class="status-badge pending">Pending</span>';
            case 'approved':
                return '<span class="status-badge approved">Approved</span>';
            case 'denied':
            case 'rejected':
                return '<span class="status-badge rejected">Rejected</span>';
            case 'under review':
                return '<span class="status-badge under-review">Under Review</span>';
            default:
                return `<span class="status-badge pending">${status}</span>`;
        }
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
                <td>${getStatusBadge(claim.status)}</td>
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

    // Filters and search
    statusFilter.addEventListener('change', loadClaims);
    refreshBtn.addEventListener('click', loadClaims);
    
    if (searchInput) {
        searchInput.addEventListener('input', applyClaimsFilter);
    }

    // Initial
    await loadClaims();
});



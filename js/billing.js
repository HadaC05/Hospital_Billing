console.log('billing.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = '../index.html'; return; }

    // Check if user has permission to access billing
    try {
        const response = await axios.post(`${apiBase}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data.success || !data.permissions.includes('access_billing')) {
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

        if (localStorage.getItem('sidebarCollapsed') === 'true') sidebarElement.classList.add('collapsed');
        hamburgerBtn.addEventListener('click', () => {
            sidebarElement.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebarElement.classList.contains('collapsed'));
        });
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try { await axios.post(`${apiBase}/logout.php`); localStorage.removeItem('user'); window.location.href = '../index.html'; }
                catch { alert('Logout failed.'); }
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
    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }

    // Sidebar modules renderer
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
                if (link === 'billing-overview.html') {
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
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const statusFilter = document.getElementById('statusFilter');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const printBtn = document.getElementById('printBtn');
    const invoiceBody = document.getElementById('invoiceBody');

    function peso(n) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    async function loadOverview() {
        invoiceBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
        try {
            const resp = await axios.post(`${apiBase}/billing.php`, {
                operation: 'getOverview',
                json: JSON.stringify({
                    start_date: startDate.value || null,
                    end_date: endDate.value || null,
                    status: statusFilter.value || 'ALL'
                })
            });
            if (resp.data && resp.data.success) {
                renderKpis(resp.data.kpis);
                renderInvoices(resp.data.invoices || []);
            } else {
                invoiceBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load.</td></tr>';
            }
        } catch (e) {
            console.error(e);
            invoiceBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    function renderKpis(k) {
        document.getElementById('kpiInvoices').textContent = k.total_invoices ?? 0;
        document.getElementById('kpiBilled').textContent = peso(k.total_billed ?? 0);
        document.getElementById('kpiCovered').textContent = peso(k.total_covered ?? 0);
        document.getElementById('kpiDue').textContent = peso(k.total_due ?? 0);
    }

    function renderInvoices(invoices) {
        if (!invoices.length) {
            invoiceBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No data.</td></tr>';
            return;
        }
        invoiceBody.innerHTML = '';
        invoices.forEach(inv => {
            const tr = document.createElement('tr');
            const dateStr = new Date(inv.invoice_date).toLocaleDateString();
            tr.innerHTML = `
                <td>${inv.invoice_id}</td>
                <td>${dateStr}</td>
                <td>${inv.patient_name || ''}</td>
                <td class="text-end">${peso(inv.total_amount)}</td>
                <td class="text-end">${peso(inv.insurance_covered_amount)}</td>
                <td class="text-end">${peso(inv.amount_due)}</td>
                <td>${inv.status}</td>
            `;
            invoiceBody.appendChild(tr);
        });
    }

    // Add search functionality for billing records
    function searchBillingRecords() {
        const searchTerm = document.getElementById('searchBilling')?.value.toLowerCase() || '';
        
        // Filter the current invoice data based on search term
        const filteredInvoices = currentInvoiceData.filter(invoice => {
            return invoice.patient_name.toLowerCase().includes(searchTerm) ||
                   invoice.invoice_id.toString().includes(searchTerm) ||
                   invoice.status.toLowerCase().includes(searchTerm);
        });
        
        // Re-render the table with filtered data
        renderInvoices(filteredInvoices);
    }

    // Event listener for search
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('searchBilling');
        if (searchInput) {
            searchInput.addEventListener('input', searchBillingRecords);
        }
    });

    // Print
    printBtn.addEventListener('click', () => {
        const area = document.getElementById('printArea');
        area.innerHTML = document.querySelector('.content').innerHTML;
        const original = document.body.innerHTML;
        document.body.innerHTML = area.innerHTML;
        window.print();
        document.body.innerHTML = original;
        location.reload();
    });

    applyFiltersBtn.addEventListener('click', loadOverview);

    await loadOverview();
});



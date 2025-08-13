console.log('billing.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = '../index.html'; return; }

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

        // Populate sidebar links
        try {
            const resp = await axios.post(`${apiBase}/get-permissions.php`, {
                operation: 'getUserPermissions',
                json: JSON.stringify({ user_id: user.user_id })
            });
            if (resp.data && resp.data.success) renderModules(resp.data.permissions);
        } catch {}
    } catch {}

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
            if (inventoryAccordionItem) inventoryAccordionItem.style.display = 'none';
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



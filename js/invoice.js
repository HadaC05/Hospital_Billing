console.log('invoice.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));

    // Auth check
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Sidebar loader (reuse pattern used elsewhere)
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
                } catch (e) {
                    alert('Logout failed.');
                }
            });
        }

        // Load permissions and populate sidebar links
        try {
            const response = await axios.post(`${apiBase}/get-permissions.php`, {
                operation: 'getUserPermissions',
                json: JSON.stringify({ user_id: user?.user_id })
            });
            const data = response.data;
            if (data.success) {
                renderModules(data.permissions);
            }
        } catch (permErr) {
            console.warn('Could not load permissions for sidebar', permErr);
        }
    } catch (e) {
        console.error('Failed to load sidebar', e);
    }

    // Sidebar modules renderer
    function renderModules(permissions) {
        const moduleMap = {
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
    const findAdmissionForm = document.getElementById('findAdmissionForm');
    const admissionIdInput = document.getElementById('admission_id');
    const itemsBody = document.getElementById('billableItemsBody');
    const itemRowTemplate = document.getElementById('itemRowTemplate');
    const subtotalText = document.getElementById('subtotalText');
    const coveredText = document.getElementById('coveredText');
    const totalDueText = document.getElementById('totalDueText');
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    const resetBtn = document.getElementById('resetBtn');
    const printPreviewBtn = document.getElementById('printPreviewBtn');
    const admissionMeta = document.getElementById('admissionMeta');

    let currentAdmissionId = null;
    let currentItems = [];
    let lastCreatedInvoiceId = null;

    function peso(amount) {
        return Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderItems(items) {
        itemsBody.innerHTML = '';
        if (!items || items.length === 0) {
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No items found for this admission.</td></tr>';
            return;
        }

        let subtotal = 0;
        let covered = 0;

        items.forEach((item, idx) => {
            const row = itemRowTemplate.content.firstElementChild.cloneNode(true);
            const lineTotal = Number(item.quantity) * Number(item.unit_price);
            const coverage = Number(item.coverage_amount || 0);

            subtotal += lineTotal;
            covered += coverage;

            row.querySelector('.rowIndex').textContent = String(idx + 1);
            row.querySelector('.type').textContent = item.service_type_name || item.type || '';
            row.querySelector('.reference').textContent = item.svc_reference_id || item.reference || '';
            row.querySelector('.description').textContent = item.description || item.item_description || '';
            row.querySelector('.qty').textContent = Number(item.quantity);
            row.querySelector('.unit').textContent = peso(item.unit_price);
            row.querySelector('.line').textContent = peso(lineTotal);
            row.querySelector('.coverage').textContent = peso(coverage);
            row.querySelector('.payable').textContent = peso(lineTotal - coverage);

            itemsBody.appendChild(row);
        });

        subtotalText.textContent = peso(subtotal);
        coveredText.textContent = peso(covered);
        totalDueText.textContent = peso(subtotal - covered);

        // Enable actions
        createInvoiceBtn.disabled = false;
        printPreviewBtn.disabled = false;
    }

    async function loadBillableItems(admissionId) {
        try {
            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'getBillableItems',
                json: JSON.stringify({ admission_id: admissionId })
            });

            if (response.data && response.data.success) {
                currentItems = response.data.items || [];
                const a = response.data.admission || {};
                admissionMeta.textContent = a && a.admission_id ? `Admission #${a.admission_id} • ${a.patient_lname}, ${a.patient_fname} • ${new Date(a.admission_date).toLocaleDateString()}` : '';
                renderItems(currentItems);
            } else {
                itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load items.</td></tr>';
            }
        } catch (e) {
            console.error(e);
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    async function createInvoice() {
        try {
            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'createInvoice',
                json: JSON.stringify({
                    admission_id: currentAdmissionId,
                    items: currentItems
                })
            });

            if (response.data && response.data.success) {
                lastCreatedInvoiceId = response.data.invoice_id;
                document.getElementById('createdInvoiceId').textContent = lastCreatedInvoiceId;
                new bootstrap.Modal(document.getElementById('invoiceSuccessModal')).show();
            } else {
                alert(response.data.message || 'Failed to create invoice');
            }
        } catch (e) {
            console.error(e);
            alert('Network error while creating invoice');
        }
    }

    // Print preview
    function buildPrint() {
        const container = document.getElementById('printArea');
        const now = new Date().toLocaleString();
        const rows = currentItems.map((item, i) => {
            const line = Number(item.quantity) * Number(item.unit_price);
            const cov = Number(item.coverage_amount || 0);
            const pay = line - cov;
            return `<tr>
                <td>${i + 1}</td>
                <td>${item.service_type_name || item.type || ''}</td>
                <td>${item.svc_reference_id || ''}</td>
                <td>${item.description || ''}</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${peso(item.unit_price)}</td>
                <td class="text-end">${peso(line)}</td>
                <td class="text-end">${peso(cov)}</td>
                <td class="text-end">${peso(pay)}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <div class="container py-4">
                <div class="text-center mb-3">
                    <h3>Hospital Management System</h3>
                    <h5>Invoice Preview</h5>
                    <div>Generated: ${now}</div>
                    ${lastCreatedInvoiceId ? `<div>Invoice ID: <strong>${lastCreatedInvoiceId}</strong></div>` : ''}
                    <div>${admissionMeta.textContent}</div>
                </div>
                <table class="table table-bordered table-sm">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Type</th>
                            <th>Reference</th>
                            <th>Description</th>
                            <th class="text-end">Qty</th>
                            <th class="text-end">Unit</th>
                            <th class="text-end">Line</th>
                            <th class="text-end">Coverage</th>
                            <th class="text-end">Payable</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <div class="d-flex justify-content-end">
                    <div style="min-width: 280px">
                        <div class="d-flex justify-content-between"><span>Subtotal</span><strong>${subtotalText.textContent}</strong></div>
                        <div class="d-flex justify-content-between"><span>Insurance Covered</span><strong>${coveredText.textContent}</strong></div>
                        <hr />
                        <div class="d-flex justify-content-between fs-5"><span>Total Due</span><strong>${totalDueText.textContent}</strong></div>
                    </div>
                </div>
            </div>
        `;
    }

    // Events
    if (findAdmissionForm) {
        findAdmissionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = admissionIdInput.value.trim();
            if (!id) return;
            currentAdmissionId = Number(id);
            createInvoiceBtn.disabled = true;
            printPreviewBtn.disabled = true;
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center">Loading...</td></tr>';
            await loadBillableItems(currentAdmissionId);
        });
    }

    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', async () => {
            if (!currentAdmissionId || currentItems.length === 0) return;
            await createInvoice();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            currentAdmissionId = null;
            currentItems = [];
            admissionIdInput.value = '';
            admissionMeta.textContent = '';
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No items loaded.</td></tr>';
            subtotalText.textContent = '0.00';
            coveredText.textContent = '0.00';
            totalDueText.textContent = '0.00';
            createInvoiceBtn.disabled = true;
            printPreviewBtn.disabled = true;
        });
    }

    if (printPreviewBtn) {
        printPreviewBtn.addEventListener('click', () => {
            if (currentItems.length === 0) return;
            buildPrint();
            const content = document.getElementById('printArea').innerHTML;
            const original = document.body.innerHTML;
            document.body.innerHTML = content;
            window.print();
            document.body.innerHTML = original;
            location.reload();
        });
    }
});



console.log('invoice.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));

    // Auth check
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Check if user has permission to generate invoices
    try {
        const response = await axios.post(`${apiBase}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data.success || !data.permissions.includes('generate_invoice')) {
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
                if (link === 'invoice-generator.html') {
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
    const findAdmissionForm = document.getElementById('findAdmissionForm');
    const patientSelect = document.getElementById('patient_select');
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
    let allItems = [];
    let filteredItems = [];
    let lastCreatedInvoiceId = null;
    let patientsData = [];

    // Load patients for dropdown
    async function loadPatients() {
        try {
            const response = await axios.get(`${apiBase}/get-patients.php`, {
                params: {
                    operation: 'getPatients',
                    json: JSON.stringify({})
                }
            });
            const data = response.data;
            if (data.success && Array.isArray(data.patients)) {
                // Now we need to get admissions for each patient
                const patientsWithAdmissions = await getPatientsWithAdmissions(data.patients);
                patientsData = patientsWithAdmissions;
                populatePatientDropdown(patientsWithAdmissions);
            } else {
                patientSelect.innerHTML = '<option value="">No patients found</option>';
            }
        } catch (error) {
            console.error('Error loading patients:', error);
            patientSelect.innerHTML = '<option value="">Error loading patients</option>';
        }
    }

    // Get patients with their admissions
    async function getPatientsWithAdmissions(patients) {
        const patientsWithAdmissions = [];
        
        for (const patient of patients) {
            try {
                const response = await axios.get(`${apiBase}/get-patients.php`, {
                    params: {
                        operation: 'getPatientDetails',
                        json: JSON.stringify({ patient_id: patient.patient_id })
                    }
                });
                
                if (response.data.success && response.data.admissions && response.data.admissions.length > 0) {
                    // Add each admission as a separate option
                    response.data.admissions.forEach(admission => {
                        patientsWithAdmissions.push({
                            admission_id: admission.admission_id,
                            first_name: patient.patient_fname,
                            last_name: patient.patient_lname,
                            middle_name: patient.patient_mname,
                            admission_date: admission.admission_date,
                            patient_id: patient.patient_id,
                            status: admission.status
                        });
                    });
                }
            } catch (error) {
                console.error(`Error loading admissions for patient ${patient.patient_id}:`, error);
            }
        }
        
        return patientsWithAdmissions;
    }

    // Populate patient dropdown
    function populatePatientDropdown(patients) {
        patientSelect.innerHTML = '<option value="">Select a patient...</option>';
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.admission_id;
            option.textContent = `${patient.first_name} ${patient.last_name} - Admission #${patient.admission_id}`;
            option.dataset.patientInfo = JSON.stringify(patient);
            patientSelect.appendChild(option);
        });
    }

    // Initialize patient loading
    loadPatients();

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

    function applyItemsFilter() {
        const searchTerm = document.getElementById('searchItems')?.value.toLowerCase() || '';
        const typeFilter = document.getElementById('filterItemType')?.value || '';
        
        filteredItems = allItems.filter(item => {
            const matchesSearch = !searchTerm || 
                (item.service_type_name && item.service_type_name.toLowerCase().includes(searchTerm)) ||
                (item.description && item.description.toLowerCase().includes(searchTerm)) ||
                (item.item_description && item.item_description.toLowerCase().includes(searchTerm)) ||
                (item.svc_reference_id && item.svc_reference_id.toString().includes(searchTerm));
            
            const matchesType = !typeFilter || 
                (item.service_type_name && item.service_type_name === typeFilter) ||
                (item.type && item.type === typeFilter);
            
            return matchesSearch && matchesType;
        });
        
        currentItems = filteredItems;
        renderItems(filteredItems);
    }

    function populateItemTypeFilter(items) {
        const typeFilter = document.getElementById('filterItemType');
        if (!typeFilter) return;
        
        const types = [...new Set(items.map(item => item.service_type_name || item.type).filter(Boolean))];
        typeFilter.innerHTML = '<option value="">All Types</option>' + 
            types.map(type => `<option value="${type}">${type}</option>`).join('');
    }

    async function loadBillableItems(admissionId) {
        try {
            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'getBillableItems',
                json: JSON.stringify({ admission_id: admissionId })
            });

            if (response.data && response.data.success) {
                allItems = response.data.items || [];
                currentItems = [...allItems];
                filteredItems = [...allItems];
                const a = response.data.admission || {};
                admissionMeta.textContent = a && a.admission_id ? `Admission #${a.admission_id} • ${a.patient_lname}, ${a.patient_fname} • ${new Date(a.admission_date).toLocaleDateString()}` : '';
                populateItemTypeFilter(allItems);
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
            const selectedAdmissionId = patientSelect.value;
            if (!selectedAdmissionId) return;
            
            // Get patient info from selected option
            const selectedOption = patientSelect.options[patientSelect.selectedIndex];
            const patientInfo = JSON.parse(selectedOption.dataset.patientInfo || '{}');
            
            // Update admission meta display
            admissionMeta.textContent = `Patient: ${patientInfo.first_name} ${patientInfo.last_name} | Admission Date: ${patientInfo.admission_date || 'N/A'}`;
            
            currentAdmissionId = Number(selectedAdmissionId);
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
            allItems = [];
            filteredItems = [];
            patientSelect.value = '';
            admissionMeta.textContent = '';
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No items loaded.</td></tr>';
            subtotalText.textContent = '0.00';
            coveredText.textContent = '0.00';
            totalDueText.textContent = '0.00';
            createInvoiceBtn.disabled = true;
            printPreviewBtn.disabled = true;
            
            // Reset filters
            const searchItems = document.getElementById('searchItems');
            const filterItemType = document.getElementById('filterItemType');
            if (searchItems) searchItems.value = '';
            if (filterItemType) filterItemType.innerHTML = '<option value="">All Types</option>';
        });
    }

    // Setup filter event listeners
    const searchItemsInput = document.getElementById('searchItems');
    const filterItemTypeSelect = document.getElementById('filterItemType');
    
    if (searchItemsInput) {
        searchItemsInput.addEventListener('input', applyItemsFilter);
    }
    
    if (filterItemTypeSelect) {
        filterItemTypeSelect.addEventListener('change', applyItemsFilter);
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



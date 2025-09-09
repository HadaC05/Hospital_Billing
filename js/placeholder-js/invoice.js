console.log('invoice.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../../api';
    const user = JSON.parse(localStorage.getItem('user'));

    // Auth check
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Sidebar is handled globally by js/sidebar.js

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
    let lastCreatedInvoiceId = null;
    let patientsData = [];
    let existingInvoices = [];

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

    function setupCheckboxListeners() {
        // Select All checkbox functionality
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                itemCheckboxes.forEach(checkbox => {
                    checkbox.checked = this.checked;
                });
                calculateTotals();
            });
        }

        // Individual checkbox functionality
        itemCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Update select all checkbox state
                const allChecked = Array.from(itemCheckboxes).every(cb => cb.checked);
                const someChecked = Array.from(itemCheckboxes).some(cb => cb.checked);
                
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = allChecked;
                    selectAllCheckbox.indeterminate = someChecked && !allChecked;
                }
                
                calculateTotals();
            });
        });
    }

    function calculateTotals() {
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');
        let subtotal = 0;
        let covered = 0;

        itemCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const row = checkbox.closest('tr');
                const itemData = JSON.parse(row.dataset.itemData || '{}');
                subtotal += itemData.lineTotal || 0;
                covered += itemData.coverage || 0;
            }
        });

        subtotalText.textContent = peso(subtotal);
        coveredText.textContent = peso(covered);
        totalDueText.textContent = peso(subtotal - covered);
    }

    function showInvoiceStatus() {
        if (existingInvoices.length === 0) {
            return;
        }

        // Create status alert
        const statusContainer = document.querySelector('.card-body');
        let statusHtml = '<div class="alert alert-info mb-3">';
        statusHtml += '<h6><i class="fas fa-info-circle"></i> Existing Invoices</h6>';
        
        existingInvoices.forEach(invoice => {
            const statusClass = invoice.status === 'Paid' ? 'success' : 
                               invoice.status === 'Partially Paid' ? 'warning' : 'danger';
            const statusIcon = invoice.status === 'Paid' ? 'check-circle' : 
                              invoice.status === 'Partially Paid' ? 'exclamation-triangle' : 'times-circle';
            
            statusHtml += `<div class="d-flex justify-content-between align-items-center mb-2">
                <span><i class="fas fa-${statusIcon} text-${statusClass}"></i> Invoice #${invoice.invoice_id} - ${invoice.status}</span>
                <span>Total: ${peso(invoice.total_amount)} | Paid: ${peso(invoice.total_paid)} | Due: ${peso(invoice.amount_due)}</span>
            </div>`;
        });
        
        statusHtml += '</div>';
        
        // Insert status before the table
        const tableContainer = statusContainer.querySelector('.table-responsive');
        if (tableContainer) {
            tableContainer.insertAdjacentHTML('beforebegin', statusHtml);
        }
    }

    function renderItems(items) {
        itemsBody.innerHTML = '';
        if (!items || items.length === 0) {
            itemsBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No items found for this admission.</td></tr>';
            return;
        }

        items.forEach((item, idx) => {
            const row = itemRowTemplate.content.firstElementChild.cloneNode(true);
            const lineTotal = Number(item.quantity) * Number(item.unit_price);
            const coverage = Number(item.coverage_amount || 0);

            // Store item data in the row for calculations
            row.dataset.itemData = JSON.stringify({
                lineTotal: lineTotal,
                coverage: coverage,
                payable: lineTotal - coverage
            });

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

        // Add event listeners for checkboxes
        setupCheckboxListeners();
        
        // Calculate totals based on selected items
        calculateTotals();

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
                existingInvoices = response.data.existing_invoices || [];
                const a = response.data.admission || {};
                admissionMeta.textContent = a && a.admission_id ? `Admission #${a.admission_id} • ${a.patient_lname}, ${a.patient_fname} • ${new Date(a.admission_date).toLocaleDateString()}` : '';
                renderItems(currentItems);
                showInvoiceStatus();
            } else {
                itemsBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Failed to load items.</td></tr>';
            }
        } catch (e) {
            console.error(e);
            itemsBody.innerHTML = '<tr><td colspan="10" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    async function createInvoice() {
        try {
            // Check if there are already paid invoices
            const paidInvoices = existingInvoices.filter(inv => inv.status === 'Paid');
            if (paidInvoices.length > 0) {
                const confirmCreate = confirm(
                    `Warning: There are already ${paidInvoices.length} paid invoice(s) for this admission. ` +
                    `Creating another invoice may result in duplicate billing. Do you want to continue?`
                );
                if (!confirmCreate) {
                    return;
                }
            }

            // Get only selected items
            const selectedItems = getSelectedItems();
            
            if (selectedItems.length === 0) {
                alert('Please select at least one item to include in the invoice.');
                return;
            }

            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'createInvoice',
                json: JSON.stringify({
                    admission_id: currentAdmissionId,
                    items: selectedItems
                })
            });

            if (response.data && response.data.success) {
                lastCreatedInvoiceId = response.data.invoice_id;
                document.getElementById('createdInvoiceId').textContent = lastCreatedInvoiceId;
                new bootstrap.Modal(document.getElementById('invoiceSuccessModal')).show();
                
                // Reload items to show updated status
                await loadBillableItems(currentAdmissionId);
            } else {
                Swal.fire({
                    title: 'Error',
                    text: response.data.message || 'Failed to create invoice',
                    icon: 'error'
                });
            }
        } catch (e) {
            console.error(e);
            Swal.fire({
                title: 'Error',
                text: 'Network error while creating invoice',
                icon: 'error'
            });
        }
    }

    function getSelectedItems() {
        const selectedItems = [];
        const itemCheckboxes = document.querySelectorAll('.item-checkbox');
        
        itemCheckboxes.forEach((checkbox, index) => {
            if (checkbox.checked && currentItems[index]) {
                selectedItems.push(currentItems[index]);
            }
        });
        
        return selectedItems;
    }

    // Print preview
    function buildPrint() {
        const container = document.getElementById('printArea');
        const now = new Date().toLocaleString();
        const selectedItems = getSelectedItems();
        
        const rows = selectedItems.map((item, i) => {
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
                    <h3>Springfield General Hospital</h3>
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
            itemsBody.innerHTML = '<tr><td colspan="10" class="text-center">Loading...</td></tr>';
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
            existingInvoices = [];
            patientSelect.value = '';
            admissionMeta.textContent = '';
            itemsBody.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No items loaded.</td></tr>';
            subtotalText.textContent = '0.00';
            coveredText.textContent = '0.00';
            totalDueText.textContent = '0.00';
            createInvoiceBtn.disabled = true;
            printPreviewBtn.disabled = true;
            
            // Reset select all checkbox
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            if (selectAllCheckbox) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
            
            // Remove any existing status alerts
            const existingAlerts = document.querySelectorAll('.alert.alert-info');
            existingAlerts.forEach(alert => alert.remove());
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



console.log('invoice.js is working');
document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../../api';
    const user = JSON.parse(localStorage.getItem('user'));

    // Auth check
    if (!user) {
        window.location.href = '../index.html';
        return;
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
    const previewInvoiceBtn = document.getElementById('previewInvoiceBtn');
    const admissionMeta = document.getElementById('admissionMeta');
    const invoicePreviewModal = new bootstrap.Modal(document.getElementById('invoicePreviewModal'));
    const invoicePreviewContent = document.getElementById('invoicePreviewContent');
    const printFromPreviewBtn = document.getElementById('printFromPreviewBtn');

    let currentAdmissionId = null;
    let currentItems = [];
    let lastCreatedInvoiceId = null;
    let admissionsData = [];

    // Load admissions for dropdown
    async function loadAdmissions() {
        try {
            console.log('Loading admissions...');
            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'getAdmissions',
                json: JSON.stringify({})
            });
            console.log('Admissions response:', response.data);
            const data = response.data;
            if (data.success && Array.isArray(data.admissions)) {
                admissionsData = data.admissions;
                populateAdmissionDropdown(data.admissions);
            } else {
                console.error('Failed to load admissions:', data.message);
                patientSelect.innerHTML = '<option value="">No admissions found</option>';
            }
        } catch (error) {
            console.error('Error loading admissions:', error);
            patientSelect.innerHTML = '<option value="">Error loading admissions</option>';
        }
    }

    // Populate admission dropdown
    function populateAdmissionDropdown(admissions) {
        patientSelect.innerHTML = '<option value="">Select an admission...</option>';
        admissions.forEach(admission => {
            const option = document.createElement('option');
            option.value = admission.admission_id;
            option.textContent = `${admission.first_name} ${admission.last_name} - Admission #${admission.admission_id}`;
            option.dataset.admissionInfo = JSON.stringify(admission);
            patientSelect.appendChild(option);
        });
        console.log(`Loaded ${admissions.length} admissions`);
    }

    // Initialize admission loading
    loadAdmissions();

    function peso(amount) {
        return Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function renderItems(items, debug = {}) {
        itemsBody.innerHTML = '';
        if (!items || items.length === 0) {
            itemsBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No items found for this admission.</td></tr>';
            return;
        }

        let subtotal = 0;
        let covered = 0;
        let hasUnpaidItems = false;

        items.forEach((item, idx) => {
            const row = itemRowTemplate.content.firstElementChild.cloneNode(true);
            const lineTotal = Number(item.quantity) * Number(item.unit_price);
            const coverage = Number(item.coverage_amount || 0);
            subtotal += lineTotal;
            covered += coverage;

            row.querySelector('.type').textContent = item.service_type_name || item.type || '';
            row.querySelector('.description').textContent = item.description || item.item_description || '';
            row.querySelector('.qty').textContent = Number(item.quantity);
            row.querySelector('.unit').textContent = peso(item.unit_price);
            row.querySelector('.line').textContent = peso(lineTotal);
            row.querySelector('.coverage').textContent = peso(coverage);
            row.querySelector('.payable').textContent = peso(lineTotal - coverage);

            // Set status cell
            const statusCell = row.querySelector('.status');
            if (item.status === 'yes') {
                statusCell.textContent = 'Paid';
                statusCell.classList.add('text-success');
            } else {
                statusCell.textContent = 'Unpaid';
                statusCell.classList.add('text-danger');
                hasUnpaidItems = true;
            }

            itemsBody.appendChild(row);
        });

        subtotalText.textContent = peso(subtotal);
        coveredText.textContent = peso(covered);
        totalDueText.textContent = peso(subtotal - covered);

        // Enable actions only if there are unpaid items
        createInvoiceBtn.disabled = !hasUnpaidItems;
        printPreviewBtn.disabled = false;
        previewInvoiceBtn.disabled = false;
    }

    async function loadBillableItems(admissionId) {
        try {
            console.log(`Loading billable items for admission ${admissionId}...`);
            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'getBillableItems',
                json: JSON.stringify({ admission_id: admissionId })
            });

            console.log('Billable items response:', response.data);

            if (response.data && response.data.success) {
                currentItems = response.data.items || [];
                const a = response.data.admission || {};
                admissionMeta.textContent = a && a.admission_id ?
                    `Admission #${a.admission_id} • ${a.last_name}, ${a.first_name} ${a.middle_name || ''} • ${new Date(a.admission_date).toLocaleDateString()}` :
                    '';
                renderItems(currentItems, response.data.debug || {});
            } else {
                console.error('Failed to load items:', response.data.message);
                itemsBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load items: ${response.data.message || 'Unknown error'}</td></tr>`;
            }
        } catch (e) {
            console.error('Error loading billable items:', e);
            itemsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    async function createInvoice() {
        try {
            console.log('Creating invoice...');

            // Filter items to only include unpaid ones
            const unpaidItems = currentItems.filter(item => item.status !== 'yes');

            if (unpaidItems.length === 0) {
                Swal.fire({
                    title: 'Info',
                    text: 'No unpaid items to invoice',
                    icon: 'info'
                });
                return;
            }

            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'createInvoice',
                json: JSON.stringify({
                    admission_id: currentAdmissionId,
                    items: unpaidItems
                })
            });

            console.log('Create invoice response:', response.data);

            if (response.data && response.data.success) {
                lastCreatedInvoiceId = response.data.invoice_id;
                document.getElementById('createdInvoiceId').textContent = lastCreatedInvoiceId;
                new bootstrap.Modal(document.getElementById('invoiceSuccessModal')).show();

                // Refresh the items list to show updated status
                await loadBillableItems(currentAdmissionId);
            } else {
                Swal.fire({
                    title: 'Error',
                    text: response.data.message || 'Failed to create invoice',
                    icon: 'error'
                });
            }
        } catch (e) {
            console.error('Error creating invoice:', e);
            Swal.fire({
                title: 'Error',
                text: 'Network error while creating invoice',
                icon: 'error'
            });
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
            const statusText = item.status === 'yes' ? 'Paid' : 'Unpaid';
            const statusClass = item.status === 'yes' ? 'text-success' : 'text-danger';
            return `<tr>
                <td>${item.service_type_name || item.type || ''}</td>
                <td>${item.description || ''}</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${peso(item.unit_price)}</td>
                <td class="text-end">${peso(line)}</td>
                <td class="text-end">${peso(cov)}</td>
                <td class="text-end">${peso(pay)}</td>
                <td class="${statusClass}">${statusText}</td>
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
                            <th>Description</th>
                            <th class="text-end">Qty</th>
                            <th class="text-end">Unit</th>
                            <th class="text-end">Line</th>
                            <th class="text-end">Coverage</th>
                            <th class="text-end">Payable</th>
                            <th>Status</th>
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

    // Build invoice preview for modal
    function buildInvoicePreview() {
        const now = new Date().toLocaleDateString();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
        const dueDateStr = dueDate.toLocaleDateString();

        // Get patient info
        const selectedOption = patientSelect.options[patientSelect.selectedIndex];
        const admissionInfo = JSON.parse(selectedOption.dataset.admissionInfo || '{}');

        const rows = currentItems.map((item, i) => {
            const line = Number(item.quantity) * Number(item.unit_price);
            const cov = Number(item.coverage_amount || 0);
            const pay = line - cov;
            const statusText = item.status === 'yes' ? 'Paid' : 'Unpaid';
            const statusClass = item.status === 'yes' ? 'text-success' : 'text-danger';
            return `<tr>
                <td>${item.service_type_name || item.type || ''}</td>
                <td>${item.description || ''}</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${peso(item.unit_price)}</td>
                <td class="text-end">${peso(line)}</td>
                <td class="text-end">${peso(cov)}</td>
                <td class="text-end">${peso(pay)}</td>
                <td class="${statusClass}">${statusText}</td>
            </tr>`;
        }).join('');

        invoicePreviewContent.innerHTML = `
            <div class="invoice-container">
                <!-- Header -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h2>Springfield General Hospital</h2>
                        <p class="mb-1">123 Medical Center Blvd</p>
                        <p class="mb-1">Springfield, ST 12345</p>
                        <p class="mb-1">Phone: (555) 123-4567</p>
                        <p>Email: billing@springfieldhospital.com</p>
                    </div>
                    <div class="col-md-6 text-md-end">
                        <h3 class="mb-1">MEDICAL BILLING INVOICE</h3>
                        <p class="mb-1"><strong>Invoice #:</strong> ${lastCreatedInvoiceId || 'TEMP-' + Date.now()}</p>
                        <p class="mb-1"><strong>Date:</strong> ${now}</p>
                        <p class="mb-0"><strong>Due Date:</strong> ${dueDateStr}</p>
                    </div>
                </div>
                
                <!-- Patient & Doctor Info -->
                <div class="row mb-4">
                    <div class="col-md-6">
                        <h5>Patient Information</h5>
                        <p class="mb-1"><strong>Name:</strong> ${admissionInfo.first_name} ${admissionInfo.last_name} ${admissionInfo.middle_name || ''}</p>
                        <p class="mb-1"><strong>Admission #:</strong> ${currentAdmissionId}</p>
                        <p class="mb-1"><strong>Admission Date:</strong> ${new Date(admissionInfo.admission_date).toLocaleDateString()}</p>
                    </div>
                    <div class="col-md-6">
                        <h5>Physician Information</h5>
                        <p class="mb-1"><strong>Name:</strong> Dr. Alananah Gomez</p>
                        <p class="mb-1"><strong>Phone:</strong> (555) 987-6543</p>
                        <p class="mb-0"><strong>Address:</strong> 456 Physician Plaza, Springfield, ST 12345</p>
                    </div>
                </div>
                
                <!-- Invoice Items -->
                <div class="mb-4">
                    <h5 class="mb-3">Invoice Details</h5>
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead class="table-light">
                                <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th class="text-end">Qty</th>
                                    <th class="text-end">Unit Price</th>
                                    <th class="text-end">Line Total</th>
                                    <th class="text-end">Coverage</th>
                                    <th class="text-end">Payable</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Summary -->
                <div class="row">
                    <div class="col-md-8">
                        <p class="mb-1"><strong>Payment Terms:</strong> Payment is due within 30 days. Late payments are subject to a 5% monthly service charge.</p>
                        <p class="mb-0"><strong>Notes:</strong> Please include invoice number with your payment. For questions about this invoice, please contact our billing department.</p>
                    </div>
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Subtotal</span><strong>${subtotalText.textContent}</strong>
                                </div>
                                <div class="d-flex justify-content-between mb-2">
                                    <span>Insurance Covered</span><strong>${coveredText.textContent}</strong>
                                </div>
                                <hr />
                                <div class="d-flex justify-content-between fs-5">
                                    <span>Total Due</span><strong>${totalDueText.textContent}</strong>
                                </div>
                            </div>
                        </div>
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

            // Get admission info from selected option
            const selectedOption = patientSelect.options[patientSelect.selectedIndex];
            const admissionInfo = JSON.parse(selectedOption.dataset.admissionInfo || '{}');

            // Update admission meta display
            admissionMeta.textContent = `Patient: ${admissionInfo.first_name} ${admissionInfo.last_name} | Admission Date: ${admissionInfo.admission_date || 'N/A'}`;

            currentAdmissionId = Number(selectedAdmissionId);
            createInvoiceBtn.disabled = true;
            printPreviewBtn.disabled = true;
            previewInvoiceBtn.disabled = true;
            itemsBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';

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
            patientSelect.value = '';
            admissionMeta.textContent = '';
            itemsBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No items loaded.</td></tr>';
            subtotalText.textContent = '0.00';
            coveredText.textContent = '0.00';
            totalDueText.textContent = '0.00';
            createInvoiceBtn.disabled = true;
            printPreviewBtn.disabled = true;
            previewInvoiceBtn.disabled = true;
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

    if (previewInvoiceBtn) {
        previewInvoiceBtn.addEventListener('click', () => {
            if (currentItems.length === 0) return;
            buildInvoicePreview();
            invoicePreviewModal.show();
        });
    }

    if (printFromPreviewBtn) {
        printFromPreviewBtn.addEventListener('click', () => {
            const content = invoicePreviewContent.innerHTML;
            const original = document.body.innerHTML;
            document.body.innerHTML = content;
            window.print();
            document.body.innerHTML = original;
            location.reload();
        });
    }
});
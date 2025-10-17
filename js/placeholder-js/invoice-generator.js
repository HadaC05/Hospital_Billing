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
    const admissionMeta = document.getElementById('admissionMeta');
    const debugInfo = document.getElementById('debugInfo'); // Add this element to your HTML for debugging

    let currentAdmissionId = null;
    let currentItems = [];
    let lastCreatedInvoiceId = null;
    let admissionsData = [];

    // Load admissions for dropdown
    async function loadAdmissions() {
        try {
            console.log('Loading admissions...');
            const response = await axios.post(`${apiBase}/invoice-generator.php`, {
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
                if (debugInfo) debugInfo.textContent = 'Error: ' + (data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error loading admissions:', error);
            patientSelect.innerHTML = '<option value="">Error loading admissions</option>';
            if (debugInfo) debugInfo.textContent = 'Network error: ' + error.message;
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

    function renderItems(items) {
        itemsBody.innerHTML = '';
        if (!items || items.length === 0) {
            itemsBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No items found for this admission.</td></tr>';
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

            row.querySelector('.type').textContent = item.service_type_name || item.type || '';
            row.querySelector('.description').textContent = item.item_description || '';
            row.querySelector('.qty').textContent = Number(item.quantity);
            row.querySelector('.unit').textContent = peso(item.unit_price);

            // Update status with color coding
            const statusBadge = row.querySelector('.badge');
            const status = item.payment_status || 'Unpaid';
            statusBadge.textContent = status;
            statusBadge.className = 'badge ' + (status === 'Paid' ? 'bg-success' : 'bg-warning');

            row.querySelector('.coverage').textContent = peso(coverage);
            row.querySelector('.payable').textContent = peso(lineTotal - coverage);

            itemsBody.appendChild(row);
        });

        subtotalText.textContent = peso(subtotal);
        coveredText.textContent = peso(covered);
        totalDueText.textContent = peso(subtotal - covered);
        createInvoiceBtn.disabled = false;
        printPreviewBtn.disabled = false;
    }

    async function loadBillableItems(admissionId) {
        try {
            const response = await axios.post(`${apiBase}/invoice-generator.php`, {
                operation: 'getBillableItems',
                json: JSON.stringify({
                    admission_id: admissionId,
                    include_all: true  // Add this parameter to indicate we want all items
                })
            });

            if (response.data && response.data.success) {
                currentItems = response.data.items || [];
                const admission = response.data.admission || {};

                // Update the UI with patient info
                admissionMeta.textContent = admission.admission_id ?
                    `Admission #${admission.admission_id} • ${admission.last_name}, ${admission.first_name} ${admission.middle_name || ''} • ${new Date(admission.admission_date).toLocaleDateString()}` :
                    '';

                // Render all items
                renderItems(currentItems);
            } else {
                console.error('Failed to load items:', response.data.message);
                itemsBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load items: ${response.data.message || 'Unknown error'}</td></tr>`;
            }
        } catch (e) {
            console.error('Error loading billable items:', e);
            itemsBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    async function createInvoice() {
        try {
            console.log('Creating invoice...');
            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'createInvoice',
                json: JSON.stringify({
                    admission_id: currentAdmissionId,
                    items: currentItems
                })
            });

            console.log('Create invoice response:', response.data);

            if (response.data && response.data.success) {
                lastCreatedInvoiceId = response.data.invoice_id;
                document.getElementById('createdInvoiceId').textContent = lastCreatedInvoiceId;
                new bootstrap.Modal(document.getElementById('invoiceSuccessModal')).show();
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

            // Get admission info from selected option
            const selectedOption = patientSelect.options[patientSelect.selectedIndex];
            const admissionInfo = JSON.parse(selectedOption.dataset.admissionInfo || '{}');

            // Update admission meta display
            admissionMeta.textContent = `Patient: ${admissionInfo.first_name} ${admissionInfo.last_name} | Admission Date: ${admissionInfo.admission_date || 'N/A'}`;

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
            patientSelect.value = '';
            admissionMeta.textContent = '';
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No items loaded.</td></tr>';
            subtotalText.textContent = '0.00';
            coveredText.textContent = '0.00';
            totalDueText.textContent = '0.00';
            createInvoiceBtn.disabled = true;
            printPreviewBtn.disabled = true;
            if (debugInfo) debugInfo.textContent = '';
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

    // Add this near your other event listeners
    document.getElementById('createInvoiceBtn').addEventListener('click', function () {
        const modal = new bootstrap.Modal(document.getElementById('invoicePreviewModal'));
        generateInvoicePreview();
        modal.show();
    });

    // Add print functionality
    document.getElementById('printInvoiceBtn').addEventListener('click', function () {
        window.print();
    });

    function generateInvoicePreview() {
        const previewContent = document.getElementById('invoicePreviewContent');
        // Generate the invoice HTML based on your design
        // This is a simplified version - you'll need to customize it
        previewContent.innerHTML = `
        <div class="invoice-preview">
            <div class="text-center mb-4">
                <h4>HOSPITAL NAME</h4>
                <p class="mb-1">Hospital Address</p>
                <p class="mb-1">City, Country</p>
                <p class="mb-1">TIN: 000-000-000-000</p>
                <h5 class="mt-3">STATEMENT OF ACCOUNT</h5>
            </div>
            
            <!-- Add patient and admission details here -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <p class="mb-1"><strong>Patient:</strong> ${currentPatientName}</p>
                    <p class="mb-1"><strong>Admission:</strong> #${currentAdmissionId}</p>
                </div>
                <div class="col-md-6 text-md-end">
                    <p class="mb-1"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p class="mb-1"><strong>Invoice #:</strong> INV-${Date.now()}</p>
                </div>
            </div>
            
            <!-- Items table -->
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th class="text-end">Qty</th>
                            <th class="text-end">Unit Price</th>
                            <th class="text-end">Amount</th>
                        </tr>
                    </thead>
                    <tbody id="previewItemsBody">
                        ${generateInvoiceItems()}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" class="text-end"><strong>Subtotal:</strong></td>
                            <td class="text-end">${subtotalText.textContent}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-end"><strong>Insurance Covered:</strong></td>
                            <td class="text-end">${coveredText.textContent}</td>
                        </tr>
                        <tr>
                            <td colspan="3" class="text-end"><strong>Total Due:</strong></td>
                            <td class="text-end"><strong>${totalDueText.textContent}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    `;
    }

    function generateInvoiceItems() {
        if (!currentItems || currentItems.length === 0) return '<tr><td colspan="4" class="text-center">No items</td></tr>';

        return currentItems.map(item => {
            const lineTotal = Number(item.quantity) * Number(item.unit_price);
            return `
            <tr>
                <td>${item.item_description} (${item.service_type_name})</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${peso(item.unit_price)}</td>
                <td class="text-end">${peso(lineTotal)}</td>
            </tr>
        `;
        }).join('');
    }
});
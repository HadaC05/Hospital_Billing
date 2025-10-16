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
    const debugInfo = document.getElementById('debugInfo');

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
                if (debugInfo) debugInfo.innerHTML = `<div class="alert alert-danger">Error: ${data.message || 'Unknown error'}</div>`;
            }
        } catch (error) {
            console.error('Error loading admissions:', error);
            patientSelect.innerHTML = '<option value="">Error loading admissions</option>';
            if (debugInfo) debugInfo.innerHTML = `<div class="alert alert-danger">Network error: ${error.message}</div>`;
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
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No items found for this admission.</td></tr>';

            // Show debug info
            if (debugInfo) {
                debugInfo.innerHTML = `
                    <div class="alert alert-info">
                        <strong>Debug Info:</strong><br>
                        Administered Medicines: ${debug.administered_meds || 0}<br>
                        Completed Lab Tests: ${debug.completed_labs || 0}<br>
                        Completed Surgeries: ${debug.completed_surgeries || 0}<br>
                        Completed Treatments: ${debug.completed_treatments || 0}<br>
                        Completed Rooms: ${debug.completed_rooms || 0}<br>
                        Total Items: ${debug.total || 0}
                    </div>
                `;
            }
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

        // Clear debug info on success
        if (debugInfo) debugInfo.textContent = '';
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
                itemsBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger">Failed to load items: ${response.data.message || 'Unknown error'}</td></tr>`;
                if (debugInfo) debugInfo.innerHTML = `<div class="alert alert-danger">Error: ${response.data.message || 'Unknown error'}</div>`;
            }
        } catch (e) {
            console.error('Error loading billable items:', e);
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Network error.</td></tr>';
            if (debugInfo) debugInfo.innerHTML = `<div class="alert alert-danger">Network error: ${e.message}</div>`;
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
                const modal = new bootstrap.Modal(document.getElementById('invoiceSuccessModal'));
                modal.show();
                
                // Refresh items after successful invoice creation
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
});
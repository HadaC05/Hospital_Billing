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
    
    // Load patients with admissions directly from the database
    async function loadPatientsWithAdmissions() {
        try {
            // Fetch patients with active admissions directly
            const response = await axios.get(`${apiBase}/invoice.php`, {
                params: {
                    operation: 'getAdmissionsWithPatients',
                    json: JSON.stringify({})
                },
                withCredentials: true
            });
            
            const data = response.data;
            if (data.success && Array.isArray(data.admissions) && data.admissions.length > 0) {
                patientsData = data.admissions;
                populatePatientDropdown(data.admissions);
            } else {
                patientSelect.innerHTML = '<option value="">No patients with active admissions found</option>';
            }
        } catch (error) {
            console.error('Error loading patients with admissions:', error);
            patientSelect.innerHTML = '<option value="">Error loading patients</option>';
        }
    }
    
    // Populate patient dropdown
    function populatePatientDropdown(admissions) {
        if (!admissions || admissions.length === 0) {
            patientSelect.innerHTML = '<option value="">No patients with active admissions found</option>';
            return;
        }
        
        patientSelect.innerHTML = '<option value="">Select a patient...</option>';
        admissions.forEach(admission => {
            const option = document.createElement('option');
            option.value = admission.admission_id;
            option.textContent = `${admission.first_name} ${admission.last_name} - Admission #${admission.admission_id}`;
            option.dataset.patientInfo = JSON.stringify(admission);
            patientSelect.appendChild(option);
        });
    }
    
    // Initialize patient loading
    loadPatientsWithAdmissions();
    
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
            const patientPayable = lineTotal - coverage;
            
            // Update item with calculated values for invoice creation
            item.total_amount = lineTotal;
            item.patient_payable = patientPayable;
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
            row.querySelector('.payable').textContent = peso(patientPayable);
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
        console.log('Loading billable items for admission:', admissionId);
        const response = await axios.post(`${apiBase}/invoice.php`, {
            operation: 'getBillableItems',
            json: JSON.stringify({ admission_id: admissionId })
        }, {
            withCredentials: true
        });
        
        console.log('Response:', response.data);
        
        if (response.data && response.data.success) {
            currentItems = response.data.items || [];
            const a = response.data.admission || {};
            const firstName = a.first_name || a.patient_fname || '';
            const lastName = a.last_name || a.patient_lname || '';
            admissionMeta.textContent = a && a.admission_id ? 
                `Admission #${a.admission_id} • ${lastName}, ${firstName} • ${new Date(a.admission_date).toLocaleDateString()}` : '';
            
            // Log debug information
            if (response.data.debug) {
                console.log('Debug info:', response.data.debug);
            }
            
            renderItems(currentItems);
        } else {
            console.error('Failed to load items:', response.data.message);
            itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load items.</td></tr>';
        }
    } catch (e) {
        console.error('Network error:', e);
        itemsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Network error.</td></tr>';
    }
}
    
    async function createInvoice() {
        try {
            // Calculate totals for invoice creation
            let subtotal = 0;
            let covered = 0;
            
            currentItems.forEach(item => {
                const lineTotal = Number(item.quantity) * Number(item.unit_price);
                const coverage = Number(item.coverage_amount || 0);
                subtotal += lineTotal;
                covered += coverage;
            });
            
            // Prepare items with consistent field names
            const formattedItems = currentItems.map(item => ({
                svc_type_id: item.svc_type_id,
                svc_reference_id: item.svc_reference_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                coverage_amount: item.coverage_amount || 0,
                service_type_name: item.service_type_name || item.type,
                description: item.description || item.item_description
            }));
            
            const response = await axios.post(`${apiBase}/invoice.php`, {
                operation: 'createInvoice',
                json: JSON.stringify({
                    admission_id: currentAdmissionId,
                    patient_id: patientsData.find(p => p.admission_id === currentAdmissionId)?.patient_id,
                    created_by: user.user_id,
                    invoice_date: new Date().toISOString().split('T')[0],
                    insurance_covered_amount: covered,
                    total_amount: subtotal,
                    amount_due: subtotal - covered,
                    status: 'UNPAID',
                    items: formattedItems
                })
            });
            
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
            console.error(e);
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
            const line = item.total_amount || Number(item.quantity) * Number(item.unit_price);
            const cov = Number(item.coverage_amount || 0);
            const pay = item.patient_payable || line - cov;
            const serviceType = item.service_type_name || item.type || '';
            const reference = item.svc_reference_id || '';
            const desc = item.description || item.item_description || '';
            
            return `<tr>
                <td>${serviceType}</td>
                <td>${reference}</td>
                <td>${desc}</td>
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
            const firstName = patientInfo.first_name || patientInfo.patient_fname || '';
            const lastName = patientInfo.last_name || patientInfo.patient_lname || '';
            const admissionDate = patientInfo.admission_date ? new Date(patientInfo.admission_date).toLocaleDateString() : 'N/A';
            admissionMeta.textContent = `Patient: ${firstName} ${lastName} | Admission Date: ${admissionDate}`;
            
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
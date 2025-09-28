console.log('billing.js is working');
document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../../api';
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Elements
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    const statusFilter = document.getElementById('statusFilter');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const printBtn = document.getElementById('printBtn');
    const invoiceBody = document.getElementById('invoiceBody');

    // KPI elements
    const kpiInvoices = document.getElementById('kpiInvoices');
    const kpiBilled = document.getElementById('kpiBilled');
    const kpiCovered = document.getElementById('kpiCovered');
    const kpiDue = document.getElementById('kpiDue');

    // Payment modal elements
    const paymentModal = new bootstrap.Modal(document.getElementById('paymentModal'));
    const invoiceIdDisplay = document.getElementById('invoiceIdDisplay');
    const patientNameDisplay = document.getElementById('patientNameDisplay');
    const amountDueDisplay = document.getElementById('amountDueDisplay');
    const paymentAmount = document.getElementById('paymentAmount');
    const paymentMethod = document.getElementById('paymentMethod');
    const paymentDate = document.getElementById('paymentDate');
    const paymentNotes = document.getElementById('paymentNotes');
    const submitPaymentBtn = document.getElementById('submitPaymentBtn');

    // Toast notification
    const paymentToast = new bootstrap.Toast(document.getElementById('paymentToast'));
    const toastMessage = document.getElementById('toastMessage');

    // Set today's date as default for payment date
    paymentDate.valueAsDate = new Date();

    function peso(n) {
        return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Load payment methods
    async function loadPaymentMethods() {
        try {
            const resp = await axios.post(`${apiBase}/billing.php`, {
                operation: 'getPaymentMethods'
            });

            if (resp.data && resp.data.success) {
                // Clear existing options except the first one
                while (paymentMethod.options.length > 1) {
                    paymentMethod.remove(1);
                }

                // Add payment methods from the database
                if (resp.data.methods && resp.data.methods.length > 0) {
                    resp.data.methods.forEach(method => {
                        const option = document.createElement('option');
                        option.value = method.payment_method_id;
                        option.textContent = method.method_name;
                        paymentMethod.appendChild(option);
                    });
                } else {
                    // If no payment methods returned, add default ones
                    const defaultMethods = [
                        { payment_method_id: 1, method_name: 'Cash' },
                        { payment_method_id: 2, method_name: 'Credit Card' },
                        { payment_method_id: 3, method_name: 'Debit Card' },
                        { payment_method_id: 4, method_name: 'Check' }
                    ];

                    defaultMethods.forEach(method => {
                        const option = document.createElement('option');
                        option.value = method.payment_method_id;
                        option.textContent = method.method_name;
                        paymentMethod.appendChild(option);
                    });
                }
            } else {
                console.error('Failed to load payment methods:', resp.data.message);
                // Add default payment methods as fallback
                const defaultMethods = [
                    { payment_method_id: 1, method_name: 'Cash' },
                    { payment_method_id: 2, method_name: 'Credit Card' },
                    { payment_method_id: 3, method_name: 'Debit Card' },
                    { payment_method_id: 4, method_name: 'Check' }
                ];

                defaultMethods.forEach(method => {
                    const option = document.createElement('option');
                    option.value = method.payment_method_id;
                    option.textContent = method.method_name;
                    paymentMethod.appendChild(option);
                });
            }
        } catch (e) {
            console.error('Error loading payment methods:', e);
            // Add default payment methods as fallback
            const defaultMethods = [
                { payment_method_id: 1, method_name: 'Cash' },
                { payment_method_id: 2, method_name: 'Credit Card' },
                { payment_method_id: 3, method_name: 'Debit Card' },
                { payment_method_id: 4, method_name: 'Check' }
            ];

            defaultMethods.forEach(method => {
                const option = document.createElement('option');
                option.value = method.payment_method_id;
                option.textContent = method.method_name;
                paymentMethod.appendChild(option);
            });
        }
    }

    async function loadOverview() {
        invoiceBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
        try {
            const resp = await axios.post(`${apiBase}/billing.php`, {
                operation: 'getOverview',
                json: JSON.stringify({
                    start_date: startDate.value || null,
                    end_date: endDate.value || null,
                    status: statusFilter.value || 'ALL'
                })
            });

            console.log('Billing response:', resp.data);

            if (resp.data && resp.data.success) {
                renderKpis(resp.data.kpis);
                renderInvoices(resp.data.invoices || []);
            } else {
                console.error('Failed to load billing overview:', resp.data.message);
                invoiceBody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load: ${resp.data.message || 'Unknown error'}</td></tr>`;
            }
        } catch (e) {
            console.error('Error loading billing overview:', e);
            invoiceBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    function renderKpis(k) {
        kpiInvoices.textContent = k.total_invoices ?? 0;
        kpiBilled.textContent = peso(k.total_billed ?? 0);
        kpiCovered.textContent = peso(k.total_covered ?? 0);
        kpiDue.textContent = peso(k.total_due ?? 0);
    }

    function renderInvoices(invoices) {
        if (!invoices.length) {
            invoiceBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No data.</td></tr>';
            return;
        }
        invoiceBody.innerHTML = '';
        invoices.forEach(inv => {
            const tr = document.createElement('tr');
            const dateStr = new Date(inv.invoice_date).toLocaleDateString();

            // Determine if payment button should be shown
            const showPaymentButton = inv.status !== 'paid' && inv.status !== 'cancelled' && parseFloat(inv.amount_due) > 0;

            tr.innerHTML = `
                <td>${inv.invoice_id}</td>
                <td>${dateStr}</td>
                <td>${inv.patient_name || ''}</td>
                <td class="text-end">${peso(inv.total_amount)}</td>
                <td class="text-end">${peso(inv.insurance_covered_amount)}</td>
                <td class="text-end">${peso(inv.amount_due)}</td>
                <td>${inv.status}</td>
                <td>
                    ${showPaymentButton ?
                    `<button class="btn btn-sm btn-primary make-payment-btn" data-invoice-id="${inv.invoice_id}" data-patient-name="${inv.patient_name}" data-amount-due="${inv.amount_due}">Make Payment</button>` :
                    '<span class="text-muted">N/A</span>'
                }
                </td>
            `;
            invoiceBody.appendChild(tr);
        });

        // Add event listeners to payment buttons
        document.querySelectorAll('.make-payment-btn').forEach(button => {
            button.addEventListener('click', handleMakePayment);
        });
    }

    // Handle make payment button click
    function handleMakePayment(event) {
        const button = event.target;
        const invoiceId = button.getAttribute('data-invoice-id');
        const patientName = button.getAttribute('data-patient-name');
        const amountDue = parseFloat(button.getAttribute('data-amount-due'));

        // Populate modal with invoice data
        invoiceIdDisplay.value = invoiceId;
        patientNameDisplay.value = patientName;
        amountDueDisplay.value = peso(amountDue);
        paymentAmount.value = amountDue;
        paymentAmount.max = amountDue;

        // Reset form
        paymentMethod.value = '';
        paymentNotes.value = '';

        // Load payment methods
        loadPaymentMethods();

        // Show modal
        paymentModal.show();
    }

    // Handle payment submission
    submitPaymentBtn.addEventListener('click', async () => {
        const invoiceId = invoiceIdDisplay.value;
        const amount = parseFloat(paymentAmount.value);
        const methodId = paymentMethod.value;
        const date = paymentDate.value;
        const notes = paymentNotes.value;

        // Validate form
        if (!amount || amount <= 0) {
            showToast('Please enter a valid payment amount', 'danger');
            return;
        }

        if (!methodId) {
            showToast('Please select a payment method', 'danger');
            return;
        }

        if (!date) {
            showToast('Please select a payment date', 'danger');
            return;
        }

        // Disable button to prevent multiple submissions
        submitPaymentBtn.disabled = true;
        submitPaymentBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

        try {
            const response = await axios.post(`${apiBase}/billing.php`, {
                operation: 'processPayment',
                json: JSON.stringify({
                    invoice_id: invoiceId,
                    amount: amount,
                    payment_method_id: methodId,
                    payment_date: date,
                    notes: notes,
                    user_id: user.user_id
                })
            });

            if (response.data && response.data.success) {
                showToast('Payment processed successfully!', 'success');
                paymentModal.hide();
                loadOverview(); // Refresh the data
            } else {
                showToast('Failed to process payment: ' + (response.data.message || 'Unknown error'), 'danger');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            showToast('Error processing payment. Please try again.', 'danger');
        } finally {
            // Re-enable button
            submitPaymentBtn.disabled = false;
            submitPaymentBtn.innerHTML = 'Submit Payment';
        }
    });

    // Show toast notification
    function showToast(message, type = 'success') {
        toastMessage.textContent = message;

        // Update toast styling based on type
        const toast = document.getElementById('paymentToast');
        toast.className = 'toast';
        if (type === 'danger') {
            toast.classList.add('bg-danger', 'text-white');
        } else {
            toast.classList.add('bg-success', 'text-white');
        }

        paymentToast.show();
    }

    // Print
    printBtn.addEventListener('click', () => {
        const area = document.getElementById('printArea');
        if (!area) {
            console.error('Print area not found');
            return;
        }
        area.innerHTML = document.querySelector('.content').innerHTML;
        const original = document.body.innerHTML;
        document.body.innerHTML = area.innerHTML;
        window.print();
        document.body.innerHTML = original;
        location.reload();
    });

    applyFiltersBtn.addEventListener('click', loadOverview);

    // Initial load
    await loadOverview();
});
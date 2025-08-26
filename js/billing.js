console.log('billing.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '../api';
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) { window.location.href = '../index.html'; return; }

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



console.log('paid-payments.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  const apiBase = '../../api';

  // Elements
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  const methodFilter = document.getElementById('methodFilter');
  const applyBtn = document.getElementById('applyFiltersBtn');
  const printBtn = document.getElementById('printBtn');
  const bodyEl = document.getElementById('paymentsBody');

  function peso(n) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  async function loadMethods() {
    try {
      const resp = await axios.post(`${apiBase}/CashierAPI.php`, { operation: 'getPaymentMethods' });
      if (resp.data && resp.data.status === 'success') {
        // keep the All option
        const options = resp.data.data
          .map(m => `<option value="${m.payment_method_id}">${m.method_name}</option>`) 
          .join('');
        methodFilter.insertAdjacentHTML('beforeend', options);
      }
    } catch (e) { console.error(e); }
  }

  async function loadPaidPayments() {
    bodyEl.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
    try {
      const payload = {
        operation: 'getPaidPayments',
        data: {
          start_date: startDate.value || null,
          end_date: endDate.value || null,
          payment_method_id: methodFilter.value || null
        }
      };
      const resp = await axios.post(`${apiBase}/CashierAPI.php`, payload);
      if (resp.data && resp.data.status === 'success') {
        renderTable(resp.data.data || []);
        renderKpis(resp.data.data || []);
      } else {
        bodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load.</td></tr>';
      }
    } catch (e) {
      console.error(e);
      bodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Network error.</td></tr>';
    }
  }

  function renderTable(rows) {
    if (!rows.length) {
      bodyEl.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No data.</td></tr>';
      return;
    }
    bodyEl.innerHTML = rows.map(r => `
      <tr>
        <td>${r.payment_id}</td>
        <td>${r.invoice_id}</td>
        <td>${r.patient_name || ''}</td>
        <td>${new Date(r.payment_date).toLocaleDateString()}</td>
        <td class="text-end">${peso(r.amount)}</td>
        <td>${r.method_name}</td>
        <td>${r.received_by_name || ''}</td>
      </tr>
    `).join('');
  }

  function renderKpis(rows) {
    const count = rows.length;
    const total = rows.reduce((s, r) => s + Number(r.amount || 0), 0);
    const kpiPayments = document.getElementById('kpiPayments');
    const kpiTotal = document.getElementById('kpiTotal');
    kpiPayments.textContent = count;
    kpiTotal.textContent = peso(total);
  }

  // Print
  printBtn.addEventListener('click', () => {
    window.print();
  });

  applyBtn.addEventListener('click', loadPaidPayments);

  await loadMethods();
  await loadPaidPayments();
});

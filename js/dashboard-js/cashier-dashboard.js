document.addEventListener('DOMContentLoaded', function () {
    const pendingBillsTable = document.getElementById('pending-bills-table').getElementsByTagName('tbody')[0];

    function fetchPendingBills() {
        axios.post('/hospital_billing/api/CashierAPI.php', {
            operation: 'getPendingBills'
        })
        .then(function (response) {
            if (response.data.status === 'success') {
                renderPendingBills(response.data.data);
            } else {
                console.error('Error fetching pending bills:', response.data.message);
            }
        })
        .catch(function (error) {
            console.error('Error fetching pending bills:', error);
        });
    }

    function renderPendingBills(bills) {
        pendingBillsTable.innerHTML = '';
        if (bills.length === 0) {
            const row = pendingBillsTable.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 5;
            cell.textContent = 'No pending bills found.';
            cell.style.textAlign = 'center';
            return;
        }

        bills.forEach(function (bill) {
            const row = pendingBillsTable.insertRow();
            row.insertCell().textContent = bill.invoice_id;
            row.insertCell().textContent = `${bill.patient_lname}, ${bill.patient_fname} ${bill.patient_mname}`;
            row.insertCell().textContent = new Date(bill.admission_date).toLocaleDateString();
            const amountDue = parseFloat(bill.amount_due) - parseFloat(bill.total_paid || 0);
            row.insertCell().textContent = `₱${amountDue.toFixed(2)}`;
            const actionCell = row.insertCell();
            const viewButton = document.createElement('button');
            viewButton.textContent = 'View Bill';
            viewButton.className = 'btn btn-primary btn-sm';
            viewButton.onclick = function() {
                // Redirect to billing overview page with admission_id
                window.location.href = `../placeholder-html/billing-overview.html?admission_id=${bill.admission_id}`;
            };
            actionCell.appendChild(viewButton);
        });
    }

    fetchPendingBills();
});

console.log('medicine-requests.js is working');

document.addEventListener("DOMContentLoaded", async () => {
    const apiBase = `${window.location.origin}/hospital_billing/api`;
    const tbody = document.getElementById("request-list");
    const searchInput = document.getElementById('searchInput');
    const dispenseModal = new bootstrap.Modal(document.getElementById('dispenseModal'));
    let allBatches = [];

    async function loadBatches() {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center">Loading...</td></tr>`;
        try {
            const response = await axios.get(`${apiBase}/requests-php/medicine-requests.php`, {
                params: { 
                    operation: "getBatchRequests",
                    _t: new Date().getTime() // Cache buster
                },
                withCredentials: true
            });

            const data = response.data;
            console.log('Batch data received:', data); // Debug logging
            // Corrected logic to handle the response
            if (data && data.success && data.data && data.data.length > 0) {
                allBatches = data.data;
                console.log('Rendering batches:', allBatches); // Debug logging
                renderBatches(allBatches);
            } else {
                console.log('No batches to display'); // Debug logging
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No pending requests found.</td></tr>`;
                allBatches = []; // Clear the local cache
            }
        } catch (err) {
            console.error("Error fetching requests:", err);
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Failed to load requests</td></tr>`;
        }
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredBatches = allBatches.filter(batch =>
            batch.patient_name.toLowerCase().includes(searchTerm) ||
            batch.doctor_name.toLowerCase().includes(searchTerm)
        );
        renderBatches(filteredBatches);
    });

    function renderBatches(batches) {
        tbody.innerHTML = "";
        batches.forEach(batch => {
            const tr = document.createElement("tr");
            // This corrected code creates the table cells correctly.
            tr.innerHTML = `
                <td>${new Date(batch.request_date).toLocaleDateString()}</td>
                <td>${batch.doctor_name}</td>
                <td>${batch.patient_name}</td>
                <td>${statusBadge(batch.status)}</td> 
                <td>
                    <button class="btn btn-sm btn-primary dispense-btn" data-batch-id="${batch.batch_id}">
                        <i class="fas fa-pills"></i> View & Dispense
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    tbody.addEventListener('click', async (e) => {
        const dispenseBtn = e.target.closest('.dispense-btn');
        if (dispenseBtn) {
            const batchId = dispenseBtn.dataset.batchId;
            const batch = allBatches.find(b => b.batch_id == batchId);
            if (!batch) return;

            document.getElementById('dispenseDoctor').textContent = batch.doctor_name;
            document.getElementById('dispensePatient').textContent = batch.patient_name;

            const itemsContainer = document.getElementById('dispense-items-container');
            itemsContainer.innerHTML = '<p class="text-center">Loading items...</p>';
            dispenseModal.show();

            try {
                const response = await axios.get(`${apiBase}/requests-php/medicine-requests.php`, {
                    params: { operation: 'getBatchDetails', batch_id: batchId },
                    withCredentials: true
                });

                if (response.data.success) {
                    renderDispenseModalItems(response.data.data);
                } else {
                    itemsContainer.innerHTML = `<p class="text-center text-danger">${response.data.message}</p>`;
                }
            } catch (error) {
                itemsContainer.innerHTML = `<p class="text-center text-danger">Failed to load items.</p>`;
            }
        }
    });

    function renderDispenseModalItems(items) {
        const itemsContainer = document.getElementById('dispense-items-container');
        const confirmBtn = document.getElementById('confirmDispenseBtn');
        
        itemsContainer.innerHTML = `
            <table class="table table-sm table-bordered">
                <thead class="table-light">
                    <tr>
                        <th class="text-center"><input type="checkbox" id="selectAllModalCheckbox"></th>
                        <th>Medicine</th>
                        <th>Quantity</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody id="dispense-items-tbody">
                    ${items.map(item => `
                        <tr class="${item.status === 'dispensed' ? 'table-success' : ''}">
                            <td class="text-center">
                                <input type="checkbox" class="dispense-item-checkbox" value="${item.item_id}" ${item.status === 'dispensed' ? 'disabled' : ''}>
                            </td>
                            <td>${item.med_name}</td>
                            <td>${item.quantity}</td>
                            <td>${statusBadge(item.status)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const modalCheckboxes = itemsContainer.querySelectorAll('.dispense-item-checkbox:not(:disabled)');
        const selectAllModalCheckbox = itemsContainer.querySelector('#selectAllModalCheckbox');

        const updateTotalState = () => {
            const checkedCount = itemsContainer.querySelectorAll('.dispense-item-checkbox:checked').length;
            confirmBtn.disabled = checkedCount === 0;
            selectAllModalCheckbox.checked = modalCheckboxes.length > 0 && checkedCount === modalCheckboxes.length;
            selectAllModalCheckbox.disabled = modalCheckboxes.length === 0;
        };

        modalCheckboxes.forEach(cb => cb.addEventListener('change', updateTotalState));
        selectAllModalCheckbox.addEventListener('change', (event) => {
            modalCheckboxes.forEach(cb => cb.checked = event.target.checked);
            updateTotalState();
        });

        confirmBtn.onclick = () => {
            const selectedIds = Array.from(itemsContainer.querySelectorAll('.dispense-item-checkbox:checked')).map(cb => cb.value);
            confirmDispense(selectedIds);
        };
        
        updateTotalState();
    }

    async function confirmDispense(itemIds) {
        Swal.fire({
            title: `Dispense ${itemIds.length} selected item(s)?`,
            text: "This will mark them as dispensed.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, dispense!',
            cancelButtonText: 'No, cancel',
            customClass: {
                container: 'swal2-behind-modal'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await axios.post(`${apiBase}/requests-php/medicine-requests.php`, {
                        operation: "dispenseItems",
                        item_ids: itemIds
                    }, { withCredentials: true });

                    console.log('Dispense response:', res.data); // Log the full response

                    if (res.data.success) {
                        dispenseModal.hide();
                        await Swal.fire('Dispensed!', res.data.message, 'success');
                        // Refresh the list after the user closes the success message
                        await loadBatches();
                    } else {
                        Swal.fire('Failed', res.data.message || 'Failed to dispense items.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    Swal.fire('Error', 'An error occurred while dispensing.', 'error');
                }
            }
        });
    }

    function statusBadge(status) {
        const s = (status || '').toLowerCase().trim();
        let cls = 'secondary';
        if (s === 'pending') cls = 'warning';
        else if (s === 'completed' || s === 'dispensed') cls = 'success';
        else if (s === 'cancelled') cls = 'danger';
        else if (s === 'partially dispensed' || s === 'partially_dispensed') cls = 'info'; // Handle both formats
        return `<span class="badge bg-${cls}">${status}</span>`;
    }

    loadBatches();
});
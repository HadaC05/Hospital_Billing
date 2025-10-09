document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = `${window.location.origin}/hospital_billing/api/requests-php/medicine-management.php`;

    const tableBody = document.getElementById("medicinesTableBody");
    const confirmBtn = document.getElementById("confirmPickupBtn");
    const administerBtn = document.getElementById("administerBtn");
    const returnBtn = document.getElementById("returnBtn");

    // Modal elements
    const batchDetailsModal = new bootstrap.Modal(document.getElementById('batchDetailsModal'));
    const modalBatchId = document.getElementById('modalBatchId');
    const modalPatientName = document.getElementById('modalPatientName');
    const modalDoctorName = document.getElementById('modalDoctorName');
    const modalBatchStatus = document.getElementById('modalBatchStatus');
    const modalBatchNotes = document.getElementById('modalBatchNotes');
    const batchItemsTableBody = document.getElementById('batchItemsTableBody');
    const modalConfirmPickupBtn = document.getElementById('modalConfirmPickupBtn');
    const modalAdministerBtn = document.getElementById('modalAdministerBtn');
    const modalReturnBtn = document.getElementById('modalReturnBtn');

    // Current batch items for confirmation
    let currentBatchItems = [];

    // ===== Utility =====
    function getSelectedBatchIds() {
        return Array.from(document.querySelectorAll(".batch-checkbox:checked"))
            .map(cb => cb.dataset.batchId);
    }

    function renderBatches(batches) {
        tableBody.innerHTML = "";
        batches.forEach(batch => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="batch-checkbox" data-batch-id="${batch.batch_id}">
                </td>
                <td>${batch.patient_name}</td>
                <td>${batch.doctor_name}</td>
                <td>${new Date(batch.request_date).toLocaleDateString()}</td>
                <td>${statusBadge(batch.batch_status)}</td>
                <td>
                    <span class="badge bg-info">${batch.item_count} items</span>
                    <div class="small text-muted">
                        ${batch.dispensed_count} dispensed, 
                        ${batch.picked_count} picked, 
                        ${batch.administered_count} administered
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info view-batch-btn" 
                        data-batch-id="${batch.batch_id}">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Re-bind view buttons
        document.querySelectorAll(".view-batch-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const batchId = btn.dataset.batchId;
                loadBatchDetails(batchId);
            });
        });
    }

    // ===== Load Batch Details =====
    async function loadBatchDetails(batchId) {
        try {
            const res = await axios.get(apiUrl, {
                params: { operation: "getBatchDetails", batch_id: batchId },
                withCredentials: true
            });

            if (res.data.success) {
                const batch = res.data.batch;
                const items = res.data.items;

                // Store current batch items
                currentBatchItems = items;

                // Populate modal with batch details
                modalBatchId.textContent = batch.batch_id;
                modalPatientName.textContent = batch.patient_name;
                modalDoctorName.textContent = batch.doctor_name;
                modalBatchStatus.innerHTML = statusBadge(batch.batch_status);
                modalBatchNotes.textContent = batch.notes || 'No notes';

                // Populate items table
                batchItemsTableBody.innerHTML = '';
                let hasDispensedItems = false;
                let hasPickedItems = false;

                items.forEach(item => {
                    const row = document.createElement('tr');
                    const isDispensed = item.item_status === 'dispensed';
                    const isPicked = item.item_status === 'picked';

                    if (isDispensed) hasDispensedItems = true;
                    if (isPicked) hasPickedItems = true;

                    row.innerHTML = `
                        <td>
                            ${isDispensed || isPicked ?
                            `<input type="checkbox" class="batch-item-checkbox" data-item-id="${item.item_id}">` :
                            ''
                        }
                        </td>
                        <td>${item.med_name}</td>
                        <td>${item.quantity}</td>
                        <td>
                            ${isDispensed || isPicked ?
                            `<input type="number" class="form-control form-control-sm item-quantity" 
                                data-item-id="${item.item_id}" 
                                min="1" max="${item.quantity}" 
                                value="${item.quantity}">` :
                            `<span class="text-muted">-</span>`
                        }
                        </td>
                        <td>${statusBadge(item.item_status)}</td>
                    `;
                    batchItemsTableBody.appendChild(row);
                });

                // Enable/disable buttons based on available items
                modalConfirmPickupBtn.disabled = !hasDispensedItems;
                modalAdministerBtn.disabled = !hasPickedItems;
                modalReturnBtn.disabled = !hasPickedItems;

                // Show the modal
                batchDetailsModal.show();

                // Add event listener to checkboxes
                document.querySelectorAll('.batch-item-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', updateActionButtonStates);
                });

                // Add event listener to quantity inputs
                document.querySelectorAll('.item-quantity').forEach(input => {
                    input.addEventListener('input', updateActionButtonStates);
                });

                // Add event listener to "Select All" checkbox
                const selectAllModalCheckbox = document.getElementById('selectAllModalCheckbox');
                if (selectAllModalCheckbox) {
                    selectAllModalCheckbox.addEventListener('change', function () {
                        const checkboxes = document.querySelectorAll('.batch-item-checkbox:not(:disabled)');
                        checkboxes.forEach(checkbox => {
                            checkbox.checked = this.checked;
                        });
                        updateActionButtonStates();
                    });
                }

            } else {
                Swal.fire("Error", res.data.message || "Failed to load batch details", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while loading batch details", "error");
        }
    }

    // Update action buttons state based on selected items
    function updateActionButtonStates() {
        const selectedCheckboxes = document.querySelectorAll('.batch-item-checkbox:checked');
        const hasSelection = selectedCheckboxes.length > 0;
        let hasValidQuantities = true;

        // Check if all selected items have valid quantities
        selectedCheckboxes.forEach(checkbox => {
            const itemId = checkbox.dataset.itemId;
            const quantityInput = document.querySelector(`.item-quantity[data-item-id="${itemId}"]`);
            if (quantityInput) {
                const quantity = parseInt(quantityInput.value) || 0;
                if (quantity <= 0) {
                    hasValidQuantities = false;
                }
            }
        });

        // Update action buttons
        modalConfirmPickupBtn.disabled = !(hasSelection && hasValidQuantities);
        modalAdministerBtn.disabled = !(hasSelection && hasValidQuantities);
        modalReturnBtn.disabled = !(hasSelection && hasValidQuantities);

        // Update "Select All" checkbox state
        const selectAllModalCheckbox = document.getElementById('selectAllModalCheckbox');
        const checkboxes = document.querySelectorAll('.batch-item-checkbox:not(:disabled)');
        if (selectAllModalCheckbox && checkboxes.length > 0) {
            selectAllModalCheckbox.checked = checkboxes.length > 0 && selectedCheckboxes.length === checkboxes.length;
        }
    }

    // ===== Confirm Pickup in Modal =====
    modalConfirmPickupBtn.addEventListener('click', async () => {
        await performAction('confirmPickup', 'Medicines confirmed as picked up');
    });

    // ===== Administer in Modal =====
    modalAdministerBtn.addEventListener('click', async () => {
        await performAction('administerMedicines', 'Medicines marked as administered');
    });

    // ===== Return in Modal =====
    modalReturnBtn.addEventListener('click', async () => {
        await performAction('returnMedicines', 'Medicines returned successfully');
    });

    // ===== Perform Action (Pickup, Administer, Return) =====
    async function performAction(operation, successMessage) {
        const selectedItems = [];

        document.querySelectorAll('.batch-item-checkbox:checked').forEach(checkbox => {
            const itemId = checkbox.dataset.itemId;
            const quantityInput = document.querySelector(`.item-quantity[data-item-id="${itemId}"]`);
            const quantity = parseInt(quantityInput.value) || 0;

            if (quantity > 0) {
                selectedItems.push({
                    item_id: itemId,
                    quantity: quantity
                });
            }
        });

        if (selectedItems.length === 0) {
            Swal.fire("Warning", "Please select at least one medicine with a valid quantity", "warning");
            return;
        }

        try {
            console.log(`Sending ${operation} request with items:`, selectedItems);
            const res = await axios.post(apiUrl, {
                operation: operation,
                json: JSON.stringify({ items: selectedItems })
            }, { withCredentials: true });

            console.log(`Response from ${operation}:`, res.data);

            if (res.data.success) {
                Swal.fire("Success", successMessage, "success");
                batchDetailsModal.hide();
                await loadDispensedMedicines();
            } else {
                Swal.fire("Error", res.data.message || "Operation failed", "error");
            }
        } catch (err) {
            console.error(`Error in ${operation}:`, err);
            Swal.fire("Error", `Network error while performing ${operation}`, "error");
        }
    }

    // ===== API Calls =====
    async function loadDispensedMedicines() {
        try {
            const res = await axios.get(apiUrl, {
                params: { operation: "getDispensedMedicines" },
                withCredentials: true
            });
            if (res.data.success) {
                renderBatches(res.data.batches);
            } else {
                Swal.fire("Error", res.data.message || "Failed to load medicines", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while loading medicines", "error");
        }
    }

    // ===== Button Events =====
    confirmBtn.addEventListener("click", () => {
        Swal.fire("Info", "Please use the 'View Details' button to select specific medicines for pickup confirmation.", "info");
    });

    administerBtn.addEventListener("click", () => {
        Swal.fire("Info", "Please use the 'View Details' button to select specific medicines for administration.", "info");
    });

    returnBtn.addEventListener("click", () => {
        Swal.fire("Info", "Please use the 'View Details' button to select specific medicines for return.", "info");
    });

    // ===== Select All Checkbox in Main Table =====
    document.getElementById("selectAll").addEventListener("change", function () {
        const checkboxes = document.querySelectorAll(".batch-checkbox");
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
        });
    });

    function statusBadge(status) {
        const s = (status || '').toLowerCase().trim();
        let cls = 'secondary';
        if (s === 'pending') cls = 'warning';
        else if (s === 'dispensed') cls = 'info';
        else if (s === 'picked') cls = 'primary';
        else if (s === 'administered') cls = 'success';
        else if (s === 'returned') cls = 'danger';
        else if (s === 'completed') cls = 'success';
        else if (s === 'cancelled') cls = 'danger';
        else if (s === 'partially dispensed' || s === 'partially_dispensed') cls = 'info';
        return `<span class="badge bg-${cls}">${status}</span>`;
    }

    // ===== Init =====
    loadDispensedMedicines();
});
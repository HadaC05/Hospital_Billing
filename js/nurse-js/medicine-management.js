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
    const modalConfirmPickupBtn = document.getElementById('confirmPickupBtn');

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

                items.forEach(item => {
                    const row = document.createElement('tr');
                    const isDispensed = item.item_status === 'dispensed';

                    if (isDispensed) hasDispensedItems = true;

                    row.innerHTML = `
                        <td>
                            ${isDispensed ?
                            `<input type="checkbox" class="batch-item-checkbox" data-item-id="${item.item_id}">` :
                            ''
                        }
                        </td>
                        <td>${item.med_name}</td>
                        <td>${item.quantity}</td>
                        <td>${statusBadge(item.item_status)}</td>
                    `;
                    batchItemsTableBody.appendChild(row);
                });

                // Enable/disable confirm pickup button
                modalConfirmPickupBtn.disabled = !hasDispensedItems;

                // Show the modal
                batchDetailsModal.show();

                // Add event listener to checkboxes
                document.querySelectorAll('.batch-item-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', updateConfirmButtonState);
                });

            } else {
                Swal.fire("Error", res.data.message || "Failed to load batch details", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while loading batch details", "error");
        }
    }

    // Update confirm button state based on selected items
    function updateConfirmButtonState() {
        const selectedItems = document.querySelectorAll('.batch-item-checkbox:checked');
        modalConfirmPickupBtn.disabled = selectedItems.length === 0;
    }

    // ===== Confirm Pickup in Modal =====
    modalConfirmPickupBtn.addEventListener('click', async () => {
        const selectedItems = Array.from(document.querySelectorAll('.batch-item-checkbox:checked'))
            .map(cb => cb.dataset.itemId);

        if (selectedItems.length === 0) {
            Swal.fire("Warning", "Please select at least one medicine to confirm pickup", "warning");
            return;
        }

        try {
            const res = await axios.post(apiUrl, {
                operation: "confirmPickup",
                json: JSON.stringify({ item_ids: selectedItems })
            }, { withCredentials: true });

            if (res.data.success) {
                Swal.fire("Success", "Medicines confirmed as picked up", "success");
                batchDetailsModal.hide();
                await loadDispensedMedicines();
            } else {
                Swal.fire("Error", res.data.message || "Failed to confirm pickup", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while confirming pickup", "error");
        }
    });

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

    function statusBadge(status) {
        const s = (status || '').toLowerCase().trim();
        let cls = 'secondary';
        if (s === 'pending') cls = 'warning';
        else if (s === 'completed' || s === 'dispensed') cls = 'success';
        else if (s === 'cancelled') cls = 'danger';
        else if (s === 'partially dispensed' || s === 'partially_dispensed') cls = 'info';
        return `<span class="badge bg-${cls}">${status}</span>`;
    }

    // ===== Init =====
    loadDispensedMedicines();
});
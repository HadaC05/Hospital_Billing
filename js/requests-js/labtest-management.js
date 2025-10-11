document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = `${window.location.origin}/hospital_billing/api/lab-php/labtest-management.php`;

    // DOM Elements
    const tableBody = document.getElementById("labTestsTableBody");

    // Modal elements
    const batchDetailsModalEl = document.getElementById('batchDetailsModal');
    const batchDetailsModal = new bootstrap.Modal(batchDetailsModalEl);
    const modalBatchId = document.getElementById('modalBatchId');
    const modalPatientName = document.getElementById('modalPatientName');
    const modalDoctorName = document.getElementById('modalDoctorName');
    const modalBatchStatus = document.getElementById('modalBatchStatus');
    const modalBatchNotes = document.getElementById('modalBatchNotes');
    const batchItemsTableBody = document.getElementById('batchItemsTableBody');
    const modalStartTestsBtn = document.getElementById('modalStartTestsBtn');
    const modalCompleteTestsBtn = document.getElementById('modalCompleteTestsBtn');
    const modalCancelTestsBtn = document.getElementById('modalCancelTestsBtn');

    // State variables
    let currentBatchItems = [];
    let currentAdmissionId = null;

    // ===== Initialize =====
    function init() {
        // Get current admission ID from localStorage or URL
        currentAdmissionId = getCurrentAdmissionId();

        // Load lab test requests
        loadLabTestRequests();
    }

    // ===== Admission Management =====
    function getCurrentAdmissionId() {
        // Try to get from localStorage first
        const admissionData = JSON.parse(localStorage.getItem('currentAdmission') || '{}');
        if (admissionData.admission_id) {
            return admissionData.admission_id;
        }

        // If not in localStorage, try to get from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('admission_id') || null;
    }

    function saveCurrentAdmissionId(admissionId) {
        localStorage.setItem('currentAdmission', JSON.stringify({ admission_id: admissionId }));
        currentAdmissionId = admissionId;
    }

    // ===== Utility Functions =====
    function getSelectedBatchIds() {
        return Array.from(document.querySelectorAll(".batch-checkbox:checked"))
            .map(cb => cb.dataset.batchId);
    }

    function statusBadge(status) {
        const s = (status || '').toLowerCase().trim();
        let cls = 'secondary';
        if (s === 'pending') cls = 'warning';
        else if (s === 'in_progress') cls = 'info';
        else if (s === 'completed') cls = 'success';
        else if (s === 'cancelled') cls = 'danger';
        return `<span class="badge bg-${cls}">${status}</span>`;
    }

    function billedStatusBadge(status) {
        const s = (status || '').toLowerCase().trim();
        let cls = 'secondary';
        if (s === 'yes') cls = 'success';
        else if (s === 'no') cls = 'warning';
        return `<span class="badge bg-${cls}">${status}</span>`;
    }

    // ===== Render Functions =====
    function renderBatches(batches) {
        tableBody.innerHTML = "";

        if (batches.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted">
                        No lab test requests found.
                    </td>
                </tr>
            `;
            return;
        }

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
                    <span class="badge bg-info">${batch.item_count} tests</span>
                    <div class="small text-muted">
                        ${batch.pending_count} pending, 
                        ${batch.in_progress_count} in progress, 
                        ${batch.completed_count} completed
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

    // ===== API Calls =====
    async function loadLabTestRequests() {
        try {
            const params = { operation: "getLabTestRequests" };

            // Add admission_id filter if available
            if (currentAdmissionId) {
                params.admission_id = currentAdmissionId;
            }

            const res = await axios.get(apiUrl, {
                params: params,
                withCredentials: true
            });

            if (res.data.success) {
                renderBatches(res.data.batches);
            } else {
                Swal.fire("Error", res.data.message || "Failed to load lab test requests", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while loading lab test requests", "error");
        }
    }

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
                let hasPendingItems = false;
                let hasInProgressItems = false;

                items.forEach(item => {
                    const row = document.createElement('tr');
                    const isPending = item.item_status === 'pending';
                    const isInProgress = item.item_status === 'in_progress';

                    if (isPending) hasPendingItems = true;
                    if (isInProgress) hasInProgressItems = true;

                    row.innerHTML = `
                        <td class="text-center">
                            ${isPending || isInProgress ?
                            `<input type="checkbox" class="batch-item-checkbox" data-item-id="${item.item_id}">` :
                            ''
                        }
                        </td>
                        <td>${item.test_name}</td>
                        <td>${statusBadge(item.item_status)}</td>
                        <td>${billedStatusBadge(item.billed_status)}</td>
                    `;
                    batchItemsTableBody.appendChild(row);
                });

                // Enable/disable buttons based on available items
                modalStartTestsBtn.disabled = !hasPendingItems;
                modalCompleteTestsBtn.disabled = !hasInProgressItems;
                modalCancelTestsBtn.disabled = !(hasPendingItems || hasInProgressItems);

                // Show the modal
                batchDetailsModal.show();

                // Add event listener to checkboxes
                document.querySelectorAll('.batch-item-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', updateActionButtonStates);
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

    // ===== Action Functions =====
    function updateActionButtonStates() {
        const selectedCheckboxes = document.querySelectorAll('.batch-item-checkbox:checked');
        const hasSelection = selectedCheckboxes.length > 0;

        // Update action buttons
        modalStartTestsBtn.disabled = !hasSelection;
        modalCompleteTestsBtn.disabled = !hasSelection;
        modalCancelTestsBtn.disabled = !hasSelection;

        // Update "Select All" checkbox state
        const selectAllModalCheckbox = document.getElementById('selectAllModalCheckbox');
        const checkboxes = document.querySelectorAll('.batch-item-checkbox:not(:disabled)');
        if (selectAllModalCheckbox && checkboxes.length > 0) {
            selectAllModalCheckbox.checked = checkboxes.length > 0 && selectedCheckboxes.length === checkboxes.length;
        }
    }

    async function performAction(operation, successMessage, requireReason = false) {
        const selectedItems = [];

        document.querySelectorAll('.batch-item-checkbox:checked').forEach(checkbox => {
            const itemId = checkbox.dataset.itemId;
            selectedItems.push({
                item_id: itemId
            });
        });

        if (selectedItems.length === 0) {
            Swal.fire("Warning", "Please select at least one test", "warning");
            return;
        }

        // If reason is required, get it from user
        let reason = '';
        if (requireReason) {
            const { value: reasonValue } = await Swal.fire({
                title: 'Reason for Cancellation',
                input: 'text',
                inputLabel: 'Please provide a reason for cancelling these tests',
                inputPlaceholder: 'Enter reason here',
                showCancelButton: true,
                inputValidator: (value) => {
                    if (!value) {
                        return 'You need to provide a reason!';
                    }
                }
            });

            if (!reasonValue) {
                return; // User cancelled
            }

            reason = reasonValue;
        }

        try {
            const requestData = {
                items: selectedItems,
                admission_id: currentAdmissionId
            };

            if (requireReason) {
                requestData.reason = reason;
            }

            const res = await axios.post(apiUrl, {
                operation: operation,
                json: JSON.stringify(requestData)
            }, { withCredentials: true });

            if (res.data.success) {
                Swal.fire("Success", successMessage, "success");
                batchDetailsModal.hide();
                await loadLabTestRequests();
            } else {
                Swal.fire("Error", res.data.message || "Operation failed", "error");
            }
        } catch (err) {
            console.error(`Error in ${operation}:`, err);
            Swal.fire("Error", `Network error while performing ${operation}`, "error");
        }
    }

    // ===== Event Listeners =====
    // Modal action buttons
    modalStartTestsBtn.addEventListener('click', async () => {
        await performAction('startLabTests', 'Lab tests started successfully');
    });

    modalCompleteTestsBtn.addEventListener('click', async () => {
        await performAction('completeLabTests', 'Lab tests completed successfully');
    });

    modalCancelTestsBtn.addEventListener('click', async () => {
        await performAction('cancelLabTests', 'Lab tests cancelled successfully', true);
    });

    // Select All checkbox in main table
    const selectAllCheckbox = document.getElementById("selectAll");
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", function () {
            const checkboxes = document.querySelectorAll(".batch-checkbox");
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
    }

    // ===== Initialize the application =====
    init();
});
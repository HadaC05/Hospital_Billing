console.log('my-patients.js loaded');
document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../../index.html';
        return;
    }
    const apiUrl = `${window.location.origin}/hospital_billing/api/doctor-php/get-doctor-patients.php`;
    const requestsApiUrl = `${window.location.origin}/hospital_billing/api/doctor-php/doctor-requests.php`;
    const tbody = document.getElementById('mp_list');

    // Modal elements
    const patientRequestsModal = new bootstrap.Modal(document.getElementById('patientRequestsModal'));
    const modalPatientName = document.getElementById('modalPatientName');
    const modalRoomNumber = document.getElementById('modalRoomNumber');
    const modalAdmissionDate = document.getElementById('modalAdmissionDate');
    const modalAdmissionReason = document.getElementById('modalAdmissionReason');
    const existingRequestsList = document.getElementById('existingRequestsList');
    const newRequestsForm = document.getElementById('newRequestsForm');
    const newRequestsTableBody = document.querySelector('#newRequestsTable tbody');
    const addRequestRowBtn = document.getElementById('addRequestRowBtn');

    // Current patient data
    let currentPatient = null;

    // Load data
    async function loadPatients() {
        try {
            const response = await axios.get(apiUrl, {
                params: { operation: "getDoctorAdmissions" },
                withCredentials: true
            });
            const data = response.data;
            if (!data.success) {
                console.error("Error fetching doctor patients:", data.message);
                renderRows([]);
                return;
            }
            renderRows(data.data);
        } catch (err) {
            console.error("API error:", err);
            renderRows([]);
        }
    }

    function renderRows(rows) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No data</td></tr>';
            return;
        }
        rows.forEach((r) => {
            const admissionDate = formatDate(r.admission_date);
            const statusClass = statusColor(r.status);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${admissionDate}</td>
                <td>${safe(r.patient_name)}</td>
                <td>${safe(r.room_number)}</td>
                <td>${truncate(r.admission_reason || '', 60)}</td>
                <td class="${statusClass}">${safe(r.status || '')}</td>
                <td>
                    <button class="btn btn-sm btn-primary manage-requests-btn" 
                            data-admission-id="${r.admission_id}" 
                            data-patient-id="${r.patient_id}"
                            data-patient-name="${safe(r.patient_name)}"
                            data-room-number="${safe(r.room_number)}"
                            data-admission-date="${admissionDate}"
                            data-admission-reason="${safe(r.admission_reason || '')}">
                        <i class="fas fa-clipboard-list me-1"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to manage requests buttons
        document.querySelectorAll('.manage-requests-btn').forEach(btn => {
            btn.addEventListener('click', openPatientRequestsModal);
        });
    }

    // Open patient requests modal
    async function openPatientRequestsModal(e) {
        const btn = e.currentTarget;
        currentPatient = {
            admission_id: btn.dataset.admissionId,
            patient_id: btn.dataset.patientId,
            patient_name: btn.dataset.patientName,
            room_number: btn.dataset.roomNumber,
            admission_date: btn.dataset.admissionDate,
            admission_reason: btn.dataset.admissionReason
        };

        // Set modal patient info
        modalPatientName.textContent = currentPatient.patient_name;
        modalRoomNumber.textContent = currentPatient.room_number;
        modalAdmissionDate.textContent = currentPatient.admission_date;
        modalAdmissionReason.textContent = currentPatient.admission_reason;

        // Reset tabs to show existing requests
        document.getElementById('existing-requests-tab').click();

        // Load existing requests
        await loadPatientRequests();

        // Reset new requests form
        resetNewRequestsForm();

        // Show modal
        patientRequestsModal.show();
    }

    async function loadPatientRequests() {
        try {
            const response = await axios.get(requestsApiUrl, {
                params: {
                    operation: "getRequests",
                    patient_id: currentPatient.patient_id
                },
                withCredentials: true
            });
            console.log("API Response:", response.data); // Add this line
            const data = response.data;
            if (!data.success) {
                console.error("Error fetching patient requests:", data.message);
                renderExistingRequests([]);
                return;
            }
            renderExistingRequests(data.requests);
        } catch (err) {
            console.error("API error:", err);
            renderExistingRequests([]);
        }
    }

    // Render existing requests
    function renderExistingRequests(requests) {
        console.log("Rendering requests:", requests); // Debugging line
        existingRequestsList.innerHTML = '';
        if (!requests || requests.length === 0) {
            existingRequestsList.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No requests found</td></tr>';
            return;
        }

        requests.forEach(request => {
            console.log("Processing request:", request); // Debugging line
            const row = document.createElement('tr');
            const statusBadge = getStatusBadge(request.status);

            // For medicine batches, show a view details button
            let actionButton = '';
            if (request.request_type === 'medicine_batch') {
                actionButton = `
                <button class="btn btn-sm btn-outline-info view-batch-btn" data-request-id="${request.request_id}" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger cancel-request-btn ms-1" data-request-id="${request.request_id}" title="Cancel Request">
                    <i class="fas fa-trash"></i>
                </button>

            `;
            } else {
                actionButton = `
                <button class="btn btn-sm btn-outline-danger cancel-request-btn" data-request-id="${request.request_id}">
                    Cancel
                </button>
            `;
            }

            row.innerHTML = `
            <td>${formatDate(request.request_date)}</td>
            <td>${safe(request.svc_name)}</td>
            <td>${safe(request.item_name || '-')}</td>
            <td>${statusBadge}</td>
            <td>
                ${actionButton} 
            </td>
        `;
            existingRequestsList.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.cancel-request-btn').forEach(btn => {
            btn.addEventListener('click', cancelRequest);
        });

        document.querySelectorAll('.view-batch-btn').forEach(btn => {
            btn.addEventListener('click', viewBatchDetails);
        });
    }

    // View batch details
    async function viewBatchDetails(e) {
        const batchId = e.currentTarget.dataset.requestId;
        console.log("Opening batch details for ID:", batchId);

        try {
            const response = await axios.get(`${window.location.origin}/hospital_billing/api/doctor-php/doctor-requests.php`, {
                params: {
                    operation: "getBatchDetails",
                    batch_id: batchId
                },
                withCredentials: true
            });

            if (response.data.success) {
                const batch = response.data.batch;
                const items = response.data.items;

                let itemsHtml = '';
                items.forEach(item => {
                    itemsHtml += `
                        <tr>
                            <td>${safe(item.med_name)}</td>
                            <td>${safe(item.quantity)}</td>
                            <td>${safe(item.notes || '-')}</td>
                            <td>${getStatusBadge(item.status)}</td>
                        </tr>
                    `;
                });

                Swal.fire({
                    title: 'Medicine Batch Details',
                    html: `
                        <div class="text-start">
                            <p><strong>Batch ID:</strong> ${batch.batch_id}</p>
                            <p><strong>Request Date:</strong> ${formatDate(batch.request_date)}</p>
                            <p><strong>Status:</strong> ${getStatusBadge(batch.status)}</p>
                            <p><strong>Notes:</strong> ${safe(batch.notes || 'None')}</p>
                            <hr>
                            <h6>Items:</h6>
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Medicine</th>
                                        <th>Quantity</th>
                                        <th>Notes</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    `,
                    width: '600px',
                    confirmButtonText: 'Close'
                });
            } else {
                Swal.fire('Error', 'Failed to load batch details', 'error');
            }
        } catch (error) {
            console.error('Error loading batch details:', error);
            Swal.fire('Error', 'Network error while loading batch details', 'error');
        }
    }

    // Cancel request
    async function cancelRequest(e) {
        const requestId = e.currentTarget.dataset.requestId;
        const isBatch = e.currentTarget.textContent.includes('Batch');

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: isBatch ? "You are about to cancel the entire batch!" : "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, cancel it!'
        });

        if (result.isConfirmed) {
            try {
                const response = await axios.post(requestsApiUrl, {
                    operation: "cancelRequest",
                    json: JSON.stringify({
                        request_id: requestId
                    })
                }, { withCredentials: true });

                if (response.data.success) {
                    Swal.fire(
                        'Cancelled!',
                        'The request has been cancelled.',
                        'success'
                    );
                    // Reload requests
                    await loadPatientRequests();
                } else {
                    Swal.fire(
                        'Error!',
                        response.data.message || 'Failed to cancel request',
                        'error'
                    );
                }
            } catch (error) {
                console.error('Error cancelling request:', error);
                Swal.fire(
                    'Error!',
                    'Network error while cancelling request.',
                    'error'
                );
            }
        }
    }

    // Reset new requests form
    function resetNewRequestsForm() {
        newRequestsTableBody.innerHTML = `
            <tr>
                <td>
                    <select class="form-select service-type-select" required>
                        <option value="">Select Type</option>
                        <option value="4">Medication</option>
                        <option value="3">Lab Test</option>
                        <option value="2">Surgery</option>
                        <option value="5">Treatment</option>
                        <option value="1">Room</option>
                    </select>
                </td>
                <td>
                    <select class="form-select item-select" required disabled>
                        <option value="">Select Type First</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="form-control quantity-input" min="1" value="1" required>
                </td>
                <td>
                    <input type="text" class="form-control notes-input" placeholder="Optional notes">
                </td>
                <td>
                    <button type="button" class="btn btn-sm btn-danger remove-row-btn" disabled>
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        updateRemoveButtons();
    }

    // Add row button
    addRequestRowBtn.addEventListener('click', () => {
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>
                <select class="form-select service-type-select" required>
                    <option value="">Select Type</option>
                    <option value="4">Medication</option>
                    <option value="3">Lab Test</option>
                    <option value="2">Surgery</option>
                    <option value="5">Treatment</option>
                    <option value="1">Room</option>
                </select>
            </td>
            <td>
                <select class="form-select item-select" required disabled>
                    <option value="">Select Type First</option>
                </select>
            </td>
            <td>
                <input type="number" class="form-control quantity-input" min="1" value="1" required>
            </td>
            <td>
                <input type="text" class="form-control notes-input" placeholder="Optional notes">
            </td>
            <td>
                <button type="button" class="btn btn-sm btn-danger remove-row-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        newRequestsTableBody.appendChild(newRow);
        updateRemoveButtons();
    });

    // Event delegation for service type change
    newRequestsTableBody.addEventListener('change', async (e) => {
        if (e.target.classList.contains('service-type-select')) {
            const svcTypeId = e.target.value;
            const row = e.target.closest('tr');
            const itemSelect = row.querySelector('.item-select');

            if (svcTypeId) {
                await loadItemsForServiceType(svcTypeId, itemSelect);
                itemSelect.disabled = false;
            } else {
                itemSelect.innerHTML = '<option value="">Select Type First</option>';
                itemSelect.disabled = true;
            }
        }
    });

    // Event delegation for remove row buttons
    newRequestsTableBody.addEventListener('click', (e) => {
        if (e.target.closest('.remove-row-btn')) {
            e.target.closest('tr').remove();
            updateRemoveButtons();
        }
    });

    // Update remove buttons state
    function updateRemoveButtons() {
        const rows = newRequestsTableBody.querySelectorAll('tr');
        const removeButtons = newRequestsTableBody.querySelectorAll('.remove-row-btn');
        removeButtons.forEach(btn => {
            btn.disabled = rows.length <= 1;
        });
    }

    // Load items for service type
    async function loadItemsForServiceType(svcTypeId, itemSelect) {
        itemSelect.innerHTML = '<option value="">Loading...</option>';
        try {
            let response;
            if (svcTypeId === "4") { // Medication
                console.log("Fetching medicines...");
                response = await axios.get(`${window.location.origin}/hospital_billing/api/masterfiles-php/get-medicines.php`, {
                    params: { operation: "getMedicines" },
                    withCredentials: true
                });

                console.log("Medicines API response:", response);
                console.log("Response data:", response.data);

                if (response.data.success) {
                    itemSelect.innerHTML = '<option value="">Select Medicine</option>';

                    // Access the medicines array correctly
                    const medicines = response.data.medicines || [];
                    console.log("Medicines array:", medicines);

                    // Filter for active medicines
                    const activeMeds = medicines.filter(med =>
                        med.is_active === "1" || med.is_active === 1 || med.is_active === true
                    );

                    console.log("Active medicines:", activeMeds);

                    if (activeMeds.length === 0) {
                        itemSelect.innerHTML = '<option value="">No active medicines available</option>';
                        return;
                    }

                    activeMeds.forEach(med => {
                        const opt = document.createElement('option');
                        opt.value = med.med_id;
                        // Use unit_name from the response
                        opt.textContent = `${med.med_name} (${med.unit_name || 'units'})`;
                        itemSelect.appendChild(opt);
                    });
                } else {
                    console.error("API returned error:", response.data.message);
                    itemSelect.innerHTML = `<option value="">Error: ${response.data.message}</option>`;
                }
            } else if (svcTypeId === "3") { // Lab Test
                response = await axios.get(`${window.location.origin}/hospital_billing/api/masterfiles-php/get-labtests.php`, {
                    params: { operation: "getLabtests" },
                    withCredentials: true
                });
                if (response.data.success) {
                    itemSelect.innerHTML = '<option value="">Select Lab Test</option>';
                    const activeTests = response.data.labtests.filter(test => test.is_active === "1" || test.is_active === 1);
                    activeTests.forEach(test => {
                        const opt = document.createElement('option');
                        opt.value = test.labtest_id;
                        opt.textContent = test.test_name;
                        itemSelect.appendChild(opt);
                    });
                }
            } else {
                // For other service types, we'll just use a placeholder
                itemSelect.innerHTML = '<option value="">Not implemented yet</option>';
                itemSelect.disabled = true;
            }
        } catch (error) {
            console.error("Error loading items:", error);
            itemSelect.innerHTML = '<option value="">Failed to load items</option>';
        }
    }

    // Form submission for batch requests
    newRequestsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rows = newRequestsTableBody.querySelectorAll('tr');
        const requests = [];
        let hasError = false;

        rows.forEach(row => {
            const svcTypeId = row.querySelector('.service-type-select').value;
            const itemId = row.querySelector('.item-select').value;
            const quantity = row.querySelector('.quantity-input').value;
            const notes = row.querySelector('.notes-input').value;

            if (!svcTypeId || !itemId || !quantity) {
                hasError = true;
                return;
            }

            requests.push({
                svc_type_id: svcTypeId,
                item_id: itemId,
                quantity: quantity,
                notes: notes
            });
        });

        if (hasError || requests.length === 0) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields in every row.',
                icon: 'warning'
            });
            return;
        }

        try {
            const submitBtn = newRequestsForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';

            const response = await axios.post(requestsApiUrl, {
                operation: "createBatchRequests",
                json: JSON.stringify({
                    doctor_id: user.user_id,
                    patient_id: currentPatient.patient_id,
                    batch_notes: document.getElementById('batchNotes')?.value || null,
                    requests: requests
                })
            }, { withCredentials: true });

            if (response.data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Requests submitted successfully!',
                    icon: 'success'
                });
                // Reset the form and switch to existing requests tab
                resetNewRequestsForm();
                document.getElementById('existing-requests-tab').click();
                await loadPatientRequests();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to submit requests: ' + (response.data.message || 'Unknown error'),
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error submitting requests:', error);
            Swal.fire({
                title: 'Error',
                text: 'Network error while submitting requests.',
                icon: 'error'
            });
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Requests';
        }
    });

    // Utility functions
    function formatDate(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleDateString();
        } catch { return value; }
    }

    function safe(v) {
        if (v === null || v === undefined) return '';
        return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }

    function truncate(t, n) {
        if (!t) return '';
        return t.length <= n ? t : t.substring(0, n) + '...';
    }

    function statusColor(status) {
        const s = (status || '').toLowerCase();
        if (s === 'discharged') return 'text-success';
        if (s === 'pending') return 'text-warning';
        if (s === 'critical') return 'text-danger';
        if (s === 'stable') return 'text-info';
        return 'text-primary';
    }

    function getStatusBadge(status) {
        const statusClasses = {
            pending: "bg-warning",
            approved: "bg-info",
            completed: "bg-success",
            cancelled: "bg-danger",
        };
        const statusText = {
            pending: "Pending",
            approved: "Approved",
            completed: "Completed",
            cancelled: "Cancelled",
        };
        return `<span class="badge ${statusClasses[status] || "bg-secondary"}">
                ${statusText[status] || status}
            </span>`;
    }

    await loadPatients();
});
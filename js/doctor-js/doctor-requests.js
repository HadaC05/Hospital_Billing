console.log('doctor-requests.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const apiBase = `${window.location.origin}/hospital_billing/api`;

    // Elements for new request
    const newRequestBtn = document.getElementById('newRequestBtn');
    const newRequestModal = new bootstrap.Modal(document.getElementById('newRequestModal'));
    const newRequestForm = document.getElementById('newRequestForm');
    const submitRequestBtn = document.getElementById('submitRequestBtn');

    // Table elements
    const tbody = document.getElementById('request-list');

    // Form elements
    const requestPatient = document.getElementById('request_patient');
    const requestType = document.getElementById('request_type');
    const requestItem = document.getElementById('request_item');
    const requestQuantity = document.getElementById('request_quantity');
    const requestNotes = document.getElementById('request_notes');

    // Load patients for dropdowns - han

    async function loadDoctorPatientsDropdown() {
        const select = document.getElementById('request_patient');

        try {
            const response = await axios.get(`${apiBase}/doctor-php/get-doctor-patients.php`, {
                params: { operation: "getDoctorAdmissions" },
                withCredentials: true
            });

            const data = response.data;
            if (!data.success || !data.data) {
                console.error("Could not load patients:", data.message);
                select.innerHTML = `<option value="">No patients available</option>`;
                return;
            }

            select.innerHTML = '<option value="">-- Select Patient --</option>';
            data.data.forEach(patient => {
                const opt = document.createElement('option');
                opt.value = patient.patient_id;  // you’ll probably need patient_id in requests
                opt.textContent = `${patient.patient_name} (${patient.room_number || 'No room'})`;
                select.appendChild(opt);
            });

        } catch (err) {
            console.error("API error loading patients:", err);
            select.innerHTML = `<option value="">Error loading patients</option>`;
        }
    }


    // Load doctor requests
    async function loadRequests() {
        try {
            const response = await axios.get(`${apiBase}/doctor-php/doctor-requests.php`, {
                params: { operation: "getRequests" },
                withCredentials: true
            });

            const data = response.data;
            if (!data.success) {
                console.error("Error fetching doctor requests:", data.message);
                renderRequests([]);
                return;
            }

            renderRequests(data.requests);
        } catch (err) {
            console.error("API error:", err);
            renderRequests([]);
        }
    }

    // Render requests table
    function renderRequests(requests) {
        if (!tbody) return;
        tbody.innerHTML = "";

        if (!requests || requests.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No requests found.</td>
            </tr>
        `;
            return;
        }

        requests.forEach((request) => {
            const row = document.createElement("tr");
            const statusBadge = getStatusBadge(request.status);
            let typeIcon = "fas fa-concierge-bell";
            switch (request.svc_name) {
                case "Medication":
                    typeIcon = "fas fa-pills";
                    break;
                case "Lab Test":
                    typeIcon = "fas fa-vial";
                    break;
                case "Surgery":
                    typeIcon = "fas fa-procedures";
                    break;
                case "Room":
                    typeIcon = "fas fa-bed";
                    break;
                case "Treatment":
                    typeIcon = "fas fa-stethoscope";
                    break;
            }

            row.innerHTML = `
            <td>${formatDate(request.request_date)}</td>
            <td>${safe(request.patient_name)}</td>
            <td><i class="${typeIcon} me-1"></i>${safe(request.svc_name)}</td>
            <td>${safe(request.item_name || "-")}</td>
            <td>${safe(request.quantity || "-")}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-request-btn" 
                        data-request-id="${request.request_id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

            tbody.appendChild(row);
        });
    }

    // Get status badge HTML
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

    // Utility functions
    function formatDate(value) {
        if (!value) return "";
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleDateString();
        } catch {
            return value;
        }
    }

    function safe(v) {
        if (v === null || v === undefined) return "";
        return String(v)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    // Load items based on request type
    async function loadItems(type) {
        requestItem.innerHTML = '<option value="">Loading...</option>';
        requestItem.disabled = true;

        try {
            const endpoint = type === 'medicine' ? 'get-medicines.php' : 'get-labtests.php';
            const response = await axios.get(`${apiBase}/${endpoint}`, {
                params: {
                    operation: 'getItems',
                    json: JSON.stringify({})
                }
            });

            if (response.data && response.data.success) {
                const items = response.data.items || [];
                requestItem.innerHTML = '<option value="">Select Item</option>';

                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.id;
                    option.textContent = item.name;
                    requestItem.appendChild(option);
                });

                requestItem.disabled = false;
            } else {
                requestItem.innerHTML = '<option value="">No items available</option>';
            }
        } catch (error) {
            console.error('Error loading items:', error);
            requestItem.innerHTML = '<option value="">Error loading items</option>';
        }
    }

    // Event listeners
    newRequestBtn.addEventListener('click', () => {
        newRequestModal.show();
    });

    // Submit new request
    async function submitRequest() {
        const formData = {
            patient_id: requestPatient.value,
            request_type: requestType.value,
            item_id: requestItem.value,
            quantity: requestQuantity.value,
            notes: requestNotes.value,
            doctor_id: user.user_id
        };

        // Validation
        if (!formData.patient_id || !formData.request_type || !formData.item_id || !formData.quantity) {
            alert('Please fill in all required fields.');
            return;
        }

        if (parseInt(formData.quantity) < 1) {
            alert('Quantity must be at least 1.');
            return;
        }

        try {
            submitRequestBtn.disabled = true;
            submitRequestBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';

            const response = await axios.post(`${apiBase}/doctor-php/doctor-requests.php`, {
                operation: 'createRequest',
                json: JSON.stringify(formData)
            });

            if (response.data && response.data.status === 'success') {
                alert('Request submitted successfully!');
                newRequestModal.hide();
                newRequestForm.reset();
                requestItem.innerHTML = '<option value="">Select Type First</option>';
                requestItem.disabled = true;
                await loadRequests(1, pagination.getItemsPerPage(), currentFilters);
            } else {
                alert('Failed to submit request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Network error while submitting request.');
        } finally {
            submitRequestBtn.disabled = false;
            submitRequestBtn.innerHTML = 'Submit Request';
        }
    }

    // Show request details modal
    function showRequestDetails(requestId) {
        // For now, just show an alert with the request ID
        // You can implement a proper modal later
        alert(`Request Details for ID: ${requestId}`);
    }

    // Event delegation for request actions
    tbody.addEventListener("click", (e) => {
        const btn = e.target.closest(".view-request-btn");
        if (btn) {
            const requestId = btn.dataset.requestId;
            showRequestDetails(requestId);
        }
    });

    submitRequestBtn.addEventListener('click', submitRequest);


    await loadRequests();
    await loadDoctorPatientsDropdown();
});
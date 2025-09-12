console.log('doctor-requests.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const apiBase = '../../api';
    
    // Elements
    const newRequestBtn = document.getElementById('newRequestBtn');
    const newRequestModal = new bootstrap.Modal(document.getElementById('newRequestModal'));
    const newRequestForm = document.getElementById('newRequestForm');
    const submitRequestBtn = document.getElementById('submitRequestBtn');
    const requestDetailsModal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
    const cancelRequestBtn = document.getElementById('cancelRequestBtn');
    
    // Filter elements
    const patientFilter = document.getElementById('patientFilter');
    const requestTypeFilter = document.getElementById('requestTypeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const printBtn = document.getElementById('printBtn');
    
    // Table elements
    const requestsBody = document.getElementById('requestsBody');
    const requestsPagination = document.getElementById('requestsPagination');
    
    // Form elements
    const requestPatient = document.getElementById('requestPatient');
    const requestType = document.getElementById('requestType');
    const requestItem = document.getElementById('requestItem');
    const requestQuantity = document.getElementById('requestQuantity');
    const requestNotes = document.getElementById('requestNotes');
    
    // State
    let currentRequests = [];
    let currentFilters = {
        patient: '',
        type: '',
        status: ''
    };
    
    // Pagination
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => loadRequests(page, pagination.getItemsPerPage(), currentFilters),
        onItemsPerPageChange: (items) => loadRequests(1, items, currentFilters),
    });

    // Initialize
    await loadPatients();
    await loadRequests(1, pagination.getItemsPerPage(), currentFilters);

    // Load patients for dropdowns
    async function loadPatients() {
        try {
            const response = await axios.get(`${apiBase}/get-patients.php`, {
                params: {
                    operation: 'getPatients',
                    json: JSON.stringify({})
                }
            });
            
            if (response.data.success && Array.isArray(response.data.patients)) {
                const patients = response.data.patients;
                
                // Populate filter dropdown
                patientFilter.innerHTML = '<option value="">All Patients</option>';
                patients.forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.patient_id;
                    option.textContent = `${patient.patient_fname} ${patient.patient_lname}`;
                    patientFilter.appendChild(option);
                });
                
                // Populate form dropdown
                requestPatient.innerHTML = '<option value="">Select Patient</option>';
                patients.forEach(patient => {
                    const option = document.createElement('option');
                    option.value = patient.patient_id;
                    option.textContent = `${patient.patient_fname} ${patient.patient_lname}`;
                    requestPatient.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    }

    // Load requests
    async function loadRequests(page = 1, itemsPerPage = 10, filters = {}) {
        try {
            requestsBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
            
            const response = await axios.post(`${apiBase}/DoctorRequestAPI.php`, {
                operation: 'getRequests',
                json: JSON.stringify({
                    page: page,
                    itemsPerPage: itemsPerPage,
                    filters: filters,
                    doctor_id: user.user_id
                })
            });

            if (response.data && response.data.status === 'success') {
                currentRequests = response.data.requests || [];
                renderRequests(currentRequests);
                
                if (response.data.pagination) {
                    const p = response.data.pagination;
                    pagination.calculatePagination(p.totalItems, p.currentPage, p.itemsPerPage);
                    pagination.generatePaginationControls('requestsPagination');
                }
                
                printBtn.disabled = currentRequests.length === 0;
            } else {
                requestsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load requests.</td></tr>';
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            requestsBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    // Render requests table
    function renderRequests(requests) {
        requestsBody.innerHTML = '';
        
        if (!requests || requests.length === 0) {
            requestsBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No requests found.</td></tr>';
            return;
        }

        requests.forEach(request => {
            const row = document.createElement('tr');
            const statusBadge = getStatusBadge(request.status);
            const typeIcon = request.request_type === 'medicine' ? 'fas fa-pills' : 'fas fa-vial';
            
            row.innerHTML = `
                <td>#${request.request_id}</td>
                <td>${request.patient_name}</td>
                <td><i class="${typeIcon} me-1"></i>${request.request_type}</td>
                <td>${request.item_name}</td>
                <td>${request.quantity}</td>
                <td>${statusBadge}</td>
                <td>${new Date(request.request_date).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary view-request-btn" data-request-id="${request.request_id}">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            
            requestsBody.appendChild(row);
        });

        // Add event listeners for view buttons
        document.querySelectorAll('.view-request-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const requestId = e.target.closest('.view-request-btn').dataset.requestId;
                showRequestDetails(requestId);
            });
        });
    }

    // Get status badge HTML
    function getStatusBadge(status) {
        const statusClasses = {
            'pending': 'bg-warning',
            'approved': 'bg-info',
            'completed': 'bg-success',
            'cancelled': 'bg-danger'
        };
        
        const statusText = {
            'pending': 'Pending',
            'approved': 'Approved',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        
        return `<span class="badge ${statusClasses[status] || 'bg-secondary'}">${statusText[status] || status}</span>`;
    }

    // Show request details
    async function showRequestDetails(requestId) {
        try {
            const response = await axios.post(`${apiBase}/DoctorRequestAPI.php`, {
                operation: 'getRequestDetails',
                json: JSON.stringify({ request_id: requestId })
            });

            if (response.data && response.data.status === 'success') {
                const request = response.data.request;
                const detailsContent = document.getElementById('requestDetailsContent');
                
                detailsContent.innerHTML = `
                    <div class="row g-3">
                        <div class="col-md-6">
                            <strong>Request ID:</strong> #${request.request_id}
                        </div>
                        <div class="col-md-6">
                            <strong>Status:</strong> ${getStatusBadge(request.status)}
                        </div>
                        <div class="col-md-6">
                            <strong>Patient:</strong> ${request.patient_name}
                        </div>
                        <div class="col-md-6">
                            <strong>Type:</strong> <i class="${request.request_type === 'medicine' ? 'fas fa-pills' : 'fas fa-vial'} me-1"></i>${request.request_type}
                        </div>
                        <div class="col-md-6">
                            <strong>Item:</strong> ${request.item_name}
                        </div>
                        <div class="col-md-6">
                            <strong>Quantity:</strong> ${request.quantity}
                        </div>
                        <div class="col-md-6">
                            <strong>Request Date:</strong> ${new Date(request.request_date).toLocaleString()}
                        </div>
                        <div class="col-md-6">
                            <strong>Doctor:</strong> ${request.doctor_name}
                        </div>
                        ${request.notes ? `
                        <div class="col-12">
                            <strong>Notes:</strong><br>
                            <div class="bg-light p-2 rounded">${request.notes}</div>
                        </div>
                        ` : ''}
                        ${request.status === 'pending' ? `
                        <div class="col-12">
                            <div class="alert alert-warning">
                                <i class="fas fa-clock me-2"></i>This request is pending approval.
                            </div>
                        </div>
                        ` : ''}
                        ${request.status === 'completed' ? `
                        <div class="col-12">
                            <div class="alert alert-success">
                                <i class="fas fa-check-circle me-2"></i>This request has been completed.
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
                
                // Show/hide cancel button based on status
                if (request.status === 'pending') {
                    cancelRequestBtn.classList.remove('d-none');
                    cancelRequestBtn.onclick = () => cancelRequest(requestId);
                } else {
                    cancelRequestBtn.classList.add('d-none');
                }
                
                requestDetailsModal.show();
            }
        } catch (error) {
            console.error('Error loading request details:', error);
            alert('Failed to load request details.');
        }
    }

    // Cancel request
    async function cancelRequest(requestId) {
        if (!confirm('Are you sure you want to cancel this request?')) {
            return;
        }

        try {
            const response = await axios.post(`${apiBase}/DoctorRequestAPI.php`, {
                operation: 'cancelRequest',
                json: JSON.stringify({ request_id: requestId })
            });

            if (response.data && response.data.status === 'success') {
                alert('Request cancelled successfully.');
                requestDetailsModal.hide();
                await loadRequests(1, pagination.getItemsPerPage(), currentFilters);
            } else {
                alert('Failed to cancel request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error cancelling request:', error);
            alert('Network error while cancelling request.');
        }
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

            const response = await axios.post(`${apiBase}/DoctorRequestAPI.php`, {
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

    // Apply filters
    function applyFilters() {
        currentFilters = {
            patient: patientFilter.value,
            type: requestTypeFilter.value,
            status: statusFilter.value
        };
        loadRequests(1, pagination.getItemsPerPage(), currentFilters);
    }

    // Print functionality
    function printRequests() {
        const printArea = document.getElementById('printArea');
        const now = new Date().toLocaleString();
        
        const rows = currentRequests.map(request => {
            const statusBadge = getStatusBadge(request.status);
            const typeIcon = request.request_type === 'medicine' ? 'Medicine' : 'Lab Test';
            
            return `
                <tr>
                    <td>#${request.request_id}</td>
                    <td>${request.patient_name}</td>
                    <td>${typeIcon}</td>
                    <td>${request.item_name}</td>
                    <td>${request.quantity}</td>
                    <td>${request.status}</td>
                    <td>${new Date(request.request_date).toLocaleDateString()}</td>
                </tr>
            `;
        }).join('');

        printArea.innerHTML = `
            <div class="container py-4">
                <div class="text-center mb-3">
                    <h3>Springfield General Hospital</h3>
                    <h5>Doctor Requests Report</h5>
                    <div>Generated: ${now}</div>
                    <div>Doctor: ${user.username}</div>
                </div>
                <table class="table table-bordered table-sm">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient</th>
                            <th>Type</th>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Request Date</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        const original = document.body.innerHTML;
        document.body.innerHTML = printArea.innerHTML;
        window.print();
        document.body.innerHTML = original;
        location.reload();
    }

    // Event listeners
    newRequestBtn.addEventListener('click', () => {
        newRequestModal.show();
    });

    requestType.addEventListener('change', (e) => {
        if (e.target.value) {
            loadItems(e.target.value);
        } else {
            requestItem.innerHTML = '<option value="">Select Type First</option>';
            requestItem.disabled = true;
        }
    });

    submitRequestBtn.addEventListener('click', submitRequest);

    applyFiltersBtn.addEventListener('click', applyFilters);

    printBtn.addEventListener('click', printRequests);

    // Form reset on modal close
    document.getElementById('newRequestModal').addEventListener('hidden.bs.modal', () => {
        newRequestForm.reset();
        requestItem.innerHTML = '<option value="">Select Type First</option>';
        requestItem.disabled = true;
    });
});

console.log('request-management.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const apiBase = '../../api';
    
    // Elements
    const refreshBtn = document.getElementById('refreshBtn');
    const printBtn = document.getElementById('printBtn');
    const requestDetailsModal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
    const completeRequestModal = new bootstrap.Modal(document.getElementById('completeRequestModal'));
    const rejectRequestModal = new bootstrap.Modal(document.getElementById('rejectRequestModal'));
    
    // Filter elements
    const requestTypeFilter = document.getElementById('requestTypeFilter');
    const statusFilter = document.getElementById('statusFilter');
    const doctorFilter = document.getElementById('doctorFilter');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    
    // Table elements
    const requestsBody = document.getElementById('requestsBody');
    const requestsPagination = document.getElementById('requestsPagination');
    
    // Stats elements
    const pendingCount = document.getElementById('pendingCount');
    const approvedCount = document.getElementById('approvedCount');
    const completedCount = document.getElementById('completedCount');
    const cancelledCount = document.getElementById('cancelledCount');
    
    // Action buttons
    const approveRequestBtn = document.getElementById('approveRequestBtn');
    const completeRequestBtn = document.getElementById('completeRequestBtn');
    const rejectRequestBtn = document.getElementById('rejectRequestBtn');
    const confirmCompleteBtn = document.getElementById('confirmCompleteBtn');
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    
    // Form elements
    const completionNotes = document.getElementById('completionNotes');
    const rejectionReason = document.getElementById('rejectionReason');
    
    // State
    let currentRequests = [];
    let currentFilters = {
        type: '',
        status: '',
        doctor: ''
    };
    let currentRequestId = null;
    
    // Pagination
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => loadRequests(page, pagination.getItemsPerPage(), currentFilters),
        onItemsPerPageChange: (items) => loadRequests(1, items, currentFilters),
    });

    // Initialize
    await loadDoctors();
    await loadRequests(1, pagination.getItemsPerPage(), currentFilters);

    // Load doctors for filter dropdown
    async function loadDoctors() {
        try {
            const response = await axios.get(`${apiBase}/get-users.php`, {
                params: {
                    operation: 'getUsersByRole',
                    json: JSON.stringify({ role_id: 2 }) // Doctor role
                }
            });
            
            if (response.data && response.data.success && Array.isArray(response.data.users)) {
                const doctors = response.data.users;
                
                doctorFilter.innerHTML = '<option value="">All Doctors</option>';
                doctors.forEach(doctor => {
                    const option = document.createElement('option');
                    option.value = doctor.user_id;
                    option.textContent = `${doctor.first_name} ${doctor.last_name}`;
                    doctorFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading doctors:', error);
        }
    }

    // Load requests
    async function loadRequests(page = 1, itemsPerPage = 10, filters = {}) {
        try {
            requestsBody.innerHTML = '<tr><td colspan="9" class="text-center">Loading...</td></tr>';
            
            const response = await axios.post(`${apiBase}/RequestManagementAPI.php`, {
                operation: 'getRequests',
                json: JSON.stringify({
                    page: page,
                    itemsPerPage: itemsPerPage,
                    filters: filters,
                    user_id: user.user_id,
                    user_role: user.role_id
                })
            });

            if (response.data && response.data.status === 'success') {
                currentRequests = response.data.requests || [];
                renderRequests(currentRequests);
                updateStats(response.data.stats || {});
                
                if (response.data.pagination) {
                    const p = response.data.pagination;
                    pagination.calculatePagination(p.totalItems, p.currentPage, p.itemsPerPage);
                    pagination.generatePaginationControls('requestsPagination');
                }
                
                printBtn.disabled = currentRequests.length === 0;
            } else {
                requestsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Failed to load requests.</td></tr>';
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            requestsBody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Network error.</td></tr>';
        }
    }

    // Update statistics
    function updateStats(stats) {
        pendingCount.textContent = stats.pending || 0;
        approvedCount.textContent = stats.approved || 0;
        completedCount.textContent = stats.completed || 0;
        cancelledCount.textContent = stats.cancelled || 0;
    }

    // Render requests table
    function renderRequests(requests) {
        requestsBody.innerHTML = '';
        
        if (!requests || requests.length === 0) {
            requestsBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No requests found.</td></tr>';
            return;
        }

        requests.forEach(request => {
            const row = document.createElement('tr');
            const statusBadge = getStatusBadge(request.status);
            const typeIcon = request.request_type === 'medicine' ? 'fas fa-pills' : 'fas fa-vial';
            
            row.innerHTML = `
                <td>#${request.request_id}</td>
                <td>${request.patient_name}</td>
                <td>${request.doctor_name}</td>
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
            const response = await axios.post(`${apiBase}/RequestManagementAPI.php`, {
                operation: 'getRequestDetails',
                json: JSON.stringify({ request_id: requestId })
            });

            if (response.data && response.data.status === 'success') {
                const request = response.data.request;
                currentRequestId = requestId;
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
                            <strong>Doctor:</strong> ${request.doctor_name}
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
                            <strong>Unit Price:</strong> ₱${parseFloat(request.unit_price || 0).toFixed(2)}
                        </div>
                        <div class="col-md-6">
                            <strong>Request Date:</strong> ${new Date(request.request_date).toLocaleString()}
                        </div>
                        <div class="col-md-6">
                            <strong>Total Amount:</strong> ₱${(parseFloat(request.unit_price || 0) * parseInt(request.quantity)).toFixed(2)}
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
                                <i class="fas fa-clock me-2"></i>This request is pending your action.
                            </div>
                        </div>
                        ` : ''}
                        ${request.status === 'approved' ? `
                        <div class="col-12">
                            <div class="alert alert-info">
                                <i class="fas fa-check-circle me-2"></i>This request has been approved and is ready for completion.
                            </div>
                        </div>
                        ` : ''}
                        ${request.status === 'completed' ? `
                        <div class="col-12">
                            <div class="alert alert-success">
                                <i class="fas fa-check-double me-2"></i>This request has been completed.
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
                
                // Show/hide action buttons based on status and user role
                updateActionButtons(request.status, user.role_id);
                
                requestDetailsModal.show();
            }
        } catch (error) {
            console.error('Error loading request details:', error);
            alert('Failed to load request details.');
        }
    }

    // Update action buttons based on status and role
    function updateActionButtons(status, userRole) {
        // Hide all buttons first
        approveRequestBtn.classList.add('d-none');
        completeRequestBtn.classList.add('d-none');
        rejectRequestBtn.classList.add('d-none');
        
        // Show appropriate buttons based on status and role
        if (status === 'pending') {
            if (userRole === 5 || userRole === 6) { // Lab Technician or Pharmacist
                approveRequestBtn.classList.remove('d-none');
                rejectRequestBtn.classList.remove('d-none');
            }
        } else if (status === 'approved') {
            if (userRole === 5 || userRole === 6) { // Lab Technician or Pharmacist
                completeRequestBtn.classList.remove('d-none');
            }
        }
    }

    // Approve request
    async function approveRequest() {
        if (!confirm('Are you sure you want to approve this request?')) {
            return;
        }

        try {
            const response = await axios.post(`${apiBase}/RequestManagementAPI.php`, {
                operation: 'approveRequest',
                json: JSON.stringify({ 
                    request_id: currentRequestId,
                    user_id: user.user_id
                })
            });

            if (response.data && response.data.status === 'success') {
                alert('Request approved successfully.');
                requestDetailsModal.hide();
                await loadRequests(1, pagination.getItemsPerPage(), currentFilters);
            } else {
                alert('Failed to approve request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error approving request:', error);
            alert('Network error while approving request.');
        }
    }

    // Complete request
    async function completeRequest() {
        const notes = completionNotes.value.trim();
        
        try {
            const response = await axios.post(`${apiBase}/RequestManagementAPI.php`, {
                operation: 'completeRequest',
                json: JSON.stringify({ 
                    request_id: currentRequestId,
                    user_id: user.user_id,
                    notes: notes
                })
            });

            if (response.data && response.data.status === 'success') {
                alert('Request completed successfully.');
                completeRequestModal.hide();
                requestDetailsModal.hide();
                completionNotes.value = '';
                await loadRequests(1, pagination.getItemsPerPage(), currentFilters);
            } else {
                alert('Failed to complete request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error completing request:', error);
            alert('Network error while completing request.');
        }
    }

    // Reject request
    async function rejectRequest() {
        const reason = rejectionReason.value.trim();
        
        if (!reason) {
            alert('Please provide a reason for rejection.');
            return;
        }

        try {
            const response = await axios.post(`${apiBase}/RequestManagementAPI.php`, {
                operation: 'rejectRequest',
                json: JSON.stringify({ 
                    request_id: currentRequestId,
                    user_id: user.user_id,
                    reason: reason
                })
            });

            if (response.data && response.data.status === 'success') {
                alert('Request rejected successfully.');
                rejectRequestModal.hide();
                requestDetailsModal.hide();
                rejectionReason.value = '';
                await loadRequests(1, pagination.getItemsPerPage(), currentFilters);
            } else {
                alert('Failed to reject request: ' + (response.data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error rejecting request:', error);
            alert('Network error while rejecting request.');
        }
    }

    // Apply filters
    function applyFilters() {
        currentFilters = {
            type: requestTypeFilter.value,
            status: statusFilter.value,
            doctor: doctorFilter.value
        };
        loadRequests(1, pagination.getItemsPerPage(), currentFilters);
    }

    // Print functionality
    function printRequests() {
        const printArea = document.getElementById('printArea');
        const now = new Date().toLocaleString();
        
        const rows = currentRequests.map(request => {
            const typeIcon = request.request_type === 'medicine' ? 'Medicine' : 'Lab Test';
            
            return `
                <tr>
                    <td>#${request.request_id}</td>
                    <td>${request.patient_name}</td>
                    <td>${request.doctor_name}</td>
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
                    <h5>Request Management Report</h5>
                    <div>Generated: ${now}</div>
                    <div>Staff: ${user.username}</div>
                </div>
                <table class="table table-bordered table-sm">
                    <thead>
                        <tr>
                            <th>Request ID</th>
                            <th>Patient</th>
                            <th>Doctor</th>
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
    refreshBtn.addEventListener('click', () => {
        loadRequests(1, pagination.getItemsPerPage(), currentFilters);
    });

    applyFiltersBtn.addEventListener('click', applyFilters);

    printBtn.addEventListener('click', printRequests);

    approveRequestBtn.addEventListener('click', approveRequest);

    completeRequestBtn.addEventListener('click', () => {
        completeRequestModal.show();
    });

    rejectRequestBtn.addEventListener('click', () => {
        rejectRequestModal.show();
    });

    confirmCompleteBtn.addEventListener('click', completeRequest);

    confirmRejectBtn.addEventListener('click', rejectRequest);

    // Form reset on modal close
    document.getElementById('completeRequestModal').addEventListener('hidden.bs.modal', () => {
        completionNotes.value = '';
    });

    document.getElementById('rejectRequestModal').addEventListener('hidden.bs.modal', () => {
        rejectionReason.value = '';
    });
});

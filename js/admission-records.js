console.log('admission-records.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    // Use relative path for API URL to avoid cross-origin issues
    const baseApiUrl = '../api';
    // Get user from localStorage or create a temporary one for testing
    let user = JSON.parse(localStorage.getItem('user'));

    // For testing purposes - create a temporary user if none exists
    if (!user) {
        console.warn('No user found in localStorage. Creating temporary user for testing.');
        // Uncomment the line below to redirect to login in production
        // window.location.href = '../index.html';
        // return;
    }
    // Local API URL for relative paths
    const localApiUrl = '../api/';

    // Get elements
    const admissionList = document.getElementById('admission-list');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const printBtn = document.getElementById('printBtn');
    const printDetailBtn = document.getElementById('printDetailBtn');

    // Load admissions on page load
    loadAdmissions();

    // Add event listeners for search and filter
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            filterAdmissions();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', function () {
            filterAdmissions();
        });
    }

    // Print button event listener
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            printAdmissionList();
        });
    }

    // Print detail button event listener
    if (printDetailBtn) {
        printDetailBtn.addEventListener('click', function () {
            printAdmissionDetail();
        });
    }

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            loadAdmissions(page);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            loadAdmissions(1, itemsPerPage);
        }
    });

    // Function to load all admissions
    function loadAdmissions(page = 1, itemsPerPage = 10, search = '') {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'getAdmissions',
            page: page,
            itemsPerPage: itemsPerPage,
            search: search
        })
            .then(function (response) {
                if (response.data.status === 'success') {
                    // Store admissions in a global variable for filtering
                    window.allAdmissions = response.data.data;
                    displayAdmissions(window.allAdmissions);

                    // Update pagination controls
                    if (response.data.pagination) {
                        pagination.calculatePagination(response.data.pagination.totalItems, response.data.pagination.currentPage, response.data.pagination.itemsPerPage);
                        pagination.generatePaginationControls('pagination-container');
                    }
                } else {
                    console.error('Error:', response.data.message);
                }
            })
            .catch(function (error) {
                console.error('Error:', error);
            });
    }

    // Function to display admissions in the table
    function displayAdmissions(admissions) {
        if (!admissionList) return;

        admissionList.innerHTML = '';

        if (admissions.length === 0) {
            admissionList.innerHTML = '<tr><td colspan="8" class="text-center">No admissions found</td></tr>';
            return;
        }

        admissions.forEach(function (admission) {
            const row = document.createElement('tr');

            // Format dates
            const admissionDate = new Date(admission.admission_date).toLocaleDateString();
            const dischargeDate = admission.discharge_date ? new Date(admission.discharge_date).toLocaleDateString() : 'Not discharged';

            // Get status from the database field
            const status = admission.status || (admission.discharge_date ? 'Discharged' : 'Active');
            let statusClass = 'text-primary';

            // Set status class based on status value
            switch (status) {
                case 'Discharged':
                    statusClass = 'text-success';
                    break;
                case 'Active':
                    statusClass = 'text-primary';
                    break;
                case 'Pending':
                    statusClass = 'text-warning';
                    break;
                case 'Critical':
                    statusClass = 'text-danger';
                    break;
                case 'Stable':
                    statusClass = 'text-info';
                    break;
                default:
                    statusClass = 'text-primary';
            }

            row.innerHTML = `
                <td>${admission.patient_id}</td>
                <td>${admission.patient_lname}, ${admission.patient_fname} ${admission.patient_mname || ''}</td>
                <td>${admission.mobile_number || 'N/A'}</td>
                <td>${admissionDate}</td>
                <td>${dischargeDate}</td>
                <td>${truncateText(admission.admission_reason, 50)}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="btn btn-sm btn-info view-btn" data-id="${admission.admission_id}" data-patient-id="${admission.patient_id}">View</button>
                </td>
            `;

            admissionList.appendChild(row);
        });

        // Add event listeners to view buttons
        document.querySelectorAll('.view-btn').forEach(function (button) {
            button.addEventListener('click', function () {
                const admissionId = this.getAttribute('data-id');
                const patientId = this.getAttribute('data-patient-id');
                viewAdmissionDetails(admissionId, patientId);
            });
        });
    }

    // Function to filter admissions based on search input and status filter
    function filterAdmissions() {
        if (!window.allAdmissions) return;

        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;

        const filteredAdmissions = window.allAdmissions.filter(function (admission) {
            // Filter by search term
            const nameMatch = `${admission.patient_fname} ${admission.patient_mname || ''} ${admission.patient_lname}`.toLowerCase().includes(searchTerm);
            const dateMatch = admission.admission_date.includes(searchTerm);
            const searchMatch = nameMatch || dateMatch;

            // Filter by status
            let statusMatch = true;
            if (statusValue === 'active') {
                statusMatch = admission.status === 'Active';
            } else if (statusValue === 'discharged') {
                statusMatch = admission.status === 'Discharged';
            } else if (statusValue === 'pending') {
                statusMatch = admission.status === 'Pending';
            } else if (statusValue === 'critical') {
                statusMatch = admission.status === 'Critical';
            } else if (statusValue === 'stable') {
                statusMatch = admission.status === 'Stable';
            }

            return searchMatch && statusMatch;
        });

        displayAdmissions(filteredAdmissions);
    }

    // Function to view admission details
    function viewAdmissionDetails(admissionId, patientId) {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'getAdmissionDetails',
            admission_id: admissionId,
            patient_id: patientId
        })
            .then(function (response) {
                if (response.data.status === 'success') {
                    const data = response.data.data;

                    // Format dates
                    const birthdate = new Date(data.birthdate).toLocaleDateString();
                    const admissionDate = new Date(data.admission_date).toLocaleDateString();
                    const dischargeDate = data.discharge_date ? new Date(data.discharge_date).toLocaleDateString() : 'Not discharged';
                    const status = data.status || (data.discharge_date ? 'Discharged' : 'Active');

                    // Set modal values
                    document.getElementById('view_patient_id').textContent = data.patient_id;
                    document.getElementById('view_patient_name').textContent = `${data.patient_lname}, ${data.patient_fname} ${data.patient_mname || ''}`;
                    document.getElementById('view_birthdate').textContent = birthdate;
                    document.getElementById('view_address').textContent = data.address;
                    document.getElementById('view_mobile_number').textContent = data.mobile_number;
                    document.getElementById('view_email').textContent = data.email || 'N/A';

                    document.getElementById('view_em_contact_name').textContent = data.em_contact_name;
                    document.getElementById('view_em_contact_number').textContent = data.em_contact_number;
                    document.getElementById('view_em_contact_address').textContent = data.em_contact_address;

                    document.getElementById('view_admission_id').textContent = data.admission_id;
                    document.getElementById('view_admission_date').textContent = admissionDate;
                    document.getElementById('view_discharge_date').textContent = dischargeDate;
                    document.getElementById('view_status').textContent = status;
                    document.getElementById('view_admitted_by').textContent = data.admitted_by || 'N/A';
                    document.getElementById('view_admission_reason').textContent = data.admission_reason;

                    // Store current admission details for printing
                    window.currentAdmissionDetail = data;

                    // Open modal
                    const modal = new bootstrap.Modal(document.getElementById('viewAdmissionModal'));
                    modal.show();
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Error: ' + response.data.message,
                        icon: 'error'
                    });
                }
            })
            .catch(function (error) {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'An error occurred while loading admission details.',
                    icon: 'error'
                });
            });
    }

    // Function to print admission list
    function printAdmissionList() {
        // Get current filtered admissions
        const currentAdmissions = [];
        document.querySelectorAll('#admission-list tr').forEach(function (row) {
            const columns = row.querySelectorAll('td');
            if (columns.length > 0) {
                currentAdmissions.push({
                    patientId: columns[0].textContent,
                    patientName: columns[1].textContent,
                    contact: columns[2].textContent,
                    admissionDate: columns[3].textContent,
                    dischargeDate: columns[4].textContent,
                    reason: columns[5].textContent,
                    status: columns[6].textContent
                });
            }
        });

        // Set print date
        document.getElementById('print_date').textContent = new Date().toLocaleString();

        // Create print table
        const printTable = document.getElementById('print_table');
        printTable.innerHTML = `
            <thead>
                <tr>
                    <th>Patient ID</th>
                    <th>Patient Name</th>
                    <th>Contact</th>
                    <th>Admission Date</th>
                    <th>Discharge Date</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${currentAdmissions.map(admission => `
                    <tr>
                        <td>${admission.patientId}</td>
                        <td>${admission.patientName}</td>
                        <td>${admission.contact}</td>
                        <td>${admission.admissionDate}</td>
                        <td>${admission.dischargeDate}</td>
                        <td>${admission.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        // Print the div
        const printContent = document.getElementById('printView').innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;

        // Reload the page to restore event listeners
        location.reload();
    }

    // Function to print admission detail
    function printAdmissionDetail() {
        if (!window.currentAdmissionDetail) return;

        const data = window.currentAdmissionDetail;

        // Format dates
        const birthdate = new Date(data.birthdate).toLocaleDateString();
        const admissionDate = new Date(data.admission_date).toLocaleDateString();
        const dischargeDate = data.discharge_date ? new Date(data.discharge_date).toLocaleDateString() : 'Not discharged';
        const status = data.status || (data.discharge_date ? 'Discharged' : 'Active');

        // Create print content
        const printContent = `
            <div class="container mt-4">
                <div class="text-center mb-4">
                    <h2>Hospital Billing System</h2>
                    <h3>Patient Admission Detail</h3>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <h5>Patient Information</h5>
                        <table class="table table-bordered">
                            <tr>
                                <th>Patient ID</th>
                                <td>${data.patient_id}</td>
                            </tr>
                            <tr>
                                <th>Name</th>
                                <td>${data.patient_lname}, ${data.patient_fname} ${data.patient_mname || ''}</td>
                            </tr>
                            <tr>
                                <th>Birthdate</th>
                                <td>${birthdate}</td>
                            </tr>
                            <tr>
                                <th>Address</th>
                                <td>${data.address}</td>
                            </tr>
                            <tr>
                                <th>Mobile</th>
                                <td>${data.mobile_number}</td>
                            </tr>
                            <tr>
                                <th>Email</th>
                                <td>${data.email || 'N/A'}</td>
                            </tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h5>Emergency Contact</h5>
                        <table class="table table-bordered">
                            <tr>
                                <th>Name</th>
                                <td>${data.em_contact_name}</td>
                            </tr>
                            <tr>
                                <th>Number</th>
                                <td>${data.em_contact_number}</td>
                            </tr>
                            <tr>
                                <th>Address</th>
                                <td>${data.em_contact_address}</td>
                            </tr>
                        </table>
                        
                        <h5 class="mt-3">Admission Details</h5>
                        <table class="table table-bordered">
                            <tr>
                                <th>Admission ID</th>
                                <td>${data.admission_id}</td>
                            </tr>
                            <tr>
                                <th>Admission Date</th>
                                <td>${admissionDate}</td>
                            </tr>
                            <tr>
                                <th>Discharge Date</th>
                                <td>${dischargeDate}</td>
                            </tr>
                            <tr>
                                <th>Status</th>
                                <td>${status}</td>
                            </tr>
                        </table>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-12">
                        <h5>Admission Reason</h5>
                        <div class="p-2 border rounded">${data.admission_reason}</div>
                    </div>
                </div>
            </div>
        `;

        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;

        // Reload the page to restore event listeners
        location.reload();
    }

    // Helper function to truncate text
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Check for permissions and render modules
    try {
        // Set welcome message regardless of permissions
        const welcomeMessage = document.getElementById('welcome-msg');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${user.full_name}`;
        }

        // Try to get permissions, but don't block functionality if it fails
        try {
            const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
                operation: 'getUserPermissions',
                json: JSON.stringify({ user_id: user.user_id })
            });

            const data = response.data;
            console.log('Permissions response: ', data);

            // Additional permission-based functionality can be added here
        } catch (permError) {
            console.warn('Could not load permissions, continuing with limited functionality', permError);
        }
    } catch (error) {
        console.error('Error in initialization: ', error);
    }
});
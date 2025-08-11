console.log('admission.js is working');

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

    // Load Sidebar
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');

    try {
        const sidebarResponse = await axios.get('../components/sidebar.html');
        sidebarPlaceholder.innerHTML = sidebarResponse.data;

        const sidebarElement = document.getElementById('sidebar');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const logoutBtn = document.getElementById('logout-btn');

        // Restore sidebar collapsed state
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebarElement.classList.add('collapsed');
        }

        hamburgerBtn.addEventListener('click', () => {
            sidebarElement.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebarElement.classList.contains('collapsed'));
        });

        // Log out Logic
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await axios.post(`${baseApiUrl}/logout.php`);
                    localStorage.removeItem('user');
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Logout failed: ', error);
                    alert('Logout failed. Please try again.');
                }
            });
        }

        // Load permissions and populate sidebar links
        try {
            const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
                operation: 'getUserPermissions',
                json: JSON.stringify({ user_id: user?.user_id })
            });
            const data = response.data;
            if (data.success) {
                renderModules(data.permissions);
            }
        } catch (permErr) {
            console.warn('Could not load permissions for sidebar', permErr);
        }
    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }

    // Sidebar modules renderer
    function renderModules(permissions) {
        const moduleMap = {
            'manage_users': { label: 'Manage Users', link: 'user-management.html' },
            'manage_roles': { label: 'Role Settings', link: 'role-settings.html' },
            'view_admissions': { label: 'Admission Records', link: 'admission-records.html' },
            'edit_admissions': { label: 'Admission Editor', link: 'admission-editor.html' },
            'access_billing': { label: 'Billing Overview', link: 'billing-overview.html' },
            'generate_invoice': { label: 'Invoice Generator', link: 'invoice-generator.html' },
            'view_patient_records': { label: 'Patient Records Viewer', link: 'patient-records.html' },
            'approve_insurance': { label: 'Insurance Approval Panel', link: 'insurance-approval.html' },
            'dashboard': { label: 'Dashboard', link: '../components/dashboard.html' }
        };

        const inventoryMap = {
            'manage_medicine': { label: 'Medicine Module', link: 'inv-medicine.html' },
            'manage_surgeries': { label: 'Surgical Module', link: 'inv-surgery.html' },
            'manage_labtests': { label: 'Laboratory Module', link: 'inv-labtest.html' },
            'manage_treatments': { label: 'Treatment Module', link: 'inv-treatments.html' },
            'manage_rooms': { label: 'Room Management', link: 'inv-rooms.html' },
        };

        const sidebarLinks = document.getElementById('sidebar-links');
        const accordionBody = document.querySelector('#invCollapse .accordion-body');

        permissions.forEach(permission => {
            if (moduleMap[permission]) {
                const { label, link } = moduleMap[permission];
                const a = document.createElement('a');
                a.href = link.startsWith('#') ? `../module/${link}` : link;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white');
                a.textContent = label;
                sidebarLinks.appendChild(a);
            }
        });

        let inventoryShown = false;
        permissions.forEach(permission => {
            if (inventoryMap[permission]) {
                inventoryShown = true;
                const { label, link } = inventoryMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white');
                a.textContent = label;
                accordionBody.appendChild(a);
            }
        });

        if (!inventoryShown) {
            const inventoryAccordionItem = document.querySelector('.accordion-item');
            if (inventoryAccordionItem) {
                inventoryAccordionItem.style.display = 'none';
            }
        }
    }

    // Local API URL for relative paths
    const localApiUrl = '../api/';
    
    // Get admission form elements
    const addAdmissionForm = document.getElementById('addAdmissionForm');
    const editAdmissionForm = document.getElementById('editAdmissionForm');
    
    // Load admissions on page load
    loadAdmissions();
    
    // Add event listener for form submission
    if (addAdmissionForm) {
        addAdmissionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                patient_fname: document.getElementById('patient_fname').value,
                patient_lname: document.getElementById('patient_lname').value,
                patient_mname: document.getElementById('patient_mname').value,
                birthdate: document.getElementById('birthdate').value,
                address: document.getElementById('address').value,
                mobile_number: document.getElementById('mobile_number').value,
                email: document.getElementById('email').value,
                em_contact_name: document.getElementById('em_contact_name').value,
                em_contact_number: document.getElementById('em_contact_number').value,
                em_contact_address: document.getElementById('em_contact_address').value,
                admission_date: document.getElementById('admission_date').value,
                discharge_date: document.getElementById('discharge_date').value || null,
                admission_reason: document.getElementById('admission_reason').value,
                status: document.getElementById('status').value
            };
            
            // Send data to server
            axios.post(localApiUrl + 'get-admissions.php', {
                operation: 'addAdmission',
                data: JSON.stringify(formData)
            })
            .then(function(response) {
                if (response.data.status === 'success') {
                    // Close modal and reload admissions
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addAdmissionModal'));
                    modal.hide();
                    addAdmissionForm.reset();
                    loadAdmissions();
                    alert('Admission added successfully!');
                } else {
                    alert('Error: ' + response.data.message);
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                alert('An error occurred while adding the admission.');
            });
        });
    }
    
    // Edit admission form submission
    if (editAdmissionForm) {
        editAdmissionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = {
                admission_id: document.getElementById('edit_admission_id').value,
                patient_id: document.getElementById('edit_patient_id').value,
                patient_fname: document.getElementById('edit_patient_fname').value,
                patient_lname: document.getElementById('edit_patient_lname').value,
                patient_mname: document.getElementById('edit_patient_mname').value,
                birthdate: document.getElementById('edit_birthdate').value,
                address: document.getElementById('edit_address').value,
                mobile_number: document.getElementById('edit_mobile_number').value,
                email: document.getElementById('edit_email').value,
                em_contact_name: document.getElementById('edit_em_contact_name').value,
                em_contact_number: document.getElementById('edit_em_contact_number').value,
                em_contact_address: document.getElementById('edit_em_contact_address').value,
                admission_date: document.getElementById('edit_admission_date').value,
                discharge_date: document.getElementById('edit_discharge_date').value || null,
                admission_reason: document.getElementById('edit_admission_reason').value,
                status: document.getElementById('edit_status').value
            };
            
            // Send data to server
            axios.post(localApiUrl + 'get-admissions.php', {
                operation: 'updateAdmission',
                data: JSON.stringify(formData)
            })
            .then(function(response) {
                if (response.data.status === 'success') {
                    // Close modal and reload admissions
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editAdmissionModal'));
                    modal.hide();
                    loadAdmissions();
                    alert('Admission updated successfully!');
                } else {
                    alert('Error: ' + response.data.message);
                }
            })
            .catch(function(error) {
                console.error('Error:', error);
                alert('An error occurred while updating the admission.');
            });
        });
    }
    
    // Function to load admissions
    function loadAdmissions() {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'getAdmissions'
        })
        .then(function(response) {
            if (response.data.status === 'success') {
                displayAdmissions(response.data.data);
            } else {
                console.error('Error:', response.data.message);
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
        });
    }
    
    // Function to display admissions in the table
    function displayAdmissions(admissions) {
        const admissionList = document.getElementById('admission-list');
        if (!admissionList) return;
        
        admissionList.innerHTML = '';
        
        if (admissions.length === 0) {
            admissionList.innerHTML = '<tr><td colspan="6" class="text-center">No admissions found</td></tr>';
            return;
        }
        
        admissions.forEach(function(admission) {
            const row = document.createElement('tr');
            
            // Format dates
            const admissionDate = new Date(admission.admission_date).toLocaleDateString();
            const dischargeDate = admission.discharge_date ? new Date(admission.discharge_date).toLocaleDateString() : 'Not discharged';
            
            // Get status from the data
            const status = admission.status || (admission.discharge_date ? 'Discharged' : 'Active');
            let statusClass = 'text-primary';
            
            // Set status class based on status value
            switch(status) {
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
                <td>${admission.patient_lname}, ${admission.patient_fname} ${admission.patient_mname || ''}</td>
                <td>${admissionDate}</td>
                <td>${dischargeDate}</td>
                <td>${admission.admission_reason}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${admission.admission_id}" data-patient-id="${admission.patient_id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${admission.admission_id}">Delete</button>
                </td>
            `;
            
            admissionList.appendChild(row);
        });
        
        // Add event listeners to edit buttons
        document.querySelectorAll('.edit-btn').forEach(function(button) {
            button.addEventListener('click', function() {
                const admissionId = this.getAttribute('data-id');
                const patientId = this.getAttribute('data-patient-id');
                loadAdmissionDetails(admissionId, patientId);
            });
        });
        
        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-btn').forEach(function(button) {
            button.addEventListener('click', function() {
                const admissionId = this.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this admission?')) {
                    deleteAdmission(admissionId);
                }
            });
        });
    }
    
    // Function to load admission details for editing
    function loadAdmissionDetails(admissionId, patientId) {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'getAdmissionDetails',
            admission_id: admissionId,
            patient_id: patientId
        })
        .then(function(response) {
            if (response.data.status === 'success') {
                const data = response.data.data;
                
                // Set form values
                document.getElementById('edit_admission_id').value = data.admission_id;
                document.getElementById('edit_patient_id').value = data.patient_id;
                document.getElementById('edit_patient_fname').value = data.patient_fname;
                document.getElementById('edit_patient_lname').value = data.patient_lname;
                document.getElementById('edit_patient_mname').value = data.patient_mname || '';
                document.getElementById('edit_birthdate').value = data.birthdate;
                document.getElementById('edit_address').value = data.address;
                document.getElementById('edit_mobile_number').value = data.mobile_number;
                document.getElementById('edit_email').value = data.email || '';
                document.getElementById('edit_em_contact_name').value = data.em_contact_name;
                document.getElementById('edit_em_contact_number').value = data.em_contact_number;
                document.getElementById('edit_em_contact_address').value = data.em_contact_address;
                document.getElementById('edit_admission_date').value = data.admission_date;
                document.getElementById('edit_discharge_date').value = data.discharge_date || '';
                document.getElementById('edit_admission_reason').value = data.admission_reason;
                document.getElementById('edit_status').value = data.status || 'Active';
                
                // Open modal
                const modal = new bootstrap.Modal(document.getElementById('editAdmissionModal'));
                modal.show();
            } else {
                alert('Error: ' + response.data.message);
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            alert('An error occurred while loading admission details.');
        });
    }
    
    // Function to delete admission
    function deleteAdmission(admissionId) {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'deleteAdmission',
            admission_id: admissionId
        })
        .then(function(response) {
            if (response.data.status === 'success') {
                loadAdmissions();
                alert('Admission deleted successfully!');
            } else {
                alert('Error: ' + response.data.message);
            }
        })
        .catch(function(error) {
            console.error('Error:', error);
            alert('An error occurred while deleting the admission.');
        });
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
console.log('user-management.js is working');

const baseApiUrl = `${window.location.origin}/hospital_billing/api`;

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure session cookies are sent for auth-protected endpoints
    if (window.axios) {
        axios.defaults.withCredentials = true;
    }
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            loadUsers(page);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            loadUsers(1, itemsPerPage);
        }
    });

    // Load users and roles
    loadUsers();
    loadRoles();

    // Setup role change listener for dynamic fields
    setupRoleChangeListener();

    // Event listeners for modals
    document.getElementById('saveUserBtn').addEventListener('click', addUser);
    document.getElementById('updateUserBtn').addEventListener('click', updateUser);

    // Password visibility toggle for modals
    function setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach((btn) => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                const input = document.getElementById(targetId);
                if (!input) return;
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';

                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-eye', !isPassword);
                    icon.classList.toggle('fa-eye-slash', isPassword);
                }
                btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
            });
        });
    }
    // Run once on load; also when modals show (in case DOM is recreated)
    setupPasswordToggles();
    document.getElementById('addUserModal').addEventListener('shown.bs.modal', setupPasswordToggles);
    document.getElementById('editUserModal').addEventListener('shown.bs.modal', setupPasswordToggles);

    // Setup role change listener for dynamic fields
    function setupRoleChangeListener() {
        const roleSelect = document.getElementById('roleId');
        if (roleSelect) {
            roleSelect.addEventListener('change', function () {
                loadRoleSpecificFields(this.value);
            });
        }

        // Also add listener for edit modal role select
        const editRoleSelect = document.getElementById('editRoleId');
        if (editRoleSelect) {
            editRoleSelect.addEventListener('change', function () {
                const roleSpecificContainer = document.getElementById('roleSpecificFields');
                if (roleSpecificContainer) {
                    roleSpecificContainer.innerHTML = '';
                    loadRoleSpecificFields(this.value);
                }
            });
        }
    }

    // Function to load role-specific fields dynamically
    async function loadRoleSpecificFields(roleId) {
        const roleSpecificContainer = document.getElementById('roleSpecificFields');
        if (!roleSpecificContainer) {
            console.warn('Role-specific fields container not found');
            return;
        }

        // Clear existing fields
        roleSpecificContainer.innerHTML = '';

        if (!roleId) return;

        // Role-specific field configurations
        const roleConfigs = {
            '2': { // Doctor
                title: 'DOCTOR INFORMATION',
                fields: [
                    { name: 'first_name', label: 'First Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'middle_name', label: 'Middle Name', type: 'text', required: false, colClass: 'col-md-3' },
                    { name: 'last_name', label: 'Last Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'suffix', label: 'Suffix (Optional)', type: 'text', required: false, colClass: 'col-md-3', placeholder: 'Jr., Sr., III' },
                    { name: 'license_number', label: 'License Number (Optional)', type: 'text', required: false, colClass: 'col-md-6' },
                    { name: 'specialty_id', label: 'Specialty', type: 'select', required: true, colClass: 'col-md-6', apiEndpoint: 'get-doctor-specialties.php' }
                ]
            },
            '4': { // Nurse
                title: 'NURSE INFORMATION',
                fields: [
                    { name: 'first_name', label: 'First Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'middle_name', label: 'Middle Name', type: 'text', required: false, colClass: 'col-md-3' },
                    { name: 'last_name', label: 'Last Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'suffix', label: 'Suffix (Optional)', type: 'text', required: false, colClass: 'col-md-3', placeholder: 'Jr., Sr., III' },
                    { name: 'license_number', label: 'License Number (Optional)', type: 'text', required: false, colClass: 'col-md-6' },
                    { name: 'department_id', label: 'Department', type: 'select', required: true, colClass: 'col-md-6', apiEndpoint: 'get-nurse-departments.php' }
                ]
            },
            '5': { // Lab Technician
                title: 'LAB TECHNICIAN INFORMATION',
                fields: [
                    { name: 'first_name', label: 'First Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'middle_name', label: 'Middle Name', type: 'text', required: false, colClass: 'col-md-3' },
                    { name: 'last_name', label: 'Last Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'suffix', label: 'Suffix (Optional)', type: 'text', required: false, colClass: 'col-md-3', placeholder: 'Jr., Sr., III' },
                    { name: 'license_number', label: 'License Number (Optional)', type: 'text', required: false, colClass: 'col-md-6' },
                    { name: 'department_id', label: 'Department', type: 'select', required: true, colClass: 'col-md-6', apiEndpoint: 'get-labtech-departments.php' }
                ]
            },
            '6': { // Pharmacist
                title: 'PHARMACIST INFORMATION',
                fields: [
                    { name: 'first_name', label: 'First Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'middle_name', label: 'Middle Name', type: 'text', required: false, colClass: 'col-md-3' },
                    { name: 'last_name', label: 'Last Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'suffix', label: 'Suffix (Optional)', type: 'text', required: false, colClass: 'col-md-3', placeholder: 'Jr., Sr., III' },
                    { name: 'license_number', label: 'License Number', type: 'text', required: false, colClass: 'col-md-6' }
                ]
            },
            '7': { // Therapist
                title: 'THERAPIST INFORMATION',
                fields: [
                    { name: 'first_name', label: 'First Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'middle_name', label: 'Middle Name', type: 'text', required: false, colClass: 'col-md-3' },
                    { name: 'last_name', label: 'Last Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'suffix', label: 'Suffix (Optional)', type: 'text', required: false, colClass: 'col-md-3', placeholder: 'Jr., Sr., III' },
                    { name: 'license_number', label: 'License Number (Optional)', type: 'text', required: false, colClass: 'col-md-6' },
                    { name: 'specialty_id', label: 'Specialty', type: 'select', required: false, colClass: 'col-md-6', apiEndpoint: 'get-therapist-specialties.php' }
                ]
            },
            '8': { // Cashier
                title: 'CASHIER INFORMATION',
                fields: [
                    { name: 'first_name', label: 'First Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'middle_name', label: 'Middle Name', type: 'text', required: false, colClass: 'col-md-3' },
                    { name: 'last_name', label: 'Last Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'suffix', label: 'Suffix (Optional)', type: 'text', required: false, colClass: 'col-md-3', placeholder: 'Jr., Sr., III' },
                    { name: 'employee_number', label: 'Employee Number (Optional)', type: 'text', required: false, colClass: 'col-md-6' }
                ]
            },
            '9': { // Billing Staff
                title: 'BILLING STAFF INFORMATION',
                fields: [
                    { name: 'first_name', label: 'First Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'middle_name', label: 'Middle Name', type: 'text', required: false, colClass: 'col-md-3' },
                    { name: 'last_name', label: 'Last Name', type: 'text', required: true, colClass: 'col-md-3' },
                    { name: 'suffix', label: 'Suffix (Optional)', type: 'text', required: false, colClass: 'col-md-3', placeholder: 'Jr., Sr., III' },
                    { name: 'employee_number', label: 'Employee Number (Optional)', type: 'text', required: false, colClass: 'col-md-6' }
                ]
            }
        };

        const config = roleConfigs[roleId];
        if (!config) return;

        // Create the form section
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'form-section role-specific-section active';
        sectionDiv.innerHTML = `
            <div class="form-section-title">${config.title}</div>
            <div id="roleFieldsContainer"></div>
        `;
        roleSpecificContainer.appendChild(sectionDiv);

        const fieldsContainer = document.getElementById('roleFieldsContainer');

        // Group fields into rows (4 fields per row for name fields, 2 for others)
        let currentRow = null;
        let fieldsInRow = 0;

        for (let i = 0; i < config.fields.length; i++) {
            const field = config.fields[i];

            // Start new row if needed
            if (!currentRow || fieldsInRow >= 4 || (fieldsInRow >= 2 && !field.name.includes('name') && !field.name.includes('suffix'))) {
                currentRow = document.createElement('div');
                currentRow.className = 'row mb-2';
                fieldsContainer.appendChild(currentRow);
                fieldsInRow = 0;
            }

            // Create field container
            const fieldDiv = document.createElement('div');
            fieldDiv.className = field.colClass;

            const fieldHtml = await createFieldHtml(field);
            fieldDiv.innerHTML = fieldHtml;

            currentRow.appendChild(fieldDiv);
            fieldsInRow++;
        }
    }

    // Function to create HTML for different field types
    async function createFieldHtml(field) {
        const requiredAttr = field.required ? 'required' : '';
        const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';

        if (field.type === 'select' && field.apiEndpoint) {
            // Load options from API
            const options = await loadSelectOptions(field.apiEndpoint);
            const optionsHtml = options.map(option =>
                `<option value="${option.id}">${option.name}</option>`
            ).join('');

            return `
                <div class="mb-2">
                    <label for="${field.name}" class="form-label">${field.label}</label>
                    <select class="form-control" id="${field.name}" ${requiredAttr}>
                        <option value="">-- Select ${field.label} --</option>
                        ${optionsHtml}
                    </select>
                </div>
            `;
        } else {
            return `
                <div class="mb-2">
                    <label for="${field.name}" class="form-label">${field.label}</label>
                    <input type="${field.type}" class="form-control" id="${field.name}" ${requiredAttr} ${placeholder}>
                </div>
            `;
        }
    }

    // Function to load select options from API
    async function loadSelectOptions(endpoint) {
        try {
            // Map endpoints to actual API calls
            const endpointMap = {
                'get-doctor-specialties.php': () => axios.get(`${baseApiUrl}/mf-types-php/get-doctor-specialties.php`),
                'get-nurse-departments.php': () => axios.get(`${baseApiUrl}/mf-types-php/get-nurse-departments.php`),
                'get-labtech-departments.php': () => axios.get(`${baseApiUrl}/mf-types-php/get-labtech-departments.php`),
                'get-therapist-specialties.php': () => axios.get(`${baseApiUrl}/mf-types-php/get-therapist-specialties.php`)
            };

            const apiCall = endpointMap[endpoint];
            if (!apiCall) {
                console.warn(`No API mapping found for endpoint: ${endpoint}`);
                return [];
            }

            const response = await apiCall();
            const data = response.data;

            if (data.success && data.data) {
                // Map the response data to a consistent format
                return data.data.map(item => ({
                    id: item.specialty_id || item.department_id || item.id,
                    name: item.specialty_name || item.department_name || item.name
                }));
            }

            return [];
        } catch (error) {
            console.error(`Error loading options for ${endpoint}:`, error);
            return [];
        }
    }

    // Function to load all users
    async function loadUsers(page = 1, itemsPerPage = 10, search = '') {
        try {
            const response = await axios.get(`${baseApiUrl}/manage-users.php`, {
                params: {
                    operation: 'getAllUsers',
                    page: page,
                    itemsPerPage: itemsPerPage,
                    search: search
                }
            });
            const data = response.data;
            if (data.success) {
                displayUsers(data.users);

                // Update pagination controls
                if (data.pagination) {
                    pagination.calculatePagination(data.pagination.totalItems, data.pagination.currentPage, data.pagination.itemsPerPage);
                    pagination.generatePaginationControls('pagination-container');
                }
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to load users: ' + data.message,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error loading users:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to load users. Please try again.',
                icon: 'error'
            });
        }
    }

    // Function to display users in the table
    function displayUsers(users) {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            const fn = user.first_name || '';
            const mn = user.middle_name || '';
            const ln = user.last_name || '';
            const hasName = (fn && ln) || (fn || ln);
            const displayName = hasName
                ? `${fn}${mn ? ' ' + mn : ''}${ln ? ' ' + ln : ''}`.trim()
                : user.username;
            // Create status badge
            const statusBadge = user.status === 1
                ? '<span class="badge bg-success">Active</span>'
                : '<span class="badge bg-danger">Inactive</span>';

            row.innerHTML = `
                <td>${displayName}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${user.role_name}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-user-btn" data-user='${JSON.stringify(user)}'>
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', () => {
                const userData = JSON.parse(button.dataset.user);
                loadUserDetails(userData);
            });
        });
    }

    // Function to load roles for dropdowns
    async function loadRoles() {
        try {
            const response = await axios.get(`${baseApiUrl}/manage-roles.php?operation=getRoles`);
            const data = response.data;
            if (data.success) {
                populateRoleDropdowns(data.roles);
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to load roles: ' + data.message,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to load roles. Please try again.',
                icon: 'error'
            });
        }
    }

    // Function to populate role dropdowns in add and edit modals
    function populateRoleDropdowns(roles) {
        const addRoleSelect = document.getElementById('roleId');
        const editRoleSelect = document.getElementById('editRoleId');

        // Clear existing options
        addRoleSelect.innerHTML = '<option value="">Select a role</option>';
        editRoleSelect.innerHTML = '<option value="">Select a role</option>';

        // Add role options
        roles.forEach(role => {
            const addOption = document.createElement('option');
            addOption.value = role.role_id;
            addOption.textContent = role.role_name;
            addRoleSelect.appendChild(addOption);

            const editOption = document.createElement('option');
            editOption.value = role.role_id;
            editOption.textContent = role.role_name;
            editRoleSelect.appendChild(editOption);
        });
    }

    // Function to load user details for editing
    async function loadUserDetails(user) {
        try {
            // First, ensure the edit modal exists and is properly loaded
            const editModal = document.getElementById('editUserModal');
            if (!editModal) {
                console.error('Edit modal not found');
                Swal.fire({
                    title: 'Error',
                    text: 'Edit modal not found. Please refresh the page and try again.',
                    icon: 'error'
                });
                return;
            }

            // Show the modal first to ensure all elements are rendered
            const modal = new bootstrap.Modal(editModal);
            modal.show();

            // Wait for the modal to be fully shown before accessing elements
            editModal.addEventListener('shown.bs.modal', async function onModalShown() {
                try {
                    // Remove the event listener to prevent multiple executions
                    editModal.removeEventListener('shown.bs.modal', onModalShown);

                    // Check if all required form elements exist
                    const requiredElements = [
                        'editUserId', 'editFirstName', 'editMiddleName', 'editLastName',
                        'editSuffix', 'editUsername', 'editPassword', 'editEmail',
                        'editMobileNumber', 'editRoleId', 'edit_status'
                    ];

                    const missingElements = requiredElements.filter(id => !document.getElementById(id));
                    if (missingElements.length > 0) {
                        console.error('Missing form elements:', missingElements);
                        Swal.fire({
                            title: 'Error',
                            text: 'Form elements not found. Please refresh the page and try again.',
                            icon: 'error'
                        });
                        modal.hide();
                        return;
                    }

                    // Populate the edit form with user data
                    document.getElementById('editUserId').value = user.user_id;
                    document.getElementById('editFirstName').value = user.first_name || '';
                    document.getElementById('editMiddleName').value = user.middle_name || '';
                    document.getElementById('editLastName').value = user.last_name || '';
                    document.getElementById('editSuffix').value = user.suffix || '';
                    document.getElementById('editUsername').value = user.username;
                    document.getElementById('editPassword').value = '';
                    document.getElementById('editEmail').value = user.email || '';
                    document.getElementById('editMobileNumber').value = user.mobile_number || '';
                    document.getElementById('editRoleId').value = user.role_id;
                    document.getElementById('edit_status').value = user.status || 1;

                    // Clear existing role-specific fields and load new ones
                    const roleSpecificContainer = document.getElementById('roleSpecificFields');
                    if (roleSpecificContainer) {
                        roleSpecificContainer.innerHTML = '';
                        // Load role-specific fields for the current role
                        await loadRoleSpecificFields(user.role_id);

                        // Populate role-specific fields with existing values after a short delay
                        // to ensure DOM elements are fully rendered
                        setTimeout(() => {
                            populateRoleSpecificFields(user);
                        }, 200);
                    }

                } catch (error) {
                    console.error('Error in modal shown event:', error);
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to load user details. Please try again.',
                        icon: 'error'
                    });
                    modal.hide();
                }
            }, { once: true });

        } catch (error) {
            console.error('Error loading user details:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to load user details. Please try again.',
                icon: 'error'
            });
        }
    }

    // Function to populate role-specific fields with existing values
    function populateRoleSpecificFields(user) {
        const roleSpecificFields = document.querySelectorAll('#roleSpecificFields input, #roleSpecificFields select');
        if (roleSpecificFields.length === 0) {
            console.warn('No role-specific fields found to populate');
            return;
        }

        roleSpecificFields.forEach(field => {
            const fieldName = field.id;
            if (user[fieldName] !== undefined && user[fieldName] !== null && user[fieldName] !== '') {
                field.value = user[fieldName];
            }
        });
    }

    // Function to add a new user
    async function addUser() {
        // Collect authentication data
        const formData = {
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value,
            email: document.getElementById('email').value.trim(),
            mobile_number: document.getElementById('mobileNumber').value.trim(),
            role_id: document.getElementById('roleId').value
        };

        // Collect role-specific data
        const roleSpecificData = {};
        const roleSpecificFields = document.querySelectorAll('#roleSpecificFields input, #roleSpecificFields select');
        roleSpecificFields.forEach(field => {
            // Include all fields, even if empty, to ensure backend receives expected data structure
            roleSpecificData[field.id] = field.value.trim();
        });

        // Combine all form data
        const completeFormData = { ...formData, ...roleSpecificData };

        // Validate required authentication fields (email and mobile are now optional)
        if (!formData.username || !formData.password || !formData.role_id) {
            Swal.fire({
                title: 'Validation',
                text: 'Please fill in username, password and role.',
                icon: 'warning'
            });
            return;
        }

        // Validate role-specific required fields
        const requiredRoleFields = document.querySelectorAll('#roleSpecificFields input[required], #roleSpecificFields select[required]');
        for (let field of requiredRoleFields) {
            if (!field.value.trim()) {
                Swal.fire({
                    title: 'Validation',
                    text: `Please fill in the required field: ${field.previousElementSibling.textContent}`,
                    icon: 'warning'
                });
                return;
            }
        }

        try {
            const response = await axios.post(`${baseApiUrl}/manage-users.php`, {
                operation: 'addUser',
                json: JSON.stringify(completeFormData)
            });
            const data = response.data || {};
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'User added successfully!',
                    icon: 'success'
                });
                document.getElementById('addUserForm').reset();
                document.getElementById('roleSpecificFields').innerHTML = ''; // Clear dynamic fields
                bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
                loadUsers();
            } else {
                const msg = typeof data.message === 'string' && data.message.trim() !== '' ? data.message : 'Unknown error occurred.';
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to add user: ' + msg,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding user:', error);
            console.error('Full error details:', error.response);

            let errorMessage = 'Failed to add user. Please try again.';
            if (error.response) {
                const { status, data } = error.response;
                if (data) {
                    if (typeof data === 'string') {
                        errorMessage = `Failed to add user: ${data}`;
                    } else if (typeof data.message === 'string' && data.message.trim() !== '') {
                        errorMessage = `Failed to add user: ${data.message}`;
                    } else {
                        // Fallback to a compact JSON of the response body
                        try {
                            errorMessage = `Failed to add user: ${JSON.stringify(data)}`;
                        } catch (_) {
                            errorMessage = `Failed to add user (status ${status}).`;
                        }
                    }
                } else {
                    errorMessage = `Failed to add user (status ${status}).`;
                }
            } else if (error.message) {
                errorMessage = 'Failed to add user: ' + error.message;
            }

            Swal.fire({
                title: 'Error',
                text: errorMessage,
                icon: 'error'
            });
        }
    }

    // Function to update a user
    async function updateUser() {
        const userId = document.getElementById('editUserId').value;
        const formData = {
            user_id: userId,
            first_name: document.getElementById('editFirstName').value.trim(),
            middle_name: document.getElementById('editMiddleName').value.trim(),
            last_name: document.getElementById('editLastName').value.trim(),
            suffix: document.getElementById('editSuffix').value.trim(),
            username: document.getElementById('editUsername').value.trim(),
            password: document.getElementById('editPassword').value,
            email: document.getElementById('editEmail').value.trim(),
            mobile_number: document.getElementById('editMobileNumber').value.trim(),
            role_id: document.getElementById('editRoleId').value,
            status: document.getElementById('edit_status').value
        };

        // Collect role-specific data
        const roleSpecificData = {};
        const roleSpecificFields = document.querySelectorAll('#roleSpecificFields input, #roleSpecificFields select');
        console.log('Found role-specific fields:', roleSpecificFields.length);
        roleSpecificFields.forEach(field => {
            // Include all fields, even if empty, to ensure backend receives expected data structure
            roleSpecificData[field.id] = field.value.trim();
            console.log(`Field ${field.id}: ${field.value.trim()}`);
        });

        // Combine all form data
        const completeFormData = { ...formData, ...roleSpecificData };
        console.log('Complete form data being sent:', completeFormData);

        // Validate basic required fields
        if (!formData.username || !formData.role_id || !formData.first_name || !formData.last_name) {
            Swal.fire({
                title: 'Validation',
                text: 'Please fill in username, role, first name, and last name.',
                icon: 'warning'
            });
            return;
        }

        // Validate role-specific required fields
        const requiredRoleFields = document.querySelectorAll('#roleSpecificFields input[required], #roleSpecificFields select[required]');
        for (let field of requiredRoleFields) {
            if (!field.value.trim()) {
                Swal.fire({
                    title: 'Validation',
                    text: `Please fill in the required field: ${field.previousElementSibling.textContent}`,
                    icon: 'warning'
                });
                return;
            }
        }

        try {
            const response = await axios.post(`${baseApiUrl}/manage-users.php`, {
                operation: 'updateUser',
                json: JSON.stringify(completeFormData)
            });
            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'User updated successfully!',
                    icon: 'success'
                });
                bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
                loadUsers();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to update user: ' + data.message,
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating user:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to update user. Please try again.',
                icon: 'error'
            });
        }
    }
});
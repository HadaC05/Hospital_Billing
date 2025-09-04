console.log('connected to manage-users.js');

const baseApiUrl = `${window.location.origin}/hospital_billing/api`;

document.addEventListener('DOMContentLoaded', async () => {

    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // management functionality 
    const tableBody = document.getElementById('users-list');
    let allUsers = [];

    // dynamic adding of forms based on roles
    const roleSelect = document.getElementById('role_id');
    const roleSpecificFieldsContainer = document.querySelector('.roleSpecificFields');

    roleSelect.addEventListener('change', renderRoleSpecificFields);


    // modals
    const addModal = new bootstrap.Modal(document.getElementById('addUserModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editUserModal'));

    // forms
    const addForm = document.getElementById('addUserForm');
    const editForm = document.getElementById('editUserForm');

    // button event listeners
    document.getElementById('saveUserBtn').addEventListener('click', (e) => {
        if (!addForm.checkValidity()) {
            addForm.reportValidity();
            return;
        }
        saveUser();
    });
    document.getElementById('updateUserBtn').addEventListener('click', updateUser);


    // load specialties/departments

    // fetch users
    async function loadAllUsers() {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="6">Loading users...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/manage-users.php`, {
                params: { operation: 'getUsers' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.users)) {
                allUsers = data.users;
                renderAllUsers(allUsers);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading users: ', error);
            tableBody.innerHTML = '<tr><td colspan="5">Failed to load users</td></tr>';
        }
    }

    // render users
    function renderAllUsers(users) {

        if (!users.length) {
            tableBody.innerHTML = `<tr><td colspan="5">No useres found</td></tr>`;
            return;
        }

        tableBody.innerHTML = users.map(user => {
            const fullname = user.role_name === 'Admin' ? 'System Administrator' : [user.first_name, user.middle_name, user.last_name, user.suffix]
                .filter(Boolean)
                .join(' ');

            const statusLabel = user.status == 1 ? 'Active' : 'Inactive';
            const statusBadge = user.status == 1 ? 'badge bg-success' : 'badge bg-secondary';

            return `
                <tr>
                    <td>${fullname}</td>
                    <td>${user.username}</td>
                    <td>${user.role_name}</td>
                    <td><span class="${statusBadge}">${statusLabel}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.user_id})" title="Edit">
                        <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // add new user
    async function saveUser() {
        const formData = new FormData(addForm);
        const roleId = formData.get('role_id');

        let payload = {
            operation: 'addUser',
            json: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password'),
                email: formData.get('email'),
                mobile_number: formData.get('mobile_number'),
                role_id: roleId
            })
        };

        // Role Specific Fields
        const roleSpecific = {
            first_name: formData.get('first_name'),
            middle_name: formData.get('middle_name'),
            last_name: formData.get('last_name'),
            suffix: formData.get('suffix'),
        };
        switch (roleId) {
            // Doctor && Therapist
            case '2':
            case '7':
                roleSpecific.license_number = formData.get('license_number');
                roleSpecific.specialty_id = formData.get('specialty_id');
                break;

            case '4': // Nurse
            case '5': // Lab Tech
                roleSpecific.license_number = formData.get('license_number');
                roleSpecific.department_id = formData.get('department_id');
                break;

            case '6': // Pharmacist
                roleSpecific.license_number = formData.get('license_number');
                break;

            case '8': // Cashier
            case '9': // Billing Officer
                roleSpecific.employee_number = formData.get('employee_number');
                break;
        }

        payload.json = JSON.stringify({
            ...JSON.parse(payload.json),
            ...roleSpecific
        });

        // 🔍 Debugging logs
        console.group("🚀 Save User Debug");
        console.log("Final Payload Sent to Backend:", JSON.parse(payload.json));
        console.groupEnd();

        try {
            const response = await axios.post(`${baseApiUrl}/manage-users.php`, payload);

            // 🔍 Backend response log
            console.group("📥 Backend Response");
            console.log(response.data);
            console.groupEnd();

            const data = response.data;

            if (data.success) {
                alert('User created successfully');
                addModal.hide();
                addForm.reset();
                await loadAllUsers();
            } else {
                console.error("❌ Backend Error:", data.message);
                alert(data.message || 'Failed to create user');
            }
        } catch (err) {
            console.error('Error saving user: ', err);
            alert('Server error while saving user');
        }
    }

    // render role specific fields
    function renderRoleSpecificFields() {
        const roleId = roleSelect.value;
        const roleSpecificFieldsContainer = document.getElementById("roleSpecificFields");
        roleSpecificFieldsContainer.innerHTML = '';

        if (!roleId) return;

        let fields = '';

        switch (roleId) {
            case '2': // Doctor
            case '7':
                fields = `
                <div class="form-section">
                    <div class="form-section-title">${roleId === '2' ? 'DOCTOR' : 'THERAPIST'} DETAILS</div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Middle Name</label>
                            <input type="text" class="form-control" name="middle_name">
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Suffix</label>
                            <input type="text" class="form-control" name="suffix">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">License #</label>
                            <input type="text" class="form-control" name="license_number" required>
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Specialty</label>
                        <select class="form-select" name="specialty_id" required>
                            <option value="">-- Select Specialty --</option>
                        </select>
                    </div>
                </div>`;
                break;

            case '4': // Nurse
            case '5': // Lab Tech
                fields = `
                <div class="form-section">
                    <div class="form-section-title">${roleId === '4' ? 'NURSE' : 'LAB TECHNICIAN'} DETAILS</div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Middle Name</label>
                            <input type="text" class="form-control" name="middle_name">
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Suffix</label>
                            <input type="text" class="form-control" name="suffix">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">License #</label>
                            <input type="text" class="form-control" name="license_number" required>
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Department</label>
                            <select class="form-select" name="department_id" required>
                                <option value="">-- Select Department --</option>
                            </select>
                    </div>
                </div>`;
                break;

            case '6': // Pharmacist
                fields = `
                <div class="form-section">
                    <div class="form-section-title">PHARMACIST DETAILS</div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Middle Name</label>
                            <input type="text" class="form-control" name="middle_name">
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Suffix</label>
                            <input type="text" class="form-control" name="suffix">
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">License #</label>
                        <input type="text" class="form-control" name="license_number" required>
                    </div>
                </div>`;
                break;

            case '8': // Cashier
            case '9': // Billing Officer
                fields = `
                <div class="form-section">
                    <div class="form-section-title">${roleId === '8' ? 'CASHIER' : 'BILLING OFFICER'} DETAILS</div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Middle Name</label>
                            <input type="text" class="form-control" name="middle_name">
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Suffix</label>
                            <input type="text" class="form-control" name="suffix">
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Employee #</label>
                        <input type="text" class="form-control" name="employee_number" required>
                    </div>
                </div>`;
                break;
        }
        // Inject fields 
        roleSpecificFieldsContainer.innerHTML = fields;

        const specialtySelect = roleSpecificFieldsContainer.querySelector('select[name="specialty_id"]');
        const departmentSelect = roleSpecificFieldsContainer.querySelector('select[name="department_id"]');

        // Call loaders with the right select element
        if (roleId === '2' && specialtySelect) {
            loadDoctorSpecialties(specialtySelect);
        }
        if (roleId === '7' && specialtySelect) {
            loadTherapistSpecialties(specialtySelect);
        }
        if (roleId === '4' && departmentSelect) {
            loadNurseDepartments(departmentSelect);
        }
        if (roleId === '5' && departmentSelect) {
            loadLabtechDepartments(departmentSelect);
        }
    }

    // Load Doctor Specialty
    async function loadDoctorSpecialties(selectEl) {
        try {
            const response = await axios.get(`${baseApiUrl}/mf-types-php/get-doctor-specialties.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;
            if (data.success) {
                selectEl.innerHTML = ['<option value="">-- Select Specialty --</option>',
                    ...data.types.map(sp => `<option value="${sp.specialty_id}">${sp.specialty_name}</option>`)
                ].join('');
            }
        } catch (err) {
            console.error('Error loading doctor specialties', err);
        }
    }

    // Load Therapist Specialties
    async function loadTherapistSpecialties(selectEl) {
        try {
            const response = await axios.get(`${baseApiUrl}/mf-types-php/get-therapist-specialties.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;
            if (data.success) {
                selectEl.innerHTML = ['<option value="">-- Select Specialty --</option>',
                    ...data.types.map(sp => `<option value="${sp.specialty_id}">${sp.specialty_name}</option>`)
                ].join('');
            }
        } catch (err) {
            console.error('Error loading therapist specialties', err);
        }
    }

    // Load Nurse Departments
    async function loadNurseDepartments(selectEl) {
        try {
            const response = await axios.get(`${baseApiUrl}/mf-types-php/get-nurse-departments.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;

            if (data.success) {
                selectEl.innerHTML = ['<option value="">-- Select Department --</option>',
                    ...data.types.map(dep => `<option value="${dep.department_id}">${dep.department_name}</option>`)
                ].join('');
            }
        } catch (err) {
            console.error('Error loading nurse departments', err);
        }
    }

    // Load Lab technician departments
    async function loadLabtechDepartments(selectEl) {
        try {
            const response = await axios.get(`${baseApiUrl}/mf-types-php/get-labtech-departments.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;

            if (data.success) {
                selectEl.innerHTML = ['<option value="">-- Select Department --</option>',
                    ...data.types.map(dep => `<option value="${dep.department_id}">${dep.department_name}</option>`)
                ].join('');
            }
        } catch (err) {
            console.error('Error loading labtech departments', err);
        }
    }

    // Render edit role specific fields
    function renderEditRoleSpecificFields(roleId, user) {
        const container = document.getElementById("editRoleSpecificFields");
        container.innerHTML = ""; // reset

        let fields = "";

        switch (roleId) {
            case "2": // Doctor
            case "7": // Therapist
                fields = `
            <div class="form-section">
                <div class="form-section-title">${roleId === "2" ? "DOCTOR" : "THERAPIST"} DETAILS</div>
                <div class="row mb-2">
                    <div class="col-md-6">
                        <label class="form-label">First Name</label>
                        <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Middle Name</label>
                        <input type="text" class="form-control" name="middle_name" value="${user.middle_name || ""}">
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-md-6">
                        <label class="form-label">Last Name</label>
                        <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">Suffix</label>
                        <input type="text" class="form-control" name="suffix" value="${user.suffix || ""}">
                    </div>
                    <div class="col-md-3">
                        <label class="form-label">License #</label>
                        <input type="text" class="form-control" name="license_number" value="${user.license_number || ""}" required>
                    </div>
                </div>
                <div class="mb-2">
                    <label class="form-label">Specialty</label>
                    <select class="form-select" name="specialty_id" required>
                        <option value="">-- Select Specialty --</option>
                    </select>
                </div>
            </div>`;
                break;

            case "4": // Nurse
            case "5": // Lab Tech
                fields = `
            <div class="form-section">
                <div class="form-section-title">${roleId === "4" ? "NURSE" : "LAB TECHNICIAN"} DETAILS</div>
                <div class="row mb-2">
                    <div class="col-md-6">
                        <label class="form-label">First Name</label>
                        <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Last Name</label>
                        <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                    </div>
                </div>
                <div class="row mb-2">
                    <div class="col-md-6">
                        <label class="form-label">License #</label>
                        <input type="text" class="form-control" name="license_number" value="${user.license_number || ""}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Department</label>
                        <select class="form-select" name="department_id" required>
                            <option value="">-- Select Department --</option>
                        </select>
                    </div>
                </div>
            </div>`;
                break;

            case "6": // Pharmacist
                fields = `
            <div class="form-section">
                <div class="form-section-title">PHARMACIST DETAILS</div>
                <div class="mb-2">
                    <label class="form-label">First Name</label>
                    <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                </div>
                <div class="mb-2">
                    <label class="form-label">Last Name</label>
                    <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                </div>
                <div class="mb-2">
                    <label class="form-label">License #</label>
                    <input type="text" class="form-control" name="license_number" value="${user.license_number || ""}" required>
                </div>
            </div>`;
                break;

            case "8": // Cashier
            case "9": // Billing Officer
                fields = `
            <div class="form-section">
                <div class="form-section-title">${roleId === "8" ? "CASHIER" : "BILLING OFFICER"} DETAILS</div>
                <div class="row mb-2">
                    <div class="col-md-6">
                        <label class="form-label">First Name</label>
                        <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Last Name</label>
                        <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                    </div>
                </div>
                <div class="mb-2">
                    <label class="form-label">Employee #</label>
                    <input type="text" class="form-control" name="employee_number" value="${user.employee_number || ""}" required>
                </div>
            </div>`;
                break;
        }

        container.innerHTML = fields;

        // Load dropdowns after injecting fields
        if (roleId === "2") {
            const selectEl = container.querySelector('select[name="specialty_id"]');
            loadDoctorSpecialties(selectEl).then(() => {
                if (user.specialty_id) selectEl.value = user.specialty_id;
            });
        }
        if (roleId === "7") {
            const selectEl = container.querySelector('select[name="specialty_id"]');
            loadTherapistSpecialties(selectEl).then(() => {
                if (user.specialty_id) selectEl.value = user.specialty_id;
            });
        }
        if (roleId === "4") {
            const selectEl = container.querySelector('select[name="department_id"]');
            loadNurseDepartments(selectEl).then(() => {
                if (user.department_id) selectEl.value = user.department_id;
            });
        }
        if (roleId === "5") {
            const selectEl = container.querySelector('select[name="department_id"]');
            loadLabtechDepartments(selectEl).then(() => {
                if (user.department_id) selectEl.value = user.department_id;
            });
        }
    }


    // Edit User
    window.editUser = async function (userId) {
        const user = allUsers.find(u => u.user_id == userId);
        if (!user) return;

        // Fill hidden field
        document.getElementById("edit_user_id").value = user.user_id;

        // Authentication details
        document.getElementById("edit_username").value = user.username || "";
        document.getElementById("edit_password").value = "";
        document.getElementById("edit_email").value = user.email || "";
        document.getElementById("edit_mobile_number").value = user.mobile_number || "";

        const statusSelect = document.getElementById("edit_status");
        if (statusSelect) {
            statusSelect.value = user.status;
        }

        // Render role-specific fields
        const roleSpecificFieldsContainer = document.getElementById("editRoleSpecificFields");
        roleSpecificFieldsContainer.innerHTML = "";

        let fields = "";

        switch (user.role_id) {
            case "2": // Doctor
            case "7": // Therapist
                fields = `
                <div class="form-section">
                    <div class="form-section-title">${user.role_id === "2" ? "DOCTOR" : "THERAPIST"} DETAILS</div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Middle Name</label>
                            <input type="text" class="form-control" name="middle_name" value="${user.middle_name || ""}">
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Suffix</label>
                            <input type="text" class="form-control" name="suffix" value="${user.suffix || ""}">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">License #</label>
                            <input type="text" class="form-control" name="license_number" value="${user.license_number || ""}" required>
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Specialty</label>
                        <select class="form-select" name="specialty_id" required>
                            <option value="">-- Select Specialty --</option>
                        </select>
                    </div>
                </div>`;
                break;

            case "4": // Nurse
            case "5": // Lab Tech
                fields = `
                <div class="form-section">
                    <div class="form-section-title">${user.role_id === "4" ? "NURSE" : "LAB TECHNICIAN"} DETAILS</div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                        </div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">License #</label>
                            <input type="text" class="form-control" name="license_number" value="${user.license_number || ""}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Department</label>
                            <select class="form-select" name="department_id" required>
                                <option value="">-- Select Department --</option>
                            </select>
                        </div>
                    </div>
                </div>`;
                break;

            case "6": // Pharmacist
                fields = `
                <div class="form-section">
                    <div class="form-section-title">PHARMACIST DETAILS</div>
                    <div class="mb-2">
                        <label class="form-label">First Name</label>
                        <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Last Name</label>
                        <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">License #</label>
                        <input type="text" class="form-control" name="license_number" value="${user.license_number || ""}" required>
                    </div>
                </div>`;
                break;

            case "8": // Cashier
            case "9": // Billing Officer
                fields = `
                <div class="form-section">
                    <div class="form-section-title">${user.role_id === "8" ? "CASHIER" : "BILLING OFFICER"} DETAILS</div>
                    <div class="row mb-2">
                        <div class="col-md-6">
                            <label class="form-label">First Name</label>
                            <input type="text" class="form-control" name="first_name" value="${user.first_name || ""}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Last Name</label>
                            <input type="text" class="form-control" name="last_name" value="${user.last_name || ""}" required>
                        </div>
                    </div>
                    <div class="mb-2">
                        <label class="form-label">Employee #</label>
                        <input type="text" class="form-control" name="employee_number" value="${user.employee_number || ""}" required>
                    </div>
                </div>`;
                break;
        }

        // Render role-specific fields with prefilled values
        renderEditRoleSpecificFields(String(user.role_id), user);

        // Finally show the modal
        editModal.show();
    }

    // Update User
    async function updateUser() {
        const formData = new FormData(editForm);
        const userId = document.getElementById("edit_user_id").value;


        // Base payload (auth + common fields)
        let payload = {
            operation: "updateUser",
            json: JSON.stringify({
                user_id: userId,
                username: formData.get("edit_username"),
                password: formData.get("edit_password") || null,
                email: formData.get("edit_email") || null,
                mobile_number: formData.get("edit_mobile_number") || null,
                status: formData.get("edit_status")
            })
        };

        const roleId = allUsers.find(u => u.user_id == userId)?.role_id;
        // Role-specific fields
        const roleSpecific = {
            first_name: formData.get("first_name"),
            middle_name: formData.get("middle_name"),
            last_name: formData.get("last_name"),
            suffix: formData.get("suffix")
        };

        switch (roleId) {
            case "2": // Doctor
            case "7": // Therapist
                roleSpecific.license_number = formData.get("license_number");
                const specialtyId = formData.get("specialty_id");
                if (specialtyId) roleSpecific.specialty_id = specialtyId;
                break;

            case "4": // Nurse
            case "5": // Lab Tech
                roleSpecific.license_number = formData.get("license_number");
                const deptId = formData.get("department_id");
                if (deptId) roleSpecific.department_id = deptId;
                break;

            case "6": // Pharmacist
                roleSpecific.license_number = formData.get("license_number");
                break;

            case "8": // Cashier
            case "9": // Billing Officer
                roleSpecific.employee_number = formData.get("employee_number");
                break;
        }

        // Merge into payload
        payload.json = JSON.stringify({
            ...JSON.parse(payload.json),
            role_id: roleId,
            ...roleSpecific
        });

        try {
            const response = await axios.post(`${baseApiUrl}/manage-users.php`, payload);
            const data = response.data;

            if (data.success) {
                alert("User updated successfully");
                editModal.hide();
                await loadAllUsers();
            } else {
                console.error("Update failed:", data);
                alert(data.message || "Failed to update user");
            }
        } catch (err) {
            console.error("Error updating user:", err);
            alert("Server error while updating user");
        }
    }


    // update existing user -- how it's stored in the database

    await loadAllUsers();
});
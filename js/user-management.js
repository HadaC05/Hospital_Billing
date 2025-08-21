console.log('user-management.js is working');
document.addEventListener('DOMContentLoaded', async () => {
    const baseApiUrl = `${window.location.origin}/hospital_billing/api`;
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Load users and roles
    loadUsers();
    loadRoles();

    // Event listeners for modals
    document.getElementById('saveUserBtn').addEventListener('click', addUser);
    document.getElementById('updateUserBtn').addEventListener('click', updateUser);
    document.getElementById('confirmDeleteUserBtn').addEventListener('click', deleteUser);

    // Function to load all users
    async function loadUsers() {
        try {
            const response = await axios.get(`${baseApiUrl}/manage-users.php?operation=getAllUsers`);
            const data = response.data;
            if (data.success) {
                displayUsers(data.users);
            } else {
                alert('Failed to load users: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading users:', error);
            alert('Failed to load users. Please try again.');
        }
    }

    // Function to display users in the table
    function displayUsers(users) {
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td>${user.role_name}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary edit-user-btn" data-user-id="${user.user_id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-user-btn" data-user-id="${user.user_id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', () => loadUserDetails(button.dataset.userId));
        });

        document.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', () => {
                document.getElementById('confirmDeleteUserBtn').dataset.userId = button.dataset.userId;
                new bootstrap.Modal(document.getElementById('deleteUserModal')).show();
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
                alert('Failed to load roles: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            alert('Failed to load roles. Please try again.');
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
    async function loadUserDetails(userId) {
        try {
            const response = await axios.get(`${baseApiUrl}/manage-users.php?operation=getUserById&json=${JSON.stringify({ user_id: userId })}`);
            const data = response.data;
            if (data.success) {
                const user = data.user;
                document.getElementById('editUserId').value = user.user_id;
                document.getElementById('editFirstName').value = user.first_name;
                document.getElementById('editMiddleName').value = user.middle_name || '';
                document.getElementById('editLastName').value = user.last_name;
                document.getElementById('editUsername').value = user.username;
                document.getElementById('editPassword').value = '';
                document.getElementById('editEmail').value = user.email || '';
                document.getElementById('editMobileNumber').value = user.mobile_number || '';
                document.getElementById('editRoleId').value = user.role_id;

                // Open edit modal
                new bootstrap.Modal(document.getElementById('editUserModal')).show();
            } else {
                alert('Failed to load user details: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading user details:', error);
            alert('Failed to load user details. Please try again.');
        }
    }

    // Function to add a new user
    async function addUser() {
        const formData = {
            first_name: document.getElementById('firstName').value.trim(),
            middle_name: document.getElementById('middleName').value.trim(),
            last_name: document.getElementById('lastName').value.trim(),
            username: document.getElementById('username').value.trim(),
            password: document.getElementById('password').value,
            email: document.getElementById('email').value.trim(),
            mobile_number: document.getElementById('mobileNumber').value.trim(),
            role_id: document.getElementById('roleId').value
        };

        // Validate form
        if (!formData.first_name || !formData.last_name || !formData.username || !formData.password || !formData.email || !formData.role_id) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/manage-users.php`, {
                operation: 'addUser',
                json: JSON.stringify(formData)
            });
            const data = response.data;
            if (data.success) {
                alert('User added successfully!');
                document.getElementById('addUserForm').reset();
                bootstrap.Modal.getInstance(document.getElementById('addUserModal')).hide();
                loadUsers();
            } else {
                alert('Failed to add user: ' + data.message);
            }
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Failed to add user. Please try again.');
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
            username: document.getElementById('editUsername').value.trim(),
            password: document.getElementById('editPassword').value,
            email: document.getElementById('editEmail').value.trim(),
            mobile_number: document.getElementById('editMobileNumber').value.trim(),
            role_id: document.getElementById('editRoleId').value
        };

        // Validate form
        if (!formData.first_name || !formData.last_name || !formData.username || !formData.email || !formData.role_id) {
            alert('Please fill in all required fields.');
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/manage-users.php`, {
                operation: 'updateUser',
                json: JSON.stringify(formData)
            });
            const data = response.data;
            if (data.success) {
                alert('User updated successfully!');
                bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
                loadUsers();
            } else {
                alert('Failed to update user: ' + data.message);
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Failed to update user. Please try again.');
        }
    }

    // Function to delete a user
    async function deleteUser() {
        const userId = document.getElementById('confirmDeleteUserBtn').dataset.userId;
        try {
            const response = await axios.post(`${baseApiUrl}/manage-users.php`, {
                operation: 'deleteUser',
                json: JSON.stringify({ user_id: userId })
            });
            const data = response.data;
            if (data.success) {
                alert('User deleted successfully!');
                bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
                loadUsers();
            } else {
                alert('Failed to delete user: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user. Please try again.');
        }
    }
});
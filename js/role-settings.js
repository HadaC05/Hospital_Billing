console.log('role-settings.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const baseApiUrl = 'http://localhost/Hospital_Billing-cubillan_branch/api';
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Check if user has permission to manage roles
    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data.success || !data.permissions.includes('manage_roles')) {
            alert('You do not have permission to access this page.');
            window.location.href = '../components/dashboard.html';
            return;
        }
        
        // Store permissions for sidebar rendering
        window.userPermissions = data.permissions;
    } catch (error) {
        console.error('Error checking permissions:', error);
        alert('Failed to verify permissions. Please try again.');
        window.location.href = '../components/dashboard.html';
        return;
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

        // Set user name in sidebar
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.full_name || user.username;
        }

        // Render navigation modules based on permissions
        if (window.userPermissions) {
            renderModules(window.userPermissions);
        }
    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }

    // Function to render navigation modules based on permissions
    function renderModules(permissions) {
        const moduleMap = {
            'dashboard': { label: 'Dashboard', link: '../dashboard.html' },
            'manage_users': { label: 'Manage Users', link: 'user-management.html' },
            'manage_roles': { label: 'Role Settings', link: 'role-settings.html' },
            'view_admissions': { label: 'Admission Records', link: 'admission-records.html' },
            'edit_admissions': { label: 'Admission Editor', link: 'admission-editor.html' },
            'access_billing': { label: 'Billing Overview', link: 'billing-overview.html' },
            'generate_invoice': { label: 'Invoice Generator', link: 'invoice-generator.html' },
            'view_patient_records': { label: 'Patient Records Viewer', link: 'patient-records.html' },
            'approve_insurance': { label: 'Insurance Approval Panel', link: 'insurance-approval.html' },
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
    
        // Clear existing links
        if (sidebarLinks) sidebarLinks.innerHTML = '';
        if (accordionBody) accordionBody.innerHTML = '';
    
        // Add standalone navigation links
        permissions.forEach(permission => {
            if (moduleMap[permission]) {
                const { label, link } = moduleMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white', 'text-decoration-none');
                a.innerHTML = `<i class="fas fa-chevron-right me-2"></i>${label}`;
                
                // Highlight current page
                if (link === 'role-settings.html') {
                    a.classList.add('bg-primary', 'bg-opacity-25');
                }
                
                if (sidebarLinks) {
                    sidebarLinks.appendChild(a);
                }
            }
        });
    
        // Add inventory modules to accordion
        let inventoryShown = false;
        permissions.forEach(permission => {
            if (inventoryMap[permission]) {
                const { label, link } = inventoryMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-dark', 'text-decoration-none', 'border-bottom', 'border-light');
                a.innerHTML = `<i class="fas fa-box me-2 text-primary"></i>${label}`;
                
                // Add hover effects
                a.addEventListener('mouseenter', () => {
                    a.classList.add('bg-light');
                });
                a.addEventListener('mouseleave', () => {
                    if (!a.classList.contains('bg-primary')) {
                        a.classList.remove('bg-light');
                    }
                });
                
                if (accordionBody) {
                    accordionBody.appendChild(a);
                }
                inventoryShown = true;
            }
        });

        // Show/hide inventory accordion based on permissions
        const inventoryAccordion = document.querySelector('#invHeading').parentElement;
        if (inventoryAccordion) {
            inventoryAccordion.style.display = inventoryShown ? 'block' : 'none';
        }
    }

    // Load roles
    loadRoles();

    // Event listeners for modals
    document.getElementById('saveRoleBtn').addEventListener('click', addRole);
    document.getElementById('updateRoleBtn').addEventListener('click', updateRole);
    document.getElementById('confirmDeleteRoleBtn').addEventListener('click', deleteRole);

    // Function to load all roles
    async function loadRoles() {
        try {
            const response = await axios.post(`${baseApiUrl}/manage-roles.php`, {
                operation: 'getRoles',
                json: JSON.stringify({})
            });

            const data = response.data;
            if (data.success) {
                displayRoles(data.roles);
            } else {
                alert('Failed to load roles: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            alert('Failed to load roles. Please try again.');
        }
    }

    // Function to display roles in the table
    function displayRoles(roles) {
        const tableBody = document.getElementById('roles-table-body');
        tableBody.innerHTML = '';

        roles.forEach(role => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${role.role_name}</td>
                <td>${role.access_level}</td>
                <td>
                    <button class="btn btn-sm btn-info view-permissions-btn" data-role-id="${role.role_id}">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn btn-sm btn-primary edit-role-btn" data-role-id="${role.role_id}" 
                            data-role-name="${role.role_name}" data-access-level="${role.access_level}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-role-btn" data-role-id="${role.role_id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.view-permissions-btn').forEach(btn => {
            btn.addEventListener('click', () => loadPermissions(btn.dataset.roleId));
        });

        document.querySelectorAll('.edit-role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('editRoleId').value = btn.dataset.roleId;
                document.getElementById('editRoleName').value = btn.dataset.roleName;
                document.getElementById('editAccessLevel').value = btn.dataset.accessLevel;
                new bootstrap.Modal(document.getElementById('editRoleModal')).show();
            });
        });

        document.querySelectorAll('.delete-role-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('confirmDeleteRoleBtn').dataset.roleId = btn.dataset.roleId;
                new bootstrap.Modal(document.getElementById('deleteRoleModal')).show();
            });
        });
    }

    // Function to load permissions for a role
    async function loadPermissions(roleId) {
        try {
            const response = await axios.post(`${baseApiUrl}/manage-roles.php`, {
                operation: 'getRolePermissions',
                json: JSON.stringify({ role_id: roleId })
            });

            const data = response.data;
            if (data.success) {
                displayPermissions(roleId, data.permissions, data.role_name);
            } else {
                alert('Failed to load permissions: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading permissions:', error);
            alert('Failed to load permissions. Please try again.');
        }
    }

    // Function to display permissions for a role
    async function displayPermissions(roleId, rolePermissions, roleName) {
        const container = document.getElementById('permissions-container');
        
        try {
            // Get all available permissions
            const response = await axios.post(`${baseApiUrl}/manage-roles.php`, {
                operation: 'getAllPermissions',
                json: JSON.stringify({})
            });

            const data = response.data;
            if (data.success) {
                const allPermissions = data.permissions;
                
                // Create HTML for permissions
                let html = `
                    <h5>Permissions for ${roleName}</h5>
                    <form id="permissions-form" data-role-id="${roleId}">
                        <div class="mb-3">
                            <div class="d-flex justify-content-end mb-2">
                                <button type="button" class="btn btn-sm btn-primary" id="save-permissions-btn">
                                    <i class="fas fa-save me-1"></i> Save Permissions
                                </button>
                            </div>
                `;

                // Group permissions by category
                const categories = {
                    'User Management': ['manage_users', 'manage_roles'],
                    'Patient Management': ['view_patient_records'],
                    'Admission Management': ['view_admissions', 'edit_admissions'],
                    'Billing': ['access_billing', 'generate_invoice'],
                    'Inventory': ['manage_rooms', 'manage_medicine', 'manage_labtests', 'manage_surgeries', 'manage_treatments'],
                    'Insurance': ['approve_insurance']
                };

                // Create checkboxes grouped by category
                for (const [category, permissionNames] of Object.entries(categories)) {
                    html += `<h6 class="mt-3">${category}</h6>`;
                    
                    permissionNames.forEach(permName => {
                        const permission = allPermissions.find(p => p.name === permName);
                        if (permission) {
                            const isChecked = rolePermissions.some(p => p.permission_id === permission.permission_id);
                            html += `
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" 
                                        id="perm-${permission.permission_id}" 
                                        name="permission[]" 
                                        value="${permission.permission_id}" 
                                        ${isChecked ? 'checked' : ''}>
                                    <label class="form-check-label" for="perm-${permission.permission_id}">
                                        ${permission.label} - <small class="text-muted">${permission.description || ''}</small>
                                    </label>
                                </div>
                            `;
                        }
                    });
                }

                html += `
                        </div>
                    </form>
                `;

                container.innerHTML = html;

                // Add event listener to save button
                document.getElementById('save-permissions-btn').addEventListener('click', savePermissions);
            } else {
                alert('Failed to load all permissions: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading all permissions:', error);
            alert('Failed to load all permissions. Please try again.');
        }
    }

    // Function to save permissions
    async function savePermissions() {
        const form = document.getElementById('permissions-form');
        const roleId = form.dataset.roleId;
        
        // Get all checked permissions
        const checkedPermissions = Array.from(form.querySelectorAll('input[name="permission[]"]:checked'))
            .map(input => input.value);

        try {
            const response = await axios.post(`${baseApiUrl}/manage-roles.php`, {
                operation: 'updateRolePermissions',
                json: JSON.stringify({
                    role_id: roleId,
                    permissions: checkedPermissions
                })
            });

            const data = response.data;
            if (data.success) {
                alert('Permissions updated successfully!');
            } else {
                alert('Failed to update permissions: ' + data.message);
            }
        } catch (error) {
            console.error('Error updating permissions:', error);
            alert('Failed to update permissions. Please try again.');
        }
    }

    // Function to add a new role
    async function addRole() {
        const roleName = document.getElementById('roleName').value.trim();
        const accessLevel = document.getElementById('accessLevel').value;

        if (!roleName || !accessLevel) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/manage-roles.php`, {
                operation: 'addRole',
                json: JSON.stringify({
                    role_name: roleName,
                    access_level: accessLevel
                })
            });

            const data = response.data;
            if (data.success) {
                alert('Role added successfully!');
                document.getElementById('addRoleForm').reset();
                bootstrap.Modal.getInstance(document.getElementById('addRoleModal')).hide();
                loadRoles();
            } else {
                alert('Failed to add role: ' + data.message);
            }
        } catch (error) {
            console.error('Error adding role:', error);
            alert('Failed to add role. Please try again.');
        }
    }

    // Function to update a role
    async function updateRole() {
        const roleId = document.getElementById('editRoleId').value;
        const roleName = document.getElementById('editRoleName').value.trim();
        const accessLevel = document.getElementById('editAccessLevel').value;

        if (!roleName || !accessLevel) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/manage-roles.php`, {
                operation: 'updateRole',
                json: JSON.stringify({
                    role_id: roleId,
                    role_name: roleName,
                    access_level: accessLevel
                })
            });

            const data = response.data;
            if (data.success) {
                alert('Role updated successfully!');
                bootstrap.Modal.getInstance(document.getElementById('editRoleModal')).hide();
                loadRoles();
            } else {
                alert('Failed to update role: ' + data.message);
            }
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Failed to update role. Please try again.');
        }
    }

    // Function to delete a role
    async function deleteRole() {
        const roleId = document.getElementById('confirmDeleteRoleBtn').dataset.roleId;

        try {
            const response = await axios.post(`${baseApiUrl}/manage-roles.php`, {
                operation: 'deleteRole',
                json: JSON.stringify({ role_id: roleId })
            });

            const data = response.data;
            if (data.success) {
                alert('Role deleted successfully!');
                bootstrap.Modal.getInstance(document.getElementById('deleteRoleModal')).hide();
                loadRoles();
            } else {
                alert('Failed to delete role: ' + data.message);
            }
        } catch (error) {
            console.error('Error deleting role:', error);
            alert('Failed to delete role. Please try again.');
        }
    }
});
console.log('surgery.js is working');

const baseApiUrl = '../api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Check if user has permission to manage surgeries
    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data.success || !data.permissions.includes('manage_surgeries')) {
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

    // Function to render sidebar modules
    function renderModules(permissions) {
        const moduleMap = {
            'dashboard': { label: 'Dashboard', link: '../components/dashboard.html' },
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
                
                // Highlight current page
                if (link === 'inv-surgery.html') {
                    a.classList.add('bg-primary', 'bg-opacity-25');
                }
                
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

    // Surgery management functionality
    const tableBody = document.getElementById('surgery-list');
    const typeSelect = document.getElementById('surgery_type_id');
    const surgForm = document.getElementById('addSurgeryForm');
    const editForm = document.getElementById('editSurgeryForm');
    const editTypeSelect = document.getElementById('edit_surgery_type_id');

    let surgeries = [];
    let filteredSurgeries = [];

    // Load Surgery Types
    async function loadSurgeryTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-surgeries.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.surgery_type_id}">${type.surgery_type_name}</option>`;
                }).join('');

                if (typeSelect) typeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                
                // Populate filter dropdown
                const filterTypeSelect = document.getElementById('filterSurgeryType');
                if (filterTypeSelect) {
                    filterTypeSelect.innerHTML = `<option value="">All Types</option>` + options;
                }
            } else {
                typeSelect.innerHTML = '<option value="">No types available</option>';
            }
        } catch (error) {
            console.error('Failed to load surgery types: ', error);
        }
    }

    // Load Surgery List
    async function loadSurgeries() {
        if (!tableBody) {
            console.error('Surgery table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="4">Loading surgeries...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-surgeries.php`, {
                params: {
                    operation: 'getSurgeries',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.surgeries)) {
                surgeries = data.surgeries;
                filteredSurgeries = surgeries;
                renderSurgeryTable();
            } else {
                tableBody.innerHTML = `<tr><td colspan="4">${data.message || 'No data found.'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading surgeries: ', error);
            tableBody.innerHTML = '<tr><td colspan="4">Failed to load surgeries.</td></tr>';
        }
    }

    // Render surgery table with current filtered data
    function renderSurgeryTable() {
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (filteredSurgeries.length > 0) {
            filteredSurgeries.forEach(surg => {
                const isActive = surg.is_available == 1 ? 'Active' : 'Inactive';
                const statusBadge = surg.is_available == 1 ? 
                    '<span class="status-badge active">Active</span>' : 
                    '<span class="status-badge inactive">Inactive</span>';

                const row = `
                    <tr>
                        <td>${surg.surgery_name}</td>
                        <td>${surg.surgery_type_name}</td>
                        <td>${surg.surgery_price}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-btn" data-id="${surg.surgery_id}">Edit</button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="4">No surgeries found.</td></tr>';
        }
    }

    // Search and Filter Functions
    function applySurgeryFilters() {
        const searchTerm = document.getElementById('searchSurgery').value.toLowerCase();
        const typeFilter = document.getElementById('filterSurgeryType').value;
        const statusFilter = document.getElementById('filterSurgeryStatus').value;

        filteredSurgeries = surgeries.filter(surg => {
            const matchesSearch = surg.surgery_name.toLowerCase().includes(searchTerm) ||
                                surg.surgery_type_name.toLowerCase().includes(searchTerm);
            const matchesType = !typeFilter || surg.surgery_type_id == typeFilter;
            const matchesStatus = statusFilter === '' || surg.is_available == statusFilter;

            return matchesSearch && matchesType && matchesStatus;
        });

        renderSurgeryTable();
    }

    // Event listeners for search and filters
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('searchSurgery');
        const typeFilter = document.getElementById('filterSurgeryType');
        const statusFilter = document.getElementById('filterSurgeryStatus');

        if (searchInput) {
            searchInput.addEventListener('input', applySurgeryFilters);
        }
        if (typeFilter) {
            typeFilter.addEventListener('change', applySurgeryFilters);
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', applySurgeryFilters);
        }
    });


    // Add Surgery
    if (surgForm) {
        surgForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Temporarily enable the status field to get its value
            const statusField = document.getElementById('is_available');
            statusField.disabled = false;
            
            const surgeryName = document.getElementById('surgery_name').value.trim();
            const surgeryTypeId = document.getElementById('surgery_type_id').value;
            const surgeryPrice = document.getElementById('surgery_price').value;
            
            if (!surgeryName || !surgeryTypeId || !surgeryPrice) {
                alert('Please fill in all required fields.');
                statusField.disabled = true; // Re-disable if validation fails
                return;
            }
            
            const data = {
                surgery_name: surgeryName,
                surgery_type_id: surgeryTypeId,
                surgery_price: surgeryPrice,
                is_available: statusField.value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-surgeries.php`, {
                    operation: 'addSurgery',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Surgery added successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to add surgery');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding surgery');
            } finally {
                // Re-disable the status field
                statusField.disabled = true;
            }
        });
    }

    // Edit Button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const surgId = e.target.dataset.id;
            const surg = surgeries.find(s => s.surgery_id == surgId);

            if (surg) {
                // await loadSurgeryTypes();

                document.getElementById('edit_surgery_id').value = surg.surgery_id;
                document.getElementById('edit_surgery_name').value = surg.surgery_name;
                document.getElementById('edit_surgery_type_id').value = surg.surgery_type_id;
                document.getElementById('edit_surgery_price').value = surg.surgery_price;
                document.getElementById('edit_is_available').value = surg.is_available;

                const modal = new bootstrap.Modal(document.getElementById('editSurgeryModal'));
                modal.show();
            }
        }

    });

    // Update Form Submit

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                surgery_id: document.getElementById('edit_surgery_id').value,
                surgery_name: document.getElementById('edit_surgery_name').value,
                surgery_type_id: document.getElementById('edit_surgery_type_id').value,
                surgery_price: document.getElementById('edit_surgery_price').value,
                is_available: document.getElementById('edit_is_available').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-surgeries.php`, {
                    operation: 'updateSurgery',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Surgery updated successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to update surgery');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating surgery');
            }
        });
    }

    await loadSurgeryTypes();
    await loadSurgeries();

});
console.log('labtests.js is working');

const baseApiUrl = '../api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Check if user has permission to manage labtests
    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data.success || !data.permissions.includes('manage_labtests')) {
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
                if (link === 'inv-labtest.html') {
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

    // Labtest management functionality
    const tableBody = document.getElementById('labtest-list');
    let labtests = [];
    let labtestCategories = [];
    let filteredLabtests = [];
    
    // Modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addLabtestModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editLabtestModal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteLabtestModal'));
    
    // Form elements
    const addForm = document.getElementById('addLabtestForm');
    const editForm = document.getElementById('editLabtestForm');
    
    // Button event listeners
    document.getElementById('saveLabtestBtn').addEventListener('click', saveLabtest);
    document.getElementById('updateLabtestBtn').addEventListener('click', updateLabtest);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteLabtest);

    // load labtest types
    async function loadLabtestTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getTypes'
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.labtest_category_id}">${type.labtest_category_name}</option>`;
                }).join('');

                // Populate all category dropdowns
                const addCategorySelect = document.getElementById('add_labtest_category_id');
                const editCategorySelect = document.getElementById('edit_labtest_category_id');
                
                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">Select Category</option>` + options;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">Select Category</option>` + options;
                
                // Populate filter dropdown
                const filterCategorySelect = document.getElementById('filterLabtestCategory');
                if (filterCategorySelect) {
                    filterCategorySelect.innerHTML = `<option value="">All Categories</option>` + options;
                }
            } else {
                const addCategorySelect = document.getElementById('add_labtest_category_id');
                const editCategorySelect = document.getElementById('edit_labtest_category_id');
                
                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">No categories available</option>`;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">No categories available</option>`;
            }
        } catch (error) {
            console.error('Failed to load labtest types', error);
        }
    }

    // load labtest list
    async function loadLabtest() {
        if (!tableBody) {
            console.error('Labtest table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="5">Loading labtests...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getLabtests'
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.labtests)) {
                labtests = data.labtests;
                filteredLabtests = labtests;
                renderLabtestTable();
            } else {
                tableBody.innerHTML = `<tr><td colspan="5">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading labtests: ', error);
            tableBody.innerHTML = '<tr><td colspan="5">Failed to load labtests</td></tr>';
        }
    }

    // Render labtest table with current filtered data
    function renderLabtestTable() {
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (filteredLabtests.length > 0) {
            filteredLabtests.forEach(test => {
                const isActive = test.is_active == 1 ? 'Active' : 'Inactive';
                const statusBadge = test.is_active == 1 ? 'status-badge active' : 'status-badge inactive';

                const row = `
                    <tr>
                        <td>${test.test_name}</td>
                        <td>${test.labtest_category_name}</td>
                        <td>₱${parseFloat(test.unit_price).toFixed(2)}</td>
                        <td><span class="${statusBadge}">${isActive}</span></td>
                        <td>
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editLabtest(${test.labtest_id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteLabtest(${test.labtest_id}, '${test.test_name}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5">No lab tests found.</td></tr>';
        }
    }

    // Search and Filter Functions
    function applyLabtestFilters() {
        const searchTerm = document.getElementById('searchLabtest').value.toLowerCase();
        const categoryFilter = document.getElementById('filterLabtestCategory').value;
        const statusFilter = document.getElementById('filterLabtestStatus').value;

        filteredLabtests = labtests.filter(test => {
            const matchesSearch = test.test_name.toLowerCase().includes(searchTerm) ||
                                test.labtest_category_name.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryFilter || test.labtest_category_id == categoryFilter;
            const matchesStatus = statusFilter === '' || test.is_active == statusFilter;

            return matchesSearch && matchesCategory && matchesStatus;
        });

        renderLabtestTable();
    }

    // Event listeners for search and filters
    function setupFilterEventListeners() {
        const searchInput = document.getElementById('searchLabtest');
        const categoryFilter = document.getElementById('filterLabtestCategory');
        const statusFilter = document.getElementById('filterLabtestStatus');

        if (searchInput) {
            searchInput.addEventListener('input', applyLabtestFilters);
        }
        if (categoryFilter) {
            categoryFilter.addEventListener('change', applyLabtestFilters);
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', applyLabtestFilters);
        }
    }

    // CRUD Functions
    
    // Create new lab test
    async function saveLabtest() {
        const testName = document.getElementById('add_test_name').value.trim();
        const categoryId = document.getElementById('add_labtest_category_id').value;
        const unitPrice = document.getElementById('add_unit_price').value;
        
        // Temporarily enable the status field to get its value
        const statusField = document.getElementById('add_is_active');
        statusField.disabled = false;
        const isActive = statusField.value;
        
        if (!testName || !categoryId || !unitPrice) {
            alert('Please fill in all required fields.');
            statusField.disabled = true; // Re-disable if validation fails
            return;
        }
        
        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'createLabtest',
                json: JSON.stringify({
                    test_name: testName,
                    labtest_category_id: categoryId,
                    unit_price: parseFloat(unitPrice),
                    is_active: parseInt(isActive)
                })
            });
            
            const data = response.data;
            if (data.success) {
                alert('Lab test added successfully!');
                addModal.hide();
                addForm.reset();
                await loadLabtest();
            } else {
                alert(data.message || 'Failed to add lab test.');
            }
        } catch (error) {
            console.error('Error adding lab test:', error);
            alert('Failed to add lab test. Please try again.');
        } finally {
            // Re-disable the status field
            statusField.disabled = true;
        }
    }
    
    // Edit lab test
    window.editLabtest = async function(labtestId) {
        const labtest = labtests.find(test => test.labtest_id == labtestId);
        if (!labtest) {
            alert('Lab test not found.');
            return;
        }
        
        // Populate edit form
        document.getElementById('edit_labtest_id').value = labtest.labtest_id;
        document.getElementById('edit_test_name').value = labtest.test_name;
        document.getElementById('edit_labtest_category_id').value = labtest.labtest_category_id;
        document.getElementById('edit_unit_price').value = labtest.unit_price;
        document.getElementById('edit_is_active').value = labtest.is_active;
        
        editModal.show();
    };
    
    // Update lab test
    async function updateLabtest() {
        const labtestId = document.getElementById('edit_labtest_id').value;
        const testName = document.getElementById('edit_test_name').value.trim();
        const categoryId = document.getElementById('edit_labtest_category_id').value;
        const unitPrice = document.getElementById('edit_unit_price').value;
        const isActive = document.getElementById('edit_is_active').value;
        
        if (!testName || !categoryId || !unitPrice) {
            alert('Please fill in all required fields.');
            return;
        }
        
        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'updateLabtest',
                json: JSON.stringify({
                    labtest_id: parseInt(labtestId),
                    test_name: testName,
                    labtest_category_id: categoryId,
                    unit_price: parseFloat(unitPrice),
                    is_active: parseInt(isActive)
                })
            });
            
            const data = response.data;
            if (data.success) {
                alert('Lab test updated successfully!');
                editModal.hide();
                await loadLabtest();
            } else {
                alert(data.message || 'Failed to update lab test.');
            }
        } catch (error) {
            console.error('Error updating lab test:', error);
            alert('Failed to update lab test. Please try again.');
        }
    }
    
    // Confirm delete lab test
    window.confirmDeleteLabtest = function(labtestId, testName) {
        document.getElementById('delete_labtest_id').value = labtestId;
        document.getElementById('deleteLabtestName').textContent = testName;
        deleteModal.show();
    };
    
    // Delete lab test
    async function deleteLabtest() {
        const labtestId = document.getElementById('delete_labtest_id').value;
        
        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'deleteLabtest',
                json: JSON.stringify({
                    labtest_id: parseInt(labtestId)
                })
            });
            
            const data = response.data;
            if (data.success) {
                alert('Lab test deleted successfully!');
                deleteModal.hide();
                await loadLabtest();
            } else {
                alert(data.message || 'Failed to delete lab test.');
            }
        } catch (error) {
            console.error('Error deleting lab test:', error);
            alert('Failed to delete lab test. Please try again.');
        }
    }
    
    // Initialize the module
    await loadLabtestTypes();
    await loadLabtest();
    setupFilterEventListeners();
});
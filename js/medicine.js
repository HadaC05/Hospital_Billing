console.log('medicine.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
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

        // Load permissions and populate sidebar
        try {
            const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
                operation: 'getUserPermissions',
                json: JSON.stringify({ user_id: user.user_id })
            });

            const data = response.data;
            if (data.success) {
                renderModules(data.permissions);
            }
        } catch (error) {
            console.error('Failed to load permissions: ', error);
        }
    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }

    // Function to render sidebar modules
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

        // Standalone
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

        // inventory modules
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

    // Medicine management functionality
    const tableBody = document.getElementById('medicine-list');
    const medForm = document.getElementById('addMedicineForm');
    const editForm = document.getElementById('editMedicineForm');
    const typeSelect = document.getElementById('med_type_id');
    const editTypeSelect = document.getElementById('edit_med_type_id');

    let medicines = [];

    // Load Medicine Types
    async function loadMedicineTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: {
                    operation: 'getTypes'
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.med_type_id}">${type.med_type_name}</option>`;
                }).join('');

                if (typeSelect) typeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
            } else {
                typeSelect.innerHTML = '<option value="">No types available</option>';
            }
        } catch (error) {
            console.error('Failed to load medicine types: ', error);
        }
    }

    // Load Medicine List
    async function loadMedicines() {
        if (!tableBody) {
            console.error('Medicine table body not found.');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="7">Loading medicines...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: {
                    operation: 'getMedicines',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.medicines)) {
                medicines = data.medicines;

                if (medicines.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7">No medicines found. </td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                medicines.forEach(med => {
                    const isActive = med.is_active == 1 ? 'Active' : 'Inactive';

                    const row = `
                    <tr>
                        <td>${med.med_name}</td>
                        <td>${med.med_type_name}</td>
                        <td>${med.unit_price}</td>
                        <td>${med.stock_quantity}</td>
                        <td>${med.med_unit}</td>
                        <td>${isActive}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-btn" data-id="${med.med_id}">Edit</button>
                        </td>
                    </tr>
                `;
                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="7">${data.message || 'No data found.'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading medicines: ', error);
            tableBody.innerHTML = '<tr><td colspan="7">Failed to load medicines.</td></tr>';
        }
    }

    // Add Medicine
    if (medForm) {
        medForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                med_name: document.getElementById('med_name').value.trim(),
                med_type_id: document.getElementById('med_type_id').value,
                unit_price: document.getElementById('unit_price').value,
                stock_quantity: document.getElementById('stock_quantity').value,
                med_unit: document.getElementById('med_unit').value.trim(),
                is_active: document.getElementById('is_active').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                    operation: 'addMedicine',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Medicine added successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to add medicine');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding medicine');
            }
        });
    }

    // Edit Button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const medId = e.target.dataset.id;
            const med = medicines.find(m => m.med_id == medId);

            if (med) {

                // await loadMedicineTypes();

                document.getElementById('edit_med_id').value = med.med_id;
                document.getElementById('edit_med_name').value = med.med_name;
                document.getElementById('edit_med_type_id').value = med.med_type_id;
                document.getElementById('edit_unit_price').value = med.unit_price;
                document.getElementById('edit_stock_quantity').value = med.stock_quantity;
                document.getElementById('edit_med_unit').value = med.med_unit;
                document.getElementById('edit_is_active').value = med.is_active;

                const modal = new bootstrap.Modal(document.getElementById('editMedicineModal'));
                modal.show();
            }
        }
    });

    // Update Form Submit 

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                med_id: document.getElementById('edit_med_id').value,
                med_name: document.getElementById('edit_med_name').value.trim(),
                med_type_id: document.getElementById('edit_med_type_id').value,
                unit_price: document.getElementById('edit_unit_price').value,
                stock_quantity: document.getElementById('edit_stock_quantity').value,
                med_unit: document.getElementById('edit_med_unit').value.trim(),
                is_active: document.getElementById('edit_is_active').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                    operation: 'updateMedicine',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Medicine updated successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to update medicine');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating medicine');
            }
        });
    }

    await loadMedicineTypes();
    await loadMedicines();
});
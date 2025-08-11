console.log('labtests.js is working');

<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', async () => {

    const baseApiUrl = 'http://localhost/hospital_billing/api';

=======
const baseApiUrl = 'http://localhost/hospital_billing-cubillan_branch/api';

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

    // Labtest management functionality
>>>>>>> tads_branch
    const tableBody = document.getElementById('labtest-list');
    const typeSelect = document.getElementById('labtest_category_id');


    let labtests = [];

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

                if (typeSelect) typeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                // for editing here
            } else {
                typeSelect.innerHTML = `<option value="">No types available</option>`;
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

        tableBody.innerHTML = '<tr><td colspan="4">Loading labtests...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getLabtests',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.labtests)) {
                labtests = data.labtests;

                if (labtests.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4">No labtests found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                labtests.forEach(test => {
                    const isActive = test.is_active == 1 ? 'Active' : 'Inactive';

                    const row = `
                        <tr>
                            <td>${test.test_name}</td>
                            <td>${test.labtest_category_name}</td>
                            <td>${test.unit_price}</td>
                            <td>${isActive}</td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="4">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading labtests: ', error);
            tableBody.innerHTML = '<tr><td colspan="4">Failed to load labtests</td></tr>';

        }
    }

    await loadLabtestTypes();
    await loadLabtest();
});
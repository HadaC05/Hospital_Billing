console.log('dashboard.js is working');

document.addEventListener('DOMContentLoaded', async () => {

    const baseApiUrl = 'http://localhost/hospital_billing-cubillan_branch/api';
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('No user data found. Redirecting to loging.');
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

    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }

    const welcomeMessage = document.getElementById('welcome-msg')
    const sidebar = document.getElementById('sidebar-links');
    const content = document.getElementById('dashboard-content');

    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        console.log('Permissions response: ', data);

        if (data.success) {
            welcomeMessage.textContent = `Welcome, ${user.full_name}`;
            renderModules(data.permissions);
        } else {
            content.innerHTML = `<p class="text-danger">${data.message || 'Failed to load permissions.'}</p>`;
        }
    } catch (error) {
        console.error('Axios error: ', error);
        content.innerHTML = `<p class="text-danger">Network error. Please try again. </p>`;
    }

    function renderModules(permissions) {
        const moduleMap = {
            'manage_users': { label: 'Manage Users', link: 'user-management.html' },
            'manage_roles': { label: 'Role Settings', link: 'role-settings.html' },
            'view_admissions': { label: 'Admission Records', link: 'admission-records.html' },
            'edit_admissions': { label: 'Admission Editor', link: 'admission-editor.html' },
            'access_billing': { label: 'Billing Overview', link: 'billing-overview.html' },
            'generate_invoice': { label: 'Invoice Generator', link: 'generate-invoice.html' },
            'view_patient_records': { label: 'Patient Records Viewer', link: 'patient-records.html' },
            'approve_insurance': { label: 'Insurance Approval Panel', link: 'insurance-approval.html' },
            // Remove or update this line - it's causing the issue for Lab Technician
            // 'manage_labtests': { label: 'Lab Technician ', link: 'lab-technician.html' },
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
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white');
                a.textContent = label;
                sidebarLinks.appendChild(a); // Changed from sidebar to sidebarLinks
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
});
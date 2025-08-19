console.log('sidebar.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    const baseApiUrl = `${window.location.origin}/hospital_billing/api`;
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (!sidebarPlaceholder) {
        return; // page without sidebar
    }

    try {
        const sidebarResponse = await axios.get('../components/sidebar.html');
        if (!sidebarResponse?.data) return;

        sidebarPlaceholder.innerHTML = sidebarResponse.data;

        const sidebarElement = document.getElementById('sidebar');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const userName = document.getElementById('user-name');

        if (userName) {
            userName.textContent = user.full_name || 'User';
        }

        // Restore sidebar collapsed state
        if (localStorage.getItem('sidebarCollapsed') === 'true' && sidebarElement) {
            sidebarElement.classList.add('collapsed');
        }

        // Toggle sidebar
        if (hamburgerBtn && sidebarElement) {
            hamburgerBtn.addEventListener('click', () => {
                sidebarElement.classList.toggle('collapsed');
                localStorage.setItem('sidebarCollapsed', sidebarElement.classList.contains('collapsed'));
            });
        }

        // Logout
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

        // Load user permissions and build links
        await buildSidebarLinks(baseApiUrl, user);

        // Highlight active link
        highlightActiveLink();
    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }
});

async function buildSidebarLinks(baseApiUrl, user) {
    const moduleMap = {
        admin_dashboard: { label: 'Administrator Dashboard', link: '../components/dashboard.html' },
        manage_users: { label: 'Manage Users', link: '../module/user-management.html' },
        manage_roles: { label: 'Role Settings', link: '../module/role-settings.html' },
        view_admissions: { label: 'Admission Records', link: '../module/admission-records.html' },
        edit_admissions: { label: 'Admission Editor', link: '../module/admission-editor.html' },
        access_billing: { label: 'Billing Overview', link: '../module/billing-overview.html' },
        generate_invoice: { label: 'Invoice Generator', link: '../module/invoice-generator.html' },
        view_patient_records: { label: 'Patient Records Viewer', link: '../module/patient-records.html' },
        approve_insurance: { label: 'Insurance Approval Panel', link: '../module/insurance-approval.html' },
        doctor_prescription: { label: 'Doctor Prescription', link: '../module/doctor-prescription.html' },
    };

    const inventoryMap = {
        manage_medicine: { label: 'Medicine Module', link: '../module/inv-medicine.html' },
        manage_surgeries: { label: 'Surgical Module', link: '../module/inv-surgery.html' },
        manage_labtests: { label: 'Laboratory Module', link: '../module/inv-labtest.html' },
        manage_treatments: { label: 'Treatment Module', link: '../module/inv-treatments.html' },
        manage_rooms: { label: 'Room Management', link: '../module/inv-rooms.html' },
        manage_medicine_types: { label: 'Medicine Type Module', link: '../module/type-medicine.html' },
        manage_room_types: { label: 'Room Type Module', link: '../module/type-room.html' },
        manage_surgery_types: { label: 'Surgery Type Module', link: '../module/type-surgery.html' },
        manage_treatment_types: { label: 'Treatment Type Module', link: '../module/type-treatment.html' },
        manage_labtest_types: { label: 'Labtest Type Module', link: '../module/type-labtest.html' },
    };

    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data?.success) {
            console.warn('Failed to load permissions for sidebar:', data?.message);
            return;
        }

        const permissions = data.permissions || [];
        const sidebarLinks = document.getElementById('sidebar-links');
        const accordionBody = document.querySelector('#invCollapse .accordion-body');
        const inventoryAccordionItem = document.querySelector('.accordion-item');

        if (sidebarLinks) sidebarLinks.innerHTML = '';
        if (accordionBody) accordionBody.innerHTML = '';

        // Standalone modules
        permissions.forEach((permissionName) => {
            const config = moduleMap[permissionName];
            if (!config || !sidebarLinks) return;
            const link = document.createElement('a');
            link.href = config.link;
            link.classList.add('sidebar-link', 'd-block', 'px-3', 'py-2');
            link.textContent = config.label;
            sidebarLinks.appendChild(link);
        });

        // Inventory modules
        let inventoryShown = false;
        permissions.forEach((permissionName) => {
            const config = inventoryMap[permissionName];
            if (!config || !accordionBody) return;
            inventoryShown = true;
            const link = document.createElement('a');
            link.href = config.link;
            link.classList.add('sidebar-link', 'd-block', 'px-3', 'py-2');
            link.textContent = config.label;
            accordionBody.appendChild(link);
        });

        if (!inventoryShown && inventoryAccordionItem) {
            inventoryAccordionItem.style.display = 'none';
        }
    } catch (error) {
        console.error('Failed to build sidebar links:', error);
    }
}

function highlightActiveLink() {
    const currentPath = window.location.pathname.replace(/\\/g, '/');
    const links = document.querySelectorAll('#sidebar a');
    links.forEach((link) => {
        try {
            const linkUrl = new URL(link.href);
            if (linkUrl.pathname === currentPath) {
                link.classList.add('active');
            }
        } catch (e) {
            // ignore
        }
    });
}



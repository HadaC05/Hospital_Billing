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
        const pageContainer = document.getElementById('page-container');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = user.full_name || 'User';
        }
        // Restore sidebar collapsed state
        if (localStorage.getItem('sidebarCollapsed') === 'true' && sidebarElement) {
            sidebarElement.classList.add('collapsed');
            if (pageContainer) pageContainer.classList.add('sidebar-collapsed');
        }
        // Toggle sidebar
        if (hamburgerBtn && sidebarElement) {
            hamburgerBtn.addEventListener('click', () => {
                const collapsed = !sidebarElement.classList.contains('collapsed');
                sidebarElement.classList.toggle('collapsed', collapsed);
                if (pageContainer) pageContainer.classList.toggle('sidebar-collapsed', collapsed);
                localStorage.setItem('sidebarCollapsed', collapsed);
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
    // Create module maps with sorted labels and icons
    const moduleMap = {
        admin_dashboard: {
            label: 'Administrator Dashboard',
            link: '../components/dashboard.html',
            icon: 'fas fa-tachometer-alt'
        },
        doctor_dashboard: {
            label: 'Doctor Dashboard',
            link: '../module/doctor-dashboard.html',
            icon: 'fas fa-user-md'
        },
        receptionist_dashboard: {
            label: 'Receptionist Dashboard',
            link: '../module/receptionist-dashboard.html',
            icon: 'fas fa-handshake-angle'
        },
        manage_users: {
            label: 'Manage Users',
            link: '../module/user-management.html',
            icon: 'fas fa-users'
        },
        manage_roles: {
            label: 'Role Settings',
            link: '../module/role-settings.html',
            icon: 'fas fa-user-shield'
        },
        view_admissions: {
            label: 'Admission Records',
            link: '../module/admission-records.html',
            icon: 'fas fa-clipboard-list'
        },
        edit_admissions: {
            label: 'Admission Editor',
            link: '../module/admission-editor.html',
            icon: 'fas fa-edit'
        },
        view_patient_records: {
            label: 'Patient Records Viewer',
            link: '../module/patient-records.html',
            icon: 'fas fa-folder-open'
        },
        access_billing: {
            label: 'Billing Overview',
            link: '../module/billing-overview.html',
            icon: 'fas fa-file-invoice-dollar'
        },
        generate_invoice: {
            label: 'Invoice Generator',
            link: '../module/invoice-generator.html',
            icon: 'fas fa-file-invoice'
        },
        approve_insurance: {
            label: 'Insurance Approval Panel',
            link: '../module/insurance-approval.html',
            icon: 'fas fa-shield-alt'
        },
        doctor_prescription: {
            label: 'Doctor Prescription',
            link: '../module/doctor-prescription.html',
            icon: 'fas fa-prescription-bottle'
        },
        doctor_my_patients: {
            label: 'My Patients',
            link: '../module/my-patients.html',
            icon: 'fas fa-user-injured'
        },
        biller_dashboard: {
            label: 'Biller Dashboard',
            link: '../module/biller-dashboard.html',
            icon: 'fas fa-file-invoice-dollar'
        },
        lab_dashboard: {
            label: 'Laboratory Dashboard',
            link: '../module/lab-dashboard.html',
            icon: 'fas fa-vial'
        },
        nurse_dashboard: {
            label: 'Nurse Dashboard',
            link: '../module/nurse-dashboard.html',
            icon: 'fas fa-user-nurse'
        },
        pharmacist_dashboard: {
            label: 'Pharmacist Dashboard',
            link: '../module/pharmacist-dashboard.html',
            icon: 'fas fa-pills'
        },
    };

    const inventoryMap = {
        manage_medicine: {
            label: 'Medicine Module',
            link: '../module/inv-medicine.html',
            icon: 'fas fa-pills'
        },
        manage_surgeries: {
            label: 'Surgical Module',
            link: '../module/inv-surgery.html',
            icon: 'fas fa-procedures'
        },
        manage_labtests: {
            label: 'Laboratory Module',
            link: '../module/inv-labtest.html',
            icon: 'fas fa-vial'
        },
        manage_treatments: {
            label: 'Treatment Module',
            link: '../module/inv-treatments.html',
            icon: 'fas fa-stethoscope'
        },
        manage_rooms: {
            label: 'Room Management',
            link: '../module/inv-rooms.html',
            icon: 'fas fa-bed'
        },
        manage_medicine_types: {
            label: 'Medicine Type Module',
            link: '../module/type-medicine.html',
            icon: 'fas fa-pills'
        },
        manage_room_types: {
            label: 'Room Type Module',
            link: '../module/type-room.html',
            icon: 'fas fa-bed'
        },
        manage_surgery_types: {
            label: 'Surgery Type Module',
            link: '../module/type-surgery.html',
            icon: 'fas fa-procedures'
        },
        manage_treatment_types: {
            label: 'Treatment Type Module',
            link: '../module/type-treatment.html',
            icon: 'fas fa-stethoscope'
        },
        manage_labtest_types: {
            label: 'Labtest Type Module',
            link: '../module/type-labtest.html',
            icon: 'fas fa-vial'
        },
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

        // Create arrays to hold the links
        const standaloneLinks = [];
        const inventoryLinks = [];

        // Collect standalone module links
        permissions.forEach((permissionName) => {
            const config = moduleMap[permissionName];
            if (config) {
                standaloneLinks.push(config);
            }
        });

        // Collect inventory module links
        permissions.forEach((permissionName) => {
            const config = inventoryMap[permissionName];
            if (config) {
                inventoryLinks.push(config);
            }
        });

        // Add admin-only type modules
        const roleStr = (user?.role || '').toString().toLowerCase();
        const isAdmin = roleStr.includes('admin');
        const isDoctor = roleStr.includes('doctor');
        const isReceptionist = roleStr.includes('receptionist');
        const isBiller = roleStr.includes('biller') || roleStr.includes('billing');
        const isLab = roleStr.includes('lab') || roleStr.includes('laboratory');
        const isNurse = roleStr.includes('nurse');
        const isPharmacist = roleStr.includes('pharmacist') || roleStr.includes('pharmacy');
        if (isAdmin) {
            const alwaysShow = [
                inventoryMap.manage_treatment_types,
                inventoryMap.manage_surgery_types,
                inventoryMap.manage_room_types,
                inventoryMap.manage_medicine_types,
                inventoryMap.manage_labtest_types,
            ];

            alwaysShow.forEach((cfg) => {
                if (cfg) {
                    // Check if already added
                    const exists = inventoryLinks.some(link => link.link === cfg.link);
                    if (!exists) {
                        inventoryLinks.push(cfg);
                    }
                }
            });
        }

        // Add doctor-only links
        if (isDoctor) {
            const doctorLinks = [moduleMap.doctor_dashboard, moduleMap.doctor_my_patients];
            doctorLinks.forEach((cfg) => {
                if (cfg) {
                    const exists = standaloneLinks.some(link => link.link === cfg.link);
                    if (!exists) standaloneLinks.push(cfg);
                }
            });
        }

        // Add receptionist-only links
        if (isReceptionist) {
            const recLinks = [moduleMap.receptionist_dashboard];
            recLinks.forEach((cfg) => {
                if (cfg) {
                    const exists = standaloneLinks.some(link => link.link === cfg.link);
                    if (!exists) standaloneLinks.push(cfg);
                }
            });
        }

        // Add biller-only links
        if (isBiller) {
            const bLinks = [moduleMap.biller_dashboard];
            bLinks.forEach((cfg) => {
                if (cfg) {
                    const exists = standaloneLinks.some(link => link.link === cfg.link);
                    if (!exists) standaloneLinks.push(cfg);
                }
            });
        }

        // Add lab-only links
        if (isLab) {
            const lLinks = [moduleMap.lab_dashboard];
            lLinks.forEach((cfg) => {
                if (cfg) {
                    const exists = standaloneLinks.some(link => link.link === cfg.link);
                    if (!exists) standaloneLinks.push(cfg);
                }
            });
        }

        // Add nurse-only links
        if (isNurse) {
            const nLinks = [moduleMap.nurse_dashboard];
            nLinks.forEach((cfg) => {
                if (cfg) {
                    const exists = standaloneLinks.some(link => link.link === cfg.link);
                    if (!exists) standaloneLinks.push(cfg);
                }
            });
        }

        // Add pharmacist-only links
        if (isPharmacist) {
            const pLinks = [moduleMap.pharmacist_dashboard];
            pLinks.forEach((cfg) => {
                if (cfg) {
                    const exists = standaloneLinks.some(link => link.link === cfg.link);
                    if (!exists) standaloneLinks.push(cfg);
                }
            });
        }

        // Sort links alphabetically by label
        standaloneLinks.sort((a, b) => a.label.localeCompare(b.label));
        inventoryLinks.sort((a, b) => a.label.localeCompare(b.label));

        // Add standalone links to sidebar
        standaloneLinks.forEach((config) => {
            if (!sidebarLinks) return;
            const link = document.createElement('a');
            link.href = config.link;
            link.classList.add('sidebar-link', 'd-block', 'px-3', 'py-2');

            // Create icon element
            const icon = document.createElement('i');
            icon.className = `${config.icon} me-2`;

            // Create text node
            const text = document.createTextNode(config.label);

            // Append icon and text to link
            link.appendChild(icon);
            link.appendChild(text);

            sidebarLinks.appendChild(link);
        });

        // Add inventory links to accordion
        inventoryLinks.forEach((config) => {
            if (!accordionBody) return;
            const link = document.createElement('a');
            link.href = config.link;
            link.classList.add('sidebar-link', 'd-block', 'px-3', 'py-2');

            // Create icon element
            const icon = document.createElement('i');
            icon.className = `${config.icon} me-2`;

            // Create text node
            const text = document.createTextNode(config.label);

            // Append icon and text to link
            link.appendChild(icon);
            link.appendChild(text);

            accordionBody.appendChild(link);
        });

        // Hide inventory accordion if no links
        if (inventoryLinks.length === 0 && inventoryAccordionItem) {
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
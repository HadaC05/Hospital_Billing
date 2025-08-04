console.log('dashboard.js is working');

document.addEventListener('DOMContentLoaded', async () => {

    const baseApiUrl = 'http://localhost/hospital_billing/api';
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('No user data found. Redirecting to loging.');
        window.location.href = '../index.html';
        return;
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
            'manage_users': 'User Management Module',
            'manage_roles': 'Role Settings',
            'manage_rooms': 'Room Management',
            'view_admissions': 'Admission Records',
            'edit_admissions': 'Admission Editor',
            'access_billing': 'Billing Overview',
            'generate_invoice': 'Invoice Generator',
            'manage_medicine': 'Pharmacy Module',
            'manage_labtests': 'Laboratory Management',
            'manage_surgeries': 'Surgical Scheduling',
            'manage_treatments': 'Treatment Configurator',
            'view_patient_records': 'Patient Records Viewer',
            'approve_insurance': 'Insurance Approval Panel'
        };

        permissions.forEach(permission => {
            const label = moduleMap[permission] || permission;

            const link = document.createElement('a');
            link.href = "#";
            link.classList.add('d-block', 'mb-2');
            link.textContent = label;
            sidebar.appendChild(link);

            const moduleSection = document.createElement('div');
            moduleSection.innerHTML = `<h3>${label}</h3><p>Module coming soon...</p>`;
            content.appendChild(moduleSection);
        });
    }
});

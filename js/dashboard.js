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
            'manage_medicine': { label: 'Medicine Module', link: 'inv-medicine.html' },
            'manage_labtests': { label: 'Laboratory Module', link: 'inv-surgery.html' },
            'manage_surgeries': 'Surgical Module',
            'manage_treatments': 'Treatment Module',
            'view_patient_records': 'Patient Records Viewer',
            'approve_insurance': 'Insurance Approval Panel'
        };

        permissions.forEach(permission => {
            const module = moduleMap[permission];
            if (!module) return;

            const link = document.createElement('a');
            link.href = `../module/${module.link}`;
            link.classList.add('d-block', 'mb-2');
            link.textContent = module.label;
            sidebar.appendChild(link);
        });
    }
});

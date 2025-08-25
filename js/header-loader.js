console.log('header-loader.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for sidebar to be loaded first
    await waitForSidebar();
    await loadHeader();
    updateModuleName();
});

async function waitForSidebar() {
    return new Promise((resolve) => {
        const checkSidebar = () => {
            if (document.getElementById('sidebar')) {
                resolve();
            } else {
                setTimeout(checkSidebar, 50);
            }
        };
        checkSidebar();
    });
}

async function loadHeader() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    if (!headerPlaceholder) {
        return; // page without header
    }

    try {
        const headerResponse = await axios.get('../components/header.html');
        if (!headerResponse?.data) return;

        headerPlaceholder.innerHTML = headerResponse.data;

        // Apply actual header height to CSS variable so content/side offsets are correct
        const headerEl = document.querySelector('#header-placeholder > header');
        const setHeaderHeightVar = () => {
            if (!headerEl) return;
            const h = headerEl.offsetHeight;
            document.documentElement.style.setProperty('--header-height', `${h}px`);
        };
        setHeaderHeightVar();
        window.addEventListener('resize', setHeaderHeightVar);

        // Set up hamburger button functionality (click-to-hide/show)
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const sidebarElement = document.getElementById('sidebar');
        const pageContainer = document.getElementById('page-container');

        // Restore hidden state to match sidebar.js
        const isHidden = localStorage.getItem('sidebarHidden') === 'true';
        if (isHidden && sidebarElement) {
            sidebarElement.classList.add('hidden');
            if (pageContainer) pageContainer.classList.add('sidebar-hidden');
        }

        if (hamburgerBtn && sidebarElement) {
            hamburgerBtn.addEventListener('click', () => {
                const nowHidden = !sidebarElement.classList.contains('hidden');
                sidebarElement.classList.toggle('hidden', nowHidden);
                if (pageContainer) pageContainer.classList.toggle('sidebar-hidden', nowHidden);
                localStorage.setItem('sidebarHidden', String(nowHidden));
            });
        }

        // Set up logout button functionality
        await setupLogoutButton();
    } catch (err) {
        console.error('Failed to load header: ', err);
    }
}

async function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (!logoutBtn) return;

    const baseApiUrl = `${window.location.origin}/hospital_billing/api`;

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

function updateModuleName() {
    const moduleNameElement = document.getElementById('module-name');
    if (!moduleNameElement) return;

    // Get the current page title or path to determine module name
    const currentPath = window.location.pathname;
    const pageTitle = document.title;

    // Extract module name from various sources
    let moduleName = 'Module Name';
    let moduleIcon = 'fas fa-user-tag'; // Default icon

    // Try to get from page title first
    if (pageTitle && pageTitle.includes(' - ')) {
        moduleName = pageTitle.split(' - ')[1];
    } else {
        // Fallback to path-based detection
        const pathParts = currentPath.split('/');
        const fileName = pathParts[pathParts.length - 1];

        if (fileName && fileName !== 'index.html') {
            // Remove .html extension and convert to readable format
            moduleName = fileName.replace('.html', '')
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }
    }

    // Special cases for better naming and icons
    const moduleConfig = {
        'dashboard': { name: 'Dashboard', icon: 'fas fa-chart-line' },
        'user-management': { name: 'User Management', icon: 'fas fa-users' },
        'role-settings': { name: 'Role Settings', icon: 'fas fa-user-shield' },
        'admission-records': { name: 'Admission Records', icon: 'fas fa-bed' },
        'admission-editor': { name: 'Admission Editor', icon: 'fas fa-edit' },
        'billing-overview': { name: 'Billing Overview', icon: 'fas fa-file-invoice-dollar' },
        'invoice-generator': { name: 'Invoice Generator', icon: 'fas fa-receipt' },
        'patient-records': { name: 'Patient Records', icon: 'fas fa-user-injured' },
        'insurance-approval': { name: 'Insurance Approval', icon: 'fas fa-shield-alt' },
        'inv-medicine': { name: 'Medicine Management', icon: 'fas fa-pills' },
        'inv-surgery': { name: 'Surgery Management', icon: 'fas fa-user-md' },
        'inv-labtest': { name: 'Laboratory Management', icon: 'fas fa-flask' },
        'inv-treatments': { name: 'Treatment Management', icon: 'fas fa-stethoscope' },
        'inv-rooms': { name: 'Room Management', icon: 'fas fa-door-open' },
        'type-medicine': { name: 'Medicine Types', icon: 'fas fa-tags' },
        'type-room': { name: 'Room Types', icon: 'fas fa-list' },
        'type-surgery': { name: 'Surgery Types', icon: 'fas fa-list-alt' },
        'type-treatment': { name: 'Treatment Types', icon: 'fas fa-list-ul' },
        'type-labtest': { name: 'Lab Test Types', icon: 'fas fa-list-check' }
    };

    // Check if we have a mapped configuration
    const fileName = currentPath.split('/').pop().replace('.html', '');
    if (moduleConfig[fileName]) {
        moduleName = moduleConfig[fileName].name;
        moduleIcon = moduleConfig[fileName].icon;
    }

    // Update the module name
    moduleNameElement.textContent = moduleName;

    // Update the icon if it exists
    const iconElement = document.querySelector('#module-name').previousElementSibling;
    if (iconElement && iconElement.tagName === 'I') {
        iconElement.className = `${moduleIcon} me-2 medical-icon`;
    }
}

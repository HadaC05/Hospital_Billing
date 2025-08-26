console.log('header-loader.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
<<<<<<< HEAD
    // Wait for sidebar to be loaded first
    await waitForSidebar();
    await loadHeader();
    updateModuleName();
});

=======
    // Load header immediately so hamburger and logout appear fast
    await loadHeader();
    // Try to bind hamburger now and also when sidebar arrives
    bindHamburgerWithRetry();
    updateModuleName();
});

// Kept for backward compatibility but no longer used to block header
>>>>>>> test_merge
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
<<<<<<< HEAD
        if (!headerResponse?.data) return;

        headerPlaceholder.innerHTML = headerResponse.data;

        // Set up hamburger button functionality
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const sidebarElement = document.getElementById('sidebar');

        if (hamburgerBtn && sidebarElement) {
            hamburgerBtn.addEventListener('click', () => {
                sidebarElement.classList.toggle('collapsed');
                localStorage.setItem('sidebarCollapsed', sidebarElement.classList.contains('collapsed'));
            });
        }

        // Restore sidebar collapsed state if it exists
        if (localStorage.getItem('sidebarCollapsed') === 'true' && sidebarElement) {
            sidebarElement.classList.add('collapsed');
        }

=======
        if (!headerResponse?.data) {
            injectFallbackHeader(headerPlaceholder);
        } else {
            headerPlaceholder.innerHTML = headerResponse.data;
        }

        // Sync sidebar offset with actual header height
        const headerEl = headerPlaceholder.querySelector('header');
        if (headerEl) {
            const setHeaderVar = () => {
                const h = headerEl.offsetHeight;
                document.documentElement.style.setProperty('--header-height', `${h}px`);
            };
            setHeaderVar();
            // Update on resize in case header height changes responsively
            window.addEventListener('resize', setHeaderVar);
        }

        // Try initial hamburger bind (sidebar may not be present yet)
        tryBindHamburger();

>>>>>>> test_merge
        // Set up logout button functionality
        await setupLogoutButton();
    } catch (err) {
        console.error('Failed to load header: ', err);
<<<<<<< HEAD
    }
}

=======
        injectFallbackHeader(headerPlaceholder);
    }
}

function injectFallbackHeader(headerPlaceholder) {
    if (!headerPlaceholder) return;
    headerPlaceholder.innerHTML = `
    <header class="d-flex align-items-center p-2 border-bottom bg-white shadow-sm">
        <button id="hamburger-btn" class="btn btn-outline-primary me-3"><i class="fas fa-bars"></i></button>
        <h4 class="m-0"><i class="fas fa-user-tag me-2 medical-icon"></i><span id="module-name">Module Name</span></h4>
        <div class="ms-auto d-flex align-items-center">
            <span class="badge bg-primary me-2"><i class="fas fa-hospital me-1"></i>Hospital</span>
            <button id="logout-btn" class="btn btn-outline-danger btn-sm"><i class="fas fa-sign-out-alt me-1"></i> Logout</button>
        </div>
    </header>`;
    tryBindHamburger();
    setupLogoutButton();
}

function tryBindHamburger() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const sidebarElement = document.getElementById('sidebar');
    const pageContainer = document.getElementById('page-container');
    if (hamburgerBtn && sidebarElement) {
        // Avoid duplicate listeners
        if (!hamburgerBtn.__bound) {
            hamburgerBtn.addEventListener('click', () => {
                const collapsed = !sidebarElement.classList.contains('collapsed');
                sidebarElement.classList.toggle('collapsed', collapsed);
                if (pageContainer) pageContainer.classList.toggle('sidebar-collapsed', collapsed);
                localStorage.setItem('sidebarCollapsed', collapsed);
            });
            hamburgerBtn.__bound = true;
        }

        // Restore sidebar state
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebarElement.classList.add('collapsed');
            if (pageContainer) pageContainer.classList.add('sidebar-collapsed');
        }
        return true;
    }
    return false;
}

function bindHamburgerWithRetry() {
    if (tryBindHamburger()) return;
    // Retry until sidebar appears or timeout
    let attempts = 0;
    const maxAttempts = 60; // ~3s at 50ms
    const iv = setInterval(() => {
        attempts++;
        if (tryBindHamburger() || attempts >= maxAttempts) {
            clearInterval(iv);
        }
    }, 50);
}

>>>>>>> test_merge
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
<<<<<<< HEAD
            alert('Logout failed. Please try again.');
=======
            Swal.fire({
                title: 'Logout Failed',
                text: 'Logout failed. Please try again.',
                icon: 'error'
            });
>>>>>>> test_merge
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

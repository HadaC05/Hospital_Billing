/**
 * Hospital Billing System Theme Loader
 * This script loads the Font Awesome icons and applies the hospital theme to all pages
 */

document.addEventListener('DOMContentLoaded', function () {
    // Add Font Awesome if not already present
    if (!document.querySelector('link[href*="fontawesome"]')) {
        const fontAwesomeCSS = document.createElement('link');
        fontAwesomeCSS.rel = 'stylesheet';
        fontAwesomeCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        fontAwesomeCSS.integrity = 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==';
        fontAwesomeCSS.crossOrigin = 'anonymous';
        document.head.appendChild(fontAwesomeCSS);
    }

    // Add hospital theme CSS if not already present
    if (!document.querySelector('link[href*="hospital-theme.css"]')) {
        const themeCSS = document.createElement('link');
        themeCSS.rel = 'stylesheet';
        themeCSS.href = '/hospital_billing/css/hospital-theme.css';
        document.head.appendChild(themeCSS);
    }

    // Apply theme enhancements
    applyThemeEnhancements();
});

/**
 * Apply theme enhancements to the current page
 */
function applyThemeEnhancements() {
    // Enhance login page
    enhanceLoginPage();

    // Enhance sidebar
    enhanceSidebar();

    // Enhance tables
    enhanceTables();

    // Enhance cards
    enhanceCards();

    // Enhance buttons
    enhanceButtons();

    // Add medical icons to appropriate elements
    addMedicalIcons();
}

/**
 * Enhance the login page with icons and styling
 */
function enhanceLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // Replace the SVG with Font Awesome icon
    const svgIcon = document.querySelector('.bi-person-circle');
    if (svgIcon) {
        const iconContainer = svgIcon.parentElement;
        svgIcon.remove();

        const icon = document.createElement('i');
        icon.className = 'fas fa-user-md login-icon text-center d-block mx-auto';
        iconContainer.prepend(icon);
    }

    // Bootstrap 5: do not inject input-group-prepend icons; keep fields clean
    // Also remove any legacy/pre-injected prepend wrappers if present
    document.querySelectorAll('.input-group-prepend').forEach(el => el.remove());

    // Enhance login card
    const loginCard = document.querySelector('.card');
    if (loginCard) {
        loginCard.classList.add('login-card');
    }
}

/**
 * Enhance the sidebar with icons
 */
function enhanceSidebar() {
    const sidebarLinks = document.querySelectorAll('#sidebar-links a');
    if (sidebarLinks.length === 0) return;

    // Map of link text to Font Awesome icons
    const iconMap = {
        'Dashboard': 'fa-chart-line',
        'Patients': 'fa-hospital-user',
        'Admissions': 'fa-bed',
        'Billing': 'fa-file-invoice-dollar',
        'Insurance': 'fa-shield-alt',
        'Invoices': 'fa-receipt',
        'Rooms': 'fa-door-open',
        'Medications': 'fa-pills',
        'Lab Tests': 'fa-flask',
        'Surgeries': 'fa-procedures',
        'Treatments': 'fa-stethoscope',
        'Reports': 'fa-chart-bar',
        'Settings': 'fa-cog',
        'Users': 'fa-users'
    };

    // Add icons to sidebar links
    sidebarLinks.forEach(link => {
        const linkText = link.textContent.trim();
        const iconClass = iconMap[linkText] || 'fa-circle'; // Default icon

        const icon = document.createElement('i');
        icon.className = `fas ${iconClass} me-2`;
        link.prepend(icon);
    });

    // Enhance logout button
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt me-2"></i> Logout';
    }

    // Enhance accordion headers
    const accordionButtons = document.querySelectorAll('.accordion-button');
    accordionButtons.forEach(button => {
        const buttonText = button.textContent.trim();
        let iconClass = 'fa-th-list'; // Default icon

        if (buttonText.includes('Inventory')) {
            iconClass = 'fa-boxes';
        } else if (buttonText.includes('Reports')) {
            iconClass = 'fa-chart-bar';
        } else if (buttonText.includes('Admin')) {
            iconClass = 'fa-user-shield';
        }

        const icon = document.createElement('i');
        icon.className = `fas ${iconClass} me-2`;
        button.prepend(icon);
    });
}

/**
 * Enhance tables with icons and styling
 */
function enhanceTables() {
    const tables = document.querySelectorAll('.table');
    if (tables.length === 0) return;

    tables.forEach(table => {
        // Add Bootstrap table classes if not present
        table.classList.add('table-striped', 'table-hover');

        // Enhance action buttons in tables
        const actionButtons = table.querySelectorAll('button, .btn');
        actionButtons.forEach(button => {
            if (button.textContent.includes('Edit') && !button.querySelector('i')) {
                button.innerHTML = '<i class="fas fa-edit"></i> ' + button.textContent;
            } else if (button.textContent.includes('Delete') && !button.querySelector('i')) {
                button.innerHTML = '<i class="fas fa-trash-alt"></i> ' + button.textContent;
            } else if (button.textContent.includes('View') && !button.querySelector('i')) {
                button.innerHTML = '<i class="fas fa-eye"></i> ' + button.textContent;
            } else if (button.textContent.includes('Add') && !button.querySelector('i')) {
                button.innerHTML = '<i class="fas fa-plus"></i> ' + button.textContent;
            }
        });
    });
}

/**
 * Enhance cards with icons and styling
 */
function enhanceCards() {
    const cards = document.querySelectorAll('.card');
    if (cards.length === 0) return;

    cards.forEach(card => {
        // Add shadow and border radius if not already styled
        if (!card.classList.contains('login-card')) {
            card.classList.add('shadow-sm');
        }

        // Enhance card headers with icons based on content
        const cardHeader = card.querySelector('.card-header');
        if (cardHeader && !cardHeader.querySelector('i')) {
            const headerText = cardHeader.textContent.trim().toLowerCase();
            let iconClass = 'fa-list'; // Default icon

            if (headerText.includes('patient')) {
                iconClass = 'fa-hospital-user';
            } else if (headerText.includes('billing') || headerText.includes('invoice')) {
                iconClass = 'fa-file-invoice-dollar';
            } else if (headerText.includes('insurance')) {
                iconClass = 'fa-shield-alt';
            } else if (headerText.includes('room')) {
                iconClass = 'fa-door-open';
            } else if (headerText.includes('medicine') || headerText.includes('medication')) {
                iconClass = 'fa-pills';
            } else if (headerText.includes('lab')) {
                iconClass = 'fa-flask';
            } else if (headerText.includes('surgery')) {
                iconClass = 'fa-procedures';
            } else if (headerText.includes('treatment')) {
                iconClass = 'fa-stethoscope';
            }

            const icon = document.createElement('i');
            icon.className = `fas ${iconClass} me-2`;
            cardHeader.prepend(icon);
        }
    });
}

/**
 * Enhance buttons with icons
 */
function enhanceButtons() {
    const buttons = document.querySelectorAll('button, .btn');
    if (buttons.length === 0) return;

    buttons.forEach(button => {
        // Skip buttons that already have icons
        if (button.querySelector('i') || button.querySelector('svg')) return;

        const buttonText = button.textContent.trim().toLowerCase();
        let iconClass = null;

        // Determine icon based on button text
        if (buttonText.includes('add') || buttonText.includes('new') || buttonText.includes('create')) {
            iconClass = 'fa-plus';
        } else if (buttonText.includes('edit') || buttonText.includes('update')) {
            iconClass = 'fa-edit';
        } else if (buttonText.includes('delete') || buttonText.includes('remove')) {
            iconClass = 'fa-trash-alt';
        } else if (buttonText.includes('save')) {
            iconClass = 'fa-save';
        } else if (buttonText.includes('cancel')) {
            iconClass = 'fa-times';
        } else if (buttonText.includes('search')) {
            iconClass = 'fa-search';
        } else if (buttonText.includes('print')) {
            iconClass = 'fa-print';
        } else if (buttonText.includes('download')) {
            iconClass = 'fa-download';
        } else if (buttonText.includes('upload')) {
            iconClass = 'fa-upload';
        } else if (buttonText.includes('login')) {
            iconClass = 'fa-sign-in-alt';
        } else if (buttonText.includes('logout')) {
            iconClass = 'fa-sign-out-alt';
        } else if (buttonText.includes('submit')) {
            iconClass = 'fa-paper-plane';
        }

        // Add icon if one was determined
        if (iconClass) {
            const icon = document.createElement('i');
            icon.className = `fas ${iconClass} me-2`;
            button.prepend(icon);
        }
    });
}

/**
 * Add medical icons to appropriate elements
 */
function addMedicalIcons() {
    // Add status icons to status indicators
    const statusElements = document.querySelectorAll('.status');
    statusElements.forEach(element => {
        const status = element.textContent.trim().toLowerCase();
        let iconClass = 'fa-circle'; // Default icon
        let statusClass = '';

        if (status.includes('active') || status.includes('approved')) {
            iconClass = 'fa-check-circle';
            statusClass = 'status-active';
        } else if (status.includes('pending') || status.includes('waiting')) {
            iconClass = 'fa-clock';
            statusClass = 'status-pending';
        } else if (status.includes('inactive') || status.includes('rejected') || status.includes('cancelled')) {
            iconClass = 'fa-times-circle';
            statusClass = 'status-inactive';
        }

        const icon = document.createElement('i');
        icon.className = `fas ${iconClass} me-1`;
        if (statusClass) {
            icon.classList.add(statusClass);
            element.classList.add(statusClass);
        }
        element.prepend(icon);
    });

    // Add medical icons to headers
    const headers = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headers.forEach(header => {
        // Skip headers that already have icons
        if (header.querySelector('i') || header.querySelector('svg')) return;

        const headerText = header.textContent.trim().toLowerCase();
        let iconClass = null;

        if (headerText.includes('patient')) {
            iconClass = 'fa-hospital-user';
        } else if (headerText.includes('billing') || headerText.includes('invoice')) {
            iconClass = 'fa-file-invoice-dollar';
        } else if (headerText.includes('insurance')) {
            iconClass = 'fa-shield-alt';
        } else if (headerText.includes('dashboard')) {
            iconClass = 'fa-chart-line';
        } else if (headerText.includes('room')) {
            iconClass = 'fa-door-open';
        } else if (headerText.includes('medicine') || headerText.includes('medication')) {
            iconClass = 'fa-pills';
        } else if (headerText.includes('lab')) {
            iconClass = 'fa-flask';
        } else if (headerText.includes('surgery')) {
            iconClass = 'fa-procedures';
        } else if (headerText.includes('treatment')) {
            iconClass = 'fa-stethoscope';
        } else if (headerText.includes('report')) {
            iconClass = 'fa-chart-bar';
        } else if (headerText.includes('setting')) {
            iconClass = 'fa-cog';
        } else if (headerText.includes('user')) {
            iconClass = 'fa-users';
        }

        // Add icon if one was determined
        if (iconClass) {
            const icon = document.createElement('i');
            icon.className = `fas ${iconClass} me-2 medical-icon`;
            header.prepend(icon);
        }
    });
}
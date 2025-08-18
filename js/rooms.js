console.log('rooms.js is working');
const baseApiUrl = '../api';
// Load room list and populate room types in a single DOMContentLoaded event
document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }
    
    // Check if user has permission to manage rooms
    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });
        const data = response.data;
        if (!data.success || !data.permissions.includes('manage_rooms')) {
            alert('You do not have permission to access this page.');
            window.location.href = '../components/dashboard.html';
            return;
        }
        
        // Store permissions for sidebar rendering
        window.userPermissions = data.permissions;
    } catch (error) {
        console.error('Error checking permissions:', error);
        alert('Failed to verify permissions. Please try again.');
        window.location.href = '../components/dashboard.html';
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
        
        // Set user name in sidebar
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.full_name || user.username;
        }
        
        // Render navigation modules based on permissions
        if (window.userPermissions) {
            renderModules(window.userPermissions);
        }
    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }
    
    // Function to render sidebar modules
    function renderModules(permissions) {
        const moduleMap = {
            'dashboard': { label: 'Dashboard', link: '../components/dashboard.html' },
            'manage_users': { label: 'Manage Users', link: 'user-management.html' },
            'manage_roles': { label: 'Role Settings', link: 'role-settings.html' },
            'view_admissions': { label: 'Admission Records', link: 'admission-records.html' },
            'edit_admissions': { label: 'Admission Editor', link: 'admission-editor.html' },
            'access_billing': { label: 'Billing Overview', link: 'billing-overview.html' },
            'generate_invoice': { label: 'Invoice Generator', link: 'invoice-generator.html' },
            'view_patient_records': { label: 'Patient Records Viewer', link: 'patient-records.html' },
            'approve_insurance': { label: 'Insurance Approval Panel', link: 'insurance-approval.html' },
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
        
        // Clear existing links
        if (sidebarLinks) sidebarLinks.innerHTML = '';
        if (accordionBody) accordionBody.innerHTML = '';
        
        // Add standalone navigation links
        permissions.forEach(permission => {
            if (moduleMap[permission]) {
                const { label, link } = moduleMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white', 'text-decoration-none');
                a.innerHTML = `<i class="fas fa-chevron-right me-2"></i>${label}`;
                
                if (sidebarLinks) {
                    sidebarLinks.appendChild(a);
                }
            }
        });
        
        // Add inventory modules to accordion
        let inventoryShown = false;
        permissions.forEach(permission => {
            if (inventoryMap[permission]) {
                const { label, link } = inventoryMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-dark', 'text-decoration-none', 'border-bottom', 'border-light');
                a.innerHTML = `<i class="fas fa-box me-2 text-primary"></i>${label}`;
                
                // Highlight current page
                if (link === 'inv-rooms.html') {
                    a.classList.add('bg-primary', 'bg-opacity-25');
                }
                
                // Add hover effects
                a.addEventListener('mouseenter', () => {
                    a.classList.add('bg-light');
                });
                a.addEventListener('mouseleave', () => {
                    if (!a.classList.contains('bg-primary')) {
                        a.classList.remove('bg-light');
                    }
                });
                
                if (accordionBody) {
                    accordionBody.appendChild(a);
                }
                inventoryShown = true;
            }
        });
        
        // Show/hide inventory accordion based on permissions
        const inventoryAccordion = document.querySelector('#invHeading').parentElement;
        if (inventoryAccordion) {
            inventoryAccordion.style.display = inventoryShown ? 'block' : 'none';
        }
    }
    
    // Initialize room functionality
    loadRooms();
    loadRoomTypesForFilter();
    setupEventListeners();
    
    // Add Actions column to table header if it doesn't exist
    const tableHeader = document.querySelector('table thead tr');
    if (tableHeader && tableHeader.children.length === 5) {
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Actions';
        tableHeader.appendChild(actionsHeader);
    }
});
// Global variables
let rooms = [];
let filteredRooms = [];
// Load room list
async function loadRooms() {
    const tableBody = document.getElementById('room-list');
    if (!tableBody) {
        console.error('Room table body not found.');
        return;
    }
    
    tableBody.innerHTML = '<tr><td colspan="6">Loading rooms...</td></tr>';
    
    try {
        const response = await axios.get(`${baseApiUrl}/get-rooms.php`, {
            params: {
                operation: 'getRooms',
                json: JSON.stringify({})
            }
        });
        
        const data = response.data;
        if (data.success && Array.isArray(data.rooms)) {
            rooms = data.rooms;
            filteredRooms = rooms;
            console.log('Rooms loaded:', rooms);
            console.log('Sample room data:', rooms[0]);
            renderRoomTable();
        } else {
            tableBody.innerHTML = `<tr><td colspan="6">${data.message || 'No data found.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading rooms: ', error);
        tableBody.innerHTML = '<tr><td colspan="6">Failed to load rooms.</td></tr>';
    }
}
// Render room table with current filtered data
function renderRoomTable() {
    const tableBody = document.getElementById('room-list');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (filteredRooms.length > 0) {
        filteredRooms.forEach(room => {
            const isAvailable = room.is_available == 1 ? 'Available' : 'Not Available';
            const statusBadge = room.is_available == 1 ? 
                '<span class="status-badge available">Available</span>' : 
                '<span class="status-badge occupied">Occupied</span>';
            
            const row = `
                <tr>
                    <td>${room.room_number}</td>
                    <td>${room.room_type_name}</td>
                    <td>${room.daily_rate}</td>
                    <td>${room.max_occupancy}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-warning btn-sm update-room" data-id="${room.room_id}">Update</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="6">No rooms found.</td></tr>';
    }
}
// Search and Filter Functions
function applyRoomFilters() {
    const searchTerm = document.getElementById('searchRoom').value.toLowerCase();
    const typeFilter = document.getElementById('filterRoomType').value;
    const statusFilter = document.getElementById('filterRoomStatus').value;
    
    console.log('Filter values:', { typeFilter, statusFilter, searchTerm });
    
    filteredRooms = rooms.filter(room => {
        const matchesSearch = room.room_number.toLowerCase().includes(searchTerm) ||
                            room.room_type_name.toLowerCase().includes(searchTerm);
        
        // Convert both to strings for consistent comparison
        const roomTypeId = String(room.room_type_id);
        const filterTypeId = String(typeFilter);
        const matchesType = !typeFilter || roomTypeId === filterTypeId;
        
        // Convert both to strings for consistent comparison
        const roomStatus = String(room.is_available);
        const filterStatus = String(statusFilter);
        const matchesStatus = statusFilter === '' || roomStatus === filterStatus;
        
        console.log('Room:', room.room_number, 
                   'Type ID:', room.room_type_id, 'Filter:', typeFilter, 'Matches:', matchesType,
                   'Status:', room.is_available, 'Status Filter:', statusFilter, 'Matches:', matchesStatus);
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    console.log('Filtered rooms count:', filteredRooms.length);
    renderRoomTable();
}
// Load room types for filter dropdown
async function loadRoomTypesForFilter() {
    try {
        const response = await axios.get(`${baseApiUrl}/get-rooms.php`, {
            params: { operation: 'getRoomTypes', json: JSON.stringify({}) }
        });
        
        if (response.data.success && Array.isArray(response.data.types)) {
            console.log('Room types loaded:', response.data.types);
            const options = response.data.types.map(type => 
                `<option value="${type.room_type_id}">${type.room_type_name}</option>`
            ).join('');
            
            const filterTypeSelect = document.getElementById('filterRoomType');
            if (filterTypeSelect) {
                filterTypeSelect.innerHTML = `<option value="">All Types</option>` + options;
            }
        } else {
            console.log('Failed to load room types:', response.data);
        }
    } catch (error) {
        console.error('Error loading room types for filter:', error);
    }
}
// Setup event listeners for search and filters
function setupEventListeners() {
    const searchInput = document.getElementById('searchRoom');
    const typeFilter = document.getElementById('filterRoomType');
    const statusFilter = document.getElementById('filterRoomStatus');
    
    if (searchInput) {
        searchInput.addEventListener('input', applyRoomFilters);
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', applyRoomFilters);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyRoomFilters);
    }
    
    // Setup update button listeners
    const tableBody = document.getElementById('room-list');
    if (tableBody) {
        tableBody.addEventListener('click', async (e) => {
            if (e.target.classList.contains('update-room')) {
                const roomId = e.target.getAttribute('data-id');
                try {
                    const resp = await axios.get(`${baseApiUrl}/get-rooms.php`, {
                        params: { operation: 'getRoom', json: JSON.stringify({ room_id: roomId }) }
                    });
                    
                    if (resp.data.success) {
                        const room = resp.data.room;
                        // Set modal title to indicate update mode
                        document.querySelector('#addRoomModal .modal-title').textContent = 'Update Room';
                        
                        // Populate form fields
                        document.getElementById('room_number').value = room.room_number;
                        await populateModalTypeSelect(room.room_type_id);
                        document.getElementById('daily_rate').value = room.daily_rate;
                        document.getElementById('max_occupancy').value = room.max_occupancy;
                        
                        // Enable status field for updates
                        const statusField = document.getElementById('is_available');
                        statusField.disabled = false;
                        statusField.value = room.is_available;
                        
                        // Store room ID for update operation
                        const form = document.getElementById('addRoomForm');
                        let roomIdInput = document.getElementById('update_room_id');
                        if (!roomIdInput) {
                            roomIdInput = document.createElement('input');
                            roomIdInput.type = 'hidden';
                            roomIdInput.id = 'update_room_id';
                            roomIdInput.name = 'room_id';
                            form.appendChild(roomIdInput);
                        }
                        roomIdInput.value = room.room_id;
                        
                        // Show modal
                        const roomModal = new bootstrap.Modal(document.getElementById('addRoomModal'));
                        roomModal.show();
                    } else {
                        alert(resp.data.message || 'Room not found');
                    }
                } catch (error) {
                    console.error('Error fetching room:', error);
                    alert('Failed to fetch room');
                }
            }
        });
    }
    
    // Setup modal form listener
    const roomModalForm = document.getElementById('addRoomForm');
    if (roomModalForm) {
        roomModalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Check if we're updating or adding
            const roomIdInput = document.getElementById('update_room_id');
            const isUpdate = roomIdInput && roomIdInput.value;
            
            const data = {
                room_number: document.getElementById('room_number').value.trim(),
                room_type_id: document.getElementById('room_type_id').value,
                daily_rate: document.getElementById('daily_rate').value,
                max_occupancy: document.getElementById('max_occupancy').value,
                is_available: document.getElementById('is_available').value
            };
            
            // Add room ID if updating
            if (isUpdate) {
                data.room_id = roomIdInput.value;
            }
            
            try {
                const operation = isUpdate ? 'updateRoom' : 'addRoom';
                const resp = await axios.post(`${baseApiUrl}/get-rooms.php`, {
                    operation: operation,
                    json: JSON.stringify(data)
                });
                
                if (resp.data.success) {
                    alert(isUpdate ? 'Room updated successfully' : 'Room added successfully');
                    window.location.reload();
                } else {
                    alert(resp.data.message || `Failed to ${isUpdate ? 'update' : 'add'} room`);
                }
            } catch (error) {
                console.error(`Error ${isUpdate ? 'updating' : 'adding'} room:`, error);
                alert(`Error ${isUpdate ? 'updating' : 'adding'} room`);
            }
        });
        
        // Reset modal when hidden
        const addRoomModal = document.getElementById('addRoomModal');
        if (addRoomModal) {
            addRoomModal.addEventListener('hidden.bs.modal', function () {
                // Reset form
                roomModalForm.reset();
                
                // Reset modal title
                document.querySelector('#addRoomModal .modal-title').textContent = 'Add Room';
                
                // Disable status field again
                document.getElementById('is_available').disabled = true;
                
                // Remove room ID input if exists
                const roomIdInput = document.getElementById('update_room_id');
                if (roomIdInput) {
                    roomIdInput.remove();
                }
            });
        }
    }
}
// Helper to populate type select in modal
async function populateModalTypeSelect(selectedId) {
    const select = document.getElementById('room_type_id');
    if (!select) {
        console.error('Room type select not found.');
        return;
    }
    
    try {
        const resp = await axios.get(`${baseApiUrl}/get-rooms.php`, {
            params: { operation: 'getRoomTypes', json: JSON.stringify({}) }
        });
        
        if (resp.data.success && Array.isArray(resp.data.types)) {
            select.innerHTML = '';
            resp.data.types.forEach(type => {
                const selected = String(type.room_type_id) === String(selectedId) ? 'selected' : '';
                select.innerHTML += `<option value="${type.room_type_id}" ${selected}>${type.room_type_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading room types:', error);
    }
}
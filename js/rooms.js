console.log('rooms.js is working');
const baseApiUrl = 'http://localhost/hospital_billing/api';

// Load room list and populate room types in a single DOMContentLoaded event
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
            'dashboard': { label: 'Dashboard', link: '../dashboard.html' },
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

    // Room management functionality
    // Load room list
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
            if (data.rooms.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No rooms found.</td></tr>';
            } else {
                tableBody.innerHTML = '';
                data.rooms.forEach(room => {
                    const isAvailable = room.is_available == 1 ? 'Available' : 'Not Available';
                    const row = `
                        <tr>
                            <td>${room.room_number}</td>
                            <td>${room.room_type_name}</td>
                            <td>${room.daily_rate}</td>
                            <td>${room.max_occupancy}</td>
                            <td>${isAvailable}</td>
                            <td>
                                <button class="btn btn-warning btn-sm update-room" data-id="${room.room_id}">Update</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            }
        } else {
            tableBody.innerHTML = `<tr><td colspan="6">${data.message || 'No data found.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading rooms: ', error);
        tableBody.innerHTML = '<tr><td colspan="6">Failed to load rooms.</td></tr>';
    }
    // Populate room types
    const roomTypeSelect = document.getElementById('room_type_id');
    if (roomTypeSelect) {
        try {
            const resp = await axios.get(`${baseApiUrl}/get-rooms.php`, {
                params: { operation: 'getRoomTypes', json: JSON.stringify({}) }
            });
            if (resp.data.success && Array.isArray(resp.data.types)) {
                // Add default "Select room type" option
                roomTypeSelect.innerHTML = '<option value="">Select room type</option>';
                // Then add actual room types
                resp.data.types.forEach(type => {
                    roomTypeSelect.innerHTML += `<option value="${type.room_type_id}">${type.room_type_name}</option>`;
                });
            } else {
                roomTypeSelect.innerHTML = '<option value="">No types found</option>';
            }
        } catch (err) {
            roomTypeSelect.innerHTML = '<option value="">Error loading types</option>';
        }
    }
    // Add Room form handling
    const addRoomForm = document.getElementById('addRoomForm');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                room_number: document.getElementById('room_number').value.trim(),
                room_type_id: document.getElementById('room_type_id').value,
                daily_rate: document.getElementById('daily_rate').value,
                max_occupancy: document.getElementById('max_occupancy').value,
                is_available: document.getElementById('is_available').value
            };
            try {
                const response = await axios.post(`${baseApiUrl}/get-rooms.php`, {
                    operation: 'addRoom',
                    json: JSON.stringify(data)
                });
                const respData = response.data;
                if (respData.success) {
                    alert('Room added successfully');
                    window.location.reload();
                } else {
                    alert(respData.message || 'Failed to add room');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding room');
            }
        });
    } else {
        console.error('Add Room form not found.');
    }
    // Add modal HTML if not present
    if (!document.getElementById('roomModal')) {
        const modalHtml = `
        <div class="modal fade" id="roomModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <form id="roomModalForm" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Update Room</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="modal_room_id">
                        <div class="mb-2">
                            <label>Room Number</label>
                            <input type="text" class="form-control" id="modal_room_number" required>
                        </div>
                        <div class="mb-2">
                            <label>Room Type</label>
                            <select class="form-select" id="modal_room_type_id" required></select>
                        </div>
                        <div class="mb-2">
                            <label>Daily Rate</label>
                            <input type="number" class="form-control" id="modal_daily_rate" required>
                        </div>
                        <div class="mb-2">
                            <label>Max Occupancy</label>
                            <input type="number" class="form-control" id="modal_max_occupancy" required>
                        </div>
                        <div class="mb-2">
                            <label>Status</label>
                            <select class="form-select" id="modal_is_available">
                                <option value="1">Available</option>
                                <option value="0">Not Available</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Update</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    // Helper to populate type select in modal
    async function populateModalTypeSelect(selectedId) {
        const select = document.getElementById('modal_room_type_id');
        try {
            const resp = await axios.get(`${baseApiUrl}/get-rooms.php`, {
                params: { operation: 'getRoomTypes', json: JSON.stringify({}) }
            });
            if (resp.data.success && Array.isArray(resp.data.types)) {
                select.innerHTML = '';
                resp.data.types.forEach(type => {
                    select.innerHTML += `<option value="${type.room_type_id}" ${type.room_type_id == selectedId ? 'selected' : ''}>${type.room_type_name}</option>`;
                });
            }
        } catch { }
    }
    // Update button logic
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('update-room')) {
            const roomId = e.target.getAttribute('data-id');
            try {
                const resp = await axios.get(`${baseApiUrl}/get-rooms.php`, {
                    params: { operation: 'getRoom', json: JSON.stringify({ room_id: roomId }) }
                });
                if (resp.data.success) {
                    const room = resp.data.room;
                    document.getElementById('modal_room_id').value = room.room_id;
                    document.getElementById('modal_room_number').value = room.room_number;
                    await populateModalTypeSelect(room.room_type_id);
                    document.getElementById('modal_daily_rate').value = room.daily_rate;
                    document.getElementById('modal_max_occupancy').value = room.max_occupancy;
                    document.getElementById('modal_is_available').value = room.is_available;
                    new bootstrap.Modal(document.getElementById('roomModal')).show();
                } else {
                    alert(resp.data.message || 'Room not found');
                }
            } catch {
                alert('Failed to fetch room');
            }
        }
    });
    // Update logic
    document.getElementById('roomModalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            room_id: document.getElementById('modal_room_id').value,
            room_number: document.getElementById('modal_room_number').value.trim(),
            room_type_id: document.getElementById('modal_room_type_id').value,
            daily_rate: document.getElementById('modal_daily_rate').value,
            max_occupancy: document.getElementById('modal_max_occupancy').value,
            is_available: document.getElementById('modal_is_available').value
        };
        try {
            const resp = await axios.post(`${baseApiUrl}/get-rooms.php`, {
                operation: 'updateRoom',
                json: JSON.stringify(data)
            });
            if (resp.data.success) {
                alert('Room updated successfully');
                window.location.reload();
            } else {
                alert(resp.data.message || 'Failed to update room');
            }
        } catch {
            alert('Error updating room');
        }
    });
});
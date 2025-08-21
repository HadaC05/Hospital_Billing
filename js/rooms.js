console.log('rooms.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Room management functionality
    const tableBody = document.getElementById('room-list');
    let rooms = [];

    // Modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editRoomModal'));

    // Form elements
    const addForm = document.getElementById('addRoomForm');
    const editForm = document.getElementById('editRoomForm');

    // Button event listeners
    document.getElementById('saveRoomBtn').addEventListener('click', saveRoom);
    document.getElementById('updateRoomBtn').addEventListener('click', updateRoom);

    // Load room types
    async function loadRoomTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-rooms.php`, {
                params: { operation: 'getRoomTypes' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.room_type_id}">${type.room_type_name}</option>`;
                }).join('');

                // Populate dropdowns
                const addTypeSelect = document.getElementById('room_type_id');
                const editTypeSelect = document.getElementById('edit_room_type_id');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
            } else {
                const addTypeSelect = document.getElementById('room_type_id');
                const editTypeSelect = document.getElementById('edit_room_type_id');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">No types available</option>`;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">No types available</option>`;
            }
        } catch (error) {
            console.error('Failed to load room types', error);
        }
    }

    // Load room list
    async function loadRooms() {
        if (!tableBody) {
            console.error('Room table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="6">Loading rooms...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-rooms.php`, {
                params: { operation: 'getRooms' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.rooms)) {
                rooms = data.rooms;

                if (rooms.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="6">No rooms found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                rooms.forEach(room => {
                    const availability = room.is_available == 1 ? 'Available' : 'Not Available';
                    const statusBadge = room.is_available == 1 ? 'badge bg-success' : 'badge bg-secondary';

                    const row = `
                        <tr>
                            <td>${room.room_number}</td>
                            <td>${room.room_type_name}</td>
                            <td>₱${parseFloat(room.daily_rate).toFixed(2)}</td>
                            <td>${room.max_occupancy}</td>
                            <td><span class="${statusBadge}">${availability}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="editRoom(${room.room_id})" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="6">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading rooms: ', error);
            tableBody.innerHTML = '<tr><td colspan="6">Failed to load rooms</td></tr>';
        }
    }

    // Create new room
    async function saveRoom() {
        const roomNumber = document.getElementById('room_number').value.trim();
        const typeId = document.getElementById('room_type_id').value;
        const dailyRate = document.getElementById('daily_rate').value;
        const maxOccupancy = document.getElementById('max_occupancy').value;

        if (!roomNumber || !typeId || !dailyRate || !maxOccupancy) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields.',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-rooms.php`, {
                operation: 'addRoom',
                json: JSON.stringify({
                    room_number: roomNumber,
                    room_type_id: parseInt(typeId),
                    daily_rate: parseFloat(dailyRate),
                    max_occupancy: parseInt(maxOccupancy),
                    is_available: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Room added successfully!',
                    icon: 'success'
                });
                addModal.hide();
                addForm.reset();
                await loadRooms();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: 'Failed to add room.',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding room:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to add room.',
                icon: 'error'
            });
        }
    }

    // Edit room
    window.editRoom = async function (roomId) {
        const room = rooms.find(r => r.room_id == roomId);
        if (!room) {
            Swal.fire({
                title: 'Warning',
                text: 'Room not found.',
                icon: 'warning'
            });
            return;
        }

        document.getElementById('edit_room_id').value = room.room_id;
        document.getElementById('edit_room_number').value = room.room_number;
        document.getElementById('edit_room_type_id').value = room.room_type_id;
        document.getElementById('edit_daily_rate').value = room.daily_rate;
        document.getElementById('edit_max_occupancy').value = room.max_occupancy;
        document.getElementById('edit_is_available').value = room.is_available;

        editModal.show();
    };

    // Update room
    async function updateRoom() {
        const roomId = document.getElementById('edit_room_id').value;
        const roomNumber = document.getElementById('edit_room_number').value.trim();
        const typeId = document.getElementById('edit_room_type_id').value;
        const dailyRate = document.getElementById('edit_daily_rate').value;
        const maxOccupancy = document.getElementById('edit_max_occupancy').value;
        const isAvailable = document.getElementById('edit_is_available').value;

        if (!roomNumber || !typeId || !dailyRate || !maxOccupancy) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields.',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-rooms.php`, {
                operation: 'updateRoom',
                json: JSON.stringify({
                    room_id: parseInt(roomId),
                    room_number: roomNumber,
                    room_type_id: parseInt(typeId),
                    daily_rate: parseFloat(dailyRate),
                    max_occupancy: parseInt(maxOccupancy),
                    is_available: parseInt(isAvailable)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Room updated successfully!',
                    icon: 'success'
                });
                editModal.hide();
                await loadRooms();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: 'Failed to update room.',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating room:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to update room.',
                icon: 'error'
            });
        }
    }

    // Initialize
    await loadRoomTypes();
    await loadRooms();
});

console.log('rooms.js is working');
const baseApiUrl = 'http://localhost/hospital_billing-master/api';

// Load room list and populate room types in a single DOMContentLoaded event
document.addEventListener('DOMContentLoaded', async () => {
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
                const response = await axios.post('http://localhost/hospital_billing-master/api/get-rooms.php', {
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
});
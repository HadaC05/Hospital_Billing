console.log('type-room.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {

    // user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login');
        window.location.href = '../index.html';
        return;
    }

    const tableBody = document.getElementById('room-type-list');
    const typeForm = document.getElementById('addRoomTypeForm');
    const editForm = document.getElementById('editRoomTypeForm');

    let roomTypes = [];

    // load room types
    async function loadRoomTypes() {

        if (!tableBody) {
            console.error('Room types table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Loading room types...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-room-types.php`, {
                params: {
                    operation: 'getTypes',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {

                roomTypes = data.types;

                if (roomTypes.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="3">No room type found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                roomTypes.forEach(roomType => {
                    const row = `
                        <tr>
                            <td>${roomType.room_type_name}</td>
                            <td>${roomType.room_description}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-btn" data-id="${roomType.room_type_id}">Edit</button>
                            </td>
                        </tr>
                    `;

                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan = "3">${data.message || 'No data found'}</td></tr>`;
            }

        } catch (error) {
            console.error('Failed to load room types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load room types.</td></tr>';
        }
    }

    // add room type
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                room_type_name: document.getElementById('room_type_name').value.trim(),
                room_description: document.getElementById('room_description').value.trim()
            }

            try {
                const response = await axios.post(`${baseApiUrl}/get-room-types.php`, {
                    operation: 'addRoomType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Room type added successfully',
                        icon: 'success'
                    });
                    window.location.reload();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to add room type',
                        icon: 'error'
                    });
                }

            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error adding room type',
                    icon: 'error'
                });
            }
        });
    }

    // edit button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const roomTypeId = e.target.dataset.id;
            const roomType = roomTypes.find(rt => rt.room_type_id == roomTypeId);

            if (roomType) {
                document.getElementById('edit_room_type_id').value = roomType.room_type_id;
                document.getElementById('edit_room_type_name').value = roomType.room_type_name;
                document.getElementById('edit_room_description').value = roomType.room_description;

                const modal = new bootstrap.Modal(document.getElementById('editRoomTypeModal'));
                modal.show();
            }
        }
    });

    // edit form
    if (editForm) {
        document.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                room_type_id: document.getElementById('edit_room_type_id').value,
                room_type_name: document.getElementById('edit_room_type_name').value.trim(),
                room_description: document.getElementById('edit_room_description').value.trim()
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-room-types.php`, {
                    operation: 'updateRoomType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Room type updated succesfully',
                        icon: 'success'
                    });
                    window.location.reload();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to update the room type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error updating room type',
                    icon: 'error'
                });
            }
        })
    }

    await loadRoomTypes();
});
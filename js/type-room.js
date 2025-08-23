console.log('type-room.js is working');
const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // User authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login');
        window.location.href = '../index.html';
        return;
    }

    // DOM elements
    const tableBody = document.getElementById('room-type-list');
    const typeForm = document.getElementById('addRoomTypeForm');
    const editForm = document.getElementById('editRoomTypeForm');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    let roomTypes = [];
    let filteredTypes = [];

    // initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            loadRoomTypes(page);
        },
        onItemsPerPaageChange: (itemsPerPage) => {
            loadRoomTypes(1, itemsPerPage);
        }
    });

    // Load room types
    async function loadRoomTypes(page = 1, itemsPerPage = 10, search = '') {
        if (!tableBody) {
            console.error('Room types table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Loading room types...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-room-types.php`, {
                params: {
                    operation: 'getTypes',
                    page: page,
                    itemsPerPage: itemsPerPage,
                    search: search,
                    json: JSON.stringify({})
                }
            });

            const data = response.data;
            if (data.success && Array.isArray(data.types)) {
                roomTypes = data.types;
                filteredTypes = [...roomTypes];
                renderTable(filteredTypes, data.pagination);
            } else {
                tableBody.innerHTML = `<tr><td colspan="3">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Failed to load room types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load room types.</td></tr>';
        }
    }

    // Render table with provided data
    function renderTable(typesToRender, paginationData = null) {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (typesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No room type found</td></tr>';

            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        tableBody.innerHTML = '';
        typesToRender.forEach(roomType => {
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

        if (paginationData) {
            pagination.calculatePagination(
                paginationData.totalItems,
                paginationData.currentPage,
                paginationData.itemsPerPage
            );
            pagination.generatePaginationControls('pagination-container');
        }
    }

    // Filter room types based on search and filter criteria
    function filterRoomTypes() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterType = filterSelect.value;

        filteredTypes = roomTypes.filter(type => {
            const matchesSearch = searchTerm === '' ||
                type.room_type_name.toLowerCase().includes(searchTerm) ||
                type.room_description.toLowerCase().includes(searchTerm);

            let matchesFilter = true;
            if (filterType === 'name') {
                matchesFilter = type.room_type_name.toLowerCase().includes(searchTerm);
            } else if (filterType === 'description') {
                matchesFilter = type.room_description.toLowerCase().includes(searchTerm);
            }

            return matchesSearch && matchesFilter;
        });

        renderTable(filteredTypes);
    }

    // Add room type
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                room_type_name: document.getElementById('room_type_name').value.trim(),
                room_description: document.getElementById('room_description').value.trim()
            };

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

                    // Reset form and reload data
                    typeForm.reset();
                    await loadRoomTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addRoomTypeModal'));
                    modal.hide();
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

    // Edit button click handler
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

    // Edit form submission
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
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
                        text: 'Room type updated successfully',
                        icon: 'success'
                    });

                    // Reload data
                    await loadRoomTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editRoomTypeModal'));
                    modal.hide();
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
        });
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', filterRoomTypes);
    }

    // Filter select event listener
    if (filterSelect) {
        filterSelect.addEventListener('change', filterRoomTypes);
    }

    // Initial load
    await loadRoomTypes();
});
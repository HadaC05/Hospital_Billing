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

    // type management functionality
    const tableBody = document.getElementById('room-type-list');
    let roomTypes = [];
    let filteredTypes = [];

    // form elements
    const typeForm = document.getElementById('addRoomTypeForm');
    const editForm = document.getElementById('editRoomTypeForm');

    // modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addRoomTypeModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editRoomTypeModal'));

    // button event listeners
    document.getElementById('saveTypeBtn').addEventListener('click', saveType);
    document.getElementById('updateTypeBtn').addEventListener('click', updateType);

    // search and filter
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

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
            const isActive = roomType.is_active == 1 ? 'Active' : 'Inactive';
            const statusBadge = roomType.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';

            const row = `
                <tr>
                    <td>${roomType.room_type_name}</td>
                    <td>${roomType.room_description}</td>
                    <td><span class="${statusBadge}">${isActive}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editType(${roomType.room_type_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
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
    async function saveType(e) {
        e.preventDefault();

        const typeName = document.getElementById('room_type_name').value.trim();
        const typeDesc = document.getElementById('room_description').value.trim();

        if (!typeName || !typeDesc) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all require fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-room-types.php`, {
                operation: 'addRoomType',
                json: JSON.stringify({
                    room_type_name: typeName,
                    room_description: typeDesc,
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Room type added successfully',
                    icon: 'success'
                });

                // Reset form and reload data
                addModal.hide();
                typeForm.reset();
                await loadRoomTypes();

            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to add room type',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding type:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error adding room type',
                icon: 'error'
            });
        }

    }

    // Edit button click handler
    window.editType = async function (typeId) {
        const type = roomTypes.find(rt => rt.room_type_id == typeId);
        if (!type) {
            Swal.fire({
                title: 'Warning',
                text: 'Room type not found',
                icon: 'warning'
            });
            return;
        }

        // Populate edit form
        document.getElementById('edit_room_type_id').value = type.room_type_id;
        document.getElementById('edit_room_type_name').value = type.room_type_name;
        document.getElementById('edit_room_description').value = type.room_description;
        document.getElementById('edit_is_active').value = type.is_active;

        editModal.show();
    }

    // Edit form submission
    async function updateType(e) {
        e.preventDefault();

        const typeId = document.getElementById('edit_room_type_id').value;
        const typeName = document.getElementById('edit_room_type_name').value.trim();
        const typeDesc = document.getElementById('edit_room_description').value.trim();
        const isActive = document.getElementById('edit_is_active').value;

        if (!typeName || !typeDesc) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-room-types.php`, {
                operation: 'updateRoomType',
                json: JSON.stringify({
                    room_type_id: parseInt(typeId),
                    room_type_name: typeName,
                    room_description: typeDesc,
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Room type updated successfully',
                    icon: 'success'
                });

                editModal.hide();
                await loadRoomTypes();

            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to update the type',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating type:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error updating room type',
                icon: 'error'
            });
        }
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
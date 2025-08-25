console.log("type-medicine.js is working");
const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // type management functionality
    const tableBody = document.getElementById('medicine-type-list');
    let medTypes = [];
    let filteredTypes = [];

    // modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addMedTypeModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editMedTypeModal'));

    // Form elements
    const typeForm = document.getElementById('addMedTypeForm');
    const editForm = document.getElementById('editMedTypeForm');

    // button event listeners
    document.getElementById('saveTypeBtn').addEventListener('click', saveType);
    document.getElementById('updateTypeBtn').addEventListener('click', updateType);

    // Search and filter elements
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            loadMedicineTypes(page);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            loadMedicineTypes(1, itemsPerPage);
        }
    });

    // Load Medicine Type List
    async function loadMedicineTypes(page = 1, itemsPerPage = 10, search = '') {
        if (!tableBody) {
            console.error('Medicine types table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Loading medicine types...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-medicine-types.php`, {
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
                medTypes = data.types;
                filteredTypes = [...medTypes];

                renderTable(filteredTypes, data.pagination);
            } else {
                tableBody.innerHTML = `<tr><td colspan="3">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading medicine types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load medicine types.</td></tr>';
        }
    }

    // Render table with provided data
    function renderTable(typesToRender, paginationData = null) {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (typesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No medicine types found</td></tr>';

            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        tableBody.innerHTML = '';
        typesToRender.forEach(medType => {
            const isActive = medType.is_active == 1 ? 'Active' : 'Inactive';
            const statusBadge = medType.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';

            const row = `
                <tr>
                    <td>${medType.med_type_name}</td>
                    <td>${medType.description}</td>
                    <td><span class="${statusBadge}">${isActive}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editType(${medType.med_type_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // update pagination controls
        if (paginationData) {
            pagination.calculatePagination(
                paginationData.totalItems,
                paginationData.currentPage,
                paginationData.itemsPerPage
            );
            pagination.generatePaginationControls('pagination-container');
        }
    }

    // Filter medicine types based on search and filter criteria
    function filterMedicineTypes() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterType = filterSelect.value;

        filteredTypes = medTypes.filter(type => {
            const matchesSearch = searchTerm === '' ||
                type.med_type_name.toLowerCase().includes(searchTerm) ||
                type.description.toLowerCase().includes(searchTerm);

            let matchesFilter = true;
            if (filterType === 'name') {
                matchesFilter = type.med_type_name.toLowerCase().includes(searchTerm);
            } else if (filterType === 'description') {
                matchesFilter = type.description.toLowerCase().includes(searchTerm);
            }

            return matchesSearch && matchesFilter;
        });

        renderTable(filteredTypes);
    }

    // Add medicine type
    async function saveType(e) {
        e.preventDefault();

        const typeName = document.getElementById('med_type_name').value.trim();
        const typeDesc = document.getElementById('description').value.trim();

        if (!typeName || !typeDesc) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all require fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-medicine-types.php`, {
                operation: 'addMedicineType',
                json: JSON.stringify({
                    med_type_name: typeName,
                    description: typeDesc,
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Medicine type added successfully!',
                    icon: 'success'
                });

                addModal.hide();
                typeForm.reset();
                await loadMedicineTypes();

            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to add medicine type.',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding type:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error adding medicine type',
                icon: 'error'
            });
        }
    }

    // Edit button click handler
    window.editType = async function (typeId) {
        const type = medTypes.find(mt => mt.med_type_id == typeId);
        if (!type) {
            Swal.fire({
                title: 'Warning',
                text: 'Medicine type not found',
                icon: 'warning'
            });
            return;
        }

        // Populate edit form
        document.getElementById('edit_med_type_id').value = type.med_type_id;
        document.getElementById('edit_med_type_name').value = type.med_type_name;
        document.getElementById('edit_description').value = type.description;
        document.getElementById('edit_is_active').value = type.is_active;

        editModal.show();
    }

    // Edit form submission
    async function updateType(e) {
        e.preventDefault();

        const typeId = document.getElementById('edit_med_type_id').value;
        const typeName = document.getElementById('edit_med_type_name').value.trim();
        const typeDesc = document.getElementById('edit_description').value.trim();
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
            const response = await axios.post(`${baseApiUrl}/get-medicine-types.php`, {
                operation: 'updateMedType',
                json: JSON.stringify({
                    med_type_id: parseInt(typeId),
                    med_type_name: typeName,
                    description: typeDesc,
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Type updated successfully!',
                    icon: 'success'
                });

                editModal.hide();
                await loadMedicineTypes();

            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to update type',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating type:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error updating medicine type',
                icon: 'error'
            });
        }
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', filterMedicineTypes);
    }

    // Filter select event listener
    if (filterSelect) {
        filterSelect.addEventListener('change', filterMedicineTypes);
    }

    // Initial load
    await loadMedicineTypes();
});
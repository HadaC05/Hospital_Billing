console.log('type-treatment.js is working');
const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // User authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('User not found');
        window.location.href = '../index.html';
        return;
    }

    // type management functionality
    const tableBody = document.getElementById('treatment-type-list');
    let treatmentTypes = [];
    let filteredTypes = [];

    // form elements
    const typeForm = document.getElementById('addTreatmentTypeForm');
    const updateForm = document.getElementById('editTreatmentTypeForm');

    // modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addTreatmentTypeModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editTreatmentTypeModal'));

    // button event listener
    document.getElementById('saveTypeBtn').addEventListener('click', saveType);
    document.getElementById('updateTypeBtn').addEventListener('click', updateType);

    // search and filter elements
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            loadLabtestTypes(page);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            loadLabtestTypes(1, itemsPerPage);
        }
    });

    // Load treatment types
    async function loadTreatmentTypes(page = 1, itemsPerPage = 10, search = '') {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Treatment types loading...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-treatment-types.php`, {
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
                treatmentTypes = data.types;
                filteredTypes = [...treatmentTypes];

                renderTable(filteredTypes, data.pagination);
            } else {
                tableBody.innerHTML = '<tr><td colspan="3">No treatment types found</td></tr>';
            }
        } catch (error) {
            console.error('Error loading treatment types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load treatment types</td></tr>';
        }
    }

    // Render table with provided data
    function renderTable(typesToRender, paginationData = null) {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (typesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No treatment types found</td></tr>';
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        tableBody.innerHTML = '';
        typesToRender.forEach(treatmentType => {
            const isActive = treatmentType.is_active == 1 ? 'Active' : 'Inactive';
            const statusBadge = treatmentType.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';

            const row = `
                <tr>
                    <td>${treatmentType.category_name}</td>
                    <td>${treatmentType.description}</td>
                    <td><span class="${statusBadge}">${isActive}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editType(${treatmentType.treatment_category_id})" title="Edit">
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

    // Filter treatment types based on search and filter criteria
    function filterTreatmentTypes() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterType = filterSelect.value;

        filteredTypes = treatmentTypes.filter(type => {
            const matchesSearch = searchTerm === '' ||
                type.category_name.toLowerCase().includes(searchTerm) ||
                type.description.toLowerCase().includes(searchTerm);

            let matchesFilter = true;
            if (filterType === 'name') {
                matchesFilter = type.category_name.toLowerCase().includes(searchTerm);
            } else if (filterType === 'description') {
                matchesFilter = type.description.toLowerCase().includes(searchTerm);
            }

            return matchesSearch && matchesFilter;
        });

        renderTable(filteredTypes);
    }

    // Add new treatment type
    async function saveType(e) {
        e.preventDefault();

        const typeName = document.getElementById('category_name').value.trim();
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
            const response = await axios.post(`${baseApiUrl}/get-treatment-types.php`, {
                operation: 'addType',
                json: JSON.stringify({
                    category_name: typeName,
                    description: typeDesc,
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Treatment type added successfully',
                    icon: 'success'
                });

                addModal.hide();
                typeForm.reset();
                await loadTreatmentTypes();

            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to add treatment type',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding type:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error adding treatment type',
                icon: 'error'
            });
        }
    }

    // Edit button click handler
    window.editType = async function (typeId) {
        const type = treatmentTypes.find(tt => tt.treatment_category_id == typeId)
        if (!type) {
            Swal.fire({
                title: 'Warning',
                text: 'Medicine type not found',
                icon: 'warning'
            });
            return;
        }

        // Populate edit form
        document.getElementById('edit_treatment_category_id').value = type.treatment_category_id;
        document.getElementById('edit_category_name').value = type.category_name;
        document.getElementById('edit_description').value = type.description;
        document.getElementById('edit_is_active').value = type.is_active;

        editModal.show();
    }

    // Edit form submission
    async function updateType(e) {
        e.preventDefault();

        const typeId = document.getElementById('edit_treatment_category_id').value;
        const typeName = document.getElementById('edit_category_name').value.trim();
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
            const response = await axios.post(`${baseApiUrl}/get-treatment-types.php`, {
                operation: 'updateType',
                json: JSON.stringify({
                    treatment_category_id: parseInt(typeId),
                    category_name: typeName,
                    description: typeDesc,
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Type updated successfully',
                    icon: 'success'
                });

                // Reload data
                await loadTreatmentTypes();

                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('editTreatmentTypeModal'));
                modal.hide();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to update treatment type',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating type:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error updating treatment type',
                icon: 'error'
            });
        }
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', filterTreatmentTypes);
    }

    // Filter select event listener
    if (filterSelect) {
        filterSelect.addEventListener('change', filterTreatmentTypes);
    }

    // Initial load
    await loadTreatmentTypes();
});
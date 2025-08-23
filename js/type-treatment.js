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

    // DOM elements
    const tableBody = document.getElementById('treatment-type-list');
    const typeForm = document.getElementById('addTreatmentTypeForm');
    const updateForm = document.getElementById('editTreatmentTypeForm');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    let treatmentTypes = [];
    let filteredTypes = [];

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
            const row = `
                <tr>
                    <td>${treatmentType.category_name}</td>
                    <td>${treatmentType.description}</td>
                    <td>
                        <button class="btn btn-sm btn-warning edit-btn" data-id="${treatmentType.treatment_category_id}">Edit</button>
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
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                category_name: document.getElementById('category_name').value.trim(),
                description: document.getElementById('description').value.trim()
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-treatment-types.php`, {
                    operation: 'addType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;
                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Treatment type added successfully',
                        icon: 'success'
                    });

                    // Reset form and reload data
                    typeForm.reset();
                    await loadTreatmentTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addTreatmentTypeModal'));
                    modal.hide();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to add treatment type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error adding treatment type',
                    icon: 'error'
                });
            }
        });
    }

    // Edit button click handler
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const treatId = e.target.dataset.id;
            const treatmentType = treatmentTypes.find(tt => tt.treatment_category_id == treatId);

            if (treatmentType) {
                document.getElementById('edit_treatment_category_id').value = treatmentType.treatment_category_id;
                document.getElementById('edit_category_name').value = treatmentType.category_name;
                document.getElementById('edit_description').value = treatmentType.description;

                const modal = new bootstrap.Modal(document.getElementById('editTreatmentTypeModal'));
                modal.show();
            }
        }
    });

    // Edit form submission
    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                treatment_category_id: document.getElementById('edit_treatment_category_id').value,
                category_name: document.getElementById('edit_category_name').value.trim(),
                description: document.getElementById('edit_description').value.trim()
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-treatment-types.php`, {
                    operation: 'updateType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;
                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Treatment type updated successfully',
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
                        text: 'Failed to update treatment type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error updating treatment type',
                    icon: 'error'
                });
            }
        });
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
console.log('type-surgery.js is working');
const baseApiUrl = "http://localhost/hospital_billing/api";

document.addEventListener("DOMContentLoaded", async () => {
    // Check user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // DOM elements
    const tableBody = document.getElementById('surgery-type-list');
    const typeForm = document.getElementById('addSurgeryTypeForm');
    const editForm = document.getElementById('editSurgeryTypeForm');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    // Container for surgery types
    let surgTypes = [];
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

    // Load surgery types list
    async function loadSurgeryTypes(page = 1, itemsPerPage = 10, search = '') {
        if (!tableBody) {
            console.error('Surgery types table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Loading surgery types...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-surgery-types.php`, {
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
                surgTypes = data.types;
                filteredTypes = [...surgTypes];
                renderTable(filteredTypes, data.pagination);
            } else {
                tableBody.innerHTML = `<tr><td colspan="3">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading surgery types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load surgery types</td></tr>';
        }
    }

    // Render table with provided data
    function renderTable(typesToRender, paginationData = null) {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (typesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No surgery types found</td></tr>';
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }

        tableBody.innerHTML = '';
        typesToRender.forEach(surgType => {
            const row = `
                <tr>
                    <td>${surgType.surgery_type_name}</td>
                    <td>${surgType.description}</td>
                    <td>
                        <button class="btn btn-sm btn-warning edit-btn" data-id="${surgType.surgery_type_id}">Edit</button>
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

    // Filter surgery types based on search and filter criteria
    function filterSurgeryTypes() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterType = filterSelect.value;

        filteredTypes = surgTypes.filter(type => {
            const matchesSearch = searchTerm === '' ||
                type.surgery_type_name.toLowerCase().includes(searchTerm) ||
                type.description.toLowerCase().includes(searchTerm);

            let matchesFilter = true;
            if (filterType === 'name') {
                matchesFilter = type.surgery_type_name.toLowerCase().includes(searchTerm);
            } else if (filterType === 'description') {
                matchesFilter = type.description.toLowerCase().includes(searchTerm);
            }

            return matchesSearch && matchesFilter;
        });

        renderTable(filteredTypes);
    }

    // Add surgery type
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                surgery_type_name: document.getElementById('surgery_type_name').value.trim(),
                description: document.getElementById('description').value.trim()
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-surgery-types.php`, {
                    operation: 'addSurgeryType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;
                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Surgery Type added successfully',
                        icon: 'success'
                    });

                    // Reset form and reload data
                    typeForm.reset();
                    await loadSurgeryTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addSurgeryTypeModal'));
                    modal.hide();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to add surgery type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error adding surgery type',
                    icon: 'error'
                });
            }
        });
    }

    // Edit button click handler
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const surgTypeId = e.target.dataset.id;
            const surgType = surgTypes.find(st => st.surgery_type_id == surgTypeId);

            if (surgType) {
                document.getElementById('edit_surgery_type_id').value = surgType.surgery_type_id;
                document.getElementById('edit_surgery_type_name').value = surgType.surgery_type_name;
                document.getElementById('edit_description').value = surgType.description;

                const modal = new bootstrap.Modal(document.getElementById('editSurgeryTypeModal'));
                modal.show();
            }
        }
    });

    // Edit form submission
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                surgery_type_id: document.getElementById('edit_surgery_type_id').value,
                surgery_type_name: document.getElementById('edit_surgery_type_name').value,
                description: document.getElementById('edit_description').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-surgery-types.php`, {
                    operation: 'updateSurgeryType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;
                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Surgery type updated successfully',
                        icon: 'success'
                    });

                    // Reload data
                    await loadSurgeryTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editSurgeryTypeModal'));
                    modal.hide();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to update surgery type.',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error updating surgery',
                    icon: 'error'
                });
            }
        });
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', filterSurgeryTypes);
    }

    // Filter select event listener
    if (filterSelect) {
        filterSelect.addEventListener('change', filterSurgeryTypes);
    }

    // Initial load
    await loadSurgeryTypes();
});
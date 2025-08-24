console.log('type-labtest.js is working');
const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // User authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('User not found. Redirecting to login...');
        window.location.href = '../index.html';
        return;
    }

    // DOM elements
    const tableBody = document.getElementById('labtest-type-list');
    const typeForm = document.getElementById('addLabtestTypeForm');
    const updateForm = document.getElementById('editLabtestTypeForm');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    let testTypes = [];
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

    // Load labtest types
    async function loadLabtestTypes(page = 1, itemsPerPage = 10, search = '') {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Loading labtest types...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtest-types.php`, {
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
                testTypes = data.types;
                filteredTypes = [...testTypes];
                renderTable(filteredTypes, data.pagination);
            } else {
                tableBody.innerHTML = `<tr><td colspan="3">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading labtest types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load labtest types</td></tr>';
        }
    }

    // Render table with provided data
    function renderTable(typesToRender, paginationData = null) {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (typesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No labtest types found</td></tr>';

            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) {
                paginationContainer.innerHTML = '';
            }
            return;
        }


        tableBody.innerHTML = '';
        typesToRender.forEach(testType => {
            const isActive = testType.is_active == 1 ? 'Active' : 'Inactive';
            const statusBadge = testType.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';

            const row = `
                <tr>
                    <td>${testType.labtest_category_name}</td>
                    <td>${testType.labtest_category_desc}</td>
                    <td><span class="${statusBadge}">${isActive}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${testType.labtest_category_id}"><i class="fas fa-edit"></i></button>
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

    // Filter labtest types based on search and filter criteria
    function filterLabtestTypes() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterType = filterSelect.value;

        filteredTypes = testTypes.filter(type => {
            const matchesSearch = searchTerm === '' ||
                type.labtest_category_name.toLowerCase().includes(searchTerm) ||
                type.labtest_category_desc.toLowerCase().includes(searchTerm);

            let matchesFilter = true;
            if (filterType === 'name') {
                matchesFilter = type.labtest_category_name.toLowerCase().includes(searchTerm);
            } else if (filterType === 'description') {
                matchesFilter = type.labtest_category_desc.toLowerCase().includes(searchTerm);
            }

            return matchesSearch && matchesFilter;
        });

        renderTable(filteredTypes);
    }

    // Add form
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                labtest_category_name: document.getElementById('labtest_category_name').value.trim(),
                labtest_category_desc: document.getElementById('labtest_category_desc').value.trim()
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-labtest-types.php`, {
                    operation: 'addType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;
                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Lab test type added successfully!',
                        icon: 'success'
                    });

                    // Reset form and reload data
                    typeForm.reset();
                    await loadLabtestTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addLabtestTypeModal'));
                    modal.hide();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to add lab test type.',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error adding lab test type.',
                    icon: 'error'
                });
            }
        });
    }

    // Edit button click handler
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const testId = e.target.dataset.id;
            const testType = testTypes.find(lt => lt.labtest_category_id == testId);

            if (testType) {
                document.getElementById('edit_labtest_category_id').value = testType.labtest_category_id;
                document.getElementById('edit_labtest_category_name').value = testType.labtest_category_name;
                document.getElementById('edit_labtest_category_desc').value = testType.labtest_category_desc;
                document.getElementById('edit_is_active').value = testType.is_active;

                const modal = new bootstrap.Modal(document.getElementById('editLabtestTypeModal'));
                modal.show();
            }
        }
    });

    // Edit form
    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                labtest_category_id: document.getElementById('edit_labtest_category_id').value,
                labtest_category_name: document.getElementById('edit_labtest_category_name').value.trim(),
                labtest_category_desc: document.getElementById('edit_labtest_category_desc').value.trim(),
                is_active: document.getElementById('edit_is_active').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-labtest-types.php`, {
                    operation: 'updateType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;
                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Labtest type updated successfully',
                        icon: 'success'
                    });

                    // Reload data
                    await loadLabtestTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editLabtestTypeModal'));
                    modal.hide();
                } else {

                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to update lab test type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error updating lab test type.',
                    icon: 'error'
                });
            }
        });
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', filterLabtestTypes);
    }

    // Filter select event listener
    if (filterSelect) {
        filterSelect.addEventListener('change', filterLabtestTypes);
    }

    // Initial load
    await loadLabtestTypes();
});
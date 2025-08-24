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

    // Type management functionality
    const tableBody = document.getElementById('labtest-type-list');
    let testTypes = [];
    let filteredTypes = [];

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

    // Modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addLabtestTypeModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editLabtestTypeModal'));

    // Form elements
    const typeForm = document.getElementById('addLabtestTypeForm');
    const updateForm = document.getElementById('editLabtestTypeForm');

    // Button event listeners
    document.getElementById('saveTypeBtn').addEventListener('click', saveType);
    document.getElementById('updateTypeBtn').addEventListener('click', updateType);

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
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editType(${testType.labtest_category_id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // Update pagination controls
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
    async function saveType(e) {
        e.preventDefault();

        const typeName = document.getElementById('labtest_category_name').value.trim();
        const typeDesc = document.getElementById('labtest_category_desc').value.trim();

        if (!typeName || !typeDesc) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all require fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-labtest-types.php`, {
                operation: 'addType',
                json: JSON.stringify({
                    labtest_category_name: typeName,
                    labtest_category_desc: typeDesc,
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Lab test type added successfully!',
                    icon: 'success',
                });
                addModal.hide();
                typeForm.reset();
                await loadLabtestTypes();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to add lab test type.',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding type:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error adding lab test type.',
                icon: 'error'
            });
        }
    }

    // Edit type
    window.editType = async function (typeId) {
        const type = testTypes.find(lt => lt.labtest_category_id == typeId);
        if (!type) {
            Swal.fire({
                title: 'Warning',
                text: 'Lab test type not found',
                icon: 'warning'
            });
            return;
        }

        // Populate edit form
        document.getElementById('edit_labtest_category_id').value = type.labtest_category_id;
        document.getElementById('edit_labtest_category_name').value = type.labtest_category_name;
        document.getElementById('edit_labtest_category_desc').value = type.labtest_category_desc;
        document.getElementById('edit_is_active').value = type.is_active;

        editModal.show();
    }

    // Update Type
    async function updateType(e) {
        e.preventDefault();

        const typeId = document.getElementById('edit_labtest_category_id').value;
        const typeName = document.getElementById('edit_labtest_category_name').value.trim();
        const typeDesc = document.getElementById('edit_labtest_category_desc').value.trim();
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
            const response = await axios.post(`${baseApiUrl}/get-labtest-types.php`, {
                operation: 'updateType',
                json: JSON.stringify({
                    labtest_category_id: parseInt(typeId),
                    labtest_category_name: typeName,
                    labtest_category_desc: typeDesc,
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

                editModal.hide();
                await loadLabtestTypes();

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
                text: 'Error updating lab test type.',
                icon: 'error'
            });
        }

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
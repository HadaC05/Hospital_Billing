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
    let allTypes = [];
    let filteredTypes = [];

    // search and filter elements
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const sortBy = document.getElementById('sortBy');

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            renderCurrentPage(page);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            renderCurrentPage(1, itemsPerPage);
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

    // Fetch all labtest types once (bypass server-side pagination)
    async function loadAllLabtestTypes() {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="4">Loading labtest types...</td></tr>';

        try {
            // Request a very large page size to retrieve all records
            const response = await axios.get(`${baseApiUrl}/get-labtest-types.php`, {
                params: {
                    operation: 'getTypes',
                    page: 1,
                    itemsPerPage: 100000,
                    search: '',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                allTypes = data.types;
                applyFiltersAndSort();
                renderCurrentPage(1);
            } else {
                tableBody.innerHTML = `<tr><td colspan="4">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading labtest types: ', error);
            tableBody.innerHTML = '<tr><td colspan="4">Failed to load labtest types</td></tr>';
        }
    }

    // Render table with provided data
    function renderTable(typesToRender, paginationData = null) {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (typesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">No labtest types found</td></tr>';

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

    // Apply search, status filter, and sort
    function applyFiltersAndSort() {
        const searchTerm = (searchInput?.value || '').toLowerCase().trim();
        const statusValue = (statusFilter?.value || 'all');
        const sortValue = (sortBy?.value || 'name-asc');

        // Filter by search and status
        filteredTypes = allTypes.filter(type => {
            const matchesSearch = searchTerm === '' ||
                String(type.labtest_category_name || '').toLowerCase().includes(searchTerm) ||
                String(type.labtest_category_desc || '').toLowerCase().includes(searchTerm);

            const isActive = Number(type.is_active) === 1;
            const matchesStatus = statusValue === 'all' ||
                (statusValue === 'active' && isActive) ||
                (statusValue === 'inactive' && !isActive);

            return matchesSearch && matchesStatus;
        });

        // Sort by name asc/desc
        filteredTypes.sort((a, b) => {
            const nameA = String(a.labtest_category_name || '').toLowerCase();
            const nameB = String(b.labtest_category_name || '').toLowerCase();
            if (nameA < nameB) return sortValue === 'name-asc' ? -1 : 1;
            if (nameA > nameB) return sortValue === 'name-asc' ? 1 : -1;
            return 0;
        });
    }

    // Render current page from filteredTypes
    function renderCurrentPage(page = pagination.currentPage, itemsPerPage = pagination.itemsPerPage) {
        const { data, pagination: pageData } = pagination.getPaginatedData(filteredTypes, page, itemsPerPage);
        renderTable(data, pageData);
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
                await loadAllLabtestTypes();
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
        const type = allTypes.find(lt => lt.labtest_category_id == typeId);
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
                await loadAllLabtestTypes();

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

    // Event listeners for controls
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            pagination.resetToFirstPage();
            applyFiltersAndSort();
            renderCurrentPage(1);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            pagination.resetToFirstPage();
            applyFiltersAndSort();
            renderCurrentPage(1);
        });
    }

    if (sortBy) {
        sortBy.addEventListener('change', () => {
            applyFiltersAndSort();
            renderCurrentPage(pagination.currentPage);
        });
    }

    // Initial load
    await loadAllLabtestTypes();
});
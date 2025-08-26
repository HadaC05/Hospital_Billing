console.log('labtests.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    function renderTable(items, paginationData = null) {
        if (!tableBody) return;

        if (!items || items.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">No lab tests found</td></tr>';
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        tableBody.innerHTML = '';
        items.forEach(test => {
            const isActive = test.is_active == 1 ? 'Active' : 'Inactive';
            const statusBadge = test.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';
            const row = `
                <tr>
                    <td>${test.test_name}</td>
                    <td>${test.labtest_category_name}</td>
                    <td>₱${parseFloat(test.unit_price).toFixed(2)}</td>
                    <td><span class="${statusBadge}">${isActive}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editLabtest(${test.labtest_id})" title="Edit">
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

    function applyFiltersAndSort() {
        const term = (searchInput?.value || '').toLowerCase().trim();
        const categoryVal = categoryFilter?.value || 'all';
        const statusVal = statusFilter?.value || 'all';
        const sortFieldVal = sortField?.value || 'name';
        const sortOrderVal = sortOrder?.value || 'asc';

        filteredLabtests = allLabtests.filter(test => {
            const matchesSearch = term === '' ||
                String(test.test_name || '').toLowerCase().includes(term) ||
                String(test.labtest_category_name || '').toLowerCase().includes(term);

            const matchesCategory = categoryVal === 'all' || String(test.labtest_category_id) === String(categoryVal);
            const isActive = Number(test.is_active) === 1;
            const matchesStatus = statusVal === 'all' ||
                (statusVal === 'active' && isActive) ||
                (statusVal === 'inactive' && !isActive);

            return matchesSearch && matchesCategory && matchesStatus;
        });

        filteredLabtests.sort((a, b) => {
            switch (sortFieldVal) {
                case 'name': {
                    const A = String(a.test_name || '').toLowerCase();
                    const B = String(b.test_name || '').toLowerCase();
                    if (A < B) return sortOrderVal === 'asc' ? -1 : 1;
                    if (A > B) return sortOrderVal === 'asc' ? 1 : -1;
                    return 0;
                }
                case 'category': {
                    const A = String(a.labtest_category_name || '').toLowerCase();
                    const B = String(b.labtest_category_name || '').toLowerCase();
                    if (A < B) return sortOrderVal === 'asc' ? -1 : 1;
                    if (A > B) return sortOrderVal === 'asc' ? 1 : -1;
                    return 0;
                }
                case 'price': {
                    const A = Number(a.unit_price) || 0;
                    const B = Number(b.unit_price) || 0;
                    return sortOrderVal === 'asc' ? (A - B) : (B - A);
                }
                default:
                    return 0;
            }
        });
    }

    function renderCurrentPage(page = pagination.currentPage, itemsPerPage = pagination.itemsPerPage) {
        const { data, pagination: pageData } = pagination.getPaginatedData(filteredLabtests, page, itemsPerPage);
        renderTable(data, pageData);
    }

    // Labtest management functionality
    const tableBody = document.getElementById('labtest-list');
    let allLabtests = [];
    let filteredLabtests = [];

    // Controls
    const searchInput = document.getElementById('labtestSearchInput');
    const categoryFilter = document.getElementById('labtestCategoryFilter');
    const statusFilter = document.getElementById('labtestStatusFilter');
    const sortField = document.getElementById('labtestSortField');
    const sortOrder = document.getElementById('labtestSortOrder');

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
    const addModal = new bootstrap.Modal(document.getElementById('addLabtestModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editLabtestModal'));

    // Form elements
    const addForm = document.getElementById('addLabtestForm');
    const editForm = document.getElementById('editLabtestForm');

    // Button event listeners
    document.getElementById('saveLabtestBtn').addEventListener('click', saveLabtest);
    document.getElementById('updateLabtestBtn').addEventListener('click', updateLabtest);

    // Load labtest types
    async function loadLabtestTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const allTypes = data.types;
                const activeTypes = allTypes.filter(t => Number(t.is_active) === 1);

                const activeOptions = activeTypes.map(type => {
                    return `<option value="${type.labtest_category_id}">${type.labtest_category_name}</option>`;
                }).join('');

                const allOptions = allTypes.map(type => {
                    return `<option value="${type.labtest_category_id}">${type.labtest_category_name}</option>`;
                }).join('');

                // Populate all category dropdowns
                const addCategorySelect = document.getElementById('add_labtest_category_id');
                const editCategorySelect = document.getElementById('edit_labtest_category_id');
                const filterCategorySelect = document.getElementById('labtestCategoryFilter');

                if (addCategorySelect) {
                    addCategorySelect.innerHTML = `<option value="">Select Category</option>` + activeOptions;
                }
                if (editCategorySelect) {
                    editCategorySelect.innerHTML = `<option value="">Select Category</option>` + activeOptions;
                }
                if (filterCategorySelect) {
                    filterCategorySelect.innerHTML = `<option value="all">All Categories</option>` + allOptions;
                }
            } else {
                const addCategorySelect = document.getElementById('add_labtest_category_id');
                const editCategorySelect = document.getElementById('edit_labtest_category_id');
                const filterCategorySelect = document.getElementById('labtestCategoryFilter');

                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">No categories available</option>`;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">No categories available</option>`;
                if (filterCategorySelect) filterCategorySelect.innerHTML = `<option value="all">All Categories</option>`;
            }
        } catch (error) {
            console.error('Failed to load labtest types', error);
        }
    }

    // Load all labtests once for full-list search
    async function loadAllLabtests() {
        if (!tableBody) {
            console.error('Labtest table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="5">Loading lab tests...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getLabtests',
                    page: 1,
                    itemsPerPage: 100000,
                    search: ''
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.labtests)) {
                allLabtests = data.labtests;
                applyFiltersAndSort();
                renderCurrentPage(1);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading lab tests: ', error);
            tableBody.innerHTML = '<tr><td colspan="5">Failed to load lab tests</td></tr>';
        }
    }

    // CRUD Functions

    // Create new lab test
    async function saveLabtest() {
        const testName = document.getElementById('add_test_name').value.trim();
        const categoryId = document.getElementById('add_labtest_category_id').value;
        const unitPrice = document.getElementById('add_unit_price').value;

        if (!testName || !categoryId || !unitPrice) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'createLabtest',
                json: JSON.stringify({
                    test_name: testName,
                    labtest_category_id: categoryId,
                    unit_price: parseFloat(unitPrice),
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Lab test added successfully!',
                    icon: 'success'
                });
                addModal.hide();
                addForm.reset();
                await loadAllLabtests();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to add lab test',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding lab test:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to add lab test',
                icon: 'error'
            });
        }
    }

    // Edit lab test
    window.editLabtest = async function (labtestId) {
        const labtest = allLabtests.find(test => test.labtest_id == labtestId);
        if (!labtest) {
            Swal.fire({
                title: 'Failed',
                text: 'Lab test not found.',
                icon: 'error'
            });
            return;
        }

        // Populate edit form
        document.getElementById('edit_labtest_id').value = labtest.labtest_id;
        document.getElementById('edit_test_name').value = labtest.test_name;
        document.getElementById('edit_labtest_category_id').value = labtest.labtest_category_id;
        document.getElementById('edit_unit_price').value = labtest.unit_price;
        document.getElementById('edit_is_active').value = labtest.is_active;

        editModal.show();
    };

    // Update lab test
    async function updateLabtest() {
        const labtestId = document.getElementById('edit_labtest_id').value;
        const testName = document.getElementById('edit_test_name').value.trim();
        const categoryId = document.getElementById('edit_labtest_category_id').value;
        const unitPrice = document.getElementById('edit_unit_price').value;
        const isActive = document.getElementById('edit_is_active').value;

        if (!testName || !categoryId || !unitPrice) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'updateLabtest',
                json: JSON.stringify({
                    labtest_id: parseInt(labtestId),
                    test_name: testName,
                    labtest_category_id: categoryId,
                    unit_price: parseFloat(unitPrice),
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Lab test updated successfully!',
                    icon: 'success'
                });
                editModal.hide();
                await loadAllLabtests();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to update lab test',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating lab test:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to update lab test',
                icon: 'error'
            });
        }
    }

    // Initialize the module
    await loadLabtestTypes();

    // Wire control events
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            pagination.resetToFirstPage();
            applyFiltersAndSort();
            renderCurrentPage(1);
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
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
    if (sortField) {
        sortField.addEventListener('change', () => {
            applyFiltersAndSort();
            renderCurrentPage(pagination.currentPage);
        });
    }
    if (sortOrder) {
        sortOrder.addEventListener('change', () => {
            applyFiltersAndSort();
            renderCurrentPage(pagination.currentPage);
        });
    }

    await loadAllLabtests();
});
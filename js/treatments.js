console.log('treatments.js is working');
console.log('is treatment working?');

const baseApiUrl = `${window.location.origin}/hospital_billing/api`;

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
            tableBody.innerHTML = '<tr><td colspan="5">No treatments found</td></tr>';
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        tableBody.innerHTML = '';
        items.forEach(t => {
            const status = t.is_active == 1 ? 'Active' : 'Inactive';
            const statusBadge = t.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';
            const row = `
                <tr>
                    <td>${t.treatment_name}</td>
                    <td>₱${parseFloat(t.unit_price).toFixed(2)}</td>
                    <td>${t.treatment_category}</td>
                    <td><span class="${statusBadge}">${status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editTreatment(${t.treatment_id})" title="Edit">
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

        filteredTreatments = allTreatments.filter(t => {
            const matchesSearch = term === '' ||
                String(t.treatment_name || '').toLowerCase().includes(term) ||
                String(t.treatment_category || '').toLowerCase().includes(term);

            const matchesCategory = categoryVal === 'all' || String(t.treatment_category_id) === String(categoryVal);
            const isActive = Number(t.is_active) === 1;
            const matchesStatus = statusVal === 'all' ||
                (statusVal === 'active' && isActive) ||
                (statusVal === 'inactive' && !isActive);

            return matchesSearch && matchesCategory && matchesStatus;
        });

        filteredTreatments.sort((a, b) => {
            switch (sortFieldVal) {
                case 'name': {
                    const A = String(a.treatment_name || '').toLowerCase();
                    const B = String(b.treatment_name || '').toLowerCase();
                    if (A < B) return sortOrderVal === 'asc' ? -1 : 1;
                    if (A > B) return sortOrderVal === 'asc' ? 1 : -1;
                    return 0;
                }
                case 'price': {
                    const A = Number(a.unit_price) || 0;
                    const B = Number(b.unit_price) || 0;
                    return sortOrderVal === 'asc' ? (A - B) : (B - A);
                }
                case 'category': {
                    const A = String(a.treatment_category || '').toLowerCase();
                    const B = String(b.treatment_category || '').toLowerCase();
                    if (A < B) return sortOrderVal === 'asc' ? -1 : 1;
                    if (A > B) return sortOrderVal === 'asc' ? 1 : -1;
                    return 0;
                }
                default:
                    return 0;
            }
        });
    }

    function renderCurrentPage(page = pagination.currentPage, itemsPerPage = pagination.itemsPerPage) {
        const { data, pagination: pageData } = pagination.getPaginatedData(filteredTreatments, page, itemsPerPage);
        renderTable(data, pageData);
    }

    // Treatment management functionality
    const tableBody = document.getElementById('treatment-list');
    let allTreatments = [];
    let filteredTreatments = [];

    // Controls
    const searchInput = document.getElementById('treatmentSearchInput');
    const categoryFilter = document.getElementById('treatmentCategoryFilter');
    const statusFilter = document.getElementById('treatmentStatusFilter');
    const sortField = document.getElementById('treatmentSortField');
    const sortOrder = document.getElementById('treatmentSortOrder');

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
    const addModal = new bootstrap.Modal(document.getElementById('addTreatmentModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editTreatmentModal'));

    // Form elements
    const addForm = document.getElementById('addTreatmentForm');
    const editForm = document.getElementById('editTreatmentForm');

    // Button event listeners
    document.getElementById('saveTreatmentBtn').addEventListener('click', saveTreatment);
    document.getElementById('updateTreatmentBtn').addEventListener('click', updateTreatment);

    // Load treatment categories
    async function loadTreatmentCategories() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-treatments.php`, {
                params: { operation: 'getTreatmentCategories' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.categories)) {
                const allCategories = data.categories;
                const activeCategories = allCategories.filter(c => Number(c.is_active) === 1);

                const activeOptions = activeCategories.map(c => {
                    return `<option value="${c.treatment_category_id}">${c.category_name}</option>`;
                }).join('');

                const allOptions = allCategories.map(c => {
                    return `<option value="${c.treatment_category_id}">${c.category_name}</option>`;
                }).join('');

                // Populate dropdowns
                const addCategorySelect = document.getElementById('treatment_category_id');
                const editCategorySelect = document.getElementById('edit_treatment_category_id');
                const filterCategorySelect = document.getElementById('treatmentCategoryFilter');

                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">Select Category</option>` + activeOptions;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">Select Category</option>` + allOptions;
                if (filterCategorySelect) filterCategorySelect.innerHTML = `<option value="all">All Categories</option>` + allOptions;
            } else {
                const addCategorySelect = document.getElementById('treatment_category_id');
                const editCategorySelect = document.getElementById('edit_treatment_category_id');
                const filterCategorySelect = document.getElementById('treatmentCategoryFilter');

                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">No categories available</option>`;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">No categories available</option>`;
                if (filterCategorySelect) filterCategorySelect.innerHTML = `<option value="all">All Categories</option>`;
            }
        } catch (error) {
            console.error('Failed to load treatment categories', error);
        }
    }

    // Load all treatments once for full-list search
    async function loadAllTreatments() {
        if (!tableBody) {
            console.error('Treatment table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="5">Loading treatments...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-treatments.php`, {
                params: {
                    operation: 'getTreatments',
                    page: 1,
                    itemsPerPage: 100000,
                    search: ''
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.treatments)) {
                allTreatments = data.treatments;
                applyFiltersAndSort();
                renderCurrentPage(1);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading treatments: ', error);
            tableBody.innerHTML = '<tr><td colspan="5">Failed to load treatments</td></tr>';
        }
    }

    // Create new treatment
    async function saveTreatment() {
        const treatmentName = document.getElementById('treatment_name').value.trim();
        const unitPrice = document.getElementById('unit_price').value;
        const categoryId = document.getElementById('treatment_category_id').value;

        if (!treatmentName || !unitPrice || !categoryId) {
            Swal.fire({
                title: 'Validation',
                text: 'Please fill in all required fields.',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-treatments.php`, {
                operation: 'addTreatment',
                json: JSON.stringify({
                    treatment_name: treatmentName,
                    unit_price: parseFloat(unitPrice),
                    treatment_category_id: parseInt(categoryId),
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Treatment added successfully!',
                    icon: 'success'
                });
                addModal.hide();
                addForm.reset();
                await loadAllTreatments();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Failed to add treatment.',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding treatment:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to add treatment. Please try again.',
                icon: 'error'
            });
        }
    }

    // Edit treatment
    window.editTreatment = async function (treatmentId) {
        const treatment = allTreatments.find(t => t.treatment_id == treatmentId);
        if (!treatment) {
            Swal.fire({
                title: 'Not found',
                text: 'Treatment not found.',
                icon: 'info'
            });
            return;
        }

        document.getElementById('edit_treatment_id').value = treatment.treatment_id;
        document.getElementById('edit_treatment_name').value = treatment.treatment_name;
        document.getElementById('edit_unit_price').value = treatment.unit_price;
        document.getElementById('edit_treatment_category_id').value = treatment.treatment_category_id;
        document.getElementById('edit_is_active').value = treatment.is_active;

        editModal.show();
    };

    // Update treatment
    async function updateTreatment() {
        const treatmentId = document.getElementById('edit_treatment_id').value;
        const treatmentName = document.getElementById('edit_treatment_name').value.trim();
        const unitPrice = document.getElementById('edit_unit_price').value;
        const categoryId = document.getElementById('edit_treatment_category_id').value;
        const isActive = document.getElementById('edit_is_active').value;

        if (!treatmentName || !unitPrice || !categoryId) {
            Swal.fire({
                title: 'Validation',
                text: 'Please fill in all required fields.',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-treatments.php`, {
                operation: 'updateTreatment',
                json: JSON.stringify({
                    treatment_id: parseInt(treatmentId),
                    treatment_name: treatmentName,
                    unit_price: parseFloat(unitPrice),
                    treatment_category_id: parseInt(categoryId),
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Treatment updated successfully!',
                    icon: 'success'
                });
                editModal.hide();
                await loadAllTreatments();
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Failed to update treatment.',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating treatment:', error);
            Swal.fire({
                title: 'Error',
                text: 'Failed to update treatment. Please try again.',
                icon: 'error'
            });
        }
    }

    // Initialize the module
    await loadTreatmentCategories();

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

    await loadAllTreatments();
});

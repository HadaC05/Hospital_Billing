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

    // Treatment management functionality
    const tableBody = document.getElementById('treatment-list');
    let treatments = [];
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    let currentItemsPerPage = 10;

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: currentItemsPerPage,
        onPageChange: (page) => {
            const search = searchInput ? searchInput.value.trim() : '';
            loadTreatments(page, currentItemsPerPage, search);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            currentItemsPerPage = itemsPerPage;
            const search = searchInput ? searchInput.value.trim() : '';
            loadTreatments(1, currentItemsPerPage, search);
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
                const options = data.categories.map(c => {
                    return `<option value="${c.treatment_category_id}">${c.category_name}</option>`;
                }).join('');

                // Populate dropdowns
                const addCategorySelect = document.getElementById('treatment_category_id');
                const editCategorySelect = document.getElementById('edit_treatment_category_id');

                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">Select Category</option>` + options;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">Select Category</option>` + options;
            } else {
                const addCategorySelect = document.getElementById('treatment_category_id');
                const editCategorySelect = document.getElementById('edit_treatment_category_id');

                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">No categories available</option>`;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">No categories available</option>`;
            }
        } catch (error) {
            console.error('Failed to load treatment categories', error);
        }
    }

    // Wire search and filter controls
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const term = searchInput.value.trim();
            loadTreatments(1, currentItemsPerPage, term);
        });
    }
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            const term = searchInput ? searchInput.value.trim() : '';
            loadTreatments(1, currentItemsPerPage, term);
        });
    }

    // Load treatments
    async function loadTreatments(page = 1, itemsPerPage = 10, search = '') {
        if (!tableBody) {
            console.error('Treatment table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="5">Loading treatments...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-treatments.php`, {
                params: {
                    operation: 'getTreatments',
                    page: page,
                    itemsPerPage: itemsPerPage,
                    search: search
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.treatments)) {
                treatments = data.treatments;
                const paginationData = data.pagination;

                // Optional client-side filtering based on selected field
                const searchTerm = (search || '').toLowerCase();
                let list = treatments;
                if (filterSelect && filterSelect.value !== 'all' && searchTerm) {
                    list = treatments.filter(t => {
                        if (filterSelect.value === 'name') return (t.treatment_name || '').toLowerCase().includes(searchTerm);
                        if (filterSelect.value === 'category') return (t.treatment_category || '').toLowerCase().includes(searchTerm);
                        if (filterSelect.value === 'status') return ((t.is_active == 1 ? 'active' : 'inactive')).includes(searchTerm);
                        return true;
                    });
                }

                if (list.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5">No treatments found</td></tr>';
                    const paginationContainer = document.getElementById('pagination-container');
                    if (paginationContainer) {
                        paginationContainer.innerHTML = '';
                    }
                    return;
                }

                tableBody.innerHTML = '';

                list.forEach(t => {
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

                // Update pagination controls
                pagination.calculatePagination(paginationData.totalItems, paginationData.currentPage, paginationData.itemsPerPage);
                pagination.generatePaginationControls('pagination-container');
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
            alert('Please fill in all required fields.');
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
                alert('Treatment added successfully!');
                addModal.hide();
                addForm.reset();
                await loadTreatments();
            } else {
                alert(data.message || 'Failed to add treatment.');
            }
        } catch (error) {
            console.error('Error adding treatment:', error);
            alert('Failed to add treatment. Please try again.');
        }
    }

    // Edit treatment
    window.editTreatment = async function (treatmentId) {
        const treatment = treatments.find(t => t.treatment_id == treatmentId);
        if (!treatment) {
            alert('Treatment not found.');
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
            alert('Please fill in all required fields.');
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
                alert('Treatment updated successfully!');
                editModal.hide();
                await loadTreatments();
            } else {
                alert(data.message || 'Failed to update treatment.');
            }
        } catch (error) {
            console.error('Error updating treatment:', error);
            alert('Failed to update treatment. Please try again.');
        }
    }

    // Initialize
    await loadTreatmentCategories();
    const initialSearch = searchInput ? searchInput.value.trim() : '';
    await loadTreatments(1, currentItemsPerPage, initialSearch);
});

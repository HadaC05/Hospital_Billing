console.log('medicine.js is working');

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
            tableBody.innerHTML = '<tr><td colspan="7">No medicines found</td></tr>';
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        tableBody.innerHTML = '';
        items.forEach(med => {
            const isActive = med.is_active == 1 ? 'Active' : 'Inactive';
            const statusBadge = med.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';
            const row = `
                <tr>
                    <td>${med.med_name}</td>
                    <td>${med.med_type_name}</td>
                    <td>₱${parseFloat(med.unit_price).toFixed(2)}</td>
                    <td>${med.stock_quantity}</td>
                    <td>${med.unit_name}</td>
                    <td><span class="${statusBadge}">${isActive}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editMedicine(${med.med_id})" title="Edit">
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
        const typeVal = typeFilter?.value || 'all';
        const unitVal = unitFilter?.value || 'all';
        const statusVal = statusFilter?.value || 'all';
        const sortVal = sortBy?.value || 'name-asc';

        filteredMedicines = allMedicines.filter(m => {
            const matchesSearch = term === '' ||
                String(m.med_name || '').toLowerCase().includes(term) ||
                String(m.med_type_name || '').toLowerCase().includes(term) ||
                String(m.unit_name || '').toLowerCase().includes(term);

            const matchesType = typeVal === 'all' || String(m.med_type_id) === String(typeVal);
            const matchesUnit = unitVal === 'all' || String(m.unit_id) === String(unitVal);
            const isActive = Number(m.is_active) === 1;
            const matchesStatus = statusVal === 'all' ||
                (statusVal === 'active' && isActive) ||
                (statusVal === 'inactive' && !isActive);

            return matchesSearch && matchesType && matchesUnit && matchesStatus;
        });

        filteredMedicines.sort((a, b) => {
            switch (sortVal) {
                case 'name-asc':
                case 'name-desc': {
                    const A = String(a.med_name || '').toLowerCase();
                    const B = String(b.med_name || '').toLowerCase();
                    if (A < B) return sortVal === 'name-asc' ? -1 : 1;
                    if (A > B) return sortVal === 'name-asc' ? 1 : -1;
                    return 0;
                }
                case 'type-asc':
                case 'type-desc': {
                    const A = String(a.med_type_name || '').toLowerCase();
                    const B = String(b.med_type_name || '').toLowerCase();
                    if (A < B) return sortVal === 'type-asc' ? -1 : 1;
                    if (A > B) return sortVal === 'type-asc' ? 1 : -1;
                    return 0;
                }
                case 'stock-asc':
                case 'stock-desc': {
                    const A = Number(a.stock_quantity) || 0;
                    const B = Number(b.stock_quantity) || 0;
                    return sortVal === 'stock-asc' ? (A - B) : (B - A);
                }
                case 'price-asc':
                case 'price-desc': {
                    const A = Number(a.unit_price) || 0;
                    const B = Number(b.unit_price) || 0;
                    return sortVal === 'price-asc' ? (A - B) : (B - A);
                }
                default:
                    return 0;
            }
        });
    }

    function renderCurrentPage(page = pagination.currentPage, itemsPerPage = pagination.itemsPerPage) {
        const { data, pagination: pageData } = pagination.getPaginatedData(filteredMedicines, page, itemsPerPage);
        renderTable(data, pageData);
    }
    // Medicine management functionality
    const tableBody = document.getElementById('medicine-list');
    let allMedicines = [];
    let filteredMedicines = [];

    // Controls
    const searchInput = document.getElementById('medSearchInput');
    const typeFilter = document.getElementById('medTypeFilter');
    const unitFilter = document.getElementById('medUnitFilter');
    const statusFilter = document.getElementById('medStatusFilter');
    const sortBy = document.getElementById('medSortBy');

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
    const addModal = new bootstrap.Modal(document.getElementById('addMedicineModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editMedicineModal'));

    // Form elements
    const addForm = document.getElementById('addMedicineForm');
    const editForm = document.getElementById('editMedicineForm');

    // Button event listeners
    document.getElementById('saveMedicineBtn').addEventListener('click', saveMedicine);
    document.getElementById('updateMedicineBtn').addEventListener('click', updateMedicine);

    // Load medicine types
    async function loadMedicineTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.med_type_id}">${type.med_type_name}</option>`;
                }).join('');

                // Populate all category dropdowns
                const addTypeSelect = document.getElementById('med_type_id');
                const editTypeSelect = document.getElementById('edit_med_type_id');
                const filterTypeSelect = document.getElementById('medTypeFilter');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (filterTypeSelect) filterTypeSelect.innerHTML = `<option value="all">All Types</option>` + options;
            } else {

                const addTypeSelect = document.getElementById('med_type_id');
                const editTypeSelect = document.getElementById('edit_med_type_id');
                const filterTypeSelect = document.getElementById('medTypeFilter');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">No types available</option>`;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">No types available</option>`;
                if (filterTypeSelect) filterTypeSelect.innerHTML = `<option value="all">All Types</option>`;
            }
        } catch (error) {
            console.error('Failed to load medicine types', error);
        }
    }

    // Load Medicine Units
    async function loadMedicineUnits() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: { operation: 'getUnits' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.units)) {
                const options = data.units.map(unit => {
                    return `<option value="${unit.unit_id}">${unit.unit_name}</option>`;
                }).join('');

                // Populate all unit dropdowns
                const addUnitSelect = document.getElementById('unit_id');
                const editUnitSelect = document.getElementById('edit_unit_id');
                const filterUnitSelect = document.getElementById('medUnitFilter');

                if (addUnitSelect) addUnitSelect.innerHTML = `<option value="">Select Unit</option>` + options;
                if (editUnitSelect) editUnitSelect.innerHTML = `<option value="">Select Unit</option>` + options;
                if (filterUnitSelect) filterUnitSelect.innerHTML = `<option value="all">All Units</option>` + options;
            } else {

                const addUnitSelect = document.getElementById('unit_id');
                const editUnitSelect = document.getElementById('edit_unit_id');
                const filterUnitSelect = document.getElementById('medUnitFilter');

                if (addUnitSelect) addUnitSelect.innerHTML = `<option value="">No unit available</option>`;
                if (editUnitSelect) editUnitSelect.innerHTML = `<option value="">No unit available</option>`;
                if (filterUnitSelect) filterUnitSelect.innerHTML = `<option value="all">All Units</option>`;
            }
        } catch (error) {
            console.error('Failed to load medicine units', error);
        }
    }

    // Load all medicines once for full-list search
    async function loadAllMedicines() {
        if (!tableBody) {
            console.error('Medicine table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="7">Loading medicines...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: {
                    operation: 'getMedicines',
                    page: 1,
                    itemsPerPage: 100000,
                    search: ''
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.medicines)) {
                allMedicines = data.medicines;
                applyFiltersAndSort();
                renderCurrentPage(1);
            } else {
                tableBody.innerHTML = `<tr><td colspan="7">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading medicines: ', error);
            tableBody.innerHTML = '<tr><td colspan="7">Failed to load medicines</td></tr>';
        }
    }

    // Create new medicine
    async function saveMedicine() {

        const medName = document.getElementById('med_name').value.trim();
        const typeId = document.getElementById('med_type_id').value;
        const unitPrice = document.getElementById('unit_price').value;
        const stockQty = document.getElementById('stock_quantity').value;
        const medUnit = document.getElementById('unit_id').value;

        if (!medName || !typeId || !unitPrice || !stockQty || !medUnit) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                operation: 'addMedicine',
                json: JSON.stringify({
                    med_name: medName,
                    med_type_id: typeId,
                    unit_price: parseFloat(unitPrice),
                    stock_quantity: parseInt(stockQty),
                    unit_id: medUnit,
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Medicine added successfully!',
                    icon: 'success'
                });
                addModal.hide();
                addForm.reset();
                await loadMedicines();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to add medicine',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding medicine:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error adding medicine',
                icon: 'error'
            });
        }
    }

    // Edit medicine
    window.editMedicine = async function (medId) {
        const med = allMedicines.find(m => m.med_id == medId);
        if (!med) {
            Swal.fire({
                title: "Warning",
                text: "Medicine not found",
                icon: "warning"
            });
            return;
        }

        // Populate edit form
        document.getElementById('edit_med_id').value = med.med_id;
        document.getElementById('edit_med_name').value = med.med_name;
        document.getElementById('edit_med_type_id').value = med.med_type_id;
        document.getElementById('edit_unit_price').value = med.unit_price;
        document.getElementById('edit_stock_quantity').value = med.stock_quantity;
        document.getElementById('edit_unit_id').value = med.unit_id;
        document.getElementById('edit_is_active').value = med.is_active;

        editModal.show();
    };

    // Update medicine
    async function updateMedicine() {
        const medId = document.getElementById('edit_med_id').value;
        const medName = document.getElementById('edit_med_name').value.trim();
        const typeId = document.getElementById('edit_med_type_id').value;
        const unitPrice = document.getElementById('edit_unit_price').value;
        const stockQty = document.getElementById('edit_stock_quantity').value;
        const medUnit = document.getElementById('edit_unit_id').value;
        const isActive = document.getElementById('edit_is_active').value;

        if (!medName || !typeId || !unitPrice || !stockQty || !medUnit) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                operation: 'updateMedicine',
                json: JSON.stringify({
                    med_id: parseInt(medId),
                    med_name: medName,
                    med_type_id: typeId,
                    unit_price: parseFloat(unitPrice),
                    stock_quantity: parseInt(stockQty),
                    unit_id: medUnit,
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Medicine updated successfully!',
                    icon: 'success'
                });
                editModal.hide();
                await loadAllMedicines();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to update medicine',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating medicine:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Error updating medicine',
                icon: 'error'
            });
        }
    }

    // Initialize the module
    await loadMedicineTypes();
    await loadMedicineUnits();
    // Wire control events
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            pagination.resetToFirstPage();
            applyFiltersAndSort();
            renderCurrentPage(1);
        });
    }
    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            pagination.resetToFirstPage();
            applyFiltersAndSort();
            renderCurrentPage(1);
        });
    }
    if (unitFilter) {
        unitFilter.addEventListener('change', () => {
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

    await loadAllMedicines();
});

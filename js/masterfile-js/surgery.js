console.log('surgery.js is working');
console.log('is this currently working');

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
            tableBody.innerHTML = '<tr><td colspan="5">No surgeries found</td></tr>';
            const paginationContainer = document.getElementById('pagination-container');
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }

        tableBody.innerHTML = '';
        items.forEach(surg => {
            const isActive = surg.is_available == 1 ? 'Active' : 'Inactive';
            const statusBadge = surg.is_available == 1 ? 'badge bg-success' : 'badge bg-secondary';
            const row = `
                <tr>
                    <td>${surg.surgery_name}</td>
                    <td>${surg.surgery_type_name}</td>
                    <td>₱${parseFloat(surg.surgery_price).toFixed(2)}</td>
                    <td><span class="${statusBadge}">${isActive}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editSurgery(${surg.surgery_id})" title="Edit">
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
        const statusVal = statusFilter?.value || 'all';
        const sortFieldVal = sortField?.value || 'name';
        const sortOrderVal = sortOrder?.value || 'asc';

        filteredSurgeries = allSurgeries.filter(surg => {
            const matchesSearch = term === '' ||
                String(surg.surgery_name || '').toLowerCase().includes(term) ||
                String(surg.surgery_type_name || '').toLowerCase().includes(term);

            const matchesType = typeVal === 'all' || String(surg.surgery_type_id) === String(typeVal);
            const isActive = Number(surg.is_available) === 1;
            const matchesStatus = statusVal === 'all' ||
                (statusVal === 'active' && isActive) ||
                (statusVal === 'inactive' && !isActive);

            return matchesSearch && matchesType && matchesStatus;
        });

        filteredSurgeries.sort((a, b) => {
            switch (sortFieldVal) {
                case 'name': {
                    const A = String(a.surgery_name || '').toLowerCase();
                    const B = String(b.surgery_name || '').toLowerCase();
                    if (A < B) return sortOrderVal === 'asc' ? -1 : 1;
                    if (A > B) return sortOrderVal === 'asc' ? 1 : -1;
                    return 0;
                }
                case 'type': {
                    const A = String(a.surgery_type_name || '').toLowerCase();
                    const B = String(b.surgery_type_name || '').toLowerCase();
                    if (A < B) return sortOrderVal === 'asc' ? -1 : 1;
                    if (A > B) return sortOrderVal === 'asc' ? 1 : -1;
                    return 0;
                }
                case 'price': {
                    const A = Number(a.surgery_price) || 0;
                    const B = Number(b.surgery_price) || 0;
                    return sortOrderVal === 'asc' ? (A - B) : (B - A);
                }
                default:
                    return 0;
            }
        });
    }

    function renderCurrentPage(page = pagination.currentPage, itemsPerPage = pagination.itemsPerPage) {
        const { data, pagination: pageData } = pagination.getPaginatedData(filteredSurgeries, page, itemsPerPage);
        renderTable(data, pageData);
    }

    // Surgery management functionality
    const tableBody = document.getElementById('surgery-list');
    let allSurgeries = [];
    let filteredSurgeries = [];

    // Controls
    const searchInput = document.getElementById('surgerySearchInput');
    const typeFilter = document.getElementById('surgeryTypeFilter');
    const statusFilter = document.getElementById('surgeryStatusFilter');
    const sortField = document.getElementById('surgerySortField');
    const sortOrder = document.getElementById('surgerySortOrder');

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
    const addModal = new bootstrap.Modal(document.getElementById('addSurgeryModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editSurgeryModal'));

    // Form elements
    const addForm = document.getElementById('addSurgeryForm');
    const editForm = document.getElementById('editSurgeryForm');

    // button event listeners
    document.getElementById('saveSurgeryBtn').addEventListener('click', saveSurgery);
    document.getElementById('updateSurgeryBtn').addEventListener('click', updateSurgery);

    // Load Surgery Types
    async function loadSurgeryTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-surgeries.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const allTypes = data.types;
                const activeTypes = allTypes.filter(t => Number(t.is_active) === 1);

                const activeOptions = activeTypes.map(type => {
                    return `<option value="${type.surgery_type_id}">${type.surgery_type_name}</option>`;
                }).join('');

                const allOptions = allTypes.map(type => {
                    return `<option value="${type.surgery_type_id}">${type.surgery_type_name}</option>`;
                }).join('');

                // populate dropdowns
                const addTypeSelect = document.getElementById('surgery_type_id');
                const editTypeSelect = document.getElementById('edit_surgery_type_id');
                const filterTypeSelect = document.getElementById('surgeryTypeFilter');

                if (addTypeSelect) {
                    addTypeSelect.innerHTML = `<option value="">Select Type</option>` + activeOptions;
                }
                if (editTypeSelect) {
                    editTypeSelect.innerHTML = `<option value="">Select Type</option>` + allOptions;
                }
                if (filterTypeSelect) {
                    filterTypeSelect.innerHTML = `<option value="all">All Types</option>` + allOptions;
                }
            } else {
                const addTypeSelect = document.getElementById('surgery_type_id');
                const editTypeSelect = document.getElementById('edit_surgery_type_id');
                const filterTypeSelect = document.getElementById('surgeryTypeFilter');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">No types available</option>`;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">No types available</option>`;
                if (filterTypeSelect) filterTypeSelect.innerHTML = `<option value="all">All Types</option>`;
            }
        } catch (error) {
            console.error('Failed to load surgery types: ', error);
        }
    }

    // Load all surgeries once for full-list search
    async function loadAllSurgeries() {
        if (!tableBody) {
            console.error('Surgery table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="5">Loading surgeries...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-surgeries.php`, {
                params: {
                    operation: 'getSurgeries',
                    page: 1,
                    itemsPerPage: 100000,
                    search: ''
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.surgeries)) {
                allSurgeries = data.surgeries;
                applyFiltersAndSort();
                renderCurrentPage(1);
            } else {
                tableBody.innerHTML = `<tr><td colspan="5">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading surgeries: ', error);
            tableBody.innerHTML = '<tr><td colspan="5">Failed to load surgeries.</td></tr>';
        }
    }

    // Add new Surgery
    async function saveSurgery() {
        const name = document.getElementById('surgery_name').value.trim();
        const typeId = document.getElementById('surgery_type_id').value;
        const price = document.getElementById('surgery_price').value;

        if (!name || !typeId || !price) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields.',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-surgeries.php`, {
                operation: 'addSurgery',
                json: JSON.stringify({
                    surgery_name: name,
                    surgery_type_id: parseInt(typeId),
                    surgery_price: parseFloat(price),
                    is_available: 1
                })
            });

            const data = response.data;

            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Surgery added successfully!',
                    icon: 'success'
                })
                addModal.hide();
                addForm.reset();
                await loadAllSurgeries();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to add surgery',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding surgery:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to add surgery',
                icon: 'error'
            });
        }
    }

    // Edit Surgery
    window.editSurgery = async function (surgeryId) {
        const surgery = allSurgeries.find(s => s.surgery_id == surgeryId);
        if (!surgery) {
            Swal.fire({
                title: 'Warning',
                text: 'Surgery not found',
                icon: 'warning'
            });
            return;
        }

        document.getElementById('edit_surgery_id').value = surgery.surgery_id;
        document.getElementById('edit_surgery_name').value = surgery.surgery_name;
        document.getElementById('edit_surgery_type_id').value = surgery.surgery_type_id;
        document.getElementById('edit_surgery_price').value = surgery.surgery_price;
        document.getElementById('edit_is_available').value = surgery.is_available;

        editModal.show();
    };

    // Update Surgery
    async function updateSurgery() {
        const id = document.getElementById('edit_surgery_id').value;
        const name = document.getElementById('edit_surgery_name').value;
        const typeId = document.getElementById('edit_surgery_type_id').value;
        const price = document.getElementById('edit_surgery_price').value;
        const isAvailable = document.getElementById('edit_is_available').value;

        if (!name || !typeId || !price) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields.',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-surgeries.php`, {
                operation: 'updateSurgery',
                json: JSON.stringify({
                    surgery_id: parseInt(id),
                    surgery_name: name,
                    surgery_type_id: parseInt(typeId),
                    surgery_price: parseFloat(price),
                    is_available: parseInt(isAvailable)
                })
            });

            const data = response.data;

            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Surgery updated successfully',
                    icon: 'success'
                });
                editModal.hide();
                await loadAllSurgeries();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: data.message || 'Failed to update surgery',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating surgery', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to update surgery',
                icon: 'error'
            });
        }
    }

    // Initialize the module
    await loadSurgeryTypes();

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

    await loadAllSurgeries();
});
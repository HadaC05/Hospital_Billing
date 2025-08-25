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

    // Surgery management functionality
    const tableBody = document.getElementById('surgery-list');
    let surgeries = [];

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            loadSurgeries(page);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            loadSurgeries(1, itemsPerPage);
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
                const options = data.types.map(type => {
                    return `<option value="${type.surgery_type_id}">${type.surgery_type_name}</option>`;
                }).join('');

                // populate dropdowns
                const addTypeSelect = document.getElementById('surgery_type_id');
                const editTypeSelect = document.getElementById('edit_surgery_type_id');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value = "">Select Type</option>` + options;
            } else {
                const addTypeSelect = document.getElementById('surgery_type_id');
                const editTypeSelect = document.getElementById('edit_surgery_type_id');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">No types available</option>`;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">No types available</option>`;
            }
        } catch (error) {
            console.error('Failed to load surgery types: ', error);
        }
    }

    // Load Surgery List
    async function loadSurgeries(page = 1, itemsPerPage = 10, search = '') {
        if (!tableBody) {
            console.error('Surgery table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="4">Loading surgeries...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-surgeries.php`, {
                params: {
                    operation: 'getSurgeries',
                    page: page,
                    itemsPerPage: itemsPerPage,
                    search: search
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.surgeries)) {
                surgeries = data.surgeries;
                const paginationData = data.pagination;


                if (surgeries.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4"> No surgeries found. </td></tr>';
                    const paginationContainer = document.getElementById('pagination-container');
                    if (paginationContainer) {
                        paginationContainer.innerHTML = '';
                    }
                    return;
                }

                tableBody.innerHTML = '';

                surgeries.forEach(surg => {
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

                // Update pagination controls
                pagination.calculatePagination(paginationData.totalItems, paginationData.currentPage, paginationData.itemsPerPage);
                pagination.generatePaginationControls('pagination-container');
            } else {
                tableBody.innerHTML = `<tr><td colspan="4">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading surgeries: ', error);
            tableBody.innerHTML = '<tr><td colspan="4">Failed to load surgeries.</td></tr>';
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
                await loadSurgeries();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: 'Failed to add surgery',
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
        const surgery = surgeries.find(s => s.surgery_id == surgeryId);
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
                await loadSurgeries();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: 'Failed to update surgery',
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

    await loadSurgeryTypes();
    await loadSurgeries();

});
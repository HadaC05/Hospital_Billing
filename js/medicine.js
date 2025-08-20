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

    // Medicine management functionality
    const tableBody = document.getElementById('medicine-list');
    let medicines = [];

    // Modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addMedicineModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editMedicineModal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteMedicineModal'));

    // Form elements
    const addForm = document.getElementById('addMedicineForm');
    const editForm = document.getElementById('editMedicineForm');

    // Button event listeners
    document.getElementById('saveMedicineBtn').addEventListener('click', saveMedicine);
    document.getElementById('updateMedicineBtn').addEventListener('click', updateMedicine);
    document.getElementById('confirmDeleteMedicineBtn').addEventListener('click', deleteMedicine);

    // Load medicine types
    async function loadMedicineTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: { operation: 'getTypes' }
            });

            const data = response.data;
            const addTypeSelect = document.getElementById('med_type_id');
            const editTypeSelect = document.getElementById('edit_med_type_id');

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.med_type_id}">${type.med_type_name}</option>`;
                }).join('');

                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
            } else {
                if (addTypeSelect) addTypeSelect.innerHTML = `<option value="">No types available</option>`;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">No types available</option>`;
            }
        } catch (error) {
            console.error('Failed to load medicine types', error);
        }
    }

    // Load medicine list
    async function loadMedicines() {
        if (!tableBody) {
            console.error('Medicine table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="7">Loading medicines...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: { operation: 'getMedicines' }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.medicines)) {
                medicines = data.medicines;

                if (medicines.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7">No medicines found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                medicines.forEach(med => {
                    const isActive = med.is_active == 1 ? 'Active' : 'Inactive';
                    const statusBadge = med.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';

                    const row = `
                        <tr>
                            <td>${med.med_name}</td>
                            <td>${med.med_type_name}</td>
                            <td>₱${parseFloat(med.unit_price).toFixed(2)}</td>
                            <td>${med.stock_quantity}</td>
                            <td>${med.med_unit}</td>
                            <td><span class="${statusBadge}">${isActive}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="editMedicine(${med.med_id})" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteMedicine(${med.med_id}, '${med.med_name}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
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
        const medUnit = document.getElementById('med_unit').value.trim();
        const isActive = document.getElementById('is_active').value;

        if (!medName || !typeId || !unitPrice || !stockQty || !medUnit) {
            alert('Please fill in all required fields.');
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
                    med_unit: medUnit,
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                alert('Medicine added successfully!');
                addModal.hide();
                addForm.reset();
                await loadMedicines();
            } else {
                alert(data.message || 'Failed to add medicine.');
            }
        } catch (error) {
            console.error('Error adding medicine:', error);
            alert('Failed to add medicine. Please try again.');
        }
    }

    // Edit medicine
    window.editMedicine = async function (medId) {
        const med = medicines.find(m => m.med_id == medId);
        if (!med) {
            alert('Medicine not found.');
            return;
        }

        // Populate edit form
        document.getElementById('edit_med_id').value = med.med_id;
        document.getElementById('edit_med_name').value = med.med_name;
        document.getElementById('edit_med_type_id').value = med.med_type_id;
        document.getElementById('edit_unit_price').value = med.unit_price;
        document.getElementById('edit_stock_quantity').value = med.stock_quantity;
        document.getElementById('edit_med_unit').value = med.med_unit;
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
        const medUnit = document.getElementById('edit_med_unit').value.trim();
        const isActive = document.getElementById('edit_is_active').value;

        if (!medName || !typeId || !unitPrice || !stockQty || !medUnit) {
            alert('Please fill in all required fields.');
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
                    med_unit: medUnit,
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                alert('Medicine updated successfully!');
                editModal.hide();
                await loadMedicines();
            } else {
                alert(data.message || 'Failed to update medicine.');
            }
        } catch (error) {
            console.error('Error updating medicine:', error);
            alert('Failed to update medicine. Please try again.');
        }
    }

    // Confirm delete medicine
    window.confirmDeleteMedicine = function (medId, medName) {
        document.getElementById('delete_med_id').value = medId;
        document.getElementById('deleteMedicineName').textContent = medName;
        deleteModal.show();
    };

    // Delete medicine
    async function deleteMedicine() {
        const medId = document.getElementById('delete_med_id').value;

        try {
            const response = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                operation: 'deleteMedicine',
                json: JSON.stringify({
                    med_id: parseInt(medId)
                })
            });

            const data = response.data;
            if (data.success) {
                alert('Medicine deleted successfully!');
                deleteModal.hide();
                await loadMedicines();
            } else {
                alert(data.message || 'Failed to delete medicine.');
            }
        } catch (error) {
            console.error('Error deleting medicine:', error);
            alert('Failed to delete medicine. Please try again.');
        }
    }

    // Initialize the module
    await loadMedicineTypes();
    await loadMedicines();
});

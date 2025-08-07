console.log('medicine.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('medicine-list');
    const medForm = document.getElementById('addMedicineForm');
    const editForm = document.getElementById('editMedicineForm');
    const typeSelect = document.getElementById('med_type_id');
    const editTypeSelect = document.getElementById('edit_med_type_id');

    let medicines = [];

    // Load Medicine Types
    async function loadMedicineTypes() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: {
                    operation: 'getTypes'
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.med_type_id}">${type.med_type_name}</option>`;
                }).join('');

                if (typeSelect) typeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value="">Select Type</option>` + options;
            } else {
                typeSelect.innerHTML = '<option value="">No types available</option>';
            }
        } catch (error) {
            console.error('Failed to load medicine types: ', error);
        }
    }

    // Load Medicine List
    async function loadMedicines() {
        if (!tableBody) {
            console.error('Medicine table body not found.');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="7">Loading medicines...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: {
                    operation: 'getMedicines',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.medicines)) {
                medicines = data.medicines;

                if (medicines.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7">No medicines found. </td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                medicines.forEach(med => {
                    const isActive = med.is_active == 1 ? 'Active' : 'Inactive';

                    const row = `
                    <tr>
                        <td>${med.med_name}</td>
                        <td>${med.med_type_name}</td>
                        <td>${med.unit_price}</td>
                        <td>${med.stock_quantity}</td>
                        <td>${med.med_unit}</td>
                        <td>${isActive}</td>
                        <td>
                            <button class="btn btn-sm btn-warning edit-btn" data-id="${med.med_id}">Edit</button>
                        </td>
                    </tr>
                `;
                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="7">${data.message || 'No data found.'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading medicines: ', error);
            tableBody.innerHTML = '<tr><td colspan="7">Failed to load medicines.</td></tr>';
        }
    }

    // Add Medicine
    if (medForm) {
        medForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                med_name: document.getElementById('med_name').value.trim(),
                med_type_id: document.getElementById('med_type_id').value,
                unit_price: document.getElementById('unit_price').value,
                stock_quantity: document.getElementById('stock_quantity').value,
                med_unit: document.getElementById('med_unit').value.trim(),
                is_active: document.getElementById('is_active').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                    operation: 'addMedicine',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Medicine added successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to add medicine');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding medicine');
            }
        });
    }

    // Edit Button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const medId = e.target.dataset.id;
            const med = medicines.find(m => m.med_id == medId);

            if (med) {

                // await loadMedicineTypes();

                document.getElementById('edit_med_id').value = med.med_id;
                document.getElementById('edit_med_name').value = med.med_name;
                document.getElementById('edit_med_type_id').value = med.med_type_id;
                document.getElementById('edit_unit_price').value = med.unit_price;
                document.getElementById('edit_stock_quantity').value = med.stock_quantity;
                document.getElementById('edit_med_unit').value = med.med_unit;
                document.getElementById('edit_is_active').value = med.is_active;

                const modal = new bootstrap.Modal(document.getElementById('editMedicineModal'));
                modal.show();
            }
        }
    });

    // Update Form Submit 

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                med_id: document.getElementById('edit_med_id').value,
                med_name: document.getElementById('edit_med_name').value.trim(),
                med_type_id: document.getElementById('edit_med_type_id').value,
                unit_price: document.getElementById('edit_unit_price').value,
                stock_quantity: document.getElementById('edit_stock_quantity').value,
                med_unit: document.getElementById('edit_med_unit').value.trim(),
                is_active: document.getElementById('edit_is_active').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                    operation: 'updateMedicine',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Medicine updated successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to update medicine');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating medicine');
            }
        });
    }

    await loadMedicineTypes();
    await loadMedicines();
});
console.log('medicine.js is working');
const baseApiUrl = 'http://localhost/hospital_billing-master/api';
document.addEventListener('DOMContentLoaded', async () => {
    // Populate medicine types
    const medTypeSelect = document.getElementById('med_type_id');
    if (medTypeSelect) {
        try {
            const resp = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: { operation: 'getTypes', json: JSON.stringify({}) }
            });
            if (resp.data.success && Array.isArray(resp.data.types)) {
                medTypeSelect.innerHTML = '';
                resp.data.types.forEach(type => {
                    medTypeSelect.innerHTML += `<option value="${type.med_type_id}">${type.med_type_name}</option>`;
                });
            } else {
                medTypeSelect.innerHTML = '<option value="">No types found</option>';
            }
        } catch (err) {
            medTypeSelect.innerHTML = '<option value="">Error loading types</option>';
        }
    }
    // Load medicine list
    const tableBody = document.getElementById('medicine-list');
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
            if (data.medicines.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No medicines found.</td></tr>';
                return;
            }
            tableBody.innerHTML = '';
            data.medicines.forEach(med => {
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
                            <button class="btn btn-warning btn-sm update-medicine" data-id="${med.med_id}">Update</button>
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
    // Add Medicine
    const addMedicineForm = document.getElementById('addMedicineForm');
    if (addMedicineForm) {
        addMedicineForm.addEventListener('submit', async (e) => {
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
                const respData = response.data;
                if (respData.success) {
                    alert('Medicine added successfully');
                    window.location.reload();
                } else {
                    alert(respData.message || 'Failed to add medicine');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding medicine');
            }
        });
    } else {
        console.error('Add Medicine form not found.');
    }
    // Add modal HTML if not present
    if (!document.getElementById('medicineModal')) {
        const modalHtml = `
        <div class="modal fade" id="medicineModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <form id="medicineModalForm" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Update Medicine</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="modal_med_id">
                        <div class="mb-2">
                            <label>Name</label>
                            <input type="text" class="form-control" id="modal_med_name" required>
                        </div>
                        <div class="mb-2">
                            <label>Type</label>
                            <select class="form-select" id="modal_med_type_id" required></select>
                        </div>
                        <div class="mb-2">
                            <label>Unit Price</label>
                            <input type="number" class="form-control" id="modal_unit_price" required>
                        </div>
                        <div class="mb-2">
                            <label>Stock Quantity</label>
                            <input type="number" class="form-control" id="modal_stock_quantity" required>
                        </div>
                        <div class="mb-2">
                            <label>Unit</label>
                            <input type="text" class="form-control" id="modal_med_unit" required>
                        </div>
                        <div class="mb-2">
                            <label>Status</label>
                            <select class="form-select" id="modal_is_active">
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Update</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    // Helper to populate type select in modal
    async function populateModalTypeSelect(selectedId) {
        const select = document.getElementById('modal_med_type_id');
        try {
            const resp = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: { operation: 'getTypes', json: JSON.stringify({}) }
            });
            if (resp.data.success && Array.isArray(resp.data.types)) {
                select.innerHTML = '';
                resp.data.types.forEach(type => {
                    select.innerHTML += `<option value="${type.med_type_id}" ${type.med_type_id == selectedId ? 'selected' : ''}>${type.med_type_name}</option>`;
                });
            }
        } catch {}
    }
    // Update button logic
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('update-medicine')) {
            const medId = e.target.getAttribute('data-id');
            try {
                const resp = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                    params: { operation: 'getMedicine', json: JSON.stringify({ med_id: medId }) }
                });
                if (resp.data.success) {
                    const med = resp.data.medicine;
                    document.getElementById('modal_med_id').value = med.med_id;
                    document.getElementById('modal_med_name').value = med.med_name;
                    await populateModalTypeSelect(med.med_type_id);
                    document.getElementById('modal_unit_price').value = med.unit_price;
                    document.getElementById('modal_stock_quantity').value = med.stock_quantity;
                    document.getElementById('modal_med_unit').value = med.med_unit;
                    document.getElementById('modal_is_active').value = med.is_active;
                    new bootstrap.Modal(document.getElementById('medicineModal')).show();
                } else {
                    alert(resp.data.message || 'Not found');
                }
            } catch {
                alert('Failed to fetch medicine');
            }
        }
    });
    // Update logic
    document.getElementById('medicineModalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            med_id: document.getElementById('modal_med_id').value,
            med_name: document.getElementById('modal_med_name').value.trim(),
            med_type_id: document.getElementById('modal_med_type_id').value,
            unit_price: document.getElementById('modal_unit_price').value,
            stock_quantity: document.getElementById('modal_stock_quantity').value,
            med_unit: document.getElementById('modal_med_unit').value.trim(),
            is_active: document.getElementById('modal_is_active').value
        };
        try {
            const resp = await axios.post(`${baseApiUrl}/get-medicines.php`, {
                operation: 'updateMedicine',
                json: JSON.stringify(data)
            });
            if (resp.data.success) {
                alert('Medicine updated successfully');
                window.location.reload();
            } else {
                alert(resp.data.message || 'Failed to update');
            }
        } catch {
            alert('Error updating medicine');
        }
    });
});
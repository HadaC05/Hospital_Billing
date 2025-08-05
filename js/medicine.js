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
});

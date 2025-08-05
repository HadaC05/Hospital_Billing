console.log('medicine.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

// Load medicine list
document.addEventListener('DOMContentLoaded', async () => {


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
                tableBody.innerHTML = '<tr><td colspan="7">No medicines found. </td></tr>';
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

});


// Add Medicine
document.addEventListener('DOMContentLoaded', async () => {

    await loadMedicineTypes();

    const medForm = document.getElementById('addMedicineForm');

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
});

// Load the medicine types
async function loadMedicineTypes() {

    try {
        const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
            params: {
                operation: 'getTypes'
            }
        });

        const typeSelect = document.getElementById('med_type_id');

        if (!typeSelect) return;

        const data = response.data;

        if (data.success && Array.isArray(data.types)) {
            typeSelect.innerHTML = '<option value="">Select Type</option>';

            data.types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.med_type_id;
                option.textContent = type.med_type_name;
                typeSelect.appendChild(option);
            });
        } else {
            typeSelect.innerHTML = '<option value="">No types available</option>';
        }
    } catch (error) {
        console.error('Failed to load medicine types: ', error);
        const typeSelect = document.getElementById('med_type_id');
        if (typeSelect) {
            typeSelect.innerHTML = '<option value="">Error loading types</option>';
        }
    }
}

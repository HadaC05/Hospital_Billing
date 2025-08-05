console.log('treatments.js is working');

const baseApiUrl = 'http://localhost/hospital_billing-master/api';

// Load treatment list and populate category select
document.addEventListener('DOMContentLoaded', async () => {
    // Load treatment list
    const tableBody = document.getElementById('treatment-list');

    if (!tableBody) {
        console.error('Treatment table body not found.');
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="4">Loading treatments...</td></tr>';

    try {
        const response = await axios.get(`${baseApiUrl}/get-treatments.php`, {
            params: {
                operation: 'getTreatments',
                json: JSON.stringify({})
            }
        });

        const data = response.data;

        if (data.success && Array.isArray(data.treatments)) {
            if (data.treatments.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4">No treatments found.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';

            data.treatments.forEach(treatment => {
                const row = `
                    <tr>
                        <td>${treatment.treatment_name}</td>
                        <td>${treatment.unit_price}</td>
                        <td>${treatment.treatment_category}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } else {
            tableBody.innerHTML = `<tr><td colspan="4">${data.message || 'No data found.'}</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading treatments: ', error);
        tableBody.innerHTML = '<tr><td colspan="4">Failed to load treatments.</td></tr>';
    }

    // Populate treatment categories
    const categorySelect = document.getElementById('treatment_category_id');
    if (categorySelect) {
        try {
            const resp = await axios.get(`${baseApiUrl}/get-treatments.php`, {
                params: { operation: 'getTreatmentCategories', json: JSON.stringify({}) }
            });
            if (resp.data.success && Array.isArray(resp.data.categories)) {
                categorySelect.innerHTML = '';
                resp.data.categories.forEach(cat => {
                    categorySelect.innerHTML += `<option value="${cat.treatment_category_id}">${cat.category_name}</option>`;
                });
            } else {
                categorySelect.innerHTML = '<option value="">No categories found</option>';
            }
        } catch (err) {
            categorySelect.innerHTML = '<option value="">Error loading categories</option>';
        }
    }

    // Add Treatment
    const addTreatmentForm = document.getElementById('addTreatmentForm');
    if (addTreatmentForm) {
        addTreatmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                treatment_name: document.getElementById('treatment_name').value.trim(),
                unit_price: document.getElementById('unit_price').value,
                treatment_category_id: document.getElementById('treatment_category_id').value
            };

            try {
                const response = await axios.post('http://localhost/hospital_billing-master/api/get-treatments.php', {
                    operation: 'addTreatment',
                    json: JSON.stringify(data)
                });

                const respData = response.data;

                if (respData.success) {
                    alert('Treatment added successfully');
                    window.location.reload();
                } else {
                    alert(respData.message || 'Failed to add treatment');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding treatment');
            }
        });
    } else {
        console.error('Add Treatment form not found.');
    }
});
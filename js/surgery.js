console.log('surgery.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('surgery-list');
    const typeSelect = document.getElementById('surgery_type_id');
    const surgForm = document.getElementById('addSurgeryForm');
    const editForm = document.getElementById('editSurgeryForm');
    const editTypeSelect = document.getElementById('edit_surgery_type_id');

    let surgeries = [];

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

                if (typeSelect) typeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                if (editTypeSelect) editTypeSelect.innerHTML = `<option value = "">Select Type</option>` + options;
            } else {
                typeSelect.innerHTML = '<option value="">No types available</option>';
            }
        } catch (error) {
            console.error('Failed to load surgery types: ', error);
        }
    }

    // Load Surgery List
    async function loadSurgeries() {
        if (!tableBody) {
            console.error('Surgery table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="4">Loading surgeries...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-surgeries.php`, {
                params: {
                    operation: 'getSurgeries',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.surgeries)) {
                surgeries = data.surgeries;

                if (surgeries.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4"> No surgeries found. </td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                surgeries.forEach(surg => {
                    const isActive = surg.is_available == 1 ? 'Active' : 'Inactive';

                    const row = `
                        <tr>
                            <td>${surg.surgery_name}</td>
                            <td>${surg.surgery_type_name}</td>
                            <td>${surg.surgery_price}</td>
                            <td>${isActive}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-btn" data-id="${surg.surgery_id}">Edit</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="4">Failed to load surgeries.</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading surgeries: ', error);
            tableBody.innerHTML = '<tr><td colspan="4">Failed to load surgeries.</td></tr>';
        }
    }


    // Add Surgery
    if (surgForm) {
        surgForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                surgery_name: document.getElementById('surgery_name').value.trim(),
                surgery_type_id: document.getElementById('surgery_type_id').value,
                surgery_price: document.getElementById('surgery_price').value,
                is_available: document.getElementById('is_available').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-surgeries.php`, {
                    operation: 'addSurgery',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Surgery added successfully');
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
            const surgId = e.target.dataset.id;
            const surg = surgeries.find(s => s.surgery_id == surgId);

            if (surg) {
                // await loadSurgeryTypes();

                document.getElementById('edit_surgery_id').value = surg.surgery_id;
                document.getElementById('edit_surgery_name').value = surg.surgery_name;
                document.getElementById('edit_surgery_type_id').value = surg.surgery_type_id;
                document.getElementById('edit_surgery_price').value = surg.surgery_price;
                document.getElementById('edit_is_available').value = surg.is_available;

                const modal = new bootstrap.Modal(document.getElementById('editSurgeryModal'));
                modal.show();
            }
        }

    });

    // Update Form Submit

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                surgery_id: document.getElementById('edit_surgery_id').value,
                surgery_name: document.getElementById('edit_surgery_name').value,
                surgery_type_id: document.getElementById('edit_surgery_type_id').value,
                surgery_price: document.getElementById('edit_surgery_price').value,
                is_available: document.getElementById('edit_is_available').value
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-surgeries.php`, {
                    operation: 'updateSurgery',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Surgery updated successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to update surgery');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating surgery');
            }
        });
    }

    await loadSurgeryTypes();
    await loadSurgeries();

});
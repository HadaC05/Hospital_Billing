console.log("type-medicine.js is working");

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {

    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    const tableBody = document.getElementById('medicine-type-list');
    const typeForm = document.getElementById('addMedTypeForm');
    const editForm = document.getElementById('editMedTypeForm');


    let medTypes = [];

    // Load Medicine Type List
    async function loadMedicineTypes() {

        if (!tableBody) {
            console.error('Medicine types table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="2">Loading medicine types...</td></tr>';


        try {
            const response = await axios.get(`${baseApiUrl}/get-medicine-types.php`, {
                params: {
                    operation: 'getTypes',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {

                medTypes = data.types;

                if (medTypes.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="2">No medicine types found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                medTypes.forEach(medType => {
                    const row = `
                        <tr>
                            <td>${medType.med_type_name}</td>
                            <td>${medType.description}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-btn" data-id="${medType.med_type_id}">Edit</button>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="2">${data.message || 'No data found'}</td></tr>`;
            }

        } catch (error) {
            console.error('Error loading medicine types: ', error);
            tableBody.innerHTML = '<tr><td colspan="2">Failed to load medicine types.</td></tr>';
        }
    }

    // Add medicine type
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                med_type_name: document.getElementById('med_type_name').value.trim(),
                description: document.getElementById('description').value.trim()
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-medicine-types.php`, {
                    operation: 'addMedicineType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Medicine type added successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to add medicine type');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding medicine type');
            }
        });
    }

    // Edit Button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const medTypeId = e.target.dataset.id;
            const medType = medTypes.find(mt => mt.med_type_id == medTypeId);

            if (medType) {
                document.getElementById('edit_med_type_id').value = medType.med_type_id;
                document.getElementById('edit_med_type_name').value = medType.med_type_name;
                document.getElementById('edit_description').value = medType.description;

                const modal = new bootstrap.Modal(document.getElementById('editMedTypeModal'));
                modal.show();
            }
        }
    });

    // Edit Form Submit
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                med_type_id: document.getElementById('edit_med_type_id').value,
                med_type_name: document.getElementById('edit_med_type_name').value.trim(),
                description: document.getElementById('edit_description').value.trim()
            };

            try {

                const response = await axios.post(`${baseApiUrl}/get-medicine-types.php`, {
                    operation: 'updateMedType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Medicine updated successfullly');
                    window.location.reload();
                } else {
                    alert(resData.message || ' Failed to update medicine');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating medicine');
            }
        });
    }


    await loadMedicineTypes();
});
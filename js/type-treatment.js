console.log('type-treatment.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {

    // user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('User not found');
        window.location.href = '../index.html';
        return;
    }

    const tableBody = document.getElementById('treatment-type-list');
    const typeForm = document.getElementById('addTreatmentTypeForm');
    const updateForm = document.getElementById('editTreatmentTypeForm');

    let treatmentTypes = [];

    // load types
    async function loadTreatmentTypes() {

        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Treatment types loading...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-treatment-types.php`, {
                params: {
                    operation: 'getTypes',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {

                treatmentTypes = data.types;

                if (treatmentTypes.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="3">No treatment types found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                treatmentTypes.forEach(treatmentType => {

                    const row = `
                        <tr>
                            <td>${treatmentType.category_name}</td>
                            <td>${treatmentType.description}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-btn" data-id="${treatmentType.treatment_category_id}">Edit</button>
                            </td>
                        </tr>
                    `;

                    tableBody.innerHTML += row;
                })
            }
        } catch (error) {
            console.error('Error loading treatment types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load treatment types</td></tr>';
        }
    }

    // add new type
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                category_name: document.getElementById('category_name').value.trim(),
                description: document.getElementById('description').value.trim()
            }

            try {
                const response = await axios.post(`${baseApiUrl}/get-treatment-types.php`, {
                    operation: 'addType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Treatment type added successfully',
                        icon: 'success'
                    });
                    window.location.reload();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to add treatment type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error adding treatment type',
                    icon: 'error'
                });
            }
        });
    }
    // edit button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const treatId = e.target.dataset.id;
            const treatmentType = treatmentTypes.find(tt => tt.treatment_category_id == treatId);

            if (treatmentType) {
                document.getElementById('edit_treatment_category_id').value = treatmentType.treatment_category_id;
                document.getElementById('edit_category_name').value = treatmentType.category_name;
                document.getElementById('edit_description').value = treatmentType.description;

                const modal = new bootstrap.Modal(document.getElementById('editTreatmentTypeModal'));
                modal.show();
            }
        }
    });

    // edit form
    if (updateForm) {

        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                treatment_category_id: document.getElementById('edit_treatment_category_id').value,
                category_name: document.getElementById('edit_category_name').value.trim(),
                description: document.getElementById('edit_description').value.trim()
            };

            try {
                const response = await axios.post(`${baseApiUrl}/get-treatment-types.php`, {
                    operation: 'updateType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    Swal.fire({
                        title: 'Success',
                        text: 'Treatment type updated successfully',
                        icon: 'success'
                    });
                    window.location.reload();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to update treatment type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error updating treatment type',
                    icon: 'error'
                });
            }
        });
    }

    await loadTreatmentTypes();
});
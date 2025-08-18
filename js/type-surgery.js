console.log('type-surgery.js is working');

const baseApiUrl = "http://localhost/hospital_billing/api";

document.addEventListener("DOMContentLoaded", async () => {

    // check user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    const tableBody = document.getElementById('surgery-type-list');
    const typeForm = document.getElementById('addSurgeryTypeForm');
    const editForm = document.getElementById('editSurgeryTypeForm');

    // container
    let surgTypes = [];

    // load surgery types list
    async function loadSurgeryTypes() {

        if (!tableBody) {
            console.error('Surgery types table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="2">Loading surgery types...</td></tr>';


        try {
            console.log('Testing');
            const response = await axios.get(`${baseApiUrl}/get-surgery-types.php`, {
                params: {
                    operation: 'getTypes',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {

                surgTypes = data.types;

                if (surgTypes.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="2">No surgery types found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                surgTypes.forEach(surgType => {

                    const row = `
                        <tr>
                            <td>${surgType.surgery_type_name}</td>
                            <td>${surgType.description}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-btn" data-id="${surgType.surgery_type_id}">Edit</button>
                            </td>
                        </tr>
                    `;


                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="2">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading surgery types: ', error);
            tableBody.innerHTML = '<tr><td colspan="2">Failed to load surgery types</td></tr>';
        }

    }

    // add surgery type
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                surgery_type_name: document.getElementById('surgery_type_name').value.trim(),
                description: document.getElementById('description').value.trim()
            }

            try {

                const response = await axios.post(`${baseApiUrl}/get-surgery-types.php`, {
                    operation: 'addSurgeryType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Surgery Type added successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to add surgery type');
                }

            } catch (error) {
                console.error(error);
                alert('Error adding surgery type');
            }

        });
    }

    // edit button. kani nga format tungod naa sa js nahimo ang edit button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const surgTypeId = e.target.dataset.id;
            const surgType = surgTypes.find(st => st.surgery_type_id == surgTypeId);

            if (surgType) {
                document.getElementById('edit_surgery_type_id').value = surgType.surgery_type_id;
                document.getElementById('edit_surgery_type_name').value = surgType.surgery_type_name;
                document.getElementById('edit_description').value = surgType.description;

                const modal = new bootstrap.Modal(document.getElementById('editSurgeryTypeModal'));
                modal.show();
            }
        }
    })
    // edit form submit
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();


            const data = {
                surgery_type_id: document.getElementById('edit_surgery_type_id').value,
                surgery_type_name: document.getElementById('edit_surgery_type_name').value,
                description: document.getElementById('edit_description').value
            }

            try {


                const response = await axios.post(`${baseApiUrl}/get-surgery-types.php`, {
                    operation: 'updateSurgeryType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Surgery type updated successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to update surgery type.');

                }
            } catch (error) {
                console.error(error);
                alert('Error updating surgery');
            }
        })
    }

    await loadSurgeryTypes();
});
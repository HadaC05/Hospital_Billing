console.log('type-labtest.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {

    // user authentication
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('User not found. Redirecting to login...');
        window.location.href = '../index.html';
        return;
    }

    const tableBody = document.getElementById('labtest-type-list');
    const typeForm = document.getElementById('addLabtestTypeForm');
    const updateForm = document.getElementById('editLabtestTypeForm');

    let testTypes = [];

    // load types
    async function loadLabtestTypes() {

        if (!tableBody) {
            console.error('Table body not gounf');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Loading labtest types...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtest-types.php`, {
                params: {
                    operation: 'getTypes',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {

                testTypes = data.types;

                if (testTypes.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="3">No labtest types found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                testTypes.forEach(testType => {
                    const row = `
                        <tr>
                            <td>${testType.labtest_category_name}</td>
                            <td>${testType.labtest_category_desc}</td>
                            <td>
                                <button class="btn btn-sm btn-warning edit-btn" data-id="${testType.labtest_category_id}">Edit</button>
                            </td>
                        </tr>
                    `;

                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="3">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading labtest types: ', error);
            tableBody.innerHTML = '<tr><td colspan="2">Failed to load labtest types</td></tr>';
        }
    }

    // add form
    if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                labtest_category_name: document.getElementById('labtest_category_name').value.trim(),
                labtest_category_desc: document.getElementById('labtest_category_desc').value.trim()
            }

            try {

                const response = await axios.post(`${baseApiUrl}/get-labtest-types.php`, {
                    operation: 'addType',
                    json: JSON.stringify(data)
                });

                const resData = response.data

                if (resData.success) {
                    alert('Labtest type added successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to add labtest type');
                }
            } catch (error) {
                console.error(error);
                alert('Error adding labtest type');
            }
        });
    }

    // edit button
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const testId = e.target.dataset.id;
            const testType = testTypes.find(lt => lt.labtest_category_id == testId);

            if (testType) {
                document.getElementById('edit_labtest_category_id').value = testType.labtest_category_id;
                document.getElementById('edit_labtest_category_name').value = testType.labtest_category_name;
                document.getElementById('edit_labtest_category_desc').value = testType.labtest_category_desc;

                const modal = new bootstrap.Modal(document.getElementById('editLabtestTypeModal'));
                modal.show();
            }
        }
    });

    // edit form
    if (updateForm) {
        updateForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const data = {
                labtest_category_id: document.getElementById('edit_labtest_category_id').value,
                labtest_category_name: document.getElementById('edit_labtest_category_name').value.trim(),
                labtest_category_desc: document.getElementById('edit_labtest_category_desc').value.trim()
            }

            try {
                const response = await axios.post(`${baseApiUrl}/get-labtest-types.php`, {
                    operation: 'updateType',
                    json: JSON.stringify(data)
                });

                const resData = response.data;

                if (resData.success) {
                    alert('Labtest type updated successfully');
                    window.location.reload();
                } else {
                    alert(resData.message || 'Failed to update labtest type');
                }
            } catch (error) {
                console.error(error);
                alert('Error updating labtest type');
            }
        });
    }

    await loadLabtestTypes();
});
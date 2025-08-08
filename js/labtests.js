console.log('labtests.js is working');

document.addEventListener('DOMContentLoaded', async () => {

    const baseApiUrl = 'http://localhost/hospital_billing/api';

    const tableBody = document.getElementById('labtest-list');
    const typeSelect = document.getElementById('labtest_category_id');


    let labtests = [];

    // load labtest types

    async function loadLabtestTypes() {

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getTypes'
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.types)) {
                const options = data.types.map(type => {
                    return `<option value="${type.labtest_category_id}">${type.labtest_category_name}</option>`;
                }).join('');

                if (typeSelect) typeSelect.innerHTML = `<option value="">Select Type</option>` + options;
                // for editing here
            } else {
                typeSelect.innerHTML = `<option value="">No types available</option>`;
            }
        } catch (error) {
            console.error('Failed to load labtest types', error);
        }
    }

    // load labtest list
    async function loadLabtest() {
        if (!tableBody) {
            console.error('Labtest table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="4">Loading labtests...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getLabtests',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.labtests)) {
                labtests = data.labtests;

                if (labtests.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4">No labtests found</td></tr>';
                    return;
                }

                tableBody.innerHTML = '';

                labtests.forEach(test => {
                    const isActive = test.is_active == 1 ? 'Active' : 'Inactive';

                    const row = `
                        <tr>
                            <td>${test.test_name}</td>
                            <td>${test.labtest_category_name}</td>
                            <td>${test.unit_price}</td>
                            <td>${isActive}</td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="4">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading labtests: ', error);
            tableBody.innerHTML = '<tr><td colspan="4">Failed to load labtests</td></tr>';

        }
    }

    await loadLabtestTypes();
    await loadLabtest();
});
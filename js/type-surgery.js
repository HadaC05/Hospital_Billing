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


    // edit button


    // edit form

    await loadSurgeryTypes();
});
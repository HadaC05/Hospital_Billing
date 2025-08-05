console.log('surgery.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('surgery-list');

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
    await loadSurgeries();

});
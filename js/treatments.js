console.log('treatments.js is working');

document.addEventListener('DOMContentLoaded', async () => {
    const baseApiUrl = 'http://localhost/hospital_billing/api';
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Check if user has permission to manage treatments
    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });
        const data = response.data;
        if (!data.success || !data.permissions.includes('manage_treatments')) {
            alert('You do not have permission to access this page.');
            window.location.href = '../dashboard.html';
            return;
        }

        // Store permissions for sidebar rendering
        window.userPermissions = data.permissions;
    } catch (error) {
        console.error('Error checking permissions:', error);
        alert('Failed to verify permissions. Please try again.');
        window.location.href = '../dashboard.html';
        return;
    }

    // Load treatment list and populate category select
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
                        <td>
                            <button class="btn btn-warning btn-sm update-treatment" data-id="${treatment.treatment_id}">Update</button>
                        </td>
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
                // Add default "Select a category" option
                categorySelect.innerHTML = '<option value="">Select a category</option>';
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
                const response = await axios.post(`${baseApiUrl}/get-treatments.php`, {
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
    // Add modal HTML if not present
    if (!document.getElementById('treatmentModal')) {
        const modalHtml = `
        <div class="modal fade" id="treatmentModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <form id="treatmentModalForm" class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Update Treatment</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="modal_treatment_id">
                        <div class="mb-2">
                            <label>Treatment Name</label>
                            <input type="text" class="form-control" id="modal_treatment_name" required>
                        </div>
                        <div class="mb-2">
                            <label>Unit Price</label>
                            <input type="number" class="form-control" id="modal_unit_price" required>
                        </div>
                        <div class="mb-2">
                            <label>Category</label>
                            <select class="form-select" id="modal_treatment_category_id" required></select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-primary">Update</button>
                    </div>
                </form>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    // Helper to populate category select in modal
    async function populateModalCategorySelect(selectedId) {
        const select = document.getElementById('modal_treatment_category_id');
        try {
            const resp = await axios.get(`${baseApiUrl}/get-treatments.php`, {
                params: { operation: 'getTreatmentCategories', json: JSON.stringify({}) }
            });
            if (resp.data.success && Array.isArray(resp.data.categories)) {
                select.innerHTML = '';
                resp.data.categories.forEach(cat => {
                    select.innerHTML += `<option value="${cat.treatment_category_id}" ${cat.treatment_category_id == selectedId ? 'selected' : ''}>${cat.category_name}</option>`;
                });
            }
        } catch { }
    }
    // Update button logic
    tableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('update-treatment')) {
            const treatmentId = e.target.getAttribute('data-id');
            try {
                const resp = await axios.get(`${baseApiUrl}/get-treatments.php`, {
                    params: { operation: 'getTreatment', json: JSON.stringify({ treatment_id: treatmentId }) }
                });
                if (resp.data.success) {
                    const treatment = resp.data.treatment;
                    document.getElementById('modal_treatment_id').value = treatment.treatment_id;
                    document.getElementById('modal_treatment_name').value = treatment.treatment_name;
                    document.getElementById('modal_unit_price').value = treatment.unit_price;
                    await populateModalCategorySelect(treatment.treatment_category_id);
                    new bootstrap.Modal(document.getElementById('treatmentModal')).show();
                } else {
                    alert(resp.data.message || 'Treatment not found');
                }
            } catch {
                alert('Failed to fetch treatment');
            }
        }
    });
    // Update logic
    document.getElementById('treatmentModalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            treatment_id: document.getElementById('modal_treatment_id').value,
            treatment_name: document.getElementById('modal_treatment_name').value.trim(),
            unit_price: document.getElementById('modal_unit_price').value,
            treatment_category_id: document.getElementById('modal_treatment_category_id').value
        };
        try {
            const resp = await axios.post(`${baseApiUrl}/get-treatments.php`, {
                operation: 'updateTreatment',
                json: JSON.stringify(data)
            });
            if (resp.data.success) {
                alert('Treatment updated successfully');
                window.location.reload();
            } else {
                alert(resp.data.message || 'Failed to update treatment');
            }
        } catch {
            alert('Error updating treatment');
        }
    });
});
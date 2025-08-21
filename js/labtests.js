console.log('labtests.js is working');

const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }


    // Labtest management functionality
    const tableBody = document.getElementById('labtest-list');
    let labtests = [];

    // Modal elements
    const addModal = new bootstrap.Modal(document.getElementById('addLabtestModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editLabtestModal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteLabtestModal'));

    // Form elements
    const addForm = document.getElementById('addLabtestForm');
    const editForm = document.getElementById('editLabtestForm');

    // Button event listeners
    document.getElementById('saveLabtestBtn').addEventListener('click', saveLabtest);
    document.getElementById('updateLabtestBtn').addEventListener('click', updateLabtest);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteLabtest);

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

                // Populate all category dropdowns
                const addCategorySelect = document.getElementById('add_labtest_category_id');
                const editCategorySelect = document.getElementById('edit_labtest_category_id');

                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">Select Category</option>` + options;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">Select Category</option>` + options;
            } else {
                const addCategorySelect = document.getElementById('add_labtest_category_id');
                const editCategorySelect = document.getElementById('edit_labtest_category_id');

                if (addCategorySelect) addCategorySelect.innerHTML = `<option value="">No categories available</option>`;
                if (editCategorySelect) editCategorySelect.innerHTML = `<option value="">No categories available</option>`;
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

        tableBody.innerHTML = '<tr><td colspan="5">Loading labtests...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getLabtests'
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
                    const statusBadge = test.is_active == 1 ? 'badge bg-success' : 'badge bg-secondary';

                    const row = `
                        <tr>
                            <td>${test.test_name}</td>
                            <td>${test.labtest_category_name}</td>
                            <td>₱${parseFloat(test.unit_price).toFixed(2)}</td>
                            <td><span class="${statusBadge}">${isActive}</span></td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="editLabtest(${test.labtest_id})" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteLabtest(${test.labtest_id}, '${test.test_name}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
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

    // CRUD Functions

    // Create new lab test
    async function saveLabtest() {
        const testName = document.getElementById('add_test_name').value.trim();
        const categoryId = document.getElementById('add_labtest_category_id').value;
        const unitPrice = document.getElementById('add_unit_price').value;

        if (!testName || !categoryId || !unitPrice) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'createLabtest',
                json: JSON.stringify({
                    test_name: testName,
                    labtest_category_id: categoryId,
                    unit_price: parseFloat(unitPrice),
                    is_active: 1
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Lab test added successfully!',
                    icon: 'success'
                });
                addModal.hide();
                addForm.reset();
                await loadLabtest();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: 'Failed to add lab test',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error adding lab test:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to add lab test',
                icon: 'error'
            });
        }
    }

    // Edit lab test
    window.editLabtest = async function (labtestId) {
        const labtest = labtests.find(test => test.labtest_id == labtestId);
        if (!labtest) {
            Swal.fire({
                title: 'Failed',
                text: 'Lab test not found.',
                icon: 'error'
            });
            return;
        }

        // Populate edit form
        document.getElementById('edit_labtest_id').value = labtest.labtest_id;
        document.getElementById('edit_test_name').value = labtest.test_name;
        document.getElementById('edit_labtest_category_id').value = labtest.labtest_category_id;
        document.getElementById('edit_unit_price').value = labtest.unit_price;
        document.getElementById('edit_is_active').value = labtest.is_active;

        editModal.show();
    };

    // Update lab test
    async function updateLabtest() {
        const labtestId = document.getElementById('edit_labtest_id').value;
        const testName = document.getElementById('edit_test_name').value.trim();
        const categoryId = document.getElementById('edit_labtest_category_id').value;
        const unitPrice = document.getElementById('edit_unit_price').value;
        const isActive = document.getElementById('edit_is_active').value;

        if (!testName || !categoryId || !unitPrice) {
            Swal.fire({
                title: 'Warning',
                text: 'Please fill in all required fields',
                icon: 'warning'
            });
            return;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'updateLabtest',
                json: JSON.stringify({
                    labtest_id: parseInt(labtestId),
                    test_name: testName,
                    labtest_category_id: categoryId,
                    unit_price: parseFloat(unitPrice),
                    is_active: parseInt(isActive)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Lab test updated successfully!',
                    icon: 'success'
                });
                editModal.hide();
                await loadLabtest();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: 'Failed to update lab test.',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error updating lab test:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to update lab test',
                icon: 'error'
            });
        }
    }

    // Confirm delete lab test
    window.confirmDeleteLabtest = function (labtestId, testName) {
        document.getElementById('delete_labtest_id').value = labtestId;
        document.getElementById('deleteLabtestName').textContent = testName;
        deleteModal.show();
    };

    // Delete lab test
    async function deleteLabtest() {
        const labtestId = document.getElementById('delete_labtest_id').value;

        try {
            const response = await axios.post(`${baseApiUrl}/get-labtests.php`, {
                operation: 'deleteLabtest',
                json: JSON.stringify({
                    labtest_id: parseInt(labtestId)
                })
            });

            const data = response.data;
            if (data.success) {
                Swal.fire({
                    title: 'Success',
                    text: 'Lab test deleted successfully!',
                    icon: 'success'
                });
                deleteModal.hide();
                await loadLabtest();
            } else {
                Swal.fire({
                    title: 'Failed',
                    text: 'Failed to delete lab test',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error deleting lab test:', error);
            Swal.fire({
                title: 'Failed',
                text: 'Failed to delete lab test',
                icon: 'error'
            });
        }
    }

    // Initialize the module
    await loadLabtestTypes();
    await loadLabtest();
});
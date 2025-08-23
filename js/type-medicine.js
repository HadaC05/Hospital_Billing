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

    // DOM elements
    const tableBody = document.getElementById('medicine-type-list');
    const typeForm = document.getElementById('addMedTypeForm');
    const editForm = document.getElementById('editMedTypeForm');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');

    let medTypes = [];
    let filteredTypes = [];

    // Load Medicine Type List
    async function loadMedicineTypes() {
        if (!tableBody) {
            console.error('Medicine types table body not found');
            return;
        }

        tableBody.innerHTML = '<tr><td colspan="3">Loading medicine types...</td></tr>';

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
                filteredTypes = [...medTypes];
                renderTable(filteredTypes);
            } else {
                tableBody.innerHTML = `<tr><td colspan="3">${data.message || 'No data found'}</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading medicine types: ', error);
            tableBody.innerHTML = '<tr><td colspan="3">Failed to load medicine types.</td></tr>';
        }
    }

    // Render table with provided data
    function renderTable(typesToRender) {
        if (!tableBody) {
            console.error('Table body not found');
            return;
        }

        if (typesToRender.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="3">No medicine types found</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        typesToRender.forEach(medType => {
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
    }

    // Filter medicine types based on search and filter criteria
    function filterMedicineTypes() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterType = filterSelect.value;

        filteredTypes = medTypes.filter(type => {
            const matchesSearch = searchTerm === '' ||
                type.med_type_name.toLowerCase().includes(searchTerm) ||
                type.description.toLowerCase().includes(searchTerm);

            let matchesFilter = true;
            if (filterType === 'name') {
                matchesFilter = type.med_type_name.toLowerCase().includes(searchTerm);
            } else if (filterType === 'description') {
                matchesFilter = type.description.toLowerCase().includes(searchTerm);
            }

            return matchesSearch && matchesFilter;
        });

        renderTable(filteredTypes);
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
                    Swal.fire({
                        title: 'Success',
                        text: 'Medicine type added successfully!',
                        icon: 'success'
                    });

                    // Reset form and reload data
                    typeForm.reset();
                    await loadMedicineTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('addMedTypeModal'));
                    modal.hide();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to add medicine type.',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error adding medicine type',
                    icon: 'error'
                });
            }
        });
    }

    // Edit button click handler
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

    // Edit form submission
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
                    Swal.fire({
                        title: 'Success',
                        text: 'Medicine type updated successfully!',
                        icon: 'success'
                    });

                    // Reload data
                    await loadMedicineTypes();

                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('editMedTypeModal'));
                    modal.hide();
                } else {
                    Swal.fire({
                        title: 'Failed',
                        text: 'Failed to update medicine type',
                        icon: 'error'
                    });
                }
            } catch (error) {
                console.error(error);
                Swal.fire({
                    title: 'Failed',
                    text: 'Error updating medicine type',
                    icon: 'error'
                });
            }
        });
    }

    // Search input event listener
    if (searchInput) {
        searchInput.addEventListener('input', filterMedicineTypes);
    }

    // Filter select event listener
    if (filterSelect) {
        filterSelect.addEventListener('change', filterMedicineTypes);
    }

    // Initial load
    await loadMedicineTypes();
});
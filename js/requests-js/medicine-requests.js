console.log('medicine-requests.js is working');

document.addEventListener("DOMContentLoaded", async () => {
    const apiBase = `${window.location.origin}/hospital_billing/api`;
    const tbody = document.getElementById("request-list");
    const selectAllCheckbox = document.getElementById("selectAllCheckbox");
    const dispenseSelectedBtn = document.getElementById("dispenseSelectedBtn");
    const dispenseModal = new bootstrap.Modal(document.getElementById('dispenseModal'));
    const searchInput = document.getElementById('searchInput');
    let allRequests = [];

    async function loadRequests() {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">Loading...</td></tr>`;
        try {
            const response = await axios.get(`${apiBase}/requests-php/medicine-requests.php`, {
                params: { operation: "getRequests" },
                withCredentials: true
            });

            const data = response.data;
            if (!data.success || !data.requests || data.requests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No pending requests found.</td></tr>`;
                return;
            }
            allRequests = data.requests;
            renderRequests(allRequests);
        } catch (err) {
            console.error("Error fetching requests:", err);
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load requests</td></tr>`;
        }
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredRequests = allRequests.filter(group => 
            group.patient_name.toLowerCase().includes(searchTerm) || 
            group.doctor_name.toLowerCase().includes(searchTerm)
        );
        renderRequests(filteredRequests);
    });

    function renderRequests(requests) {
        tbody.innerHTML = "";
        requests.forEach(group => {
            const tr = document.createElement("tr");
            const requestIds = group.items.map(item => item.request_id);
            tr.dataset.patientId = group.patient_id;
            tr.innerHTML = `
                <td class="text-center"><input type="checkbox" class="request-checkbox" data-request-ids='${JSON.stringify(requestIds)}'></td>
                <td>${new Date(group.request_date).toLocaleDateString()}</td>
                <td>${group.doctor_name}</td>
                <td>${group.patient_name}</td>
                <td><span class="badge bg-secondary">${group.items.length}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary dispense-btn" data-patient-id="${group.patient_id}">
                        <i class="fas fa-pills"></i> Dispense
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateDispenseSelectedButtonState() {
        const selectedCheckboxes = document.querySelectorAll('.request-checkbox:checked');
        dispenseSelectedBtn.disabled = selectedCheckboxes.length === 0;
    }

    tbody.addEventListener('change', (e) => {
        if (e.target.classList.contains('request-checkbox')) {
            updateDispenseSelectedButtonState();
        }
    });

    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.request-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = e.target.checked);
        updateDispenseSelectedButtonState();
    });

    tbody.addEventListener('click', (e) => {
        const dispenseBtn = e.target.closest('.dispense-btn');
        if (dispenseBtn) {
            const patientId = dispenseBtn.dataset.patientId;
            const patientGroup = allRequests.find(r => r.patient_id == patientId);
            if (!patientGroup) return;

            document.getElementById('dispenseDoctor').textContent = patientGroup.doctor_name;
            document.getElementById('dispensePatient').textContent = patientGroup.patient_name;

            const itemsContainer = document.getElementById('dispense-items-container');
            itemsContainer.innerHTML = `
                <table class="table table-sm table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th class="text-center"><input type="checkbox" id="selectAllModalCheckbox"></th>
                            <th>Medicine</th>
                            <th>Quantity</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody id="dispense-items-tbody">
                        ${patientGroup.items.map(req => `
                            <tr>
                                <td class="text-center"><input type="checkbox" class="dispense-item-checkbox" value="${req.request_id}"></td>
                                <td>${req.med_name} (${req.unit_name})</td>
                                <td>${req.quantity}</td>
                                <td>${req.notes || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            const confirmBtn = document.getElementById('confirmDispenseBtn');
            confirmBtn.disabled = true;

            const modalCheckboxes = itemsContainer.querySelectorAll('.dispense-item-checkbox');
            const selectAllModalCheckbox = itemsContainer.querySelector('#selectAllModalCheckbox');

            const updateTotalState = () => {
                const checkedCount = itemsContainer.querySelectorAll('.dispense-item-checkbox:checked').length;
                confirmBtn.disabled = checkedCount === 0;
                selectAllModalCheckbox.checked = modalCheckboxes.length > 0 && checkedCount === modalCheckboxes.length;
            };

            modalCheckboxes.forEach(cb => cb.addEventListener('change', updateTotalState));
            selectAllModalCheckbox.addEventListener('change', (event) => {
                modalCheckboxes.forEach(cb => cb.checked = event.target.checked);
                updateTotalState();
            });

            dispenseModal.show();
        }
    });

    document.getElementById('confirmDispenseBtn').addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('#dispense-items-tbody .dispense-item-checkbox:checked');
        const requestIds = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (requestIds.length === 0) {
            Swal.fire('No selection', 'Please select at least one item to dispense.', 'warning');
            return;
        }

        try {
            const res = await axios.post(`${apiBase}/requests-php/medicine-requests.php`, {
                operation: "dispenseMultipleRequests",
                request_ids: requestIds
            }, { withCredentials: true });

            if (res.data.success) {
                Swal.fire('Dispensed!', `${requestIds.length} item(s) have been dispensed.`, 'success');
                dispenseModal.hide();
                requestIds.forEach(id => removeRequestFromUI(id));
                updateDispenseSelectedButtonState();
            } else {
                Swal.fire('Failed', res.data.message || 'Failed to dispense items.', 'error');
            }
        } catch (err) {
            console.error("Error dispensing multiple requests:", err);
            Swal.fire('Error', 'An unexpected error occurred while dispensing.', 'error');
        }
    });

    dispenseSelectedBtn.addEventListener('click', async () => {
        const selectedCheckboxes = document.querySelectorAll('.request-checkbox:checked');
        let requestIds = [];
        selectedCheckboxes.forEach(cb => {
            const ids = JSON.parse(cb.dataset.requestIds || '[]');
            requestIds.push(...ids);
        });

        if (requestIds.length === 0) return;

        Swal.fire({
            title: `Dispense ${requestIds.length} selected items?`,
            text: "This will mark them as dispensed and update stock.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, dispense them!',
            cancelButtonText: 'No, cancel'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await axios.post(`${apiBase}/requests-php/medicine-requests.php`, {
                        operation: "dispenseMultipleRequests",
                        request_ids: requestIds
                    }, { withCredentials: true });

                    if (res.data.success) {
                        Swal.fire('Dispensed!', 'The selected items have been dispensed.', 'success');
                        requestIds.forEach(id => removeRequestFromUI(id));
                        updateDispenseSelectedButtonState();
                    } else {
                        Swal.fire('Failed', res.data.message || 'Failed to dispense items.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    Swal.fire('Error', 'An error occurred while dispensing items.', 'error');
                }
            }
        });
    });

    function removeRequestFromUI(requestId) {
        allRequests = allRequests.map(group => {
            group.items = group.items.filter(item => item.request_id != requestId);
            return group;
        }).filter(group => group.items.length > 0);

        renderRequests(allRequests);

        if (tbody.children.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No pending requests found.</td></tr>`;
        }
    }

    loadRequests();
});

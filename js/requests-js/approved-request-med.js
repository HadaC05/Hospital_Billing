console.log('approved-request-med.js is working');

document.addEventListener("DOMContentLoaded", async () => {
    const apiBase = `${window.location.origin}/hospital_billing/api`;

    const dispenseModal = new bootstrap.Modal(document.getElementById('dispenseModal'));
    let currentRequest = null; // store request data for modal

    async function loadApprovedRequests() {
        const tbody = document.getElementById("request-list");
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">Loading...</td></tr>`;

        try {
            const response = await axios.get(`${apiBase}/requests-php/approved-request-med.php`, {
                params: { operation: "getApprovedRequests" },
                withCredentials: true
            });

            const data = response.data;
            if (!data.success || !data.requests || data.requests.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No approved requests found.</td></tr>`;
                return;
            }

            tbody.innerHTML = "";
            data.requests.forEach(req => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${new Date(req.request_date).toLocaleDateString()}</td>
                    <td>${req.doctor_name}</td>
                    <td>${req.patient_name}</td>
                    <td>${req.med_name} (${req.unit_name})</td>
                    <td>${req.quantity}</td>
                    <td>${req.notes || "-"}</td>
                    <td>
                        <button class="btn btn-sm btn-primary dispense-btn" data-id="${req.request_id}">
                            <i class="fas fa-prescription-bottle-alt"></i> Dispense
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Add event listeners for dispense buttons
            document.querySelectorAll(".dispense-btn").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    const requestId = e.currentTarget.dataset.id;
                    if (!requestId) return;

                    // find the clicked request details
                    currentRequest = data.requests.find(r => r.request_id == requestId);
                    if (!currentRequest) return;

                    // populate modal fields
                    document.getElementById('dispenseRequestId').value = currentRequest.request_id;
                    document.getElementById('dispenseDoctor').textContent = currentRequest.doctor_name;
                    document.getElementById('dispensePatient').textContent = currentRequest.patient_name;
                    document.getElementById('dispenseMedicine').textContent = `${currentRequest.med_name} (${currentRequest.unit_name})`;
                    document.getElementById('dispenseQuantity').textContent = currentRequest.quantity;
                    document.getElementById('dispenseStock').textContent = currentRequest.stock_quantity || "N/A";
                    document.getElementById('dispenseNotes').textContent = currentRequest.notes || "-";

                    // show modal
                    dispenseModal.show();
                });
            });

        } catch (err) {
            console.error("Error fetching approved requests:", err);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load requests</td></tr>`;
        }
    }

    // handle confirm dispense button
    document.getElementById('confirmDispenseBtn').addEventListener('click', async () => {
        if (!currentRequest) return;

        const requestId = currentRequest.request_id;

        try {
            const res = await axios.post(`${apiBase}/requests-php/approved-request-med.php`, {
                operation: "dispenseRequest",
                request_id: requestId
            }, { withCredentials: true });

            if (res.data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Dispensed!',
                    text: 'Medicine has been successfully dispensed.',
                    timer: 1500,
                    showConfirmButton: false
                });

                dispenseModal.hide();
                loadApprovedRequests(); // refresh table
            } else {
                Swal.fire('Error', res.data.message, 'error');
            }
        } catch (err) {
            console.error("Error dispensing request:", err);
            Swal.fire('Error', 'An unexpected error occurred.', 'error');
        }
    });

    loadApprovedRequests();
});

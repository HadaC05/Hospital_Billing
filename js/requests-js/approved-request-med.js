console.log('approved-request-med.js is working');

document.addEventListener("DOMContentLoaded", async () => {
    const apiBase = `${window.location.origin}/hospital_billing/api`;

    async function loadPendingRequests() {
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
                        <button class="btn btn-sm btn-success approve-btn" data-id="${req.request_id}">
                            <i class="fas fa-check"></i> Approve
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

        } catch (err) {
            console.error("Error fetching approved requests:", err);
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load requests</td></tr>`;
        }
    }

    loadPendingRequests();
});

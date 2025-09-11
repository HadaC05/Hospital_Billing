console.log('doctor-requests.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const apiBase = `${window.location.origin}/hospital_billing/api`;

    // Table elements
    const tbody = document.getElementById('request-list');

    // Load doctor requests
    async function loadRequests() {
        try {
            const response = await axios.get(`${apiBase}/doctor-php/doctor-requests.php`, {
                params: { operation: "getRequests" },
                withCredentials: true
            });

            const data = response.data;
            if (!data.success) {
                console.error("Error fetching doctor requests:", data.message);
                renderRequests([]);
                return;
            }

            renderRequests(data.requests);
        } catch (err) {
            console.error("API error:", err);
            renderRequests([]);
        }
    }

    // Render requests table
    function renderRequests(requests) {
        if (!tbody) return;
        tbody.innerHTML = "";

        if (!requests || requests.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">No requests found.</td>
            </tr>
        `;
            return;
        }

        requests.forEach((request) => {
            const row = document.createElement("tr");
            const statusBadge = getStatusBadge(request.status);
            let typeIcon = "fas fa-concierge-bell";
            switch (request.svc_name) {
                case "Medication":
                    typeIcon = "fas fa-pills";
                    break;
                case "Lab Test":
                    typeIcon = "fas fa-vial";
                    break;
                case "Surgery":
                    typeIcon = "fas fa-procedures";
                    break;
                case "Room":
                    typeIcon = "fas fa-bed";
                    break;
                case "Treatment":
                    typeIcon = "fas fa-stethoscope";
                    break;
            }

            row.innerHTML = `
            <td>${formatDate(request.request_date)}</td>
            <td>${safe(request.patient_name)}</td>
            <td><i class="${typeIcon} me-1"></i>${safe(request.svc_name)}</td>
            <td>${safe(request.item_name || "-")}</td>
            <td>${safe(request.quantity || "-")}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary view-request-btn" 
                        data-request-id="${request.request_id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;

            tbody.appendChild(row);
        });
    }

    // Get status badge HTML
    function getStatusBadge(status) {
        const statusClasses = {
            pending: "bg-warning",
            approved: "bg-info",
            completed: "bg-success",
            cancelled: "bg-danger",
        };

        const statusText = {
            pending: "Pending",
            approved: "Approved",
            completed: "Completed",
            cancelled: "Cancelled",
        };

        return `<span class="badge ${statusClasses[status] || "bg-secondary"}">
                ${statusText[status] || status}
            </span>`;
    }

    // Utility functions
    function formatDate(value) {
        if (!value) return "";
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleDateString();
        } catch {
            return value;
        }
    }

    function safe(v) {
        if (v === null || v === undefined) return "";
        return String(v)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    }

    // Show request details modal
    function showRequestDetails(requestId) {
        // For now, just show an alert with the request ID
        // You can implement a proper modal later
        alert(`Request Details for ID: ${requestId}`);
    }

    // Event delegation for request actions
    tbody.addEventListener("click", (e) => {
        const btn = e.target.closest(".view-request-btn");
        if (btn) {
            const requestId = btn.dataset.requestId;
            showRequestDetails(requestId);
        }
    });

    await loadRequests();
});
document.addEventListener("DOMContentLoaded", () => {
    const apiUrl = `${window.location.origin}/hospital_billing/api/requests-php/medicine-management.php`;

    const tableBody = document.getElementById("medicinesTableBody");
    const confirmBtn = document.getElementById("confirmPickupBtn");
    const administerBtn = document.getElementById("administerBtn");
    const returnBtn = document.getElementById("returnBtn");

    // ===== Utility =====
    function getSelectedItemIds() {
        return Array.from(document.querySelectorAll(".item-checkbox:checked"))
            .map(cb => cb.dataset.itemId);
    }

    function renderMedicines(medicines) {
        tableBody.innerHTML = "";
        medicines.forEach(med => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <input type="checkbox" class="item-checkbox" data-item-id="${med.item_id}">
                </td>
                <td>${med.batch_id}</td>
                <td>${med.patient_name}</td>
                <td>${med.med_name}</td>
                <td>${med.quantity}</td>
                <td><span class="badge bg-secondary">${med.item_status}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-info view-batch-btn" 
                        data-batch-id="${med.batch_id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Re-bind view buttons
        document.querySelectorAll(".view-batch-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const batchId = btn.dataset.batchId;
                loadBatchDetails(batchId);
            });
        });
    }

    // ===== API Calls =====
    async function loadDispensedMedicines() {
        try {
            const res = await axios.get(apiUrl, {
                params: { operation: "getDispensedMedicines" },
                withCredentials: true
            });
            if (res.data.success) {
                renderMedicines(res.data.medicines);
            } else {
                Swal.fire("Error", res.data.message || "Failed to load medicines", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while loading medicines", "error");
        }
    }

    async function performAction(operation, successMsg) {
        const itemIds = getSelectedItemIds();
        if (itemIds.length === 0) {
            Swal.fire("Warning", "Please select at least one medicine", "warning");
            return;
        }

        try {
            const res = await axios.post(apiUrl, {
                operation,
                json: JSON.stringify({ item_ids: itemIds })
            }, { withCredentials: true });

            if (res.data.success) {
                Swal.fire("Success", successMsg, "success");
                await loadDispensedMedicines();
            } else {
                Swal.fire("Error", res.data.message || "Operation failed", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while performing action", "error");
        }
    }

    async function loadBatchDetails(batchId) {
        try {
            const res = await axios.get(apiUrl, {
                params: { operation: "getBatchDetails", batch_id: batchId },
                withCredentials: true
            });

            if (res.data.success) {
                const batch = res.data.batch;
                const items = res.data.items;

                let itemsHtml = items.map(i => `
                    <li>
                        ${i.med_name} - Qty: ${i.quantity} 
                        <span class="badge bg-secondary">${i.status}</span>
                    </li>
                `).join("");

                Swal.fire({
                    title: `Batch #${batch.batch_id}`,
                    html: `
                        <p><strong>Patient:</strong> ${batch.patient_name}</p>
                        <p><strong>Status:</strong> ${batch.status}</p>
                        <p><strong>Notes:</strong> ${batch.notes || "-"}</p>
                        <ul>${itemsHtml}</ul>
                    `,
                    width: 600
                });
            } else {
                Swal.fire("Error", res.data.message || "Failed to load batch details", "error");
            }
        } catch (err) {
            console.error("Error:", err);
            Swal.fire("Error", "Network error while loading batch details", "error");
        }
    }

    // ===== Button Events =====
    confirmBtn.addEventListener("click", () => performAction("confirmPickup", "Medicines confirmed as picked up"));
    administerBtn.addEventListener("click", () => performAction("administerMedicines", "Medicines marked as administered"));
    returnBtn.addEventListener("click", () => performAction("returnMedicines", "Medicines returned successfully"));

    // ===== Init =====
    loadDispensedMedicines();
});

console.log('my-patients.js loaded');

document.addEventListener('DOMContentLoaded', async () => {

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../../index.html';
        return;
    }

    const getPatientsApiUrl = `${window.location.origin}/hospital_billing/api/doctor-php/get-doctor-patients.php`;
    const medicinesApiUrl = `${window.location.origin}/hospital_billing/api/masterfiles-php/get-medicines.php`;
    const requestApiUrl = `${window.location.origin}/hospital_billing/api/doctor-php/doctor-requests.php`;

    const tbody = document.getElementById('mp_list');
    const requestMedicineModal = new bootstrap.Modal(document.getElementById('requestMedicineModal'));
    const patientNameSpan = document.getElementById('patientNameSpan');
    const medicineSearchInput = document.getElementById('medicineSearchInput');
    const medicineSearchResults = document.getElementById('medicineSearchResults');
    const currentRequestItems = document.getElementById('currentRequestItems');
    const submitRequestBtn = document.getElementById('submitRequestBtn');

    let currentPatientId = null;
    let requestItems = []; // Array to hold medicines for the current request

    // Load data
    async function loadPatients() {
        try {
            const response = await axios.get(getPatientsApiUrl, {
                params: { operation: "getDoctorAdmissions" },
                withCredentials: true
            });

            const data = response.data;
            if (!data.success) {
                console.error("Error fetching doctor patients:", data.message);
                renderRows([]);
                return;
            }

            renderRows(data.data);
        } catch (err) {
            console.error("API error:", err);
            renderRows([]);
        }
    }

    function renderRows(rows) {
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!rows || rows.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No data</td></tr>';
            return;
        }

        rows.forEach((r) => {
            const admissionDate = formatDate(r.admission_date);
            const statusClass = statusColor(r.status);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${admissionDate}</td>
                <td>${safe(r.patient_name)}</td>
                <td>${safe(r.room_number)}</td>
                <td>${truncate(r.admission_reason || '', 60)}</td>
                <td class="${statusClass}">${safe(r.status || '')}</td>
                <td>
                    <button class="btn btn-sm btn-primary request-med-btn" data-patient-id="${r.patient_id}" data-patient-name="${safe(r.patient_name)}">
                        <i class="fas fa-pills me-1"></i> Request Medicine
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Event Delegation for Modal Buttons
    tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.request-med-btn');
        if (btn) {
            currentPatientId = btn.dataset.patientId;
            patientNameSpan.textContent = btn.dataset.patientName;
            resetRequestModal();
            requestMedicineModal.show();
        }
    });

    // Medicine Search
    medicineSearchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.trim();
        if (searchTerm.length < 2) {
            medicineSearchResults.innerHTML = '';
            return;
        }

        try {
            const response = await axios.get(medicinesApiUrl, { params: { search: searchTerm } });
            if (response.data.success) {
                renderMedicineSearchResults(response.data.data);
            } else {
                medicineSearchResults.innerHTML = '<div class="list-group-item">No medicines found.</div>';
            }
        } catch (error) {
            console.error('Error searching for medicines:', error);
            medicineSearchResults.innerHTML = '<div class="list-group-item text-danger">Error fetching data.</div>';
        }
    });

    function renderMedicineSearchResults(medicines) {
        medicineSearchResults.innerHTML = '';
        if (!medicines || medicines.length === 0) {
            medicineSearchResults.innerHTML = '<div class="list-group-item">No medicines found.</div>';
            return;
        }

        medicines.forEach(med => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.textContent = `${med.med_name} (${med.med_dosage})`;
            item.addEventListener('click', (e) => {
                e.preventDefault();
                addMedicineToRequest(med);
                medicineSearchInput.value = '';
                medicineSearchResults.innerHTML = '';
            });
            medicineSearchResults.appendChild(item);
        });
    }

    function addMedicineToRequest(medicine) {
        if (requestItems.find(item => item.item_id === medicine.med_id)) {
            alert('This medicine is already in the request.');
            return;
        }

        requestItems.push({
            item_id: medicine.med_id,
            med_name: medicine.med_name,
            quantity: 1,
            notes: '',
            svc_type_id: 4 // 4 = Medication
        });

        renderCurrentRequest();
    }

    function renderCurrentRequest() {
        currentRequestItems.innerHTML = '';
        if (requestItems.length === 0) {
            currentRequestItems.innerHTML = '<div class="list-group-item text-muted">No items in request.</div>';
            return;
        }

        requestItems.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'list-group-item';
            div.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span>${safe(item.med_name)}</span>
                    <button class="btn btn-sm btn-outline-danger remove-item-btn" data-index="${index}"><i class="fas fa-times"></i></button>
                </div>
                <div class="mt-2">
                    <label class="form-label form-label-sm">Quantity:</label>
                    <input type="number" class="form-control form-control-sm quantity-input" value="${item.quantity}" min="1" data-index="${index}">
                </div>
            `;
            currentRequestItems.appendChild(div);
        });
    }
    
    currentRequestItems.addEventListener('input', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const index = e.target.dataset.index;
            const newQuantity = parseInt(e.target.value, 10);
            if (index !== undefined && newQuantity > 0) {
                requestItems[index].quantity = newQuantity;
            }
        }
    });

    currentRequestItems.addEventListener('click', (e) => {
        const btn = e.target.closest('.remove-item-btn');
        if (btn) {
            const index = btn.dataset.index;
            if (index !== undefined) {
                requestItems.splice(index, 1);
                renderCurrentRequest();
            }
        }
    });

    submitRequestBtn.addEventListener('click', async () => {
        if (requestItems.length === 0) {
            alert('Please add at least one medicine to the request.');
            return;
        }

        const payload = {
            operation: 'createBatchRequests',
            json: JSON.stringify({
                doctor_id: user.user_id,
                patient_id: currentPatientId,
                requests: requestItems
            })
        };

        try {
            submitRequestBtn.disabled = true;
            submitRequestBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';
            
            const response = await axios.post(requestApiUrl, payload, { withCredentials: true });
            
            if (response.data.success) {
                alert('Medicine request submitted successfully!');
                requestMedicineModal.hide();
            } else {
                alert(`Error: ${response.data.message}`);
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('An error occurred while submitting the request.');
        } finally {
            submitRequestBtn.disabled = false;
            submitRequestBtn.textContent = 'Submit Request';
        }
    });

    function resetRequestModal() {
        requestItems = [];
        currentPatientId = null;
        medicineSearchInput.value = '';
        medicineSearchResults.innerHTML = '';
        renderCurrentRequest();
    }

    function formatDate(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleDateString();
        } catch { return value; }
    }

    function safe(v) {
        if (v === null || v === undefined) return '';
        return String(v).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    }

    function truncate(t, n) {
        if (!t) return '';
        return t.length <= n ? t : t.substring(0, n) + '...';
    }

    function statusColor(status) {
        const s = (status || '').toLowerCase();
        if (s === 'discharged') return 'text-success';
        if (s === 'pending') return 'text-warning';
        if (s === 'critical') return 'text-danger';
        if (s === 'stable') return 'text-info';
        return 'text-primary';
    }

    await loadPatients();
});
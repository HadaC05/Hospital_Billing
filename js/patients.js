console.log('patients.js is working');

// Use relative path for API URL to avoid cross-origin issues
const baseApiUrl = 'http://localhost/hospital_billing/api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    async function loadLabTestsForModal() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-labtests.php`, {
                params: {
                    operation: 'getLabtests',
                    json: JSON.stringify({}),
                    page: 1,
                    itemsPerPage: 500
                }
            });
            const data = response.data;
            if (data.success) {
                labTestsCache = (data.labtests || []).filter(t => Number(t.is_active) === 1);
                if (labTestSelect) {
                    labTestSelect.innerHTML = '<option value="">Select lab test</option>';
                    labTestsCache.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.labtest_id;
                        opt.textContent = `${t.test_name}`;
                        opt.dataset.price = t.unit_price;
                        labTestSelect.appendChild(opt);
                    });
                }
            } else {
                Swal.fire({ title: 'Error', text: data.message || 'Failed to load lab tests', icon: 'error' });
            }
        } catch (err) {
            console.error('Failed to load lab tests:', err);
            Swal.fire({ title: 'Error', text: 'Failed to load lab tests', icon: 'error' });
        }
    }

    function updateLabTestPriceInfo() {
        if (!labTestSelect || !labTestPriceInfo) return;
        const id = labTestSelect.value;
        const t = labTestsCache.find(x => String(x.labtest_id) === String(id));
        if (t) {
            labTestPriceInfo.textContent = `Unit price: ${t.unit_price}`;
        } else {
            labTestPriceInfo.textContent = 'Unit price: -';
        }
    }

    async function loadSurgeriesForModal() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-surgeries.php`, {
                params: {
                    operation: 'getSurgeries',
                    json: JSON.stringify({}),
                    page: 1,
                    itemsPerPage: 500
                }
            });
            const data = response.data;
            if (data.success) {
                surgeriesCache = (data.surgeries || []).filter(s => Number(s.is_available) === 1);
                if (surgerySelect) {
                    surgerySelect.innerHTML = '<option value="">Select surgery</option>';
                    surgeriesCache.forEach(s => {
                        const opt = document.createElement('option');
                        opt.value = s.surgery_id;
                        opt.textContent = `${s.surgery_name}`;
                        opt.dataset.price = s.surgery_price;
                        surgerySelect.appendChild(opt);
                    });
                }
            } else {
                Swal.fire({ title: 'Error', text: data.message || 'Failed to load surgeries', icon: 'error' });
            }
        } catch (err) {
            console.error('Failed to load surgeries:', err);
            Swal.fire({ title: 'Error', text: 'Failed to load surgeries', icon: 'error' });
        }
    }

    function updateSurgeryPriceInfo() {
        if (!surgerySelect || !surgeryPriceInfo) return;
        const id = surgerySelect.value;
        const s = surgeriesCache.find(x => String(x.surgery_id) === String(id));
        if (s) {
            surgeryPriceInfo.textContent = `Unit price: ${s.surgery_price}`;
        } else {
            surgeryPriceInfo.textContent = 'Unit price: -';
        }
    }

    function renderSurgeriesCart() {
        if (!surgeriesCartTbody) return;
        if (surgeriesCart.length === 0) {
            surgeriesCartTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items yet.</td></tr>';
            if (surgeriesTotalEl) surgeriesTotalEl.textContent = '0.00';
            return;
        }
        surgeriesCartTbody.innerHTML = '';
        let total = 0;
        surgeriesCart.forEach((item, idx) => {
            const s = surgeriesCache.find(x => Number(x.surgery_id) === Number(item.surgery_id));
            const name = s ? s.surgery_name : `#${item.surgery_id}`;
            const price = s ? Number(s.surgery_price) : 0;
            const subtotal = price * item.quantity;
            total += subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${price.toFixed(2)}</td>
                <td class="text-end">${subtotal.toFixed(2)}</td>
                <td><button type="button" class="btn btn-sm btn-danger btn-surg-cart-remove" data-index="${idx}"><i class="fas fa-trash"></i></button></td>
            `;
            surgeriesCartTbody.appendChild(tr);
        });
        if (surgeriesTotalEl) surgeriesTotalEl.textContent = total.toFixed(2);
    }

    async function loadTreatmentsForModal() {
        try {
            const response = await axios.get(`${baseApiUrl}/get-treatments.php`, {
                params: {
                    operation: 'getTreatments',
                    json: JSON.stringify({}),
                    page: 1,
                    itemsPerPage: 500
                }
            });
            const data = response.data;
            if (data.success) {
                treatmentsCache = (data.treatments || []).filter(t => Number(t.is_active) === 1);
                if (treatmentSelect) {
                    treatmentSelect.innerHTML = '<option value="">Select treatment</option>';
                    treatmentsCache.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t.treatment_id;
                        opt.textContent = `${t.treatment_name}`;
                        opt.dataset.price = t.unit_price;
                        treatmentSelect.appendChild(opt);
                    });
                }
            } else {
                Swal.fire({ title: 'Error', text: data.message || 'Failed to load treatments', icon: 'error' });
            }
        } catch (err) {
            console.error('Failed to load treatments:', err);
            Swal.fire({ title: 'Error', text: 'Failed to load treatments', icon: 'error' });
        }
    }

    function updateTreatmentPriceInfo() {
        if (!treatmentSelect || !treatmentPriceInfo) return;
        const id = treatmentSelect.value;
        const t = treatmentsCache.find(x => String(x.treatment_id) === String(id));
        if (t) {
            treatmentPriceInfo.textContent = `Unit price: ${t.unit_price}`;
        } else {
            treatmentPriceInfo.textContent = 'Unit price: -';
        }
    }

    function renderTreatmentsCart() {
        if (!treatmentsCartTbody) return;
        if (treatmentsCart.length === 0) {
            treatmentsCartTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items yet.</td></tr>';
            if (treatmentsTotalEl) treatmentsTotalEl.textContent = '0.00';
            return;
        }
        treatmentsCartTbody.innerHTML = '';
        let total = 0;
        treatmentsCart.forEach((item, idx) => {
            const t = treatmentsCache.find(x => Number(x.treatment_id) === Number(item.treatment_id));
            const name = t ? t.treatment_name : `#${item.treatment_id}`;
            const price = t ? Number(t.unit_price) : 0;
            const subtotal = price * item.quantity;
            total += subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${price.toFixed(2)}</td>
                <td class="text-end">${subtotal.toFixed(2)}</td>
                <td><button type="button" class="btn btn-sm btn-danger btn-treat-cart-remove" data-index="${idx}"><i class="fas fa-trash"></i></button></td>
            `;
            treatmentsCartTbody.appendChild(tr);
        });
        if (treatmentsTotalEl) treatmentsTotalEl.textContent = total.toFixed(2);
    }

    function renderLabTestsCart() {
        if (!labTestsCartTbody) return;
        if (labTestsCart.length === 0) {
            labTestsCartTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items yet.</td></tr>';
            if (labTestsTotalEl) labTestsTotalEl.textContent = '0.00';
            return;
        }
        labTestsCartTbody.innerHTML = '';
        let total = 0;
        labTestsCart.forEach((item, idx) => {
            const t = labTestsCache.find(x => Number(x.labtest_id) === Number(item.labtest_id));
            const name = t ? t.test_name : `#${item.labtest_id}`;
            const price = t ? Number(t.unit_price) : 0;
            const subtotal = price * item.quantity;
            total += subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${price.toFixed(2)}</td>
                <td class="text-end">${subtotal.toFixed(2)}</td>
                <td><button type="button" class="btn btn-sm btn-danger btn-lab-cart-remove" data-index="${idx}"><i class="fas fa-trash"></i></button></td>
            `;
            labTestsCartTbody.appendChild(tr);
        });
        if (labTestsTotalEl) labTestsTotalEl.textContent = total.toFixed(2);
    }

    // Patient Records functionality
    const patientListElement = document.getElementById('patient-list');
    const patientDetailsSection = document.getElementById('patient-details-section');
    const admissionDetailsSection = document.getElementById('admission-details-section');
    const backToListBtn = document.getElementById('back-to-list');
    const backToPatientBtn = document.getElementById('back-to-patient');

    let currentPatientId = null;
    let currentAdmissionId = null;

    // Initialize pagination utility
    const pagination = new PaginationUtility({
        itemsPerPage: 10,
        onPageChange: (page) => {
            loadPatients(page);
        },
        onItemsPerPageChange: (itemsPerPage) => {
            loadPatients(1, itemsPerPage);
        }
    });

    // ========= Dispense Medicine Modal Logic =========
    const dispenseModalEl = document.getElementById('dispenseMedicineModal');
    const dispenseMedSelect = document.getElementById('dispense-med-id');
    const dispenseQtyInput = document.getElementById('dispense-qty');
    const dispenseDateInput = document.getElementById('dispense-date');
    const dispenseStockInfo = document.getElementById('dispense-stock');
    const dispenseSubmitBtn = document.getElementById('btn-dispense-submit');
    const dispenseAddBtn = document.getElementById('btn-dispense-add');
    const dispenseClearBtn = document.getElementById('btn-dispense-clear');
    const dispenseCartTbody = document.getElementById('dispense-cart');
    const dispenseTotalEl = document.getElementById('dispense-total');

    // ========= Add Lab Tests Modal Logic =========
    const labTestsModalEl = document.getElementById('addLabTestsModal');
    const labTestSelect = document.getElementById('labtest-id');
    const labTestQtyInput = document.getElementById('labtest-qty');
    const labTestDateInput = document.getElementById('labtest-date');
    const labTestPriceInfo = document.getElementById('labtest-price');
    const labTestsAddBtn = document.getElementById('btn-labtest-add');
    const labTestsClearBtn = document.getElementById('btn-labtests-clear');
    const labTestsSubmitBtn = document.getElementById('btn-labtests-submit');
    const labTestsCartTbody = document.getElementById('labtests-cart');
    const labTestsTotalEl = document.getElementById('labtests-total');

    // ========= Add Surgeries Modal Logic =========
    const surgeriesModalEl = document.getElementById('addSurgeriesModal');
    const surgerySelect = document.getElementById('surgery-id');
    const surgeryQtyInput = document.getElementById('surgery-qty');
    const surgeryDateInput = document.getElementById('surgery-date');
    const surgeryPriceInfo = document.getElementById('surgery-price');
    const surgeriesAddBtn = document.getElementById('btn-surgery-add');
    const surgeriesClearBtn = document.getElementById('btn-surgeries-clear');
    const surgeriesSubmitBtn = document.getElementById('btn-surgeries-submit');
    const surgeriesCartTbody = document.getElementById('surgeries-cart');
    const surgeriesTotalEl = document.getElementById('surgeries-total');

    // ========= Add Treatments Modal Logic =========
    const treatmentsModalEl = document.getElementById('addTreatmentsModal');
    const treatmentSelect = document.getElementById('treatment-id');
    const treatmentQtyInput = document.getElementById('treatment-qty');
    const treatmentDateInput = document.getElementById('treatment-date');
    const treatmentPriceInfo = document.getElementById('treatment-price');
    const treatmentsAddBtn = document.getElementById('btn-treatment-add');
    const treatmentsClearBtn = document.getElementById('btn-treatments-clear');
    const treatmentsSubmitBtn = document.getElementById('btn-treatments-submit');
    const treatmentsCartTbody = document.getElementById('treatments-cart');
    const treatmentsTotalEl = document.getElementById('treatments-total');

    let medicinesCache = [];
    let dispenseCart = [];
    let labTestsCache = [];
    let labTestsCart = [];
    let surgeriesCache = [];
    let surgeriesCart = [];
    let treatmentsCache = [];
    let treatmentsCart = [];

    async function loadMedicinesForDispense() {
        try {
            // Fetch a generous page to cover most lists; adjust if needed
            const response = await axios.get(`${baseApiUrl}/get-medicines.php`, {
                params: {
                    operation: 'getMedicines',
                    json: JSON.stringify({}),
                    page: 1,
                    itemsPerPage: 500
                }
            });
            const data = response.data;
            if (data.success) {
                medicinesCache = (data.medicines || []).filter(m => Number(m.is_active) === 1);
                // Populate select
                if (dispenseMedSelect) {
                    dispenseMedSelect.innerHTML = '<option value="">Select medicine</option>';
                    medicinesCache.forEach(m => {
                        const opt = document.createElement('option');
                        opt.value = m.med_id;
                        opt.textContent = `${m.med_name} (${m.unit_name})`;
                        opt.dataset.stock = m.stock_quantity;
                        opt.dataset.price = m.unit_price;
                        dispenseMedSelect.appendChild(opt);
                    });
                }
            } else {
                Swal.fire({ title: 'Error', text: data.message || 'Failed to load medicines', icon: 'error' });
            }
        } catch (err) {
            console.error('Failed to load medicines:', err);
            Swal.fire({ title: 'Error', text: 'Failed to load medicines', icon: 'error' });
        }
    }

    function updateStockInfo() {
        if (!dispenseMedSelect || !dispenseStockInfo) return;
        const medId = dispenseMedSelect.value;
        const med = medicinesCache.find(m => String(m.med_id) === String(medId));
        if (med) {
            dispenseStockInfo.textContent = `Stock: ${med.stock_quantity} | Unit price: ${med.unit_price}`;
            if (dispenseQtyInput) {
                dispenseQtyInput.max = med.stock_quantity;
            }
        } else {
            dispenseStockInfo.textContent = 'Stock: - | Unit price: -';
            if (dispenseQtyInput) {
                dispenseQtyInput.removeAttribute('max');
            }
        }
    }

    function renderDispenseCart() {
        if (!dispenseCartTbody) return;
        if (dispenseCart.length === 0) {
            dispenseCartTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No items yet.</td></tr>';
            if (dispenseTotalEl) dispenseTotalEl.textContent = '0.00';
            return;
        }
        dispenseCartTbody.innerHTML = '';
        let total = 0;
        dispenseCart.forEach((item, idx) => {
            const med = medicinesCache.find(m => Number(m.med_id) === Number(item.med_id));
            const name = med ? `${med.med_name} (${med.unit_name})` : `#${item.med_id}`;
            const price = med ? Number(med.unit_price) : 0;
            const subtotal = price * item.quantity;
            total += subtotal;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${name}</td>
                <td class="text-end">${item.quantity}</td>
                <td class="text-end">${price.toFixed(2)}</td>
                <td class="text-end">${subtotal.toFixed(2)}</td>
                <td><button type="button" class="btn btn-sm btn-danger btn-cart-remove" data-index="${idx}"><i class="fas fa-trash"></i></button></td>
            `;
            dispenseCartTbody.appendChild(tr);
        });
        if (dispenseTotalEl) dispenseTotalEl.textContent = total.toFixed(2);
    }

    if (dispenseMedSelect) {
        dispenseMedSelect.addEventListener('change', updateStockInfo);
    }

    if (dispenseModalEl) {
        dispenseModalEl.addEventListener('show.bs.modal', async () => {
            // Default date to today
            if (dispenseDateInput) {
                dispenseDateInput.valueAsDate = new Date();
            }
            // reset cart
            dispenseCart = [];
            renderDispenseCart();
            await loadMedicinesForDispense();
            updateStockInfo();
        });
    }

    // Submit Surgeries batch
    if (surgeriesSubmitBtn) {
        surgeriesSubmitBtn.addEventListener('click', async () => {
            try {
                if (!currentAdmissionId) {
                    Swal.fire({ title: 'Error', text: 'No admission selected.', icon: 'error' });
                    return;
                }
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    Swal.fire({ title: 'Error', text: 'Not authenticated.', icon: 'error' });
                    return;
                }
                if (!surgeriesCart || surgeriesCart.length === 0) {
                    Swal.fire({ title: 'Validation', text: 'Add at least one surgery.', icon: 'warning' });
                    return;
                }
                const datePerformed = surgeryDateInput ? surgeryDateInput.value : '';
                const items = surgeriesCart.map(i => ({ surgery_id: Number(i.surgery_id), quantity: Number(i.quantity) }));
                const payload = {
                    operation: 'addSurgeriesBatch',
                    json: JSON.stringify({
                        admission_id: Number(currentAdmissionId),
                        items,
                        date_performed: datePerformed || new Date().toISOString().slice(0, 10),
                        performed_by: Number(user.user_id)
                    })
                };
                const { data } = await axios.post(`${baseApiUrl}/AdmissionAPI.php`, payload);
                if (data && data.status === 'success') {
                    Swal.fire({ title: 'Success', text: 'Surgeries added successfully.', icon: 'success' });
                    const modal = bootstrap.Modal.getInstance(surgeriesModalEl);
                    if (modal) modal.hide();
                    surgeriesCart = [];
                    await loadAdmissionDetails(currentAdmissionId);
                } else {
                    Swal.fire({ title: 'Error', text: (data && data.message) || 'Failed to add surgeries', icon: 'error' });
                }
            } catch (err) {
                console.error('Add surgeries error:', err);
                Swal.fire({ title: 'Error', text: 'Failed to add surgeries', icon: 'error' });
            }
        });
    }

    // Submit Treatments batch
    if (treatmentsSubmitBtn) {
        treatmentsSubmitBtn.addEventListener('click', async () => {
            try {
                if (!currentAdmissionId) {
                    Swal.fire({ title: 'Error', text: 'No admission selected.', icon: 'error' });
                    return;
                }
                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    Swal.fire({ title: 'Error', text: 'Not authenticated.', icon: 'error' });
                    return;
                }
                if (!treatmentsCart || treatmentsCart.length === 0) {
                    Swal.fire({ title: 'Validation', text: 'Add at least one treatment.', icon: 'warning' });
                    return;
                }
                const datePerformed = treatmentDateInput ? treatmentDateInput.value : '';
                const items = treatmentsCart.map(i => ({ treatment_id: Number(i.treatment_id), quantity: Number(i.quantity) }));
                const payload = {
                    operation: 'addTreatmentsBatch',
                    json: JSON.stringify({
                        admission_id: Number(currentAdmissionId),
                        items,
                        date_performed: datePerformed || new Date().toISOString().slice(0, 10),
                        performed_by: Number(user.user_id)
                    })
                };
                const { data } = await axios.post(`${baseApiUrl}/AdmissionAPI.php`, payload);
                if (data && data.status === 'success') {
                    Swal.fire({ title: 'Success', text: 'Treatments added successfully.', icon: 'success' });
                    const modal = bootstrap.Modal.getInstance(treatmentsModalEl);
                    if (modal) modal.hide();
                    treatmentsCart = [];
                    await loadAdmissionDetails(currentAdmissionId);
                } else {
                    Swal.fire({ title: 'Error', text: (data && data.message) || 'Failed to add treatments', icon: 'error' });
                }
            } catch (err) {
                console.error('Add treatments error:', err);
                Swal.fire({ title: 'Error', text: 'Failed to add treatments', icon: 'error' });
            }
        });
    }

    // Remove items from carts via delegation
    if (surgeriesCartTbody) {
        surgeriesCartTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-surg-cart-remove');
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            if (!Number.isNaN(idx)) {
                surgeriesCart.splice(idx, 1);
                renderSurgeriesCart();
            }
        });
    }
    if (treatmentsCartTbody) {
        treatmentsCartTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-treat-cart-remove');
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            if (!Number.isNaN(idx)) {
                treatmentsCart.splice(idx, 1);
                renderTreatmentsCart();
            }
        });
    }

    // Submit Lab Tests batch
    if (labTestsSubmitBtn) {
        labTestsSubmitBtn.addEventListener('click', async () => {
            try {
                if (!currentAdmissionId) {
                    Swal.fire({ title: 'Error', text: 'No admission selected.', icon: 'error' });
                    return;
                }

                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    Swal.fire({ title: 'Error', text: 'Not authenticated.', icon: 'error' });
                    return;
                }

                if (!labTestsCart || labTestsCart.length === 0) {
                    Swal.fire({ title: 'Validation', text: 'Add at least one lab test.', icon: 'warning' });
                    return;
                }

                const datePerformed = labTestDateInput ? labTestDateInput.value : '';
                const items = labTestsCart.map(i => ({ labtest_id: Number(i.labtest_id), quantity: Number(i.quantity) }));
                const payload = {
                    operation: 'addLabTestsBatch',
                    json: JSON.stringify({
                        admission_id: Number(currentAdmissionId),
                        items,
                        date_performed: datePerformed || new Date().toISOString().slice(0, 10),
                        performed_by: Number(user.user_id)
                    })
                };

                const { data } = await axios.post(`${baseApiUrl}/AdmissionAPI.php`, payload);
                if (data && data.status === 'success') {
                    Swal.fire({ title: 'Success', text: 'Lab tests added successfully.', icon: 'success' });
                    const modal = bootstrap.Modal.getInstance(labTestsModalEl);
                    if (modal) modal.hide();
                    labTestsCart = [];
                    await loadAdmissionDetails(currentAdmissionId);
                } else {
                    Swal.fire({ title: 'Error', text: (data && data.message) || 'Failed to add lab tests', icon: 'error' });
                }
            } catch (err) {
                console.error('Add lab tests error:', err);
                Swal.fire({ title: 'Error', text: 'Failed to add lab tests', icon: 'error' });
            }
        });
    }

    if (labTestsModalEl) {
        labTestsModalEl.addEventListener('show.bs.modal', async () => {
            if (labTestDateInput) labTestDateInput.valueAsDate = new Date();
            labTestsCart = [];
            renderLabTestsCart();
            await loadLabTestsForModal();
            updateLabTestPriceInfo();
        });
    }

    // Surgeries modal show
    if (surgeriesModalEl) {
        surgeriesModalEl.addEventListener('show.bs.modal', async () => {
            if (surgeryDateInput) surgeryDateInput.valueAsDate = new Date();
            surgeriesCart = [];
            renderSurgeriesCart();
            await loadSurgeriesForModal();
            updateSurgeryPriceInfo();
        });
    }

    // Treatments modal show
    if (treatmentsModalEl) {
        treatmentsModalEl.addEventListener('show.bs.modal', async () => {
            if (treatmentDateInput) treatmentDateInput.valueAsDate = new Date();
            treatmentsCart = [];
            renderTreatmentsCart();
            await loadTreatmentsForModal();
            updateTreatmentPriceInfo();
        });
    }

    // Add to cart
    if (dispenseAddBtn) {
        dispenseAddBtn.addEventListener('click', () => {
            const medId = dispenseMedSelect ? Number(dispenseMedSelect.value) : 0;
            const qty = dispenseQtyInput ? Number(dispenseQtyInput.value) : 0;
            if (!medId) {
                Swal.fire({ title: 'Validation', text: 'Please select a medicine.', icon: 'warning' });
                return;
            }
            if (!qty || qty < 1) {
                Swal.fire({ title: 'Validation', text: 'Quantity must be at least 1.', icon: 'warning' });
                return;
            }
            const med = medicinesCache.find(m => Number(m.med_id) === medId);
            const stock = med ? Number(med.stock_quantity) : 0;
            const alreadyQty = dispenseCart.filter(i => i.med_id === medId).reduce((s, i) => s + i.quantity, 0);
            if (qty + alreadyQty > stock) {
                Swal.fire({ title: 'Validation', text: `Total quantity exceeds stock (${stock}).`, icon: 'warning' });
                return;
            }
            // merge if exists
            const existing = dispenseCart.find(i => i.med_id === medId);
            if (existing) existing.quantity += qty; else dispenseCart.push({ med_id: medId, quantity: qty });
            renderDispenseCart();
        });
    }

    // Clear cart
    if (dispenseClearBtn) {
        dispenseClearBtn.addEventListener('click', () => {
            dispenseCart = [];
            renderDispenseCart();
        });
    }

    // Add Lab Test to cart
    if (labTestsAddBtn) {
        labTestsAddBtn.addEventListener('click', () => {
            const id = labTestSelect ? Number(labTestSelect.value) : 0;
            const qty = labTestQtyInput ? Number(labTestQtyInput.value) : 0;
            if (!id) {
                Swal.fire({ title: 'Validation', text: 'Please select a lab test.', icon: 'warning' });
                return;
            }
            if (!qty || qty < 1) {
                Swal.fire({ title: 'Validation', text: 'Quantity must be at least 1.', icon: 'warning' });
                return;
            }
            const existing = labTestsCart.find(i => i.labtest_id === id);
            if (existing) existing.quantity += qty; else labTestsCart.push({ labtest_id: id, quantity: qty });
            renderLabTestsCart();
        });
    }

    // Clear lab tests cart
    if (labTestsClearBtn) {
        labTestsClearBtn.addEventListener('click', () => {
            labTestsCart = [];
            renderLabTestsCart();
        });
    }

    // Add Surgery to cart
    if (surgeriesAddBtn) {
        surgeriesAddBtn.addEventListener('click', () => {
            const id = surgerySelect ? Number(surgerySelect.value) : 0;
            const qty = surgeryQtyInput ? Number(surgeryQtyInput.value) : 0;
            if (!id) {
                Swal.fire({ title: 'Validation', text: 'Please select a surgery.', icon: 'warning' });
                return;
            }
            if (!qty || qty < 1) {
                Swal.fire({ title: 'Validation', text: 'Quantity must be at least 1.', icon: 'warning' });
                return;
            }
            const existing = surgeriesCart.find(i => i.surgery_id === id);
            if (existing) existing.quantity += qty; else surgeriesCart.push({ surgery_id: id, quantity: qty });
            renderSurgeriesCart();
        });
    }

    // Clear surgeries cart
    if (surgeriesClearBtn) {
        surgeriesClearBtn.addEventListener('click', () => {
            surgeriesCart = [];
            renderSurgeriesCart();
        });
    }

    // Add Treatment to cart
    if (treatmentsAddBtn) {
        treatmentsAddBtn.addEventListener('click', () => {
            const id = treatmentSelect ? Number(treatmentSelect.value) : 0;
            const qty = treatmentQtyInput ? Number(treatmentQtyInput.value) : 0;
            if (!id) {
                Swal.fire({ title: 'Validation', text: 'Please select a treatment.', icon: 'warning' });
                return;
            }
            if (!qty || qty < 1) {
                Swal.fire({ title: 'Validation', text: 'Quantity must be at least 1.', icon: 'warning' });
                return;
            }
            const existing = treatmentsCart.find(i => i.treatment_id === id);
            if (existing) existing.quantity += qty; else treatmentsCart.push({ treatment_id: id, quantity: qty });
            renderTreatmentsCart();
        });
    }

    // Clear treatments cart
    if (treatmentsClearBtn) {
        treatmentsClearBtn.addEventListener('click', () => {
            treatmentsCart = [];
            renderTreatmentsCart();
        });
    }

    // Remove from lab tests cart
    if (labTestsCartTbody) {
        labTestsCartTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-lab-cart-remove');
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            if (!Number.isNaN(idx)) {
                labTestsCart.splice(idx, 1);
                renderLabTestsCart();
            }
        });
    }

    if (labTestSelect) labTestSelect.addEventListener('change', updateLabTestPriceInfo);
    if (surgerySelect) surgerySelect.addEventListener('change', updateSurgeryPriceInfo);
    if (treatmentSelect) treatmentSelect.addEventListener('change', updateTreatmentPriceInfo);

    // Remove from cart via delegation
    if (dispenseCartTbody) {
        dispenseCartTbody.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-cart-remove');
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            if (!Number.isNaN(idx)) {
                dispenseCart.splice(idx, 1);
                renderDispenseCart();
            }
        });
    }

    if (dispenseSubmitBtn) {
        dispenseSubmitBtn.addEventListener('click', async () => {
            try {
                if (!currentAdmissionId) {
                    Swal.fire({ title: 'Error', text: 'No admission selected.', icon: 'error' });
                    return;
                }

                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    Swal.fire({ title: 'Error', text: 'Not authenticated.', icon: 'error' });
                    return;
                }

                const dateGiven = dispenseDateInput ? dispenseDateInput.value : '';
                let data;
                if (dispenseCart.length > 0) {
                    // Batch
                    const items = dispenseCart.map(i => ({ med_id: Number(i.med_id), quantity: Number(i.quantity) }));
                    const payload = {
                        operation: 'dispenseMedicinesBatch',
                        json: JSON.stringify({
                            admission_id: Number(currentAdmissionId),
                            items,
                            date_given: dateGiven || new Date().toISOString().slice(0, 10),
                            administered_by: Number(user.user_id)
                        })
                    };
                    ({ data } = await axios.post(`${baseApiUrl}/AdmissionAPI.php`, payload));
                } else {
                    // Single fallback using current selector
                    const medId = dispenseMedSelect ? Number(dispenseMedSelect.value) : 0;
                    const qty = dispenseQtyInput ? Number(dispenseQtyInput.value) : 0;
                    if (!medId || !qty) {
                        Swal.fire({ title: 'Validation', text: 'Add at least one medicine.', icon: 'warning' });
                        return;
                    }
                    const payload = {
                        operation: 'dispenseMedicine',
                        json: JSON.stringify({
                            admission_id: Number(currentAdmissionId),
                            med_id: medId,
                            quantity: qty,
                            date_given: dateGiven || new Date().toISOString().slice(0, 10),
                            administered_by: Number(user.user_id)
                        })
                    };
                    ({ data } = await axios.post(`${baseApiUrl}/AdmissionAPI.php`, payload));
                }

                if (data && data.status === 'success') {
                    Swal.fire({ title: 'Success', text: 'Medicine dispensed successfully.', icon: 'success' });
                    // Hide modal and reset cart
                    const modal = bootstrap.Modal.getInstance(dispenseModalEl);
                    if (modal) modal.hide();
                    dispenseCart = [];
                    // Refresh admission details
                    await loadAdmissionDetails(currentAdmissionId);
                } else {
                    Swal.fire({ title: 'Error', text: (data && data.message) || 'Failed to dispense medicine', icon: 'error' });
                }
            } catch (err) {
                console.error('Dispense error:', err);
                Swal.fire({ title: 'Error', text: 'Failed to dispense medicine', icon: 'error' });
            }
        });
    }

    // Load Patient List
    async function loadPatients(page = 1, itemsPerPage = 10, search = '') {
        if (!patientListElement) {
            console.error('Patient list element not found');
            return;
        }

        patientListElement.innerHTML = '<tr><td colspan="4" class="text-center">Loading patients...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-patients.php`, {
                params: {
                    operation: 'getPatients',
                    json: JSON.stringify({}),
                    page: page,
                    itemsPerPage: itemsPerPage,
                    search: search
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.patients)) {
                const patients = data.patients;
                const paginationData = data.pagination;

                if (patients.length === 0) {
                    patientListElement.innerHTML = '<tr><td colspan="4" class="text-center">No patients found.</td></tr>';
                    // Clear pagination controls
                    const paginationContainer = document.getElementById('pagination-container');
                    if (paginationContainer) {
                        paginationContainer.innerHTML = '';
                    }
                    return;
                }

                patientListElement.innerHTML = '';

                patients.forEach(patient => {
                    const fullName = `${patient.patient_lname}, ${patient.patient_fname} ${patient.patient_mname ? patient.patient_mname.charAt(0) + '.' : ''}`;

                    const row = `
                        <tr>
                            <td>${fullName}</td>
                            <td>${patient.mobile_number}</td>
                            <td>${patient.email}</td>
                            <td>
                                <button class="btn btn-sm btn-info view-patient-btn" data-id="${patient.patient_id}">View Details</button>
                            </td>
                        </tr>
                    `;
                    patientListElement.innerHTML += row;
                });

                // Update pagination controls
                pagination.calculatePagination(paginationData.totalItems, paginationData.currentPage, paginationData.itemsPerPage);
                pagination.generatePaginationControls('pagination-container');
            } else {
                patientListElement.innerHTML = `<tr><td colspan="4" class="text-center">Failed to load patients.</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading patients: ', error);
            patientListElement.innerHTML = '<tr><td colspan="4" class="text-center">Failed to load patients.</td></tr>';
        }
    }

    // Load Patient Details
    async function loadPatientDetails(patientId) {
        currentPatientId = patientId;

        try {
            const response = await axios.post(`${baseApiUrl}/get-patients.php`, {
                operation: 'getPatientDetails',
                json: JSON.stringify({ patient_id: patientId })
            });

            const data = response.data;

            if (data.success) {
                const patient = data.patient;
                const admissions = data.admissions;
                const insurance = data.insurance;

                // Display patient info
                const patientInfoElement = document.getElementById('patient-info');
                const birthDate = new Date(patient.birthdate).toLocaleDateString();

                patientInfoElement.innerHTML = `
                    <div class="col-md-6">
                        <h4>${patient.patient_lname}, ${patient.patient_fname} ${patient.patient_mname}</h4>
                        <p><strong>Birth Date:</strong> ${birthDate}</p>
                        <p><strong>Address:</strong> ${patient.address}</p>
                        <p><strong>Contact:</strong> ${patient.mobile_number}</p>
                        <p><strong>Email:</strong> ${patient.email}</p>
                    </div>
                    <div class="col-md-6">
                        <h5>Emergency Contact</h5>
                        <p><strong>Name:</strong> ${patient.em_contact_name}</p>
                        <p><strong>Contact:</strong> ${patient.em_contact_number}</p>
                        <p><strong>Address:</strong> ${patient.em_contact_address}</p>
                    </div>
                `;

                // Display admissions
                const admissionListElement = document.getElementById('admission-list');

                if (admissions.length === 0) {
                    admissionListElement.innerHTML = '<tr><td colspan="6" class="text-center">No admissions found.</td></tr>';
                } else {
                    admissionListElement.innerHTML = '';

                    admissions.forEach(admission => {
                        const admissionDate = new Date(admission.admission_date).toLocaleDateString();
                        const dischargeDate = admission.discharge_date ? new Date(admission.discharge_date).toLocaleDateString() : 'Not discharged';

                        const row = `
                            <tr>
                                <td>${admission.admission_id}</td>
                                <td>${admissionDate}</td>
                                <td>${dischargeDate}</td>
                                <td>${admission.admission_reason}</td>
                                <td>${admission.status}</td>
                                <td>
                                    <button class="btn btn-sm btn-success view-admission-btn" data-id="${admission.admission_id}">View Details</button>
                                </td>
                            </tr>
                        `;
                        admissionListElement.innerHTML += row;
                    });
                }

                // Display insurance policies
                const insuranceListElement = document.getElementById('insurance-list');

                if (insurance.length === 0) {
                    insuranceListElement.innerHTML = '<tr><td colspan="5" class="text-center">No insurance policies found.</td></tr>';
                } else {
                    insuranceListElement.innerHTML = '';

                    insurance.forEach(policy => {
                        const startDate = new Date(policy.start_date).toLocaleDateString();
                        const endDate = new Date(policy.end_date).toLocaleDateString();

                        const row = `
                            <tr>
                                <td>${policy.policy_number}</td>
                                <td>${policy.provider_name}</td>
                                <td>${startDate}</td>
                                <td>${endDate}</td>
                                <td>${policy.status}</td>
                            </tr>
                        `;
                        insuranceListElement.innerHTML += row;
                    });
                }

                // Show patient details section and hide other sections
                patientDetailsSection.style.display = 'block';
                admissionDetailsSection.style.display = 'none';
                document.querySelector('.row.mb-4').style.display = 'none'; // Hide patient list
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Failed to load patient details',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error loading patient details: ', error);
            Swal.fire({
                title: 'Error',
                text: 'Error loading patient details',
                icon: 'error'
            });
        }
    }

    // Load Admission Details
    async function loadAdmissionDetails(admissionId) {
        currentAdmissionId = admissionId;

        try {
            // Use AdmissionAPI for richer details (services include medications with names, quantities, nurse, dates)
            const response = await axios.post(`${baseApiUrl}/AdmissionAPI.php`, {
                operation: 'getAdmission',
                json: JSON.stringify({ admission_id: admissionId })
            });

            const data = response.data;

            if (data.status === 'success') {
                const admission = data.admission;
                const services = data.services || {};
                const medications = services.medications || [];
                const labtests = services.lab_tests || [];
                const surgeries = services.surgeries || [];
                const treatments = services.treatments || [];
                const invoices = data.invoices || [];

                // Display admission info
                const admissionInfoElement = document.getElementById('admission-info');
                const admissionDate = new Date(admission.admission_date).toLocaleDateString();
                const dischargeDate = (admission.discharge_date && admission.discharge_date !== '0000-00-00')
                    ? new Date(admission.discharge_date).toLocaleDateString()
                    : 'Not discharged';

                admissionInfoElement.innerHTML = `
                    <div class="col-md-6">
                        <h4>Admission #${admission.admission_id}</h4>
                        <p><strong>Patient:</strong> ${admission.patient_lname}, ${admission.patient_fname} ${admission.patient_mname}</p>
                        <p><strong>Admission Date:</strong> ${admissionDate}</p>
                        <p><strong>Discharge Date:</strong> ${dischargeDate}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Reason:</strong> ${admission.admission_reason}</p>
                        <p><strong>Status:</strong> ${admission.status}</p>
                    </div>
                `;

                // Display medications
                const medicationsListElement = document.getElementById('medications-list');

                if (medications.length === 0) {
                    medicationsListElement.innerHTML = '<tr><td colspan="4" class="text-center">No medications found.</td></tr>';
                } else {
                    medicationsListElement.innerHTML = '';
                    medications.forEach(item => {
                        const dateGiven = item.date_given ? new Date(item.date_given).toLocaleDateString() : '';
                        const row = `
                            <tr>
                                <td>${item.med_name || ''}</td>
                                <td>${item.quantity || 0}</td>
                                <td>${item.administered_by_name || ''}</td>
                                <td>${dateGiven}</td>
                            </tr>
                        `;
                        medicationsListElement.innerHTML += row;
                    });
                }

                // Display lab tests
                const labtestsListElement = document.getElementById('labtests-list');

                if (labtests.length === 0) {
                    labtestsListElement.innerHTML = '<tr><td colspan="4" class="text-center">No lab tests found.</td></tr>';
                } else {
                    labtestsListElement.innerHTML = '';

                    labtests.forEach(item => {
                        const datePerf = item.date_performed || item.record_date || item.date_given;
                        const prettyDate = datePerf ? new Date(datePerf).toLocaleDateString() : '';
                        const row = `
                            <tr>
                                <td>${item.test_name || ''}</td>
                                <td>${item.quantity || 0}</td>
                                <td>${item.performed_by_name || ''}</td>
                                <td>${prettyDate}</td>
                            </tr>
                        `;
                        labtestsListElement.innerHTML += row;
                    });
                }

                // Display surgeries
                const surgeriesListElement = document.getElementById('surgeries-list');

                if (surgeries.length === 0) {
                    surgeriesListElement.innerHTML = '<tr><td colspan="4" class="text-center">No surgeries found.</td></tr>';
                } else {
                    surgeriesListElement.innerHTML = '';

                    surgeries.forEach(surgery => {
                        const recordDate = surgery.date_given || surgery.record_date;
                        const prettyDate = recordDate ? new Date(recordDate).toLocaleDateString() : '';
                        const row = `
                            <tr>
                                <td>${surgery.surgery_name || ''}</td>
                                <td>${surgery.quantity || 0}</td>
                                <td>${surgery.performed_by_name || ''}</td>
                                <td>${prettyDate}</td>
                            </tr>
                        `;
                        surgeriesListElement.innerHTML += row;
                    });
                }

                // Display treatments
                const treatmentsListElement = document.getElementById('treatments-list');

                if (treatments.length === 0) {
                    treatmentsListElement.innerHTML = '<tr><td colspan="4" class="text-center">No treatments found.</td></tr>';
                } else {
                    treatmentsListElement.innerHTML = '';

                    treatments.forEach(treatment => {
                        const recordDate = treatment.date_given || treatment.record_date;
                        const prettyDate = recordDate ? new Date(recordDate).toLocaleDateString() : '';
                        const row = `
                            <tr>
                                <td>${treatment.treatment_name || ''}</td>
                                <td>${treatment.quantity || 0}</td>
                                <td>${treatment.performed_by_name || ''}</td>
                                <td>${prettyDate}</td>
                            </tr>
                        `;
                        treatmentsListElement.innerHTML += row;
                    });
                }

                // Display invoices
                const invoicesListElement = document.getElementById('invoices-list');

                if (invoices.length === 0) {
                    invoicesListElement.innerHTML = '<tr><td colspan="5" class="text-center">No invoices found.</td></tr>';
                } else {
                    invoicesListElement.innerHTML = '';

                    invoices.forEach(invoice => {
                        const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString();

                        const row = `
                            <tr>
                                <td>${invoice.invoice_id}</td>
                                <td>${invoiceDate}</td>
                                <td>${invoice.total_amount}</td>
                                <td>${invoice.amount_due}</td>
                                <td>${invoice.status}</td>
                            </tr>
                        `;
                        invoicesListElement.innerHTML += row;
                    });
                }

                // Show admission details section and hide other sections
                patientDetailsSection.style.display = 'none';
                admissionDetailsSection.style.display = 'block';
            } else {
                Swal.fire({
                    title: 'Error',
                    text: data.message || 'Failed to load admission details',
                    icon: 'error'
                });
            }
        } catch (error) {
            console.error('Error loading admission details: ', error);
            if (error && error.response) {
                console.error('Response data:', error.response.data);
            }
            Swal.fire({
                title: 'Error',
                text: 'Error loading admission details',
                icon: 'error'
            });
        }
    }

    // Event Listeners
    document.addEventListener('click', async (e) => {
        // View Patient Details
        if (e.target.classList.contains('view-patient-btn')) {
            const patientId = e.target.dataset.id;
            await loadPatientDetails(patientId);
        }

        // View Admission Details
        if (e.target.classList.contains('view-admission-btn')) {
            const admissionId = e.target.dataset.id;
            await loadAdmissionDetails(admissionId);
        }
    });

    // Back to List button
    if (backToListBtn) {
        backToListBtn.addEventListener('click', () => {
            patientDetailsSection.style.display = 'none';
            admissionDetailsSection.style.display = 'none';
            document.querySelector('.row.mb-4').style.display = 'block'; // Show patient list
            currentPatientId = null;
        });
    }

    // Back to Patient button
    if (backToPatientBtn) {
        backToPatientBtn.addEventListener('click', () => {
            if (currentPatientId) {
                loadPatientDetails(currentPatientId);
            } else {
                patientDetailsSection.style.display = 'none';
                admissionDetailsSection.style.display = 'none';
                document.querySelector('.row.mb-4').style.display = 'block'; // Show patient list
            }
            currentAdmissionId = null;
        });
    }

    // Load initial data
    await loadPatients();
});
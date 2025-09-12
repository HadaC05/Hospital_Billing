'use strict';

console.log('pharmacist-medicine-dispensing.js loaded');

// Global variables
let currentPatient = null;
let medicines = [];
let medicineCart = [];
let currentPage = 1;
let medicinesPage = 1;
let patientsPage = 1;
const itemsPerPage = 10;
const medicinesPerPage = 20;

// API base URL
const baseApiUrl = '../../api';

document.addEventListener('DOMContentLoaded', () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    // Set current date
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        currentDateEl.textContent = new Date().toLocaleString();
    }

    // Set default dispense date to today
    const dispenseDateEl = document.getElementById('dispense-date');
    if (dispenseDateEl) {
        dispenseDateEl.value = new Date().toISOString().slice(0, 10);
    }

    // Initialize event listeners
    initializeEventListeners();
    
    // Load initial data
    loadPatients();
});

function initializeEventListeners() {
    // Patient search
    const patientSearchBtn = document.getElementById('search-patients-btn');
    const patientSearchInput = document.getElementById('patient-search');
    
    if (patientSearchBtn) {
        patientSearchBtn.addEventListener('click', () => {
            patientsPage = 1;
            loadPatients();
        });
    }
    
    if (patientSearchInput) {
        patientSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                patientsPage = 1;
                loadPatients();
            }
        });
    }

    // Medicine search
    const medicineSearchBtn = document.getElementById('search-medicines-btn');
    const medicineSearchInput = document.getElementById('medicine-search');
    
    if (medicineSearchBtn) {
        medicineSearchBtn.addEventListener('click', () => {
            medicinesPage = 1;
            loadMedicines();
        });
    }
    
    if (medicineSearchInput) {
        medicineSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                medicinesPage = 1;
                loadMedicines();
            }
        });
    }

    // Add to cart button
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {

        addToCartBtn.addEventListener('click', () => {
            // This button will be enabled when a medicine is selected
            // The actual adding is handled by individual medicine rows
        });
    }

    // Clear cart button
    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }

    // Dispense batch button
    const dispenseBatchBtn = document.getElementById('dispense-batch-btn');
    if (dispenseBatchBtn) {
        dispenseBatchBtn.addEventListener('click', showDispenseModal);
    }

    // Confirm dispense button
    const confirmDispenseBtn = document.getElementById('confirm-dispense-btn');
    if (confirmDispenseBtn) {
        confirmDispenseBtn.addEventListener('click', confirmDispensing);
    }

    // Confirm dispensing checkbox
    const confirmCheckbox = document.getElementById('confirm-dispensing');
    if (confirmCheckbox) {
        confirmCheckbox.addEventListener('change', (e) => {
            const confirmBtn = document.getElementById('confirm-dispense-btn');
            if (confirmBtn) {
                confirmBtn.disabled = !e.target.checked;
            }
        });
    }
}

// Load patients for dispensing
async function loadPatients(page = 1) {
    try {
        const search = document.getElementById('patient-search')?.value || '';
        
        const response = await axios.post(`${baseApiUrl}/PharmacistAPI.php`, {
            operation: 'getPatientsForDispensing',
            page: page,
            itemsPerPage: itemsPerPage,
            search: search
        });

        const data = response.data;
        if (data.status === 'success') {
            renderPatientsTable(data.data);
            renderPatientsPagination(data.pagination);
        } else {
            console.error('Failed to load patients:', data.message);
            showError('Failed to load patients: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading patients:', error);
        showError('Error loading patients');
    }
}

// Render patients table
function renderPatientsTable(patients) {
    const tbody = document.getElementById('patients-table-body');
    if (!tbody) return;

    if (!patients || patients.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-user-injured me-2"></i>No patients found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = patients.map(patient => {
        const fullName = [patient.patient_fname, patient.patient_mname, patient.patient_lname]
            .filter(Boolean).join(' ');
        
        return `
            <tr>
                <td>${escapeHtml(patient.admission_id)}</td>
                <td>${escapeHtml(fullName)}</td>
                <td>${escapeHtml(patient.mobile_number || '')}</td>
                <td>${formatDate(patient.admission_date)}</td>
                <td>${escapeHtml(patient.admission_reason)}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="selectPatient(${JSON.stringify(patient).replace(/'/g, "\'").replace(/"/g, "'")})">
                        <i class="fas fa-check me-1"></i>Select
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Select patient for dispensing
function selectPatient(patient) {
    try {
        if (!patient || typeof patient !== 'object') {
            throw new Error('Invalid patient data');
        }

        // Validate required patient properties
        const requiredProps = ['admission_id', 'patient_fname', 'patient_lname'];
        for (const prop of requiredProps) {
            if (!patient[prop]) {
                throw new Error(`Missing required patient property: ${prop}`);
            }
        }

        currentPatient = patient;
        
        // Update UI to show selected patient
        const patientBadge = document.getElementById('selected-patient-badge');
        if (!patientBadge) {
            throw new Error('Patient badge element not found');
        }
        patientBadge.textContent = `${patient.patient_fname} ${patient.patient_lname} (ID: ${patient.admission_id})`;
        
        // Update patient info with proper error handling
        const patientName = document.getElementById('patient-name');
        const patientAdmissionId = document.getElementById('patient-admission-id');
        const patientContact = document.getElementById('patient-contact');
        const patientAdmissionDate = document.getElementById('patient-admission-date');

        if (!patientName || !patientAdmissionId || !patientContact || !patientAdmissionDate) {
            throw new Error('One or more patient info elements not found');
        }

        patientName.textContent = [patient.patient_fname, patient.patient_mname, patient.patient_lname].filter(Boolean).join(' ');
        patientAdmissionId.textContent = patient.admission_id;
        patientContact.textContent = patient.mobile_number || 'N/A';
        patientAdmissionDate.textContent = formatDate(patient.admission_date);

        // Load doctor's medicine requests
        loadDoctorMedicineRequests(patient.admission_id);

        // Show dispensing section
        document.getElementById('dispensing-section').style.display = 'block';
    } catch (error) {
        console.error('Error selecting patient:', error);
        showError('Failed to select patient: ' + error.message);
    }
}


// Load doctor's medicine requests for the selected patient
async function loadDoctorMedicineRequests(admissionId) {
    try {
        const response = await axios.post(`${baseApiUrl}/DoctorRequestAPI.php`, {
            operation: 'getRequests',
            json: JSON.stringify({
                filters: {
                    patient: admissionId,
                    type: 'medicine'
                }
            })
        });

        const tbody = document.getElementById('medicine-requests-body');
        if (!tbody) return;

        if (response.data.status === 'success' && response.data.requests && response.data.requests.length > 0) {
            tbody.innerHTML = response.data.requests.map(request => `
                <tr>
                    <td>${escapeHtml(request.item_name)}</td>
                    <td>${escapeHtml(request.quantity)}</td>
                    <td>${escapeHtml(request.notes || '')}</td>
                    <td>${escapeHtml(request.notes || '')}</td>
                    <td>${escapeHtml(request.notes || '')}</td>
                    <td>${formatDate(request.request_date)}</td>
                    <td><span class="badge bg-${request.status === 'pending' ? 'warning' : 'success'}">${request.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="addRequestedMedicine(${request.item_id})" 
                                ${request.status !== 'pending' ? 'disabled' : ''}>
                            <i class="fas fa-plus me-1"></i>Add
                        </button>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted">
                        <i class="fas fa-prescription-bottle me-2"></i>No medicine requests found
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading medicine requests:', error);
        showError('Failed to load medicine requests');
    }
}



// Load medicines for dispensing
async function loadMedicines(page = 1) {
    try {
        const search = document.getElementById('medicine-search')?.value || '';
        
        const response = await axios.post(`${baseApiUrl}/PharmacistAPI.php`, {
            operation: 'getMedicinesForDispensing',
            page: page,
            itemsPerPage: medicinesPerPage,
            search: search
        });

        const data = response.data;
        if (data.status === 'success') {
            medicines = data.data;
            renderMedicinesTable(data.data);
        } else {
            console.error('Failed to load medicines:', data.message);
            showError('Failed to load medicines: ' + data.message);
        }
    } catch (error) {
        console.error('Error loading medicines:', error);
        showError('Error loading medicines');
    }
}

// Render medicines table
function renderMedicinesTable(medicines) {
    const tbody = document.getElementById('medicines-table-body');
    if (!tbody) return;

    if (!medicines || medicines.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-pills me-2"></i>No medicines found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = medicines.map(medicine => `
        <tr>
            <td>${escapeHtml(medicine.med_name)}</td>
            <td>${escapeHtml(medicine.med_type_name)}</td>
            <td>${escapeHtml(medicine.unit_name)}</td>
            <td>₱${parseFloat(medicine.unit_price).toFixed(2)}</td>
            <td>
                <span class="badge ${medicine.stock_quantity > 10 ? 'bg-success' : medicine.stock_quantity > 0 ? 'bg-warning' : 'bg-danger'}">
                    ${medicine.stock_quantity}
                </span>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm" 
                       id="qty-${medicine.med_id}" 
                       min="1" 
                       max="${medicine.stock_quantity}" 
                       value="1"
                       style="width: 80px;">
            </td>
            <td>
                <button class="btn btn-sm btn-success" 
                        onclick="addMedicineToCart(${medicine.med_id})"
                        ${medicine.stock_quantity <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-plus me-1"></i>Add
                </button>
            </td>
        </tr>
    `).join('');
}

// Add medicine to cart
function addMedicineToCart(medId) {
    const medicine = medicines.find(m => m.med_id == medId);
    if (!medicine) return;

    const quantityInput = document.getElementById(`qty-${medId}`);
    const quantity = parseInt(quantityInput.value) || 1;

    if (quantity <= 0) {
        showError('Please enter a valid quantity');
        return;
    }

    if (quantity > medicine.stock_quantity) {
        showError('Quantity exceeds available stock');
        return;
    }

    // Check if medicine already in cart
    const existingIndex = medicineCart.findIndex(item => item.med_id == medId);
    
    if (existingIndex >= 0) {
        // Update existing item
        medicineCart[existingIndex].quantity += quantity;
    } else {
        // Add new item
        medicineCart.push({
            med_id: medicine.med_id,
            med_name: medicine.med_name,
            med_type_name: medicine.med_type_name,
            unit_name: medicine.unit_name,
            unit_price: parseFloat(medicine.unit_price),
            quantity: quantity,
            stock_quantity: medicine.stock_quantity
        });
    }

    updateCartDisplay();
    quantityInput.value = 1; // Reset quantity input
}

// Update cart display
function updateCartDisplay() {
    const tbody = document.getElementById('medicine-cart-body');
    if (!tbody) return;

    if (medicineCart.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-shopping-cart me-2"></i>No medicines in cart
                </td>
            </tr>
        `;
        document.getElementById('clear-cart-btn').disabled = true;
        document.getElementById('dispense-batch-btn').disabled = true;
        return;
    }

    tbody.innerHTML = medicineCart.map((item, index) => {
        const total = item.unit_price * item.quantity;
        return `
            <tr>
                <td>
                    <strong>${escapeHtml(item.med_name)}</strong><br>
                    <small class="text-muted">${escapeHtml(item.med_type_name)}</small>
                </td>
                <td>${item.quantity}</td>
                <td>₱${item.unit_price.toFixed(2)}</td>
                <td>₱${total.toFixed(2)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="removeFromCart(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Update total
    const total = medicineCart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    document.getElementById('cart-total').textContent = total.toFixed(2);

    // Enable buttons
    document.getElementById('clear-cart-btn').disabled = false;
    document.getElementById('dispense-batch-btn').disabled = false;
}

// Remove item from cart
function removeFromCart(index) {
    medicineCart.splice(index, 1);
    updateCartDisplay();
}

// Clear cart
function clearCart() {
    medicineCart = [];
    updateCartDisplay();
}

// Show dispense modal
function showDispenseModal() {
    if (!currentPatient || medicineCart.length === 0) {
        showError('Please select a patient and add medicines to cart');
        return;
    }

    // Update modal content
    const patientInfo = `${currentPatient.patient_fname} ${currentPatient.patient_lname} (Admission ID: ${currentPatient.admission_id})`;
    document.getElementById('modal-patient-info').textContent = patientInfo;

    // Update medicines list
    const medicinesList = document.getElementById('modal-medicines-list');
    medicinesList.innerHTML = medicineCart.map(item => {
        const total = item.unit_price * item.quantity;
        return `
            <div class="d-flex justify-content-between mb-1">
                <span>${escapeHtml(item.med_name)} (${item.quantity}x)</span>
                <span>₱${total.toFixed(2)}</span>
            </div>
        `;
    }).join('');

    // Update total amount
    const totalAmount = medicineCart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    document.getElementById('modal-total-amount').textContent = totalAmount.toFixed(2);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('dispenseModal'));
    modal.show();
}

// Confirm dispensing
async function confirmDispensing() {
    if (!currentPatient || medicineCart.length === 0) {
        showError('No medicines to dispense');
        return;
    }

    try {
        const dispenseDate = document.getElementById('dispense-date').value;
        
        const response = await axios.post(`${baseApiUrl}/PharmacistAPI.php`, {
            operation: 'dispenseMedicinesBatch',
            data: {
                admission_id: currentPatient.admission_id,
                items: medicineCart.map(item => ({
                    med_id: item.med_id,
                    quantity: item.quantity
                })),
                date_given: dispenseDate
            }
        });

        const data = response.data;
        if (data.status === 'success') {
            showSuccess('Medicines dispensed successfully!');
            
            // Clear cart and refresh data
            clearCart();
            loadMedicines();
            loadDispensingHistory();
            
            // Hide modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('dispenseModal'));
            modal.hide();
        } else {
            showError('Failed to dispense medicines: ' + data.message);
        }
    } catch (error) {
        console.error('Error dispensing medicines:', error);
        showError('Error dispensing medicines');
    }
}

// Load dispensing history
async function loadDispensingHistory() {
    if (!currentPatient) return;

    try {
        const response = await axios.post(`${baseApiUrl}/PharmacistAPI.php`, {
            operation: 'getDispensingHistory',
            data: {
                admission_id: currentPatient.admission_id
            }
        });

        const data = response.data;
        if (data.status === 'success') {
            renderDispensingHistory(data.data);
        } else {
            console.error('Failed to load dispensing history:', data.message);
        }
    } catch (error) {
        console.error('Error loading dispensing history:', error);
    }
}

// Render dispensing history
function renderDispensingHistory(history) {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    if (!history || history.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-history me-2"></i>No dispensing history found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = history.map(record => `
        <tr>
            <td>${formatDate(record.date_given)}</td>
            <td>${escapeHtml(record.med_name)}</td>
            <td>${escapeHtml(record.med_type_name)}</td>
            <td>${record.quantity}</td>
            <td>₱${parseFloat(record.charge / record.quantity).toFixed(2)}</td>
            <td>₱${parseFloat(record.charge).toFixed(2)}</td>
            <td>${escapeHtml(record.dispensed_by)}</td>
        </tr>
    `).join('');
}

// Utility functions
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    } catch (error) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showSuccess(message) {
    Swal.fire({
        title: 'Success!',
        text: message,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
    });
}

function showError(message) {
    Swal.fire({
        title: 'Error!',
        text: message,
        icon: 'error',
        confirmButtonText: 'OK'
    });
}

// Pagination functions
function renderPatientsPagination(pagination) {
    const paginationEl = document.getElementById('patients-pagination');
    if (!paginationEl || pagination.totalPages <= 1) {
        paginationEl.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    
    // Previous button
    if (pagination.currentPage > 1) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPatients(${pagination.currentPage - 1})">Previous</a>
            </li>
        `;
    }

    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === pagination.currentPage) {
            paginationHTML += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            paginationHTML += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="loadPatients(${i})">${i}</a>
                </li>
            `;
        }
    }

    // Next button
    if (pagination.currentPage < pagination.totalPages) {
        paginationHTML += `
            <li class="page-item">
                <a class="page-link" href="#" onclick="loadPatients(${pagination.currentPage + 1})">Next</a>
            </li>
        `;
    }

    paginationEl.innerHTML = paginationHTML;
}

'use strict';

console.log('doctor-dashboard.js loaded');

document.addEventListener('DOMContentLoaded', () => {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    window.location.href = '../index.html';
    return;
  }

  // Show current date/time
  const dateEl = document.getElementById('docdash-date');
  try {
    const now = new Date();
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (_) { }

  loadDoctorDashboard();
  loadPendingRequests();
  setupModalEventListeners();
});

async function loadDoctorDashboard() {
  try {

    // Load dashboard statistics
    const statsResponse = await axios.get('../../api/doctor-php/doctor-dashboard-stats.php', {
      params: { operation: 'getStats' },
      withCredentials: true
    });

    if (statsResponse.data.success) {
      renderKPIs(statsResponse.data.data);
    } else {
      console.warn('Failed to load dashboard stats:', statsResponse.data.message);
      renderKPIs({});
    }

    // Load recent patients
    const patientsResponse = await axios.get('../../api/doctor-php/doctor-recent-patients.php', {
      params: { operation: 'getRecentPatients' },
      withCredentials: true
    });

    if (patientsResponse.data.success) {
      renderRecent(patientsResponse.data.data);
    } else {
      console.warn('Failed to load recent patients:', patientsResponse.data.message);
      renderRecent([]);
    }
  } catch (err) {
    console.error('Error loading doctor dashboard:', err);
    renderKPIs({});
    renderRecent([]);
  }
}

async function loadPendingRequests() {
  const container = document.getElementById('pending-requests-container');
  container.innerHTML = '<div class="text-center text-muted py-3">Loading requests...</div>';

  try {
    const response = await axios.get('../../api/doctor-php/doctor-pending-requests.php', {
      params: { operation: 'getPendingRequests' },
      withCredentials: true
    });

    if (response.data.success) {
      renderPendingRequests(response.data.data);
    } else {
      console.warn('Failed to load pending requests:', response.data.message);
      container.innerHTML = '<div class="text-center text-muted py-3">Failed to load requests</div>';
    }
  } catch (err) {
    console.error('Error loading pending requests:', err);
    container.innerHTML = '<div class="text-center text-muted py-3">Error loading requests</div>';
  }
}


function setupModalEventListeners() {
  // Set up event listeners for the modal forms
  const newRequestsForm = document.getElementById('newRequestsForm');
  if (newRequestsForm) {
    newRequestsForm.addEventListener('submit', handleNewRequestsSubmit);
  }

  const doctorChangeForm = document.getElementById('doctorChangeForm');
  if (doctorChangeForm) {
    doctorChangeForm.addEventListener('submit', handleDoctorChangeSubmit);
  }

  const roomChangeForm = document.getElementById('roomChangeForm');
  if (roomChangeForm) {
    roomChangeForm.addEventListener('submit', handleRoomChangeSubmit);
  }

  const surgeryForm = document.getElementById('surgeryForm');
  if (surgeryForm) {
    surgeryForm.addEventListener('submit', handleSurgerySubmit);
  }

  const addRequestRowBtn = document.getElementById('addRequestRowBtn');
  if (addRequestRowBtn) {
    addRequestRowBtn.addEventListener('click', addRequestRow);
  }

  const newRequestsTableBody = document.querySelector('#newRequestsTable tbody');
  if (newRequestsTableBody) {
    newRequestsTableBody.addEventListener('change', handleServiceTypeChange);
    newRequestsTableBody.addEventListener('click', handleRemoveRowClick);
  }
}

function renderKPIs(stats) {
  setText('kpi-total', stats.total_assigned || 0);
  setText('kpi-active', stats.active_patients || 0);
  setText('kpi-admit30', stats.admitted_30_days || 0);
  setText('kpi-disch30', stats.discharged_30_days || 0);
}

function renderRecent(patients) {
  const tbody = document.getElementById('docdash-recent');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!patients || patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No assigned patients</td></tr>';
    return;
  }

  patients.forEach(patient => {
    const tr = document.createElement('tr');
    tr.className = 'patient-row';
    tr.dataset.admissionId = patient.admission_id;
    tr.dataset.patientId = patient.patient_id;
    tr.dataset.patientName = patient.patient_name;
    tr.dataset.roomNumber = patient.room_number || '';
    tr.dataset.admissionDate = formatDate(patient.admission_date);
    tr.dataset.admissionReason = patient.admission_reason || '';

    tr.innerHTML = `
      <td>${escapeHtml(patient.patient_name)}</td>
      <td>${formatDate(patient.admission_date)}</td>
      <td>${statusBadge(patient.status)}</td>
    `;

    // Add click event to open modal
    tr.addEventListener('click', openPatientRequestsModal);

    tbody.appendChild(tr);
  });
}

function renderPendingRequests(requests) {
  const container = document.getElementById('pending-requests-container');
  if (!container) return;

  container.innerHTML = '';

  // Sort by request_date descending and take first 5
  const sorted = [...requests].sort((a, b) => {
    const ad = toDate(a.request_date)?.getTime() || 0;
    const bd = toDate(b.request_date)?.getTime() || 0;
    return bd - ad;
  }).slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="text-center text-muted py-3">No pending requests</div>';
    return;
  }

  sorted.forEach(r => {
    const cardClass = `request-card ${r.request_type}`;
    const card = document.createElement('div');
    card.className = `card ${cardClass}`;

    card.innerHTML = `
      <div class="card-body py-2">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">${escapeHtml(r.svc_name)}</h6>
            <div class="small text-muted">${escapeHtml(r.item_name)}</div>
          </div>
          <div class="text-end">
            <div class="status-badge">${statusBadge(r.status)}</div>
            <div class="small text-muted">${formatDate(r.request_date)}</div>
          </div>
        </div>
        <div class="d-flex justify-content-end mt-2">
          <button class="btn btn-sm btn-outline-primary" onclick="viewRequestDetails('${r.request_id}', '${r.request_type}')">
            <i class="fas fa-eye"></i> View Details
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}


// Patient Requests Modal Functions
let currentPatient = null;

function openPatientRequestsModal(e) {
  const row = e.currentTarget;
  const admissionId = row.dataset.admissionId;
  const patientId = row.dataset.patientId;
  const patientName = row.dataset.patientName;
  const roomNumber = row.dataset.roomNumber;
  const admissionDate = row.dataset.admissionDate;
  const admissionReason = row.dataset.admissionReason;

  // Set modal patient info
  document.getElementById('modalPatientName').textContent = patientName;
  document.getElementById('modalRoomNumber').textContent = roomNumber;
  document.getElementById('modalAdmissionDate').textContent = admissionDate;
  document.getElementById('modalAdmissionReason').textContent = admissionReason;

  // Store current patient data
  currentPatient = {
    admission_id: admissionId,
    patient_id: patientId,
    patient_name: patientName,
    room_number: roomNumber,
    admission_date: admissionDate,
    admission_reason: admissionReason
  };

  // Reset tabs to show existing requests
  document.getElementById('existing-requests-tab').click();

  // Load existing requests
  loadPatientRequests();

  // Load data for dropdowns
  loadDropdownData();

  // Reset new requests form
  resetNewRequestsForm();

  // Show modal
  const patientRequestsModal = new bootstrap.Modal(document.getElementById('patientRequestsModal'));
  patientRequestsModal.show();
}

async function loadPatientRequests() {
  try {
    // Updated API path
    const response = await axios.get('../../api/doctor-php/doctor-requests.php', {
      params: {
        operation: "getRequests",
        patient_id: currentPatient.patient_id
      },
      withCredentials: true
    });

    const data = response.data;
    if (!data.success) {
      console.error("Error fetching patient requests:", data.message);
      renderExistingRequests([]);
      return;
    }
    renderExistingRequests(data.requests);
  } catch (err) {
    console.error("API error:", err);
    renderExistingRequests([]);
  }
}

function renderExistingRequests(requests) {
  const existingRequestsList = document.getElementById('existingRequestsList');
  if (!existingRequestsList) return;

  existingRequestsList.innerHTML = '';
  if (!requests || requests.length === 0) {
    existingRequestsList.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No requests found</td></tr>';
    return;
  }

  requests.forEach(request => {
    const row = document.createElement('tr');
    const statusBadge = getStatusBadge(request.status);

    // For different request types, show appropriate buttons
    let actionButton = '';
    if (request.request_type === 'medicine_batch' || request.request_type === 'labtest_batch') {
      actionButton = `
        <button class="btn btn-sm btn-outline-info view-batch-btn" 
                data-request-id="${request.request_id}" 
                data-request-type="${request.request_type}"
                title="View Details">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger cancel-request-btn ms-1" 
                data-request-id="${request.request_id}" 
                data-request-type="${request.request_type}"
                title="Cancel Request">
          <i class="fas fa-trash"></i>
        </button>
      `;
    } else if (request.request_type === 'surgery') {
      actionButton = `
        <button class="btn btn-sm btn-outline-danger cancel-request-btn" 
                data-request-id="${request.request_id}" 
                data-request-type="surgery"
                title="Cancel Request">
          <i class="fas fa-trash"></i>
        </button>
      `;
    }

    row.innerHTML = `
      <td>${formatDate(request.request_date)}</td>
      <td>${escapeHtml(request.svc_name)}</td>
      <td>${escapeHtml(request.item_name || '-')}</td>
      <td>${statusBadge}</td>
      <td>
        ${actionButton}
      </td>
    `;
    existingRequestsList.appendChild(row);
  });

  // Add event listeners to buttons
  document.querySelectorAll('.cancel-request-btn').forEach(btn => {
    btn.addEventListener('click', cancelRequest);
  });

  document.querySelectorAll('.view-batch-btn').forEach(btn => {
    btn.addEventListener('click', viewBatchDetails);
  });
}

async function loadDropdownData() {
  try {
    // Updated API path
    const apiUrl = '../../api/doctor-php/doctor-requests.php';

    // Load doctors
    const doctorsResponse = await axios.get(apiUrl, {
      params: { operation: "getDoctors" },
      withCredentials: true
    });

    if (doctorsResponse.data.success) {
      const doctors = doctorsResponse.data.doctors;
      const newDoctorSelect = document.getElementById('newDoctor');
      const surgeryDoctorSelect = document.getElementById('surgeryDoctor');

      // Clear and populate doctor dropdowns
      newDoctorSelect.innerHTML = '<option value="">Select Doctor</option>';
      surgeryDoctorSelect.innerHTML = '<option value="">Select Doctor</option>';

      const currentUser = JSON.parse(localStorage.getItem('user'));

      doctors.forEach(doctor => {
        // Skip current user
        if (doctor.user_id == currentUser.user_id) return;

        const fullName = `${doctor.last_name}, ${doctor.first_name} ${doctor.middle_name || ''} ${doctor.suffix || ''}`.trim();
        const specialty = doctor.specialty_name || '';

        const optionText = `${fullName} (${specialty})`;
        const option1 = new Option(optionText, doctor.user_id);
        const option2 = new Option(optionText, doctor.user_id);
        newDoctorSelect.add(option1);
        surgeryDoctorSelect.add(option2);
      });
    }

    // Load rooms
    const roomsResponse = await axios.get(apiUrl, {
      params: { operation: "getRooms" },
      withCredentials: true
    });

    if (roomsResponse.data.success) {
      const rooms = roomsResponse.data.rooms;
      const newRoomSelect = document.getElementById('newRoom');

      // Clear and populate room dropdown
      newRoomSelect.innerHTML = '<option value="">Select Room</option>';

      rooms.forEach(room => {
        // Skip current room
        if (room.room_number == currentPatient.room_number) return;

        const option = new Option(`${room.room_number} (${room.room_type_name}) - ${room.status}`, room.room_id);
        newRoomSelect.add(option);
      });
    }

    // Load surgery types
    const surgeriesResponse = await axios.get(apiUrl, {
      params: { operation: "getSurgeryTypes" },
      withCredentials: true
    });

    if (surgeriesResponse.data.success) {
      const surgeries = surgeriesResponse.data.surgeries;
      const surgeryTypeSelect = document.getElementById('surgeryType');

      // Clear and populate surgery type dropdown
      surgeryTypeSelect.innerHTML = '<option value="">Select Surgery Type</option>';

      surgeries.forEach(surgery => {
        const option = new Option(`${surgery.surgery_name} (Base fee: $${surgery.base_fee})`, surgery.surgery_id);
        surgeryTypeSelect.add(option);
      });
    }
  } catch (error) {
    console.error('Error loading dropdown data:', error);
    Swal.fire('Error', 'Failed to load dropdown data', 'error');
  }
}

function resetNewRequestsForm() {
  const newRequestsTableBody = document.querySelector('#newRequestsTable tbody');
  newRequestsTableBody.innerHTML = `
    <tr>
      <td>
        <select class="form-select service-type-select" required>
          <option value="">Select Type</option>
          <option value="4">Medication</option>
          <option value="3">Lab Test</option>
          <option value="5">Treatment</option>
        </select>
      </td>
      <td>
        <select class="form-select item-select" required disabled>
          <option value="">Select Type First</option>
        </select>
      </td>
      <td>
        <input type="number" class="form-control quantity-input" min="1" value="1" required>
      </td>
      <td>
        <input type="text" class="form-control notes-input" placeholder="Optional notes">
      </td>
      <td>
        <button type="button" class="btn btn-sm btn-danger remove-row-btn" disabled>
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `;

  // Update remove buttons
  updateRemoveButtons();
}

function addRequestRow() {
  const newRow = document.createElement('tr');
  newRow.innerHTML = `
    <td>
      <select class="form-select service-type-select" required>
        <option value="">Select Type</option>
        <option value="4">Medication</option>
        <option value="3">Lab Test</option>
        <option value="5">Treatment</option>
      </select>
    </td>
    <td>
      <select class="form-select item-select" required disabled>
        <option value="">Select Type First</option>
      </select>
    </td>
    <td>
      <input type="number" class="form-control quantity-input" min="1" value="1" required>
    </td>
    <td>
      <input type="text" class="form-control notes-input" placeholder="Optional notes">
    </td>
    <td>
      <button type="button" class="btn btn-sm btn-danger remove-row-btn">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;
  document.querySelector('#newRequestsTable tbody').appendChild(newRow);
  updateRemoveButtons();
}

function handleServiceTypeChange(e) {
  if (e.target.classList.contains('service-type-select')) {
    const svcTypeId = e.target.value;
    const row = e.target.closest('tr');
    const itemSelect = row.querySelector('.item-select');

    if (svcTypeId) {
      loadItemsForServiceType(svcTypeId, itemSelect);
      itemSelect.disabled = false;
    } else {
      itemSelect.innerHTML = '<option value="">Select Type First</option>';
      itemSelect.disabled = true;
    }
  }
}

function handleRemoveRowClick(e) {
  if (e.target.closest('.remove-row-btn')) {
    e.target.closest('tr').remove();
    updateRemoveButtons();
  }
}

function updateRemoveButtons() {
  const rows = document.querySelectorAll('#newRequestsTable tbody tr');
  const removeButtons = document.querySelectorAll('#newRequestsTable .remove-row-btn');
  removeButtons.forEach(btn => {
    btn.disabled = rows.length <= 1;
  });
}

async function loadItemsForServiceType(svcTypeId, itemSelect) {
  itemSelect.innerHTML = '<option value="">Loading...</option>';
  try {
    let response;
    // Updated API paths
    if (svcTypeId === "4") { // Medication
      response = await axios.get('../../api/masterfiles-php/get-medicines.php', {
        params: { operation: "getMedicines" },
        withCredentials: true
      });

      if (response.data.success) {
        itemSelect.innerHTML = '<option value="">Select Medicine</option>';
        const activeMeds = response.data.medicines.filter(med =>
          med.is_active === "1" || med.is_active === 1 || med.is_active === true
        );

        if (activeMeds.length === 0) {
          itemSelect.innerHTML = '<option value="">No active medicines available</option>';
          return;
        }

        activeMeds.forEach(med => {
          const opt = document.createElement('option');
          opt.value = med.med_id;
          opt.textContent = `${med.med_name} (${med.unit_name || 'units'})`;
          itemSelect.appendChild(opt);
        });
      }
    } else if (svcTypeId === "3") { // Lab Test
      response = await axios.get('../../api/masterfiles-php/get-labtests.php', {
        params: { operation: "getLabtests" },
        withCredentials: true
      });
      if (response.data.success) {
        itemSelect.innerHTML = '<option value="">Select Lab Test</option>';
        const activeTests = response.data.labtests.filter(test =>
          test.is_active === "1" || test.is_active === 1 || test.is_active === true
        );
        activeTests.forEach(test => {
          const opt = document.createElement('option');
          opt.value = test.labtest_id;
          opt.textContent = test.test_name;
          itemSelect.appendChild(opt);
        });
      }
    } else {
      itemSelect.innerHTML = '<option value="">Not implemented yet</option>';
      itemSelect.disabled = true;
    }
  } catch (error) {
    console.error("Error loading items:", error);
    itemSelect.innerHTML = '<option value="">Failed to load items</option>';
  }
}

async function handleNewRequestsSubmit(e) {
  e.preventDefault();
  const rows = document.querySelectorAll('#newRequestsTable tbody tr');
  const requests = [];
  let hasError = false;

  rows.forEach(row => {
    const svcTypeId = row.querySelector('.service-type-select').value;
    const itemId = row.querySelector('.item-select').value;
    const quantity = row.querySelector('.quantity-input').value;
    const notes = row.querySelector('.notes-input').value;

    if (!svcTypeId || !itemId || !quantity) {
      hasError = true;
      return;
    }

    requests.push({
      svc_type_id: svcTypeId,
      item_id: itemId,
      quantity: quantity,
      notes: notes
    });
  });

  if (hasError || requests.length === 0) {
    Swal.fire({
      title: 'Warning',
      text: 'Please fill in all required fields in every row.',
      icon: 'warning'
    });
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';

    // Updated API path
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const response = await axios.post('../../api/doctor-php/doctor-requests.php', {
      operation: "createBatchRequests",
      json: JSON.stringify({
        doctor_id: currentUser.user_id,
        patient_id: currentPatient.patient_id,
        batch_notes: null,
        requests: requests
      })
    }, { withCredentials: true });

    if (response.data.success) {
      Swal.fire({
        title: 'Success',
        text: 'Requests submitted successfully!',
        icon: 'success'
      });

      resetNewRequestsForm();
      document.getElementById('existing-requests-tab').click();
      await loadPatientRequests();
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Failed to submit requests: ' + (response.data.message || 'Unknown error'),
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('Error submitting requests:', error);
    Swal.fire({
      title: 'Error',
      text: 'Network error while submitting requests.',
      icon: 'error'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

async function handleDoctorChangeSubmit(e) {
  e.preventDefault();

  const newDoctorId = document.getElementById('newDoctor').value;
  const reason = document.getElementById('doctorChangeReason').value;
  const notes = document.getElementById('doctorChangeNotes').value;

  if (!newDoctorId || !reason) {
    Swal.fire({
      title: 'Warning',
      text: 'Please fill in all required fields.',
      icon: 'warning'
    });
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';

    // Updated API path
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const response = await axios.post('../../api/doctor-php/doctor-requests.php', {
      operation: "requestDoctorChange",
      json: JSON.stringify({
        doctor_id: currentUser.user_id,
        patient_id: currentPatient.patient_id,
        new_doctor_id: newDoctorId,
        reason: reason,
        notes: notes
      })
    }, { withCredentials: true });

    if (response.data.success) {
      Swal.fire({
        title: 'Success',
        text: 'Doctor change request submitted successfully!',
        icon: 'success'
      });

      e.target.reset();
      document.getElementById('existing-requests-tab').click();
      await loadPatientRequests();
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Failed to submit request: ' + (response.data.message || 'Unknown error'),
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('Error submitting doctor change request:', error);
    Swal.fire({
      title: 'Error',
      text: 'Network error while submitting request.',
      icon: 'error'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

async function handleRoomChangeSubmit(e) {
  e.preventDefault();

  const newRoomId = document.getElementById('newRoom').value;
  const reason = document.getElementById('roomChangeReason').value;
  const notes = document.getElementById('roomChangeNotes').value;

  if (!newRoomId || !reason) {
    Swal.fire({
      title: 'Warning',
      text: 'Please fill in all required fields.',
      icon: 'warning'
    });
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Submitting...';

    // Updated API path
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const response = await axios.post('../../api/doctor-php/doctor-requests.php', {
      operation: "requestRoomChange",
      json: JSON.stringify({
        doctor_id: currentUser.user_id,
        patient_id: currentPatient.patient_id,
        new_room_id: newRoomId,
        reason: reason,
        notes: notes
      })
    }, { withCredentials: true });

    if (response.data.success) {
      Swal.fire({
        title: 'Success',
        text: 'Room change request submitted successfully!',
        icon: 'success'
      });

      e.target.reset();
      document.getElementById('existing-requests-tab').click();
      await loadPatientRequests();
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Failed to submit request: ' + (response.data.message || 'Unknown error'),
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('Error submitting room change request:', error);
    Swal.fire({
      title: 'Error',
      text: 'Network error while submitting request.',
      icon: 'error'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

async function handleSurgerySubmit(e) {
  e.preventDefault();

  const surgeryId = document.getElementById('surgeryType').value;
  const assignedDoctorId = document.getElementById('surgeryDoctor').value;
  const scheduledDate = document.getElementById('surgeryDate').value;
  const reason = document.getElementById('surgeryReason').value;

  if (!surgeryId || !assignedDoctorId || !scheduledDate || !reason) {
    Swal.fire({
      title: 'Warning',
      text: 'Please fill in all required fields.',
      icon: 'warning'
    });
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;

  try {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Scheduling...';

    // Updated API path
    const currentUser = JSON.parse(localStorage.getItem('user'));
    const response = await axios.post('../../api/doctor-php/doctor-requests.php', {
      operation: "scheduleSurgery",
      json: JSON.stringify({
        doctor_id: currentUser.user_id,
        patient_id: currentPatient.patient_id,
        surgery_id: surgeryId,
        assigned_doctor_id: assignedDoctorId,
        scheduled_date: scheduledDate,
        reason: reason
      })
    }, { withCredentials: true });

    if (response.data.success) {
      Swal.fire({
        title: 'Success',
        text: 'Surgery scheduled successfully!',
        icon: 'success'
      });

      e.target.reset();
      document.getElementById('existing-requests-tab').click();
      await loadPatientRequests();
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Failed to schedule surgery: ' + (response.data.message || 'Unknown error'),
        icon: 'error'
      });
    }
  } catch (error) {
    console.error('Error scheduling surgery:', error);
    Swal.fire({
      title: 'Error',
      text: 'Network error while scheduling surgery.',
      icon: 'error'
    });
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
}

async function cancelRequest(e) {
  const requestId = e.currentTarget.dataset.requestId;
  const requestType = e.currentTarget.dataset.requestType;

  const result = await Swal.fire({
    title: 'Are you sure?',
    text: "You won't be able to revert this!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, cancel it!'
  });

  if (result.isConfirmed) {
    try {
      let operation = "cancelRequest";
      if (requestType === 'surgery') {
        operation = "cancelSurgeryRequest";
      }

      // Updated API path
      const response = await axios.post('../../api/doctor-php/doctor-requests.php', {
        operation: operation,
        json: JSON.stringify({
          request_id: requestId,
          request_type: requestType,
          reason: "Cancelled by doctor"
        })
      }, { withCredentials: true });

      if (response.data.success) {
        Swal.fire(
          'Cancelled!',
          'The request has been cancelled.',
          'success'
        );
        await loadPatientRequests();
      } else {
        Swal.fire(
          'Error!',
          response.data.message || 'Failed to cancel request',
          'error'
        );
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      Swal.fire(
        'Error!',
        'Network error while cancelling request.',
        'error'
      );
    }
  }
}

async function viewBatchDetails(e) {
  const batchId = e.currentTarget.dataset.requestId;
  const requestType = e.currentTarget.dataset.requestType;

  try {
    // Updated API path
    const response = await axios.get('../../api/doctor-php/doctor-requests.php', {
      params: {
        operation: "getBatchDetails",
        batch_id: batchId,
        batch_type: requestType
      },
      withCredentials: true
    });

    if (response.data.success) {
      const batch = response.data.batch;
      const items = response.data.items;
      const batchType = batch.batch_type;

      let title, itemsHtml;

      if (batchType === 'medicine') {
        title = 'Medicine Batch Details';
        itemsHtml = items.map(item => `
          <tr>
            <td>${escapeHtml(item.item_name)}</td>
            <td>${escapeHtml(item.quantity)}</td>
            <td>${escapeHtml(item.notes || '-')}</td>
            <td>${getStatusBadge(item.status)}</td>
          </tr>
        `).join('');
      } else if (batchType === 'labtest') {
        title = 'Lab Test Batch Details';
        itemsHtml = items.map(item => `
          <tr>
            <td>${escapeHtml(item.item_name)}</td>
            <td>${escapeHtml(item.notes || '-')}</td>
            <td>${getStatusBadge(item.status)}</td>
          </tr>
        `).join('');
      }

      Swal.fire({
        title: title,
        html: `
          <div class="text-start">
            <p><strong>Batch ID:</strong> ${batch.batch_id}</p>
            <p><strong>Request Date:</strong> ${formatDate(batch.request_date)}</p>
            <p><strong>Status:</strong> ${getStatusBadge(batch.status)}</p>
            <p><strong>Notes:</strong> ${escapeHtml(batch.notes || 'None')}</p>
            <hr>
            <h6>${batchType === 'medicine' ? 'Items' : 'Tests'}:</h6>
            <table class="table table-sm">
              <thead>
                <tr>
                  ${batchType === 'medicine' ?
            '<th>Medicine</th><th>Quantity</th>' :
            '<th>Test Name</th>'
          }
                  <th>Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
        `,
        width: '600px',
        confirmButtonText: 'Close'
      });
    } else {
      Swal.fire('Error', 'Failed to load batch details', 'error');
    }
  } catch (error) {
    console.error('Error loading batch details:', error);
    Swal.fire('Error', 'Network error while loading batch details', 'error');
  }
}

// Utility functions
function formatDate(d) {
  const dt = toDate(d);
  if (!dt) return '';
  try { return dt.toLocaleDateString(); } catch (_) { return ''; }
}

function toDate(d) {
  if (!d) return null;
  const t = Date.parse(d);
  if (!isNaN(t)) return new Date(t);
  // try if yyyy-mm-dd hh:mm:ss without timezone
  try {
    const norm = (d || '').replace(' ', 'T');
    const t2 = Date.parse(norm);
    return isNaN(t2) ? null : new Date(t2);
  } catch (_) {
    return null;
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = `${val}`;
}

function escapeHtml(str) {
  return (str == null ? '' : String(str))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function statusBadge(status) {
  const s = (status || '').toLowerCase();
  let cls = 'secondary';
  if (s === 'active') cls = 'primary';
  else if (s === 'discharged' || s === 'completed') cls = 'success';
  else if (s === 'pending') cls = 'warning';
  else if (s === 'cancelled' || s === 'canceled') cls = 'danger';
  return `<span class="badge bg-${cls}">${escapeHtml(status || '')}</span>`;
}

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

// View request details function
function viewRequestDetails(requestId, requestType) {
  console.log(`View details for request ${requestId} of type ${requestType}`);

  // Create a simple modal to show request details
  const modalHtml = `
    <div class="modal fade" id="requestDetailsModal" tabindex="-1" aria-labelledby="requestDetailsModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="requestDetailsModalLabel">Request Details</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <strong>Request ID:</strong> ${requestId}
              </div>
              <div class="col-md-6">
                <strong>Request Type:</strong> ${requestType}
              </div>
            </div>
            <hr>
            <div class="alert alert-info">
              <i class="fas fa-info-circle me-2"></i>
              This is a placeholder for request details. In a full implementation, this would show:
              <ul class="mt-2 mb-0">
                <li>Request items and quantities</li>
                <li>Request status and timeline</li>
                <li>Patient information</li>
                <li>Notes and comments</li>
              </ul>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('requestDetailsModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Show modal
  const requestDetailsModal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
  requestDetailsModal.show();

  // Clean up modal when hidden
  document.getElementById('requestDetailsModal').addEventListener('hidden.bs.modal', function () {
    this.remove();
  });
}

function approveRequest(requestId, requestType) {
  console.log(`Approve request ${requestId} of type ${requestType}`);
  // In a real app, this would call an API to approve the request
}
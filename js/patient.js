const baseApiUrl = "http://localhost/HOSPITAL_BILLING/API";

const displayPatients = async () => {
  const response = await axios.get(`${baseApiUrl}/PatientAPI.php`, {
    params: { operation: "getPatients" }
  });
  
  if (response.status == 200) {
    displayPatientsTable(response.data.patients);
  } else {
    Swal.fire({
      title: 'Error',
      text: 'Error fetching patients!',
      icon: 'error'
    });
  }
}

const displayPatientsTable = (patients) => {
  const tableDiv = document.getElementById("patients-table-div");
  tableDiv.innerHTML = "";
  const table = document.createElement("table");
  table.className = "table table-striped";
  
  const thead = document.createElement("thead");
  thead.innerHTML = `
    <tr>  
      <th>ID</th>
      <th>Last Name</th>
      <th>First Name</th>
      <th>Middle Name</th>
      <th>Birthdate</th>
      <th>Mobile Number</th>
      <th>Email</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);
  
  const tbody = document.createElement("tbody");
  patients.forEach(patient => {
    let row = document.createElement("tr");
    row.innerHTML = `
      <td>${patient.patient_id}</td>
      <td>${patient.patient_lname}</td>
      <td>${patient.patient_fname}</td>
      <td>${patient.patient_mname}</td>
      <td>${patient.birthdate}</td>
      <td>${patient.mobile_number}</td>
      <td>${patient.email}</td>
      <td>
        <button class="btn btn-sm btn-info view-patient" data-id="${patient.patient_id}">View</button>
        <button class="btn btn-sm btn-primary admit-patient" data-id="${patient.patient_id}">Admit</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  tableDiv.appendChild(table);
  
  // Add event listeners to buttons
  document.querySelectorAll(".view-patient").forEach(button => {
    button.addEventListener("click", function() {
      const patientId = this.getAttribute("data-id");
      viewPatient(patientId);
    });
  });
  
  document.querySelectorAll(".admit-patient").forEach(button => {
    button.addEventListener("click", function() {
      const patientId = this.getAttribute("data-id");
      document.getElementById("admission-patient-id").value = patientId;
      // Show admission modal
      const admissionModal = new bootstrap.Modal(document.getElementById('admissionModal'));
      admissionModal.show();
    });
  });
}

const viewPatient = async (patientId) => {
  const response = await axios.get(`${baseApiUrl}/PatientAPI.php`, {
    params: { 
      operation: "getPatient",
      patient_id: patientId
    }
  });
  
  if (response.status == 200 && response.data.status == "success") {
    const patient = response.data.patient;
    
    // Populate patient details modal
    document.getElementById("view-patient-id").value = patient.patient_id;
    document.getElementById("view-patient-name").value = `${patient.patient_fname} ${patient.patient_mname} ${patient.patient_lname}`;
    document.getElementById("view-patient-birthdate").value = patient.birthdate;
    document.getElementById("view-patient-address").value = patient.address;
    document.getElementById("view-patient-mobile").value = patient.mobile_number;
    document.getElementById("view-patient-email").value = patient.email;
    document.getElementById("view-patient-emergency-name").value = patient.em_contact_name;
    document.getElementById("view-patient-emergency-contact").value = patient.em_contact_number;
    document.getElementById("view-patient-emergency-address").value = patient.em_contact_address;
    
    // Show modal
    const viewPatientModal = new bootstrap.Modal(document.getElementById('viewPatientModal'));
    viewPatientModal.show();
  } else {
    Swal.fire({
      title: 'Error',
      text: 'Error fetching patient details!',
      icon: 'error'
    });
  }
}

const insertPatient = async () => {
  const jsonData = {
    patient_fname: document.getElementById("patient-first-name").value,
    patient_lname: document.getElementById("patient-last-name").value,
    patient_mname: document.getElementById("patient-middle-name").value,
    birthdate: document.getElementById("patient-birthdate").value,
    address: document.getElementById("patient-address").value,
    mobile_number: document.getElementById("patient-mobile").value,
    email: document.getElementById("patient-email").value,
    em_contact_name: document.getElementById("patient-emergency-name").value,
    em_contact_number: document.getElementById("patient-emergency-contact").value,
    em_contact_address: document.getElementById("patient-emergency-address").value
  };
  
  const formData = new FormData();
  formData.append("operation", "createPatient");
  formData.append("json", JSON.stringify(jsonData));
  formData.append("token", localStorage.getItem("authToken"));
  
  const response = await axios({
    url: `${baseApiUrl}/PatientAPI.php`,
    method: "POST",
    data: formData
  });
  
  console.log(response);
  if (response.data.status == "success") {
    displayPatients();
    Swal.fire({
      title: 'Success',
      text: 'Patient successfully saved!',
      icon: 'success'
    });
    // Reset form
    document.getElementById("new-patient-form").reset();
    // Hide modal
    const patientModal = bootstrap.Modal.getInstance(document.getElementById('patientModal'));
    patientModal.hide();
  } else {
    Swal.fire({
      title: 'Error',
      text: 'ERROR: ' + response.data.message,
      icon: 'error'
    });
  }
}
console.log('admission.js is working');
document.addEventListener('DOMContentLoaded', async () => {
    // Use relative path for API URL to avoid cross-origin issues
    const baseApiUrl = '../../api';
    // Get user from localStorage or create a temporary one for testing
    let user = JSON.parse(localStorage.getItem('user'));
    // For testing purposes - create a temporary user if none exists
    if (!user) {
        console.warn('No user found in localStorage. Creating temporary user for testing.');
        // Uncomment the line below to redirect to login in production
        // window.location.href = '../index.html';
        // return;
    }
    // Local API URL for relative paths
    const localApiUrl = '../../api/';
    // Get admission form elements
    const addAdmissionForm = document.getElementById('addAdmissionForm');
    const editAdmissionForm = document.getElementById('editAdmissionForm');
    const addDoctorSel = document.getElementById('doctor_id');
    const editDoctorSel = document.getElementById('edit_doctor_id');
    // New elements for enhanced UX
    const useExistingCbx = document.getElementById('use_existing_patient');
    const existingPatientSel = document.getElementById('existing_patient_select');
    const erPreview = document.getElementById('er_charge_preview');
    const editErPreview = document.getElementById('edit_er_charge_preview');
    const addRoomSel = document.getElementById('room_id');
    const editRoomSel = document.getElementById('edit_room_id');
    // Cache for patients list (by id)
    const patientsMap = new Map();
    // Load dropdowns and admissions on page load
    await Promise.all([
        loadDoctors(),
        loadRooms(),
        loadPatientsList()
    ]);
    loadAdmissions();
    // Set up date constraints (today as min for admission date)
    setTodayAsMin('admission_date');
    setTodayAsMin('edit_admission_date');
    // Only keep validation for edit form where discharge date exists
    setupDateValidation('edit_admission_date', 'edit_discharge_date');
    // Default admission date to today whenever add modal opens
    const addModalEl = document.getElementById('addAdmissionModal');
    if (addModalEl) {
        addModalEl.addEventListener('shown.bs.modal', () => {
            const admEl = document.getElementById('admission_date');
            if (admEl) admEl.value = getTodayStr();
            // Set default status to Active
            const statusField = document.getElementById('status');
            if (statusField) statusField.value = 'Active';
        });
    }
    // ER charge preview
    const erSel = document.getElementById('er_initial_charge');
    const editErSel = document.getElementById('edit_er_initial_charge');
    if (erSel && erPreview) {
        erSel.addEventListener('change', () => {
            erPreview.style.display = erSel.value === '1' ? 'inline' : 'none';
        });
    }
    if (editErSel && editErPreview) {
        editErSel.addEventListener('change', () => {
            editErPreview.style.display = editErSel.value === '1' ? 'inline' : 'none';
        });
    }
    // Existing patient toggle behavior
    if (useExistingCbx && existingPatientSel) {
        useExistingCbx.addEventListener('change', () => {
            const enabled = useExistingCbx.checked;
            existingPatientSel.disabled = !enabled;
            setPatientInputsReadonly(enabled);
            if (!enabled) {
                // clear selection
                existingPatientSel.value = '';
            }
        });
        existingPatientSel.addEventListener('change', () => {
            const id = existingPatientSel.value;
            if (!id) return;
            const p = patientsMap.get(Number(id));
            if (p) fillPatientInputs(p);
        });
    }
    // Add event listener for form submission
    if (addAdmissionForm) {
        addAdmissionForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Validate required fields
            const requiredFields = [
                'patient_fname', 'patient_lname', 'birthdate', 'address',
                'mobile_number', 'em_contact_name', 'em_contact_number',
                'em_contact_address', 'admission_date', 'admission_reason'
            ];

            let isValid = true;
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && !field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else if (field) {
                    field.classList.remove('is-invalid');
                }
            });

            // Validate gender
            const genderSelected = document.querySelector('input[name="gender"]:checked');
            if (!genderSelected) {
                isValid = false;
                // Add visual indicator for gender validation
                const genderGroup = document.querySelector('.radio-group');
                if (genderGroup) genderGroup.classList.add('is-invalid');
            } else {
                const genderGroup = document.querySelector('.radio-group');
                if (genderGroup) genderGroup.classList.remove('is-invalid');
            }

            // Validate marital status
            const maritalStatus = document.getElementById('marital_status');
            if (maritalStatus && !maritalStatus.value) {
                maritalStatus.classList.add('is-invalid');
                isValid = false;
            } else if (maritalStatus) {
                maritalStatus.classList.remove('is-invalid');
            }

            // Validate agreement
            const agreement = document.getElementById('agreement');
            if (agreement && !agreement.checked) {
                agreement.classList.add('is-invalid');
                isValid = false;
            } else if (agreement) {
                agreement.classList.remove('is-invalid');
            }

            // Validate parent/guardian if under 18
            const under18Toggle = document.getElementById('under_18_toggle');
            if (under18Toggle && under18Toggle.checked) {
                const parentName = document.getElementById('parent_name');
                const parentContact = document.getElementById('parent_contact');

                if (parentName && !parentName.value.trim()) {
                    parentName.classList.add('is-invalid');
                    isValid = false;
                } else if (parentName) {
                    parentName.classList.remove('is-invalid');
                }

                if (parentContact && !parentContact.value.trim()) {
                    parentContact.classList.add('is-invalid');
                    isValid = false;
                } else if (parentContact) {
                    parentContact.classList.remove('is-invalid');
                }
            }

            if (!isValid) {
                Swal.fire({
                    title: 'Validation Error',
                    text: 'Please fill in all required fields.',
                    icon: 'error'
                });
                return;
            }

            // Get form data
            const formData = {
                patient_fname: document.getElementById('patient_fname').value,
                patient_lname: document.getElementById('patient_lname').value,
                patient_mname: document.getElementById('patient_mname').value,
                birthdate: document.getElementById('birthdate').value,
                address: document.getElementById('address').value,
                mobile_number: document.getElementById('mobile_number').value,
                email: document.getElementById('email').value,
                em_contact_name: document.getElementById('em_contact_name').value,
                em_contact_number: document.getElementById('em_contact_number').value,
                em_contact_address: document.getElementById('em_contact_address').value,
                admission_date: document.getElementById('admission_date').value,
                admission_reason: document.getElementById('admission_reason').value,
                status: 'Active', // Default status for new admissions
                doctor_id: (addDoctorSel && addDoctorSel.value) ? addDoctorSel.value : '',
                marital_status: document.getElementById('marital_status').value,
                gender: document.querySelector('input[name="gender"]:checked')?.value || ''
            };

            // Add parent/guardian info if under 18
            if (under18Toggle && under18Toggle.checked) {
                formData.parent_name = document.getElementById('parent_name').value;
                formData.parent_contact = document.getElementById('parent_contact').value;
            }

            // If using existing patient, include the patient_id so backend reuses it
            if (useExistingCbx && useExistingCbx.checked && existingPatientSel && existingPatientSel.value) {
                formData.patient_id = Number(existingPatientSel.value);
            }

            // Send data to server
            axios.post(localApiUrl + 'get-admissions.php', {
                operation: 'addAdmission',
                data: JSON.stringify(formData)
            })
                .then(function (response) {
                    console.log('Add admission response:', response);
                    if (response.data.status === 'success') {
                        // Close modal and reload admissions
                        const modal = bootstrap.Modal.getInstance(document.getElementById('addAdmissionModal'));
                        modal.hide();
                        resetAddForm();
                        loadAdmissions();
                        Swal.fire({
                            title: 'Success',
                            text: 'Admission added successfully!',
                            icon: 'success'
                        });
                    } else {
                        console.error('Server error:', response.data.message);
                        Swal.fire({
                            title: 'Error',
                            text: 'Error: ' + response.data.message,
                            icon: 'error'
                        });
                    }
                })
                .catch(function (error) {
                    console.error('Error:', error);
                    Swal.fire({
                        title: 'Error',
                        text: 'An error occurred while adding the admission.',
                        icon: 'error'
                    });
                });
        });
    }
    // Edit admission form submission
    if (editAdmissionForm) {
        editAdmissionForm.addEventListener('submit', function (e) {
            e.preventDefault();

            // Validate required fields
            const requiredFields = [
                'edit_patient_fname', 'edit_patient_lname', 'edit_birthdate', 'edit_address',
                'edit_mobile_number', 'edit_em_contact_name', 'edit_em_contact_number',
                'edit_em_contact_address', 'edit_admission_date', 'edit_admission_reason'
            ];

            let isValid = true;
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && !field.value.trim()) {
                    field.classList.add('is-invalid');
                    isValid = false;
                } else if (field) {
                    field.classList.remove('is-invalid');
                }
            });

            // Validate gender
            const genderSelected = document.querySelector('input[name="edit_gender"]:checked');
            if (!genderSelected) {
                isValid = false;
                // Add visual indicator for gender validation
                const genderGroup = document.querySelector('#editAdmissionModal .radio-group');
                if (genderGroup) genderGroup.classList.add('is-invalid');
            } else {
                const genderGroup = document.querySelector('#editAdmissionModal .radio-group');
                if (genderGroup) genderGroup.classList.remove('is-invalid');
            }

            // Validate marital status
            const maritalStatus = document.getElementById('edit_marital_status');
            if (maritalStatus && !maritalStatus.value) {
                maritalStatus.classList.add('is-invalid');
                isValid = false;
            } else if (maritalStatus) {
                maritalStatus.classList.remove('is-invalid');
            }

            // Validate agreement
            const agreement = document.getElementById('edit_agreement');
            if (agreement && !agreement.checked) {
                agreement.classList.add('is-invalid');
                isValid = false;
            } else if (agreement) {
                agreement.classList.remove('is-invalid');
            }

            // Validate parent/guardian if under 18
            const editUnder18Toggle = document.getElementById('edit_under_18_toggle');
            if (editUnder18Toggle && editUnder18Toggle.checked) {
                const parentName = document.getElementById('edit_parent_name');
                const parentContact = document.getElementById('edit_parent_contact');

                if (parentName && !parentName.value.trim()) {
                    parentName.classList.add('is-invalid');
                    isValid = false;
                } else if (parentName) {
                    parentName.classList.remove('is-invalid');
                }

                if (parentContact && !parentContact.value.trim()) {
                    parentContact.classList.add('is-invalid');
                    isValid = false;
                } else if (parentContact) {
                    parentContact.classList.remove('is-invalid');
                }
            }

            if (!isValid) {
                Swal.fire({
                    title: 'Validation Error',
                    text: 'Please fill in all required fields.',
                    icon: 'error'
                });
                return;
            }

            // Get form data
            const formData = {
                admission_id: document.getElementById('edit_admission_id').value,
                patient_id: document.getElementById('edit_patient_id').value,
                patient_fname: document.getElementById('edit_patient_fname').value,
                patient_lname: document.getElementById('edit_patient_lname').value,
                patient_mname: document.getElementById('edit_patient_mname').value,
                birthdate: document.getElementById('edit_birthdate').value,
                address: document.getElementById('edit_address').value,
                mobile_number: document.getElementById('edit_mobile_number').value,
                email: document.getElementById('edit_email').value,
                em_contact_name: document.getElementById('edit_em_contact_name').value,
                em_contact_number: document.getElementById('edit_em_contact_number').value,
                em_contact_address: document.getElementById('edit_em_contact_address').value,
                admission_date: document.getElementById('edit_admission_date').value,
                discharge_date: document.getElementById('edit_discharge_date').value || null,
                admission_reason: document.getElementById('edit_admission_reason').value,
                status: document.getElementById('edit_status') ? document.getElementById('edit_status').value : 'Active',
                doctor_id: (editDoctorSel && editDoctorSel.value) ? editDoctorSel.value : '',
                marital_status: document.getElementById('edit_marital_status').value,
                gender: document.querySelector('input[name="edit_gender"]:checked')?.value || ''
            };

            // Add parent/guardian info if under 18
            if (editUnder18Toggle && editUnder18Toggle.checked) {
                formData.parent_name = document.getElementById('edit_parent_name').value;
                formData.parent_contact = document.getElementById('edit_parent_contact').value;
            }

            // Send data to server
            axios.post(localApiUrl + 'get-admissions.php', {
                operation: 'updateAdmission',
                data: JSON.stringify(formData)
            })
                .then(function (response) {
                    console.log('Update admission response:', response);
                    if (response.data.status === 'success') {
                        // Close modal and reload admissions
                        const modal = bootstrap.Modal.getInstance(document.getElementById('editAdmissionModal'));
                        modal.hide();
                        loadAdmissions();
                        Swal.fire({
                            title: 'Success',
                            text: 'Admission updated successfully!',
                            icon: 'success'
                        });
                    } else {
                        console.error('Server error:', response.data.message);
                        Swal.fire({
                            title: 'Error',
                            text: 'Error: ' + response.data.message,
                            icon: 'error'
                        });
                    }
                })
                .catch(function (error) {
                    console.error('Error:', error);
                    Swal.fire({
                        title: 'Error',
                        text: 'An error occurred while updating the admission.',
                        icon: 'error'
                    });
                });
        });
    }
    // Function to load admissions
    function loadAdmissions() {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'getAdmissions'
        })
            .then(function (response) {
                if (response.data.status === 'success') {
                    displayAdmissions(response.data.data);
                } else {
                    console.error('Error:', response.data.message);
                }
            })
            .catch(function (error) {
                console.error('Error:', error);
            });
    }
    // Function to display admissions in the table
    function displayAdmissions(admissions) {
        const admissionList = document.getElementById('admission-list');
        if (!admissionList) return;
        admissionList.innerHTML = '';
        if (admissions.length === 0) {
            admissionList.innerHTML = '<tr><td colspan="6" class="text-center">No admissions found</td></tr>';
            return;
        }
        admissions.forEach(function (admission) {
            const row = document.createElement('tr');
            // Format dates
            const admissionDate = new Date(admission.admission_date).toLocaleDateString();
            const dischargeDate = admission.discharge_date ? new Date(admission.discharge_date).toLocaleDateString() : 'Not discharged';
            // Get status from the data
            const status = admission.status || (admission.discharge_date ? 'Discharged' : 'Active');
            let statusClass = 'text-primary';
            // Set status class based on status value
            switch (status) {
                case 'Discharged':
                    statusClass = 'text-success';
                    break;
                case 'Active':
                    statusClass = 'text-primary';
                    break;
                case 'Pending':
                    statusClass = 'text-warning';
                    break;
                case 'Critical':
                    statusClass = 'text-danger';
                    break;
                case 'Stable':
                    statusClass = 'text-info';
                    break;
                default:
                    statusClass = 'text-primary';
            }
            row.innerHTML = `
                <td>${admission.patient_lname}, ${admission.patient_fname} ${admission.patient_mname || ''}</td>
                <td>${admissionDate}</td>
                <td>${dischargeDate}</td>
                <td>${admission.admission_reason}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${admission.admission_id}" data-patient-id="${admission.patient_id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${admission.admission_id}">Delete</button>
                </td>
            `;
            admissionList.appendChild(row);
        });
        // Add event listeners to edit buttons
        document.querySelectorAll('.edit-btn').forEach(function (button) {
            button.addEventListener('click', function () {
                const admissionId = this.getAttribute('data-id');
                const patientId = this.getAttribute('data-patient-id');
                loadAdmissionDetails(admissionId, patientId);
            });
        });
        // Add event listeners to delete buttons with SweetAlert confirmation
        document.querySelectorAll('.delete-btn').forEach(function (button) {
            button.addEventListener('click', function () {
                const admissionId = this.getAttribute('data-id');
                Swal.fire({
                    title: 'Are you sure?',
                    text: 'This will permanently delete the admission record.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Yes, delete it',
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) {
                        deleteAdmission(admissionId);
                    }
                });
            });
        });
    }
    // Function to load admission details for editing
    function loadAdmissionDetails(admissionId, patientId) {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'getAdmissionDetails',
            admission_id: admissionId,
            patient_id: patientId
        })
            .then(function (response) {
                if (response.data.status === 'success') {
                    const data = response.data.data;

                    // Check if required elements exist before setting values
                    const editAdmissionId = document.getElementById('edit_admission_id');
                    const editPatientId = document.getElementById('edit_patient_id');
                    const editPatientFname = document.getElementById('edit_patient_fname');
                    const editPatientLname = document.getElementById('edit_patient_lname');
                    const editPatientMname = document.getElementById('edit_patient_mname');
                    const editBirthdate = document.getElementById('edit_birthdate');
                    const editAddress = document.getElementById('edit_address');
                    const editMobileNumber = document.getElementById('edit_mobile_number');
                    const editEmail = document.getElementById('edit_email');
                    const editEmContactName = document.getElementById('edit_em_contact_name');
                    const editEmContactNumber = document.getElementById('edit_em_contact_number');
                    const editEmContactAddress = document.getElementById('edit_em_contact_address');
                    const editAdmissionDate = document.getElementById('edit_admission_date');
                    const editDischargeDate = document.getElementById('edit_discharge_date');
                    const editAdmissionReason = document.getElementById('edit_admission_reason');
                    const editStatus = document.getElementById('edit_status');
                    const editMaritalStatus = document.getElementById('edit_marital_status');
                    const editParentName = document.getElementById('edit_parent_name');
                    const editParentContact = document.getElementById('edit_parent_contact');

                    // Set form values only if elements exist
                    if (editAdmissionId) editAdmissionId.value = data.admission_id || '';
                    if (editPatientId) editPatientId.value = data.patient_id || '';
                    if (editPatientFname) editPatientFname.value = data.patient_fname || '';
                    if (editPatientLname) editPatientLname.value = data.patient_lname || '';
                    if (editPatientMname) editPatientMname.value = data.patient_mname || '';
                    if (editBirthdate) editBirthdate.value = data.birthdate || '';
                    if (editAddress) editAddress.value = data.address || '';
                    if (editMobileNumber) editMobileNumber.value = data.mobile_number || '';
                    if (editEmail) editEmail.value = data.email || '';
                    if (editEmContactName) editEmContactName.value = data.em_contact_name || '';
                    if (editEmContactNumber) editEmContactNumber.value = data.em_contact_number || '';
                    if (editEmContactAddress) editEmContactAddress.value = data.em_contact_address || '';
                    if (editAdmissionDate) editAdmissionDate.value = data.admission_date || '';
                    if (editDischargeDate) editDischargeDate.value = data.discharge_date || '';
                    if (editAdmissionReason) editAdmissionReason.value = data.admission_reason || '';
                    if (editStatus) editStatus.value = data.status || 'Active';
                    if (editMaritalStatus) editMaritalStatus.value = data.marital_status || '';

                    // Set parent/guardian info if exists
                    if (editParentName && data.parent_name) {
                        editParentName.value = data.parent_name;
                    }
                    if (editParentContact && data.parent_contact) {
                        editParentContact.value = data.parent_contact;
                    }

                    // Set gender
                    const genderRadios = document.querySelectorAll('input[name="edit_gender"]');
                    if (genderRadios.length > 0) {
                        genderRadios.forEach(radio => {
                            radio.checked = (radio.value === data.gender);
                        });
                    }

                    // Calculate age to determine if under 18
                    let age = 18; // Default to 18 or over
                    try {
                        if (data.birthdate) {
                            const birthdate = new Date(data.birthdate);
                            const today = new Date();
                            age = today.getFullYear() - birthdate.getFullYear();
                            const monthDiff = today.getMonth() - birthdate.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
                                age--;
                            }
                        }
                    } catch (e) {
                        console.warn('Error calculating age:', e);
                    }

                    // Set under 18 toggle based on age
                    const editUnder18Toggle = document.getElementById('edit_under_18_toggle');
                    const editUnder18Section = document.getElementById('edit_under_18_section');

                    if (editUnder18Toggle && editUnder18Section) {
                        if (age < 18) {
                            editUnder18Toggle.checked = true;
                            editUnder18Section.classList.add('active');
                        } else {
                            editUnder18Toggle.checked = false;
                            editUnder18Section.classList.remove('active');
                        }
                    }

                    // Set doctor if available
                    if (editDoctorSel) {
                        const docId = data.doctor_id ? String(data.doctor_id) : '';
                        editDoctorSel.value = docId;
                    }

                    // Open modal for editing
                    const modal = new bootstrap.Modal(document.getElementById('editAdmissionModal'));
                    modal.show();
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Error: ' + response.data.message,
                        icon: 'error'
                    });
                }
            })
            .catch(function (error) {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'An error occurred while loading admission details.',
                    icon: 'error'
                });
            });
    }
    // Function to delete admission
    function deleteAdmission(admissionId) {
        axios.post(localApiUrl + 'get-admissions.php', {
            operation: 'deleteAdmission',
            admission_id: admissionId
        })
            .then(function (response) {
                if (response.data.status === 'success') {
                    loadAdmissions();
                    Swal.fire({
                        title: 'Deleted',
                        text: 'Admission deleted successfully!',
                        icon: 'success'
                    });
                } else {
                    Swal.fire({
                        title: 'Error',
                        text: 'Error: ' + response.data.message,
                        icon: 'error'
                    });
                }
            })
            .catch(function (error) {
                console.error('Error:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'An error occurred while deleting the admission.',
                    icon: 'error'
                });
            });
    }
    // Load doctors for dropdowns
    async function loadDoctors() {
        try {
            const res = await axios.post(baseApiUrl + '/manage-users.php', {
                operation: 'getDoctors',
                search: ''
            });
            const payload = res?.data;
            const doctors = payload && payload.success ? (payload.doctors || []) : [];
            const options = [`<option value="">-- Unassigned --</option>`]
                .concat(doctors.map(d => {
                    const name = [d.last_name, ', ', d.first_name, ' ', d.middle_name || ''].join('').trim();
                    return `<option value="${d.user_id}">${name}</option>`;
                }));
            if (addDoctorSel) addDoctorSel.innerHTML = options.join('');
            if (editDoctorSel) editDoctorSel.innerHTML = options.join('');
        } catch (e) {
            console.warn('Failed to load doctors', e);
        }
    }
    // Load rooms for dropdowns
    async function loadRooms() {
        try {
            const res = await axios.post(baseApiUrl + '/masterfiles-php/get-rooms.php', {
                operation: 'getRooms',
                page: 1,
                itemsPerPage: 100,
                search: ''
            });
            const payload = res?.data;
            const rooms = payload && payload.success ? (payload.rooms || []) : [];
            const options = [`<option value="">-- Unassigned --</option>`]
                .concat(rooms
                    .filter(r => String(r.is_available) === '1')
                    .map(r => {
                        const label = `${r.room_number} - ${r.room_type_name} (₱${Number(r.daily_rate).toLocaleString()}/day)`;
                        return `<option value="${r.room_id}">${label}</option>`;
                    }));
            if (addRoomSel) addRoomSel.innerHTML = options.join('');
            if (editRoomSel) editRoomSel.innerHTML = options.join('');
        } catch (e) {
            console.warn('Failed to load rooms', e);
        }
    }
    // Load patients list for existing-patient selector
    async function loadPatientsList() {
        if (!existingPatientSel) return;
        try {
            const res = await axios.post(baseApiUrl + '/get-patients.php', {
                operation: 'getPatients',
                page: 1,
                itemsPerPage: 100,
                search: ''
            });
            const payload = res?.data;
            if (!payload || !payload.success) return;
            const pts = payload.patients || [];
            patientsMap.clear();
            const opts = [`<option value="">-- Search/Select patient --</option>`]
                .concat(pts.map(p => {
                    patientsMap.set(Number(p.patient_id), p);
                    const name = [p.patient_lname, ', ', p.patient_fname, ' ', p.patient_mname || ''].join('').trim();
                    const label = `${name} — ${p.mobile_number || 'N/A'}`;
                    return `<option value="${p.patient_id}">${label}</option>`;
                }));
            existingPatientSel.innerHTML = opts.join('');
        } catch (e) {
            console.warn('Failed to load patients', e);
        }
    }
    // Helpers
    function setTodayAsMin(inputId) {
        const el = document.getElementById(inputId);
        if (!el) return;
        el.min = getTodayStr();
    }
    function setupDateValidation(admissionId, dischargeId) {
        const adm = document.getElementById(admissionId);
        const dis = document.getElementById(dischargeId);
        if (!adm || !dis) return;
        function validate() {
            dis.setCustomValidity('');
            if (dis.value && adm.value && dis.value < adm.value) {
                dis.setCustomValidity('Discharge date must be on or after admission date.');
            }
        }
        adm.addEventListener('change', validate);
        dis.addEventListener('change', validate);
    }
    function getTodayStr() {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    function setPatientInputsReadonly(readonly) {
        ['patient_fname', 'patient_lname', 'patient_mname', 'birthdate', 'address', 'mobile_number', 'email', 'em_contact_name', 'em_contact_number', 'em_contact_address']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.readOnly = readonly && el.tagName === 'INPUT';
                if (el && el.tagName === 'TEXTAREA') el.readOnly = readonly;
            });
    }
    function fillPatientInputs(p) {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };
        set('patient_fname', p.patient_fname);
        set('patient_lname', p.patient_lname);
        set('patient_mname', p.patient_mname);
        set('birthdate', p.birthdate);
        set('address', p.address);
        set('mobile_number', p.mobile_number);
        set('email', p.email);
        set('em_contact_name', p.em_contact_name);
        set('em_contact_number', p.em_contact_number);
        set('em_contact_address', p.em_contact_address);
    }

    // Reset add form function
    function resetAddForm() {
        if (addAdmissionForm) {
            addAdmissionForm.reset();

            // Reset under 18 toggle and section
            const under18Toggle = document.getElementById('under_18_toggle');
            const under18Section = document.getElementById('under_18_section');
            if (under18Toggle) {
                under18Toggle.checked = false;
                under18Section.classList.remove('active');
            }

            // Reset existing patient checkbox and select
            if (useExistingCbx) {
                useExistingCbx.checked = false;
                if (existingPatientSel) {
                    existingPatientSel.disabled = true;
                    existingPatientSel.value = '';
                }
            }

            // Reset patient inputs to not readonly
            setPatientInputsReadonly(false);

            // Clear validation classes
            document.querySelectorAll('.is-invalid').forEach(el => {
                el.classList.remove('is-invalid');
            });
        }
    }

    // Toggle under 18 section for add modal
    const under18Toggle = document.getElementById('under_18_toggle');
    const under18Section = document.getElementById('under_18_section');

    if (under18Toggle) {
        under18Toggle.addEventListener('change', function () {
            if (this.checked) {
                under18Section.classList.add('active');
            } else {
                under18Section.classList.remove('active');
            }
        });
    }

    // Toggle under 18 section for edit modal
    const editUnder18Toggle = document.getElementById('edit_under_18_toggle');
    const editUnder18Section = document.getElementById('edit_under_18_section');

    if (editUnder18Toggle) {
        editUnder18Toggle.addEventListener('change', function () {
            if (this.checked) {
                editUnder18Section.classList.add('active');
            } else {
                editUnder18Section.classList.remove('active');
            }
        });
    }

    // Check for permissions and render modules
    try {
        // Set welcome message regardless of permissions
        const welcomeMessage = document.getElementById('welcome-msg');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${user.full_name}`;
        }
        // Try to get permissions, but don't block functionality if it fails
        try {
            const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
                operation: 'getUserPermissions',
                json: JSON.stringify({ user_id: user.user_id })
            });
            const data = response.data;
            console.log('Permissions response: ', data);
            // Additional permission-based functionality can be added here
        } catch (permError) {
            console.warn('Could not load permissions, continuing with limited functionality', permError);
        }
    } catch (error) {
        console.error('Error in initialization: ', error);
    }
});
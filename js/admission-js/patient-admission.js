console.log('patient-admission.js is working');

const baseApiUrl = `${window.location.origin}/hospital_billing/api`;

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // management functionality 
    const tableBody = document.getElementById('admission-list');
    let allPatients = [];

    const addModal = new bootstrap.Modal(document.getElementById('addAdmissionModal'));
    const addForm = document.getElementById('addAdmissionForm');
    const admissionDateInput = document.getElementById("admission_date");
    const roomSelect = document.getElementById("room_assignment");

    // Under 18 toggle (Add form)
    const under18Toggle = document.getElementById("under_18_toggle");
    const under18Section = document.getElementById("under_18_section");


    // when modal is shown
    document.getElementById("addAdmissionModal").addEventListener("show.bs.modal", () => {
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        admissionDateInput.value = today;

        loadRooms();
    });

    // Attach to save button
    document.getElementById("saveAdmissionBtn").addEventListener("click", saveAdmission);

    // Load available rooms for admission
    async function loadRooms() {
        if (!roomSelect) {
            console.error("Room select element not found");
            return;
        }

        roomSelect.innerHTML = `<option value="">Loading rooms...</option>`;

        try {
            const response = await axios.get(`${baseApiUrl}/admission-php/get-admissions.php`, {
                params: { operation: "getRooms" }
            });

            const data = response.data;

            if (!data.success) {
                roomSelect.innerHTML = `<option value="">Failed to load rooms</option>`;
                console.error("Error fetching rooms:", data.message);
                return;
            }

            const rooms = data.data;

            if (!rooms || rooms.length === 0) {
                roomSelect.innerHTML = `<option value="">No available rooms</option>`;
                return;
            }

            // Only include rooms that haven't reached max occupancy
            const availableRooms = rooms.filter(r => (r.current_occupancy || 0) < r.max_occupancy);

            if (availableRooms.length === 0) {
                roomSelect.innerHTML = `<option value="">No available rooms</option>`;
                return;
            }

            roomSelect.innerHTML = `<option value="">-- Select Room --</option>` +
                availableRooms.map(r => {
                    return `<option value="${r.room_id}">
                    ${r.room_number} (${r.room_type_name}) - ${r.current_occupancy || 0}/${r.max_occupancy}
                </option>`;
                }).join("");

        } catch (error) {
            console.error("Error loading rooms:", error);
            roomSelect.innerHTML = `<option value="">Error loading rooms</option>`;
        }
    }



    // doctor should be loaded
    async function loadDoctors() {
        const doctorSelect = document.getElementById("doctor_id");
        if (!doctorSelect) {
            console.error("Doctor select element not found");
            return;
        }

        // Clear old options
        doctorSelect.innerHTML = `<option value="">Loading doctors...</option>`;

        try {
            const response = await axios.get(`${baseApiUrl}/manage-users.php`, {
                params: {
                    operation: "getDoctors"
                }
            });

            const data = response.data;

            if (!data.success) {
                doctorSelect.innerHTML = `<option value="">Failed to load doctors</option>`;
                console.error("Error fetching doctors:", data.message);
                return;
            }

            // Build options
            if (Array.isArray(data.doctors) && data.doctors.length > 0) {
                doctorSelect.innerHTML = `<option value="">-- Select Doctor --</option>` +
                    data.doctors.map(doc => {
                        const fullName = [doc.first_name, doc.middle_name, doc.last_name, doc.suffix]
                            .filter(Boolean)
                            .join(" ");

                        const specialty = doc.specialty_name ? ` (${doc.specialty_name})` : "";

                        return `<option value="${doc.user_id}">${fullName}${specialty}</option>`;
                    }).join("");
            } else {
                doctorSelect.innerHTML = `<option value="">No active doctors found</option>`;
            }
        } catch (error) {
            console.error("Error loading doctors:", error);
            doctorSelect.innerHTML = `<option value="">Error loading doctors</option>`;
        }
    }

    // Load all admissions
    async function loadAdmissions() {
        if (!tableBody) {
            console.error('Admissions table body not found');
            return;
        }

        try {
            const response = await axios.get(`${baseApiUrl}/admission-php/get-admissions.php`, {
                params: { operation: "getAdmissions" }
            });

            const data = response.data;
            console.log("Admissions API response:", data);

            if (!data.success) {

                console.error("Failed to fetch admissions:", data.message || "Unknown error");
                tableBody.innerHTML = `<tr><td colspan="5">Failed to load admissions</td></tr>`;
                return;
            }

            // admissions data is in `data.data`
            allPatients = Array.isArray(data.data) ? data.data : [];
            renderAdmissions(allPatients);
        } catch (error) {
            console.error("Error loading admissions:", error);
            tableBody.innerHTML = `<tr><td colspan="5">Error loading admissions</td></tr>`;
        }
    }

    // Render admissions to the table
    function renderAdmissions(admissions) {
        if (!admissions.length) {
            tableBody.innerHTML = `<tr><td colspan="5">No admissions found</td></tr>`;
            return;
        }

        tableBody.innerHTML = admissions.map(adm => {
            const patientName = adm.patient_name || "Unknown";

            const doctorName = adm.doctor_name || "Not assigned";
            const room = adm.current_room || "Not assigned";

            const statusBadge = adm.status === "active"
                ? `<span class="badge bg-success">Active</span>`
                : `<span class="badge bg-secondary">${adm.status}</span>`;

            return `
            <tr>
                <td>${new Date(adm.admission_date).toLocaleDateString()}</td>
                <td>${patientName}</td>
                <td>${doctorName}</td>
                <td>${room}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editAdmission(${adm.admission_id})" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join("");
    }

    //  add admission
    async function saveAdmission(e) {
        e.preventDefault();

        if (!addForm) {
            console.error("Admission form not found");
            return;
        }

        // Collect form data
        const formData = new FormData(addForm);
        const payload = {};
        formData.forEach((value, key) => {
            payload[key] = value.trim();
        });

        // Attach logged-in user
        const user = JSON.parse(localStorage.getItem("user"));
        if (user && user.user_id) {
            payload.admitted_by = user.user_id;
        }

        try {
            const response = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, {
                operation: "addAdmission",
                data: payload
            });

            const result = response.data;

            if (!result.success) {
                console.error("Error saving admission:", result.message);
                Swal.fire({
                    title: 'Error',
                    text: result.message || 'Admission failed to save',
                    icon: 'error'
                });
                return;
            }

            Swal.fire({
                title: 'Success',
                text: result.message || "Admission saved successfully",
                icon: 'success'
            });
            addModal.hide();
            addForm.reset();

            loadAdmissions();

        } catch (error) {
            console.error("Save admission error:", error);
            Swal.fire({
                title: 'Error',
                text: 'An error occurred while saving admission. Please try again.' || result.message,
                icon: 'error'
            });
        }
    }

    // Hide section initially
    if (under18Section) {
        under18Section.style.display = "none";
    }

    // Listen for toggle
    if (under18Toggle) {
        under18Toggle.addEventListener("change", function () {
            if (this.checked) {
                under18Section.style.display = "block";

                // make guardian fields required
                document.getElementById("guardian_first_name").required = true;
                document.getElementById("guardian_last_name").required = true;
                document.getElementById("guardian_mobile_number").required = true;

            } else {
                under18Section.style.display = "none";

                // clear values
                document.querySelectorAll("#under_18_section input").forEach(input => {
                    input.value = "";
                    input.required = false;
                });
            }
        });
    }

    await loadAdmissions();
    await loadDoctors();

    // Make editAdmission globally accessible
    window.editAdmission = async function(admissionId) {
        console.log('Edit admission:', admissionId);

        const editModalEl = document.getElementById('editAdmissionModal');
        const editModal = new bootstrap.Modal(editModalEl);

        try {
            // Fetch complete details for this admission
            const response = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, {
                operation: 'getAdmissionDetails',
                admission_id: admissionId
            });

            const res = response.data;
            if (!res.success) {
                Swal.fire({ title: 'Error', text: res.message || 'Failed to load details', icon: 'error' });
                return;
            }

            const d = res.data || {};

            document.getElementById('edit_admission_id').value = d.admission_id || '';
            document.getElementById('edit_patient_id').value = d.patient_id || '';

            const editAdmissionDate = document.getElementById('edit_admission_date');
            if (editAdmissionDate && d.admission_date) {
                const dateObj = new Date(d.admission_date);
                const yyyy = dateObj.getFullYear();
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const dd = String(dateObj.getDate()).padStart(2, '0');
                editAdmissionDate.value = `${yyyy}-${mm}-${dd}`;
            }

            const editReason = document.getElementById('edit_admission_reason');
            if (editReason) editReason.value = d.admission_reason || '';

            // Patient fields
            document.getElementById('edit_patient_fname').value = d.patient_first_name || '';
            document.getElementById('edit_patient_mname').value = d.patient_middle_name || '';
            document.getElementById('edit_patient_lname').value = d.patient_last_name || '';
            document.getElementById('edit_patient_suffix').value = d.patient_suffix || '';
            document.getElementById('edit_birthdate').value = d.birthdate || '';

            if (d.gender) {
                const genRadio = document.querySelector(`input[name="edit_gender"][value="${d.gender}"]`);
                if (genRadio) genRadio.checked = true;
            }

            const marital = document.getElementById('edit_marital_status');
            if (marital && d.marital_status) marital.value = d.marital_status;

            document.getElementById('edit_mobile_number').value = d.patient_mobile_number || '';
            document.getElementById('edit_email').value = d.patient_email || '';
            document.getElementById('edit_address').value = d.patient_address || '';

            // Doctor select
            const editDoctorSelect = document.getElementById('edit_doctor_id');
            if (editDoctorSelect) {
                if (!editDoctorSelect.options || editDoctorSelect.options.length <= 1) {
                    try {
                        const resp = await axios.get(`${baseApiUrl}/manage-users.php`, { params: { operation: 'getDoctors' } });
                        const dt = resp.data;
                        if (dt.success && Array.isArray(dt.doctors)) {
                            editDoctorSelect.innerHTML = `<option value=\"\">-- Select Doctor --</option>` +
                                dt.doctors.map(doc => {
                                    const fullName = [doc.first_name, doc.middle_name, doc.last_name, doc.suffix]
                                        .filter(Boolean).join(' ');
                                    const specialty = doc.specialty_name ? ` (${doc.specialty_name})` : '';
                                    return `<option value=\"${doc.user_id}\">${fullName}${specialty}</option>`;
                                }).join('');
                        }
                    } catch (e) { console.error('Error loading doctors for edit:', e); }
                }
                if (d.doctor_id) editDoctorSelect.value = String(d.doctor_id);
            }

            // Emergency contact (single)
            document.getElementById('edit_em_contact_name').value = d.emgy_first_name || '';
            document.getElementById('edit_em_contact_relationship').value = d.emgy_relationship || '';
            document.getElementById('edit_em_contact_number').value = d.emgy_contact_number || '';
            document.getElementById('edit_em_contact_email').value = d.emgy_email || '';
            document.getElementById('edit_em_contact_address').value = d.emgy_address || '';

            // Under 18 guardian fields (EDIT modal)
            const editU18ToggleEl = document.getElementById('edit_under_18_toggle');
            const editU18SectionEl = document.getElementById('edit_under_18_section');
            if (editU18ToggleEl && editU18SectionEl) {
                const hasGuardian = !!(d.guardian_first_name || d.guardian_mobile_number);
                editU18ToggleEl.checked = hasGuardian;
                editU18SectionEl.style.display = hasGuardian ? 'block' : 'none';

                const parentNameEl = document.getElementById('edit_parent_name');
                const parentContactEl = document.getElementById('edit_parent_contact');
                if (parentNameEl) parentNameEl.value = d.guardian_first_name || '';
                if (parentContactEl) parentContactEl.value = d.guardian_mobile_number || '';
            }

            // Show modal after fields are populated
            editModal.show();

        } catch (err) {
            console.error('Error fetching admission details:', err);
            Swal.fire({ title: 'Error', text: 'Failed to load admission details', icon: 'error' });
        }
    };

    // Handle edit form submit
    const editForm = document.getElementById('editAdmissionForm');
    const editUnder18Toggle = document.getElementById('edit_under_18_toggle');
    const editUnder18Section = document.getElementById('edit_under_18_section');

    // Initialize edit under-18 UI behavior
    if (editUnder18Toggle && editUnder18Section) {
        editUnder18Section.style.display = 'none';
        editUnder18Toggle.addEventListener('change', function () {
            editUnder18Section.style.display = this.checked ? 'block' : 'none';
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                admission_id: document.getElementById('edit_admission_id').value,
                patient_id: document.getElementById('edit_patient_id').value,
                doctor_id: document.getElementById('edit_doctor_id').value,
                admission_date: document.getElementById('edit_admission_date').value,
                admission_reason: document.getElementById('edit_admission_reason').value,

                // Patient fields
                patient_first_name: document.getElementById('edit_patient_fname').value,
                patient_middle_name: document.getElementById('edit_patient_mname').value,
                patient_last_name: document.getElementById('edit_patient_lname').value,
                patient_suffix: document.getElementById('edit_patient_suffix').value,
                birthdate: document.getElementById('edit_birthdate').value,
                gender: document.querySelector('input[name="edit_gender"]:checked')?.value || null,
                marital_status: document.getElementById('edit_marital_status').value,
                patient_mobile_number: document.getElementById('edit_mobile_number').value,
                patient_email: document.getElementById('edit_email').value,
                patient_address: document.getElementById('edit_address').value,

                // Emergency contact
                emgy_first_name: document.getElementById('edit_em_contact_name').value,
                emgy_middle_name: '',
                emgy_last_name: '',
                emgy_suffix: '',
                emgy_relationship: document.getElementById('edit_em_contact_relationship').value,
                emgy_contact_number: document.getElementById('edit_em_contact_number').value,
                emgy_email: document.getElementById('edit_em_contact_email').value,
                emgy_address: document.getElementById('edit_em_contact_address').value
            };

            console.log('Submitting admission update payload:', {
                patient_id: payload.patient_id,
                patient_address: payload.patient_address,
                admission_id: payload.admission_id
            });

            // Add guardian fields only if toggle is ON
            if (editUnder18Toggle && editUnder18Toggle.checked) {
                payload.guardian_first_name = document.getElementById('edit_parent_name')?.value || '';
                payload.guardian_middle_name = '';
                payload.guardian_last_name = '';
                payload.guardian_suffix = '';
                payload.guardian_mobile_number = document.getElementById('edit_parent_contact')?.value || '';
                payload.guardian_email = '';
            }

            try {
                const response = await axios.post(`${baseApiUrl}/admission-php/get-admissions.php`, {
                    operation: 'updateAdmission',
                    data: payload
                });

                const result = response.data;
                console.log('Update admission result:', result);
                if (result.success) {
                    bootstrap.Modal.getInstance(document.getElementById('editAdmissionModal'))?.hide();
                    Swal.fire({ title: 'Updated', text: result.message || 'Admission updated successfully', icon: 'success' });
                    await loadAdmissions();
                } else {
                    Swal.fire({ title: 'Error', text: result.message || 'Failed to update admission', icon: 'error' });
                }
            } catch (err) {
                console.error('Update admission error:', err);
                Swal.fire({ title: 'Error', text: 'Network or server error during update', icon: 'error' });
            }
        });
    }
});
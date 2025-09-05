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

    // document.getElementById('savePatientBtn').addEventListener('click', savePatient);

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


    // add patient

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

            if (data.status !== "success") {

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

    await loadAdmissions();
    await loadDoctors();
});
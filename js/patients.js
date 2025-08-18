console.log('patients.js is working');

// Use relative path for API URL to avoid cross-origin issues
const baseApiUrl = '../api';

document.addEventListener('DOMContentLoaded', async () => {
    // Check for user authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        console.error('No user data found. Redirecting to login.');
        window.location.href = '../index.html';
        return;
    }

    // Check if user has permission to view patient records
    try {
        const response = await axios.post(`${baseApiUrl}/get-permissions.php`, {
            operation: 'getUserPermissions',
            json: JSON.stringify({ user_id: user.user_id })
        });

        const data = response.data;
        if (!data.success || !data.permissions.includes('view_patient_records')) {
            alert('You do not have permission to access this page.');
            window.location.href = '../components/dashboard.html';
            return;
        }
        
        // Store permissions for sidebar rendering
        window.userPermissions = data.permissions;
    } catch (error) {
        console.error('Error checking permissions:', error);
        alert('Failed to verify permissions. Please try again.');
        window.location.href = '../components/dashboard.html';
        return;
    }

    // Load Sidebar
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    try {
        const sidebarResponse = await axios.get('../components/sidebar.html');
        sidebarPlaceholder.innerHTML = sidebarResponse.data;

        const sidebarElement = document.getElementById('sidebar');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const logoutBtn = document.getElementById('logout-btn');

        // Restore sidebar collapsed state
        if (localStorage.getItem('sidebarCollapsed') === 'true') {
            sidebarElement.classList.add('collapsed');
        }

        hamburgerBtn.addEventListener('click', () => {
            sidebarElement.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebarElement.classList.contains('collapsed'));
        });

        // Log out Logic
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await axios.post(`${baseApiUrl}/logout.php`);
                    localStorage.removeItem('user');
                    window.location.href = '../index.html';
                } catch (error) {
                    console.error('Logout failed: ', error);
                    alert('Logout failed. Please try again.');
                }
            });
        }

        // Set user name in sidebar
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = user.full_name || user.username;
        }

        // Render navigation modules based on permissions
        if (window.userPermissions) {
            renderModules(window.userPermissions);
        }
    } catch (err) {
        console.error('Failed to load sidebar: ', err);
    }

    // Function to render sidebar modules
    function renderModules(permissions) {
        const moduleMap = {
            'dashboard': { label: 'Dashboard', link: '../components/dashboard.html' },
            'manage_users': { label: 'Manage Users', link: 'user-management.html' },
            'manage_roles': { label: 'Role Settings', link: 'role-settings.html' },
            'view_admissions': { label: 'Admission Records', link: 'admission-records.html' },
            'edit_admissions': { label: 'Admission Editor', link: 'admission-editor.html' },
            'access_billing': { label: 'Billing Overview', link: 'billing-overview.html' },
            'generate_invoice': { label: 'Invoice Generator', link: 'invoice-generator.html' },
            'view_patient_records': { label: 'Patient Records Viewer', link: 'patient-records.html' },
            'approve_insurance': { label: 'Insurance Approval Panel', link: 'insurance-approval.html' },
            'dashboard': { label: 'Dashboard', link: '../components/dashboard.html' },
        };  

        const inventoryMap = {
            'manage_medicine': { label: 'Medicine Module', link: 'inv-medicine.html' },
            'manage_surgeries': { label: 'Surgical Module', link: 'inv-surgery.html' },
            'manage_labtests': { label: 'Laboratory Module', link: 'inv-labtest.html' },
            'manage_treatments': { label: 'Treatment Module', link: 'inv-treatments.html' },
            'manage_rooms': { label: 'Room Management', link: 'inv-rooms.html' },
        };

        const sidebarLinks = document.getElementById('sidebar-links');
        const accordionBody = document.querySelector('#invCollapse .accordion-body');

        // Clear existing links
        if (sidebarLinks) sidebarLinks.innerHTML = '';
        if (accordionBody) accordionBody.innerHTML = '';

        // Add standalone navigation links
        permissions.forEach(permission => {
            if (moduleMap[permission]) {
                const { label, link } = moduleMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-white', 'text-decoration-none');
                a.innerHTML = `<i class="fas fa-chevron-right me-2"></i>${label}`;
                
                // Highlight current page
                if (link === 'patient-records.html') {
                    a.classList.add('bg-primary', 'bg-opacity-25');
                }
                
                if (sidebarLinks) {
                    sidebarLinks.appendChild(a);
                }
            }
        });

        // Add inventory modules to accordion
        let inventoryShown = false;
        permissions.forEach(permission => {
            if (inventoryMap[permission]) {
                const { label, link } = inventoryMap[permission];
                const a = document.createElement('a');
                a.href = `../module/${link}`;
                a.classList.add('d-block', 'px-3', 'py-2', 'text-dark', 'text-decoration-none', 'border-bottom', 'border-light');
                a.innerHTML = `<i class="fas fa-box me-2 text-primary"></i>${label}`;
                
                // Add hover effects
                a.addEventListener('mouseenter', () => {
                    a.classList.add('bg-light');
                });
                a.addEventListener('mouseleave', () => {
                    if (!a.classList.contains('bg-primary')) {
                        a.classList.remove('bg-light');
                    }
                });
                
                if (accordionBody) {
                    accordionBody.appendChild(a);
                }
                inventoryShown = true;
            }
        });

        // Show/hide inventory accordion based on permissions
        const inventoryAccordion = document.querySelector('#invHeading').parentElement;
        if (inventoryAccordion) {
            inventoryAccordion.style.display = inventoryShown ? 'block' : 'none';
        }
    }

    // Patient Records functionality
    const patientListElement = document.getElementById('patient-list');
    const patientDetailsSection = document.getElementById('patient-details-section');
    const admissionDetailsSection = document.getElementById('admission-details-section');
    const backToListBtn = document.getElementById('back-to-list');
    const backToPatientBtn = document.getElementById('back-to-patient');

    let currentPatientId = null;
    let currentAdmissionId = null;

    // Load Patient List
    async function loadPatients() {
        if (!patientListElement) {
            console.error('Patient list element not found');
            return;
        }

        patientListElement.innerHTML = '<tr><td colspan="5" class="text-center">Loading patients...</td></tr>';

        try {
            const response = await axios.get(`${baseApiUrl}/get-patients.php`, {
                params: {
                    operation: 'getPatients',
                    json: JSON.stringify({})
                }
            });

            const data = response.data;

            if (data.success && Array.isArray(data.patients)) {
                let patients = data.patients;
                let filteredPatients = [...patients];

                // Search functionality
                function applyPatientSearch() {
                    const searchTerm = document.getElementById('searchPatients')?.value.toLowerCase() || '';
                    
                    filteredPatients = patients.filter(patient => {
                        return patient.patient_fname.toLowerCase().includes(searchTerm) ||
                               patient.patient_lname.toLowerCase().includes(searchTerm) ||
                               patient.email.toLowerCase().includes(searchTerm) ||
                               patient.mobile_number.includes(searchTerm);
                    });
                    
                    renderPatientTable();
                }

                // Render patient table
                function renderPatientTable() {
                    if (filteredPatients.length === 0) {
                        patientListElement.innerHTML = '<tr><td colspan="5" class="text-center">No patients found.</td></tr>';
                        return;
                    }

                    patientListElement.innerHTML = '';

                    filteredPatients.forEach(patient => {
                        const fullName = `${patient.patient_lname}, ${patient.patient_fname} ${patient.patient_mname ? patient.patient_mname.charAt(0) + '.' : ''}`;

                        const row = `
                            <tr>
                                <td>${patient.patient_id}</td>
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
                }

                // Event listener for search
                const searchInput = document.getElementById('searchPatients');
                if (searchInput) {
                    searchInput.addEventListener('input', applyPatientSearch);
                }

                // Initial render
                renderPatientTable();
            } else {
                patientListElement.innerHTML = `<tr><td colspan="5" class="text-center">Failed to load patients.</td></tr>`;
            }
        } catch (error) {
            console.error('Error loading patients: ', error);
            patientListElement.innerHTML = '<tr><td colspan="5" class="text-center">Failed to load patients.</td></tr>';
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
                alert(data.message || 'Failed to load patient details');
            }
        } catch (error) {
            console.error('Error loading patient details: ', error);
            alert('Error loading patient details');
        }
    }

    // Load Admission Details
    async function loadAdmissionDetails(admissionId) {
        currentAdmissionId = admissionId;

        try {
            const response = await axios.post(`${baseApiUrl}/get-patients.php`, {
                operation: 'getAdmissionDetails',
                json: JSON.stringify({ admission_id: admissionId })
            });

            const data = response.data;

            if (data.success) {
                const admission = data.admission;
                const medications = data.medications;
                const labtests = data.labtests;
                const surgeries = data.surgeries;
                const treatments = data.treatments;
                const invoices = data.invoices;

                // Display admission info
                const admissionInfoElement = document.getElementById('admission-info');
                const admissionDate = new Date(admission.admission_date).toLocaleDateString();
                const dischargeDate = admission.discharge_date ? new Date(admission.discharge_date).toLocaleDateString() : 'Not discharged';

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
                    medicationsListElement.innerHTML = '<tr><td colspan="2" class="text-center">No medications found.</td></tr>';
                } else {
                    medicationsListElement.innerHTML = '';

                    medications.forEach(medication => {
                        const recordDate = new Date(medication.record_date).toLocaleDateString();

                        const row = `
                            <tr>
                                <td>${medication.medication_id}</td>
                                <td>${recordDate}</td>
                            </tr>
                        `;
                        medicationsListElement.innerHTML += row;
                    });
                }

                // Display lab tests
                const labtestsListElement = document.getElementById('labtests-list');

                if (labtests.length === 0) {
                    labtestsListElement.innerHTML = '<tr><td colspan="2" class="text-center">No lab tests found.</td></tr>';
                } else {
                    labtestsListElement.innerHTML = '';

                    labtests.forEach(labtest => {
                        const recordDate = new Date(labtest.record_date).toLocaleDateString();

                        const row = `
                            <tr>
                                <td>${labtest.patient_lab_id}</td>
                                <td>${recordDate}</td>
                            </tr>
                        `;
                        labtestsListElement.innerHTML += row;
                    });
                }

                // Display surgeries
                const surgeriesListElement = document.getElementById('surgeries-list');

                if (surgeries.length === 0) {
                    surgeriesListElement.innerHTML = '<tr><td colspan="2" class="text-center">No surgeries found.</td></tr>';
                } else {
                    surgeriesListElement.innerHTML = '';

                    surgeries.forEach(surgery => {
                        const recordDate = new Date(surgery.record_date).toLocaleDateString();

                        const row = `
                            <tr>
                                <td>${surgery.patient_surgery_id}</td>
                                <td>${recordDate}</td>
                            </tr>
                        `;
                        surgeriesListElement.innerHTML += row;
                    });
                }

                // Display treatments
                const treatmentsListElement = document.getElementById('treatments-list');

                if (treatments.length === 0) {
                    treatmentsListElement.innerHTML = '<tr><td colspan="2" class="text-center">No treatments found.</td></tr>';
                } else {
                    treatmentsListElement.innerHTML = '';

                    treatments.forEach(treatment => {
                        const recordDate = new Date(treatment.record_date).toLocaleDateString();

                        const row = `
                            <tr>
                                <td>${treatment.patient_treatment_id}</td>
                                <td>${recordDate}</td>
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
                alert(data.message || 'Failed to load admission details');
            }
        } catch (error) {
            console.error('Error loading admission details: ', error);
            alert('Error loading admission details');
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
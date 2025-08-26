const baseApiUrl = "http://localhost/HOSPITAL_BILLING/API";

document.addEventListener("DOMContentLoaded", () => {
  // Initialize page
  displayPatients();
  displayActiveAdmissions();
  displayRooms();
  displayPaymentMethods();
  
  // Set up event listeners
  document.getElementById("btn-submit-patient").addEventListener("click", () => {
    insertPatient();
  });
  
  document.getElementById("btn-submit-admission").addEventListener("click", () => {
    insertAdmission();
  });
  
  document.getElementById("btn-generate-bill").addEventListener("click", () => {
    generateBill();
  });
  
  document.getElementById("btn-process-payment").addEventListener("click", () => {
    processPayment();
  });
});
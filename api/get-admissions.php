<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Admissions
{
    // Function to get all admissions
    function getAdmissions()
    {
        include 'connection-pdo.php';
        
        try {
            $stmt = $conn->prepare(
                "SELECT pa.admission_id, pa.patient_id, p.patient_fname, p.patient_lname, p.patient_mname, 
                        pa.admission_date, pa.discharge_date, pa.admission_reason, p.mobile_number, pa.status 
                 FROM patient_admission pa 
                 JOIN patients p ON pa.patient_id = p.patient_id 
                 ORDER BY pa.admission_date DESC"
            );
            $stmt->execute();
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['status' => 'success', 'data' => $admissions]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // Function to get admission details for editing
    function getAdmissionDetails($admissionId, $patientId)
    {
        include 'connection-pdo.php';
        
        try {
            // Get admission details
            $stmt = $conn->prepare(
                "SELECT pa.*, p.* 
                 FROM patient_admission pa 
                 JOIN patients p ON pa.patient_id = p.patient_id 
                 WHERE pa.admission_id = :admission_id AND p.patient_id = :patient_id"
            );
            $stmt->bindParam(':admission_id', $admissionId);
            $stmt->bindParam(':patient_id', $patientId);
            $stmt->execute();
            $details = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$details) {
                echo json_encode(['status' => 'error', 'message' => 'Admission not found']);
                return;
            }
            
            echo json_encode(['status' => 'success', 'data' => $details]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // Function to add a new admission
    function addAdmission($data)
    {
        include 'connection-pdo.php';
        
        try {
            // Begin transaction
            $conn->beginTransaction();
            
            // First, insert or update patient information
            $stmt = $conn->prepare(
                "INSERT INTO patients 
                 (patient_fname, patient_lname, patient_mname, birthdate, address, mobile_number, email, 
                  em_contact_name, em_contact_number, em_contact_address) 
                 VALUES 
                 (:patient_fname, :patient_lname, :patient_mname, :birthdate, :address, :mobile_number, :email, 
                  :em_contact_name, :em_contact_number, :em_contact_address)"
            );
            
            $stmt->bindParam(':patient_fname', $data['patient_fname']);
            $stmt->bindParam(':patient_lname', $data['patient_lname']);
            $stmt->bindParam(':patient_mname', $data['patient_mname']);
            $stmt->bindParam(':birthdate', $data['birthdate']);
            $stmt->bindParam(':address', $data['address']);
            $stmt->bindParam(':mobile_number', $data['mobile_number']);
            $stmt->bindParam(':email', $data['email']);
            $stmt->bindParam(':em_contact_name', $data['em_contact_name']);
            $stmt->bindParam(':em_contact_number', $data['em_contact_number']);
            $stmt->bindParam(':em_contact_address', $data['em_contact_address']);
            
            $stmt->execute();
            $patientId = $conn->lastInsertId();
            
            // Then, insert admission record
            $stmt = $conn->prepare(
                "INSERT INTO patient_admission 
                 (patient_id, admitted_by, admission_date, discharge_date, admission_reason, status) 
                 VALUES 
                 (:patient_id, :admitted_by, :admission_date, :discharge_date, :admission_reason, :status)"
            );
            
            $userId = $_SESSION['user_id'];
            
            $stmt->bindParam(':patient_id', $patientId);
            $stmt->bindParam(':admitted_by', $userId);
            $stmt->bindParam(':admission_date', $data['admission_date']);
            $stmt->bindParam(':discharge_date', $data['discharge_date']);
            $stmt->bindParam(':admission_reason', $data['admission_reason']);
            $stmt->bindParam(':status', $data['status']);
            
            $stmt->execute();
            
            // Commit transaction
            $conn->commit();
            
            echo json_encode(['status' => 'success', 'message' => 'Admission added successfully']);
        } catch (PDOException $e) {
            // Rollback transaction on error
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // Function to update an existing admission
    function updateAdmission($data)
    {
        include 'connection-pdo.php';
        
        try {
            // Begin transaction
            $conn->beginTransaction();
            
            // First, update patient information
            $stmt = $conn->prepare(
                "UPDATE patients 
                 SET patient_fname = :patient_fname, 
                     patient_lname = :patient_lname, 
                     patient_mname = :patient_mname, 
                     birthdate = :birthdate, 
                     address = :address, 
                     mobile_number = :mobile_number, 
                     email = :email, 
                     em_contact_name = :em_contact_name, 
                     em_contact_number = :em_contact_number, 
                     em_contact_address = :em_contact_address 
                 WHERE patient_id = :patient_id"
            );
            
            $stmt->bindParam(':patient_id', $data['patient_id']);
            $stmt->bindParam(':patient_fname', $data['patient_fname']);
            $stmt->bindParam(':patient_lname', $data['patient_lname']);
            $stmt->bindParam(':patient_mname', $data['patient_mname']);
            $stmt->bindParam(':birthdate', $data['birthdate']);
            $stmt->bindParam(':address', $data['address']);
            $stmt->bindParam(':mobile_number', $data['mobile_number']);
            $stmt->bindParam(':email', $data['email']);
            $stmt->bindParam(':em_contact_name', $data['em_contact_name']);
            $stmt->bindParam(':em_contact_number', $data['em_contact_number']);
            $stmt->bindParam(':em_contact_address', $data['em_contact_address']);
            
            $stmt->execute();
            
            // Then, update admission record
            $stmt = $conn->prepare(
                "UPDATE patient_admission 
                 SET admission_date = :admission_date, 
                     discharge_date = :discharge_date, 
                     admission_reason = :admission_reason, 
                     status = :status 
                 WHERE admission_id = :admission_id"
            );
            
            $stmt->bindParam(':admission_id', $data['admission_id']);
            $stmt->bindParam(':admission_date', $data['admission_date']);
            $stmt->bindParam(':discharge_date', $data['discharge_date']);
            $stmt->bindParam(':admission_reason', $data['admission_reason']);
            $stmt->bindParam(':status', $data['status']);
            
            $stmt->execute();
            
            // Commit transaction
            $conn->commit();
            
            echo json_encode(['status' => 'success', 'message' => 'Admission updated successfully']);
        } catch (PDOException $e) {
            // Rollback transaction on error
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // Function to delete an admission
    function deleteAdmission($admissionId)
    {
        include 'connection-pdo.php';
        
        try {
            $stmt = $conn->prepare("DELETE FROM patient_admission WHERE admission_id = :admission_id");
            $stmt->bindParam(':admission_id', $admissionId);
            $stmt->execute();
            
            echo json_encode(['status' => 'success', 'message' => 'Admission deleted successfully']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
    $data = $payload['data'] ?? '';
    $admissionId = $payload['admission_id'] ?? '';
    $patientId = $payload['patient_id'] ?? '';
}

$admissions = new Admissions();

switch ($operation) {
    case 'getAdmissions':
        $admissions->getAdmissions();
        break;
    case 'getAdmissionDetails':
        $admissions->getAdmissionDetails($admissionId, $patientId);
        break;
    case 'addAdmission':
        $data = json_decode($data, true);
        $admissions->addAdmission($data);
        break;
    case 'updateAdmission':
        $data = json_decode($data, true);
        $admissions->updateAdmission($data);
        break;
    case 'deleteAdmission':
        $admissions->deleteAdmission($admissionId);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        break;
}
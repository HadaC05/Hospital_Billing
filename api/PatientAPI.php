<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
include 'RequireAuth.php';

class PatientAPI {
    function createPatient($token, $firstName, $lastName, $middleName, $birthdate, $address, $mobileNumber, $email, $emContactName, $emContactNumber, $emContactAddress) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'view_admissions')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "INSERT INTO patients (patient_fname, patient_lname, patient_mname, birthdate, address, mobile_number, email, em_contact_name, em_contact_number, em_contact_address) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$firstName, $lastName, $middleName, $birthdate, $address, $mobileNumber, $email, $emContactName, $emContactNumber, $emContactAddress]);
            
            $response = [
                'status' => 'success',
                'message' => 'Patient created successfully',
                'patient_id' => $pdo->lastInsertId()
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to create patient: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function updatePatient($token, $patientId, $firstName = null, $lastName = null, $middleName = null, $birthdate = null, $address = null, $mobileNumber = null, $email = null, $emContactName = null, $emContactNumber = null, $emContactAddress = null) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'view_admissions')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $updateFields = [];
            $params = [];
            
            if ($firstName !== null) {
                $updateFields[] = "patient_fname = ?";
                $params[] = $firstName;
            }
            if ($lastName !== null) {
                $updateFields[] = "patient_lname = ?";
                $params[] = $lastName;
            }
            if ($middleName !== null) {
                $updateFields[] = "patient_mname = ?";
                $params[] = $middleName;
            }
            if ($birthdate !== null) {
                $updateFields[] = "birthdate = ?";
                $params[] = $birthdate;
            }
            if ($address !== null) {
                $updateFields[] = "address = ?";
                $params[] = $address;
            }
            if ($mobileNumber !== null) {
                $updateFields[] = "mobile_number = ?";
                $params[] = $mobileNumber;
            }
            if ($email !== null) {
                $updateFields[] = "email = ?";
                $params[] = $email;
            }
            if ($emContactName !== null) {
                $updateFields[] = "em_contact_name = ?";
                $params[] = $emContactName;
            }
            if ($emContactNumber !== null) {
                $updateFields[] = "em_contact_number = ?";
                $params[] = $emContactNumber;
            }
            if ($emContactAddress !== null) {
                $updateFields[] = "em_contact_address = ?";
                $params[] = $emContactAddress;
            }
            
            if (empty($updateFields)) {
                throw new Exception("No fields to update");
            }
            
            $sql = "UPDATE patients SET " . implode(", ", $updateFields) . " WHERE patient_id = ?";
            $params[] = $patientId;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $response = [
                'status' => 'success',
                'message' => 'Patient updated successfully'
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to update patient: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getPatient($token, $patientId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'view_patient_records')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT * FROM patients WHERE patient_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$patientId]);
            $patient = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$patient) {
                throw new Exception("Patient not found");
            }
            
            $response = [
                'status' => 'success',
                'patient' => $patient
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get patient: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getPatients($token, $search = null) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'view_patient_records')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            if ($search) {
                $sql = "SELECT * FROM patients 
                        WHERE patient_fname LIKE ? OR patient_lname LIKE ? OR mobile_number LIKE ?
                        ORDER BY patient_lname, patient_fname";
                $searchTerm = "%$search%";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
            } else {
                $sql = "SELECT * FROM patients ORDER BY patient_lname, patient_fname";
                $stmt = $pdo->query($sql);
            }
            
            $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'patients' => $patients
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get patients: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getPatientInsurancePolicies($token, $patientId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'view_patient_records')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT ip.*, prov.provider_name 
                    FROM insurance_policy ip
                    JOIN insurance_provider prov ON ip.provider_id = prov.provider_id
                    WHERE ip.patient_id = ?
                    ORDER BY ip.start_date DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$patientId]);
            $policies = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'policies' => $policies
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get patient insurance policies: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
    $token = $_GET['token'] ?? '';
} else if ($method == 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
    $token = $payload['token'] ?? '';
}

$data = json_decode($json, true);
$obj = new PatientAPI();

switch ($operation) {
    case "createPatient":
        $firstName = $data['patient_fname'] ?? '';
        $lastName = $data['patient_lname'] ?? '';
        $middleName = $data['patient_mname'] ?? '';
        $birthdate = $data['birthdate'] ?? '';
        $address = $data['address'] ?? '';
        $mobileNumber = $data['mobile_number'] ?? '';
        $email = $data['email'] ?? '';
        $emContactName = $data['em_contact_name'] ?? '';
        $emContactNumber = $data['em_contact_number'] ?? '';
        $emContactAddress = $data['em_contact_address'] ?? '';
        $obj->createPatient($token, $firstName, $lastName, $middleName, $birthdate, $address, $mobileNumber, $email, $emContactName, $emContactNumber, $emContactAddress);
        break;
        
    case "updatePatient":
        $patientId = $data['patient_id'] ?? 0;
        $firstName = $data['patient_fname'] ?? null;
        $lastName = $data['patient_lname'] ?? null;
        $middleName = $data['patient_mname'] ?? null;
        $birthdate = $data['birthdate'] ?? null;
        $address = $data['address'] ?? null;
        $mobileNumber = $data['mobile_number'] ?? null;
        $email = $data['email'] ?? null;
        $emContactName = $data['em_contact_name'] ?? null;
        $emContactNumber = $data['em_contact_number'] ?? null;
        $emContactAddress = $data['em_contact_address'] ?? null;
        $obj->updatePatient($token, $patientId, $firstName, $lastName, $middleName, $birthdate, $address, $mobileNumber, $email, $emContactName, $emContactNumber, $emContactAddress);
        break;
        
    case "getPatient":
        $patientId = $data['patient_id'] ?? 0;
        $obj->getPatient($token, $patientId);
        break;
        
    case "getPatients":
        $search = $data['search'] ?? null;
        $obj->getPatients($token, $search);
        break;
        
    case "getPatientInsurancePolicies":
        $patientId = $data['patient_id'] ?? 0;
        $obj->getPatientInsurancePolicies($token, $patientId);
        break;
}
?>
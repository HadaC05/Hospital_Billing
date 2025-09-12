<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class PatientAPI {
    
    private $pdo;
    
    public function __construct() {
        include 'connection-pdo.php';
        $this->pdo = $pdo;
    }
    
    /**
     * Get all patients
     */
    public function getPatients() {
        try {
            $sql = "
                SELECT 
                    patient_id,
                    patient_fname,
                    patient_lname,
                    patient_mname,
                    mobile_number as patient_contact,
                    address as patient_address,
                    birthdate as patient_birthdate,
                    email
                FROM patients 
                ORDER BY patient_lname ASC, patient_fname ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'patients' => $patients
            ]);
            
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get patients: ' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * Get patient by ID
     */
    public function getPatientById($patientId) {
        try {
            $sql = "
                SELECT 
                    patient_id,
                    patient_fname,
                    patient_lname,
                    patient_mname,
                    mobile_number as patient_contact,
                    address as patient_address,
                    birthdate as patient_birthdate,
                    email
                FROM patients 
                WHERE patient_id = :patient_id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':patient_id', $patientId);
            $stmt->execute();
            $patient = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($patient) {
                echo json_encode([
                    'success' => true,
                    'patient' => $patient
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Patient not found'
                ]);
            }
            
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get patient: ' . $e->getMessage()
            ]);
        }
    }
}

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);
$api = new PatientAPI();

switch ($operation) {
    case 'getPatients':
        $api->getPatients();
        break;
    case 'getPatientById':
        $patientId = $data['patient_id'] ?? null;
        $api->getPatientById($patientId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}
?>
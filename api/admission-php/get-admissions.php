<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Admissions
{

    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }


    function getAdmissions()
    {
        try {
            $sql = "
                SELECT 
                    pa.admission_id, 
                    pa.patient_id, 
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, '')) AS patient_name,
                    p.mobile_number,
                    p.email,

                    pa.admission_date, 
                    pa.discharge_date, 
                    pa.admission_reason, 
                    pa.status,

                    -- doctor assigned
                    ud.user_id AS doctor_id,
                    CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name, ''), ' ', ud.last_name, ' ', COALESCE(ud.suffix, '')) AS doctor_name,
                    s.specialty_name,

                    -- staff who admitted
                    ab.username AS admitted_by,

                    -- current room
                    r.room_number AS current_room

                FROM patient_admission pa
                JOIN patients p ON pa.patient_id = p.patient_id
                LEFT JOIN users d ON pa.doctor_id = d.user_id
                LEFT JOIN user_doctor ud ON d.user_id = ud.user_id
                LEFT JOIN user_doctor_specialty s ON ud.specialty_id = s.specialty_id
                LEFT JOIN users ab ON pa.admitted_by = ab.user_id
                LEFT JOIN tbl_room_assignment ra ON pa.admission_id = ra.admission_id
                LEFT JOIN tbl_room_stay rs 
                    ON ra.room_assignment_id = rs.room_assignment_id 
                    AND rs.end_date IS NULL
                LEFT JOIN tbl_room r ON rs.room_id = r.room_id
                ORDER BY pa.admission_date DESC;
            ";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'message' => 'Admission saved successfully',
                'data' => $admissions
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }



    function addAdmission($data)
    {
        try {
            $this->conn->beginTransaction();

            $userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
            $chk = $this->conn->prepare("SELECT user_id FROM users WHERE user_id = :uid LIMIT 1");
            $chk->bindValue(':uid', $userId, PDO::PARAM_INT);
            $chk->execute();
            $validUser = $chk->fetch(PDO::FETCH_ASSOC);

            if (!$validUser) {
                $this->conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Invalid session. Please log in again.']);
                return;
            }

            // 1. Insert patient
            $stmt = $this->conn->prepare("
            INSERT INTO patients (first_name, middle_name, last_name, suffix, birthdate, gender, marital_status, mobile_number, email, address)
            VALUES (:first_name, :middle_name, :last_name, :suffix, :birthdate, :gender, :marital_status, :mobile_number, :email, :address)
        ");
            $stmt->execute([
                ':first_name' => $data['patient_first_name'],
                ':middle_name' => $data['patient_middle_name'] ?? null,
                ':last_name' => $data['patient_last_name'],
                ':suffix' => $data['patient_suffix'] ?? null,
                ':birthdate' => $data['birthdate'],
                ':gender' => $data['gender'],
                ':marital_status' => $data['marital_status'],
                ':mobile_number' => $data['patient_mobile_number'],
                ':email' => $data['patient_email'] ?? null,
                ':address' => $data['patient_address'],
            ]);
            $patient_id = $this->conn->lastInsertId();

            // 2. Insert admission
            $stmt = $this->conn->prepare("
            INSERT INTO patient_admission (patient_id, doctor_id, admitted_by, admission_date, admission_reason, status)
            VALUES (:patient_id, :doctor_id, :admitted_by, :admission_date, :admission_reason, 'active')
        ");
            $stmt->execute([
                ':patient_id' => $patient_id,
                ':doctor_id' => $data['doctor_id'],
                ':admitted_by' => $userId,
                ':admission_date' => $data['admission_date'],
                ':admission_reason' => $data['admission_reason'],
            ]);
            $admission_id = $this->conn->lastInsertId();

            // 3. Insert guardian (if under 18 toggle was on)
            if (!empty($data['guardian_first_name'])) {
                $stmt = $this->conn->prepare("
                INSERT INTO patient_guardians (patient_id, first_name, middle_name, last_name, suffix, mobile_number, email)
                VALUES (:patient_id, :first_name, :middle_name, :last_name, :suffix, :mobile_number, :email)
            ");
                $stmt->execute([
                    ':patient_id' => $patient_id,
                    ':first_name' => $data['guardian_first_name'],
                    ':middle_name' => $data['guardian_middle_name'] ?? null,
                    ':last_name' => $data['guardian_last_name'],
                    ':suffix' => $data['guardian_suffix'] ?? null,
                    ':mobile_number' => $data['guardian_mobile_number'],
                    ':email' => $data['guardian_email'] ?? null,
                ]);
            }

            // 4. Insert emergency contact
            $stmt = $this->conn->prepare("
            INSERT INTO patient_emergency_contacts (patient_id, first_name, middle_name, last_name, suffix, relationship, mobile_number, email, address)
            VALUES (:patient_id, :first_name, :middle_name, :last_name, :suffix, :relationship, :mobile_number, :email, :address)
        ");
            $stmt->execute([
                ':patient_id' => $patient_id,
                ':first_name' => $data['emgy_first_name'],
                ':middle_name' => $data['emgy_middle_name'] ?? null,
                ':last_name' => $data['emgy_last_name'],
                ':suffix' => $data['emgy_suffix'] ?? null,
                ':relationship' => $data['emgy_relationship'],
                ':mobile_number' => $data['emgy_contact_number'],
                ':email' => $data['emgy_email'] ?? null,
                ':address' => $data['emgy_address'],
            ]);

            // 5. Insert room (if assigned)
            if (!empty($data['room_assignment'])) {
                $stmt = $this->conn->prepare("
                INSERT INTO tbl_room_assignment (admission_id, record_date)
                VALUES (:admission_id, NOW())
            ");
                $stmt->execute([':admission_id' => $admission_id]);
                $room_assignment_id = $this->conn->lastInsertId();

                $stmt = $this->conn->prepare("
                INSERT INTO tbl_room_stay (room_assignment_id, room_id, start_date, assigned_by)
                VALUES (:room_assignment_id, :room_id, NOW(), :assigned_by)
            ");
                $stmt->execute([
                    ':room_assignment_id' => $room_assignment_id,
                    ':room_id' => $data['room_assignment'],
                    ':assigned_by' => $userId,
                ]);
            }

            // ✅ Commit all if no errors
            $this->conn->commit();

            echo json_encode(['success' => true, 'message' => 'Admission saved successfully']);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
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

include '../connection-pdo.php';
$conn = $GLOBALS['conn'];

$admissions = new Admissions($conn);

switch ($operation) {
    case 'getAdmissions':
        $admissions->getAdmissions();
        break;
    case 'addAdmission':
        $admissions->addAdmission($data);
        break;
}

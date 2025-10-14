<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Origin: http://localhost');
header('Content-Type: application/json');

class Admissions
{

    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    function updateAdmission($data)
    {
        try {
            $this->conn->beginTransaction();

            $admissionId = (int)($data['admission_id'] ?? 0);
            $patientId = (int)($data['patient_id'] ?? 0);

            if ($admissionId <= 0 || $patientId <= 0) {
                $this->conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Invalid identifiers provided.']);
                return;
            }

            // Update patient basic info
            $stmt = $this->conn->prepare("UPDATE patients
                SET first_name = :first_name,
                    middle_name = :middle_name,
                    last_name = :last_name,
                    suffix = :suffix,
                    birthdate = :birthdate,
                    gender = :gender,
                    marital_status = :marital_status,
                    mobile_number = :mobile_number,
                    email = :email,
                    address = :address
                WHERE patient_id = :patient_id");

            $stmt->execute([
                ':first_name' => $data['patient_first_name'] ?? '',
                ':middle_name' => $data['patient_middle_name'] ?? null,
                ':last_name' => $data['patient_last_name'] ?? '',
                ':suffix' => $data['patient_suffix'] ?? null,
                ':birthdate' => $data['birthdate'] ?? null,
                ':gender' => $data['gender'] ?? null,
                ':marital_status' => $data['marital_status'] ?? null,
                ':mobile_number' => $data['patient_mobile_number'] ?? null,
                ':email' => $data['patient_email'] ?? null,
                ':address' => $data['patient_address'] ?? null,
                ':patient_id' => $patientId,
            ]);
            $patientsUpdated = $stmt->rowCount();

            // Update admission info
            $stmt = $this->conn->prepare("UPDATE patient_admission
                SET doctor_id = :doctor_id,
                    admission_date = :admission_date,
                    admission_reason = :admission_reason
                WHERE admission_id = :admission_id");

            $stmt->execute([
                ':doctor_id' => $data['doctor_id'] ?? null,
                ':admission_date' => $data['admission_date'] ?? null,
                ':admission_reason' => $data['admission_reason'] ?? null,
                ':admission_id' => $admissionId,
            ]);
            $admissionsUpdated = $stmt->rowCount();

            // Optional: Update guardian if provided (simple upsert by delete+insert for brevity)
            if (!empty($data['guardian_first_name'])) {
                $this->conn->prepare("DELETE FROM patient_guardian WHERE patient_id = :pid")
                    ->execute([':pid' => $patientId]);
                $this->conn->prepare("INSERT INTO patient_guardian (patient_id, first_name, middle_name, last_name, suffix, mobile_number, email)
                        VALUES (:patient_id, :first_name, :middle_name, :last_name, :suffix, :mobile_number, :email)")
                    ->execute([
                        ':patient_id' => $patientId,
                        ':first_name' => $data['guardian_first_name'],
                        ':middle_name' => $data['guardian_middle_name'] ?? null,
                        ':last_name' => $data['guardian_last_name'] ?? '',
                        ':suffix' => $data['guardian_suffix'] ?? null,
                        ':mobile_number' => $data['guardian_mobile_number'] ?? null,
                        ':email' => $data['guardian_email'] ?? null,
                    ]);
            }

            // Optional: Update emergency contact
            if (!empty($data['emgy_first_name'])) {
                $this->conn->prepare("DELETE FROM patient_emergency_contact WHERE patient_id = :pid")
                    ->execute([':pid' => $patientId]);
                $this->conn->prepare("INSERT INTO patient_emergency_contact (patient_id, first_name, middle_name, last_name, suffix, relationship, mobile_number, email, address)
                        VALUES (:patient_id, :first_name, :middle_name, :last_name, :suffix, :relationship, :mobile_number, :email, :address)")
                    ->execute([
                        ':patient_id' => $patientId,
                        ':first_name' => $data['emgy_first_name'],
                        ':middle_name' => $data['emgy_middle_name'] ?? null,
                        ':last_name' => $data['emgy_last_name'] ?? '',
                        ':suffix' => $data['emgy_suffix'] ?? null,
                        ':relationship' => $data['emgy_relationship'] ?? null,
                        ':mobile_number' => $data['emgy_contact_number'] ?? null,
                        ':email' => $data['emgy_email'] ?? null,
                        ':address' => $data['emgy_address'] ?? null,
                    ]);
            }

            $this->conn->commit();
            echo json_encode([
                'success' => true,
                'message' => 'Admission updated successfully',
                'debug' => [
                    'patients_updated' => $patientsUpdated ?? 0,
                    'admissions_updated' => $admissionsUpdated ?? 0
                ]
            ]);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
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

                -- current room (subquery to get only active room)
                (
                    SELECT r.room_number
                    FROM tbl_room_stay rs
                    JOIN tbl_room r ON rs.room_id = r.room_id
                    WHERE rs.admission_id = pa.admission_id
                        AND rs.end_date IS NULL
                    LIMIT 1
                ) AS current_room

            FROM patient_admission pa
            JOIN patients p ON pa.patient_id = p.patient_id
            LEFT JOIN users d ON pa.doctor_id = d.user_id
            LEFT JOIN user_doctor ud ON d.user_id = ud.user_id
            LEFT JOIN user_doctor_specialty s ON ud.specialty_id = s.specialty_id
            LEFT JOIN users ab ON pa.admitted_by = ab.user_id

            ORDER BY pa.admission_date DESC;
        ";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'message' => 'Admissions loaded successfully',
                'data' => $admissions
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function addAdmission($data)
    {
        try {
            $this->conn->beginTransaction();

            $userId = isset($data['admitted_by']) ? (int)$data['admitted_by'] : 0;

            // Check if valid staff user
            $chk = $this->conn->prepare("SELECT user_id FROM users WHERE user_id = :uid LIMIT 1");
            $chk->bindValue(':uid', $userId, PDO::PARAM_INT);
            $chk->execute();
            $validUser = $chk->fetch(PDO::FETCH_ASSOC);

            if (!$validUser) {
                $this->conn->rollBack();
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Invalid user. Please log in again.'
                ]);
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
                INSERT INTO patient_guardian (patient_id, first_name, middle_name, last_name, suffix, mobile_number, email)
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
            INSERT INTO patient_emergency_contact (patient_id, first_name, middle_name, last_name, suffix, relationship, mobile_number, email, address)
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
                // Check current occupancy
                $stmt = $this->conn->prepare("
                    SELECT COUNT(*) as current_occupancy
                    FROM tbl_room_stay rs
                    WHERE rs.room_id = :room_id
                    AND rs.end_date IS NULL
                ");

                $stmt->execute([':room_id' => $data['room_assignment']]);
                $occupancy = $stmt->fetch(PDO::FETCH_ASSOC)['current_occupancy'] ?? 0;

                // Get max occupancy
                $stmt = $this->conn->prepare("SELECT max_occupancy FROM tbl_room WHERE room_id = :room_id");
                $stmt->execute([':room_id' => $data['room_assignment']]);
                $max_occupancy = $stmt->fetch(PDO::FETCH_ASSOC)['max_occupancy'] ?? 1;

                if ($occupancy >= $max_occupancy) {
                    $this->conn->rollBack();
                    echo json_encode([
                        'success' => true,
                        'message' => "Room is full. Max occupancy is {$max_occupancy}."
                    ]);
                    return;
                }

                // Proceed with room stay (directly link admission_id here)
                $stmt = $this->conn->prepare("
                        INSERT INTO tbl_room_stay (admission_id, room_id, start_date, assigned_by)
                        VALUES (:admission_id, :room_id, NOW(), :assigned_by)
                    ");

                $stmt->execute([
                    ':admission_id' => $admission_id,
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

    function getRooms()
    {
        include '../connection-pdo.php';

        try {
            $sql = "
                SELECT 
                    r.room_id,
                    r.room_number,
                    r.max_occupancy,
                    r.is_available,
                    rt.room_type_name,
                    IFNULL((
                        SELECT COUNT(*) 
                        FROM tbl_room_stay rs
                        WHERE rs.room_id = r.room_id
                            AND rs.end_date IS NULL
                    ), 0) AS current_occupancy
                FROM tbl_room r
                JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                ORDER BY r.room_number ASC
            ";

            $stmt = $conn->prepare($sql);
            $stmt->execute();
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'message' => 'Rooms loaded successfully',
                'data' => $rooms
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage(),
                'data' => []
            ]);
        }
    }

    function getAdmissionDetails($admissionId)
    {
        try {
            $sql = "
                SELECT 
                    pa.admission_id,
                    pa.patient_id,
                    pa.doctor_id,
                    pa.admission_date,
                    pa.admission_reason,
                    p.first_name AS patient_first_name,
                    p.middle_name AS patient_middle_name,
                    p.last_name AS patient_last_name,
                    p.suffix AS patient_suffix,
                    p.birthdate,
                    p.gender,
                    p.marital_status,
                    p.mobile_number AS patient_mobile_number,
                    p.email AS patient_email,
                    p.address AS patient_address,
                    pg.first_name AS guardian_first_name,
                    pg.middle_name AS guardian_middle_name,
                    pg.last_name AS guardian_last_name,
                    pg.suffix AS guardian_suffix,
                    pg.mobile_number AS guardian_mobile_number,
                    pg.email AS guardian_email,
                    pec.first_name AS emgy_first_name,
                    pec.middle_name AS emgy_middle_name,
                    pec.last_name AS emgy_last_name,
                    pec.suffix AS emgy_suffix,
                    pec.relationship AS emgy_relationship,
                    pec.mobile_number AS emgy_contact_number,
                    pec.email AS emgy_email,
                    pec.address AS emgy_address
                FROM patient_admission pa
                JOIN patients p ON pa.patient_id = p.patient_id
                LEFT JOIN patient_guardian pg
                    ON pg.guardian_id = (
                        SELECT MAX(g2.guardian_id)
                        FROM patient_guardian g2
                        WHERE g2.patient_id = p.patient_id
                    )
                LEFT JOIN patient_emergency_contact pec
                    ON pec.contact_id = (
                        SELECT MAX(c2.contact_id)
                        FROM patient_emergency_contact c2
                        WHERE c2.patient_id = p.patient_id
                    )
                WHERE pa.admission_id = :admission_id
                LIMIT 1
            ";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':admission_id', (int)$admissionId, PDO::PARAM_INT);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$row) {
                echo json_encode(['success' => false, 'message' => 'Admission not found']);
                return;
            }

            echo json_encode(['success' => true, 'data' => $row]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function transferRoom($payload)
    {
        try {
            $this->conn->beginTransaction();

            $admissionId = (int)($payload['admission_id'] ?? 0);
            $newRoomId = (int)($payload['new_room_id'] ?? 0);
            $transferDate = $payload['transfer_date'] ?? date('Y-m-d');
            $nurseId = (int)($payload['nurse_id'] ?? 0);

            if ($admissionId <= 0 || $newRoomId <= 0) {
                $this->conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Invalid admission or room.']);
                return;
            }

            // Get current active room stay for this admission
            $stmt = $this->conn->prepare("SELECT rs.room_id FROM tbl_room_stay rs WHERE rs.admission_id = :admission_id AND rs.end_date IS NULL LIMIT 1");
            $stmt->execute([':admission_id' => $admissionId]);
            $currentStay = $stmt->fetch(PDO::FETCH_ASSOC);
            $currentRoomId = (int)($currentStay['room_id'] ?? 0);

            if ($currentRoomId === $newRoomId) {
                $this->conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Patient is already in the selected room.']);
                return;
            }

            // Validate new room capacity
            $stmt = $this->conn->prepare("SELECT max_occupancy FROM tbl_room WHERE room_id = :room_id");
            $stmt->execute([':room_id' => $newRoomId]);
            $roomRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$roomRow) {
                $this->conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Selected room not found.']);
                return;
            }
            $maxOcc = (int)$roomRow['max_occupancy'];

            $stmt = $this->conn->prepare("SELECT COUNT(*) AS current_occupancy FROM tbl_room_stay WHERE room_id = :room_id AND end_date IS NULL");
            $stmt->execute([':room_id' => $newRoomId]);
            $currOcc = (int)($stmt->fetch(PDO::FETCH_ASSOC)['current_occupancy'] ?? 0);

            if ($currOcc >= $maxOcc) {
                $this->conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Selected room is full.']);
                return;
            }

            // Close any current active stay
            if ($currentRoomId > 0) {
                $stmt = $this->conn->prepare("UPDATE tbl_room_stay SET end_date = :end_date WHERE admission_id = :admission_id AND end_date IS NULL");
                $stmt->execute([':end_date' => $transferDate . ' 00:00:00', ':admission_id' => $admissionId]);
            }

            // Create new stay
            $stmt = $this->conn->prepare("INSERT INTO tbl_room_stay (admission_id, room_id, start_date, assigned_by) VALUES (:admission_id, :room_id, :start_date, :assigned_by)");
            $stmt->execute([
                ':admission_id' => $admissionId,
                ':room_id' => $newRoomId,
                ':start_date' => $transferDate . ' 00:00:00',
                ':assigned_by' => $nurseId
            ]);

            $this->conn->commit();
            echo json_encode(['success' => true, 'message' => 'Room transferred successfully']);
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
        }
    }

    function getRoomStaysByAdmission($admissionId)
    {
        try {
            $sql = "
                SELECT rs.room_id, r.room_number, rt.room_type_name, rs.start_date, rs.end_date
                FROM tbl_room_stay rs
                JOIN tbl_room r ON r.room_id = rs.room_id
                JOIN tbl_room_type rt ON rt.room_type_id = r.room_type_id
                WHERE rs.admission_id = :admission_id
                ORDER BY rs.start_date DESC
            ";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':admission_id' => (int)$admissionId]);
            echo json_encode(['success' => true, 'stays' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage(), 'stays' => []]);
        }
    }

    function getRecentRoomStays($limit = 20)
    {
        try {
            $sql = "
                SELECT pa.admission_id, p.first_name, p.last_name, r.room_number, rt.room_type_name, rs.start_date, rs.end_date
                FROM tbl_room_stay rs
                JOIN patient_admission pa ON pa.admission_id = rs.admission_id
                JOIN patients p ON p.patient_id = pa.patient_id
                JOIN tbl_room r ON r.room_id = rs.room_id
                JOIN tbl_room_type rt ON rt.room_type_id = r.room_type_id
                ORDER BY rs.start_date DESC
                LIMIT :lim
            ";
            $stmt = $this->conn->prepare($sql);
            $lim = (int)$limit;
            $stmt->bindParam(':lim', $lim, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode(['success' => true, 'stays' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage(), 'stays' => []]);
        }
    }

    // Simple room change request store (doctor->nurse)
    function listRoomChangeRequests()
    {
        try {
            $this->conn->exec("CREATE TABLE IF NOT EXISTS doctor_room_request (
                request_id INT AUTO_INCREMENT PRIMARY KEY,
                admission_id INT NOT NULL,
                requested_room_id INT NOT NULL,
                doctor_id INT NULL,
                reason TEXT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $sql = "SELECT drr.request_id, drr.admission_id, drr.requested_room_id, drr.reason, drr.status, drr.created_at,
                        r.room_number AS requested_room,
                        pa.admission_date,
                        CONCAT(p.first_name,' ',COALESCE(p.last_name,'')) AS patient_name,
                        (
                          SELECT r2.room_number FROM tbl_room_stay rs2 
                          JOIN tbl_room r2 ON r2.room_id = rs2.room_id 
                          WHERE rs2.admission_id = pa.admission_id AND rs2.end_date IS NULL LIMIT 1
                        ) AS current_room
                    FROM doctor_room_request drr
                    JOIN patient_admission pa ON pa.admission_id = drr.admission_id
                    JOIN patients p ON p.patient_id = pa.patient_id
                    JOIN tbl_room r ON r.room_id = drr.requested_room_id
                    WHERE drr.status = 'pending'
                    ORDER BY drr.created_at DESC";
            $stmt = $this->conn->query($sql);
            echo json_encode(['success' => true, 'requests' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage(), 'requests' => []]);
        }
    }

    function createRoomChangeRequest($data)
    {
        try {
            $stmt = $this->conn->prepare("INSERT INTO doctor_room_request (admission_id, requested_room_id, doctor_id, reason) VALUES (:admission_id, :room_id, :doctor_id, :reason)");
            $stmt->execute([
                ':admission_id' => (int)($data['admission_id'] ?? 0),
                ':room_id' => (int)($data['requested_room_id'] ?? 0),
                ':doctor_id' => (int)($data['doctor_id'] ?? 0),
                ':reason' => $data['reason'] ?? null,
            ]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function approveRoomChangeRequest($data)
    {
        try {
            $this->conn->beginTransaction();
            $reqId = (int)($data['request_id'] ?? 0);
            $stmt = $this->conn->prepare("SELECT * FROM doctor_room_request WHERE request_id = :id AND status = 'pending' LIMIT 1");
            $stmt->execute([':id' => $reqId]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$req) {
                $this->conn->rollBack();
                echo json_encode(['success' => false, 'message' => 'Request not found']);
                return;
            }

            // Transfer using existing logic
            $this->transferRoom([
                'admission_id' => $req['admission_id'],
                'new_room_id' => $req['requested_room_id'],
                'transfer_date' => date('Y-m-d'),
                'nurse_id' => $data['nurse_id'] ?? 0
            ]);

            // Mark approved
            $up = $this->conn->prepare("UPDATE doctor_room_request SET status='approved' WHERE request_id=:id");
            $up->execute([':id' => $reqId]);
            $this->conn->commit();
        } catch (PDOException $e) {
            $this->conn->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function rejectRoomChangeRequest($data)
    {
        try {
            $stmt = $this->conn->prepare("UPDATE doctor_room_request SET status='rejected', reason = CONCAT(COALESCE(reason,''),' | Reject: ', :reason) WHERE request_id = :id");
            $stmt->execute([':id' => (int)($data['request_id'] ?? 0), ':reason' => $data['reason'] ?? '']);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
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
    case 'getRooms':
        $admissions->getRooms();
        break;
    case 'updateAdmission':
        $admissions->updateAdmission($data);
        break;
    case 'getAdmissionDetails':
        $admissions->getAdmissionDetails($admissionId);
        break;
    case 'transferRoom':
        $admissions->transferRoom($payload ?? []);
        break;
    case 'getRoomStaysByAdmission':
        $admissions->getRoomStaysByAdmission($admissionId);
        break;
    case 'getRecentRoomStays':
        $admissions->getRecentRoomStays(20);
        break;
    case 'listRoomChangeRequests':
        $admissions->listRoomChangeRequests();
        break;
    case 'createRoomChangeRequest':
        $admissions->createRoomChangeRequest($data);
        break;
    case 'approveRoomChangeRequest':
        $admissions->approveRoomChangeRequest($data);
        break;
    case 'rejectRoomChangeRequest':
        $admissions->rejectRoomChangeRequest($data);
        break;
}

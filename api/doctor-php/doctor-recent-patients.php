<?php
require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

class DoctorRecentPatients
{
    function getRecentPatients()
    {
        include __DIR__ . '/../connection-pdo.php';
        try {
            $doctorId = (int)$_SESSION['user_id'];

            $sql = "
                SELECT 
                    pa.admission_id,
                    pa.patient_id,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, '')) AS patient_name,
                    pa.admission_date,
                    pa.status,
                    pa.admission_reason,
                    COALESCE(r.room_number, 'Not assigned') AS room_number
                FROM patient_admission pa
                JOIN patients p ON pa.patient_id = p.patient_id
                LEFT JOIN tbl_room_stay rs 
                    ON pa.admission_id = rs.admission_id AND rs.end_date IS NULL
                LEFT JOIN tbl_room r ON rs.room_id = r.room_id
                WHERE pa.doctor_id = :doctor_id
                ORDER BY pa.admission_date DESC
                LIMIT 10
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
            $stmt->execute();

            $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $patients
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';

    $doctorPatients = new DoctorRecentPatients();

    switch ($operation) {
        case 'getRecentPatients':
            $doctorPatients->getRecentPatients();
            break;
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Invalid operation'
            ]);
            break;
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
}

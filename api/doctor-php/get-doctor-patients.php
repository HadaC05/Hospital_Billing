<?php
require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');


class DoctorPatients
{
    function getDoctorAdmissions()
    {
        include '../connection-pdo.php';
        try {

            $doctorId = (int)$_SESSION['user_id'];

            // Fetch page data
            $sql = "
                SELECT DISTINCT 
                    pa.admission_id, 
                    pa.patient_id,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, '')) AS patient_name,
                    pa.admission_date, 
                    pa.discharge_date, 
                    pa.admission_reason,
                    pa.status,
                    COALESCE(r.room_number, 'Not assigned') AS room_number
                FROM patient_admission pa
                JOIN patients p ON pa.patient_id = p.patient_id
                LEFT JOIN tbl_room_stay rs 
                    ON pa.admission_id = rs.admission_id AND rs.end_date IS NULL
                LEFT JOIN tbl_room r ON rs.room_id = r.room_id
                WHERE pa.doctor_id = :doctor_id
                ORDER BY pa.admission_date DESC
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
            $stmt->execute();

            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $rows ?: []
            ]);
        } catch (PDOException $e) {

            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
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
}

$patients = new DoctorPatients();

switch ($operation) {
    case 'getDoctorAdmissions':
        $patients->getDoctorAdmissions();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}

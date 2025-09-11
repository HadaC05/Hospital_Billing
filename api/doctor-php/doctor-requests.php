<?php

require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class DoctorRequestAPI
{

    private $pdo;

    public function __construct()
    {
        include __DIR__ . '/../connection-pdo.php';
        $this->pdo = $pdo;
    }

    public function getRequests()
    {
        try {

            $doctorId = (int)$_SESSION['user_id'];

            // Get requests
            $sql = "
                SELECT 
                    dr.request_id,
                    dr.request_type,
                    dr.quantity,
                    dr.notes,
                    dr.status,
                    dr.request_date,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, '')) AS patient_name,
                    u.username AS doctor_name,
                    CASE 
                        WHEN dr.request_type = 'medicine' THEN m.med_name
                        WHEN dr.request_type = 'labtest' THEN lt.test_name
                    END AS item_name
                FROM doctor_requests dr
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN users u ON dr.doctor_id = u.user_id
                LEFT JOIN tbl_medicine m ON dr.request_type = 'medicine' AND dr.item_id = m.med_id
                LEFT JOIN tbl_labtest lt ON dr.request_type = 'labtest' AND dr.item_id = lt.labtest_id
                WHERE dr.doctor_id = :doctor_id
                ORDER BY dr.request_date DESC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':doctor_id' => $doctorId]);

            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'requests' => $requests,
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get requests: ' . $e->getMessage()
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
$api = new DoctorRequestAPI();

switch ($operation) {
    case 'getRequests':
        $api->getRequests();
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

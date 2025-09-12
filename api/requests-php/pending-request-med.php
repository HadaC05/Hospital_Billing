<?php

require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class Pending_Requests
{
    private $pdo;

    public function __construct()
    {
        include __DIR__ . '/../connection-pdo.php';
        $this->pdo = $pdo;
    }

    public function getPendingRequests()
    {
        try {

            // Get requests
            $sql = "
                SELECT 
                    dr.request_id,
                    dr.request_date,
                    CONCAT(d.first_name, ' ', COALESCE(d.middle_name, ''), ' ', d.last_name, ' ', COALESCE(d.suffix, '')) AS doctor_name,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, '')) AS patient_name,
                    m.med_name,
                    mu.unit_name,
                    dr.quantity,
                    dr.notes
                FROM doctor_requests dr
                JOIN user_doctor d ON dr.doctor_id = d.doctor_id
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN tbl_medicine m ON dr.item_id = m.med_id
                JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                WHERE dr.svc_type_id = 4
                AND dr.status = 'pending'
                ORDER BY dr.request_date DESC;
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();

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

    public function approveRequest($requestId, $approvedBy)
    {
        try {
            $sql = "
                UPDATE doctor_requests 
                SET status = 'approved',
                    approved_by = :approved_by,
                    approved_date = NOW() 
                WHERE request_id = :id
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':id' => $requestId,
                ':approved_by' => $approvedBy
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Request approved successfully.'
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to approve request: ' . $e->getMessage()
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
$request = new Pending_Requests();

switch ($operation) {
    case 'getPendingRequests':
        $request->getPendingRequests();
        break;
    case 'approveRequest':
        $requestId = $payload['request_id'] ?? null;

        $approvedBy = $_SESSION['user_id'] ?? null;

        if ($requestId && $approvedBy) {
            $request->approveRequest($requestId, $approvedBy);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing request ID']);
        }
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

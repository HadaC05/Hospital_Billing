<?php

require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class Doctor_Request
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

    public function createRequest($data)
    {
        try {
            $this->pdo->beginTransaction();

            $doctorId = $data['doctor_id'] ?? null;
            $patientId = $data['patient_id'] ?? null;
            $requestType = $data['request_type'] ?? null;
            $itemId = $data['item_id'] ?? null;
            $quantity = $data['quantity'] ?? 1;
            $notes = $data['notes'] ?? null;

            // Validation
            if (!$doctorId || !$patientId || !$requestType || !$itemId) {
                throw new Exception('Missing required fields');
            }

            if (!in_array($requestType, ['medicine', 'labtest'])) {
                throw new Exception('Invalid request type');
            }

            // Determine which item table to use
            if ($requestType === 'medicine') {
                $itemTable = 'tbl_medicine';
                $itemIdField = 'med_id';
            } elseif ($requestType === 'labtest') {
                $itemTable = 'tbl_labtest';
                $itemIdField = 'labtest_id';
            } else {
                $itemTable = null;
                $itemIdField = null;
            }

            // If item table exists, validate item
            if ($itemTable) {
                $checkSql = "
                    SELECT 1 FROM $itemTable 
                    WHERE $itemIdField = :item_id AND is_active = 1
                ";
                $checkStmt = $this->pdo->prepare($checkSql);
                $checkStmt->execute([':item_id' => $itemId]);
                if (!$checkStmt->fetch()) {
                    throw new Exception('Invalid item selected');
                }
            }

            // Insert request
            $sql = "
                INSERT INTO doctor_requests 
                (doctor_id, patient_id, request_type, item_id, quantity, notes, status, request_date)
                VALUES (:doctor_id, :patient_id, :request_type, :item_id, :quantity, :notes, 'pending', NOW())
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':doctor_id' => $doctorId,
                ':patient_id' => $patientId,
                ':request_type' => $requestType,
                ':item_id' => $itemId,
                ':quantity' => $quantity,
                ':notes' => $notes
            ]);

            $requestId = $this->pdo->lastInsertId();
            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Request created successfully',
                'request_id' => $requestId
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function getServiceTypes()
    {
        try {
            // Return the available request types
            $types = [
                ['id' => 'medicine', 'name' => 'Medication'],
                ['id' => 'labtest', 'name' => 'Lab Test']
            ];

            echo json_encode([
                'success' => true,
                'service_types' => $types
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to fetch service types: ' . $e->getMessage()
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
$request = new Doctor_Request();

switch ($operation) {
    case 'getRequests':
        $request->getRequests();
        break;
    case 'createRequest':
        $request->createRequest($data);
        break;
    case 'getServiceTypes':
        $request->getServiceTypes();
        break;

    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

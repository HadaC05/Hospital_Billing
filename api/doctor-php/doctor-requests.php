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
                    dr.svc_type_id,
                    st.svc_name,
                    dr.quantity,
                    dr.notes,
                    dr.status,
                    dr.request_date,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, '')) AS patient_name,
                    u.username AS doctor_name,
                    CASE 
                        WHEN st.svc_name = 'Medication' THEN m.med_name
                        WHEN st.svc_name = 'Lab Test' THEN lt.test_name
                    END AS item_name
                FROM doctor_requests dr
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN users u ON dr.doctor_id = u.user_id
                JOIN tbl_service_type st ON dr.svc_type_id = st.svc_type_id
                LEFT JOIN tbl_medicine m ON st.svc_name = 'Medication' AND dr.item_id = m.med_id
                LEFT JOIN tbl_labtest lt ON st.svc_name = 'Lab Test' AND dr.item_id = lt.labtest_id
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
            $svcTypeId = $data['svc_type_id'] ?? null;
            $itemId = $data['item_id'] ?? null;
            $quantity = $data['quantity'] ?? 1;
            $notes = $data['notes'] ?? null;

            // Validation
            if (!$doctorId || !$patientId || !$svcTypeId || !$itemId) {
                throw new Exception('Missing required fields');
            }

            // Fetch service type name from tbl_service_type 
            $svcStmt = $this->pdo->prepare("SELECT name FROM tbl_service_type WHERE id = :id");
            $svcStmt->execute([':id' => $svcTypeId]);
            $svcRow = $svcStmt->fetch(PDO::FETCH_ASSOC);

            if (!$svcRow) {
                throw new Exception('Invalid service type selected');
            }

            $svcTypeName = strtolower($svcRow['svc_name']);

            // Determine which item table to use
            if ($svcTypeName === 'medication') {
                $itemTable = 'tbl_medicine';
                $itemIdField = 'med_id';
            } elseif ($svcTypeName === 'lab test') {
                $itemTable = 'tbl_labtest';
                $itemIdField = 'labtest_id';
            } else {
                $itemTable = null;
                $itemIdField = null;
            }

            // If item table exists, validate item
            if ($itemTable) {
                $checkSql = "SELECT 1 FROM $itemTable WHERE $itemIdField = :item_id AND is_active = 1";
                $checkStmt = $this->pdo->prepare($checkSql);
                $checkStmt->execute([':item_id' => $itemId]);
                if (!$checkStmt->fetch()) {
                    throw new Exception('Invalid item selected');
                }
            }

            // Insert request
            $sql = "
                INSERT INTO doctor_requests 
                (doctor_id, patient_id, svc_type_id, item_id, quantity, notes, status, request_date)
                VALUES (:doctor_id, :patient_id, :svc_type_id, :item_id, :quantity, :notes, 'pending', NOW())
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':doctor_id' => $doctorId,
                ':patient_id' => $patientId,
                ':svc_type_id' => $svcTypeId,
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
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

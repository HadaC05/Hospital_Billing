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

    public function getRequests($patientId = null)
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
            ";

            if ($patientId) {
                $sql .= " AND dr.patient_id = :patient_id";
            }

            $sql .= " ORDER BY dr.request_date DESC";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);

            if ($patientId) {
                $stmt->bindValue(':patient_id', $patientId, PDO::PARAM_INT);
            }

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

    public function createBatchRequests($data)
    {
        try {
            $this->pdo->beginTransaction();

            $doctorId = $data['doctor_id'] ?? null;
            $patientId = $data['patient_id'] ?? null;
            $requests = $data['requests'] ?? [];

            // Validation
            if (!$doctorId || !$patientId || empty($requests)) {
                throw new Exception('Missing required fields');
            }

            $requestIds = [];

            foreach ($requests as $request) {
                $svcTypeId = $request['svc_type_id'] ?? null;
                $itemId = $request['item_id'] ?? null;
                $quantity = $request['quantity'] ?? 1;
                $notes = $request['notes'] ?? null;

                // Validation for each request
                if (!$svcTypeId || !$itemId) {
                    throw new Exception('Missing required fields in one of the requests');
                }

                // Fetch service type name from tbl_service_type 
                $svcStmt = $this->pdo->prepare("SELECT svc_name FROM tbl_service_type WHERE svc_type_id = :svc_type_id");
                $svcStmt->execute([':svc_type_id' => $svcTypeId]);
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
                    // For other service types, we'll skip validation for now
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

                $requestIds[] = $this->pdo->lastInsertId();
            }

            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Requests created successfully',
                'request_ids' => $requestIds
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function cancelRequest($data)
    {
        try {
            $requestId = $data['request_id'] ?? null;
            $doctorId = (int)$_SESSION['user_id'];

            if (!$requestId) {
                throw new Exception('Missing request ID');
            }

            // Verify the request belongs to this doctor
            $checkSql = "
                SELECT 1 FROM doctor_requests 
                WHERE request_id = :request_id AND doctor_id = :doctor_id
            ";
            $checkStmt = $this->pdo->prepare($checkSql);
            $checkStmt->execute([
                ':request_id' => $requestId,
                ':doctor_id' => $doctorId
            ]);

            if (!$checkStmt->fetch()) {
                throw new Exception('Request not found or not authorized');
            }

            // Update request status to cancelled
            $updateSql = "
                UPDATE doctor_requests 
                SET status = 'cancelled', cancelled_date = NOW() 
                WHERE request_id = :request_id
            ";
            $updateStmt = $this->pdo->prepare($updateSql);
            $updateStmt->execute([':request_id' => $requestId]);

            echo json_encode([
                'success' => true,
                'message' => 'Request cancelled successfully'
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function getServiceTypes()
    {
        try {
            $sql = "
                SELECT svc_type_id, svc_name 
                FROM tbl_service_type 
                WHERE svc_name IN ('Medication', 'Lab Test', 'Surgery', 'Treatment', 'Room')
                ORDER BY svc_type_id ASC";
            $stmt = $this->pdo->query($sql);
            $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

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
        $patientId = $_GET['patient_id'] ?? null;
        $request->getRequests($patientId);
        break;
    case 'createBatchRequests':
        $request->createBatchRequests($data);
        break;
    case 'cancelRequest':
        $request->cancelRequest($data);
        break;
    case 'getServiceTypes':
        $request->getServiceTypes();
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

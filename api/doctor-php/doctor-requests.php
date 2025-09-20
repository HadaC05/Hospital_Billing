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

            // Get medicine requests from new batch system
            $medicineSql = "
                SELECT 
                    rmb.batch_id as request_id,
                    'Medication' as svc_name,
                    GROUP_CONCAT(m.med_name, ' (', rmi.quantity, ')') as item_name,
                    rmb.request_date,
                    rmb.status,
                    'medicine_batch' as request_type
                FROM request_medicine_batch rmb
                JOIN request_medicine_items rmi ON rmb.batch_id = rmi.batch_id
                JOIN tbl_medicine m ON rmi.med_id = m.med_id
                WHERE rmb.doctor_id = :doctor_id
            ";

            if ($patientId) {
                $medicineSql .= " AND rmb.patient_id = :patient_id";
            }

            $medicineSql .= " GROUP BY rmb.batch_id ORDER BY rmb.request_date DESC";

            // Get other requests from old system
            $otherSql = "
                SELECT 
                    dr.request_id,
                    st.svc_name,
                    CASE 
                        WHEN st.svc_name = 'Lab Test' THEN lt.test_name
                        ELSE dr.item_name
                    END as item_name,
                    dr.request_date,
                    dr.status,
                    dr.request_type
                FROM doctor_requests dr
                JOIN tbl_service_type st ON dr.svc_type_id = st.svc_type_id
                LEFT JOIN tbl_labtest lt ON st.svc_name = 'Lab Test' AND dr.item_id = lt.labtest_id
                WHERE dr.doctor_id = :doctor_id AND dr.request_type != 'medicine'
            ";

            if ($patientId) {
                $otherSql .= " AND dr.patient_id = :patient_id";
            }

            $otherSql .= " ORDER BY dr.request_date DESC";

            // Execute both queries
            $stmt = $this->pdo->prepare($medicineSql);
            $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);

            if ($patientId) {
                $stmt->bindValue(':patient_id', $patientId, PDO::PARAM_INT);
            }

            $stmt->execute();
            $medicineRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmt = $this->pdo->prepare($otherSql);
            $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);

            if ($patientId) {
                $stmt->bindValue(':patient_id', $patientId, PDO::PARAM_INT);
            }

            $stmt->execute();
            $otherRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Combine results
            $requests = array_merge($medicineRequests, $otherRequests);

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

            // Get active admission for the patient
            $admissionSql = "
                SELECT admission_id FROM patient_admission 
                WHERE patient_id = :patient_id AND doctor_id = :doctor_id AND status = 'active'
                ORDER BY admission_date DESC LIMIT 1
            ";
            $stmt = $this->pdo->prepare($admissionSql);
            $stmt->execute([
                ':patient_id' => $patientId,
                ':doctor_id' => $doctorId
            ]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$admission) {
                throw new Exception('No active admission found for this patient');
            }

            $admissionId = $admission['admission_id'];

            // Create batch record
            $batchSql = "
                INSERT INTO request_medicine_batch 
                (doctor_id, patient_id, admission_id, request_date, status, notes)
                VALUES (:doctor_id, :patient_id, :admission_id, NOW(), 'pending', :notes)
            ";
            $stmt = $this->pdo->prepare($batchSql);
            $stmt->execute([
                ':doctor_id' => $doctorId,
                ':patient_id' => $patientId,
                ':admission_id' => $admissionId,
                ':notes' => $data['batch_notes'] ?? null
            ]);

            $batchId = $this->pdo->lastInsertId();
            $requestIds = [];

            // Process each request in the batch
            foreach ($requests as $request) {
                $svcTypeId = $request['svc_type_id'] ?? null;
                $itemId = $request['item_id'] ?? null;
                $quantity = $request['quantity'] ?? 1;
                $notes = $request['notes'] ?? null;

                // Only process medication requests in batch
                if ($svcTypeId != 4) { // 4 is Medication
                    continue;
                }

                // Validate medicine
                $checkSql = "SELECT 1 FROM tbl_medicine WHERE med_id = :item_id AND is_active = 1";
                $checkStmt = $this->pdo->prepare($checkSql);
                $checkStmt->execute([':item_id' => $itemId]);

                if (!$checkStmt->fetch()) {
                    throw new Exception('Invalid medicine selected');
                }

                // Insert item into batch
                $itemSql = "
                    INSERT INTO request_medicine_items 
                    (batch_id, med_id, quantity, notes, status)
                    VALUES (:batch_id, :med_id, :quantity, :notes, 'pending')
                ";
                $stmt = $this->pdo->prepare($itemSql);
                $stmt->execute([
                    ':batch_id' => $batchId,
                    ':med_id' => $itemId,
                    ':quantity' => $quantity,
                    ':notes' => $notes
                ]);

                $requestIds[] = $this->pdo->lastInsertId();
            }

            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Medicine batch created successfully',
                'batch_id' => $batchId,
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

            // Check if it's a medicine batch request
            $checkSql = "
                SELECT rmb.batch_id 
                FROM request_medicine_batch rmb
                WHERE rmb.batch_id = :request_id AND rmb.doctor_id = :doctor_id
            ";
            $stmt = $this->pdo->prepare($checkSql);
            $stmt->execute([
                ':request_id' => $requestId,
                ':doctor_id' => $doctorId
            ]);

            if ($stmt->fetch()) {
                // Cancel the entire medicine batch
                $updateSql = "
                    UPDATE request_medicine_batch 
                    SET status = 'cancelled' 
                    WHERE batch_id = :request_id
                ";
                $stmt = $this->pdo->prepare($updateSql);
                $stmt->execute([':request_id' => $requestId]);

                // Also cancel all items in the batch
                $updateItemsSql = "
                    UPDATE request_medicine_items 
                    SET status = 'cancelled' 
                    WHERE batch_id = :request_id
                ";
                $stmt = $this->pdo->prepare($updateItemsSql);
                $stmt->execute([':request_id' => $requestId]);
            } else {
                // Handle old request system
                $checkSql = "
                    SELECT 1 FROM doctor_requests 
                    WHERE request_id = :request_id AND doctor_id = :doctor_id
                ";
                $stmt = $this->pdo->prepare($checkSql);
                $stmt->execute([
                    ':request_id' => $requestId,
                    ':doctor_id' => $doctorId
                ]);

                if (!$stmt->fetch()) {
                    throw new Exception('Request not found or not authorized');
                }

                // Update request status to cancelled
                $updateSql = "
                    UPDATE doctor_requests 
                    SET status = 'cancelled', cancelled_date = NOW() 
                    WHERE request_id = :request_id
                ";
                $stmt = $this->pdo->prepare($updateSql);
                $stmt->execute([':request_id' => $requestId]);
            }

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

    public function getBatchDetails($batchId)
    {
        try {
            $doctorId = (int)$_SESSION['user_id'];

            // Get batch details
            $batchSql = "
                SELECT rmb.*, 
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) AS patient_name,
                    CONCAT(u.first_name, ' ', COALESCE(u.middle_name, ''), ' ', u.last_name) AS doctor_name
                FROM request_medicine_batch rmb
                JOIN patients p ON rmb.patient_id = p.patient_id
                JOIN users u ON rmb.doctor_id = u.user_id
                WHERE rmb.batch_id = :batch_id AND rmb.doctor_id = :doctor_id
            ";

            $stmt = $this->pdo->prepare($batchSql);
            $stmt->execute([
                ':batch_id' => $batchId,
                ':doctor_id' => $doctorId
            ]);

            $batch = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$batch) {
                throw new Exception('Batch not found or access denied');
            }

            // Get batch items
            $itemsSql = "
                SELECT rmi.*, m.med_name
                FROM request_medicine_items rmi
                JOIN tbl_medicine m ON rmi.med_id = m.med_id
                WHERE rmi.batch_id = :batch_id
                ORDER BY rmi.item_id
            ";

            $stmt = $this->pdo->prepare($itemsSql);
            $stmt->execute([':batch_id' => $batchId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'batch' => $batch,
                'items' => $items
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get batch details: ' . $e->getMessage()
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
    case 'getBatchDetails':
        if ($batchId) {
            $batch->getBatchDetails($batchId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing batch ID']);
        }
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

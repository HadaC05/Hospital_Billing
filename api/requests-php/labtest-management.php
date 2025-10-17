<?php
require_once __DIR__ . '/../require_auth.php';
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class Labtest_Management
{
    private $pdo;

    public function __construct()
    {
        include __DIR__ . '/../connection-pdo.php';
        $this->pdo = $pdo;
    }

    private function getCurrentAdmission($patientId)
    {
        $sql = "SELECT admission_id FROM patient_admission 
            WHERE patient_id = :patient_id AND status = 'active' 
            ORDER BY admission_date DESC LIMIT 1";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':patient_id' => $patientId]);
        return $stmt->fetchColumn();
    }

    // Update batch status based on items
    private function updateBatchStatus($batchId)
    {
        // Get all item statuses for this batch
        $sql = "
            SELECT status FROM request_labtest_items 
            WHERE batch_id = :batch_id
        ";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':batch_id' => $batchId]);
        $statuses = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!$statuses) return;

        $allStatuses = array_unique($statuses);
        $newStatus = 'pending';

        // Determine new batch status based on item statuses
        if (count($allStatuses) === 1) {
            // All items have the same status
            $newStatus = $allStatuses[0];
        } elseif (in_array('pending', $allStatuses)) {
            // Some items are still pending
            if (in_array('in_progress', $allStatuses) || in_array('completed', $allStatuses)) {
                $newStatus = 'in_progress';
            } else {
                $newStatus = 'pending';
            }
        } elseif (in_array('in_progress', $allStatuses)) {
            // Some items are in progress
            if (in_array('completed', $allStatuses)) {
                $newStatus = 'in_progress';
            } else {
                $newStatus = 'in_progress';
            }
        } elseif (in_array('completed', $allStatuses)) {
            $newStatus = 'completed';
        }

        // Update the batch status
        $update = "
            UPDATE request_labtest_batch 
            SET status = :status 
            WHERE batch_id = :batch_id
        ";
        $stmt = $this->pdo->prepare($update);
        $stmt->execute([
            ':status' => $newStatus,
            ':batch_id' => $batchId
        ]);
    }

    // Load lab test requests
    public function getLabTestRequests($admissionId = null)
    {
        try {
            $sql = "
                SELECT 
                    rlb.batch_id,
                    rlb.request_date,
                    rlb.status as batch_status,
                    p.patient_id,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name) AS patient_name,
                    CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name,''), ' ', ud.last_name) AS doctor_name,
                    COUNT(rli.item_id) as item_count,
                    SUM(CASE WHEN rli.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    SUM(CASE WHEN rli.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
                    SUM(CASE WHEN rli.status = 'completed' THEN 1 ELSE 0 END) as completed_count
                FROM request_labtest_batch rlb
                JOIN request_labtest_items rli ON rlb.batch_id = rli.batch_id
                JOIN patients p ON rlb.patient_id = p.patient_id
                JOIN user_doctor ud ON rlb.doctor_id = ud.user_id
                WHERE 1=1
            ";

            if ($admissionId) {
                $sql .= " AND rlb.admission_id = :admission_id";
            }

            $sql .= " GROUP BY rlb.batch_id ORDER BY rlb.request_date DESC";

            $stmt = $this->pdo->prepare($sql);
            if ($admissionId) {
                $stmt->bindValue(':admission_id', $admissionId, PDO::PARAM_INT);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'batches' => $rows
            ]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // Start lab tests
    public function startLabTests($data)
    {
        try {
            $items = $data['items'] ?? [];
            $technicianId = $_SESSION['user_id'] ?? null;
            $admissionId = $data['admission_id'] ?? null;

            if (empty($items)) throw new Exception('No lab test items selected');
            if (!$technicianId) throw new Exception('User not authenticated');

            $this->pdo->beginTransaction();

            $batchIds = [];

            foreach ($items as $item) {
                $itemId = $item['item_id'];

                // Get current item
                $sql = "
                    SELECT * FROM request_labtest_items 
                    WHERE item_id = :item_id
                ";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([':item_id' => $itemId]);
                $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$currentItem) {
                    throw new Exception("Item not found: $itemId");
                }

                if ($currentItem['status'] !== 'pending') {
                    throw new Exception("Item $itemId is not in pending status");
                }

                $batchId = $currentItem['batch_id'];
                if (!in_array($batchId, $batchIds)) {
                    $batchIds[] = $batchId;
                }

                // Update the item status to in_progress
                $updateSql = "
                    UPDATE request_labtest_items 
                    SET status = 'in_progress', processed_by = :technician_id, processed_date = NOW() 
                    WHERE item_id = :item_id
                ";
                $stmt = $this->pdo->prepare($updateSql);
                $stmt->execute([
                    ':item_id' => $itemId,
                    ':technician_id' => $technicianId
                ]);
            }

            // Update batch admission_ids if needed
            if (!empty($batchIds) && $admissionId) {
                $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
                $updateBatch = "
                    UPDATE request_labtest_batch 
                    SET admission_id = ? 
                    WHERE batch_id IN ($placeholders)";
                $updateStmt = $this->pdo->prepare($updateBatch);
                $updateStmt->execute(array_merge([$admissionId], $batchIds));
            }

            // Update each batch status
            foreach ($batchIds as $batchId) {
                $this->updateBatchStatus($batchId);
            }

            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Lab tests started successfully'
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Error in startLabTests: " . $e->getMessage());
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    // Complete lab tests
    public function completeLabTests($data)
    {
        try {
            $items = $data['items'] ?? [];
            $technicianId = $_SESSION['user_id'];
            $admissionId = $data['admission_id'] ?? null;

            if (empty($items)) throw new Exception('No lab test items selected');

            $this->pdo->beginTransaction();

            $batchIds = [];

            foreach ($items as $item) {
                $itemId = $item['item_id'];

                // Get current item
                $sql = "
                    SELECT * FROM request_labtest_items WHERE item_id = :item_id
                ";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([':item_id' => $itemId]);
                $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$currentItem) {
                    throw new Exception("Item not found: $itemId");
                }

                if ($currentItem['status'] !== 'in_progress') {
                    throw new Exception("Item $itemId is not in progress status");
                }

                $batchId = $currentItem['batch_id'];
                if (!in_array($batchId, $batchIds)) {
                    $batchIds[] = $batchId;
                }

                // Update the item status to completed and mark for billing
                $updateSql = "
                    UPDATE request_labtest_items 
                    SET status = 'completed', completed_by = :technician_id, completed_date = NOW(), billed_status = 'no'
                    WHERE item_id = :item_id
                ";
                $stmt = $this->pdo->prepare($updateSql);
                $stmt->execute([
                    ':item_id' => $itemId,
                    ':technician_id' => $technicianId
                ]);
            }

            // Update batch admission_ids if needed
            if (!empty($batchIds) && $admissionId) {
                $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
                $updateBatch = "
                    UPDATE request_labtest_batch SET admission_id = ? 
                    WHERE batch_id IN ($placeholders)
                ";
                $updateStmt = $this->pdo->prepare($updateBatch);
                $updateStmt->execute(array_merge([$admissionId], $batchIds));
            }

            // Update each batch status
            foreach ($batchIds as $batchId) {
                $this->updateBatchStatus($batchId);
            }

            $this->pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Lab tests completed successfully']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // ===== 4. Cancel lab tests =====
    public function cancelLabTests($data)
    {
        try {
            $items = $data['items'] ?? [];
            $technicianId = $_SESSION['user_id'];
            $admissionId = $data['admission_id'] ?? null;
            $reason = $data['reason'] ?? '';

            if (empty($items)) throw new Exception('No lab test items selected');

            $this->pdo->beginTransaction();

            $batchIds = [];

            foreach ($items as $item) {
                $itemId = $item['item_id'];

                // Get current item
                $sql = "
                    SELECT * FROM request_labtest_items 
                    WHERE item_id = :item_id
                ";
                $stmt = $this->pdo->prepare($sql);
                $stmt->execute([':item_id' => $itemId]);
                $currentItem = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$currentItem) {
                    throw new Exception("Item not found: $itemId");
                }

                if ($currentItem['status'] === 'completed') {
                    throw new Exception("Item $itemId is already completed and cannot be cancelled");
                }

                $batchId = $currentItem['batch_id'];
                if (!in_array($batchId, $batchIds)) {
                    $batchIds[] = $batchId;
                }

                // Update the item status to cancelled
                $updateSql = "
                    UPDATE request_labtest_items 
                    SET status = 'cancelled', cancelled_by = :technician_id, cancelled_date = NOW() 
                    WHERE item_id = :item_id
                ";
                $stmt = $this->pdo->prepare($updateSql);
                $stmt->execute([
                    ':item_id' => $itemId,
                    ':technician_id' => $technicianId
                ]);
            }

            // Update batch admission_ids if needed
            if (!empty($batchIds) && $admissionId) {
                $placeholders = implode(',', array_fill(0, count($batchIds), '?'));
                $updateBatch = "
                    UPDATE request_labtest_batch SET admission_id = ? WHERE batch_id IN ($placeholders)";
                $updateStmt = $this->pdo->prepare($updateBatch);
                $updateStmt->execute(array_merge([$admissionId], $batchIds));
            }

            // Update each batch status
            foreach ($batchIds as $batchId) {
                $this->updateBatchStatus($batchId);
            }

            // If all items in a batch are cancelled, update the batch cancellation details
            foreach ($batchIds as $batchId) {
                $checkSql = "
                    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled 
                    FROM request_labtest_items 
                    WHERE batch_id = :batch_id
                ";
                $stmt = $this->pdo->prepare($checkSql);
                $stmt->execute([':batch_id' => $batchId]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($result['total'] == $result['cancelled']) {
                    $updateBatchSql = "
                        UPDATE request_labtest_batch 
                        SET status = 'cancelled', cancelled_by = :technician_id, cancelled_date = NOW(), cancelled_reason = :reason
                        WHERE batch_id = :batch_id
                    ";
                    $stmt = $this->pdo->prepare($updateBatchSql);
                    $stmt->execute([
                        ':batch_id' => $batchId,
                        ':technician_id' => $technicianId,
                        ':reason' => $reason
                    ]);
                }
            }

            $this->pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Lab tests cancelled successfully']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // Get batch details
    public function getBatchDetails($batchId)
    {
        try {
            // Get batch details with patient and doctor information
            $batchSql = "
                SELECT 
                    rlb.batch_id,
                    rlb.request_date,
                    rlb.status as batch_status,
                    rlb.notes,
                    rlb.admission_id,
                    p.patient_id,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name) AS patient_name,
                    CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name,''), ' ', ud.last_name) AS doctor_name
                FROM request_labtest_batch rlb
                JOIN patients p ON rlb.patient_id = p.patient_id
                JOIN user_doctor ud ON rlb.doctor_id = ud.user_id
                WHERE rlb.batch_id = :batch_id
            ";
            $stmt = $this->pdo->prepare($batchSql);
            $stmt->execute([':batch_id' => $batchId]);
            $batch = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$batch) {
                throw new Exception('Batch not found');
            }

            // Get batch items with user information
            $itemsSql = "
                SELECT 
                    rli.item_id,
                    rli.status as item_status,
                    rli.processed_by,
                    rli.completed_by,
                    rli.billed_status,
                    rli.processed_date,
                    rli.completed_date,
                    lt.test_name,
                    CONCAT(COALESCE(processed_t.first_name, ''), ' ', COALESCE(processed_t.last_name, '')) AS processed_by_name,
                    CONCAT(COALESCE(completed_t.first_name, ''), ' ', COALESCE(completed_t.last_name, '')) AS completed_by_name
                FROM request_labtest_items rli
                JOIN tbl_labtest lt ON rli.labtest_id = lt.labtest_id
                LEFT JOIN user_lab_technician processed_t ON rli.processed_by = processed_t.user_id
                LEFT JOIN user_lab_technician completed_t ON rli.completed_by = completed_t.user_id
                WHERE rli.batch_id = :batch_id
                ORDER BY rli.item_id
            ";
            $stmt = $this->pdo->prepare($itemsSql);
            $stmt->execute([':batch_id' => $batchId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'batch' => $batch,
                'items' => $items
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // Get batch_id from item_id
    private function getBatchIdFromItem($itemId)
    {
        $sql = "SELECT batch_id FROM request_labtest_items WHERE item_id = :item_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':item_id' => $itemId]);
        return $stmt->fetchColumn();
    }
}

// Handle incoming requests
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
$request = new Labtest_Management();

switch ($operation) {
    case 'getLabTestRequests':
        $admissionId = $_GET['admission_id'] ?? null;
        $request->getLabTestRequests($admissionId);
        break;
    case 'startLabTests':
        $request->startLabTests($data);
        break;
    case 'completeLabTests':
        $request->completeLabTests($data);
        break;
    case 'cancelLabTests':
        $request->cancelLabTests($data);
        break;
    case 'getBatchDetails':
        $batchId = $_GET['batch_id'] ?? null;
        $request->getBatchDetails($batchId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}

<?php
require_once __DIR__ . '/../require_auth.php';
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class Medicine_Management
{
    private $pdo;

    public function __construct()
    {
        include __DIR__ . '/../connection-pdo.php';
        $this->pdo = $pdo;
    }

    // ===== Helper: Update batch status based on items =====
    private function updateBatchStatus($batchId)
    {
        // Get all item statuses for this batch
        $sql = "SELECT status FROM request_medicine_items WHERE batch_id = :batch_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':batch_id' => $batchId]);
        $statuses = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!$statuses) return;

        $allStatuses = array_unique($statuses);
        $newStatus = 'pending'; // Default status

        // Determine new batch status based on item statuses
        if (count($allStatuses) === 1) {
            // All items have the same status
            $newStatus = $allStatuses[0];
        } elseif (in_array('pending', $allStatuses)) {
            // Some items are still pending
            if (in_array('picked', $allStatuses) || in_array('administered', $allStatuses) || in_array('returned', $allStatuses)) {
                $newStatus = 'partially_dispensed';
            } else {
                $newStatus = 'pending';
            }
        } elseif (in_array('dispensed', $allStatuses)) {
            // All items are dispensed but none picked yet
            $newStatus = 'dispensed';
        } elseif (in_array('picked', $allStatuses)) {
            // All items are picked but none administered yet
            if (in_array('administered', $allStatuses) || in_array('returned', $allStatuses)) {
                $newStatus = 'partially_dispensed';
            } else {
                $newStatus = 'picked';
            }
        } elseif (in_array('administered', $allStatuses) || in_array('returned', $allStatuses) || in_array('returned_confirmed', $allStatuses)) {
            // All items are either administered or returned
            $newStatus = 'completed';
        }

        // Update the batch status
        $update = "UPDATE request_medicine_batch SET status = :status WHERE batch_id = :batch_id";
        $stmt = $this->pdo->prepare($update);
        $stmt->execute([
            ':status' => $newStatus,
            ':batch_id' => $batchId
        ]);
    }


    // ===== 1. Load dispensed medicines =====
    public function getDispensedMedicines($patientId = null)
    {
        try {
            $sql = "
            SELECT 
                rmb.batch_id,
                rmb.request_date,
                rmb.status as batch_status,
                p.patient_id,
                CONCAT(p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name) AS patient_name,
                CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name,''), ' ', ud.last_name) AS doctor_name,
                COUNT(rmi.item_id) as item_count,
                SUM(CASE WHEN rmi.status = 'dispensed' THEN 1 ELSE 0 END) as dispensed_count,
                SUM(CASE WHEN rmi.status = 'picked' THEN 1 ELSE 0 END) as picked_count,
                SUM(CASE WHEN rmi.status = 'administered' THEN 1 ELSE 0 END) as administered_count
            FROM request_medicine_batch rmb
            JOIN request_medicine_items rmi ON rmb.batch_id = rmi.batch_id
            JOIN patients p ON rmb.patient_id = p.patient_id
            JOIN user_doctor ud ON rmb.doctor_id = ud.user_id
        ";

            if ($patientId) {
                $sql .= " AND p.patient_id = :patient_id";
            }

            $sql .= " GROUP BY rmb.batch_id ORDER BY rmb.request_date DESC";

            $stmt = $this->pdo->prepare($sql);
            if ($patientId) {
                $stmt->bindValue(':patient_id', $patientId, PDO::PARAM_INT);
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

    // ===== 2. Confirm pickup =====
    public function confirmPickup($data)
    {
        try {
            $itemIds = $data['item_ids'] ?? [];
            $nurseId = $_SESSION['user_id'] ?? null;

            if (empty($itemIds)) throw new Exception('No medicine items selected');
            if (!$nurseId) throw new Exception('User not authenticated');

            $this->pdo->beginTransaction();

            $sql = "UPDATE request_medicine_items 
                SET status = 'picked', picked_by = :nurse_id, picked_date = NOW() 
                WHERE item_id = :item_id";
            $stmt = $this->pdo->prepare($sql);

            $batchIds = []; // Collect unique batch IDs to update

            foreach ($itemIds as $id) {
                $stmt->execute([':item_id' => $id, ':nurse_id' => $nurseId]);

                // Get the batch ID for this item
                $batchId = $this->getBatchIdFromItem($id);
                if ($batchId && !in_array($batchId, $batchIds)) {
                    $batchIds[] = $batchId;
                }
            }

            // Update each batch status only once
            foreach ($batchIds as $batchId) {
                $this->updateBatchStatus($batchId);
            }

            $this->pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Medicines confirmed as picked up']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Error in confirmPickup: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // ===== 3. Administer medicines =====
    public function administerMedicines($data)
    {
        try {
            $itemIds = $data['item_ids'] ?? [];
            $nurseId = $_SESSION['user_id'];
            if (empty($itemIds)) throw new Exception('No medicine items selected');

            $sql = "UPDATE request_medicine_items 
                    SET status = 'administered', administered_by = :nurse_id, administered_date = NOW() 
                    WHERE item_id = :item_id";
            $stmt = $this->pdo->prepare($sql);

            foreach ($itemIds as $id) {
                $stmt->execute([':item_id' => $id, ':nurse_id' => $nurseId]);

                // update batch after each item
                $batchId = $this->getBatchIdFromItem($id);
                $this->updateBatchStatus($batchId);
            }

            echo json_encode(['success' => true, 'message' => 'Medicines marked as administered']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // ===== 4. Return medicines =====
    public function returnMedicines($data)
    {
        try {
            $itemIds = $data['item_ids'] ?? [];
            $nurseId = $_SESSION['user_id'];
            if (empty($itemIds)) throw new Exception('No medicine items selected');

            $sql = "UPDATE request_medicine_items 
                    SET status = 'returned', returned_by = :nurse_id, returned_date = NOW() 
                    WHERE item_id = :item_id";
            $stmt = $this->pdo->prepare($sql);

            foreach ($itemIds as $id) {
                $stmt->execute([':item_id' => $id, ':nurse_id' => $nurseId]);

                // update batch after each item
                $batchId = $this->getBatchIdFromItem($id);
                $this->updateBatchStatus($batchId);
            }

            echo json_encode(['success' => true, 'message' => 'Medicines returned successfully']);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // ===== 5. Get batch details =====
    public function getBatchDetails($batchId)
    {
        try {
            // Get batch details with patient and doctor information
            $batchSql = "
            SELECT 
                rmb.batch_id,
                rmb.request_date,
                rmb.status as batch_status,
                rmb.notes,
                p.patient_id,
                CONCAT(p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name) AS patient_name,
                CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name,''), ' ', ud.last_name) AS doctor_name
            FROM request_medicine_batch rmb
            JOIN patients p ON rmb.patient_id = p.patient_id
            JOIN user_doctor ud ON rmb.doctor_id = ud.user_id
            WHERE rmb.batch_id = :batch_id
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
                rmi.item_id,
                rmi.quantity,
                rmi.status as item_status,
                rmi.dispensed_by,
                rmi.picked_by,
                rmi.administered_by,
                rmi.dispensed_date,
                rmi.picked_date,
                rmi.administered_date,
                m.med_name,
                CONCAT(COALESCE(dispensed_p.first_name, ''), ' ', COALESCE(dispensed_p.last_name, '')) AS dispensed_by_name,
                CONCAT(COALESCE(picked_n.first_name, ''), ' ', COALESCE(picked_n.last_name, '')) AS picked_by_name,
                CONCAT(COALESCE(administered_n.first_name, ''), ' ', COALESCE(administered_n.last_name, '')) AS administered_by_name
            FROM request_medicine_items rmi
            JOIN tbl_medicine m ON rmi.med_id = m.med_id
            LEFT JOIN user_pharmacist dispensed_p ON rmi.dispensed_by = dispensed_p.user_id
            LEFT JOIN user_nurse picked_n ON rmi.picked_by = picked_n.user_id
            LEFT JOIN user_nurse administered_n ON rmi.administered_by = administered_n.user_id
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
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // ===== Utility: Get batch_id from item_id =====
    private function getBatchIdFromItem($itemId)
    {
        $sql = "SELECT batch_id FROM request_medicine_items WHERE item_id = :item_id";
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
$request = new Medicine_Management();

switch ($operation) {
    case 'getDispensedMedicines':
        $patientId = $_GET['patient_id'] ?? null;
        $request->getDispensedMedicines($patientId);
        break;
    case 'confirmPickup':
        $request->confirmPickup($data);
        break;
    case 'administerMedicines':
        $request->administerMedicines($data);
        break;
    case 'returnMedicines':
        $request->returnMedicines($data);
        break;
    case 'getBatchDetails':
        $batchId = $_GET['batch_id'] ?? null;
        $request->getBatchDetails($batchId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}

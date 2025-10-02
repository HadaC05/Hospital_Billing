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
        $sql = "SELECT status FROM request_medicine_items WHERE batch_id = :batch_id";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':batch_id' => $batchId]);
        $statuses = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!$statuses) return;

        $allStatuses = array_unique($statuses);

        // Determine new batch status
        if (count($allStatuses) === 1 && $allStatuses[0] === 'pending') {
            $newStatus = 'pending';
        } elseif (in_array('pending', $allStatuses) && (in_array('dispensed', $allStatuses) || in_array('picked', $allStatuses))) {
            // Some items still pending, others already dispensed/picked
            $newStatus = 'partially_dispensed';
        } elseif (in_array('dispensed', $allStatuses) || in_array('picked', $allStatuses)) {
            // All dispensed/picked, none pending
            $newStatus = 'dispensed';
        } elseif (count($allStatuses) === 1 && $allStatuses[0] === 'administered') {
            $newStatus = 'completed';
        } elseif (count($allStatuses) === 1 && ($allStatuses[0] === 'returned' || $allStatuses[0] === 'returned_confirmed')) {
            $newStatus = 'completed';
        } elseif (in_array('administered', $allStatuses) || in_array('returned', $allStatuses) || in_array('returned_confirmed', $allStatuses)) {
            $newStatus = 'completed';
        } else {
            $newStatus = 'dispensed';
        }

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
                    rmi.item_id,
                    m.med_name,
                    rmi.quantity,
                    rmi.status as item_status
                FROM request_medicine_batch rmb
                JOIN request_medicine_items rmi ON rmb.batch_id = rmi.batch_id
                JOIN tbl_medicine m ON rmi.med_id = m.med_id
                JOIN patients p ON rmb.patient_id = p.patient_id
                WHERE rmb.status IN ('partially_dispensed', 'dispensed','completed')
            ";

            if ($patientId) {
                $sql .= " AND p.patient_id = :patient_id";
            }

            $sql .= " ORDER BY rmb.request_date DESC";

            $stmt = $this->pdo->prepare($sql);
            if ($patientId) {
                $stmt->bindValue(':patient_id', $patientId, PDO::PARAM_INT);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'medicines' => $rows
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
            $nurseId = $_SESSION['user_id'];
            if (empty($itemIds)) throw new Exception('No medicine items selected');

            $sql = "UPDATE request_medicine_items 
                    SET status = 'picked', picked_by = :nurse_id, picked_date = NOW() 
                    WHERE item_id = :item_id";
            $stmt = $this->pdo->prepare($sql);

            foreach ($itemIds as $id) {
                $stmt->execute([':item_id' => $id, ':nurse_id' => $nurseId]);

                // update batch after each item
                $batchId = $this->getBatchIdFromItem($id);
                $this->updateBatchStatus($batchId);
            }

            echo json_encode(['success' => true, 'message' => 'Medicines confirmed as picked up']);
        } catch (Exception $e) {
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
            $sql = "
                SELECT rmb.*, 
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name,''), ' ', p.last_name) AS patient_name
                FROM request_medicine_batch rmb
                JOIN patients p ON rmb.patient_id = p.patient_id
                WHERE rmb.batch_id = :batch_id
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':batch_id' => $batchId]);
            $batch = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$batch) throw new Exception('Batch not found');

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

            echo json_encode(['success' => true, 'batch' => $batch, 'items' => $items]);
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

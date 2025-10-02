<?php

require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class Medicine_Requests
{
    private $pdo;

    public function __construct()
    {
        include __DIR__ . '/../connection-pdo.php';
        $this->pdo = $pdo;
    }

    // New Batch System Functions
    public function getBatchRequests()
    {
        try {
            $sql = "
                SELECT 
                    rmb.batch_id,
                    rmb.request_date,
                    rmb.status,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) AS patient_name,
                    CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name, ''), ' ', ud.last_name) AS doctor_name
                FROM request_medicine_batch rmb
                JOIN patients p ON rmb.patient_id = p.patient_id
                JOIN user_doctor ud ON rmb.doctor_id = ud.user_id
                WHERE rmb.status IN ('pending', 'partially_dispensed')
                ORDER BY rmb.request_date DESC
            ";
            $stmt = $this->pdo->query($sql);
            $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'data' => $batches]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to get batch requests: ' . $e->getMessage()]);
        }
    }

    public function getBatchDetails($batchId)
    {
        try {
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

            echo json_encode(['success' => true, 'data' => $items]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Failed to get batch details: ' . $e->getMessage()]);
        }
    }

    public function updateBatchStatus($batchId, $newStatus)
    {
        try {
            $this->pdo->beginTransaction();

            $updateBatchSql = "UPDATE request_medicine_batch SET status = :status WHERE batch_id = :batch_id";
            $stmt = $this->pdo->prepare($updateBatchSql);
            $stmt->execute([':status' => $newStatus, ':batch_id' => $batchId]);

            $updateItemsSql = "UPDATE request_medicine_items SET status = :status WHERE batch_id = :batch_id";
            $stmt = $this->pdo->prepare($updateItemsSql);
            $stmt->execute([':status' => $newStatus, ':batch_id' => $batchId]);

            $this->pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Batch status updated successfully.']);
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Failed to update batch status: ' . $e->getMessage()]);
        }
    }

    public function dispenseItems($itemIds, $userId)
    {
        if (empty($itemIds)) {
            echo json_encode(['success' => false, 'message' => 'No items selected for dispensing.']);
            return;
        }

        $this->pdo->beginTransaction();
        $debug = [];
        try {
            $debug['received_item_ids'] = $itemIds;
            $batchId = null;
            $updatedItems = 0;

            foreach ($itemIds as $itemId) {
                $updateItemSql = "UPDATE request_medicine_items SET status = 'dispensed' WHERE item_id = :item_id AND status = 'pending'";
                $stmt = $this->pdo->prepare($updateItemSql);
                $stmt->execute([':item_id' => $itemId]);
                $updatedItems += $stmt->rowCount();

                if ($batchId === null) {
                    $getBatchIdSql = "SELECT batch_id FROM request_medicine_items WHERE item_id = :item_id";
                    $stmt = $this->pdo->prepare($getBatchIdSql);
                    $stmt->execute([':item_id' => $itemId]);
                    $batchId = $stmt->fetchColumn();
                }
            }
            $debug['updated_item_count'] = $updatedItems;
            $debug['found_batch_id'] = $batchId;

            if ($batchId) {
                $countRemainingSql = "SELECT COUNT(*) FROM request_medicine_items WHERE batch_id = :batch_id AND status = 'pending'";
                $stmt = $this->pdo->prepare($countRemainingSql);
                $stmt->execute([':batch_id' => $batchId]);
                $remainingItems = $stmt->fetchColumn();
                $debug['remaining_pending_items'] = $remainingItems;

                $newBatchStatus = $remainingItems == 0 ? 'completed' : 'partially_dispensed';
                $debug['calculated_new_batch_status'] = $newBatchStatus;

                $updateBatchSql = "UPDATE request_medicine_batch SET status = :status WHERE batch_id = :batch_id";
                $stmt = $this->pdo->prepare($updateBatchSql);
                $stmt->execute([':status' => $newBatchStatus, ':batch_id' => $batchId]);
                $debug['batch_update_rows_affected'] = $stmt->rowCount();
            }

            $this->pdo->commit();
            echo json_encode(['success' => true, 'message' => count($itemIds) . ' item(s) dispensed successfully.', 'debug' => $debug]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            $debug['error'] = $e->getMessage();
            echo json_encode(['success' => false, 'message' => 'An error occurred: ' . $e->getMessage(), 'debug' => $debug]);
        }
    }


    // Old Request System Functions (for compatibility)
    public function getRequests()
    {
        try {
            $sql = "
                SELECT 
                    dr.request_id,
                    dr.request_date,
                    CONCAT(d.first_name, ' ', COALESCE(d.middle_name, ''), ' ', d.last_name, ' ', COALESCE(d.suffix, '')) AS doctor_name,
                    p.patient_id,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name, ' ', COALESCE(p.suffix, '')) AS patient_name,
                    m.med_name,
                    mu.unit_name,
                    dr.quantity,
                    dr.notes
                FROM doctor_requests dr
                JOIN user_doctor d ON dr.doctor_id = d.user_id
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN tbl_medicine m ON dr.item_id = m.med_id
                JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                WHERE dr.svc_type_id = 4
                AND dr.status = 'pending'
                ORDER BY p.last_name, p.first_name, dr.request_date DESC;
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();

            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $groupedRequests = [];
            foreach ($requests as $req) {
                $patientId = $req['patient_id'];
                if (!isset($groupedRequests[$patientId])) {
                    $groupedRequests[$patientId] = [
                        'patient_id' => $patientId,
                        'patient_name' => $req['patient_name'],
                        'doctor_name' => $req['doctor_name'],
                        'request_date' => $req['request_date'],
                        'items' => []
                    ];
                }
                $groupedRequests[$patientId]['items'][] = [
                    'request_id' => $req['request_id'],
                    'med_name' => $req['med_name'],
                    'unit_name' => $req['unit_name'],
                    'quantity' => $req['quantity'],
                    'notes' => $req['notes']
                ];
            }

            echo json_encode([
                'success' => true,
                'requests' => array_values($groupedRequests)
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get requests: ' . $e->getMessage()
            ]);
        }
    }

    private function getOrCreateInvoice($admissionId, $patientId, $userId)
    {
        try {
            $sql = "SELECT * FROM bill_invoice WHERE admission_id = :admission_id AND patient_id = :patient_id AND status = 'draft' ORDER BY invoice_id DESC LIMIT 1";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':admission_id' => $admissionId, ':patient_id'   => $patientId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($invoice) {
                return $invoice['invoice_id'];
            }

            $sqlInsert = "INSERT INTO bill_invoice (admission_id, patient_id, created_by, invoice_date, total_amount, amount_due, status) VALUES (:admission_id, :patient_id, :created_by, NOW(), 0, 0, 'draft')";
            $stmtInsert = $this->pdo->prepare($sqlInsert);
            $stmtInsert->execute([':admission_id' => $admissionId, ':patient_id'   => $patientId, ':created_by'   => $userId]);

            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            throw new Exception("Failed to create or fetch invoice: " . $e->getMessage());
        }
    }

    public function dispenseMultipleRequests($requestIds, $userId)
    {
        $this->pdo->beginTransaction();
        try {
            foreach ($requestIds as $requestId) {
                $this->dispenseSingleRequest($requestId, $userId);
            }
            $this->pdo->commit();
            echo json_encode(['success' => true, 'message' => count($requestIds) . ' items dispensed successfully.']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Dispense Multiple Requests Error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    private function dispenseSingleRequest($requestId, $userId)
    {
        $sql = "
            SELECT 
                dr.*, 
                m.med_id, 
                m.unit_price,
                pa.admission_id
            FROM doctor_requests dr
            JOIN tbl_medicine m ON dr.item_id = m.med_id
            JOIN patient_admission pa ON dr.patient_id = pa.patient_id AND dr.doctor_id = pa.doctor_id
            WHERE dr.request_id = :id AND dr.status = 'pending' AND pa.status = 'active'
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([':id' => $requestId]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$req) {
            throw new Exception("Request #$requestId not found, not pending, or patient admission is not active.");
        }

        $pmSql = "INSERT INTO patient_medication (admission_id, request_id, med_id, quantity, unit_price, record_date, dispensed_by) VALUES (:admission_id, :request_id, :med_id, :quantity, :unit_price, NOW(), :dispensed_by)";
        $pm = $this->pdo->prepare($pmSql);
        $pm->execute([
            ':admission_id' => $req['admission_id'],
            ':request_id' => $req['request_id'],
            ':med_id' => $req['med_id'],
            ':quantity' => $req['quantity'],
            ':unit_price' => $req['unit_price'],
            ':dispensed_by' => $userId
        ]);
        $medicationId = $this->pdo->lastInsertId();

        $invoiceId = $this->getOrCreateInvoice($req['admission_id'], $req['patient_id'], $userId);
        $total = $req['quantity'] * $req['unit_price'];
        $biSql = "INSERT INTO bill_invoice_items (invoice_id, svc_type_id, reference_table, reference_id, quantity, unit_price, total_amount) VALUES (:invoice_id, :svc_type_id, 'patient_medication', :medication_id, :quantity, :unit_price, :total)";
        $bi = $this->pdo->prepare($biSql);
        $bi->execute([
            ':invoice_id'   => $invoiceId,
            ':svc_type_id'  => $req['svc_type_id'],
            ':medication_id' => $medicationId,
            ':quantity'     => $req['quantity'],
            ':unit_price'   => $req['unit_price'],
            ':total'        => $total
        ]);

        $updInvoiceSql = "UPDATE bill_invoice SET total_amount = total_amount + :total, amount_due = amount_due + :total WHERE invoice_id = :invoice_id";
        $updInvoice = $this->pdo->prepare($updInvoiceSql);
        $updInvoice->execute([':total' => $total, ':invoice_id' => $invoiceId]);

        $updReqSql = "UPDATE doctor_requests SET status = 'completed', completed_by = :user_id, completed_date = NOW() WHERE request_id = :id";
        $updReq = $this->pdo->prepare($updReqSql);
        $updReq->execute([':user_id' => $userId, ':id' => $requestId]);
    }

    public function dispenseRequest($requestId, $userId)
    {
        try {
            $this->pdo->beginTransaction();
            $this->dispenseSingleRequest($requestId, $userId);
            $this->pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Medicine dispensed successfully']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Dispense Request Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
}

$request = new Medicine_Requests();

switch ($operation) {
    // New Batch Operations
    case 'getBatchRequests':
        $request->getBatchRequests();
        break;
    case 'getBatchDetails':
        $batchId = $_GET['batch_id'] ?? null;
        if ($batchId) {
            $request->getBatchDetails($batchId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing batch ID']);
        }
        break;
    case 'updateBatchStatus':
        $batchId = $payload['batch_id'] ?? null;
        $newStatus = $payload['status'] ?? null;
        if ($batchId && $newStatus) {
            $request->updateBatchStatus($batchId, $newStatus);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing batch ID or new status']);
        }
        break;
    case 'dispenseItems':
        $itemIds = $payload['item_ids'] ?? [];
        $userId = $_SESSION['user_id'] ?? null;
        if (!empty($itemIds) && $userId) {
            $request->dispenseItems($itemIds, $userId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing item IDs or user not authenticated.']);
        }
        break;

    // Old System Operations
    case 'getRequests':
        $request->getRequests();
        break;
    case 'dispenseRequest':
        $requestId = $payload['request_id'] ?? null;
        $userId = $_SESSION['user_id'] ?? null;
        if ($requestId && $userId) {
            $request->dispenseRequest($requestId, $userId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing request ID or user not authenticated.']);
        }
        break;
    case 'dispenseMultipleRequests':
        $requestIds = $payload['request_ids'] ?? null;
        $userId = $_SESSION['user_id'] ?? null;
        if ($requestIds && is_array($requestIds) && !empty($requestIds) && $userId) {
            $request->dispenseMultipleRequests($requestIds, $userId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing request IDs or user not authenticated.']);
        }
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

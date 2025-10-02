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

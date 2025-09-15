<?php

require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class Approved_Requests
{
    private $pdo;

    public function __construct()
    {
        include __DIR__ . '/../connection-pdo.php';
        $this->pdo = $pdo;
    }

    public function getApprovedRequests()
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
                    m.stock_quantity,
                    dr.notes
                FROM doctor_requests dr
                JOIN user_doctor d ON dr.doctor_id = d.doctor_id
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN tbl_medicine m ON dr.item_id = m.med_id
                JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                WHERE dr.svc_type_id = 4
                AND dr.status = 'approved'
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

    private function getOrCreateInvoice($admissionId, $patientId, $userId)
    {
        try {
            // 1. Look for an existing draft invoice
            $sql = "
            SELECT * 
            FROM bill_invoice 
            WHERE admission_id = :admission_id 
                AND patient_id = :patient_id 
                AND status = 'draft'
            ORDER BY invoice_id DESC
            LIMIT 1
        ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':admission_id' => $admissionId,
                ':patient_id'   => $patientId
            ]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($invoice) {
                return $invoice['invoice_id'];
            }

            // 2. If no draft found, create new invoice
            $sqlInsert = "
            INSERT INTO bill_invoice 
                (admission_id, patient_id, created_by, invoice_date, total_amount, amount_due, status)
            VALUES 
                (:admission_id, :patient_id, :created_by, NOW(), 0, 0, 'draft')
        ";
            $stmtInsert = $this->pdo->prepare($sqlInsert);
            $stmtInsert->execute([
                ':admission_id' => $admissionId,
                ':patient_id'   => $patientId,
                ':created_by'   => $userId
            ]);

            return $this->pdo->lastInsertId();
        } catch (PDOException $e) {
            throw new Exception("Failed to create or fetch invoice: " . $e->getMessage());
        }
    }

    private function recalcInvoiceTotals($invoiceId)
    {
        try {
            $sql = "
                UPDATE bill_invoice b
                JOIN (
                    SELECT invoice_id,
                        SUM(total_amount) AS new_total
                    FROM bill_invoice_items
                    WHERE invoice_id = :invoice_id
                    GROUP BY invoice_id
                ) i ON b.invoice_id = i.invoice_id
                SET b.total_amount = i.new_total,
                    b.amount_due   = i.new_total
            ";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':invoice_id' => $invoiceId]);
        } catch (PDOException $e) {
            error_log("Recalc Invoice Totals Error: " . $e->getMessage());
            throw new Exception("Failed to recalculate invoice totals: " . $e->getMessage());
        }
    }



    public function dispenseRequest($requestId, $userId)
    {
        try {
            $this->pdo->beginTransaction();

            $sql = "
                SELECT 
                    dr.*, 
                    m.med_id, 
                    m.stock_quantity, 
                    m.unit_price,
                    pa.admission_id
                FROM doctor_requests dr
                JOIN tbl_medicine m ON dr.item_id = m.med_id
                JOIN patient_admission pa ON dr.patient_id = pa.patient_id AND dr.doctor_id = pa.doctor_id
                WHERE dr.request_id = :id AND dr.status = 'approved' AND pa.status = 'active'
            ";

            // 1. Get request details
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $requestId]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                throw new Exception("Request not found or not approved");
            }

            if ($req['stock_quantity'] < $req['quantity']) {
                throw new Exception("Insufficient stock");
            }

            // 2. Deduct stock
            $updSql = "
                UPDATE tbl_medicine 
                SET stock_quantity = stock_quantity - :qty 
                WHERE med_id = :med_id
            ";

            $upd = $this->pdo->prepare($updSql);
            $upd->execute([
                ':qty' => $req['quantity'],
                ':med_id' => $req['med_id']
            ]);

            // 3. Record in patient_medication

            $pmSql = "
                INSERT INTO patient_medication (admission_id, request_id, med_id, quantity, unit_price, record_date, dispensed_by)
                VALUES (:admission_id, :request_id, :med_id, :quantity, :unit_price, NOW(), :dispensed_by)
            ";

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

            // 4. Add invoice item
            $invoiceId = $this->getOrCreateInvoice($req['admission_id'], $req['patient_id'], $userId);

            $total = $req['quantity'] * $req['unit_price'];

            $biSql = "
                INSERT INTO bill_invoice_items (invoice_id, svc_type_id, reference_table, reference_id, quantity, unit_price, total_amount)
                VALUES (:invoice_id, :svc_type_id, 'patient_medication', :medication_id, :quantity, :unit_price, :total)
            ";
            $bi = $this->pdo->prepare($biSql);
            $bi->execute([
                ':invoice_id'   => $invoiceId,
                ':svc_type_id'  => $req['svc_type_id'],
                ':medication_id' => $medicationId,
                ':quantity'     => $req['quantity'],
                ':unit_price'   => $req['unit_price'],
                ':total'        => $total
            ]);

            // 4b. Update invoice header
            $updInvoiceSql = "
                UPDATE bill_invoice
                SET total_amount = total_amount + :total,
                    amount_due   = amount_due + :total
                WHERE invoice_id = :invoice_id
            ";
            $updInvoice = $this->pdo->prepare($updInvoiceSql);
            $updInvoice->execute([
                ':total'      => $total,
                ':invoice_id' => $invoiceId
            ]);

            // 4c. Recalculate totals (safety net)
            $this->recalcInvoiceTotals($invoiceId);

            // 5. Update doctor request status
            $updReqSql = "
                UPDATE doctor_requests 
                SET status = 'completed', completed_by = :user_id, completed_date = NOW()
                WHERE request_id = :id
            ";
            $updReq = $this->pdo->prepare($updReqSql);
            $updReq->execute([
                ':user_id' => $userId,
                ':id' => $requestId
            ]);

            $this->pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Medicine dispensed successfu lly']);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            error_log("Dispense Request Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            error_log("Dispense Request PDO Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
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
$request = new Approved_Requests();

switch ($operation) {
    case 'getApprovedRequests':
        $request->getApprovedRequests();
        break;
    case 'dispenseRequest':
        $requestId = $payload['request_id'];
        $userId = $_SESSION['user_id'];
        if ($requestId && $userId) {
            $request->dispenseRequest($requestId, $userId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing request ID or user ID']);
        }
        break;
    default:
        echo json_encode(['status' => false, 'message' => 'Invalid operation']);
        break;
}

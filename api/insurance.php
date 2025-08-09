<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Insurance {
    function getClaims($status)
    {
        include 'connection-pdo.php';

        try {
            $where = '';
            if ($status && $status !== 'ALL') {
                $where = 'WHERE c.status = :status';
            }

            $sql = "
                SELECT c.claim_id, c.invoice_id, c.status, c.submitted_date, c.approved_amount,
                       CONCAT(p.patient_lname, ', ', p.patient_fname) AS patient_name,
                       prov.provider_name
                FROM insurance_claim c
                JOIN bill_invoice bi ON c.invoice_id = bi.invoice_id
                JOIN patient_admission a ON bi.admission_id = a.admission_id
                JOIN patients p ON a.patient_id = p.patient_id
                JOIN insurance_policy ip ON c.policy_id = ip.policy_id
                JOIN insurance_provider prov ON ip.provider_id = prov.provider_id
                $where
                ORDER BY c.submitted_date DESC, c.claim_id DESC
            ";

            $stmt = $conn->prepare($sql);
            if ($where) {
                $stmt->bindParam(':status', $status);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'claims' => $rows]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function getClaimDetails($claim_id)
    {
        include 'connection-pdo.php';
        try {
            $sql = "
                SELECT c.claim_id, c.invoice_id, c.status, c.submitted_date, c.approved_amount,
                       bi.total_amount, bi.insurance_covered_amount, bi.amount_due
                FROM insurance_claim c
                JOIN bill_invoice bi ON c.invoice_id = bi.invoice_id
                WHERE c.claim_id = :claim_id
            ";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':claim_id', $claim_id);
            $stmt->execute();
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                echo json_encode(['success' => false, 'message' => 'Claim not found']);
                return;
            }
            echo json_encode(['success' => true, 'detail' => $row]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function approveClaim($claim_id, $approve_amount)
    {
        include 'connection-pdo.php';

        try {
            $conn->beginTransaction();

            // Get invoice linkage
            $stmt = $conn->prepare("SELECT invoice_id FROM insurance_claim WHERE claim_id = :claim_id FOR UPDATE");
            $stmt->bindParam(':claim_id', $claim_id);
            $stmt->execute();
            $claim = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$claim) { throw new Exception('Claim not found'); }
            $invoice_id = (int)$claim['invoice_id'];

            // Get invoice numbers
            $stmt = $conn->prepare("SELECT total_amount, insurance_covered_amount, amount_due FROM bill_invoice WHERE invoice_id = :invoice_id FOR UPDATE");
            $stmt->bindParam(':invoice_id', $invoice_id);
            $stmt->execute();
            $inv = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$inv) { throw new Exception('Invoice not found'); }

            $covered = (float)$inv['insurance_covered_amount'] + (float)$approve_amount;
            $due = (float)$inv['total_amount'] - $covered;
            if ($due < 0) { $due = 0; }

            // Update invoice
            $stmt = $conn->prepare("UPDATE bill_invoice SET insurance_covered_amount = :covered, amount_due = :due WHERE invoice_id = :invoice_id");
            $stmt->execute([':covered' => $covered, ':due' => $due, ':invoice_id' => $invoice_id]);

            // Update claim
            $stmt = $conn->prepare("UPDATE insurance_claim SET status = 'APPROVED', approved_amount = :amt WHERE claim_id = :claim_id");
            $stmt->execute([':amt' => $approve_amount, ':claim_id' => $claim_id]);

            $conn->commit();
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            if ($conn->inTransaction()) { $conn->rollBack(); }
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function denyClaim($claim_id)
    {
        include 'connection-pdo.php';
        try {
            $stmt = $conn->prepare("UPDATE insurance_claim SET status = 'DENIED', approved_amount = 0 WHERE claim_id = :claim_id");
            $stmt->bindParam(':claim_id', $claim_id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

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
$api = new Insurance();

switch ($operation) {
    case 'getClaims':
        $api->getClaims($data['status'] ?? 'PENDING');
        break;
    case 'getClaimDetails':
        $api->getClaimDetails($data['claim_id'] ?? 0);
        break;
    case 'approveClaim':
        $api->approveClaim($data['claim_id'] ?? 0, $data['approve_amount'] ?? 0);
        break;
    case 'denyClaim':
        $api->denyClaim($data['claim_id'] ?? 0);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}



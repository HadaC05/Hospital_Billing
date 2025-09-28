<?php
require_once __DIR__ . '/require_auth.php';
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class Billing
{
    function getOverview($filters)
    {
        include 'connection-pdo.php';
        $start = $filters['start_date'] ?? null;
        $end = $filters['end_date'] ?? null;
        $status = $filters['status'] ?? 'ALL';
        try {
            $conditions = [];
            $params = [];
            if ($start) {
                $conditions[] = 'bi.invoice_date >= :start';
                $params[':start'] = $start;
            }
            if ($end) {
                $conditions[] = 'bi.invoice_date <= :end';
                $params[':end'] = $end;
            }
            if ($status && $status !== 'ALL') {
                $conditions[] = 'bi.status = :status';
                $params[':status'] = $status;
            }
            $where = count($conditions) ? ('WHERE ' . implode(' AND ', $conditions)) : '';
            // list
            $sql = "
                SELECT bi.invoice_id, bi.invoice_date, bi.total_amount, bi.insurance_covered_amount, bi.amount_due, bi.status,
                       CONCAT(p.last_name, ', ', p.first_name) AS patient_name
                FROM bill_invoice bi
                JOIN patient_admission a ON bi.admission_id = a.admission_id
                JOIN patients p ON a.patient_id = p.patient_id
                $where
                ORDER BY bi.invoice_date DESC, bi.invoice_id DESC
            ";
            $stmt = $conn->prepare($sql);
            foreach ($params as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->execute();
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // kpis
            $sql2 = "
                SELECT COUNT(*) AS total_invoices,
                       COALESCE(SUM(bi.total_amount),0) AS total_billed,
                       COALESCE(SUM(bi.insurance_covered_amount),0) AS total_covered,
                       COALESCE(SUM(bi.amount_due),0) AS total_due
                FROM bill_invoice bi
                $where
            ";
            $stmt2 = $conn->prepare($sql2);
            foreach ($params as $k => $v) {
                $stmt2->bindValue($k, $v);
            }
            $stmt2->execute();
            $kpis = $stmt2->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'invoices' => $invoices, 'kpis' => $kpis]);
        } catch (PDOException $e) {
            error_log("Billing error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function processPayment($data)
    {
        include 'connection-pdo.php';

        $invoiceId = $data['invoice_id'] ?? null;
        $amount = $data['amount'] ?? null;
        $paymentMethodId = $data['payment_method_id'] ?? null;
        $paymentDate = $data['payment_date'] ?? null;
        $notes = $data['notes'] ?? null;
        $userId = $data['user_id'] ?? null;

        if (!$invoiceId || !$amount || !$paymentMethodId || !$paymentDate || !$userId) {
            echo json_encode(['success' => false, 'message' => 'Missing required payment data']);
            return;
        }

        try {
            // Begin transaction
            $conn->beginTransaction();

            // Get invoice details
            $stmt = $conn->prepare("SELECT * FROM bill_invoice WHERE invoice_id = :invoice_id");
            $stmt->bindParam(':invoice_id', $invoiceId);
            $stmt->execute();
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$invoice) {
                echo json_encode(['success' => false, 'message' => 'Invoice not found']);
                return;
            }

            // Check if invoice status allows payment
            if (in_array($invoice['status'], ['paid', 'cancelled'])) {
                echo json_encode(['success' => false, 'message' => 'Invoice status does not allow payment']);
                return;
            }

            // Check if payment amount is valid
            if ($amount > $invoice['amount_due']) {
                echo json_encode(['success' => false, 'message' => 'Payment amount exceeds amount due']);
                return;
            }

            // Check if payment method exists, if not create it
            $stmt = $conn->prepare("SELECT payment_method_id FROM bill_payment_method WHERE payment_method_id = :payment_method_id");
            $stmt->bindParam(':payment_method_id', $paymentMethodId);
            $stmt->execute();

            if ($stmt->rowCount() == 0) {
                // Payment method doesn't exist, create it
                $methodNames = [
                    1 => 'Cash',
                    2 => 'Credit Card',
                    3 => 'Debit Card',
                    4 => 'Check'
                ];

                $methodName = $methodNames[$paymentMethodId] ?? 'Payment Method ' . $paymentMethodId;

                $stmt = $conn->prepare("INSERT INTO bill_payment_method (payment_method_id, method_name, isActive) VALUES (:payment_method_id, :method_name, 1)");
                $stmt->bindParam(':payment_method_id', $paymentMethodId);
                $stmt->bindParam(':method_name', $methodName);
                $stmt->execute();
            }

            // Insert payment record
            $stmt = $conn->prepare("
                INSERT INTO bill_payment (invoice_id, received_by, amount, payment_method_id, payment_date, status) 
                VALUES (:invoice_id, :received_by, :amount, :payment_method_id, :payment_date, 'completed')
            ");
            $stmt->bindParam(':invoice_id', $invoiceId);
            $stmt->bindParam(':received_by', $userId);
            $stmt->bindParam(':amount', $amount);
            $stmt->bindParam(':payment_method_id', $paymentMethodId);
            $stmt->bindParam(':payment_date', $paymentDate);
            $stmt->execute();

            // Update invoice
            $newAmountDue = $invoice['amount_due'] - $amount;
            $newStatus = $newAmountDue <= 0 ? 'paid' : ($invoice['status'] === 'draft' ? 'pending' : $invoice['status']);

            $stmt = $conn->prepare("
                UPDATE bill_invoice 
                SET amount_due = :amount_due, status = :status 
                WHERE invoice_id = :invoice_id
            ");
            $stmt->bindParam(':amount_due', $newAmountDue);
            $stmt->bindParam(':status', $newStatus);
            $stmt->bindParam(':invoice_id', $invoiceId);
            $stmt->execute();

            // Commit transaction
            $conn->commit();

            echo json_encode(['success' => true, 'message' => 'Payment processed successfully']);
        } catch (PDOException $e) {
            // Rollback transaction on error
            $conn->rollBack();
            error_log("Payment processing error: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    function getPaymentMethods()
    {
        include 'connection-pdo.php';
        try {
            // Check if payment methods table has any records
            $stmt = $conn->prepare("SELECT COUNT(*) FROM bill_payment_method");
            $stmt->execute();
            $count = $stmt->fetchColumn();

            // If no payment methods exist, insert default ones
            if ($count == 0) {
                $defaultMethods = [
                    [1, 'Cash'],
                    [2, 'Credit Card'],
                    [3, 'Debit Card'],
                    [4, 'Check']
                ];

                $stmt = $conn->prepare("INSERT INTO bill_payment_method (payment_method_id, method_name, isActive) VALUES (?, ?, 1)");
                foreach ($defaultMethods as $method) {
                    $stmt->execute($method);
                }
            }

            // Now get all payment methods
            $stmt = $conn->prepare("SELECT payment_method_id, method_name FROM bill_payment_method WHERE isActive = 1");
            $stmt->execute();
            $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'methods' => $methods]);
        } catch (PDOException $e) {
            error_log("Error getting payment methods: " . $e->getMessage());
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
$bill = new Billing();
switch ($operation) {
    case 'getOverview':
        $bill->getOverview($data ?? []);
        break;
    case 'processPayment':
        $bill->processPayment($data ?? []);
        break;
    case 'getPaymentMethods':
        $bill->getPaymentMethods();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}

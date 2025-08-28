<?php
require_once 'require_auth.php';

class CashierAPI    
{
    public function getPendingBills()
    {
        header('Content-Type: application/json');
        include 'connection-pdo.php';

        try {
            $sql = "
                SELECT 
                    i.invoice_id,
                    p.patient_id,
                    p.patient_fname,
                    p.patient_lname,
                    p.patient_mname,
                    a.admission_date,
                    i.total_amount,
                    i.amount_due,
                    (SELECT SUM(amount) FROM bill_payment WHERE invoice_id = i.invoice_id) as total_paid
                FROM bill_invoice i
                JOIN patient_admission a ON i.admission_id = a.admission_id
                JOIN patients p ON a.patient_id = p.patient_id
                WHERE i.status != 'Paid'
                GROUP BY i.invoice_id
                HAVING i.amount_due > total_paid OR total_paid IS NULL
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute();

            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $result]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getPaidPayments($data)
    {
        header('Content-Type: application/json');
        include 'connection-pdo.php';

        // Filters
        $start = $data['start_date'] ?? null;
        $end = $data['end_date'] ?? null;
        $methodId = $data['payment_method_id'] ?? null;

        try {
            $where = ["bp.status = 'Completed'"]; // only completed/paid payments
            $params = [];
            if ($start && $end) {
                $where[] = 'bp.payment_date BETWEEN ? AND ?';
                $params[] = $start;
                $params[] = $end;
            }
            if ($methodId) {
                $where[] = 'bp.payment_method_id = ?';
                $params[] = $methodId;
            }
            $whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

            $sql = "
                SELECT 
                    bp.payment_id,
                    bp.invoice_id,
                    bp.amount,
                    bp.payment_date,
                    bpm.method_name,
                    COALESCE(CONCAT(ubo.first_name, ' ', ubo.last_name), u.username) AS received_by_name,
                    bi.invoice_date,
                    bi.status AS invoice_status,
                    CONCAT(p.patient_fname, ' ', p.patient_lname) AS patient_name
                FROM bill_payment bp
                JOIN bill_payment_method bpm ON bp.payment_method_id = bpm.payment_method_id
                JOIN users u ON bp.received_by = u.user_id
                LEFT JOIN user_billing_officer ubo ON ubo.user_id = u.user_id
                JOIN bill_invoice bi ON bp.invoice_id = bi.invoice_id
                JOIN patient_admission pa ON bi.admission_id = pa.admission_id
                JOIN patients p ON pa.patient_id = p.patient_id
                $whereSql
                ORDER BY bp.payment_date DESC, bp.payment_id DESC
            ";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $rows]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getPaymentMethods()
    {
        header('Content-Type: application/json');
        include 'connection-pdo.php';

        try {
            $sql = "SELECT payment_method_id, method_name FROM bill_payment_method WHERE isActive = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();

            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $result]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function processPayment($data)
    {
        header('Content-Type: application/json');
        include 'connection-pdo.php';

        try {
            $pdo->beginTransaction();

            // Insert payment
            $sql = "INSERT INTO bill_payment (invoice_id, received_by, amount, payment_method_id, payment_date, status) VALUES (?, ?, ?, ?, CURDATE(), 'Completed')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['invoice_id'], $_SESSION['user_id'], $data['amount'], $data['payment_method_id']]);

            // Update invoice
            $sql = "UPDATE bill_invoice SET amount_due = amount_due - ? WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['amount'], $data['invoice_id']]);

            // Check if invoice is fully paid
            $sql = "SELECT amount_due FROM bill_invoice WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['invoice_id']]);
            $amount_due = $stmt->fetchColumn();

            if ($amount_due <= 0) {
                $sql = "UPDATE bill_invoice SET status = 'Paid' WHERE invoice_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['invoice_id']]);
            } else {
                $sql = "UPDATE bill_invoice SET status = 'Partial' WHERE invoice_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$data['invoice_id']]);
            }

            $pdo->commit();

            echo json_encode(['status' => 'success', 'message' => 'Payment processed successfully']);
        } catch (PDOException $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];
$request_data = json_decode(file_get_contents('php://input'), true);

if ($method === 'POST' && isset($request_data['operation'])) {
    $operation = $request_data['operation'];
    $cashier_api = new CashierAPI();

    switch ($operation) {
        case 'getPendingBills':
            $cashier_api->getPendingBills();
            break;
        case 'getPaymentMethods':
            $cashier_api->getPaymentMethods();
            break;
        case 'processPayment':
            $cashier_api->processPayment($request_data['data']);
            break;
        case 'getPaidPayments':
            $cashier_api->getPaidPayments($request_data['data'] ?? []);
            break;
        default:
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
            break;
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}

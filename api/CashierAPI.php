<?php
require_once 'require_auth.php';

class CashierAPI
{
    public function getPendingBills()
    {
        header('Content-Type: application/json');
        require_once 'db_connection.php';

        $pdo = new PDO_DB();
        $db = $pdo->get_db();

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

            $stmt = $db->prepare($sql);
            $stmt->execute();

            $result = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode(['status' => 'success', 'data' => $result]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    public function getPaymentMethods()
    {
        header('Content-Type: application/json');
        require_once 'db_connection.php';

        $pdo = new PDO_DB();
        $db = $pdo->get_db();

        try {
            $sql = "SELECT payment_method_id, method_name FROM bill_payment_method WHERE isActive = 1";
            $stmt = $db->prepare($sql);
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
        require_once 'db_connection.php';

        $pdo = new PDO_DB();
        $db = $pdo->get_db();

        try {
            $db->beginTransaction();

            // Insert payment
            $sql = "INSERT INTO bill_payment (invoice_id, received_by, amount, payment_method_id, payment_date, status) VALUES (?, ?, ?, ?, CURDATE(), 'Completed')";
            $stmt = $db->prepare($sql);
            $stmt->execute([$data['invoice_id'], $_SESSION['user_id'], $data['amount'], $data['payment_method_id']]);

            // Update invoice
            $sql = "UPDATE bill_invoice SET amount_due = amount_due - ? WHERE invoice_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$data['amount'], $data['invoice_id']]);

            // Check if invoice is fully paid
            $sql = "SELECT amount_due FROM bill_invoice WHERE invoice_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute([$data['invoice_id']]);
            $amount_due = $stmt->fetchColumn();

            if ($amount_due <= 0) {
                $sql = "UPDATE bill_invoice SET status = 'Paid' WHERE invoice_id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$data['invoice_id']]);
            } else {
                $sql = "UPDATE bill_invoice SET status = 'Partial' WHERE invoice_id = ?";
                $stmt = $db->prepare($sql);
                $stmt->execute([$data['invoice_id']]);
            }

            $db->commit();

            echo json_encode(['status' => 'success', 'message' => 'Payment processed successfully']);
        } catch (PDOException $e) {
            $db->rollBack();
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
        default:
            http_response_code(400);
            echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
            break;
    }
} else {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
}

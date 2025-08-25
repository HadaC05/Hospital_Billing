<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');


class PaymentAPI {
    
    function addPayment($invoiceId, $receivedBy, $amount, $paymentMethodId, $paymentDate) {
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Get current invoice details
            $sql = "SELECT * FROM bill_invoice WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invoice) {
                throw new Exception("Invoice not found");
            }
            
            // Insert payment record
            $sql = "INSERT INTO bill_payment (invoice_id, received_by, amount, payment_method_id, payment_date, status) 
                    VALUES (?, ?, ?, ?, ?, 'Completed')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId, $receivedBy, $amount, $paymentMethodId, $paymentDate]);
            
            // Calculate new amount due
            $newAmountDue = $invoice['amount_due'] - $amount;
            
            // Update invoice status based on payment
            $newStatus = $invoice['status'];
            if ($newAmountDue <= 0) {
                $newStatus = 'Paid';
            } elseif ($invoice['status'] == 'Pending') {
                $newStatus = 'Partially Paid';
            }
            
            // Update invoice
            $sql = "UPDATE bill_invoice SET amount_due = ?, status = ? WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$newAmountDue, $newStatus, $invoiceId]);
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Payment added successfully',
                'payment_id' => $pdo->lastInsertId(),
                'new_amount_due' => $newAmountDue,
                'invoice_status' => $newStatus
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to add payment: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getPaymentsByInvoice($invoiceId) {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT bp.*, bpm.method_name, CONCAT(u.first_name, ' ', u.last_name) AS received_by_name
                    FROM bill_payment bp
                    JOIN bill_payment_method bpm ON bp.payment_method_id = bpm.payment_method_id
                    JOIN users u ON bp.received_by = u.user_id
                    WHERE bp.invoice_id = ?
                    ORDER BY bp.payment_date DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'payments' => $payments
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get payments: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getPaymentMethods() {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT * FROM bill_payment_method WHERE isActive = 1";
            $stmt = $pdo->query($sql);
            $methods = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'methods' => $methods
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get payment methods: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method == 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);
$obj = new PaymentAPI();

switch ($operation) {
    case "addPayment":
        $invoiceId = $data['invoice_id'] ?? 0;
        $receivedBy = $data['received_by'] ?? 0;
        $amount = $data['amount'] ?? 0;
        $paymentMethodId = $data['payment_method_id'] ?? 0;
        $paymentDate = $data['payment_date'] ?? date('Y-m-d');
        $obj->addPayment($invoiceId, $receivedBy, $amount, $paymentMethodId, $paymentDate);
        break;
        
    case "getPaymentsByInvoice":
        $invoiceId = $data['invoice_id'] ?? 0;
        $obj->getPaymentsByInvoice($invoiceId);
        break;
        
    case "getPaymentMethods":
        $obj->getPaymentMethods();
        break;
}
?>
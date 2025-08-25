<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class InvoiceAPI {
    function createInvoice($admissionId, $createdBy, $invoiceDate, $items) {
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Insert main invoice record
            $sql = "INSERT INTO bill_invoice (admission_id, created_by, invoice_date, insurance_covered_amount, total_amount, amount_due, status) 
                    VALUES (?, ?, ?, 0, 0, 0, 'Pending')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId, $createdBy, $invoiceDate]);
            $invoiceId = $pdo->lastInsertId();
            
            $totalAmount = 0;
            $insuranceCovered = 0;
            
            // Insert invoice items
            foreach ($items as $item) {
                $sql = "INSERT INTO bill_invoice_items (invoice_id, svc_type_id, svc_reference_id, quantity, unit_price, total_amount, coverage_amount, patient_payable) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $invoiceId,
                    $item['svc_type_id'],
                    $item['svc_reference_id'],
                    $item['quantity'],
                    $item['unit_price'],
                    $item['total_amount'],
                    $item['coverage_amount'],
                    $item['patient_payable']
                ]);
                
                $totalAmount += $item['total_amount'];
                $insuranceCovered += $item['coverage_amount'];
            }
            
            $amountDue = $totalAmount - $insuranceCovered;
            
            // Update invoice with calculated amounts
            $sql = "UPDATE bill_invoice SET total_amount = ?, insurance_covered_amount = ?, amount_due = ? WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$totalAmount, $insuranceCovered, $amountDue, $invoiceId]);
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Invoice created successfully',
                'invoice_id' => $invoiceId,
                'total_amount' => $totalAmount,
                'insurance_covered' => $insuranceCovered,
                'amount_due' => $amountDue
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to create invoice: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getInvoice($invoiceId) {
        include 'connection-pdo.php';
        try {
            // Get main invoice details
            $sql = "SELECT bi.*, pa.patient_id, CONCAT(p.patient_fname, ' ', p.patient_lname) AS patient_name
                    FROM bill_invoice bi
                    JOIN patient_admission pa ON bi.admission_id = pa.admission_id
                    JOIN patients p ON pa.patient_id = p.patient_id
                    WHERE bi.invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invoice) {
                throw new Exception("Invoice not found");
            }
            
            // Get invoice items
            $sql = "SELECT bii.*, st.svc_name
                    FROM bill_invoice_items bii
                    JOIN tbl_service_type st ON bii.svc_type_id = st.svc_type_id
                    WHERE bii.invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get payments
            $sql = "SELECT bp.*, bpm.method_name
                    FROM bill_payment bp
                    JOIN bill_payment_method bpm ON bp.payment_method_id = bpm.payment_method_id
                    WHERE bp.invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'invoice' => $invoice,
                'items' => $items,
                'payments' => $payments
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get invoice: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function updateInvoiceStatus($invoiceId, $status) {
        include 'connection-pdo.php';
        try {
            $sql = "UPDATE bill_invoice SET status = ? WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$status, $invoiceId]);
            
            $response = [
                'status' => 'success',
                'message' => 'Invoice status updated successfully'
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to update invoice status: ' . $e->getMessage()
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
$obj = new InvoiceAPI();

switch ($operation) {
    case "createInvoice":
        $admissionId = $data['admission_id'] ?? 0;
        $createdBy = $data['created_by'] ?? 0;
        $invoiceDate = $data['invoice_date'] ?? date('Y-m-d');
        $items = $data['items'] ?? [];
        $obj->createInvoice($admissionId, $createdBy, $invoiceDate, $items);
        break;
        
    case "getInvoice":
        $invoiceId = $data['invoice_id'] ?? 0;
        $obj->getInvoice($invoiceId);
        break;
        
    case "updateInvoiceStatus":
        $invoiceId = $data['invoice_id'] ?? 0;
        $status = $data['status'] ?? '';
        $obj->updateInvoiceStatus($invoiceId, $status);
        break;
}
?>
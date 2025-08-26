<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
include 'RequireAuth.php';

class BillingAPI {
    function generateBill($token, $admissionId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'generate_invoice')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Check if admission exists and is not discharged
            $sql = "SELECT * FROM patient_admission WHERE admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$admission) {
                throw new Exception("Admission not found");
            }
            
            // Check if there's already an invoice for this admission
            $sql = "SELECT * FROM bill_invoice WHERE admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $existingInvoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingInvoice) {
                throw new Exception("Invoice already exists for this admission");
            }
            
            // Get all services for this admission
            $services = $this->getAdmissionServices($pdo, $admissionId);
            
            // Get patient's insurance policy
            $sql = "SELECT ip.*, ipc.coverage_type_id, ipc.coverage_limit, ipc.coverage_percent
                    FROM insurance_policy ip
                    JOIN insurance_policy_coverage ipc ON ip.policy_id = ipc.insurance_policy_id
                    WHERE ip.patient_id = ? AND ip.status = 'Active' AND ip.start_date <= CURDATE() AND ip.end_date >= CURDATE()
                    ORDER BY ip.policy_id DESC LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admission['patient_id']]);
            $policy = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Create invoice
            $sql = "INSERT INTO bill_invoice (admission_id, created_by, invoice_date, insurance_covered_amount, total_amount, amount_due, status) 
                    VALUES (?, ?, CURDATE(), 0, 0, 0, 'Pending')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId, $userId]);
            $invoiceId = $pdo->lastInsertId();
            
            $totalAmount = 0;
            $insuranceCovered = 0;
            
            // Add services to invoice
            foreach ($services as $service) {
                $coverageAmount = 0;
                $patientPayable = $service['amount'];
                
                // Calculate insurance coverage if policy exists
                if ($policy) {
                    // Simplified coverage calculation
                    $coveragePercent = $policy['coverage_percent'] / 100;
                    $coverageAmount = min($service['amount'] * $coveragePercent, $policy['coverage_limit']);
                    $patientPayable = $service['amount'] - $coverageAmount;
                }
                
                $sql = "INSERT INTO bill_invoice_items (invoice_id, svc_type_id, svc_reference_id, quantity, unit_price, total_amount, coverage_amount, patient_payable) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    $invoiceId,
                    $service['svc_type_id'],
                    $service['reference_id'],
                    $service['quantity'],
                    $service['unit_price'],
                    $service['amount'],
                    $coverageAmount,
                    $patientPayable
                ]);
                
                $totalAmount += $service['amount'];
                $insuranceCovered += $coverageAmount;
            }
            
            $amountDue = $totalAmount - $insuranceCovered;
            
            // Update invoice with totals
            $sql = "UPDATE bill_invoice SET total_amount = ?, insurance_covered_amount = ?, amount_due = ? WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$totalAmount, $insuranceCovered, $amountDue, $invoiceId]);
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Bill generated successfully',
                'invoice_id' => $invoiceId,
                'total_amount' => $totalAmount,
                'insurance_covered' => $insuranceCovered,
                'amount_due' => $amountDue
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to generate bill: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getBillingDetails($token, $admissionId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'access_billing')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            // Get admission details
            $sql = "SELECT pa.*, CONCAT(p.patient_fname, ' ', p.patient_lname) AS patient_name
                    FROM patient_admission pa
                    JOIN patients p ON pa.patient_id = p.patient_id
                    WHERE pa.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$admission) {
                throw new Exception("Admission not found");
            }
            
            // Get invoice details
            $sql = "SELECT bi.*, CONCAT(u.first_name, ' ', u.last_name) AS created_by_name
                    FROM bill_invoice bi
                    JOIN users u ON bi.created_by = u.user_id
                    WHERE bi.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            $invoiceItems = [];
            $payments = [];
            $claims = [];
            
            if ($invoice) {
                // Get invoice items
                $sql = "SELECT bii.*, st.svc_name
                        FROM bill_invoice_items bii
                        JOIN tbl_service_type st ON bii.svc_type_id = st.svc_type_id
                        WHERE bii.invoice_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$invoice['invoice_id']]);
                $invoiceItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get payments
                $sql = "SELECT bp.*, bpm.method_name, CONCAT(u.first_name, ' ', u.last_name) AS received_by_name
                        FROM bill_payment bp
                        JOIN bill_payment_method bpm ON bp.payment_method_id = bpm.payment_method_id
                        JOIN users u ON bp.received_by = u.user_id
                        WHERE bp.invoice_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$invoice['invoice_id']]);
                $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                // Get insurance claims
                $sql = "SELECT ic.*, ip.policy_number, prov.provider_name
                        FROM insurance_claim ic
                        JOIN insurance_policy ip ON ic.policy_id = ip.policy_id
                        JOIN insurance_provider prov ON ip.provider_id = prov.provider_id
                        WHERE ic.invoice_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$invoice['invoice_id']]);
                $claims = $stmt->fetchAll(PDO::FETCH_ASSOC);
            }
            
            // Calculate totals
            $totalPaid = array_sum(array_column($payments, 'amount'));
            $totalClaimed = array_sum(array_column($claims, 'approved_amount'));
            
            $response = [
                'status' => 'success',
                'admission' => $admission,
                'invoice' => $invoice,
                'invoice_items' => $invoiceItems,
                'payments' => $payments,
                'claims' => $claims,
                'total_paid' => $totalPaid,
                'total_claimed' => $totalClaimed
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get billing details: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function processPayment($token, $invoiceId, $amount, $paymentMethodId, $paymentDate = null) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'access_billing')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Get invoice details
            $sql = "SELECT * FROM bill_invoice WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invoice) {
                throw new Exception("Invoice not found");
            }
            
            if ($amount > $invoice['amount_due']) {
                throw new Exception("Payment amount exceeds amount due");
            }
            
            // Add payment
            $sql = "INSERT INTO bill_payment (invoice_id, received_by, amount, payment_method_id, payment_date, status) 
                    VALUES (?, ?, ?, ?, ?, 'Completed')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId, $userId, $amount, $paymentDate ?: date('Y-m-d')]);
            
            // Update invoice
            $newAmountDue = $invoice['amount_due'] - $amount;
            $newStatus = $invoice['status'];
            
            if ($newAmountDue <= 0) {
                $newStatus = 'Paid';
            } elseif ($invoice['status'] == 'Pending') {
                $newStatus = 'Partially Paid';
            }
            
            $sql = "UPDATE bill_invoice SET amount_due = ?, status = ? WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$newAmountDue, $newStatus, $invoiceId]);
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Payment processed successfully',
                'payment_id' => $pdo->lastInsertId(),
                'new_amount_due' => $newAmountDue,
                'new_status' => $newStatus
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to process payment: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function submitInsuranceClaim($token, $invoiceId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'access_billing')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Get invoice details
            $sql = "SELECT bi.*, pa.patient_id
                    FROM bill_invoice bi
                    JOIN patient_admission pa ON bi.admission_id = pa.admission_id
                    WHERE bi.invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invoice) {
                throw new Exception("Invoice not found");
            }
            
            // Check if claim already exists
            $sql = "SELECT * FROM insurance_claim WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $existingClaim = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingClaim) {
                throw new Exception("Insurance claim already submitted for this invoice");
            }
            
            // Get patient's active insurance policy
            $sql = "SELECT ip.*, ipc.coverage_type_id, ipc.coverage_limit, ipc.coverage_percent
                    FROM insurance_policy ip
                    JOIN insurance_policy_coverage ipc ON ip.policy_id = ipc.insurance_policy_id
                    WHERE ip.patient_id = ? AND ip.status = 'Active' AND ip.start_date <= CURDATE() AND ip.end_date >= CURDATE()
                    ORDER BY ip.policy_id DESC LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoice['patient_id']]);
            $policy = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$policy) {
                throw new Exception("No active insurance policy found for this patient");
            }
            
            // Calculate approved amount
            $approvedAmount = min($invoice['insurance_covered_amount'], $policy['coverage_limit']);
            
            // Submit claim
            $sql = "INSERT INTO insurance_claim (policy_id, invoice_id, submitted_by, status, submitted_date, approved_amount) 
                    VALUES (?, ?, ?, 'Submitted', CURDATE(), ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$policy['policy_id'], $invoiceId, $userId, $approvedAmount]);
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Insurance claim submitted successfully',
                'claim_id' => $pdo->lastInsertId(),
                'approved_amount' => $approvedAmount
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to submit insurance claim: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getBillingSummary($token, $startDate = null, $endDate = null) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'access_billing')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $whereClause = "";
            $params = [];
            
            if ($startDate && $endDate) {
                $whereClause = "WHERE bi.invoice_date BETWEEN ? AND ?";
                $params = [$startDate, $endDate];
            }
            
            // Get summary statistics
            $sql = "SELECT 
                    COUNT(*) as total_invoices,
                    SUM(bi.total_amount) as total_billed,
                    SUM(bi.insurance_covered_amount) as total_insurance_covered,
                    SUM(bi.amount_due) as total_outstanding,
                    SUM(CASE WHEN bi.status = 'Paid' THEN 1 ELSE 0 END) as paid_invoices,
                    SUM(CASE WHEN bi.status = 'Partially Paid' THEN 1 ELSE 0 END) as partially_paid_invoices,
                    SUM(CASE WHEN bi.status = 'Pending' THEN 1 ELSE 0 END) as pending_invoices
                    FROM bill_invoice bi " . $whereClause;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $summary = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get payment methods summary
            $sql = "SELECT bpm.method_name, COUNT(*) as count, SUM(bp.amount) as total
                    FROM bill_payment bp
                    JOIN bill_payment_method bpm ON bp.payment_method_id = bpm.payment_method_id";
            
            if ($whereClause) {
                $sql .= " JOIN bill_invoice bi ON bp.invoice_id = bi.invoice_id " . $whereClause;
            }
            
            $sql .= " GROUP BY bpm.method_name";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $paymentMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get top services by revenue
            $sql = "SELECT st.svc_name, COUNT(*) as count, SUM(bii.total_amount) as total_revenue
                    FROM bill_invoice_items bii
                    JOIN tbl_service_type st ON bii.svc_type_id = st.svc_type_id
                    JOIN bill_invoice bi ON bii.invoice_id = bi.invoice_id";
            
            if ($whereClause) {
                $sql .= " " . $whereClause;
            }
            
            $sql .= " GROUP BY st.svc_name ORDER BY total_revenue DESC LIMIT 5";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $topServices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'summary' => $summary,
                'payment_methods' => $paymentMethods,
                'top_services' => $topServices
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get billing summary: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getOutstandingInvoices($token) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'access_billing')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT bi.*, pa.admission_id, CONCAT(p.patient_fname, ' ', p.patient_lname) AS patient_name
                    FROM bill_invoice bi
                    JOIN patient_admission pa ON bi.admission_id = pa.admission_id
                    JOIN patients p ON pa.patient_id = p.patient_id
                    WHERE bi.amount_due > 0
                    ORDER BY bi.invoice_date ASC";
            $stmt = $pdo->query($sql);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'invoices' => $invoices
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get outstanding invoices: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    private function getAdmissionServices($pdo, $admissionId) {
        $services = [];
        
        // Get room charges
        $sql = "SELECT rs.room_id, rs.start_date, rs.end_date, r.daily_rate,
                       DATEDIFF(IF(rs.end_date = '0000-00-00', CURDATE(), rs.end_date), rs.start_date) + 1 as days,
                       1 as svc_type_id
                FROM tbl_room_stay rs
                JOIN tbl_room_assignment ra ON rs.room_assignment_id = ra.room_assignment_id
                JOIN tbl_room r ON rs.room_id = r.room_id
                WHERE ra.admission_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$admissionId]);
        $roomStays = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($roomStays as $stay) {
            $services[] = [
                'svc_type_id' => 1, // Room
                'reference_id' => $stay['room_id'],
                'quantity' => $stay['days'],
                'unit_price' => $stay['daily_rate'],
                'amount' => $stay['days'] * $stay['daily_rate']
            ];
        }
        
        // Get lab tests
        $sql = "SELECT li.labtest_id, li.quantity, li.charge, lt.unit_price,
                       3 as svc_type_id
                FROM tbl_labtest_item li
                JOIN patient_labtest pl ON li.patient_labtest_id = pl.patient_lab_id
                JOIN tbl_labtest lt ON li.labtest_id = lt.labtest_id
                WHERE pl.admission_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$admissionId]);
        $labTests = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($labTests as $test) {
            $services[] = [
                'svc_type_id' => 3, // Lab Test
                'reference_id' => $test['labtest_id'],
                'quantity' => $test['quantity'],
                'unit_price' => $test['unit_price'],
                'amount' => $test['charge']
            ];
        }
        
        // Get medications
        $sql = "SELECT mi.med_id, mi.quantity, mi.charge, m.unit_price,
                       4 as svc_type_id
                FROM tbl_medication_item mi
                JOIN patient_medication pm ON mi.medication_id = pm.medication_id
                JOIN tbl_medicine m ON mi.med_id = m.med_id
                WHERE pm.admission_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$admissionId]);
        $medications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($medications as $med) {
            $services[] = [
                'svc_type_id' => 4, // Medication
                'reference_id' => $med['med_id'],
                'quantity' => $med['quantity'],
                'unit_price' => $med['unit_price'],
                'amount' => $med['charge']
            ];
        }
        
        // Get surgeries
        $sql = "SELECT sp.surgery_id, sp.charge, s.surgery_price,
                       2 as svc_type_id
                FROM tbl_surgery_procedure sp
                JOIN patient_surgery ps ON sp.patient_surgery_id = ps.patient_surgery_id
                JOIN tbl_surgery s ON sp.surgery_id = s.surgery_id
                WHERE ps.admission_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$admissionId]);
        $surgeries = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($surgeries as $surgery) {
            $services[] = [
                'svc_type_id' => 2, // Surgery
                'reference_id' => $surgery['surgery_id'],
                'quantity' => 1,
                'unit_price' => $surgery['surgery_price'],
                'amount' => $surgery['charge']
            ];
        }
        
        // Get treatments
        $sql = "SELECT ts.treatment_id, ts.quantity, ts.charge, t.unit_price,
                       5 as svc_type_id
                FROM tbl_treatment_session ts
                JOIN patient_treatment pt ON ts.patient_treatment_id = pt.patient_treatment_id
                JOIN tbl_treatment t ON ts.treatment_id = t.treatment_id
                WHERE pt.admission_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$admissionId]);
        $treatments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($treatments as $treatment) {
            $services[] = [
                'svc_type_id' => 5, // Treatment
                'reference_id' => $treatment['treatment_id'],
                'quantity' => $treatment['quantity'],
                'unit_price' => $treatment['unit_price'],
                'amount' => $treatment['charge']
            ];
        }
        
        // Get doctor fees
        $sql = "SELECT doctor_fee_id, fee_amount,
                       6 as svc_type_id
                FROM tbl_doctor_fee
                WHERE admission_id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$admissionId]);
        $doctorFees = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($doctorFees as $fee) {
            $services[] = [
                'svc_type_id' => 6, // Doctor Fee
                'reference_id' => $fee['doctor_fee_id'],
                'quantity' => 1,
                'unit_price' => $fee['fee_amount'],
                'amount' => $fee['fee_amount']
            ];
        }
        
        return $services;
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
    $token = $_GET['token'] ?? '';
} else if ($method == 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
    $token = $payload['token'] ?? '';
}

$data = json_decode($json, true);
$obj = new BillingAPI();

switch ($operation) {
    case "generateBill":
        $admissionId = $data['admission_id'] ?? 0;
        $obj->generateBill($token, $admissionId);
        break;
        
    case "getBillingDetails":
        $admissionId = $data['admission_id'] ?? 0;
        $obj->getBillingDetails($token, $admissionId);
        break;
        
    case "processPayment":
        $invoiceId = $data['invoice_id'] ?? 0;
        $amount = $data['amount'] ?? 0;
        $paymentMethodId = $data['payment_method_id'] ?? 0;
        $paymentDate = $data['payment_date'] ?? null;
        $obj->processPayment($token, $invoiceId, $amount, $paymentMethodId, $paymentDate);
        break;
        
    case "submitInsuranceClaim":
        $invoiceId = $data['invoice_id'] ?? 0;
        $obj->submitInsuranceClaim($token, $invoiceId);
        break;
        
    case "getBillingSummary":
        $startDate = $data['start_date'] ?? null;
        $endDate = $data['end_date'] ?? null;
        $obj->getBillingSummary($token, $startDate, $endDate);
        break;
        
    case "getOutstandingInvoices":
        $obj->getOutstandingInvoices($token);
        break;
}
?>
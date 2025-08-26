<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class InsuranceAPI {
    function createClaim($policyId, $invoiceId, $submittedBy, $submittedDate) {
        include 'connection-pdo.php';
        try {
            // Get invoice details
            $sql = "SELECT * FROM bill_invoice WHERE invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invoice) {
                throw new Exception("Invoice not found");
            }
            
            // Get policy coverage details
            $sql = "SELECT ipc.*, ct.cov_name 
                    FROM insurance_policy_coverage ipc
                    JOIN tbl_coverage_type ct ON ipc.coverage_type_id = ct.coverage_type_id
                    WHERE ipc.insurance_policy_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$policyId]);
            $coverages = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate approved amount based on coverage
            $approvedAmount = 0;
            foreach ($coverages as $coverage) {
                // Simplified calculation - in real system this would be more complex
                $approvedAmount += $invoice['insurance_covered_amount'] * ($coverage['coverage_percent'] / 100);
                if ($approvedAmount > $coverage['coverage_limit']) {
                    $approvedAmount = $coverage['coverage_limit'];
                }
            }
            
            // Insert claim record
            $sql = "INSERT INTO insurance_claim (policy_id, invoice_id, submitted_by, status, submitted_date, approved_amount) 
                    VALUES (?, ?, ?, 'Submitted', ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$policyId, $invoiceId, $submittedBy, $submittedDate, $approvedAmount]);
            
            $response = [
                'status' => 'success',
                'message' => 'Insurance claim submitted successfully',
                'claim_id' => $pdo->lastInsertId(),
                'approved_amount' => $approvedAmount
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to create claim: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function updateClaimStatus($claimId, $status, $approvedAmount = null) {
        include 'connection-pdo.php';
        try {
            $sql = "UPDATE insurance_claim SET status = ?";
            $params = [$status, $claimId];
            
            if ($approvedAmount !== null) {
                $sql .= ", approved_amount = ?";
                array_unshift($params, $approvedAmount);
            }
            
            $sql .= " WHERE claim_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $response = [
                'status' => 'success',
                'message' => 'Claim status updated successfully'
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to update claim status: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getClaimsByInvoice($invoiceId) {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT ic.*, ip.policy_number, ip.provider_id, prov.provider_name
                    FROM insurance_claim ic
                    JOIN insurance_policy ip ON ic.policy_id = ip.policy_id
                    JOIN insurance_provider prov ON ip.provider_id = prov.provider_id
                    WHERE ic.invoice_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$invoiceId]);
            $claims = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'claims' => $claims
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get claims: ' . $e->getMessage()
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
$obj = new InsuranceAPI();

switch ($operation) {
    case "createClaim":
        $policyId = $data['policy_id'] ?? 0;
        $invoiceId = $data['invoice_id'] ?? 0;
        $submittedBy = $data['submitted_by'] ?? 0;
        $submittedDate = $data['submitted_date'] ?? date('Y-m-d');
        $obj->createClaim($policyId, $invoiceId, $submittedBy, $submittedDate);
        break;
        
    case "updateClaimStatus":
        $claimId = $data['claim_id'] ?? 0;
        $status = $data['status'] ?? '';
        $approvedAmount = $data['approved_amount'] ?? null;
        $obj->updateClaimStatus($claimId, $status, $approvedAmount);
        break;
        
    case "getClaimsByInvoice":
        $invoiceId = $data['invoice_id'] ?? 0;
        $obj->getClaimsByInvoice($invoiceId);
        break;
}
?>
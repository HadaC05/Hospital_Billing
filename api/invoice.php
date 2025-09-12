<?php
require_once __DIR__ . '/require_auth.php';
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class Invoices
{
    // Get patients with active admissions
    function getAdmissionsWithPatients()
    {
        include 'connection-pdo.php';
        
        try {
            $stmt = $conn->prepare(
                "SELECT pa.admission_id, pa.patient_id, pa.admission_date, pa.status, 
                        p.first_name, p.last_name, p.middle_name
                 FROM patient_admission pa
                 JOIN patients p ON pa.patient_id = p.patient_id
                 WHERE pa.status = 'active'
                 ORDER BY pa.admission_date DESC"
            );
            $stmt->execute();
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'admissions' => $admissions
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
    
    // Collect billable items for an admission from various sources
    function getBillableItems($admission_id)
    {
        include 'connection-pdo.php';
        if (!$admission_id) {
            echo json_encode(['success' => false, 'message' => 'Missing admission ID']);
            return;
        }
        try {
            // Get admission and patient info
            $stmt = $conn->prepare(
                "SELECT a.*, p.first_name, p.last_name, p.middle_name, p.birthdate, p.gender, p.address, p.mobile_number, p.email
                 FROM patient_admission a
                 JOIN patients p ON a.patient_id = p.patient_id
                 WHERE a.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$admission) {
                echo json_encode(['success' => false, 'message' => 'Admission not found']);
                return;
            }
            $items = [];
            
            // 1) Room stays - simplified query
            $stmt = $conn->prepare(
                "SELECT 
                    rs.room_stay_id AS svc_reference_id,
                    CONCAT('Room ', r.room_number, ' - ', rt.room_type_name) AS item_description,
                    r.daily_rate AS unit_price,
                    GREATEST(DATEDIFF(
                        CASE WHEN rs.end_date IS NULL THEN CURRENT_DATE() ELSE rs.end_date END,
                        rs.start_date
                    ) + 1, 1) AS quantity,
                    0 AS coverage_amount,
                    'Room' AS service_type_name, 
                    1 AS svc_type_id
                 FROM tbl_room_stay rs
                 JOIN tbl_room r ON rs.room_id = r.room_id
                 JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                 WHERE rs.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $roomItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $roomItems);
            
            // 1b) ER Initial Charge (one-time)
            $erCheck = $conn->prepare(
                "SELECT 1
                 FROM tbl_room_stay rs
                 JOIN tbl_room r ON rs.room_id = r.room_id
                 JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                 WHERE rs.admission_id = :admission_id
                   AND rt.room_type_name LIKE 'Emergency%'
                 LIMIT 1"
            );
            $erCheck->bindParam(':admission_id', $admission_id);
            $erCheck->execute();
            if ($erCheck->fetch(PDO::FETCH_ASSOC)) {
                $items[] = [
                    'svc_reference_id' => 0,
                    'item_description' => 'ER Initial Charge',
                    'unit_price' => 1500.00,
                    'quantity' => 1,
                    'coverage_amount' => 0,
                    'service_type_name' => 'Treatment',
                    'svc_type_id' => 5,
                ];
            }
            
            // 2) Check if we have any billable items at all
            if (empty($items)) {
                // Add a sample item for testing
                $items[] = [
                    'svc_reference_id' => 999,
                    'item_description' => 'Sample Service',
                    'unit_price' => 100.00,
                    'quantity' => 1,
                    'coverage_amount' => 0,
                    'service_type_name' => 'Test',
                    'svc_type_id' => 1,
                ];
            }
            
            echo json_encode([
                'success' => true,
                'admission' => $admission,
                'items' => $items,
                'debug' => [
                    'room_items_count' => count($roomItems),
                    'total_items_count' => count($items)
                ]
            ]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
    
    // Create invoice and items
    function createInvoice($data)
    {
        include 'connection-pdo.php';
        $admission_id = $data['admission_id'] ?? null;
        $patient_id = $data['patient_id'] ?? null;
        $items = $data['items'] ?? [];
        
        if (!$admission_id || !$patient_id || !is_array($items) || count($items) === 0) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            return;
        }
        
        try {
            $conn->beginTransaction();
            
            // Compute totals
            $total = 0;
            $covered = 0;
            foreach ($items as $it) {
                $line = (float)$it['unit_price'] * (float)$it['quantity'];
                $cov = isset($it['coverage_amount']) ? (float)$it['coverage_amount'] : 0.0;
                $total += $line;
                $covered += $cov;
            }
            $amount_due = $total - $covered;
            
            // Create invoice
            $stmt = $conn->prepare(
                "INSERT INTO bill_invoice (admission_id, patient_id, created_by, invoice_date, insurance_covered_amount, total_amount, amount_due, status)
                 VALUES (:admission_id, :patient_id, :created_by, CURRENT_DATE(), :covered, :total, :due, 'UNPAID')"
            );
            $created_by = $_SESSION['user_id'];
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->bindParam(':patient_id', $patient_id);
            $stmt->bindParam(':created_by', $created_by);
            $stmt->bindParam(':covered', $covered);
            $stmt->bindParam(':total', $total);
            $stmt->bindParam(':due', $amount_due);
            $stmt->execute();
            $invoice_id = (int)$conn->lastInsertId();
            
            // Insert items
            $stmt = $conn->prepare(
                "INSERT INTO bill_invoice_items (invoice_id, svc_type_id, svc_reference_id, quantity, unit_price, total_amount, coverage_amount, patient_payable)
                 VALUES (:invoice_id, :svc_type_id, :svc_reference_id, :quantity, :unit_price, :total_amount, :coverage_amount, :patient_payable)"
            );
            
            foreach ($items as $it) {
                $quantity = (float)$it['quantity'];
                $unit = (float)$it['unit_price'];
                $line = $quantity * $unit;
                $cov = isset($it['coverage_amount']) ? (float)$it['coverage_amount'] : 0.0;
                $pay = $line - $cov;
                $svc_type_id = (int)($it['svc_type_id'] ?? 0);
                $svc_reference_id = (int)($it['svc_reference_id'] ?? 0);
                
                $stmt->execute([
                    ':invoice_id' => $invoice_id,
                    ':svc_type_id' => $svc_type_id,
                    ':svc_reference_id' => $svc_reference_id,
                    ':quantity' => $quantity,
                    ':unit_price' => $unit,
                    ':total_amount' => $line,
                    ':coverage_amount' => $cov,
                    ':patient_payable' => $pay,
                ]);
            }
            
            $conn->commit();
            echo json_encode(['success' => true, 'invoice_id' => $invoice_id]);
        } catch (PDOException $e) {
            $conn->rollBack();
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
$inv = new Invoices();

switch ($operation) {
    case 'getAdmissionsWithPatients':
        $inv->getAdmissionsWithPatients();
        break;
    case 'getBillableItems':
        $admission_id = $data['admission_id'] ?? null;
        $inv->getBillableItems($admission_id);
        break;
    case 'createInvoice':
        $inv->createInvoice($data);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}
<?php
require_once __DIR__ . '/require_auth.php';
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class Invoices
{
    // Collect billable items for an admission from various sources
    function getBillableItems($admission_id)
    {
        include 'connection-pdo.php';
        try {
            // Admission + patient info
            $sql = "
            SELECT 
                a.admission_id, 
                a.admission_date, 
                p.first_name, 
                p.last_name, 
                p.middle_name
            FROM patient_admission a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.admission_id = :admission_id
        ";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$admission) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Admission not found'
                ]);
                return;
            }

            $items = [];

            // Get all medicines (both paid and unpaid)
            $sqlMed = "
            SELECT 
                rmi.item_id AS svc_reference_id, 
                m.med_name AS item_description,
                m.unit_price AS unit_price, 
                rmi.quantity, 0 AS coverage_amount,
                'Medication' AS service_type_name, 
                4 AS svc_type_id,
                'request_medicine_items' AS reference_table,
                rmi.billed_status AS status
            FROM request_medicine_items rmi
            JOIN request_medicine_batch rmb ON rmi.batch_id = rmb.batch_id
            JOIN tbl_medicine m ON rmi.med_id = m.med_id
            WHERE rmi.status = 'administered' 
            AND rmb.admission_id = :admission_id
        ";
            $stmt = $conn->prepare($sqlMed);
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $medItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $medItems);

            // Get all lab tests (both paid and unpaid)
            $sqlLab = "
            SELECT 
                rli.item_id AS svc_reference_id, 
                lt.test_name AS item_description,
                lt.unit_price, 
                1 AS quantity, 
                0 AS coverage_amount,
                'Lab Test' AS service_type_name, 
                3 AS svc_type_id,
                'request_labtest_items' AS reference_table,
                rli.billed_status AS status
            FROM request_labtest_items rli
            JOIN request_labtest_batch rlb ON rli.batch_id = rlb.batch_id
            JOIN tbl_labtest lt ON rli.labtest_id = lt.labtest_id
            WHERE rli.status = 'completed' 
            AND rlb.admission_id = :admission_id
        ";
            $stmt = $conn->prepare($sqlLab);
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $labItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $labItems);

            echo json_encode([
                'success' => true,
                'admission' => $admission,
                'items' => $items,
                'debug' => [
                    'medicines' => count($medItems),
                    'lab_tests' => count($labItems),
                    'total' => count($items)
                ]
            ]);
        } catch (PDOException $e) {
            error_log("Error in getBillableItems: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }


    // Get admissions with patient info for dropdown
    function getAdmissions()
    {
        include 'connection-pdo.php';
        try {
            $stmt = $conn->prepare(
                "SELECT a.admission_id, a.patient_id, a.admission_date, a.status, 
                        p.first_name, p.last_name, p.middle_name
                 FROM patient_admission a
                 JOIN patients p ON a.patient_id = p.patient_id
                 ORDER BY a.admission_date DESC"
            );
            $stmt->execute();
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'admissions' => $admissions]);
        } catch (PDOException $e) {
            error_log("Error in getAdmissions: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // Create invoice and items
    // Create invoice and items
    function createInvoice($data)
    {
        include 'connection-pdo.php';
        $admission_id = $data['admission_id'] ?? null;
        $items = $data['items'] ?? [];
        if (!$admission_id || !is_array($items) || count($items) === 0) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            return;
        }
        try {
            $conn->beginTransaction();

            // Get patient_id for this admission
            $stmt = $conn->prepare("SELECT patient_id FROM patient_admission WHERE admission_id = :admission_id");
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);
            $patient_id = $admission['patient_id'];

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
             VALUES (:admission_id, :patient_id, :created_by, CURRENT_DATE(), :covered, :total, :due, 'draft')"
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
                "INSERT INTO bill_invoice_items (invoice_id, svc_type_id, quantity, unit_price, total_amount, reference_table, reference_id, coverage_amount, patient_payable)
             VALUES (:invoice_id, :svc_type_id, :quantity, :unit_price, :total_amount, :reference_table, :reference_id, :coverage_amount, :patient_payable)"
            );

            foreach ($items as $it) {
                $quantity = (float)$it['quantity'];
                $unit = (float)$it['unit_price'];
                $line = $quantity * $unit;
                $cov = isset($it['coverage_amount']) ? (float)$it['coverage_amount'] : 0.0;
                $pay = $line - $cov;
                $svc_type_id = (int)($it['svc_type_id'] ?? 0);
                $svc_reference_id = (int)($it['svc_reference_id'] ?? 0);

                // Determine reference table based on service type
                $reference_table = '';
                switch ($svc_type_id) {
                    case 4:
                        $reference_table = 'request_medicine_items';
                        break;
                    case 3:
                        // Lab test
                        $reference_table = 'request_labtest_items';
                        break;
                    default:
                        $reference_table = '';
                        break;
                }

                $stmt->execute([
                    ':invoice_id' => $invoice_id,
                    ':svc_type_id' => $svc_type_id,
                    ':quantity' => $quantity,
                    ':unit_price' => $unit,
                    ':total_amount' => $line,
                    ':reference_table' => $reference_table,
                    ':reference_id' => $svc_reference_id,
                    ':coverage_amount' => $cov,
                    ':patient_payable' => $pay,
                ]);

                // Update billed status for items that support it
                // Update billed status for medicine items
                if ($reference_table === 'request_medicine_items') {
                    $updateStmt = $conn->prepare("UPDATE request_medicine_items SET billed_status = 'yes' WHERE item_id = :reference_id");
                    $updateStmt->execute([':reference_id' => $svc_reference_id]);
                }
                // Update billed status for lab test items
                else if ($reference_table === 'request_labtest_items') {
                    $updateStmt = $conn->prepare("UPDATE request_labtest_items SET billed_status = 'yes' WHERE item_id = :reference_id");
                    $updateStmt->execute([':reference_id' => $svc_reference_id]);
                }
            }

            $conn->commit();
            echo json_encode(['success' => true, 'invoice_id' => $invoice_id]);
        } catch (PDOException $e) {
            $conn->rollBack();
            error_log("Error in createInvoice: " . $e->getMessage());
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
    case 'getBillableItems':
        $admission_id = $data['admission_id'] ?? null;
        $inv->getBillableItems($admission_id);
        break;
    case 'getAdmissions':
        $inv->getAdmissions();
        break;
    case 'createInvoice':
        $inv->createInvoice($data);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}

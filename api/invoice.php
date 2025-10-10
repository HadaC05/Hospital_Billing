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
            $stmt = $conn->prepare(
                "SELECT a.admission_id, a.admission_date, p.first_name, p.last_name, p.middle_name
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

            // 1) Room stays
            $stmt = $conn->prepare(
                "SELECT 
                    rs.room_stay_id AS svc_reference_id,
                    CONCAT('Room ', r.room_number, ' - ', rt.room_type_name) AS item_description,
                    r.daily_rate AS unit_price,
                    GREATEST(DATEDIFF(
                        CASE WHEN rs.end_date IS NULL OR rs.end_date = '0000-00-00' THEN CURRENT_DATE() ELSE rs.end_date END,
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

            // 2) Surgeries performed
            $stmt = $conn->prepare(
                "SELECT sp.surgery_procedure_id AS svc_reference_id, s.surgery_name AS item_description,
                        sp.charge AS unit_price, 1 AS quantity, 0 AS coverage_amount,
                        'Surgery' AS service_type_name, 2 AS svc_type_id
                 FROM tbl_surgery_procedure sp
                 JOIN tbl_surgery s ON sp.surgery_id = s.surgery_id
                 JOIN patient_surgery ps ON sp.patient_surgery_id = ps.patient_surgery_id
                 WHERE ps.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $surgeryItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $surgeryItems);

            // 3) Lab tests items - Using doctor_requests
            $stmt = $conn->prepare(
                "SELECT dr.request_id AS svc_reference_id, lt.test_name AS item_description,
                        lt.unit_price AS unit_price, dr.quantity, 0 AS coverage_amount,
                        'Lab Test' AS service_type_name, 3 AS svc_type_id
                 FROM doctor_requests dr
                 JOIN tbl_labtest lt ON dr.item_id = lt.labtest_id
                 WHERE dr.patient_id = (SELECT patient_id FROM patient_admission WHERE admission_id = :admission_id)
                   AND dr.request_type = 'labtest'
                   AND dr.status = 'completed'"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $labItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $labItems);

            // 4) Medication items - Using patient_medication
            $stmt = $conn->prepare(
                "SELECT pm.medication_id AS svc_reference_id, m.med_name AS item_description,
                        pm.unit_price AS unit_price, pm.quantity, 0 AS coverage_amount,
                        'Medication' AS service_type_name, 4 AS svc_type_id
                 FROM patient_medication pm
                 JOIN tbl_medicine m ON pm.med_id = m.med_id
                 WHERE pm.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $medItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $medItems);

            // 5) Treatment sessions
            $stmt = $conn->prepare(
                "SELECT ts.treatment_session_id AS svc_reference_id, t.treatment_name AS item_description,
                        ts.charge AS unit_price, ts.quantity, 0 AS coverage_amount,
                        'Treatment' AS service_type_name, 5 AS svc_type_id
                 FROM tbl_treatment_session ts
                 JOIN tbl_treatment t ON ts.treatment_id = t.treatment_id
                 JOIN patient_treatment pt ON ts.patient_treatment_id = pt.patient_treatment_id
                 WHERE pt.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $treatmentItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $treatmentItems);

            // 6) Administered medicines from request_medicine_items
            $stmt = $conn->prepare(
                "SELECT rmi.item_id AS svc_reference_id, m.med_name AS item_description,
            m.unit_price AS unit_price, rmi.quantity, 0 AS coverage_amount,
            'Medication' AS service_type_name, 4 AS svc_type_id,
            'request_medicine_items' AS reference_table
                FROM request_medicine_items rmi
                JOIN request_medicine_batch rmb ON rmi.batch_id = rmb.batch_id
                JOIN tbl_medicine m ON rmi.med_id = m.med_id
                WHERE rmi.status = 'administered' 
                AND rmi.billed_status = 'no'
                AND rmb.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $administeredMedItems = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $items = array_merge($items, $administeredMedItems);

            // Debug: Log item counts
            error_log("Items for admission $admission_id: " . json_encode([
                'rooms' => count($roomItems),
                'surgeries' => count($surgeryItems),
                'labs' => count($labItems),
                'meds' => count($medItems),
                'treatments' => count($treatmentItems),
                'total' => count($items)
            ]));

            echo json_encode([
                'success' => true,
                'admission' => $admission,
                'items' => $items,
                'debug' => [
                    'rooms' => count($roomItems),
                    'surgeries' => count($surgeryItems),
                    'labs' => count($labItems),
                    'meds' => count($medItems),
                    'treatments' => count($treatmentItems),
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
                // In your createInvoice method, update the switch case to include the new table
                switch ($svc_type_id) {
                    case 1:
                        $reference_table = 'tbl_room_stay';
                        break;
                    case 2:
                        $reference_table = 'patient_surgery';
                        break;
                    case 3:
                        $reference_table = 'doctor_requests';
                        break;
                    case 4:
                        // Check if it's from the new medicine system
                        if (isset($it['reference_table']) && $it['reference_table'] === 'request_medicine_items') {
                            $reference_table = 'request_medicine_items';
                        } else {
                            $reference_table = 'patient_medication';
                        }
                        break;
                    case 5:
                        $reference_table = 'patient_treatment';
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

                // After inserting the invoice item, update the billed status if it's from request_medicine_items
                if ($reference_table === 'request_medicine_items') {
                    $updateStmt = $conn->prepare("UPDATE request_medicine_items SET billed_status = 'yes' WHERE item_id = :reference_id");
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

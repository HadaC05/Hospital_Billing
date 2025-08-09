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
                "SELECT a.admission_id, a.admission_date, p.patient_fname, p.patient_lname, p.patient_mname
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
                "SELECT rs.room_stay_id AS svc_reference_id, rt.room_type_name AS item_description,
                        rs.charge AS unit_price, 1 AS quantity, 0 AS coverage_amount,
                        'Room' AS service_type_name, 1 AS svc_type_id
                 FROM tbl_room_stay rs
                 JOIN tbl_room r ON rs.room_id = r.room_id
                 JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                 JOIN tbl_room_assignment ra ON rs.room_assignment_id = ra.room_assignment_id
                 WHERE ra.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $items = array_merge($items, $stmt->fetchAll(PDO::FETCH_ASSOC));

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
            $items = array_merge($items, $stmt->fetchAll(PDO::FETCH_ASSOC));

            // 3) Lab tests items
            $stmt = $conn->prepare(
                "SELECT li.labtest_item_id AS svc_reference_id, lt.test_name AS item_description,
                        li.charge AS unit_price, li.quantity, 0 AS coverage_amount,
                        'Lab Test' AS service_type_name, 3 AS svc_type_id
                 FROM tbl_labtest_item li
                 JOIN tbl_labtest lt ON li.labtest_id = lt.labtest_id
                 JOIN patient_labtest pl ON li.patient_labtest_id = pl.patient_lab_id
                 WHERE pl.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $items = array_merge($items, $stmt->fetchAll(PDO::FETCH_ASSOC));

            // 4) Medication items
            $stmt = $conn->prepare(
                "SELECT mi.med_item_id AS svc_reference_id, m.med_name AS item_description,
                        mi.charge AS unit_price, mi.quantity, 0 AS coverage_amount,
                        'Medication' AS service_type_name, 4 AS svc_type_id
                 FROM tbl_medication_item mi
                 JOIN tbl_medicine m ON mi.med_id = m.med_id
                 JOIN patient_medication pm ON mi.medication_id = pm.medication_id
                 WHERE pm.admission_id = :admission_id"
            );
            $stmt->bindParam(':admission_id', $admission_id);
            $stmt->execute();
            $items = array_merge($items, $stmt->fetchAll(PDO::FETCH_ASSOC));

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
            $items = array_merge($items, $stmt->fetchAll(PDO::FETCH_ASSOC));

            echo json_encode([
                'success' => true,
                'admission' => $admission,
                'items' => $items
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
        $items = $data['items'] ?? [];

        if (!$admission_id || !is_array($items) || count($items) === 0) {
            echo json_encode(['success' => false, 'message' => 'Missing data']);
            return;
        }

        try {
            $conn->beginTransaction();

            // Compute totals
            $total = 0; $covered = 0;
            foreach ($items as $it) {
                $line = (float)$it['unit_price'] * (float)$it['quantity'];
                $cov = isset($it['coverage_amount']) ? (float)$it['coverage_amount'] : 0.0;
                $total += $line;
                $covered += $cov;
            }
            $amount_due = $total - $covered;

            // Create invoice
            $stmt = $conn->prepare(
                "INSERT INTO bill_invoice (admission_id, created_by, invoice_date, insurance_covered_amount, total_amount, amount_due, status)
                 VALUES (:admission_id, :created_by, CURRENT_DATE(), :covered, :total, :due, 'UNPAID')"
            );
            $created_by = $_SESSION['user_id'];
            $stmt->bindParam(':admission_id', $admission_id);
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



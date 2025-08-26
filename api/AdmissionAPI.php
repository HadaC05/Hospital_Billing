<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class AdmissionAPI {
    function createAdmission($patientId, $admittedBy, $admissionDate, $admissionReason, $roomId = null) {
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Insert admission record
            $sql = "INSERT INTO patient_admission (patient_id, admitted_by, admission_date, discharge_date, admission_reason, status) 
                    VALUES (?, ?, ?, '0000-00-00', ?, 'Admitted')";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$patientId, $admittedBy, $admissionDate, $admissionReason]);
            $admissionId = $pdo->lastInsertId();
            
            // If room is assigned, create room assignment and stay record
            if ($roomId) {
                // Create room assignment
                $sql = "INSERT INTO tbl_room_assignment (admission_id, record_date) VALUES (?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$admissionId, $admissionDate]);
                $assignmentId = $pdo->lastInsertId();
                
                // Create room stay record
                $sql = "INSERT INTO tbl_room_stay (room_assignment_id, room_id, start_date, end_date, charge, assigned_by) 
                        VALUES (?, ?, ?, '0000-00-00', 0, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$assignmentId, $roomId, $admissionDate, $admittedBy]);
                
                // Update room availability
                $sql = "UPDATE tbl_room SET is_available = 0 WHERE room_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$roomId]);
            }
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Admission created successfully',
                'admission_id' => $admissionId,
                'room_assigned' => $roomId ? true : false
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to create admission: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getAdmission($admissionId) {
        include 'connection-pdo.php';
        try {
            // Get admission details
            $sql = "SELECT pa.*, p.patient_fname, p.patient_lname, p.patient_mname, p.birthdate, p.mobile_number, p.email,
                           u.username AS admitted_by_name
                    FROM patient_admission pa
                    JOIN patients p ON pa.patient_id = p.patient_id
                    JOIN users u ON pa.admitted_by = u.user_id
                    WHERE pa.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$admission) {
                throw new Exception("Admission not found");
            }
            
            // Get current room assignment
            $sql = "SELECT rs.*, r.room_number, rt.room_type_name, r.daily_rate
                    FROM tbl_room_stay rs
                    JOIN tbl_room_assignment ra ON rs.room_assignment_id = ra.room_assignment_id
                    JOIN tbl_room r ON rs.room_id = r.room_id
                    JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                    WHERE ra.admission_id = ? AND rs.end_date = '0000-00-00'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $currentRoom = $stmt->fetch(PDO::FETCH_ASSOC);
            
            // Get all services during admission
            $services = [
                'lab_tests' => [],
                'medications' => [],
                'surgeries' => [],
                'treatments' => []
            ];
            
            // Get lab tests
            $sql = "SELECT pli.*, lt.test_name, u.username AS performed_by_name
                    FROM tbl_labtest_item pli
                    JOIN patient_labtest pl ON pli.patient_labtest_id = pl.patient_lab_id
                    JOIN tbl_labtest lt ON pli.labtest_id = lt.labtest_id
                    JOIN users u ON pli.performed_by = u.user_id
                    WHERE pl.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $services['lab_tests'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get medications
            $sql = "SELECT mi.*, m.med_name, u.username AS administered_by_name
                    FROM tbl_medication_item mi
                    JOIN patient_medication pm ON mi.medication_id = pm.medication_id
                    JOIN tbl_medicine m ON mi.med_id = m.med_id
                    JOIN users u ON mi.administered_by = u.user_id
                    WHERE pm.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $services['medications'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get surgeries
            $sql = "SELECT sp.*, s.surgery_name, u.username AS performed_by_name
                    FROM tbl_surgery_procedure sp
                    JOIN patient_surgery ps ON sp.patient_surgery_id = ps.patient_surgery_id
                    JOIN tbl_surgery s ON sp.surgery_id = s.surgery_id
                    JOIN users u ON sp.performed_by = u.user_id
                    WHERE ps.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $services['surgeries'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get treatments
            $sql = "SELECT ts.*, t.treatment_name, u.username AS performed_by_name
                    FROM tbl_treatment_session ts
                    JOIN patient_treatment pt ON ts.patient_treatment_id = pt.patient_treatment_id
                    JOIN tbl_treatment t ON ts.treatment_id = t.treatment_id
                    JOIN users u ON ts.performed_by = u.user_id
                    WHERE pt.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $services['treatments'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get doctor fees
            $sql = "SELECT df.*, u.username AS doctor_name
                    FROM tbl_doctor_fee df
                    JOIN users u ON df.doctor_id = u.user_id
                    WHERE df.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $doctorFees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get invoices
            $sql = "SELECT bi.*, u.username AS created_by_name
                    FROM bill_invoice bi
                    JOIN users u ON bi.created_by = u.user_id
                    WHERE bi.admission_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$admissionId]);
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'admission' => $admission,
                'current_room' => $currentRoom,
                'services' => $services,
                'doctor_fees' => $doctorFees,
                'invoices' => $invoices
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get admission: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function updateAdmission($admissionId, $dischargeDate = null, $status = null, $admissionReason = null) {
        include 'connection-pdo.php';
        try {
            $updateFields = [];
            $params = [];
            
            if ($dischargeDate) {
                $updateFields[] = "discharge_date = ?";
                $params[] = $dischargeDate;
            }
            
            if ($status) {
                $updateFields[] = "status = ?";
                $params[] = $status;
            }
            
            if ($admissionReason) {
                $updateFields[] = "admission_reason = ?";
                $params[] = $admissionReason;
            }
            
            if (empty($updateFields)) {
                throw new Exception("No fields to update");
            }
            
            $sql = "UPDATE patient_admission SET " . implode(", ", $updateFields) . " WHERE admission_id = ?";
            $params[] = $admissionId;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            // If patient is discharged, release the room
            if ($status == 'Discharged') {
                $sql = "UPDATE tbl_room_stay rs
                        JOIN tbl_room_assignment ra ON rs.room_assignment_id = ra.room_assignment_id
                        SET rs.end_date = ?
                        WHERE ra.admission_id = ? AND rs.end_date = '0000-00-00'";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$dischargeDate, $admissionId]);
                
                // Update room availability
                $sql = "UPDATE tbl_room r
                        SET r.is_available = 1
                        WHERE r.room_id IN (
                            SELECT rs.room_id
                            FROM tbl_room_stay rs
                            JOIN tbl_room_assignment ra ON rs.room_assignment_id = ra.room_assignment_id
                            WHERE ra.admission_id = ? AND rs.end_date = ?
                        )";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$admissionId, $dischargeDate]);
            }
            
            $response = [
                'status' => 'success',
                'message' => 'Admission updated successfully'
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to update admission: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    /**
     * Add multiple lab tests for an admission in a single transaction.
     * @param int $admissionId
     * @param array $items Array of { labtest_id, quantity }
     * @param string $datePerformed
     * @param int $performedBy User ID performing the tests
     */
    public function addLabTestsBatch($admissionId, $items, $datePerformed, $performedBy)
    {
        header('Content-Type: application/json');
        try {
            if (!$admissionId || !is_array($items) || count($items) === 0 || !$performedBy) {
                echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
                return;
            }

            include 'connection-pdo.php';

            // normalize date
            if (!$datePerformed) {
                $datePerformed = date('Y-m-d');
            }

            $pdo->beginTransaction();

            // Validate admission exists
            $stmt = $pdo->prepare('SELECT admission_id FROM patient_admission WHERE admission_id = ? FOR UPDATE');
            $stmt->execute([$admissionId]);
            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Admission not found']);
                return;
            }

            // Insert patient_labtest header
            $stmt = $pdo->prepare('INSERT INTO patient_labtest (admission_id, record_date) VALUES (?, ?)');
            $stmt->execute([$admissionId, $datePerformed]);
            $patientLabtestId = (int)$pdo->lastInsertId();

            // Prepare statements
            $priceStmt = $pdo->prepare('SELECT unit_price FROM tbl_labtest WHERE labtest_id = ?');
            $itemStmt = $pdo->prepare('INSERT INTO tbl_labtest_item (patient_labtest_id, labtest_id, performed_by, quantity, charge, date_performed) VALUES (?, ?, ?, ?, ?, ?)');

            foreach ($items as $it) {
                $labtestId = isset($it['labtest_id']) ? (int)$it['labtest_id'] : 0;
                $qty = isset($it['quantity']) ? (int)$it['quantity'] : 0;
                if ($labtestId <= 0 || $qty <= 0) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Invalid lab test item']);
                    return;
                }

                // Fetch price
                $priceStmt->execute([$labtestId]);
                $row = $priceStmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Lab test not found: ' . $labtestId]);
                    return;
                }
                $unitPrice = (float)$row['unit_price'];
                $charge = $unitPrice * $qty;

                // Insert item
                $itemStmt->execute([$patientLabtestId, $labtestId, $performedBy, $qty, $charge, $datePerformed]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Lab tests added successfully']);
        } catch (Exception $ex) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['status' => 'error', 'message' => 'Failed to add lab tests: ' . $ex->getMessage()]);
        }
    }

    /**
     * Add multiple surgeries for an admission in a single transaction.
     * @param int $admissionId
     * @param array $items Array of { surgery_id, quantity }
     * @param string $datePerformed
     * @param int $performedBy User ID performing the surgeries
     */
    public function addSurgeriesBatch($admissionId, $items, $datePerformed, $performedBy)
    {
        header('Content-Type: application/json');
        try {
            if (!$admissionId || !is_array($items) || count($items) === 0 || !$performedBy) {
                echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
                return;
            }

            include 'connection-pdo.php';

            if (!$datePerformed) {
                $datePerformed = date('Y-m-d');
            }

            $pdo->beginTransaction();

            // Validate admission exists
            $stmt = $pdo->prepare('SELECT admission_id FROM patient_admission WHERE admission_id = ? FOR UPDATE');
            $stmt->execute([$admissionId]);
            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Admission not found']);
                return;
            }

            // Insert patient_surgery header
            $stmt = $pdo->prepare('INSERT INTO patient_surgery (admission_id, record_date) VALUES (?, ?)');
            $stmt->execute([$admissionId, $datePerformed]);
            $patientSurgeryId = (int)$pdo->lastInsertId();

            // Prepare statements
            $priceStmt = $pdo->prepare('SELECT surgery_price FROM tbl_surgery WHERE surgery_id = ?');
            $itemStmt = $pdo->prepare('INSERT INTO tbl_surgery_procedure (patient_surgery_id, surgery_id, performed_by, quantity, charge, date_performed) VALUES (?, ?, ?, ?, ?, ?)');

            foreach ($items as $it) {
                $surgeryId = isset($it['surgery_id']) ? (int)$it['surgery_id'] : 0;
                $qty = isset($it['quantity']) ? (int)$it['quantity'] : 0;
                if ($surgeryId <= 0 || $qty <= 0) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Invalid surgery item']);
                    return;
                }

                $priceStmt->execute([$surgeryId]);
                $row = $priceStmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Surgery not found: ' . $surgeryId]);
                    return;
                }
                $unitPrice = (float)$row['surgery_price'];
                $charge = $unitPrice * $qty;

                $itemStmt->execute([$patientSurgeryId, $surgeryId, $performedBy, $qty, $charge, $datePerformed]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Surgeries added successfully']);
        } catch (Exception $ex) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['status' => 'error', 'message' => 'Failed to add surgeries: ' . $ex->getMessage()]);
        }
    }

    /**
     * Add multiple treatments for an admission in a single transaction.
     * @param int $admissionId
     * @param array $items Array of { treatment_id, quantity }
     * @param string $datePerformed
     * @param int $performedBy User ID performing the treatments
     */
    public function addTreatmentsBatch($admissionId, $items, $datePerformed, $performedBy)
    {
        header('Content-Type: application/json');
        try {
            if (!$admissionId || !is_array($items) || count($items) === 0 || !$performedBy) {
                echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
                return;
            }

            include 'connection-pdo.php';

            if (!$datePerformed) {
                $datePerformed = date('Y-m-d');
            }

            $pdo->beginTransaction();

            // Validate admission exists
            $stmt = $pdo->prepare('SELECT admission_id FROM patient_admission WHERE admission_id = ? FOR UPDATE');
            $stmt->execute([$admissionId]);
            if ($stmt->rowCount() === 0) {
                $pdo->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Admission not found']);
                return;
            }

            // Insert patient_treatment header
            $stmt = $pdo->prepare('INSERT INTO patient_treatment (admission_id, record_date) VALUES (?, ?)');
            $stmt->execute([$admissionId, $datePerformed]);
            $patientTreatmentId = (int)$pdo->lastInsertId();

            // Prepare statements
            $priceStmt = $pdo->prepare('SELECT unit_price FROM tbl_treatment WHERE treatment_id = ?');
            $itemStmt = $pdo->prepare('INSERT INTO tbl_treatment_session (patient_treatment_id, treatment_id, performed_by, quantity, charge, date_performed) VALUES (?, ?, ?, ?, ?, ?)');

            foreach ($items as $it) {
                $treatmentId = isset($it['treatment_id']) ? (int)$it['treatment_id'] : 0;
                $qty = isset($it['quantity']) ? (int)$it['quantity'] : 0;
                if ($treatmentId <= 0 || $qty <= 0) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Invalid treatment item']);
                    return;
                }

                $priceStmt->execute([$treatmentId]);
                $row = $priceStmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Treatment not found: ' . $treatmentId]);
                    return;
                }
                $unitPrice = (float)$row['unit_price'];
                $charge = $unitPrice * $qty;

                $itemStmt->execute([$patientTreatmentId, $treatmentId, $performedBy, $qty, $charge, $datePerformed]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Treatments added successfully']);
        } catch (Exception $ex) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['status' => 'error', 'message' => 'Failed to add treatments: ' . $ex->getMessage()]);
        }
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
$obj = new AdmissionAPI();

switch ($operation) {
    case "createAdmission":
        $patientId = $data['patient_id'] ?? 0;
        $admittedBy = $data['admitted_by'] ?? 0;
        $admissionDate = $data['admission_date'] ?? date('Y-m-d');
        $admissionReason = $data['admission_reason'] ?? '';
        $roomId = $data['room_id'] ?? null;
        $obj->createAdmission($patientId, $admittedBy, $admissionDate, $admissionReason, $roomId);
        break;
        
    case "getAdmission":
        $admissionId = $data['admission_id'] ?? 0;
        $obj->getAdmission($admissionId);
        break;
        
    case "updateAdmission":
        $admissionId = $data['admission_id'] ?? 0;
        $dischargeDate = $data['discharge_date'] ?? null;
        $status = $data['status'] ?? null;
        $admissionReason = $data['admission_reason'] ?? null;
        $obj->updateAdmission($admissionId, $dischargeDate, $status, $admissionReason);
        break;
        
    case "assignRoom":
        $admissionId = $data['admission_id'] ?? 0;
        $roomId = $data['room_id'] ?? 0;
        $assignedBy = $data['assigned_by'] ?? 0;
        $startDate = $data['start_date'] ?? date('Y-m-d');
        $obj->assignRoom($admissionId, $roomId, $assignedBy, $startDate);
        break;

    case "dispenseMedicine":
        $admissionId = $data['admission_id'] ?? 0;
        $medId = $data['med_id'] ?? 0;
        $quantity = $data['quantity'] ?? 0;
        $dateGiven = $data['date_given'] ?? date('Y-m-d');
        $administeredBy = $data['administered_by'] ?? 0;
        $obj->dispenseMedicine((int)$admissionId, (int)$medId, (int)$quantity, $dateGiven, (int)$administeredBy);
        break;
    
    case "dispenseMedicinesBatch":
        $admissionId = $data['admission_id'] ?? 0;
        $items = $data['items'] ?? [];
        $dateGiven = $data['date_given'] ?? date('Y-m-d');
        $administeredBy = $data['administered_by'] ?? 0;
        $obj->dispenseMedicinesBatch((int)$admissionId, $items, $dateGiven, (int)$administeredBy);
        break;
        
    case "addLabTestsBatch":
        $admissionId = $data['admission_id'] ?? 0;
        $items = $data['items'] ?? [];
        $datePerformed = $data['date_performed'] ?? date('Y-m-d');
        $performedBy = $data['performed_by'] ?? 0;
        $obj->addLabTestsBatch((int)$admissionId, $items, $datePerformed, (int)$performedBy);
        break;
    
    case "addSurgeriesBatch":
        $admissionId = $data['admission_id'] ?? 0;
        $items = $data['items'] ?? [];
        $datePerformed = $data['date_performed'] ?? date('Y-m-d');
        $performedBy = $data['performed_by'] ?? 0;
        $obj->addSurgeriesBatch((int)$admissionId, $items, $datePerformed, (int)$performedBy);
        break;

    case "addTreatmentsBatch":
        $admissionId = $data['admission_id'] ?? 0;
        $items = $data['items'] ?? [];
        $datePerformed = $data['date_performed'] ?? date('Y-m-d');
        $performedBy = $data['performed_by'] ?? 0;
        $obj->addTreatmentsBatch((int)$admissionId, $items, $datePerformed, (int)$performedBy);
        break;
        
    case "getAdmissionsByPatient":
        $patientId = $data['patient_id'] ?? 0;
        $obj->getAdmissionsByPatient($patientId);
        break;
        
    case "getActiveAdmissions":
        $obj->getActiveAdmissions();
        break;
}
?>
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
                    LEFT JOIN users u ON pli.performed_by = u.user_id
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
     * Request multiple lab tests without marking them as performed.
     * Requires DB columns introduced by migration: requested_by, requested_date, status on tbl_labtest_item
     * and optional requested_by/request_date on patient_labtest (header kept for grouping).
     * $items = [{ labtest_id, quantity }]
     */
    public function requestLabTestsBatch($admissionId, $items, $requestedDate, $requestedBy)
    {
        header('Content-Type: application/json');
        try {
            if ($admissionId <= 0 || !is_array($items) || count($items) === 0 || $requestedBy <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
                return;
            }

            include 'connection-pdo.php';

            if (!$requestedDate) {
                $requestedDate = date('Y-m-d');
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

            // Insert patient_labtest header (record_date used as request date for grouping)
            $stmt = $pdo->prepare('INSERT INTO patient_labtest (admission_id, record_date) VALUES (?, ?)');
            $stmt->execute([$admissionId, $requestedDate]);
            $patientLabtestId = (int)$pdo->lastInsertId();

            // Prepare statements
            $priceStmt = $pdo->prepare('SELECT unit_price FROM tbl_labtest WHERE labtest_id = ?');
            // New columns expected: status, requested_by, requested_date; performed_by/date_performed nullable
            $itemStmt = $pdo->prepare('INSERT INTO tbl_labtest_item (patient_labtest_id, labtest_id, performed_by, quantity, charge, date_performed, status, requested_by, requested_date) VALUES (?, ?, NULL, ?, 0, NULL, "requested", ?, ?)');

            foreach ($items as $it) {
                $labtestId = isset($it['labtest_id']) ? (int)$it['labtest_id'] : 0;
                $qty = isset($it['quantity']) ? (int)$it['quantity'] : 0;
                if ($labtestId <= 0 || $qty <= 0) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Invalid lab test item']);
                    return;
                }

                // Validate lab test exists (price fetched but charge deferred until performed)
                $priceStmt->execute([$labtestId]);
                $row = $priceStmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Lab test not found: ' . $labtestId]);
                    return;
                }

                $itemStmt->execute([$patientLabtestId, $labtestId, $qty, $requestedBy, $requestedDate]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Lab tests requested successfully', 'patient_labtest_id' => $patientLabtestId]);
        } catch (Exception $ex) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['status' => 'error', 'message' => 'Failed to request lab tests: ' . $ex->getMessage()]);
        }
    }

    /**
     * Mark requested lab test items as performed and set charges.
     * @param array $labtestItemIds array of tbl_labtest_item IDs to mark performed
     */
    public function performLabTests($labtestItemIds, $datePerformed, $performedBy)
    {
        header('Content-Type: application/json');
        try {
            if (!is_array($labtestItemIds) || count($labtestItemIds) === 0 || $performedBy <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
                return;
            }

            include 'connection-pdo.php';

            if (!$datePerformed) {
                $datePerformed = date('Y-m-d');
            }

            $pdo->beginTransaction();

            // Lock selected items and validate they are in requested state
            $inPlaceholders = implode(',', array_fill(0, count($labtestItemIds), '?'));
            $lockSql = "SELECT li.labtest_item_id, li.labtest_id, li.quantity, lt.unit_price, li.status
                        FROM tbl_labtest_item li
                        JOIN tbl_labtest lt ON li.labtest_id = lt.labtest_id
                        WHERE li.labtest_item_id IN ($inPlaceholders) FOR UPDATE";
            $stmt = $pdo->prepare($lockSql);
            $stmt->execute($labtestItemIds);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (count($rows) !== count($labtestItemIds)) {
                $pdo->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'One or more lab test items not found']);
                return;
            }

            // Compute charges and update each item
            $updateStmt = $pdo->prepare('UPDATE tbl_labtest_item SET status = "performed", performed_by = ?, date_performed = ?, charge = ? WHERE labtest_item_id = ?');

            foreach ($rows as $r) {
                if (isset($r['status']) && $r['status'] !== 'requested') {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Item '.$r['labtest_item_id'].' is not in requested status']);
                    return;
                }
                $charge = ((float)$r['unit_price']) * ((int)$r['quantity']);
                $updateStmt->execute([$performedBy, $datePerformed, $charge, $r['labtest_item_id']]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Lab tests marked as performed']);
        } catch (Exception $ex) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['status' => 'error', 'message' => 'Failed to mark tests as performed: ' . $ex->getMessage()]);
        }
    }

    /**
     * Dispense a single medicine for an admission.
     * Creates a patient_medication header, inserts an item row, and deducts stock.
     */
    public function dispenseMedicine($admissionId, $medId, $quantity, $dateGiven, $administeredBy)
    {
        header('Content-Type: application/json');
        try {
            if ($admissionId <= 0 || $medId <= 0 || $quantity <= 0 || $administeredBy <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields']);
                return;
            }

            include 'connection-pdo.php';

            if (!$dateGiven) {
                $dateGiven = date('Y-m-d');
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

            // Lock medicine row and get price + stock
            $stmt = $pdo->prepare('SELECT unit_price, stock_quantity FROM tbl_medicine WHERE med_id = ? FOR UPDATE');
            $stmt->execute([$medId]);
            $med = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$med) {
                $pdo->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Medicine not found']);
                return;
            }

            $stock = (int)$med['stock_quantity'];
            if ($stock < $quantity) {
                $pdo->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Insufficient stock']);
                return;
            }

            $unitPrice = (float)$med['unit_price'];
            $charge = $unitPrice * (int)$quantity;

            // Create patient_medication header
            $stmt = $pdo->prepare('INSERT INTO patient_medication (admission_id, record_date) VALUES (?, ?)');
            $stmt->execute([$admissionId, $dateGiven]);
            $medicationId = (int)$pdo->lastInsertId();

            // Insert medication item
            $stmt = $pdo->prepare('INSERT INTO tbl_medication_item (medication_id, med_id, quantity, administered_by, date_given, charge) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([$medicationId, $medId, $quantity, $administeredBy, $dateGiven, $charge]);

            // Deduct stock
            $stmt = $pdo->prepare('UPDATE tbl_medicine SET stock_quantity = stock_quantity - ? WHERE med_id = ?');
            $stmt->execute([$quantity, $medId]);

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Medicine dispensed successfully']);
        } catch (Exception $ex) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['status' => 'error', 'message' => 'Failed to dispense medicine: ' . $ex->getMessage()]);
        }
    }

    /**
     * Dispense multiple medicines in one transaction using a single patient_medication header.
     * $items = [{ med_id, quantity }]
     */
    public function dispenseMedicinesBatch($admissionId, $items, $dateGiven, $administeredBy)
    {
        header('Content-Type: application/json');
        try {
            if ($admissionId <= 0 || !is_array($items) || count($items) === 0 || $administeredBy <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
                return;
            }

            include 'connection-pdo.php';

            if (!$dateGiven) {
                $dateGiven = date('Y-m-d');
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

            // Create patient_medication header
            $stmt = $pdo->prepare('INSERT INTO patient_medication (admission_id, record_date) VALUES (?, ?)');
            $stmt->execute([$admissionId, $dateGiven]);
            $medicationId = (int)$pdo->lastInsertId();

            $priceStmt = $pdo->prepare('SELECT unit_price, stock_quantity FROM tbl_medicine WHERE med_id = ? FOR UPDATE');
            $itemStmt = $pdo->prepare('INSERT INTO tbl_medication_item (medication_id, med_id, quantity, administered_by, date_given, charge) VALUES (?, ?, ?, ?, ?, ?)');
            $deductStmt = $pdo->prepare('UPDATE tbl_medicine SET stock_quantity = stock_quantity - ? WHERE med_id = ?');

            foreach ($items as $it) {
                $medId = isset($it['med_id']) ? (int)$it['med_id'] : 0;
                $qty = isset($it['quantity']) ? (int)$it['quantity'] : 0;
                if ($medId <= 0 || $qty <= 0) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Invalid medicine item']);
                    return;
                }

                // Lock and validate stock
                $priceStmt->execute([$medId]);
                $row = $priceStmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Medicine not found: ' . $medId]);
                    return;
                }
                if ((int)$row['stock_quantity'] < $qty) {
                    $pdo->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Insufficient stock for medicine ID ' . $medId]);
                    return;
                }

                $unitPrice = (float)$row['unit_price'];
                $charge = $unitPrice * $qty;

                $itemStmt->execute([$medicationId, $medId, $qty, $administeredBy, $dateGiven, $charge]);
                $deductStmt->execute([$qty, $medId]);
            }

            $pdo->commit();
            echo json_encode(['status' => 'success', 'message' => 'Medicines dispensed successfully']);
        } catch (Exception $ex) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            echo json_encode(['status' => 'error', 'message' => 'Failed to dispense medicines: ' . $ex->getMessage()]);
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
            // tbl_surgery_procedure schema: (patient_surgery_id, surgery_id, performed_by, performed_date, charge)
            $itemStmt = $pdo->prepare('INSERT INTO tbl_surgery_procedure (patient_surgery_id, surgery_id, performed_by, performed_date, charge) VALUES (?, ?, ?, ?, ?)');

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

                // quantity is not stored in tbl_surgery_procedure; total charge reflects qty
                $itemStmt->execute([$patientSurgeryId, $surgeryId, $performedBy, $datePerformed, $charge]);
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
            // tbl_treatment_session schema: (patient_treatment_id, treatment_id, performed_by, treatment_date, quantity, charge)
            $itemStmt = $pdo->prepare('INSERT INTO tbl_treatment_session (patient_treatment_id, treatment_id, performed_by, treatment_date, quantity, charge) VALUES (?, ?, ?, ?, ?, ?)');

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

                // use treatment_date column and include quantity
                $itemStmt->execute([$patientTreatmentId, $treatmentId, $performedBy, $datePerformed, $qty, $charge]);
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

    /**
     * Get all active admissions with current room (if any).
     */
    public function getActiveAdmissions()
    {
        header('Content-Type: application/json');
        include 'connection-pdo.php';
        try {
            $sql = "SELECT 
                        pa.admission_id,
                        pa.patient_id,
                        pa.admission_date,
                        pa.status,
                        p.patient_fname,
                        p.patient_lname,
                        p.patient_mname,
                        r.room_id,
                        r.room_number,
                        rt.room_type_name,
                        r.daily_rate
                    FROM patient_admission pa
                    JOIN patients p ON pa.patient_id = p.patient_id
                    LEFT JOIN tbl_room_assignment ra ON ra.admission_id = pa.admission_id
                    LEFT JOIN tbl_room_stay rs ON rs.room_assignment_id = ra.room_assignment_id AND rs.end_date = '0000-00-00'
                    LEFT JOIN tbl_room r ON rs.room_id = r.room_id
                    LEFT JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                    WHERE pa.status = 'Admitted'
                    ORDER BY pa.admission_date DESC, pa.admission_id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'admissions' => $rows]);
        } catch (Exception $ex) {
            echo json_encode(['status' => 'error', 'message' => 'Failed to get active admissions: ' . $ex->getMessage()]);
        }
    }

    /**
     * Get admissions for a specific patient with current room (if any).
     */
    public function getAdmissionsByPatient($patientId)
    {
        header('Content-Type: application/json');
        include 'connection-pdo.php';
        try {
            $sql = "SELECT 
                        pa.admission_id,
                        pa.patient_id,
                        pa.admission_date,
                        pa.discharge_date,
                        pa.status,
                        r.room_id,
                        r.room_number,
                        rt.room_type_name,
                        r.daily_rate
                    FROM patient_admission pa
                    LEFT JOIN tbl_room_assignment ra ON ra.admission_id = pa.admission_id
                    LEFT JOIN tbl_room_stay rs ON rs.room_assignment_id = ra.room_assignment_id AND rs.end_date = '0000-00-00'
                    LEFT JOIN tbl_room r ON rs.room_id = r.room_id
                    LEFT JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                    WHERE pa.patient_id = ?
                    ORDER BY pa.admission_date DESC, pa.admission_id DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([(int)$patientId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['status' => 'success', 'admissions' => $rows]);
        } catch (Exception $ex) {
            echo json_encode(['status' => 'error', 'message' => 'Failed to get admissions: ' . $ex->getMessage()]);
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

    case "requestLabTestsBatch":
        $admissionId = $data['admission_id'] ?? 0;
        $items = $data['items'] ?? [];
        $requestedDate = $data['requested_date'] ?? date('Y-m-d');
        $requestedBy = $data['requested_by'] ?? 0;
        $obj->requestLabTestsBatch((int)$admissionId, $items, $requestedDate, (int)$requestedBy);
        break;

    case "performLabTests":
        $labtestItemIds = $data['labtest_item_ids'] ?? [];
        $datePerformed = $data['date_performed'] ?? date('Y-m-d');
        $performedBy = $data['performed_by'] ?? 0;
        $obj->performLabTests($labtestItemIds, $datePerformed, (int)$performedBy);
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
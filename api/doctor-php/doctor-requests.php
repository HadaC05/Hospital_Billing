<?php
require_once __DIR__ . '/../require_auth.php';
header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class Doctor_Request
{
    private $pdo;
    public function __construct()
    {
        include __DIR__ . '/../connection-pdo.php';
        $this->pdo = $pdo;
    }
    public function getRequests($patientId = null)
    {
        try {
            $doctorId = (int)$_SESSION['user_id'];

            // Get medicine requests from new batch system
            $sql = "
        SELECT 
            rmb.batch_id as request_id,
            'Medication' as svc_name,
            GROUP_CONCAT(CONCAT(m.med_name, ' (', rmi.quantity, ')') SEPARATOR ', ') as item_name,
            rmb.request_date,
            rmb.status,
            'medicine_batch' as request_type
        FROM request_medicine_batch rmb
        JOIN request_medicine_items rmi ON rmb.batch_id = rmi.batch_id
        JOIN tbl_medicine m ON rmi.med_id = m.med_id
        WHERE rmb.doctor_id = :doctor_id
        ";

            if ($patientId) {
                $sql .= " AND rmb.patient_id = :patient_id";
            }

            $sql .= " GROUP BY rmb.batch_id";

            // Union with lab test requests
            $sql .= "
        UNION ALL
        
        SELECT 
            rlb.batch_id as request_id,
            'Lab Test' as svc_name,
            GROUP_CONCAT(CONCAT(lt.test_name) SEPARATOR ', ') as item_name,
            rlb.request_date,
            rlb.status,
            'labtest_batch' as request_type
        FROM request_labtest_batch rlb
        JOIN request_labtest_items rli ON rlb.batch_id = rli.batch_id
        JOIN tbl_labtest lt ON rli.labtest_id = lt.labtest_id
        WHERE rlb.doctor_id = :doctor_id
        ";

            if ($patientId) {
                $sql .= " AND rlb.patient_id = :patient_id";
            }

            $sql .= " GROUP BY rlb.batch_id ORDER BY request_date DESC";

            // Execute query
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);

            if ($patientId) {
                $stmt->bindValue(':patient_id', $patientId, PDO::PARAM_INT);
            }

            $stmt->execute();
            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'requests' => $requests,
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get requests: ' . $e->getMessage()
            ]);
        }
    }

    private function createMedicineBatch($doctorId, $patientId, $admissionId, $requests, $notes = null)
    {
        // Create batch record
        $batchSql = "
        INSERT INTO request_medicine_batch 
        (doctor_id, patient_id, admission_id, request_date, status, notes)
        VALUES (:doctor_id, :patient_id, :admission_id, NOW(), 'pending', :notes)
    ";
        $stmt = $this->pdo->prepare($batchSql);
        $stmt->execute([
            ':doctor_id' => $doctorId,
            ':patient_id' => $patientId,
            ':admission_id' => $admissionId,
            ':notes' => $notes
        ]);

        $batchId = $this->pdo->lastInsertId();

        // Process each request in the batch
        foreach ($requests as $request) {
            $itemId = $request['item_id'] ?? null;
            $quantity = $request['quantity'] ?? 1;
            $notes = $request['notes'] ?? null;

            // Validate medicine
            $checkSql = "SELECT 1 FROM tbl_medicine WHERE med_id = :item_id AND is_active = 1";
            $checkStmt = $this->pdo->prepare($checkSql);
            $checkStmt->execute([':item_id' => $itemId]);

            if (!$checkStmt->fetch()) {
                throw new Exception('Invalid medicine selected');
            }

            // Insert item into batch
            $itemSql = "
            INSERT INTO request_medicine_items 
            (batch_id, med_id, quantity, notes, status)
            VALUES (:batch_id, :med_id, :quantity, :notes, 'pending')
        ";
            $stmt = $this->pdo->prepare($itemSql);
            $stmt->execute([
                ':batch_id' => $batchId,
                ':med_id' => $itemId,
                ':quantity' => $quantity,
                ':notes' => $notes
            ]);
        }

        return $batchId;
    }

    private function createLabtestBatch($doctorId, $patientId, $admissionId, $requests, $notes = null)
    {
        // Create batch record
        $batchSql = "
        INSERT INTO request_labtest_batch 
        (doctor_id, patient_id, admission_id, request_date, status, notes)
        VALUES (:doctor_id, :patient_id, :admission_id, NOW(), 'pending', :notes)
    ";
        $stmt = $this->pdo->prepare($batchSql);
        $stmt->execute([
            ':doctor_id' => $doctorId,
            ':patient_id' => $patientId,
            ':admission_id' => $admissionId,
            ':notes' => $notes
        ]);

        $batchId = $this->pdo->lastInsertId();

        // Process each request in the batch
        foreach ($requests as $request) {
            $itemId = $request['item_id'] ?? null;
            $quantity = $request['quantity'] ?? 1;
            $notes = $request['notes'] ?? null;

            // Validate lab test
            $checkSql = "SELECT 1 FROM tbl_labtest WHERE labtest_id = :item_id AND is_active = 1";
            $checkStmt = $this->pdo->prepare($checkSql);
            $checkStmt->execute([':item_id' => $itemId]);

            if (!$checkStmt->fetch()) {
                throw new Exception('Invalid lab test selected');
            }

            // Insert item into batch
            $itemSql = "
            INSERT INTO request_labtest_items 
            (batch_id, labtest_id, notes, status)
            VALUES (:batch_id, :labtest_id, :notes, 'pending')
        ";
            $stmt = $this->pdo->prepare($itemSql);
            $stmt->execute([
                ':batch_id' => $batchId,
                ':labtest_id' => $itemId,
                ':notes' => $notes
            ]);
        }

        return $batchId;
    }

    public function createBatchRequests($data)
    {
        try {
            $this->pdo->beginTransaction();

            $doctorId = $data['doctor_id'] ?? null;
            $patientId = $data['patient_id'] ?? null;
            $requests = $data['requests'] ?? [];

            // Validation
            if (!$doctorId || !$patientId || empty($requests)) {
                throw new Exception('Missing required fields');
            }

            // Get active admission for the patient
            $admissionSql = "
            SELECT admission_id FROM patient_admission 
            WHERE patient_id = :patient_id AND doctor_id = :doctor_id AND status = 'active'
            ORDER BY admission_date DESC LIMIT 1
        ";
            $stmt = $this->pdo->prepare($admissionSql);
            $stmt->execute([
                ':patient_id' => $patientId,
                ':doctor_id' => $doctorId
            ]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$admission) {
                throw new Exception('No active admission found for this patient');
            }

            $admissionId = $admission['admission_id'];

            // Group requests by service type
            $medicationRequests = [];
            $labtestRequests = [];

            foreach ($requests as $request) {
                $svcTypeId = $request['svc_type_id'] ?? null;

                if ($svcTypeId == 4) { // Medication
                    $medicationRequests[] = $request;
                } elseif ($svcTypeId == 3) { // Lab Test
                    $labtestRequests[] = $request;
                }
            }

            $createdBatches = [];

            // Create medication batch if there are medication requests
            if (!empty($medicationRequests)) {
                $batchId = $this->createMedicineBatch($doctorId, $patientId, $admissionId, $medicationRequests, $data['batch_notes'] ?? null);
                $createdBatches[] = [
                    'type' => 'Medication',
                    'batch_id' => $batchId
                ];
            }

            // Create lab test batch if there are lab test requests
            if (!empty($labtestRequests)) {
                $batchId = $this->createLabtestBatch($doctorId, $patientId, $admissionId, $labtestRequests, $data['batch_notes'] ?? null);
                $createdBatches[] = [
                    'type' => 'Lab Test',
                    'batch_id' => $batchId
                ];
            }

            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Requests created successfully',
                'batches' => $createdBatches
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
    public function cancelRequest($data)
    {
        try {
            $requestId = $data['request_id'] ?? null;
            $requestType = $data['request_type'] ?? null;
            $doctorId = (int)$_SESSION['user_id'];

            if (!$requestId) {
                throw new Exception('Missing request ID');
            }

            if ($requestType === 'medicine_batch') {
                // Check if it's a medicine batch request
                $checkSql = "
                SELECT rmb.batch_id 
                FROM request_medicine_batch rmb
                WHERE rmb.batch_id = :request_id AND rmb.doctor_id = :doctor_id
            ";
                $stmt = $this->pdo->prepare($checkSql);
                $stmt->execute([
                    ':request_id' => $requestId,
                    ':doctor_id' => $doctorId
                ]);

                if ($stmt->fetch()) {
                    // Cancel the entire medicine batch
                    $updateSql = "
                    UPDATE request_medicine_batch 
                    SET status = 'cancelled' 
                    WHERE batch_id = :request_id
                ";
                    $stmt = $this->pdo->prepare($updateSql);
                    $stmt->execute([':request_id' => $requestId]);

                    // Also cancel all items in the batch
                    $updateItemsSql = "
                    UPDATE request_medicine_items 
                    SET status = 'cancelled' 
                    WHERE batch_id = :request_id
                ";
                    $stmt = $this->pdo->prepare($updateItemsSql);
                    $stmt->execute([':request_id' => $requestId]);
                } else {
                    throw new Exception('Medicine batch not found or not authorized');
                }
            } elseif ($requestType === 'labtest_batch') {
                // Check if it's a lab test batch request
                $checkSql = "
                SELECT rlb.batch_id 
                FROM request_labtest_batch rlb
                WHERE rlb.batch_id = :request_id AND rlb.doctor_id = :doctor_id
            ";
                $stmt = $this->pdo->prepare($checkSql);
                $stmt->execute([
                    ':request_id' => $requestId,
                    ':doctor_id' => $doctorId
                ]);

                if ($stmt->fetch()) {
                    // Cancel the entire lab test batch
                    $updateSql = "
                    UPDATE request_labtest_batch 
                    SET status = 'cancelled' 
                    WHERE batch_id = :request_id
                ";
                    $stmt = $this->pdo->prepare($updateSql);
                    $stmt->execute([':request_id' => $requestId]);

                    // Also cancel all items in the batch
                    $updateItemsSql = "
                    UPDATE request_labtest_items 
                    SET status = 'cancelled' 
                    WHERE batch_id = :request_id
                ";
                    $stmt = $this->pdo->prepare($updateItemsSql);
                    $stmt->execute([':request_id' => $requestId]);
                } else {
                    throw new Exception('Lab test batch not found or not authorized');
                }
            } else {
                // Handle old request system
                $checkSql = "
                SELECT 1 FROM doctor_requests 
                WHERE request_id = :request_id AND doctor_id = :doctor_id
            ";
                $stmt = $this->pdo->prepare($checkSql);
                $stmt->execute([
                    ':request_id' => $requestId,
                    ':doctor_id' => $doctorId
                ]);

                if (!$stmt->fetch()) {
                    throw new Exception('Request not found or not authorized');
                }

                // Update request status to cancelled
                $updateSql = "
                UPDATE doctor_requests 
                SET status = 'cancelled', cancelled_date = NOW() 
                WHERE request_id = :request_id
            ";
                $stmt = $this->pdo->prepare($updateSql);
                $stmt->execute([':request_id' => $requestId]);
            }

            echo json_encode([
                'success' => true,
                'message' => 'Request cancelled successfully'
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
    public function getServiceTypes()
    {
        try {
            $sql = "
                SELECT svc_type_id, svc_name 
                FROM tbl_service_type 
                WHERE svc_name IN ('Medication', 'Lab Test', 'Treatment')
                ORDER BY svc_type_id ASC";
            $stmt = $this->pdo->query($sql);
            $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'service_types' => $types
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to fetch service types: ' . $e->getMessage()
            ]);
        }
    }

    // NEW FUNCTIONS 

    function getDoctors()
    {
        try {
            $sql = "
            SELECT 
                u.user_id,
                ud.doctor_id,
                ud.first_name,
                ud.middle_name,
                ud.last_name,
                ud.suffix,
                ud.license_number,
                u.email,
                u.mobile_number,
                u.status,
                uds.specialty_id,
                uds.specialty_name
            FROM users u
            JOIN user_doctor ud ON u.user_id = ud.user_id
            JOIN user_doctor_specialty uds ON ud.specialty_id = uds.specialty_id
            WHERE u.role_id = 2
            AND u.status = 1
            AND uds.is_active = 1
            ORDER BY ud.last_name, ud.first_name
        ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'doctors' => $doctors
            ]);
        } catch (PDOException $e) {
            error_log("Error in getDoctors: " . $e->getMessage());
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getRooms()
    {
        try {
            $sql = "
            SELECT 
                r.room_id,
                r.room_number,
                r.max_occupancy,
                r.is_available,
                rt.room_type_name,
                IFNULL((
                    SELECT COUNT(*) 
                    FROM tbl_room_stay rs
                    WHERE rs.room_id = r.room_id
                        AND rs.end_date IS NULL
                ), 0) AS current_occupancy
            FROM tbl_room r
            JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
            WHERE rt.is_active = 1
            ORDER BY r.room_number ASC
        ";
            $stmt = $this->pdo->query($sql);
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'rooms' => $rooms
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to fetch rooms: ' . $e->getMessage()
            ]);
        }
    }

    public function getSurgeryTypes()
    {
        try {
            $sql = "
            SELECT 
                s.surgery_id,
                s.surgery_name,
                s.surgery_price AS base_fee,
                st.surgery_type_name
            FROM tbl_surgery s
            JOIN tbl_surgery_type st ON s.surgery_type_id = st.surgery_type_id
            WHERE s.is_available = 1
                AND st.is_active = 1
            ORDER BY s.surgery_name
        ";
            $stmt = $this->pdo->query($sql);
            $surgeries = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'surgeries' => $surgeries
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to fetch surgery types: ' . $e->getMessage()
            ]);
        }
    }

    public function requestDoctorChange($data)
    {
        try {
            $this->pdo->beginTransaction();

            $doctorId = $data['doctor_id'] ?? null;
            $patientId = $data['patient_id'] ?? null;
            $newDoctorId = $data['new_doctor_id'] ?? null;
            $reason = $data['reason'] ?? null;
            $notes = $data['notes'] ?? null;

            if (!$doctorId || !$patientId || !$newDoctorId || !$reason) {
                throw new Exception('Missing required fields');
            }

            // Get active admission for the patient
            $admissionSql = "
            SELECT admission_id FROM patient_admission 
            WHERE patient_id = :patient_id AND doctor_id = :doctor_id AND status = 'active'
            ORDER BY admission_date DESC LIMIT 1";
            $stmt = $this->pdo->prepare($admissionSql);
            $stmt->execute([
                ':patient_id' => $patientId,
                ':doctor_id' => $doctorId
            ]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$admission) {
                throw new Exception('No active admission found for this patient');
            }

            $admissionId = $admission['admission_id'];

            // Create doctor change request
            $sql = "
            INSERT INTO doctor_change_requests 
            (admission_id, patient_id, current_doctor_id, requested_doctor_id, request_date, reason, notes, status)
            VALUES (:admission_id, :patient_id, :current_doctor_id, :requested_doctor_id, NOW(), :reason, :notes, 'pending')";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':admission_id' => $admissionId,
                ':patient_id' => $patientId,
                ':current_doctor_id' => $doctorId,
                ':requested_doctor_id' => $newDoctorId,
                ':reason' => $reason,
                ':notes' => $notes
            ]);

            $requestId = $this->pdo->lastInsertId();
            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Doctor change request submitted successfully',
                'request_id' => $requestId
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function requestRoomChange($data)
    {
        try {
            $this->pdo->beginTransaction();

            $doctorId = $data['doctor_id'] ?? null;
            $patientId = $data['patient_id'] ?? null;
            $newRoomId = $data['new_room_id'] ?? null;
            $reason = $data['reason'] ?? null;
            $notes = $data['notes'] ?? null;

            if (!$doctorId || !$patientId || !$newRoomId || !$reason) {
                throw new Exception('Missing required fields');
            }

            // Get active admission for the patient
            $admissionSql = "
            SELECT admission_id, room_id FROM patient_admission 
            WHERE patient_id = :patient_id AND doctor_id = :doctor_id AND status = 'active'
            ORDER BY admission_date DESC LIMIT 1";
            $stmt = $this->pdo->prepare($admissionSql);
            $stmt->execute([
                ':patient_id' => $patientId,
                ':doctor_id' => $doctorId
            ]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$admission) {
                throw new Exception('No active admission found for this patient');
            }

            $admissionId = $admission['admission_id'];
            $currentRoomId = $admission['room_id'];

            // Create room change request
            $sql = "
            INSERT INTO room_change_requests 
            (admission_id, patient_id, current_room_id, requested_room_id, request_date, reason, notes, status)
            VALUES (:admission_id, :patient_id, :current_room_id, :requested_room_id, NOW(), :reason, :notes, 'pending')";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':admission_id' => $admissionId,
                ':patient_id' => $patientId,
                ':current_room_id' => $currentRoomId,
                ':requested_room_id' => $newRoomId,
                ':reason' => $reason,
                ':notes' => $notes
            ]);

            $requestId = $this->pdo->lastInsertId();
            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Room change request submitted successfully',
                'request_id' => $requestId
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    public function scheduleSurgery($data)
    {
        try {
            $this->pdo->beginTransaction();

            $doctorId = $data['doctor_id'] ?? null;
            $patientId = $data['patient_id'] ?? null;
            $surgeryId = $data['surgery_id'] ?? null;
            $assignedDoctorId = $data['assigned_doctor_id'] ?? null;
            $scheduledDate = $data['scheduled_date'] ?? null;
            $notes = $data['notes'] ?? null;
            $useCustomFee = $data['use_custom_fee'] ?? false;
            $professionalFee = $data['professional_fee'] ?? null;

            if (!$doctorId || !$patientId || !$surgeryId || !$assignedDoctorId || !$scheduledDate || !$notes) {
                throw new Exception('Missing required fields');
            }

            // Get active admission for the patient
            $admissionSql = "
            SELECT admission_id FROM patient_admission 
            WHERE patient_id = :patient_id AND doctor_id = :doctor_id AND status = 'active'
            ORDER BY admission_date DESC LIMIT 1";
            $stmt = $this->pdo->prepare($admissionSql);
            $stmt->execute([
                ':patient_id' => $patientId,
                ':doctor_id' => $doctorId
            ]);
            $admission = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$admission) {
                throw new Exception('No active admission found for this patient');
            }

            $admissionId = $admission['admission_id'];

            // Get surgery details
            $surgerySql = "SELECT base_fee FROM tbl_surgery WHERE surgery_id = :surgery_id";
            $stmt = $this->pdo->prepare($surgerySql);
            $stmt->execute([':surgery_id' => $surgeryId]);
            $surgery = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$surgery) {
                throw new Exception('Invalid surgery type');
            }

            // Determine the fee to use
            $feeToUse = $useCustomFee ? $professionalFee : $surgery['base_fee'];

            // Create surgery request
            $sql = "
            INSERT INTO surgery_requests 
            (admission_id, patient_id, surgery_id, assigned_doctor_id, scheduled_date, notes, professional_fee, use_custom_fee, request_date, status)
            VALUES (:admission_id, :patient_id, :surgery_id, :assigned_doctor_id, :scheduled_date, :notes, :professional_fee, :use_custom_fee, NOW(), 'scheduled')";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([
                ':admission_id' => $admissionId,
                ':patient_id' => $patientId,
                ':surgery_id' => $surgeryId,
                ':assigned_doctor_id' => $assignedDoctorId,
                ':scheduled_date' => $scheduledDate,
                ':notes' => $notes,
                ':professional_fee' => $feeToUse,
                ':use_custom_fee' => $useCustomFee ? 1 : 0
            ]);

            $requestId = $this->pdo->lastInsertId();
            $this->pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Surgery scheduled successfully',
                'request_id' => $requestId
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }

    // UNTIL HERE

    public function getBatchDetails($batchId)
    {
        try {
            $doctorId = (int)$_SESSION['user_id'];
            $batchType = $_GET['batch_type'] ?? null;

            if (!$batchType) {
                throw new Exception('Batch type is required');
            }

            $batch = [];
            $items = [];

            if ($batchType === 'medicine_batch') {
                // Get medicine batch details
                $batchSql = "
            SELECT rmb.*, 
                CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) AS patient_name,
                CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name, ''), ' ', ud.last_name) AS doctor_name
            FROM request_medicine_batch rmb
            JOIN patients p ON rmb.patient_id = p.patient_id
            JOIN users u ON rmb.doctor_id = u.user_id
            JOIN user_doctor ud ON u.user_id = ud.user_id
            WHERE rmb.batch_id = :batch_id AND rmb.doctor_id = :doctor_id
            ";

                $stmt = $this->pdo->prepare($batchSql);
                $stmt->execute([
                    ':batch_id' => $batchId,
                    ':doctor_id' => $doctorId
                ]);

                $batch = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$batch) {
                    throw new Exception('Medicine batch not found or access denied');
                }

                // Get medicine batch items
                $itemsSql = "
            SELECT rmi.*, m.med_name as item_name
            FROM request_medicine_items rmi
            JOIN tbl_medicine m ON rmi.med_id = m.med_id
            WHERE rmi.batch_id = :batch_id
            ORDER BY rmi.item_id
            ";

                $stmt = $this->pdo->prepare($itemsSql);
                $stmt->execute([':batch_id' => $batchId]);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $batch['batch_type'] = 'medicine';
            } elseif ($batchType === 'labtest_batch') {
                // Get lab test batch details
                $batchSql = "
            SELECT rlb.*, 
                CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) AS patient_name,
                CONCAT(ud.first_name, ' ', COALESCE(ud.middle_name, ''), ' ', ud.last_name) AS doctor_name
            FROM request_labtest_batch rlb
            JOIN patients p ON rlb.patient_id = p.patient_id
            JOIN users u ON rlb.doctor_id = u.user_id
            JOIN user_doctor ud ON u.user_id = ud.user_id
            WHERE rlb.batch_id = :batch_id AND rlb.doctor_id = :doctor_id
            ";

                $stmt = $this->pdo->prepare($batchSql);
                $stmt->execute([
                    ':batch_id' => $batchId,
                    ':doctor_id' => $doctorId
                ]);

                $batch = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$batch) {
                    throw new Exception('Lab test batch not found or access denied');
                }

                // Get lab test batch items
                $itemsSql = "
            SELECT rli.*, lt.test_name as item_name
            FROM request_labtest_items rli
            JOIN tbl_labtest lt ON rli.labtest_id = lt.labtest_id
            WHERE rli.batch_id = :batch_id
            ORDER BY rli.item_id
            ";

                $stmt = $this->pdo->prepare($itemsSql);
                $stmt->execute([':batch_id' => $batchId]);
                $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $batch['batch_type'] = 'labtest';
            } else {
                throw new Exception('Invalid batch type');
            }

            echo json_encode([
                'success' => true,
                'batch' => $batch,
                'items' => $items
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get batch details: ' . $e->getMessage()
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => $e->getMessage()
            ]);
        }
    }
}

// Handle requests
$method = $_SERVER['REQUEST_METHOD'];
$operation = '';

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
    $data = json_decode($json, true);
}

// For GET requests, we need to get the data differently
if ($method === 'GET' && isset($_GET['json'])) {
    $json = $_GET['json'] ?? '';
    $data = json_decode($json, true);
}

$request = new Doctor_Request();

switch ($operation) {
    case 'getRequests':
        $patientId = $_GET['patient_id'] ?? null;
        $request->getRequests($patientId);
        break;
    case 'createBatchRequests':
        if ($method === 'POST') {
            $request->createBatchRequests($data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request method']);
        }
        break;
    case 'cancelRequest':
        if ($method === 'POST') {
            $request->cancelRequest($data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request method']);
        }
        break;
    case 'getServiceTypes':
        $request->getServiceTypes();
        break;
    case 'getDoctors':
        $request->getDoctors();
        break;
    case 'getRooms':
        $request->getRooms();
        break;
    case 'getSurgeryTypes':
        $request->getSurgeryTypes();
        break;
    case 'requestDoctorChange':
        if ($method === 'POST') {
            $request->requestDoctorChange($data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request method']);
        }
        break;
    case 'requestRoomChange':
        if ($method === 'POST') {
            $request->requestRoomChange($data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request method']);
        }
        break;
    case 'scheduleSurgery':
        if ($method === 'POST') {
            $request->scheduleSurgery($data);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid request method']);
        }
        break;
    case 'getBatchDetails':
        $batchId = $_GET['batch_id'] ?? null;
        if ($batchId) {
            $request->getBatchDetails($batchId);
        } else {
            echo json_encode(['success' => false, 'message' => 'Missing batch ID']);
        }
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}

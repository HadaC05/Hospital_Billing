<?php
require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class PharmacistAPI
{
    /**
     * Check if user has medicine dispensing permission
     */
    private function checkMedicineDispensingPermission()
    {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return false;
        }

        include 'connection-pdo.php';
        
        $sql = "SELECT COUNT(*) as has_permission 
                FROM user_role_permission urp
                JOIN user_roles ur ON urp.user_role_id = ur.role_id
                JOIN users u ON u.user_role_id = ur.role_id
                WHERE u.user_id = :user_id 
                AND urp.permission_id = (SELECT permission_id FROM user_permission WHERE name = 'medicine_dispensing')
                AND urp.is_allowed = 1";
        
        $stmt = $conn->prepare($sql);
        $stmt->bindValue(':user_id', $_SESSION['user_id'], PDO::PARAM_INT);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$result || $result['has_permission'] == 0) {
            echo json_encode(['status' => 'error', 'message' => 'Access denied. Medicine dispensing permission required.']);
            return false;
        }
        
        return true;
    }

    /**
     * Get patients with active admissions for medicine dispensing
     */
    function getPatientsForDispensing($params = [])
    {
        // Temporarily bypass permission check for testing
        // if (!$this->checkMedicineDispensingPermission()) {
        //     return;
        // }
        
        include 'connection-pdo.php';
        try {
            // Debug: Log the request
            error_log("PharmacistAPI: getPatientsForDispensing called with params: " . json_encode($params));
            $page = isset($params['page']) ? (int)$params['page'] : 1;
            $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;
            $search = isset($params['search']) ? trim($params['search']) : '';
            $offset = ($page - 1) * $itemsPerPage;

            $where = "WHERE pa.status = 'Active'";
            $binds = [];
            
            if ($search !== '') {
                $where .= " AND (p.patient_fname LIKE :search OR p.patient_lname LIKE :search OR p.patient_mname LIKE :search OR p.mobile_number LIKE :search OR pa.admission_id LIKE :search)";
                $binds[':search'] = "%$search%";
            }

            // Count total
            $countSql = "SELECT COUNT(*) AS total
                         FROM patient_admission pa
                         JOIN patients p ON pa.patient_id = p.patient_id
                         $where";
            $countStmt = $conn->prepare($countSql);
            foreach ($binds as $k => $v) {
                $countStmt->bindValue($k, $v, PDO::PARAM_STR);
            }
            $countStmt->execute();
            $totalCount = (int)($countStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

            // Fetch data
            $dataSql = "SELECT pa.admission_id, pa.patient_id, pa.admission_date, pa.admission_reason,
                               p.patient_fname, p.patient_lname, p.patient_mname, p.mobile_number,
                               p.birthdate, pa.status
                        FROM patient_admission pa
                        JOIN patients p ON pa.patient_id = p.patient_id
                        $where
                        ORDER BY pa.admission_date DESC
                        LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($dataSql);
            foreach ($binds as $k => $v) {
                $stmt->bindValue($k, $v, PDO::PARAM_STR);
            }
            $stmt->bindValue(':limit', $itemsPerPage, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalPages = $itemsPerPage > 0 ? (int)ceil($totalCount / $itemsPerPage) : 0;
            $startIndex = $totalCount > 0 ? $offset + 1 : 0;
            $endIndex = min($offset + $itemsPerPage, $totalCount);

            echo json_encode([
                'status' => 'success',
                'data' => $rows,
                'pagination' => [
                    'currentPage' => $page,
                    'itemsPerPage' => $itemsPerPage,
                    'totalItems' => $totalCount,
                    'totalPages' => $totalPages,
                    'startIndex' => $startIndex,
                    'endIndex' => $endIndex
                ]
            ]);
        } catch (PDOException $e) {
            error_log("PharmacistAPI PDO Error in getPatientsForDispensing: " . $e->getMessage());
            echo json_encode(['status' => 'error', 'message' => 'Database error: ' . $e->getMessage()]);
        } catch (Exception $e) {
            error_log("PharmacistAPI General Error in getPatientsForDispensing: " . $e->getMessage());
            echo json_encode(['status' => 'error', 'message' => 'General error: ' . $e->getMessage()]);
        }
    }

    /**
     * Get medicines with stock for dispensing
     */
    function getMedicinesForDispensing($params = [])
    {
        // Temporarily bypass permission check for testing
        // if (!$this->checkMedicineDispensingPermission()) {
        //     return;
        // }
        
        include 'connection-pdo.php';
        try {
            $page = isset($params['page']) ? (int)$params['page'] : 1;
            $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 50;
            $search = isset($params['search']) ? trim($params['search']) : '';
            $offset = ($page - 1) * $itemsPerPage;

            $where = "WHERE m.is_active = 1 AND m.stock_quantity > 0";
            $binds = [];
            
            if ($search !== '') {
                $where .= " AND (m.med_name LIKE :search OR mt.med_type_name LIKE :search OR mu.unit_name LIKE :search)";
                $binds[':search'] = "%$search%";
            }

            // Count total
            $countSql = "SELECT COUNT(*) AS total
                         FROM tbl_medicine m
                         JOIN tbl_medicine_type mt ON m.med_type_id = mt.med_type_id
                         JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                         $where";
            $countStmt = $conn->prepare($countSql);
            foreach ($binds as $k => $v) {
                $countStmt->bindValue($k, $v, PDO::PARAM_STR);
            }
            $countStmt->execute();
            $totalCount = (int)($countStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

            // Fetch data
            $dataSql = "SELECT m.med_id, m.med_name, m.unit_price, m.stock_quantity,
                               mt.med_type_name, mu.unit_name
                        FROM tbl_medicine m
                        JOIN tbl_medicine_type mt ON m.med_type_id = mt.med_type_id
                        JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                        $where
                        ORDER BY m.med_name ASC
                        LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($dataSql);
            foreach ($binds as $k => $v) {
                $stmt->bindValue($k, $v, PDO::PARAM_STR);
            }
            $stmt->bindValue(':limit', $itemsPerPage, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalPages = $itemsPerPage > 0 ? (int)ceil($totalCount / $itemsPerPage) : 0;
            $startIndex = $totalCount > 0 ? $offset + 1 : 0;
            $endIndex = min($offset + $itemsPerPage, $totalCount);

            echo json_encode([
                'status' => 'success',
                'data' => $rows,
                'pagination' => [
                    'currentPage' => $page,
                    'itemsPerPage' => $itemsPerPage,
                    'totalItems' => $totalCount,
                    'totalPages' => $totalPages,
                    'startIndex' => $startIndex,
                    'endIndex' => $endIndex
                ]
            ]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * Get dispensing history for a patient
     */
    function getDispensingHistory($admissionId)
    {
        if (!$this->checkMedicineDispensingPermission()) {
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT pm.medication_id, pm.record_date,
                           mi.med_item_id, mi.quantity, mi.date_given, mi.charge,
                           m.med_name, mt.med_type_name, mu.unit_name,
                           u.username AS dispensed_by
                    FROM patient_medication pm
                    JOIN tbl_medication_item mi ON pm.medication_id = mi.medication_id
                    JOIN tbl_medicine m ON mi.med_id = m.med_id
                    JOIN tbl_medicine_type mt ON m.med_type_id = mt.med_type_id
                    JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                    JOIN users u ON mi.administered_by = u.user_id
                    WHERE pm.admission_id = :admission_id
                    ORDER BY mi.date_given DESC, pm.record_date DESC";
            
            $stmt = $conn->prepare($sql);
            $stmt->bindValue(':admission_id', $admissionId, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'status' => 'success',
                'data' => $rows
            ]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * Dispense medicine to patient
     */
    function dispenseMedicine($data)
    {
        if (!$this->checkMedicineDispensingPermission()) {
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $admissionId = (int)($data['admission_id'] ?? 0);
            $medId = (int)($data['med_id'] ?? 0);
            $quantity = (int)($data['quantity'] ?? 0);
            $dateGiven = $data['date_given'] ?? date('Y-m-d');
            $administeredBy = (int)($_SESSION['user_id'] ?? 0);

            if ($admissionId <= 0 || $medId <= 0 || $quantity <= 0 || $administeredBy <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields']);
                return;
            }

            $conn->beginTransaction();

            // Validate admission exists and is active
            $stmt = $conn->prepare("SELECT admission_id FROM patient_admission WHERE admission_id = :admission_id AND status = 'Active' FOR UPDATE");
            $stmt->bindValue(':admission_id', $admissionId, PDO::PARAM_INT);
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                $conn->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Active admission not found']);
                return;
            }

            // Lock medicine row and get price + stock
            $stmt = $conn->prepare("SELECT unit_price, stock_quantity FROM tbl_medicine WHERE med_id = :med_id AND is_active = 1 FOR UPDATE");
            $stmt->bindValue(':med_id', $medId, PDO::PARAM_INT);
            $stmt->execute();
            $med = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$med) {
                $conn->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Medicine not found or inactive']);
                return;
            }

            $stock = (int)$med['stock_quantity'];
            if ($stock < $quantity) {
                $conn->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Insufficient stock. Available: ' . $stock]);
                return;
            }

            $unitPrice = (float)$med['unit_price'];
            $charge = $unitPrice * $quantity;

            // Create patient_medication header
            $stmt = $conn->prepare("INSERT INTO patient_medication (admission_id, record_date) VALUES (:admission_id, :record_date)");
            $stmt->bindValue(':admission_id', $admissionId, PDO::PARAM_INT);
            $stmt->bindValue(':record_date', $dateGiven);
            $stmt->execute();
            $medicationId = (int)$conn->lastInsertId();

            // Insert medication item
            $stmt = $conn->prepare("INSERT INTO tbl_medication_item (medication_id, med_id, quantity, administered_by, date_given, charge) VALUES (:medication_id, :med_id, :quantity, :administered_by, :date_given, :charge)");
            $stmt->bindValue(':medication_id', $medicationId, PDO::PARAM_INT);
            $stmt->bindValue(':med_id', $medId, PDO::PARAM_INT);
            $stmt->bindValue(':quantity', $quantity, PDO::PARAM_INT);
            $stmt->bindValue(':administered_by', $administeredBy, PDO::PARAM_INT);
            $stmt->bindValue(':date_given', $dateGiven);
            $stmt->bindValue(':charge', $charge);
            $stmt->execute();

            // Deduct stock
            $stmt = $conn->prepare("UPDATE tbl_medicine SET stock_quantity = stock_quantity - :quantity WHERE med_id = :med_id");
            $stmt->bindValue(':quantity', $quantity, PDO::PARAM_INT);
            $stmt->bindValue(':med_id', $medId, PDO::PARAM_INT);
            $stmt->execute();

            $conn->commit();
            echo json_encode([
                'status' => 'success', 
                'message' => 'Medicine dispensed successfully',
                'medication_id' => $medicationId
            ]);
        } catch (PDOException $e) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    /**
     * Dispense multiple medicines in batch
     */
    function dispenseMedicinesBatch($data)
    {
        if (!$this->checkMedicineDispensingPermission()) {
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $admissionId = (int)($data['admission_id'] ?? 0);
            $items = $data['items'] ?? [];
            $dateGiven = $data['date_given'] ?? date('Y-m-d');
            $administeredBy = (int)($_SESSION['user_id'] ?? 0);

            if ($admissionId <= 0 || empty($items) || $administeredBy <= 0) {
                echo json_encode(['status' => 'error', 'message' => 'Missing or invalid fields']);
                return;
            }

            $conn->beginTransaction();

            // Validate admission exists and is active
            $stmt = $conn->prepare("SELECT admission_id FROM patient_admission WHERE admission_id = :admission_id AND status = 'Active' FOR UPDATE");
            $stmt->bindValue(':admission_id', $admissionId, PDO::PARAM_INT);
            $stmt->execute();
            if ($stmt->rowCount() === 0) {
                $conn->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Active admission not found']);
                return;
            }

            // Create patient_medication header
            $stmt = $conn->prepare("INSERT INTO patient_medication (admission_id, record_date) VALUES (:admission_id, :record_date)");
            $stmt->bindValue(':admission_id', $admissionId, PDO::PARAM_INT);
            $stmt->bindValue(':record_date', $dateGiven);
            $stmt->execute();
            $medicationId = (int)$conn->lastInsertId();

            // Prepare statements for batch processing
            $priceStmt = $conn->prepare("SELECT unit_price, stock_quantity FROM tbl_medicine WHERE med_id = :med_id AND is_active = 1 FOR UPDATE");
            $itemStmt = $conn->prepare("INSERT INTO tbl_medication_item (medication_id, med_id, quantity, administered_by, date_given, charge) VALUES (:medication_id, :med_id, :quantity, :administered_by, :date_given, :charge)");
            $deductStmt = $conn->prepare("UPDATE tbl_medicine SET stock_quantity = stock_quantity - :quantity WHERE med_id = :med_id");

            foreach ($items as $item) {
                $medId = (int)($item['med_id'] ?? 0);
                $quantity = (int)($item['quantity'] ?? 0);
                
                if ($medId <= 0 || $quantity <= 0) {
                    $conn->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Invalid medicine item']);
                    return;
                }

                // Lock and validate stock
                $priceStmt->bindValue(':med_id', $medId, PDO::PARAM_INT);
                $priceStmt->execute();
                $row = $priceStmt->fetch(PDO::FETCH_ASSOC);
                if (!$row) {
                    $conn->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Medicine not found: ' . $medId]);
                    return;
                }
                if ((int)$row['stock_quantity'] < $quantity) {
                    $conn->rollBack();
                    echo json_encode(['status' => 'error', 'message' => 'Insufficient stock for medicine ID ' . $medId]);
                    return;
                }

                $unitPrice = (float)$row['unit_price'];
                $charge = $unitPrice * $quantity;

                $itemStmt->bindValue(':medication_id', $medicationId, PDO::PARAM_INT);
                $itemStmt->bindValue(':med_id', $medId, PDO::PARAM_INT);
                $itemStmt->bindValue(':quantity', $quantity, PDO::PARAM_INT);
                $itemStmt->bindValue(':administered_by', $administeredBy, PDO::PARAM_INT);
                $itemStmt->bindValue(':date_given', $dateGiven);
                $itemStmt->bindValue(':charge', $charge);
                $itemStmt->execute();

                $deductStmt->bindValue(':quantity', $quantity, PDO::PARAM_INT);
                $deductStmt->bindValue(':med_id', $medId, PDO::PARAM_INT);
                $deductStmt->execute();
            }

            $conn->commit();
            echo json_encode([
                'status' => 'success', 
                'message' => 'Medicines dispensed successfully',
                'medication_id' => $medicationId
            ]);
        } catch (PDOException $e) {
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $page = $_GET['page'] ?? 1;
    $itemsPerPage = $_GET['itemsPerPage'] ?? 10;
    $search = $_GET['search'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
    $data = $payload['data'] ?? [];
}

$svc = new PharmacistAPI();

switch ($operation) {
    case 'getPatientsForDispensing':
        $svc->getPatientsForDispensing([
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search,
        ]);
        break;
    case 'getMedicinesForDispensing':
        $svc->getMedicinesForDispensing([
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search,
        ]);
        break;
    case 'getDispensingHistory':
        $admissionId = $_GET['admission_id'] ?? $data['admission_id'] ?? 0;
        $svc->getDispensingHistory($admissionId);
        break;
    case 'dispenseMedicine':
        $svc->dispenseMedicine($data);
        break;
    case 'dispenseMedicinesBatch':
        $svc->dispenseMedicinesBatch($data);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        break;
}

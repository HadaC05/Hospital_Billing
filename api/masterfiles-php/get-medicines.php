<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Medicines
{
    function getMedicines($params = [])
    {
        include '../connection-pdo.php';

        // Get pagination parameters
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;
        $search = isset($params['search']) ? $params['search'] : '';

        // Calculate offset
        $offset = ($page - 1) * $itemsPerPage;

        // Build WHERE clause for search
        $whereClause = '';
        $searchParams = [];

        if (!empty($search)) {
            $whereClause = "WHERE m.med_name LIKE :search 
                            OR mt.med_type_name LIKE :search 
                            OR mu.unit_name LIKE :search";
            $searchParams[':search'] = "%$search%";
        }

        try {
            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM tbl_medicine m 
                            LEFT JOIN tbl_medicine_type mt ON m.med_type_id = mt.med_type_id 
                            LEFT JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                            $whereClause";
            $countStmt = $conn->prepare($countSql);
            if (!empty($searchParams)) {
                $countStmt->execute($searchParams);
            } else {
                $countStmt->execute();
            }
            $totalCount = (int)$countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get paginated data
            $sql = "
                SELECT 
                    m.med_id,
                    m.med_name,
                    m.med_type_id,
                    mt.med_type_name,
                    m.unit_price,
                    m.stock_quantity,
                    m.unit_id,
                    mu.unit_name,
                    m.is_active
                FROM tbl_medicine m
                LEFT JOIN tbl_medicine_type mt ON m.med_type_id = mt.med_type_id
                LEFT JOIN tbl_medicine_unit mu ON m.unit_id = mu.unit_id
                $whereClause
                ORDER BY m.med_name ASC
                LIMIT :limit OFFSET :offset
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':limit', $itemsPerPage, PDO::PARAM_INT);
            $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

            if (!empty($searchParams)) {
                foreach ($searchParams as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
            }

            $stmt->execute();
            $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate pagination info
            $totalPages = $itemsPerPage > 0 ? (int)ceil($totalCount / $itemsPerPage) : 1;
            $startIndex = $offset + 1;
            $endIndex = min($offset + $itemsPerPage, $totalCount);

            echo json_encode([
                'success' => true,
                'medicines' => $medicines,
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
            echo json_encode([
                'success' => false,
                'message' => 'Failed to fetch medicines: ' . $e->getMessage()
            ]);
        }
    }

    function addMedicine($data)
    {
        include '../connection-pdo.php';

        // Check duplicate name
        $checkSql = "SELECT COUNT(*) FROM tbl_medicine WHERE med_name = :med_name";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':med_name', $data['med_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A medicine with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_medicine (med_name, med_type_id, unit_price, stock_quantity, unit_id, is_active)
            VALUES (:med_name, :med_type_id, :unit_price, :stock_quantity, :unit_id, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':med_name', $data['med_name']);
        $stmt->bindParam(':med_type_id', $data['med_type_id']);
        $stmt->bindParam(':unit_price', $data['unit_price']);
        $stmt->bindParam(':stock_quantity', $data['stock_quantity']);
        $stmt->bindParam(':unit_id', $data['unit_id']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Medicine added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    function getTypes()
    {
        include '../connection-pdo.php';

        $sql = "
            SELECT *
            FROM tbl_medicine_type
            ORDER BY med_type_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        echo json_encode([
            'success' => true,
            'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    function getUnits()
    {
        include '../connection-pdo.php';

        $sql = '
            SELECT *
            FROM tbl_medicine_unit
            ORDER BY unit_name ASC
        ';

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        echo json_encode([
            'success' => true,
            'units' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    function updateMedicine($med_id, $med_name, $med_type_id, $unit_price, $stock_quantity, $unit_id, $is_active)
    {
        include '../connection-pdo.php';

        // Check duplicate name (exclude current record)
        $checkSql = "SELECT COUNT(*) FROM tbl_medicine WHERE med_name = :med_name AND med_id != :med_id";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':med_name', $med_name);
        $checkStmt->bindParam(':med_id', $med_id);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Another medicine with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_medicine
            SET med_name = :med_name,
                med_type_id = :med_type_id,
                unit_price = :unit_price,
                stock_quantity = :stock_quantity,
                unit_id = :unit_id,
                is_active = :is_active
            WHERE med_id = :med_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':med_name', $med_name);
        $stmt->bindParam(':med_type_id', $med_type_id);
        $stmt->bindParam(':unit_price', $unit_price);
        $stmt->bindParam(':stock_quantity', $stock_quantity);
        $stmt->bindParam(':unit_id', $unit_id);
        $stmt->bindParam(':is_active', $is_active);
        $stmt->bindParam(':med_id', $med_id);

        $success = $stmt->execute();

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Updated successfully' : 'Failed to update'
        ]);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';

    // Get pagination parameters from GET request
    $page = $_GET['page'] ?? 1;
    $itemsPerPage = $_GET['itemsPerPage'] ?? 10;
    $search = $_GET['search'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';

    // Get pagination parameters from POST request
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
}

$data = json_decode($json, true);

$med = new Medicines();

switch ($operation) {
    case 'getMedicines':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $med->getMedicines($params);
        break;
    case 'addMedicine':
        $med->addMedicine($data);
        break;
    case 'getTypes':
        $med->getTypes();
        break;
    case 'getUnits':
        $med->getUnits();
        break;
    case 'updateMedicine':
        $med->updateMedicine(
            $data['med_id'],
            $data['med_name'],
            $data['med_type_id'],
            $data['unit_price'],
            $data['stock_quantity'],
            $data['unit_id'],
            $data['is_active']
        );
        break;
}

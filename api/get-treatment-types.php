<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Treatment_Types
{
    // get types
    function getTypes($params = [])
    {
        include 'connection-pdo.php';

        // Get pagination parameters
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;
        // $search = isset($params['search']) ? $params['search'] : '';

        // Calculate offset
        $offset = ($page - 1) * $itemsPerPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM tbl_treatment_category";
        $countStmt = $conn->prepare($countSql);

        $countStmt->execute();

        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT *
            FROM tbl_treatment_category
            ORDER BY category_name ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':limit', $itemsPerPage, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate pagination info
        $totalPages = ceil($totalCount / $itemsPerPage);
        $startIndex = $offset + 1;
        $endIndex = min($offset + $itemsPerPage, $totalCount);

        echo json_encode([
            'success' => true,
            'types' => $types,
            'pagination' => [
                'currentPage' => $page,
                'itemsPerPage' => $itemsPerPage,
                'totalItems' => $totalCount,
                'totalPages' => $totalPages,
                'startIndex' => $startIndex,
                'endIndex' => $endIndex
            ]
        ]);
    }

    // add new type
    function addType($data)
    {
        include 'connection-pdo.php';

        // check duplicate name
        $checkSql = "
            SELECT COUNT(*) 
            FROM tbl_treatment_category 
            WHERE category_name = :category_name
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':category_name', $data['category_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A type with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_treatment_category (category_name, description, is_active)
            VALUES (:category_name, :description, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':category_name', $data['category_name']);
        $stmt->bindParam(':description', $data['description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Treatmetn type added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // update existing type 
    function updateType($category_name, $description, $treatment_category_id, $is_active)
    {
        include 'connection-pdo.php';

        // check duplicate name
        $checkSql = "
            SELECT COUNT(*) 
            FROM tbl_treatment_category 
            WHERE category_name = :category_name
            AND treatment_category_id != :treatment_category_id
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':category_name', $data['category_name']);
        $checkStmt->bindParam(':treatment_category_id', $data['treatment_category_id']);

        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A type with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_treatment_category
            SET category_name = :category_name,
                description = :description,
                is_active = :is_active
            WHERE treatment_category_id = :treatment_category_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':category_name', $category_name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':treatment_category_id', $treatment_category_id);
        $stmt->bindParam(':is_active', $is_active);

        $success = $stmt->execute();

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Updated succesfully' : 'Failed to update'
        ]);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';

    $page = $_GET['page'] ?? 1;
    $itemsPerPage = $_GET['itemsPerPage'] ?? 10;
    $search = $_GET['search'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';

    // Get pagination parameters from POST request
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
}

$data = json_decode($json, true);

$treatmentType = new Treatment_Types();

switch ($operation) {
    case 'getTypes':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $treatmentType->getTypes($params);
        break;
    case 'addType':
        $treatmentType->addType($data);
        break;
    case 'updateType':
        $treatment_category_id = $data['treatment_category_id'];
        $category_name = $data['category_name'];
        $description = $data['description'];
        $is_active = $data['is_active'];
        $treatmentType->updateType(
            $category_name,
            $description,
            $treatment_category_id,
            $is_active
        );
        break;
}

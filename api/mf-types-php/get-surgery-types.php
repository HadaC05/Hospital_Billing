<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Surgery_Types
{
    // function to display list of surgery types
    function getTypes($params = [])
    {
        include '../connection-pdo.php';

        // Get pagination parameters
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;
        // $search = isset($params['search']) ? $params['search'] : '';

        // Calculate offset
        $offset = ($page - 1) * $itemsPerPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM tbl_surgery_type";
        $countStmt = $conn->prepare($countSql);

        $countStmt->execute();

        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT * 
            FROM tbl_surgery_type
            ORDER BY surgery_type_name ASC
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

    // function to add new surgery type
    function addSurgeryType($data)
    {
        include '../connection-pdo.php';

        // Check duplicate
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_surgery_type
            WHERE surgery_type_name = :surgery_type_name
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':surgery_type_name', $data['surgery_type_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A type with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_surgery_type (surgery_type_name, description, is_active)
            VALUES (:surgery_type_name, :description, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':surgery_type_name', $data['surgery_type_name']);
        $stmt->bindParam(':description', $data['description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Surgery type added']);
        } else {
            echo json_encode(['success' => true, 'message' => 'Insert failed']);
        }
    }

    // function to update existing surgery type
    function updateSurgeryType($surgery_type_name, $surgery_type_id, $description, $is_active)
    {
        include '../connection-pdo.php';

        // Check duplicate
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_surgery_type
            WHERE surgery_type_name = :surgery_type_name
            AND surgery_type_id != :surgery_type_id
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':surgery_type_name', $data['surgery_type_name']);
        $checkStmt->bindParam(':surgery_type_id', $data['surgery_type_id']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A type with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_surgery_type
            SET surgery_type_name = :surgery_type_name,
                description = :description,
                is_active = :is_active
            WHERE surgery_type_id = :surgery_type_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':surgery_type_name', $surgery_type_name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':surgery_type_id', $surgery_type_id);
        $stmt->bindParam(':is_active', $is_active);

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

$surgType = new Surgery_Types();

switch ($operation) {
    case 'getTypes':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $surgType->getTypes($params);
        break;
    case 'addSurgeryType':
        $surgType->addSurgeryType($data);
        break;
    case 'updateSurgeryType':
        $surgery_type_name = $data['surgery_type_name'];
        $surgery_type_id = $data['surgery_type_id'];
        $description = $data['description'];
        $is_active = $data['is_active'];
        $surgType->updateSurgeryType(
            $surgery_type_name,
            $surgery_type_id,
            $description,
            $is_active
        );
}

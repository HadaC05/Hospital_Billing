<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Labtest_Types
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
        $countSql = "SELECT COUNT(*) as total FROM tbl_labtest_category";
        $countStmt = $conn->prepare($countSql);

        $countStmt->execute();

        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT *
            FROM tbl_labtest_category
            ORDER BY labtest_category_name ASC
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
            SELECT COUNT(*) FROM tbl_labtest_category WHERE labtest_category_name = :labtest_category_name
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':labtest_category_name', $data['labtest_category_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A type with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_labtest_category (labtest_category_name, labtest_category_desc, is_active)
            VALUES (:labtest_category_name, :labtest_category_desc, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':labtest_category_name', $data['labtest_category_name']);
        $stmt->bindParam(':labtest_category_desc', $data['labtest_category_desc']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Labtest type added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // update existing type 
    function updateType($labtest_category_name, $labtest_category_id, $labtest_category_desc, $is_active)
    {
        include 'connection-pdo.php';

        // check duplicate
        $checkSql = "SELECT COUNT(*) FROM tbl_labtest_category WHERE labtest_category_name = :labtest_category_name AND labtest_category_id != :labtest_category_id";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':labtest_category_name', $labtest_category_name);
        $checkStmt->bindParam('labtest_category_id', $labtest_category_id);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Another type with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_labtest_category
            SET labtest_category_name = :labtest_category_name,
                labtest_category_desc = :labtest_category_desc,
                is_active = :is_active
            WHERE labtest_category_id = :labtest_category_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':labtest_category_name', $labtest_category_name);
        $stmt->bindParam(':labtest_category_id', $labtest_category_id);
        $stmt->bindParam(':labtest_category_desc', $labtest_category_desc);
        $stmt->bindParam(':is_active', $is_active);

        $success = $stmt->execute();

        echo json_encode(['success' => $success, 'message' => $success ? 'Updated successfully' : 'Failed to update']);
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

$labtestType = new Labtest_Types();

switch ($operation) {
    case 'getTypes':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $labtestType->getTypes($params);
        break;
    case 'addType':
        $labtestType->addType($data);
        break;
    case 'updateType':
        $labtest_category_id = $data['labtest_category_id'];
        $labtest_category_name = $data['labtest_category_name'];
        $labtest_category_desc = $data['labtest_category_desc'];
        $is_active = $data['is_active'];
        $labtestType->updateType($labtest_category_name, $labtest_category_id, $labtest_category_desc, $is_active);
        break;
}

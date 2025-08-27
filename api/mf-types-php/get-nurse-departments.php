<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Nurse_Departments
{
    // function to display all departments from database
    function getTypes($params = [])
    {
        include '../connection-pdo.php';

        // Get pagination parameters
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;

        // Calculate offset
        $offset = ($page - 1) * $itemsPerPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM user_nurse_department WHERE is_active = 1";
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute();

        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT department_id, department_name, description
            FROM user_nurse_department
            WHERE is_active = 1
            ORDER BY department_name ASC
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
            'data' => $types, // For backward compatibility
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

    // function to add new nurse department
    function addDepartment($data)
    {
        include '../connection-pdo.php';

        // check duplicate name
        $checkSql = "
            SELECT COUNT(*) 
            FROM user_nurse_department 
            WHERE department_name = :department_name
        ";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':department_name', $data['department_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A department with this name already exists'
            ]);
            return;
        }

        $sql = '
            INSERT INTO user_nurse_department (department_name, description, is_active)
            VALUES (:department_name, :description, 1)
        ';

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':department_name', $data['department_name']);
        $stmt->bindParam(':description', $data['description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Nurse department added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // function to update existing nurse department
    function updateDepartment($department_name, $description, $department_id, $is_active)
    {
        include '../connection-pdo.php';

        // check for duplicate name
        $checkSql = "
            SELECT COUNT(*)
            FROM user_nurse_department
            WHERE department_name = :department_name AND department_id != :department_id
        ";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':department_name', $department_name);
        $checkStmt->bindParam(':department_id', $department_id);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Another department with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE user_nurse_department
            SET department_name = :department_name,
                description = :description,
                is_active = :is_active
            WHERE department_id = :department_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':department_name', $department_name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':department_id', $department_id);
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

$nurseDepartment = new Nurse_Departments();

switch ($operation) {
    case 'getTypes':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $nurseDepartment->getTypes($params);
        break;
    case 'addDepartment':
        $nurseDepartment->addDepartment($data);
        break;
    case 'updateDepartment':
        $nurseDepartment->updateDepartment(
            $data['department_name'],
            $data['description'],
            $data['department_id'],
            $data['is_active']
        );
        break;
    default:
        // Default behavior for backward compatibility - just get all active departments
        $nurseDepartment->getTypes(['page' => 1, 'itemsPerPage' => 1000]);
        break;
}

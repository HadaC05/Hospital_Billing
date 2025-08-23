<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Medicine_Types
{
    // function to display all types from database
    function getTypes($params = [])
    {
        include 'connection-pdo.php';

        // Get pagination parameters
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;

        // Calculate offset
        $offset = ($page - 1) * $itemsPerPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM tbl_medicine_type";
        $countStmt = $conn->prepare($countSql);

        $countStmt->execute();

        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT *
            FROM tbl_medicine_type
            ORDER BY med_type_name ASC
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

    // function to add new medicine type
    function addMedicineType($data)
    {
        include 'connection-pdo.php';

        $sql = '
            INSERT INTO tbl_medicine_type (med_type_name, description)
            VALUES (:med_type_name, :description)
        ';

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':med_type_name', $data['med_type_name']);
        $stmt->bindParam(':description', $data['description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Medicine type added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // function to update existing medicine type
    function updateMedType($med_type_name, $description, $med_type_id)
    {
        include 'connection-pdo.php';

        $sql = "
            UPDATE tbl_medicine_type
            SET med_type_name = :med_type_name,
                description = :description
            WHERE med_type_id = :med_type_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':med_type_name', $med_type_name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':med_type_id', $med_type_id);

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

    // Get pagination paramaters from POST request
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
}

$data = json_decode($json, true);

$medType = new Medicine_Types();

switch ($operation) {
    case 'getTypes':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $medType->getTypes($params);
        break;
    case 'addMedicineType':
        $medType->addMedicineType($data);
        break;
    case 'updateMedType':
        $med_type_id = $data['med_type_id'];
        $med_type_name = $data['med_type_name'];
        $description = $data['description'];
        $medType->updateMedType($med_type_name, $description, $med_type_id);
        break;
}

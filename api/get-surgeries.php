<?php

require_once __DIR__ . '/require_auth.php';


header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Surgeries
{
    function getSurgeries($params = [])
    {
        include 'connection-pdo.php';

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
            $whereClause = "WHERE s.surgery_name LIKE :search 
                            OR st.surgery_type_name LIKE :search";
            $searchParams[':search'] = "%$search%";
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM tbl_surgery s
                        JOIN tbl_surgery_type st ON s.surgery_type_id = st.surgery_type_id 
                        $whereClause";
        $countStmt = $conn->prepare($countSql);
        if (!empty($searchParams)) {
            $countStmt->execute($searchParams);
        } else {
            $countStmt->execute();
        }
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT 
                s.surgery_id,
                s.surgery_name,
                s.surgery_type_id,
                st.surgery_type_name,
                s.surgery_price,
                s.is_available
            FROM tbl_surgery s
            JOIN tbl_surgery_type st ON s.surgery_type_id = st.surgery_type_id
            $whereClause
            ORDER BY s.surgery_name ASC,
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
        $surgeries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate pagination info
        $totalPages = ceil($totalCount / $itemsPerPage);
        $startIndex = $offset + 1;
        $endIndex = min($offset + $itemsPerPage, $totalCount);

        $response = [
            'success' => true,
            'surgeries' => $surgeries,
            'pagination' => [
                'currentPage' => $page,
                'itemsPerPage' => $itemsPerPage,
                'totalItems' => $totalCount,
                'totalPages' => $totalPages,
                'startIndex' => $startIndex,
                'endIndex' => $endIndex
            ]
        ];

        echo json_encode($response);
    }

    function addSurgery($data)
    {
        include 'connection-pdo.php';

        // Check duplicate
        $checkSql = "SELECT COUNT(*) FROM tbl_surgery WHERE surgery_name = :surgery_name";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':surgery_name', $data['surgery_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A surgery with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_surgery (surgery_name, surgery_type_id, surgery_price, is_available)
            VALUES (:surgery_name, :surgery_type_id, :surgery_price, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':surgery_name', $data['surgery_name']);
        $stmt->bindParam(':surgery_type_id', $data['surgery_type_id']);
        $stmt->bindParam(':surgery_price', $data['surgery_price']);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Surgery added'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Insert failed'
            ]);
        }
    }

    function getTypes()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT surgery_type_id, surgery_type_name
            FROM tbl_surgery_type
            ORDER BY surgery_type_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'types' => $types
        ]);
    }

    function updateSurgery($surgery_id, $surgery_name, $surgery_type_id, $surgery_price, $is_available)
    {
        include 'connection-pdo.php';

        // Check duplicate name (exclude current record)
        $checkSql = "SELECT COUNT(*) FROM tbl_surgery WHERE surgery_name = :surgery_name AND surgery_id != :surgery_id";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':surgery_name', $surgery_name);
        $checkStmt->bindParam(':surgery_id', $surgery_id);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Another surgery with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_surgery
            SET surgery_name = :surgery_name,
                surgery_type_id = :surgery_type_id,
                surgery_price = :surgery_price,
                is_available = :is_available
            WHERE surgery_id = :surgery_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':surgery_name', $surgery_name);
        $stmt->bindParam(':surgery_type_id', $surgery_type_id);
        $stmt->bindParam(':surgery_price', $surgery_price);
        $stmt->bindParam(':is_available', $is_available);
        $stmt->bindParam(':surgery_id', $surgery_id);

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

$surg = new Surgeries();

switch ($operation) {
    case 'getSurgeries':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $surg->getSurgeries($params);
        break;
    case 'addSurgery':
        $surg->addSurgery($data);
        break;
    case 'getTypes':
        $surg->getTypes();
        break;
    case 'updateSurgery':
        $surgery_id = $data['surgery_id'];
        $surgery_name = $data['surgery_name'];
        $surgery_type_id = $data['surgery_type_id'];
        $surgery_price = $data['surgery_price'];
        $is_available = $data['is_available'];
        $surg->updateSurgery($surgery_id, $surgery_name, $surgery_type_id, $surgery_price, $is_available);
        break;
}

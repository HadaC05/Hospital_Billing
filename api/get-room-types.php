<?php

// require_once __DIR__ . 'require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Room_Types
{
    // get room types
    function getTypes($params = [])
    {
        include 'connection-pdo.php';

        // get parameters 
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;

        // Calculate offset
        $offset = ($page - 1) * $itemsPerPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM tbl_room_type";
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute();

        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT *
            FROM tbl_room_type
            ORDER BY room_type_name ASC
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

    // add room type
    function addRoomType($data)
    {
        include 'connection-pdo.php';

        // check duplicate name
        $checkSql = "
            SELECT COUNT(*) 
            FROM tbl_room_type
            WHERE room_type_name = :room_type_name
        ";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':room_type_name', $data['room_type_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A type with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_room_type (room_type_name, room_description, is_active)
            VALUES (:room_type_name, :room_description, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_type_name', $data['room_type_name']);
        $stmt->bindParam(':room_description', $data['room_description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Room type added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // update room type
    function updateRoomType($room_type_name, $room_description, $room_type_id, $is_active)
    {
        include 'connection-pdo.php';

        // check duplicate name
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_room_type
            WHERE room_type_name = :room_type_name AND room_type_id != :room_type_id
        ";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':room_type_name', $data['room_type_name']);
        $checkStmt->bindParam(':room_type_id', $data['room_type_id']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A type with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_room_type
            SET room_type_name = :room_type_name,
                room_description = :room_description,
                is_active = :is_active
            WHERE room_type_id = :room_type_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_type_name', $room_type_name);
        $stmt->bindParam(':room_description', $room_description);
        $stmt->bindParam(':room_type_id', $room_type_id);
        $stmt->bindParam('is_active', $is_active);


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
    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';

    // Get pagination parameters
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
}

$data = json_decode($json, true);

$roomType = new Room_Types;

switch ($operation) {
    case 'getTypes';
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $roomType->getTypes($params);
        break;
    case 'addRoomType':
        $roomType->addRoomType($data);
        break;
    case 'updateRoomType':
        $roomType->updateRoomType(
            $data['room_type_name'],
            $data['room_description'],
            $data['room_type_id'],
            $data['is_active']
        );
        break;
}

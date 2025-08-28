<?php

// require_once __DIR__ . '../require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class Rooms
{
    function getRooms($params = [])
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
            $whereClause = "WHERE r.room_number LIKE :search 
                            OR rt.room_type_name LIKE :search";
            $searchParams[':search'] = "%$search%";
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM tbl_room r
                        JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id 
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
                r.room_id,
                r.room_number,
                r.room_type_id,
                rt.room_type_name,
                r.daily_rate,
                r.max_occupancy,
                r.is_available
            FROM tbl_room r
            JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
            $whereClause
            ORDER BY r.room_number ASC
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
        $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate pagination info
        $totalPages = ceil($totalCount / $itemsPerPage);
        $startIndex = $offset + 1;
        $endIndex = min($offset + $itemsPerPage, $totalCount);

        $response = [
            'success' => true,
            'rooms' => $rooms,
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

    function addRoom($data)
    {
        include '../connection-pdo.php';

        // check dupicate name 
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_room
            WHERE room_number = :room_number
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':room_number', $data['room_number']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A room with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_room (room_number, room_type_id, daily_rate, max_occupancy, is_available)
            VALUES (:room_number, :room_type_id, :daily_rate, :max_occupancy, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_number', $data['room_number']);
        $stmt->bindParam(':room_type_id', $data['room_type_id']);
        $stmt->bindParam(':daily_rate', $data['daily_rate']);
        $stmt->bindParam(':max_occupancy', $data['max_occupancy']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Room added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    function getRoomTypes()
    {
        include '../connection-pdo.php';

        $sql = "
            SELECT room_type_id, room_type_name, is_active
            FROM tbl_room_type
            ORDER BY room_type_name ASC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode([
            'success' => true,
            'types' => $types
        ]);
    }

    function updateRoom($data)
    {
        include '../connection-pdo.php';

        // check duplicate
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_room
            WHERE room_number = :room_number AND room_id != :room_id
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':room_number', $data['room_number']);
        $checkStmt->bindParam(':room_id', $data['room_id']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Another room with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_room 
            SET 
                room_number = :room_number,
                room_type_id = :room_type_id,
                daily_rate = :daily_rate,
                max_occupancy = :max_occupancy,
                is_available = :is_available
            WHERE room_id = :room_id
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_id', $data['room_id']);
        $stmt->bindParam(':room_number', $data['room_number']);
        $stmt->bindParam(':room_type_id', $data['room_type_id']);
        $stmt->bindParam(':daily_rate', $data['daily_rate']);
        $stmt->bindParam(':max_occupancy', $data['max_occupancy']);
        $stmt->bindParam(':is_available', $data['is_available']);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Room updated']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Update failed']);
        }
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
$room = new Rooms();
switch ($operation) {
    case 'getRooms':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $room->getRooms($params);
        break;
    case 'addRoom':
        $room->addRoom($data);
        break;
    case 'getRoomTypes':
        $room->getRoomTypes();
        break;
    case 'updateRoom':
        $room->updateRoom($data);
        break;
}

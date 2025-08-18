<?php

// require_once __DIR__ . 'require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Room_Types
{
    // get room types
    function getTypes()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT room_type_id, room_type_name, room_description as description, 1 as is_active
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

    // add room type
    function addRoomType($data)
    {
        include 'connection-pdo.php';

        $sql = "
            INSERT INTO tbl_room_type (room_type_name, room_description)
            VALUES (:room_type_name, :room_description)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_type_name', $data['room_type_name']);
        $stmt->bindParam(':room_description', $data['description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Room type added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // update room type
    function updateRoomType($room_type_name, $room_description, $room_type_id)
    {
        include 'connection-pdo.php';

        $sql = "
            UPDATE tbl_room_type
            SET room_type_name = :room_type_name,
                room_description = :room_description
            WHERE room_type_id = :room_type_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_type_name', $room_type_name);
        $stmt->bindParam(':room_description', $room_description);
        $stmt->bindParam(':room_type_id', $room_type_id);

        $success = $stmt->execute();

        echo json_encode(['success' => $success, 'message' => $success ? 'Updated successfully' : 'Failed to update']);
    }

    // delete room type
    function deleteRoomType($data)
    {
        include 'connection-pdo.php';

        // Check if room type is being used by any rooms
        $checkSql = "SELECT COUNT(*) as count FROM tbl_room WHERE room_type_id = :room_type_id";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':room_type_id', $data['room_type_id']);
        $checkStmt->execute();
        $result = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($result['count'] > 0) {
            echo json_encode(['success' => false, 'message' => 'Cannot delete room type. It is being used by existing rooms.']);
            return;
        }

        $sql = "DELETE FROM tbl_room_type WHERE room_type_id = :room_type_id";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_type_id', $data['room_type_id']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Room type deleted successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Delete failed']);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);

$roomType = new Room_Types;

switch ($operation) {
    case 'getTypes':
        $roomType->getTypes();
        break;
    case 'addRoomType':
        $roomType->addRoomType($data);
        break;
    case 'updateRoomType':
        $room_type_name = $data['room_type_name'];
        $room_description = $data['description'];
        $room_type_id = $data['room_type_id'];
        $roomType->updateRoomType($room_type_name, $room_description, $room_type_id);
        break;
    case 'deleteRoomType':
        $roomType->deleteRoomType($data);
        break;
}

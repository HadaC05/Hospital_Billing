<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class Rooms
{
    function getRooms()
    {
        include 'connection-pdo.php';
        $sql = "
            SELECT 
                r.room_id,
                r.room_number,
                rt.room_type_name,
                r.daily_rate,
                r.max_occupancy,
                r.is_available
            FROM tbl_room r
            JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
            ORDER BY r.room_number ASC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response = [
            'success' => true,
            'rooms' => $rooms
        ];
        echo json_encode($response);
    }
    
    function addRoom($data)
    {
        include 'connection-pdo.php';
        $sql = "
            INSERT INTO tbl_room (room_number, room_type_id, daily_rate, max_occupancy, is_available)
            VALUES (:room_number, :room_type_id, :daily_rate, :max_occupancy, :is_available)
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_number', $data['room_number']);
        $stmt->bindParam(':room_type_id', $data['room_type_id']);
        $stmt->bindParam(':daily_rate', $data['daily_rate']);
        $stmt->bindParam(':max_occupancy', $data['max_occupancy']);
        $stmt->bindParam(':is_available', $data['is_available']);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Room added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }
    
    function getRoomTypes()
    {
        include 'connection-pdo.php';
        $sql = "
            SELECT room_type_id, room_type_name
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
    
    function getRoom($data)
    {
        include 'connection-pdo.php';
        $sql = "
            SELECT 
                r.room_id,
                r.room_number,
                r.room_type_id,
                r.daily_rate,
                r.max_occupancy,
                r.is_available
            FROM tbl_room r
            WHERE r.room_id = :room_id
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':room_id', $data['room_id']);
        $stmt->execute();
        $room = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($room) {
            echo json_encode(['success' => true, 'room' => $room]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Room not found']);
        }
    }
    
    function updateRoom($data)
    {
        include 'connection-pdo.php';
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
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}
$data = json_decode($json, true);
$room = new Rooms();
switch ($operation) {
    case 'getRooms':
        $room->getRooms();
        break;
    case 'addRoom':
        $room->addRoom($data);
        break;
    case 'getRoomTypes':
        $room->getRoomTypes();
        break;
    case 'getRoom':
        $room->getRoom($data);
        break;
    case 'updateRoom':
        $room->updateRoom($data);
        break;
}
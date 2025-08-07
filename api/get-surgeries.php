<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Surgeries
{
    function getSurgeries()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT 
                s.surgery_id,
                s.surgery_name,
                st.surgery_type_name,
                s.surgery_price,
                s.is_available
            FROM tbl_surgery s
            JOIN tbl_surgery_type st ON s.surgery_type_id = st.surgery_type_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $surgeries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'success' => true,
            'surgeries' => $surgeries
        ];

        echo json_encode($response);
    }

    function addSurgery($data)
    {
        include 'connection-pdo.php';

        $sql = "
            INSERT INTO tbl_surgery (surgery_name, surgery_type_id, surgery_price, is_available)
            VALUES (:surgery_name, :surgery_type_id, :surgery_price, :is_available)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':surgery_name', $data['surgery_name']);
        $stmt->bindParam(':surgery_type_id', $data['surgery_type_id']);
        $stmt->bindParam(':surgery_price', $data['surgery_price']);
        $stmt->bindParam(':is_available', $data['is_available']);

        if ($stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Medicine added'
            ]);
        } else {
            echo json_encode([
                'success' => false, //recheck
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
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}


$data = json_decode($json, true);

$surg = new Surgeries();

switch ($operation) {
    case 'getSurgeries':
        $surg->getSurgeries();
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

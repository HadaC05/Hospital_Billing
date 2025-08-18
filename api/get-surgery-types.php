<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Surgery_Types
{
    // function to display list of surgery types
    function getTypes()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT * 
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

    // function to add new surgery type
    function addSurgeryType($data)
    {
        include 'connection-pdo.php';

        $sql = "
            INSERT INTO tbl_surgery_type (surgery_type_name, description)
            VALUES (:surgery_type_name, :description)
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
    function updateSurgeryType($surgery_type_name, $surgery_type_id, $description)
    {
        include 'connection-pdo.php';

        $sql = "
            UPDATE tbl_surgery_type
            SET surgery_type_name = :surgery_type_name,
                description = :description
            WHERE surgery_type_id = :surgery_type_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam('surgery_type_name', $surgery_type_name);
        $stmt->bindParam('description', $description);
        $stmt->bindParam('surgery_type_id', $surgery_type_id);

        $success = $stmt->execute();

        json_encode([
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

$surgType = new Surgery_Types();

switch ($operation) {
    case 'getTypes':
        $surgType->getTypes();
        break;
    case 'addSurgeryType':
        $surgType->addSurgeryType($data);
        break;
    case 'updateSurgeryType':
        $surgery_type_name = $data['surgery_type_name'];
        $surgery_type_id = $data['surgery_type_id'];
        $description = $data['description'];
        $surgType->updateSurgeryType($surgery_type_name, $surgery_type_id, $description);
}

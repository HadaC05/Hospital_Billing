<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Treatment_Types
{
    // get types
    function getTypes()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT *
            FROM tbl_treatment_category
            ORDER BY category_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'types' => $types
        ]);
    }

    // add new type
    function addType($data)
    {
        include 'connection-pdo.php';

        $sql = "
            INSERT INTO tbl_treatment_category (category_name, description)
            VALUES (:category_name, :description)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':category_name', $data['category_name']);
        $stmt->bindParam(':description', $data['description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Treatmetn type added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // update existing type 
    function updateType($category_name, $description, $treatment_category_id)
    {
        include 'connection-pdo.php';

        $sql = "
            UPDATE tbl_treatment_category
            SET category_name = :category_name,
                description = :description
            WHERE treatment_category_id = :treatment_category_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':category_name', $category_name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':treatment_category_id', $treatment_category_id);

        $success = $stmt->execute();

        echo json_encode(['success' => $success, 'message' => $success ? 'Updated succesfully' : 'Failed to update']);
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

$treatmentType = new Treatment_Types();

switch ($operation) {
    case 'getTypes':
        $treatmentType->getTypes();
        break;
    case 'addType':
        $treatmentType->addType($data);
        break;
    case 'updateType':
        $treatment_category_id = $data['treatment_category_id'];
        $category_name = $data['category_name'];
        $description = $data['description'];
        $treatmentType->updateType($category_name, $description, $treatment_category_id);
        break;
}

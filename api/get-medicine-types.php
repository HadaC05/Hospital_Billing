<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Medicine_Types
{
    // function to display all types from database
    function getTypes()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT *
            FROM tbl_medicine_type
            ORDER BY med_type_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'types' => $types
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
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);

$medType = new Medicine_Types();

switch ($operation) {
    case 'getTypes':
        $medType->getTypes();
        break;
    case 'addMedicineType':
        $medType->addMedicineType($data);
        break;
    case 'updateMedType':
        $med_type_id = $data['med_type_id'];
        $med_type_name = $data['med_type_name'];
        $description = $data['description'];
        $medType->updateMedType($med_type_name, $description, $med_type_id);
}

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
            FROM tbl_labtest_category
            ORDER BY labtest_category_name ASC
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
            INSERT INTO tbl_labtest_category (labtest_category_name, labtest_category_desc)
            VALUES (:labtest_category_name, :labtest_category_desc)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':labtest_category_name', $data['labtest_category_name']);
        $stmt->bindParam(':labtest_category_desc', $data['labtest_category_desc']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Labtest type added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // update existing type 
    function updateType($labtest_category_name, $labtest_category_id, $labtest_category_desc)
    {
        include 'connection-pdo.php';

        $sql = "
            UPDATE tbl_labtest_category
            SET labtest_category_name = :labtest_category_name,
                labtest_category_desc = :labtest_category_desc
            WHERE labtest_category_id = :labtest_category_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':labtest_category_name', $labtest_category_name);
        $stmt->bindParam(':labtest_category_id', $labtest_category_id);
        $stmt->bindParam(':labtest_category_desc', $labtest_category_desc);

        $success = $stmt->execute();

        echo json_encode(['success' => $success, 'message' => $success ? 'Updated successfully' : 'Failed to update']);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $payload = json_encode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_encode($json, true);

$treatmentType = new Treatment_Types();

switch ($operation) {
    case 'getTypes';
        $treatmentType->getTypes();
        break;
    case 'addType';
        $treatmentType->addType($data);
        break;
    case 'updateType':
        $labtest_category_id = $data['labtest_category_id'];
        $labtest_category_name = $data['labtest_category_name'];
        $labtest_category_desc = $data['labtest_category_desc'];
        $treatmentType->updateType($labtest_category_name, $labtest_category_id, $labtest_category_desc);
        break;
}

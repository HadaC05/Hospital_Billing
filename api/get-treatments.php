<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Treatments
{
    function getTreatments()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT 
                t.treatment_id,
                t.treatment_name,
                t.unit_price,
                tc.category_name AS treatment_category
            FROM tbl_treatment t
            JOIN tbl_treatment_category tc ON t.treatment_category_id = tc.treatment_category_id
            ORDER BY t.treatment_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $treatments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'success' => true,
            'treatments' => $treatments
        ];

        echo json_encode($response);
    }

    function addTreatment($data)
    {
        include 'connection-pdo.php';

        $sql = "
            INSERT INTO tbl_treatment (treatment_name, unit_price, treatment_category_id)
            VALUES (:treatment_name, :unit_price, :treatment_category_id)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':treatment_name', $data['treatment_name']);
        $stmt->bindParam(':unit_price', $data['unit_price']);
        $stmt->bindParam(':treatment_category_id', $data['treatment_category_id']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Treatment added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    function getTreatmentCategories()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT treatment_category_id, category_name
            FROM tbl_treatment_category
            ORDER BY category_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'categories' => $categories
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

$treatment = new Treatments();

switch ($operation) {
    case 'getTreatments':
        $treatment->getTreatments();
        break;
    case 'addTreatment':
        $treatment->addTreatment($data);
        break;
    case 'getTreatmentCategories':
        $treatment->getTreatmentCategories();
        break;
}
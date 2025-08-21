<?php

require_once __DIR__ . '/require_auth.php';

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
                t.treatment_category_id,
                t.unit_price,
                t.is_active,
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

        // check duplicate name 
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_treatment
            WHERE treatment_name = :treatment_name
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':treatment_name', $data['treatment_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A room with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_treatment (treatment_name, unit_price, treatment_category_id, is_active)
            VALUES (:treatment_name, :unit_price, :treatment_category_id, 1)
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

    function updateTreatment($data)
    {
        include 'connection-pdo.php';

        // check dupicate name 
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_treatment
            WHERE treatment_name = :treatment_name AND treatment_id != :treatment_id
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':treatment_name', $data['treatment_name']);
        $checkStmt->bindParam(':treatment_id', $data['treatment_id']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A treatment with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_treatment 
            SET 
                treatment_name = :treatment_name,
                unit_price = :unit_price,
                treatment_category_id = :treatment_category_id,
                is_active = :is_active
            WHERE treatment_id = :treatment_id
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':treatment_id', $data['treatment_id']);
        $stmt->bindParam(':treatment_name', $data['treatment_name']);
        $stmt->bindParam(':unit_price', $data['unit_price']);
        $stmt->bindParam(':treatment_category_id', $data['treatment_category_id']);
        $stmt->bindParam(':is_active', $data['is_active']);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Treatment updated']);
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
    case 'updateTreatment':
        $treatment->updateTreatment($data);
        break;
}

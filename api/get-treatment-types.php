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
    function addType()
    {
        include 'connection-pdo.php';

        $sql = "
            
        ";
    }

    // update existing type 
    function updateType() {}
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
        // case '';
}

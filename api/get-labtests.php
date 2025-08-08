<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Labtests
{
    function getLabtests()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT 
                l.labtest_id,
                l.test_name, 
                lc.labtest_category_name,
                l.unit_price,
                l.is_active
            FROM tbl_labtest l
            JOIN tbl_labtest_category lc ON l.labtest_category_id = lc.labtest_category_id
            ORDER BY l.test_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $labtests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'success' => true,
            'labtests' => $labtests
        ];

        echo json_encode($response);
    }

    function getTypes()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT labtest_category_id, labtest_category_name
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

$lab = new Labtests();

switch ($operation) {
    case 'getLabtests':
        $lab->getLabtests();
        break;
    case 'getTypes':
        $lab->getTypes();
        break;
}

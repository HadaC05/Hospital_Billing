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
            JOIN tbl_labtest_category lc ON l.labtest_id = lc.labtest_category_id
            ORDER BY l.test_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $labtests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'succcess' => true,
            'labtests' => $labtests
        ];

        echo json_encode($response);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_encode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);

$lab = new Labtests();

switch ($operation) {
    case 'getLabtests':
        $lab->getLabtests();
        break;
}

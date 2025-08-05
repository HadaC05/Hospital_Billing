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
}

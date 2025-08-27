<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class ServiceAPI {
    function getServiceTypes() {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT * FROM tbl_service_type WHERE isActive = 1";
            $stmt = $pdo->query($sql);
            $types = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'service_types' => $types
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get service types: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getLabTests() {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT lt.*, ltc.labtest_category_name 
                    FROM tbl_labtest lt
                    JOIN tbl_labtest_category ltc ON lt.labtest_category_id = ltc.labtest_category_id
                    WHERE lt.is_active = 1";
            $stmt = $pdo->query($sql);
            $tests = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'lab_tests' => $tests
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get lab tests: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getMedicines() {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT m.*, mt.med_type_name 
                    FROM tbl_medicine m
                    JOIN tbl_medicine_type mt ON m.med_type_id = mt.med_type_id
                    WHERE m.is_active = 1";
            $stmt = $pdo->query($sql);
            $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'medicines' => $medicines
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get medicines: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getSurgeries() {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT s.*, st.surgery_type_name 
                    FROM tbl_surgery s
                    JOIN tbl_surgery_type st ON s.surgery_type_id = st.surgery_type_id
                    WHERE s.is_available = 1";
            $stmt = $pdo->query($sql);
            $surgeries = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'surgeries' => $surgeries
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get surgeries: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getTreatments() {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT t.*, tc.category_name 
                    FROM tbl_treatment t
                    JOIN tbl_treatment_category tc ON t.treatment_category_id = tc.treatment_category_id";
            $stmt = $pdo->query($sql);
            $treatments = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'treatments' => $treatments
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get treatments: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getRooms() {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT r.*, rt.room_type_name 
                    FROM tbl_room r
                    JOIN tbl_room_type rt ON r.room_type_id = rt.room_type_id
                    WHERE r.is_available = 1";
            $stmt = $pdo->query($sql);
            $rooms = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'rooms' => $rooms
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get rooms: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method == 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);
$obj = new ServiceAPI();

switch ($operation) {
    case "getServiceTypes":
        $obj->getServiceTypes();
        break;
        
    case "getLabTests":
        $obj->getLabTests();
        break;
        
    case "getMedicines":
        $obj->getMedicines();
        break;
        
    case "getSurgeries":
        $obj->getSurgeries();
        break;
        
    case "getTreatments":
        $obj->getTreatments();
        break;
        
    case "getRooms":
        $obj->getRooms();
        break;
}
?>
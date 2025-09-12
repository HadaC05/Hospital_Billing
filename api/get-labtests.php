<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class LabTestAPI {
    
    private $pdo;
    
    public function __construct() {
        include 'connection-pdo.php';
        $this->pdo = $pdo;
    }
    
    /**
     * Get all lab tests
     */
    public function getItems() {
        try {
            $sql = "
                SELECT 
                    labtest_id as id,
                    test_name as name,
                    unit_price,
                    is_active
                FROM tbl_labtest 
                WHERE is_active = 1
                ORDER BY test_name ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $labTests = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'items' => $labTests
            ]);
            
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get lab tests: ' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * Get lab test by ID
     */
    public function getLabTestById($labtestId) {
        try {
            $sql = "
                SELECT 
                    labtest_id as id,
                    test_name as name,
                    unit_price,
                    is_active
                FROM tbl_labtest 
                WHERE labtest_id = :labtest_id AND is_active = 1
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':labtest_id', $labtestId);
            $stmt->execute();
            $labTest = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($labTest) {
                echo json_encode([
                    'success' => true,
                    'labtest' => $labTest
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Lab test not found'
                ]);
            }
            
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get lab test: ' . $e->getMessage()
            ]);
        }
    }
}

// Handle requests
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
$api = new LabTestAPI();

switch ($operation) {
    case 'getItems':
        $api->getItems();
        break;
    case 'getLabTestById':
        $labtestId = $data['labtest_id'] ?? null;
        $api->getLabTestById($labtestId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}
?>

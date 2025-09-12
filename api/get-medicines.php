<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class MedicineAPI {
    
    private $pdo;
    
    public function __construct() {
        include 'connection-pdo.php';
        $this->pdo = $pdo;
    }
    
    /**
     * Get all medicines
     */
    public function getItems() {
        try {
            $sql = "
                SELECT 
                    med_id as id,
                    med_name as name,
                    unit_price,
                    stock_quantity,
                    is_active
                FROM tbl_medicine 
                WHERE is_active = 1
                ORDER BY med_name ASC
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'items' => $medicines
            ]);
            
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get medicines: ' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * Get medicine by ID
     */
    public function getMedicineById($medId) {
        try {
            $sql = "
                SELECT 
                    med_id as id,
                    med_name as name,
                    unit_price,
                    stock_quantity,
                    is_active
                FROM tbl_medicine 
                WHERE med_id = :med_id AND is_active = 1
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':med_id', $medId);
            $stmt->execute();
            $medicine = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($medicine) {
                echo json_encode([
                    'success' => true,
                    'medicine' => $medicine
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Medicine not found'
                ]);
            }
            
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get medicine: ' . $e->getMessage()
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
$api = new MedicineAPI();

switch ($operation) {
    case 'getItems':
        $api->getItems();
        break;
    case 'getMedicineById':
        $medId = $data['med_id'] ?? null;
        $api->getMedicineById($medId);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}
?>

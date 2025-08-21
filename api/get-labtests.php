<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class LabTestManager
{
    private $conn;

    public function __construct()
    {
        include 'connection-pdo.php';
        $this->conn = $conn;
    }

    // Get all lab tests
    public function getLabtests()
    {
        $sql = "
            SELECT 
                l.labtest_id,
                l.test_name, 
                l.labtest_category_id,
                lc.labtest_category_name,
                l.unit_price,
                l.is_active
            FROM tbl_labtest l
            JOIN tbl_labtest_category lc ON l.labtest_category_id = lc.labtest_category_id
            ORDER BY l.test_name ASC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $labtests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'labtests' => $labtests
        ]);
    }

    // Get all lab test categories
    public function getTypes()
    {
        $sql = "
            SELECT labtest_category_id, labtest_category_name
            FROM tbl_labtest_category
            ORDER BY labtest_category_name ASC
        ";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'types' => $types
        ]);
    }

    // Create new lab test
    public function createLabtest($data)
    {
        try {
            // Validate required fields
            if (empty($data['test_name']) || empty($data['labtest_category_id']) || !isset($data['unit_price'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: test_name, labtest_category_id, unit_price'
                ]);
                return;
            }

            // Check if test name already exists
            $checkSql = "SELECT COUNT(*) FROM tbl_labtest WHERE test_name = :test_name";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->bindParam(':test_name', $data['test_name']);
            $checkStmt->execute();

            if ($checkStmt->fetchColumn() > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'A lab test with this name already exists'
                ]);
                return;
            }

            // Set default is_active to 1 if not provided
            $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;

            // Insert new lab test
            $sql = "INSERT INTO tbl_labtest (test_name, labtest_category_id, unit_price, is_active) 
                    VALUES (:test_name, :labtest_category_id, :unit_price, 1)";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':test_name', $data['test_name']);
            $stmt->bindParam(':labtest_category_id', $data['labtest_category_id']);
            $stmt->bindParam(':unit_price', $data['unit_price']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Lab test created successfully',
                    'labtest_id' => $this->conn->lastInsertId()
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to create lab test'
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error creating lab test: ' . $e->getMessage()
            ]);
        }
    }

    // Update existing lab test
    public function updateLabtest($data)
    {
        try {
            // Validate required fields
            if (empty($data['labtest_id']) || empty($data['test_name']) || empty($data['labtest_category_id']) || !isset($data['unit_price'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: labtest_id, test_name, labtest_category_id, unit_price'
                ]);
                return;
            }

            // Check if test exists
            $checkSql = "SELECT COUNT(*) FROM tbl_labtest WHERE labtest_id = :labtest_id";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->bindParam(':labtest_id', $data['labtest_id']);
            $checkStmt->execute();

            if ($checkStmt->fetchColumn() == 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Lab test not found'
                ]);
                return;
            }

            // Check if test name already exists for another record
            $checkNameSql = "SELECT COUNT(*) FROM tbl_labtest WHERE test_name = :test_name AND labtest_id != :labtest_id";
            $checkNameStmt = $this->conn->prepare($checkNameSql);
            $checkNameStmt->bindParam(':test_name', $data['test_name']);
            $checkNameStmt->bindParam(':labtest_id', $data['labtest_id']);
            $checkNameStmt->execute();

            if ($checkNameStmt->fetchColumn() > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'A lab test with this name already exists'
                ]);
                return;
            }

            // Update lab test
            $sql = "UPDATE tbl_labtest 
                    SET test_name = :test_name, 
                        labtest_category_id = :labtest_category_id, 
                        unit_price = :unit_price, 
                        is_active = :is_active 
                    WHERE labtest_id = :labtest_id";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':labtest_id', $data['labtest_id']);
            $stmt->bindParam(':test_name', $data['test_name']);
            $stmt->bindParam(':labtest_category_id', $data['labtest_category_id']);
            $stmt->bindParam(':unit_price', $data['unit_price']);

            // Set is_active to 1 if not provided
            $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;
            $stmt->bindParam(':is_active', $isActive);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Lab test updated successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to update lab test'
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error updating lab test: ' . $e->getMessage()
            ]);
        }
    }

    // Delete lab test
    public function deleteLabtest($data)
    {
        try {
            // Validate required fields
            if (empty($data['labtest_id'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required field: labtest_id'
                ]);
                return;
            }

            // Check if test exists
            $checkSql = "SELECT COUNT(*) FROM tbl_labtest WHERE labtest_id = :labtest_id";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->bindParam(':labtest_id', $data['labtest_id']);
            $checkStmt->execute();

            if ($checkStmt->fetchColumn() == 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Lab test not found'
                ]);
                return;
            }

            // Check if lab test is being used in any invoices or patient records
            $usageSql = "SELECT COUNT(*) FROM tbl_invoice_labtest WHERE labtest_id = :labtest_id";
            $usageStmt = $this->conn->prepare($usageSql);
            $usageStmt->bindParam(':labtest_id', $data['labtest_id']);
            $usageStmt->execute();

            if ($usageStmt->fetchColumn() > 0) {
                // Instead of deleting, mark as inactive
                $deactivateSql = "UPDATE tbl_labtest SET is_active = 0 WHERE labtest_id = :labtest_id";
                $deactivateStmt = $this->conn->prepare($deactivateSql);
                $deactivateStmt->bindParam(':labtest_id', $data['labtest_id']);

                if ($deactivateStmt->execute()) {
                    echo json_encode([
                        'success' => true,
                        'message' => 'Lab test is being used in records. It has been deactivated instead of deleted.'
                    ]);
                } else {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to deactivate lab test'
                    ]);
                }
                return;
            }

            // If not used in any records, proceed with deletion
            $sql = "DELETE FROM tbl_labtest WHERE labtest_id = :labtest_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':labtest_id', $data['labtest_id']);

            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Lab test deleted successfully'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to delete lab test'
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error deleting lab test: ' . $e->getMessage()
            ]);
        }
    }

    // Get single lab test details
    public function getLabtestDetails($data)
    {
        try {
            if (empty($data['labtest_id'])) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required field: labtest_id'
                ]);
                return;
            }

            $sql = "SELECT 
                        l.labtest_id,
                        l.test_name,
                        l.labtest_category_id,
                        lc.labtest_category_name,
                        l.unit_price,
                        l.is_active
                    FROM tbl_labtest l
                    JOIN tbl_labtest_category lc ON l.labtest_category_id = lc.labtest_category_id
                    WHERE l.labtest_id = :labtest_id";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':labtest_id', $data['labtest_id']);
            $stmt->execute();

            $labtest = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($labtest) {
                echo json_encode([
                    'success' => true,
                    'labtest' => $labtest
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'Lab test not found'
                ]);
            }
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Error retrieving lab test: ' . $e->getMessage()
            ]);
        }
    }
}

// Handle the request
$method = $_SERVER['REQUEST_METHOD'];

// Initialize the manager
$manager = new LabTestManager();

// Parse the request data
if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '{}';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '{}';
}

$data = json_decode($json, true) ?? [];

// Route the request to the appropriate method
switch ($operation) {
    case 'getLabtests':
        $manager->getLabtests();
        break;
    case 'getTypes':
        $manager->getTypes();
        break;
    case 'createLabtest':
        $manager->createLabtest($data);
        break;
    case 'updateLabtest':
        $manager->updateLabtest($data);
        break;
    case 'deleteLabtest':
        $manager->deleteLabtest($data);
        break;
    case 'getLabtestDetails':
        $manager->getLabtestDetails($data);
        break;
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid operation or operation not specified'
        ]);
        break;
}

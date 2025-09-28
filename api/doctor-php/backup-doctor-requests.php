<?php
require_once '/../require_auth.php';

header('Access-Control-Allow-Origin: http://localhost:3000');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json');

class DoctorRequestAPI
{

    private $pdo;

    public function __construct()
    {
        include '../connection-pdo.php';
        $this->pdo = $pdo;
    }

    public function getRequests()
    {
        try {

            $doctorId = (int)$_SESSION['user_id'];

            // Get requests
            $sql = "
                SELECT 
                    dr.request_id,
                    dr.request_type,
                    dr.quantity,
                    dr.notes,
                    dr.status,
                    dr.request_date,
                    CONCAT(p.patient_fname, ' ', p.patient_lname) as patient_name,
                    u.username as doctor_name,
                    CASE 
                        WHEN dr.request_type = 'medicine' THEN m.med_name
                        WHEN dr.request_type = 'labtest' THEN lt.test_name
                    END as item_name
                FROM doctor_requests dr
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN users u ON dr.doctor_id = u.user_id
                LEFT JOIN tbl_medicine m ON dr.request_type = 'medicine' AND dr.item_id = m.med_id
                LEFT JOIN tbl_labtest lt ON dr.request_type = 'labtest' AND dr.item_id = lt.labtest_id
                WHERE pa.doctor_id = :doctor_id
                ORDER BY dr.request_date DESC
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':doctor_id' => $doctorId]);

            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'requests' => $requests,
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Failed to get requests: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get request details
     */
    public function getRequestDetails($data)
    {
        try {
            $requestId = $data['request_id'] ?? null;

            if (!$requestId) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Request ID is required'
                ]);
                return;
            }

            $sql = "
                SELECT 
                    dr.*,
                    CONCAT(p.patient_fname, ' ', p.patient_lname) as patient_name,
                    u.username as doctor_name,
                    CASE 
                        WHEN dr.request_type = 'medicine' THEN m.med_name
                        WHEN dr.request_type = 'labtest' THEN lt.test_name
                    END as item_name,
                    CASE 
                        WHEN dr.request_type = 'medicine' THEN m.unit_price
                        WHEN dr.request_type = 'labtest' THEN lt.unit_price
                    END as unit_price
                FROM doctor_requests dr
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN users u ON dr.doctor_id = u.user_id
                LEFT JOIN tbl_medicine m ON dr.request_type = 'medicine' AND dr.item_id = m.med_id
                LEFT JOIN tbl_labtest lt ON dr.request_type = 'labtest' AND dr.item_id = lt.labtest_id
                WHERE dr.request_id = :request_id
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':request_id', $requestId);
            $stmt->execute();

            $request = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$request) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Request not found'
                ]);
                return;
            }

            echo json_encode([
                'status' => 'success',
                'request' => $request
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to get request details: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Create new request
     */
    public function createRequest($data)
    {
        try {
            $this->pdo->beginTransaction();

            $doctorId = $data['doctor_id'] ?? null;
            $patientId = $data['patient_id'] ?? null;
            $requestType = $data['request_type'] ?? null;
            $itemId = $data['item_id'] ?? null;
            $quantity = $data['quantity'] ?? 1;
            $notes = $data['notes'] ?? null;

            // Validation
            if (!$doctorId || !$patientId || !$requestType || !$itemId) {
                throw new Exception('Missing required fields');
            }

            if (!in_array($requestType, ['medicine', 'labtest'])) {
                throw new Exception('Invalid request type');
            }

            // Verify item exists
            $itemTable = $requestType === 'medicine' ? 'tbl_medicine' : 'tbl_labtest';
            $itemIdField = $requestType === 'medicine' ? 'med_id' : 'labtest_id';

            $checkSql = "SELECT 1 FROM $itemTable WHERE $itemIdField = :item_id AND is_active = 1";
            $checkStmt = $this->pdo->prepare($checkSql);
            $checkStmt->bindParam(':item_id', $itemId);
            $checkStmt->execute();

            if (!$checkStmt->fetch()) {
                throw new Exception('Invalid item selected');
            }

            // Insert request
            $sql = "
                INSERT INTO doctor_requests 
                (doctor_id, patient_id, request_type, item_id, quantity, notes, status, request_date)
                VALUES (:doctor_id, :patient_id, :request_type, :item_id, :quantity, :notes, 'pending', NOW())
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':doctor_id', $doctorId);
            $stmt->bindParam(':patient_id', $patientId);
            $stmt->bindParam(':request_type', $requestType);
            $stmt->bindParam(':item_id', $itemId);
            $stmt->bindParam(':quantity', $quantity);
            $stmt->bindParam(':notes', $notes);
            $stmt->execute();

            $requestId = $this->pdo->lastInsertId();

            // Add to history
            $this->addToHistory($requestId, 'created', $doctorId, null, 'pending', 'Request created');

            // Create notifications for relevant staff
            $this->createNotifications($requestId, $requestType);

            $this->pdo->commit();

            echo json_encode([
                'status' => 'success',
                'message' => 'Request created successfully',
                'request_id' => $requestId
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }

    /**
     * Cancel request
     */
    public function cancelRequest($data)
    {
        try {
            $requestId = $data['request_id'] ?? null;
            $userId = $_SESSION['user_id'] ?? null;

            if (!$requestId || !$userId) {
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Missing required parameters'
                ]);
                return;
            }

            $this->pdo->beginTransaction();

            // Get current status
            $statusSql = "SELECT status FROM doctor_requests WHERE request_id = :request_id";
            $statusStmt = $this->pdo->prepare($statusSql);
            $statusStmt->bindParam(':request_id', $requestId);
            $statusStmt->execute();
            $currentStatus = $statusStmt->fetch(PDO::FETCH_ASSOC)['status'];

            if ($currentStatus === 'cancelled') {
                throw new Exception('Request is already cancelled');
            }

            if ($currentStatus === 'completed') {
                throw new Exception('Cannot cancel completed request');
            }

            // Update request
            $sql = "
                UPDATE doctor_requests 
                SET status = 'cancelled', 
                    cancelled_by = :user_id, 
                    cancelled_date = NOW()
                WHERE request_id = :request_id
            ";

            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':request_id', $requestId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            // Add to history
            $this->addToHistory($requestId, 'cancelled', $userId, $currentStatus, 'cancelled', 'Request cancelled');

            $this->pdo->commit();

            echo json_encode([
                'status' => 'success',
                'message' => 'Request cancelled successfully'
            ]);
        } catch (Exception $e) {
            $this->pdo->rollBack();
            echo json_encode([
                'status' => 'error',
                'message' => $e->getMessage()
            ]);
        }
    }

    /**
     * Add entry to request history
     */
    private function addToHistory($requestId, $action, $performedBy, $oldStatus, $newStatus, $notes)
    {
        $sql = "
            INSERT INTO request_history 
            (request_id, action, performed_by, old_status, new_status, notes)
            VALUES (:request_id, :action, :performed_by, :old_status, :new_status, :notes)
        ";

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindParam(':request_id', $requestId);
        $stmt->bindParam(':action', $action);
        $stmt->bindParam(':performed_by', $performedBy);
        $stmt->bindParam(':old_status', $oldStatus);
        $stmt->bindParam(':new_status', $newStatus);
        $stmt->bindParam(':notes', $notes);
        $stmt->execute();
    }

    /**
     * Create notifications for relevant staff
     */
    private function createNotifications($requestId, $requestType)
    {
        // Get request details for notification message
        $requestSql = "
            SELECT 
                dr.request_id,
                CONCAT(p.patient_fname, ' ', p.patient_lname) as patient_name,
                u.username as doctor_name,
                CASE 
                    WHEN dr.request_type = 'medicine' THEN m.med_name
                    WHEN dr.request_type = 'labtest' THEN lt.test_name
                END as item_name
            FROM doctor_requests dr
            JOIN patients p ON dr.patient_id = p.patient_id
            JOIN users u ON dr.doctor_id = u.user_id
            LEFT JOIN tbl_medicine m ON dr.request_type = 'medicine' AND dr.item_id = m.med_id
            LEFT JOIN tbl_labtest lt ON dr.request_type = 'labtest' AND dr.item_id = lt.labtest_id
            WHERE dr.request_id = :request_id
        ";

        $requestStmt = $this->pdo->prepare($requestSql);
        $requestStmt->bindParam(':request_id', $requestId);
        $requestStmt->execute();
        $request = $requestStmt->fetch(PDO::FETCH_ASSOC);

        // Determine which staff should be notified
        $roleId = $requestType === 'medicine' ? 6 : 5; // Pharmacist or Lab Technician

        $staffSql = "SELECT user_id FROM users WHERE role_id = :role_id AND status = 1";
        $staffStmt = $this->pdo->prepare($staffSql);
        $staffStmt->bindParam(':role_id', $roleId);
        $staffStmt->execute();
        $staff = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

        $message = "New {$requestType} request from {$request['doctor_name']} for {$request['patient_name']}";

        // Create notifications
        foreach ($staff as $member) {
            $notifSql = "
                INSERT INTO request_notifications 
                (request_id, user_id, notification_type, message)
                VALUES (:request_id, :user_id, 'new_request', :message)
            ";

            $notifStmt = $this->pdo->prepare($notifSql);
            $notifStmt->bindParam(':request_id', $requestId);
            $notifStmt->bindParam(':user_id', $member['user_id']);
            $notifStmt->bindParam(':message', $message);
            $notifStmt->execute();
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
$api = new DoctorRequestAPI();

switch ($operation) {
    case 'getRequests':
        $api->getRequests();
        break;
    case 'getRequestDetails':
        $api->getRequestDetails($data);
        break;
    case 'createRequest':
        $api->createRequest($data);
        break;
    case 'cancelRequest':
        $api->cancelRequest($data);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        break;
}

<?php
require_once 'require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class RequestManagementAPI {
    
    private $pdo;
    
    public function __construct() {
        include 'connection-pdo.php';
        $this->pdo = $pdo;
    }
    
    /**
     * Get requests for pharmacists and lab technicians
     */
    public function getRequests($data) {
        try {
            $page = $data['page'] ?? 1;
            $itemsPerPage = $data['itemsPerPage'] ?? 10;
            $filters = $data['filters'] ?? [];
            $userId = $data['user_id'] ?? null;
            $userRole = $data['user_role'] ?? null;
            
            $offset = ($page - 1) * $itemsPerPage;
            
            // Build WHERE clause based on user role
            $whereConditions = [];
            $params = [];
            
            // Filter by request type based on user role
            if ($userRole == 6) { // Pharmacist
                $whereConditions[] = "dr.request_type = 'medicine'";
            } elseif ($userRole == 5) { // Lab Technician
                $whereConditions[] = "dr.request_type = 'labtest'";
            }
            
            // Apply additional filters
            if (!empty($filters['type'])) {
                $whereConditions[] = "dr.request_type = :request_type";
                $params[':request_type'] = $filters['type'];
            }
            
            if (!empty($filters['status'])) {
                $whereConditions[] = "dr.status = :status";
                $params[':status'] = $filters['status'];
            }
            
            if (!empty($filters['doctor'])) {
                $whereConditions[] = "dr.doctor_id = :doctor_id";
                $params[':doctor_id'] = $filters['doctor'];
            }
            
            $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
            
            // Get total count
            $countSql = "
                SELECT COUNT(*) as total
                FROM doctor_requests dr
                JOIN patients p ON dr.patient_id = p.patient_id
                JOIN users u ON dr.doctor_id = u.user_id
                $whereClause
            ";
            
            $countStmt = $this->pdo->prepare($countSql);
            $countStmt->execute($params);
            $totalItems = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
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
                $whereClause
                ORDER BY dr.request_date DESC
                LIMIT :offset, :limit
            ";
            
            $stmt = $this->pdo->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $itemsPerPage, PDO::PARAM_INT);
            $stmt->execute();
            
            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Get statistics
            $stats = $this->getRequestStats($userRole);
            
            $pagination = [
                'currentPage' => $page,
                'itemsPerPage' => $itemsPerPage,
                'totalItems' => $totalItems,
                'totalPages' => ceil($totalItems / $itemsPerPage)
            ];
            
            echo json_encode([
                'status' => 'success',
                'requests' => $requests,
                'pagination' => $pagination,
                'stats' => $stats
            ]);
            
        } catch (PDOException $e) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Failed to get requests: ' . $e->getMessage()
            ]);
        }
    }
    
    /**
     * Get request statistics
     */
    private function getRequestStats($userRole) {
        try {
            $whereCondition = '';
            if ($userRole == 6) { // Pharmacist
                $whereCondition = "WHERE dr.request_type = 'medicine'";
            } elseif ($userRole == 5) { // Lab Technician
                $whereCondition = "WHERE dr.request_type = 'labtest'";
            }
            
            $sql = "
                SELECT 
                    status,
                    COUNT(*) as count
                FROM doctor_requests dr
                $whereCondition
                GROUP BY status
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $stats = [
                'pending' => 0,
                'approved' => 0,
                'completed' => 0,
                'cancelled' => 0
            ];
            
            foreach ($results as $result) {
                $stats[$result['status']] = (int)$result['count'];
            }
            
            return $stats;
            
        } catch (PDOException $e) {
            return [
                'pending' => 0,
                'approved' => 0,
                'completed' => 0,
                'cancelled' => 0
            ];
        }
    }
    
    /**
     * Get request details
     */
    public function getRequestDetails($data) {
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
     * Approve request
     */
    public function approveRequest($data) {
        try {
            $requestId = $data['request_id'] ?? null;
            $userId = $data['user_id'] ?? null;
            
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
            
            if ($currentStatus !== 'pending') {
                throw new Exception('Only pending requests can be approved');
            }
            
            // Update request
            $sql = "
                UPDATE doctor_requests 
                SET status = 'approved', 
                    approved_by = :user_id, 
                    approved_date = NOW()
                WHERE request_id = :request_id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':request_id', $requestId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            
            // Add to history
            $this->addToHistory($requestId, 'approved', $userId, 'pending', 'approved', 'Request approved');
            
            // Create notification for doctor
            $this->createNotification($requestId, 'approved', 'Your request has been approved');
            
            $this->pdo->commit();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Request approved successfully'
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
     * Complete request
     */
    public function completeRequest($data) {
        try {
            $requestId = $data['request_id'] ?? null;
            $userId = $data['user_id'] ?? null;
            $notes = $data['notes'] ?? null;
            
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
            
            if ($currentStatus !== 'approved') {
                throw new Exception('Only approved requests can be completed');
            }
            
            // Update request
            $sql = "
                UPDATE doctor_requests 
                SET status = 'completed', 
                    completed_by = :user_id, 
                    completed_date = NOW()
                WHERE request_id = :request_id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':request_id', $requestId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();
            
            // Add to history
            $historyNotes = $notes ? "Request completed. Notes: $notes" : "Request completed";
            $this->addToHistory($requestId, 'completed', $userId, 'approved', 'completed', $historyNotes);
            
            // Create notification for doctor
            $this->createNotification($requestId, 'completed', 'Your request has been completed');
            
            $this->pdo->commit();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Request completed successfully'
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
     * Reject request
     */
    public function rejectRequest($data) {
        try {
            $requestId = $data['request_id'] ?? null;
            $userId = $data['user_id'] ?? null;
            $reason = $data['reason'] ?? null;
            
            if (!$requestId || !$userId || !$reason) {
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
            
            if ($currentStatus !== 'pending') {
                throw new Exception('Only pending requests can be rejected');
            }
            
            // Update request
            $sql = "
                UPDATE doctor_requests 
                SET status = 'cancelled', 
                    cancelled_by = :user_id, 
                    cancelled_date = NOW(),
                    cancellation_reason = :reason
                WHERE request_id = :request_id
            ";
            
            $stmt = $this->pdo->prepare($sql);
            $stmt->bindParam(':request_id', $requestId);
            $stmt->bindParam(':user_id', $userId);
            $stmt->bindParam(':reason', $reason);
            $stmt->execute();
            
            // Add to history
            $this->addToHistory($requestId, 'cancelled', $userId, 'pending', 'cancelled', "Request rejected. Reason: $reason");
            
            // Create notification for doctor
            $this->createNotification($requestId, 'cancelled', "Your request has been rejected. Reason: $reason");
            
            $this->pdo->commit();
            
            echo json_encode([
                'status' => 'success',
                'message' => 'Request rejected successfully'
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
    private function addToHistory($requestId, $action, $performedBy, $oldStatus, $newStatus, $notes) {
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
     * Create notification
     */
    private function createNotification($requestId, $type, $message) {
        // Get doctor ID from request
        $doctorSql = "SELECT doctor_id FROM doctor_requests WHERE request_id = :request_id";
        $doctorStmt = $this->pdo->prepare($doctorSql);
        $doctorStmt->bindParam(':request_id', $requestId);
        $doctorStmt->execute();
        $doctorId = $doctorStmt->fetch(PDO::FETCH_ASSOC)['doctor_id'];
        
        if ($doctorId) {
            $notifSql = "
                INSERT INTO request_notifications 
                (request_id, user_id, notification_type, message)
                VALUES (:request_id, :user_id, :notification_type, :message)
            ";
            
            $notifStmt = $this->pdo->prepare($notifSql);
            $notifStmt->bindParam(':request_id', $requestId);
            $notifStmt->bindParam(':user_id', $doctorId);
            $notifStmt->bindParam(':notification_type', $type);
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
$api = new RequestManagementAPI();

switch ($operation) {
    case 'getRequests':
        $api->getRequests($data);
        break;
    case 'getRequestDetails':
        $api->getRequestDetails($data);
        break;
    case 'approveRequest':
        $api->approveRequest($data);
        break;
    case 'completeRequest':
        $api->completeRequest($data);
        break;
    case 'rejectRequest':
        $api->rejectRequest($data);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        break;
}
?>

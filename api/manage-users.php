<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

class UserManager
{
    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    /**
     * Get all doctors (users whose role name contains 'doctor')
     */
    function getDoctors($params = [])
    {
        try {
            $search = isset($params['search']) ? $params['search'] : '';
            $where = "WHERE LOWER(r.role_name) LIKE '%doctor%'";
            $binds = [];
            if (!empty($search)) {
                $where .= " AND (d.first_name LIKE :s OR d.last_name LIKE :s OR u.username LIKE :s)";
                $binds[':s'] = "%$search%";
            }

            $sql = "SELECT u.user_id, u.username,
                           d.first_name, d.middle_name, d.last_name,
                           u.email, u.mobile_number, u.role_id, r.role_name
                    FROM users u
                    JOIN user_roles r ON u.role_id = r.role_id
                    LEFT JOIN user_doctor d ON d.user_id = u.user_id
                    $where
                    ORDER BY COALESCE(d.last_name, u.username), COALESCE(d.first_name, '')";
            $stmt = $this->conn->prepare($sql);
            foreach ($binds as $k => $v) {
                $stmt->bindValue($k, $v);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'doctors' => $rows]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
        }
    }

    /**
     * Get all users with their roles
     */
    function getAllUsers($params = [])
    {
        try {
            // Get pagination parameters
            $page = isset($params['page']) ? (int)$params['page'] : 1;
            $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;
            $search = isset($params['search']) ? $params['search'] : '';

            // Calculate offset
            $offset = ($page - 1) * $itemsPerPage;

            // Build WHERE clause for search
            $whereClause = '';
            $searchParams = [];

            if (!empty($search)) {
                $whereClause = "WHERE COALESCE(d.first_name, n.first_name, lt.first_name, p.first_name, t.first_name, c.first_name, b.first_name) LIKE :search 
                               OR COALESCE(d.last_name, n.last_name, lt.last_name, p.last_name, t.last_name, c.last_name, b.last_name) LIKE :search 
                               OR u.username LIKE :search 
                               OR u.email LIKE :search 
                               OR r.role_name LIKE :search";
                $searchParams[':search'] = "%$search%";
            }

            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM users u 
                          JOIN user_roles r ON u.role_id = r.role_id 
                          LEFT JOIN user_doctor d ON d.user_id = u.user_id
                          LEFT JOIN user_nurse n ON n.user_id = u.user_id
                          LEFT JOIN user_lab_technician lt ON lt.user_id = u.user_id
                          LEFT JOIN user_pharmacist p ON p.user_id = u.user_id
                          LEFT JOIN user_therapist t ON t.user_id = u.user_id
                          LEFT JOIN user_cashier c ON c.user_id = u.user_id
                          LEFT JOIN user_billing_officer b ON b.user_id = u.user_id
                          $whereClause";
            $countStmt = $this->conn->prepare($countQuery);
            if (!empty($searchParams)) {
                $countStmt->execute($searchParams);
            } else {
                $countStmt->execute();
            }
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get paginated data
            $query = "
                    SELECT 
                        u.user_id, 
                        u.username,
                        COALESCE(d.first_name, n.first_name, lt.first_name, p.first_name, t.first_name, c.first_name, b.first_name) as first_name,
                        COALESCE(d.middle_name, n.middle_name, lt.middle_name, p.middle_name, t.middle_name, c.middle_name, b.middle_name) as middle_name,
                        COALESCE(d.last_name, n.last_name, lt.last_name, p.last_name, t.last_name, c.last_name, b.last_name) as last_name,
                        u.email, 
                        u.mobile_number, 
                        u.role_id, 
                        r.role_name 
                    FROM users u 
                    JOIN user_roles r ON u.role_id = r.role_id 
                    LEFT JOIN user_doctor d ON d.user_id = u.user_id
                    LEFT JOIN user_nurse n ON n.user_id = u.user_id
                    LEFT JOIN user_lab_technician lt ON lt.user_id = u.user_id
                    LEFT JOIN user_pharmacist p ON p.user_id = u.user_id
                    LEFT JOIN user_therapist t ON t.user_id = u.user_id
                    LEFT JOIN user_cashier c ON c.user_id = u.user_id
                    LEFT JOIN user_billing_officer b ON b.user_id = u.user_id
                    $whereClause
                    ORDER BY COALESCE(d.last_name, n.last_name, lt.last_name, p.last_name, t.last_name, c.last_name, b.last_name, u.username), 
                             COALESCE(d.first_name, n.first_name, lt.first_name, p.first_name, t.first_name, c.first_name, b.first_name, '')
                    LIMIT :limit OFFSET :offset";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':limit', $itemsPerPage, PDO::PARAM_INT);
            $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

            if (!empty($searchParams)) {
                foreach ($searchParams as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
            }

            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate pagination info
            $totalPages = ceil($totalCount / $itemsPerPage);
            $startIndex = $offset + 1;
            $endIndex = min($offset + $itemsPerPage, $totalCount);

            echo json_encode([
                'success' => true,
                'users' => $users,
                'pagination' => [
                    'currentPage' => $page,
                    'itemsPerPage' => $itemsPerPage,
                    'totalItems' => $totalCount,
                    'totalPages' => $totalPages,
                    'startIndex' => $startIndex,
                    'endIndex' => $endIndex
                ]
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Get a specific user by ID
     */
    function getUserById($userId)
    {
        try {
            $query = "SELECT u.user_id, u.username,
                        d.first_name, d.middle_name, d.last_name,
                        u.email, u.mobile_number, u.role_id, r.role_name 
                        FROM users u 
                        JOIN user_roles r ON u.role_id = r.role_id 
                        LEFT JOIN user_doctor d ON d.user_id = u.user_id
                        WHERE u.user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user) {
                echo json_encode([
                    'success' => true,
                    'user' => $user
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
            }
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Add a new user
     */
    function addUser($userData)
    {
        try {
            // Check if username already exists
            $checkQuery = "SELECT COUNT(*) FROM users WHERE username = :username";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':username', $userData['username']);
            $checkStmt->execute();

            if ($checkStmt->fetchColumn() > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Username already exists'
                ]);
                return;
            }

            // Start transaction
            $this->conn->beginTransaction();

            // Insert new user with default active status
            $query = "INSERT INTO users (username, password, email, mobile_number, role_id, status) 
                        VALUES (:username, :password, :email, :mobile_number, :role_id, 1)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $userData['username']);
            $stmt->bindParam(':password', $userData['password']);
            $stmt->bindParam(':email', $userData['email']);
            $stmt->bindParam(':mobile_number', $userData['mobile_number']);
            $stmt->bindParam(':role_id', $userData['role_id']);

            $stmt->execute();
            $userId = $this->conn->lastInsertId();

            // Insert into role-specific table based on role_id
            $this->insertRoleSpecificData($userId, $userData);

            $this->conn->commit();
            echo json_encode([
                'success' => true,
                'message' => 'User added successfully'
            ]);
        } catch (PDOException $e) {
            $this->conn->rollback();
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        } catch (Exception $e) {
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            echo json_encode([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ]);
        }
    }

    /**
     * Insert data into role-specific table
     */
    private function insertRoleSpecificData($userId, $userData)
    {
        $roleId = $userData['role_id'];

        // Debug logging
        error_log("Inserting role-specific data for user ID: $userId, role ID: $roleId");
        error_log("User data: " . print_r($userData, true));

        switch ($roleId) {
            case '2': // Doctor
                $query = "INSERT INTO user_doctor 
                          (user_id, first_name, middle_name, last_name, suffix, license_number, specialty_id) 
                          VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :specialty_id)";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '4': // Nurse
                $query = "INSERT INTO user_nurse 
                          (user_id, first_name, middle_name, last_name, suffix, license_number, department_id) 
                          VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :department_id)";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '5': // Lab Technician
                $query = "INSERT INTO user_lab_technician 
                          (user_id, first_name, middle_name, last_name, suffix, license_number, department_id) 
                          VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :department_id)";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '6': // Pharmacist
                $query = "INSERT INTO user_pharmacist 
                          (user_id, first_name, middle_name, last_name, suffix, license_number) 
                          VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number)";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->execute();
                break;

            case '7': // Therapist
                $query = "INSERT INTO user_therapist 
                          (user_id, first_name, middle_name, last_name, suffix, license_number, specialty_id) 
                          VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :specialty_id)";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '8': // Cashier
                $query = "INSERT INTO user_cashier 
                          (user_id, first_name, middle_name, last_name, suffix, employee_number) 
                          VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :employee_number)";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':employee_number', $userData['employee_number'] ?? null);
                $stmt->execute();
                break;

            case '9': // Billing Staff
                $query = "INSERT INTO user_billing_officer 
                          (user_id, first_name, middle_name, last_name, suffix, employee_number) 
                          VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :employee_number)";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':employee_number', $userData['employee_number'] ?? null);
                $stmt->execute();
                break;

            default:
                // For roles without specific tables, do nothing
                return;
        }
    }

    /**
     * Update role-specific data for existing user
     */
    private function updateRoleSpecificData($userId, $userData)
    {
        $roleId = $userData['role_id'];
        
        // Debug logging
        error_log("Updating role-specific data for user ID: $userId, role ID: $roleId");
        error_log("User data: " . print_r($userData, true));
        
        switch ($roleId) {
            case '2': // Doctor
                $query = "UPDATE user_doctor SET 
                          first_name = :first_name, 
                          middle_name = :middle_name, 
                          last_name = :last_name, 
                          suffix = :suffix, 
                          license_number = :license_number, 
                          specialty_id = :specialty_id 
                          WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '4': // Nurse
                $query = "UPDATE user_nurse SET 
                          first_name = :first_name, 
                          middle_name = :middle_name, 
                          last_name = :last_name, 
                          suffix = :suffix, 
                          license_number = :license_number, 
                          department_id = :department_id 
                          WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '5': // Lab Technician
                $query = "UPDATE user_lab_technician SET 
                          first_name = :first_name, 
                          middle_name = :middle_name, 
                          last_name = :last_name, 
                          suffix = :suffix, 
                          license_number = :license_number, 
                          department_id = :department_id 
                          WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '6': // Pharmacist
                $query = "UPDATE user_pharmacist SET 
                          first_name = :first_name, 
                          middle_name = :middle_name, 
                          last_name = :last_name, 
                          suffix = :suffix, 
                          license_number = :license_number 
                          WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->execute();
                break;

            case '7': // Therapist
                $query = "UPDATE user_therapist SET 
                          first_name = :first_name, 
                          middle_name = :middle_name, 
                          last_name = :last_name, 
                          suffix = :suffix, 
                          license_number = :license_number, 
                          specialty_id = :specialty_id 
                          WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            case '8': // Cashier
                $query = "UPDATE user_cashier SET 
                          first_name = :first_name, 
                          middle_name = :middle_name, 
                          last_name = :last_name, 
                          suffix = :suffix, 
                          employee_number = :employee_number 
                          WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':employee_number', $userData['employee_number'] ?? null);
                $stmt->execute();
                break;

            case '9': // Billing Staff
                $query = "UPDATE user_billing_officer SET 
                          first_name = :first_name, 
                          middle_name = :middle_name, 
                          last_name = :last_name, 
                          suffix = :suffix, 
                          employee_number = :employee_number 
                          WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($query);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':employee_number', $userData['employee_number'] ?? null);
                $stmt->execute();
                break;

            default:
                // For roles without specific tables, do nothing
                return;
        }
    }

    /**
     * Update an existing user
     */
    function updateUser($userData)
    {
        try {
            // Check if username already exists for another user
            $checkQuery = "SELECT COUNT(*) FROM users WHERE username = :username AND user_id != :user_id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':username', $userData['username']);
            $checkStmt->bindParam(':user_id', $userData['user_id']);
            $checkStmt->execute();

            if ($checkStmt->fetchColumn() > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Username already exists'
                ]);
                return;
            }

            // Start building the update query
            $query = "UPDATE users SET 
                        username = :username, 
                        email = :email, 
                        mobile_number = :mobile_number, 
                        role_id = :role_id";

            // Add password to update query if provided
            if (!empty($userData['password'])) {
                $query .= ", password = :password";
            }

            $query .= " WHERE user_id = :user_id";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $userData['username']);
            $stmt->bindParam(':email', $userData['email']);
            $stmt->bindParam(':mobile_number', $userData['mobile_number']);
            $stmt->bindParam(':role_id', $userData['role_id']);
            $stmt->bindParam(':user_id', $userData['user_id']);

            // Bind password if provided
            if (!empty($userData['password'])) {
                $stmt->bindParam(':password', $userData['password']);  // Store plain text password
            }

            $stmt->execute();
            
            // Update role-specific data
            $this->updateRoleSpecificData($userData['user_id'], $userData);
            
            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully'
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
}

include 'connection-pdo.php';
$conn = $GLOBALS['conn'];
$userManager = new UserManager($conn);

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';

    // Get pagination parameters from GET request
    $page = $_GET['page'] ?? 1;
    $itemsPerPage = $_GET['itemsPerPage'] ?? 10;
    $search = $_GET['search'] ?? '';

    // For backward compatibility
    if (isset($_GET['user_id'])) {
        $operation = 'getUserById';
        $json = json_encode(['user_id' => $_GET['user_id']]);
    } else if (empty($operation)) {
        $operation = 'getAllUsers';
    }
} else if ($method === 'POST') {
    // Check if data is sent as form data or JSON body
    if (!empty($_POST)) {
        // Form data (from frontend axios)
        $operation = $_POST['operation'] ?? '';
        $json = $_POST['json'] ?? '';

        // Get pagination parameters from POST request
        $page = $_POST['page'] ?? 1;
        $itemsPerPage = $_POST['itemsPerPage'] ?? 10;
        $search = $_POST['search'] ?? '';
    } else {
        // JSON body (for other clients)
        $body = file_get_contents("php://input");
        $payload = json_decode($body, true);

        // Get pagination parameters from POST request
        $page = $payload['page'] ?? 1;
        $itemsPerPage = $payload['itemsPerPage'] ?? 10;
        $search = $payload['search'] ?? '';

        // For backward compatibility
        if (isset($payload['action'])) {
            switch ($payload['action']) {
                case 'add':
                    $operation = 'addUser';
                    break;
                case 'update':
                    $operation = 'updateUser';
                    break;
                case 'delete':
                    $operation = 'deleteUser';
                    $payload['user_id'] = $payload['user_id'] ?? null;
                    break;
                default:
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid action'
                    ]);
                    exit;
            }
            $json = json_encode($payload);
        } else {
            $operation = $payload['operation'] ?? '';
            $json = $payload['json'] ?? '';
        }
    }
}

$data = json_decode($json, true);

switch ($operation) {
    case 'getAllUsers':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $userManager->getAllUsers($params);
        break;
    case 'getUserById':
        $user_id = $data['user_id'] ?? null;
        $userManager->getUserById($user_id);
        break;
    case 'addUser':
        $userManager->addUser($data);
        break;
    case 'updateUser':
        $userManager->updateUser($data);
        break;
    case 'getDoctors':
        $params = ['search' => $search];
        $userManager->getDoctors($params);
        break;
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid operation'
        ]);
}

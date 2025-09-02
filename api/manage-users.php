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

    // to get all doctors for admission
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

            $sql = "
                SELECT 
                    u.user_id, 
                    u.username,
                    d.first_name, 
                    d.middle_name, 
                    d.last_name,
                    d.suffix,
                    d.license_number,
                    d.specialty_id,
                    u.email, 
                    u.mobile_number, 
                    u.role_id, 
                    r.role_name
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

    // get all users with their roles
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
            $countSql = "
                        SELECT COUNT(*) as total FROM users u 
                        JOIN user_roles r ON u.role_id = r.role_id 
                        LEFT JOIN user_doctor d ON d.user_id = u.user_id
                        LEFT JOIN user_nurse n ON n.user_id = u.user_id
                        LEFT JOIN user_lab_technician lt ON lt.user_id = u.user_id
                        LEFT JOIN user_pharmacist p ON p.user_id = u.user_id
                        LEFT JOIN user_therapist t ON t.user_id = u.user_id
                        LEFT JOIN user_cashier c ON c.user_id = u.user_id
                        LEFT JOIN user_billing_officer b ON b.user_id = u.user_id
                        $whereClause
                    ";
            $countStmt = $this->conn->prepare($countSql);
            if (!empty($searchParams)) {
                $countStmt->execute($searchParams);
            } else {
                $countStmt->execute();
            }
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get paginated data
            $sql = "
                    SELECT 
                        u.user_id, 
                        u.username,
                        u.status,
                        COALESCE(d.first_name, n.first_name, lt.first_name, p.first_name, t.first_name, c.first_name, b.first_name) as first_name,
                        COALESCE(d.middle_name, n.middle_name, lt.middle_name, p.middle_name, t.middle_name, c.middle_name, b.middle_name) as middle_name,
                        COALESCE(d.last_name, n.last_name, lt.last_name, p.last_name, t.last_name, c.last_name, b.last_name) as last_name,
                        COALESCE(d.suffix, n.suffix, lt.suffix, p.suffix, t.suffix, c.suffix, b.suffix) as suffix,
                        COALESCE(d.license_number, n.license_number, lt.license_number, p.license_number, t.license_number, NULL, NULL) as license_number,
                        COALESCE(d.specialty_id, NULL, NULL, NULL, t.specialty_id, NULL, NULL) as specialty_id,
                        COALESCE(NULL, n.department_id, lt.department_id, NULL, NULL, NULL, NULL) as department_id,
                        COALESCE(NULL, NULL, NULL, NULL, NULL, c.employee_number, b.employee_number) as employee_number,
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
            $stmt = $this->conn->prepare($sql);
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

    // Add New users
    function addUser($userData)
    {
        try {
            // Check if username already exists
            $checkSql = "SELECT COUNT(*) FROM users WHERE username = :username";
            $checkStmt = $this->conn->prepare($checkSql);
            $checkStmt->bindParam(':username', $userData['username']);
            $checkStmt->execute();

            if ($checkStmt->fetchColumn() > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Username already exists'
                ]);
                return;
            }

            // makes sure if one part of the form is not inserted, the whole transaction is rolled back
            $this->conn->beginTransaction();

            $sql = "
                INSERT INTO users (username, password, email, mobile_number, role_id, status) 
                VALUES (:username, :password, :email, :mobile_number, :role_id, 1)
            ";

            $stmt = $this->conn->prepare($sql);
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

        switch ($roleId) {
            // Doctor
            case '2':
                $sql = "
                    INSERT INTO user_doctor (user_id, first_name, middle_name, last_name, suffix, license_number, specialty_id) 
                    VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :specialty_id)
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Nurse
            case '4':
                $sql = "
                    INSERT INTO user_nurse (user_id, first_name, middle_name, last_name, suffix, license_number, department_id) 
                    VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :department_id)
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Lab Technician
            case '5':
                $sql = "
                    INSERT INTO user_lab_technician (user_id, first_name, middle_name, last_name, suffix, license_number, department_id) 
                    VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :department_id)
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Pharmacist 
            case '6':
                $sql = "
                    INSERT INTO user_pharmacist (user_id, first_name, middle_name, last_name, suffix, license_number) 
                    VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number)
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->execute();
                break;

            // Therapist
            case '7':
                $sql = "
                    INSERT INTO user_therapist (user_id, first_name, middle_name, last_name, suffix, license_number, specialty_id) 
                    VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :license_number, :specialty_id)
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Cashier
            case '8':
                $sql = "
                    INSERT INTO user_cashier (user_id, first_name, middle_name, last_name, suffix, employee_number) 
                    VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :employee_number)
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':employee_number', $userData['employee_number'] ?? null);
                $stmt->execute();
                break;

            // Billing Staff
            case '9':
                $query = "
                    INSERT INTO user_billing_officer (user_id, first_name, middle_name, last_name, suffix, employee_number) 
                    VALUES (:user_id, :first_name, :middle_name, :last_name, :suffix, :employee_number)
                ";
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
                return;
        }
    }

    // Role Specific Data
    private function updateRoleSpecificData($userId, $userData)
    {
        $roleId = $userData['role_id'];

        switch ($roleId) {
            // Doctor
            case '2':
                $sql = "
                    UPDATE user_doctor 
                    SET 
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
                        suffix = :suffix, 
                        license_number = :license_number, 
                        specialty_id = :specialty_id 
                    WHERE user_id = :user_id
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Nurse
            case '4':
                $sql = "
                    UPDATE user_nurse 
                    SET 
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
                        suffix = :suffix, 
                        license_number = :license_number, 
                        department_id = :department_id 
                    WHERE user_id = :user_id
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Lab Technician
            case '5':
                $sql = "
                    UPDATE user_lab_technician 
                    SET 
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
                        suffix = :suffix, 
                        license_number = :license_number, 
                        department_id = :department_id 
                    WHERE user_id = :user_id
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':department_id', $userData['department_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Pharmacist
            case '6':
                $sql = "
                    UPDATE user_pharmacist 
                    SET 
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
                        suffix = :suffix, 
                        license_number = :license_number 
                    WHERE user_id = :user_id
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->execute();
                break;

            // Therapist
            case '7':
                $sql = "
                    UPDATE user_therapist 
                    SET 
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
                        suffix = :suffix, 
                        license_number = :license_number, 
                        specialty_id = :specialty_id 
                    WHERE user_id = :user_id
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':license_number', $userData['license_number'] ?? '');
                $stmt->bindValue(':specialty_id', $userData['specialty_id'] ?? null, PDO::PARAM_INT);
                $stmt->execute();
                break;

            // Cashier
            case '8':
                $sql = "
                    UPDATE user_cashier 
                    SET 
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
                        suffix = :suffix, 
                        employee_number = :employee_number 
                    WHERE user_id = :user_id
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':employee_number', $userData['employee_number'] ?? null);
                $stmt->execute();
                break;

            // Billing Staff
            case '9':
                $sql = "
                    UPDATE user_billing_officer 
                    SET 
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
                        suffix = :suffix, 
                        employee_number = :employee_number 
                    WHERE user_id = :user_id
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
                $stmt->bindValue(':first_name', $userData['first_name'] ?? '');
                $stmt->bindValue(':middle_name', $userData['middle_name'] ?? '');
                $stmt->bindValue(':last_name', $userData['last_name'] ?? '');
                $stmt->bindValue(':suffix', $userData['suffix'] ?? '');
                $stmt->bindValue(':employee_number', $userData['employee_number'] ?? null);
                $stmt->execute();
                break;

            default:
                return;
        }
    }

    // Update User
    function updateUser($userData)
    {
        try {

            // Start transaction
            $this->conn->beginTransaction();

            // Check if username already exists for another user
            $checkSql = "SELECT COUNT(*) FROM users WHERE username = :username AND user_id != :user_id";
            $checkStmt = $this->conn->prepare($checkSql);
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

            $sql = "
                UPDATE users 
                SET 
                    username = :username, 
                    email = :email, 
                    mobile_number = :mobile_number, 
                    role_id = :role_id,
                    status = :status
            ";

            // Add password to update sql if provided
            if (!empty($userData['password'])) {
                $sql .= ", password = :password";
            }

            $sql .= " WHERE user_id = :user_id";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':username', $userData['username']);
            $stmt->bindParam(':email', $userData['email']);
            $stmt->bindParam(':mobile_number', $userData['mobile_number']);
            $stmt->bindParam(':role_id', $userData['role_id']);
            $stmt->bindParam(':user_id', $userData['user_id']);
            $stmt->bindParam(':status', $userData['status']);

            // Bind password if provided
            if (!empty($userData['password'])) {
                $stmt->bindParam(':password', $userData['password']);
            }

            $stmt->execute();

            // Update role-specific data
            $this->updateRoleSpecificData($userData['user_id'], $userData);

            // Commit the transaction
            $this->conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully'
            ]);
        } catch (PDOException $e) {
            // Rollback the transaction on error
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        } catch (Exception $e) {
            // Rollback the transaction on any other error
            if ($this->conn->inTransaction()) {
                $this->conn->rollback();
            }
            echo json_encode([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ]);
        }
    }
}

include 'connection-pdo.php';
$conn = $GLOBALS['conn'];

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';

    // Get pagination parameters from GET request
    $page = $_GET['page'] ?? 1;
    $itemsPerPage = $_GET['itemsPerPage'] ?? 10;
    $search = $_GET['search'] ?? '';
} else if ($method === 'POST') {
    if (!empty($_POST)) {
        $operation = $_POST['operation'] ?? '';
        $json = $_POST['json'] ?? '';

        // Get pagination parameters from POST request
        $page = $_POST['page'] ?? 1;
        $itemsPerPage = $_POST['itemsPerPage'] ?? 10;
        $search = $_POST['search'] ?? '';
    } else {
        $body = file_get_contents("php://input");
        $payload = json_decode($body, true);

        $operation = $payload['operation'] ?? '';
        $json = $payload['json'] ?? '';

        // Get pagination parameters from POST request
        $page = $payload['page'] ?? 1;
        $itemsPerPage = $payload['itemsPerPage'] ?? 10;
        $search = $payload['search'] ?? '';
    }
}

$data = json_decode($json, true);

$userManager = new UserManager($conn);

switch ($operation) {
    case 'getAllUsers':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $userManager->getAllUsers($params);
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

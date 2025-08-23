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
                $whereClause = "WHERE u.first_name LIKE :search 
                               OR u.last_name LIKE :search 
                               OR u.username LIKE :search 
                               OR u.email LIKE :search 
                               OR r.role_name LIKE :search";
                $searchParams[':search'] = "%$search%";
            }

            // Get total count
            $countQuery = "SELECT COUNT(*) as total FROM users u 
                          JOIN user_roles r ON u.role_id = r.role_id 
                          $whereClause";
            $countStmt = $this->conn->prepare($countQuery);
            if (!empty($searchParams)) {
                $countStmt->execute($searchParams);
            } else {
                $countStmt->execute();
            }
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get paginated data
            $query = "SELECT u.user_id, u.username, u.first_name, u.middle_name, u.last_name, 
                        u.email, u.mobile_number, u.role_id, r.role_name 
                        FROM users u 
                        JOIN user_roles r ON u.role_id = r.role_id 
                        $whereClause
                        ORDER BY u.last_name, u.first_name
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
            $query = "SELECT u.user_id, u.username, u.first_name, u.middle_name, u.last_name, 
                        u.email, u.mobile_number, u.role_id, r.role_name 
                        FROM users u 
                        JOIN user_roles r ON u.role_id = r.role_id 
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


            // Insert new user
            $query = "INSERT INTO users (username, password, first_name, middle_name, last_name, 
                        email, mobile_number, role_id) 
                        VALUES (:username, :password, :first_name, :middle_name, :last_name, 
                        :email, :mobile_number, :role_id)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':username', $userData['username']);
            $stmt->bindParam(':password', $userData['password']);
            $stmt->bindParam(':first_name', $userData['first_name']);
            $stmt->bindParam(':middle_name', $userData['middle_name']);
            $stmt->bindParam(':last_name', $userData['last_name']);
            $stmt->bindParam(':email', $userData['email']);
            $stmt->bindParam(':mobile_number', $userData['mobile_number']);
            $stmt->bindParam(':role_id', $userData['role_id']);

            $stmt->execute();
            echo json_encode([
                'success' => true,
                'message' => 'User added successfully'
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
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
                        first_name = :first_name, 
                        middle_name = :middle_name, 
                        last_name = :last_name, 
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
            $stmt->bindParam(':first_name', $userData['first_name']);
            $stmt->bindParam(':middle_name', $userData['middle_name']);
            $stmt->bindParam(':last_name', $userData['last_name']);
            $stmt->bindParam(':email', $userData['email']);
            $stmt->bindParam(':mobile_number', $userData['mobile_number']);
            $stmt->bindParam(':role_id', $userData['role_id']);
            $stmt->bindParam(':user_id', $userData['user_id']);

            // Bind password if provided
            if (!empty($userData['password'])) {
                $stmt->bindParam(':password', $userData['password']);  // Store plain text password
            }

            $stmt->execute();
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

    /**
     * Delete a user
     */
    function deleteUser($userId)
    {
        try {
            // Check if user exists
            $checkQuery = "SELECT COUNT(*) FROM users WHERE user_id = :user_id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(':user_id', $userId);
            $checkStmt->execute();

            if ($checkStmt->fetchColumn() == 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'User not found'
                ]);
                return;
            }

            // Prevent deleting the current logged-in user
            if (isset($_SESSION['user_id']) && $_SESSION['user_id'] == $userId) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Cannot delete your own account'
                ]);
                return;
            }

            // Delete user
            $query = "DELETE FROM users WHERE user_id = :user_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':user_id', $userId);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'User deleted successfully'
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
    case 'deleteUser':
        $user_id = $data['user_id'] ?? null;
        $userManager->deleteUser($user_id);
        break;
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid operation'
        ]);
}

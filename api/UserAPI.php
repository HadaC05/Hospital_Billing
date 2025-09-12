<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
include 'RequireAuth.php';

class UserAPI {
    function login($username, $password) {
        include 'connection-pdo.php';
        try {
            $sql = "SELECT user_id, password FROM users WHERE username = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user && $user['password'] === $password) { // Using plaintext password comparison
                // Generate a token (simple random string)
                $token = bin2hex(random_bytes(32));
                
                // Update user with token
                $sql = "UPDATE users SET token = ? WHERE user_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$token, $user['user_id']]);
                
                // Get user details
                $sql = "SELECT u.*, r.role_name 
                        FROM users u
                        JOIN user_roles r ON u.role_id = r.role_id
                        WHERE u.user_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$user['user_id']]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Get user permissions
                $sql = "SELECT up.name, up.label 
                        FROM user_role_permission urp
                        JOIN user_permission up ON urp.permission_id = up.permission_id
                        WHERE urp.user_role_id = ? AND urp.is_allowed = 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$userData['role_id']]);
                $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $response = [
                    'status' => 'success',
                    'message' => 'Login successful',
                    'token' => $token,
                    'user' => $userData,
                    'permissions' => $permissions
                ];
            } else {
                $response = [
                    'status' => 'error',
                    'message' => 'Invalid credentials'
                ];
            }
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Login failed: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function logout($token) {
        include 'connection-pdo.php';
        try {
            $sql = "UPDATE users SET token = NULL WHERE token = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$token]);
            
            $response = [
                'status' => 'success',
                'message' => 'Logout successful'
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Logout failed: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function createUser($token, $firstName, $middleName, $lastName, $username, $password, $email, $mobileNumber, $roleId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_users')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            // Store password as plaintext
            $sql = "INSERT INTO users (first_name, middle_name, last_name, username, password, email, mobile_number, role_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$firstName, $middleName, $lastName, $username, $password, $email, $mobileNumber, $roleId]);
            
            $response = [
                'status' => 'success',
                'message' => 'User created successfully',
                'user_id' => $pdo->lastInsertId()
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to create user: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function updateUser($token, $userId, $firstName = null, $middleName = null, $lastName = null, $username = null, $password = null, $email = null, $mobileNumber = null, $roleId = null) {
        $authUserId = RequireAuth::check($token);
        if (!$authUserId || (!RequireAuth::checkPermission($authUserId, 'manage_users') && $authUserId != $userId)) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $updateFields = [];
            $params = [];
            
            if ($firstName !== null) {
                $updateFields[] = "first_name = ?";
                $params[] = $firstName;
            }
            if ($middleName !== null) {
                $updateFields[] = "middle_name = ?";
                $params[] = $middleName;
            }
            if ($lastName !== null) {
                $updateFields[] = "last_name = ?";
                $params[] = $lastName;
            }
            if ($username !== null) {
                $updateFields[] = "username = ?";
                $params[] = $username;
            }
            if ($password !== null) {
                $updateFields[] = "password = ?";
                $params[] = $password; // Store password as plaintext
            }
            if ($email !== null) {
                $updateFields[] = "email = ?";
                $params[] = $email;
            }
            if ($mobileNumber !== null) {
                $updateFields[] = "mobile_number = ?";
                $params[] = $mobileNumber;
            }
            if ($roleId !== null && RequireAuth::checkPermission($authUserId, 'manage_users')) {
                $updateFields[] = "role_id = ?";
                $params[] = $roleId;
            }
            
            if (empty($updateFields)) {
                throw new Exception("No fields to update");
            }
            
            $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE user_id = ?";
            $params[] = $userId;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $response = [
                'status' => 'success',
                'message' => 'User updated successfully'
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to update user: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getUsers($token) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_users')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT u.*, r.role_name 
                    FROM users u
                    JOIN user_roles r ON u.role_id = r.role_id";
            $stmt = $pdo->query($sql);
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'users' => $users
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get users: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getUser($token, $userId) {
        $authUserId = RequireAuth::check($token);
        if (!$authUserId || (!RequireAuth::checkPermission($authUserId, 'manage_users') && $authUserId != $userId)) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT u.*, r.role_name 
                    FROM users u
                    JOIN user_roles r ON u.role_id = r.role_id
                    WHERE u.user_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                throw new Exception("User not found");
            }
            
            $response = [
                'status' => 'success',
                'user' => $user
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get user: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getUserPermissions($token) {
        $userId = RequireAuth::check($token);
        if (!$userId) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT up.name, up.label, up.description 
                    FROM user_role_permission urp
                    JOIN user_permission up ON urp.permission_id = up.permission_id
                    JOIN users u ON urp.user_role_id = u.role_id
                    WHERE u.user_id = ? AND urp.is_allowed = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$userId]);
            $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'permissions' => $permissions
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get user permissions: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
    $token = $_GET['token'] ?? '';
} else if ($method == 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
    $token = $payload['token'] ?? '';
}

$data = json_decode($json, true);
$obj = new UserAPI();

switch ($operation) {
    case "login":
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        $obj->login($username, $password);
        break;
        
    case "logout":
        $obj->logout($token);
        break;
        
    case "createUser":
        $firstName = $data['first_name'] ?? '';
        $middleName = $data['middle_name'] ?? '';
        $lastName = $data['last_name'] ?? '';
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        $email = $data['email'] ?? '';
        $mobileNumber = $data['mobile_number'] ?? '';
        $roleId = $data['role_id'] ?? 0;
        $obj->createUser($token, $firstName, $middleName, $lastName, $username, $password, $email, $mobileNumber, $roleId);
        break;
        
    case "updateUser":
        $userId = $data['user_id'] ?? 0;
        $firstName = $data['first_name'] ?? null;
        $middleName = $data['middle_name'] ?? null;
        $lastName = $data['last_name'] ?? null;
        $username = $data['username'] ?? null;
        $password = $data['password'] ?? null;
        $email = $data['email'] ?? null;
        $mobileNumber = $data['mobile_number'] ?? null;
        $roleId = $data['role_id'] ?? null;
        $obj->updateUser($token, $userId, $firstName, $middleName, $lastName, $username, $password, $email, $mobileNumber, $roleId);
        break;
        
    case "getUsers":
        $obj->getUsers($token);
        break;
        
    case "getUser":
        $userId = $data['user_id'] ?? 0;
        $obj->getUser($token, $userId);
        break;
        
    case "getUserPermissions":
        $obj->getUserPermissions($token);
        break;
}
?>
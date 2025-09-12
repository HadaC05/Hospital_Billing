<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
include 'RequireAuth.php';

class PermissionAPI {
    function getPermissions($token) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_roles')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT * FROM user_permission";
            $stmt = $pdo->query($sql);
            $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'permissions' => $permissions
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get permissions: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getRoles($token) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_roles')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT * FROM user_roles ORDER BY access_level DESC";
            $stmt = $pdo->query($sql);
            $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'roles' => $roles
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get roles: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function getRolePermissions($token, $roleId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_roles')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "SELECT up.*, urp.is_allowed 
                    FROM user_permission up
                    LEFT JOIN user_role_permission urp ON up.permission_id = urp.permission_id AND urp.user_role_id = ?
                    ORDER BY up.permission_id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$roleId]);
            $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $response = [
                'status' => 'success',
                'permissions' => $permissions
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to get role permissions: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function updateRolePermissions($token, $roleId, $permissions) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_roles')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Delete existing permissions for the role
            $sql = "DELETE FROM user_role_permission WHERE user_role_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$roleId]);
            
            // Insert new permissions
            $sql = "INSERT INTO user_role_permission (user_role_id, permission_id, is_allowed) VALUES (?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            
            foreach ($permissions as $permission) {
                $stmt->execute([$roleId, $permission['permission_id'], $permission['is_allowed']]);
            }
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Role permissions updated successfully'
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to update role permissions: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function createRole($token, $roleName, $accessLevel) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_roles')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $sql = "INSERT INTO user_roles (role_name, access_level) VALUES (?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$roleName, $accessLevel]);
            
            $roleId = $pdo->lastInsertId();
            
            // Add default permissions (none allowed)
            $sql = "INSERT INTO user_role_permission (user_role_id, permission_id, is_allowed) 
                    SELECT ?, permission_id, 0 FROM user_permission";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$roleId]);
            
            $response = [
                'status' => 'success',
                'message' => 'Role created successfully',
                'role_id' => $roleId
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to create role: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function updateRole($token, $roleId, $roleName = null, $accessLevel = null) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_roles')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $updateFields = [];
            $params = [];
            
            if ($roleName !== null) {
                $updateFields[] = "role_name = ?";
                $params[] = $roleName;
            }
            if ($accessLevel !== null) {
                $updateFields[] = "access_level = ?";
                $params[] = $accessLevel;
            }
            
            if (empty($updateFields)) {
                throw new Exception("No fields to update");
            }
            
            $sql = "UPDATE user_roles SET " . implode(", ", $updateFields) . " WHERE role_id = ?";
            $params[] = $roleId;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $response = [
                'status' => 'success',
                'message' => 'Role updated successfully'
            ];
        } catch (PDOException $e) {
            $response = [
                'status' => 'error',
                'message' => 'Failed to update role: ' . $e->getMessage()
            ];
        }
        echo json_encode($response);
    }
    
    function deleteRole($token, $roleId) {
        $userId = RequireAuth::check($token);
        if (!$userId || !RequireAuth::checkPermission($userId, 'manage_roles')) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
            return;
        }
        
        include 'connection-pdo.php';
        try {
            $pdo->beginTransaction();
            
            // Delete role permissions
            $sql = "DELETE FROM user_role_permission WHERE user_role_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$roleId]);
            
            // Delete role
            $sql = "DELETE FROM user_roles WHERE role_id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$roleId]);
            
            $pdo->commit();
            
            $response = [
                'status' => 'success',
                'message' => 'Role deleted successfully'
            ];
        } catch (PDOException $e) {
            $pdo->rollBack();
            $response = [
                'status' => 'error',
                'message' => 'Failed to delete role: ' . $e->getMessage()
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
$obj = new PermissionAPI();

switch ($operation) {
    case "getPermissions":
        $obj->getPermissions($token);
        break;
        
    case "getRoles":
        $obj->getRoles($token);
        break;
        
    case "getRolePermissions":
        $roleId = $data['role_id'] ?? 0;
        $obj->getRolePermissions($token, $roleId);
        break;
        
    case "updateRolePermissions":
        $roleId = $data['role_id'] ?? 0;
        $permissions = $data['permissions'] ?? [];
        $obj->updateRolePermissions($token, $roleId, $permissions);
        break;
        
    case "createRole":
        $roleName = $data['role_name'] ?? '';
        $accessLevel = $data['access_level'] ?? 0;
        $obj->createRole($token, $roleName, $accessLevel);
        break;
        
    case "updateRole":
        $roleId = $data['role_id'] ?? 0;
        $roleName = $data['role_name'] ?? null;
        $accessLevel = $data['access_level'] ?? null;
        $obj->updateRole($token, $roleId, $roleName, $accessLevel);
        break;
        
    case "deleteRole":
        $roleId = $data['role_id'] ?? 0;
        $obj->deleteRole($token, $roleId);
        break;
}
?>
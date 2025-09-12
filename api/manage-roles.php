<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

class RoleManager
{
    // Get all roles
    function getRoles()
    {
        include 'connection-pdo.php';

        $sql = "SELECT role_id, role_name, access_level FROM user_roles ORDER BY access_level DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $roles = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'roles' => $roles
        ]);
    }

    // Get all permissions
    function getAllPermissions()
    {
        include 'connection-pdo.php';

        $sql = "SELECT permission_id, name, label, description FROM user_permission ORDER BY permission_id";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'permissions' => $permissions
        ]);
    }

    // Get permissions for a specific role
    function getRolePermissions($role_id)
    {
        include 'connection-pdo.php';

        // Get role name
        $role_sql = "SELECT role_name FROM user_roles WHERE role_id = :role_id";
        $role_stmt = $conn->prepare($role_sql);
        $role_stmt->bindParam(':role_id', $role_id);
        $role_stmt->execute();
        $role = $role_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$role) {
            echo json_encode([
                'success' => false,
                'message' => 'Role not found'
            ]);
            return;
        }

        // Get permissions for the role
        $sql = "
            SELECT up.permission_id, up.name, up.label, up.description
            FROM user_role_permission urp
            JOIN user_permission up ON urp.permission_id = up.permission_id
            WHERE urp.user_role_id = :role_id AND urp.is_allowed = 1
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':role_id', $role_id);
        $stmt->execute();
        $permissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'role_name' => $role['role_name'],
            'permissions' => $permissions
        ]);
    }

    // Add a new role
    function addRole($role_name, $access_level)
    {
        include 'connection-pdo.php';

        try {
            // Check if role name already exists
            $check_sql = "SELECT COUNT(*) FROM user_roles WHERE role_name = :role_name";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bindParam(':role_name', $role_name);
            $check_stmt->execute();
            $exists = $check_stmt->fetchColumn();

            if ($exists > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Role name already exists'
                ]);
                return;
            }

            // Insert new role
            $sql = "INSERT INTO user_roles (role_name, access_level) VALUES (:role_name, :access_level)";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':role_name', $role_name);
            $stmt->bindParam(':access_level', $access_level);
            $stmt->execute();

            $role_id = $conn->lastInsertId();

            echo json_encode([
                'success' => true,
                'message' => 'Role added successfully',
                'role_id' => $role_id
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    // Update an existing role
    function updateRole($role_id, $role_name, $access_level)
    {
        include 'connection-pdo.php';

        try {
            // Check if role exists
            $check_sql = "SELECT COUNT(*) FROM user_roles WHERE role_id = :role_id";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bindParam(':role_id', $role_id);
            $check_stmt->execute();
            $exists = $check_stmt->fetchColumn();

            if ($exists == 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Role not found'
                ]);
                return;
            }

            // Check if new role name already exists (excluding current role)
            $name_check_sql = "SELECT COUNT(*) FROM user_roles WHERE role_name = :role_name AND role_id != :role_id";
            $name_check_stmt = $conn->prepare($name_check_sql);
            $name_check_stmt->bindParam(':role_name', $role_name);
            $name_check_stmt->bindParam(':role_id', $role_id);
            $name_check_stmt->execute();
            $name_exists = $name_check_stmt->fetchColumn();

            if ($name_exists > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Role name already exists'
                ]);
                return;
            }

            // Update role
            $sql = "UPDATE user_roles SET role_name = :role_name, access_level = :access_level WHERE role_id = :role_id";
            $stmt = $conn->prepare($sql);
            $stmt->bindParam(':role_id', $role_id);
            $stmt->bindParam(':role_name', $role_name);
            $stmt->bindParam(':access_level', $access_level);
            $stmt->execute();

            echo json_encode([
                'success' => true,
                'message' => 'Role updated successfully'
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    // Delete a role
    function deleteRole($role_id)
    {
        include 'connection-pdo.php';

        try {
            // Check if role exists
            $check_sql = "SELECT COUNT(*) FROM user_roles WHERE role_id = :role_id";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bindParam(':role_id', $role_id);
            $check_stmt->execute();
            $exists = $check_stmt->fetchColumn();

            if ($exists == 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Role not found'
                ]);
                return;
            }

            // Check if any users are assigned to this role
            $users_sql = "SELECT COUNT(*) FROM users WHERE role_id = :role_id";
            $users_stmt = $conn->prepare($users_sql);
            $users_stmt->bindParam(':role_id', $role_id);
            $users_stmt->execute();
            $has_users = $users_stmt->fetchColumn();

            if ($has_users > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Cannot delete role: There are users assigned to this role'
                ]);
                return;
            }

            // Begin transaction
            $conn->beginTransaction();

            // Delete role permissions
            $delete_perms_sql = "DELETE FROM user_role_permission WHERE user_role_id = :role_id";
            $delete_perms_stmt = $conn->prepare($delete_perms_sql);
            $delete_perms_stmt->bindParam(':role_id', $role_id);
            $delete_perms_stmt->execute();

            // Delete role
            $delete_role_sql = "DELETE FROM user_roles WHERE role_id = :role_id";
            $delete_role_stmt = $conn->prepare($delete_role_sql);
            $delete_role_stmt->bindParam(':role_id', $role_id);
            $delete_role_stmt->execute();

            // Commit transaction
            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Role deleted successfully'
            ]);
        } catch (PDOException $e) {
            // Rollback transaction on error
            $conn->rollBack();
            
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    // Update role permissions
    function updateRolePermissions($role_id, $permissions)
    {
        include 'connection-pdo.php';

        try {
            // Check if role exists
            $check_sql = "SELECT COUNT(*) FROM user_roles WHERE role_id = :role_id";
            $check_stmt = $conn->prepare($check_sql);
            $check_stmt->bindParam(':role_id', $role_id);
            $check_stmt->execute();
            $exists = $check_stmt->fetchColumn();

            if ($exists == 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Role not found'
                ]);
                return;
            }

            // Begin transaction
            $conn->beginTransaction();

            // Delete existing permissions for the role
            $delete_sql = "DELETE FROM user_role_permission WHERE user_role_id = :role_id";
            $delete_stmt = $conn->prepare($delete_sql);
            $delete_stmt->bindParam(':role_id', $role_id);
            $delete_stmt->execute();

            // Insert new permissions
            $insert_sql = "INSERT INTO user_role_permission (user_role_id, permission_id, is_allowed) VALUES (:role_id, :permission_id, 1)";
            $insert_stmt = $conn->prepare($insert_sql);

            foreach ($permissions as $permission_id) {
                $insert_stmt->bindParam(':role_id', $role_id);
                $insert_stmt->bindParam(':permission_id', $permission_id);
                $insert_stmt->execute();
            }

            // Commit transaction
            $conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Role permissions updated successfully'
            ]);
        } catch (PDOException $e) {
            // Rollback transaction on error
            $conn->rollBack();
            
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }
}

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
$role_manager = new RoleManager();

switch ($operation) {
    case 'getRoles':
        $role_manager->getRoles();
        break;
    case 'getAllPermissions':
        $role_manager->getAllPermissions();
        break;
    case 'getRolePermissions':
        $role_id = $data['role_id'] ?? null;
        $role_manager->getRolePermissions($role_id);
        break;
    case 'addRole':
        $role_name = $data['role_name'] ?? '';
        $access_level = $data['access_level'] ?? '';
        $role_manager->addRole($role_name, $access_level);
        break;
    case 'updateRole':
        $role_id = $data['role_id'] ?? null;
        $role_name = $data['role_name'] ?? '';
        $access_level = $data['access_level'] ?? '';
        $role_manager->updateRole($role_id, $role_name, $access_level);
        break;
    case 'deleteRole':
        $role_id = $data['role_id'] ?? null;
        $role_manager->deleteRole($role_id);
        break;
    case 'updateRolePermissions':
        $role_id = $data['role_id'] ?? null;
        $permissions = $data['permissions'] ?? [];
        $role_manager->updateRolePermissions($role_id, $permissions);
        break;
    default:
        echo json_encode([
            'success' => false,
            'message' => 'Invalid operation'
        ]);
}
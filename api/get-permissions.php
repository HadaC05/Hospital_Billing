<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');


class Users
{
    function getUserPermissions($user_id)
    {
        include 'connection-pdo.php';

        // $user_id = $_SESSION['user_id'];

        // get role_id from users
        $sql = "
            SELECT role_id 
            FROM users
            WHERE user_id = :user_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            echo json_encode([
                'success' => false,
                'message' => 'User not found'
            ]);
            return;
        }

        $role_id = $user['role_id'];

        // fetch permissions for the role
        $sql = "
            SELECT up.name
            FROM user_role_permission urp
            JOIN user_permission up ON urp.permission_id = up.permission_id
            WHERE urp.user_role_id = :role_id AND urp.is_allowed = 1
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':role_id', $role_id);
        $stmt->execute();
        $permissions = $stmt->fetchAll(PDO::FETCH_COLUMN);

        echo json_encode([
            'success' => true,
            'permissions' => $permissions
        ]);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'];
    $json = $payload['json'];
}

$data = json_decode($json, true);
$user_id = $data['user_id'] ?? null;

$user = new Users();

switch ($operation) {
    case 'getUserPermissions':
        $user->getUserPermissions($user_id);
        break;
}

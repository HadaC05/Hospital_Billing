<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');


class Users
{
    // Log in logic
    function loginUser($username, $password)
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT user_id, username, password, first_name, last_name, role_id
            FROM users
            WHERE username = :username
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":username", $username); //kung unsay sulod sa variable maoy ipuli sa placeholder 
        $stmt->execute();
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $password === $user['password']) {
            $role_sql = "
                SELECT role_name FROM user_roles 
                WHERE role_id = :role_id
            ";
            $role_stmt = $conn->prepare($role_sql);
            $role_stmt->bindParam(":role_id", $user['role_id']);
            $role_stmt->execute();
            $role = $role_stmt->fetch(PDO::FETCH_ASSOC);

            $response = [
                'success' => true,
                'user_id' => $user['user_id'],
                'username' => $user['username'],
                'role' => $role['role_name'],
                'full_name' => $user['first_name'] . ' ' . $user['last_name'],
                'message' => 'Login successful'
            ];
        } else {
            $response = [
                'success' => false,
                'message' => 'Invalid username or password'
            ];
        }

        echo json_encode($response);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $operation = $_GET['operation'];
    $json = isset($_GET['json']) ? $_GET['json'] : "";
} else if ($method == 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? "";
}

$data = json_decode($json, true);
$username = $data['username'] ?? '';
$password = $data['password'] ?? '';

$user = new Users();

switch ($operation) {
    case "loginUser":
        $user->loginUser($username, $password);
        break;
        // case "":
}

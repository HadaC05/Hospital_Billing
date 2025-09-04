<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

class Users
{
    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    // get all users
    function getUsers()
    {
        try {
            $sql = "
                SELECT
                    u.user_id,
                    u.username,
                    COALESCE(d.first_name, n.first_name, lt.first_name, p.first_name, t.first_name, c.first_name, bo.first_name) AS first_name,
                    COALESCE(d.middle_name, n.middle_name, lt.middle_name, p.middle_name, t.middle_name, c.middle_name, bo.middle_name) AS middle_name,
                    COALESCE(d.last_name, n.last_name, lt.last_name, p.last_name, t.last_name, c.last_name, bo.last_name) AS last_name,
                    COALESCE(d.suffix, n.suffix, lt.suffix, p.suffix, t.suffix, c.suffix, bo.suffix) AS suffix,
                    u.password,
                    u.email,
                    u.mobile_number,
                    u.role_id,
                    r.role_name,
                    u.status
                FROM users u
                JOIN user_roles r ON u.role_id = r.role_id
                LEFT JOIN user_doctor d ON d.user_id = u.user_id
                LEFT JOIN user_nurse n ON n.user_id = u.user_id
                LEFT JOIN user_lab_technician lt ON lt.user_id = u.user_id
                LEFT JOIN user_pharmacist p ON p.user_id = u.user_id
                LEFT JOIN user_therapist t ON t.user_id = u.user_id
                LEFT JOIN user_cashier c ON c.user_id = u.user_id
                LEFT JOIN user_billing_officer bo ON bo.user_id = u.user_id
                ORDER BY last_name, first_name
            ";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'users' => $users
            ]);
        } catch (PDOException $e) {
            echo json_encode([
                'success' => false,
                'message' => 'Database error: ' . $e->getMessage()
            ]);
        }
    }

    // add new users
    function addUser($data)
    {
        try {
            if (empty($data['role_id'])) {
                throw new Exception("Role ID is required to add user");
            }

            $this->conn->beginTransaction();

            // Insert into base `users` table
            $sql = "
            INSERT INTO users (username, password, email, mobile_number, role_id)
            VALUES (:username, :password, :email, :mobile_number, :role_id)
        ";

            $stmt = $this->conn->prepare($sql);

            $email = !empty($data['email']) ? $data['email'] : null;
            $mobile = !empty($data['mobile_number']) ? $data['mobile_number'] : null;

            $stmt->execute([
                ':username' => $data['username'],
                ':password' => $data['password'],
                ':email' => $email,
                ':mobile_number' => $mobile,
                ':role_id' => $data['role_id'],
            ]);

            $userId = $this->conn->lastInsertId();

            // Decide role-specific table and fields
            $roleTable = null;
            $roleFields = [
                'user_id' => $userId,
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'suffix' => $data['suffix'] ?? null,
            ];

            switch ($data['role_id']) {
                case 2: // Doctor
                    $roleTable = "user_doctor";
                    $roleFields['license_number'] = $data['license_number'] ?? null;
                    $roleFields['specialty_id'] = $data['specialty_id'] ?? null;
                    break;

                case 4: // Nurse
                    $roleTable = "user_nurse";
                    $roleFields['license_number'] = $data['license_number'] ?? null;
                    $roleFields['department_id'] = $data['department_id'] ?? null;
                    break;

                case 5: // Lab Technician
                    $roleTable = "user_lab_technician";
                    $roleFields['license_number'] = $data['license_number'] ?? null;
                    $roleFields['department_id'] = $data['department_id'] ?? null;
                    break;

                case 6: // Pharmacist
                    $roleTable = "user_pharmacist";
                    $roleFields['license_number'] = $data['license_number'] ?? null;
                    break;

                case 7: // Therapist
                    $roleTable = "user_therapist";
                    $roleFields['license_number'] = $data['license_number'] ?? null;
                    $roleFields['specialty_id'] = $data['specialty_id'] ?? null;
                    break;

                case 8: // Cashier
                    $roleTable = "user_cashier";
                    $roleFields['employee_number'] = $data['employee_number'] ?? null;
                    break;

                case 9: // Billing Officer
                    $roleTable = "user_billing_officer";
                    $roleFields['employee_number'] = $data['employee_number'] ?? null;
                    break;
            }

            // Insert into role-specific table
            if ($roleTable) {
                $columns = array_keys($roleFields);
                $placeholders = array_map(fn($c) => ':' . $c, $columns);

                $sql = "INSERT INTO $roleTable (" . implode(", ", $columns) . ")
                    VALUES (" . implode(", ", $placeholders) . ")";
                $stmt = $this->conn->prepare($sql);

                // Prefix keys with `:` for binding
                $params = [];
                foreach ($roleFields as $col => $val) {
                    $params[":$col"] = $val;
                }

                $stmt->execute($params);
            }

            $this->conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'User added successfully',
                'user_id' => $userId
            ]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'Failed to add user: ' . $e->getMessage()
            ]);
        }
    }


    // update existing users
    function updateUser($data)
    {
        try {
            if (empty($data['role_id'])) {
                throw new Exception("Role ID is required to update user");
            }

            $this->conn->beginTransaction();

            // Update main `users` table
            $fields = ['username = :username'];
            $params = [
                ':username' => $data['username'],
                ':user_id'  => $data['user_id']
            ];

            if (!empty($data['password'])) {
                $fields[] = "password = :password";
                $params[':password'] = $data['password']; // hash if needed
            }

            $fields[] = "email = :email";
            $params[':email'] = $data['email'] ?? null;

            $fields[] = "mobile_number = :mobile_number";
            $params[':mobile_number'] = $data['mobile_number'] ?? null;

            $fields[] = "status = :status";
            $params[':status'] = isset($data['status']) ? (int)$data['status'] : 1;

            $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE user_id = :user_id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);


            // Update role-specific table
            $updates = [
                "first_name = :first_name",
                "middle_name = :middle_name",
                "last_name = :last_name",
                "suffix = :suffix"
            ];

            $params = [
                ':user_id'    => $data['user_id'],
                ':first_name' => $data['first_name'],
                ':middle_name' => $data['middle_name'] ?? null,
                ':last_name'  => $data['last_name'],
                ':suffix'     => $data['suffix'] ?? null
            ];

            switch ($data['role_id']) {
                case 2: // Doctor
                case 7: // Therapist
                    if (!empty($data['license_number'])) {
                        $updates[] = "license_number = :license_number";
                        $params[':license_number'] = $data['license_number'];
                    }
                    if (!empty($data['specialty_id'])) {
                        $updates[] = "specialty_id = :specialty_id";
                        $params[':specialty_id'] = $data['specialty_id'];
                    }
                    $table = ($data['role_id'] == 2) ? "user_doctor" : "user_therapist";
                    break;

                case 4: // Nurse
                case 5: // Lab Technician
                    if (!empty($data['license_number'])) {
                        $updates[] = "license_number = :license_number";
                        $params[':license_number'] = $data['license_number'];
                    }
                    if (!empty($data['department_id'])) {
                        $updates[] = "department_id = :department_id";
                        $params[':department_id'] = $data['department_id'];
                    }
                    $table = ($data['role_id'] == 4) ? "user_nurse" : "user_lab_technician";
                    break;

                case 6: // Pharmacist
                    if (!empty($data['license_number'])) {
                        $updates[] = "license_number = :license_number";
                        $params[':license_number'] = $data['license_number'];
                    }
                    $table = "user_pharmacist";
                    break;

                case 8: // Cashier
                case 9: // Billing Officer
                    if (!empty($data['employee_number'])) {
                        $updates[] = "employee_number = :employee_number";
                        $params[':employee_number'] = $data['employee_number'];
                    }
                    $table = ($data['role_id'] == 8) ? "user_cashier" : "user_billing_officer";
                    break;

                default:
                    $table = null;
            }

            if (!empty($table)) {
                $sql = "UPDATE {$table} SET " . implode(", ", $updates) . " WHERE user_id = :user_id";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute($params);
            }

            $this->conn->commit();

            echo json_encode([
                'success' => true,
                'message' => 'User updated successfully',
                'user_id' => $data['user_id']
            ]);
        } catch (Exception $e) {
            $this->conn->rollBack();
            echo json_encode([
                'success' => false,
                'message' => 'Failed to update user: ' . $e->getMessage()
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
} else if ($method === 'POST') {
    if (!empty($_POST)) {
        $operation = $_POST['operation'] ?? '';
        $json = $_POST['json'] ?? '';
    } else {
        $body = file_get_contents("php://input");
        $payload = json_decode($body, true);

        $operation = $payload['operation'] ?? '';
        $json = $payload['json'] ?? '';
    }
}

$data = json_decode($json, true);

$users = new Users($conn);

switch ($operation) {
    case 'getUsers':
        $users->getUsers();
        break;
    case 'addUser':
        $users->addUser($data);
        break;
    case 'updateUser':
        $users->updateUser($data);
        break;
}

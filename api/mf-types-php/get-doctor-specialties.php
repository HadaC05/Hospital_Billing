<?php

// require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Doctor_Specialties
{
    // function to display all specialties from database
    function getTypes($params = [])
    {
        include '../connection-pdo.php';

        // Get pagination parameters
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;

        // Calculate offset
        $offset = ($page - 1) * $itemsPerPage;

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM user_doctor_specialty WHERE is_active = 1";
        $countStmt = $conn->prepare($countSql);
        $countStmt->execute();

        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT specialty_id, specialty_name, description
            FROM user_doctor_specialty
            WHERE is_active = 1
            ORDER BY specialty_name ASC
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':limit', $itemsPerPage, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate pagination info
        $totalPages = ceil($totalCount / $itemsPerPage);
        $startIndex = $offset + 1;
        $endIndex = min($offset + $itemsPerPage, $totalCount);

        echo json_encode([
            'success' => true,
            'types' => $types,
            'data' => $types, // For backward compatibility
            'pagination' => [
                'currentPage' => $page,
                'itemsPerPage' => $itemsPerPage,
                'totalItems' => $totalCount,
                'totalPages' => $totalPages,
                'startIndex' => $startIndex,
                'endIndex' => $endIndex
            ]
        ]);
    }

    // function to add new doctor specialty
    function addSpecialty($data)
    {
        include '../connection-pdo.php';

        // check duplicate name
        $checkSql = "
            SELECT COUNT(*) 
            FROM user_doctor_specialty 
            WHERE specialty_name = :specialty_name
        ";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':specialty_name', $data['specialty_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A specialty with this name already exists'
            ]);
            return;
        }

        $sql = '
            INSERT INTO user_doctor_specialty (specialty_name, description, is_active)
            VALUES (:specialty_name, :description, 1)
        ';

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':specialty_name', $data['specialty_name']);
        $stmt->bindParam(':description', $data['description']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Doctor specialty added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    // function to update existing doctor specialty
    function updateSpecialty($specialty_name, $description, $specialty_id, $is_active)
    {
        include '../connection-pdo.php';

        // check for duplicate name
        $checkSql = "
            SELECT COUNT(*)
            FROM user_doctor_specialty
            WHERE specialty_name = :specialty_name AND specialty_id != :specialty_id
        ";

        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':specialty_name', $specialty_name);
        $checkStmt->bindParam(':specialty_id', $specialty_id);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Another specialty with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE user_doctor_specialty
            SET specialty_name = :specialty_name,
                description = :description,
                is_active = :is_active
            WHERE specialty_id = :specialty_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':specialty_name', $specialty_name);
        $stmt->bindParam(':description', $description);
        $stmt->bindParam(':specialty_id', $specialty_id);
        $stmt->bindParam(':is_active', $is_active);

        $success = $stmt->execute();

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Updated successfully' : 'Failed to update'
        ]);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';

    $page = $_GET['page'] ?? 1;
    $itemsPerPage = $_GET['itemsPerPage'] ?? 10;
    $search = $_GET['search'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';

    // Get pagination parameters from POST request
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
}

$data = json_decode($json, true);

$doctorSpecialty = new Doctor_Specialties();

switch ($operation) {
    case 'getTypes':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $doctorSpecialty->getTypes($params);
        break;
    case 'addSpecialty':
        $doctorSpecialty->addSpecialty($data);
        break;
    case 'updateSpecialty':
        $doctorSpecialty->updateSpecialty(
            $data['specialty_name'],
            $data['description'],
            $data['specialty_id'],
            $data['is_active']
        );
        break;
    default:
        // Default behavior for backward compatibility - just get all active specialties
        $doctorSpecialty->getTypes(['page' => 1, 'itemsPerPage' => 1000]);
        break;
}

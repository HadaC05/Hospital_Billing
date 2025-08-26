<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
class Treatments
{
    function getTreatments($params = [])
    {
        include '../connection-pdo.php';

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
            $whereClause = "WHERE t.treatment_nameLIKE :search 
                            OR tc.category_name LIKE :search";
            $searchParams[':search'] = "%$search%";
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM tbl_treatment t
                        JOIN tbl_treatment_category tc ON t.treatment_category_id = tc.treatment_category_id 
                        $whereClause";
        $countStmt = $conn->prepare($countSql);
        if (!empty($searchParams)) {
            $countStmt->execute($searchParams);
        } else {
            $countStmt->execute();
        }
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $sql = "
            SELECT 
                t.treatment_id,
                t.treatment_name,
                t.treatment_category_id,
                t.unit_price,
                t.is_active,
                tc.category_name AS treatment_category
            FROM tbl_treatment t
            JOIN tbl_treatment_category tc ON t.treatment_category_id = tc.treatment_category_id
            $whereClause
            ORDER BY t.treatment_name ASC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':limit', $itemsPerPage, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

        if (!empty($searchParams)) {
            foreach ($searchParams as $key => $value) {
                $stmt->bindValue($key, $value);
            }
        }

        $stmt->execute();
        $treatments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate pagination info
        $totalPages = ceil($totalCount / $itemsPerPage);
        $startIndex = $offset + 1;
        $endIndex = min($offset + $itemsPerPage, $totalCount);

        $response = [
            'success' => true,
            'treatments' => $treatments,
            'pagination' => [
                'currentPage' => $page,
                'itemsPerPage' => $itemsPerPage,
                'totalItems' => $totalCount,
                'totalPages' => $totalPages,
                'startIndex' => $startIndex,
                'endIndex' => $endIndex
            ]
        ];
        echo json_encode($response);
    }

    function addTreatment($data)
    {
        include '../connection-pdo.php';

        // check duplicate name 
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_treatment
            WHERE treatment_name = :treatment_name
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':treatment_name', $data['treatment_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A treatment with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_treatment (treatment_name, unit_price, treatment_category_id, is_active)
            VALUES (:treatment_name, :unit_price, :treatment_category_id, 1)
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':treatment_name', $data['treatment_name']);
        $stmt->bindParam(':unit_price', $data['unit_price']);
        $stmt->bindParam(':treatment_category_id', $data['treatment_category_id']);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Treatment added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    function getTreatmentCategories()
    {
        include '../connection-pdo.php';
        $sql = "
            SELECT treatment_category_id, category_name, is_active
            FROM tbl_treatment_category
            ORDER BY category_name ASC
        ";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode([
            'success' => true,
            'categories' => $categories
        ]);
    }

    function updateTreatment($data)
    {
        include '../connection-pdo.php';

        // check dupicate name 
        $checkSql = "
            SELECT COUNT(*)
            FROM tbl_treatment
            WHERE treatment_name = :treatment_name AND treatment_id != :treatment_id
        ";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':treatment_name', $data['treatment_name']);
        $checkStmt->bindParam(':treatment_id', $data['treatment_id']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A treatment with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_treatment 
            SET 
                treatment_name = :treatment_name,
                unit_price = :unit_price,
                treatment_category_id = :treatment_category_id,
                is_active = :is_active
            WHERE treatment_id = :treatment_id
        ";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':treatment_id', $data['treatment_id']);
        $stmt->bindParam(':treatment_name', $data['treatment_name']);
        $stmt->bindParam(':unit_price', $data['unit_price']);
        $stmt->bindParam(':treatment_category_id', $data['treatment_category_id']);
        $stmt->bindParam(':is_active', $data['is_active']);
        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Treatment updated']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Update failed']);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';

    // Get pagination parameters from GET request
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
$treatment = new Treatments();
switch ($operation) {
    case 'getTreatments':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $treatment->getTreatments($params);
        break;
    case 'addTreatment':
        $treatment->addTreatment($data);
        break;
    case 'getTreatmentCategories':
        $treatment->getTreatmentCategories();
        break;
    case 'updateTreatment':
        $treatment->updateTreatment($data);
        break;
}

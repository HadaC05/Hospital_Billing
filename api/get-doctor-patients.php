<?php
require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class DoctorPatients
{
    function getDoctorAdmissions($params = [])
    {
        include 'connection-pdo.php';
        try {
            // Logged-in user
            if (!isset($_SESSION['user_id'])) {
                echo json_encode(['status' => 'error', 'message' => 'Unauthorized']);
                return;
            }
            $userId = (int)$_SESSION['user_id'];

            // In schema, tbl_doctor_fee.doctor_id references users.user_id directly
            $doctorId = $userId;

            // Pagination & search
            $page = isset($params['page']) ? (int)$params['page'] : 1;
            $itemsPerPage = isset($params['itemsPerPage']) ? (int)$params['itemsPerPage'] : 10;
            $search = isset($params['search']) ? trim($params['search']) : '';
            $offset = ($page - 1) * $itemsPerPage;

            $where = 'WHERE df.doctor_id = :doctor_id';
            $binds = [':doctor_id' => $doctorId];
            if ($search !== '') {
                $where .= " AND (p.patient_fname LIKE :search OR p.patient_lname LIKE :search OR p.patient_mname LIKE :search OR p.mobile_number LIKE :search OR pa.admission_reason LIKE :search)";
                $binds[':search'] = "%$search%";
            }

            // Count distinct admissions
            $countSql = "SELECT COUNT(DISTINCT pa.admission_id) AS total
                         FROM patient_admission pa
                         JOIN patients p ON pa.patient_id = p.patient_id
                         JOIN tbl_doctor_fee df ON df.admission_id = pa.admission_id
                         $where";
            $countStmt = $conn->prepare($countSql);
            foreach ($binds as $k => $v) {
                $countStmt->bindValue($k, $v, $k === ':doctor_id' ? PDO::PARAM_INT : PDO::PARAM_STR);
            }
            $countStmt->execute();
            $totalCount = (int)($countStmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0);

            // Fetch page data
            $dataSql = "SELECT DISTINCT pa.admission_id, pa.patient_id,
                               p.patient_fname, p.patient_lname, p.patient_mname,
                               pa.admission_date, pa.discharge_date, pa.admission_reason, p.mobile_number, pa.status
                        FROM patient_admission pa
                        JOIN patients p ON pa.patient_id = p.patient_id
                        JOIN tbl_doctor_fee df ON df.admission_id = pa.admission_id
                        $where
                        ORDER BY pa.admission_date DESC
                        LIMIT :limit OFFSET :offset";
            $stmt = $conn->prepare($dataSql);
            foreach ($binds as $k => $v) {
                $stmt->bindValue($k, $v, $k === ':doctor_id' ? PDO::PARAM_INT : PDO::PARAM_STR);
            }
            $stmt->bindValue(':limit', $itemsPerPage, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $totalPages = $itemsPerPage > 0 ? (int)ceil($totalCount / $itemsPerPage) : 0;
            $startIndex = $totalCount > 0 ? $offset + 1 : 0;
            $endIndex = min($offset + $itemsPerPage, $totalCount);

            echo json_encode([
                'status' => 'success',
                'data' => $rows,
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
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $page = $_GET['page'] ?? 1;
    $itemsPerPage = $_GET['itemsPerPage'] ?? 10;
    $search = $_GET['search'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents('php://input');
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
}

$svc = new DoctorPatients();

switch ($operation) {
    case 'getDoctorAdmissions':
        $svc->getDoctorAdmissions([
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search,
        ]);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        break;
}

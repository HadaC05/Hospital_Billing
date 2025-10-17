<?php
require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

class DoctorPendingRequests
{
    function getPendingRequests()
    {
        include __DIR__ . '/../connection-pdo.php';
        try {
            $doctorId = (int)$_SESSION['user_id'];

            // Get pending medicine requests
            $sql = "
                SELECT 
                    rmb.batch_id as request_id,
                    'Medication' as request_type,
                    GROUP_CONCAT(CONCAT(m.med_name, ' (', rmi.quantity, ')') SEPARATOR ', ') as item_name,
                    rmb.request_date,
                    rmb.status,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) AS patient_name,
                    rmb.admission_id
                FROM request_medicine_batch rmb
                JOIN request_medicine_items rmi ON rmb.batch_id = rmi.batch_id
                JOIN tbl_medicine m ON rmi.med_id = m.med_id
                JOIN patients p ON rmb.patient_id = p.patient_id
                WHERE rmb.doctor_id = :doctor_id AND rmb.status = 'pending'
                GROUP BY rmb.batch_id

                UNION ALL

                SELECT 
                    rlb.batch_id as request_id,
                    'Lab Test' as request_type,
                    GROUP_CONCAT(CONCAT(lt.test_name) SEPARATOR ', ') as item_name,
                    rlb.request_date,
                    rlb.status,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) AS patient_name,
                    rlb.admission_id
                FROM request_labtest_batch rlb
                JOIN request_labtest_items rli ON rlb.batch_id = rli.batch_id
                JOIN tbl_labtest lt ON rli.labtest_id = lt.labtest_id
                JOIN patients p ON rlb.patient_id = p.patient_id
                WHERE rlb.doctor_id = :doctor_id AND rlb.status = 'pending'
                GROUP BY rlb.batch_id

                UNION ALL

                SELECT 
                    rs.request_id,
                    'Surgery' as request_type,
                    s.surgery_name as item_name,
                    rs.request_date,
                    rs.status,
                    CONCAT(p.first_name, ' ', COALESCE(p.middle_name, ''), ' ', p.last_name) AS patient_name,
                    rs.admission_id
                FROM request_surgery rs
                JOIN tbl_surgery s ON rs.surgery_type_id = s.surgery_id
                JOIN patients p ON rs.patient_id = p.patient_id
                WHERE rs.doctor_id = :doctor_id AND rs.status = 'pending'

                ORDER BY request_date DESC
                LIMIT 5
            ";

            $stmt = $conn->prepare($sql);
            $stmt->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
            $stmt->execute();

            $requests = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'data' => $requests
            ]);
        } catch (PDOException $e) {
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

    $doctorRequests = new DoctorPendingRequests();

    switch ($operation) {
        case 'getPendingRequests':
            $doctorRequests->getPendingRequests();
            break;
        default:
            echo json_encode([
                'success' => false,
                'message' => 'Invalid operation'
            ]);
            break;
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
}

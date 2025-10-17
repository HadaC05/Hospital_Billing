<?php
require_once __DIR__ . '/../require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

class DoctorDashboardStats
{
    function getDoctorStats()
    {
        include __DIR__ . '/../connection-pdo.php';
        try {
            $doctorId = (int)$_SESSION['user_id'];

            // Get active patients count
            $activePatientsSql = "
                SELECT COUNT(*) as active_count
                FROM patient_admission pa
                WHERE pa.doctor_id = :doctor_id AND pa.status = 'active'
            ";

            // Get total assigned patients count
            $totalAssignedSql = "
                SELECT COUNT(*) as total_count
                FROM patient_admission pa
                WHERE pa.doctor_id = :doctor_id
            ";

            // Get admitted patients in last 30 days
            $admitted30Sql = "
                SELECT COUNT(*) as admitted_30_count
                FROM patient_admission pa
                WHERE pa.doctor_id = :doctor_id 
                AND pa.admission_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ";

            // Get discharged patients in last 30 days
            $discharged30Sql = "
                SELECT COUNT(*) as discharged_30_count
                FROM patient_admission pa
                WHERE pa.doctor_id = :doctor_id 
                AND pa.discharge_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND pa.status = 'discharged'
            ";

            // Execute queries
            $stmt1 = $conn->prepare($activePatientsSql);
            $stmt1->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
            $stmt1->execute();
            $activeCount = $stmt1->fetch(PDO::FETCH_ASSOC)['active_count'];

            $stmt2 = $conn->prepare($totalAssignedSql);
            $stmt2->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
            $stmt2->execute();
            $totalCount = $stmt2->fetch(PDO::FETCH_ASSOC)['total_count'];

            $stmt3 = $conn->prepare($admitted30Sql);
            $stmt3->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
            $stmt3->execute();
            $admitted30Count = $stmt3->fetch(PDO::FETCH_ASSOC)['admitted_30_count'];

            $stmt4 = $conn->prepare($discharged30Sql);
            $stmt4->bindValue(':doctor_id', $doctorId, PDO::PARAM_INT);
            $stmt4->execute();
            $discharged30Count = $stmt4->fetch(PDO::FETCH_ASSOC)['discharged_30_count'];

            echo json_encode([
                'success' => true,
                'data' => [
                    'active_patients' => (int)$activeCount,
                    'total_assigned' => (int)$totalCount,
                    'admitted_30_days' => (int)$admitted30Count,
                    'discharged_30_days' => (int)$discharged30Count
                ]
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

    $doctorStats = new DoctorDashboardStats();

    switch ($operation) {
        case 'getStats':
            $doctorStats->getDoctorStats();
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

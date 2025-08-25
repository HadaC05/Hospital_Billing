<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Patients
{
    function getPatients($params = [])
    {
        include 'connection-pdo.php';

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
            $whereClause = "WHERE p.patient_fname LIKE :search 
                            OR p.patient_lname LIKE :search 
                            OR p.patient_mname LIKE :search 
                            OR p.mobile_number LIKE :search 
                            OR p.email LIKE :search";
            $searchParams[':search'] = "%$search%";
        }

        // Get total count
        $countSql = "SELECT COUNT(*) as total FROM patients p $whereClause";
        $countStmt = $conn->prepare($countSql);
        if (!empty($searchParams)) {
            $countStmt->execute($searchParams);
        } else {
            $countStmt->execute();
        }
        $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        // Get paginated data
        $sql = "
            SELECT 
                p.patient_id,
                p.patient_fname,
                p.patient_lname,
                p.patient_mname,
                p.birthdate,
                p.address,
                p.mobile_number,
                p.email,
                p.em_contact_name,
                p.em_contact_number,
                p.em_contact_address,
                (
                    SELECT pa.admission_id
                    FROM patient_admission pa
                    WHERE pa.patient_id = p.patient_id
                    ORDER BY pa.admission_date DESC
                    LIMIT 1
                ) AS latest_admission_id,
                (
                    SELECT r.room_number
                    FROM tbl_room_assignment ra
                    JOIN tbl_room_stay rs ON rs.room_assignment_id = ra.room_assignment_id
                    JOIN tbl_room r ON r.room_id = rs.room_id
                    WHERE ra.admission_id = (
                        SELECT pa2.admission_id
                        FROM patient_admission pa2
                        WHERE pa2.patient_id = p.patient_id
                        ORDER BY pa2.admission_date DESC
                        LIMIT 1
                    )
                    ORDER BY rs.room_stay_id DESC
                    LIMIT 1
                ) AS current_room_number,
                (
                    SELECT r2.room_type_id
                    FROM tbl_room_assignment ra2
                    JOIN tbl_room_stay rs2 ON rs2.room_assignment_id = ra2.room_assignment_id
                    JOIN tbl_room r2 ON r2.room_id = rs2.room_id
                    WHERE ra2.admission_id = (
                        SELECT pa3.admission_id
                        FROM patient_admission pa3
                        WHERE pa3.patient_id = p.patient_id
                        ORDER BY pa3.admission_date DESC
                        LIMIT 1
                    )
                    ORDER BY rs2.room_stay_id DESC
                    LIMIT 1
                ) AS current_room_type_id
            FROM patients p
            $whereClause
            ORDER BY p.patient_lname ASC
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
        $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Calculate pagination info
        $totalPages = ceil($totalCount / $itemsPerPage);
        $startIndex = $offset + 1;
        $endIndex = min($offset + $itemsPerPage, $totalCount);

        $response = [
            'success' => true,
            'patients' => $patients,
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

    function getPatientDetails($patient_id)
    {
        include 'connection-pdo.php';

        // Get patient basic information
        $sql = "
            SELECT 
                p.patient_id,
                p.patient_fname,
                p.patient_lname,
                p.patient_mname,
                p.birthdate,
                p.address,
                p.mobile_number,
                p.email,
                p.em_contact_name,
                p.em_contact_number,
                p.em_contact_address
            FROM patients p
            WHERE p.patient_id = :patient_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':patient_id', $patient_id);
        $stmt->execute();
        $patient = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$patient) {
            echo json_encode([
                'success' => false,
                'message' => 'Patient not found'
            ]);
            return;
        }

        // Get patient admissions
        $sql = "
            SELECT 
                a.admission_id,
                a.admission_date,
                a.discharge_date,
                a.admission_reason,
                a.status
            FROM patient_admission a
            WHERE a.patient_id = :patient_id
            ORDER BY a.admission_date DESC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':patient_id', $patient_id);
        $stmt->execute();
        $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get insurance policies
        $sql = "
            SELECT 
                ip.policy_id,
                ip.policy_number,
                ip.start_date,
                ip.end_date,
                ip.status,
                prov.provider_name
            FROM insurance_policy ip
            JOIN insurance_provider prov ON ip.provider_id = prov.provider_id
            WHERE ip.patient_id = :patient_id
            ORDER BY ip.end_date DESC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':patient_id', $patient_id);
        $stmt->execute();
        $insurance = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'success' => true,
            'patient' => $patient,
            'admissions' => $admissions,
            'insurance' => $insurance
        ];

        echo json_encode($response);
    }

    function getAdmissionDetails($admission_id)
    {
        include 'connection-pdo.php';

        // Get admission details
        $sql = "
            SELECT 
                a.admission_id,
                a.patient_id,
                a.admission_date,
                a.discharge_date,
                a.admission_reason,
                a.status,
                p.patient_fname,
                p.patient_lname,
                p.patient_mname
            FROM patient_admission a
            JOIN patients p ON a.patient_id = p.patient_id
            WHERE a.admission_id = :admission_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':admission_id', $admission_id);
        $stmt->execute();
        $admission = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$admission) {
            echo json_encode([
                'success' => false,
                'message' => 'Admission not found'
            ]);
            return;
        }

        // Get medications
        $sql = "
            SELECT 
                pm.medication_id,
                pm.record_date
            FROM patient_medication pm
            WHERE pm.admission_id = :admission_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':admission_id', $admission_id);
        $stmt->execute();
        $medications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get lab tests
        $sql = "
            SELECT 
                pl.patient_lab_id,
                pl.record_date
            FROM patient_labtest pl
            WHERE pl.admission_id = :admission_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':admission_id', $admission_id);
        $stmt->execute();
        $labtests = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get surgeries
        $sql = "
            SELECT 
                ps.patient_surgery_id,
                ps.record_date
            FROM patient_surgery ps
            WHERE ps.admission_id = :admission_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':admission_id', $admission_id);
        $stmt->execute();
        $surgeries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get treatments
        $sql = "
            SELECT 
                pt.patient_treatment_id,
                pt.record_date
            FROM patient_treatment pt
            WHERE pt.admission_id = :admission_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':admission_id', $admission_id);
        $stmt->execute();
        $treatments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Get invoices
        $sql = "
            SELECT 
                bi.invoice_id,
                bi.invoice_date,
                bi.total_amount,
                bi.amount_due,
                bi.status
            FROM bill_invoice bi
            WHERE bi.admission_id = :admission_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':admission_id', $admission_id);
        $stmt->execute();
        $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $response = [
            'success' => true,
            'admission' => $admission,
            'medications' => $medications,
            'labtests' => $labtests,
            'surgeries' => $surgeries,
            'treatments' => $treatments,
            'invoices' => $invoices
        ];

        echo json_encode($response);
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

$patients = new Patients();

switch ($operation) {
    case 'getPatients':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $patients->getPatients($params);
        break;
    case 'getPatientDetails':
        $patient_id = $data['patient_id'];
        $patients->getPatientDetails($patient_id);
        break;
    case 'getAdmissionDetails':
        $admission_id = $data['admission_id'];
        $patients->getAdmissionDetails($admission_id);
        break;
}

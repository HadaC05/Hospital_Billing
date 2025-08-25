<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Admissions
{
    // Function to get all admissions
    function getAdmissions($params = [])
    {
        include 'connection-pdo.php';

        try {
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
                               OR pa.admission_reason LIKE :search";
                $searchParams[':search'] = "%$search%";
            }

            // Get total count
            $countSql = "SELECT COUNT(*) as total FROM patient_admission pa 
                        JOIN patients p ON pa.patient_id = p.patient_id 
                        $whereClause";
            $countStmt = $conn->prepare($countSql);
            if (!empty($searchParams)) {
                $countStmt->execute($searchParams);
            } else {
                $countStmt->execute();
            }
            $totalCount = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

            // Get paginated data
            $stmt = $conn->prepare(
                "SELECT pa.admission_id, pa.patient_id, p.patient_fname, p.patient_lname, p.patient_mname, 
                        pa.admission_date, pa.discharge_date, pa.admission_reason, p.mobile_number, pa.status 
                 FROM patient_admission pa 
                 JOIN patients p ON pa.patient_id = p.patient_id 
                 $whereClause
                 ORDER BY pa.admission_date DESC
                 LIMIT :limit OFFSET :offset"
            );

            $stmt->bindParam(':limit', $itemsPerPage, PDO::PARAM_INT);
            $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);

            if (!empty($searchParams)) {
                foreach ($searchParams as $key => $value) {
                    $stmt->bindValue($key, $value);
                }
            }

            $stmt->execute();
            $admissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Calculate pagination info
            $totalPages = ceil($totalCount / $itemsPerPage);
            $startIndex = $offset + 1;
            $endIndex = min($offset + $itemsPerPage, $totalCount);

            echo json_encode([
                'status' => 'success',
                'data' => $admissions,
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

    // Function to get admission details for editing
    function getAdmissionDetails($admissionId, $patientId)
    {
        include 'connection-pdo.php';

        try {
            // Get admission details
            $stmt = $conn->prepare(
                "SELECT pa.*, p.* 
                 FROM patient_admission pa 
                 JOIN patients p ON pa.patient_id = p.patient_id 
                 WHERE pa.admission_id = :admission_id AND p.patient_id = :patient_id"
            );
            $stmt->bindParam(':admission_id', $admissionId);
            $stmt->bindParam(':patient_id', $patientId);
            $stmt->execute();
            $details = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$details) {
                echo json_encode(['status' => 'error', 'message' => 'Admission not found']);
                return;
            }

            // Fetch assigned doctor (if any)
            $docStmt = $conn->prepare("SELECT doctor_id FROM tbl_doctor_fee WHERE admission_id = :admission_id LIMIT 1");
            $docStmt->bindParam(':admission_id', $admissionId);
            $docStmt->execute();
            $docRow = $docStmt->fetch(PDO::FETCH_ASSOC);
            if ($docRow) {
                $details['doctor_id'] = (int)$docRow['doctor_id'];
            }

            echo json_encode(['status' => 'success', 'data' => $details]);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // Function to add a new admission
    function addAdmission($data)
    {
        include 'connection-pdo.php';

        try {
            // Begin transaction
            $conn->beginTransaction();

            // First, insert or update patient information
            $stmt = $conn->prepare(
                "INSERT INTO patients 
                 (patient_fname, patient_lname, patient_mname, birthdate, address, mobile_number, email, 
                  em_contact_name, em_contact_number, em_contact_address) 
                 VALUES 
                 (:patient_fname, :patient_lname, :patient_mname, :birthdate, :address, :mobile_number, :email, 
                  :em_contact_name, :em_contact_number, :em_contact_address)"
            );

            $stmt->bindParam(':patient_fname', $data['patient_fname']);
            $stmt->bindParam(':patient_lname', $data['patient_lname']);
            $stmt->bindParam(':patient_mname', $data['patient_mname']);
            $stmt->bindParam(':birthdate', $data['birthdate']);
            $stmt->bindParam(':address', $data['address']);
            $stmt->bindParam(':mobile_number', $data['mobile_number']);
            $stmt->bindParam(':email', $data['email']);
            $stmt->bindParam(':em_contact_name', $data['em_contact_name']);
            $stmt->bindParam(':em_contact_number', $data['em_contact_number']);
            $stmt->bindParam(':em_contact_address', $data['em_contact_address']);

            $stmt->execute();
            $patientId = $conn->lastInsertId();

            // Validate current session user for admitted_by
            $userId = isset($_SESSION['user_id']) ? (int)$_SESSION['user_id'] : 0;
            $chk = $conn->prepare("SELECT user_id FROM users WHERE user_id = :uid LIMIT 1");
            $chk->bindValue(':uid', $userId, PDO::PARAM_INT);
            $chk->execute();
            $validUser = $chk->fetch(PDO::FETCH_ASSOC);
            if (!$validUser) {
                $conn->rollBack();
                echo json_encode(['status' => 'error', 'message' => 'Your session user is invalid. Please log in again.']);
                return;
            }

            // Prepare insert admission record
            $stmt = $conn->prepare(
                "INSERT INTO patient_admission 
                 (patient_id, admitted_by, admission_date, discharge_date, admission_reason, status) 
                 VALUES 
                 (:patient_id, :admitted_by, :admission_date, :discharge_date, :admission_reason, :status)"
            );

            $stmt->bindValue(':patient_id', (int)$patientId, PDO::PARAM_INT);
            $stmt->bindValue(':admitted_by', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':admission_date', $data['admission_date']);

            // allow NULL discharge_date
            if (empty($data['discharge_date'])) {
                $stmt->bindValue(':discharge_date', null, PDO::PARAM_NULL);
            } else {
                $stmt->bindValue(':discharge_date', $data['discharge_date']);
            }

            $stmt->bindValue(':admission_reason', $data['admission_reason']);
            $stmt->bindValue(':status', $data['status']);

            $stmt->execute();

            // Get the new admission id
            $admissionId = $conn->lastInsertId();

            // If doctor_id is provided, link to tbl_doctor_fee
            if (!empty($data['doctor_id'])) {
                $doctorId = (int)$data['doctor_id'];
                // Remove existing links for safety then insert
                $del = $conn->prepare("DELETE FROM tbl_doctor_fee WHERE admission_id = :admission_id");
                $del->bindParam(':admission_id', $admissionId);
                $del->execute();

                $ins = $conn->prepare("INSERT INTO tbl_doctor_fee (admission_id, doctor_id, fee_amount) VALUES (:admission_id, :doctor_id, 0)");
                $ins->bindParam(':admission_id', $admissionId);
                $ins->bindParam(':doctor_id', $doctorId);
                $ins->execute();
            }

            // Commit transaction
            $conn->commit();

            echo json_encode(['status' => 'success', 'message' => 'Admission added successfully']);
        } catch (PDOException $e) {
            // Rollback transaction on error
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // Function to update an existing admission
    function updateAdmission($data)
    {
        include 'connection-pdo.php';

        try {
            // Begin transaction
            $conn->beginTransaction();

            // First, update patient information
            $stmt = $conn->prepare(
                "UPDATE patients 
                 SET patient_fname = :patient_fname, 
                     patient_lname = :patient_lname, 
                     patient_mname = :patient_mname, 
                     birthdate = :birthdate, 
                     address = :address, 
                     mobile_number = :mobile_number, 
                     email = :email, 
                     em_contact_name = :em_contact_name, 
                     em_contact_number = :em_contact_number, 
                     em_contact_address = :em_contact_address 
                 WHERE patient_id = :patient_id"
            );

            $stmt->bindParam(':patient_id', $data['patient_id']);
            $stmt->bindParam(':patient_fname', $data['patient_fname']);
            $stmt->bindParam(':patient_lname', $data['patient_lname']);
            $stmt->bindParam(':patient_mname', $data['patient_mname']);
            $stmt->bindParam(':birthdate', $data['birthdate']);
            $stmt->bindParam(':address', $data['address']);
            $stmt->bindParam(':mobile_number', $data['mobile_number']);
            $stmt->bindParam(':email', $data['email']);
            $stmt->bindParam(':em_contact_name', $data['em_contact_name']);
            $stmt->bindParam(':em_contact_number', $data['em_contact_number']);
            $stmt->bindParam(':em_contact_address', $data['em_contact_address']);

            $stmt->execute();

            // Then, update admission record
            $stmt = $conn->prepare(
                "UPDATE patient_admission 
                 SET admission_date = :admission_date, 
                     discharge_date = :discharge_date, 
                     admission_reason = :admission_reason, 
                     status = :status 
                 WHERE admission_id = :admission_id"
            );

            $stmt->bindParam(':admission_id', $data['admission_id']);
            $stmt->bindParam(':admission_date', $data['admission_date']);
            $stmt->bindParam(':discharge_date', $data['discharge_date']);
            $stmt->bindParam(':admission_reason', $data['admission_reason']);
            $stmt->bindParam(':status', $data['status']);

            $stmt->execute();

            // Update assigned doctor if provided
            if (isset($data['doctor_id'])) {
                $admissionId = (int)$data['admission_id'];
                $doctorId = (int)$data['doctor_id'];
                // Remove existing links for this admission then insert if doctorId > 0
                $del = $conn->prepare("DELETE FROM tbl_doctor_fee WHERE admission_id = :admission_id");
                $del->bindParam(':admission_id', $admissionId);
                $del->execute();

                if ($doctorId > 0) {
                    $ins = $conn->prepare("INSERT INTO tbl_doctor_fee (admission_id, doctor_id, fee_amount) VALUES (:admission_id, :doctor_id, 0)");
                    $ins->bindParam(':admission_id', $admissionId);
                    $ins->bindParam(':doctor_id', $doctorId);
                    $ins->execute();
                }
            }

            // Commit transaction
            $conn->commit();

            echo json_encode(['status' => 'success', 'message' => 'Admission updated successfully']);
        } catch (PDOException $e) {
            // Rollback transaction on error
            $conn->rollBack();
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
    }

    // Function to delete an admission
    function deleteAdmission($admissionId)
    {
        include 'connection-pdo.php';

        try {
            $stmt = $conn->prepare("DELETE FROM patient_admission WHERE admission_id = :admission_id");
            $stmt->bindParam(':admission_id', $admissionId);
            $stmt->execute();

            echo json_encode(['status' => 'success', 'message' => 'Admission deleted successfully']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
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
    $data = $payload['data'] ?? '';
    $admissionId = $payload['admission_id'] ?? '';
    $patientId = $payload['patient_id'] ?? '';

    // Get pagination parameters from POST request
    $page = $payload['page'] ?? 1;
    $itemsPerPage = $payload['itemsPerPage'] ?? 10;
    $search = $payload['search'] ?? '';
}

$admissions = new Admissions();

switch ($operation) {
    case 'getAdmissions':
        $params = [
            'page' => $page,
            'itemsPerPage' => $itemsPerPage,
            'search' => $search
        ];
        $admissions->getAdmissions($params);
        break;
    case 'getAdmissionDetails':
        $admissions->getAdmissionDetails($admissionId, $patientId);
        break;
    case 'addAdmission':
        $data = json_decode($data, true);
        $admissions->addAdmission($data);
        break;
    case 'updateAdmission':
        $data = json_decode($data, true);
        $admissions->updateAdmission($data);
        break;
    case 'deleteAdmission':
        $admissions->deleteAdmission($admissionId);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid operation']);
        break;
}

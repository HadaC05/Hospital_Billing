<?php

require_once __DIR__ . '/require_auth.php';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Billing
{
    function getOverview($filters)
    {
        include 'connection-pdo.php';

        $start = $filters['start_date'] ?? null;
        $end = $filters['end_date'] ?? null;
        $status = $filters['status'] ?? 'ALL';

        try {
            $conditions = [];
            $params = [];
            if ($start) { $conditions[] = 'bi.invoice_date >= :start'; $params[':start'] = $start; }
            if ($end) { $conditions[] = 'bi.invoice_date <= :end'; $params[':end'] = $end; }
            if ($status && $status !== 'ALL') { $conditions[] = 'bi.status = :status'; $params[':status'] = $status; }
            $where = count($conditions) ? ('WHERE ' . implode(' AND ', $conditions)) : '';

            // list
            $sql = "
                SELECT bi.invoice_id, bi.invoice_date, bi.total_amount, bi.insurance_covered_amount, bi.amount_due, bi.status,
                       CONCAT(p.patient_lname, ', ', p.patient_fname) AS patient_name
                FROM bill_invoice bi
                JOIN patient_admission a ON bi.admission_id = a.admission_id
                JOIN patients p ON a.patient_id = p.patient_id
                $where
                ORDER BY bi.invoice_date DESC, bi.invoice_id DESC
            ";
            $stmt = $conn->prepare($sql);
            foreach ($params as $k => $v) { $stmt->bindValue($k, $v); }
            $stmt->execute();
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // kpis
            $sql2 = "
                SELECT COUNT(*) AS total_invoices,
                       COALESCE(SUM(bi.total_amount),0) AS total_billed,
                       COALESCE(SUM(bi.insurance_covered_amount),0) AS total_covered,
                       COALESCE(SUM(bi.amount_due),0) AS total_due
                FROM bill_invoice bi
                $where
            ";
            $stmt2 = $conn->prepare($sql2);
            foreach ($params as $k => $v) { $stmt2->bindValue($k, $v); }
            $stmt2->execute();
            $kpis = $stmt2->fetch(PDO::FETCH_ASSOC);

            echo json_encode(['success' => true, 'invoices' => $invoices, 'kpis' => $kpis]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = $_GET['json'] ?? '';
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);
    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);
$bill = new Billing();

switch ($operation) {
    case 'getOverview':
        $bill->getOverview($data ?? []);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid operation']);
        break;
}



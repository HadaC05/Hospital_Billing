<?php

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

class Medicines
{
    function getMedicines()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT 
                m.med_id,
                m.med_name,
                m.med_type_id,
                mt.med_type_name,
                m.unit_price,
                m.stock_quantity,
                m.med_unit,
                m.is_active
            FROM tbl_medicine m
            JOIN tbl_medicine_type mt ON m.med_type_id = mt.med_type_id
            ORDER BY m.med_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $medicines = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'medicines' => $medicines
        ]);
    }

    function addMedicine($data)
    {
        include 'connection-pdo.php';

        // 🔎 Check duplicate medicine name
        $checkSql = "SELECT COUNT(*) FROM tbl_medicine WHERE med_name = :med_name";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':med_name', $data['med_name']);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'A medicine with this name already exists'
            ]);
            return;
        }

        $sql = "
            INSERT INTO tbl_medicine (med_name, med_type_id, unit_price, stock_quantity, med_unit, is_active)
            VALUES (:med_name, :med_type_id, :unit_price, :stock_quantity, :med_unit, 1)
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':med_name', $data['med_name']);
        $stmt->bindParam(':med_type_id', $data['med_type_id']);
        $stmt->bindParam(':unit_price', $data['unit_price']);
        $stmt->bindParam(':stock_quantity', $data['stock_quantity']);
        $stmt->bindParam(':med_unit', $data['med_unit']);

        if ($stmt->execute()) {
            echo json_encode(['success' => true, 'message' => 'Medicine added']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Insert failed']);
        }
    }

    function getTypes()
    {
        include 'connection-pdo.php';

        $sql = "
            SELECT med_type_id, med_type_name, description
            FROM tbl_medicine_type
            ORDER BY med_type_name ASC
        ";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        echo json_encode([
            'success' => true,
            'types' => $stmt->fetchAll(PDO::FETCH_ASSOC)
        ]);
    }

    function updateMedicine($med_id, $med_name, $med_type_id, $unit_price, $stock_quantity, $med_unit, $is_active)
    {
        include 'connection-pdo.php';

        // 🔎 Check duplicate name (exclude current record)
        $checkSql = "SELECT COUNT(*) FROM tbl_medicine WHERE med_name = :med_name AND med_id != :med_id";
        $checkStmt = $conn->prepare($checkSql);
        $checkStmt->bindParam(':med_name', $med_name);
        $checkStmt->bindParam(':med_id', $med_id);
        $checkStmt->execute();

        if ($checkStmt->fetchColumn() > 0) {
            echo json_encode([
                'success' => false,
                'message' => 'Another medicine with this name already exists'
            ]);
            return;
        }

        $sql = "
            UPDATE tbl_medicine
            SET med_name = :med_name,
                med_type_id = :med_type_id,
                unit_price = :unit_price,
                stock_quantity = :stock_quantity,
                med_unit = :med_unit,
                is_active = :is_active
            WHERE med_id = :med_id
        ";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':med_name', $med_name);
        $stmt->bindParam(':med_type_id', $med_type_id);
        $stmt->bindParam(':unit_price', $unit_price);
        $stmt->bindParam(':stock_quantity', $stock_quantity);
        $stmt->bindParam(':med_unit', $med_unit);
        $stmt->bindParam(':is_active', $is_active);
        $stmt->bindParam(':med_id', $med_id);

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
} else if ($method === 'POST') {
    $body = file_get_contents("php://input");
    $payload = json_decode($body, true);

    $operation = $payload['operation'] ?? '';
    $json = $payload['json'] ?? '';
}

$data = json_decode($json, true);

$med = new Medicines();

switch ($operation) {
    case 'getMedicines':
        $med->getMedicines();
        break;
    case 'addMedicine':
        $med->addMedicine($data);
        break;
    case 'getTypes':
        $med->getTypes();
        break;
    case 'updateMedicine':
        $med->updateMedicine(
            $data['med_id'],
            $data['med_name'],
            $data['med_type_id'],
            $data['unit_price'],
            $data['stock_quantity'],
            $data['med_unit'],
            $data['is_active']
        );
        break;
}

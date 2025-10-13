<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
include './connection-pdo.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST') {
  $body = file_get_contents('php://input');
  $payload = json_decode($body, true);
} else {
  $payload = $_GET;
}

$op = $payload['operation'] ?? 'list';
$data = $payload['data'] ?? [];

try {
  switch ($op) {
    case 'create':
      $stmt = $conn->prepare('INSERT INTO therapist_requests (patient, type, notes, status, created_at) VALUES (:patient,:type,:notes, "PENDING", NOW())');
      $stmt->execute([
        ':patient' => $data['patient'] ?? '',
        ':type' => $data['type'] ?? '',
        ':notes' => $data['notes'] ?? null,
      ]);
      echo json_encode(['success' => true]);
      break;
    case 'update':
      $stmt = $conn->prepare('UPDATE therapist_requests SET patient=:patient, type=:type, notes=:notes WHERE request_id=:id');
      $stmt->execute([
        ':patient' => $data['patient'] ?? '',
        ':type' => $data['type'] ?? '',
        ':notes' => $data['notes'] ?? null,
        ':id' => $data['request_id'] ?? 0,
      ]);
      echo json_encode(['success' => true]);
      break;
    case 'delete':
      $stmt = $conn->prepare('DELETE FROM therapist_requests WHERE request_id=:id');
      $stmt->execute([':id' => $data['request_id'] ?? 0]);
      echo json_encode(['success' => true]);
      break;
    case 'accept':
      $stmt = $conn->prepare('UPDATE therapist_requests SET status="APPROVED" WHERE request_id=:id');
      $stmt->execute([':id' => $data['request_id'] ?? 0]);
      echo json_encode(['success' => true]);
      break;
    case 'complete':
      $stmt = $conn->prepare('UPDATE therapist_requests SET status="COMPLETED" WHERE request_id=:id');
      $stmt->execute([':id' => $data['request_id'] ?? 0]);
      echo json_encode(['success' => true]);
      break;
    case 'list':
    default:
      // Create table if not exists (safety for demo)
      $conn->exec('CREATE TABLE IF NOT EXISTS therapist_requests (
        request_id INT AUTO_INCREMENT PRIMARY KEY,
        patient VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        notes TEXT NULL,
        status VARCHAR(50) DEFAULT "PENDING",
        created_at DATETIME NULL
      )');
      $stmt = $conn->query('SELECT request_id, patient, type, notes, status, created_at as date FROM therapist_requests ORDER BY request_id DESC');
      $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
      echo json_encode(['success' => true, 'requests' => $rows]);
  }
} catch (PDOException $e) {
  echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}



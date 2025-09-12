<?php

$servername = "localhost";
$dbusername = "root";
$dbpassword = "";
$dbname = "db_hospital";

try {
    // Add charset for proper encoding
    $conn = new PDO("mysql:host=$servername;dbname=$dbname;charset=utf8mb4", $dbusername, $dbpassword);

    // Expose the PDO handle for includes that expect it
    $pdo = $conn;
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    // Ensure API endpoints receive JSON instead of a raw string on failure
    if (!headers_sent()) {
        header('Content-Type: application/json');
        http_response_code(500);
    }
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}

<?php

$servername = "localhost";
$dbusername = "root";
$dbpassword = "";
$dbname = "db_hospital";

try {
    $conn = new PDO("mysql:host=$servername; dbname=$dbname", $dbusername, $dbpassword);
    // Alias for compatibility with files expecting $pdo
    $pdo = $conn;
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo "Connection Failed: " . $e->getMessage();
}

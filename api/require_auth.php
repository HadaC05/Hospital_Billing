<?php

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        'succcess' => false,
        'message' => 'Access denied. Not authenticated.'
    ]);
    exit;
}

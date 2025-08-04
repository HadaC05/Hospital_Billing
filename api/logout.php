<?php
session_start(); // resumes to be cleared
session_unset(); // clears all session variables
session_destroy(); // ends entire session

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

echo json_encode([
    'success' => true,
    'message' => 'Logged out successfully'
]);

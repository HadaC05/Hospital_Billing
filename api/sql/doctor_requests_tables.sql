    -- Doctor Requests System Tables
-- This file contains the database structure for the doctor request system

-- Table for storing doctor requests
CREATE TABLE `doctor_requests` (
  `request_id` int(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `request_type` enum('medicine','labtest') NOT NULL,
  `item_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `status` enum('pending','approved','completed','cancelled') NOT NULL DEFAULT 'pending',
  `request_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_by` int(11) DEFAULT NULL,
  `approved_date` timestamp NULL DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `completed_date` timestamp NULL DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancelled_date` timestamp NULL DEFAULT NULL,
  `cancellation_reason` text DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `fk_doctor_requests_doctor` (`doctor_id`),
  KEY `fk_doctor_requests_patient` (`patient_id`),
  KEY `fk_doctor_requests_approved_by` (`approved_by`),
  KEY `fk_doctor_requests_completed_by` (`completed_by`),
  KEY `fk_doctor_requests_cancelled_by` (`cancelled_by`),
  KEY `idx_request_type` (`request_type`),
  KEY `idx_status` (`status`),
  KEY `idx_request_date` (`request_date`),
  CONSTRAINT `fk_doctor_requests_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_doctor_requests_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  CONSTRAINT `fk_doctor_requests_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_doctor_requests_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_doctor_requests_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table for storing request notifications
CREATE TABLE `request_notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type` enum('new_request','approved','completed','cancelled') NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `fk_notifications_request` (`request_id`),
  KEY `fk_notifications_user` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_notifications_request` FOREIGN KEY (`request_id`) REFERENCES `doctor_requests` (`request_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Table for storing request history/audit trail
CREATE TABLE `request_history` (
  `history_id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `action` enum('created','approved','completed','cancelled','updated') NOT NULL,
  `performed_by` int(11) NOT NULL,
  `old_status` enum('pending','approved','completed','cancelled') DEFAULT NULL,
  `new_status` enum('pending','approved','completed','cancelled') DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`history_id`),
  KEY `fk_history_request` (`request_id`),
  KEY `fk_history_user` (`performed_by`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_history_request` FOREIGN KEY (`request_id`) REFERENCES `doctor_requests` (`request_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_history_user` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert some sample data for testing
INSERT INTO `doctor_requests` (`doctor_id`, `patient_id`, `request_type`, `item_id`, `quantity`, `notes`, `status`) VALUES
(2, 2, 'medicine', 1, 2, 'Patient needs pain relief', 'pending'),
(2, 3, 'labtest', 1, 1, 'Routine blood work', 'approved'),
(12, 4, 'medicine', 3, 1, 'Fever management', 'completed'),
(2, 6, 'labtest', 2, 1, 'Check hemoglobin levels', 'pending');

-- Insert sample notifications
INSERT INTO `request_notifications` (`request_id`, `user_id`, `notification_type`, `message`) VALUES
(1, 5, 'new_request', 'New medicine request from Dr. Ramon Reyes for John Philip'),
(2, 4, 'new_request', 'New lab test request from Dr. Ramon Reyes for Rona Obs'),
(3, 5, 'new_request', 'New medicine request from Dr. Melissa Garcia for Hannah Cubillan'),
(4, 4, 'new_request', 'New lab test request from Dr. Ramon Reyes for Cyrus Tadoy');

-- Insert sample history
INSERT INTO `request_history` (`request_id`, `action`, `performed_by`, `old_status`, `new_status`, `notes`) VALUES
(1, 'created', 2, NULL, 'pending', 'Request created'),
(2, 'created', 2, NULL, 'pending', 'Request created'),
(2, 'approved', 4, 'pending', 'approved', 'Lab test approved by technician'),
(3, 'created', 12, NULL, 'pending', 'Request created'),
(3, 'approved', 5, 'pending', 'approved', 'Medicine request approved'),
(3, 'completed', 5, 'approved', 'completed', 'Medicine dispensed'),
(4, 'created', 2, NULL, 'pending', 'Request created');

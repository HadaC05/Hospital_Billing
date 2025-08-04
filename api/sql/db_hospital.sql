-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 04, 2025 at 02:28 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_hospital`
--

-- --------------------------------------------------------

--
-- Table structure for table `bill_invoice`
--

CREATE TABLE `bill_invoice` (
  `invoice_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `invoice_date` date NOT NULL,
  `insurance_covered_amount` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `amount_due` decimal(10,2) NOT NULL,
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bill_invoice_items`
--

CREATE TABLE `bill_invoice_items` (
  `invo_item_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `svc_type_id` int(11) NOT NULL,
  `svc_reference_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `coverage_amount` decimal(10,2) NOT NULL,
  `patient_payable` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bill_payment`
--

CREATE TABLE `bill_payment` (
  `payment_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `received_by` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method_id` int(11) NOT NULL,
  `payment_date` date NOT NULL,
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bill_payment_method`
--

CREATE TABLE `bill_payment_method` (
  `payment_method_id` int(11) NOT NULL,
  `method_name` varchar(100) NOT NULL,
  `isActive` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `insurance_claim`
--

CREATE TABLE `insurance_claim` (
  `claim_id` int(11) NOT NULL,
  `policy_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `submitted_by` int(11) NOT NULL,
  `status` varchar(50) NOT NULL,
  `submitted_date` date NOT NULL,
  `approved_amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `insurance_policy`
--

CREATE TABLE `insurance_policy` (
  `policy_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `provider_id` int(11) NOT NULL,
  `policy_number` varchar(100) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `insurance_policy_coverage`
--

CREATE TABLE `insurance_policy_coverage` (
  `policy_coverage_id` int(11) NOT NULL,
  `insurance_policy_id` int(11) NOT NULL,
  `coverage_type_id` int(11) NOT NULL,
  `coverage_limit` decimal(10,2) NOT NULL,
  `coverage_percent` decimal(5,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `insurance_provider`
--

CREATE TABLE `insurance_provider` (
  `provider_id` int(11) NOT NULL,
  `provider_name` varchar(255) NOT NULL,
  `prov_email` varchar(100) NOT NULL,
  `prov_mobile_number` varchar(50) NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `insurance_provider`
--

INSERT INTO `insurance_provider` (`provider_id`, `provider_name`, `prov_email`, `prov_mobile_number`, `is_active`) VALUES
(1, 'PhilHealth', 'info@philhealth.gov.ph', '8441-7442', 1),
(2, 'Maxicare Healthcare Corporation', 'customercare@maxicare.com.ph', '8582-1900', 1),
(3, 'Intellicare (Asalus Corporation)', 'info@intellicare.net.ph', '789-4000', 1),
(4, 'Medicard Philippines, Inc.', 'customer.service@medicardphils.com', '8848-8888', 1),
(5, 'Pacific Cross Insurance', 'customer.service@pacificcross.com.ph', '810-3333', 1),
(6, 'EastWest Healthcare', 'info@ewhealthcare.com', '8781-3777', 1),
(7, 'AVEGA Managed Care', 'support@avega.com.ph', '7902-3434', 1);

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `patient_id` int(11) NOT NULL,
  `patient_fname` varchar(100) NOT NULL,
  `patient_lname` varchar(100) NOT NULL,
  `patient_mname` varchar(100) NOT NULL,
  `birthdate` date NOT NULL,
  `address` varchar(100) NOT NULL,
  `mobile_number` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `em_contact_name` varchar(100) NOT NULL,
  `em_contact_number` varchar(50) NOT NULL,
  `em_contact_address` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_admission`
--

CREATE TABLE `patient_admission` (
  `admission_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `admitted_by` int(11) NOT NULL,
  `admission_date` date NOT NULL,
  `discharge_date` date NOT NULL,
  `admission_reason` varchar(100) NOT NULL,
  `status` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_labtest`
--

CREATE TABLE `patient_labtest` (
  `patient_lab_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `record_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_medication`
--

CREATE TABLE `patient_medication` (
  `medication_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `record_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_surgery`
--

CREATE TABLE `patient_surgery` (
  `patient_surgery_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `record_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_treatment`
--

CREATE TABLE `patient_treatment` (
  `patient_treatment_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `record_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_coverage_type`
--

CREATE TABLE `tbl_coverage_type` (
  `coverage_type_id` int(11) NOT NULL,
  `cov_name` varchar(255) NOT NULL,
  `cov_description` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_coverage_type`
--

INSERT INTO `tbl_coverage_type` (`coverage_type_id`, `cov_name`, `cov_description`, `is_active`) VALUES
(1, 'Full Coverage', 'Covers 100% of eligible medical costs as per policy', 1),
(2, 'Partial Coverage', 'Covers a percentage of costs; remaining balance paid by patient', 1),
(3, 'Procedure-Specific', 'Covers only certain surgeries or treatments defined by policy', 1),
(4, 'Room Only', 'Covers hospital room and board, but excludes medical procedures', 1),
(5, 'Medicine Only', 'Covers prescribed medications only', 1),
(6, 'Diagnostic Only', 'Covers laboratory tests and imaging', 1),
(7, 'Emergency Coverage', 'Covers emergency services like ER treatment and ambulance', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_doctor_fee`
--

CREATE TABLE `tbl_doctor_fee` (
  `doctor_fee_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `fee_amount` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_labtest`
--

CREATE TABLE `tbl_labtest` (
  `labtest_id` int(11) NOT NULL,
  `test_name` varchar(100) NOT NULL,
  `labtest_category_id` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_labtest`
--

INSERT INTO `tbl_labtest` (`labtest_id`, `test_name`, `labtest_category_id`, `unit_price`, `is_active`) VALUES
(1, 'Complete Blood Count (CBC)', 1, 300.00, 1),
(2, 'Hemoglobin', 1, 180.00, 1),
(3, 'Urinalysis', 2, 250.00, 1),
(4, 'Pregnancy Test (Urine)', 2, 350.00, 1),
(5, 'Hepatitis B Screening', 3, 1000.00, 1),
(6, 'HIV Antibody Test', 3, 1200.00, 1),
(7, 'Sputum Culture and Sensitivity', 4, 850.00, 1),
(8, 'Blood Culture', 4, 1200.00, 1),
(9, 'Fasting Blood Sugar (FBS)', 5, 250.00, 1),
(10, 'Creatinine', 5, 300.00, 1),
(11, 'SGPT (ALT)', 5, 280.00, 1),
(12, 'Typhoid IgG/IgM', 6, 650.00, 1),
(13, 'Dengue NS1', 6, 950.00, 1),
(14, 'Chest X-ray (PA View)', 7, 550.00, 1),
(15, 'Ultrasound (Whole Abdomen)', 7, 1800.00, 1),
(16, '2D Echo with Doppler', 7, 3200.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_labtest_category`
--

CREATE TABLE `tbl_labtest_category` (
  `labtest_category_id` int(11) NOT NULL,
  `labtest_category_name` varchar(100) NOT NULL,
  `labtest_category_desc` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_labtest_category`
--

INSERT INTO `tbl_labtest_category` (`labtest_category_id`, `labtest_category_name`, `labtest_category_desc`) VALUES
(1, 'Hematology', 'Tests related to blood and blood-forming organs'),
(2, 'Urinalysis', 'Tests on urine for diagnosis of kidney and urinary tract disorders'),
(3, 'Immunology', 'Detection of antibodies, immune disorders, infections'),
(4, 'Microbiology', 'Culture and sensitivity tests for infection detection'),
(5, 'Biochemistry', 'Blood chemistry for liver, kidney, and metabolic function'),
(6, 'Serology', 'Blood serum tests for disease detection'),
(7, 'Imaging', 'Diagnostic radiology and scans');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_labtest_item`
--

CREATE TABLE `tbl_labtest_item` (
  `labtest_item_id` int(11) NOT NULL,
  `patient_labtest_id` int(11) NOT NULL,
  `labtest_id` int(11) NOT NULL,
  `performed_by` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `charge` decimal(10,2) NOT NULL,
  `date_performed` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medication_item`
--

CREATE TABLE `tbl_medication_item` (
  `med_item_id` int(11) NOT NULL,
  `medication_id` int(11) NOT NULL,
  `med_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `administered_by` int(11) NOT NULL,
  `date_given` date NOT NULL,
  `charge` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine`
--

CREATE TABLE `tbl_medicine` (
  `med_id` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `med_name` varchar(100) NOT NULL,
  `med_type_id` int(11) NOT NULL,
  `med_unit` varchar(50) NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine`
--

INSERT INTO `tbl_medicine` (`med_id`, `unit_price`, `med_name`, `med_type_id`, `med_unit`, `is_active`) VALUES
(1, 8.50, 'Amoxicillin', 1, 'capsule', 1),
(2, 18.00, 'Cefuroxime', 1, 'tablet', 1),
(3, 2.50, 'Paracetamol', 2, 'tablet', 1),
(4, 4.00, 'Ibuprofen', 2, 'tablet', 1),
(5, 5.00, 'Mefenamic Acid', 2, 'tablet', 1),
(6, 10.00, 'Aluminum Hydroxide', 4, '10mL', 1),
(7, 6.50, 'Cetirizine', 5, 'tablet', 1),
(8, 25.00, 'Povidone Iodine', 6, 'bottle (60mL)', 1),
(9, 15.00, 'Salbutamol', 7, 'nebulizer dose', 1),
(10, 12.00, 'Acyclovir', 8, 'tablet', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine_type`
--

CREATE TABLE `tbl_medicine_type` (
  `med_type_id` int(11) NOT NULL,
  `med_type_name` varchar(100) NOT NULL,
  `description` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine_type`
--

INSERT INTO `tbl_medicine_type` (`med_type_id`, `med_type_name`, `description`) VALUES
(1, 'Antibiotic', 'Used to treat bacterial infections'),
(2, 'Analgesic', 'Used to relieve pain'),
(3, 'Antipyretic', 'Reduces fever'),
(4, 'Antacid', 'Neutralizes stomach acid'),
(5, 'Antihistamine', 'Used for allergy relief'),
(6, 'Antiseptic', 'Prevents wound infections'),
(7, 'Bronchodilator', 'Opens airways for easier breathing'),
(8, 'Antiviral', 'Treats viral infections');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_room`
--

CREATE TABLE `tbl_room` (
  `room_id` int(11) NOT NULL,
  `room_number` varchar(50) NOT NULL,
  `room_type_id` int(11) NOT NULL,
  `daily_rate` decimal(10,2) NOT NULL,
  `max_occupancy` int(11) NOT NULL,
  `is_available` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_room`
--

INSERT INTO `tbl_room` (`room_id`, `room_number`, `room_type_id`, `daily_rate`, `max_occupancy`, `is_available`) VALUES
(1, '101', 1, 3000.00, 1, 1),
(2, '102', 1, 3000.00, 1, 1),
(3, '201', 2, 2200.00, 2, 1),
(4, '202', 2, 2200.00, 2, 1),
(5, '301', 3, 1000.00, 6, 1),
(6, '302', 3, 1000.00, 6, 1),
(7, '401', 4, 9000.00, 1, 1),
(8, '402', 4, 9000.00, 1, 1),
(9, 'ER1', 5, 1500.00, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_room_assignment`
--

CREATE TABLE `tbl_room_assignment` (
  `room_assignment_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `record_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_room_stay`
--

CREATE TABLE `tbl_room_stay` (
  `room_stay_id` int(11) NOT NULL,
  `room_assignment_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `charge` decimal(10,2) NOT NULL,
  `assigned_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_room_type`
--

CREATE TABLE `tbl_room_type` (
  `room_type_id` int(11) NOT NULL,
  `room_type_name` varchar(255) NOT NULL,
  `room_description` text NOT NULL,
  `is_active` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_room_type`
--

INSERT INTO `tbl_room_type` (`room_type_id`, `room_type_name`, `room_description`, `is_active`) VALUES
(1, 'Private Room', 'Single occupancy with privacy and amenities', 1),
(2, 'Semi-Private Room', 'Two patients per room, partitioned', 1),
(3, 'Ward', 'Multiple patients sharing a room', 1),
(4, 'ICU', 'Intensive Care Unit for critical patients', 1),
(5, 'Emergency Holding', 'Temporary room while awaiting full admission', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_service_type`
--

CREATE TABLE `tbl_service_type` (
  `svc_type_id` int(11) NOT NULL,
  `svc_name` varchar(100) NOT NULL,
  `svc_description` text NOT NULL,
  `isActive` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_service_type`
--

INSERT INTO `tbl_service_type` (`svc_type_id`, `svc_name`, `svc_description`, `isActive`) VALUES
(1, 'Room', 'Charges related to room stays', 1),
(2, 'Surgery', 'Charges for surgical procedures', 1),
(3, 'Lab Test', 'Charges for laboratory diagnostics', 1),
(4, 'Medication', 'Charges for prescribed drugs or medicines', 1),
(5, 'Treatment', 'Charges for general or non-surgical treatments', 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_surgery`
--

CREATE TABLE `tbl_surgery` (
  `surgery_id` int(11) NOT NULL,
  `surgery_name` varchar(100) NOT NULL,
  `surgery_type_id` int(11) NOT NULL,
  `surgery_price` decimal(10,2) NOT NULL,
  `is_available` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_surgery`
--

INSERT INTO `tbl_surgery` (`surgery_id`, `surgery_name`, `surgery_type_id`, `surgery_price`, `is_available`) VALUES
(1, 'Appendectomy', 1, 45000.00, 1),
(2, 'Cholecystectomy (Gallbladder Removal)', 1, 60000.00, 1),
(3, 'ORIF (Fracture Fixation)', 2, 90000.00, 1),
(4, 'Total Knee Replacement', 2, 250000.00, 1),
(5, 'CABG (Heart Bypass Surgery)', 3, 700000.00, 1),
(6, 'Craniotomy', 4, 550000.00, 1),
(7, 'Tonsillectomy', 5, 25000.00, 1),
(8, 'Cesarean Section', 6, 80000.00, 1),
(9, 'Hysterectomy', 6, 90000.00, 1),
(10, 'Prostate Surgery', 7, 85000.00, 1),
(11, 'Rhinoplasty', 8, 60000.00, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_surgery_procedure`
--

CREATE TABLE `tbl_surgery_procedure` (
  `surgery_procedure_id` int(11) NOT NULL,
  `patient_surgery_id` int(11) NOT NULL,
  `surgery_id` int(11) NOT NULL,
  `performed_by` int(11) NOT NULL,
  `performed_date` date NOT NULL,
  `charge` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbl_surgery_type`
--

CREATE TABLE `tbl_surgery_type` (
  `surgery_type_id` int(11) NOT NULL,
  `surgery_type_name` varchar(100) NOT NULL,
  `description` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_surgery_type`
--

INSERT INTO `tbl_surgery_type` (`surgery_type_id`, `surgery_type_name`, `description`) VALUES
(1, 'General Surgery', 'Procedures involving abdominal organs and soft tissue'),
(2, 'Orthopedic Surgery', 'Procedures involving bones, joints, and ligaments'),
(3, 'Cardiac Surgery', 'Heart-related surgical procedures'),
(4, 'Neurosurgery', 'Surgical treatment of brain and nervous system disorders'),
(5, 'ENT Surgery', 'Surgery of the ear, nose, and throat'),
(6, 'OB-GYN Surgery', 'Gynecological and obstetric surgical procedures'),
(7, 'Urologic Surgery', 'Procedures involving urinary tract and male reproductive organs'),
(8, 'Plastic Surgery', 'Reconstructive or cosmetic surgical procedures');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_treatment`
--

CREATE TABLE `tbl_treatment` (
  `treatment_id` int(11) NOT NULL,
  `treatment_name` varchar(100) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `treatment_category_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_treatment`
--

INSERT INTO `tbl_treatment` (`treatment_id`, `treatment_name`, `unit_price`, `treatment_category_id`) VALUES
(1, 'Physical Therapy Session', 600.00, 1),
(2, 'Hot Pack Therapy', 200.00, 1),
(3, 'Ultrasound Therapy', 350.00, 1),
(4, 'Occupational Therapy Evaluation', 800.00, 2),
(5, 'Hand Function Training', 500.00, 2),
(6, 'Nebulization', 250.00, 3),
(7, 'Oxygen Therapy (30 mins)', 300.00, 3),
(8, 'Wound Cleaning', 300.00, 4),
(9, 'Dressing Change', 200.00, 4),
(10, 'Hemodialysis (Per Session)', 4000.00, 5),
(11, 'Peritoneal Dialysis', 4500.00, 5),
(12, 'Individual Counseling', 800.00, 6),
(13, 'Psychiatric Evaluation', 1200.00, 6);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_treatment_category`
--

CREATE TABLE `tbl_treatment_category` (
  `treatment_category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_treatment_category`
--

INSERT INTO `tbl_treatment_category` (`treatment_category_id`, `category_name`, `description`) VALUES
(1, 'Physical Therapy', 'Restores mobility and function through exercise and manual therapy'),
(2, 'Occupational Therapy', 'Improves daily living and work skills through rehabilitation'),
(3, 'Respiratory Therapy', 'Treats breathing issues and lung function'),
(4, 'Wound Care', 'Cleaning, dressing, and managing wounds'),
(5, 'Dialysis', 'Blood filtration for kidney failure'),
(6, 'Counseling', 'Mental health support and therapy sessions');

-- --------------------------------------------------------

--
-- Table structure for table `tbl_treatment_session`
--

CREATE TABLE `tbl_treatment_session` (
  `treatment_session_id` int(11) NOT NULL,
  `patient_treatment_id` int(11) NOT NULL,
  `treatment_id` int(11) NOT NULL,
  `performed_by` int(11) NOT NULL,
  `treatment_date` date NOT NULL,
  `quantity` int(11) NOT NULL,
  `charge` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `mobile_number` varchar(50) NOT NULL,
  `role_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `first_name`, `middle_name`, `last_name`, `username`, `password`, `email`, `mobile_number`, `role_id`) VALUES
(1, 'Admin', '', '', 'admin1', 'admin123', 'admin@email.com', '', 1),
(2, 'Doctor', '', '', 'doctor1', 'doctor123', 'doctor@email.com', '', 2),
(3, 'Nurse', '', '', 'nurse1', 'nurse123', 'nurse@email.com', '', 3),
(4, 'Lab Technician', '', '', 'technician1', 'technician123', 'technician@email.com', '', 4),
(5, 'Pharmacist', '', '', 'pharmacist1', 'pharmacist123', 'pharmacist@email.com', '', 5),
(6, 'Surgeon', '', '', 'surgeon1', 'surgeon123', 'surgeon@email.com', '', 6),
(7, 'Therapist', '', '', 'therapist1', 'therapist123', 'therapist@email.com', '', 7),
(8, 'Cashier', '', '', 'cashier1', 'cashier123', 'cashier@email.com', '', 8),
(9, 'Billing Staff', '', '', 'biller1', 'biller123', 'biller@email.com', '', 9),
(10, 'Insurance Officer', '', '', 'insurance1', 'insurance123', 'insurance@email.com', '', 10),
(11, 'Receptionist', '', '', 'receptionist1', 'receptionist123', 'receptionist@email.com', '', 11);

-- --------------------------------------------------------

--
-- Table structure for table `user_log`
--

CREATE TABLE `user_log` (
  `login_id` int(11) NOT NULL,
  `login_time` time NOT NULL,
  `login_date` date NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_permission`
--

CREATE TABLE `user_permission` (
  `permission_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `label` varchar(150) NOT NULL,
  `description` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_permission`
--

INSERT INTO `user_permission` (`permission_id`, `name`, `label`, `description`) VALUES
(1, 'manage_users', 'Manage Users', 'Create, update, or deactivate system users'),
(2, 'manage_roles', 'Manage Roles', 'Create or modify access levels for different roles'),
(3, 'manage_rooms', 'Manage Rooms', 'Add or update room types and room details'),
(4, 'view_admissions', 'View Admissions', 'Access admission records of patients'),
(5, 'edit_admissions', 'Edit Admissions', 'Create or update admission records'),
(6, 'access_billing', 'Access Billing Module', 'View and manage invoice, payments, and billing reports'),
(7, 'generate_invoice', 'Generate Invoice', 'Issue invoices for services rendered'),
(8, 'manage_medicine', 'Manage Medicines', 'Add or update drug/medicine data'),
(9, 'manage_labtests', 'Manage Lab Tests', 'Configure and maintain lab test catalog'),
(10, 'manage_surgeries', 'Manage Surgeries', 'Add or update surgical procedures and pricing'),
(11, 'manage_treatments', 'Manage Treatments', 'Define treatment types and categories'),
(12, 'view_patient_records', 'View Patient Records', 'View patient personal and medical data'),
(13, 'approve_insurance', 'Approve Insurance Claims', 'Review and approve submitted insurance claims');

-- --------------------------------------------------------

--
-- Table structure for table `user_roles`
--

CREATE TABLE `user_roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `access_level` varchar(10) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_roles`
--

INSERT INTO `user_roles` (`role_id`, `role_name`, `access_level`) VALUES
(1, 'Admin', '10'),
(2, 'Doctor', '9'),
(3, 'Surgeon', '8'),
(4, 'Nurse', '8'),
(5, 'Lab Technician', '7'),
(6, 'Pharmacist', '7'),
(7, 'Therapist', '7'),
(8, 'Cashier', '6'),
(9, 'Billing Staff', '6'),
(10, 'Insurance Officer', '5'),
(11, 'Receptionist', '4');

-- --------------------------------------------------------

--
-- Table structure for table `user_role_permission`
--

CREATE TABLE `user_role_permission` (
  `user_role_id` int(11) NOT NULL,
  `permission_id` int(11) NOT NULL,
  `is_allowed` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_role_permission`
--

INSERT INTO `user_role_permission` (`user_role_id`, `permission_id`, `is_allowed`) VALUES
(1, 1, 1),
(1, 2, 1),
(1, 3, 1),
(1, 4, 1),
(1, 5, 1),
(1, 6, 1),
(1, 7, 1),
(1, 8, 1),
(1, 9, 1),
(1, 10, 1),
(1, 11, 1),
(1, 12, 1),
(1, 13, 1),
(2, 4, 1),
(2, 12, 1),
(3, 4, 1),
(3, 10, 1),
(3, 12, 1),
(4, 4, 1),
(4, 12, 1),
(5, 9, 1),
(6, 8, 1),
(7, 11, 1),
(8, 6, 1),
(8, 7, 1),
(9, 6, 1),
(9, 7, 1),
(10, 13, 1),
(11, 4, 1),
(11, 5, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bill_invoice`
--
ALTER TABLE `bill_invoice`
  ADD PRIMARY KEY (`invoice_id`),
  ADD KEY `invoice_fk_1` (`admission_id`),
  ADD KEY `invoice_fk_2` (`created_by`);

--
-- Indexes for table `bill_invoice_items`
--
ALTER TABLE `bill_invoice_items`
  ADD PRIMARY KEY (`invo_item_id`),
  ADD KEY `fk_invoice_items_1` (`invoice_id`),
  ADD KEY `fk_invoice_items_2` (`svc_type_id`);

--
-- Indexes for table `bill_payment`
--
ALTER TABLE `bill_payment`
  ADD PRIMARY KEY (`payment_id`),
  ADD KEY `fk_payment_1` (`invoice_id`),
  ADD KEY `fk_payment_2` (`received_by`),
  ADD KEY `fk_payment_3` (`payment_method_id`);

--
-- Indexes for table `bill_payment_method`
--
ALTER TABLE `bill_payment_method`
  ADD PRIMARY KEY (`payment_method_id`);

--
-- Indexes for table `insurance_claim`
--
ALTER TABLE `insurance_claim`
  ADD PRIMARY KEY (`claim_id`),
  ADD KEY `fk_claim_1` (`policy_id`),
  ADD KEY `fk_claim_2` (`invoice_id`),
  ADD KEY `fk_claim_3` (`submitted_by`);

--
-- Indexes for table `insurance_policy`
--
ALTER TABLE `insurance_policy`
  ADD PRIMARY KEY (`policy_id`),
  ADD KEY `fk_policy_1` (`patient_id`),
  ADD KEY `fk_policy_2` (`provider_id`);

--
-- Indexes for table `insurance_policy_coverage`
--
ALTER TABLE `insurance_policy_coverage`
  ADD PRIMARY KEY (`policy_coverage_id`),
  ADD KEY `fk_policy_coverage_1` (`insurance_policy_id`),
  ADD KEY `fk_policy_coverage_2` (`coverage_type_id`);

--
-- Indexes for table `insurance_provider`
--
ALTER TABLE `insurance_provider`
  ADD PRIMARY KEY (`provider_id`);

--
-- Indexes for table `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`patient_id`);

--
-- Indexes for table `patient_admission`
--
ALTER TABLE `patient_admission`
  ADD PRIMARY KEY (`admission_id`),
  ADD KEY `fk_admission_1` (`patient_id`),
  ADD KEY `fk_admission_2` (`admitted_by`);

--
-- Indexes for table `patient_labtest`
--
ALTER TABLE `patient_labtest`
  ADD PRIMARY KEY (`patient_lab_id`),
  ADD KEY `fk_patient_labtest_1` (`admission_id`);

--
-- Indexes for table `patient_medication`
--
ALTER TABLE `patient_medication`
  ADD PRIMARY KEY (`medication_id`),
  ADD KEY `fk_patient_medication_1` (`admission_id`);

--
-- Indexes for table `patient_surgery`
--
ALTER TABLE `patient_surgery`
  ADD PRIMARY KEY (`patient_surgery_id`),
  ADD KEY `fk_patient_surgery_1` (`admission_id`);

--
-- Indexes for table `patient_treatment`
--
ALTER TABLE `patient_treatment`
  ADD PRIMARY KEY (`patient_treatment_id`),
  ADD KEY `fk_patient_treatment_1` (`admission_id`);

--
-- Indexes for table `tbl_coverage_type`
--
ALTER TABLE `tbl_coverage_type`
  ADD PRIMARY KEY (`coverage_type_id`);

--
-- Indexes for table `tbl_doctor_fee`
--
ALTER TABLE `tbl_doctor_fee`
  ADD PRIMARY KEY (`doctor_fee_id`),
  ADD KEY `fk_doctor_fee_1` (`admission_id`),
  ADD KEY `fk_doctor_fee_2` (`doctor_id`);

--
-- Indexes for table `tbl_labtest`
--
ALTER TABLE `tbl_labtest`
  ADD PRIMARY KEY (`labtest_id`),
  ADD KEY `fk_labtest_2` (`labtest_category_id`);

--
-- Indexes for table `tbl_labtest_category`
--
ALTER TABLE `tbl_labtest_category`
  ADD PRIMARY KEY (`labtest_category_id`);

--
-- Indexes for table `tbl_labtest_item`
--
ALTER TABLE `tbl_labtest_item`
  ADD PRIMARY KEY (`labtest_item_id`),
  ADD KEY `fk_labtest_item_1` (`patient_labtest_id`),
  ADD KEY `fk_labtest_item_2` (`labtest_id`),
  ADD KEY `fk_labtest_item_3` (`performed_by`);

--
-- Indexes for table `tbl_medication_item`
--
ALTER TABLE `tbl_medication_item`
  ADD PRIMARY KEY (`med_item_id`),
  ADD KEY `fk_medication_item_1` (`medication_id`),
  ADD KEY `fk_medication_item_2` (`med_id`),
  ADD KEY `fk_medication_item_3` (`administered_by`);

--
-- Indexes for table `tbl_medicine`
--
ALTER TABLE `tbl_medicine`
  ADD PRIMARY KEY (`med_id`),
  ADD KEY `fk_medicine_1` (`med_type_id`);

--
-- Indexes for table `tbl_medicine_type`
--
ALTER TABLE `tbl_medicine_type`
  ADD PRIMARY KEY (`med_type_id`);

--
-- Indexes for table `tbl_room`
--
ALTER TABLE `tbl_room`
  ADD PRIMARY KEY (`room_id`),
  ADD KEY `fk_room_1` (`room_type_id`);

--
-- Indexes for table `tbl_room_assignment`
--
ALTER TABLE `tbl_room_assignment`
  ADD PRIMARY KEY (`room_assignment_id`),
  ADD KEY `fk_room_assignment_1` (`admission_id`);

--
-- Indexes for table `tbl_room_stay`
--
ALTER TABLE `tbl_room_stay`
  ADD PRIMARY KEY (`room_stay_id`),
  ADD KEY `fk_room_stay_1` (`room_assignment_id`),
  ADD KEY `fk_room_stay_2` (`room_id`),
  ADD KEY `fk_room_stay_3` (`assigned_by`);

--
-- Indexes for table `tbl_room_type`
--
ALTER TABLE `tbl_room_type`
  ADD PRIMARY KEY (`room_type_id`);

--
-- Indexes for table `tbl_service_type`
--
ALTER TABLE `tbl_service_type`
  ADD PRIMARY KEY (`svc_type_id`);

--
-- Indexes for table `tbl_surgery`
--
ALTER TABLE `tbl_surgery`
  ADD PRIMARY KEY (`surgery_id`),
  ADD KEY `fk_surgery_1` (`surgery_type_id`);

--
-- Indexes for table `tbl_surgery_procedure`
--
ALTER TABLE `tbl_surgery_procedure`
  ADD PRIMARY KEY (`surgery_procedure_id`),
  ADD KEY `fk_surgery_procedure_1` (`patient_surgery_id`),
  ADD KEY `fk_surgery_procedure_2` (`surgery_id`),
  ADD KEY `fk_patient_procedure_3` (`performed_by`);

--
-- Indexes for table `tbl_surgery_type`
--
ALTER TABLE `tbl_surgery_type`
  ADD PRIMARY KEY (`surgery_type_id`);

--
-- Indexes for table `tbl_treatment`
--
ALTER TABLE `tbl_treatment`
  ADD PRIMARY KEY (`treatment_id`),
  ADD KEY `fk_treatment_type_1` (`treatment_category_id`);

--
-- Indexes for table `tbl_treatment_category`
--
ALTER TABLE `tbl_treatment_category`
  ADD PRIMARY KEY (`treatment_category_id`);

--
-- Indexes for table `tbl_treatment_session`
--
ALTER TABLE `tbl_treatment_session`
  ADD PRIMARY KEY (`treatment_session_id`),
  ADD KEY `fk_treatment_session_1` (`patient_treatment_id`),
  ADD KEY `fk_treatment_session_2` (`treatment_id`),
  ADD KEY `fk_treatment_session_3` (`performed_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `fk_users_1` (`role_id`);

--
-- Indexes for table `user_log`
--
ALTER TABLE `user_log`
  ADD PRIMARY KEY (`login_id`),
  ADD KEY `fk_log_1` (`user_id`);

--
-- Indexes for table `user_permission`
--
ALTER TABLE `user_permission`
  ADD PRIMARY KEY (`permission_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Indexes for table `user_role_permission`
--
ALTER TABLE `user_role_permission`
  ADD PRIMARY KEY (`user_role_id`,`permission_id`),
  ADD KEY `permission_id` (`permission_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bill_invoice`
--
ALTER TABLE `bill_invoice`
  MODIFY `invoice_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bill_invoice_items`
--
ALTER TABLE `bill_invoice_items`
  MODIFY `invo_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bill_payment`
--
ALTER TABLE `bill_payment`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bill_payment_method`
--
ALTER TABLE `bill_payment_method`
  MODIFY `payment_method_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `insurance_claim`
--
ALTER TABLE `insurance_claim`
  MODIFY `claim_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `insurance_policy`
--
ALTER TABLE `insurance_policy`
  MODIFY `policy_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `insurance_policy_coverage`
--
ALTER TABLE `insurance_policy_coverage`
  MODIFY `policy_coverage_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `insurance_provider`
--
ALTER TABLE `insurance_provider`
  MODIFY `provider_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `patients`
--
ALTER TABLE `patients`
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient_admission`
--
ALTER TABLE `patient_admission`
  MODIFY `admission_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient_labtest`
--
ALTER TABLE `patient_labtest`
  MODIFY `patient_lab_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient_medication`
--
ALTER TABLE `patient_medication`
  MODIFY `medication_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient_treatment`
--
ALTER TABLE `patient_treatment`
  MODIFY `patient_treatment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_coverage_type`
--
ALTER TABLE `tbl_coverage_type`
  MODIFY `coverage_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_doctor_fee`
--
ALTER TABLE `tbl_doctor_fee`
  MODIFY `doctor_fee_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_labtest`
--
ALTER TABLE `tbl_labtest`
  MODIFY `labtest_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_labtest_category`
--
ALTER TABLE `tbl_labtest_category`
  MODIFY `labtest_category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_labtest_item`
--
ALTER TABLE `tbl_labtest_item`
  MODIFY `labtest_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_medication_item`
--
ALTER TABLE `tbl_medication_item`
  MODIFY `med_item_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_medicine`
--
ALTER TABLE `tbl_medicine`
  MODIFY `med_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `tbl_medicine_type`
--
ALTER TABLE `tbl_medicine_type`
  MODIFY `med_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_room`
--
ALTER TABLE `tbl_room`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `tbl_room_assignment`
--
ALTER TABLE `tbl_room_assignment`
  MODIFY `room_assignment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_room_stay`
--
ALTER TABLE `tbl_room_stay`
  MODIFY `room_stay_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_room_type`
--
ALTER TABLE `tbl_room_type`
  MODIFY `room_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_service_type`
--
ALTER TABLE `tbl_service_type`
  MODIFY `svc_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_surgery`
--
ALTER TABLE `tbl_surgery`
  MODIFY `surgery_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `tbl_surgery_procedure`
--
ALTER TABLE `tbl_surgery_procedure`
  MODIFY `surgery_procedure_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_surgery_type`
--
ALTER TABLE `tbl_surgery_type`
  MODIFY `surgery_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_treatment`
--
ALTER TABLE `tbl_treatment`
  MODIFY `treatment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `tbl_treatment_category`
--
ALTER TABLE `tbl_treatment_category`
  MODIFY `treatment_category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `tbl_treatment_session`
--
ALTER TABLE `tbl_treatment_session`
  MODIFY `treatment_session_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user_log`
--
ALTER TABLE `user_log`
  MODIFY `login_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_permission`
--
ALTER TABLE `user_permission`
  MODIFY `permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bill_invoice`
--
ALTER TABLE `bill_invoice`
  ADD CONSTRAINT `invoice_fk_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`),
  ADD CONSTRAINT `invoice_fk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `bill_invoice_items`
--
ALTER TABLE `bill_invoice_items`
  ADD CONSTRAINT `fk_invoice_items_1` FOREIGN KEY (`invoice_id`) REFERENCES `bill_invoice` (`invoice_id`),
  ADD CONSTRAINT `fk_invoice_items_2` FOREIGN KEY (`svc_type_id`) REFERENCES `tbl_service_type` (`svc_type_id`);

--
-- Constraints for table `bill_payment`
--
ALTER TABLE `bill_payment`
  ADD CONSTRAINT `fk_payment_1` FOREIGN KEY (`invoice_id`) REFERENCES `bill_invoice` (`invoice_id`),
  ADD CONSTRAINT `fk_payment_2` FOREIGN KEY (`received_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_payment_3` FOREIGN KEY (`payment_method_id`) REFERENCES `bill_payment_method` (`payment_method_id`);

--
-- Constraints for table `insurance_claim`
--
ALTER TABLE `insurance_claim`
  ADD CONSTRAINT `fk_claim_1` FOREIGN KEY (`policy_id`) REFERENCES `insurance_policy` (`policy_id`),
  ADD CONSTRAINT `fk_claim_2` FOREIGN KEY (`invoice_id`) REFERENCES `bill_invoice` (`invoice_id`),
  ADD CONSTRAINT `fk_claim_3` FOREIGN KEY (`submitted_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `insurance_policy`
--
ALTER TABLE `insurance_policy`
  ADD CONSTRAINT `fk_policy_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `fk_policy_2` FOREIGN KEY (`provider_id`) REFERENCES `insurance_provider` (`provider_id`);

--
-- Constraints for table `insurance_policy_coverage`
--
ALTER TABLE `insurance_policy_coverage`
  ADD CONSTRAINT `fk_policy_coverage_1` FOREIGN KEY (`insurance_policy_id`) REFERENCES `insurance_policy` (`policy_id`),
  ADD CONSTRAINT `fk_policy_coverage_2` FOREIGN KEY (`coverage_type_id`) REFERENCES `tbl_coverage_type` (`coverage_type_id`);

--
-- Constraints for table `patient_admission`
--
ALTER TABLE `patient_admission`
  ADD CONSTRAINT `fk_admission_1` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `fk_admission_2` FOREIGN KEY (`admitted_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `patient_labtest`
--
ALTER TABLE `patient_labtest`
  ADD CONSTRAINT `fk_labtest_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`),
  ADD CONSTRAINT `fk_patient_labtest_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`);

--
-- Constraints for table `patient_medication`
--
ALTER TABLE `patient_medication`
  ADD CONSTRAINT `fk_patient_medication_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`);

--
-- Constraints for table `patient_surgery`
--
ALTER TABLE `patient_surgery`
  ADD CONSTRAINT `fk_patient_surgery_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`);

--
-- Constraints for table `patient_treatment`
--
ALTER TABLE `patient_treatment`
  ADD CONSTRAINT `fk_patient_treatment_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`);

--
-- Constraints for table `tbl_doctor_fee`
--
ALTER TABLE `tbl_doctor_fee`
  ADD CONSTRAINT `fk_doctor_fee_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`),
  ADD CONSTRAINT `fk_doctor_fee_2` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `tbl_labtest`
--
ALTER TABLE `tbl_labtest`
  ADD CONSTRAINT `fk_labtest_2` FOREIGN KEY (`labtest_category_id`) REFERENCES `tbl_labtest_category` (`labtest_category_id`);

--
-- Constraints for table `tbl_labtest_item`
--
ALTER TABLE `tbl_labtest_item`
  ADD CONSTRAINT `fk_labtest_item_1` FOREIGN KEY (`patient_labtest_id`) REFERENCES `patient_labtest` (`patient_lab_id`),
  ADD CONSTRAINT `fk_labtest_item_2` FOREIGN KEY (`labtest_id`) REFERENCES `tbl_labtest` (`labtest_id`),
  ADD CONSTRAINT `fk_labtest_item_3` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `tbl_medication_item`
--
ALTER TABLE `tbl_medication_item`
  ADD CONSTRAINT `fk_medication_item_1` FOREIGN KEY (`medication_id`) REFERENCES `patient_medication` (`medication_id`),
  ADD CONSTRAINT `fk_medication_item_2` FOREIGN KEY (`med_id`) REFERENCES `tbl_medicine` (`med_id`),
  ADD CONSTRAINT `fk_medication_item_3` FOREIGN KEY (`administered_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `tbl_medicine`
--
ALTER TABLE `tbl_medicine`
  ADD CONSTRAINT `fk_medicine_1` FOREIGN KEY (`med_type_id`) REFERENCES `tbl_medicine_type` (`med_type_id`);

--
-- Constraints for table `tbl_room`
--
ALTER TABLE `tbl_room`
  ADD CONSTRAINT `fk_room_1` FOREIGN KEY (`room_type_id`) REFERENCES `tbl_room_type` (`room_type_id`);

--
-- Constraints for table `tbl_room_assignment`
--
ALTER TABLE `tbl_room_assignment`
  ADD CONSTRAINT `fk_room_assignment_1` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`);

--
-- Constraints for table `tbl_room_stay`
--
ALTER TABLE `tbl_room_stay`
  ADD CONSTRAINT `fk_room_assignment_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_room_stay_1` FOREIGN KEY (`room_assignment_id`) REFERENCES `tbl_room_assignment` (`room_assignment_id`),
  ADD CONSTRAINT `fk_room_stay_2` FOREIGN KEY (`room_id`) REFERENCES `tbl_room` (`room_id`),
  ADD CONSTRAINT `fk_room_stay_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `tbl_surgery`
--
ALTER TABLE `tbl_surgery`
  ADD CONSTRAINT `fk_surgery_1` FOREIGN KEY (`surgery_type_id`) REFERENCES `tbl_surgery_type` (`surgery_type_id`);

--
-- Constraints for table `tbl_surgery_procedure`
--
ALTER TABLE `tbl_surgery_procedure`
  ADD CONSTRAINT `fk_patient_procedure_3` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_surgery_procedure_1` FOREIGN KEY (`patient_surgery_id`) REFERENCES `patient_surgery` (`patient_surgery_id`),
  ADD CONSTRAINT `fk_surgery_procedure_2` FOREIGN KEY (`surgery_id`) REFERENCES `tbl_surgery` (`surgery_id`);

--
-- Constraints for table `tbl_treatment`
--
ALTER TABLE `tbl_treatment`
  ADD CONSTRAINT `fk_treatment_type_1` FOREIGN KEY (`treatment_category_id`) REFERENCES `tbl_treatment_category` (`treatment_category_id`);

--
-- Constraints for table `tbl_treatment_session`
--
ALTER TABLE `tbl_treatment_session`
  ADD CONSTRAINT `fk_treatment_session_1` FOREIGN KEY (`patient_treatment_id`) REFERENCES `patient_treatment` (`patient_treatment_id`),
  ADD CONSTRAINT `fk_treatment_session_2` FOREIGN KEY (`treatment_id`) REFERENCES `tbl_treatment` (`treatment_id`),
  ADD CONSTRAINT `fk_treatment_session_3` FOREIGN KEY (`performed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_1` FOREIGN KEY (`role_id`) REFERENCES `user_roles` (`role_id`);

--
-- Constraints for table `user_log`
--
ALTER TABLE `user_log`
  ADD CONSTRAINT `fk_log_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_role_permission`
--
ALTER TABLE `user_role_permission`
  ADD CONSTRAINT `user_role_permission_ibfk_1` FOREIGN KEY (`user_role_id`) REFERENCES `user_roles` (`role_id`),
  ADD CONSTRAINT `user_role_permission_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `user_permission` (`permission_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

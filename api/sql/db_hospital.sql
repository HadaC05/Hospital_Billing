-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 14, 2025 at 05:37 AM
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
  `patient_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL,
  `invoice_date` datetime DEFAULT NULL,
  `insurance_covered_amount` decimal(10,2) DEFAULT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `amount_due` decimal(10,2) DEFAULT NULL,
  `status` enum('draft','pending','approved','paid','partial','cancelled') NOT NULL DEFAULT 'draft'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_invoice`
--

INSERT INTO `bill_invoice` (`invoice_id`, `admission_id`, `patient_id`, `created_by`, `invoice_date`, `insurance_covered_amount`, `total_amount`, `amount_due`, `status`) VALUES
(1, 24, 26, 5, '2025-09-13 09:30:19', NULL, 25.50, 25.50, 'draft'),
(2, 26, 28, 5, '2025-09-13 09:56:54', NULL, 8.00, 0.00, 'paid'),
(3, 24, 26, 1, '2025-09-13 00:00:00', 0.00, 1025.50, 1025.50, 'draft'),
(4, 25, 27, 1, '2025-09-13 00:00:00', 0.00, 2200.00, 2200.00, 'draft'),
(5, 28, 30, 5, '2025-09-13 10:52:25', NULL, 5.00, 0.00, 'paid'),
(6, 28, 30, 9, '2025-09-13 00:00:00', 0.00, 1005.00, 1005.00, 'draft'),
(7, 28, 30, 9, '2025-10-10 00:00:00', 0.00, 10.00, 10.00, 'draft'),
(8, 22, 24, 9, '2025-10-11 00:00:00', 0.00, 15.00, 15.00, 'draft');

-- --------------------------------------------------------

--
-- Table structure for table `bill_invoice_items`
--

CREATE TABLE `bill_invoice_items` (
  `invo_item_id` int(11) NOT NULL,
  `invoice_id` int(11) NOT NULL,
  `svc_type_id` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_amount` decimal(10,2) NOT NULL,
  `reference_table` enum('patient_treatment','patient_surgery','request_medicine_items','request_labtest_items') NOT NULL,
  `reference_id` int(11) NOT NULL,
  `coverage_amount` decimal(10,2) DEFAULT NULL,
  `patient_payable` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_invoice_items`
--

INSERT INTO `bill_invoice_items` (`invo_item_id`, `invoice_id`, `svc_type_id`, `quantity`, `unit_price`, `total_amount`, `reference_table`, `reference_id`, `coverage_amount`, `patient_payable`) VALUES
(1, 1, 4, 3.00, 8.50, 25.50, '', 1, NULL, NULL),
(2, 2, 4, 2.00, 4.00, 8.00, '', 2, NULL, NULL),
(3, 3, 1, 1.00, 1000.00, 1000.00, '', 13, 0.00, 1000.00),
(4, 3, 4, 3.00, 8.50, 25.50, '', 1, 0.00, 25.50),
(5, 4, 1, 1.00, 2200.00, 2200.00, '', 14, 0.00, 2200.00),
(6, 5, 4, 2.00, 2.50, 5.00, '', 3, NULL, NULL),
(7, 6, 1, 1.00, 1000.00, 1000.00, '', 16, 0.00, 1000.00),
(8, 6, 4, 2.00, 2.50, 5.00, '', 3, 0.00, 5.00),
(9, 7, 4, 2.00, 2.50, 5.00, 'request_medicine_items', 10, 0.00, 5.00),
(10, 7, 4, 2.00, 2.50, 5.00, 'request_medicine_items', 15, 0.00, 5.00),
(11, 8, 4, 3.00, 5.00, 15.00, 'request_medicine_items', 17, 0.00, 15.00);

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

--
-- Dumping data for table `bill_payment`
--

INSERT INTO `bill_payment` (`payment_id`, `invoice_id`, `received_by`, `amount`, `payment_method_id`, `payment_date`, `status`) VALUES
(1, 2, 9, 8.00, 1, '2025-09-13', 'completed'),
(2, 5, 8, 5.00, 1, '2025-09-13', 'completed');

-- --------------------------------------------------------

--
-- Table structure for table `bill_payment_method`
--

CREATE TABLE `bill_payment_method` (
  `payment_method_id` int(11) NOT NULL,
  `method_name` varchar(100) NOT NULL,
  `isActive` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `bill_payment_method`
--

INSERT INTO `bill_payment_method` (`payment_method_id`, `method_name`, `isActive`) VALUES
(1, 'Cash', 1);

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
  `first_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `birthdate` date NOT NULL,
  `address` varchar(100) NOT NULL,
  `mobile_number` varchar(50) NOT NULL,
  `email` varchar(50) NOT NULL,
  `suffix` varchar(20) DEFAULT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `marital_status` enum('Single','Married','Divorced','Widowed') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patients`
--

INSERT INTO `patients` (`patient_id`, `first_name`, `last_name`, `middle_name`, `birthdate`, `address`, `mobile_number`, `email`, `suffix`, `gender`, `marital_status`) VALUES
(2, 'john', 'philip', 'baloro', '1980-05-08', 'vcastro', '096666522', 'aa@gmail.com', NULL, 'Male', 'Single'),
(3, 'rona', 'obs', 'ss', '2025-08-22', 'fgfhg', '461613132332', 'dfgd@gmail.com', NULL, 'Male', 'Single'),
(4, 'hannah', 'cubillan', 'dap', '2001-01-27', 'cdo', '09111111111', 'user@mail.com', NULL, 'Male', 'Single'),
(6, 'cyrus', 'tadoy', 'mid', '2000-01-01', 'cdo', '09111111111', 'email@gmail.com', NULL, 'Male', 'Single'),
(8, 'Vern', 'Non', '', '2000-01-01', 'SoKor', '09161234567', '', '', 'Male', 'Single'),
(9, 'Pandan', 'Superstix', '', '2004-02-03', 'Villarica Road', '09123849998', '', '', 'Female', 'Divorced'),
(10, 'Mod', 'Ciga', '', '2006-05-12', 'CDO', '09123875784', '', '', 'Male', 'Single'),
(11, 'cyrus', 'tadoy', 'viterbo', '2006-10-11', '', '09265622796', '', '', 'Male', 'Single'),
(12, 'cyrus', 'tadoy', 'viterbo', '2006-10-11', 'zone 12', '09265622796', '', '', 'Male', 'Single'),
(13, 'cyrus', 'tadoy', 'v', '2025-09-06', 'dasdsad', '132132133123', 'asd@gmail.com', '', 'Male', 'Single'),
(14, 'cyrus', 'tadoy', 'v', '2025-09-06', 'dasdsad', '132132133123', 'asd@gmail.com', '', 'Male', 'Single'),
(15, 'cyrel', 'lam', 'v', '2025-09-06', 'dasdsad', '132132133123', 'qod@gmail.com', '', 'Male', 'Single'),
(16, 'Merry', 'Lamb', '', '2005-05-06', '', '', '', '', 'Female', 'Single'),
(21, 'Chris', 'Grimmie', '', '1993-12-05', 'us', '09123456789', '', '', 'Male', 'Widowed'),
(22, 'Test', 'Success', '', '2001-01-01', 'us', '09161829384', '', '', 'Other', 'Married'),
(23, 'test', 'success', '', '2001-01-01', 'phil', '09128475647', '', '', 'Male', 'Single'),
(24, 'Juan', 'Cruz', '', '2010-01-01', 'Cagayan de oro city', '09161234567', 'childtest@email.com', '', 'Male', 'Single'),
(25, 'lim', 'mae', 'trisha', '2005-10-11', '', '09988765432', '', '', 'Female', 'Single'),
(26, 'cc', 'cc', 'cc', '2005-10-11', 'zone 1', '09977665432', '', '', 'Male', 'Single'),
(27, 'Raya', 'Ramos', 'l', '2003-09-23', 'balahsuih', '09474072712', 'ray.@gmail.com', '', 'Female', 'Single'),
(28, 'bebe', 'bayaga', '', '2000-09-12', 'st.libog santa maria', '09827651321', 'bebe.@gmail.com', '', 'Female', 'Single'),
(29, 'shasha', 'kim', 'l', '2000-02-01', 'zone9', '09979361067', 'sha@gmail.com', '', 'Female', ''),
(30, 'Trish', 'Limm', '', '2004-01-01', 'cdo', '09123456789', '', '', 'Female', 'Single');

-- --------------------------------------------------------

--
-- Table structure for table `patient_admission`
--

CREATE TABLE `patient_admission` (
  `admission_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `admitted_by` int(11) NOT NULL,
  `admission_date` datetime DEFAULT NULL,
  `discharge_date` datetime DEFAULT NULL,
  `admission_reason` varchar(100) NOT NULL,
  `status` enum('active','discharged','cancelled') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient_admission`
--

INSERT INTO `patient_admission` (`admission_id`, `patient_id`, `doctor_id`, `admitted_by`, `admission_date`, `discharge_date`, `admission_reason`, `status`) VALUES
(1, 2, 2, 1, '2025-08-22 00:00:00', '2025-08-28 00:00:00', 'aa', 'discharged'),
(2, 3, 2, 1, '2025-08-22 00:00:00', '2025-08-22 00:00:00', 'jhjh', 'active'),
(3, 4, 2, 11, '2025-08-22 00:00:00', '2025-08-23 00:00:00', 'hhh', 'active'),
(4, 6, 2, 11, '2025-09-02 00:00:00', '2025-09-12 00:00:00', 'reason', 'active'),
(6, 8, 27, 1, '2025-09-05 00:00:00', NULL, '', 'active'),
(7, 9, 2, 1, '2025-09-05 00:00:00', NULL, 'Headache', 'active'),
(8, 10, 12, 11, '2025-09-05 00:00:00', NULL, '', 'active'),
(9, 11, 42, 1, '2025-09-06 00:00:00', NULL, 'mental', 'active'),
(10, 12, 42, 1, '2025-09-06 00:00:00', NULL, 'mental', 'active'),
(11, 13, 42, 11, '2025-09-06 00:00:00', NULL, 'nag patuli', 'active'),
(12, 14, 42, 11, '2025-09-06 00:00:00', NULL, 'nag patuli', 'active'),
(13, 15, 40, 11, '2025-09-06 00:00:00', NULL, 'headache', 'active'),
(14, 16, 2, 1, '2025-09-06 00:00:00', NULL, 'headache', 'active'),
(19, 21, 2, 1, '2025-09-10 00:00:00', NULL, 'test guardian', 'active'),
(20, 22, 2, 1, '2025-09-10 00:00:00', NULL, 'test success', 'active'),
(21, 23, 42, 1, '2025-09-10 00:00:00', NULL, 'test success', 'active'),
(22, 24, 2, 1, '2025-09-11 00:00:00', NULL, 'test', 'active'),
(23, 25, 42, 11, '2025-09-13 00:00:00', NULL, 'mental', 'active'),
(24, 26, 2, 1, '2025-09-13 00:00:00', NULL, 'test', 'active'),
(25, 27, 27, 11, '2025-09-15 00:00:00', NULL, 'headache', 'active'),
(26, 28, 2, 11, '2025-09-09 00:00:00', NULL, 'sakit sa tiyan', 'active'),
(27, 29, 2, 11, '2025-09-13 00:00:00', NULL, 'allergy', 'active'),
(28, 30, 2, 11, '2025-09-13 00:00:00', NULL, 'manganak', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `patient_emergency_contact`
--

CREATE TABLE `patient_emergency_contact` (
  `contact_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(100) DEFAULT NULL,
  `relationship` varchar(100) NOT NULL,
  `mobile_number` varchar(20) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient_emergency_contact`
--

INSERT INTO `patient_emergency_contact` (`contact_id`, `patient_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `relationship`, `mobile_number`, `email`, `address`) VALUES
(1, 8, 'Mom', '', 'Non', '', 'Mother', '09161234568', '', 'SoKor'),
(2, 9, 'Chocolate', '', 'Superstix', '', 'Father', '09123849941', '', 'Villarica Road'),
(3, 10, 'Moderna', '', 'Ciga', '', 'Mother', '09123875722', 'CDO', 'CDO'),
(4, 11, 'mama', '', 'tadoy', '', 'mama', '09987654321', '', 'zone 12'),
(5, 12, 'mama', '', 'tadoy', '', 'mama', '09987654321', 'cyrus@gmail.com', 'zone 12'),
(6, 13, 'wqqweasda', 'asd', 'asdasda', '', 'adasda', '12311231233', 'adasd@gmail.com', 'safasdas'),
(7, 14, 'wqqweasda', 'asd', 'asdasda', '', 'adasda', '12311231233', 'adasd@gmail.com', 'safasdas'),
(8, 15, 'wqqweasda', 'asd', 'asdasda', '', 'adasda', '12311231233', 'aqosd@gmail.com', 'safasdas'),
(9, 16, '', '', '', '', '', '', '', ''),
(10, 21, 'Mary', '', 'Grimmie', '', 'Mother', '09123456799', '', 'us'),
(11, 22, 'test', '', 'test', '', 'Father', '09161829355', '', 'us'),
(12, 23, 'test', '', 'test', '', 'Mother', '09128475622', '', 'phil'),
(13, 24, 'Julius', '', 'Cruz', '', 'Father', '09161234555', 'father@email.com', 'Cagayan de oro city'),
(14, 25, 'mama', 'mama', 'mama', '', 'mama', '09987654321', 'mama@gmail.com', 'patag'),
(15, 26, 'papa', 'papa', 'papa', '', 'papa', '09987654321', 'papa@gmail.com', 'zone 1'),
(16, 27, 'yaya', 'l', 'akal', '', 'mother', '09187264536', 'ya.@gmail.com', 'jhyuugasvajjh'),
(17, 28, 'Lara', 'l', 'bagaya', '', 'sister', '09876584374', '', 'st.libog santa maria'),
(18, 29, '', '', '', '', '', '', '', ''),
(19, 30, 'Khen', '', 'Adora', '', 'Boyfriend', '09123456788', '', 'cdo');

-- --------------------------------------------------------

--
-- Table structure for table `patient_guardian`
--

CREATE TABLE `patient_guardian` (
  `guardian_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(100) DEFAULT NULL,
  `mobile_number` varchar(20) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `patient_guardian`
--

INSERT INTO `patient_guardian` (`guardian_id`, `patient_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `mobile_number`, `email`) VALUES
(1, 21, 'Jimmy', '', 'Grimmie', '', '09123456788', ''),
(2, 24, 'Jesse', '', 'Cruz', '', '09161234566', 'jesse@test.com');

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
-- Table structure for table `request_labtest_batch`
--

CREATE TABLE `request_labtest_batch` (
  `batch_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `request_date` datetime DEFAULT current_timestamp(),
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `cancelled_reason` text DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancelled_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_labtest_batch`
--

INSERT INTO `request_labtest_batch` (`batch_id`, `doctor_id`, `patient_id`, `admission_id`, `request_date`, `status`, `notes`, `cancelled_reason`, `cancelled_by`, `cancelled_date`) VALUES
(1, 2, 26, 24, '2025-10-11 13:28:17', 'pending', NULL, NULL, NULL, NULL),
(2, 2, 29, 27, '2025-10-11 13:29:11', 'pending', NULL, NULL, NULL, NULL),
(3, 2, 24, 22, '2025-10-11 13:38:06', 'completed', NULL, NULL, NULL, NULL),
(4, 2, 22, 20, '2025-10-11 13:47:47', 'completed', NULL, NULL, NULL, NULL),
(5, 2, 28, 26, '2025-10-13 13:52:29', 'completed', NULL, NULL, NULL, NULL),
(6, 2, 28, 26, '2025-10-13 14:02:32', 'completed', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `request_labtest_items`
--

CREATE TABLE `request_labtest_items` (
  `item_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `labtest_id` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `processed_by` int(11) DEFAULT NULL,
  `processed_date` datetime DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `billed_status` enum('no','yes') DEFAULT 'no'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_labtest_items`
--

INSERT INTO `request_labtest_items` (`item_id`, `batch_id`, `labtest_id`, `notes`, `status`, `approved_by`, `approved_date`, `processed_by`, `processed_date`, `completed_by`, `completed_date`, `billed_status`) VALUES
(1, 1, 6, '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(2, 2, 6, '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(3, 2, 5, '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(4, 3, 6, '', 'completed', NULL, NULL, 4, '2025-10-13 13:24:26', 4, '2025-10-13 13:42:14', 'yes'),
(5, 4, 1, '', 'completed', NULL, NULL, 4, '2025-10-13 13:23:50', 4, '2025-10-13 13:23:58', 'yes'),
(6, 5, 14, 'invoice test', 'completed', NULL, NULL, 4, '2025-10-13 13:53:20', 4, '2025-10-13 13:53:26', 'yes'),
(7, 6, 13, '', 'completed', NULL, NULL, 4, '2025-10-13 14:02:49', 4, '2025-10-13 14:02:53', 'no');

-- --------------------------------------------------------

--
-- Table structure for table `request_medicine_batch`
--

CREATE TABLE `request_medicine_batch` (
  `batch_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `request_date` datetime DEFAULT current_timestamp(),
  `status` enum('pending','approved','partially_dispensed','dispensed','picked','partially_picked','completed','cancelled','rejected') DEFAULT 'pending',
  `notes` text DEFAULT NULL,
  `cancelled_reason` text DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancelled_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_medicine_batch`
--

INSERT INTO `request_medicine_batch` (`batch_id`, `doctor_id`, `patient_id`, `admission_id`, `request_date`, `status`, `notes`, `cancelled_reason`, `cancelled_by`, `cancelled_date`) VALUES
(1, 2, 26, 24, '2025-09-21 07:30:08', '', NULL, NULL, NULL, NULL),
(2, 2, 26, 24, '2025-09-22 21:58:09', '', NULL, NULL, NULL, NULL),
(3, 2, 26, 24, '2025-09-22 22:26:10', 'completed', NULL, NULL, NULL, NULL),
(4, 2, 30, 28, '2025-10-03 13:52:00', 'completed', NULL, NULL, NULL, NULL),
(5, 2, 29, 27, '2025-10-03 14:06:02', '', NULL, NULL, NULL, NULL),
(6, 2, 30, 28, '2025-10-09 21:22:55', 'dispensed', NULL, NULL, NULL, NULL),
(7, 2, 24, 22, '2025-10-11 12:04:55', 'completed', NULL, NULL, NULL, NULL),
(8, 2, 21, 19, '2025-10-11 12:07:32', 'partially_dispensed', NULL, NULL, NULL, NULL),
(9, 2, 29, 27, '2025-10-11 13:29:11', 'pending', NULL, NULL, NULL, NULL),
(10, 2, 24, 22, '2025-10-11 13:38:06', 'pending', NULL, NULL, NULL, NULL),
(11, 2, 22, 20, '2025-10-11 13:47:47', 'pending', NULL, NULL, NULL, NULL),
(12, 2, 28, 26, '2025-10-13 13:52:29', '', NULL, NULL, NULL, NULL),
(13, 2, 26, 24, '2025-10-14 09:33:01', 'pending', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `request_medicine_items`
--

CREATE TABLE `request_medicine_items` (
  `item_id` int(11) NOT NULL,
  `batch_id` int(11) NOT NULL,
  `med_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `notes` text DEFAULT NULL,
  `status` enum('pending','dispensed','picked','administered','returned','returned_confirmed','cancelled') DEFAULT 'pending',
  `dispensed_by` int(11) DEFAULT NULL,
  `dispensed_date` datetime DEFAULT NULL,
  `picked_by` int(11) DEFAULT NULL,
  `picked_date` datetime DEFAULT NULL,
  `administered_by` int(11) DEFAULT NULL,
  `administered_date` datetime DEFAULT NULL,
  `returned_by` int(11) DEFAULT NULL,
  `returned_date` datetime DEFAULT NULL,
  `billed_status` enum('no','yes') DEFAULT 'no'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_medicine_items`
--

INSERT INTO `request_medicine_items` (`item_id`, `batch_id`, `med_id`, `quantity`, `notes`, `status`, `dispensed_by`, `dispensed_date`, `picked_by`, `picked_date`, `administered_by`, `administered_date`, `returned_by`, `returned_date`, `billed_status`) VALUES
(1, 1, 4, 1, 'test', 'returned', 5, '2025-10-03 14:17:59', 11, '2025-10-03 14:44:47', NULL, NULL, 11, '2025-10-09 16:57:33', 'no'),
(2, 1, 1, 2, 'test', 'returned', 5, '2025-10-03 14:17:59', 11, '2025-10-03 14:44:47', NULL, NULL, 11, '2025-10-09 16:57:33', 'no'),
(3, 2, 5, 3, 'test', 'administered', NULL, NULL, 11, '2025-10-03 14:44:55', 11, '2025-10-09 16:57:20', NULL, NULL, 'no'),
(4, 2, 11, 3, 'test', 'administered', NULL, NULL, 11, '2025-10-03 13:43:00', 11, '2025-10-09 16:57:20', NULL, NULL, 'no'),
(5, 3, 3, 1, '', 'administered', NULL, NULL, 11, '2025-10-03 14:45:13', 11, '2025-10-09 21:22:07', NULL, NULL, 'no'),
(6, 3, 6, 1, '', 'administered', NULL, NULL, 11, '2025-10-03 14:45:13', 11, '2025-10-09 21:22:07', NULL, NULL, 'no'),
(7, 3, 11, 1, '', 'returned', NULL, NULL, 11, '2025-10-03 14:45:13', NULL, NULL, 11, '2025-10-10 22:53:15', 'no'),
(8, 3, 5, 1, '', 'administered', NULL, NULL, 11, '2025-10-03 14:45:13', 11, '2025-10-10 22:53:22', NULL, NULL, 'no'),
(9, 4, 3, 2, 'testing', 'returned', NULL, NULL, 11, '2025-10-03 14:46:26', NULL, NULL, 11, '2025-10-03 14:57:39', 'no'),
(10, 4, 3, 2, 'testing again', 'administered', NULL, NULL, 11, '2025-10-03 14:56:52', 11, '2025-10-09 21:21:56', NULL, NULL, 'yes'),
(11, 5, 12, 5, '', 'administered', NULL, NULL, 11, '2025-10-03 14:56:45', 11, '2025-10-03 14:57:08', NULL, NULL, 'no'),
(12, 6, 3, 2, '', 'returned', 5, '2025-10-09 21:23:14', 11, '2025-10-09 21:24:05', NULL, NULL, 11, '2025-10-09 21:24:54', 'no'),
(13, 6, 11, 6, '', 'dispensed', 5, '2025-10-09 21:23:14', NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(14, 6, 10, 2, '', 'dispensed', 5, '2025-10-09 21:23:14', NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(15, 6, 3, 2, NULL, 'administered', 5, '2025-10-09 21:23:14', 11, '2025-10-09 21:25:03', 11, '2025-10-09 21:25:26', NULL, NULL, 'yes'),
(16, 6, 3, 1, NULL, 'returned', 5, '2025-10-09 21:23:14', 11, '2025-10-09 21:25:03', NULL, NULL, 11, '2025-10-09 21:26:11', 'no'),
(17, 7, 12, 3, 'flow', 'administered', 5, '2025-10-11 12:05:19', 11, '2025-10-11 12:05:51', 11, '2025-10-11 12:06:02', NULL, NULL, 'yes'),
(18, 7, 12, 1, NULL, 'returned', 5, '2025-10-11 12:05:19', 11, '2025-10-11 12:05:51', NULL, NULL, 11, '2025-10-11 12:06:07', 'no'),
(19, 8, 3, 1, '', 'picked', 5, '2025-10-11 12:20:18', 11, '2025-10-11 12:20:48', NULL, NULL, NULL, NULL, 'no'),
(20, 8, 3, 1, NULL, 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(21, 9, 4, 2, '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(22, 10, 7, 1, '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(23, 11, 10, 1, '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'no'),
(24, 12, 10, 1, 'invoice test', 'administered', 5, '2025-10-13 13:52:44', 11, '2025-10-13 13:52:57', 11, '2025-10-13 13:53:02', NULL, NULL, 'no'),
(25, 13, 3, 1, '', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'no');

-- --------------------------------------------------------

--
-- Table structure for table `request_notifications`
--

CREATE TABLE `request_notifications` (
  `notification_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `notification_type` enum('new_request','approved','completed','cancelled') NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `read_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_notifications`
--

INSERT INTO `request_notifications` (`notification_id`, `request_id`, `user_id`, `notification_type`, `message`, `is_read`, `created_at`, `read_at`) VALUES
(1, 1, 5, 'new_request', 'New medicine request from Dr. Ramon Reyes for John Philip', 0, '2025-09-11 02:52:29', NULL),
(2, 2, 4, 'new_request', 'New lab test request from Dr. Ramon Reyes for Rona Obs', 0, '2025-09-11 02:52:29', NULL),
(3, 3, 5, 'new_request', 'New medicine request from Dr. Melissa Garcia for Hannah Cubillan', 0, '2025-09-11 02:52:29', NULL),
(4, 4, 4, 'new_request', 'New lab test request from Dr. Ramon Reyes for Cyrus Tadoy', 0, '2025-09-11 02:52:29', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `request_service`
--

CREATE TABLE `request_service` (
  `request_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `svc_type_id` int(11) NOT NULL,
  `status` enum('Pending','In Progress','Completed','Cancelled') DEFAULT 'Pending',
  `priority` enum('Low','Medium','High') DEFAULT 'Medium',
  `created_at` datetime DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `request_surgery`
--

CREATE TABLE `request_surgery` (
  `request_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `surgery_type_id` int(11) NOT NULL,
  `scheduled_date` datetime DEFAULT NULL,
  `request_date` datetime DEFAULT current_timestamp(),
  `reason` text DEFAULT NULL,
  `status` enum('pending','approved','scheduled','in_progress','completed','cancelled') DEFAULT 'pending',
  `approved_by` int(11) DEFAULT NULL,
  `approved_date` datetime DEFAULT NULL,
  `scheduled_by` int(11) DEFAULT NULL,
  `scheduled_date_updated` datetime DEFAULT NULL,
  `completed_by` int(11) DEFAULT NULL,
  `completed_date` datetime DEFAULT NULL,
  `cancelled_by` int(11) DEFAULT NULL,
  `cancelled_date` datetime DEFAULT NULL,
  `cancelled_reason` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `request_surgery`
--

INSERT INTO `request_surgery` (`request_id`, `patient_id`, `admission_id`, `doctor_id`, `surgery_type_id`, `scheduled_date`, `request_date`, `reason`, `status`, `approved_by`, `approved_date`, `scheduled_by`, `scheduled_date_updated`, `completed_by`, `completed_date`, `cancelled_by`, `cancelled_date`, `cancelled_reason`) VALUES
(1, 26, 24, 2, 15, '2025-10-28 08:00:00', '2025-10-14 11:36:59', 'test', 'pending', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `request_therapy`
--

CREATE TABLE `request_therapy` (
  `therapy_request_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `specialty_id` int(11) NOT NULL,
  `session_count` int(11) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `therapist_id` int(11) DEFAULT NULL
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

--
-- Dumping data for table `tbl_doctor_fee`
--

INSERT INTO `tbl_doctor_fee` (`doctor_fee_id`, `admission_id`, `doctor_id`, `fee_amount`) VALUES
(1, 4, 12, 0.00);

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
(5, 'Hepatitis B Screening', 6, 1000.00, 1),
(6, 'HIV Antibody Test', 5, 1200.00, 1),
(7, 'Sputum Culture and Sensitivity', 4, 850.00, 1),
(8, 'Blood Culture', 4, 1200.00, 1),
(9, 'Fasting Blood Sugar (FBS)', 5, 250.00, 1),
(10, 'Creatinine', 5, 300.00, 1),
(11, 'SGPT (ALT)', 5, 280.00, 1),
(12, 'Typhoid IgG/IgM', 6, 650.00, 1),
(13, 'Dengue NS1', 6, 950.00, 1),
(14, 'Chest X-ray (PA View)', 7, 550.00, 1),
(15, 'Ultrasound (Whole Abdomen)', 7, 1800.00, 1),
(16, '2D Echo with Doppler', 7, 3211.00, 1),
(17, 'Sample labtest1', 1, 300.00, 0),
(18, 'sam', 5, 100.00, 1),
(19, 'sample', 5, 1000.00, 0),
(20, 'sample labtest', 5, 1000.00, 0),
(21, 'lab test 1', 3, 1000.00, 1),
(22, 'test', 10, 1000.00, 0),
(23, 'teset', 10, 100.00, 1),
(24, 'z', 10, 111.00, 0),
(25, 'zz', 4, 111.00, 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_labtest_category`
--

CREATE TABLE `tbl_labtest_category` (
  `labtest_category_id` int(11) NOT NULL,
  `labtest_category_name` varchar(100) NOT NULL,
  `labtest_category_desc` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_labtest_category`
--

INSERT INTO `tbl_labtest_category` (`labtest_category_id`, `labtest_category_name`, `labtest_category_desc`, `is_active`) VALUES
(1, 'Hematology', 'Tests related to blood and blood-forming organs', 1),
(2, 'Urinalysis', 'Tests on urine for diagnosis of kidney and urinary tract disorders', 1),
(3, 'zzzz', 'a', 0),
(4, 'Microbiology', 'Culture and sensitivity tests for infection detection', 1),
(5, 'Biochemistry', 'Blood chemistry for liver, kidney, and metabolic function', 1),
(6, 'Serology', 'Blood serum tests for disease detection', 1),
(7, 'Imaging', 'Diagnostic radiology and scans', 1),
(8, 'test', 'test', 0),
(9, 'Toxicology', 'Drug screening, poisoning, and toxic substance detection', 1),
(10, 'Allergy Testing', 'Evaluation of allergic reactions via IgE or allergen-specific tests', 1),
(11, 'Histopathology', 'Microscopic examination of tissue samples from biopsy or surgery', 1),
(12, 'Cytology', 'Examination of cells for abnormalities, such as Pap smear', 1),
(13, 'Virology', 'Detection and quantification of viral infections', 0),
(14, 'Genetic Testing', 'Analysis of genetic material for inherited or chromosomal disorders', 1),
(15, 'xxxxxxx', 'description', 0),
(16, 'Endocrinology', 'Tests for hormone levels and endocrine gland function', 1),
(17, 'Arterial Blood Gas Analysis', 'Measures oxygen, carbon dioxide, and acid-base status in the blood', 1),
(18, 'testest', 'desc', 0),
(19, 'xxxx', 'test', 0),
(20, 'sample', 'sample', 0),
(21, 'samsam', 'descr', 0),
(22, 'test3', 'desc', 0),
(23, 'test5', 'desc', 0),
(24, 'test4', 'ss', 0),
(25, 'test6', 'ss', 0),
(26, 'test7', '11', 0),
(27, 'xx', 'ss', 0),
(28, 'x', 'a', 0),
(29, 'zzzzz', 'a', 0),
(30, 'zzz', 'a', 0),
(31, 'z', 'This is one', 0),
(32, 'zz', '2', 0),
(33, 'testtest', 'test', 0),
(34, 'xxx', '1', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine`
--

CREATE TABLE `tbl_medicine` (
  `med_id` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `med_name` varchar(100) NOT NULL,
  `med_type_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `unit_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine`
--

INSERT INTO `tbl_medicine` (`med_id`, `unit_price`, `med_name`, `med_type_id`, `is_active`, `unit_id`) VALUES
(1, 8.50, 'Amoxicillin', 1, 1, 1),
(2, 18.00, 'Cefuroxime', 1, 1, 1),
(3, 2.50, 'Paracetamol', 2, 1, 1),
(4, 4.00, 'Ibuprofen', 2, 1, 1),
(5, 5.00, 'Mefenamic Acid', 2, 1, 1),
(6, 10.00, 'Aluminum Hydroxide', 4, 1, 1),
(7, 6.50, 'Cetirizine', 5, 1, 1),
(8, 25.00, 'Povidone Iodine', 6, 1, 1),
(9, 15.00, 'Salbutamol', 7, 1, 1),
(10, 12.00, 'Acyclovir', 8, 1, 6),
(11, 5.00, 'Metformin', 3, 1, 1),
(12, 5.00, 'Omeprazole', 4, 1, 1),
(13, 25.00, 'test22', 1, 0, 1),
(14, 10.00, 'test', 2, 0, 1),
(15, 10.00, 'sample', 7, 0, 1),
(16, 10.00, 'sample2', 4, 0, 1),
(17, 11.00, 'sample3', 1, 0, 1),
(18, 11.00, 'z', 37, 0, 5),
(19, 1.00, 'testtesttest', 2, 0, 4),
(20, 12.00, 'zz', 4, 0, 3),
(21, 111.00, 'zzz', 37, 0, 7),
(22, 12.00, 'zzzz', 25, 0, 3),
(23, 11.00, 'zzzzz', 12, 0, 2),
(24, 11.00, 'x', 1, 0, 6),
(25, 11.00, 'xx', 37, 0, 4),
(26, 7.00, 'xxx', 1, 0, 4);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine_type`
--

CREATE TABLE `tbl_medicine_type` (
  `med_type_id` int(11) NOT NULL,
  `med_type_name` varchar(100) NOT NULL,
  `description` varchar(100) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine_type`
--

INSERT INTO `tbl_medicine_type` (`med_type_id`, `med_type_name`, `description`, `is_active`) VALUES
(1, 'Antibiotic', 'Used to treat bacterial infections', 1),
(2, 'Analgesic', 'Used to relieve pain', 1),
(3, 'Antipyretic', 'Reduces fever', 1),
(4, 'Antacid', 'Neutralizes stomach acid', 1),
(5, 'Antihistamine', 'Used for allergy relief', 1),
(6, 'Antiseptic', 'Prevents wound infections', 1),
(7, 'Bronchodilator', 'Opens airways for easier breathing', 1),
(8, 'Antiviral', 'Treats viral infections', 1),
(9, 'test', 'desc', 0),
(10, 'IV Fluids', 'Sterile intravenous solutions for hydration and electrolyte balance', 1),
(11, 'Antidiabetics', 'Medicines for controlling blood sugar levels in diabetic patients', 1),
(12, 'Anticoagulants', 'Drugs that prevent or reduce blood clotting', 1),
(13, 'Antidepressants', 'Medicines used to treat depression and mood disorders', 1),
(14, 'Corticosteroids', 'Medicines that reduce inflammation and immune response', 1),
(15, 'Anticonvulsants', 'Drugs that help prevent and control seizures', 1),
(16, 'Vitamins & Supplements', 'Essential nutrients and supplements for health', 1),
(17, 'Topical Preparations', 'Creams, ointments, gels applied to the skin for local effect', 1),
(18, 'Antimalarials', 'Drugs for the prevention and treatment of malaria', 1),
(19, 'Chemotherapy Agents', 'Medicines used in cancer treatment', 1),
(20, 'Sedatives & Anxiolytics', 'Medicines for sedation and anxiety relief', 1),
(21, 'Vaccines', 'Biological preparations providing immunity against diseases', 1),
(22, 'Antifungals', 'Medicines used to treat fungal infections', 1),
(23, 'Antivirals', 'Drugs for treating viral infections', 1),
(24, 'Antipsychotics', 'Medicines used to manage psychosis, including schizophrenia and bipolar disorder', 1),
(25, 'Antiemetics', 'Drugs that help prevent or treat nausea and vomiting', 1),
(26, 'Anthelmintics', 'Medicines that treat worm and parasite infections', 1),
(27, 'Immunosuppressants', 'Medicines that reduce immune system activity, often used in organ transplant patients', 1),
(28, 'Ophthalmic Preparations', 'Eye drops and ointments for eye conditions', 1),
(29, 'Otic Preparations', 'Ear drops and medicines for treating ear infections', 1),
(30, 'Dermatologicals', 'Medicines specifically used for skin conditions', 1),
(31, 'Nutritional Formulas', 'Medical nutrition and feeding supplements', 1),
(32, 'Respiratory Drugs', 'Other non-bronchodilator respiratory medicines like mucolytics and expectorants', 1),
(33, 'Gastrointestinal Drugs', 'Laxatives, antidiarrheals, and motility agents', 1),
(34, 'Hormones', 'Endocrine-related drugs like insulin, thyroid hormone, estrogen', 1),
(35, 'Reproductive Health Drugs', 'Contraceptives, fertility treatments, pregnancy-related drugs', 1),
(36, 'Emergency Drugs', 'Critical drugs used in ER and ICU, such as epinephrine, atropine', 1),
(37, 'Anesthetics', 'Local and general anesthetic agents used during procedures', 1),
(38, '1', '1', 0),
(39, '2', '2', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_medicine_unit`
--

CREATE TABLE `tbl_medicine_unit` (
  `unit_id` int(11) NOT NULL,
  `unit_name` varchar(50) NOT NULL,
  `description` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_medicine_unit`
--

INSERT INTO `tbl_medicine_unit` (`unit_id`, `unit_name`, `description`) VALUES
(1, 'Tablet', 'Solid oral dose form'),
(2, 'Capsule', 'Gelatin or cellulose enclosed dose'),
(3, 'mL', 'Liquid medicine measured in milliliters'),
(4, 'Vial', 'Liquid medicine in small glass container'),
(5, 'Ampoule', 'Sealed glass container for injections'),
(6, 'Bottle', 'Liquid medicine container'),
(7, 'Tube', 'Ointments, creams, or gels');

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
(9, 'ER1', 5, 1500.00, 1, 1),
(10, 'test3', 2, 1000.00, 2, 1),
(11, 'sample', 5, 1000.00, 2, 1),
(12, 'sample2', 5, 1000.00, 1, 0),
(13, '1', 1, 1111.00, 1, 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_room_stay`
--

CREATE TABLE `tbl_room_stay` (
  `room_stay_id` int(11) NOT NULL,
  `admission_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `charge` decimal(10,2) NOT NULL,
  `assigned_by` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_room_stay`
--

INSERT INTO `tbl_room_stay` (`room_stay_id`, `admission_id`, `room_id`, `start_date`, `end_date`, `charge`, `assigned_by`) VALUES
(1, 6, 13, '2025-09-05', NULL, 0.00, 1),
(2, 7, 13, '2025-09-05', NULL, 0.00, 1),
(3, 8, 1, '2025-09-05', NULL, 0.00, 11),
(4, 9, 5, '2025-09-06', NULL, 0.00, 1),
(5, 10, 5, '2025-09-06', NULL, 0.00, 1),
(6, 11, 6, '2025-09-06', NULL, 0.00, 11),
(7, 12, 6, '2025-09-06', NULL, 0.00, 11),
(8, 13, 3, '2025-09-06', NULL, 0.00, 11),
(9, 19, 2, '2025-09-10', NULL, 0.00, 1),
(10, 20, 3, '2025-09-10', NULL, 0.00, 1),
(11, 21, 5, '2025-09-10', NULL, 0.00, 1),
(12, 22, 10, '2025-09-12', NULL, 0.00, 1),
(13, 24, 10, '2025-09-13', NULL, 0.00, 1),
(14, 25, 4, '2025-09-13', NULL, 0.00, 11),
(15, 26, 4, '2025-09-13', NULL, 0.00, 11),
(16, 28, 6, '2025-09-13', NULL, 0.00, 11);

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
(5, 'Emergency Holding', 'Temporary room while awaiting full admissions', 1),
(6, 'test', 'test', 0),
(7, '1', '1', 0),
(8, '2', '2', 0);

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
(11, 'Rhinoplasty', 8, 60000.00, 1),
(12, 'Hernia Repair', 1, 15000.00, 1),
(13, 'test4', 3, 10000.00, 0),
(15, 'test', 3, 10000.00, 1),
(16, 'test2', 3, 10000.00, 1),
(17, '1', 6, 2222.00, 1);

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
  `description` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_surgery_type`
--

INSERT INTO `tbl_surgery_type` (`surgery_type_id`, `surgery_type_name`, `description`, `is_active`) VALUES
(1, 'General Surgery', 'Procedures involving abdominal organs and soft tissue', 1),
(2, 'Orthopedic Surgery', 'Procedures involving bones, joints, and ligaments', 1),
(3, 'Cardiac Surgery', 'Heart-related surgical procedures', 1),
(4, 'Neurosurgery', 'Surgical treatment of brain and nervous system disorders', 1),
(5, 'ENT Surgery', 'Surgery of the ear, nose, and throat', 1),
(6, 'OB-GYN Surgery', 'Gynecological and obstetric surgical procedures', 1),
(7, 'Urologic Surgery', 'Procedures involving urinary tract and male reproductive organs', 1),
(8, 'Plastic Surgery', 'Reconstructive or cosmetic surgical procedures', 1),
(9, 'Pediatric Surgery', 'Surgeries specifically performed on infants and children', 1),
(10, 'Vascular Surgery', 'Surgeries involving arteries, veins, and lymphatic circulation', 1),
(11, 'Maxillofacial Surgery', 'Surgeries of the face, jaw, and mouth, often dental-related', 1),
(12, 'Oncologic Surgery', 'Surgeries for cancer diagnosis, staging, and treatment', 1),
(13, 'Transplant Surgery', 'Organ transplant operations such as kidney or liver transplant', 1),
(14, 'Emergency / Trauma Surgery', 'Surgeries for trauma patients including internal bleeding and wound repair', 1),
(15, '1', '1', 0),
(16, '2', '2', 0);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_treatment`
--

CREATE TABLE `tbl_treatment` (
  `treatment_id` int(11) NOT NULL,
  `treatment_name` varchar(100) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `treatment_category_id` int(11) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_treatment`
--

INSERT INTO `tbl_treatment` (`treatment_id`, `treatment_name`, `unit_price`, `treatment_category_id`, `is_active`) VALUES
(1, 'Physical Therapy Session', 600.00, 1, 1),
(2, 'Hot Pack Therapy', 200.00, 1, 1),
(3, 'Ultrasound Therapy', 350.00, 1, 1),
(4, 'Occupational Therapy Evaluation', 800.00, 2, 1),
(5, 'Hand Function Training', 500.00, 2, 1),
(6, 'Nebulization', 250.00, 3, 1),
(7, 'Oxygen Therapy (30 mins)', 300.00, 3, 1),
(8, 'Wound Cleaning', 300.00, 4, 1),
(9, 'Dressing Change', 200.00, 4, 1),
(10, 'Hemodialysis (Per Session)', 4000.00, 5, 1),
(11, 'Peritoneal Dialysis', 4500.00, 5, 1),
(12, 'Individual Counseling', 800.00, 6, 1),
(13, 'Psychiatric Evaluation', 1200.00, 6, 1),
(14, 'sampple treatment', 10000.00, 6, 1),
(15, 'test', 100.00, 7, 1),
(16, '1', 222.00, 5, 1);

-- --------------------------------------------------------

--
-- Table structure for table `tbl_treatment_category`
--

CREATE TABLE `tbl_treatment_category` (
  `treatment_category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tbl_treatment_category`
--

INSERT INTO `tbl_treatment_category` (`treatment_category_id`, `category_name`, `description`, `is_active`) VALUES
(1, 'Physical Therapy', 'Restores mobility and function through exercise and manual therapy', 1),
(2, 'Occupational Therapy', 'Improves daily living and work skills through rehabilitation', 1),
(3, 'Respiratory Therapy', 'Treats breathing issues and lung function', 1),
(4, 'Wound Care', 'Cleaning, dressing, and managing wounds', 1),
(5, 'Dialysis', 'Blood filtration for kidney failure', 1),
(6, 'Counseling', 'Mental health support and therapy sessions', 1),
(7, 'test', 'test', 0),
(8, '1', '1', 0),
(9, '2', '2', 0),
(10, '3', '3', 0);

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
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `mobile_number` varchar(20) DEFAULT NULL,
  `role_id` int(11) NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `password`, `email`, `mobile_number`, `role_id`, `status`) VALUES
(1, 'admin1', 'admin123', 'admin@email.com', '', 1, 1),
(2, 'doctor1', 'doctor123', 'doctor@email.com', '', 2, 1),
(4, 'technician1', 'technician123', 'technician@email.com', '', 5, 1),
(5, 'pharmacist1', 'pharmacist123', 'pharmacist@email.com', '', 6, 1),
(7, 'therapist1', 'therapist123', 'therapist@email.com', '', 7, 1),
(8, 'cashier1', 'cashier123', 'cashier@email.com', '', 8, 1),
(9, 'biller1', 'biller123', 'biller@email.com', NULL, 9, 1),
(11, 'er1', 'er123', 'er@email.com', '', 4, 1),
(12, 'doctor1st', 'pass1223', 'doc@email.com', '', 2, 1),
(27, 'castro.d', 'castro123', 'c.doctor@email.com', '09161883904', 2, 1),
(30, 'joy.n', 'joy123', '', '', 4, 1),
(32, 'thera', 'therapassword', 'cc', '', 7, 1),
(34, 'pharm', 'pharma123', 'pharm@mail.com', '091234556', 6, 1),
(37, 'test', 'test123', 'testmail@email.com', '09849377482', 2, 1),
(40, 'test2', 'test123', 'aa@email.com', '', 2, 1),
(42, 'doc.bautista', 'doctor123', NULL, NULL, 2, 1),
(43, 'nursetest', 'test123', NULL, NULL, 4, 1),
(44, 'testlab', 'test123', 'labemail@email.com', NULL, 5, 1),
(45, 'testpharm', 'test123', NULL, NULL, 6, 1),
(46, 'testther', 'test123', NULL, NULL, 7, 1),
(47, 'testcash', 'test123', NULL, NULL, 8, 1),
(48, 'testbill', 'test123', NULL, NULL, 9, 1),
(50, 'testRefactor', 'test123', 'testref@email.com', NULL, 4, 1),
(51, 'mergeTest', 'test123', NULL, NULL, 2, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_billing_officer`
--

CREATE TABLE `user_billing_officer` (
  `billing_officer_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(50) DEFAULT NULL,
  `employee_number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_billing_officer`
--

INSERT INTO `user_billing_officer` (`billing_officer_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `employee_number`) VALUES
(1, 9, 'Billy', '', 'Eilish', 'II', NULL),
(2, 48, 'Biller', '', 'Billing', '', '12345');

-- --------------------------------------------------------

--
-- Table structure for table `user_cashier`
--

CREATE TABLE `user_cashier` (
  `cashier_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(50) DEFAULT NULL,
  `employee_number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_cashier`
--

INSERT INTO `user_cashier` (`cashier_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `employee_number`) VALUES
(1, 8, 'Cashew', 'Nut', 'Dela Cruz', '', ''),
(2, 47, 'Cashier', '', 'Cash', '', '1234');

-- --------------------------------------------------------

--
-- Table structure for table `user_doctor`
--

CREATE TABLE `user_doctor` (
  `doctor_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `specialty_id` int(11) NOT NULL,
  `suffix` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_doctor`
--

INSERT INTO `user_doctor` (`doctor_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `license_number`, `specialty_id`, `suffix`) VALUES
(1, 2, 'Ramon', NULL, 'Reyes', NULL, 1, NULL),
(2, 12, 'Melissa', NULL, 'Garcia', NULL, 2, NULL),
(3, 27, 'Mike', '', 'Castro', 'cc11', 2, 'III'),
(4, 37, 'test', 'mid', 'last', '11', 12, 'III'),
(5, 40, 'Doctor', '', 'Last', '11', 2, ''),
(6, 42, 'Raymund', '', 'Bautista', '41', 20, ''),
(7, 51, 'Marge', '', 'Doctor', '123456', 9, '');

-- --------------------------------------------------------

--
-- Table structure for table `user_doctor_specialty`
--

CREATE TABLE `user_doctor_specialty` (
  `specialty_id` int(11) NOT NULL,
  `specialty_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_doctor_specialty`
--

INSERT INTO `user_doctor_specialty` (`specialty_id`, `specialty_name`, `description`, `is_active`) VALUES
(1, 'General Practitioner', 'Provides primary care and general medical services', 1),
(2, 'Internal Medicine', 'Manages adult diseases and chronic medical conditions', 1),
(3, 'Pediatrics', 'Specializes in the medical care of infants, children, and adolescents', 1),
(4, 'Obstetrics & Gynecology', 'Focuses on women’s reproductive health, pregnancy, and childbirth', 1),
(5, 'Surgery', 'Performs general surgical operations such as appendectomy, hernia repair', 1),
(6, 'Orthopedics', 'Specializes in musculoskeletal system surgeries and treatments', 1),
(7, 'Cardiology', 'Manages heart and cardiovascular diseases', 1),
(8, 'Neurology', 'Diagnoses and treats brain and nervous system disorders', 1),
(9, 'Neurosurgery', 'Performs surgical operations on the brain and spinal cord', 1),
(10, 'ENT', 'Treats diseases and surgeries of the ear, nose, and throat', 1),
(11, 'Ophthalmology', 'Specializes in eye care and eye surgeries', 1),
(12, 'Urology', 'Focuses on urinary tract and male reproductive system diseases', 1),
(13, 'Dermatology', 'Manages skin diseases and cosmetic dermatologic procedures', 1),
(14, 'Psychiatry', 'Treats mental health disorders and behavioral conditions', 1),
(15, 'Radiology', 'Interprets imaging studies such as X-rays, CT scans, and MRIs', 1),
(16, 'Anesthesiology', 'Administers anesthesia and manages patient pain during surgeries', 1),
(17, 'Emergency Medicine', 'Provides urgent and emergency medical care', 1),
(18, 'Oncology', 'Specializes in cancer treatment and management', 1),
(19, 'Pathology', 'Analyzes lab tests and tissue samples for diagnosis', 1),
(20, 'Family Medicine', 'Delivers comprehensive care for families across all ages', 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_labtech_department`
--

CREATE TABLE `user_labtech_department` (
  `department_id` int(11) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_labtech_department`
--

INSERT INTO `user_labtech_department` (`department_id`, `department_name`, `description`, `is_active`) VALUES
(1, 'Hematology', 'Blood analysis and blood disorder testing', 1),
(2, 'Clinical Chemistry', 'Analysis of blood serum, plasma, and other fluids', 1),
(3, 'Microbiology', 'Culture and identification of bacteria, viruses, and fungi', 1),
(4, 'Immunology/Serology', 'Tests related to immune system and antibodies', 1),
(5, 'Pathology', 'Examination of tissues and biopsy samples', 1),
(6, 'Radiology/Imaging', 'X-rays, CT, MRI, and ultrasound imaging', 1),
(7, 'Histopathology', 'Microscopic examination of tissues for disease', 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_lab_technician`
--

CREATE TABLE `user_lab_technician` (
  `technician_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(50) DEFAULT NULL,
  `license_number` varchar(50) NOT NULL,
  `department_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_lab_technician`
--

INSERT INTO `user_lab_technician` (`technician_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `license_number`, `department_id`) VALUES
(1, 4, 'lab_f', 'lab_mid', 'lab_l', '', '', 1),
(2, 44, 'test', NULL, 'lab', NULL, '123', 4);

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
-- Table structure for table `user_nurse`
--

CREATE TABLE `user_nurse` (
  `nurse_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(50) DEFAULT NULL,
  `license_number` varchar(50) NOT NULL,
  `department_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_nurse`
--

INSERT INTO `user_nurse` (`nurse_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `license_number`, `department_id`) VALUES
(1, 11, 'er_f', 'er_mid', 'er_l', '', '', 1),
(4, 30, 'Joy', '', 'Batolata', '', 'aaa', 5),
(5, 43, 'test', '', 'nurse', '', '111', 4),
(6, 50, 'ref', NULL, 'tor', NULL, '12345', 5);

-- --------------------------------------------------------

--
-- Table structure for table `user_nurse_department`
--

CREATE TABLE `user_nurse_department` (
  `department_id` int(11) NOT NULL,
  `department_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_nurse_department`
--

INSERT INTO `user_nurse_department` (`department_id`, `department_name`, `description`, `is_active`) VALUES
(1, 'Emergency Room (ER)', 'Handles emergency and urgent patient admissions', 1),
(2, 'Intensive Care Unit (ICU)', 'Provides care for critically ill patients', 1),
(3, 'Pediatrics', 'Cares for infants, children, and adolescents', 1),
(4, 'Medical Ward', 'General ward for admitted medical patients', 1),
(5, 'Surgical Ward', 'Ward for post-operative and surgical patients', 1),
(6, 'Obstetrics and Gynecology (OB-GYN)', 'Care for mothers and newborns', 1),
(7, 'Outpatient Department (OPD)', 'Manages non-admitted patients for consultations and minor procedures', 1),
(8, 'Operating Room (OR)', 'Specialized area for surgical operations', 1);

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
(13, 'approve_insurance', 'Approve Insurance Claims', 'Review and approve submitted insurance claims'),
(14, 'manage_room_types', 'Mange Room Types', 'Create or modify room type details'),
(15, 'manage_surgery_types', 'Mange Surgery Types', 'Create or modify surgery type details'),
(18, 'manage_treatment_types', 'Mange Treatment Types', 'Create or modify treatment type details'),
(19, 'manage_labtest_types', 'Mange Labtest Types', 'Create or modify labtest type details'),
(20, 'manage_medicine_types', 'Mange Medicine Types', 'Create or modify medicine type details'),
(21, 'admin_dashboard', 'Administrator Dashboard', 'Display admin related statistics'),
(22, 'biller_dashboard', 'Biller Dashboard', 'Display billing related statistics'),
(23, 'lab_dashboard', 'Laboratory Dashboard', 'Display laboratory related statistics'),
(24, 'nurse_dashboard', 'Nurse Dashboard', 'Display nurse related statistics'),
(25, 'pharmacist_dashboard', 'Pharmacist Dashboard', 'Display pharmacist related statistics'),
(26, 'cashier_dashboard', 'Cashier Dashboard', 'Display cashier related statistics'),
(27, 'doctor_requests', 'Doctor Requests', 'Create and view service requests'),
(28, 'doctor_my_patients', 'My Patients', 'Display all patients assigned to doctor'),
(30, 'medicine_management', 'Medicine Management', 'Module to perform medicine pickup/administering/returning'),
(31, 'doctor_dashboard', 'Doctor Dashboard', 'Display doctor related statistics'),
(32, 'medicine_requests', 'Medicine Requests', 'Manage medicine requests from doctor.'),
(33, 'labtest_management', 'Lab Test Management', 'Module to perform test confirmation and completion.');

-- --------------------------------------------------------

--
-- Table structure for table `user_pharmacist`
--

CREATE TABLE `user_pharmacist` (
  `pharmacist_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(150) DEFAULT NULL,
  `license_number` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_pharmacist`
--

INSERT INTO `user_pharmacist` (`pharmacist_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `license_number`) VALUES
(1, 5, 'pharma_f', 'pharma_mid', 'pharma_l', '', ''),
(3, 34, 'Dante', NULL, 'Aug', NULL, 'sss'),
(4, 45, 'test', '', 'pharma', '', '113');

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
(4, 'Nurse', '8'),
(5, 'Lab Technician', '7'),
(6, 'Pharmacist', '7'),
(7, 'Therapist', '7'),
(8, 'Cashier', '6'),
(9, 'Billing Staff', '6');

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
(1, 5, 1),
(1, 6, 1),
(1, 7, 1),
(1, 8, 1),
(1, 9, 1),
(1, 10, 1),
(1, 11, 1),
(1, 14, 1),
(1, 15, 1),
(1, 18, 1),
(1, 19, 1),
(1, 20, 1),
(1, 21, 1),
(2, 27, 1),
(2, 31, 1),
(4, 5, 1),
(4, 30, 1),
(5, 9, 1),
(5, 23, 1),
(5, 33, 1),
(6, 8, 1),
(6, 25, 1),
(6, 32, 1),
(7, 11, 1),
(8, 6, 1),
(8, 7, 1),
(9, 6, 1),
(9, 7, 1);

-- --------------------------------------------------------

--
-- Table structure for table `user_therapist`
--

CREATE TABLE `user_therapist` (
  `therapist_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `suffix` varchar(50) DEFAULT NULL,
  `license_number` varchar(50) DEFAULT NULL,
  `specialty_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_therapist`
--

INSERT INTO `user_therapist` (`therapist_id`, `user_id`, `first_name`, `middle_name`, `last_name`, `suffix`, `license_number`, `specialty_id`) VALUES
(1, 7, 'therapist_f', 'therapist_m', 'therapist_l', NULL, NULL, 1),
(2, 32, 'Threa', 'Ther', 'Therapist', '', '', 10),
(3, 46, 'test', '', 'therapist', '', '123', 9);

-- --------------------------------------------------------

--
-- Table structure for table `user_therapist_specialty`
--

CREATE TABLE `user_therapist_specialty` (
  `specialty_id` int(11) NOT NULL,
  `specialty_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_therapist_specialty`
--

INSERT INTO `user_therapist_specialty` (`specialty_id`, `specialty_name`, `description`, `is_active`) VALUES
(1, 'Physical Therapy', 'Rehabilitation to improve strength, mobility, and physical function', 1),
(2, 'Occupational Therapy', 'Helps patients regain the ability to perform daily tasks and activities', 1),
(3, 'Speech Therapy', 'Assessment and treatment of speech, language, and swallowing disorders', 1),
(4, 'Respiratory Therapy', 'Treatment and support for patients with breathing or lung issues', 1),
(5, 'Cardiac Rehabilitation Therapy', 'Therapy for patients recovering from heart surgery or heart conditions', 1),
(6, 'Neurorehabilitation Therapy', 'Rehabilitation for patients with neurological disorders such as stroke or spinal cord injury', 1),
(7, 'Pediatric Therapy', 'Therapy specialized for children with developmental or physical challenges', 1),
(8, 'Geriatric Therapy', 'Rehabilitation focused on elderly patients to improve independence and quality of life', 1),
(9, 'Sports Therapy', 'Injury prevention and rehabilitation for athletes and physically active individuals', 1),
(10, 'Hand Therapy', 'Specialized rehabilitation for hand and upper limb injuries or post-surgery recovery', 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bill_invoice`
--
ALTER TABLE `bill_invoice`
  ADD PRIMARY KEY (`invoice_id`),
  ADD KEY `invoice_fk_1` (`admission_id`),
  ADD KEY `invoice_fk_2` (`created_by`),
  ADD KEY `fk_patient` (`patient_id`);

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
  ADD KEY `fk_admission_2` (`admitted_by`),
  ADD KEY `fk_admission_doctor` (`doctor_id`);

--
-- Indexes for table `patient_emergency_contact`
--
ALTER TABLE `patient_emergency_contact`
  ADD PRIMARY KEY (`contact_id`),
  ADD KEY `fk_emergency_patient` (`patient_id`);

--
-- Indexes for table `patient_guardian`
--
ALTER TABLE `patient_guardian`
  ADD PRIMARY KEY (`guardian_id`),
  ADD KEY `fk_guardian_patient` (`patient_id`);

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
-- Indexes for table `request_labtest_batch`
--
ALTER TABLE `request_labtest_batch`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `admission_id` (`admission_id`),
  ADD KEY `fk_cancelled_by` (`cancelled_by`);

--
-- Indexes for table `request_labtest_items`
--
ALTER TABLE `request_labtest_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `batch_id` (`batch_id`),
  ADD KEY `labtest_id` (`labtest_id`),
  ADD KEY `approved_by` (`approved_by`),
  ADD KEY `processed_by` (`processed_by`),
  ADD KEY `completed_by` (`completed_by`);

--
-- Indexes for table `request_medicine_batch`
--
ALTER TABLE `request_medicine_batch`
  ADD PRIMARY KEY (`batch_id`),
  ADD KEY `fk_batch_doctor` (`doctor_id`),
  ADD KEY `fk_batch_patient` (`patient_id`),
  ADD KEY `fk_batch_admission` (`admission_id`),
  ADD KEY `fk_items_cancelled_by` (`cancelled_by`);

--
-- Indexes for table `request_medicine_items`
--
ALTER TABLE `request_medicine_items`
  ADD PRIMARY KEY (`item_id`),
  ADD KEY `fk_item_batch` (`batch_id`),
  ADD KEY `fk_item_medicine` (`med_id`),
  ADD KEY `fk_items_dispensed_by` (`dispensed_by`),
  ADD KEY `fk_items_picked_by` (`picked_by`),
  ADD KEY `fk_items_administered_by` (`administered_by`),
  ADD KEY `fk_items_returned_by` (`returned_by`);

--
-- Indexes for table `request_notifications`
--
ALTER TABLE `request_notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `fk_notifications_user` (`user_id`),
  ADD KEY `idx_is_read` (`is_read`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `request_service`
--
ALTER TABLE `request_service`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `doctor_id` (`doctor_id`),
  ADD KEY `patient_id` (`patient_id`),
  ADD KEY `svc_type_id` (`svc_type_id`);

--
-- Indexes for table `request_surgery`
--
ALTER TABLE `request_surgery`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_request_surgery_patient` (`patient_id`),
  ADD KEY `fk_request_surgery_admission` (`admission_id`),
  ADD KEY `fk_request_surgery_doctor` (`doctor_id`),
  ADD KEY `fk_request_surgery_surgery_type` (`surgery_type_id`),
  ADD KEY `fk_request_surgery_approved_by` (`approved_by`),
  ADD KEY `fk_request_surgery_scheduled_by` (`scheduled_by`),
  ADD KEY `fk_request_surgery_completed_by` (`completed_by`),
  ADD KEY `fk_request_surgery_cancelled_by` (`cancelled_by`);

--
-- Indexes for table `request_therapy`
--
ALTER TABLE `request_therapy`
  ADD PRIMARY KEY (`therapy_request_id`),
  ADD KEY `specialty_id` (`specialty_id`),
  ADD KEY `therapist_id` (`therapist_id`);

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
-- Indexes for table `tbl_medicine`
--
ALTER TABLE `tbl_medicine`
  ADD PRIMARY KEY (`med_id`),
  ADD KEY `fk_medicine_1` (`med_type_id`),
  ADD KEY `fk_medicine_unit` (`unit_id`);

--
-- Indexes for table `tbl_medicine_type`
--
ALTER TABLE `tbl_medicine_type`
  ADD PRIMARY KEY (`med_type_id`);

--
-- Indexes for table `tbl_medicine_unit`
--
ALTER TABLE `tbl_medicine_unit`
  ADD PRIMARY KEY (`unit_id`),
  ADD UNIQUE KEY `unit_name` (`unit_name`);

--
-- Indexes for table `tbl_room`
--
ALTER TABLE `tbl_room`
  ADD PRIMARY KEY (`room_id`),
  ADD KEY `fk_room_1` (`room_type_id`);

--
-- Indexes for table `tbl_room_stay`
--
ALTER TABLE `tbl_room_stay`
  ADD PRIMARY KEY (`room_stay_id`),
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
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `fk_users_1` (`role_id`);

--
-- Indexes for table `user_billing_officer`
--
ALTER TABLE `user_billing_officer`
  ADD PRIMARY KEY (`billing_officer_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `employee_number` (`employee_number`);

--
-- Indexes for table `user_cashier`
--
ALTER TABLE `user_cashier`
  ADD PRIMARY KEY (`cashier_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `employee_number` (`employee_number`);

--
-- Indexes for table `user_doctor`
--
ALTER TABLE `user_doctor`
  ADD PRIMARY KEY (`doctor_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `specialty_id` (`specialty_id`);

--
-- Indexes for table `user_doctor_specialty`
--
ALTER TABLE `user_doctor_specialty`
  ADD PRIMARY KEY (`specialty_id`);

--
-- Indexes for table `user_labtech_department`
--
ALTER TABLE `user_labtech_department`
  ADD PRIMARY KEY (`department_id`),
  ADD UNIQUE KEY `department_name` (`department_name`);

--
-- Indexes for table `user_lab_technician`
--
ALTER TABLE `user_lab_technician`
  ADD PRIMARY KEY (`technician_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `license_number` (`license_number`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `user_log`
--
ALTER TABLE `user_log`
  ADD PRIMARY KEY (`login_id`),
  ADD KEY `fk_log_1` (`user_id`);

--
-- Indexes for table `user_nurse`
--
ALTER TABLE `user_nurse`
  ADD PRIMARY KEY (`nurse_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `license_number` (`license_number`),
  ADD KEY `department_id` (`department_id`);

--
-- Indexes for table `user_nurse_department`
--
ALTER TABLE `user_nurse_department`
  ADD PRIMARY KEY (`department_id`),
  ADD UNIQUE KEY `department_name` (`department_name`);

--
-- Indexes for table `user_permission`
--
ALTER TABLE `user_permission`
  ADD PRIMARY KEY (`permission_id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `user_pharmacist`
--
ALTER TABLE `user_pharmacist`
  ADD PRIMARY KEY (`pharmacist_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD UNIQUE KEY `license_number` (`license_number`);

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
-- Indexes for table `user_therapist`
--
ALTER TABLE `user_therapist`
  ADD PRIMARY KEY (`therapist_id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `specialty_id` (`specialty_id`);

--
-- Indexes for table `user_therapist_specialty`
--
ALTER TABLE `user_therapist_specialty`
  ADD PRIMARY KEY (`specialty_id`),
  ADD UNIQUE KEY `specialty_name` (`specialty_name`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bill_invoice`
--
ALTER TABLE `bill_invoice`
  MODIFY `invoice_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `bill_invoice_items`
--
ALTER TABLE `bill_invoice_items`
  MODIFY `invo_item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `bill_payment`
--
ALTER TABLE `bill_payment`
  MODIFY `payment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `bill_payment_method`
--
ALTER TABLE `bill_payment_method`
  MODIFY `payment_method_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

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
  MODIFY `patient_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT for table `patient_admission`
--
ALTER TABLE `patient_admission`
  MODIFY `admission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `patient_emergency_contact`
--
ALTER TABLE `patient_emergency_contact`
  MODIFY `contact_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT for table `patient_guardian`
--
ALTER TABLE `patient_guardian`
  MODIFY `guardian_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `patient_treatment`
--
ALTER TABLE `patient_treatment`
  MODIFY `patient_treatment_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `request_labtest_batch`
--
ALTER TABLE `request_labtest_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `request_labtest_items`
--
ALTER TABLE `request_labtest_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `request_medicine_batch`
--
ALTER TABLE `request_medicine_batch`
  MODIFY `batch_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `request_medicine_items`
--
ALTER TABLE `request_medicine_items`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `request_notifications`
--
ALTER TABLE `request_notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `request_service`
--
ALTER TABLE `request_service`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `request_surgery`
--
ALTER TABLE `request_surgery`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `request_therapy`
--
ALTER TABLE `request_therapy`
  MODIFY `therapy_request_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_coverage_type`
--
ALTER TABLE `tbl_coverage_type`
  MODIFY `coverage_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_doctor_fee`
--
ALTER TABLE `tbl_doctor_fee`
  MODIFY `doctor_fee_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tbl_labtest`
--
ALTER TABLE `tbl_labtest`
  MODIFY `labtest_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT for table `tbl_labtest_category`
--
ALTER TABLE `tbl_labtest_category`
  MODIFY `labtest_category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `tbl_medicine`
--
ALTER TABLE `tbl_medicine`
  MODIFY `med_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `tbl_medicine_type`
--
ALTER TABLE `tbl_medicine_type`
  MODIFY `med_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `tbl_medicine_unit`
--
ALTER TABLE `tbl_medicine_unit`
  MODIFY `unit_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbl_room`
--
ALTER TABLE `tbl_room`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `tbl_room_stay`
--
ALTER TABLE `tbl_room_stay`
  MODIFY `room_stay_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_room_type`
--
ALTER TABLE `tbl_room_type`
  MODIFY `room_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `tbl_service_type`
--
ALTER TABLE `tbl_service_type`
  MODIFY `svc_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `tbl_surgery`
--
ALTER TABLE `tbl_surgery`
  MODIFY `surgery_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `tbl_surgery_procedure`
--
ALTER TABLE `tbl_surgery_procedure`
  MODIFY `surgery_procedure_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tbl_surgery_type`
--
ALTER TABLE `tbl_surgery_type`
  MODIFY `surgery_type_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_treatment`
--
ALTER TABLE `tbl_treatment`
  MODIFY `treatment_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `tbl_treatment_category`
--
ALTER TABLE `tbl_treatment_category`
  MODIFY `treatment_category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `tbl_treatment_session`
--
ALTER TABLE `tbl_treatment_session`
  MODIFY `treatment_session_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT for table `user_billing_officer`
--
ALTER TABLE `user_billing_officer`
  MODIFY `billing_officer_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_cashier`
--
ALTER TABLE `user_cashier`
  MODIFY `cashier_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_doctor`
--
ALTER TABLE `user_doctor`
  MODIFY `doctor_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_doctor_specialty`
--
ALTER TABLE `user_doctor_specialty`
  MODIFY `specialty_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `user_labtech_department`
--
ALTER TABLE `user_labtech_department`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `user_lab_technician`
--
ALTER TABLE `user_lab_technician`
  MODIFY `technician_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `user_log`
--
ALTER TABLE `user_log`
  MODIFY `login_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_nurse`
--
ALTER TABLE `user_nurse`
  MODIFY `nurse_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `user_nurse_department`
--
ALTER TABLE `user_nurse_department`
  MODIFY `department_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `user_permission`
--
ALTER TABLE `user_permission`
  MODIFY `permission_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `user_pharmacist`
--
ALTER TABLE `user_pharmacist`
  MODIFY `pharmacist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `user_roles`
--
ALTER TABLE `user_roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user_therapist`
--
ALTER TABLE `user_therapist`
  MODIFY `therapist_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `user_therapist_specialty`
--
ALTER TABLE `user_therapist_specialty`
  MODIFY `specialty_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bill_invoice`
--
ALTER TABLE `bill_invoice`
  ADD CONSTRAINT `fk_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE ON UPDATE CASCADE,
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
  ADD CONSTRAINT `fk_admission_2` FOREIGN KEY (`admitted_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_admission_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`user_id`) ON UPDATE CASCADE;

--
-- Constraints for table `patient_emergency_contact`
--
ALTER TABLE `patient_emergency_contact`
  ADD CONSTRAINT `fk_emergency_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE;

--
-- Constraints for table `patient_guardian`
--
ALTER TABLE `patient_guardian`
  ADD CONSTRAINT `fk_guardian_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`) ON DELETE CASCADE;

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
-- Constraints for table `request_labtest_batch`
--
ALTER TABLE `request_labtest_batch`
  ADD CONSTRAINT `fk_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `request_labtest_batch_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `user_doctor` (`user_id`),
  ADD CONSTRAINT `request_labtest_batch_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `request_labtest_batch_ibfk_3` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`);

--
-- Constraints for table `request_labtest_items`
--
ALTER TABLE `request_labtest_items`
  ADD CONSTRAINT `request_labtest_items_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `request_labtest_batch` (`batch_id`),
  ADD CONSTRAINT `request_labtest_items_ibfk_2` FOREIGN KEY (`labtest_id`) REFERENCES `tbl_labtest` (`labtest_id`),
  ADD CONSTRAINT `request_labtest_items_ibfk_3` FOREIGN KEY (`approved_by`) REFERENCES `user_lab_technician` (`user_id`),
  ADD CONSTRAINT `request_labtest_items_ibfk_4` FOREIGN KEY (`processed_by`) REFERENCES `user_lab_technician` (`user_id`),
  ADD CONSTRAINT `request_labtest_items_ibfk_5` FOREIGN KEY (`completed_by`) REFERENCES `user_lab_technician` (`user_id`);

--
-- Constraints for table `request_medicine_batch`
--
ALTER TABLE `request_medicine_batch`
  ADD CONSTRAINT `fk_batch_admission` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`),
  ADD CONSTRAINT `fk_batch_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `user_doctor` (`doctor_id`),
  ADD CONSTRAINT `fk_batch_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `fk_items_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `request_medicine_items`
--
ALTER TABLE `request_medicine_items`
  ADD CONSTRAINT `fk_item_batch` FOREIGN KEY (`batch_id`) REFERENCES `request_medicine_batch` (`batch_id`),
  ADD CONSTRAINT `fk_item_medicine` FOREIGN KEY (`med_id`) REFERENCES `tbl_medicine` (`med_id`),
  ADD CONSTRAINT `fk_items_administered_by` FOREIGN KEY (`administered_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_dispensed_by` FOREIGN KEY (`dispensed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_picked_by` FOREIGN KEY (`picked_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_items_returned_by` FOREIGN KEY (`returned_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `request_notifications`
--
ALTER TABLE `request_notifications`
  ADD CONSTRAINT `fk_notifications_request` FOREIGN KEY (`request_id`) REFERENCES `doctor_requests` (`request_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `request_service`
--
ALTER TABLE `request_service`
  ADD CONSTRAINT `request_service_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `user_doctor` (`doctor_id`),
  ADD CONSTRAINT `request_service_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `request_service_ibfk_3` FOREIGN KEY (`svc_type_id`) REFERENCES `tbl_service_type` (`svc_type_id`);

--
-- Constraints for table `request_surgery`
--
ALTER TABLE `request_surgery`
  ADD CONSTRAINT `fk_request_surgery_admission` FOREIGN KEY (`admission_id`) REFERENCES `patient_admission` (`admission_id`),
  ADD CONSTRAINT `fk_request_surgery_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_request_surgery_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_request_surgery_completed_by` FOREIGN KEY (`completed_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_request_surgery_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_request_surgery_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`patient_id`),
  ADD CONSTRAINT `fk_request_surgery_scheduled_by` FOREIGN KEY (`scheduled_by`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `fk_request_surgery_surgery_type` FOREIGN KEY (`surgery_type_id`) REFERENCES `tbl_surgery` (`surgery_id`);

--
-- Constraints for table `request_therapy`
--
ALTER TABLE `request_therapy`
  ADD CONSTRAINT `request_therapy_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `request_service` (`request_id`),
  ADD CONSTRAINT `request_therapy_ibfk_2` FOREIGN KEY (`specialty_id`) REFERENCES `user_therapist_specialty` (`specialty_id`),
  ADD CONSTRAINT `request_therapy_ibfk_3` FOREIGN KEY (`therapist_id`) REFERENCES `user_therapist` (`therapist_id`);

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
-- Constraints for table `tbl_medicine`
--
ALTER TABLE `tbl_medicine`
  ADD CONSTRAINT `fk_medicine_1` FOREIGN KEY (`med_type_id`) REFERENCES `tbl_medicine_type` (`med_type_id`),
  ADD CONSTRAINT `fk_medicine_unit` FOREIGN KEY (`unit_id`) REFERENCES `tbl_medicine_unit` (`unit_id`);

--
-- Constraints for table `tbl_room`
--
ALTER TABLE `tbl_room`
  ADD CONSTRAINT `fk_room_1` FOREIGN KEY (`room_type_id`) REFERENCES `tbl_room_type` (`room_type_id`);

--
-- Constraints for table `tbl_room_stay`
--
ALTER TABLE `tbl_room_stay`
  ADD CONSTRAINT `fk_room_assignment_3` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`user_id`),
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
-- Constraints for table `user_billing_officer`
--
ALTER TABLE `user_billing_officer`
  ADD CONSTRAINT `user_billing_officer_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_cashier`
--
ALTER TABLE `user_cashier`
  ADD CONSTRAINT `user_cashier_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_doctor`
--
ALTER TABLE `user_doctor`
  ADD CONSTRAINT `user_doctor_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_doctor_ibfk_2` FOREIGN KEY (`specialty_id`) REFERENCES `user_doctor_specialty` (`specialty_id`);

--
-- Constraints for table `user_lab_technician`
--
ALTER TABLE `user_lab_technician`
  ADD CONSTRAINT `user_lab_technician_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_lab_technician_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `user_labtech_department` (`department_id`);

--
-- Constraints for table `user_log`
--
ALTER TABLE `user_log`
  ADD CONSTRAINT `fk_log_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_nurse`
--
ALTER TABLE `user_nurse`
  ADD CONSTRAINT `user_nurse_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_nurse_ibfk_2` FOREIGN KEY (`department_id`) REFERENCES `user_nurse_department` (`department_id`);

--
-- Constraints for table `user_pharmacist`
--
ALTER TABLE `user_pharmacist`
  ADD CONSTRAINT `user_pharmacist_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `user_role_permission`
--
ALTER TABLE `user_role_permission`
  ADD CONSTRAINT `user_role_permission_ibfk_1` FOREIGN KEY (`user_role_id`) REFERENCES `user_roles` (`role_id`),
  ADD CONSTRAINT `user_role_permission_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `user_permission` (`permission_id`);

--
-- Constraints for table `user_therapist`
--
ALTER TABLE `user_therapist`
  ADD CONSTRAINT `user_therapist_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `user_therapist_ibfk_2` FOREIGN KEY (`specialty_id`) REFERENCES `user_therapist_specialty` (`specialty_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

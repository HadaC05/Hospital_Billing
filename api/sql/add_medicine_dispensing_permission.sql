-- Add medicine dispensing permission to the system
-- This script adds the new permission for medicine dispensing functionality

INSERT INTO `user_permission` (`permission_id`, `name`, `label`, `description`) VALUES
(24, 'medicine_dispensing', 'Medicine Dispensing', 'Access to dispense medicines to patients and manage dispensing records');

-- Update the AUTO_INCREMENT for user_permission table
ALTER TABLE `user_permission` AUTO_INCREMENT = 25;

-- ============================================================
-- AssetFlow - Enterprise Asset & Resource Management System
-- MySQL Schema (Phase 1)
-- ============================================================

CREATE DATABASE IF NOT EXISTS assetflow;
USE assetflow;

-- ------------------------------------------------------------
-- Authentication & Organization
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_token (token),
  INDEX idx_reset_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_code VARCHAR(30) NOT NULL UNIQUE,
  department_name VARCHAR(120) NOT NULL,
  department_head VARCHAR(120) NOT NULL,
  employee_count INT NOT NULL DEFAULT 0,
  location VARCHAR(120) NOT NULL,
  description TEXT,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_departments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_code VARCHAR(30) NOT NULL UNIQUE,
  role_name VARCHAR(80) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_roles_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(30) DEFAULT NULL,
  department_id INT NOT NULL,
  role_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  hired_at DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employee_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_employees_status (status),
  INDEX idx_employees_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Asset Management
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  asset_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  assigned_to VARCHAR(120) DEFAULT 'Available',
  status ENUM('Available', 'Allocated', 'Maintenance', 'Retired', 'Booked') NOT NULL DEFAULT 'Available',
  department VARCHAR(120) DEFAULT 'Store',
  is_bookable TINYINT(1) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_assets_status (status),
  INDEX idx_assets_category (category),
  INDEX idx_assets_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Asset Allocation
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS allocations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  allocation_code VARCHAR(30) NOT NULL UNIQUE,
  asset_id INT NOT NULL,
  asset_code VARCHAR(30) NOT NULL,
  asset_name VARCHAR(150) NOT NULL,
  employee_name VARCHAR(120) NOT NULL,
  department_name VARCHAR(120) NOT NULL,
  allocation_date DATE NOT NULL,
  expected_return_date DATE DEFAULT NULL,
  returned_date DATE DEFAULT NULL,
  status ENUM('Allocated', 'Temporary', 'Transferred', 'Returned') NOT NULL DEFAULT 'Allocated',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_allocation_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  INDEX idx_allocations_status (status),
  INDEX idx_allocations_employee (employee_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Resource Booking
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_code VARCHAR(30) NOT NULL UNIQUE,
  asset_id INT DEFAULT NULL,
  resource_name VARCHAR(150) NOT NULL,
  employee_name VARCHAR(120) NOT NULL,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose VARCHAR(200) NOT NULL,
  remarks TEXT,
  status ENUM('Pending', 'Confirmed', 'Booked', 'Rejected', 'Cancelled', 'Returned') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
  INDEX idx_bookings_status (status),
  INDEX idx_bookings_date (booking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Maintenance
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_code VARCHAR(30) NOT NULL UNIQUE,
  asset_id INT NOT NULL,
  asset_name VARCHAR(150) NOT NULL,
  maintenance_type VARCHAR(80) NOT NULL,
  requested_by VARCHAR(120) NOT NULL,
  maintenance_date DATE NOT NULL,
  issue_description TEXT NOT NULL,
  status ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
  technician_name VARCHAR(120) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_maintenance_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  INDEX idx_maintenance_status (status),
  INDEX idx_maintenance_date (maintenance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Audit
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  audit_code VARCHAR(30) NOT NULL UNIQUE,
  department_name VARCHAR(120) NOT NULL,
  auditor_name VARCHAR(120) NOT NULL,
  audit_date DATE NOT NULL,
  audit_type VARCHAR(80) NOT NULL,
  remarks TEXT,
  assets_checked INT NOT NULL DEFAULT 0,
  issues_found INT NOT NULL DEFAULT 0,
  status ENUM('Scheduled', 'Pending', 'In Progress', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_audits_status (status),
  INDEX idx_audits_date (audit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Notifications & Reports
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  status ENUM('Read', 'Unread') NOT NULL DEFAULT 'Unread',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notifications_status (status),
  INDEX idx_notifications_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_code VARCHAR(30) NOT NULL UNIQUE,
  report_name VARCHAR(150) NOT NULL,
  report_type VARCHAR(80) NOT NULL,
  department_filter VARCHAR(120) DEFAULT NULL,
  from_date DATE DEFAULT NULL,
  to_date DATE DEFAULT NULL,
  generated_by VARCHAR(120) NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'CSV',
  file_name VARCHAR(180) DEFAULT NULL,
  file_path VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reports_type (report_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const dbName = process.env.DB_NAME || "assetflow";
const baseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

function getUploadsDirectory() {
  return path.join(__dirname, "..", "uploads");
}

function parseSqlStatements(sqlContent) {
  return sqlContent
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter((statement) => {
      if (!statement) {
        return false;
      }

      const withoutComments = statement
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim();

      return withoutComments.length > 0;
    })
    .map((statement) =>
      statement
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    );
}

async function runMigrations(activePool) {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");
  const statements = parseSqlStatements(schemaSql).filter(
    (statement) => !/^CREATE DATABASE/i.test(statement) && !/^USE /i.test(statement)
  );

  for (const statement of statements) {
    await activePool.query(statement);
  }
}

async function seedDatabase(activePool) {
  const uploadsDir = getUploadsDirectory();
  fs.mkdirSync(uploadsDir, { recursive: true });

  const [[userCount]] = await activePool.query("SELECT COUNT(*) AS count FROM users");

  if (userCount.count === 0) {
    const passwordHash = await bcrypt.hash("Admin@123", 10);
    const users = [
      ["Admin User", "admin@assetflow.com", passwordHash, "admin", "Active"],
      ["John Smith", "john.smith@assetflow.com", passwordHash, "employee", "Active"],
      ["Sarah Lee", "sarah.lee@assetflow.com", passwordHash, "employee", "Active"],
      ["Emma Watson", "emma.watson@assetflow.com", passwordHash, "employee", "Active"],
      ["David Brown", "david.brown@assetflow.com", passwordHash, "employee", "Active"]
    ];

    await activePool.query(
      "INSERT INTO users (full_name, email, password_hash, role, status) VALUES ?",
      [users]
    );
  }

  const [[departmentCount]] = await activePool.query("SELECT COUNT(*) AS count FROM departments");

  if (departmentCount.count === 0) {
    const departments = [
      ["D001", "Information Technology", "John Smith", 35, "Head Office", "Infrastructure, systems, and support.", "Active"],
      ["D002", "Finance", "Emma Watson", 20, "Head Office", "Financial operations and reporting.", "Active"],
      ["D003", "Human Resources", "Sarah Lee", 16, "Branch Office", "People operations and hiring.", "Active"],
      ["D004", "Operations", "David Brown", 41, "Warehouse", "Operations and logistics.", "Active"]
    ];

    await activePool.query(
      "INSERT INTO departments (department_code, department_name, department_head, employee_count, location, description, status) VALUES ?",
      [departments]
    );
  }

  const [[roleCount]] = await activePool.query("SELECT COUNT(*) AS count FROM roles");

  if (roleCount.count === 0) {
    const roles = [
      ["R001", "Administrator", "Full system access and administration"],
      ["R002", "Manager", "Department management and approvals"],
      ["R003", "Employee", "Standard employee access"],
      ["R004", "Technician", "Maintenance and asset servicing"]
    ];

    await activePool.query(
      "INSERT INTO roles (role_code, role_name, description) VALUES ?",
      [roles]
    );
  }

  const [[employeeCount]] = await activePool.query("SELECT COUNT(*) AS count FROM employees");

  if (employeeCount.count === 0) {
    const [deptRows] = await activePool.query(
      "SELECT id, department_code FROM departments ORDER BY id"
    );
    const [roleRows] = await activePool.query(
      "SELECT id, role_code FROM roles ORDER BY id"
    );
    const [userRows] = await activePool.query(
      "SELECT id, full_name, email FROM users ORDER BY id"
    );

    const deptMap = Object.fromEntries(deptRows.map((row) => [row.department_code, row.id]));
    const roleMap = Object.fromEntries(roleRows.map((row) => [row.role_code, row.id]));
    const userMap = Object.fromEntries(userRows.map((row) => [row.email, row]));

    const employees = [
      ["E001", "Admin User", "admin@assetflow.com", null, deptMap.D001, roleMap.R001, userMap["admin@assetflow.com"]?.id, "2024-01-15"],
      ["E002", "John Smith", "john.smith@assetflow.com", null, deptMap.D001, roleMap.R002, userMap["john.smith@assetflow.com"]?.id, "2024-03-10"],
      ["E003", "Sarah Lee", "sarah.lee@assetflow.com", null, deptMap.D003, roleMap.R002, userMap["sarah.lee@assetflow.com"]?.id, "2024-02-20"],
      ["E004", "Emma Watson", "emma.watson@assetflow.com", null, deptMap.D002, roleMap.R003, userMap["emma.watson@assetflow.com"]?.id, "2024-04-05"],
      ["E005", "David Brown", "david.brown@assetflow.com", null, deptMap.D004, roleMap.R003, userMap["david.brown@assetflow.com"]?.id, "2024-05-12"]
    ];

    await activePool.query(
      `INSERT INTO employees
        (employee_code, full_name, email, phone, department_id, role_id, user_id, hired_at)
       VALUES ?`,
      [employees]
    );

    await activePool.query(
      `UPDATE departments d
       SET employee_count = (
         SELECT COUNT(*) FROM employees e
         WHERE e.department_id = d.id AND e.status = 'Active'
       )`
    );
  }

  const [[assetCount]] = await activePool.query("SELECT COUNT(*) AS count FROM assets");

  if (assetCount.count === 0) {
    const assets = [
      ["AF001", "Dell Latitude 5440", "Laptop", "John Smith", "Allocated", "IT", 0, "Primary developer laptop."],
      ["AF002", "HP LaserJet", "Printer", "Finance", "Allocated", "Finance", 0, "Shared department printer."],
      ["AF003", "BenQ Projector", "Projector", "Conference Room", "Maintenance", "Admin", 1, "Presentation equipment."],
      ["AF004", "MacBook Pro", "Laptop", "Sarah Lee", "Allocated", "Design", 0, "Design workstation."],
      ["AF005", "Office Chair", "Furniture", "Available", "Available", "Store", 0, "Ergonomic chair."],
      ["AF006", "Conference Room A", "Room", "Available", "Available", "Head Office", 1, "Bookable meeting room."],
      ["AF007", "Conference Room B", "Room", "Available", "Available", "Head Office", 1, "Secondary meeting room."],
      ["AF008", "Company Vehicle", "Vehicle", "Available", "Available", "Operations", 1, "Field visit vehicle."]
    ];

    await activePool.query(
      "INSERT INTO assets (asset_code, name, category, assigned_to, status, department, is_bookable, description) VALUES ?",
      [assets]
    );
  }

  const [[allocationCount]] = await activePool.query("SELECT COUNT(*) AS count FROM allocations");

  if (allocationCount.count === 0) {
    const [assetRows] = await activePool.query(
      "SELECT id, asset_code, name FROM assets WHERE asset_code IN ('AF001', 'AF004', 'AF005') ORDER BY id"
    );
    const assetsByCode = Object.fromEntries(assetRows.map((row) => [row.asset_code, row]));

    const allocations = [
      ["AL001", assetsByCode.AF001.id, assetsByCode.AF001.asset_code, assetsByCode.AF001.name, "John Smith", "IT", "2026-06-12", "2026-06-30", null, "Allocated", "Assigned for ongoing project work."],
      ["AL002", assetsByCode.AF004.id, assetsByCode.AF004.asset_code, assetsByCode.AF004.name, "Sarah Lee", "Design", "2026-06-15", "2026-07-05", null, "Temporary", "Temporary allocation for campaign work."],
      ["AL003", assetsByCode.AF005.id, assetsByCode.AF005.asset_code, assetsByCode.AF005.name, "Emma Watson", "Finance", "2026-06-20", null, null, "Allocated", "Seating allocation in finance bay."]
    ];

    await activePool.query(
      "INSERT INTO allocations (allocation_code, asset_id, asset_code, asset_name, employee_name, department_name, allocation_date, expected_return_date, returned_date, status, remarks) VALUES ?",
      [allocations]
    );
  }

  const [[bookingCount]] = await activePool.query("SELECT COUNT(*) AS count FROM bookings");

  if (bookingCount.count === 0) {
    const [bookableAssets] = await activePool.query(
      "SELECT id, name FROM assets WHERE name IN ('Conference Room A', 'BenQ Projector', 'Company Vehicle', 'Conference Room B')"
    );
    const resourceMap = Object.fromEntries(bookableAssets.map((row) => [row.name, row]));

    const bookings = [
      ["BK001", resourceMap["Conference Room A"].id, "Conference Room A", "John Smith", "2026-07-12", "09:00:00", "10:00:00", "Client Meeting", "", "Confirmed"],
      ["BK002", resourceMap["BenQ Projector"].id, "BenQ Projector", "Sarah Lee", "2026-07-12", "10:30:00", "12:00:00", "Training", "", "Booked"],
      ["BK003", resourceMap["Company Vehicle"].id, "Company Vehicle", "Emma Watson", "2026-07-12", "13:00:00", "17:00:00", "Site Visit", "", "Pending"],
      ["BK004", resourceMap["Conference Room B"].id, "Conference Room B", "David Brown", "2026-07-12", "15:00:00", "16:30:00", "Team Meeting", "", "Confirmed"]
    ];

    await activePool.query(
      "INSERT INTO bookings (booking_code, asset_id, resource_name, employee_name, booking_date, start_time, end_time, purpose, remarks, status) VALUES ?",
      [bookings]
    );
  }

  const [[maintenanceCount]] = await activePool.query("SELECT COUNT(*) AS count FROM maintenance_requests");

  if (maintenanceCount.count === 0) {
    const [maintenanceAssets] = await activePool.query(
      "SELECT id, name FROM assets WHERE asset_code IN ('AF001', 'AF002', 'AF003', 'AF005')"
    );
    const maintenanceMap = Object.fromEntries(maintenanceAssets.map((row) => [row.name, row]));

    const requests = [
      ["MR001", maintenanceMap["Dell Latitude 5440"].id, "Dell Latitude 5440", "Repair", "John Smith", "2026-07-20", "Battery issue reported.", "In Progress", "David Wilson"],
      ["MR002", maintenanceMap["HP LaserJet"].id, "HP LaserJet", "Inspection", "Emma Watson", "2026-07-18", "Routine inspection completed.", "Completed", "Mike Brown"],
      ["MR003", maintenanceMap["BenQ Projector"].id, "BenQ Projector", "Preventive", "Sarah Lee", "2026-07-22", "Scheduled preventive maintenance.", "Scheduled", "Kevin Adams"],
      ["MR004", maintenanceMap["Office Chair"].id, "Office Chair", "Repair", "David Brown", "2026-07-21", "Wheel assembly issue.", "In Progress", "Steve Clark"]
    ];

    await activePool.query(
      "INSERT INTO maintenance_requests (request_code, asset_id, asset_name, maintenance_type, requested_by, maintenance_date, issue_description, status, technician_name) VALUES ?",
      [requests]
    );
  }

  const [[auditCount]] = await activePool.query("SELECT COUNT(*) AS count FROM audits");

  if (auditCount.count === 0) {
    const audits = [
      ["AU001", "IT", "Michael Scott", "2026-07-18", "Internal", "Quarterly asset check.", 42, 0, "Completed"],
      ["AU002", "Finance", "Sarah Wilson", "2026-07-20", "Annual", "Finance compliance review.", 25, 2, "Pending"],
      ["AU003", "Human Resources", "David Brown", "2026-07-16", "Random", "Desk-side random audit.", 18, 1, "In Progress"],
      ["AU004", "Operations", "Emma Johnson", "2026-07-22", "External", "Operations audit scheduled.", 56, 0, "Scheduled"]
    ];

    await activePool.query(
      "INSERT INTO audits (audit_code, department_name, auditor_name, audit_date, audit_type, remarks, assets_checked, issues_found, status) VALUES ?",
      [audits]
    );
  }

  const [[notificationCount]] = await activePool.query("SELECT COUNT(*) AS count FROM notifications");

  if (notificationCount.count === 0) {
    const notifications = [
      ["Assets", "Laptop AF001 has been allocated to John Smith.", "Medium", "Unread"],
      ["Maintenance", "Printer AF015 maintenance has been completed.", "Low", "Read"],
      ["Audit", "Annual audit scheduled for Finance Department.", "High", "Unread"],
      ["Booking", "Conference Room A booking approved.", "Medium", "Read"],
      ["System", "System backup completed successfully.", "Low", "Read"]
    ];

    await activePool.query(
      "INSERT INTO notifications (category, message, priority, status) VALUES ?",
      [notifications]
    );
  }

  const [[reportCount]] = await activePool.query("SELECT COUNT(*) AS count FROM reports");

  if (reportCount.count === 0) {
    const sampleFiles = [
      {
        code: "R001",
        name: "Asset Summary",
        type: "Asset Summary",
        user: "Admin User",
        fileName: "asset-summary.csv",
        content: "Metric,Value\nTotal Assets,8\nAvailable,3\nAllocated,3\nMaintenance,1\nBooked,1\n"
      },
      {
        code: "R002",
        name: "Maintenance Report",
        type: "Maintenance Report",
        user: "John Smith",
        fileName: "maintenance-report.csv",
        content: "Request Code,Asset,Status\nMR001,Dell Latitude 5440,In Progress\nMR002,HP LaserJet,Completed\n"
      }
    ];

    const reportRows = [];

    for (const sample of sampleFiles) {
      const filePath = path.join(uploadsDir, sample.fileName);
      fs.writeFileSync(filePath, sample.content, "utf8");
      reportRows.push([
        sample.code,
        sample.name,
        sample.type,
        "All Departments",
        "2026-07-01",
        "2026-07-12",
        sample.user,
        "CSV",
        sample.fileName,
        filePath
      ]);
    }

    await activePool.query(
      "INSERT INTO reports (report_code, report_name, report_type, department_filter, from_date, to_date, generated_by, format, file_name, file_path) VALUES ?",
      [reportRows]
    );
  }
}

async function initDatabase() {
  if (pool) {
    return pool;
  }

  const bootstrapPool = mysql.createPool(baseConfig);
  await bootstrapPool.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await bootstrapPool.end();

  pool = mysql.createPool({
    ...baseConfig,
    database: dbName
  });

  await runMigrations(pool);
  await seedDatabase(pool);

  return pool;
}

function getPool() {
  if (!pool) {
    throw new Error("Database pool not initialized.");
  }

  return pool;
}

module.exports = {
  getPool,
  initDatabase,
  getUploadsDirectory
};

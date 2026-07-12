const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const dotenv = require("dotenv");
const { initDatabase } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const roleRoutes = require("./routes/roleRoutes");
const assetRoutes = require("./routes/assetRoutes");
const allocationRoutes = require("./routes/allocationRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const maintenanceRoutes = require("./routes/maintenanceRoutes");
const auditRoutes = require("./routes/auditRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reportRoutes = require("./routes/reportRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const port = Number(process.env.PORT || 5000);
const projectRoot = path.join(__dirname, "..");
const uploadsRoot = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsRoot, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AssetFlow API",
    timestamp: new Date().toISOString()
  });
});

app.use("/backend", (req, res) => res.status(404).json({ message: "Not found." }));
app.use("/uploads", express.static(uploadsRoot));

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/allocations", allocationRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/audits", auditRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);

app.use(express.static(projectRoot, { index: "index.html" }));

app.get("/", (req, res) => {
  res.sendFile(path.join(projectRoot, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  try {
    await initDatabase();
    app.listen(port, () => {
      console.log(`AssetFlow server running on http://localhost:${port}`);
    });
  } catch (error) {
    const details =
      error.message ||
      error.code ||
      error.cause?.code ||
      error.errors?.map((item) => item.code || item.message).join(", ") ||
      "Unknown startup error";
    console.error("Failed to start server:", details);
    process.exit(1);
  }
}

startServer();

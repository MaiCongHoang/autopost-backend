require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const app = express();
app.use(cors());
app.use(express.json());

// ===== MySQL Pool =====
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  ssl: { rejectUnauthorized: false }
});

// ===== ROOT (tránh Not Found) =====
app.get("/", (req, res) => {
  res.send("Autopost backend is running");
});

// ===== Health check DB =====
app.get("/api/health/db", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ===== Logs =====
app.get("/api/logs", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM post_logs ORDER BY id DESC"
  );
  res.json(rows);
});

// ===== Scheduled posts =====
app.get("/api/posts/scheduled", async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM scheduled_posts WHERE status IN ('pending','finish')"
  );
  res.json(rows);
});

const PORT = process.env.PORT || 3100;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

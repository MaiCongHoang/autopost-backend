import { pool } from "./db.js";

app.get("/api/health/db", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
});

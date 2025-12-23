require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * DASHBOARD APIs
 */

// List posts (filter by status)
app.get("/api/posts", async (req, res) => {
  const { status } = req.query; // pending | finish | undefined
  let sql = "SELECT * FROM scheduled_posts";
  const params = [];

  if (status) {
    sql += " WHERE status = ?";
    params.push(status);
  }
  sql += " ORDER BY schedule_date DESC, schedule_hour DESC, id DESC";

  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// Create post
app.post("/api/posts", async (req, res) => {
  const { schedule_date, schedule_hour, raw_content } = req.body;
  if (!schedule_date || schedule_hour === undefined || !raw_content) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const [r] = await db.query(
    `INSERT INTO scheduled_posts (schedule_date, schedule_hour, raw_content, status)
     VALUES (?, ?, ?, 'pending')`,
    [schedule_date, schedule_hour, raw_content]
  );

  res.json({ id: r.insertId });
});

// Update post
app.put("/api/posts/:id", async (req, res) => {
  const { schedule_date, schedule_hour, raw_content } = req.body;
  await db.query(
    `UPDATE scheduled_posts
     SET schedule_date = ?, schedule_hour = ?, raw_content = ?
     WHERE id = ?`,
    [schedule_date, schedule_hour, raw_content, req.params.id]
  );
  res.json({ success: true });
});

// Delete post
app.delete("/api/posts/:id", async (req, res) => {
  await db.query(`DELETE FROM scheduled_posts WHERE id = ?`, [req.params.id]);
  res.json({ success: true });
});

// Dashboard logs
app.get("/api/logs", async (req, res) => {
  const [rows] = await db.query(
    `SELECT * FROM post_logs ORDER BY posted_at DESC, post_id DESC LIMIT 500`
  );
  res.json(rows);
});

app.get("/api/logs/:id", async (req, res) => {
  const [rows] = await db.query(`SELECT * FROM post_logs WHERE post_id = ?`, [req.params.id]);
  res.json(rows[0] || {});
});

/**
 * N8N APIs (thay Google Sheet)
 */

// Get scheduled post by date+hour (only pending)
app.get("/api/posts/scheduled", async (req, res) => {
  const { date, hour } = req.query;
  if (!date || hour === undefined) return res.json({});

  const [rows] = await db.query(
    `SELECT * FROM scheduled_posts
     WHERE schedule_date = ? AND schedule_hour = ? AND status = 'pending'
     ORDER BY id ASC
     LIMIT 1`,
    [date, hour]
  );

  // Không có bài -> {}
  if (rows.length === 0) return res.json({});

  // Bạn muốn chỉ pending/finish, nên KHÔNG chuyển "processing"
  res.json(rows[0]);
});

app.get("/api/posts/finished", async (req, res) => {
  const { id_post } = req.query;
  const [rows] = await db.query(
    `SELECT full_content FROM post_logs
     WHERE id_post = ? `,
    [id_post]
  );

  // Không có bài -> {}
  if (rows.length === 0) return res.json({});

  // Bạn muốn chỉ pending/finish, nên KHÔNG chuyển "processing"
  res.json(rows[0]);
});

// Save log + mark finish (n8n gọi sau khi post thành công)
app.post("/api/posts/log", async (req, res) => {
  const { post_id, short_content, full_content, image_prompt, platform, id_post } = req.body;

  await db.query(
    `INSERT INTO post_logs (post_id, short_content, full_content, image_prompt, platform, id_post)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [post_id || null, short_content || "", full_content || "", image_prompt || "", platform || "facebook", id_post || ""]
  );

  if (post_id) {
    await db.query(
      `UPDATE scheduled_posts SET status='finish', finished_at=NOW() WHERE id=?`,
      [post_id]
    );
  }

  res.json({ success: true });
});

app.listen(process.env.PORT, () => {
  console.log(`Backend running on port ${process.env.PORT}`);
});

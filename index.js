require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

/**
 * Middlewares
 */
app.use(cors());
app.use(express.json());

/**
 * Health check (RẤT QUAN TRỌNG CHO RENDER)
 */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/health/db", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ db: "ok" });
  } catch (e) {
    res.status(500).json({ db: "error", message: e.message });
  }
});

/**
 * DASHBOARD APIs
 */

// List posts (filter by status)
app.get("/api/posts", async (req, res) => {
  try {
    const { status } = req.query; // pending | finish
    let sql = "SELECT * FROM scheduled_posts";
    const params = [];

    if (status) {
      sql += " WHERE status = ?";
      params.push(status);
    }

    sql += " ORDER BY schedule_date DESC, schedule_hour DESC";

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create post
app.post("/api/posts", async (req, res) => {
  try {
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update post
app.put("/api/posts/:id", async (req, res) => {
  try {
    const { schedule_date, raw_content } = req.body;
    await db.query(
      `UPDATE scheduled_posts
       SET schedule_date = ?, raw_content = ?
       WHERE id = ?`,
      [schedule_date, raw_content, req.params.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete post
app.delete("/api/posts/:id", async (req, res) => {
  try {
    await db.query(`DELETE FROM scheduled_posts WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dashboard logs
app.get("/api/logs", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM post_logs ORDER BY posted_at DESC LIMIT 500`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/logs/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM post_logs WHERE post_id = ?`,
      [req.params.id]
    );
    res.json(rows[0] || {});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * N8N APIs
 */

// Get scheduled post by date(pending only)
app.get("/api/posts/scheduled", async (req, res) => {
  try {
    const { date } = req.query;
    if (!date === undefined) return res.json({});

    const [rows] = await db.query(
      `SELECT * FROM scheduled_posts
       WHERE schedule_date = ?
         AND status = 'pending'
       ORDER BY schedule_date ASC
       LIMIT 1`,
      [date]
    );

    if (rows.length === 0) return res.json({});
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
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

// Save log + mark finish
app.post("/api/posts/log", async (req, res) => {
  try {
    const {
      post_id,
      short_content,
      full_content,
      image_prompt,
      platform,
      id_post,
    } = req.body;

    await db.query(
      `INSERT INTO post_logs
       (post_id, short_content, full_content, image_prompt, platform, id_post)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        post_id || null,
        short_content || "",
        full_content || "",
        image_prompt || "",
        platform || "facebook",
        id_post || "",
      ]
    );

    if (post_id) {
      await db.query(
        `UPDATE scheduled_posts
         SET status = 'finish', finished_at = NOW()
         WHERE id = ?`,
        [post_id]
      );
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * START SERVER (CHUẨN RENDER)
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

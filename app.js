// health check
app.get("/", (req, res) => {
  res.json({ status: "OK", service: "autopost-backend" });
});

app.get("/api/health/db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1");
    res.json({ db: "connected" });
  } catch (err) {
    res.status(500).json({
      db: "error",
      message: err.message
    });
  }
});
module.exports = app;


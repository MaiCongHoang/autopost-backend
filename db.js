const mysql = require("mysql2/promise");

/**
 * Railway MySQL + Render compatible pool
 */
const pool = mysql.createPool({
  host: process.env.MYSQLHOST,
  port: Number(process.env.MYSQLPORT || 3306),
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Khuyến nghị cho cloud DB
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = pool;

const mysql = require("mysql2/promise");

/**
 * Railway MySQL (PUBLIC) + Render compatible
 * BẮT BUỘC dùng MYSQL_URL hoặc MYSQL_PUBLIC_URL
 */
const DATABASE_URL =
  process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;

if (!DATABASE_URL) {
  throw new Error("MYSQL_URL or MYSQL_PUBLIC_URL is not defined");
}

const pool = mysql.createPool(DATABASE_URL);

module.exports = pool;

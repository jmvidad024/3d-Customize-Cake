require('dotenv').config();
const mysql = require('mysql2/promise');

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  NODE_ENV
} = process.env;

const isProduction = NODE_ENV === 'production';

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: isProduction
    ? {
        rejectUnauthorized: false
      }
    : false
});



async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function execute(sql, params = []) {
  return await pool.execute(sql, params);
}

async function ensureColumnExists(table, columnName, definition) {
  const rows = await query(`SHOW COLUMNS FROM ${table} LIKE '${columnName}'`);
  if (!rows || rows.length === 0) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

async function ensureIndexExists(table, indexName, columns) {
  const rows = await query(`
    SHOW INDEX FROM ${table} WHERE Key_name = ?
  `, [indexName]);

  if (!rows || rows.length === 0) {
    await query(`
      CREATE INDEX ${indexName} ON ${table}(${columns})
    `);
  }
}

async function init() {
  const createDb = await mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  port: DB_PORT,

  ssl: isProduction
    ? {
        rejectUnauthorized: false
      }
    : false
});

  await createDb.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
  await createDb.end();

  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('customer','baker','admin') NOT NULL DEFAULT 'customer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS designs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      type ENUM('premade','custom') NOT NULL DEFAULT 'custom',
      owner_id VARCHAR(36),
      thumbnail TEXT,
      design LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS chat_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      message TEXT NOT NULL,
      image_url TEXT DEFAULT NULL,
      status ENUM('open','resolved') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      design_id INT,
      date DATE NOT NULL,
      note TEXT,
      status VARCHAR(50) DEFAULT 'confirmed',
      paid TINYINT(1) DEFAULT 0,
      paid_at DATETIME DEFAULT NULL,
      completed_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (design_id) REFERENCES designs(id) ON DELETE SET NULL
    ) ENGINE=InnoDB;
  `);

  await ensureIndexExists('chat_tickets', 'idx_chat_user', 'user_id');
  await ensureIndexExists('chat_tickets', 'idx_chat_status', 'status');
  await ensureColumnExists('appointments', 'paid', 'paid TINYINT(1) DEFAULT 0');
  await ensureColumnExists('appointments', 'paid_at', 'paid_at DATETIME DEFAULT NULL');
  await ensureColumnExists('appointments', 'completed_at', 'completed_at DATETIME DEFAULT NULL');
  await ensureColumnExists('designs', 'thumbnail', 'thumbnail TEXT');
}

module.exports = {
  query,
  execute,
  init
};

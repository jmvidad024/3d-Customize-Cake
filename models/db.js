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
  if (!isProduction) {
    const createDb = await mysql.createConnection({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      port: DB_PORT,
      ssl: false
    });

    await createDb.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await createDb.end();
  }

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
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      design LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS chat_tickets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      message TEXT NOT NULL,
      image_url TEXT DEFAULT NULL,
      design_id INT DEFAULT NULL,
      status ENUM('open','resolved') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      delivery_type VARCHAR(50) NOT NULL DEFAULT 'pickup',
      delivery_address TEXT DEFAULT NULL,
      paid TINYINT(1) DEFAULT 0,
      paid_at DATETIME DEFAULT NULL,
      completed_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS custom_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      occasion VARCHAR(100) NOT NULL,
      serving_size VARCHAR(50) NOT NULL,
      flavor VARCHAR(100) NOT NULL,
      dietary_needs VARCHAR(150) DEFAULT NULL,
      description TEXT NOT NULL,
      special_requests TEXT DEFAULT NULL,
      image_path TEXT DEFAULT NULL,
      image_data LONGTEXT DEFAULT NULL,
      image_mime VARCHAR(100) DEFAULT NULL,
      pickup_date DATE NOT NULL,
      delivery_type VARCHAR(50) NOT NULL,
      delivery_address TEXT DEFAULT NULL,
      estimated_price DECIMAL(10,2) NOT NULL DEFAULT 0,
      final_price DECIMAL(10,2) DEFAULT NULL,
      baker_notes TEXT DEFAULT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);

  await ensureColumnExists('chat_tickets', 'design_id', 'design_id INT DEFAULT NULL');
  await ensureIndexExists('chat_tickets', 'idx_chat_user', 'user_id');
  await ensureIndexExists('chat_tickets', 'idx_chat_status', 'status');
  await ensureIndexExists('chat_tickets', 'idx_chat_design', 'design_id');
  await ensureColumnExists('appointments', 'paid', 'paid TINYINT(1) DEFAULT 0');
  await ensureColumnExists('appointments', 'amount', 'amount DECIMAL(10,2) NOT NULL DEFAULT 0');
  await ensureColumnExists('appointments', 'delivery_type', "delivery_type VARCHAR(50) NOT NULL DEFAULT 'pickup'");
  await ensureColumnExists('appointments', 'delivery_address', 'delivery_address TEXT DEFAULT NULL');
  await ensureColumnExists('appointments', 'paid_at', 'paid_at DATETIME DEFAULT NULL');
  await ensureColumnExists('appointments', 'completed_at', 'completed_at DATETIME DEFAULT NULL');
  await ensureColumnExists('designs', 'thumbnail', 'thumbnail TEXT');
  await ensureColumnExists('designs', 'price', 'price DECIMAL(10,2) NOT NULL DEFAULT 0');
  await ensureColumnExists('custom_requests', 'user_id', "user_id VARCHAR(36) NOT NULL DEFAULT ''");
  await ensureColumnExists('custom_requests', 'name', "name VARCHAR(255) NOT NULL DEFAULT ''");
  await ensureColumnExists('custom_requests', 'occasion', "occasion VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumnExists('custom_requests', 'serving_size', "serving_size VARCHAR(50) NOT NULL DEFAULT ''");
  await ensureColumnExists('custom_requests', 'flavor', "flavor VARCHAR(100) NOT NULL DEFAULT ''");
  await ensureColumnExists('custom_requests', 'dietary_needs', 'dietary_needs VARCHAR(150) DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'description', 'description TEXT DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'special_requests', 'special_requests TEXT DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'image_path', 'image_path TEXT DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'image_data', 'image_data LONGTEXT DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'image_mime', 'image_mime VARCHAR(100) DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'pickup_date', 'pickup_date DATE DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'delivery_type', "delivery_type VARCHAR(50) NOT NULL DEFAULT 'pickup'");
  await ensureColumnExists('custom_requests', 'delivery_address', 'delivery_address TEXT DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'estimated_price', 'estimated_price DECIMAL(10,2) NOT NULL DEFAULT 0');
  await ensureColumnExists('custom_requests', 'final_price', 'final_price DECIMAL(10,2) DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'baker_notes', 'baker_notes TEXT DEFAULT NULL');
  await ensureColumnExists('custom_requests', 'status', "status VARCHAR(50) NOT NULL DEFAULT 'pending'");
  await ensureColumnExists('custom_requests', 'created_at', 'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
  await ensureColumnExists('custom_requests', 'updated_at', 'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await ensureIndexExists('custom_requests', 'idx_custom_requests_user', 'user_id');
  await ensureIndexExists('custom_requests', 'idx_custom_requests_status', 'status');
  await ensureIndexExists('custom_requests', 'idx_custom_requests_pickup_date', 'pickup_date');
}

module.exports = {
  query,
  execute,
  init
};

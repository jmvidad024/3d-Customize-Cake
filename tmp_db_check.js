const mysql = require("mysql2/promise");
require('dotenv').config();
(async () => {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;
  const conn = await mysql.createConnection({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, port: DB_PORT });
  const [cols] = await conn.execute('SHOW COLUMNS FROM appointments');
  console.log(cols.map(c => `${c.Field} ${c.Type} ${c.Null} ${c.Extra}`).join('\n'));
  await conn.end();
})();
